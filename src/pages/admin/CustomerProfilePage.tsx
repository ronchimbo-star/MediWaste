import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useToastContext } from '../../contexts/ToastContext';
import { Plus, FileEdit as Edit2, Trash2, CheckCircle, Phone, Mail, MapPin, Building, X, ChevronDown, ChevronUp, Bell } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import NotesPanel from '../../components/admin/NotesPanel';

type ServiceStatus = 'active' | 'paused' | 'cancelled';
type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

interface CustomerService {
  id: string;
  service_name: string;
  service_type: string;
  description: string;
  frequency: string;
  unit_price: number;
  quantity: number;
  status: ServiceStatus;
  start_date: string | null;
  next_service_date: string | null;
  last_service_date: string | null;
  notes: string | null;
}

interface CustomerPayment {
  id: string;
  invoice_number: string | null;
  description: string;
  amount: number;
  vat_amount: number;
  total_amount: number;
  due_date: string | null;
  paid_date: string | null;
  payment_method: string | null;
  reference: string | null;
  status: PaymentStatus;
  notes: string | null;
}

interface Reminder {
  id: string;
  type: string;
  title: string;
  message: string;
  due_date: string | null;
  is_dismissed: boolean;
}

const FREQ_OPTIONS = ['weekly', 'fortnightly', 'monthly', 'bi-monthly', 'quarterly', 'annually', 'one-off'];
const PAY_METHODS = ['bank_transfer', 'direct_debit', 'card', 'cheque', 'cash'];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    paused: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    suspended: 'bg-orange-100 text-orange-800',
  };
  return map[status] || 'bg-gray-100 text-gray-800';
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB');
}

function isOverdue(d: string | null) {
  if (!d) return false;
  return new Date(d) < new Date();
}

