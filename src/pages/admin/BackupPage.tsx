import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import { Download, Loader, CheckCircle, AlertCircle, Database } from 'lucide-react';

interface TableExport {
  table: string;
  label: string;
  rows?: number;
  status: 'idle' | 'loading' | 'done' | 'error';
}

const EXPORT_TABLES: { table: string; label: string }[] = [
  { table: 'mw_customers', label: 'Customers' },
  { table: 'mw_subscriptions', label: 'Subscriptions' },
  { table: 'mw_invoices', label: 'Invoices' },
  { table: 'mw_service_jobs', label: 'Service Jobs' },
  { table: 'mw_collection_requests', label: 'Collection Requests' },
  { table: 'mw_collection_request_items', label: 'Collection Request Items' },
  { table: 'mw_service_agreements', label: 'Service Agreements' },
  { table: 'mw_certificates', label: 'Certificates' },
  { table: 'mw_waste_transfer_notes', label: 'Waste Transfer Notes' },
  { table: 'mw_admin_notes', label: 'Admin Notes' },
  { table: 'quote_requests', label: 'Quote Requests' },
  { table: 'quotes', label: 'Quotes' },
  { table: 'contact_enquiries', label: 'Contact Enquiries' },
  { table: 'email_messages', label: 'Email Messages' },
];

export default function BackupPage() {
  const [exporting, setExporting] = useState(false);
  const [tables, setTables] = useState<TableExport[]>(
    EXPORT_TABLES.map(t => ({ ...t, status: 'idle' }))
  );
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function runExport() {
    setExporting(true);
    setDone(false);
    setError('');
    setTables(EXPORT_TABLES.map(t => ({ ...t, status: 'loading' })));

    const exportData: Record<string, any[]> = {};
    const updated: TableExport[] = [];

    for (const t of EXPORT_TABLES) {
      try {
        const { data, error: qErr } = await supabase.from(t.table).select('*');
        if (qErr) throw qErr;
        exportData[t.table] = data || [];
        updated.push({ ...t, status: 'done', rows: (data || []).length });
      } catch {
        exportData[t.table] = [];
        updated.push({ ...t, status: 'error', rows: 0 });
      }
      const remaining = EXPORT_TABLES.slice(updated.length).map(x => ({ ...x, status: 'loading' as const }));
      setTables([...updated, ...remaining]);
    }

    setTables(updated);

    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), tables: exportData }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mediwaste-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setExporting(false);
    setDone(true);
  }

  const totalRows = tables.reduce((sum, t) => sum + (t.rows || 0), 0);

  return (
    <AdminLayout
      pageTitle="Data Backup"
      breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'Backup' }]}
    >
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Database size={22} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Export All Data</h3>
              <p className="text-sm text-gray-500">
                Downloads a full JSON export of all your operational data including customers, invoices, jobs, and more. Use this as a periodic backup or to migrate data.
              </p>
            </div>
          </div>

          <div className="mt-5">
            <button
              onClick={runExport}
              disabled={exporting}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <><Loader size={16} className="animate-spin" /> Exporting...</>
              ) : (
                <><Download size={16} /> Download Backup</>
              )}
            </button>
          </div>

          {done && !exporting && (
            <div className="mt-4 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
              <CheckCircle size={16} className="flex-shrink-0" />
              Export complete — {totalRows.toLocaleString()} records exported
            </div>
          )}
          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h4 className="text-sm font-semibold text-gray-700">Tables included in export</h4>
          </div>
          <div className="divide-y divide-gray-100">
            {tables.map(t => (
              <div key={t.table} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-gray-700">{t.label}</span>
                <div className="flex items-center gap-2">
                  {t.status === 'loading' && <Loader size={13} className="animate-spin text-gray-400" />}
                  {t.status === 'done' && (
                    <span className="text-xs text-gray-500">{(t.rows || 0).toLocaleString()} rows</span>
                  )}
                  {t.status === 'error' && <AlertCircle size={13} className="text-red-400" />}
                  {t.status === 'done' && <CheckCircle size={13} className="text-green-500" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
