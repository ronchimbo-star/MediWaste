import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Loader2, CheckCircle } from 'lucide-react';
import type { InvoiceSettings } from '../../types/invoice';

export default function PaymentSettingsPage() {
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from('mw_invoice_settings').select('*').eq('id', 'default').maybeSingle()
      .then(({ data }) => {
        if (data) setSettings(data as InvoiceSettings);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    try {
      const { error } = await supabase.from('mw_invoice_settings').update({
        bank_name: settings.bank_name,
        account_name: settings.account_name,
        sort_code: settings.sort_code,
        account_number: settings.account_number,
        vat_number: settings.vat_number,
        payment_instructions: settings.payment_instructions,
        trading_name: settings.trading_name,
        business_address: settings.business_address,
        business_email: settings.business_email,
        business_phone: settings.business_phone,
        website: settings.website,
        company_registration_number: settings.company_registration_number,
        vat_rate_default: settings.vat_rate_default,
        payment_link_url: settings.payment_link_url,
        default_payment_terms_days: settings.default_payment_terms_days,
        invoice_prefix: settings.invoice_prefix,
        invoice_include_year: settings.invoice_include_year,
        invoice_padding: settings.invoice_padding,
        updated_at: new Date().toISOString(),
      }).eq('id', 'default');

      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-red-600" /></div>;
  if (!settings) return <div className="text-center py-20 text-gray-600">Settings not found</div>;

  const update = (field: string, value: any) => setSettings({ ...settings, [field]: value });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Payment Details Settings</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Details</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Input label="Legal Business Name" value={settings.account_name} onChange={(v) => update('account_name', v)} />
          <Input label="Trading Name" value={settings.trading_name || ''} onChange={(v) => update('trading_name', v)} />
          <Input label="Business Address" value={settings.business_address || ''} onChange={(v) => update('business_address', v)} textarea />
          <Input label="Business Email" value={settings.business_email || ''} onChange={(v) => update('business_email', v)} />
          <Input label="Business Phone" value={settings.business_phone || ''} onChange={(v) => update('business_phone', v)} />
          <Input label="Website" value={settings.website || ''} onChange={(v) => update('website', v)} />
          <Input label="Company Registration Number" value={settings.company_registration_number || ''} onChange={(v) => update('company_registration_number', v)} />
          <Input label="VAT Registration Number" value={settings.vat_number} onChange={(v) => update('vat_number', v)} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Bank Details</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Input label="Bank Name" value={settings.bank_name} onChange={(v) => update('bank_name', v)} />
          <Input label="Account Name" value={settings.account_name} onChange={(v) => update('account_name', v)} />
          <Input label="Sort Code" value={settings.sort_code} onChange={(v) => update('sort_code', v)} />
          <Input label="Account Number" value={settings.account_number} onChange={(v) => update('account_number', v)} />
          <Input label="Payment Instructions" value={settings.payment_instructions || ''} onChange={(v) => update('payment_instructions', v)} textarea />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Link & Terms</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Input label="ANNA / Stripe Payment Link URL" value={settings.payment_link_url || ''} onChange={(v) => update('payment_link_url', v)} />
          <Input label="Default VAT Rate (%)" type="number" value={String(settings.vat_rate_default)} onChange={(v) => update('vat_rate_default', parseFloat(v) || 20)} />
          <Input label="Default Payment Terms (days)" type="number" value={String(settings.default_payment_terms_days)} onChange={(v) => update('default_payment_terms_days', parseInt(v) || 30)} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Numbering</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Input label="Invoice Prefix" value={settings.invoice_prefix} onChange={(v) => update('invoice_prefix', v)} />
          <Input label="Number Padding (e.g. 4 = 0001)" type="number" value={String(settings.invoice_padding)} onChange={(v) => update('invoice_padding', parseInt(v) || 4)} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Include Year</label>
            <select
              value={String(settings.invoice_include_year)}
              onChange={(e) => update('invoice_include_year', e.target.value === 'true')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
            >
              <option value="true">Yes (MW-2026-0001)</option>
              <option value="false">No (MW-0001)</option>
            </select>
          </div>
          <Input label="Next Sequence Number" type="number" value={String(settings.invoice_next_sequence)} onChange={(v) => update('invoice_next_sequence', parseInt(v) || 1)} />
        </div>
        <p className="mt-3 text-sm text-gray-500">
          Preview: {settings.invoice_prefix}{settings.invoice_include_year ? `-${new Date().getFullYear()}` : ''}-{String(settings.invoice_next_sequence).padStart(settings.invoice_padding, '0')}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {saved && (
          <span className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle size={16} /> Saved successfully
          </span>
        )}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', textarea }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; textarea?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent" />
      )}
    </div>
  );
}
