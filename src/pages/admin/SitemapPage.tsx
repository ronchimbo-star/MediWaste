import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../../components/admin/AdminLayout';
import { supabase } from '../../lib/supabase';
import { MapPin, FileDown, ChevronLeft, ChevronRight, RefreshCw, ExternalLink, FileText, Bot } from 'lucide-react';

interface SitemapEntry {
  url: string;
  lastmod: string;
  changefreq: string;
  priority: string;
  source: 'static' | 'seo';
}

const STATIC_PAGES: Omit<SitemapEntry, 'source'>[] = [
  { url: 'https://www.mediwaste.co.uk/', lastmod: '2026-04-10', changefreq: 'weekly', priority: '1.0' },
  { url: 'https://www.mediwaste.co.uk/about', lastmod: '2026-04-10', changefreq: 'monthly', priority: '0.8' },
  { url: 'https://www.mediwaste.co.uk/contact', lastmod: '2026-04-10', changefreq: 'monthly', priority: '0.9' },
  { url: 'https://www.mediwaste.co.uk/quote', lastmod: '2026-04-10', changefreq: 'monthly', priority: '0.9' },
  { url: 'https://www.mediwaste.co.uk/faq', lastmod: '2026-04-10', changefreq: 'monthly', priority: '0.7' },
  { url: 'https://www.mediwaste.co.uk/waste-services', lastmod: '2026-04-10', changefreq: 'monthly', priority: '0.9' },
  { url: 'https://www.mediwaste.co.uk/waste-services/infectious-waste', lastmod: '2026-04-10', changefreq: 'monthly', priority: '0.8' },
  { url: 'https://www.mediwaste.co.uk/waste-services/sharps-waste', lastmod: '2026-04-10', changefreq: 'monthly', priority: '0.8' },
  { url: 'https://www.mediwaste.co.uk/waste-services/pharmaceutical-waste', lastmod: '2026-04-10', changefreq: 'monthly', priority: '0.8' },
  { url: 'https://www.mediwaste.co.uk/waste-services/cytotoxic-waste', lastmod: '2026-04-10', changefreq: 'monthly', priority: '0.8' },
  { url: 'https://www.mediwaste.co.uk/waste-services/dental-waste', lastmod: '2026-04-10', changefreq: 'monthly', priority: '0.8' },
  { url: 'https://www.mediwaste.co.uk/waste-services/anatomical-waste', lastmod: '2026-04-10', changefreq: 'monthly', priority: '0.8' },
  { url: 'https://www.mediwaste.co.uk/service-coverage', lastmod: '2026-04-10', changefreq: 'monthly', priority: '0.8' },
  { url: 'https://www.mediwaste.co.uk/service-areas/london', lastmod: '2026-04-10', changefreq: 'monthly', priority: '0.9' },
  { url: 'https://www.mediwaste.co.uk/service-areas/kent', lastmod: '2026-04-10', changefreq: 'monthly', priority: '0.8' },
  { url: 'https://www.mediwaste.co.uk/service-areas/essex', lastmod: '2026-04-10', changefreq: 'monthly', priority: '0.8' },
  { url: 'https://www.mediwaste.co.uk/service-areas/surrey', lastmod: '2026-04-10', changefreq: 'monthly', priority: '0.8' },
  { url: 'https://www.mediwaste.co.uk/service-areas/sussex', lastmod: '2026-04-10', changefreq: 'monthly', priority: '0.8' },
  { url: 'https://www.mediwaste.co.uk/service-areas/hampshire', lastmod: '2026-04-10', changefreq: 'monthly', priority: '0.8' },
  { url: 'https://www.mediwaste.co.uk/clinical-waste-disposal-london', lastmod: '2026-04-10', changefreq: 'monthly', priority: '0.9' },
  { url: 'https://www.mediwaste.co.uk/clinical-waste-disposal-kent', lastmod: '2026-04-10', changefreq: 'monthly', priority: '0.8' },
  { url: 'https://www.mediwaste.co.uk/clinical-waste-disposal-essex', lastmod: '2026-04-10', changefreq: 'monthly', priority: '0.8' },
  { url: 'https://www.mediwaste.co.uk/clinical-waste-disposal-surrey', lastmod: '2026-04-10', changefreq: 'monthly', priority: '0.8' },
  { url: 'https://www.mediwaste.co.uk/clinical-waste-disposal-sussex', lastmod: '2026-04-10', changefreq: 'monthly', priority: '0.8' },
  { url: 'https://www.mediwaste.co.uk/clinical-waste-disposal-hampshire', lastmod: '2026-04-10', changefreq: 'monthly', priority: '0.8' },
  { url: 'https://www.mediwaste.co.uk/directory-listings', lastmod: '2026-05-15', changefreq: 'weekly', priority: '0.5' },
  { url: 'https://www.mediwaste.co.uk/news', lastmod: '2026-04-10', changefreq: 'weekly', priority: '0.7' },
  { url: 'https://www.mediwaste.co.uk/compliance', lastmod: '2026-04-10', changefreq: 'monthly', priority: '0.7' },
  { url: 'https://www.mediwaste.co.uk/privacy', lastmod: '2026-04-10', changefreq: 'yearly', priority: '0.3' },
  { url: 'https://www.mediwaste.co.uk/terms', lastmod: '2026-04-10', changefreq: 'yearly', priority: '0.3' },
  { url: 'https://www.mediwaste.co.uk/cookies', lastmod: '2026-04-10', changefreq: 'yearly', priority: '0.3' },
];

