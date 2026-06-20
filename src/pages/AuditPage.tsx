import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import SEO from '../components/SEO';
import { useSiteSettings } from '../hooks/useSiteSettings';
import {
  ClipboardList, ChevronRight, ChevronLeft, CheckCircle, AlertTriangle,
  Download, Mail, FileText, BarChart2, Loader, ArrowRight, Shield,
  Building2, Users, Syringe, Trash2, Star, X, Info, Phone, FileSpreadsheet,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

const SECTORS = [
  { value: 'dental', label: 'Dental Practice', icon: '🦷' },
  { value: 'gp', label: 'GP / Medical Practice', icon: '🏥' },
  { value: 'nursing', label: 'Nursing / Community Healthcare', icon: '💊' },
  { value: 'tattoo', label: 'Tattoo / Piercing Studio', icon: '🎨' },
  { value: 'laboratory', label: 'Laboratory', icon: '🔬' },
  { value: 'care_home', label: 'Care Home', icon: '🏡' },
  { value: 'aesthetics', label: 'Beauty / Aesthetics Clinic', icon: '💆' },
  { value: 'veterinary', label: 'Veterinary Practice', icon: '🐾' },
  { value: 'other', label: 'Other Healthcare / Producer', icon: '🏢' },
];

const WASTE_TYPES = [
  { value: 'clinical_infectious', label: 'Clinical / Infectious Waste', desc: 'Yellow bags/bins — soiled dressings, PPE, contaminated materials', ewc: '18 01 03*' },
  { value: 'sharps', label: 'Sharps Waste', desc: 'Needles, syringes, lancets, blades', ewc: '18 01 01' },
  { value: 'pharmaceutical', label: 'Pharmaceutical Waste', desc: 'Expired or unwanted medicines, vials', ewc: '18 01 09' },
  { value: 'cytotoxic', label: 'Cytotoxic / Cytostatic', desc: 'Chemotherapy waste — purple containers', ewc: '18 01 08*' },
  { value: 'dental_amalgam', label: 'Dental Amalgam', desc: 'Amalgam separator waste, old fillings', ewc: '18 01 10*' },
  { value: 'anatomical', label: 'Anatomical Waste', desc: 'Human tissue, body parts', ewc: '18 01 02' },
  { value: 'offensive', label: 'Offensive / Hygiene Waste', desc: 'Tiger-stripe bags — non-infectious sanitary waste', ewc: '18 01 04' },
  { value: 'confidential', label: 'Confidential / Data Waste', desc: 'Patient records, prescription forms', ewc: 'N/A' },
];

const CONTAINER_TYPES = [
  'Yellow clinical waste bags (30L)',
  'Yellow clinical waste bags (60L)',
  'Yellow-lidded sharps bin (1L)',
  'Yellow-lidded sharps bin (7L)',
  'Yellow-lidded sharps bin (23L)',
  'Orange bags (clinical waste for alternative treatment)',
  'Purple-lidded containers (cytotoxic)',
  'Blue pharmaceutical waste bins',
  'Tiger-stripe bags (offensive/hygiene)',
  'Amalgam separator',
  'Confidential waste sacks',
];

const PAIN_POINTS = [
  'Cost of current waste collections',
  'Compliance uncertainty / not sure if we are legal',
  'Missed or unreliable collections',
  'Lack of documentation / waste transfer notes',
  'Staff unsure how to segregate waste',
  'No storage area / poor storage conditions',
  'Contract too inflexible',
  'No audit trail',
];

const VOLUME_UNITS = ['litres', 'kg', 'bags', 'bins', 'units'];
const FREQUENCIES = ['Weekly', 'Fortnightly', 'Monthly', 'Every 6 weeks', 'Quarterly', 'On demand', 'Not currently collected'];

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block ml-1">
      <button
        type="button"
        className="w-4 h-4 rounded-full bg-gray-300 hover:bg-gray-400 text-gray-700 text-xs font-bold leading-none inline-flex items-center justify-center transition-colors"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(s => !s)}
      >
        ?
      </button>
      {show && (
        <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </span>
  );
}

// ─── Risk badge ───────────────────────────────────────────────────────────────

