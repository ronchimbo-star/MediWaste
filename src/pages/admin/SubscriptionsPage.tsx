import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Plus, Search, FileEdit as Edit2, Trash2, X, ArrowLeft } from 'lucide-react';
import { useToastContext } from '../../contexts/ToastContext';

interface Subscription {
  id: string;
  customer_id: string;
  service_plan_id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  service_frequency: string;
  preferred_day: string;
  special_instructions: string | null;
  auto_renew: boolean;
  customer: { customer_number: string; company_name: string; contact_name: string; };
  service_plan: { id: string; name: string; price: number; billing_frequency: string; };
}

const STATUS_OPTIONS = ['active', 'paused', 'cancelled', 'pending'];
const FREQUENCY_OPTIONS = ['weekly', 'fortnightly', 'monthly', 'quarterly', 'annually'];
const DAYS_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Any'];

const emptyForm = {
  customer_id: '', service_plan_id: '', status: 'active', start_date: '', end_date: '',
  service_frequency: 'monthly', preferred_day: 'Any', special_instructions: '', auto_renew: true,
};

function statusBadge(s: string) {
  const m: Record<string, string> = { active: 'bg-green-100 text-green-800', paused: 'bg-yellow-100 text-yellow-800', cancelled: 'bg-red-100 text-red-800', pending: 'bg-gray-100 text-gray-800' };
  return m[s] || 'bg-gray-100 text-gray-800';
}

export default function SubscriptionsPage() {
  const navigate = useNavigate();
  const { toast } = useToastContext();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mw_subscriptions')
        .select('*, customer:mw_customers(customer_number,company_name,contact_name), service_plan:mw_service_plans(id,name,price,billing_frequency)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Subscription[];
    },
  });

  const { data: customers } = useQuery({
    queryKey: ['customers-list'],
    queryFn: async () => {
      const { data } = await supabase.from('mw_customers').select('id,customer_number,company_name,contact_name').eq('status', 'active').order('company_name');
      return data || [];
    },
  });

  const { data: servicePlans } = useQuery({
    queryKey: ['service-plans'],
    queryFn: async () => {
      const { data } = await supabase.from('mw_service_plans').select('id,name,price,billing_frequency').eq('is_active', true).order('name');
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (f: typeof form) => {
      const payload = {
        customer_id: f.customer_id, service_plan_id: f.service_plan_id, status: f.status,
        start_date: f.start_date, end_date: f.end_date || null,
        service_frequency: f.service_frequency, preferred_day: f.preferred_day,
        special_instructions: f.special_instructions || null, auto_renew: f.auto_renew,
      };
      if (editing) {
        const { error } = await supabase.from('mw_subscriptions').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('mw_subscriptions').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success(editing ? 'Subscription updated' : 'Subscription created');
      setShowModal(false);
      setEditing(null);
      setForm({ ...emptyForm });
    },
    onError: () => toast.error('Failed to save subscription'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('mw_subscriptions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('Subscription removed');
    },
    onError: () => toast.error('Failed to delete subscription'),
  });

  function openAdd() { setEditing(null); setForm({ ...emptyForm }); setShowModal(true); }
  function openEdit(s: Subscription) {
    setEditing(s);
    setForm({
      customer_id: s.customer_id, service_plan_id: s.service_plan_id, status: s.status,
      start_date: s.start_date || '', end_date: s.end_date || '',
      service_frequency: s.service_frequency, preferred_day: s.preferred_day,
      special_instructions: s.special_instructions || '', auto_renew: s.auto_renew,
    });
    setShowModal(true);
  }

  const filtered = (subscriptions || []).filter(s =>
    s.customer?.customer_number?.toLowerCase().includes(search.toLowerCase()) ||
    s.customer?.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.customer?.contact_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate('/admin')} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm"><ArrowLeft size={16} />Dashboard</button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
          <p className="text-gray-600 mt-1">Manage customer subscriptions and service plans</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search by customer..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm whitespace-nowrap">
          <Plus size={16} />Add Subscription
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12"><div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Customer', 'Service Plan', 'Frequency', 'Start Date', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No subscriptions found</td></tr>
                ) : filtered.map(sub => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{sub.customer?.customer_number}</div>
                      <div className="text-sm text-gray-500">{sub.customer?.company_name || sub.customer?.contact_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{sub.service_plan?.name}</div>
                      <div className="text-sm text-gray-500">£{Number(sub.service_plan?.price || 0).toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{sub.service_frequency} ({sub.preferred_day})</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sub.start_date ? new Date(sub.start_date).toLocaleDateString('en-GB') : '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusBadge(sub.status)}`}>{sub.status}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(sub)} className="text-blue-600 hover:text-blue-900" title="Edit"><Edit2 size={16} /></button>
                        <button onClick={() => { if (window.confirm('Delete this subscription?')) deleteMutation.mutate(sub.id); }} className="text-red-500 hover:text-red-700" title="Delete"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">{editing ? 'Edit Subscription' : 'Add Subscription'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                <select value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent">
                  <option value="">Select customer...</option>
                  {(customers as any[]).map(c => <option key={c.id} value={c.id}>{c.company_name || c.contact_name} ({c.customer_number})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Plan *</label>
                <select value={form.service_plan_id} onChange={e => setForm({ ...form, service_plan_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent">
                  <option value="">Select plan...</option>
                  {(servicePlans as any[]).map(p => <option key={p.id} value={p.id}>{p.name} - £{Number(p.price).toFixed(2)}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                  <select value={form.service_frequency} onChange={e => setForm({ ...form, service_frequency: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent">
                    {FREQUENCY_OPTIONS.map(f => <option key={f} value={f} className="capitalize">{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Day</label>
                  <select value={form.preferred_day} onChange={e => setForm({ ...form, preferred_day: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent">
                    {DAYS_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                  </select>
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={form.auto_renew} onChange={e => setForm({ ...form, auto_renew: e.target.checked })} className="w-4 h-4 text-orange-500 rounded" />
                    Auto Renew
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
                <textarea rows={2} value={form.special_instructions} onChange={e => setForm({ ...form, special_instructions: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.customer_id || !form.service_plan_id || !form.start_date} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50">
                {editing ? 'Save Changes' : 'Add Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
