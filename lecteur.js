// ============================================================
// LECTEUR.JS - Lecteur d'images de la Super App Henzo
// Étape 1 : accès (barre PC, tiroir mobile, menu du compte) + import d'images
// (galerie, appareil photo, glisser-déposer, collage).
// Étape 2 : lecture du texte sur l'appareil (OCR français + anglais, voir lecteur-ocr.js),
// texte modifiable, copie complète ou de la sélection, relecture en mode inversé.
// Rien n'est envoyé nulle part et rien n'est gardé : les images et les textes vivent en mémoire
// tant que la fenêtre est ouverte, puis disparaissent à la fermeture.
// Étape 3 : extraction locale (téléphones, prix, dates et heures, e-mails, liens) et exports
// TXT / PDF / CSV, partage (voir lecteur-outils.js).
// Étape 4 : IA (lecteur-ia.js) : actions rapides, discussion qui garde le contexte, analyse visuelle ;
// le texte seul part vers l'IA, les images seulement si on le demande, avec confirmation une fois par session.
// Étape 5 : plusieurs images (texte regroupé, comparaison, lignes répétées, exports groupés).
// Étape 6 : historique chiffré sur l'appareil (lecteur-histo.js, texte seulement) et export DOCX.
// ============================================================
(function(){
if(typeof agSheet !== 'function') return;

const LC_E = s => (typeof agEsc === 'function' ? agEsc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
const LC_TOAST = m => { if(typeof agToast === 'function') agToast(m); };
const LC_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2"/><path d="M8 9h8M8 12h8M8 15h5"/></svg>';
const LC_MAX = 12;          // images par session
const LC_SIDE = 1800;       // taille maximale (px) d'une image gardée en mémoire

// Seul état du module : en mémoire, jamais écrit sur l'appareil.
// Chaque image : { id, nom, blob, url, etat: ''|'attente'|'lecture'|'ok'|'erreur', texte, confiance, inverse, blocs, err }
const LC = { imgs: [], seq: 0, lecture: null, ocrScript: null,
  chat: [], q: '', ia: null, avecImg: false, rep: false, histo: null, sauve: false,
  okTexte: false, okImage: false };   // les deux confirmations durent jusqu'au rechargement de l'application

function lcStyle(){
  if(document.getElementById('lcStyle')) return;
  const st = document.createElement('style'); st.id = 'lcStyle';
  st.textContent = `
    #lcSheet .modal{max-width:720px}
    #lcSheet{--lc-ga:var(--grad-a, var(--accent-2));--lc-gb:var(--grad-b, var(--accent))}
    @media (min-width:1000px){ body.ag-ui #lcSheet{padding-left:264px} }
    .lc-acts button,.lc-ra button,.lc-link{width:auto}
    .lc-h{margin:0 0 4px}
    .lc-sub{color:var(--muted);font-size:.86rem;margin:0 0 14px}
    .lc-drop{display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;padding:26px 16px;border-radius:20px;border:1.5px dashed var(--border-2);background:color-mix(in srgb,var(--card) 70%,transparent);color:var(--text-2);transition:border-color .15s,background .15s}
    .lc-drop.over{border-color:var(--lc-gb);background:color-mix(in srgb,var(--lc-gb) 12%,var(--card))}
    .lc-drop b{font-weight:600;font-size:.98rem}
    .lc-drop span{color:var(--muted);font-size:.8rem}
    .lc-acts{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:10px}
    .lc-acts button{display:inline-flex;align-items:center;gap:7px;padding:10px 16px;border-radius:999px;border:1px solid var(--border-2);background:var(--card2);color:var(--text);font:500 .88rem Inter,sans-serif;cursor:pointer}
    .lc-acts button:hover{background:var(--card3)}
    .lc-acts .lc-cam{display:none}
    @media (hover:none) and (pointer:coarse){.lc-acts .lc-cam{display:inline-flex}.lc-drop span.pc{display:none}}
    .lc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:10px;margin:14px 0 0}
    .lc-th{position:relative;aspect-ratio:3/4;border-radius:14px;overflow:hidden;background:var(--card2);border:1px solid var(--border)}
    .lc-th img{width:100%;height:100%;object-fit:cover;display:block}
    .lc-th .n{position:absolute;left:6px;top:6px;min-width:22px;height:22px;padding:0 6px;border-radius:999px;background:rgba(0,0,0,.6);color:#fff;font:600 .74rem Inter,sans-serif;display:grid;place-items:center}
    .lc-th .x{position:absolute;right:6px;top:6px;width:26px;height:26px;border-radius:50%;border:none;background:rgba(0,0,0,.62);color:#fff;font-size:16px;line-height:1;cursor:pointer;display:grid;place-items:center}
    .lc-th .x:hover{background:var(--red)}
    .lc-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:14px;flex-wrap:wrap}
    .lc-count{color:var(--text-2);font-size:.86rem}
    .lc-link{background:none;border:none;color:var(--accent);font:500 .84rem Inter,sans-serif;text-decoration:underline;cursor:pointer;padding:4px}
    .lc-go{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:14px}
    .lc-go .btn-primary{width:auto;min-width:200px;margin:0}
    .lc-prog{margin-top:14px;padding:12px 14px;border-radius:14px;background:var(--card2);border:1px solid var(--border)}
    .lc-prog .t{display:flex;justify-content:space-between;gap:8px;font-size:.84rem;color:var(--text-2)}
    .lc-prog .b{height:6px;border-radius:999px;background:color-mix(in srgb,var(--muted) 30%,transparent);margin-top:8px;overflow:hidden}
    .lc-prog .b i{display:block;height:100%;width:0;border-radius:999px;background:linear-gradient(90deg,var(--lc-ga),var(--lc-gb));transition:width .2s}
    .lc-res{margin-top:16px;padding:14px;border-radius:18px;background:linear-gradient(165deg,var(--card3),var(--card));border:1px solid var(--border-2)}
    .lc-res-h{display:flex;align-items:center;gap:10px;margin-bottom:10px}
    .lc-res-h img{width:34px;height:44px;object-fit:cover;border-radius:6px;border:1px solid var(--border)}
    .lc-res-h b{font-size:.92rem;font-weight:600;flex:1;min-width:0}
    .lc-res-h .conf{font-size:.74rem;padding:3px 9px;border-radius:999px;border:1px solid var(--border-2);color:var(--text-2);white-space:nowrap}
    .lc-res-h .conf.low{color:var(--yellow);border-color:color-mix(in srgb,var(--yellow) 50%,transparent)}
    .lc-txt{width:100%;min-height:150px;max-height:55vh;resize:vertical;box-sizing:border-box;padding:12px;border-radius:12px;border:1px solid var(--border-2);background:var(--bg-2);color:var(--text);font:400 .92rem/1.5 Inter,system-ui,sans-serif;white-space:pre-wrap}
    .lc-txt:focus{outline:2px solid color-mix(in srgb,var(--lc-gb) 55%,transparent);outline-offset:0}
    .lc-ra{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
    .lc-ra button{padding:8px 14px;border-radius:999px;border:1px solid var(--border-2);background:var(--card2);color:var(--text);font:500 .82rem Inter,sans-serif;cursor:pointer}
    .lc-ra button:hover{background:var(--card3)}
    .lc-ra .main{background:var(--lc-gb);border-color:transparent;color:var(--pri-fg,#00241f);font-weight:600}
    .lc-chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px;align-items:center}
    .lc-chips .lbl,.lc-exp .lbl{font-size:.76rem;color:var(--muted);margin-right:2px}
    .lc-chip{width:auto;display:inline-flex;gap:6px;align-items:center;padding:6px 11px;border-radius:999px;border:1px solid var(--border-2);background:var(--card2);color:var(--text);font:500 .8rem Inter,sans-serif;cursor:pointer}
    .lc-chip i{font-style:normal;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:var(--card3);display:grid;place-items:center;font-size:.7rem;color:var(--text-2)}
    .lc-chip.on{background:color-mix(in srgb,var(--lc-gb) 25%,var(--card2));border-color:var(--lc-gb)}
    .lc-chip:disabled{opacity:.4;cursor:default}
    .lc-pan{margin:0 0 10px}.lc-pan:empty{display:none}
    .lc-pl{border:1px solid var(--border-2);border-radius:14px;background:var(--bg-2);padding:6px 12px 10px}
    .lc-ph{font-size:.8rem;font-weight:600;color:var(--text-2);padding:6px 0 2px}
    .lc-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)}
    .lc-row .m{flex:1;min-width:0}.lc-row .m b{display:block;font-weight:600;font-size:.92rem;word-break:break-word}
    .lc-row .m small{display:block;color:var(--muted);font-size:.76rem;margin-top:2px;word-break:break-word}
    .lc-row .a{display:flex;gap:6px;flex-shrink:0}
    .lc-row .a button,.lc-row .a a{width:auto;padding:5px 10px;border-radius:999px;border:1px solid var(--border-2);background:var(--card2);color:var(--text);font:500 .76rem Inter,sans-serif;text-decoration:none;cursor:pointer}
    .lc-exp{align-items:center}
    .lc-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:-4px 0 10px}
    .lc-top b{font-size:.95rem}
    .lc-glob{margin-top:16px;padding:12px 14px;border-radius:18px;border:1px solid var(--border-2);background:color-mix(in srgb,var(--card) 70%,transparent)}
    .lc-ia{margin-top:16px;padding:14px;border-radius:18px;background:linear-gradient(165deg,var(--card3),var(--card));border:1px solid var(--border-2)}
    .lc-ia-h{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
    .lc-cloud{font-size:.72rem;padding:3px 9px;border-radius:999px;border:1px solid var(--border-2);color:var(--text-2);white-space:nowrap}
    .lc-check{display:flex;gap:8px;align-items:flex-start;margin:10px 0 0;font-size:.82rem;color:var(--text-2);cursor:pointer;line-height:1.35}
    .lc-check input{width:auto;margin:2px 0 0;flex-shrink:0}.lc-check small{color:var(--muted)}
    .lc-chat{display:flex;flex-direction:column;gap:10px;margin:12px 0 0;max-height:60vh;overflow:auto}
    .lc-chat.vide{display:none}
    .lc-m{padding:10px 12px;border-radius:14px;font-size:.9rem;line-height:1.5;word-break:break-word}
    .lc-m.u{align-self:flex-end;max-width:88%;background:color-mix(in srgb,var(--lc-gb) 22%,var(--card2));border:1px solid color-mix(in srgb,var(--lc-gb) 40%,transparent);white-space:pre-wrap}
    .lc-m.a{align-self:stretch;background:var(--bg-2);border:1px solid var(--border-2)}
    .lc-m.e{align-self:stretch;background:color-mix(in srgb,var(--red) 10%,var(--bg-2));border:1px solid color-mix(in srgb,var(--red) 40%,transparent);color:var(--text-2);white-space:pre-wrap}
    .lc-wait{color:var(--muted);font-style:italic}
    .lc-par{display:block;margin-top:8px;color:var(--muted);font-size:.72rem}
    .lc-md p{margin:.4em 0}.lc-md ul,.lc-md ol{margin:.4em 0;padding-left:1.3em}.lc-md li{margin:.15em 0}
    .lc-md h3,.lc-md h4,.lc-md h5,.lc-md h6{margin:.8em 0 .3em;font-size:1em}.lc-md strong{color:var(--text)}
    .lc-tw{overflow-x:auto;margin:.6em 0}.lc-md table{border-collapse:collapse;font-size:.84rem;min-width:100%}
    .lc-md th,.lc-md td{border:1px solid var(--border-2);padding:6px 9px;text-align:left;vertical-align:top}.lc-md th{background:var(--card2)}
    .lc-ask{display:flex;gap:8px;align-items:flex-end;margin-top:12px}
    .lc-ask textarea{flex:1;min-height:44px;max-height:140px;resize:vertical;box-sizing:border-box}
    .lc-ask .btn-primary{width:auto;margin:0;padding:12px 18px}
    .lc-hist-txt{white-space:pre-wrap;font-size:.88rem;line-height:1.5;padding:10px 12px;border-radius:12px;background:var(--bg-2);border:1px solid var(--border-2);margin-bottom:8px;max-height:40vh;overflow:auto}
    .lc-err{margin-top:10px;font-size:.82rem;color:var(--red)}
    .lc-empty{font-size:.84rem;color:var(--muted);padding:6px 2px}
    .lc-priv{display:flex;gap:8px;align-items:flex-start;margin-top:14px;padding:10px 12px;border-radius:12px;background:color-mix(in srgb,var(--card) 70%,transparent);border:1px solid var(--border);color:var(--muted);font-size:.78rem;line-height:1.4}
  `;
  document.head.appendChild(st);
}

// ---------- Lecture d'un fichier image : réduit et prépare l'aperçu ----------
function lcReduire(file){
  if(typeof mkShrink === 'function') return mkShrink(file, LC_SIDE, 0.88);
  return new Promise((ok, ko) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const r = Math.min(1, LC_SIDE / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * r)); c.height = Math.max(1, Math.round(img.height * r));
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => b ? ok(b) : ko(new Error('Image illisible')), 'image/jpeg', 0.88);
    };
    img.onerror = () => { URL.revokeObjectURL(url); ko(new Error('Image illisible')); };
    img.src = url;
  });
}

