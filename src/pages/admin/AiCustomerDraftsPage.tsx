import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useToastContext } from '../../contexts/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { Sparkles, UserPlus, Check, X, RefreshCw, Award, FileText, Calendar, MapPin } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';

interface CustomerDraft {
  id: string;
  email_id: string | null;
  client_name: string;
  business_name: string;
  address: string;
  postcode: string;
  plan_type: string;
  start_date: string | null;
  waste_streams: string[];
  certificate_draft: string;
  invoice_email_draft: string;
  status: string;
  approved_at: string | null;
  created_customer_id: string | null;
  created_certificate_id: string | null;
  created_at: string;
  updated_at: string;
}

export default function AiCustomerDraftsPage() {
  const { toast } = useToastContext();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<CustomerDraft | null>(null);
  const [editCert, setEditCert] = useState('');
  const [editInvoice, setEditInvoice] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: drafts = [], isLoading } = useQuery<CustomerDraft[]>({
    queryKey: ['ai-customer-drafts', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('mw_ai_customer_drafts')
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
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/draft-customer-setup`,
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
        toast.info(result.message || 'No confirmation emails found');
      } else {
        queryClient.invalidateQueries({ queryKey: ['ai-customer-drafts'] });
        toast.success('Customer draft generated — review and approve');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate draft');
    } finally {
      setGenerating(false);
    }
  };

  const approveAndCreate = useMutation({
    mutationFn: async () => {
      const draft = selectedDraft!;
      const { data: customer, error: custError } = await supabase
        .from('mw_customers')
        .insert([{
          contact_name: draft.client_name,
          company_name: draft.business_name,
          email: '',
          billing_address: draft.address,
          postcode: draft.postcode,
          source: 'ai_draft',
          source_id: draft.id,
        }])
        .select('id, customer_number')
        .single();
      if (custError) throw new Error(`Failed to create customer: ${custError.message}`);

      const certToken = crypto.randomUUID();
      const { data: cert, error: certError } = await supabase
        .from('mw_certificates')
        .insert([{
          customer_id: customer.id,
          issue_date: new Date().toISOString().split('T')[0],
          expiry_date: draft.start_date
            ? new Date(new Date(draft.start_date).setFullYear(new Date(draft.start_date).getFullYear() + 1)).toISOString().split('T')[0]
            : new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
          contract_start_date: draft.start_date || new Date().toISOString().split('T')[0],
          contract_end_date: draft.start_date
            ? new Date(new Date(draft.start_date).setFullYear(new Date(draft.start_date).getFullYear() + 1)).toISOString().split('T')[0]
            : new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
          waste_types_covered: draft.waste_streams || [],
          qr_code_token: certToken,
          status: 'active',
          authorised_signatory_name: 'MediWaste',
          certification_statement: editCert,
        }])
        .select('id')
        .single();
      if (certError) throw new Error(`Failed to create certificate: ${certError.message}`);

      const { error: updateError } = await supabase
        .from('mw_ai_customer_drafts')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
          certificate_draft: editCert,
          invoice_email_draft: editInvoice,
          created_customer_id: customer.id,
          created_certificate_id: cert.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', draft.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-customer-drafts'] });
      toast.success('Customer and certificate created successfully');
      setSelectedDraft(null);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to approve and create'),
  });

  const rejectDraft = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mw_ai_customer_drafts')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-customer-drafts'] });
      toast.success('Draft rejected');
      setSelectedDraft(null);
    },
  });

  const openDraft = (draft: CustomerDraft) => {
    setSelectedDraft(draft);
    setEditCert(draft.certificate_draft);
    setEditInvoice(draft.invoice_email_draft);
  };

  const pendingCount = drafts.filter(d => d.status === 'pending').length;

  return (
    <AdminLayout pageTitle="AI Customer Setup" breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'AI Customer Setup' }]}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-500" />
              AI Customer Setup
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              AI extracts customer details from confirmation emails and drafts certificates and invoice requests.
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Processing...' : 'Draft from Latest Email'}
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
                  <h3 className="font-medium text-gray-900">Review Customer Setup</h3>
                  <button onClick={() => setSelectedDraft(null)} className="text-sm text-gray-500 hover:text-gray-700">Back to list</button>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-500">Client:</span> <span className="ml-2 font-medium">{selectedDraft.client_name}</span></div>
                    <div><span className="text-gray-500">Business:</span> <span className="ml-2 font-medium">{selectedDraft.business_name}</span></div>
                    <div><span className="text-gray-500">Postcode:</span> <span className="ml-2 font-medium">{selectedDraft.postcode || '—'}</span></div>
                    <div><span className="text-gray-500">Plan:</span> <span className="ml-2 font-medium">{selectedDraft.plan_type || '—'}</span></div>
                    <div><span className="text-gray-500">Start:</span> <span className="ml-2 font-medium">{selectedDraft.start_date ? new Date(selectedDraft.start_date).toLocaleDateString('en-GB') : '—'}</span></div>
                    <div className="col-span-2"><span className="text-gray-500">Waste streams:</span> <span className="ml-2 font-medium">{selectedDraft.waste_streams?.join(', ') || '—'}</span></div>
                    {selectedDraft.address && <div className="col-span-2"><span className="text-gray-500">Address:</span> <span className="ml-2 font-medium">{selectedDraft.address}</span></div>}
                  </div>

                  {selectedDraft.status === 'approved' && selectedDraft.created_customer_id && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Customer and certificate created. View customer in the Customers page.
                    </div>
                  )}

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
                      <Award className="w-3.5 h-3.5" /> Certificate Draft (editable)
                    </label>
                    <textarea
                      value={editCert}
                      onChange={e => setEditCert(e.target.value)}
                      rows={12}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
                      <FileText className="w-3.5 h-3.5" /> Invoice Email Draft (editable)
                    </label>
                    <textarea
                      value={editInvoice}
                      onChange={e => setEditInvoice(e.target.value)}
                      rows={10}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    />
                  </div>

                  {selectedDraft.status === 'pending' && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => approveAndCreate.mutate()}
                        disabled={approveAndCreate.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-60"
                      >
                        <UserPlus className="w-4 h-4" />
                        {approveAndCreate.isPending ? 'Creating...' : 'Approve & Create Customer + Certificate'}
                      </button>
                      <button
                        onClick={() => rejectDraft.mutate(selectedDraft.id)}
                        disabled={rejectDraft.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-60"
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : drafts.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No customer drafts yet</h3>
                <p className="text-sm text-gray-500">Click "Draft from Latest Email" to have AI extract customer details from confirmation emails.</p>
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
                      <span className="font-medium text-gray-900">{draft.client_name} — {draft.business_name || 'Unknown'}</span>
                      <StatusBadge status={draft.status} />
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{draft.plan_type || 'No plan specified'} · {draft.waste_streams?.join(', ') || 'No waste streams'}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(draft.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                      {draft.postcode && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{draft.postcode}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <UserPlus className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-amber-800 mb-1">How it works</h4>
                  <p className="text-xs text-amber-700">
                    1. AI scans recent emails for client confirmations.<br />
                    2. It extracts client name, business, address, plan type, and waste streams.<br />
                    3. It drafts a Waste Management Certificate.<br />
                    4. It drafts an invoice request email to Accounts.<br />
                    5. You review, edit, and approve.<br />
                    6. On approval, a customer record and certificate are created automatically.
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
