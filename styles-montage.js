// ============================================================
// STYLES-MONTAGE.JS - Montage automatique par style (Créations)
// ------------------------------------------------------------
// Tu choisis un style (Mariage élégant, TikTok énergique, Rétro
// film...) : l'app écoute la musique (tempo, temps forts, début des
// mesures, passages calmes ou forts) puis pose toute seule les
// coupes sur le rythme, les mouvements, les transitions et les effets.
// Tout se retouche ensuite dans la table de montage (montage.js).
// Gratuit : aucune IA, tout est calculé sur le téléphone.
// ============================================================
(function(){
'use strict';
if(typeof AN === 'undefined' || typeof mtEstSeq !== 'function') return;

// temps = nombre de temps (battements) par photo ; secs = durée par photo sans musique
const MTS_STYLES = [
  { id: 'mariage', nom: 'Mariage élégant', desc: 'Lent, doux, lumineux', fond: 'linear-gradient(135deg,#f3e3c3,#c9a46b)',
    temps: 4, secs: 3, intro: true, energie: false, force: 0.8,
    mvts: ['kb', 'zoomin', 'droite', 'dolly', 'zoomout', 'gauche', 'flottant'], trs: ['fondu', 'flouT', 'fondu', 'blanc'], accent: ['fuite'], tous: 4, trD: 0.9,
    effets: { filtre: 'dore', lumiere: 0.3, vignette: 0.25, grain: 0.1 } },
  { id: 'cinema', nom: 'Cinéma doux', desc: 'Lent, contrasté, fondus au noir', fond: 'linear-gradient(135deg,#1d2b33,#5d6f6a)',
    temps: 4, secs: 3.2, intro: true, energie: false, force: 0.9,
    mvts: ['dolly', 'gauche', 'droite', 'kb', 'haut'], trs: ['fondu', 'noir', 'flouT'], accent: ['noir'], tous: 3, trD: 1,
    effets: { filtre: 'cinema', vignette: 0.5, grain: 0.3 } },
  { id: 'tiktok', nom: 'TikTok énergique', desc: 'Une coupe par temps, punch', fond: 'linear-gradient(135deg,#ff2e63,#08d9d6)',
    temps: 1, secs: 0.6, intro: false, energie: true, force: 1.4,
    mvts: ['punch', 'battement', 'zoomout', 'punch', 'tremble', 'dolly'], trs: ['coupe'], accent: ['fouet', 'flash', 'glitch', 'zoomIn'], tous: 4, trD: 0.3,
    effets: { filtre: 'vif', grain: 0.15 } },
  { id: 'clip', nom: 'Clip musical', desc: 'Suit l\'énergie : vite sur les refrains', fond: 'linear-gradient(135deg,#3a0ca3,#f72585)',
    temps: 2, secs: 1, intro: true, energie: true, force: 1.2,
    mvts: ['battement', 'zoomin', 'punch', 'gauche', 'tremble', 'droite'], trs: ['coupe', 'coupe', 'fondu'], accent: ['flash', 'fouet', 'zoomIn', 'fuite'], tous: 4, trD: 0.35,
    effets: { filtre: 'contraste', lumiere: 0.25, grain: 0.15 } },
  { id: 'anniv', nom: 'Anniversaire fun', desc: 'Coloré, ça bouge, ça tourne', fond: 'linear-gradient(135deg,#ffbe0b,#fb5607,#ff006e)',
    temps: 2, secs: 1.5, intro: false, energie: true, force: 1.2,
    mvts: ['rotation', 'punch', 'flottant', 'zoomin', 'battement'], trs: ['pousseG', 'cercle', 'glisseH', 'zoomIn', 'tourne', 'cases'], accent: ['flash'], tous: 5, trD: 0.5,
    effets: { filtre: 'vif', lumiere: 0.35 } },
  { id: 'editorial', nom: 'Éditorial mode', desc: 'Net, graphique, coupes franches', fond: 'linear-gradient(135deg,#111,#777)',
    temps: 2, secs: 1.6, intro: false, energie: false, force: 1,
    mvts: ['aucun', 'gauche', 'droite', 'aucun', 'zoomin'], trs: ['coupe', 'rideauV', 'split', 'barres', 'coupe'], accent: ['blanc'], tous: 6, trD: 0.4,
    effets: { filtre: 'noirfort', grain: 0.2 } },
  { id: 'retro', nom: 'Rétro film', desc: 'Pellicule, poussières, chaleur', fond: 'linear-gradient(135deg,#6b3e26,#e3a857)',
    temps: 4, secs: 2.4, intro: true, energie: false, force: 1,
    mvts: ['tremble', 'kb', 'zoomin', 'tremble', 'gauche'], trs: ['pellicule', 'fondu', 'noir', 'fuite'], accent: ['pellicule'], tous: 3, trD: 0.8,
    effets: { filtre: 'vintage', grain: 0.5, poussiere: 0.45, brulure: 0.3, vignette: 0.35 } },
  { id: 'portrait', nom: 'Portrait studio', desc: 'Calme, propre, la personne au centre', fond: 'linear-gradient(135deg,#2d3142,#bfc0c0)',
    temps: 4, secs: 2.8, intro: true, energie: false, force: 0.7,
    mvts: ['flottant', 'zoomin', 'kb', 'zoomout'], trs: ['fondu', 'blanc', 'flouT'], accent: ['fondu'], tous: 4, trD: 0.8,
    effets: { filtre: 'aucun', lumiere: 0.2, vignette: 0.2 } },
  { id: 'statut', nom: 'Statut rapide', desc: 'Court et efficace pour WhatsApp', fond: 'linear-gradient(135deg,#25d366,#128c7e)',
    temps: 2, secs: 1.2, intro: false, energie: false, force: 1.1,
    mvts: ['zoomin', 'punch', 'zoomout', 'gauche'], trs: ['pousseG', 'coupe', 'zoomIn'], accent: ['flash'], tous: 4, trD: 0.4,
    effets: { filtre: 'contraste' } },
  { id: 'minimal', nom: 'Minimal', desc: 'Sobre, sans effet', fond: 'linear-gradient(135deg,#f5f5f5,#d6d6d6)',
    temps: 4, secs: 2.5, intro: false, energie: false, force: 0.6,
    mvts: ['zoomin', 'aucun', 'zoomout'], trs: ['fondu', 'coupe'], accent: ['fondu'], tous: 4, trD: 0.6,
    effets: { filtre: 'aucun' } }
];
window.MTS_STYLES = MTS_STYLES;

// ---------- Écoute de la musique : tempo, grille des temps, mesures, énergie ----------
let mtsCache = null;
function mtsAnalyse(){
  const V = anVid(), b = AN.buffer; if(!b) return null;
  const cle = b.length + ':' + V.debut;
  if(mtsCache && mtsCache.cle === cle) return mtsCache;
  const sr = b.sampleRate, d0 = Math.floor(V.debut * sr), d1 = Math.min(b.length, d0 + Math.floor(180 * sr));
  const ch = b.getChannelData(0), ch2 = b.numberOfChannels > 1 ? b.getChannelData(1) : null;
  const pas = Math.floor(sr / 100), env = [];
  for(let i = d0; i < d1; i += pas){ let e = 0; for(let j = i; j < Math.min(i + pas, d1); j += 2){ const v = ch2 ? (ch[j] + ch2[j]) / 2 : ch[j]; e += v * v; } env.push(Math.sqrt(e / (pas / 2))); }
  // Force des attaques (montée d'énergie), lissée
  const on = env.map((v, i) => Math.max(0, v - (env[i - 1] || 0)));
  const moy = on.reduce((a, x) => a + x, 0) / Math.max(1, on.length) || 1e-6;
  const o = on.map(x => x / moy);
  // Tempo : la période qui se répète le plus (60 à 180 BPM), avec une préférence autour de 120
  let best = 0, lagB = 50;
  for(let lag = 33; lag <= 100; lag++){
    let s = 0; for(let i = 0; i + lag < o.length; i++) s += o[i] * o[i + lag];
    s /= Math.max(1, o.length - lag);
    const bpm = 6000 / lag, pref = Math.exp(-Math.pow(Math.log2(bpm / 120), 2) / 0.5);
    s *= 0.7 + 0.3 * pref;
    if(s > best){ best = s; lagB = lag; }
  }
  const P = lagB;
  // Phase : où tombent les temps
  let phase = 0, bestP = -1;
  for(let ph = 0; ph < P; ph++){ let s = 0; for(let t = ph; t < o.length; t += P) s += (o[Math.round(t)] || 0) + 0.5 * ((o[Math.round(t) - 1] || 0) + (o[Math.round(t) + 1] || 0)); if(s > bestP){ bestP = s; phase = ph; } }
  const grille = []; for(let t = phase; t < o.length; t += P) grille.push(t / 100);
  // Début de mesure (4 temps) : la position la plus forte des 4
  let mes = 0, bestM = -1;
  for(let m = 0; m < 4; m++){ let s = 0; for(let i = m; i < grille.length; i += 4) s += o[Math.round(grille[i] * 100)] || 0; if(s > bestM){ bestM = s; mes = m; } }
  // Énergie autour de chaque temps (0 à 1)
  const en = grille.map(t => { const a = Math.round(t * 100), z = Math.min(env.length, a + Math.round(P)); let s = 0; for(let i = a; i < z; i++) s += env[i]; return s / Math.max(1, z - a); });
  const tri = en.slice().sort((x, y) => x - y), bas = tri[Math.floor(tri.length * 0.2)] || 0, haut = tri[Math.floor(tri.length * 0.85)] || 1;
  const energie = en.map(x => Math.max(0, Math.min(1, (x - bas) / Math.max(1e-6, haut - bas))));
  mtsCache = { cle, bpm: Math.round(6000 / P), periode: P / 100, grille, mesure: mes, energie, duree: (d1 - d0) / sr };
  return mtsCache;
}
window.mtsAnalyse = mtsAnalyse;

// ---------- Fabrication du montage ----------
function mtsHasard(graine){ let s = graine * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
function mtsMelange(a, r){ a = a.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
window.mtsAppliquer = function(id, silencieux){
  const st = MTS_STYLES.find(x => x.id === id); if(!st) return;
  const M = anModele(CR.modele); if(!M || !mtEstSeq(M.k) || !CR.photos.length) return;
  if(!silencieux && typeof MT !== 'undefined'){ MT.undo.push({ clips: JSON.parse(JSON.stringify(anVid().clips || null)), photos: CR.photos.slice(), crop: CR.crop.map(c => Object.assign({}, c)) }); MT.redo = []; }
  const V = anVid(); V.style = id; V.styleGraine = V.styleGraine || 1;
  const r = mtsHasard(V.styleGraine + id.length * 17);
  const mult = V.rythme === 'lent' ? 2 : V.rythme === 'rapide' ? 0.5 : 1;
  const A = AN.buffer ? mtsAnalyse() : null;
  const finD = anFinD();
  // Les photos dans l'ordre ; "toute la musique" : on les répète pour tout remplir
  const maxD = A ? Math.min(180, A.duree) - finD : 180;
  const ks = CR.photos.map(p => p.k);
  const durees = [];
  if(A && A.grille.length > 2){
    const g = A.grille, per = A.periode;
    // Position en temps (peut être un demi-temps) -> secondes
    const aT = x => { const f = Math.floor(x); return f < g.length ? g[f] + (x - f) * per : g[g.length - 1] + (x - g.length + 1) * per; };
    let i = A.mesure;                       // on commence sur un début de mesure
    let t = 0, n = 0;
    const tempsPour = (k) => {
      let T = Math.max(1, Math.round(st.temps * mult));
      if(st.energie){
        const e = A.energie[Math.min(A.energie.length - 1, Math.floor(i))] || 0.5;
        if(e > 0.7) T = T >= 2 ? Math.round(T / 2) : (e > 0.85 ? 0.5 : 1);   // refrain : plus vite (jusqu'au demi-temps)
        else if(e < 0.3) T = T * 2;                                           // passage calme : plus lent
      }
      if(st.intro && k === 0) T *= 2;
      return T;
    };
    while(true){
      const T = tempsPour(n);
      const j = i + T, fin = aT(j);
      const d = fin - t; if(d < 0.2){ i = j; continue; }
      if(t + d > maxD + 0.01) break;
      durees.push(d); t = fin; i = j; n++;
      if(V.remplir !== true && n >= ks.length) break;
      if(n > 500) break;
    }
    // Dernière photo : on la laisse respirer jusqu'à la fin de la mesure suivante
    if(durees.length > 1 && V.remplir !== true){ const T = Math.max(1, Math.round(st.temps * mult)); const fin = aT(i + T); if(fin - t + durees[durees.length - 1] <= maxD) durees[durees.length - 1] += fin - t; }
  } else {
    // Sans musique : des durées régulières (un peu plus long au début et à la fin)
    const nb = V.remplir === true ? Math.max(ks.length, Math.floor(Math.max(4, V.duree - finD) / (st.secs * mult))) : ks.length;
    for(let n = 0; n < nb; n++) durees.push(st.secs * mult * (st.intro && n === 0 ? 1.6 : 1) * (n === nb - 1 && nb > 1 ? 1.5 : 1));
  }
  if(!durees.length) durees.push(Math.max(1, st.secs));
  // Ordre : on garde ton ordre ; en mode "remplir", les tours suivants sont mélangés
  let ordre = ks.slice();
  while(ordre.length < durees.length) ordre = ordre.concat(mtsMelange(ks, r));
  const mvts = mtsMelange(st.mvts, r), trs = st.trs;
  V.clips = durees.map((d, n) => {
    const accent = st.tous && n % st.tous === st.tous - 1;
    const tr = accent ? st.accent[Math.floor(r() * st.accent.length)] : trs[Math.floor(r() * trs.length)];
    return { k: ordre[n], d: Math.round(d * 1000) / 1000, mvt: mvts[n % mvts.length], tr, trD: tr === 'coupe' ? 0 : st.trD };
  });
  V.force = st.force;
  // Effets du style (les anciens sont remis à zéro)
  const e = CR.cfg.effets || (CR.cfg.effets = {});
  ['grain', 'vignette', 'lumiere', 'poussiere', 'brulure'].forEach(k => { e[k] = 0; });
  Object.assign(e, st.effets);
  V.styleSig = JSON.stringify(V.clips);
  if(typeof MT !== 'undefined') MT.sel = null;
  if(V.musique) anCalculerBeats();
  if(!silencieux){
    const plan = anPlan();
    agToast(`${st.nom} : ${plan.segs.length} plans${A ? ', calés sur la musique (' + A.bpm + ' BPM)' : ''}`);
    AN.t = 0;
  }
  crRender();
};
// Le style est-il encore tel qu'il a été posé (rien retouché à la main) ?
function mtsIntact(){ const V = anVid(); return !!(V.style && V.clips && V.styleSig === JSON.stringify(V.clips)); }
window.mtsAutreVersion = function(){ const V = anVid(); V.styleGraine = (V.styleGraine || 1) + 1; mtsAppliquer(V.style || 'mariage'); };
window.mtsRythme = function(v){ anVid().rythme = v; if(anVid().style) mtsAppliquer(anVid().style); else crRender(); };
window.mtsRemplir = function(v){ anVid().remplir = v === 'tout'; if(anVid().style) mtsAppliquer(anVid().style); else crRender(); };

// ---------- Interface ----------
function mtsHtml(){
  const V = anVid(), A = AN.buffer ? mtsAnalyse() : null;
  const pills = (list, val, fn) => `<div class="ag-pills mt-pills">${list.map(([k, l]) => `<button type="button" class="${val === k ? 'on' : ''}" onclick="${fn}('${k}')">${crE(l)}</button>`).join('')}</div>`;
  return `<div class="mts-tete"><b>Montage automatique</b><span>${A ? `♫ ${A.bpm} BPM · coupes sur le rythme` : 'Ajoute une musique pour caler sur le rythme'}</span></div>
    <div class="mts-liste">${MTS_STYLES.map(s => `<button type="button" class="mts-c ${V.style === s.id ? 'on' : ''}" onclick="mtsAppliquer('${s.id}')"><span class="mts-f" style="background:${s.fond}"></span><b>${crE(s.nom)}</b><small>${crE(s.desc)}</small></button>`).join('')}</div>
    <div class="mts-opts">
      <div><label>Rythme</label>${pills([['lent', 'Lent'], ['normal', 'Normal'], ['rapide', 'Rapide']], V.rythme || 'normal', 'mtsRythme')}</div>
      <div><label>Durée</label>${pills([['photos', 'Chaque photo une fois'], ['tout', AN.buffer ? 'Toute la musique' : 'Toute la durée']], V.remplir ? 'tout' : 'photos', 'mtsRemplir')}</div>
    </div>
    ${V.style ? `<div class="mt-act"><button type="button" onclick="mtsAutreVersion()">🎲 Autre version</button>${mtsIntact() ? '' : '<span class="mts-retouche">retouché à la main</span>'}</div>` : ''}`;
}
window.mtsMaj = function(){ const z = document.getElementById('mtsZone'); if(z) z.innerHTML = mtsHtml(); };
const anVueEditS = anVueEdit;
anVueEdit = function(){
  let h = anVueEditS.apply(this, arguments);
  const M = anModele(CR.modele);
  if(M && mtEstSeq(M.k)){
    const i = h.indexOf('<div class="mt" id="mtZone">');
    if(i > 0) h = h.slice(0, i) + `<div class="mts" id="mtsZone">${mtsHtml()}</div>` + h.slice(i);
  }
  return h;
};
// Musique ajoutée ou passage changé : le style se recale tout seul (s'il n'a pas été retouché)
const choisirS = anChoisirMusique;
anChoisirMusique = async function(){
  const avantIntact = mtsIntact();
  const r = await choisirS.apply(this, arguments);
  const V = anVid();
  if(V.style && (avantIntact || !V.clips) && AN.buffer){ mtsCache = null; mtsAppliquer(V.style, true); agToast('Montage recalé sur la musique'); }
  return r;
};
const debutS = anDebut;
anDebut = function(v){
  const r = debutS.apply(this, arguments);
  const V = anVid();
  if(V.style && mtsIntact()){ clearTimeout(anDebut.t2); anDebut.t2 = setTimeout(() => { mtsCache = null; mtsAppliquer(V.style, true); }, 500); }
  return r;
};

(function mtsCss(){
  if(document.getElementById('mtsCss')) return;
  const st = document.createElement('style'); st.id = 'mtsCss';
  st.textContent = `
.mts{margin-top:12px;padding:10px;border-radius:16px;background:var(--card);border:1px solid var(--border)}
.mts-tete{display:flex;align-items:baseline;gap:8px;margin-bottom:8px}
.mts-tete b{color:var(--text);font-size:14px}.mts-tete span{flex:1;color:var(--muted);font-size:12px;text-align:right}
.mts-liste{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;scrollbar-width:thin}
.mts-c{flex:none;width:118px;margin:0;padding:0 0 8px;border-radius:12px;overflow:hidden;border:2px solid var(--border);background:var(--card2);text-align:left;cursor:pointer}
.mts-c.on{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 30%,transparent)}
.mts-f{display:block;height:38px}
.mts-c b{display:block;padding:6px 8px 0;font-size:12.5px;color:var(--text);line-height:1.2}
.mts-c small{display:block;padding:2px 8px 0;font-size:10.5px;color:var(--muted);line-height:1.25}
.mts-opts{display:grid;gap:4px;margin-top:6px}
.mts-opts label{display:block;margin:4px 0 4px;font-size:12px;color:var(--muted)}
.mts-retouche{align-self:center;font-size:11.5px;color:var(--muted)}`;
  document.head.appendChild(st);
})();
})();
