import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

async function renderAuditToCanvas(scale = 2): Promise<HTMLCanvasElement> {
  const el = document.getElementById('audit-render');
  if (!el) throw new Error('Audit document element not found');

  const clone = el.cloneNode(true) as HTMLElement;
  clone.style.position = 'absolute';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  clone.style.transform = 'none';
  clone.style.zIndex = '-1';
  clone.style.width = el.scrollWidth + 'px';
  document.body.appendChild(clone);

  const images = clone.querySelectorAll('img');
  await Promise.all(
    Array.from(images).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) resolve();
          else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        })
    )
  );

  await new Promise((r) => setTimeout(r, 200));

  const canvas = await html2canvas(clone, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    width: clone.scrollWidth,
    height: clone.scrollHeight,
  });

  document.body.removeChild(clone);
  return canvas;
}

export async function downloadAuditAsPDF(auditNumber: string): Promise<void> {
  const canvas = await renderAuditToCanvas(2);
  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  const imgAspect = canvas.height / canvas.width;
  const imgW = pageW;
  const imgH = imgW * imgAspect;

  if (imgH <= pageH) {
    pdf.addImage(imgData, 'PNG', 0, 0, imgW, imgH);
  } else {
    let remainingHeight = imgH;
    let srcY = 0;
    const pxPerMm = canvas.width / imgW;
    const pageHeightPx = pageH * pxPerMm;

    while (remainingHeight > 0) {
      const sliceHeightPx = Math.min(pageHeightPx, canvas.height - srcY);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeightPx;
      const ctx = sliceCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(canvas, 0, srcY, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);
      }
      const sliceData = sliceCanvas.toDataURL('image/png');
      const sliceHeightMm = sliceHeightPx / pxPerMm;

      if (srcY > 0) pdf.addPage();
      pdf.addImage(sliceData, 'PNG', 0, 0, imgW, sliceHeightMm);

      srcY += sliceHeightPx;
      remainingHeight -= sliceHeightMm;
    }
  }

  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text('© MediWaste — Clinical Waste Management Solutions', pageW / 2, pageH - 8, { align: 'center' });
    pdf.text(`Page ${i} of ${pageCount}`, pageW / 2, pageH - 4, { align: 'center' });
  }

  pdf.save(`waste-audit-${auditNumber}.pdf`);
}
