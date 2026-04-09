import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import {
  Bell, Mail, FileText, CheckCircle, XCircle, Clock,
  Users, AlertTriangle, Calendar, TrendingUp, CreditCard,
  Receipt, Briefcase, Settings, Newspaper, Inbox, List,
  FileCheck, BarChart2, ShieldCheck, Truck
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';

function fmtCurrency(val: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(val);
}

function fmtDate(date: string) {
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const { data: activeCustomerCount } = useQuery({
    queryKey: ['active-customer-count'],
    queryFn: async () => {
      const { count } = await supabase.from('mw_customers').select('*', { count: 'exact', head: true }).eq('status', 'active');
      return count || 0;
    },
  });

  const { data: unreadQuotes } = useQuery({
    queryKey: ['unread-quotes'],
    queryFn: async () => {
      const { count } = await supabase.from('quote_requests').select('*', { count: 'exact', head: true }).eq('is_read', false);
      return count || 0;
    },
  });

  const { data: unreadContacts } = useQuery({
    queryKey: ['unread-contacts'],
    queryFn: async () => {
      const { count } = await supabase.from('contact_enquiries').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      return count || 0;
    },
  });

  const { data: overduePaymentCount } = useQuery({
    queryKey: ['overdue-payment-count'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('mw_invoices')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'overdue'])
        .lt('due_date', today);
      return count || 0;
    },
  });

  const { data: pendingInvoicesData } = useQuery({
    queryKey: ['pending-invoices-summary'],
    queryFn: async () => {
      const { data } = await supabase
        .from('mw_invoices')
        .select('total_amount')
        .eq('status', 'pending');
      const total = (data || []).reduce((sum: number, r: any) => sum + Number(r.total_amount || 0), 0);
      return { count: (data || []).length, total };
    },
  });

  const { data: paidThisMonth } = useQuery({
    queryKey: ['paid-this-month'],
    queryFn: async () => {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from('mw_payments')
        .select('amount')
        .gte('payment_date', start.toISOString().split('T')[0]);
      const total = (data || []).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
      return total;
    },
  });

  const { data: recentPayments } = useQuery({
    queryKey: ['recent-payments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('mw_payments')
        .select('id, amount, payment_date, payment_method, reference, customer_id, mw_customers(company_name)')
        .order('payment_date', { ascending: false })
        .limit(6);
      return data || [];
    },
  });

  const { data: recentInvoices } = useQuery({
    queryKey: ['recent-invoices'],
    queryFn: async () => {
      const { data } = await supabase
        .from('mw_invoices')
        .select('id, invoice_number, total_amount, status, due_date, customer_id, mw_customers(company_name)')
        .order('created_at', { ascending: false })
        .limit(6);
      return data || [];
    },
  });

  const { data: serviceDueSoonCount } = useQuery({
    queryKey: ['service-due-soon-count'],
    queryFn: async () => {
      const in7days = new Date();
      in7days.setDate(in7days.getDate() + 7);
      const { count } = await supabase
        .from('mw_customer_services')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .lte('next_service_date', in7days.toISOString().split('T')[0]);
      return count || 0;
    },
  });

  const { data: notifications, refetch: refetchNotifications } = useQuery({
    queryKey: ['system-notifications'],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8);
      return data || [];
    },
  });

  const { data: recentQuotes } = useQuery({
    queryKey: ['recent-quotes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('quote_requests')
        .select('id, company_name, contact_name, email, business_type, created_at, status, is_read')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const unreadNotifications = notifications?.filter((n: any) => !n.is_read).length || 0;

  const markAsRead = async (id: string) => {
    await supabase.from('system_notifications').update({ is_read: true }).eq('id', id);
    refetchNotifications();
  };

  const invoiceStatusColor = (status: string) => {
    if (status === 'paid') return 'bg-green-100 text-green-700';
    if (status === 'overdue') return 'bg-red-100 text-red-700';
    if (status === 'pending') return 'bg-amber-100 text-amber-700';
    return 'bg-gray-100 text-gray-600';
  };

  const navLinks = [
    { label: 'Customers', icon: Users, path: '/admin/customers', desc: 'Profiles, payments & history' },
    { label: 'Quote Requests', icon: FileText, path: '/admin/quote-requests', desc: 'Convert leads into customers', badge: unreadQuotes },
    { label: 'Quotes', icon: Receipt, path: '/admin/quotes', desc: 'Manage customer quotes' },
    { label: 'Invoicing', icon: CreditCard, path: '/admin/invoices', desc: 'Invoices & payment records' },
    { label: 'Service Agreements', icon: FileCheck, path: '/admin/service-agreements', desc: 'Contracts & agreements' },
    { label: 'Service Jobs', icon: Briefcase, path: '/admin/jobs', desc: 'Schedule & track jobs' },
    { label: 'Waste Transfer Notes', icon: Truck, path: '/admin/waste-transfer-notes', desc: 'Generate & manage WTNs' },
    { label: 'Certificates', icon: ShieldCheck, path: '/admin/certificates', desc: 'Compliance certificates' },
    { label: 'Mailing Lists', icon: List, path: '/admin/mailing-lists', desc: 'Export & manage lists' },
    { label: 'Subscriptions', icon: BarChart2, path: '/admin/subscriptions', desc: 'Plans & subscriptions' },
    { label: 'Contact Enquiries', icon: Mail, path: '/admin/contact-enquiries', desc: 'Form submissions', badge: unreadContacts },
    { label: 'Email Inbox', icon: Inbox, path: '/admin/email-inbox', desc: 'Synced @mediwaste.co.uk' },
    { label: 'News', icon: Newspaper, path: '/admin/news', desc: 'Articles & publications' },
    { label: 'Staff', icon: Users, path: '/admin/staff', desc: 'Team members' },
    { label: 'Settings', icon: Settings, path: '/admin/settings', desc: 'Site & company settings' },
  ];

  return (
    <AdminLayout pageTitle="Dashboard">
      <div className="min-h-screen bg-gray-50">
        <div className="px-6 py-6 border-b border-gray-200 bg-white flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {((unreadQuotes || 0) + (unreadContacts || 0) + unreadNotifications) > 0 && (
              <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 px-4 py-2 rounded-full text-sm font-semibold">
                <Bell className="w-4 h-4" />
                {(unreadQuotes || 0) + (unreadContacts || 0) + unreadNotifications} unread
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 text-gray-500 mb-3 text-sm font-medium">
              <Users size={16} />
              Active Customers
            </div>
            <p className="text-3xl font-bold text-gray-900">{activeCustomerCount ?? '—'}</p>
          </div>
          <div className={`bg-white rounded-xl border p-5 ${(overduePaymentCount || 0) > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
            <div className={`flex items-center gap-2 mb-3 text-sm font-medium ${(overduePaymentCount || 0) > 0 ? 'text-red-600' : 'text-gray-500'}`}>
              <AlertTriangle size={16} />
              Overdue Invoices
            </div>
            <p className="text-3xl font-bold text-gray-900">{overduePaymentCount ?? '—'}</p>
          </div>
          <div className={`bg-white rounded-xl border p-5 ${(pendingInvoicesData?.count || 0) > 0 ? 'border-amber-200 bg-amber-50' : 'border-gray-200'}`}>
            <div className={`flex items-center gap-2 mb-3 text-sm font-medium ${(pendingInvoicesData?.count || 0) > 0 ? 'text-amber-600' : 'text-gray-500'}`}>
              <Clock size={16} />
              Pending Invoices
            </div>
            <p className="text-3xl font-bold text-gray-900">{pendingInvoicesData?.count ?? '—'}</p>
            {(pendingInvoicesData?.total || 0) > 0 && (
              <p className="text-sm text-amber-700 font-semibold mt-1">{fmtCurrency(pendingInvoicesData!.total)} outstanding</p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-green-200 bg-green-50 p-5">
            <div className="flex items-center gap-2 text-green-600 mb-3 text-sm font-medium">
              <TrendingUp size={16} />
              Collected This Month
            </div>
            <p className="text-3xl font-bold text-gray-900">{paidThisMonth != null ? fmtCurrency(paidThisMonth) : '—'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-6 pb-6">

          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Recent Invoices</h3>
                <button onClick={() => navigate('/admin/invoices')} className="text-xs text-orange-600 hover:text-orange-700 font-semibold">
                  View All →
                </button>
              </div>
              {recentInvoices && recentInvoices.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {recentInvoices.map((inv: any) => (
                    <div
                      key={inv.id}
                      className="px-5 py-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between gap-3"
                      onClick={() => navigate('/admin/invoices')}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {inv.mw_customers?.company_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500">{inv.invoice_number} · Due {fmtDate(inv.due_date)}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="font-bold text-sm text-gray-900">{fmtCurrency(Number(inv.total_amount))}</span>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${invoiceStatusColor(inv.status)}`}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-5 py-8 text-sm text-gray-400 text-center">No invoices yet</p>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Recent Payments</h3>
                <button onClick={() => navigate('/admin/invoices')} className="text-xs text-orange-600 hover:text-orange-700 font-semibold">
                  View All →
                </button>
              </div>
              {recentPayments && recentPayments.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {recentPayments.map((pay: any) => (
                    <div key={pay.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {pay.mw_customers?.company_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {fmtDate(pay.payment_date)}{pay.payment_method ? ` · ${pay.payment_method}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <CheckCircle size={14} className="text-green-500" />
                        <span className="font-bold text-sm text-green-700">{fmtCurrency(Number(pay.amount))}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-5 py-8 text-sm text-gray-400 text-center">No payments recorded yet</p>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Recent Quote Requests</h3>
                <button onClick={() => navigate('/admin/quote-requests')} className="text-xs text-orange-600 hover:text-orange-700 font-semibold">
                  View All →
                </button>
              </div>
              {recentQuotes && recentQuotes.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {recentQuotes.map((quote: any) => (
                    <div
                      key={quote.id}
                      className="px-5 py-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between gap-3"
                      onClick={() => navigate('/admin/quote-requests')}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 text-sm truncate">
                            {quote.company_name || quote.contact_name}
                          </p>
                          {!quote.is_read && (
                            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">New</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{quote.email}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          quote.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          quote.status === 'actioned' ? 'bg-green-100 text-green-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {quote.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-5 py-8 text-sm text-gray-400 text-center">No quote requests yet</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className={`bg-white rounded-xl border p-5 ${(serviceDueSoonCount || 0) > 0 ? 'border-amber-200 bg-amber-50' : 'border-gray-200'}`}>
                <div className={`flex items-center gap-2 mb-2 text-sm font-medium ${(serviceDueSoonCount || 0) > 0 ? 'text-amber-600' : 'text-gray-500'}`}>
                  <Calendar size={16} />
                  Services Due (7d)
                </div>
                <p className="text-3xl font-bold text-gray-900">{serviceDueSoonCount ?? '—'}</p>
              </div>
              <div className={`bg-white rounded-xl border p-5 ${(unreadQuotes || 0) > 0 ? 'border-orange-200 bg-orange-50' : 'border-gray-200'}`}>
                <div className={`flex items-center gap-2 mb-2 text-sm font-medium ${(unreadQuotes || 0) > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                  <FileText size={16} />
                  New Quote Requests
                </div>
                <p className="text-3xl font-bold text-gray-900">{unreadQuotes ?? '—'}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Notifications</h3>
                {unreadNotifications > 0 && (
                  <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full">
                    {unreadNotifications} unread
                  </span>
                )}
              </div>
              {notifications && notifications.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {notifications.map((n: any) => (
                    <div
                      key={n.id}
                      className={`px-5 py-3 hover:bg-gray-50 cursor-pointer ${!n.is_read ? 'bg-orange-50' : ''}`}
                      onClick={() => {
                        if (!n.is_read) markAsRead(n.id);
                        if (n.link) navigate(n.link);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {n.type === 'quote_accepted' ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : n.type === 'quote_declined' ? (
                            <XCircle className="w-5 h-5 text-red-500" />
                          ) : (
                            <Bell className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900 truncate">{n.title}</p>
                            {!n.is_read && <span className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{new Date(n.created_at).toLocaleString('en-GB')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-5 py-8 text-sm text-gray-400 text-center">No notifications</p>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">Quick Access</h3>
              </div>
              <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-gray-100">
                {navLinks.map(({ label, icon: Icon, path, desc, badge }) => (
                  <button
                    key={path}
                    onClick={() => navigate(path)}
                    className="relative p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    {badge ? (
                      <span className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {badge}
                      </span>
                    ) : null}
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={15} className="text-gray-500 flex-shrink-0" />
                      <span className="text-sm font-semibold text-gray-900">{label}</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-snug">{desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
