import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, X } from 'lucide-react';
import { useToastContext } from '../contexts/ToastContext';

interface IssueReportModalProps {
  jobId: string;
  jobNumber: string;
  staffId: string;
  onClose: () => void;
  onIssueReported: () => void;
}

const ISSUE_TYPES = [
  'Access Problem',
  'Customer Not Available',
  'Incomplete Waste Segregation',
  'Insufficient Container',
  'Safety Concern',
  'Equipment Failure',
  'Other'
];

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'medium', label: 'Medium', color: 'bg-orange-100 text-orange-800' },
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-800' }
];

export default function IssueReportModal({ jobId, jobNumber, staffId, onClose, onIssueReported }: IssueReportModalProps) {
  const { toast } = useToastContext();
  const [submitting, setSubmitting] = useState(false);
  const [issueType, setIssueType] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [description, setDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [requiresFollowUp, setRequiresFollowUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!issueType || !description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('mw_job_issues')
        .insert([{
          job_id: jobId,
          reported_by: staffId,
          issue_type: issueType,
          severity: severity,
          description: description,
          action_taken: actionTaken || null,
          requires_followup: requiresFollowUp,
          status: 'open'
        }]);

      if (error) throw error;

      toast.success('Issue reported successfully');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      onIssueReported();
      onClose();
    } catch (error) {
      console.error('Error reporting issue:', error);
      toast.error('Failed to report issue. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Report Issue</h2>
                <p className="text-gray-600">Job: {jobNumber}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={submitting}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issue Type <span className="text-red-500">*</span>
              </label>
              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                required
                disabled={submitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
              >
                <option value="">Select issue type...</option>
                {ISSUE_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Severity <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                {SEVERITY_LEVELS.map(level => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => setSeverity(level.value)}
                    disabled={submitting}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                      severity === level.value
                        ? level.color + ' ring-2 ring-offset-2 ring-gray-400'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                disabled={submitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
                placeholder="Describe the issue in detail..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action Taken (optional)
              </label>
              <textarea
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                rows={3}
                disabled={submitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
                placeholder="What actions did you take to address this issue?"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="followup"
                checked={requiresFollowUp}
                onChange={(e) => setRequiresFollowUp(e.target.checked)}
                disabled={submitting}
                className="w-4 h-4 text-[#F59E0B] border-gray-300 rounded focus:ring-[#F59E0B]"
              />
              <label htmlFor="followup" className="text-sm text-gray-700">
                This issue requires follow-up action from management
              </label>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Management will be notified of this issue. If this is an emergency or safety concern, please also contact dispatch immediately.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    Report Issue
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}