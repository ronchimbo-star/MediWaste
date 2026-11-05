import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useToastContext } from '../../contexts/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { Sparkles, FileText, Check, X, Mail, RefreshCw, MapPin, Package, Calendar } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';

interface QuoteDraft {
  id: string;
  email_id: string | null;
  quote_request_id: string | null;
  client_name: string;
  client_business: string;
  client_postcode: string;
  waste_types: string[];
  frequency: string;
  estimated_volume: string;
  draft_subject: string;
  draft_body: string;
  status: string;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function AiQuoteDraftsPage() {
  const { toast } = useToastContext();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<QuoteDraft | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: drafts = [], isLoading } = useQuery<QuoteDraft[]>({
    queryKey: ['ai-quote-drafts', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('mw_ai_quote_drafts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/draft-quote-reply`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || result.message || 'Failed to generate draft');

      if (result.success === false) {
        toast.info(result.message || 'No quote emails found');
      } else {
        queryClient.invalidateQueries({ queryKey: ['ai-quote-drafts'] });
        toast.success('Quote draft generated — review and approve to send');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate draft');
    } finally {
      setGenerating(false);
    }
  };

  const updateDraft = useMutation({
    mutationFn: async (updates: Partial<QuoteDraft>) => {
      const { error } = await supabase
        .from('mw_ai_quote_drafts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', selectedDraft!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-quote-drafts'] });
      toast.success('Draft updated');
    },
    onError: () => toast.error('Failed to update draft'),
  });

  const approveDraft = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('mw_ai_quote_drafts')
        .update({
          status: 'approved',
          draft_subject: editSubject,
          draft_body: editBody,
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedDraft!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-quote-drafts'] });
      toast.success('Draft approved — ready to send from your email client');
      setSelectedDraft(null);
    },
    onError: () => toast.error('Failed to approve draft'),
  });

  const rejectDraft = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mw_ai_quote_drafts')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-quote-drafts'] });
      toast.success('Draft rejected');
      setSelectedDraft(null);
    },
  });

  const openDraft = (draft: QuoteDraft) => {
    setSelectedDraft(draft);
    setEditSubject(draft.draft_subject);
    setEditBody(draft.draft_body);
  };

  const pendingCount = drafts.filter(d => d.status === 'pending').length;

  return (
    <AdminLayout pageTitle="AI Quote Drafts" breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'AI Quote Drafts' }]}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-500" />
              AI Quote Drafts
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              AI drafts quote replies from client emails. Review, edit, and approve before sending.
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Drafting...' : 'Draft from Latest Email'}
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          {['all', 'pending', 'approved', 'rejected'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-gray-800 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s}
              {s === 'pending' && pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-xs">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : selectedDraft ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Review Quote Draft</h3>
                  <button onClick={() => setSelectedDraft(null)} className="text-sm text-gray-500 hover:text-gray-700">Back to list</button>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Client:</span>
                      <span className="ml-2 font-medium text-gray-900">{selectedDraft.client_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Business:</span>
                      <span className="ml-2 font-medium text-gray-900">{selectedDraft.client_business}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Postcode:</span>
                      <span className="ml-2 font-medium text-gray-900">{selectedDraft.client_postcode || '—'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Frequency:</span>
                      <span className="ml-2 font-medium text-gray-900">{selectedDraft.frequency || '—'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Waste types:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {selectedDraft.waste_types?.length > 0 ? selectedDraft.waste_types.join(', ') : '—'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Volume:</span>
                      <span className="ml-2 font-medium text-gray-900">{selectedDraft.estimated_volume || '—'}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email Subject</label>
                    <input
                      type="text"
                      value={editSubject}
                      onChange={e => setEditSubject(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email Body (editable)</label>
                    <textarea
                      value={editBody}
                      onChange={e => setEditBody(e.target.value)}
                      rows={16}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    />
                  </div>

                  {selectedDraft.status === 'pending' && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => approveDraft.mutate()}
                        disabled={approveDraft.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-60"
                      >
                        <Check className="w-4 h-4" />
                        Approve & Mark Ready
                      </button>
                      <button
                        onClick={() => rejectDraft.mutate(selectedDraft.id)}
                        disabled={rejectDraft.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-60"
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </button>
                      <button
                        onClick={() => updateDraft.mutate({ draft_subject: editSubject, draft_body: editBody })}
                        disabled={updateDraft.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-60"
                      >
                        Save Changes
                      </button>
                    </div>
                  )}
                  {selectedDraft.status === 'approved' && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Check className="w-4 h-4" />
                      Approved — copy and send from your email client
                    </div>
                  )}
                  {selectedDraft.status === 'rejected' && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <X className="w-4 h-4" />
                      Rejected
                    </div>
                  )}
                </div>
              </div>
            ) : drafts.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No quote drafts yet</h3>
                <p className="text-sm text-gray-500">Click "Draft from Latest Email" to have AI draft a quote reply.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {drafts.map(draft => (
                  <button
                    key={draft.id}
                    onClick={() => openDraft(draft)}
                    className="w-full text-left bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{draft.client_name} — {draft.client_business || 'Unknown business'}</span>
                      <StatusBadge status={draft.status} />
                    </div>
                    <p className="text-sm text-gray-600 truncate mb-2">{draft.draft_subject}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(draft.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                      {draft.client_postcode && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{draft.client_postcode}</span>}
                      {draft.waste_types?.length > 0 && <span className="flex items-center gap-1"><Package className="w-3 h-3" />{draft.waste_types.join(', ')}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-amber-800 mb-1">How it works</h4>
                  <p className="text-xs text-amber-700">
                    1. AI scans recent emails for quote enquiries.<br />
                    2. It extracts client details (name, business, postcode, waste types, frequency).<br />
                    3. It drafts a professional quote email using MediWaste's tone.<br />
                    4. You review, edit, and approve the draft.<br />
                    5. Copy the approved draft into your email client and send manually.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}
