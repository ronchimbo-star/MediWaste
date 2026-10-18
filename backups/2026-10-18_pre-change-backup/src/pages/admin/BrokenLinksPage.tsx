import { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Play, RefreshCw, CheckCircle, XCircle, AlertTriangle,
} from 'lucide-react';

interface LinkResult {
  url: string;
  status: number | null;
  ok: boolean;
  error?: string;
  redirectUrl?: string;
}

interface CrawlState {
  running: boolean;
  progress: number;
  total: number;
  results: LinkResult[];
}

const PUBLIC_ROUTES = [
  '/',
  '/about',
  '/contact',
  '/quote',
  '/faq',
  '/waste-services',
  '/waste-services/infectious-waste',
  '/waste-services/sharps-waste',
  '/waste-services/pharmaceutical-waste',
  '/waste-services/cytotoxic-waste',
  '/waste-services/dental-waste',
  '/waste-services/anatomical-waste',
  '/service-coverage',
  '/service-areas/london',
  '/service-areas/kent',
  '/service-areas/essex',
  '/service-areas/surrey',
  '/service-areas/sussex',
  '/service-areas/hampshire',
  '/clinical-waste-disposal-london',
  '/clinical-waste-disposal-kent',
  '/clinical-waste-disposal-essex',
  '/clinical-waste-disposal-surrey',
  '/clinical-waste-disposal-sussex',
  '/clinical-waste-disposal-hampshire',
  '/news',
  '/terms',
  '/privacy',
  '/cookies',
];

