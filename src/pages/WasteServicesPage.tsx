import Header from '../components/Header';
import Footer from '../components/Footer';
import Testimonials from '../components/Testimonials';
import SEO from '../components/SEO';

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
    '@type': 'Country',
    name: 'United Kingdom'
  },
  description: 'Professional disposal of infectious clinical waste, sharps, pharmaceutical waste, anatomical waste, cytotoxic waste and dental waste.'
};

export default function WasteServicesPage() {

  const wasteTypes = [
    {
      title: 'Infectious Waste',
      icon: '🦠',
      color: 'yellow',
      description: 'Safe disposal of infectious clinical waste requiring specialist treatment and incineration.',
      whatIs: 'Infectious waste, also known as clinical waste, consists of materials contaminated with bodily fluids or potentially infectious substances that pose a risk to public health.',
      examples: [
        'Soiled dressings and swabs',
        'Contaminated PPE (gloves, masks, gowns)',
        'Used diagnostic test kits',
        'Laboratory cultures and specimens',
        'Pathological waste',
        'Contaminated medical equipment'
      ],
      containerColor: 'Yellow or Orange bags/bins',
      disposal: 'All infectious waste is disposed of via high-temperature incineration at licensed facilities, ensuring complete destruction of pathogens and compliance with regulations.'
    },
    {
      title: 'Sharps Waste',
      icon: '💉',
      color: 'yellow',
      description: 'Secure disposal of needles, syringes, and sharp medical instruments.',
      whatIs: 'Sharps waste includes any medical device or object that can puncture or lacerate skin, posing risks of injury and infection transmission.',
      examples: [
        'Hypodermic needles and syringes',
        'Scalpel blades and surgical instruments',
        'Broken glass vials and ampoules',
        'Lancets and needles',
        'Suture needles',
        'Dental needles and broken instruments'
      ],
      containerColor: 'Yellow rigid sharps containers (various sizes from 1L to 10L)',
      disposal: 'Sharps are collected in puncture-proof containers and disposed of via incineration. Containers are never opened or sorted after sealing.'
    },
    {
      title: 'Pharmaceutical Waste',
      icon: '💊',
      color: 'blue',
      description: 'Controlled disposal of expired or unwanted medications and pharmaceuticals.',
      whatIs: 'Pharmaceutical waste consists of expired, unused, or contaminated medications that must be disposed of safely to prevent environmental contamination and unauthorized use.',
      examples: [
        'Expired prescription medications',
        'Unused or returned medications',
        'Contaminated pharmaceuticals',
        'Empty medicine bottles and containers',
        'Vaccine waste',
        'Controlled drugs (requiring special documentation)'
      ],
      containerColor: 'Blue-lidded containers or designated pharmaceutical waste bins',
      disposal: 'Pharmaceuticals are disposed of via incineration at high temperatures. Controlled drugs require additional documentation and witness statements.'
    },
    {
      title: 'Anatomical Waste',
      icon: '🧬',
      color: 'yellow',
      description: 'Dignified disposal of human tissue and body parts with full regulatory compliance.',
      whatIs: 'Anatomical waste includes human tissues, organs, and body parts removed during surgery, post-mortem examinations, or other medical procedures.',
      examples: [
        'Surgical tissue and organs',
        'Body parts removed during surgery',
        'Placenta and products of conception',
        'Blood and blood products in large quantities',
        'Pathology specimens',
        'Organs from autopsy'
      ],
      containerColor: 'Yellow bags/containers with red markings for anatomical waste',
      disposal: 'Anatomical waste is disposed of with dignity via incineration at licensed facilities with appropriate religious and cultural sensitivities considered.'
    },
    {
      title: 'Cytotoxic & Cytostatic Waste',
      icon: '⚗️',
      color: 'purple',
      description: 'Specialist handling of chemotherapy and cancer treatment waste.',
      whatIs: 'Cytotoxic waste includes materials contaminated with chemotherapy drugs and other cytostatic agents used in cancer treatment, which are toxic and hazardous.',
      examples: [
        'Contaminated PPE from chemotherapy administration',
        'IV bags and tubing with cytotoxic residues',
        'Empty drug vials and syringes',
        'Contaminated wipes and cleaning materials',
        'Expired cytotoxic medications',
        'Patient waste (first 48 hours after treatment)'
      ],
      containerColor: 'Purple-lidded containers and bags (rigid containers for sharps)',
      disposal: 'Cytotoxic waste requires specialist incineration at very high temperatures to ensure complete destruction of hazardous substances.'
    },
    {
      title: 'Dental Waste',
      icon: '🦷',
      color: 'various',
      description: 'Complete dental waste management including amalgam separation.',
      whatIs: 'Dental practices generate various waste streams requiring proper segregation and disposal, including mercury-containing amalgam which requires special handling.',
      examples: [
        'Amalgam waste (containing mercury)',
        'Used dental cartridges and needles',
        'Contaminated dental instruments',
        'Used PPE and bibs',
        'Cotton wool and tissues',
        'Extracted teeth',
        'X-ray fixer and developer solutions'
      ],
      containerColor: 'Various: Orange/Yellow for infectious, special containers for amalgam, sharps bins for needles',
      disposal: 'Dental waste is segregated by type. Amalgam is collected separately for mercury recovery and recycling. Infectious waste is incinerated, and sharps are destroyed safely.'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Clinical Waste Disposal Services UK | Medical Waste Collection | Sharps Disposal"
        description="Expert clinical waste disposal services - infectious waste, sharps disposal, pharmaceutical waste, cytotoxic waste, dental waste, and anatomical waste. Licensed UK medical waste collection with compliant incineration. Free quote."
        canonical="https://mediwaste.co.uk/waste-services"
        schema={serviceSchema}
      />
      <Header />

      <div className="bg-red-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Clinical Waste Disposal Services - All Healthcare Waste Streams</h1>
          <p className="text-lg opacity-95 max-w-2xl mx-auto">
            Licensed medical waste collection and disposal for infectious waste, sharps, pharmaceuticals, cytotoxic waste, dental waste, and anatomical waste across the UK
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Specialist Waste Disposal Services
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto">
              We provide safe, compliant disposal services for all types of clinical and medical waste. Our experienced team ensures proper segregation, collection, and disposal in accordance with UK regulations.
            </p>
          </div>

          <div className="space-y-12">
            {wasteTypes.map((waste, index) => {
              const isEven = index % 2 === 0;
              return (
                <div
                  key={index}
                  className={`${isEven ? 'bg-white border border-gray-200' : 'bg-red-600'} rounded-lg overflow-hidden hover:shadow-lg transition-shadow`}
                >
                  <div className={`${isEven ? 'bg-gradient-to-r from-gray-50 to-white border-b border-gray-200' : 'bg-red-900/30 border-b border-red-500/30'} px-8 py-6`}>
                    <div className="flex items-center gap-4">
                      <span className="text-5xl">{waste.icon}</span>
                      <div>
                        <h3 className={`text-2xl font-bold ${isEven ? 'text-gray-900' : 'text-white'}`}>{waste.title}</h3>
                        <p className={`mt-1 ${isEven ? 'text-gray-600' : 'text-red-100'}`}>{waste.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="px-8 py-6 space-y-6">
                    <div>
                      <h4 className={`font-bold mb-2 ${isEven ? 'text-gray-900' : 'text-white'}`}>What is it?</h4>
                      <p className={isEven ? 'text-gray-600' : 'text-red-50'}>{waste.whatIs}</p>
                    </div>

                    <div>
                      <h4 className={`font-bold mb-3 ${isEven ? 'text-gray-900' : 'text-white'}`}>Examples Include:</h4>
                      <ul className="grid md:grid-cols-2 gap-2">
                        {waste.examples.map((example, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className={`mt-1 ${isEven ? 'text-orange-600' : 'text-red-200'}`}>•</span>
                            <span className={`text-sm ${isEven ? 'text-gray-600' : 'text-red-50'}`}>{example}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className={`${isEven ? 'bg-gray-50' : 'bg-red-900/40'} p-4 rounded-lg`}>
                        <h4 className={`font-bold mb-2 ${isEven ? 'text-gray-900' : 'text-white'}`}>Container Color Code</h4>
                        <p className={`text-sm ${isEven ? 'text-gray-600' : 'text-red-50'}`}>{waste.containerColor}</p>
                      </div>
                      <div className={`${isEven ? 'bg-gray-50' : 'bg-red-900/40'} p-4 rounded-lg`}>
                        <h4 className={`font-bold mb-2 ${isEven ? 'text-gray-900' : 'text-white'}`}>Disposal Method</h4>
                        <p className={`text-sm ${isEven ? 'text-gray-600' : 'text-red-50'}`}>{waste.disposal}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-16 bg-gray-50 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Understanding Waste Classification
            </h2>
            <div className="space-y-4 text-gray-600">
              <p>
                Proper waste classification is essential for safe handling and disposal. UK regulations require healthcare facilities to segregate waste at the point of generation using color-coded containers:
              </p>
              <ul className="space-y-2 ml-6">
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-orange-600">•</span>
                  <span><strong>Yellow:</strong> Infectious waste for incineration (most common)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-orange-600">•</span>
                  <span><strong>Orange:</strong> Infectious waste for alternative treatment</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-orange-600">•</span>
                  <span><strong>Purple:</strong> Cytotoxic and cytostatic waste</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-orange-600">•</span>
                  <span><strong>Yellow/Black:</strong> Offensive/hygiene waste (non-infectious)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-orange-600">•</span>
                  <span><strong>Blue:</strong> Pharmaceutical waste</span>
                </li>
              </ul>
              <p className="mt-4">
                Our team can provide guidance and training to ensure your staff properly classify and segregate waste according to regulations.
              </p>
            </div>
          </div>

          <div className="bg-red-600 text-white rounded-lg p-8 text-center mt-12">
            <h2 className="text-3xl font-bold mb-4">Need Help With Waste Disposal?</h2>
            <p className="text-lg opacity-95 mb-6">
              Contact us for a free assessment and personalized quote for your facility
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
      </div>

      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Frequently Asked Questions About Medical Waste Services
            </h2>
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  What types of clinical waste do you collect?
                </h3>
                <p className="text-gray-600">
                  We collect all types of clinical and medical waste including infectious waste, sharps waste, pharmaceutical waste, anatomical waste, cytotoxic and cytostatic waste, dental waste including amalgam, and laboratory waste. Each waste stream is handled according to UK regulations with appropriate color-coded containers.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  How are sharps disposed of safely?
                </h3>
                <p className="text-gray-600">
                  Sharps waste including needles and syringes are collected in puncture-proof yellow sharps containers ranging from 1L to 10L capacity. Containers are sealed and never reopened. All sharps are disposed of via high-temperature incineration at licensed facilities, ensuring complete destruction and compliance with HTM 07-01 guidelines.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  What colour bins should I use for different waste types?
                </h3>
                <p className="text-gray-600">
                  Yellow bags/bins are for infectious waste requiring incineration, orange for infectious waste for alternative treatment, purple for cytotoxic waste, blue for pharmaceutical waste, yellow/black for offensive hygiene waste, and special containers for dental amalgam. We provide full training on correct segregation and color coding.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  How is pharmaceutical waste disposed of?
                </h3>
                <p className="text-gray-600">
                  Pharmaceutical waste including expired medicines and controlled drugs are collected in blue-lidded containers and disposed of via high-temperature incineration. Controlled drugs require additional documentation including witness statements. We provide full consignment notes and certificates of destruction for audit compliance.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  What is cytotoxic waste and how is it handled?
                </h3>
                <p className="text-gray-600">
                  Cytotoxic waste includes materials contaminated with chemotherapy drugs used in cancer treatment. This includes PPE, IV bags, tubing, drug vials, and patient waste within 48 hours of treatment. It requires specialist handling in purple-lidded containers and disposal via very high temperature incineration to ensure complete destruction of hazardous substances.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Do you provide dental waste disposal services?
                </h3>
                <p className="text-gray-600">
                  Yes, we provide comprehensive dental waste management including amalgam separation and disposal, sharps disposal for dental needles, infectious waste disposal for contaminated materials, and disposal of extracted teeth. Amalgam waste containing mercury requires special handling and is collected separately for mercury recovery and environmental protection.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  What happens to anatomical waste?
                </h3>
                <p className="text-gray-600">
                  Anatomical waste including human tissue, organs, and body parts is disposed of with dignity via incineration at licensed facilities. We use yellow containers with red markings and handle all anatomical waste with appropriate religious and cultural sensitivities. Full documentation and certificates are provided for complete audit trails.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  How do I know which waste category my materials belong to?
                </h3>
                <p className="text-gray-600">
                  We provide comprehensive staff training on waste classification and segregation according to UK regulations. Our team can conduct on-site assessments to help you establish proper waste streams, implement color-coded systems, and ensure your staff understand classification requirements under the Hazardous Waste Regulations 2005.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-red-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Get Expert Clinical Waste Disposal Today
          </h2>
          <p className="text-xl opacity-95 mb-8 max-w-2xl mx-auto">
            Ensure full compliance with UK waste regulations. Request your free quote for professional medical waste collection and disposal services.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="/quote"
              className="bg-white text-red-600 px-8 py-4 rounded-full font-semibold hover:bg-gray-50 transition-colors text-lg"
            >
              Request Free Quote
            </a>
            <a
              href="tel:+441322879713"
              className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold hover:bg-white hover:text-red-600 transition-colors text-lg"
            >
              Call: 01322 879 713
            </a>
          </div>
        </div>
      </section>

      <Testimonials />

      <Footer />
    </div>
  );
}
