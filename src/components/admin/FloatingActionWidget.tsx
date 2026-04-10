import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus,
  X,
  Users,
  FileText,
  Truck,
  StickyNote,
  ClipboardList,
  Receipt,
} from 'lucide-react';

interface ActionItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: string;
}

interface Props {
  onOpenNote?: () => void;
  onOpenCollection?: () => void;
}

export default function FloatingActionWidget({ onOpenNote, onOpenCollection }: Props) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const actions: ActionItem[] = [
    {
      icon: <Users size={16} />,
      label: 'New Customer',
      color: 'bg-blue-500 hover:bg-blue-600',
      onClick: () => { navigate('/admin/customers'); setOpen(false); },
    },
    {
      icon: <ClipboardList size={16} />,
      label: 'New Quote',
      color: 'bg-green-500 hover:bg-green-600',
      onClick: () => { navigate('/admin/quotes/create'); setOpen(false); },
    },
    {
      icon: <Receipt size={16} />,
      label: 'New Invoice',
      color: 'bg-teal-500 hover:bg-teal-600',
      onClick: () => { navigate('/admin/invoices'); setOpen(false); },
    },
    {
      icon: <Truck size={16} />,
      label: 'Collection Request',
      color: 'bg-red-500 hover:bg-red-600',
      onClick: () => {
        if (onOpenCollection) {
          onOpenCollection();
        } else {
          navigate('/admin/jobs');
        }
        setOpen(false);
      },
    },
    {
      icon: <FileText size={16} />,
      label: 'New Agreement',
      color: 'bg-orange-500 hover:bg-orange-600',
      onClick: () => { navigate('/admin/service-agreements/create'); setOpen(false); },
    },
    {
      icon: <StickyNote size={16} />,
      label: 'Quick Note',
      color: 'bg-amber-500 hover:bg-amber-600',
      onClick: () => {
        if (onOpenNote) {
          onOpenNote();
        } else {
          navigate('/admin/notes');
        }
        setOpen(false);
      },
    },
  ];

  return (
    <div ref={ref} className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {open && (
        <div className="flex flex-col items-end gap-2">
          {actions.map((action, i) => (
            <div
              key={action.label}
              className="flex items-center gap-3"
              style={{
                animation: `fadeSlideUp 0.15s ease-out ${i * 40}ms both`,
              }}
            >
              <span className="bg-gray-900 text-white text-xs font-medium px-2.5 py-1 rounded-lg whitespace-nowrap shadow-lg">
                {action.label}
              </span>
              <button
                onClick={action.onClick}
                className={`w-10 h-10 rounded-full ${action.color} text-white flex items-center justify-center shadow-lg transition-all duration-150`}
              >
                {action.icon}
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white transition-all duration-200 ${
          open ? 'bg-gray-700 hover:bg-gray-800 rotate-45' : 'bg-slate-800 hover:bg-slate-700'
        }`}
      >
        {open ? <X size={22} /> : <Plus size={22} />}
      </button>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
