import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useToastContext } from '../../contexts/ToastContext';
import { Sparkles, RefreshCw, Mail, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';

interface Briefing {
  id: string;
  briefing_date: string;
  summary_html: string;
  summary_text: string;
  email_count: number;
  urgent_count: number;
  followup_count: number;
  quote_count: number;
  payment_count: number;
  actions: any[];
  email_sent: boolean;
  created_at: string;
}

export default function AiBriefingPage() {
  const { toast } = useToastContext();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [selectedBriefing, setSelectedBriefing] = useState<Briefing | null>(null);

  const { data: briefings = [], isLoading } = useQuery<Briefing[]>({
    queryKey: ['ai-briefings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mw_ai_briefings')
        .select('*')
        .order('briefing_date', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
  });

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/daily-email-briefing`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sendEmail: true }),
        }
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || 'Failed to generate briefing');

      queryClient.invalidateQueries({ queryKey: ['ai-briefings'] });
      toast.success(
        result.emailSent
          ? `Briefing generated and emailed (${result.emailCount} emails analysed)`
          : `Briefing generated (${result.emailCount} emails analysed) — email not sent`
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate briefing');
    } finally {
      setGenerating(false);
    }
  };

  const latestBriefing = briefings[0] || null;

  return (
    <AdminLayout pageTitle="AI Daily Briefing" breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'AI Daily Briefing' }]}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-500" />
              AI Daily Briefing
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              AI-generated summary of your latest emails, with priority categorisation and action items.
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating...' : 'Generate Now'}
          </button>
        </div>

        {latestBriefing && (
          <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Emails Analysed" value={latestBriefing.email_count} color="gray" />
            <StatCard label="Urgent" value={latestBriefing.urgent_count} color="red" />
            <StatCard label="Follow-ups" value={latestBriefing.followup_count} color="amber" />
            <StatCard label="Quote Requests" value={latestBriefing.quote_count} color="green" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : selectedBriefing ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">
                      {new Date(selectedBriefing.briefing_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedBriefing(null)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Back to list
                  </button>
                </div>
                <div className="p-5">
                  {selectedBriefing.email_sent && (
                    <div className="mb-4 flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      Email sent to inbox
                    </div>
                  )}
                  <div
                    className="prose prose-sm max-w-none text-gray-800"
                    dangerouslySetInnerHTML={{ __html: selectedBriefing.summary_html || selectedBriefing.summary_text || 'No summary available' }}
                  />
                </div>
              </div>
            ) : latestBriefing ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">
                      {new Date(latestBriefing.briefing_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  {latestBriefing.email_sent && (
                    <div className="flex items-center gap-1.5 text-xs text-green-600">
                      <Mail className="w-3 h-3" />
                      Email sent
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div
                    className="prose prose-sm max-w-none text-gray-800"
                    dangerouslySetInnerHTML={{ __html: latestBriefing.summary_html || latestBriefing.summary_text || 'No summary available' }}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No briefings yet</h3>
                <p className="text-sm text-gray-500 mb-4">Click "Generate Now" to create your first AI daily briefing.</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent Briefings</h3>
            {briefings.length === 0 ? (
              <p className="text-sm text-gray-400">No briefings generated yet.</p>
            ) : (
              briefings.map((briefing) => (
                <button
                  key={briefing.id}
                  onClick={() => setSelectedBriefing(briefing)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    selectedBriefing?.id === briefing.id
                      ? 'border-amber-400 bg-amber-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(briefing.briefing_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    {briefing.email_sent && <Mail className="w-3 h-3 text-green-500" />}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{briefing.email_count} emails</span>
                    {briefing.urgent_count > 0 && (
                      <span className="flex items-center gap-1 text-red-600">
                        <AlertCircle className="w-3 h-3" />
                        {briefing.urgent_count} urgent
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-amber-800 mb-1">About the Daily Briefing</h4>
              <p className="text-xs text-amber-700">
                The AI assistant reviews all inbound emails from the last 24 hours, categorises them by priority
                (Urgent, Follow-up, Quote Request, Payment/Admin), and generates a concise summary with action items.
                The briefing is emailed to you and stored here for reference. To run automatically at 1:30pm UK time
                every weekday, set up a cron job or scheduled trigger to call this edge function.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: 'gray' | 'red' | 'amber' | 'green' }) {
  const colorClasses = {
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    green: 'bg-green-50 text-green-700 border-green-200',
  };
  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium mt-1">{label}</p>
    </div>
  );
}
