import { CheckCircle } from 'lucide-react';

interface ServiceOption {
  id: string;
  option_name: string;
  frequency: string;
  collections_per_year: number;
  annual_cost: number;
  vat_amount: number;
  total_cost: number;
  setup_fee: number | null;
  waste_bags_included: number | null;
  sharps_bins_included: number | null;
  additional_services: string | null;
  is_recommended: boolean;
}

interface ServiceComparisonProps {
  options: ServiceOption[];
  selectedOptionId: string | null;
  onSelectOption: (id: string) => void;
  canRespond: boolean;
}

export default function ServiceComparison({ options, selectedOptionId, onSelectOption, canRespond }: ServiceComparisonProps) {
  if (options.length === 0) return null;

  return (
    <div className="p-8 print:p-4">
      <h3 className="text-xl font-bold text-gray-900 mb-2 pb-2 border-b-2 border-red-600">Service Options Comparison</h3>
      <p className="text-sm text-gray-600 mb-6">Select your preferred service frequency and pricing option</p>

      <div className="overflow-x-auto">
        <table className="w-full shadow-lg border-collapse">
          <thead className="bg-red-600 text-white">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase border-r border-red-500">Feature</th>
              {options.map((option) => (
                <th key={option.id} className="px-4 py-3 text-center text-xs font-semibold uppercase border-r border-red-500 last:border-r-0">
                  {option.option_name}
                  {option.is_recommended && (
                    <div className="text-[10px] mt-1 text-yellow-300 font-bold">★ RECOMMENDED</div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr className="bg-white">
              <td className="px-4 py-3 text-sm font-semibold text-gray-900">Service Frequency</td>
              {options.map((option) => (
                <td key={option.id} className="px-4 py-3 text-sm text-gray-900 text-center font-medium">
                  {option.frequency}
                </td>
              ))}
            </tr>
            <tr className="bg-gray-50">
              <td className="px-4 py-3 text-sm font-semibold text-gray-900">Collections/Year</td>
              {options.map((option) => (
                <td key={option.id} className="px-4 py-3 text-sm text-gray-900 text-center">
                  {option.collections_per_year}
                </td>
              ))}
            </tr>
            {options.some(o => o.waste_bags_included) && (
              <tr className="bg-white">
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">Waste Bags Included</td>
                {options.map((option) => (
                  <td key={option.id} className="px-4 py-3 text-sm text-gray-900 text-center">
                    {option.waste_bags_included || 'N/A'}
                  </td>
                ))}
              </tr>
            )}
            {options.some(o => o.sharps_bins_included) && (
              <tr className="bg-gray-50">
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">Sharps Bins Included</td>
                {options.map((option) => (
                  <td key={option.id} className="px-4 py-3 text-sm text-gray-900 text-center">
                    {option.sharps_bins_included || 'N/A'}
                  </td>
                ))}
              </tr>
            )}
            {options.some(o => o.setup_fee) && (
              <tr className="bg-white">
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">Setup Fee</td>
                {options.map((option) => (
                  <td key={option.id} className="px-4 py-3 text-sm text-gray-900 text-center">
                    {option.setup_fee ? `£${option.setup_fee.toFixed(2)}` : 'None'}
                  </td>
                ))}
              </tr>
            )}
            {options.some(o => o.additional_services) && (
              <tr className="bg-gray-50">
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">Additional Services</td>
                {options.map((option) => (
                  <td key={option.id} className="px-4 py-3 text-xs text-gray-700 text-center">
                    {option.additional_services || 'Standard service'}
                  </td>
                ))}
              </tr>
            )}
            <tr className="bg-red-50">
              <td className="px-4 py-3 text-sm font-bold text-gray-900">Annual Cost (exc. VAT)</td>
              {options.map((option) => (
                <td key={option.id} className={`px-4 py-3 text-center ${option.is_recommended ? 'bg-red-100' : ''}`}>
                  <div className="text-lg font-bold text-red-700">£{option.annual_cost.toFixed(2)}</div>
                </td>
              ))}
            </tr>
            <tr className="bg-white">
              <td className="px-4 py-3 text-sm font-semibold text-gray-900">VAT (20%)</td>
              {options.map((option) => (
                <td key={option.id} className="px-4 py-3 text-sm text-gray-900 text-center">
                  £{option.vat_amount.toFixed(2)}
                </td>
              ))}
            </tr>
            <tr className="bg-gray-100 font-bold">
              <td className="px-4 py-4 text-base font-bold text-gray-900">Total Annual Cost</td>
              {options.map((option) => (
                <td key={option.id} className={`px-4 py-4 text-center ${option.is_recommended ? 'bg-red-100' : ''}`}>
                  <div className="text-xl font-bold text-gray-900">£{option.total_cost.toFixed(2)}</div>
                  <div className="text-xs text-gray-600 mt-1">inc. VAT</div>
                </td>
              ))}
            </tr>
            {canRespond && (
              <tr className="bg-white">
                <td className="px-4 py-4 text-sm font-semibold text-gray-900">Select Option</td>
                {options.map((option) => (
                  <td key={option.id} className="px-4 py-4 text-center">
                    <button
                      onClick={() => onSelectOption(option.id)}
                      className={`px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 ${
                        selectedOptionId === option.id
                          ? 'bg-red-600 text-white shadow-lg'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {selectedOptionId === option.id ? (
                        <span className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5" />
                          Selected
                        </span>
                      ) : (
                        'Select'
                      )}
                    </button>
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
        <p className="text-sm text-gray-700">
          <strong className="text-blue-900">💡 Tip:</strong> Select the service frequency that best matches your waste production.
          You can always adjust your plan later if your needs change.
        </p>
      </div>
    </div>
  );
}