const ROBOTS_CONTENT = `User-agent: *
Allow: /

Disallow: /admin/
Disallow: /admin
Disallow: /staff/
Disallow: /staff
Disallow: /customer/
Disallow: /customer
Disallow: /login
Disallow: /quote/*

Crawl-delay: 1

Sitemap: https://mediwaste.co.uk/sitemap.xml
Sitemap: https://mediwaste.co.uk/seo-sitemap.xml`;

const PER_PAGE = 50;

export default function SitemapPage() {
  const [page, setPage] = useState(0);
  const [tab, setTab] = useState<'sitemap' | 'robots'>('sitemap');
  const [filterSource, setFilterSource] = useState<'all' | 'static' | 'seo'>('all');

  const { data: seoPages = [], isLoading } = useQuery({
    queryKey: ['sitemap-seo-pages'],
    queryFn: async () => {
      const { data } = await supabase
        .from('seo_pages')
        .select('url_slug, updated_at, published_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false });
      return (data || []).map((p: any) => ({
        url: `https://www.mediwaste.co.uk/c/${p.url_slug}`,
        lastmod: (p.updated_at || p.published_at || '').split('T')[0],
        changefreq: 'weekly',
        priority: '0.7',
        source: 'seo' as const,
      }));
    },
  });

  const allEntries: SitemapEntry[] = useMemo(() => {
    const staticEntries: SitemapEntry[] = STATIC_PAGES.map(p => ({ ...p, source: 'static' }));
    return [...staticEntries, ...seoPages];
  }, [seoPages]);

  const filteredEntries = useMemo(() => {
    if (filterSource === 'all') return allEntries;
    return allEntries.filter(e => e.source === filterSource);
  }, [allEntries, filterSource]);

  const totalPages = Math.ceil(filteredEntries.length / PER_PAGE);
  const paginatedEntries = filteredEntries.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  const generateSitemapXml = () => {
    const urls = allEntries.map(e => `  <url>
    <loc>${e.url}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`);
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
  };

  const downloadSitemap = () => {
    const xml = generateSitemapXml();
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sitemap.xml';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadRobots = () => {
    const blob = new Blob([ROBOTS_CONTENT], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'robots.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const staticCount = STATIC_PAGES.length;
  const seoCount = seoPages.length;

  return (
    <AdminLayout
      pageTitle="Sitemap & Robots"
      breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Settings', path: '/admin/settings' }, { label: 'Sitemap & Robots' }]}
    >
      <div className="p-4 lg:p-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total URLs in Sitemap</p>
            <p className="text-2xl font-bold text-gray-900">{allEntries.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Static Pages</p>
            <p className="text-2xl font-bold text-blue-600">{staticCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">SEO Pages (Published)</p>
            <p className="text-2xl font-bold text-green-600">{seoCount}</p>
          </div>
        </div>

        {/* Tab toggle + actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setTab('sitemap')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === 'sitemap' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <MapPin size={14} className="inline mr-1.5 -mt-0.5" />
              Sitemap
            </button>
            <button
              onClick={() => setTab('robots')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === 'robots' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <Bot size={14} className="inline mr-1.5 -mt-0.5" />
              Robots.txt
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={downloadSitemap}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 font-medium transition-colors"
            >
              <FileDown size={14} /> Download sitemap.xml
            </button>
            <button
              onClick={downloadRobots}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium transition-colors"
            >
              <FileDown size={14} /> Download robots.txt
            </button>
          </div>
        </div>

        {/* Content */}
        {tab === 'sitemap' ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-gray-500" />
                <h3 className="font-bold text-gray-900">Sitemap URLs</h3>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {filteredEntries.length} URLs
                </span>
              </div>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => { setFilterSource('all'); setPage(0); }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filterSource === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
                >
                  All
                </button>
                <button
                  onClick={() => { setFilterSource('static'); setPage(0); }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filterSource === 'static' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
                >
                  Static
                </button>
                <button
                  onClick={() => { setFilterSource('seo'); setPage(0); }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filterSource === 'seo' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
                >
                  SEO
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="p-8 text-center">
                <RefreshCw size={20} className="animate-spin text-gray-400 mx-auto" />
              </div>
            ) : paginatedEntries.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No URLs found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase w-8">#</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">URL</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Last Modified</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Frequency</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Priority</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedEntries.map((entry, i) => {
                      const path = entry.url.replace('https://www.mediwaste.co.uk', '');
                      return (
                        <tr key={entry.url} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">
                            {page * PER_PAGE + i + 1}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <a
                                href={entry.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 hover:underline truncate max-w-[400px]"
                              >
                                {path || '/'}
                              </a>
                              <ExternalLink size={12} className="text-gray-300 shrink-0" />
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">{entry.lastmod}</td>
                          <td className="px-4 py-2.5 text-gray-600">{entry.changefreq}</td>
                          <td className="px-4 py-2.5 text-gray-600">{entry.priority}</td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${entry.source === 'static' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                              {entry.source === 'static' ? 'Static' : 'SEO'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Page {page + 1} of {totalPages} ({filteredEntries.length} URLs)
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
        ) : (
          /* Robots.txt view */
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <Bot size={18} className="text-gray-500" />
              <h3 className="font-bold text-gray-900">robots.txt</h3>
              <span className="text-xs text-gray-500">Served at /robots.txt</span>
            </div>
            <div className="p-5">
              <pre className="bg-gray-900 text-green-400 rounded-lg p-5 text-sm font-mono overflow-x-auto whitespace-pre leading-relaxed">
                {ROBOTS_CONTENT}
              </pre>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
