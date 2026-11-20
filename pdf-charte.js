// ============================================================
// PDF-CHARTE.JS - Charte Henzo Studio pour les PDF fabriqués par l'app (jsPDF)
// ------------------------------------------------------------
// Couleurs de la charte (version papier = thème clair), logo officiel et
// petits éléments communs. Le logo est lu une fois au chargement et gardé
// en mémoire : si il n'est pas encore prêt (ou hors ligne), le PDF reçoit
// le nom en texte à la place, il n'échoue jamais.
// Polices : jsPDF n'embarque que Helvetica / Times / Courier, on utilise
// Times en gras pour les titres (le plus proche de Fraunces) et Helvetica
// pour le texte (le plus proche d'Inter).
// ============================================================
(function(){
'use strict';
const C = {
  encre:  [19, 21, 15],      // #13150f
  doux:   [58, 61, 50],      // #3a3d32
  muted:  [92, 95, 84],      // #5c5f54
  leger:  [168, 171, 157],   // #a8ab9d
  ligne:  [226, 224, 214],   // #e2e0d6
  fond:   [241, 239, 233],   // #f1efe9
  olive:  [95, 110, 58],     // #5f6e3a
  surOlive: [250, 249, 246]  // #faf9f6 (texte sur fond olive)
};
const LOGO = { data: null, w: 783, h: 279 };
function charger(){
  try {
    fetch('logos/logo-horizontal-sombre-fondclair.png').then(r => r.ok ? r.blob() : Promise.reject()).then(b => {
      const fr = new FileReader(); fr.onload = () => { LOGO.data = fr.result; }; fr.readAsDataURL(b);
    }).catch(() => {});
  } catch(e){}
}
// Pose le logo (largeur en mm) ; renvoie la hauteur utilisée, ou 0 si le logo n'est pas prêt
function logo(doc, x, y, largeur){
  if(!LOGO.data) return 0;
  try { const h = largeur * LOGO.h / LOGO.w; doc.addImage(LOGO.data, 'PNG', x, y, largeur, h, 'hzlogo', 'FAST'); return h; } catch(e){ return 0; }
}
// Applique une couleur [r,g,b]
const texte = (doc, c) => doc.setTextColor(c[0], c[1], c[2]);
const remplir = (doc, c) => doc.setFillColor(c[0], c[1], c[2]);
const trait = (doc, c) => doc.setDrawColor(c[0], c[1], c[2]);
window.hzPdf = { C, logo, texte, remplir, trait, prete: () => !!LOGO.data };
charger();
})();
