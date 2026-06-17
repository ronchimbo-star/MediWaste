import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Plus, Download, Eye, X } from 'lucide-react';
import { useToastContext } from '../../contexts/ToastContext';
import AdminLayout from '../../components/admin/AdminLayout';

interface WtnLineItem {
  id?: string;
  waste_type: string;
  waste_code: string;
  waste_description: string;
  quantity: string;
  quantity_unit: string;
  container_type: string;
  container_count: string;
}

interface WasteTransferNote {
  id: string;
  wtn_number: string;
  job: { job_number: string; service_type: string; } | null;
  customer: { customer_number: string; company_name: string; contact_name: string; };
  issue_date: string;
  carrier_signature: string;
  customer_signature: string;
  mw_wtn_line_items?: WtnLineItem[];
  // legacy single-stream fields (may exist on older records)
  waste_description?: string;
  waste_type?: string;
  quantity?: number;
  quantity_unit?: string;
  container_type?: string;
  container_count?: number;
}

// EA waste codes for common healthcare waste types
const WASTE_CODES: Record<string, string> = {
  clinical_waste: '18 01 03*',
  sharps: '18 01 01',
  pharmaceutical: '18 01 08*',
  cytotoxic: '18 01 08*',
  anatomical: '18 01 02',
  dental: '18 01 03*',
  general_medical: '18 01 04',
};

const WASTE_TYPES = ['clinical_waste', 'sharps', 'pharmaceutical', 'cytotoxic', 'anatomical', 'dental', 'general_medical'];
const CONTAINER_TYPES = ['yellow_bag', 'sharps_bin', 'rigid_container', 'drum', 'box', 'tiger_stripe_bag', 'purple_bag'];
const QUANTITY_UNITS = ['kg', 'litres', 'units', 'bags'];

const emptyLineItem = (): WtnLineItem => ({
  waste_type: 'clinical_waste',
  waste_code: WASTE_CODES['clinical_waste'],
  waste_description: '',
  quantity: '',
  quantity_unit: 'kg',
  container_type: 'yellow_bag',
  container_count: '1',
});

const emptyCreateForm = {
  customer_id: '', job_id: '',
  carrier_signature: 'SUEZ',
};

