import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useToastContext } from '../../contexts/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { ClipboardCheck, Plus, Search, FileText, Calendar, CheckCircle } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';

interface WasteAudit {
  id: string;
  audit_number: string;
  customer_id: string;
  practice_name: string;
  legal_entity: string;
  address: string;
  status: string;
  created_at: string;
  updated_at: string;
  sent_to_client_at: string | null;
  client_edited_at: string | null;
  finalised_at: string | null;
  admin_signed_at: string | null;
  client_signed_at: string | null;
  selected_waste_streams: any[];
}

export default function WasteAuditsPage() {
  const { toast } = useToastContext();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Create wizard state
  const [step, setStep] = useState(1);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [practiceName, setPracticeName] = useState('');
  const [legalEntity, setLegalEntity] = useState('');
  const [address, setAddress] = useState('');
  const [practiceType, setPracticeType] = useState('');
  const [servicesProvided, setServicesProvided] = useState('');
  const [numberOfSurgeries, setNumberOfSurgeries] = useState('');
  const [numberOfStaff, setNumberOfStaff] = useState('');
  const [amalgamUse, setAmalgamUse] = useState('');
  const [selectedStreams, setSelectedStreams] = useState<any[]>([]);
  const [streamSearch, setStreamSearch] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showCustomStream, setShowCustomStream] = useState(false);
  const [customStream, setCustomStream] = useState({ name: '', ewc_code: '', container_type: '', colour_code: '', hazardous_properties: 'None', disposal_route: '', is_hazardous: false, description: '' });

  const { data: audits = [], isLoading } = useQuery<WasteAudit[]>({
    queryKey: ['waste-audits', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('waste_audits')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: wasteStreams = [] } = useQuery<any[]>({
    queryKey: ['waste-streams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('waste_streams')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const searchCustomers = async (term: string) => {
    setCustomerSearch(term);
    if (term.length < 2) { setCustomerResults([]); return; }
    const { data } = await supabase
      .from('mw_customers')
      .select('id, company_name, contact_name, email, customer_number, postcode, billing_address')
      .or(`company_name.ilike.%${term}%,contact_name.ilike.%${term}%,email.ilike.%${term}%`)
      .limit(8);
    setCustomerResults(data || []);
  };

  const selectCustomer = (c: any) => {
    setSelectedCustomer(c);
    setPracticeName(c.company_name || c.contact_name || '');
    setAddress(c.billing_address || '');
    setCustomerSearch('');
    setCustomerResults([]);
    setStep(2);
  };

  const toggleStream = (stream: any) => {
    const exists = selectedStreams.find((s) => s.id === stream.id);
    if (exists) {
      setSelectedStreams(selectedStreams.filter((s) => s.id !== stream.id));
    } else {
      setSelectedStreams([...selectedStreams, { id: stream.id, name: stream.name, ewc_code: stream.ewc_code, estimated_volume: '' }]);
    }
  };

  const updateVolume = (streamId: string, volume: string) => {
    setSelectedStreams(selectedStreams.map((s) => (s.id === streamId ? { ...s, estimated_volume: volume } : s)));
  };

  const addCustomStream = async () => {
    if (!customStream.name || !customStream.ewc_code) {
      toast.error('Stream name and EWC code are required');
      return;
    }
    const { data, error } = await supabase
      .from('waste_streams')
      .insert([{
        name: customStream.name,
        ewc_code: customStream.ewc_code,
        description: customStream.description || `Custom waste stream: ${customStream.name}`,
        container_type: customStream.container_type || 'As required',
        colour_code: customStream.colour_code || 'Various',
        hazardous_properties: customStream.hazardous_properties || 'None',
        disposal_route: customStream.disposal_route || 'Specialist disposal',
        is_hazardous: customStream.is_hazardous,
        category: 'custom',
        display_order: 100,
      }])
      .select('*')
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['waste-streams'] });
    setSelectedStreams([...selectedStreams, { id: data.id, name: data.name, ewc_code: data.ewc_code, estimated_volume: '' }]);
    setCustomStream({ name: '', ewc_code: '', container_type: '', colour_code: '', hazardous_properties: 'None', disposal_route: '', is_hazardous: false, description: '' });
    setShowCustomStream(false);
    toast.success('Custom waste stream added');
  };

  const createAudit = useMutation({
    mutationFn: async () => {
      const { data: auditNumResult } = await supabase.rpc('generate_audit_number');
      const auditNumber = auditNumResult || `WA-${Date.now()}`;
      const shareToken = `${Date.now()}-${Math.random().toString(36).substring(2, 13)}`;

      const { data, error } = await supabase
        .from('waste_audits')
        .insert([{
          customer_id: selectedCustomer?.id || null,
          audit_number: auditNumber,
          practice_name: practiceName,
          legal_entity: legalEntity,
          address: address,
          practice_type: practiceType,
          services_provided: servicesProvided,
          number_of_surgeries: numberOfSurgeries,
          number_of_staff: numberOfStaff,
          amalgam_use: amalgamUse,
          selected_waste_streams: selectedStreams,
          status: 'draft',
          share_token: shareToken,
          auditor_name: 'MediWaste',
          auditor_title: 'Waste Compliance Officer',
        }])
        .select('id')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (audit) => {
      setGenerating(true);
      try {
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-audit-draft`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ auditId: audit.id }),
          }
        );
        const result = await resp.json();
        if (!resp.ok) throw new Error(result.error || 'Failed to generate draft');

        await supabase.from('waste_audit_logs').insert({
          audit_id: audit.id,
          user_id: user?.id,
          user_name: 'Admin',
          action: 'audit_created',
          details: `Audit created with ${selectedStreams.length} waste streams`,
        });

        queryClient.invalidateQueries({ queryKey: ['waste-audits'] });
        toast.success('Audit draft generated successfully');
        setShowCreate(false);
        resetWizard();
        window.location.href = `/admin/waste-audits/${audit.id}/edit`;
      } catch (err: any) {
        toast.error(err.message || 'Failed to generate AI draft');
      } finally {
        setGenerating(false);
      }
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create audit'),
  });

  const resetWizard = () => {
    setStep(1);
    setSelectedCustomer(null);
    setPracticeName('');
    setLegalEntity('');
    setAddress('');
    setPracticeType('');
    setServicesProvided('');
    setNumberOfSurgeries('');
    setNumberOfStaff('');
    setAmalgamUse('');
    setSelectedStreams([]);
    setStreamSearch('');
    setShowCustomStream(false);
    setCustomStream({ name: '', ewc_code: '', container_type: '', colour_code: '', hazardous_properties: 'None', disposal_route: '', is_hazardous: false, description: '' });
  };

  const filteredAudits = audits.filter((a) => {
    if (!search) return true;
    const text = `${a.audit_number} ${a.practice_name} ${a.legal_entity}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const pendingReviewCount = audits.filter((a) => a.status === 'client_editing' || a.status === 'ready_for_review').length;

  return (
    <AdminLayout pageTitle="Waste Audits" breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'Waste Audits' }]}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 text-blue-600" />
              Pre-Acceptance Waste Audits
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Generate AI-powered waste audit documents, send to clients for review and signature.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Audit
          </button>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search audits..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'draft', 'sent_to_client', 'client_editing', 'ready_for_review', 'finalised', 'signed'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                  statusFilter === s
                    ? 'bg-gray-800 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s === 'sent_to_client' ? 'Sent' : s === 'client_editing' ? 'Editing' : s === 'ready_for_review' ? 'Ready' : s}
                {s === 'ready_for_review' && pendingReviewCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-xs">{pendingReviewCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredAudits.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No waste audits yet</h3>
            <p className="text-sm text-gray-500">Click "New Audit" to generate your first pre-acceptance waste audit.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAudits.map((audit) => (
              <button
                key={audit.id}
                onClick={() => window.location.assign(`/admin/waste-audits/${audit.id}/edit`)}
                className="w-full text-left bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-gray-500">{audit.audit_number}</span>
                    <span className="font-medium text-gray-900">{audit.practice_name || 'Unknown practice'}</span>
                  </div>
                  <StatusBadge status={audit.status} />
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(audit.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  {audit.selected_waste_streams?.length > 0 && (
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {audit.selected_waste_streams.length} waste streams
                    </span>
                  )}
                  {audit.admin_signed_at && audit.client_signed_at && (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-3 h-3" />
                      Fully signed
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Create Wizard Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !generating && setShowCreate(false)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">New Pre-Acceptance Waste Audit</h2>
                {!generating && (
                  <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
                )}
              </div>

              <div className="p-6">
                {/* Step indicator */}
                <div className="flex items-center gap-2 mb-6">
                  {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                        {s}
                      </div>
                      {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />}
                    </div>
                  ))}
                </div>

                {step === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Search for a customer</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Type name, business, or email..."
                          value={customerSearch}
                          onChange={(e) => searchCustomers(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                        />
                      </div>
                      {customerResults.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {customerResults.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => selectCustomer(c)}
                              className="w-full text-left text-sm px-3 py-2 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-200 transition-colors"
                            >
                              <span className="font-medium">{c.company_name || c.contact_name}</span>
                              <span className="text-gray-500 ml-2 text-xs">#{c.customer_number} · {c.postcode || ''}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-2">Select an existing customer or skip to enter details manually.</p>
                      <button
                        onClick={() => setStep(2)}
                        className="mt-3 text-sm text-blue-600 hover:text-blue-700 underline"
                      >
                        Skip — enter details manually
                      </button>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-700">Practice Details</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Practice Name" value={practiceName} onChange={setPracticeName} />
                      <Field label="Legal Entity" value={legalEntity} onChange={setLegalEntity} />
                      <div className="col-span-2">
                        <Field label="Address" value={address} onChange={setAddress} />
                      </div>
                      <Field label="Practice Type" value={practiceType} onChange={setPracticeType} placeholder="e.g. Private Dental Practice" />
                      <Field label="Services Provided" value={servicesProvided} onChange={setServicesProvided} placeholder="e.g. General dentistry, dental imaging" />
                      <Field label="Number of Surgeries" value={numberOfSurgeries} onChange={setNumberOfSurgeries} placeholder="e.g. 3" />
                      <Field label="Number of Staff" value={numberOfStaff} onChange={setNumberOfStaff} placeholder="e.g. 8" />
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Amalgam Use</label>
                        <select
                          value={amalgamUse}
                          onChange={(e) => setAmalgamUse(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400"
                        >
                          <option value="">Select...</option>
                          <option value="No — amalgam-free practice">No — amalgam-free practice</option>
                          <option value="Yes — amalgam used">Yes — amalgam used</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-700">Back</button>
                      <button onClick={() => setStep(3)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Next</button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-700">Select Waste Streams</h3>
                    <input
                      type="text"
                      placeholder="Search waste streams..."
                      value={streamSearch}
                      onChange={(e) => setStreamSearch(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400"
                    />
                    <div className="max-h-64 overflow-y-auto space-y-1 border border-gray-200 rounded-lg p-2">
                      {wasteStreams
                        .filter((s) => !streamSearch || s.name.toLowerCase().includes(streamSearch.toLowerCase()))
                        .map((stream) => {
                          const selected = selectedStreams.find((s) => s.id === stream.id);
                          return (
                            <div key={stream.id} className={`p-2 rounded-lg ${selected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={!!selected}
                                  onChange={() => toggleStream(stream)}
                                  className="rounded"
                                />
                                <div className="flex-1">
                                  <span className="text-sm font-medium text-gray-900">{stream.name}</span>
                                  <span className="ml-2 text-xs text-gray-400">{stream.ewc_code}</span>
                                </div>
                              </div>
                              {selected && (
                                <input
                                  type="text"
                                  placeholder="Estimated annual volume (e.g. 100L)"
                                  value={selected.estimated_volume}
                                  onChange={(e) => updateVolume(stream.id, e.target.value)}
                                  className="mt-2 w-full text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400"
                                />
                              )}
                            </div>
                          );
                        })}
                    </div>
                    {selectedStreams.length === 0 && (
                      <p className="text-xs text-amber-600">Select at least one waste stream to generate the audit.</p>
                    )}

                    {/* Selected streams summary */}
                    {selectedStreams.length > 0 && (
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                        <p className="text-xs font-medium text-blue-700 mb-1">Selected: {selectedStreams.length} stream{selectedStreams.length !== 1 ? 's' : ''}</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedStreams.map((s) => (
                            <span key={s.id} className="px-2 py-0.5 bg-white rounded-full text-xs text-blue-700 border border-blue-200">
                              {s.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Custom stream form */}
                    {showCustomStream && (
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700">Add Custom Waste Stream</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <input type="text" placeholder="Stream name *" value={customStream.name} onChange={(e) => setCustomStream({ ...customStream, name: e.target.value })} className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-400" />
                          <input type="text" placeholder="EWC code *" value={customStream.ewc_code} onChange={(e) => setCustomStream({ ...customStream, ewc_code: e.target.value })} className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-400" />
                          <input type="text" placeholder="Container type" value={customStream.container_type} onChange={(e) => setCustomStream({ ...customStream, container_type: e.target.value })} className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-400" />
                          <input type="text" placeholder="Colour code" value={customStream.colour_code} onChange={(e) => setCustomStream({ ...customStream, colour_code: e.target.value })} className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-400" />
                          <input type="text" placeholder="Hazardous properties" value={customStream.hazardous_properties} onChange={(e) => setCustomStream({ ...customStream, hazardous_properties: e.target.value })} className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-400" />
                          <input type="text" placeholder="Disposal route" value={customStream.disposal_route} onChange={(e) => setCustomStream({ ...customStream, disposal_route: e.target.value })} className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-400" />
                          <div className="col-span-2">
                            <input type="text" placeholder="Description" value={customStream.description} onChange={(e) => setCustomStream({ ...customStream, description: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-400" />
                          </div>
                          <label className="col-span-2 flex items-center gap-2 text-xs text-gray-600">
                            <input type="checkbox" checked={customStream.is_hazardous} onChange={(e) => setCustomStream({ ...customStream, is_hazardous: e.target.checked })} className="rounded" />
                            This is a hazardous waste stream
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={addCustomStream} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">Add Stream</button>
                          <button onClick={() => setShowCustomStream(false)} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                        </div>
                      </div>
                    )}

                    {!showCustomStream && (
                      <button onClick={() => setShowCustomStream(true)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
                        <Plus className="w-3.5 h-3.5" />
                        Add custom waste stream
                      </button>
                    )}
                    <div className="flex justify-between">
                      <button onClick={() => setStep(2)} className="text-sm text-gray-500 hover:text-gray-700">Back</button>
                      <button
                        onClick={() => createAudit.mutate()}
                        disabled={selectedStreams.length === 0 || generating || createAudit.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                      >
                        {generating ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Generating AI Draft...
                          </>
                        ) : (
                          <>
                            <ClipboardCheck className="w-4 h-4" />
                            Generate Audit
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent"
      />
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
