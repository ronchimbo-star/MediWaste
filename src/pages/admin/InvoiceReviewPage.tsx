import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import {
  ArrowLeft, Save, AlertCircle, AlertTriangle, Info, Plus, Trash2,
  ChevronDown, ChevronUp, ChevronRight, Loader2
} from 'lucide-react';
import type { AIExtractionResult, InvoiceLineItem } from '../../types/invoice';
import { calculateLineTotals, calculateInvoiceTotals, formatGBP } from '../../utils/invoiceCalculations';

interface ReviewState {
  extracted: AIExtractionResult;
  conversationId: string;
  customerId: string;
  conversationText: string;
}

export default function InvoiceReviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [state, setState] = useState<ReviewState | null>(null);
  const [customer, setCustomer] = useState({
    name: '', company_name: '', email: '', telephone: '',
    billing_address: '', site_address: '',
    company_registration_number: '', vat_number: '',
  });
  const [invoiceMeta, setInvoiceMeta] = useState({
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    payment_terms_days: 30,
    customer_reference: '',
    purchase_order_number: '',
    notes: '',
    internal_notes: '',
  });
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [emailData, setEmailData] = useState({
    recipient_name: '', subject: '', salutation: '', body: '', sign_off: '',
  });
  const [discountAmount, setDiscountAmount] = useState(0);
  const [defaultVatRate, setDefaultVatRate] = useState(20);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showConversation, setShowConversation] = useState(false);
  const [, setSavedInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    const navState = location.state as ReviewState | null;
    if (!navState?.extracted) {
      navigate('/admin/invoices/new-from-conversation');
      return;
    }
    setState(navState);
    const ex = navState.extracted;

    setCustomer({
      name: ex.customer?.name || '',
      company_name: ex.customer?.company_name || '',
      email: ex.customer?.email || '',
      telephone: ex.customer?.telephone || '',
      billing_address: ex.customer?.billing_address || '',
      site_address: ex.customer?.site_address || '',
      company_registration_number: ex.customer?.company_registration_number || '',
      vat_number: ex.customer?.vat_number || '',
    });

    const dueDateVal = ex.invoice?.due_date || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    setInvoiceMeta({
      invoice_date: ex.invoice?.invoice_date || new Date().toISOString().slice(0, 10),
      due_date: dueDateVal,
      payment_terms_days: ex.invoice?.payment_terms_days ?? 30,
      customer_reference: ex.invoice?.customer_reference || '',
      purchase_order_number: ex.invoice?.purchase_order_number || '',
      notes: ex.invoice?.notes || '',
      internal_notes: '',
    });

    setLineItems(
      (ex.line_items || []).map((item, i) => ({
        sort_order: i,
        description: item.description || '',
        waste_type: item.waste_type || '',
        service_type: item.service_type || '',
        quantity: item.quantity || 1,
        unit: item.unit || '',
        unit_price: item.unit_price || 0,
        vat_rate: item.vat_rate ?? defaultVatRate,
        vat_amount: 0,
        line_total: 0,
        total_price: 0,
        pricing_status: item.pricing_status || 'confirmed',
        source_text: item.source_text || '',
        po_number: null,
      }))
    );

    setEmailData({
      recipient_name: ex.email?.recipient_name || ex.customer?.name || '',
      subject: ex.email?.subject || '',
      salutation: ex.email?.salutation || `Dear ${ex.customer?.name || 'Customer'},`,
      body: ex.email?.body || '',
      sign_off: ex.email?.sign_off || 'Kind regards,\nMediWaste',
    });
  }, [location.state, navigate]);

  useEffect(() => {
    supabase.from('mw_invoice_settings').select('vat_rate_default, default_payment_terms_days').eq('id', 'default').maybeSingle()
      .then(({ data }) => {
        if (data) {
          setDefaultVatRate(data.vat_rate_default || 20);
          if (!invoiceMeta.payment_terms_days) {
            setInvoiceMeta(prev => ({ ...prev, payment_terms_days: data.default_payment_terms_days || 30 }));
          }
        }
      });
  }, []);

  const totals = calculateInvoiceTotals(lineItems, discountAmount);
  const warnings = state?.extracted?.warnings || [];
  const missingInfo = state?.extracted?.missing_information || [];
  const conflicts = state?.extracted?.conflicts || [];
  const confidence = state?.extracted?.confidence || {};

  const updateLineItem = (index: number, field: string, value: any) => {
    setLineItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      const { lineNet, lineVat, lineTotal } = calculateLineTotals(updated[index]);
      updated[index].total_price = lineNet;
      updated[index].vat_amount = lineVat;
      updated[index].line_total = lineTotal;
      return updated;
    });
  };

  const addLineItem = () => {
    setLineItems(prev => [...prev, {
      sort_order: prev.length,
      description: '', waste_type: '', service_type: '',
      quantity: 1, unit: '', unit_price: 0, vat_rate: defaultVatRate,
      vat_amount: 0, line_total: 0, total_price: 0,
      pricing_status: 'confirmed', source_text: '', po_number: null,
    }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, sort_order: i })));
  };

  const moveLineItem = (index: number, dir: 'up' | 'down') => {
    setLineItems(prev => {
      const updated = [...prev];
      const swap = dir === 'up' ? index - 1 : index + 1;
      if (swap < 0 || swap >= updated.length) return prev;
      [updated[index], updated[swap]] = [updated[swap], updated[index]];
      return updated.map((item, i) => ({ ...item, sort_order: i }));
    });
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setError('');
    try {
      // Get or create customer
      let customerId = state?.customerId || '';
      if (!customerId && customer.email) {
        const { data: existing } = await supabase.from('mw_customers')
          .select('id').eq('email', customer.email).maybeSingle();
        if (existing) {
          customerId = existing.id;
        } else {
          const { data: newCustomer, error: custErr } = await supabase.from('mw_customers').insert({
            contact_name: customer.name || customer.company_name || 'Unknown',
            company_name: customer.company_name || null,
            email: customer.email,
            phone: customer.telephone || null,
            billing_address: customer.billing_address || null,
            source: 'conversation',
            payment_terms_days: invoiceMeta.payment_terms_days,
          }).select().single();
          if (custErr) throw new Error(`Failed to create customer: ${custErr.message}`);
          customerId = newCustomer.id;
        }
      }

      // Generate invoice number
      const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number');
      const { data: publicToken } = await supabase.rpc('generate_invoice_public_token');

      // Fetch bank details snapshot
      const { data: settings } = await supabase.from('mw_invoice_settings')
        .select('*').eq('id', 'default').maybeSingle();

      const dueDate = new Date(invoiceMeta.due_date);
      const issueDate = new Date(invoiceMeta.invoice_date);
      void dueDate; void issueDate;

      const { data: invoice, error: invErr } = await supabase.from('mw_invoices').insert({
        invoice_number: invoiceNumber,
        public_token: publicToken,
        customer_id: customerId,
        source_type: 'conversation',
        source_conversation_id: state?.conversationId || null,
        status: 'draft',
        issue_date: invoiceMeta.invoice_date,
        due_date: invoiceMeta.due_date,
        payment_terms: `${invoiceMeta.payment_terms_days} days`,
        currency: 'GBP',
        subtotal: totals.subtotal,
        tax_rate: defaultVatRate,
        tax_amount: totals.vatAmount,
        total_amount: totals.total,
        discount_amount: discountAmount,
        amount_due: totals.total,
        payment_reference: invoiceNumber,
        payment_url: settings?.payment_link_url || null,
        bank_details_snapshot: settings ? {
          bank_name: settings.bank_name, account_name: settings.account_name,
          sort_code: settings.sort_code, account_number: settings.account_number,
        } : null,
        billing_address: customer.billing_address || null,
        site_address: customer.site_address || null,
        po_number: invoiceMeta.purchase_order_number || null,
        vat_number: customer.vat_number || null,
        customer_reference: invoiceMeta.customer_reference || null,
        notes: invoiceMeta.notes || null,
        internal_notes: invoiceMeta.internal_notes || null,
        recipient_email: customer.email || null,
        email_subject: emailData.subject || null,
        email_salutation: emailData.salutation || null,
        email_body: emailData.body || null,
        email_sign_off: emailData.sign_off || null,
        created_by: user?.email || 'admin',
      }).select().single();

      if (invErr) throw new Error(`Failed to create invoice: ${invErr.message}`);

      // Insert line items
      if (lineItems.length > 0) {
        const itemsToInsert = lineItems.map((item, i) => ({
          invoice_id: invoice.id,
          sort_order: i,
          description: item.description,
          waste_type: item.waste_type || null,
          service_type: item.service_type || null,
          quantity: item.quantity,
          unit: item.unit || null,
          unit_price: item.unit_price,
          vat_rate: item.vat_rate,
          vat_amount: item.vat_amount,
          total_price: item.total_price,
          pricing_status: item.pricing_status,
          source_text: item.source_text || null,
        }));
        const { error: itemsErr } = await supabase.from('mw_invoice_line_items').insert(itemsToInsert);
        if (itemsErr) throw new Error(`Failed to save line items: ${itemsErr.message}`);
      }

      // Log event
      await supabase.from('invoice_events').insert({
        invoice_id: invoice.id,
        event_type: 'draft_created',
        new_status: 'draft',
        event_data: { conversation_id: state?.conversationId },
        created_by: user?.email || 'admin',
      });

      setSavedInvoiceId(invoice.id);
      navigate(`/admin/invoices/${invoice.id}/edit`);
    } catch (err: any) {
      setError(err.message || 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  if (!state) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button onClick={() => navigate('/admin/invoices/new-from-conversation')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 text-sm">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Review AI-Extracted Invoice</h1>
          <p className="text-gray-600">Review and edit all fields below before saving as a draft. AI-generated content requires your verification.</p>
        </div>

        {/* Warnings */}
        {(warnings.length > 0 || missingInfo.length > 0 || conflicts.length > 0) && (
          <div className="mb-6 space-y-3">
            {warnings.map((w, i) => (
              <div key={`w-${i}`} className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-start gap-2">
                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" /> <span>{w}</span>
              </div>
            ))}
            {missingInfo.map((m, i) => (
              <div key={`m-${i}`} className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg flex items-start gap-2">
                <Info size={18} className="flex-shrink-0 mt-0.5" /> <span>Missing: {m}</span>
              </div>
            ))}
            {conflicts.map((c, i) => (
              <div key={`c-${i}`} className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-2">
                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" /> <span>Conflict: {c}</span>
              </div>
            ))}
          </div>
        )}

        {/* Confidence */}
        {(confidence as any).overall > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">AI Confidence Scores</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              {Object.entries(confidence as any).map(([key, val]: [string, any]) => (
                <div key={key} className="text-center">
                  <div className={`text-lg font-bold ${(val as number) >= 80 ? 'text-green-600' : (val as number) >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                    {val}%
                  </div>
                  <div className="text-xs text-gray-500 capitalize">{key.replace('_', ' ')}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customer Details */}
        <Section title="Customer Details">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Contact Name" value={customer.name} onChange={(v) => setCustomer({...customer, name: v})} />
            <Field label="Company Name" value={customer.company_name} onChange={(v) => setCustomer({...customer, company_name: v})} />
            <Field label="Email" value={customer.email} onChange={(v) => setCustomer({...customer, email: v})} required />
            <Field label="Telephone" value={customer.telephone} onChange={(v) => setCustomer({...customer, telephone: v})} />
            <Field label="Billing Address" value={customer.billing_address} onChange={(v) => setCustomer({...customer, billing_address: v})} textarea />
            <Field label="Site Address" value={customer.site_address} onChange={(v) => setCustomer({...customer, site_address: v})} textarea />
            <Field label="Company Reg. Number" value={customer.company_registration_number} onChange={(v) => setCustomer({...customer, company_registration_number: v})} />
            <Field label="VAT Number" value={customer.vat_number} onChange={(v) => setCustomer({...customer, vat_number: v})} />
          </div>
        </Section>

        {/* Invoice Meta */}
        <Section title="Invoice Details">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Invoice Date" type="date" value={invoiceMeta.invoice_date} onChange={(v) => setInvoiceMeta({...invoiceMeta, invoice_date: v})} />
            <Field label="Due Date" type="date" value={invoiceMeta.due_date} onChange={(v) => setInvoiceMeta({...invoiceMeta, due_date: v})} required />
            <Field label="Payment Terms (days)" type="number" value={String(invoiceMeta.payment_terms_days)} onChange={(v) => setInvoiceMeta({...invoiceMeta, payment_terms_days: parseInt(v) || 30})} />
            <Field label="Customer Reference" value={invoiceMeta.customer_reference} onChange={(v) => setInvoiceMeta({...invoiceMeta, customer_reference: v})} />
            <Field label="PO Number" value={invoiceMeta.purchase_order_number} onChange={(v) => setInvoiceMeta({...invoiceMeta, purchase_order_number: v})} />
            <Field label="Discount Amount (£)" type="number" value={String(discountAmount)} onChange={(v) => setDiscountAmount(parseFloat(v) || 0)} />
            <Field label="Notes (visible on invoice)" value={invoiceMeta.notes} onChange={(v) => setInvoiceMeta({...invoiceMeta, notes: v})} textarea />
            <Field label="Internal Notes (not visible to customer)" value={invoiceMeta.internal_notes} onChange={(v) => setInvoiceMeta({...invoiceMeta, internal_notes: v})} textarea />
          </div>
        </Section>

        {/* Line Items */}
        <Section title="Line Items">
          <div className="space-y-3">
            {lineItems.map((item, i) => {
              const { lineTotal } = calculateLineTotals(item);
              return (
                <div key={i} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-500">Item {i + 1}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => moveLineItem(i, 'up')} disabled={i === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronUp size={16} /></button>
                      <button onClick={() => moveLineItem(i, 'down')} disabled={i === lineItems.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronDown size={16} /></button>
                      <button onClick={() => removeLineItem(i)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-12 gap-3">
                    <div className="md:col-span-4">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                      <input type="text" value={item.description} onChange={(e) => updateLineItem(i, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Waste Type</label>
                      <input type="text" value={item.waste_type} onChange={(e) => updateLineItem(i, 'waste_type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm" />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Qty</label>
                      <input type="number" step="any" value={item.quantity} onChange={(e) => updateLineItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Unit Price (£)</label>
                      <input type="number" step="0.01" value={item.unit_price} onChange={(e) => updateLineItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm" />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">VAT %</label>
                      <input type="number" step="0.1" value={item.vat_rate} onChange={(e) => updateLineItem(i, 'vat_rate', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Total</label>
                      <div className="px-3 py-2 text-sm font-semibold text-gray-900">{formatGBP(lineTotal)}</div>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-3 mt-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
                      <input type="text" value={item.unit} onChange={(e) => updateLineItem(i, 'unit', e.target.value)} placeholder="per collection, per month"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Pricing Status</label>
                      <select value={item.pricing_status} onChange={(e) => updateLineItem(i, 'pricing_status', e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs">
                        <option value="confirmed">Confirmed</option>
                        <option value="estimated">Estimated</option>
                        <option value="missing">Missing</option>
                        <option value="conflicting">Conflicting</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Service Type</label>
                      <input type="text" value={item.service_type} onChange={(e) => updateLineItem(i, 'service_type', e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs" />
                    </div>
                  </div>
                  {item.pricing_status !== 'confirmed' && (
                    <div className={`mt-2 text-xs px-2 py-1 rounded ${
                      item.pricing_status === 'missing' ? 'bg-red-50 text-red-700' :
                      item.pricing_status === 'conflicting' ? 'bg-red-50 text-red-700' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                      {item.pricing_status === 'missing' ? 'Price is missing — enter manually' :
                       item.pricing_status === 'conflicting' ? 'Conflicting prices found in conversation — verify' :
                       'Price is estimated — verify before sending'}
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={addLineItem} className="flex items-center gap-2 text-red-600 hover:text-red-700 text-sm font-medium">
              <Plus size={16} /> Add Line Item
            </button>
          </div>

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span className="font-medium">{formatGBP(totals.subtotal)}</span></div>
              {discountAmount > 0 && <div className="flex justify-between"><span className="text-gray-600">Discount</span><span className="font-medium text-red-600">-{formatGBP(discountAmount)}</span></div>}
              <div className="flex justify-between"><span className="text-gray-600">VAT</span><span className="font-medium">{formatGBP(totals.vatAmount)}</span></div>
              <div className="flex justify-between border-t border-gray-300 pt-2"><span className="font-bold text-gray-900">Total Due</span><span className="font-bold text-gray-900 text-lg">{formatGBP(totals.total)}</span></div>
            </div>
          </div>
        </Section>

        {/* Email */}
        <Section title="Email Content">
          <div className="space-y-4">
            <Field label="Recipient Name" value={emailData.recipient_name} onChange={(v) => setEmailData({...emailData, recipient_name: v})} />
            <Field label="Subject" value={emailData.subject} onChange={(v) => setEmailData({...emailData, subject: v})} />
            <Field label="Salutation" value={emailData.salutation} onChange={(v) => setEmailData({...emailData, salutation: v})} />
            <Field label="Email Body" value={emailData.body} onChange={(v) => setEmailData({...emailData, body: v})} textarea rows={6} />
            <Field label="Sign-off" value={emailData.sign_off} onChange={(v) => setEmailData({...emailData, sign_off: v})} textarea rows={3} />
          </div>
        </Section>

        {/* Original Conversation */}
        <Section title="Original Conversation">
          <button onClick={() => setShowConversation(!showConversation)} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            {showConversation ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            {showConversation ? 'Hide' : 'Show'} original conversation
          </button>
          {showConversation && (
            <pre className="mt-3 bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap">{state.conversationText}</pre>
          )}
        </Section>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start gap-2">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" /> <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 mt-8">
          <button onClick={handleSaveDraft} disabled={saving}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? 'Saving...' : 'Save as Draft'}
          </button>
          <button onClick={() => navigate('/admin/invoices/new-from-conversation')}
            className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', textarea, rows, required }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; textarea?: boolean; rows?: number; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows || 3}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent" />
      )}
    </div>
  );
}


