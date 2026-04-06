import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Bell, Mail, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const { data: quoteCount } = useQuery({
    queryKey: ['quote-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('quote_requests')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: unreadQuotes } = useQuery({
    queryKey: ['unread-quotes'],
    queryFn: async () => {
      const { count } = await supabase
        .from('quote_requests')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);
      return count || 0;
    },
  });

  const { data: contactCount } = useQuery({
    queryKey: ['contact-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('contact_enquiries')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: unreadContacts } = useQuery({
    queryKey: ['unread-contacts'],
    queryFn: async () => {
      const { count } = await supabase
        .from('contact_enquiries')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      return count || 0;
    },
  });

  const { data: recentQuotes } = useQuery({
    queryKey: ['recent-quotes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('quote_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const { data: notifications, refetch: refetchNotifications } = useQuery({
    queryKey: ['system-notifications'],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const unreadNotifications = notifications?.filter((n: any) => !n.is_read).length || 0;

  const markAsRead = async (id: string) => {
    await supabase
      .from('system_notifications')
      .update({ is_read: true })
      .eq('id', id);
    refetchNotifications();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">MediWaste Admin</h1>
          <button
            onClick={handleSignOut}
            className="text-red-600 hover:text-red-700 font-medium"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
          {(unreadQuotes || 0) + (unreadContacts || 0) > 0 && (
            <div className="flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-full">
              <Bell className="w-5 h-5" />
              <span className="font-semibold">
                {(unreadQuotes || 0) + (unreadContacts || 0)} New Notifications
              </span>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Quote Requests</h3>
              <FileText className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{quoteCount}</p>
            {unreadQuotes ? (
              <p className="text-sm text-orange-600 font-semibold">{unreadQuotes} unread</p>
            ) : null}
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Contact Enquiries</h3>
              <Mail className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{contactCount}</p>
            {unreadContacts ? (
              <p className="text-sm text-orange-600 font-semibold">{unreadContacts} pending</p>
            ) : null}
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Submissions</h3>
              <Bell className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{(quoteCount || 0) + (contactCount || 0)}</p>
          </div>
        </div>

        {recentQuotes && recentQuotes.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Recent Quote Requests</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {recentQuotes.map((quote: any) => (
                <div
                  key={quote.id}
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate('/admin/quote-requests')}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-semibold text-gray-900">{quote.company_name || quote.contact_name}</p>
                        {!quote.is_read && (
                          <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-1 rounded-full">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{quote.email}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {quote.business_type && `${quote.business_type.replace(/_/g, ' ')} • `}
                        {new Date(quote.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      quote.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      quote.status === 'read' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {quote.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <button
                onClick={() => navigate('/admin/quote-requests')}
                className="text-orange-600 hover:text-orange-700 font-semibold text-sm"
              >
                View All Quote Requests →
              </button>
            </div>
          </div>
        )}

        {notifications && notifications.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Recent Notifications</h3>
              {unreadNotifications > 0 && (
                <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full">
                  {unreadNotifications} unread
                </span>
              )}
            </div>
            <div className="divide-y divide-gray-200">
              {notifications.map((notification: any) => (
                <div
                  key={notification.id}
                  className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.is_read ? 'bg-orange-50' : ''
                  }`}
                  onClick={() => {
                    if (!notification.is_read) markAsRead(notification.id);
                    if (notification.link) navigate(notification.link);
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {notification.type === 'quote_accepted' ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : notification.type === 'quote_declined' ? (
                        <XCircle className="w-6 h-6 text-red-600" />
                      ) : (
                        <Bell className="w-6 h-6 text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`font-semibold ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{notification.message}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(notification.created_at).toLocaleString('en-GB')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Business Operations</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <button
              onClick={() => navigate('/admin/customers')}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-orange-500 transition-colors text-left"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">Customers</h3>
              <p className="text-gray-600">Manage customer accounts and profiles</p>
            </button>

            <button
              onClick={() => navigate('/admin/subscriptions')}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-orange-500 transition-colors text-left"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">Subscriptions</h3>
              <p className="text-gray-600">Manage customer subscriptions and plans</p>
            </button>

            <button
              onClick={() => navigate('/admin/service-agreements')}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-orange-500 transition-colors text-left"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">Service Agreements</h3>
              <p className="text-gray-600">Manage service agreements and contracts</p>
            </button>

            <button
              onClick={() => navigate('/admin/jobs')}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-orange-500 transition-colors text-left"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">Service Schedule</h3>
              <p className="text-gray-600">View and manage service jobs</p>
            </button>

            <button
              onClick={() => navigate('/admin/staff')}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-orange-500 transition-colors text-left"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">Staff</h3>
              <p className="text-gray-600">Manage staff members and assignments</p>
            </button>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Financial Management</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <button
              onClick={() => navigate('/admin/quotes')}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-orange-500 transition-colors text-left"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">Quotes</h3>
              <p className="text-gray-600">Create and manage customer quotes</p>
            </button>

            <button
              onClick={() => navigate('/admin/invoices')}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-orange-500 transition-colors text-left"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">Invoicing</h3>
              <p className="text-gray-600">Create and manage invoices</p>
            </button>

            <button
              onClick={() => alert('Payments management coming soon')}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-orange-500 transition-colors text-left"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">Payments</h3>
              <p className="text-gray-600">Track payments and receipts</p>
            </button>

            <button
              onClick={() => navigate('/admin/waste-transfer-notes')}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-orange-500 transition-colors text-left"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">Waste Transfer Notes</h3>
              <p className="text-gray-600">Generate and manage WTNs</p>
            </button>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Website & Communications</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <button
              onClick={() => navigate('/admin/quote-requests')}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-orange-500 transition-colors text-left relative"
            >
              {unreadQuotes ? (
                <div className="absolute top-4 right-4 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {unreadQuotes}
                </div>
              ) : null}
              <h3 className="text-xl font-bold text-gray-900 mb-2">Quote Requests</h3>
              <p className="text-gray-600">View and manage customer quote requests</p>
            </button>

            <button
              onClick={() => navigate('/admin/contact-enquiries')}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-orange-500 transition-colors text-left relative"
            >
              {unreadContacts ? (
                <div className="absolute top-4 right-4 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {unreadContacts}
                </div>
              ) : null}
              <h3 className="text-xl font-bold text-gray-900 mb-2">Contact Enquiries</h3>
              <p className="text-gray-600">View and manage contact form submissions</p>
            </button>

            <button
              onClick={() => navigate('/admin/news')}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-orange-500 transition-colors text-left"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">News Management</h3>
              <p className="text-gray-600">Create, edit, and publish news articles</p>
            </button>

            <button
              onClick={() => navigate('/admin/settings')}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-orange-500 transition-colors text-left"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">Site Settings</h3>
              <p className="text-gray-600">Update company information and contact details</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
