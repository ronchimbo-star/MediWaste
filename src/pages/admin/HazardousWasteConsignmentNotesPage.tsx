import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Plus, Download, Eye, X, Pencil, Camera, CheckSquare, Square, AlertTriangle } from 'lucide-react';
import { useToastContext } from '../../contexts/ToastContext';
import AdminLayout from '../../components/admin/AdminLayout';
import PhotoUploadModal from '../../components/PhotoUploadModal';

interface HwcnLineItem {
  id?: string;
  waste_type: string;
  waste_code: string;
  waste_description: string;
  hazard_codes: string[];
  un_number: string;
  un_class: string;
  un_packing_group: string;
  proper_shipping_name: string;
  physical_form: string;
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

interface HwcnPhoto {
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

interface HwcnCustomer {
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

interface ConsignmentNote {
  id: string;
  hwcn_number: string;
  job: { id?: string; job_number: string; service_type: string; } | null;
  customer: HwcnCustomer;
  carrier: WasteCarrier | null;
  issue_date: string;
  collection_date: string | null;
  consignor_name: string | null;
  consignor_address: string | null;
  consignor_permit_number: string | null;
  consignee_name: string | null;
  consignee_address: string | null;
  consignee_permit_number: string | null;
  consignee_received_date: string | null;
  consignee_received_by: string | null;
  consignee_received_quantity: string | null;
  carrier_name: string | null;
  carrier_registration_number: string | null;
  carrier_signature: string | null;
  carrier_signature_date: string | null;
  producer_name: string | null;
  producer_signature: string | null;
  producer_signature_date: string | null;
  consignee_return_status: string;
  consignee_return_date: string | null;
  status: string;
  notes: string | null;
  mw_hwcn_line_items?: HwcnLineItem[];
  mw_hwcn_photos?: HwcnPhoto[];
}

const WASTE_CODES: Record<string, string> = {
  hazardous_infectious_waste: '18 01 03*',
  hazardous_non_infectious_waste: '18 01 06*',
  sharps: '18 01 01',
  pharmaceutical: '18 01 09',
  cytotoxic: '18 01 08*',
  dental: '18 01 03*',
  anatomical: '18 01 02',
  chemical: '18 01 06*',
  clinical_waste: '18 01 03*',
};

const WASTE_TYPE_LABELS: Record<string, string> = {
  hazardous_infectious_waste: 'Hazardous Infectious Waste',
  hazardous_non_infectious_waste: 'Hazardous Non-Infectious Waste',
  sharps: 'Sharps',
  pharmaceutical: 'Hazardous Pharmaceutical',
  cytotoxic: 'Cytotoxic/Cytostatic Waste',
  dental: 'Dental Waste (Amalgam)',
  anatomical: 'Anatomical Waste',
  chemical: 'Chemical Waste',
  clinical_waste: 'Clinical Waste (Hazardous)',
};

const HAZARD_CODES = [
  'HP3 Flammable',
  'HP4 Irritant',
  'HP5 STOT/Aspiration Toxicity',
  'HP6 Acute Toxicity',
  'HP7 Carcinogenic',
  'HP8 Corrosive',
  'HP9 Infectious',
  'HP10 Toxic for Reproduction',
  'HP11 Mutagenic',
  'HP14 Ecotoxic',
];

const UN_NUMBERS: Record<string, { un: string; class: string; name: string }> = {
  hazardous_infectious_waste: { un: 'UN3291', class: '6.2', name: 'Clinical waste, unspecified, n.o.s.' },
  sharps: { un: 'UN3291', class: '6.2', name: 'Clinical waste, unspecified, n.o.s.' },
  cytotoxic: { un: 'UN3291', class: '6.2', name: 'Clinical waste, unspecified, n.o.s.' },
  pharmaceutical: { un: 'UN1851', class: '6.1', name: 'Medicine, liquid, toxic, n.o.s.' },
  chemical: { un: 'UN1760', class: '8', name: 'Corrosive liquid, n.o.s.' },
  dental: { un: 'UN3291', class: '6.2', name: 'Clinical waste, unspecified, n.o.s.' },
  anatomical: { un: 'UN3291', class: '6.2', name: 'Clinical waste, unspecified, n.o.s.' },
  clinical_waste: { un: 'UN3291', class: '6.2', name: 'Clinical waste, unspecified, n.o.s.' },
  hazardous_non_infectious_waste: { un: 'UN3291', class: '6.2', name: 'Clinical waste, unspecified, n.o.s.' },
};

const PHYSICAL_FORMS = ['Solid', 'Liquid', 'Sludge', 'Powder', 'Mixed'];
const PACKING_GROUPS = ['I', 'II', 'III', 'None'];
const CONTAINER_TYPES = ['rigid_container', 'sharps_bin', 'drum', 'box', 'yellow_bag', 'purple_bag'];
const CONTAINER_LABELS: Record<string, string> = {
  rigid_container: 'Rigid Container',
  sharps_bin: 'Sharps Bin',
  drum: 'Drum',
  box: 'Box',
  yellow_bag: 'Yellow Bag',
  purple_bag: 'Purple Bag',
};
const QUANTITY_UNITS = ['kg', 'litres', 'units', 'bags'];
const WASTE_TYPES = ['hazardous_infectious_waste', 'hazardous_non_infectious_waste', 'sharps', 'pharmaceutical', 'cytotoxic', 'dental', 'anatomical', 'chemical', 'clinical_waste'];

const emptyLineItem = (): HwcnLineItem => {
  const defaultType = 'hazardous_infectious_waste';
  const un = UN_NUMBERS[defaultType];
  return {
    waste_type: defaultType,
    waste_code: WASTE_CODES[defaultType],
    waste_description: '',
    hazard_codes: ['HP9 Infectious'],
    un_number: un?.un || 'UN3291',
    un_class: un?.class || '6.2',
    un_packing_group: 'II',
    proper_shipping_name: un?.name || 'Clinical waste, unspecified, n.o.s.',
    physical_form: 'Solid',
    quantity: '',
    quantity_unit: 'kg',
    container_type: 'rigid_container',
    container_count: '1',
  };
};

const todayStr = () => new Date().toISOString().split('T')[0];

const emptyCreateForm = {
  customer_id: '', job_id: '', carrier_id: '',
  collection_date: todayStr(),
  consignee_name: '', consignee_address: '', consignee_permit_number: '',
  notes: '',
};

const CUSTOMER_SELECT = 'id,customer_number,company_name,contact_name,email,phone,mobile,collection_address,postcode';

export default function HazardousWasteConsignmentNotesPage() {
  const { toast } = useToastContext();
  const location = useLocation();
  const [hwcns, setHwcns] = useState<ConsignmentNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedHwcn, setSelectedHwcn] = useState<ConsignmentNote | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingHwcn, setEditingHwcn] = useState<ConsignmentNote | null>(null);
  const [createForm, setCreateForm] = useState({ ...emptyCreateForm });
  const [lineItems, setLineItems] = useState<HwcnLineItem[]>([emptyLineItem()]);
  const [createLoading, setCreateLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [carriers, setCarriers] = useState<WasteCarrier[]>([]);
  const [jobItemsLoading, setJobItemsLoading] = useState(false);
  const [jobPhotos, setJobPhotos] = useState<JobPhoto[]>([]);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);

