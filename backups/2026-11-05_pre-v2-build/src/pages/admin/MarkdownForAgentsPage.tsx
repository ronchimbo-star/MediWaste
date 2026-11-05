import { useState, useCallback, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { useToastContext } from '../../contexts/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { convertHtmlToMarkdown, type ConversionResult } from '../../utils/htmlToMarkdown';
import { supabase } from '../../lib/supabase';
import { Link2, Loader2, Copy, Download, FileText, Code2, Eye, Zap, History, GitCompare, Globe, Lock, Trash2, RefreshCw, ExternalLink } from 'lucide-react';

interface MarkdownVersion {
  id: string;
  source_url: string;
  title: string;
  description: string | null;
  image: string | null;
  markdown_content: string;
  content_signal: string;
  token_counts: { original: number; markdown: number; savings: number; savingsPercent: number };
  jsonld_count: number;
  version_number: number;
  content_hash: string;
  is_latest: boolean;
  is_published: boolean;
  public_slug: string | null;
  created_at: string;
}

export default function MarkdownForAgentsPage() {
  const { toast } = useToastContext();
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [rawHtml, setRawHtml] = useState('');
  const [activeTab, setActiveTab] = useState<'markdown' | 'html' | 'preview' | 'versions'>('markdown');
  const [copied, setCopied] = useState(false);
  const [versions, setVersions] = useState<MarkdownVersion[]>([]);

  const [diffVersionA, setDiffVersionA] = useState<MarkdownVersion | null>(null);
  const [diffVersionB, setDiffVersionB] = useState<MarkdownVersion | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [allPages, setAllPages] = useState<MarkdownVersion[]>([]);
  const [allPagesLoading, setAllPagesLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [viewingPage, setViewingPage] = useState<MarkdownVersion | null>(null);

  const fetchAllPages = useCallback(async () => {
    setAllPagesLoading(true);
    const { data, error } = await supabase
      .from('markdown_versions')
      .select('*')
      .eq('is_latest', true)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching all pages:', error);
    } else {
      setAllPages(data || []);
    }
    setAllPagesLoading(false);
  }, []);

  useEffect(() => {
    fetchAllPages();
  }, [fetchAllPages]);

  const handleDeletePage = async (page: MarkdownVersion) => {
    if (!confirm(`Delete "${page.title}" and all its versions? This cannot be undone.`)) return;
    setDeleting(page.id);
    try {
      const { error } = await supabase
        .from('markdown_versions')
        .delete()
        .eq('source_url', page.source_url);
      if (error) throw error;
      toast.success('Page deleted');
      await fetchAllPages();
      if (url === page.source_url) {
        setResult(null);
        setVersions([]);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const handleRegenerate = async (page: MarkdownVersion) => {
    setRegenerating(page.id);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-markdown`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: page.source_url }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to fetch page');

      const converted = convertHtmlToMarkdown(data.html, data.finalUrl || page.source_url, data.contentSignal || 'ai-train=yes, search=yes, ai-input=yes');

      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(converted.markdown));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const { error } = await supabase.from('markdown_versions').insert({
        source_url: page.source_url,
        source_type: 'manual',
        title: converted.metadata.title || page.source_url,
        description: converted.metadata.description || null,
        image: converted.metadata.image || null,
        markdown_content: converted.markdown,
        content_signal: converted.contentSignal,
        token_counts: converted.tokenCounts,
        jsonld_count: converted.jsonld.length,
        content_hash: contentHash,
        created_by: user?.id || null,
      });

      if (error) throw error;
      toast.success(`Regenerated — new version saved (v${(page.version_number || 0) + 1})`);
      await fetchAllPages();
    } catch (err: any) {
      toast.error(err.message || 'Failed to regenerate');
    } finally {
      setRegenerating(null);
    }
  };

  const handleViewPage = (page: MarkdownVersion) => {
    setViewingPage(page);
  };

  const fetchVersions = useCallback(async (sourceUrl: string) => {
    const { data, error } = await supabase
      .from('markdown_versions')
      .select('*')
      .eq('source_url', sourceUrl)
      .order('version_number', { ascending: false });
    if (error) {
      console.error('Error fetching versions:', error);
      return;
    }
    setVersions(data || []);
  }, []);

  const handleConvert = async () => {
    if (!url.trim()) {
      toast.error('Please enter a URL');
      return;
    }
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    setLoading(true);
    setResult(null);
    setRawHtml('');
    setVersions([]);
    setShowDiff(false);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-markdown`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: normalizedUrl }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to fetch page');

      setRawHtml(data.html);
      const converted = convertHtmlToMarkdown(data.html, data.finalUrl || normalizedUrl, data.contentSignal || 'ai-train=yes, search=yes, ai-input=yes');
      setResult(converted);
      await fetchVersions(normalizedUrl);
      toast.success(`Converted — ${converted.tokenCounts.savingsPercent}% token savings`);
    } catch (err: any) {
      toast.error(err.message || 'Conversion failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVersion = async () => {
    if (!result || !url) return;
    setSaving(true);
    try {
      const normalizedUrl = url.trim().startsWith('http') ? url.trim() : 'https://' + url.trim();
      // Compute a simple hash
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(result.markdown));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Check if content changed from latest version
      const latest = versions.find(v => v.is_latest);
      if (latest && latest.content_hash === contentHash) {
        toast.info('Content unchanged from latest version — no new version saved');
        setSaving(false);
        return;
      }

      const { error } = await supabase.from('markdown_versions').insert({
        source_url: normalizedUrl,
        source_type: 'manual',
        title: result.metadata.title || normalizedUrl,
        description: result.metadata.description || null,
        image: result.metadata.image || null,
        markdown_content: result.markdown,
        content_signal: result.contentSignal,
        token_counts: result.tokenCounts,
        jsonld_count: result.jsonld.length,
        content_hash: contentHash,
        created_by: user?.id || null,
      });

      if (error) throw error;
      toast.success('Version saved to database');
      await fetchVersions(normalizedUrl);
      await fetchAllPages();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save version');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (version: MarkdownVersion) => {
    setPublishing(version.id);
    try {
      const newPublished = !version.is_published;
      const { error } = await supabase
        .from('markdown_versions')
        .update({ is_published: newPublished })
        .eq('id', version.id);

      if (error) throw error;

      const updated = versions.map(v =>
        v.id === version.id ? { ...v, is_published: newPublished, public_slug: newPublished ? v.public_slug : v.public_slug } : v
      );
      setVersions(updated);
      toast.success(newPublished ? 'Markdown published — AI bots can now access it' : 'Markdown unpublished');
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle publish');
    } finally {
      setPublishing(null);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Markdown copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const filename = (result.metadata.title || 'page').replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 60);
    const blob = new Blob([result.markdown], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const loadVersion = (version: MarkdownVersion) => {
    setResult({
      markdown: version.markdown_content,
      metadata: { title: version.title, description: version.description || '', image: version.image || '', url: version.source_url },
      jsonld: [],
      tokenCounts: version.token_counts,
      contentSignal: version.content_signal,
    });
    setActiveTab('markdown');
  };

  const isValidUrl = (val: string): boolean => {
    try {
      const u = new URL(val.startsWith('http') ? val : 'https://' + val);
      return !!u.hostname;
    } catch {
      return false;
    }
  };

  const computeDiff = (a: string, b: string): { type: 'same' | 'added' | 'removed'; line: string }[] => {
    const linesA = a.split('\n');
    const linesB = b.split('\n');
    const maxLen = Math.max(linesA.length, linesB.length);
    const result: { type: 'same' | 'added' | 'removed'; line: string }[] = [];
    for (let i = 0; i < maxLen; i++) {
      const lineA = linesA[i];
      const lineB = linesB[i];
      if (lineA === undefined && lineB !== undefined) {
        result.push({ type: 'added', line: lineB });
      } else if (lineA !== undefined && lineB === undefined) {
        result.push({ type: 'removed', line: lineA });
      } else if (lineA === lineB) {
        result.push({ type: 'same', line: lineA });
      } else {
        if (lineA !== undefined) result.push({ type: 'removed', line: lineA });
        if (lineB !== undefined) result.push({ type: 'added', line: lineB });
      }
    }
    return result;
  };

  const diffLines = diffVersionA && diffVersionB ? computeDiff(diffVersionA.markdown_content, diffVersionB.markdown_content) : [];

  return (
    <AdminLayout pageTitle="Markdown for Agents" breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'Markdown for Agents' }]}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Markdown for Agents</h1>
          <p className="text-sm text-gray-500 mt-1">Convert any webpage into clean, structured Markdown — with version history, diffing, and public AI bot access.</p>
        </div>

        {/* URL Input */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConvert()}
                placeholder="https://example.com/article"
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleConvert}
              disabled={loading || !url.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {loading ? 'Converting...' : 'Convert'}
            </button>
          </div>
          {url.trim() && !isValidUrl(url) && (
            <p className="text-xs text-red-500 mt-2">Please enter a valid URL</p>
          )}
        </div>

        {/* Results */}
        {result && (
          <>
            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard label="Original Tokens" value={result.tokenCounts.original.toLocaleString()} color="gray" />
              <StatCard label="Markdown Tokens" value={result.tokenCounts.markdown.toLocaleString()} color="gray" />
              <StatCard label="Savings" value={`${result.tokenCounts.savingsPercent}%`} color="green" />
              <StatCard label="JSON-LD Blocks" value={String(result.jsonld.length)} color="blue" />
            </div>

            {/* Metadata */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Extracted Metadata</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Title:</span> <span className="text-gray-800">{result.metadata.title || '—'}</span></div>
                <div><span className="text-gray-500">Description:</span> <span className="text-gray-800">{result.metadata.description || '—'}</span></div>
                <div><span className="text-gray-500">Image:</span> <span className="text-gray-800 truncate block">{result.metadata.image || '—'}</span></div>
                <div><span className="text-gray-500">Content Signal:</span> <span className="text-gray-800 font-mono text-xs">{result.contentSignal}</span></div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <button
                onClick={handleSaveVersion}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <History className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save as Version'}
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Copy className="w-4 h-4" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download .md
              </button>
              {versions.length > 0 && (
                <button
                  onClick={() => setActiveTab(activeTab === 'versions' ? 'markdown' : 'versions')}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <History className="w-4 h-4" />
                  Versions ({versions.length})
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
                <div className="flex gap-1">
                  <TabButton active={activeTab === 'markdown'} onClick={() => setActiveTab('markdown')} icon={<FileText className="w-4 h-4" />} label="Markdown" />
                  <TabButton active={activeTab === 'html'} onClick={() => setActiveTab('html')} icon={<Code2 className="w-4 h-4" />} label="Raw HTML" />
                  <TabButton active={activeTab === 'preview'} onClick={() => setActiveTab('preview')} icon={<Eye className="w-4 h-4" />} label="Preview" />
                  {versions.length > 0 && (
                    <TabButton active={activeTab === 'versions'} onClick={() => setActiveTab('versions')} icon={<History className="w-4 h-4" />} label={`Versions (${versions.length})`} />
                  )}
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-4">
                {activeTab === 'markdown' && (
                  <pre className="text-sm text-gray-800 font-mono whitespace-pre-wrap break-words max-h-[600px] overflow-y-auto bg-gray-50 rounded-lg p-4 border border-gray-100">
                    {result.markdown}
                  </pre>
                )}
                {activeTab === 'html' && (
                  <pre className="text-sm text-gray-800 font-mono whitespace-pre-wrap break-words max-h-[600px] overflow-y-auto bg-gray-50 rounded-lg p-4 border border-gray-100">
                    {rawHtml.slice(0, 50000)}
                    {rawHtml.length > 50000 && '\n\n... (truncated for display)'}
                  </pre>
                )}
                {activeTab === 'preview' && (
                  <div className="max-h-[600px] overflow-y-auto prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdownPreview(result.markdown) }} />
                )}
                {activeTab === 'versions' && (
                  <div className="max-h-[600px] overflow-y-auto">
                    {/* Diff controls */}
                    {versions.length >= 2 && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="flex items-center gap-3 flex-wrap">
                          <GitCompare className="w-4 h-4 text-blue-600" />
                          <select
                            value={diffVersionA?.id || ''}
                            onChange={(e) => setDiffVersionA(versions.find(v => v.id === e.target.value) || null)}
                            className="text-sm border border-gray-200 rounded px-2 py-1"
                          >
                            <option value="">Version A...</option>
                            {versions.map(v => <option key={v.id} value={v.id}>v{v.version_number} — {new Date(v.created_at).toLocaleDateString('en-GB')}</option>)}
                          </select>
                          <span className="text-gray-400">vs</span>
                          <select
                            value={diffVersionB?.id || ''}
                            onChange={(e) => setDiffVersionB(versions.find(v => v.id === e.target.value) || null)}
                            className="text-sm border border-gray-200 rounded px-2 py-1"
                          >
                            <option value="">Version B...</option>
                            {versions.map(v => <option key={v.id} value={v.id}>v{v.version_number} — {new Date(v.created_at).toLocaleDateString('en-GB')}</option>)}
                          </select>
                          <button
                            onClick={() => setShowDiff(true)}
                            disabled={!diffVersionA || !diffVersionB}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            Compare
                          </button>
                          {showDiff && (
                            <button onClick={() => setShowDiff(false)} className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700">
                              Hide diff
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Diff output */}
                    {showDiff && diffLines.length > 0 && (
                      <div className="mb-4 rounded-lg border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 border-b border-gray-200">
                          Diff: v{diffVersionA?.version_number} → v{diffVersionB?.version_number}
                        </div>
                        <div className="max-h-[300px] overflow-y-auto font-mono text-xs">
                          {diffLines.map((line, i) => (
                            <div
                              key={i}
                              className={`px-3 py-0.5 ${
                                line.type === 'added' ? 'bg-green-50 text-green-800' :
                                line.type === 'removed' ? 'bg-red-50 text-red-800' :
                                'text-gray-500'
                              }`}
                            >
                              <span className="inline-block w-5 text-gray-400">
                                {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                              </span>
                              {line.line}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Version list */}
                    <div className="space-y-2">
                      {versions.map(v => (
                        <div key={v.id} className={`border rounded-lg p-3 ${v.is_latest ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-800">Version {v.version_number}</span>
                                {v.is_latest && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Latest</span>}
                                {v.is_published && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex items-center gap-1"><Globe className="w-3 h-3" /> Published</span>}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(v.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                {' — '}{v.token_counts.savingsPercent}% savings, {v.jsonld_count} JSON-LD blocks
                              </p>
                              {v.is_published && v.public_slug && (
                                <a
                                  href={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/serve-markdown/${v.public_slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                                >
                                  Public URL: /serve-markdown/{v.public_slug}
                                </a>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => loadVersion(v)}
                                className="text-xs px-2 py-1 text-gray-600 hover:text-gray-900 border border-gray-200 rounded hover:bg-gray-50"
                              >
                                Load
                              </button>
                              <button
                                onClick={() => handleTogglePublish(v)}
                                disabled={publishing === v.id}
                                className={`text-xs px-2 py-1 rounded border flex items-center gap-1 ${
                                  v.is_published
                                    ? 'text-orange-600 border-orange-200 hover:bg-orange-50'
                                    : 'text-green-600 border-green-200 hover:bg-green-50'
                                } disabled:opacity-50`}
                              >
                                {publishing === v.id ? <Loader2 className="w-3 h-3 animate-spin" /> : v.is_published ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                                {v.is_published ? 'Unpublish' : 'Publish'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!result && !loading && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Paste a URL to get started</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Convert any webpage into clean Markdown with YAML frontmatter, preserved JSON-LD, version history, and public AI bot access.
            </p>
          </div>
        )}

        {/* All Pages Table */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Saved Pages</h2>
            <button
              onClick={fetchAllPages}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>

          {allPagesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-red-600" />
            </div>
          ) : allPages.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm border border-gray-200 rounded-xl bg-white">
              No saved pages yet. Convert a URL above to create your first one.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Page Name</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">URL</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Version</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {allPages.map((page) => (
                      <tr key={page.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 truncate max-w-[200px]">{page.title || 'Untitled'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <a href={page.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-[250px] block">
                            {page.source_url}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                            v{page.version_number}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {page.is_published ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <Globe className="w-3 h-3" /> Published
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                              Unpublished
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleViewPage(page)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {page.is_published && page.public_slug && (
                              <a
                                href={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/serve-markdown/${page.public_slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                                title="Open public URL"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              onClick={() => handleRegenerate(page)}
                              disabled={regenerating === page.id}
                              className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg disabled:opacity-50"
                              title="Regenerate (creates new version)"
                            >
                              {regenerating === page.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleDeletePage(page)}
                              disabled={deleting === page.id}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                              title="Delete all versions"
                            >
                              {deleting === page.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
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

        {/* View Modal */}
        {viewingPage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" onClick={() => setViewingPage(null)}>
            <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 truncate">{viewingPage.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">v{viewingPage.version_number} — {new Date(viewingPage.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { navigator.clipboard.writeText(viewingPage.markdown_content); toast.success('Copied to clipboard'); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <Copy className="w-4 h-4" /> Copy
                  </button>
                  <button onClick={() => setViewingPage(null)} className="p-1.5 text-gray-400 hover:text-gray-700">
                    <span className="text-xl">×</span>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <pre className="text-sm text-gray-800 font-mono whitespace-pre-wrap break-words bg-gray-50 rounded-lg p-4 border border-gray-100">
                  {viewingPage.markdown_content}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: 'gray' | 'green' | 'blue' }) {
  const colorClasses = {
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
        active ? 'bg-red-50 text-red-700 font-medium' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function renderMarkdownPreview(md: string): string {
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-6 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded text-xs">$1</code>')
    .replace(/^---$/gm, '<hr class="border-gray-200 my-4" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-red-600 underline">$1</a>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded-lg my-2" />')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    .replace(/\n{2,}/g, '</p><p class="text-sm text-gray-700 mb-3">');

  return `<div class="prose prose-sm"><p class="text-sm text-gray-700 mb-3">${html}</p></div>`;
}
