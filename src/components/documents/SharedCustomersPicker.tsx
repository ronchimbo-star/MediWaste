import { X } from 'lucide-react';

interface SharedCustomer {
  id: string;
  company_name: string;
}

interface SharedCustomersPickerProps {
  customers: SharedCustomer[];
  primaryCustomerId: string;
  value: string[];
  onChange: (ids: string[]) => void;
}

export default function SharedCustomersPicker({ customers, primaryCustomerId, value, onChange }: SharedCustomersPickerProps) {
  const selected = value
    .filter((id) => id !== primaryCustomerId)
    .map((id) => customers.find((c) => c.id === id))
    .filter((c): c is SharedCustomer => !!c);

  const available = customers.filter((c) => c.id !== primaryCustomerId && !value.includes(c.id));

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Also share with</label>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((customer) => (
            <span
              key={customer.id}
              className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full pl-3 pr-1.5 py-1 text-xs font-medium"
            >
              {customer.company_name}
              <button
                type="button"
                onClick={() => onChange(value.filter((id) => id !== customer.id))}
                className="p-0.5 rounded-full hover:bg-blue-100 transition-colors"
                aria-label={`Remove ${customer.company_name}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <select
        value=""
        onChange={(e) => {
          if (e.target.value) onChange([...value, e.target.value]);
        }}
        disabled={available.length === 0}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
      >
        <option value="">{available.length === 0 ? 'No other customers to add' : 'Add another customer...'}</option>
        {available.map((c) => (
          <option key={c.id} value={c.id}>{c.company_name}</option>
        ))}
      </select>
      <p className="text-xs text-gray-500">Linked customers see this document under the same link and in their own customer portal.</p>
    </div>
  );
}
