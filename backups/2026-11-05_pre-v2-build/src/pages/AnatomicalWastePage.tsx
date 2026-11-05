import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

export default function AnatomicalWastePage() {
  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Anatomical Waste Disposal UK | Human Tissue & Pathology Waste Collection"
        description="Licensed anatomical waste disposal. Dignified collection and incineration of human tissue, organs and pathology waste. Fully compliant. Free quote."
        canonical="https://mediwaste.co.uk/waste-services/anatomical-waste"
        schema={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: 'Anatomical Waste Disposal',
          provider: { '@type': 'Organization', name: 'MediWaste', url: 'https://mediwaste.co.uk' },
          serviceType: 'Anatomical Waste Collection and Disposal',
          areaServed: { '@type': 'Country', name: 'United Kingdom' },
          description: 'Dignified collection and incineration of human tissue, organs and pathology waste with full regulatory compliance.'
        }}
      />
      <Header />

      <div className="bg-gradient-to-br from-red-700 to-red-800 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-full mb-6">
              <span className="text-5xl">🧬</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Anatomical Waste Disposal Services
            </h1>
            <p className="text-xl opacity-95 max-w-3xl mx-auto">
              Dignified disposal of anatomical waste including human tissue and body parts with full regulatory compliance
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
                  What is Anatomical Waste?
                </h2>
                <p className="text-gray-600 mb-4">
                  Anatomical waste consists of recognizable human tissue, organs, body parts, and products of conception from surgical procedures, pathology, and mortuary services. This category requires particularly sensitive handling with respect for human dignity.
                </p>
                <p className="text-gray-600 mb-4">
                  All anatomical waste must be disposed of via incineration at licensed facilities with appropriate religious and cultural considerations. We handle all anatomical waste with the utmost care and respect.
                </p>
              </div>
              <div className="bg-red-50 rounded-lg p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Examples Include</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                    <span className="text-gray-700">Human tissue from surgical procedures</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                    <span className="text-gray-700">Organs and body parts</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                    <span className="text-gray-700">Products of conception and placental tissue</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                    <span className="text-gray-700">Pathology specimens</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                    <span className="text-gray-700">Amputated limbs</span>
                  </li>
                </ul>
              </div>
            </div>

            <section className="mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">FAQs - Anatomical Waste</h2>
              <div className="space-y-6 max-w-4xl mx-auto">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    What containers are used for anatomical waste?
                  </h3>
                  <p className="text-gray-600">
                    Anatomical waste is disposed of in yellow containers with red markings or red-lidded containers. These distinguish anatomical waste from other clinical waste streams and ensure appropriate handling. Containers must be rigid, leak-proof, and securely sealed before collection.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    How is anatomical waste disposed of?
                  </h3>
                  <p className="text-gray-600">
                    All anatomical waste must be disposed of via incineration at facilities holding appropriate permits. The process is carried out with dignity and respect, with consideration for religious and cultural sensitivities. We provide certificates of destruction for audit purposes and patient records.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Are there special storage requirements?
                  </h3>
                  <p className="text-gray-600">
                    Anatomical waste should be stored in secure, refrigerated conditions where possible to prevent decomposition. Storage areas must be locked, away from public access, and clearly marked. Waste should be collected promptly, typically within 72 hours in summer or 7 days in winter.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    What about religious considerations?
                  </h3>
                  <p className="text-gray-600">
                    We handle anatomical waste with respect for all religious and cultural beliefs. Different faiths have specific requirements for handling human tissue, and we ensure our processes accommodate these sensitivities. Families may request information about disposal procedures, which we can provide.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    Is anatomical waste subject to the Human Tissue Act?
                  </h3>
                  <p className="text-gray-600">
                    Yes, handling of anatomical waste falls under the Human Tissue Act 2004 for England and Wales. Facilities must comply with HTA requirements including appropriate consent, tracking, and disposal procedures. We work with HTA-licensed facilities to ensure full regulatory compliance.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className="py-16 bg-red-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Dignified Anatomical Waste Disposal
          </h2>
          <p className="text-xl opacity-95 mb-8 max-w-2xl mx-auto">
            Respectful handling and disposal of human tissue with full regulatory compliance
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/quote" className="bg-white text-red-600 px-8 py-4 rounded-full font-semibold hover:bg-gray-50 transition-colors text-lg">
              Request Free Quote
            </Link>
            <a href="tel:+441322879713" className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold hover:bg-white hover:text-red-600 transition-colors text-lg">
              Call: 01322 879 713
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
