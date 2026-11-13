// Miniatures de Henzo Cloud : fabrique une petite image (JPEG, 240 px) pour chaque fichier.
// - photo : l'image réduite
// - vidéo : une image prise à 1,5 seconde
// - PDF : la 1re page (avec pdf.js, chargé seulement si besoin)
// - musique MP3 : la pochette (si elle est dans le fichier)
// Le même fichier sert au site Henzo Cloud et à la Super App (henzo-miniatures.js).
(function (root) {
  const MAX = 240;
  const QUALITY = 0.72;

  const ext = (name) => String(name || '').split('.').pop().toLowerCase();
  function kind(name, mime) {
    const m = String(mime || '');
    const e = ext(name);
    if (m.startsWith('image/') || /^(jpe?g|png|gif|webp|bmp|avif|heic|heif|tiff?)$/.test(e)) return 'image';
    if (m.startsWith('video/') || /^(mp4|mov|m4v|webm|mkv|avi|3gp)$/.test(e)) return 'video';
    if (m === 'application/pdf' || e === 'pdf') return 'pdf';
    if (m.startsWith('audio/') || /^(mp3|m4a|wav|flac|aac|ogg|opus)$/.test(e)) return 'audio';
    if (/^(zip|rar|7z)$/.test(e)) return 'archive';
    if (/^(docx?|odt|rtf|txt|pages)$/.test(e)) return 'doc';
    if (/^(xlsx?|ods|csv|numbers)$/.test(e)) return 'sheet';
    return 'file';
  }

  function fit(w, h) {
    const s = Math.min(1, MAX / Math.max(w || 1, h || 1));
    return [Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s))];
  }
  function draw(src, w, h) {
    const [cw, ch] = fit(w, h);
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(src, 0, 0, cw, ch);
    return c.toDataURL('image/jpeg', QUALITY);
  }
  const isBlob = (x) => typeof Blob !== 'undefined' && x instanceof Blob;

  async function fromImage(src) {
    if (isBlob(src) && 'createImageBitmap' in root) {
      try {
        const bmp = await createImageBitmap(src);
        const d = draw(bmp, bmp.width, bmp.height);
        if (bmp.close) bmp.close();
        return d;
      } catch (e) { /* on essaie autrement */ }
    }
    const url = isBlob(src) ? URL.createObjectURL(src) : src;
    try {
      const img = await new Promise((ok, ko) => {
        const i = new Image();
        if (!isBlob(src)) i.crossOrigin = 'anonymous';
        i.onload = () => ok(i);
        i.onerror = ko;
        i.src = url;
      });
      return draw(img, img.naturalWidth, img.naturalHeight);
    } finally {
      if (isBlob(src)) URL.revokeObjectURL(url);
    }
  }

  function fromVideo(src) {
    return new Promise((resolve) => {
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'metadata';
      if (!isBlob(src)) v.crossOrigin = 'anonymous';
      const url = isBlob(src) ? URL.createObjectURL(src) : src;
      let done = false;
      const end = (d) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        v.removeAttribute('src'); v.load();
        if (isBlob(src)) URL.revokeObjectURL(url);
        resolve(d);
      };
      const timer = setTimeout(() => end(null), 25000);
      v.onloadedmetadata = () => {
        const d = isFinite(v.duration) ? v.duration : 0;
        v.currentTime = d ? Math.min(1.5, d * 0.1) : 0.1;
      };
      v.onseeked = () => {
        try { end(v.videoWidth ? draw(v, v.videoWidth, v.videoHeight) : null); } catch (e) { end(null); }
      };
      v.onerror = () => end(null);
      v.src = url;
    });
  }

  let pdfjsLoading = null;
  function pdfjs() {
    if (root.pdfjsLib) return Promise.resolve(root.pdfjsLib);
    if (!pdfjsLoading) {
      pdfjsLoading = new Promise((ok, ko) => {
        const s = document.createElement('script');
        s.src = api.pdfjsUrl;
        s.onload = () => {
          const L = root.pdfjsLib;
          if (!L) return ko(new Error('pdf.js absent'));
          L.GlobalWorkerOptions.workerSrc = api.pdfWorkerUrl;
          ok(L);
        };
        s.onerror = () => { pdfjsLoading = null; ko(new Error('pdf.js introuvable')); };
        document.head.appendChild(s);
      });
    }
    return pdfjsLoading;
  }
  async function fromPdf(src) {
    const L = await pdfjs();
    const doc = await L.getDocument(isBlob(src) ? { data: new Uint8Array(await src.arrayBuffer()) } : { url: src }).promise;
    try {
      const page = await doc.getPage(1);
      const v1 = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: MAX / Math.max(v1.width, v1.height) });
      const c = document.createElement('canvas');
      c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      return c.toDataURL('image/jpeg', QUALITY);
    } finally {
      doc.destroy();
    }
  }

  // Pochette d'un MP3 (étiquette ID3v2, image "APIC") : on ne lit que le début du fichier.
  const syncsafe = (b, i) => (b[i] << 21) | (b[i + 1] << 14) | (b[i + 2] << 7) | b[i + 3];
  async function fromAudio(src) {
    let buf;
    if (isBlob(src)) buf = await src.slice(0, 2 * 1024 * 1024).arrayBuffer();
    else buf = await (await fetch(src, { headers: { Range: 'bytes=0-2097151' } })).arrayBuffer();
    const b = new Uint8Array(buf);
    if (b[0] !== 0x49 || b[1] !== 0x44 || b[2] !== 0x33) return null; // pas d'étiquette "ID3"
    const ver = b[3];
    const end = Math.min(syncsafe(b, 6) + 10, b.length);
    let i = 10;
    while (i + 10 < end) {
      const id = String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3]);
      const size = ver === 4 ? syncsafe(b, i + 4) : ((b[i + 4] << 24) | (b[i + 5] << 16) | (b[i + 6] << 8) | b[i + 7]) >>> 0;
      if (!/^[A-Z0-9]{4}$/.test(id) || size <= 0) break;
      if (id === 'APIC') {
        const d = b.subarray(i + 10, i + 10 + size);
        const enc = d[0];
        let j = 1;
        while (j < d.length && d[j] !== 0) j++;
        const mime = new TextDecoder().decode(d.subarray(1, j)) || 'image/jpeg';
        j += 2; // fin du type d'image + catégorie de l'image
        if (enc === 1 || enc === 2) { while (j + 1 < d.length && !(d[j] === 0 && d[j + 1] === 0)) j += 2; j += 2; }
        else { while (j < d.length && d[j] !== 0) j++; j++; }
        return fromImage(new Blob([d.subarray(j)], { type: mime.includes('/') ? mime : 'image/' + mime.toLowerCase() }));
      }
      i += 10 + size;
    }
    return null;
  }

  /** Fabrique la miniature d'un fichier (File/Blob) ou d'une adresse de téléchargement. null si impossible. */
  async function make(src, name, mime) {
    try {
      switch (kind(name, mime)) {
        case 'image': return await fromImage(src);
        case 'video': return await fromVideo(src);
        case 'pdf': return await fromPdf(src);
        case 'audio': return await fromAudio(src);
        default: return null;
      }
    } catch (e) {
      return null;
    }
  }

  // Icônes quand il n'y a pas d'image possible (dessin en traits, couleur du thème).
  const ICONS = {
    image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    video: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.5v5l4.5-2.5z" fill="currentColor"/>',
    pdf: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M9.5 13h5M9.5 16.5h5"/>',
    audio: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    archive: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 3v4M12 9v2M12 13v2"/>',
    doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M9.5 12h6M9.5 15h6M9.5 18h4"/>',
    sheet: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 3v18"/>',
    file: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>',
  };
  function icon(k, size) {
    const s = size || 22;
    return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k] || ICONS.file}</svg>`;
  }

  const api = {
    make, kind, icon,
    pdfjsUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    pdfWorkerUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  };
  root.HCThumbs = api;
})(window);
