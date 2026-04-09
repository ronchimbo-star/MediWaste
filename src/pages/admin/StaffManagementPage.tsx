import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Plus, FileEdit as Edit2, Trash2, X, Search } from 'lucide-react';
import { useToastContext } from '../../contexts/ToastContext';
import AdminLayout from '../../components/admin/AdminLayout';

interface Staff {
  id: string;
  staff_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
}

const ROLES = ['driver', 'collector', 'supervisor', 'admin', 'manager'];

const emptyForm = {
  first_name: '', last_name: '', email: '', phone: '', role: 'driver', status: 'active',
};

export default function StaffManagementPage() {
  const { toast } = useToastContext();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [search, setSearch] = useState('');

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data, error } = await supabase.from('mw_staff').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Staff[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (f: typeof form) => {
      if (editing) {
        const { error } = await supabase.from('mw_staff').update(f).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('mw_staff').insert([{ ...f, staff_number: '' }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      toast.success(editing ? 'Staff member updated' : 'Staff member added');
      setShowModal(false);
      setEditing(null);
      setForm({ ...emptyForm });
    },
    onError: () => toast.error('Failed to save staff member'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('mw_staff').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff member removed');
    },
    onError: () => toast.error('Failed to delete staff member'),
  });

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  }

  function openEdit(s: Staff) {
    setEditing(s);
    setForm({ first_name: s.first_name, last_name: s.last_name, email: s.email, phone: s.phone || '', role: s.role, status: s.status });
    setShowModal(true);
  }

  const filtered = (staff || []).filter(s =>
    `${s.first_name} ${s.last_name} ${s.email} ${s.staff_number}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout pageTitle="Staff Management" breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'Staff Management' }]}>
    <div className="p-6">
      <div className="mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600 mt-1">Manage your team members</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 flex gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm">
          <Plus size={16} />Add Staff Member
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12"><div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Staff #', 'Name', 'Email', 'Phone', 'Role', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">No staff members found</td></tr>
              ) : filtered.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-gray-500">{m.staff_number}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{m.first_name} {m.last_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{m.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{m.phone || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 capitalize">{m.role}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${m.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{m.status}</span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(m)} className="text-blue-600 hover:text-blue-800"><Edit2 size={15} /></button>
                      <button onClick={() => { if (window.confirm('Remove this staff member?')) deleteMutation.mutate(m.id); }} className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button>
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
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">{editing ? 'Edit Staff Member' : 'Add Staff Member'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              {([['first_name', 'First Name'], ['last_name', 'Last Name'], ['email', 'Email'], ['phone', 'Phone']] as [string, string][]).map(([field, label]) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type={field === 'email' ? 'email' : 'text'} value={(form as any)[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent">
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.first_name || !form.email} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50">
                {editing ? 'Save Changes' : 'Add Staff Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
