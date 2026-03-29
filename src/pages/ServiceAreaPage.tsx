import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import BottomCTA from '../components/BottomCTA';

interface County {
  id: string;
  name: string;
  slug: string;
  description: string;
  meta_title: string;
  meta_description: string;
}

interface Town {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export default function ServiceAreaPage() {
  const { countySlug } = useParams<{ countySlug: string }>();
  const navigate = useNavigate();
  const [county, setCounty] = useState<County | null>(null);
  const [counties, setCounties] = useState<County[]>([]);
  const [towns, setTowns] = useState<Town[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const fetchAllCounties = async () => {
    try {
      setLoading(true);
      const { data, error: countiesError } = await supabase
        .from('location_service_pages')
        .select('region, slug, meta_title, meta_description')
        .eq('status', 'published')
        .order('region');

      if (countiesError) throw countiesError;

      // Convert to County format
      const countiesData: County[] = data?.map((item: any) => ({
        id: item.slug,
        name: item.region,
        slug: item.slug,
        description: item.meta_description || '',
        meta_title: item.meta_title,
        meta_description: item.meta_description || ''
      })) || [];

      setCounties(countiesData);
    } catch (err) {
      console.error('Error fetching counties:', err);
      setError('Unable to load service areas');
    } finally {
      setLoading(false);
    }
  };

  const fetchCountyData = async () => {
    try {
      setError('');
      const { data: countyData, error: countyError } = await supabase
        .from('counties')
        .select('*')
        .eq('slug', countySlug)
        .maybeSingle();

      if (countyError) {
        console.error('County query error:', countyError);
        throw countyError;
      }

      if (!countyData) {
        setError('County not found');
        navigate('/');
        return;
      }

      setCounty(countyData);

      const { data: townsData, error: townsError } = await supabase
        .from('towns')
        .select('id, name, slug, description')
        .eq('county_id', countyData.id)
        .order('display_order', { ascending: true });

      if (townsError) {
        console.error('Towns query error:', townsError);
      }

      setTowns(townsData || []);
    } catch (err) {
      console.error('Error fetching county data:', err);
      setError('Unable to load service area data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (countySlug) {
      fetchCountyData();
    } else {
      fetchAllCounties();
    }
  }, [countySlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Unable to Load Service Area</h1>
            <p className="text-gray-600 mb-8">{error}. Please try again later.</p>
            <button
              onClick={() => {
                setLoading(true);
                fetchCountyData();
              }}
              className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition"
            >
              Retry
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Show all counties if no specific county selected
  if (!countySlug) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SEO
          title="Service Coverage Areas | Clinical Waste Disposal UK | MediWaste"
          description="Professional clinical waste collection and disposal services across the UK. Licensed medical waste management for London, Kent, Surrey, Sussex, Hampshire, and Essex."
          canonical="https://mediwaste.co.uk/service-coverage"
        />
        <Header />

        <section className="bg-red-600 text-white py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Our Service Coverage Areas
              </h1>
              <p className="text-xl opacity-95 mb-8">
                Professional clinical waste disposal services across the South East and beyond
              </p>
            </div>
          </div>
        </section>

        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                Areas We Serve
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {counties.map((area) => (
                  <a
                    key={area.id}
                    href={`/${area.slug}`}
                    className="bg-gray-50 p-8 rounded-lg border-2 border-gray-200 hover:border-red-600 transition-colors group"
                  >
                    <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-red-600 transition-colors">
                      {area.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4">
                      Clinical waste collection and disposal services across {area.name}
                    </p>
                    <span className="text-red-600 font-semibold text-sm inline-flex items-center">
                      View Coverage
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Need Clinical Waste Services?
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Get a free quote for compliant clinical waste disposal with licensed collection and incineration
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href="/quote"
                className="bg-red-600 text-white px-8 py-4 rounded-full font-semibold hover:bg-red-700 transition-colors text-lg"
              >
                Request Free Quote
              </a>
              <a
                href="tel:+441322879713"
                className="border-2 border-red-600 text-red-600 px-8 py-4 rounded-full font-semibold hover:bg-red-600 hover:text-white transition-colors text-lg"
              >
                Call: 01322 879 713
              </a>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    );
  }

  if (!county) {
    return null;
  }

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Clinical Waste Disposal',
    provider: {
      '@type': 'LocalBusiness',
      name: 'MediWaste',
      url: 'https://mediwaste.co.uk'
    },
    areaServed: {
      '@type': 'AdministrativeArea',
      name: county.name
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title={county.meta_title || `Clinical Waste Services in ${county.name} | MediWaste`}
        description={county.meta_description || `Professional clinical waste disposal and collection services in ${county.name}. Licensed medical waste management for healthcare providers. Get a free quote today.`}
        canonical={`https://mediwaste.co.uk/service-areas/${countySlug}`}
        schema={serviceSchema}
      />
      <Header />

      <section className="bg-red-600 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Clinical Waste Services in {county.name}
            </h1>
            <p className="text-xl opacity-95 mb-8">
              {county.description}
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href="/quote"
                className="bg-white text-orange-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-50 transition-colors"
              >
                Get a Quote
              </a>
              <a
                href="tel:+441322879713"
                className="border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-orange-600 transition-colors"
              >
                Call Us Now
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 text-center">
              Areas We Serve in {county.name}
            </h2>
            <p className="text-center text-gray-600 mb-12">
              Professional clinical waste disposal services across all major towns and cities in {county.name}
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {towns.map((town) => (
                <div key={town.id} className="bg-blue-50 p-6 rounded-lg border border-blue-100 hover:border-orange-500 transition-colors">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{town.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{town.description}</p>
                  <a
                    href="/quote"
                    className="text-orange-600 hover:text-orange-700 font-semibold text-sm inline-flex items-center"
                  >
                    Get a Quote
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              ))}
            </div>

            {towns.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600">No towns listed yet for this area. We're expanding our coverage!</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Our Services in {county.name}
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-3xl">💉</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Sharps Disposal</h3>
                <p className="text-gray-600 text-sm">
                  Safe collection and disposal of needles, syringes, and other sharp medical instruments with certified sharps containers.
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-3xl">🩺</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Infectious Waste</h3>
                <p className="text-gray-600 text-sm">
                  Compliant disposal of infectious clinical waste including contaminated PPE, dressings, and pathological specimens.
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-3xl">💊</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Pharmaceutical Waste</h3>
                <p className="text-gray-600 text-sm">
                  Secure disposal of expired, unused, or contaminated medicines and pharmaceutical products with full documentation.
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-3xl">⚗️</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Cytotoxic Waste</h3>
                <p className="text-gray-600 text-sm">
                  Specialist handling of cytotoxic and cytostatic waste from cancer treatments with dedicated purple-lidded containers.
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-3xl">🦷</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Dental Waste</h3>
                <p className="text-gray-600 text-sm">
                  Complete dental waste management including amalgam separation and disposal of contaminated dental materials.
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-3xl">🧬</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Laboratory Waste</h3>
                <p className="text-gray-600 text-sm">
                  Safe disposal of laboratory chemicals, contaminated glassware, cultures, and biological specimens from research facilities.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              FAQs - Clinical Waste Disposal in {county.name}
            </h2>
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Do you provide clinical waste collection in {county.name}?
                </h3>
                <p className="text-gray-600">
                  Yes, we provide comprehensive clinical waste collection and disposal services throughout {county.name}. Our licensed waste carriers operate regular collection routes covering all major towns and surrounding areas. We offer flexible collection frequencies including weekly, fortnightly, and monthly schedules to suit your facility's needs.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  What waste types do you collect in {county.name}?
                </h3>
                <p className="text-gray-600">
                  We collect all categories of healthcare waste including infectious clinical waste, sharps waste (needles and syringes), pharmaceutical waste, cytotoxic waste from cancer treatments, dental waste including amalgam, anatomical waste, and laboratory waste. All waste is segregated using color-coded containers and disposed of via licensed incineration facilities.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  How quickly can you start waste collection services in {county.name}?
                </h3>
                <p className="text-gray-600">
                  We can typically set up new clinical waste collection services within 2-3 working days in {county.name}. This includes delivery of color-coded containers, sharps bins, and staff training on proper waste segregation. Emergency same-day collection is also available for urgent requirements. Contact us for immediate setup.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Are you licensed to collect medical waste in {county.name}?
                </h3>
                <p className="text-gray-600">
                  Yes, we are fully licensed by the Environment Agency as an Upper Tier Waste Carrier. We hold all necessary permits and licenses to collect and transport clinical waste throughout {county.name} and the wider UK. We provide complete documentation including waste transfer notes, consignment notes, and certificates of destruction for full audit compliance.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  What are your collection prices in {county.name}?
                </h3>
                <p className="text-gray-600">
                  Clinical waste collection prices in {county.name} depend on your waste volumes, collection frequency, and location. We offer competitive pricing with transparent quotes and no hidden fees. Most GP surgeries and small clinics pay between £50-£150 per collection. Request a free quote online or call us for an instant price based on your specific requirements.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Do you provide sharps bins in {county.name}?
                </h3>
                <p className="text-gray-600">
                  Yes, we supply puncture-proof sharps containers in various sizes from 1L to 10L for all facilities in {county.name}. Sharps bins are provided as part of our service and replaced during each collection. All sharps are disposed of via high-temperature incineration ensuring complete destruction and compliance with HTM 07-01 guidelines.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <BottomCTA
        title={`Ready to Get Started in ${county.name}?`}
        description="Get an instant quote for professional clinical waste management services."
        primaryButtonText="Request Your Free Quote"
      />

      <Footer />
    </div>
  );
}
