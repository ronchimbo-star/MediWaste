import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  display_order: number;
}

function renderRichAnswer(answer: string) {
  const lines = answer.split('\n');
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`ul-${key++}`} className="my-2 space-y-1.5 pl-1">
        {listItems.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-gray-600 leading-relaxed">
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
        <p key={`p-${key++}`} className="text-sm text-gray-600 leading-relaxed mb-2 last:mb-0">
          {renderInlineLinks(trimmed)}
        </p>
      );
    }
  });
  flushList();
  return blocks;
}

function renderInlineLinks(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let matchIndex = 0;

  const combined = new RegExp(
    `([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})|(https?://[^\\s]+)|(\\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z]{2,}(?:\\/[^\\s.,)]*)?\\b)`,
    'gi'
  );

  let match: RegExpExecArray | null;
  while ((match = combined.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const matched = match[0];
    const isEmail = match[1];
    const isUrl = match[2];

    if (isEmail) {
      parts.push(
        <a key={`link-${matchIndex++}`} href={`mailto:${matched}`} className="text-red-600 hover:text-red-700 underline font-medium">
          {matched}
        </a>
      );
    } else if (isUrl) {
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

export default function HomepageFAQ() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchFAQs();
  }, []);

  const fetchFAQs = async () => {
    try {
      const { data, error } = await supabase
        .from('homepage_faqs')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setFaqs(data || []);
    } catch (err) {
      console.error('Error fetching FAQs:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  if (loading) {
    return (
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/mediwaste-faq-bg.jpg"
            alt="Medical waste management"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/85 to-red-700/85"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        </div>
      </section>
    );
  }

  if (faqs.length === 0) {
    return null;
  }

  return (
    <section className="relative py-16 overflow-hidden">
      <div className="absolute inset-0">
        <img
          src="/mediwaste-faq-bg.jpg"
          alt="Medical waste management"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-red-600/85 to-red-700/85"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-white/90 max-w-2xl mx-auto">
              Everything you need to know about clinical waste disposal and our services
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {faqs.map((faq, index) => (
              <div
                key={faq.id}
                className="border border-white/20 rounded-lg overflow-hidden bg-white/95 backdrop-blur-sm hover:shadow-xl transition-shadow"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
                  aria-expanded={openIndex === index}
                >
                  <h3 className="font-semibold text-gray-900 pr-4 text-sm md:text-base">
                    {faq.question}
                  </h3>
                  <ChevronDown
                    className={`w-5 h-5 text-red-600 flex-shrink-0 transition-transform duration-200 ${
                      openIndex === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {openIndex === index && (
                  <div className="px-6 pb-4 pt-2 border-t border-gray-100">
                    {renderRichAnswer(faq.answer)}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-white text-lg mb-4">
              Still have questions? We're here to help
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href="/quote"
                className="bg-white hover:bg-gray-100 text-red-600 px-8 py-3 rounded-full font-semibold transition-colors shadow-lg"
              >
                Get a Free Quote
              </a>
              <a
                href="/contact"
                className="border-2 border-white text-white hover:bg-white/10 px-8 py-3 rounded-full font-semibold transition-colors"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
