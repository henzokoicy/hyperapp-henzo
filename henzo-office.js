// Lecteur Word (.docx) et Excel (.xlsx) de Henzo Cloud : lit le fichier sur l'appareil, rien n'est envoyé ailleurs.
// - Word : mammoth.js convertit le document en page (titres, listes, tableaux, images), nettoyée avant affichage.
// - Excel : lecteur maison (fflate pour ouvrir le fichier) : onglets, tableau avec lettres de colonnes, dates lisibles.
// Copie de public/office.js du site Henzo Cloud.
(function (root) {
  const cfg = { mammothUrl: 'henzo-mammoth.min.js?v=1', fflateUrl: 'henzo-fflate.min.js?v=1' };
  const loading = {};
  function loadScript(url) {
    if (!loading[url]) {
      loading[url] = new Promise((ok, ko) => {
        const s = document.createElement('script');
        s.src = url; s.onload = ok;
        s.onerror = () => { delete loading[url]; ko(new Error('Bibliothèque de lecture introuvable.')); };
        document.head.appendChild(s);
      });
    }
    return loading[url];
  }

  function style() {
    if (document.getElementById('hoStyle')) return;
    const st = document.createElement('style'); st.id = 'hoStyle';
    st.textContent = `
      .ho-doc{align-self:stretch;width:100%;max-width:860px;margin:0 auto;background:#fff;color:#1b1b1f;border-radius:10px;padding:28px 30px;overflow:auto;text-align:left;font:16px/1.55 Georgia,'Times New Roman',serif;box-sizing:border-box}
      .ho-doc h1,.ho-doc h2,.ho-doc h3,.ho-doc h4{font-family:system-ui,sans-serif;line-height:1.25;margin:1.1em 0 .4em}
      .ho-doc p{margin:.6em 0}.ho-doc img{max-width:100%;height:auto}.ho-doc a{color:#1a5fd0}
      .ho-doc table{border-collapse:collapse;margin:.8em 0;max-width:100%}.ho-doc td,.ho-doc th{border:1px solid #bbb;padding:5px 9px;vertical-align:top}
      .ho-xls{align-self:stretch;width:100%;display:flex;flex-direction:column;min-height:0;text-align:left}
      .ho-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
      .ho-tabs button{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:8px;padding:6px 12px;font:600 .82rem system-ui,sans-serif;cursor:pointer;margin:0;width:auto}
      .ho-tabs button.on{background:#fff;color:#111}
      .ho-grid{flex:1;min-height:0;overflow:auto;background:#fff;border-radius:8px}
      .ho-grid table{border-collapse:separate;border-spacing:0;font:13px/1.35 system-ui,sans-serif;color:#1b1b1f}
      .ho-grid th{position:sticky;top:0;background:#eef0f4;color:#555;font-weight:600;z-index:2;border-bottom:1px solid #c9ccd3;border-right:1px solid #dadde3;padding:4px 10px}
      .ho-grid th.rn{left:0;z-index:3;position:sticky}
      .ho-grid td{border-bottom:1px solid #e4e6eb;border-right:1px solid #eceef2;padding:4px 10px;white-space:pre;max-width:340px;overflow:hidden;text-overflow:ellipsis}
      .ho-grid td.rn{position:sticky;left:0;background:#eef0f4;color:#555;font-weight:600;text-align:center;z-index:1}
      .ho-grid td.num{text-align:right}
      .ho-info{color:#cfd3dc;font:.78rem system-ui,sans-serif;margin-top:6px}`;
    document.head.appendChild(st);
  }

  // ---------- Nettoyage du HTML produit par mammoth ----------
  function clean(html) {
    const doc = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
    doc.querySelectorAll('script,style,iframe,object,embed,link,meta,form,base').forEach((n) => n.remove());
    doc.body.querySelectorAll('*').forEach((n) => {
      for (const a of [...n.attributes]) {
        const v = a.value.trim().toLowerCase();
        if (/^on/i.test(a.name) || (['href', 'src', 'xlink:href'].includes(a.name) && /^(javascript|vbscript|data:text)/.test(v)) || a.name === 'style') n.removeAttribute(a.name);
      }
      if (n.tagName === 'A') { n.setAttribute('target', '_blank'); n.setAttribute('rel', 'noopener noreferrer'); }
    });
    return doc.body.innerHTML;
  }

  async function renderDocx(buf, box) {
    style();
    await loadScript(cfg.mammothUrl);
    const r = await root.mammoth.convertToHtml({ arrayBuffer: buf });
    const page = document.createElement('div'); page.className = 'ho-doc';
    page.innerHTML = clean(r.value) || '<p style="color:#888">Document vide.</p>';
    box.replaceChildren(page);
  }

  // ---------- Excel ----------
  const BUILTIN_DATES = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58]);
  const MAX_ROWS = 2000, MAX_COLS = 60;
  const xml = (u8) => new DOMParser().parseFromString(root.fflate.strFromU8(u8), 'application/xml');
  const kids = (el, tag) => [...el.getElementsByTagName(tag)];
  const colIndex = (ref) => { let n = 0; for (const ch of /^[A-Z]+/i.exec(ref)?.[0].toUpperCase() || 'A') n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
  const colName = (i) => { let s = ''; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };

  function fmtDate(serial) {
    const d = new Date(Math.round((serial - 25569) * 86400) * 1000);
    const day = d.toLocaleDateString('fr-FR', { timeZone: 'UTC' });
    const frac = serial - Math.floor(serial);
    const time = d.toLocaleTimeString('fr-FR', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' });
    if (serial < 1) return time;
    return frac > 0.0001 ? day + ' ' + time : day;
  }
  const fmtNum = (v) => { const n = Number(v); return Number.isFinite(n) ? String(parseFloat(n.toPrecision(12))).replace('.', ',') : v; };

  function parseXlsx(buf) {
    const files = root.fflate.unzipSync(new Uint8Array(buf), { filter: (f) => /^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|styles\.xml|worksheets\/[^/]+\.xml)$/.test(f.name) });
    if (!files['xl/workbook.xml']) throw new Error('Ce n\'est pas un classeur Excel valide.');
    const wb = xml(files['xl/workbook.xml']);
    const rels = {};
    if (files['xl/_rels/workbook.xml.rels']) kids(xml(files['xl/_rels/workbook.xml.rels']), 'Relationship').forEach((r) => { rels[r.getAttribute('Id')] = r.getAttribute('Target'); });
    const shared = [];
    if (files['xl/sharedStrings.xml']) kids(xml(files['xl/sharedStrings.xml']), 'si').forEach((si) => shared.push(kids(si, 't').filter((t) => t.parentNode.nodeName !== 'rPh').map((t) => t.textContent).join('')));
    // Quels styles de cellule sont des dates ?
    const dateStyle = new Set();
    if (files['xl/styles.xml']) {
      const st = xml(files['xl/styles.xml']);
      const custom = {};
      kids(st, 'numFmt').forEach((n) => { custom[n.getAttribute('numFmtId')] = n.getAttribute('formatCode') || ''; });
      const xfs = st.getElementsByTagName('cellXfs')[0];
      if (xfs) [...xfs.children].forEach((xf, i) => {
        const id = xf.getAttribute('numFmtId');
        const code = (custom[id] || '').replace(/\[[^\]]*\]|"[^"]*"|\\.|_.|\*./g, '');
        if (BUILTIN_DATES.has(Number(id)) || (custom[id] && /[dmyhs]/i.test(code) && !/^general$/i.test(code))) dateStyle.add(i);
      });
    }
    const sheets = [];
    for (const s of kids(wb, 'sheet')) {
      if (s.getAttribute('state') === 'veryHidden') continue;
      const rid = s.getAttribute('r:id') || s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
      let target = rels[rid] || '';
      target = target.replace(/^\/?(xl\/)?/, 'xl/');
      const data = files[target];
      if (!data) continue;
      const rows = []; let totalRows = 0, totalCols = 0;
      for (const row of kids(xml(data), 'row')) {
        const ri = row.hasAttribute('r') ? Number(row.getAttribute('r')) - 1 : totalRows;
        totalRows = Math.max(totalRows, ri + 1);
        if (ri >= MAX_ROWS) continue;
        const cells = rows[ri] = rows[ri] || [];
        let ci = 0;
        for (const c of [...row.children].filter((x) => x.nodeName === 'c')) {
          ci = c.hasAttribute('r') ? colIndex(c.getAttribute('r')) : ci;
          totalCols = Math.max(totalCols, ci + 1);
          if (ci < MAX_COLS) {
            const t = c.getAttribute('t');
            const v = c.getElementsByTagName('v')[0]?.textContent ?? '';
            let val = '', num = false;
            if (t === 's') val = shared[Number(v)] ?? '';
            else if (t === 'inlineStr') val = kids(c, 't').map((x) => x.textContent).join('');
            else if (t === 'b') val = v === '1' ? 'VRAI' : 'FAUX';
            else if (t === 'str' || t === 'e') val = v;
            else if (v !== '') { num = true; val = dateStyle.has(Number(c.getAttribute('s'))) && Number.isFinite(Number(v)) ? fmtDate(Number(v)) : fmtNum(v); }
            if (val !== '') cells[ci] = { v: val, num };
          }
          ci++;
        }
      }
      sheets.push({ name: s.getAttribute('name') || 'Feuille', rows, totalRows, totalCols });
    }
    if (!sheets.length) throw new Error('Ce classeur est vide.');
    return sheets;
  }

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function tableHtml(sh) {
    const nCols = Math.min(MAX_COLS, Math.max(1, sh.totalCols)), nRows = Math.min(MAX_ROWS, sh.rows.length);
    let h = '<table><thead><tr><th class="rn"></th>';
    for (let c = 0; c < nCols; c++) h += `<th>${colName(c)}</th>`;
    h += '</tr></thead><tbody>';
    for (let r = 0; r < nRows; r++) {
      const row = sh.rows[r] || [];
      h += `<tr><td class="rn">${r + 1}</td>`;
      for (let c = 0; c < nCols; c++) { const x = row[c]; h += x ? `<td${x.num ? ' class="num"' : ''}>${esc(x.v)}</td>` : '<td></td>'; }
      h += '</tr>';
    }
    return h + '</tbody></table>';
  }

  async function renderXlsx(buf, box) {
    style();
    await loadScript(cfg.fflateUrl);
    const sheets = parseXlsx(buf);
    const wrap = document.createElement('div'); wrap.className = 'ho-xls';
    const tabs = document.createElement('div'); tabs.className = 'ho-tabs';
    const grid = document.createElement('div'); grid.className = 'ho-grid';
    const info = document.createElement('div'); info.className = 'ho-info';
    const show = (i) => {
      const sh = sheets[i];
      [...tabs.children].forEach((b, j) => b.classList.toggle('on', i === j));
      grid.innerHTML = tableHtml(sh); grid.scrollTop = 0; grid.scrollLeft = 0;
      const cut = sh.totalRows > MAX_ROWS || sh.totalCols > MAX_COLS;
      info.textContent = `${sh.totalRows} ligne${sh.totalRows > 1 ? 's' : ''} × ${sh.totalCols} colonne${sh.totalCols > 1 ? 's' : ''}` + (cut ? ` · affichage limité aux ${MAX_ROWS} premières lignes et ${MAX_COLS} premières colonnes` : '');
    };
    sheets.forEach((sh, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = sh.name; b.onclick = () => show(i); tabs.appendChild(b); });
    if (sheets.length > 1) wrap.appendChild(tabs);
    wrap.append(grid, info);
    box.replaceChildren(wrap);
    show(0);
  }

  root.HCOffice = { renderDocx, renderXlsx, config: cfg, parseXlsx: (b) => loadScript(cfg.fflateUrl).then(() => parseXlsx(b)) };
})(window);
