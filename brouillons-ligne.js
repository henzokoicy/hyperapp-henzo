// ============================================================
// BROUILLONS-LIGNE.JS - Les brouillons des Créations, en ligne
// ------------------------------------------------------------
// Chaque brouillon est gardé sur l'appareil (marche sans internet)
// ET envoyé en ligne quelques secondes après chaque changement :
// - le montage lui-même (réglages, timeline, textes, effets) : table
//   "brouillons" de Supabase ;
// - les photos du téléphone et la musique : stockage privé
//   "brouillons" (dossier à ton nom, toi seul y as accès) ;
// - les rushs vidéo : seulement une copie légère (le "proxy") pour
//   monter partout. L'ORIGINAL reste sur l'appareil où tu l'as
//   ajouté et c'est lui qui sert à l'export (pleine qualité).
// Sur un autre appareil : le brouillon s'ouvre avec les proxys ;
// avant d'exporter, l'app demande les originaux (reconnus tout seuls
// par leur nom, leur taille ou leur durée), ou prévient clairement.
// Si le même brouillon est changé sur deux appareils, l'app le dit.
// ============================================================
(function(){
'use strict';
if(typeof CR === 'undefined' || typeof BR === 'undefined' || typeof sb === 'undefined') return;
const BUCKET = 'brouillons', LIMITE = 1024;   // Mo du plan gratuit
const BL = { uid: null, base: {}, attente: {}, etat: '', info: '', conflit: null, place: null, distants: {}, envoiEnCours: false, proxys: {} };
window.BL = BL;

// ---------- Outils ----------
function blAppareil(){
  let id = null;
  try { id = localStorage.getItem('blAppareil'); if(!id){ id = (/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ? 'tel' : 'ordi') + '-' + Math.random().toString(36).slice(2, 8); localStorage.setItem('blAppareil', id); } } catch(e){ id = 'inconnu'; }
  return id;
}
function blNomAppareil(a){ return /^tel/.test(a || '') ? 'ton téléphone' : /^ordi/.test(a || '') ? 'ton ordinateur' : 'un autre appareil'; }
async function blUid(){ if(BL.uid) return BL.uid; try { const { data } = await sb.auth.getUser(); BL.uid = data && data.user && data.user.id; } catch(e){} return BL.uid; }
const blSur = k => String(k).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
async function blEnvoyerFichier(path, blob, type){ const { error } = await sb.storage.from(BUCKET).upload(path, blob, { upsert: true, contentType: type || blob.type || 'application/octet-stream' }); if(error) throw new Error(error.message || 'envoi impossible'); }
async function blTelecharger(path){ const { data, error } = await sb.storage.from(BUCKET).download(path); if(error || !data) throw new Error((error && error.message) || 'téléchargement impossible'); return data; }
// Empreinte du contenu d'un montage (pour ne jamais renvoyer une version identique)
function blEmpreinte(rec){ const d = Object.assign({}, rec); ['apercu', 'maj', 'enLigne', 'distant', 'plusRecent', 'majDistant', 'appareil', 'cree'].forEach(k => delete d[k]); const t = JSON.stringify(d); let h = 5381; for(let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return t.length + ':' + h; }
BL.emp = {};
const blHeure = d => { try { return new Date(d).toLocaleString('fr-FR', { weekday: 'short', hour: '2-digit', minute: '2-digit' }); } catch(e){ return ''; } };
// Photo du téléphone : gardée telle quelle (jusqu'à 15 Mo), sinon une version 4096 px très haute qualité
async function blPhotoPourEnvoi(blob){
  if(blob.size <= 15e6) return blob;
  try {
    const u = URL.createObjectURL(blob), im = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = u; });
    const k = Math.min(1, 4096 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    return await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.93));
  } catch(e){ return blob; }
}

