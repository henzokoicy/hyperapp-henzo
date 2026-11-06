// montage-pro.js — version 1
// ============================================================
// MONTAGE-PRO.JS - Lot A : couper vite, contrôles de lecture,
// raccourcis clavier (écran de montage des Créations)
// ------------------------------------------------------------
// - Disposition : aperçu en haut, lecteur + barre d'outils collés sous
//   l'aperçu, table de montage en bas. Sur téléphone, plus rien ne
//   défile : les réglages s'ouvrent dans un tiroir par-dessus.
// - COUPER toujours visible : coupe à la tête de lecture.
// - Lame : un clic sur un plan le coupe à cet endroit.
// - Supprimer (laisse un vide noir, les autres plans ne bougent pas)
//   et Supprimer + fermer le trou (les plans suivants recollent).
// - Annuler / rétablir (300 actions), boutons + raccourcis.
// - Raccourcis clavier modifiables (écran d'aide).
// - Lecteur : lecture/pause, image par image, timecode, volume.
// - Téléphone : trait fixe au centre (la piste défile dessous) +
//   bouton Couper, et appui long sur un plan pour le couper là.
// Tout est ajouté par enveloppes : montage.js, editeur.js... restent tels quels.
// Utilise montage.js, editeur.js, animations.js, rythme.js, musique-libre.js.
// ============================================================
(function(){
'use strict';
if(typeof CR === 'undefined' || typeof AN === 'undefined' || typeof MT === 'undefined' || typeof mtMaj !== 'function' || typeof edOutil !== 'function') return;

const MPX = { lame: false, vol: 1, muet: false, progX: -1, userScroll: 0, clic: null, bloqueClic: 0, appui: null, tiroir: false };
window.MPX = MPX;
const MPX_HIST = 300;   // nombre d'actions gardées pour Annuler
const VIDE = '__vide';

// ---------- Préférences de cet appareil (volume, raccourcis) ----------
function lsGet(k, d){ try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch(e){ return d; } }
function lsSet(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
(function(){ const v = lsGet('mpx.volume', null); if(v){ MPX.vol = Math.max(0, Math.min(1, Number(v.vol) || 0)); MPX.muet = !!v.muet; } })();

// ---------- Icônes en plus (agIcon) ----------
if(typeof AG_ICONS !== 'undefined'){
  const I = {
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
    blade: '<path d="M12 3v18"/><path d="M8 7l4-4 4 4"/><rect x="3" y="10" width="7" height="6" rx="1"/><rect x="14" y="10" width="7" height="6" rx="1"/>',
    deleteGap: '<rect x="3" y="8" width="5" height="8" rx="1"/><rect x="16" y="8" width="5" height="8" rx="1"/><path d="M10 10l4 4M14 10l-4 4"/>',
    ripple: '<rect x="3" y="8" width="5" height="8" rx="1"/><rect x="10" y="8" width="5" height="8" rx="1"/><path d="M21 12h-4M19 10l-2 2 2 2"/>',
    frameBack: '<path d="M6 5v14"/><path d="M18 6 10 12l8 6z"/>',
    frameFwd: '<path d="M18 5v14"/><path d="M6 6l8 6-8 6z"/>',
    volume: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
    volumeOff: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="m17 9 5 6M22 9l-5 6"/>',
    keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    dup: '<rect x="3" y="7" width="8" height="10" rx="1"/><rect x="13" y="7" width="8" height="10" rx="1"/><path d="M17 3v3M15.5 4.5h3"/>',
    clipSet: '<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 12h4M14 10v4"/>'
  };
  Object.keys(I).forEach(k => { if(!AG_ICONS[k]) AG_ICONS[k] = I[k]; });
}
const ic = (n, s) => agIcon(n, s || 18);

// ---------- Utilitaires ----------
function mobile(){ return !window.matchMedia('(min-width:900px)').matches; }
function actif(){ return document.body.classList.contains('ed-ouvert') && CR.vue === 'edit' && !!document.querySelector('.ed.mpx') && !!document.getElementById('mtPiste'); }
function planNow(){ AN.plan = anPlan(); return AN.plan; }
function fps(){ return anVid().fps === 60 ? 60 : 30; }
function estVide(c){ return !!(c && (c.vide || c.k === VIDE)); }
function segA(plan, t){ const S = plan.segs; for(let k = 0; k < S.length; k++) if(t >= S[k].t0 && t < S[k].t1) return k; return -1; }
function tc(t){ const f = fps(); t = Math.max(0, t || 0); const fr = Math.round(t * f), s = Math.floor(fr / f), ff = fr % f; return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}:${String(ff).padStart(2, '0')}`; }
function vibre(ms){ try { if(navigator.vibrate) navigator.vibrate(ms || 12); } catch(e){} }

// ============================================================
// 1. LES VIDES (suppression classique : les autres plans ne bougent pas)
// ------------------------------------------------------------
// Un vide est un plan noir { k: '__vide', vide: true, d }. montage.js ne
// le connaît pas : on le met de côté le temps de calculer le plan, puis
// on le remet à sa place (les temps des plans suivants restent les mêmes).
// ============================================================
const planBase = anPlan;
anPlan = function(){
  const V = anVid();
  if(!V.clips || !V.clips.some(estVide) || typeof mtEstSeq !== 'function' || !mtEstSeq(CR.modele)) return planBase.apply(this, arguments);
  const tous = V.clips, vrais = tous.filter(c => !estVide(c));
  if(!vrais.length){ V.clips = null; return planBase.apply(this, arguments); }
  V.clips = vrais;
  const p = planBase.apply(this, arguments);
  // montage.js a pu retirer (photo disparue) ou ajouter (nouvelle photo) des plans
  const gardes = new Set(V.clips), segDe = new Map(V.clips.map((c, j) => [c, p.segs[j]]));
  const L = []; tous.forEach(c => { if(estVide(c) || gardes.has(c)) L.push(c); });
  V.clips.forEach(c => { if(!L.includes(c)) L.push(c); });
  while(L.length && estVide(L[L.length - 1])) L.pop();          // pas de vide tout à la fin
  while(L.length && estVide(L[0]) && L.length === 1) L.pop();
  V.clips = L;
  let t = 0;
  const segs = L.map((c, n) => {
    const sg = estVide(c) ? { i: -1, k: VIDE, vide: true, mvt: 'aucun', tr: 'coupe', trD: 0 } : Object.assign({}, segDe.get(c));
    sg.t0 = t; sg.t1 = t + c.d; sg.n = n; t += c.d; return sg;
  });
  const Dp = Math.max(0.5, t), D = Dp + (p.finD || 0);
  V.duree = Math.round(D * 10) / 10;
  return Object.assign(p, { segs, Dp, D });
};
// Un vide se dessine en noir (pas d'image)
if(typeof rvPour === 'function'){ const rvBase = rvPour; window.rvPour = function(sg){ if(sg && sg.vide) return null; return rvBase.apply(this, arguments); }; }
// Photos qui ne sont plus dans aucun plan : retirées (sinon montage.js les remettrait à la fin)
function nettoyer(){
  const V = anVid(); if(!V.clips) return;
  const pris = new Set(V.clips.map(c => c.k));
  for(let i = CR.photos.length - 1; i >= 0; i--) if(!pris.has(CR.photos[i].k)){ CR.photos.splice(i, 1); CR.crop.splice(i, 1); }
}

// ============================================================
// 2. ANNULER / RÉTABLIR : 300 actions au lieu de 60
// ============================================================
function histo(a){
  if(Array.isArray(a) && !a.mpxH){
    Object.defineProperty(a, 'shift', { value: function(){ return this.length > MPX_HIST ? Array.prototype.shift.call(this) : undefined; }, configurable: true, writable: true });
    Object.defineProperty(a, 'mpxH', { value: true });
  }
  return a;
}
(function(){ let u = histo(MT.undo); try { Object.defineProperty(MT, 'undo', { get(){ return u; }, set(v){ u = histo(v); }, enumerable: true, configurable: true }); } catch(e){} })();
window.mpxAnnuler = function(){ if(!MT.undo.length){ agToast('Rien à annuler', 'info'); return; } anStop(); mtAnnuler(); agToast('Annulé'); };
window.mpxRetablir = function(){ if(!MT.redo.length){ agToast('Rien à rétablir', 'info'); return; } anStop(); mtAnnuler(true); agToast('Rétabli'); };

// ============================================================
// 3. COUPER, LAME, SUPPRIMER
// ============================================================
// Coupe le plan qui est sous le temps t, exactement à t
function couperA(t, sansBouger){
  const plan = planNow();
  if(t >= plan.Dp - 0.001){ agToast('La tête de lecture est sur la carte de fin : rien à couper', 'info'); return false; }
  const k = segA(plan, t); if(k < 0) return false;
  const sg = plan.segs[k];
  if(sg.vide){ agToast('Ici c\'est un vide : rien à couper', 'info'); return false; }
  if(t - sg.t0 <= 0.2 || sg.t1 - t <= 0.2){ agToast('Trop près d\'une coupe (moins de 0,2 s)', 'info'); return false; }
  const avant = AN.t;
  anStop(); MT.sel = { t: 'c', n: k }; AN.t = t;
  mtCouper();
  if(sansBouger){ AN.t = avant; anApercuUneFois(); }
  vibre(15);
  return true;
}
window.mpxCouper = function(){ if(!actif()) return; couperA(AN.t); };
window.mpxLame = function(on){
  MPX.lame = on == null ? !MPX.lame : !!on;
  const ed = document.querySelector('.ed.mpx'); if(ed) ed.classList.toggle('mpx-lame-on', MPX.lame);
  majBarre();
  agToast(MPX.lame ? (mobile() ? 'Lame : touche un plan pour le couper à cet endroit' : 'Lame : clique sur un plan pour le couper à cet endroit (Échap pour finir)') : 'Lame rangée', 'info');
};
// Le plan visé : celui choisi, sinon celui sous la tête de lecture
function cible(){
  const plan = planNow();
  if(MT.sel && MT.sel.t === 'c' && plan.segs[MT.sel.n]) return MT.sel.n;
  const k = segA(plan, Math.min(AN.t, plan.Dp - 0.001)); return k;
}
window.mpxSupprimer = function(ripple){
  if(!actif()) return;
  const n = cible(); if(n < 0){ agToast('Choisis d\'abord un plan', 'info'); return; }
  const V = anVid(), plan = planNow(), sg = plan.segs[n];
  const reels = (V.clips || plan.segs).filter(c => !estVide(c)).length;
  if(!sg.vide && reels <= 1){ agToast('Il faut garder au moins un plan', 'info'); return; }
  anStop();
  if(sg.vide){                                     // un vide : on le ferme
    mtAvantPublic(); V.clips.splice(n, 1); MT.sel = null; agToast('Vide fermé'); mtMaj(); return;
  }
  if(ripple){
    MT.sel = { t: 'c', n }; mtSupprimer(); agToast('Plan supprimé, le trou est fermé'); return;
  }
  mtAvantPublic();
  const L = V.clips, c = L[n];
  if(n === L.length - 1){ L.splice(n, 1); MT.sel = null; }
  else {
    let d = c.d, at = n;
    const g = { k: VIDE, vide: true, d: 0, tr: 'coupe', trD: 0 };
    L.splice(n, 1, g);
    if(at + 1 < L.length && estVide(L[at + 1])){ d += L[at + 1].d; L.splice(at + 1, 1); }
    if(at > 0 && estVide(L[at - 1])){ d += L[at - 1].d; L.splice(at - 1, 1); at--; }
    L[at].d = Math.round(d * 100) / 100;
    MT.sel = { t: 'c', n: at };
  }
  nettoyer();
  agToast('Plan supprimé : les autres n\'ont pas bougé');
  mtMaj(true);
};
window.mpxDupliquer = function(){
  if(!actif()) return;
  const n = cible(), plan = planNow(); if(n < 0 || !plan.segs[n] || plan.segs[n].vide){ agToast('Choisis d\'abord un plan', 'info'); return; }
  anStop(); MT.sel = { t: 'c', n }; mtDupliquer(); agToast('Plan dupliqué');
};

// ============================================================
// 4. LECTEUR : image par image, aller aux coupes, volume
// ============================================================
window.mpxImage = function(d){ anStop(); const f = fps(), D = planNow().D; anAller(Math.max(0, Math.min(D, (Math.round(AN.t * f) + d) / f))); };
window.mpxSec = function(d){ anStop(); const D = planNow().D; anAller(Math.max(0, Math.min(D, AN.t + d))); };
window.mpxBout = function(fin){ anStop(); anAller(fin ? planNow().D : 0); };
window.mpxCoupe = function(d){
  anStop(); const p = planNow(), B = [0].concat(p.segs.map(s => s.t1)).concat([p.D]);
  const t = d > 0 ? B.find(x => x > AN.t + 0.01) : B.slice().reverse().find(x => x < AN.t - 0.01);
  anAller(t == null ? (d > 0 ? p.D : 0) : t);
};
function volumeEffectif(){ return MPX.muet ? 0 : MPX.vol; }
function appliquerVolume(creer){
  const V = anVid();
  if(AN.audio) AN.audio.volume = Math.max(0, Math.min(1, (V.volume == null ? 0.9 : V.volume) * volumeEffectif()));
  // Bruitages (musique-libre.js) : ils passent par une sortie générale qu'on règle ici
  if(typeof ML !== 'undefined'){
    if(!ML.ctx && creer){ try { ML.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){} }
    const c = ML.ctx;
    if(c && !c.mpxSortie){
      try { const vraie = c.destination, g = c.createGain(); g.connect(vraie); Object.defineProperty(c, 'destination', { value: g, configurable: true }); c.mpxSortie = g; } catch(e){}
    }
    if(c && c.mpxSortie) c.mpxSortie.gain.value = volumeEffectif();
  }
}
window.mpxVolume = function(v){ MPX.vol = Math.max(0, Math.min(1, Number(v))); MPX.muet = MPX.vol === 0; lsSet('mpx.volume', { vol: MPX.vol, muet: MPX.muet }); appliquerVolume(); majVolume(); };
window.mpxMuet = function(){ MPX.muet = !MPX.muet; if(!MPX.muet && MPX.vol === 0) MPX.vol = 0.8; lsSet('mpx.volume', { vol: MPX.vol, muet: MPX.muet }); appliquerVolume(); majVolume(); };
function majVolume(){
  const b = document.getElementById('mpxMuet'); if(b){ b.innerHTML = ic(volumeEffectif() ? 'volume' : 'volumeOff', 18); b.title = volumeEffectif() ? 'Couper le son de l\'aperçu' : 'Remettre le son'; b.classList.toggle('on', !volumeEffectif()); }
  const r = document.getElementById('mpxVol'); if(r && document.activeElement !== r) r.value = MPX.muet ? 0 : MPX.vol;
}
const lectureBase = anLecture;
anLecture = function(){
  if(typeof ML !== 'undefined') appliquerVolume(true);
  const r = lectureBase.apply(this, arguments);
  appliquerVolume(); majPlay();
  return r;
};
const stopBase = anStop;
anStop = function(){ const r = stopBase.apply(this, arguments); majPlay(); return r; };
function majPlay(){ const b = document.getElementById('mpxPlay'); if(b){ b.innerHTML = ic(AN.lecture ? 'pause' : 'play', 22); b.title = AN.lecture ? 'Pause' : 'Lecture'; } }

// À chaque image affichée : timecode + piste qui suit (trait fixe au centre)
const apercuBase = anApercuUneFois;
anApercuUneFois = function(){
  const r = apercuBase.apply(this, arguments);
  try {
    const el = document.getElementById('mpxTc');
    if(el && AN.plan){ el.firstChild.textContent = tc(AN.t); el.lastChild.textContent = ' / ' + tc(AN.plan.D); }
    if(centreActif() && Date.now() - MPX.userScroll > 180) centrerPiste();
  } catch(e){}
  return r;
};

// ============================================================
// 5. LA PISTE : temps <-> position, règle, trait au centre, lame
// ============================================================
function wrap(){ return document.querySelector('#mtZone .mt-piste-w'); }
function centreActif(){ return mobile() && actif(); }
function clipsEls(){ const p = document.getElementById('mtPiste'); return p ? [...p.querySelectorAll('.mt-clip[data-n]')] : []; }
function tVersX(t){
  const plan = AN.plan || planNow(), els = clipsEls(); if(!els.length) return 0;
  const tt = Math.min(t, plan.Dp);
  let k = segA(plan, tt); if(k < 0) k = tt <= 0 ? 0 : plan.segs.length - 1;
  const el = els[k], sg = plan.segs[k]; if(!el || !sg) return 0;
  return el.offsetLeft + el.offsetWidth * Math.max(0, Math.min(1, (tt - sg.t0) / Math.max(0.01, sg.t1 - sg.t0)));
}
function xVersT(x){
  const plan = AN.plan || planNow(), els = clipsEls(); if(!els.length) return 0;
  if(x <= els[0].offsetLeft) return 0;
  for(let k = 0; k < els.length; k++){
    const el = els[k], sg = plan.segs[k]; if(!sg) break;
    const a = el.offsetLeft, b = a + el.offsetWidth;
    if(x >= a && x <= b) return sg.t0 + (sg.t1 - sg.t0) * (x - a) / Math.max(1, el.offsetWidth);
    const nx = els[k + 1]; if(nx && x > b && x < nx.offsetLeft) return sg.t1;
  }
  return plan.Dp;
}
function tDuClip(el, clientX){
  const plan = AN.plan || planNow(), n = Number(el.dataset.n), sg = plan.segs[n]; if(!sg) return null;
  const r = el.getBoundingClientRect(), f = Math.max(0, Math.min(1, (clientX - r.left) / Math.max(1, r.width)));
  return { n, t: sg.t0 + (sg.t1 - sg.t0) * f, f, sg };
}
function centrerPiste(){
  const w = wrap(); if(!w) return;
  const x = Math.round(tVersX(AN.t) - w.clientWidth / 2);
  if(Math.abs(w.scrollLeft - x) < 1) return;
  MPX.progX = x; w.scrollLeft = x; MPX.progX = w.scrollLeft;
}
// Règle du temps au-dessus des plans (cliquer / glisser = déplacer la tête de lecture)
function regleHtml(){
  const plan = AN.plan || planNow(); let h = '';
  const pas = plan.Dp > 120 ? 10 : plan.Dp > 40 ? 5 : plan.Dp > 15 ? 2 : 1;
  for(let s = 0; s <= plan.Dp + 0.001; s += 1){
    const x = tVersX(s), lab = s % pas === 0;
    h += `<i style="left:${x.toFixed(1)}px" class="${lab ? 'g' : ''}"></i>${lab ? `<span style="left:${x.toFixed(1)}px${x < 14 ? ';transform:none' : ''}">${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}</span>` : ''}`;
  }
  return h;
}
function decorer(){
  if(!actif()) return;
  const piste = document.getElementById('mtPiste'), w = wrap(); if(!piste || !w) return;
  const plan = planNow();   // (mtMaj ne l'a pas encore recalculé)
  // Les vides
  clipsEls().forEach(el => { const sg = plan.segs[Number(el.dataset.n)]; if(sg && sg.vide && !el.classList.contains('mpx-vide')){ el.classList.add('mpx-vide'); el.innerHTML = `<span>Vide</span><b>${(sg.t1 - sg.t0).toFixed(1).replace('.', ',')} s</b>`; } });
  // Téléphone : la piste démarre et finit au milieu de l'écran
  if(mobile()){ const m = Math.round(w.clientWidth / 2) + 'px'; piste.style.paddingLeft = m; piste.style.paddingRight = m; }
  else { piste.style.paddingLeft = ''; piste.style.paddingRight = ''; }
  let rg = piste.querySelector('.mpx-regle'); if(!rg){ rg = document.createElement('div'); rg.className = 'mpx-regle'; piste.insertBefore(rg, piste.firstChild); }
  rg.innerHTML = regleHtml();
  let ln = piste.querySelector('.mpx-lame-l'); if(!ln){ ln = document.createElement('i'); ln.className = 'mpx-lame-l'; piste.appendChild(ln); }
  const z = document.getElementById('mtZone');
  if(z && !z.querySelector('.mpx-centre')){ const c = document.createElement('i'); c.className = 'mpx-centre'; z.appendChild(c); }
  placerCentre();
  if(!w.mpxBranche){ w.mpxBranche = true; brancherWrap(w); }
  if(centreActif()) centrerPiste();
  else { const l = document.getElementById('mtTeteL'); if(l) l.style.left = tVersX(AN.t) + 'px'; }
}
function placerCentre(){
  const z = document.getElementById('mtZone'), w = wrap(), c = z && z.querySelector('.mpx-centre'); if(!c || !w) return;
  c.style.left = (w.offsetLeft + w.clientWidth / 2 - 1) + 'px'; c.style.top = (w.offsetTop) + 'px'; c.style.height = Math.max(40, w.clientHeight - 6) + 'px';
}
function brancherWrap(w){
  // Téléphone : faire défiler la piste déplace la tête de lecture (trait fixe au centre)
  let raf = 0;
  w.addEventListener('scroll', () => {
    if(!centreActif()) return;
    if(Math.abs(w.scrollLeft - MPX.progX) < 2) return;
    MPX.userScroll = Date.now();
    if(AN.lecture) anStop();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => { const t = xVersT(w.scrollLeft + w.clientWidth / 2); AN.t = Math.max(0, Math.min((AN.plan || planNow()).D, t)); anApercuUneFois(); });
  }, { passive: true });
  // Ordinateur : la molette fait défiler la piste de côté
  w.addEventListener('wheel', e => { if(Math.abs(e.deltaY) > Math.abs(e.deltaX) && !e.ctrlKey){ w.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
}
// Règle : cliquer ou glisser
document.addEventListener('pointerdown', e => {
  const rg = e.target && e.target.closest && e.target.closest('#mtPiste .mpx-regle'); if(!rg || !actif()) return;
  e.preventDefault(); anStop();
  const piste = document.getElementById('mtPiste');
  const aller = cx => { const r = piste.getBoundingClientRect(); anAller(Math.max(0, Math.min((AN.plan || planNow()).D, xVersT(cx - r.left)))); };
  aller(e.clientX);
  const mv = ev => aller(ev.clientX), up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
}, true);

// Sur un plan : lame, appui long (téléphone), clic = tête de lecture à cet endroit (ordinateur)
document.addEventListener('pointerdown', e => {
  if(!MPX.lame) MPX.bloqueClic = 0;   // nouveau geste : plus rien à bloquer
  const el = e.target && e.target.closest && e.target.closest('#mtPiste .mt-clip[data-n]'); if(!el || !actif()) return;
  const x = tDuClip(el, e.clientX); if(!x) return;
  if(MPX.lame){
    e.preventDefault(); e.stopPropagation();
    MPX.bloqueClic = Date.now();
    if(x.sg.vide){ agToast('Ici c\'est un vide : rien à couper', 'info'); return; }
    couperA(x.t, mobile());
    return;
  }
  MPX.clic = { n: x.n, t: x.t, at: Date.now() };
  if(e.pointerType === 'mouse' || x.sg.vide) return;
  // Appui long sans bouger : on coupe là où le doigt est resté
  const a = MPX.appui = { el, x0: e.clientX, y0: e.clientY, t: x.t, f: x.f, n: x.n, long: false, bouge: false, id: e.pointerId };
  a.tim = setTimeout(() => {
    if(MPX.appui !== a || a.bouge) return;
    a.long = true;
    const m = document.createElement('i'); m.className = 'mpx-marque'; m.style.left = (a.f * 100) + '%'; el.appendChild(m); a.m = m;
  }, 330);
}, true);
document.addEventListener('pointermove', e => {
  const a = MPX.appui; if(a && e.pointerId === a.id && (Math.abs(e.clientX - a.x0) > 8 || Math.abs(e.clientY - a.y0) > 8)){ a.bouge = true; if(a.m) a.m.remove(); clearTimeout(a.tim); }
  // Lame (souris) : un trait suit le pointeur sur les plans
  if(MPX.lame && e.pointerType === 'mouse'){
    const ln = document.querySelector('#mtPiste .mpx-lame-l'); if(!ln) return;
    const el = e.target && e.target.closest && e.target.closest('#mtPiste .mt-clip[data-n]');
    if(!el){ ln.style.display = 'none'; return; }
    const r = document.getElementById('mtPiste').getBoundingClientRect(); ln.style.display = 'block'; ln.style.left = (e.clientX - r.left) + 'px';
  }
}, true);
document.addEventListener('pointerup', e => {
  const a = MPX.appui; if(!a || e.pointerId !== a.id) return;
  clearTimeout(a.tim); MPX.appui = null;
  if(a.long && !a.bouge){ setTimeout(() => { if(a.m) a.m.remove(); couperA(a.t, true); }, 30); }
}, true);
document.addEventListener('pointercancel', () => { const a = MPX.appui; if(a){ clearTimeout(a.tim); if(a.m) a.m.remove(); MPX.appui = null; } }, true);
document.addEventListener('click', e => {
  if(Date.now() - MPX.bloqueClic < 500 && e.target && e.target.closest && e.target.closest('#mtPiste')){ MPX.bloqueClic = 0; e.stopImmediatePropagation(); e.preventDefault(); }
}, true);

// Choisir un plan : sur ordinateur la tête de lecture va où tu as cliqué ;
// sur téléphone elle ne bouge pas (la piste ne saute pas sous le doigt)
const choisirBase = window.mtChoisir;
window.mtChoisir = function(t, n){
  const avant = AN.t, c = MPX.clic;
  const r = choisirBase.apply(this, arguments);
  if(actif() && t === 'c' && c && c.n === n && Date.now() - c.at < 1500){
    MPX.clic = null;
    if(mobile()) AN.t = avant; else AN.t = c.t;
    anApercuUneFois();
  }
  return r;
};

// ============================================================
// 6. LA BARRE D'OUTILS ET LE LECTEUR (sous l'aperçu)
// ============================================================
function barreHtml(){
  const b = (id, icone, txt, fn, titre, cls) => `<button type="button" id="${id}" class="mpx-b ${cls || ''}" onclick="${fn}" title="${crE(titre)}">${ic(icone, 19)}<span>${txt}</span></button>`;
  return `<div class="mpx-mon" id="mpxMon">
      <button type="button" class="mpx-m" onclick="mpxImage(-1)" title="Image précédente (←)">${ic('frameBack', 18)}</button>
      <button type="button" class="mpx-m mpx-play" id="mpxPlay" onclick="anLecture()" title="Lecture">${ic(AN.lecture ? 'pause' : 'play', 22)}</button>
      <button type="button" class="mpx-m" onclick="mpxImage(1)" title="Image suivante (→)">${ic('frameFwd', 18)}</button>
      <div class="mpx-tc" id="mpxTc" title="Minutes:secondes:images"><b>0:00:00</b><span> / 0:00:00</span></div>
      <button type="button" class="mpx-m" id="mpxMuet" onclick="mpxMuet()">${ic('volume', 18)}</button>
      <input type="range" id="mpxVol" class="mpx-vol" min="0" max="1" step="0.05" value="${MPX.muet ? 0 : MPX.vol}" oninput="mpxVolume(this.value)" title="Volume de l'aperçu">
    </div>
    <div class="mpx-barre" id="mpxBarre">
      <button type="button" class="mpx-cut" id="mpxCut" onclick="mpxCouper()" title="Couper à la tête de lecture">${ic('scissors', 20)}<span>Couper</span></button>
      <div class="mpx-defile">
        ${b('mpxLameB', 'blade', 'Lame', 'mpxLame()', 'Lame : cliquer sur un plan le coupe à cet endroit')}
        ${b('mpxSuppr', 'deleteGap', 'Supprimer', 'mpxSupprimer(false)', 'Supprimer le plan (laisse un vide, les autres ne bougent pas)')}
        ${b('mpxRipple', 'ripple', 'Suppr. + recoller', 'mpxSupprimer(true)', 'Supprimer et fermer le trou')}
        ${b('mpxDup', 'dup', 'Dupliquer', 'mpxDupliquer()', 'Dupliquer le plan')}
        <i class="mpx-sep"></i>
        ${b('mpxUndo', 'undo', 'Annuler', 'mpxAnnuler()', 'Annuler')}
        ${b('mpxRedo', 'redo', 'Rétablir', 'mpxRetablir()', 'Rétablir')}
        <i class="mpx-sep"></i>
        ${b('mpxRegl', 'clipSet', 'Réglages', 'mpxReglages()', 'Réglages du plan choisi (durée, mouvement, cadrage...)')}
        ${b('mpxKeys', 'keyboard', 'Raccourcis', 'mpxRaccourcis()', 'Raccourcis clavier')}
        ${b('mpxPlus', 'more', 'Plus', 'mpxPlus()', 'Plus d\'outils')}
      </div>
    </div>`;
}
function majBarre(){
  const T = (id, k) => { const b = document.getElementById(id); if(b) b.title = b.title.replace(/ \(.*\)$/, '') + (k ? ' (' + k + ')' : ''); };
  const set = (id, on, dis) => { const b = document.getElementById(id); if(!b) return; if(on != null) b.classList.toggle('on', !!on); if(dis != null) b.disabled = !!dis; };
  set('mpxLameB', MPX.lame);
  set('mpxUndo', null, !MT.undo.length); set('mpxRedo', null, !MT.redo.length);
  const plan = AN.plan || planNow(), n = cible(), sg = plan.segs[n];
  const reels = plan.segs.filter(s => !s.vide).length;
  set('mpxSuppr', null, n < 0 || (!sg.vide && reels <= 1)); set('mpxRipple', null, n < 0 || (!sg.vide && reels <= 1)); set('mpxDup', null, n < 0 || !sg || sg.vide);
  T('mpxCut', touchesTxt('couper')); T('mpxLameB', touchesTxt('lame')); T('mpxSuppr', touchesTxt('supprimer')); T('mpxRipple', touchesTxt('ripple')); T('mpxUndo', touchesTxt('annuler')); T('mpxRedo', touchesTxt('retablir'));
  const ed = document.querySelector('.ed.mpx'); if(ed) ed.classList.toggle('mpx-lame-on', MPX.lame);
}
window.mpxReglages = function(){
  const plan = planNow();
  if(!(MT.sel && MT.sel.t === 'c')){ const k = cible(); if(k >= 0){ const avant = AN.t; mtChoisir('c', k); AN.t = avant; anApercuUneFois(); } }
  edOutil('montage');
};

// ---------- Plus : les outils existants rattachés ----------
window.mpxPlus = function(){
  const V = anVid(), plan = planNow(), n = MT.sel && MT.sel.t === 'c' ? MT.sel.n : -1, sg = plan.segs[n], ph = sg && !sg.vide ? CR.photos[sg.i] || {} : null, clip = n >= 0 && V.clips ? V.clips[n] : null;
  const L = [];
  const it = (icone, txt, sous, fn) => L.push(`<button type="button" class="mpx-pi" onclick="agCloseSheet('mpxPlusS');${fn}">${ic(icone, 18)}<div><b>${txt}</b>${sous ? `<small>${sous}</small>` : ''}</div></button>`);
  L.push('<div class="mpx-pt">Rythme</div>');
  it('music', 'Couper sur le rythme', 'Chaque temps, chaque mesure, l\'énergie, tes repères', "mpxOutil('auto')");
  if(typeof rtTaper === 'function') it('edit', 'Taper mes repères', 'Tu écoutes et tu tapes où couper', 'rtTaper()');
  if(AN.beats && AN.beats.length) it('target', 'Caler chaque coupe sur le rythme', AN.beats.length + ' temps forts trouvés', 'mtCalerRythme()');
  L.push('<div class="mpx-pt">Sons</div>');
  if(typeof mlBib === 'function'){ it('music', 'Musiques libres de droits', 'Recherche, écoute, licence claire', "mlBib('musique')"); it('wave', 'Bruitages libres', 'Whoosh, déclencheur photo, applaudissements...', "mlBib('bruitage')"); }
  if(typeof mlControle === 'function') it('shield', 'Contrôle des droits', 'Vérifier les sons avant de publier', 'mlControle()');
  L.push('<div class="mpx-pt">Plan choisi</div>');
  if(ph){
    it('image', 'Cadrage, 2e photo, photo dans la photo', 'Plan ' + (n + 1), 'mpxReglages()');
    if(typeof mpChoisirPoint === 'function') it('target', 'Point important', 'Touche l\'aperçu sur ce qui compte', 'mpxReglages();mpChoisirPoint()');
    if(ph.video && typeof rvRampe === 'function') it('flame', clip && clip.rampe ? 'Retirer la rampe de vitesse' : 'Rampe de vitesse', 'Ralenti au milieu du plan', `rvRampe(${clip && clip.rampe ? 'false' : 'true'})`);
  } else L.push('<div class="ag-hint" style="margin:0 0 6px">Touche un plan dans la table de montage pour ses réglages (cadrage, point important, rampe...).</div>');
  L.push('<div class="mpx-pt">Tout le montage</div>');
  if(typeof mtsLook === 'function') it('ban', 'Aucun effet', 'Retire couleurs, grain et lumières ajoutés', 'mtsLook(false)');
  if(V.clips && V.clips.length && typeof mtAuto === 'function') it('refresh', 'Revenir au montage automatique', '', 'mtAuto()');
  it('keyboard', 'Raccourcis clavier', 'Les voir et les changer', 'mpxRaccourcis()');
  agSheet('mpxPlusS', `<h3>Plus d'outils</h3><div class="mpx-pl">${L.join('')}</div>`);
};
window.mpxOutil = function(id){ edOutil(id); };

// ---------- Téléphone : les réglages s'ouvrent dans un tiroir ----------
function tiroir(on){
  MPX.tiroir = !!on;
  const ed = document.querySelector('.ed.mpx'); if(ed) ed.classList.toggle('mpx-tiroir', MPX.tiroir && mobile());
  document.querySelectorAll('#edOutils button').forEach(b => b.classList.toggle('on', MPX.tiroir && b.dataset.o === CR.edOutil));
}
window.mpxTiroir = tiroir;
const outilBase = window.edOutil;
window.edOutil = function(id, silencieux){
  const ouvert = MPX.tiroir && CR.edOutil === id;
  const r = outilBase.apply(this, arguments);
  if(document.querySelector('.ed.mpx') && mobile()){
    if(!silencieux && id !== 'photos') tiroir(!ouvert);
    else tiroir(MPX.tiroir);
    const po = document.getElementById('edPortail'); if(po) po.scrollTop = 0;
  }
  return r;
};

// ============================================================
// 7. RACCOURCIS CLAVIER (modifiables)
// ============================================================
const MPX_ACTIONS = [
  ['lecture', 'Lecture / pause', ['Space'], () => anLecture()],
  ['couper', 'Couper à la tête de lecture', ['C', 'S'], () => mpxCouper()],
  ['supprimer', 'Supprimer (laisse un vide)', ['Delete', 'Backspace'], () => mpxSupprimer(false)],
  ['ripple', 'Supprimer et fermer le trou', ['Shift+Delete', 'Shift+Backspace'], () => mpxSupprimer(true)],
  ['annuler', 'Annuler', ['Ctrl+Z'], () => mpxAnnuler()],
  ['retablir', 'Rétablir', ['Ctrl+Y', 'Ctrl+Shift+Z'], () => mpxRetablir()],
  ['imgPrec', 'Image précédente', ['ArrowLeft'], () => mpxImage(-1)],
  ['imgSuiv', 'Image suivante', ['ArrowRight'], () => mpxImage(1)],
  ['secPrec', 'Reculer d\'une seconde', ['Shift+ArrowLeft'], () => mpxSec(-1)],
  ['secSuiv', 'Avancer d\'une seconde', ['Shift+ArrowRight'], () => mpxSec(1)],
  ['coupePrec', 'Aller à la coupe précédente', ['ArrowUp'], () => mpxCoupe(-1)],
  ['coupeSuiv', 'Aller à la coupe suivante', ['ArrowDown'], () => mpxCoupe(1)],
  ['debut', 'Aller au début', ['Home'], () => mpxBout(false)],
  ['fin', 'Aller à la fin', ['End'], () => mpxBout(true)],
  ['lame', 'Lame (couper en cliquant)', ['B'], () => mpxLame()],
  ['dupliquer', 'Dupliquer le plan', ['Ctrl+D'], () => mpxDupliquer()],
  ['muet', 'Couper / remettre le son', ['M'], () => mpxMuet()],
  ['aide', 'Voir les raccourcis', ['?'], () => mpxRaccourcis()]
];
function touches(){
  const perso = lsGet('mpx.raccourcis', {}) || {};
  const o = {}; MPX_ACTIONS.forEach(([id, , def]) => { o[id] = Array.isArray(perso[id]) ? perso[id] : def.slice(); });
  return o;
}
function combo(e){
  let k = e.key; if(!k || ['Control', 'Shift', 'Alt', 'Meta', 'AltGraph', 'Dead'].includes(k)) return '';
  if(k === ' ' || k === 'Spacebar') k = 'Space';
  if(k.length === 1) k = k.toUpperCase();
  const lettre = /^[A-Z0-9]$/.test(k) || k.length > 1;   // "?" "+"... : Maj fait partie du caractère
  const p = [];
  if(e.ctrlKey || e.metaKey) p.push('Ctrl');
  if(e.altKey) p.push('Alt');
  if(e.shiftKey && lettre) p.push('Shift');
  p.push(k);
  return p.join('+');
}
const NOMS = { Space: 'Espace', Delete: 'Suppr', Backspace: 'Retour arrière', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Home: 'Début', End: 'Fin', Shift: 'Maj', Ctrl: 'Ctrl', Alt: 'Alt', Enter: 'Entrée', Escape: 'Échap', Tab: 'Tab', PageUp: 'Page préc.', PageDown: 'Page suiv.' };
function joli(c){ return String(c).split('+').map(x => NOMS[x] || x).join(' + '); }
function touchesTxt(id){ const t = touches()[id] || []; return t.map(joli).join(' ou '); }
// Les touches que l'ancienne gestion (editeur.js) utilisait : on les prend en main ici
const ANCIENNES = /^( |ArrowLeft|ArrowRight|Delete|Backspace|s|S|z|Z|y|Y)$/;
window.addEventListener('keydown', e => {
  if(MPX.capture){ e.preventDefault(); e.stopImmediatePropagation(); const c = combo(e); if(e.key === 'Escape'){ MPX.capture(null); return; } if(c) MPX.capture(c); return; }
  if(!actif()) return;
  if(typeof RT !== 'undefined' && RT.tap) return;
  const t = e.target, tag = (t && t.tagName) || '';
  if(/INPUT|TEXTAREA|SELECT/.test(tag) && !(tag === 'INPUT' && /range|checkbox|radio|button/.test(t.type || ''))) return;
  if((t && t.isContentEditable) || document.querySelector('.ag-dlg-bg, .ag-sheet')) return;
  if(e.key === 'Escape'){ if(MPX.lame){ e.stopImmediatePropagation(); mpxLame(false); return; } if(MPX.tiroir && mobile()){ e.stopImmediatePropagation(); tiroir(false); return; } return; }
  const c = combo(e), T = touches();
  const a = c && MPX_ACTIONS.find(([id]) => (T[id] || []).includes(c));
  if(a){ e.preventDefault(); e.stopImmediatePropagation(); if(t && t.blur && tag === 'INPUT') t.blur(); a[3](); majBarre(); return; }
  if(ANCIENNES.test(e.key)){ e.stopImmediatePropagation(); if(e.key === ' ' || /^Arrow/.test(e.key)) e.preventDefault(); }
}, true);

window.mpxRaccourcis = function(){
  const T = touches(), perso = lsGet('mpx.raccourcis', {}) || {};
  agSheet('mpxKeysS', `<h3>Raccourcis clavier</h3>
    <div class="ag-hint" style="margin-top:0">Touche « Changer » puis appuie sur la nouvelle touche (ou une combinaison avec Ctrl, Maj, Alt). Échap ferme ou annule.</div>
    <div class="mpx-kl">${MPX_ACTIONS.map(([id, nom]) => `<div class="mpx-k ${perso[id] ? 'perso' : ''}"><span>${nom}</span><div class="mpx-kk">${(T[id] || []).length ? T[id].map(x => `<kbd>${crE(joli(x))}</kbd>`).join('<small>ou</small>') : '<small>aucune</small>'}</div><button type="button" class="st-link" onclick="mpxChanger('${id}')">Changer</button></div>`).join('')}
      <div class="mpx-k"><span>Ranger la lame / fermer le tiroir</span><div class="mpx-kk"><kbd>Échap</kbd></div><i></i></div></div>
    <div class="mpx-kb"><button type="button" class="btn-ghost" onclick="mpxRaccourcisDefaut()">Remettre les touches de départ</button></div>`);
};
window.mpxChanger = function(id){
  const row = [...document.querySelectorAll('#mpxKeysS .mpx-k')][MPX_ACTIONS.findIndex(a => a[0] === id)];
  if(row){ row.classList.add('ecoute'); row.querySelector('.mpx-kk').innerHTML = '<small>Appuie sur la touche...</small>'; }
  MPX.capture = c => {
    MPX.capture = null;
    if(!c){ mpxRaccourcis(); return; }
    const perso = lsGet('mpx.raccourcis', {}) || {}, T = touches();
    // La touche servait déjà : on la retire de l'autre action
    let pris = '';
    MPX_ACTIONS.forEach(([a, nom]) => { if(a !== id && (T[a] || []).includes(c)){ perso[a] = T[a].filter(x => x !== c); pris = nom; } });
    perso[id] = [c];
    lsSet('mpx.raccourcis', perso);
    agToast(pris ? `${joli(c)} : retirée de « ${pris} »` : `Nouvelle touche : ${joli(c)}`, pris ? 'info' : 'success');
    mpxRaccourcis(); majBarre();
  };
};
window.mpxRaccourcisDefaut = async function(){
  if(!await agConfirm('Remettre toutes les touches de départ ?', { ok: 'Oui', no: 'Garder les miennes' })) return;
  lsSet('mpx.raccourcis', {}); mpxRaccourcis(); majBarre(); agToast('Touches de départ remises');
};

// ============================================================
// 8. MISE EN PLACE DANS L'ÉCRAN DE MONTAGE
// ============================================================
function taille(){
  const sc = document.getElementById('edScene'); if(!sc || !document.querySelector('.ed.mpx')) return;
  const prev = sc.querySelector('.cr-prev'), cv = prev && prev.querySelector('canvas'), zone = sc.querySelector('.cr-prev-zone'); if(!prev || !cv || !zone) return;
  const r = cv.width / cv.height;
  const autres = [...zone.children].filter(x => x !== prev).reduce((a, x) => a + (x.offsetHeight ? x.offsetHeight + 6 : 0), 0) + (sc.querySelector('.br-exemple') ? sc.querySelector('.br-exemple').offsetHeight + 6 : 0);
  const wMax = sc.clientWidth - (mobile() ? 4 : 24), hMax = sc.clientHeight - autres - (mobile() ? 10 : 24);
  let w = wMax, h = w / r; if(h > hMax){ h = Math.max(90, hMax); w = h * r; }
  const W = Math.round(w) + 'px', H = Math.round(h) + 'px';
  if(prev.style.width !== W || prev.style.height !== H){ prev.style.width = W; prev.style.height = H; }
  prev.style.maxWidth = 'none'; prev.style.margin = '0 auto';
  placerCentre();
}
function monter(){
  const ed = document.querySelector('#edPortail .ed'); if(!ed || ed.classList.contains('mpx')) return;
  if(!ed.classList.contains('ed-video') || !document.getElementById('mtZone') || ed.classList.contains('sans-piste')) return;
  const zone = ed.querySelector('#edScene .cr-prev-zone'), prev = zone && zone.querySelector('.cr-prev'); if(!prev) return;
  ed.classList.add('mpx'); document.body.classList.add('mpx-ouvert');
  const d = document.createElement('div'); d.className = 'mpx-zone'; d.innerHTML = barreHtml();
  prev.insertAdjacentElement('afterend', d);
  // Tiroir des réglages (téléphone) : un bouton pour le fermer
  const insp = ed.querySelector('#edInsp');
  if(insp && !insp.querySelector('.mpx-tx')){ const x = document.createElement('button'); x.type = 'button'; x.className = 'mpx-tx'; x.title = 'Fermer'; x.innerHTML = '×'; x.onclick = () => tiroir(false); insp.appendChild(x); }
  tiroir(MPX.tiroir);
  // L'aperçu garde la bonne taille, même quand editeur.js la recalcule
  new MutationObserver(() => { clearTimeout(taille.t); taille.t = setTimeout(taille, 0); }).observe(prev, { attributes: true, attributeFilter: ['style'] });
  appliquerVolume(); majVolume(); majPlay();
  decorer(); majBarre(); anApercuUneFois();
  taille(); setTimeout(taille, 80); setTimeout(() => { taille(); decorer(); }, 450);
}
// Après chaque affichage de l'écran
const renderBase = crRender;
crRender = async function(){
  const r = await renderBase.apply(this, arguments);
  try { if(CR.vue === 'edit') monter(); else { MPX.lame = false; MPX.tiroir = false; } if(!document.querySelector('#edPortail .ed.mpx')) document.body.classList.remove('mpx-ouvert'); } catch(e){ console.warn('montage-pro', e); }
  return r;
};
// Après chaque changement de la table de montage
const apresBase = window.edApresMt;
window.edApresMt = function(){
  const r = apresBase.apply(this, arguments);
  try {
    if(document.querySelector('.ed.mpx')){
      decorer(); majBarre();
      // Un vide choisi : son panneau
      const plan = planNow(), sg = MT.sel && MT.sel.t === 'c' ? plan.segs[MT.sel.n] : null, hote = document.getElementById('mtPanHote');
      if(sg && sg.vide && hote){
        hote.innerHTML = `<div class="mt-pan"><div class="mt-pan-t"><b>Vide</b><span>de ${anMinSec(sg.t0)} à ${anMinSec(sg.t1)} · ${(sg.t1 - sg.t0).toFixed(1).replace('.', ',')} s d'écran noir</span><button class="st-link" onclick="mtChoisir(null)">Fermer</button></div>
          <div class="ag-hint" style="margin-top:0">Laissé par « Supprimer » : les plans suivants n'ont pas bougé.</div>
          <div class="mt-act"><button type="button" onclick="mpxSupprimer(true)">${ic('ripple', 14)} Fermer le vide</button></div></div>`;
      }
    }
  } catch(e){ console.warn('montage-pro', e); }
  return r;
};
window.addEventListener('resize', () => { clearTimeout(window.mpxRz); window.mpxRz = setTimeout(() => { if(!document.querySelector('.ed.mpx')) return; tiroir(MPX.tiroir); taille(); decorer(); }, 160); });

// ============================================================
// 9. STYLE
// ============================================================
(function css(){
  if(document.getElementById('mpxCss')) return;
  const st = document.createElement('style'); st.id = 'mpxCss';
  st.textContent = `
.ed.mpx .an-lect,.ed.mpx .ed-d .ed-ic,.ed.mpx .mt-tete .mt-ic,.ed.mpx .cr-fmtnom{display:none !important}
.ed.mpx .cr-prev-zone{display:flex;flex-direction:column;align-items:center;gap:6px}
.mpx-zone{width:100%;display:flex;flex-direction:column;gap:6px}
.mpx-mon{display:flex;align-items:center;gap:4px;justify-content:center;flex-wrap:nowrap;min-width:0}
.mpx-m{flex:none;width:38px !important;height:38px;margin:0;padding:0;border-radius:10px;border:1px solid var(--border);background:var(--card2);color:var(--text);display:flex;align-items:center;justify-content:center;cursor:pointer}
.mpx-m.on{color:var(--red,#e5484d)}
.mpx-play{width:48px !important;height:42px;background:var(--accent);border-color:var(--accent);color:#fff}
.mpx-tc{font-variant-numeric:tabular-nums;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;padding:0 8px;white-space:nowrap;color:var(--muted)}
.mpx-tc b{color:var(--text);font-weight:700}
.mpx-vol{width:90px !important;margin:0;flex:none;accent-color:var(--accent)}
.mpx-barre{display:flex;align-items:stretch;gap:6px;padding:5px;border-radius:14px;background:var(--card2);border:1px solid var(--border);min-width:0}
.mpx-cut{flex:none;display:flex;align-items:center;gap:7px;width:auto !important;margin:0;padding:0 16px;min-height:46px;border-radius:11px;border:0;background:var(--accent);color:#fff;font-weight:800;font-size:14px;letter-spacing:.02em;cursor:pointer}
.mpx-cut:active{transform:scale(.97)}
.mpx-defile{flex:1;min-width:0;display:flex;align-items:stretch;gap:2px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.mpx-defile::-webkit-scrollbar{display:none}
.mpx-b{flex:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;width:auto !important;min-width:62px;margin:0;padding:5px 6px;border-radius:10px;border:0;background:transparent;color:var(--text);font-size:10.5px;font-weight:600;cursor:pointer;white-space:nowrap}
.mpx-b:hover{background:color-mix(in srgb,var(--text) 7%,transparent)}
.mpx-b.on{background:color-mix(in srgb,var(--accent) 22%,transparent);color:var(--accent)}
.mpx-b:disabled{opacity:.35;cursor:default;background:transparent}
.mpx-sep{flex:none;width:1px;margin:6px 3px;background:var(--border)}
.ed.mpx .mt-piste{padding-top:20px !important}
.mpx-regle{position:absolute;left:0;right:0;top:0;height:18px;cursor:pointer;z-index:2;touch-action:none}
.mpx-regle i{position:absolute;top:11px;width:1px;height:5px;background:var(--muted);opacity:.6}
.mpx-regle i.g{top:8px;height:8px;opacity:.9}
.mpx-regle span{position:absolute;top:-1px;transform:translateX(-50%);font-size:9.5px;color:var(--muted);font-variant-numeric:tabular-nums;pointer-events:none}
.mpx-lame-l{display:none;position:absolute;top:18px;bottom:2px;width:2px;margin-left:-1px;background:#ff4d4f;pointer-events:none;z-index:5}
.ed.mpx-lame-on .mt-clip{cursor:crosshair !important}
.ed.mpx-lame-on .mt-piste-w{box-shadow:inset 0 0 0 2px #ff4d4f;border-radius:10px}
.mpx-marque{position:absolute;top:-2px;bottom:-2px;width:3px;margin-left:-1.5px;background:#ff4d4f;box-shadow:0 0 8px #ff4d4f;z-index:4;pointer-events:none}
.mt-clip.mpx-vide{background:repeating-linear-gradient(135deg,#0c0c0c 0 8px,#1a1a1a 8px 16px) !important;border:1px dashed var(--border) !important;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--muted)}
.mt-clip.mpx-vide span{font-size:11px;font-weight:700}.mt-clip.mpx-vide b{position:static !important;font-size:10px}
.mt-clip.mpx-vide.on{box-shadow:0 0 0 2px var(--accent)}
.mpx-centre{display:none;position:absolute;width:2px;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.4),0 0 8px rgba(255,255,255,.6);pointer-events:none;z-index:6;border-radius:2px}
.mpx-tx{display:none}
.mpx-pl{display:flex;flex-direction:column;gap:4px}
.mpx-pt{margin:12px 0 4px;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:700}
.mpx-pi{display:flex;align-items:center;gap:12px;width:100% !important;margin:0;padding:10px 12px;border-radius:12px;border:1px solid var(--border);background:var(--card2);color:var(--text);text-align:left;cursor:pointer}
.mpx-pi svg{color:var(--accent);flex:none}.mpx-pi b{display:block;font-size:14px}.mpx-pi small{display:block;color:var(--muted);font-size:12px;margin-top:1px}
.mpx-kl{display:flex;flex-direction:column;gap:2px;margin-top:8px}
.mpx-k{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid var(--border);font-size:13.5px}
.mpx-k.perso span{color:var(--accent)}.mpx-k.ecoute{background:color-mix(in srgb,var(--accent) 15%,transparent);border-radius:8px}
.mpx-kk{display:flex;align-items:center;gap:5px;flex-wrap:wrap;justify-content:flex-end}
.mpx-kk kbd{font-family:ui-monospace,Menlo,monospace;font-size:12px;padding:3px 7px;border-radius:6px;border:1px solid var(--border);border-bottom-width:2px;background:var(--card2);color:var(--text);white-space:nowrap}
.mpx-kk small{color:var(--muted);font-size:11px}
.mpx-k .st-link{width:auto !important;margin:0}
.mpx-kb{margin-top:12px}.mpx-kb .btn-ghost{width:100%}
@media(max-width:899px){
  body.ed-ouvert.mpx-ouvert #edPortail{overflow:hidden;padding:6px 6px calc(6px + env(safe-area-inset-bottom));padding-top:calc(6px + env(safe-area-inset-top))}
  #edPortail > .ed.mpx{height:100%;gap:6px}
  .ed.mpx .ed-barre{flex:none;padding:4px 8px;border-radius:12px}
  .ed.mpx .ed-scene{flex:1 1 auto;min-height:0;padding:6px;border-radius:14px;justify-content:flex-start;overflow:hidden}
  .ed.mpx .ed-piste{flex:none}
  .ed.mpx .mt{padding:4px 0 2px;border-radius:14px;position:relative}
  .ed.mpx .mt-tete{display:none}
  .ed.mpx .mt-piste-w{padding-bottom:2px}
  .ed.mpx .mt-tete-l{display:none !important}
  .ed.mpx .mpx-centre{display:block}
  .ed.mpx .ed-outils{flex:none;position:static;padding:3px}
  .ed.mpx .ed-outils button{width:64px;padding:5px 2px;font-size:10px}
  .ed.mpx .ed-insp{position:fixed;left:0;right:0;bottom:0;z-index:30;max-height:62vh;min-height:0 !important;overflow-y:auto;overscroll-behavior:contain;border-radius:18px 18px 0 0;padding:14px 12px calc(16px + env(safe-area-inset-bottom));box-shadow:0 -12px 40px rgba(0,0,0,.45);transform:translateY(110%);transition:transform .22s ease;visibility:hidden}
  .ed.mpx.mpx-tiroir .ed-insp{transform:none;visibility:visible}
  .ed.mpx .ed-insp-t{padding-right:40px}
  .ed.mpx .mpx-tx{display:flex;align-items:center;justify-content:center;position:absolute;top:8px;right:8px;width:36px !important;height:36px;margin:0;padding:0;border-radius:50%;border:1px solid var(--border);background:var(--card2);color:var(--text);font-size:22px;line-height:1;cursor:pointer}
  .mpx-mon{gap:3px}
  .mpx-m{width:36px !important;height:36px}
  .mpx-play{width:46px !important}
  .mpx-tc{font-size:12px;padding:0 4px}
  .mpx-vol{display:none}
  .mpx-cut{padding:0 14px;min-height:50px;font-size:14.5px}
  .mpx-b{min-width:58px}
}
@media(min-width:900px){
  .ed.mpx .ed-scene{justify-content:flex-start}
  .ed.mpx .mpx-zone{max-width:900px}
  .ed.mpx .ed-piste{max-height:34vh}
}`;
  document.head.appendChild(st);
})();
})();
