import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Truck, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp,
  Phone, Mail, Calendar, Package, RefreshCw, Archive, Trash2
} from 'lucide-react';

type Status = 'pending' | 'approved' | 'completed' | 'cancelled' | 'archived';

interface CollectionRequest {
  id: string;
  request_number: string;
  customer_name: string | null;
  customer_id: string | null;
  status: Status;
  preferred_date_from: string | null;
  preferred_date_to: string | null;
  preferred_days: string[] | null;
  preferred_time_slot: string;
  special_instructions: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  source: string;
  admin_notes: string | null;
  archived_at: string | null;
  created_at: string;
  mw_customers?: { company_name: string } | null;
  collection_request_items?: Item[];
  collection_request_supplies?: Supply[];
}

interface Item {
  id: string;
  waste_type: string;
  quantity: number;
  volume_unit: string;
  container_type: string | null;
  notes: string | null;
}

interface Supply {
  id: string;
  supply_type: string;
  quantity: number;
}

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'archived', label: 'Archived' },
];

function statusBadge(status: Status) {
  const map: Record<Status, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-600',
    archived: 'bg-slate-100 text-slate-600',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600';
}

function statusIcon(status: Status) {
  if (status === 'completed') return <CheckCircle size={13} />;
  if (status === 'cancelled') return <XCircle size={13} />;
  if (status === 'approved') return <Truck size={13} />;
  if (status === 'archived') return <Archive size={13} />;
  return <Clock size={13} />;
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatTimeSlot(slot: string) {
  const map: Record<string, string> = {
    morning: 'Morning (08:00–12:00)',
    midday: 'Midday (12:00–16:00)',
    afternoon: 'Afternoon (16:00–20:00)',
    any: 'Any time',
  };
  return map[slot] ?? slot;
}

function formatSource(source: string) {
  const map: Record<string, string> = {
    public_form: 'Public form',
    customer_portal: 'Customer portal',
    qr_form: 'QR code',
    compliance_page: 'Compliance page',
  };
  return map[source] ?? source;
}

function RequestRow({ req, onStatusChange }: { req: CollectionRequest; onStatusChange: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<Status>(req.status);
  const [adminNotes, setAdminNotes] = useState(req.admin_notes ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const displayName = req.mw_customers?.company_name || req.customer_name || req.contact_name || 'Anonymous';

  async function saveChanges() {
    setSaving(true);
    setSaved(false);
    const updateData: Record<string, unknown> = { status, admin_notes: adminNotes || null };
    if (status === 'archived') {
      updateData.archived_at = new Date().toISOString();
    }
    await supabase
      .from('collection_requests')
      .update(updateData)
      .eq('id', req.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onStatusChange();
  }

  async function archiveRequest() {
    setSaving(true);
    await supabase
      .from('collection_requests')
      .update({ status: 'archived', archived_at: new Date().toISOString() })
      .eq('id', req.id);
    setSaving(false);
    onStatusChange();
  }

  async function deleteRequest() {
    setDeleting(true);
    await supabase.from('collection_request_supplies').delete().eq('request_id', req.id);
    await supabase.from('collection_request_items').delete().eq('request_id', req.id);
    await supabase.from('collection_requests').delete().eq('id', req.id);
    setDeleting(false);
    onStatusChange();
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        className="w-full px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="flex-shrink-0">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge(status)}`}>
              {statusIcon(status)}
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{displayName}</p>
            <p className="text-xs text-gray-500">{req.request_number} · {fmtDateTime(req.created_at)} · {formatSource(req.source)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 text-xs text-gray-500">
          {req.collection_request_items && req.collection_request_items.length > 0 && (
            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">
              {req.collection_request_items.length} item{req.collection_request_items.length !== 1 ? 's' : ''}
            </span>
          )}
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-5 bg-gray-50 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(req.contact_name || req.contact_phone || req.contact_email) && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Contact</p>
                {req.contact_name && <p className="text-sm text-gray-800 flex items-center gap-1.5"><span className="text-gray-400">Name:</span> {req.contact_name}</p>}
                {req.contact_phone && <p className="text-sm text-gray-800 flex items-center gap-1.5 mt-1"><Phone size={12} className="text-gray-400" /> {req.contact_phone}</p>}
                {req.contact_email && <p className="text-sm text-gray-800 flex items-center gap-1.5 mt-1"><Mail size={12} className="text-gray-400" /> {req.contact_email}</p>}
              </div>
            )}

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Scheduling</p>
              {req.preferred_days && req.preferred_days.length > 0 ? (
                <p className="text-sm text-gray-800 flex items-center gap-1.5"><Calendar size={12} className="text-gray-400" /> {req.preferred_days.join(', ')}</p>
              ) : (
                <>
                  {req.preferred_date_from && <p className="text-sm text-gray-800 flex items-center gap-1.5"><Calendar size={12} className="text-gray-400" /> From: {fmtDate(req.preferred_date_from)}</p>}
                  {req.preferred_date_to && <p className="text-sm text-gray-800 mt-1">To: {fmtDate(req.preferred_date_to)}</p>}
                </>
              )}
              <p className="text-sm text-gray-800 mt-1 flex items-center gap-1.5"><Clock size={12} className="text-gray-400" /> {formatTimeSlot(req.preferred_time_slot)}</p>
            </div>

            {req.special_instructions && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Special Instructions</p>
                <p className="text-sm text-gray-800">{req.special_instructions}</p>
              </div>
            )}
          </div>

          {req.collection_request_items && req.collection_request_items.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Waste Items</p>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Waste Type</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Quantity</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Container</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {req.collection_request_items.map(item => (
                      <tr key={item.id}>
                        <td className="px-4 py-2.5 text-gray-900">{item.waste_type}</td>
                        <td className="px-4 py-2.5 text-gray-700">{item.quantity} {item.volume_unit}</td>
                        <td className="px-4 py-2.5 text-gray-600">{item.container_type ?? '—'}</td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{item.notes ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {req.collection_request_supplies && req.collection_request_supplies.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Supplies Requested</p>
              <div className="flex flex-wrap gap-2">
                {req.collection_request_supplies.map(s => (
                  <span key={s.id} className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700">
                    <Package size={12} className="inline mr-1 text-gray-400" />
                    {s.quantity}x {s.supply_type}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Admin Actions</p>
            <div className="flex flex-wrap gap-3 items-start">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as Status)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent bg-white"
                >
                  {STATUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-48">
                <label className="block text-xs font-medium text-gray-600 mb-1">Admin Notes</label>
                <input
                  type="text"
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Internal notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent"
                />
              </div>
              <div className="self-end">
                <button
                  onClick={saveChanges}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : null}
                  {saved ? 'Saved!' : 'Save'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              {req.status !== 'archived' && (
                <button
                  onClick={archiveRequest}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  <Archive size={14} />
                  Archive
                </button>
              )}
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600 font-medium">Are you sure?</span>
                  <button
                    onClick={deleteRequest}
                    disabled={deleting}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    Confirm Delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CollectionRequestsPage() {
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all');
  const queryClient = useQueryClient();

  const { data: requests, isLoading, refetch } = useQuery({
    queryKey: ['collection-requests', filterStatus],
    queryFn: async () => {
      let q = supabase
        .from('collection_requests')
        .select(`
          *,
          mw_customers(company_name),
          collection_request_items(*),
          collection_request_supplies(*)
        `)
        .order('created_at', { ascending: false });

      if (filterStatus === 'all') {
        q = q.neq('status', 'archived');
      } else {
        q = q.eq('status', filterStatus);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CollectionRequest[];
    },
  });

  const { data: allCounts } = useQuery({
    queryKey: ['collection-requests-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collection_requests')
        .select('status');
      if (error) throw error;
      const rows = data ?? [];
      return {
        all: rows.filter(r => r.status !== 'archived').length,
        pending: rows.filter(r => r.status === 'pending').length,
        approved: rows.filter(r => r.status === 'approved').length,
        completed: rows.filter(r => r.status === 'completed').length,
        cancelled: rows.filter(r => r.status === 'cancelled').length,
        archived: rows.filter(r => r.status === 'archived').length,
      };
    },
  });

  const counts = allCounts ?? { all: 0, pending: 0, approved: 0, completed: 0, cancelled: 0, archived: 0 };

  return (
    <AdminLayout pageTitle="Collection Requests">
      <div className="min-h-screen bg-gray-50">
        <div className="px-6 py-6 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Collection Requests</h2>
              <p className="text-sm text-gray-500 mt-0.5">Ad-hoc waste collection requests from customers and the public</p>
            </div>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>

        <div className="px-6 py-4 flex gap-2 flex-wrap border-b border-gray-200 bg-white">
          {(['all', 'pending', 'approved', 'completed', 'cancelled', 'archived'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filterStatus === s
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${filterStatus === s ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                {counts[s]}
              </span>
            </button>
          ))}
        </div>

        <div className="px-6 py-6 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !requests || requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Truck size={40} className="text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No collection requests</p>
              <p className="text-gray-400 text-sm mt-1">
                {filterStatus !== 'all' ? `No ${filterStatus} requests found` : 'Requests submitted via the public form will appear here'}
              </p>
            </div>
          ) : (
            requests.map(req => (
              <RequestRow
                key={req.id}
                req={req}
                onStatusChange={() => {
                  queryClient.invalidateQueries({ queryKey: ['collection-requests'] });
                  queryClient.invalidateQueries({ queryKey: ['collection-requests-counts'] });
                  queryClient.invalidateQueries({ queryKey: ['pending-collection-requests-count'] });
                }}
              />
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
