import { Shield, FileText, Award, AlertTriangle, CheckCircle, ClipboardList, Scale, BookOpen } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BottomCTA from '../components/BottomCTA';
import SEO from '../components/SEO';

const complianceSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Clinical Waste Compliance | MediWaste',
  description: 'Understand your clinical waste compliance obligations. MediWaste provides waste disposal certificates, hazardous waste consignment notes, and full regulatory support.',
  url: 'https://mediwaste.co.uk/compliance',
  publisher: {
    '@type': 'Organization',
    name: 'MediWaste',
    url: 'https://mediwaste.co.uk',
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is a Hazardous Waste Consignment Note?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A Hazardous Waste Consignment Note is a legal document required under the Hazardous Waste Regulations 2005. It tracks the movement of hazardous clinical waste from your premises through to final disposal, creating a full audit trail. MediWaste provides these automatically with every hazardous waste collection.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is a Medical Waste Disposal Certificate?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A Medical Waste Disposal Certificate issued by MediWaste confirms that your clinical waste has been collected, transported, and disposed of in full compliance with UK environmental regulations. It serves as proof of your Duty of Care obligations under the Environmental Protection Act 1990.',
      },
    },
    {
      '@type': 'Question',
      name: 'How long must I keep clinical waste records?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Under the Hazardous Waste Regulations 2005, you must retain hazardous waste consignment notes for a minimum of 3 years. Standard waste transfer notes must be kept for at least 2 years. MediWaste stores digital copies of all your documents for ongoing access.',
      },
    },
    {
      '@type': 'Question',
      name: 'What happens if I am not compliant with clinical waste regulations?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Non-compliance with clinical waste regulations can result in enforcement action from the Environment Agency, including unlimited fines and, in serious cases, custodial sentences. Healthcare businesses may also face regulatory action from bodies such as the CQC, GDC, or local authority environmental health teams.',
      },
    },
    {
      '@type': 'Question',
      name: 'Are MediWaste registered with the Environment Agency?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. MediWaste holds an upper-tier registered waste carrier licence issued by the Environment Agency. We are audited annually and hold Safe Contractor accreditation and ISO 14001 certification for environmental management.',
      },
    },
  ],
};

