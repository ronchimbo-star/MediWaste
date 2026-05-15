import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';
import { Copy, Check, Plus, Upload, Download, Search, ExternalLink, FileEdit as Edit, Trash2, RefreshCw, ChevronLeft, ChevronRight, Globe } from 'lucide-react';

interface DirectoryListing {
  id: string;
  directory_name: string;
  directory_link: string;
  category: string;
  status: string;
  notes: string | null;
  use_nofollow: boolean;
  date_added: string;
  last_checked: string | null;
}

interface DirectorySettings {
  id: string;
  business_name: string;
  business_address: string;
  about_short: string;
  about_long: string;
  services: string;
  keywords: string;
  contact_email: string;
  contact_phone: string;
  website_url: string;
  social_media_links: Record<string, string>;
  opening_hours: string;
  public_intro: string;
  meta_title_override: string;
  meta_description_override: string;
  show_status_badges: boolean;
  show_notes_publicly: boolean;
}

const CATEGORIES = ['General', 'Medical', 'Aesthetic', 'Local', 'Niche'];
const STATUSES = ['live', 'pending', 'expired'];
const STATUS_STYLES: Record<string, string> = {
  live: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  expired: 'bg-red-100 text-red-700',
};
const ITEMS_PER_PAGE = 20;

export default function DirectoryListingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'listings' | 'datapool' | 'settings'>('listings');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingListing, setEditingListing] = useState<DirectoryListing | null>(null);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Fetch settings
  const { data: settings } = useQuery({
    queryKey: ['directory-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('directory_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as DirectorySettings | null;
    },
  });

  // Fetch listings
  const { data: listingsResult, isLoading: listingsLoading } = useQuery({
    queryKey: ['directory-listings', search, categoryFilter, statusFilter, page],
    queryFn: async () => {
      let query = supabase
        .from('directory_listings')
        .select('*', { count: 'exact' })
        .order('date_added', { ascending: false })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

      if (search) {
        query = query.or(`directory_name.ilike.%${search}%,directory_link.ilike.%${search}%,notes.ilike.%${search}%`);
      }
      if (categoryFilter !== 'all') query = query.eq('category', categoryFilter);
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);

      const { data, count, error } = await query;
      if (error) throw error;
      return { listings: (data || []) as DirectoryListing[], total: count || 0 };
    },
  });

  const deleteListing = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('directory_listings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['directory-listings'] }),
  });

  const verifyListings = async () => {
    if (!listingsResult?.listings.length) return;
    setVerifying(true);

    const urls = listingsResult.listings.map(l => l.directory_link);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-broken-links`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ urls }),
      });
      const data = await res.json();
      const now = new Date().toISOString();

      for (const result of data.results || []) {
        const listing = listingsResult.listings.find(l => l.directory_link === result.url);
        if (listing) {
          const newStatus = result.ok ? listing.status : 'expired';
          await supabase
            .from('directory_listings')
            .update({ last_checked: now, status: newStatus, updated_at: now })
            .eq('id', listing.id);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['directory-listings'] });
    } catch (err) {
      console.error('Verify failed:', err);
    } finally {
      setVerifying(false);
    }
  };

  const handleExportCsv = () => {
    if (!listingsResult?.listings.length) return;
    const headers = ['directory_name', 'directory_link', 'category', 'status', 'notes', 'date_added', 'last_checked'];
    const rows = listingsResult.listings.map(l =>
      headers.map(h => {
        const val = (l as any)[h] || '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `directory-listings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const listings = listingsResult?.listings || [];
  const totalPages = Math.ceil((listingsResult?.total || 0) / ITEMS_PER_PAGE);

  return (
    <AdminLayout
      pageTitle="Directory Listings"
      breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Directory Listings' }]}
    >
      <div className="p-4 lg:p-6 space-y-6">
        {/* Tab navigation */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {[
            { key: 'listings', label: 'Listings' },
            { key: 'datapool', label: 'Data Pool' },
            { key: 'settings', label: 'Public Page Settings' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'datapool' && settings && <DataPoolSection settings={settings} />}
        {activeTab === 'settings' && settings && <PublicSettingsSection settings={settings} />}
        {activeTab === 'listings' && (
          <>
            {/* Actions bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search directories..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                      className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-56 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="all">All Categories</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="all">All Status</option>
                    {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={verifyListings}
                    disabled={verifying || !listings.length}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium disabled:opacity-50"
                  >
                    {verifying ? <RefreshCw size={14} className="animate-spin" /> : <Globe size={14} />}
                    Verify Links
                  </button>
                  <button
                    onClick={handleExportCsv}
                    disabled={!listings.length}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium disabled:opacity-50"
                  >
                    <Download size={14} /> Export CSV
                  </button>
                  <button
                    onClick={() => setShowCsvImport(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                  >
                    <Upload size={14} /> Import CSV
                  </button>
                  <button
                    onClick={() => { setEditingListing(null); setShowAddModal(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                  >
                    <Plus size={14} /> Add Listing
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {listingsLoading ? (
                <div className="p-8 text-center">
                  <RefreshCw size={24} className="animate-spin text-gray-400 mx-auto" />
                </div>
              ) : listings.length === 0 ? (
                <div className="p-12 text-center">
                  <Globe size={40} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No directory listings yet</p>
                  <p className="text-sm text-gray-400 mt-1">Add your first listing or import from CSV</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Directory</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Notes</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Added</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Last Checked</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {listings.map((l) => (
                        <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{l.directory_name}</p>
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">{l.directory_link}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{l.category}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[l.status] || 'bg-gray-100 text-gray-700'}`}>
                              {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-[150px] truncate">
                            {l.notes || '-'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {new Date(l.date_added).toLocaleDateString('en-GB')}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {l.last_checked ? new Date(l.last_checked).toLocaleDateString('en-GB') : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <a
                                href={l.directory_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                                title="View listing"
                              >
                                <ExternalLink size={15} />
                              </a>
                              <button
                                onClick={() => { setEditingListing(l); setShowAddModal(true); }}
                                className="p-1.5 text-gray-400 hover:text-gray-700 rounded"
                                title="Edit"
                              >
                                <Edit size={15} />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Delete "${l.directory_name}"?`)) {
                                    deleteListing.mutate(l.id);
                                  }
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                                title="Delete"
                              >
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

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">Page {page + 1} of {totalPages}</p>
                  <div className="flex gap-1">
                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"><ChevronLeft size={16} /></button>
                    <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"><ChevronRight size={16} /></button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showAddModal && (
        <ListingModal
          listing={editingListing}
          onClose={() => { setShowAddModal(false); setEditingListing(null); }}
        />
      )}
      {showCsvImport && <CsvImportModal onClose={() => setShowCsvImport(false)} />}
    </AdminLayout>
  );
}

// Data Pool Section with copy buttons
function DataPoolSection({ settings }: { settings: DirectorySettings }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (value: string, field: string) => {
    navigator.clipboard.writeText(value);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const fields = [
    { label: 'Business Name', value: settings.business_name, key: 'business_name' },
    { label: 'Business Address', value: settings.business_address, key: 'business_address' },
    { label: 'About Us (Short)', value: settings.about_short, key: 'about_short' },
    { label: 'About Us (Long)', value: settings.about_long, key: 'about_long' },
    { label: 'Services', value: settings.services, key: 'services' },
    { label: 'Keywords', value: settings.keywords, key: 'keywords' },
    { label: 'Contact Email', value: settings.contact_email, key: 'contact_email' },
    { label: 'Contact Phone', value: settings.contact_phone, key: 'contact_phone' },
    { label: 'Website URL', value: settings.website_url, key: 'website_url' },
    { label: 'Opening Hours', value: settings.opening_hours, key: 'opening_hours' },
    { label: 'Social Media', value: Object.entries(settings.social_media_links || {}).map(([k, v]) => `${k}: ${v}`).join('\n'), key: 'social_media' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Business Data Pool</h3>
        <p className="text-sm text-gray-500">Click copy to use in directory submissions</p>
      </div>
      <div className="space-y-3">
        {fields.map((field) => (
          <div key={field.key} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex-1 min-w-0">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{field.label}</label>
              <p className="text-sm text-gray-900 mt-0.5 whitespace-pre-wrap break-words">
                {field.value || <span className="text-gray-400 italic">Not set</span>}
              </p>
            </div>
            {field.value && (
              <button
                onClick={() => copyToClipboard(field.value, field.key)}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  copied === field.key
                    ? 'bg-green-100 text-green-700'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {copied === field.key ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-gray-400">
        Edit these values in Settings tab or via Admin &gt; Settings.
      </p>
    </div>
  );
}

// Public page settings section
function PublicSettingsSection({ settings }: { settings: DirectorySettings }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    public_intro: settings.public_intro || '',
    meta_title_override: settings.meta_title_override || '',
    meta_description_override: settings.meta_description_override || '',
    show_status_badges: settings.show_status_badges,
    show_notes_publicly: settings.show_notes_publicly,
    business_name: settings.business_name || '',
    business_address: settings.business_address || '',
    about_short: settings.about_short || '',
    about_long: settings.about_long || '',
    services: settings.services || '',
    keywords: settings.keywords || '',
    contact_email: settings.contact_email || '',
    contact_phone: settings.contact_phone || '',
    website_url: settings.website_url || '',
    opening_hours: settings.opening_hours || '',
    social_media_links: JSON.stringify(settings.social_media_links || {}, null, 2),
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    let socialLinks = {};
    try { socialLinks = JSON.parse(form.social_media_links); } catch { socialLinks = {}; }

    const { error } = await supabase
      .from('directory_settings')
      .update({
        business_name: form.business_name,
        business_address: form.business_address,
        about_short: form.about_short,
        about_long: form.about_long,
        services: form.services,
        keywords: form.keywords,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
        website_url: form.website_url,
        opening_hours: form.opening_hours,
        social_media_links: socialLinks,
        public_intro: form.public_intro,
        meta_title_override: form.meta_title_override,
        meta_description_override: form.meta_description_override,
        show_status_badges: form.show_status_badges,
        show_notes_publicly: form.show_notes_publicly,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id);

    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      queryClient.invalidateQueries({ queryKey: ['directory-settings'] });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Business Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Business Name" value={form.business_name} onChange={v => setForm(f => ({ ...f, business_name: v }))} />
          <Field label="Business Address" value={form.business_address} onChange={v => setForm(f => ({ ...f, business_address: v }))} />
          <Field label="Contact Email" value={form.contact_email} onChange={v => setForm(f => ({ ...f, contact_email: v }))} />
          <Field label="Contact Phone" value={form.contact_phone} onChange={v => setForm(f => ({ ...f, contact_phone: v }))} />
          <Field label="Website URL" value={form.website_url} onChange={v => setForm(f => ({ ...f, website_url: v }))} />
          <Field label="Opening Hours" value={form.opening_hours} onChange={v => setForm(f => ({ ...f, opening_hours: v }))} />
        </div>
        <TextArea label="About Us (Short, 50-100 words)" value={form.about_short} onChange={v => setForm(f => ({ ...f, about_short: v }))} rows={3} />
        <TextArea label="About Us (Long, 200-400 words)" value={form.about_long} onChange={v => setForm(f => ({ ...f, about_long: v }))} rows={6} />
        <Field label="Services (comma-separated)" value={form.services} onChange={v => setForm(f => ({ ...f, services: v }))} />
        <Field label="Keywords (comma-separated)" value={form.keywords} onChange={v => setForm(f => ({ ...f, keywords: v }))} />
        <TextArea label="Social Media Links (JSON)" value={form.social_media_links} onChange={v => setForm(f => ({ ...f, social_media_links: v }))} rows={4} mono />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Public Page Settings</h3>
        <TextArea label="Intro Paragraph (shown on /directory-listings)" value={form.public_intro} onChange={v => setForm(f => ({ ...f, public_intro: v }))} rows={4} />
        <Field label="Meta Title Override (optional)" value={form.meta_title_override} onChange={v => setForm(f => ({ ...f, meta_title_override: v }))} placeholder={`${form.business_name} Directory Listings | Find Us Online`} />
        <Field label="Meta Description Override (optional)" value={form.meta_description_override} onChange={v => setForm(f => ({ ...f, meta_description_override: v }))} />
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={form.show_status_badges} onChange={e => setForm(f => ({ ...f, show_status_badges: e.target.checked }))} className="rounded border-gray-300 text-red-600" />
            <span className="text-sm text-gray-700">Show status badges publicly</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={form.show_notes_publicly} onChange={e => setForm(f => ({ ...f, show_notes_publicly: e.target.checked }))} className="rounded border-gray-300 text-red-600" />
            <span className="text-sm text-gray-700">Show notes publicly (default: No)</span>
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">Settings saved successfully</span>}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
      />
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 3, mono }: { label: string; value: string; onChange: (v: string) => void; rows?: number; mono?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 ${mono ? 'font-mono' : ''}`}
      />
    </div>
  );
}

// Add/Edit Listing Modal
function ListingModal({ listing, onClose }: { listing: DirectoryListing | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    directory_name: listing?.directory_name || '',
    directory_link: listing?.directory_link || '',
    category: listing?.category || 'General',
    status: listing?.status || 'pending',
    notes: listing?.notes || '',
    use_nofollow: listing?.use_nofollow || false,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.directory_name || !form.directory_link) return;
    setSaving(true);

    if (listing) {
      await supabase
        .from('directory_listings')
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq('id', listing.id);
    } else {
      await supabase.from('directory_listings').insert(form);
    }

    queryClient.invalidateQueries({ queryKey: ['directory-listings'] });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">{listing ? 'Edit Listing' : 'Add Directory Listing'}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Directory Name *</label>
            <input type="text" value={form.directory_name} onChange={e => setForm(f => ({ ...f, directory_name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500" placeholder="e.g. Yell, Google My Business" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Directory Link (URL) *</label>
            <input type="url" value={form.directory_link} onChange={e => setForm(f => ({ ...f, directory_link: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500" placeholder="https://www.yell.com/biz/..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500" placeholder="e.g. verified by phone, logo uploaded" />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.use_nofollow} onChange={e => setForm(f => ({ ...f, use_nofollow: e.target.checked }))} className="rounded border-gray-300 text-red-600" />
            <span className="text-sm text-gray-700">Use nofollow (for spammy directories)</span>
          </label>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.directory_name || !form.directory_link} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
            {saving && <RefreshCw size={14} className="animate-spin" />}
            {listing ? 'Update' : 'Add'} Listing
          </button>
        </div>
      </div>
    </div>
  );
}

// CSV Import Modal
function CsvImportModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [csvContent, setCsvContent] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; count?: number; error?: string } | null>(null);

  const handleDownloadTemplate = () => {
    const template = `directory_name,directory_link,category,status,notes
Yell,https://www.yell.com/biz/mediwaste-london-12345,General,live,Verified listing
Google My Business,https://www.google.com/maps/place/MediWaste,General,live,Logo uploaded
FreeIndex,https://www.freeindex.co.uk/profile/mediwaste,Local,pending,Awaiting approval
Bark,https://www.bark.com/en/company/mediwaste,Aesthetic,live,Premium listing
NHS Choices,https://www.nhs.uk/services/mediwaste,Medical,live,Healthcare verified
Checkatrade,https://www.checkatrade.com/trades/mediwaste,Local,live,Background checked`;
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'directory-listings-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvContent(ev.target?.result as string || '');
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvContent.trim()) return;
    setImporting(true);
    setResult(null);

    try {
      const lines = csvContent.trim().split('\n');
      if (lines.length < 2) { setResult({ error: 'CSV must have a header row and data' }); return; }

      const headers = lines[0].toLowerCase().replace(/\r/g, '').split(',').map(h => h.trim());
      const nameIdx = headers.indexOf('directory_name');
      const linkIdx = headers.indexOf('directory_link');
      const catIdx = headers.indexOf('category');
      const statusIdx = headers.indexOf('status');
      const notesIdx = headers.indexOf('notes');

      if (nameIdx === -1 || linkIdx === -1) {
        setResult({ error: 'CSV must contain directory_name and directory_link columns' });
        setImporting(false);
        return;
      }

      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].replace(/\r/g, '').trim();
        if (!line) continue;
        const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const name = vals[nameIdx];
        const link = vals[linkIdx];
        if (!name || !link) continue;
        rows.push({
          directory_name: name,
          directory_link: link,
          category: catIdx >= 0 ? vals[catIdx] || 'General' : 'General',
          status: statusIdx >= 0 ? vals[statusIdx] || 'pending' : 'pending',
          notes: notesIdx >= 0 ? vals[notesIdx] || null : null,
        });
      }

      if (rows.length === 0) {
        setResult({ error: 'No valid rows found' });
        setImporting(false);
        return;
      }

      const { error } = await supabase.from('directory_listings').insert(rows);
      if (error) {
        setResult({ error: error.message });
      } else {
        setResult({ success: true, count: rows.length });
        queryClient.invalidateQueries({ queryKey: ['directory-listings'] });
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
        <h2 className="text-lg font-bold text-gray-900 mb-4">Import Directory Listings from CSV</h2>
        <p className="text-sm text-gray-600 mb-3">
          Required columns: <code className="bg-gray-100 px-1 rounded">directory_name</code>, <code className="bg-gray-100 px-1 rounded">directory_link</code>.
          Optional: <code className="bg-gray-100 px-1 rounded">category</code>, <code className="bg-gray-100 px-1 rounded">status</code>, <code className="bg-gray-100 px-1 rounded">notes</code>
        </p>
        <button onClick={handleDownloadTemplate} className="mb-4 inline-flex items-center gap-2 text-sm text-red-700 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 font-medium">
          <Download size={14} /> Download Template
        </button>
        <div className="mb-4">
          <input type="file" accept=".csv" onChange={handleFileUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-red-50 file:text-red-700 hover:file:bg-red-100" />
        </div>
        <textarea value={csvContent} onChange={e => setCsvContent(e.target.value)} rows={5} placeholder="Or paste CSV content here..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono mb-4 focus:ring-2 focus:ring-red-500 focus:border-red-500" />
        {result && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {result.success ? `Imported ${result.count} listings successfully.` : `Error: ${result.error}`}
          </div>
        )}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">{result?.success ? 'Close' : 'Cancel'}</button>
          {!result?.success && (
            <button onClick={handleImport} disabled={importing || !csvContent.trim()} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
              {importing && <RefreshCw size={14} className="animate-spin" />}
              {importing ? 'Importing...' : 'Import'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