// ---------- Le proxy d'un rush : copie légère, mêmes temps que l'original ----------
async function blProxy(blob){
  if(typeof VideoEncoder === 'undefined' || typeof anEncodeurVideo !== 'function') throw new Error('proxy impossible sur cet appareil');
  const url = URL.createObjectURL(blob), v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto'; v.src = url;
  await new Promise((ok, ko) => { v.onloadeddata = ok; v.onerror = () => ko(new Error('vidéo illisible')); setTimeout(ok, 12000); });
  const dur = v.duration || 0, W0 = v.videoWidth || 640, H0 = v.videoHeight || 360;
  const k = Math.min(1, 960 / Math.max(W0, H0)), w = Math.max(2, Math.round(W0 * k / 2) * 2), h = Math.max(2, Math.round(H0 * k / 2) * 2);
  const vc = await anEncodeurVideo(w, h, 30, 1.2e6); if(!vc) throw new Error('proxy impossible sur cet appareil');
  const { Muxer, ArrayBufferTarget } = await import('./mp4-muxer.esm.js');
  const target = new ArrayBufferTarget(), mux = new Muxer({ target, fastStart: 'in-memory', firstTimestampBehavior: 'offset', video: { codec: vc.mux, width: w, height: h, frameRate: 30 } });
  let err = null; const enc = new VideoEncoder({ output: (c, m) => mux.addVideoChunk(c, m), error: e => { err = e; } }); enc.configure(vc.cfg);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d');
  let n = 0, dernier = -1;
  const image = t => { if(t <= dernier + 0.02) return; dernier = t; g.drawImage(v, 0, 0, w, h); const fr = new VideoFrame(cv, { timestamp: Math.round(t * 1e6) }); enc.encode(fr, { keyFrame: n % 60 === 0 }); fr.close(); n++; };
  const vers = t => new Promise(ok => { const f = () => { v.removeEventListener('seeked', f); ok(); }; v.addEventListener('seeked', f); setTimeout(f, 3000); v.currentTime = t; });
  await vers(0); image(0);
  let fini = false;
  if('requestVideoFrameCallback' in HTMLVideoElement.prototype){
    // Lecture accélérée : chaque image reçue garde son temps exact dans la vidéo
    await new Promise(ok => {
      let vu = performance.now();
      const cb = (now, meta) => { vu = performance.now(); image(meta.mediaTime); BL.info = `Préparation du rush ${Math.round(meta.mediaTime / Math.max(0.1, dur) * 100)} %`; blEtatMaj(); if(meta.mediaTime >= dur - 0.06){ fini = true; ok(); return; } v.requestVideoFrameCallback(cb); };
      v.requestVideoFrameCallback(cb); v.onended = () => { fini = true; ok(); };
      v.playbackRate = 2; v.play().catch(() => ok());
      const garde = setInterval(() => { if(fini || performance.now() - vu > 2500){ clearInterval(garde); ok(); } }, 500);
    });
    v.pause();
  }
  // Ce qui manque (onglet caché, lecture impossible) : image par image
  for(let t = Math.max(0, dernier + 1 / 15); t < dur - 0.02; t += 1 / 15){ await vers(t); image(t); if(n % 15 === 0){ BL.info = `Préparation du rush ${Math.round(t / dur * 100)} %`; blEtatMaj(); } }
  await enc.flush(); enc.close(); if(err) throw err;
  mux.finalize(); URL.revokeObjectURL(url);
  return new Blob([target.buffer], { type: 'video/mp4' });
}

