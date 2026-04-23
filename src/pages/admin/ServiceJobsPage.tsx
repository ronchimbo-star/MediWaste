import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Plus, Calendar as CalendarIcon, User, MapPin, X, FileEdit as Edit2, Trash2, Truck, Clock, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Package, Download } from 'lucide-react';
import { useToastContext } from '../../contexts/ToastContext';
import AdminLayout from '../../components/admin/AdminLayout';

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
  source?: string;
  priority?: string;
}

interface CollectionRequest {
  id: string;
  request_number: string;
  customer_id: string;
  status: string;
  preferred_date_from: string | null;
  preferred_date_to: string | null;
  preferred_days: string[] | null;
  preferred_time_slot: string | null;
  special_instructions: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  created_at: string;
  mw_customers: { company_name: string; contact_name: string; collection_address: string | null; };
  mw_collection_request_items: { waste_type: string; quantity: number; volume_unit: string; container_type: string | null; notes: string | null; }[];
  mw_collection_request_supplies: { supply_type: string; quantity: number; }[];
}

const STATUS_OPTIONS = ['scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled'];
const SERVICE_TYPES = ['sharps_collection', 'clinical_waste', 'pharmaceutical', 'cytotoxic', 'anatomical', 'dental', 'general'];

const emptyForm = {
  customer_id: '', staff_id: '', scheduled_date: '', service_type: 'clinical_waste', status: 'scheduled', notes: '',
};

function statusBadge(s: string) {
  const m: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    rescheduled: 'bg-gray-100 text-gray-800',
  };
  return m[s] || 'bg-gray-100 text-gray-800';
}

