// montage-pistes.js — version 1
// ============================================================
// MONTAGE-PISTES.JS - Lot B : la table de montage en plusieurs pistes
// (écran de montage des Créations)
// ------------------------------------------------------------
// - Plusieurs pistes : la piste principale (vidéo 1), des pistes
//   vidéo d'incrustation au-dessus (vidéo 2, 3... : l'image passe
//   par-dessus la piste principale), la musique et des pistes de sons
//   (bruitages) en dessous. Chaque piste se coupe (son) ou se cache
//   (image). La piste texte viendra plus tard.
// - Trim : on tire le début ou la fin d'un élément (poignées).
// - Glisser-déposer : on déplace les éléments dans le temps et d'une
//   piste à l'autre (souris : on attrape ; tactile : appui long).
//   Sur la piste principale, glisser change l'ordre ; glisser un plan
//   vers le haut le passe en incrustation.
// - Aimant : les bords s'accrochent aux coupes, aux autres éléments,
//   à la tête de lecture et aux temps forts (activable / désactivable).
// - Sélection multiple (Ctrl ou Maj + clic, ou bouton Sélection),
//   déplacement, suppression et duplication en groupe.
// - Zoom (molette + Ctrl, pincer, boutons, Ajuster) ; défilement
//   horizontal et vertical. L'échelle du temps est la même partout.
// Tout est ajouté par enveloppes : montage.js, montage-pro.js... restent tels quels.
// Utilise montage.js, montage-pro.js, rushs.js, musique-libre.js, animations.js.
// ============================================================
(function(){
'use strict';
if(typeof CR === 'undefined' || typeof AN === 'undefined' || typeof MT === 'undefined' || typeof MPX === 'undefined' || typeof mtMaj !== 'function' || typeof mtEstSeq !== 'function') return;

function lsGet(k, d){ try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch(e){ return d; } }
function lsSet(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }

const MPB = {
  pps: Math.max(6, Math.min(400, Number(lsGet('mpb.zoom', 40)) || 40)),   // pixels par seconde
  aimant: lsGet('mpb.aimant', true) !== false,
  multi: false,                // mode « Sélection » (tactile)
  sel: new Set(),              // éléments choisis (objets des données)
  media: {},                   // photos / vidéos des incrustations (gardées en réserve)
  drag: null, bloque: 0, pinch: null
};
window.MPB = MPB;
const ZMIN = 6, ZMAX = 400;
const H_V = () => mobile() ? 34 : 40;     // hauteur d'une piste vidéo d'incrustation
const H_A = () => mobile() ? 28 : 32;     // hauteur d'une piste son
const H_M = 64;                           // piste principale (montage.js)
const REGLE = 20;
const VIDE = '__vide';

// ---------- Icônes en plus ----------
if(typeof AG_ICONS !== 'undefined'){
  const I = {
    magnet: '<path d="M6 3v8a6 6 0 0 0 12 0V3"/><path d="M6 3h4v8a2 2 0 0 0 4 0V3h4"/><path d="M6 7h4M14 7h4"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    multiSel: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/><path d="m5.5 7 1.5 1.5L9.5 5.5M15.5 17l1.5 1.5 2.5-3"/>',
    zoomIn: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M8 11h6M11 8v6"/>',
    zoomOut: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M8 11h6"/>',
    fit: '<path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4"/><path d="M8 12h8"/>',
    eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4.4-1"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    upLayer: '<rect x="3" y="13" width="18" height="7" rx="1.5"/><rect x="7" y="4" width="10" height="6" rx="1.5"/><path d="M12 10v3"/>',
    downLayer: '<rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="7" y="14" width="10" height="6" rx="1.5"/><path d="M12 11v3"/>'
  };
  Object.keys(I).forEach(k => { if(!AG_ICONS[k]) AG_ICONS[k] = I[k]; });
}
const ic = (n, s) => agIcon(n, s || 18);
const E = s => crE(String(s == null ? '' : s));
const r2 = v => Math.round(v * 100) / 100;
const fmtS = v => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',') + ' s';
function tcCourt(t){ t = Math.max(0, t || 0); const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1).replace('.', ',')}`; }
function uid(p){ return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// ---------- Utilitaires ----------
function mobile(){ return !window.matchMedia('(min-width:900px)').matches; }
function pro(){ return document.body.classList.contains('ed-ouvert') && CR.vue === 'edit' && mtEstSeq(CR.modele) && !!document.querySelector('.ed.mpx') && !!document.getElementById('mtPiste'); }
function wrap(){ return document.querySelector('#mtZone .mt-piste-w'); }
function piste(){ return document.getElementById('mtPiste'); }
function planNow(){ AN.plan = anPlan(); return AN.plan; }
function estVide(c){ return !!(c && (c.vide || c.k === VIDE)); }
function photoDe(k){ return CR.photos.find(p => p.k === k) || null; }
function idxDe(k){ return CR.photos.findIndex(p => p.k === k); }
function pistesDe(type){ return (anVid().pistes || []).filter(p => p.type === type); }
function centreActif(){ return mobile() && pro(); }

// ============================================================
// 1. LES DONNÉES
// ------------------------------------------------------------
// anVid().pistes = [{ id, type: 'video' | 'audio', clips: [...] (vidéo), muet, cache, garde }]
//   clip d'incrustation : { id, k (photo ou vidéo de CR.photos), t (début), d (durée), vin, vit }
// Les bruitages restent dans anVid().sons (musique-libre.js), avec en plus :
//   piste (id de la piste son), off (début dans le son), dur (durée jouée)
// anVid().musMuet : la musique est coupée.
// ============================================================
function sonBuf(s){ return typeof ML !== 'undefined' && ML.buf ? ML.buf[s.id] : null; }
function sonMax(s){ const b = sonBuf(s); return b ? Math.max(0.1, b.duration - (s.off || 0)) : null; }
function sonDur(s){ const m = sonMax(s); if(s.dur != null) return m != null ? Math.min(s.dur, m) : s.dur; return m != null ? m : 1; }
function vidMax(c){ const p = photoDe(c.k); if(!p || !p.video || !p.vdur) return null; return Math.max(0.2, (p.vdur - (c.vin || 0)) / (c.vit || 1)); }
// Tous les éléments libres (incrustations et sons), sous une même forme
function libres(){
  const V = anVid(), L = [];
  (V.pistes || []).forEach(p => { if(p.type === 'video') (p.clips || []).forEach(c => L.push({ o: c, type: 'video', piste: p.id, t: c.t, d: c.d })); });
  (V.sons || []).forEach(s => L.push({ o: s, type: 'audio', piste: s.piste, t: s.t, d: sonDur(s) }));
  return L;
}
function itemDe(o){ return libres().find(x => x.o === o) || null; }
function pisteDeItem(o){ const V = anVid(); if((V.sons || []).includes(o)) return (V.pistes || []).find(p => p.id === o.piste); return (V.pistes || []).find(p => (p.clips || []).includes(o)); }
function nouvellePiste(type, garde){
  const V = anVid(); V.pistes = V.pistes || [];
  let n = 1; while(V.pistes.some(p => p.id === (type === 'video' ? 'v' : 'a') + n)) n++;
  const p = Object.assign({ id: (type === 'video' ? 'v' : 'a') + n, type, muet: false, cache: false }, type === 'video' ? { clips: [] } : {}, garde ? { garde: true } : {});
  V.pistes.push(p);
  return p;
}
function chevauche(pisteId, type, t, d, exclus){
  return libres().some(x => x.type === type && x.piste === pisteId && !(exclus && exclus.has(x.o)) && x.t < t + d - 0.001 && t < x.t + x.d - 0.001);
}
// Une piste libre à cet endroit (celle voulue d'abord, sinon une autre, sinon une nouvelle)
function pistePour(type, t, d, voulue, exclus){
  const L = pistesDe(type), ordre = voulue ? [L.find(p => p.id === voulue)].concat(L.filter(p => p.id !== voulue)).filter(Boolean) : L;
  const p = ordre.find(x => !chevauche(x.id, type, t, d, exclus));
  return p || nouvellePiste(type);
}
function poser(o, pisteDest){
  const V = anVid();
  if((V.sons || []).includes(o)){ o.piste = pisteDest.id; return; }
  (V.pistes || []).forEach(p => { if(p.type === 'video' && p.clips){ const i = p.clips.indexOf(o); if(i >= 0 && p !== pisteDest) p.clips.splice(i, 1); } });
  if(!pisteDest.clips.includes(o)) pisteDest.clips.push(o);
}
// Remise en ordre : sons sans piste, éléments perdus, pistes vides
function normaliser(){
  const V = anVid();
  if(!V.pistes){ if(!(V.sons || []).length) return; V.pistes = []; }
  (V.pistes || []).forEach(p => { if(p.type === 'video'){ p.clips = (p.clips || []).filter(c => c && c.k && (photoDe(c.k) || MPB.media[c.k])); p.clips.forEach(c => { const m = vidMax(c); if(m != null && c.d > m + 0.01) c.d = r2(m); }); } });
  (V.sons || []).forEach(s => { if(!(V.pistes || []).some(p => p.id === s.piste && p.type === 'audio')){ s.piste = null; const p = pistePour('audio', s.t, sonDur(s), null, new Set([s])); s.piste = p.id; } });
  V.pistes = V.pistes.filter(p => p.garde || (p.type === 'video' ? p.clips.length : (V.sons || []).some(s => s.piste === p.id)));
}

// ---------- Les photos des incrustations ----------
// Elles restent dans CR.photos (pour les brouillons et le chargement des images),
// mais la piste principale ne doit pas les reprendre.
function clesIncrust(){ const s = new Set(); pistesDe('video').forEach(p => (p.clips || []).forEach(c => s.add(c.k))); return s; }
function seulesIncrust(){
  const ks = clesIncrust(); if(!ks.size) return ks;
  const V = anVid(); if(V.clips && V.clips.length) V.clips.forEach(c => ks.delete(c.k));
  return ks;
}
// montage.js retire les photos qui ne sont plus dans la piste principale : on remet celles des incrustations
function proteger(){
  CR.photos.forEach((p, i) => { const m = MPB.media[p.k]; if(!m || m.p !== p) MPB.media[p.k] = { p, c: CR.crop[i] }; });
  if(CR.vue !== 'edit') return;
  const ks = clesIncrust(); if(!ks.size) return;
  const la = new Set(CR.photos.map(p => p.k));
  ks.forEach(k => { if(!la.has(k) && MPB.media[k]){ CR.photos.push(MPB.media[k].p); CR.crop.push(Object.assign({ x: 0, y: 0, z: 1 }, MPB.media[k].c || {})); la.add(k); } });
}
// Une photo qui ne sert plus nulle part : retirée
function nettoyerPhotos(){
  const V = anVid(); if(!V.clips) return;
  const pris = new Set(V.clips.map(c => c.k)); clesIncrust().forEach(k => pris.add(k));
  for(let i = CR.photos.length - 1; i >= 0; i--) if(!pris.has(CR.photos[i].k)){ CR.photos.splice(i, 1); CR.crop.splice(i, 1); }
}
const planBase = anPlan;
anPlan = function(){
  if(!CR.modele || !mtEstSeq(CR.modele)) return planBase.apply(this, arguments);
  proteger();
  const seules = seulesIncrust();
  if(!seules.size) return planBase.apply(this, arguments);
  const P = CR.photos, C = CR.crop, garde = P.map(p => !seules.has(p.k));
  CR.photos = P.filter((p, i) => garde[i]); CR.crop = C.filter((c, i) => garde[i]);
  let plan;
  try { plan = planBase.apply(this, arguments); } finally { CR.photos = P; CR.crop = C; }
  const idx = {}; P.forEach((p, i) => { if(!(p.k in idx)) idx[p.k] = i; });
  (plan.segs || []).forEach(sg => { if(sg && !sg.vide && sg.k != null && idx[sg.k] != null) sg.i = idx[sg.k]; });
  return plan;
};
// Une photo retirée depuis l'écran des photos : ses incrustations partent aussi
if(typeof crRetirer === 'function'){
  const retirerBase = crRetirer;
  crRetirer = function(i){
    const p = CR.photos[i];
    if(p){ delete MPB.media[p.k]; pistesDe('video').forEach(x => { x.clips = (x.clips || []).filter(c => c.k !== p.k); }); }
    return retirerBase.apply(this, arguments);
  };
}

// ---------- Annuler / rétablir : les pistes et les sons sont gardés avec chaque étape ----------
const EXTRA = new WeakMap();
function capture(){ const V = anVid(); return { pistes: JSON.parse(JSON.stringify(V.pistes || null)), sons: JSON.parse(JSON.stringify(V.sons || null)), musMuet: !!V.musMuet }; }
function marquer(a){
  if(Array.isArray(a) && !a.mpbP){
    Object.defineProperty(a, 'push', { value: function(x){ if(x && typeof x === 'object' && !EXTRA.has(x)) EXTRA.set(x, capture()); return Array.prototype.push.apply(this, arguments); }, configurable: true, writable: true });
    Object.defineProperty(a, 'mpbP', { value: true });
  }
  return a;
}
['undo', 'redo'].forEach(k => {
  try {
    const d = Object.getOwnPropertyDescriptor(MT, k);
    if(d && d.get) Object.defineProperty(MT, k, { get(){ return marquer(d.get.call(MT)); }, set(v){ d.set.call(MT, v); }, enumerable: true, configurable: true });
    else { let u = marquer(MT[k]); Object.defineProperty(MT, k, { get(){ return u; }, set(v){ u = marquer(v); }, enumerable: true, configurable: true }); }
  } catch(e){ console.warn('montage-pistes', e); }
});
function remettre(e){
  const V = anVid();
  V.pistes = e.pistes; V.sons = e.sons; V.musMuet = e.musMuet;
  (V.sons || []).forEach(s => { if(typeof ML !== 'undefined' && !ML.buf[s.id]){ const b = ML.buf[String(s.id).split('-')[0]]; if(b) ML.buf[s.id] = b; } });
  appliquerMuetMusique();
}
const annulerBase = window.mtAnnuler;
window.mtAnnuler = function(retablir){
  const de = retablir ? MT.redo : MT.undo, x = de[de.length - 1], e = x && EXTRA.get(x);
  MPB.sel.clear();
  if(!e) return annulerBase.apply(this, arguments);
  const avant = capture();
  remettre(e);
  const r = annulerBase.apply(this, arguments);
  const vers = retablir ? MT.undo : MT.redo, y = vers[vers.length - 1];
  if(y) EXTRA.set(y, avant);
  return r;
};
function avant(){ mtAvantPublic(); }

// ============================================================
// 2. L'IMAGE : les incrustations passent par-dessus la piste principale
// ============================================================
const ELS = {};   // une balise vidéo par incrustation vidéo
function elDe(c, p){
  let v = ELS[c.id];
  if(!v || v.mpbUrl !== p.url){
    v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous';
    v.setAttribute('playsinline', ''); v.setAttribute('muted', '');
    v.src = p.url; v.mpbUrl = p.url; ELS[c.id] = v;
    v.addEventListener('loadeddata', () => { v.width = v.videoWidth; v.height = v.videoHeight; if(!p.vdur && isFinite(v.duration)) p.vdur = v.duration; if(!AN.lecture && !AN.busy) anApercuUneFois(); });
    v.addEventListener('seeked', () => { if(!AN.lecture && !AN.busy && !MPB.exp) anApercuUneFois(); });
  }
  return v;
}
function cibleVid(c, p, t){ const dur = p.vdur || 0, x = (c.vin || 0) + Math.max(0, t - c.t) * (c.vit || 1); return Math.max(0, Math.min(Math.max(0, dur - 0.04), x)); }
function incrustA(t){
  const L = [];
  pistesDe('video').forEach(p => { if(p.cache) return; (p.clips || []).forEach(c => { if(t >= c.t && t < c.t + c.d) L.push(c); }); });
  return L;
}
const dessinBase = window.mtDessiner;
window.mtDessiner = function(g, W, H, s, tt, imgs, plan){
  const r = dessinBase.apply(this, arguments);
  try {
    incrustA(tt).forEach(c => {
      const i = idxDe(c.k), p = CR.photos[i]; if(!p) return;
      let im = imgs ? imgs[i] : null;
      if(p.video && p.url){ const v = elDe(c, p); if(v.readyState >= 2 && v.videoWidth){ if(!v.width){ v.width = v.videoWidth; v.height = v.videoHeight; } im = v; } }
      if(im && im.width) anCover(g, im, 0, 0, W, H, 1, 0, 0);
    });
  } catch(e){ console.warn('incrustation', e); }
  return r;
};
// Aperçu : les vidéos d'incrustation jouent en même temps
function syncIncrust(){
  const t = AN.t, vus = new Set();
  pistesDe('video').forEach(pi => (pi.clips || []).forEach(c => {
    const p = photoDe(c.k); if(!p || !p.video || !p.url) return;
    if(t < c.t - 0.6 || t > c.t + c.d + 0.6) return;
    vus.add(c.id);
    const v = elDe(c, p), x = cibleVid(c, p, t), dedans = t >= c.t && t < c.t + c.d;
    if(AN.lecture && dedans && !pi.cache){
      v.playbackRate = c.vit || 1;
      if(v.paused){ if(Math.abs(v.currentTime - x) > 0.05) v.currentTime = x; v.play().catch(() => {}); }
      else if(Math.abs(v.currentTime - x) > 0.3) v.currentTime = x;
    } else {
      if(!v.paused) v.pause();
      if(Math.abs(v.currentTime - x) > 0.04 && !v.seeking) v.currentTime = x;
    }
  }));
  Object.keys(ELS).forEach(id => { if(!vus.has(id) && !ELS[id].paused) ELS[id].pause(); });
}
// Export : chaque vidéo d'incrustation est placée au bon moment avant chaque image
function seek(v, x){ return new Promise(ok => { if(Math.abs((v.currentTime || 0) - x) < 0.002 && v.readyState >= 2){ ok(); return; } let fini = false; const f = () => { if(fini) return; fini = true; v.removeEventListener('seeked', f); ok(); }; v.addEventListener('seeked', f); setTimeout(f, 3000); v.currentTime = x; }); }
function pret(v){ return v.readyState >= 2 ? Promise.resolve() : new Promise(ok => { let fini = false; const f = () => { if(fini) return; fini = true; ok(); }; v.addEventListener('loadeddata', f); setTimeout(f, 8000); }); }
if(typeof window.rvPreparer === 'function'){
  const prepBase = window.rvPreparer;
  window.rvPreparer = async function(t, plan){
    const r = await prepBase.apply(this, arguments);
    if(plan && plan.mt){
      MPB.exp = true;
      try {
        const tt = Math.min(t, plan.Dp);
        for(const c of incrustA(tt)){ const p = photoDe(c.k); if(!p || !p.video || !p.url) continue; const v = elDe(c, p); await pret(v); if(!v.paused) v.pause(); await seek(v, cibleVid(c, p, tt)); }
      } finally { MPB.exp = false; }
    }
    return r;
  };
}

// ============================================================
// 3. LE SON : pistes coupées, sons raccourcis (début / fin)
// ============================================================
function pisteMuette(id){ const p = (anVid().pistes || []).find(x => x.id === id); return !!(p && p.muet); }
function sonsJoues(){ return (anVid().sons || []).filter(s => !pisteMuette(s.piste) && sonBuf(s)); }
function stopSons(){ if(typeof ML === 'undefined') return; (ML.src || []).forEach(x => { try { x.stop(); } catch(e){} }); ML.src = []; }
function planifierSons(){
  if(typeof ML === 'undefined') return;
  stopSons();
  if(!AN.lecture) return;
  const L = sonsJoues(); if(!L.length) return;
  if(!ML.ctx){ try { ML.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ return; } }
  const c = ML.ctx, t0 = AN.t;
  try { if(c.state === 'suspended') c.resume(); } catch(e){}
  L.forEach(s => {
    const b = sonBuf(s), dur = sonDur(s), off = s.off || 0;
    if(s.t + dur <= t0 + 0.01) return;
    const deja = Math.max(0, t0 - s.t);
    const src = c.createBufferSource(), g = c.createGain(); g.gain.value = s.vol == null ? 1 : s.vol;
    src.buffer = b; src.connect(g); g.connect(c.destination);
    try { src.start(c.currentTime + Math.max(0, s.t - t0), off + deja, Math.max(0.01, dur - deja)); } catch(e){ return; }
    ML.src.push(src);
  });
}
function appliquerMuetMusique(){ if(AN.audio && anVid().musMuet) AN.audio.volume = 0; }
const lectureBase = anLecture;
anLecture = function(){
  const etait = AN.lecture, V = anVid(), sons = V.sons;
  // musique-libre.js ne programme plus les sons : on le fait ici (début, fin, pistes coupées)
  if(!etait && sons && sons.length) V.sons = [];
  let r;
  try { r = lectureBase.apply(this, arguments); } finally { if(!etait && sons) V.sons = sons; }
  try { if(AN.lecture){ normaliser(); planifierSons(); appliquerMuetMusique(); } } catch(e){ console.warn('sons', e); }
  return r;
};
const allerBase = anAller;
anAller = function(){ const r = allerBase.apply(this, arguments); try { if(AN.lecture) planifierSons(); } catch(e){} return r; };
const stopBase = anStop;
anStop = function(){ const r = stopBase.apply(this, arguments); Object.values(ELS).forEach(v => { try { v.pause(); } catch(e){} }); return r; };
if(typeof window.mpxVolume === 'function'){ const volBase = window.mpxVolume; window.mpxVolume = function(){ const r = volBase.apply(this, arguments); appliquerMuetMusique(); return r; }; }
// Dans la vidéo finale
window.mlAjouterSons = async function(off, D){
  for(const s of sonsJoues()){
    if(!(s.t < D)) continue;
    const dur = sonDur(s), src = off.createBufferSource(), g = off.createGain(); g.gain.value = s.vol == null ? 1 : s.vol;
    src.buffer = sonBuf(s); src.connect(g); g.connect(off.destination);
    src.start(Math.max(0, s.t), s.off || 0, Math.max(0.01, dur));
  }
};
if(typeof anMixMusique === 'function'){
  const mixBase = anMixMusique;
  anMixMusique = async function(){
    const V = anVid(); if(!V.musMuet) return mixBase.apply(this, arguments);
    const vol = V.volume; V.volume = 0.0001;
    try { return await mixBase.apply(this, arguments); } finally { V.volume = vol; }
  };
}

// À chaque image affichée : les vidéos d'incrustation suivent
const apercuBase = anApercuUneFois;
anApercuUneFois = function(){
  try { if(!AN.busy && !MPB.exp) syncIncrust(); } catch(e){}
  return apercuBase.apply(this, arguments);
};

// ============================================================
// 4. LA TABLE DE MONTAGE : échelle du temps, pistes, règle
// ============================================================
function x0(){ const pi = piste(); const c = pi && pi.querySelector('.mt-clip[data-n]'); return c ? c.offsetLeft : (pi ? parseFloat(getComputedStyle(pi).paddingLeft) || 0 : 0); }
function X(t){ return MPB.x0 + t * MPB.pps; }
function T(x){ return (x - MPB.x0) / MPB.pps; }
function finT(){ const p = AN.plan || planNow(); return Math.max(p.D, ...libres().map(x => x.t + x.d), anVid().musique ? p.D : 0); }
// Hauteurs et ordre des pistes (de haut en bas)
function lignes(){
  const V = anVid(), L = [], hv = H_V(), ha = H_A();
  let y = REGLE;
  pistesDe('video').slice().reverse().forEach(p => { L.push({ p, type: 'video', y, h: hv }); y += hv + 4; });
  const yMain = y; y += H_M + 6;
  if(V.musique) { L.push({ p: { id: 'musique', type: 'musique' }, type: 'musique', y, h: ha }); y += ha + 4; }
  pistesDe('audio').forEach(p => { L.push({ p, type: 'audio', y, h: ha }); y += ha + 4; });
  return { L, yMain, bas: y };
}
function nomPiste(p){
  if(p.id === 'musique') return 'Musique';
  if(p.type === 'video') return 'Vidéo ' + (pistesDe('video').indexOf(p) + 2);
  return 'Sons ' + (pistesDe('audio').indexOf(p) + 1);
}
function vignette(p){ if(!p) return ''; const src = p.thumb || (p.video ? '' : p.url) || ''; return src ? `<img src="${E(src)}" alt="" draggable="false">` : (p.path ? `<img data-mkp="${E(p.path)}" alt="" draggable="false">` : ''); }
function choisi(o){ return MPB.sel.has(o); }
function clipHtml(x){
  const o = x.o, w = Math.max(3, x.d * MPB.pps), on = choisi(o) ? ' on' : '';
  const h = '<i class="mpb-h g"></i><i class="mpb-h d"></i>';
  if(x.type === 'video'){
    const p = photoDe(o.k), src = p && (p.thumb || (p.video ? '' : p.url));
    const fond = src ? `;background-image:url('${E(src).replace(/'/g, '%27')}')` : '';
    return `<div class="mpb-clip vid${on}" data-id="${E(o.id)}" style="left:${X(x.t).toFixed(1)}px;width:${w.toFixed(1)}px${fond}">${src ? '' : vignette(p)}<b>${p && p.video ? ic('play', 9) + ' ' : ''}${w > 34 ? fmtS(x.d) : ''}</b>${h}</div>`;
  }
  const muet = !sonBuf(o) ? ' charge' : '';
  return `<div class="mpb-clip son${on}${muet}" data-id="${E(o.id)}" style="left:${X(x.t).toFixed(1)}px;width:${w.toFixed(1)}px"><span>${ic('wave', 12)} ${E(o.nom || 'Son')}</span>${w > 90 && !mobile() ? `<b>${fmtS(x.d)}</b>` : ''}${h}</div>`;
}
function musiqueHtml(){
  const V = anVid(), plan = AN.plan || planNow(), m = V.musique; if(!m) return '';
  const fin = Math.min(plan.D, Math.max(0.5, (m.duree || plan.D) - (V.debut || 0)));
  return `<div class="mpb-clip mus" data-id="musique" style="left:${X(0).toFixed(1)}px;width:${Math.max(3, fin * MPB.pps).toFixed(1)}px" title="Glisse pour choisir le passage de la musique"><span>${ic('music', 12)} ${E(m.nom || 'Musique')}</span><b>dès ${anMinSec(V.debut || 0)}</b></div>`;
}
// Mise en place (sans tout redessiner) : largeurs, pistes, règle
function disposer(){
  const pi = piste(), w = wrap(); if(!pi || !w) return;
  normaliser();
  const V = anVid(), plan = planNow();
  pi.classList.add('mpb');
  // La piste principale à l'échelle exacte du temps
  pi.querySelectorAll('.mt-clip[data-n]').forEach(el => { const sg = plan.segs[Number(el.dataset.n)]; if(!sg) return; el.style.width = Math.max(3, (sg.t1 - sg.t0) * MPB.pps).toFixed(1) + 'px'; el.style.marginLeft = ''; el.classList.toggle('mpb-sel', !!(V.clips && choisi(V.clips[Number(el.dataset.n)]))); if(!el.querySelector('.mpb-h') && !sg.vide) el.insertAdjacentHTML('beforeend', '<i class="mpb-h g"></i><i class="mpb-h d"></i>'); });
  if(mobile()){ const m = Math.round(w.clientWidth / 2) + 'px'; pi.style.paddingLeft = m; pi.style.paddingRight = m; }
  const { L, yMain, bas } = lignes();
  pi.style.setProperty('padding-top', yMain + 'px', 'important');
  pi.style.setProperty('padding-bottom', Math.max(4, bas - yMain - H_M - 2) + 'px', 'important');
  MPB.x0 = x0(); MPB.lignes = L; MPB.yMain = yMain;
  // Les pistes en plus
  pi.querySelectorAll('.mpb-row,.mpb-lab').forEach(x => x.remove());
  const items = libres();
  let h = '';
  L.forEach(l => {
    const p = l.p, off = p.muet || p.cache || (p.id === 'musique' && V.musMuet);
    let inner = '';
    if(l.type === 'musique') inner = musiqueHtml();
    else items.filter(x => x.type === l.type && x.piste === p.id).forEach(x => { inner += clipHtml(x); });
    if(l.type !== 'musique' && !inner) inner = `<em class="mpb-vide" style="left:${(Math.max(MPB.x0, w.scrollLeft + 90) + 6).toFixed(0)}px">${l.type === 'video' ? 'Glisse ici une photo ou un plan' : 'Glisse ici un son'}</em>`;
    h += `<div class="mpb-row ${l.type}${off ? ' off' : ''}" data-p="${E(p.id)}" style="top:${l.y}px;height:${l.h}px">${inner}</div>`;
    const tog = l.type === 'video' ? `<button type="button" onclick="mpbBasculer('${E(p.id)}')" title="${p.cache ? 'Montrer cette piste' : 'Cacher cette piste'}">${ic(p.cache ? 'eyeOff' : 'eye', 13)}</button>` : `<button type="button" onclick="mpbBasculer('${E(p.id)}')" title="${off ? 'Remettre le son' : 'Couper le son de cette piste'}">${ic(off ? 'volumeOff' : 'volume', 13)}</button>`;
    h += `<div class="mpb-lab${off ? ' off' : ''}" data-p="${E(p.id)}" style="top:${l.y + 1}px">${tog}<span>${E(nomPiste(p))}</span></div>`;
  });
  if(L.length) h += `<div class="mpb-lab" data-p="principale" style="top:${yMain + 1}px"><span>Vidéo 1</span></div>`;
  pi.insertAdjacentHTML('beforeend', h);
  if(typeof mkHydrate === 'function') try { pi.querySelectorAll('.mpb-row img[data-mkp]').length && mkHydrate(pi); } catch(e){}
  // Largeur totale : jusqu'au dernier élément
  const padR = mobile() ? Math.round(w.clientWidth / 2) : 64;
  pi.style.minWidth = Math.ceil(X(finT()) + padR) + 'px';
  placerEtiquettes();
  // La table de montage a changé de hauteur : l'aperçu se recalcule (montage-pro.js)
  const ep = document.getElementById('edPiste'), hp = ep ? ep.offsetHeight : 0;
  if(MPB.hPiste != null && Math.abs(hp - MPB.hPiste) > 2){ clearTimeout(MPB.rzT); MPB.rzT = setTimeout(() => window.dispatchEvent(new Event('resize')), 30); }
  MPB.hPiste = hp;
  if(!w.mpbBranche){ w.mpbBranche = true; w.addEventListener('scroll', placerEtiquettes, { passive: true }); }
  outilsTete();
}
function placerEtiquettes(){ const w = wrap(), pi = piste(); if(!w || !pi) return; const x = w.scrollLeft + 3; pi.querySelectorAll('.mpb-lab').forEach(l => { l.style.left = x + 'px'; }); }
// La règle : graduations selon le zoom
function regle(){
  const pi = piste(); if(!pi) return;
  const rg = pi.querySelector('.mpx-regle'); if(!rg) return;
  const pps = MPB.pps, fin = finT();
  const pas = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600].find(s => s * pps >= 58) || 600;
  const sous = pas <= 1 ? (pps * pas / 5 >= 8 ? pas / 5 : pas / 2) : pas === 2 ? 0.5 : pas / 5;
  let h = '';
  for(let k = 0; k * sous <= fin + 0.0001 && k < 4000; k++){
    const s = k * sous, x = X(s), lab = Math.abs(s / pas - Math.round(s / pas)) < 0.001;
    h += `<i style="left:${x.toFixed(1)}px" class="${lab ? 'g' : ''}"></i>`;
    if(lab){ const m = Math.floor(s / 60), sec = s - m * 60; const txt = pas < 1 ? `${m}:${String(Math.floor(sec)).padStart(2, '0')},${Math.round((sec % 1) * 10)}` : `${m}:${String(Math.round(sec)).padStart(2, '0')}`; h += `<span style="left:${x.toFixed(1)}px${x < 14 ? ';transform:none' : ''}">${txt}</span>`; }
  }
  rg.innerHTML = h;
  rg.style.width = Math.ceil(X(fin) + 30) + 'px';
}
// Les boutons de zoom (ordinateur : en haut de la table de montage)
function outilsTete(){
  const t = document.querySelector('#mtZone .mt-tete'); if(!t || t.querySelector('.mpb-tete')) return;
  t.insertAdjacentHTML('beforeend', `<div class="mpb-tete">
    <button type="button" class="mpb-tb ${MPB.aimant ? 'on' : ''}" id="mpbAimantT" onclick="mpbAimant()" title="Aimant (${E(touchesTxt('aimant'))})">${ic('magnet', 15)}</button>
    <button type="button" class="mpb-tb" onclick="mpbZoom(1/1.5)" title="Dézoomer (${E(touchesTxt('zoomMoins'))})">${ic('zoomOut', 15)}</button>
    <input type="range" class="mpb-zr" min="0" max="100" step="1" value="${zVersR(MPB.pps)}" oninput="mpbZoomA(this.value)" title="Zoom">
    <button type="button" class="mpb-tb" onclick="mpbZoom(1.5)" title="Zoomer (${E(touchesTxt('zoomPlus'))})">${ic('zoomIn', 15)}</button>
    <button type="button" class="mpb-tb" onclick="mpbAjuster()" title="Tout voir (${E(touchesTxt('ajuster'))})">${ic('fit', 15)}</button>
    <button type="button" class="mpb-tb mpb-tbp" onclick="mpbPistes()" title="Pistes : ajouter, couper le son, cacher">${ic('layers', 15)}<span>Pistes</span></button></div>`);
}
function zVersR(p){ return Math.round(100 * Math.log(p / ZMIN) / Math.log(ZMAX / ZMIN)); }
function rVersZ(r){ return ZMIN * Math.pow(ZMAX / ZMIN, Number(r) / 100); }

