import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Lock, Loader2, CheckCircle, AlertCircle, Key } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';

export default function FinancialPinSettingsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('reset');

  const [hasPin, setHasPin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastChanged, setLastChanged] = useState<string | null>(null);

  // Reset flow state
  const [resetNewPin, setResetNewPin] = useState('');
  const [resetConfirmPin, setResetConfirmPin] = useState('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    supabase.from('financial_pins')
      .select('last_changed_at')
      .eq('user_id', user?.id || '')
      .maybeSingle()
      .then(({ data }) => {
        setHasPin(!!data);
        setLastChanged(data?.last_changed_at || null);
        setLoading(false);
      });
  }, [user?.id]);

  const handleSetPin = async (action: 'set' | 'change') => {
    setError('');
    setSuccess('');

    if (!newPin || !/^\d{4}$/.test(newPin)) {
      setError('PIN must be exactly 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }
    if (action === 'change' && !currentPin) {
      setError('Please enter your current PIN.');
      return;
    }

    setSaving(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('set-financial-pin', {
        body: { newPin, confirmPin, currentPin: action === 'change' ? currentPin : undefined, action },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setHasPin(true);
      setSuccess(action === 'change' ? 'PIN changed successfully.' : 'PIN set successfully.');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setLastChanged(new Date().toISOString());
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save PIN');
    } finally {
      setSaving(false);
    }
  };

  const handleResetComplete = async () => {
    setError('');
    setSuccess('');

    if (!resetNewPin || !/^\d{4}$/.test(resetNewPin)) {
      setError('PIN must be exactly 4 digits.');
      return;
    }
    if (resetNewPin !== resetConfirmPin) {
      setError('PINs do not match.');
      return;
    }

    setResetting(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('reset-financial-pin', {
        body: { action: 'complete', resetToken, newPin: resetNewPin, confirmPin: resetConfirmPin },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setHasPin(true);
      setSuccess('PIN reset successfully. You can now use it to unlock financial information.');
      setLastChanged(new Date().toISOString());
      setResetNewPin('');
      setResetConfirmPin('');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset PIN');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-red-600" /></div>;
  }

  return (
    <AdminLayout pageTitle="Financial PIN" breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'Settings', path: '/admin/settings' }, { label: 'Financial PIN' }]}>
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
          <Key size={20} className="text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial PIN</h1>
          <p className="text-sm text-gray-600">Protect invoice and payment details on certificate pages</p>
        </div>
      </div>

      {lastChanged && (
        <p className="text-sm text-gray-500 mb-6">
          PIN last changed: {new Date(lastChanged).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start gap-2">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" /> <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-start gap-2">
          <CheckCircle size={18} className="flex-shrink-0 mt-0.5" /> <span>{success}</span>
        </div>
      )}

      {/* Reset from email link */}
      {resetToken ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock size={18} className="text-red-600" />
            <h2 className="text-lg font-semibold text-gray-900">Create New PIN</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">Enter your new 4-digit PIN to replace the forgotten one.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={resetNewPin}
                onChange={(e) => setResetNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-32 px-4 py-3 text-center text-2xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={resetConfirmPin}
                onChange={(e) => setResetConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-32 px-4 py-3 text-center text-2xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleResetComplete}
              disabled={resetting}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-medium text-sm disabled:opacity-50"
            >
              {resetting ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              {resetting ? 'Resetting...' : 'Reset PIN'}
            </button>
          </div>
        </div>
      ) : !hasPin ? (
        /* Set PIN for the first time */
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock size={18} className="text-red-600" />
            <h2 className="text-lg font-semibold text-gray-900">Set Financial PIN</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Choose a 4-digit PIN. You'll need this to view invoice and payment details on certificate pages.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-32 px-4 py-3 text-center text-2xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-32 px-4 py-3 text-center text-2xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => handleSetPin('set')}
              disabled={saving}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-medium text-sm disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              {saving ? 'Saving...' : 'Set PIN'}
            </button>
          </div>
        </div>
      ) : (
        /* Change existing PIN */
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Key size={18} className="text-red-600" />
            <h2 className="text-lg font-semibold text-gray-900">Change PIN</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Current PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-32 px-4 py-3 text-center text-2xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-32 px-4 py-3 text-center text-2xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-32 px-4 py-3 text-center text-2xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => handleSetPin('change')}
              disabled={saving}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-medium text-sm disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
              {saving ? 'Saving...' : 'Change PIN'}
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">How the PIN works</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>The PIN protects invoice and payment details on certificate pages</li>
          <li>The section locks automatically after 10 minutes of inactivity</li>
          <li>After 5 failed attempts, the PIN is temporarily locked for 5 minutes</li>
          <li>If you forget your PIN, use "Forgot PIN?" to receive a reset link by email</li>
        </ul>
      </div>
    </div>
    </AdminLayout>
  );
}
