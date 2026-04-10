import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import { useToastContext } from '../../contexts/ToastContext';
import {
  Upload,
  Search,
  FileText,
  Image,
  File,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
  Plus,
  X,
  Loader,
  FolderOpen,
} from 'lucide-react';

interface Resource {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size_bytes: number | null;
  is_public: boolean;
  tags: string[] | null;
  uploaded_by: string | null;
  created_at: string;
}

const CATEGORIES = [
  { value: 'all', label: 'All Resources' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'templates', label: 'Templates' },
  { value: 'guides', label: 'Guides' },
  { value: 'policies', label: 'Policies' },
  { value: 'forms', label: 'Forms' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_COLORS: Record<string, string> = {
  compliance: 'bg-red-100 text-red-700',
  templates: 'bg-blue-100 text-blue-700',
  guides: 'bg-green-100 text-green-700',
  policies: 'bg-orange-100 text-orange-700',
  forms: 'bg-teal-100 text-teal-700',
  other: 'bg-gray-100 text-gray-700',
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function FileIcon({ type }: { type: string }) {
  if (type === 'image') return <Image size={20} className="text-blue-500" />;
  if (type === 'pdf') return <FileText size={20} className="text-red-500" />;
  return <File size={20} className="text-gray-400" />;
}

const emptyForm = {
  title: '',
  description: '',
  category: 'other',
  file_name: '',
  file_url: '',
  file_type: 'pdf',
  file_size_bytes: '',
  is_public: false,
  tags: '',
};

export default function ResourcesPage() {
  const qc = useQueryClient();
  const { toast } = useToastContext();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [previewResource, setPreviewResource] = useState<Resource | null>(null);

  const { data: resources = [], isLoading } = useQuery<Resource[]>({
    queryKey: ['mw-resources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mw_resources')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const deleteResource = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('mw_resources').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mw-resources'] });
      toast.success('Resource deleted');
    },
  });

  const togglePublic = useMutation({
    mutationFn: async ({ id, is_public }: { id: string; is_public: boolean }) => {
      const { error } = await supabase.from('mw_resources').update({ is_public }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mw-resources'] }),
  });

  async function saveResource() {
    if (!form.title.trim() || !form.file_url.trim() || !form.file_name.trim()) {
      toast.error('Title, file name, and file URL are required');
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('mw_resources').insert([{
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      file_name: form.file_name.trim(),
      file_url: form.file_url.trim(),
      file_type: form.file_type,
      file_size_bytes: form.file_size_bytes ? parseInt(form.file_size_bytes) : null,
      is_public: form.is_public,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
      uploaded_by: user?.id ?? null,
    }]);
    setSaving(false);
    if (error) {
      toast.error('Failed to save resource');
    } else {
      toast.success('Resource added');
      qc.invalidateQueries({ queryKey: ['mw-resources'] });
      setShowModal(false);
      setForm({ ...emptyForm });
    }
  }

  const filtered = resources.filter(r => {
    const matchCat = activeCategory === 'all' || r.category === activeCategory;
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.file_name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <AdminLayout
      pageTitle="Resources"
      breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'Resources' }]}
    >
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search resources..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent w-64"
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Add Resource
          </button>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat.value
                  ? 'bg-slate-800 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {cat.label}
              {cat.value !== 'all' && (
                <span className="ml-1.5 text-xs opacity-60">
                  {resources.filter(r => r.category === cat.value).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader size={22} className="animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <FolderOpen size={36} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No resources found</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 text-sm text-blue-600 hover:underline"
            >
              Add the first resource
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(r => (
              <div key={r.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <FileIcon type={r.file_type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm truncate">{r.title}</h4>
                    {r.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{r.file_name} · {formatBytes(r.file_size_bytes)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${CATEGORY_COLORS[r.category] || CATEGORY_COLORS.other}`}>
                    {r.category}
                  </span>
                  {r.tags?.map(tag => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>

                <div className="flex items-center gap-1 pt-1 border-t border-gray-100">
                  <button
                    onClick={() => setPreviewResource(r)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 px-2 py-1.5 rounded hover:bg-blue-50 transition-colors"
                  >
                    <Eye size={13} />
                    Preview
                  </button>
                  <a
                    href={r.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 px-2 py-1.5 rounded hover:bg-blue-50 transition-colors"
                  >
                    <ExternalLink size={13} />
                    Open
                  </a>
                  <button
                    onClick={() => togglePublic.mutate({ id: r.id, is_public: !r.is_public })}
                    className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded transition-colors ml-auto ${r.is_public ? 'text-green-600 hover:text-green-700 hover:bg-green-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                    title={r.is_public ? 'Public — click to make private' : 'Private — click to make public'}
                  >
                    {r.is_public ? <Eye size={13} /> : <EyeOff size={13} />}
                    {r.is_public ? 'Public' : 'Private'}
                  </button>
                  <button
                    onClick={() => { if (window.confirm('Delete this resource?')) deleteResource.mutate(r.id); }}
                    className="text-gray-300 hover:text-red-500 p-1.5 rounded hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Upload size={18} className="text-blue-500" />
                <h3 className="font-bold text-gray-900">Add Resource</h3>
              </div>
              <button onClick={() => { setShowModal(false); setForm({ ...emptyForm }); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Clinical Waste Policy 2025" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white">
                    {CATEGORIES.filter(c => c.value !== 'all').map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">File Type</label>
                  <select value={form.file_type} onChange={e => setForm({ ...form, file_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white">
                    {['pdf', 'docx', 'xlsx', 'image', 'csv', 'other'].map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">File Name *</label>
                <input type="text" value={form.file_name} onChange={e => setForm({ ...form, file_name: e.target.value })} placeholder="e.g. clinical-waste-policy-2025.pdf" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">File URL *</label>
                <input type="url" value={form.file_url} onChange={e => setForm({ ...form, file_url: e.target.value })} placeholder="https://..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent" />
                <p className="text-xs text-gray-400 mt-1">Paste a direct link to the file (e.g. from Google Drive, Dropbox, or Supabase Storage)</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tags (comma-separated)</label>
                <input type="text" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="e.g. health-and-safety, 2025" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_public} onChange={e => setForm({ ...form, is_public: e.target.checked })} className="rounded" />
                <span className="text-sm text-gray-700">Make publicly visible to customers</span>
              </label>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => { setShowModal(false); setForm({ ...emptyForm }); }} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={saveResource} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? <Loader size={14} className="animate-spin" /> : <Plus size={14} />}
                Add Resource
              </button>
            </div>
          </div>
        </div>
      )}

      {previewResource && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setPreviewResource(null)}>
          <div className="bg-white rounded-xl max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <FileIcon type={previewResource.file_type} />
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{previewResource.title}</h3>
                  <p className="text-xs text-gray-400">{previewResource.file_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={previewResource.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline px-3 py-1.5 rounded-lg hover:bg-blue-50">
                  <ExternalLink size={14} />
                  Open in new tab
                </a>
                <button onClick={() => setPreviewResource(null)} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {previewResource.file_type === 'image' ? (
                <img src={previewResource.file_url} alt={previewResource.title} className="max-w-full mx-auto" />
              ) : previewResource.file_type === 'pdf' ? (
                <iframe src={previewResource.file_url} className="w-full h-[70vh] border-0" title={previewResource.title} />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <File size={40} className="mb-3" />
                  <p className="text-sm">Preview not available for this file type.</p>
                  <a href={previewResource.file_url} target="_blank" rel="noopener noreferrer" className="mt-3 text-sm text-blue-600 hover:underline flex items-center gap-1">
                    <ExternalLink size={13} />
                    Open file
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
