import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Plus, Pencil, Trash2, X, Truck } from 'lucide-react';
import { useToastContext } from '../../contexts/ToastContext';
import AdminLayout from '../../components/admin/AdminLayout';

interface WasteCarrier {
  id: string;
  name: string;
  address: string;
  registration_number: string | null;
  registration_type: string;
  registration_valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

const REGISTRATION_TYPES = [
  { value: 'upper_tier', label: 'Upper Tier' },
  { value: 'lower_tier', label: 'Lower Tier' },
  { value: 'exempt', label: 'Exempt' },
];

const emptyForm = {
  name: '',
  address: '',
  registration_number: '',
  registration_type: 'upper_tier',
  registration_valid_until: '',
  is_active: true,
};

export default function WasteCarriersPage() {
  const { toast } = useToastContext();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<WasteCarrier | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const { data: carriers = [], isLoading } = useQuery({
    queryKey: ['waste-carriers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mw_waste_carriers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as WasteCarrier[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (f: typeof form) => {
      const payload = {
        name: f.name.trim(),
        address: f.address.trim(),
        registration_number: f.registration_number.trim() || null,
        registration_type: f.registration_type,
        registration_valid_until: f.registration_valid_until || null,
        is_active: f.is_active,
      };
      if (editing) {
        const { error } = await supabase.from('mw_waste_carriers').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('mw_waste_carriers').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['waste-carriers'] });
      toast.success(editing ? 'Carrier updated' : 'Carrier added');
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save carrier');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('mw_waste_carriers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['waste-carriers'] });
      toast.success('Carrier deleted');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete carrier');
    },
  });

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  }

  function openEdit(c: WasteCarrier) {
    setEditing(c);
    setForm({
      name: c.name,
      address: c.address,
      registration_number: c.registration_number || '',
      registration_type: c.registration_type,
      registration_valid_until: c.registration_valid_until?.split('T')[0] || '',
      is_active: c.is_active,
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
  }

  function handleDelete(c: WasteCarrier) {
    if (!confirm(`Delete carrier "${c.name}"? Any linked WTNs will lose the carrier reference.`)) return;
    deleteMutation.mutate(c.id);
  }

  const registrationTypeLabel = (t: string) => REGISTRATION_TYPES.find(r => r.value === t)?.label || t;

  return (
    <AdminLayout
      pageTitle="Waste Carriers"
      breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'Waste Carriers' }]}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Waste Carriers</h1>
            <p className="text-gray-600 mt-1">Manage licensed waste carrier details used on Waste Transfer Notes</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus size={16} />
            Add Carrier
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : carriers.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No waste carriers added yet</p>
            <p className="text-gray-400 text-sm mt-1">Add a carrier to select it when creating a Waste Transfer Note.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">EA Reg. No.</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Valid Until</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {carriers.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 text-sm">{c.name}</p>
                      <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{c.address}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-mono">{c.registration_number || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{registrationTypeLabel(c.registration_type)}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {c.registration_valid_until
                        ? new Date(c.registration_valid_until).toLocaleDateString('en-GB')
                        : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(c)} className="text-blue-500 hover:text-blue-700 p-1" title="Edit">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => handleDelete(c)} className="text-red-400 hover:text-red-600 p-1" title="Delete">
                          <Trash2 size={15} />
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

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">
                {editing ? 'Edit Waste Carrier' : 'Add Waste Carrier'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Carrier Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  placeholder="e.g. SUEZ Recycling and Recovery UK"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                <textarea
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  placeholder="Full registered address"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">EA Registration No.</label>
                  <input
                    type="text"
                    value={form.registration_number}
                    onChange={e => setForm({ ...form, registration_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    placeholder="e.g. CBDU123456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Registration Type</label>
                  <select
                    value={form.registration_type}
                    onChange={e => setForm({ ...form, registration_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white"
                  >
                    {REGISTRATION_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Registration Valid Until</label>
                  <input
                    type="date"
                    value={form.registration_valid_until}
                    onChange={e => setForm({ ...form, registration_valid_until: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={e => setForm({ ...form, is_active: e.target.checked })}
                      className="rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                    />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending || !form.name.trim() || !form.address.trim()}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Saving...' : editing ? 'Save Changes' : 'Add Carrier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
