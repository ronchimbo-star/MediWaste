import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Upload, FileEdit as Edit, Globe, FileText, ChevronLeft, ChevronRight, RefreshCw, CheckCircle } from 'lucide-react';

interface SeoPage {
  id: string;
  url_slug: string;
  target_keyword: string;
  location: string | null;
  service_type: string | null;
  category_id: string | null;
  status: string;
  meta_title: string | null;
  content: string | null;
  views: number;
  last_generated_at: string | null;
  published_at: string | null;
  created_at: string;
  seo_categories: { name: string } | null;
}

interface SeoCategory {
  id: string;
  name: string;
  slug: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  published: 'bg-green-100 text-green-700',
  archived: 'bg-orange-100 text-orange-700',
};

const ITEMS_PER_PAGE = 25;

export default function SeoPagesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: categories = [] } = useQuery({
    queryKey: ['seo-categories'],
    queryFn: async () => {
      const { data } = await supabase.from('seo_categories').select('*').order('name');
      return (data || []) as SeoCategory[];
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['seo-locations'],
    queryFn: async () => {
      const { data } = await supabase
        .from('seo_pages')
        .select('location')
        .not('location', 'is', null)
        .order('location');
      const unique = [...new Set((data || []).map(d => d.location).filter(Boolean))];
      return unique as string[];
    },
  });

  const { data: result, isLoading } = useQuery({
    queryKey: ['seo-pages', search, statusFilter, categoryFilter, locationFilter, page],
    queryFn: async () => {
      let query = supabase
        .from('seo_pages')
        .select('*, seo_categories(name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

      if (search) {
        query = query.or(`target_keyword.ilike.%${search}%,url_slug.ilike.%${search}%,location.ilike.%${search}%`);
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (categoryFilter !== 'all') {
        query = query.eq('category_id', categoryFilter);
      }
      if (locationFilter !== 'all') {
        query = query.eq('location', locationFilter);
      }

      const { data, count, error } = await query;
      if (error) throw error;
      return { pages: (data || []) as SeoPage[], total: count || 0 };
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['seo-stats'],
    queryFn: async () => {
      const [total, published, draft] = await Promise.all([
        supabase.from('seo_pages').select('id', { count: 'exact', head: true }),
        supabase.from('seo_pages').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('seo_pages').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
      ]);
      return {
        total: total.count || 0,
        published: published.count || 0,
        draft: draft.count || 0,
      };
    },
  });

  const bulkPublish = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('seo_pages')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-pages'] });
      queryClient.invalidateQueries({ queryKey: ['seo-stats'] });
      setSelectedIds(new Set());
    },
  });

  const bulkArchive = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('seo_pages')
        .update({ status: 'archived' })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-pages'] });
      queryClient.invalidateQueries({ queryKey: ['seo-stats'] });
      setSelectedIds(new Set());
    },
  });

  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('seo_pages').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-pages'] });
      queryClient.invalidateQueries({ queryKey: ['seo-stats'] });
      setSelectedIds(new Set());
    },
  });

  const pages = result?.pages || [];
  const totalPages = Math.ceil((result?.total || 0) / ITEMS_PER_PAGE);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === pages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pages.map(p => p.id)));
    }
  };

  return (
    <AdminLayout
      pageTitle="SEO Pages"
      breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'SEO Pages' }]}
    >
      <div className="p-4 lg:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Pages</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Published</p>
            <p className="text-2xl font-bold text-green-600">{stats?.published || 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Drafts</p>
            <p className="text-2xl font-bold text-gray-600">{stats?.draft || 0}</p>
          </div>
        </div>

        {/* Actions bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search keywords, slugs..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                value={locationFilter}
                onChange={(e) => { setLocationFilter(e.target.value); setPage(0); }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Locations</option>
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCsvModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
              >
                <Upload size={16} /> Import CSV
              </button>
              <button
                onClick={() => navigate('/admin/seo-pages/create')}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors"
              >
                <Plus size={16} /> New Page
              </button>
            </div>
          </div>
        </div>

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
            <span className="text-sm font-medium text-blue-800">{selectedIds.size} selected</span>
            <button
              onClick={() => bulkPublish.mutate([...selectedIds])}
              className="text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Publish
            </button>
            <button
              onClick={() => bulkArchive.mutate([...selectedIds])}
              className="text-sm px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              Archive
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete ${selectedIds.size} pages permanently?`)) {
                  bulkDelete.mutate([...selectedIds]);
                }
              }}
              className="text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <RefreshCw size={24} className="animate-spin text-gray-400 mx-auto" />
            </div>
          ) : pages.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No SEO pages found</p>
              <p className="text-sm text-gray-400 mt-1">Create a new page or import via CSV</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === pages.length && pages.length > 0}
                        onChange={toggleAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Keyword / Slug</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Views</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Content</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pages.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          onChange={() => toggleSelect(p.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-[200px]">{p.target_keyword}</p>
                        <p className="text-xs text-gray-500">/c/{p.url_slug}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {p.seo_categories?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {p.location || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-700'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.views || 0}</td>
                      <td className="px-4 py-3">
                        {p.content ? (
                          <CheckCircle size={16} className="text-green-500" />
                        ) : (
                          <span className="text-xs text-gray-400">Empty</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {p.status === 'published' && (
                            <a
                              href={`/c/${p.url_slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
                              title="View live page"
                            >
                              <Globe size={15} />
                            </a>
                          )}
                          <button
                            onClick={() => navigate(`/admin/seo-pages/${p.id}/edit`)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Page {page + 1} of {totalPages} ({result?.total} total)
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CSV Import Modal */}
      {showCsvModal && (
        <CsvImportModal onClose={() => setShowCsvModal(false)} />
      )}
    </AdminLayout>
  );
}

function CsvImportModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [csvContent, setCsvContent] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; imported?: number; error?: string } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvContent(ev.target?.result as string || '');
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvContent.trim()) return;
    setImporting(true);
    setResult(null);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-seo-csv`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csv_content: csvContent }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ error: data.error || 'Import failed' });
      } else {
        setResult({ success: true, imported: data.imported });
        queryClient.invalidateQueries({ queryKey: ['seo-pages'] });
        queryClient.invalidateQueries({ queryKey: ['seo-stats'] });
      }
    } catch (err) {
      setResult({ error: String(err) });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Import SEO Pages from CSV</h2>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            CSV must include columns: <code className="bg-gray-100 px-1 rounded">url_slug</code>, <code className="bg-gray-100 px-1 rounded">target_keyword</code>.
            Optional: <code className="bg-gray-100 px-1 rounded">location</code>, <code className="bg-gray-100 px-1 rounded">service_type</code>, <code className="bg-gray-100 px-1 rounded">category</code>
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Upload CSV file</label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Or paste CSV content</label>
          <textarea
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            rows={6}
            placeholder="url_slug,target_keyword,location,category&#10;clinical-waste-london,clinical waste disposal London,London,Sharps"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>

        {result && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {result.success
              ? `Successfully imported ${result.imported} pages as drafts.`
              : `Error: ${result.error}`}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            {result?.success ? 'Close' : 'Cancel'}
          </button>
          {!result?.success && (
            <button
              onClick={handleImport}
              disabled={importing || !csvContent.trim()}
              className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              {importing && <RefreshCw size={14} className="animate-spin" />}
              {importing ? 'Importing...' : 'Import'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
