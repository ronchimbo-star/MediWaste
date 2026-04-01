import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, Calendar, Download, Printer, Phone, Mail, Globe, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Notification from '../components/Notification';
import ServiceComparison from '../components/ServiceComparison';

interface QuoteData {
  id: string;
  quote_number: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  postcode: string;
  status: string;
  valid_until: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  notes: string;
  terms_and_conditions: string;
  created_at: string;
  industry_type: string | null;
  compliance_notes: string | null;
  show_service_comparison?: boolean;
  selected_service_option_id?: string;
}

interface LineItem {
  id: string;
  item_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string;
}

interface ServiceOption {
  id: string;
  quote_id: string;
  option_name: string;
  frequency: string;
  collections_per_year: number;
  annual_cost: number;
  vat_amount: number;
  total_cost: number;
  setup_fee: number | null;
  waste_bags_included: number | null;
  sharps_bins_included: number | null;
  additional_services: string | null;
  display_order: number;
  is_recommended: boolean;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  display_order: number;
}

export default function PublicQuoteView() {
  const { token } = useParams();
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  } | null>(null);

  const selectedOption = serviceOptions.find(o => o.id === selectedOptionId);

  console.log('PublicQuoteView render - loading:', loading, 'quote:', quote ? 'exists' : 'null', 'token:', token);

  useEffect(() => {
    console.log('useEffect triggered with token:', token);
    if (token) {
      loadQuote();
    } else {
      console.error('No token provided');
      setLoading(false);
    }
  }, [token]);

  async function loadQuote() {
    try {
      console.log('Loading quote with token:', token);
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('share_token', token)
        .maybeSingle();

      console.log('Quote data:', quoteData);
      console.log('Quote error:', quoteError);

      if (quoteError) throw quoteError;

      if (!quoteData) {
        console.log('No quote data found');
        setNotification({
          type: 'error',
          title: 'Quote Not Found',
          message: 'The quote you are looking for does not exist or has been removed.'
        });
        setLoading(false);
        return;
      }

      console.log('Setting quote, show_service_comparison:', quoteData.show_service_comparison);
      setQuote(quoteData);

      const { data: items, error: itemsError } = await supabase
        .from('quote_line_items')
        .select('*')
        .eq('quote_id', quoteData.id)
        .order('item_order');

      if (itemsError) throw itemsError;
      setLineItems(items || []);

      if (quoteData.show_service_comparison) {
        const { data: options, error: optionsError } = await supabase
          .from('quote_service_options')
          .select('*')
          .eq('quote_id', quoteData.id)
          .order('display_order');

        if (optionsError) throw optionsError;
        setServiceOptions(options || []);

        if (options && options.length > 0) {
          const recommended = options.find(o => o.is_recommended);
          const preSelected = quoteData.selected_service_option_id;
          setSelectedOptionId(preSelected || recommended?.id || options[0].id);
        }
      }

      const industryType = quoteData.industry_type || 'general';
      const { data: faqData, error: faqError } = await supabase
        .from('industry_faqs')
        .select('*')
        .eq('industry_type', industryType)
        .eq('is_active', true)
        .order('display_order');

      if (faqError) {
        console.error('Error loading FAQs:', faqError);
      } else {
        setFaqs(faqData || []);
      }
    } catch (err) {
      console.error('Error loading quote:', err);
      setNotification({
        type: 'error',
        title: 'Failed to Load Quote',
        message: 'There was an error loading the quote. Please try refreshing the page.'
      });
    } finally {
      setLoading(false);
    }
  }

  async function acceptQuote() {
    if (!quote) return;
    setSubmitting(true);

    try {
      const updateData: any = {
        status: 'accepted',
        accepted_at: new Date().toISOString()
      };

      if (selectedOptionId) {
        updateData.selected_service_option_id = selectedOptionId;
      }

      const { error } = await supabase
        .from('quotes')
        .update(updateData)
        .eq('id', quote.id);

      if (error) throw error;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-quote-status-notification`;
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteNumber: quote.quote_number,
          companyName: quote.company_name,
          contactName: quote.contact_name,
          email: quote.email,
          status: 'accepted',
          totalAmount: selectedOption ? selectedOption.total_cost : quote.total_amount,
          selectedOption: selectedOption?.option_name
        })
      }).catch(err => console.error('Failed to send notification:', err));

      setNotification({
        type: 'success',
        title: 'Quote Accepted Successfully!',
        message: 'Thank you for accepting our quote. We will contact you within 24 hours to set up your account and schedule your first service.'
      });
      setShowPaymentModal(false);
      loadQuote();
    } catch (err) {
      console.error('Error accepting quote:', err);
      setNotification({
        type: 'error',
        title: 'Failed to Accept Quote',
        message: 'There was an error accepting the quote. Please try again or contact us directly.'
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function declineQuote() {
    if (!quote) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('quotes')
        .update({
          status: 'declined',
          declined_at: new Date().toISOString(),
          notes: quote.notes ? `${quote.notes}\n\nDecline Reason: ${declineReason}` : `Decline Reason: ${declineReason}`
        })
        .eq('id', quote.id);

      if (error) throw error;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-quote-status-notification`;
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteNumber: quote.quote_number,
          companyName: quote.company_name,
          contactName: quote.contact_name,
          email: quote.email,
          status: 'declined',
          declineReason: declineReason || 'No reason provided'
        })
      }).catch(err => console.error('Failed to send notification:', err));

      setNotification({
        type: 'info',
        title: 'Quote Declined',
        message: 'Thank you for your time. We appreciate your feedback and hope to work with you in the future.'
      });
      setShowDeclineModal(false);
      loadQuote();
    } catch (err) {
      console.error('Error declining quote:', err);
      setNotification({
        type: 'error',
        title: 'Failed to Decline Quote',
        message: 'There was an error declining the quote. Please try again or contact us directly.'
      });
    } finally {
      setSubmitting(false);
    }
  }

  function isExpired() {
    if (!quote?.valid_until) return false;
    return new Date(quote.valid_until) < new Date();
  }

  function handlePrint() {
    window.print();
  }

  console.log('Before render checks - loading:', loading, 'quote:', !!quote);

  if (loading) {
    console.log('Rendering loading state');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          <p className="text-gray-600 mt-4">Loading quote...</p>
          <p className="text-xs text-gray-400 mt-2">Debug: Token = {token}</p>
        </div>
      </div>
    );
  }

  if (!quote) {
    console.log('Rendering no quote state');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Quote Not Found</h2>
          <p className="text-gray-600">The quote you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  console.log('Rendering quote view - Quote number:', quote.quote_number);

  const expired = isExpired();
  const canRespond = quote.status === 'published' && !expired;

  return (
    <>
      {notification && (
        <Notification
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      <div className="min-h-screen bg-gray-50 py-4 print:py-0">
        <div className="max-w-5xl mx-auto bg-white shadow-xl print:shadow-none rounded-lg overflow-hidden">

        {/* Professional Header */}
        <div className="bg-white p-8 print:p-8 border-b-4 border-red-600">
          <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <img
                src="/mediwaste-logo.png"
                alt="MediWaste Solutions"
                className="h-16 w-auto"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">MediWaste Solutions</h1>
                <p className="text-gray-600 text-sm">Healthcare Waste Management Specialists</p>
              </div>
            </div>
            <div className="text-right text-sm text-gray-700">
              <div className="flex items-center gap-2 justify-end mb-1">
                <Phone className="w-4 h-4 text-red-600" />
                <span>+44 (01322) 879 713</span>
              </div>
              <div className="flex items-center gap-2 justify-end mb-1">
                <Mail className="w-4 h-4 text-red-600" />
                <span>quotes@mediwaste.co.uk</span>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Globe className="w-4 h-4 text-red-600" />
                <span>www.mediwaste.co.uk</span>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-light mb-4 tracking-wide text-gray-800 border-b-2 border-gray-200 pb-2">QUOTATION</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div>
              <div className="text-gray-600 text-sm mb-1">Quotation Number</div>
              <div className="text-lg font-semibold text-gray-900">{quote.quote_number}</div>
            </div>
            <div>
              <div className="text-gray-600 text-sm mb-1">Date Issued</div>
              <div className="text-lg font-semibold text-gray-900">{new Date(quote.created_at).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-gray-600 text-sm mb-1">Valid Until</div>
              <div className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-red-600" />
                {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Status Alerts */}
        {quote.status === 'accepted' && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 m-8 print:m-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-900">Quote Accepted</p>
                <p className="text-sm text-green-700">We will contact you shortly to set up your account and schedule services.</p>
              </div>
            </div>
          </div>
        )}

        {quote.status === 'declined' && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 m-8 print:m-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-900">Quote Declined</p>
                <p className="text-sm text-red-700">This quote has been declined.</p>
              </div>
            </div>
          </div>
        )}

        {expired && (
          <div className="bg-orange-50 border-l-4 border-orange-500 p-4 m-8 print:m-4">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-orange-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-orange-900">Quote Expired</p>
                <p className="text-sm text-orange-700">
                  This quote expired on {new Date(quote.valid_until).toLocaleDateString()}. Please contact us for a new quote.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Customer Details */}
        <div className="p-8 bg-gray-50 print:p-4">
          <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-red-600">Customer Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border-l-4 border-red-600">
              <div className="text-sm text-gray-600 mb-1">Company Name</div>
              <div className="font-semibold text-gray-900">{quote.company_name}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-red-600">
              <div className="text-sm text-gray-600 mb-1">Contact Name</div>
              <div className="font-semibold text-gray-900">{quote.contact_name}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-red-600">
              <div className="text-sm text-gray-600 mb-1">Email</div>
              <div className="font-semibold text-gray-900">{quote.email}</div>
            </div>
            {quote.phone && (
              <div className="bg-white p-4 rounded-lg border-l-4 border-red-600">
                <div className="text-sm text-gray-600 mb-1">Phone</div>
                <div className="font-semibold text-gray-900">{quote.phone}</div>
              </div>
            )}
            {(quote.address_line1 || quote.city || quote.postcode) && (
              <div className="bg-white p-4 rounded-lg border-l-4 border-red-600 md:col-span-2">
                <div className="text-sm text-gray-600 mb-1">Address</div>
                <div className="font-semibold text-gray-900">
                  {quote.address_line1 && <div>{quote.address_line1}</div>}
                  {quote.address_line2 && <div>{quote.address_line2}</div>}
                  {(quote.city || quote.postcode) && <div>{quote.city} {quote.postcode}</div>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Compliance Section */}
        {quote.compliance_notes && (
          <div className="mx-8 my-6 p-6 bg-green-50 border-l-4 border-green-600 rounded-r-lg print:m-4">
            <h3 className="text-green-700 font-bold text-lg mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              COMPLIANCE CONFIRMED
            </h3>
            <p className="text-gray-800 whitespace-pre-wrap">{quote.compliance_notes}</p>
          </div>
        )}

        {/* Service Comparison Table */}
        {quote.show_service_comparison && serviceOptions.length > 0 && (
          <ServiceComparison
            options={serviceOptions}
            selectedOptionId={selectedOptionId}
            onSelectOption={setSelectedOptionId}
            canRespond={canRespond}
          />
        )}

        {/* Line Items (if any) */}
        {lineItems.length > 0 && (
          <div className="p-8 print:p-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-red-600">Quote Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full shadow-sm">
                <thead className="bg-red-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Type</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Unit Price</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lineItems.map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-4 text-sm text-gray-900">{item.description}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
                          {item.item_type}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900 text-right">{item.quantity}</td>
                      <td className="px-4 py-4 text-sm text-gray-900 text-right">£{parseFloat(String(item.unit_price)).toFixed(2)}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-gray-900 text-right">£{parseFloat(String(item.total_price)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-6 flex justify-end">
              <div className="w-full md:w-80 space-y-2">
                <div className="flex justify-between py-2 text-gray-700">
                  <span>Subtotal:</span>
                  <span className="font-semibold">£{parseFloat(String(quote.subtotal)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 text-gray-700">
                  <span>VAT ({quote.tax_rate}%):</span>
                  <span className="font-semibold">£{parseFloat(String(quote.tax_amount)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-3 text-lg font-bold text-gray-900 border-t-2 border-gray-300">
                  <span>Total:</span>
                  <span className="text-red-600">£{parseFloat(String(quote.total_amount)).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {quote.notes && (
          <div className="px-8 pb-8 print:px-4 print:pb-4">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Notes</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
            </div>
          </div>
        )}

        {/* FAQ Section */}
        {faqs.length > 0 && (
          <div className="p-8 bg-gray-50 print:hidden border-t-2 border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h3>
            <p className="text-sm text-gray-600 mb-6">Find answers to common questions about our service</p>
            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <div key={faq.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className={`w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors ${
                      expandedFaq === index ? 'bg-red-50 border-b border-red-200' : ''
                    }`}
                  >
                    <span className="font-semibold text-gray-900">{faq.question}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-500 transition-transform flex-shrink-0 ml-4 ${
                        expandedFaq === index ? 'transform rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expandedFaq === index && (
                    <div className="px-6 pb-4 pt-2 text-gray-700 text-sm">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {canRespond && (
          <div className="p-8 bg-white border-t-2 border-gray-200 print:hidden">
            <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Quote Actions</h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto">
              <button
                onClick={() => setShowPaymentModal(true)}
                disabled={submitting}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-4 px-8 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <CheckCircle className="w-5 h-5" />
                Accept Quote
              </button>
              <button
                onClick={() => setShowDeclineModal(true)}
                disabled={submitting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-4 px-8 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <XCircle className="w-5 h-5" />
                Decline Quote
              </button>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 px-6 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Printer className="w-5 h-5" />
                Print Quote
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 px-6 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-5 h-5" />
                Download PDF
              </button>
            </div>
          </div>
        )}

        {/* Need Help Section */}
        <div className="mx-8 my-6 p-6 bg-gray-50 rounded-lg border-l-4 border-red-600 print:m-4">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Need Help Deciding?</h3>
          <p className="text-gray-700 mb-4">Our specialists are here to help you choose the right plan for your business.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg text-center border-t-4 border-red-600 shadow-sm">
              <div className="text-3xl mb-3">📞</div>
              <h4 className="font-bold text-gray-900">Call Our Experts</h4>
              <p className="text-red-600 font-semibold">01322 879 713</p>
              <p className="text-xs text-gray-600 mt-1">Mon-Fri 8:30am-5:30pm</p>
            </div>
            <div className="bg-white p-4 rounded-lg text-center border-t-4 border-red-600 shadow-sm">
              <div className="text-3xl mb-3">✉️</div>
              <h4 className="font-bold text-gray-900">Email Questions</h4>
              <p className="text-red-600 font-semibold">quotes@mediwaste.co.uk</p>
              <p className="text-xs text-gray-600 mt-1">Response within 2 hours</p>
            </div>
            <div className="bg-white p-4 rounded-lg text-center border-t-4 border-red-600 shadow-sm">
              <div className="text-3xl mb-3">💬</div>
              <h4 className="font-bold text-gray-900">Live Chat</h4>
              <p className="text-red-600 font-semibold">Available on our website</p>
              <p className="text-xs text-gray-600 mt-1">Instant answers</p>
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        {quote.terms_and_conditions && (
          <div className="p-8 bg-gray-50 border-t border-gray-200 print:p-4">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Terms & Conditions</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.terms_and_conditions}</p>
          </div>
        )}

        {/* Professional Footer */}
        <div className="bg-gray-800 text-white p-8 print:bg-gray-800 print:p-4">
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-3 mb-3">
              <img
                src="/mediwaste-logo.png"
                alt="MediWaste Solutions"
                className="h-12 w-auto brightness-0 invert"
              />
            </div>
            <p className="text-gray-300 text-sm">Healthcare Waste Management Specialists</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <span>+44 (01322) 879 713</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <span>quotes@mediwaste.co.uk</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span>www.mediwaste.co.uk</span>
            </div>
          </div>
          <div className="mt-6 text-center text-xs text-gray-400">
            <p>This quotation is valid for 4 weeks from the date of issue</p>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Accept Quote</h3>
            <p className="text-gray-600 mb-6">
              By accepting this quote, you confirm that you agree to the terms and conditions outlined above.
            </p>

            {selectedOption && (
              <div className="bg-red-50 rounded-lg p-4 mb-6 border-l-4 border-red-600">
                <h4 className="font-semibold text-gray-900 mb-3">Selected Option: {selectedOption.option_name}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Frequency:</span>
                    <span className="font-semibold">{selectedOption.frequency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Annual Cost:</span>
                    <span className="font-semibold">£{selectedOption.annual_cost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">VAT (20%):</span>
                    <span className="font-semibold">£{selectedOption.vat_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t-2 border-red-200 pt-2 mt-2">
                    <span>Total:</span>
                    <span className="text-red-600">£{selectedOption.total_cost.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {!selectedOption && lineItems.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4 mb-6 border-l-4 border-red-600">
                <h4 className="font-semibold text-gray-900 mb-3">Quote Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-semibold">£{parseFloat(String(quote.subtotal)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">VAT ({quote.tax_rate}%):</span>
                    <span className="font-semibold">£{parseFloat(String(quote.tax_amount)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t-2 border-red-200 pt-2 mt-2">
                    <span>Total:</span>
                    <span className="text-red-600">£{parseFloat(String(quote.total_amount)).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1" required />
                <span className="text-sm text-gray-700">
                  I confirm that I have read and agree to the terms and conditions of this quote.
                </span>
              </label>
            </div>

            <p className="text-sm text-gray-600 mb-6 p-3 bg-red-50 rounded border-l-4 border-red-600">
              <strong>Next Steps:</strong> After accepting, we will contact you within 24 hours to set up your account and schedule your first service.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                disabled={submitting}
                className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={acceptQuote}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-50 transition-colors shadow-lg"
              >
                {submitting ? 'Processing...' : 'Confirm Acceptance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Decline Quote</h3>
            <p className="text-gray-600 mb-4">
              We're sorry to see you decline this quote. Please let us know why so we can improve our service.
            </p>
            <textarea
              rows={4}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent mb-4"
              placeholder="Your feedback helps us improve (optional)..."
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeclineModal(false)}
                disabled={submitting}
                className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={declineQuote}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold disabled:opacity-50 transition-colors shadow-lg"
              >
                {submitting ? 'Processing...' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
