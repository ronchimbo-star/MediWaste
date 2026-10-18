import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import { useEffect } from 'react';

interface NotificationProps {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  onClose: () => void;
  duration?: number;
}

export default function Notification({ type, title, message, onClose, duration = 5000 }: NotificationProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const styles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-500',
      icon: <CheckCircle className="w-6 h-6 text-green-600" />,
      titleColor: 'text-green-900',
      messageColor: 'text-green-700'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-500',
      icon: <XCircle className="w-6 h-6 text-red-600" />,
      titleColor: 'text-red-900',
      messageColor: 'text-red-700'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-500',
      icon: <AlertCircle className="w-6 h-6 text-blue-600" />,
      titleColor: 'text-blue-900',
      messageColor: 'text-blue-700'
    }
  };

  const style = styles[type];

  return (
    <div className="fixed top-4 right-4 z-[9999] max-w-md w-full animate-slide-in">
      <div className={`${style.bg} border-l-4 ${style.border} rounded-lg shadow-2xl p-5`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {style.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-base ${style.titleColor} mb-1`}>
              {title}
            </p>
            <p className={`text-sm ${style.messageColor}`}>
              {message}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