export default function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { toast } = useToastContext();

  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'payments' | 'reminders' | 'notes'>('overview');
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingService, setEditingService] = useState<CustomerService | null>(null);
  const [editingPayment, setEditingPayment] = useState<CustomerPayment | null>(null);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null);

  const [serviceForm, setServiceForm] = useState({
    service_name: '', service_type: 'collection', description: '',
    frequency: 'monthly', unit_price: '', quantity: '1',
    status: 'active' as ServiceStatus, start_date: '', next_service_date: '', last_service_date: '', notes: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    invoice_number: '', description: '', amount: '', vat_amount: '',
    due_date: '', paid_date: '', payment_method: '', reference: '',
    status: 'pending' as PaymentStatus, notes: ''
  });

  const [reminderForm, setReminderForm] = useState({
    type: 'general', title: '', message: '', due_date: ''
  });

  const [editForm, setEditForm] = useState<any>({});

  const { data: customer, isLoading: loadingCustomer } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('mw_customers').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: services } = useQuery({
    queryKey: ['customer-services', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mw_customer_services')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CustomerService[];
    },
  });

  const { data: payments } = useQuery({
    queryKey: ['customer-payments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mw_customer_payments')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CustomerPayment[];
    },
  });

  const { data: reminders } = useQuery({
    queryKey: ['customer-reminders', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mw_reminders')
        .select('*')
        .eq('customer_id', id)
        .eq('is_dismissed', false)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data as Reminder[];
    },
  });

  const saveServiceMutation = useMutation({
    mutationFn: async (form: typeof serviceForm) => {
      const payload = {
        customer_id: id,
        service_name: form.service_name,
        service_type: form.service_type,
        description: form.description,
        frequency: form.frequency,
        unit_price: parseFloat(form.unit_price) || 0,
        quantity: parseInt(form.quantity) || 1,
        status: form.status,
        start_date: form.start_date || null,
        next_service_date: form.next_service_date || null,
        last_service_date: form.last_service_date || null,
        notes: form.notes || null,
      };
      if (editingService) {
        const { error } = await supabase.from('mw_customer_services').update(payload).eq('id', editingService.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('mw_customer_services').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-services', id] });
      toast.success(editingService ? 'Service updated' : 'Service added');
      setShowServiceModal(false);
      setEditingService(null);
      resetServiceForm();
    },
    onError: () => toast.error('Failed to save service'),
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      const { error } = await supabase.from('mw_customer_services').delete().eq('id', serviceId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-services', id] });
      toast.success('Service deleted');
    },
    onError: () => toast.error('Failed to delete service'),
  });

  const savePaymentMutation = useMutation({
    mutationFn: async (form: typeof paymentForm) => {
      const amt = parseFloat(form.amount) || 0;
      const vat = parseFloat(form.vat_amount) || 0;
      const payload = {
        customer_id: id,
        invoice_number: form.invoice_number || null,
        description: form.description,
        amount: amt,
        vat_amount: vat,
        total_amount: amt + vat,
        due_date: form.due_date || null,
        paid_date: form.paid_date || null,
        payment_method: form.payment_method || null,
        reference: form.reference || null,
        status: form.status,
        notes: form.notes || null,
      };
      if (editingPayment) {
        const { error } = await supabase.from('mw_customer_payments').update(payload).eq('id', editingPayment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('mw_customer_payments').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-payments', id] });
      toast.success(editingPayment ? 'Payment updated' : 'Payment recorded');
      setShowPaymentModal(false);
      setEditingPayment(null);
      resetPaymentForm();
    },
    onError: () => toast.error('Failed to save payment'),
  });

  const markPaidMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase.from('mw_customer_payments')
        .update({ status: 'paid', paid_date: new Date().toISOString().split('T')[0] })
        .eq('id', paymentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-payments', id] });
      toast.success('Payment marked as paid');
    },
    onError: () => toast.error('Failed to mark payment as paid'),
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase.from('mw_customer_payments').delete().eq('id', paymentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-payments', id] });
      toast.success('Payment deleted');
    },
    onError: () => toast.error('Failed to delete payment'),
  });

  const saveReminderMutation = useMutation({
    mutationFn: async (form: typeof reminderForm) => {
      if (editingReminder) {
        const { error } = await supabase.from('mw_reminders').update({
          type: form.type,
          title: form.title,
          message: form.message,
          due_date: form.due_date || null,
        }).eq('id', editingReminder.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('mw_reminders').insert([{
          customer_id: id,
          type: form.type,
          title: form.title,
          message: form.message,
          due_date: form.due_date || null,
          is_dismissed: false,
        }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-reminders', id] });
      toast.success(editingReminder ? 'Reminder updated' : 'Reminder added');
      setShowReminderModal(false);
      setEditingReminder(null);
      setReminderForm({ type: 'general', title: '', message: '', due_date: '' });
    },
    onError: () => toast.error('Failed to save reminder'),
  });

  const deleteReminderMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase.from('mw_reminders').delete().eq('id', reminderId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-reminders', id] });
      toast.success('Reminder deleted');
    },
    onError: () => toast.error('Failed to delete reminder'),
  });

  const dismissReminderMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      const { error } = await supabase.from('mw_reminders')
        .update({ is_dismissed: true, dismissed_at: new Date().toISOString() })
        .eq('id', reminderId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-reminders', id] });
      toast.success('Reminder dismissed');
    },
    onError: () => toast.error('Failed to dismiss reminder'),
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from('mw_customers').update(form).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer', id] });
      toast.success('Customer updated');
      setShowEditModal(false);
    },
    onError: () => toast.error('Failed to update customer'),
  });

  function resetServiceForm() {
    setServiceForm({ service_name: '', service_type: 'collection', description: '', frequency: 'monthly', unit_price: '', quantity: '1', status: 'active', start_date: '', next_service_date: '', last_service_date: '', notes: '' });
  }

  function resetPaymentForm() {
    setPaymentForm({ invoice_number: '', description: '', amount: '', vat_amount: '', due_date: '', paid_date: '', payment_method: '', reference: '', status: 'pending', notes: '' });
  }

  function openEditService(s: CustomerService) {
    setEditingService(s);
    setServiceForm({
      service_name: s.service_name, service_type: s.service_type, description: s.description || '',
      frequency: s.frequency, unit_price: String(s.unit_price), quantity: String(s.quantity),
      status: s.status, start_date: s.start_date || '', next_service_date: s.next_service_date || '',
      last_service_date: s.last_service_date || '', notes: s.notes || ''
    });
    setShowServiceModal(true);
  }

  function openEditReminder(r: Reminder) {
    setEditingReminder(r);
    setReminderForm({ type: r.type, title: r.title, message: r.message, due_date: r.due_date || '' });
    setShowReminderModal(true);
  }

  function openEditPayment(p: CustomerPayment) {
    setEditingPayment(p);
    setPaymentForm({
      invoice_number: p.invoice_number || '', description: p.description, amount: String(p.amount),
      vat_amount: String(p.vat_amount), due_date: p.due_date || '', paid_date: p.paid_date || '',
      payment_method: p.payment_method || '', reference: p.reference || '', status: p.status, notes: p.notes || ''
    });
    setShowPaymentModal(true);
  }

  function openEditCustomer() {
    if (!customer) return;
    setEditForm({
      company_name: customer.company_name || '',
      contact_name: customer.contact_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      mobile: customer.mobile || '',
      billing_address: customer.billing_address || '',
      collection_address: customer.collection_address || '',
      postcode: customer.postcode || '',
      payment_terms_days: customer.payment_terms_days || 30,
      status: customer.status || 'active',
      mailing_list_opted_in: customer.mailing_list_opted_in ?? true,
      notes: customer.notes || '',
    });
    setShowEditModal(true);
  }

  const breadcrumbs = [{ label: 'Dashboard', path: '/admin' }, { label: 'Customers', path: '/admin/customers' }, { label: customer?.company_name || customer?.contact_name || 'Profile' }];

  if (loadingCustomer) {
    return (
      <AdminLayout pageTitle="Customer Profile" breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'Customers', path: '/admin/customers' }, { label: 'Loading...' }]}>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!customer) {
    return (
      <AdminLayout pageTitle="Customer Profile" breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'Customers', path: '/admin/customers' }, { label: 'Not Found' }]}>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Customer not found.</p>
        </div>
      </AdminLayout>
    );
  }

  const totalOwed = (payments || []).filter(p => p.status === 'pending' || p.status === 'overdue').reduce((s, p) => s + p.total_amount, 0);
  const totalPaid = (payments || []).filter(p => p.status === 'paid').reduce((s, p) => s + p.total_amount, 0);
  const overduePayments = (payments || []).filter(p => p.status === 'pending' && isOverdue(p.due_date));
  const activeServices = (services || []).filter(s => s.status === 'active');
  const activeReminders = (reminders || []).filter(r => !r.is_dismissed);

  return (
    <AdminLayout pageTitle={customer.company_name || customer.contact_name} breadcrumbs={breadcrumbs}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div />
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusBadge(customer.status)}`}>
              {customer.status}
            </span>
            <button
              onClick={openEditCustomer}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
            >
              <Edit2 size={15} />
              Edit Customer
            </button>
          </div>
        </div>

      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building className="w-7 h-7 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{customer.company_name || customer.contact_name}</h1>
              <p className="text-gray-500 text-sm">{customer.customer_number}</p>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                {customer.contact_name && <span className="flex items-center gap-1"><Building size={14} />{customer.contact_name}</span>}
                {customer.email && <span className="flex items-center gap-1"><Mail size={14} />{customer.email}</span>}
                {(customer.phone || customer.mobile) && <span className="flex items-center gap-1"><Phone size={14} />{customer.phone || customer.mobile}</span>}
                {customer.postcode && <span className="flex items-center gap-1"><MapPin size={14} />{customer.postcode}</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Active Services</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{activeServices.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Paid</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalPaid)}</p>
          </div>
          <div className={`rounded-xl border p-4 ${overduePayments.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Outstanding</p>
            <p className={`text-2xl font-bold mt-1 ${overduePayments.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatCurrency(totalOwed)}</p>
          </div>
          <div className={`rounded-xl border p-4 ${activeReminders.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Reminders</p>
            <p className={`text-2xl font-bold mt-1 ${activeReminders.length > 0 ? 'text-amber-600' : 'text-gray-900'}`}>{activeReminders.length}</p>
          </div>
        </div>

        <div className="flex gap-1 mb-6 bg-white rounded-xl border border-gray-200 p-1 w-fit">
          {(['overview', 'services', 'payments', 'reminders', 'notes'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${activeTab === tab ? 'bg-orange-500 text-white' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {tab}
              {tab === 'reminders' && activeReminders.length > 0 && (
                <span className="ml-2 bg-amber-400 text-white text-xs rounded-full px-1.5 py-0.5">{activeReminders.length}</span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Contact Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Contact Name</span><span className="text-gray-900 font-medium">{customer.contact_name || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="text-gray-900">{customer.email || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="text-gray-900">{customer.phone || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Mobile</span><span className="text-gray-900">{customer.mobile || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Postcode</span><span className="text-gray-900">{customer.postcode || '—'}</span></div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Account Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Customer No.</span><span className="text-gray-900 font-medium">{customer.customer_number}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Status</span><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge(customer.status)}`}>{customer.status}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Payment Terms</span><span className="text-gray-900">{customer.payment_terms_days || 30} days</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Source</span><span className="text-gray-900 capitalize">{customer.source || 'manual'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Mailing List</span><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${customer.mailing_list_opted_in ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{customer.mailing_list_opted_in ? 'Opted In' : 'Opted Out'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Customer Since</span><span className="text-gray-900">{customer.created_at ? new Date(customer.created_at).toLocaleDateString('en-GB') : '—'}</span></div>
              </div>
            </div>
            {(customer.billing_address || customer.collection_address) && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Addresses</h3>
                <div className="space-y-3 text-sm">
                  {customer.billing_address && <div><p className="text-gray-500 mb-1">Billing Address</p><p className="text-gray-900 whitespace-pre-line">{customer.billing_address}</p></div>}
                  {customer.collection_address && <div><p className="text-gray-500 mb-1">Collection Address</p><p className="text-gray-900 whitespace-pre-line">{customer.collection_address}</p></div>}
                </div>
              </div>
            )}
            {customer.notes && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Internal Notes</h3>
                <p className="text-sm text-gray-700 whitespace-pre-line">{customer.notes}</p>
              </div>
            )}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">Quick Actions</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setActiveTab('services'); setShowServiceModal(true); }} className="flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors text-sm text-gray-700">
                  <Plus size={20} className="text-orange-500" />
                  Add Service
                </button>
                <button onClick={() => { setActiveTab('payments'); setShowPaymentModal(true); }} className="flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors text-sm text-gray-700">
                  <CheckCircle size={20} className="text-green-500" />
                  Record Payment
                </button>
                <button onClick={() => { setActiveTab('reminders'); setShowReminderModal(true); }} className="flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition-colors text-sm text-gray-700">
                  <Bell size={20} className="text-amber-500" />
                  Add Reminder
                </button>
                <a href={`mailto:${customer.email}`} className="flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm text-gray-700">
                  <Mail size={20} className="text-blue-500" />
                  Send Email
                </a>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Services ({(services || []).length})</h2>
              <button onClick={() => { resetServiceForm(); setEditingService(null); setShowServiceModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm">
                <Plus size={16} />
                Add Service
              </button>
            </div>
            {(services || []).length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-gray-500">No services added yet.</p>
                <button onClick={() => setShowServiceModal(true)} className="mt-4 text-orange-500 font-medium hover:text-orange-600">Add first service</button>
              </div>
            ) : (
              <div className="space-y-3">
                {(services || []).map(s => (
                  <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-semibold text-gray-900">{s.service_name}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge(s.status)}`}>{s.status}</span>
                        </div>
                        <p className="text-sm text-gray-500 capitalize">{s.service_type} · {s.frequency}</p>
                        {s.description && <p className="text-sm text-gray-600 mt-1">{s.description}</p>}
                        <div className="flex gap-6 mt-3 text-sm">
                          <div><span className="text-gray-500">Price: </span><span className="font-medium text-gray-900">{formatCurrency(s.unit_price)} × {s.quantity}</span></div>
                          {s.next_service_date && <div><span className="text-gray-500">Next service: </span><span className={`font-medium ${isOverdue(s.next_service_date) ? 'text-red-600' : 'text-gray-900'}`}>{formatDate(s.next_service_date)}</span></div>}
                          {s.last_service_date && <div><span className="text-gray-500">Last service: </span><span className="text-gray-900">{formatDate(s.last_service_date)}</span></div>}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button onClick={() => openEditService(s)} className="text-blue-600 hover:text-blue-800 p-1"><Edit2 size={16} /></button>
                        <button onClick={() => { if (window.confirm('Delete this service?')) deleteServiceMutation.mutate(s.id); }} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Payments ({(payments || []).length})</h2>
              <button onClick={() => { resetPaymentForm(); setEditingPayment(null); setShowPaymentModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm">
                <Plus size={16} />
                Add Payment
              </button>
            </div>
            {(payments || []).length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-gray-500">No payments recorded yet.</p>
                <button onClick={() => setShowPaymentModal(true)} className="mt-4 text-orange-500 font-medium hover:text-orange-600">Record first payment</button>
              </div>
            ) : (
              <div className="space-y-3">
                {(payments || []).map(p => (
                  <div key={p.id} className={`bg-white rounded-xl border p-4 ${p.status === 'overdue' || (p.status === 'pending' && isOverdue(p.due_date)) ? 'border-red-200' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          {p.invoice_number && <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">{p.invoice_number}</span>}
                          <h4 className="font-medium text-gray-900">{p.description}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge(p.status === 'pending' && isOverdue(p.due_date) ? 'overdue' : p.status)}`}>
                            {p.status === 'pending' && isOverdue(p.due_date) ? 'overdue' : p.status}
                          </span>
                        </div>
                        <div className="flex gap-5 text-sm mt-1">
                          <span className="font-semibold text-gray-900">{formatCurrency(p.total_amount)}</span>
                          {p.due_date && <span className={`${isOverdue(p.due_date) && p.status !== 'paid' ? 'text-red-600' : 'text-gray-500'}`}>Due {formatDate(p.due_date)}</span>}
                          {p.paid_date && <span className="text-green-600">Paid {formatDate(p.paid_date)}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {p.status !== 'paid' && (
                          <button onClick={() => markPaidMutation.mutate(p.id)} className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition-colors">
                            <CheckCircle size={13} />
                            Mark Paid
                          </button>
                        )}
                        <button onClick={() => setExpandedPayment(expandedPayment === p.id ? null : p.id)} className="text-gray-400 hover:text-gray-600 p-1">
                          {expandedPayment === p.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        <button onClick={() => openEditPayment(p)} className="text-blue-600 hover:text-blue-800 p-1"><Edit2 size={15} /></button>
                        <button onClick={() => { if (window.confirm('Delete this payment record?')) deletePaymentMutation.mutate(p.id); }} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={15} /></button>
                      </div>
                    </div>
                    {expandedPayment === p.id && (
                      <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div><span className="text-gray-500">Amount excl. VAT</span><p className="font-medium">{formatCurrency(p.amount)}</p></div>
                        <div><span className="text-gray-500">VAT</span><p className="font-medium">{formatCurrency(p.vat_amount)}</p></div>
                        {p.payment_method && <div><span className="text-gray-500">Method</span><p className="font-medium capitalize">{p.payment_method.replace('_', ' ')}</p></div>}
                        {p.reference && <div><span className="text-gray-500">Reference</span><p className="font-medium">{p.reference}</p></div>}
                        {p.notes && <div className="col-span-2 md:col-span-4"><span className="text-gray-500">Notes</span><p className="text-gray-700">{p.notes}</p></div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reminders' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Reminders</h2>
              <button onClick={() => setShowReminderModal(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm">
                <Plus size={16} />
                Add Reminder
              </button>
            </div>
            {activeReminders.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Bell size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No active reminders.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeReminders.map(r => (
                  <div key={r.id} className={`bg-white rounded-xl border p-4 flex justify-between items-start ${r.due_date && isOverdue(r.due_date) ? 'border-amber-200 bg-amber-50' : 'border-gray-200'}`}>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${r.type === 'payment_due' ? 'bg-red-100 text-red-700' : r.type === 'service_due' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                          {r.type.replace('_', ' ')}
                        </span>
                        <h4 className="font-medium text-gray-900">{r.title}</h4>
                      </div>
                      <p className="text-sm text-gray-600">{r.message}</p>
                      {r.due_date && <p className={`text-xs mt-1 font-medium ${isOverdue(r.due_date) ? 'text-amber-600' : 'text-gray-500'}`}>Due: {formatDate(r.due_date)}</p>}
                    </div>
                    <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                      <button onClick={() => openEditReminder(r)} className="text-blue-500 hover:text-blue-700 p-1" title="Edit"><Edit2 size={15} /></button>
                      <button onClick={() => { if (window.confirm('Delete this reminder permanently?')) deleteReminderMutation.mutate(r.id); }} className="text-red-400 hover:text-red-600 p-1" title="Delete"><Trash2 size={15} /></button>
                      <button onClick={() => dismissReminderMutation.mutate(r.id)} className="text-gray-400 hover:text-gray-600 p-1" title="Dismiss"><X size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <NotesPanel customerId={id} title={`Notes for ${customer.company_name || customer.contact_name}`} />
        )}
      </div>

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-gray-900">Edit Customer</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {[['company_name', 'Company Name', 'text'], ['contact_name', 'Contact Name', 'text'], ['email', 'Email', 'email'], ['phone', 'Phone', 'tel'], ['mobile', 'Mobile', 'tel'], ['postcode', 'Postcode', 'text']].map(([field, label, type]) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type={type} value={editForm[field] || ''} onChange={e => setEditForm({ ...editForm, [field]: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent">
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms (days)</label>
                <input type="number" value={editForm.payment_terms_days} onChange={e => setEditForm({ ...editForm, payment_terms_days: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Billing Address</label>
                <textarea rows={2} value={editForm.billing_address} onChange={e => setEditForm({ ...editForm, billing_address: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Collection Address</label>
                <textarea rows={2} value={editForm.collection_address} onChange={e => setEditForm({ ...editForm, collection_address: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
                <textarea rows={3} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
              </div>
              <div className="md:col-span-2 flex items-center gap-3">
                <input type="checkbox" id="mailing_opt" checked={editForm.mailing_list_opted_in} onChange={e => setEditForm({ ...editForm, mailing_list_opted_in: e.target.checked })} className="w-4 h-4 accent-orange-500" />
                <label htmlFor="mailing_opt" className="text-sm text-gray-700">Opted in to mailing list</label>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={() => updateCustomerMutation.mutate(editForm)} disabled={updateCustomerMutation.isPending} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {showServiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-gray-900">{editingService ? 'Edit Service' : 'Add Service'}</h3>
              <button onClick={() => { setShowServiceModal(false); setEditingService(null); resetServiceForm(); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Name *</label>
                <input required value={serviceForm.service_name} onChange={e => setServiceForm({ ...serviceForm, service_name: e.target.value })} placeholder="e.g. Sharps Waste Collection" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={serviceForm.service_type} onChange={e => setServiceForm({ ...serviceForm, service_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent">
                    {['collection', 'disposal', 'container_rental', 'training', 'other'].map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                  <select value={serviceForm.frequency} onChange={e => setServiceForm({ ...serviceForm, frequency: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent">
                    {FREQ_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (£)</label>
                  <input type="number" step="0.01" value={serviceForm.unit_price} onChange={e => setServiceForm({ ...serviceForm, unit_price: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input type="number" value={serviceForm.quantity} onChange={e => setServiceForm({ ...serviceForm, quantity: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="date" value={serviceForm.start_date} onChange={e => setServiceForm({ ...serviceForm, start_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Next Service Date</label>
                  <input type="date" value={serviceForm.next_service_date} onChange={e => setServiceForm({ ...serviceForm, next_service_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Service Date</label>
                  <input type="date" value={serviceForm.last_service_date} onChange={e => setServiceForm({ ...serviceForm, last_service_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={serviceForm.status} onChange={e => setServiceForm({ ...serviceForm, status: e.target.value as ServiceStatus })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent">
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description / Notes</label>
                <textarea rows={2} value={serviceForm.notes} onChange={e => setServiceForm({ ...serviceForm, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => { setShowServiceModal(false); setEditingService(null); resetServiceForm(); }} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={() => saveServiceMutation.mutate(serviceForm)} disabled={saveServiceMutation.isPending || !serviceForm.service_name} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50">
                {editingService ? 'Save Changes' : 'Add Service'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-gray-900">{editingPayment ? 'Edit Payment' : 'Record Payment'}</h3>
              <button onClick={() => { setShowPaymentModal(false); setEditingPayment(null); resetPaymentForm(); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                  <input value={paymentForm.invoice_number} onChange={e => setPaymentForm({ ...paymentForm, invoice_number: e.target.value })} placeholder="INV-2025-001" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={paymentForm.status} onChange={e => setPaymentForm({ ...paymentForm, status: e.target.value as PaymentStatus })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent">
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <input required value={paymentForm.description} onChange={e => setPaymentForm({ ...paymentForm, description: e.target.value })} placeholder="e.g. Monthly collection - January 2026" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount excl. VAT (£)</label>
                  <input type="number" step="0.01" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VAT (£)</label>
                  <input type="number" step="0.01" value={paymentForm.vat_amount} onChange={e => setPaymentForm({ ...paymentForm, vat_amount: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input type="date" value={paymentForm.due_date} onChange={e => setPaymentForm({ ...paymentForm, due_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paid Date</label>
                  <input type="date" value={paymentForm.paid_date} onChange={e => setPaymentForm({ ...paymentForm, paid_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select value={paymentForm.payment_method} onChange={e => setPaymentForm({ ...paymentForm, payment_method: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent">
                    <option value="">— Select —</option>
                    {PAY_METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                  <input value={paymentForm.reference} onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea rows={2} value={paymentForm.notes} onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => { setShowPaymentModal(false); setEditingPayment(null); resetPaymentForm(); }} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={() => savePaymentMutation.mutate(paymentForm)} disabled={savePaymentMutation.isPending || !paymentForm.description} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50">
                {editingPayment ? 'Save Changes' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReminderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">{editingReminder ? 'Edit Reminder' : 'Add Reminder'}</h3>
              <button onClick={() => { setShowReminderModal(false); setEditingReminder(null); setReminderForm({ type: 'general', title: '', message: '', due_date: '' }); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={reminderForm.type} onChange={e => setReminderForm({ ...reminderForm, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent">
                  <option value="general">General</option>
                  <option value="payment_due">Payment Due</option>
                  <option value="service_due">Service Due</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input value={reminderForm.title} onChange={e => setReminderForm({ ...reminderForm, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea rows={2} value={reminderForm.message} onChange={e => setReminderForm({ ...reminderForm, message: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input type="date" value={reminderForm.due_date} onChange={e => setReminderForm({ ...reminderForm, due_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => { setShowReminderModal(false); setEditingReminder(null); setReminderForm({ type: 'general', title: '', message: '', due_date: '' }); }} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={() => saveReminderMutation.mutate(reminderForm)} disabled={saveReminderMutation.isPending || !reminderForm.title} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50">{editingReminder ? 'Save Changes' : 'Add Reminder'}</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
}
