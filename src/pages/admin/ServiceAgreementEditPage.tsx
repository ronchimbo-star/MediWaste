import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Save, Send, ExternalLink, Plus, Trash2, Eye, X } from 'lucide-react';
import { useToastContext } from '../../contexts/ToastContext';
import AdminLayout from '../../components/admin/AdminLayout';

interface WasteItem {
  description: string;
  frequency: string;
}

interface AgreementForm {
  client_name: string;
  client_address: string;
  collection_address: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  waste_types: string[];
  waste_items: WasteItem[];
  collection_frequency: string;
  containers: string;
  initial_term_months: number;
  payment_terms_days: number;
  bin_rental: boolean;
  start_date: string;
  annual_value: string;
  status: string;
  notes: string;
}

export default function ServiceAgreementEditPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToastContext();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [secureToken, setSecureToken] = useState('');
  const [agreementNumber, setAgreementNumber] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const [form, setForm] = useState<AgreementForm>({
    client_name: '',
    client_address: '',
    collection_address: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    waste_types: [],
    waste_items: [],
    collection_frequency: 'Monthly',
    containers: 'Supplied by MediWaste',
    initial_term_months: 12,
    payment_terms_days: 14,
    bin_rental: false,
    start_date: '',
    annual_value: '',
    status: 'draft',
    notes: ''
  });

  const wasteTypeOptions = [
    'Sharps waste',
    'Clinical waste bags',
    'Pharmaceutical waste',
    'Cytotoxic waste',
    'Anatomical waste',
    'Dental amalgam',
    'X-ray chemicals'
  ];

  useEffect(() => {
    if (!authLoading && user && id && id !== 'create') {
      fetchAgreement();
    }
  }, [id, user, authLoading]);

  const fetchAgreement = async () => {
    if (!id || id === 'create') return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_agreements')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setForm({
          client_name: data.client_name,
          client_address: data.client_address,
          collection_address: data.collection_address || '',
          contact_name: data.contact_name,
          contact_email: data.contact_email,
          contact_phone: data.contact_phone,
          waste_types: data.waste_types || [],
          waste_items: data.waste_items || [],
          collection_frequency: data.collection_frequency,
          containers: data.containers,
          initial_term_months: data.initial_term_months,
          payment_terms_days: data.payment_terms_days,
          bin_rental: data.bin_rental,
          start_date: data.start_date || '',
          annual_value: data.annual_value?.toString() || '',
          status: data.status,
          notes: data.notes || ''
        });
        setSecureToken(data.secure_token);
        setAgreementNumber(data.agreement_number);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateAgreementNumber = () => {
    const prefix = 'SLA';
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${year}-${random}`;
  };

  const generateSecureToken = () => {
    return btoa(Math.random().toString(36).substring(2) + Date.now().toString(36));
  };

  const handleWasteTypeToggle = (wasteType: string) => {
    setForm((prev) => ({
      ...prev,
      waste_types: prev.waste_types.includes(wasteType)
        ? prev.waste_types.filter((t) => t !== wasteType)
        : [...prev.waste_types, wasteType]
    }));
  };

  const addWasteItem = () => {
    setForm((prev) => ({
      ...prev,
      waste_items: [...prev.waste_items, { description: '', frequency: 'Monthly' }]
    }));
  };

  const updateWasteItem = (index: number, field: keyof WasteItem, value: string) => {
    setForm((prev) => ({
      ...prev,
      waste_items: prev.waste_items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeWasteItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      waste_items: prev.waste_items.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async (newStatus?: string) => {
    if (!user) return;

    setError('');
    setSaving(true);

    try {
      const statusToUse = newStatus || form.status;

      if (id && id !== 'create') {
        const { error } = await supabase
          .from('service_agreements')
          .update({
            ...form,
            annual_value: parseFloat(form.annual_value) || 0,
            status: statusToUse,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (error) throw error;
      } else {
        const newAgreementNumber = generateAgreementNumber();
        const newSecureToken = generateSecureToken();

        let endDate = null;
        if (form.start_date) {
          const startDate = new Date(form.start_date);
          const endDateCalc = new Date(startDate);
          endDateCalc.setMonth(endDateCalc.getMonth() + form.initial_term_months);
          endDate = endDateCalc.toISOString().split('T')[0];
        }

        const { error } = await supabase.from('service_agreements').insert({
          ...form,
          agreement_number: newAgreementNumber,
          secure_token: newSecureToken,
          annual_value: parseFloat(form.annual_value) || 0,
          end_date: endDate,
          status: statusToUse,
          created_by: user.id
        });

        if (error) throw error;
      }

      navigate('/admin/service-agreements');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendToClient = async () => {
    await handleSave('sent');
  };

  const getPublicUrl = () => {
    if (!secureToken) return '';
    return `${window.location.origin}/service-agreement/${secureToken}`;
  };

  const copyToClipboard = () => {
    const url = getPublicUrl();
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  if (loading) {
    return (
      <AdminLayout pageTitle={id && id !== 'create' ? 'Edit Agreement' : 'New Agreement'} breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'Service Agreements', path: '/admin/service-agreements' }, { label: id && id !== 'create' ? 'Edit Agreement' : 'New Agreement' }]}>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle={id && id !== 'create' ? 'Edit Agreement' : 'New Agreement'} breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'Service Agreements', path: '/admin/service-agreements' }, { label: id && id !== 'create' ? 'Edit Agreement' : 'New Agreement' }]}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {id && id !== 'create' ? 'Edit Service Agreement' : 'Create Service Agreement'}
              </h1>
              {agreementNumber && (
                <p className="text-gray-600">Agreement #{agreementNumber}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
              {secureToken && (
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Copy Link
                </button>
              )}
              <button
                onClick={() => handleSave()}
                disabled={saving}
                className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded font-semibold transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                onClick={handleSendToClient}
                disabled={saving}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-semibold transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                Send to Client
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="space-y-8">
            {/* Client Information */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Client Information</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={form.client_name}
                    onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Address *
                  </label>
                  <input
                    type="text"
                    value={form.client_address}
                    onChange={(e) => setForm({ ...form, client_address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Collection Address
                  </label>
                  <input
                    type="text"
                    value={form.collection_address}
                    onChange={(e) => setForm({ ...form, collection_address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Leave blank if same as business address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    value={form.contact_name}
                    onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={form.contact_email}
                    onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={form.contact_phone}
                    onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Service Details */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Service Details</h2>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Waste Types *
                </label>
                <div className="grid md:grid-cols-2 gap-3">
                  {wasteTypeOptions.map((wasteType) => (
                    <label key={wasteType} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.waste_types.includes(wasteType)}
                        onChange={() => handleWasteTypeToggle(wasteType)}
                        className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                      />
                      <span className="text-sm text-gray-700">{wasteType}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Waste Collection Items *
                  </label>
                  <button
                    type="button"
                    onClick={addWasteItem}
                    className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>

                <div className="space-y-3">
                  {form.waste_items.map((item, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateWasteItem(index, 'description', e.target.value)}
                          placeholder="e.g., Clinical waste bins (60L)"
                          className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>
                      <div className="w-48">
                        <select
                          value={item.frequency}
                          onChange={(e) => updateWasteItem(index, 'frequency', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option>Weekly</option>
                          <option>Fortnightly</option>
                          <option>Monthly</option>
                          <option>Quarterly</option>
                          <option>On-demand</option>
                          <option>Adhoc</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeWasteItem(index)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  {form.waste_items.length === 0 && (
                    <p className="text-sm text-gray-500 italic">No waste items added yet. Click "Add Item" to add waste collection items.</p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Collection Frequency *
                  </label>
                  <select
                    value={form.collection_frequency}
                    onChange={(e) => setForm({ ...form, collection_frequency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option>Weekly</option>
                    <option>Fortnightly</option>
                    <option>Monthly</option>
                    <option>Quarterly</option>
                    <option>On-demand (Flexi-4)</option>
                    <option>Adhoc</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Containers *
                  </label>
                  <input
                    type="text"
                    value={form.containers}
                    onChange={(e) => setForm({ ...form, containers: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="e.g., Supplied by MediWaste, BYOB - 60L bins"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Annual Value (£)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.annual_value}
                    onChange={(e) => setForm({ ...form, annual_value: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Terms */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Agreement Terms</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Initial Term (months)
                  </label>
                  <input
                    type="number"
                    value={form.initial_term_months}
                    onChange={(e) => setForm({ ...form, initial_term_months: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Terms (days)
                  </label>
                  <input
                    type="number"
                    value={form.payment_terms_days}
                    onChange={(e) => setForm({ ...form, payment_terms_days: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer mt-8">
                    <input
                      type="checkbox"
                      checked={form.bin_rental}
                      onChange={(e) => setForm({ ...form, bin_rental: e.target.checked })}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Bin Rental Applies</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Internal Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Internal Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Internal notes (not visible to client)"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-5xl w-full my-8 relative">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-lg z-10">
              <h2 className="text-2xl font-bold text-gray-900">Agreement Preview</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 max-h-[80vh] overflow-y-auto">
              {/* Agreement Document Preview */}
              <div className="bg-white rounded-lg border border-gray-200 p-8 md:p-12">
                {/* Header */}
                <div className="flex justify-between items-start mb-8 pb-8 border-b">
                  <div>
                    <img
                      src="/mediwaste-logo.png"
                      alt="MediWaste"
                      className="h-12 mb-4"
                    />
                    <p className="text-sm text-gray-600">Agreement No: {agreementNumber || 'SLA-XXXX-XXXX'}</p>
                    <p className="text-sm text-gray-600">Date: {new Date().toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                  Service Agreement
                </h1>

                <div className="space-y-8 text-gray-700">
                  {/* Parties */}
                  <div>
                    <p className="font-semibold text-gray-900 mb-4">This Service Agreement is made between:</p>

                    <div className="mb-6">
                      <p className="font-semibold text-gray-900">Supplier:</p>
                      <p>Circular Horizons International LTD T/A MediWaste</p>
                      <p>Unit A 82 James Carter Road, Mildenhall, IP28 7DE</p>
                      <p>Company No: 15821509</p>
                      <p>Contact: Sarah Benson – sarah.benson@mediwaste.co.uk / 01322 879 713</p>
                    </div>

                    <div>
                      <p className="font-semibold text-gray-900">Client:</p>
                      <p className="font-medium">{form.client_name || '[Client Name]'}</p>
                      <p>{form.client_address || '[Client Address]'}</p>
                      <p>Contact: {form.contact_name || '[Contact Name]'} – {form.contact_email || '[Email]'} / {form.contact_phone || '[Phone]'}</p>
                    </div>
                  </div>

                  {/* Section 1 */}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-3">1. Services Provided</h2>
                    <p className="mb-2">MediWaste agrees to provide the following waste collection and disposal services:</p>

                    {form.collection_address && (
                      <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                        <p className="font-semibold text-gray-900">Collection Address:</p>
                        <p className="text-gray-700">{form.collection_address}</p>
                      </div>
                    )}

                    {form.waste_items.length > 0 ? (
                      <div className="mb-4">
                        <p className="font-semibold mb-2">Waste Collection Items:</p>
                        <ul className="list-disc pl-6 space-y-1">
                          {form.waste_items.map((item, index) => (
                            <li key={index}>
                              <span className="font-medium">{item.description || '[Description]'}</span> - <span className="text-gray-600">{item.frequency}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <ul className="list-disc pl-6 space-y-2">
                        <li>
                          <span className="font-semibold">Waste types:</span>{' '}
                          {form.waste_types.length > 0 ? form.waste_types.join(', ') : '[None selected]'}
                        </li>
                        <li>
                          <span className="font-semibold">Collection frequency:</span> {form.collection_frequency}
                        </li>
                      </ul>
                    )}

                    <ul className="list-disc pl-6 space-y-2 mt-2">
                      <li>
                        <span className="font-semibold">Containers:</span> {form.containers}
                      </li>
                      <li>
                        <span className="font-semibold">Documentation:</span> Full hazardous waste consignment notes, waste transfer notes, and online compliance dashboard access.
                      </li>
                    </ul>
                  </div>

                  {/* Section 2 */}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-3">2. Term & Cancellation</h2>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>
                        <span className="font-semibold">Initial term:</span> {form.initial_term_months} months from the first collection date (if scheduled service). For Flexi/on-demand plans, the agreement is valid for {form.initial_term_months} months from the date of invoice.
                      </li>
                      <li>
                        <span className="font-semibold">Cancellation:</span> 30 days' written notice. Unused prepaid collections will be refunded pro-rata, minus a £25 admin fee.
                      </li>
                      {form.bin_rental && (
                        <li>
                          <span className="font-semibold">Bin rental:</span> Rolling monthly contract – 30 days' notice to cancel.
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Section 3 */}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-3">3. Payment Terms</h2>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Invoices are due within {form.payment_terms_days} days of issue.</li>
                      <li>Late payments may incur a 5% late fee and suspension of service.</li>
                      <li>For Flexi plans, payment is required before the first collection.</li>
                    </ul>
                  </div>

                  {/* Section 4 */}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-3">4. Client Obligations</h2>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Store all waste securely in appropriate containers.</li>
                      <li>Do not overfill containers.</li>
                      <li>Inform MediWaste of any changes to waste types or volumes.</li>
                    </ul>
                  </div>

                  {/* Section 5 */}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-3">5. Liability & Compliance</h2>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>MediWaste holds a valid Upper Tier Waste Carrier Licence (CBDU123456) and £5m public liability insurance.</li>
                      <li>MediWaste will provide all legally required documentation and ensure waste is disposed of at permitted facilities.</li>
                      <li>The client remains responsible for accurate waste classification.</li>
                    </ul>
                  </div>

                  {/* Section 6 */}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-3">6. Service Guarantee</h2>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>MediWaste guarantees a 2-hour collection window with 24 hours' notice.</li>
                      <li>If we miss a scheduled collection without 24 hours' notice, the next collection is free.</li>
                    </ul>
                  </div>

                  {/* Signatures */}
                  <div className="mt-12 pt-8 border-t">
                    <div className="grid md:grid-cols-2 gap-8">
                      <div>
                        <p className="font-semibold text-gray-900 mb-4">Accepted by:</p>
                        <p className="mb-2">Signature: _________________</p>
                        <p className="mb-2">Date: ________</p>
                        <p className="mb-2">Name: _________________</p>
                        <p>Position: ________</p>
                      </div>

                      <div>
                        <p className="font-semibold text-gray-900 mb-4">For and on behalf of MediWaste:</p>
                        <p className="mb-2">Signature: <span className="italic font-semibold">Sarah Benson</span></p>
                        <p className="mb-2">Date: {new Date().toLocaleDateString()}</p>
                        <p>Sarah Benson, Key Account Manager</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3 rounded-b-lg">
              <button
                onClick={() => setShowPreview(false)}
                className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowPreview(false);
                  handleSave();
                }}
                disabled={saving}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded font-semibold transition-colors disabled:opacity-50"
              >
                Save Draft
              </button>
              <button
                onClick={() => {
                  setShowPreview(false);
                  handleSendToClient();
                }}
                disabled={saving}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-semibold transition-colors disabled:opacity-50"
              >
                Send to Client
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
