// montage-medias.js — version 2
// ============================================================
// MONTAGE-MEDIAS.JS - Lot C : les médias et l'aperçu
// (écran de montage des Créations)
// ------------------------------------------------------------
// - Import de plusieurs fichiers d'un coup : vidéos, photos et sons
//   (bouton Importer, ou fichiers glissés depuis l'ordinateur).
// - Bibliothèque « Médias » : miniatures, durée, tri (vidéos, photos,
//   sons), aperçu (lecture de la vidéo ou du son), et ce qui est déjà
//   dans le montage. Un clic sur « + » ajoute à la tête de lecture.
// - Glisser-déposer d'un média vers la table de montage : sur la piste
//   principale (inséré à la coupe la plus proche), au-dessus
//   (incrustation) ou sur une piste son. Souris : on attrape.
//   Tactile : appui long puis on glisse.
// - Fichiers manquants : un brouillon rouvert dont une photo, une
//   vidéo, un son ou la musique n'est plus sur l'appareil le dit
//   clairement (plan gris « Fichier manquant » au lieu de disparaître)
//   et « Relier » remet le bon fichier (reconnu par son nom ou sa taille).
// - Aperçu plein écran (bouton, ou Maj + F) et qualité de l'aperçu
//   réglable (Rapide 360p, Normale 540p, Haute 810p, Pleine 1080p).
//   La qualité de la vidéo finale ne change pas.
// Tout est ajouté par enveloppes : montage.js, montage-pro.js,
// montage-pistes.js, crea-brouillons.js... restent tels quels.
// Utilise montage.js, montage-pro.js, montage-pistes.js, rushs.js,
// musique-libre.js, animations.js, crea-brouillons.js.
// ============================================================
(function(){
'use strict';
if(typeof CR === 'undefined' || typeof AN === 'undefined' || typeof MT === 'undefined' || typeof MPX === 'undefined' || typeof MPB === 'undefined' || typeof mtMaj !== 'function' || typeof mtEstSeq !== 'function' || typeof mtAvantPublic !== 'function') return;

function lsGet(k, d){ try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch(e){ return d; } }
function lsSet(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }

const QUAL = [
  ['rapide', 'Rapide', 1 / 3, '360 p : fluide même sur un petit téléphone'],
  ['normale', 'Normale', 0.5, '540 p : le bon équilibre (conseillé)'],
  ['haute', 'Haute', 0.75, '810 p : pour vérifier les détails'],
  ['max', 'Pleine', 1, '1080 p : comme la vidéo finale (plus lent)']
];
const MMD = {
  lib: [],                // les médias de la bibliothèque (photos et vidéos : mêmes objets que CR.photos ; sons : { audio: true ... })
  filtre: 'tout', vu: null, dernier: [],
  drag: null, reprise: null, musManquante: null,
  qual: QUAL.some(q => q[0] === lsGet('mmd.qualite', 'normale')) ? lsGet('mmd.qualite', 'normale') : 'normale',
  fs: false, fsT: 0, averti: ''
};
window.MMD = MMD;
const VIDE = '__vide';

// ---------- Icônes en plus ----------
if(typeof AG_ICONS !== 'undefined'){
  const I = {
    mediaLib: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><path d="M17 13v8M13 17h8"/>',
    importer: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    shrink: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
    missing: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 11v4M12 18v.01"/>',
    hd: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9v6M10 9v6M6 12h4M14 9v6h2a3 3 0 0 0 0-6z"/>',
    film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    upLayer: '<rect x="3" y="13" width="18" height="7" rx="1.5"/><rect x="7" y="4" width="10" height="6" rx="1.5"/><path d="M12 10v3"/>',
    frameBack: '<path d="M6 5v14"/><path d="M18 6 10 12l8 6z"/>',
    frameFwd: '<path d="M18 5v14"/><path d="M6 6l8 6-8 6z"/>'
  };
  Object.keys(I).forEach(k => { if(!AG_ICONS[k]) AG_ICONS[k] = I[k]; });
}
const ic = (n, s) => agIcon(n, s || 18);
const E = s => crE(String(s == null ? '' : s));
const r2 = v => Math.round(v * 100) / 100;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function uid(p){ return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function duree(s){ s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function tcCourt(t){ t = Math.max(0, t || 0); const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1).replace('.', ',')}`; }
function fps(){ return anVid().fps === 60 ? 60 : 30; }
function tc(t){ const f = fps(); t = Math.max(0, t || 0); const fr = Math.round(t * f), s = Math.floor(fr / f), ff = fr % f; return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}:${String(ff).padStart(2, '0')}`; }
function vibre(ms){ try { if(navigator.vibrate) navigator.vibrate(ms || 12); } catch(e){} }

// ---------- Utilitaires ----------
function mobile(){ return !window.matchMedia('(min-width:900px)').matches; }
function pro(){ return document.body.classList.contains('ed-ouvert') && CR.vue === 'edit' && !!CR.modele && mtEstSeq(CR.modele) && !!document.querySelector('.ed.mpx') && !!document.getElementById('mtPiste'); }
function wrap(){ return document.querySelector('#mtZone .mt-piste-w'); }
function piste(){ return document.getElementById('mtPiste'); }
function planNow(){ AN.plan = anPlan(); return AN.plan; }
function itemDe(k){ return MMD.lib.find(x => x.k === k) || CR.photos.find(p => p.k === k) || null; }
function genre(it){ return it.audio ? 'son' : (it.video || it.mVideo) ? 'video' : 'photo'; }
function nomDe(it){ return it.nom || it.nomF || (it.file && it.file.name) || (it.f ? String(it.f) : '') || (genre(it) === 'video' ? 'Vidéo' : 'Photo'); }
function ml(){ return typeof ML !== 'undefined' ? ML : null; }
function sonBuf(s){ const M = ml(); return M && M.buf ? M.buf[s.id] : null; }
function sonDur(s){ const b = sonBuf(s), m = b ? Math.max(0.1, b.duration - (s.off || 0)) : null; if(s.dur != null) return m != null ? Math.min(s.dur, m) : s.dur; return m != null ? m : 1; }
function typeDe(f){
  const t = String(f.type || ''), n = String(f.name || '').toLowerCase();
  if(/^image\//.test(t) || /\.(jpe?g|png|webp|gif|heic|heif|avif)$/.test(n)) return 'photo';
  if(/^video\//.test(t) || /\.(mp4|mov|m4v|webm|3gp|mkv)$/.test(n)) return 'video';
  if(/^audio\//.test(t) || /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac)$/.test(n)) return 'son';
  return '';
}

// ============================================================
// 1. LA BIBLIOTHÈQUE
// ------------------------------------------------------------
// Les photos et vidéos du montage (CR.photos) y sont toujours. Un média
// importé reste dans la bibliothèque même s'il n'est pas (ou plus)
// dans le montage, jusqu'à ce que tu ouvres un autre projet.
// ============================================================
function syncLib(){
  const vus = new Set();
  CR.photos.forEach(p => {
    if(!p || !p.k || vus.has(p.k)) return; vus.add(p.k);
    const i = MMD.lib.findIndex(x => x.k === p.k);
    if(i < 0) MMD.lib.push(p); else if(MMD.lib[i] !== p) MMD.lib[i] = p;
  });
}
function nouveauProjet(){ MMD.lib = []; MMD.vu = null; MMD.dernier = []; MMD.musManquante = null; MMD.averti = ''; MMD.filtre = 'tout'; }
function utilise(it){
  if(it.audio) return (anVid().sons || []).some(s => s.fid === it.k);
  return CR.photos.some(p => p.k === it.k);
}
function liste(){
  syncLib();
  const f = MMD.filtre;
  return MMD.lib.filter(it => f === 'tout' || genre(it) === f || (f === 'manquants' && it.manquant));
}

// ---------- Import ----------
window.mmdImporter = function(){
  let inp = document.getElementById('mmdFile');
  if(!inp){ inp = document.createElement('input'); inp.type = 'file'; inp.id = 'mmdFile'; inp.multiple = true; inp.accept = 'image/*,video/*,audio/*'; inp.style.display = 'none'; inp.onchange = () => { const F = [...(inp.files || [])]; inp.value = ''; mmdFichiers(F); }; document.body.appendChild(inp); }
  inp.click();
};
async function decoderSon(it){
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    it.buf = await ctx.decodeAudioData(await it.file.arrayBuffer()); try { ctx.close && ctx.close(); } catch(e){}
    it.dur = it.buf.duration; it.onde = ondeImage(it.buf);
  } catch(e){ it.erreur = 'Ce son ne peut pas être lu (essaie un MP3, M4A ou WAV)'; }
}
function ondeImage(b){
  try {
    const W = 160, H = 48, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'), ch = b.getChannelData(0), n = Math.max(1, Math.floor(ch.length / W));
    g.fillStyle = '#48A89A';
    for(let x = 0; x < W; x++){ let m = 0; for(let j = x * n; j < (x + 1) * n; j += 32) m = Math.max(m, Math.abs(ch[j] || 0)); const h = Math.max(1, m * H * 0.92); g.fillRect(x, (H - h) / 2, 1, h); }
    return c.toDataURL('image/png');
  } catch(e){ return ''; }
}
// Ajoute des fichiers à la bibliothèque (et, si « ou » est donné, au montage à cet endroit)
window.mmdFichiers = async function(files, ou){
  const F = [...(files || [])].map(f => ({ f, type: typeDe(f) })).filter(x => x.type);
  if(!F.length){ if(files && files.length) agToast('Ces fichiers ne sont ni des photos, ni des vidéos, ni des sons', 'info'); return []; }
  const nouv = [], attente = [];
  F.forEach(({ f, type }) => {
    const url = URL.createObjectURL(f), base = { src: 'fichier', file: f, url, nomF: f.name, taille: f.size };
    let it;
    if(type === 'photo') it = Object.assign({ k: 'f:' + f.name + f.size + Math.random(), thumb: url }, base);
    else if(type === 'video'){ it = Object.assign({ k: 'v:' + f.name + f.size + Math.random(), thumb: '', video: true }, base); if(typeof rvNouveau === 'function') attente.push(rvNouveau(it).catch(() => {}).then(() => rendreGrille())); }
    else { it = Object.assign({ k: 'a:' + uid(''), audio: true, nom: f.name.replace(/\.[^.]+$/, '').slice(0, 40), origine: 'inconnu' }, base); attente.push(decoderSon(it).then(() => rendreGrille())); }
    MMD.lib.push(it); nouv.push(it);
  });
  MMD.dernier = nouv.map(x => x.k);
  if(nouv.length === 1) MMD.vu = nouv[0].k;
  rendreLib();
  if(ou){ agToast('Préparation de ' + (nouv.length > 1 ? nouv.length + ' fichiers' : 'ton fichier') + '...', 'info'); await Promise.all(attente); poser(nouv.map(x => x.k), ou); }
  else {
    const n = { photo: 0, video: 0, son: 0 }; nouv.forEach(x => n[genre(x)]++);
    agToast([n.video && n.video + ' vidéo' + (n.video > 1 ? 's' : ''), n.photo && n.photo + ' photo' + (n.photo > 1 ? 's' : ''), n.son && n.son + ' son' + (n.son > 1 ? 's' : '')].filter(Boolean).join(', ') + ' dans la bibliothèque');
    if(pro() && CR.edOutil !== 'medias') mmdOuvrir(true);
    Promise.all(attente).then(() => rendreLib());
  }
  return nouv;
};

// ============================================================
// 2. AJOUTER AU MONTAGE
// ============================================================
// Coupe de la piste principale la plus proche d'un temps (index d'insertion)
function indexA(t){
  const S = (AN.plan || planNow()).segs; if(!S.length) return 0;
  let best = S.length, ecart = Math.abs(t - S[S.length - 1].t1);
  S.forEach((sg, k) => { const e = Math.abs(t - sg.t0); if(e < ecart){ ecart = e; best = k; } });
  return best;
}
function tempsIndex(k){ const S = (AN.plan || planNow()).segs; if(!S.length) return 0; return k < S.length ? S[k].t0 : S[S.length - 1].t1; }
function dureeBase(p){ return p.video ? clamp(p.vdur || 4, 0.5, 4) : 2.5; }
function maxPhotos(){ const M = typeof anModele === 'function' ? anModele(CR.modele) : null; return (M && M.max) || 100; }
function mettreDansPhotos(p){
  if(CR.photos.some(x => x.k === p.k)) return;
  CR.photos.push(p); const c = { x: 0, y: 0, z: 1 }; CR.crop.push(c);
  MPB.media[p.k] = { p, c };
}
function assezDePlace(items){
  const n = items.filter(p => !CR.photos.some(x => x.k === p.k)).length;
  if(CR.photos.length + n > maxPhotos()){ agToast(`${maxPhotos()} photos et vidéos au plus dans ce montage`, 'info'); return false; }
  return true;
}
// Piste principale : insertion à l'index donné (les plans suivants se décalent)
function ajouterPrincipale(items, index){
  items = items.filter(p => p && !p.audio); if(!items.length || !assezDePlace(items)) return [];
  if(typeof anStop === 'function') anStop();
  mtAvantPublic();
  let idx = clamp(index == null ? anVid().clips.length : index, 0, anVid().clips.length);
  const faits = [];
  items.forEach(p => {
    const avant = new Set(anVid().clips);
    mettreDansPhotos(p);
    planNow();   // montage.js range le nouveau média à la fin, avec son réglage de départ
    const L = anVid().clips;
    let j = L.findIndex(c => !avant.has(c) && c.k === p.k), c;
    if(j >= 0) c = L.splice(j, 1)[0];
    else c = { k: p.k, d: dureeBase(p), mvt: p.video ? 'aucun' : 'kb', tr: 'fondu', trD: 0.6 };
    if(p.video && c.vin == null) c.vin = 0;
    L.splice(Math.min(idx, L.length), 0, c); idx = L.indexOf(c) + 1; faits.push(c);
  });
  return faits;
}
// Piste vidéo d'incrustation libre à cet endroit (celle voulue d'abord)
function pisteVideo(voulue, t, d){
  const V = anVid(); V.pistes = V.pistes || [];
  const libre = p => !(p.clips || []).some(c => c.t < t + d - 0.001 && t < c.t + c.d - 0.001);
  const L = V.pistes.filter(p => p.type === 'video');
  let p = L.find(x => x.id === voulue && libre(x)) || L.find(libre);
  if(!p){ let n = 1; while(V.pistes.some(x => x.id === 'v' + n)) n++; p = { id: 'v' + n, type: 'video', muet: false, cache: false, clips: [] }; V.pistes.push(p); }
  p.clips = p.clips || [];
  return p;
}
function pisteSon(voulue, t, d){
  const V = anVid(); V.pistes = V.pistes || [];
  const libre = p => !(V.sons || []).some(s => s.piste === p.id && s.t < t + d - 0.001 && t < s.t + sonDur(s) - 0.001);
  const L = V.pistes.filter(p => p.type === 'audio');
  let p = L.find(x => x.id === voulue && libre(x)) || L.find(libre);
  if(!p){ let n = 1; while(V.pistes.some(x => x.id === 'a' + n)) n++; p = { id: 'a' + n, type: 'audio', muet: false, cache: false }; V.pistes.push(p); }
  return p;
}
function ajouterIncrust(p, t, voulue){
  if(!p || p.audio || !assezDePlace([p])) return null;
  if(typeof anStop === 'function') anStop();
  mtAvantPublic();
  mettreDansPhotos(p);
  const D = (AN.plan || planNow()).D, d = dureeBase(p);
  t = r2(clamp(t, 0, Math.max(0, D - 0.3)));
  const o = Object.assign({ id: uid('o'), k: p.k, t, d }, p.video ? { vin: 0, vit: 1 } : {});
  pisteVideo(voulue, t, d).clips.push(o);
  return o;
}
// Les sons importés sont gardés sur l'appareil avec le brouillon
function garderSon(it){ try { if(typeof BR !== 'undefined' && it.file) BR.put('fichiers', it.file, 'son:' + it.k).catch(() => {}); } catch(e){} }
function ajouterSon(it, t, voulue){
  const M = ml(); if(!M){ agToast('Les sons ne sont pas disponibles ici', 'info'); return null; }
  if(!it.buf){ agToast(it.erreur || 'Le son se prépare, réessaie dans un instant', 'info'); return null; }
  if(typeof anStop === 'function') anStop();
  mtAvantPublic();
  const V = anVid(); V.sons = V.sons || [];
  t = r2(Math.max(0, t));
  const s = { id: uid('s'), nom: it.nom, titre: it.nom, t, vol: 1, fid: it.k, origine: it.origine || 'inconnu' };
  M.buf[s.id] = it.buf;
  s.piste = pisteSon(voulue, t, it.dur || 1).id;
  V.sons.push(s);
  garderSon(it);
  return s;
}
// Pose une liste de médias à un endroit : { type: 'principale' | 'incrust' | 'son' | 'tete' | 'fin', t, index, piste }
function poser(ks, ou){
  const items = ks.map(itemDe).filter(Boolean); if(!items.length) return;
  const sons = items.filter(x => x.audio), vis = items.filter(x => !x.audio);
  const manq = items.find(x => x.manquant); if(manq){ agToast('Ce fichier est manquant : relie-le d\'abord', 'info'); return; }
  const plan = AN.plan || planNow();
  let t = ou.t != null ? ou.t : AN.t, msg = '';
  const nouv = [];
  if(vis.length){
    if(ou.type === 'incrust'){ let tt = t; vis.forEach(p => { const o = ajouterIncrust(p, tt, ou.piste); if(o){ nouv.push(o); tt = o.t + o.d; } }); if(nouv.length) msg = (nouv.length > 1 ? nouv.length + ' incrustations' : 'Incrustation') + ' à ' + tcCourt(nouv[0].t); }
    else {
      const index = ou.type === 'fin' ? null : ou.index != null ? ou.index : indexA(t);
      const faits = ajouterPrincipale(vis, index);
      if(faits.length){
        nouv.push(...faits);
        const p2 = planNow(), n0 = anVid().clips.indexOf(faits[0]), n1 = anVid().clips.indexOf(faits[faits.length - 1]);
        if(p2.segs[n0]) msg = (faits.length > 1 ? faits.length + ' plans ajoutés' : 'Plan ajouté') + ' à ' + tcCourt(p2.segs[n0].t0);
        if(p2.segs[n1] && ou.type === 'tete') AN.t = Math.min(p2.D, p2.segs[n1].t1);   // « + » plusieurs fois : les plans se suivent
      }
    }
  }
  if(sons.length){
    let tt = ou.type === 'fin' ? 0 : t; const faits = [];
    sons.forEach(it => { const s = ajouterSon(it, tt, ou.type === 'son' ? ou.piste : null); if(s){ faits.push(s); nouv.push(s); tt = s.t + sonDur(s); } });
    if(faits.length) msg = (msg ? msg + ' · ' : '') + (faits.length > 1 ? faits.length + ' sons' : 'Son') + ' à ' + tcCourt(faits[0].t);
  }
  if(!nouv.length) return;
  // Les nouveaux éléments sont surlignés ; la bibliothèque reste ouverte pour continuer
  MT.sel = null; MPB.sel = new Set(nouv);
  mtMaj(true);
  if(msg) agToast(msg);
  // La nouvelle place reste visible dans la table de montage
  setTimeout(() => { try { const w = wrap(), o = nouv[0]; if(!w || mobile()) return; const tt = o.t != null ? o.t : (planNow().segs[anVid().clips.indexOf(o)] || {}).t0; if(tt == null) return; const x = MPB.x0 + tt * MPB.pps; if(x < w.scrollLeft || x > w.scrollLeft + w.clientWidth - 60) w.scrollLeft = Math.max(0, x - 80); } catch(e){} }, 60);
  rendreGrille();
  // L'aperçu du média dit maintenant « dans le montage »
  { const v = document.getElementById('mmdVue'); if(v && MMD.vu && ks.includes(MMD.vu)){ v.innerHTML = vueHtml(); if(typeof mkHydrate === 'function') try { mkHydrate(v); } catch(e){} } }
}
window.mmdAjouter = function(k, type){
  const it = itemDe(k); if(!it) return;
  if(type === 'musique'){ mmdMusique(k); return; }
  poser([k], { type: type || (it.audio ? 'son' : 'tete'), t: AN.t });
};
window.mmdAjouterDernier = function(){ const ks = MMD.dernier.filter(k => { const it = itemDe(k); return it && !it.audio; }); if(ks.length) poser(ks, { type: 'fin' }); };
window.mmdMusique = async function(k){
  const it = itemDe(k); if(!it || !it.audio || !it.file || typeof anChoisirMusique !== 'function') return;
  if(anVid().musique && !await agConfirm(`Remplacer la musique « ${anVid().musique.nom} » par « ${it.nom} » ?`, { ok: 'Remplacer', no: 'Garder' })) return;
  await anChoisirMusique([it.file]);
  MMD.musManquante = null;
};
window.mmdOrigine = function(k, v){
  const it = itemDe(k); if(!it) return; it.origine = v;
  (anVid().sons || []).forEach(s => { if(s.fid === k) s.origine = v; });
  agToast('Noté : le contrôle des droits en tient compte', 'info');
};
window.mmdRetirer = async function(k){
  const it = itemDe(k); if(!it) return;
  if(utilise(it)){ agToast('Ce média est dans le montage : retire d\'abord ses plans', 'info'); return; }
  MMD.lib = MMD.lib.filter(x => x !== it); if(MMD.vu === k) MMD.vu = null;
  rendreLib();
};

// ============================================================
// 3. L'ÉCRAN « MÉDIAS » (outil de l'éditeur)
// ============================================================
function vignette(it){
  if(it.audio) return it.onde ? `<img src="${E(it.onde)}" alt="" draggable="false">` : `<span class="mmd-ico">${ic('wave', 26)}</span>`;
  const src = it.thumb || (it.video ? '' : it.url) || '';
  if(src) return `<img src="${E(src)}" alt="" draggable="false" loading="lazy">`;
  if(it.path) return `<img data-mkp="${E(it.path)}" alt="" draggable="false">`;
  return `<span class="mmd-ico">${ic(genre(it) === 'video' ? 'film' : 'image', 26)}</span>`;
}
function tuileHtml(it){
  const g = genre(it), u = utilise(it), d = it.audio ? it.dur : (it.vdur || 0);
  return `<div class="mmd-t${MMD.vu === it.k ? ' on' : ''}${it.manquant ? ' manq' : ''}" data-k="${E(it.k)}" title="${E(nomDe(it))}">
    <div class="mmd-v">${vignette(it)}</div>
    ${it.manquant ? `<span class="mmd-bad">${ic('missing', 12)} Manquant</span>` : u ? `<span class="mmd-u" title="Déjà dans le montage">${ic('check', 11)}</span>` : ''}
    ${g !== 'photo' && d ? `<span class="mmd-d">${g === 'video' ? ic('play', 8) + ' ' : ''}${duree(d)}</span>` : ''}
    <b>${E(nomDe(it))}</b>
    ${it.manquant ? `<button type="button" class="mmd-add" onclick="event.stopPropagation();mmdRelier('${E(it.k)}')" title="Relier le fichier">${ic('link', 15)}</button>`
      : `<button type="button" class="mmd-add" onclick="event.stopPropagation();mmdAjouter('${E(it.k)}')" title="${it.audio ? 'Ajouter ce son à la tête de lecture' : 'Ajouter à la tête de lecture'}">${ic('plus', 16)}</button>`}
  </div>`;
}
function grilleHtml(){
  syncLib();
  const L = liste(), n = { tout: MMD.lib.length, video: 0, photo: 0, son: 0 }; MMD.lib.forEach(x => n[genre(x)]++);
  const manq = manquants();
  const f = (k, l) => `<button type="button" class="${MMD.filtre === k ? 'on' : ''}" onclick="mmdFiltre('${k}')">${l}${n[k] ? ` <i>${n[k]}</i>` : ''}</button>`;
  const dern = MMD.dernier.filter(k => { const it = itemDe(k); return it && !it.audio && !utilise(it); });
  return `${manq.length ? `<div class="mmd-manq-b">${ic('missing', 16)}<div><b>${manq.length} fichier${manq.length > 1 ? 's' : ''} manquant${manq.length > 1 ? 's' : ''}</b><small>${E(manq.slice(0, 3).map(m => m.nom).join(', '))}${manq.length > 3 ? '...' : ''} : ${manq.length > 1 ? 'ils ne sont' : 'il n\'est'} plus sur cet appareil.</small></div><button type="button" class="on" onclick="mmdRelier()">${ic('link', 14)} Relier</button></div>` : ''}
    <div class="ag-pills mmd-f">${f('tout', 'Tout')}${f('video', 'Vidéos')}${f('photo', 'Photos')}${f('son', 'Sons')}</div>
    ${dern.length > 1 ? `<button type="button" class="mmd-dern" onclick="mmdAjouterDernier()">${ic('plus', 14)} Ajouter les ${dern.length} nouveaux à la fin du montage</button>` : ''}
    ${L.length ? `<div class="mmd-g" id="mmdG">${L.map(tuileHtml).join('')}</div>`
      : `<div class="ag-empty mmd-vide">${MMD.lib.length ? 'Rien de ce genre ici.' : 'Aucun média pour l\'instant.'}<br>Importe des vidéos, des photos ou des sons.</div>`}
    <div class="ag-hint mmd-aide">${mobile() ? 'Touche « + » pour ajouter à la tête de lecture, ou reste appuyé sur un média puis glisse-le sur la table de montage.' : 'Clique sur « + » pour ajouter à la tête de lecture, ou glisse un média sur la table de montage : sur la piste principale (inséré à la coupe), au-dessus (incrustation) ou sur une piste son. Tu peux aussi glisser des fichiers depuis ton ordinateur.'}</div>`;
}
function vueHtml(){
  const it = MMD.vu ? itemDe(MMD.vu) : null; if(!it) return '';
  const g = genre(it), u = utilise(it), k = E(it.k);
  let media;
  if(it.manquant) media = `<div class="mmd-pv-manq">${ic('missing', 34)}<b>Fichier manquant</b><small>${E(nomDe(it))}${it.taille ? ' · ' + (it.taille / 1e6).toFixed(1).replace('.', ',') + ' Mo' : ''}</small></div>`;
  else if(g === 'video') media = `<video src="${E(it.url || '')}" controls playsinline preload="metadata"${it.thumb ? ` poster="${E(it.thumb)}"` : ''}></video>`;
  else if(g === 'son') media = `${it.onde ? `<img class="mmd-onde" src="${E(it.onde)}" alt="">` : ''}<audio src="${E(it.url || '')}" controls preload="metadata"></audio>`;
  else media = `<img src="${E(it.thumb || it.url || '')}" ${it.path && !it.thumb && !it.url ? `data-mkp="${E(it.path)}"` : ''} alt="">`;
  const infos = [g === 'video' ? 'Vidéo' : g === 'son' ? 'Son' : 'Photo', (it.audio ? it.dur : it.vdur) ? duree(it.audio ? it.dur : it.vdur) : '', u ? 'dans le montage' : 'pas encore dans le montage'].filter(Boolean).join(' · ');
  const b = (fn, icone, txt, cls) => `<button type="button" class="${cls || ''}" onclick="${fn}">${ic(icone, 14)} ${txt}</button>`;
  let act = '';
  if(it.manquant) act = b(`mmdRelier('${k}')`, 'link', 'Relier le fichier', 'on');
  else if(g === 'son') act = b(`mmdAjouter('${k}','son')`, 'plus', 'Son à la tête de lecture', 'on') + b(`mmdAjouter('${k}','musique')`, 'music', 'En musique principale');
  else act = b(`mmdAjouter('${k}','tete')`, 'plus', 'À la tête de lecture', 'on') + b(`mmdAjouter('${k}','fin')`, 'film', 'À la fin') + b(`mmdAjouter('${k}','incrust')`, 'upLayer', 'En incrustation');
  if(!u && !it.manquant) act += b(`mmdRetirer('${k}')`, 'trash', 'Retirer', 'no');
  const orig = g === 'son' ? `<label class="mmd-or">D'où vient ce son ?<select onchange="mmdOrigine('${k}',this.value)">${[['inconnu', 'Je ne sais pas'], ['moi', 'Mon son / j\'ai la licence'], ['libre', 'Son libre de droits'], ['connue', 'Chanson d\'un artiste']].map(([v, l]) => `<option value="${v}" ${(it.origine || 'inconnu') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>` : '';
  return `<div class="mmd-pv"><div class="mmd-pv-m ${g}">${media}</div>
    <div class="mmd-pv-t"><b>${E(nomDe(it))}</b><small>${infos}</small><button type="button" class="st-link" onclick="mmdVoir(null)">Fermer</button></div>
    ${it.erreur ? `<div class="ag-hint warn">${E(it.erreur)}</div>` : ''}
    <div class="mt-act">${act}</div>${orig}</div>`;
}
function panneau(){ return document.querySelector('#edInspC .ed-p[data-o="medias"]'); }
function titre(){
  const t = document.getElementById('edInspT'); if(!t || CR.edOutil !== 'medias') return;
  syncLib(); const n = MMD.lib.length;
  t.innerHTML = `${ic('mediaLib', 16)}<b>Médias</b><span>${n} élément${n > 1 ? 's' : ''}</span>`;
}
function rendreLib(){
  const p = panneau(); if(!p) return;
  titre();
  p.innerHTML = `<div class="mmd-tete"><button type="button" class="btn-primary mmd-imp" onclick="mmdImporter()">${ic('importer', 16)} Importer</button><span>Vidéos, photos, sons · plusieurs d'un coup</span></div>
    <div id="mmdVue">${vueHtml()}</div><div id="mmdGr">${grilleHtml()}</div>`;
  brancherTuiles(p);
  if(typeof mkHydrate === 'function') try { mkHydrate(p); } catch(e){}
  majBadge();
}
function rendreGrille(){
  const gr = document.getElementById('mmdGr'); if(!gr){ majBadge(); return; }
  const g = document.getElementById('mmdG'), haut = g ? g.scrollTop : 0;
  gr.innerHTML = grilleHtml(); brancherTuiles(gr); titre();
  const g2 = document.getElementById('mmdG'); if(g2 && haut) g2.scrollTop = haut;
  if(typeof mkHydrate === 'function') try { mkHydrate(gr); } catch(e){}
  majBadge();
}
window.mmdFiltre = function(f){ MMD.filtre = f; rendreGrille(); };
window.mmdVoir = function(k){
  MMD.vu = MMD.vu === k ? null : k;
  const v = document.getElementById('mmdVue'); if(v){ v.innerHTML = vueHtml(); if(typeof mkHydrate === 'function') try { mkHydrate(v); } catch(e){} }
  document.querySelectorAll('#mmdG .mmd-t').forEach(t => t.classList.toggle('on', t.dataset.k === MMD.vu));
  if(MMD.vu && !mobile()){ const v2 = document.getElementById('mmdVue'), insp = document.getElementById('edInsp'); if(v2 && insp) insp.scrollTop = 0; }
};
window.mmdOuvrir = function(silencieux){
  if(!document.querySelector('.ed.mpx')) return;
  monterOutil();
  if(CR.edOutil === 'medias' && !mobile()){ rendreLib(); return; }
  edOutil('medias', silencieux === true);
  if(silencieux === true && mobile() && typeof mpxTiroir === 'function') mpxTiroir(true);
  rendreLib();
};

// ---------- L'outil dans l'éditeur (barre de gauche, barre d'outils) ----------
function monterOutil(){
  const ed = document.querySelector('#edPortail .ed.mpx'); if(!ed) return;
  const nav = ed.querySelector('#edOutils'), C = ed.querySelector('#edInspC');
  if(nav && !nav.querySelector('[data-o="medias"]')){
    const b = document.createElement('button'); b.type = 'button'; b.dataset.o = 'medias'; b.setAttribute('onclick', "edOutil('medias')");
    b.innerHTML = `${ic('mediaLib', 19)}<span>Médias</span>`;
    const ref = nav.querySelector('[data-o="montage"]'); if(ref) ref.insertAdjacentElement('afterend', b); else nav.insertBefore(b, nav.firstChild);
    b.classList.toggle('on', CR.edOutil === 'medias');
  }
  if(C && !C.querySelector('.ed-p[data-o="medias"]')){ const p = document.createElement('div'); p.className = 'ed-p'; p.dataset.o = 'medias'; p.style.display = CR.edOutil === 'medias' ? '' : 'none'; C.appendChild(p); }
  const def = ed.querySelector('#mpxBarre .mpx-defile');
  if(def && !def.querySelector('#mmdB')){
    def.insertAdjacentHTML('afterbegin', `<button type="button" id="mmdB" class="mpx-b" onclick="mmdOuvrir()" title="Médias : importer et ajouter des vidéos, photos, sons">${ic('mediaLib', 19)}<span>Médias</span><em class="mmd-badge" id="mmdBadge"></em></button><i class="mpx-sep"></i>`);
  }
  const mon = ed.querySelector('#mpxMon');
  if(mon && !mon.querySelector('#mmdFsB')){
    mon.insertAdjacentHTML('beforeend', `<button type="button" class="mpx-m mmd-q" id="mmdQB" onclick="mmdQualite()" title="Qualité de l'aperçu">${qualCourt()}</button><button type="button" class="mpx-m" id="mmdFsB" onclick="mmdPleinEcran()" title="Aperçu plein écran">${ic('expand', 18)}</button>`);
  }
  // Le « + » au bout de la piste ouvre la bibliothèque
  const plus = ed.querySelector('#mtPiste .mt-plus');
  if(plus && !plus.mmd){ plus.mmd = true; plus.removeAttribute('onclick'); plus.title = 'Ajouter des médias'; plus.onclick = e => { e.preventDefault(); e.stopPropagation(); mmdOuvrir(); }; }
  majBadge(); marquerManquants(); titresRaccourcis();
}
function majBadge(){
  const b = document.getElementById('mmdBadge'); if(!b) return;
  const n = manquants().length; b.textContent = n ? String(n) : ''; b.style.display = n ? '' : 'none';
  b.title = n ? n + ' fichier' + (n > 1 ? 's' : '') + ' manquant' + (n > 1 ? 's' : '') : '';
}
// Le titre du panneau
const outilBase = window.edOutil;
window.edOutil = function(id){
  if(id === 'medias') monterOutil();
  const r = outilBase.apply(this, arguments);
  if(id === 'medias') rendreLib();
  return r;
};

// ============================================================
// 4. GLISSER UN MÉDIA VERS LA TABLE DE MONTAGE
// ============================================================
function brancherTuiles(root){
  root.querySelectorAll('.mmd-t').forEach(el => {
    el.onpointerdown = e => appui(e, el);
    el.oncontextmenu = e => { if(e.pointerType !== 'mouse') e.preventDefault(); };
  });
}
function appui(e, el){
  if(e.button > 0 || e.target.closest('button')) return;
  const d = { k: el.dataset.k, id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, el, actif: false, touch: e.pointerType !== 'mouse', timer: 0 };
  annulerDrag(); MMD.drag = d;
  if(d.touch) d.timer = setTimeout(() => { if(MMD.drag === d && !d.actif) lancer(d); }, 360);
  document.addEventListener('pointermove', bouger, true);
  document.addEventListener('pointerup', lacher, true);
  document.addEventListener('pointercancel', annule, true);
}
function oublier(){ document.removeEventListener('pointermove', bouger, true); document.removeEventListener('pointerup', lacher, true); document.removeEventListener('pointercancel', annule, true); }
function lancer(d){
  const it = itemDe(d.k); if(!it){ annulerDrag(); return; }
  if(it.manquant){ agToast('Ce fichier est manquant : relie-le d\'abord', 'info'); annulerDrag(); return; }
  d.actif = true; vibre(15);
  const g = document.createElement('div'); g.className = 'mmd-ghost'; g.innerHTML = vignette(it) + `<b>${E(nomDe(it))}</b>`;
  document.body.appendChild(g); d.ghost = g;
  const m = document.createElement('div'); m.className = 'mmd-mark'; m.innerHTML = '<i></i><span></span>'; m.style.display = 'none'; document.body.appendChild(m); d.mark = m;
  document.body.classList.add('mmd-glisse');
  // Téléphone : le tiroir se range pour voir la table de montage
  if(mobile() && MPX.tiroir && typeof mpxTiroir === 'function') mpxTiroir(false);
  placerGhost(d);
}
function placerGhost(d){ if(d.ghost){ d.ghost.style.left = d.x + 'px'; d.ghost.style.top = d.y + 'px'; } }
function bouger(e){
  const d = MMD.drag; if(!d || e.pointerId !== d.id) return;
  d.x = e.clientX; d.y = e.clientY;
  if(!d.actif){
    const dist = Math.hypot(d.x - d.x0, d.y - d.y0);
    if(d.touch){ if(dist > 10) annulerDrag(); return; }   // le doigt défile la liste
    if(dist < 6) return;
    lancer(d);
  }
  e.preventDefault();
  placerGhost(d);
  const it = itemDe(d.k); d.cible = it ? cibleA(d.x, d.y, it) : null;
  montrerCible(d);
  defilerBord(d);
}
function annule(e){ const d = MMD.drag; if(!d || (e && e.pointerId !== d.id)) return; annulerDrag(); }
function annulerDrag(){
  const d = MMD.drag; if(!d) return;
  clearTimeout(d.timer); cancelAnimationFrame(d.raf || 0);
  if(d.ghost) d.ghost.remove(); if(d.mark) d.mark.remove();
  document.body.classList.remove('mmd-glisse');
  MMD.drag = null; oublier();
}
function lacher(e){
  const d = MMD.drag; if(!d || e.pointerId !== d.id) return;
  const actif = d.actif, cible = d.cible, k = d.k;
  annulerDrag();
  if(!actif){ if(!e.target.closest || !e.target.closest('button')) mmdVoir(k); return; }
  e.preventDefault(); e.stopPropagation();
  MPX.bloqueClic = Date.now(); MPB.bloque = Date.now();
  if(cible) poser([k], cible);
}
// Où le média tomberait-il ?
function dansRect(x, y, r){ return r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }
function cibleA(x, y, it){
  const w = wrap(), pi = piste(); if(!w || !pi) return null;
  const wr = w.getBoundingClientRect();
  if(!dansRect(x, y, wr)){
    const pv = document.querySelector('#edScene .cr-prev');
    if(pv && dansRect(x, y, pv.getBoundingClientRect())) return it.audio ? { type: 'son', t: AN.t, ecran: true } : { type: 'tete', t: AN.t, ecran: true };
    return null;
  }
  const pr = pi.getBoundingClientRect(), pps = MPB.pps || 40, x0 = MPB.x0 || 0;
  let t = Math.max(0, (x - pr.left - x0) / pps);
  // Aimant : tête de lecture et coupes
  if(MPB.aimant){
    const S = (AN.plan || planNow()).segs, pts = [AN.t, 0].concat(S.map(s => s.t0), S.length ? [S[S.length - 1].t1] : []);
    let best = null, ecart = 9 / pps; pts.forEach(p => { const e2 = Math.abs(p - t); if(e2 < ecart){ ecart = e2; best = p; } });
    if(best != null) t = best;
  }
  const yRel = y - pr.top, L = MPB.lignes || [], yM = MPB.yMain || 0, hM = 64;
  if(it.audio){
    const l = L.find(l2 => l2.type === 'audio' && yRel >= l2.y && yRel < l2.y + l2.h);
    return { type: 'son', t, piste: l ? l.p.id : null };
  }
  if(yRel < yM - 2){
    const l = L.find(l2 => l2.type === 'video' && yRel >= l2.y && yRel < l2.y + l2.h);
    return { type: 'incrust', t, piste: l ? l.p.id : null };
  }
  if(yRel > yM + hM + 4 && L.some(l2 => l2.type !== 'video' && yRel >= l2.y)) return { type: 'incrust', t, piste: null, bas: true };
  const index = indexA(t);
  return { type: 'principale', index, t: tempsIndex(index) };
}
function montrerCible(d){
  const m = d.mark, c = d.cible, w = wrap(), pi = piste(); if(!m) return;
  if(!c || c.ecran || !w || !pi){
    m.style.display = 'none';
    if(d.ghost) d.ghost.classList.toggle('ok', !!(c && c.ecran));
    if(d.ghost) d.ghost.dataset.txt = c && c.ecran ? (c.type === 'son' ? 'Son à la tête de lecture' : 'À la tête de lecture') : '';
    return;
  }
  const wr = w.getBoundingClientRect(), pr = pi.getBoundingClientRect();
  const x = pr.left + (MPB.x0 || 0) + c.t * (MPB.pps || 40);
  m.style.display = ''; m.style.left = Math.round(clamp(x, wr.left, wr.right)) + 'px'; m.style.top = Math.round(wr.top) + 'px'; m.style.height = Math.round(wr.height) + 'px';
  m.className = 'mmd-mark ' + c.type;
  const txt = c.type === 'principale' ? 'Insérer ici · ' + tcCourt(c.t) : c.type === 'son' ? 'Son à ' + tcCourt(c.t) : c.bas ? 'Les photos vont au-dessus : incrustation à ' + tcCourt(c.t) : 'Incrustation à ' + tcCourt(c.t);
  m.querySelector('span').textContent = txt;
  if(d.ghost){ d.ghost.classList.add('ok'); d.ghost.dataset.txt = ''; }
}
function defilerBord(d){
  cancelAnimationFrame(d.raf || 0);
  const w = wrap(); if(!w || !d.cible || d.cible.ecran) return;
  const r = w.getBoundingClientRect(), bord = 40;
  let v = 0; if(d.x < r.left + bord) v = -Math.ceil((r.left + bord - d.x) / 4); else if(d.x > r.right - bord) v = Math.ceil((d.x - (r.right - bord)) / 4);
  if(!v) return;
  const tour = () => { if(MMD.drag !== d) return; w.scrollLeft += v; const it = itemDe(d.k); d.cible = it ? cibleA(d.x, d.y, it) : null; montrerCible(d); d.raf = requestAnimationFrame(tour); };
  d.raf = requestAnimationFrame(tour);
}
// Pendant le glisser au doigt, la page ne défile pas
document.addEventListener('touchmove', e => { if(MMD.drag && MMD.drag.actif && e.cancelable) e.preventDefault(); }, { passive: false });

// ---------- Fichiers glissés depuis l'ordinateur ----------
function aDesFichiers(e){ const t = e.dataTransfer && e.dataTransfer.types; return !!t && [...t].includes('Files'); }
document.addEventListener('dragover', e => {
  if(!pro() || !aDesFichiers(e)) return;
  e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
  document.body.classList.add('mmd-depot');
  const w = wrap(); if(w) w.classList.toggle('mmd-depot-ici', dansRect(e.clientX, e.clientY, w.getBoundingClientRect()));
  clearTimeout(MMD.depotT); MMD.depotT = setTimeout(finDepot, 400);
});
function finDepot(){ document.body.classList.remove('mmd-depot'); const w = wrap(); if(w) w.classList.remove('mmd-depot-ici'); }
document.addEventListener('drop', e => {
  if(!pro() || !aDesFichiers(e) || e.defaultPrevented) return;
  e.preventDefault(); finDepot();
  const files = [...(e.dataTransfer.files || [])]; if(!files.length) return;
  const w = wrap();
  let ou = null;
  if(w && dansRect(e.clientX, e.clientY, w.getBoundingClientRect())){
    const audio = files.every(f => typeDe(f) === 'son');
    ou = cibleA(e.clientX, e.clientY, { audio });
  }
  mmdFichiers(files, ou);
});

// ============================================================
// 5. FICHIERS MANQUANTS
// ------------------------------------------------------------
// Un brouillon rouvert sur un appareil où un fichier n'est plus là :
// au lieu de disparaître du montage, le plan reste, en gris, marqué
// « Fichier manquant ». « Relier » remet le bon fichier.
// ============================================================
const IMG_MANQ = {};
function imageManquante(nom){
  const k = String(nom || ''); if(IMG_MANQ[k]) return IMG_MANQ[k];
  const c = document.createElement('canvas'); c.width = 640; c.height = 640;
  const g = c.getContext('2d');
  g.fillStyle = '#2a2f33'; g.fillRect(0, 0, 640, 640);
  g.strokeStyle = '#e5484d'; g.lineWidth = 10; g.setLineDash([26, 18]); g.strokeRect(30, 30, 580, 580); g.setLineDash([]);
  g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.font = 'bold 52px Inter, sans-serif'; g.fillText('Fichier manquant', 320, 300);
  g.fillStyle = '#b8c0c4'; g.font = '30px Inter, sans-serif'; g.fillText(k.length > 30 ? k.slice(0, 28) + '...' : k, 320, 360);
  g.font = '26px Inter, sans-serif'; g.fillText('Médias > Relier', 320, 420);
  const img = new Image(); img.src = c.toDataURL('image/png');
  IMG_MANQ[k] = { img, url: img.src };
  return IMG_MANQ[k];
}
function remplacant(e){
  const im = imageManquante(e.nomF || 'fichier');
  const p = { k: e.k, src: 'fichier', file: null, url: im.url, thumb: im.url, manquant: true, nomF: e.nomF || null, taille: e.taille || null, pl: e.pl || null, px: e.px || null, mVideo: !!e.video, vdur: e.vdur || null };
  try { if(typeof CR_IMG !== 'undefined') CR_IMG[e.k] = im.img; } catch(er){}
  return p;
}
function manquants(){
  const L = [];
  CR.photos.forEach(p => { if(p && p.manquant) L.push({ genre: p.mVideo ? 'video' : 'photo', nom: p.nomF || 'fichier', p }); });
  const M = ml();
  if(M) (anVid().sons || []).forEach(s => { if(s.fid && !M.buf[s.id] && !s.url && !L.some(x => x.s && x.s.fid === s.fid)) L.push({ genre: 'son', nom: s.nom || 'son', s }); });
  if(MMD.musManquante && !anVid().musique) L.push({ genre: 'musique', nom: MMD.musManquante.nom || 'musique', mus: MMD.musManquante });
  return L;
}
window.mmdManquants = manquants;
// Reprise d'un brouillon : on retient ce qu'il contenait
if(typeof window.brReprendre === 'function'){
  const reprendreBase = window.brReprendre;
  window.brReprendre = async function(id){
    nouveauProjet();
    let r = null; try { r = typeof BR !== 'undefined' ? await BR.get('brouillons', id) : null; } catch(e){}
    if(!r) r = (CR.brouillons || []).find(x => x.id === id) || null;
    MMD.reprise = { id, r, photos: CR.photos, fait: false };
    let res;
    try { res = await reprendreBase.apply(this, arguments); }
    finally {
      const rep = MMD.reprise; MMD.reprise = null;
      try {
        const rr = rep && rep.r;
        if(rr && rr.musique && rr.musique.cle && !anVid().musique) MMD.musManquante = { nom: rr.musique.nom || 'musique', debut: (rr.vid || {}).debut || 0 };
        if(CR.vue === 'edit') setTimeout(() => { monterOutil(); avertir(); }, 700);
      } catch(e){ console.warn('montage-medias', e); }
    }
    return res;
  };
}
if(typeof window.blAvantReprendre === 'function'){
  const blBase = window.blAvantReprendre;
  window.blAvantReprendre = async function(){ const r = await blBase.apply(this, arguments); if(MMD.reprise && r) MMD.reprise.r = r; return r; };
}
// Au premier affichage du brouillon : les fichiers absents gardent leur place
function completerReprise(){
  const rep = MMD.reprise; if(!rep || rep.fait || !rep.r || CR.photos === rep.photos) return;
  rep.fait = true;
  const rec = rep.r.photos || []; if(!rec.length) return;
  const la = new Map(CR.photos.map(p => [p.k, p]));
  if(!rec.some(e => e.src === 'fichier' && !la.has(e.k))) return;
  const P = [], C = [];
  rec.forEach((e, i) => {
    const p = la.get(e.k) || (e.src === 'fichier' ? remplacant(e) : null); if(!p) return;
    P.push(p); C.push(Object.assign({ x: 0, y: 0, z: 1 }, (rep.r.crop || [])[i] || {}));
    la.delete(e.k);
  });
  la.forEach(p => { P.push(p); C.push({ x: 0, y: 0, z: 1 }); });
  CR.photos = P; CR.crop = C;
}
function avertir(){
  if(!pro()) return;
  const L = manquants(), cle = (CR.brouillonId || '') + ':' + L.map(x => x.nom).join('|');
  majBadge(); marquerManquants();
  if(!L.length || MMD.averti === cle) return;
  MMD.averti = cle;
  agToast(`${L.length} fichier${L.length > 1 ? 's' : ''} manquant${L.length > 1 ? 's' : ''} sur cet appareil : Médias > Relier`, 'info');
}
// Les plans dont le fichier manque sont marqués dans la table de montage
function marquerManquants(){
  const pi = piste(); if(!pi) return;
  const plan = AN.plan || planNow();
  pi.querySelectorAll('.mt-clip[data-n]').forEach(el => { const sg = plan.segs[Number(el.dataset.n)], p = sg && !sg.vide ? CR.photos[sg.i] : null; el.classList.toggle('mmd-manq', !!(p && p.manquant)); });
  const V = anVid(), M = ml();
  pi.querySelectorAll('.mpb-row [data-id]').forEach(el => {
    const id = el.dataset.id; let manq = false;
    (V.pistes || []).forEach(p => (p.clips || []).forEach(c => { if(String(c.id) === id){ const ph = CR.photos.find(x => x.k === c.k); if(ph && ph.manquant) manq = true; } }));
    (V.sons || []).forEach(s => { if(String(s.id) === id && s.fid && M && !M.buf[s.id] && !s.url) manq = true; });
    el.classList.toggle('mmd-manq', manq);
  });
}
// Les sons importés reviennent avec le brouillon (gardés sur l'appareil)
if(typeof anPreparer === 'function'){
  const prepBase = anPreparer;
  anPreparer = async function(){
    const r = await prepBase.apply(this, arguments);
    try {
      const M = ml(); if(!M || typeof BR === 'undefined') return r;
      for(const s of anVid().sons || []){
        if(!s.fid || M.buf[s.id]) continue;
        const it = itemDe(s.fid);
        if(it && it.buf){ M.buf[s.id] = it.buf; continue; }
        const b = await BR.get('fichiers', 'son:' + s.fid).catch(() => null); if(!b) continue;
        const f = b instanceof File ? b : new File([b], (s.nom || 'son') + '.' + ((b.type || '').split('/')[1] || 'mp3'), { type: b.type || 'audio/mpeg' });
        const nv = { k: s.fid, audio: true, nom: s.nom, src: 'fichier', file: f, url: URL.createObjectURL(f), nomF: f.name, taille: f.size, origine: s.origine || 'inconnu' };
        await decoderSon(nv);
        if(nv.buf){ (anVid().sons || []).forEach(x => { if(x.fid === s.fid) M.buf[x.id] = nv.buf; }); if(!MMD.lib.some(x => x.k === nv.k)) MMD.lib.push(nv); }
      }
      // Sons de la bibliothèque perdus : on les montre dans la bibliothèque
      (anVid().sons || []).forEach(s => { if(s.fid && !M.buf[s.id] && !s.url && !MMD.lib.some(x => x.k === s.fid)) MMD.lib.push({ k: s.fid, audio: true, nom: s.nom, nomF: s.nom, manquant: true }); });
      setTimeout(() => { if(pro()){ majBadge(); marquerManquants(); rendreGrille(); } }, 0);
    } catch(e){ console.warn('montage-medias', e); }
    return r;
  };
}

// ---------- Relier les fichiers ----------
window.mmdRelier = function(k){
  const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = !k; inp.style.display = 'none';
  const cible = k ? itemDe(k) : null;
  inp.accept = cible ? (cible.audio ? 'audio/*' : cible.mVideo ? 'video/*' : 'image/*') : 'image/*,video/*,audio/*';
  inp.onchange = async () => { const F = [...(inp.files || [])]; inp.remove(); if(F.length) await relier(F, k); };
  document.body.appendChild(inp); inp.click();
};
function correspond(liste, f){
  return liste.find(x => x.nomF && x.nomF === f.name && (!x.taille || x.taille === f.size)) || liste.find(x => x.taille && x.taille === f.size) || liste.find(x => x.nomF && x.nomF.replace(/\.[^.]+$/, '') === f.name.replace(/\.[^.]+$/, '')) || (liste.length === 1 ? liste[0] : null);
}
async function relier(F, k){
  let n = 0;
  const forcer = k ? itemDe(k) : null;
  for(const f of F){
    const type = typeDe(f); if(!type) continue;
    if(type === 'son'){
      const L = manquants().filter(x => x.genre === 'son' || x.genre === 'musique').map(x => x.s ? { s: x.s, nomF: x.s.nom, nom: x.s.nom } : { mus: x.mus, nomF: x.mus.nom });
      const c = forcer && forcer.audio ? L.find(x => x.s && x.s.fid === forcer.k) : (L.find(x => x.nomF && f.name.replace(/\.[^.]+$/, '').startsWith(String(x.nomF).slice(0, 30))) || (L.length === 1 ? L[0] : null));
      if(!c) continue;
      if(c.mus){
        const debut = c.mus.debut || 0, info = anVid().musInfo; window.ML_SANS_QUESTION = true;
        try { await anChoisirMusique([f]); } finally { window.ML_SANS_QUESTION = false; }
        if(anVid().musique){ anVid().debut = debut; if(info) anVid().musInfo = info; if(typeof anCalculerBeats === 'function') anCalculerBeats(); MMD.musManquante = null; n++; }
        continue;
      }
      const it = { k: c.s.fid, audio: true, nom: c.s.nom, src: 'fichier', file: f, url: URL.createObjectURL(f), nomF: f.name, taille: f.size, origine: c.s.origine || 'inconnu' };
      await decoderSon(it); if(!it.buf) continue;
      const M = ml(); (anVid().sons || []).forEach(s => { if(s.fid === it.k) M.buf[s.id] = it.buf; });
      MMD.lib = MMD.lib.filter(x => x.k !== it.k); MMD.lib.push(it); garderSon(it); n++;
      continue;
    }
    const L = CR.photos.filter(p => p.manquant && (type === 'video') === !!p.mVideo);
    const p = forcer && forcer.manquant && !forcer.audio ? forcer : correspond(L, f);
    if(!p || !p.manquant) continue;
    p.file = f; p.url = URL.createObjectURL(f); p.nomF = f.name; p.taille = f.size; p.proxy = false;
    delete p.manquant;
    try { if(typeof CR_IMG !== 'undefined') delete CR_IMG[p.k]; if(typeof CR_IMG_HD !== 'undefined') delete CR_IMG_HD[p.k]; } catch(e){}
    if(type === 'video'){
      p.video = true; p.thumb = ''; delete p.mVideo;
      if(typeof RV !== 'undefined'){ Object.keys(RV.els || {}).forEach(c => { if(c.startsWith(p.k + '@')) delete RV.els[c]; }); if(RV.base) delete RV.base[p.k]; }
      if(typeof rvNouveau === 'function') await rvNouveau(p).catch(() => {});
    } else { p.video = false; p.thumb = p.url; delete p.mVideo; }
    n++;
  }
  const reste = manquants().length;
  agToast(n ? `${n} fichier${n > 1 ? 's' : ''} relié${n > 1 ? 's' : ''}${reste ? ` · encore ${reste} manquant${reste > 1 ? 's' : ''}` : ' · tout est là'}` : 'Aucun fichier reconnu : vérifie que ce sont les bons (même nom ou même taille)', n ? 'success' : 'info');
  if(n){ if(typeof anPreparer === 'function') await anPreparer(false); MMD.averti = ''; mtMaj(true); rendreLib(); }
}
// Avant l'export : on prévient
if(typeof anExporter === 'function'){
  const expBase = anExporter;
  anExporter = async function(){
    const L = manquants();
    if(L.length && CR.modele && mtEstSeq(CR.modele)){
      const noms = L.slice(0, 5).map(x => '• ' + x.nom).join('\n');
      const ok = await agConfirm(`${L.length} fichier${L.length > 1 ? 's manquent' : ' manque'} :\n${noms}\n\nIls apparaîtront en gris (ou sans son) dans la vidéo. Relie-les d'abord pour une vidéo complète.`, { ok: 'Relier les fichiers', no: 'Exporter quand même' });
      if(ok){ mmdOuvrir(); mmdRelier(); return; }
    }
    return expBase.apply(this, arguments);
  };
}

// ============================================================
// 6. APERÇU : QUALITÉ ET PLEIN ÉCRAN
// ============================================================
function qualDe(){ return QUAL.find(q => q[0] === MMD.qual) || QUAL[1]; }
function qualCourt(){ const q = qualDe(); return `<span class="mmd-ql">${Math.round(1080 * q[2])}p</span>`; }
function appliquerQualite(redessiner){
  const cv = document.getElementById('anCanvas'); if(!cv || !CR.modele) return;
  const d = crDims(CR.fmt, qualDe()[2]);
  if(cv.width !== d.w || cv.height !== d.h){ cv.width = d.w; cv.height = d.h; if(redessiner !== false && typeof anApercuUneFois === 'function') anApercuUneFois(); }
  const b = document.getElementById('mmdQB'); if(b) b.innerHTML = qualCourt();
  const b2 = document.getElementById('mmdFsQ'); if(b2) b2.innerHTML = qualCourt();
}
window.mmdQualite = function(k){
  if(k){ MMD.qual = k; lsSet('mmd.qualite', k); agCloseSheet('mmdQS'); appliquerQualite(); agToast('Aperçu : ' + qualDe()[1] + ' (' + Math.round(1080 * qualDe()[2]) + 'p)', 'info'); return; }
  if(MMD.fs){ const i = QUAL.findIndex(q => q[0] === MMD.qual); mmdQualite(QUAL[(i + 1) % QUAL.length][0]); return; }
  agSheet('mmdQS', `<h3>Qualité de l'aperçu</h3>
    <div class="ag-hint" style="margin-top:0">Seulement pour l'écran de montage : la vidéo exportée garde la qualité choisie dans Exporter.</div>
    <div class="mpx-pl">${QUAL.map(([id, nom, , sous]) => `<button type="button" class="mpx-pi ${MMD.qual === id ? 'on' : ''}" onclick="mmdQualite('${id}')">${ic(MMD.qual === id ? 'check' : 'hd', 18)}<div><b>${nom}</b><small>${sous}</small></div></button>`).join('')}</div>`);
};
// La qualité est remise à chaque affichage de l'éditeur
const vueBase = anVueEdit;
anVueEdit = function(){
  const h = vueBase.apply(this, arguments);
  try {
    if(!CR.modele || !mtEstSeq(CR.modele)) return h;
    const d = crDims(CR.fmt, qualDe()[2]);
    return h.replace(/(<canvas id="anCanvas" width=")\d+(" height=")\d+"/, `$1${d.w}$2${d.h}"`);
  } catch(e){ return h; }
};

// ---------- Plein écran ----------
function fsApi(){ const el = document.documentElement; return el.requestFullscreen ? 'std' : el.webkitRequestFullscreen ? 'wk' : ''; }
function fsElement(){ return document.fullscreenElement || document.webkitFullscreenElement || null; }
window.mmdPleinEcran = function(on){
  on = on == null ? !MMD.fs : !!on;
  if(on === MMD.fs) return;
  if(on){
    if(!document.querySelector('#edScene .cr-prev')) return;
    MMD.fs = true; document.body.classList.add('mmd-fs');
    const bar = document.createElement('div'); bar.id = 'mmdFs';
    bar.innerHTML = `<div class="mmd-fs-tap" id="mmdFsTap"></div>
      <div class="mmd-fs-bar">
        <input type="range" id="mmdFsR" min="0" max="1" step="0.01" value="0" oninput="anAller(this.value)">
        <div class="mmd-fs-row">
          <button type="button" onclick="mpxImage&&mpxImage(-1)" title="Image précédente">${ic('frameBack', 20)}</button>
          <button type="button" class="mmd-fs-play" id="mmdFsP" onclick="anLecture()" title="Lecture / pause">${ic(AN.lecture ? 'pause' : 'play', 24)}</button>
          <button type="button" onclick="mpxImage&&mpxImage(1)" title="Image suivante">${ic('frameFwd', 20)}</button>
          <span class="mmd-fs-tc" id="mmdFsTc"></span>
          <button type="button" class="mmd-fs-q" id="mmdFsQ" onclick="mmdQualite()" title="Qualité de l'aperçu (touche pour changer)">${qualCourt()}</button>
          <button type="button" onclick="mmdPleinEcran(false)" title="Quitter le plein écran (Échap)">${ic('shrink', 20)}</button>
        </div></div>`;
    document.body.appendChild(bar);
    const tap = bar.querySelector('#mmdFsTap');
    tap.onclick = () => { anLecture(); montrerBarre(); };
    bar.onpointermove = () => montrerBarre();
    if(fsApi()){ try { const el = document.documentElement, p = fsApi() === 'std' ? el.requestFullscreen() : el.webkitRequestFullscreen(); if(p && p.catch) p.catch(() => {}); } catch(e){} }
    montrerBarre(); majFs();
    clearInterval(MMD.fsI); MMD.fsI = setInterval(majFs, 120);
    setTimeout(() => { try { anApercuUneFois(); } catch(e){} }, 60);
  } else {
    MMD.fs = false; document.body.classList.remove('mmd-fs', 'mmd-fs-calme');
    clearInterval(MMD.fsI); clearTimeout(MMD.fsT);
    const bar = document.getElementById('mmdFs'); if(bar) bar.remove();
    if(fsElement()){ try { const p = document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen && document.webkitExitFullscreen(); if(p && p.catch) p.catch(() => {}); } catch(e){} }
    setTimeout(() => { window.dispatchEvent(new Event('resize')); try { anApercuUneFois(); } catch(e){} }, 80);
  }
  const b = document.getElementById('mmdFsB'); if(b) b.innerHTML = ic(MMD.fs ? 'shrink' : 'expand', 18);
};
function montrerBarre(){
  document.body.classList.remove('mmd-fs-calme');
  clearTimeout(MMD.fsT); MMD.fsT = setTimeout(() => { if(MMD.fs && AN.lecture) document.body.classList.add('mmd-fs-calme'); }, 2600);
}
function majFs(){
  if(!MMD.fs) return;
  if(!document.querySelector('#edScene .cr-prev')){ mmdPleinEcran(false); return; }
  const D = (AN.plan || planNow()).D;
  const r = document.getElementById('mmdFsR'); if(r){ r.max = D; if(document.activeElement !== r) r.value = AN.t; }
  const t = document.getElementById('mmdFsTc'); if(t) t.textContent = tc(AN.t) + ' / ' + tc(D);
  const p = document.getElementById('mmdFsP'), lect = !!AN.lecture; if(p && p.dataset.l !== String(lect)){ p.dataset.l = String(lect); p.innerHTML = ic(lect ? 'pause' : 'play', 24); if(!lect) montrerBarre(); }
}
['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => document.addEventListener(ev, () => { if(!fsElement() && MMD.fs) mmdPleinEcran(false); }));

// ============================================================
// 7. RACCOURCIS (modifiables, avec ceux des lots A et B)
// ============================================================
const MMD_ACTIONS = [
  ['medias', 'Ouvrir les médias (bibliothèque)', ['Shift+M'], () => mmdOuvrir()],
  ['importer', 'Importer des vidéos, photos, sons', ['Ctrl+I'], () => mmdImporter()],
  ['pleinEcran', 'Aperçu plein écran', ['Shift+F'], () => mmdPleinEcran()],
  ['qualite', 'Changer la qualité de l\'aperçu', ['Shift+Q'], () => { const i = QUAL.findIndex(q => q[0] === MMD.qual); mmdQualite(QUAL[(i + 1) % QUAL.length][0]); }]
];
function touches(){ const perso = lsGet('mmd.raccourcis', {}) || {}, o = {}; MMD_ACTIONS.forEach(([id, , def]) => { o[id] = Array.isArray(perso[id]) ? perso[id] : def.slice(); }); return o; }
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
function joli(c){ return String(c).split('+').map(x => NOMS[x] || x).join(' + '); }
function touchesTxt(id){ return (touches()[id] || []).map(joli).join(' ou '); }
function titresRaccourcis(){
  const T = (id, a, base) => { const b = document.getElementById(id); if(!b) return; const k = touchesTxt(a); b.title = base + (k ? ' (' + k + ')' : ''); };
  T('mmdB', 'medias', 'Médias : importer et ajouter des vidéos, photos, sons');
  T('mmdFsB', 'pleinEcran', 'Aperçu plein écran');
  T('mmdQB', 'qualite', 'Qualité de l\'aperçu');
}
window.addEventListener('keydown', e => {
  if(MPX.capture) return;
  if(MMD.fs && e.key === 'Escape'){ e.preventDefault(); e.stopImmediatePropagation(); mmdPleinEcran(false); return; }
  if(!pro()) return;
  if(typeof RT !== 'undefined' && RT.tap) return;
  const t = e.target, tag = (t && t.tagName) || '';
  if(/INPUT|TEXTAREA|SELECT/.test(tag) && !(tag === 'INPUT' && /range|checkbox|radio|button/.test(t.type || ''))) return;
  if((t && t.isContentEditable) || document.querySelector('.ag-dlg-bg, .ag-sheet')) return;
  if(e.key === 'Escape' && MMD.drag){ e.stopImmediatePropagation(); annulerDrag(); return; }
  const c = combo(e), T0 = touches(), a = c && MMD_ACTIONS.find(([id]) => (T0[id] || []).includes(c));
  if(a){ e.preventDefault(); e.stopImmediatePropagation(); if(t && t.blur && tag === 'INPUT') t.blur(); a[3](); }
}, true);
if(typeof window.mpxRaccourcis === 'function'){
  const rcBase = window.mpxRaccourcis;
  window.mpxRaccourcis = function(){
    const r = rcBase.apply(this, arguments);
    try {
      const sh = document.getElementById('mpxKeysS'), kb = sh && sh.querySelector('.mpx-kb'); if(!kb) return r;
      const T0 = touches(), perso = lsGet('mmd.raccourcis', {}) || {};
      kb.insertAdjacentHTML('beforebegin', `<div class="mpx-pt">Médias et aperçu</div><div class="mpx-kl mmd-kl">${MMD_ACTIONS.map(([id, nom]) => `<div class="mpx-k ${perso[id] ? 'perso' : ''}" data-mmd="${id}"><span>${nom}</span><div class="mpx-kk">${(T0[id] || []).length ? T0[id].map(x => `<kbd>${E(joli(x))}</kbd>`).join('<small>ou</small>') : '<small>aucune</small>'}</div><button type="button" class="st-link" onclick="mmdChanger('${id}')">Changer</button></div>`).join('')}
        <div class="mpx-k"><span>Quitter le plein écran</span><div class="mpx-kk"><kbd>Échap</kbd></div><i></i></div></div>`);
    } catch(e){ console.warn('montage-medias', e); }
    return r;
  };
}
window.mmdChanger = function(id){
  const row = document.querySelector(`#mpxKeysS .mpx-k[data-mmd="${id}"]`);
  if(row){ row.classList.add('ecoute'); row.querySelector('.mpx-kk').innerHTML = '<small>Appuie sur la touche...</small>'; }
  MPX.capture = c => {
    MPX.capture = null;
    if(!c){ mpxRaccourcis(); return; }
    const perso = lsGet('mmd.raccourcis', {}) || {}, T0 = touches();
    let pris = '';
    MMD_ACTIONS.forEach(([a, nom]) => { if(a !== id && (T0[a] || []).includes(c)){ perso[a] = T0[a].filter(x => x !== c); pris = nom; } });
    // Touches déjà prises par les lots A et B
    const lotA = ['Space', 'C', 'S', 'Delete', 'Backspace', 'Shift+Delete', 'Shift+Backspace', 'Ctrl+Z', 'Ctrl+Y', 'Ctrl+Shift+Z', 'ArrowLeft', 'ArrowRight', 'Shift+ArrowLeft', 'Shift+ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'B', 'Ctrl+D', 'M', '?'];
    const lotB = ['N', 'Ctrl+A', '+', '=', '-', 'F', 'I'];
    const pA = lsGet('mpx.raccourcis', {}) || {}, pB = lsGet('mpb.raccourcis', {}) || {};
    const prise = (perso2, defauts) => Object.values(perso2).some(l => Array.isArray(l) && l.includes(c)) || (defauts.includes(c) && !Object.keys(perso2).length);
    if(prise(pA, lotA) || prise(pB, lotB)){ agToast(`${joli(c)} sert déjà à une autre action : choisis une autre touche`, 'info'); mpxRaccourcis(); return; }
    perso[id] = [c]; lsSet('mmd.raccourcis', perso);
    agToast(pris ? `${joli(c)} : retirée de « ${pris} »` : `Nouvelle touche : ${joli(c)}`, pris ? 'info' : 'success');
    mpxRaccourcis(); titresRaccourcis();
  };
};
if(typeof window.mpxRaccourcisDefaut === 'function'){
  const defBase = window.mpxRaccourcisDefaut;
  window.mpxRaccourcisDefaut = async function(){ const avantP = JSON.stringify(lsGet('mpx.raccourcis', {})); const r = await defBase.apply(this, arguments); if(JSON.stringify(lsGet('mpx.raccourcis', {})) !== avantP || avantP === '{}'){ lsSet('mmd.raccourcis', {}); if(document.getElementById('mpxKeysS')) mpxRaccourcis(); titresRaccourcis(); } return r; };
}

// ============================================================
// 8. MISE EN PLACE
// ============================================================
// « Plus » : les outils des médias aussi
if(typeof window.mpxPlus === 'function'){
  const plusBase = window.mpxPlus;
  window.mpxPlus = function(){
    const r = plusBase.apply(this, arguments);
    try {
      const pl = document.querySelector('#mpxPlusS .mpx-pl'); if(!pl) return r;
      const it = (icone, txt, sous, fn) => `<button type="button" class="mpx-pi" onclick="agCloseSheet('mpxPlusS');${fn}">${ic(icone, 18)}<div><b>${txt}</b>${sous ? `<small>${sous}</small>` : ''}</div></button>`;
      const n = manquants().length;
      pl.insertAdjacentHTML('afterbegin', '<div class="mpx-pt">Médias et aperçu</div>'
        + it('importer', 'Importer des médias', 'Vidéos, photos, sons · plusieurs d\'un coup', 'mmdImporter()')
        + it('mediaLib', 'Bibliothèque des médias', 'Miniatures, aperçu, glisser vers la table de montage', 'mmdOuvrir()')
        + (n ? it('missing', 'Relier les fichiers manquants', n + ' fichier' + (n > 1 ? 's' : '') + ' à retrouver', 'mmdOuvrir();mmdRelier()') : '')
        + it('expand', 'Aperçu plein écran', '', 'mmdPleinEcran(true)')
        + it('hd', 'Qualité de l\'aperçu', qualDe()[1] + ' · ' + Math.round(1080 * qualDe()[2]) + 'p', 'mmdQualite()'));
    } catch(e){ console.warn('montage-medias', e); }
    return r;
  };
}
// Nouveau projet : la bibliothèque repart de zéro
if(typeof crChoisirModele === 'function'){
  const choisirBase = crChoisirModele;
  crChoisirModele = function(){ if(CR.vue === 'accueil') nouveauProjet(); return choisirBase.apply(this, arguments); };
}
if(typeof window.crOuvrir === 'function'){
  const ouvrirBase = window.crOuvrir;
  window.crOuvrir = function(){ nouveauProjet(); return ouvrirBase.apply(this, arguments); };
}
// Après chaque changement de la table de montage
const edApresBase = window.edApresMt;
window.edApresMt = function(){
  const r = edApresBase.apply(this, arguments);
  try { if(pro()){ monterOutil(); if(CR.edOutil === 'medias') rendreGrille(); } } catch(e){ console.warn('montage-medias', e); }
  return r;
};
// Après chaque affichage de l'écran
const renderBase = crRender;
crRender = async function(){
  try { completerReprise(); } catch(e){ console.warn('montage-medias', e); }
  const etaitMedias = CR.edOutil === 'medias';
  const r = await renderBase.apply(this, arguments);
  try {
    if(CR.vue === 'edit' && document.querySelector('.ed.mpx')){
      syncLib(); appliquerQualite(false); monterOutil();
      // editeur.js ne connaît pas l'outil Médias : on le rouvre s'il était affiché
      if(etaitMedias || CR.edOutil === 'medias'){ edOutil('medias', true); }
      if(typeof anApercuUneFois === 'function') anApercuUneFois();
      setTimeout(() => { if(pro()){ monterOutil(); avertir(); } }, 600);
    } else if(MMD.fs) mmdPleinEcran(false);
  } catch(e){ console.warn('montage-medias', e); }
  return r;
};

// ============================================================
// 9. STYLE
// ============================================================
(function css(){
  if(document.getElementById('mmdCss')) return;
  const st = document.createElement('style'); st.id = 'mmdCss';
  st.textContent = `
.mmd-tete{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap}
.mmd-tete .mmd-imp{width:auto !important;margin:0;display:inline-flex;align-items:center;gap:6px;padding:9px 14px}
.mmd-tete span{color:var(--muted);font-size:12px}
.mmd-f{margin:0 0 8px}.mmd-f i{font-style:normal;opacity:.6;font-size:11px}
.mmd-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px}
.mmd-t{position:relative;border-radius:12px;background:var(--card2);border:1px solid var(--border);overflow:hidden;cursor:grab;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:pan-y;transition:border-color .12s}
.mmd-t:hover{border-color:var(--accent,#48A89A)}
.mmd-t.on{border-color:var(--accent,#48A89A);box-shadow:0 0 0 2px var(--accent,#48A89A) inset}
.mmd-v{aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:#0b0f10;overflow:hidden}
.mmd-v img{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none}
.mmd-ico{color:var(--muted);display:flex}
.mmd-t>b{display:block;font-size:11px;font-weight:600;color:var(--text);padding:4px 30px 5px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mmd-d{position:absolute;left:5px;bottom:28px;font-size:10px;font-weight:700;color:#fff;background:rgba(0,0,0,.62);padding:1px 5px;border-radius:6px;display:flex;align-items:center;gap:2px}
.mmd-u{position:absolute;left:5px;top:5px;width:18px;height:18px;border-radius:50%;background:var(--accent,#48A89A);color:#fff;display:flex;align-items:center;justify-content:center}
.mmd-bad{position:absolute;left:4px;top:4px;right:4px;font-size:10px;font-weight:700;color:#fff;background:#e5484d;padding:2px 5px;border-radius:6px;display:flex;align-items:center;gap:3px}
.mmd-t.manq .mmd-v{opacity:.55}
.mmd-add{position:absolute;right:4px;bottom:3px;width:26px !important;height:22px;margin:0;padding:0;border-radius:7px;border:none;background:var(--accent,#48A89A);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer}
.mmd-t.manq .mmd-add{background:#e5484d}
.mmd-dern{width:100% !important;margin:0 0 8px;padding:9px;border-radius:10px;border:1px dashed var(--accent,#48A89A);background:transparent;color:var(--accent,#48A89A);font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer}
.mmd-vide{padding:18px 8px}
.mmd-aide{margin-top:10px}
.mmd-manq-b{display:flex;align-items:center;gap:10px;padding:10px;border-radius:12px;background:rgba(229,72,77,.12);border:1px solid rgba(229,72,77,.45);color:var(--text);margin-bottom:10px}
.mmd-manq-b>svg{color:#e5484d;flex:none}.mmd-manq-b div{flex:1;min-width:0}.mmd-manq-b b{display:block;font-size:13px}.mmd-manq-b small{display:block;color:var(--muted);font-size:11px}
.mmd-manq-b button{width:auto !important;margin:0;flex:none;display:inline-flex;align-items:center;gap:5px;padding:7px 10px;border-radius:9px;border:none;background:#e5484d;color:#fff;font-weight:600;cursor:pointer}
.mmd-pv{margin-bottom:12px;padding:8px;border-radius:14px;background:var(--card2);border:1px solid var(--border)}
.mmd-pv-m{border-radius:10px;overflow:hidden;background:#000;display:flex;align-items:center;justify-content:center;min-height:60px}
.mmd-pv-m img,.mmd-pv-m video{max-width:100%;max-height:230px;display:block;object-fit:contain}
.mmd-pv-m.son{flex-direction:column;gap:6px;padding:8px;background:#0b0f10}.mmd-pv-m.son audio{width:100%}.mmd-onde{width:100%;height:48px;object-fit:fill}
.mmd-pv-manq{display:flex;flex-direction:column;align-items:center;gap:4px;padding:18px 8px;color:#e5484d;text-align:center}.mmd-pv-manq b{color:var(--text)}.mmd-pv-manq small{color:var(--muted)}
.mmd-pv-t{display:flex;align-items:baseline;gap:8px;margin:8px 2px 2px;flex-wrap:wrap}.mmd-pv-t b{color:var(--text);font-size:13px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}.mmd-pv-t small{flex:1;color:var(--muted);font-size:11px}
.mmd-pv .mt-act button{display:inline-flex;align-items:center;gap:5px}
.mmd-or{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);margin-top:6px;flex-wrap:wrap}.mmd-or select{flex:1;min-width:140px;margin:0}
.mmd-badge{position:absolute;top:2px;right:6px;min-width:16px;height:16px;padding:0 4px;border-radius:8px;background:#e5484d;color:#fff;font-size:10px;font-style:normal;font-weight:700;line-height:16px;text-align:center}
#mmdB{position:relative}
.mmd-q .mmd-ql{font-size:10.5px;font-weight:800;letter-spacing:-.2px}
.mmd-ghost{position:fixed;z-index:3000;width:74px;transform:translate(-50%,-110%);pointer-events:none;border-radius:10px;overflow:hidden;background:var(--card2);border:2px solid var(--muted);box-shadow:0 12px 30px rgba(0,0,0,.5);opacity:.92}
.mmd-ghost.ok{border-color:var(--accent,#48A89A)}
.mmd-ghost img{width:100%;height:56px;object-fit:cover;display:block}.mmd-ghost .mmd-ico{height:56px;align-items:center;justify-content:center}
.mmd-ghost b{display:block;font-size:10px;color:var(--text);padding:2px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mmd-ghost[data-txt]:not([data-txt=""])::after{content:attr(data-txt);position:absolute;left:50%;top:-22px;transform:translateX(-50%);white-space:nowrap;font-size:11px;font-weight:700;color:#fff;background:var(--accent,#48A89A);padding:2px 7px;border-radius:6px}
.mmd-ghost{overflow:visible}
.mmd-mark{position:fixed;z-index:2900;width:0;pointer-events:none}
.mmd-mark i{position:absolute;left:-1.5px;top:0;bottom:0;width:3px;border-radius:2px;background:var(--accent,#48A89A);box-shadow:0 0 10px var(--accent,#48A89A)}
.mmd-mark.incrust i{background:#f5a524;box-shadow:0 0 10px #f5a524}.mmd-mark.son i{background:#7c8cff;box-shadow:0 0 10px #7c8cff}
.mmd-mark span{position:absolute;left:6px;top:2px;white-space:nowrap;font-size:11px;font-weight:700;color:#fff;background:rgba(0,0,0,.75);padding:2px 7px;border-radius:6px}
body.mmd-glisse,body.mmd-glisse *{cursor:grabbing !important}
body.mmd-depot #edPortail::after{content:"Dépose tes vidéos, photos et sons : dans la bibliothèque, ou sur la table de montage pour les placer";position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:3000;padding:10px 16px;border-radius:12px;background:var(--accent,#48A89A);color:#fff;font-weight:700;font-size:13px;pointer-events:none;box-shadow:0 10px 30px rgba(0,0,0,.4)}
.mt-piste-w.mmd-depot-ici{outline:2px dashed var(--accent,#48A89A);outline-offset:-2px}
.mt-clip.mmd-manq,.mpb-clip.mmd-manq{outline:2px dashed #e5484d;outline-offset:-2px}
.mt-clip.mmd-manq::after{content:"Manquant";position:absolute;left:3px;top:3px;font-size:9px;font-weight:800;color:#fff;background:#e5484d;padding:1px 4px;border-radius:4px;pointer-events:none}
body.mmd-fs #edScene .cr-prev{position:fixed !important;inset:0 !important;width:100vw !important;height:100vh !important;height:100dvh !important;max-width:none !important;max-height:none !important;margin:0 !important;border-radius:0 !important;z-index:2000;background:#000 !important;box-shadow:none !important;display:flex;align-items:center;justify-content:center}
body.mmd-fs #edScene .cr-prev canvas{width:100% !important;height:100% !important;max-width:none !important;max-height:none !important;object-fit:contain;cursor:default}
#mmdFs{position:fixed;inset:0;z-index:2100;pointer-events:none}
.mmd-fs-tap{position:absolute;inset:0 0 96px 0;pointer-events:auto;cursor:pointer}
.mmd-fs-bar{position:absolute;left:0;right:0;bottom:0;pointer-events:auto;padding:10px 16px calc(12px + env(safe-area-inset-bottom));background:linear-gradient(transparent,rgba(0,0,0,.78));transition:opacity .25s}
body.mmd-fs-calme .mmd-fs-bar{opacity:0}body.mmd-fs-calme .mmd-fs-tap{cursor:none}
.mmd-fs-bar input[type=range]{width:100%;margin:0 0 8px;accent-color:var(--accent,#48A89A)}
.mmd-fs-row{display:flex;align-items:center;gap:8px;justify-content:center}
.mmd-fs-row button{width:44px !important;height:44px;margin:0;padding:0;border-radius:12px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer}
.mmd-fs-row .mmd-fs-play{width:56px !important;height:52px;background:var(--accent,#48A89A);border-color:transparent}
.mmd-fs-tc{color:#fff;font:600 14px ui-monospace,Menlo,monospace;min-width:0;margin:0 6px}
.mmd-fs-q .mmd-ql{font-size:11px}
@media(max-width:899px){
  .mmd-g{grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:6px}
  .mmd-pv-m img,.mmd-pv-m video{max-height:170px}
  .mpx-mon .mmd-q{display:none}
  .mmd-fs-tc{font-size:12px}
}`;
  document.head.appendChild(st);
})();
})();
