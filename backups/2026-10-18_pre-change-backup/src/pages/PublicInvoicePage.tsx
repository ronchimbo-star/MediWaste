import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Download, Loader2, CheckCircle } from 'lucide-react';
import { renderElementToPDF } from '../utils/pdfDownload';
import { formatGBP, formatDate } from '../utils/invoiceCalculations';
import type { Invoice, InvoiceLineItem, InvoiceSettings } from '../types/invoice';

export default function PublicInvoicePage() {
  const { token } = useParams<{ token: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const viewRecorded = useRef(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { data: inv, error: invErr } = await supabase
          .from('mw_invoices')
          .select('*')
          .eq('public_token', token)
          .maybeSingle();

        if (invErr || !inv) {
          setError('Invoice not found or no longer available.');
          setLoading(false);
          return;
        }

        setInvoice(inv as Invoice);

        const { data: items } = await supabase
          .from('mw_invoice_line_items')
          .select('*')
          .eq('invoice_id', inv.id)
          .order('sort_order');
        if (items) setLineItems(items as InvoiceLineItem[]);

        const { data: sett } = await supabase
          .from('mw_invoice_settings')
          .select('*')
          .eq('id', 'default')
          .maybeSingle();
        if (sett) setSettings(sett as InvoiceSettings);

        // Record view (only once)
        if (!viewRecorded.current && inv.status === 'sent') {
          viewRecorded.current = true;
          await supabase.from('mw_invoices').update({
            status: 'viewed',
            viewed_at: new Date().toISOString(),
            last_viewed_at: new Date().toISOString(),
          }).eq('id', inv.id);

          await supabase.from('invoice_events').insert({
            invoice_id: inv.id,
            event_type: 'invoice_viewed',
            new_status: 'viewed',
            created_by: 'public',
          });
        } else if (inv.status !== 'sent') {
          await supabase.from('mw_invoices').update({
            last_viewed_at: new Date().toISOString(),
          }).eq('id', inv.id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      await renderElementToPDF({
        elementId: 'invoice-render',
        fileName: `${invoice?.invoice_number || 'invoice'}-MediWaste.pdf`,
        scale: 2,
      });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invoice Unavailable</h1>
          <p className="text-gray-600">{error || 'This invoice may have been cancelled or is no longer accessible.'}</p>
        </div>
      </div>
    );
  }

  const isCancelled = invoice.status === 'cancelled' || invoice.status === 'void';
  const isPaid = invoice.status === 'paid';
  const bank = invoice.bank_details_snapshot || settings;
  const paymentLink = invoice.payment_url || settings?.payment_link_url;

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Status Banner */}
        {isPaid && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <p className="font-semibold text-green-900">Invoice Paid</p>
              <p className="text-sm text-green-700">Thank you for your payment.</p>
            </div>
          </div>
        )}
        {isCancelled && (
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 mb-6">
            <p className="font-semibold text-gray-700">This invoice has been {invoice.status}.</p>
          </div>
        )}

        {/* Action Bar */}
        {!isCancelled && (
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 transition-colors"
            >
              {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Download PDF
            </button>
            {!isPaid && paymentLink && (
              <a
                href={paymentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors"
              >
                Pay Online
              </a>
            )}
          </div>
        )}

        {/* Invoice */}
        <div id="invoice-render" style={{ width: '794px', maxWidth: '100%', margin: '0 auto', background: 'white', fontFamily: "'Arial', sans-serif", boxShadow: '0 4px 32px rgba(0,0,0,0.14)' }}>
          <div style={{ height: '8px', background: '#FF0000', width: '100%' }} />
          <div style={{ padding: '40px 48px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <img src="/new-mediwaste-logoV1.svg" alt="MediWaste" crossOrigin="anonymous" style={{ width: '220px', height: 'auto', objectFit: 'contain' }} />
            <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#111', margin: 0 }}>INVOICE</h1>
          </div>
          <div style={{ padding: '0 48px 24px', display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #FF0000' }}>
            <div style={{ fontSize: '13px', color: '#333' }}>
              <p style={{ margin: '0 0 2px', fontWeight: 'bold', color: '#111' }}>MediWaste LTD</p>
              <p style={{ margin: '0 0 1px', color: '#555' }}>t/a MediWaste</p>
              <p style={{ margin: '0 0 1px', color: '#555' }}>Unit 2 Capital Industrial Estate</p>
              <p style={{ margin: '0 0 1px', color: '#555' }}>Crabtree Manorway South, Belvedere</p>
              <p style={{ margin: '0 0 1px', color: '#555' }}>Kent, DA17 6BJ</p>
              <p style={{ margin: '6px 0 0', color: '#555' }}>hello@mediwaste.co.uk</p>
            </div>
            <div style={{ textAlign: 'right', fontSize: '13px', color: '#555' }}>
              <table style={{ borderCollapse: 'collapse', marginLeft: 'auto' }}>
                <tbody>
                  <tr><td style={{ padding: '2px 12px 2px 0', fontWeight: 'bold', color: '#333' }}>Invoice No:</td><td style={{ fontWeight: 'bold', color: '#111' }}>{invoice.invoice_number}</td></tr>
                  <tr><td style={{ padding: '2px 12px 2px 0', fontWeight: 'bold', color: '#333' }}>Issue Date:</td><td>{formatDate(invoice.issue_date)}</td></tr>
                  <tr><td style={{ padding: '2px 12px 2px 0', fontWeight: 'bold', color: '#333' }}>Due Date:</td><td>{formatDate(invoice.due_date)}</td></tr>
                  {invoice.po_number && <tr><td style={{ padding: '2px 12px 2px 0', fontWeight: 'bold', color: '#333' }}>PO Number:</td><td>{invoice.po_number}</td></tr>}
                  {invoice.payment_terms && <tr><td style={{ padding: '2px 12px 2px 0', fontWeight: 'bold', color: '#333' }}>Payment Terms:</td><td>{invoice.payment_terms}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ padding: '24px 48px', fontSize: '13px' }}>
            <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: '700', letterSpacing: '1px', color: '#999', textTransform: 'uppercase' }}>Bill To</p>
            <p style={{ margin: '0 0 2px', fontWeight: 'bold', color: '#111', fontSize: '15px' }}>{invoice.customer?.company_name || invoice.billing_address?.split('\n')[0] || 'Customer'}</p>
            {invoice.billing_address && <p style={{ margin: '4px 0 0', color: '#555', whiteSpace: 'pre-line' }}>{invoice.billing_address}</p>}
            {invoice.site_address && (
              <>
                <p style={{ margin: '12px 0 6px', fontSize: '11px', fontWeight: '700', letterSpacing: '1px', color: '#999', textTransform: 'uppercase' }}>Site Address</p>
                <p style={{ color: '#555', whiteSpace: 'pre-line' }}>{invoice.site_address}</p>
              </>
            )}
          </div>
          <div style={{ padding: '0 48px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#1a1a1a' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', fontSize: '11px', textTransform: 'uppercase' }}>Description</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', color: 'white', fontSize: '11px', textTransform: 'uppercase', width: '60px' }}>Qty</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'white', fontSize: '11px', textTransform: 'uppercase', width: '100px' }}>Unit Price</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: 'white', fontSize: '11px', textTransform: 'uppercase', width: '110px' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, i) => {
                  const lineNet = Number(item.quantity) * Number(item.unit_price);
                  const lineVat = lineNet * (Number(item.vat_rate) / 100);
                  const lineTotal = lineNet + lineVat;
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #eee', background: i % 2 === 0 ? '#fafafa' : 'white' }}>
                      <td style={{ padding: '10px 12px', color: '#333' }}>{item.description}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#333' }}>{item.quantity}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#333' }}>{formatGBP(item.unit_price)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#111', fontWeight: '600' }}>{formatGBP(lineTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: '13px', width: '260px' }}>
                <tbody>
                  <tr><td style={{ padding: '6px 12px', color: '#555' }}>Subtotal (Net)</td><td style={{ padding: '6px 12px', textAlign: 'right', color: '#333' }}>{formatGBP(invoice.subtotal)}</td></tr>
                  <tr><td style={{ padding: '6px 12px', color: '#555' }}>VAT</td><td style={{ padding: '6px 12px', textAlign: 'right', color: '#333' }}>{formatGBP(invoice.tax_amount)}</td></tr>
                  {invoice.discount_amount > 0 && <tr><td style={{ padding: '6px 12px', color: '#555' }}>Discount</td><td style={{ padding: '6px 12px', textAlign: 'right', color: '#333' }}>-{formatGBP(invoice.discount_amount)}</td></tr>}
                  <tr style={{ borderTop: '2px solid #FF0000' }}>
                    <td style={{ padding: '10px 12px', fontWeight: '900', color: '#111', fontSize: '16px' }}>Total Due</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '900', color: '#111', fontSize: '16px' }}>{formatGBP(invoice.total_amount)}</td>
                  </tr>
                  {invoice.amount_paid > 0 && (
                    <tr><td style={{ padding: '6px 12px', color: 'green' }}>Amount Paid</td><td style={{ padding: '6px 12px', textAlign: 'right', color: 'green' }}>-{formatGBP(invoice.amount_paid)}</td></tr>
                  )}
                  {invoice.amount_paid > 0 && (
                    <tr><td style={{ padding: '6px 12px', fontWeight: 'bold', color: '#111' }}>Balance Due</td><td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 'bold', color: '#111' }}>{formatGBP(invoice.amount_due)}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ padding: '24px 48px', marginTop: '24px' }}>
            {invoice.notes && (
              <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: '8px', padding: '14px 18px', marginBottom: '16px', fontSize: '12px', color: '#555' }}>
                <p style={{ fontWeight: 'bold', margin: '0 0 4px', color: '#333', fontSize: '11px', textTransform: 'uppercase' }}>Notes</p>
                <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{invoice.notes}</p>
              </div>
            )}
            {!isCancelled && !isPaid && (
              <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: '8px', padding: '14px 18px', fontSize: '12px', color: '#555' }}>
                <p style={{ fontWeight: 'bold', margin: '0 0 4px', color: '#333', fontSize: '11px', textTransform: 'uppercase' }}>Payment Information</p>
                <p style={{ margin: '0 0 2px' }}>Bank: {bank?.bank_name || 'Tide Business Banking'}</p>
                <p style={{ margin: '0 0 2px' }}>Account Name: {bank?.account_name || 'Circular Horizons International LTD'}</p>
                <p style={{ margin: '0 0 2px' }}>Sort Code: {bank?.sort_code || '04-06-05'}</p>
                <p style={{ margin: 0 }}>Account Number: {bank?.account_number || '2283 7469'}</p>
                <p style={{ margin: '8px 0 0', fontWeight: 'bold', color: '#333' }}>Payment Reference: {invoice.payment_reference || invoice.invoice_number}</p>
                {paymentLink && (
                  <a href={paymentLink} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '8px', background: '#FF0000', color: 'white', padding: '8px 20px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', fontSize: '13px' }}>
                    Pay Online
                  </a>
                )}
              </div>
            )}
          </div>
          <div style={{ padding: '16px 48px', borderTop: '1px solid #eee', fontSize: '10px', color: '#aaa', textAlign: 'center' }}>
            <p style={{ margin: '0 0 2px' }}>MediWaste LTD | Company No. 15821509 | Registered in England and Wales</p>
            <p style={{ margin: 0 }}>Unit 2 Capital Industrial Estate, Crabtree Manorway South, Belvedere, Kent, DA17 6BJ</p>
          </div>
          <div style={{ height: '8px', background: '#FF0000', width: '100%' }} />
        </div>
      </div>
    </div>
  );
}
