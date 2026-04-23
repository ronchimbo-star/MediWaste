interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  vat_rate: number;
  vat_amount: number;
  po_number: string | null;
}

interface InvoiceData {
  invoice_number: string;
  issue_date: string;
  due_date: string;
  po_number: string | null;
  vat_number: string | null;
  payment_terms: string | null;
  billing_address: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  notes: string | null;
  customer_name: string;
  customer_contact: string;
  customer_email: string;
  customer_number: string;
  line_items: LineItem[];
}

interface Props {
  data: InvoiceData;
  logoDataUrl?: string;
  faviconDataUrl?: string;
}

function fmt(date: string) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function statusLabel(s: string) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    draft: { label: 'DRAFT', bg: '#f3f4f6', color: '#6b7280' },
    sent: { label: 'SENT', bg: '#dbeafe', color: '#1d4ed8' },
    paid: { label: 'PAID', bg: '#dcfce7', color: '#16a34a' },
    overdue: { label: 'OVERDUE', bg: '#fee2e2', color: '#dc2626' },
    cancelled: { label: 'CANCELLED', bg: '#f3f4f6', color: '#9ca3af' },
  };
  return map[s] || map.draft;
}

export default function InvoicePreview({ data, logoDataUrl, faviconDataUrl }: Props) {
  const logoSrc = logoDataUrl || '/mediwaste-logo.png';
  const faviconSrc = faviconDataUrl || '/mediwaste-favicon.png';
  const st = statusLabel(data.status);

  const hasPONumbers = data.line_items.some((it) => it.po_number);

  return (
    <div
      id="invoice-render"
      style={{
        width: '794px',
        minHeight: '1123px',
        background: 'white',
        fontFamily: "'Arial', sans-serif",
        position: 'relative',
        boxShadow: '0 4px 32px rgba(0,0,0,0.14)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Red Top Bar */}
      <div style={{ height: '8px', background: '#FF0000', width: '100%', flexShrink: 0 }} />

      {/* Header */}
      <div style={{ padding: '40px 48px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={faviconSrc} alt="MediWaste" crossOrigin="anonymous" style={{ width: '52px', height: '52px', objectFit: 'contain' }} />
          <img src={logoSrc} alt="MediWaste" crossOrigin="anonymous" style={{ width: '180px', height: 'auto', objectFit: 'contain' }} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#111', margin: 0, letterSpacing: '-0.5px' }}>INVOICE</h1>
          <div style={{ display: 'inline-block', padding: '3px 12px', borderRadius: '4px', background: st.bg, color: st.color, fontSize: '11px', fontWeight: '700', letterSpacing: '1px', marginTop: '6px' }}>
            {st.label}
          </div>
        </div>
      </div>

      {/* Invoice Info Row */}
      <div style={{ padding: '0 48px 24px', display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #FF0000' }}>
        <div style={{ fontSize: '13px', color: '#333' }}>
          <p style={{ margin: '0 0 2px', fontWeight: 'bold', color: '#111' }}>Circular Horizons International LTD</p>
          <p style={{ margin: '0 0 1px', color: '#555' }}>t/a MediWaste</p>
          <p style={{ margin: '0 0 1px', color: '#555' }}>Unit 2 Capital Industrial Estate</p>
          <p style={{ margin: '0 0 1px', color: '#555' }}>Crabtree Manorway South, Belvedere</p>
          <p style={{ margin: '0 0 1px', color: '#555' }}>Kent, DA17 6BJ</p>
          <p style={{ margin: '6px 0 0', color: '#555' }}>hello@mediwaste.co.uk</p>
        </div>
        <div style={{ textAlign: 'right', fontSize: '13px', color: '#555' }}>
          <table style={{ borderCollapse: 'collapse', marginLeft: 'auto' }}>
            <tbody>
              <tr>
                <td style={{ padding: '2px 12px 2px 0', fontWeight: 'bold', color: '#333' }}>Invoice No:</td>
                <td style={{ padding: '2px 0', color: '#111', fontWeight: 'bold' }}>{data.invoice_number}</td>
              </tr>
              <tr>
                <td style={{ padding: '2px 12px 2px 0', fontWeight: 'bold', color: '#333' }}>Issue Date:</td>
                <td style={{ padding: '2px 0' }}>{fmt(data.issue_date)}</td>
              </tr>
              <tr>
                <td style={{ padding: '2px 12px 2px 0', fontWeight: 'bold', color: '#333' }}>Due Date:</td>
                <td style={{ padding: '2px 0' }}>{fmt(data.due_date)}</td>
              </tr>
              {data.po_number && (
                <tr>
                  <td style={{ padding: '2px 12px 2px 0', fontWeight: 'bold', color: '#333' }}>PO Number:</td>
                  <td style={{ padding: '2px 0' }}>{data.po_number}</td>
                </tr>
              )}
              {data.vat_number && (
                <tr>
                  <td style={{ padding: '2px 12px 2px 0', fontWeight: 'bold', color: '#333' }}>VAT Number:</td>
                  <td style={{ padding: '2px 0' }}>{data.vat_number}</td>
                </tr>
              )}
              {data.payment_terms && (
                <tr>
                  <td style={{ padding: '2px 12px 2px 0', fontWeight: 'bold', color: '#333' }}>Payment Terms:</td>
                  <td style={{ padding: '2px 0' }}>{data.payment_terms}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bill To */}
      <div style={{ padding: '24px 48px', fontSize: '13px' }}>
        <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: '700', letterSpacing: '1px', color: '#999', textTransform: 'uppercase' }}>Bill To</p>
        <p style={{ margin: '0 0 2px', fontWeight: 'bold', color: '#111', fontSize: '15px' }}>{data.customer_name}</p>
        <p style={{ margin: '0 0 1px', color: '#555' }}>{data.customer_contact}</p>
        <p style={{ margin: '0 0 1px', color: '#555' }}>{data.customer_email}</p>
        {data.billing_address && <p style={{ margin: '4px 0 0', color: '#555', whiteSpace: 'pre-line' }}>{data.billing_address}</p>}
        <p style={{ margin: '2px 0 0', color: '#999', fontSize: '12px' }}>Ref: {data.customer_number}</p>
      </div>

      {/* Line Items Table */}
      <div style={{ padding: '0 48px', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#1a1a1a' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</th>
              {hasPONumbers && <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PO #</th>}
              <th style={{ padding: '10px 12px', textAlign: 'center', color: 'white', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', width: '60px' }}>Qty</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', color: 'white', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', width: '90px' }}>Unit Price</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', color: 'white', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', width: '70px' }}>VAT</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', color: 'white', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', width: '100px' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.line_items.map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee', background: i % 2 === 0 ? '#fafafa' : 'white' }}>
                <td style={{ padding: '10px 12px', color: '#333' }}>{item.description}</td>
                {hasPONumbers && <td style={{ padding: '10px 12px', color: '#555', fontSize: '12px' }}>{item.po_number || '—'}</td>}
                <td style={{ padding: '10px 12px', textAlign: 'center', color: '#333' }}>{item.quantity}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#333' }}>£{Number(item.unit_price).toFixed(2)}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#555' }}>{Number(item.vat_rate)}%</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#111', fontWeight: '600' }}>£{Number(item.total_price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: '13px', width: '260px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '6px 12px', color: '#555' }}>Subtotal</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', color: '#333' }}>£{Number(data.subtotal).toFixed(2)}</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 12px', color: '#555' }}>VAT</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', color: '#333' }}>£{Number(data.tax_amount).toFixed(2)}</td>
              </tr>
              <tr style={{ borderTop: '2px solid #FF0000' }}>
                <td style={{ padding: '10px 12px', fontWeight: '900', color: '#111', fontSize: '16px' }}>Total Due</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '900', color: '#111', fontSize: '16px' }}>£{Number(data.total_amount).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes & Payment Info */}
      <div style={{ padding: '24px 48px', marginTop: '24px' }}>
        {data.notes && (
          <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: '8px', padding: '14px 18px', marginBottom: '16px', fontSize: '12px', color: '#555' }}>
            <p style={{ fontWeight: 'bold', margin: '0 0 4px', color: '#333', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notes</p>
            <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{data.notes}</p>
          </div>
        )}

        <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: '8px', padding: '14px 18px', fontSize: '12px', color: '#555' }}>
          <p style={{ fontWeight: 'bold', margin: '0 0 4px', color: '#333', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Information</p>
          <p style={{ margin: '0 0 2px' }}>Bank: Tide Business Banking</p>
          <p style={{ margin: '0 0 2px' }}>Account Name: Circular Horizons International LTD</p>
          <p style={{ margin: '0 0 2px' }}>Sort Code: 04-06-05</p>
          <p style={{ margin: 0 }}>Account Number: 2283 7469</p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 48px', borderTop: '1px solid #eee', fontSize: '10px', color: '#aaa', textAlign: 'center', flexShrink: 0 }}>
        <p style={{ margin: '0 0 2px' }}>Circular Horizons International LTD | Company No. 15821509 | Registered in England and Wales</p>
        <p style={{ margin: 0 }}>Unit 2 Capital Industrial Estate, Crabtree Manorway South, Belvedere, Kent, DA17 6BJ</p>
      </div>

      {/* Bottom Red Bar */}
      <div style={{ height: '8px', background: '#FF0000', width: '100%', flexShrink: 0 }} />
    </div>
  );
}
