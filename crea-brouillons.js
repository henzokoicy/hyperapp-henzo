// ============================================================
// CREA-BROUILLONS.JS - Créations : brouillons automatiques et aperçu
// ------------------------------------------------------------
// 1. Brouillons : pendant que tu travailles (affiche, vidéo, GIF),
//    tout est gardé sur l'appareil toutes les 2 secondes : photos,
//    textes, réglages, musique. Si tu sors par accident, tu retrouves
//    ton montage dans "Mes brouillons" (reprendre, dupliquer, supprimer).
//    Rien ne part en ligne : c'est gardé dans le navigateur (IndexedDB).
// 2. Aperçu au hasard : quand tu touches un modèle, il s'affiche tout
//    de suite avec des photos prises au hasard dans tes galeries
//    (sinon tes photos envoyées, sinon des images d'exemple).
// Utilise creations.js et animations.js.
// ============================================================
(function(){
'use strict';
if(typeof CR === 'undefined') return;

// ---------- Petite base sur l'appareil ----------
const BR_DB = 'henzoCreations', BR_V = 1;
let brDbP = null;
function brDb(){
  if(brDbP) return brDbP;
  brDbP = new Promise((ok, ko) => {
    try {
      const r = indexedDB.open(BR_DB, BR_V);
      r.onupgradeneeded = () => { const db = r.result; if(!db.objectStoreNames.contains('brouillons')) db.createObjectStore('brouillons', { keyPath: 'id' }); if(!db.objectStoreNames.contains('fichiers')) db.createObjectStore('fichiers'); };
      r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error);
    } catch(e){ ko(e); }
  });
  return brDbP;
}
async function brOp(store, mode, fn){
  const db = await brDb();
  return new Promise((ok, ko) => {
    const tx = db.transaction(store, mode), st = tx.objectStore(store);
    let res; const r = fn(st); if(r) r.onsuccess = () => { res = r.result; };
    tx.oncomplete = () => ok(res); tx.onerror = () => ko(tx.error); tx.onabort = () => ko(tx.error);
  });
}
const brGet = (st, k) => brOp(st, 'readonly', s => s.get(k));
const brPut = (st, v, k) => brOp(st, 'readwrite', s => k === undefined ? s.put(v) : s.put(v, k));
const brDel = (st, k) => brOp(st, 'readwrite', s => s.delete(k));
const brTous = () => brOp('brouillons', 'readonly', s => s.getAll());

// ---------- Ce qu'on garde ----------
CR.brouillonId = CR.brouillonId || null;
CR.brouillons = CR.brouillons || [];
let brSigAvant = '', brEnCours = false;
const brFichiersGardes = new Set();
function brVid(){ return typeof AN !== 'undefined' && AN.vid ? Object.assign({}, AN.vid, { musique: AN.vid.musique ? { nom: AN.vid.musique.nom, duree: AN.vid.musique.duree } : null }) : null; }
function brPhotos(){ return CR.photos.map(p => p.src === 'fichier' ? { k: p.k, src: 'fichier' } : p.src === 'galerie' ? { k: p.k, src: 'galerie', dossier: p.dossier, f: p.f } : p.path ? { k: p.k, src: 'media', path: p.path } : p.url ? { k: p.k, src: 'url', url: p.url, thumb: p.thumb } : null).filter(Boolean); }
function brSignature(){ return JSON.stringify([CR.modele, CR.fmt, CR.cfg, brVid(), CR.photos.map(p => p.k), CR.crop]); }
function brApercu(){
  const cv = document.getElementById('anCanvas') || document.getElementById('crCanvas'); if(!cv || !cv.width) return null;
  const k = 240 / Math.max(cv.width, cv.height), c = document.createElement('canvas'); c.width = Math.round(cv.width * k); c.height = Math.round(cv.height * k);
  try { c.getContext('2d').drawImage(cv, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.7); } catch(e){ return null; }
}
async function brGarder(force){
  if(brEnCours || !CR.modele || !CR.cfg || !['edit', 'photos'].includes(CR.vue) || !CR.photos.length) return;
  if(typeof AN !== 'undefined' && AN.busy) return;
  // L'aperçu au hasard n'est gardé que si tu as commencé à le changer
  if(CR.exemple && JSON.stringify(CR.cfg) === CR.exempleSig) return;
  const sig = brSignature();
  if(!force && sig === brSigAvant) return;
  brEnCours = true;
  try {
    if(!CR.brouillonId) CR.brouillonId = 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const id = CR.brouillonId;
    // Les photos du téléphone : gardées une seule fois
    for(const p of CR.photos){
      if(p.src === 'fichier' && p.file && !brFichiersGardes.has(p.k)){ await brPut('fichiers', p.file, 'ph:' + p.k); brFichiersGardes.add(p.k); }
    }
    // La musique
    const V = typeof AN !== 'undefined' ? AN.vid : null;
    let musique = null;
    if(V && V.musique && AN.musFile){
      const cle = 'mus:' + id;
      if(AN.musFileGarde !== cle + AN.musFile.name + AN.musFile.size){ await brPut('fichiers', AN.musFile, cle); AN.musFileGarde = cle + AN.musFile.name + AN.musFile.size; }
      musique = { cle, nom: V.musique.nom, duree: V.musique.duree };
    }
    const M = crModele() || {};
    const avant = CR.brouillons.find(x => x.id === id);
    const rec = { id, nom: (CR.cfg.titre || CR.cfg.mot || M.nom || 'Création').slice(0, 60), modeleNom: M.nom || '', modele: CR.modele, fmt: CR.fmt, cfg: CR.cfg, vid: brVid(), photos: brPhotos(), crop: CR.crop,
      musique, apercu: brApercu() || (avant && avant.apercu) || null, cree: avant ? avant.cree : Date.now(), maj: Date.now(), exemple: !!CR.exemple };
    await brPut('brouillons', JSON.parse(JSON.stringify(rec)));
    brSigAvant = sig;
    const i = CR.brouillons.findIndex(x => x.id === id); if(i >= 0) CR.brouillons[i] = rec; else CR.brouillons.unshift(rec);
    brMarque();
  } catch(e){ console.warn('brouillon', e); }
  brEnCours = false;
}
// Petit signe "Gardé" en haut de l'éditeur
function brMarque(){
  let el = document.getElementById('brMarque');
  const zone = document.querySelector('#crBody .ag-back'); if(!zone) return;
  if(!el){ el = document.createElement('span'); el.id = 'brMarque'; el.className = 'br-marque'; zone.insertAdjacentElement('afterend', el); }
  el.textContent = '✓ Brouillon gardé'; el.classList.remove('vu'); void el.offsetWidth; el.classList.add('vu');
}
setInterval(() => { brGarder(false); }, 2000);
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'hidden') brGarder(false); });
window.addEventListener('pagehide', () => { brGarder(false); });

