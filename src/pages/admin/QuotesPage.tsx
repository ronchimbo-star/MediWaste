import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Eye, FileEdit as Edit, Trash2, Search, Filter, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Header from '../../components/Header';
import { useToastContext } from '../../contexts/ToastContext';

interface Quote {
  id: string;
  quote_number: string;
  company_name: string;
  contact_name: string;
  email: string;
  status: string;
  total_amount: number;
  valid_until: string;
  created_at: string;
  quote_request_id: string | null;
}

export default function QuotesPage() {
  const navigate = useNavigate();
  const { toast } = useToastContext();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchQuotes();
  }, []);

  async function fetchQuotes() {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (err) {
      console.error('Error fetching quotes:', err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteQuote(id: string) {
    if (!confirm('Are you sure you want to delete this quote?')) return;

    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchQuotes();
    } catch (err) {
      console.error('Error deleting quote:', err);
      toast.error('Failed to delete quote');
    }
  }

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = quote.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800',
      published: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      declined: 'bg-red-100 text-red-800',
      expired: 'bg-orange-100 text-orange-800',
      cancelled: 'bg-gray-100 text-gray-600'
    };
    return badges[status as keyof typeof badges] || badges.draft;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <CheckCircle className="w-4 h-4" />;
      case 'declined': return <XCircle className="w-4 h-4" />;
      case 'expired': return <Clock className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-orange-600" />
                  Quotes Management
                </h1>
                <p className="text-gray-600 mt-1">Create and manage customer quotes</p>
              </div>
              <button
                onClick={() => navigate('/admin/quotes/create')}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create Quote
              </button>
            </div>

            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search quotes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 appearance-none"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="accepted">Accepted</option>
                  <option value="declined">Declined</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                <p className="text-gray-600 mt-2">Loading quotes...</p>
              </div>
            ) : filteredQuotes.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No quotes found</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quote #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid Until</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredQuotes.map((quote) => (
                    <tr key={quote.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900">{quote.quote_number}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{quote.company_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{quote.contact_name}</div>
                        <div className="text-sm text-gray-500">{quote.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          £{quote.total_amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(quote.status)}`}>
                          {getStatusIcon(quote.status)}
                          {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/admin/quotes/${quote.id}`)}
                            className="text-blue-600 hover:text-blue-700"
                            title="View"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          {quote.status === 'draft' && (
                            <button
                              onClick={() => navigate(`/admin/quotes/${quote.id}/edit`)}
                              className="text-orange-600 hover:text-orange-700"
                              title="Edit"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteQuote(quote.id)}
                            className="text-red-600 hover:text-red-700"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
