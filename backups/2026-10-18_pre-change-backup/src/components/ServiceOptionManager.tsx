import { useState } from 'react';
import { Plus, Trash2, Star } from 'lucide-react';

interface ServiceOption {
  id?: string;
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
  display_order: number;
  is_recommended: boolean;
}

interface ServiceOptionManagerProps {
  quoteId: string;
  options: ServiceOption[];
  onOptionsChange: (options: ServiceOption[]) => void;
}

const defaultOption: Omit<ServiceOption, 'id'> = {
  option_name: '',
  frequency: '',
  collections_per_year: 0,
  annual_cost: 0,
  vat_amount: 0,
  total_cost: 0,
  setup_fee: null,
  waste_bags_included: null,
  sharps_bins_included: null,
  additional_services: null,
  display_order: 0,
  is_recommended: false,
};

export default function ServiceOptionManager({ options, onOptionsChange }: ServiceOptionManagerProps) {
  const [localOptions, setLocalOptions] = useState<ServiceOption[]>(options);

  const calculateTotals = (annualCost: number) => {
    const vatAmount = annualCost * 0.20;
    const totalCost = annualCost + vatAmount;
    return { vatAmount, totalCost };
  };

  const handleAddOption = () => {
    const newOption: ServiceOption = {
      ...defaultOption,
      display_order: localOptions.length,
    };
    const updated = [...localOptions, newOption];
    setLocalOptions(updated);
    onOptionsChange(updated);
  };

  const handleRemoveOption = (index: number) => {
    const updated = localOptions.filter((_, i) => i !== index);
    setLocalOptions(updated);
    onOptionsChange(updated);
  };

  const handleOptionChange = (index: number, field: keyof ServiceOption, value: any) => {
    const updated = [...localOptions];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'annual_cost') {
      const { vatAmount, totalCost } = calculateTotals(parseFloat(value) || 0);
      updated[index].vat_amount = vatAmount;
      updated[index].total_cost = totalCost;
    }

    if (field === 'is_recommended' && value === true) {
      updated.forEach((opt, i) => {
        if (i !== index) opt.is_recommended = false;
      });
    }

    setLocalOptions(updated);
    onOptionsChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Service Comparison Options</h3>
        <button
          type="button"
          onClick={handleAddOption}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Option
        </button>
      </div>

      {localOptions.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600">No service options added yet. Click "Add Option" to create comparison options.</p>
        </div>
      )}

      <div className="space-y-4">
        {localOptions.map((option, index) => (
          <div key={index} className="p-6 bg-gray-50 rounded-lg border-2 border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">Option {index + 1}</h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOptionChange(index, 'is_recommended', !option.is_recommended)}
                  className={`flex items-center gap-1 px-3 py-1 rounded text-sm font-medium transition-colors ${
                    option.is_recommended
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                  title="Mark as recommended"
                >
                  <Star className="w-4 h-4" />
                  {option.is_recommended ? 'Recommended' : 'Set as Recommended'}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveOption(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Remove option"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Option Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={option.option_name}
                  onChange={(e) => handleOptionChange(index, 'option_name', e.target.value)}
                  placeholder="e.g., Monthly, Bi-Monthly"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={option.frequency}
                  onChange={(e) => handleOptionChange(index, 'frequency', e.target.value)}
                  placeholder="e.g., Every month"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Collections/Year <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  value={option.collections_per_year}
                  onChange={(e) => handleOptionChange(index, 'collections_per_year', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Annual Cost (exc. VAT) <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={option.annual_cost}
                  onChange={(e) => handleOptionChange(index, 'annual_cost', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  VAT: £{option.vat_amount.toFixed(2)} | Total: £{option.total_cost.toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Setup Fee (optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={option.setup_fee || ''}
                  onChange={(e) => handleOptionChange(index, 'setup_fee', parseFloat(e.target.value) || null)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Waste Bags Included
                </label>
                <input
                  type="number"
                  value={option.waste_bags_included || ''}
                  onChange={(e) => handleOptionChange(index, 'waste_bags_included', parseInt(e.target.value) || null)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sharps Bins Included
                </label>
                <input
                  type="number"
                  value={option.sharps_bins_included || ''}
                  onChange={(e) => handleOptionChange(index, 'sharps_bins_included', parseInt(e.target.value) || null)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Services
                </label>
                <input
                  type="text"
                  value={option.additional_services || ''}
                  onChange={(e) => handleOptionChange(index, 'additional_services', e.target.value || null)}
                  placeholder="e.g., Priority collection, compliance support"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {localOptions.length > 0 && (
        <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
          <p className="text-sm text-blue-900">
            <strong>Tip:</strong> Add 2-4 options to give customers flexible choices. Mark the option you recommend with the star icon.
          </p>
        </div>
      )}
    </div>
  );
}
