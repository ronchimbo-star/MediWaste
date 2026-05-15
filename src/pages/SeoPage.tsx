import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Phone, ArrowRight } from 'lucide-react';
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

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: page.h1 || title,
    description,
    url: canonical,
    publisher: {
      '@type': 'Organization',
      name: 'MediWaste',
      url: baseUrl,
    },
    datePublished: page.published_at,
    dateModified: page.updated_at || page.published_at,
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <SEO
        title={title}
        description={description}
        canonical={canonical}
        ogImage={page.og_image || undefined}
        schema={schema}
        type="article"
      />

      <article className="py-12 lg:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {page.seo_categories && (
              <div className="mb-6">
                <span className="inline-block bg-red-50 text-red-700 text-sm font-medium px-3 py-1 rounded-full">
                  {page.seo_categories.name}
                </span>
                {page.location && (
                  <span className="inline-block bg-blue-50 text-blue-700 text-sm font-medium px-3 py-1 rounded-full ml-2">
                    {page.location}
                  </span>
                )}
              </div>
            )}

            {page.h1 && (
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-8 leading-tight">
                {page.h1}
              </h1>
            )}

            {page.content && (
              <div
                className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-headings:font-bold prose-p:text-gray-700 prose-a:text-red-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:text-gray-700"
                dangerouslySetInnerHTML={{ __html: page.content }}
              />
            )}

            <div className="mt-12 bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-8 md:p-10 text-white">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Need Professional Clinical Waste Disposal?
              </h2>
              <p className="text-red-100 mb-6 text-lg">
                MediWaste provides fully compliant, licensed clinical waste collection services{page.location ? ` in ${page.location}` : ' across the UK'}. Get a free quote today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/quote"
                  className="inline-flex items-center justify-center gap-2 bg-white text-red-700 font-semibold px-6 py-3 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Get a Free Quote <ArrowRight size={16} />
                </Link>
                <a
                  href="tel:0145aborede"
                  className="inline-flex items-center justify-center gap-2 border-2 border-white text-white font-semibold px-6 py-3 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <Phone size={16} /> Call Us Today
                </a>
              </div>
            </div>

            {page.internal_links && page.internal_links.length > 0 && (
              <div className="mt-10 p-6 bg-gray-50 rounded-xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Related Services</h3>
                <div className="flex flex-wrap gap-2">
                  {page.internal_links.map((link, i) => (
                    <Link
                      key={i}
                      to={link}
                      className="text-sm text-red-600 hover:text-red-700 bg-white px-3 py-1.5 rounded-lg border border-gray-200 hover:border-red-200 transition-colors"
                    >
                      {link.replace(/^\/c\//, '').replace(/-/g, ' ')}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </article>

      <BottomCTA
        title="Get a Free Clinical Waste Disposal Quote"
        description="Professional, compliant waste management services tailored to your needs. Contact MediWaste today."
      />
      <Footer />
    </div>
  );
}
