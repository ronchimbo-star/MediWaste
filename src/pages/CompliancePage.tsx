import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import CertificatePreview from '../components/certificates/CertificatePreview';
import { downloadCertificateAsPDF } from '../utils/certificateDownload';
import CollectionRequestModal from '../components/CollectionRequestModal';
import { Download, Award, FileText, CheckCircle, XCircle, Clock, MapPin, Phone, Mail, Building, AlertTriangle, Truck } from 'lucide-react';

interface WasteTransferNote {
  id: string;
  wtn_number: string;
  issue_date: string;
  waste_description: string;
  waste_type: string;
  quantity: number;
  quantity_unit: string;
  container_type: string;
  ewc_description: string;
  treatment_method: string;
  processing_site_name: string;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; classes: string; icon: React.ReactNode }> = {
    active: { label: 'Active', classes: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle size={14} /> },
    expired: { label: 'Expired', classes: 'bg-red-100 text-red-700 border-red-200', icon: <XCircle size={14} /> },
    revoked: { label: 'Revoked', classes: 'bg-gray-100 text-gray-600 border-gray-200', icon: <XCircle size={14} /> },
    pending: { label: 'Pending', classes: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <Clock size={14} /> },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${s.classes}`}>
      {s.icon}{s.label}
    </span>
  );
}

function fmt(date: string) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function CompliancePage() {
  const { token } = useParams<{ token: string }>();
  const [showRequestModal, setShowRequestModal] = useState(false);

  const { data: cert, isLoading, error } = useQuery({
    queryKey: ['compliance-cert', token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mw_certificates')
        .select(`
          *,
          mw_customers (
            id, company_name, contact_name, email, phone, mobile,
            billing_address, collection_address, postcode
          )
        `)
        .eq('qr_code_token', token)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: settings } = useQuery({
    queryKey: ['certificate-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('mw_certificate_settings').select('*').eq('id', 'default').maybeSingle();
      return data;
    },
  });

  const { data: wasteNotes = [] } = useQuery({
    queryKey: ['compliance-wtns', cert?.customer_id],
    enabled: !!cert?.customer_id,
    queryFn: async () => {
      const { data } = await supabase
        .from('mw_waste_transfer_notes')
        .select('*')
        .eq('customer_id', cert!.customer_id)
        .order('issue_date', { ascending: false })
        .limit(50);
      return (data || []) as WasteTransferNote[];
    },
  });

  const handleDownload = () => downloadCertificateAsPDF(cert?.certificate_number || '');
  const customer = cert?.mw_customers;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading compliance record...</p>
        </div>
      </div>
    );
  }

  if (!cert || error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle size={28} className="text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Certificate Not Found</h1>
          <p className="text-gray-500 text-sm">
            This certificate link is invalid or has been removed. Please contact MediWaste for assistance.
          </p>
          <Link to="/" className="mt-6 inline-flex items-center gap-2 text-red-600 hover:text-red-700 text-sm font-medium">
            Return to MediWaste
          </Link>
        </div>
      </div>
    );
  }

  const previewData = {
    certificate_number: cert.certificate_number,
    qr_code_token: cert.qr_code_token,
    customer_name: customer?.company_name || '—',
    issue_date: cert.issue_date,
    expiry_date: cert.expiry_date,
    waste_types_covered: cert.waste_types_covered || [],
    authorised_signatory_name: cert.authorised_signatory_name || settings?.default_signatory_name || '',
    authorised_signatory_title: cert.authorised_signatory_title || settings?.default_signatory_title || '',
    waste_carrier_licence: settings?.waste_carrier_licence || '',
    certification_statement: cert.certification_statement || settings?.default_certification_statement || '',
  };

  const isExpired = cert.status === 'expired' || (cert.expiry_date && new Date(cert.expiry_date) < new Date());

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/mediwaste-logo.png" alt="MediWaste" className="h-7 w-auto" />
            <span className="text-sm text-gray-400 hidden sm:block">Compliance Verification</span>
          </div>
          {cert && !isExpired && customer && (
            <button
              onClick={() => setShowRequestModal(true)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Truck size={15} />
              <span className="hidden sm:inline">Request Collection</span>
              <span className="sm:hidden">Request</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {isExpired && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 text-sm">Certificate Expired</p>
              <p className="text-amber-700 text-sm mt-0.5">
                This certificate expired on {fmt(cert.expiry_date)}. Please contact MediWaste to renew.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Award size={16} className="text-red-600" />
                <h2 className="font-semibold text-gray-900">Certificate Details</h2>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Number</span>
                  <span className="font-mono font-medium text-gray-900">{cert.certificate_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  {statusBadge(cert.status)}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Issued</span>
                  <span className="text-gray-700">{fmt(cert.issue_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Expires</span>
                  <span className={isExpired ? 'text-red-600 font-medium' : 'text-gray-700'}>
                    {fmt(cert.expiry_date)}
                  </span>
                </div>
              </div>
            </div>

            {customer && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Building size={16} className="text-gray-500" />
                  <h2 className="font-semibold text-gray-900">Client Details</h2>
                </div>
                <div className="space-y-2.5 text-sm">
                  <p className="font-semibold text-gray-900 text-base">{customer.company_name}</p>
                  {customer.contact_name && (
                    <p className="text-gray-600">{customer.contact_name}</p>
                  )}
                  {customer.collection_address && (
                    <div className="flex items-start gap-2 text-gray-600">
                      <MapPin size={13} className="mt-0.5 flex-shrink-0 text-gray-400" />
                      <span>{customer.collection_address}{customer.postcode ? `, ${customer.postcode}` : ''}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone size={13} className="flex-shrink-0 text-gray-400" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail size={13} className="flex-shrink-0 text-gray-400" />
                      <span>{customer.email}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {cert.waste_types_covered?.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 mb-3">Waste Types Covered</h2>
                <ul className="space-y-2">
                  {cert.waste_types_covered.map((wt: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                      {wt}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Certificate</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 text-xs border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <Download size={12} />
                    PNG
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 text-xs bg-red-600 hover:bg-red-700 text-white px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <Download size={12} />
                    PDF
                  </button>
                </div>
              </div>
              <div className="overflow-auto">
                <div style={{ transform: 'scale(0.75)', transformOrigin: 'top left', width: '133%', pointerEvents: 'none' }}>
                  <CertificatePreview data={previewData} settings={settings || null} />
                </div>
              </div>
            </div>

            {wasteNotes.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="p-5 border-b border-gray-100 flex items-center gap-2">
                  <FileText size={16} className="text-gray-500" />
                  <h2 className="font-semibold text-gray-900">Waste Transfer Notes</h2>
                  <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {wasteNotes.length} record{wasteNotes.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">WTN No.</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Waste Type</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Quantity</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Treatment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {wasteNotes.map((wtn) => (
                        <tr key={wtn.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-mono font-medium text-gray-900">{wtn.wtn_number}</td>
                          <td className="px-4 py-3 text-gray-600">
                            {wtn.issue_date ? new Date(wtn.issue_date).toLocaleDateString('en-GB') : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {wtn.ewc_description || wtn.waste_type || wtn.waste_description || '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {wtn.quantity ? `${wtn.quantity} ${wtn.quantity_unit || ''}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{wtn.treatment_method || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {wasteNotes.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <FileText size={28} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-400 text-sm">No waste transfer notes on record</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {cert && !isExpired && customer && (
        <div className="max-w-5xl mx-auto px-4 pb-8">
          <div className="bg-red-600 rounded-2xl p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg">Need an additional collection?</h3>
              <p className="text-red-100 text-sm mt-1">Running low on space? Request a one-off collection outside your regular schedule.</p>
            </div>
            <button
              onClick={() => setShowRequestModal(true)}
              className="flex-shrink-0 flex items-center gap-2 bg-white text-red-600 hover:bg-red-50 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
            >
              <Truck size={16} />
              Request Collection
            </button>
          </div>
        </div>
      )}

      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-3">
            <img src="/mediwaste-logo.png" alt="MediWaste" className="h-5 w-auto opacity-60" />
            <span>MediWaste Solutions Ltd</span>
          </div>
          <div className="flex items-center gap-4">
            {settings?.waste_carrier_licence && (
              <span>Carrier Licence: {settings.waste_carrier_licence}</span>
            )}
            <Link to="/" className="hover:text-gray-600 transition-colors">mediwaste.co.uk</Link>
          </div>
        </div>
      </footer>

      {showRequestModal && customer && (
        <CollectionRequestModal
          customerId={customer.id}
          customerName={customer.company_name}
          customerAddress={customer.collection_address || customer.billing_address || undefined}
          onClose={() => setShowRequestModal(false)}
        />
      )}
    </div>
  );
}
