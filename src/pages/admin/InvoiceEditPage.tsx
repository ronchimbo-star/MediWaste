import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import { Save, Plus, Trash2, ChevronLeft, Search, X, Eye } from 'lucide-react';
import { useToastContext } from '../../contexts/ToastContext';

interface Customer {
  id: string;
  customer_number: string;
  company_name: string;
  contact_name: string;
  email: string;
  billing_address: string | null;
  payment_terms_days: number | null;
}

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  po_number: string;
}

interface Subscription {
  id: string;
  service_plan: { name: string; price: number };
}

function CustomerSearch({ customers, value, onChange }: { customers: Customer[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = customers.find((c) => c.id === value);
  const filtered = customers.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return c.company_name?.toLowerCase().includes(q) || c.contact_name?.toLowerCase().includes(q) || c.customer_number?.toLowerCase().includes(q);
  });

  return (
    <div ref={ref} className="relative">
      {selected && !open ? (
        <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm flex items-center justify-between cursor-pointer hover:border-blue-300" onClick={() => { setOpen(true); setQuery(''); setTimeout(() => inputRef.current?.focus(), 50); }}>
          <div>
            <span className="font-medium text-gray-900">{selected.company_name || selected.contact_name}</span>
            <span className="text-gray-400 ml-2">({selected.customer_number})</span>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onChange(''); }} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
        </div>
      ) : (
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input ref={inputRef} type="text" value={query} onChange={(e) => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Search customers..." className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      )}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">No customers found</div>
          ) : filtered.map((c) => (
            <button key={c.id} onClick={() => { onChange(c.id); setOpen(false); setQuery(''); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 border-b border-gray-50 last:border-b-0 ${c.id === value ? 'bg-blue-50' : ''}`}>
              <div className="flex justify-between">
                <span className="font-medium text-gray-900">{c.company_name || c.contact_name}</span>
                <span className="text-xs font-mono text-gray-400">{c.customer_number}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{c.contact_name}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function InvoiceEditPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id && id !== 'create';
  const navigate = useNavigate();
  const { toast } = useToastContext();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const [customerId, setCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('draft');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState('monthly');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: '', quantity: 1, unit_price: 0, po_number: '' }]);

  useEffect(() => {
    fetchCustomers();
    if (isEdit) fetchInvoice();
  }, [id]);

  useEffect(() => {
    if (customerId) {
      fetchSubscriptions(customerId);
      const cust = customers.find((c) => c.id === customerId);
      if (cust?.payment_terms_days && !isEdit) {
        const issue = new Date(issueDate);
        const due = new Date(issue);
        due.setDate(due.getDate() + cust.payment_terms_days);
        setDueDate(due.toISOString().split('T')[0]);
        setPaymentTerms(`Net ${cust.payment_terms_days} days`);
      }
    }
  }, [customerId, customers]);

  useEffect(() => {
    if (!isEdit && !customerId) {
      const issue = new Date(issueDate);
      const due = new Date(issue);
      due.setDate(due.getDate() + 30);
      setDueDate(due.toISOString().split('T')[0]);
    }
  }, [issueDate]);

  const fetchCustomers = async () => {
    const { data } = await supabase.from('mw_customers').select('id, customer_number, company_name, contact_name, email, billing_address, payment_terms_days').order('company_name');
    if (data) setCustomers(data);
  };

  const fetchSubscriptions = async (custId: string) => {
    const { data } = await supabase.from('mw_subscriptions').select('id, service_plan:mw_service_plans(name, price)').eq('customer_id', custId).eq('status', 'active');
    if (data) {
      setSubscriptions(data.map((sub) => ({ id: sub.id, service_plan: Array.isArray(sub.service_plan) ? sub.service_plan[0] : sub.service_plan })) as Subscription[]);
    }
  };

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const { data: inv, error } = await supabase.from('mw_invoices').select('*').eq('id', id).single();
      if (error) throw error;
      setCustomerId(inv.customer_id);
      setIssueDate(inv.issue_date);
      setDueDate(inv.due_date);
      setPoNumber(inv.po_number || '');
      setVatNumber(inv.vat_number || '');
      setNotes(inv.notes || '');
      setStatus(inv.status);
      setIsRecurring(inv.is_recurring || false);
      setRecurringFrequency(inv.recurring_frequency || 'monthly');
      setPaymentTerms(inv.payment_terms || '');

      const { data: items } = await supabase.from('mw_invoice_line_items').select('*').eq('invoice_id', id);
      if (items && items.length > 0) {
        setLineItems(items.map((it) => ({
          description: it.description,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
          po_number: it.po_number || '',
        })));
      }
    } catch {
      toast.error('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unit_price: 0, po_number: '' }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const addSubscriptionItem = (sub: Subscription) => {
    setLineItems([...lineItems, { description: sub.service_plan.name, quantity: 1, unit_price: Number(sub.service_plan.price), po_number: '' }]);
  };

  const VAT_RATE = 20;
  const calcLineNet = (item: LineItem) => item.quantity * item.unit_price;
  const calcLineVat = (item: LineItem) => (calcLineNet(item) * VAT_RATE) / 100;
  const calcLineTotal = (item: LineItem) => calcLineNet(item) + calcLineVat(item);
  const subtotal = lineItems.reduce((s, it) => s + calcLineNet(it), 0);
  const totalVat = lineItems.reduce((s, it) => s + calcLineVat(it), 0);
  const grandTotal = subtotal + totalVat;

  const handleSave = async () => {
    if (!customerId) { toast.error('Please select a customer'); return; }
    if (lineItems.some((it) => !it.description || it.unit_price <= 0)) { toast.error('Please fill in all line items'); return; }

    setSaving(true);
    try {
      const cust = customers.find((c) => c.id === customerId);
      const invoicePayload = {
        customer_id: customerId,
        issue_date: issueDate,
        due_date: dueDate,
        po_number: poNumber || null,
        vat_number: vatNumber || null,
        payment_terms: paymentTerms || null,
        billing_address: cust?.billing_address || null,
        subtotal,
        tax_rate: 20,
        tax_amount: totalVat,
        total_amount: grandTotal,
        status,
        notes: notes || null,
        is_recurring: isRecurring,
        recurring_frequency: isRecurring ? recurringFrequency : null,
        recurring_next_date: isRecurring ? calcNextDate(issueDate, recurringFrequency) : null,
        updated_at: new Date().toISOString(),
      };

      let invoiceId = id;

      if (isEdit) {
        const { error } = await supabase.from('mw_invoices').update(invoicePayload).eq('id', id);
        if (error) throw error;
        await supabase.from('mw_invoice_line_items').delete().eq('invoice_id', id);
      } else {
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const invoiceNumber = `INV-${today}-${Date.now().toString().slice(-4)}`;
        const { data, error } = await supabase.from('mw_invoices').insert({ ...invoicePayload, invoice_number: invoiceNumber }).select('id').single();
        if (error) throw error;
        invoiceId = data.id;
      }

      const itemsPayload = lineItems.map((it) => ({
        invoice_id: invoiceId,
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
        total_price: calcLineNet(it),
        vat_rate: VAT_RATE,
        vat_amount: calcLineVat(it),
        po_number: it.po_number || null,
      }));

      const { error: itemsError } = await supabase.from('mw_invoice_line_items').insert(itemsPayload);
      if (itemsError) throw itemsError;

      toast.success(isEdit ? 'Invoice updated' : 'Invoice created');
      navigate(`/admin/invoices/${invoiceId}/preview`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  const selectedCustomer = customers.find((c) => c.id === customerId);

  if (loading) {
    return (
      <AdminLayout pageTitle="Loading..." breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Invoices', path: '/admin/invoices' }, { label: 'Loading...' }]}>
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle={isEdit ? 'Edit Invoice' : 'New Invoice'} breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Invoices', path: '/admin/invoices' }, { label: isEdit ? 'Edit' : 'New' }]}>
      <div className="p-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/admin/invoices')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
            <ChevronLeft size={16} /> Back to Invoices
          </button>
          <div className="flex items-center gap-2">
            {isEdit && (
              <button onClick={() => navigate(`/admin/invoices/${id}/preview`)} className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium">
                <Eye size={15} /> Preview
              </button>
            )}
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Save size={15} /> {saving ? 'Saving...' : 'Save Invoice'}
            </button>
          </div>
        </div>

        <div className="space-y-5">
          {/* Customer & Dates */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Invoice Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer <span className="text-red-500">*</span></label>
                <CustomerSearch customers={customers} value={customerId} onChange={setCustomerId} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PO Number</label>
                <input type="text" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="e.g. PO-12345" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                <input type="text" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="e.g. Net 30 days" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            {selectedCustomer && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-gray-900">{selectedCustomer.company_name || selectedCustomer.contact_name}</p>
                <p className="text-gray-500">{selectedCustomer.email}</p>
                {selectedCustomer.billing_address && <p className="text-gray-500 mt-1">{selectedCustomer.billing_address}</p>}
              </div>
            )}
          </div>

          {/* Recurring */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm font-semibold text-gray-900">Recurring Invoice</span>
              </label>
            </div>
            {isRecurring && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                  <select value={recurringFrequency} onChange={(e) => setRecurringFrequency(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annually">Annually</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <p className="text-sm text-gray-500">The system will auto-generate the next invoice based on this frequency when the current period ends.</p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Add from Subscriptions */}
          {customerId && subscriptions.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Quick Add from Active Subscriptions</h3>
              <div className="flex flex-wrap gap-2">
                {subscriptions.map((sub) => (
                  <button key={sub.id} type="button" onClick={() => addSubscriptionItem(sub)} className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 text-sm">
                    {sub.service_plan.name} - £{Number(sub.service_plan.price).toFixed(2)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Line Items */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Line Items</h2>
              <button type="button" onClick={addLineItem} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
                <Plus size={14} /> Add Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left pb-2 font-medium text-gray-500 text-xs uppercase">Description</th>
                    <th className="text-left pb-2 font-medium text-gray-500 text-xs uppercase w-16">Qty</th>
                    <th className="text-left pb-2 font-medium text-gray-500 text-xs uppercase w-28">Unit Price</th>
                    <th className="text-left pb-2 font-medium text-gray-500 text-xs uppercase w-28">PO Number</th>
                    <th className="text-right pb-2 font-medium text-gray-500 text-xs uppercase w-28">Total (inc. VAT)</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {lineItems.map((item, index) => (
                    <tr key={index} className="group">
                      <td className="py-2 pr-2">
                        <input type="text" value={item.description} onChange={(e) => updateLineItem(index, 'description', e.target.value)} placeholder="Service description..." className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </td>
                      <td className="py-2 pr-2">
                        <input type="number" value={item.quantity} onChange={(e) => updateLineItem(index, 'quantity', Number(e.target.value))} min="1" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </td>
                      <td className="py-2 pr-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">£</span>
                          <input type="number" value={item.unit_price} onChange={(e) => updateLineItem(index, 'unit_price', Number(e.target.value))} min="0" step="0.01" className="w-full border border-gray-200 rounded-lg pl-5 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </td>
                      <td className="py-2 pr-2">
                        <input type="text" value={item.po_number} onChange={(e) => updateLineItem(index, 'po_number', e.target.value)} placeholder="PO #" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </td>
                      <td className="py-2 pr-2 text-right font-medium text-gray-900">
                        £{calcLineTotal(item).toFixed(2)}
                      </td>
                      <td className="py-2">
                        <button type="button" onClick={() => removeLineItem(index)} disabled={lineItems.length === 1} className="p-1 text-gray-300 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-gray-100 pt-4 flex justify-end">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal (Net)</span>
                  <span>£{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>VAT (20%)</span>
                  <span>£{totalVat.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-2">
                  <span>Total</span>
                  <span>£{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Notes</h2>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Add any additional notes or payment instructions..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function calcNextDate(from: string, freq: string): string {
  const d = new Date(from);
  if (freq === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (freq === 'quarterly') d.setMonth(d.getMonth() + 3);
  else if (freq === 'annually') d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
}
