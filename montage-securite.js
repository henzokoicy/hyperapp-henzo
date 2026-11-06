// montage-securite.js — version 1
// ============================================================
// MONTAGE-SECURITE.JS - Lot E : sécurité du projet et export
// (écran de montage des Créations)
// ------------------------------------------------------------
// Sauvegarde : le montage était déjà gardé toutes les 2 secondes
// (crea-brouillons.js, sur l'appareil, et en ligne avec
// brouillons-ligne.js). En plus ici :
// - Récupération après plantage : si l'app se ferme pendant un montage
//   (plantage, batterie, onglet fermé), au retour l'app propose de
//   reprendre exactement là où tu en étais.
// - Versions précédentes : une version est gardée toutes les 2 minutes
//   de travail (12 au plus par projet). « Revenir à cette version » en
//   1 clic (la version actuelle est gardée aussi : rien n'est perdu).
// - La bibliothèque « Médias » (lot C) est gardée avec le brouillon,
//   même les fichiers pas encore placés dans le montage.
// - Indicateur « Gardé il y a ... » dans la barre du haut.
// Export :
// - Format en 1 clic dans l'export : 9:16, 16:9, 1:1 (et 4:5).
// - 1080p conseillé ; 4K proposé seulement si cet appareil sait
//   l'encoder (testé avant), sinon c'est dit clairement.
// - Vérifications avant l'export (fichiers manquants, droits des sons,
//   durée) et l'écran reste allumé pendant la création.
// Tout est gardé sur l'appareil (IndexedDB déjà utilisée par les
// brouillons) : aucune nouvelle table en ligne.
// Utilise crea-brouillons.js, brouillons-ligne.js, animations.js,
// montage-medias.js, musique-libre.js.
// ============================================================
(function(){
'use strict';
if(typeof CR === 'undefined' || typeof AN === 'undefined' || typeof BR === 'undefined' || typeof mtEstSeq !== 'function') return;

const MSE = { versionsMaj: {}, libGardes: new Set(), q4k: {}, verrou: null };
window.MSE = MSE;
const CLE_OUVERT = 'mse.ouvert';
const NB_VERSIONS = 12, ECART_VERSION = 120000;

function lsGet(k, d){ try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch(e){ return d; } }
function lsSet(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
function lsDel(k){ try { localStorage.removeItem(k); } catch(e){} }
if(typeof AG_ICONS !== 'undefined'){
  const I = {
    versions: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/><path d="M3 12H1M4.5 5.5 3 4"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'
  };
  Object.keys(I).forEach(k => { if(!AG_ICONS[k]) AG_ICONS[k] = I[k]; });
}
const ic = (n, s) => agIcon(n, s || 18);
const E = s => crE(String(s == null ? '' : s));
function enMontage(){ return CR.vue === 'edit' && !!CR.modele && typeof anEst === 'function' && anEst(CR.modele); }
function seq(){ return enMontage() && mtEstSeq(CR.modele); }
function quand(t){
  const s = Math.round((Date.now() - t) / 1000);
  if(s < 5) return 'à l\'instant'; if(s < 60) return 'il y a ' + s + ' s';
  const m = Math.round(s / 60); if(m < 60) return 'il y a ' + m + ' min';
  const h = Math.round(m / 60); if(h < 24) return 'il y a ' + h + ' h';
  const j = Math.round(h / 24); return j === 1 ? 'hier' : 'il y a ' + j + ' jours';
}
function heure(t){ try { return new Date(t).toLocaleString('fr-FR', { weekday: 'short', hour: '2-digit', minute: '2-digit' }); } catch(e){ return ''; } }
function dureeRec(r){ const v = r && r.vid; return v && v.duree ? (typeof anMinSec === 'function' ? anMinSec(v.duree) : Math.round(v.duree) + ' s') : ''; }
function resume(r){ const v = (r && r.vid) || {}, n = (v.clips || []).length || (r.photos || []).length; return [n + ' plan' + (n > 1 ? 's' : ''), dureeRec(r), (v.sons || []).length ? (v.sons.length + ' son' + (v.sons.length > 1 ? 's' : '')) : '', v.musique ? 'musique' : ''].filter(Boolean).join(' · '); }

// ============================================================
// 1. RÉCUPÉRATION APRÈS PLANTAGE
// ------------------------------------------------------------
// Pendant le montage, un petit signe « montage ouvert » est posé sur
// l'appareil (rafraîchi toutes les 5 s). En sortant normalement du
// montage, il est retiré. S'il est encore là au démarrage : l'app
// s'est fermée en plein montage.
// ============================================================
function marquerOuvert(){
  if(enMontage() && CR.brouillonId && !CR.exemple){
    lsSet(CLE_OUVERT, { id: CR.brouillonId, nom: (CR.cfg && (CR.cfg.titre || CR.cfg.mot)) || (typeof crModele === 'function' && crModele() ? crModele().nom : 'Montage'), at: Date.now() });
  }
}
function sortieNormale(){ lsDel(CLE_OUVERT); }
setInterval(() => { try { if(enMontage()) marquerOuvert(); } catch(e){} }, 5000);
// Sortie normale du montage : vers l'accueil des Créations, ou un autre onglet
if(typeof showTab === 'function'){
  const stBase = showTab;
  showTab = function(name){ if(name !== 'creations' && MSE.etaitEdit){ MSE.etaitEdit = false; sortieNormale(); } return stBase.apply(this, arguments); };
}
function connecte(){ return !!document.body && !document.body.classList.contains('logged-out'); }
async function proposerReprise(){
  const o = lsGet(CLE_OUVERT, null); if(!o || !o.id) return;
  if(enMontage() && CR.brouillonId === o.id) return;
  let r = null; try { r = await BR.get('brouillons', o.id); } catch(e){}
  if(!r){ sortieNormale(); return; }
  agSheet('mseReprise', `<h3>${ic('shield', 20)} Ton montage est sauvé</h3>
    <div class="ag-hint" style="margin-top:0">L'app s'est fermée pendant ton montage (plantage, batterie, onglet fermé). Rien n'est perdu : tout est gardé jusqu'à ${E(quand(r.maj || o.at))}.</div>
    <div class="mse-rep">${r.apercu ? `<img src="${E(r.apercu)}" alt="">` : `<span class="mse-rep-i">${ic('film', 26)}</span>`}<div><b>${E(r.nom || o.nom || 'Montage')}</b><small>${E(r.modeleNom || '')}${resume(r) ? ' · ' + E(resume(r)) : ''}</small><small>Dernière sauvegarde : ${E(heure(r.maj || o.at))}</small></div></div>
    <div class="mt-act mse-act"><button type="button" class="on" onclick="mseReprendre('${E(o.id)}')">${ic('play', 14)} Reprendre mon montage</button><button type="button" onclick="agCloseSheet('mseReprise');mseOublier()">Plus tard</button></div>
    <div class="ag-hint">Il reste aussi dans Créations > Mes brouillons.</div>`);
}
window.mseOublier = function(){ sortieNormale(); };
window.mseReprendre = async function(id){
  agCloseSheet('mseReprise');
  try { if(typeof agGoTab === 'function') agGoTab('creations'); else if(typeof showTab === 'function') showTab('creations'); } catch(e){}
  await new Promise(o => setTimeout(o, 250));
  if(typeof brReprendre === 'function') await brReprendre(id);
};
// Au démarrage : on attend que tu sois connecté
(function attendre(n){
  if(n > 240) return;
  if(!connecte() || !document.body){ setTimeout(() => attendre(n + 1), 1000); return; }
  setTimeout(() => { proposerReprise().catch(() => {}); }, 1500);
})(0);

// ============================================================
// 2. VERSIONS PRÉCÉDENTES
// ============================================================
async function versions(id){ try { return (await BR.get('fichiers', 'ver:' + id)) || []; } catch(e){ return []; } }
function empreinte(r){ return JSON.stringify([r.modele, r.fmt, r.cfg, r.vid, (r.photos || []).map(p => p.k), r.crop]); }
async function garderVersion(force, motif){
  const id = CR.brouillonId; if(!id) return false;
  let r = null; try { r = await BR.get('brouillons', id); } catch(e){} if(!r || r.exemple) return false;
  const L = await versions(id), der = L[0];
  if(der && empreinte(der.rec) === empreinte(r)) return false;
  if(!force && der && (r.maj || 0) - der.at < ECART_VERSION) return false;
  L.unshift({ at: r.maj || Date.now(), motif: motif || '', rec: r });
  while(L.length > NB_VERSIONS) L.pop();
  try { await BR.put('fichiers', JSON.parse(JSON.stringify(L)), 'ver:' + id); } catch(e){ console.warn('versions', e); return false; }
  return true;
}
setInterval(() => { if(enMontage() && CR.brouillonId && document.visibilityState !== 'hidden') garderVersion(false).catch(() => {}); }, 30000);
window.mseVersions = async function(){
  const id = CR.brouillonId;
  if(!id){ agToast('Le montage n\'est pas encore gardé : change quelque chose puis réessaie', 'info'); return; }
  await garderVersion(false).catch(() => {});
  const L = await versions(id);
  agSheet('mseVersS', `<h3>${ic('versions', 20)} Versions précédentes</h3>
    <div class="ag-hint" style="margin-top:0">Une version est gardée toutes les 2 minutes de travail (les ${NB_VERSIONS} dernières). Revenir en arrière garde aussi la version actuelle.</div>
    ${L.length ? `<div class="mse-vl">${L.map((v, i) => `<div class="mse-v">${v.rec.apercu ? `<img src="${E(v.rec.apercu)}" alt="">` : `<span class="mse-rep-i">${ic('film', 20)}</span>`}<div><b>${E(heure(v.at))} <small>${E(quand(v.at))}</small></b><small>${E(resume(v.rec))}${v.motif ? ' · ' + E(v.motif) : ''}</small></div><button type="button" onclick="mseRevenir(${i})">Revenir</button></div>`).join('')}</div>`
      : '<div class="ag-empty">Pas encore de version précédente : la première arrive après 2 minutes de travail.</div>'}
    <div class="mt-act"><button type="button" onclick="mseGarderMaintenant()">${ic('check', 14)} Garder une version maintenant</button></div>`);
};
window.mseGarderMaintenant = async function(){
  await new Promise(o => setTimeout(o, 2200));   // la dernière modification est d'abord gardée (toutes les 2 s)
  const ok = await garderVersion(true, 'gardée à la main');
  agToast(ok ? 'Version gardée' : 'Rien de nouveau depuis la dernière version', ok ? 'success' : 'info');
  if(document.getElementById('mseVersS')) mseVersions();
};
window.mseRevenir = async function(i){
  const id = CR.brouillonId; if(!id) return;
  const L = await versions(id), v = L[i]; if(!v) return;
  if(!await agConfirm(`Revenir à la version de ${heure(v.at)} ?\nLa version actuelle est gardée dans la liste : tu pourras y revenir.`, { ok: 'Revenir', no: 'Annuler' })) return;
  agCloseSheet('mseVersS');
  await new Promise(o => setTimeout(o, 2200));
  await garderVersion(true, 'avant retour en arrière');
  const rec = Object.assign({}, v.rec, { id, maj: Date.now() });
  try { await BR.put('brouillons', JSON.parse(JSON.stringify(rec))); } catch(e){ agAlert('Retour impossible : ' + (e.message || e)); return; }
  try { if(typeof window.blApresGarde === 'function') window.blApresGarde(rec); } catch(e){}
  if(typeof anStop === 'function') anStop();
  await brReprendre(id);
  agToast('Version de ' + heure(v.at) + ' remise');
};

// ============================================================
// 3. LA BIBLIOTHÈQUE « MÉDIAS » GARDÉE AVEC LE BROUILLON
// ============================================================
function genreDe(it){ return it.audio ? 'son' : (it.video || it.mVideo) ? 'video' : 'photo'; }
async function garderBiblio(){
  if(typeof MMD === 'undefined' || !CR.brouillonId || !seq()) return;
  const dans = new Set(CR.photos.map(p => p.k));
  const seuls = MMD.lib.filter(it => it && it.file && !it.manquant && !dans.has(it.k));
  for(const it of seuls){ if(!MSE.libGardes.has(it.k)){ try { await BR.put('fichiers', it.file, 'lib:' + it.k); MSE.libGardes.add(it.k); } catch(e){ return; } } }
  const liste = seuls.map(it => ({ k: it.k, genre: genreDe(it), nomF: it.nomF || (it.file && it.file.name) || null, taille: it.taille || (it.file && it.file.size) || null, vdur: it.vdur || null, nom: it.nom || null, origine: it.origine || null }));
  const cle = 'libliste:' + CR.brouillonId, sig = JSON.stringify(liste);
  if(MSE.libSig === cle + sig) return;
  try { await BR.put('fichiers', liste, cle); MSE.libSig = cle + sig; } catch(e){}
}
setInterval(() => { garderBiblio().catch(() => {}); }, 4000);
function ondeImage(b){
  try { const W = 160, H = 48, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), ch = b.getChannelData(0), n = Math.max(1, Math.floor(ch.length / W)); g.fillStyle = '#48A89A';
    for(let x = 0; x < W; x++){ let m = 0; for(let j = x * n; j < (x + 1) * n; j += 32) m = Math.max(m, Math.abs(ch[j] || 0)); const h = Math.max(1, m * H * 0.92); g.fillRect(x, (H - h) / 2, 1, h); }
    return c.toDataURL('image/png'); } catch(e){ return ''; }
}
async function rendreBiblio(id){
  if(typeof MMD === 'undefined') return;
  let L = []; try { L = (await BR.get('fichiers', 'libliste:' + id)) || []; } catch(e){}
  for(const e of L){
    if(MMD.lib.some(x => x.k === e.k) || CR.photos.some(x => x.k === e.k)) continue;
    let b = null; try { b = await BR.get('fichiers', 'lib:' + e.k); } catch(er){}
    if(!b){ MMD.lib.push({ k: e.k, src: 'fichier', nomF: e.nomF, nom: e.nom, taille: e.taille, manquant: true, audio: e.genre === 'son', mVideo: e.genre === 'video' }); continue; }
    const f = b instanceof File ? b : new File([b], e.nomF || 'media', { type: b.type || '' }), url = URL.createObjectURL(f);
    MSE.libGardes.add(e.k);
    if(e.genre === 'photo') MMD.lib.push({ k: e.k, src: 'fichier', file: f, url, thumb: url, nomF: e.nomF, taille: e.taille });
    else if(e.genre === 'video'){ const it = { k: e.k, src: 'fichier', file: f, url, thumb: '', video: true, vdur: e.vdur, nomF: e.nomF, taille: e.taille }; MMD.lib.push(it); if(typeof rvNouveau === 'function') rvNouveau(it).catch(() => {}); }
    else {
      const it = { k: e.k, audio: true, src: 'fichier', file: f, url, nom: e.nom || (e.nomF || 'son').replace(/\.[^.]+$/, ''), nomF: e.nomF, taille: e.taille, origine: e.origine || 'inconnu' };
      try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); it.buf = await ctx.decodeAudioData(await f.arrayBuffer()); it.dur = it.buf.duration; it.onde = ondeImage(it.buf); try { ctx.close(); } catch(er){} } catch(er){}
      MMD.lib.push(it);
    }
  }
}
if(typeof window.brReprendre === 'function'){
  const reprendreBase = window.brReprendre;
  window.brReprendre = async function(id){
    const r = await reprendreBase.apply(this, arguments);
    try {
      if(CR.brouillonId === id){
        await rendreBiblio(id);
        MSE.versionsMaj[id] = Date.now();
        marquerOuvert();
        setTimeout(() => { garderVersion(false, 'ouverture').catch(() => {}); if(CR.edOutil === 'medias' && typeof edOutil === 'function') edOutil('medias', true); }, 2500);
      }
    } catch(e){ console.warn('montage-securite', e); }
    return r;
  };
}
// Un brouillon supprimé : ses versions et sa bibliothèque aussi
if(typeof window.brSupprimer === 'function'){
  const supBase = window.brSupprimer;
  window.brSupprimer = async function(id){
    let liste = [], r = null; try { liste = (await BR.get('fichiers', 'libliste:' + id)) || []; r = await BR.get('brouillons', id); } catch(e){}
    const res = await supBase.apply(this, arguments);
    try {
      const encore = await BR.get('brouillons', id).catch(() => null);
      if(!encore){
        await BR.del('fichiers', 'ver:' + id).catch(() => {}); await BR.del('fichiers', 'libliste:' + id).catch(() => {});
        const autres = (await BR.tous().catch(() => [])) || [];
        const ailleurs = new Set(); autres.forEach(x => ((x.vid || {}).sons || []).forEach(s => { if(s.fid) ailleurs.add(s.fid); }));
        for(const e of liste){ await BR.del('fichiers', 'lib:' + e.k).catch(() => {}); }
        for(const s of ((r && r.vid) || {}).sons || []){ if(s.fid && !ailleurs.has(s.fid)) await BR.del('fichiers', 'son:' + s.fid).catch(() => {}); }
        if((lsGet(CLE_OUVERT, null) || {}).id === id) sortieNormale();
      }
    } catch(e){ console.warn('montage-securite', e); }
    return res;
  };
}

