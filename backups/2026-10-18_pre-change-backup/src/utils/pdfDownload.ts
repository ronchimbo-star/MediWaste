import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface PdfOptions {
  scale?: number;
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  footerText?: string;
  fileName: string;
  elementId: string;
  noBreakSelectors?: string[];
}

const DEFAULT_NO_BREAK = ['table', 'img', '.no-break', '.declaration-block'];

export async function renderElementToPDF(opts: PdfOptions): Promise<void> {
  const {
    scale = 2,
    marginTop = 8,
    marginBottom = 8,
    marginLeft = 8,
    marginRight = 8,
    footerText = '© MediWaste — Clinical Waste Management Solutions',
    fileName,
    elementId,
    noBreakSelectors = DEFAULT_NO_BREAK,
  } = opts;

  const el = document.getElementById(elementId);
  if (!el) throw new Error(`Element #${elementId} not found`);

  const clone = el.cloneNode(true) as HTMLElement;
  clone.style.position = 'absolute';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  clone.style.transform = 'none';
  clone.style.zIndex = '-1';
  clone.style.width = `${el.scrollWidth}px`;
  clone.style.maxWidth = 'none';
  clone.style.boxSizing = 'border-box';

  clone.querySelectorAll('img').forEach((img) => {
    (img as HTMLImageElement).style.maxWidth = '100%';
    (img as HTMLImageElement).style.maxHeight = '200px';
    (img as HTMLImageElement).style.height = 'auto';
    (img as HTMLImageElement).style.objectFit = 'contain';
    (img as HTMLImageElement).style.display = 'block';
  });

  // Mark elements with pageBreakBefore/page-break-before:always to start on a new page
  const forcedBreakEls = clone.querySelectorAll('[style*="page-break-before"], [style*="breakBefore"]');
  forcedBreakEls.forEach((fbEl) => {
    (fbEl as HTMLElement).setAttribute('data-forced-page-break', 'true');
  });

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

  await new Promise((r) => setTimeout(r, 300));

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

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const contentW = pageW - marginLeft - marginRight;
  const contentH = pageH - marginTop - marginBottom;
  const pxPerMm = canvas.width / contentW;
  const pageSliceHeightPx = Math.floor(contentH * pxPerMm);

  const breakBoundaries = findBreakBoundaries(el, noBreakSelectors, scale);
  const forcedBreaks = findForcedBreaks(el, scale);

  let sourceY = 0;
  let pageNumber = 0;

  while (sourceY < canvas.height) {
    let sliceHeightPx = Math.min(pageSliceHeightPx, canvas.height - sourceY);

    // Check if a forced page-break element starts within this slice — if so,
    // end the current slice at the break point so the next page starts fresh.
    for (const fbY of forcedBreaks) {
      if (fbY > sourceY && fbY < sourceY + sliceHeightPx) {
        sliceHeightPx = fbY - sourceY;
        break;
      }
    }

    const sliceBottom = sourceY + sliceHeightPx;
    for (const boundary of breakBoundaries) {
      if (boundary.top > sourceY && boundary.bottom > sliceBottom && boundary.top < sliceBottom) {
        sliceHeightPx = boundary.top - sourceY;
        break;
      }
    }

    sliceHeightPx = Math.max(Math.min(sliceHeightPx, canvas.height - sourceY), 1);

    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeightPx;
    const ctx = sliceCanvas.getContext('2d');
    if (!ctx) throw new Error('Unable to prepare PDF page');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(canvas, 0, sourceY, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

    const renderedHeight = sliceHeightPx / pxPerMm;
    if (pageNumber > 0) pdf.addPage();
    pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', marginLeft, marginTop, contentW, renderedHeight);

    pageNumber += 1;
    sourceY += sliceHeightPx;
  }

  const totalPages = pdf.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(220, 220, 220);
    pdf.line(marginLeft, pageH - marginBottom + 1, pageW - marginRight, pageH - marginBottom + 1);
    pdf.setFontSize(7);
    pdf.setTextColor(120, 120, 120);
    pdf.text(footerText, marginLeft, pageH - 5);
    pdf.text(`Page ${page} of ${totalPages}`, pageW - marginRight, pageH - 5, { align: 'right' });
  }

  pdf.save(fileName);
}

interface BreakBoundary {
  top: number;
  bottom: number;
}

function findBreakBoundaries(
  el: HTMLElement,
  selectors: string[],
  scale: number
): BreakBoundary[] {
  const boundaries: BreakBoundary[] = [];
  const elRect = el.getBoundingClientRect();

  for (const selector of selectors) {
    const elements = el.querySelectorAll(selector);
    elements.forEach((child) => {
      const rect = (child as HTMLElement).getBoundingClientRect();
      const top = (rect.top - elRect.top) * scale;
      const bottom = (rect.bottom - elRect.top) * scale;
      if (bottom - top > 0) {
        boundaries.push({ top: Math.round(top), bottom: Math.round(bottom) });
      }
    });
  }

  boundaries.sort((a, b) => a.top - b.top);
  return boundaries;
}

function findForcedBreaks(el: HTMLElement, scale: number): number[] {
  const elRect = el.getBoundingClientRect();
  const breaks: number[] = [];
  el.querySelectorAll('[data-forced-page-break="true"]').forEach((child) => {
    const rect = (child as HTMLElement).getBoundingClientRect();
    breaks.push(Math.round((rect.top - elRect.top) * scale));
  });
  breaks.sort((a, b) => a - b);
  return breaks;
}
