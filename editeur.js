// ============================================================
// EDITEUR.JS - L'écran de montage des Créations, rangé comme un
// vrai logiciel de montage
// ------------------------------------------------------------
// Ordinateur : plein écran
//   [ barre du haut : retour · nom · annuler/rétablir · Exporter ]
//   [ outils | aperçu + lecture | réglages de l'outil choisi ]
//   [ table de montage (timeline) en bas, toujours visible ]
// Téléphone : aperçu en haut, lecture, timeline juste dessous, puis
// une barre d'outils qui reste visible et le réglage choisi.
// Les réglages ne sont plus empilés : un outil = un panneau.
// Raccourcis (ordinateur) : Espace lecture, flèches image par image,
// Ctrl+Z / Ctrl+Y, S couper, Suppr supprimer le plan, Échap retour.
// Les blocs existants (textes, effets...) sont simplement déplacés.
// ============================================================
(function(){
'use strict';
if(typeof CR === 'undefined') return;

const ED_OUTILS = [
  { id: 'auto', nom: 'Montage auto', ic: 'sparkles' },
  { id: 'montage', nom: 'Montage', ic: 'scissors' },
  { id: 'musique', nom: 'Musique', ic: 'music' },
  { id: 'textes', nom: 'Textes', ic: 'note' },
  { id: 'police', nom: 'Police', ic: 'edit' },
  { id: 'effets', nom: 'Effets', ic: 'palette' },
  { id: 'mise', nom: 'Format', ic: 'settings' },
  { id: 'fin', nom: 'Générique', ic: 'star' },
  { id: 'couv', nom: 'Couverture', ic: 'image' },
  { id: 'pre', nom: 'Préréglages', ic: 'heart' },
  { id: 'export', nom: 'Exporter', ic: 'download' },
  { id: 'photos', nom: 'Photos', ic: 'camera' }
];
// Chaque bloc de réglages (titre du bloc) -> l'outil qui le montre
function edOutilDe(titre){
  const t = String(titre || '').trim();
  if(/^Exporter|^Qualité/.test(t)) return 'export';
  if(/^Musique/.test(t)) return 'musique';
  if(/^Durée et format|^Format/.test(t)) return 'mise';
  if(/^Textes/.test(t)) return 'textes';
  if(/^Police/.test(t)) return 'police';
  if(/^Effets/.test(t)) return 'effets';
  if(/^Générique/.test(t)) return 'fin';
  if(/^Image de couverture/.test(t)) return 'couv';
  if(/préréglages|styles/i.test(t)) return 'pre';
  return 'mise';
}
function edVideo(){ return typeof anEst === 'function' && anEst(CR.modele); }
function edDesk(){ return window.matchMedia('(min-width:900px)').matches; }

// ---------- Transformation de l'écran après chaque affichage ----------
function edMonter(){
  if(window.ED_OFF) return;   // (tests de l'ancienne disposition)
  const body = crBody(); if(!body) return;
  const edit = body.querySelector('.cr-edit'); if(!edit || body.querySelector('.ed')) return;
  const zone = edit.querySelector('.cr-prev-zone'), pan = edit.querySelector('.cr-panneau'); if(!zone || !pan) return;
  const video = edVideo(), M = crModele() || {};
  document.body.classList.add('ed-ouvert');
  const ed = document.createElement('div'); ed.className = 'ed' + (video ? ' ed-video' : '');
  ed.innerHTML = `<div class="ed-barre"><div class="ed-g"></div><div class="ed-nom"><b>${crE(M.nom || 'Création')}</b><span id="edInfo"></span></div>
      <div class="ed-d">${video ? `<button type="button" class="ed-ic" onclick="mtAnnuler&&mtAnnuler()" title="Annuler (Ctrl+Z)">${agIcon('history', 17)}</button>` : ''}
      <button type="button" class="ed-exp" onclick="edOutil('export')">${agIcon('download', 16)} <span>Exporter</span></button></div></div>
    <div class="ed-main"><nav class="ed-outils" id="edOutils"></nav><div class="ed-scene" id="edScene"></div><aside class="ed-insp" id="edInsp"><div class="ed-insp-t" id="edInspT"></div><div id="edInspC"></div></aside></div>
    <div class="ed-piste" id="edPiste"></div>`;
  // Barre : bouton retour (avec "Brouillon gardé")
  const back = body.querySelector('.ag-back'); if(back){ const mq = body.querySelector('#brMarque'); ed.querySelector('.ed-g').appendChild(back); if(mq) ed.querySelector('.ed-g').appendChild(mq); }
  // Aperçu au centre (et le bandeau "Aperçu au hasard")
  const scene = ed.querySelector('#edScene');
  const ex = body.querySelector('.br-exemple'); if(ex) scene.appendChild(ex);
  const mts = zone.querySelector('#mtsZone'), mt = zone.querySelector('#mtZone');
  scene.appendChild(zone);
  // Panneaux : un par outil
  const C = ed.querySelector('#edInspC'), presents = new Set();
  const panneau = id => { let p = C.querySelector(`.ed-p[data-o="${id}"]`); if(!p){ p = document.createElement('div'); p.className = 'ed-p'; p.dataset.o = id; C.appendChild(p); } presents.add(id); return p; };
  if(mts){ panneau('auto').appendChild(mts); }
  if(mt){ ed.querySelector('#edPiste').appendChild(mt); const p = panneau('montage'); const hote = document.createElement('div'); hote.id = 'mtPanHote'; p.appendChild(hote); }
  let dernier = null;
  [...pan.children].forEach(el => {
    if(el.tagName === 'DETAILS'){
      const sum = el.querySelector('summary'), titre = sum ? sum.textContent.trim() : '';
      if(/^Exporter/.test(titre) && !video){}
      const id = edOutilDe(titre), p = panneau(id);
      const sec = document.createElement('section'); sec.className = 'ed-sec';
      const n = p.querySelectorAll('.ed-sec').length;
      sec.innerHTML = `<h4 ${n === 0 ? 'class="prem"' : ''}>${crE(titre.replace(/\s*\d+$/, ''))}</h4>`;
      [...el.childNodes].forEach(c => { if(c !== sum) sec.appendChild(c); });
      if(el.getAttribute('ontoggle')) sec.dataset.ouvre = el.getAttribute('ontoggle');
      p.appendChild(sec); dernier = p;
    } else if(el.matches && el.matches('.btn-ghost') && /Changer les photos/.test(el.textContent)){ /* outil Photos */ }
    else if(dernier) dernier.appendChild(el);
    else panneau('export').appendChild(el);
  });
  // Les réglages de l'image fixe (zoom, photo à déplacer, pages) vont avec le format
  ['.cr-phsel', '.cr-zoom'].forEach(s => { const x = zone.querySelector(s); if(x) panneau('mise').insertBefore(x, panneau('mise').firstChild); });
  if(!video) ED_OUTILS.find(o => o.id === 'mise').nom = 'Mise en page'; else ED_OUTILS.find(o => o.id === 'mise').nom = 'Format';
  // Barre d'outils
  const outils = ED_OUTILS.filter(o => o.id === 'photos' || presents.has(o.id) || (o.id === 'montage' && video));
  if(video && !mt){ const p = panneau('montage'); p.innerHTML = `<div class="mts-info">${agIcon('info', 15)}<div><b>Table de montage</b> (cuts, durées, transitions photo par photo) : disponible en Diaporama doux, Rythmé, Glisse et Titre animé.<div class="mt-act"><button type="button" onclick="mtsVers('v-diapo')">Passer en Diaporama doux</button><button type="button" onclick="mtsVers('v-dyn')">Passer en Rythmé</button></div></div></div>`; }
  ed.querySelector('#edOutils').innerHTML = outils.map(o => `<button type="button" data-o="${o.id}" onclick="edOutil('${o.id}')">${agIcon(o.ic, 19)}<span>${o.nom}</span></button>`).join('');
  edit.remove();
  edPortail().appendChild(ed);
  if(!mt) ed.classList.add('sans-piste');
  // Outil affiché : celui d'avant, sinon Montage auto (vidéo) ou Textes (image)
  const dispo = outils.map(o => o.id);
  if(!CR.edOutil || !dispo.includes(CR.edOutil) || CR.edOutil === 'photos') CR.edOutil = video ? (dispo.includes('auto') ? 'auto' : 'musique') : (dispo.includes('textes') ? 'textes' : dispo[0]);
  edOutil(CR.edOutil, true);
  edApresMt();
  edTaille(); setTimeout(edTaille, 60); setTimeout(edTaille, 400);
  edInfo();
}
window.edOutil = function(id, silencieux){
  if(id === 'photos'){ if(typeof anStop === 'function') anStop(); CR.vue = 'photos'; crRender(); window.scrollTo({ top: 0 }); return; }
  CR.edOutil = id;
  document.querySelectorAll('#edOutils button').forEach(b => b.classList.toggle('on', b.dataset.o === id));
  document.querySelectorAll('#edInspC .ed-p').forEach(p => { p.style.display = p.dataset.o === id ? '' : 'none'; });
  const o = ED_OUTILS.find(x => x.id === id), t = document.getElementById('edInspT');
  if(t) t.innerHTML = `${agIcon(o ? o.ic : 'settings', 16)}<b>${o ? o.nom : ''}</b>${id === 'montage' && typeof MT !== 'undefined' && MT.sel ? `<span>${MT.sel.t === 'c' ? 'Plan ' + (MT.sel.n + 1) : 'Transition ' + (MT.sel.n + 1) + ' → ' + (MT.sel.n + 2)}</span>` : ''}`;
  // Blocs qui se préparent à l'ouverture (la couverture)
  document.querySelectorAll(`#edInspC .ed-p[data-o="${id}"] .ed-sec[data-ouvre]`).forEach(() => { if(id === 'couv' && typeof cvRendu === 'function') cvRendu(); });
  const b = document.querySelector(`#edOutils button[data-o="${id}"]`); if(b && !silencieux) b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const insp = document.getElementById('edInsp'); if(insp && !silencieux) insp.scrollTop = 0;
  if(!silencieux && !edDesk()){ const ins = document.getElementById('edInsp'), po = document.getElementById('edPortail'), ou = document.getElementById('edOutils'); if(ins && po && ou){ const y = ins.offsetTop - ou.offsetHeight - 16; if(po.scrollTop > y || ins.getBoundingClientRect().top > window.innerHeight * 0.8) po.scrollTo({ top: Math.max(0, y), behavior: 'smooth' }); } }
};
// La table de montage vient d'être redessinée : son panneau (plan, transition, réglages pour tous) va dans l'outil Montage
window.edApresMt = function(){
  const hote = document.getElementById('mtPanHote'); if(!hote) return;
  const p = document.querySelector('#mtZone .mt-pan'); if(p){ hote.innerHTML = ''; hote.appendChild(p); if(typeof mkHydrate === 'function') mkHydrate(hote); }
  if(typeof MT !== 'undefined' && MT.sel && CR.edOutil !== 'montage') edOutil('montage', true);
  else if(CR.edOutil === 'montage') edOutil('montage', true);
  edInfo();
};
function edInfo(){
  const el = document.getElementById('edInfo'); if(!el) return;
  if(edVideo() && typeof anPlan === 'function'){ const p = AN.plan || anPlan(); el.textContent = `${CR.photos.length} élément${CR.photos.length > 1 ? 's' : ''} · ${typeof anMinSec === 'function' ? anMinSec(p.D) : Math.round(p.D) + ' s'}${anVid().style && typeof MTS_STYLES !== 'undefined' ? ' · ' + ((MTS_STYLES.find(x => x.id === anVid().style) || {}).nom || '') : ''}`; }
  else el.textContent = `${CR.photos.length} photo${CR.photos.length > 1 ? 's' : ''} · ${(CR_FMT[CR.fmt] || {}).nom || ''}`;
}
// Taille de l'aperçu : la plus grande possible dans la place disponible
function edTaille(){
  const sc = document.getElementById('edScene'); if(!sc) return;
  const prev = sc.querySelector('.cr-prev'), cv = prev && prev.querySelector('canvas'); if(!prev || !cv) return;
  const r = cv.width / cv.height;
  let wMax, hMax;
  if(edDesk()){
    const autres = [...sc.querySelector('.cr-prev-zone').children].filter(x => x !== prev).reduce((a, x) => a + x.offsetHeight + 8, 0) + (sc.querySelector('.br-exemple') ? sc.querySelector('.br-exemple').offsetHeight + 8 : 0);
    wMax = sc.clientWidth - 24; hMax = sc.clientHeight - autres - 24;
  } else { wMax = sc.clientWidth - 8; hMax = window.innerHeight * 0.44; }
  let w = wMax, h = w / r; if(h > hMax){ h = Math.max(140, hMax); w = h * r; }
  prev.style.width = Math.round(w) + 'px'; prev.style.height = Math.round(h) + 'px'; prev.style.maxWidth = 'none'; prev.style.margin = '0 auto';
}
window.addEventListener('resize', () => { clearTimeout(edTaille.t); edTaille.t = setTimeout(edTaille, 120); });

// ---------- Chaque affichage passe par ici ----------
// L'écran de montage s'ouvre par-dessus toute l'app (comme un logiciel)
function edPortail(){ let p = document.getElementById('edPortail'); if(!p){ p = document.createElement('div'); p.id = 'edPortail'; document.body.appendChild(p); } return p; }
function edFermer(){ const p = document.getElementById('edPortail'); if(p) p.innerHTML = ''; document.body.classList.remove('ed-ouvert'); }
window.edFermer = edFermer;
const renderEd = crRender;
crRender = async function(){
  const insp = document.getElementById('edInsp'), haut = insp ? insp.scrollTop : 0, port = document.getElementById('edPortail'), yP = port ? port.scrollTop : 0;
  // L'ancien écran est retiré avant de dessiner le nouveau (pas de doublons)
  const p = document.getElementById('edPortail'); if(p) p.innerHTML = '';
  const r = await renderEd.apply(this, arguments);
  if(CR.vue === 'edit'){ edMonter(); const i2 = document.getElementById('edInsp'); if(i2 && haut) i2.scrollTop = haut; if(yP) edPortail().scrollTop = yP; }
  else edFermer();
  return r;
};
// Quitter l'onglet Créations : l'écran plein se ferme
if(typeof showTab === 'function'){ const st = showTab; showTab = function(name){ if(name !== 'creations'){ if(typeof anStop === 'function') try { anStop(); } catch(e){} edFermer(); } return st.apply(this, arguments); }; }

// ---------- Raccourcis clavier (ordinateur) ----------
document.addEventListener('keydown', e => {
  if(!document.body.classList.contains('ed-ouvert') || CR.vue !== 'edit') return;
  const t = e.target, tag = (t && t.tagName) || '';
  if(/INPUT|TEXTAREA|SELECT/.test(tag) || (t && t.isContentEditable) || document.querySelector('.ag-dlg-bg')) return;
  const video = edVideo();
  if(e.key === ' ' && video){ e.preventDefault(); anLecture(); }
  else if((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && video){ e.preventDefault(); anStop(); const pas = e.shiftKey ? 1 : 1 / 30; const D = (AN.plan || anPlan()).D; anAller(Math.max(0, Math.min(D, AN.t + (e.key === 'ArrowLeft' ? -pas : pas)))); }
  else if((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && video && typeof mtAnnuler === 'function'){ e.preventDefault(); mtAnnuler(e.shiftKey); }
  else if((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y') && video && typeof mtAnnuler === 'function'){ e.preventDefault(); mtAnnuler(true); }
  else if((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey && video && typeof MT !== 'undefined' && MT.sel && MT.sel.t === 'c'){ e.preventDefault(); mtCouper(); }
  else if((e.key === 'Delete' || e.key === 'Backspace') && video && typeof MT !== 'undefined' && MT.sel && MT.sel.t === 'c'){ e.preventDefault(); mtSupprimer(); }
  else if(e.key === 'Escape'){ if(typeof MT !== 'undefined' && MT.sel){ mtChoisir(null); } }
});

(function edCss(){
  if(document.getElementById('edCss')) return;
  const st = document.createElement('style'); st.id = 'edCss';
  st.textContent = `
#edPortail{display:none}
body.ed-ouvert #edPortail{display:block;position:fixed;inset:0;z-index:150;background:var(--bg);overflow-y:auto;overscroll-behavior:contain;padding:10px 10px calc(16px + env(safe-area-inset-bottom));padding-top:calc(10px + env(safe-area-inset-top))}
.ed{display:flex;flex-direction:column;gap:10px;max-width:1700px;margin:0 auto}
.ed-barre{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:14px;background:var(--card);border:1px solid var(--border)}
.ed-g{display:flex;align-items:center;gap:6px;min-width:0}.ed-g .ag-back{margin:0}
.ed-nom{flex:1;min-width:0;text-align:center}.ed-nom b{display:block;font-size:14px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ed-nom span{display:block;font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ed-d{display:flex;align-items:center;gap:6px}
.ed-ic{width:36px;height:36px;margin:0;padding:0;border-radius:10px;border:1px solid var(--border);background:var(--card2);color:var(--text);display:flex;align-items:center;justify-content:center;cursor:pointer;transform:scaleX(-1)}
.ed-exp{display:flex;align-items:center;gap:6px;width:auto;margin:0;padding:9px 14px;border-radius:12px;border:0;background:var(--accent);color:#fff;font-weight:700;font-size:13px;cursor:pointer}
.ed-main{display:flex;flex-direction:column;gap:10px}
.ed-outils{display:flex;gap:4px;overflow-x:auto;padding:6px;border-radius:14px;background:var(--card);border:1px solid var(--border);scrollbar-width:none;position:sticky;top:0;z-index:6}
.ed-outils::-webkit-scrollbar{display:none}
.ed-outils button{flex:none;display:flex;flex-direction:column;align-items:center;gap:3px;width:72px;margin:0;padding:7px 2px;border-radius:11px;border:0;background:transparent;color:var(--muted);font-size:10.5px;font-weight:600;cursor:pointer}
.ed-outils button.on{background:color-mix(in srgb,var(--accent) 18%,transparent);color:var(--text)}
.ed-outils button.on svg{color:var(--accent)}
.ed-scene{display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px;border-radius:16px;background:var(--card);border:1px solid var(--border);min-width:0}
.ed-scene .cr-prev-zone{width:100%;position:static}
.ed-scene .br-exemple{width:100%;box-sizing:border-box;margin:0}
.ed-insp{padding:12px;border-radius:16px;background:var(--card);border:1px solid var(--border);min-width:0}
.ed-insp-t{display:flex;align-items:center;gap:8px;margin-bottom:8px;color:var(--accent)}.ed-insp-t b{color:var(--text);font-size:14.5px}.ed-insp-t span{margin-left:auto;font-size:12px;color:var(--muted)}
.ed-sec h4{margin:16px 0 8px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:700}.ed-sec h4.prem{margin-top:4px}
.ed-p .mts,.ed-p .mt-pan{margin:0;border:0;padding:0;background:transparent}
.ed-p .mts-tete b{display:none}.ed-p .mts-tete span{text-align:left}
.ed-piste .mt{margin:0}
.ed-piste{order:2}
.ed-main{order:1}
body.ed-ouvert .ot-backtop{display:none !important}
@media(max-width:899px){
  .ed{gap:8px}.ed-main{display:contents}.ed-scene{order:1}.ed-piste{order:2}.ed-outils{order:3}.ed-insp{order:4;min-height:60vh}
  .ed-barre{order:0}.ed-exp span{display:none}
}
@media(min-width:900px){
  body.ed-ouvert #edPortail{overflow:hidden;padding:12px 14px}
  #edPortail > .ed{height:100%}
  .ed-main{flex:1;min-height:0;display:grid;grid-template-columns:84px minmax(0,1fr) minmax(330px,400px);gap:10px}
  .ed-outils{position:static;flex-direction:column;overflow-x:hidden;overflow-y:auto;padding:6px 4px}
  .ed-outils button{width:auto;padding:6px 2px;gap:2px;font-size:10px}
  .ed-outils button svg{width:17px;height:17px}
  .ed-scene{min-height:0;justify-content:center;overflow:hidden}
  .ed-insp{min-height:0;overflow-y:auto}
  .ed-piste{flex:none;max-height:42vh;overflow-y:auto;border-radius:16px}
  .ed.sans-piste .ed-piste{display:none}
  .ed-scene .cr-fmtnom{display:none}
}`;
  document.head.appendChild(st);
})();
})();
