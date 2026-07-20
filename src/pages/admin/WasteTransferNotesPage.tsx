import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Plus, Download, Eye, X, Pencil, Camera, CheckSquare, Square, Image as ImageIcon } from 'lucide-react';
import { useToastContext } from '../../contexts/ToastContext';
import AdminLayout from '../../components/admin/AdminLayout';
import PhotoUploadModal from '../../components/PhotoUploadModal';

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

interface JobPhoto {
  id: string;
  photo_url: string;
  caption: string | null;
}

interface WtnPhoto {
  id: string;
  photo_id: string;
  job_photo: JobPhoto;
}

interface WasteCarrier {
  id: string;
  name: string;
  address: string;
  registration_number: string | null;
  registration_type: string;
  registration_valid_until: string | null;
}

interface WtnCustomer {
  id: string;
  customer_number: string;
  company_name: string;
  contact_name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  collection_address?: string;
  postcode?: string;
}

interface WasteTransferNote {
  id: string;
  wtn_number: string;
  job: { id?: string; job_number: string; service_type: string; } | null;
  customer: WtnCustomer;
  carrier: WasteCarrier | null;
  issue_date: string;
  collection_date: string | null;
  carrier_signature: string | null;
  customer_signature: string | null;
  mw_wtn_line_items?: WtnLineItem[];
  mw_wtn_photos?: WtnPhoto[];
  // legacy single-stream fields
  waste_description?: string;
  waste_type?: string;
  quantity?: number;
  quantity_unit?: string;
  container_type?: string;
  container_count?: number;
}

// EA / EWC waste codes for healthcare waste
const WASTE_CODES: Record<string, string> = {
  offensive_waste: '18 01 04',
  hazardous_infectious_waste: '18 01 03*',
  hazardous_non_infectious_waste: '18 01 06*',
  sharps: '18 01 01',
  pharmaceutical: '18 01 09',
  cytotoxic: '18 01 08*',
  dental: '18 01 03*',
  anatomical: '18 01 02',
  general: '18 01 04',
  clinical_waste: '18 01 03*',
  general_medical: '18 01 04',
};

const WASTE_TYPE_LABELS: Record<string, string> = {
  offensive_waste: 'Offensive Waste',
  hazardous_infectious_waste: 'Hazardous Infectious Waste',
  hazardous_non_infectious_waste: 'Hazardous Non-Infectious Waste',
  sharps: 'Sharps',
  pharmaceutical: 'Pharmaceutical',
  cytotoxic: 'Cytotoxic',
  dental: 'Dental',
  anatomical: 'Anatomical',
  general: 'General',
  clinical_waste: 'Clinical Waste',
  general_medical: 'General Medical',
};

const WASTE_TYPES = ['offensive_waste', 'hazardous_infectious_waste', 'hazardous_non_infectious_waste', 'sharps', 'pharmaceutical', 'cytotoxic', 'dental', 'anatomical', 'general'];
const CONTAINER_TYPES = ['sharps_bin', 'bag', 'drum', 'box', 'container'];
const QUANTITY_UNITS = ['kg', 'litres', 'units', 'bags'];

const CONTAINER_TYPE_LABELS: Record<string, string> = {
  sharps_bin: 'Sharps Bin',
  bag: 'Bag',
  drum: 'Drum',
  box: 'Box',
  container: 'Container',
  yellow_bag: 'Yellow Bag',
  rigid_container: 'Rigid Container',
  tiger_stripe_bag: 'Tiger Stripe Bag',
  purple_bag: 'Purple Bag',
};

const emptyLineItem = (): WtnLineItem => ({
  waste_type: 'hazardous_infectious_waste',
  waste_code: WASTE_CODES['hazardous_infectious_waste'],
  waste_description: '',
  quantity: '',
  quantity_unit: 'kg',
  container_type: 'sharps_bin',
  container_count: '1',
});

const todayStr = () => new Date().toISOString().split('T')[0];