function RiskBadge({ rating }: { rating: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    low: { cls: 'bg-green-100 text-green-800 border-green-300', label: 'Low Risk' },
    medium: { cls: 'bg-amber-100 text-amber-800 border-amber-300', label: 'Medium Risk' },
    high: { cls: 'bg-red-100 text-red-800 border-red-300', label: 'High Risk' },
    critical: { cls: 'bg-purple-100 text-purple-800 border-purple-300', label: 'Critical Risk' },
  };
  const s = map[rating] || map.medium;
  return <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${s.cls}`}>{s.label}</span>;
}

// ─── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">Step {step} of {total}</span>
        <span className="text-sm text-gray-400">{Math.round((step / total) * 100)}% complete</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-red-600 rounded-full transition-all duration-500"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
      <div className="flex justify-between mt-2">
        {['Sector', 'Your Details', 'Audit Questions', 'Your Report'].map((label, i) => (
          <span key={label} className={`text-xs ${i + 1 <= step ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AuditPage() {
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);
  const { settings } = useSiteSettings();
  const phone = settings?.phone_number || '0800 046 9806';
  const telHref = `tel:${phone.replace(/\s+/g, '')}`;

  const [step, setStep] = useState(0); // 0=landing, 1-4=wizard steps
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [quoteRequested, setQuoteRequested] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1 – Sector
  const [sector, setSector] = useState('');

  // Step 2 – Business Details
  const [bizDetails, setBizDetails] = useState({
    business_name: '', contact_name: '', email: '', phone: '',
    town: '', county: '', site_address: '', postcode: '',
    consent_data: false, consent_marketing: false,
  });

  // Step 3 – Audit Questions
  const [auditQ, setAuditQ] = useState({
    staff_count: '',
    treatment_rooms: '',
    sites_count: '1',
    waste_streams: [] as { type: string; label: string; volume: string; unit: string }[],
    current_contractor: '',
    collection_frequency: '',
    container_types: [] as string[],
    segregation_method: '',
    storage_location: '',
    storage_conditions: '',
    has_waste_policy: false,
    staff_trained: false,
    last_audit_date: '',
    compliance_concerns: '',
    pain_points: [] as string[],
    pain_points_other: '',
    additional_notes: '',
  });

  // Auto-save session token to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mw_audit_session');
    if (saved) {
      try {
        const { id, sector: s, step: st } = JSON.parse(saved);
        if (id && st && st > 0) {
          setSessionId(id);
          if (s) setSector(s);
          setStep(st);
        }
      } catch { /* ignore */ }
    }
  }, []);

  const saveToStorage = (id: string, s: string, st: number) => {
    localStorage.setItem('mw_audit_session', JSON.stringify({ id, sector: s, step: st }));
  };

  // ── Step navigation ──────────────────────────────────────────────────────────

  const validateStep = () => {
    const e: Record<string, string> = {};
    if (step === 1 && !sector) e.sector = 'Please select your business type.';
    if (step === 2) {
      if (!bizDetails.business_name.trim()) e.business_name = 'Business name is required.';
      if (!bizDetails.contact_name.trim()) e.contact_name = 'Contact name is required.';
      if (!bizDetails.email.trim() || !/\S+@\S+\.\S+/.test(bizDetails.email)) e.email = 'A valid email address is required.';
      if (!bizDetails.phone.trim()) e.phone = 'Phone number is required.';
      if (!bizDetails.town.trim()) e.town = 'Town is required.';
      if (!bizDetails.consent_data) e.consent_data = 'You must agree to proceed.';
    }
    if (step === 3 && auditQ.waste_streams.length === 0) {
      e.waste_streams = 'Please select at least one waste stream your business produces.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep()) return;
    if (step === 1) {
      await createOrUpdateSession();
      setStep(2);
    } else if (step === 2) {
      await updateSession();
      setStep(3);
    } else if (step === 3) {
      await saveAnswers();
      setStep(4);       // show step 4 spinner immediately
      generateReport(); // fire async — sets generating/report state internally
    }
  };

  const createOrUpdateSession = async () => {
    setSaving(true);
    try {
      if (sessionId) {
        await supabase.from('mw_audit_sessions').update({ sector, current_step: 2 }).eq('id', sessionId);
        saveToStorage(sessionId, sector, 2);
      } else {
        const { data } = await supabase.from('mw_audit_sessions').insert({ sector, current_step: 1 }).select().single();
        if (data) {
          setSessionId(data.id);
          saveToStorage(data.id, sector, 2);
        }
      }
    } finally { setSaving(false); }
  };

  const updateSession = async () => {
    if (!sessionId) return;
    setSaving(true);
    try {
      await supabase.from('mw_audit_sessions').update({
        ...bizDetails,
        current_step: 3,
      }).eq('id', sessionId);
      saveToStorage(sessionId, sector, 3);
    } finally { setSaving(false); }
  };

  const saveAnswers = async () => {
    if (!sessionId) return;
    setSaving(true);
    try {
      const answerData = {
        session_id: sessionId,
        staff_count: auditQ.staff_count,
        treatment_rooms: auditQ.treatment_rooms ? parseInt(auditQ.treatment_rooms) : null,
        sites_count: auditQ.sites_count ? parseInt(auditQ.sites_count) : 1,
        waste_streams: auditQ.waste_streams,
        current_contractor: auditQ.current_contractor,
        collection_frequency: auditQ.collection_frequency,
        container_types: auditQ.container_types,
        segregation_method: auditQ.segregation_method,
        storage_location: auditQ.storage_location,
        storage_conditions: auditQ.storage_conditions,
        has_waste_policy: auditQ.has_waste_policy,
        staff_trained: auditQ.staff_trained,
        last_audit_date: auditQ.last_audit_date,
        compliance_concerns: auditQ.compliance_concerns,
        pain_points: auditQ.pain_points,
        pain_points_other: auditQ.pain_points_other,
        additional_notes: auditQ.additional_notes,
      };
      const existing = await supabase.from('mw_audit_answers').select('id').eq('session_id', sessionId).maybeSingle();
      if (existing.data) {
        await supabase.from('mw_audit_answers').update(answerData).eq('session_id', sessionId);
      } else {
        await supabase.from('mw_audit_answers').insert(answerData);
      }
      await supabase.from('mw_audit_sessions').update({ current_step: 4 }).eq('id', sessionId);
      saveToStorage(sessionId, sector, 4);
    } finally { setSaving(false); }
  };

  const generateReport = async () => {
    if (!sessionId) return;
    setGenerating(true);
    try {
      const { data } = await supabase.functions.invoke('generate-audit-report', {
        body: { session_id: sessionId },
      });
      if (data?.report) setReport(data.report);
      else {
        // Fetch from DB
        const { data: rpt } = await supabase.from('mw_audit_reports').select('*').eq('session_id', sessionId).maybeSingle();
        if (rpt) setReport(rpt);
      }
      // Send to user + admin notification together
      supabase.functions.invoke('send-audit-email', { body: { session_id: sessionId, send_to_user: true } })
        .then(() => setEmailSent(true))
        .catch(() => {});
    } catch (err) {
      console.error('Report generation error:', err);
    } finally {
      setGenerating(false);
      localStorage.removeItem('mw_audit_session');
    }
  };

  const handleSendEmail = async () => {
    if (!sessionId) return;
    setEmailSending(true);
    try {
      await supabase.functions.invoke('send-audit-email', { body: { session_id: sessionId, send_to_user: true } });
      setEmailSent(true);
    } catch (err) {
      console.error('Email error:', err);
    } finally { setEmailSending(false); }
  };

  const handleDownloadPdf = async () => {
    if (!reportRef.current || !sessionId) return;
    setDownloadingPdf(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      const clone = reportRef.current.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = '900px';
      clone.style.background = '#ffffff';
      document.body.appendChild(clone);
      await new Promise(r => setTimeout(r, 200));
      const canvas = await html2canvas(clone, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', logging: false });
      document.body.removeChild(clone);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height / canvas.width) * pageW;
      let offset = 0;
      while (offset < imgH) {
        if (offset > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -offset, pageW, imgH);
        offset += pageH;
      }
      pdf.save(`MediWaste-Audit-${bizDetails.business_name || 'Report'}.pdf`);
      await supabase.from('mw_audit_download_events').insert({ session_id: sessionId, format: 'pdf' });
    } finally { setDownloadingPdf(false); }
  };

  const handleDownloadCsv = async () => {
    if (!report || !sessionId) return;
    const rows = [
      ['MediWaste Clinical Waste Audit Report'],
      ['Generated', new Date().toLocaleDateString('en-GB')],
      [],
      ['BUSINESS DETAILS'],
      ['Business Name', bizDetails.business_name],
      ['Contact Name', bizDetails.contact_name],
      ['Email', bizDetails.email],
      ['Phone', bizDetails.phone],
      ['Town', bizDetails.town],
      ['County', bizDetails.county],
      ['Postcode', bizDetails.postcode],
      ['Sector', sector],
      [],
      ['AUDIT SUMMARY'],
      ['Risk Rating', (report.risk_rating || '').toUpperCase()],
      ['Risk Score', report.risk_score + '/100'],
      [],
      ['WASTE STREAMS'],
      ['Waste Type', 'Volume', 'Unit', 'EWC Code', 'Container', 'Frequency'],
      ...(report.waste_stream_breakdown || []).map((w: any) => [
        w.waste_type, '', '', w.ewc_code || '', w.container, w.frequency,
      ]),
      [],
      ['COMPLIANCE RISKS'],
      ['Risk', 'Severity', 'Regulation', 'Action Required'],
      ...(report.compliance_risks || []).map((r: any) => [r.title, r.severity, r.regulation, r.action]),
      [],
      ['RECOMMENDATIONS'],
      ['Priority', 'Title', 'Description'],
      ...(report.recommendations || []).map((r: any) => [r.priority, r.title, r.description]),
    ];
    const csv = rows.map(r => r.map((c: any) => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MediWaste-Audit-${bizDetails.business_name || 'Report'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    await supabase.from('mw_audit_download_events').insert({ session_id: sessionId, format: 'excel' });
  };

  const handleRequestQuote = async () => {
    if (!sessionId) return;
    await supabase.from('mw_audit_quote_requests').insert({ session_id: sessionId });
    setQuoteRequested(true);
    // Navigate to quote page with prefilled data
    const params = new URLSearchParams({
      business_name: bizDetails.business_name,
      contact_name: bizDetails.contact_name,
      email: bizDetails.email,
      phone: bizDetails.phone,
      postcode: bizDetails.postcode,
      from_audit: '1',
    });
    navigate(`/quote?${params.toString()}`);
  };

  const toggleWasteStream = (type: string, label: string) => {
    setAuditQ(prev => {
      const exists = prev.waste_streams.find(w => w.type === type);
      if (exists) return { ...prev, waste_streams: prev.waste_streams.filter(w => w.type !== type) };
      return { ...prev, waste_streams: [...prev.waste_streams, { type, label, volume: '', unit: 'litres' }] };
    });
  };

  const updateWasteVolume = (type: string, field: 'volume' | 'unit', value: string) => {
    setAuditQ(prev => ({
      ...prev,
      waste_streams: prev.waste_streams.map(w => w.type === type ? { ...w, [field]: value } : w),
    }));
  };

  const toggleContainer = (c: string) => {
    setAuditQ(prev => ({
      ...prev,
      container_types: prev.container_types.includes(c)
        ? prev.container_types.filter(x => x !== c)
        : [...prev.container_types, c],
    }));
  };

  const togglePainPoint = (p: string) => {
    setAuditQ(prev => ({
      ...prev,
      pain_points: prev.pain_points.includes(p)
        ? prev.pain_points.filter(x => x !== p)
        : [...prev.pain_points, p],
    }));
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  // Landing screen
  if (step === 0) {
    return (
      <>
        <SEO
          title="Free Clinical Waste Audit Tool | MediWaste"
          description="Answer 15 questions about your waste streams and compliance setup. Our AI generates a free, personalised clinical waste audit report — identifying risks and giving you a prioritised action plan. For GPs, dentists, care homes, vets, tattoo studios and any UK healthcare waste producer."
          canonical="https://mediwaste.co.uk/audit"
          keywords="clinical waste audit, free waste compliance check, healthcare waste audit tool, clinical waste compliance UK, dental waste audit, GP waste audit, care home waste compliance, sharps waste compliance, HTM 07-01 audit"
          type="website"
          schema={{
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'Clinical Waste Audit Builder',
            description: 'A free AI-powered clinical waste compliance audit tool for UK healthcare businesses. Identifies risks against HTM 07-01 and Hazardous Waste Regulations 2005.',
            url: 'https://mediwaste.co.uk/audit',
            applicationCategory: 'HealthApplication',
            operatingSystem: 'Web',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'GBP' },
            provider: {
              '@type': 'LocalBusiness',
              name: 'MediWaste',
              url: 'https://mediwaste.co.uk',
              telephone: phone.replace(/\s+/g, '').replace(/^0/, '+44'),
            },
          }}
        />
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
          <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
              <img src="/mediwaste-logo.png" alt="MediWaste" className="h-7 w-auto" />
              <Link to="/" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">← Back to MediWaste</Link>
            </div>
          </header>

          <main className="max-w-4xl mx-auto px-4 py-16">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
                <ClipboardList size={14} />
                Free Clinical Waste Audit
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                Know your clinical waste<br />compliance — in minutes
              </h1>
              <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-8">
                Answer a few guided questions about your business and waste streams. Our AI-powered tool analyses your setup and produces a personalised compliance audit report — free of charge.
              </p>
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-colors shadow-lg shadow-red-100"
              >
                Start Your Free Audit
                <ArrowRight size={20} />
              </button>
              <p className="text-sm text-gray-400 mt-4">Takes 3–5 minutes · No signup required · Instant report</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              {[
                { icon: <Shield size={24} className="text-red-600" />, title: 'Identify Compliance Gaps', desc: 'Uncover risks under HTM 07-01, Hazardous Waste Regulations, and Duty of Care.' },
                { icon: <BarChart2 size={24} className="text-red-600" />, title: 'AI-Powered Analysis', desc: 'Our tool analyses your waste streams and produces a professional compliance report.' },
                { icon: <Download size={24} className="text-red-600" />, title: 'Download Your Report', desc: 'Get your audit as PDF, Excel or Word. Email it to yourself or your team.' },
              ].map(f => (
                <div key={f.title} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center mb-4">{f.icon}</div>
                  <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500">{f.desc}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-12">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Who is this audit for?</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SECTORS.map(s => (
                  <div key={s.value} className="flex items-center gap-2 text-sm text-gray-600">
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-6 text-sm text-gray-400 mb-8">
                <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-green-500" /> Environment Agency registered</span>
                <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-green-500" /> ISO 14001 certified</span>
                <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-green-500" /> Safe Contractor approved</span>
              </div>
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-colors"
              >
                Start Your Free Audit
                <ArrowRight size={20} />
              </button>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO
        title="Clinical Waste Audit Builder | MediWaste"
        description="Answer 15 questions about your waste streams and compliance setup. Our AI generates a free, personalised clinical waste audit report — identifying risks and giving you a prioritised action plan. For GPs, dentists, care homes, vets, tattoo studios and any UK healthcare waste producer."
        canonical="https://mediwaste.co.uk/audit"
        keywords="clinical waste audit, free waste compliance check, healthcare waste audit tool, clinical waste compliance UK, dental waste audit, GP waste audit, care home waste compliance, sharps waste compliance, HTM 07-01 audit"
      />
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <img src="/mediwaste-logo.png" alt="MediWaste" className="h-7 w-auto" />
            <button onClick={() => setStep(0)} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              <X size={18} />
            </button>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8">
          {step < 4 && <ProgressBar step={step} total={4} />}

          {/* ── Step 1: Sector ── */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">What type of business are you?</h2>
              <p className="text-gray-500 mb-6">Select the option that best describes your business or practice.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {SECTORS.map(s => (
                  <button
                    key={s.value}
                    onClick={() => { setSector(s.value); setErrors({}); }}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                      sector === s.value
                        ? 'border-red-600 bg-red-50 text-red-900'
                        : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <span className="text-2xl">{s.icon}</span>
                    <span className="font-medium text-sm">{s.label}</span>
                  </button>
                ))}
              </div>
              {errors.sector && <p className="text-red-600 text-sm mb-4">{errors.sector}</p>}
            </div>
          )}

          {/* ── Step 2: Business Details ── */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Your business details</h2>
              <p className="text-gray-500 mb-6">We'll include these in your audit report and use them to personalise your results.</p>
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {([
                    { key: 'business_name', label: 'Business name', required: true, placeholder: 'e.g. Oakwood Dental Practice' },
                    { key: 'contact_name', label: 'Your name', required: true, placeholder: 'e.g. Dr. Sarah Jones' },
                    { key: 'email', label: 'Email address', required: true, placeholder: 'e.g. sarah@oakwooddental.co.uk', type: 'email' },
                    { key: 'phone', label: 'Phone number', required: true, placeholder: 'e.g. 01322 000000', type: 'tel' },
                    { key: 'site_address', label: 'Site address', required: false, placeholder: '14 High Street' },
                    { key: 'town', label: 'Town / City', required: true, placeholder: 'e.g. Dartford' },
                    { key: 'county', label: 'County', required: false, placeholder: 'e.g. Kent' },
                    { key: 'postcode', label: 'Postcode', required: false, placeholder: 'e.g. DA1 2AB' },
                  ] as const).map(f => (
                    <div key={f.key} className={f.key === 'site_address' ? 'sm:col-span-2' : ''}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {f.label} {f.required && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type={('type' in f ? f.type : 'text') as string}
                        value={(bizDetails as any)[f.key]}
                        onChange={e => { setBizDetails(prev => ({ ...prev, [f.key]: e.target.value })); setErrors(prev => ({ ...prev, [f.key]: '' })); }}
                        placeholder={f.placeholder}
                        className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent transition-colors ${errors[f.key] ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                      />
                      {errors[f.key] && <p className="text-red-600 text-xs mt-1">{errors[f.key]}</p>}
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={bizDetails.consent_data} onChange={e => { setBizDetails(p => ({ ...p, consent_data: e.target.checked })); setErrors(p => ({ ...p, consent_data: '' })); }} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-400" />
                    <span className="text-sm text-gray-600">I agree for MediWaste to store my audit data and contact me regarding waste management services. <span className="text-red-500">*</span></span>
                  </label>
                  {errors.consent_data && <p className="text-red-600 text-xs">{errors.consent_data}</p>}
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={bizDetails.consent_marketing} onChange={e => setBizDetails(p => ({ ...p, consent_marketing: e.target.checked }))} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-400" />
                    <span className="text-sm text-gray-600">Sign me up for MediWaste compliance updates and waste management resources (optional).</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Audit Questions ── */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Your waste audit</h2>
                <p className="text-gray-500">Answer as many questions as you can. All fields help us produce a more accurate report.</p>
              </div>

              {/* Practice size */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users size={16} className="text-red-600" /> Practice / Business Size
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { key: 'staff_count', label: 'Number of staff', placeholder: 'e.g. 12', tooltip: 'Include all staff who may handle clinical waste.' },
                    { key: 'treatment_rooms', label: 'Treatment rooms', placeholder: 'e.g. 3', tooltip: 'Rooms where clinical procedures or treatments take place.' },
                    { key: 'sites_count', label: 'Number of sites', placeholder: 'e.g. 1' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {f.label}
                        {f.tooltip && <Tooltip text={f.tooltip} />}
                      </label>
                      <input
                        type="number" min="0"
                        value={(auditQ as any)[f.key]}
                        onChange={e => setAuditQ(p => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Waste streams */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                  <Syringe size={16} className="text-red-600" /> Waste Streams Produced
                  <Tooltip text="Select all types of clinical or healthcare waste your business produces each month." />
                </h3>
                <p className="text-sm text-gray-500 mb-4">Select all that apply, then enter approximate monthly volumes.</p>
                {errors.waste_streams && (
                  <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-lg px-3 py-2 mb-3 text-sm">
                    <AlertTriangle size={14} /> {errors.waste_streams}
                  </div>
                )}
                <div className="space-y-3">
                  {WASTE_TYPES.map(wt => {
                    const selected = auditQ.waste_streams.find(w => w.type === wt.value);
                    return (
                      <div key={wt.value} className={`border rounded-lg transition-all ${selected ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                        <label className="flex items-start gap-3 p-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!selected}
                            onChange={() => { toggleWasteStream(wt.value, wt.label); setErrors(p => ({ ...p, waste_streams: '' })); }}
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-400"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{wt.label}</p>
                            <p className="text-xs text-gray-500">{wt.desc} <span className="font-mono text-gray-400">EWC: {wt.ewc}</span></p>
                          </div>
                        </label>
                        {selected && (
                          <div className="flex items-center gap-2 px-3 pb-3">
                            <span className="text-xs text-gray-600">Monthly volume:</span>
                            <input
                              type="number" min="0" step="0.5"
                              value={selected.volume}
                              onChange={e => updateWasteVolume(wt.value, 'volume', e.target.value)}
                              placeholder="0"
                              className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400"
                            />
                            <select
                              value={selected.unit}
                              onChange={e => updateWasteVolume(wt.value, 'unit', e.target.value)}
                              className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-400"
                            >
                              {VOLUME_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Current contractor */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Building2 size={16} className="text-red-600" /> Current Waste Management
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current contractor
                      <Tooltip text="Your current clinical waste collection company, if any. Write 'None' if you don't have one." />
                    </label>
                    <input
                      type="text" value={auditQ.current_contractor}
                      onChange={e => setAuditQ(p => ({ ...p, current_contractor: e.target.value }))}
                      placeholder="e.g. Stericycle, None"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Collection frequency</label>
                    <select
                      value={auditQ.collection_frequency}
                      onChange={e => setAuditQ(p => ({ ...p, collection_frequency: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-400"
                    >
                      <option value="">— Select —</option>
                      {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Container types currently used</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {CONTAINER_TYPES.map(c => (
                      <label key={c} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input type="checkbox" checked={auditQ.container_types.includes(c)} onChange={() => toggleContainer(c)} className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-400" />
                        {c}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    How is waste segregated at source?
                    <Tooltip text="Describe how staff separate waste types — e.g. 'coloured bags at point of use', 'all mixed together', 'separate bins in each room'." />
                  </label>
                  <input
                    type="text" value={auditQ.segregation_method}
                    onChange={e => setAuditQ(p => ({ ...p, segregation_method: e.target.value }))}
                    placeholder="e.g. Colour-coded bags at point of use"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400"
                  />
                </div>
              </div>

              {/* Storage & Compliance */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Trash2 size={16} className="text-red-600" /> Storage &amp; Compliance
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Waste storage location
                      <Tooltip text="Where is clinical waste stored before collection? e.g. locked clinical waste store, corridor cupboard, outside bin area." />
                    </label>
                    <input type="text" value={auditQ.storage_location} onChange={e => setAuditQ(p => ({ ...p, storage_location: e.target.value }))} placeholder="e.g. Locked external waste store" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Storage conditions</label>
                    <input type="text" value={auditQ.storage_conditions} onChange={e => setAuditQ(p => ({ ...p, storage_conditions: e.target.value }))} placeholder="e.g. Dry, lockable, pest-free" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of last waste audit (approx.)</label>
                    <input type="text" value={auditQ.last_audit_date} onChange={e => setAuditQ(p => ({ ...p, last_audit_date: e.target.value }))} placeholder="e.g. March 2024, Never" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400" />
                  </div>
                </div>
                <div className="flex gap-6 mt-4">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={auditQ.has_waste_policy} onChange={e => setAuditQ(p => ({ ...p, has_waste_policy: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-400" />
                    Written waste management policy in place
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={auditQ.staff_trained} onChange={e => setAuditQ(p => ({ ...p, staff_trained: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-400" />
                    Staff formally trained on waste segregation
                  </label>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Any known compliance concerns?</label>
                  <textarea rows={2} value={auditQ.compliance_concerns} onChange={e => setAuditQ(p => ({ ...p, compliance_concerns: e.target.value }))} placeholder="e.g. Unsure if our sharps disposal meets current regulations" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 resize-none" />
                </div>
              </div>

              {/* Pain points */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-500" /> Current Challenges
                </h3>
                <p className="text-sm text-gray-500 mb-3">What are your biggest frustrations with waste management? (Select all that apply)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PAIN_POINTS.map(p => (
                    <label key={p} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={auditQ.pain_points.includes(p)} onChange={() => togglePainPoint(p)} className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-400" />
                      {p}
                    </label>
                  ))}
                </div>
                <div className="mt-3">
                  <input type="text" value={auditQ.pain_points_other} onChange={e => setAuditQ(p => ({ ...p, pain_points_other: e.target.value }))} placeholder="Other challenge (optional)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400" />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Additional notes (optional)</label>
                  <textarea rows={3} value={auditQ.additional_notes} onChange={e => setAuditQ(p => ({ ...p, additional_notes: e.target.value }))} placeholder="Anything else that would help us understand your waste management situation..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 resize-none" />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Report ── */}
          {step === 4 && (
            <div>
              {generating ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Generating your audit report…</h2>
                  <p className="text-gray-500">Our AI is analysing your responses and identifying compliance risks.</p>
                  <p className="text-sm text-gray-400 mt-2">This usually takes 15–30 seconds.</p>
                </div>
              ) : report ? (
                <div>
                  {/* Report header */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 rounded-full px-3 py-1 text-xs font-medium mb-3">
                          <CheckCircle size={12} /> Audit Complete
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">Your Clinical Waste Audit Report</h2>
                        <p className="text-gray-500 text-sm mt-1">{bizDetails.business_name} · {bizDetails.town}{bizDetails.county ? `, ${bizDetails.county}` : ''} · {new Date().toLocaleDateString('en-GB')}</p>
                      </div>
                      <RiskBadge rating={report.risk_rating || 'medium'} />
                    </div>

                    {/* Download buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button onClick={handleDownloadPdf} disabled={downloadingPdf} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        {downloadingPdf ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
                        {downloadingPdf ? 'Preparing…' : 'Download PDF'}
                      </button>
                      <button onClick={handleDownloadCsv} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        <FileSpreadsheet size={14} />
                        Export Excel / CSV
                      </button>
                      <button onClick={handleSendEmail} disabled={emailSending || emailSent} className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        {emailSending ? <Loader size={14} className="animate-spin" /> : <Mail size={14} />}
                        {emailSent ? 'Email Sent ✓' : emailSending ? 'Sending…' : 'Resend Email'}
                      </button>
                    </div>
                  </div>

                  {/* Printable report content */}
                  <div ref={reportRef} className="space-y-6">
                    {/* Report letterhead */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                        <img src="/mediwaste-logo.png" alt="MediWaste" style={{ height: '40px', objectFit: 'contain' }} />
                        <div className="text-right text-sm text-gray-500">
                          <p className="font-semibold text-gray-900">Clinical Waste Audit Report</p>
                          <p>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Business</p>
                          <p className="font-semibold text-gray-900">{bizDetails.business_name}</p>
                          <p className="text-gray-600">{SECTORS.find(s => s.value === sector)?.label}</p>
                          <p className="text-gray-600">{bizDetails.site_address && `${bizDetails.site_address}, `}{bizDetails.town}{bizDetails.county ? `, ${bizDetails.county}` : ''} {bizDetails.postcode}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Contact</p>
                          <p className="font-semibold text-gray-900">{bizDetails.contact_name}</p>
                          <p className="text-gray-600">{bizDetails.email}</p>
                          <p className="text-gray-600">{bizDetails.phone}</p>
                        </div>
                      </div>

                      {/* Risk score bar */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">Overall Compliance Risk Score</span>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-gray-900">{report.risk_score}/100</span>
                            <RiskBadge rating={report.risk_rating || 'medium'} />
                          </div>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              (report.risk_score || 0) >= 70 ? 'bg-red-600' :
                              (report.risk_score || 0) >= 45 ? 'bg-amber-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${report.risk_score || 0}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">0 = Fully compliant · 100 = Significant compliance risk</p>
                      </div>

                      {/* Executive summary */}
                      <div className="mb-6">
                        <h3 className="font-bold text-gray-900 text-base mb-3 flex items-center gap-2">
                          <FileText size={16} className="text-red-600" /> Executive Summary
                        </h3>
                        <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-4">
                          {(report.executive_summary || '').split('\n').filter(Boolean).map((para: string, i: number) => (
                            <p key={i} className={i > 0 ? 'mt-3' : ''}>{para}</p>
                          ))}
                        </div>
                      </div>

                      {/* Compliance risks */}
                      {(report.compliance_risks || []).length > 0 && (
                        <div className="mb-6">
                          <h3 className="font-bold text-gray-900 text-base mb-3 flex items-center gap-2">
                            <AlertTriangle size={16} className="text-amber-500" /> Compliance Risks Identified
                          </h3>
                          <div className="space-y-3">
                            {(report.compliance_risks || []).map((risk: any, i: number) => {
                              const sev: Record<string, string> = { low: 'bg-blue-50 border-blue-200', medium: 'bg-amber-50 border-amber-200', high: 'bg-red-50 border-red-200', critical: 'bg-purple-50 border-purple-200' };
                              return (
                                <div key={i} className={`border rounded-lg p-4 ${sev[risk.severity] || sev.medium}`}>
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <p className="font-semibold text-gray-900 text-sm">{risk.title}</p>
                                    <span className="text-xs font-medium uppercase px-2 py-0.5 rounded bg-white border border-gray-200 text-gray-600 flex-shrink-0">{risk.severity}</span>
                                  </div>
                                  <p className="text-sm text-gray-700 mb-2">{risk.description}</p>
                                  {risk.regulation && <p className="text-xs text-gray-500 mb-2 flex items-center gap-1"><Info size={10} /> {risk.regulation}</p>}
                                  <div className="flex items-start gap-1.5">
                                    <ArrowRight size={12} className="text-gray-500 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-gray-700"><strong>Action: </strong>{risk.action}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Waste stream breakdown */}
                      {(report.waste_stream_breakdown || []).length > 0 && (
                        <div className="mb-6">
                          <h3 className="font-bold text-gray-900 text-base mb-3 flex items-center gap-2">
                            <Syringe size={16} className="text-red-600" /> Waste Stream Breakdown
                          </h3>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                              <thead>
                                <tr className="bg-gray-50">
                                  <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Waste Type</th>
                                  <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">EWC Code</th>
                                  <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Container</th>
                                  <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Frequency</th>
                                  <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Notes</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(report.waste_stream_breakdown || []).map((w: any, i: number) => (
                                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="border border-gray-200 px-3 py-2">{w.waste_type}</td>
                                    <td className="border border-gray-200 px-3 py-2 font-mono text-xs text-gray-500">{w.ewc_code || '—'}</td>
                                    <td className="border border-gray-200 px-3 py-2">{w.container || '—'}</td>
                                    <td className="border border-gray-200 px-3 py-2">{w.frequency || '—'}</td>
                                    <td className="border border-gray-200 px-3 py-2 text-gray-600">{w.notes || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Recommendations */}
                      {(report.recommendations || []).length > 0 && (
                        <div>
                          <h3 className="font-bold text-gray-900 text-base mb-3 flex items-center gap-2">
                            <Star size={16} className="text-amber-500" /> Recommendations
                          </h3>
                          <div className="space-y-3">
                            {(report.recommendations || []).map((rec: any, i: number) => {
                              const pri: Record<string, { cls: string; label: string }> = {
                                immediate: { cls: 'bg-red-100 text-red-700', label: 'Immediate' },
                                short_term: { cls: 'bg-amber-100 text-amber-700', label: 'Short Term' },
                                ongoing: { cls: 'bg-blue-100 text-blue-700', label: 'Ongoing' },
                              };
                              const p = pri[rec.priority] || pri.short_term;
                              return (
                                <div key={i} className="border border-gray-200 rounded-lg p-4 bg-white">
                                  <div className="flex items-start gap-3">
                                    <span className="w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className="font-semibold text-gray-900 text-sm">{rec.title}</p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.cls}`}>{p.label}</span>
                                      </div>
                                      <p className="text-sm text-gray-700 mb-1">{rec.description}</p>
                                      {rec.benefit && <p className="text-xs text-green-700 flex items-center gap-1"><CheckCircle size={10} /> {rec.benefit}</p>}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Footer disclaimer */}
                      <div className="mt-6 pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-400">This report has been generated by MediWaste's AI-powered audit tool and is provided for guidance purposes only. It does not constitute legal advice. Please consult current UK waste regulations and contact MediWaste for a full on-site compliance assessment.</p>
                      </div>
                    </div>
                  </div>

                  {/* Quote CTA */}
                  <div className="bg-red-600 rounded-2xl p-8 text-center mt-6">
                    <h3 className="text-2xl font-bold text-white mb-3">Need help managing your clinical waste?</h3>
                    <p className="text-red-100 mb-6 max-w-xl mx-auto">MediWaste can resolve every risk identified in this audit. Get a free, no-obligation quote today — we can usually start collections within 7 days.</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        onClick={handleRequestQuote}
                        disabled={quoteRequested}
                        className="flex items-center gap-2 bg-white text-red-600 hover:bg-red-50 disabled:opacity-70 px-6 py-3 rounded-xl font-bold text-sm transition-colors shadow"
                      >
                        {quoteRequested ? <CheckCircle size={16} /> : <ArrowRight size={16} />}
                        {quoteRequested ? 'Quote Requested' : 'Request a Free Quote'}
                      </button>
                      <a href={telHref} className="flex items-center gap-2 text-white border border-red-400 hover:border-white px-6 py-3 rounded-xl font-medium text-sm transition-colors">
                        <Phone size={16} />
                        Call {phone}
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <AlertTriangle size={40} className="mx-auto text-amber-400 mb-4" />
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Report generation failed</h2>
                  <p className="text-gray-500 mb-4">We could not generate your report. Please try again.</p>
                  <button onClick={() => generateReport()} className="bg-red-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-red-700">
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Navigation ── */}
          {step < 4 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={() => setStep(s => s - 1)}
                disabled={step === 1}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-0 transition-colors"
              >
                <ChevronLeft size={16} /> Back
              </button>
              <button
                onClick={handleNext}
                disabled={saving || generating}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-8 py-3 rounded-xl font-semibold transition-colors"
              >
                {saving ? <Loader size={16} className="animate-spin" /> : null}
                {step === 3 ? 'Generate My Report' : 'Continue'}
                {!saving && <ChevronRight size={16} />}
              </button>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
