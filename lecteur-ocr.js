// ============================================================
// LECTEUR-OCR.JS - Lecture du texte des images, sur l'appareil
// Moteur : Tesseract.js 6.0.1 (+ moteur tesseract.js-core 6.1.2), français + anglais.
// Tous les fichiers sont dans le dossier tesseract/ de la Super App : aucune image ni
// aucun texte ne quitte l'appareil, et aucun CDN n'est utilisé.
// Chargé seulement quand on lance une lecture (le moteur pèse environ 8 Mo la 1re fois).
// Utilisé par lecteur.js : LecteurOCR.lire(blob, { inverser, progres }) -> { texte, confiance, blocs, inverse }
// ============================================================
(function(){
if(window.LecteurOCR) return;

const BASE = new URL('tesseract/', document.baseURI).href;
const VER = '1';
let chargement = null;   // promesse du moteur
let worker = null;
let file = Promise.resolve();   // une lecture à la fois
let rappel = null;              // fonction de progression de la lecture en cours

function script(url){
  return new Promise((ok, ko) => {
    const s = document.createElement('script');
    s.src = url; s.onload = ok;
    s.onerror = () => ko(new Error("Le moteur de lecture n'a pas pu être chargé. Vérifie ta connexion et réessaie."));
    document.head.appendChild(s);
  });
}

const ETAPES = {
  'loading tesseract core': 'Préparation du moteur…',
  'initializing tesseract': 'Préparation du moteur…',
  'loading language traineddata': 'Chargement du français et de l’anglais…',
  'loading language traineddata (from cache)': 'Chargement du français et de l’anglais…',
  'initializing api': 'Préparation du moteur…',
  'recognizing text': 'Lecture du texte…'
};
function logger(m){
  if(!rappel || !m) return;
  const txt = ETAPES[m.status];
  if(txt) rappel({ etape: txt, part: typeof m.progress === 'number' ? m.progress : 0, lecture: m.status === 'recognizing text' });
}

async function moteur(){
  if(worker) return worker;
  if(!chargement){
    chargement = (async () => {
      if(!window.Tesseract) await script(BASE + 'tesseract.min.js?v=' + VER);
      const w = await window.Tesseract.createWorker(['fra', 'eng'], 1, {
        workerPath: BASE + 'worker.min.js?v=' + VER,
        corePath: BASE,
        langPath: BASE,
        logger
      });
      worker = w;
      return w;
    })().catch(e => { chargement = null; throw e; });
  }
  return chargement;
}

// Prépare l'image : agrandit les petites captures et inverse les captures sombres (texte clair sur fond foncé).
async function preparer(blob, inverser){
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error('Image illisible')); i.src = url; });
    const long = Math.max(img.naturalWidth, img.naturalHeight);
    const k = long < 1400 ? Math.min(2, 2800 / long) : 1;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
    const g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);

    // Luminosité moyenne sur un petit échantillon
    const s = document.createElement('canvas'); s.width = 48; s.height = 48;
    const sg = s.getContext('2d', { willReadFrequently: true }); sg.drawImage(c, 0, 0, 48, 48);
    const d = sg.getImageData(0, 0, 48, 48).data; let tot = 0;
    for(let i = 0; i < d.length; i += 4) tot += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const moy = tot / (d.length / 4);
    const sombre = moy < 110;
    const inverse = inverser === undefined || inverser === null ? sombre : !!inverser;
    if(inverse){
      g.globalCompositeOperation = 'difference'; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = 'source-over';
    }
    const out = await new Promise((ok, ko) => c.toBlob(b => b ? ok(b) : ko(new Error('Image illisible')), 'image/png'));
    return { blob: out, inverse, sombre, ratio: k };
  } finally { URL.revokeObjectURL(url); }
}

function blocs(data, k){
  const out = [];
  (data.blocks || []).forEach(b => (b.paragraphs || []).forEach(p => {
    const t = String(p.text || '').replace(/\s+$/, '');
    if(!t.trim()) return;
    const bb = p.bbox || {};
    out.push({ texte: t, x0: Math.round(bb.x0 / k), y0: Math.round(bb.y0 / k), x1: Math.round(bb.x1 / k), y1: Math.round(bb.y1 / k), confiance: Math.round(p.confidence || 0) });
  }));
  return out;
}

function lire(blob, opt){
  opt = opt || {};
  const tache = file.then(async () => {
    rappel = opt.progres || null;
    try {
      if(rappel) rappel({ etape: 'Préparation du moteur…', part: 0 });
      const w = await moteur();
      const prep = await preparer(blob, opt.inverser);
      const r = await w.recognize(prep.blob, {}, { text: true, blocks: true });
      const d = r.data || {};
      return {
        texte: String(d.text || '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim(),
        confiance: Math.round(d.confidence || 0),
        blocs: blocs(d, prep.ratio),
        inverse: prep.inverse
      };
    } finally { rappel = null; }
  });
  file = tache.catch(() => {});
  return tache;
}

async function fermer(){
  const w = worker; worker = null; chargement = null;
  if(w){ try { await w.terminate(); } catch(e){} }
}

window.LecteurOCR = { lire, fermer };
})();
