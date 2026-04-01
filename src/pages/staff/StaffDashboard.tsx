import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Calendar, Clock, AlertCircle, CheckCircle, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PhotoUploadModal from '../../components/PhotoUploadModal';
import IssueReportModal from '../../components/IssueReportModal';

interface Job {
  id: string;
  job_number: string;
  customer: {
    company_name: string;
    contact_name: string;
  };
  address: {
    address_line1: string;
    city: string;
    postcode: string;
  };
  scheduled_date: string;
  scheduled_time_start: string;
  status: string;
  service_type: string;
  special_instructions: string;
}

export default function StaffDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffInfo, setStaffInfo] = useState<any>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchStaffInfo();
  }, [user, navigate]);

  const fetchStaffInfo = async () => {
    try {
      const { data: staffData, error: staffError } = await supabase
        .from('mw_staff')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (staffError) throw staffError;

      if (!staffData) {
        alert('Staff profile not found');
        navigate('/');
        return;
      }

      setStaffInfo(staffData);

      const { data: jobsData, error: jobsError } = await supabase
        .from('mw_service_jobs')
        .select(`
          *,
          customer:mw_customers!inner(company_name, contact_name),
          address:mw_customer_addresses!inner(address_line1, city, postcode)
        `)
        .eq('assigned_staff_id', staffData.id)
        .in('status', ['scheduled', 'in_progress'])
        .order('scheduled_date', { ascending: true });

      if (jobsError) throw jobsError;
      setJobs(jobsData || []);
    } catch (error) {
      console.error('Error fetching staff data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('mw_service_jobs')
        .update({
          status: 'in_progress',
          actual_start_time: new Date().toISOString()
        })
        .eq('id', jobId);

      if (error) throw error;
      fetchStaffInfo();
    } catch (error) {
      console.error('Error starting job:', error);
      alert('Failed to start job');
    }
  };

  const completeJob = async (jobId: string) => {
    try {
      const job = jobs.find(j => j.id === jobId);
      if (!job) return;

      const { error: jobError } = await supabase
        .from('mw_service_jobs')
        .update({
          status: 'completed',
          actual_end_time: new Date().toISOString()
        })
        .eq('id', jobId);

      if (jobError) throw jobError;

      const { error: completionError } = await supabase
        .from('mw_job_completion')
        .insert([{
          job_id: jobId,
          completed_by: staffInfo.id,
          completed_at: new Date().toISOString()
        }]);

      if (completionError) throw completionError;

      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const wtnNumber = `WTN${today}-${Date.now().toString().slice(-4)}`;

      const { data: customerData } = await supabase
        .from('mw_service_jobs')
        .select('customer_id, address_id')
        .eq('id', jobId)
        .maybeSingle();

      if (customerData) {
        const { error: wtnError } = await supabase
          .from('mw_waste_transfer_notes')
          .insert([{
            job_id: jobId,
            customer_id: customerData.customer_id,
            wtn_number: wtnNumber,
            issue_date: new Date().toISOString(),
            waste_type: 'Clinical Waste',
            waste_description: job.service_type,
            quantity: 0,
            quantity_unit: 'kg',
            container_type: 'Standard Container',
            carrier_signature: `${staffInfo.first_name} ${staffInfo.last_name}`,
            customer_signature: null
          }]);

        if (wtnError) {
          console.error('WTN creation error:', wtnError);
        }
      }

      alert('Job completed successfully! Waste Transfer Note has been generated.');
      fetchStaffInfo();
    } catch (error) {
      console.error('Error completing job:', error);
      alert('Failed to complete job');
    }
  };

  const openPhotoModal = (job: Job) => {
    setSelectedJob(job);
    setShowPhotoModal(true);
  };

  const openIssueModal = (job: Job) => {
    setSelectedJob(job);
    setShowIssueModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-4 border-[#F59E0B] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {staffInfo?.first_name}!
          </h1>
          <p className="text-gray-600 mt-1">Staff Portal - Your Job Schedule</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today's Jobs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {jobs.filter(j => new Date(j.scheduled_date).toDateString() === new Date().toDateString()).length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {jobs.filter(j => j.status === 'in_progress').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Upcoming</p>
                <p className="text-2xl font-bold text-gray-900">
                  {jobs.filter(j => j.status === 'scheduled').length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-[#F59E0B]" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {jobs.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">All caught up!</h3>
              <p className="text-gray-600">You have no scheduled jobs at the moment.</p>
            </div>
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{job.job_number}</h3>
                    <p className="text-gray-600">{job.customer.company_name || job.customer.contact_name}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    job.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {job.status === 'in_progress' ? 'In Progress' : 'Scheduled'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Service Type</p>
                    <p className="text-gray-900">{job.service_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Scheduled</p>
                    <p className="text-gray-900">
                      {new Date(job.scheduled_date).toLocaleDateString()} at {job.scheduled_time_start}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600 mb-1">Address</p>
                    <p className="text-gray-900">
                      {job.address.address_line1}, {job.address.city}, {job.address.postcode}
                    </p>
                  </div>
                  {job.special_instructions && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-600 mb-1">Special Instructions</p>
                      <p className="text-gray-900">{job.special_instructions}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  {job.status === 'scheduled' && (
                    <button
                      onClick={() => startJob(job.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] transition-colors"
                    >
                      <Clock className="w-4 h-4" />
                      Start Job
                    </button>
                  )}
                  {job.status === 'in_progress' && (
                    <>
                      <button
                        onClick={() => completeJob(job.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Complete Job
                      </button>
                      <button
                        onClick={() => openPhotoModal(job)}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Camera className="w-4 h-4" />
                        Add Photos
                      </button>
                      <button
                        onClick={() => openIssueModal(job)}
                        className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <AlertCircle className="w-4 h-4" />
                        Report Issue
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showPhotoModal && selectedJob && (
        <PhotoUploadModal
          jobId={selectedJob.id}
          jobNumber={selectedJob.job_number}
          onClose={() => {
            setShowPhotoModal(false);
            setSelectedJob(null);
          }}
          onPhotoAdded={fetchStaffInfo}
        />
      )}

      {showIssueModal && selectedJob && staffInfo && (
        <IssueReportModal
          jobId={selectedJob.id}
          jobNumber={selectedJob.job_number}
          staffId={staffInfo.id}
          onClose={() => {
            setShowIssueModal(false);
            setSelectedJob(null);
          }}
          onIssueReported={fetchStaffInfo}
        />
      )}
    </div>
  );
}