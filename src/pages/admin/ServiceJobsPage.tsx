import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Calendar, User, MapPin } from 'lucide-react';

interface ServiceJob {
  id: string;
  job_number: string;
  customer: {
    customer_number: string;
    company_name: string;
    contact_name: string;
  };
  assigned_staff: {
    staff_number: string;
    first_name: string;
    last_name: string;
  } | null;
  scheduled_date: string;
  status: string;
  service_type: string;
}

export default function ServiceJobsPage() {
  const [jobs, setJobs] = useState<ServiceJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mw_service_jobs')
        .select(`
          *,
          customer:mw_customers!inner(customer_number, company_name, contact_name),
          assigned_staff:mw_staff(staff_number, first_name, last_name)
        `)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      scheduled: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      rescheduled: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const filteredJobs = jobs.filter(job =>
    filterStatus === 'all' || job.status === filterStatus
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Service Schedule</h1>
        <p className="text-gray-600 mt-1">Manage and track service jobs</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent"
          >
            <option value="all">All Jobs</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            onClick={() => alert('Schedule job feature coming soon')}
            className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] transition-colors"
          >
            <Plus className="w-5 h-5" />
            Schedule Job
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-[#F59E0B] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading jobs...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              No jobs found
            </div>
          ) : (
            filteredJobs.map((job) => (
              <div key={job.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{job.job_number}</p>
                    <p className="text-sm text-gray-600">{job.customer.customer_number}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(job.status)}`}>
                    {job.status}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {job.customer.company_name || job.customer.contact_name}
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {new Date(job.scheduled_date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <User className="w-4 h-4 text-gray-400" />
                    {job.assigned_staff ? `${job.assigned_staff.first_name} ${job.assigned_staff.last_name}` : 'Unassigned'}
                  </div>
                  <p className="text-gray-600 mt-2">{job.service_type}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}