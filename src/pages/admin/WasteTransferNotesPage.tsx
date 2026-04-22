import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Download, Eye, X } from 'lucide-react';
import { useToastContext } from '../../contexts/ToastContext';
import AdminLayout from '../../components/admin/AdminLayout';

interface WasteTransferNote {
  id: string;
  wtn_number: string;
  job: {
    job_number: string;
    service_type: string;
  };
  customer: {
    customer_number: string;
    company_name: string;
    contact_name: string;
  };
  issue_date: string;
  waste_description: string;
  waste_type: string;
  quantity: number;
  quantity_unit: string;
  container_type: string;
  carrier_signature: string;
  customer_signature: string;
}

const WASTE_TYPES = ['clinical_waste', 'sharps', 'pharmaceutical', 'cytotoxic', 'anatomical', 'dental', 'general_medical'];
const CONTAINER_TYPES = ['yellow_bag', 'sharps_bin', 'rigid_container', 'drum', 'box'];
const QUANTITY_UNITS = ['kg', 'litres', 'units', 'bags'];

const emptyCreateForm = {
  customer_id: '', job_id: '', waste_type: 'clinical_waste', waste_description: '',
  quantity: '', quantity_unit: 'kg', container_type: 'yellow_bag', container_count: '1',
  carrier_signature: 'Circular Horizons International LTD',
};

