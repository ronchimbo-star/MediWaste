import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Calendar, FileText, DollarSign, Package, Truck, ShieldCheck, Recycle, FlaskConical, Syringe, Pill, Leaf, ChevronRight, AlertTriangle, CheckCircle, ScrollText, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToastContext } from '../../contexts/ToastContext';
import CollectionRequestModal from '../../components/CollectionRequestModal';

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

const WASTE_TYPES_COVERED = [
  { icon: <Syringe size={14} />, label: 'Sharps & needles' },
  { icon: <Recycle size={14} />, label: 'Clinical waste bags' },
  { icon: <Pill size={14} />, label: 'Pharmaceutical waste' },
  { icon: <FlaskConical size={14} />, label: 'Cytotoxic waste' },
  { icon: <Leaf size={14} />, label: 'Anatomical waste' },
  { icon: <ShieldCheck size={14} />, label: 'Dental waste' },
  { icon: <Package size={14} />, label: 'Laboratory waste' },
  { icon: <Recycle size={14} />, label: 'Offensive waste' },
];

export default function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToastContext();
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCollectionModal, setShowCollectionModal] = useState(false);

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
        toast.error('Customer profile not found');
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {customerInfo?.contact_name}!
          </h1>
          <p className="text-gray-600 mt-1">Customer Portal — Account #{customerInfo?.customer_number}</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setShowCollectionModal(true)}
                className="bg-red-600 text-white rounded-lg p-6 hover:bg-red-700 transition-colors text-left"
              >
                <Truck className="w-8 h-8 mb-2" />
                <h3 className="text-lg font-semibold mb-1">Request a Collection</h3>
                <p className="text-sm opacity-90">Schedule an additional or urgent collection</p>
              </button>
              <div className="bg-blue-600 text-white rounded-lg p-6">
                <ShieldCheck className="w-8 h-8 mb-2" />
                <h3 className="text-lg font-semibold mb-1">Compliance Documents</h3>
                <p className="text-sm opacity-90">Waste transfer notes & consignment notes</p>
              </div>
            </div>

            {customerInfo && <CustomerDocumentsSection customerId={customerInfo.id} />}

            {customerInfo && <CustomerAuditsSection customerId={customerInfo.id} />}
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">What waste types are covered?</h3>
              <ul className="space-y-2">
                {WASTE_TYPES_COVERED.map((w) => (
                  <li key={w.label} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <span className="text-red-500 flex-shrink-0">{w.icon}</span>
                    {w.label}
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowCollectionModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
                >
                  <Truck size={15} />
                  Request a Collection
                </button>
              </div>
            </div>

            {customerInfo && <CustomerAgreementsCard customerEmail={customerInfo.email} />}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">Need help?</p>
              <p className="text-sm text-amber-700">Call us on <strong>0800 123 4567</strong> or email <strong>info@mediwaste.co.uk</strong></p>
            </div>
          </div>
        </div>
      </div>

      {showCollectionModal && customerInfo && (
        <CollectionRequestModal
          customerId={customerInfo.id}
          customerName={customerInfo.company_name || customerInfo.contact_name}
          customerAddress={customerInfo.collection_address}
          onClose={() => setShowCollectionModal(false)}
        />
      )}
    </div>
  );
}

function CustomerAuditsSection({ customerId }: { customerId: string }) {
  const [audits, setAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAudits = async () => {
      const { data } = await supabase
        .from('waste_audits')
        .select('id, audit_number, practice_name, status, share_token, created_at, client_signed_at, admin_signed_at')
        .eq('customer_id', customerId)
        .in('status', ['sent_to_client', 'finalised', 'signed'])
        .order('created_at', { ascending: false });
      setAudits(data || []);
      setLoading(false);
    };
    fetchAudits();
  }, [customerId]);

  if (loading || audits.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-4">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-blue-600" />
        Waste Audits
      </h2>
      <div className="space-y-3">
        {audits.map((audit) => (
          <a
            key={audit.id}
            href={`/audit/${audit.share_token}`}
            className="flex items-center justify-between border border-gray-200 rounded-lg p-3 hover:bg-blue-50 hover:border-blue-200 transition-colors"
          >
            <div>
              <p className="font-medium text-gray-900 text-sm">{audit.audit_number}</p>
              <p className="text-xs text-gray-500">
                {new Date(audit.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {audit.status === 'signed' ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Signed</span>
              ) : audit.status === 'finalised' ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Ready to Sign</span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Review</span>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function CustomerDocumentsSection({ customerId }: { customerId: string }) {
  const [hwcns, setHwcns] = useState<any[]>([]);
  const [wtns, setWtns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'hwcn' | 'wtn'>('hwcn');
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);

  useEffect(() => {
    const fetchDocs = async () => {
      const [hwcnRes, wtnRes] = await Promise.all([
        supabase
          .from('mw_hw_consignment_notes')
          .select(`
            id, hwcn_number, issue_date, collection_date, status,
            consignee_return_status, consignee_return_date, consignee_return_reference,
            consignee_return_document_url, consignee_name,
            carrier:mw_waste_carriers(name),
            mw_hwcn_line_items(waste_description, quantity, quantity_unit)
          `)
          .eq('customer_id', customerId)
          .order('issue_date', { ascending: false }),
        supabase
          .from('mw_waste_transfer_notes')
          .select(`
            id, wtn_number, issue_date, collection_date,
            carrier:mw_waste_carriers(name),
            mw_wtn_line_items(waste_description, quantity, quantity_unit)
          `)
          .eq('customer_id', customerId)
          .order('issue_date', { ascending: false }),
      ]);
      setHwcns(hwcnRes.data || []);
      setWtns(wtnRes.data || []);
      setLoading(false);
    };
    fetchDocs();
  }, [customerId]);

  if (loading) return null;
  if (hwcns.length === 0 && wtns.length === 0) return null;

  const docs = activeTab === 'hwcn' ? hwcns : wtns;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-4">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-blue-600" />
        Compliance Documents
      </h2>

      <div className="flex gap-2 mb-4 border-b border-gray-200">
        <button
          onClick={() => { setActiveTab('hwcn'); setSelectedDoc(null); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'hwcn' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Consignment Notes ({hwcns.length})
        </button>
        <button
          onClick={() => { setActiveTab('wtn'); setSelectedDoc(null); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'wtn' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Transfer Notes ({wtns.length})
        </button>
      </div>

      {selectedDoc ? (
        <DocumentDetail doc={selectedDoc} type={activeTab} onClose={() => setSelectedDoc(null)} />
      ) : docs.length === 0 ? (
        <p className="text-gray-500 text-center py-6 text-sm">No {activeTab === 'hwcn' ? 'consignment' : 'transfer'} notes yet</p>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              className="w-full flex items-center justify-between border border-gray-200 rounded-lg p-3 hover:bg-blue-50 hover:border-blue-200 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {activeTab === 'hwcn' ? (
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  ) : (
                    <FileText className="w-5 h-5 text-blue-500" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">
                    {activeTab === 'hwcn' ? doc.hwcn_number : doc.wtn_number}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(doc.issue_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {doc.carrier?.name && ` — ${doc.carrier.name}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activeTab === 'hwcn' && (
                  doc.consignee_return_status === 'received' ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      <CheckCircle size={12} /> Returned
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      <AlertTriangle size={12} /> Pending
                    </span>
                  )
                )}
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DocumentDetail({ doc, type, onClose }: { doc: any; type: 'hwcn' | 'wtn'; onClose: () => void }) {
  const lineItems = type === 'hwcn' ? doc.mw_hwcn_line_items : doc.mw_wtn_line_items;
  const docNumber = type === 'hwcn' ? doc.hwcn_number : doc.wtn_number;

  return (
    <div>
      <button onClick={onClose} className="text-sm text-blue-600 hover:text-blue-800 mb-3 flex items-center gap-1">
        &larr; Back to list
      </button>
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{docNumber}</h3>
            <p className="text-sm text-gray-500">
              Issued: {new Date(doc.issue_date).toLocaleDateString('en-GB')}
              {doc.collection_date && ` | Collected: ${new Date(doc.collection_date).toLocaleDateString('en-GB')}`}
            </p>
          </div>
          {type === 'hwcn' && (
            doc.consignee_return_status === 'received' ? (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <CheckCircle size={14} /> Consignee Return Received
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                <AlertTriangle size={14} /> Awaiting Consignee Return
              </span>
            )
          )}
        </div>

        {doc.carrier?.name && (
          <p className="text-sm text-gray-600 mb-2">Carrier: {doc.carrier.name}</p>
        )}

        {type === 'hwcn' && doc.consignee_name && (
          <p className="text-sm text-gray-600 mb-2">Receiving Site: {doc.consignee_name}</p>
        )}

        {type === 'hwcn' && doc.consignee_return_status === 'received' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
            <p className="text-sm font-medium text-green-800 mb-1">Consignee Return Details</p>
            <p className="text-xs text-green-700">
              Received: {doc.consignee_return_date ? new Date(doc.consignee_return_date).toLocaleDateString('en-GB') : '—'}
              {doc.consignee_return_reference && ` | Ref: ${doc.consignee_return_reference}`}
            </p>
            {doc.consignee_return_document_url && (
              <a
                href={doc.consignee_return_document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                <FileText size={12} /> View Return Document
              </a>
            )}
          </div>
        )}

        {lineItems && lineItems.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-medium text-gray-700 mb-2">Waste Items</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-3 py-1.5 text-left font-medium text-gray-600">Description</th>
                  <th className="border border-gray-200 px-3 py-1.5 text-right font-medium text-gray-600">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item: any, i: number) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-200 px-3 py-1.5 text-gray-700">{item.waste_description || '—'}</td>
                    <td className="border border-gray-200 px-3 py-1.5 text-right text-gray-700">{item.quantity} {item.quantity_unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-gray-100">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <FileText size={14} /> Print / Save as PDF
          </button>
        </div>
      </div>
    </div>
  );
}

interface Agreement {
  id: string;
  agreement_number: string;
  status: string;
  secure_token: string;
  current_version: number;
  start_date: string | null;
  end_date: string | null;
  versions: { version_number: number; created_at: string }[];
}

function CustomerAgreementsCard({ customerEmail }: { customerEmail: string }) {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgreements = async () => {
      const { data, error } = await supabase
        .from('service_agreements')
        .select(`
          id, agreement_number, status, secure_token, current_version, start_date, end_date,
          versions:service_agreement_versions ( version_number, created_at )
        `)
        .eq('contact_email', customerEmail)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAgreements(data as Agreement[]);
      }
      setLoading(false);
    };
    fetchAgreements();
  }, [customerEmail]);

  if (loading || agreements.length === 0) return null;

  const statusColour: Record<string, string> = {
    accepted: 'bg-green-100 text-green-700',
    sent: 'bg-blue-100 text-blue-700',
    draft: 'bg-gray-100 text-gray-600',
    declined: 'bg-red-100 text-red-700',
    expired: 'bg-orange-100 text-orange-700',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
        <ScrollText size={15} className="text-red-500" />
        Service Agreements
      </h3>
      <div className="space-y-3">
        {agreements.map((agreement) => {
          const sortedVersions = [...(agreement.versions || [])].sort(
            (a, b) => b.version_number - a.version_number
          );
          const hasMultipleVersions = sortedVersions.length > 1;

          return (
            <div key={agreement.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-3 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{agreement.agreement_number}</p>
                  {agreement.start_date && (
                    <p className="text-xs text-gray-500">
                      From {new Date(agreement.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {agreement.end_date && ` to ${new Date(agreement.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                    </p>
                  )}
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${statusColour[agreement.status] || 'bg-gray-100 text-gray-600'}`}>
                  {agreement.status}
                </span>
              </div>

              <div className="divide-y divide-gray-100">
                {hasMultipleVersions ? (
                  sortedVersions.map((ver, idx) => (
                    <a
                      key={ver.version_number}
                      href={`/service-agreement/${agreement.secure_token}${ver.version_number !== agreement.current_version ? `?version=${ver.version_number}` : ''}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-3 py-2 hover:bg-blue-50 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <FileText size={13} className={idx === 0 ? 'text-blue-600' : 'text-gray-400'} />
                        <span className={`text-sm ${idx === 0 ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                          v{ver.version_number}{idx === 0 ? ' (Latest)' : ''}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(ver.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <ExternalLink size={13} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </a>
                  ))
                ) : (
                  <a
                    href={`/service-agreement/${agreement.secure_token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-3 py-2 hover:bg-blue-50 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={13} className="text-blue-600" />
                      <span className="text-sm font-medium text-gray-900">View Agreement</span>
                    </div>
                    <ExternalLink size={13} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
