import { useEffect } from 'react';
import { X } from 'lucide-react';
import { formatPence } from '../../lib/pricing';

export interface PriceQuoteRow {
  id: string;
  created_at: string;
  postcode: string;
  service_label: string;
  frequency: string | null;
  distance_miles: number | string | null;
  base_pence: number | null;
  surcharge_pence: number | null;
  subtotal_pence: number | null;
  vat_pence: number | null;
  total_pence: number | null;
  is_placeholder: boolean;
  quote_request_id: string | null;
}

interface Props {
  row: PriceQuoteRow;
  onClose: () => void;
}

export default function PriceBreakdownDetail({ row, onClose }: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const lines: Array<{ label: string; value: string; strong?: boolean }> = [
    { label: 'Base fee for frequency', value: formatPence(row.base_pence) },
    { label: 'Distance surcharge', value: formatPence(row.surcharge_pence) },
    { label: 'Subtotal (excl. VAT)', value: formatPence(row.subtotal_pence), strong: true },
    { label: 'VAT at 20%', value: formatPence(row.vat_pence) },
    { label: 'Total (incl. VAT)', value: formatPence(row.total_pence), strong: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="price-breakdown-title"
        className="w-full max-w-lg bg-white rounded-xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-6 border-b border-gray-200">
          <div>
            <h2 id="price-breakdown-title" className="text-lg font-bold text-gray-900">Price breakdown</h2>
            <p className="text-sm text-gray-500 mt-1">{new Date(row.created_at).toLocaleString('en-GB')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">Postcode</dt>
              <dd className="font-mono text-gray-900">{row.postcode}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Distance from Erith</dt>
              <dd className="text-gray-900">{row.distance_miles ?? '-'} miles (straight line)</dd>
            </div>
            <div>
              <dt className="text-gray-500">Collection frequency</dt>
              <dd className="text-gray-900">{row.frequency ?? 'Not recorded'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Service type</dt>
              <dd className="text-gray-900">{row.service_label}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-gray-500">Client sees</dt>
              <dd>
                {row.is_placeholder ? (
                  <span className="text-amber-800">Hidden. Prices are not yet confirmed, so the client sees a manual-review message.</span>
                ) : (
                  <span className="text-green-800">Shown. The client sees the total including VAT only.</span>
                )}
              </dd>
            </div>
          </dl>

          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {lines.map((line) => (
                <tr key={line.label}>
                  <td className={`py-2 ${line.strong ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>{line.label}</td>
                  <td className={`py-2 text-right ${line.strong ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{line.value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {row.quote_request_id && (
            <p className="text-xs text-gray-400 font-mono break-all">Quote reference: {row.quote_request_id}</p>
          )}
        </div>
      </div>
    </div>
  );
}
