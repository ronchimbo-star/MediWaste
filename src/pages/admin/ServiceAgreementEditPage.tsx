import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { ArrowLeft, Save, Send, ExternalLink, Plus, Trash2 } from 'lucide-react';

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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [secureToken, setSecureToken] = useState('');
  const [agreementNumber, setAgreementNumber] = useState('');

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
    alert('Link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/admin/service-agreements"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Agreements
          </Link>

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
    </div>
  );
}
