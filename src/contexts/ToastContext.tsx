import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toast: {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToastContext() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToastContext must be used inside ToastProvider');
  return ctx;
}

function ToastItem({ t, onRemove }: { t: Toast; onRemove: (id: string) => void }) {
  const colors: Record<ToastType, string> = {
    success: 'border-green-500',
    error: 'border-red-500',
    info: 'border-blue-500',
    warning: 'border-amber-500',
  };
  const icons: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    info: 'i',
    warning: '!',
  };
  const iconBg: Record<ToastType, string> = {
    success: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    warning: 'bg-amber-100 text-amber-700',
  };

  return (
    <div
      className={`flex items-start gap-3 bg-white border-l-4 ${colors[t.type]} rounded-lg shadow-xl p-4 min-w-[280px] max-w-[380px]`}
      style={{ animation: 'toastSlideIn 0.3s ease-out' }}
    >
      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${iconBg[t.type]}`}>
        {icons[t.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{t.title}</p>
        {t.message && <p className="text-xs text-gray-500 mt-0.5">{t.message}</p>}
      </div>
      <button onClick={() => onRemove(t.id)} className="flex-shrink-0 text-gray-400 hover:text-gray-600 text-lg leading-none mt-0.5">×</button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

  const toast = {
    success: (title: string, message?: string) => addToast('success', title, message),
    error: (title: string, message?: string) => addToast('error', title, message),
    info: (title: string, message?: string) => addToast('info', title, message),
    warning: (title: string, message?: string) => addToast('warning', title, message),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem t={t} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
