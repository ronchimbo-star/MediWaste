import { Link } from 'react-router-dom';
import { Check, AlertCircle, Truck, FileText } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

const serviceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Sharps Waste Disposal',
  provider: {
    '@type': 'Organization',
    name: 'MediWaste'
  },
  serviceType: 'Sharps Waste Collection and Disposal',
  areaServed: {
    '@type': 'Country',
    name: 'United Kingdom'
  },
  description: 'Professional sharps waste collection and disposal services with puncture-proof containers and licensed incineration.'
};

export default function SharpsWastePage() {
  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Sharps Waste Disposal UK | Needle & Syringe Disposal Service | Sharps Bins"
        description="Expert sharps waste disposal services. Puncture-proof sharps bins for needles, syringes, and medical sharps. Licensed collection and incineration. Free sharps containers. Get a quote."
        canonical="https://mediwaste.co.uk/waste-services/sharps-waste"
        schema={serviceSchema}
      />
      <Header />

      <div className="bg-gradient-to-br from-red-600 to-red-700 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-full mb-6">
              <span className="text-5xl">💉</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Sharps Waste Disposal Services - Needles & Syringes
            </h1>
            <p className="text-xl opacity-95 max-w-3xl mx-auto">
              Safe disposal of sharps waste including needles, syringes, lancets, and sharp medical instruments with puncture-proof containers and compliant incineration
            </p>
          </div>
        </div>
      </div>

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-start mb-16">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  What is Sharps Waste?
                </h2>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  Sharps waste includes any medical instruments or devices with sharp points or edges capable of causing injury through cutting or puncturing. This encompasses hypodermic needles, syringes with needles, scalpel blades, lancets, broken glass ampoules, and any other sharp items used in healthcare settings.
                </p>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  Under UK regulations, all sharps must be disposed of in UN-approved rigid puncture-proof containers (sharps bins) marked with BS 7320 standard. Sharps waste is classified as hazardous and must be incinerated at licensed facilities to ensure complete destruction and prevent needle-stick injuries.
                </p>
                <div className="bg-red-50 border-l-4 border-red-600 p-6 rounded">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold text-gray-900 mb-2">Critical Safety Requirement</h3>
                      <p className="text-sm text-gray-700">
                        Sharps bins must NEVER be filled above the fill line. Once at the fill line, seal the container immediately and arrange collection. Overfilled sharps bins pose serious injury risks to staff and waste handlers.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <div className="bg-gray-50 rounded-lg p-8 border-2 border-gray-200">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Types of Sharps Waste</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <span className="text-gray-700">Hypodermic needles and syringes</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <span className="text-gray-700">Insulin pen needles and lancets for blood testing</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <span className="text-gray-700">Scalpel blades and surgical blades</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <span className="text-gray-700">Suture needles and acupuncture needles</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <span className="text-gray-700">Dental needles and orthodontic wires</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <span className="text-gray-700">Broken glass ampoules and vials</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <span className="text-gray-700">Razor blades and biopsy needles</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <span className="text-gray-700">Veterinary needles and tattoo needles</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Sharps Container Sizes</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Small Sharps Bins</h3>
                  <p className="text-gray-700 mb-4 font-semibold">1L - 3L Capacity</p>
                  <p className="text-gray-600 text-sm mb-4">
                    Ideal for low-volume settings and point-of-use disposal
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>GP consulting rooms</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Home visits and mobile clinics</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Dental surgeries</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Individual patient use</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Medium Sharps Bins</h3>
                  <p className="text-gray-700 mb-4 font-semibold">5L - 7L Capacity</p>
                  <p className="text-gray-600 text-sm mb-4">
                    Most popular size for clinics and care homes
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Treatment rooms</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Nursing homes and care facilities</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Pharmacies providing injections</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Beauty clinics with injectables</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Large Sharps Bins</h3>
                  <p className="text-gray-700 mb-4 font-semibold">10L - 30L Capacity</p>
                  <p className="text-gray-600 text-sm mb-4">
                    For high-volume facilities and bulk sharps
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Hospital wards and A&E</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Surgical theaters</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Laboratories and phlebotomy</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Large veterinary practices</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 text-white rounded-2xl p-8 md:p-12 mb-16">
              <h2 className="text-3xl font-bold mb-8 text-center">Our Sharps Disposal Service</h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-full mb-4">
                    <Truck className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Free Sharps Bins</h3>
                  <p className="text-gray-300 text-sm">
                    All sharps containers provided free as part of our service, replaced at every collection
                  </p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-full mb-4">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Full Compliance</h3>
                  <p className="text-gray-300 text-sm">
                    BS 7320 approved containers with consignment notes and certificates for audit trails
                  </p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-full mb-4">
                    <Check className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Safe Incineration</h3>
                  <p className="text-gray-300 text-sm">
                    High-temperature incineration ensuring complete destruction of all sharps and pathogens
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Sharps Waste Disposal FAQs
            </h2>
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  What color sharps bin should I use?
                </h3>
                <p className="text-gray-600">
                  Yellow-lidded sharps bins are used for infectious sharps requiring incineration (most common). Orange-lidded bins are for non-infectious sharps that can undergo alternative treatment. Purple-lidded bins are specifically for cytotoxic and cytostatic sharps from cancer treatments. Most healthcare facilities use yellow sharps bins as the default safe option.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  How full should I fill a sharps bin?
                </h3>
                <p className="text-gray-600">
                  Sharps bins must never be filled beyond the fill line clearly marked on the container. Overfilling is dangerous and illegal. Once waste reaches the fill line, seal the bin immediately using the temporary or permanent closure mechanism and arrange collection. Typically, bins should be no more than 3/4 full to ensure safe closure and handling.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Can I reopen a sealed sharps bin?
                </h3>
                <p className="text-gray-600">
                  No, once a sharps bin is sealed with its permanent closure, it must never be reopened. This is a critical safety requirement. If you accidentally seal a bin that isn't full, it must still be collected and disposed of - you cannot reopen it to add more waste. Always ensure you're ready for final closure before sealing permanently.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Where should sharps bins be positioned?
                </h3>
                <p className="text-gray-600">
                  Sharps bins should be positioned at the point of use - where sharps are used - to enable immediate disposal without carrying used needles. Mount bins securely at a height suitable for users, typically eye level. Ensure bins are visible, easily accessible to users, away from public access areas, and never positioned where they could be knocked over or accessed by children.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Should needles be recapped before disposal?
                </h3>
                <p className="text-gray-600">
                  No, needles should never be recapped, bent, or broken before disposal. This practice significantly increases the risk of needle-stick injuries. Dispose of sharps immediately after use directly into the sharps bin. If a needle is attached to a syringe, dispose of the entire assembly as one unit without separating or manipulating the needle.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  How often should sharps bins be collected?
                </h3>
                <p className="text-gray-600">
                  Collection frequency depends on your usage volumes. Small clinics may need monthly collections, while busy practices might require weekly services. Bins must be collected before they reach the fill line. We can assess your needs and recommend an appropriate collection schedule, with the flexibility to increase frequency during busy periods or add emergency collections when needed.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  What happens if I have a needle-stick injury?
                </h3>
                <p className="text-gray-600">
                  If a needle-stick injury occurs, wash the wound immediately with soap and water, encourage bleeding by gentle squeezing, cover with a waterproof dressing, and report to your line manager or occupational health immediately. Seek medical attention within one hour. Your employer should have a needle-stick injury policy and post-exposure procedures. Proper sharps disposal significantly reduces these incidents.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Can patients dispose of home sharps through your service?
                </h3>
                <p className="text-gray-600">
                  Our service is designed for healthcare facilities and businesses. Individual patients should use local authority community sharps disposal schemes or pharmacy take-back programs. However, GP surgeries and healthcare facilities can accept patient sharps for disposal through their clinical waste service. Contact your local council or pharmacy for household sharps disposal options.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-red-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Get Free Sharps Bins and Professional Disposal
          </h2>
          <p className="text-xl opacity-95 mb-8 max-w-2xl mx-auto">
            Request your free quote for sharps waste collection with compliant puncture-proof containers and licensed incineration
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to="/quote"
              className="bg-white text-red-600 px-8 py-4 rounded-full font-semibold hover:bg-gray-50 transition-colors text-lg"
            >
              Request Free Quote
            </Link>
            <a
              href="tel:+441322879713"
              className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold hover:bg-white hover:text-red-600 transition-colors text-lg"
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
