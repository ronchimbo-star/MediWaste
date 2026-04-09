import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Eye, Check, Archive, Trash2, X, AlertTriangle } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';

type EnquiryStatus = 'pending' | 'read' | 'actioned' | 'archived';

export default function ContactEnquiriesPage() {
  const queryClient = useQueryClient();
  const [selectedEnquiry, setSelectedEnquiry] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<EnquiryStatus | 'all'>('all');

  const { data: enquiries, isLoading } = useQuery({
    queryKey: ['contact-enquiries', filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('contact_enquiries')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: EnquiryStatus }) => {
      const updateData: any = { status };

      if (status === 'read' && !enquiries?.find(e => e.id === id)?.read_at) {
        updateData.read_at = new Date().toISOString();
      } else if (status === 'actioned' && !enquiries?.find(e => e.id === id)?.actioned_at) {
        updateData.actioned_at = new Date().toISOString();
      } else if (status === 'archived' && !enquiries?.find(e => e.id === id)?.archived_at) {
        updateData.archived_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('contact_enquiries')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-enquiries'] });
      queryClient.invalidateQueries({ queryKey: ['contact-count'] });
      queryClient.invalidateQueries({ queryKey: ['unread-contacts'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contact_enquiries')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-enquiries'] });
      queryClient.invalidateQueries({ queryKey: ['contact-count'] });
      queryClient.invalidateQueries({ queryKey: ['unread-contacts'] });
      setSelectedEnquiry(null);
    },
  });

  return (
    <AdminLayout pageTitle="Contact Enquiries" breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'Contact Enquiries' }]}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Contact Enquiries</h2>
        </div>

        <div className="flex gap-2 mb-6">
          {(['all', 'pending', 'read', 'actioned', 'archived'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === status
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading...</p>
          </div>
        ) : !enquiries || enquiries.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-600">No contact enquiries found</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {enquiries.map((enquiry) => (
                  <tr key={enquiry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{enquiry.contact_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{enquiry.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{enquiry.subject}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          enquiry.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : enquiry.status === 'read'
                            ? 'bg-blue-100 text-blue-800'
                            : enquiry.status === 'actioned'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {enquiry.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(enquiry.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedEnquiry(enquiry)}
                          className="text-blue-600 hover:text-blue-700 p-1"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        {enquiry.status === 'pending' && (
                          <button
                            onClick={() => updateStatusMutation.mutate({ id: enquiry.id, status: 'read' })}
                            className="text-blue-600 hover:text-blue-700 p-1"
                            title="Mark as Read"
                          >
                            <Check size={18} />
                          </button>
                        )}
                        {(enquiry.status === 'pending' || enquiry.status === 'read') && (
                          <button
                            onClick={() => updateStatusMutation.mutate({ id: enquiry.id, status: 'actioned' })}
                            className="text-green-600 hover:text-green-700 p-1"
                            title="Mark as Actioned"
                          >
                            <Check size={18} />
                          </button>
                        )}
                        {enquiry.status !== 'archived' && (
                          <button
                            onClick={() => updateStatusMutation.mutate({ id: enquiry.id, status: 'archived' })}
                            className="text-gray-600 hover:text-gray-700 p-1"
                            title="Archive"
                          >
                            <Archive size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this enquiry? This action cannot be undone.')) {
                              deleteMutation.mutate(enquiry.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-700 p-1"
                          title="Delete (Mark as Spam)"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedEnquiry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-2xl font-bold text-gray-900">Contact Enquiry Details</h3>
              <button
                onClick={() => setSelectedEnquiry(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">Contact Information</h4>
                <p className="text-sm text-gray-600 mb-1"><strong>Name:</strong> {selectedEnquiry.contact_name}</p>
                <p className="text-sm text-gray-600 mb-1"><strong>Email:</strong> {selectedEnquiry.email}</p>
                {selectedEnquiry.phone && (
                  <p className="text-sm text-gray-600 mb-1"><strong>Phone:</strong> {selectedEnquiry.phone}</p>
                )}
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">Subject</h4>
                <p className="text-sm text-gray-600">{selectedEnquiry.subject}</p>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">Message</h4>
                <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                  {selectedEnquiry.message}
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">Enquiry Details</h4>
                <p className="text-sm text-gray-600 mb-1">
                  <strong>Status:</strong>{' '}
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedEnquiry.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : selectedEnquiry.status === 'read'
                        ? 'bg-blue-100 text-blue-800'
                        : selectedEnquiry.status === 'actioned'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {selectedEnquiry.status}
                  </span>
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <strong>Submitted:</strong> {new Date(selectedEnquiry.created_at).toLocaleString()}
                </p>
                {selectedEnquiry.read_at && (
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Read:</strong> {new Date(selectedEnquiry.read_at).toLocaleString()}
                  </p>
                )}
                {selectedEnquiry.actioned_at && (
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Actioned:</strong> {new Date(selectedEnquiry.actioned_at).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                {selectedEnquiry.status === 'pending' && (
                  <button
                    onClick={() => {
                      updateStatusMutation.mutate({ id: selectedEnquiry.id, status: 'read' });
                      setSelectedEnquiry({ ...selectedEnquiry, status: 'read' });
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Mark as Read
                  </button>
                )}
                {(selectedEnquiry.status === 'pending' || selectedEnquiry.status === 'read') && (
                  <button
                    onClick={() => {
                      updateStatusMutation.mutate({ id: selectedEnquiry.id, status: 'actioned' });
                      setSelectedEnquiry({ ...selectedEnquiry, status: 'actioned' });
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Mark as Actioned
                  </button>
                )}
                {selectedEnquiry.status !== 'archived' && (
                  <button
                    onClick={() => {
                      updateStatusMutation.mutate({ id: selectedEnquiry.id, status: 'archived' });
                      setSelectedEnquiry(null);
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Archive
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this enquiry? This action cannot be undone and is typically used for spam.')) {
                      deleteMutation.mutate(selectedEnquiry.id);
                    }
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                >
                  <AlertTriangle size={16} />
                  Delete (Spam)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
