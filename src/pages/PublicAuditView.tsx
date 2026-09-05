import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useToastContext } from '../contexts/ToastContext';
import { Check, PenLine, Download, Eye, Edit3, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import AuditRenderer, { AuditContent } from '../components/audit/AuditRenderer';
import { downloadAuditAsPDF } from '../utils/auditDownload';

export default function PublicAuditView() {
  const { toast } = useToastContext();
  const queryClient = useQueryClient();
  const shareToken = window.location.pathname.split('/audit/')[1];
  const [editContent, setEditContent] = useState<AuditContent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [repName, setRepName] = useState('');
  const [repTitle, setRepTitle] = useState('');
  const [signing, setSigning] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const { data: audit, isLoading } = useQuery<any>({
    queryKey: ['public-audit', shareToken],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('waste_audits')
        .select('*')
        .eq('share_token', shareToken)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!shareToken,
  });

  useEffect(() => {
    if (audit?.admin_edited_content && !editContent) {
      setEditContent(audit.admin_edited_content);
    }
    if (audit?.client_representative_name) setRepName(audit.client_representative_name);
    if (audit?.client_representative_title) setRepTitle(audit.client_representative_title);
  }, [audit]);

  const submitEdits = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('waste_audits')
        .update({
          client_edits: editContent,
          client_edited_at: new Date().toISOString(),
          client_representative_name: repName,
          client_representative_title: repTitle,
          status: 'ready_for_review',
          updated_at: new Date().toISOString(),
        })
        .eq('id', audit.id);
      if (error) throw error;

      await supabase.from('waste_audit_logs').insert({
        audit_id: audit.id,
        user_name: repName || 'Client',
        action: 'client_edited',
        details: 'Client submitted edits to the audit',
      });

      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit-notification`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'client_edited',
          auditId: audit.id,
          auditNumber: audit.audit_number,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-audit', shareToken] });
      setIsEditing(false);
      toast.success('Your edits have been submitted to MediWaste for review');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to submit edits'),
  });

  const signDocument = useMutation({
    mutationFn: async () => {
      setSigning(true);
      const { error } = await supabase
        .from('waste_audits')
        .update({
          client_signed_at: new Date().toISOString(),
          client_signed_by: repName,
          client_representative_name: repName,
          client_representative_title: repTitle,
          status: audit.admin_signed_at ? 'signed' : 'finalised',
          updated_at: new Date().toISOString(),
        })
        .eq('id', audit.id);
      if (error) throw error;

      await supabase.from('waste_audit_logs').insert({
        audit_id: audit.id,
        user_name: repName,
        action: 'client_signed',
        details: 'Client signed the audit document',
      });

      if (audit.admin_signed_at) {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit-notification`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'fully_signed',
            auditId: audit.id,
            auditNumber: audit.audit_number,
            shareToken: audit.share_token,
          }),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-audit', shareToken] });
      toast.success('Document signed successfully');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to sign'),
    onSettled: () => setSigning(false),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900">Audit not found</h2>
          <p className="text-sm text-gray-500 mt-1">This audit link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  const canEdit = audit.status === 'sent_to_client';
  const canSign = audit.status === 'finalised' && !audit.client_signed_at;
  const isFullySigned = audit.status === 'signed' || (audit.admin_signed_at && audit.client_signed_at);

  const displayContent = (isEditing ? editContent : audit.final_content || audit.admin_edited_content || audit.ai_generated_content) as AuditContent;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 print:hidden">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/mediwaste-logo.png" alt="MediWaste" className="h-8" />
            <div>
              <h1 className="text-sm font-bold text-gray-900">Pre-Acceptance Waste Audit</h1>
              <p className="text-xs text-gray-500">{audit.audit_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={audit.status} />
            {isFullySigned && (
              <button
                onClick={async () => {
                  setDownloadingPDF(true);
                  try { await downloadAuditAsPDF(audit.audit_number); }
                  catch { toast.error('Failed to generate PDF'); }
                  finally { setDownloadingPDF(false); }
                }}
                disabled={downloadingPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
              >
                {downloadingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {downloadingPDF ? 'Generating...' : 'Download PDF'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 print:py-0 print:px-0">
        {/* Status notices */}
        {canEdit && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3 print:hidden">
            <Eye className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-800">Please review this audit</h4>
              <p className="text-xs text-blue-700 mt-1">
                MediWaste has prepared this Pre-Acceptance Waste Audit for your practice. Please review the document carefully.
                You can edit any details, add your representative name and title, then submit your edits back to MediWaste for finalisation.
              </p>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Start Editing
                </button>
              )}
            </div>
          </div>
        )}

        {canSign && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 print:hidden">
            <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-amber-800">Ready for your signature</h4>
              <p className="text-xs text-amber-700 mt-1">
                This audit has been finalised by MediWaste. Please review the final document and sign below to confirm your agreement.
              </p>
            </div>
          </div>
        )}

        {isFullySigned && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3 print:hidden">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-green-800">Document fully signed</h4>
              <p className="text-xs text-green-700 mt-1">
                This audit has been signed by both MediWaste and your practice representative. You can download a PDF copy using the button above.
              </p>
            </div>
          </div>
        )}

        {/* Audit document */}
        <AuditRenderer
          content={displayContent}
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
          editable={isEditing}
          onContentChange={setEditContent}
        />

        {/* Action panel */}
        {isEditing && (
          <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-6 print:hidden">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Submit Your Edits</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Your Name</label>
                <input
                  type="text"
                  value={repName}
                  onChange={(e) => setRepName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Your Job Title</label>
                <input
                  type="text"
                  value={repTitle}
                  onChange={(e) => setRepTitle(e.target.value)}
                  placeholder="e.g. Practice Manager"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => submitEdits.mutate()}
                disabled={submitEdits.isPending || !repName}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
              >
                <Check className="w-4 h-4" />
                {submitEdits.isPending ? 'Submitting...' : 'Submit Edits to MediWaste'}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {canSign && !isEditing && (
          <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-6 print:hidden">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Sign This Document</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Practice Representative Name</label>
                <input
                  type="text"
                  value={repName}
                  onChange={(e) => setRepName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Job Title</label>
                <input
                  type="text"
                  value={repTitle}
                  onChange={(e) => setRepTitle(e.target.value)}
                  placeholder="e.g. Practice Owner"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
            <button
              onClick={() => signDocument.mutate()}
              disabled={signing || !repName}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60"
            >
              <PenLine className="w-4 h-4" />
              {signing ? 'Signing...' : 'Sign Document'}
            </button>
          </div>
        )}
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
    sent_to_client: 'Awaiting Your Review',
    client_editing: 'Being Edited',
    ready_for_review: 'Under Review',
    finalised: 'Ready to Sign',
    signed: 'Signed',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {labels[status] || status}
    </span>
  );
}