// ---------- Envoi en ligne (quelques secondes après chaque changement) ----------
window.blApresGarde = function(rec){
  if(!rec || rec.exemple) return;
  BL.attente[rec.id] = rec.id;
  clearTimeout(BL.minuteur); BL.minuteur = setTimeout(blEnvoyer, 4000);
  if(!BL.envoiEnCours){ BL.etat = navigator.onLine === false ? 'hors' : 'attente'; blEtatMaj(); }
};
async function blEnvoyer(){
  if(BL.envoiEnCours) { clearTimeout(BL.minuteur); BL.minuteur = setTimeout(blEnvoyer, 3000); return; }
  const ids = Object.keys(BL.attente); if(!ids.length) return;
  if(navigator.onLine === false){ BL.etat = 'hors'; blEtatMaj(); return; }
  const u = await blUid(); if(!u){ BL.etat = 'erreur'; BL.info = 'Connecte-toi pour envoyer en ligne'; blEtatMaj(); return; }
  BL.envoiEnCours = true;
  for(const id of ids){
    delete BL.attente[id];
    try { await blEnvoyerUn(id, u); }
    catch(e){ console.warn('envoi brouillon', e); BL.attente[id] = id; BL.etat = 'erreur'; BL.info = /Failed to fetch|network/i.test(e.message || '') ? 'Pas de connexion : envoi plus tard' : 'Envoi en ligne impossible : ' + (e.message || e); blEtatMaj(); }
  }
  BL.envoiEnCours = false;
  if(Object.keys(BL.attente).length){ clearTimeout(BL.minuteur); BL.minuteur = setTimeout(blEnvoyer, 20000); }
}
async function blEnvoyerUn(id, u){
  const rec = await BR.get('brouillons', id); if(!rec || rec.exemple) return;
  BL.etat = 'envoi'; BL.info = 'Envoi en ligne...'; blEtatMaj();
  let change = false;
  const aEnvoyer = (rec.photos || []).filter(p => p.src === 'fichier' && (p.video ? !p.px : !p.pl));
  let n = 0;
  for(const p of aEnvoyer){
    n++; BL.info = `Envoi ${n}/${aEnvoyer.length + (rec.musique && !rec.musique.pl ? 1 : 0)}`; blEtatMaj();
    if(p.video){
      const orig = await BR.get('fichiers', 'ph:' + p.k).catch(() => null); if(!orig) continue;   // pas l'original ici : rien à envoyer
      const proxy = BL.proxys[p.k] || (BL.proxys[p.k] = await blProxy(orig));
      const path = `${u}/px/${blSur(p.k)}.mp4`;
      await blEnvoyerFichier(path, proxy, 'video/mp4');
      p.px = path; p.nomF = p.nomF || orig.name || null; p.taille = p.taille || orig.size || null; change = true;
    } else {
      const b = await BR.get('fichiers', 'ph:' + p.k).catch(() => null); if(!b) continue;
      const path = `${u}/f/${blSur(p.k)}.jpg`;
      await blEnvoyerFichier(path, await blPhotoPourEnvoi(b), b.type && b.size <= 15e6 ? b.type : 'image/jpeg');
      p.pl = path; change = true;
    }
    blReporter(p);
  }
  if(rec.musique && rec.musique.cle && !rec.musique.pl){
    const b = await BR.get('fichiers', rec.musique.cle).catch(() => null);
    if(b){ const path = `${u}/m/${blSur(id)}-${blSur(rec.musique.nom || 'musique')}`; await blEnvoyerFichier(path, b, b.type || 'audio/mpeg'); rec.musique.pl = path; change = true; if(CR.brouillonId === id && typeof AN !== 'undefined') AN.musPl = path; }
  }
  if(change){ const frais = await BR.get('brouillons', id); if(frais){ (frais.photos || []).forEach(fp => { const x = (rec.photos || []).find(y => y.k === fp.k); if(x){ fp.pl = x.pl || fp.pl; fp.px = x.px || fp.px; fp.nomF = x.nomF || fp.nomF; fp.taille = x.taille || fp.taille; } }); if(frais.musique && rec.musique && rec.musique.pl) frais.musique.pl = rec.musique.pl; Object.assign(rec, frais); await BR.put('brouillons', frais); } }
  // Rien n'a vraiment changé depuis la dernière version en ligne : on n'envoie rien
  if(BL.emp[id] && BL.emp[id] === blEmpreinte(rec)){ BL.etat = 'ok'; BL.info = 'En ligne'; blEtatMaj(); return; }
  // Une version plus récente ailleurs ? On ne l'écrase pas sans te demander
  const { data: ex } = await sb.from('brouillons').select('maj,appareil').eq('id', id).maybeSingle();
  const moi = blAppareil();
  if(ex && ex.appareil !== moi){
    const tEx = new Date(ex.maj).getTime(), base = BL.base[id] ? new Date(BL.base[id]).getTime() : 0;
    if(tEx > base + 1500){ BL.conflit = { id, maj: ex.maj, appareil: ex.appareil }; BL.etat = 'conflit'; BL.info = 'Version plus récente sur ' + blNomAppareil(ex.appareil); blEtatMaj(); blBandeauConflit(); return; }
  }
  const data = Object.assign({}, rec); delete data.apercu;
  const maj = new Date(rec.maj || Date.now()).toISOString();
  const { error } = await sb.from('brouillons').upsert({ id, nom: rec.nom || null, modele: rec.modele || null, data, apercu: rec.apercu || null, appareil: moi, maj });
  if(error) throw new Error(error.message);
  BL.base[id] = maj; BL.emp[id] = blEmpreinte(rec); BL.place = null;
  const l = CR.brouillons.find(x => x.id === id); if(l){ l.enLigne = true; l.plusRecent = false; }
  BL.etat = 'ok'; BL.info = 'En ligne'; blEtatMaj();
}
// Le chemin en ligne d'une photo est aussi noté dans le montage ouvert
function blReporter(p){ const x = CR.photos.find(y => y.k === p.k); if(x){ if(p.pl) x.pl = p.pl; if(p.px) x.px = p.px; if(p.nomF) x.nomF = p.nomF; if(p.taille) x.taille = p.taille; } }
window.addEventListener('online', () => { blEnvoyer(); });

