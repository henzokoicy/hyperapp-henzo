// montage-transitions.js — version 1
// ============================================================
// MONTAGE-TRANSITIONS.JS - Les transitions (écran de montage des Créations)
// ------------------------------------------------------------
// - Outil « Transitions » (barre de gauche, barre d'outils, touche T) :
//   bibliothèque rangée par familles (Simples, Mouvement, Formes,
//   Effets), chaque transition avec une miniature animée faite avec
//   TES photos (celles de la coupe choisie).
// - Un clic = la transition est posée sur la coupe choisie (ou la
//   plus proche de la tête de lecture) et rejouée tout de suite.
// - Glisser une transition sur une coupe de la table de montage.
// - Durée (0,1 à 2 s), « Sur toutes les coupes », « Varier »,
//   « Retirer partout », transitions récentes.
// - 11 transitions en plus : zoom flou, fouet vertical, cube, rideau
//   doux, cercle doux, cœur, rebond, couleurs décalées, étirement,
//   tourbillon zoom, éclat.
// - Dans la table de montage : la zone de chaque transition est
//   visible sur la coupe (largeur = durée).
// Les 32 transitions de montage.js restent telles quelles.
// Tout est ajouté par enveloppes. Utilise montage.js, montage-pro.js,
// montage-pistes.js, montage-reglages.js, animations.js.
// ============================================================
(function(){
'use strict';
if(typeof CR === 'undefined' || typeof AN === 'undefined' || typeof MT === 'undefined' || typeof MPX === 'undefined' || typeof MPB === 'undefined' || typeof mtMaj !== 'function' || typeof mtEstSeq !== 'function' || typeof mtAvantPublic !== 'function') return;

function lsGet(k, d){ try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch(e){ return d; } }
function lsSet(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }

const MTR = { n: null, duree: Number(lsGet('mtr.duree', 0.6)) || 0.6, recentes: lsGet('mtr.recentes', []) || [], famille: 'tout', apercu: lsGet('mtr.apercu', true) !== false, anim: null, glisse: 0, drag: null };
window.MTR = MTR;

if(typeof AG_ICONS !== 'undefined'){
  const I = {
    trans: '<rect x="2" y="6" width="8" height="12" rx="1.5"/><rect x="14" y="6" width="8" height="12" rx="1.5"/><path d="M10 12h4M12.5 10l1.5 2-1.5 2"/>',
    shuffle: '<path d="M3 7h4l10 10h4M3 17h4l3-3M14 10l3-3h4"/><path d="m18 4 3 3-3 3M18 14l3 3-3 3"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.5 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'
  };
  Object.keys(I).forEach(k => { if(!AG_ICONS[k]) AG_ICONS[k] = I[k]; });
}
const ic = (n, s) => agIcon(n, s || 18);
const E = s => crE(String(s == null ? '' : s));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r2 = v => Math.round(v * 100) / 100;
function mobile(){ return !window.matchMedia('(min-width:900px)').matches; }
function pro(){ return document.body.classList.contains('ed-ouvert') && CR.vue === 'edit' && !!CR.modele && mtEstSeq(CR.modele) && !!document.querySelector('.ed.mpx') && !!document.getElementById('mtPiste'); }
function planNow(){ AN.plan = anPlan(); return AN.plan; }
function tcCourt(t){ t = Math.max(0, t || 0); const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1).replace('.', ',')}`; }

// ============================================================
// 1. LA LISTE (32 de montage.js + 11 nouvelles)
// ============================================================
const FAMILLES = [
  ['simples', 'Simples', [['coupe', 'Coupe nette'], ['fondu', 'Fondu'], ['noir', 'Fondu au noir'], ['blanc', 'Fondu au blanc'], ['flash', 'Flash'], ['flouT', 'Flou'], ['eclat', 'Éclat']]],
  ['mouvement', 'Mouvement', [['fouet', 'Coup de fouet'], ['fouetV', 'Fouet vertical'], ['zoomIn', 'Zoom avant'], ['zoomOut', 'Zoom arrière'], ['zoomFlou', 'Zoom flou'], ['pousseG', 'Pousse à gauche'], ['pousseD', 'Pousse à droite'], ['pousseH', 'Pousse en haut'], ['glisseG', 'Glisse de droite'], ['glisseD', 'Glisse de gauche'], ['glisseH', 'Glisse du bas'], ['glisseB', 'Glisse du haut'], ['rebond', 'Rebond'], ['cube', 'Cube'], ['retourne', 'Retournement'], ['tourne', 'Tourbillon'], ['spinZoom', 'Tourbillon zoom'], ['etirement', 'Étirement']]],
  ['formes', 'Formes', [['rideauV', 'Rideau'], ['rideauH', 'Rideau vertical'], ['rideauDiag', 'Rideau en biais'], ['rideauDoux', 'Rideau doux'], ['cercle', 'Cercle'], ['cercleDoux', 'Cercle doux'], ['iris', 'Iris (noir)'], ['coeur', 'Cœur'], ['losange', 'Losange'], ['stores', 'Stores'], ['barres', 'Barres'], ['cases', 'Cases'], ['split', 'Ouverture au centre']]],
  ['effets', 'Effets', [['glitch', 'Glitch'], ['chromatique', 'Couleurs décalées'], ['fuite', 'Fuite de lumière'], ['pellicule', 'Brûlure de pellicule'], ['mosaique', 'Pixels']]]
];
const NOMS = {}; FAMILLES.forEach(([, , L]) => L.forEach(([k, n]) => { NOMS[k] = n; }));
const NOUVELLES = new Set(['eclat', 'fouetV', 'zoomFlou', 'rebond', 'cube', 'spinZoom', 'etirement', 'rideauDoux', 'cercleDoux', 'coeur', 'chromatique']);
const DUREE_CONSEIL = { flash: 0.35, glitch: 0.35, fouet: 0.4, fouetV: 0.4, eclat: 0.45, chromatique: 0.45, rebond: 0.6, coupe: 0 };
const VARIE = ['fondu', 'zoomFlou', 'fouet', 'rideauDoux', 'cube', 'flash', 'cercleDoux', 'glisseG', 'eclat', 'pousseG'];
window.mtrNom = k => NOMS[k] || k;

// ============================================================
// 2. LE DESSIN DES NOUVELLES TRANSITIONS
// ------------------------------------------------------------
// montage.js prépare les deux images (avant / après la coupe) puis les
// mélange. Pour une nouvelle transition, on lui demande un « fondu »,
// on récupère au passage ses deux images, et on dessine la nôtre.
// ============================================================
function easeIO(p){ return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }
function backOut(p){ const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); }
let TMP = null; function tmp(W, H){ if(!TMP) TMP = document.createElement('canvas'); if(TMP.width !== W || TMP.height !== H){ TMP.width = W; TMP.height = H; } const c = TMP.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none'; c.clearRect(0, 0, W, H); return TMP; }
function coeurChemin(g, cx, cy, r){
  g.moveTo(cx, cy + r * 0.9);
  g.bezierCurveTo(cx - r * 1.6, cy - r * 0.05, cx - r * 0.95, cy - r * 1.25, cx, cy - r * 0.45);
  g.bezierCurveTo(cx + r * 0.95, cy - r * 1.25, cx + r * 1.6, cy - r * 0.05, cx, cy + r * 0.9);
  g.closePath();
}
function dessiner(tr, g, dI, A, B, p, W, H, s){
  const e = easeIO(p), pic = 1 - Math.abs(2 * p - 1);
  const img = (c, x, y, w, h, al) => { g.save(); if(al != null) g.globalAlpha = al; dI.call(g, c, x || 0, y || 0, w || W, h || H); g.restore(); };
  const voile = (coul, a) => { if(a <= 0) return; g.save(); g.globalAlpha = Math.min(1, a); g.fillStyle = coul; g.fillRect(0, 0, W, H); g.restore(); };
  const zoome = (c, z, al, rot, flou) => { g.save(); if(al != null) g.globalAlpha = al; if(flou > 0.3) g.filter = `blur(${flou.toFixed(1)}px)`; g.translate(W / 2, H / 2); if(rot) g.rotate(rot); g.scale(z, z); dI.call(g, c, -W / 2, -H / 2, W, H); g.restore(); };
  g.save(); g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.restore();
  switch(tr){
    case 'eclat': { const c = p < 0.5 ? A : B, z = 1 + 0.25 * pic; zoome(c, z, 1); if(p > 0.35 && p < 0.65) zoome(B, z, (p - 0.35) / 0.3); voile('#fff', Math.pow(pic, 2.2)); break; }
    case 'fouetV': { const y = -H * e; for(let k = 0; k < 6; k++){ const o = (k - 2.5) * H * 0.035 * pic; g.save(); g.globalAlpha = k === 0 ? 1 : 0.28; dI.call(g, A, 0, y + o, W, H); dI.call(g, B, 0, y + H + o, W, H); g.restore(); } break; }
    case 'zoomFlou': { const f = pic * 22 * s; zoome(A, 1 + 0.7 * e, 1 - e, 0, f); zoome(B, 1.45 - 0.45 * e, e, 0, f); break; }
    case 'rebond': { const x = W * (1 - backOut(clamp(p, 0, 1))); img(A); voile('#000', 0.35 * e); g.save(); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 30 * s; dI.call(g, B, x, 0, W, H); g.restore(); break; }
    case 'cube': {
      const wa = W * (1 - e), wb = W * e;
      if(wa > 0.5){ g.save(); dI.call(g, A, 0, 0, wa, H); g.globalAlpha = 0.55 * e; g.fillStyle = '#000'; g.fillRect(0, 0, wa, H); g.restore(); }
      if(wb > 0.5){ g.save(); dI.call(g, B, wa, 0, wb, H); g.globalAlpha = 0.55 * (1 - e); g.fillStyle = '#000'; g.fillRect(wa, 0, wb, H); g.restore(); }
      break;
    }
    case 'spinZoom': { const c = p < 0.5 ? A : B, q = p < 0.5 ? 1 - e * 2 : (e - 0.5) * 2, z = Math.max(0.02, q), rot = (p < 0.5 ? 1 : -1) * (1 - q) * Math.PI; zoome(c, z, 1, rot, pic * 6 * s); break; }
    case 'etirement': { g.save(); g.globalAlpha = 1 - e; g.translate(W / 2, H / 2); g.scale(1 + 3 * e, 1); dI.call(g, A, -W / 2, -H / 2, W, H); g.restore(); g.save(); g.globalAlpha = e; g.translate(W / 2, H / 2); g.scale(1 + 3 * (1 - e), 1); dI.call(g, B, -W / 2, -H / 2, W, H); g.restore(); break; }
    case 'rideauDoux': case 'cercleDoux': {
      img(A);
      const t = tmp(W, H), c = t.getContext('2d'); c.drawImage(B, 0, 0, W, H);
      c.globalCompositeOperation = 'destination-in';
      let gr;
      if(tr === 'rideauDoux'){ const bord = W * 0.25, x = -bord + (W + 2 * bord) * e; gr = c.createLinearGradient(x - bord, 0, x + bord, 0); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); }
      else { const R = Math.hypot(W, H) / 2 * 1.25, r = R * e; gr = c.createRadialGradient(W / 2, H / 2, Math.max(0, r - R * 0.25), W / 2, H / 2, r + 0.1); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); }
      c.fillStyle = gr; c.fillRect(0, 0, W, H);
      g.save(); dI.call(g, t, 0, 0, W, H); g.restore();
      break;
    }
    case 'coeur': { img(A); g.save(); g.beginPath(); coeurChemin(g, W / 2, H / 2, Math.hypot(W, H) * 0.95 * e); g.clip(); dI.call(g, B, 0, 0, W, H); g.restore(); break; }
    case 'chromatique': {
      img(A); img(B, 0, 0, W, H, e);
      const c = p < 0.5 ? A : B, d = 18 * s * pic;
      g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.55 * pic;
      g.filter = 'sepia(1) saturate(8) hue-rotate(-50deg)'; dI.call(g, c, d, 0, W, H);
      g.filter = 'sepia(1) saturate(8) hue-rotate(140deg)'; dI.call(g, c, -d, 0, W, H); g.restore();
      break;
    }
    default: img(p < 0.5 ? A : B);
  }
}
// La durée d'une transition, comme montage.js la calcule
function dureeTr(a, b){ if(!a || !b || a.tr === 'coupe' || !a.tr) return 0; return Math.max(0.05, Math.min(a.trD || 0.6, 0.9 * (a.t1 - a.t0), 0.9 * (b.t1 - b.t0))); }
const dessinBase = window.mtDessiner;
window.mtDessiner = function(g, W, H, s, tt, imgs, plan){
  const S = plan && plan.segs; if(!S || S.length < 2 || !g || !g.drawImage) return dessinBase.apply(this, arguments);
  // Une nouvelle transition en cours à cet instant ?
  let a = -1, p = 0;
  for(let k = 0; k < S.length - 1; k++){
    const x = S[k]; if(!NOUVELLES.has(x.tr)) continue;
    const d = dureeTr(x, S[k + 1]); if(d <= 0) continue;
    if(tt >= x.t1 - d / 2 && tt < x.t1 + d / 2){ a = k; p = (tt - (x.t1 - d / 2)) / d; break; }
  }
  if(a < 0) return dessinBase.apply(this, arguments);
  const seg = S[a], tr = seg.tr, dI = g.drawImage, prises = [];
  seg.tr = 'fondu';
  g.drawImage = function(im){
    if(prises.length < 2 && im instanceof HTMLCanvasElement && arguments.length === 5 && arguments[1] === 0 && arguments[2] === 0 && arguments[3] === W && arguments[4] === H){
      prises.push(im);
      if(prises.length === 2){ g.save(); g.globalAlpha = 1; g.filter = 'none'; g.globalCompositeOperation = 'source-over'; try { dessiner(tr, g, dI, prises[0], prises[1], clamp(p, 0, 1), W, H, s); } finally { g.restore(); } delete g.drawImage; }
      return;
    }
    return dI.apply(g, arguments);
  };
  try { return dessinBase.apply(this, arguments); }
  finally { seg.tr = tr; if(Object.prototype.hasOwnProperty.call(g, 'drawImage')){ delete g.drawImage; if(prises.length === 1) dI.call(g, prises[0], 0, 0, W, H); } }
};

// ============================================================
// 3. LA COUPE CHOISIE
// ============================================================
function segs(){ return (AN.plan || planNow()).segs; }
function coupeOk(n){ const S = segs(); return n != null && n >= 0 && n < S.length - 1 && !S[n].vide && !S[n + 1].vide; }
function coupeProche(t){
  const S = segs(); let best = null, ecart = Infinity;
  for(let n = 0; n < S.length - 1; n++){ if(!coupeOk(n)) continue; const e = Math.abs(S[n].t1 - t); if(e < ecart){ ecart = e; best = n; } }
  return best;
}
function cible(){
  if(MT.sel && MT.sel.t === 't' && coupeOk(MT.sel.n)) MTR.n = MT.sel.n;
  if(!coupeOk(MTR.n)) MTR.n = coupeProche(AN.t);
  return MTR.n;
}
function clipDe(n){ const V = anVid(); return V.clips ? V.clips[n] : null; }
function trDe(n){ const S = segs(); return S[n] ? (S[n].tr || 'coupe') : 'coupe'; }
function avant(){ const now = Date.now(); if(now - MTR.glisse > 700) mtAvantPublic(); MTR.glisse = now; }

// ============================================================
// 4. POSER, RETIRER, PARTOUT
// ============================================================
function recente(k){ if(k === 'coupe') return; MTR.recentes = [k].concat(MTR.recentes.filter(x => x !== k)).slice(0, 6); lsSet('mtr.recentes', MTR.recentes); }
window.mtrPoser = function(k, n, sansApercu){
  if(n == null) n = cible();
  if(!coupeOk(n)){ agToast('Il faut au moins deux plans pour une transition', 'info'); return; }
  if(typeof anStop === 'function') anStop();
  mtAvantPublic(); MTR.glisse = 0;
  const c = clipDe(n); if(!c) return;
  // On garde la durée déjà réglée sur cette coupe ; sinon la durée conseillée pour cette transition
  const ancienne = c.tr && c.tr !== 'coupe' && c.trD ? c.trD : null;
  c.tr = k; c.trD = k === 'coupe' ? 0 : (ancienne || (DUREE_CONSEIL[k] != null ? DUREE_CONSEIL[k] : MTR.duree) || 0.6);
  MTR.n = n; recente(k);
  mtMaj();
  if(k !== 'coupe' && MTR.apercu && !sansApercu) voir(n);
  else agToast(k === 'coupe' ? 'Coupe nette' : NOMS[k] || k);
};
function voir(n){
  const S = planNow().segs, sg = S[n]; if(!sg) return;
  const d = dureeTr(sg, S[n + 1]) || 0.6;
  clearInterval(MTR.voirI);
  if(typeof anStop === 'function') anStop();
  AN.t = Math.max(0, sg.t1 - d / 2 - 0.5); anApercuUneFois();
  const fin = sg.t1 + d / 2 + 0.5;
  anLecture();
  MTR.voirI = setInterval(() => { if(!AN.lecture || AN.t >= fin){ clearInterval(MTR.voirI); if(AN.lecture) anStop(); AN.t = sg.t1; anApercuUneFois(); } }, 40);
}
window.mtrVoir = function(){ const n = cible(); if(coupeOk(n)) voir(n); };
window.mtrDuree = function(v){
  const n = cible(); if(!coupeOk(n)) return;
  avant(); const c = clipDe(n); if(!c) return;
  if(c.tr === 'coupe' || !c.tr){ c.tr = 'fondu'; }
  c.trD = r2(clamp(Number(v), 0.1, 2)); MTR.duree = c.trD; lsSet('mtr.duree', MTR.duree);
  const t = document.getElementById('mtrDT'); if(t) t.textContent = c.trD.toFixed(1).replace('.', ',') + ' s';
  planNow(); anApercuUneFois();
  clearTimeout(MTR.majT); MTR.majT = setTimeout(() => { mtMaj(); }, 600);
};
window.mtrPartout = function(){
  const n = cible(), k = coupeOk(n) ? trDe(n) : 'fondu', d = coupeOk(n) ? (clipDe(n) || {}).trD || MTR.duree : MTR.duree;
  mtAvantPublic(); MTR.glisse = 0;
  const S = segs(), L = anVid().clips; let nb = 0;
  L.forEach((c, i) => { if(i < S.length - 1 && coupeOk(i)){ c.tr = k; c.trD = k === 'coupe' ? 0 : d; nb++; } });
  agToast(k === 'coupe' ? 'Coupes nettes partout' : `${NOMS[k] || k} sur les ${nb} coupes`); mtMaj();
};
window.mtrVarier = function(){
  mtAvantPublic(); MTR.glisse = 0;
  const fam = FAMILLES.find(f => f[0] === MTR.famille), choix = fam ? fam[2].map(x => x[0]).filter(k => k !== 'coupe') : VARIE;
  const S = segs(), L = anVid().clips; let j = Math.floor(Math.random() * choix.length);
  L.forEach((c, i) => { if(i < S.length - 1 && coupeOk(i)){ const k = choix[j++ % choix.length]; c.tr = k; c.trD = DUREE_CONSEIL[k] != null ? Math.max(0.3, DUREE_CONSEIL[k]) : MTR.duree; } });
  agToast('Transitions variées' + (fam ? ' (' + fam[1] + ')' : '')); mtMaj();
};
window.mtrRetirerTout = async function(){
  if(!await agConfirm('Mettre des coupes nettes partout ?\n(Annuler la remet comme avant.)', { ok: 'Coupes nettes', no: 'Garder' })) return;
  mtAvantPublic(); MTR.glisse = 0;
  (anVid().clips || []).forEach(c => { c.tr = 'coupe'; c.trD = 0; });
  agToast('Toutes les transitions retirées'); mtMaj();
};
window.mtrAller = function(d){
  const S = segs(); let n = cible(); if(n == null) return;
  let k = n + d; while(k >= 0 && k < S.length - 1 && !coupeOk(k)) k += d;
  if(!coupeOk(k)) return;
  MTR.n = k; MT.sel = null; if(typeof anStop === 'function') anStop(); AN.t = S[k].t1; anApercuUneFois(); mtMaj();
};

// ============================================================
// 5. LES MINIATURES ANIMÉES (avec tes photos)
// ============================================================
function images(n){
  const S = segs(), a = S[n], b = S[n + 1];
  const I = typeof AN_IMGS !== 'undefined' ? AN_IMGS : [];
  const fond = (txt, coul) => { const c = document.createElement('canvas'); c.width = 270; c.height = 480; const g = c.getContext('2d'); g.fillStyle = coul; g.fillRect(0, 0, 270, 480); g.fillStyle = 'rgba(255,255,255,.9)'; g.font = 'bold 160px sans-serif'; g.textAlign = 'center'; g.fillText(txt, 135, 300); return c; };
  if(!MTR.fondA){ MTR.fondA = fond('A', '#2f6f9f'); MTR.fondB = fond('B', '#c0563b'); }
  return [(a && I[a.i]) || MTR.fondA, (b && I[b.i]) || MTR.fondB];
}
function vignetteDims(){ const d = crDims(CR.fmt, 1), r = d.w / d.h; let w = 64, h = Math.round(w / r); if(h > 96){ h = 96; w = Math.round(h * r); } return { w, h }; }
function rendreVignette(cv, k, p, imA, imB){
  const W = cv.width, H = cv.height, g = cv.getContext('2d'), s = Math.min(W, H) / 1080;
  const plan = { D: 2, Dp: 2, finD: 0, mt: true, segs: [
    { i: 100000, k: '__mtrA', t0: 0, t1: 1, mvt: 'aucun', tr: k, trD: 0.8, n: 0 },
    { i: 100001, k: '__mtrB', t0: 1, t1: 2, mvt: 'aucun', tr: 'coupe', trD: 0, n: 1 }] };
  const imgs = {}; imgs[100000] = imA; imgs[100001] = imB;
  const V = anVid(), pistes = V.pistes, force = V.force;
  V.pistes = null; V.force = 1;
  try { window.mtDessiner(g, W, H, s, k === 'coupe' ? (p < 0.5 ? 0.9 : 1.1) : 1 + (p - 0.5) * 0.8, imgs, plan); } catch(e){}
  finally { V.pistes = pistes; V.force = force; }
}
function rendreVignettes(){
  const n = cible(); const [A, B] = images(coupeOk(n) ? n : 0);
  document.querySelectorAll('#mtrG canvas[data-k]').forEach(cv => rendreVignette(cv, cv.dataset.k, 0.4, A, B));
}
function animer(cv){
  cancelAnimationFrame(MTR.anim || 0);
  if(!cv) return;
  const n = cible(), [A, B] = images(coupeOk(n) ? n : 0), t0 = performance.now();
  let der = 0;
  const tour = now => {
    if(!cv.isConnected){ MTR.anim = null; return; }
    if(now - der > 45){ der = now; const u = ((now - t0) / 1400) % 1; rendreVignette(cv, cv.dataset.k, u < 0.15 ? 0 : u > 0.85 ? 1 : (u - 0.15) / 0.7, A, B); }
    MTR.anim = requestAnimationFrame(tour);
  };
  MTR.anim = requestAnimationFrame(tour);
}
function arreter(cv){ cancelAnimationFrame(MTR.anim || 0); MTR.anim = null; if(cv && cv.isConnected){ const n = cible(), [A, B] = images(coupeOk(n) ? n : 0); rendreVignette(cv, cv.dataset.k, 0.4, A, B); } }

// ============================================================
// 6. LE PANNEAU « TRANSITIONS »
// ============================================================
function panneau(){ return document.querySelector('#edInspC .ed-p[data-o="transitions"]'); }
function carte(k, nom, actif, dims){
  return `<div class="mtr-c${actif ? ' on' : ''}" data-k="${k}" title="${E(nom)}"><canvas data-k="${k}" width="${dims.w}" height="${dims.h}"></canvas><b>${E(nom)}</b>${NOUVELLES.has(k) ? '<em>nouveau</em>' : ''}</div>`;
}
function panneauHtml(){
  const n = cible(), S = segs(), ok = coupeOk(n), k = ok ? trDe(n) : null, c = ok ? clipDe(n) : null;
  const d = ok ? (dureeTr(S[n], S[n + 1]) || (c && c.trD) || MTR.duree) : MTR.duree;
  const dims = vignetteDims();
  const tete = ok ? `<div class="mtr-t">
      <button type="button" class="mtr-nav" onclick="mtrAller(-1)" ${coupeProchePrec(n) ? '' : 'disabled'} title="Coupe précédente">‹</button>
      <div><b>Coupe ${n + 1} → ${n + 2}</b><small>à ${tcCourt(S[n].t1)} · ${E(NOMS[k] || k)}</small></div>
      <button type="button" class="mtr-nav" onclick="mtrAller(1)" ${coupeProcheSuiv(n) ? '' : 'disabled'} title="Coupe suivante">›</button>
      <button type="button" class="mtr-voir" onclick="mtrVoir()" ${k === 'coupe' ? 'disabled' : ''}>${ic('play', 13)} Voir</button></div>
    <div class="mtr-l"><span>Durée</span><input type="range" min="0.1" max="2" step="0.05" value="${k === 'coupe' ? MTR.duree : d}" oninput="mtrDuree(this.value)" ${k === 'coupe' ? 'disabled' : ''}><b id="mtrDT">${k === 'coupe' ? '—' : d.toFixed(1).replace('.', ',') + ' s'}</b></div>`
    : `<div class="ag-hint" style="margin-top:0">Ajoute au moins deux plans : une transition se pose entre deux plans.</div>`;
  const rec = MTR.recentes.filter(x => NOMS[x]);
  const fams = [['tout', 'Toutes']].concat(FAMILLES.map(f => [f[0], f[1]]));
  const corps = FAMILLES.filter(f => MTR.famille === 'tout' || f[0] === MTR.famille).map(([id, nom, L]) => `${MTR.famille === 'tout' ? `<div class="mtr-ft">${nom}</div>` : ''}<div class="mtr-g">${L.map(([kk, nn]) => carte(kk, nn, kk === k, dims)).join('')}</div>`).join('');
  return `<div class="mtr">${tete}
    <div class="mtr-btns"><button type="button" onclick="mtrPartout()">${ic('check', 13)} Sur toutes les coupes</button><button type="button" onclick="mtrVarier()">${ic('shuffle', 13)} Varier</button><button type="button" onclick="mtrRetirerTout()">Retirer partout</button></div>
    <label class="ag-check mtr-ap"><input type="checkbox" ${MTR.apercu ? 'checked' : ''} onchange="MTR.apercu=this.checked;try{localStorage.setItem('mtr.apercu',JSON.stringify(this.checked))}catch(e){}"> Rejouer la coupe à chaque choix</label>
    <div id="mtrG">
      ${rec.length ? `<div class="mtr-ft">${ic('history', 12)} Récentes</div><div class="mtr-g">${rec.map(kk => carte(kk, NOMS[kk], kk === k, dims)).join('')}</div>` : ''}
      <div class="ag-pills mtr-f">${fams.map(([id, nom]) => `<button type="button" class="${MTR.famille === id ? 'on' : ''}" onclick="mtrFamille('${id}')">${nom}</button>`).join('')}</div>
      ${corps}
    </div>
    <div class="ag-hint">${mobile() ? 'Touche une transition pour la poser sur la coupe. Reste appuyé puis glisse-la sur une autre coupe.' : 'Clique une transition pour la poser sur la coupe choisie, ou glisse-la sur n\'importe quelle coupe de la table de montage. T : poser la dernière transition sur la coupe la plus proche.'}</div></div>`;
}
function coupeProchePrec(n){ for(let k = n - 1; k >= 0; k--) if(coupeOk(k)) return true; return false; }
function coupeProcheSuiv(n){ const S = segs(); for(let k = n + 1; k < S.length - 1; k++) if(coupeOk(k)) return true; return false; }
function rendre(){
  const p = panneau(); if(!p || CR.edOutil !== 'transitions') return;
  const g = document.getElementById('mtrG'), haut = document.getElementById('edInsp') ? document.getElementById('edInsp').scrollTop : 0;
  p.innerHTML = panneauHtml();
  brancher(p); rendreVignettes();
  const insp = document.getElementById('edInsp'); if(insp && g) insp.scrollTop = haut;
  titre();
}
window.mtrFamille = function(f){ MTR.famille = f; rendre(); };
function titre(){
  const t = document.getElementById('edInspT'); if(!t || CR.edOutil !== 'transitions') return;
  const n = cible(); t.innerHTML = `${ic('trans', 16)}<b>Transitions</b><span>${coupeOk(n) ? 'Coupe ' + (n + 1) + ' → ' + (n + 2) : ''}</span>`;
}
// Cartes : clic = poser ; survol = animation ; glisser = sur une coupe
function brancher(root){
  root.querySelectorAll('.mtr-c').forEach(el => {
    const cv = el.querySelector('canvas');
    el.onmouseenter = () => animer(cv); el.onmouseleave = () => arreter(cv);
    el.onpointerdown = e => appui(e, el);
    el.oncontextmenu = e => { if(e.pointerType !== 'mouse') e.preventDefault(); };
  });
}
window.mtrOuvrir = function(){
  if(!document.querySelector('.ed.mpx')) return;
  monterOutil();
  if(MT.sel && MT.sel.t === 't') MTR.n = MT.sel.n; else MTR.n = coupeProche(AN.t);
  if(CR.edOutil === 'transitions' && !mobile()){ rendre(); return; }
  edOutil('transitions');
};

// ---------- Glisser une transition sur une coupe ----------
function appui(e, el){
  if(e.button > 0) return;
  const d = { k: el.dataset.k, id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, el, actif: false, touch: e.pointerType !== 'mouse', timer: 0 };
  finDrag(); MTR.drag = d;
  if(d.touch) d.timer = setTimeout(() => { if(MTR.drag === d && !d.actif) lancer(d); }, 380);
  document.addEventListener('pointermove', bouge, true); document.addEventListener('pointerup', lache, true); document.addEventListener('pointercancel', finDrag, true);
}
function lancer(d){
  d.actif = true; try { navigator.vibrate && navigator.vibrate(12); } catch(e){}
  const g = document.createElement('div'); g.className = 'mtr-ghost'; g.innerHTML = `${ic('trans', 16)}<b>${E(NOMS[d.k] || d.k)}</b>`; document.body.appendChild(g); d.ghost = g;
  const m = document.createElement('div'); m.className = 'mtr-mark'; m.style.display = 'none'; m.innerHTML = '<i></i><span></span>'; document.body.appendChild(m); d.mark = m;
  if(mobile() && MPX.tiroir && typeof mpxTiroir === 'function') mpxTiroir(false);
  place(d);
}
function place(d){ if(d.ghost){ d.ghost.style.left = d.x + 'px'; d.ghost.style.top = d.y + 'px'; } }
function coupeSous(x, y){
  const w = document.querySelector('#mtZone .mt-piste-w'), pi = document.getElementById('mtPiste'); if(!w || !pi) return null;
  const r = w.getBoundingClientRect(); if(x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
  const pr = pi.getBoundingClientRect(), t = (x - pr.left - (MPB.x0 || 0)) / (MPB.pps || 40);
  const n = coupeProche(t); if(n == null) return null;
  return { n, x: pr.left + (MPB.x0 || 0) + segs()[n].t1 * (MPB.pps || 40), r };
}
function bouge(e){
  const d = MTR.drag; if(!d || e.pointerId !== d.id) return;
  d.x = e.clientX; d.y = e.clientY;
  if(!d.actif){ const dist = Math.hypot(d.x - d.x0, d.y - d.y0); if(d.touch){ if(dist > 10) finDrag(); return; } if(dist < 6) return; lancer(d); }
  e.preventDefault(); place(d);
  d.cible = coupeSous(d.x, d.y);
  const m = d.mark; if(!m) return;
  if(!d.cible){ m.style.display = 'none'; d.ghost.classList.remove('ok'); return; }
  m.style.display = ''; m.style.left = Math.round(d.cible.x) + 'px'; m.style.top = Math.round(d.cible.r.top) + 'px'; m.style.height = Math.round(d.cible.r.height) + 'px';
  m.querySelector('span').textContent = (NOMS[d.k] || d.k) + ' · coupe ' + (d.cible.n + 1) + ' → ' + (d.cible.n + 2);
  d.ghost.classList.add('ok');
}
function finDrag(e){
  const d = MTR.drag; if(!d) return; if(e && e.pointerId != null && e.pointerId !== d.id) return;
  clearTimeout(d.timer); if(d.ghost) d.ghost.remove(); if(d.mark) d.mark.remove();
  MTR.drag = null;
  document.removeEventListener('pointermove', bouge, true); document.removeEventListener('pointerup', lache, true); document.removeEventListener('pointercancel', finDrag, true);
}
function lache(e){
  const d = MTR.drag; if(!d || e.pointerId !== d.id) return;
  const actif = d.actif, c = d.cible, k = d.k; finDrag();
  if(!actif){ mtrPoser(k); return; }
  e.preventDefault(); e.stopPropagation(); MPX.bloqueClic = Date.now(); MPB.bloque = Date.now();
  if(c) mtrPoser(k, c.n);
}
document.addEventListener('touchmove', e => { if(MTR.drag && MTR.drag.actif && e.cancelable) e.preventDefault(); }, { passive: false });

// ============================================================
// 7. DANS LA TABLE DE MONTAGE : la zone de chaque transition
// ============================================================
function zones(){
  const pi = document.getElementById('mtPiste'); if(!pi || !pi.classList.contains('mpb')) return;
  pi.querySelectorAll('.mtr-z').forEach(x => x.remove());
  const S = segs(), pps = MPB.pps || 40, x0 = MPB.x0 || 0, y = MPB.yMain || 0, n0 = cible();
  let h = '';
  for(let n = 0; n < S.length - 1; n++){
    const d = dureeTr(S[n], S[n + 1]); if(d <= 0) continue;
    h += `<i class="mtr-z${n === n0 && CR.edOutil === 'transitions' ? ' on' : ''}" style="left:${(x0 + (S[n].t1 - d / 2) * pps).toFixed(1)}px;width:${Math.max(4, d * pps).toFixed(1)}px;top:${y}px" title="${E(NOMS[S[n].tr] || S[n].tr)}"></i>`;
  }
  if(h) pi.insertAdjacentHTML('beforeend', h);
  // Les boutons entre les plans : le nom de la transition
  pi.querySelectorAll('.mt-tr').forEach((b, i) => { const n = Number((b.getAttribute('onclick') || '').replace(/[^0-9,]/g, '').split(',').pop()); const sg = S[isNaN(n) ? i : n]; if(sg) b.title = 'Transition : ' + (NOMS[sg.tr] || sg.tr) + (sg.tr !== 'coupe' ? ' · ' + (dureeTr(sg, S[(isNaN(n) ? i : n) + 1]) || 0).toFixed(1).replace('.', ',') + ' s' : ''); });
}
function surveiller(){
  const pi = document.getElementById('mtPiste'); if(!pi || pi.mtrObs) return;
  pi.mtrObs = new MutationObserver(muts => {
    if(muts.every(m => [...m.addedNodes, ...m.removedNodes].every(x => x.classList && x.classList.contains('mtr-z')) && m.type === 'childList')) return;
    if(MTR.obsRaf) return; MTR.obsRaf = requestAnimationFrame(() => { MTR.obsRaf = 0; try { zones(); } catch(e){} });
  });
  pi.mtrObs.observe(pi, { childList: true, attributes: true, attributeFilter: ['style'] });
}

// ============================================================
// 8. MISE EN PLACE
// ============================================================
function monterOutil(){
  const ed = document.querySelector('#edPortail .ed.mpx'); if(!ed) return;
  const nav = ed.querySelector('#edOutils'), C = ed.querySelector('#edInspC');
  if(nav && !nav.querySelector('[data-o="transitions"]')){
    const b = document.createElement('button'); b.type = 'button'; b.dataset.o = 'transitions'; b.setAttribute('onclick', 'mtrOuvrir()');
    b.innerHTML = `${ic('trans', 19)}<span>Transitions</span>`;
    const ref = nav.querySelector('[data-o="medias"]') || nav.querySelector('[data-o="montage"]'); if(ref) ref.insertAdjacentElement('afterend', b); else nav.appendChild(b);
    b.classList.toggle('on', CR.edOutil === 'transitions');
  }
  if(C && !C.querySelector('.ed-p[data-o="transitions"]')){ const p = document.createElement('div'); p.className = 'ed-p'; p.dataset.o = 'transitions'; p.style.display = CR.edOutil === 'transitions' ? '' : 'none'; C.appendChild(p); }
  const def = ed.querySelector('#mpxBarre .mpx-defile');
  if(def && !def.querySelector('#mtrB')){
    const h = `<button type="button" id="mtrB" class="mpx-b" onclick="mtrOuvrir()" title="Transitions : poser, choisir, durée (T)">${ic('trans', 19)}<span>Transition</span></button>`;
    const ref = def.querySelector('#mrgB') || def.querySelector('#mpxDup'); if(ref) ref.insertAdjacentHTML('afterend', h); else def.insertAdjacentHTML('beforeend', h);
  }
}
const outilBase = window.edOutil;
window.edOutil = function(id){
  if(id === 'transitions') monterOutil();
  const r = outilBase.apply(this, arguments);
  if(id === 'transitions'){ rendre(); }
  try { zones(); } catch(e){}
  return r;
};
// Toucher le signe entre deux plans : le panneau des transitions s'ouvre
const choisirBase = window.mtChoisir;
window.mtChoisir = function(t, n){
  const r = choisirBase.apply(this, arguments);
  try { if(t === 't' && pro() && coupeOk(n)){ MTR.n = n; if(CR.edOutil !== 'transitions') edOutil('transitions', mobile() ? false : true); else rendre(); } } catch(e){ console.warn('montage-transitions', e); }
  return r;
};
// Le panneau Transition de montage.js garde un lien vers la bibliothèque
function lienPanneau(){
  const hote = document.getElementById('mtPanHote'); if(!hote || !(MT.sel && MT.sel.t === 't')) return;
  const act = hote.querySelector('.mt-pan .mt-act'); if(!act || act.querySelector('.mtr-lien')) return;
  act.insertAdjacentHTML('afterbegin', `<button type="button" class="mtr-lien" onclick="mtrOuvrir()">${ic('trans', 13)} Toutes les transitions (aperçus)</button>`);
}
const edApresBase = window.edApresMt;
window.edApresMt = function(){
  const r = edApresBase.apply(this, arguments);
  try { if(pro()){ monterOutil(); surveiller(); zones(); lienPanneau(); if(CR.edOutil === 'transitions' && !MTR.drag) rendre(); } } catch(e){ console.warn('montage-transitions', e); }
  return r;
};
const renderBase = crRender;
crRender = async function(){
  const etait = CR.edOutil === 'transitions';
  const r = await renderBase.apply(this, arguments);
  try {
    if(CR.vue === 'edit' && document.querySelector('.ed.mpx')){
      monterOutil(); surveiller();
      if(etait || CR.edOutil === 'transitions') edOutil('transitions', true);
      setTimeout(() => { try { if(pro()){ monterOutil(); zones(); if(CR.edOutil === 'transitions') rendreVignettes(); } } catch(e){} }, 600);
    }
  } catch(e){ console.warn('montage-transitions', e); }
  return r;
};
// Les miniatures se refont quand les images du montage sont prêtes
if(typeof anPreparer === 'function'){
  const prepBase = anPreparer;
  anPreparer = async function(){ const r = await prepBase.apply(this, arguments); try { if(CR.edOutil === 'transitions' && pro()) rendreVignettes(); } catch(e){} return r; };
}

// ---------- Raccourcis : T = poser la dernière transition, Maj+T = coupe nette ----------
const MTR_ACTIONS = [
  ['poser', 'Poser la dernière transition sur la coupe la plus proche', ['T'], () => { const n = coupeProche(AN.t); MTR.n = n; mtrPoser(MTR.recentes[0] || 'fondu', n); }],
  ['retirer', 'Coupe nette sur la coupe la plus proche', ['Shift+T'], () => { const n = coupeProche(AN.t); MTR.n = n; mtrPoser('coupe', n); }],
  ['ouvrir', 'Ouvrir les transitions', ['Alt+T'], () => mtrOuvrir()]
];
function touches(){ const perso = lsGet('mtr.raccourcis', {}) || {}, o = {}; MTR_ACTIONS.forEach(([id, , def]) => { o[id] = Array.isArray(perso[id]) ? perso[id] : def.slice(); }); return o; }
function combo(e){
  let k = e.key; if(!k || ['Control', 'Shift', 'Alt', 'Meta', 'AltGraph', 'Dead'].includes(k)) return '';
  if(k === ' ' || k === 'Spacebar') k = 'Space';
  if(e.altKey && e.code && /^Key[A-Z]$/.test(e.code)) k = e.code.slice(3);
  if(k.length === 1) k = k.toUpperCase();
  const lettre = /^[A-Z0-9]$/.test(k) || k.length > 1, p = [];
  if(e.ctrlKey || e.metaKey) p.push('Ctrl'); if(e.altKey) p.push('Alt'); if(e.shiftKey && lettre) p.push('Shift');
  p.push(k); return p.join('+');
}
const JOLI = { Shift: 'Maj', Ctrl: 'Ctrl', Alt: 'Alt', Space: 'Espace' };
function joli(c){ return String(c).split('+').map(x => JOLI[x] || x).join(' + '); }
window.addEventListener('keydown', e => {
  if(MPX.capture || !pro()) return;
  if(typeof RT !== 'undefined' && RT.tap) return;
  const t = e.target, tag = (t && t.tagName) || '';
  if(/INPUT|TEXTAREA|SELECT/.test(tag) && !(tag === 'INPUT' && /range|checkbox|radio|button/.test(t.type || ''))) return;
  if((t && t.isContentEditable) || document.querySelector('.ag-dlg-bg, .ag-sheet')) return;
  if(e.key === 'Escape' && MTR.drag){ e.stopImmediatePropagation(); finDrag(); return; }
  const c = combo(e), T0 = touches(), a = c && MTR_ACTIONS.find(([id]) => (T0[id] || []).includes(c));
  if(a){ e.preventDefault(); e.stopImmediatePropagation(); if(t && t.blur && tag === 'INPUT') t.blur(); a[3](); }
}, true);
if(typeof window.mpxRaccourcis === 'function'){
  const rcBase = window.mpxRaccourcis;
  window.mpxRaccourcis = function(){
    const r = rcBase.apply(this, arguments);
    try {
      const sh = document.getElementById('mpxKeysS'), kb = sh && sh.querySelector('.mpx-kb'); if(!kb) return r;
      const T0 = touches(), perso = lsGet('mtr.raccourcis', {}) || {};
      kb.insertAdjacentHTML('beforebegin', `<div class="mpx-pt">Transitions</div><div class="mpx-kl mtr-kl">${MTR_ACTIONS.map(([id, nom]) => `<div class="mpx-k ${perso[id] ? 'perso' : ''}" data-mtr="${id}"><span>${nom}</span><div class="mpx-kk">${(T0[id] || []).length ? T0[id].map(x => `<kbd>${E(joli(x))}</kbd>`).join('<small>ou</small>') : '<small>aucune</small>'}</div><button type="button" class="st-link" onclick="mtrChanger('${id}')">Changer</button></div>`).join('')}</div>`);
    } catch(e){ console.warn('montage-transitions', e); }
    return r;
  };
}
window.mtrChanger = function(id){
  const row = document.querySelector(`#mpxKeysS .mpx-k[data-mtr="${id}"]`);
  if(row){ row.classList.add('ecoute'); row.querySelector('.mpx-kk').innerHTML = '<small>Appuie sur la touche...</small>'; }
  MPX.capture = c => {
    MPX.capture = null;
    if(!c){ mpxRaccourcis(); return; }
    const perso = lsGet('mtr.raccourcis', {}) || {}, T0 = touches();
    let pris = '';
    MTR_ACTIONS.forEach(([a, nom]) => { if(a !== id && (T0[a] || []).includes(c)){ perso[a] = T0[a].filter(x => x !== c); pris = nom; } });
    const lots = [['mpx.raccourcis', ['Space', 'C', 'S', 'Delete', 'Backspace', 'Shift+Delete', 'Shift+Backspace', 'Ctrl+Z', 'Ctrl+Y', 'Ctrl+Shift+Z', 'ArrowLeft', 'ArrowRight', 'Shift+ArrowLeft', 'Shift+ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'B', 'Ctrl+D', 'M', '?']], ['mpb.raccourcis', ['N', 'Ctrl+A', '+', '=', '-', 'F', 'I']], ['mmd.raccourcis', ['Shift+M', 'Ctrl+I', 'Shift+F', 'Shift+Q']], ['mrg.raccourcis', ['A', 'Shift+D']]];
    const prise = lots.some(([cle, def]) => { const p2 = lsGet(cle, {}) || {}; return Object.values(p2).some(l => Array.isArray(l) && l.includes(c)) || (def.includes(c) && !Object.keys(p2).length); });
    if(prise){ agToast(`${joli(c)} sert déjà à une autre action : choisis une autre touche`, 'info'); mpxRaccourcis(); return; }
    perso[id] = [c]; lsSet('mtr.raccourcis', perso);
    agToast(pris ? `${joli(c)} : retirée de « ${pris} »` : `Nouvelle touche : ${joli(c)}`, pris ? 'info' : 'success');
    mpxRaccourcis();
  };
};
if(typeof window.mpxRaccourcisDefaut === 'function'){
  const defBase = window.mpxRaccourcisDefaut;
  window.mpxRaccourcisDefaut = async function(){ const avantP = JSON.stringify(lsGet('mpx.raccourcis', {})); const r = await defBase.apply(this, arguments); if(JSON.stringify(lsGet('mpx.raccourcis', {})) !== avantP || avantP === '{}'){ lsSet('mtr.raccourcis', {}); if(document.getElementById('mpxKeysS')) mpxRaccourcis(); } return r; };
}
if(typeof window.mpxPlus === 'function'){
  const plusBase = window.mpxPlus;
  window.mpxPlus = function(){
    const r = plusBase.apply(this, arguments);
    try {
      const pl = document.querySelector('#mpxPlusS .mpx-pl'); if(!pl) return r;
      const it = (icone, txt, sous, fn) => `<button type="button" class="mpx-pi" onclick="agCloseSheet('mpxPlusS');${fn}">${ic(icone, 18)}<div><b>${txt}</b>${sous ? `<small>${sous}</small>` : ''}</div></button>`;
      pl.insertAdjacentHTML('afterbegin', '<div class="mpx-pt">Transitions</div>' + it('trans', 'Transitions', '43 transitions avec aperçu, durée, partout', 'mtrOuvrir()') + it('shuffle', 'Varier les transitions', 'Une transition différente à chaque coupe', 'mtrVarier()'));
    } catch(e){ console.warn('montage-transitions', e); }
    return r;
  };
}

(function css(){
  if(document.getElementById('mtrCss')) return;
  const st = document.createElement('style'); st.id = 'mtrCss';
  st.textContent = `
.mtr-t{display:flex;align-items:center;gap:8px;padding:8px;border-radius:12px;background:var(--card2);border:1px solid var(--border);margin-bottom:8px}
.mtr-t>div{flex:1;min-width:0}.mtr-t b{display:block;color:var(--text);font-size:13px}.mtr-t small{display:block;color:var(--muted);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mtr-nav{width:30px !important;height:30px;margin:0;padding:0;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text);font-size:18px;cursor:pointer}.mtr-nav:disabled{opacity:.35;cursor:default}
.mtr-voir{width:auto !important;margin:0;display:inline-flex;align-items:center;gap:4px;padding:6px 10px;border-radius:9px;border:none;background:var(--accent,#48A89A);color:#fff;font-weight:600;font-size:12px;cursor:pointer}.mtr-voir:disabled{opacity:.4}
.mtr-l{display:grid;grid-template-columns:56px minmax(0,1fr) 48px;align-items:center;gap:8px;margin:2px 0 8px;font-size:12px;color:var(--text)}
.mtr-l input{width:100%;margin:0;accent-color:var(--accent,#48A89A)}.mtr-l b{text-align:right;font-variant-numeric:tabular-nums}
.mtr-btns{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}
.mtr-btns button,.mtr-lien{width:auto !important;margin:0;display:inline-flex;align-items:center;gap:5px;padding:6px 10px;border-radius:9px;border:1px solid var(--border);background:var(--card);color:var(--text);font-size:12px;font-weight:600;cursor:pointer}
.mtr-ap{margin:6px 0 4px;font-size:12px}
.mtr-f{margin:8px 0 6px}
.mtr-ft{display:flex;align-items:center;gap:5px;margin:10px 0 6px;font-size:11px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:var(--muted)}
.mtr-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(72px,1fr));gap:6px}
.mtr-c{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 4px 5px;border-radius:11px;background:var(--card2);border:1px solid var(--border);cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:pan-y}
.mtr-c:hover{border-color:var(--accent,#48A89A)}
.mtr-c.on{border-color:var(--accent,#48A89A);box-shadow:0 0 0 2px var(--accent,#48A89A) inset}
.mtr-c canvas{border-radius:6px;background:#000;max-width:100%;pointer-events:none}
.mtr-c b{font-size:10.5px;font-weight:600;color:var(--text);text-align:center;line-height:1.15;min-height:24px;display:flex;align-items:center}
.mtr-c em{position:absolute;top:3px;right:3px;font-size:8.5px;font-style:normal;font-weight:800;color:#fff;background:#f5a524;padding:1px 4px;border-radius:5px;pointer-events:none}
.mtr-ghost{position:fixed;z-index:3000;transform:translate(-50%,-130%);pointer-events:none;display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:10px;background:var(--card2);border:2px solid var(--muted);color:var(--text);font-size:12px;box-shadow:0 10px 30px rgba(0,0,0,.5)}
.mtr-ghost.ok{border-color:var(--accent,#48A89A)}
.mtr-mark{position:fixed;z-index:2900;width:0;pointer-events:none}
.mtr-mark i{position:absolute;left:-2px;top:0;bottom:0;width:4px;border-radius:2px;background:#b07cff;box-shadow:0 0 12px #b07cff}
.mtr-mark span{position:absolute;left:8px;top:2px;white-space:nowrap;font-size:11px;font-weight:700;color:#fff;background:rgba(0,0,0,.78);padding:2px 7px;border-radius:6px}
.mtr-z{position:absolute;height:64px;z-index:1;pointer-events:none;border-radius:6px;background:repeating-linear-gradient(135deg,rgba(176,124,255,.42) 0 5px,rgba(176,124,255,.12) 5px 10px);box-shadow:0 0 0 1px rgba(176,124,255,.7) inset}
.mtr-z.on{box-shadow:0 0 0 2px #b07cff inset}
@media(max-width:899px){.mtr-g{grid-template-columns:repeat(auto-fill,minmax(66px,1fr))}}`;
  document.head.appendChild(st);
})();
})();
