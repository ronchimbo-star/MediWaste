import { Link } from 'react-router-dom';
import { Check, ShieldCheck, FileText, ArrowRight } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Testimonials from '../components/Testimonials';
import HomepageFAQ from '../components/HomepageFAQ';
import SEO from '../components/SEO';

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'MediWaste',
  description: 'Clinical waste compliance and disposal services for GP surgeries, dental practices, and healthcare providers across London and the South East.',
  url: 'https://mediwaste.co.uk',
  telephone: '+441322879713',
  email: 'hello@mediwaste.co.uk',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'GB'
  },
  areaServed: ['London', 'Kent', 'Essex', 'Surrey', 'Sussex', 'Hampshire'],
  sameAs: []
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Clinical Waste Collection London & SE | MediWaste"
        description="Compliant clinical waste disposal for GP surgeries, dental practices and care homes across London and the South East. Registered waste carrier."
        canonical="https://mediwaste.co.uk/"
        schema={organizationSchema}
      />
      <Header />

      {/* ── HERO ── */}
      <section className="relative text-white overflow-hidden min-h-[560px] md:min-h-[640px] flex items-center">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="/mediwaste-clinical-waste.jpg"
            alt="Clinical waste disposal containers and medical waste management services"
            className="w-full h-full object-cover"
            fetchPriority="high"
            decoding="async"
          />
        </div>
        {/* Dark overlay for legibility — lighter so image is visible */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/20"></div>

        <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-wider mb-4 text-red-400 font-semibold">London &amp; South East Specialist</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-white drop-shadow-lg">
              Clinical Waste Compliance for London &amp; South East Practices
            </h1>
            <p className="text-lg md:text-xl mb-6 text-gray-100 leading-relaxed drop-shadow">
              We help dental practices, GP surgeries, veterinary clinics, tattoo artists, beauty and aesthetics clinics stay compliant with current clinical waste regulations. Registered waste carrier. Full documentation provided.
            </p>
            <ul className="space-y-2 mb-8">
              {[
                'Full waste segregation and documentation support',
                'Waste transfer notes issued within 48 hours of collection',
                'Collections typically start within 7 days',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-gray-100 text-sm md:text-base drop-shadow">
                  <Check size={16} className="text-green-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/quote"
                className="bg-red-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-red-700 hover:scale-105 transition-all inline-flex items-center gap-2 shadow-lg"
              >
                Get a Quote
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <section className="bg-gray-50 border-b border-gray-200 py-5">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-gray-700">
            <span className="flex items-center gap-2 font-medium">
              <ShieldCheck size={16} className="text-green-600" />
              Environment Agency Registered Carrier
            </span>
            <span className="flex items-center gap-2 font-medium">
              <ShieldCheck size={16} className="text-green-600" />
              SafeContractor Approved
            </span>
            <span className="flex items-center gap-2 font-medium">
              <ShieldCheck size={16} className="text-green-600" />
              ISO 14001 Certified
            </span>
            <span className="flex items-center gap-2 font-medium">
              <FileText size={16} className="text-green-600" />
              Waste Transfer Notes within 48 hours
            </span>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16">
            How Our Waste Collection Service Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
              <div className="w-14 h-14 bg-red-600 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Container Setup</h3>
              <p className="text-gray-600">
                We provide colour-coded containers and sharps bins matched to your specific waste streams and collection frequency.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
              <div className="w-14 h-14 bg-red-600 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Scheduled Collection</h3>
              <p className="text-gray-600">
                Regular collections at times that suit your practice, with emergency collection available when you need it.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
              <div className="w-14 h-14 bg-red-600 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Documentation &amp; Disposal</h3>
              <p className="text-gray-600">
                All waste is processed via licensed incineration. Waste transfer notes issued within 48 hours — ready for any inspection.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE MEDIWASTE ── */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Why Practice Managers Choose MediWaste</h2>
          <p className="text-center text-gray-500 mb-12 max-w-2xl mx-auto">
            We help dental practices, GP surgeries, and veterinary clinics stay compliant with NHS Clinical Waste Strategy guidelines — without the administrative burden.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { title: 'Registered Waste Carrier', desc: 'Environment Agency upper-tier registered carrier. Ask us for our registration number.' },
              { title: 'Full Segregation Support', desc: 'We advise on correct colour-coded container use for every waste stream you produce.' },
              { title: 'Complete Documentation', desc: 'Waste transfer notes and consignment notes provided within 48 hours of every collection.' },
              { title: 'Switch Without Disruption', desc: 'We manage the transition from your existing contractor. Most practices switch in under 7 days.' },
              { title: 'Transparent, Fixed Pricing', desc: 'No hidden charges. Competitive rates with rolling monthly or fixed-term contracts.' },
              { title: 'Annual EA Audit Compliance', desc: 'MediWaste is audited annually by the Environment Agency and holds full upper-tier carrier status.' },
            ].map(({ title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                  <p className="text-sm text-gray-600">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CLUSTER COLLECTIONS ── */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/clinical-waste-segregation-best-practices.jpg"
            alt="Clinical waste segregation best practices"
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
                  Save 20–40% with Cluster Collections
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  Our cluster collection model groups nearby practices for shared routes — lower cost, lower carbon, same reliable service.
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600 mb-2">20–40%</div>
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
                  {[
                    'We group facilities in the same area for optimised collection routes',
                    'Shared logistics mean lower costs without compromising service',
                    'Reduced vehicle trips benefit the environment and your budget',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ACCREDITATIONS ── */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Fully Licensed &amp; Accredited</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              All necessary certifications for safe, compliant clinical waste management. MediWaste is audited annually by the Environment Agency and holds a registered waste carrier licence (upper tier).
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {[
              { title: 'Environment Agency', desc: 'Registered waste carrier licence (upper tier)', path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
              { title: 'Waste Transfer Notes', desc: 'Full compliance documentation issued within 48 hours', path: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
              { title: 'Comprehensive Insurance', desc: 'Full liability coverage for every collection', path: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
              { title: 'Duty of Care', desc: 'Complete audit trail on every consignment', path: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
            ].map(({ title, desc, path }) => (
              <div key={title} className="text-center">
                <div className="bg-teal-50 rounded-lg p-6 mb-4">
                  <svg className="w-16 h-16 mx-auto text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="services" className="py-20 bg-gray-800 text-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Clinical &amp; Medical Waste Services
          </h2>
          <p className="text-center text-gray-300 mb-12 max-w-3xl mx-auto">
            Specialist clinical waste disposal for all healthcare waste streams — sharps, infectious, pharmaceutical, dental, and more.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
            {[
              { to: '/waste-services/infectious-waste', emoji: '🦠', title: 'Infectious Waste', desc: 'Safe disposal of infectious clinical waste including dressings, swabs, and contaminated materials.' },
              { to: '/waste-services/sharps-waste', emoji: '💉', title: 'Sharps Waste', desc: 'Puncture-proof container supply and secure collection of needles, syringes, and sharps instruments.' },
              { to: '/waste-services/pharmaceutical-waste', emoji: '💊', title: 'Pharmaceutical Waste', desc: 'Controlled disposal of expired or unwanted pharmaceuticals in line with regulatory requirements.' },
              { to: '/waste-services/anatomical-waste', emoji: '🧬', title: 'Anatomical Waste', desc: 'Dignified, compliant disposal of anatomical waste including human tissue and body parts.' },
              { to: '/waste-services/cytotoxic-waste', emoji: '⚗️', title: 'Cytotoxic & Cytostatic', desc: 'Specialist handling of cytotoxic waste from cancer treatments requiring dedicated disposal methods.' },
              { to: '/waste-services/dental-waste', emoji: '🦷', title: 'Dental Waste', desc: 'Complete dental waste management including amalgam separation and contaminated dental materials.' },
            ].map(({ to, emoji, title, desc }) => (
              <Link key={to} to={to} className="bg-white text-gray-900 p-8 rounded-lg text-center hover:shadow-xl transition-shadow border-2 border-transparent hover:border-red-600">
                <div className="w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                  <span className="text-7xl">{emoji}</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-red-600">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
              </Link>
            ))}
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

      {/* ── GLP-1 SHARPS SAFE RETURN ── */}
      <section id="glp1-sharps-safe-return" className="py-20 bg-white scroll-mt-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-red-600 mb-3">Community pilot</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-5 leading-tight">
                GLP-1 Sharps Safe Return Network
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                A managed community drop-off service for used GLP-1 and diabetes pen needles. It gives residents a safe, convenient route for sharps and gives councils a documented, low-risk way to keep them out of recycling and general waste.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  'Prevent used GLP-1 pen needles entering household recycling or general waste',
                  'Reduce needle-stick risk for recycling-centre and waste crews',
                  'Give residents a convenient alternative to waiting weeks for a household collection',
                  'Provide a managed, auditable service with duty-of-care documentation',
                  'Start as a 6-12 month pilot in 5-15 locations, then scale by uptake',
                ].map((point) => (
                  <li key={point} className="flex items-start gap-3 text-gray-700">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/glp1-sharps-safe-return"
                className="inline-flex items-center gap-2 bg-red-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-red-700 transition-colors"
              >
                Find out more about the pilot
                <ArrowRight size={18} />
              </Link>
            </div>
            <div className="bg-gray-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl">
              <p className="text-sm font-semibold text-red-300 uppercase tracking-wide mb-3">Pilot at a glance</p>
              <dl className="space-y-5">
                {[
                  { label: 'Pilot length', value: '6-12 months' },
                  { label: 'Return locations', value: '5-15 sites' },
                  { label: 'Collections', value: 'Scheduled and on demand' },
                  { label: 'Reporting', value: 'Monthly' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-6 border-b border-white/10 pb-4">
                    <dt className="text-gray-400">{label}</dt>
                    <dd className="font-semibold text-right">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      <Testimonials />

      {/* ── FINAL CTA ── */}
      <section className="py-20 bg-red-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Switch to a Fully Compliant Waste Contractor?
          </h2>
          <p className="text-lg mb-8 opacity-95 max-w-2xl mx-auto">
            We'll have you set up and collecting within 7 days. No disruption to your practice. Full documentation from day one.
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
              Call 01322 879 713
            </a>
          </div>
        </div>
      </section>

      {/* ── SERVICE COVERAGE ── */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">Service Coverage</h2>
          <p className="text-center text-gray-600 mb-12">Clinical waste collection across London and the South East</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              { to: '/service-areas/kent', label: 'Kent', towns: ['Canterbury', 'Maidstone', 'Ashford', 'Dartford', 'Sevenoaks', 'Tonbridge', 'Gravesend'] },
              { to: '/service-areas/london', label: 'London', towns: ['Central London', 'North London', 'South London', 'East London', 'West London', 'All Boroughs'] },
              { to: '/service-areas/sussex', label: 'Sussex', towns: ['Brighton', 'Crawley', 'Worthing', 'Eastbourne', 'Hastings', 'Horsham'] },
              { to: '/service-areas/essex', label: 'Essex', towns: ['Chelmsford', 'Colchester', 'Basildon', 'Southend', 'Harlow', 'Brentwood'] },
              { to: '/service-areas/surrey', label: 'Surrey', towns: ['Guildford', 'Woking', 'Epsom', 'Reigate', 'Staines', 'Redhill'] },
              { to: '/service-areas/hampshire', label: 'Hampshire', towns: ['Southampton', 'Portsmouth', 'Winchester', 'Basingstoke', 'Eastleigh', 'Fareham'] },
            ].map(({ to, label, towns }) => (
              <Link key={to} to={to} className="bg-teal-50 p-6 rounded-lg hover:bg-teal-100 transition-colors border-2 border-transparent hover:border-red-600">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center justify-between">
                  {label}
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  {towns.map((t) => <li key={t}>{t}</li>)}
                </ul>
              </Link>
            ))}
          </div>
          <div className="max-w-md mx-auto mt-8">
            <div className="bg-blue-900 text-white p-8 rounded-lg text-center">
              <h3 className="text-xl font-bold mb-3">Need service elsewhere?</h3>
              <p className="text-sm mb-6 opacity-90">
                We're expanding across the UK. Contact us to check availability in your area.
              </p>
              <Link
                to="/contact"
                className="bg-white text-blue-900 px-6 py-2 rounded-full font-semibold hover:bg-gray-100 transition-colors inline-block text-sm"
              >
                Get in Touch
              </Link>
            </div>
          </div>
        </div>
      </section>

      <HomepageFAQ />
      <Footer />
    </div>
  );
}
