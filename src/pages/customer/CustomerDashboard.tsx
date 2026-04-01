import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Calendar, FileText, DollarSign, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Subscription {
  id: string;
  service_plan: {
    name: string;
    price: number;
  };
  status: string;
  service_frequency: string;
  start_date: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  status: string;
  due_date: string;
}

export default function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchCustomerData();
  }, [user, navigate]);

  const fetchCustomerData = async () => {
    try {
      const { data: customerData, error: customerError } = await supabase
        .from('mw_customers')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (customerError) throw customerError;

      if (!customerData) {
        alert('Customer profile not found');
        navigate('/');
        return;
      }

      setCustomerInfo(customerData);

      const { data: subsData, error: subsError } = await supabase
        .from('mw_subscriptions')
        .select(`
          *,
          service_plan:mw_service_plans!inner(name, price)
        `)
        .eq('customer_id', customerData.id);

      if (subsError) throw subsError;
      setSubscriptions(subsData || []);

      const { data: invoicesData, error: invoicesError } = await supabase
        .from('mw_invoices')
        .select('*')
        .eq('customer_id', customerData.id)
        .order('issue_date', { ascending: false })
        .limit(5);

      if (invoicesError) throw invoicesError;
      setInvoices(invoicesData || []);
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      sent: 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
            Welcome, {customerInfo?.contact_name}!
          </h1>
          <p className="text-gray-600 mt-1">Customer Portal - Account #{customerInfo?.customer_number}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Subscriptions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {subscriptions.filter(s => s.status === 'active').length}
                </p>
              </div>
              <Package className="w-8 h-8 text-[#F59E0B]" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Outstanding</p>
                <p className="text-2xl font-bold text-red-600">
                  {invoices.filter(inv => inv.status === 'overdue' || inv.status === 'sent').length}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Next Service</p>
                <p className="text-lg font-bold text-gray-900">TBD</p>
              </div>
              <Calendar className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">My Subscriptions</h2>
            {subscriptions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No active subscriptions</p>
            ) : (
              <div className="space-y-3">
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{sub.service_plan.name}</h3>
                        <p className="text-sm text-gray-600">{sub.service_frequency}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(sub.status)}`}>
                        {sub.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Started: {new Date(sub.start_date).toLocaleDateString()}
                    </p>
                    <p className="text-lg font-bold text-gray-900 mt-2">
                      £{Number(sub.service_plan.price).toFixed(2)}/month
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Invoices</h2>
            {invoices.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No invoices yet</p>
            ) : (
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{invoice.invoice_number}</h3>
                        <p className="text-sm text-gray-600">
                          Due: {new Date(invoice.due_date).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      £{Number(invoice.total_amount).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => alert('Book ad-hoc service feature coming soon')}
            className="bg-[#F59E0B] text-white rounded-lg p-6 hover:bg-[#D97706] transition-colors text-left"
          >
            <Calendar className="w-8 h-8 mb-2" />
            <h3 className="text-lg font-semibold mb-1">Book Ad-hoc Service</h3>
            <p className="text-sm opacity-90">Schedule a one-time collection</p>
          </button>
          <button
            onClick={() => alert('View documents feature coming soon')}
            className="bg-blue-600 text-white rounded-lg p-6 hover:bg-blue-700 transition-colors text-left"
          >
            <FileText className="w-8 h-8 mb-2" />
            <h3 className="text-lg font-semibold mb-1">View Documents</h3>
            <p className="text-sm opacity-90">Access waste transfer notes & receipts</p>
          </button>
        </div>
      </div>
    </div>
  );
}