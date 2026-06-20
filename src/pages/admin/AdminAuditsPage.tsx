import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  ClipboardList, CheckCircle, Clock, TrendingUp, Download, Search, Eye,
  FileText, BarChart2, ChevronDown, ChevronUp, Trash2, Archive, ArchiveRestore,
} from 'lucide-react';

interface AuditSession {
  id: string;
  business_name: string;
  sector: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  town: string | null;
  county: string | null;
  status: string;
  archived: boolean;
  created_at: string;
  completed_at: string | null;
  mw_audit_reports?: { risk_rating: string; risk_score: number } | null;
  mw_audit_quote_requests?: { id: string; status: string }[] | null;
}

function riskBadge(rating: string) {
  const map: Record<string, string> = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-red-100 text-red-700',
    critical: 'bg-purple-100 text-purple-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${map[rating] || 'bg-gray-100 text-gray-600'}`}>
      {rating?.toUpperCase() || 'N/A'}
    </span>
  );
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    generating: 'bg-blue-100 text-blue-700',
    started: 'bg-amber-100 text-amber-700',
    abandoned: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

type SortField = 'created_at' | 'business_name' | 'sector' | 'status';
type SortDir = 'asc' | 'desc';
type ViewMode = 'active' | 'archived' | 'all';

export default function AdminAuditsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('active');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSector, setFilterSector] = useState('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['admin-audits', viewMode, filterStatus, sortField, sortDir, dateFrom, dateTo],
    queryFn: async () => {
      let q = supabase
        .from('mw_audit_sessions')
        .select('*, mw_audit_reports(risk_rating, risk_score), mw_audit_quote_requests(id, status)')
        .order(sortField, { ascending: sortDir === 'asc' });

      if (viewMode === 'active') q = q.eq('archived', false);
      if (viewMode === 'archived') q = q.eq('archived', true);
      if (filterStatus !== 'all') q = q.eq('status', filterStatus);
      if (dateFrom) q = q.gte('created_at', dateFrom);
      if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59');

      const { data } = await q.limit(500);
      return (data || []) as AuditSession[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-audit-stats'],
    queryFn: async () => {
      const [totals, quotes, downloads] = await Promise.all([
        supabase.from('mw_audit_sessions').select('status', { count: 'exact' }),
        supabase.from('mw_audit_quote_requests').select('id', { count: 'exact' }),
        supabase.from('mw_audit_download_events').select('format'),
      ]);
      const all = totals.data || [];
      const completed = all.filter((s) => s.status === 'completed').length;
      const started = all.length;
      const quoteCount = quotes.count || 0;
      const dlData = downloads.data || [];
      const dlByFormat: Record<string, number> = {};
      dlData.forEach((d) => { dlByFormat[d.format] = (dlByFormat[d.format] || 0) + 1; });
      return {
        total: started,
        completed,
        incomplete: started - completed,
        quotes: quoteCount,
        conversionRate: started > 0 ? Math.round((quoteCount / Math.max(completed, 1)) * 100) : 0,
        dlByFormat,
      };
    },
  });

  const { data: sectorStats = [] } = useQuery({
    queryKey: ['admin-audit-sectors'],
    queryFn: async () => {
      const { data } = await supabase
        .from('mw_audit_sessions')
        .select('sector')
        .eq('status', 'completed');
      const counts: Record<string, number> = {};
      (data || []).forEach((s) => { counts[s.sector] = (counts[s.sector] || 0) + 1; });
      return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    },
  });

  const sectors = [...new Set(sessions.map((s) => s.sector))].sort();

  const filtered = sessions.filter((s) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      s.business_name?.toLowerCase().includes(q) ||
      s.contact_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.town?.toLowerCase().includes(q) ||
      s.sector?.toLowerCase().includes(q)
    );
  }).filter((s) => filterSector === 'all' || s.sector === filterSector);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  }

  async function handleArchive(session: AuditSession) {
    setActionLoading(session.id);
    await supabase.from('mw_audit_sessions').update({ archived: !session.archived }).eq('id', session.id);
    qc.invalidateQueries({ queryKey: ['admin-audits'] });
    qc.invalidateQueries({ queryKey: ['admin-audit-stats'] });
    setActionLoading(null);
  }

  async function handleDelete(id: string) {
    setActionLoading(id);
    await supabase.from('mw_audit_sessions').delete().eq('id', id);
    qc.invalidateQueries({ queryKey: ['admin-audits'] });
    qc.invalidateQueries({ queryKey: ['admin-audit-stats'] });
    qc.invalidateQueries({ queryKey: ['admin-audit-sectors'] });
    setPendingDelete(null);
    setActionLoading(null);
  }

  function exportCsv() {
    const rows = [
      ['ID', 'Business', 'Sector', 'Contact', 'Email', 'Phone', 'Town', 'County', 'Status', 'Risk', 'Score', 'Quote', 'Created', 'Completed'],
      ...filtered.map((s) => [
        s.id, s.business_name, s.sector, s.contact_name || '', s.email || '',
        s.phone || '', s.town || '', s.county || '', s.status,
        s.mw_audit_reports?.risk_rating || '', String(s.mw_audit_reports?.risk_score || ''),
        s.mw_audit_quote_requests?.length ? 'Yes' : 'No',
        s.created_at ? new Date(s.created_at).toLocaleDateString('en-GB') : '',
        s.completed_at ? new Date(s.completed_at).toLocaleDateString('en-GB') : '',
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `audits-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown size={13} className="text-gray-300" />;
    return sortDir === 'asc'
      ? <ChevronUp size={13} className="text-blue-500" />
      : <ChevronDown size={13} className="text-blue-500" />;
  };

  return (
    <AdminLayout pageTitle="Clinical Waste Audits" breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Audits' }]}>
      {/* Delete confirmation overlay */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Delete this audit?</h3>
            <p className="text-sm text-gray-500 mb-5">This will permanently delete the session, report, and all related data. This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setPendingDelete(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg">Cancel</button>
              <button
                onClick={() => handleDelete(pendingDelete)}
                disabled={actionLoading === pendingDelete}
                className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === pendingDelete ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard icon={<ClipboardList size={20} className="text-blue-600" />} label="Total Audits" value={stats?.total ?? '—'} bg="bg-blue-50" />
        <StatCard icon={<CheckCircle size={20} className="text-green-600" />} label="Completed" value={stats?.completed ?? '—'} bg="bg-green-50" />
        <StatCard icon={<Clock size={20} className="text-amber-600" />} label="Incomplete" value={stats?.incomplete ?? '—'} bg="bg-amber-50" />
        <StatCard icon={<FileText size={20} className="text-purple-600" />} label="Quote Requests" value={stats?.quotes ?? '—'} bg="bg-purple-50" />
        <StatCard icon={<TrendingUp size={20} className="text-red-600" />} label="Conversion" value={stats ? `${stats.conversionRate}%` : '—'} bg="bg-red-50" />
      </div>

      <div className="grid lg:grid-cols-4 gap-6 mb-6">
        {stats?.dlByFormat && Object.keys(stats.dlByFormat).length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Download size={15} /> Downloads by Format
            </h3>
            <div className="space-y-2">
              {Object.entries(stats.dlByFormat).map(([fmt, cnt]) => (
                <div key={fmt} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 capitalize">{fmt}</span>
                  <span className="font-semibold text-gray-900">{cnt}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {sectorStats.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:col-span-3">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <BarChart2 size={15} /> Completions by Sector
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {sectorStats.map(([sector, count]) => (
                <div key={sector} className="bg-gray-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-gray-900">{count}</p>
                  <p className="text-xs text-gray-500 truncate">{sector}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* View mode tabs + filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Active / Archived / All toggle */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 shrink-0">
            {(['active', 'archived', 'all'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${viewMode === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {v === 'archived' && <Archive size={11} className="inline mr-1 -mt-0.5" />}
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[180px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search business, contact, location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="started">Started</option>
            <option value="generating">Generating</option>
          </select>
          <select value={filterSector} onChange={(e) => setFilterSector(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All Sectors</option>
            {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" title="From date" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" title="To date" />
          <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
            <Download size={15} /> Export CSV
          </button>
        </div>
        <p className="text-xs text-gray-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <ClipboardList size={36} className="mb-3" />
            <p className="font-medium">No audits found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {([['business_name', 'Business'], ['sector', 'Sector'], ['status', 'Status']] as [SortField, string][]).map(([field, label]) => (
                    <th key={field} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort(field)}>
                      <span className="inline-flex items-center gap-1">{label} <SortIcon field={field} /></span>
                    </th>
                  ))}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Risk</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Location</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('created_at')}>
                    <span className="inline-flex items-center gap-1">Date <SortIcon field="created_at" /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Quote</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((s) => (
                  <tr key={s.id} className={`hover:bg-gray-50 transition-colors ${s.archived ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[180px] truncate">{s.business_name}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{s.sector}</td>
                    <td className="px-4 py-3">{statusBadge(s.status)}</td>
                    <td className="px-4 py-3">
                      {s.mw_audit_reports ? riskBadge(s.mw_audit_reports.risk_rating) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{[s.town, s.county].filter(Boolean).join(', ') || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      <div className="truncate max-w-[140px]">{s.contact_name || '—'}</div>
                      {s.email && <div className="text-gray-400 truncate max-w-[140px]">{s.email}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{new Date(s.created_at).toLocaleDateString('en-GB')}</td>
                    <td className="px-4 py-3">
                      {s.mw_audit_quote_requests && s.mw_audit_quote_requests.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium"><CheckCircle size={12} /> Yes</span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/admin/audits/${s.id}`} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50">
                          <Eye size={13} /> View
                        </Link>
                        <button
                          onClick={() => handleArchive(s)}
                          disabled={actionLoading === s.id}
                          title={s.archived ? 'Unarchive' : 'Archive'}
                          className="inline-flex items-center gap-1 text-gray-500 hover:text-amber-600 text-xs font-medium px-2 py-1 rounded hover:bg-amber-50 disabled:opacity-40 transition-colors"
                        >
                          {s.archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
                        </button>
                        <button
                          onClick={() => setPendingDelete(s.id)}
                          title="Delete permanently"
                          className="inline-flex items-center gap-1 text-gray-400 hover:text-red-600 text-xs font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function StatCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string | number; bg: string }) {
  return (
    <div className={`${bg} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs font-medium text-gray-600">{label}</span></div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