// ---------- Zoom ----------
function zoomerA(pps, clientX){
  const w = wrap(); if(!w) return;
  pps = Math.max(ZMIN, Math.min(ZMAX, pps));
  if(Math.abs(pps - MPB.pps) < 0.01) return;
  const r = w.getBoundingClientRect();
  const ax = clientX != null ? clientX - r.left : Math.max(20, Math.min(w.clientWidth - 20, X(Math.min(AN.t, finT())) - w.scrollLeft));
  const tA = T(w.scrollLeft + ax);
  MPB.pps = pps; lsSet('mpb.zoom', Math.round(pps * 100) / 100);
  disposer(); regle();
  if(!centreActif()) w.scrollLeft = Math.max(0, X(tA) - ax);
  anApercuUneFois();
  if(typeof window.rtMarques === 'function') try { window.rtMarques(); } catch(e){}
  const zr = document.querySelector('.mpb-zr'); if(zr && document.activeElement !== zr) zr.value = zVersR(MPB.pps);
}
window.mpbZoom = function(k){ zoomerA(MPB.pps * k); };
window.mpbZoomA = function(v){ zoomerA(rVersZ(v)); };
window.mpbAjuster = function(){ const w = wrap(); if(!w) return; const place = (mobile() ? w.clientWidth * 0.46 : w.clientWidth - MPB.x0 - 76); zoomerA(place / Math.max(1, finT())); if(!centreActif()) w.scrollLeft = 0; };
// Ctrl + molette (ou pincer sur le pavé tactile) : zoom ; Maj + molette : défilement vertical
document.addEventListener('wheel', e => {
  const w = e.target && e.target.closest && e.target.closest('#mtZone .mt-piste-w'); if(!w || !pro()) return;
  if(e.ctrlKey || e.metaKey){ e.preventDefault(); e.stopPropagation(); zoomerA(MPB.pps * Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0025)), e.clientX); return; }
  if((e.shiftKey || e.altKey) && w.scrollHeight > w.clientHeight){ e.preventDefault(); e.stopPropagation(); w.scrollTop += (e.deltaY || e.deltaX); }
}, { passive: false, capture: true });
// Pincer (téléphone, tablette)
document.addEventListener('touchstart', e => {
  if(e.touches.length !== 2 || !pro()) return;
  const w = wrap(); if(!w || ![...e.touches].every(t => w.contains(t.target))) return;
  const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
  MPB.pinch = { d0: Math.max(10, d), p0: MPB.pps, cx: (e.touches[0].clientX + e.touches[1].clientX) / 2 };
  if(MPB.drag) finDrag(true);
  if(MPX.appui){ clearTimeout(MPX.appui.tim); MPX.appui = null; }
}, { passive: true, capture: true });
document.addEventListener('touchmove', e => {
  if(MPB.pinch && e.touches.length === 2){
    e.preventDefault();
    const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    zoomerA(MPB.pinch.p0 * d / MPB.pinch.d0, centreActif() ? null : MPB.pinch.cx);
    return;
  }
  if(MPB.drag && MPB.drag.actif) e.preventDefault();
}, { passive: false, capture: true });
document.addEventListener('touchend', e => { if(MPB.pinch && e.touches.length < 2) MPB.pinch = null; }, { capture: true });

