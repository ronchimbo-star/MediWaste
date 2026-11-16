import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import { RefreshCw, Send, Trash2, Globe, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface Submission {
  id: string;
  url: string;
  source: string;
  engine: string;
  status: string;
  response_code: number | null;
  response_detail: string | null;
  created_at: string;
}

const STATUS_STYLE: Record<string, { icon: JSX.Element; label: string }> = {
  success: { icon: <CheckCircle2 size={16} className="text-green-600" />, label: 'Accepted' },
  failed: { icon: <XCircle size={16} className="text-red-600" />, label: 'Failed' },
  pending: { icon: <Clock size={16} className="text-amber-500" />, label: 'Pending' },
};

export default function IndexNowPage() {
  const { toast } = useToast();
  const [paths, setPaths] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [log, setLog] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkPinging, setBulkPinging] = useState(false);

  const loadLog = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('url_index_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      toast.error('Could not load the submission log.');
    } else {
      setLog(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLog();
  }, [loadLog]);

  const parsePaths = (): string[] =>
    paths
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean);

  const submit = async () => {
    const list = parsePaths();
    if (list.length === 0) {
      toast.error('Paste at least one URL or path, one per line.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ping-indexnow`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ paths: list, source: 'manual' }),
        }
      );
      if (!res.ok) throw new Error(`Submission failed (${res.status})`);
      const data = await res.json();
      if (data.status === 'success') {
        toast.success(`Search engines accepted ${data.submitted} URL${data.submitted === 1 ? '' : 's'} for indexing.`);
        setPaths('');
      } else {
        toast.error(`The search engine endpoint rejected the submission (HTTP ${data.http_status}).`);
      }
      loadLog();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  const pingAllPages = async () => {
    setBulkPinging(true);
    try {
      // Build the current URL list from the published content tables, the same
      // way the sitemap does, and submit in one batch.
      const seo = await supabase.from('seo_pages').select('url_slug').eq('status', 'published');
      const news = await supabase.from('news_articles').select('slug').eq('status', 'published');
      const paths: string[] = ['/', '/about/', '/contact/', '/quote/', '/faq/', '/compliance/', '/waste-services/', '/service-coverage/', '/news/', '/directory-listings/'];
      for (const area of ['london','kent','essex','surrey','sussex','hampshire','reading','ipswich','berkshire','suffolk','cambridgeshire','bedfordshire','oxfordshire']) {
        paths.push(`/service-areas/${area}/`);
      }
      for (const p of seo.data || []) paths.push(`/c/${p.url_slug}/`);
      for (const a of news.data || []) paths.push(`/news/${a.slug}/`);

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ping-indexnow`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ paths, source: 'sitemap_ping' }),
        }
      );
      if (!res.ok) throw new Error(`Submission failed (${res.status})`);
      const data = await res.json();
      if (data.status === 'success') {
        toast.success(`Submitted ${data.submitted} URLs to search engines.`);
      } else {
        toast.error(`The search engine endpoint rejected the submission (HTTP ${data.http_status}).`);
      }
      loadLog();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBulkPinging(false);
    }
  };

  const clearLog = async () => {
    if (!confirm('Clear the whole submission log? This cannot be undone.')) return;
    const { error } = await supabase.from('url_index_submissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      toast.error('Could not clear the log.');
    } else {
      toast.success('Log cleared.');
      loadLog();
    }
  };

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Globe size={24} /> Search Engine Indexing
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Submit new or updated URLs to search engines for faster indexing (IndexNow — used by Bing, Seznam, Naver and Yandex).
          </p>
        </div>
        <button onClick={loadLog} className="p-2 rounded hover:bg-gray-100" title="Refresh log">
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="grid gap-6">
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-2">Submit URLs</h2>
          <p className="text-sm text-gray-500 mb-3">
            One URL per line — full URLs (<code className="text-xs bg-gray-100 px-1 rounded">https://mediwaste.co.uk/c/...</code>) or paths (<code className="text-xs bg-gray-100 px-1 rounded">/service-areas/kent</code>).
          </p>
          <textarea
            value={paths}
            onChange={(e) => setPaths(e.target.value)}
            rows={6}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={'/service-areas/reading\n/c/clinical-waste-collection-kent\nhttps://mediwaste.co.uk/news'}
          />
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={submit}
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-red-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
            >
              <Send size={16} /> {submitting ? 'Submitting…' : 'Submit for indexing'}
            </button>
            <button
              onClick={pingAllPages}
              disabled={bulkPinging}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              <Globe size={16} /> {bulkPinging ? 'Submitting…' : 'Submit all published pages'}
            </button>
          </div>
        </section>

        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Submission log</h2>
            {log.length > 0 && (
              <button onClick={clearLog} className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700">
                <Trash2 size={14} /> Clear log
              </button>
            )}
          </div>
          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : log.length === 0 ? (
            <p className="text-sm text-gray-500">No submissions yet. Submit URLs above or publish a new page.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="py-2 pr-4 font-medium">URL</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Source</th>
                    <th className="py-2 pr-4 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {log.map((s) => {
                    const st = STATUS_STYLE[s.status] || STATUS_STYLE.pending;
                    return (
                      <tr key={s.id} className="border-b border-gray-100" title={s.response_detail || ''}>
                        <td className="py-2 pr-4 max-w-md truncate">
                          <a href={s.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                            {s.url.replace('https://mediwaste.co.uk', '')}
                          </a>
                        </td>
                        <td className="py-2 pr-4">
                          <span className="inline-flex items-center gap-1.5">
                            {st.icon} {st.label}
                            {s.response_code ? <span className="text-gray-400 text-xs">({s.response_code})</span> : null}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-gray-500">{s.source}</td>
                        <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">
                          {new Date(s.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
