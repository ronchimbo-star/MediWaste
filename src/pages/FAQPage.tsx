import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      category: 'General',
      question: 'What types of medical waste do you collect?',
      answer: 'We collect all types of clinical and medical waste including infectious waste, sharps, pharmaceutical waste, anatomical waste, cytotoxic waste, and dental waste. We provide specialized containers and collection services for each waste stream.'
    },
    {
      category: 'General',
      question: 'Which areas do you service?',
      answer: 'We provide medical waste disposal services across London, Kent, Sussex, Essex, and Surrey. Contact us to check if we cover your specific location.'
    },
    {
      category: 'General',
      question: 'Are you fully licensed and compliant?',
      answer: 'Yes, we hold all necessary licenses and permits required for medical waste collection and disposal. We are fully compliant with UK waste regulations and healthcare standards, and carry comprehensive insurance coverage.'
    },
    {
      category: 'Service',
      question: 'How often do you collect medical waste?',
      answer: 'We offer flexible collection schedules to suit your needs - weekly, bi-weekly, monthly, or on-demand collection services. We can adjust the frequency based on your waste volume and requirements.'
    },
    {
      category: 'Service',
      question: 'Do you offer emergency collection services?',
      answer: 'Yes, we provide 24/7 emergency medical waste collection services for urgent situations. Contact us anytime if you need immediate waste removal.'
    },
    {
      category: 'Service',
      question: 'What containers do you provide?',
      answer: 'We provide colour-coded containers and sharps bins that comply with UK regulations. Containers are available in various sizes (1L to 60L) and colors (yellow, orange, purple, yellow/black) depending on your waste type.'
    },
    {
      category: 'Pricing',
      question: 'How much does medical waste disposal cost?',
      answer: 'Pricing depends on several factors including waste volume, collection frequency, container types, and your location. Request a free quote through our website or call us for a personalized pricing plan.'
    },
    {
      category: 'Pricing',
      question: 'Do you have long-term contract requirements?',
      answer: 'No, we offer flexible contracts with no long-term lock-ins. Choose from monthly rolling contracts or fixed-term agreements (6 months or annual) with discounted rates.'
    },
    {
      category: 'Pricing',
      question: 'Are there any hidden fees?',
      answer: 'No, we believe in transparent pricing with no hidden fees. All costs are clearly outlined in your quote, including containers, collection, transportation, and disposal.'
    },
    {
      category: 'Compliance',
      question: 'Will I receive documentation for waste disposal?',
      answer: 'Yes, we provide complete documentation for every collection including consignment notes and disposal certificates. This creates a full audit trail for regulatory compliance and your records.'
    },
    {
      category: 'Compliance',
      question: 'How is the waste disposed of?',
      answer: 'All clinical waste is disposed of via incineration at licensed facilities in compliance with UK regulations. We follow strict protocols to ensure safe and environmentally responsible disposal.'
    },
    {
      category: 'Compliance',
      question: 'Do you provide staff training?',
      answer: 'Yes, we can provide guidance and training for your staff on proper waste segregation, container usage, and compliance requirements. Contact us to arrange training sessions.'
    },
    {
      category: 'Getting Started',
      question: 'How do I get started?',
      answer: 'Simply request a quote through our website or call us at +44 7757 664788. We\'ll assess your needs, provide a custom quote, and can typically start service within a few days.'
    },
    {
      category: 'Getting Started',
      question: 'What information do I need to provide for a quote?',
      answer: 'We\'ll need to know your business type, location, estimated waste volume, types of waste generated, and preferred collection frequency. Our quote form makes it easy to provide all necessary information.'
    },
    {
      category: 'Getting Started',
      question: 'How quickly can you start service?',
      answer: 'We can typically begin service within 2-5 business days after agreeing on terms. For urgent needs, we can expedite the setup process.'
    }
  ];

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
        description="Find answers to frequently asked questions about clinical waste disposal, collection schedules, compliance requirements and pricing from MediWaste."
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
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{category}</h2>
              <div className="space-y-4">
                {faqs
                  .filter((faq) => faq.category === category)
                  .map((faq) => {
                    const globalIndex = faqs.indexOf(faq);
                    const isOpen = openIndex === globalIndex;
                    return (
                      <div
                        key={globalIndex}
                        className="bg-white border border-gray-200 rounded-lg overflow-hidden"
                      >
                        <button
                          onClick={() => setOpenIndex(isOpen ? null : globalIndex)}
                          className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                          {isOpen ? (
                            <ChevronUp className="w-5 h-5 text-orange-600 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-orange-600 flex-shrink-0" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                            <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
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
                className="bg-white text-orange-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-50 transition-colors"
              >
                Contact Us
              </Link>
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

      <Footer />
    </div>
  );
}
