import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

export default function PharmaceuticalWastePage() {
  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Pharmaceutical Waste Disposal UK | Medicine & Drug Disposal Service"
        description="Licensed pharmaceutical waste disposal for expired medicines, controlled drugs and pharmaceutical waste. Blue bin collection with compliant incineration. Free quote."
        canonical="https://mediwaste.co.uk/waste-services/pharmaceutical-waste"
        schema={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: 'Pharmaceutical Waste Disposal',
          provider: { '@type': 'Organization', name: 'MediWaste', url: 'https://mediwaste.co.uk' },
          serviceType: 'Pharmaceutical Waste Collection and Disposal',
          areaServed: { '@type': 'Country', name: 'United Kingdom' },
          description: 'Licensed collection and incineration of expired medicines, controlled drugs and pharmaceutical waste.'
        }}
      />
      <Header />

      <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-full mb-6">
              <span className="text-5xl">💊</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Pharmaceutical Waste Disposal Services
            </h1>
            <p className="text-xl opacity-95 max-w-3xl mx-auto">
              Safe disposal of pharmaceutical waste including expired medicines, controlled drugs, and unwanted medications with compliant incineration
            </p>
          </div>
        </div>
      </div>

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 mb-16">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  What is Pharmaceutical Waste?
                </h2>
                <p className="text-gray-600 mb-4">
                  Pharmaceutical waste includes expired, unused, spilt, or contaminated medicines and drugs. This covers prescription medications, over-the-counter medicines, vaccines, sera, controlled drugs requiring destruction, and pharmaceutical products no longer needed.
                </p>
                <p className="text-gray-600 mb-4">
                  All pharmaceutical waste must be disposed of via high-temperature incineration to ensure complete destruction and prevent environmental contamination or drug misuse.
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Examples Include</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                    <span className="text-gray-700">Expired prescription medications</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                    <span className="text-gray-700">Controlled drugs (Schedule 2-5)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                    <span className="text-gray-700">Vaccines and immunological products</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                    <span className="text-gray-700">Patient-returned medicines</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                    <span className="text-gray-700">Contaminated medicine bottles and vials</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-blue-900 text-white rounded-2xl p-8 md:p-12 mb-16">
              <h2 className="text-3xl font-bold mb-6 text-center">Controlled Drug Disposal</h2>
              <p className="text-center text-gray-200 mb-8 max-w-2xl mx-auto">
                We provide specialist controlled drugs disposal with witnessed destruction and full documentation for Schedule 2-5 substances
              </p>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white/10 rounded-lg p-6">
                  <h3 className="font-bold text-xl mb-3">Schedule 2 & 3</h3>
                  <p className="text-sm text-gray-200">
                    Requires witnessed destruction with CD register entries and destruction records
                  </p>
                </div>
                <div className="bg-white/10 rounded-lg p-6">
                  <h3 className="font-bold text-xl mb-3">Schedule 4 & 5</h3>
                  <p className="text-sm text-gray-200">
                    Standard pharmaceutical waste procedures with full documentation
                  </p>
                </div>
                <div className="bg-white/10 rounded-lg p-6">
                  <h3 className="font-bold text-xl mb-3">Full Audit Trail</h3>
                  <p className="text-sm text-gray-200">
                    Certificates of destruction provided for regulatory compliance
                  </p>
                </div>
              </div>
            </div>

            <section className="mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">FAQs - Pharmaceutical Waste</h2>
              <div className="space-y-6 max-w-4xl mx-auto">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    What color container is used for pharmaceutical waste?
                  </h3>
                  <p className="text-gray-600">
                    Pharmaceutical waste is disposed of in blue-lidded containers or blue bags. These are specifically designated for medicines and pharmaceutical products requiring incineration. Never mix pharmaceutical waste with other clinical waste streams.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    How should controlled drugs be disposed of?
                  </h3>
                  <p className="text-gray-600">
                    Schedule 2 and 3 controlled drugs must be denatured and destroyed in the presence of an authorized witness. The destruction must be recorded in the controlled drugs register. We provide witnessed destruction services with all necessary documentation and certificates compliant with the Misuse of Drugs Act.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Can patient-returned medicines be disposed of?
                  </h3>
                  <p className="text-gray-600">
                    Yes, pharmacies and GP surgeries can accept patient-returned medicines for disposal. These should be placed in pharmaceutical waste containers and disposed of via incineration. Controlled drugs returned by patients require special handling and documentation according to regulations.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    What documentation is required?
                  </h3>
                  <p className="text-gray-600">
                    Pharmaceutical waste requires consignment notes for hazardous waste tracking and certificates of destruction following incineration. For controlled drugs, additional documentation includes CD register entries, witness statements, and specific destruction certificates meeting Home Office requirements.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    How often should pharmaceutical waste be collected?
                  </h3>
                  <p className="text-gray-600">
                    Collection frequency depends on your waste volumes. Pharmacies typically require monthly collections, while GP surgeries may need quarterly services. Controlled drugs can be collected on-demand when destruction is required. We provide flexible scheduling to match your needs.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className="py-16 bg-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Need Pharmaceutical Waste Disposal?
          </h2>
          <p className="text-xl opacity-95 mb-8 max-w-2xl mx-auto">
            Get compliant disposal of medicines and controlled drugs with full documentation
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/quote" className="bg-white text-blue-600 px-8 py-4 rounded-full font-semibold hover:bg-gray-50 transition-colors text-lg">
              Request Free Quote
            </Link>
            <a href="tel:+441322879713" className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold hover:bg-white hover:text-blue-600 transition-colors text-lg">
              Call: 01322 879 713
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
