import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Plus, FileText, Eye, FileEdit as Edit, Search, RefreshCw, CheckCircle, Clock, AlertTriangle, XCircle, DollarSign } from 'lucide-react';
import RecordPaymentModal from '../../components/RecordPaymentModal';
import AdminLayout from '../../components/admin/AdminLayout';
import { useToastContext } from '../../contexts/ToastContext';

interface Invoice {
  id: string;
  invoice_number: string;
  customer: {
    customer_number: string;
    company_name: string;
    contact_name: string;
  };
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  po_number: string | null;
  is_recurring: boolean;
  recurring_frequency: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; classes: string; icon: React.ReactNode }> = {
  draft: { label: 'Draft', classes: 'bg-gray-100 text-gray-700', icon: <Clock size={12} /> },
  sent: { label: 'Sent', classes: 'bg-blue-100 text-blue-700', icon: <FileText size={12} /> },
  paid: { label: 'Paid', classes: 'bg-green-100 text-green-700', icon: <CheckCircle size={12} /> },
  partially_paid: { label: 'Partial', classes: 'bg-amber-100 text-amber-700', icon: <DollarSign size={12} /> },
  overdue: { label: 'Overdue', classes: 'bg-red-100 text-red-700', icon: <AlertTriangle size={12} /> },
  cancelled: { label: 'Cancelled', classes: 'bg-gray-100 text-gray-500', icon: <XCircle size={12} /> },
};

