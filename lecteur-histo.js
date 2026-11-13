// ============================================================
// LECTEUR-HISTO.JS - Historique du Lecteur d'images (sur cet appareil)
// - Seuls les TEXTES et les réponses de l'IA sont enregistrés, jamais les images.
// - Chaque entrée est chiffrée (AES-GCM) avec une clé non exportable gardée dans IndexedDB :
//   copier le dossier du navigateur ne suffit pas à lire les textes.
// - Rien n'est envoyé en ligne. Suppression : une entrée, ou tout d'un coup.
// Utilisé par lecteur.js : LecteurHisto.ajouter / lister / lire / supprimer / toutEffacer
// ============================================================
(function(){
if(window.LecteurHisto) return;

const DB = 'henzoLecteur', V = 1, ENTREES = 'entrees', CLES = 'cles';
let dbP = null;

function ouvrir(){
  if(!dbP) dbP = new Promise((ok, ko) => {
    if(!window.indexedDB){ ko(new Error("L'enregistrement n'est pas disponible sur ce navigateur.")); return; }
    const r = indexedDB.open(DB, V);
    r.onupgradeneeded = () => {
      const d = r.result;
      if(!d.objectStoreNames.contains(ENTREES)) d.createObjectStore(ENTREES, { keyPath: 'id' });
      if(!d.objectStoreNames.contains(CLES)) d.createObjectStore(CLES);
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => { dbP = null; ko(r.error || new Error("L'enregistrement n'est pas disponible (navigation privée ?).")); };
  });
  return dbP;
}
function tx(store, mode, fn){
  return ouvrir().then(db => new Promise((ok, ko) => {
    const t = db.transaction(store, mode), s = t.objectStore(store), r = fn(s);
    t.oncomplete = () => ok(r && 'result' in r ? r.result : undefined);
    t.onerror = t.onabort = () => ko(t.error || new Error('Erreur de stockage'));
  }));
}

let cleP = null;
function cle(){
  if(!cleP) cleP = (async () => {
    let k = await tx(CLES, 'readonly', s => s.get('principale'));
    if(!k){
      k = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);   // false = non exportable
      await tx(CLES, 'readwrite', s => s.put(k, 'principale'));
    }
    return k;
  })().catch(e => { cleP = null; throw e; });
  return cleP;
}
async function chiffrer(obj){
  const k = await cle(), iv = crypto.getRandomValues(new Uint8Array(12));
  const c = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(JSON.stringify(obj)));
  return { iv, c };
}
async function dechiffrer(e){
  const k = await cle();
  const p = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: e.iv }, k, e.c);
  return JSON.parse(new TextDecoder().decode(p));
}

// entree : { titre, sections:[{titre,texte}], chat:[{role,text}] }
async function ajouter(entree){
  const id = Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  const { iv, c } = await chiffrer({ titre: entree.titre || '', sections: entree.sections || [], chat: entree.chat || [] });
  await tx(ENTREES, 'readwrite', s => s.put({ id, date: Date.now(), iv, c }));
  return id;
}
async function lister(){
  const tout = await tx(ENTREES, 'readonly', s => s.getAll());
  const out = [];
  for(const e of (tout || []).sort((a, b) => b.date - a.date)){
    try { const d = await dechiffrer(e); out.push({ id: e.id, date: e.date, titre: d.titre, nb: (d.sections || []).length, msgs: (d.chat || []).length }); }
    catch(_){ out.push({ id: e.id, date: e.date, titre: '(entrée illisible)', nb: 0, msgs: 0, illisible: true }); }
  }
  return out;
}
async function lire(id){
  const e = await tx(ENTREES, 'readonly', s => s.get(id));
  if(!e) throw new Error('Entrée introuvable.');
  return { id: e.id, date: e.date, ...(await dechiffrer(e)) };
}
function supprimer(id){ return tx(ENTREES, 'readwrite', s => s.delete(id)); }
async function toutEffacer(){
  await tx(ENTREES, 'readwrite', s => s.clear());
  await tx(CLES, 'readwrite', s => s.clear());   // la clé est détruite aussi
  cleP = null;
}

window.LecteurHisto = { ajouter, lister, lire, supprimer, toutEffacer };
})();