// La musique choisie est aussi gardée
if(typeof anChoisirMusique === 'function'){
  const avant = anChoisirMusique;
  anChoisirMusique = async function(files){ const f = files && files[0]; if(f) AN.musFile = f; return avant.apply(this, arguments); };
  const ret = anRetirerMusique;
  anRetirerMusique = function(){ AN.musFile = null; AN.musFileGarde = null; return ret.apply(this, arguments); };
}

// ---------- Liste, reprise, copie, suppression ----------
async function brCharger(){ try { CR.brouillons = (await brTous() || []).sort((a, b) => b.maj - a.maj); } catch(e){ CR.brouillons = CR.brouillons || []; } }
function brQuand(t){
  const m = Math.round((Date.now() - t) / 60000);
  if(m < 1) return 'à l\'instant'; if(m < 60) return 'il y a ' + m + ' min';
  const h = Math.round(m / 60); if(h < 24) return 'il y a ' + h + ' h';
  const j = Math.round(h / 24); return j === 1 ? 'hier' : 'il y a ' + j + ' jours';
}
async function brPhotosDepuis(list){
  const out = [];
  for(const p of list || []){
    if(p.src === 'fichier'){
      const b = await brGet('fichiers', 'ph:' + p.k).catch(() => null); if(!b) continue;
      const url = URL.createObjectURL(b); brFichiersGardes.add(p.k);
      out.push({ k: p.k, src: 'fichier', file: b, url, thumb: url });
    } else if(p.src === 'galerie') out.push({ k: p.k, src: 'galerie', dossier: p.dossier, f: p.f, thumb: typeof galPhotoUrl === 'function' ? galPhotoUrl(p.dossier, p.f, 'thumb') : '', url: typeof galPhotoUrl === 'function' ? galPhotoUrl(p.dossier, p.f, 'medium') : '' });
    else if(p.src === 'media') out.push({ k: p.k, src: 'media', path: p.path });
    else if(p.src === 'url') out.push({ k: p.k, src: 'url', url: p.url, thumb: p.thumb || p.url });
  }
  return out;
}
window.brReprendre = async function(id, copie){
  const r = CR.brouillons.find(x => x.id === id) || await brGet('brouillons', id).catch(() => null); if(!r) return;
  const el = crBody(); if(el) el.innerHTML = '<div class="ag-empty">Ouverture du brouillon...</div>';
  if(typeof anStop === 'function') anStop();
  CR.modele = r.modele; CR.fmt = r.fmt || 'post'; CR.cfg = Object.assign(crCfgDefaut(), r.cfg || {}); CR.slide = 0; CR.styleId = null; CR.remplace = null; CR.exemple = false;
  CR.photos = await brPhotosDepuis(r.photos);
  CR.crop = (r.crop || []).slice(0, CR.photos.length); while(CR.crop.length < CR.photos.length) CR.crop.push({ x: 0, y: 0, z: 1 });
  if(typeof AN !== 'undefined'){
    if(AN.audio){ try { AN.audio.pause(); } catch(e){} }
    AN.vid = r.vid ? Object.assign({}, r.vid, { musique: null }) : null; AN.buffer = null; AN.audio = null; AN.beats = []; AN.t = 0; AN.musFile = null; AN.musFileGarde = null;
  }
  CR.brouillonId = copie ? null : r.id;
  brSigAvant = copie ? '' : brSignature();
  const M = crModele();
  CR.vue = M && CR.photos.length >= M.min ? 'edit' : 'photos';
  // La musique revient aussi
  if(r.musique && r.musique.cle && typeof anChoisirMusique === 'function'){
    const b = await brGet('fichiers', r.musique.cle).catch(() => null);
    if(b){ const f = new File([b], (r.musique.nom || 'musique') + '.' + ((b.type || '').split('/')[1] || 'mp3'), { type: b.type || 'audio/mpeg' }); const debut = (r.vid || {}).debut || 0;
      AN.silence = true; try { await anChoisirMusique([f]); } finally { AN.silence = false; } if(AN.vid){ AN.vid.debut = debut; anCalculerBeats(); } }
  }
  if(copie){ CR.cfg.titre = CR.cfg.titre ? CR.cfg.titre + ' (copie)' : ''; await brGarder(true); agToast('Copie créée : tu peux la modifier'); }
  crRender(); window.scrollTo({ top: 0 });
};
window.brSupprimer = async function(id){
  if(!await agConfirm('Supprimer ce brouillon ?\nSes photos du téléphone et sa musique restent sur ton téléphone, seule la copie dans l\'app est effacée.', { ok: 'Supprimer', no: 'Garder' })) return;
  const r = CR.brouillons.find(x => x.id === id);
  try {
    await brDel('brouillons', id);
    if(r && r.musique && r.musique.cle) await brDel('fichiers', r.musique.cle);
    // Les photos qui ne servent plus à aucun autre brouillon
    const autres = new Set(CR.brouillons.filter(x => x.id !== id).flatMap(x => (x.photos || []).map(p => p.k)));
    for(const p of (r && r.photos) || []) if(p.src === 'fichier' && !autres.has(p.k)){ await brDel('fichiers', 'ph:' + p.k); brFichiersGardes.delete(p.k); }
  } catch(e){ agAlert('Suppression impossible : ' + (e.message || e)); return; }
  CR.brouillons = CR.brouillons.filter(x => x.id !== id);
  if(CR.brouillonId === id) CR.brouillonId = null;
  agToast('Brouillon supprimé'); crRender();
};
window.brToutSupprimer = async function(){
  if(!CR.brouillons.length) return;
  if(!await agConfirm(`Supprimer les ${CR.brouillons.length} brouillons ?`, { ok: 'Tout supprimer', no: 'Annuler' })) return;
  try { await brOp('brouillons', 'readwrite', s => s.clear()); await brOp('fichiers', 'readwrite', s => s.clear()); } catch(e){}
  CR.brouillons = []; CR.brouillonId = null; brFichiersGardes.clear(); crRender();
};
function brListeHtml(){
  const L = CR.brouillons.filter(b => !b.exemple || b.id === CR.brouillonId);
  if(!L.length) return '';
  return `<div class="cr-sec">Mes brouillons <i>${L.length}</i>${L.length > 3 ? `<button class="st-link br-tout" onclick="brToutSupprimer()">Tout supprimer</button>` : ''}</div>
    <div class="br-liste">${L.map(b => `<div class="br-c">
      <button class="br-img" onclick="brReprendre('${b.id}')">${b.apercu ? `<img src="${crE(b.apercu)}" alt="">` : crMini(b.modele)}${/^v-/.test(b.modele || '') ? '<em>▶</em>' : ''}</button>
      <div class="br-d"><b>${crE(b.nom)}</b><small>${crE(b.modeleNom || '')} · ${(b.photos || []).length} photo${(b.photos || []).length > 1 ? 's' : ''}${b.musique ? ' · avec musique' : ''} · ${brQuand(b.maj)}</small>
        <div class="br-b"><button class="on" onclick="brReprendre('${b.id}')">Reprendre</button><button onclick="brReprendre('${b.id}', true)">Dupliquer</button><button class="no" onclick="brSupprimer('${b.id}')" aria-label="Supprimer">${agIcon('trash', 14)}</button></div></div></div>`).join('')}</div>`;
}

