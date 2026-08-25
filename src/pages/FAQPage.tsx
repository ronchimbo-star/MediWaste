import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

function renderInlineLinks(text: string): React.ReactNode {
  const combined = new RegExp(
    `([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})|(https?://[^\\s]+)|(\\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z]{2,}(?:\\/[^\\s.,)]*)?\\b)`,
    'gi'
  );

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let matchIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combined.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const matched = match[0];
    const isEmail = match[1];

    if (isEmail) {
      parts.push(
        <a key={`link-${matchIndex++}`} href={`mailto:${matched}`} className="text-red-600 hover:text-red-700 underline font-medium">
          {matched}
        </a>
      );
    } else if (match[2]) {
      parts.push(
        <a key={`link-${matchIndex++}`} href={matched} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-700 underline font-medium">
          {matched}
        </a>
      );
    } else {
      const href = matched.startsWith('http') ? matched : `https://${matched}`;
      parts.push(
        <a key={`link-${matchIndex++}`} href={href} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-700 underline font-medium">
          {matched}
        </a>
      );
    }
    lastIndex = match.index + matched.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : text;
}

function renderRichAnswer(answer: string) {
  const lines = answer.split('\n');
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`ul-${key++}`} className="my-3 space-y-2 pl-1">
        {listItems.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-gray-600 leading-relaxed">
            <span className="text-red-500 font-bold mt-0.5 flex-shrink-0">•</span>
            <span>{renderInlineLinks(item)}</span>
          </li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed === '') {
      flushList();
      return;
    }
    if (trimmed.startsWith('• ')) {
      listItems.push(trimmed.slice(2));
    } else {
      flushList();
      blocks.push(
        <p key={`p-${key++}`} className="text-gray-600 leading-relaxed mb-3 last:mb-0">
          {renderInlineLinks(trimmed)}
        </p>
      );
    }
  });
  flushList();
  return blocks;
}