// ============================================================
// 5. AIMANT
// ============================================================
function cibles(exclus, sansPrincipaleApres){
  const plan = AN.plan || planNow(), L = [0, AN.t, plan.Dp, plan.D];
  plan.segs.forEach((s, n) => { if(sansPrincipaleApres != null && n >= sansPrincipaleApres) return; L.push(s.t0, s.t1); });
  libres().forEach(x => { if(!exclus || !exclus.has(x.o)) L.push(x.t, x.t + x.d); });
  (AN.beats || []).forEach(b => L.push(b));
  return L;
}
function aimanter(bords, exclus, sansApres){
  if(!MPB.aimant) return null;
  const seuil = 10 / MPB.pps, C = cibles(exclus, sansApres);
  let best = null;
  bords.forEach(b => C.forEach(c => { const d = c - b; if(Math.abs(d) <= seuil && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, t: c }; }));
  return best;
}
window.mpbAimant = function(on){
  MPB.aimant = on == null ? !MPB.aimant : !!on; lsSet('mpb.aimant', MPB.aimant);
  majBoutons();
  agToast(MPB.aimant ? 'Aimant activé : les bords s\'accrochent aux coupes' : 'Aimant désactivé', 'info');
};
function majBoutons(){
  [['mpbAimantB', MPB.aimant], ['mpbAimantT', MPB.aimant], ['mpbMultiB', MPB.multi]].forEach(([id, on]) => { const b = document.getElementById(id); if(b) b.classList.toggle('on', !!on); });
  const ed = document.querySelector('.ed.mpx'); if(ed) ed.classList.toggle('mpb-multi-on', MPB.multi);
}

// ============================================================
// 6. GLISSER : déplacer, trim, changer de piste
// ============================================================
function ligneSous(clientY){
  const pi = piste(); if(!pi) return null;
  const y = clientY - pi.getBoundingClientRect().top;
  if(y >= MPB.yMain - 2 && y <= MPB.yMain + H_M + 4) return { type: 'principale' };
  const l = (MPB.lignes || []).find(l => y >= l.y - 2 && y <= l.y + l.h + 2);
  if(l) return l;
  if(y < MPB.yMain - 2) return { type: 'au-dessus' };
  return null;
}
function marque(cls, x, y, h, txt){
  const pi = piste(); if(!pi) return;
  let m = pi.querySelector('.' + cls); if(!m){ m = document.createElement(txt != null ? 'div' : 'i'); m.className = cls; pi.appendChild(m); }
  m.style.display = 'block'; m.style.left = x + 'px';
  if(y != null) m.style.top = y + 'px';
  if(h != null) m.style.height = h + 'px';
  if(txt != null) m.textContent = txt;
}
function cacherMarques(){ const pi = piste(); if(pi) pi.querySelectorAll('.mpb-snap,.mpb-bulle,.mpb-ins').forEach(m => { m.style.display = 'none'; }); document.querySelectorAll('.mpb-row.cible').forEach(r => r.classList.remove('cible')); }

