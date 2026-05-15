import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import BottomCTA from '../components/BottomCTA';
import { supabase } from '../lib/supabase';

interface SeoPageData {
  id: string;
  url_slug: string;
  target_keyword: string;
  location: string | null;
  service_type: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  h1: string | null;
  content: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  canonical_url: string | null;
  internal_links: string[] | null;
  published_at: string | null;
  updated_at: string | null;
  seo_categories: { name: string; slug: string } | null;
}

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto animate-pulse">
            <div className="h-10 bg-gray-200 rounded w-3/4 mb-6" />
            <div className="space-y-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded" style={{ width: `${70 + Math.random() * 30}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function extractFaqFromContent(content: string): Array<{ question: string; answer: string }> {
  const faqs: Array<{ question: string; answer: string }> = [];
  const h3Regex = /<h3[^>]*>(.*?)<\/h3>\s*<p[^>]*>(.*?)<\/p>/gi;
  let match;
  const faqSectionStart = content.toLowerCase().indexOf('frequently asked questions');
  if (faqSectionStart === -1) return faqs;
  const faqContent = content.slice(faqSectionStart);
  while ((match = h3Regex.exec(faqContent)) !== null) {
    const question = match[1].replace(/<[^>]+>/g, '').trim();
    const answer = match[2].replace(/<[^>]+>/g, '').trim();
    if (question && answer && question.includes('?')) {
      faqs.push({ question, answer });
    }
  }
  return faqs;
}

export default function SeoPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: page, isLoading, error } = useQuery({
    queryKey: ['seo-page', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_pages')
        .select('*, seo_categories(name, slug)')
        .eq('url_slug', slug!)
        .eq('status', 'published')
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Page not found');

      await supabase.rpc('increment_seo_page_views', { page_slug: slug });

      return data as SeoPageData;
    },
    enabled: !!slug,
  });

  if (isLoading) return <PageSkeleton />;

  if (error || !page) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="py-24 text-center">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Page Not Found</h1>
            <p className="text-gray-600 mb-8">The page you're looking for doesn't exist or has been removed.</p>
            <Link to="/" className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors">
              Return Home <ArrowRight size={16} />
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const baseUrl = 'https://www.mediwaste.co.uk';
  const canonical = page.canonical_url || `${baseUrl}/c/${page.url_slug}`;
  const title = page.meta_title || page.h1 || page.target_keyword;
  const description = page.meta_description || `Professional ${page.target_keyword} services from MediWaste. Fully licensed, compliant clinical waste disposal across the UK.`;
  const locationLabel = page.location || 'your area';

  const faqs = page.content ? extractFaqFromContent(page.content) : [];

  const schemas: object[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: page.h1 || title,
      description,
      url: canonical,
      publisher: {
        '@type': 'Organization',
        name: 'MediWaste',
        url: baseUrl,
        logo: {
          '@type': 'ImageObject',
          url: `${baseUrl}/mediwaste-logo.png`,
        },
      },
      datePublished: page.published_at,
      dateModified: page.updated_at || page.published_at,
      keywords: page.meta_keywords || page.target_keyword,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: 'MediWaste',
      url: baseUrl,
      telephone: '0800 046 9806',
      description: `Clinical waste collection and disposal services${page.location ? ` in ${page.location}` : ''}`,
      areaServed: page.location || 'United Kingdom',
      priceRange: '$$',
    },
  ];

  if (faqs.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    });
  }

  const ctaTitle = `Get your free, no-obligation quote for ${locationLabel} today`;
  const ctaDescription = `We can usually start collections within 7 days in the ${locationLabel} area. Professional, compliant waste management tailored to your needs.`;

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <SEO
        title={title}
        description={description}
        canonical={canonical}
        ogImage={page.og_image || undefined}
        keywords={page.meta_keywords || page.target_keyword}
        schema={schemas}
        type="article"
      />

      <article>
        {/* Title Section */}
        <section className="py-12 lg:py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Link
                to="/"
                className="inline-flex items-center text-red-600 hover:text-red-700 font-semibold mb-8 transition-colors text-sm"
              >
                <ArrowLeft size={16} className="mr-1" /> Back to Home
              </Link>

              {(page.seo_categories || page.location) && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {page.seo_categories && (
                    <span className="text-xs px-3 py-1 bg-red-50 text-red-700 rounded-full font-medium">
                      {page.seo_categories.name}
                    </span>
                  )}
                  {page.location && (
                    <span className="text-xs px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
                      {page.location}
                    </span>
                  )}
                  {page.service_type && (
                    <span className="text-xs px-3 py-1 bg-green-50 text-green-700 rounded-full font-medium">
                      {page.service_type}
                    </span>
                  )}
                </div>
              )}

              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 leading-tight">
                {page.h1 || page.target_keyword}
              </h1>

              {page.published_at && (
                <p className="text-sm text-gray-500">
                  Published: {new Date(page.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {page.updated_at && page.updated_at !== page.published_at && (
                    <> | Updated: {new Date(page.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</>
                  )}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Main Content */}
        {page.content && (
          <section className="pb-12 lg:pb-16">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <div
                  className="article-content"
                  dangerouslySetInnerHTML={{ __html: page.content }}
                />
              </div>
            </div>
          </section>
        )}

        {/* Related Services */}
        {page.internal_links && page.internal_links.length > 0 && (
          <section className="py-10 bg-gray-50">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Related Services</h3>
                <div className="flex flex-wrap gap-2">
                  {page.internal_links.map((link, i) => (
                    <Link
                      key={i}
                      to={link}
                      className="text-sm text-red-600 hover:text-red-700 bg-white px-4 py-2 rounded-lg border border-gray-200 hover:border-red-200 transition-colors font-medium"
                    >
                      {link.replace(/^\/c\//, '').replace(/^\//, '').replace(/-/g, ' ')}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </article>

      <BottomCTA
        title={ctaTitle}
        description={ctaDescription}
      />
      <Footer />
    </div>
  );
}
