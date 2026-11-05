import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useToastContext } from '../../contexts/ToastContext';
import AdminLayout from '../../components/admin/AdminLayout';
import { RefreshCw } from 'lucide-react';

type QueueStatus = 'queued' | 'sending' | 'sent' | 'failed';

interface QueuedEmail {
  id: string;
  created_at: string;
  to_email: string;
  subject: string;
  category: string;
  status: QueueStatus;
  attempts: number;
  max_attempts: number;
  next_attempt_at: string;
  sent_at: string | null;
  last_error: string | null;
}

interface SendLogEntry {
  id: string;
  created_at: string;
  attempt: number;
  outcome: 'sent' | 'failed';
  error: string | null;
}

const STATUS_FILTERS: ('all' | QueueStatus)[] = ['all', 'queued', 'sending', 'sent', 'failed'];

const STATUS_STYLES: Record<QueueStatus, string> = {
  queued: 'bg-amber-100 text-amber-800',
  sending: 'bg-blue-100 text-blue-800',
  sent: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

export default function EmailQueuePage() {
  const { toast } = useToastContext();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | QueueStatus>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: emails = [], isLoading, error } = useQuery<QueuedEmail[]>({
    queryKey: ['email-queue', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('email_queue')
        .select('id, created_at, to_email, subject, category, status, attempts, max_attempts, next_attempt_at, sent_at, last_error')
        .order('created_at', { ascending: false })
        .limit(100);
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      const { data, error: queryError } = await query;
      if (queryError) throw queryError;
      return data || [];
    },
    refetchInterval: 30000,
  });

  const { data: sendLog = [], isLoading: loadingLog } = useQuery<SendLogEntry[]>({
    queryKey: ['email-send-log', expandedId],
    enabled: !!expandedId,
    queryFn: async () => {
      const { data, error: queryError } = await supabase
        .from('email_send_log')
        .select('id, created_at, attempt, outcome, error')
        .eq('queue_id', expandedId!)
        .order('attempt', { ascending: true });
      if (queryError) throw queryError;
      return data || [];
    },
  });

  const retryMutation = useMutation({
    mutationFn: async (id: string) => {
      const now = new Date().toISOString();
      const { data, error: updateError } = await supabase
        .from('email_queue')
        .update({ status: 'queued', attempts: 0, next_attempt_at: now, last_error: null, updated_at: now })
        .eq('id', id)
        .select('id')
        .maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new Error('the email was not found');
    },
    onSuccess: () => {
      toast.success('Email queued again', 'It will be sent within a minute.');
      queryClient.invalidateQueries({ queryKey: ['email-queue'] });
    },
    onError: (err: Error) => {
      toast.error('Could not retry this email', err.message);
    },
  });

  return (
    <AdminLayout pageTitle="Email Queue" breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Email Queue' }]}>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email queue</h1>
          <p className="text-sm text-gray-500 mt-1">
            Automatic emails are sent within a minute. Failed emails are tried up to four times in total before they stop.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                statusFilter === s ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
            The email queue could not be loaded. Please refresh the page.
          </div>
        ) : isLoading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : emails.length === 0 ? (
          <p className="text-sm text-gray-500">No emails match this filter.</p>
        ) : (
          <div className="space-y-3">
            {emails.map((email) => (
              <div key={email.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{email.subject}</p>
                    <p className="text-sm text-gray-500">
                      To {email.to_email} · {email.category} · {new Date(email.created_at).toLocaleString('en-GB')}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Attempts {email.attempts} of {email.max_attempts}
                      {email.status === 'queued' && ` · next try ${new Date(email.next_attempt_at).toLocaleString('en-GB')}`}
                      {email.sent_at && ` · sent ${new Date(email.sent_at).toLocaleString('en-GB')}`}
                    </p>
                    {email.last_error && (
                      <p className="text-xs text-red-700 mt-1 break-words">{email.last_error}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[email.status]}`}>
                      {email.status}
                    </span>
                    {email.status === 'failed' && (
                      <button
                        type="button"
                        onClick={() => retryMutation.mutate(email.id)}
                        disabled={retryMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-sm hover:bg-orange-600 disabled:opacity-50 transition-colors"
                      >
                        <RefreshCw size={14} />
                        Retry
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === email.id ? null : email.id)}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {expandedId === email.id ? 'Hide log' : 'Send log'}
                    </button>
                  </div>
                </div>

                {expandedId === email.id && (
                  <div className="mt-4 border-t border-gray-100 pt-3">
                    {loadingLog ? (
                      <p className="text-sm text-gray-500">Loading...</p>
                    ) : sendLog.length === 0 ? (
                      <p className="text-sm text-gray-500">No send attempts yet.</p>
                    ) : (
                      <ul className="space-y-2 text-sm">
                        {sendLog.map((entry) => (
                          <li key={entry.id} className="flex flex-wrap gap-2">
                            <span className="text-gray-700">
                              Attempt {entry.attempt} · {new Date(entry.created_at).toLocaleString('en-GB')}
                            </span>
                            <span className={entry.outcome === 'sent' ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                              {entry.outcome}
                            </span>
                            {entry.error && <span className="text-red-700 break-words">{entry.error}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