document.addEventListener('pointerdown', e => {
  MPB.bloque = 0;   // nouveau geste : plus rien à bloquer
  if(!pro() || MPB.pinch) return;
  if(e.pointerType === 'mouse' && e.button !== 0) return;
  const tg = e.target; if(!tg || !tg.closest) return;
  const fc = tg.closest('#mtPiste .mpb-clip'), mc = tg.closest('#mtPiste .mt-clip[data-n]'), h = tg.closest('.mpb-h');
  if(MPX.lame){
    if(fc && fc.dataset.id !== 'musique'){ e.preventDefault(); e.stopPropagation(); MPX.bloqueClic = Date.now(); MPB.bloque = Date.now(); const it = itemParEl(fc); if(it) couperLibre(it, T(e.clientX - piste().getBoundingClientRect().left)); }
    return;
  }
  if(!fc && !mc) return;
  const w = wrap();
  const base = { x0: e.clientX, y0: e.clientY, s0: w ? w.scrollLeft : 0, id: e.pointerId, souris: e.pointerType === 'mouse', actif: false };
  if(h && (fc || mc)){
    // Poignée : on tire le début ou la fin
    if(mc && !(mc.classList.contains('on') || mc.classList.contains('mpb-sel')) && !base.souris) return;
    e.preventDefault(); e.stopPropagation();
    if(MPX.appui){ clearTimeout(MPX.appui.tim); MPX.appui = null; }
    const cote = h.classList.contains('g') ? 'g' : 'd';
    if(fc){ const it = itemParEl(fc); if(!it) return; MPB.drag = Object.assign(base, { mode: 'trim', cote, it, el: fc, t0: it.t, d0: it.d, actif: true }); }
    else { const n = Number(mc.dataset.n), plan = AN.plan || planNow(), sg = plan.segs[n]; if(!sg || sg.vide) return; MPB.drag = Object.assign(base, { mode: 'mtrim', cote, n, sg, el: mc, d0: sg.t1 - sg.t0, actif: true }); }
    ecouter(); return;
  }
  if(fc){
    const it = fc.dataset.id === 'musique' ? { musique: true } : itemParEl(fc); if(!it) return;
    MPB.drag = Object.assign(base, { mode: it.musique ? 'slip' : 'move', it, el: fc, deb0: anVid().debut || 0 });
    if(!base.souris){
      // Tactile : appui long pour attraper (sinon la piste défile)
      const d = MPB.drag;
      d.tim = setTimeout(() => { if(MPB.drag !== d || d.bouge) return; demarrer(d); try { navigator.vibrate && navigator.vibrate(15); } catch(er){} }, 300);
    }
    ecouter(); return;
  }
  if(mc && base.souris && !mc.classList.contains('mpx-vide')){
    MPB.drag = Object.assign(base, { mode: 'mmove', n: Number(mc.dataset.n), el: mc });
    ecouter();
  }
}, true);
function itemParEl(el){ const id = el.dataset.id; return libres().find(x => String(x.o.id) === id) || null; }
function ecouter(){ document.addEventListener('pointermove', bouger, true); document.addEventListener('pointerup', lacher, true); document.addEventListener('pointercancel', annulerDrag, true); }
function oublier(){ document.removeEventListener('pointermove', bouger, true); document.removeEventListener('pointerup', lacher, true); document.removeEventListener('pointercancel', annulerDrag, true); }
function demarrer(d){
  d.actif = true;
  if(MPX.appui){ clearTimeout(MPX.appui.tim); MPX.appui = null; }
  if(d.mode === 'move'){
    // Le groupe : l'élément attrapé et, s'il fait partie de la sélection, les autres éléments libres choisis
    if(!choisi(d.it.o)){ MPB.sel = new Set([d.it.o]); MT.sel = null; }
    d.groupe = libres().filter(x => choisi(x.o));
    d.groupe.forEach(x => { x.el = piste().querySelector(`.mpb-clip[data-id="${CSS.escape(String(x.o.id))}"]`); if(x.el) x.el.classList.add('drag', 'on'); });
  }
  if(d.mode === 'mmove'){
    const V = anVid(), c = V.clips ? V.clips[d.n] : null;
    const groupe = c && choisi(c) ? [...piste().querySelectorAll('.mt-clip[data-n]')].filter(el => choisi(V.clips[Number(el.dataset.n)])) : [d.el];
    d.groupe = groupe; groupe.forEach(el => el.classList.add('drag'));
    try { d.el.dispatchEvent(new PointerEvent('pointercancel', { bubbles: false, pointerId: d.id })); } catch(er){}
  }
  if(d.el) d.el.classList.add('drag');
}
function dx(d, e){ const w = wrap(); return (e.clientX - d.x0) + ((w ? w.scrollLeft : 0) - d.s0); }
function defilerBord(e){
  const w = wrap(); if(!w) return;
  const r = w.getBoundingClientRect(), m = 34;
  if(e.clientX < r.left + m) w.scrollLeft -= 10; else if(e.clientX > r.right - m) w.scrollLeft += 10;
}
function bouger(e){
  const d = MPB.drag; if(!d || e.pointerId !== d.id) return;
  if(!d.actif){
    const loin = Math.abs(e.clientX - d.x0) > (d.souris ? 4 : 8) || Math.abs(e.clientY - d.y0) > (d.souris ? 4 : 8);
    if(!loin) return;
    if(!d.souris){ d.bouge = true; clearTimeout(d.tim); MPB.drag = null; oublier(); return; }   // le doigt fait défiler la piste
    if(d.mode === 'mmove' && d.el.classList.contains('drag')){ MPB.drag = null; oublier(); return; }  // montage.js a déjà pris la main
    demarrer(d);
  }
  e.preventDefault();
  const pi = piste(); if(!pi) return;
  const ddx = dx(d, e), dt = ddx / MPB.pps;
  if(d.mode === 'move') bougerLibres(d, e, dt);
  else if(d.mode === 'trim') trimLibre(d, dt);
  else if(d.mode === 'mtrim') trimPrincipale(d, dt);
  else if(d.mode === 'mmove') bougerPrincipale(d, e, ddx);
  else if(d.mode === 'slip') glisserMusique(d, dt);
  if(d.mode === 'move' || d.mode === 'mmove') defilerBord(e);
}
// --- Déplacer des éléments libres ---
function bougerLibres(d, e, dt){
  const G = d.groupe || [d.it], exclus = new Set(G.map(x => x.o));
  const minT = Math.min(...G.map(x => x.t));
  dt = Math.max(-minT, dt);
  const a = aimanter([d.it.t + dt, d.it.t + d.it.d + dt], exclus);
  if(a){ dt = Math.max(-minT, dt + a.d); marque('mpb-snap', X(a.t)); } else cacherMarques();
  d.dt = dt;
  // Une seule pièce : elle peut changer de piste (même genre)
  d.dest = null;
  document.querySelectorAll('.mpb-row.cible').forEach(r => r.classList.remove('cible'));
  let dy = 0;
  if(G.length === 1){
    const l = ligneSous(e.clientY);
    if(l && l.p && l.type === d.it.type){ d.dest = l.p.id; const row = piste().querySelector(`.mpb-row[data-p="${CSS.escape(l.p.id)}"]`); if(row){ row.classList.add('cible'); const src = piste().querySelector(`.mpb-row[data-p="${CSS.escape(d.it.piste)}"]`); dy = row.offsetTop - (src ? src.offsetTop : row.offsetTop); } }
    else if(d.it.type === 'video' && l && (l.type === 'principale')) { d.dest = 'principale'; dy = MPB.yMain - (MPB.lignes.find(x => x.p.id === d.it.piste) || { y: MPB.yMain }).y; }
    else if(d.it.type === 'video' && l && l.type === 'au-dessus'){ d.dest = 'nouvelle'; dy = REGLE - (MPB.lignes.find(x => x.p.id === d.it.piste) || { y: REGLE }).y; }
  }
  G.forEach(x => { if(x.el) x.el.style.transform = `translate(${(dt * MPB.pps).toFixed(1)}px,${dy}px)`; });
  marque('mpb-bulle', X(d.it.t + dt), 0, null, d.dest === 'principale' ? 'Dans la piste principale' : d.dest === 'nouvelle' ? 'Nouvelle piste vidéo' : tcCourt(d.it.t + dt));
}
// --- Trim d'un élément libre ---
function trimLibre(d, dt){
  const it = d.it, o = it.o, exclus = new Set([o]);
  let t = d.t0, dur = d.d0;
  if(d.cote === 'g'){
    let mn = -d.t0;                                         // pas avant 0
    if(it.type === 'video'){ const p = photoDe(o.k); if(p && p.video) mn = Math.max(mn, -(o.vin || 0) / (o.vit || 1)); }
    else mn = Math.max(mn, -(o.off || 0));
    const mx = d.d0 - 0.2;
    if(it.type === 'video' && !(photoDe(o.k) || {}).video) mn = -d.t0;   // une photo : pas de limite
    dt = Math.max(mn, Math.min(mx, dt));
    const a = aimanter([d.t0 + dt], exclus); if(a){ dt = Math.max(mn, Math.min(mx, dt + a.d)); marque('mpb-snap', X(a.t)); } else cacherMarques();
    t = d.t0 + dt; dur = d.d0 - dt;
  } else {
    let mx = 3600;
    if(it.type === 'video'){ const m = vidMax(o); if(m != null) mx = m - d.d0; } else { const b = sonBuf(o); if(b) mx = b.duration - (o.off || 0) - d.d0; }
    dt = Math.max(0.2 - d.d0, Math.min(mx, dt));
    const a = aimanter([d.t0 + d.d0 + dt], exclus); if(a){ dt = Math.max(0.2 - d.d0, Math.min(mx, dt + a.d)); marque('mpb-snap', X(a.t)); } else cacherMarques();
    dur = d.d0 + dt;
  }
  d.nt = t; d.nd = dur;
  d.el.style.left = X(t).toFixed(1) + 'px'; d.el.style.width = Math.max(3, dur * MPB.pps).toFixed(1) + 'px';
  const b = d.el.querySelector('b'); if(b) b.textContent = fmtS(dur);
  marque('mpb-bulle', X(d.cote === 'g' ? t : t + dur), 0, null, fmtS(dur));
}
// --- Trim d'un plan de la piste principale ---
function trimPrincipale(d, dt){
  const sg = d.sg, p = CR.photos[sg.i] || {}, vit = sg.vit || 1;
  const vin0 = p.video ? (sg.vin != null ? sg.vin : (typeof rvVinAuto === 'function' ? rvVinAuto(sg) : 0)) : 0;
  let nd;
  if(d.cote === 'd'){
    let mx = 600; if(p.video && p.vdur) mx = (p.vdur - vin0) / vit;
    nd = Math.max(0.2, Math.min(mx, d.d0 + dt));
    const a = aimanter([sg.t0 + nd], null, d.n); if(a){ nd = Math.max(0.2, Math.min(mx, nd + a.d)); marque('mpb-snap', X(a.t)); } else cacherMarques();
    d.el.style.width = Math.max(3, nd * MPB.pps).toFixed(1) + 'px';
    marque('mpb-bulle', X(sg.t0 + nd), 0, null, fmtS(nd));
  } else {
    let mn = p.video ? -vin0 / vit : -60;
    let cut = Math.max(mn, Math.min(d.d0 - 0.2, dt));
    const a = aimanter([sg.t0 + cut], null, d.n); if(a){ cut = Math.max(mn, Math.min(d.d0 - 0.2, cut + a.d)); marque('mpb-snap', X(a.t)); } else cacherMarques();
    if(!p.video) cut = Math.max(cut, -60);
    nd = d.d0 - cut;
    // Pendant le geste : le bord gauche suit le doigt, les plans suivants ne bougent pas encore
    d.el.style.marginLeft = (cut * MPB.pps).toFixed(1) + 'px';
    d.el.style.width = Math.max(3, nd * MPB.pps).toFixed(1) + 'px';
    if(cut < 0) d.el.style.marginLeft = (cut * MPB.pps).toFixed(1) + 'px';
    d.cut = cut; d.vin0 = vin0;
    marque('mpb-bulle', X(sg.t0 + cut), 0, null, fmtS(nd));
  }
  d.nd = nd;
  const b = d.el.querySelector(':scope > b'); if(b) b.textContent = fmtS(nd);
}
// --- Déplacer des plans de la piste principale (souris) ---
function bougerPrincipale(d, e, ddx){
  const G = d.groupe || [d.el];
  G.forEach(el => { el.style.transform = `translateX(${ddx.toFixed(1)}px)`; });
  const l = ligneSous(e.clientY);
  document.querySelectorAll('.mpb-row.cible').forEach(r => r.classList.remove('cible'));
  d.incrust = null;
  if(G.length === 1 && l && (l.type === 'video' || l.type === 'au-dessus')){
    const sg = (AN.plan || planNow()).segs[d.n];
    let t = Math.max(0, sg.t0 + ddx / MPB.pps);
    const a = aimanter([t, t + (sg.t1 - sg.t0)], null); if(a){ t = Math.max(0, t + a.d); marque('mpb-snap', X(a.t)); } else cacherMarques();
    d.incrust = { t, piste: l.type === 'video' ? l.p.id : null };
    G[0].style.transform = `translate(${((t - sg.t0) * MPB.pps).toFixed(1)}px,${(l.type === 'video' ? l.y : REGLE) - MPB.yMain}px)`;
    if(l.type === 'video'){ const row = piste().querySelector(`.mpb-row[data-p="${CSS.escape(l.p.id)}"]`); if(row) row.classList.add('cible'); }
    marque('mpb-bulle', X(t), 0, null, 'En incrustation · ' + tcCourt(t));
    const ins = piste().querySelector('.mpb-ins'); if(ins) ins.style.display = 'none';
    return;
  }
  cacherMarques();
  // La place visée : selon le centre du bloc attrapé
  const autres = [...piste().querySelectorAll('.mt-clip[data-n]')].filter(el => !G.includes(el));
  const r0 = d.el.getBoundingClientRect(), cx = r0.left + r0.width / 2;
  let k = 0; autres.forEach(el => { const r = el.getBoundingClientRect(); if(r.left + r.width / 2 < cx) k++; });
  d.k = k;
  const ref = autres[k] || autres[autres.length - 1];
  const x = ref ? (autres[k] ? ref.offsetLeft : ref.offsetLeft + ref.offsetWidth) : MPB.x0;
  marque('mpb-ins', x - 1.5, MPB.yMain, H_M + 4);
}
// --- La musique : glisser change le passage ---
function glisserMusique(d, dt){
  const V = anVid(), m = V.musique; if(!m) return;
  const D = (AN.plan || planNow()).D, mx = Math.max(0, (m.duree || 0) - D);
  d.deb = Math.max(0, Math.min(mx, d.deb0 - dt));
  const b = d.el.querySelector('b'); if(b) b.textContent = 'dès ' + anMinSec(d.deb);
  d.el.style.backgroundPosition = `${(-d.deb * MPB.pps).toFixed(0)}px 0`;
  marque('mpb-bulle', X(0) + 40, 0, null, 'Musique dès ' + tcCourt(d.deb));
}
function annulerDrag(e){ const d = MPB.drag; if(!d || (e && (e.pointerId !== d.id || !e.isTrusted))) return; finDrag(true); }
function finDrag(annule){
  const d = MPB.drag; MPB.drag = null; oublier(); cacherMarques();
  if(!d) return;
  clearTimeout(d.tim);
  if(d.actif) MPB.bloque = Date.now();
  if(annule && d.actif) mtMaj();
}
function lacher(e){
  const d = MPB.drag; if(!d || e.pointerId !== d.id) return;
  finDrag(false);
  if(!d.actif) return;
  MPX.bloqueClic = Date.now();
  e.preventDefault(); e.stopPropagation();
  try {
    if(d.mode === 'move') poserLibres(d);
    else if(d.mode === 'trim') finirTrimLibre(d);
    else if(d.mode === 'mtrim') finirTrimPrincipale(d);
    else if(d.mode === 'mmove') poserPrincipale(d);
    else if(d.mode === 'slip'){ if(d.deb != null && Math.abs(d.deb - d.deb0) > 0.01){ anDebut(Math.round(d.deb * 10) / 10); agToast('Musique : passage dès ' + anMinSec(d.deb), 'info'); } mtMaj(); }
  } catch(er){ console.warn('montage-pistes', er); mtMaj(); }
}
function poserLibres(d){
  const G = d.groupe || [d.it], dt = d.dt || 0;
  if(Math.abs(dt) < 0.005 && !d.dest){ mtMaj(); return; }
  avant();
  const V = anVid();
  if(d.dest === 'principale' && G.length === 1 && G[0].type === 'video'){ versPrincipale(G[0].o, G[0].t + dt); return; }
  // On déplace, puis chacun trouve une place libre (même piste si possible)
  const enAttente = new Set(G.map(x => x.o));
  G.slice().sort((a, b) => a.t - b.t).forEach(x => {
    const o = x.o, t = r2(Math.max(0, x.t + dt)), dur = x.d;
    enAttente.delete(o);
    let voulue = x.piste;
    if(d.dest && d.dest !== 'nouvelle' && d.dest !== 'principale') voulue = d.dest;
    const autres = new Set([o].concat([...enAttente]));
    const p = d.dest === 'nouvelle' ? nouvellePiste('video') : pistePour(x.type, t, dur, voulue, autres);
    o.t = t; poser(o, p);
  });
  agToast(G.length > 1 ? G.length + ' éléments déplacés' : 'Déplacé à ' + tcCourt(G[0].o.t), 'info');
  mtMaj();
}
function finirTrimLibre(d){
  if(d.nd == null || (Math.abs(d.nd - d.d0) < 0.005 && Math.abs(d.nt - d.t0) < 0.005)){ mtMaj(); return; }
  avant();
  const o = d.it.o, decal = d.nt - d.t0;
  if(d.it.type === 'video'){ const p = photoDe(o.k); if(p && p.video && d.cote === 'g') o.vin = r2(Math.max(0, (o.vin || 0) + decal * (o.vit || 1))); o.t = r2(d.nt); o.d = r2(d.nd); }
  else { if(d.cote === 'g') o.off = r2(Math.max(0, (o.off || 0) + decal)); o.t = r2(d.nt); o.dur = r2(d.nd); }
  agToast('Durée : ' + fmtS(d.nd), 'info');
  mtMaj();
}
function finirTrimPrincipale(d){
  if(d.nd == null || Math.abs(d.nd - d.d0) < 0.005){ mtMaj(); return; }
  avant();
  const V = anVid(), c = V.clips[d.n]; if(!c){ mtMaj(); return; }
  const p = CR.photos[d.sg.i] || {};
  if(d.cote === 'g' && p.video) c.vin = r2(Math.max(0, d.vin0 + d.cut * (c.vit || 1)));
  c.d = r2(d.nd);
  MT.sel = { t: 'c', n: d.n }; MPB.sel = new Set([c]);
  agToast('Plan ' + (d.n + 1) + ' : ' + fmtS(d.nd), 'info');
  mtMaj();
}
function poserPrincipale(d){
  if(d.incrust){ const V = anVid(); versIncrust(d.n, d.incrust.t, d.incrust.piste); return; }
  if(d.k == null){ mtMaj(); return; }
  const V = anVid();
  avant();
  const L = anVid().clips;
  const pris = d.groupe.map(el => Number(el.dataset.n)).sort((a, b) => a - b);
  const bloc = pris.map(n => L[n]), reste = L.filter((c, n) => !pris.includes(n));
  const k = Math.max(0, Math.min(reste.length, d.k));
  const avantOrdre = L.slice();
  reste.splice(k, 0, ...bloc);
  V.clips = reste;
  if(avantOrdre.every((c, i) => c === V.clips[i])){ MT.undo.pop(); mtMaj(); return; }
  const n = V.clips.indexOf(L[d.n]);
  if(bloc.length === 1){ MT.sel = { t: 'c', n }; MPB.sel = new Set([L[d.n]]); } else { MT.sel = null; MPB.sel = new Set(bloc); }
  agToast(bloc.length > 1 ? bloc.length + ' plans déplacés' : 'Plan déplacé', 'info');
  mtMaj();
}