const emptyCreateForm = {
  customer_id: '', job_id: '', carrier_id: '',
  collection_date: todayStr(),
};

const CUSTOMER_SELECT = 'id,customer_number,company_name,contact_name,email,phone,mobile,collection_address,postcode';

export default function WasteTransferNotesPage() {
  const { toast } = useToastContext();
  const location = useLocation();
  const [wtns, setWtns] = useState<WasteTransferNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedWtn, setSelectedWtn] = useState<WasteTransferNote | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWtn, setEditingWtn] = useState<WasteTransferNote | null>(null);
  const [createForm, setCreateForm] = useState({ ...emptyCreateForm });
  const [lineItems, setLineItems] = useState<WtnLineItem[]>([emptyLineItem()]);
  const [createLoading, setCreateLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [carriers, setCarriers] = useState<WasteCarrier[]>([]);
  const [jobItemsLoading, setJobItemsLoading] = useState(false);
  // Photo state
  const [jobPhotos, setJobPhotos] = useState<JobPhoto[]>([]);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);

  useEffect(() => { fetchWTNs(); }, []);

  useEffect(() => {
    const prefill = (location.state as any)?.prefill;
    if (!prefill) return;
    (async () => {
      const [custRes, jobRes, carrierRes] = await Promise.all([
        supabase.from('mw_customers').select(CUSTOMER_SELECT).eq('status', 'active').order('company_name'),
        supabase.from('mw_service_jobs').select('id,job_number,service_type').in('status', ['completed', 'scheduled']).order('scheduled_date', { ascending: false }).limit(50),
        supabase.from('mw_waste_carriers').select('id,name,address,registration_number,registration_type,registration_valid_until').eq('is_active', true).order('name'),
      ]);
      setCustomers(custRes.data || []);
      setJobs(jobRes.data || []);
      setCarriers(carrierRes.data || []);
      const newForm = { ...emptyCreateForm, customer_id: prefill.customer_id || '', job_id: prefill.job_id || '' };
      setCreateForm(newForm);
      if (prefill.job_id) {
        const [items, photos] = await Promise.all([
          fetchJobItems(prefill.job_id),
          fetchJobPhotos(prefill.job_id),
        ]);
        setLineItems(items.length > 0 ? items : [emptyLineItem()]);
        setJobPhotos(photos);
        setSelectedPhotoIds(new Set(photos.map(p => p.id)));
      } else {
        setLineItems([emptyLineItem()]);
        setJobPhotos([]);
        setSelectedPhotoIds(new Set());
      }
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
          job:mw_service_jobs(id, job_number, service_type),
          customer:mw_customers!inner(${CUSTOMER_SELECT}),
          carrier:mw_waste_carriers(id, name, address, registration_number, registration_type, registration_valid_until),
          mw_wtn_line_items(*),
          mw_wtn_photos(id, photo_id, job_photo:mw_job_photos(id, photo_url, caption))
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

  async function fetchJobItems(jobId: string): Promise<WtnLineItem[]> {
    const { data } = await supabase
      .from('mw_job_waste_items')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at');
    if (!data || data.length === 0) return [];
    return data.map(i => ({
      waste_type: i.waste_type || 'hazardous_infectious_waste',
      waste_code: WASTE_CODES[i.waste_type] || '',
      waste_description: i.description || '',
      quantity: String(i.quantity || ''),
      quantity_unit: i.quantity_unit || 'kg',
      container_type: i.container_type || 'sharps_bin',
      container_count: String(i.container_count || 1),
    }));
  }

  async function fetchJobPhotos(jobId: string): Promise<JobPhoto[]> {
    const { data } = await supabase
      .from('mw_job_photos')
      .select('id, photo_url, caption')
      .eq('job_id', jobId)
      .order('uploaded_at', { ascending: true });
    return (data || []) as JobPhoto[];
  }

  const openCreateModal = async () => {
    const [custRes, jobRes, carrierRes] = await Promise.all([
      supabase.from('mw_customers').select(CUSTOMER_SELECT).eq('status', 'active').order('company_name'),
      supabase.from('mw_service_jobs').select('id,job_number,service_type').in('status', ['completed', 'scheduled']).order('scheduled_date', { ascending: false }).limit(50),
      supabase.from('mw_waste_carriers').select('id,name,address,registration_number,registration_type,registration_valid_until').eq('is_active', true).order('name'),
    ]);
    setCustomers(custRes.data || []);
    setJobs(jobRes.data || []);
    setCarriers(carrierRes.data || []);
    setEditingWtn(null);
    setCreateForm({ ...emptyCreateForm });
    setLineItems([emptyLineItem()]);
    setJobPhotos([]);
    setSelectedPhotoIds(new Set());
    setShowCreateModal(true);
  };

  const openEditModal = async (wtn: WasteTransferNote) => {
    const [custRes, jobRes, carrierRes] = await Promise.all([
      supabase.from('mw_customers').select(CUSTOMER_SELECT).eq('status', 'active').order('company_name'),
      supabase.from('mw_service_jobs').select('id,job_number,service_type').in('status', ['completed', 'scheduled']).order('scheduled_date', { ascending: false }).limit(50),
      supabase.from('mw_waste_carriers').select('id,name,address,registration_number,registration_type,registration_valid_until').eq('is_active', true).order('name'),
    ]);
    setCustomers(custRes.data || []);
    setJobs(jobRes.data || []);
    setCarriers(carrierRes.data || []);
    setEditingWtn(wtn);

    let jobId = wtn.job?.id || '';
    if (!jobId && wtn.job) {
      const found = (jobRes.data || []).find((j: any) => j.job_number === wtn.job?.job_number);
      if (found) jobId = found.id;
    }

    setCreateForm({
      customer_id: wtn.customer.id,
      job_id: jobId,
      carrier_id: wtn.carrier?.id || '',
      collection_date: wtn.collection_date || todayStr(),
    });

    const existing = (wtn.mw_wtn_line_items && wtn.mw_wtn_line_items.length > 0)
      ? wtn.mw_wtn_line_items.map(i => ({
          id: i.id,
          waste_type: i.waste_type,
          waste_code: i.waste_code || WASTE_CODES[i.waste_type] || '',
          waste_description: i.waste_description,
          quantity: String(i.quantity),
          quantity_unit: i.quantity_unit,
          container_type: i.container_type,
          container_count: String(i.container_count),
        }))
      : [emptyLineItem()];
    setLineItems(existing);

    // Load job photos if a job is linked
    if (jobId) {
      const photos = await fetchJobPhotos(jobId);
      setJobPhotos(photos);
      // Auto-select all job photos (including any newly uploaded since WTN was created)
      setSelectedPhotoIds(new Set(photos.map(p => p.id)));
    } else {
      setJobPhotos([]);
      // Keep only the already-attached photos if no job is linked
      const attachedIds = new Set((wtn.mw_wtn_photos || []).map(p => p.photo_id));
      setSelectedPhotoIds(attachedIds);
    }

    setShowCreateModal(true);
  };

  const handleJobChange = async (jobId: string) => {
    setCreateForm(f => ({ ...f, job_id: jobId }));
    setJobPhotos([]);
    setSelectedPhotoIds(new Set());
    if (!jobId) return;

    setJobItemsLoading(true);
    const [items, photos] = await Promise.all([
      fetchJobItems(jobId),
      fetchJobPhotos(jobId),
    ]);
    setJobItemsLoading(false);

    if (items.length > 0) {
      setLineItems(items);
      toast.success(`Populated ${items.length} waste item${items.length !== 1 ? 's' : ''} from job`);
    }
    setJobPhotos(photos);
    setSelectedPhotoIds(new Set(photos.map(p => p.id)));
  };

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotoIds(prev => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  };

  const saveWtnPhotos = async (wtnId: string) => {
    if (selectedPhotoIds.size === 0) return;
    const rows = Array.from(selectedPhotoIds).map((photoId, idx) => ({
      wtn_id: wtnId,
      photo_id: photoId,
      sort_order: idx,
    }));
    await supabase.from('mw_wtn_photos').insert(rows);
  };

  const handleCreateWTN = async () => {
    const validItems = lineItems.filter(i => i.waste_description && i.quantity);
    if (!createForm.customer_id || validItems.length === 0) {
      toast.error('Please select a customer and add at least one waste item with description and quantity');
      return;
    }
    setCreateLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const wtnNumber = `WTN${today}-${Date.now().toString().slice(-4)}`;
      const selectedCarrier = carriers.find(c => c.id === createForm.carrier_id);
      const { data: wtn, error: wtnErr } = await supabase.from('mw_waste_transfer_notes').insert([{
        wtn_number: wtnNumber,
        customer_id: createForm.customer_id,
        job_id: createForm.job_id || null,
        carrier_id: createForm.carrier_id || null,
        issue_date: new Date().toISOString().split('T')[0],
        collection_date: createForm.collection_date || null,
        carrier_signature: selectedCarrier?.name || null,
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

      await saveWtnPhotos(wtn.id);

      toast.success(`WTN ${wtnNumber} created successfully`);
      setShowCreateModal(false);
      fetchWTNs();
    } catch {
      toast.error('Failed to create WTN');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdateWTN = async () => {
    if (!editingWtn) return;
    const validItems = lineItems.filter(i => i.waste_description && i.quantity);
    if (!createForm.customer_id || validItems.length === 0) {
      toast.error('Please select a customer and add at least one waste item with description and quantity');
      return;
    }
    setCreateLoading(true);
    try {
      const selectedCarrier = carriers.find(c => c.id === createForm.carrier_id);
      const { error: wtnErr } = await supabase.from('mw_waste_transfer_notes').update({
        customer_id: createForm.customer_id,
        job_id: createForm.job_id || null,
        carrier_id: createForm.carrier_id || null,
        collection_date: createForm.collection_date || null,
        carrier_signature: selectedCarrier?.name || null,
      }).eq('id', editingWtn.id);
      if (wtnErr) throw wtnErr;

      await supabase.from('mw_wtn_line_items').delete().eq('wtn_id', editingWtn.id);
      const { error: itemsErr } = await supabase.from('mw_wtn_line_items').insert(
        validItems.map((item, idx) => ({
          wtn_id: editingWtn.id,
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

      // Replace photo attachments
      await supabase.from('mw_wtn_photos').delete().eq('wtn_id', editingWtn.id);
      await saveWtnPhotos(editingWtn.id);

      toast.success('WTN updated successfully');
      setShowCreateModal(false);
      setEditingWtn(null);
      fetchWTNs();
    } catch {
      toast.error('Failed to update WTN');
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

  function wtnSummary(wtn: WasteTransferNote) {
    if (wtn.mw_wtn_line_items && wtn.mw_wtn_line_items.length > 0) {
      return wtn.mw_wtn_line_items.map(i => WASTE_TYPE_LABELS[i.waste_type] || i.waste_type?.replace(/_/g, ' ')).join(', ');
    }
    return wtn.waste_type?.replace(/_/g, ' ') || '—';
  }

  function wtnQtySummary(wtn: WasteTransferNote) {
    if (wtn.mw_wtn_line_items && wtn.mw_wtn_line_items.length > 0) {
      return `${wtn.mw_wtn_line_items.length} item${wtn.mw_wtn_line_items.length !== 1 ? 's' : ''}`;
    }
    return wtn.quantity ? `${wtn.quantity} ${wtn.quantity_unit || ''}` : '—';
  }

  // The linked job id for photo upload in create/edit modal
  const currentJobId = createForm.job_id;
  const currentJobNumber = jobs.find(j => j.id === currentJobId)?.job_number || '';

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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Carrier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Waste Type(s)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Photos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collection Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {wtns.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">No waste transfer notes found</td>
                  </tr>
                ) : wtns.map((wtn) => (
                  <tr key={wtn.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{wtn.wtn_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{wtn.job?.job_number || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{wtn.customer.company_name || wtn.customer.contact_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{wtn.carrier?.name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{wtnSummary(wtn)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{wtnQtySummary(wtn)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {(wtn.mw_wtn_photos?.length ?? 0) > 0 ? (
                        <span className="flex items-center gap-1 text-purple-600">
                          <ImageIcon className="w-3.5 h-3.5" />
                          {wtn.mw_wtn_photos!.length}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {wtn.collection_date ? new Date(wtn.collection_date).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setSelectedWtn(wtn); setShowModal(true); }} className="text-blue-600 hover:text-blue-900" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEditModal(wtn)} className="text-orange-500 hover:text-orange-700" title="Edit">
                          <Pencil className="w-4 h-4" />
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

      {showModal && selectedWtn && (
        <WTNViewModal wtn={selectedWtn} onClose={() => { setShowModal(false); setSelectedWtn(null); }} />
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">
                {editingWtn ? `Edit WTN — ${editingWtn.wtn_number}` : 'Create Waste Transfer Note'}
              </h3>
              <button onClick={() => { setShowCreateModal(false); setEditingWtn(null); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Collection Date</label>
                <input
                  type="date"
                  value={createForm.collection_date}
                  onChange={e => setCreateForm({ ...createForm, collection_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linked Job (optional)</label>
                <select
                  value={createForm.job_id}
                  onChange={e => handleJobChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                >
                  <option value="">No linked job</option>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.job_number} — {j.service_type?.replace(/_/g, ' ')}</option>)}
                </select>
                {jobItemsLoading && <p className="text-xs text-orange-600 mt-1">Loading job items...</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Waste Carrier</label>
                <select
                  value={createForm.carrier_id}
                  onChange={e => setCreateForm({ ...createForm, carrier_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                >
                  <option value="">Select carrier...</option>
                  {carriers.map(c => <option key={c.id} value={c.id}>{c.name}{c.registration_number ? ` (${c.registration_number})` : ''}</option>)}
                </select>
                {carriers.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    No carriers configured — <a href="/admin/waste-carriers" className="text-orange-600 hover:underline">add one in Waste Carriers</a>.
                  </p>
                )}
              </div>

              {/* Line Items */}
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
                            {WASTE_TYPES.map(t => <option key={t} value={t}>{WASTE_TYPE_LABELS[t] || t.replace(/_/g, ' ')}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">EWC Code</label>
                          <input
                            type="text"
                            value={item.waste_code}
                            onChange={e => updateLineItem(idx, 'waste_code', e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-orange-50"
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
                            {CONTAINER_TYPES.map(t => <option key={t} value={t}>{CONTAINER_TYPE_LABELS[t] || t.replace(/_/g, ' ')}</option>)}
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

              {/* Collection Photos */}
              {createForm.job_id && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-1.5">
                      <Camera size={14} className="text-purple-500" />
                      Collection Photos
                      {jobPhotos.length > 0 && (
                        <span className="text-xs text-gray-500 font-normal">({selectedPhotoIds.size} of {jobPhotos.length} selected)</span>
                      )}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPhotoUpload(true)}
                      className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium"
                    >
                      <Plus size={13} /> Upload Photos
                    </button>
                  </div>

                  {jobPhotos.length === 0 ? (
                    <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <Camera className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">No photos uploaded for this job yet.</p>
                      <button
                        type="button"
                        onClick={() => setShowPhotoUpload(true)}
                        className="mt-2 text-xs text-purple-600 hover:text-purple-700 font-medium underline"
                      >
                        Upload photos now
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {jobPhotos.map(photo => {
                        const selected = selectedPhotoIds.has(photo.id);
                        return (
                          <button
                            key={photo.id}
                            type="button"
                            onClick={() => togglePhotoSelection(photo.id)}
                            className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                              selected ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200 hover:border-gray-400'
                            }`}
                          >
                            <img
                              src={photo.photo_url}
                              alt={photo.caption || 'Collection photo'}
                              className="w-full h-24 object-cover"
                            />
                            <div className={`absolute top-1.5 right-1.5 rounded-full p-0.5 ${selected ? 'text-purple-600 bg-white' : 'text-gray-400 bg-white bg-opacity-80'}`}>
                              {selected ? <CheckSquare size={16} /> : <Square size={16} />}
                            </div>
                            {photo.caption && (
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs px-1.5 py-0.5 truncate">
                                {photo.caption}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => { setShowCreateModal(false); setEditingWtn(null); }} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button
                onClick={editingWtn ? handleUpdateWTN : handleCreateWTN}
                disabled={createLoading || !createForm.customer_id || !lineItems.some(i => i.waste_description && i.quantity)}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50"
              >
                {createLoading ? (editingWtn ? 'Saving...' : 'Creating...') : (editingWtn ? 'Save Changes' : 'Create WTN')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPhotoUpload && currentJobId && (
        <PhotoUploadModal
          jobId={currentJobId}
          jobNumber={currentJobNumber}
          onClose={() => setShowPhotoUpload(false)}
          onPhotoAdded={async () => {
            const photos = await fetchJobPhotos(currentJobId);
            setJobPhotos(photos);
            setSelectedPhotoIds(prev => {
              const next = new Set(prev);
              photos.forEach(p => next.add(p.id));
              return next;
            });
          }}
        />
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
  const [savingPdf, setSavingPdf] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState('/mediwaste-logo.png');

  useEffect(() => {
    fetchCustomerAddress();
    fetch('/mediwaste-logo.png')
      .then(r => r.blob())
      .then(b => new Promise<string>(res => { const fr = new FileReader(); fr.onloadend = () => res(fr.result as string); fr.readAsDataURL(b); }))
      .then(url => setLogoDataUrl(url))
      .catch(() => {});
  }, []);

  const fetchCustomerAddress = async () => {
    const { data } = await supabase
      .from('mw_customer_addresses')
      .select('*')
      .eq('customer_id', wtn.customer.id)
      .eq('is_primary', true)
      .maybeSingle();
    if (data) setCustomerAddress(data);
  };

  const handleSavePDF = async () => {
    const element = document.getElementById('wtn-print-area');
    if (!element) return;
    setSavingPdf(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = '900px';
      document.body.appendChild(clone);
      const images = clone.querySelectorAll('img');
      await Promise.all(Array.from(images).map(img => new Promise<void>(res => { if (img.complete) res(); else { img.onload = () => res(); img.onerror = () => res(); } })));
      await new Promise(r => setTimeout(r, 300));
      const canvas = await html2canvas(clone, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', logging: false });
      document.body.removeChild(clone);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgAspect = canvas.height / canvas.width;
      const imgH = pageW * imgAspect;

      if (imgH <= pageH) {
        const y = (pageH - imgH) / 2;
        pdf.addImage(imgData, 'PNG', 0, y, pageW, imgH);
      } else {
        // Multi-page: slice image across pages
        let renderedH = 0;
        let page = 0;
        while (renderedH < imgH) {
          if (page > 0) pdf.addPage();
          const sliceY = renderedH / imgH * canvas.height;
          const sliceH = Math.min(pageH / imgH * canvas.height, canvas.height - sliceY);
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceH;
          sliceCanvas.getContext('2d')!.drawImage(canvas, 0, sliceY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
          pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, (sliceH / canvas.width) * pageW);
          renderedH += pageH;
          page++;
        }
      }
      pdf.save(`WTN-${wtn.wtn_number}.pdf`);
    } finally {
      setSavingPdf(false);
    }
  };

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
            container_type: wtn.container_type || 'sharps_bin',
            container_count: String(wtn.container_count || 1),
          }]
        : [];

  const carrier = wtn.carrier;
  const wtnPhotos = (wtn.mw_wtn_photos || []).filter(p => p.job_photo?.photo_url);

  const registrationTypeLabel = (t: string) => {
    if (t === 'upper_tier') return 'Upper tier waste carrier, broker and dealer';
    if (t === 'lower_tier') return 'Lower tier waste carrier';
    return t;
  };

  const collectionAddressLines: string[] = [];
  if (customerAddress) {
    if (customerAddress.address_line1) collectionAddressLines.push(customerAddress.address_line1);
    if (customerAddress.address_line2) collectionAddressLines.push(customerAddress.address_line2);
    const cityPost = [customerAddress.city, customerAddress.postcode].filter(Boolean).join(', ');
    if (cityPost) collectionAddressLines.push(cityPost);
  } else if (wtn.customer.collection_address) {
    collectionAddressLines.push(wtn.customer.collection_address);
    if (wtn.customer.postcode) collectionAddressLines.push(wtn.customer.postcode);
  }

  const customerPhone = wtn.customer.phone || wtn.customer.mobile || null;

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

          <div className="border-2 border-gray-300 rounded-lg p-6 bg-white" id="wtn-print-area">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <img src={logoDataUrl} alt="MediWaste" style={{ height: '60px', width: 'auto', objectFit: 'contain' }} />
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-500">WASTE TRANSFER NOTE</p>
                <p className="text-lg font-bold text-gray-900">{wtn.wtn_number}</p>
                <div className="mt-1 text-sm text-gray-600 space-y-0.5">
                  <p><span className="font-medium">Issue Date:</span> {new Date(wtn.issue_date).toLocaleDateString('en-GB')}</p>
                  {wtn.collection_date && (
                    <p><span className="font-medium">Collection Date:</span> <span className="font-semibold text-gray-800">{new Date(wtn.collection_date).toLocaleDateString('en-GB')}</span></p>
                  )}
                  {wtn.job && (
                    <p><span className="font-medium">Job Ref:</span> {wtn.job.job_number}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Carrier details */}
            <div className="border-t border-b border-gray-300 py-4 mb-4">
              <h4 className="font-bold text-gray-900 mb-3">Waste Carrier Details</h4>
              {carrier ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-gray-600">Company Name:</p>
                    <p className="text-gray-900">{carrier.name}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-600">Registration Number:</p>
                    <p className="text-gray-900 font-mono">{carrier.registration_number || '—'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="font-semibold text-gray-600">Address:</p>
                    <p className="text-gray-900">{carrier.address}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-600">Registration Type:</p>
                    <p className="text-gray-900">{registrationTypeLabel(carrier.registration_type)}</p>
                  </div>
                  {carrier.registration_valid_until && (
                    <div>
                      <p className="font-semibold text-gray-600">Registration Valid Until:</p>
                      <p className="text-gray-900">{new Date(carrier.registration_valid_until).toLocaleDateString('en-GB')}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No carrier linked to this WTN.</p>
              )}
            </div>

            {/* Addresses */}
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <h4 className="font-bold text-gray-900 mb-3">Collection Address / Producer</h4>
                <div className="text-sm space-y-0.5">
                  <p className="font-semibold text-gray-900">{wtn.customer.company_name || wtn.customer.contact_name}</p>
                  <p className="text-gray-600">Customer No: {wtn.customer.customer_number}</p>
                  {wtn.customer.contact_name && wtn.customer.company_name && (
                    <p className="text-gray-700">Contact: {wtn.customer.contact_name}</p>
                  )}
                  {wtn.customer.email && (
                    <p className="text-gray-600">{wtn.customer.email}</p>
                  )}
                  {customerPhone && (
                    <p className="text-gray-600">{customerPhone}</p>
                  )}
                  {collectionAddressLines.length > 0 && (
                    <div className="mt-1 pt-1 border-t border-gray-100">
                      {collectionAddressLines.map((line, i) => (
                        <p key={i} className="text-gray-700">{line}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-3">Processing / Consignee Site</h4>
                <div className="text-sm">
                  {carrier ? (
                    <>
                      <p className="font-semibold text-gray-900">{carrier.name}</p>
                      <p className="text-gray-700 mt-1">{carrier.address}</p>
                    </>
                  ) : (
                    <p className="text-gray-500 italic">No carrier linked</p>
                  )}
                </div>
              </div>
            </div>

            {/* Waste line items table */}
            <div className="border-t border-gray-300 pt-4 mb-4">
              <h4 className="font-bold text-gray-900 mb-3">Waste Details</h4>
              {lineItems.length > 0 ? (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Waste Type</th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">EWC Code</th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Description</th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Container</th>
                      <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700">No.</th>
                      <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-300 px-3 py-2">
                          {WASTE_TYPE_LABELS[item.waste_type] || item.waste_type?.replace(/_/g, ' ')}
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <span className="font-mono font-semibold text-gray-800 bg-yellow-50 px-1.5 py-0.5 rounded text-xs">
                            {item.waste_code || WASTE_CODES[item.waste_type] || '—'}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-gray-700">{item.waste_description}</td>
                        <td className="border border-gray-300 px-3 py-2 text-gray-600">
                          {CONTAINER_TYPE_LABELS[item.container_type] || item.container_type?.replace(/_/g, ' ')}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-center text-gray-700">{item.container_count}</td>
                        <td className="border border-gray-300 px-3 py-2 text-right text-gray-700">
                          {item.quantity} {item.quantity_unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-gray-500">No waste items recorded.</p>
              )}
            </div>

            {/* Signatures */}
            <div className="border-t border-gray-300 pt-4">
              <h4 className="font-bold text-gray-900 mb-3">Signatures</h4>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-semibold mb-1 text-gray-700">Carrier / Transporter:</p>
                  <p className="text-xs text-gray-500 mb-2">{carrier?.name || '—'}</p>
                  <div className="border border-gray-300 rounded p-3 bg-gray-50 min-h-[48px]">
                    <p className="text-sm">{wtn.carrier_signature || carrier?.name || 'Not signed'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1 text-gray-700">Producer / Consignor:</p>
                  <p className="text-xs text-gray-500 mb-2">{wtn.customer.company_name || wtn.customer.contact_name}</p>
                  <div className="border border-gray-300 rounded p-3 bg-gray-50 min-h-[48px]">
                    <p className="text-sm">{wtn.customer.company_name || wtn.customer.contact_name}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Collection Photos */}
            {wtnPhotos.length > 0 && (
              <div className="border-t border-gray-300 pt-4 mt-4">
                <h4 className="font-bold text-gray-900 mb-3">Collection Evidence Photos ({wtnPhotos.length})</h4>
                <div className="grid grid-cols-3 gap-3">
                  {wtnPhotos.map((p, i) => (
                    <div key={p.id} className="rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={p.job_photo.photo_url}
                        alt={p.job_photo.caption || `Photo ${i + 1}`}
                        crossOrigin="anonymous"
                        className="w-full h-36 object-cover"
                      />
                      {p.job_photo.caption && (
                        <p className="text-xs text-gray-600 px-2 py-1 bg-gray-50 truncate">{p.job_photo.caption}</p>
                      )}
                      <p className="text-xs text-gray-400 px-2 pb-1 bg-gray-50">Photo {i + 1}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 text-xs text-gray-500 border-t border-gray-300 pt-4">
              <p>This Waste Transfer Note is issued in accordance with the Waste (England and Wales) Regulations 2011 and the Environmental Protection Act 1990 (Duty of Care).</p>
              <p className="mt-1">This document must be retained for a minimum of 2 years. EWC codes are listed in accordance with the European Waste Catalogue.</p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              Close
            </button>
            <button
              onClick={handleSavePDF}
              disabled={savingPdf}
              className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] transition-colors disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              {savingPdf ? 'Saving...' : 'Print / Save PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
