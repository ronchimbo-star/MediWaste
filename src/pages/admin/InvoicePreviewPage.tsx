import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import InvoicePreview from '../../components/InvoicePreview';
import { FileEdit as Edit, ChevronLeft, Loader, Image, FileText, CheckCircle, XCircle } from 'lucide-react';
import { imageToDataUrl } from '../../utils/certificateDownload';
import { useToastContext } from '../../contexts/ToastContext';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function copyCanvasContent(original: HTMLElement, clone: HTMLElement) {
  const origCanvases = original.querySelectorAll('canvas');
  const cloneCanvases = clone.querySelectorAll('canvas');
  origCanvases.forEach((origCanvas, i) => {
    const cloneCanvas = cloneCanvases[i];
    if (!cloneCanvas) return;
    cloneCanvas.width = origCanvas.width;
    cloneCanvas.height = origCanvas.height;
    const ctx = cloneCanvas.getContext('2d');
    if (ctx) ctx.drawImage(origCanvas, 0, 0);
  });
}

async function renderInvoiceCanvas(scale = 3): Promise<HTMLCanvasElement> {
  const el = document.getElementById('invoice-render');
  if (!el) throw new Error('Invoice element not found');

  const clone = el.cloneNode(true) as HTMLElement;
  copyCanvasContent(el, clone);
  clone.style.position = 'absolute';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  clone.style.zIndex = '-1';
  document.body.appendChild(clone);

  const images = clone.querySelectorAll('img');
  await Promise.all(Array.from(images).map((img) => new Promise<void>((resolve) => { if (img.complete) resolve(); else { img.onload = () => resolve(); img.onerror = () => resolve(); } })));
  await new Promise((r) => setTimeout(r, 200));

  const canvas = await html2canvas(clone, { scale, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', logging: false, width: clone.scrollWidth, height: clone.scrollHeight });
  document.body.removeChild(clone);
  return canvas;
}

export default function InvoicePreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToastContext();
  const [invoice, setInvoice] = useState<any>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [logoDataUrl, setLogoDataUrl] = useState('');
  const [faviconDataUrl, setFaviconDataUrl] = useState('');
  const [imagesReady, setImagesReady] = useState(false);
  const [downloading, setDownloading] = useState<'png' | 'pdf' | null>(null);

  useEffect(() => {
    fetchData();
    let cancelled = false;
    Promise.all([imageToDataUrl('/mediwaste-logo.png'), imageToDataUrl('/mediwaste-favicon.png')]).then(([logo, favicon]) => {
      if (!cancelled) { setLogoDataUrl(logo); setFaviconDataUrl(favicon); setImagesReady(true); }
    });
    return () => { cancelled = true; };
  }, [id]);

  const fetchData = async () => {
    try {
      const { data: inv, error } = await supabase.from('mw_invoices').select('*, customer:mw_customers(customer_number, company_name, contact_name, email, billing_address)').eq('id', id).single();
      if (error) throw error;
      setInvoice(inv);

      const { data: items } = await supabase.from('mw_invoice_line_items').select('*').eq('invoice_id', id);
      setLineItems(items || []);
    } catch {
      toast.error('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    const { error } = await supabase.from('mw_invoices').update({ status: 'paid', updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Failed to update'); return; }
    toast.success('Invoice marked as paid');
    fetchData();
  };

  const handleMarkUnpaid = async () => {
    const { error } = await supabase.from('mw_invoices').update({ status: 'sent', updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Failed to update'); return; }
    toast.success('Invoice marked as unpaid');
    fetchData();
  };

  const handleDownloadPNG = async () => {
    setDownloading('png');
    try {
      const canvas = await renderInvoiceCanvas(3);
      const link = document.createElement('a');
      link.download = `invoice-${invoice.invoice_number}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch { toast.error('Failed to generate PNG'); } finally { setDownloading(null); }
  };

  const handleDownloadPDF = async () => {
    setDownloading('pdf');
    try {
      const canvas = await renderInvoiceCanvas(3);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgAspect = canvas.height / canvas.width;
      const w = pageW;
      const h = w * imgAspect;
      const y = h < pageH ? (pageH - h) / 2 : 0;
      pdf.addImage(imgData, 'PNG', 0, y, w, h);
      pdf.save(`invoice-${invoice.invoice_number}.pdf`);
    } catch { toast.error('Failed to generate PDF'); } finally { setDownloading(null); }
  };

  if (loading) {
    return (
      <AdminLayout pageTitle="Invoice Preview">
        <div className="p-12 flex items-center justify-center gap-3 text-gray-400">
          <Loader size={18} className="animate-spin" /><span className="text-sm">Loading invoice...</span>
        </div>
      </AdminLayout>
    );
  }

  if (!invoice) {
    return (
      <AdminLayout pageTitle="Invoice Preview">
        <div className="p-12 text-center text-gray-400">Invoice not found.</div>
      </AdminLayout>
    );
  }

  const previewData = {
    invoice_number: invoice.invoice_number,
    issue_date: invoice.issue_date,
    due_date: invoice.due_date,
    po_number: invoice.po_number,
    vat_number: invoice.vat_number,
    payment_terms: invoice.payment_terms,
    billing_address: invoice.billing_address || invoice.customer?.billing_address,
    subtotal: invoice.subtotal,
    tax_amount: invoice.tax_amount,
    total_amount: invoice.total_amount,
    status: invoice.status,
    notes: invoice.notes,
    customer_name: invoice.customer?.company_name || invoice.customer?.contact_name || '—',
    customer_contact: invoice.customer?.contact_name || '',
    customer_email: invoice.customer?.email || '',
    customer_number: invoice.customer?.customer_number || '',
    line_items: lineItems.map((it) => ({
      description: it.description,
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
      total_price: Number(it.total_price),
      vat_rate: Number(it.vat_rate ?? 20),
      vat_amount: Number(it.vat_amount ?? 0),
      po_number: it.po_number,
    })),
  };

  const isPaid = invoice.status === 'paid';

  return (
    <AdminLayout pageTitle={`Invoice ${invoice.invoice_number}`} breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Invoices', path: '/admin/invoices' }, { label: invoice.invoice_number }]}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/admin/invoices')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
            <ChevronLeft size={16} /> Back to Invoices
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            {!isPaid && invoice.status !== 'cancelled' && (
              <button onClick={handleMarkPaid} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                <CheckCircle size={15} /> Mark Paid
              </button>
            )}
            {isPaid && (
              <button onClick={handleMarkUnpaid} className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium">
                <XCircle size={15} /> Mark Unpaid
              </button>
            )}
            <button onClick={() => navigate(`/admin/invoices/${id}/edit`)} className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium">
              <Edit size={15} /> Edit
            </button>
            <button onClick={handleDownloadPNG} disabled={!!downloading || !imagesReady} className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {downloading === 'png' ? <Loader size={15} className="animate-spin" /> : <Image size={15} />}
              PNG
            </button>
            <button onClick={handleDownloadPDF} disabled={!!downloading || !imagesReady} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {downloading === 'pdf' ? <Loader size={15} className="animate-spin" /> : <FileText size={15} />}
              {downloading === 'pdf' ? 'Preparing...' : 'Download PDF'}
            </button>
          </div>
        </div>

        <div className="flex justify-center overflow-auto">
          {imagesReady ? (
            <InvoicePreview data={previewData} logoDataUrl={logoDataUrl} faviconDataUrl={faviconDataUrl} />
          ) : (
            <div className="flex items-center justify-center gap-3 text-gray-400 py-24">
              <Loader size={18} className="animate-spin" /><span className="text-sm">Preparing invoice...</span>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
