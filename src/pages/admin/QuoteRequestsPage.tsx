import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Eye, Check, Archive, Trash2, X, FileText, UserPlus } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';

type QuoteStatus = 'pending' | 'read' | 'draft_created' | 'actioned' | 'archived';

export default function QuoteRequestsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<QuoteStatus | 'all'>('all');

  const { data: quotes, isLoading } = useQuery({
    queryKey: ['quote-requests', filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('quote_requests')
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
    mutationFn: async ({ id, status }: { id: string; status: QuoteStatus }) => {
      const updateData: any = { status };

      if (status === 'read' && !quotes?.find(q => q.id === id)?.read_at) {
        updateData.read_at = new Date().toISOString();
        updateData.is_read = true;
      } else if (status === 'draft_created') {
        updateData.agent_drafted_at = new Date().toISOString();
        updateData.is_read = true;
      } else if (status === 'actioned' && !quotes?.find(q => q.id === id)?.actioned_at) {
        updateData.actioned_at = new Date().toISOString();
        updateData.is_read = true;
      } else if (status === 'archived' && !quotes?.find(q => q.id === id)?.archived_at) {
        updateData.archived_at = new Date().toISOString();
        updateData.is_read = true;
      }

      const { error } = await supabase
        .from('quote_requests')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-requests'] });
      queryClient.invalidateQueries({ queryKey: ['quote-count'] });
      queryClient.invalidateQueries({ queryKey: ['unread-quotes'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quote_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-requests'] });
      queryClient.invalidateQueries({ queryKey: ['quote-count'] });
      queryClient.invalidateQueries({ queryKey: ['unread-quotes'] });
      setSelectedQuote(null);
    },
  });

  const convertToCustomerMutation = useMutation({
    mutationFn: async (quote: any) => {
      const { data: existing } = await supabase
        .from('mw_customers')
        .select('id')
        .eq('email', quote.email)
        .maybeSingle();

      if (existing) {
        return { customerId: existing.id, alreadyExists: true };
      }

      const { data, error } = await supabase
        .from('mw_customers')
        .insert([{
          company_name: quote.company_name || '',
          contact_name: quote.contact_name || '',
          email: quote.email || '',
          phone: quote.phone || '',
          postcode: quote.postcode || '',
          status: 'active',
          source: 'quote_request',
          source_id: quote.id,
          customer_number: '',
        }])
        .select('id')
        .single();

      if (error) throw error;
      return { customerId: data.id, alreadyExists: false };
    },
    onSuccess: ({ customerId, alreadyExists }) => {
      if (alreadyExists) {
        if (confirm('A customer with this email already exists. Open their profile?')) {
          navigate(`/admin/customers/${customerId}`);
        }
      } else {
        navigate(`/admin/customers/${customerId}`);
      }
    },
  });

  return (
    <AdminLayout pageTitle="Quote Requests" breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'Quote Requests' }]}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Quote Requests</h2>
        </div>

        <div className="flex gap-2 mb-6">
          {(['all', 'pending', 'read', 'draft_created', 'actioned', 'archived'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === status
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {status === 'draft_created' ? 'Draft Created' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading...</p>
          </div>
        ) : !quotes || quotes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-600">No quote requests found</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Phone
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
                {quotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{quote.company_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{quote.contact_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{quote.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{quote.phone}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          quote.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : quote.status === 'read'
                            ? 'bg-blue-100 text-blue-800'
                            : quote.status === 'draft_created'
                            ? 'bg-cyan-100 text-cyan-800'
                            : quote.status === 'actioned'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {quote.status === 'draft_created' ? 'Draft Created' : quote.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(quote.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/admin/quotes/create?from_request=${quote.id}`)}
                          className="text-orange-600 hover:text-orange-700 p-1"
                          title="Create Quote"
                        >
                          <FileText size={18} />
                        </button>
                        <button
                          onClick={() => convertToCustomerMutation.mutate(quote)}
                          className="text-green-600 hover:text-green-700 p-1"
                          title="Convert to Customer"
                        >
                          <UserPlus size={18} />
                        </button>
                        <button
                          onClick={() => setSelectedQuote(quote)}
                          className="text-blue-600 hover:text-blue-700 p-1"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        {quote.status === 'pending' && (
                          <button
                            onClick={() => updateStatusMutation.mutate({ id: quote.id, status: 'read' })}
                            className="text-blue-600 hover:text-blue-700 p-1"
                            title="Mark as Read"
                          >
                            <Check size={18} />
                          </button>
                        )}
                        {(quote.status === 'pending' || quote.status === 'read' || quote.status === 'draft_created') && (
                          <button
                            onClick={() => updateStatusMutation.mutate({ id: quote.id, status: 'actioned' })}
                            className="text-green-600 hover:text-green-700 p-1"
                            title="Mark as Actioned"
                          >
                            <Check size={18} />
                          </button>
                        )}
                        {quote.status !== 'archived' && (
                          <button
                            onClick={() => updateStatusMutation.mutate({ id: quote.id, status: 'archived' })}
                            className="text-gray-600 hover:text-gray-700 p-1"
                            title="Archive"
                          >
                            <Archive size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this quote request?')) {
                              deleteMutation.mutate(quote.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-700 p-1"
                          title="Delete"
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

      {selectedQuote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-2xl font-bold text-gray-900">Quote Request Details</h3>
              <button
                onClick={() => setSelectedQuote(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Company Information</h4>
                  <p className="text-sm text-gray-600 mb-1"><strong>Company:</strong> {selectedQuote.company_name}</p>
                  <p className="text-sm text-gray-600 mb-1"><strong>Contact:</strong> {selectedQuote.contact_name}</p>
                  <p className="text-sm text-gray-600 mb-1"><strong>Email:</strong> {selectedQuote.email}</p>
                  <p className="text-sm text-gray-600 mb-1"><strong>Phone:</strong> {selectedQuote.phone}</p>
                  {selectedQuote.business_type && (
                    <p className="text-sm text-gray-600 mb-1">
                      <strong>Business Type:</strong> {selectedQuote.business_type.replace(/_/g, ' ')}
                    </p>
                  )}
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Location</h4>
                  {selectedQuote.address_line1 && (
                    <p className="text-sm text-gray-600 mb-1">{selectedQuote.address_line1}</p>
                  )}
                  {selectedQuote.address_line_2 && (
                    <p className="text-sm text-gray-600 mb-1">{selectedQuote.address_line_2}</p>
                  )}
                  {selectedQuote.city && (
                    <p className="text-sm text-gray-600 mb-1">{selectedQuote.city}</p>
                  )}
                  {selectedQuote.postcode && (
                    <p className="text-sm text-gray-600 mb-1"><strong>Postcode:</strong> {selectedQuote.postcode}</p>
                  )}
                </div>
              </div>

              {selectedQuote.items && selectedQuote.items.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Requested Items</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {selectedQuote.items.map((item: any, idx: number) => (
                      <div key={idx} className="mb-3 pb-3 border-b border-gray-200 last:border-0">
                        <p className="text-sm text-gray-600"><strong>Product:</strong> {item.productType?.replace(/_/g, ' ')}</p>
                        {item.containerSize && <p className="text-sm text-gray-600"><strong>Size:</strong> {item.containerSize}</p>}
                        {item.containerColor && <p className="text-sm text-gray-600"><strong>Color:</strong> {item.containerColor}</p>}
                        {item.quantity && <p className="text-sm text-gray-600"><strong>Quantity:</strong> {item.quantity}</p>}
                        {item.frequency && <p className="text-sm text-gray-600"><strong>Frequency:</strong> {item.frequency}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedQuote.message && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Message</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg whitespace-pre-line">{selectedQuote.message}</p>
                </div>
              )}

              {selectedQuote.agent_notes && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Agent Notes</h4>
                  <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                    <p className="text-sm text-cyan-900 whitespace-pre-line">{selectedQuote.agent_notes}</p>
                    {selectedQuote.agent_drafted_at && (
                      <p className="text-xs text-cyan-600 mt-2">
                        Draft created: {new Date(selectedQuote.agent_drafted_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">Request Details</h4>
                <p className="text-sm text-gray-600 mb-1">
                  <strong>Status:</strong>{' '}
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedQuote.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : selectedQuote.status === 'read'
                        ? 'bg-blue-100 text-blue-800'
                        : selectedQuote.status === 'draft_created'
                        ? 'bg-cyan-100 text-cyan-800'
                        : selectedQuote.status === 'actioned'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {selectedQuote.status === 'draft_created' ? 'Draft Created' : selectedQuote.status}
                  </span>
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <strong>Submitted:</strong> {new Date(selectedQuote.created_at).toLocaleString()}
                </p>
                {selectedQuote.read_at && (
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Read:</strong> {new Date(selectedQuote.read_at).toLocaleString()}
                  </p>
                )}
                {selectedQuote.agent_drafted_at && (
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Agent Drafted:</strong> {new Date(selectedQuote.agent_drafted_at).toLocaleString()}
                  </p>
                )}
                {selectedQuote.actioned_at && (
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Actioned:</strong> {new Date(selectedQuote.actioned_at).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => navigate(`/admin/quotes/create?from_request=${selectedQuote.id}`)}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
                >
                  <FileText size={18} />
                  Create Quote
                </button>
                {selectedQuote.status === 'pending' && (
                  <button
                    onClick={() => {
                      updateStatusMutation.mutate({ id: selectedQuote.id, status: 'read' });
                      setSelectedQuote({ ...selectedQuote, status: 'read' });
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Mark as Read
                  </button>
                )}
                {(selectedQuote.status === 'pending' || selectedQuote.status === 'read' || selectedQuote.status === 'draft_created') && (
                  <button
                    onClick={() => {
                      updateStatusMutation.mutate({ id: selectedQuote.id, status: 'actioned' });
                      setSelectedQuote({ ...selectedQuote, status: 'actioned' });
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Mark as Actioned
                  </button>
                )}
                {selectedQuote.status !== 'archived' && (
                  <button
                    onClick={() => {
                      updateStatusMutation.mutate({ id: selectedQuote.id, status: 'archived' });
                      setSelectedQuote(null);
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Archive
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this quote request?')) {
                      deleteMutation.mutate(selectedQuote.id);
                    }
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
