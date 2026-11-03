// ============================================================
// MONTAGE-PLUS.JS - Réglages avancés d'un plan (table de montage)
// ------------------------------------------------------------
// - Cadrage : remplir l'écran, photo entière sur fond flou (idéal pour
//   une photo horizontale dans une vidéo verticale), ou sur bandes.
// - Point important : tu touches l'aperçu à l'endroit qui compte
//   (un visage...) : il reste dans l'image, et "Zoom sur un point"
//   zoome dessus.
// - Deux photos dans le même plan : écran partagé ou photo dans la
//   photo.
// (Les rushs ont aussi : image figée et rampe de vitesse, dans rushs.js.)
// ============================================================
(function(){
'use strict';
if(typeof MT === 'undefined' || typeof mtMaj !== 'function') return;
const MP = { focal: false };
window.MP = MP;
function mpClip(){ const n = MT.sel && MT.sel.n; return n != null && anVid().clips ? anVid().clips[n] : null; }
function mpAvant(){ if(typeof mtAvantPublic === 'function') mtAvantPublic(); }

window.mpPanneau = function(sg){
  const ph = CR.photos[sg.i] || {}, autres = CR.photos.filter(p => p.k !== sg.k && !p.video);
  const pills = (list, val, fn) => `<div class="ag-pills mt-pills">${list.map(([k, l]) => `<button type="button" class="${(val || '') === k ? 'on' : ''}" onclick="${fn}('${k}')">${l}</button>`).join('')}</div>`;
  return `<div class="mp">
    <label>Cadrage</label>${pills([['', 'Remplir l\'écran'], ['flou', 'Photo entière + fond flou'], ['bandes', 'Photo entière + bandes']], sg.cadre, 'mpCadre')}
    <label>Point important ${sg.focal ? `<span class="mp-ok">choisi</span>` : ''}</label>
    <div class="mt-act"><button type="button" class="${MP.focal ? 'on' : ''}" onclick="mpChoisirPoint()">${agIcon('target', 13)} ${MP.focal ? 'Touche l\'aperçu...' : 'Toucher l\'aperçu pour le choisir'}</button>${sg.focal ? `<button type="button" onclick="mpPoint(null)">Centre</button><button type="button" onclick="mtMvt('zoompoint')">Zoomer dessus</button>` : ''}</div>
    ${ph.video ? '' : `<label>Avec une 2e photo</label>${pills([['', 'Non'], ['duo', 'Écran partagé'], ['pip', 'Photo dans la photo']], sg.dispo, 'mpDispo')}
    ${sg.dispo && autres.length ? `<div class="mt-rps">${autres.slice(0, 30).map(p => `<button type="button" class="mt-rp ${sg.avec === p.k ? 'on' : ''}" onclick="mpAvec('${crE(p.k)}')"><img src="${crE(p.thumb || p.url || '')}" ${p.path && !p.thumb ? `data-mkp="${crE(p.path)}"` : ''} alt=""></button>`).join('')}</div>` : ''}
    ${sg.dispo && !autres.length ? '<div class="ag-hint">Ajoute d\'autres photos au montage pour en choisir une 2e.</div>' : ''}`}
  </div>`;
};
window.mpCadre = function(k){ mpAvant(); const c = mpClip(); if(!c) return; c.cadre = k || null; mtMaj(); };
window.mpDispo = function(k){
  mpAvant(); const c = mpClip(); if(!c) return; c.dispo = k || null;
  if(k && !c.avec){ const a = CR.photos.find(p => p.k !== c.k && !p.video); if(a) c.avec = a.k; }
  if(!k) c.avec = null;
  mtMaj();
};
window.mpAvec = function(k){ mpAvant(); const c = mpClip(); if(!c) return; c.avec = k; mtMaj(); };
window.mpPoint = function(f){ mpAvant(); const c = mpClip(); if(!c) return; c.focal = f; MP.focal = false; mtMaj(); };
window.mpChoisirPoint = function(){
  if(!mpClip()) return;
  MP.focal = !MP.focal;
  const cv = document.getElementById('anCanvas'); if(cv) cv.classList.toggle('mp-vise', MP.focal);
  if(MP.focal){ const sg = anPlan().segs[MT.sel.n]; if(sg){ anStop(); AN.t = sg.t0 + (sg.t1 - sg.t0) * 0.4; anApercuUneFois(); } agToast('Touche l\'aperçu à l\'endroit important (un visage, un détail)', 'info'); }
  mtMaj();
};
// Toucher l'aperçu : le point important du plan choisi
document.addEventListener('click', e => {
  if(!MP.focal) return;
  const cv = e.target && e.target.id === 'anCanvas' ? e.target : null; if(!cv) return;
  const r = cv.getBoundingClientRect();
  const f = { x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) };
  cv.classList.remove('mp-vise');
  mpPoint({ x: Math.round(f.x * 100) / 100, y: Math.round(f.y * 100) / 100 });
  agToast('Point important choisi');
}, true);

(function mpCss(){
  if(document.getElementById('mpCss')) return;
  const st = document.createElement('style'); st.id = 'mpCss';
  st.textContent = `.mp{margin:4px 0 2px}.mp-ok{font-size:11px;color:var(--accent);margin-left:6px}
#anCanvas.mp-vise{cursor:crosshair;outline:3px dashed var(--accent);outline-offset:-3px}`;
  document.head.appendChild(st);
})();
})();
