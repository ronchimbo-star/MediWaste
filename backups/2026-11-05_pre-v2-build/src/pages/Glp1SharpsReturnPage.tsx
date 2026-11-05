import { Link } from 'react-router-dom';
import { Check, AlertTriangle, Clock, FileCheck, MapPin } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

const CANONICAL = 'https://mediwaste.co.uk/glp1-sharps-safe-return';

const pageSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'GLP-1 Sharps Safe Return Network',
  serviceType: 'Community sharps return and collection',
  description: 'A managed community drop-off network for used GLP-1 and diabetes pen needles, with scheduled collection, duty-of-care documentation and monthly reporting.',
  url: CANONICAL,
  provider: {
    '@type': 'LocalBusiness',
    name: 'MediWaste',
    url: 'https://mediwaste.co.uk',
    telephone: '+441322879713',
  },
  areaServed: ['London', 'Kent', 'Essex', 'Surrey', 'Sussex', 'Hampshire'],
};

const issues = [
  {
    icon: AlertTriangle,
    title: 'Needle-stick risk',
    body: 'Discarded pen needles put residents, recycling-centre staff, waste operatives and street-cleaning teams at risk of injury.',
  },
  {
    icon: FileCheck,
    title: 'Recycling contamination',
    body: 'Sharps entering recycling or general waste disrupt sorting operations and create avoidable safety incidents.',
  },
  {
    icon: Clock,
    title: 'Inconvenient disposal',
    body: 'Residents may wait weeks for a household collection or travel further than necessary to find a suitable return point.',
  },
];

const steps = [
  { title: 'Council approves pilot', body: 'The council selects the pilot area, host locations and service standards.' },
  { title: 'MediWaste installs containers', body: 'We supply approved, secure sharps containers with clear public signage and resident guidance.' },
  { title: 'Residents return sharps', body: 'Residents place used pen needles and other approved sharps into their nearest return point.' },
  { title: 'We collect and report', body: 'MediWaste collects filled containers, replaces bins and provides monthly uptake and compliance reporting.' },
];

const benefits = [
  { label: 'Improves resident access.', body: 'Convenient local return points reduce reliance on individual household collections.' },
  { label: 'Reduces safety risk.', body: 'Keeps used needles away from general waste, recycling and public spaces.' },
  { label: 'Protects existing services.', body: 'Works alongside the council\u2019s current clinical-waste contractor and household collection arrangements.' },
  { label: 'Provides audit-ready records.', body: 'Includes duty-of-care documentation, collection logs and traceability.' },
  { label: 'Delivers measurable results.', body: 'Monthly reporting covers collections, volumes, site performance and issues.' },
];

const faqs = [
  {
    q: 'What can go in a MediWaste sharps return bin?',
    a: 'Approved sharps containers are for used needles, pen needles, lancets and similar sharp medical items. They must not be used for general rubbish, recycling, medicines, liquids or clinical waste bags.',
  },
  {
    q: 'Can residents bring GLP-1 injection pens?',
    a: 'Used pen needles should always go into a sharps container. Empty pen bodies and packaging should be handled according to the manufacturer\u2019s instructions and local guidance. MediWaste can provide clear resident-facing signage to reduce confusion.',
  },
  {
    q: 'Does this replace the council\u2019s existing clinical-waste service?',
    a: 'No. The service is designed to complement existing household clinical-waste collections. It adds convenient community return points for residents who can safely transport a sealed sharps container.',
  },
  {
    q: 'Where can return points be located?',
    a: 'Suitable locations may include selected pharmacies, council offices, libraries, leisure centres, GP practices and supermarket partners. Each site is assessed for accessibility, security, footfall and operational practicality.',
  },
  {
    q: 'How often are bins collected?',
    a: 'Collections can be weekly, fortnightly or based on fill levels. MediWaste can also provide an emergency call-out service if a container needs attention between scheduled visits.',
  },
  {
    q: 'Is the service compliant?',
    a: 'Yes. MediWaste provides duty-of-care documentation, collection records and traceability for waste transferred through the service.',
  },
  {
    q: 'What does the council receive?',
    a: 'The council receives a managed pilot with monthly reporting on collections, volumes, site performance, resident feedback and any operational issues.',
  },
];

