import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, DollarSign } from 'lucide-react';

interface RecordPaymentModalProps {
  invoice: {
    id: string;
    invoice_number: string;
    total_amount: number;
    customer: {
      company_name: string;
      contact_name: string;
    };
  };
  onClose: () => void;
  onPaymentRecorded: () => void;
}

const PAYMENT_METHODS = [
  'Bank Transfer',
  'Credit Card',
  'Debit Card',
  'Cash',
  'Cheque',
  'Direct Debit',
  'Other'
];

export default function RecordPaymentModal({ invoice, onClose, onPaymentRecorded }: RecordPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState(Number(invoice.total_amount).toFixed(2));
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const paymentAmount = Number(amount);
    if (paymentAmount <= 0 || paymentAmount > Number(invoice.total_amount)) {
      alert('Payment amount must be between 0 and the invoice total');
      return;
    }

    setLoading(true);
    try {
      const { error: paymentError } = await supabase
        .from('mw_payments')
        .insert([{
          invoice_id: invoice.id,
          payment_date: paymentDate,
          amount: paymentAmount,
          payment_method: paymentMethod,
          reference: reference || null,
          notes: notes || null
        }]);

      if (paymentError) throw paymentError;

      const { data: paymentsData, error: paymentsQueryError } = await supabase
        .from('mw_payments')
        .select('amount')
        .eq('invoice_id', invoice.id);

      if (paymentsQueryError) throw paymentsQueryError;

      const totalPaid = paymentsData.reduce((sum, p) => sum + Number(p.amount), 0);
      const invoiceTotal = Number(invoice.total_amount);

      let newStatus = 'sent';
      if (totalPaid >= invoiceTotal) {
        newStatus = 'paid';
      } else if (totalPaid > 0) {
        newStatus = 'partially_paid';
      }

      const { error: invoiceError } = await supabase
        .from('mw_invoices')
        .update({ status: newStatus })
        .eq('id', invoice.id);

      if (invoiceError) throw invoiceError;

      alert('Payment recorded successfully');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      onPaymentRecorded();
      onClose();
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Record Payment</h2>
                <p className="text-gray-600">Invoice: {invoice.invoice_number}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Customer</p>
                <p className="font-semibold text-gray-900">
                  {invoice.customer.company_name || invoice.customer.contact_name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Invoice Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  £{Number(invoice.total_amount).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="0.01"
                    max={invoice.total_amount}
                    step="0.01"
                    required
                    disabled={loading}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
                >
                  {PAYMENT_METHODS.map(method => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reference (optional)
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  disabled={loading}
                  placeholder="Transaction reference"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
                />
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
                placeholder="Add any additional notes about this payment..."
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Recording this payment will update the invoice status automatically.
                If the full amount is paid, the invoice will be marked as "Paid".
              </p>
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
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Recording...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4" />
                    Record Payment
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}