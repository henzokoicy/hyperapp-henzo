// ============================================================
// VIDEO-PLUS.JS - Vidéos des Créations : textes animés, effets dans
// le temps, génériques de fin, couverture, préréglages, aide aux textes
// ------------------------------------------------------------
// - Textes animés : autant de textes que tu veux, chacun avec son
//   moment (de... à...), son animation (10), sa place, sa police.
// - Effets dans le temps : chaque effet a sa force, son début et sa fin
//   (avec fondu). 6 effets en plus : bandes cinéma, aberration de
//   couleurs, VHS, bokeh, confettis, flash sur le rythme.
// - Générique de fin : 5 modèles (simple, carte de profil, réseaux,
//   merci, logo) et sa durée.
// - Couverture : une image de la vidéo, une image importée ou
//   automatique ; à télécharger, ou à mettre en toute première image
//   (les réseaux l'affichent alors comme miniature).
// - Préréglages : tes réglages vidéo gardés et refaits en 1 clic.
// - Aide aux textes : correction de l'orthographe (gratuite) et idées
//   de textes par l'IA de l'app.
// ============================================================
(function(){
'use strict';
if(typeof AN === 'undefined' || typeof anImage !== 'function') return;
const VP = { idees: null, busy: '' };
window.VP = VP;
const E = s => crE(s);
const num = v => Number(String(v).replace(',', '.')) || 0;
const fmtS = t => (Math.round(t * 10) / 10).toFixed(1).replace('.', ',') + ' s';
function vpD(){ const p = AN.plan || anPlan(); return p.D; }
function vpMaj(){ AN.plan = anPlan(); anApercuUneFois(); }

// ============================================================
// 1. EFFETS DANS LE TEMPS
// ============================================================
const FX_LISTE = [
  ['lumiere', 'Lumières colorées'], ['grain', 'Grain de film'], ['vignette', 'Vignette (bords sombres)'], ['poussiere', 'Poussières de film'], ['brulure', 'Bords brûlés'],
  ['bandes', 'Bandes cinéma'], ['chroma', 'Aberration de couleurs'], ['vhs', 'Vieille cassette (VHS)'], ['bokeh', 'Bokeh (bulles de lumière)'], ['confettis', 'Confettis'], ['pulse', 'Flash sur le rythme']
];
function fxFacteur(p, t, D){
  if(!p) return 1;
  const de = p.de || 0, a = p.a == null ? D : p.a, f = 0.4;
  if(t < de - 0.001 || t > a + 0.001) return 0;
  return Math.max(0, Math.min(1, (t - de) / f + (de <= 0 ? 1 : 0), (a - t) / f + (a >= D - 0.01 ? 1 : 0)));
}
window.fxDansLeTemps = function(e, t){
  const P = e.plages; if(!P) return e;
  const D = vpD(), o = Object.assign({}, e);
  FX_LISTE.forEach(([k]) => { if(P[k] && o[k] > 0) o[k] = o[k] * fxFacteur(P[k], t, D); });
  if(P.perso && o.perso) o.persoOpac = (o.persoOpac == null ? 0.6 : o.persoOpac) * fxFacteur(P.perso, t, D);
  return o;
};
// Le filtre de couleur : celui du plan s'il en a un, sinon celui de la vidéo (pendant sa plage)
const crFiltreBase = crFiltre;
crFiltre = function(c){
  if(window.mtFiltrePlan) return (CR_FILTRES[window.mtFiltrePlan] || CR_FILTRES.aucun)[1];
  if(typeof anEst === 'function' && anEst(CR.modele) && AN.tCourant != null){
    const P = ((c && c.effets) || {}).plages;
    if(P && P.filtre && fxFacteur(P.filtre, AN.tCourant, vpD()) < 0.5) return '';
  }
  return crFiltreBase(c);
};
const FX_CV = {};
function fxToile(n, W, H){ let c = FX_CV[n]; if(!c) c = FX_CV[n] = document.createElement('canvas'); if(c.width !== W || c.height !== H){ c.width = W; c.height = H; } return c; }
function fxAlea(i, k){ const a = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return a - Math.floor(a); }
window.fxPlus = function(g, W, H, s, t, e){
  if(e.chroma > 0){
    const dx = Math.round(e.chroma * 12 * s); if(dx >= 1){
      const src = fxToile('src', W, H), r = fxToile('r', W, H), c = fxToile('c', W, H);
      src.getContext('2d').drawImage(g.canvas, 0, 0);
      const rr = r.getContext('2d'); rr.globalCompositeOperation = 'source-over'; rr.drawImage(src, 0, 0); rr.globalCompositeOperation = 'multiply'; rr.fillStyle = '#ff0000'; rr.fillRect(0, 0, W, H); rr.globalCompositeOperation = 'source-over';
      const cc = c.getContext('2d'); cc.globalCompositeOperation = 'source-over'; cc.drawImage(src, 0, 0); cc.globalCompositeOperation = 'multiply'; cc.fillStyle = '#00ffff'; cc.fillRect(0, 0, W, H); cc.globalCompositeOperation = 'source-over';
      g.save(); g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'lighter'; g.drawImage(r, dx, 0); g.drawImage(c, -dx, 0); g.restore();
    }
  }
  if(e.vhs > 0){
    const a = e.vhs; g.save();
    g.globalAlpha = 0.25 * a; g.fillStyle = '#000';
    const pas = Math.max(2, Math.round(3 * s)); for(let y = 0; y < H; y += pas * 2) g.fillRect(0, y, W, pas * 0.6);
    // Bande qui roule et petits décalages
    const yb = ((t * 0.18) % 1.2 - 0.1) * H, hb = H * 0.06;
    g.globalAlpha = 0.35 * a; g.drawImage(g.canvas, 0, yb, W, hb, 8 * s * a, yb, W, hb);
    g.globalAlpha = 0.12 * a; g.fillStyle = '#fff'; g.fillRect(0, yb, W, 2 * s);
    g.globalAlpha = 0.2 * a; g.globalCompositeOperation = 'overlay'; g.fillStyle = '#4a2b7a'; g.fillRect(0, 0, W, H);
    g.restore();
    // Date façon caméscope
    g.save(); g.globalAlpha = 0.85 * a; g.fillStyle = '#fff'; g.font = `600 ${Math.round(30 * s)}px "Courier New", monospace`; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 4 * s;
    g.fillText('▶ PLAY', 40 * s, 70 * s); g.restore();
  }
  if(e.bokeh > 0){
    g.save(); g.globalCompositeOperation = 'screen';
    for(let i = 0; i < 16; i++){
      const r = (30 + fxAlea(i, 1) * 90) * s, x = (fxAlea(i, 2) * 1.2 - 0.1) * W + Math.sin(t * 0.4 + i) * 40 * s, y = ((fxAlea(i, 3) - t * 0.02 * (0.5 + fxAlea(i, 4))) % 1 + 1) % 1 * H;
      const al = e.bokeh * (0.18 + 0.2 * fxAlea(i, 5)) * (0.7 + 0.3 * Math.sin(t * 1.5 + i * 2));
      const gr = g.createRadialGradient(x, y, 0, x, y, r); const coul = i % 3 === 0 ? '255,200,120' : i % 3 === 1 ? '255,150,180' : '180,220,255';
      gr.addColorStop(0, `rgba(${coul},${al})`); gr.addColorStop(0.7, `rgba(${coul},${al * 0.6})`); gr.addColorStop(1, `rgba(${coul},0)`);
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }
  if(e.confettis > 0){
    const cols = ['#ff006e', '#ffbe0b', '#3a86ff', '#8338ec', '#06d6a0', '#ffffff'];
    const nb = Math.round(30 + 70 * e.confettis);
    for(let i = 0; i < nb; i++){
      const vit = 0.08 + fxAlea(i, 1) * 0.12, y = ((fxAlea(i, 2) + t * vit) % 1) * (H + 60 * s) - 30 * s;
      const x = fxAlea(i, 3) * W + Math.sin(t * 2 + i) * 20 * s, rot = t * (2 + fxAlea(i, 4) * 4) + i, w = (8 + fxAlea(i, 5) * 10) * s, h = w * 0.5;
      g.save(); g.translate(x, y); g.rotate(rot); g.scale(1, Math.cos(t * 5 + i)); g.fillStyle = cols[i % cols.length]; g.globalAlpha = 0.9; g.fillRect(-w / 2, -h / 2, w, h); g.restore();
    }
  }
  if(e.pulse > 0 && AN.beats && AN.beats.length){
    let d = 9; for(const b of AN.beats){ if(b <= t) d = t - b; else break; }
    const a = e.pulse * 0.45 * Math.exp(-d * 9); if(a > 0.01){ g.save(); g.globalCompositeOperation = 'screen'; g.fillStyle = `rgba(255,255,255,${a})`; g.fillRect(0, 0, W, H); g.restore(); }
  }
  if(e.bandes > 0){ const h = H * 0.13 * e.bandes; g.fillStyle = '#000'; g.fillRect(0, 0, W, h); g.fillRect(0, H - h, W, h); }
};
function fxHtml(){
  const e = CR.cfg.effets || {}, P = e.plages || {}, D = vpD();
  const ligne = (k, nom) => {
    const v = e[k] || 0, p = P[k], de = p ? p.de || 0 : 0, a = p && p.a != null ? p.a : D;
    return `<div class="fx-l ${v > 0 ? 'on' : ''}"><div class="fx-t"><b>${E(nom)}</b><input type="range" min="0" max="1" step="0.05" value="${v}" oninput="fxForce('${k}',this.value)" onchange="fxRendu()"></div>
      ${v > 0 ? `<div class="fx-p"><span>De <b>${fmtS(de)}</b> à <b>${p && p.a != null ? fmtS(a) : 'la fin'}</b></span>
        <button type="button" onclick="fxIci('${k}','de')">Commence ici</button><button type="button" onclick="fxIci('${k}','a')">S'arrête ici</button>${p ? `<button type="button" onclick="fxToute('${k}')">Toute la vidéo</button>` : ''}</div>` : ''}</div>`;
  };
  const filtreP = P.filtre;
  return `<div class="ag-hint" style="margin-top:0">Règle la force de chaque effet, puis place la lecture où tu veux et touche « Commence ici » ou « S'arrête ici ». L'effet arrive et repart en douceur.</div>
    ${e.filtre && e.filtre !== 'aucun' ? `<div class="fx-l on"><div class="fx-t"><b>Couleur : ${E((CR_FILTRES[e.filtre] || ['', ''])[0])}</b></div><div class="fx-p"><span>De <b>${fmtS(filtreP ? filtreP.de || 0 : 0)}</b> à <b>${filtreP && filtreP.a != null ? fmtS(filtreP.a) : 'la fin'}</b></span><button type="button" onclick="fxIci('filtre','de')">Commence ici</button><button type="button" onclick="fxIci('filtre','a')">S'arrête ici</button>${filtreP ? `<button type="button" onclick="fxToute('filtre')">Toute la vidéo</button>` : ''}</div></div>` : ''}
    ${FX_LISTE.map(([k, n]) => ligne(k, n)).join('')}
    ${e.perso ? `<div class="fx-l on"><div class="fx-t"><b>Mon effet importé</b></div><div class="fx-p"><button type="button" onclick="fxIci('perso','de')">Commence ici</button><button type="button" onclick="fxIci('perso','a')">S'arrête ici</button><button type="button" onclick="fxToute('perso')">Toute la vidéo</button></div></div>` : ''}`;
}
window.fxForce = function(k, v){ const e = CR.cfg.effets || (CR.cfg.effets = {}); e[k] = num(v); anApercuUneFois(); };
window.fxRendu = function(){ const z = document.getElementById('fxZone'); if(z) z.innerHTML = fxHtml(); };
window.fxIci = function(k, bout){
  const e = CR.cfg.effets || (CR.cfg.effets = {}); const P = e.plages || (e.plages = {}); const D = vpD();
  const p = P[k] || (P[k] = { de: 0, a: null });
  const t = Math.round(AN.t * 10) / 10;
  if(bout === 'de'){ p.de = Math.min(t, (p.a == null ? D : p.a) - 0.2); }
  else { p.a = Math.max(t, (p.de || 0) + 0.2); if(p.a >= D - 0.05) p.a = null; }
  agToast(bout === 'de' ? 'Début placé à ' + fmtS(p.de) : 'Fin placée à ' + (p.a == null ? 'la fin' : fmtS(p.a)));
  fxRendu(); anApercuUneFois();
};
window.fxToute = function(k){ const P = (CR.cfg.effets || {}).plages; if(P) delete P[k]; fxRendu(); anApercuUneFois(); };

// ============================================================
// 2. TEXTES ANIMÉS
// ============================================================
const TX_ANIMS = [['fondu', 'Fondu'], ['monte', 'Monte'], ['machine', 'Machine à écrire'], ['mots', 'Mot par mot'], ['rebond', 'Rebond'], ['zoom', 'Zoom'], ['revele', 'Révélé'], ['neon', 'Néon'], ['glisse', 'Glisse'], ['espace', 'Lettres qui se resserrent']];
const TX_POS = [['haut', 'En haut'], ['centre', 'Au centre'], ['bas', 'En bas']];
const TX_POLICES = [['titre', 'Ma police (titre)'], ['texte', 'Ma police (texte)']].concat(typeof CR_POLICES_CREA !== 'undefined' ? Object.entries(CR_POLICES_CREA).filter(([k, x]) => x.f).map(([k, x]) => [k, x.nom]) : []);
function txListe(creer){ return CR.cfg.textes || (creer ? (CR.cfg.textes = []) : []); }
function txFam(x){
  const P = crPolices();
  if(x.police === 'texte') return { fam: P.x, poids: 600 };
  const pc = typeof CR_POLICES_CREA !== 'undefined' ? CR_POLICES_CREA[x.police] : null;
  if(pc && pc.f) return { fam: pc.f, poids: 400 };
  return { fam: P.t, poids: P.tw };
}
const txEase = u => 1 - Math.pow(1 - Math.max(0, Math.min(1, u)), 3);
const txRebond = u => { u = Math.max(0, Math.min(1, u)); return 1 + 2.2 * Math.pow(u - 1, 3) + 1.2 * Math.pow(u - 1, 2); };
window.txDessiner = function(g, W, H, s, t, plan){
  const L = CR.cfg.textes; if(!L || !L.length) return;
  L.forEach(x => {
    if(!x.txt || t < x.de || t > x.a) return;
    const lt = t - x.de, dur = Math.max(0.3, x.a - x.de), sortie = Math.max(0, Math.min(1, (x.a - t) / 0.35));
    const u = Math.min(1, lt / 0.6), f = txFam(x), px = 64 * s * (x.taille || 1);
    const mx = 70 * s, maxW = W - 2 * mx;
    const coul = x.couleur || '#ffffff';
    g.save(); g.font = crFont(f.fam, f.poids, px);
    const lignes = crLignes(g, x.maj ? x.txt.toUpperCase() : x.txt, maxW).slice(0, 4);
    const lh = px * 1.12, hT = lignes.length * lh;
    let y0 = x.pos === 'haut' ? H * 0.1 : x.pos === 'centre' ? (H - hT) / 2 : H * 0.8 - hT;
    let alpha = sortie, dx = 0, dy = 0, sc = 1, esp = 0, nbCar = Infinity, nbMots = Infinity, flou = 0, masque = 1;
    switch(x.anim){
      case 'monte': alpha *= txEase(u); dy = (1 - txEase(u)) * 40 * s; break;
      case 'machine': nbCar = Math.floor(lt * 22); break;
      case 'mots': nbMots = Math.floor(lt / 0.22) + 1; break;
      case 'rebond': sc = Math.max(0.01, txRebond(lt / 0.55)); break;
      case 'zoom': alpha *= txEase(u); sc = 1.35 - 0.35 * txEase(u); flou = (1 - txEase(u)) * 10 * s; break;
      case 'revele': masque = txEase(lt / 0.7); break;
      case 'neon': { const k = lt < 0.7 ? (Math.sin(lt * 60) > 0 ? 1 : 0.25) : 1; alpha *= k; break; }
      case 'glisse': alpha *= txEase(u); dx = -(1 - txEase(u)) * W * 0.25; break;
      case 'espace': alpha *= txEase(u); esp = (1 - txEase(u)) * 30 * s; break;
      default: alpha *= txEase(u);
    }
    if(alpha <= 0.01) { g.restore(); return; }
    g.globalAlpha = alpha;
    const cx = W / 2, cy = y0 + hT / 2;
    g.translate(cx + dx, cy + dy); g.scale(sc, sc); g.translate(-cx, -cy);
    if(flou > 0.3) g.filter = `blur(${flou.toFixed(1)}px)`;
    // Bandeau de couleur derrière
    if(x.fond){
      g.font = crFont(f.fam, f.poids, px);
      const larg = Math.min(maxW, Math.max(...lignes.map(l => g.measureText(l).width))) + px;
      g.fillStyle = x.fondCouleur || CR.cfg.accent || '#000'; crRond(g, (W - larg) / 2, y0 - px * 0.3, larg, hT + px * 0.45, px * 0.25); g.fill();
    }
    if(x.anim === 'revele'){ g.beginPath(); g.rect(0, y0 + hT * (1 - masque) - px * 0.3, W, hT + px); g.clip(); dy = 0; }
    if(x.anim === 'neon'){ g.shadowColor = coul; g.shadowBlur = 24 * s; }
    else if(!x.fond){ g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = px * 0.22; }
    g.fillStyle = coul; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.font = crFont(f.fam, f.poids, px);
    if(esp) g.letterSpacing = esp + 'px';
    let restC = nbCar, restM = nbMots;
    lignes.forEach((l, i) => {
      let txt = l;
      if(restC !== Infinity){ txt = l.slice(0, Math.max(0, restC)); restC -= l.length + 1; }
      if(restM !== Infinity){ const m = l.split(' '); txt = m.slice(0, Math.max(0, restM)).join(' '); restM -= m.length; }
      if(!txt) return;
      const yy = y0 + px + i * lh + (x.anim === 'revele' ? (1 - masque) * hT : 0);
      if(restM !== Infinity || restC !== Infinity){ const w = g.measureText(l).width; g.textAlign = 'left'; g.fillText(txt, cx - w / 2, yy); g.textAlign = 'center'; }
      else g.fillText(txt, cx, yy);
    });
    if(esp) g.letterSpacing = '0px';
    g.restore();
  });
};
function txHtml(){
  const L = txListe(), D = vpD();
  return `${L.map((x, i) => `<div class="tx-c">
      <div class="tx-h"><b>Texte ${i + 1}</b><span>${fmtS(x.de)} → ${fmtS(x.a)}</span><button type="button" class="st-link" onclick="txSuppr(${i})">Retirer</button></div>
      <textarea rows="2" oninput="txSet(${i},'txt',this.value)" placeholder="Écris ton texte">${E(x.txt || '')}</textarea>
      <label>Animation</label><div class="ag-pills mt-pills">${TX_ANIMS.map(([k, l]) => `<button type="button" class="${x.anim === k ? 'on' : ''}" onclick="txSet(${i},'anim','${k}',1)">${E(l)}</button>`).join('')}</div>
      <label>Place</label><div class="ag-pills mt-pills">${TX_POS.map(([k, l]) => `<button type="button" class="${x.pos === k ? 'on' : ''}" onclick="txSet(${i},'pos','${k}',1)">${E(l)}</button>`).join('')}</div>
      <label>Police</label><div class="ag-pills mt-pills">${TX_POLICES.map(([k, l]) => `<button type="button" class="${(x.police || 'titre') === k ? 'on' : ''}" onclick="txSet(${i},'police','${k}',1)">${E(l)}</button>`).join('')}</div>
      <div class="tx-row"><label>Taille</label><input type="range" min="0.5" max="2.2" step="0.05" value="${x.taille || 1}" oninput="txSet(${i},'taille',Number(this.value))">
        <input type="color" value="${E(x.couleur || '#ffffff')}" oninput="txSet(${i},'couleur',this.value)" title="Couleur du texte">
        <label class="ag-check"><input type="checkbox" ${x.fond ? 'checked' : ''} onchange="txSet(${i},'fond',this.checked)"> Bandeau</label>
        <label class="ag-check"><input type="checkbox" ${x.maj ? 'checked' : ''} onchange="txSet(${i},'maj',this.checked)"> MAJUSCULES</label></div>
      <div class="mt-act"><button type="button" onclick="txIci(${i},'de')">Apparaît ici</button><button type="button" onclick="txIci(${i},'a')">Disparaît ici</button><button type="button" onclick="txVoir(${i})">▶ Voir</button></div>
    </div>`).join('')}
    <div class="mt-act"><button type="button" class="on" onclick="txAjouter()">+ Ajouter un texte ici (${fmtS(Math.min(AN.t, D))})</button>
      <button type="button" onclick="vpCorriger()" ${VP.busy ? 'disabled' : ''}>${VP.busy === 'corr' ? 'Correction...' : '✓ Corriger l\'orthographe'}</button>
      <button type="button" onclick="vpIdees()" ${VP.busy ? 'disabled' : ''}>${VP.busy === 'idees' ? 'Recherche...' : '💡 Idées de textes'}</button></div>
    <div id="vpIdees">${vpIdeesHtml()}</div>`;
}
window.txRendu = function(){ const z = document.getElementById('txZone'); if(z) z.innerHTML = txHtml(); };
window.txAjouter = function(txt){
  const D = vpD(), de = Math.max(0, Math.min(AN.t, D - 1));
  txListe(true).push({ txt: typeof txt === 'string' ? txt : '', de: Math.round(de * 10) / 10, a: Math.round(Math.min(D, de + 2.5) * 10) / 10, anim: 'monte', pos: 'bas', police: 'titre', taille: 1, couleur: '#ffffff', fond: false });
  txRendu(); vpMaj();
  const ta = document.querySelectorAll('#txZone textarea'); if(ta.length && typeof txt !== 'string') ta[ta.length - 1].focus();
};
window.txSet = function(i, k, v, rendu){ const x = txListe()[i]; if(!x) return; x[k] = v; if(rendu) txRendu(); if(!AN.lecture){ if(AN.t < x.de || AN.t > x.a) AN.t = Math.min(x.a - 0.05, x.de + 0.8); anApercuUneFois(); } };
window.txSuppr = function(i){ txListe().splice(i, 1); txRendu(); anApercuUneFois(); };
window.txIci = function(i, bout){ const x = txListe()[i], t = Math.round(AN.t * 10) / 10; if(bout === 'de'){ x.de = t; if(x.a < t + 0.3) x.a = Math.round(Math.min(vpD(), t + 2.5) * 10) / 10; } else { x.a = Math.max(t, x.de + 0.3); } txRendu(); anApercuUneFois(); };
window.txVoir = function(i){ const x = txListe()[i]; anStop(); AN.t = Math.max(0, x.de - 0.2); anLecture(); const iv = setInterval(() => { if(!AN.lecture || AN.t > x.a + 0.3){ clearInterval(iv); if(AN.lecture) anStop(); } }, 60); };
// Les polices créatives des textes sont chargées avant la lecture
const prepBase = anPreparer;
anPreparer = async function(){
  const r = await prepBase.apply(this, arguments);
  const crea = (CR.cfg.textes || []).map(x => x.police).filter(k => CR_POLICES_CREA[k] && CR_POLICES_CREA[k].f);
  const fin = CR_POLICES_CREA[(CR.cfg.fin || {}).police] ? [(CR.cfg.fin || {}).police] : [];
  const tous = [...new Set(crea.concat(fin, ['pinceau']))];
  if(tous.length){ crPolicesCreaLien(); for(const k of tous){ try { await Promise.race([document.fonts.load(`400 80px "${CR_POLICES_CREA[k].f}"`), new Promise(ok => setTimeout(ok, 2000))]); } catch(e){} } }
  return r;
};

// ============================================================
// 3. AIDE AUX TEXTES : orthographe et idées
// ============================================================
// Tous les textes modifiables de la vidéo
function vpChamps(){
  const c = CR.cfg, out = [];
  ['titre', 'sous', 'mot', 'appel', 'contact'].forEach(k => { if(c[k]) out.push({ get: () => c[k], set: v => { c[k] = v; }, nom: k }); });
  const f = c.fin || {}; ['phrase', 'noms', 'reseaux'].forEach(k => { if(f[k]) out.push({ get: () => f[k], set: v => { f[k] = v; }, nom: 'fin ' + k }); });
  (c.textes || []).forEach((x, i) => { if(x.txt) out.push({ get: () => x.txt, set: v => { x.txt = v; }, nom: 'texte ' + (i + 1) }); });
  return out;
}
async function vpLanguageTool(txt){
  const body = new URLSearchParams({ text: txt, language: 'fr', enabledOnly: 'false' });
  const r = await Promise.race([fetch('https://api.languagetool.org/v2/check', { method: 'POST', body }), new Promise((_, ko) => setTimeout(() => ko(new Error('lent')), 9000))]);
  if(!r.ok) throw new Error('LanguageTool ' + r.status);
  const j = await r.json();
  let out = txt;
  (j.matches || []).filter(m => m.replacements && m.replacements.length && !/WHITESPACE|TYPOGRAPHY|UPPERCASE_SENTENCE/.test((m.rule || {}).id || '')).sort((a, b) => b.offset - a.offset)
    .forEach(m => { out = out.slice(0, m.offset) + m.replacements[0].value + out.slice(m.offset + m.length); });
  return out;
}
async function vpCorrigerIA(liste){
  const q = `Corrige UNIQUEMENT l'orthographe, la grammaire et les accents de ces textes en français, sans changer le style ni le sens, sans rien ajouter. Garde les retours à la ligne. Réponds UNIQUEMENT en JSON : {"textes":["...", "..."]} dans le même ordre.\n${JSON.stringify(liste)}`;
  const r = typeof stIA === 'function' ? await stIA(q, [], 900) : (await mkAI({ messages: [{ role: 'user', text: q }], maxTokens: 900 })).text;
  const j = mkJson(typeof r === 'string' ? r : r.text) || {};
  return Array.isArray(j.textes) && j.textes.length === liste.length ? j.textes.map(String) : liste;
}
window.vpCorriger = async function(){
  const ch = vpChamps(); if(!ch.length){ agToast('Aucun texte à corriger', 'info'); return; }
  VP.busy = 'corr'; txRendu();
  let corr;
  try { corr = []; for(const c of ch) corr.push(await vpLanguageTool(c.get())); }
  catch(e){ try { corr = await vpCorrigerIA(ch.map(c => c.get())); } catch(e2){ VP.busy = ''; txRendu(); agAlert('Correction impossible pour le moment : ' + (e2.message || e2)); return; } }
  VP.busy = '';
  const chg = ch.map((c, i) => ({ c, avant: c.get(), apres: corr[i] })).filter(x => x.apres && x.apres.trim() !== x.avant.trim());
  if(!chg.length){ txRendu(); agToast('Aucune faute trouvée'); return; }
  const liste = chg.slice(0, 8).map(x => `• ${x.avant.slice(0, 60)}\n  → ${x.apres.slice(0, 60)}`).join('\n');
  if(await agConfirm(`${chg.length} correction${chg.length > 1 ? 's' : ''} :\n\n${liste}\n\nAppliquer ?`, { ok: 'Appliquer', no: 'Laisser' })){ chg.forEach(x => x.c.set(x.apres)); agToast('Textes corrigés'); crRender(); }
  else txRendu();
};
window.vpIdees = async function(){
  VP.busy = 'idees'; txRendu();
  try {
    const st = anVid().style && typeof MTS_STYLES !== 'undefined' ? (MTS_STYLES.find(x => x.id === anVid().style) || {}).nom : '';
    const shoot = CR.shoot_id && typeof mkShoot === 'function' ? mkShoot(CR.shoot_id) : null;
    const q = `IDÉES DE TEXTES POUR UNE VIDÉO DE PHOTOS (${CR.photos.length} photos${st ? ', style ' + st : ''}${CR.occasion ? ', pour : ' + CR.occasion : ''}${shoot ? ', séance ' + (shoot.type || '') : ''}${CR.cfg.titre ? ', titre actuel : ' + CR.cfg.titre : ''}).
Propose des textes très courts, élégants, en lettres normales, sans tiret long, pour apparaître à l'écran.
Réponds UNIQUEMENT en JSON : {"titres":["3 titres de 2 à 5 mots"],"phrases":["5 phrases courtes à afficher pendant la vidéo, moins de 9 mots"],"fin":["2 phrases de fin, appel à réserver"]}`;
    const r = typeof stIA === 'function' ? await stIA(q, [], 900) : (await mkAI({ messages: [{ role: 'user', text: q }], maxTokens: 900 })).text;
    const j = mkJson(typeof r === 'string' ? r : r.text) || {};
    const net = v => (typeof stClean === 'function' ? stClean(v) : String(v || '')).trim();
    VP.idees = { titres: (j.titres || []).map(net).filter(Boolean), phrases: (j.phrases || []).map(net).filter(Boolean), fin: (j.fin || []).map(net).filter(Boolean) };
  } catch(e){ agAlert('Idées indisponibles : ' + (e.message || e)); }
  VP.busy = ''; txRendu();
};
function vpIdeesHtml(){
  const I = VP.idees; if(!I) return '';
  const bloc = (titre, list, fn) => list.length ? `<label>${titre}</label><div class="vp-idees">${list.map(x => `<button type="button" onclick="${fn}(this.dataset.v)" data-v="${E(x)}">${E(x)}</button>`).join('')}</div>` : '';
  return `<div class="vp-id">${bloc('Titres (touche pour l\'utiliser)', I.titres, 'vpIdeeTitre')}${bloc('Phrases (touche pour l\'ajouter ici)', I.phrases, 'txAjouter')}${bloc('Fin de vidéo', I.fin, 'vpIdeeFin')}<button type="button" class="st-link" onclick="VP.idees=null;txRendu()">Fermer les idées</button></div>`;
}
window.vpIdeeTitre = function(v){ CR.cfg.titre = v; agToast('Titre mis : ' + v); crRender(); };
window.vpIdeeFin = function(v){ const f = CR.cfg.fin || (CR.cfg.fin = {}); f.phrase = v; CR.cfg.appel = v; agToast('Phrase de fin mise'); crRender(); };

// ============================================================
// 4. GÉNÉRIQUE DE FIN
// ============================================================
const GF_MODELES = [['simple', 'Simple', 'Logo, appel, contact'], ['profil', 'Carte de profil', 'Photo ronde, nom, contacts, réseaux'], ['reseaux', 'Mes réseaux', 'Tes comptes qui arrivent un par un'], ['merci', 'Merci', 'Grand « Merci », les noms, la date'], ['logo', 'Logo lumineux', 'Ton logo qui s\'allume']];
function gfCfg(creer){ return CR.cfg.fin || (creer ? (CR.cfg.fin = {}) : {}); }
window.gfDessiner = function(g, W, H, s, t, plan, imgs, logo){
  const f = gfCfg(), mod = f.modele || 'simple'; if(mod === 'simple') return false;
  const c = CR.cfg, P = crPolices(), lt = t - (plan.Dp - 0.3), a = txEase(lt / 0.6);
  const fond = c.fond || '#000', coul = crLisible(fond), acc = c.accent || '#48A89A';
  const ap = d => txEase((lt - d) / 0.5);   // apparition décalée
  g.save(); g.globalAlpha = a; g.fillStyle = fond; g.fillRect(0, 0, W, H);
  const iPh = Math.max(0, CR.photos.findIndex(p => p.k === f.photoK));
  const ph = imgs[iPh] || imgs[0];
  const crea = CR_POLICES_CREA[f.police || 'pinceau'] || CR_POLICES_CREA.pinceau;
  const tx = (txt, y, o) => crTexte(g, txt, Object.assign({ x: 60 * s, maxW: W - 120 * s, couleur: coul, align: 'centre', maxL: 3, lh: 1.15, y }, o));
  const reseaux = String(f.reseaux || '').split('\n').map(x => x.trim()).filter(Boolean);
  if(mod === 'profil'){
    if(ph){ g.save(); g.globalAlpha = a * 0.35; g.filter = `blur(${Math.round(30 * s)}px)`; anCover(g, ph, 0, 0, W, H, 1.2, 0, 0); g.restore(); g.save(); g.globalAlpha = a * 0.55; g.fillStyle = fond; g.fillRect(0, 0, W, H); g.restore(); }
    const r = Math.min(W, H) * 0.19, cy = H * 0.3, k = 0.6 + 0.4 * txRebond(lt / 0.7);
    g.save(); g.translate(W / 2, cy); g.scale(k, k);
    g.beginPath(); g.arc(0, 0, r + 8 * s, 0, Math.PI * 2); g.fillStyle = acc; g.fill();
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.clip();
    if(ph) anCover(g, ph, -r, -r, 2 * r, 2 * r, 1.05, 0, 0); else if(logo){ g.fillStyle = '#fff'; g.fillRect(-r, -r, 2 * r, 2 * r); const lw = r * 1.4, lh = lw * logo.height / logo.width; g.drawImage(logo, -lw / 2, -lh / 2, lw, lh); }
    g.restore();
    let y = cy + r + 40 * s;
    g.globalAlpha = a * ap(0.25); y += tx(f.nom || crNom(), y, { fam: P.t, poids: P.tw, px: 58 * s, maxL: 2 }) + 12 * s;
    g.globalAlpha = a * ap(0.4); if(f.phrase || c.appel) y += tx(f.phrase || c.appel, y, { fam: P.x, poids: 600, px: 36 * s }) + 26 * s;
    g.globalAlpha = a * ap(0.55); if(c.contact) y += tx(c.contact, y, { fam: P.x, poids: 600, px: 32 * s }) + 16 * s;
    reseaux.forEach((l, i) => { g.globalAlpha = a * ap(0.7 + i * 0.15); y += tx(l, y, { fam: P.x, poids: 500, px: 30 * s, maxL: 1 }) + 8 * s; });
  } else if(mod === 'reseaux'){
    let y = H * 0.2;
    g.globalAlpha = a; y += tx(f.phrase || 'Suis-nous', y, { fam: crea.f || P.t, poids: crea.f ? 400 : P.tw, px: 90 * s, couleur: acc, maxL: 2, lh: 1 }) + 50 * s;
    const lignes = reseaux.length ? reseaux : [c.contact || crNom()];
    lignes.forEach((l, i) => {
      const u = ap(0.3 + i * 0.22); if(u <= 0) return;
      g.save(); g.globalAlpha = a * u; g.translate((1 - u) * -W * 0.3, 0);
      const h = 86 * s, w = W - 160 * s; g.fillStyle = 'rgba(255,255,255,.1)'; crRond(g, 80 * s, y, w, h, h / 2); g.fill();
      g.fillStyle = acc; g.beginPath(); g.arc(80 * s + h / 2, y + h / 2, h * 0.28, 0, Math.PI * 2); g.fill();
      crTexte(g, l, { fam: P.x, poids: 600, px: 34 * s, x: 80 * s + h, maxW: w - h - 20 * s, y: y + h / 2 - 34 * s * 0.62, couleur: coul, align: 'gauche', maxL: 1 });
      g.restore(); y += h + 22 * s;
    });
    if(logo){ g.globalAlpha = a * ap(0.9); const lh = 80 * s, lw = logo.width * lh / logo.height; g.drawImage(logo, (W - lw) / 2, H - 170 * s, lw, lh); }
  } else if(mod === 'merci'){
    const k = 0.85 + 0.15 * txEase(lt / 0.8);
    g.save(); g.translate(W / 2, H * 0.36); g.scale(k, k); g.translate(-W / 2, -H * 0.36);
    tx(f.phrase || 'Merci', H * 0.36 - 120 * s, { fam: crea.f || P.t, poids: crea.f ? 400 : P.tw, px: 170 * s, couleur: acc, maxL: 2, lh: 0.95 });
    g.restore();
    let y = H * 0.56;
    g.globalAlpha = a * ap(0.35); if(f.noms || c.titre) y += tx(f.noms || c.titre, y, { fam: P.t, poids: P.tw, px: 56 * s, maxL: 2 }) + 14 * s;
    g.globalAlpha = a * ap(0.5); if(c.sous) y += tx(c.sous, y, { fam: P.x, poids: 400, px: 32 * s, maxL: 2 }) + 30 * s;
    g.globalAlpha = a * ap(0.65); if(logo){ const lh = 70 * s, lw = logo.width * lh / logo.height; g.drawImage(logo, (W - lw) / 2, H - 200 * s, lw, lh); } else tx(crNom().toUpperCase(), H - 170 * s, { fam: P.t, poids: 700, px: 28 * s, espace: 6 * s, maxL: 1 });
  } else if(mod === 'logo'){
    const k = 0.7 + 0.3 * txEase(lt / 1.1), cy = H * 0.42;
    // Halo de lumière
    g.save(); g.globalCompositeOperation = 'screen'; const gr = g.createRadialGradient(W / 2, cy, 0, W / 2, cy, Math.max(W, H) * 0.5 * k); gr.addColorStop(0, `rgba(255,255,255,${0.35 * a})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
    g.save(); g.translate(W / 2, cy); g.scale(k, k);
    if(logo){ const lw = Math.min(W * 0.6, 520 * s), lh = lw * logo.height / logo.width; g.drawImage(logo, -lw / 2, -lh / 2, lw, lh); }
    else crTexte(g, crNom().toUpperCase(), { fam: P.t, poids: P.tw, px: 70 * s, x: -W / 2 + 60 * s, maxW: W - 120 * s, y: -45 * s, couleur: coul, align: 'centre', maxL: 2, espace: 4 * s });
    g.restore();
    // Reflet qui passe
    const xr = (lt - 0.4) / 0.9 * W * 1.6 - W * 0.3;
    if(lt > 0.4 && lt < 1.3){ g.save(); g.globalCompositeOperation = 'screen'; const lg = g.createLinearGradient(xr - 80 * s, 0, xr + 80 * s, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,.35)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = lg; g.fillRect(0, cy - 200 * s, W, 400 * s); g.restore(); }
    g.globalAlpha = a * ap(0.6); let y = cy + 200 * s; y += tx(f.phrase || c.appel || 'Réserve ta séance', y, { fam: P.t, poids: P.tw, px: 48 * s, maxL: 2 }) + 16 * s;
    g.globalAlpha = a * ap(0.75); if(c.contact) tx(c.contact, y, { fam: P.x, poids: 500, px: 30 * s, maxL: 2 });
  }
  g.restore();
  return true;
};
function gfHtml(){
  const f = gfCfg(), V = anVid(), mod = f.modele || 'simple';
  const champ = (k, l, ph, ta) => ta ? `<label>${l}</label><textarea rows="3" oninput="gfSet('${k}',this.value)" placeholder="${E(ph)}">${E(f[k] || '')}</textarea>` : `<label>${l}</label><input value="${E(f[k] || '')}" oninput="gfSet('${k}',this.value)" placeholder="${E(ph)}">`;
  return `<label class="ag-check"><input type="checkbox" ${V.fin ? 'checked' : ''} onchange="anVid().fin=this.checked;vpRefaire()"> Mettre un générique à la fin</label>
    ${V.fin ? `<div class="gf-l">${GF_MODELES.map(([k, n, d]) => `<button type="button" class="${mod === k ? 'on' : ''}" onclick="gfSet('modele','${k}',1)"><b>${E(n)}</b><small>${E(d)}</small></button>`).join('')}</div>
      <label>Durée du générique : <b id="gfDTxt">${fmtS(anFinD())}</b></label><input type="range" min="1.5" max="6" step="0.1" value="${anFinD()}" oninput="anVid().finDuree=Number(this.value);document.getElementById('gfDTxt').textContent=this.value.replace('.',',')+' s'" onchange="vpRefaire()">
      ${mod === 'profil' ? champ('nom', 'Nom affiché', crNom()) + `<label>Photo ronde</label><div class="mt-rps">${CR.photos.slice(0, 24).map(p => `<button type="button" class="mt-rp ${f.photoK === p.k ? 'on' : ''}" onclick="gfSet('photoK','${E(p.k)}',1)"><img src="${E(p.thumb || p.url || '')}" ${p.path && !p.thumb ? `data-mkp="${E(p.path)}"` : ''} alt=""></button>`).join('')}</div>` : ''}
      ${mod !== 'simple' ? champ('phrase', mod === 'merci' ? 'Grand mot' : mod === 'reseaux' ? 'Titre' : 'Phrase', mod === 'merci' ? 'Merci' : mod === 'reseaux' ? 'Suis-nous' : 'Réserve ta séance') : ''}
      ${mod === 'merci' ? champ('noms', 'Les noms', 'Awa & Yao') : ''}
      ${['profil', 'reseaux'].includes(mod) ? champ('reseaux', 'Mes réseaux (un par ligne)', 'Instagram @henzo.photographie\nFacebook Henzo Photographie\nTikTok @henzo', true) : ''}
      ${['reseaux', 'merci'].includes(mod) ? `<label>Police du grand mot</label><div class="ag-pills mt-pills">${Object.entries(CR_POLICES_CREA).filter(([k, x]) => x.f).map(([k, x]) => `<button type="button" class="${(f.police || 'pinceau') === k ? 'on' : ''}" onclick="gfSet('police','${k}',1)">${E(x.nom)}</button>`).join('')}</div>` : ''}
      <div class="mt-act"><button type="button" onclick="gfVoir()">▶ Voir le générique</button></div>` : ''}`;
}
window.gfSet = function(k, v, rendu){ gfCfg(true)[k] = v; if(rendu){ const z = document.getElementById('gfZone'); if(z){ z.innerHTML = gfHtml(); if(typeof mkHydrate === 'function') mkHydrate(z); } if(k === 'police') anPreparer(false).then(gfVoir); else gfVoir(); } else anApercuUneFois(); };
window.gfVoir = function(){ const p = anPlan(); AN.plan = p; anStop(); AN.t = Math.min(p.D - 0.05, p.Dp + Math.min(1.2, p.finD * 0.6)); anApercuUneFois(); };
window.vpRefaire = function(){ const V = anVid(); if(V.style && typeof mtsAppliquer === 'function' && V.styleSig && V.clips && V.styleSig === JSON.stringify(V.clips)) mtsAppliquer(V.style, true); else crRender(); };

// ============================================================
// 5. COUVERTURE
// ============================================================
function cvCfg(creer){ const V = anVid(); return V.couv || (creer ? (V.couv = { src: 'auto', t: 1, titre: true, premiere: false }) : { src: 'auto', t: 1, titre: true, premiere: false }); }
let CV_IMPORT = null;   // image importée (gardée le temps de la séance)
function cvDessiner(g, W, H, s){
  const C = cvCfg(), c = CR.cfg, P = crPolices(), plan = AN.plan || anPlan();
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  if(C.src === 'import' && CV_IMPORT){ anCover(g, CV_IMPORT, 0, 0, W, H, 1, 0, 0); }
  else {
    const t = C.src === 'video' ? Math.max(0.15, Math.min(plan.D - 0.05, C.t || 1)) : Math.max(0.15, Math.min(plan.Dp - 0.2, (plan.segs[0] ? (plan.segs[0].t0 + plan.segs[0].t1) / 2 : 1)));
    const tc = AN.tCourant; VP.dansCouv = true;
    try { anImage(g, W, H, s, t, AN_IMGS, plan, AN_LOGO); } finally { VP.dansCouv = false; AN.tCourant = tc; }
  }
  if(C.titre && (c.titre || c.mot)){
    const gr = g.createLinearGradient(0, H * 0.45, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.7)'); g.fillStyle = gr; g.fillRect(0, H * 0.45, W, H * 0.55);
    let y = H * 0.66;
    y += crTexte(g, c.titre || c.mot, { fam: P.t, poids: P.tw, px: 92 * s, x: 60 * s, maxW: W - 120 * s, y, couleur: '#fff', align: 'centre', maxL: 3, lh: 1.02, ombre: true }) + 18 * s;
    if(c.sous) crTexte(g, c.sous, { fam: P.x, poids: 500, px: 36 * s, x: 60 * s, maxW: W - 120 * s, y, couleur: 'rgba(255,255,255,.92)', align: 'centre', maxL: 2 });
  }
}
window.cvPremiere = function(g, W, H, s, t){ if(VP.dansCouv) return; const C = anVid().couv; if(!C || !C.premiere || t >= 0.1) return; cvDessiner(g, W, H, s); };
function cvHtml(){
  const C = cvCfg(), F = crDims(CR.fmt, 0.28);
  return `<div class="cv-z"><canvas id="cvCanvas" width="${F.w}" height="${F.h}"></canvas><div class="cv-o">
      <div class="ag-pills mt-pills">${[['auto', 'Automatique'], ['video', 'Image de la vidéo'], ['import', 'Importer']].map(([k, l]) => `<button type="button" class="${C.src === k ? 'on' : ''}" onclick="cvSet('src','${k}')">${l}</button>`).join('')}</div>
      ${C.src === 'video' ? `<div class="ag-hint">Mets la lecture sur la bonne image, puis :</div><div class="mt-act"><button type="button" onclick="cvSet('t',Math.max(0.15,AN.t))">Prendre l'image à ${fmtS(AN.t)}</button></div>` : ''}
      ${C.src === 'import' ? `<div class="mt-act"><button type="button" onclick="document.getElementById('cvFile').click()">${CV_IMPORT ? 'Changer l\'image' : 'Choisir une image'}</button></div><input type="file" id="cvFile" accept="image/*" style="display:none" onchange="cvImport(this.files)">` : ''}
      <label class="ag-check"><input type="checkbox" ${C.titre ? 'checked' : ''} onchange="cvSet('titre',this.checked)"> Ajouter le titre</label>
      <label class="ag-check"><input type="checkbox" ${C.premiere ? 'checked' : ''} onchange="cvSet('premiere',this.checked)"> La mettre en toute première image de la vidéo</label>
      <div class="ag-hint">TikTok, Facebook et WhatsApp prennent souvent la première image comme miniature.</div>
      <div class="mt-act"><button type="button" onclick="cvTelecharger()">${agIcon('download', 14)} Télécharger la couverture</button></div></div></div>`;
}
window.cvRendu = function(){ const z = document.getElementById('cvZone'); if(z){ z.innerHTML = cvHtml(); cvApercu(); } };
function cvApercu(){ const cv = document.getElementById('cvCanvas'); if(!cv) return; AN.plan = AN.plan || anPlan(); try { cvDessiner(cv.getContext('2d'), cv.width, cv.height, Math.min(cv.width, cv.height) / 1080); } catch(e){ console.warn('couv', e); } }
window.cvSet = function(k, v){ cvCfg(true)[k] = v; cvRendu(); };
window.cvImport = async function(files){
  const f = files && files[0]; if(!f) return;
  const u = URL.createObjectURL(f);
  CV_IMPORT = await new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = u; });
  cvRendu();
};
window.cvTelecharger = async function(){
  const V = anVid(), q = AN_QUAL.find(x => x[0] === V.qualite) || AN_QUAL[1];
  const d = crDims(CR.fmt, q[2] / 1080);
  await anPreparer(q[2] > 1080);
  AN.plan = anPlan();
  const cv = document.createElement('canvas'); cv.width = d.w; cv.height = d.h;
  cvDessiner(cv.getContext('2d'), d.w, d.h, Math.min(d.w, d.h) / 1080);
  await anPreparer(false);
  const blob = await new Promise(ok => cv.toBlob(ok, 'image/jpeg', 0.92));
  const nom = `${anNomFichier()}-couverture-${d.w}x${d.h}.jpg`, file = new File([blob], nom, { type: 'image/jpeg' });
  if(navigator.canShare && navigator.canShare({ files: [file] }) && /Android|iPhone|iPad/.test(navigator.userAgent)){ try { await navigator.share({ files: [file] }); return; } catch(e){ if(e && e.name === 'AbortError') return; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nom; document.body.appendChild(a); a.click(); a.remove();
  agToast('Couverture prête');
};

// ============================================================
// 6. PRÉRÉGLAGES (mes réglages vidéo gardés)
// ============================================================
const VP_VID = ['style', 'rythme', 'remplir', 'fps', 'qualite', 'force', 'fin', 'finDuree', 'fondu', 'volume', 'sync', 'parPage'];
const cfgPourBase = crConfigPour;
crConfigPour = function(avecPhotos, avecTextes){
  const o = cfgPourBase.apply(this, arguments);
  if(typeof anEst === 'function' && anEst(CR.modele)){
    const V = anVid(), v = {}; VP_VID.forEach(k => { if(V[k] !== undefined) v[k] = V[k]; });
    if(V.couv) v.couv = Object.assign({}, V.couv, { src: V.couv.src === 'import' ? 'auto' : V.couv.src });
    o.vidReglages = v;
    if(!avecTextes && !avecPhotos){ o.cfg.textes = (o.cfg.textes || []).map(x => Object.assign({}, x, { txt: x.txt ? 'Ton texte' : '' })); if(o.cfg.fin) o.cfg.fin = Object.assign({}, o.cfg.fin, { noms: '', photoK: null }); }
  }
  return o;
};
const appStyleBase = crAppliquerStyle;
crAppliquerStyle = function(id){
  const st = (CR.styles || []).find(x => x.id === id);
  const garder = typeof AN !== 'undefined' ? { musique: AN.vid && AN.vid.musique, debut: AN.vid && AN.vid.debut, duree: AN.vid && AN.vid.duree } : null;
  const r = appStyleBase.apply(this, arguments);
  const v = st && st.config && st.config.vidReglages;
  if(v && anEst(CR.modele)){
    const V = anVid(); Object.assign(V, v); V.clips = null;
    if(garder){ V.musique = garder.musique; V.debut = garder.debut || 0; }
    if(V.style && typeof mtsAppliquer === 'function' && CR.photos.length && CR.vue === 'edit'){ setTimeout(() => mtsAppliquer(V.style, true), 50); }
    else crRender();
    agToast('Préréglage « ' + (st.nom || '') + ' » appliqué');
  }
  return r;
};
function prHtml(){
  const mes = (CR.styles || []).filter(x => /^v-/.test(x.modele || ''));
  return `${mes.length ? `<div class="pr-l">${mes.map(x => `<div class="pr-c"><button type="button" onclick="crAppliquerStyle(${x.id})">${x.apercu ? `<img src="${E(x.apercu)}" alt="">` : ''}<b>${E(x.nom || 'Mon préréglage')}</b></button><button type="button" class="no" onclick="prSuppr(${x.id})" aria-label="Supprimer">${agIcon('trash', 13)}</button></div>`).join('')}</div>` : '<div class="ag-hint" style="margin-top:0">Pas encore de préréglage. Les 10 styles du montage automatique servent de préréglages de base.</div>'}
    <div class="mt-act"><button type="button" class="on" onclick="crGarderStyle()">Enregistrer mes réglages actuels</button></div>
    <div class="ag-hint">Gardé : style de montage, rythme, effets et leurs moments, textes animés (avec ou sans les mots), générique, couverture, qualité. Tu le refais ensuite en 1 clic sur d'autres photos.</div>`;
}
window.prSuppr = async function(id){ await crSupprimer(id); const z = document.getElementById('prZone'); if(z) z.innerHTML = prHtml(); };
// Après "Garder ce style" : la liste des préréglages se met à jour
const garderBase = crGarderStyle;
crGarderStyle = async function(){ const r = await garderBase.apply(this, arguments); const z = document.getElementById('prZone'); if(z) z.innerHTML = prHtml(); return r; };

// ============================================================
// AFFICHAGE DANS L'ÉDITEUR VIDÉO
// ============================================================
const vueBase = anVueEdit;
anVueEdit = function(){
  let h = vueBase.apply(this, arguments);
  const blocs = `
    <details class="cr-bloc" ${(CR.cfg.textes || []).length ? 'open' : ''}><summary>Textes animés ${(CR.cfg.textes || []).length ? `<i class="vp-n">${CR.cfg.textes.length}</i>` : ''}</summary><div id="txZone">${txHtml()}</div></details>
    <details class="cr-bloc"><summary>Effets dans le temps</summary><div id="fxZone">${fxHtml()}</div></details>
    <details class="cr-bloc"><summary>Générique de fin</summary><div id="gfZone">${gfHtml()}</div></details>
    <details class="cr-bloc" ontoggle="if(this.open)cvRendu()"><summary>Image de couverture</summary><div id="cvZone"></div></details>
    <details class="cr-bloc"><summary>Mes préréglages</summary><div id="prZone">${prHtml()}</div></details>`;
  const i = h.indexOf('<button class="btn-ghost" style="width:100%;margin-top:8px;display:flex');
  return i > 0 ? h.slice(0, i) + blocs + h.slice(i) : h + blocs;
};

(function vpCss(){
  if(document.getElementById('vpCss')) return;
  const st = document.createElement('style'); st.id = 'vpCss';
  st.textContent = `
.vp-n{font-style:normal;font-size:11px;background:var(--accent);color:#fff;border-radius:999px;padding:1px 7px;margin-left:6px}
.fx-l{padding:8px 10px;border-radius:12px;background:var(--card2);margin-top:6px}
.fx-l.on{border:1px solid color-mix(in srgb,var(--accent) 40%,transparent)}
.fx-t{display:flex;align-items:center;gap:10px}.fx-t b{flex:1;font-size:12.5px;color:var(--text);font-weight:600}.fx-t input{flex:1.2;margin:0}
.fx-p{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:6px}.fx-p span{font-size:11.5px;color:var(--muted);margin-right:4px}
.fx-p button{width:auto;margin:0;padding:5px 9px;border-radius:999px;border:1px solid var(--border);background:var(--card);color:var(--text);font-size:11.5px;cursor:pointer}
.tx-c{padding:10px;border-radius:12px;background:var(--card2);margin-bottom:8px}
.tx-c label{display:block;margin:8px 0 4px;font-size:12px;color:var(--muted)}
.tx-c textarea{width:100%;box-sizing:border-box;margin:0}
.tx-h{display:flex;align-items:baseline;gap:8px;margin-bottom:6px}.tx-h b{color:var(--text);font-size:13px}.tx-h span{flex:1;color:var(--muted);font-size:12px}
.tx-row{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:6px}.tx-row label{margin:0}.tx-row input[type=range]{flex:1;min-width:120px;margin:0}
.tx-row input[type=color]{width:38px;height:32px;padding:0;margin:0;border-radius:8px;border:1px solid var(--border);background:none}
.mt-act button.on{background:var(--accent);border-color:var(--accent);color:#fff}
.vp-id{margin-top:8px;padding:10px;border-radius:12px;border:1px dashed color-mix(in srgb,var(--accent) 50%,transparent)}
.vp-id label{display:block;margin:6px 0 4px;font-size:12px;color:var(--muted)}
.vp-idees{display:flex;flex-wrap:wrap;gap:6px}
.vp-idees button{width:auto;margin:0;padding:6px 10px;border-radius:10px;border:1px solid var(--border);background:var(--card2);color:var(--text);font-size:12.5px;cursor:pointer;text-align:left}
.gf-l{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:6px;margin:6px 0}
.gf-l button{margin:0;padding:8px 10px;border-radius:12px;border:1.5px solid var(--border);background:var(--card2);text-align:left;cursor:pointer}
.gf-l button.on{border-color:var(--accent)}.gf-l b{display:block;font-size:12.5px;color:var(--text)}.gf-l small{display:block;font-size:10.5px;color:var(--muted);margin-top:2px}
.mt-rp.on{outline:3px solid var(--accent)}
.cv-z{display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap}
.cv-z canvas{width:130px;height:auto;border-radius:10px;background:#000;flex:none}
.cv-o{flex:1;min-width:180px}
.pr-l{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px}
.pr-c{position:relative}.pr-c>button:first-child{width:100%;margin:0;padding:0 0 6px;border-radius:12px;overflow:hidden;border:1px solid var(--border);background:var(--card2);cursor:pointer;text-align:center}
.pr-c img{width:100%;aspect-ratio:4/5;object-fit:cover;display:block}.pr-c b{display:block;font-size:11.5px;color:var(--text);padding:4px 4px 0}
.pr-c .no{position:absolute;top:4px;right:4px;width:26px;height:26px;margin:0;padding:0;border-radius:50%;border:0;background:rgba(0,0,0,.6);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer}`;
  document.head.appendChild(st);
})();
})();
