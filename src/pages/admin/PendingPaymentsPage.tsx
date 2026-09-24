import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, Download, DollarSign } from 'lucide-react';
import { formatGBP, formatDate, isOverdue, daysOverdue, STATUS_COLORS, STATUS_LABELS } from '../../utils/invoiceCalculations';
import type { Invoice } from '../../types/invoice';

export default function PendingPaymentsPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalInvoiced: 0,
    totalPaid: 0,
    totalPending: 0,
    totalOverdue: 0,
    partiallyPaidCount: 0,
    unpaidCount: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('mw_invoices')
          .select(`
            *,
            customer:mw_customers(company_name, contact_name)
          `)
          .in('status', ['sent', 'viewed', 'partially_paid', 'overdue', 'paid'])
          .order('due_date', { ascending: false });

        if (error) throw error;
        setInvoices((data || []) as Invoice[]);

        // Calculate stats
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        let totalInvoiced = 0, totalPaid = 0, totalPending = 0, totalOverdue = 0;
        let partiallyPaidCount = 0, unpaidCount = 0;

        for (const inv of data || []) {
          if (inv.status === 'cancelled' || inv.status === 'void' || inv.status === 'draft') continue;
          if (new Date(inv.issue_date) >= monthStart) {
            totalInvoiced += Number(inv.total_amount) || 0;
          }
          totalPaid += Number(inv.amount_paid) || 0;
          if (inv.status !== 'paid') {
            totalPending += Number(inv.amount_due) || Number(inv.total_amount) || 0;
            if (isOverdue(inv)) {
              totalOverdue += Number(inv.amount_due) || Number(inv.total_amount) || 0;
            }
            if (inv.status === 'partially_paid') partiallyPaidCount++;
            unpaidCount++;
          }
        }

        setStats({ totalInvoiced, totalPaid, totalPending, totalOverdue, partiallyPaidCount, unpaidCount });
      } catch (err) {
        console.error('Failed to load invoices:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-red-600" /></div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Pending Payments</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Invoiced This Month" value={formatGBP(stats.totalInvoiced)} color="blue" />
        <StatCard label="Total Paid" value={formatGBP(stats.totalPaid)} color="green" />
        <StatCard label="Total Pending" value={formatGBP(stats.totalPending)} color="amber" />
        <StatCard label="Total Overdue" value={formatGBP(stats.totalOverdue)} color="red" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <MiniStat label="Unpaid Invoices" value={stats.unpaidCount} />
        <MiniStat label="Partially Paid" value={stats.partiallyPaidCount} />
        <MiniStat label="Overdue" value={invoices.filter(isOverdue).length} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice #</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Issued</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Due</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Paid</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Balance</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Days</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const overdue = isOverdue(inv);
              const days = overdue ? daysOverdue(inv.due_date) : 0;
              return (
                <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-gray-700">{inv.customer?.company_name || inv.customer?.contact_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(inv.issue_date)}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDate(inv.due_date)}
                    {overdue && <span className="ml-1 text-red-600 font-medium">({days}d)</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatGBP(inv.total_amount)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{inv.amount_paid > 0 ? formatGBP(inv.amount_paid) : '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatGBP(inv.amount_due || inv.total_amount)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[inv.status] || inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">{days > 0 ? `${days}d` : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => navigate(`/admin/invoices/${inv.id}/edit`)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded" title="View/Edit">
                        <DollarSign size={14} />
                      </button>
                      <button onClick={() => window.open(`/invoice/${inv.public_token}`, '_blank')} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded" title="Public View">
                        <Download size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {invoices.length === 0 && (
          <div className="text-center py-12 text-gray-500">No invoices found.</div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-80 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