async function lcAjouter(files){
  const list = [...(files || [])].filter(f => f && (/^image\//.test(f.type) || /\.(heic|heif|png|jpe?g|webp|gif|bmp)$/i.test(f.name || '')));
  if(!list.length){ LC_TOAST("Aucune image reconnue."); return; }
  const place = LC_MAX - LC.imgs.length;
  if(place <= 0){ LC_TOAST(`Maximum ${LC_MAX} images à la fois.`); return; }
  if(list.length > place) LC_TOAST(`Maximum ${LC_MAX} images : seules les ${place} premières sont ajoutées.`);
  let echecs = 0;
  for(const f of list.slice(0, place)){
    try {
      const blob = await lcReduire(f);
      LC.imgs.push({ id: ++LC.seq, nom: f.name || 'Capture', blob, url: URL.createObjectURL(blob) });
    } catch(e){ echecs++; console.warn('Lecteur : image illisible', f.name, e); }
  }
  if(echecs) LC_TOAST(echecs === 1 ? "Une image n'a pas pu être lue (format non pris en charge, ex. HEIC sur ce navigateur)." : `${echecs} images n'ont pas pu être lues.`);
  lcRendu();
}

function lcRetirer(id){
  const i = LC.imgs.findIndex(x => x.id === id);
  if(i < 0) return;
  URL.revokeObjectURL(LC.imgs[i].url);
  LC.imgs.splice(i, 1);
  lcRendu();
}
function lcToutRetirer(){
  LC.imgs.forEach(x => URL.revokeObjectURL(x.url));
  LC.imgs = [];
  lcRendu();
}
function lcLiberer(){
  LC.chat = []; LC.q = ''; LC.ia = null; LC.histo = null; LC.sauve = false; LC.rep = false; LC.avecImg = false;
  clearTimeout(LC.tmr);
  LC.imgs.forEach(x => URL.revokeObjectURL(x.url)); LC.imgs = []; LC.lecture = null;
  if(window.LecteurOCR) window.LecteurOCR.fermer();   // libère la mémoire du moteur de lecture
}

// ---------- Lecture du texte (sur l'appareil) ----------
const lcUn = (src, pret) => pret() ? Promise.resolve() : new Promise((ok, ko) => {
  const sc = document.createElement('script'); sc.src = src; sc.onload = ok;
  sc.onerror = () => ko(new Error("Un module du Lecteur n'a pas pu être chargé. Vérifie ta connexion et réessaie."));
  document.head.appendChild(sc);
});
function lcChargerOcr(){
  if(window.LecteurOCR && window.LecteurOutils && window.LecteurIA) return Promise.resolve();
  if(!LC.ocrScript){
    LC.ocrScript = Promise.all([lcUn('lecteur-ocr.js?v=1', () => window.LecteurOCR), lcUn('lecteur-outils.js?v=2', () => window.LecteurOutils), lcUn('lecteur-ia.js?v=1', () => window.LecteurIA)])
      .catch(e => { LC.ocrScript = null; throw e; });
  }
  return LC.ocrScript;
}
const lcChargerHisto = () => lcUn('lecteur-histo.js?v=1', () => window.LecteurHisto);

// ---------- Extraction rapide (téléphones, prix, dates, e-mails, liens) ----------
function lcExt(im){ return window.LecteurOutils ? window.LecteurOutils.extraire(im.texte) : null; }
function lcPuces(im){
  const O = window.LecteurOutils, ext = lcExt(im);
  if(!O || !ext) return '';
  return '<span class="lbl">Extraire</span>' + O.TYPES.map(t => {
    const n = ext[t.id].length;
    return `<button type="button" class="lc-chip${im.vue === t.id ? ' on' : ''}" data-lc="chip" data-id="${im.id}" data-t="${t.id}"${n ? '' : ' disabled'}>${t.icone} ${t.nom} <i>${n}</i></button>`;
  }).join('');
}
function lcPanneau(im){
  const O = window.LecteurOutils, ext = lcExt(im);
  if(!O || !ext || !im.vue) return '';
  const t = O.TYPES.find(x => x.id === im.vue), items = ext[im.vue] || [];
  if(!t) return '';
  if(!items.length) return `<div class="lc-empty">${t.vide}</div>`;
  const rows = items.map((it, i) => {
    let act = '';
    if(it.type === 'tel') act = `<a href="tel:${LC_E(it.valeur)}">Appeler</a>`;
    else if(it.type === 'email') act = `<a href="mailto:${LC_E(it.valeur)}">Écrire</a>`;
    else if(it.type === 'lien' && /^https?:\/\//i.test(it.valeur)) act = `<a href="${LC_E(it.valeur)}" target="_blank" rel="noopener noreferrer">Ouvrir</a>`;
    return `<div class="lc-row"><div class="m"><b>${LC_E(it.texte)}</b>${it.detail ? `<small>${LC_E(it.detail)}</small>` : ''}</div><div class="a">${act}<button type="button" data-lc="copyitem" data-id="${im.id}" data-i="${i}">Copier</button></div></div>`;
  }).join('');
  return `<div class="lc-pl"><div class="lc-ph">${t.icone} ${t.nom} · ${items.length}</div>${rows}
    <div class="lc-ra"><button type="button" class="main" data-lc="copylist" data-id="${im.id}">Copier la liste</button><button type="button" data-lc="csv" data-id="${im.id}">Exporter en CSV</button></div></div>`;
}
function lcMajCarte(id){
  const im = LC.imgs.find(x => x.id === id); if(!im) return;
  const c = document.querySelector(`.lc-chips[data-id="${id}"]`), p = document.querySelector(`.lc-pan[data-id="${id}"]`);
  if(c) c.innerHTML = lcPuces(im);
  if(p) p.innerHTML = lcPanneau(im);
}
function lcItems(id){
  const im = LC.imgs.find(x => x.id === id), ext = im && lcExt(im);
  return ext && im.vue ? ext[im.vue] || [] : [];
}

// ---------- Exports (TXT, PDF, CSV), partage ----------
function lcSections(ids){
  return LC.imgs.filter(x => x.etat === 'ok' && x.texte && x.texte.trim() && (!ids || ids.includes(x.id)))
    .map(x => ({ titre: `Image ${LC.imgs.indexOf(x) + 1}`, texte: x.texte }));
}
async function lcExporter(format, ids, sections, titre){
  const O = window.LecteurOutils, sec = sections || lcSections(ids);
  if(!O || !sec.length){ LC_TOAST('Rien à exporter.'); return; }
  try {
    if(format === 'pdf') O.telecharger(O.pdf(sec, titre || "Texte lu par le Lecteur d'images"), O.nomFichier('pdf'));
    else if(format === 'docx') O.telecharger(await O.docx(O.blocsTexte(sec), titre), O.nomFichier('docx'));
    else O.telecharger(O.blob(O.txt(sec), 'text/plain;charset=utf-8'), O.nomFichier('txt'));
    LC_TOAST({ pdf: 'PDF créé', docx: 'Document Word créé', txt: 'Fichier TXT créé' }[format] || 'Fichier créé');
  } catch(e){ LC_TOAST((e && e.message) || 'Export impossible.'); }
}
async function lcPartager(txt){
  try { await window.LecteurOutils.partager(txt); } catch(e){ LC_TOAST((e && e.message) || 'Partage impossible.'); }
}
function lcMajProg(){
  const t = document.getElementById('lcProgT'), b = document.getElementById('lcProgB'), L = LC.lecture;
  if(!t || !b || !L) return;
  t.firstElementChild.textContent = L.etape;
  t.lastElementChild.textContent = L.n > 1 && L.i > 0 ? `Image ${L.i} sur ${L.n}` : '';
  b.style.width = Math.round(Math.max(3, L.part * 100)) + '%';
}
async function lcLire(ids, inverser){
  if(LC.lecture) return;
  const cibles = LC.imgs.filter(x => ids.includes(x.id));
  if(!cibles.length) return;
  cibles.forEach(x => { x.etat = 'attente'; x.err = ''; });
  LC.lecture = { i: 0, n: cibles.length, etape: 'Préparation du moteur…', part: 0 };
  lcRendu();
  try {
    await lcChargerOcr();
    for(const im of cibles){
      if(!LC.imgs.includes(im)) continue;           // image retirée entre-temps
      LC.lecture.i++; LC.lecture.part = 0; im.etat = 'lecture'; lcMajProg();
      try {
        const r = await window.LecteurOCR.lire(im.blob, { inverser, progres: p => { if(LC.lecture){ LC.lecture.etape = p.etape; LC.lecture.part = p.part; lcMajProg(); } } });
        if(!LC.imgs.includes(im)) continue;
        im.texte = r.texte; im.confiance = r.confiance; im.inverse = r.inverse; im.blocs = r.blocs; im.etat = 'ok';
      } catch(e){
        console.warn('Lecteur : lecture impossible', e);
        im.etat = 'erreur'; im.err = (e && e.message) || 'Lecture impossible.';
      }
      lcRendu();
    }
  } catch(e){
    cibles.forEach(x => { if(x.etat === 'attente' || x.etat === 'lecture'){ x.etat = 'erreur'; x.err = (e && e.message) || 'Lecture impossible.'; } });
  }
  LC.lecture = null;
  lcRendu();
}
async function lcCopier(txt, msg){
  txt = String(txt == null ? '' : txt);
  if(!txt.trim()){ LC_TOAST('Rien à copier.'); return; }
  try { await navigator.clipboard.writeText(txt); }
  catch(e){
    const t = document.createElement('textarea'); t.value = txt; t.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(t); t.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch(_){} t.remove();
    if(!ok){ LC_TOAST("Copie impossible sur ce navigateur."); return; }
  }
  LC_TOAST(msg || 'Texte copié');
}
function lcCopierSelection(id){
  const ta = document.querySelector(`.lc-txt[data-id="${id}"]`);
  if(!ta) return;
  const a = ta.selectionStart, b = ta.selectionEnd;
  if(a == null || a === b){ LC_TOAST('Sélectionne d\u2019abord une partie du texte.'); return; }
  lcCopier(ta.value.slice(a, b), 'Sélection copiée');
}

function lcChoisir(camera){
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*'; inp.style.display = 'none';
  if(camera) inp.setAttribute('capture', 'environment'); else inp.multiple = true;
  inp.onchange = async () => { const f = [...(inp.files || [])]; inp.remove(); if(f.length) await lcAjouter(f); };
  document.body.appendChild(inp); inp.click();
}

// ---------- Fenêtre ----------
function lcRenduLecture(){
  if(!LC.imgs.length) return '';
  const aLire = LC.imgs.filter(x => !x.etat || x.etat === 'erreur' && !x.texte).map(x => x.id);
  const fait = LC.imgs.filter(x => x.etat === 'ok');
  let h = '';
  if(LC.lecture){
    h += `<div class="lc-prog"><div class="t" id="lcProgT"><span></span><span></span></div><div class="b"><i id="lcProgB"></i></div></div>`;
  } else if(aLire.length){
    h += `<div class="lc-go"><button type="button" class="btn-primary" data-lc="read" data-ids="${aLire.join(',')}">${fait.length ? 'Lire les nouvelles images' : (aLire.length > 1 ? 'Lire le texte des images' : 'Lire le texte')}</button></div>`;
  }
  LC.imgs.forEach((x, i) => {
    if(x.etat === 'ok'){
      h += `<div class="lc-res">
        <div class="lc-res-h"><img src="${x.url}" alt=""><b>Image ${i + 1}</b>${x.texte ? `<span class="conf${x.confiance < 70 ? ' low' : ''}" title="Fiabilité estimée de la lecture">Fiabilité ${x.confiance} %</span>` : ''}</div>
        ${x.texte ? '' : `<div class="lc-empty">Aucun texte reconnu. Essaie « Relire en inversant les couleurs », ou une capture plus nette.</div>`}
        <div class="lc-chips" data-id="${x.id}">${lcPuces(x)}</div>
        <div class="lc-pan" data-id="${x.id}">${lcPanneau(x)}</div>
        <textarea class="lc-txt" data-id="${x.id}" spellcheck="false" aria-label="Texte lu sur l'image ${i + 1}">${LC_E(x.texte)}</textarea>
        <div class="lc-ra">
          <button type="button" class="main" data-lc="copy" data-id="${x.id}">Copier tout</button>
          <button type="button" data-lc="copysel" data-id="${x.id}">Copier la sélection</button>
          <button type="button" data-lc="reread" data-id="${x.id}" title="Utile si le texte est mal lu (captures sombres ou claires)">${x.inverse ? 'Relire sans inverser' : 'Relire en inversant les couleurs'}</button>
        </div>
        <div class="lc-ra lc-exp"><span class="lbl">Exporter</span>
          <button type="button" data-lc="exp" data-f="txt" data-id="${x.id}">TXT</button>
          <button type="button" data-lc="exp" data-f="pdf" data-id="${x.id}">PDF</button>
          <button type="button" data-lc="exp" data-f="docx" data-id="${x.id}">Word</button>
          ${navigator.share ? `<button type="button" data-lc="share" data-id="${x.id}">Partager</button>` : ''}
        </div></div>`;
    } else if(x.etat === 'erreur' && !x.texte){
      h += `<div class="lc-err">Image ${i + 1} : ${LC_E(x.err || 'lecture impossible')}</div>`;
    }
  });
  if(fait.length){
    const sec = lcSections(), rep = sec.length > 1 && window.LecteurOutils ? window.LecteurOutils.repetees(sec) : [];
    h += `<div class="lc-glob"><div class="lc-ph">${fait.length > 1 ? `Toutes les images (${fait.length})` : 'Ce résultat'}</div>
      <div class="lc-ra">
        ${fait.length > 1 ? `<button type="button" class="main" data-lc="copyall">Copier tout le texte</button>` : ''}
        ${fait.length > 1 ? `<button type="button" class="lc-chip${LC.rep ? ' on' : ''}" data-lc="rep"${rep.length ? '' : ' disabled'}>🔁 Infos répétées <i>${rep.length}</i></button>` : ''}
        <button type="button" data-lc="save"${LC.sauve ? ' disabled' : ''}>${LC.sauve ? '✓ Enregistré' : '💾 Enregistrer dans l\u2019historique'}</button>
      </div>
      ${LC.rep && rep.length ? `<div class="lc-pl">${rep.map(r => `<div class="lc-row"><div class="m"><b>${LC_E(r.texte)}</b><small>Présent dans : ${LC_E(r.images.join(', '))}</small></div></div>`).join('')}</div>` : ''}
      ${fait.length > 1 ? `<div class="lc-ra lc-exp"><span class="lbl">Exporter tout</span><button type="button" data-lc="expall" data-f="txt">TXT</button><button type="button" data-lc="expall" data-f="pdf">PDF</button><button type="button" data-lc="expall" data-f="docx">Word</button></div>` : ''}
    </div>`;
  }
  if(!LC.lecture) h += lcRenduIA();
  return h;
}

// ---------- Demander à l'IA ----------
function lcMsgs(src){ return src === 'histo' ? ((LC.histo && LC.histo.entree && LC.histo.entree.chat) || []) : LC.chat; }
function lcChatHtml(src){
  const IA = window.LecteurIA; if(!IA) return '';
  const L = lcMsgs(src);
  let h = L.map((m, i) => {
    if(m.role === 'user') return `<div class="lc-m u">${LC_E(m.text)}</div>`;
    if(m.erreur) return `<div class="lc-m e">${LC_E(m.text)}${m.cle ? '<div class="lc-ra"><button type="button" data-lc="iakeys">Ouvrir les Réglages IA</button></div>' : ''}</div>`;
    const tab = IA.tableaux(m.text).length;
    return `<div class="lc-m a"><div class="lc-md">${IA.html(m.text)}</div>
      <div class="lc-ra"><button type="button" class="main" data-lc="mcopy" data-s="${src}" data-i="${i}">Copier</button>
        <button type="button" data-lc="mexp" data-f="txt" data-s="${src}" data-i="${i}">TXT</button><button type="button" data-lc="mexp" data-f="pdf" data-s="${src}" data-i="${i}">PDF</button><button type="button" data-lc="mexp" data-f="docx" data-s="${src}" data-i="${i}">Word</button>${tab ? `<button type="button" data-lc="mexp" data-f="csv" data-s="${src}" data-i="${i}">CSV (Excel)</button>` : ''}
      </div>${m.par ? `<small class="lc-par">Réponse de ${LC_E(m.par)}</small>` : ''}</div>`;
  }).join('');
  if(src !== 'histo' && LC.ia) h += '<div class="lc-m a lc-wait">✨ L\u2019IA lit et réfléchit…</div>';
  return h;
}
function lcMajChat(){
  const c = document.getElementById('lcChat'); if(!c) return;
  c.innerHTML = lcChatHtml('chat'); c.classList.toggle('vide', !LC.chat.length && !LC.ia);
  const last = c.lastElementChild; if(last) last.scrollIntoView({ block: 'nearest' });
  document.querySelectorAll('.lc-ia [data-lc=iaact],.lc-ia [data-lc=ask]').forEach(b => { b.disabled = !!LC.ia; });
}
function lcRenduIA(){
  const IA = window.LecteurIA; if(!IA || !LC.imgs.length) return '';
  const multi = LC.imgs.length > 1;
  return `<div class="lc-ia">
    <div class="lc-ia-h"><b>✨ Demander à l'IA</b><span class="lc-cloud" title="Le texte lu part vers l'IA réglée dans tes Réglages IA">☁️ IA externe</span></div>
    <div class="lc-chips">${IA.ACTIONS.filter(a => !a.multi || multi).map(a => `<button type="button" class="lc-chip" data-lc="iaact" data-a="${a.id}"${LC.ia ? ' disabled' : ''}>${a.icone} ${a.nom}</button>`).join('')}</div>
    <label class="lc-check"><input type="checkbox" id="lcImgChk"${LC.avecImg ? ' checked' : ''}> Inclure aussi ${multi ? 'les images' : 'l\u2019image'} dans l'envoi <small>(analyse visuelle : couleurs, composition…)</small></label>
    <div class="lc-chat${LC.chat.length || LC.ia ? '' : ' vide'}" id="lcChat">${lcChatHtml('chat')}</div>
    <div class="lc-ask"><textarea id="lcQ" rows="2" placeholder="Pose une question ou donne une instruction…">${LC_E(LC.q)}</textarea><button type="button" class="btn-primary" data-lc="ask"${LC.ia ? ' disabled' : ''}>Envoyer</button></div>
    ${LC.chat.length ? '<div class="lc-ra"><button type="button" data-lc="newchat">Nouvelle conversation</button></div>' : ''}
  </div>`;
}
async function lcConfirmerEnvoi(avecImg){
  if(avecImg ? LC.okImage : LC.okTexte) return true;
  const msg = avecImg
    ? "Cette action envoie le texte ET les images à une IA externe (Gemini, Groq, Mistral, Claude ou OpenAI, selon tes Réglages IA).\nLes images peuvent contenir des informations personnelles. Continuer ?"
    : "Cette action envoie le texte lu à une IA externe (Gemini, Groq, Mistral, Claude ou OpenAI, selon tes Réglages IA).\nLes images, elles, ne sont pas envoyées. Continuer ?";
  const ok = typeof agConfirm === 'function' ? await agConfirm(msg, { ok: 'Envoyer' }) : window.confirm(msg);
  if(ok){ LC.okTexte = true; if(avecImg) LC.okImage = true; }
  return !!ok;
}
async function lcDemander(question, opt){
  opt = opt || {};
  question = String(question || '').trim();
  if(!question || LC.ia) return;
  const sections = lcSections(), avecImg = LC.avecImg || !!opt.visuel;
  if(!sections.length && !avecImg){ LC_TOAST('Lis d\u2019abord le texte (bouton « Lire le texte »), ou coche « Inclure l\u2019image ».'); return; }
  if(!(await lcConfirmerEnvoi(avecImg))) return;
  if(opt.visuel){ LC.avecImg = true; const k = document.getElementById('lcImgChk'); if(k) k.checked = true; }
  const hist = LC.chat.filter(m => !m.erreur).map(m => ({ role: m.role, text: m.text }));
  LC.chat.push({ role: 'user', text: opt.affiche || question }); LC.q = '';
  const q = document.getElementById('lcQ'); if(q) q.value = '';
  LC.ia = { occupe: true }; lcMajChat();
  try {
    await lcChargerOcr();
    if(typeof window.iaHasKey === 'function' && !window.iaHasKey()){ const er = new Error("Aucune clé IA n'est réglée. Ajoute une clé gratuite (par exemple Gemini) dans les Réglages IA."); er.cle = true; throw er; }
    const r = await window.LecteurIA.envoyer({ sections, historique: hist, question, blobs: avecImg ? LC.imgs.map(x => x.blob) : [] });
    LC.chat.push({ role: 'assistant', text: r.texte, par: r.fournisseur });
  } catch(e){
    console.warn('Lecteur : IA', e);
    LC.chat.push({ role: 'assistant', erreur: true, cle: !!(e && e.cle), text: (e && e.message) || "L'IA n'a pas pu répondre." });
  }
  LC.ia = null; lcMajChat();
  const q2 = document.getElementById('lcQ'); if(q2 && LC.q) q2.value = LC.q;
}
async function lcExportMsg(src, i, f){
  const O = window.LecteurOutils, IA = window.LecteurIA, m = lcMsgs(src)[i];
  if(!m || !O || !IA) return;
  try {
    if(f === 'csv'){
      const rows = []; IA.tableaux(m.text).forEach((t, k) => { if(k) rows.push([]); t.forEach(r => rows.push(r.map(IA.nu))); });
      O.telecharger(O.blob(O.csv(rows), 'text/csv;charset=utf-8'), O.nomFichier('csv')); LC_TOAST('Fichier CSV créé (s\u2019ouvre dans Excel)');
    } else if(f === 'docx'){
      O.telecharger(await O.docx(IA.blocs(m.text), "Réponse de l'assistant"), O.nomFichier('docx')); LC_TOAST('Document Word créé');
    } else lcExporter(f, null, [{ titre: 'Réponse', texte: IA.nu(m.text) }], "Réponse de l'assistant");
  } catch(e){ LC_TOAST((e && e.message) || 'Export impossible.'); }
}

// ---------- Historique (texte seulement, chiffré sur l'appareil) ----------
async function lcSauver(){
  try {
    await Promise.all([lcChargerOcr(), lcChargerHisto()]);
    const sec = lcSections(); if(!sec.length){ LC_TOAST('Rien à enregistrer.'); return; }
    const premiere = (sec[0].texte.split('\n').map(l => l.trim()).find(l => l) || 'Lecture').slice(0, 60);
    await window.LecteurHisto.ajouter({ titre: premiere, sections: sec, chat: LC.chat.filter(m => !m.erreur) });
    LC.sauve = true; lcRendu(); LC_TOAST('Enregistré dans l\u2019historique (texte seulement)');
  } catch(e){ LC_TOAST((e && e.message) || 'Enregistrement impossible.'); }
}
async function lcOuvrirHisto(){
  LC.histo = { mode: 'liste', items: null }; lcRendu();
  try { await Promise.all([lcChargerOcr(), lcChargerHisto()]); LC.histo.items = await window.LecteurHisto.lister(); }
  catch(e){ LC.histo.erreur = (e && e.message) || 'Historique indisponible.'; LC.histo.items = []; }
  lcRendu();
}
async function lcVoirHisto(id){
  try { const e = await window.LecteurHisto.lire(id); LC.histo = { mode: 'vue', entree: e }; lcRendu(); }
  catch(err){ LC_TOAST((err && err.message) || 'Lecture impossible.'); }
}
const lcDate = t => { try { return new Date(t).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch(e){ return ''; } };
function lcRenduHisto(){
  const H = LC.histo;
  const haut = (titre, retour) => `<div class="lc-top"><button type="button" class="lc-link" data-lc="${retour}">← ${retour === 'hliste' ? 'Retour à la liste' : 'Retour'}</button><b>${titre}</b></div>`;
  if(H.mode === 'vue' && H.entree){
    const e = H.entree;
    return haut('Historique', 'hliste') + `<div class="lc-res"><div class="lc-res-h"><b>${LC_E(e.titre)}</b><span class="conf">${LC_E(lcDate(e.date))}</span></div>
      ${(e.sections || []).map(x => `<div class="lc-ph">${LC_E(x.titre)}</div><div class="lc-hist-txt">${LC_E(x.texte)}</div>`).join('')}
      <div class="lc-ra"><button type="button" class="main" data-lc="hcopy">Copier le texte</button>
        <button type="button" data-lc="hexp" data-f="txt">TXT</button><button type="button" data-lc="hexp" data-f="pdf">PDF</button><button type="button" data-lc="hexp" data-f="docx">Word</button>
        <button type="button" data-lc="hdel" data-id="${LC_E(e.id)}">Supprimer</button></div></div>
      ${(e.chat || []).length ? `<div class="lc-ia"><div class="lc-ia-h"><b>✨ Conversation avec l'IA</b></div><div class="lc-chat">${lcChatHtml('histo')}</div></div>` : ''}`;
  }
  const items = H.items;
  return haut('Historique', 'hback') + (items == null ? '<div class="lc-empty">Chargement…</div>'
    : H.erreur ? `<div class="lc-err">${LC_E(H.erreur)}</div>`
    : !items.length ? '<div class="lc-empty">Rien d\u2019enregistré pour le moment. Après une lecture, utilise « Enregistrer dans l\u2019historique ».</div>'
    : items.map(it => `<div class="lc-res"><div class="lc-res-h"><b>${LC_E(it.titre)}</b><span class="conf">${LC_E(lcDate(it.date))}</span></div>
        <div class="lc-empty" style="padding:0 0 8px">${it.nb} image${it.nb > 1 ? 's' : ''} lue${it.nb > 1 ? 's' : ''}${it.msgs ? ` · ${it.msgs} message${it.msgs > 1 ? 's' : ''} avec l'IA` : ''}</div>
        <div class="lc-ra">${it.illisible ? '' : `<button type="button" class="main" data-lc="hopen" data-id="${LC_E(it.id)}">Ouvrir</button>`}<button type="button" data-lc="hdel" data-id="${LC_E(it.id)}">Supprimer</button></div></div>`).join(''))
    + `<div class="lc-priv">🔒 <span>Seuls les textes et les réponses de l'IA sont gardés, jamais les images. Ils sont chiffrés et restent sur cet appareil.${items && items.length ? ' <button type="button" class="lc-link" data-lc="hclear">Tout effacer</button>' : ''}</span></div>`;
}
async function lcHistoAction(a, b){
  const H = window.LecteurHisto;
  if(a === 'histo') return lcOuvrirHisto();
  if(a === 'hback'){ LC.histo = null; return lcRendu(); }
  if(a === 'hliste') return lcOuvrirHisto();
  if(a === 'hopen') return lcVoirHisto(b.dataset.id);
  if(a === 'hdel'){
    if(!(typeof agConfirm === 'function' ? await agConfirm('Supprimer cette entrée de l\u2019historique ?') : window.confirm('Supprimer cette entrée ?'))) return;
    try { await H.supprimer(b.dataset.id); } catch(e){ LC_TOAST('Suppression impossible.'); return; }
    return lcOuvrirHisto();
  }
  if(a === 'hclear'){
    if(!(typeof agConfirm === 'function' ? await agConfirm('Effacer tout l\u2019historique du Lecteur ? Cette action est définitive.', { ok: 'Tout effacer' }) : window.confirm('Tout effacer ?'))) return;
    try { await H.toutEffacer(); } catch(e){ LC_TOAST('Suppression impossible.'); return; }
    LC_TOAST('Historique effacé'); return lcOuvrirHisto();
  }
  const e = LC.histo && LC.histo.entree; if(!e) return;
  if(a === 'hcopy') return lcCopier((e.sections || []).map(x => ((e.sections || []).length > 1 ? `--- ${x.titre} ---\n` : '') + x.texte).join('\n\n'));
  if(a === 'hexp') return lcExporter(b.dataset.f, null, e.sections || [], e.titre);
}

function lcRendu(){
  const box = document.getElementById('lcBody');
  if(!box) return;
  const n = LC.imgs.length;
  box.innerHTML = LC.histo ? lcRenduHisto() : `
    <div class="lc-top"><span></span><button type="button" class="lc-link" data-lc="histo">🕘 Historique</button></div>
    <div class="lc-drop" id="lcDrop">
      <b>Dépose tes captures ici</b>
      <span><span class="pc">Glisse-les, </span>colle-les (Ctrl+V) ou choisis-les ci-dessous</span>
      <div class="lc-acts">
        <button type="button" data-lc="pick">${LC_ICON.replace('width="16" height="16"', 'width="16" height="16"')} Choisir des images</button>
        <button type="button" class="lc-cam" data-lc="cam">Prendre une photo</button>
      </div>
    </div>
    ${n ? `
      <div class="lc-grid">${LC.imgs.map((x, i) => `
        <div class="lc-th"><img src="${x.url}" alt="${LC_E(x.nom)}"><span class="n">${i + 1}</span><button type="button" class="x" data-lc="del" data-id="${x.id}" aria-label="Retirer l'image ${i + 1}">×</button></div>`).join('')}
      </div>
      <div class="lc-bar">
        <span class="lc-count">${n} image${n > 1 ? 's' : ''} prête${n > 1 ? 's' : ''}</span>
        <button type="button" class="lc-link" data-lc="clear">Tout retirer</button>
      </div>` : ''}
    ${lcRenduLecture()}
    <div class="lc-priv">🔒 <span>La lecture du texte se fait sur cet appareil. Rien ne part en ligne, sauf quand tu demandes l'aide de l'IA : le texte lu part alors vers l'IA de tes Réglages (et les images seulement si tu coches « Inclure l'image »). Rien n'est enregistré sans ton accord.</span></div>`;

  const drop = document.getElementById('lcDrop');
  if(drop) drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
  if(drop) drop.ondragleave = () => drop.classList.remove('over');
  if(drop) drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); lcAjouter(e.dataTransfer && e.dataTransfer.files); };
  box.onclick = e => {
    const b = e.target.closest('[data-lc]'); if(!b) return;
    const a = b.dataset.lc;
    if(a === 'pick') lcChoisir(false);
    else if(a === 'cam') lcChoisir(true);
    else if(a === 'del') lcRetirer(+b.dataset.id);
    else if(a === 'clear') lcToutRetirer();
    else if(a === 'read') lcLire((b.dataset.ids || '').split(',').map(Number).filter(Boolean));
    else if(a === 'reread'){ const im = LC.imgs.find(x => x.id === +b.dataset.id); if(im) lcLire([im.id], !im.inverse); }
    else if(a === 'copy'){ const im = LC.imgs.find(x => x.id === +b.dataset.id); if(im) lcCopier(im.texte); }
    else if(a === 'copysel') lcCopierSelection(+b.dataset.id);
    else if(a === 'iaact'){ const ac = window.LecteurIA && window.LecteurIA.ACTIONS.find(x => x.id === b.dataset.a); if(ac) lcDemander(ac.texte, { visuel: !!ac.visuel, affiche: ac.nom }); }
    else if(a === 'ask'){ const q = document.getElementById('lcQ'); lcDemander(q ? q.value : LC.q); }
    else if(a === 'newchat'){ LC.chat = []; lcRendu(); }
    else if(a === 'iakeys'){ if(typeof window.iaOuvrirReglages === 'function') window.iaOuvrirReglages(); }
    else if(a === 'mcopy'){ const m = lcMsgs(b.dataset.s)[+b.dataset.i]; if(m) lcCopier(window.LecteurIA.nu(m.text), 'Réponse copiée'); }
    else if(a === 'mexp') lcExportMsg(b.dataset.s, +b.dataset.i, b.dataset.f);
    else if(a === 'rep'){ LC.rep = !LC.rep; lcRendu(); }
    else if(a === 'save') lcSauver();
    else if(/^h(?:isto|back|liste|open|del|clear|copy|exp)$/.test(a)) lcHistoAction(a, b);
    else if(a === 'chip'){ const im = LC.imgs.find(x => x.id === +b.dataset.id); if(im){ im.vue = im.vue === b.dataset.t ? '' : b.dataset.t; lcMajCarte(im.id); } }
    else if(a === 'copyitem'){ const it = lcItems(+b.dataset.id)[+b.dataset.i]; if(it) lcCopier(it.texte, 'Copié'); }
    else if(a === 'copylist'){ const l = lcItems(+b.dataset.id); lcCopier(l.map(window.LecteurOutils.ligneCopie).join('\n'), `${l.length} élément${l.length > 1 ? 's' : ''} copié${l.length > 1 ? 's' : ''}`); }
    else if(a === 'csv'){ const l = lcItems(+b.dataset.id), O = window.LecteurOutils; if(l.length){ O.telecharger(O.blob(O.csvExtraction(l), 'text/csv;charset=utf-8'), O.nomFichier('csv')); LC_TOAST('Fichier CSV créé (s\u2019ouvre dans Excel)'); } }
    else if(a === 'exp') lcExporter(b.dataset.f, [+b.dataset.id]);
    else if(a === 'expall') lcExporter(b.dataset.f);
    else if(a === 'share'){ const im = LC.imgs.find(x => x.id === +b.dataset.id); if(im) lcPartager(im.texte); }
    else if(a === 'copyall') lcCopier(LC.imgs.filter(x => x.etat === 'ok' && x.texte).map((x, i) => (LC.imgs.filter(y => y.etat === 'ok' && y.texte).length > 1 ? `--- Image ${LC.imgs.indexOf(x) + 1} ---\n` : '') + x.texte).join('\n\n'), 'Tout le texte copié');
  };
  // Le texte corrigé à la main est gardé (en mémoire) pour la copie et les prochaines étapes
  box.onchange = e => { if(e.target && e.target.id === 'lcImgChk') LC.avecImg = e.target.checked; };
  box.onkeydown = e => { if(e.target && e.target.id === 'lcQ' && e.key === 'Enter' && !e.shiftKey && !e.isComposing){ e.preventDefault(); lcDemander(e.target.value); } };
  box.oninput = e => { if(e.target && e.target.id === 'lcQ'){ LC.q = e.target.value; return; } const ta = e.target.closest && e.target.closest('.lc-txt'); if(!ta) return; const im = LC.imgs.find(x => x.id === +ta.dataset.id); if(im){ im.texte = ta.value; clearTimeout(LC.tmr); LC.tmr = setTimeout(() => lcMajCarte(im.id), 350); } };
  lcMajProg();
}

function lcOpen(){
  lcStyle();
  const bg = agSheet('lcSheet', `<h3 class="lc-h">Lecteur d'images</h3><p class="lc-sub">Importe une ou plusieurs captures pour en lire et en comprendre le contenu.</p><div id="lcBody"></div>`);
  // Libère la mémoire quand la fenêtre se ferme (bouton ×, clic à côté ou retrait du DOM)
  new MutationObserver((_, obs) => { if(!document.getElementById('lcSheet')){ lcLiberer(); obs.disconnect(); } })
    .observe(document.body, { childList: true });
  lcRendu();
  lcChargerOcr().then(() => { if(document.getElementById('lcSheet')) lcRendu(); }).catch(() => {});   // petits modules : IA, extraction, exports
  return bg;
}

// Coller une capture (Ctrl+V / appui long > Coller) quand la fenêtre est ouverte
document.addEventListener('paste', e => {
  if(!document.getElementById('lcSheet')) return;
  const items = [...((e.clipboardData && e.clipboardData.items) || [])].filter(i => i.kind === 'file' && /^image\//.test(i.type));
  if(!items.length) return;
  e.preventDefault();
  lcAjouter(items.map(i => i.getAsFile()).filter(Boolean));
});
document.addEventListener('keydown', e => { if(e.key === 'Escape' && document.getElementById('lcSheet') && !document.querySelector('#hcViewer')) agCloseSheet('lcSheet'); });

// ---------- Boutons dans les menus (même principe que « Fichiers ») ----------
function lcButtons(){
  const th = document.querySelector('.drawer-nav.ag-theme-btn');
  if(th && !document.querySelector('.drawer-nav.lc-drawer')){
    const b = document.createElement('button'); b.className = 'drawer-nav lc-drawer';
    b.innerHTML = `<span class="nav-icon">${LC_ICON}</span><span>Lecteur d'images</span>`;
    b.onclick = () => { if(typeof closeDrawer === 'function') closeDrawer(); lcOpen(); };
    th.parentElement.insertBefore(b, th);
  }
  const side = document.getElementById('agSide');
  if(side && !side.querySelector('.lc-side')){
    const b = document.createElement('button'); b.className = 'ag-side-it lc-side';
    b.innerHTML = `<span class="si">${LC_ICON.replace('width="16" height="16"', 'width="18" height="18"')}</span><span class="sl">Lecteur</span>`;
    b.onclick = () => lcOpen();
    const anchor = side.querySelector('.hc-side') || side.querySelector('.ag-side-it[data-tab="dash"]');
    if(anchor) anchor.insertAdjacentElement('afterend', b); else side.insertBefore(b, side.firstChild);
  }
  const um = document.querySelector('.user-menu-items');
  if(um && !um.querySelector('.lc-um')){
    const b = document.createElement('button'); b.className = 'lc-um';
    b.innerHTML = `<span class="icon">${LC_ICON}</span><span>Lecteur d'images</span>`;
    b.onclick = () => { if(typeof closeUserMenu === 'function') closeUserMenu(); lcOpen(); };
    um.insertBefore(b, um.firstChild);
  }
}
// Les menus apparaissent après la connexion : on vérifie chaque seconde jusqu'à les trouver.
const lcTimer = setInterval(() => { lcButtons(); if(document.querySelector('.lc-drawer') && document.querySelector('.lc-um') && (!document.getElementById('agSide') || document.querySelector('.lc-side'))) clearInterval(lcTimer); }, 1000);

window.lcOpen = lcOpen;
window.LecteurImages = { open: lcOpen };
})();