function fmt(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function generateICS(job: {
  job_number: string;
  scheduled_date: string;
  scheduled_time_start?: string | null;
  scheduled_time_end?: string | null;
  service_type: string;
  customer_name: string;
  customer_address?: string;
  special_instructions?: string | null;
}): string {
  const date = job.scheduled_date.replace(/-/g, '');
  const startTime = job.scheduled_time_start?.replace(/:/g, '') || '080000';
  const endTime = job.scheduled_time_end?.replace(/:/g, '') || '120000';
  const dtStart = `${date}T${startTime.padEnd(6, '0')}`;
  const dtEnd = `${date}T${endTime.padEnd(6, '0')}`;
  const uid = `${job.job_number}@mediwaste.co.uk`;
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const escapeText = (s: string) => s.replace(/[\\;,\n]/g, (m) => m === '\n' ? '\\n' : `\\${m}`);
  const summary = escapeText(`MediWaste Collection - ${job.customer_name}`);
  const description = escapeText(
    `Job: ${job.job_number}\nService: ${job.service_type.replace(/_/g, ' ')}\nCustomer: ${job.customer_name}${job.special_instructions ? `\nNotes: ${job.special_instructions}` : ''}`
  );
  const location = job.customer_address ? escapeText(job.customer_address) : '';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MediWaste//Service Jobs//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    location ? `LOCATION:${location}` : '',
    'STATUS:CONFIRMED',
    `ORGANIZER;CN=MediWaste:mailto:hello@mediwaste.co.uk`,
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Collection reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

function downloadICS(job: ServiceJob) {
  const icsContent = generateICS({
    job_number: job.job_number,
    scheduled_date: job.scheduled_date,
    service_type: job.service_type,
    customer_name: job.customer?.company_name || job.customer?.contact_name || 'Customer',
  });
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${job.job_number}-collection.ics`;
  link.click();
  URL.revokeObjectURL(url);
}

function RequestCard({ req, onApprove, onReject }: {
  req: CollectionRequest;
  onApprove: (id: string, date: string, slot: string) => void;
  onReject: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [approveDate, setApproveDate] = useState('');
  const [approveSlot, setApproveSlot] = useState('morning');
  const [showApprove, setShowApprove] = useState(false);

  const SUPPLY_LABELS: Record<string, string> = {
    sharps_bin_1l: 'Sharps bin 1L', sharps_bin_2_5l: 'Sharps bin 2.5L', sharps_bin_5l: 'Sharps bin 5L',
    sharps_bin_8l: 'Sharps bin 8L', yellow_bags: 'Yellow bags', tiger_stripe_bags: 'Tiger stripe bags',
    purple_bags: 'Purple bags', blue_pharma_bags: 'Blue pharma bags', rigid_containers: 'Rigid containers', cable_ties: 'Cable ties',
  };

  return (
    <div className="bg-white border border-orange-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">
                {req.request_number}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                req.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                req.status === 'approved' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-700'
              }`}>
                {req.status}
              </span>
            </div>
            <p className="font-semibold text-gray-900 text-sm mt-1.5">{req.mw_customers?.company_name}</p>
            {req.mw_customers?.collection_address && (
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin size={11} />
                {req.mw_customers.collection_address}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">Received {fmt(req.created_at)}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {req.status === 'pending' && (
              <>
                <button
                  onClick={() => setShowApprove(!showApprove)}
                  className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 text-white px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <CheckCircle size={12} />
                  Approve
                </button>
                <button
                  onClick={() => onReject(req.id)}
                  className="flex items-center gap-1 text-xs border border-red-200 text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <X size={12} />
                  Reject
                </button>
              </>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 text-gray-400 hover:text-gray-600"
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-600">
          <div className="flex items-center gap-1.5">
            <CalendarIcon size={12} className="text-gray-400" />
            {req.preferred_date_from ? (
              <span>
                {fmt(req.preferred_date_from)}
                {req.preferred_date_to ? ` – ${fmt(req.preferred_date_to)}` : ''}
              </span>
            ) : req.preferred_days?.length ? (
              <span>{req.preferred_days.join(', ')}</span>
            ) : '—'}
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-gray-400" />
            <span className="capitalize">{req.preferred_time_slot || 'any time'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Package size={12} className="text-gray-400" />
            <span>{req.mw_collection_request_items?.length || 0} waste item(s)</span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
          {req.mw_collection_request_items?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Waste Items</p>
              <div className="space-y-1.5">
                {req.mw_collection_request_items.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                    <span className="text-gray-700">
                      {item.quantity} {item.volume_unit} — {item.waste_type}
                      {item.container_type ? ` (${item.container_type})` : ''}
                      {item.notes ? <span className="text-gray-500 italic"> · {item.notes}</span> : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {req.mw_collection_request_supplies?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Supplies Requested</p>
              <div className="flex flex-wrap gap-2">
                {req.mw_collection_request_supplies.map((s, i) => (
                  <span key={i} className="text-xs bg-blue-50 border border-blue-200 text-blue-700 px-2 py-1 rounded-lg">
                    {s.quantity}x {SUPPLY_LABELS[s.supply_type] || s.supply_type}
                  </span>
                ))}
              </div>
            </div>
          )}

          {req.special_instructions && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Special Instructions</p>
              <p className="text-sm text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2">{req.special_instructions}</p>
            </div>
          )}

          {(req.contact_name || req.contact_phone || req.contact_email) && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Contact</p>
              <p className="text-sm text-gray-700">
                {[req.contact_name, req.contact_phone, req.contact_email].filter(Boolean).join(' · ')}
              </p>
            </div>
          )}
        </div>
      )}

      {showApprove && req.status === 'pending' && (
        <div className="border-t border-green-100 p-4 bg-green-50 space-y-3">
          <p className="text-sm font-semibold text-green-800">Confirm collection date</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Scheduled date *</label>
              <input
                type="date"
                value={approveDate}
                onChange={e => setApproveDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Time slot</label>
              <select
                value={approveSlot}
                onChange={e => setApproveSlot(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent bg-white"
              >
                <option value="morning">Morning (08:00–12:00)</option>
                <option value="midday">Midday (12:00–16:00)</option>
                <option value="afternoon">Afternoon (16:00–20:00)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onApprove(req.id, approveDate, approveSlot)}
              disabled={!approveDate}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <CheckCircle size={14} />
              Approve & Schedule
            </button>
            <button
              onClick={() => setShowApprove(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ServiceJobsPage() {
  const { toast } = useToastContext();
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ServiceJob | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [activeTab, setActiveTab] = useState<'jobs' | 'requests'>('jobs');

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

  const { data: collectionRequests } = useQuery({
    queryKey: ['collection-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mw_collection_requests')
        .select(`
          *,
          mw_customers(company_name, contact_name, collection_address),
          mw_collection_request_items(*),
          mw_collection_request_supplies(*)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as CollectionRequest[];
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

  const pendingCount = (collectionRequests || []).filter(r => r.status === 'pending').length;

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

  const approveMutation = useMutation({
    mutationFn: async ({ requestId, date, slot }: { requestId: string; date: string; slot: string }) => {
      const req = (collectionRequests || []).find(r => r.id === requestId);
      if (!req) throw new Error('Request not found');

      const timeMap: Record<string, { start: string; end: string }> = {
        morning: { start: '08:00', end: '12:00' },
        midday: { start: '12:00', end: '16:00' },
        afternoon: { start: '16:00', end: '20:00' },
      };
      const times = timeMap[slot] || timeMap.morning;

      const { data: job, error: jobErr } = await supabase
        .from('mw_service_jobs')
        .insert([{
          customer_id: req.customer_id,
          scheduled_date: date,
          scheduled_time_start: times.start,
          scheduled_time_end: times.end,
          service_type: 'clinical_waste',
          status: 'scheduled',
          source: 'qr_request',
          priority: 'ad-hoc',
          special_instructions: req.special_instructions || null,
          is_adhoc: true,
          job_number: '',
        }])
        .select('id')
        .single();
      if (jobErr || !job) throw jobErr || new Error('Failed to create job');

      const { error: updateErr } = await supabase
        .from('mw_collection_requests')
        .update({ status: 'approved', approved_date: date, approved_time_slot: slot, approved_at: new Date().toISOString(), job_id: job.id })
        .eq('id', requestId);
      if (updateErr) throw updateErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection-requests'] });
      qc.invalidateQueries({ queryKey: ['service-jobs'] });
      toast.success('Collection approved and scheduled');
    },
    onError: () => toast.error('Failed to approve collection request'),
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('mw_collection_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection-requests'] });
      toast.success('Request rejected');
    },
    onError: () => toast.error('Failed to update request'),
  });

  function openAdd() { setEditing(null); setForm({ ...emptyForm }); setShowModal(true); }
  function openEdit(j: ServiceJob) {
    setEditing(j);
    setForm({ customer_id: j.customer_id, staff_id: j.staff_id || '', scheduled_date: j.scheduled_date?.split('T')[0] || '', service_type: j.service_type, status: j.status, notes: j.notes || '' });
    setShowModal(true);
  }

  const filtered = (jobs || []).filter(j => filterStatus === 'all' || j.status === filterStatus);
  const filteredRequests = (collectionRequests || []).filter(r => filterStatus === 'all' || r.status === filterStatus);

  return (
    <AdminLayout pageTitle="Service Schedule" breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'Service Schedule' }]}>
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Service Schedule</h1>
            <p className="text-gray-600 mt-1">Manage jobs and collection requests</p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm">
            <Plus size={16} />Schedule Job
          </button>
        </div>

        <div className="flex border-b border-gray-200 mb-5">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'jobs' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <div className="flex items-center gap-2">
              <CalendarIcon size={15} />
              Scheduled Jobs
              <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">{(jobs || []).length}</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'requests' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <div className="flex items-center gap-2">
              <Truck size={15} />
              Collection Requests
              {pendingCount > 0 && (
                <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">{pendingCount}</span>
              )}
            </div>
          </button>
        </div>

        {activeTab === 'jobs' && (
          <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-5">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent">
                <option value="all">All Jobs</option>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
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
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 text-sm">{job.job_number}</p>
                          {job.source === 'qr_request' && (
                            <span className="text-xs bg-blue-50 border border-blue-200 text-blue-600 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                              <Truck size={10} />QR
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{job.customer?.customer_number}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusBadge(job.status)}`}>{job.status.replace('_', ' ')}</span>
                        <button onClick={() => downloadICS(job)} className="text-green-500 hover:text-green-700 p-1" title="Download .ics"><Download size={14} /></button>
                        <button onClick={() => openEdit(job)} className="text-blue-500 hover:text-blue-700 p-1" title="Edit"><Edit2 size={14} /></button>
                        <button onClick={() => { if (window.confirm('Delete this job?')) deleteMutation.mutate(job.id); }} className="text-red-400 hover:text-red-600 p-1" title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center gap-2 text-gray-700"><MapPin size={14} className="text-gray-400" />{job.customer?.company_name || job.customer?.contact_name}</div>
                      <div className="flex items-center gap-2 text-gray-700"><CalendarIcon size={14} className="text-gray-400" />{job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString('en-GB') : '—'}</div>
                      <div className="flex items-center gap-2 text-gray-700"><User size={14} className="text-gray-400" />{job.assigned_staff ? `${job.assigned_staff.first_name} ${job.assigned_staff.last_name}` : 'Unassigned'}</div>
                      <p className="text-gray-500 capitalize mt-1">{job.service_type?.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'requests' && (
          <>
            {pendingCount > 0 && (
              <div className="mb-4 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                <AlertCircle size={16} className="flex-shrink-0" />
                <strong>{pendingCount}</strong> collection request{pendingCount !== 1 ? 's' : ''} pending approval
              </div>
            )}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-5">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              >
                <option value="all">All Requests</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            {filteredRequests.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Truck size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No collection requests found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map(req => (
                  <RequestCard
                    key={req.id}
                    req={req}
                    onApprove={(id, date, slot) => approveMutation.mutate({ requestId: id, date, slot })}
                    onReject={(id) => { if (window.confirm('Reject this request?')) rejectMutation.mutate(id); }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

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
    </AdminLayout>
  );
}
