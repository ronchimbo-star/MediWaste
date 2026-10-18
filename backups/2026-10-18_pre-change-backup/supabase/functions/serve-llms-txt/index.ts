import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const BASE_URL = "https://mediwaste.co.uk";

const STATIC_PAGES = [
  { path: "/", title: "MediWaste — Clinical Waste Collection London & South East", description: "Licensed clinical waste collection for GP surgeries, dental practices, care homes and aesthetic clinics across London and the South East." },
  { path: "/about", title: "About MediWaste", description: "Licensed clinical waste disposal company. Environment Agency registered, Safe Contractor approved, ISO 14001 certified." },
  { path: "/waste-services", title: "Clinical Waste Disposal Services", description: "Licensed collection and disposal of infectious waste, sharps, pharmaceutical, cytotoxic, dental and anatomical waste." },
  { path: "/waste-services/infectious-waste", title: "Infectious Waste Disposal", description: "Yellow bag infectious waste collection and incineration for healthcare facilities." },
  { path: "/waste-services/sharps-waste", title: "Sharps Waste Disposal", description: "Licensed sharps disposal including needles, syringes and lancets with free puncture-proof bins." },
  { path: "/waste-services/pharmaceutical-waste", title: "Pharmaceutical Waste Disposal", description: "Expired medicine and controlled drug disposal in blue bins with compliant incineration." },
  { path: "/waste-services/cytotoxic-waste", title: "Cytotoxic Waste Disposal", description: "Chemotherapy and cytostatic waste collection in purple containers with high-temperature incineration." },
  { path: "/waste-services/dental-waste", title: "Dental Waste Disposal", description: "Amalgam, sharps, X-ray chemicals and infectious waste collection for dental practices." },
  { path: "/waste-services/anatomical-waste", title: "Anatomical Waste Disposal", description: "Human tissue, organs and pathology specimen collection with dignified compliant incineration." },
  { path: "/compliance", title: "Clinical Waste Compliance", description: "Duty of Care guidance, waste transfer notes and regulatory compliance support for healthcare providers." },
  { path: "/quote", title: "Get a Free Quote", description: "Request a free, no-obligation clinical waste collection quote. Response within one business day." },
  { path: "/contact", title: "Contact MediWaste", description: "Contact details for quotes and enquiries. Call 01322 879 713 or use our online form." },
  { path: "/faq", title: "Frequently Asked Questions", description: "Common questions about clinical waste disposal, sharps collection, compliance and pricing." },
  { path: "/audit", title: "Free Clinical Waste Audit Tool", description: "Free AI-powered compliance audit for healthcare facilities. 15 questions, instant report." },
  { path: "/service-coverage", title: "Service Coverage Areas", description: "Clinical waste collection across London, Kent, Essex, Surrey, Sussex and Hampshire." },
  { path: "/directory-listings", title: "Clinical Waste Business Directory", description: "Directory of healthcare businesses and clinical waste service providers across the UK." },
  { path: "/news", title: "Clinical Waste News & Updates", description: "Latest clinical waste management news, regulations and best practice guidance." },
  { path: "/terms", title: "Terms of Service", description: "Terms and conditions for MediWaste clinical waste disposal services." },
  { path: "/privacy", title: "Privacy Policy", description: "How MediWaste collects, uses and protects personal data under UK GDPR." },
  { path: "/cookies", title: "Cookie Policy", description: "Types of cookies used on the MediWaste website and how to manage consent." },
];

const COUNTY_PAGES = [
  { slug: "london", name: "London" },
  { slug: "kent", name: "Kent" },
  { slug: "essex", name: "Essex" },
  { slug: "surrey", name: "Surrey" },
  { slug: "sussex", name: "Sussex" },
  { slug: "hampshire", name: "Hampshire" },
];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Fetch published markdown versions (for link tags)
    const mdResp = await fetch(
      `${supabaseUrl}/rest/v1/markdown_versions?select=source_url,title,public_slug,description&is_published=eq.true&is_latest=eq.true&order=created_at.desc`,
      { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, "Content-Type": "application/json" } }
    );
    const markdownPages = mdResp.ok ? await mdResp.json() : [];

    // Fetch published SEO location pages
    const seoResp = await fetch(
      `${supabaseUrl}/rest/v1/seo_pages?select=url_slug,meta_title,meta_description&status=eq.published&order=created_at.desc`,
      { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, "Content-Type": "application/json" } }
    );
    const seoPages = seoResp.ok ? await seoResp.json() : [];

    // Fetch published news articles
    const newsResp = await fetch(
      `${supabaseUrl}/rest/v1/news_articles?select=slug,seo_title,title,excerpt&status=eq.published&order=published_at.desc`,
      { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, "Content-Type": "application/json" } }
    );
    const newsArticles = newsResp.ok ? await newsResp.json() : [];

    // Build llms.txt content
    const lines: string[] = [
      "# MediWaste",
      "",
      "> Clinical waste collection and disposal services for GP surgeries, dental practices, care homes, aesthetic clinics and beauty salons across London and the South East. Environment Agency registered upper tier waste carrier.",
      "",
      "## Core Pages",
      "",
    ];

    for (const page of STATIC_PAGES) {
      const url = `${BASE_URL}${page.path}`;
      lines.push(`- [${page.title}](${url}): ${page.description}`);
    }

    lines.push("", "## Service Areas", "");
    for (const county of COUNTY_PAGES) {
      const url = `${BASE_URL}/service-areas/${county.slug}`;
      lines.push(`- [Clinical Waste Disposal ${county.name}](${url}): Licensed clinical waste collection across ${county.name}.`);
    }

    if (seoPages.length > 0) {
      lines.push("", "## Location Pages", "");
      for (const page of seoPages) {
        const url = `${BASE_URL}/c/${page.url_slug}`;
        const title = page.meta_title || page.url_slug;
        const desc = page.meta_description || "";
        lines.push(`- [${title}](${url}): ${desc}`);
      }
    }

    if (newsArticles.length > 0) {
      lines.push("", "## News Articles", "");
      for (const article of newsArticles) {
        const url = `${BASE_URL}/news/${article.slug}`;
        const title = article.seo_title || article.title;
        const desc = article.excerpt || "";
        lines.push(`- [${title}](${url}): ${desc}`);
      }
    }

    if (markdownPages.length > 0) {
      lines.push("", "## Markdown Versions (for AI agents)", "");
      for (const page of markdownPages) {
        if (page.public_slug) {
          const url = `${BASE_URL}/llms/${page.public_slug}`;
          lines.push(`- [${page.title || page.source_url}](${url}): ${page.description || "Markdown version of this page for AI consumption."}`);
        }
      }
    }

    lines.push("", "## Contact", "");
    lines.push(`- Phone: 01322 879 713`);
    lines.push(`- Email: hello@mediwaste.co.uk`);
    lines.push(`- Quote: ${BASE_URL}/quote`);

    const content = lines.join("\n") + "\n";

    return new Response(content, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(`Error generating llms.txt: ${msg}`, {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }
});