// ============================================================
// 4. « GARDÉ IL Y A ... » DANS LA BARRE DU HAUT
// ============================================================
async function indicateur(){
  if(!enMontage()) return;
  const g = document.querySelector('#edPortail .ed-g'); if(!g) return;
  let el = document.getElementById('mseEtat');
  if(!el){ el = document.createElement('button'); el.type = 'button'; el.id = 'mseEtat'; el.className = 'mse-etat'; el.onclick = () => mseVersions(); el.title = 'Sauvegarde automatique · versions précédentes'; g.appendChild(el); }
  let r = null; if(CR.brouillonId){ try { r = await BR.get('brouillons', CR.brouillonId); } catch(e){} }
  el.innerHTML = r ? `${ic('shield', 13)}<span>Gardé ${E(quand(r.maj))}</span>` : `${ic('shield', 13)}<span>Pas encore gardé</span>`;
  el.classList.toggle('ok', !!r);
}
setInterval(() => { indicateur().catch(() => {}); }, 3000);

// ============================================================
// 5. L'EXPORT : FORMAT, 1080p / 4K, VÉRIFICATIONS
// ============================================================
const FMT_NOMS = { story: ['9:16', 'Story, Reels, TikTok, statut'], large: ['16:9', 'YouTube, écran, TV'], carre: ['1:1', 'Carré'], post: ['4:5', 'Publication Facebook / Instagram'] };
const FMT_ORDRE = ['story', 'large', 'carre', 'post'];
async function peut4k(fmt){
  if(MSE.q4k[fmt] != null) return MSE.q4k[fmt];
  if(typeof anEncodeurVideo !== 'function'){ MSE.q4k[fmt] = false; return false; }
  const d = crDims(fmt, 2), pair = v => Math.max(2, Math.round(v / 2) * 2);
  let ok = false; try { ok = !!(await anEncodeurVideo(pair(d.w), pair(d.h), 30, 40e6)); } catch(e){}
  MSE.q4k[fmt] = ok; return ok;
}
function blocExport(){
  const M = typeof anModele === 'function' ? anModele(CR.modele) : null, V = anVid();
  const fmts = FMT_ORDRE.filter(f => M && (M.fmts || []).includes(f));
  const q = V.qualite || 'standard';
  const manq = typeof mmdManquants === 'function' ? mmdManquants().length : 0;
  const sons = (V.musique ? 1 : 0) + (V.sons || []).length;
  const plan = AN.plan || anPlan();
  return `<div class="mse-exp" id="mseExp">
    <div class="mse-st">Format de la vidéo</div>
    <div class="mse-fmts">${fmts.map(f => { const d = crDims(f, 0.026); return `<button type="button" class="${CR.fmt === f ? 'on' : ''}" onclick="mseFormat('${f}')"><i style="width:${d.w}px;height:${d.h}px"></i><b>${FMT_NOMS[f][0]}</b><small>${FMT_NOMS[f][1]}</small></button>`; }).join('')}</div>
    <div class="mse-st">Résolution</div>
    <div class="mse-res">
      <button type="button" class="${q === 'standard' ? 'on' : ''}" onclick="anSet('qualite','standard')"><b>1080p</b><small>Conseillé · ${crDims(CR.fmt, 1).w} x ${crDims(CR.fmt, 1).h}</small></button>
      <button type="button" id="mse4k" class="${q === '4k' ? 'on' : ''}" onclick="mse4k()"><b>4K</b><small id="mse4kT">Vérification de l'appareil...</small></button>
    </div>
    <div class="mse-st">Avant d'exporter</div>
    <div class="mse-checks">
      <div class="${manq ? 'ko' : 'ok'}">${ic(manq ? 'info' : 'check', 14)}<span>${manq ? `${manq} fichier${manq > 1 ? 's' : ''} manquant${manq > 1 ? 's' : ''}` : 'Tous les fichiers sont là'}</span>${manq ? '<button type="button" class="st-link" onclick="mmdOuvrir&&mmdOuvrir();mmdRelier&&mmdRelier()">Relier</button>' : ''}</div>
      <div class="ok">${ic('film', 14)}<span>${typeof anMinSec === 'function' ? anMinSec(plan.D) : Math.round(plan.D) + ' s'} · ${plan.segs.filter(s => !s.vide).length} plans${sons ? ' · ' + sons + ' son' + (sons > 1 ? 's' : '') : ''}</span></div>
      ${sons && typeof mlControle === 'function' ? `<div class="info">${ic('shield', 14)}<span>Droits des musiques et sons</span><button type="button" class="st-link" onclick="mlControle()">Vérifier</button></div>` : ''}
      <div class="ok">${ic('shield', 14)}<span>Montage gardé automatiquement</span><button type="button" class="st-link" onclick="mseVersions()">Versions</button></div>
    </div></div>`;
}
window.mseFormat = function(f){ if(CR.fmt === f) return; if(typeof anFmt === 'function') anFmt(f); else { CR.fmt = f; crRender(); } agToast('Format ' + (FMT_NOMS[f] || [f])[0], 'info'); };
window.mse4k = async function(){
  if(!await peut4k(CR.fmt)){ agToast('Cet appareil ne sait pas créer de vidéo 4K : reste en 1080p (ou exporte depuis un ordinateur avec Chrome)', 'info'); return; }
  anSet('qualite', '4k');
  agToast('4K choisi : la création prend environ 4 fois plus de temps qu\'en 1080p', 'info');
};
function monterExport(){
  if(!seq() || V().sortie === 'gif') { const x = document.getElementById('mseExp'); if(x && V().sortie === 'gif') x.remove(); return; }
  const p = document.querySelector('#edInspC .ed-p[data-o="export"]'); if(!p) return;
  const vieux = p.querySelector('#mseExp');
  const h = blocExport();
  if(vieux) vieux.outerHTML = h;
  else { const sec = p.querySelector('.ed-sec'); const ref = sec && sec.querySelector('.ag-pills'); if(ref) ref.insertAdjacentHTML('afterend', h); else p.insertAdjacentHTML('afterbegin', h); }
  peut4k(CR.fmt).then(ok => {
    const t = document.getElementById('mse4kT'), b = document.getElementById('mse4k'); if(!t || !b) return;
    const d = crDims(CR.fmt, 2);
    t.textContent = ok ? `Possible ici · ${d.w} x ${d.h} · plus long` : 'Pas possible sur cet appareil';
    b.classList.toggle('non', !ok);
    if(!ok && anVid().qualite === '4k'){ anVid().qualite = 'standard'; document.querySelectorAll('#mseExp .mse-res button').forEach((x, i) => x.classList.toggle('on', i === 0)); }
  });
  // La liste de qualités d'origine : la 4K dit si elle est possible
  peut4k(CR.fmt).then(ok => { if(ok) return; p.querySelectorAll('.cr-qual button').forEach(b => { if(/4K/.test(b.textContent) && !b.querySelector('.mse-non')) b.insertAdjacentHTML('beforeend', '<small class="mse-non">Pas possible ici : faite en 1080p</small>'); }); });
}
function V(){ return anVid(); }
// L'écran reste allumé pendant la création de la vidéo
if(typeof anExporter === 'function'){
  const expBase = anExporter;
  anExporter = async function(){
    let verrou = null;
    try { if(navigator.wakeLock && navigator.wakeLock.request) verrou = await navigator.wakeLock.request('screen'); } catch(e){}
    MSE.verrou = verrou;
    try { return await expBase.apply(this, arguments); }
    finally { try { if(verrou) await verrou.release(); } catch(e){} MSE.verrou = null; }
  };
}