// ---------- Liste : ce qui est sur cet appareil + ce qui est en ligne ----------
window.blFusion = async function(locaux){
  const u = await blUid(); if(!u || navigator.onLine === false) return locaux;
  const { data, error } = await sb.from('brouillons').select('id,nom,modele,apercu,appareil,maj,data').order('maj', { ascending: false }).limit(200);
  if(error || !Array.isArray(data)) return locaux;
  const moi = blAppareil(), out = locaux.map(x => Object.assign({}, x));
  BL.distants = {};
  data.forEach(r => {
    BL.distants[r.id] = r;
    const tR = new Date(r.maj).getTime(), loc = out.find(x => x.id === r.id);
    if(!BL.base[r.id] && loc && Math.abs(tR - (loc.maj || 0)) < 2000) BL.base[r.id] = r.maj;
    if(!BL.emp[r.id]) BL.emp[r.id] = blEmpreinte(Object.assign({}, r.data || {}));
    if(!loc){ out.push(Object.assign({}, r.data || {}, { id: r.id, nom: r.nom || (r.data || {}).nom, modele: r.modele, apercu: r.apercu, maj: tR, enLigne: true, distant: true, appareil: r.appareil })); return; }
    loc.enLigne = true;
    if(tR > (loc.maj || 0) + 2000 && r.appareil !== moi){ loc.plusRecent = true; loc.appareil = r.appareil; loc.apercu = r.apercu || loc.apercu; loc.nom = r.nom || loc.nom; loc.majDistant = tR; }
    else if((loc.maj || 0) > tR + 2000) window.blApresGarde(loc);   // changé ici sans être envoyé : on rattrape
  });
  out.filter(x => !x.enLigne && !x.exemple).forEach(x => window.blApresGarde(x));   // jamais envoyé : on envoie
  return out.sort((a, b) => (b.majDistant || b.maj || 0) - (a.majDistant || a.maj || 0));
};
// ---------- Reprendre : la dernière version, avec ses fichiers ----------
window.blAvantReprendre = async function(id, local){
  const u = await blUid(); if(!u || navigator.onLine === false) return local;
  const el = crBody(), dire = t => { if(el && CR.vue !== 'edit') el.innerHTML = `<div class="ag-empty">${t}</div>`; };
  let r = local;
  const { data: row } = await sb.from('brouillons').select('id,nom,modele,apercu,appareil,maj,data').eq('id', id).maybeSingle();
  if(row){
    const tR = new Date(row.maj).getTime();
    const forcer = BL.forcer === id; BL.forcer = null;
    if(forcer || !local || tR > (local.maj || 0) + 2000) r = Object.assign({}, row.data || {}, { id, nom: row.nom, modele: row.modele, apercu: row.apercu, maj: tR });
    BL.base[id] = row.maj;
  }
  if(!r) return null;
  if(BL.conflit && BL.conflit.id === id) BL.conflit = null;
  // Les fichiers qui ne sont pas encore sur cet appareil
  const manque = [];
  for(const p of r.photos || []){
    if(p.src !== 'fichier') continue;
    const ici = await BR.get('fichiers', 'ph:' + p.k).catch(() => null); if(ici) continue;
    if(p.video){ if(p.px && !(await BR.get('fichiers', 'px:' + p.k).catch(() => null))) manque.push({ path: p.px, cle: 'px:' + p.k }); }
    else if(p.pl) manque.push({ path: p.pl, cle: 'ph:' + p.k });
  }
  if(r.musique && r.musique.cle && r.musique.pl && !(await BR.get('fichiers', r.musique.cle).catch(() => null))) manque.push({ path: r.musique.pl, cle: r.musique.cle });
  let i = 0;
  for(const m of manque){ i++; dire(`Téléchargement du brouillon ${i}/${manque.length}...`); try { await BR.put('fichiers', await blTelecharger(m.path), m.cle); } catch(e){ console.warn('téléchargement', m.path, e); } }
  const copie = JSON.parse(JSON.stringify(r)); delete copie.enLigne; delete copie.distant; delete copie.plusRecent; delete copie.majDistant;
  await BR.put('brouillons', copie);
  if(row) BL.emp[id] = blEmpreinte(Object.assign({}, row.data || {}));
  return copie;
};
// ---------- Suppression en ligne ----------
function blChemins(r){ const out = []; (r && r.photos || []).forEach(p => { if(p.pl) out.push(p.pl); if(p.px) out.push(p.px); }); if(r && r.musique && r.musique.pl) out.push(r.musique.pl); return out; }
window.blSupprimer = async function(id, r){ try { await blSupprimerEnLigne(id, r); } catch(e){ console.warn('suppression en ligne', e); } };
async function blSupprimerEnLigne(id, r){
  const u = await blUid(); if(!u) return;
  const distant = BL.distants[id] ? Object.assign({}, BL.distants[id].data || {}) : null;
  await sb.from('brouillons').delete().eq('id', id);
  delete BL.distants[id];
  // Les fichiers en ligne qui ne servent plus à aucun autre brouillon
  const utiles = new Set(); CR.brouillons.filter(x => x.id !== id).forEach(x => blChemins(x).forEach(c => utiles.add(c))); Object.values(BL.distants).forEach(x => blChemins(x.data).forEach(c => utiles.add(c)));
  const aEffacer = [...new Set(blChemins(r).concat(blChemins(distant)))].filter(c => !utiles.has(c));
  if(aEffacer.length) await sb.storage.from(BUCKET).remove(aEffacer);
  BL.place = null;
};
window.blToutSupprimer = async function(){
  const u = await blUid(); if(!u) return;
  await sb.from('brouillons').delete().eq('user_id', u);
  for(const d of ['f', 'px', 'm']){ const { data } = await sb.storage.from(BUCKET).list(`${u}/${d}`, { limit: 1000 }); const L = (data || []).map(x => `${u}/${d}/${x.name}`); if(L.length) await sb.storage.from(BUCKET).remove(L); }
  BL.distants = {}; BL.place = null;
};
async function blPlace(){
  if(BL.place != null) return BL.place;
  const u = await blUid(); if(!u) return null;
  let o = 0;
  for(const d of ['f', 'px', 'm']){ try { const { data } = await sb.storage.from(BUCKET).list(`${u}/${d}`, { limit: 1000 }); (data || []).forEach(x => { o += (x.metadata && x.metadata.size) || 0; }); } catch(e){} }
  BL.place = o; return o;
}