// ---------- Aperçu avec des photos au hasard ----------
CR.hasard = CR.hasard || null;
function brMelange(a){ a = a.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
async function brReserveHasard(){
  if(CR.hasard && CR.hasard.length) return CR.hasard;
  let pool = [];
  // 1. Mes galeries
  try {
    if(typeof galApi === 'function'){
      if(typeof galPwd !== 'undefined' && !galPwd && typeof getGaleriePwd === 'function') galPwd = await getGaleriePwd();
      const liste = (typeof galList !== 'undefined' && galList.length) ? galList : await Promise.race([galApi('/api/admin/galeries'), new Promise((_, ko) => setTimeout(() => ko(new Error('lent')), 8000))]);
      const gals = brMelange((liste || []).filter(g => (g.nbPhotos || 0) > 0)).slice(0, 3);
      for(const g of gals){
        try {
          const r = await galApi('/api/admin/galeries/' + encodeURIComponent(g.code) + '/photos');
          const dossier = r.dossier || g.dossier;
          pool = pool.concat((r.photos || []).map(f => ({ k: 'g:' + dossier + '/' + f, src: 'galerie', dossier, f, thumb: galPhotoUrl(dossier, f, 'thumb'), url: galPhotoUrl(dossier, f, 'medium') })));
        } catch(e){}
        if(pool.length >= 40) break;
      }
    }
  } catch(e){}
  // 2. Mes photos envoyées
  if(pool.length < 3){
    try { const { data } = await sb.from('mk_media').select('path').order('created_at', { ascending: false }).limit(40); pool = pool.concat((data || []).map(m => ({ k: 'm:' + m.path, src: 'media', path: m.path }))); } catch(e){}
  }
  // 3. Images d'exemple dessinées
  if(pool.length < 3) pool = pool.concat(await brImagesExemple());
  CR.hasard = brMelange(pool);
  return CR.hasard;
}
async function brImagesExemple(){
  const tons = [['#2b1d17', '#c98b5e', '#f3d9b8'], ['#13262f', '#3f7f8c', '#e6c79c'], ['#2a1430', '#a0527a', '#f6c6a7'], ['#1f2a1c', '#6f8f4e', '#e9e2c2'], ['#30180f', '#d0603a', '#ffd9a0'], ['#101820', '#56637a', '#d7dde6']];
  const out = [];
  for(let i = 0; i < tons.length; i++){
    const [a, b, c] = tons[i], cv = document.createElement('canvas'); cv.width = 900; cv.height = 1125;
    const g = cv.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 900, 1125); gr.addColorStop(0, b); gr.addColorStop(1, a); g.fillStyle = gr; g.fillRect(0, 0, 900, 1125);
    const lu = g.createRadialGradient(650, 300, 20, 650, 300, 520); lu.addColorStop(0, c + 'cc'); lu.addColorStop(1, c + '00'); g.fillStyle = lu; g.fillRect(0, 0, 900, 1125);
    g.fillStyle = a + 'ee'; g.beginPath(); g.ellipse(450, 560, 150, 180, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(170, 1125); g.quadraticCurveTo(450, 680, 730, 1125); g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '600 34px Inter, sans-serif'; g.textAlign = 'center'; g.fillText('EXEMPLE ' + (i + 1), 450, 1080);
    const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.85));
    const url = URL.createObjectURL(blob);
    out.push({ k: 'x:exemple' + i, src: 'fichier', file: blob, url, thumb: url, exemple: true });
  }
  return out;
}
async function brRemplirHasard(){
  const M = crModele(); if(!M) return false;
  const pool = await brReserveHasard(); if(!pool.length) return false;
  const video = /^v-/.test(CR.modele);
  const n = Math.max(M.min, Math.min(M.max, video ? 8 : Math.max(M.min, Math.min(M.max, 4))));
  const choix = brMelange(pool).slice(0, n);
  while(choix.length < M.min) choix.push(pool[choix.length % pool.length]);
  CR.photos = choix.map((p, i) => Object.assign({}, p, choix.indexOf(p) !== i ? { k: p.k + '#' + i } : {}));
  CR.crop = CR.photos.map(() => ({ x: 0, y: 0, z: 1 }));
  return true;
}
window.brAutresHasard = async function(){
  if(typeof anStop === 'function') anStop();
  if(!(await brRemplirHasard())) return;
  if(typeof AN !== 'undefined') AN.t = 0;
  crRender();
};
window.brChoisirMesPhotos = function(){
  if(typeof anStop === 'function') anStop();
  CR.photos = []; CR.crop = []; CR.exemple = false; CR.remplace = null; CR.vue = 'photos'; crRender(); window.scrollTo({ top: 0 });
};
window.brGarderExemple = function(){ CR.exemple = false; brGarder(true); crRender(); agToast('Ces photos sont gardées'); };