// ============================================================
// 6. MISE EN PLACE
// ============================================================
if(typeof window.mpxPlus === 'function'){
  const plusBase = window.mpxPlus;
  window.mpxPlus = function(){
    const r = plusBase.apply(this, arguments);
    try {
      const pl = document.querySelector('#mpxPlusS .mpx-pl'); if(!pl) return r;
      const it = (icone, txt, sous, fn) => `<button type="button" class="mpx-pi" onclick="agCloseSheet('mpxPlusS');${fn}">${ic(icone, 18)}<div><b>${txt}</b>${sous ? `<small>${sous}</small>` : ''}</div></button>`;
      pl.insertAdjacentHTML('beforeend', '<div class="mpx-pt">Sécurité et export</div>'
        + it('versions', 'Versions précédentes', 'Revenir à l\'état d\'il y a quelques minutes', 'mseVersions()')
        + it('download', 'Exporter', 'Format 9:16, 16:9, 1:1 · 1080p ou 4K', "edOutil('export')"));
    } catch(e){ console.warn('montage-securite', e); }
    return r;
  };
}
const renderBase = crRender;
crRender = async function(){
  const r = await renderBase.apply(this, arguments);
  try {
    if(enMontage()){ MSE.etaitEdit = true; marquerOuvert(); indicateur().catch(() => {}); monterExport(); }
    else if(MSE.etaitEdit && CR.vue !== 'photos'){ MSE.etaitEdit = false; sortieNormale(); }   // sortie normale du montage
  } catch(e){ console.warn('montage-securite', e); }
  return r;
};
// Le bloc d'export suit les changements (fichiers reliés, sons ajoutés...)
if(typeof window.edApresMt === 'function'){
  const apresBase = window.edApresMt;
  window.edApresMt = function(){ const r = apresBase.apply(this, arguments); try { if(seq() && CR.edOutil === 'export') monterExport(); } catch(e){} return r; };
}
if(typeof window.edOutil === 'function'){
  const outilBase = window.edOutil;
  window.edOutil = function(id){ const r = outilBase.apply(this, arguments); try { if(id === 'export') monterExport(); } catch(e){} return r; };
}

