import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Mail, Download, Users, AlertTriangle, Clock, CheckCircle } from 'lucide-react';

type ListType = 'active' | 'payment_due' | 'service_due' | 'all_opted_in';

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB');
}

function isOverdue(d: string | null) {
  if (!d) return false;
  return new Date(d) < new Date();
}

function isDueSoon(d: string | null, days = 7) {
  if (!d) return false;
  const due = new Date(d);
  const now = new Date();
  const soon = new Date();
  soon.setDate(soon.getDate() + days);
  return due >= now && due <= soon;
}

export default function MailingListsPage() {
  const navigate = useNavigate();
  const [activeList, setActiveList] = useState<ListType>('active');
  const [copied, setCopied] = useState(false);

  const { data: activeCustomers } = useQuery({
    queryKey: ['mailing-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mw_customers')
        .select('*')
        .eq('status', 'active')
        .eq('mailing_list_opted_in', true)
        .order('company_name');
      if (error) throw error;
      return data;
    },
  });

  const { data: paymentDueCustomers } = useQuery({
    queryKey: ['mailing-payment-due'],
    queryFn: async () => {
      const in14days = new Date();
      in14days.setDate(in14days.getDate() + 14);
      const { data, error } = await supabase
        .from('mw_customer_payments')
        .select('*, mw_customers(*)')
        .in('status', ['pending', 'overdue'])
        .lte('due_date', in14days.toISOString().split('T')[0])
        .order('due_date');
      if (error) throw error;
      return data;
    },
  });

  const { data: serviceDueCustomers } = useQuery({
    queryKey: ['mailing-service-due'],
    queryFn: async () => {
      const in14days = new Date();
      in14days.setDate(in14days.getDate() + 14);
      const { data, error } = await supabase
        .from('mw_customer_services')
        .select('*, mw_customers(*)')
        .eq('status', 'active')
        .lte('next_service_date', in14days.toISOString().split('T')[0])
        .order('next_service_date');
      if (error) throw error;
      return data;
    },
  });

  const { data: allOptedIn } = useQuery({
    queryKey: ['mailing-all-opted-in'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mw_customers')
        .select('*')
        .eq('mailing_list_opted_in', true)
        .order('company_name');
      if (error) throw error;
      return data;
    },
  });

  function getCurrentList() {
    switch (activeList) {
      case 'active': return activeCustomers || [];
      case 'payment_due': return paymentDueCustomers || [];
      case 'service_due': return serviceDueCustomers || [];
      case 'all_opted_in': return allOptedIn || [];
    }
  }

  function getEmailsFromList() {
    const list = getCurrentList();
    if (activeList === 'payment_due' || activeList === 'service_due') {
      const seen = new Set<string>();
      return list
        .map((item: any) => item.mw_customers?.email)
        .filter((e: string) => e && !seen.has(e) && seen.add(e));
    }
    return list.map((c: any) => c.email).filter(Boolean);
  }

  function copyEmails() {
    const emails = getEmailsFromList().join(', ');
    navigator.clipboard.writeText(emails);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function downloadCSV() {
    const list = getCurrentList();
    let rows: string[][];
    if (activeList === 'payment_due') {
      rows = [
        ['Company', 'Contact', 'Email', 'Phone', 'Invoice', 'Description', 'Amount Due', 'Due Date', 'Status'],
        ...list.map((item: any) => [
          item.mw_customers?.company_name || '',
          item.mw_customers?.contact_name || '',
          item.mw_customers?.email || '',
          item.mw_customers?.phone || '',
          item.invoice_number || '',
          item.description || '',
          String(item.total_amount),
          item.due_date || '',
          item.status,
        ]),
      ];
    } else if (activeList === 'service_due') {
      rows = [
        ['Company', 'Contact', 'Email', 'Phone', 'Service', 'Frequency', 'Next Service Date'],
        ...list.map((item: any) => [
          item.mw_customers?.company_name || '',
          item.mw_customers?.contact_name || '',
          item.mw_customers?.email || '',
          item.mw_customers?.phone || '',
          item.service_name || '',
          item.frequency || '',
          item.next_service_date || '',
        ]),
      ];
    } else {
      rows = [
        ['Customer No.', 'Company', 'Contact', 'Email', 'Phone', 'Status', 'Customer Since'],
        ...list.map((c: any) => [
          c.customer_number || '',
          c.company_name || '',
          c.contact_name || '',
          c.email || '',
          c.phone || c.mobile || '',
          c.status || '',
          c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB') : '',
        ]),
      ];
    }
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mailing-list-${activeList}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const listConfig: Record<ListType, { label: string; icon: React.ReactNode; description: string; color: string }> = {
    active: {
      label: 'Active Customers',
      icon: <CheckCircle size={18} />,
      description: 'All active customers opted in to communications',
      color: 'green',
    },
    payment_due: {
      label: 'Payment Due',
      icon: <AlertTriangle size={18} />,
      description: 'Customers with payments due within 14 days',
      color: 'red',
    },
    service_due: {
      label: 'Service Due',
      icon: <Clock size={18} />,
      description: 'Customers with service visits due within 14 days',
      color: 'amber',
    },
    all_opted_in: {
      label: 'All Opted In',
      icon: <Users size={18} />,
      description: 'Every customer who has opted in to mailing list',
      color: 'blue',
    },
  };

  const currentList = getCurrentList();
  const emails = getEmailsFromList();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium">
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>
          <div className="flex gap-3">
            <button
              onClick={copyEmails}
              disabled={emails.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm disabled:opacity-40"
            >
              <Mail size={16} />
              {copied ? 'Copied!' : `Copy ${emails.length} Emails`}
            </button>
            <button
              onClick={downloadCSV}
              disabled={currentList.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm disabled:opacity-40"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mailing Lists</h1>
          <p className="text-gray-500 mt-1">Manage and export targeted customer lists for communications</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {(Object.entries(listConfig) as [ListType, typeof listConfig[ListType]][]).map(([key, cfg]) => {
            let count = 0;
            if (key === 'active') count = activeCustomers?.length || 0;
            else if (key === 'payment_due') count = paymentDueCustomers?.length || 0;
            else if (key === 'service_due') count = serviceDueCustomers?.length || 0;
            else if (key === 'all_opted_in') count = allOptedIn?.length || 0;

            const colorMap: Record<string, string> = {
              green: 'border-green-200 bg-green-50 text-green-700',
              red: 'border-red-200 bg-red-50 text-red-700',
              amber: 'border-amber-200 bg-amber-50 text-amber-700',
              blue: 'border-blue-200 bg-blue-50 text-blue-700',
            };

            return (
              <button
                key={key}
                onClick={() => setActiveList(key)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  activeList === key
                    ? colorMap[cfg.color] + ' border-opacity-100'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className={`flex items-center gap-2 mb-2 ${activeList === key ? '' : 'text-gray-500'}`}>
                  {cfg.icon}
                  <span className="text-sm font-medium">{cfg.label}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-xs text-gray-500 mt-1">{cfg.description}</p>
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-gray-900">{listConfig[activeList].label}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{listConfig[activeList].description}</p>
            </div>
            <span className="text-sm text-gray-500">{currentList.length} records</span>
          </div>

          {currentList.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500">No records found for this list.</p>
            </div>
          ) : activeList === 'payment_due' ? (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Company', 'Contact', 'Email', 'Invoice', 'Amount Due', 'Due Date', 'Status'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentList.map((item: any) => (
                  <tr key={item.id} className={`hover:bg-gray-50 ${isOverdue(item.due_date) ? 'bg-red-50' : ''}`}>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{item.mw_customers?.company_name || item.mw_customers?.contact_name}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{item.mw_customers?.contact_name}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{item.mw_customers?.email}</td>
                    <td className="px-5 py-3 text-sm text-gray-500 font-mono">{item.invoice_number || '—'}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900">£{Number(item.total_amount).toFixed(2)}</td>
                    <td className={`px-5 py-3 text-sm font-medium ${isOverdue(item.due_date) ? 'text-red-600' : isDueSoon(item.due_date) ? 'text-amber-600' : 'text-gray-700'}`}>{formatDate(item.due_date)}</td>
                    <td className="px-5 py-3 text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isOverdue(item.due_date) ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {isOverdue(item.due_date) ? 'overdue' : item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeList === 'service_due' ? (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Company', 'Contact', 'Email', 'Service', 'Frequency', 'Next Service'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentList.map((item: any) => (
                  <tr key={item.id} className={`hover:bg-gray-50 ${isOverdue(item.next_service_date) ? 'bg-amber-50' : ''}`}>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{item.mw_customers?.company_name || item.mw_customers?.contact_name}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{item.mw_customers?.contact_name}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{item.mw_customers?.email}</td>
                    <td className="px-5 py-3 text-sm text-gray-800 font-medium">{item.service_name}</td>
                    <td className="px-5 py-3 text-sm text-gray-500 capitalize">{item.frequency}</td>
                    <td className={`px-5 py-3 text-sm font-medium ${isOverdue(item.next_service_date) ? 'text-red-600' : isDueSoon(item.next_service_date) ? 'text-amber-600' : 'text-gray-700'}`}>{formatDate(item.next_service_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Customer No.', 'Company / Contact', 'Email', 'Phone', 'Status', 'Since'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentList.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/admin/customers/${c.id}`)}>
                    <td className="px-5 py-3 text-sm font-mono text-gray-500">{c.customer_number}</td>
                    <td className="px-5 py-3">
                      <div className="text-sm font-medium text-gray-900">{c.company_name || c.contact_name}</div>
                      {c.company_name && <div className="text-xs text-gray-500">{c.contact_name}</div>}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{c.email}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{c.phone || c.mobile || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.status === 'active' ? 'bg-green-100 text-green-800' : c.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