// Un modèle touché depuis l'accueil : aperçu immédiat avec des photos au hasard
const brChoisirAvant = crChoisirModele;
crChoisirModele = async function(k){
  const depuisAccueil = CR.vue === 'accueil';
  if(depuisAccueil){ CR.brouillonId = null; brSigAvant = ''; CR.remplace = null; if(typeof AN !== 'undefined'){ AN.t = 0; } }
  const M = crModele(k);
  if(depuisAccueil && M && CR.photos.length < M.min){
    CR.modele = k; CR.styleId = null; CR.exemple = true;
    const el = crBody(); if(el) el.innerHTML = '<div class="ag-empty">Préparation de l\'aperçu avec tes photos...</div>';
    let ok = false; try { ok = await brRemplirHasard(); } catch(e){}
    if(!ok){ CR.exemple = false; CR.photos = []; CR.crop = []; return brChoisirAvant(k); }
    CR.exempleSig = JSON.stringify(CR.cfg || crCfgDefaut());
    return brChoisirAvant(k);
  }
  if(depuisAccueil) CR.exemple = false;
  return brChoisirAvant(k);
};

// ---------- Affichage ----------
const brRenderAvant = crRender;
crRender = async function(){
  if(CR.vue === 'accueil') await brCharger();
  if(CR.vue === 'photos' && CR.exemple){ CR.exemple = false; }
  if(CR.vue === 'accueil' && typeof AN !== 'undefined' && AN.lecture && typeof anStop === 'function') anStop();
  const r = await brRenderAvant.apply(this, arguments);
  const el = crBody(); if(!el) return r;
  if(CR.vue === 'accueil'){
    const top = el.querySelector('.cr-top');
    const h = brListeHtml();
    if(h && top && !el.querySelector('.br-liste')){ top.insertAdjacentHTML('afterend', h); if(typeof mkHydrate === 'function') mkHydrate(el); }
  }
  if(CR.vue === 'edit' && CR.exemple && !el.querySelector('.br-exemple')){
    const back = el.querySelector('.ag-back');
    const ex = CR.photos.some(p => p.exemple);
    const html = `<div class="br-exemple"><div><b>Aperçu</b> avec ${ex ? 'des images d\'exemple' : 'des photos prises au hasard dans tes galeries'}.</div>
      <div class="br-ex-b"><button onclick="brAutresHasard()">🎲 Autres photos</button><button class="on" onclick="brChoisirMesPhotos()">Choisir mes photos</button>${ex ? '' : '<button onclick="brGarderExemple()">Garder celles-ci</button>'}</div></div>`;
    if(back) back.insertAdjacentHTML('afterend', html); else el.insertAdjacentHTML('afterbegin', html);
  }
  // Lecture automatique de l'aperçu vidéo
  if(CR.vue === 'edit' && CR.exemple && typeof anLecture === 'function' && /^v-/.test(CR.modele || '') && !AN.lecture){
    setTimeout(() => { if(document.getElementById('anCanvas') && !AN.lecture && CR.exemple) anLecture(); }, 900);
  }
  return r;
};

