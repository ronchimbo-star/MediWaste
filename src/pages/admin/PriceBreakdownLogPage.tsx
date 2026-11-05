import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { formatPence } from '../../lib/pricing';
import AdminLayout from '../../components/admin/AdminLayout';
import PriceBreakdownDetail, { type PriceQuoteRow } from '../../components/admin/PriceBreakdownDetail';

const LOG_LIMIT = 200;

export default function PriceBreakdownLogPage() {
  const [selected, setSelected] = useState<PriceQuoteRow | null>(null);

  const { data: rows = [], isLoading, error } = useQuery<PriceQuoteRow[]>({
    queryKey: ['price-quote-log'],
    queryFn: async () => {
      const { data, error: queryError } = await supabase
        .from('quote_price_quotes')
        .select('id, created_at, postcode, service_label, frequency, distance_miles, base_pence, surcharge_pence, subtotal_pence, vat_pence, total_pence, is_placeholder, quote_request_id')
        .order('created_at', { ascending: false })
        .limit(LOG_LIMIT);
      if (queryError) throw queryError;
      return (data || []) as PriceQuoteRow[];
    },
  });

  return (
    <AdminLayout pageTitle="Price Breakdown Log" breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Price Breakdown Log' }]}>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Price breakdown log</h1>
          <p className="text-sm text-gray-500 mt-1">
            Every price calculated for a quote request, newest first. Showing the {LOG_LIMIT} most recent. Click a row for the full breakdown.
          </p>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
            The price log could not be loaded. Please refresh the page.
          </div>
        ) : isLoading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-500">No prices have been calculated yet.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Date and time</th>
                  <th className="px-4 py-3 font-semibold">Postcode</th>
                  <th className="px-4 py-3 font-semibold text-right">Distance (miles)</th>
                  <th className="px-4 py-3 font-semibold">Frequency</th>
                  <th className="px-4 py-3 font-semibold text-right">Base fee</th>
                  <th className="px-4 py-3 font-semibold text-right">Distance surcharge</th>
                  <th className="px-4 py-3 font-semibold text-right">Subtotal (excl. VAT)</th>
                  <th className="px-4 py-3 font-semibold text-right">VAT</th>
                  <th className="px-4 py-3 font-semibold text-right">Total (incl. VAT)</th>
                  <th className="px-4 py-3 font-semibold">Client sees</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelected(row)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString('en-GB')}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-mono">{row.postcode}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{row.distance_miles ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{row.frequency ?? <span className="text-gray-400">Not recorded</span>}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatPence(row.base_pence)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatPence(row.surcharge_pence)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatPence(row.subtotal_pence)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatPence(row.vat_pence)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatPence(row.total_pence)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          row.is_placeholder ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {row.is_placeholder ? 'Hidden' : 'Shown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && <PriceBreakdownDetail row={selected} onClose={() => setSelected(null)} />}
    </AdminLayout>
  );
}