// ============================================================
// 7. ACTIONS : incruster, remettre, couper, supprimer, dupliquer
// ============================================================
function reelsPrincipale(){ const V = anVid(); return (V.clips || (AN.plan || planNow()).segs).filter(c => !estVide(c)).length; }
// Un plan de la piste principale passe en incrustation (au-dessus)
function versIncrust(n, t, pisteId){
  const plan = AN.plan || planNow(), sg = plan.segs[n]; if(!sg || sg.vide) return;
  if(reelsPrincipale() <= 1){ agToast('Il faut garder au moins un plan dans la piste principale', 'info'); mtMaj(); return; }
  avant();
  const V = anVid(), c = V.clips[n], p = CR.photos[sg.i] || {};
  const vin = p.video ? (c.vin != null ? c.vin : (typeof rvVinAuto === 'function' ? rvVinAuto(sg) : 0)) : undefined;
  t = r2(Math.max(0, t == null ? sg.t0 : t));
  const o = Object.assign({ id: uid('o'), k: c.k, t, d: r2(c.d) }, p.video ? { vin, vit: c.vit || 1 } : {});
  V.clips.splice(n, 1);
  const pi = pistePour('video', t, o.d, pisteId);
  pi.clips.push(o);
  MT.sel = null; MPB.sel = new Set([o]);
  agToast(`Plan passé en incrustation (${nomPiste(pi)}) : il passe par-dessus la piste principale`);
  mtMaj(true);
}
window.mpbIncruster = function(){
  if(!pro()) return;
  const n = MT.sel && MT.sel.t === 'c' ? MT.sel.n : -1; if(n < 0){ agToast('Choisis d\'abord un plan', 'info'); return; }
  anStop(); versIncrust(n, null, null);
};
// Une incrustation revient dans la piste principale (à l'endroit où elle était)
function versPrincipale(o, t){
  const V = anVid(), plan = AN.plan || planNow();
  const p = photoDe(o.k) || {};
  const pi = pisteDeItem(o); if(pi && pi.clips) pi.clips.splice(pi.clips.indexOf(o), 1);
  let n = plan.segs.findIndex(sg => (sg.t0 + sg.t1) / 2 > (t == null ? o.t : t)); if(n < 0) n = V.clips.length;
  const c = Object.assign({ k: o.k, d: r2(o.d), mvt: p.video ? 'aucun' : 'kb', tr: 'coupe', trD: 0 }, p.video ? { vin: o.vin || 0, vit: o.vit || 1 } : {});
  V.clips.splice(Math.min(n, V.clips.length), 0, c);
  MPB.sel = new Set([c]); MT.sel = { t: 'c', n: V.clips.indexOf(c) };
  agToast('Remis dans la piste principale (plan ' + (V.clips.indexOf(c) + 1) + ')');
  mtMaj(true);
}
window.mpbVersPrincipale = function(){
  const o = [...MPB.sel].find(x => itemDe(x) && itemDe(x).type === 'video'); if(!o) return;
  anStop(); avant(); versPrincipale(o);
};
// Couper un élément libre à un moment donné
function couperLibre(it, t){
  const o = it.o;
  if(t - it.t <= 0.15 || it.t + it.d - t <= 0.15){ agToast('Trop près du bord (moins de 0,15 s)', 'info'); return false; }
  anStop(); avant();
  const a = r2(t - it.t);
  if(it.type === 'video'){
    const p = photoDe(o.k) || {}, b = Object.assign({}, o, { id: uid('o'), t: r2(t), d: r2(o.d - a) });
    if(p.video) b.vin = r2((o.vin || 0) + a * (o.vit || 1));
    o.d = a; const pi = pisteDeItem(o); pi.clips.push(b); MPB.sel = new Set([b]);
  } else {
    const dur = sonDur(o), b = Object.assign({}, o, { id: o.id + '-c' + Math.random().toString(36).slice(2, 5), t: r2(t), off: r2((o.off || 0) + a), dur: r2(dur - a) });
    if(typeof ML !== 'undefined') ML.buf[b.id] = ML.buf[o.id];
    o.dur = a; anVid().sons.push(b); MPB.sel = new Set([b]);
  }
  MT.sel = null;
  try { navigator.vibrate && navigator.vibrate(15); } catch(e){}
  agToast('Coupé en deux', 'info');
  mtMaj();
  return true;
}
function selLibres(){ return libres().filter(x => choisi(x.o)); }
function selPrincipale(){ const V = anVid(); return V.clips ? V.clips.filter(c => choisi(c)) : []; }
function supprimerSel(ripple){
  const L = selLibres(), M = selPrincipale();
  if(!L.length && !M.length) return false;
  const V = anVid();
  const reels = (V.clips || []).filter(c => !estVide(c));
  if(M.length && reels.every(c => M.includes(c))){ agToast('Il faut garder au moins un plan dans la piste principale', 'info'); return true; }
  anStop(); avant();
  L.forEach(x => {
    if(x.type === 'audio'){ const i = V.sons.indexOf(x.o); if(i >= 0) V.sons.splice(i, 1); }
    else { const pi = pisteDeItem(x.o); if(pi) pi.clips.splice(pi.clips.indexOf(x.o), 1); }
  });
  if(M.length){
    const C = V.clips;
    if(ripple) V.clips = C.filter(c => !M.includes(c));
    else {
      // Comme « Supprimer » du lot A : un vide noir garde la place, les autres plans ne bougent pas
      const R = [];
      C.forEach(c => { if(M.includes(c)){ const last = R[R.length - 1]; if(last && estVide(last)) last.d = r2(last.d + c.d); else R.push({ k: VIDE, vide: true, d: c.d, tr: 'coupe', trD: 0 }); } else if(estVide(c) && R.length && estVide(R[R.length - 1])) R[R.length - 1].d = r2(R[R.length - 1].d + c.d); else R.push(c); });
      while(R.length && estVide(R[R.length - 1])) R.pop();
      V.clips = R;
    }
  }
  nettoyerPhotos();
  const n = L.length + M.length;
  MPB.sel.clear(); MT.sel = null;
  agToast(n > 1 ? n + ' éléments supprimés' : 'Supprimé');
  mtMaj(true);
  return true;
}
function dupliquerSel(){
  const L = selLibres(), M = selPrincipale();
  if(!L.length && !M.length) return false;
  anStop(); avant();
  const V = anVid(), nouv = [];
  if(M.length){
    const C = V.clips, der = Math.max(...M.map(c => C.indexOf(c)));
    const copies = C.filter(c => M.includes(c)).map(c => Object.assign({}, c));
    C.splice(der + 1, 0, ...copies); nouv.push(...copies);
  }
  if(L.length){
    const debut = Math.min(...L.map(x => x.t)), fin = Math.max(...L.map(x => x.t + x.d)), ecart = r2(fin - debut);
    L.slice().sort((a, b) => a.t - b.t).forEach(x => {
      const t = r2(x.t + ecart);
      if(x.type === 'video'){ const b = Object.assign({}, x.o, { id: uid('o'), t }); const pi = pistePour('video', t, x.d, x.piste, new Set([b])); pi.clips.push(b); nouv.push(b); }
      else { const b = Object.assign({}, x.o, { id: x.o.id + '-d' + Math.random().toString(36).slice(2, 5), t }); if(typeof ML !== 'undefined') ML.buf[b.id] = ML.buf[x.o.id]; b.piste = null; V.sons.push(b); b.piste = pistePour('audio', t, x.d, x.piste, new Set([b])).id; nouv.push(b); }
    });
  }
  MPB.sel = new Set(nouv); MT.sel = null;
  if(nouv.length === 1 && M.length === 1){ MT.sel = { t: 'c', n: V.clips.indexOf(nouv[0]) }; }
  agToast(nouv.length > 1 ? nouv.length + ' éléments dupliqués' : 'Dupliqué');
  mtMaj();
  return true;
}
// Les actions du lot A s'appliquent aussi aux éléments libres et à la sélection multiple
// Un seul plan choisi (après Ctrl + clic) : le lot A s'en occupe comme d'habitude
function unPlan(){ const M = selPrincipale(); if(M.length === 1 && !selLibres().length && !(MT.sel && MT.sel.t === 'c')){ const n = anVid().clips.indexOf(M[0]); if(n >= 0) MT.sel = { t: 'c', n }; } }
const supBase = window.mpxSupprimer;
window.mpxSupprimer = function(ripple){
  if(pro() && (selLibres().length || selPrincipale().length > 1)){ supprimerSel(ripple); return; }
  if(pro()) unPlan();
  return supBase.apply(this, arguments);
};
const dupBase = window.mpxDupliquer;
window.mpxDupliquer = function(){
  if(pro() && (selLibres().length || selPrincipale().length > 1)){ dupliquerSel(); return; }
  if(pro()) unPlan();
  return dupBase.apply(this, arguments);
};
const couperBase = window.mpxCouper;
window.mpxCouper = function(){
  if(pro()){
    const L = selLibres();
    if(L.length === 1 && AN.t > L[0].t && AN.t < L[0].t + L[0].d){ couperLibre(L[0], AN.t); return; }
  }
  return couperBase.apply(this, arguments);
};

