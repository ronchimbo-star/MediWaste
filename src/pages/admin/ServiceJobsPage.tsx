import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Plus, Calendar, User, MapPin, X, ArrowLeft, FileEdit as Edit2, Trash2 } from 'lucide-react';
import { useToastContext } from '../../contexts/ToastContext';

interface ServiceJob {
  id: string;
  job_number: string;
  customer_id: string;
  staff_id: string | null;
  customer: { customer_number: string; company_name: string; contact_name: string; };
  assigned_staff: { staff_number: string; first_name: string; last_name: string; } | null;
  scheduled_date: string;
  status: string;
  service_type: string;
  notes: string | null;
}

const STATUS_OPTIONS = ['scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled'];
const SERVICE_TYPES = ['sharps_collection', 'clinical_waste', 'pharmaceutical', 'cytotoxic', 'anatomical', 'dental', 'general'];

const emptyForm = {
  customer_id: '', staff_id: '', scheduled_date: '', service_type: 'clinical_waste', status: 'scheduled', notes: '',
};

function statusBadge(s: string) {
  const m: Record<string, string> = { scheduled: 'bg-blue-100 text-blue-800', in_progress: 'bg-yellow-100 text-yellow-800', completed: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800', rescheduled: 'bg-gray-100 text-gray-800' };
  return m[s] || 'bg-gray-100 text-gray-800';
}

export default function ServiceJobsPage() {
  const navigate = useNavigate();
  const { toast } = useToastContext();
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ServiceJob | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['service-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mw_service_jobs')
        .select('*, customer:mw_customers(customer_number,company_name,contact_name), assigned_staff:mw_staff(staff_number,first_name,last_name)')
        .order('scheduled_date', { ascending: true });
      if (error) throw error;
      return data as ServiceJob[];
    },
  });

  const { data: customers } = useQuery({
    queryKey: ['customers-list'],
    queryFn: async () => {
      const { data } = await supabase.from('mw_customers').select('id,customer_number,company_name,contact_name').eq('status', 'active').order('company_name');
      return data || [];
    },
  });

  const { data: staffList } = useQuery({
    queryKey: ['staff-list'],
    queryFn: async () => {
      const { data } = await supabase.from('mw_staff').select('id,first_name,last_name').eq('status', 'active');
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (f: typeof form) => {
      const payload = { customer_id: f.customer_id, staff_id: f.staff_id || null, scheduled_date: f.scheduled_date, service_type: f.service_type, status: f.status, notes: f.notes || null };
      if (editing) {
        const { error } = await supabase.from('mw_service_jobs').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('mw_service_jobs').insert([{ ...payload, job_number: '' }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-jobs'] });
      toast.success(editing ? 'Job updated' : 'Job scheduled');
      setShowModal(false);
      setEditing(null);
      setForm({ ...emptyForm });
    },
    onError: () => toast.error('Failed to save job'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('mw_service_jobs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-jobs'] });
      toast.success('Job removed');
    },
    onError: () => toast.error('Failed to delete job'),
  });

  function openAdd() { setEditing(null); setForm({ ...emptyForm }); setShowModal(true); }
  function openEdit(j: ServiceJob) {
    setEditing(j);
    setForm({ customer_id: j.customer_id, staff_id: j.staff_id || '', scheduled_date: j.scheduled_date?.split('T')[0] || '', service_type: j.service_type, status: j.status, notes: j.notes || '' });
    setShowModal(true);
  }

  const filtered = (jobs || []).filter(j => filterStatus === 'all' || j.status === filterStatus);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate('/admin')} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm"><ArrowLeft size={16} />Dashboard</button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Schedule</h1>
          <p className="text-gray-600 mt-1">Manage and track service jobs</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 flex gap-4 justify-between items-center">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent">
          <option value="all">All Jobs</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm">
          <Plus size={16} />Schedule Job
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12"><div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">No jobs found</div>
          ) : filtered.map(job => (
            <div key={job.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{job.job_number}</p>
                  <p className="text-xs text-gray-500">{job.customer?.customer_number}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusBadge(job.status)}`}>{job.status.replace('_', ' ')}</span>
                  <button onClick={() => openEdit(job)} className="text-blue-500 hover:text-blue-700 p-1"><Edit2 size={14} /></button>
                  <button onClick={() => { if (window.confirm('Delete this job?')) deleteMutation.mutate(job.id); }} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-gray-700"><MapPin size={14} className="text-gray-400" />{job.customer?.company_name || job.customer?.contact_name}</div>
                <div className="flex items-center gap-2 text-gray-700"><Calendar size={14} className="text-gray-400" />{job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString('en-GB') : '—'}</div>
                <div className="flex items-center gap-2 text-gray-700"><User size={14} className="text-gray-400" />{job.assigned_staff ? `${job.assigned_staff.first_name} ${job.assigned_staff.last_name}` : 'Unassigned'}</div>
                <p className="text-gray-500 capitalize mt-1">{job.service_type?.replace(/_/g, ' ')}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">{editing ? 'Edit Job' : 'Schedule Job'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                <select value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent">
                  <option value="">Select customer...</option>
                  {(customers || []).map((c: any) => <option key={c.id} value={c.id}>{c.company_name || c.contact_name} ({c.customer_number})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date *</label>
                  <input type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign Staff</label>
                  <select value={form.staff_id} onChange={e => setForm({ ...form, staff_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent">
                    <option value="">Unassigned</option>
                    {(staffList || []).map((s: any) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                  <select value={form.service_type} onChange={e => setForm({ ...form, service_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent">
                    {SERVICE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.customer_id || !form.scheduled_date} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50">
                {editing ? 'Save Changes' : 'Schedule Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
