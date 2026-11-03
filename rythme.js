// ============================================================
// RYTHME.JS - Monter au rythme de la musique (Créations)
// ------------------------------------------------------------
// - "Couper sur" : chaque temps, tous les 2 temps, chaque mesure,
//   toutes les 2 mesures, les temps forts seulement, l'énergie de la
//   musique, ou TES repères.
// - Les points forts (refrain, drop) sont repérés et peuvent recevoir
//   un effet qui claque (flash + punch).
// - "Taper mes repères" : tu écoutes et tu tapes au moment où tu veux
//   une coupe (bouton ou barre d'espace) ; le montage se cale dessus.
// - Les temps, les points forts et tes repères se voient sur l'onde de
//   la musique et sur la table de montage.
// Tout reste modifiable ensuite dans la table de montage.
// ============================================================
(function(){
'use strict';
if(typeof AN === 'undefined' || typeof mtsAppliquer !== 'function') return;
const RT = { tap: false, taps: [] };
window.RT = RT;
const RT_COUPES = [['style', 'Comme le style'], ['1', 'Chaque temps'], ['2', 'Tous les 2 temps'], ['4', 'Chaque mesure'], ['8', 'Toutes les 2 mesures'], ['forts', 'Temps forts seulement'], ['energie', 'Suivre l\'énergie'], ['reperes', 'Mes repères']];

window.rtHtml = function(){
  const V = anVid(), A = AN.buffer && typeof mtsAnalyse === 'function' ? mtsAnalyse() : null, nR = (V.reperes || []).length;
  return `<div class="rt"><div class="rt-t">${agIcon('music', 14)} Rythme des coupes</div>
    <div class="ag-pills mt-pills">${RT_COUPES.map(([k, l]) => `<button type="button" class="${(V.coupe || 'style') === k ? 'on' : ''}" onclick="rtCoupe('${k}')">${l}${k === 'reperes' && nR ? ` (${nR})` : ''}</button>`).join('')}</div>
    ${A ? `<div class="ag-hint" style="margin:6px 0 0">${A.bpm} BPM · un temps = ${(A.periode).toFixed(2).replace('.', ',')} s · ${A.forts.length} point${A.forts.length > 1 ? 's' : ''} fort${A.forts.length > 1 ? 's' : ''} (refrain, drop)</div>` : '<div class="ag-hint" style="margin:6px 0 0">Ajoute une musique pour couper sur ses temps. Sans musique, tes repères marchent aussi.</div>'}
    <label class="ag-check"><input type="checkbox" ${V.accentsForts ? 'checked' : ''} onchange="rtAccents(this.checked)"> Effet sur les points forts (flash + punch au refrain, au drop)</label>
    <div class="mt-act"><button type="button" onclick="rtTaper()">${agIcon('edit', 13)} Taper mes repères${nR ? ' (refaire)' : ''}</button>${nR ? `<button type="button" onclick="rtEffacer()">Effacer mes repères</button>` : ''}</div></div>`;
};
function rtRefaire(){ const V = anVid(); mtsAppliquer(V.style || 'minimal', false); }
window.rtCoupe = function(k){
  const V = anVid();
  if(k === 'reperes' && !(V.reperes || []).length){ agToast('Tape d\'abord tes repères', 'info'); rtTaper(); return; }
  V.coupe = k === 'style' ? null : k;
  if(k !== 'style' && !V.style) V.style = 'minimal';
  rtRefaire();
};
window.rtAccents = function(on){ anVid().accentsForts = !!on; rtRefaire(); };
window.rtEffacer = function(){ const V = anVid(); V.reperes = []; if(V.coupe === 'reperes') V.coupe = null; rtRefaire(); };

// ---------- Taper les repères en écoutant ----------
window.rtTaper = function(){
  if(typeof anStop === 'function') anStop();
  RT.tap = true; RT.taps = []; AN.t = 0; if(typeof anApercuUneFois === 'function') anApercuUneFois();
  const old = document.getElementById('rtTap'); if(old) old.remove();
  const d = document.createElement('div'); d.id = 'rtTap'; d.className = 'rt-tap';
  d.innerHTML = `<div class="rt-tap-i"><b>Taper mes repères</b><span id="rtTapInfo">Lance la lecture, puis tape à chaque moment où tu veux changer de photo.</span></div>
    <div class="rt-tap-b"><button type="button" class="rt-lect" onclick="rtLecture()">${agIcon('play', 18)}</button>
    <button type="button" class="rt-big" onpointerdown="event.preventDefault();rtTap()">TAP</button>
    <button type="button" class="rt-ok" onclick="rtFin(true)">Garder</button><button type="button" class="rt-no" onclick="rtFin(false)">Annuler</button></div>`;
  document.body.appendChild(d);
};
window.rtLecture = function(){ anLecture(); const b = document.querySelector('#rtTap .rt-lect'); if(b) b.innerHTML = agIcon(AN.lecture ? 'pause' : 'play', 18); };
window.rtTap = function(){
  if(!RT.tap) return;
  if(!AN.lecture){ rtLecture(); return; }
  const t = Math.round(AN.t * 100) / 100;
  if(RT.taps.length && t - RT.taps[RT.taps.length - 1] < 0.2) return;
  RT.taps.push(t);
  const i = document.getElementById('rtTapInfo'); if(i) i.textContent = `${RT.taps.length} repère${RT.taps.length > 1 ? 's' : ''} · dernier à ${t.toFixed(1).replace('.', ',')} s`;
  const b = document.querySelector('#rtTap .rt-big'); if(b){ b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); }
  if(navigator.vibrate) navigator.vibrate(12);
};
window.rtFin = function(garder){
  if(AN.lecture) anStop();
  const d = document.getElementById('rtTap'); if(d) d.remove();
  RT.tap = false;
  if(garder && RT.taps.length){ const V = anVid(); V.reperes = RT.taps.slice(); V.coupe = 'reperes'; if(!V.style) V.style = 'minimal'; agToast(`${RT.taps.length} repère${RT.taps.length > 1 ? 's' : ''} gardé${RT.taps.length > 1 ? 's' : ''} : le montage se cale dessus`); rtRefaire(); }
};
document.addEventListener('keydown', e => { if(!RT.tap) return; if(e.key === ' ' || e.key === 't' || e.key === 'T'){ e.preventDefault(); e.stopPropagation(); rtTap(); } else if(e.key === 'Escape') rtFin(false); }, true);

// ---------- Marques sur l'onde de la musique ----------
if(typeof anDessinerOnde === 'function'){
  const ondeRt = anDessinerOnde;
  anDessinerOnde = function(){
    const r = ondeRt.apply(this, arguments);
    const cv = document.getElementById('anOnde'); if(!cv || !AN.buffer || typeof mtsAnalyse !== 'function') return r;
    const V = anVid(), b = AN.buffer, g = cv.getContext('2d'), W = cv.width, H = cv.height, A = mtsAnalyse();
    const x = t => (V.debut + t) / b.duration * W;
    g.save();
    if(A){ g.fillStyle = 'rgba(255,255,255,.35)'; A.grille.forEach((t, i) => { const X = x(t); if(X > W) return; const fort = (i - A.mesure) % 4 === 0; g.fillRect(X, fort ? 0 : H * 0.75, fort ? 1.5 : 1, fort ? H * 0.2 : H * 0.25); });
      g.fillStyle = '#f5a524'; A.forts.forEach(t => { const X = x(t); g.beginPath(); g.moveTo(X - 6, 0); g.lineTo(X + 6, 0); g.lineTo(X, 10); g.fill(); g.fillRect(X - 1, 0, 2, H); }); }
    g.fillStyle = '#ffffff'; (V.reperes || []).forEach(t => { const X = x(t); g.fillRect(X - 1, H * 0.3, 2, H * 0.4); });
    g.restore();
    return r;
  };
}
// ---------- Marques sur la table de montage ----------
window.rtMarques = function(){
  const piste = document.getElementById('mtPiste'); if(!piste) return;
  piste.querySelectorAll('.rt-m').forEach(x => x.remove());
  const plan = anPlan(); if(!plan || !plan.segs || !plan.segs.length) return;
  const A = AN.buffer && typeof mtsAnalyse === 'function' ? mtsAnalyse() : null, V = anVid();
  const pos = t => { const k = plan.segs.findIndex(sg => t >= sg.t0 && t < sg.t1); if(k < 0) return null; const el = piste.querySelector(`.mt-clip[data-n="${k}"]`); if(!el) return null; const sg = plan.segs[k]; return el.offsetLeft + el.offsetWidth * (t - sg.t0) / Math.max(0.01, sg.t1 - sg.t0); };
  const add = (t, cls) => { const X = pos(t); if(X == null) return; const i = document.createElement('i'); i.className = 'rt-m ' + cls; i.style.left = X + 'px'; piste.appendChild(i); };
  if(A){ A.grille.forEach((t, i) => { if(t < plan.Dp) add(t, (i - A.mesure) % 4 === 0 ? 'mes' : 'tps'); }); A.forts.forEach(t => { if(t < plan.Dp) add(t, 'fort'); }); }
  (V.reperes || []).forEach(t => { if(t < plan.Dp) add(t, 'rep'); });
};

(function rtCss(){
  if(document.getElementById('rtCss')) return;
  const st = document.createElement('style'); st.id = 'rtCss';
  st.textContent = `
.rt{margin-top:14px;padding-top:12px;border-top:1px solid var(--border)}
.rt-t{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:var(--text);margin-bottom:6px}.rt-t svg{color:var(--accent)}
.rt-tap{position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:9000;width:min(560px,calc(100% - 20px));padding:12px;border-radius:18px;background:var(--card);border:1px solid var(--accent);box-shadow:0 18px 50px rgba(0,0,0,.5)}
.rt-tap-i b{display:block;color:var(--text);font-size:14px}.rt-tap-i span{display:block;color:var(--muted);font-size:12.5px;margin:2px 0 10px}
.rt-tap-b{display:flex;align-items:center;gap:8px}
.rt-tap-b button{margin:0;border:0;cursor:pointer;border-radius:12px;font-weight:700}
.rt-lect{width:48px;height:48px;background:var(--card2);color:var(--text);display:flex;align-items:center;justify-content:center}
.rt-big{flex:1;height:64px;background:var(--accent);color:#fff;font-size:22px;letter-spacing:.1em;touch-action:manipulation;user-select:none}
.rt-big.pulse{animation:rtP .25s ease}@keyframes rtP{0%{transform:scale(.94)}100%{transform:scale(1)}}
.rt-ok{padding:0 14px;height:48px;background:var(--text);color:var(--bg)}.rt-no{padding:0 12px;height:48px;background:transparent;color:var(--muted)}
.mt-piste .rt-m{position:absolute;bottom:0;width:1px;pointer-events:none}
.rt-m.tps{height:6px;background:rgba(255,255,255,.35)}.rt-m.mes{height:12px;width:2px;background:rgba(255,255,255,.7)}
.rt-m.fort{top:0;width:2px;background:#f5a524;box-shadow:0 0 6px #f5a524}.rt-m.rep{top:0;width:2px;background:#fff}`;
  document.head.appendChild(st);
})();
})();