// ============================================================
// 8. SÉLECTION
// ============================================================
const choisirBase = window.mtChoisir;
window.mtChoisir = function(t, n){
  const V = anVid();
  if(t === 'c' && V.clips && V.clips[n]) MPB.sel = new Set([V.clips[n]]); else MPB.sel.clear();
  return choisirBase.apply(this, arguments);
};
function principaleManuelle(){ const V = anVid(); if(!(V.clips && V.clips.length)){ mtAvantPublic(); MT.undo.pop(); } return anVid().clips; }
function basculer(o){ if(MPB.sel.has(o)) MPB.sel.delete(o); else MPB.sel.add(o); }
function voirMontage(){ if(CR.edOutil !== 'montage' && typeof edOutil === 'function') edOutil('montage', true); }
document.addEventListener('click', e => {
  if(!pro()) return;
  const tg = e.target; if(!tg || !tg.closest || !tg.closest('#mtPiste')) return;
  if(MPB.bloque && Date.now() - MPB.bloque < 1500){ MPB.bloque = 0; e.stopImmediatePropagation(); e.preventDefault(); return; }
  if(tg.closest('.mpb-lab')) return;
  const fc = tg.closest('.mpb-clip'), mc = tg.closest('.mt-clip[data-n]'), plus = e.ctrlKey || e.metaKey || e.shiftKey || MPB.multi;
  const pi = piste(), xT = T(e.clientX - pi.getBoundingClientRect().left);
  if(fc){
    e.stopImmediatePropagation(); e.preventDefault();
    if(fc.dataset.id === 'musique'){ MPB.sel.clear(); MT.sel = null; anStop(); if(typeof edOutil === 'function') edOutil('musique'); return; }
    const it = itemParEl(fc); if(!it) return;
    if(plus){ if(MT.sel && MT.sel.t === 'c'){ const V = anVid(); if(V.clips && V.clips[MT.sel.n]) MPB.sel.add(V.clips[MT.sel.n]); } basculer(it.o); }
    else MPB.sel = new Set([it.o]);
    MT.sel = null;
    if(!mobile()){ anStop(); AN.t = Math.max(0, Math.min((AN.plan || planNow()).D, xT)); }
    voirMontage(); mtMaj(); return;
  }
  if(mc && plus){
    e.stopImmediatePropagation(); e.preventDefault();
    const L = principaleManuelle(), c = L[Number(mc.dataset.n)]; if(!c) return;
    if(MT.sel && MT.sel.t === 'c' && L[MT.sel.n]) MPB.sel.add(L[MT.sel.n]);
    basculer(c); MT.sel = null;
    voirMontage(); mtMaj(); return;
  }
  if(tg.closest('.mpb-row') && !tg.closest('.mpb-clip')){
    MPB.sel.clear(); MT.sel = null;
    if(!mobile()){ anStop(); AN.t = Math.max(0, Math.min((AN.plan || planNow()).D, xT)); }
    mtMaj();
  }
}, true);
window.mpbMulti = function(on){
  MPB.multi = on == null ? !MPB.multi : !!on; majBoutons();
  agToast(MPB.multi ? 'Sélection : touche les éléments à choisir, puis Supprimer, Dupliquer ou glisse-les' : 'Sélection terminée', 'info');
};
window.mpbToutChoisir = function(){
  const V = principaleManuelle();
  MPB.sel = new Set((V || []).filter(c => !estVide(c)).concat(libres().map(x => x.o))); MT.sel = null;
  voirMontage(); mtMaj();
  agToast(MPB.sel.size + ' éléments choisis', 'info');
};
window.mpbAucun = function(){ MPB.sel.clear(); MT.sel = null; MPB.multi = false; majBoutons(); mtMaj(); };

// ---------- Le panneau de l'élément choisi ----------
function panneauHtml(){
  const L = selLibres(), M = selPrincipale(), n = L.length + M.length;
  if(n > 1){
    const nb = (k, mot) => k ? k + ' ' + mot + (k > 1 ? 's' : '') : '', nv = L.filter(x => x.type === 'video').length, ns = L.length - nv;
    const quoi = [nb(M.length, 'plan'), nb(nv, 'incrustation'), nb(ns, 'son')].filter(Boolean).join(' · ');
    return `<div class="mt-pan"><div class="mt-pan-t"><b>${n} éléments choisis</b><span>${quoi}</span><button class="st-link" onclick="mpbAucun()">Fermer</button></div>
      <div class="ag-hint" style="margin-top:0">Glisse un des éléments choisis : les autres suivent.</div>
      <div class="mt-act"><button type="button" onclick="mpxDupliquer()">${ic('dup', 14)} Dupliquer</button><button type="button" class="no" onclick="mpxSupprimer(false)">${ic('deleteGap', 14)} Supprimer</button>${M.length ? `<button type="button" class="no" onclick="mpxSupprimer(true)">${ic('ripple', 14)} Suppr. + recoller</button>` : ''}<button type="button" onclick="mpbAucun()">Tout désélectionner</button></div></div>`;
  }
  const x = L[0]; if(!x) return '';
  const o = x.o, pi = pisteDeItem(o), max = x.type === 'video' ? (vidMax(o) || 12) : (sonMax(o) || 12);
  const duree = `<label>Durée : <b id="mpbDTxt">${fmtS(x.d)}</b></label><input type="range" min="0.2" max="${Math.max(0.3, Math.ceil(max * 10) / 10)}" step="0.1" value="${x.d.toFixed(1)}" oninput="mpbDuree(this.value)" onchange="mtMaj()">`;
  if(x.type === 'video'){
    const p = photoDe(o.k) || {};
    return `<div class="mt-pan"><div class="mt-pan-t"><b>Incrustation</b><span>${E(pi ? nomPiste(pi) : '')} · de ${anMinSec(x.t)} à ${anMinSec(x.t + x.d)}</span><button class="st-link" onclick="mpbAucun()">Fermer</button></div>
      <div class="mpb-pv">${vignette(p)}<div class="ag-hint" style="margin:0">${p.video ? 'Vidéo' : 'Photo'} par-dessus la piste principale, en plein cadre. Tire ses bords pour la raccourcir, glisse-la pour la déplacer.</div></div>
      ${duree}
      <div class="mt-act"><button type="button" onclick="mpbIci()">${ic('target', 14)} Placer à la tête de lecture</button><button type="button" onclick="mpbVersPrincipale()">${ic('downLayer', 14)} Remettre dans la piste principale</button><button type="button" onclick="mpxDupliquer()">${ic('dup', 14)} Dupliquer</button><button type="button" class="no" onclick="mpxSupprimer(false)">Supprimer</button></div></div>`;
  }
  return `<div class="mt-pan"><div class="mt-pan-t"><b>${E(o.nom || 'Son')}</b><span>${E(pi ? nomPiste(pi) : '')} · de ${anMinSec(x.t)} à ${anMinSec(x.t + x.d)}</span><button class="st-link" onclick="mpbAucun()">Fermer</button></div>
    ${duree}
    <label>Volume</label><input type="range" min="0" max="1.5" step="0.05" value="${o.vol == null ? 1 : o.vol}" oninput="mpbVolSon(this.value)">
    ${sonBuf(o) ? '' : '<div class="ag-hint">Ce son se charge...</div>'}
    <div class="mt-act"><button type="button" onclick="mpbIci()">${ic('target', 14)} Placer à la tête de lecture</button><button type="button" onclick="mpbEcouter()">${ic('play', 14)} Écouter</button><button type="button" onclick="mpxDupliquer()">${ic('dup', 14)} Dupliquer</button><button type="button" class="no" onclick="mpxSupprimer(false)">Supprimer</button></div></div>`;
}
window.mpbDuree = function(v){
  const x = selLibres()[0]; if(!x) return;
  if(!MPB.glisse){ avant(); MPB.glisse = true; }
  const o = x.o; v = Number(v);
  if(x.type === 'video') o.d = r2(v); else o.dur = r2(v);
  const el = document.getElementById('mpbDTxt'); if(el) el.textContent = fmtS(v);
  disposer(); regle(); anApercuUneFois();
  clearTimeout(mpbDuree.t); mpbDuree.t = setTimeout(() => { MPB.glisse = false; }, 800);
};
window.mpbVolSon = function(v){ const x = selLibres()[0]; if(x && x.type === 'audio') x.o.vol = Number(v); };
window.mpbEcouter = function(){ const x = selLibres()[0]; if(!x || x.type !== 'audio') return; const s = x.o, b = sonBuf(s); if(!b) return; const c = new (window.AudioContext || window.webkitAudioContext)(), src = c.createBufferSource(), g = c.createGain(); g.gain.value = s.vol == null ? 1 : s.vol; src.buffer = b; src.connect(g); g.connect(c.destination); src.start(0, s.off || 0, sonDur(s)); src.onended = () => c.close(); };
window.mpbIci = function(){
  const x = selLibres()[0]; if(!x) return;
  anStop(); avant();
  const t = r2(Math.max(0, AN.t)), p = pistePour(x.type, t, x.d, x.piste, new Set([x.o]));
  x.o.t = t; poser(x.o, p);
  agToast('Placé à ' + tcCourt(t), 'info'); mtMaj();
};

