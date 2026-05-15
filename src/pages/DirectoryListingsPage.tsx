import { useQuery } from '@tanstack/react-query';
import { ExternalLink, CheckCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import BottomCTA from '../components/BottomCTA';
import { supabase } from '../lib/supabase';

interface DirectoryListing {
  id: string;
  directory_name: string;
  directory_link: string;
  category: string;
  status: string;
  notes: string | null;
  use_nofollow: boolean;
  last_checked: string | null;
}

interface DirectorySettings {
  business_name: string;
  public_intro: string;
  meta_title_override: string;
  meta_description_override: string;
  show_status_badges: boolean;
  show_notes_publicly: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  General: 'General Directories',
  Medical: 'Healthcare & Medical Directories',
  Aesthetic: 'Beauty & Aesthetics Directories',
  Local: 'Local Business Directories',
  Niche: 'Specialist & Niche Directories',
};

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto animate-pulse">
            <div className="h-10 bg-gray-200 rounded w-3/4 mb-6" />
            <div className="h-4 bg-gray-200 rounded w-full mb-3" />
            <div className="h-4 bg-gray-200 rounded w-5/6 mb-8" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded mb-2" />
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function DirectoryListingsPage() {
  const { data: settings } = useQuery({
    queryKey: ['directory-settings-public'],
    queryFn: async () => {
      const { data } = await supabase
        .from('directory_settings')
        .select('business_name, public_intro, meta_title_override, meta_description_override, show_status_badges, show_notes_publicly')
        .limit(1)
        .maybeSingle();
      return data as DirectorySettings | null;
    },
  });

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['directory-listings-public'],
    queryFn: async () => {
      const { data } = await supabase
        .from('directory_listings')
        .select('*')
        .eq('status', 'live')
        .order('directory_name');
      return (data || []) as DirectoryListing[];
    },
  });

  if (isLoading) return <PageSkeleton />;

  const businessName = settings?.business_name || 'MediWaste';
  const metaTitle = settings?.meta_title_override || `${businessName} Directory Listings | Find Us Online`;
  const metaDescription = settings?.meta_description_override || `View all active directory listings for ${businessName}. Find and verify our business on Yell, Google Maps, FreeIndex, and more.`;
  const canonical = 'https://www.mediwaste.co.uk/directory-listings';

  // Group listings by category
  const grouped = listings.reduce<Record<string, DirectoryListing[]>>((acc, listing) => {
    const cat = listing.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(listing);
    return acc;
  }, {});

  const categoryOrder = ['General', 'Medical', 'Aesthetic', 'Local', 'Niche'];
  const sortedCategories = categoryOrder.filter(c => grouped[c]?.length);

  // Find most recent last_checked date
  const lastChecked = listings
    .filter(l => l.last_checked)
    .sort((a, b) => new Date(b.last_checked!).getTime() - new Date(a.last_checked!).getTime())[0]?.last_checked;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: metaTitle,
    description: metaDescription,
    url: canonical,
    mainEntity: {
      '@type': 'Organization',
      name: businessName,
      url: 'https://www.mediwaste.co.uk',
    },
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <SEO
        title={metaTitle}
        description={metaDescription}
        canonical={canonical}
        schema={schema}
      />

      <main className="py-12 lg:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              {businessName} &ndash; Our Directory Listings
            </h1>

            {settings?.public_intro && (
              <p className="text-lg text-gray-600 mb-10 leading-relaxed max-w-3xl">
                {settings.public_intro}
              </p>
            )}

            {sortedCategories.length === 0 ? (
              <p className="text-gray-500">No directory listings are currently available.</p>
            ) : (
              <div className="space-y-10">
                {sortedCategories.map((category) => (
                  <section key={category}>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                      {CATEGORY_LABELS[category] || category}
                    </h2>
                    <div className="space-y-2">
                      {grouped[category].map((listing) => (
                        <div
                          key={listing.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <a
                              href={listing.directory_link}
                              target="_blank"
                              rel={`noopener noreferrer${listing.use_nofollow ? ' nofollow' : ''}`}
                              className="text-base font-medium text-gray-900 hover:text-red-600 transition-colors flex items-center gap-2"
                            >
                              {listing.directory_name}
                              <ExternalLink size={14} className="text-gray-400 group-hover:text-red-500 flex-shrink-0" />
                            </a>
                            {settings?.show_status_badges && (
                              <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                <CheckCircle size={10} /> Live
                              </span>
                            )}
                          </div>
                          {settings?.show_notes_publicly && listing.notes && (
                            <span className="text-xs text-gray-500 flex-shrink-0 ml-3">
                              {listing.notes}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {lastChecked && (
              <p className="mt-10 text-sm text-gray-400">
                Last updated: {new Date(lastChecked).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>
      </main>

      <BottomCTA
        title="Need Clinical Waste Disposal?"
        description="Get a free, no-obligation quote for compliant clinical waste collection tailored to your practice."
      />
      <Footer />
    </div>
  );
}
