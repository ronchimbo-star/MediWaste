import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Plus, Trash2, Truck, Package, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const WASTE_TYPES = [
  'Sharps (needles/syringes)',
  'Clinical waste bags (yellow)',
  'Clinical waste bags (tiger stripe)',
  'Pharmaceutical waste',
  'Cytotoxic waste',
  'Dental waste',
  'Anatomical waste',
  'Laboratory waste',
  'Offensive/hygiene waste',
  'Confidential document waste',
  'Other clinical waste',
];

const VOLUME_UNITS = ['kg', 'litres', 'bins', 'bags', 'boxes', 'units'];

const CONTAINER_TYPES = [
  'Sharps bin (1L)',
  'Sharps bin (2.5L)',
  'Sharps bin (5L)',
  'Sharps bin (8L)',
  'Yellow bag',
  'Tiger stripe bag',
  'Rigid container',
  'Wheeled bin',
  'Other',
];

const SUPPLY_TYPES = [
  { label: 'Sharps bins (1L)', value: 'sharps_bin_1l' },
  { label: 'Sharps bins (2.5L)', value: 'sharps_bin_2_5l' },
  { label: 'Sharps bins (5L)', value: 'sharps_bin_5l' },
  { label: 'Sharps bins (8L)', value: 'sharps_bin_8l' },
  { label: 'Yellow clinical bags', value: 'yellow_bags' },
  { label: 'Tiger stripe bags', value: 'tiger_stripe_bags' },
  { label: 'Purple cytotoxic bags', value: 'purple_bags' },
  { label: 'Blue pharmaceutical bags', value: 'blue_pharma_bags' },
  { label: 'Rigid containers', value: 'rigid_containers' },
  { label: 'Cable ties / sealers', value: 'cable_ties' },
  { label: 'Other (describe below)', value: 'other' },
];

const DAYS_OF_WEEK = [
  { label: 'Mon', value: 'monday' },
  { label: 'Tue', value: 'tuesday' },
  { label: 'Wed', value: 'wednesday' },
  { label: 'Thu', value: 'thursday' },
  { label: 'Fri', value: 'friday' },
  { label: 'Sat', value: 'saturday' },
];

const TIME_SLOTS = [
  { label: 'Morning', sublabel: '08:00 – 12:00', value: 'morning' },
  { label: 'Midday', sublabel: '12:00 – 16:00', value: 'midday' },
  { label: 'Afternoon', sublabel: '16:00 – 20:00', value: 'afternoon' },
  { label: 'Any time', sublabel: 'No preference', value: 'any' },
];

interface WasteItem {
  waste_type: string;
  other_description: string;
  quantity: number;
  volume_unit: string;
  container_type: string;
  container_other: string;
  notes: string;
}

interface SupplyItem {
  supply_type: string;
  supply_other: string;
  quantity: number;
}

interface Props {
  customerId: string;
  customerName: string;
  customerAddress?: string;
  source?: string;
  onClose: () => void;
}

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function maxDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
}

function wasteItemLabel(item: WasteItem): string {
  const type = item.waste_type === 'Other clinical waste' && item.other_description
    ? `Other (${item.other_description})`
    : item.waste_type;
  return `${item.quantity} ${item.volume_unit} – ${type}`;
}

function supplyLabel(s: SupplyItem): string {
  const label = s.supply_type === 'other' && s.supply_other
    ? `Other (${s.supply_other})`
    : SUPPLY_TYPES.find(t => t.value === s.supply_type)?.label ?? s.supply_type;
  return `${s.quantity}x ${label}`;
}

function resolvedSupplyType(s: SupplyItem): string {
  if (s.supply_type === 'other') return s.supply_other ? `other: ${s.supply_other}` : 'other';
  return s.supply_type;
}

function resolvedWasteType(item: WasteItem): string {
  if (item.waste_type === 'Other clinical waste' && item.other_description) {
    return `Other clinical waste: ${item.other_description}`;
  }
  return item.waste_type;
}

function resolvedContainerType(item: WasteItem): string | null {
  if (!item.container_type) return null;
  if (item.container_type === 'Other' && item.container_other) return `Other: ${item.container_other}`;
  if (item.container_type === 'Other') return 'Other';
  return item.container_type;
}

