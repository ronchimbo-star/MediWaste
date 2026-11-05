import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { StickyNote, Plus, Check, Trash2, Loader, AlertCircle, User } from 'lucide-react';

interface Note {
  id: string;
  customer_id: string | null;
  body: string;
  note_type: string;
  is_completed: boolean;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
}

interface Customer {
  id: string;
  company_name: string;
}

interface Props {
  customerId?: string;
  title?: string;
  compact?: boolean;
}

function fmt(d: string) {
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function NotesPanel({ customerId, title = 'Notes', compact = false }: Props) {
  const qc = useQueryClient();
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterCompleted, setFilterCompleted] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  const isGlobalPanel = !customerId;

  const queryKey = ['admin-notes', customerId ?? 'global'];

  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey,
    queryFn: async () => {
      let q = supabase
        .from('mw_admin_notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (customerId) {
        q = q.eq('customer_id', customerId);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers-for-notes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, company_name')
        .order('company_name');
      if (error) throw error;
      return data || [];
    },
    enabled: isGlobalPanel,
    staleTime: 5 * 60 * 1000,
  });

  const customerMap = new Map(customers.map(c => [c.id, c.company_name]));

  const markComplete = useMutation({
    mutationFn: async (note: Note) => {
      const { error } = await supabase
        .from('mw_admin_notes')
        .update({
          is_completed: !note.is_completed,
          completed_at: !note.is_completed ? new Date().toISOString() : null,
        })
        .eq('id', note.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('mw_admin_notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      if (isGlobalPanel) {
        qc.invalidateQueries({ queryKey: ['admin-notes', selectedCustomerId] });
      }
    },
  });

  async function addNote() {
    if (!newNote.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const assignedCustomerId = customerId ?? (selectedCustomerId || null);
    const { error } = await supabase.from('mw_admin_notes').insert([{
      customer_id: assignedCustomerId,
      body: newNote.trim(),
      note_type: 'manual',
      created_by: user?.id ?? null,
    }]);
    setSaving(false);
    if (!error) {
      setNewNote('');
      setSelectedCustomerId('');
      qc.invalidateQueries({ queryKey });
      if (assignedCustomerId) {
        qc.invalidateQueries({ queryKey: ['admin-notes', assignedCustomerId] });
      }
    }
  }

  const filtered = filterCompleted ? notes.filter(n => !n.is_completed) : notes;

  return (
    <div className={compact ? '' : 'bg-white rounded-lg border border-gray-200 shadow-sm p-5'}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StickyNote size={16} className="text-amber-500" />
          <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
          {notes.filter(n => !n.is_completed).length > 0 && (
            <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded-full">
              {notes.filter(n => !n.is_completed).length}
            </span>
          )}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filterCompleted}
            onChange={e => setFilterCompleted(e.target.checked)}
            className="rounded"
          />
          Hide completed
        </label>
      </div>

      <div className="flex flex-col gap-2 mb-4">
        <div className="flex gap-2">
          <textarea
            rows={2}
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addNote(); }}
            placeholder="Add a note... (Ctrl+Enter to save)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none"
          />
          <button
            onClick={addNote}
            disabled={!newNote.trim() || saving}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed self-start"
          >
            {saving ? <Loader size={14} className="animate-spin" /> : <Plus size={14} />}
            Add
          </button>
        </div>

        {isGlobalPanel && customers.length > 0 && (
          <div className="flex items-center gap-2">
            <User size={13} className="text-gray-400 flex-shrink-0" />
            <select
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
              className="flex-1 px-2 py-1.5 border border-gray-200 rounded-md text-xs text-gray-600 bg-white focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            >
              <option value="">No customer (global note)</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader size={18} className="animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-6">
          <AlertCircle size={20} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No notes yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(note => {
            const linkedCustomer = isGlobalPanel && note.customer_id ? customerMap.get(note.customer_id) : null;
            return (
              <div
                key={note.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  note.is_completed
                    ? 'bg-gray-50 border-gray-200 opacity-60'
                    : note.note_type === 'auto' || note.note_type === 'system'
                      ? 'bg-blue-50 border-blue-200'
                      : linkedCustomer
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-white border-gray-200'
                }`}
              >
                <button
                  onClick={() => markComplete.mutate(note)}
                  className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    note.is_completed
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 hover:border-green-400'
                  }`}
                >
                  {note.is_completed && <Check size={10} strokeWidth={3} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${note.is_completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {note.body}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <p className="text-xs text-gray-400">{fmt(note.created_at)}</p>
                    {linkedCustomer && note.customer_id && (
                      <Link
                        to={`/admin/customers/${note.customer_id}`}
                        className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded hover:bg-amber-200 transition-colors"
                      >
                        <User size={10} />
                        {linkedCustomer}
                      </Link>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteNote.mutate(note.id)}
                  className="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors mt-0.5"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
