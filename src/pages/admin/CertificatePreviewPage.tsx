import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import CertificatePreview from '../../components/certificates/CertificatePreview';
import { Download, FileEdit as Edit, ChevronLeft, ExternalLink, Loader } from 'lucide-react';
import { downloadCertificateAsPDF, imageToDataUrl } from '../../utils/certificateDownload';

export default function CertificatePreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [logoDataUrl, setLogoDataUrl] = useState<string>('');
  const [faviconDataUrl, setFaviconDataUrl] = useState<string>('');
  const [imagesReady, setImagesReady] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { data: cert, isLoading: certLoading } = useQuery({
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

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['certificate-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('mw_certificate_settings').select('*').eq('id', 'default').maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      imageToDataUrl('/mediwaste-logo.png'),
      imageToDataUrl('/mediwaste-favicon.png'),
    ]).then(([logo, favicon]) => {
      if (!cancelled) {
        setLogoDataUrl(logo);
        setFaviconDataUrl(favicon);
        setImagesReady(true);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const isLoading = certLoading || settingsLoading;

  if (isLoading) {
    return (
      <AdminLayout pageTitle="Certificate Preview">
        <div className="p-12 flex items-center justify-center gap-3 text-gray-400">
          <Loader size={18} className="animate-spin" />
          <span className="text-sm">Loading certificate...</span>
        </div>
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

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      await downloadCertificateAsPDF(cert.certificate_number);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPNG = async () => {
    setDownloading(true);
    try {
      const el = document.getElementById('certificate-render');
      if (!el) return;
      const canvas = document.createElement('canvas');
      const scale = 2;
      canvas.width = el.offsetWidth * scale;
      canvas.height = el.offsetHeight * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const svgData = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">
          <foreignObject width="${el.offsetWidth}" height="${el.offsetHeight}" transform="scale(${scale})">
            ${el.outerHTML}
          </foreignObject>
        </svg>`;
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        const link = document.createElement('a');
        link.download = `certificate-${cert.certificate_number}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        setDownloading(false);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        setDownloading(false);
        handleDownloadPDF();
      };
      img.src = url;
    } catch {
      setDownloading(false);
      handleDownloadPDF();
    }
  };

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
              onClick={handleDownloadPNG}
              disabled={downloading || !imagesReady}
              className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? <Loader size={15} className="animate-spin" /> : <Download size={15} />}
              {downloading ? 'Preparing...' : 'Download PNG'}
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={downloading || !imagesReady}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? <Loader size={15} className="animate-spin" /> : <Download size={15} />}
              {downloading ? 'Preparing...' : 'Download PDF'}
            </button>
          </div>
        </div>

        <div className="flex justify-center overflow-auto">
          {imagesReady ? (
            <CertificatePreview
              data={previewData}
              settings={settings || null}
              logoDataUrl={logoDataUrl}
              faviconDataUrl={faviconDataUrl}
            />
          ) : (
            <div className="flex items-center justify-center gap-3 text-gray-400 py-24">
              <Loader size={18} className="animate-spin" />
              <span className="text-sm">Preparing certificate...</span>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
