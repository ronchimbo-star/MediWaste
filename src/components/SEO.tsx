import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  canonical: string;
  schema?: object | object[];
  image?: string;
  ogImage?: string;
  keywords?: string;
  noindex?: boolean;
  type?: string;
}

const DEFAULT_OG_IMAGE = 'https://mediwaste.co.uk/Medical-Waste-Hero.jpg';

function truncateDescription(desc: string): string {
  if (desc.length <= 160) return desc;
  const truncated = desc.slice(0, 159);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 120 ? truncated.slice(0, lastSpace) : truncated) + '…';
}

export default function SEO({
  title,
  description,
  canonical,
  schema,
  image,
  ogImage,
  keywords,
  noindex,
  type = 'website',
}: SEOProps) {
  const resolvedImage = ogImage || image || DEFAULT_OG_IMAGE;
  const safeDescription = truncateDescription(description);
  const schemas = schema ? (Array.isArray(schema) ? schema : [schema]) : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={safeDescription} />
      {keywords && <meta name="keywords" content={keywords} />}
      {noindex ? (
        <meta name="robots" content="noindex,nofollow" />
      ) : (
        <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
      )}
      <link rel="canonical" href={canonical} />

      <meta property="og:site_name" content="MediWaste" />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={safeDescription} />
      <meta property="og:image" content={resolvedImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="en_GB" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@mediwaste" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={safeDescription} />
      <meta name="twitter:image" content={resolvedImage} />

      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(s)}
        </script>
      ))}
    </Helmet>
  );
}