export default function Glp1SharpsReturnPage() {
  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="GLP-1 Sharps Safe Return Pilot for Councils | MediWaste"
        description="Community drop-off for used GLP-1 pen needles. MediWaste runs a managed 6-12 month sharps return pilot with scheduled collections and duty-of-care reporting."
        keywords="GLP-1 sharps disposal, pen needle disposal, Wegovy Mounjaro needle disposal, sharps return council pilot, community sharps bin, injection needle disposal UK"
        canonical={CANONICAL}
        schema={pageSchema}
      />
      <Header />

      <section className="bg-gray-900 text-white py-20">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <span className="inline-block rounded-full border border-red-400/40 bg-red-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-red-200 mb-6">
            Council and community pilot
          </span>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            GLP-1 Sharps Safe Return Network
          </h1>
          <p className="text-lg text-gray-200 max-w-2xl mx-auto mb-10">
            A ready-made community drop-off service for used GLP-1 and diabetes injection sharps. It helps councils reduce recycling contamination, protects waste crews and makes safe disposal easier for residents.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contact" className="rounded-full bg-red-600 px-8 py-4 font-semibold text-white hover:bg-red-700 transition-colors">
              Request a pilot
            </Link>
            <a href="#how-it-works" className="rounded-full border border-white/25 px-8 py-4 font-semibold text-white hover:bg-white/10 transition-colors">
              See how it works
            </a>
          </div>
          <p className="mt-8 text-sm text-gray-400">
            Designed to complement existing household clinical-waste services, not replace them.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-sm font-bold uppercase tracking-widest text-red-600 mb-3">The issue</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-5">Used injection sharps need a safer, simpler route</h2>
            <p className="text-lg text-gray-600">
              More residents are self-administering GLP-1 weight-loss and diabetes medicines. Used pen needles must go into approved sharps containers, not household bins or recycling.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {issues.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-gray-200 bg-gray-50 p-7">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <Icon size={24} />
                </div>
                <h3 className="mt-5 text-xl font-bold text-gray-900">{title}</h3>
                <p className="mt-3 text-gray-600 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 bg-gray-50 scroll-mt-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-sm font-bold uppercase tracking-widest text-red-600 mb-3">How it works</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-5">A simple, managed community return network</h2>
            <p className="text-lg text-gray-600">MediWaste supplies, services and collects the sharps containers. The council keeps oversight and receives clear reporting.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step.title} className="rounded-2xl bg-white p-7 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600 text-lg font-bold text-white">
                  {index + 1}
                </div>
                <h3 className="mt-5 text-lg font-bold text-gray-900">{step.title}</h3>
                <p className="mt-3 text-gray-600 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-red-600 mb-3">Benefits</p>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-5">Practical benefits for councils, residents and partners</h2>
              <p className="text-lg text-gray-600 mb-8">The pilot is designed to be low-disruption, measurable and easy to scale if uptake is strong.</p>
              <ul className="space-y-5">
                {benefits.map((benefit) => (
                  <li key={benefit.label} className="flex gap-4">
                    <span className="mt-1 flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-red-50 text-red-600">
                      <Check size={18} />
                    </span>
                    <p className="text-gray-700">
                      <strong className="text-gray-900">{benefit.label}</strong> {benefit.body}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl bg-gray-900 p-8 sm:p-10 text-white shadow-xl">
              <h3 className="text-2xl font-bold">Pilot scope</h3>
              <p className="mt-3 text-gray-300">A focused, low-risk way to test community demand before wider rollout.</p>
              <div className="mt-8 space-y-5">
                <div className="flex items-start gap-4 border-b border-white/10 pb-5">
                  <Clock size={20} className="text-red-300 flex-none mt-0.5" />
                  <p><strong>Duration:</strong> A 6-12 month pilot, with the option to extend.</p>
                </div>
                <div className="flex items-start gap-4 border-b border-white/10 pb-5">
                  <MapPin size={20} className="text-red-300 flex-none mt-0.5" />
                  <p><strong>Locations:</strong> 5-15 approved community return points.</p>
                </div>
                <div className="flex items-start gap-4 border-b border-white/10 pb-5">
                  <Check size={20} className="text-red-300 flex-none mt-0.5" />
                  <p><strong>Service:</strong> Container supply, scheduled collections, replacements, cleaning and emergency call-outs.</p>
                </div>
                <div className="flex items-start gap-4">
                  <FileCheck size={20} className="text-red-300 flex-none mt-0.5" />
                  <p><strong>Reporting:</strong> Monthly report on collections, volumes, site usage and operational issues.</p>
                </div>
              </div>
              <Link to="/contact" className="mt-8 inline-block rounded-full bg-red-600 px-7 py-3 font-semibold text-white hover:bg-red-700 transition-colors">
                Discuss a local pilot
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="faqs" className="py-20 bg-gray-50 scroll-mt-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-12">
            <p className="text-sm font-bold uppercase tracking-widest text-red-600 mb-3">FAQs</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">GLP-1 Sharps Safe Return FAQs</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details key={faq.q} className="group rounded-2xl border border-gray-200 bg-white p-6">
                <summary className="flex cursor-pointer items-center justify-between text-lg font-semibold text-gray-900">
                  {faq.q}
                  <span className="text-red-600 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-4 text-gray-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-900 text-white">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-5">Bring a GLP-1 Sharps Safe Return pilot to your area</h2>
          <p className="text-lg text-gray-200 mb-8">
            Tell us about your council, pharmacy group, healthcare organisation or community site, and MediWaste will send a concise pilot outline with no obligation.
          </p>
          <Link to="/contact" className="inline-block rounded-full bg-red-600 px-8 py-4 font-semibold text-white hover:bg-red-700 transition-colors">
            Request pilot information
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
