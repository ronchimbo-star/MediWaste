import { CheckCircle, XCircle, AlertCircle, AlertTriangle, X } from 'lucide-react';
import { Toast } from '../hooks/useToast';

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const config = {
  success: {
    icon: CheckCircle,
    bg: 'bg-white',
    border: 'border-l-4 border-green-500',
    iconColor: 'text-green-500',
    titleColor: 'text-gray-900',
    msgColor: 'text-gray-500',
  },
  error: {
    icon: XCircle,
    bg: 'bg-white',
    border: 'border-l-4 border-red-500',
    iconColor: 'text-red-500',
    titleColor: 'text-gray-900',
    msgColor: 'text-gray-500',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-white',
    border: 'border-l-4 border-amber-500',
    iconColor: 'text-amber-500',
    titleColor: 'text-gray-900',
    msgColor: 'text-gray-500',
  },
  info: {
    icon: AlertCircle,
    bg: 'bg-white',
    border: 'border-l-4 border-blue-500',
    iconColor: 'text-blue-500',
    titleColor: 'text-gray-900',
    msgColor: 'text-gray-500',
  },
};

export default function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        const c = config[toast.type];
        const Icon = c.icon;
        return (
          <div
            key={toast.id}
            className={`${c.bg} ${c.border} rounded-xl shadow-xl pointer-events-auto flex items-start gap-3 p-4 animate-slide-in`}
            style={{ animation: 'slideInRight 0.3s ease-out' }}
          >
            <Icon className={`${c.iconColor} flex-shrink-0 mt-0.5`} size={20} />
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm ${c.titleColor}`}>{toast.title}</p>
              {toast.message && <p className={`text-sm mt-0.5 ${c.msgColor}`}>{toast.message}</p>}
            </div>
            <button onClick={() => onRemove(toast.id)} className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors ml-1">
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
