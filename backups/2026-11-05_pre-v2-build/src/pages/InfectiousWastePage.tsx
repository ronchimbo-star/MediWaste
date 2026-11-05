import { Link } from 'react-router-dom';
import { Check, AlertCircle, Truck, FileText } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

const serviceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Infectious Clinical Waste Disposal',
  provider: {
    '@type': 'Organization',
    name: 'MediWaste'
  },
  serviceType: 'Infectious Waste Collection and Disposal',
  areaServed: {
    '@type': 'Country',
    name: 'United Kingdom'
  },
  description: 'Professional infectious clinical waste collection and disposal services with licensed incineration and full compliance documentation.'
};

export default function InfectiousWastePage() {
  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Infectious Clinical Waste Disposal UK | Yellow Bag Waste Collection Service"
        description="Licensed infectious clinical waste disposal. Collection of contaminated dressings, swabs, PPE and infectious materials. Yellow bag waste with compliant incineration."
        canonical="https://mediwaste.co.uk/waste-services/infectious-waste"
        schema={serviceSchema}
      />
      <Header />

      <div className="bg-gradient-to-br from-red-600 to-red-700 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-full mb-6">
              <span className="text-5xl">🦠</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Infectious Clinical Waste Disposal Services
            </h1>
            <p className="text-xl opacity-95 max-w-3xl mx-auto">
              Professional collection and disposal of infectious clinical waste including contaminated dressings, swabs, PPE, and infectious materials requiring specialist incineration
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
                  What is Infectious Clinical Waste?
                </h2>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  Infectious clinical waste (also known as Category A or Category B infectious waste) contains materials that may cause infection in humans or animals. This includes waste contaminated with blood and bodily fluids, used dressings, swabs, PPE worn during patient care, laboratory cultures, and any material from patients with infectious diseases.
                </p>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  Under UK regulations, infectious waste must be segregated in yellow bags or yellow-lidded rigid containers marked with the biohazard symbol. It requires disposal via high-temperature incineration at licensed facilities to ensure complete destruction of pathogens.
                </p>
                <div className="bg-red-50 border-l-4 border-red-600 p-6 rounded">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold text-gray-900 mb-2">Important Classification</h3>
                      <p className="text-sm text-gray-700">
                        Waste must be assessed as infectious if it contains or is contaminated with substances from Groups 2, 3, or 4 of the Hazard Group Classification, or if it comes from a patient with a known or suspected infectious disease.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <div className="bg-gray-50 rounded-lg p-8 border-2 border-gray-200">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Examples of Infectious Waste</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <span className="text-gray-700">Wound dressings contaminated with blood or bodily fluids</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <span className="text-gray-700">Swabs, gauze, and bandages from patient care</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <span className="text-gray-700">PPE including gloves, masks, and aprons used in clinical care</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <span className="text-gray-700">Laboratory cultures and microbiological specimens</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <span className="text-gray-700">Pathology samples and diagnostic materials</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <span className="text-gray-700">Dialysis waste and blood-contaminated materials</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <span className="text-gray-700">Incontinence pads from patients with infectious diseases</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                      <span className="text-gray-700">Disposable medical equipment contaminated during use</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 text-white rounded-2xl p-8 md:p-12 mb-16">
              <h2 className="text-3xl font-bold mb-8 text-center">Our Infectious Waste Service</h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-full mb-4">
                    <Truck className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Regular Collections</h3>
                  <p className="text-gray-300 text-sm">
                    Scheduled collections at frequencies to suit your waste volumes - weekly, fortnightly, or monthly
                  </p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-full mb-4">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Full Documentation</h3>
                  <p className="text-gray-300 text-sm">
                    Consignment notes, waste transfer notes, and certificates of destruction for complete audit trails
                  </p>
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-full mb-4">
                    <Check className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Compliant Disposal</h3>
                  <p className="text-gray-300 text-sm">
                    High-temperature incineration at licensed facilities ensuring complete pathogen destruction
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Infectious Waste Container Options</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Yellow Bag Waste</h3>
                  <p className="text-gray-700 mb-4">
                    UN-approved yellow clinical waste bags for infectious waste requiring incineration. Available in multiple sizes from 5L to 90L capacity.
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Small bags (5-30L) for GP surgeries and clinics</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Medium bags (45-60L) for nursing homes</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Large bags (75-90L) for hospitals</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Yellow-Lidded Bins</h3>
                  <p className="text-gray-700 mb-4">
                    Rigid yellow-lidded containers for larger volumes or specific waste types. Foot-operated for hands-free use.
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>50L and 70L foot-operated bins</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Wheeled 240L bins for high-volume facilities</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>Lockable for secure storage</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-teal-50 rounded-lg p-8 mb-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Regulatory Compliance</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">UK Regulations We Follow</h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                      <span>Hazardous Waste (England and Wales) Regulations 2005</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                      <span>Controlled Waste Regulations 2012</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                      <span>Environmental Protection Act 1990</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                      <span>Health and Safety at Work Act 1974</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">Best Practice Guidance</h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                      <span>HTM 07-01: Safe management of healthcare waste</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                      <span>Safe Management of Healthcare Waste (Department of Health)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                      <span>Environment Agency guidance on clinical waste</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                      <span>CQC compliance requirements</span>
                    </li>
                  </ul>
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
              Infectious Waste FAQs
            </h2>
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  What makes clinical waste infectious?
                </h3>
                <p className="text-gray-600">
                  Clinical waste is classified as infectious if it contains viable microorganisms or their toxins that can cause disease in humans or animals. This includes waste from patients with known infections, laboratory cultures, blood-contaminated materials, and any waste that poses a risk of infection. The classification follows the Advisory Committee on Dangerous Pathogens (ACDP) hazard group system.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  How should infectious waste be stored before collection?
                </h3>
                <p className="text-gray-600">
                  Infectious waste must be stored in yellow bags or yellow-lidded containers marked with the biohazard symbol. Storage areas should be secure, away from public access, protected from weather and pests, well-ventilated, and clearly marked. Waste should not be stored for more than 72 hours in summer or 7 days in winter before collection. Storage temperature should ideally be below 10°C.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Can infectious waste be autoclaved instead of incinerated?
                </h3>
                <p className="text-gray-600">
                  Some infectious waste can be treated via alternative treatment processes like autoclaving (high-pressure steam sterilization) before disposal. This is indicated by orange bags. However, certain high-risk infectious waste and anatomical waste must be incinerated. We can advise on the most appropriate disposal method based on your specific waste types and help implement orange bag waste streams where suitable.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  What is the difference between yellow and orange bag waste?
                </h3>
                <p className="text-gray-600">
                  Yellow bags are for infectious waste requiring incineration, while orange bags are for infectious waste suitable for alternative treatment methods like autoclaving. Orange bag waste is typically less hazardous and doesn't contain anatomical waste, sharp objects, or pharmaceuticals. Using orange bags where appropriate can reduce disposal costs while maintaining full compliance.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Do you provide staff training on infectious waste segregation?
                </h3>
                <p className="text-gray-600">
                  Yes, we provide comprehensive staff training on proper infectious waste identification, segregation, and handling. Training covers the difference between waste streams, correct use of color-coded containers, health and safety requirements, and regulatory compliance. We offer on-site training sessions, online modules, and written procedures with visual guides for your facility.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  What documentation is required for infectious waste disposal?
                </h3>
                <p className="text-gray-600">
                  Infectious waste classified as hazardous requires consignment notes for each collection. These three-part documents track the waste from producer to disposal, including waste description, codes, quantity, and all parties involved. We also provide waste transfer notes and certificates of destruction following incineration. All documentation is retained for the legally required period and made available for inspections.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  How much does infectious waste disposal cost?
                </h3>
                <p className="text-gray-600">
                  Infectious waste disposal costs depend on your waste volume, collection frequency, container types, and location. Typical costs range from £50-£150 for small facilities per collection. We offer transparent pricing with no hidden fees and can provide volume discounts for larger producers. Contact us for a free personalized quote based on your specific requirements.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Can you provide emergency infectious waste collections?
                </h3>
                <p className="text-gray-600">
                  Yes, we offer 24/7 emergency collection services for urgent infectious waste disposal needs. If you have overflowing containers, unexpected waste volumes, outbreak situations, or any urgent compliance requirements, call us immediately. We can typically arrange same-day or next-day emergency collections depending on your location and specific circumstances.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-red-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Need Infectious Waste Collection Services?
          </h2>
          <p className="text-xl opacity-95 mb-8 max-w-2xl mx-auto">
            Get a free quote for compliant infectious clinical waste disposal with licensed collection and incineration
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
