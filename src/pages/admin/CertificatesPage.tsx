import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import AdminLayout from '../../components/admin/AdminLayout';
import { useToastContext } from '../../contexts/ToastContext';
import { Plus, Award, Search, Eye, FileEdit as Edit, ExternalLink, CheckCircle, XCircle, Clock, AlertTriangle, Pause, Play, Archive, Trash2 } from 'lucide-react';

interface Certificate {
  id: string;
  certificate_number: string;
  customer_id: string;
  issue_date: string;
  expiry_date: string;
  waste_types_covered: string[];
  qr_code_token: string;
  status: string;
  suspended_reason: string | null;
  archived_reason: string | null;
  authorised_signatory_name: string | null;
  authorised_signatory_title: string | null;
  notes: string | null;
  created_at: string;
  mw_customers: {
    company_name: string;
    contact_name: string;
    email: string;
  } | null;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; classes: string; icon: React.ReactNode }> = {
    active: { label: 'Active', classes: 'bg-green-100 text-green-800', icon: <CheckCircle size={12} /> },
    expired: { label: 'Expired', classes: 'bg-red-100 text-red-800', icon: <XCircle size={12} /> },
    revoked: { label: 'Revoked', classes: 'bg-gray-100 text-gray-600', icon: <XCircle size={12} /> },
    pending: { label: 'Pending', classes: 'bg-yellow-100 text-yellow-800', icon: <Clock size={12} /> },
    suspended: { label: 'Suspended', classes: 'bg-orange-100 text-orange-800', icon: <Pause size={12} /> },
    archived: { label: 'Archived', classes: 'bg-gray-200 text-gray-500', icon: <Archive size={12} /> },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.classes}`}>
      {s.icon}{s.label}
    </span>
  );
}

function isExpiringSoon(expiryDate: string): boolean {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diff = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff > 0 && diff <= 60;
}

type ConfirmAction = 
  | { type: 'suspend'; cert: Certificate }
  | { type: 'unsuspend'; cert: Certificate }
  | { type: 'archive'; cert: Certificate }
  | { type: 'delete'; cert: Certificate }
  | null;

export default function CertificatesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToastContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(false);

  const { data: certificates = [], isLoading } = useQuery({
    queryKey: ['admin-certificates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mw_certificates')
        .select(`
          *,
          mw_customers (company_name, contact_name, email)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Certificate[];
    },
  });

  const filtered = certificates.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      c.certificate_number.toLowerCase().includes(q) ||
      c.mw_customers?.company_name.toLowerCase().includes(q) ||
      c.mw_customers?.contact_name?.toLowerCase().includes(q);
    const matchStatus = !filterStatus || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: certificates.length,
    active: certificates.filter((c) => c.status === 'active').length,
    expiringSoon: certificates.filter((c) => c.status === 'active' && isExpiringSoon(c.expiry_date)).length,
    expired: certificates.filter((c) => c.status === 'expired').length,
    suspended: certificates.filter((c) => c.status === 'suspended').length,
  archived: certificates.filter((c) => c.status === 'archived').length,
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    setActing(true);
    const { cert, type } = confirmAction;
    const now = new Date().toISOString();

    try {
      if (type === 'suspend') {
        const { error } = await supabase
          .from('mw_certificates')
          .update({ status: 'suspended', suspended_reason: reason || null, suspended_at: now, suspended_by: user?.id })
          .eq('id', cert.id);
        if (error) throw error;
        toast.success(`Certificate ${cert.certificate_number} suspended`);
      } else if (type === 'unsuspend') {
        const { error } = await supabase
          .from('mw_certificates')
          .update({ status: 'active', suspended_reason: null, suspended_at: null, suspended_by: null })
          .eq('id', cert.id);
        if (error) throw error;
        toast.success(`Certificate ${cert.certificate_number} reinstated`);
      } else if (type === 'archive') {
        const { error } = await supabase
          .from('mw_certificates')
          .update({ status: 'archived', archived_reason: reason || null, archived_at: now, archived_by: user?.id })
          .eq('id', cert.id);
        if (error) throw error;
        toast.success(`Certificate ${cert.certificate_number} archived`);
      } else if (type === 'delete') {
        const { error } = await supabase
          .from('mw_certificates')
          .delete()
          .eq('id', cert.id);
        if (error) throw error;
        toast.success(`Certificate ${cert.certificate_number} deleted`);
      }
      queryClient.invalidateQueries({ queryKey: ['admin-certificates'] });
      setConfirmAction(null);
      setReason('');
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    } finally {
      setActing(false);
    }
  };

  const confirmConfig: Record<string, { title: string; description: string; button: string; buttonClass: string; showReason: boolean; icon: React.ReactNode }> = {
    suspend: {
      title: 'Suspend Certificate',
      description: 'This certificate will be immediately suspended. The customer will see a notice asking them to contact MediWaste when they scan the QR code or visit the compliance page.',
      button: 'Suspend Certificate',
      buttonClass: 'bg-orange-600 hover:bg-orange-700',
      showReason: true,
      icon: <Pause size={20} className="text-orange-600" />,
    },
    unsuspend: {
      title: 'Reinstate Certificate',
      description: 'This certificate will be restored to active status. The customer will see the normal compliance page again.',
      button: 'Reinstate Certificate',
      buttonClass: 'bg-green-600 hover:bg-green-700',
      showReason: false,
      icon: <Play size={20} className="text-green-600" />,
    },
    archive: {
      title: 'Archive Certificate',
      description: 'This certificate will be archived. The customer will see a notice asking them to contact MediWaste when they visit the compliance page. Archived certificates remain in the system for record-keeping.',
      button: 'Archive Certificate',
      buttonClass: 'bg-gray-700 hover:bg-gray-800',
      showReason: true,
      icon: <Archive size={20} className="text-gray-600" />,
    },
    delete: {
      title: 'Delete Certificate',
      description: 'This certificate will be permanently deleted. This action cannot be undone. The customer will see a "certificate not found" message when visiting the compliance page.',
      button: 'Delete Permanently',
      buttonClass: 'bg-red-600 hover:bg-red-700',
      showReason: false,
      icon: <Trash2 size={20} className="text-red-600" />,
    },
  };

  return (
    <AdminLayout
      pageTitle="Certificates"
      breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Certificates' }]}
    >
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Disposal Certificates</h1>
            <p className="text-sm text-gray-500 mt-0.5">Issue and manage waste disposal certificates for customers</p>
          </div>
          <button
            onClick={() => navigate('/admin/certificates/create')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            New Certificate
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-900', bg: 'bg-white' },
            { label: 'Active', value: stats.active, color: 'text-green-700', bg: 'bg-green-50' },
            { label: 'Expiring', value: stats.expiringSoon, color: 'text-amber-700', bg: 'bg-amber-50', icon: <AlertTriangle size={14} className="text-amber-500" /> },
            { label: 'Expired', value: stats.expired, color: 'text-red-700', bg: 'bg-red-50' },
            { label: 'Suspended', value: stats.suspended, color: 'text-orange-700', bg: 'bg-orange-50' },
            { label: 'Archived', value: stats.archived, color: 'text-gray-600', bg: 'bg-gray-100' },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-xl border border-gray-200 p-3`}>
              <div className="flex items-center gap-1.5">
                {s.icon}
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{s.label}</p>
              </div>
              <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-gray-100">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by certificate number, company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-gray-400 text-sm">Loading certificates...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Award size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">No certificates found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Certificate No.</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Issue Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Expiry Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((cert) => (
                    <tr key={cert.id} className={`hover:bg-gray-50 transition-colors ${cert.status === 'suspended' ? 'bg-orange-50/30' : cert.status === 'archived' ? 'bg-gray-50/50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Award size={14} className="text-blue-500 flex-shrink-0" />
                          <span className="font-mono font-medium text-gray-900">{cert.certificate_number}</span>
                          {cert.status === 'active' && isExpiringSoon(cert.expiry_date) && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700">
                              <AlertTriangle size={10} />
                              Soon
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{cert.mw_customers?.company_name || '—'}</p>
                        <p className="text-xs text-gray-400">{cert.mw_customers?.contact_name}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {cert.issue_date ? new Date(cert.issue_date).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cert.status === 'active' && isExpiringSoon(cert.expiry_date) ? 'text-amber-600 font-medium' : 'text-gray-600'}>
                          {cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString('en-GB') : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{statusBadge(cert.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/admin/certificates/${cert.id}/preview`)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Preview Certificate"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => navigate(`/admin/certificates/${cert.id}/edit`)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit Certificate"
                          >
                            <Edit size={15} />
                          </button>
                          <a
                            href={`/compliance/${cert.qr_code_token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="View Public Page"
                          >
                            <ExternalLink size={15} />
                          </a>
                          {cert.status === 'active' && (
                            <button
                              onClick={() => { setConfirmAction({ type: 'suspend', cert }); setReason(''); }}
                              className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Suspend Certificate"
                            >
                              <Pause size={15} />
                            </button>
                          )}
                          {cert.status === 'suspended' && (
                            <button
                              onClick={() => setConfirmAction({ type: 'unsuspend', cert })}
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Reinstate Certificate"
                            >
                              <Play size={15} />
                            </button>
                          )}
                          {(cert.status === 'active' || cert.status === 'suspended' || cert.status === 'expired' || cert.status === 'revoked') && (
                            <button
                              onClick={() => { setConfirmAction({ type: 'archive', cert }); setReason(''); }}
                              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Archive Certificate"
                            >
                              <Archive size={15} />
                            </button>
                          )}
                          {cert.status === 'archived' && (
                            <button
                              onClick={() => { setConfirmAction({ type: 'delete', cert }); setReason(''); }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Permanently"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
                  {confirmConfig[confirmAction.type].icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{confirmConfig[confirmAction.type].title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Certificate <span className="font-mono font-medium">{confirmAction.cert.certificate_number}</span>
                    {' — '}{confirmAction.cert.mw_customers?.company_name}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600">{confirmConfig[confirmAction.type].description}</p>
              </div>

              {confirmConfig[confirmAction.type].showReason && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Reason {confirmAction.type === 'suspend' || confirmAction.type === 'archive' ? '(optional)' : ''}
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    placeholder="e.g. Outstanding payment, compliance issue, customer request..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setConfirmAction(null); setReason(''); }}
                  disabled={acting}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={acting}
                  className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${confirmConfig[confirmAction.type].buttonClass}`}
                >
                  {acting ? 'Processing...' : confirmConfig[confirmAction.type].button}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