export default function WasteTransferNotesPage() {
  const { toast } = useToastContext();
  const location = useLocation();
  const [wtns, setWtns] = useState<WasteTransferNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedWtn, setSelectedWtn] = useState<WasteTransferNote | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ ...emptyCreateForm });
  const [lineItems, setLineItems] = useState<WtnLineItem[]>([emptyLineItem()]);
  const [createLoading, setCreateLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => { fetchWTNs(); }, []);

  // Auto-open create modal when navigated here from a job card
  useEffect(() => {
    const prefill = (location.state as any)?.prefill;
    if (!prefill) return;
    (async () => {
      const [custRes, jobRes] = await Promise.all([
        supabase.from('mw_customers').select('id,customer_number,company_name,contact_name').eq('status', 'active').order('company_name'),
        supabase.from('mw_service_jobs').select('id,job_number,service_type').in('status', ['completed', 'scheduled']).order('scheduled_date', { ascending: false }).limit(50),
      ]);
      setCustomers(custRes.data || []);
      setJobs(jobRes.data || []);
      setCreateForm({ ...emptyCreateForm, customer_id: prefill.customer_id || '', job_id: prefill.job_id || '' });
      setLineItems([emptyLineItem()]);
      setShowCreateModal(true);
    })();
  }, []);

  const fetchWTNs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mw_waste_transfer_notes')
        .select(`
          *,
          job:mw_service_jobs(job_number, service_type),
          customer:mw_customers!inner(customer_number, company_name, contact_name),
          mw_wtn_line_items(*)
        `)
        .order('issue_date', { ascending: false });
      if (error) throw error;
      setWtns((data || []) as WasteTransferNote[]);
    } catch (error) {
      console.error('Error fetching WTNs:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = async () => {
    const [custRes, jobRes] = await Promise.all([
      supabase.from('mw_customers').select('id,customer_number,company_name,contact_name').eq('status', 'active').order('company_name'),
      supabase.from('mw_service_jobs').select('id,job_number,service_type').in('status', ['completed', 'scheduled']).order('scheduled_date', { ascending: false }).limit(50),
    ]);
    setCustomers(custRes.data || []);
    setJobs(jobRes.data || []);
    setCreateForm({ ...emptyCreateForm });
    setLineItems([emptyLineItem()]);
    setShowCreateModal(true);
  };

  const handleCreateWTN = async () => {
    const validItems = lineItems.filter(i => i.waste_description && i.quantity);
    if (!createForm.customer_id || validItems.length === 0) {
      toast.error('Please fill in all required fields and at least one waste item');
      return;
    }
    setCreateLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const wtnNumber = `WTN${today}-${Date.now().toString().slice(-4)}`;
      const { data: wtn, error: wtnErr } = await supabase.from('mw_waste_transfer_notes').insert([{
        wtn_number: wtnNumber,
        customer_id: createForm.customer_id,
        job_id: createForm.job_id || null,
        issue_date: new Date().toISOString().split('T')[0],
        carrier_signature: createForm.carrier_signature,
      }]).select('id').single();
      if (wtnErr || !wtn) throw wtnErr || new Error('WTN insert failed');

      const { error: itemsErr } = await supabase.from('mw_wtn_line_items').insert(
        validItems.map((item, idx) => ({
          wtn_id: wtn.id,
          waste_type: item.waste_type,
          waste_code: item.waste_code || WASTE_CODES[item.waste_type] || '',
          waste_description: item.waste_description,
          quantity: Number(item.quantity),
          quantity_unit: item.quantity_unit,
          container_type: item.container_type,
          container_count: Number(item.container_count) || 1,
          sort_order: idx,
        }))
      );
      if (itemsErr) throw itemsErr;

      toast.success(`WTN ${wtnNumber} created successfully`);
      setShowCreateModal(false);
      fetchWTNs();
    } catch {
      toast.error('Failed to create WTN');
    } finally {
      setCreateLoading(false);
    }
  };

  const updateLineItem = (idx: number, field: keyof WtnLineItem, value: string) => {
    setLineItems(items => items.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === 'waste_type') updated.waste_code = WASTE_CODES[value] || '';
      return updated;
    }));
  };

  // Derive display summary for list view
  function wtnSummary(wtn: WasteTransferNote) {
    if (wtn.mw_wtn_line_items && wtn.mw_wtn_line_items.length > 0) {
      return wtn.mw_wtn_line_items.map(i => i.waste_type?.replace(/_/g, ' ')).join(', ');
    }
    return wtn.waste_type?.replace(/_/g, ' ') || '—';
  }

  function wtnQtySummary(wtn: WasteTransferNote) {
    if (wtn.mw_wtn_line_items && wtn.mw_wtn_line_items.length > 0) {
      return `${wtn.mw_wtn_line_items.length} item${wtn.mw_wtn_line_items.length !== 1 ? 's' : ''}`;
    }
    return wtn.quantity ? `${wtn.quantity} ${wtn.quantity_unit || ''}` : '—';
  }

  return (
    <AdminLayout pageTitle="Waste Transfer Notes" breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'Waste Transfer Notes' }]}>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Waste Transfer Notes</h1>
          <p className="text-gray-600 mt-1">Manage waste transfer documentation</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex gap-4 justify-between items-center">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Total WTNs</p>
              <p className="text-2xl font-bold text-gray-900">{wtns.length}</p>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create WTN
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">WTN #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Waste Type(s)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {wtns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">No waste transfer notes found</td>
                  </tr>
                ) : wtns.map((wtn) => (
                  <tr key={wtn.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{wtn.wtn_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{wtn.job?.job_number || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{wtn.customer.company_name || wtn.customer.contact_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 capitalize">{wtnSummary(wtn)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{wtnQtySummary(wtn)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(wtn.issue_date).toLocaleDateString('en-GB')}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setSelectedWtn(wtn); setShowModal(true); }} className="text-blue-600 hover:text-blue-900" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setSelectedWtn(wtn); setShowModal(true); }} className="text-green-600 hover:text-green-900" title="Print / Download">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── View / Print Modal ── */}
      {showModal && selectedWtn && (
        <WTNViewModal wtn={selectedWtn} onClose={() => { setShowModal(false); setSelectedWtn(null); }} />
      )}

      {/* ── Create Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Create Waste Transfer Note</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                <select value={createForm.customer_id} onChange={e => setCreateForm({ ...createForm, customer_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent">
                  <option value="">Select customer...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.company_name || c.contact_name} ({c.customer_number})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linked Job (optional)</label>
                <select value={createForm.job_id} onChange={e => setCreateForm({ ...createForm, job_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent">
                  <option value="">No linked job</option>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.job_number} — {j.service_type?.replace(/_/g, ' ')}</option>)}
                </select>
              </div>

              {/* ── Line Items ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Waste Items *</label>
                  <button
                    type="button"
                    onClick={() => setLineItems([...lineItems, emptyLineItem()])}
                    className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium"
                  >
                    <Plus size={13} /> Add Item
                  </button>
                </div>
                <div className="space-y-3">
                  {lineItems.map((item, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-gray-50 relative">
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))}
                          className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                        >
                          <X size={14} />
                        </button>
                      )}
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Waste Type</label>
                          <select
                            value={item.waste_type}
                            onChange={e => updateLineItem(idx, 'waste_type', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                          >
                            {WASTE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Waste Code (EA)</label>
                          <input
                            type="text"
                            value={item.waste_code}
                            onChange={e => updateLineItem(idx, 'waste_code', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                            placeholder="e.g. 18 01 03*"
                          />
                        </div>
                      </div>
                      <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Waste Description *</label>
                        <input
                          type="text"
                          value={item.waste_description}
                          onChange={e => updateLineItem(idx, 'waste_description', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                          placeholder="e.g. Contaminated dressings and swabs"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Container Type</label>
                          <select
                            value={item.container_type}
                            onChange={e => updateLineItem(idx, 'container_type', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                          >
                            {CONTAINER_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Containers</label>
                          <input
                            type="number" min="1"
                            value={item.container_count}
                            onChange={e => updateLineItem(idx, 'container_count', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
                          <input
                            type="number" min="0" step="0.1"
                            value={item.quantity}
                            onChange={e => updateLineItem(idx, 'quantity', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
                          <select
                            value={item.quantity_unit}
                            onChange={e => updateLineItem(idx, 'quantity_unit', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                          >
                            {QUANTITY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleCreateWTN}
                disabled={createLoading || !createForm.customer_id || !lineItems.some(i => i.waste_description && i.quantity)}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50"
              >
                {createLoading ? 'Creating...' : 'Create WTN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

interface WTNViewModalProps {
  wtn: WasteTransferNote;
  onClose: () => void;
}

function WTNViewModal({ wtn, onClose }: WTNViewModalProps) {
  const [customerAddress, setCustomerAddress] = useState<any>(null);

  useEffect(() => { fetchCustomerAddress(); }, []);

  const fetchCustomerAddress = async () => {
    const { data } = await supabase
      .from('mw_customer_addresses')
      .select('*')
      .eq('customer_id', wtn.customer.customer_number)
      .eq('is_primary', true)
      .maybeSingle();
    if (data) setCustomerAddress(data);
  };

  // Normalise: prefer line items, fall back to legacy single-stream columns
  const lineItems: WtnLineItem[] =
    wtn.mw_wtn_line_items && wtn.mw_wtn_line_items.length > 0
      ? wtn.mw_wtn_line_items
      : wtn.waste_type
        ? [{
            waste_type: wtn.waste_type,
            waste_code: WASTE_CODES[wtn.waste_type] || '',
            waste_description: wtn.waste_description || '',
            quantity: String(wtn.quantity || ''),
            quantity_unit: wtn.quantity_unit || 'kg',
            container_type: wtn.container_type || 'yellow_bag',
            container_count: String(wtn.container_count || 1),
          }]
        : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Waste Transfer Note</h2>
              <p className="text-gray-600 mt-1">{wtn.wtn_number}</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
          </div>

          {/* ── Printable document ── */}
          <div className="border-2 border-gray-300 rounded-lg p-6 bg-white" id="wtn-print-area">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-[#F59E0B]">MediWaste</h3>
                <p className="text-sm text-gray-600">Medical Waste Management Solutions</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">WTN Number</p>
                <p className="text-lg font-bold text-gray-900">{wtn.wtn_number}</p>
                <p className="text-sm text-gray-600 mt-1">Issue Date: {new Date(wtn.issue_date).toLocaleDateString('en-GB')}</p>
              </div>
            </div>

            {/* Carrier details */}
            <div className="border-t border-b border-gray-300 py-4 mb-4">
              <h4 className="font-bold text-gray-900 mb-3">Waste Carrier Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold">Company Name:</p>
                  <p>SUEZ</p>
                </div>
                <div>
                  <p className="font-semibold">Registration Number:</p>
                  <p>CBDU542939</p>
                </div>
                <div className="col-span-2">
                  <p className="font-semibold">Address:</p>
                  <p>SUEZ House, Grenfell Road, Maidenhead, Berkshire, SL6 1ES</p>
                </div>
                <div>
                  <p className="font-semibold">Registration Type:</p>
                  <p>Upper tier waste carrier, broker and dealer</p>
                </div>
                <div>
                  <p className="font-semibold">Registration Valid Until:</p>
                  <p>9 July 2027</p>
                </div>
              </div>
            </div>

            {/* Addresses */}
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <h4 className="font-bold text-gray-900 mb-3">Collection Address</h4>
                <div className="text-sm">
                  <p className="font-semibold">{wtn.customer.company_name || wtn.customer.contact_name}</p>
                  <p className="text-gray-600">Customer: {wtn.customer.customer_number}</p>
                  {customerAddress && (
                    <div className="mt-2">
                      <p>{customerAddress.address_line1}</p>
                      {customerAddress.address_line2 && <p>{customerAddress.address_line2}</p>}
                      <p>{customerAddress.city}, {customerAddress.postcode}</p>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-3">Processing Site</h4>
                <div className="text-sm">
                  <p className="text-gray-600 italic">To be determined by SUEZ</p>
                </div>
              </div>
            </div>

            {/* Waste line items table */}
            <div className="border-t border-gray-300 pt-4 mb-4">
              <h4 className="font-bold text-gray-900 mb-3">Waste Details</h4>
              {lineItems.length > 0 ? (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Waste Type</th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Waste Code</th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Description</th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Container</th>
                      <th className="border border-gray-300 px-3 py-2 text-right font-semibold">Qty</th>
                      <th className="border border-gray-300 px-3 py-2 text-right font-semibold">Containers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-300 px-3 py-2 capitalize">{item.waste_type?.replace(/_/g, ' ')}</td>
                        <td className="border border-gray-300 px-3 py-2 font-mono text-xs">{item.waste_code || '—'}</td>
                        <td className="border border-gray-300 px-3 py-2">{item.waste_description}</td>
                        <td className="border border-gray-300 px-3 py-2 capitalize">{item.container_type?.replace(/_/g, ' ')}</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">{item.quantity} {item.quantity_unit}</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">{item.container_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-gray-500">No waste items recorded.</p>
              )}
            </div>

            {/* Job reference */}
            {wtn.job && (
              <div className="mb-4 text-sm">
                <span className="font-semibold">Job Reference: </span>
                <span>{wtn.job.job_number}</span>
              </div>
            )}

            {/* Signatures */}
            <div className="border-t border-gray-300 pt-4">
              <h4 className="font-bold text-gray-900 mb-3">Signatures</h4>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-semibold mb-2">Carrier (SUEZ):</p>
                  <div className="border border-gray-300 rounded p-3 bg-gray-50 min-h-[48px]">
                    <p className="text-sm">{wtn.carrier_signature || 'SUEZ'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2">Customer:</p>
                  <div className="border border-gray-300 rounded p-3 bg-gray-50 min-h-[48px]">
                    <p className="text-sm">{wtn.customer_signature || 'Not signed'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 text-xs text-gray-500 border-t border-gray-300 pt-4">
              <p>This Waste Transfer Note is issued in accordance with the Waste (England and Wales) Regulations 2011.</p>
              <p className="mt-1">This document must be retained for a minimum of 2 years.</p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              Close
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] transition-colors"
            >
              <Download className="w-4 h-4" />
              Print / Save PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
