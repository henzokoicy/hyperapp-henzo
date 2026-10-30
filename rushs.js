// ============================================================
// RUSHS.JS - Des vidéos (rushs) dans les montages des Créations
// ------------------------------------------------------------
// Tu ajoutes des vidéos filmées avec tes photos. Dans la table de
// montage, chaque vidéo est un plan : tu choisis le passage (début),
// la durée, la vitesse (ralenti, accéléré), tu peux la couper en
// plusieurs morceaux, et elle reçoit transitions, effets et styles
// comme une photo. Le son des vidéos n'est pas gardé (la musique
// choisie reste la bande son).
// À l'export, chaque image est prise au bon moment de la vidéo :
// le résultat reste parfaitement fluide.
// ============================================================
(function(){
'use strict';
if(typeof CR === 'undefined' || typeof AN === 'undefined') return;
const RV = { els: {}, base: {} };
window.RV = RV;

// ---------- Une vidéo : miniature et durée ----------
function rvElement(url){
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous';
  v.setAttribute('playsinline', ''); v.setAttribute('muted', '');
  v.src = url;
  return v;
}
function rvAttendre(v, ev, ms){ return new Promise(ok => { let fini = false; const f = () => { if(fini) return; fini = true; v.removeEventListener(ev, f); ok(); }; v.addEventListener(ev, f); setTimeout(f, ms || 4000); }); }
async function rvPret(v){
  if(v.readyState < 2) await rvAttendre(v, 'loadeddata', 8000);
  if(v.videoWidth){ v.width = v.videoWidth; v.height = v.videoHeight; }
  return v;
}
window.rvNouveau = async function(p){
  try {
    const v = rvElement(p.url); await rvPret(v);
    p.vdur = isFinite(v.duration) ? v.duration : 0;
    const t = Math.min(0.6, Math.max(0, p.vdur / 3));
    v.currentTime = t; await rvAttendre(v, 'seeked', 3000);
    const k = 220 / Math.max(v.videoWidth || 1, v.videoHeight || 1), c = document.createElement('canvas');
    c.width = Math.max(1, Math.round((v.videoWidth || 220) * k)); c.height = Math.max(1, Math.round((v.videoHeight || 220) * k));
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    p.thumb = c.toDataURL('image/jpeg', 0.7);
    v.removeAttribute('src'); v.load();
  } catch(e){ console.warn('rush', e); p.thumb = p.thumb || ''; }
  // On rafraîchit les miniatures affichées
  document.querySelectorAll('img').forEach(im => { if(im.getAttribute('data-rv') === p.k) im.src = p.thumb; });
  if(CR.vue === 'photos') crRender();
  else if(typeof mtMaj === 'function' && document.getElementById('mtZone')) mtMaj();
};
// L'image "de base" d'une vidéo (pour les modèles sans table de montage, et la couverture)
window.rvImage = async function(p){
  if(RV.base[p.k]) return RV.base[p.k];
  const v = rvElement(p.url); await rvPret(v);
  if(!p.vdur && isFinite(v.duration)) p.vdur = v.duration;
  v.rvK = p.k; RV.base[p.k] = v;
  return v;
};

// ---------- Quel moment de la vidéo pour un plan ----------
window.rvVinAuto = function(sg){
  const p = CR.photos[sg.i] || {}, dur = p.vdur || 0, d = (sg.t1 - sg.t0) * (sg.vit || 1);
  return Math.round(Math.max(0, Math.min(dur - d, dur * 0.15)) * 100) / 100;
};
function rvCible(sg, tt){
  const p = CR.photos[sg.i] || {}, dur = p.vdur || 0;
  const vin = sg.vin != null ? sg.vin : rvVinAuto(sg);
  const x = vin + Math.max(0, tt - sg.t0) * (sg.vit || 1);
  return Math.max(0, Math.min(Math.max(0, dur - 0.04), x));
}
function rvCle(sg){ return sg.k + '@' + sg.n; }
function rvPourSeg(sg){
  const p = CR.photos[sg.i]; if(!p || !p.video) return null;
  const c = rvCle(sg);
  let v = RV.els[c];
  if(!v || v.rvUrl !== p.url){ v = rvElement(p.url); v.rvUrl = p.url; RV.els[c] = v; v.addEventListener('loadeddata', () => { v.width = v.videoWidth; v.height = v.videoHeight; if(!AN.lecture) anApercuUneFois(); }); v.addEventListener('seeked', () => { if(!AN.lecture && !RV.export) anApercuUneFois(); }); }
  return v;
}
// Appelé par la table de montage au moment de dessiner un plan
window.rvPour = function(sg, img, tt){
  const v = rvPourSeg(sg); if(!v) return img;
  if(v.readyState >= 2 && v.videoWidth){ if(!v.width){ v.width = v.videoWidth; v.height = v.videoHeight; } return v; }
  return img;
};
function rvVisibles(t, plan){ return (plan && plan.segs || []).filter(sg => (CR.photos[sg.i] || {}).video && t >= sg.t0 - 1.2 && t <= sg.t1 + 1.2); }
function rvSeek(v, x){ return new Promise(ok => { if(Math.abs((v.currentTime || 0) - x) < 0.002 && v.readyState >= 2){ ok(); return; } let fini = false; const f = () => { if(fini) return; fini = true; v.removeEventListener('seeked', f); ok(); }; v.addEventListener('seeked', f); setTimeout(f, 3000); v.currentTime = x; }); }
// Export : chaque vidéo visible est placée exactement au bon moment avant de dessiner l'image
window.rvPreparer = async function(t, plan){
  if(!plan || !plan.mt){
    // Modèles sans table de montage : la vidéo tourne en boucle
    const tous = CR.photos.filter(p => p.video && RV.base[p.k]);
    for(const p of tous){ const v = RV.base[p.k]; v.pause(); await rvSeek(v, (p.vdur || 1) > 0.1 ? t % Math.max(0.1, p.vdur - 0.05) : 0); }
    return;
  }
  const L = rvVisibles(Math.min(t, plan.Dp), plan); if(!L.length) return;
  RV.export = true;
  try {
    for(const sg of L){
      const v = rvPourSeg(sg); if(v.readyState < 2) await rvPret(v);
      if(!v.paused) v.pause();
      await rvSeek(v, rvCible(sg, Math.min(t, plan.Dp)));
    }
  } finally { RV.export = false; }
};
// Aperçu : les vidéos visibles jouent (ou se placent) en même temps que la lecture
function rvSync(){
  const plan = AN.plan; if(!plan || !plan.segs) return;
  const t = Math.min(AN.t, plan.Dp);
  if(!plan.mt){
    CR.photos.forEach(p => { const v = RV.base[p.k]; if(!v) return; const x = (p.vdur || 1) > 0.1 ? t % Math.max(0.1, p.vdur - 0.05) : 0;
      if(AN.lecture){ if(v.paused){ v.currentTime = x; v.play().catch(() => {}); } }
      else { v.pause(); if(Math.abs(v.currentTime - x) > 0.04) v.currentTime = x; } });
    return;
  }
  const vis = new Set(rvVisibles(t, plan).map(rvCle));
  Object.keys(RV.els).forEach(c => { if(!vis.has(c)){ const v = RV.els[c]; if(!v.paused) v.pause(); } });
  rvVisibles(t, plan).forEach(sg => {
    const v = rvPourSeg(sg), x = rvCible(sg, t), actif = t >= sg.t0 - 0.6 && t <= sg.t1 + 0.6;
    if(AN.lecture && actif){
      v.playbackRate = sg.vit || 1;
      if(v.paused){ if(Math.abs(v.currentTime - x) > 0.05) v.currentTime = x; v.play().catch(() => {}); }
      else if(Math.abs(v.currentTime - x) > 0.3) v.currentTime = x;
    } else {
      if(!v.paused) v.pause();
      if(Math.abs(v.currentTime - x) > 0.04 && !v.seeking) v.currentTime = x;
    }
  });
}
const apercuRv = anApercuUneFois;
anApercuUneFois = function(){ try { if(!RV.export) rvSync(); } catch(e){} return apercuRv.apply(this, arguments); };
const stopRv = anStop;
anStop = function(){ const r = stopRv.apply(this, arguments); Object.values(RV.els).concat(Object.values(RV.base)).forEach(v => { try { v.pause(); } catch(e){} }); return r; };

// ---------- Réglages d'un plan vidéo (dans la table de montage) ----------
window.rvPanneau = function(sg, d){
  const p = CR.photos[sg.i] || {}, dur = p.vdur || 0, vin = sg.vin != null ? sg.vin : rvVinAuto(sg), vit = sg.vit || 1;
  const fin = Math.min(dur, vin + d * vit);
  return `<div class="rv-pan"><div class="rv-t">${agIcon('play', 11)} Rush vidéo · ${dur ? (Math.round(dur * 10) / 10).toFixed(1).replace('.', ',') + ' s' : '...'}</div>
    <div class="rv-barre"><i style="left:${dur ? vin / dur * 100 : 0}%;width:${dur ? Math.max(1, (fin - vin) / dur * 100) : 0}%"></i></div>
    <label>Passage utilisé : de <b id="rvVinTxt">${vin.toFixed(1).replace('.', ',')} s</b> à <b id="rvFinTxt">${fin.toFixed(1).replace('.', ',')} s</b></label>
    <input type="range" min="0" max="${Math.max(0, dur - 0.2).toFixed(2)}" step="0.05" value="${vin}" oninput="rvVin(this.value)" onchange="mtMaj()">
    <label>Vitesse</label><div class="ag-pills mt-pills">${[[0.25, 'Très ralenti'], [0.5, 'Ralenti'], [0.75, '0,75x'], [1, 'Normale'], [1.5, '1,5x'], [2, 'Accéléré 2x']].map(([k, l]) => `<button type="button" class="${vit === k ? 'on' : ''}" onclick="rvVit(${k})">${l}</button>`).join('')}</div>
    <div class="mt-act"><button type="button" onclick="rvToutLeRush()">Prendre tout le rush</button></div>
    <div class="ag-hint">Pour garder plusieurs moments d'un même rush : « Couper ici », puis change le passage de chaque morceau.</div></div>`;
};
window.rvVin = function(v){
  const n = MT.sel && MT.sel.n; if(n == null) return;
  if(!MT.rvGlisse){ mtAvantPublic(); MT.rvGlisse = true; }
  const c = anVid().clips[n]; c.vin = Number(v);
  const el = document.getElementById('rvVinTxt'); if(el) el.textContent = Number(v).toFixed(1).replace('.', ',') + ' s';
  const sg = anPlan().segs[n]; AN.plan = anPlan(); AN.t = sg.t0 + 0.02; anApercuUneFois();
  clearTimeout(rvVin.t); rvVin.t = setTimeout(() => { MT.rvGlisse = false; }, 800);
};
window.rvVit = function(k){ mtAvantPublic(); anVid().clips[MT.sel.n].vit = k; mtMaj(); };
window.rvToutLeRush = function(){
  mtAvantPublic(); const sg = anPlan().segs[MT.sel.n], c = anVid().clips[MT.sel.n], p = CR.photos[sg.i] || {};
  c.vin = 0; c.d = Math.max(0.3, Math.round((p.vdur || 2) / (c.vit || 1) * 100) / 100); mtMaj();
};

// ---------- Choix des fichiers : photos ET vidéos pour les modèles vidéo ----------
const vuePhotosRv = crVuePhotos;
crVuePhotos = function(){
  let h = vuePhotosRv.apply(this, arguments);
  if(typeof anEst === 'function' && anEst(CR.modele)){
    h = h.replace('accept="image/*"', 'accept="image/*,video/*"');
  }
  return h;
};
const srcRv = crSrcHtml;
crSrcHtml = function(){
  const h = srcRv.apply(this, arguments);
  if(CR.src === 'tel' && typeof anEst === 'function' && anEst(CR.modele)) return h.replace('<b>Choisir des photos</b>', '<b>Choisir des photos ou des vidéos (rushs)</b>');
  return h;
};
// Les miniatures des vidéos dans la liste des choisies : leur image + un petit ▶
const renderRv = crRender;
crRender = async function(){
  const r = await renderRv.apply(this, arguments);
  if(CR.vue === 'photos'){
    document.querySelectorAll('.cr-ch').forEach((el, i) => { const p = CR.photos[i]; if(p && p.video){ el.classList.add('rv-ch'); const im = el.querySelector('img'); if(im){ im.setAttribute('data-rv', p.k); if(p.thumb) im.src = p.thumb; } } });
  }
  return r;
};

(function rvCss(){
  if(document.getElementById('rvCss')) return;
  const st = document.createElement('style'); st.id = 'rvCss';
  st.textContent = `
.rv-pan{margin-top:10px;padding:10px;border-radius:12px;background:var(--card);border:1px solid color-mix(in srgb,var(--accent) 35%,transparent)}
.rv-t{display:flex;align-items:center;gap:5px;font-size:12.5px;font-weight:700;color:var(--text);margin-bottom:6px}
.rv-barre{position:relative;height:10px;border-radius:6px;background:var(--card2);overflow:hidden}
.rv-barre i{position:absolute;top:0;bottom:0;background:var(--accent);border-radius:6px}
.rv-ch::after{content:'▶';position:absolute;right:3px;bottom:3px;font-size:9px;width:16px;height:16px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;display:flex;align-items:center;justify-content:center}`;
  document.head.appendChild(st);
})();
})();
