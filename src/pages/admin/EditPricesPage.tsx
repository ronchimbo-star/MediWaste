import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { parseMiles, parsePoundsToPence } from '../../lib/pricing';
import AdminLayout from '../../components/admin/AdminLayout';

interface FrequencyFee {
  frequency: string;
  sort_order: number;
  base_pence: number;
  is_placeholder: boolean;
}

interface DistanceBand {
  sort_order: number;
  max_miles: number | string | null;
  surcharge_pence: number;
  is_placeholder: boolean;
}

interface PricingData {
  frequencies: FrequencyFee[];
  bands: DistanceBand[];
}

type FrequencyDraft = Record<string, string>;
type BandDraft = Record<number, { maxMiles: string; surcharge: string }>;

const POUNDS_HINT = 'Numbers only, zero or more, up to 2 decimal places';

function penceToPoundsInput(pence: number): string {
  return (pence / 100).toFixed(2);
}

function bandLabel(bands: DistanceBand[], index: number): string {
  const lower = index === 0 ? 0 : Number(bands[index - 1].max_miles);
  const upper = bands[index].max_miles;
  if (upper === null) return `Over ${lower} miles`;
  return `${lower}-${Number(upper)} miles`;
}

export default function EditPricesPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<PricingData>({
    queryKey: ['pricing-config'],
    queryFn: async () => {
      const [{ data: frequencies, error: freqError }, { data: bands, error: bandError }] = await Promise.all([
        supabase
          .from('pricing_frequency_fees')
          .select('frequency, sort_order, base_pence, is_placeholder')
          .order('sort_order', { ascending: true }),
        supabase
          .from('pricing_distance_bands')
          .select('sort_order, max_miles, surcharge_pence, is_placeholder')
          .order('sort_order', { ascending: true }),
      ]);
      if (freqError) throw freqError;
      if (bandError) throw bandError;
      return { frequencies: (frequencies || []) as FrequencyFee[], bands: (bands || []) as DistanceBand[] };
    },
  });

  return (
    <AdminLayout pageTitle="Edit Prices" breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Edit Prices' }]}>
      <div className="p-6 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit prices</h1>
          <p className="text-sm text-gray-500 mt-1">
            Prices are per collection, excluding VAT. VAT at 20% is added to the client total. Changes apply to new quotes only.
          </p>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
            The prices could not be loaded. Please refresh the page.
          </div>
        ) : isLoading || !data ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : (
          <PriceForm
            data={data}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ['pricing-config'] })}
          />
        )}
      </div>
    </AdminLayout>
  );
}

