import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

export default function DentalWastePage() {
  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Dental Waste Disposal UK | Amalgam Waste & Dental Clinical Waste Collection"
        description="Licensed dental waste disposal including amalgam, sharps and infectious dental materials. Mercury waste collection with compliant incineration. Free quote."
        canonical="https://mediwaste.co.uk/waste-services/dental-waste"
        schema={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: 'Dental Waste Disposal',
          provider: { '@type': 'Organization', name: 'MediWaste', url: 'https://mediwaste.co.uk' },
          serviceType: 'Dental Waste Collection and Disposal',
          areaServed: { '@type': 'Country', name: 'United Kingdom' },
          description: 'Complete dental waste management including amalgam separation, sharps disposal and dental clinical waste collection.'
        }}
      />
      <Header />

      <div className="bg-gradient-to-br from-teal-600 to-teal-700 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-full mb-6">
              <span className="text-5xl">🦷</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Dental Waste Disposal Services
            </h1>
            <p className="text-xl opacity-95 max-w-3xl mx-auto">
              Complete dental waste management including amalgam separation, sharps disposal, and dental clinical waste collection
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
                  Dental Waste Management
                </h2>
                <p className="text-gray-600 mb-4">
                  Dental practices generate several types of waste requiring specialist disposal including amalgam containing mercury, sharps (needles and blades), infectious waste contaminated with blood and saliva, extracted teeth, and general dental clinical waste.
                </p>
                <p className="text-gray-600 mb-4">
                  All dental waste must be properly segregated and disposed of according to UK regulations to protect staff, patients, and the environment.
                </p>
              </div>
              <div className="bg-teal-50 rounded-lg p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Dental Waste Types</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                    <span className="text-gray-700">Amalgam waste containing mercury</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                    <span className="text-gray-700">Dental sharps (needles, blades, burs)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                    <span className="text-gray-700">Extracted teeth with amalgam fillings</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                    <span className="text-gray-700">Infectious waste (swabs, gloves, masks)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                    <span className="text-gray-700">Gypsum and impression materials</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-orange-50 border-l-4 border-orange-500 p-8 rounded mb-16">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Amalgam Waste - Special Requirements</h3>
              <p className="text-gray-700 mb-4">
                Dental amalgam contains approximately 50% mercury and is classified as hazardous waste. It must be collected separately in designated amalgam waste containers and sent for mercury recovery to prevent environmental contamination.
              </p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span>Amalgam separators must be fitted to dental units</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span>Amalgam waste stored in rigid sealed containers</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span>Hazardous waste consignment notes required</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                  <span>Mercury recovered and recycled where possible</span>
                </li>
              </ul>
            </div>

            <section className="mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">FAQs - Dental Waste</h2>
              <div className="space-y-6 max-w-4xl mx-auto">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Do I need an amalgam separator?
                  </h3>
                  <p className="text-gray-600">
                    Yes, all dental practices in England must have amalgam separators fitted to dental chairs where amalgam is placed or removed. This is a legal requirement under the Hazardous Waste Regulations and EU Mercury Regulation. Separators capture amalgam particles preventing them entering wastewater.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    How should extracted teeth be disposed of?
                  </h3>
                  <p className="text-gray-600">
                    Extracted teeth with amalgam fillings must be disposed of as amalgam waste due to mercury content. Teeth without amalgam can be disposed of in yellow infectious waste bags. Some practices keep extracted teeth in amalgam waste containers as the safest option. Never dispose of teeth in general waste.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    What sharps bins do dental practices need?
                  </h3>
                  <p className="text-gray-600">
                    Dental practices typically use yellow-lidded sharps bins for needles and blades. Small 1L or 3L bins are ideal for placement near dental chairs for immediate disposal. Burs and other small sharps can use the same containers. We provide appropriate sized sharps bins as part of our service.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    How often should dental waste be collected?
                  </h3>
                  <p className="text-gray-600">
                    Most dental practices require monthly collections for infectious waste and sharps. Amalgam waste collection depends on practice size and may be monthly, quarterly, or on-demand. We can assess your needs and provide a suitable collection schedule with flexibility to adjust as required.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Do you provide staff training for dental waste?
                  </h3>
                  <p className="text-gray-600">
                    Yes, we provide comprehensive training on dental waste segregation including identification of different waste streams, proper use of color-coded containers, amalgam handling procedures, and regulatory compliance. Training ensures your team follows best practices and CQC requirements.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    What documentation do you provide?
                  </h3>
                  <p className="text-gray-600">
                    We provide consignment notes for amalgam waste (hazardous waste), waste transfer notes for infectious waste, and certificates of destruction following incineration. All documentation is retained for the required period and available for CQC inspections and environmental audits.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className="py-16 bg-teal-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Complete Dental Waste Management
          </h2>
          <p className="text-xl opacity-95 mb-8 max-w-2xl mx-auto">
            Get compliant disposal of all dental waste streams including amalgam and mercury waste
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/quote" className="bg-white text-teal-600 px-8 py-4 rounded-full font-semibold hover:bg-gray-50 transition-colors text-lg">
              Request Free Quote
            </Link>
            <a href="tel:+441322879713" className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold hover:bg-white hover:text-teal-600 transition-colors text-lg">
              Call: 01322 879 713
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
