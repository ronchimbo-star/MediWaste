import QRCodeCanvas from './QRCode';

interface CertificateData {
  certificate_number: string;
  qr_code_token: string;
  customer_name: string;
  issue_date: string;
  expiry_date: string;
  waste_types_covered: string[];
  authorised_signatory_name: string;
  authorised_signatory_title: string;
  waste_carrier_licence: string;
  certification_statement?: string;
}

interface CertificateSettings {
  waste_carrier_licence: string;
  company_address?: string;
  default_signatory_name?: string;
  default_signatory_title?: string;
  waste_carrier_company_name?: string | null;
}

interface Props {
  data: CertificateData;
  settings: CertificateSettings | null;
  forDownload?: boolean;
  logoDataUrl?: string;
  faviconDataUrl?: string;
  signatureDataUrl?: string;
  whiteLogoDataUrl?: string;
}

function fmt(date: string) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function CertificatePreview({ data, settings, forDownload = false, logoDataUrl, faviconDataUrl, signatureDataUrl, whiteLogoDataUrl }: Props) {
  const licenceNo = data.waste_carrier_licence || settings?.waste_carrier_licence || '';
  const signatoryName = data.authorised_signatory_name || settings?.default_signatory_name || '';
  const signatoryTitle = data.authorised_signatory_title || settings?.default_signatory_title || '';
  const verifyUrl = `${window.location.origin}/compliance/${data.qr_code_token}`;

  const logoSrc = logoDataUrl || '/mediwaste-logo.png';
  const faviconSrc = faviconDataUrl || '/mediwaste-favicon.png';
  const signatureSrc = signatureDataUrl || '/signature.png';
  const whiteLogoSrc = whiteLogoDataUrl || '/mediwaste-logo-white.png';

  const sidebarCount = [0, 1, 2, 3, 4];

  return (
    <div
      id="certificate-render"
      style={{
        width: '794px',
        minHeight: '1123px',
        background: 'white',
        fontFamily: "'Arial', sans-serif",
        display: 'flex',
        flexDirection: 'row',
        position: 'relative',
        boxShadow: forDownload ? 'none' : '0 4px 32px rgba(0,0,0,0.14)',
      }}
    >
      <div
        style={{
          width: '90px',
          minHeight: '1123px',
          background: '#FF0000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '36px 0',
          flexShrink: 0,
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {sidebarCount.map((_, i) => (
          <div
            key={i}
            style={{
              width: '90px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <img
              src={whiteLogoSrc}
              alt="MediWaste"
              crossOrigin="anonymous"
              style={{
                width: '180px',
                height: 'auto',
                objectFit: 'contain',
                transform: 'rotate(-90deg)',
                transformOrigin: 'center center',
                display: 'block',
              }}
            />
          </div>
        ))}
      </div>

      <div style={{ flex: 1, padding: '52px 52px 44px 52px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '28px', textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', gap: '14px', marginBottom: '14px' }}>
            <img
              src={faviconSrc}
              alt="MediWaste Icon"
              crossOrigin="anonymous"
              style={{ width: '88px', height: '88px', objectFit: 'contain', flexShrink: 0, marginTop: '4px' }}
            />
            <h1
              style={{
                fontSize: '38px',
                fontWeight: '900',
                lineHeight: '1.15',
                color: '#111',
                margin: 0,
                fontFamily: 'Arial, sans-serif',
                letterSpacing: '-0.5px',
                textAlign: 'left',
              }}
            >
              MEDICAL WASTE<br />DISPOSAL<br />CERTIFICATE
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: '#555', margin: 0, fontFamily: 'Arial, sans-serif' }}>
            Certificate Registration No.: <strong style={{ color: '#111' }}>{data.certificate_number}</strong>
          </p>
        </div>

        <div style={{ marginBottom: '20px', fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#333' }}>
          <p style={{ fontWeight: 'bold', margin: '0 0 2px 0' }}>Circular Horizons International LTD t/a MediWaste</p>
          <p style={{ margin: 0 }}>certifies that the organization</p>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <p
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              fontFamily: 'Arial, sans-serif',
              color: '#111',
              margin: 0,
            }}
          >
            {data.customer_name}
          </p>
        </div>

        <div style={{ marginBottom: '18px', fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#333' }}>
          <p style={{ margin: '0 0 10px 0' }}>for the scope</p>
          <div
            style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '14px 18px',
              background: '#fafafa',
            }}
          >
            <p style={{ fontWeight: 'bold', margin: '0 0 8px 0' }}>Waste Management Services:</p>
            <ul style={{ margin: 0, padding: '0 0 0 18px' }}>
              {data.waste_types_covered.map((wt, i) => (
                <li key={i} style={{ marginBottom: '4px', color: '#c0392b', fontSize: '13px' }}>
                  <span style={{ color: '#333' }}>{wt}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#333', marginBottom: '18px' }}>
          <p style={{ margin: '0 0 8px 0' }}>has established and applies an Environmental Management System.</p>
          <p style={{ margin: '0 0 8px 0' }}>An audit was performed and has furnished proof that the requirements according to</p>
          <p style={{ fontWeight: 'bold', fontSize: '15px', textAlign: 'center', margin: '12px 0' }}>
            HTM 07-01: Safe Management of Healthcare Waste
          </p>
          <p style={{ margin: '0 0 14px 0' }}>are fulfilled.</p>
          <p style={{ margin: 0 }}>
            The certificate is valid from{' '}
            <strong>{fmt(data.issue_date)}</strong> until{' '}
            <strong>{fmt(data.expiry_date)}</strong>.
          </p>
        </div>

        {licenceNo && (
          <div
            style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '28px',
              background: '#fafafa',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            <p
              style={{
                fontSize: '11px',
                fontWeight: 'bold',
                letterSpacing: '1px',
                color: '#777',
                textTransform: 'uppercase',
                margin: '0 0 8px 0',
              }}
            >
              LICENSING INFORMATION
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#333' }}>
              <span>Carrier Licence No:</span>
              <strong>{licenceNo}</strong>
            </div>
          </div>
        )}

        <div style={{ marginTop: '24px', paddingBottom: '32px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                border: '1.5px solid #111',
                borderRadius: '8px',
                padding: '16px 24px',
                minWidth: '240px',
              }}
            >
              <div style={{ marginBottom: '12px' }}>
                <img
                  src={signatureSrc}
                  alt="Authorised signature"
                  crossOrigin="anonymous"
                  style={{ display: 'block', width: '180px', height: '50px', objectFit: 'contain', objectPosition: 'left center' }}
                />
              </div>
              <div style={{ borderTop: '1px solid #ddd', paddingTop: '10px' }}>
                <p style={{ fontWeight: 'bold', fontSize: '13px', fontFamily: 'Arial, sans-serif', margin: '0 0 2px 0', color: '#111' }}>
                  {signatoryName}
                </p>
                <p style={{ fontSize: '12px', fontFamily: 'Arial, sans-serif', margin: 0, color: '#666' }}>
                  {signatoryTitle}
                </p>
              </div>
            </div>
            <img
              src={logoSrc}
              alt="MediWaste"
              crossOrigin="anonymous"
              style={{ width: '200px', height: 'auto', display: 'block', objectFit: 'contain' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <QRCodeCanvas value={verifyUrl} size={200} />
            <p style={{ fontSize: '11px', color: '#999', fontFamily: 'Arial, sans-serif', margin: 0 }}>
              Verify Online
            </p>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: '18px',
            right: '52px',
            fontSize: '11px',
            color: '#aaa',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          Page 1 of 1
        </div>
      </div>
    </div>
  );
}
