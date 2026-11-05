import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useToastContext } from '../../contexts/ToastContext';
import { isV2KillSwitchOn } from '../../lib/v2';

interface V2AccessToggleProps {
  customerId: string;
  enabled: boolean;
}

export default function V2AccessToggle({ customerId, enabled }: V2AccessToggleProps) {
  const { toast } = useToastContext();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (next: boolean) => {
      const { data, error } = await supabase
        .from('mw_customers')
        .update({ v2_enabled: next })
        .eq('id', customerId)
        .select('v2_enabled')
        .maybeSingle();
      if (error) throw error;
      if (!data || data.v2_enabled !== next) throw new Error('the change was not saved');
      return next;
    },
    onSuccess: (next) => {
      toast.success(next ? 'v2 access enabled' : 'v2 access turned off', 'This applies to this customer only.');
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
    },
    onError: (err: Error) => {
      toast.error('Could not update v2 access', err.message);
    },
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-gray-900">v2 access</p>
        <p className="text-sm text-gray-500">
          {isV2KillSwitchOn
            ? 'The global v2 switch is on.'
            : 'The global v2 switch is off, so v2 is not visible to anyone yet.'}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={mutation.isPending}
        onClick={() => mutation.mutate(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${enabled ? 'bg-green-600' : 'bg-gray-300'}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`}
        />
      </button>
    </div>
  );
}
