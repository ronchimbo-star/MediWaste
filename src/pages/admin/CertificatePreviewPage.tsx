import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import CertificatePreview from '../../components/certificates/CertificatePreview';
import { Download, FileEdit as Edit, ChevronLeft, ExternalLink } from 'lucide-react';
import { downloadCertificateAsPDF } from '../../utils/certificateDownload';

export default function CertificatePreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: cert, isLoading } = useQuery({
    queryKey: ['certificate', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mw_certificates')
        .select(`*, mw_customers(company_name, contact_name, billing_address, collection_address, postcode, phone, email)`)
        .eq('id', id)
        .single();
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

  if (isLoading) {
    return (
      <AdminLayout pageTitle="Certificate Preview">
        <div className="p-12 text-center text-gray-400">Loading...</div>
      </AdminLayout>
    );
  }

  if (!cert) {
    return (
      <AdminLayout pageTitle="Certificate Preview">
        <div className="p-12 text-center text-gray-400">Certificate not found.</div>
      </AdminLayout>
    );
  }

  const previewData = {
    certificate_number: cert.certificate_number,
    qr_code_token: cert.qr_code_token,
    customer_name: cert.mw_customers?.company_name || '—',
    issue_date: cert.issue_date,
    expiry_date: cert.expiry_date,
    waste_types_covered: cert.waste_types_covered || [],
    authorised_signatory_name: cert.authorised_signatory_name || settings?.default_signatory_name || '',
    authorised_signatory_title: cert.authorised_signatory_title || settings?.default_signatory_title || '',
    waste_carrier_licence: settings?.waste_carrier_licence || '',
    certification_statement: cert.certification_statement || settings?.default_certification_statement || '',
  };

  const handleDownload = () => downloadCertificateAsPDF(cert.certificate_number);

  return (
    <AdminLayout
      pageTitle={`Certificate ${cert.certificate_number}`}
      breadcrumbs={[
        { label: 'Admin', path: '/admin' },
        { label: 'Certificates', path: '/admin/certificates' },
        { label: cert.certificate_number },
      ]}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/admin/certificates')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft size={16} />
            Back to Certificates
          </button>
          <div className="flex items-center gap-2">
            <a
              href={`/compliance/${cert.qr_code_token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <ExternalLink size={15} />
              Public Page
            </a>
            <button
              onClick={() => navigate(`/admin/certificates/${cert.id}/edit`)}
              className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Edit size={15} />
              Edit
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Download size={15} />
              Download PNG
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Download size={15} />
              Download PDF
            </button>
          </div>
        </div>

        <div className="flex justify-center overflow-auto">
          <CertificatePreview data={previewData} settings={settings || null} />
        </div>
      </div>
    </AdminLayout>
  );
}
