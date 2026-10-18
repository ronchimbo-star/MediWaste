import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { ArrowLeft, Sparkles, Loader2, AlertCircle, User, Mail, MessageSquare } from 'lucide-react';
import type { AIExtractionResult } from '../../types/invoice';

interface Customer {
  id: string;
  company_name: string | null;
  contact_name: string;
  email: string;
}

export default function ConversationIntakePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversationText, setConversationText] = useState('');
  const [subject, setSubject] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [defaultVatRate, setDefaultVatRate] = useState(20);
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState(30);

  useEffect(() => {
    supabase.from('mw_customers').select('id, company_name, contact_name, email').order('company_name').limit(200)
      .then(({ data }) => { if (data) setCustomers(data); });
    supabase.from('mw_invoice_settings').select('vat_rate_default, default_payment_terms_days').eq('id', 'default').maybeSingle()
      .then(({ data }) => {
        if (data) {
          setDefaultVatRate(data.vat_rate_default || 20);
          setDefaultPaymentTerms(data.default_payment_terms_days || 30);
        }
      });
  }, []);

  const filteredCustomers = customers.filter(c => {
    const q = customerSearch.toLowerCase();
    return !q || c.company_name?.toLowerCase().includes(q) || c.contact_name?.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });

  const handleAnalyze = async () => {
    if (conversationText.trim().length < 10) {
      setError('Please paste a longer conversation.');
      return;
    }
    setAnalyzing(true);
    setError('');
    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-conversation', {
        body: {
          conversationText,
          customerId: customerId || null,
          subject,
          senderEmail,
          createdBy: user?.email || 'admin',
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      if (!data?.extracted) throw new Error('No extraction result returned');

      const extracted: AIExtractionResult = data.extracted;
      const conversationId = data.conversationId;

      navigate('/admin/invoices/review', {
        state: { extracted, conversationId, customerId, conversationText }
      });
    } catch (err: any) {
      setError(err.message || 'Failed to analyse conversation');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleClear = () => {
    setConversationText('');
    setSubject('');
    setSenderEmail('');
    setCustomerId('');
    setCustomerSearch('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button onClick={() => navigate('/admin/invoices')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 text-sm">
          <ArrowLeft size={16} /> Back to Invoices
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Invoice from Conversation</h1>
          <p className="text-gray-600">
            Paste an email conversation below. The AI will extract customer details, services, and pricing to create a draft invoice for your review.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User size={18} className="text-red-600" /> Customer (Optional)
          </h2>
          <div className="relative">
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
              onFocus={() => setShowCustomerDropdown(true)}
              onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
              placeholder="Search existing customer by name or email..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            {showCustomerDropdown && filteredCustomers.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {filteredCustomers.slice(0, 10).map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCustomerId(c.id);
                      setCustomerSearch(`${c.company_name || c.contact_name} — ${c.email}`);
                      setShowCustomerDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  >
                    <div className="font-medium text-gray-900">{c.company_name || c.contact_name}</div>
                    <div className="text-sm text-gray-500">{c.email}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {customerId && (
            <button
              onClick={() => { setCustomerId(''); setCustomerSearch(''); }}
              className="mt-2 text-sm text-red-600 hover:text-red-700"
            >
              Clear selection
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Mail size={18} className="text-red-600" /> Email Details (Optional)
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject line"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Sender Email</label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="sender@example.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare size={18} className="text-red-600" /> Email Conversation
          </h2>
          <textarea
            value={conversationText}
            onChange={(e) => setConversationText(e.target.value)}
            rows={16}
            placeholder="Paste the full email conversation here. Include all back-and-forth messages, customer details, service discussions, and any agreed pricing."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm resize-y"
          />
          <p className="mt-2 text-sm text-gray-500">
            {conversationText.length} characters — include as much of the conversation as possible for better extraction.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start gap-2">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            onClick={handleAnalyze}
            disabled={analyzing || conversationText.trim().length < 10}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {analyzing ? 'Analysing...' : 'Analyse Conversation'}
          </button>
          <button
            onClick={handleClear}
            className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <p className="font-medium mb-1">Privacy notice</p>
          <p>The pasted conversation is processed by OpenAI to create a draft invoice. It is stored in your database for audit purposes. The AI never sends emails or creates invoices automatically — you review and approve everything.</p>
        </div>

        <div className="mt-4 text-sm text-gray-500">
          <p>Default VAT rate: {defaultVatRate}% | Default payment terms: {defaultPaymentTerms} days</p>
        </div>
      </div>
    </div>
  );
}
