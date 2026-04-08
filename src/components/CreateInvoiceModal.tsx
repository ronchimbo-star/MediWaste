import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Plus, Trash2 } from 'lucide-react';
import { useToastContext } from '../contexts/ToastContext';

interface CreateInvoiceModalProps {
  onClose: () => void;
  onInvoiceCreated: () => void;
}

interface Customer {
  id: string;
  customer_number: string;
  company_name: string;
  contact_name: string;
}

interface ServicePlan {
  name: string;
  price: number;
}

interface Subscription {
  id: string;
  service_plan: ServicePlan;
}

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export default function CreateInvoiceModal({ onClose, onInvoiceCreated }: CreateInvoiceModalProps) {
  const { toast } = useToastContext();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([{
    description: '',
    quantity: 1,
    unit_price: 0,
    total: 0
  }]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      fetchSubscriptions(selectedCustomer);
    }
  }, [selectedCustomer]);

  useEffect(() => {
    const issue = new Date(issueDate);
    const due = new Date(issue);
    due.setDate(due.getDate() + 30);
    setDueDate(due.toISOString().split('T')[0]);
  }, [issueDate]);

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from('mw_customers')
      .select('id, customer_number, company_name, contact_name')
      .eq('status', 'active')
      .order('company_name');

    if (data) setCustomers(data);
  };

  const fetchSubscriptions = async (customerId: string) => {
    const { data } = await supabase
      .from('mw_subscriptions')
      .select(`
        id,
        service_plan:mw_service_plans(name, price)
      `)
      .eq('customer_id', customerId)
      .eq('status', 'active');

    if (data) {
      const formattedData = data.map(sub => ({
        id: sub.id,
        service_plan: Array.isArray(sub.service_plan) ? sub.service_plan[0] : sub.service_plan
      })) as Subscription[];
      setSubscriptions(formattedData);
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      description: '',
      quantity: 1,
      unit_price: 0,
      total: 0
    }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'quantity' || field === 'unit_price') {
      updated[index].total = updated[index].quantity * updated[index].unit_price;
    }

    setLineItems(updated);
  };

  const addSubscriptionAsLineItem = (subscription: Subscription) => {
    const existingIndex = lineItems.findIndex(
      item => item.description === subscription.service_plan.name
    );

    if (existingIndex >= 0) {
      const updated = [...lineItems];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].unit_price;
      setLineItems(updated);
    } else {
      setLineItems([...lineItems, {
        description: subscription.service_plan.name,
        quantity: 1,
        unit_price: Number(subscription.service_plan.price),
        total: Number(subscription.service_plan.price)
      }]);
    }
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + item.total, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomer || lineItems.length === 0) {
      toast.error('Please select a customer and add at least one line item');
      return;
    }

    if (lineItems.some(item => !item.description || item.unit_price <= 0)) {
      toast.error('Please fill in all line item details');
      return;
    }

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const invoiceNumber = `INV${today}-${Date.now().toString().slice(-4)}`;
      const totalAmount = calculateTotal();

      const { data: invoiceData, error: invoiceError } = await supabase
        .from('mw_invoices')
        .insert([{
          customer_id: selectedCustomer,
          invoice_number: invoiceNumber,
          issue_date: issueDate,
          due_date: dueDate,
          total_amount: totalAmount,
          status: 'draft',
          notes: notes || null
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      const lineItemsData = lineItems.map(item => ({
        invoice_id: invoiceData.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total
      }));

      const { error: lineItemsError } = await supabase
        .from('mw_invoice_line_items')
        .insert(lineItemsData);

      if (lineItemsError) throw lineItemsError;

      toast.success(`Invoice ${invoiceNumber} created successfully`);
      onInvoiceCreated();
      onClose();
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Create Invoice</h2>
              <p className="text-gray-600 mt-1">Generate a new invoice for a customer</p>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
                >
                  <option value="">Select a customer...</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.company_name || customer.contact_name} ({customer.customer_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Issue Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
                />
              </div>
            </div>

            {selectedCustomer && subscriptions.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Quick Add from Subscriptions</h3>
                <div className="flex flex-wrap gap-2">
                  {subscriptions.map(sub => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => addSubscriptionAsLineItem(sub)}
                      disabled={loading}
                      className="px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 text-sm transition-colors"
                    >
                      {sub.service_plan.name} - £{Number(sub.service_plan.price).toFixed(2)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Line Items <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={addLineItem}
                  disabled={loading}
                  className="flex items-center gap-1 text-sm text-[#F59E0B] hover:text-[#D97706]"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              <div className="space-y-3">
                {lineItems.map((item, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        placeholder="Description"
                        required
                        disabled={loading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
                      />
                    </div>
                    <div className="w-20">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', Number(e.target.value))}
                        min="1"
                        required
                        disabled={loading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
                      />
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateLineItem(index, 'unit_price', Number(e.target.value))}
                        min="0"
                        step="0.01"
                        required
                        disabled={loading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="w-32">
                      <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                        £{item.total.toFixed(2)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      disabled={loading || lineItems.length === 1}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t flex justify-end">
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-2xl font-bold text-gray-900">£{calculateTotal().toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
                placeholder="Add any additional notes or terms..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Invoice'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}