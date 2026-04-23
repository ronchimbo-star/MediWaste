import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, DollarSign, Upload, Image } from 'lucide-react';
import { useToastContext } from '../contexts/ToastContext';

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

const PAYMENT_METHODS = ['Bank Transfer', 'Credit Card', 'Debit Card', 'Cash', 'Cheque', 'Direct Debit', 'Other'];

export default function RecordPaymentModal({ invoice, onClose, onPaymentRecorded }: RecordPaymentModalProps) {
  const { toast } = useToastContext();
  const [loading, setLoading] = useState(false);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState(Number(invoice.total_amount).toFixed(2));
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Please select an image or PDF file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be under 10MB');
      return;
    }
    setProofFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setProofPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setProofPreview(null);
    }
  };

  const uploadProof = async (): Promise<string | null> => {
    if (!proofFile) return null;
    setUploading(true);
    try {
      const ext = proofFile.name.split('.').pop();
      const fileName = `payment-proofs/${invoice.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('media').upload(fileName, proofFile, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from('media').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (err: any) {
      toast.error('Failed to upload proof of payment');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const paymentAmount = Number(amount);
    if (paymentAmount <= 0 || paymentAmount > Number(invoice.total_amount)) {
      toast.error('Payment amount must be between 0 and the invoice total');
      return;
    }

    setLoading(true);
    try {
      let proofUrl: string | null = null;
      if (proofFile) {
        proofUrl = await uploadProof();
      }

      const { error: paymentError } = await supabase.from('mw_payments').insert([{
        invoice_id: invoice.id,
        payment_date: paymentDate,
        amount: paymentAmount,
        payment_method: paymentMethod,
        reference: reference || null,
        notes: notes || null,
        proof_of_payment_url: proofUrl,
        status: 'completed',
      }]);
      if (paymentError) throw paymentError;

      const { data: paymentsData, error: pqError } = await supabase.from('mw_payments').select('amount').eq('invoice_id', invoice.id);
      if (pqError) throw pqError;

      const totalPaid = paymentsData.reduce((sum, p) => sum + Number(p.amount), 0);
      const invoiceTotal = Number(invoice.total_amount);

      let newStatus = 'sent';
      if (totalPaid >= invoiceTotal) newStatus = 'paid';
      else if (totalPaid > 0) newStatus = 'partially_paid';

      const { error: invError } = await supabase.from('mw_invoices').update({ status: newStatus }).eq('id', invoice.id);
      if (invError) throw invError;

      toast.success('Payment recorded successfully');
      onPaymentRecorded();
      onClose();
    } catch {
      toast.error('Failed to record payment');
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
              <div className="p-2 bg-green-100 rounded-lg"><DollarSign className="w-6 h-6 text-green-600" /></div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Record Payment</h2>
                <p className="text-gray-600 text-sm">Invoice: {invoice.invoice_number}</p>
              </div>
            </div>
            <button onClick={onClose} disabled={loading} className="text-gray-500 hover:text-gray-700"><X className="w-6 h-6" /></button>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Customer</p>
                <p className="font-semibold text-gray-900">{invoice.customer.company_name || invoice.customer.contact_name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Invoice Total</p>
                <p className="text-2xl font-bold text-gray-900">£{Number(invoice.total_amount).toFixed(2)}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date <span className="text-red-500">*</span></label>
                <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required disabled={loading} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="0.01" max={invoice.total_amount} step="0.01" required disabled={loading} className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method <span className="text-red-500">*</span></label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} required disabled={loading} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} disabled={loading} placeholder="Transaction reference" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>

            {/* Proof of Payment Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proof of Payment</label>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4">
                {proofPreview ? (
                  <div className="relative">
                    <img src={proofPreview} alt="Proof of payment" className="max-h-40 rounded-lg mx-auto" />
                    <button type="button" onClick={() => { setProofFile(null); setProofPreview(null); }} className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-sm hover:bg-gray-100">
                      <X size={14} />
                    </button>
                  </div>
                ) : proofFile ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Image size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-600">{proofFile.name}</span>
                    </div>
                    <button type="button" onClick={() => setProofFile(null)} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center gap-2 cursor-pointer">
                    <Upload size={20} className="text-gray-400" />
                    <span className="text-sm text-gray-500">Upload proof of payment (image or PDF, max 10MB)</span>
                    <input type="file" accept="image/*,.pdf" onChange={handleFileSelect} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} disabled={loading} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" placeholder="Additional notes..." />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={loading || uploading} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50">
                {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Recording...</> : <><DollarSign className="w-4 h-4" />Record Payment</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