// ---------- Version plus récente ailleurs ----------
function blBandeauConflit(){
  const sc = document.getElementById('edScene') || crBody(); if(!sc) return;
  const old = document.getElementById('blConflit'); if(old) old.remove();
  const c = BL.conflit; if(!c || c.id !== CR.brouillonId || CR.vue !== 'edit') return;
  sc.insertAdjacentHTML('afterbegin', `<div id="blConflit" class="bl-conflit">${agIcon('info', 16)}<div><b>Ce brouillon a été modifié sur ${blNomAppareil(c.appareil)} (${blHeure(c.maj)}).</b> Ta version ici n'est pas envoyée tant que tu n'as pas choisi.
    <div class="mt-act"><button type="button" class="on" onclick="blPrendreAutre()">Charger cette version</button><button type="button" onclick="blGarderMienne()">Garder la mienne</button></div></div></div>`);
}
window.blPrendreAutre = async function(){ const id = BL.conflit && BL.conflit.id; BL.conflit = null; if(!id) return; BL.forcer = id; delete BL.attente[id]; await BR.del('brouillons', id); if(typeof anStop === 'function') anStop(); brReprendre(id); };
window.blGarderMienne = function(){ const c = BL.conflit; if(!c) return; BL.base[c.id] = c.maj; BL.conflit = null; const b = document.getElementById('blConflit'); if(b) b.remove(); BL.attente[c.id] = c.id; blEnvoyer(); agToast('Ta version est envoyée en ligne'); };
// Pendant le montage : on regarde de temps en temps si l'autre appareil a changé quelque chose
setInterval(async () => {
  if(CR.vue !== 'edit' || !CR.brouillonId || navigator.onLine === false || BL.conflit || document.visibilityState === 'hidden') return;
  try {
    const { data: ex } = await sb.from('brouillons').select('maj,appareil').eq('id', CR.brouillonId).maybeSingle();
    if(ex && ex.appareil !== blAppareil() && BL.base[CR.brouillonId] && new Date(ex.maj).getTime() > new Date(BL.base[CR.brouillonId]).getTime() + 1500){ BL.conflit = { id: CR.brouillonId, maj: ex.maj, appareil: ex.appareil }; BL.etat = 'conflit'; BL.info = 'Version plus récente sur ' + blNomAppareil(ex.appareil); blEtatMaj(); blBandeauConflit(); }
  } catch(e){}
}, 30000);

