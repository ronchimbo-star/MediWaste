import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import BottomCTA from '../components/BottomCTA';
import NotFound from './NotFound';
import { Check } from 'lucide-react';

interface LocationServicePage {
  id: string;
  region: string;
  slug: string;
  meta_title: string;
  meta_description: string;
  h1_heading: string;
  introduction: string;
  services_content: string | null;
  why_choose_content: string | null;
  towns_covered: string[];
  postcode_areas: string[];
  industries_content: string | null;
}

export default function LocationServicePage() {
  const location = useLocation();
  const [page, setPage] = useState<LocationServicePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetchPage();
  }, [location.pathname]);

  const fetchPage = async () => {
    try {
      setLoading(true);
      // Extract slug from pathname (remove leading slash)
      let slug = location.pathname.substring(1);

      // Map short area names to full slugs
      const areaMapping: Record<string, string> = {
        'service-areas/london': 'clinical-waste-disposal-london',
        'service-areas/kent': 'clinical-waste-disposal-kent',
        'service-areas/essex': 'clinical-waste-disposal-essex',
        'service-areas/surrey': 'clinical-waste-disposal-surrey',
        'service-areas/sussex': 'clinical-waste-disposal-sussex',
        'service-areas/hampshire': 'clinical-waste-disposal-hampshire',
      };

      // Use mapped slug if available
      if (areaMapping[slug]) {
        slug = areaMapping[slug];
      }

      const { data, error } = await supabase
        .from('location_service_pages')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setNotFound(true);
      } else {
        setPage(data);
      }
    } catch (err) {
      console.error('Error fetching page:', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="text-lg text-gray-600">Loading page...</div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (notFound || !page) {
    return <NotFound />;
  }

  const canonicalUrl = `https://mediwaste.co.uk/${page.slug}`;

  const locationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Clinical Waste Disposal',
    url: canonicalUrl,
    provider: {
      '@type': 'LocalBusiness',
      name: 'MediWaste',
      telephone: '+447757664788',
      email: 'hello@mediwaste.co.uk',
      url: 'https://mediwaste.co.uk',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'GB',
        addressRegion: page.region,
      },
    },
    areaServed: {
      '@type': 'AdministrativeArea',
      name: page.region,
      containsPlace: page.towns_covered?.map(town => ({
        '@type': 'City',
        name: town,
      })) || [],
    },
    description: page.meta_description,
  };

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title={page.meta_title}
        description={page.meta_description}
        canonical={canonicalUrl}
        schema={locationSchema}
      />
      <Header />

      <section className="py-12 bg-red-600 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <nav className="mb-6">
              <ol className="flex items-center space-x-2 text-sm opacity-90">
                <li><Link to="/" className="hover:underline">Home</Link></li>
                <li>/</li>
                <li><Link to="/#services" className="hover:underline">Services</Link></li>
                <li>/</li>
                <li>{page.region}</li>
              </ol>
            </nav>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {page.h1_heading}
            </h1>
            <p className="text-xl opacity-95 leading-relaxed">
              {page.introduction}
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Clinical Waste Collection Services Across {page.region}
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="text-4xl mb-4">🦠</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Infectious Waste</h3>
                <p className="text-sm text-gray-600">Safe disposal of infectious clinical waste including dressings, swabs, and contaminated materials.</p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="text-4xl mb-4">💉</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Sharps Waste</h3>
                <p className="text-sm text-gray-600">Secure disposal of needles, syringes, and sharp instruments with puncture-proof containers.</p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="text-4xl mb-4">💊</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Pharmaceutical Waste</h3>
                <p className="text-sm text-gray-600">Controlled disposal of expired or unwanted pharmaceuticals and medicines.</p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="text-4xl mb-4">⚗️</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Cytotoxic Waste</h3>
                <p className="text-sm text-gray-600">Specialist handling of cytotoxic waste from cancer treatments.</p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="text-4xl mb-4">🦷</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Dental Waste</h3>
                <p className="text-sm text-gray-600">Complete dental waste management including amalgam separation.</p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="text-4xl mb-4">♻️</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Offensive Waste</h3>
                <p className="text-sm text-gray-600">Non-infectious waste disposal including PPE and incontinence products.</p>
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg p-8 mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Why {page.region} Healthcare Providers Choose MediWaste
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Fully Compliant & Licensed</h3>
                    <p className="text-sm text-gray-600">Upper Tier Waste Carrier with full Environment Agency approval</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Flexible Contracts</h3>
                    <p className="text-sm text-gray-600">No long-term lock-ins, rolling monthly contracts available</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">24/7 Emergency Service</h3>
                    <p className="text-sm text-gray-600">Round-the-clock emergency waste collection available</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Full Documentation</h3>
                    <p className="text-sm text-gray-600">Complete audit trail with consignment notes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {page.towns_covered && page.towns_covered.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                Areas We Serve in {page.region}
              </h2>
              <div className="bg-white rounded-lg p-8 border border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {page.towns_covered.map((town, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-orange-600 flex-shrink-0" />
                      <span className="text-gray-700">{town}</span>
                    </div>
                  ))}
                </div>
                {page.postcode_areas && page.postcode_areas.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      <strong>Postcode Areas Covered:</strong> {page.postcode_areas.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Industries We Serve in {page.region}
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-5xl mb-3">🏥</div>
                <h3 className="font-bold text-gray-900">GP Surgeries</h3>
              </div>
              <div className="text-center">
                <div className="text-5xl mb-3">🦷</div>
                <h3 className="font-bold text-gray-900">Dental Practices</h3>
              </div>
              <div className="text-center">
                <div className="text-5xl mb-3">💊</div>
                <h3 className="font-bold text-gray-900">Pharmacies</h3>
              </div>
              <div className="text-center">
                <div className="text-5xl mb-3">🏠</div>
                <h3 className="font-bold text-gray-900">Care Homes</h3>
              </div>
              <div className="text-center">
                <div className="text-5xl mb-3">🐾</div>
                <h3 className="font-bold text-gray-900">Veterinary Clinics</h3>
              </div>
              <div className="text-center">
                <div className="text-5xl mb-3">💆</div>
                <h3 className="font-bold text-gray-900">Beauty Clinics</h3>
              </div>
              <div className="text-center">
                <div className="text-5xl mb-3">🔬</div>
                <h3 className="font-bold text-gray-900">Laboratories</h3>
              </div>
              <div className="text-center">
                <div className="text-5xl mb-3">🏨</div>
                <h3 className="font-bold text-gray-900">Hospices</h3>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Frequently Asked Questions - {page.region} Clinical Waste Services
            </h2>
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  What areas of {page.region} do you cover?
                </h3>
                <p className="text-gray-600">
                  We provide clinical waste collection services throughout {page.region} including all major towns, cities, and surrounding rural areas. Our licensed waste carriers operate regular routes across the region with flexible collection schedules. Whether you're in a major urban center or smaller town, we can provide compliant medical waste disposal services.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  What types of healthcare facilities do you serve in {page.region}?
                </h3>
                <p className="text-gray-600">
                  We serve all types of healthcare facilities in {page.region} including GP surgeries, dental practices, care homes, nursing homes, pharmacies, veterinary clinics, tattoo studios, beauty clinics offering injectables, physiotherapy clinics, hospitals, hospices, and research laboratories. Our services are tailored to each facility type's specific waste management needs.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  How much does clinical waste collection cost in {page.region}?
                </h3>
                <p className="text-gray-600">
                  Clinical waste collection costs in {page.region} vary based on your waste volume, collection frequency, and specific location. Most small healthcare facilities pay between £50-£150 per collection. We offer competitive pricing with no hidden fees, transparent quotes, and flexible contracts. Contact us for a free personalized quote based on your exact requirements.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Do you provide emergency waste collection in {page.region}?
                </h3>
                <p className="text-gray-600">
                  Yes, we offer 24/7 emergency clinical waste collection services throughout {page.region}. If you have an urgent requirement due to overflowing containers, unexpected waste volumes, or regulatory compliance issues, our team can arrange same-day or next-day emergency collections. Call us immediately for urgent waste removal needs.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  What documentation do you provide for waste collections in {page.region}?
                </h3>
                <p className="text-gray-600">
                  We provide complete documentation for every collection including waste transfer notes, consignment notes for hazardous waste, and certificates of destruction following incineration. All documentation is provided digitally and in hard copy for your audit trail and CQC compliance. Records are retained for the required legal period.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Are you licensed to collect clinical waste in {page.region}?
                </h3>
                <p className="text-gray-600">
                  Yes, we are fully licensed by the Environment Agency as an Upper Tier Waste Carrier with comprehensive insurance coverage. We hold all necessary permits to collect, transport, and arrange disposal of all categories of clinical and hazardous waste throughout {page.region} and across the UK. We operate to the highest regulatory standards.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <BottomCTA
        title={`Ready for Compliant Clinical Waste Disposal in ${page.region}?`}
        description={`Join healthcare providers across ${page.region} who trust MediWaste for professional waste management.`}
        primaryButtonText="Get Your Free Quote"
      />

      <Footer />
    </div>
  );
}
