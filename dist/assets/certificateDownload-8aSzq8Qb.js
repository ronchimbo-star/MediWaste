async function f(s){try{const c=await(await fetch(s)).blob();return new Promise((l,d)=>{const a=new FileReader;a.onloadend=()=>l(a.result),a.onerror=d,a.readAsDataURL(c)})}catch{return s}}async function g(s){const o=document.getElementById("certificate-render");if(!o)return;const c=o.querySelectorAll("canvas"),l=new Map;c.forEach(t=>{try{l.set(t,t.toDataURL("image/png"))}catch{}});const d=o.querySelectorAll("img"),a=Array.from(d).map(t=>t.complete?Promise.resolve():new Promise(e=>{t.onload=()=>e(),t.onerror=()=>e()}));await Promise.all(a);const h=new Map;for(const t of Array.from(d))try{const e=document.createElement("canvas");e.width=t.naturalWidth||t.width,e.height=t.naturalHeight||t.height;const r=e.getContext("2d");r&&t.naturalWidth>0&&(r.drawImage(t,0,0),h.set(t,e.toDataURL("image/png")))}catch{}let n=o.outerHTML;c.forEach((t,e)=>{const r=l.get(t);if(r){const p=`<img src="${r}" width="${t.width}" height="${t.height}" style="display:block;" />`;n=n.replace(t.outerHTML,p)}}),h.forEach((t,e)=>{if(e.src&&!e.src.startsWith("data:")){const r=e.src.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");n=n.replace(new RegExp(`src="${r}"`,"g"),`src="${t}"`)}});const i=window.open("","_blank");if(!i){alert("Please allow pop-ups for this site to download the certificate.");return}const m=`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Certificate ${s}</title>
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
  ${n}
</body>
</html>`;i.document.write(m),i.document.close(),i.focus(),setTimeout(()=>{i.print()},800)}export{g as d,f as i};
