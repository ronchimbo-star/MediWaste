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

export async function downloadCertificateAsPDF(certNumber: string): Promise<void> {
  const el = document.getElementById('certificate-render');
  if (!el) return;

  const canvases = el.querySelectorAll('canvas');
  const canvasDataUrls = new Map<HTMLCanvasElement, string>();
  canvases.forEach((canvas) => {
    try {
      canvasDataUrls.set(canvas, canvas.toDataURL('image/png'));
    } catch {
    }
  });

  const imgs = el.querySelectorAll('img');
  const imgPromises = Array.from(imgs).map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });
  });
  await Promise.all(imgPromises);

  const imgDataUrls = new Map<HTMLImageElement, string>();
  for (const img of Array.from(imgs)) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (ctx && img.naturalWidth > 0) {
        ctx.drawImage(img, 0, 0);
        imgDataUrls.set(img, canvas.toDataURL('image/png'));
      }
    } catch {
    }
  }

  let htmlContent = el.outerHTML;

  canvases.forEach((canvas, _) => {
    const dataUrl = canvasDataUrls.get(canvas);
    if (dataUrl) {
      const tempImg = `<img src="${dataUrl}" width="${canvas.width}" height="${canvas.height}" style="display:block;" />`;
      htmlContent = htmlContent.replace(canvas.outerHTML, tempImg);
    }
  });

  imgDataUrls.forEach((dataUrl, img) => {
    if (img.src && !img.src.startsWith('data:')) {
      const escapedSrc = img.src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      htmlContent = htmlContent.replace(new RegExp(`src="${escapedSrc}"`, 'g'), `src="${dataUrl}"`);
    }
  });

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow pop-ups for this site to download the certificate.');
    return;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Certificate ${certNumber}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: white; display: flex; justify-content: center; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { margin: 0; size: A4 portrait; }
    }
    .sig { font-family: 'Dancing Script', cursive; font-size: 32px; font-weight: 700; fill: #1a1a1a; }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 800);
}
