// ============================================================
// LECTEUR.JS - Lecteur d'images de la Super App Henzo
// Étape 1 : accès (barre PC, tiroir mobile, menu du compte) + import d'images
// (galerie, appareil photo, glisser-déposer, collage).
// Rien n'est envoyé nulle part et rien n'est gardé : les images vivent en mémoire
// tant que la fenêtre est ouverte, puis disparaissent à la fermeture.
// Étapes suivantes : lecture du texte sur l'appareil (OCR), actions rapides, IA, exports.
// ============================================================
(function(){
if(typeof agSheet !== 'function') return;

const LC_E = s => (typeof agEsc === 'function' ? agEsc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
const LC_TOAST = m => { if(typeof agToast === 'function') agToast(m); };
const LC_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2"/><path d="M8 9h8M8 12h8M8 15h5"/></svg>';
const LC_MAX = 12;          // images par session
const LC_SIDE = 1800;       // taille maximale (px) d'une image gardée en mémoire

// Seul état du module : en mémoire, jamais écrit sur l'appareil.
const LC = { imgs: [], seq: 0 };

function lcStyle(){
  if(document.getElementById('lcStyle')) return;
  const st = document.createElement('style'); st.id = 'lcStyle';
  st.textContent = `
    #lcSheet .modal{max-width:720px}
    #lcSheet{--lc-ga:var(--grad-a, var(--accent-2));--lc-gb:var(--grad-b, var(--accent))}
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
function lcLiberer(){ LC.imgs.forEach(x => URL.revokeObjectURL(x.url)); LC.imgs = []; }

function lcChoisir(camera){
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*'; inp.style.display = 'none';
  if(camera) inp.setAttribute('capture', 'environment'); else inp.multiple = true;
  inp.onchange = async () => { const f = [...(inp.files || [])]; inp.remove(); if(f.length) await lcAjouter(f); };
  document.body.appendChild(inp); inp.click();
}

// ---------- Fenêtre ----------
function lcRendu(){
  const box = document.getElementById('lcBody');
  if(!box) return;
  const n = LC.imgs.length;
  box.innerHTML = `
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
    <div class="lc-priv">🔒 <span>Tes images restent sur cet appareil et ne sont pas enregistrées : elles disparaissent quand tu fermes cette fenêtre. La lecture du texte et les analyses arrivent aux prochaines étapes.</span></div>`;

  const drop = document.getElementById('lcDrop');
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); lcAjouter(e.dataTransfer && e.dataTransfer.files); };
  box.onclick = e => {
    const b = e.target.closest('[data-lc]'); if(!b) return;
    const a = b.dataset.lc;
    if(a === 'pick') lcChoisir(false);
    else if(a === 'cam') lcChoisir(true);
    else if(a === 'del') lcRetirer(+b.dataset.id);
    else if(a === 'clear') lcToutRetirer();
  };
}

function lcOpen(){
  lcStyle();
  const bg = agSheet('lcSheet', `<h3 class="lc-h">Lecteur d'images</h3><p class="lc-sub">Importe une ou plusieurs captures pour en lire et en comprendre le contenu.</p><div id="lcBody"></div>`);
  // Libère la mémoire quand la fenêtre se ferme (bouton ×, clic à côté ou retrait du DOM)
  new MutationObserver((_, obs) => { if(!document.getElementById('lcSheet')){ lcLiberer(); obs.disconnect(); } })
    .observe(document.body, { childList: true });
  lcRendu();
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