// ============================================================
// 9. LES PISTES : ajouter, couper le son, cacher
// ============================================================
window.mpbBasculer = function(id){
  const V = anVid();
  if(id === 'musique'){ V.musMuet = !V.musMuet; if(AN.audio) AN.audio.volume = V.musMuet ? 0 : Math.max(0, Math.min(1, (V.volume == null ? 0.9 : V.volume) * (MPX.muet ? 0 : MPX.vol))); agToast(V.musMuet ? 'Musique coupée (aussi dans la vidéo finale)' : 'Musique remise', 'info'); }
  else {
    const p = (V.pistes || []).find(x => x.id === id); if(!p) return;
    if(p.type === 'video'){ p.cache = !p.cache; agToast(p.cache ? nomPiste(p) + ' cachée (aussi dans la vidéo finale)' : nomPiste(p) + ' visible', 'info'); }
    else { p.muet = !p.muet; agToast(p.muet ? 'Son de ' + nomPiste(p) + ' coupé (aussi dans la vidéo finale)' : 'Son de ' + nomPiste(p) + ' remis', 'info'); }
    if(AN.lecture) planifierSons();
  }
  disposer(); regle(); anApercuUneFois();
  if(document.getElementById('mpbPistesS')) mpbPistes();
};
window.mpbNouvellePiste = function(type){
  const L = pistesDe(type); if(L.length >= 6){ agToast('6 pistes de ce genre au plus', 'info'); return; }
  avant(); const p = nouvellePiste(type, true);
  agToast(nomPiste(p) + ' ajoutée : glisse-y des éléments', 'info');
  mtMaj(); if(document.getElementById('mpbPistesS')) mpbPistes();
};
window.mpbRetirerPiste = async function(id){
  const V = anVid(), p = (V.pistes || []).find(x => x.id === id); if(!p) return;
  const n = p.type === 'video' ? p.clips.length : (V.sons || []).filter(s => s.piste === id).length;
  if(n && !await agConfirm(`Retirer ${nomPiste(p)} et ${n} élément${n > 1 ? 's' : ''} ?`, { ok: 'Retirer', no: 'Garder' })) return;
  avant();
  if(p.type === 'audio') V.sons = (V.sons || []).filter(s => s.piste !== id);
  V.pistes = V.pistes.filter(x => x !== p);
  nettoyerPhotos(); MPB.sel.clear();
  mtMaj(true); if(document.getElementById('mpbPistesS')) mpbPistes();
};
window.mpbPistes = function(){
  normaliser();
  const V = anVid(), ligne = (icone, nom, sous, droite) => `<div class="mpb-pl"><span class="mpb-pli">${ic(icone, 16)}</span><div><b>${nom}</b><small>${sous}</small></div><div class="mpb-pla">${droite}</div></div>`;
  const bt = (fn, icone, titre, cls) => `<button type="button" class="mpb-pb ${cls || ''}" onclick="${fn}" title="${E(titre)}">${ic(icone, 15)}</button>`;
  let h = '';
  pistesDe('video').slice().reverse().forEach(p => { h += ligne('film', E(nomPiste(p)), `Incrustation · ${p.clips.length} élément${p.clips.length > 1 ? 's' : ''}`, bt(`mpbBasculer('${p.id}')`, p.cache ? 'eyeOff' : 'eye', p.cache ? 'Montrer' : 'Cacher', p.cache ? 'off' : '') + bt(`mpbRetirerPiste('${p.id}')`, 'trash', 'Retirer la piste')); });
  const plan = AN.plan || planNow();
  h += ligne('image', 'Vidéo 1', `Piste principale · ${plan.segs.filter(s => !s.vide).length} plans`, '');
  if(V.musique) h += ligne('music', 'Musique', E(V.musique.nom || ''), bt(`mpbBasculer('musique')`, V.musMuet ? 'volumeOff' : 'volume', V.musMuet ? 'Remettre le son' : 'Couper le son', V.musMuet ? 'off' : ''));
  pistesDe('audio').forEach(p => { const n = (V.sons || []).filter(s => s.piste === p.id).length; h += ligne('wave', E(nomPiste(p)), `${n} son${n > 1 ? 's' : ''}`, bt(`mpbBasculer('${p.id}')`, p.muet ? 'volumeOff' : 'volume', p.muet ? 'Remettre le son' : 'Couper le son', p.muet ? 'off' : '') + bt(`mpbRetirerPiste('${p.id}')`, 'trash', 'Retirer la piste')); });
  agSheet('mpbPistesS', `<h3>Pistes</h3>
    <div class="mpb-pls">${h}</div>
    <div class="mpx-pt">Ajouter</div>
    <div class="mpx-pl">
      <button type="button" class="mpx-pi" onclick="agCloseSheet('mpbPistesS');mpbMedia()">${ic('upLayer', 18)}<div><b>Une photo ou une vidéo en incrustation</b><small>Par-dessus la piste principale, à la tête de lecture</small></div></button>
      ${typeof mlBib === 'function' ? `<button type="button" class="mpx-pi" onclick="agCloseSheet('mpbPistesS');mlBib('bruitage')">${ic('wave', 18)}<div><b>Un bruitage</b><small>Placé à la tête de lecture, sur une piste son</small></div></button>` : ''}
      <button type="button" class="mpx-pi" onclick="agCloseSheet('mpbPistesS');edOutil('musique')">${ic('music', 18)}<div><b>${V.musique ? 'Changer la musique' : 'Une musique'}</b><small>Outil Musique</small></div></button>
      <button type="button" class="mpx-pi" onclick="mpbNouvellePiste('video')">${ic('film', 18)}<div><b>Une piste vidéo vide</b><small>Pour y glisser des plans</small></div></button>
      <button type="button" class="mpx-pi" onclick="mpbNouvellePiste('audio')">${ic('wave', 18)}<div><b>Une piste son vide</b><small>Pour y glisser des bruitages</small></div></button>
    </div>
    <div class="mpx-pt">Affichage</div>
    <div class="mpb-zl"><button type="button" class="btn-ghost" onclick="mpbZoom(1/1.5)">${ic('zoomOut', 16)} Dézoomer</button><button type="button" class="btn-ghost" onclick="mpbAjuster()">${ic('fit', 16)} Tout voir</button><button type="button" class="btn-ghost" onclick="mpbZoom(1.5)">${ic('zoomIn', 16)} Zoomer</button></div>
    <label class="ag-check" style="margin-top:10px"><input type="checkbox" ${MPB.aimant ? 'checked' : ''} onchange="mpbAimant(this.checked)"> Aimant : les bords s'accrochent aux coupes, aux autres éléments et à la tête de lecture</label>
    <div class="ag-hint">Sur téléphone, pince la table de montage pour zoomer. Sur ordinateur : Ctrl + molette.</div>`);
};
// Ajouter une photo ou une vidéo en incrustation
window.mpbMedia = function(){
  const vus = new Set(), L = CR.photos.filter(p => { if(vus.has(p.k)) return false; vus.add(p.k); return true; });
  agSheet('mpbMediaS', `<h3>Incruster une photo ou une vidéo</h3>
    <div class="ag-hint" style="margin-top:0">Elle passe par-dessus la piste principale, à partir de ${anMinSec(AN.t)} (tête de lecture).</div>
    ${L.length ? `<label>Une photo ou vidéo du montage</label><div class="mt-rps">${L.map(p => `<button type="button" class="mt-rp" onclick="mpbIncrusterK('${E(p.k)}')">${vignette(p)}</button>`).join('')}</div>` : ''}
    <div class="mt-act"><button type="button" onclick="document.getElementById('mpbFile').click()">${ic('camera', 14)} Depuis mon téléphone ou mon ordinateur</button></div>
    <input type="file" id="mpbFile" accept="image/*,video/*" multiple style="display:none" onchange="mpbFichiers(this.files)">`);
  if(typeof mkHydrate === 'function') try { mkHydrate(document.getElementById('mpbMediaS')); } catch(e){}
};
function incruster(k, t){
  const p = photoDe(k); if(!p) return null;
  const d = p.video ? Math.max(0.5, Math.min(4, p.vdur || 4)) : 2.5;
  const D = (AN.plan || planNow()).D;
  t = r2(Math.max(0, Math.min(Math.max(0, D - 0.3), t)));
  const o = Object.assign({ id: uid('o'), k, t, d }, p.video ? { vin: 0, vit: 1 } : {});
  pistePour('video', t, d, null).clips.push(o);
  return o;
}
window.mpbIncrusterK = function(k){
  agCloseSheet('mpbMediaS'); anStop(); avant();
  const o = incruster(k, AN.t); if(!o) return;
  MPB.sel = new Set([o]); MT.sel = null; voirMontage();
  agToast('Incrustation ajoutée à ' + tcCourt(o.t)); mtMaj(true);
};
window.mpbFichiers = function(files){
  const F = [...(files || [])].filter(f => /^(image|video)\//.test(f.type)); if(!F.length) return;
  agCloseSheet('mpbMediaS'); anStop(); avant();
  let t = AN.t; const nouv = [];
  F.forEach(f => {
    const url = URL.createObjectURL(f), video = /^video\//.test(f.type);
    const p = video ? { k: 'v:' + f.name + f.size + Math.random(), src: 'fichier', file: f, url, thumb: '', video: true } : { k: 'f:' + f.name + f.size + Math.random(), src: 'fichier', file: f, url, thumb: url };
    CR.photos.push(p); CR.crop.push({ x: 0, y: 0, z: 1 }); MPB.media[p.k] = { p, c: { x: 0, y: 0, z: 1 } };
    const o = incruster(p.k, t); if(o){ nouv.push(o); t = o.t + o.d; }
    if(video && typeof rvNouveau === 'function') rvNouveau(p);
  });
  MPB.sel = new Set(nouv); MT.sel = null; voirMontage();
  agToast(nouv.length > 1 ? nouv.length + ' incrustations ajoutées' : 'Incrustation ajoutée'); mtMaj(true);
};

// ============================================================
// 10. RACCOURCIS (en plus de ceux du lot A, modifiables aussi)
// ============================================================
const MPB_ACTIONS = [
  ['aimant', 'Aimant (activer / désactiver)', ['N'], () => mpbAimant()],
  ['toutSel', 'Tout sélectionner', ['Ctrl+A'], () => mpbToutChoisir()],
  ['zoomPlus', 'Zoomer la table de montage', ['+', '='], () => mpbZoom(1.5)],
  ['zoomMoins', 'Dézoomer la table de montage', ['-'], () => mpbZoom(1 / 1.5)],
  ['ajuster', 'Tout voir (zoom ajusté)', ['F'], () => mpbAjuster()],
  ['incruster', 'Passer le plan en incrustation', ['I'], () => mpbIncruster()]
];
function touches(){ const perso = lsGet('mpb.raccourcis', {}) || {}, o = {}; MPB_ACTIONS.forEach(([id, , def]) => { o[id] = Array.isArray(perso[id]) ? perso[id] : def.slice(); }); return o; }
function combo(e){
  let k = e.key; if(!k || ['Control', 'Shift', 'Alt', 'Meta', 'AltGraph', 'Dead'].includes(k)) return '';
  if(k === ' ' || k === 'Spacebar') k = 'Space';
  if(k.length === 1) k = k.toUpperCase();
  const lettre = /^[A-Z0-9]$/.test(k) || k.length > 1, p = [];
  if(e.ctrlKey || e.metaKey) p.push('Ctrl');
  if(e.altKey) p.push('Alt');
  if(e.shiftKey && lettre) p.push('Shift');
  p.push(k);
  return p.join('+');
}
const NOMS = { Space: 'Espace', Delete: 'Suppr', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Shift: 'Maj', Ctrl: 'Ctrl', Alt: 'Alt', Enter: 'Entrée', Escape: 'Échap' };
function joli(c){ return String(c).split('+').map(x => NOMS[x] || x).join(' + ').replace(/ \+ \+$/, ' + +'); }
function touchesTxt(id){ return (touches()[id] || []).map(joli).join(' ou '); }
window.addEventListener('keydown', e => {
  if(MPX.capture || !pro()) return;
  if(typeof RT !== 'undefined' && RT.tap) return;
  const t = e.target, tag = (t && t.tagName) || '';
  if(/INPUT|TEXTAREA|SELECT/.test(tag) && !(tag === 'INPUT' && /range|checkbox|radio|button/.test(t.type || ''))) return;
  if((t && t.isContentEditable) || document.querySelector('.ag-dlg-bg, .ag-sheet')) return;
  if(e.key === 'Escape'){ if(MPB.drag){ e.stopImmediatePropagation(); finDrag(true); return; } if(MPB.sel.size || MPB.multi){ e.stopImmediatePropagation(); mpbAucun(); } return; }
  const c = combo(e), T0 = touches(), a = c && MPB_ACTIONS.find(([id]) => (T0[id] || []).includes(c));
  if(a){ e.preventDefault(); e.stopImmediatePropagation(); if(t && t.blur && tag === 'INPUT') t.blur(); a[3](); }
}, true);
if(typeof window.mpxRaccourcis === 'function'){
  const rcBase = window.mpxRaccourcis;
  window.mpxRaccourcis = function(){
    const r = rcBase.apply(this, arguments);
    try {
      const sh = document.getElementById('mpxKeysS'), kb = sh && sh.querySelector('.mpx-kb'); if(!kb) return r;
      const T0 = touches(), perso = lsGet('mpb.raccourcis', {}) || {};
      kb.insertAdjacentHTML('beforebegin', `<div class="mpx-pt">Table de montage (pistes)</div><div class="mpx-kl mpb-kl">${MPB_ACTIONS.map(([id, nom]) => `<div class="mpx-k ${perso[id] ? 'perso' : ''}" data-mpb="${id}"><span>${nom}</span><div class="mpx-kk">${(T0[id] || []).length ? T0[id].map(x => `<kbd>${E(joli(x))}</kbd>`).join('<small>ou</small>') : '<small>aucune</small>'}</div><button type="button" class="st-link" onclick="mpbChanger('${id}')">Changer</button></div>`).join('')}
        <div class="mpx-k"><span>Ajouter / retirer de la sélection</span><div class="mpx-kk"><kbd>Ctrl + clic</kbd><small>ou</small><kbd>Maj + clic</kbd></div><i></i></div>
        <div class="mpx-k"><span>Zoomer à l'endroit de la souris</span><div class="mpx-kk"><kbd>Ctrl + molette</kbd></div><i></i></div>
        <div class="mpx-k"><span>Défiler les pistes de haut en bas</span><div class="mpx-kk"><kbd>Maj + molette</kbd></div><i></i></div></div>`);
    } catch(e){ console.warn('montage-pistes', e); }
    return r;
  };
}
window.mpbChanger = function(id){
  const row = document.querySelector(`#mpxKeysS .mpx-k[data-mpb="${id}"]`);
  if(row){ row.classList.add('ecoute'); row.querySelector('.mpx-kk').innerHTML = '<small>Appuie sur la touche...</small>'; }
  MPX.capture = c => {
    MPX.capture = null;
    if(!c){ mpxRaccourcis(); return; }
    const perso = lsGet('mpb.raccourcis', {}) || {}, T0 = touches();
    let pris = '';
    MPB_ACTIONS.forEach(([a, nom]) => { if(a !== id && (T0[a] || []).includes(c)){ perso[a] = T0[a].filter(x => x !== c); pris = nom; } });
    const lotA = ['Space', 'C', 'S', 'Delete', 'Backspace', 'Shift+Delete', 'Shift+Backspace', 'Ctrl+Z', 'Ctrl+Y', 'Ctrl+Shift+Z', 'ArrowLeft', 'ArrowRight', 'Shift+ArrowLeft', 'Shift+ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'B', 'Ctrl+D', 'M', '?'];
    const persoA = lsGet('mpx.raccourcis', {}) || {}, dejaA = Object.values(persoA).some(l => Array.isArray(l) && l.includes(c)) || (lotA.includes(c) && !Object.keys(persoA).length);
    if(dejaA){ agToast(`${joli(c)} sert déjà à une action du lot de départ : choisis une autre touche`, 'info'); mpxRaccourcis(); return; }
    perso[id] = [c]; lsSet('mpb.raccourcis', perso);
    agToast(pris ? `${joli(c)} : retirée de « ${pris} »` : `Nouvelle touche : ${joli(c)}`, pris ? 'info' : 'success');
    mpxRaccourcis();
  };
};
if(typeof window.mpxRaccourcisDefaut === 'function'){
  const defBase = window.mpxRaccourcisDefaut;
  window.mpxRaccourcisDefaut = async function(){ const avantP = lsGet('mpx.raccourcis', {}); const r = await defBase.apply(this, arguments); if(JSON.stringify(lsGet('mpx.raccourcis', {})) !== JSON.stringify(avantP) || !Object.keys(avantP || {}).length){ lsSet('mpb.raccourcis', {}); if(document.getElementById('mpxKeysS')) mpxRaccourcis(); } return r; };
}

// ============================================================
// 11. MISE EN PLACE
// ============================================================
function boutonsBarre(){
  const def = document.querySelector('#mpxBarre .mpx-defile'); if(!def || def.querySelector('#mpbAimantB')) return;
  const dup = def.querySelector('#mpxDup');
  const b = (id, icone, txt, fn, titre, on) => `<button type="button" id="${id}" class="mpx-b ${on ? 'on' : ''}" onclick="${fn}" title="${E(titre)}">${ic(icone, 19)}<span>${txt}</span></button>`;
  const h = b('mpbIncB', 'upLayer', 'Incruster', 'mpbIncruster()', 'Passer le plan choisi en incrustation, au-dessus (I)')
    + b('mpbMultiB', 'multiSel', 'Sélection', 'mpbMulti()', 'Choisir plusieurs éléments (ou Ctrl / Maj + clic)', MPB.multi)
    + b('mpbAimantB', 'magnet', 'Aimant', 'mpbAimant()', 'Aimant : les bords s\'accrochent aux coupes (N)', MPB.aimant)
    + b('mpbPistesB', 'layers', 'Pistes', 'mpbPistes()', 'Pistes : ajouter, couper le son, cacher, zoom');
  if(dup) dup.insertAdjacentHTML('afterend', h); else def.insertAdjacentHTML('beforeend', h);
}
// Le bouton « Incruster » dans le panneau d'un plan
function boutonPanneau(){
  const hote = document.getElementById('mtPanHote'); if(!hote || !(MT.sel && MT.sel.t === 'c')) return;
  const sg = (AN.plan || planNow()).segs[MT.sel.n]; if(!sg || sg.vide) return;
  const act = hote.querySelector('.mt-pan .mt-act'); if(!act || act.querySelector('.mpb-inc')) return;
  act.insertAdjacentHTML('beforeend', `<button type="button" class="mpb-inc" onclick="mpbIncruster()">${ic('upLayer', 13)} Passer en incrustation</button>`);
}
function apres(){
  if(!pro()) return;
  regle();
  const hote = document.getElementById('mtPanHote');
  if(hote && (selLibres().length || selPrincipale().length > 1)){ hote.innerHTML = panneauHtml(); if(typeof mkHydrate === 'function') try { mkHydrate(hote); } catch(e){} }
  else boutonPanneau();
  boutonsBarre(); majBoutons();
}
// Après chaque changement de la table de montage
const edApresBase = window.edApresMt;
window.edApresMt = function(){
  try { if(pro()){ // les sélections qui n'existent plus
      const ok = new Set(libres().map(x => x.o).concat(anVid().clips || [])); [...MPB.sel].forEach(o => { if(!ok.has(o)) MPB.sel.delete(o); });
      disposer(); } } catch(e){ console.warn('montage-pistes', e); }
  const r = edApresBase.apply(this, arguments);
  try { apres(); } catch(e){ console.warn('montage-pistes', e); }
  return r;
};
// Après chaque affichage de l'écran
const renderBase = crRender;
crRender = async function(){
  const r = await renderBase.apply(this, arguments);
  try {
    if(pro()){ disposer(); apres(); anApercuUneFois(); setTimeout(() => { if(pro()){ disposer(); regle(); placerEtiquettes(); } }, 520); }
    else { MPB.multi = false; if(CR.vue !== 'edit') MPB.sel.clear(); }
  } catch(e){ console.warn('montage-pistes', e); }
  return r;
};
window.addEventListener('resize', () => { clearTimeout(window.mpbRz); window.mpbRz = setTimeout(() => {
  if(!pro() || MPB.drag) return;
  // Vraie nouvelle taille de fenêtre : tout se replace ; sinon (la table a grandi) seule la règle est refaite
  const k = window.innerWidth + 'x' + window.innerHeight; if(k !== MPB.fen){ MPB.fen = k; disposer(); }
  regle(); placerEtiquettes();
}, 220); });
// Les bruitages ajoutés ou changés dans l'outil Musique apparaissent tout de suite
if(typeof window.mlRendu === 'function'){ const mlBase = window.mlRendu; window.mlRendu = function(){ const r = mlBase.apply(this, arguments); try { if(pro()){ disposer(); regle(); } } catch(e){} return r; }; }
if(typeof window.mlSonIci === 'function'){ const iciBase = window.mlSonIci; window.mlSonIci = function(i){ const s = (anVid().sons || [])[i]; if(s) s.piste = null; return iciBase.apply(this, arguments); }; }

// ============================================================
// 12. STYLE
// ============================================================
(function css(){
  if(document.getElementById('mpbCss')) return;
  const st = document.createElement('style'); st.id = 'mpbCss';
  st.textContent = `
.ed.mpx .mt-piste.mpb{gap:0}
.ed.mpx .mt-piste-w{overflow-y:auto;overscroll-behavior:contain}
.ed.mpx .mt-piste.mpb{touch-action:pan-x pan-y}
.mt-piste.mpb .mt-clip{transition:none}
.mt-piste.mpb .mt-clip.mpb-sel{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 35%,transparent)}
.mt-piste.mpb .mt-tr{position:relative;z-index:4;align-self:center;width:20px;height:24px;margin:0 -10px;border-radius:6px}
.mt-piste.mpb .mt-tr svg{width:10px;height:10px}
.mt-piste.mpb .mt-plus{margin-left:14px}
.mpb-h{position:absolute;top:0;bottom:0;width:9px;z-index:3;cursor:ew-resize;touch-action:none}
.mpb-h.g{left:0}.mpb-h.d{right:0}
.mpb-h::after{content:"";position:absolute;top:22%;bottom:22%;width:3px;border-radius:2px;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.5);opacity:0;transition:opacity .12s}
.mpb-h.g::after{left:2px}.mpb-h.d::after{right:2px}
.mt-clip:hover .mpb-h::after,.mpb-clip:hover .mpb-h::after,.mt-clip.on .mpb-h::after,.mt-clip.mpb-sel .mpb-h::after,.mpb-clip.on .mpb-h::after{opacity:.95}
.ed.mpx-lame-on .mpb-h{display:none}
.mt-clip.on .mpb-h,.mt-clip.mpb-sel .mpb-h{z-index:5}
.mpb-row{position:absolute;left:0;right:0;border-radius:8px;background:color-mix(in srgb,var(--text) 5%,transparent)}
.mpb-row.off{opacity:.45}
.mpb-row.cible{outline:2px dashed var(--accent);outline-offset:-1px;background:color-mix(in srgb,var(--accent) 12%,transparent)}
.mpb-vide{position:absolute;top:50%;transform:translateY(-50%);font-style:normal;font-size:10.5px;color:var(--muted);pointer-events:none;white-space:nowrap}
.mpb-clip{position:absolute;top:2px;bottom:2px;border-radius:7px;overflow:hidden;border:2px solid transparent;cursor:grab;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;box-sizing:border-box;display:flex;align-items:center;gap:4px}
.mpb-clip.vid{background:#2a3446}
.mpb-clip.vid{background-repeat:repeat-x;background-size:auto 100%;background-position:0 0}
.mpb-clip.vid img{height:100%;width:auto;max-width:70%;object-fit:cover;flex:none;pointer-events:none}
.mpb-clip.son{background:linear-gradient(180deg,#14614f,#0e4a3c);color:#d8fff2;align-items:flex-start}
.mpb-clip.son span,.mpb-clip.mus span{padding-top:2px}
.mpb-clip.son.charge{opacity:.6}
.mpb-clip.mus{background:repeating-linear-gradient(90deg,#4b3a86 0 3px,#3d2f70 3px 6px);color:#efe9ff;cursor:ew-resize}
.mpb-clip span{display:flex;align-items:center;gap:4px;font-size:10.5px;font-weight:600;padding-left:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;pointer-events:none}
.mpb-clip b{position:absolute;right:5px;bottom:1px;font-size:9.5px;font-weight:600;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.8);pointer-events:none;display:flex;align-items:center;gap:2px}
.mpb-clip.vid b{left:4px;right:auto}
.mpb-clip.on{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 35%,transparent);z-index:2}
.mpb-clip.drag,.mt-piste.mpb .mt-clip.drag{z-index:6;opacity:.88;box-shadow:0 10px 24px rgba(0,0,0,.45);cursor:grabbing}
.mpb-lab{position:absolute;z-index:5;display:flex;align-items:center;gap:3px;height:18px;padding:0 5px 0 1px;border-radius:6px;background:color-mix(in srgb,var(--card) 82%,transparent);font-size:9.5px;font-weight:700;color:var(--muted);pointer-events:none;white-space:nowrap}
.mpb-lab button{pointer-events:auto;width:18px !important;height:18px;margin:0;padding:0;border:0;border-radius:5px;background:transparent;color:var(--text);display:flex;align-items:center;justify-content:center;cursor:pointer}
.mpb-lab.off button{color:var(--red,#e5484d)}
.mpb-snap{display:none;position:absolute;top:0;bottom:0;width:1px;margin-left:-.5px;background:#ffd400;box-shadow:0 0 6px #ffd400;z-index:7;pointer-events:none}
.mpb-ins{display:none;position:absolute;width:3px;border-radius:2px;background:#f5a524;box-shadow:0 0 8px #f5a524;z-index:7;pointer-events:none}
.mpb-bulle{display:none;position:absolute;transform:translate(-50%,0);top:0;padding:1px 7px;border-radius:6px;background:rgba(0,0,0,.85);color:#fff;font-size:10.5px;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap;z-index:8;pointer-events:none}
.mpb-tete{display:flex;align-items:center;gap:3px;margin-left:auto}
.mpb-tb{display:flex;align-items:center;gap:4px;width:auto !important;height:28px;min-width:28px;margin:0;padding:0 6px;border-radius:8px;border:1px solid var(--border);background:var(--card2);color:var(--text);font-size:11.5px;font-weight:600;cursor:pointer;justify-content:center}
.mpb-tb.on{background:color-mix(in srgb,var(--accent) 22%,transparent);color:var(--accent);border-color:color-mix(in srgb,var(--accent) 50%,transparent)}
.mpb-zr{width:90px !important;margin:0 2px;accent-color:var(--accent)}
.mt-clip i.mpb-h{background:transparent;padding:0;border-radius:0;top:0;bottom:0;right:auto;font-size:0}
.mt-clip i.mpb-h.d{right:0;left:auto}
.ed.mpb-multi-on .mt-clip,.ed.mpb-multi-on .mpb-clip{cursor:copy}
.ed.mpb-multi-on .mt-piste-w{box-shadow:inset 0 0 0 2px var(--accent);border-radius:10px}
.mpb-pv{display:flex;gap:10px;align-items:center;margin-bottom:6px}.mpb-pv img{width:54px;height:54px;object-fit:cover;border-radius:8px;flex:none}
.mpb-pls{display:flex;flex-direction:column;gap:4px}
.mpb-pl{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:12px;border:1px solid var(--border);background:var(--card2)}
.mpb-pl b{display:block;font-size:13.5px}.mpb-pl small{display:block;font-size:11.5px;color:var(--muted)}
.mpb-pli{color:var(--accent);display:flex}
.mpb-pla{margin-left:auto;display:flex;gap:4px}
.mpb-pb{width:34px !important;height:34px;margin:0;padding:0;border-radius:9px;border:1px solid var(--border);background:var(--card);color:var(--text);display:flex;align-items:center;justify-content:center;cursor:pointer}
.mpb-pb.off{color:var(--red,#e5484d)}
.mpb-zl{display:flex;gap:6px}.mpb-zl .btn-ghost{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;width:auto;margin:0;padding:9px 6px;font-size:12.5px}
@media(max-width:899px){
  .ed.mpx .mt-piste-w{max-height:30vh}
  .mpb-h{width:16px}
  .mt-piste.mpb .mt-clip:not(.on):not(.mpb-sel) .mpb-h,.mpb-clip:not(.on) .mpb-h{display:none}
  .mpb-h::after{opacity:1;width:4px;top:28%;bottom:28%}
  .mt-clip.on .mpb-h,.mt-clip.mpb-sel .mpb-h,.mpb-clip.on .mpb-h{background:color-mix(in srgb,var(--accent) 55%,transparent)}
  .mpb-lab span{display:none}
  .mpb-lab[data-p="principale"]{display:none}
}
@media(min-width:900px){
  .ed.mpx .mt-piste-w{max-height:calc(34vh - 46px)}
  .ed.mpx .mt-tete{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .ed.mpx .mt-piste.mpb{padding-left:78px}
}`;
  document.head.appendChild(st);
})();
})();
