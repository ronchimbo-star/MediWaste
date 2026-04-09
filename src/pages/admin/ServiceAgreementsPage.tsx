import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Plus, Search, FileText, CheckCircle, XCircle, Clock, ExternalLink, FileEdit as Edit, Trash2, Filter } from 'lucide-react';
import { useToastContext } from '../../contexts/ToastContext';
import AdminLayout from '../../components/admin/AdminLayout';

interface ServiceAgreement {
  id: string;
  agreement_number: string;
  client_name: string;
  contact_name: string;
  contact_email: string;
  collection_frequency: string;
  annual_value: number;
  status: string;
  start_date: string;
  end_date: string;
  secure_token: string;
  created_at: string;
  accepted_at: string | null;
  declined_at: string | null;
}

export default function ServiceAgreementsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToastContext();
  const [agreements, setAgreements] = useState<ServiceAgreement[]>([]);
  const [filteredAgreements, setFilteredAgreements] = useState<ServiceAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [agreementToDelete, setAgreementToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      fetchAgreements();
    }
  }, [user, authLoading]);

  useEffect(() => {
    filterAgreements();
  }, [agreements, searchTerm, statusFilter]);

  const fetchAgreements = async () => {
    try {
      const { data, error } = await supabase
        .from('service_agreements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgreements(data || []);
    } catch (error) {
      console.error('Error fetching agreements:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAgreements = () => {
    let filtered = [...agreements];

    if (searchTerm) {
      filtered = filtered.filter(
        (agreement) =>
          agreement.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          agreement.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          agreement.contact_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          agreement.agreement_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((agreement) => agreement.status === statusFilter);
    }

    setFilteredAgreements(filtered);
  };

  const handleDelete = async () => {
    if (!agreementToDelete) return;

    try {
      const { error } = await supabase
        .from('service_agreements')
        .delete()
        .eq('id', agreementToDelete);

      if (error) throw error;

      setAgreements(agreements.filter((a) => a.id !== agreementToDelete));
      setShowDeleteModal(false);
      setAgreementToDelete(null);
    } catch (error) {
      console.error('Error deleting agreement:', error);
      toast.error('Failed to delete agreement');
    }
  };

  const getPublicUrl = (token: string) => {
    return `${window.location.origin}/service-agreement/${token}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copied to clipboard');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <FileText className="w-3 h-3" />
            Draft
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <Clock className="w-3 h-3" />
            Sent
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" />
            Accepted
          </span>
        );
      case 'declined':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <XCircle className="w-3 h-3" />
            Declined
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
            <Clock className="w-3 h-3" />
            Expired
          </span>
        );
      default:
        return null;
    }
  };

  const stats = {
    total: agreements.length,
    draft: agreements.filter((a) => a.status === 'draft').length,
    sent: agreements.filter((a) => a.status === 'sent').length,
    accepted: agreements.filter((a) => a.status === 'accepted').length,
    declined: agreements.filter((a) => a.status === 'declined').length
  };

  if (loading) {
    return (
      <AdminLayout pageTitle="Service Agreements" breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'Service Agreements' }]}>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading agreements...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Service Agreements" breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'Service Agreements' }]}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Service Agreements</h1>
              <p className="text-gray-600">Manage and track service agreements</p>
            </div>
            <Link
              to="/admin/service-agreements/create"
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Agreement
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Draft</p>
              <p className="text-2xl font-bold text-gray-500">{stats.draft}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Sent</p>
              <p className="text-2xl font-bold text-blue-600">{stats.sent}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Accepted</p>
              <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Declined</p>
              <p className="text-2xl font-bold text-red-600">{stats.declined}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by client name, contact, email, or agreement number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
        </div>

        {/* Agreements List */}
        {filteredAgreements.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No agreements found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by creating your first service agreement'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Link
                to="/admin/service-agreements/create"
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Agreement
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agreement #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Frequency
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAgreements.map((agreement) => (
                    <tr key={agreement.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {agreement.agreement_number}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {agreement.client_name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{agreement.contact_name}</div>
                        <div className="text-sm text-gray-500">{agreement.contact_email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{agreement.collection_frequency}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          £{agreement.annual_value?.toFixed(2) || '0.00'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(agreement.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(agreement.created_at).toLocaleDateString()}
                        </div>
                        {agreement.accepted_at && (
                          <div className="text-xs text-green-600">
                            Accepted {new Date(agreement.accepted_at).toLocaleDateString()}
                          </div>
                        )}
                        {agreement.declined_at && (
                          <div className="text-xs text-red-600">
                            Declined {new Date(agreement.declined_at).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => copyToClipboard(getPublicUrl(agreement.secure_token))}
                            className="text-blue-600 hover:text-blue-900"
                            title="Copy public link"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <Link
                            to={`/admin/service-agreements/edit/${agreement.id}`}
                            className="text-gray-600 hover:text-gray-900"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => {
                              setAgreementToDelete(agreement.id);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Service Agreement</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this service agreement? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setAgreementToDelete(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded font-semibold transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
