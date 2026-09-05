import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useToastContext } from '../../contexts/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { ChevronLeft, Send, Check, PenLine, Sparkles, Download, Eye, FileText, AlertTriangle, Loader2 } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import AuditRenderer, { AuditContent } from '../../components/audit/AuditRenderer';
import { downloadAuditAsPDF } from '../../utils/auditDownload';

interface ProofreadSuggestion {
  section: string;
  issue: string;
  suggestion: string;
  severity: 'high' | 'medium' | 'low';
}
interface ProofreadResult {
  suggestions: ProofreadSuggestion[];
  overall_quality: string;
  summary: string;
}

interface WasteAudit {
  id: string;
  audit_number: string;
  customer_id: string;
  practice_name: string;
  legal_entity: string;
  address: string;
  practice_type: string;
  services_provided: string;
  number_of_surgeries: string;
  number_of_staff: string;
  amalgam_use: string;
  selected_waste_streams: any[];
  ai_generated_content: AuditContent | null;
  admin_edited_content: AuditContent | null;
  client_edits: AuditContent | null;
  final_content: AuditContent | null;
  status: string;
  share_token: string;
  auditor_name: string;
  auditor_title: string;
  admin_signed_at: string | null;
  admin_signed_by: string | null;
  client_signed_at: string | null;
  client_signed_by: string | null;
  client_representative_name: string | null;
  client_representative_title: string | null;
  sent_to_client_at: string | null;
  client_edited_at: string | null;
  finalised_at: string | null;
  created_at: string;
}