// ---------- Rushs : original ou proxy, et export ----------
function blProxys(){ return CR.photos.filter(p => p.video && p.proxy); }
async function blDureeDe(f){ try { const v = document.createElement('video'); v.preload = 'metadata'; v.src = URL.createObjectURL(f); await new Promise(ok => { v.onloadedmetadata = ok; v.onerror = ok; setTimeout(ok, 6000); }); const d = v.duration; URL.revokeObjectURL(v.src); return isFinite(d) ? d : null; } catch(e){ return null; } }
// Tu choisis les fichiers d'origine : chacun est relié à son rush (nom, taille, ou durée)
window.blRemettreOriginaux = function(){
  return new Promise(ok => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'video/*'; inp.multiple = true; inp.style.display = 'none';
    inp.onchange = async () => {
      const fichiers = [...(inp.files || [])]; inp.remove();
      let relies = 0;
      for(const f of fichiers){
        const reste = blProxys(); if(!reste.length) break;
        let p = reste.find(x => x.nomF && x.nomF === f.name && (!x.taille || x.taille === f.size)) || reste.find(x => x.taille && x.taille === f.size);
        if(!p){ const d = await blDureeDe(f); if(d != null) p = reste.find(x => x.vdur && Math.abs(x.vdur - d) < 0.15); }
        if(!p) continue;
        await BR.put('fichiers', f, 'ph:' + p.k); await BR.del('fichiers', 'px:' + p.k).catch(() => {});
        p.file = f; p.url = URL.createObjectURL(f); p.proxy = false; p.nomF = f.name; p.taille = f.size;
        if(typeof RV !== 'undefined'){ Object.keys(RV.els).forEach(c => { if(c.startsWith(p.k + '@')) delete RV.els[c]; }); delete RV.base[p.k]; }
        if(typeof CR_IMG !== 'undefined') delete CR_IMG[p.k];
        relies++;
      }
      const reste = blProxys().length;
      agToast(relies ? `${relies} original${relies > 1 ? 'aux' : ''} remis${reste ? ` · encore ${reste} en proxy` : ' · tout est en pleine qualité'}` : 'Aucun fichier reconnu : vérifie que ce sont bien les rushs d\'origine', relies ? 'success' : 'info');
      if(relies && typeof anPreparer === 'function'){ await anPreparer(false); if(typeof mtMaj === 'function' && document.getElementById('mtZone')) mtMaj(); else crRender(); }
      ok(relies);
    };
    document.body.appendChild(inp); inp.click();
  });
};
// Avant d'exporter : jamais en proxy sans le dire
const exporterBl = anExporter;
anExporter = async function(mode){
  const px = blProxys();
  if(px.length && anVid().sortie !== 'gif'){
    const noms = px.slice(0, 5).map(p => '• ' + (p.nomF || 'rush')).join('\n');
    if(await agConfirm(`${px.length} rush${px.length > 1 ? 's sont' : ' est'} ici en version légère (proxy) :\n${noms}\n\nPour une vidéo en pleine qualité, remets les fichiers d'origine (ils seront reconnus tout seuls), ou exporte depuis l'appareil où tu les as ajoutés.`, { ok: 'Remettre les originaux', no: 'Autre choix' })){
      await blRemettreOriginaux();
      if(blProxys().length && !await agConfirm('Certains rushs sont encore en proxy.\nExporter quand même ? Ces rushs seront moins nets dans la vidéo.', { ok: 'Exporter quand même', no: 'Annuler' })) return;
    } else if(!await agConfirm('Exporter avec les rushs en qualité proxy ?\nIls seront moins nets que les originaux (bien pour un essai, pas pour le client).', { ok: 'Exporter en qualité proxy', no: 'Annuler' })) return;
  }
  return exporterBl.apply(this, arguments);
};
// Dans les réglages d'un rush : original ou proxy
if(typeof rvPanneau === 'function'){
  const panBl = rvPanneau;
  window.rvPanneau = function(sg, d){
    const p = CR.photos[sg.i] || {}, h = panBl.apply(this, arguments);
    const tag = p.proxy ? `<div class="bl-rv proxy">${agIcon('info', 13)} Proxy : l'original est sur un autre appareil. <button type="button" class="st-link" onclick="blRemettreOriginaux()">Remettre l'original</button></div>`
      : `<div class="bl-rv ok">${agIcon('check', 13)} Original sur cet appareil (pleine qualité)</div>`;
    return h.replace('<div class="rv-pan">', '<div class="rv-pan">' + tag);
  };
}