function PriceForm({ data, onSaved }: { data: PricingData; onSaved: () => void }) {
  const [frequencyDrafts, setFrequencyDrafts] = useState<FrequencyDraft>(() =>
    Object.fromEntries(data.frequencies.map((f) => [f.frequency, penceToPoundsInput(f.base_pence)]))
  );
  const [bandDrafts, setBandDrafts] = useState<BandDraft>(() =>
    Object.fromEntries(
      data.bands.map((b) => [
        b.sort_order,
        { maxMiles: b.max_miles === null ? '' : String(Number(b.max_miles)), surcharge: penceToPoundsInput(b.surcharge_pence) },
      ])
    )
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    if (!savedMessage) return;
    const timer = window.setTimeout(() => setSavedMessage(''), 4000);
    return () => window.clearTimeout(timer);
  }, [savedMessage]);

  const frequencyPayload: Array<{ frequency: string; base_pence: number }> = [];
  const frequencyErrors: Record<string, string> = {};
  for (const fee of data.frequencies) {
    const pence = parsePoundsToPence(frequencyDrafts[fee.frequency] ?? '');
    if (pence === null) {
      frequencyErrors[fee.frequency] = POUNDS_HINT;
    } else {
      frequencyPayload.push({ frequency: fee.frequency, base_pence: pence });
    }
  }

  const bandPayload: Array<{ sort_order: number; max_miles: number | null; surcharge_pence: number }> = [];
  const bandErrors: Record<number, { maxMiles?: string; surcharge?: string }> = {};
  data.bands.forEach((band, index) => {
    const draft = bandDraft(bandDrafts, band.sort_order);
    const isLast = index === data.bands.length - 1;
    const errors: { maxMiles?: string; surcharge?: string } = {};
    const surcharge = parsePoundsToPence(draft.surcharge);
    if (surcharge === null) errors.surcharge = POUNDS_HINT;

    let maxMiles: number | null = null;
    if (!isLast) {
      maxMiles = parseMiles(draft.maxMiles);
      if (maxMiles === null) errors.maxMiles = 'Enter a number of miles greater than zero';
    }

    if (errors.maxMiles || errors.surcharge) {
      bandErrors[band.sort_order] = errors;
    } else if (surcharge !== null) {
      bandPayload.push({ sort_order: band.sort_order, max_miles: maxMiles, surcharge_pence: surcharge });
    }
  });

  const hasErrors = Object.keys(frequencyErrors).length > 0 || Object.keys(bandErrors).length > 0;
  const anyUnconfirmed = data.frequencies.some((f) => f.is_placeholder) || data.bands.some((b) => b.is_placeholder);

  const handleSave = async () => {
    if (hasErrors || saving) return;
    setSaving(true);
    setSaveError('');
    setSavedMessage('');
    try {
      const { error: rpcError } = await supabase.rpc('save_pricing_config', {
        payload: { frequencies: frequencyPayload, bands: bandPayload },
      });
      if (rpcError) throw rpcError;
      setSavedMessage('Prices saved. New quotes will use these values.');
      onSaved();
    } catch (err) {
      console.error('Saving prices failed:', err);
      const message = err instanceof Error ? err.message : '';
      setSaveError(message || 'The prices could not be saved. Please check the values and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {anyUnconfirmed ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
          The current prices have not been confirmed. Clients see a manual-review message until you save.
        </div>
      ) : null}

      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Base fee by collection frequency</h2>
          <p className="text-sm text-gray-500 mt-1">{POUNDS_HINT}.</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-6 py-3 font-semibold">Frequency</th>
              <th className="px-6 py-3 font-semibold">Base fee per collection (excl. VAT)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.frequencies.map((fee) => (
              <tr key={fee.frequency}>
                <td className="px-6 py-3 text-gray-900">{fee.frequency}</td>
                <td className="px-6 py-3">
                  <PoundsInput
                    label={`Base fee for ${fee.frequency}`}
                    value={frequencyDrafts[fee.frequency] ?? ''}
                    error={frequencyErrors[fee.frequency]}
                    onChange={(value) => setFrequencyDrafts((prev) => ({ ...prev, [fee.frequency]: value }))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Distance surcharge per collection</h2>
          <p className="text-sm text-gray-500 mt-1">
            Straight-line distance from Erith. Each band runs up to and including its upper limit. The last band has no upper limit.
          </p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-6 py-3 font-semibold">Distance band</th>
              <th className="px-6 py-3 font-semibold">Upper limit (miles)</th>
              <th className="px-6 py-3 font-semibold">Surcharge per collection (excl. VAT)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.bands.map((band, index) => {
              const isLast = index === data.bands.length - 1;
              const draft = bandDraft(bandDrafts, band.sort_order);
              const errors = bandErrors[band.sort_order] ?? {};
              return (
                <tr key={band.sort_order}>
                  <td className="px-6 py-3 text-gray-900">{bandLabel(data.bands, index)}</td>
                  <td className="px-6 py-3">
                    {isLast ? (
                      <span className="text-gray-400">No limit</span>
                    ) : (
                      <NumberInput
                        label={`Upper limit for band ${index + 1}`}
                        value={draft.maxMiles}
                        error={errors.maxMiles}
                        onChange={(value) =>
                          setBandDrafts((prev) => ({ ...prev, [band.sort_order]: { ...draft, maxMiles: value } }))
                        }
                      />
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <PoundsInput
                      label={`Surcharge for band ${index + 1}`}
                      value={draft.surcharge}
                      error={errors.surcharge}
                      onChange={(value) =>
                        setBandDrafts((prev) => ({ ...prev, [band.sort_order]: { ...draft, surcharge: value } }))
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={hasErrors || saving}
          className="px-5 py-2.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:text-gray-600 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save prices'}
        </button>
        {hasErrors && <p className="text-sm text-red-700">Fix the highlighted values before saving.</p>}
        {savedMessage && <p className="text-sm text-green-700">{savedMessage}</p>}
        {saveError && <p className="text-sm text-red-700">{saveError}</p>}
      </div>
    </div>
  );
}

function bandDraft(drafts: BandDraft, sortOrder: number) {
  return drafts[sortOrder] ?? { maxMiles: '', surcharge: '' };
}

function PoundsInput({
  label,
  value,
  error,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="max-w-[12rem]">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
        <input
          type="text"
          inputMode="decimal"
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full pl-7 pr-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent ${
            error ? 'border-red-400 bg-red-50' : 'border-gray-300'
          }`}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}

function NumberInput({
  label,
  value,
  error,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="max-w-[12rem]">
      <input
        type="text"
        inputMode="decimal"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent ${
          error ? 'border-red-400 bg-red-50' : 'border-gray-300'
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
