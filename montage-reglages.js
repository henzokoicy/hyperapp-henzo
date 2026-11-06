// montage-reglages.js — version 1
// ============================================================
// MONTAGE-REGLAGES.JS - Lot D : les réglages d'un clip
// (écran de montage des Créations)
// ------------------------------------------------------------
// - Position, échelle, rotation : avec des curseurs, ou directement
//   dans l'aperçu (bouton « Ajuster » : on glisse pour déplacer, molette
//   ou pincer pour agrandir, deux doigts pour tourner).
// - Opacité.
// - Fondu entrant et sortant : sur les plans, les incrustations, les sons.
// - Vitesse et ralenti (0,1x à 4x) : la durée du clip s'adapte (le même
//   passage de la vidéo, plus lent ou plus rapide).
// - Volume des sons (jusqu'à 200 %) et formes d'onde dans la table de
//   montage (sons, musique, son gardé d'une vidéo).
// - « Garder le son de la vidéo » : le son d'un rush est posé sur une
//   piste son, réglable comme les autres sons.
// Rien ne change tant que tu ne touches pas un réglage (aucun effet par défaut).
// Tout est ajouté par enveloppes : montage.js, rushs.js, montage-pistes.js... restent tels quels.
// Utilise montage.js, montage-pro.js, montage-pistes.js, rushs.js, musique-libre.js, animations.js.
// ============================================================
(function(){
'use strict';
if(typeof CR === 'undefined' || typeof AN === 'undefined' || typeof MT === 'undefined' || typeof MPX === 'undefined' || typeof MPB === 'undefined' || typeof mtMaj !== 'function' || typeof mtEstSeq !== 'function' || typeof mtAvantPublic !== 'function') return;

const MRG = { ajuster: false, glisse: 0, geste: null, ondes: new WeakMap(), sonVid: {} };
window.MRG = MRG;
const VIDE = '__vide';

if(typeof AG_ICONS !== 'undefined'){
  const I = {
    move: '<path d="M12 3v18M3 12h18"/><path d="m9 6 3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/>',
    rotate: '<path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v5h-5"/>',
    fadeIn: '<path d="M3 20 21 4v16z"/>',
    fadeOut: '<path d="M3 4l18 16H3z"/>',
    speed: '<path d="M12 14l4-4"/><path d="M3.5 18a10 10 0 1 1 17 0"/>',
    opacity: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 7h6M12 11h8.5M12 15h8M12 19h4"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
    volume: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
    wave: '<path d="M2 12h2M6 8v8M10 5v14M14 8v8M18 10v4M22 12h0"/>'
  };
  Object.keys(I).forEach(k => { if(!AG_ICONS[k]) AG_ICONS[k] = I[k]; });
}
const ic = (n, s) => agIcon(n, s || 18);
const E = s => crE(String(s == null ? '' : s));
const r2 = v => Math.round(v * 100) / 100;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function uid(p){ return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function mobile(){ return !window.matchMedia('(min-width:900px)').matches; }
function pro(){ return document.body.classList.contains('ed-ouvert') && CR.vue === 'edit' && !!CR.modele && mtEstSeq(CR.modele) && !!document.querySelector('.ed.mpx') && !!document.getElementById('mtPiste'); }
function planNow(){ AN.plan = anPlan(); return AN.plan; }
function photoDe(k){ return CR.photos.find(p => p.k === k) || null; }
function ml(){ return typeof ML !== 'undefined' ? ML : null; }
function sonBuf(s){ const M = ml(); return M && M.buf ? M.buf[s.id] : null; }
function sonDur(s){ const b = sonBuf(s), m = b ? Math.max(0.1, b.duration - (s.off || 0)) : null; if(s.dur != null) return m != null ? Math.min(s.dur, m) : s.dur; return m != null ? m : 1; }
function pisteMuette(id){ const p = (anVid().pistes || []).find(x => x.id === id); return !!(p && p.muet); }
function vibre(ms){ try { if(navigator.vibrate) navigator.vibrate(ms || 10); } catch(e){} }

// ============================================================
// 1. LES DONNÉES D'UN CLIP
// ------------------------------------------------------------
// Sur un plan (anVid().clips[n]) ou une incrustation :
//   tf = { x, y, s, r }   position (fraction de l'image, 0 = centre),
//                          échelle (1 = normal), rotation (degrés)
//   op  = opacité (0 à 1), fi / fo = fondu entrant / sortant (secondes)
//   vit = vitesse (rushs.js et montage-pistes.js la lisent déjà)
// Sur un son (anVid().sons[...]) : vol, fi, fo (et srcVid : son gardé d'une vidéo)
// Un objet tf n'est jamais modifié sur place (une copie à chaque fois) :
// les deux moitiés d'un plan coupé restent indépendantes.
// ============================================================
const TF0 = { x: 0, y: 0, s: 1, r: 0 };
function tfDe(c){ return Object.assign({}, TF0, (c && c.tf) || {}); }
function aTf(c){ const t = c && c.tf; return !!t && (Math.abs(t.x || 0) > 0.0005 || Math.abs(t.y || 0) > 0.0005 || Math.abs((t.s == null ? 1 : t.s) - 1) > 0.0005 || Math.abs(t.r || 0) > 0.05); }
function aRegl(c){ return !!c && (aTf(c) || (c.op != null && c.op < 0.999) || (c.fi || 0) > 0.001 || (c.fo || 0) > 0.001); }
// Opacité à l'instant t (opacité x fondus)
function alphaA(c, t0, t1, t){
  let a = c.op == null ? 1 : clamp(c.op, 0, 1);
  const d = Math.max(0.05, t1 - t0), fi = Math.min(c.fi || 0, d), fo = Math.min(c.fo || 0, d);
  if(fi > 0.001) a *= clamp((t - t0) / fi, 0, 1);
  if(fo > 0.001) a *= clamp((t1 - t) / fo, 0, 1);
  return a;
}
function fmtDims(){ const d = crDims(CR.fmt, 1); return { W: d.w, H: d.h }; }

// ============================================================
// 2. LE DESSIN
// ------------------------------------------------------------
// Piste principale : rushs.js donne l'image de chaque plan (rvPour) ;
// si le plan a des réglages, on lui donne une image déjà placée
// (même cadre que la vidéo finale), que montage.js dessine ensuite
// avec son mouvement, sa transition et son filtre comme avant.
// ============================================================
const TOILES = {};
function toile(cle, w, h){ let c = TOILES[cle]; if(!c){ c = TOILES[cle] = document.createElement('canvas'); } if(c.width !== w || c.height !== h){ c.width = w; c.height = h; } return c; }
function dimsDe(im){ return { w: im.videoWidth || im.naturalWidth || im.width || 0, h: im.videoHeight || im.naturalHeight || im.height || 0 }; }
function placer(sg, im, tt){
  const V = anVid(), c = V.clips && sg && sg.n != null ? V.clips[sg.n] : null;
  if(!c || c.k === VIDE || c.k !== sg.k || !aRegl(c) || !im) return im;
  const { w: iw, h: ih } = dimsDe(im); if(!iw || !ih) return im;
  const a = alphaA(c, sg.t0, sg.t1, tt), T = tfDe(c);
  const entiere = sg.cadre === 'flou' || sg.cadre === 'bandes';
  // Le cadre de travail : la photo entière (cadrage « photo entière ») ou le cadre de la vidéo
  let cw, ch;
  if(entiere){ cw = iw; ch = ih; }
  else { const F = fmtDims(), r = F.W / F.H; cw = Math.min(iw, ih * r); ch = cw / r; }
  const k0 = Math.min(1, 2560 / Math.max(cw, ch)); cw = Math.max(2, Math.round(cw * k0)); ch = Math.max(2, Math.round(ch * k0));
  const cv = toile('p' + sg.n, cw, ch), g = cv.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, ch);
  if(a <= 0.001) return cv;
  g.save(); g.globalAlpha = a;
  g.translate(cw / 2 + T.x * cw, ch / 2 + T.y * ch); g.rotate(T.r * Math.PI / 180); g.scale(T.s, T.s);
  if(entiere) g.drawImage(im, -cw / 2, -ch / 2, cw, ch);
  else {
    // Remplir le cadre (comme montage.js), en gardant le point important du plan
    const k = Math.max(cw / iw, ch / ih), dw = iw * k, dh = ih * k, lx = (dw - cw) / 2, ly = (dh - ch) / 2;
    let px = 0, py = 0; const Fo = sg.focal; if(Fo){ px = clamp((Fo.x - 0.5) * 2, -1, 1); py = clamp((Fo.y - 0.5) * 2, -1, 1); }
    g.drawImage(im, -dw / 2 - px * lx, -dh / 2 - py * ly, dw, dh);
  }
  g.restore();
  return cv;
}
if(typeof window.rvPour === 'function'){
  const pourBase = window.rvPour;
  window.rvPour = function(sg, img, tt){
    const im = pourBase.apply(this, arguments);
    try {
      const r = placer(sg, im, tt);
      // montage.js déplace l'image vers le point important : déjà fait ici, on l'enlève le temps du dessin
      if(r !== im && sg.focal && window.mtSegCourant === sg && !(sg.cadre === 'flou' || sg.cadre === 'bandes')){ const f = sg.focal; sg.focal = null; Promise.resolve().then(() => { sg.focal = f; }); }
      return r;
    } catch(e){ console.warn('montage-reglages', e); return im; }
  };
}
// Incrustations : montage-pistes.js les dessine plein cadre (anCover) ; on les place
function incrustA(t){
  const L = [];
  (anVid().pistes || []).forEach(p => { if(p.type !== 'video' || p.cache) return; (p.clips || []).forEach(c => { if(t >= c.t && t < c.t + c.d) L.push(c); }); });
  return L;
}
const dessinBase = window.mtDessiner;
window.mtDessiner = function(g, W, H, s, tt, imgs){
  const L = incrustA(tt).filter(aRegl);
  if(!L.length || typeof anCover !== 'function') return dessinBase.apply(this, arguments);
  // Les images de ces incrustations (photo : la même image ; vidéo : le même fichier)
  const pour = im => L.find(c => { const i = CR.photos.findIndex(p => p.k === c.k), p = CR.photos[i]; if(!p) return false; if(c.mrgFait) return false; if(imgs && imgs[i] === im) return true; return !!(p.video && im && im.tagName === 'VIDEO' && (im.mpbUrl === p.url || im.src === p.url)); });
  const coverBase = anCover;
  anCover = function(g2, im, x, y, w, h){
    const c = g2 === g && x === 0 && y === 0 && w === W && h === H ? pour(im) : null;
    if(!c) return coverBase.apply(this, arguments);
    c.mrgFait = true;
    const a = alphaA(c, c.t, c.t + c.d, tt); if(a <= 0.001) return;
    const T = tfDe(c);
    g2.save(); g2.globalAlpha *= a;
    g2.translate(W / 2 + T.x * W, H / 2 + T.y * H); g2.rotate(T.r * Math.PI / 180); g2.scale(T.s, T.s);
    try { coverBase.call(this, g2, im, -W / 2, -H / 2, W, H, 1, 0, 0); } finally { g2.restore(); }
  };
  try { return dessinBase.apply(this, arguments); }
  finally { anCover = coverBase; L.forEach(c => { delete c.mrgFait; }); }
};

// ============================================================
// 3. LE SON : volume, fondus (aperçu et vidéo finale)
// ============================================================
function aFondu(s){ return (s.fi || 0) > 0.001 || (s.fo || 0) > 0.001 || (s.vol != null && s.vol > 1); }
function gainA(s, tau){ const D = sonDur(s), v = s.vol == null ? 1 : s.vol; let k = 1; if((s.fi || 0) > 0.001) k = Math.min(k, clamp((tau - s.t) / s.fi, 0, 1)); if((s.fo || 0) > 0.001) k = Math.min(k, clamp((s.t + D - tau) / s.fo, 0, 1)); return v * k; }
// Programme le volume d'un son (contexte c, temps de la vidéo t0 joué à c.currentTime + decal)
function enveloppe(gn, s, base, t0){
  const D = sonDur(s), a = Math.max(t0, s.t), fin = s.t + D, pts = [a];
  if((s.fi || 0) > 0.001 && s.t + s.fi > a) pts.push(s.t + s.fi);
  if((s.fo || 0) > 0.001 && fin - s.fo > a) pts.push(fin - s.fo);
  pts.push(fin);
  const vus = [...new Set(pts.map(x => r2(x)))].sort((x, y) => x - y);
  gn.gain.setValueAtTime(gainA(s, vus[0]), base + (vus[0] - t0));
  vus.slice(1).forEach(x => gn.gain.linearRampToValueAtTime(Math.max(0, gainA(s, Math.min(x, fin - 0.001))), base + (x - t0)));
}
function jouerFondus(){
  const M = ml(); if(!M || !AN.lecture) return;
  const L = (anVid().sons || []).filter(s => aFondu(s) && !pisteMuette(s.piste) && sonBuf(s)); if(!L.length) return;
  if(!M.ctx){ try { M.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ return; } }
  const c = M.ctx, t0 = AN.t; try { if(c.state === 'suspended') c.resume(); } catch(e){}
  L.forEach(s => {
    const dur = sonDur(s), off = s.off || 0; if(s.t + dur <= t0 + 0.01) return;
    const deja = Math.max(0, t0 - s.t), src = c.createBufferSource(), gn = c.createGain();
    src.buffer = sonBuf(s); src.connect(gn); gn.connect(c.destination);
    enveloppe(gn, s, c.currentTime, t0);
    try { src.start(c.currentTime + Math.max(0, s.t - t0), off + deja, Math.max(0.01, dur - deja)); } catch(e){ return; }
    (M.src = M.src || []).push(src);
  });
}
// Les sons avec fondu (ou plus forts que 100 %) sont joués ici, les autres comme avant
function sansFondus(fn, ctx, args){
  const V = anVid(), tous = V.sons;
  if(!tous || !tous.some(aFondu)) return fn.apply(ctx, args);
  V.sons = tous.filter(s => !aFondu(s));
  try { return fn.apply(ctx, args); } finally { if(V.sons !== tous) V.sons = tous; }
}
const lectureBase = anLecture;
anLecture = function(){ const r = sansFondus(lectureBase, this, arguments); try { jouerFondus(); } catch(e){ console.warn('montage-reglages', e); } return r; };
const allerBase = anAller;
anAller = function(){ const r = sansFondus(allerBase, this, arguments); try { if(AN.lecture) jouerFondus(); } catch(e){} return r; };
if(typeof window.mlAjouterSons === 'function'){
  const ajBase = window.mlAjouterSons;
  window.mlAjouterSons = async function(off, D){
    const V = anVid(), tous = V.sons || [], L = tous.filter(aFondu);
    if(!L.length) return ajBase.apply(this, arguments);
    V.sons = tous.filter(s => !aFondu(s));
    try { await ajBase.apply(this, arguments); } finally { V.sons = tous; }
    L.forEach(s => {
      if(pisteMuette(s.piste) || !sonBuf(s) || !(s.t < D)) return;
      const src = off.createBufferSource(), gn = off.createGain();
      src.buffer = sonBuf(s); src.connect(gn); gn.connect(off.destination);
      enveloppe(gn, s, 0, 0);
      src.start(Math.max(0, s.t), s.off || 0, Math.max(0.01, sonDur(s)));
    });
  };
}

// ---------- Garder le son d'une vidéo ----------
async function sonDeVideo(p){
  if(MRG.sonVid[p.k]) return MRG.sonVid[p.k];
  if(!p.file || p.manquant) throw new Error('le fichier de la vidéo n\'est pas sur cet appareil');
  if(p.file.size > 400e6) throw new Error('vidéo trop lourde pour en lire le son dans le navigateur (plus de 400 Mo)');
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  try { MRG.sonVid[p.k] = await ctx.decodeAudioData(await p.file.arrayBuffer()); }
  catch(e){ throw new Error('cette vidéo n\'a pas de son lisible'); }
  finally { try { ctx.close && ctx.close(); } catch(e){} }
  return MRG.sonVid[p.k];
}
function pisteSonLibre(t, d){
  const V = anVid(); V.pistes = V.pistes || [];
  const libre = p => !(V.sons || []).some(s => s.piste === p.id && s.t < t + d - 0.001 && t < s.t + sonDur(s) - 0.001);
  let p = V.pistes.filter(x => x.type === 'audio').find(libre);
  if(!p){ let n = 1; while(V.pistes.some(x => x.id === 'a' + n)) n++; p = { id: 'a' + n, type: 'audio', muet: false, cache: false }; V.pistes.push(p); }
  return p;
}
window.mrgGarderSon = async function(){
  const c = cible(); if(!c || c.genre !== 'plan') return;
  const sg = (AN.plan || planNow()).segs[c.n], p = sg ? CR.photos[sg.i] : null; if(!p || !p.video) return;
  agToast('Lecture du son de la vidéo...', 'info');
  let b; try { b = await sonDeVideo(p); } catch(e){ agToast('Son impossible : ' + (e.message || e), 'info'); return; }
  const M = ml(); if(!M){ agToast('Les sons ne sont pas disponibles ici', 'info'); return; }
  const vit = sg.vit == null ? 1 : sg.vit;
  const vin = sg.vin != null ? sg.vin : (typeof rvVinAuto === 'function' ? rvVinAuto(sg) : 0);
  const d = Math.min(sg.t1 - sg.t0, Math.max(0.1, b.duration - vin));
  mtAvantPublic();
  const V = anVid(); V.sons = V.sons || [];
  const s = { id: uid('s'), nom: 'Son de ' + (p.nomF || 'la vidéo').replace(/\.[^.]+$/, '').slice(0, 30), titre: 'Son de la vidéo', t: r2(sg.t0), off: r2(vin), dur: r2(d), vol: 1, srcVid: p.k, origine: 'moi' };
  M.buf[s.id] = b; s.piste = pisteSonLibre(s.t, d).id; V.sons.push(s);
  MT.sel = null; MPB.sel = new Set([s]);
  mtMaj();
  agToast(vit !== 1 ? 'Son ajouté (à vitesse normale : le plan, lui, est à ' + String(vit).replace('.', ',') + 'x)' : 'Son de la vidéo ajouté sur une piste son');
};
// Un brouillon rouvert : le son gardé d'une vidéo revient (relu depuis la vidéo)
if(typeof anPreparer === 'function'){
  const prepBase = anPreparer;
  anPreparer = async function(){
    const r = await prepBase.apply(this, arguments);
    try {
      const M = ml(); if(M) for(const s of anVid().sons || []){
        if(!s.srcVid || M.buf[s.id]) continue;
        const p = photoDe(s.srcVid); if(!p) continue;
        try { M.buf[s.id] = await sonDeVideo(p); } catch(e){}
      }
    } catch(e){ console.warn('montage-reglages', e); }
    return r;
  };
}

// ============================================================
// 4. LE CLIP CHOISI
// ============================================================
// { genre: 'plan' | 'incrust' | 'son', o: objet des données, n (plan), t0, t1 }
function cible(){
  const V = anVid();
  if(MPB.sel && MPB.sel.size === 1){
    const o = [...MPB.sel][0];
    if((V.sons || []).includes(o)) return { genre: 'son', o, t0: o.t, t1: o.t + sonDur(o) };
    for(const p of V.pistes || []) if(p.type === 'video' && (p.clips || []).includes(o)) return { genre: 'incrust', o, t0: o.t, t1: o.t + o.d };
    if(V.clips && V.clips.includes(o)){ const n = V.clips.indexOf(o), sg = (AN.plan || planNow()).segs[n]; if(sg && !sg.vide) return { genre: 'plan', o, n, t0: sg.t0, t1: sg.t1 }; }
  }
  if(MT.sel && MT.sel.t === 'c'){
    const sg = (AN.plan || planNow()).segs[MT.sel.n]; if(!sg || sg.vide) return null;
    return { genre: 'plan', o: V.clips ? V.clips[MT.sel.n] : null, n: MT.sel.n, t0: sg.t0, t1: sg.t1 };
  }
  return null;
}
// Avant un changement : une seule étape d'annulation par geste
function avant(){
  const now = Date.now();
  if(now - MRG.glisse > 700) mtAvantPublic();
  MRG.glisse = now;
  const c = cible(); if(c && c.genre === 'plan' && !c.o){ const V = anVid(); c.o = V.clips ? V.clips[c.n] : null; }
  return cible();
}
function redessiner(){ if(typeof anApercuUneFois === 'function') anApercuUneFois(); }
function majValeurs(){
  const c = cible(); if(!c || !c.o) return;
  const o = c.o, T = tfDe(o), set = (id, v, txt) => { const el = document.getElementById(id); if(el && document.activeElement !== el) el.value = v; const t = document.getElementById(id + 'T'); if(t) t.textContent = txt; };
  set('mrgX', Math.round(T.x * 100), Math.round(T.x * 100) + ' %'); set('mrgY', Math.round(T.y * 100), Math.round(T.y * 100) + ' %');
  set('mrgS', Math.round(T.s * 100), Math.round(T.s * 100) + ' %'); set('mrgR', Math.round(T.r), Math.round(T.r) + '°');
  set('mrgO', Math.round((o.op == null ? 1 : o.op) * 100), Math.round((o.op == null ? 1 : o.op) * 100) + ' %');
  set('mrgFi', o.fi || 0, (o.fi || 0).toFixed(1).replace('.', ',') + ' s'); set('mrgFo', o.fo || 0, (o.fo || 0).toFixed(1).replace('.', ',') + ' s');
  set('mrgV', Math.round((o.vol == null ? 1 : o.vol) * 100), Math.round((o.vol == null ? 1 : o.vol) * 100) + ' %');
}
// Un réglage change (curseur)
window.mrgSet = function(k, v){
  const c = avant(); if(!c || !c.o) return;
  const o = c.o; v = Number(v);
  if(k === 'x' || k === 'y' || k === 's' || k === 'r'){
    const T = tfDe(o);
    T[k] = k === 's' ? clamp(v / 100, 0.05, 5) : k === 'r' ? clamp(v, -360, 360) : clamp(v / 100, -2, 2);
    o.tf = T; if(!aTf(o)) delete o.tf;
  } else if(k === 'op'){ o.op = clamp(v / 100, 0, 1); if(o.op >= 0.999) delete o.op; }
  else if(k === 'fi' || k === 'fo'){ const d = Math.max(0.1, c.t1 - c.t0); o[k] = r2(clamp(v, 0, d)); if(o[k] < 0.01) delete o[k]; }
  else if(k === 'vol'){ o.vol = clamp(v / 100, 0, 2); }
  majValeurs(); redessiner();
  clearTimeout(MRG.majT); MRG.majT = setTimeout(() => { if(!MRG.geste) try { mtMaj(); } catch(e){} }, 900);
};
window.mrgReset = function(quoi){
  const c = avant(); if(!c || !c.o) return; const o = c.o;
  if(!quoi || quoi === 'tf'){ delete o.tf; }
  if(!quoi){ delete o.op; delete o.fi; delete o.fo; if(c.genre === 'son') o.vol = 1; }
  MRG.glisse = 0; mtMaj(); agToast(quoi === 'tf' ? 'Position, échelle et rotation remises' : 'Réglages du clip remis à zéro');
};
// Rotation rapide (90°)
window.mrgTourner = function(){ const c = avant(); if(!c || !c.o) return; const T = tfDe(c.o); T.r = ((Math.round(T.r / 90) * 90 + 90 + 180) % 360) - 180; c.o.tf = T; if(!aTf(c.o)) delete c.o.tf; MRG.glisse = 0; majValeurs(); redessiner(); };
window.mrgPlein = function(){ const c = avant(); if(!c || !c.o) return; const T = tfDe(c.o); T.x = 0; T.y = 0; T.s = 1; c.o.tf = T; if(!aTf(c.o)) delete c.o.tf; MRG.glisse = 0; majValeurs(); redessiner(); };
window.mrgDemi = function(){ const c = avant(); if(!c || !c.o) return; const T = tfDe(c.o); T.s = 0.45; T.x = 0.22; T.y = 0.22; c.o.tf = T; MRG.glisse = 0; majValeurs(); redessiner(); };

// ---------- Vitesse (la durée s'adapte) ----------
function maxDuree(c, vit){
  const V = anVid();
  if(c.genre === 'plan'){ const sg = (AN.plan || planNow()).segs[c.n], p = sg ? CR.photos[sg.i] : null; if(!p || !p.video || !p.vdur) return 600; const vin = sg.vin != null ? sg.vin : (typeof rvVinAuto === 'function' ? rvVinAuto(sg) : 0); return Math.max(0.2, (p.vdur - vin) / vit); }
  if(c.genre === 'incrust'){ const p = photoDe(c.o.k); if(!p || !p.video || !p.vdur) return 600; return Math.max(0.2, (p.vdur - (c.o.vin || 0)) / vit); }
  return 600;
}
window.mrgVitesse = function(v, glisse){
  const c = glisse ? avant() : (mtAvantPublic(), MRG.glisse = 0, cible()); if(!c) return;
  if(c.genre === 'plan' && !c.o){ c.o = anVid().clips[c.n]; }
  const o = c.o; if(!o) return;
  const vit = clamp(Number(v), 0.1, 4), ancien = o.vit == null || o.vit === 0 ? 1 : o.vit;
  const d0 = c.t1 - c.t0, d = clamp(r2(d0 * ancien / vit), 0.2, maxDuree(c, vit));
  o.vit = r2(vit); o.d = r2(d);
  const t = document.getElementById('mrgVitT'); if(t) t.textContent = String(o.vit).replace('.', ',') + 'x · ' + o.d.toFixed(1).replace('.', ',') + ' s';
  if(glisse){ planNow(); redessiner(); clearTimeout(MRG.vitT); MRG.vitT = setTimeout(() => mtMaj(), 500); }
  else { mtMaj(); agToast('Vitesse ' + String(o.vit).replace('.', ',') + 'x · durée ' + o.d.toFixed(1).replace('.', ',') + ' s'); }
};

// ============================================================
// 5. LE PANNEAU « RÉGLAGES DU CLIP »
// ============================================================
function curseur(id, icone, nom, min, max, pas, val, txt, fn){
  return `<div class="mrg-l"><span class="mrg-n">${ic(icone, 14)}${nom}</span><input type="range" id="${id}" min="${min}" max="${max}" step="${pas}" value="${val}" oninput="${fn}"><b id="${id}T">${txt}</b></div>`;
}
function panneauHtml(){
  const c = cible(); if(!c) return '';
  const o = c.o || {}, T = tfDe(o), d = Math.max(0.1, c.t1 - c.t0), fmax = Math.max(0.5, Math.min(5, Math.floor(d * 10) / 10));
  const op = o.op == null ? 1 : o.op, fi = o.fi || 0, fo = o.fo || 0;
  let h = '';
  if(c.genre !== 'son'){
    const p = c.genre === 'plan' ? CR.photos[((AN.plan || planNow()).segs[c.n] || {}).i] : photoDe(o.k);
    h += `<div class="mrg-st">Image</div>
      <div class="mrg-btns"><button type="button" class="${MRG.ajuster ? 'on' : ''}" id="mrgAjB" onclick="mrgAjuster()">${ic('move', 14)} ${MRG.ajuster ? 'Ajuster : actif' : 'Ajuster dans l\'aperçu'}</button><button type="button" onclick="mrgTourner()">${ic('rotate', 14)} 90°</button>${c.genre === 'incrust' ? `<button type="button" onclick="mrgDemi()">Petit en coin</button>` : ''}<button type="button" onclick="mrgPlein()">Plein cadre</button></div>
      ${curseur('mrgX', 'move', 'Position ←→', -100, 100, 1, Math.round(T.x * 100), Math.round(T.x * 100) + ' %', "mrgSet('x',this.value)")}
      ${curseur('mrgY', 'move', 'Position ↑↓', -100, 100, 1, Math.round(T.y * 100), Math.round(T.y * 100) + ' %', "mrgSet('y',this.value)")}
      ${curseur('mrgS', 'zoomIn', 'Échelle', 10, 400, 1, Math.round(T.s * 100), Math.round(T.s * 100) + ' %', "mrgSet('s',this.value)")}
      ${curseur('mrgR', 'rotate', 'Rotation', -180, 180, 1, Math.round(T.r), Math.round(T.r) + '°', "mrgSet('r',this.value)")}
      ${curseur('mrgO', 'opacity', 'Opacité', 0, 100, 1, Math.round(op * 100), Math.round(op * 100) + ' %', "mrgSet('op',this.value)")}`;
    if(p && p.video){
      const vit = o.vit == null || o.vit === 0 ? 1 : o.vit;
      h += `<div class="mrg-st">Vitesse <small>la durée du clip s'adapte</small></div>
        <div class="ag-pills mt-pills mrg-vp">${[[0.25, '0,25x'], [0.5, '0,5x'], [0.75, '0,75x'], [1, 'Normale'], [1.5, '1,5x'], [2, '2x'], [3, '3x']].map(([k, l]) => `<button type="button" class="${Math.abs(vit - k) < 0.001 ? 'on' : ''}" onclick="mrgVitesse(${k})">${l}</button>`).join('')}</div>
        <div class="mrg-l"><span class="mrg-n">${ic('speed', 14)}Précise</span><input type="range" min="0.1" max="4" step="0.05" value="${vit}" oninput="mrgVitesse(this.value,true)"><b id="mrgVitT">${String(r2(vit)).replace('.', ',')}x · ${d.toFixed(1).replace('.', ',')} s</b></div>`;
      if(c.genre === 'plan') h += `<div class="mrg-btns"><button type="button" onclick="mrgGarderSon()">${ic('volume', 14)} Garder le son de la vidéo</button></div>`;
    }
  } else {
    const vol = o.vol == null ? 1 : o.vol;
    h += `<div class="mrg-st">Son</div>
      ${ondeHtml(o)}
      ${curseur('mrgV', 'volume', 'Volume', 0, 200, 1, Math.round(vol * 100), Math.round(vol * 100) + ' %', "mrgSet('vol',this.value)")}`;
  }
  h += `<div class="mrg-st">Fondus</div>
    ${curseur('mrgFi', 'fadeIn', 'Entrant', 0, fmax, 0.1, fi, fi.toFixed(1).replace('.', ',') + ' s', "mrgSet('fi',this.value)")}
    ${curseur('mrgFo', 'fadeOut', 'Sortant', 0, fmax, 0.1, fo, fo.toFixed(1).replace('.', ',') + ' s', "mrgSet('fo',this.value)")}
    <div class="mrg-btns"><button type="button" onclick="mrgFonduRapide()">Fondus 0,5 s</button><button type="button" onclick="mrgReset()">${ic('reset', 14)} Tout remettre</button></div>
    ${c.genre !== 'son' ? '<div class="ag-hint" style="margin:6px 0 0">Plan : le fondu passe par le noir. Incrustation : elle apparaît et disparaît en douceur.</div>' : ''}`;
  const titre = c.genre === 'plan' ? 'Plan ' + (c.n + 1) : c.genre === 'incrust' ? 'Incrustation' : (o.nom || 'Son');
  return `<div class="mrg" id="mrgPan"><div class="mrg-t">${ic('settings', 15)}<b>Réglages du clip</b><span>${E(titre)}</span></div>${h}</div>`;
}
window.mrgFonduRapide = function(){ const c = avant(); if(!c || !c.o) return; const d = Math.max(0.1, c.t1 - c.t0), f = r2(Math.min(0.5, d / 2)); c.o.fi = f; c.o.fo = f; MRG.glisse = 0; mtMaj(); };
function ondeHtml(s){
  const b = sonBuf(s); if(!b) return '';
  const url = ondeUrl(b), D = sonDur(s), w = 100 * b.duration / Math.max(0.1, D), x = 100 * (s.off || 0) / Math.max(0.1, D);
  return `<div class="mrg-onde" style="background-image:url('${url}');background-size:${w.toFixed(2)}% 100%;background-position:${b.duration > D ? (-x * 100 / Math.max(0.01, w - 100)).toFixed(2) : 0}% 0"></div>`;
}
// Le panneau va dans l'outil Montage (sous les réglages du plan, de l'incrustation ou du son)
function monterPanneau(){
  const hote = document.getElementById('mtPanHote'); if(!hote) return;
  const vieux = hote.querySelector('#mrgPan');
  const c = cible();
  if(!c){ if(vieux) vieux.remove(); if(MRG.ajuster) mrgAjuster(false); return; }
  const h = panneauHtml(); if(!h) return;
  if(vieux) vieux.outerHTML = h;
  else {
    const pan = hote.querySelector('.mt-pan') || hote.firstElementChild || hote;
    const t = pan.querySelector('.mt-pan-t');
    if(t) t.insertAdjacentHTML('afterend', h); else pan.insertAdjacentHTML('afterbegin', h);
  }
  // La vitesse de rushs.js garde la durée : on le dit
  hote.querySelectorAll('.mt-pan > label').forEach(l => { if(l.textContent.trim() === 'Vitesse') l.textContent = 'Vitesse (durée du plan fixe)'; });
  majAjuster();
}

// ============================================================
// 6. AJUSTER DANS L'APERÇU (souris, molette, doigts)
// ============================================================
window.mrgAjuster = function(on){
  MRG.ajuster = on == null ? !MRG.ajuster : !!on;
  if(MRG.ajuster && !cible()) choisirSousTete();
  if(MRG.ajuster && !cible()){ MRG.ajuster = false; agToast('Choisis d\'abord un plan ou une incrustation', 'info'); }
  majAjuster();
  const b = document.getElementById('mrgAjB'); if(b){ b.classList.toggle('on', MRG.ajuster); b.innerHTML = `${ic('move', 14)} ${MRG.ajuster ? 'Ajuster : actif' : 'Ajuster dans l\'aperçu'}`; }
  const tb = document.getElementById('mrgB'); if(tb) tb.classList.toggle('on', MRG.ajuster);
  if(MRG.ajuster) agToast(mobile() ? 'Glisse sur l\'aperçu pour déplacer, pince pour agrandir et tourner' : 'Glisse sur l\'aperçu pour déplacer · molette : échelle · Maj + molette : rotation', 'info');
};
// Le bouton de la barre : prend le clip sous la tête de lecture et ouvre ses réglages
function choisirSousTete(){
  const t = AN.t, V = anVid();
  const inc = incrustA(t); if(inc.length){ MT.sel = null; MPB.sel = new Set([inc[inc.length - 1]]); mtMaj(); return; }
  const S = (AN.plan || planNow()).segs, k = S.findIndex(sg => t >= sg.t0 && t < sg.t1);
  if(k >= 0 && !S[k].vide){ const avantT = AN.t; MPB.sel = new Set(); mtChoisir('c', k); AN.t = avantT; redessiner(); }
}
window.mrgOutil = function(){
  if(!cible()) choisirSousTete();
  if(!cible()){ agToast('Place la tête de lecture sur un plan', 'info'); return; }
  if(CR.edOutil !== 'montage' || (mobile() && !MPX.tiroir)) edOutil('montage');
  monterPanneau();
  const p = document.getElementById('mrgPan'); if(p) p.scrollIntoView({ block: 'start', behavior: 'smooth' });
  if(!mobile()) mrgAjuster(true);
};
function majAjuster(){
  const prev = document.querySelector('#edScene .cr-prev'); if(!prev) return;
  let z = prev.querySelector('.mrg-z');
  const actif = MRG.ajuster && !!cible() && pro();
  if(!actif){ if(z) z.remove(); return; }
  if(!z){
    z = document.createElement('div'); z.className = 'mrg-z'; z.innerHTML = '<i class="mrg-gx"></i><i class="mrg-gy"></i>';
    prev.style.position = prev.style.position || 'relative';
    if(getComputedStyle(prev).position === 'static') prev.style.position = 'relative';
    prev.appendChild(z);
    z.addEventListener('pointerdown', geste, { passive: false });
    z.addEventListener('wheel', molette, { passive: false });
  }
}
function geste(e){
  const c = cible(); if(!c || !c.o && c.genre !== 'plan') return;
  e.preventDefault();
  const z = e.currentTarget; try { z.setPointerCapture(e.pointerId); } catch(er){}
  const G = MRG.geste || (MRG.geste = { pts: new Map() });
  G.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  G.rect = z.getBoundingClientRect();
  const c2 = avant(); G.tf0 = tfDe(c2 && c2.o); G.depart = [...G.pts.values()].map(p => Object.assign({}, p));
  if(!z.mrgEcoute){
    z.mrgEcoute = true;
    z.addEventListener('pointermove', bougeGeste, { passive: false });
    const fin = ev => { const G2 = MRG.geste; if(!G2) return; G2.pts.delete(ev.pointerId); if(!G2.pts.size){ MRG.geste = null; z.classList.remove('gx', 'gy'); mtMaj(); } else { const c3 = cible(); G2.tf0 = tfDe(c3 && c3.o); G2.depart = [...G2.pts.values()].map(p => Object.assign({}, p)); } };
    z.addEventListener('pointerup', fin); z.addEventListener('pointercancel', fin);
  }
}
function bougeGeste(e){
  const G = MRG.geste; if(!G || !G.pts.has(e.pointerId)) return;
  e.preventDefault();
  G.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const c = avant(); if(!c || !c.o) return;
  const P = [...G.pts.values()], A = G.depart, R = G.rect, T = Object.assign({}, G.tf0);
  if(P.length >= 2 && A.length >= 2){
    const d0 = Math.hypot(A[1].x - A[0].x, A[1].y - A[0].y) || 1, d1 = Math.hypot(P[1].x - P[0].x, P[1].y - P[0].y);
    const a0 = Math.atan2(A[1].y - A[0].y, A[1].x - A[0].x), a1 = Math.atan2(P[1].y - P[0].y, P[1].x - P[0].x);
    const m0 = { x: (A[0].x + A[1].x) / 2, y: (A[0].y + A[1].y) / 2 }, m1 = { x: (P[0].x + P[1].x) / 2, y: (P[0].y + P[1].y) / 2 };
    T.s = clamp(G.tf0.s * d1 / d0, 0.05, 5);
    let r = G.tf0.r + (a1 - a0) * 180 / Math.PI; const r90 = Math.round(r / 90) * 90; if(Math.abs(r - r90) < 4) r = r90; T.r = r;
    T.x = G.tf0.x + (m1.x - m0.x) / R.width; T.y = G.tf0.y + (m1.y - m0.y) / R.height;
  } else {
    T.x = G.tf0.x + (P[0].x - A[0].x) / R.width; T.y = G.tf0.y + (P[0].y - A[0].y) / R.height;
  }
  // Aimant au centre
  const z = e.currentTarget;
  const sx = Math.abs(T.x) < 0.02, sy = Math.abs(T.y) < 0.02; if(sx) T.x = 0; if(sy) T.y = 0;
  if(z && z.classList){ z.classList.toggle('gx', sx); z.classList.toggle('gy', sy); }
  c.o.tf = T; majValeurs(); redessiner();
}
function molette(e){
  const c = cible(); if(!c) return;
  e.preventDefault();
  const c2 = avant(); if(!c2 || !c2.o) return;
  const T = tfDe(c2.o);
  if(e.shiftKey) T.r = clamp(T.r + (e.deltaY > 0 ? 2 : -2), -360, 360);
  else T.s = clamp(T.s * Math.exp(-e.deltaY * 0.0015), 0.05, 5);
  c2.o.tf = T; majValeurs(); redessiner();
}

// ============================================================
// 7. LES FORMES D'ONDE DANS LA TABLE DE MONTAGE
// ============================================================
function ondeUrl(b){
  let u = MRG.ondes.get(b); if(u) return u;
  const W = Math.max(200, Math.min(4000, Math.round(b.duration * 60))), H = 48;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), ch = b.getChannelData(0), ch2 = b.numberOfChannels > 1 ? b.getChannelData(1) : null, n = Math.max(1, Math.floor(ch.length / W)), pas = Math.max(1, Math.floor(n / 64));
  g.fillStyle = 'rgba(255,255,255,.55)';
  for(let x = 0; x < W; x++){
    let m = 0; for(let j = x * n; j < (x + 1) * n; j += pas){ const v = Math.abs(ch[j] || 0); if(v > m) m = v; if(ch2){ const v2 = Math.abs(ch2[j] || 0); if(v2 > m) m = v2; } }
    const h = Math.max(1, Math.min(1, m * 1.15) * H * 0.92); g.fillRect(x, (H - h) / 2, 1, h);
  }
  u = c.toDataURL('image/png'); MRG.ondes.set(b, u);
  return u;
}
function ondes(){
  const pi = document.getElementById('mtPiste'); if(!pi || !pi.classList.contains('mpb')) return;
  const V = anVid(), pps = MPB.pps || 40;
  pi.querySelectorAll('.mpb-clip.son[data-id]').forEach(el => {
    const s = (V.sons || []).find(x => String(x.id) === el.dataset.id), b = s && sonBuf(s); if(!b) return;
    const url = ondeUrl(b), bg = `url("${url}")`;
    if(el.dataset.mrgO !== url.length + ':' + pps + ':' + (s.off || 0)){
      el.dataset.mrgO = url.length + ':' + pps + ':' + (s.off || 0);
      el.style.backgroundImage = bg; el.style.backgroundRepeat = 'no-repeat';
      el.style.backgroundSize = `${(b.duration * pps).toFixed(1)}px 100%`;
      el.style.backgroundPosition = `${(-(s.off || 0) * pps).toFixed(1)}px 0`;
      el.classList.add('mrg-o');
    }
    el.classList.toggle('mrg-fi', (s.fi || 0) > 0.001); el.classList.toggle('mrg-fo', (s.fo || 0) > 0.001);
    el.style.setProperty('--mrg-fi', ((s.fi || 0) * pps).toFixed(1) + 'px'); el.style.setProperty('--mrg-fo', ((s.fo || 0) * pps).toFixed(1) + 'px');
  });
  const mus = pi.querySelector('.mpb-clip.mus');
  if(mus && AN.buffer){
    const url = ondeUrl(AN.buffer), cle = url.length + ':' + pps + ':' + (V.debut || 0);
    if(mus.dataset.mrgO !== cle){ mus.dataset.mrgO = cle; mus.style.backgroundImage = `url("${url}")`; mus.style.backgroundRepeat = 'no-repeat'; mus.style.backgroundSize = `${(AN.buffer.duration * pps).toFixed(1)}px 100%`; mus.style.backgroundPosition = `${(-(V.debut || 0) * pps).toFixed(1)}px 0`; mus.classList.add('mrg-o'); }
  }
  // Plans et incrustations : petit signe quand un réglage est posé, rampes de fondu
  const S = (AN.plan || planNow()).segs;
  pi.querySelectorAll('.mt-clip[data-n]').forEach(el => {
    const c = V.clips ? V.clips[Number(el.dataset.n)] : null, sg = S[Number(el.dataset.n)];
    const on = !!(c && sg && !sg.vide && c.k === sg.k && aRegl(c));
    el.classList.toggle('mrg-r', on);
    el.classList.toggle('mrg-fi', !!(on && (c.fi || 0) > 0.001)); el.classList.toggle('mrg-fo', !!(on && (c.fo || 0) > 0.001));
    if(on){ el.style.setProperty('--mrg-fi', ((c.fi || 0) * pps).toFixed(1) + 'px'); el.style.setProperty('--mrg-fo', ((c.fo || 0) * pps).toFixed(1) + 'px'); }
  });
  pi.querySelectorAll('.mpb-clip.vid[data-id]').forEach(el => {
    let c = null; (V.pistes || []).forEach(p => (p.clips || []).forEach(x => { if(String(x.id) === el.dataset.id) c = x; }));
    const on = !!(c && aRegl(c));
    el.classList.toggle('mrg-r', on);
    el.classList.toggle('mrg-fi', !!(on && (c.fi || 0) > 0.001)); el.classList.toggle('mrg-fo', !!(on && (c.fo || 0) > 0.001));
    if(on){ el.style.setProperty('--mrg-fi', ((c.fi || 0) * pps).toFixed(1) + 'px'); el.style.setProperty('--mrg-fo', ((c.fo || 0) * pps).toFixed(1) + 'px'); }
  });
}
function surveiller(){
  // La table de montage change de hauteur (pistes en plus ou en moins) : l'aperçu se recalcule tout de suite,
  // pour que la barre d'outils (Couper) reste toujours visible
  const ep = document.getElementById('edPiste');
  if(ep && !ep.mrgRo && typeof ResizeObserver === 'function'){
    let h0 = ep.offsetHeight;
    ep.mrgRo = new ResizeObserver(() => { const h = ep.offsetHeight; if(Math.abs(h - h0) < 2) return; h0 = h; clearTimeout(MRG.roT); MRG.roT = setTimeout(() => window.dispatchEvent(new Event('resize')), 40); });
    ep.mrgRo.observe(ep);
  }
  const pi = document.getElementById('mtPiste'); if(!pi || pi.mrgObs) return;
  pi.mrgObs = new MutationObserver(() => { if(MRG.obsRaf) return; MRG.obsRaf = requestAnimationFrame(() => { MRG.obsRaf = 0; try { ondes(); } catch(e){} }); });
  pi.mrgObs.observe(pi, { childList: true, subtree: true });
}

// ============================================================
// 8. MISE EN PLACE
// ============================================================
function boutonBarre(){
  const def = document.querySelector('#mpxBarre .mpx-defile'); if(!def || def.querySelector('#mrgB')) return;
  const h = `<button type="button" id="mrgB" class="mpx-b ${MRG.ajuster ? 'on' : ''}" onclick="mrgOutil()" title="Ajuster le clip : position, échelle, rotation, opacité, fondus, vitesse (A)">${ic('move', 19)}<span>Ajuster</span></button>`;
  const ref = def.querySelector('#mpxDup'); if(ref) ref.insertAdjacentHTML('afterend', h); else def.insertAdjacentHTML('beforeend', h);
}
function apres(){
  if(!pro()) { if(MRG.ajuster){ MRG.ajuster = false; majAjuster(); } return; }
  boutonBarre(); monterPanneau(); surveiller(); ondes();
}
const edApresBase = window.edApresMt;
window.edApresMt = function(){
  const r = edApresBase.apply(this, arguments);
  try { apres(); } catch(e){ console.warn('montage-reglages', e); }
  return r;
};
const renderBase = crRender;
crRender = async function(){
  const r = await renderBase.apply(this, arguments);
  try { apres(); setTimeout(() => { try { if(pro()){ boutonBarre(); ondes(); majAjuster(); } } catch(e){} }, 600); } catch(e){ console.warn('montage-reglages', e); }
  return r;
};
// Raccourci : A = Ajuster (modifiable comme les autres)
function lsGet(k, d){ try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch(e){ return d; } }
function lsSet(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
const MRG_ACTIONS = [
  ['ajuster', 'Ajuster le clip (position, échelle, rotation...)', ['A'], () => { if(MRG.ajuster) mrgAjuster(false); else mrgOutil(); }],
  ['fondus', 'Fondus de 0,5 s sur le clip choisi', ['Shift+D'], () => { if(cible()) mrgFonduRapide(); }]
];
function touches(){ const perso = lsGet('mrg.raccourcis', {}) || {}, o = {}; MRG_ACTIONS.forEach(([id, , def]) => { o[id] = Array.isArray(perso[id]) ? perso[id] : def.slice(); }); return o; }
function combo(e){
  let k = e.key; if(!k || ['Control', 'Shift', 'Alt', 'Meta', 'AltGraph', 'Dead'].includes(k)) return '';
  if(k === ' ' || k === 'Spacebar') k = 'Space';
  if(k.length === 1) k = k.toUpperCase();
  const lettre = /^[A-Z0-9]$/.test(k) || k.length > 1, p = [];
  if(e.ctrlKey || e.metaKey) p.push('Ctrl'); if(e.altKey) p.push('Alt'); if(e.shiftKey && lettre) p.push('Shift');
  p.push(k); return p.join('+');
}
const NOMS = { Space: 'Espace', Shift: 'Maj', Ctrl: 'Ctrl', Alt: 'Alt', Escape: 'Échap' };
function joli(c){ return String(c).split('+').map(x => NOMS[x] || x).join(' + '); }
window.addEventListener('keydown', e => {
  if(MPX.capture || !pro()) return;
  if(typeof RT !== 'undefined' && RT.tap) return;
  const t = e.target, tag = (t && t.tagName) || '';
  if(/INPUT|TEXTAREA|SELECT/.test(tag) && !(tag === 'INPUT' && /range|checkbox|radio|button/.test(t.type || ''))) return;
  if((t && t.isContentEditable) || document.querySelector('.ag-dlg-bg, .ag-sheet')) return;
  if(e.key === 'Escape' && MRG.ajuster){ e.stopImmediatePropagation(); mrgAjuster(false); return; }
  const c = combo(e), T0 = touches(), a = c && MRG_ACTIONS.find(([id]) => (T0[id] || []).includes(c));
  if(a){ e.preventDefault(); e.stopImmediatePropagation(); if(t && t.blur && tag === 'INPUT') t.blur(); a[3](); }
}, true);
if(typeof window.mpxRaccourcis === 'function'){
  const rcBase = window.mpxRaccourcis;
  window.mpxRaccourcis = function(){
    const r = rcBase.apply(this, arguments);
    try {
      const sh = document.getElementById('mpxKeysS'), kb = sh && sh.querySelector('.mpx-kb'); if(!kb) return r;
      const T0 = touches(), perso = lsGet('mrg.raccourcis', {}) || {};
      kb.insertAdjacentHTML('beforebegin', `<div class="mpx-pt">Réglages du clip</div><div class="mpx-kl mrg-kl">${MRG_ACTIONS.map(([id, nom]) => `<div class="mpx-k ${perso[id] ? 'perso' : ''}" data-mrg="${id}"><span>${nom}</span><div class="mpx-kk">${(T0[id] || []).length ? T0[id].map(x => `<kbd>${E(joli(x))}</kbd>`).join('<small>ou</small>') : '<small>aucune</small>'}</div><button type="button" class="st-link" onclick="mrgChanger('${id}')">Changer</button></div>`).join('')}
        <div class="mpx-k"><span>Agrandir / réduire (Ajuster actif)</span><div class="mpx-kk"><kbd>Molette</kbd></div><i></i></div>
        <div class="mpx-k"><span>Tourner (Ajuster actif)</span><div class="mpx-kk"><kbd>Maj + molette</kbd></div><i></i></div></div>`);
    } catch(e){ console.warn('montage-reglages', e); }
    return r;
  };
}
window.mrgChanger = function(id){
  const row = document.querySelector(`#mpxKeysS .mpx-k[data-mrg="${id}"]`);
  if(row){ row.classList.add('ecoute'); row.querySelector('.mpx-kk').innerHTML = '<small>Appuie sur la touche...</small>'; }
  MPX.capture = c => {
    MPX.capture = null;
    if(!c){ mpxRaccourcis(); return; }
    const perso = lsGet('mrg.raccourcis', {}) || {}, T0 = touches();
    let pris = '';
    MRG_ACTIONS.forEach(([a, nom]) => { if(a !== id && (T0[a] || []).includes(c)){ perso[a] = T0[a].filter(x => x !== c); pris = nom; } });
    const lotA = ['Space', 'C', 'S', 'Delete', 'Backspace', 'Shift+Delete', 'Shift+Backspace', 'Ctrl+Z', 'Ctrl+Y', 'Ctrl+Shift+Z', 'ArrowLeft', 'ArrowRight', 'Shift+ArrowLeft', 'Shift+ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'B', 'Ctrl+D', 'M', '?'];
    const lotB = ['N', 'Ctrl+A', '+', '=', '-', 'F', 'I'], lotC = ['Shift+M', 'Ctrl+I', 'Shift+F', 'Shift+Q'];
    const prise = (p2, def) => Object.values(p2).some(l => Array.isArray(l) && l.includes(c)) || (def.includes(c) && !Object.keys(p2).length);
    if(prise(lsGet('mpx.raccourcis', {}) || {}, lotA) || prise(lsGet('mpb.raccourcis', {}) || {}, lotB) || prise(lsGet('mmd.raccourcis', {}) || {}, lotC)){ agToast(`${joli(c)} sert déjà à une autre action : choisis une autre touche`, 'info'); mpxRaccourcis(); return; }
    perso[id] = [c]; lsSet('mrg.raccourcis', perso);
    agToast(pris ? `${joli(c)} : retirée de « ${pris} »` : `Nouvelle touche : ${joli(c)}`, pris ? 'info' : 'success');
    mpxRaccourcis();
  };
};
if(typeof window.mpxRaccourcisDefaut === 'function'){
  const defBase = window.mpxRaccourcisDefaut;
  window.mpxRaccourcisDefaut = async function(){ const avantP = JSON.stringify(lsGet('mpx.raccourcis', {})); const r = await defBase.apply(this, arguments); if(JSON.stringify(lsGet('mpx.raccourcis', {})) !== avantP || avantP === '{}'){ lsSet('mrg.raccourcis', {}); if(document.getElementById('mpxKeysS')) mpxRaccourcis(); } return r; };
}
// « Plus » : les réglages du clip aussi
if(typeof window.mpxPlus === 'function'){
  const plusBase = window.mpxPlus;
  window.mpxPlus = function(){
    const r = plusBase.apply(this, arguments);
    try {
      const pl = document.querySelector('#mpxPlusS .mpx-pl'); if(!pl) return r;
      const it = (icone, txt, sous, fn) => `<button type="button" class="mpx-pi" onclick="agCloseSheet('mpxPlusS');${fn}">${ic(icone, 18)}<div><b>${txt}</b>${sous ? `<small>${sous}</small>` : ''}</div></button>`;
      pl.insertAdjacentHTML('afterbegin', '<div class="mpx-pt">Clip choisi</div>'
        + it('move', 'Ajuster le clip', 'Position, échelle, rotation, opacité, fondus, vitesse', 'mrgOutil()')
        + it('fadeIn', 'Fondus de 0,5 s', 'Entrée et sortie en douceur', 'if(!document.getElementById(\'mrgPan\'))mrgOutil();mrgFonduRapide()'));
    } catch(e){ console.warn('montage-reglages', e); }
    return r;
  };
}

// ============================================================
// 9. STYLE
// ============================================================
(function css(){
  if(document.getElementById('mrgCss')) return;
  const st = document.createElement('style'); st.id = 'mrgCss';
  st.textContent = `
.mrg{margin:4px 0 12px;padding:10px;border-radius:14px;background:var(--card2);border:1px solid var(--border)}
.mrg-t{display:flex;align-items:center;gap:7px;color:var(--text);margin-bottom:4px}.mrg-t b{font-size:13px}.mrg-t span{flex:1;text-align:right;color:var(--muted);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mrg-st{margin:10px 0 4px;font-size:11px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:var(--muted)}.mrg-st small{text-transform:none;letter-spacing:0;font-weight:500;margin-left:4px}
.mrg-l{display:grid;grid-template-columns:104px minmax(0,1fr) 62px;align-items:center;gap:8px;margin:2px 0}
.mrg-n{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--text);white-space:nowrap}.mrg-n svg{color:var(--muted);flex:none}
.mrg-l input[type=range]{width:100%;margin:0;accent-color:var(--accent,#48A89A)}
.mrg-l b{font-size:12px;color:var(--text);text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.mrg-btns{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 4px}
.mrg-btns button{width:auto !important;margin:0;display:inline-flex;align-items:center;gap:5px;padding:6px 10px;border-radius:9px;border:1px solid var(--border);background:var(--card);color:var(--text);font-size:12px;font-weight:600;cursor:pointer}
.mrg-btns button.on{background:var(--accent,#48A89A);border-color:transparent;color:#fff}
.mrg-vp{margin:2px 0 4px}
.mrg-onde{height:46px;border-radius:9px;background-color:#0b0f10;background-repeat:no-repeat;margin:2px 0 6px;border:1px solid var(--border)}
.mrg-z{position:absolute;inset:0;z-index:5;cursor:move;touch-action:none;outline:2px dashed var(--accent,#48A89A);outline-offset:-2px;border-radius:inherit}
.mrg-z i{position:absolute;display:none;background:#f5a524;pointer-events:none}
.mrg-z .mrg-gx{left:50%;top:0;bottom:0;width:1px}.mrg-z .mrg-gy{top:50%;left:0;right:0;height:1px}
.mrg-z.gx .mrg-gx,.mrg-z.gy .mrg-gy{display:block}
.mpb-clip.mrg-o{background-color:rgba(72,168,154,.35)}
.mt-clip.mrg-r::before{content:"";position:absolute;right:4px;bottom:4px;width:7px;height:7px;border-radius:50%;background:#f5a524;box-shadow:0 0 0 2px rgba(0,0,0,.4);z-index:2;pointer-events:none}
.mt-clip.mrg-fi,.mpb-clip.mrg-fi{background-image:linear-gradient(to right,rgba(0,0,0,.55),transparent var(--mrg-fi,0px))}
.mt-clip.mrg-fi>img{-webkit-mask-image:linear-gradient(to right,rgba(0,0,0,.35),#000 var(--mrg-fi,0px));mask-image:linear-gradient(to right,rgba(0,0,0,.35),#000 var(--mrg-fi,0px))}
.mt-clip.mrg-fo>img{-webkit-mask-image:linear-gradient(to left,rgba(0,0,0,.35),#000 var(--mrg-fo,0px));mask-image:linear-gradient(to left,rgba(0,0,0,.35),#000 var(--mrg-fo,0px))}
.mt-clip.mrg-fi.mrg-fo>img{-webkit-mask-image:linear-gradient(to right,rgba(0,0,0,.35),#000 var(--mrg-fi,0px),#000 calc(100% - var(--mrg-fo,0px)),rgba(0,0,0,.35));mask-image:linear-gradient(to right,rgba(0,0,0,.35),#000 var(--mrg-fi,0px),#000 calc(100% - var(--mrg-fo,0px)),rgba(0,0,0,.35))}
.mpb-clip.mrg-fi::before,.mpb-clip.mrg-fo::after{content:"";position:absolute;top:0;bottom:0;pointer-events:none}
.mpb-clip.mrg-fi::before{left:0;width:var(--mrg-fi,0px);background:linear-gradient(to top right,rgba(0,0,0,.5) 50%,transparent 50%)}
.mpb-clip.mrg-fo::after{right:0;width:var(--mrg-fo,0px);background:linear-gradient(to top left,rgba(0,0,0,.5) 50%,transparent 50%)}
@media(max-width:899px){.mrg-l{grid-template-columns:92px minmax(0,1fr) 56px;gap:6px}.mrg-l input[type=range]{height:28px}}`;
  document.head.appendChild(st);
})();
})();
