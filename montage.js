// ============================================================
// MONTAGE.JS - Table de montage des vidéos (Créations)
// ------------------------------------------------------------
// Chaque photo devient un "plan" sur une piste, comme dans un
// logiciel de montage :
// - durée de chaque plan, ordre (glisser ou flèches), couper, dupliquer,
//   remplacer la photo, supprimer, annuler / rétablir ;
// - un mouvement de caméra par plan (zoom, panoramique, punch,
//   caméra à la main, carte flottante...) ;
// - une transition entre deux plans (32 au choix : fondu, glissement,
//   coup de fouet, iris, stores, glitch, fuite de lumière...).
// Modèles concernés : Diaporama doux, Rythmé, Glisse, Titre animé.
// Tant que tu ne touches à rien, le montage reste automatique.
// Utilise creations.js et animations.js.
// ============================================================
(function(){
'use strict';
if(typeof AN === 'undefined' || typeof anPlan !== 'function') return;

const MT_SEQ = ['v-diapo', 'v-dyn', 'v-glisse', 'v-titre'];
window.mtEstSeq = k => MT_SEQ.includes(k);

// ---------- Mouvements de caméra ----------
const MT_MVTS = [
  ['kb', 'Doux (Ken Burns)'], ['zoomin', 'Zoom avant'], ['zoomout', 'Zoom arrière'], ['dolly', 'Plongée'],
  ['gauche', 'Vers la gauche'], ['droite', 'Vers la droite'], ['haut', 'Vers le haut'], ['bas', 'Vers le bas'],
  ['punch', 'Punch'], ['battement', 'Battement (rythme)'], ['tremble', 'Caméra à la main'], ['rotation', 'Rotation douce'],
  ['flottant', 'Carte flottante'], ['flou', 'Net depuis le flou'], ['aucun', 'Fixe']
];
const MT_MVT_COURT = { kb: 'Doux', zoomin: 'Zoom +', zoomout: 'Zoom -', dolly: 'Plongée', gauche: '←', droite: '→', haut: '↑', bas: '↓', punch: 'Punch', battement: 'Beat', tremble: 'Main', rotation: 'Rot.', flottant: 'Carte', flou: 'Flou', aucun: 'Fixe' };
// ---------- Transitions ----------
const MT_TRS = [
  ['coupe', 'Coupe nette'], ['fondu', 'Fondu'], ['noir', 'Fondu au noir'], ['blanc', 'Fondu au blanc'], ['flash', 'Flash'],
  ['flouT', 'Flou'], ['zoomIn', 'Zoom avant'], ['zoomOut', 'Zoom arrière'], ['fouet', 'Coup de fouet'],
  ['pousseG', 'Pousse à gauche'], ['pousseD', 'Pousse à droite'], ['pousseH', 'Pousse en haut'],
  ['glisseG', 'Glisse de droite'], ['glisseD', 'Glisse de gauche'], ['glisseH', 'Glisse du bas'], ['glisseB', 'Glisse du haut'],
  ['rideauV', 'Rideau'], ['rideauH', 'Rideau vertical'], ['rideauDiag', 'Rideau en biais'],
  ['cercle', 'Cercle'], ['iris', 'Iris (noir)'], ['losange', 'Losange'], ['stores', 'Stores'], ['barres', 'Barres'],
  ['cases', 'Cases'], ['split', 'Ouverture au centre'], ['retourne', 'Retournement'], ['tourne', 'Tourbillon'],
  ['glitch', 'Glitch'], ['fuite', 'Fuite de lumière'], ['pellicule', 'Brûlure de pellicule'], ['mosaique', 'Pixels']
];
const MT_TR_NOM = Object.fromEntries(MT_TRS);
const MT_MVT_NOM = Object.fromEntries(MT_MVTS);

// Réglages de départ de chaque modèle (montage automatique)
function mtPreset(k, n){
  const M = CR.modele;
  if(M === 'v-dyn') return { mvt: n % 3 === 2 ? 'zoomout' : 'punch', tr: n % 4 === 3 ? 'flash' : 'coupe', trD: 0.3 };
  if(M === 'v-glisse') return { mvt: 'zoomin', tr: n % 2 ? 'pousseD' : 'pousseG', trD: 0.5 };
  const cycle = ['kb', 'zoomout', 'droite', 'zoomin', 'gauche', 'kb'];
  return { mvt: cycle[n % cycle.length], tr: 'fondu', trD: 0.7 };
}

// ---------- Le plan (quelle photo, quand, comment) ----------
const anPlanBase = anPlan;
anPlan = function(){
  const M = anModele(CR.modele);
  if(!M || !mtEstSeq(M.k)) return anPlanBase();
  const V = anVid();
  if(V.clips && V.clips.length) return mtPlanManuel();
  const p = anPlanBase();
  p.mt = true;
  p.segs.forEach((sg, n) => { Object.assign(sg, mtPreset(M.k, n), { k: (CR.photos[sg.i] || {}).k, n }); });
  return p;
};
function mtIndex(){ const m = {}; CR.photos.forEach((p, i) => { if(!(p.k in m)) m[p.k] = i; }); return m; }
function mtPlanManuel(){
  const V = anVid(), idx = mtIndex();
  // Les plans dont la photo a disparu sont retirés ; les nouvelles photos sont ajoutées à la fin
  V.clips = V.clips.filter(c => c.k in idx);
  const pris = new Set(V.clips.map(c => c.k));
  CR.photos.forEach(p => { if(!pris.has(p.k)){ V.clips.push(Object.assign({ k: p.k, d: p.video ? Math.max(0.5, Math.min(p.vdur || 4, 4)) : 2.5 }, mtPreset(CR.modele, V.clips.length), p.video ? { mvt: 'aucun' } : {})); pris.add(p.k); } });
  let t = 0;
  const segs = V.clips.map((c, n) => { const sg = { i: idx[c.k], k: c.k, t0: t, t1: t + c.d, mvt: c.mvt, tr: c.tr, trD: c.trD, filtre: c.filtre || null, vin: c.vin, vit: c.vit, n }; t += c.d; return sg; });
  const finD = anFinD(), Dp = Math.max(0.5, t), D = Dp + finD;
  V.duree = Math.round(D * 10) / 10;
  return { D, Dp, finD, segs, n: CR.photos.length, mt: true, manuel: true };
}
function mtEstManuel(){ const V = anVid(); return !!(V.clips && V.clips.length); }
// Passe en montage manuel (on part du montage automatique actuel)
function mtManuel(){
  const V = anVid(); if(V.clips && V.clips.length) return;
  const p = anPlan();
  V.clips = p.segs.map(sg => Object.assign({ k: sg.k, d: Math.round((sg.t1 - sg.t0) * 100) / 100, mvt: sg.mvt, tr: sg.tr, trD: sg.trD }, typeof rvVinAuto === 'function' && (CR.photos[sg.i] || {}).video ? { vin: rvVinAuto(sg) } : {}));
}

// ---------- Dessin ----------
const MT_CV = {};
function mtToile(nom, W, H){
  let c = MT_CV[nom]; if(!c){ c = MT_CV[nom] = document.createElement('canvas'); }
  if(c.width !== W || c.height !== H){ c.width = W; c.height = H; }
  return c;
}
const mtEase = u => 1 - Math.pow(1 - Math.max(0, Math.min(1, u)), 3);
const mtEaseIO = u => { u = Math.max(0, Math.min(1, u)); return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
function mtCover(g, img, x, y, w, h, z, px, py, alpha, filtrePlus){
  if(!img) return;
  const k = Math.max(w / img.width, h / img.height) * (z || 1);
  const dw = img.width * k, dh = img.height * k, lx = (dw - w) / 2, ly = (dh - h) / 2;
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  if(alpha != null) g.globalAlpha = alpha;
  const f = [crFiltre(CR.cfg), filtrePlus].filter(Boolean).join(' '); if(f) g.filter = f;
  g.drawImage(img, x + (w - dw) / 2 - Math.max(-1, Math.min(1, px || 0)) * lx, y + (h - dh) / 2 - Math.max(-1, Math.min(1, py || 0)) * ly, dw, dh);
  g.restore();
}
// Le dernier temps fort avant t (pour "Battement")
function mtDepuisBeat(t){ let d = 9; for(const b of AN.beats || []){ if(b <= t) d = t - b; else break; } return d; }
// Un plan : la photo et son mouvement. u = avancement 0 à 1, ts = secondes depuis le début du plan
function mtPlanDessin(g, img, W, H, s, mvt, u, ts, n, t){
  const f = Math.max(0.3, Math.min(2.5, anVid().force || 1));
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  const dir = n % 2 ? -1 : 1;
  switch(mvt){
    case 'aucun': return mtCover(g, img, 0, 0, W, H, 1.0);
    case 'zoomin': return mtCover(g, img, 0, 0, W, H, 1.02 + 0.16 * f * mtEaseIO(u));
    case 'zoomout': return mtCover(g, img, 0, 0, W, H, 1.02 + 0.16 * f * (1 - mtEaseIO(u)));
    case 'dolly': return mtCover(g, img, 0, 0, W, H, 1 + 0.38 * f * mtEaseIO(u));
    case 'gauche': return mtCover(g, img, 0, 0, W, H, 1 + 0.12 * f, 0.9 - 1.8 * u, 0);
    case 'droite': return mtCover(g, img, 0, 0, W, H, 1 + 0.12 * f, -0.9 + 1.8 * u, 0);
    case 'haut': return mtCover(g, img, 0, 0, W, H, 1 + 0.12 * f, 0, 0.9 - 1.8 * u);
    case 'bas': return mtCover(g, img, 0, 0, W, H, 1 + 0.12 * f, 0, -0.9 + 1.8 * u);
    case 'punch': return mtCover(g, img, 0, 0, W, H, 1.02 + 0.16 * f * (1 - mtEase(Math.max(0, ts) / 0.3)) + 0.03 * u);
    case 'battement': { const d = mtDepuisBeat(t); return mtCover(g, img, 0, 0, W, H, 1.04 + 0.03 * u + 0.07 * f * Math.exp(-d * 7)); }
    case 'tremble': { const a = 0.18 * f; return mtCover(g, img, 0, 0, W, H, 1.1, a * (Math.sin(t * 2.3) + 0.5 * Math.sin(t * 5.7 + 1)), a * (Math.cos(t * 1.9) + 0.5 * Math.sin(t * 4.3))); }
    case 'rotation': {
      g.save(); g.translate(W / 2, H / 2); g.rotate((dir * (-2 + 4 * u) * f) * Math.PI / 180); g.translate(-W / 2, -H / 2);
      mtCover(g, img, -W * 0.03, -H * 0.03, W * 1.06, H * 1.06, 1.1 + 0.06 * u); g.restore(); return;
    }
    case 'flottant': {
      mtCover(g, img, 0, 0, W, H, 1.2, 0, 0, 1, `blur(${Math.round(28 * s)}px) brightness(.6)`);
      const cw = W * 0.8, ch = H * 0.8, y = (H - ch) / 2 + Math.sin(t * 1.3) * 10 * s;
      g.save(); g.translate(W / 2, y + ch / 2); g.rotate((dir * 1.2 * Math.sin(t * 0.8)) * Math.PI / 180); g.scale(0.97 + 0.03 * u, 0.97 + 0.03 * u);
      g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 40 * s; g.shadowOffsetY = 18 * s; g.fillStyle = '#000'; g.fillRect(-cw / 2, -ch / 2, cw, ch); g.shadowColor = 'transparent';
      mtCover(g, img, -cw / 2, -ch / 2, cw, ch, 1.03 + 0.05 * u); g.restore(); return;
    }
    case 'flou': { const b = (1 - mtEase(Math.max(0, ts) / 0.9)) * 24 * s; return mtCover(g, img, 0, 0, W, H, 1.06 + 0.06 * u, 0, 0, 1, b > 0.3 ? `blur(${b.toFixed(1)}px)` : ''); }
    default: return mtCover(g, img, 0, 0, W, H, 1.04 + 0.1 * f * u, dir * 0.5 * u, 0);   // kb
  }
}
function mtDuree(a, b){ if(!a || !b || a.tr === 'coupe') return 0; return Math.max(0.05, Math.min(a.trD || 0.6, 0.9 * (a.t1 - a.t0), 0.9 * (b.t1 - b.t0))); }
window.mtDessiner = function(g, W, H, s, tt, imgs, plan){
  const segs = plan.segs; if(!segs.length){ g.fillStyle = '#000'; g.fillRect(0, 0, W, H); return; }
  let k = segs.findIndex(sg => tt >= sg.t0 && tt < sg.t1); if(k < 0) k = tt < segs[0].t0 ? 0 : segs.length - 1;
  const sg = segs[k], pv = segs[k - 1], nx = segs[k + 1];
  const dIn = mtDuree(pv, sg), dOut = mtDuree(sg, nx);
  const vue = (seg, segPv, segNx, cible) => {
    const a = mtDuree(segPv, seg) / 2, b = mtDuree(seg, segNx) / 2;
    const u = (tt - (seg.t0 - a)) / Math.max(0.1, (seg.t1 + b) - (seg.t0 - a));
    window.mtFiltrePlan = seg.filtre || null;
    const im = typeof rvPour === 'function' ? rvPour(seg, imgs[seg.i], tt) : imgs[seg.i];
    mtPlanDessin(cible, im, W, H, s, seg.mvt, Math.max(0, Math.min(1, u)), tt - seg.t0, seg.n, tt);
    window.mtFiltrePlan = null;
  };
  let A = null, B = null, p = 0, tr = null;
  if(nx && dOut > 0 && tt > sg.t1 - dOut / 2){ A = [sg, pv, nx]; B = [nx, sg, segs[k + 2]]; p = (tt - (sg.t1 - dOut / 2)) / dOut; tr = sg.tr; }
  else if(pv && dIn > 0 && tt < sg.t0 + dIn / 2){ A = [pv, segs[k - 2], sg]; B = [sg, pv, nx]; p = (tt - (sg.t0 - dIn / 2)) / dIn; tr = pv.tr; }
  if(!tr){ vue(sg, pv, nx, g); return; }
  const ca = mtToile('a', W, H), cb = mtToile('b', W, H);
  vue(A[0], A[1], A[2], ca.getContext('2d')); vue(B[0], B[1], B[2], cb.getContext('2d'));
  mtTransition(g, ca, cb, Math.max(0, Math.min(1, p)), tr, W, H, s, A[0].n);
};

// ---------- Les transitions ----------
function mtTransition(g, A, B, p, tr, W, H, s, n){
  const e = mtEaseIO(p), pic = 1 - Math.abs(2 * p - 1);
  const img = (c, x, y, w, h, al) => { g.save(); if(al != null) g.globalAlpha = al; g.drawImage(c, x || 0, y || 0, w || W, h || H); g.restore(); };
  const voile = (coul, a) => { if(a <= 0) return; g.save(); g.globalAlpha = Math.min(1, a); g.fillStyle = coul; g.fillRect(0, 0, W, H); g.restore(); };
  const masque = (trace) => { img(A); g.save(); g.beginPath(); trace(); g.clip(); img(B); g.restore(); };
  g.save(); g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.restore();
  switch(tr){
    case 'fondu': img(A); img(B, 0, 0, W, H, e); break;
    case 'noir': if(p < .5){ img(A); voile('#000', p * 2); } else { img(B); voile('#000', (1 - p) * 2); } break;
    case 'blanc': if(p < .5){ img(A); voile('#fff', p * 2); } else { img(B); voile('#fff', (1 - p) * 2); } break;
    case 'flash': img(p < .5 ? A : B); voile('#fff', Math.pow(pic, 1.6)); break;
    case 'flouT': { const b = pic * 30 * s; g.save(); g.filter = `blur(${b.toFixed(1)}px)`; g.drawImage(A, 0, 0); g.globalAlpha = e; g.drawImage(B, 0, 0); g.restore(); break; }
    case 'zoomIn': { const za = 1 + 0.9 * e, zb = 1.5 - 0.5 * e; img(A, W / 2 * (1 - za), H / 2 * (1 - za), W * za, H * za, 1 - e); img(B, W / 2 * (1 - zb), H / 2 * (1 - zb), W * zb, H * zb, e); break; }
    case 'zoomOut': { const za = 1 - 0.35 * e, zb = 1.25 - 0.25 * e; img(B, W / 2 * (1 - zb), H / 2 * (1 - zb), W * zb, H * zb); img(A, W / 2 * (1 - za), H / 2 * (1 - za), W * za, H * za, 1 - e); break; }
    case 'fouet': {
      const x = -W * e;
      for(let k = 0; k < 6; k++){ const o = (k - 2.5) * W * 0.035 * pic; g.save(); g.globalAlpha = k === 0 ? 1 : 0.28; g.drawImage(A, x + o, 0); g.drawImage(B, x + W + o, 0); g.restore(); }
      break;
    }
    case 'pousseG': img(A, -W * e, 0); img(B, W * (1 - e), 0); break;
    case 'pousseD': img(A, W * e, 0); img(B, -W * (1 - e), 0); break;
    case 'pousseH': img(A, 0, -H * e); img(B, 0, H * (1 - e)); break;
    case 'glisseG': img(A); img(B, W * (1 - e), 0); break;
    case 'glisseD': img(A); img(B, -W * (1 - e), 0); break;
    case 'glisseH': img(A); img(B, 0, H * (1 - e)); break;
    case 'glisseB': img(A); img(B, 0, -H * (1 - e)); break;
    case 'rideauV': masque(() => g.rect(0, 0, W * e, H)); break;
    case 'rideauH': masque(() => g.rect(0, 0, W, H * e)); break;
    case 'rideauDiag': masque(() => { const d = (W + H) * e; g.moveTo(0, 0); g.lineTo(d, 0); g.lineTo(d - H, H); g.lineTo(0, H); }); break;
    case 'cercle': masque(() => g.arc(W / 2, H / 2, Math.hypot(W, H) / 2 * e, 0, Math.PI * 2)); break;
    case 'iris': {
      const r = Math.hypot(W, H) / 2;
      if(p < .5){ g.save(); g.beginPath(); g.arc(W / 2, H / 2, r * (1 - mtEaseIO(p * 2)), 0, Math.PI * 2); g.clip(); img(A); g.restore(); }
      else { g.save(); g.beginPath(); g.arc(W / 2, H / 2, r * mtEaseIO(p * 2 - 1), 0, Math.PI * 2); g.clip(); img(B); g.restore(); }
      break;
    }
    case 'losange': masque(() => { const r = (W + H) / 2 * e; g.moveTo(W / 2, H / 2 - r); g.lineTo(W / 2 + r, H / 2); g.lineTo(W / 2, H / 2 + r); g.lineTo(W / 2 - r, H / 2); }); break;
    case 'stores': masque(() => { const nb = 9, l = W / nb; for(let i = 0; i < nb; i++) g.rect(i * l, 0, l * mtEase(p * 1.4 - i * 0.04), H); }); break;
    case 'barres': masque(() => { const nb = 7, h = H / nb; for(let i = 0; i < nb; i++){ const w = W * mtEase(p * 1.3 - i * 0.04); if(i % 2) g.rect(W - w, i * h, w, h + 1); else g.rect(0, i * h, w, h + 1); } }); break;
    case 'cases': masque(() => { const cx = 6, cy = Math.round(6 * H / W), w = W / cx, h = H / cy; for(let i = 0; i < cx; i++) for(let j = 0; j < cy; j++){ const a = Math.sin((i * 7 + j * 13 + n) * 12.9898) * 43758.5453, r = a - Math.floor(a); if(p > r * 0.75) g.rect(i * w, j * h, w + 1, h + 1); } }); break;
    case 'split': img(B); g.save(); g.beginPath(); g.rect(0, 0, W / 2, H); g.clip(); g.drawImage(A, -W / 2 * e, 0); g.restore(); g.save(); g.beginPath(); g.rect(W / 2, 0, W / 2, H); g.clip(); g.drawImage(A, W / 2 * e, 0); g.restore(); break;
    case 'retourne': { const c = p < .5 ? A : B, k = Math.abs(Math.cos(p * Math.PI)); g.save(); g.translate(W / 2, 0); g.scale(Math.max(0.001, k), 1); g.drawImage(c, -W / 2, 0); g.restore(); voile('#000', pic * 0.35); break; }
    case 'tourne': {
      const c = p < .5 ? A : B, a = (p < .5 ? e : e - 1) * Math.PI * 0.6, z = 1 + pic * 0.6;
      g.save(); g.translate(W / 2, H / 2); g.rotate(a); g.scale(z, z); g.drawImage(c, -W / 2, -H / 2); g.restore();
      g.save(); g.globalAlpha = pic * 0.6; g.filter = `blur(${(pic * 16 * s).toFixed(1)}px)`; g.translate(W / 2, H / 2); g.rotate(a * 1.15); g.scale(z, z); g.drawImage(c, -W / 2, -H / 2); g.restore();
      break;
    }
    case 'glitch': {
      const c = p < .5 ? A : B; img(c);
      const fort = pic, graine = Math.floor(p * 18);
      for(let i = 0; i < 9; i++){
        const a = Math.sin((i + 1) * 91.7 + graine * 13.1) * 43758.5453, r = a - Math.floor(a), b2 = Math.sin((i + 3) * 17.3 + graine * 7.7) * 24634.6, r2 = b2 - Math.floor(b2);
        const y = r * H, h = (0.02 + r2 * 0.08) * H, dx = (r2 - 0.5) * W * 0.25 * fort;
        g.drawImage(c, 0, y, W, h, dx, y, W, h);
      }
      g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.5 * fort;
      g.filter = 'sepia(1) saturate(8) hue-rotate(-50deg)'; g.drawImage(c, 14 * s * fort, 0);
      g.filter = 'sepia(1) saturate(8) hue-rotate(140deg)'; g.drawImage(c, -14 * s * fort, 0); g.restore();
      break;
    }
    case 'fuite': {
      img(A); img(B, 0, 0, W, H, e);
      g.save(); g.globalCompositeOperation = 'screen';
      const gr = g.createRadialGradient(W * (0.2 + 0.6 * p), H * 0.3, 0, W * (0.2 + 0.6 * p), H * 0.3, Math.max(W, H) * 0.8);
      gr.addColorStop(0, `rgba(255,170,80,${0.95 * pic})`); gr.addColorStop(0.4, `rgba(255,80,120,${0.55 * pic})`); gr.addColorStop(1, 'rgba(255,60,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore(); break;
    }
    case 'pellicule': {
      img(A); img(B, 0, 0, W, H, e);
      g.save(); g.globalCompositeOperation = 'screen';
      const gr = g.createLinearGradient(0, H * (1 - p * 1.6), 0, H * (1.6 - p * 1.6));
      gr.addColorStop(0, 'rgba(255,240,200,0)'); gr.addColorStop(0.45, `rgba(255,200,90,${pic})`); gr.addColorStop(0.55, `rgba(255,255,240,${pic})`); gr.addColorStop(1, 'rgba(255,120,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore(); break;
    }
    case 'mosaique': {
      const c = p < .5 ? A : B, taille = Math.max(1, Math.round(pic * 48 * s)) || 1;
      if(taille <= 1){ img(c); break; }
      const pw = Math.max(1, Math.round(W / taille)), ph = Math.max(1, Math.round(H / taille)), t2 = mtToile('px', pw, ph);
      t2.getContext('2d').drawImage(c, 0, 0, pw, ph);
      g.save(); g.imageSmoothingEnabled = false; g.drawImage(t2, 0, 0, W, H); g.restore(); break;
    }
    default: img(p < .5 ? A : B);   // coupe
  }
}

// ============================================================
// LA PISTE (interface)
// ============================================================
const MT = { sel: null, undo: [], redo: [] };
window.MT = MT;
function mtSnap(){ const V = anVid(); MT.undo.push({ clips: JSON.parse(JSON.stringify(V.clips || null)), photos: CR.photos.slice(), crop: CR.crop.map(c => Object.assign({}, c)) }); if(MT.undo.length > 60) MT.undo.shift(); MT.redo = []; }
window.mtAnnuler = function(retablir){
  const de = retablir ? MT.redo : MT.undo, vers = retablir ? MT.undo : MT.redo;
  const x = de.pop(); if(!x) return;
  const V = anVid();
  vers.push({ clips: JSON.parse(JSON.stringify(V.clips || null)), photos: CR.photos.slice(), crop: CR.crop.map(c => Object.assign({}, c)) });
  V.clips = x.clips; CR.photos = x.photos; CR.crop = x.crop; MT.sel = null;
  mtMaj(true);
};
// Photos qui ne sont plus dans aucun plan : retirées (montage manuel)
function mtNettoyer(){
  const V = anVid(); if(!V.clips) return;
  const pris = new Set(V.clips.map(c => c.k));
  for(let i = CR.photos.length - 1; i >= 0; i--) if(!pris.has(CR.photos[i].k)){ CR.photos.splice(i, 1); CR.crop.splice(i, 1); }
}
function mtAvant(){ mtSnap(); mtManuel(); }
// Rafraîchit la piste, l'aperçu, la barre de lecture
function mtMaj(images){
  const z = document.getElementById('mtZone'); if(z){ z.innerHTML = mtInner(); if(typeof mkHydrate === 'function') mkHydrate(z); mtBrancher(); }
  if(typeof window.mtsMaj === 'function') window.mtsMaj();
  const plan = anPlan(); AN.plan = plan;
  const sc = document.getElementById('anScrub'); if(sc) sc.max = plan.D;
  const dt = document.getElementById('anDureeTxt'); if(dt) dt.textContent = anMinSec(plan.D);
  const dr = document.getElementById('anDureeR'); if(dr) dr.value = Math.round(plan.D);
  const fn = document.querySelector('.cr-fmtnom'); if(fn) fn.textContent = `${anModele(CR.modele).nom} · ${CR.photos.length} photos · ${plan.segs.length} plans · ${anMinSec(plan.D)}`;
  if(AN.t > plan.D) AN.t = 0;
  if(images) anPreparer(false).then(() => anApercuUneFois()); else anApercuUneFois();
}
window.mtMaj = mtMaj;
function mtVignette(p){ if(!p) return ''; return `<img src="${crE(p.thumb || p.url || '')}" ${p.path && !p.thumb ? `data-mkp="${crE(p.path)}"` : ''} alt="" draggable="false">`; }
const MT_PPS = 34;   // pixels par seconde sur la piste
function mtLargeur(d){ return Math.round(Math.max(52, Math.min(240, d * MT_PPS))); }
const MT_IC_TR = '<svg viewBox="0 0 16 16" width="12" height="12"><path d="M2 3l6 5-6 5zM14 3L8 8l6 5z" fill="currentColor"/></svg>';
const MT_IC_CUT = '<svg viewBox="0 0 16 16" width="12" height="12"><path d="M8 2v12" stroke="currentColor" stroke-width="2"/></svg>';
function mtInner(){
  const M = anModele(CR.modele); if(!M || !mtEstSeq(M.k)) return '';
  const plan = anPlan(), segs = plan.segs, man = mtEstManuel(), sel = MT.sel;
  const piste = segs.map((sg, n) => {
    const p = CR.photos[sg.i], d = sg.t1 - sg.t0;
    const clip = `<button type="button" class="mt-clip ${sel && sel.t === 'c' && sel.n === n ? 'on' : ''}" data-n="${n}" style="width:${mtLargeur(d)}px" onclick="mtChoisir('c',${n})">${mtVignette(p)}<b>${p && p.video ? agIcon('play', 9) + ' ' : ''}${d.toFixed(1).replace('.', ',')} s</b><i>${MT_MVT_COURT[sg.mvt] || ''}</i></button>`;
    const tr = n < segs.length - 1 ? `<button type="button" class="mt-tr ${sg.tr === 'coupe' ? 'cut' : ''} ${sel && sel.t === 't' && sel.n === n ? 'on' : ''}" title="${crE(MT_TR_NOM[sg.tr] || '')}" onclick="mtChoisir('t',${n})">${sg.tr === 'coupe' ? MT_IC_CUT : MT_IC_TR}</button>` : '';
    return clip + tr;
  }).join('');
  const pills = (list, val, fn) => `<div class="ag-pills mt-pills">${list.map(([k, l]) => `<button type="button" class="${val === k ? 'on' : ''}" onclick="${fn}('${k}')">${crE(l)}</button>`).join('')}</div>`;
  let panneau = '';
  if(sel && sel.t === 'c' && segs[sel.n]){
    const sg = segs[sel.n], d = sg.t1 - sg.t0;
    panneau = `<div class="mt-pan"><div class="mt-pan-t"><b>Plan ${sel.n + 1}</b><span>photo ${sg.i + 1} · de ${anMinSec(sg.t0)} à ${anMinSec(sg.t1)}</span><button class="st-link" onclick="mtChoisir(null)">Fermer</button></div>
      <label>Durée : <b id="mtDTxt">${d.toFixed(1).replace('.', ',')} s</b></label><input type="range" min="0.2" max="${Math.max(12, Math.ceil(d))}" step="0.1" value="${d.toFixed(1)}" oninput="mtDureePlan(this.value)" onchange="mtMaj()">
      ${typeof rvPanneau === 'function' && (CR.photos[sg.i] || {}).video ? rvPanneau(sg, d) : ''}
      <label>Mouvement de caméra</label>${pills(MT_MVTS, sg.mvt, 'mtMvt')}
      <label>Couleur de ce plan</label>${pills([['', 'Comme la vidéo']].concat(Object.keys(CR_FILTRES).filter(k => k !== 'aucun').map(k => [k, CR_FILTRES[k][0]])).concat([['aucun', 'Sans filtre']]), sg.filtre || '', 'mtFiltre')}
      <div class="mt-act">
        <button type="button" onclick="mtBouger(-1)" ${sel.n === 0 ? 'disabled' : ''}>‹ Avant</button>
        <button type="button" onclick="mtBouger(1)" ${sel.n >= segs.length - 1 ? 'disabled' : ''}>Après ›</button>
        <button type="button" onclick="mtCouper()">${agIcon('scissors', 13)} Couper ici</button>
        <button type="button" onclick="mtDupliquer()">Dupliquer</button>
        <button type="button" onclick="mtRemplacer()">Remplacer la photo</button>
        <button type="button" class="no" onclick="mtSupprimer()" ${segs.length <= 1 ? 'disabled' : ''}>Supprimer</button>
      </div>
      <div class="ag-hint">« Couper ici » coupe le plan à l'endroit de la lecture : le même photo continue avec un autre mouvement.</div></div>`;
  } else if(sel && sel.t === 't' && segs[sel.n]){
    const sg = segs[sel.n];
    panneau = `<div class="mt-pan"><div class="mt-pan-t"><b>Transition ${sel.n + 1} → ${sel.n + 2}</b><span>${crE(MT_TR_NOM[sg.tr] || '')}</span><button class="st-link" onclick="mtChoisir(null)">Fermer</button></div>
      ${pills(MT_TRS, sg.tr, 'mtTr')}
      ${sg.tr !== 'coupe' ? `<label>Durée de la transition : <b id="mtTDTxt">${(sg.trD || 0.6).toFixed(1).replace('.', ',')} s</b></label><input type="range" min="0.1" max="2" step="0.05" value="${sg.trD || 0.6}" oninput="mtTrDuree(this.value)">` : ''}
      <div class="mt-act"><button type="button" onclick="mtTrPartout()">Mettre cette transition partout</button><button type="button" onclick="mtVoirTr()">${agIcon('play', 12)} Voir</button></div></div>`;
  } else {
    panneau = `<div class="mt-pan mt-pan-tout"><div class="mt-pan-t"><b>Pour tous les plans</b><span>${man ? 'Montage personnalisé' : 'Montage automatique'}</span>${man ? '<button class="st-link" onclick="mtAuto()">Revenir en auto</button>' : ''}</div>
      <label>Transitions</label>${pills([['varie', 'Varié'], ['fondu', 'Fondu'], ['coupe', 'Coupes nettes'], ['flash', 'Flash'], ['fouet', 'Coup de fouet'], ['zoomIn', 'Zoom'], ['glitch', 'Glitch'], ['fuite', 'Fuite de lumière']], '', 'mtTrTous')}
      <label>Mouvements</label>${pills([['varie', 'Varié'], ['kb', 'Doux'], ['zoomin', 'Zoom avant'], ['punch', 'Punch'], ['tremble', 'Caméra à la main'], ['flottant', 'Carte flottante'], ['aucun', 'Fixe']], '', 'mtMvtTous')}
      <label>Même durée pour chaque photo</label>${pills([['0.5', '0,5 s'], ['1', '1 s'], ['1.5', '1,5 s'], ['2', '2 s'], ['3', '3 s'], ['4', '4 s']], '', 'mtDureeTous')}
      ${AN.beats && AN.beats.length ? `<div class="mt-act"><button type="button" onclick="mtCalerRythme()">${agIcon('music', 13)} Caler chaque coupe sur le rythme</button></div>` : ''}
      <label>Force des mouvements</label><input type="range" min="0.3" max="2.5" step="0.1" value="${anVid().force || 1}" oninput="anVid().force=Number(this.value);anApercuUneFois()">
      <div class="ag-hint">Touche un plan pour régler sa durée et son mouvement, ou le petit signe entre deux plans pour la transition. Reste appuyé sur un plan puis glisse pour changer l'ordre.</div></div>`;
  }
  return `<div class="mt-tete"><b>Table de montage</b><span>${segs.length} plans · ${anMinSec(plan.D)}</span>
      <button type="button" class="mt-ic" onclick="mtAnnuler()" ${MT.undo.length ? '' : 'disabled'} title="Annuler">↶</button><button type="button" class="mt-ic" onclick="mtAnnuler(true)" ${MT.redo.length ? '' : 'disabled'} title="Rétablir">↷</button></div>
    <div class="mt-piste-w"><div class="mt-piste" id="mtPiste">${piste}<button type="button" class="mt-plus" onclick="anStop();CR.vue='photos';crRender()" title="Ajouter des photos">+</button><i class="mt-tete-l" id="mtTeteL"></i></div></div>
    ${panneau}
    <input type="file" id="mtFile" accept="image/*" style="display:none" onchange="mtFichierRemplace(this.files)">`;
}
window.mtChoisir = function(t, n){ MT.sel = t ? { t, n } : null; if(t === 'c'){ const sg = anPlan().segs[n]; if(sg){ anStop(); AN.t = Math.min(sg.t1 - 0.05, sg.t0 + 0.05); } } mtMaj(); };
window.mtDureePlan = function(v){ const n = MT.sel && MT.sel.n; if(n == null) return; if(!mtEstManuel() || !MT.glisseDuree){ mtAvant(); MT.glisseDuree = true; } anVid().clips[n].d = Number(v); const el = document.getElementById('mtDTxt'); if(el) el.textContent = Number(v).toFixed(1).replace('.', ',') + ' s'; AN.plan = anPlan(); anApercuUneFois(); clearTimeout(mtDureePlan.t); mtDureePlan.t = setTimeout(() => { MT.glisseDuree = false; }, 800); };
window.mtAvantPublic = function(){ mtAvant(); };
window.mtFiltre = function(k){ mtAvant(); anVid().clips[MT.sel.n].filtre = k || null; mtMaj(); };
window.mtMvt = function(k){ mtAvant(); anVid().clips[MT.sel.n].mvt = k; mtMaj(); };
window.mtTr = function(k){ mtAvant(); const c = anVid().clips[MT.sel.n]; c.tr = k; if(!c.trD) c.trD = 0.6; mtMaj(); mtVoirTr(); };
window.mtTrDuree = function(v){ if(!mtEstManuel() || !MT.glisseDuree){ mtAvant(); MT.glisseDuree = true; } anVid().clips[MT.sel.n].trD = Number(v); const el = document.getElementById('mtTDTxt'); if(el) el.textContent = Number(v).toFixed(1).replace('.', ',') + ' s'; AN.plan = anPlan(); anApercuUneFois(); clearTimeout(mtTrDuree.t); mtTrDuree.t = setTimeout(() => { MT.glisseDuree = false; }, 800); };
window.mtTrPartout = function(){ const c0 = anVid().clips ? anVid().clips[MT.sel.n] : anPlan().segs[MT.sel.n]; mtAvant(); anVid().clips.forEach(c => { c.tr = c0.tr; c.trD = c0.trD; }); agToast('Transition appliquée partout'); mtMaj(); };
// Joue juste le passage de la transition
window.mtVoirTr = function(){
  const sg = anPlan().segs[MT.sel ? MT.sel.n : 0]; if(!sg) return;
  anStop(); AN.t = Math.max(0, sg.t1 - Math.max(0.6, (sg.trD || 0.6)) - 0.3); anApercuUneFois();
  const fin = sg.t1 + Math.max(0.6, sg.trD || 0.6) + 0.3;
  anLecture();
  const iv = setInterval(() => { if(!AN.lecture || AN.t >= fin){ clearInterval(iv); if(AN.lecture) anStop(); } }, 50);
};
window.mtBouger = function(d){
  const n = MT.sel.n, j = n + d; mtAvant(); const L = anVid().clips; if(j < 0 || j >= L.length) return;
  [L[n], L[j]] = [L[j], L[n]]; MT.sel.n = j; mtMaj();
};
window.mtCouper = function(){
  const n = MT.sel.n, sg = anPlan().segs[n]; if(!sg) return;
  mtAvant();
  const L = anVid().clips, c = L[n];
  let a = AN.t > sg.t0 + 0.2 && AN.t < sg.t1 - 0.2 ? AN.t - sg.t0 : c.d / 2;
  a = Math.round(a * 100) / 100;
  if(c.d < 0.5){ agToast('Ce plan est trop court pour être coupé', 'info'); MT.undo.pop(); return; }
  const suite = MT_MVTS.map(x => x[0]), autre = suite[(suite.indexOf(c.mvt) + 1) % (suite.length - 1)];
  const ph = CR.photos[sg.i] || {}, vin0 = ph.video ? (c.vin != null ? c.vin : (typeof rvVinAuto === 'function' ? rvVinAuto(sg) : 0)) : null;
  if(ph.video) c.vin = vin0;
  L.splice(n + 1, 0, Object.assign({}, c, { d: Math.round((c.d - a) * 100) / 100, mvt: ph.video ? c.mvt : autre }, ph.video ? { vin: Math.round((vin0 + a * (c.vit || 1)) * 100) / 100 } : {}));
  c.d = a; c.tr = 'coupe';
  agToast('Plan coupé en deux'); MT.sel = { t: 'c', n: n + 1 }; mtMaj();
};
window.mtDupliquer = function(){ const n = MT.sel.n; mtAvant(); const L = anVid().clips; L.splice(n + 1, 0, Object.assign({}, L[n])); MT.sel.n = n + 1; mtMaj(); };
window.mtSupprimer = function(){ const n = MT.sel.n; mtAvant(); const L = anVid().clips; if(L.length <= 1) return; L.splice(n, 1); mtNettoyer(); MT.sel = null; mtMaj(true); };
window.mtRemplacer = function(){
  const n = MT.sel.n, plan = anPlan(), sg = plan.segs[n];
  const autres = CR.photos.map((p, i) => i === sg.i ? '' : `<button type="button" class="mt-rp" onclick="mtRemplacerPar('${crE(p.k)}')">${mtVignette(p)}</button>`).join('');
  const h = `<div class="mt-pan"><div class="mt-pan-t"><b>Remplacer la photo du plan ${n + 1}</b><button class="st-link" onclick="mtMaj()">Annuler</button></div>
    ${autres ? `<label>Une de tes photos du montage</label><div class="mt-rps">${autres}</div>` : ''}
    <div class="mt-act"><button type="button" onclick="document.getElementById('mtFile').click()">Une autre photo de mon téléphone</button></div></div>`;
  const pan = document.querySelector('#mtZone .mt-pan'); if(pan){ pan.outerHTML = h; if(typeof mkHydrate === 'function') mkHydrate(document.getElementById('mtZone')); }
};
window.mtRemplacerPar = function(k){ mtAvant(); anVid().clips[MT.sel.n].k = k; mtNettoyer(); mtMaj(true); };
window.mtFichierRemplace = function(files){
  const f = files && files[0]; if(!f || !/^image\//.test(f.type)) return;
  const url = URL.createObjectURL(f), p = { k: 'f:' + f.name + f.size + Math.random(), src: 'fichier', file: f, url, thumb: url };
  mtAvant(); CR.photos.push(p); CR.crop.push({ x: 0, y: 0, z: 1 });
  anVid().clips[MT.sel.n].k = p.k; mtNettoyer();
  const inp = document.getElementById('mtFile'); if(inp) inp.value = '';
  mtMaj(true);
};
window.mtAuto = async function(){ if(!await agConfirm('Revenir au montage automatique ?\nTes réglages de plans et de transitions seront remplacés.', { ok: 'Oui, en auto', no: 'Garder' })) return; mtSnap(); anVid().clips = null; MT.sel = null; mtMaj(); };
window.mtTrTous = function(k){
  mtAvant(); const L = anVid().clips, choix = ['fondu', 'fouet', 'zoomIn', 'flash', 'pousseG', 'fuite', 'flouT', 'cercle', 'glisseG', 'pellicule'];
  L.forEach((c, i) => { c.tr = k === 'varie' ? choix[(i * 7 + 3) % choix.length] : k; c.trD = k === 'flash' || k === 'glitch' ? 0.35 : k === 'fouet' ? 0.4 : k === 'coupe' ? 0 : 0.7; });
  agToast('Transitions changées'); mtMaj();
};
window.mtMvtTous = function(k){
  mtAvant(); const L = anVid().clips, choix = ['kb', 'zoomin', 'droite', 'zoomout', 'gauche', 'dolly', 'haut', 'punch'];
  L.forEach((c, i) => { c.mvt = k === 'varie' ? choix[i % choix.length] : k; });
  agToast('Mouvements changés'); mtMaj();
};
window.mtDureeTous = function(v){ mtAvant(); anVid().clips.forEach(c => { c.d = Number(v); }); mtMaj(); };
// Chaque coupe tombe sur le temps fort le plus proche
window.mtCalerRythme = function(){
  const B = AN.beats || []; if(!B.length) return;
  mtAvant(); const L = anVid().clips;
  let t = 0, avant = 0, cale = 0;
  L.forEach((c, i) => {
    t += c.d; if(i === L.length - 1) return;
    const b = B.reduce((a, x) => Math.abs(x - t) < Math.abs(a - t) ? x : a, B[0]);
    let fin = Math.abs(b - t) < 0.6 ? b : t; if(fin - avant < 0.25) fin = t;
    if(fin !== t) cale++;
    c.d = Math.max(0.25, Math.round((fin - avant) * 100) / 100); avant += c.d; t = avant;
  });
  agToast(cale + ' coupe' + (cale > 1 ? 's' : '') + ' calée' + (cale > 1 ? 's' : '') + ' sur le rythme'); mtMaj();
};

// ---------- Glisser pour changer l'ordre (rester appuyé) ----------
function mtBrancher(){
  const piste = document.getElementById('mtPiste'); if(!piste) return;
  let tim = 0, drag = null, x0 = 0, y0 = 0;
  const fin = () => { clearTimeout(tim); tim = 0; };
  piste.querySelectorAll('.mt-clip').forEach(el => {
    el.addEventListener('pointerdown', e => {
      x0 = e.clientX; y0 = e.clientY;
      tim = setTimeout(() => { drag = { n: Number(el.dataset.n), el, id: e.pointerId, cible: Number(el.dataset.n) }; el.classList.add('drag'); piste.classList.add('en-drag'); try { el.setPointerCapture(e.pointerId); } catch(er){} if(navigator.vibrate) navigator.vibrate(15); }, 320);
    });
    el.addEventListener('pointermove', e => {
      if(!drag){ if(Math.abs(e.clientX - x0) > 8 || Math.abs(e.clientY - y0) > 8) fin(); return; }
      el.style.transform = `translateX(${e.clientX - x0}px)`;
      const clips = [...piste.querySelectorAll('.mt-clip')];
      // La place visée : le plan dont le centre est le plus proche du doigt
      let cible = drag.n, best = 1e9;
      clips.forEach((c, i) => { const r = c.getBoundingClientRect(), cx = i === drag.n ? r.left - (e.clientX - x0) + r.width / 2 : r.left + r.width / 2, d = Math.abs(e.clientX - cx); if(d < best){ best = d; cible = i; } });
      drag.cible = cible;
      clips.forEach((c, i) => c.classList.toggle('cible', i === drag.cible && i !== drag.n));
    });
    const lacher = () => {
      fin();
      if(!drag) return;
      const { n, cible } = drag; drag = null; piste.classList.remove('en-drag');
      if(cible !== n){ mtAvant(); const L = anVid().clips; const [c] = L.splice(n, 1); L.splice(cible, 0, c); MT.sel = { t: 'c', n: cible }; agToast('Plan déplacé'); }
      MT.lacheA = Date.now();
      mtMaj();
    };
    el.addEventListener('pointerup', lacher); el.addEventListener('pointercancel', () => { fin(); if(drag){ drag = null; mtMaj(); } });
    el.addEventListener('click', e => { if(MT.lacheA && Date.now() - MT.lacheA < 400){ e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  });
  // Pendant le glissé : la piste ne défile pas
  piste.addEventListener('touchmove', e => { if(piste.classList.contains('en-drag')) e.preventDefault(); }, { passive: false });
  mtTeteLecture();
}
// La tête de lecture suit la vidéo
function mtTeteLecture(){
  const l = document.getElementById('mtTeteL'), piste = document.getElementById('mtPiste'); if(!l || !piste || !AN.plan || !AN.plan.segs) return;
  const segs = AN.plan.segs, tt = Math.min(AN.t, AN.plan.Dp);
  let k = segs.findIndex(sg => tt >= sg.t0 && tt < sg.t1); if(k < 0) k = segs.length - 1;
  const el = piste.querySelector(`.mt-clip[data-n="${k}"]`); if(!el) return;
  const sg = segs[k], x = el.offsetLeft + el.offsetWidth * Math.max(0, Math.min(1, (tt - sg.t0) / Math.max(0.01, sg.t1 - sg.t0)));
  l.style.left = x + 'px';
  if(AN.lecture){ const w = piste.parentElement; if(x < w.scrollLeft + 30 || x > w.scrollLeft + w.clientWidth - 30) w.scrollLeft = x - w.clientWidth / 3; }
}
const anApercuBase = anApercuUneFois;
anApercuUneFois = function(){ const r = anApercuBase.apply(this, arguments); try { mtTeteLecture(); } catch(e){} return r; };

// La durée totale en montage personnalisé : tous les plans s'allongent ou raccourcissent ensemble
const anDureeBase = anDuree;
anDuree = function(v){
  const M = anModele(CR.modele);
  if(!M || !mtEstSeq(M.k) || !mtEstManuel()) return anDureeBase.apply(this, arguments);
  const V = anVid(), finD = anFinD(), somme = V.clips.reduce((a, c) => a + c.d, 0) || 1;
  const k = Math.max(0.2, (Number(v) - finD)) / somme;
  V.clips.forEach(c => { c.d = Math.max(0.2, Math.round(c.d * k * 100) / 100); });
  const el = document.getElementById('anDureeTxt'); if(el) el.textContent = anMinSec(Number(v));
  if(V.musique) anCalculerBeats();
  clearTimeout(anDuree.t); anDuree.t = setTimeout(() => mtMaj(), 250);
};

// La piste dans l'éditeur, sous l'aperçu
const anVueEditBase = anVueEdit;
anVueEdit = function(){
  let h = anVueEditBase.apply(this, arguments);
  const M = anModele(CR.modele);
  if(M && mtEstSeq(M.k)){
    const i = h.indexOf('\n      </div>\n      <div class="cr-panneau">');
    if(i > 0) h = h.slice(0, i) + `<div class="mt" id="mtZone">${mtInner()}</div>` + h.slice(i);
  }
  return h;
};
// Après chaque affichage de l'éditeur : on branche la piste
const crRenderMt = crRender;
crRender = async function(){
  const r = await crRenderMt.apply(this, arguments);
  if(CR.vue === 'edit' && document.getElementById('mtZone')){ mtBrancher(); }
  if(CR.vue !== 'edit') MT.sel = null;
  return r;
};
// Nouveau modèle choisi depuis l'accueil : on repart en automatique
const crChoisirMt = crChoisirModele;
crChoisirModele = function(k){ if(CR.vue === 'accueil' && typeof AN !== 'undefined' && AN.vid){ AN.vid.clips = null; } MT.undo = []; MT.redo = []; MT.sel = null; return crChoisirMt.apply(this, arguments); };

(function mtCss(){
  if(document.getElementById('mtCss')) return;
  const st = document.createElement('style'); st.id = 'mtCss';
  st.textContent = `
.cr-edit>*,.cr-prev-zone{min-width:0}.mt,.mts{max-width:100%;box-sizing:border-box}
.mt{margin-top:12px;padding:10px;border-radius:16px;background:var(--card);border:1px solid var(--border)}
.mt-tete{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.mt-tete b{color:var(--text);font-size:14px}.mt-tete span{flex:1;color:var(--muted);font-size:12px}
.mt-ic{width:34px;height:30px;margin:0;padding:0;border-radius:8px;border:1px solid var(--border);background:var(--card2);color:var(--text);font-size:16px;cursor:pointer}
.mt-ic:disabled{opacity:.35;cursor:default}
.mt-piste-w{overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;padding-bottom:6px;scrollbar-width:thin}
.mt-piste{position:relative;display:flex;align-items:stretch;gap:0;min-width:max-content;padding:4px 2px;touch-action:pan-x}
.mt-clip{position:relative;flex:none;height:64px;margin:0;padding:0;border-radius:9px;overflow:hidden;border:2px solid transparent;background:var(--card2);cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;transition:transform .12s}
.mt-clip img{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none}
.mt-clip b{display:flex;align-items:center;gap:3px;position:absolute;left:4px;bottom:3px;font-size:10px;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.8);font-weight:600}
.mt-clip i{position:absolute;right:4px;top:3px;font-style:normal;font-size:9px;color:#fff;background:rgba(0,0,0,.5);border-radius:5px;padding:1px 4px}
.mt-clip.on{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 35%,transparent)}
.mt-clip.drag{z-index:5;opacity:.85;box-shadow:0 10px 24px rgba(0,0,0,.45);transition:none}
.mt-clip.cible{border-color:#f5a524}
.mt-tr{flex:none;align-self:center;width:22px;height:30px;margin:0 2px;padding:0;border-radius:7px;border:1px solid var(--border);background:var(--card2);color:var(--accent);display:flex;align-items:center;justify-content:center;cursor:pointer}
.mt-tr.cut{color:var(--muted)}
.mt-tr.on{background:var(--accent);color:#fff;border-color:var(--accent)}
.mt-plus{flex:none;width:44px;height:64px;margin:0 0 0 6px;padding:0;border-radius:9px;border:1.5px dashed var(--border);background:transparent;color:var(--muted);font-size:22px;cursor:pointer}
.mt-tete-l{position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;background:#f5a524;pointer-events:none;border-radius:2px;box-shadow:0 0 6px rgba(245,165,36,.7)}
.mt-pan{margin-top:8px;padding:10px;border-radius:12px;background:var(--card2)}
.mt-pan-t{display:flex;align-items:baseline;gap:8px;margin-bottom:6px}
.mt-pan-t b{color:var(--text);font-size:13.5px}.mt-pan-t span{flex:1;color:var(--muted);font-size:12px}
.mt-pan label{display:block;margin:8px 0 4px;font-size:12px;color:var(--muted)}
.mt-pills{flex-wrap:wrap}.mt-pills button{width:auto;font-size:12px;padding:6px 10px}
.mt-act{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.mt-act button{display:inline-flex;align-items:center;gap:5px;width:auto;margin:0;padding:7px 11px;border-radius:999px;border:1px solid var(--border);background:var(--card);color:var(--text);font-size:12.5px;cursor:pointer}
.mt-act button:disabled{opacity:.4;cursor:default}.mt-act button.no{color:#e5484d}
.mt-rps{display:flex;flex-wrap:wrap;gap:6px}
.mt-rp{width:56px;height:56px;margin:0;padding:0;border-radius:8px;overflow:hidden;border:1px solid var(--border);cursor:pointer}
.mt-rp img{width:100%;height:100%;object-fit:cover;display:block}`;
  document.head.appendChild(st);
})();
// Si l'éditeur est déjà ouvert : on l'affiche avec la piste
if(CR.vue === 'edit' && document.getElementById('anCanvas')) crRender();
})();