export default function WasteTransferNotesPage() {
  const { toast } = useToastContext();
  const [wtns, setWtns] = useState<WasteTransferNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedWtn, setSelectedWtn] = useState<WasteTransferNote | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ ...emptyCreateForm });
  const [createLoading, setCreateLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    fetchWTNs();
  }, []);

  const fetchWTNs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mw_waste_transfer_notes')
        .select(`
          *,
          job:mw_service_jobs!inner(job_number, service_type),
          customer:mw_customers!inner(customer_number, company_name, contact_name)
        `)
        .order('issue_date', { ascending: false });

      if (error) throw error;
      setWtns(data || []);
    } catch (error) {
      console.error('Error fetching WTNs:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewWTN = (wtn: WasteTransferNote) => {
    setSelectedWtn(wtn);
    setShowModal(true);
  };

  const openCreateModal = async () => {
    const [custRes, jobRes] = await Promise.all([
      supabase.from('mw_customers').select('id,customer_number,company_name,contact_name').eq('status', 'active').order('company_name'),
      supabase.from('mw_service_jobs').select('id,job_number,service_type').eq('status', 'completed').order('scheduled_date', { ascending: false }).limit(50),
    ]);
    setCustomers(custRes.data || []);
    setJobs(jobRes.data || []);
    setCreateForm({ ...emptyCreateForm });
    setShowCreateModal(true);
  };

  const handleCreateWTN = async () => {
    if (!createForm.customer_id || !createForm.waste_description || !createForm.quantity) {
      toast.error('Please fill in all required fields');
      return;
    }
    setCreateLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const wtnNumber = `WTN${today}-${Date.now().toString().slice(-4)}`;
      const { error } = await supabase.from('mw_waste_transfer_notes').insert([{
        wtn_number: wtnNumber,
        customer_id: createForm.customer_id,
        job_id: createForm.job_id || null,
        issue_date: new Date().toISOString().split('T')[0],
        waste_type: createForm.waste_type,
        waste_description: createForm.waste_description,
        quantity: Number(createForm.quantity),
        quantity_unit: createForm.quantity_unit,
        container_type: createForm.container_type,
        container_count: Number(createForm.container_count),
        carrier_signature: createForm.carrier_signature,
      }]);
      if (error) throw error;
      toast.success(`WTN ${wtnNumber} created successfully`);
      setShowCreateModal(false);
      fetchWTNs();
    } catch {
      toast.error('Failed to create WTN');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <AdminLayout pageTitle="Waste Transfer Notes" breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'Waste Transfer Notes' }]}>
    <div className="p-6">
      <div className="mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Waste Transfer Notes</h1>
          <p className="text-gray-600 mt-1">Manage waste transfer documentation</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex gap-4 justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Total WTNs</p>
              <p className="text-2xl font-bold text-gray-900">{wtns.length}</p>
            </div>
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
          <div className="inline-block w-8 h-8 border-4 border-[#F59E0B] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">WTN #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Waste Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {wtns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No waste transfer notes found
                  </td>
                </tr>
              ) : (
                wtns.map((wtn) => (
                  <tr key={wtn.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{wtn.wtn_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{wtn.job.job_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {wtn.customer.company_name || wtn.customer.contact_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{wtn.waste_type}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {wtn.quantity} {wtn.quantity_unit}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(wtn.issue_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => viewWTN(wtn)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setSelectedWtn(wtn); setShowModal(true); }}
                          className="text-green-600 hover:text-green-900"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      </div>

      {showModal && selectedWtn && (
        <WTNViewModal
          wtn={selectedWtn}
          onClose={() => {
            setShowModal(false);
            setSelectedWtn(null);
          }}
        />
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Waste Type</label>
                  <select value={createForm.waste_type} onChange={e => setCreateForm({ ...createForm, waste_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent">
                    {WASTE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Container Type</label>
                  <select value={createForm.container_type} onChange={e => setCreateForm({ ...createForm, container_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent">
                    {CONTAINER_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Waste Description *</label>
                <textarea rows={2} value={createForm.waste_description} onChange={e => setCreateForm({ ...createForm, waste_description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                  <input type="number" min="0" step="0.1" value={createForm.quantity} onChange={e => setCreateForm({ ...createForm, quantity: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select value={createForm.quantity_unit} onChange={e => setCreateForm({ ...createForm, quantity_unit: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent">
                    {QUANTITY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Containers</label>
                  <input type="number" min="1" value={createForm.container_count} onChange={e => setCreateForm({ ...createForm, container_count: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreateWTN} disabled={createLoading || !createForm.customer_id || !createForm.waste_description || !createForm.quantity} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50">
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

  useEffect(() => {
    fetchCustomerAddress();
  }, []);

  const fetchCustomerAddress = async () => {
    const { data } = await supabase
      .from('mw_customer_addresses')
      .select('*')
      .eq('customer_id', wtn.customer.customer_number)
      .eq('is_primary', true)
      .maybeSingle();

    if (data) setCustomerAddress(data);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Waste Transfer Note</h2>
              <p className="text-gray-600 mt-1">{wtn.wtn_number}</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <span className="text-2xl">&times;</span>
            </button>
          </div>

          <div className="border-2 border-gray-300 rounded-lg p-6 bg-white">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-[#F59E0B]">MediWaste</h3>
                <p className="text-sm text-gray-600">Medical Waste Management Solutions</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">WTN Number</p>
                <p className="text-lg font-bold text-gray-900">{wtn.wtn_number}</p>
                <p className="text-sm text-gray-600 mt-1">
                  Issue Date: {new Date(wtn.issue_date).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="border-t border-b border-gray-300 py-4 mb-4">
              <h4 className="font-bold text-gray-900 mb-3">Waste Carrier Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold">Company Name:</p>
                  <p>CIRCULAR HORIZONS INTERNATIONAL LTD</p>
                </div>
                <div>
                  <p className="font-semibold">Registration Number:</p>
                  <p>CBDU542939</p>
                </div>
                <div className="col-span-2">
                  <p className="font-semibold">Address:</p>
                  <p>Unit 2 Capital Industrial Estate, Crabtree Manorway South, Belvedere, Kent, DA17 6BJ</p>
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
                  <p className="text-gray-600 italic">To be determined by Circular Horizons International LTD</p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-300 pt-4 mb-4">
              <h4 className="font-bold text-gray-900 mb-3">Waste Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold">Waste Type:</p>
                  <p>{wtn.waste_type}</p>
                </div>
                <div>
                  <p className="font-semibold">Quantity:</p>
                  <p>{wtn.quantity} {wtn.quantity_unit}</p>
                </div>
                <div className="col-span-2">
                  <p className="font-semibold">Description:</p>
                  <p>{wtn.waste_description}</p>
                </div>
                <div>
                  <p className="font-semibold">Container Type:</p>
                  <p>{wtn.container_type}</p>
                </div>
                <div>
                  <p className="font-semibold">Job Reference:</p>
                  <p>{wtn.job.job_number}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-300 pt-4">
              <h4 className="font-bold text-gray-900 mb-3">Signatures</h4>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-semibold mb-2">Carrier (Circular Horizons International LTD):</p>
                  <div className="border border-gray-300 rounded p-3 bg-gray-50">
                    <p className="text-sm">{wtn.carrier_signature}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2">Customer:</p>
                  <div className="border border-gray-300 rounded p-3 bg-gray-50">
                    <p className="text-sm">{wtn.customer_signature || 'Not signed'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 text-xs text-gray-500 border-t border-gray-300 pt-4">
              <p>This Waste Transfer Note is issued in accordance with the Waste (England and Wales) Regulations 2011.</p>
              <p className="mt-1">This document must be retained for a minimum of 2 years.</p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
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
