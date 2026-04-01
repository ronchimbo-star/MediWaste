import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Save, Plus, Trash2, ArrowLeft, Send, Copy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Header from '../../components/Header';

interface LineItem {
  id?: string;
  item_type: 'product' | 'service' | 'fee' | 'discount';
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
}

export default function QuoteEditPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const quoteRequestId = searchParams.get('from_request');

  const [saving, setSaving] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);

  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postcode: '',
    notes: '',
    terms_and_conditions: 'Payment due within 30 days of acceptance.\nPrices valid for 4 weeks from date of issue.\nAll prices exclude VAT unless stated.'
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { item_type: 'service', description: '', quantity: 1, unit_price: 0, total_price: 0 }
  ]);

  const [taxRate] = useState(20);

  useEffect(() => {
    if (id) {
      loadQuote();
    } else if (quoteRequestId) {
      loadQuoteRequest();
    }
  }, [id, quoteRequestId]);

  async function loadQuote() {
    try {
      const { data: quote, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setFormData({
        company_name: quote.company_name,
        contact_name: quote.contact_name,
        email: quote.email,
        phone: quote.phone || '',
        address_line1: quote.address_line1 || '',
        address_line2: quote.address_line2 || '',
        city: quote.city || '',
        postcode: quote.postcode || '',
        notes: quote.notes || '',
        terms_and_conditions: quote.terms_and_conditions || ''
      });

      const { data: items } = await supabase
        .from('quote_line_items')
        .select('*')
        .eq('quote_id', id)
        .order('item_order');

      if (items && items.length > 0) {
        setLineItems(items.map(item => ({
          id: item.id,
          item_type: item.item_type,
          description: item.description,
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price),
          total_price: parseFloat(item.total_price),
          notes: item.notes
        })));
      }
    } catch (err) {
      console.error('Error loading quote:', err);
      alert('Failed to load quote');
    }
  }

  async function loadQuoteRequest() {
    try {
      const { data, error } = await supabase
        .from('quote_requests')
        .select('*')
        .eq('id', quoteRequestId)
        .single();

      if (error) throw error;

      setFormData({
        company_name: data.company_name,
        contact_name: data.contact_name,
        email: data.email,
        phone: data.phone || '',
        address_line1: data.address_line1 || '',
        address_line2: data.address_line2 || '',
        city: data.city || '',
        postcode: data.postcode || '',
        notes: data.message || '',
        terms_and_conditions: 'Payment due within 30 days of acceptance.\nPrices valid for 4 weeks from date of issue.\nAll prices exclude VAT unless stated.'
      });
    } catch (err) {
      console.error('Error loading quote request:', err);
    }
  }

  function addLineItem() {
    setLineItems([...lineItems, {
      item_type: 'service',
      description: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0
    }]);
  }

  function removeLineItem(index: number) {
    setLineItems(lineItems.filter((_, i) => i !== index));
  }

  function updateLineItem(index: number, field: keyof LineItem, value: any) {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'quantity' || field === 'unit_price') {
      const quantity = field === 'quantity' ? parseFloat(value) || 0 : updated[index].quantity;
      const unitPrice = field === 'unit_price' ? parseFloat(value) || 0 : updated[index].unit_price;
      updated[index].total_price = quantity * unitPrice;
    }

    setLineItems(updated);
  }

  function calculateTotals() {
    const subtotal = lineItems.reduce((sum, item) => sum + item.total_price, 0);
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  }

  async function saveQuote(publish: boolean = false) {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const totals = calculateTotals();
      const quoteData: any = {
        company_name: formData.company_name,
        contact_name: formData.contact_name,
        email: formData.email,
        phone: formData.phone,
        address_line1: formData.address_line1,
        address_line2: formData.address_line2,
        city: formData.city,
        postcode: formData.postcode,
        notes: formData.notes,
        terms_and_conditions: formData.terms_and_conditions,
        subtotal: totals.subtotal,
        tax_rate: taxRate,
        tax_amount: totals.taxAmount,
        total_amount: totals.total,
        status: publish ? 'published' : 'draft',
        created_by: user.id
      };

      if (!id) {
        const { data: quoteNumber } = await supabase.rpc('generate_quote_number');
        quoteData.quote_number = quoteNumber;

        if (quoteRequestId) {
          quoteData.quote_request_id = quoteRequestId;
        }
      }

      if (publish) {
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 28);
        quoteData.valid_until = validUntil.toISOString().split('T')[0];
        quoteData.published_at = new Date().toISOString();

        const { data: token } = await supabase.rpc('generate_share_token');
        quoteData.share_token = token;
      }

      let quoteId = id;

      if (id) {
        const { error } = await supabase
          .from('quotes')
          .update(quoteData)
          .eq('id', id);

        if (error) throw error;

        await supabase
          .from('quote_line_items')
          .delete()
          .eq('quote_id', id);
      } else {
        const { data: newQuote, error } = await supabase
          .from('quotes')
          .insert(quoteData)
          .select()
          .single();

        if (error) throw error;
        quoteId = newQuote.id;
      }

      const itemsToInsert = lineItems.map((item, index) => ({
        quote_id: quoteId,
        item_order: index,
        item_type: item.item_type,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        notes: item.notes
      }));

      const { error: itemsError } = await supabase
        .from('quote_line_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      if (publish && quoteData.share_token) {
        const link = `${window.location.origin}/quote/${quoteData.share_token}`;
        setShareLink(link);
        setShowShareModal(true);
      } else {
        navigate('/admin/quotes');
      }
    } catch (err) {
      console.error('Error saving quote:', err);
      alert('Failed to save quote');
    } finally {
      setSaving(false);
    }
  }

  const { subtotal, taxAmount, total } = calculateTotals();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/quotes')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {id ? 'Edit Quote' : 'Create Quote'}
                </h1>
                <p className="text-gray-600">Fill in the details below</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => saveQuote(false)}
                disabled={saving}
                className="px-6 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                Save Draft
              </button>
              <button
                onClick={() => saveQuote(true)}
                disabled={saving}
                className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
                Publish Quote
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900">Line Items</h2>
                <button
                  onClick={addLineItem}
                  className="text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Item
                </button>
              </div>

              <div className="space-y-4">
                {lineItems.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid md:grid-cols-6 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                        <select
                          value={item.item_type}
                          onChange={(e) => updateLineItem(index, 'item_type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="product">Product</option>
                          <option value="service">Service</option>
                          <option value="fee">Fee</option>
                          <option value="discount">Discount</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          placeholder="Item description"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Unit Price</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateLineItem(index, 'unit_price', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Total</label>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-semibold">
                            £{item.total_price.toFixed(2)}
                          </div>
                          <button
                            onClick={() => removeLineItem(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <div className="max-w-sm ml-auto space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold">£{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">VAT ({taxRate}%):</span>
                  <span className="font-semibold">£{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg border-t border-gray-200 pt-2">
                  <span className="font-bold">Total:</span>
                  <span className="font-bold text-orange-600">£{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="Any additional notes..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions</label>
              <textarea
                rows={4}
                value={formData.terms_and_conditions}
                onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>
      </div>

      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Quote Published!</h3>
            <p className="text-gray-600 mb-4">
              Your quote has been published successfully. Share this link with your customer:
            </p>
            <div className="bg-gray-50 p-3 rounded-lg mb-4 break-all">
              <code className="text-sm text-gray-800">{shareLink}</code>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareLink);
                  alert('Link copied to clipboard!');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <Copy className="w-5 h-5" />
                Copy Link
              </button>
              <button
                onClick={() => {
                  setShowShareModal(false);
                  navigate('/admin/quotes');
                }}
                className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