export default function InvoicingPage() {
  const navigate = useNavigate();
  const { toast } = useToastContext();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [generatingRecurring, setGeneratingRecurring] = useState(false);

  useEffect(() => { fetchInvoices(); }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mw_invoices')
        .select('id, invoice_number, issue_date, due_date, subtotal, tax_amount, total_amount, status, po_number, is_recurring, recurring_frequency, customer:mw_customers!inner(customer_number, company_name, contact_name)')
        .order('issue_date', { ascending: false });
      if (error) throw error;
      setInvoices((data || []) as unknown as Invoice[]);
    } catch {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const generateRecurringInvoices = async () => {
    setGeneratingRecurring(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: due, error } = await supabase.from('mw_invoices').select('*, customer:mw_customers!inner(customer_number, company_name, billing_address, payment_terms_days)').eq('is_recurring', true).lte('recurring_next_date', today).not('status', 'eq', 'cancelled');
      if (error) throw error;
      if (!due || due.length === 0) { toast.success('No recurring invoices due'); setGeneratingRecurring(false); return; }

      let generated = 0;
      for (const inv of due) {
        const { data: items } = await supabase.from('mw_invoice_line_items').select('*').eq('invoice_id', inv.id);
        const invNum = `INV-${today.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
        const nextDate = calcNextDate(inv.recurring_next_date, inv.recurring_frequency);

        const { data: newInv, error: insErr } = await supabase.from('mw_invoices').insert({
          customer_id: inv.customer_id,
          invoice_number: invNum,
          issue_date: today,
          due_date: calcDueDate(today, inv.customer?.payment_terms_days || 30),
          subtotal: inv.subtotal,
          tax_rate: inv.tax_rate,
          tax_amount: inv.tax_amount,
          total_amount: inv.total_amount,
          status: 'draft',
          notes: inv.notes,
          po_number: inv.po_number,
          vat_number: inv.vat_number,
          payment_terms: inv.payment_terms,
          billing_address: inv.billing_address,
          is_recurring: true,
          recurring_frequency: inv.recurring_frequency,
          recurring_next_date: nextDate,
          recurring_source_id: inv.id,
        }).select('id').single();

        if (insErr) continue;

        if (items && items.length > 0 && newInv) {
          await supabase.from('mw_invoice_line_items').insert(items.map((it) => ({
            invoice_id: newInv.id,
            description: it.description,
            quantity: it.quantity,
            unit_price: it.unit_price,
            total_price: it.total_price,
            vat_rate: it.vat_rate,
            vat_amount: it.vat_amount,
            po_number: it.po_number,
          })));
        }

        await supabase.from('mw_invoices').update({ recurring_next_date: nextDate }).eq('id', inv.id);
        generated++;
      }

      toast.success(`Generated ${generated} recurring invoice${generated !== 1 ? 's' : ''}`);
      fetchInvoices();
    } catch {
      toast.error('Failed to generate recurring invoices');
    } finally {
      setGeneratingRecurring(false);
    }
  };

  const filtered = invoices.filter((inv) => {
    const matchStatus = filterStatus === 'all' || inv.status === filterStatus;
    if (!matchStatus) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return inv.invoice_number.toLowerCase().includes(q) || inv.customer.company_name?.toLowerCase().includes(q) || inv.customer.contact_name?.toLowerCase().includes(q) || inv.po_number?.toLowerCase().includes(q);
  });

  const stats = {
    total: invoices.length,
    paid: invoices.filter((i) => i.status === 'paid').length,
    overdue: invoices.filter((i) => i.status === 'overdue').length,
    totalAmount: invoices.reduce((s, i) => s + Number(i.total_amount), 0),
    outstanding: invoices.filter((i) => !['paid', 'cancelled'].includes(i.status)).reduce((s, i) => s + Number(i.total_amount), 0),
  };

  return (
    <AdminLayout pageTitle="Invoicing" breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'Invoicing' }]}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Invoicing</h1>
            <p className="text-sm text-gray-500 mt-0.5">Create, manage, and track invoices</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={generateRecurringInvoices} disabled={generatingRecurring} className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              <RefreshCw size={15} className={generatingRecurring ? 'animate-spin' : ''} />
              Generate Recurring
            </button>
            <button onClick={() => navigate('/admin/invoices/create')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Plus size={16} /> New Invoice
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Invoices</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-green-50 rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Paid</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{stats.paid}</p>
          </div>
          <div className="bg-red-50 rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Overdue</p>
            <p className="text-2xl font-bold text-red-700 mt-1">{stats.overdue}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Billed</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">£{stats.totalAmount.toFixed(2)}</p>
          </div>
          <div className="bg-amber-50 rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Outstanding</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">£{stats.outstanding.toFixed(2)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-gray-100">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search by invoice number, customer, PO number..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-400 text-sm">Loading invoices...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">No invoices found</p>
              <button onClick={() => navigate('/admin/invoices/create')} className="mt-3 text-blue-600 text-sm hover:underline">Create your first invoice</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Due</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((inv) => {
                    const sc = STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft;
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium text-gray-900">{inv.invoice_number}</span>
                            {inv.is_recurring && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-600">
                                <RefreshCw size={10} /> {inv.recurring_frequency}
                              </span>
                            )}
                          </div>
                          {inv.po_number && <p className="text-xs text-gray-400 mt-0.5">PO: {inv.po_number}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{inv.customer.company_name || inv.customer.contact_name}</p>
                          <p className="text-xs text-gray-400">{inv.customer.customer_number}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{new Date(inv.issue_date).toLocaleDateString('en-GB')}</td>
                        <td className="px-4 py-3 text-gray-600">{new Date(inv.due_date).toLocaleDateString('en-GB')}</td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-bold text-gray-900">£{Number(inv.total_amount).toFixed(2)}</p>
                          {Number(inv.tax_amount) > 0 && <p className="text-xs text-gray-400">incl. £{Number(inv.tax_amount).toFixed(2)} VAT</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.classes}`}>
                            {sc.icon}{sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => navigate(`/admin/invoices/${inv.id}/preview`)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Preview">
                              <Eye size={15} />
                            </button>
                            <button onClick={() => navigate(`/admin/invoices/${inv.id}/edit`)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg" title="Edit">
                              <Edit size={15} />
                            </button>
                            {!['paid', 'cancelled'].includes(inv.status) && (
                              <button onClick={() => { setSelectedInvoice(inv); setShowPaymentModal(true); }} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Record Payment">
                                <DollarSign size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showPaymentModal && selectedInvoice && (
        <RecordPaymentModal
          invoice={selectedInvoice}
          onClose={() => { setShowPaymentModal(false); setSelectedInvoice(null); }}
          onPaymentRecorded={() => { setShowPaymentModal(false); setSelectedInvoice(null); fetchInvoices(); }}
        />
      )}
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

function calcDueDate(from: string, days: number): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
