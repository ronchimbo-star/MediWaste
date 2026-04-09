import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import CertificatePreview from '../../components/certificates/CertificatePreview';
import { Save, Eye, Plus, Trash2, ChevronLeft } from 'lucide-react';
import { useToastContext } from '../../contexts/ToastContext';

interface CertificateSettings {
  id: string;
  waste_carrier_licence: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  default_signatory_name: string;
  default_signatory_title: string;
  default_certification_statement: string;
  waste_carrier_company_name: string | null;
}

interface FormState {
  customer_id: string;
  issue_date: string;
  expiry_date: string;
  contract_start_date: string;
  contract_end_date: string;
  waste_types_covered: string[];
  status: string;
  authorised_signatory_name: string;
  authorised_signatory_title: string;
  certification_statement: string;
  notes: string;
}

export default function CertificateEditPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id && id !== 'create';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToastContext();
  const [showPreview, setShowPreview] = useState(false);
  const [newWasteType, setNewWasteType] = useState('');

  const [form, setForm] = useState<FormState>({
    customer_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    contract_start_date: new Date().toISOString().split('T')[0],
    contract_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    waste_types_covered: [],
    status: 'active',
    authorised_signatory_name: '',
    authorised_signatory_title: '',
    certification_statement: '',
    notes: '',
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('mw_customers')
        .select('id, company_name, contact_name, billing_address, collection_address, postcode')
        .eq('status', 'active')
        .order('company_name');
      return data || [];
    },
  });

  const { data: settings } = useQuery<CertificateSettings>({
    queryKey: ['certificate-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('mw_certificate_settings').select('*').eq('id', 'default').maybeSingle();
      return data;
    },
  });

  const { data: existingCert } = useQuery({
    queryKey: ['certificate', id],
    enabled: isEdit,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mw_certificates')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (existingCert) {
      setForm({
        customer_id: existingCert.customer_id || '',
        issue_date: existingCert.issue_date || '',
        expiry_date: existingCert.expiry_date || '',
        contract_start_date: existingCert.contract_start_date || '',
        contract_end_date: existingCert.contract_end_date || '',
        waste_types_covered: existingCert.waste_types_covered || [],
        status: existingCert.status || 'active',
        authorised_signatory_name: existingCert.authorised_signatory_name || '',
        authorised_signatory_title: existingCert.authorised_signatory_title || '',
        certification_statement: existingCert.certification_statement || '',
        notes: existingCert.notes || '',
      });
    }
  }, [existingCert]);

  useEffect(() => {
    if (settings && !isEdit) {
      setForm((prev) => ({
        ...prev,
        authorised_signatory_name: settings.default_signatory_name || '',
        authorised_signatory_title: settings.default_signatory_title || '',
        certification_statement: settings.default_certification_statement || '',
      }));
    }
  }, [settings, isEdit]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        waste_types_covered: form.waste_types_covered,
        authorised_signatory_name: form.authorised_signatory_name || settings?.default_signatory_name,
        authorised_signatory_title: form.authorised_signatory_title || settings?.default_signatory_title,
        certification_statement: form.certification_statement || settings?.default_certification_statement,
        updated_at: new Date().toISOString(),
      };

      if (isEdit) {
        const { error } = await supabase
          .from('mw_certificates')
          .update(payload)
          .eq('id', id);
        if (error) throw error;
      } else {
        const certNumber = await supabase.rpc('generate_certificate_number');
        const token = `${Date.now()}-${Math.random().toString(36).substring(2, 13)}`;
        const { error } = await supabase.from('mw_certificates').insert({
          ...payload,
          certificate_number: certNumber.data,
          qr_code_token: token,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-certificates'] });
      toast.success(isEdit ? 'Certificate updated' : 'Certificate created');
      navigate('/admin/certificates');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to save certificate');
    },
  });

  const selectedCustomer = customers.find((c) => c.id === form.customer_id);

  const addWasteType = () => {
    const t = newWasteType.trim();
    if (t && !form.waste_types_covered.includes(t)) {
      setForm((prev) => ({ ...prev, waste_types_covered: [...prev.waste_types_covered, t] }));
      setNewWasteType('');
    }
  };

  const removeWasteType = (index: number) => {
    setForm((prev) => ({
      ...prev,
      waste_types_covered: prev.waste_types_covered.filter((_, i) => i !== index),
    }));
  };

  const previewData = {
    certificate_number: existingCert?.certificate_number || 'CERT-PREVIEW',
    qr_code_token: existingCert?.qr_code_token || 'preview',
    customer_name: selectedCustomer?.company_name || 'Customer Name',
    issue_date: form.issue_date,
    expiry_date: form.expiry_date,
    waste_types_covered: form.waste_types_covered,
    authorised_signatory_name: form.authorised_signatory_name || settings?.default_signatory_name || 'Signatory',
    authorised_signatory_title: form.authorised_signatory_title || settings?.default_signatory_title || 'Title',
    waste_carrier_licence: settings?.waste_carrier_licence || '',
    certification_statement: form.certification_statement || settings?.default_certification_statement || '',
  };

  const COMMON_WASTE_TYPES = [
    'EWC 18 01 03* - Infectious sharps',
    'EWC 18 01 03* - Clinical waste bags',
    'EWC 18 01 08* - Cytotoxic medicines',
    'EWC 18 01 09 - Pharmaceutical waste',
    'EWC 18 01 01 - Anatomical waste',
    'EWC 18 01 02* - Body parts',
    'EWC 18 02 02* - Dental amalgam',
  ];

  return (
    <AdminLayout
      pageTitle={isEdit ? 'Edit Certificate' : 'New Certificate'}
      breadcrumbs={[
        { label: 'Admin', path: '/admin' },
        { label: 'Certificates', path: '/admin/certificates' },
        { label: isEdit ? 'Edit' : 'New' },
      ]}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/admin/certificates')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft size={16} />
            Back to Certificates
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Eye size={15} />
              {showPreview ? 'Hide Preview' : 'Preview'}
            </button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !form.customer_id}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Save size={15} />
              {saveMutation.isPending ? 'Saving...' : 'Save Certificate'}
            </button>
          </div>
        </div>

        <div className={`grid gap-6 ${showPreview ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 max-w-2xl'}`}>
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h2 className="font-semibold text-gray-900">Customer</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Customer <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.customer_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, customer_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.company_name}</option>
                  ))}
                </select>
              </div>
              {selectedCustomer && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                  <p className="font-medium text-gray-900">{selectedCustomer.company_name}</p>
                  <p className="text-gray-500">{selectedCustomer.contact_name}</p>
                  {selectedCustomer.collection_address && (
                    <p className="text-gray-500">{selectedCustomer.collection_address}</p>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h2 className="font-semibold text-gray-900">Certificate Dates</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={form.issue_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, issue_date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={form.expiry_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, expiry_date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contract Start</label>
                  <input
                    type="date"
                    value={form.contract_start_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, contract_start_date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contract End</label>
                  <input
                    type="date"
                    value={form.contract_end_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, contract_end_date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h2 className="font-semibold text-gray-900">Waste Types Covered</h2>
              <div className="space-y-2">
                {form.waste_types_covered.map((wt, i) => (
                  <div key={i} className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    <span className="flex-1 text-sm text-gray-800">{wt}</span>
                    <button
                      onClick={() => removeWasteType(i)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newWasteType}
                  onChange={(e) => setNewWasteType(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addWasteType()}
                  placeholder="e.g. EWC 18 01 03* - Infectious sharps"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addWasteType}
                  className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm transition-colors"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-2">Common types:</p>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_WASTE_TYPES.map((wt) => (
                    <button
                      key={wt}
                      onClick={() => {
                        if (!form.waste_types_covered.includes(wt)) {
                          setForm((prev) => ({ ...prev, waste_types_covered: [...prev.waste_types_covered, wt] }));
                        }
                      }}
                      disabled={form.waste_types_covered.includes(wt)}
                      className="text-xs px-2 py-1 rounded-full border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-700 disabled:opacity-40 disabled:cursor-default transition-colors"
                    >
                      {wt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h2 className="font-semibold text-gray-900">Signatory & Status</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Signatory Name</label>
                  <input
                    type="text"
                    value={form.authorised_signatory_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, authorised_signatory_name: e.target.value }))}
                    placeholder={settings?.default_signatory_name || ''}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Signatory Title</label>
                  <input
                    type="text"
                    value={form.authorised_signatory_title}
                    onChange={(e) => setForm((prev) => ({ ...prev, authorised_signatory_title: e.target.value }))}
                    placeholder={settings?.default_signatory_title || ''}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="expired">Expired</option>
                  <option value="revoked">Revoked</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Internal notes..."
                />
              </div>
            </div>
          </div>

          {showPreview && (
            <div className="space-y-4">
              <h2 className="font-semibold text-gray-900">Certificate Preview</h2>
              <div className="bg-gray-100 rounded-xl p-4 overflow-auto max-h-[calc(100vh-200px)]">
                <CertificatePreview data={previewData} settings={settings || null} />
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