  useEffect(() => { fetchHwcns(); }, []);

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

  const fetchHwcns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mw_hw_consignment_notes')
        .select(`
          *,
          job:mw_service_jobs(id, job_number, service_type),
          customer:mw_customers!inner(${CUSTOMER_SELECT}),
          carrier:mw_waste_carriers(id, name, address, registration_number, registration_type, registration_valid_until),
          mw_hwcn_line_items(*),
          mw_hwcn_photos(id, photo_id, job_photo:mw_job_photos(id, photo_url, caption))
        `)
        .order('issue_date', { ascending: false });
      if (error) throw error;
      setHwcns((data || []) as ConsignmentNote[]);
    } catch (error) {
      console.error('Error fetching HWCNs:', error);
    } finally {
      setLoading(false);
    }
  };

  async function fetchJobItems(jobId: string): Promise<HwcnLineItem[]> {
    const { data } = await supabase
      .from('mw_job_waste_items')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at');
    if (!data || data.length === 0) return [];
    return data.map(i => {
      const wt = i.waste_type || 'hazardous_infectious_waste';
      const un = UN_NUMBERS[wt];
      return {
        waste_type: wt,
        waste_code: WASTE_CODES[wt] || '',
        waste_description: i.description || '',
        hazard_codes: ['HP9 Infectious'],
        un_number: un?.un || 'UN3291',
        un_class: un?.class || '6.2',
        un_packing_group: 'II',
        proper_shipping_name: un?.name || 'Clinical waste, unspecified, n.o.s.',
        physical_form: 'Solid',
        quantity: String(i.quantity || ''),
        quantity_unit: i.quantity_unit || 'kg',
        container_type: i.container_type || 'rigid_container',
        container_count: String(i.container_count || 1),
      };
    });
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
    setEditingHwcn(null);
    setCreateForm({ ...emptyCreateForm });
    setLineItems([emptyLineItem()]);
    setJobPhotos([]);
    setSelectedPhotoIds(new Set());
    setShowCreateModal(true);
  };

  const openEditModal = async (hwcn: ConsignmentNote) => {
    const [custRes, jobRes, carrierRes] = await Promise.all([
      supabase.from('mw_customers').select(CUSTOMER_SELECT).eq('status', 'active').order('company_name'),
      supabase.from('mw_service_jobs').select('id,job_number,service_type').in('status', ['completed', 'scheduled']).order('scheduled_date', { ascending: false }).limit(50),
      supabase.from('mw_waste_carriers').select('id,name,address,registration_number,registration_type,registration_valid_until').eq('is_active', true).order('name'),
    ]);
    setCustomers(custRes.data || []);
    setJobs(jobRes.data || []);
    setCarriers(carrierRes.data || []);
    setEditingHwcn(hwcn);

    let jobId = hwcn.job?.id || '';
    if (!jobId && hwcn.job) {
      const found = (jobRes.data || []).find((j: any) => j.job_number === hwcn.job?.job_number);
      if (found) jobId = found.id;
    }

    setCreateForm({
      customer_id: hwcn.customer.id,
      job_id: jobId,
      carrier_id: hwcn.carrier?.id || '',
      collection_date: hwcn.collection_date || todayStr(),
      consignee_name: hwcn.consignee_name || '',
      consignee_address: hwcn.consignee_address || '',
      consignee_permit_number: hwcn.consignee_permit_number || '',
      notes: hwcn.notes || '',
    });

    const existing = (hwcn.mw_hwcn_line_items && hwcn.mw_hwcn_line_items.length > 0)
      ? hwcn.mw_hwcn_line_items.map(i => ({
          id: i.id,
          waste_type: i.waste_type,
          waste_code: i.waste_code || WASTE_CODES[i.waste_type] || '',
          waste_description: i.waste_description,
          hazard_codes: i.hazard_codes || [],
          un_number: i.un_number || '',
          un_class: i.un_class || '',
          un_packing_group: i.un_packing_group || 'II',
          proper_shipping_name: i.proper_shipping_name || '',
          physical_form: i.physical_form || 'Solid',
          quantity: String(i.quantity),
          quantity_unit: i.quantity_unit,
          container_type: i.container_type,
          container_count: String(i.container_count),
        }))
      : [emptyLineItem()];
    setLineItems(existing);

    if (jobId) {
      const photos = await fetchJobPhotos(jobId);
      setJobPhotos(photos);
      setSelectedPhotoIds(new Set(photos.map(p => p.id)));
    } else {
      setJobPhotos([]);
      const attachedIds = new Set((hwcn.mw_hwcn_photos || []).map(p => p.photo_id));
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
    const [items, photos] = await Promise.all([fetchJobItems(jobId), fetchJobPhotos(jobId)]);
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

  const saveHwcnPhotos = async (hwcnId: string) => {
    if (selectedPhotoIds.size === 0) return;
    const rows = Array.from(selectedPhotoIds).map((photoId, idx) => ({
      hwcn_id: hwcnId, photo_id: photoId, sort_order: idx,
    }));
    await supabase.from('mw_hwcn_photos').insert(rows);
  };

  const handleCreate = async () => {
    const validItems = lineItems.filter(i => i.waste_description && i.quantity);
    if (!createForm.customer_id || validItems.length === 0) {
      toast.error('Please select a customer and add at least one waste item with description and quantity');
      return;
    }
    setCreateLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const hwcnNumber = `HWCN${today}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const selectedCarrier = carriers.find(c => c.id === createForm.carrier_id);
      const { data: hwcn, error: hwcnErr } = await supabase.from('mw_hw_consignment_notes').insert([{
        hwcn_number: hwcnNumber,
        customer_id: createForm.customer_id,
        job_id: createForm.job_id || null,
        carrier_id: createForm.carrier_id || null,
        issue_date: new Date().toISOString().split('T')[0],
        collection_date: createForm.collection_date || null,
        carrier_name: selectedCarrier?.name || null,
        carrier_registration_number: selectedCarrier?.registration_number || null,
        carrier_signature: selectedCarrier?.name || null,
        carrier_signature_date: new Date().toISOString(),
        consignee_name: createForm.consignee_name || null,
        consignee_address: createForm.consignee_address || null,
        consignee_permit_number: createForm.consignee_permit_number || null,
        notes: createForm.notes || null,
      }]).select('id').single();
      if (hwcnErr || !hwcn) throw hwcnErr || new Error('HWCN insert failed');

      const { error: itemsErr } = await supabase.from('mw_hwcn_line_items').insert(
        validItems.map((item, idx) => ({
          hwcn_id: hwcn.id,
          waste_type: item.waste_type,
          waste_code: item.waste_code || WASTE_CODES[item.waste_type] || '',
          waste_description: item.waste_description,
          hazard_codes: item.hazard_codes,
          un_number: item.un_number,
          un_class: item.un_class,
          un_packing_group: item.un_packing_group,
          proper_shipping_name: item.proper_shipping_name,
          physical_form: item.physical_form,
          quantity: Number(item.quantity),
          quantity_unit: item.quantity_unit,
          container_type: item.container_type,
          container_count: Number(item.container_count) || 1,
          sort_order: idx,
        }))
      );
      if (itemsErr) throw itemsErr;

      await saveHwcnPhotos(hwcn.id);
      toast.success(`HWCN ${hwcnNumber} created successfully`);
      setShowCreateModal(false);
      fetchHwcns();
    } catch (error) {
      console.error('Error creating HWCN:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create HWCN');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingHwcn) return;
    const validItems = lineItems.filter(i => i.waste_description && i.quantity);
    if (!createForm.customer_id || validItems.length === 0) {
      toast.error('Please select a customer and add at least one waste item with description and quantity');
      return;
    }
    setCreateLoading(true);
    try {
      const selectedCarrier = carriers.find(c => c.id === createForm.carrier_id);
      const { error: hwcnErr } = await supabase.from('mw_hw_consignment_notes').update({
        customer_id: createForm.customer_id,
        job_id: createForm.job_id || null,
        carrier_id: createForm.carrier_id || null,
        collection_date: createForm.collection_date || null,
        carrier_name: selectedCarrier?.name || null,
        carrier_registration_number: selectedCarrier?.registration_number || null,
        carrier_signature: selectedCarrier?.name || null,
        consignee_name: createForm.consignee_name || null,
        consignee_address: createForm.consignee_address || null,
        consignee_permit_number: createForm.consignee_permit_number || null,
        notes: createForm.notes || null,
      }).eq('id', editingHwcn.id);
      if (hwcnErr) throw hwcnErr;

      await supabase.from('mw_hwcn_line_items').delete().eq('hwcn_id', editingHwcn.id);
      const { error: itemsErr } = await supabase.from('mw_hwcn_line_items').insert(
        validItems.map((item, idx) => ({
          hwcn_id: editingHwcn.id,
          waste_type: item.waste_type,
          waste_code: item.waste_code || WASTE_CODES[item.waste_type] || '',
          waste_description: item.waste_description,
          hazard_codes: item.hazard_codes,
          un_number: item.un_number,
          un_class: item.un_class,
          un_packing_group: item.un_packing_group,
          proper_shipping_name: item.proper_shipping_name,
          physical_form: item.physical_form,
          quantity: Number(item.quantity),
          quantity_unit: item.quantity_unit,
          container_type: item.container_type,
          container_count: Number(item.container_count) || 1,
          sort_order: idx,
        }))
      );
      if (itemsErr) throw itemsErr;

      await supabase.from('mw_hwcn_photos').delete().eq('hwcn_id', editingHwcn.id);
      await saveHwcnPhotos(editingHwcn.id);

      toast.success('HWCN updated successfully');
      setShowCreateModal(false);
      setEditingHwcn(null);
      fetchHwcns();
    } catch {
      toast.error('Failed to update HWCN');
    } finally {
      setCreateLoading(false);
    }
  };

  const updateLineItem = (idx: number, field: keyof HwcnLineItem, value: string | string[]) => {
    setLineItems(items => items.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value } as HwcnLineItem;
      if (field === 'waste_type') {
        const wt = value as string;
        updated.waste_code = WASTE_CODES[wt] || '';
        const un = UN_NUMBERS[wt];
        if (un) {
          updated.un_number = un.un;
          updated.un_class = un.class;
          updated.proper_shipping_name = un.name;
        }
      }
      return updated;
    }));
  };

  const toggleHazardCode = (idx: number, code: string) => {
    setLineItems(items => items.map((item, i) => {
      if (i !== idx) return item;
      const codes = new Set(item.hazard_codes);
      if (codes.has(code)) codes.delete(code);
      else codes.add(code);
      return { ...item, hazard_codes: Array.from(codes) };
    }));
  };

  function hwcnSummary(hwcn: ConsignmentNote) {
    if (hwcn.mw_hwcn_line_items && hwcn.mw_hwcn_line_items.length > 0) {
      return hwcn.mw_hwcn_line_items.map(i => WASTE_TYPE_LABELS[i.waste_type] || i.waste_type?.replace(/_/g, ' ')).join(', ');
    }
    return '—';
  }

  function hwcnQtySummary(hwcn: ConsignmentNote) {
    if (hwcn.mw_hwcn_line_items && hwcn.mw_hwcn_line_items.length > 0) {
      return `${hwcn.mw_hwcn_line_items.length} item${hwcn.mw_hwcn_line_items.length !== 1 ? 's' : ''}`;
    }
    return '—';
  }

  const currentJobId = createForm.job_id;
  const currentJobNumber = jobs.find(j => j.id === currentJobId)?.job_number || '';

  return (
    <AdminLayout pageTitle="Hazardous Waste Consignment Notes" breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'Hazardous Waste Consignment Notes' }]}>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Hazardous Waste Consignment Notes</h1>
          <p className="text-gray-600 mt-1">Manage hazardous waste consignment documentation (infectious waste, sharps, cytotoxic, pharmaceutical)</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold">HWCN vs WTN — when to use which</p>
            <p className="mt-1">Use a <strong>Hazardous Waste Consignment Note</strong> for infectious clinical waste, sharps, cytotoxic/cytostatic waste, and hazardous pharmaceutical waste. Use a <strong>Waste Transfer Note</strong> for non-hazardous offensive waste (tiger-stripe bags). HWCNs require hazard codes, UN transport details, and a consignee return — and must be retained for 3 years.</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex gap-4 justify-between items-center">
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-gray-600">Total HWCNs</p>
              <p className="text-2xl font-bold text-gray-900">{hwcns.length}</p>
            </div>
            <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
              <Plus className="w-5 h-5" />
              Create HWCN
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="admin-table-wrap">
            <table className="w-full admin-table">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">HWCN #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Carrier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Waste Type(s)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Consignee Return</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collection Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {hwcns.length === 0 ? (
                  <tr><td colSpan={9} className="px-6 py-12 text-center text-gray-500">No hazardous waste consignment notes found</td></tr>
                ) : hwcns.map((hwcn) => (
                  <tr key={hwcn.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{hwcn.hwcn_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{hwcn.job?.job_number || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{hwcn.customer.company_name || hwcn.customer.contact_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{hwcn.carrier?.name || hwcn.carrier_name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{hwcnSummary(hwcn)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{hwcnQtySummary(hwcn)}</td>
                    <td className="px-6 py-4 text-sm">
                      {hwcn.consignee_return_status === 'received' ? (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">Received</span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {hwcn.collection_date ? new Date(hwcn.collection_date).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setSelectedHwcn(hwcn); setShowModal(true); }} className="text-blue-600 hover:text-blue-900" title="View"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => openEditModal(hwcn)} className="text-orange-500 hover:text-orange-700" title="Edit"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => { setSelectedHwcn(hwcn); setShowModal(true); }} className="text-green-600 hover:text-green-900" title="Print / Download"><Download className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {showModal && selectedHwcn && (
        <HwcnViewModal hwcn={selectedHwcn} onClose={() => { setShowModal(false); setSelectedHwcn(null); }} />
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">
                {editingHwcn ? `Edit HWCN — ${editingHwcn.hwcn_number}` : 'Create Hazardous Waste Consignment Note'}
              </h3>
              <button onClick={() => { setShowCreateModal(false); setEditingHwcn(null); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                <select value={createForm.customer_id} onChange={e => setCreateForm({ ...createForm, customer_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent">
                  <option value="">Select customer...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.company_name || c.contact_name} ({c.customer_number})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Collection Date</label>
                <input type="date" value={createForm.collection_date} onChange={e => setCreateForm({ ...createForm, collection_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linked Job (optional)</label>
                <select value={createForm.job_id} onChange={e => handleJobChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent">
                  <option value="">No linked job</option>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.job_number} — {j.service_type?.replace(/_/g, ' ')}</option>)}
                </select>
                {jobItemsLoading && <p className="text-xs text-orange-600 mt-1">Loading job items...</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Waste Carrier</label>
                <select value={createForm.carrier_id} onChange={e => setCreateForm({ ...createForm, carrier_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent">
                  <option value="">Select carrier...</option>
                  {carriers.map(c => <option key={c.id} value={c.id}>{c.name}{c.registration_number ? ` (${c.registration_number})` : ''}</option>)}
                </select>
              </div>

              {/* Consignee (receiving site) */}
              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <p className="text-sm font-semibold text-gray-700 mb-2">Consignee (Receiving Site)</p>
                <div className="space-y-2">
                  <input type="text" value={createForm.consignee_name} onChange={e => setCreateForm({ ...createForm, consignee_name: e.target.value })} placeholder="Receiving site name (e.g. incinerator)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-400 focus:border-transparent" />
                  <input type="text" value={createForm.consignee_address} onChange={e => setCreateForm({ ...createForm, consignee_address: e.target.value })} placeholder="Receiving site address" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-400 focus:border-transparent" />
                  <input type="text" value={createForm.consignee_permit_number} onChange={e => setCreateForm({ ...createForm, consignee_permit_number: e.target.value })} placeholder="Environmental permit number" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-400 focus:border-transparent" />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Hazardous Waste Items *</label>
                  <button type="button" onClick={() => setLineItems([...lineItems, emptyLineItem()])} className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium">
                    <Plus size={13} /> Add Item
                  </button>
                </div>
                <div className="space-y-3">
                  {lineItems.map((item, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-gray-50 relative">
                      {lineItems.length > 1 && (
                        <button type="button" onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))} className="absolute top-2 right-2 text-gray-400 hover:text-red-500"><X size={14} /></button>
                      )}
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Waste Type</label>
                          <select value={item.waste_type} onChange={e => updateLineItem(idx, 'waste_type', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-400">
                            {WASTE_TYPES.map(t => <option key={t} value={t}>{WASTE_TYPE_LABELS[t] || t.replace(/_/g, ' ')}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">EWC Code</label>
                          <input type="text" value={item.waste_code} onChange={e => updateLineItem(idx, 'waste_code', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm font-mono bg-red-50 focus:ring-2 focus:ring-red-400" placeholder="e.g. 18 01 03*" />
                        </div>
                      </div>
                      <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Waste Description *</label>
                        <input type="text" value={item.waste_description} onChange={e => updateLineItem(idx, 'waste_description', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400" placeholder="e.g. Infectious dressings and swabs" />
                      </div>

                      {/* Hazard codes */}
                      <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Hazard Codes</label>
                        <div className="flex flex-wrap gap-1">
                          {HAZARD_CODES.map(code => (
                            <button key={code} type="button" onClick={() => toggleHazardCode(idx, code)}
                              className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                                item.hazard_codes.includes(code)
                                  ? 'bg-red-100 border-red-400 text-red-800 font-medium'
                                  : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                              }`}>
                              {code}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* UN transport details */}
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">UN Number</label>
                          <input type="text" value={item.un_number} onChange={e => updateLineItem(idx, 'un_number', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-red-400" placeholder="UN3291" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">ADR Class</label>
                          <input type="text" value={item.un_class} onChange={e => updateLineItem(idx, 'un_class', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400" placeholder="6.2" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Packing Group</label>
                          <select value={item.un_packing_group} onChange={e => updateLineItem(idx, 'un_packing_group', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-400">
                            {PACKING_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Proper Shipping Name</label>
                        <input type="text" value={item.proper_shipping_name} onChange={e => updateLineItem(idx, 'proper_shipping_name', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400" placeholder="Clinical waste, unspecified, n.o.s." />
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Physical Form</label>
                          <select value={item.physical_form} onChange={e => updateLineItem(idx, 'physical_form', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-400">
                            {PHYSICAL_FORMS.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Container Type</label>
                          <select value={item.container_type} onChange={e => updateLineItem(idx, 'container_type', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-400">
                            {CONTAINER_TYPES.map(t => <option key={t} value={t}>{CONTAINER_LABELS[t] || t.replace(/_/g, ' ')}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Containers</label>
                          <input type="number" min="1" value={item.container_count} onChange={e => updateLineItem(idx, 'container_count', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
                          <input type="number" min="0" step="0.1" value={item.quantity} onChange={e => updateLineItem(idx, 'quantity', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400" placeholder="0" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
                          <select value={item.quantity_unit} onChange={e => updateLineItem(idx, 'quantity_unit', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-400">
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
                      {jobPhotos.length > 0 && <span className="text-xs text-gray-500 font-normal">({selectedPhotoIds.size} of {jobPhotos.length} selected)</span>}
                    </label>
                    <button type="button" onClick={() => setShowPhotoUpload(true)} className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium">
                      <Plus size={13} /> Upload Photos
                    </button>
                  </div>
                  {jobPhotos.length === 0 ? (
                    <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <Camera className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">No photos uploaded for this job yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {jobPhotos.map(photo => {
                        const selected = selectedPhotoIds.has(photo.id);
                        return (
                          <button key={photo.id} type="button" onClick={() => togglePhotoSelection(photo.id)}
                            className={`relative rounded-lg overflow-hidden border-2 transition-all ${selected ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200 hover:border-gray-400'}`}>
                            <img src={photo.photo_url} alt={photo.caption || 'Collection photo'} className="w-full h-24 object-cover" />
                            <div className={`absolute top-1.5 right-1.5 rounded-full p-0.5 ${selected ? 'text-purple-600 bg-white' : 'text-gray-400 bg-white bg-opacity-80'}`}>
                              {selected ? <CheckSquare size={16} /> : <Square size={16} />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => { setShowCreateModal(false); setEditingHwcn(null); }} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={editingHwcn ? handleUpdate : handleCreate}
                disabled={createLoading || !createForm.customer_id || !lineItems.some(i => i.waste_description && i.quantity)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-50">
                {createLoading ? (editingHwcn ? 'Saving...' : 'Creating...') : (editingHwcn ? 'Save Changes' : 'Create HWCN')}
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

interface HwcnViewModalProps {
  hwcn: ConsignmentNote;
  onClose: () => void;
}

function HwcnViewModal({ hwcn, onClose }: HwcnViewModalProps) {
  const [customerAddress, setCustomerAddress] = useState<any>(null);
  const [savingPdf, setSavingPdf] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState('/new-mediwaste-logoV1.svg');

  useEffect(() => {
    fetchCustomerAddress();
    fetch('/new-mediwaste-logoV1.svg')
      .then(r => r.blob())
      .then(b => new Promise<string>(res => { const fr = new FileReader(); fr.onloadend = () => res(fr.result as string); fr.readAsDataURL(b); }))
      .then(url => setLogoDataUrl(url))
      .catch(() => {});
  }, []);

  const fetchCustomerAddress = async () => {
    const { data } = await supabase
      .from('mw_customer_addresses')
      .select('*')
      .eq('customer_id', hwcn.customer.id)
      .eq('is_primary', true)
      .maybeSingle();
    if (data) setCustomerAddress(data);
  };

  const handleSavePDF = async () => {
    setSavingPdf(true);
    try {
      const { renderElementToPDF } = await import('../../utils/pdfDownload');
      await renderElementToPDF({
        elementId: 'hwcn-print-area',
        fileName: `HWCN-${hwcn.hwcn_number}.pdf`,
        scale: 2,
        marginTop: 8,
        marginBottom: 12,
        noBreakSelectors: ['table', 'img', '.no-break'],
      });
    } finally {
      setSavingPdf(false);
    }
  };

  const lineItems: HwcnLineItem[] = hwcn.mw_hwcn_line_items || [];
  const carrier = hwcn.carrier;
  const hwcnPhotos = (hwcn.mw_hwcn_photos || []).filter(p => p.job_photo?.photo_url);

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
  } else if (hwcn.customer.collection_address) {
    collectionAddressLines.push(hwcn.customer.collection_address);
    if (hwcn.customer.postcode) collectionAddressLines.push(hwcn.customer.postcode);
  }

  const customerPhone = hwcn.customer.phone || hwcn.customer.mobile || null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Hazardous Waste Consignment Note</h2>
              <p className="text-gray-600 mt-1">{hwcn.hwcn_number}</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
          </div>

          <div className="border-2 border-gray-300 rounded-lg p-6 bg-white" id="hwcn-print-area">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <img src={logoDataUrl} alt="MediWaste" style={{ height: '60px', width: 'auto', objectFit: 'contain' }} />
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-red-600">HAZARDOUS WASTE CONSIGNMENT NOTE</p>
                <p className="text-lg font-bold text-gray-900">{hwcn.hwcn_number}</p>
                <div className="mt-1 text-sm text-gray-600 space-y-0.5">
                  <p><span className="font-medium">Issue Date:</span> {new Date(hwcn.issue_date).toLocaleDateString('en-GB')}</p>
                  {hwcn.collection_date && <p><span className="font-medium">Collection Date:</span> <span className="font-semibold text-gray-800">{new Date(hwcn.collection_date).toLocaleDateString('en-GB')}</span></p>}
                  {hwcn.job && <p><span className="font-medium">Job Ref:</span> {hwcn.job.job_number}</p>}
                </div>
              </div>
            </div>

            {/* Carrier details */}
            <div className="border-t border-b border-gray-300 py-4 mb-4">
              <h4 className="font-bold text-gray-900 mb-3">Carrier Details</h4>
              {carrier ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="font-semibold text-gray-600">Company Name:</p><p className="text-gray-900">{carrier.name}</p></div>
                  <div><p className="font-semibold text-gray-600">Registration Number:</p><p className="text-gray-900 font-mono">{carrier.registration_number || '—'}</p></div>
                  <div className="col-span-2"><p className="font-semibold text-gray-600">Address:</p><p className="text-gray-900">{carrier.address}</p></div>
                  <div><p className="font-semibold text-gray-600">Registration Type:</p><p className="text-gray-900">{registrationTypeLabel(carrier.registration_type)}</p></div>
                  {carrier.registration_valid_until && <div><p className="font-semibold text-gray-600">Valid Until:</p><p className="text-gray-900">{new Date(carrier.registration_valid_until).toLocaleDateString('en-GB')}</p></div>}
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  <p>{hwcn.carrier_name || 'No carrier linked'}</p>
                  {hwcn.carrier_registration_number && <p className="font-mono mt-1">{hwcn.carrier_registration_number}</p>}
                </div>
              )}
            </div>

            {/* Consignor and Consignee */}
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-3">Consignor (Producer)</h4>
                <div className="text-sm space-y-0.5">
                  <p className="font-semibold text-gray-900">{hwcn.consignor_name || hwcn.customer.company_name || hwcn.customer.contact_name}</p>
                  <p className="text-gray-600">Customer No: {hwcn.customer.customer_number}</p>
                  {hwcn.customer.contact_name && hwcn.customer.company_name && <p className="text-gray-700">Contact: {hwcn.customer.contact_name}</p>}
                  {hwcn.customer.email && <p className="text-gray-600">{hwcn.customer.email}</p>}
                  {customerPhone && <p className="text-gray-600">{customerPhone}</p>}
                  {collectionAddressLines.length > 0 && (
                    <div className="mt-1 pt-1 border-t border-gray-100">
                      {collectionAddressLines.map((line, i) => <p key={i} className="text-gray-700">{line}</p>)}
                    </div>
                  )}
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-3">Consignee (Receiving Site)</h4>
                <div className="text-sm space-y-0.5">
                  <p className="font-semibold text-gray-900">{hwcn.consignee_name || '—'}</p>
                  {hwcn.consignee_address && <p className="text-gray-700 whitespace-pre-line">{hwcn.consignee_address}</p>}
                  {hwcn.consignee_permit_number && <p className="text-gray-600">Permit: <span className="font-mono">{hwcn.consignee_permit_number}</span></p>}
                  {hwcn.consignee_received_date && <p className="text-gray-600">Received: {new Date(hwcn.consignee_received_date).toLocaleDateString('en-GB')}</p>}
                  {hwcn.consignee_received_by && <p className="text-gray-600">Received by: {hwcn.consignee_received_by}</p>}
                </div>
              </div>
            </div>

            {/* Waste line items table */}
            <div className="border-t border-gray-300 pt-4 mb-4">
              <h4 className="font-bold text-gray-900 mb-3">Hazardous Waste Details</h4>
              {lineItems.length > 0 ? (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Waste Type</th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">EWC Code</th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Description</th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Hazard Codes</th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">UN No.</th>
                      <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700">Class</th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Container</th>
                      <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-300 px-3 py-2">{WASTE_TYPE_LABELS[item.waste_type] || item.waste_type?.replace(/_/g, ' ')}</td>
                        <td className="border border-gray-300 px-3 py-2"><span className="font-mono font-semibold text-gray-800 bg-red-50 px-1.5 py-0.5 rounded text-xs">{item.waste_code || WASTE_CODES[item.waste_type] || '—'}</span></td>
                        <td className="border border-gray-300 px-3 py-2 text-gray-700">{item.waste_description}</td>
                        <td className="border border-gray-300 px-3 py-2 text-gray-600 text-xs">{(item.hazard_codes || []).join(', ') || '—'}</td>
                        <td className="border border-gray-300 px-3 py-2 font-mono text-xs">{item.un_number || '—'}</td>
                        <td className="border border-gray-300 px-3 py-2 text-center text-gray-700">{item.un_class || '—'}</td>
                        <td className="border border-gray-300 px-3 py-2 text-gray-600">{CONTAINER_LABELS[item.container_type] || item.container_type?.replace(/_/g, ' ')} ×{item.container_count}</td>
                        <td className="border border-gray-300 px-3 py-2 text-right text-gray-700">{item.quantity} {item.quantity_unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-gray-500">No waste items recorded.</p>
              )}
            </div>

            {/* UN transport summary per item */}
            {lineItems.length > 0 && (
              <div className="border-t border-gray-300 pt-4 mb-4">
                <h4 className="font-bold text-gray-900 mb-3">Transport Information (ADR)</h4>
                <div className="space-y-2 text-sm">
                  {lineItems.map((item, i) => (
                    <div key={i} className="flex gap-4 border-b border-gray-100 pb-2">
                      <span className="font-mono font-semibold text-gray-800 w-24">{item.un_number}</span>
                      <span className="text-gray-700 flex-1">{item.proper_shipping_name}</span>
                      <span className="text-gray-600">Class {item.un_class}</span>
                      <span className="text-gray-600">PG {item.un_packing_group}</span>
                      <span className="text-gray-600">{item.physical_form}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Declarations */}
            <div className="border-t border-gray-300 pt-4">
              <h4 className="font-bold text-gray-900 mb-3">Declarations</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                {/* Consignor declaration */}
                <div>
                  <p className="font-semibold text-gray-700 mb-1">Consignor / Producer:</p>
                  <p className="text-xs text-gray-500 mb-2">I confirm that the waste described above is correctly classified, packaged, and labelled.</p>
                  <div className="border border-gray-300 rounded p-3 bg-gray-50 min-h-[48px]">
                    <p className="text-sm">{hwcn.producer_signature || hwcn.producer_name || hwcn.customer.company_name || hwcn.customer.contact_name || 'Not signed'}</p>
                    {hwcn.producer_signature_date && <p className="text-xs text-gray-500 mt-1">{new Date(hwcn.producer_signature_date).toLocaleDateString('en-GB')}</p>}
                  </div>
                </div>
                {/* Carrier declaration */}
                <div>
                  <p className="font-semibold text-gray-700 mb-1">Carrier / Transporter:</p>
                  <p className="text-xs text-gray-500 mb-2">I confirm that the waste has been accepted for transport and is correctly labelled for ADR transport.</p>
                  <div className="border border-gray-300 rounded p-3 bg-gray-50 min-h-[48px]">
                    <p className="text-sm">{hwcn.carrier_signature || carrier?.name || 'Not signed'}</p>
                    {hwcn.carrier_signature_date && <p className="text-xs text-gray-500 mt-1">{new Date(hwcn.carrier_signature_date).toLocaleDateString('en-GB')}</p>}
                  </div>
                </div>
                {/* Consignee declaration */}
                <div>
                  <p className="font-semibold text-gray-700 mb-1">Consignee / Receiving Site:</p>
                  <p className="text-xs text-gray-500 mb-2">I confirm that the waste has been received and accepted at the permitted facility.</p>
                  <div className="border border-gray-300 rounded p-3 bg-gray-50 min-h-[48px]">
                    {hwcn.consignee_return_status === 'received' ? (
                      <>
                        <p className="text-sm">{hwcn.consignee_received_by || hwcn.consignee_name || 'Received'}</p>
                        {hwcn.consignee_return_date && <p className="text-xs text-gray-500 mt-1">{new Date(hwcn.consignee_return_date).toLocaleDateString('en-GB')}</p>}
                      </>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Awaiting return</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Collection Photos */}
            {hwcnPhotos.length > 0 && (
              <div className="border-t border-gray-300 pt-4 mt-4 no-break" style={{ breakBefore: 'page', pageBreakBefore: 'always' }}>
                <h4 className="font-bold text-gray-900 mb-3">Collection Evidence Photos ({hwcnPhotos.length})</h4>
                <div className="grid grid-cols-3 gap-3">
                  {hwcnPhotos.map((p, i) => (
                    <div key={p.id} className="rounded-lg overflow-hidden border border-gray-200 no-break">
                      <img src={p.job_photo.photo_url} alt={p.job_photo.caption || `Photo ${i + 1}`} crossOrigin="anonymous"
                        style={{ width: '100%', height: 'auto', maxHeight: '200px', objectFit: 'contain', display: 'block' }} className="bg-gray-100" />
                      {p.job_photo.caption && <p className="text-xs text-gray-600 px-2 py-1 bg-gray-50 truncate">{p.job_photo.caption}</p>}
                      <p className="text-xs text-gray-400 px-2 pb-1 bg-gray-50">Photo {i + 1}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 text-xs text-gray-500 border-t border-gray-300 pt-4">
              <p>This Hazardous Waste Consignment Note is issued in accordance with the Hazardous Waste (England and Wales) Regulations 2005 and the Environmental Protection Act 1990.</p>
              <p className="mt-1">This document must be retained for a minimum of 3 years. Hazard codes (HP) are listed in accordance with the Hazardous Waste Regulations. UN numbers and ADR class are provided for transport compliance.</p>
              <p className="mt-1">A consignee return must be received from the receiving facility to complete the cradle-to-grave audit trail.</p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Close</button>
            <button onClick={handleSavePDF} disabled={savingPdf}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-60">
              <Download className="w-4 h-4" />
              {savingPdf ? 'Saving...' : 'Print / Save PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
