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

async function renderToCanvas(scale = 3): Promise<HTMLCanvasElement> {
  const el = document.getElementById('certificate-render');
  if (!el) throw new Error('Certificate element not found');

  const prev = el.style.transform;
  el.style.transform = 'none';

  const canvas = await html2canvas(el, {
    scale,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: el.scrollWidth,
    windowHeight: el.scrollHeight,
  });

  el.style.transform = prev;
  return canvas;
}

export async function downloadCertificateAsPDF(certNumber: string): Promise<void> {
  const canvas = await renderToCanvas(3);
  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  const imgAspect = canvas.height / canvas.width;
  const w = pageW;
  const h = w * imgAspect;
  const y = h < pageH ? (pageH - h) / 2 : 0;

  pdf.addImage(imgData, 'PNG', 0, y, w, h);
  pdf.save(`certificate-${certNumber}.pdf`);
}

export async function downloadCertificateAsPNG(certNumber: string): Promise<void> {
  const canvas = await renderToCanvas(3);
  const link = document.createElement('a');
  link.download = `certificate-${certNumber}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
