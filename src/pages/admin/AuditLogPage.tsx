import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import { Search } from 'lucide-react';

interface AuditEntry {
  id: string;
  created_at: string;
  actor_id: string | null;
  action: 'insert' | 'update' | 'delete';
  entity_type: string;
  entity_id: string;
  entity_label: string | null;
  changed_fields: string[] | null;
}

const ENTITY_OPTIONS = [
  { value: 'mw_customers', label: 'Customers' },
  { value: 'mw_certificates', label: 'Certificates' },
  { value: 'mw_waste_transfer_notes', label: 'Waste transfer notes' },
  { value: 'mw_hw_consignment_notes', label: 'Hazardous waste consignment notes' },
  { value: 'mw_collection_requests', label: 'Collection requests' },
];

const ACTION_STYLES: Record<AuditEntry['action'], string> = {
  insert: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
};

export default function AuditLogPage() {
  const [entityType, setEntityType] = useState(ENTITY_OPTIONS[0].value);
  const [search, setSearch] = useState('');

  const { data: entries = [], isLoading, error } = useQuery<AuditEntry[]>({
    queryKey: ['audit-log', entityType],
    queryFn: async () => {
      const { data, error: queryError } = await supabase
        .from('audit_log')
        .select('id, created_at, actor_id, action, entity_type, entity_id, entity_label, changed_fields')
        .eq('entity_type', entityType)
        .order('created_at', { ascending: false })
        .limit(500);
      if (queryError) throw queryError;
      return data || [];
    },
  });

  const term = search.trim().toLowerCase();
  const visible = term
    ? entries.filter((e) =>
        (e.entity_label || '').toLowerCase().includes(term) || e.entity_id.toLowerCase().includes(term)
      )
    : entries;

  return (
    <AdminLayout pageTitle="Audit Log" breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Audit Log' }]}>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit log</h1>
          <p className="text-sm text-gray-500 mt-1">Every change to the selected record type, newest first. Shows the 500 most recent changes.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-900"
            aria-label="Record type"
          >
            {ENTITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by name, number or ID"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
            />
          </div>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
            The audit log could not be loaded. Please refresh the page.
          </div>
        ) : isLoading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-gray-500">No changes recorded for this filter.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">When</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Record</th>
                  <th className="px-4 py-3 font-semibold">Fields changed</th>
                  <th className="px-4 py-3 font-semibold">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString('en-GB')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${ACTION_STYLES[e.action]}`}>
                        {e.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {e.entity_label || <span className="text-gray-400">Unnamed record</span>}
                      <div className="text-xs text-gray-400 font-mono">{e.entity_id}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {e.changed_fields && e.changed_fields.length > 0 ? e.changed_fields.join(', ') : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {e.actor_id ? 'Signed-in user' : 'System or public'}
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
