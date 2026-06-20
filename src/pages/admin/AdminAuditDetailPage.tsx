import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Download,
  FileText,
  MessageSquare,
  ClipboardList,
  RefreshCw,
} from 'lucide-react';

function riskBadge(rating: string) {
  const map: Record<string, string> = {
    low: 'bg-green-100 text-green-700 border-green-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    high: 'bg-red-100 text-red-700 border-red-200',
    critical: 'bg-purple-100 text-purple-700 border-purple-200',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${map[rating] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {rating?.toUpperCase() || 'N/A'}
    </span>
  );
}

const PRIORITY_COLOURS: Record<string, string> = {
  immediate: 'text-red-600',
  short_term: 'text-amber-600',
  ongoing: 'text-blue-600',
};

const SEVERITY_COLOURS: Record<string, string> = {
  critical: 'bg-purple-100 text-purple-700',
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-green-100 text-green-700',
};

type Section = 'overview' | 'answers' | 'report' | 'downloads' | 'quote';

export default function AdminAuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<Section>('overview');

  const { data: session, isLoading } = useQuery({
    queryKey: ['admin-audit-session', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('mw_audit_sessions')
        .select('*')
        .eq('id', id!)
        .single();
      return data;
    },
    enabled: !!id,
  });

  const { data: answers } = useQuery({
    queryKey: ['admin-audit-answers', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('mw_audit_answers')
        .select('*')
        .eq('session_id', id!)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const { data: report } = useQuery({
    queryKey: ['admin-audit-report', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('mw_audit_reports')
        .select('*')
        .eq('session_id', id!)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const { data: downloads = [] } = useQuery({
    queryKey: ['admin-audit-downloads', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('mw_audit_download_events')
        .select('*')
        .eq('session_id', id!)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: quoteRequest } = useQuery({
    queryKey: ['admin-audit-quote', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('mw_audit_quote_requests')
        .select('*')
        .eq('session_id', id!)
        .maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-audit-report', {
        body: { session_id: id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-audit-report', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit-session', id] });
    },
  });

  const resendEmailMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('send-audit-email', {
        body: { session_id: id, send_to_user: true },
      });
      if (error) throw error;
      return data;
    },
  });

  const updateQuoteStatus = useMutation({
    mutationFn: async (status: string) => {
      await supabase
        .from('mw_audit_quote_requests')
        .update({ status })
        .eq('session_id', id!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-audit-quote', id] });
    },
  });

  if (isLoading) {
    return (
      <AdminLayout pageTitle="Audit Detail" breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Audits', path: '/admin/audits' }, { label: 'Loading...' }]}>
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!session) {
    return (
      <AdminLayout pageTitle="Not Found" breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Audits', path: '/admin/audits' }]}>
        <div className="text-center py-24 text-gray-500">Audit session not found.</div>
      </AdminLayout>
    );
  }

  const sections: { key: Section; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'answers', label: 'Audit Answers' },
    { key: 'report', label: 'Generated Report' },
    { key: 'downloads', label: `Downloads (${downloads.length})` },
    { key: 'quote', label: quoteRequest ? 'Quote Request' : 'Quote' },
  ];

  return (
    <AdminLayout
      pageTitle={session.business_name}
      breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Audits', path: '/admin/audits' }, { label: session.business_name }]}
    >
      <div className="mb-4">
        <Link to="/admin/audits" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={14} /> Back to Audits
        </Link>
      </div>

      {/* Header card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{session.business_name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                session.status === 'completed' ? 'bg-green-100 text-green-700' :
                session.status === 'generating' ? 'bg-blue-100 text-blue-700' :
                'bg-amber-100 text-amber-700'
              }`}>{session.status}</span>
            </div>
            <p className="text-gray-500 text-sm">{session.sector}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-600">
              {session.contact_name && <span className="flex items-center gap-1"><User size={13} /> {session.contact_name}</span>}
              {session.email && <span className="flex items-center gap-1"><Mail size={13} /> {session.email}</span>}
              {session.phone && <span className="flex items-center gap-1"><Phone size={13} /> {session.phone}</span>}
              {(session.town || session.county) && <span className="flex items-center gap-1"><MapPin size={13} /> {[session.town, session.county].filter(Boolean).join(', ')}</span>}
              <span className="flex items-center gap-1"><Calendar size={13} /> {new Date(session.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {report && riskBadge(report.risk_rating)}
            {report && <span className="text-sm text-gray-500">Score: <span className="font-bold text-gray-800">{report.risk_score}/100</span></span>}
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {sections.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeSection === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeSection === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-5">
          <InfoCard title="Business Details">
            <Row label="Business Name" value={session.business_name} />
            <Row label="Sector" value={session.sector} />
            <Row label="Contact" value={session.contact_name} />
            <Row label="Email" value={session.email} />
            <Row label="Phone" value={session.phone} />
            <Row label="Address" value={[session.site_address, session.town, session.postcode].filter(Boolean).join(', ')} />
            <Row label="County" value={session.county} />
          </InfoCard>
          <InfoCard title="Audit Status">
            <Row label="Status" value={session.status} />
            <Row label="Started" value={new Date(session.created_at).toLocaleString('en-GB')} />
            <Row label="Completed" value={session.completed_at ? new Date(session.completed_at).toLocaleString('en-GB') : '—'} />
            <Row label="Consent Given" value={session.consent_given ? 'Yes' : 'No'} />
            <Row label="Marketing OK" value={session.marketing_consent ? 'Yes' : 'No'} />
            {report && <>
              <Row label="Risk Rating" value={<span className="capitalize font-semibold">{report.risk_rating}</span>} />
              <Row label="Risk Score" value={`${report.risk_score}/100`} />
              <Row label="Report Status" value={report.generation_status} />
              <Row label="AI Tokens" value={report.ai_tokens_used ? String(report.ai_tokens_used) : '—'} />
            </>}
          </InfoCard>
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => regenerateMutation.mutate()}
                disabled={regenerateMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                <RefreshCw size={14} className={regenerateMutation.isPending ? 'animate-spin' : ''} />
                {regenerateMutation.isPending ? 'Regenerating...' : 'Regenerate Report'}
              </button>
              {session.email && (
                <button
                  onClick={() => resendEmailMutation.mutate()}
                  disabled={resendEmailMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60 transition-colors"
                >
                  <Mail size={14} />
                  {resendEmailMutation.isPending ? 'Sending...' : 'Resend Email to Customer'}
                </button>
              )}
            </div>
            {regenerateMutation.isError && (
              <p className="mt-2 text-sm text-red-600">Error: {(regenerateMutation.error as Error).message}</p>
            )}
            {regenerateMutation.isSuccess && (
              <p className="mt-2 text-sm text-green-600">Report regenerated successfully.</p>
            )}
            {resendEmailMutation.isSuccess && (
              <p className="mt-2 text-sm text-green-600">Email sent successfully.</p>
            )}
          </div>
        </div>
      )}

      {/* Audit Answers */}
      {activeSection === 'answers' && answers && (
        <div className="grid lg:grid-cols-2 gap-5">
          <InfoCard title="Waste Streams">
            {answers.waste_streams?.length ? (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-100"><th className="py-1">Type</th><th className="py-1">Volume</th><th className="py-1">Unit</th></tr></thead>
                <tbody>
                  {answers.waste_streams.map((w: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50"><td className="py-1.5">{w.type}</td><td className="py-1.5">{w.volume}</td><td className="py-1.5">{w.unit}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-gray-400 text-sm">None specified</p>}
          </InfoCard>
          <InfoCard title="Contractor & Collection">
            <Row label="Current Contractor" value={answers.current_contractor} />
            <Row label="Collection Frequency" value={answers.collection_frequency} />
            <Row label="Container Types" value={(answers.container_types || []).join(', ')} />
            <Row label="Segregation Method" value={answers.segregation_method} />
          </InfoCard>
          <InfoCard title="Storage & Compliance">
            <Row label="Storage Location" value={answers.storage_location} />
            <Row label="Storage Conditions" value={answers.storage_conditions} />
            <Row label="Waste Policy" value={answers.has_waste_policy ? 'Yes' : 'No'} />
            <Row label="Staff Trained" value={answers.staff_trained ? 'Yes' : 'No'} />
            <Row label="Last Audit Date" value={answers.last_audit_date} />
            <Row label="Compliance Concerns" value={answers.compliance_concerns} />
          </InfoCard>
          <InfoCard title="Business Profile">
            <Row label="Staff Count" value={answers.staff_count} />
            <Row label="Treatment Rooms" value={answers.treatment_rooms} />
            <Row label="Sites" value={answers.sites_count} />
            <Row label="Pain Points" value={(answers.pain_points || []).join(', ')} />
            {answers.pain_points_other && <Row label="Other Pain Points" value={answers.pain_points_other} />}
            {answers.additional_notes && <Row label="Additional Notes" value={answers.additional_notes} />}
          </InfoCard>
        </div>
      )}
      {activeSection === 'answers' && !answers && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400">
          <ClipboardList size={32} className="mx-auto mb-2" />
          <p>No audit answers recorded yet.</p>
        </div>
      )}

      {/* Report */}
      {activeSection === 'report' && report && (
        <div className="space-y-5">
          <InfoCard title="Executive Summary">
            <p className="text-sm text-gray-700 leading-relaxed">{report.executive_summary}</p>
          </InfoCard>

          {report.compliance_risks?.length > 0 && (
            <InfoCard title="Compliance Risks">
              <div className="space-y-3">
                {report.compliance_risks.map((r: any, i: number) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-semibold text-gray-800 text-sm">{r.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${SEVERITY_COLOURS[r.severity] || 'bg-gray-100 text-gray-600'}`}>{r.severity}</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{r.description}</p>
                    {r.regulation && <p className="text-xs text-blue-600 mb-1 italic">{r.regulation}</p>}
                    <p className="text-xs text-gray-500"><span className="font-medium text-gray-700">Action:</span> {r.action}</p>
                  </div>
                ))}
              </div>
            </InfoCard>
          )}

          {report.waste_stream_breakdown?.length > 0 && (
            <InfoCard title="Waste Stream Breakdown">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                      <th className="py-2 pr-3">Waste Type</th>
                      <th className="py-2 pr-3">EWC Code</th>
                      <th className="py-2 pr-3">Container</th>
                      <th className="py-2 pr-3">Frequency</th>
                      <th className="py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.waste_stream_breakdown.map((w: any, i: number) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-2 pr-3 font-medium text-gray-800">{w.waste_type}</td>
                        <td className="py-2 pr-3 text-gray-500 font-mono text-xs">{w.ewc_code}</td>
                        <td className="py-2 pr-3 text-gray-600">{w.container}</td>
                        <td className="py-2 pr-3 text-gray-600">{w.frequency}</td>
                        <td className="py-2 text-gray-500 text-xs">{w.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </InfoCard>
          )}

          {report.recommendations?.length > 0 && (
            <InfoCard title="Recommendations">
              <div className="space-y-3">
                {report.recommendations.map((r: any, i: number) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-start gap-2 mb-1">
                      <span className={`text-xs font-bold uppercase ${PRIORITY_COLOURS[r.priority] || 'text-gray-500'}`}>{r.priority?.replace('_', ' ')}</span>
                      <span className="font-semibold text-gray-800 text-sm">{r.title}</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{r.description}</p>
                    {r.benefit && <p className="text-xs text-green-700 italic">{r.benefit}</p>}
                  </div>
                ))}
              </div>
            </InfoCard>
          )}
        </div>
      )}
      {activeSection === 'report' && !report && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400">
          <FileText size={32} className="mx-auto mb-2" />
          <p>No report generated yet.</p>
          <button
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            <RefreshCw size={14} className={regenerateMutation.isPending ? 'animate-spin' : ''} />
            Generate Report
          </button>
        </div>
      )}

      {/* Downloads */}
      {activeSection === 'downloads' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {downloads.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Download size={32} className="mx-auto mb-2" />
              <p>No downloads yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Format</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {downloads.map((d: any) => (
                  <tr key={d.id}>
                    <td className="px-4 py-3 font-medium text-gray-800 capitalize">{d.format}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(d.created_at).toLocaleString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Quote Request */}
      {activeSection === 'quote' && (
        <div>
          {quoteRequest ? (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Quote Request Details</h3>
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <Row label="Submitted" value={new Date(quoteRequest.created_at).toLocaleString('en-GB')} />
                <Row label="Status" value={quoteRequest.status} />
                <Row label="Name" value={quoteRequest.contact_name} />
                <Row label="Email" value={quoteRequest.email} />
                <Row label="Phone" value={quoteRequest.phone} />
                <Row label="Address" value={quoteRequest.site_address} />
                <Row label="Postcode" value={quoteRequest.postcode} />
              </div>
              {quoteRequest.message && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-500 font-medium mb-1">Message</p>
                  <p className="text-sm text-gray-700">{quoteRequest.message}</p>
                </div>
              )}
              <div className="flex gap-2">
                {['new', 'contacted', 'quoted', 'won', 'lost'].map((s) => (
                  <button
                    key={s}
                    onClick={() => updateQuoteStatus.mutate(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      quoteRequest.status === s
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400">
              <MessageSquare size={32} className="mx-auto mb-2" />
              <p>No quote request submitted for this audit.</p>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start justify-between gap-2 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 flex-shrink-0 w-32">{label}</span>
      <span className="text-sm text-gray-800 text-right">{value}</span>
    </div>
  );
}
