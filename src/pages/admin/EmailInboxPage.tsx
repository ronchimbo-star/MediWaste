import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useToastContext } from '../../contexts/ToastContext';
import { Mail, MailOpen, Star, Archive, RefreshCw, Search, User, Paperclip, ChevronLeft, ExternalLink, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';

interface Email {
  id: string;
  gmail_message_id: string;
  gmail_thread_id: string | null;
  customer_id: string | null;
  from_email: string;
  from_name: string;
  to_email: string;
  subject: string;
  body_plain: string;
  body_html: string;
  direction: 'inbound' | 'outbound';
  status: 'unread' | 'read' | 'archived' | 'starred';
  has_attachments: boolean;
  attachments: any[];
  labels: string[];
  received_at: string;
  customer?: {
    company_name: string;
    contact_name: string;
    customer_number: string;
  } | null;
}

interface SyncLog {
  id: string;
  synced_at: string;
  emails_fetched: number;
  emails_new: number;
  status: string;
  error_message: string | null;
}

const FREQUENCY_OPTIONS = [
  { value: 5, label: 'Every 5 minutes' },
  { value: 15, label: 'Every 15 minutes' },
  { value: 30, label: 'Every 30 minutes' },
  { value: 60, label: 'Every hour' },
  { value: 120, label: 'Every 2 hours' },
  { value: 360, label: 'Every 6 hours' },
  { value: 720, label: 'Every 12 hours' },
  { value: 1440, label: 'Once a day' },
];

function SyncConfigPanel({ config, onSave, saving }: { config: any; onSave: (vals: any) => void; saving: boolean }) {
  const [enabled, setEnabled] = useState<boolean>(config.enabled ?? false);
  const [freq, setFreq] = useState<number>(config.sync_frequency_minutes ?? 30);
  const [maxResults, setMaxResults] = useState<number>(config.max_results_per_sync ?? 100);

  return (
    <div className="mb-5 bg-gray-50 border border-gray-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">Auto-Sync Schedule</h3>
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <div className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-green-500' : 'bg-gray-300'}`} onClick={() => setEnabled(!enabled)}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm text-gray-700">{enabled ? 'Auto-sync enabled' : 'Auto-sync disabled'}</span>
        </label>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Frequency</label>
          <select
            value={freq}
            onChange={e => setFreq(parseInt(e.target.value))}
            disabled={!enabled}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-white disabled:opacity-50"
          >
            {FREQUENCY_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Max emails per sync</label>
          <select
            value={maxResults}
            onChange={e => setMaxResults(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-white"
          >
            {[25, 50, 100, 200, 500].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <button
          onClick={() => onSave({ enabled, sync_frequency_minutes: freq, max_results_per_sync: maxResults })}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Schedule'}
        </button>
      </div>
      {enabled && (
        <p className="text-xs text-gray-400 mt-2">
          Note: Auto-sync requires a separate cron job or scheduled Supabase function to call the sync endpoint on the configured interval.
        </p>
      )}
    </div>
  );
}

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'starred', label: 'Starred' },
  { key: 'archived', label: 'Archived' },
];

export default function EmailInboxPage() {
  const { toast } = useToastContext();
  const queryClient = useQueryClient();
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [showSyncConfig, setShowSyncConfig] = useState(false);

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ['emails', statusFilter, directionFilter],
    queryFn: async () => {
      let query = supabase
        .from('mw_emails')
        .select(`
          *,
          customer:mw_customers(company_name, contact_name, customer_number)
        `)
        .order('received_at', { ascending: false })
        .limit(200);

      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (directionFilter !== 'all') query = query.eq('direction', directionFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data as Email[];
    },
  });

  const { data: lastSync } = useQuery({
    queryKey: ['email-sync-log'],
    queryFn: async () => {
      const { data } = await supabase
        .from('mw_email_sync_log')
        .select('*')
        .order('synced_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as SyncLog | null;
    },
  });

  const { data: syncConfig } = useQuery({
    queryKey: ['gmail-sync-config'],
    queryFn: async () => {
      const { data } = await supabase.from('mw_gmail_sync_config').select('*').eq('id', 'default').maybeSingle();
      return data;
    },
  });

  const updateSyncConfig = useMutation({
    mutationFn: async (values: { enabled: boolean; sync_frequency_minutes: number; max_results_per_sync: number }) => {
      const { error } = await supabase.from('mw_gmail_sync_config').update({ ...values, updated_at: new Date().toISOString() }).eq('id', 'default');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gmail-sync-config'] });
      toast.success('Sync settings saved');
    },
    onError: () => toast.error('Failed to save sync settings'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('mw_emails')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['emails'] }),
  });

  const linkCustomerMutation = useMutation({
    mutationFn: async ({ emailId, customerId }: { emailId: string; customerId: string | null }) => {
      const { error } = await supabase
        .from('mw_emails')
        .update({ customer_id: customerId, updated_at: new Date().toISOString() })
        .eq('id', emailId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      toast.success('Customer link updated');
    },
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-gmail`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ maxResults: 100 }),
        }
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || 'Sync failed');
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      queryClient.invalidateQueries({ queryKey: ['email-sync-log'] });
      toast.success(`Sync complete — ${result.new} new email${result.new !== 1 ? 's' : ''}`);
    } catch (err: any) {
      toast.error(err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const openEmail = async (email: Email) => {
    setSelectedEmail(email);
    if (email.status === 'unread') {
      updateStatusMutation.mutate({ id: email.id, status: 'read' });
    }
  };

  const filtered = emails.filter((e) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      e.subject.toLowerCase().includes(q) ||
      e.from_email.toLowerCase().includes(q) ||
      e.from_name.toLowerCase().includes(q) ||
      e.body_plain.toLowerCase().includes(q) ||
      e.customer?.company_name?.toLowerCase().includes(q) ||
      false
    );
  });

  const unreadCount = emails.filter((e) => e.status === 'unread').length;

  return (
    <AdminLayout pageTitle="Email Inbox" breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'Email Inbox' }]}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Inbox</h1>
            <p className="text-sm text-gray-500 mt-1">
              Synced from @mediwaste.co.uk catchall
              {lastSync && (
                <span> · Last synced {new Date(lastSync.synced_at).toLocaleString()}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSyncConfig(!showSyncConfig)}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${showSyncConfig ? 'border-gray-400 bg-gray-100 text-gray-800' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              <Settings size={15} />
              Schedule
              {showSyncConfig ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] transition-colors disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        </div>

        {showSyncConfig && syncConfig && (
          <SyncConfigPanel
            config={syncConfig}
            onSave={vals => updateSyncConfig.mutate(vals)}
            saving={updateSyncConfig.isPending}
          />
        )}

        <div className="flex gap-6 h-[calc(100vh-200px)]">
          <div className="w-96 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search emails..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex border-b border-gray-100 text-xs">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`flex-1 py-2 font-medium transition-colors ${
                    statusFilter === tab.key
                      ? 'text-amber-600 border-b-2 border-amber-500'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                  {tab.key === 'unread' && unreadCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-xs">
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-1 p-2 border-b border-gray-100">
              {(['all', 'inbound', 'outbound'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDirectionFilter(d)}
                  className={`flex-1 py-1 text-xs rounded font-medium transition-colors ${
                    directionFilter === d
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                  <Mail className="w-8 h-8 mb-2" />
                  <p className="text-sm">No emails</p>
                </div>
              ) : (
                filtered.map((email) => (
                  <button
                    key={email.id}
                    onClick={() => openEmail(email)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                      selectedEmail?.id === email.id ? 'bg-amber-50 border-l-2 border-l-amber-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className={`text-sm truncate ${email.status === 'unread' ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {email.direction === 'inbound' ? (email.from_name || email.from_email) : `To: ${email.to_email}`}
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {email.status === 'starred' && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                        {email.has_attachments && <Paperclip className="w-3 h-3 text-gray-400" />}
                        {email.status === 'unread' && <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />}
                      </div>
                    </div>
                    <p className={`text-xs truncate mb-1 ${email.status === 'unread' ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                      {email.subject}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400 truncate flex-1">
                        {email.body_plain?.slice(0, 60)}...
                      </p>
                      <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                        {new Date(email.received_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                    {email.customer && (
                      <div className="mt-1 flex items-center gap-1">
                        <User className="w-3 h-3 text-blue-400" />
                        <span className="text-xs text-blue-600 truncate">{email.customer.company_name || email.customer.contact_name}</span>
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            {selectedEmail ? (
              <EmailDetail
                email={selectedEmail}
                onClose={() => setSelectedEmail(null)}
                onStatusChange={(status) => {
                  updateStatusMutation.mutate({ id: selectedEmail.id, status });
                  setSelectedEmail({ ...selectedEmail, status: status as any });
                  if (status === 'archived') setSelectedEmail(null);
                }}
                onLinkCustomer={(customerId) =>
                  linkCustomerMutation.mutate({ emailId: selectedEmail.id, customerId })
                }
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <MailOpen className="w-16 h-16 mb-4" />
                <p className="text-lg font-medium">Select an email to read</p>
                <p className="text-sm mt-1">Choose from the inbox on the left</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function EmailDetail({
  email,
  onClose,
  onStatusChange,
  onLinkCustomer,
}: {
  email: Email;
  onClose: () => void;
  onStatusChange: (status: string) => void;
  onLinkCustomer: (customerId: string | null) => void;
}) {
  const [showHtml, setShowHtml] = useState(!!email.body_html);
  const [linkingCustomer, setLinkingCustomer] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<any[]>([]);

  const searchCustomers = async (term: string) => {
    setCustomerSearch(term);
    if (term.length < 2) { setCustomerResults([]); return; }
    const { data } = await supabase
      .from('mw_customers')
      .select('id, company_name, contact_name, email, customer_number')
      .or(`company_name.ilike.%${term}%,contact_name.ilike.%${term}%,email.ilike.%${term}%`)
      .limit(8);
    setCustomerResults(data || []);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          {email.body_html && (
            <button
              onClick={() => setShowHtml(!showHtml)}
              className="text-xs px-3 py-1 border border-gray-200 rounded hover:bg-gray-50"
            >
              {showHtml ? 'Plain text' : 'HTML view'}
            </button>
          )}
          {email.status !== 'starred' ? (
            <button
              onClick={() => onStatusChange('starred')}
              className="p-2 text-gray-400 hover:text-amber-500 rounded hover:bg-gray-50"
              title="Star"
            >
              <Star className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => onStatusChange('read')}
              className="p-2 text-amber-400 hover:text-gray-400 rounded hover:bg-gray-50"
              title="Unstar"
            >
              <Star className="w-4 h-4 fill-amber-400" />
            </button>
          )}
          {email.status !== 'archived' && (
            <button
              onClick={() => onStatusChange('archived')}
              className="p-2 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-50"
              title="Archive"
            >
              <Archive className="w-4 h-4" />
            </button>
          )}
          {email.status === 'read' && (
            <button
              onClick={() => onStatusChange('unread')}
              className="text-xs px-3 py-1 border border-gray-200 rounded hover:bg-gray-50"
            >
              Mark unread
            </button>
          )}
        </div>
      </div>

      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">{email.subject}</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div>
            <span className="text-gray-500">From: </span>
            <span className="text-gray-900">
              {email.from_name ? `${email.from_name} <${email.from_email}>` : email.from_email}
            </span>
          </div>
          <div>
            <span className="text-gray-500">To: </span>
            <span className="text-gray-900">{email.to_email}</span>
          </div>
          <div>
            <span className="text-gray-500">Date: </span>
            <span className="text-gray-900">
              {new Date(email.received_at).toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Customer: </span>
            {email.customer ? (
              <span className="flex items-center gap-1 text-blue-600 font-medium">
                <User className="w-3 h-3" />
                {email.customer.company_name || email.customer.contact_name}
                <a
                  href={`/admin/customers/${email.customer_id}`}
                  className="text-gray-400 hover:text-gray-600"
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </span>
            ) : (
              <button
                onClick={() => setLinkingCustomer(!linkingCustomer)}
                className="text-amber-600 hover:text-amber-700 text-xs underline"
              >
                Link to customer
              </button>
            )}
          </div>
        </div>

        {linkingCustomer && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600 mb-2">Search for a customer to link:</p>
            <input
              type="text"
              placeholder="Company name, contact, or email..."
              value={customerSearch}
              onChange={(e) => searchCustomers(e.target.value)}
              className="w-full text-sm px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
            {customerResults.length > 0 && (
              <div className="mt-2 space-y-1">
                {customerResults.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onLinkCustomer(c.id);
                      setLinkingCustomer(false);
                      setCustomerSearch('');
                      setCustomerResults([]);
                    }}
                    className="w-full text-left text-sm px-3 py-2 hover:bg-white rounded border border-transparent hover:border-gray-200 transition-colors"
                  >
                    <span className="font-medium">{c.company_name || c.contact_name}</span>
                    <span className="text-gray-500 ml-2 text-xs">#{c.customer_number} · {c.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {email.has_attachments && email.attachments?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {email.attachments.map((att, i) => (
              <span key={i} className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                <Paperclip className="w-3 h-3" />
                {att.filename}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {showHtml && email.body_html ? (
          <div
            className="prose prose-sm max-w-none text-gray-800"
            dangerouslySetInnerHTML={{ __html: email.body_html }}
          />
        ) : (
          <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans leading-relaxed">
            {email.body_plain || '(No body content)'}
          </pre>
        )}
      </div>
    </div>
  );
}