export default function WasteAuditEditPage() {
  const { toast } = useToastContext();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const auditId = window.location.pathname.split('/admin/waste-audits/')[1]?.split('/edit')[0];
  const [editContent, setEditContent] = useState<AuditContent | null>(null);
  const [showProofread, setShowProofread] = useState(false);
  const [proofreadResult, setProofreadResult] = useState<ProofreadResult | null>(null);
  const [proofreading, setProofreading] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [customerEmail, setCustomerEmail] = useState<string>('');

  const { data: audit, isLoading } = useQuery<WasteAudit>({
    queryKey: ['waste-audit', auditId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('waste_audits')
        .select('*')
        .eq('id', auditId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!auditId,
  });

  const { data: customer } = useQuery<any>({
    queryKey: ['audit-customer', audit?.customer_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mw_customers')
        .select('email, contact_name, company_name')
        .eq('id', audit!.customer_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!audit?.customer_id,
  });

  // Initialize edit content when audit loads
  useState(() => {
    if (audit?.admin_edited_content && !editContent) {
      setEditContent(audit.admin_edited_content);
    }
    if (customer?.email) setCustomerEmail(customer.email);
  });

  const content = editContent || audit?.admin_edited_content || audit?.ai_generated_content;

  const saveContent = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('waste_audits')
        .update({
          admin_edited_content: editContent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', auditId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste-audit', auditId] });
      toast.success('Changes saved');
    },
    onError: () => toast.error('Failed to save'),
  });

  const sendToClient = useMutation({
    mutationFn: async () => {
      if (editContent) {
        const { error: saveErr } = await supabase
          .from('waste_audits')
          .update({ admin_edited_content: editContent, updated_at: new Date().toISOString() })
          .eq('id', auditId);
        if (saveErr) throw saveErr;
      }

      const { error } = await supabase
        .from('waste_audits')
        .update({
          status: 'sent_to_client',
          sent_to_client_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', auditId);
      if (error) throw error;

      await supabase.from('waste_audit_logs').insert({
        audit_id: auditId,
        user_id: user?.id,
        user_name: 'Admin',
        action: 'sent_to_client',
        details: 'Audit sent to client for review',
      });

      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit-notification`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'sent_to_client',
          auditId,
          recipientEmail: customerEmail || customer?.email,
          recipientName: audit?.practice_name,
          auditNumber: audit?.audit_number,
          shareToken: audit?.share_token,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste-audit', auditId] });
      queryClient.invalidateQueries({ queryKey: ['waste-audits'] });
      toast.success('Audit sent to client — they will receive an email with a link to review');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to send'),
  });

  const finaliseAudit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('waste_audits')
        .update({
          status: 'finalised',
          final_content: editContent || audit?.admin_edited_content,
          finalised_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', auditId);
      if (error) throw error;

      await supabase.from('waste_audit_logs').insert({
        audit_id: auditId,
        user_id: user?.id,
        user_name: 'Admin',
        action: 'finalised',
        details: 'Audit finalised and locked for signing',
      });

      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit-notification`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'ready_for_signature',
          auditId,
          recipientEmail: customerEmail || customer?.email,
          recipientName: audit?.practice_name,
          auditNumber: audit?.audit_number,
          shareToken: audit?.share_token,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste-audit', auditId] });
      queryClient.invalidateQueries({ queryKey: ['waste-audits'] });
      toast.success('Audit finalised — client has been notified to sign');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to finalise'),
  });

  const signAsAdmin = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('waste_audits')
        .update({
          admin_signed_at: new Date().toISOString(),
          admin_signed_by: user?.id,
          auditor_name: audit?.auditor_name || 'MediWaste',
          updated_at: new Date().toISOString(),
          status: audit?.client_signed_at ? 'signed' : 'finalised',
        })
        .eq('id', auditId);
      if (error) throw error;

      await supabase.from('waste_audit_logs').insert({
        audit_id: auditId,
        user_id: user?.id,
        user_name: 'Admin',
        action: 'admin_signed',
        details: 'Admin signed the audit document',
      });

      if (audit?.client_signed_at) {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit-notification`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'fully_signed',
            auditId,
            recipientEmail: customerEmail || customer?.email,
            auditNumber: audit?.audit_number,
            shareToken: audit?.share_token,
          }),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste-audit', auditId] });
      queryClient.invalidateQueries({ queryKey: ['waste-audits'] });
      toast.success('Audit signed by MediWaste');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to sign'),
  });

  const handleProofread = async () => {
    setProofreading(true);
    setShowProofread(true);
    setProofreadResult(null);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-audit-draft`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ auditId, mode: 'proofread', content: editContent || audit?.admin_edited_content }),
        }
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || 'Failed to proofread');
      setProofreadResult(result.proofread);
    } catch (err: any) {
      setProofreadResult({ suggestions: [], overall_quality: 'error', summary: err.message || 'Proofreading failed. Please try again.' });
    } finally {
      setProofreading(false);
    }
  };

  const downloadPDF = async () => {
    if (!audit) return;
    setDownloadingPDF(true);
    try {
      await downloadAuditAsPDF(audit.audit_number);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  if (isLoading || !audit) {
    return (
      <AdminLayout pageTitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  const isEditable = audit.status === 'draft' || audit.status === 'ready_for_review';
  const showClientEdits = audit.status === 'ready_for_review' && audit.client_edits;
  const displayContent = audit.status === 'finalised' || audit.status === 'signed'
    ? audit.final_content || audit.admin_edited_content
    : showClientEdits
      ? audit.client_edits
      : content;

  return (
    <AdminLayout pageTitle={`Audit ${audit.audit_number}`} breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'Waste Audits', path: '/admin/waste-audits' }, { label: audit.audit_number }]}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Toolbar */}
        <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <a href="/admin/waste-audits" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <ChevronLeft className="w-4 h-4" /> Back
            </a>
            <span className="text-sm font-medium text-gray-900">{audit.audit_number}</span>
            <StatusBadge status={audit.status} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isEditable && (
              <>
                <button
                  onClick={() => handleProofread()}
                  disabled={proofreading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-60"
                >
                  <Sparkles className="w-4 h-4" />
                  {proofreading ? 'Proofreading...' : 'AI Proofread'}
                </button>
                <button
                  onClick={() => saveContent.mutate()}
                  disabled={saveContent.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-60"
                >
                  <Check className="w-4 h-4" />
                  Save
                </button>
              </>
            )}
            <a
              href={`/audit/${audit.share_token}`}
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Public View
            </a>
            {(audit.status === 'finalised' || audit.status === 'signed') && (
              <button
                onClick={downloadPDF}
                disabled={downloadingPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
              >
                {downloadingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {downloadingPDF ? 'Generating...' : 'Download PDF'}
              </button>
            )}
            {audit.status === 'draft' && (
              <button
                onClick={() => sendToClient.mutate()}
                disabled={sendToClient.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                <Send className="w-4 h-4" />
                {sendToClient.isPending ? 'Sending...' : 'Send to Client'}
              </button>
            )}
            {audit.status === 'ready_for_review' && (
              <button
                onClick={() => finaliseAudit.mutate()}
                disabled={finaliseAudit.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-60"
              >
                <Check className="w-4 h-4" />
                {finaliseAudit.isPending ? 'Finalising...' : 'Review & Finalise'}
              </button>
            )}
            {(audit.status === 'finalised' || (audit.status === 'signed' && !audit.admin_signed_at)) && !audit.admin_signed_at && (
              <button
                onClick={() => signAsAdmin.mutate()}
                disabled={signAsAdmin.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
              >
                <PenLine className="w-4 h-4" />
                {signAsAdmin.isPending ? 'Signing...' : 'Sign as MediWaste'}
              </button>
            )}
          </div>
        </div>

        {/* Client edits notice */}
        {showClientEdits && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-amber-800">Client has submitted edits</h4>
              <p className="text-xs text-amber-700 mt-1">
                The client reviewed this audit on {audit.client_edited_at ? new Date(audit.client_edited_at).toLocaleDateString('en-GB') : 'N/A'}.
                Review their changes below. When satisfied, click "Review & Finalise" to lock the document for signing.
              </p>
            </div>
          </div>
        )}

        {/* Proofread panel */}
        {showProofread && (
          <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-purple-800 mb-1">AI Proofread Results</h4>
                {proofreading ? (
                  <div className="flex items-center gap-2 text-sm text-purple-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Reviewing document for compliance, clarity, and grammar...
                  </div>
                ) : proofreadResult ? (
                  <>
                    <p className="text-sm text-purple-700 mb-2">{proofreadResult.summary}</p>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${proofreadResult.overall_quality === 'excellent' ? 'bg-green-100 text-green-700' : proofreadResult.overall_quality === 'good' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                        {proofreadResult.overall_quality?.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-purple-600">{proofreadResult.suggestions?.length || 0} suggestions</span>
                    </div>
                    {proofreadResult.suggestions && proofreadResult.suggestions.length > 0 && (
                      <div className="space-y-2">
                        {proofreadResult.suggestions.map((s, i) => (
                          <div key={i} className="bg-white rounded-lg p-3 border border-purple-100">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${s.severity === 'high' ? 'bg-red-100 text-red-700' : s.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                                {s.severity}
                              </span>
                              <span className="text-xs font-medium text-gray-700">{s.section}</span>
                            </div>
                            <p className="text-xs text-gray-600 mb-1"><strong>Issue:</strong> {s.issue}</p>
                            <p className="text-xs text-purple-700"><strong>Suggestion:</strong> {s.suggestion}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={() => setShowProofread(false)} className="mt-3 text-xs text-purple-600 underline">Dismiss</button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Customer email input for sending */}
        {audit.status === 'draft' && !customer?.email && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">Client email (for sending the audit link)</label>
            <input
              type="email"
              placeholder="client@example.com"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="max-w-xs px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400"
            />
          </div>
        )}

        {/* Audit content */}
        <AuditRenderer
          content={displayContent as AuditContent}
          practiceName={audit.practice_name}
          legalEntity={audit.legal_entity}
          address={audit.address}
          auditNumber={audit.audit_number}
          auditorName={audit.auditor_name}
          auditorTitle={audit.auditor_title}
          adminSignedAt={audit.admin_signed_at}
          clientSignedAt={audit.client_signed_at}
          clientRepresentativeName={audit.client_representative_name}
          clientRepresentativeTitle={audit.client_representative_title}
          editable={isEditable}
          onContentChange={setEditContent}
        />

        {/* Audit log */}
        <AuditLogPanel auditId={auditId} />
      </div>
    </AdminLayout>
  );
}

function AuditLogPanel({ auditId }: { auditId: string }) {
  const { data: logs = [] } = useQuery<any[]>({
    queryKey: ['waste-audit-logs', auditId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('waste_audit_logs')
        .select('*')
        .eq('audit_id', auditId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  if (logs.length === 0) return null;

  return (
    <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
        <FileText className="w-4 h-4 text-gray-400" />
        Audit History
      </h4>
      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="font-medium text-gray-700">{log.action.replace(/_/g, ' ')}</span>
            {log.details && <span>— {log.details}</span>}
            <span className="ml-auto">{new Date(log.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    sent_to_client: 'bg-blue-100 text-blue-700',
    client_editing: 'bg-amber-100 text-amber-700',
    ready_for_review: 'bg-amber-100 text-amber-700',
    finalised: 'bg-purple-100 text-purple-700',
    signed: 'bg-green-100 text-green-700',
  };
  const labels: Record<string, string> = {
    draft: 'Draft',
    sent_to_client: 'Sent',
    client_editing: 'Client Editing',
    ready_for_review: 'Ready for Review',
    finalised: 'Finalised',
    signed: 'Signed',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {labels[status] || status}
    </span>
  );
}