(function css(){
  if(document.getElementById('mseCss')) return;
  const st = document.createElement('style'); st.id = 'mseCss';
  st.textContent = `
.mse-rep{display:flex;gap:12px;align-items:center;padding:10px;border-radius:14px;background:var(--card2);border:1px solid var(--border);margin:10px 0}
.mse-rep img{width:64px;height:64px;object-fit:cover;border-radius:10px;flex:none}.mse-rep-i{width:64px;height:64px;border-radius:10px;background:#0b0f10;color:var(--muted);display:flex;align-items:center;justify-content:center;flex:none}
.mse-rep div{min-width:0}.mse-rep b{display:block;color:var(--text)}.mse-rep small{display:block;color:var(--muted);font-size:12px}
.mse-act button{display:inline-flex;align-items:center;gap:6px}
.mse-vl{display:flex;flex-direction:column;gap:8px;margin:10px 0;max-height:55vh;overflow-y:auto}
.mse-v{display:flex;gap:10px;align-items:center;padding:8px;border-radius:12px;background:var(--card2);border:1px solid var(--border)}
.mse-v img,.mse-v .mse-rep-i{width:44px;height:44px;object-fit:cover;border-radius:8px;flex:none}
.mse-v div{flex:1;min-width:0}.mse-v b{display:block;color:var(--text);font-size:13px}.mse-v b small{color:var(--muted);font-weight:500;margin-left:4px}.mse-v>div>small{display:block;color:var(--muted);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mse-v button{width:auto !important;margin:0;padding:7px 12px;border-radius:9px;border:none;background:var(--accent,#48A89A);color:#fff;font-weight:600;cursor:pointer}
.mse-etat{width:auto !important;margin:0 0 0 8px;padding:4px 8px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--muted);font-size:11px;display:inline-flex;align-items:center;gap:4px;cursor:pointer;white-space:nowrap}
.mse-etat.ok svg{color:var(--accent,#48A89A)}
.ed-video #brMarque{display:none !important}
.mse-exp{margin:10px 0 6px}
.mse-st{margin:12px 0 6px;font-size:11px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:var(--muted)}
.mse-fmts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
.mse-fmts button,.mse-res button{width:auto !important;margin:0;padding:10px 8px;border-radius:12px;border:1px solid var(--border);background:var(--card2);color:var(--text);display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;text-align:center}
.mse-fmts button.on,.mse-res button.on{border-color:var(--accent,#48A89A);box-shadow:0 0 0 2px var(--accent,#48A89A) inset}
.mse-fmts i{display:block;border:2px solid currentColor;border-radius:4px;opacity:.8;margin-bottom:2px}
.mse-fmts b,.mse-res b{font-size:14px}.mse-fmts small,.mse-res small{font-size:11px;color:var(--muted);line-height:1.25}
.mse-res{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.mse-res button.non{opacity:.55}
.mse-checks{display:flex;flex-direction:column;gap:6px}
.mse-checks>div{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:var(--card2);border:1px solid var(--border);font-size:13px;color:var(--text)}
.mse-checks>div span{flex:1}.mse-checks .ok>svg{color:var(--accent,#48A89A)}.mse-checks .ko{border-color:rgba(229,72,77,.5)}.mse-checks .ko>svg{color:#e5484d}.mse-checks .info>svg{color:#f5a524}
.mse-checks .st-link{width:auto !important;margin:0}
.mse-non{display:block;color:#e5484d !important}
@media(max-width:899px){.mse-etat span{display:none}}`;
  document.head.appendChild(st);
})();
})();