// ---------- Affichage : état en ligne, étiquettes, place utilisée ----------
function blEtatMaj(){
  const el = document.getElementById('blEtat'); if(!el) return;
  const t = { ok: 'En ligne', envoi: BL.info || 'Envoi...', attente: 'Envoi dans un instant', hors: 'Hors ligne · envoi plus tard', erreur: BL.info || 'Envoi en attente', conflit: BL.info || 'Version plus récente ailleurs' }[BL.etat] || '';
  el.textContent = t; el.className = 'bl-etat ' + (BL.etat || '');
}
const renderBl = crRender;
crRender = async function(){
  const r = await renderBl.apply(this, arguments);
  if(CR.vue === 'accueil'){
    const body = crBody();
    (CR.brouillons || []).forEach(b => {
      const btn = body && body.querySelector(`.br-c button[onclick="brReprendre('${b.id}')"]`); const sm = btn && btn.closest('.br-c') && btn.closest('.br-c').querySelector('.br-d small'); if(!sm || sm.querySelector('.bl-tag')) return;
      const tag = b.plusRecent ? `<span class="bl-tag neuf">Plus récent sur ${blNomAppareil(b.appareil)}</span>` : b.distant ? `<span class="bl-tag">Fait sur ${blNomAppareil(b.appareil)}</span>` : b.enLigne ? '<span class="bl-tag ok">En ligne</span>' : '<span class="bl-tag att">Sur cet appareil · envoi en attente</span>';
      sm.insertAdjacentHTML('beforeend', ' ' + tag);
    });
    const sec = body && [...body.querySelectorAll('.cr-sec')].find(x => /Mes brouillons/.test(x.textContent));
    if(sec && !sec.querySelector('.bl-place')){
      blPlace().then(o => { if(o == null || !sec.isConnected || sec.querySelector('.bl-place')) return; const mo = o / 1048576; sec.insertAdjacentHTML('beforeend', ` <span class="bl-place">En ligne : ${mo < 10 ? mo.toFixed(1).replace('.', ',') : Math.round(mo)} Mo sur ${LIMITE} Mo</span>`); });
    }
  }
  if(CR.vue === 'edit'){
    const g = document.querySelector('.ed-g') || crBody();
    if(g && !document.getElementById('blEtat')){ const s = document.createElement('span'); s.id = 'blEtat'; s.className = 'bl-etat'; g.appendChild(s); }
    blEtatMaj(); blBandeauConflit();
  }
  return r;
};