export default function BrokenLinksPage() {
  const [state, setState] = useState<CrawlState>({
    running: false,
    progress: 0,
    total: 0,
    results: [],
  });
  const [customUrls, setCustomUrls] = useState('');
  const [filter, setFilter] = useState<'all' | 'broken' | 'ok' | 'redirect'>('all');

  const getBaseUrl = () => {
    return window.location.origin;
  };

  const extractLinksFromPage = async (pageUrl: string): Promise<string[]> => {
    try {
      const res = await fetch(pageUrl);
      const html = await res.text();
      const links: string[] = [];
      const hrefRegex = /href=["']([^"'#]+)["']/g;
      let match;
      while ((match = hrefRegex.exec(html)) !== null) {
        const href = match[1];
        if (href.startsWith('http://') || href.startsWith('https://')) {
          links.push(href);
        } else if (href.startsWith('/') && !href.startsWith('//')) {
          links.push(`${getBaseUrl()}${href}`);
        }
      }
      return [...new Set(links)];
    } catch {
      return [];
    }
  };

  const checkBatch = async (urls: string[]): Promise<LinkResult[]> => {
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
    return data.results || [];
  };

  const handleCrawl = async () => {
    setState({ running: true, progress: 0, total: 0, results: [] });

    const baseUrl = getBaseUrl();
    const allLinks = new Set<string>();

    const pagesToCrawl = [...PUBLIC_ROUTES];
    if (customUrls.trim()) {
      const extra = customUrls.split('\n').map(u => u.trim()).filter(Boolean);
      pagesToCrawl.push(...extra);
    }

    setState(s => ({ ...s, total: pagesToCrawl.length, progress: 0 }));

    for (let i = 0; i < pagesToCrawl.length; i++) {
      const route = pagesToCrawl[i];
      const fullUrl = route.startsWith('http') ? route : `${baseUrl}${route}`;
      const links = await extractLinksFromPage(fullUrl);
      links.forEach(l => allLinks.add(l));
      setState(s => ({ ...s, progress: i + 1 }));
    }

    const externalLinks = [...allLinks].filter(
      url => !url.startsWith(baseUrl) || url.includes('/c/')
    );

    const internalLinks = [...allLinks].filter(
      url => url.startsWith(baseUrl) && !url.includes('/c/')
    );

    const allToCheck = [...internalLinks, ...externalLinks];
    const uniqueToCheck = [...new Set(allToCheck)].filter(
      url => !url.includes('mailto:') && !url.includes('tel:') && !url.includes('javascript:')
    );

    setState(s => ({ ...s, total: uniqueToCheck.length, progress: 0 }));

    const allResults: LinkResult[] = [];
    const batchSize = 50;

    for (let i = 0; i < uniqueToCheck.length; i += batchSize) {
      const batch = uniqueToCheck.slice(i, i + batchSize);
      const batchResults = await checkBatch(batch);
      allResults.push(...batchResults);
      setState(s => ({ ...s, progress: Math.min(i + batchSize, uniqueToCheck.length), results: [...allResults] }));
    }

    setState(s => ({ ...s, running: false, results: allResults }));
  };

  const filteredResults = state.results.filter(r => {
    if (filter === 'broken') return !r.ok;
    if (filter === 'ok') return r.ok && !r.redirectUrl;
    if (filter === 'redirect') return r.ok && !!r.redirectUrl;
    return true;
  });

  const brokenCount = state.results.filter(r => !r.ok).length;
  const okCount = state.results.filter(r => r.ok && !r.redirectUrl).length;
  const redirectCount = state.results.filter(r => r.ok && !!r.redirectUrl).length;

  return (
    <AdminLayout
      pageTitle="Broken Link Checker"
      breadcrumbs={[
        { label: 'Admin', path: '/admin' },
        { label: 'SEO Pages', path: '/admin/seo-pages' },
        { label: 'Broken Links' },
      ]}
    >
      <div className="p-4 lg:p-6 space-y-6 max-w-5xl">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-bold text-gray-900 mb-2">SEO Link Checker</h2>
          <p className="text-sm text-gray-600 mb-4">
            Crawls all public-facing pages on the application to find broken links, redirects, and errors that may impact SEO rankings.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional URLs to check (one per line, optional)
            </label>
            <textarea
              value={customUrls}
              onChange={(e) => setCustomUrls(e.target.value)}
              rows={3}
              placeholder="/c/my-seo-page&#10;https://example.com/external-link"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCrawl}
              disabled={state.running}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
            >
              {state.running ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
              {state.running ? 'Crawling...' : 'Start Link Check'}
            </button>
            {state.running && (
              <span className="text-sm text-gray-500">
                Checking {state.progress} / {state.total} links...
              </span>
            )}
          </div>
        </div>

        {state.results.length > 0 && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Total Checked</p>
                <p className="text-2xl font-bold text-gray-900">{state.results.length}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Healthy</p>
                <p className="text-2xl font-bold text-green-600">{okCount}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Redirects</p>
                <p className="text-2xl font-bold text-orange-600">{redirectCount}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Broken</p>
                <p className="text-2xl font-bold text-red-600">{brokenCount}</p>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2">
              {[
                { key: 'all', label: `All (${state.results.length})` },
                { key: 'broken', label: `Broken (${brokenCount})` },
                { key: 'redirect', label: `Redirects (${redirectCount})` },
                { key: 'ok', label: `Healthy (${okCount})` },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key as typeof filter)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    filter === tab.key
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Results table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">URL</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredResults.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {r.ok && !r.redirectUrl && <CheckCircle size={16} className="text-green-500" />}
                          {r.ok && r.redirectUrl && <AlertTriangle size={16} className="text-orange-500" />}
                          {!r.ok && <XCircle size={16} className="text-red-500" />}
                        </td>
                        <td className="px-4 py-3">
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline truncate block max-w-[400px]"
                            title={r.url}
                          >
                            {r.url}
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          {r.status ? (
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-medium ${
                              r.status >= 200 && r.status < 300 ? 'bg-green-100 text-green-700' :
                              r.status >= 300 && r.status < 400 ? 'bg-orange-100 text-orange-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {r.status}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {r.error && <span className="text-red-600">{r.error}</span>}
                          {r.redirectUrl && (
                            <span className="text-orange-600">Redirects to: {r.redirectUrl.substring(0, 60)}...</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredResults.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No results match the current filter.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
