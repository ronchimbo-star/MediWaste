import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';
import {
  Save, Eye, Sparkles, RefreshCw, ArrowLeft, ExternalLink,
} from 'lucide-react';
import SeoValidationChecklist from '../../components/admin/SeoValidationChecklist';

interface SeoCategory {
  id: string;
  name: string;
  slug: string;
}

interface FormState {
  url_slug: string;
  target_keyword: string;
  location: string;
  service_type: string;
  category_id: string;
  status: string;
  meta_title: string;
  meta_description: string;
  h1: string;
  content: string;
  og_title: string;
  og_description: string;
  og_image: string;
  canonical_url: string;
  internal_links: string;
}

const EMPTY_FORM: FormState = {
  url_slug: '',
  target_keyword: '',
  location: '',
  service_type: '',
  category_id: '',
  status: 'draft',
  meta_title: '',
  meta_description: '',
  h1: '',
  content: '',
  og_title: '',
  og_description: '',
  og_image: '',
  canonical_url: '',
  internal_links: '',
};

export default function SeoPageEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');

  const { data: categories = [] } = useQuery({
    queryKey: ['seo-categories'],
    queryFn: async () => {
      const { data } = await supabase.from('seo_categories').select('*').order('name');
      return (data || []) as SeoCategory[];
    },
  });

  const { data: existingPage, isLoading } = useQuery({
    queryKey: ['seo-page-edit', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('seo_pages')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (existingPage) {
      setForm({
        url_slug: existingPage.url_slug || '',
        target_keyword: existingPage.target_keyword || '',
        location: existingPage.location || '',
        service_type: existingPage.service_type || '',
        category_id: existingPage.category_id || '',
        status: existingPage.status || 'draft',
        meta_title: existingPage.meta_title || '',
        meta_description: existingPage.meta_description || '',
        h1: existingPage.h1 || '',
        content: existingPage.content || '',
        og_title: existingPage.og_title || '',
        og_description: existingPage.og_description || '',
        og_image: existingPage.og_image || '',
        canonical_url: existingPage.canonical_url || '',
        internal_links: (existingPage.internal_links || []).join('\n'),
      });
    }
  }, [existingPage]);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setSaveMsg('');
  };

  const handleSave = async () => {
    if (!form.url_slug || !form.target_keyword) {
      setSaveMsg('URL slug and target keyword are required');
      return;
    }

    setSaving(true);
    setSaveMsg('');

    const payload = {
      url_slug: form.url_slug.replace(/^\//, '').replace(/[^a-z0-9-]/g, ''),
      target_keyword: form.target_keyword,
      location: form.location || null,
      service_type: form.service_type || null,
      category_id: form.category_id || null,
      status: form.status,
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
      h1: form.h1 || null,
      content: form.content || null,
      og_title: form.og_title || null,
      og_description: form.og_description || null,
      og_image: form.og_image || null,
      canonical_url: form.canonical_url || null,
      internal_links: form.internal_links ? form.internal_links.split('\n').filter(Boolean) : null,
      updated_at: new Date().toISOString(),
      ...(form.status === 'published' && !existingPage?.published_at ? { published_at: new Date().toISOString() } : {}),
    };

    try {
      if (isNew) {
        const { data, error } = await supabase.from('seo_pages').insert(payload).select('id').single();
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['seo-pages'] });
        navigate(`/admin/seo-pages/${data.id}/edit`, { replace: true });
        setSaveMsg('Page created successfully');
      } else {
        const { error } = await supabase.from('seo_pages').update(payload).eq('id', id);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['seo-pages'] });
        queryClient.invalidateQueries({ queryKey: ['seo-page-edit', id] });
        setSaveMsg('Changes saved');
      }
    } catch (err: any) {
      setSaveMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!id) {
      setGenError('Save the page first before generating content');
      return;
    }

    setGenerating(true);
    setGenError('');

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-seo-content`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          page_id: id,
          custom_instructions: customInstructions || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error || 'Generation failed');
        return;
      }

      const gen = data.generated;
      setForm(prev => ({
        ...prev,
        meta_title: gen.meta_title || prev.meta_title,
        meta_description: gen.meta_description || prev.meta_description,
        h1: gen.h1 || prev.h1,
        content: gen.content || prev.content,
        og_title: gen.og_title || prev.og_title,
        og_description: gen.og_description || prev.og_description,
      }));

      queryClient.invalidateQueries({ queryKey: ['seo-page-edit', id] });
      setSaveMsg('Content generated and saved');
    } catch (err: any) {
      setGenError(err.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  if (!isNew && isLoading) {
    return (
      <AdminLayout pageTitle="Loading...">
        <div className="p-8 text-center">
          <RefreshCw size={24} className="animate-spin text-gray-400 mx-auto" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      pageTitle={isNew ? 'New SEO Page' : 'Edit SEO Page'}
      breadcrumbs={[
        { label: 'Admin', path: '/admin' },
        { label: 'SEO Pages', path: '/admin/seo-pages' },
        { label: isNew ? 'New Page' : form.target_keyword || 'Edit' },
      ]}
    >
      <div className="p-4 lg:p-6 max-w-5xl">
        {/* Top actions */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/admin/seo-pages')}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={16} /> Back to SEO Pages
          </button>
          <div className="flex gap-2">
            {!isNew && form.status === 'published' && (
              <a
                href={`/c/${form.url_slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
              >
                <ExternalLink size={14} /> View Live
              </a>
            )}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <Eye size={14} /> {showPreview ? 'Editor' : 'Preview'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {saveMsg && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${saveMsg.startsWith('Error') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
            {saveMsg}
          </div>
        )}

        {showPreview ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-blue-600 mb-1">https://www.mediwaste.co.uk/c/{form.url_slug}</p>
              <p className="text-lg font-medium text-gray-900">{form.meta_title || form.h1 || 'Untitled'}</p>
              <p className="text-sm text-gray-600">{form.meta_description || 'No description set'}</p>
            </div>
            {form.h1 && <h1 className="text-3xl font-bold text-gray-900 mb-6">{form.h1}</h1>}
            {form.content ? (
              <div
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: form.content }}
              />
            ) : (
              <p className="text-gray-400 italic">No content yet. Use AI generation or write content manually.</p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Core fields */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Core Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Keyword *</label>
                  <input
                    type="text"
                    value={form.target_keyword}
                    onChange={(e) => handleChange('target_keyword', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="e.g. clinical waste disposal London"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug *</label>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 mr-1">/c/</span>
                    <input
                      type="text"
                      value={form.url_slug}
                      onChange={(e) => handleChange('url_slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="clinical-waste-disposal-london"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="e.g. London, Kent, Surrey"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                  <input
                    type="text"
                    value={form.service_type}
                    onChange={(e) => handleChange('service_type', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="e.g. collection, disposal, management"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={form.category_id}
                    onChange={(e) => handleChange('category_id', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">No category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
            </div>

            {/* AI Generation */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={16} /> AI Content Generation
              </h3>
              <p className="text-sm text-blue-700">
                Generate SEO-optimised content using OpenAI. The keyword, location, and category are automatically included in the prompt. Add custom instructions below for specific requirements.
              </p>
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1">Custom Instructions (optional)</label>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  rows={4}
                  placeholder={"Examples:\n- Minimum 1500 words\n- Include this image: /Medical-Waste-Hero.jpg with alt text\n- Use a friendly, conversational tone\n- Include a CTA linking to /quote\n- Focus on cost benefits for dental practices\n- Reference NHS guidelines specifically"}
                  className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={generating || isNew}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium whitespace-nowrap"
                >
                  {generating ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {generating ? 'Generating...' : 'Generate Content'}
                </button>
                {generating && <span className="text-xs text-blue-600">This may take 15-30 seconds...</span>}
              </div>
              {isNew && <p className="text-xs text-blue-600">Save the page first before generating content.</p>}
              {genError && <p className="text-sm text-red-600">{genError}</p>}
            </div>

            {/* Validation Checklist */}
            {form.content && (
              <SeoValidationChecklist
                content={form.content}
                h1={form.h1}
                metaTitle={form.meta_title}
                metaDescription={form.meta_description}
                location={form.location}
                targetKeyword={form.target_keyword}
                pageId={id}
                onFixed={(fixed) => {
                  setForm(prev => ({
                    ...prev,
                    h1: fixed.h1 || prev.h1,
                    meta_title: fixed.meta_title || prev.meta_title,
                    meta_description: fixed.meta_description || prev.meta_description,
                    content: fixed.content || prev.content,
                  }));
                  queryClient.invalidateQueries({ queryKey: ['seo-page-edit', id] });
                  setSaveMsg('Issues fixed and saved by AI');
                }}
              />
            )}

            {/* SEO Metadata */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">SEO Metadata</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meta Title <span className="text-gray-400">({form.meta_title.length}/60)</span>
                </label>
                <input
                  type="text"
                  value={form.meta_title}
                  onChange={(e) => handleChange('meta_title', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Page title for search results"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meta Description <span className="text-gray-400">({form.meta_description.length}/160)</span>
                </label>
                <textarea
                  value={form.meta_description}
                  onChange={(e) => handleChange('meta_description', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Description shown in search results"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">H1 Heading</label>
                <input
                  type="text"
                  value={form.h1}
                  onChange={(e) => handleChange('h1', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Main page heading"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">OG Title</label>
                  <input
                    type="text"
                    value={form.og_title}
                    onChange={(e) => handleChange('og_title', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">OG Description</label>
                  <input
                    type="text"
                    value={form.og_description}
                    onChange={(e) => handleChange('og_description', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">OG Image URL</label>
                  <input
                    type="text"
                    value={form.og_image}
                    onChange={(e) => handleChange('og_image', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Canonical URL</label>
                  <input
                    type="text"
                    value={form.canonical_url}
                    onChange={(e) => handleChange('canonical_url', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Leave empty for default"
                  />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Page Content (HTML)</h3>
              <textarea
                value={form.content}
                onChange={(e) => handleChange('content', e.target.value)}
                rows={20}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="<h2>Your heading</h2><p>Your content...</p>"
              />
            </div>

            {/* Internal Links */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Internal Links</h3>
              <p className="text-sm text-gray-500">One link per line (e.g. /c/sharps-waste-disposal-london)</p>
              <textarea
                value={form.internal_links}
                onChange={(e) => handleChange('internal_links', e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="/c/related-page-slug"
              />
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
