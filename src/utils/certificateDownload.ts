import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function imageToDataUrl(src: string): Promise<string> {
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return src;
  }
}

async function renderToCanvas(): Promise<HTMLCanvasElement> {
  const el = document.getElementById('certificate-render');
  if (!el) throw new Error('Certificate element not found');
  return html2canvas(el, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#ffffff',
    logging: false,
  });
}

export async function downloadCertificateAsPDF(certNumber: string): Promise<void> {
  const canvas = await renderToCanvas();
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
  const w = canvas.width * ratio;
  const h = canvas.height * ratio;
  pdf.addImage(imgData, 'PNG', (pageWidth - w) / 2, (pageHeight - h) / 2, w, h);
  pdf.save(`certificate-${certNumber}.pdf`);
}

export async function downloadCertificateAsPNG(certNumber: string): Promise<void> {
  const canvas = await renderToCanvas();
  const link = document.createElement('a');
  link.download = `certificate-${certNumber}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