const faqs: FAQItem[] = [
  {
    category: 'General',
    question: 'What is clinical waste?',
    answer: 'Clinical waste is any waste produced by healthcare activities that may pose a risk of infection, contain harmful substances, or requires special disposal. This includes infectious materials contaminated with bodily fluids, sharps (needles and syringes), pharmaceutical waste, and anatomical waste. All clinical waste must be disposed of according to strict UK regulations to protect public health and the environment.',
  },
  {
    category: 'General',
    question: 'What areas do you cover?',
    answer: 'We cover London, Kent, Surrey, Sussex, Hampshire, and Essex – with occasional collections further afield. If you\'re outside our core area, drop us an email at hello@mediwaste.co.uk – we may still be able to help, or we can point you in the right direction.',
  },
  {
    category: 'General',
    question: 'How do I find a licensed waste carrier near me?',
    answer: 'MediWaste is a licensed Upper Tier Waste Carrier (Registration: CBDU542939) covering London, Kent, Surrey, Sussex, Hampshire, and Essex. We provide clinical waste collection across the South East. If you\'re outside our area, we can still offer advice or point you in the right direction.',
  },
  {
    category: 'General',
    question: 'Are your services CQC compliant?',
    answer: 'Yes. We provide all the documentation you need for CQC compliance: Waste Transfer Notes, Hazardous Waste Consignment Notes, Waste Management Certificates, and a full audit trail for inspections. Our service meets the requirements of the Hazardous Waste Regulations 2005, Environmental Protection Act 1990, and Health and Safety at Work Act.',
  },
  {
    category: 'Waste Types & Segregation',
    question: 'What\'s the difference between orange, yellow, purple, and blue bins?',
    answer: 'Colour codes:\n• Orange – infectious sharps & clinical waste (needles, blood-contaminated items).\n• Yellow – cytotoxic/cytostatic waste (chemotherapy drugs, some Botox).\n• Purple – cytotoxic waste (same as yellow, some providers use different conventions).\n• Blue – pharmaceutical waste (expired medicines, vaccination vials).\n• Tiger stripe (yellow/black) – offensive/hygiene waste (non-infectious PPE, sanitary waste).\n\nAlways check with your provider to confirm the correct colour for your specific waste stream.',
  },
  {
    category: 'Waste Types & Segregation',
    question: 'Do I need a purple bin or a blue bin for Botox / filler vials?',
    answer: 'It depends. Botox and filler vials are usually classified as pharmaceutical waste (EWC 18 01 09) and should go in a blue-lidded pharmaceutical bin. However, if the waste contains or is contaminated with cytotoxic or cytostatic substances, it would need a purple-lidded bin (EWC 18 01 08*). We can help you confirm the correct classification for your practice.',
  },
  {
    category: 'Waste Types & Segregation',
    question: 'Can I use tiger stripe bags instead of orange bags?',
    answer: 'Only for non-infectious waste. Tiger stripe bags (yellow/black) are for offensive/hygiene waste – non-infectious items like uncontaminated PPE, sanitary waste, and hygiene products. If your waste is infectious (e.g., blood-contaminated), you must use orange bags (or yellow bags for incineration-only waste). Mixing them up can lead to compliance issues.',
  },
  {
    category: 'Waste Types & Segregation',
    question: 'What\'s the difference between hazardous, non-hazardous, and offensive waste?',
    answer: 'Hazardous (18 01 03*) – infectious sharps, contaminated clinical waste, blood-soaked items.\nNon-hazardous / offensive (18 01 04) – PPE, sanitary waste, uncontaminated gloves, hygiene waste.\nPharmaceutical (18 01 09) – expired medicines, vaccination vials, glass vials.\n\nCorrect classification is important for compliance and disposal costs.',
  },
  {
    category: 'Waste Types & Segregation',
    question: 'How do I know if my waste is classified as hazardous?',
    answer: 'Hazardous waste includes items that are infectious, contain dangerous substances, or are classified under EWC codes with an asterisk (*). Examples:\n• 18 01 03* – Sharps and clinical waste contaminated with infectious agents.\n• 18 01 08* – Cytotoxic/cytostatic waste (e.g., chemotherapy drugs).\n• 18 01 06* – Chemical waste from healthcare.\n\nIf you\'re unsure, we can help you classify your waste correctly.',
  },
  {
    category: 'Waste Types & Segregation',
    question: 'Do I need to separate my waste into different bags/bins?',
    answer: 'Yes. Correct segregation is a legal requirement. Waste must be sorted at the point of generation into the appropriate colour-coded containers. This ensures compliance, reduces disposal costs, and protects public health. We provide training materials and segregation guidance to all our clients.',
  },
  {
    category: 'Waste Types & Segregation',
    question: 'I\'m a tattoo studio – do I need orange or yellow bags?',
    answer: 'Orange bags are for infectious clinical waste (blood-contaminated items, used gloves, ink cups, paper towels). Yellow bags are for infectious waste that must be incinerated. For most tattoo studios, orange bags are the correct choice. Tiger stripe (yellow/black) bags can be used for non-infectious hygiene waste if you segregate it.',
  },
  {
    category: 'Containers & Supplies',
    question: 'What are the container sizes you supply?',
    answer: 'Sharps bins: 0.2L, 1L, 2L, 2.5L, 5L, 7L, 11L, 13L, 24L.\nClinical waste bags: 25L, 30L, 50L, 80L, 120L (rolls of 5 or 10 bags).\nPharmaceutical bins: 2L, 5L, 7L, 13L (blue or purple lids).\nOffensive waste bags: 25L, 30L, 50L (tiger stripe – yellow/black).\nWheelie bins: 120L, 240L, 360L, 660L (lockable, for secure storage).\n\nJust let us know your volume and we\'ll recommend the right sizes.',
  },
  {
    category: 'Containers & Supplies',
    question: 'Do you supply bins and bags, or do I need to buy my own?',
    answer: 'We supply them as part of the service. We deliver new empty bins and bags at each collection and take away the full ones. There are no separate rental fees. If you prefer to use your own bins (e.g., purchased from Amazon), that\'s fine too – we\'ll still collect them.',
  },
  {
    category: 'Containers & Supplies',
    question: 'What happens if I run out of bags or sharps bins between collections?',
    answer: 'Just let us know. We can send out additional supplies in advance of your next collection – at no extra charge if you\'re on a scheduled plan, or for a small fee if you\'re on a pay-as-you-go plan. Many clients order extra bags and sharps bins when they book their collection.',
  },
  {
    category: 'Containers & Supplies',
    question: 'How long can I keep a sharps bin before it needs to be collected?',
    answer: 'There\'s no fixed time limit – you can keep a sharps bin until it reaches the fill line, as long as it\'s stored securely (e.g., in a locked cupboard) away from public access. Bins should never be overfilled. Some clients keep a bin for 6–12 months if they generate very low volumes.',
  },
  {
    category: 'Service & Collections',
    question: 'What are the collection time windows? How much notice do you give?',
    answer: 'We give 24-hour advance notice with a 2-hour time window (e.g., "we\'ll be there between 10am and 12pm"). On the day, you\'ll receive a text alert when the driver is about an hour away. If you\'re not available, you can leave the waste in a designated safe area and the driver will collect without you being present.',
  },
  {
    category: 'Service & Collections',
    question: 'What happens if I need a collection urgently?',
    answer: 'Call or email us. If we have capacity, we can arrange an emergency collection within 24-48 hours. Emergency collections are charged at our standard ad-hoc rate plus a small priority fee. We\'ll always do our best to accommodate urgent requests.',
  },
  {
    category: 'Service & Collections',
    question: 'Can I deliver my waste to you instead of having it collected?',
    answer: 'Yes. If it\'s more convenient, you can deliver your waste to our Dartford processing facility. This is often cheaper than a collection visit – we can quote accordingly. Just let us know and we\'ll arrange a drop-off time.',
  },
  {
    category: 'Service & Collections',
    question: 'Do you collect from home-based clinics?',
    answer: 'Yes. We collect from many home-based practitioners – aestheticians, acupuncturists, podiatrists, tattoo artists, and phlebotomists. We just ask that waste is stored securely (e.g., in a locked cupboard or small lockable bin) and that you\'re available for collection during the agreed time window.',
  },
  {
    category: 'Service & Collections',
    question: 'Do you collect from dental practices? Do you handle amalgam and gypsum?',
    answer: 'Yes. We provide full dental waste collection including: amalgam waste (600ml, 1.8L, 6L), gypsum waste (25L sani boxes), sludge drums (10L), sharps (yellow lid), cytotoxic sharps (purple lid), pharmaceutical waste (blue lid), offensive waste (tiger stripe), and orange clinical waste bags. We also provide amalgam recovery certificates in compliance with dental waste regulations.',
  },
  {
    category: 'Pricing & Contracts',
    question: 'Do you offer a pay-as-you-go or no-contract service?',
    answer: 'Yes. We offer Pay-As-You-Go (Ad-Hoc) collections – you call us when you\'re ready, and we collect. No contract, no minimum commitment. We also offer Flexi plans (pre-paid blocks of 4 or 6 collections) which give you the same flexibility but at a cheaper rate per visit.',
  },
  {
    category: 'Pricing & Contracts',
    question: 'What\'s the cheapest option for a small clinic / low volume?',
    answer: 'Our Flexi 4 plan is usually the best value for small clinics – you pay for 4 collections in advance, call us when you\'re ready, and unused collections are refunded. For very low volume (1-2 collections per year), our Pay-As-You-Go option is simpler and still cost-effective.',
  },
  {
    category: 'Pricing & Contracts',
    question: 'What\'s the minimum contract term?',
    answer: 'Pay-As-You-Go (Ad-Hoc): No contract, no minimum term.\nFlexi plans: No long-term contract – pre-paid collections valid for 12 months.\nScheduled plans (Quarterly, Bi-Monthly, Monthly): 12-month rolling contract with 30 days\' notice.\n\nWe don\'t tie you into long, inflexible contracts – flexibility is what we\'re known for.',
  },
  {
    category: 'Pricing & Contracts',
    question: 'What are the disposal costs for pharmaceutical waste?',
    answer: 'Pharmaceutical waste (blue-lidded bins) is collected and disposed of via high-temperature incineration. The cost is included in our per-collection pricing – there are no hidden per-kilogram charges for standard volumes. For larger quantities (e.g., expired stock from pharmacies), we provide bespoke quotes based on volume.',
  },
  {
    category: 'Pricing & Contracts',
    question: 'Do you offer discounts for referrals or members of professional bodies?',
    answer: 'Yes. We offer:\n• 5% discount for referrals (both parties)\n• 5% discount for members of professional bodies (e.g., ATCM, BABTAC)\n• 10% discount for education sector clients\n• Multi-site discounts for clinics with multiple locations\n\nDiscounts are usually applied to the first year of service.',
  },
  {
    category: 'Compliance & Documentation',
    question: 'What paperwork do I need to keep?',
    answer: 'You need to keep:\n• Hazardous Waste Consignment Notes (HazNotes) – your legal proof of transfer, valid for 3 years.\n• Waste Management Certificate – proof that you\'re using a licensed waste carrier.\n• Waste Transfer Notes (WTNs) – for non-hazardous waste.\n\nAll documents are available online via your compliance dashboard, so you can view, download, and print them whenever you need.',
  },
  {
    category: 'Compliance & Documentation',
    question: 'What\'s the difference between a Waste Transfer Note (WTN) and a Consignment Note?',
    answer: 'Waste Transfer Note (WTN) – used for non-hazardous waste transfers. Must be kept for 2 years.\nHazardous Waste Consignment Note (HazNote) – used for hazardous waste. Must be kept for 3 years.\n\nWe provide both as part of our service, depending on the type of waste being collected. They are your legal proof of transfer and compliance.',
  },
  {
    category: 'Training & Support',
    question: 'Do you offer training for my staff?',
    answer: 'Yes. Through our partnership with WasteInstitute, we offer:\n• Free resources – guides, posters, and downloadable materials.\n• Discounted training – CPD-accredited clinical waste management modules.\n• Bespoke guidance – we can work with you to develop training tailored to your practice.\n\nJust ask when you sign up.',
  },
  {
    category: 'Getting Started',
    question: 'How do I get a quote?',
    answer: 'It\'s easy. Visit our website at mediwaste.co.uk and complete the quick quote form, or email us at hello@mediwaste.co.uk. We\'ll get back to you within a few hours with a tailored quote based on your waste types, volumes, and location.',
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const categories = Array.from(new Set(faqs.map(faq => faq.category)));

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="FAQ | Clinical Waste Disposal Questions | MediWaste"
        description="Answers to common questions about clinical waste disposal, sharps collection, compliance and pricing. Get a free quote from MediWaste. Call 0800 046 9806."
        canonical="https://mediwaste.co.uk/faq"
        schema={faqSchema}
      />
      <Header />

      <div className="bg-red-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-lg opacity-95 max-w-2xl mx-auto">
            Find answers to common questions about our medical waste disposal services
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {categories.map((category) => (
            <div key={category} className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-red-600">
                {category}
              </h2>
              <div className="space-y-4">
                {faqs
                  .filter((faq) => faq.category === category)
                  .map((faq) => {
                    const globalIndex = faqs.indexOf(faq);
                    const isOpen = openIndex === globalIndex;
                    return (
                      <div
                        key={globalIndex}
                        className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <button
                          onClick={() => setOpenIndex(isOpen ? null : globalIndex)}
                          className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
                        >
                          <span className="font-semibold text-gray-900 pr-4 text-sm md:text-base">{faq.question}</span>
                          <ChevronDown
                            className={`w-5 h-5 text-red-600 flex-shrink-0 transition-transform duration-200 ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        {isOpen && (
                          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                            {renderRichAnswer(faq.answer)}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}

          <div className="bg-red-600 text-white rounded-lg p-8 text-center mt-12">
            <h2 className="text-2xl font-bold mb-4">Still Have Questions?</h2>
            <p className="text-lg opacity-95 mb-6">
              Can't find what you're looking for? Contact us and we'll be happy to help
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                to="/contact"
                className="bg-white text-red-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-50 transition-colors"
              >
                Contact Us
              </Link>
              <a
                href="tel:08000469806"
                className="border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-red-600 transition-colors"
              >
                Call 0800 046 9806
              </a>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
