import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Lock, Unlock, Loader2, Download, FileText, AlertCircle } from 'lucide-react';
import { formatGBP, formatDate, STATUS_COLORS, STATUS_LABELS } from '../utils/invoiceCalculations';

interface LinkedInvoice {
  id: string;
  invoice_number: string;
  public_token: string;
  status: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  paid_at: string | null;
  recipient_email: string | null;
  payment_reference: string | null;
  customer_reference: string | null;
  notes: string | null;
}

interface FinancialSectionProps {
  customerId: string;
  certificateId: string;
}

export default function FinancialSection({ customerId, certificateId }: FinancialSectionProps) {
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState(false);
  const [, setSessionToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [noPin, setNoPin] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [invoices, setInvoices] = useState<LinkedInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [showForgotPin, setShowForgotPin] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-lock on unmount
  useEffect(() => {
    return () => {
      setUnlocked(false);
      setSessionToken(null);
    setExpiresAt(null);
    };
  }, []);

  // Session timeout check
  useEffect(() => {
    if (!unlocked || !expiresAt) return;
    const checkExpiry = setInterval(() => {
      if (new Date(expiresAt) < new Date()) {
        setUnlocked(false);
        setSessionToken(null);
    setExpiresAt(null);
        setExpiresAt(null);
      }
    }, 30000);
    return () => clearInterval(checkExpiry);
  }, [unlocked, expiresAt]);

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newDigits = [...pinDigits];
    newDigits[index] = value;
    setPinDigits(newDigits);
    setError('');
    if (value && index < 3) {
      pinRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  };

  const handleUnlock = async () => {
    const pin = pinDigits.join('');
    if (pin.length !== 4) {
      setError('Please enter all 4 digits.');
      return;
    }
    setVerifying(true);
    setError('');
    try {
      const { data, error: fnError } = await supabase.functions.invoke('verify-financial-pin', {
        body: { pin },
      });
      if (fnError) throw fnError;
      if (data?.error) {
        setError(data.error);
        setNoPin(data.noPin || false);
        setAttemptsRemaining(data.attemptsRemaining ?? null);
        setLocked(data.locked || false);
        return;
      }
      if (data?.success) {
        setUnlocked(true);
        setExpiresAt(data.expiresAt);
        setPinDigits(['', '', '', '']);
        setError('');
        setNoPin(false);
        setAttemptsRemaining(null);
        setLocked(false);
        await fetchInvoices();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify PIN');
    } finally {
      setVerifying(false);
    }
  };

  const handleLock = () => {
    setUnlocked(false);
    setSessionToken(null);
    setExpiresAt(null);
    setInvoices([]);
  };

  const fetchInvoices = async () => {
    setLoadingInvoices(true);
    try {
      // Fetch invoices linked to this certificate or customer
      const { data, error } = await supabase
        .from('mw_invoices')
        .select('id, invoice_number, public_token, status, issue_date, due_date, total_amount, amount_paid, amount_due, paid_at, recipient_email, payment_reference, customer_reference, notes')
        .or(`certificate_id.eq.${certificateId},customer_id.eq.${customerId}`)
        .in('status', ['sent', 'viewed', 'partially_paid', 'paid', 'overdue'])
        .order('issue_date', { ascending: false });
      if (error) throw error;
      setInvoices((data || []) as LinkedInvoice[]);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleForgotPin = async () => {
    if (!forgotEmail) return;
    try {
      await supabase.functions.invoke('reset-financial-pin', {
        body: { action: 'request', email: forgotEmail },
      });
      setForgotSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    }
  };

  const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + Number(inv.amount_paid), 0);
  const totalOutstanding = invoices.reduce((sum, inv) => sum + Number(inv.amount_due), 0);

  if (!user) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="p-5 border-b border-gray-100 flex items-center gap-2">
        {unlocked ? <Unlock size={16} className="text-green-600" /> : <Lock size={16} className="text-gray-500" />}
        <h2 className="font-semibold text-gray-900">Financial Information</h2>
        {unlocked && expiresAt && (
          <span className="ml-auto text-xs text-gray-400">
            Session expires at {new Date(expiresAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {!unlocked ? (
        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Lock size={18} className="text-gray-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600">
                Financial information is protected. Enter your 4-digit PIN to view invoices and payment details.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 mb-4">
            {pinDigits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { pinRefs.current[i] = el; }}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handlePinChange(i, e.target.value)}
                onKeyDown={(e) => handlePinKeyDown(i, e)}
                className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                disabled={verifying || locked}
              />
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg mb-4 text-sm flex items-start gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {attemptsRemaining !== null && attemptsRemaining > 0 && !locked && (
            <p className="text-center text-sm text-amber-600 mb-4">
              {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining
            </p>
          )}

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleUnlock}
              disabled={verifying || locked || pinDigits.join('').length !== 4}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {verifying ? <Loader2 size={16} className="animate-spin" /> : <Unlock size={16} />}
              {verifying ? 'Verifying...' : 'Unlock'}
            </button>
          </div>

          {noPin && (
            <p className="text-center text-sm text-gray-500 mt-4">
              No PIN set. Visit <span className="text-red-600 font-medium">Settings → Financial PIN</span> to create one.
            </p>
          )}

          {!showForgotPin ? (
            <button
              onClick={() => setShowForgotPin(true)}
              className="block mx-auto mt-4 text-sm text-gray-500 hover:text-gray-700"
            >
              Forgot PIN?
            </button>
          ) : !forgotSent ? (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-3">Enter your account email to receive a reset link:</p>
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3"
              />
              <button
                onClick={handleForgotPin}
                disabled={!forgotEmail}
                className="w-full bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Send Reset Link
              </button>
            </div>
          ) : (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                If an account exists for that email, a reset link has been sent. Check your inbox.
              </p>
            </div>
          )}
        </div>
      ) : loadingInvoices ? (
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="p-6 text-center">
          <FileText size={24} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No invoices linked to this certificate.</p>
          <button onClick={handleLock} className="mt-4 text-sm text-gray-500 hover:text-gray-700">
            Lock financial information
          </button>
        </div>
      ) : (
        <div className="p-5">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-xs text-blue-600 font-medium">Total Invoiced</p>
              <p className="text-lg font-bold text-blue-900">{formatGBP(totalInvoiced)}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-xs text-green-600 font-medium">Total Paid</p>
              <p className="text-lg font-bold text-green-900">{formatGBP(totalPaid)}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <p className="text-xs text-amber-600 font-medium">Outstanding</p>
              <p className="text-lg font-bold text-amber-900">{formatGBP(totalOutstanding)}</p>
            </div>
          </div>

          {/* Invoice cards */}
          <div className="space-y-3">
            {invoices.map((inv) => {
              const isOverdue = !['paid', 'cancelled', 'void'].includes(inv.status) && new Date(inv.due_date) < new Date();
              return (
                <div key={inv.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{inv.invoice_number}</p>
                      <p className="text-xs text-gray-500">Issued {formatDate(inv.issue_date)} · Due {formatDate(inv.due_date)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${isOverdue ? STATUS_COLORS.overdue : STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-600'}`}>
                      {isOverdue ? 'Overdue' : STATUS_LABELS[inv.status] || inv.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <span className="text-gray-500">Total: </span>
                      <span className="font-medium text-gray-900">{formatGBP(inv.total_amount)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Paid: </span>
                      <span className="font-medium text-green-600">{formatGBP(inv.amount_paid)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Outstanding: </span>
                      <span className="font-medium text-amber-600">{formatGBP(inv.amount_due)}</span>
                    </div>
                    {inv.paid_at && (
                      <div>
                        <span className="text-gray-500">Paid Date: </span>
                        <span className="font-medium text-green-600">{formatDate(inv.paid_at)}</span>
                      </div>
                    )}
                  </div>

                  {inv.payment_reference && (
                    <p className="text-xs text-gray-400 mb-3">Payment ref: {inv.payment_reference}</p>
                  )}

                  <div className="flex items-center gap-2">
                    <a
                      href={`/invoice/${inv.public_token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      <FileText size={14} /> View Invoice
                    </a>
                    <a
                      href={`/invoice/${inv.public_token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800"
                    >
                      <Download size={14} /> PDF
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={handleLock} className="mt-5 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <Lock size={14} /> Lock financial information
          </button>
        </div>
      )}
    </div>
  );
}