export default function CollectionRequestModal({ customerId, customerName, customerAddress, source = 'customer_portal', onClose }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [wasteItems, setWasteItems] = useState<WasteItem[]>([
    { waste_type: '', other_description: '', quantity: 1, volume_unit: 'bags', container_type: '', container_other: '', notes: '' },
  ]);

  const [supplies, setSupplies] = useState<SupplyItem[]>([]);

  const [dateMode, setDateMode] = useState<'range' | 'days'>('range');
  const [dateFrom, setDateFrom] = useState(tomorrow());
  const [dateTo, setDateTo] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [timeSlot, setTimeSlot] = useState('any');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  function addWasteItem() {
    setWasteItems([...wasteItems, { waste_type: '', other_description: '', quantity: 1, volume_unit: 'bags', container_type: '', container_other: '', notes: '' }]);
  }

  function removeWasteItem(i: number) {
    setWasteItems(wasteItems.filter((_, idx) => idx !== i));
  }

  function updateWasteItem(i: number, field: keyof WasteItem, value: string | number) {
    setWasteItems(wasteItems.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }

  function updateSupply(i: number, field: keyof SupplyItem, value: string | number) {
    setSupplies(supplies.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  }

  function toggleDay(day: string) {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  }

  function wasteItemValid(item: WasteItem): boolean {
    if (!item.waste_type) return false;
    if (item.waste_type === 'Other clinical waste' && !item.other_description.trim()) return false;
    if (item.quantity <= 0) return false;
    return true;
  }

  const canProceedStep1 = wasteItems.length > 0 && wasteItems.every(wasteItemValid);
  const canProceedStep2 = dateMode === 'range' ? !!dateFrom : selectedDays.length > 0;

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      const { data: reqRows, error: reqErr } = await supabase
        .from('mw_collection_requests')
        .insert([{
          customer_id: customerId,
          status: 'pending',
          preferred_date_from: dateMode === 'range' ? dateFrom || null : null,
          preferred_date_to: dateMode === 'range' ? dateTo || null : null,
          preferred_days: dateMode === 'days' ? selectedDays : null,
          preferred_time_slot: timeSlot,
          special_instructions: specialInstructions || null,
          contact_name: contactName || null,
          contact_phone: contactPhone || null,
          contact_email: contactEmail || null,
          source,
        }])
        .select('id');

      if (reqErr) throw reqErr;
      const req = reqRows?.[0];
      if (!req) throw new Error('Failed to create request');

      const validWasteItems = wasteItems.filter(wasteItemValid);
      if (validWasteItems.length > 0) {
        const { error: itemsErr } = await supabase
          .from('mw_collection_request_items')
          .insert(validWasteItems.map(item => ({
            request_id: req.id,
            waste_type: resolvedWasteType(item),
            quantity: item.quantity,
            volume_unit: item.volume_unit,
            container_type: resolvedContainerType(item),
            notes: item.notes || null,
          })));
        if (itemsErr) throw itemsErr;
      }

      const validSupplies = supplies.filter(s => s.supply_type && s.quantity > 0);
      if (validSupplies.length > 0) {
        const { error: supErr } = await supabase
          .from('mw_collection_request_supplies')
          .insert(validSupplies.map(s => ({
            request_id: req.id,
            supply_type: resolvedSupplyType(s),
            quantity: s.quantity,
          })));
        if (supErr) throw supErr;
      }

      setSubmitted(true);
    } catch (err: unknown) {
      console.error('[CollectionRequestModal] Submit error:', JSON.stringify(err));
      const e = err as { message?: string; code?: string; details?: string; hint?: string };
      const parts = [e.message, e.details, e.hint].filter(Boolean);
      const msg = parts.length > 0 ? parts.join(' — ') : JSON.stringify(err);
      setError(`Error: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Request Submitted</h2>
          <p className="text-gray-600 text-sm mb-1">
            Your collection request has been received. Our team will be in touch to confirm the collection date.
          </p>
          {contactEmail && (
            <p className="text-gray-500 text-sm mt-2">A confirmation will be sent to <strong>{contactEmail}</strong></p>
          )}
          <button
            onClick={onClose}
            className="mt-6 w-full py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Request Additional Collection</h2>
            <p className="text-sm text-gray-500 mt-0.5">{customerName}{customerAddress ? ` — ${customerAddress}` : ''}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4 flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        <div className="px-5 pt-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map(n => (
              <div key={n} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 transition-colors ${step >= n ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {n}
                </div>
                <span className={`text-xs font-medium whitespace-nowrap ${step >= n ? 'text-gray-700' : 'text-gray-400'}`}>
                  {n === 1 ? 'Waste Items' : n === 2 ? 'Date & Time' : 'Your Details'}
                </span>
                {n < 3 && <div className={`flex-1 h-px ${step > n ? 'bg-red-300' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {step === 1 && (
            <>
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  List the waste you have ready for collection. You can add multiple items.
                </p>
                <div className="space-y-4">
                  {wasteItems.map((item, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-700">Item {i + 1}</span>
                        {wasteItems.length > 1 && (
                          <button onClick={() => removeWasteItem(i)} className="text-red-400 hover:text-red-600">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Waste Type *</label>
                          <select
                            value={item.waste_type}
                            onChange={e => updateWasteItem(i, 'waste_type', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent bg-white"
                          >
                            <option value="">Select waste type...</option>
                            {WASTE_TYPES.map(wt => <option key={wt} value={wt}>{wt}</option>)}
                          </select>
                        </div>
                        {item.waste_type === 'Other clinical waste' && (
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Please describe the waste *</label>
                            <input
                              type="text"
                              placeholder="e.g. mixed clinical dressings, plaster casts..."
                              value={item.other_description}
                              onChange={e => updateWasteItem(i, 'other_description', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent ${!item.other_description.trim() ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                            />
                          </div>
                        )}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={item.quantity}
                            onChange={e => updateWasteItem(i, 'quantity', parseFloat(e.target.value) || 1)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
                          <select
                            value={item.volume_unit}
                            onChange={e => updateWasteItem(i, 'volume_unit', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent bg-white"
                          >
                            {VOLUME_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Container Type <span className="text-gray-400 font-normal">(optional)</span></label>
                          <select
                            value={item.container_type}
                            onChange={e => updateWasteItem(i, 'container_type', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent bg-white"
                          >
                            <option value="">Not specified</option>
                            {CONTAINER_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        {item.container_type === 'Other' && (
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Describe the container</label>
                            <input
                              type="text"
                              placeholder="e.g. cardboard box, large drum..."
                              value={item.container_other}
                              onChange={e => updateWasteItem(i, 'container_other', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent"
                            />
                          </div>
                        )}
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Additional notes <span className="text-gray-400 font-normal">(optional)</span></label>
                          <input
                            type="text"
                            placeholder="e.g. stored in back office, fragile container..."
                            value={item.notes}
                            onChange={e => updateWasteItem(i, 'notes', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addWasteItem}
                  className="mt-3 flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  <Plus size={15} />
                  Add another waste item
                </button>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Package size={15} className="text-gray-500" />
                  <p className="text-sm font-semibold text-gray-700">Request supplies from driver?</p>
                  <span className="text-xs text-gray-400">(optional)</span>
                </div>
                <div className="space-y-3">
                  {supplies.map((s, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                      <div className="flex items-center gap-2 mb-2">
                        <select
                          value={s.supply_type}
                          onChange={e => updateSupply(i, 'supply_type', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent bg-white"
                        >
                          <option value="">Select supply...</option>
                          {SUPPLY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <input
                          type="number"
                          min="1"
                          value={s.quantity}
                          onChange={e => updateSupply(i, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent text-center"
                        />
                        <button onClick={() => setSupplies(supplies.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                          <Trash2 size={15} />
                        </button>
                      </div>
                      {s.supply_type === 'other' && (
                        <input
                          type="text"
                          placeholder="Describe what you need..."
                          value={s.supply_other}
                          onChange={e => updateSupply(i, 'supply_other', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent"
                        />
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setSupplies([...supplies, { supply_type: '', supply_other: '', quantity: 1 }])}
                    className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    <Plus size={15} />
                    Add supply item
                  </button>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">How would you like to specify your preferred date?</p>
                <div className="flex gap-3 mb-5">
                  <button
                    onClick={() => setDateMode('range')}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${dateMode === 'range' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    Date range
                  </button>
                  <button
                    onClick={() => setDateMode('days')}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${dateMode === 'days' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    Days of week
                  </button>
                </div>

                {dateMode === 'range' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Earliest date *</label>
                      <input
                        type="date"
                        value={dateFrom}
                        min={tomorrow()}
                        max={maxDate()}
                        onChange={e => setDateFrom(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Latest date <span className="text-gray-400 font-normal">(optional)</span></label>
                      <input
                        type="date"
                        value={dateTo}
                        min={dateFrom || tomorrow()}
                        max={maxDate()}
                        onChange={e => setDateTo(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Select all days that work for you</p>
                    <div className="flex gap-2 flex-wrap">
                      {DAYS_OF_WEEK.map(d => (
                        <button
                          key={d.value}
                          onClick={() => toggleDay(d.value)}
                          className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${selectedDays.includes(d.value) ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Preferred time slot</p>
                <div className="grid grid-cols-2 gap-3">
                  {TIME_SLOTS.map(slot => (
                    <button
                      key={slot.value}
                      onClick={() => setTimeSlot(slot.value)}
                      className={`py-3 px-4 rounded-xl border text-left transition-colors ${timeSlot === slot.value ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                      <p className={`text-sm font-semibold ${timeSlot === slot.value ? 'text-red-700' : 'text-gray-700'}`}>{slot.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{slot.sublabel}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Special instructions <span className="text-gray-400 text-xs font-normal">(optional)</span></label>
                <textarea
                  rows={3}
                  placeholder="e.g. access code, where waste is stored, any hazards the driver should know about..."
                  value={specialInstructions}
                  onChange={e => setSpecialInstructions(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none"
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-sm text-gray-600">
                So we can confirm your collection, please leave your contact details below. This is optional but helps us reach you quickly.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Your name</label>
                  <input
                    type="text"
                    placeholder="e.g. Jane Smith"
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 07700 900000"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email address</label>
                  <input
                    type="email"
                    placeholder="e.g. jane@yourpractice.com"
                    value={contactEmail}
                    onChange={e => setContactEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-sm text-gray-600 space-y-1.5">
                <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2">Request Summary</p>
                <div>
                  <span className="text-gray-500">Items: </span>
                  {wasteItems.filter(wasteItemValid).length > 0
                    ? wasteItems.filter(wasteItemValid).map((item, i) => (
                        <span key={i}>{i > 0 && ', '}{wasteItemLabel(item)}</span>
                      ))
                    : <span className="text-gray-400 italic">None specified</span>
                  }
                </div>
                {supplies.filter(s => s.supply_type).length > 0 && (
                  <p><span className="text-gray-500">Supplies: </span>{supplies.filter(s => s.supply_type).map(supplyLabel).join(', ')}</p>
                )}
                {dateMode === 'range' ? (
                  <p><span className="text-gray-500">Dates: </span>{dateFrom || '—'}{dateTo ? ` – ${dateTo}` : ''}</p>
                ) : (
                  <p><span className="text-gray-500">Days: </span>{selectedDays.length > 0 ? selectedDays.join(', ') : '—'}</p>
                )}
                <p><span className="text-gray-500">Time slot: </span>{TIME_SLOTS.find(t => t.value === timeSlot)?.label ?? '—'}</p>
                {specialInstructions && (
                  <p><span className="text-gray-500">Instructions: </span>{specialInstructions}</p>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 flex justify-between flex-shrink-0">
          {step > 1 ? (
            <button
              onClick={() => setStep((step - 1) as 1 | 2 | 3)}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
          ) : (
            <button onClick={onClose} className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep((step + 1) as 2 | 3)}
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
              className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {submitting ? <Loader size={15} className="animate-spin" /> : <Truck size={15} />}
              Submit Request
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
