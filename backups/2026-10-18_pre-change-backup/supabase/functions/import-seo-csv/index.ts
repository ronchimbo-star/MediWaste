import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CsvRow {
  url_slug: string;
  target_keyword: string;
  location?: string;
  service_type?: string;
  category?: string;
}

function parseCSV(text: string): CsvRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headerLine = lines[0].toLowerCase().replace(/\r/g, "");
  const headers = headerLine.split(",").map((h) => h.trim().replace(/"/g, ""));

  const slugIdx = headers.indexOf("url_slug");
  const keywordIdx = headers.indexOf("target_keyword");
  const locationIdx = headers.indexOf("location");
  const serviceIdx = headers.indexOf("service_type");
  const categoryIdx = headers.indexOf("category");

  if (slugIdx === -1 || keywordIdx === -1) {
    throw new Error("CSV must contain url_slug and target_keyword columns");
  }

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].replace(/\r/g, "").trim();
    if (!line) continue;

    const values = parseCsvLine(line);
    const slug = values[slugIdx]?.trim();
    const keyword = values[keywordIdx]?.trim();

    if (!slug || !keyword) continue;

    rows.push({
      url_slug: slug.replace(/^\//, "").replace(/[^a-z0-9-]/g, ""),
      target_keyword: keyword,
      location: locationIdx >= 0 ? values[locationIdx]?.trim() || undefined : undefined,
      service_type: serviceIdx >= 0 ? values[serviceIdx]?.trim() || undefined : undefined,
      category: categoryIdx >= 0 ? values[categoryIdx]?.trim() || undefined : undefined,
    });
  }

  return rows;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values.map((v) => v.replace(/^"|"$/g, ""));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { csv_content } = await req.json();

    if (!csv_content) {
      return new Response(
        JSON.stringify({ error: "Missing csv_content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let rows: CsvRow[];
    try {
      rows = parseCSV(csv_content);
    } catch (err) {
      return new Response(
        JSON.stringify({ error: String(err) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid rows found in CSV" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: categories } = await supabase
      .from("seo_categories")
      .select("id, name, slug");

    const categoryMap = new Map<string, string>();
    for (const cat of categories || []) {
      categoryMap.set(cat.name.toLowerCase(), cat.id);
      categoryMap.set(cat.slug.toLowerCase(), cat.id);
    }

    const { data: existingSlugs } = await supabase
      .from("seo_pages")
      .select("url_slug");
    const existingSet = new Set((existingSlugs || []).map((s: { url_slug: string }) => s.url_slug));

    const toInsert = [];
    const skipped = [];
    const errors = [];

    for (const row of rows) {
      let slug = row.url_slug;

      if (existingSet.has(slug)) {
        let counter = 2;
        while (existingSet.has(`${slug}-${counter}`)) counter++;
        slug = `${slug}-${counter}`;
      }

      const categoryId = row.category
        ? categoryMap.get(row.category.toLowerCase()) || null
        : null;

      toInsert.push({
        url_slug: slug,
        target_keyword: row.target_keyword,
        location: row.location || null,
        service_type: row.service_type || null,
        category_id: categoryId,
        status: "draft",
      });

      existingSet.add(slug);
    }

    if (toInsert.length === 0) {
      return new Response(
        JSON.stringify({ error: "No pages to import", skipped }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: inserted, error: insertError } = await supabase
      .from("seo_pages")
      .insert(toInsert)
      .select("id, url_slug");

    if (insertError) {
      return new Response(
        JSON.stringify({ error: "Database insert error", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        imported: inserted?.length || 0,
        skipped: skipped.length,
        total_rows: rows.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