(function blCss(){
  if(document.getElementById('blCss')) return;
  const st = document.createElement('style'); st.id = 'blCss';
  st.textContent = `
.bl-etat{font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px}
.bl-etat.ok{color:var(--accent)}.bl-etat.ok::before{content:'✓ '}
.bl-etat.erreur,.bl-etat.conflit{color:#f5a524}
.bl-tag{display:inline-block;margin-left:2px;padding:1px 7px;border-radius:999px;font-size:10.5px;background:var(--card2);color:var(--muted)}
.bl-tag.ok{color:var(--accent)}.bl-tag.neuf{background:color-mix(in srgb,#f5a524 20%,transparent);color:#f5a524}.bl-tag.att{color:var(--muted)}
.bl-place{float:right;font-size:11px;font-weight:500;color:var(--muted);text-transform:none;letter-spacing:0}
.bl-conflit{display:flex;gap:8px;width:100%;box-sizing:border-box;padding:10px 12px;border-radius:12px;background:color-mix(in srgb,#f5a524 14%,var(--card));border:1px solid color-mix(in srgb,#f5a524 45%,transparent);font-size:12.5px;color:var(--text);line-height:1.4}
.bl-conflit svg{flex:none;margin-top:2px;color:#f5a524}
.bl-rv{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:8px;padding:6px 9px;border-radius:9px;font-size:12px}
.bl-rv.ok{background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--text)}.bl-rv.ok svg{color:var(--accent)}
.bl-rv.proxy{background:color-mix(in srgb,#f5a524 16%,transparent);color:var(--text)}.bl-rv.proxy svg{color:#f5a524}`;
  document.head.appendChild(st);
})();
})();