export default function ComplianceInfoPage() {
  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Clinical Waste Compliance | Regulations & Certificates | MediWaste"
        description="Understand your Duty of Care obligations for clinical waste. MediWaste provides waste disposal certificates, hazardous waste consignment notes, and ensures full regulatory compliance."
        canonical="https://mediwaste.co.uk/compliance"
        schema={[complianceSchema, faqSchema]}
      />
      <Header />

      {/* Hero */}
      <section className="relative bg-gradient-to-b from-gray-900 to-gray-800 text-white py-20 lg:py-28">
        <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/3786166/pexels-photo-3786166.jpeg?auto=compress&cs=tinysrgb&w=1200')] bg-cover bg-center opacity-10" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={20} className="text-red-400" />
              <span className="text-red-400 font-medium text-sm uppercase tracking-wide">Compliance & Regulations</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
              Clinical Waste Compliance
            </h1>
            <p className="text-lg text-gray-300 leading-relaxed max-w-2xl">
              Every business producing clinical waste has a legal Duty of Care to ensure it is stored, collected, transported, and disposed of safely. MediWaste handles the complexity so you remain fully compliant.
            </p>
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">

            {/* Introduction */}
            <div className="prose prose-lg max-w-none mb-12">
              <p className="text-gray-700 text-lg leading-relaxed">
                Clinical waste compliance is not optional. The Environmental Protection Act 1990, the Hazardous Waste Regulations 2005, and HTM 07-01 set out strict requirements for anyone producing, handling, or disposing of clinical waste in England and Wales. Whether you run a GP surgery, dental practice, beauty salon, tattoo studio, or veterinary clinic, you are legally responsible for your waste from the moment it is produced until it reaches its final disposal point.
              </p>
              <p className="text-gray-700 text-lg leading-relaxed">
                Failure to comply can lead to unlimited fines, criminal prosecution, and enforcement action from the Environment Agency. MediWaste ensures you meet every requirement through proper documentation, licensed collection, and traceable disposal.
              </p>
            </div>

            {/* Why compliance matters */}
            <div className="mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle size={20} className="text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Why Compliance Matters</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-3">Legal Protection</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    The Duty of Care under Section 34 of the Environmental Protection Act 1990 means you are legally responsible for your waste at every stage. A proper paper trail — waste transfer notes, consignment notes, and disposal certificates — is your proof of compliance if the Environment Agency ever inspects you.
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-3">Public Safety</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Clinical waste can carry infectious diseases, sharps injuries, and chemical hazards. Correct segregation, containment, and disposal protects your staff, patients, clients, and the wider community from exposure to dangerous materials.
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-3">Professional Reputation</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Regulatory bodies including the CQC, GDC, and local authorities expect healthcare and beauty businesses to demonstrate proper waste management procedures. Non-compliance can result in warnings, restrictions on practice, and reputational damage.
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-3">Financial Risk</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Prosecutions for waste offences carry unlimited fines in the Crown Court. Even in the Magistrates' Court, fines of up to &pound;50,000 per offence are common. The cost of proper waste management is a fraction of the financial risk of non-compliance.
                  </p>
                </div>
              </div>
            </div>

            {/* Changing regulations */}
            <div className="mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Scale size={20} className="text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Ever-Changing Regulations</h2>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-6">
                <p className="text-blue-900 text-sm leading-relaxed">
                  Clinical waste regulations are not static. The Environment Agency regularly updates guidance, classification codes, and enforcement priorities. Recent changes include updated EWC codes, stricter enforcement of pre-acceptance procedures, and increased scrutiny of healthcare waste producers.
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <BookOpen size={14} className="text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Environmental Protection Act 1990</h3>
                    <p className="text-gray-600 text-sm">Establishes the Duty of Care for all waste producers. You must ensure waste is handled only by authorised persons and described accurately on transfer documentation.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <BookOpen size={14} className="text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Hazardous Waste Regulations 2005</h3>
                    <p className="text-gray-600 text-sm">Requires consignment notes for all hazardous waste movements. Premises producing more than 500kg of hazardous waste per year must register with the Environment Agency.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <BookOpen size={14} className="text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">HTM 07-01 (Safe Management of Healthcare Waste)</h3>
                    <p className="text-gray-600 text-sm">The Department of Health's guidance on waste segregation, colour-coding, and handling procedures. Applies to all NHS and private healthcare providers.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <BookOpen size={14} className="text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Controlled Waste Regulations 2012</h3>
                    <p className="text-gray-600 text-sm">Classifies waste types and determines how they must be handled. Clinical waste from non-NHS sources falls under specific category codes that dictate disposal routes.</p>
                  </div>
                </div>
              </div>
              <p className="text-gray-600 mt-6 text-sm leading-relaxed">
                MediWaste monitors all regulatory changes and updates our procedures accordingly. When new requirements come into force, we notify affected clients and adjust collection documentation automatically — so you do not need to track legislative changes yourself.
              </p>
            </div>

            {/* MediWaste Disposal Certificate */}
            <div className="mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Award size={20} className="text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">MediWaste Medical Waste Disposal Certificate</h2>
              </div>
              <div className="bg-white border-2 border-green-200 rounded-xl p-6 mb-6">
                <div className="flex items-start gap-4">
                  <CheckCircle size={24} className="text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Your Proof of Compliant Disposal</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Every MediWaste client receives a Medical Waste Disposal Certificate confirming that their clinical waste is collected, transported, and disposed of in full compliance with UK environmental law. This certificate is your primary evidence of Duty of Care compliance.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Unique Certificate Number</p>
                    <p className="text-gray-500 text-xs mt-0.5">Traceable reference for your records and audits</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">QR Code Verification</p>
                    <p className="text-gray-500 text-xs mt-0.5">Instant online verification of certificate authenticity</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Waste Types Listed</p>
                    <p className="text-gray-500 text-xs mt-0.5">All waste categories covered clearly documented</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Validity Period</p>
                    <p className="text-gray-500 text-xs mt-0.5">Clear issue and expiry dates for renewal tracking</p>
                  </div>
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                Your certificate is available digitally through our client portal and can be downloaded as a PDF at any time. Inspectors, regulatory bodies, and landlords can verify the certificate instantly by scanning the QR code or visiting the verification URL.
              </p>
            </div>

            {/* Hazardous Waste Consignment Notes */}
            <div className="mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <ClipboardList size={20} className="text-amber-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Hazardous Waste Consignment Notes</h2>
              </div>
              <p className="text-gray-700 leading-relaxed mb-6">
                Under the Hazardous Waste Regulations 2005, every movement of hazardous clinical waste must be accompanied by a consignment note. This is a legal requirement — not optional paperwork. The consignment note creates an auditable chain of custody from your premises to the licensed treatment facility.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
                <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                  <FileText size={16} />
                  What a Consignment Note Records
                </h3>
                <ul className="space-y-2 text-amber-900 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5 flex-shrink-0" />
                    <span>Producer details — your business name, address, and SIC code</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5 flex-shrink-0" />
                    <span>Waste description — EWC codes, physical form, and composition</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5 flex-shrink-0" />
                    <span>Carrier details — MediWaste's registered waste carrier licence number</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5 flex-shrink-0" />
                    <span>Quantity — weight or volume of waste collected</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5 flex-shrink-0" />
                    <span>Container type — sharps bins, clinical sacks, rigid containers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5 flex-shrink-0" />
                    <span>Consignee details — the licensed facility receiving the waste</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5 flex-shrink-0" />
                    <span>Recovery or disposal code — confirming the treatment method used</span>
                  </li>
                </ul>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                MediWaste completes the consignment note on your behalf at every hazardous waste collection. You receive a copy within 48 hours of collection, and we retain the records for the mandatory 3-year retention period. This means if the Environment Agency requests your waste records during an inspection, everything is readily available.
              </p>
              <div className="bg-gray-900 text-white rounded-xl p-6">
                <p className="font-medium mb-2">Retention requirements:</p>
                <ul className="space-y-1.5 text-gray-300 text-sm">
                  <li>Hazardous waste consignment notes: <strong className="text-white">minimum 3 years</strong></li>
                  <li>Standard waste transfer notes: <strong className="text-white">minimum 2 years</strong></li>
                  <li>MediWaste stores your records digitally for ongoing access beyond minimum periods</li>
                </ul>
              </div>
            </div>

            {/* Waste Transfer Notes */}
            <div className="mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                  <FileText size={20} className="text-gray-700" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Waste Transfer Notes</h2>
              </div>
              <p className="text-gray-700 leading-relaxed mb-4">
                For non-hazardous clinical waste (such as offensive waste and hygiene waste), a Waste Transfer Note (WTN) is required under Section 34 of the Environmental Protection Act 1990. The WTN must be completed each time waste changes hands — from your premises to our collection vehicle.
              </p>
              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                MediWaste provides waste transfer notes for every collection. These documents record the waste description, quantity, your details as the producer, and our details as the licensed carrier. They confirm that the transfer was made to an authorised person and that the waste was correctly described.
              </p>
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-green-900 text-sm leading-relaxed">
                  <strong>MediWaste guarantee:</strong> All waste transfer notes and consignment notes are provided within 48 hours of collection. Digital copies are accessible through your client portal at any time.
                </p>
              </div>
            </div>

            {/* How MediWaste keeps you compliant */}
            <div className="mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <Shield size={20} className="text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">How MediWaste Keeps You Compliant</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-5 bg-white border border-gray-200 rounded-xl hover:shadow-sm transition-shadow">
                  <div className="w-8 h-8 bg-red-600 text-white rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm">1</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Licensed Collection</h3>
                    <p className="text-gray-600 text-sm">We hold an upper-tier registered waste carrier licence from the Environment Agency. Your waste is always in authorised hands.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-5 bg-white border border-gray-200 rounded-xl hover:shadow-sm transition-shadow">
                  <div className="w-8 h-8 bg-red-600 text-white rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm">2</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Proper Documentation</h3>
                    <p className="text-gray-600 text-sm">Waste transfer notes and hazardous waste consignment notes provided for every collection, within 48 hours, stored digitally for your records.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-5 bg-white border border-gray-200 rounded-xl hover:shadow-sm transition-shadow">
                  <div className="w-8 h-8 bg-red-600 text-white rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm">3</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Disposal Certificate</h3>
                    <p className="text-gray-600 text-sm">Your Medical Waste Disposal Certificate confirms compliant handling from collection through to final disposal at a licensed treatment facility.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-5 bg-white border border-gray-200 rounded-xl hover:shadow-sm transition-shadow">
                  <div className="w-8 h-8 bg-red-600 text-white rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm">4</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Regulatory Monitoring</h3>
                    <p className="text-gray-600 text-sm">We track changes to waste legislation and update our procedures and documentation automatically. You are always operating under current regulations.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-5 bg-white border border-gray-200 rounded-xl hover:shadow-sm transition-shadow">
                  <div className="w-8 h-8 bg-red-600 text-white rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm">5</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Audit Support</h3>
                    <p className="text-gray-600 text-sm">If the Environment Agency or a regulatory body requests your waste records, we provide full documentation packages to support your compliance position.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Who needs to be compliant */}
            <div className="mb-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Who Needs Clinical Waste Compliance?</h2>
              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                If your business produces any waste that could be infectious, contain sharps, or include pharmaceutical materials, you have legal obligations. This includes:
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  'GP Surgeries',
                  'Dental Practices',
                  'Beauty & Aesthetic Clinics',
                  'Tattoo Studios',
                  'Veterinary Practices',
                  'Care Homes',
                  'Pharmacies',
                  'Podiatry Clinics',
                  'Acupuncture Practices',
                  'Body Piercing Studios',
                  'Home Healthcare Providers',
                  'Private Hospitals',
                ].map((type) => (
                  <div key={type} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <CheckCircle size={14} className="text-red-600 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{type}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ section */}
            <div className="mb-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>
              <div className="space-y-6">
                <div className="border-b border-gray-100 pb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">What is a Hazardous Waste Consignment Note?</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    A Hazardous Waste Consignment Note is a legal document required under the Hazardous Waste Regulations 2005. It tracks the movement of hazardous clinical waste from your premises through to final disposal, creating a full audit trail. MediWaste provides these automatically with every hazardous waste collection.
                  </p>
                </div>
                <div className="border-b border-gray-100 pb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">What is a Medical Waste Disposal Certificate?</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    A Medical Waste Disposal Certificate issued by MediWaste confirms that your clinical waste has been collected, transported, and disposed of in full compliance with UK environmental regulations. It serves as proof of your Duty of Care obligations under the Environmental Protection Act 1990.
                  </p>
                </div>
                <div className="border-b border-gray-100 pb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">How long must I keep clinical waste records?</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Under the Hazardous Waste Regulations 2005, you must retain hazardous waste consignment notes for a minimum of 3 years. Standard waste transfer notes must be kept for at least 2 years. MediWaste stores digital copies of all your documents for ongoing access beyond these minimum periods.
                  </p>
                </div>
                <div className="border-b border-gray-100 pb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">What happens if I am not compliant with clinical waste regulations?</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Non-compliance with clinical waste regulations can result in enforcement action from the Environment Agency, including unlimited fines and, in serious cases, custodial sentences. Healthcare businesses may also face regulatory action from bodies such as the CQC, GDC, or local authority environmental health teams.
                  </p>
                </div>
                <div className="pb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Are MediWaste registered with the Environment Agency?</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Yes. MediWaste holds an upper-tier registered waste carrier licence issued by the Environment Agency. We are audited annually and hold Safe Contractor accreditation and ISO 14001 certification for environmental management.
                  </p>
                </div>
              </div>
            </div>

            {/* Accreditations */}
            <div className="bg-gray-50 rounded-2xl p-8 text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Our Accreditations</h2>
              <p className="text-gray-600 text-sm mb-6">MediWaste is fully licenced and regularly audited to ensure the highest standards of clinical waste management.</p>
              <div className="flex flex-wrap justify-center gap-6">
                <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-lg border border-gray-200">
                  <Shield size={16} className="text-green-600" />
                  <span className="text-sm font-medium text-gray-800">Environment Agency Registered</span>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-lg border border-gray-200">
                  <Award size={16} className="text-blue-600" />
                  <span className="text-sm font-medium text-gray-800">Safe Contractor Approved</span>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-lg border border-gray-200">
                  <CheckCircle size={16} className="text-red-600" />
                  <span className="text-sm font-medium text-gray-800">ISO 14001 Certified</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <BottomCTA
        title="Need help with clinical waste compliance?"
        description="Get a free, no-obligation quote for compliant clinical waste collection. We can usually start collections within 7 days."
      />
      <Footer />
    </div>
  );
}
