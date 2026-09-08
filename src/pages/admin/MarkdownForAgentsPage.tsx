import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { useToastContext } from '../../contexts/ToastContext';
import { convertHtmlToMarkdown, type ConversionResult } from '../../utils/htmlToMarkdown';
import { Link2, Loader2, Copy, Download, FileText, Code2, Eye, Trash2, Zap, ArrowRight } from 'lucide-react';

interface HistoryItem {
  url: string;
  title: string;
  timestamp: number;
  savingsPercent: number;
}

export default function MarkdownForAgentsPage() {
  const { toast } = useToastContext();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [rawHtml, setRawHtml] = useState('');
  const [activeTab, setActiveTab] = useState<'markdown' | 'html' | 'preview'>('markdown');
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('md-agents-history');
      if (stored) setHistory(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const saveToHistory = useCallback((r: ConversionResult, inputUrl: string) => {
    const item: HistoryItem = {
      url: inputUrl,
      title: r.metadata.title || inputUrl,
      timestamp: Date.now(),
      savingsPercent: r.tokenCounts.savingsPercent,
    };
    const updated = [item, ...history.filter((h) => h.url !== inputUrl)].slice(0, 10);
    setHistory(updated);
    localStorage.setItem('md-agents-history', JSON.stringify(updated));
  }, [history]);

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
      saveToHistory(converted, normalizedUrl);
      toast.success(`Converted — ${converted.tokenCounts.savingsPercent}% token savings`);
    } catch (err: any) {
      toast.error(err.message || 'Conversion failed');
    } finally {
      setLoading(false);
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

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('md-agents-history');
  };

  const isValidUrl = (val: string): boolean => {
    try {
      const u = new URL(val.startsWith('http') ? val : 'https://' + val);
      return !!u.hostname;
    } catch {
      return false;
    }
  };

  return (
    <AdminLayout pageTitle="Markdown for Agents" breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'Markdown for Agents' }]}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Markdown for Agents</h1>
          <p className="text-sm text-gray-500 mt-1">Convert any webpage into clean, structured Markdown optimised for AI consumption.</p>
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

        {/* History */}
        {history.length > 0 && !result && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Recent Conversions</h3>
              <button onClick={clearHistory} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            </div>
            <div className="space-y-2">
              {history.map((item, i) => (
                <div
                  key={i}
                  onClick={() => { setUrl(item.url); }}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
                    <p className="text-xs text-gray-400 truncate">{item.url}</p>
                  </div>
                  <span className="text-xs font-mono text-green-600 bg-green-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                    -{item.savingsPercent}%
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-red-500 transition-colors" />
                </div>
              ))}
            </div>
          </div>
        )}

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

            {/* Tabs + Actions */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
                <div className="flex gap-1">
                  <TabButton active={activeTab === 'markdown'} onClick={() => setActiveTab('markdown')} icon={<FileText className="w-4 h-4" />} label="Markdown" />
                  <TabButton active={activeTab === 'html'} onClick={() => setActiveTab('html')} icon={<Code2 className="w-4 h-4" />} label="Raw HTML" />
                  <TabButton active={activeTab === 'preview'} onClick={() => setActiveTab('preview')} icon={<Eye className="w-4 h-4" />} label="Preview" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download .md
                  </button>
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
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!result && !loading && history.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Paste a URL to get started</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Convert any webpage into clean Markdown with YAML frontmatter, preserved JSON-LD, and token savings — all processed locally in your browser.
            </p>
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
