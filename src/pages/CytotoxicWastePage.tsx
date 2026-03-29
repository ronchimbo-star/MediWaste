import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

export default function CytotoxicWastePage() {
  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Cytotoxic Waste Disposal UK | Chemotherapy Waste Collection Service"
        description="Expert cytotoxic and cytostatic waste disposal. Licensed collection of chemotherapy waste, contaminated PPE, and cancer treatment materials. Purple bin disposal. Free quote."
        canonical="https://mediwaste.co.uk/waste-services/cytotoxic-waste"
      />
      <Header />

      <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-full mb-6">
              <span className="text-5xl">⚗️</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Cytotoxic & Cytostatic Waste Disposal Services
            </h1>
            <p className="text-xl opacity-95 max-w-3xl mx-auto">
              Specialist handling and disposal of cytotoxic waste from cancer treatments with very high temperature incineration
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
                  What is Cytotoxic Waste?
                </h2>
                <p className="text-gray-600 mb-4">
                  Cytotoxic waste contains materials contaminated with chemotherapy drugs and other cytotoxic or cytostatic medicines used in cancer treatment. These substances are toxic to living cells and require specialist handling and disposal to protect healthcare workers and the environment.
                </p>
                <p className="text-gray-600 mb-4">
                  All cytotoxic waste must be segregated in purple-lidded containers and disposed of via very high temperature incineration at specialist licensed facilities.
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Examples Include</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                    <span className="text-gray-700">PPE worn during chemotherapy administration</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                    <span className="text-gray-700">IV bags, tubing, and syringes from chemo</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                    <span className="text-gray-700">Drug vials and ampoules</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                    <span className="text-gray-700">Patient waste within 48hrs of treatment</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                    <span className="text-gray-700">Contaminated sharps from cytotoxic drugs</span>
                  </li>
                </ul>
              </div>
            </div>

            <section className="mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">FAQs - Cytotoxic Waste</h2>
              <div className="space-y-6 max-w-4xl mx-auto">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    What makes cytotoxic waste different?
                  </h3>
                  <p className="text-gray-600">
                    Cytotoxic waste is hazardous due to contamination with chemotherapy drugs that are toxic to cells. It requires purple-lidded containers and very high temperature incineration (typically above 1100°C) to ensure complete destruction of hazardous substances. It cannot be treated via alternative methods like autoclaving.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    How long is patient waste considered cytotoxic?
                  </h3>
                  <p className="text-gray-600">
                    Patient body fluids and waste (including urine, feces, and vomit) are considered cytotoxic for 48 hours following chemotherapy administration. After 48 hours, patient waste can be disposed of as standard infectious waste in yellow bags. This applies to most cytotoxic drugs unless specified otherwise.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    What PPE is required when handling cytotoxic waste?
                  </h3>
                  <p className="text-gray-600">
                    Staff handling cytotoxic waste should wear appropriate PPE including gloves, aprons or gowns, and eye protection if splashing is possible. Follow your facility's cytotoxic handling procedures. All contaminated PPE must then be disposed of in purple cytotoxic waste containers.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Can cytotoxic sharps go in yellow sharps bins?
                  </h3>
                  <p className="text-gray-600">
                    No, sharps contaminated with cytotoxic drugs must be disposed of in purple-lidded sharps containers specifically designated for cytotoxic waste. Never mix cytotoxic sharps with standard sharps waste. Purple sharps bins are incinerated at higher temperatures suitable for cytotoxic destruction.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    How often should cytotoxic waste be collected?
                  </h3>
                  <p className="text-gray-600">
                    Collection frequency depends on your waste volumes. Oncology departments typically require weekly collections, while smaller facilities administering occasional chemotherapy may need monthly services. Cytotoxic waste should be stored securely and collected promptly to minimize storage time of hazardous materials.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className="py-16 bg-purple-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Need Cytotoxic Waste Disposal?
          </h2>
          <p className="text-xl opacity-95 mb-8 max-w-2xl mx-auto">
            Specialist disposal of chemotherapy waste with very high temperature incineration
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/quote" className="bg-white text-purple-600 px-8 py-4 rounded-full font-semibold hover:bg-gray-50 transition-colors text-lg">
              Request Free Quote
            </Link>
            <a href="tel:+441322879713" className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold hover:bg-white hover:text-purple-600 transition-colors text-lg">
              Call: 01322 879 713
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
