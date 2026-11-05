import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const BASE_POSTCODE = "DA82HA";
const EARTH_RADIUS_MILES = 3958.8;
const UK_POSTCODE_PATTERN = /^(GIR0AA|[A-PR-UWYZ][A-HK-Y]?[0-9][0-9A-HJKMNPR-Y]?[0-9][ABD-HJLNP-UW-Z]{2})$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Coordinates = { latitude: number; longitude: number };

async function geocodePostcode(compactPostcode: string): Promise<Coordinates | null> {
  const response = await fetch(`https://api.postcodes.io/postcodes/${compactPostcode}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`postcodes.io returned ${response.status}`);
  const payload = await response.json();
  const { latitude, longitude } = payload?.result ?? {};
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    throw new Error("postcodes.io response missing coordinates");
  }
  return { latitude, longitude };
}

function straightLineMiles(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    const rawPostcode = typeof body?.postcode === "string" ? body.postcode : "";
    const serviceLabel = typeof body?.serviceLabel === "string" ? body.serviceLabel : "";
    const quoteRequestId = typeof body?.quoteRequestId === "string" ? body.quoteRequestId : null;

    const compactPostcode = rawPostcode.replace(/\s+/g, "").toUpperCase();
    if (!UK_POSTCODE_PATTERN.test(compactPostcode)) {
      return jsonResponse({ error: "Please enter a valid UK postcode." }, 400);
    }
    if (quoteRequestId && !UUID_PATTERN.test(quoteRequestId)) {
      return jsonResponse({ error: "Invalid quote reference." }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [{ data: servicePrice, error: serviceError }, { data: bands, error: bandsError }] =
      await Promise.all([
        supabase
          .from("pricing_service_prices")
          .select("service_label, base_pence, is_placeholder")
          .eq("service_label", serviceLabel)
          .maybeSingle(),
        supabase
          .from("pricing_distance_bands")
          .select("max_miles, surcharge_pence, is_placeholder")
          .order("sort_order", { ascending: true }),
      ]);
    if (serviceError) throw serviceError;
    if (bandsError) throw bandsError;
    if (!servicePrice) {
      return jsonResponse({ error: "Please choose a service from the list." }, 400);
    }
    if (!bands || bands.length === 0) throw new Error("No distance bands configured");

    const [customerCoords, baseCoords] = await Promise.all([
      geocodePostcode(compactPostcode),
      geocodePostcode(BASE_POSTCODE),
    ]);
    if (!customerCoords) {
      return jsonResponse({ error: "We could not find that postcode. Please check it and try again." }, 422);
    }
    if (!baseCoords) throw new Error("Base postcode could not be geocoded");

    const distanceMiles = straightLineMiles(baseCoords, customerCoords);
    const band = bands.find((b) => distanceMiles <= Number(b.max_miles));

    const isPlaceholder = servicePrice.is_placeholder || (band?.is_placeholder ?? true);
    const basePence = servicePrice.base_pence;
    const surchargePence = band ? band.surcharge_pence : null;
    const totalPence =
      basePence !== null && surchargePence !== null ? basePence + surchargePence : null;

    const { error: insertError } = await supabase.from("quote_price_quotes").insert({
      quote_request_id: quoteRequestId,
      service_label: serviceLabel,
      postcode: compactPostcode,
      distance_miles: Math.round(distanceMiles * 100) / 100,
      base_pence: basePence,
      surcharge_pence: surchargePence,
      total_pence: totalPence,
      is_placeholder: isPlaceholder,
    });
    if (insertError) throw insertError;

    if (!band) {
      return jsonResponse({
        status: "outside_area",
        message: "This postcode is outside our standard service area. Please send your request and we will confirm whether we can collect.",
      });
    }
    if (totalPence === null || isPlaceholder) {
      return jsonResponse({
        status: "manual",
        message: "We will confirm your price when we review your request.",
      });
    }
    return jsonResponse({ status: "priced", totalPence });
  } catch (err) {
    console.error("calculate-quote failed:", err);
    return jsonResponse({ error: "We could not calculate a price right now. Your request has still been received." }, 500);
  }
});
