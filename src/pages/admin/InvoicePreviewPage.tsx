import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/admin/AdminLayout';
import InvoicePreview from '../../components/InvoicePreview';
import { FileEdit as Edit, ChevronLeft, Loader, Image, FileText, CheckCircle, XCircle, Settings } from 'lucide-react';
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

interface InvoiceSettings {
  bank_name: string;
  account_name: string;
  sort_code: string;
  account_number: string;
  vat_number: string;
  payment_instructions: string | null;
}

export default function InvoicePreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToastContext();
  const [invoice, setInvoice] = useState<any>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoDataUrl, setLogoDataUrl] = useState('');
  const [imagesReady, setImagesReady] = useState(false);
  const [downloading, setDownloading] = useState<'png' | 'pdf' | null>(null);
  const [showBankingSettings, setShowBankingSettings] = useState(false);

  useEffect(() => {
    fetchData();
    let cancelled = false;
    imageToDataUrl('/mediwaste-logo.png').then((logo) => {
      if (!cancelled) { setLogoDataUrl(logo); setImagesReady(true); }
    });
    return () => { cancelled = true; };
  }, [id]);

  const fetchData = async () => {
    try {
      const [invResult, settingsResult] = await Promise.all([
        supabase.from('mw_invoices').select('*, customer:mw_customers(customer_number, company_name, contact_name, email, billing_address)').eq('id', id).single(),
        supabase.from('mw_invoice_settings').select('*').eq('id', 'default').maybeSingle(),
      ]);

      if (invResult.error) throw invResult.error;
      setInvoice(invResult.data);
      setInvoiceSettings(settingsResult.data);

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
            <button onClick={() => setShowBankingSettings(true)} className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium">
              <Settings size={15} /> Banking
            </button>
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
            <InvoicePreview data={previewData} settings={invoiceSettings} logoDataUrl={logoDataUrl} />
          ) : (
            <div className="flex items-center justify-center gap-3 text-gray-400 py-24">
              <Loader size={18} className="animate-spin" /><span className="text-sm">Preparing invoice...</span>
            </div>
          )}
        </div>
      </div>

      {showBankingSettings && (
        <BankingSettingsModal
          settings={invoiceSettings}
          onClose={() => setShowBankingSettings(false)}
          onSaved={() => { setShowBankingSettings(false); fetchData(); }}
        />
      )}
    </AdminLayout>
  );
}

function BankingSettingsModal({ settings, onClose, onSaved }: { settings: InvoiceSettings | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToastContext();
  const [saving, setSaving] = useState(false);
  const [bankName, setBankName] = useState(settings?.bank_name || 'Tide Business Banking');
  const [accountName, setAccountName] = useState(settings?.account_name || 'Circular Horizons International LTD');
  const [sortCode, setSortCode] = useState(settings?.sort_code || '04-06-05');
  const [accountNumber, setAccountNumber] = useState(settings?.account_number || '2283 7469');
  const [vatNumber, setVatNumber] = useState(settings?.vat_number || '');
  const [paymentInstructions, setPaymentInstructions] = useState(settings?.payment_instructions || '');

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        id: 'default',
        bank_name: bankName,
        account_name: accountName,
        sort_code: sortCode,
        account_number: accountNumber,
        vat_number: vatNumber,
        payment_instructions: paymentInstructions || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('mw_invoice_settings').upsert(payload);
      if (error) throw error;
      toast.success('Banking details updated');
      onSaved();
    } catch {
      toast.error('Failed to save banking details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-xl">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Invoice Banking Details</h2>
          <p className="text-sm text-gray-500 mt-1">These details appear on all invoices</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
            <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
            <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Code</label>
              <input type="text" value={sortCode} onChange={(e) => setSortCode(e.target.value)} placeholder="XX-XX-XX" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
              <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">VAT Registration Number</label>
            <input type="text" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder="e.g. GB 123 4567 89" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Payment Instructions</label>
            <textarea value={paymentInstructions} onChange={(e) => setPaymentInstructions(e.target.value)} rows={2} placeholder="Optional instructions shown on invoices..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
            {saving ? 'Saving...' : 'Save Details'}
          </button>
        </div>
      </div>
    </div>
  );
}
