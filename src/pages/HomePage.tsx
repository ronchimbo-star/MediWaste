import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Testimonials from '../components/Testimonials';
import HomepageFAQ from '../components/HomepageFAQ';
import SEO from '../components/SEO';

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'MediWaste',
  description: 'Professional clinical waste disposal services for healthcare providers across the UK.',
  url: 'https://mediwaste.co.uk',
  telephone: '+447757664788',
  email: 'hello@mediwaste.co.uk',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'GB'
  },
  areaServed: ['London', 'Kent', 'Essex', 'Surrey', 'Sussex'],
  sameAs: []
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="MediWaste | Clinical & Medical Waste Disposal Services UK"
        description="Professional clinical waste disposal services for healthcare providers, beauty clinics, tattoo studios, and medical practices across the UK. Get your free quote today."
        canonical="https://mediwaste.co.uk/"
        schema={organizationSchema}
      />
      <Header />

      <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden min-h-[600px] flex items-center">
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-red-700/20"></div>

        <div className="absolute inset-0 right-0 w-full md:w-1/2 md:ml-auto">
          <div className="relative w-full h-full">
            <img
              src="/Medical-Waste-Hero.jpg"
              alt="Clinical waste disposal containers and medical waste management services"
              className="w-full h-full object-cover"
              fetchPriority="high"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/60 to-transparent"></div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12 md:py-16 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <p className="text-sm uppercase tracking-wider mb-4 text-red-400 font-semibold">Professional Medical Waste Solutions</p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-white">
                Clinical Waste Disposal for UK Healthcare Facilities
              </h1>
              <p className="text-lg md:text-xl mb-8 text-gray-200 leading-relaxed">
                Fully compliant waste collection and disposal services for healthcare facilities across the UK. Safe, reliable, and certified.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/quote"
                  className="bg-red-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-red-700 hover:scale-105 transition-all inline-flex items-center gap-2 shadow-lg"
                >
                  Get Your FREE Quote
                </Link>
                <a
                  href="#how-it-works"
                  className="bg-white text-gray-900 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 hover:scale-105 transition-all inline-flex items-center gap-2"
                >
                  Learn More
                </a>
              </div>
            </div>
            <div className="hidden md:block"></div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16">
            How Our Medical Waste Service Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
              <div className="w-14 h-14 bg-red-600 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Container Setup</h3>
              <p className="text-gray-600">
                We provide colour-coded containers and sharps bins tailored to your specific medical waste streams.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
              <div className="w-14 h-14 bg-red-600 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Scheduled Collection</h3>
              <p className="text-gray-600">
                Regular collections at times that suit you, with 24/7 emergency collection service available.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
              <div className="w-14 h-14 bg-red-600 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Safe Disposal</h3>
              <p className="text-gray-600">
                All waste is processed via incineration with full documentation and certificates provided.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Why Choose MediWaste</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Fully Compliant & Insured</h3>
                <p className="text-sm text-gray-600">Full compliance with waste regulations and comprehensive insurance</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Flexible Contracts</h3>
                <p className="text-sm text-gray-600">No long-term lock-ins, rolling monthly contracts or fixed-term</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">24/7 Emergency Service</h3>
                <p className="text-sm text-gray-600">Round-the-clock emergency waste collection available</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Full Documentation</h3>
                <p className="text-sm text-gray-600">Complete audit trail with consignment notes and certificates</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Waste Auditing</h3>
                <p className="text-sm text-gray-600">Detailed reporting to help reduce waste and costs</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Cost Savings</h3>
                <p className="text-sm text-gray-600">Competitive pricing with transparent, no-hidden-fees structure</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/clinical-waste-segregation-best-practices.jpg"
            alt="Clinical waste segregation"
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-red-600/75"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Save 20-40% with Cluster Collections
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  Our innovative cluster collection model groups nearby facilities for shared collection routes
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600 mb-2">20-40%</div>
                  <p className="text-sm text-gray-600">Average cost savings</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600 mb-2">Lower</div>
                  <p className="text-sm text-gray-600">Carbon footprint</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600 mb-2">Same</div>
                  <p className="text-sm text-gray-600">Premium service quality</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-bold text-gray-900 mb-3">How it works:</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">We group facilities in the same area for optimized collection routes</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">Shared logistics mean lower costs without compromising service</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">Reduced vehicle trips benefit the environment and your budget</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Fully Licensed & Accredited</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We maintain all necessary certifications and licences required for safe, compliant clinical waste management
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="bg-teal-50 rounded-lg p-6 mb-4">
                <svg className="w-16 h-16 mx-auto text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Environment Agency</h3>
              <p className="text-sm text-gray-600">Registered waste carrier licence</p>
            </div>
            <div className="text-center">
              <div className="bg-teal-50 rounded-lg p-6 mb-4">
                <svg className="w-16 h-16 mx-auto text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Waste Transfer Notes</h3>
              <p className="text-sm text-gray-600">Full compliance documentation</p>
            </div>
            <div className="text-center">
              <div className="bg-teal-50 rounded-lg p-6 mb-4">
                <svg className="w-16 h-16 mx-auto text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Comprehensive Insurance</h3>
              <p className="text-sm text-gray-600">Full liability coverage</p>
            </div>
            <div className="text-center">
              <div className="bg-teal-50 rounded-lg p-6 mb-4">
                <svg className="w-16 h-16 mx-auto text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Duty of Care</h3>
              <p className="text-sm text-gray-600">Complete audit trail</p>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="py-20 bg-gray-800 text-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Clinical & Medical Waste Services
          </h2>
          <p className="text-center text-gray-300 mb-12 max-w-3xl mx-auto">
            We provide specialist clinical waste disposal services for all healthcare waste streams across the UK.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
            <Link to="/waste-services/infectious-waste" className="bg-white text-gray-900 p-8 rounded-lg text-center hover:shadow-xl transition-shadow border-2 border-transparent hover:border-red-600">
              <div className="w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                <span className="text-7xl">🦠</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-red-600">Infectious Waste</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Safe disposal of infectious clinical waste including dressings, swabs, and contaminated materials requiring specialist incineration.
              </p>
            </Link>
            <Link to="/waste-services/sharps-waste" className="bg-white text-gray-900 p-8 rounded-lg text-center hover:shadow-xl transition-shadow border-2 border-transparent hover:border-red-600">
              <div className="w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                <span className="text-7xl">💉</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-red-600">Sharps Waste</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Secure disposal of sharps waste including needles, syringes, and other sharp instruments with puncture-proof containers.
              </p>
            </Link>
            <Link to="/waste-services/pharmaceutical-waste" className="bg-white text-gray-900 p-8 rounded-lg text-center hover:shadow-xl transition-shadow border-2 border-transparent hover:border-red-600">
              <div className="w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                <span className="text-7xl">💊</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-red-600">Pharmaceutical Waste</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Controlled disposal of expired or unwanted pharmaceuticals and medicines in line with regulatory requirements.
              </p>
            </Link>
            <Link to="/waste-services/anatomical-waste" className="bg-white text-gray-900 p-8 rounded-lg text-center hover:shadow-xl transition-shadow border-2 border-transparent hover:border-red-600">
              <div className="w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                <span className="text-7xl">🧬</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-red-600">Anatomical Waste</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Dignified disposal of anatomical waste including human tissue and body parts with full regulatory compliance.
              </p>
            </Link>
            <Link to="/waste-services/cytotoxic-waste" className="bg-white text-gray-900 p-8 rounded-lg text-center hover:shadow-xl transition-shadow border-2 border-transparent hover:border-red-600">
              <div className="w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                <span className="text-7xl">⚗️</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-red-600">Cytotoxic & Cytostatic</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Specialist handling of cytotoxic and cytostatic waste from cancer treatments requiring dedicated disposal methods.
              </p>
            </Link>
            <Link to="/waste-services/dental-waste" className="bg-white text-gray-900 p-8 rounded-lg text-center hover:shadow-xl transition-shadow border-2 border-transparent hover:border-red-600">
              <div className="w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                <span className="text-7xl">🦷</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-red-600">Dental Waste</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Complete dental waste management including amalgam separation and disposal of contaminated dental materials.
              </p>
            </Link>
          </div>
          <div className="text-center">
            <Link
              to="/quote"
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-full font-semibold transition-colors inline-block"
            >
              Get Your Waste Removed
            </Link>
          </div>
        </div>
      </section>

      <Testimonials />

      <section className="py-20 bg-red-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Ensure Compliant Medical Waste Disposal?
          </h2>
          <p className="text-lg mb-8 opacity-95 max-w-2xl mx-auto">
            Join hundreds of healthcare facilities who trust us with their medical waste management needs and provide compliant solutions.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to="/quote"
              className="bg-white text-red-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-50 transition-colors"
            >
              Request a Quote
            </Link>
            <a
              href="tel:+441322879713"
              className="border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-red-600 transition-colors"
            >
              Call Us Now
            </a>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">Service Coverage</h2>
          <p className="text-center text-gray-600 mb-12">Medical waste collection and disposal across the South East</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Link to="/service-areas/kent" className="bg-teal-50 p-6 rounded-lg hover:bg-teal-100 transition-colors border-2 border-transparent hover:border-red-600">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center justify-between">
                Kent
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Canterbury</li>
                <li>Maidstone</li>
                <li>Ashford</li>
                <li>Dartford</li>
                <li>Sevenoaks</li>
                <li>Tonbridge</li>
                <li>Gravesend</li>
              </ul>
            </Link>
            <Link to="/service-areas/london" className="bg-teal-50 p-6 rounded-lg hover:bg-teal-100 transition-colors border-2 border-transparent hover:border-red-600">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center justify-between">
                London
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Central London</li>
                <li>North London</li>
                <li>South London</li>
                <li>East London</li>
                <li>West London</li>
                <li>All Boroughs</li>
              </ul>
            </Link>
            <Link to="/service-areas/sussex" className="bg-teal-50 p-6 rounded-lg hover:bg-teal-100 transition-colors border-2 border-transparent hover:border-red-600">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center justify-between">
                Sussex
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Brighton</li>
                <li>Crawley</li>
                <li>Worthing</li>
                <li>Eastbourne</li>
                <li>Hastings</li>
                <li>Horsham</li>
              </ul>
            </Link>
            <Link to="/service-areas/essex" className="bg-teal-50 p-6 rounded-lg hover:bg-teal-100 transition-colors border-2 border-transparent hover:border-red-600">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center justify-between">
                Essex
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Chelmsford</li>
                <li>Colchester</li>
                <li>Basildon</li>
                <li>Southend</li>
                <li>Harlow</li>
                <li>Brentwood</li>
              </ul>
            </Link>
            <Link to="/service-areas/surrey" className="bg-teal-50 p-6 rounded-lg hover:bg-teal-100 transition-colors border-2 border-transparent hover:border-red-600">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center justify-between">
                Surrey
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Guildford</li>
                <li>Woking</li>
                <li>Epsom</li>
                <li>Reigate</li>
                <li>Staines</li>
                <li>Redhill</li>
              </ul>
            </Link>
            <Link to="/service-areas/hampshire" className="bg-teal-50 p-6 rounded-lg hover:bg-teal-100 transition-colors border-2 border-transparent hover:border-red-600">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center justify-between">
                Hampshire
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Southampton</li>
                <li>Portsmouth</li>
                <li>Winchester</li>
                <li>Basingstoke</li>
                <li>Eastleigh</li>
                <li>Fareham</li>
              </ul>
            </Link>
          </div>
          <div className="max-w-md mx-auto mt-8">
            <div className="bg-blue-900 text-white p-8 rounded-lg text-center">
              <h3 className="text-xl font-bold mb-3">Need service elsewhere?</h3>
              <p className="text-sm mb-6 opacity-90">
                We're expanding across the UK. Contact us to check availability in your area.
              </p>
              <a
                href="/quote"
                className="bg-white text-blue-900 px-6 py-2 rounded-full font-semibold hover:bg-gray-100 transition-colors inline-block text-sm"
              >
                Get in Touch
              </a>
            </div>
          </div>
        </div>
      </section>

      <HomepageFAQ />

      <Footer />
    </div>
  );
}