(function brCss(){
  if(document.getElementById('brCss')) return;
  const st = document.createElement('style'); st.id = 'brCss';
  st.textContent = `
.br-liste{display:flex;flex-direction:column;gap:8px;margin-bottom:6px}
.br-c{display:flex;gap:10px;align-items:center;padding:8px;border-radius:14px;background:var(--card);border:1px solid var(--border)}
.br-img{position:relative;flex:none;width:64px;height:80px;margin:0;padding:0;border-radius:10px;overflow:hidden;border:0;background:var(--card2);color:var(--accent);cursor:pointer}
.br-img img{width:100%;height:100%;object-fit:cover;display:block}
.br-img svg{width:100%;height:100%}
.br-img em{position:absolute;right:4px;bottom:4px;font-style:normal;font-size:9px;width:18px;height:18px;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;display:flex;align-items:center;justify-content:center}
.br-d{flex:1;min-width:0}
.br-d b{display:block;color:var(--text);font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.br-d small{display:block;color:var(--muted);font-size:11.5px;margin:2px 0 6px}
.br-b{display:flex;gap:6px}
.br-b button{width:auto;flex:none;margin:0;padding:6px 10px;border-radius:999px;border:1px solid var(--border);background:var(--card2);color:var(--text);font-size:12px;cursor:pointer;display:flex;align-items:center}
.br-b button.on{background:var(--accent);border-color:var(--accent);color:#fff}
.br-b button.no{color:#e5484d;padding:6px 8px}
.br-tout{float:right;font-size:12px}
.br-marque{display:inline-block;margin-left:10px;font-size:11.5px;color:var(--muted);opacity:0}
.br-marque.vu{animation:brVu 2.2s ease}
@keyframes brVu{0%{opacity:0}15%{opacity:1}75%{opacity:1}100%{opacity:0}}
.br-exemple{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;margin:6px 0 10px;border-radius:14px;background:color-mix(in srgb,var(--accent) 12%,var(--card));border:1px solid color-mix(in srgb,var(--accent) 35%,transparent);font-size:13px;color:var(--text)}
.br-ex-b{display:flex;flex-wrap:wrap;gap:6px}
.br-ex-b button{width:auto;margin:0;padding:7px 12px;border-radius:999px;border:1px solid var(--border);background:var(--card2);color:var(--text);font-size:12.5px;cursor:pointer}
.br-ex-b button.on{background:var(--accent);border-color:var(--accent);color:#fff}`;
  document.head.appendChild(st);
})();

// Si l'onglet est déjà ouvert sur l'accueil des créations : on montre les brouillons
const a = document.querySelector('.page.active'); if(a && a.id === 'page-creations' && CR.vue === 'accueil') crRender();
})();
