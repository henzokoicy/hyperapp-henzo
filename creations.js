// ============================================================
// CREATIONS.JS - L'atelier de visuels (onglet Studio > Créations)
// ------------------------------------------------------------
// Affiches promo, affiches épurées, stories avec texte, mosaïques,
// cadres (polaroid, pellicule, bordure, passe-partout), citations,
// avant / après, carrousels et storyboards.
// Photos : téléphone, galeries clients, photos déjà envoyées (marketing).
// Toujours la police de Ma marque (sans empattement) : une seule famille,
// différentes tailles et épaisseurs.
// Styles enregistrés (table creations, kind 'style') : on garde un style
// et on le refait sur d'autres photos. Créations faites (kind 'creation').
// Entrées : crOuvrir({photos, titre, modele, shoot_id}), crDepuisPost(a, b), crDepuisPlan(id)
// Chargé par argent.js. Utilise studio.js (Ma marque, polices) et marketing.js (images).
// ============================================================

const CR = {
  vue: 'accueil', modele: null, fmt: 'post', photos: [], crop: [], sel: 0, slide: 0,
  cfg: null, styles: [], recents: [], charge: false, busy: '',
  src: 'tel', galList: null, gal: null, galPhotos: [], media: null, shoot_id: null, styleId: null,
  exp: { q: 'web', papier: 'A4', perso: 5000, type: 'jpeg' }
};
try { const e = JSON.parse(localStorage.getItem('crExp') || 'null'); if(e && e.q) CR.exp = Object.assign(CR.exp, e); } catch(e){}
// Formats (r = largeur / hauteur). L'aperçu fait 1080 px sur le petit côté ;
// l'image finale est recalculée à la taille choisie (jusqu'à 8000 px), sans perte.
const CR_FMT = {
  post: { r: 4 / 5, nom: '4:5 Publication', usage: 'Facebook, Instagram (le plus vu)' },
  carre: { r: 1, nom: '1:1 Carré', usage: 'Instagram, Facebook' },
  story: { r: 9 / 16, nom: '9:16 Story', usage: 'Statut WhatsApp, stories, TikTok' },
  photo23: { r: 2 / 3, nom: '2:3 Photo portrait', usage: 'Tirages 10x15, 20x30, 40x60' },
  photo32: { r: 3 / 2, nom: '3:2 Photo paysage', usage: 'Tirages 10x15, 20x30, 40x60' },
  a4: { r: 1 / Math.SQRT2, nom: 'A4 / A3 portrait', usage: 'Affiche ou flyer imprimé' },
  a4p: { r: Math.SQRT2, nom: 'A4 / A3 paysage', usage: 'Affiche ou flyer imprimé' },
  paysage: { r: 1.91, nom: '1,91:1 Lien', usage: 'Lien et publicité Facebook' },
  large: { r: 16 / 9, nom: '16:9 Large', usage: 'Écran, YouTube, présentation' },
  couverture: { r: 820 / 312, nom: 'Couverture Facebook', usage: 'Bannière de ta page' }
};
const CR_VERT = ['post', 'carre', 'story', 'photo23', 'a4'];
const CR_TOUS = Object.keys(CR_FMT);
function crDims(fmt, k){
  const r = (CR_FMT[fmt] || CR_FMT.post).r;
  const w0 = r >= 1 ? Math.round(1080 * r) : 1080, h0 = r >= 1 ? 1080 : Math.round(1080 / r);
  return { w: Math.round(w0 * (k || 1)), h: Math.round(h0 * (k || 1)), w0, h0 };
}
// Qualités de l'image finale (côté le plus long)
const CR_QUAL = [
  ['leger', 'Léger', 1080, 'WhatsApp, envoi rapide'],
  ['web', 'Réseaux sociaux', 2048, 'Net sur Facebook et Instagram'],
  ['hd', 'Haute qualité', 4096, 'Portfolio, grand écran'],
  ['max', 'Très haute', 6000, 'Pour garder ou imprimer grand'],
  ['print', 'Impression', 0, '300 points par pouce'],
  ['perso', 'Sur mesure', 0, 'Tu choisis le nombre de pixels']
];
// Papiers (cm, côté court x côté long) et format qui leur correspond
const CR_PAPIERS = [
  ['10x15', 10, 15, 'photo'], ['13x18', 13, 18, 'a4'], ['15x21', 15, 21, 'a4'], ['20x25', 20, 25, 'post'],
  ['20x30', 20, 30, 'photo'], ['A4', 21, 29.7, 'a4'], ['30x45', 30, 45, 'photo'], ['A3', 29.7, 42, 'a4'], ['40x60', 40, 60, 'photo'], ['50x70', 50, 70, 'a4']
];
const CR_MAX_PIX = 36e6;   // au-delà, beaucoup de téléphones refusent de créer l'image
// [cle, nom, description, photos min, photos max, formats possibles]
const CR_MODELES = [
  ['affiche', 'Affiche promo', 'Une photo, un titre, une offre, un prix', 1, 1, CR_TOUS],
  ['editorial', 'Affiche éditoriale', 'Bords flous, grain, grand texte au pinceau, crédits', 1, 1, CR_TOUS],
  ['minigalerie', 'Mini-galerie', 'Une carte épurée avec 3 à 6 photos', 3, 6, CR_VERT],
  ['magazine', 'Couverture magazine', 'Grand titre en haut, comme un magazine', 1, 1, CR_VERT],
  ['phototexte', 'Photo dans le texte', 'Ta photo à l\'intérieur d\'un grand mot', 1, 1, CR_TOUS],
  ['triptyque', 'Triptyque', '3 photos en bandes verticales', 3, 3, CR_TOUS],
  ['bandeau', 'Bande de couleur', 'Photo et une bande de ta couleur avec le texte', 1, 1, CR_TOUS],
  ['epure', 'Affiche épurée', 'Photo encadrée, texte sur une bande claire', 1, 1, CR_VERT],
  ['story', 'Story avec texte', 'Pour le statut WhatsApp et les stories', 1, 1, ['story', 'photo23', 'a4']],
  ['mosaique', 'Mosaïque', '2 à 9 photos en grille', 2, 9, CR_TOUS],
  ['cadre', 'Photo encadrée', 'Polaroid, pellicule, bordure, passe-partout', 1, 3, CR_VERT.concat(['photo32', 'a4p'])],
  ['citation', 'Citation', 'Une phrase forte sur une photo', 1, 1, CR_TOUS],
  ['avantapres', 'Avant / après', 'Deux photos côte à côte', 2, 2, CR_TOUS],
  ['carrousel', 'Carrousel', 'Une série d\'images qui racontent la séance', 2, 10, ['post', 'carre', 'photo23']],
  ['storyboard', 'Storyboard', '3 moments de la séance en une image', 3, 3, ['story', 'post', 'photo23', 'a4']]
];
const CR_CADRES = [['polaroid', 'Polaroid'], ['pellicule', 'Pellicule'], ['fine', 'Bordure fine'], ['passe', 'Passe-partout']];
const CR_POS = [['haut', 'En haut'], ['centre', 'Au centre'], ['bas', 'En bas']];

function crModele(k){
  const m = CR_MODELES.find(x => x[0] === (k || CR.modele));
  if(!m && typeof anModele === 'function') return anModele(k || CR.modele);
  return m ? { k: m[0], nom: m[1], desc: m[2], min: m[3], max: m[4], fmts: m[5] } : null;
}
function crM(){ return typeof stM === 'function' ? stM() : {}; }
function crPolice(){ const P = typeof ST_POLICES !== 'undefined' ? ST_POLICES : null; const k = (CR.cfg && CR.cfg.police) || crM().police || 'montserrat'; return P ? (P[k] || P.montserrat) : { titre: 'Montserrat', tw: 800, texte: 'Inter', xw: 600 }; }
function crCouleurs(){ return typeof stCouleurs === 'function' ? stCouleurs() : { fond: '#00524D', texte: '#ffffff', accent: '#48A89A' }; }
function crE(s){ return agEsc(s); }
function crJ(o){ return agEsc(JSON.stringify(o)); }

function crCfgDefaut(){
  const m = crM(), c = crCouleurs();
  return {
    police: m.police || 'montserrat', fond: c.fond, texte: c.texte, accent: c.accent, clair: '#f6f3ee', encre: '#1b1b1b',
    eyebrow: '', titre: '', sous: '', offre: '', prix: '', appel: 'Réserve ta séance', contact: m.contact || '',
    citation: '', auteur: '', legendes: ['', '', ''], avant: 'Avant', apres: 'Après',
    logo: true, copyright: true, voile: 0.55, pos: 'bas', align: 'centre', taille: 1,
    gap: 14, bord: 0, bordCouleur: '#ffffff', cadre: 'polaroid', sens: 'auto',
    // Mot géant (texte créatif par-dessus la photo) et affiche éditoriale
    mot: '', motPolice: 'pinceau', motCouleur: '', motOpacite: 0.85, motFlou: 1, motTaille: 1, motPos: 'centre', motMaj: true,
    credits: '', partenaire: '', flouBords: 0.7,
    // Effets : filtre, grain, vignette, lumière, effet perso (image ajoutée)
    effets: { filtre: 'aucun', grain: 0, vignette: 0, lumiere: 0, perso: null, persoBlend: 'screen', persoOpac: 0.6 }
  };
}

// ============================================================
// DONNEES : styles et créations (table creations)
// ============================================================
async function crCharger(force){
  if(CR.charge && !force) return;
  try {
    const { data, error } = await sb.from('creations').select('id,kind,nom,modele,config,apercu,media_path,shoot_id,created_at').order('created_at', { ascending: false }).limit(80);
    if(error) throw error;
    CR.styles = (data || []).filter(x => x.kind === 'style');
    CR.effets = (data || []).filter(x => x.kind === 'effet');
    CR.recents = (data || []).filter(x => x.kind === 'creation').slice(0, 30);
  } catch(e){ console.warn('creations', e); CR.styles = CR.styles || []; CR.recents = CR.recents || []; }
  CR.charge = true;
}

// ============================================================
// AFFICHAGE
// ============================================================
function crBody(){ return document.getElementById('crBody'); }
async function crRender(){
  const el = crBody(); if(!el) return;
  crCss();
  if(typeof stFonts === 'function') stFonts();
  if(!CR.charge){ el.innerHTML = '<div class="ag-empty">Chargement...</div>'; await crCharger(); }
  if(!CR.cfg) CR.cfg = crCfgDefaut();
  if(CR.vue === 'photos') el.innerHTML = crVuePhotos();
  else if(CR.vue === 'edit' && typeof anEst === 'function' && anEst(CR.modele)) { el.innerHTML = anVueEdit(); anDemarrerApercu(); if(typeof mkHydrate === 'function') mkHydrate(el); }
  else if(CR.vue === 'edit') { el.innerHTML = crVueEdit(); crDessinerApercu(); crBrancherApercu(); if(typeof mkHydrate === 'function') mkHydrate(el); }
  else el.innerHTML = crVueAccueil();
  if(CR.vue === 'photos') crHydrater();
  if(CR.vue === 'accueil' && typeof mkHydrate === 'function') mkHydrate(el);
}

function crVueAccueil(){
  return `<div class="cr-top"><h2>Créations</h2><p>Affiches, stories, mosaïques et cadres avec tes photos. Toujours ta police, tes couleurs et ton logo. Garde un style qui te plaît et refais-le sur d'autres photos.</p></div>
    <div class="cr-sec">Nouvelle création</div>
    <div class="cr-modeles">${CR_MODELES.map(([k, nom, desc]) => `<button class="cr-mod" onclick="crChoisirModele('${k}')"><span class="cr-mini">${crMini(k)}</span><b>${crE(nom)}</b><small>${crE(desc)}</small></button>`).join('')}</div>
    ${typeof CR_VIDEOS !== 'undefined' ? `<div class="cr-sec">Vidéos et GIF animés <i>avec musique</i></div>
    <div class="cr-modeles">${CR_VIDEOS.map(([k, nom, desc]) => `<button class="cr-mod" onclick="crChoisirModele('${k}')"><span class="cr-mini">${crMini(k)}</span><b>${crE(nom)}</b><small>${crE(desc)}</small></button>`).join('')}</div>` : ''}
    <div class="cr-sec">Mes styles ${CR.styles.length ? `<i>${CR.styles.length}</i>` : ''}</div>
    ${CR.styles.length ? `<div class="cr-styles">${CR.styles.map(s => `<div class="cr-style"><button class="cr-st-img" onclick="crAppliquerStyle(${s.id})">${s.apercu ? `<img src="${crE(s.apercu)}" alt="">` : crMini(s.modele)}</button>
        <div class="cr-st-d"><b>${crE(s.nom || 'Mon style')}</b><small>${crE((crModele(s.modele) || {}).nom || '')}</small>
        <div class="cr-st-b"><button onclick="crAppliquerStyle(${s.id})">Refaire avec d'autres photos</button><button class="no" onclick="crSupprimer(${s.id})">Supprimer</button></div></div></div>`).join('')}</div>`
      : '<div class="ag-hint">Quand une création te plaît, touche "Garder ce style" : tu pourras le refaire en un clic sur d\'autres photos.</div>'}
    ${CR.recents.length ? `<div class="cr-sec">Mes dernières créations</div><div class="cr-recents">${CR.recents.map(r => `<button class="cr-rec" title="${crE(r.nom || '')}" onclick="crRouvrir(${r.id})">${r.apercu ? `<img src="${crE(r.apercu)}" alt="">` : crMini(r.modele)}</button>`).join('')}</div>` : ''}`;
}
// Petit dessin du modèle (pour les cartes)
function crMini(k){
  const R = (x, y, w, h, o, rx) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx || 2}" fill="currentColor" opacity="${o}"/>`;
  const svg = c => `<svg viewBox="0 0 40 50" aria-hidden="true">${c}</svg>`;
  switch(k){
    case 'affiche': return svg(R(0, 0, 40, 50, .25) + R(4, 30, 22, 5, 1) + R(4, 37, 14, 2, .7) + R(26, 40, 10, 6, 1, 3));
    case 'epure': return svg(R(0, 0, 40, 50, .08) + R(4, 4, 32, 30, .3) + R(8, 38, 24, 4, .9) + R(12, 44, 16, 2, .6));
    case 'story': return svg(R(6, 0, 28, 50, .25) + R(9, 6, 18, 4, 1) + R(12, 42, 16, 4, 1, 2));
    case 'mosaique': return svg(R(0, 0, 19, 24, .35) + R(21, 0, 19, 24, .25) + R(0, 26, 19, 24, .25) + R(21, 26, 19, 24, .35));
    case 'cadre': return svg(R(0, 0, 40, 50, .08) + R(5, 5, 30, 32, .35) + R(12, 42, 16, 2, .7));
    case 'citation': return svg(R(0, 0, 40, 50, .35) + `<text x="8" y="20" font-size="14" fill="currentColor">"</text>` + R(8, 24, 24, 3, 1) + R(11, 30, 18, 3, .8));
    case 'avantapres': return svg(R(0, 0, 19, 50, .35) + R(21, 0, 19, 50, .2) + R(19, 0, 2, 50, 1));
    case 'carrousel': return svg(R(0, 6, 12, 38, .2) + R(14, 4, 12, 42, .4) + R(28, 6, 12, 38, .2));
    case 'editorial': return svg(R(0, 0, 40, 50, .3) + R(8, 2, 24, 3, .8) + `<text x="20" y="30" font-size="11" text-anchor="middle" fill="currentColor" font-weight="700" opacity=".9">ABC</text>` + R(13, 44, 14, 2, .7));
    case 'magazine': return svg(R(0, 0, 40, 50, .3) + R(4, 3, 32, 8, 1) + R(4, 20, 2, 5, 1) + R(8, 21, 12, 3, .8) + R(4, 40, 26, 5, 1));
    case 'phototexte': return svg(R(0, 0, 40, 50, .08) + `<text x="20" y="31" font-size="15" font-weight="900" text-anchor="middle" fill="currentColor">ABC</text>` + R(10, 38, 20, 2, .6));
    case 'triptyque': return svg(R(1, 1, 12, 40, .35) + R(14, 1, 12, 40, .25) + R(27, 1, 12, 40, .35) + R(8, 44, 24, 3, .8));
    case 'bandeau': return svg(R(0, 0, 40, 32, .3) + R(0, 32, 40, 18, 1) + R(4, 36, 20, 3, .3) + R(4, 42, 12, 4, .5, 2));
    case 'minigalerie': return svg(R(0, 0, 40, 50, .08) + R(4, 4, 18, 3, .9) + R(4, 10, 15, 15, .35) + R(21, 10, 15, 15, .25) + R(4, 27, 15, 15, .25) + R(21, 27, 15, 15, .35) + R(4, 45, 20, 2, .6));
    case 'storyboard': return svg(R(8, 0, 24, 15, .35) + R(8, 17, 24, 15, .25) + R(8, 34, 24, 16, .35));
  }
  if(/^v-/.test(k)) return svg(R(4, 2, 32, 46, .25, 4) + `<path d="M16 17l11 8-11 8z" fill="currentColor"/>` + R(8, 42, 24, 2, .7));
  return svg(R(0, 0, 40, 50, .3));
}

// ---------- 1. Choix du modèle ----------
function crChoisirModele(k){
  const M = crModele(k); if(!M) return;
  CR.modele = k; CR.styleId = null;
  if(!M.fmts.includes(CR.fmt)) CR.fmt = M.fmts[0];
  if(k === 'story' || k === 'storyboard') CR.fmt = 'story';
  if(/^v-/.test(k) && !CR.fmtVideo){ CR.fmt = 'story'; CR.fmtVideo = true; }
  CR.slide = 0;
  if(CR.photos.length >= M.min){ CR.photos = CR.photos.slice(0, M.max); CR.vue = 'edit'; }
  else CR.vue = 'photos';
  crRender(); window.scrollTo({ top: 0 });
}

// ---------- 2. Choix des photos ----------
function crVuePhotos(){
  const M = crModele();
  const n = CR.photos.length;
  const besoin = M.min === M.max ? `${M.min} photo${M.min > 1 ? 's' : ''}` : `${M.min} à ${M.max} photos`;
  const onglet = (k, l) => `<button class="${CR.src === k ? 'on' : ''}" onclick="CR.src='${k}';crRender()">${l}</button>`;
  return `<button class="ag-back" onclick="CR.vue='accueil';crRender()">${agIcon('chev', 16)} Créations</button>
    <div class="cr-top"><h2>${crE(M.nom)}</h2><p>Choisis ${besoin}. Touche une photo pour la prendre ou l'enlever.</p></div>
    <div class="cr-choisies">${n ? CR.photos.map((p, i) => `<div class="cr-ch"><img src="${crE(p.thumb || p.url || '')}" ${p.path && !p.thumb ? `data-mkp="${crE(p.path)}"` : ''} alt=""><i>${i + 1}</i><button onclick="crRetirer(${i})" aria-label="Retirer">×</button></div>`).join('') : '<span class="ag-hint" style="margin:0">Aucune photo choisie</span>'}</div>
    <div class="ag-pills cr-srcs">${onglet('tel', 'Téléphone / ordinateur')}${onglet('gal', 'Mes galeries')}${onglet('media', 'Mes photos envoyées')}</div>
    <div id="crSrc">${crSrcHtml()}</div>
    <div class="cr-foot"><button class="btn-primary" ${n < M.min ? 'disabled' : ''} onclick="CR.vue='edit';crRender();window.scrollTo({top:0})">${n < M.min ? `Choisis encore ${M.min - n} photo${M.min - n > 1 ? 's' : ''}` : 'Créer'}</button></div>
    <input type="file" id="crFile" accept="image/*" multiple style="display:none" onchange="crFichiers(this.files)">`;
}
function crSrcHtml(){
  if(CR.src === 'tel') return `<div class="ot-dropzone cr-drop" onclick="document.getElementById('crFile').click()">${agIcon('download', 20)}<div><b>Choisir des photos</b><span>sur ton téléphone ou ton ordinateur</span></div></div>`;
  if(CR.src === 'gal'){
    if(typeof galApi !== 'function') return '<div class="ag-hint">La galerie n\'est pas disponible.</div>';
    if(!CR.galList) return '<div class="ag-empty">Chargement de tes galeries...</div>';
    if(CR.galList.erreur) return `<div class="ag-hint warn">${crE(CR.galList.erreur)}</div>`;
    if(!CR.gal) return `<div class="cr-gals">${CR.galList.map(g => `<button onclick="crOuvrirGalerie('${crE(g.code)}')"><b>${crE((g.options || {}).titre || g.nomClient)}</b><small>${g.nbPhotos || 0} photos</small></button>`).join('') || '<div class="ag-empty">Aucune galerie</div>'}</div>`;
    return `<button class="st-link" onclick="CR.gal=null;crRender()">${agIcon('chev', 14)} Toutes les galeries</button>
      <div class="cr-grille">${CR.galPhotos.length ? CR.galPhotos.map(p => `<button class="${CR.photos.some(x => x.k === p.k) ? 'on' : ''}" onclick="crBasculer(${crJ(p)})"><img loading="lazy" src="${crE(p.thumb)}" alt=""></button>`).join('') : '<div class="ag-empty">Chargement des photos...</div>'}</div>`;
  }
  if(CR.src === 'media'){
    if(!CR.media) return '<div class="ag-empty">Chargement...</div>';
    return CR.media.length ? `<div class="cr-grille">${CR.media.map(m => { const p = { k: 'm:' + m.path, src: 'media', path: m.path }; return `<button class="${CR.photos.some(x => x.k === p.k) ? 'on' : ''}" onclick="crBasculer(${crJ(p)})"><img loading="lazy" data-mkp="${crE(m.path)}" src="" alt=""></button>`; }).join('')}</div>`
      : '<div class="ag-empty">Pas encore de photos envoyées. Elles arrivent quand tu envoies des photos à l\'agent marketing ou quand tu enregistres une création.</div>';
  }
  return '';
}
async function crHydrater(){
  if(CR.src === 'gal' && !CR.galList && typeof galApi === 'function'){
    try {
      if(typeof galPwd !== 'undefined' && !galPwd && typeof getGaleriePwd === 'function') galPwd = await getGaleriePwd();
      CR.galList = (typeof galList !== 'undefined' && galList.length) ? galList : await galApi('/api/admin/galeries');
    } catch(e){ CR.galList = { erreur: 'Galerie injoignable : ' + (e.message || e) }; }
    if(CR.vue === 'photos') crRender();
    return;
  }
  if(CR.src === 'media' && !CR.media){
    try { const { data } = await sb.from('mk_media').select('id,path,created_at').order('created_at', { ascending: false }).limit(60); CR.media = data || []; }
    catch(e){ CR.media = []; }
    if(CR.vue === 'photos') crRender();
    return;
  }
  if(typeof mkHydrate === 'function') mkHydrate(crBody());
}
async function crOuvrirGalerie(code){
  const g = (Array.isArray(CR.galList) ? CR.galList : []).find(x => x.code === code); if(!g) return;
  CR.gal = g; CR.galPhotos = []; crRender();
  try {
    const r = await galApi('/api/admin/galeries/' + encodeURIComponent(code) + '/photos');
    const dossier = r.dossier || g.dossier;
    CR.galPhotos = (r.photos || []).map(f => ({ k: 'g:' + dossier + '/' + f, src: 'galerie', dossier, f, thumb: galPhotoUrl(dossier, f, 'thumb'), url: galPhotoUrl(dossier, f, 'medium') }));
  } catch(e){ agAlert(e.message || String(e)); }
  if(CR.vue === 'photos') crRender();
}
function crBasculer(p){
  const M = crModele();
  const i = CR.photos.findIndex(x => x.k === p.k);
  if(i >= 0){ CR.photos.splice(i, 1); CR.crop.splice(i, 1); }
  else {
    if(CR.photos.length >= M.max){ if(M.max === 1){ CR.photos = []; CR.crop = []; } else { agToast(`${M.max} photos au plus pour ce modèle`, 'info'); return; } }
    CR.photos.push(p); CR.crop.push({ x: 0, y: 0, z: 1 });
  }
  crRender();
}
function crRetirer(i){ CR.photos.splice(i, 1); CR.crop.splice(i, 1); if(CR.sel >= CR.photos.length) CR.sel = 0; crRender(); }
function crFichiers(files){
  const M = crModele();
  [...(files || [])].forEach(f => {
    if(!/^image\//.test(f.type)) return;
    if(CR.photos.length >= M.max){ if(M.max === 1){ CR.photos = []; CR.crop = []; } else return; }
    const url = URL.createObjectURL(f);
    CR.photos.push({ k: 'f:' + f.name + f.size + Math.random(), src: 'fichier', file: f, url, thumb: url });
    CR.crop.push({ x: 0, y: 0, z: 1 });
  });
  const inp = document.getElementById('crFile'); if(inp) inp.value = '';
  crRender();
}

// ---------- Chargement des images (dans le canvas : jamais d'image "étrangère") ----------
const CR_IMG = {};
async function crImage(p){
  if(!p) return null;
  if(CR_IMG[p.k]) return CR_IMG[p.k];
  let blob;
  if(p.file) blob = p.file;
  else {
    let url = p.url;
    if(p.path){ url = (await mkSign([p.path]))[0]; }
    else if(p.src === 'galerie') url = galPhotoUrl(p.dossier, p.f, 'medium');
    blob = await mkUrlBlob(url);
  }
  const u = URL.createObjectURL(blob);
  const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error('Image illisible')); i.src = u; });
  CR_IMG[p.k] = img;
  return img;
}

// Pour l'image finale en grande taille : la photo d'origine (pas la version réduite)
const CR_IMG_HD = {};
async function crImageHD(p){
  if(!p) return null;
  if(p.file || p.src === 'url') return crImage(p);
  if(CR_IMG_HD[p.k]) return CR_IMG_HD[p.k];
  let img = null;
  if(p.src === 'galerie' && typeof galApiBase === 'function'){
    try {
      const pwd = (typeof galPwd !== 'undefined' && galPwd) || (typeof getGaleriePwd === 'function' ? await getGaleriePwd() : '');
      const r = await fetch(`${galApiBase()}/api/admin/original/${encodeURIComponent(p.dossier)}/${encodeURIComponent(p.f)}`, { headers: { 'x-admin-password': pwd } });
      if(r.ok){ const b = await r.blob(); const u = URL.createObjectURL(b);
        img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error('Image illisible')); i.src = u; }); }
    } catch(e){ console.warn('original', e); }
  }
  if(!img) img = await crImage(p);
  CR_IMG_HD[p.k] = img;
  return img;
}
// Taille finale choisie (en pixels)
function crTailleFinale(){
  const e = CR.exp, d0 = crDims(CR.fmt, 1), long0 = Math.max(d0.w0, d0.h0);
  let long = 2048, note = '';
  const Q = CR_QUAL.find(q => q[0] === e.q) || CR_QUAL[1];
  if(e.q === 'print'){
    const pa = CR_PAPIERS.find(x => x[0] === e.papier) || CR_PAPIERS[5];
    long = Math.round(pa[2] / 2.54 * 300);
    const r = CR_FMT[CR.fmt].r, rp = pa[1] / pa[2], rr = r >= 1 ? 1 / r : r;
    if(Math.abs(rr - rp) > 0.03) note = `Le format ${CR_FMT[CR.fmt].nom} n'a pas les proportions d'un ${pa[0]} : choisis le format conseillé pour éviter les bords coupés au tirage.`;
  } else if(e.q === 'perso') long = Math.max(400, Math.min(8000, Math.round(Number(e.perso) || 2048)));
  else long = Q[2];
  let k = long / long0;
  let d = crDims(CR.fmt, k);
  // Tirage : dimensions exactes du papier quand le format a ses proportions
  if(e.q === 'print' && !note){
    const pa = CR_PAPIERS.find(x => x[0] === e.papier) || CR_PAPIERS[5];
    const court = Math.round(pa[1] / 2.54 * 300), lg = Math.round(pa[2] / 2.54 * 300);
    d = CR_FMT[CR.fmt].r >= 1 ? { w: lg, h: court } : { w: court, h: lg };
  }
  if(d.w * d.h > CR_MAX_PIX){ k = Math.sqrt(CR_MAX_PIX / (d0.w0 * d0.h0)); d = crDims(CR.fmt, k); note = (note ? note + ' ' : '') + `Taille limitée à ${d.w} x ${d.h} px pour que ton téléphone puisse la créer.`; }
  return { k, w: d.w, h: d.h, exact: e.q === 'print' && !note, note, mo: Math.max(0.1, d.w * d.h * (e.type === 'png' ? 2.2 : 0.38) / 1e6) };
}
function crQualHtml(){
  const e = CR.exp, T = crTailleFinale();
  const pa = CR_PAPIERS.find(x => x[0] === e.papier) || CR_PAPIERS[5];
  return `<div class="cr-qual">${CR_QUAL.map(([k, nom, px, d]) => `<button type="button" class="${e.q === k ? 'on' : ''}" onclick="crSetExp('q','${k}')"><b>${nom}</b><small>${px ? px + ' px · ' : ''}${d}</small></button>`).join('')}</div>
    ${e.q === 'print' ? `<label>Taille du tirage (300 points par pouce)</label><div class="ag-pills">${CR_PAPIERS.map(x => `<button type="button" class="${e.papier === x[0] ? 'on' : ''}" onclick="crPapier('${x[0]}')">${x[0]} cm</button>`).join('')}</div>
      <div class="ag-hint" style="margin-top:4px">Format conseillé pour un ${pa[0]} : ${pa[3] === 'photo' ? '2:3 ou 3:2 (photo)' : pa[3] === 'post' ? '4:5' : 'A4 / A3'}.</div>` : ''}
    ${e.q === 'perso' ? `<label>Côté le plus long (pixels)</label><input type="number" inputmode="numeric" min="400" max="8000" step="100" value="${crE(e.perso)}" oninput="crSetExp('perso',this.value,1)">` : ''}
    <label>Type de fichier</label><div class="ag-pills"><button type="button" class="${e.type !== 'png' ? 'on' : ''}" onclick="crSetExp('type','jpeg')">JPEG (conseillé)</button><button type="button" class="${e.type === 'png' ? 'on' : ''}" onclick="crSetExp('type','png')">PNG (sans perte, très lourd)</button></div>
    <div class="cr-taille" id="crTaille"><b>${T.w} x ${T.h} px</b> · ${e.type === 'png' ? 'PNG' : 'JPEG'} · environ ${T.mo < 1 ? T.mo.toFixed(1) : Math.round(T.mo)} Mo${e.q === 'print' ? ` · ${pa[0]} cm à 300 points par pouce` : ''}</div>
    ${T.note ? `<div class="ag-hint warn">${crE(T.note)}</div>` : ''}`;
}
function crSetExp(k, v, silencieux){
  CR.exp[k] = v;
  try { localStorage.setItem('crExp', JSON.stringify(CR.exp)); } catch(e){}
  if(silencieux){ const T = crTailleFinale(), el = document.getElementById('crTaille'); if(el) el.innerHTML = `<b>${T.w} x ${T.h} px</b> · ${CR.exp.type === 'png' ? 'PNG' : 'JPEG'} · environ ${T.mo < 1 ? T.mo.toFixed(1) : Math.round(T.mo)} Mo`; return; }
  crRender();
}
// Choisir un papier change aussi le format (mêmes proportions, même sens)
function crPapier(nom){
  const pa = CR_PAPIERS.find(x => x[0] === nom); if(!pa) return;
  CR.exp.papier = nom;
  const paysage = CR_FMT[CR.fmt].r > 1;
  const voulu = pa[3] === 'photo' ? (paysage ? 'photo32' : 'photo23') : pa[3] === 'post' ? 'post' : (paysage ? 'a4p' : 'a4');
  const M = crModele();
  if(M.fmts.includes(voulu)) CR.fmt = voulu;
  crSetExp('papier', nom);
}

// ============================================================
// 3. L'EDITEUR
// ============================================================
function crVueEdit(){
  const M = crModele(), c = CR.cfg;
  const F = crDims(CR.fmt, 1);
  const pills = (key, list, val) => `<div class="ag-pills">${list.map(([k, l]) => `<button type="button" class="${(val != null ? val : c[key]) === k ? 'on' : ''}" onclick="crSet('${key}','${k}')">${l}</button>`).join('')}</div>`;
  const champ = (key, label, ph, area) => area
    ? `<div><label>${label}</label><textarea rows="2" oninput="crSetTxt('${key}',this.value)" placeholder="${crE(ph || '')}">${crE(c[key] || '')}</textarea></div>`
    : `<div><label>${label}</label><input value="${crE(c[key] || '')}" oninput="crSetTxt('${key}',this.value)" placeholder="${crE(ph || '')}"></div>`;
  const P = typeof ST_POLICES !== 'undefined' ? ST_POLICES : {};
  const nbSlides = M.k === 'carrousel' ? CR.photos.length + 1 : 1;
  const textes = {
    affiche: champ('eyebrow', 'Petit texte au-dessus', 'Ex : OFFRE SPÉCIALE') + champ('titre', 'Titre', 'Ex : Fête des mères') + champ('sous', 'Phrase', 'Ex : Offrez-lui un portrait inoubliable') + `<div class="cr-2">${champ('offre', 'Offre', 'Ex : Séance + 5 photos')}${champ('prix', 'Prix', 'Ex : 25 000 F')}</div>` + champ('appel', 'Bouton', 'Ex : Réserve ta séance') + champ('contact', 'Contact', 'Ex : WhatsApp 07 00 00 00 00'),
    epure: champ('eyebrow', 'Petit texte au-dessus', 'Ex : NOUVEAU') + champ('titre', 'Titre', 'Ex : Séance famille') + champ('sous', 'Phrase', '') + `<div class="cr-2">${champ('prix', 'Prix', 'Ex : 30 000 F')}${champ('appel', 'Appel', 'Réserve ta séance')}</div>` + champ('contact', 'Contact', ''),
    story: champ('titre', 'Titre', 'Ex : Places libres samedi') + champ('sous', 'Phrase', '') + champ('appel', 'Bouton', 'Ex : Écris-moi') + champ('contact', 'Contact', ''),
    mosaique: champ('titre', 'Titre (facultatif)', 'Ex : Destinée - 25 ans') + champ('sous', 'Phrase (facultative)', ''),
    cadre: champ('titre', 'Légende', 'Ex : Destinée, 25 ans') + champ('sous', 'Petite ligne', 'Ex : Studio, Bouaké'),
    citation: champ('citation', 'Citation', 'Ex : Chaque sourire raconte une histoire', true) + champ('auteur', 'Signature', 'Ex : Henzo Photographie'),
    avantapres: `<div class="cr-2">${champ('avant', 'Mot 1', 'Avant')}${champ('apres', 'Mot 2', 'Après')}</div>` + champ('titre', 'Titre (facultatif)', 'Ex : La magie de la retouche'),
    carrousel: champ('titre', 'Titre (1re image)', 'Ex : Le mariage de Awa et Yao') + champ('sous', 'Phrase (1re image)', '') + champ('appel', 'Dernière image : appel', 'Réserve ta séance') + champ('contact', 'Contact', ''),
    editorial: champ('mot', 'Grand texte (une ligne par retour)', 'Ex : EXPLOSE\nTOUT', true) + champ('credits', 'Crédits en bas (une ligne par personne)', 'Ex : PHOTO : Henzo Photographie\nMAQUILLAGE : Awa Makeup', true) + champ('partenaire', 'Partenaire à côté du logo (facultatif)', 'Ex : MAISON NAYA'),
    magazine: champ('mot', 'Nom du magazine (en haut)', 'Ex : HENZO') + champ('titre', 'Gros titre', 'Ex : Destinée, 25 ans') + champ('sous', 'Petites lignes (une par retour)', 'Ex : Séance studio\nLumière douce', true) + champ('eyebrow', 'Numéro / date', 'Ex : N°12 · Octobre 2026'),
    phototexte: champ('mot', 'Le mot (une ligne par retour)', 'Ex : LOVE') + champ('titre', 'Petit texte dessous', 'Ex : Awa & Yao · 12.10.2026') + champ('contact', 'Contact (facultatif)', ''),
    triptyque: champ('titre', 'Titre', 'Ex : Trois regards') + champ('sous', 'Petite phrase', ''),
    bandeau: champ('eyebrow', 'Petit texte', 'Ex : NOUVEAU') + champ('titre', 'Titre', 'Ex : Séance grossesse') + champ('sous', 'Phrase', '') + champ('appel', 'Appel', 'Réserve ta séance') + champ('contact', 'Contact', ''),
    minigalerie: champ('eyebrow', 'Petit texte au-dessus', 'Ex : SÉANCE FAMILLE') + champ('titre', 'Titre', 'Ex : Les Kouassi') + champ('sous', 'Petite phrase', 'Ex : Studio, Bouaké · octobre'),
    storyboard: champ('titre', 'Titre', 'Ex : Une journée avec Destinée') + [0, 1, 2].map(i => `<label>Moment ${i + 1}</label><input value="${crE((c.legendes || [])[i] || '')}" oninput="crSetLeg(${i},this.value)" placeholder="${['Les préparatifs', 'Le moment fort', 'Le souvenir'][i]}">`).join('')
  }[M.k] || '';
  return `<button class="ag-back" onclick="CR.vue='accueil';crRender()">${agIcon('chev', 16)} Créations</button>
    <div class="cr-edit">
      <div class="cr-prev-zone">
        <div class="cr-prev" style="aspect-ratio:${F.w}/${F.h}"><canvas id="crCanvas" width="${F.w}" height="${F.h}"></canvas></div>
        <div class="cr-fmtnom">${crE(CR_FMT[CR.fmt].nom)} · ${crE(CR_FMT[CR.fmt].usage)}</div>
        ${nbSlides > 1 ? `<div class="cr-slides">${Array.from({ length: nbSlides }, (_, i) => `<button class="${CR.slide === i ? 'on' : ''}" onclick="CR.slide=${i};crDessinerApercu();crMajSlides()">${i + 1}</button>`).join('')}</div>` : ''}
        ${CR.photos.length > 1 && M.k !== 'carrousel' ? `<div class="cr-phsel"><small>Photo à déplacer :</small>${CR.photos.map((p, i) => `<button class="${CR.sel === i ? 'on' : ''}" onclick="crSel(${i})">${i + 1}</button>`).join('')}</div>` : ''}
        <div class="cr-zoom"><small>Glisse sur l'image pour déplacer la photo</small><input type="range" min="1" max="2.5" step="0.05" value="${(CR.crop[CR.sel] || {}).z || 1}" oninput="crZoom(this.value)" aria-label="Zoom"></div>
      </div>
      <div class="cr-panneau">
        <details class="cr-bloc" open><summary>Qualité de l'image</summary>${crQualHtml()}</details>
        <div class="cr-actions">
          <button class="btn-primary" ${CR.busy ? 'disabled' : ''} onclick="crExporter('partager')">${agIcon('share', 16)} ${CR.busy === 'export' ? 'Préparation...' : 'Partager'}</button>
          <button class="btn-secondary" ${CR.busy ? 'disabled' : ''} onclick="crExporter('telecharger')">${agIcon('download', 16)} Télécharger</button>
        </div>
        <div class="cr-actions">
          <button class="btn-ghost" onclick="crGarderStyle()">${agIcon('star', 15)} Garder ce style</button>
          <button class="btn-ghost" onclick="crExporter('plan')">${agIcon('calendar', 15)} Ajouter au plan</button>
        </div>
        <details class="cr-bloc" open><summary>Textes</summary>
          <button class="btn-secondary cr-ia" ${CR.busy === 'ia' ? 'disabled' : ''} onclick="crIA()">${agIcon('sparkles', 15)} ${CR.busy === 'ia' ? 'L\'IA écrit...' : 'Écrire les textes avec l\'IA'}</button>
          <input id="crOcc" placeholder="Pour quoi ? Ex : promo fête des mères, séance de Destinée..." value="${crE(CR.occasion || '')}" oninput="CR.occasion=this.value">
          ${textes}
        </details>
        <details class="cr-bloc" open><summary>Format et mise en page</summary>
          <label>Format</label><div class="cr-fmts">${M.fmts.map(f => { const r = CR_FMT[f].r, w = r >= 1 ? 26 : Math.round(26 * r), h = r >= 1 ? Math.round(26 / r) : 26; return `<button type="button" class="${CR.fmt === f ? 'on' : ''}" onclick="crSet('fmt','${f}')"><i style="width:${w}px;height:${h}px"></i><b>${crE(CR_FMT[f].nom)}</b><small>${crE(CR_FMT[f].usage)}</small></button>`; }).join('')}</div>
          ${['affiche', 'story', 'carrousel', 'citation'].includes(M.k) ? `<label>Place du texte</label>${pills('pos', CR_POS)}` : ''}
          ${['affiche', 'epure', 'story', 'carrousel', 'mosaique', 'cadre'].includes(M.k) ? `<label>Alignement</label>${pills('align', [['gauche', 'À gauche'], ['centre', 'Centré']])}` : ''}
          ${M.k === 'cadre' ? `<label>Style de cadre</label>${pills('cadre', CR_CADRES)}` : ''}
          ${M.k === 'avantapres' ? `<label>Sens</label>${pills('sens', [['auto', 'Automatique'], ['cote', 'Côte à côte'], ['dessus', 'L\'une sur l\'autre']])}` : ''}
          ${['mosaique', 'storyboard', 'avantapres'].includes(M.k) ? `<label>Espace entre les photos</label><input type="range" min="0" max="60" step="2" value="${c.gap}" oninput="crSetNum('gap',this.value)">` : ''}
          ${['mosaique', 'storyboard', 'affiche', 'story', 'citation', 'carrousel'].includes(M.k) ? `<label>Bordure autour</label><input type="range" min="0" max="80" step="2" value="${c.bord}" oninput="crSetNum('bord',this.value)">` : ''}
          ${['affiche', 'story', 'citation', 'carrousel'].includes(M.k) ? `<label>Voile sombre sur la photo</label><input type="range" min="0" max="0.9" step="0.05" value="${c.voile}" oninput="crSetNum('voile',this.value)">` : ''}
          <label>Taille du titre</label><input type="range" min="0.7" max="1.4" step="0.05" value="${c.taille}" oninput="crSetNum('taille',this.value)">
        </details>
        <details class="cr-bloc" ${M.k === 'editorial' ? 'open' : ''}><summary>Effets créatifs</summary>${crEffetsHtml(M)}</details>
        <details class="cr-bloc"><summary>Police et couleurs</summary>
          <label>Police (sans empattement)</label>
          <div class="ag-pills">${Object.entries(P).map(([k, p]) => `<button type="button" class="${c.police === k ? 'on' : ''}" style="font-family:'${p.titre}',sans-serif" onclick="crSet('police','${k}')">${crE(p.titre)}</button>`).join('')}</div>
          <div class="cr-cols">${[['fond', 'Fond'], ['texte', 'Texte'], ['accent', 'Accent'], ['clair', 'Fond clair'], ['bordCouleur', 'Bordure']].map(([k, l]) => `<label>${l}<input type="color" value="${crE(c[k])}" oninput="crSetCol('${k}',this.value)"></label>`).join('')}</div>
          <button class="st-link" onclick="crCouleursMarque()">Remettre les couleurs de ma marque</button>
          <label class="ag-check"><input type="checkbox" ${c.logo ? 'checked' : ''} onchange="crSet('logo',this.checked)"> Mon logo</label>
          <label class="ag-check"><input type="checkbox" ${c.copyright ? 'checked' : ''} onchange="crSet('copyright',this.checked)"> Copyright discret en bas</label>
        </details>
        <button class="btn-ghost" style="width:100%;margin-top:8px;display:flex;align-items:center;justify-content:center;gap:6px" onclick="CR.vue='photos';crRender()">${agIcon('image', 15)} Changer les photos</button>
      </div>
    </div>`;
}
// Bloc "Effets créatifs" : filtre, grain, vignette, lumière, bords flous, mot géant, mes effets
function crEffetsHtml(M){
  const c = CR.cfg, e = c.effets || (c.effets = crCfgDefaut().effets);
  const curseur = (cle, label, min, max, pas, val, fn) => `<label>${label}</label><input type="range" min="${min}" max="${max}" step="${pas}" value="${val}" oninput="${fn || 'crSetFx'}('${cle}',this.value)">`;
  const unePhoto = M.min === 1 && M.max === 1;
  return `<label>Filtre</label><div class="ag-pills">${Object.entries(CR_FILTRES).map(([k, v]) => `<button type="button" class="${(e.filtre || 'aucun') === k ? 'on' : ''}" onclick="crSetFx('filtre','${k}',1)">${v[0]}</button>`).join('')}</div>
    ${curseur('grain', 'Grain de film', 0, 1, 0.05, e.grain || 0)}
    ${curseur('vignette', 'Bords sombres', 0, 1, 0.05, e.vignette || 0)}
    ${curseur('lumiere', 'Lumière colorée', 0, 1, 0.05, e.lumiere || 0)}
    ${curseur('poussiere', 'Poussières de film', 0, 1, 0.05, e.poussiere || 0)}
    ${curseur('brulure', 'Bords brûlés (pellicule)', 0, 1, 0.05, e.brulure || 0)}
    ${M.k === 'editorial' ? curseur('flouBords', 'Bords flous (centre net)', 0, 1, 0.05, c.flouBords || 0, 'crSetNum') : ''}
    <div class="cr-sep">Grand texte créatif</div>
    ${M.k !== 'editorial' ? `<textarea rows="2" placeholder="Ex : PHOTOGRAPHIE (facultatif)" oninput="crSetTxt('mot',this.value)">${crE(c.mot || '')}</textarea>` : '<div class="ag-hint" style="margin:0">Le texte se tape dans « Textes ».</div>'}
    <label>Style d'écriture</label><div class="ag-pills">${Object.entries(CR_POLICES_CREA).map(([k, v]) => `<button type="button" class="${(c.motPolice || 'pinceau') === k ? 'on' : ''}" ${v.f ? `style="font-family:'${v.f}',sans-serif"` : ''} onclick="crSet('motPolice','${k}')">${v.nom}</button>`).join('')}</div>
    <div class="cr-cols" style="grid-template-columns:repeat(2,1fr)"><label>Couleur du texte<input type="color" value="${crE(c.motCouleur || c.accent)}" oninput="crSetCol('motCouleur',this.value)"></label>
      <label>Place<select onchange="crSet('motPos',this.value)">${[['centre', 'Au centre'], ['haut', 'En haut'], ['bas', 'En bas']].map(([k, l]) => `<option value="${k}" ${c.motPos === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
    ${curseur('motOpacite', 'Transparence du texte', 0.2, 1, 0.05, c.motOpacite == null ? 0.85 : c.motOpacite, 'crSetNum')}
    ${curseur('motFlou', 'Texte un peu flou', 0, 4, 0.25, c.motFlou || 0, 'crSetNum')}
    ${curseur('motTaille', 'Taille du texte', 0.4, 1.2, 0.05, c.motTaille || 1, 'crSetNum')}
    <div class="cr-sep">Mes effets (images ajoutées)</div>
    <div class="ag-hint" style="margin:0 0 8px">Ajoute des textures, poussières, lumières, cadres (PNG ou JPG) : par exemple des « overlays » trouvés sur internet. Ils restent dans ta liste.</div>
    <div class="cr-effets">${(CR.effets || []).map(x => `<button type="button" class="${e.perso && e.perso.path === x.media_path ? 'on' : ''}" onclick="crChoisirEffet(${x.id})"><img data-mkp="${crE(x.media_path)}" src="" alt=""><small>${crE(x.nom || 'Effet')}</small></button>`).join('')}
      <button type="button" class="cr-eff-plus" onclick="document.getElementById('crFxFile').click()">+<small>Ajouter</small></button></div>
    <input type="file" id="crFxFile" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="crAjouterEffet(this.files)">
    ${e.perso ? `<label>Mélange</label><div class="ag-pills">${[['screen', 'Éclaircir (lumières)'], ['overlay', 'Superposer (textures)'], ['multiply', 'Assombrir (poussière)'], ['source-over', 'Normal (cadres PNG)']].map(([k, l]) => `<button type="button" class="${e.persoBlend === k ? 'on' : ''}" onclick="crSetFx('persoBlend','${k}',1)">${l}</button>`).join('')}</div>
      ${curseur('persoOpac', 'Force de l\'effet', 0.1, 1, 0.05, e.persoOpac == null ? 0.6 : e.persoOpac)}
      <button class="st-link" onclick="CR.cfg.effets.perso=null;crRender()">Retirer l'effet</button>` : ''}`;
}
function crSetFx(k, v, rendu){ const e = CR.cfg.effets || (CR.cfg.effets = {}); e[k] = isNaN(Number(v)) || k === 'filtre' || k === 'persoBlend' ? v : Number(v); if(rendu) crRender(); else crDessinerApercuVite(); }
function crChoisirEffet(id){ const x = (CR.effets || []).find(y => y.id === id); if(!x) return; CR.cfg.effets.perso = { id: x.id, path: x.media_path }; crRender(); }
async function crAjouterEffet(files){
  const f = files && files[0]; if(!f) return;
  try {
    const uid = typeof mkUid === 'function' ? await mkUid() : null; if(!uid) throw new Error('Pas connecté');
    const ext = (f.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
    const path = `${uid}/effet-${Date.now()}.${ext}`;
    const { error } = await sb.storage.from('marketing').upload(path, f, { contentType: f.type, upsert: false });
    if(error) throw new Error(error.message);
    const nom = (f.name || 'Effet').replace(/\.[^.]+$/, '').slice(0, 30);
    const { data, error: e2 } = await sb.from('creations').insert({ kind: 'effet', nom, media_path: path }).select().single();
    if(e2) throw e2;
    CR.effets = [data].concat(CR.effets || []);
    CR.cfg.effets.perso = { id: data.id, path }; CR.cfg.effets.persoBlend = f.type === 'image/png' ? 'source-over' : 'screen';
    agToast('Effet ajouté à ta liste');
  } catch(e){ agAlert('Effet non ajouté : ' + (e.message || e)); }
  const inp = document.getElementById('crFxFile'); if(inp) inp.value = '';
  crRender();
}
function crMajSlides(){ document.querySelectorAll('.cr-slides button').forEach((b, i) => b.classList.toggle('on', i === CR.slide)); }
function crSet(k, v){
  if(k === 'fmt'){ CR.fmt = v; crRender(); return; }
  CR.cfg[k] = v;
  if(['pos', 'align', 'cadre', 'sens', 'police', 'motPolice', 'motPos'].includes(k)) crRender(); else crDessinerApercu();
}
function crSetTxt(k, v){ CR.cfg[k] = v; crDessinerApercuVite(); }
function crSetLeg(i, v){ CR.cfg.legendes = (CR.cfg.legendes || ['', '', '']).slice(); CR.cfg.legendes[i] = v; crDessinerApercuVite(); }
function crSetNum(k, v){ CR.cfg[k] = Number(v); crDessinerApercuVite(); }
function crSetCol(k, v){ CR.cfg[k] = v; crDessinerApercuVite(); }
function crCouleursMarque(){ const c = crCouleurs(); Object.assign(CR.cfg, { fond: c.fond, texte: c.texte, accent: c.accent }); crRender(); }
function crSel(i){ CR.sel = i; document.querySelectorAll('.cr-phsel button').forEach((b, j) => b.classList.toggle('on', j === i)); const z = document.querySelector('.cr-zoom input'); if(z) z.value = (CR.crop[i] || {}).z || 1; }
function crZoom(v){ const c = CR.crop[CR.sel]; if(!c) return; c.z = Number(v); crDessinerApercuVite(); }
let crRaf = 0;
function crDessinerApercuVite(){ if(document.getElementById('anCanvas') && typeof anApercuUneFois === 'function'){ anApercuUneFois(); return; } if(crRaf) return; crRaf = requestAnimationFrame(() => { crRaf = 0; crDessinerApercu(); }); }
async function crDessinerApercu(){
  if(document.getElementById('anCanvas') && typeof anApercuUneFois === 'function'){ anApercuUneFois(); return; }
  const cv = document.getElementById('crCanvas'); if(!cv) return;
  try { await crDessiner(cv, CR.slide); } catch(e){ console.warn('dessin', e); }
}
// Glisser sur l'aperçu = déplacer la photo touchée
function crBrancherApercu(){
  const cv = document.getElementById('crCanvas'); if(!cv) return;
  let dep = null;
  const pt = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; };
  cv.addEventListener('pointerdown', e => {
    const p = pt(e);
    const rect = (CR.rects || []).find(r => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
    if(!rect) return;
    if(rect.i !== CR.sel) crSel(rect.i);
    dep = { p, c: { ...(CR.crop[rect.i] || { x: 0, y: 0, z: 1 }) }, r: rect };
    cv.setPointerCapture(e.pointerId); e.preventDefault();
  });
  cv.addEventListener('pointermove', e => {
    if(!dep) return;
    const p = pt(e), r = dep.r, c = CR.crop[r.i]; if(!c) return;
    const lx = r.libreX || 1, ly = r.libreY || 1;
    c.x = Math.max(-1, Math.min(1, dep.c.x - (p.x - dep.p.x) / lx));
    c.y = Math.max(-1, Math.min(1, dep.c.y - (p.y - dep.p.y) / ly));
    crDessinerApercuVite();
  });
  const fin = () => { dep = null; };
  cv.addEventListener('pointerup', fin); cv.addEventListener('pointercancel', fin);
  cv.style.touchAction = 'none';
}

// ============================================================
// LE DESSIN (pour l'aperçu et pour l'image finale)
// ============================================================
function crRond(g, x, y, w, h, r){
  r = Math.min(r, w / 2, h / 2);
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
// Photo qui remplit un cadre (comme "cover"), avec déplacement (x, y de -1 à 1) et zoom
function crPhoto(g, img, i, x, y, w, h, rayon){
  CR.rects = CR.rects || [];
  if(!img){ g.fillStyle = 'rgba(128,128,128,.25)'; g.fillRect(x, y, w, h); return; }
  const c = CR.crop[i] || (CR.crop[i] = { x: 0, y: 0, z: 1 });
  const s = Math.max(w / img.width, h / img.height) * (c.z || 1);
  const dw = img.width * s, dh = img.height * s;
  const libreX = Math.max(0, (dw - w) / 2), libreY = Math.max(0, (dh - h) / 2);
  const dx = x + (w - dw) / 2 - c.x * libreX, dy = y + (h - dh) / 2 - c.y * libreY;
  if(s > 1.3 && CR.flous && !CR.flous.includes(i + 1)) CR.flous.push(i + 1);
  g.save();
  if(rayon){ crRond(g, x, y, w, h, rayon); g.clip(); } else { g.beginPath(); g.rect(x, y, w, h); g.clip(); }
  const fil = crFiltre(CR.cfg); if(fil) g.filter = fil;
  g.drawImage(img, dx, dy, dw, dh);
  g.restore();
  CR.rects.push({ i, x, y, w, h, libreX: libreX || 1, libreY: libreY || 1 });
}
function crPolices(){ const p = crPolice(); return { t: p.titre, tw: p.tw || 700, x: p.texte, xw: p.xw || 500 }; }
function crFont(fam, poids, px){ return `${poids} ${Math.round(px)}px "${fam}", "Inter", sans-serif`; }
function crLignes(g, txt, maxW){
  const out = [];
  String(txt || '').split('\n').forEach(par => {
    const mots = par.split(/\s+/).filter(Boolean); let l = '';
    mots.forEach(m => { const t = l ? l + ' ' + m : m; if(g.measureText(t).width > maxW && l){ out.push(l); l = m; } else l = t; });
    if(l) out.push(l);
  });
  return out;
}
// Écrit un bloc de texte ; renvoie sa hauteur. align : 'gauche' | 'centre'
function crTexte(g, txt, o){
  if(!txt) return 0;
  g.font = crFont(o.fam, o.poids, o.px);
  if(o.espace) g.letterSpacing = o.espace + 'px';
  let lignes = crLignes(g, o.maj ? String(txt).toUpperCase() : txt, o.maxW);
  if(o.maxL && lignes.length > o.maxL){ lignes = lignes.slice(0, o.maxL); lignes[lignes.length - 1] += '...'; }
  const lh = o.px * (o.lh || 1.15);
  if(o.mesure){ if(o.espace) g.letterSpacing = '0px'; return lignes.length * lh; }
  g.fillStyle = o.couleur; g.textBaseline = 'alphabetic'; g.textAlign = o.align === 'centre' ? 'center' : 'left';
  if(o.ombre){ g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = o.px * 0.25; }
  const x = o.align === 'centre' ? o.x + o.maxW / 2 : o.x;
  lignes.forEach((l, k) => g.fillText(l, x, o.y + o.px + k * lh));
  g.shadowBlur = 0; g.shadowColor = 'transparent';
  if(o.espace) g.letterSpacing = '0px';
  return lignes.length * lh;
}
function crPilule(g, txt, o){
  if(!txt) return { w: 0, h: 0 };
  g.font = crFont(o.fam, o.poids, o.px);
  const w = g.measureText(txt).width + o.px * 1.8, h = o.px * 2.1;
  const x = o.align === 'centre' ? o.x + (o.maxW - w) / 2 : o.x;
  g.fillStyle = o.fond; crRond(g, x, o.y, w, h, h / 2); g.fill();
  g.fillStyle = o.couleur; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(txt, x + w / 2, o.y + h / 2 + o.px * 0.04); g.textBaseline = 'alphabetic';
  return { w, h };
}
function crLisible(hex){ const h = String(hex || '').replace('#', ''); if(h.length < 6) return '#fff'; const [r, gg, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); return (r * 299 + gg * 587 + b * 114) / 1000 > 150 ? '#111111' : '#ffffff'; }
function crVoile(g, x, y, w, h, pos, force){
  if(!force) return;
  if(pos === 'centre'){ g.fillStyle = `rgba(0,0,0,${force * 0.75})`; g.fillRect(x, y, w, h); return; }
  const grad = pos === 'haut' ? g.createLinearGradient(0, y, 0, y + h * 0.7) : g.createLinearGradient(0, y + h, 0, y + h * 0.3);
  grad.addColorStop(0, `rgba(0,0,0,${Math.min(0.95, force + 0.15)})`); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(x, y, w, h);
}
let CR_LOGO = null;
async function crLogo(){ if(CR_LOGO !== null) return CR_LOGO; try { CR_LOGO = typeof stLogoImg === 'function' ? await stLogoImg() : null; } catch(e){ CR_LOGO = null; } return CR_LOGO; }
function crNom(){ return typeof stNom === 'function' ? stNom() : 'Henzo Photographie'; }
function crSignature(g, W, H, c, P, s, clair, logo, pos){
  // Logo (ou le nom de la marque) + copyright discret
  const coul = clair ? c.encre : '#ffffff';
  if(c.logo){
    const lx = 60 * s, ly = pos === 'bas-gauche' ? H - 150 * s : 60 * s;
    if(logo){ const lh = 90 * s, lw = logo.width * lh / logo.height; g.globalAlpha = 0.95; g.drawImage(logo, lx, ly, lw, lh); g.globalAlpha = 1; }
    else crTexte(g, crNom(), { fam: P.t, poids: 700, px: 30 * s, couleur: coul, x: lx, y: ly, maxW: W, espace: 2 * s, maj: true });
  }
  if(c.copyright){
    g.font = crFont(P.x, 400, 20 * s); g.fillStyle = clair ? 'rgba(0,0,0,.5)' : 'rgba(255,255,255,.7)'; g.textAlign = 'right';
    g.fillText('© ' + crNom(), W - 40 * s, H - 34 * s); g.textAlign = 'left';
  }
}

async function crDessiner(cv, slide, k){
  // k : échelle (nombre), ou {k, w, h} pour des dimensions exactes (tirage)
  const exact = k && typeof k === 'object' ? k : null;
  k = exact ? exact.k : (k || 1);
  const M = crModele(), c = CR.cfg, F = exact ? { w: exact.w, h: exact.h } : crDims(CR.fmt, k);
  if(cv.width !== F.w || cv.height !== F.h){ cv.width = F.w; cv.height = F.h; }
  // s = échelle : 1 pour l'aperçu (1080 px sur le petit côté), plus grand pour l'image finale
  const W = F.w, H = F.h, s = Math.min(W, H) / 1080, P = crPolices();
  if(typeof stFontsReady === 'function'){ try { await stFontsReady(crPolice()); } catch(e){} }
  const hd = k > 1.05;
  const imgs = await Promise.all(CR.photos.map(p => (hd ? crImageHD(p) : crImage(p)).catch(() => null)));
  CR.flous = [];
  const logo = c.logo ? await crLogo() : null;
  const g = cv.getContext('2d');
  CR.rects = [];
  g.clearRect(0, 0, W, H);
  const B = (c.bord || 0) * s;
  const mx = 72 * s, maxW = W - 2 * mx;
  const T = c.taille || 1;
  const texte = (txt, o) => crTexte(g, txt, Object.assign({ fam: P.x, poids: 400, couleur: c.texte, x: mx, maxW, align: c.align }, o));

  // Fond (couleur de bordure si bordure)
  g.fillStyle = B ? c.bordCouleur : '#000'; g.fillRect(0, 0, W, H);

  if(M.k === 'affiche' || M.k === 'story' || (M.k === 'carrousel' && (slide === 0 || slide === CR.photos.length))){
    const i = M.k === 'carrousel' ? (slide === 0 ? 0 : CR.photos.length - 1) : 0;
    crPhoto(g, imgs[i], i, B, B, W - 2 * B, H - 2 * B, B ? 18 * s : 0);
    const pos = M.k === 'story' ? 'haut' : c.pos;
    crVoile(g, B, B, W - 2 * B, H - 2 * B, M.k === 'story' ? 'bas' : pos, c.voile);
    if(M.k === 'story') crVoile(g, B, B, W - 2 * B, H - 2 * B, 'haut', c.voile * 0.8);
    const fin = M.k === 'carrousel' && slide === CR.photos.length && slide > 0;
    // Hauteur du bloc de texte, pour le placer
    const blocs = [];
    if(!fin && c.eyebrow && M.k === 'affiche') blocs.push(['eyebrow', { fam: P.x, poids: 600, px: 30 * s, couleur: c.accent, maj: true, espace: 5 * s, maxL: 1 }]);
    if(!fin && c.titre) blocs.push(['titre', { fam: P.t, poids: P.tw, px: (M.k === 'story' ? 96 : 104) * s * T, maxL: 3, lh: 1.05, ombre: true }]);
    if(!fin && c.sous) blocs.push(['sous', { fam: P.x, poids: 400, px: 38 * s, maxL: 3, lh: 1.3, ombre: true }]);
    const mesurer = () => blocs.reduce((a, [k, o]) => a + texte(c[k], Object.assign({}, o, { mesure: true })) + 22 * s, 0);
    let hTxt = mesurer();
    const hBas = (M.k === 'affiche' && (c.offre || c.prix) ? 90 * s : 0) + (c.appel ? 110 * s : 0) + (c.contact ? 56 * s : 0);
    let y;
    if(M.k === 'story'){
      y = 230 * s;
      blocs.forEach(([k, o]) => { y += texte(c[k], Object.assign({}, o, { y })) + 22 * s; });
      let yb = H - B - 120 * s - (c.contact ? 50 * s : 0) - (c.appel ? 96 * s : 0);
      if(c.appel){ crPilule(g, c.appel, { fam: P.t, poids: 700, px: 34 * s, x: mx, maxW, y: yb, fond: '#ffffff', couleur: '#111111', align: 'centre' }); yb += 110 * s; }
      if(c.contact) texte(c.contact, { px: 30 * s, poids: 500, y: yb, align: 'centre', maxL: 1 });
    } else {
      const total = hTxt + hBas;
      y = pos === 'haut' ? B + 150 * s : pos === 'centre' ? (H - total) / 2 : H - B - 90 * s - total;
      blocs.forEach(([k, o]) => { y += texte(c[k], Object.assign({}, o, { y })) + 22 * s; });
      if(fin){
        const tt = c.appel || 'Réserve ta séance';
        y = (H - 260 * s) / 2;
        y += texte(tt, { fam: P.t, poids: P.tw, px: 84 * s * T, align: 'centre', maxL: 3, lh: 1.05, ombre: true, y }) + 40 * s;
        if(c.contact) texte(c.contact, { px: 36 * s, poids: 500, y, align: 'centre', maxL: 2 });
      } else {
        if(M.k === 'affiche' && (c.offre || c.prix)){
          y += 8 * s;
          if(c.prix){
            g.font = crFont(P.t, 800, 36 * s);
            const pw = g.measureText(c.prix).width + 36 * s * 1.8, ph = 36 * s * 2.1;
            let ow = 0;
            if(c.offre){ g.font = crFont(P.x, 500, 32 * s); ow = g.measureText(c.offre).width; }
            const total = pw + (c.offre ? 20 * s + ow : 0);
            const x0 = c.align === 'centre' ? (W - total) / 2 : mx;
            crPilule(g, c.prix, { fam: P.t, poids: 800, px: 36 * s, x: x0, maxW: pw, y, fond: c.accent, couleur: crLisible(c.accent), align: 'gauche' });
            if(c.offre){
              g.font = crFont(P.x, 500, 32 * s); g.fillStyle = c.texte; g.textAlign = 'left'; g.textBaseline = 'middle';
              g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 8 * s;
              g.fillText(c.offre, x0 + pw + 20 * s, y + ph / 2); g.textBaseline = 'alphabetic'; g.shadowBlur = 0; g.shadowColor = 'transparent';
            }
            y += 90 * s;
          } else { texte(c.offre, { px: 34 * s, poids: 500, y, ombre: true }); y += 70 * s; }
        }
        if(c.appel && M.k !== 'carrousel'){ crPilule(g, c.appel, { fam: P.t, poids: 700, px: 32 * s, x: mx, maxW, y, fond: '#ffffff', couleur: '#111111', align: c.align }); y += 100 * s; }
        if(c.contact && M.k !== 'carrousel') texte(c.contact, { px: 28 * s, poids: 500, y, maxL: 1 });
        if(M.k === 'carrousel' && slide === 0 && CR.photos.length > 1){ g.font = crFont(P.x, 600, 26 * s); g.fillStyle = 'rgba(255,255,255,.85)'; g.textAlign = 'right'; g.fillText('Glisse →', W - B - 50 * s, H - B - 90 * s); g.textAlign = 'left'; }
      }
    }
    crSignature(g, W, H, c, P, s, false, logo, 'haut');
  }
  else if(M.k === 'carrousel'){
    // Images du milieu : la photo, un petit numéro et la marque
    const i = slide;
    crPhoto(g, imgs[i], i, B, B, W - 2 * B, H - 2 * B, B ? 18 * s : 0);
    const n = `${slide + 1} / ${CR.photos.length + 1}`;
    crPilule(g, n, { fam: P.x, poids: 600, px: 24 * s, x: W - 200 * s, maxW: 150 * s, y: 50 * s, fond: 'rgba(0,0,0,.45)', couleur: '#fff', align: 'centre' });
    crSignature(g, W, H, c, P, s, false, logo, 'bas-gauche');
  }
  else if(M.k === 'epure'){
    g.fillStyle = c.clair; g.fillRect(0, 0, W, H);
    const m = 64 * s, ph = H * (CR.fmt === 'story' ? 0.62 : CR.fmt === 'carre' ? 0.6 : 0.64);
    crPhoto(g, imgs[0], 0, m, m, W - 2 * m, ph, 6 * s);
    let y = m + ph + 46 * s;
    const encre = c.encre, ok = { couleur: encre };
    if(c.eyebrow){ y += texte(c.eyebrow, Object.assign({ fam: P.x, poids: 600, px: 26 * s, maj: true, espace: 5 * s, maxL: 1, y, couleur: c.accent }, {})) + 10 * s; }
    y += texte(c.titre, Object.assign({ fam: P.t, poids: P.tw, px: 70 * s * T, maxL: 2, lh: 1.05, y }, ok)) + 14 * s;
    if(c.sous) y += texte(c.sous, Object.assign({ px: 30 * s, maxL: 2, lh: 1.3, y, couleur: 'rgba(27,27,27,.7)' })) + 18 * s;
    const ligne = [c.prix, c.appel].filter(Boolean).join('   ·   ');
    if(ligne) { y += texte(ligne, { fam: P.t, poids: 700, px: 30 * s, y, couleur: encre, maxL: 1 }) + 10 * s; }
    if(c.contact) texte(c.contact, { px: 24 * s, poids: 500, y, couleur: 'rgba(27,27,27,.6)', maxL: 1 });
    g.fillStyle = c.accent; g.fillRect(c.align === 'centre' ? W / 2 - 30 * s : m, m + ph + 22 * s, 60 * s, 4 * s);
    if(c.logo){ const lg = logo; if(lg){ const lh = 60 * s, lw = lg.width * lh / lg.height; g.drawImage(lg, W - m - lw, H - m - lh + 20 * s, lw, lh); } }
    if(c.copyright){ g.font = crFont(P.x, 400, 18 * s); g.fillStyle = 'rgba(0,0,0,.45)'; g.textAlign = 'right'; g.fillText('© ' + crNom(), W - m, H - 24 * s); g.textAlign = 'left'; }
  }
  else if(M.k === 'mosaique'){
    const titreH = c.titre || c.sous ? (c.titre ? 150 : 90) * s : 0;
    const zone = { x: B, y: B, w: W - 2 * B, h: H - 2 * B - titreH };
    g.fillStyle = c.bordCouleur; g.fillRect(0, 0, W, H);
    const cases = crGrille(CR.photos.length, zone, (c.gap || 0) * s);
    cases.forEach((r, i) => crPhoto(g, imgs[i], i, r.x, r.y, r.w, r.h, c.gap ? 8 * s : 0));
    if(titreH){
      const coul = crLisible(c.bordCouleur);
      let y = H - B - titreH + 22 * s;
      if(c.titre) y += texte(c.titre, { fam: P.t, poids: P.tw, px: 56 * s * T, maxL: 1, y, couleur: coul }) + 8 * s;
      if(c.sous) texte(c.sous, { px: 28 * s, maxL: 1, y, couleur: coul === '#ffffff' ? 'rgba(255,255,255,.75)' : 'rgba(0,0,0,.6)' });
    }
    if(c.copyright){ g.font = crFont(P.x, 400, 18 * s); g.fillStyle = crLisible(c.bordCouleur) === '#ffffff' ? 'rgba(255,255,255,.6)' : 'rgba(0,0,0,.45)'; g.textAlign = 'right'; g.fillText('© ' + crNom(), W - 30 * s, H - 14 * s); g.textAlign = 'left'; }
  }
  else if(M.k === 'cadre') crCadre(g, imgs, W, H, s, c, P, texte, logo);
  else if(M.k === 'citation'){
    crPhoto(g, imgs[0], 0, B, B, W - 2 * B, H - 2 * B, B ? 18 * s : 0);
    crVoile(g, B, B, W - 2 * B, H - 2 * B, 'centre', c.voile);
    const txt = c.citation || c.titre || '';
    const hq = texte(txt, { fam: P.t, poids: 600, px: 62 * s * T, align: 'centre', mesure: true, lh: 1.25 }) + (c.auteur ? 90 * s : 0);
    let y = c.pos === 'haut' ? 300 * s : c.pos === 'bas' ? H - hq - 200 * s : (H - hq) / 2 + 40 * s;
    g.font = crFont(P.t, 800, 180 * s); g.fillStyle = c.accent; g.textAlign = 'center';
    g.fillText('“', W / 2, y + 40 * s); g.textAlign = 'left';
    y += 60 * s;
    y += texte(txt, { fam: P.t, poids: 600, px: 62 * s * T, align: 'centre', y, lh: 1.25, ombre: true }) + 40 * s;
    if(c.auteur) texte(c.auteur, { px: 28 * s, poids: 500, align: 'centre', y, maj: true, espace: 4 * s, maxL: 1 });
    crSignature(g, W, H, c, P, s, false, logo, 'haut');
  }
  else if(M.k === 'avantapres'){
    const cote = c.sens === 'cote' || (c.sens === 'auto' && W >= H);
    const gap = (c.gap || 0) * s;
    const titreH = c.titre ? 130 * s : 0;
    const zx = B, zy = B + titreH, zw = W - 2 * B, zh = H - 2 * B - titreH;
    g.fillStyle = c.bordCouleur; g.fillRect(0, 0, W, H);
    const a = cote ? { x: zx, y: zy, w: (zw - gap) / 2, h: zh } : { x: zx, y: zy, w: zw, h: (zh - gap) / 2 };
    const b = cote ? { x: zx + a.w + gap, y: zy, w: a.w, h: zh } : { x: zx, y: zy + a.h + gap, w: zw, h: a.h };
    crPhoto(g, imgs[0], 0, a.x, a.y, a.w, a.h, 0); crPhoto(g, imgs[1], 1, b.x, b.y, b.w, b.h, 0);
    if(!gap){ g.fillStyle = '#fff'; if(cote) g.fillRect(b.x - 2 * s, zy, 4 * s, zh); else g.fillRect(zx, b.y - 2 * s, zw, 4 * s); }
    const lab = (t, r) => crPilule(g, t, { fam: P.x, poids: 700, px: 26 * s, x: r.x + 30 * s, maxW: r.w, y: r.y + r.h - 90 * s, fond: 'rgba(0,0,0,.55)', couleur: '#fff', align: 'gauche' });
    lab((c.avant || 'Avant').toUpperCase(), a); lab((c.apres || 'Après').toUpperCase(), b);
    if(titreH) texte(c.titre, { fam: P.t, poids: P.tw, px: 54 * s * T, maxL: 1, y: B + 30 * s, align: 'centre', couleur: crLisible(c.bordCouleur) });
    if(c.copyright){ g.font = crFont(P.x, 400, 18 * s); g.fillStyle = 'rgba(255,255,255,.75)'; g.textAlign = 'right'; g.fillText('© ' + crNom(), W - B - 24 * s, H - B - 20 * s); g.textAlign = 'left'; }
  }
  else if(M.k === 'storyboard'){
    g.fillStyle = c.bordCouleur; g.fillRect(0, 0, W, H);
    const coul = crLisible(c.bordCouleur);
    const haut = c.titre ? 190 * s : 70 * s, gap = Math.max(16 * s, (c.gap || 0) * s), m = Math.max(56 * s, B);
    let y = 70 * s;
    if(c.titre) texte(c.titre, { fam: P.t, poids: P.tw, px: 64 * s * T, maxL: 2, y, align: 'centre', couleur: coul, lh: 1.05 });
    const n = 3, legH = 60 * s;
    const h = (H - haut - 80 * s - (n - 1) * gap - n * legH) / n;
    y = haut + 10 * s;
    for(let i = 0; i < n; i++){
      crPhoto(g, imgs[i], i, m, y, W - 2 * m, h, 10 * s);
      const leg = (c.legendes || [])[i];
      g.font = crFont(P.x, 600, 22 * s); g.fillStyle = c.accent; g.textAlign = 'left';
      g.fillText(String(i + 1).padStart(2, '0'), m, y + h + 40 * s);
      if(leg) crTexte(g, leg, { fam: P.x, poids: 500, px: 28 * s, x: m + 54 * s, maxW: W - 2 * m - 54 * s, y: y + h + 12 * s, couleur: coul, maxL: 1 });
      y += h + legH + gap;
    }
    if(c.copyright){ g.font = crFont(P.x, 400, 18 * s); g.fillStyle = coul === '#ffffff' ? 'rgba(255,255,255,.6)' : 'rgba(0,0,0,.45)'; g.textAlign = 'center'; g.fillText('© ' + crNom(), W / 2, H - 26 * s); g.textAlign = 'left'; }
  }
  else if(M.k === 'editorial'){
    crPhoto(g, imgs[0], 0, 0, 0, W, H, 0);
    crFlouBords(g, W, H, s, c.flouBords);
    await crMotGeant(g, W, H, s, c);
    // En-tête : logo (ou nom) + partenaire
    const coulH = '#ffffff';
    let lw = 0;
    if(c.logo && logo){ const lh = 64 * s; lw = logo.width * lh / logo.height; }
    g.font = crFont(P.x, 300, 30 * s); g.letterSpacing = (6 * s) + 'px';
    const part = (c.partenaire || '').toUpperCase(), pw = part ? g.measureText(part).width : 0;
    const nomW = !lw && c.logo ? (g.font = crFont(P.t, 700, 30 * s), g.measureText(crNom().toUpperCase()).width) : 0;
    const gapH = part ? 34 * s : 0, total = (lw || nomW) + gapH + pw;
    let x0 = (W - total) / 2, yH = 60 * s;
    if(c.logo && logo){ g.drawImage(logo, x0, yH, lw, 64 * s); x0 += lw; }
    else if(c.logo){ g.font = crFont(P.t, 700, 30 * s); g.fillStyle = coulH; g.textAlign = 'left'; g.fillText(crNom().toUpperCase(), x0, yH + 44 * s); x0 += nomW; }
    if(part){ g.font = crFont(P.x, 300, 30 * s); g.fillStyle = coulH; g.textAlign = 'left'; g.fillText(part, x0 + gapH, yH + 44 * s); }
    g.letterSpacing = '0px';
    // Crédits en bas, centrés
    const cr = String(c.credits || '').split('\n').map(x => x.trim()).filter(Boolean);
    if(cr.length){
      g.font = crFont(P.x, 400, 26 * s); g.fillStyle = 'rgba(255,255,255,.92)'; g.textAlign = 'center';
      g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 8 * s;
      cr.forEach((l, i) => g.fillText(l, W / 2, H - 70 * s - (cr.length - 1 - i) * 34 * s));
      g.shadowBlur = 0; g.shadowColor = 'transparent'; g.textAlign = 'left';
    }
    if(c.copyright && !cr.length){ g.font = crFont(P.x, 400, 18 * s); g.fillStyle = 'rgba(255,255,255,.7)'; g.textAlign = 'center'; g.fillText('© ' + crNom(), W / 2, H - 30 * s); g.textAlign = 'left'; }
  }
  else if(M.k === 'magazine'){
    crPhoto(g, imgs[0], 0, 0, 0, W, H, 0);
    const gr = g.createLinearGradient(0, 0, 0, H * 0.32); gr.addColorStop(0, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H * 0.32);
    const gr2 = g.createLinearGradient(0, H, 0, H * 0.55); gr2.addColorStop(0, 'rgba(0,0,0,.65)'); gr2.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr2; g.fillRect(0, H * 0.55, W, H * 0.45);
    // Le nom du magazine, très grand, en police condensée
    crPolicesCreaLien();
    try { await Promise.race([document.fonts.load('400 100px "Bebas Neue"'), new Promise(r => setTimeout(r, 2000))]); } catch(e){}
    const mast = String(c.mot || crNom()).toUpperCase();
    g.font = '400 100px "Bebas Neue", "Anton", sans-serif';
    const mw = g.measureText(mast).width || 1, mpx = Math.min(100 * (W - 80 * s) / mw, H * 0.2);
    g.save(); g.fillStyle = c.motCouleur || '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'top'; g.font = `400 ${mpx}px "Bebas Neue", "Anton", sans-serif`;
    g.fillText(mast, W / 2, 40 * s); g.restore();
    if(c.eyebrow){ g.font = crFont(P.x, 600, 22 * s); g.fillStyle = 'rgba(255,255,255,.9)'; g.textAlign = 'right'; g.letterSpacing = (3 * s) + 'px'; g.fillText(c.eyebrow.toUpperCase(), W - 50 * s, 40 * s + mpx * 0.98); g.letterSpacing = '0px'; g.textAlign = 'left'; }
    // Lignes à gauche + gros titre en bas
    const lignes = String(c.sous || '').split('\n').map(x => x.trim()).filter(Boolean);
    let yl = H * 0.42;
    lignes.slice(0, 4).forEach(l => { g.fillStyle = c.accent; g.fillRect(50 * s, yl, 6 * s, 40 * s); crTexte(g, l, { fam: P.t, poids: 700, px: 30 * s, x: 70 * s, maxW: W * 0.5, y: yl - 2 * s, couleur: '#fff', maxL: 2, ombre: true }); yl += 80 * s; });
    crTexte(g, c.titre, { fam: P.t, poids: P.tw, px: 92 * s * T, x: 50 * s, maxW: W - 100 * s, y: H - 260 * s, couleur: '#fff', maxL: 2, lh: 1.02, ombre: true });
    if(c.copyright){ g.font = crFont(P.x, 400, 18 * s); g.fillStyle = 'rgba(255,255,255,.7)'; g.textAlign = 'right'; g.fillText('© ' + crNom(), W - 40 * s, H - 30 * s); g.textAlign = 'left'; }
  }
  else if(M.k === 'phototexte'){
    // Fond uni, le mot géant découpé dans la photo
    g.fillStyle = c.clair; g.fillRect(0, 0, W, H);
    const mot = String(c.mot || 'PHOTO').toUpperCase().split('\n').map(x => x.trim()).filter(Boolean);
    crPolicesCreaLien();
    const pc = CR_POLICES_CREA[c.motPolice] || CR_POLICES_CREA.grasse, fam = pc.f || P.t, poids = pc.f ? 400 : 900;
    try { await Promise.race([document.fonts.load(`${poids} 100px "${fam}"`), new Promise(r => setTimeout(r, 2000))]); } catch(e){}
    const off = document.createElement('canvas'); off.width = W; off.height = H;
    const o = off.getContext('2d');
    o.font = `${poids} 100px "${fam}", "Anton", sans-serif`;
    const plus = Math.max(...mot.map(l => o.measureText(l).width)) || 1;
    const px = Math.min(100 * (W * 0.9) / plus, H * 0.75 / (mot.length * 0.95)) * (c.motTaille || 1);
    const lh = px * 0.92, tot = mot.length * lh, y0 = (H - tot) / 2 - 40 * s;
    o.font = `${poids} ${Math.round(px)}px "${fam}", "Anton", sans-serif`; o.textAlign = 'center'; o.textBaseline = 'top'; o.fillStyle = '#000';
    mot.forEach((l, i) => o.fillText(l, W / 2, y0 + i * lh));
    o.globalCompositeOperation = 'source-in';
    const img = imgs[0];
    if(img){ const cc = CR.crop[0] || { x: 0, y: 0, z: 1 }; const k2 = Math.max(W / img.width, tot / img.height) * (cc.z || 1); const dw = img.width * k2, dh = img.height * k2;
      const fil = crFiltre(c); if(fil) o.filter = fil;
      o.drawImage(img, (W - dw) / 2 - cc.x * Math.max(0, (dw - W) / 2), y0 + (tot - dh) / 2 - cc.y * Math.max(0, (dh - tot) / 2), dw, dh); }
    g.drawImage(off, 0, 0);
    CR.rects.push({ i: 0, x: 0, y: y0, w: W, h: tot, libreX: 200 * s, libreY: 200 * s });
    const yb = y0 + tot + 30 * s;
    if(c.titre) crTexte(g, c.titre, { fam: P.x, poids: 500, px: 34 * s, x: 60 * s, maxW: W - 120 * s, y: yb, couleur: c.encre, align: 'centre', maxL: 1, espace: 3 * s });
    if(c.contact) crTexte(g, c.contact, { fam: P.x, poids: 400, px: 24 * s, x: 60 * s, maxW: W - 120 * s, y: yb + 60 * s, couleur: 'rgba(27,27,27,.6)', align: 'centre', maxL: 1 });
    g.font = crFont(P.t, 700, 20 * s); g.fillStyle = 'rgba(27,27,27,.5)'; g.letterSpacing = (4 * s) + 'px'; g.textAlign = 'center';
    g.fillText(crNom().toUpperCase(), W / 2, H - 40 * s); g.textAlign = 'left'; g.letterSpacing = '0px';
  }
  else if(M.k === 'triptyque'){
    g.fillStyle = c.bordCouleur; g.fillRect(0, 0, W, H);
    const gap = Math.max(6 * s, (c.gap || 0) * s), titreH = c.titre || c.sous ? 140 * s : 0, m = B;
    const w = (W - 2 * m - 2 * gap) / 3, h = H - 2 * m - titreH;
    for(let i = 0; i < 3; i++) crPhoto(g, imgs[i], i, m + i * (w + gap), m, w, h, 0);
    if(titreH){ const coul = crLisible(c.bordCouleur); let y = H - m - titreH + 26 * s;
      if(c.titre) y += crTexte(g, c.titre, { fam: P.t, poids: P.tw, px: 52 * s * T, x: 50 * s, maxW: W - 100 * s, y, couleur: coul, align: 'centre', maxL: 1 }) + 6 * s;
      if(c.sous) crTexte(g, c.sous, { fam: P.x, poids: 400, px: 26 * s, x: 50 * s, maxW: W - 100 * s, y, couleur: coul === '#ffffff' ? 'rgba(255,255,255,.75)' : 'rgba(0,0,0,.6)', align: 'centre', maxL: 1 }); }
  }
  else if(M.k === 'bandeau'){
    const large = W > H, bw = large ? W * 0.38 : W, bh = large ? H : H * 0.36;
    if(large) crPhoto(g, imgs[0], 0, 0, 0, W - bw, H, 0); else crPhoto(g, imgs[0], 0, 0, 0, W, H - bh, 0);
    g.fillStyle = c.fond; if(large) g.fillRect(W - bw, 0, bw, H); else g.fillRect(0, H - bh, W, bh);
    const x = large ? W - bw + 50 * s : 60 * s, mw = (large ? bw : W) - 110 * s;
    let y = large ? H * 0.3 : H - bh + 50 * s;
    const coul = crLisible(c.fond);
    if(c.eyebrow) y += crTexte(g, c.eyebrow, { fam: P.x, poids: 600, px: 24 * s, x, maxW: mw, y, couleur: c.accent, maj: true, espace: 5 * s, maxL: 1 }) + 10 * s;
    y += crTexte(g, c.titre, { fam: P.t, poids: P.tw, px: 66 * s * T, x, maxW: mw, y, couleur: coul, maxL: 2, lh: 1.04 }) + 14 * s;
    if(c.sous) y += crTexte(g, c.sous, { fam: P.x, poids: 400, px: 28 * s, x, maxW: mw, y, couleur: coul, maxL: 2, lh: 1.3 }) + 18 * s;
    if(c.appel){ crPilule(g, c.appel, { fam: P.t, poids: 700, px: 28 * s, x, maxW: mw, y, fond: c.accent, couleur: crLisible(c.accent), align: 'gauche' }); y += 84 * s; }
    if(c.contact) crTexte(g, c.contact, { fam: P.x, poids: 500, px: 24 * s, x, maxW: mw, y, couleur: coul, maxL: 1 });
    crSignature(g, W, H, c, P, s, false, logo, 'haut');
  }
  else if(M.k === 'minigalerie'){
    g.fillStyle = c.clair; g.fillRect(0, 0, W, H);
    const m = 70 * s;
    let y = m;
    if(c.eyebrow){ y += crTexte(g, c.eyebrow, { fam: P.x, poids: 600, px: 24 * s, x: m, maxW: W - 2 * m, y, couleur: c.accent, maj: true, espace: 5 * s, maxL: 1 }) + 8 * s; }
    y += crTexte(g, c.titre || '', { fam: P.t, poids: P.tw, px: 58 * s * T, x: m, maxW: W - 2 * m, y, couleur: c.encre, maxL: 2, lh: 1.05 }) + 26 * s;
    const basH = (c.sous ? 70 : 40) * s + 40 * s;
    const cases = crGrille(CR.photos.length, { x: m, y, w: W - 2 * m, h: H - y - basH - m * 0.5 }, 12 * s);
    cases.forEach((r, i) => crPhoto(g, imgs[i], i, r.x, r.y, r.w, r.h, 14 * s));
    const yb = H - basH;
    if(c.sous) crTexte(g, c.sous, { fam: P.x, poids: 400, px: 26 * s, x: m, maxW: W - 2 * m, y: yb, couleur: 'rgba(27,27,27,.7)', maxL: 2, lh: 1.3 });
    g.font = crFont(P.t, 700, 20 * s); g.fillStyle = 'rgba(27,27,27,.55)'; g.letterSpacing = (4 * s) + 'px'; g.textAlign = 'right';
    g.fillText(crNom().toUpperCase(), W - m, H - m * 0.6); g.textAlign = 'left'; g.letterSpacing = '0px';
  }
  // Mot géant sur les autres modèles (s'il est rempli), puis les effets sur toute l'image
  if(M.k !== 'editorial' && c.mot) await crMotGeant(g, W, H, s, c);
  await crEffetsApres(g, W, H, s, c, 0);
}
// ============================================================
// EFFETS (images et vidéos)
// ============================================================
const CR_FILTRES = {
  aucun: ['Aucun', ''], nb: ['Noir et blanc', 'grayscale(1) contrast(1.08)'], sepia: ['Sépia', 'sepia(.55) contrast(1.05)'],
  contraste: ['Contrasté', 'contrast(1.22) saturate(1.12)'], chaud: ['Chaud', 'sepia(.2) saturate(1.25) hue-rotate(-6deg)'],
  froid: ['Froid', 'saturate(.85) hue-rotate(12deg) brightness(1.03)'], pastel: ['Pastel', 'saturate(.7) brightness(1.08) contrast(.9)'],
  cinema: ['Cinéma', 'contrast(1.15) saturate(.78) brightness(.95)'], fane: ['Délavé', 'contrast(.85) saturate(.75) brightness(1.06)'],
  vintage: ['Vintage', 'sepia(.35) contrast(1.1) saturate(.8) hue-rotate(-8deg)'], noirfort: ['Noir intense', 'grayscale(1) contrast(1.45) brightness(.95)'],
  dore: ['Doré', 'sepia(.3) saturate(1.4) hue-rotate(-12deg) brightness(1.05)'], vif: ['Éclatant', 'saturate(1.45) contrast(1.08)']
};
function crFiltre(c){ const e = (c && c.effets) || {}; return (CR_FILTRES[e.filtre] || CR_FILTRES.aucun)[1]; }
// Grain de film : quelques plaques de bruit, changées à chaque image d'une vidéo
const CR_GRAINS = [];
function crGrain(n){
  if(!CR_GRAINS.length){
    for(let k = 0; k < 4; k++){
      const cv = document.createElement('canvas'); cv.width = cv.height = 256;
      const g = cv.getContext('2d'), d = g.createImageData(256, 256);
      for(let i = 0; i < d.data.length; i += 4){ const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
      g.putImageData(d, 0, 0); CR_GRAINS.push(cv);
    }
  }
  return CR_GRAINS[(n || 0) % CR_GRAINS.length];
}
const CR_FX_IMG = {};
async function crEffetImage(e){
  if(!e || !e.path) return null;
  if(CR_FX_IMG[e.path]) return CR_FX_IMG[e.path];
  try {
    const [u] = await mkSign([e.path]); const b = await mkUrlBlob(u); const url = URL.createObjectURL(b);
    CR_FX_IMG[e.path] = await new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = url; });
  } catch(er){ CR_FX_IMG[e.path] = null; }
  return CR_FX_IMG[e.path];
}
// Effets posés sur toute l'image : effet perso, lumière, vignette, grain. t = temps (vidéo)
async function crEffetsApres(g, W, H, s, c, t){
  const e = (c && c.effets) || {};
  if(e.perso && e.perso.path){
    const im = await crEffetImage(e.perso);
    if(im){
      const k = Math.max(W / im.width, H / im.height), dw = im.width * k, dh = im.height * k;
      g.save(); g.globalAlpha = e.persoOpac == null ? 0.6 : e.persoOpac; g.globalCompositeOperation = e.persoBlend || 'screen';
      g.drawImage(im, (W - dw) / 2, (H - dh) / 2, dw, dh); g.restore();
    }
  }
  if(e.lumiere > 0){
    const a = e.lumiere, ph = (t || 0) * 0.35;
    g.save(); g.globalCompositeOperation = 'screen';
    [[0.15 + 0.1 * Math.sin(ph), 0.1, '255,140,60'], [0.9, 0.85 + 0.08 * Math.cos(ph * 1.3), '255,70,110']].forEach(([fx, fy, rgb]) => {
      const gr = g.createRadialGradient(W * fx, H * fy, 0, W * fx, H * fy, Math.max(W, H) * 0.55);
      gr.addColorStop(0, `rgba(${rgb},${0.55 * a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    });
    g.restore();
  }
  if(e.brulure > 0){
    // Bords brûlés de pellicule (orange sombre)
    g.save(); g.globalCompositeOperation = 'screen';
    const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.max(W, H) * 0.72);
    gr.addColorStop(0, 'rgba(255,90,0,0)'); gr.addColorStop(1, `rgba(255,${90 + 40 * Math.sin((t || 0) * 2)},0,${0.7 * e.brulure})`);
    g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
  }
  if(e.poussiere > 0){
    // Poussières et petites rayures (toujours les mêmes sur une image, qui bougent en vidéo)
    g.save(); g.fillStyle = `rgba(255,255,255,${0.7 * e.poussiere})`; g.strokeStyle = `rgba(255,255,255,${0.35 * e.poussiere})`; g.lineWidth = Math.max(1, s);
    const graine = Math.floor((t || 0) * 12);
    for(let i = 0; i < 70; i++){ const a = Math.sin((i + 1) * 12.9898 + graine * 78.233) * 43758.5453, b = Math.sin((i + 1) * 39.346 + graine * 11.135) * 24634.6345;
      const x = (a - Math.floor(a)) * W, y = (b - Math.floor(b)) * H, r = (0.6 + (i % 4) * 0.6) * s;
      if(i % 9 === 0){ g.beginPath(); g.moveTo(x, y); g.lineTo(x + 3 * s, y + 40 * s); g.stroke(); } else { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); } }
    g.restore();
  }
  if(e.vignette > 0){
    const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${0.75 * e.vignette})`);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  if(e.grain > 0){
    g.save(); g.globalAlpha = 0.22 * e.grain; g.globalCompositeOperation = 'overlay';
    const pat = g.createPattern(crGrain(Math.floor((t || 0) * 24)), 'repeat');
    const sc = Math.max(1, s * 1.2);
    g.scale(sc, sc); g.fillStyle = pat; g.fillRect(0, 0, W / sc, H / sc); g.restore();
  }
}
// Bords flous : la photo reste nette au centre et se floute vers les bords
function crFlouBords(g, W, H, s, force){
  if(!(force > 0)) return;
  try {
    const off = document.createElement('canvas'); off.width = W; off.height = H;
    const o = off.getContext('2d');
    o.filter = `blur(${Math.round(26 * s * force)}px)`;
    o.drawImage(g.canvas, 0, 0);
    o.filter = 'none';
    o.globalCompositeOperation = 'destination-in';
    const gr = o.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.22, W / 2, H * 0.45, Math.max(W, H) * 0.62);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
    o.fillStyle = gr; o.fillRect(0, 0, W, H);
    g.drawImage(off, 0, 0);
  } catch(e){ console.warn('flou', e); }
}
// Polices créatives pour le mot géant (pinceau, feutre, condensée...)
const CR_POLICES_CREA = {
  marque: { nom: 'Ma police', f: null }, pinceau: { nom: 'Pinceau', f: 'Permanent Marker' }, feutre: { nom: 'Feutre', f: 'Caveat Brush' },
  condensee: { nom: 'Condensée', f: 'Bebas Neue' }, grasse: { nom: 'Grasse', f: 'Anton' }, machine: { nom: 'Machine à écrire', f: 'Special Elite' }
};
function crPolicesCreaLien(){
  if(document.getElementById('crCreaFonts')) return;
  const l = document.createElement('link'); l.id = 'crCreaFonts'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Permanent+Marker&family=Caveat+Brush&family=Bebas+Neue&family=Anton&family=Special+Elite&display=swap';
  document.head.appendChild(l);
}
async function crMotGeant(g, W, H, s, c){
  const txt = String(c.mot || '').trim(); if(!txt) return;
  crPolicesCreaLien();
  const pc = CR_POLICES_CREA[c.motPolice] || CR_POLICES_CREA.pinceau;
  const P = crPolices(), fam = pc.f || P.t, poids = pc.f ? 400 : 800;
  try { await Promise.race([document.fonts.load(`${poids} 100px "${fam}"`), new Promise(r => setTimeout(r, 2500))]); } catch(e){}
  const lignes = (c.motMaj === false ? txt : txt.toUpperCase()).split('\n').map(x => x.trim()).filter(Boolean);
  // Taille : la ligne la plus longue prend ~86 % de la largeur
  g.font = `${poids} 100px "${fam}", sans-serif`;
  const plus = Math.max(...lignes.map(l => g.measureText(l).width)) || 1;
  let px = Math.min(100 * (W * 0.86) / plus, H * 0.9 / (lignes.length * 1.02)) * (c.motTaille || 1);
  const lh = px * (pc.f === 'Bebas Neue' || pc.f === 'Anton' ? 0.92 : 1.0);
  const total = lignes.length * lh;
  const y0 = c.motPos === 'haut' ? H * 0.12 : c.motPos === 'bas' ? H * 0.88 - total : (H - total) / 2;
  g.save();
  g.globalAlpha = c.motOpacite == null ? 0.85 : c.motOpacite;
  if(c.motFlou > 0) g.filter = `blur(${(c.motFlou * 1.6 * s).toFixed(1)}px)`;
  g.fillStyle = c.motCouleur || c.accent || '#c0141b';
  g.textAlign = 'center'; g.textBaseline = 'top';
  g.font = `${poids} ${Math.round(px)}px "${fam}", sans-serif`;
  lignes.forEach((l, i) => g.fillText(l, W / 2, y0 + i * lh));
  g.restore();
}

// Cases d'une mosaïque selon le nombre de photos et la forme
function crGrille(n, z, gap){
  const out = [], large = z.w >= z.h;
  const ligne = (y, h, k) => { const w = (z.w - gap * (k - 1)) / k; for(let i = 0; i < k; i++) out.push({ x: z.x + i * (w + gap), y, w, h }); };
  const rangs = arr => { const h = (z.h - gap * (arr.length - 1)) / arr.length; arr.forEach((k, r) => ligne(z.y + r * (h + gap), h, k)); };
  if(n <= 1) out.push({ x: z.x, y: z.y, w: z.w, h: z.h });
  else if(n === 2) large ? ligne(z.y, z.h, 2) : rangs([1, 1]);
  else if(n === 3){
    if(large){ const w1 = (z.w - gap) * 0.6, w2 = z.w - gap - w1, h2 = (z.h - gap) / 2;
      out.push({ x: z.x, y: z.y, w: w1, h: z.h }, { x: z.x + w1 + gap, y: z.y, w: w2, h: h2 }, { x: z.x + w1 + gap, y: z.y + h2 + gap, w: w2, h: h2 }); }
    else { const h1 = (z.h - gap) * 0.6; out.push({ x: z.x, y: z.y, w: z.w, h: h1 }); ligne(z.y + h1 + gap, z.h - gap - h1, 2); }
  }
  else if(n === 4) rangs([2, 2]);
  else if(n === 5){ const h1 = (z.h - gap) * 0.55; ligne(z.y, h1, 2); ligne(z.y + h1 + gap, z.h - gap - h1, 3); }
  else if(n === 6) large ? rangs([3, 3]) : rangs([2, 2, 2]);
  else if(n === 7) rangs([2, 3, 2]);
  else if(n === 8) large ? rangs([4, 4]) : rangs([2, 2, 2, 2]);
  else rangs([3, 3, 3]);
  return out.slice(0, n);
}
function crCadre(g, imgs, W, H, s, c, P, texte, logo){
  const st = c.cadre || 'polaroid';
  if(st === 'polaroid'){
    g.fillStyle = c.clair; g.fillRect(0, 0, W, H);
    const n = Math.max(1, Math.min(3, CR.photos.length));
    const cw = n === 1 ? W * 0.78 : W * 0.56, ch = cw * 1.18, photoH = cw - 40 * s;
    const pos = n === 1 ? [[0, 0, 0]] : n === 2 ? [[-0.16, -0.06, -4], [0.16, 0.08, 4]] : [[-0.2, -0.12, -6], [0.2, -0.04, 5], [0, 0.14, -2]];
    pos.forEach(([dx, dy, rot], i) => {
      g.save();
      g.translate(W / 2 + dx * W, H / 2 + dy * H - (n === 1 ? 30 * s : 0)); g.rotate(rot * Math.PI / 180);
      g.shadowColor = 'rgba(0,0,0,.18)'; g.shadowBlur = 30 * s; g.shadowOffsetY = 10 * s;
      g.fillStyle = '#ffffff'; g.fillRect(-cw / 2, -ch / 2, cw, ch); g.shadowBlur = 0; g.shadowColor = 'transparent'; g.shadowOffsetY = 0;
      const m = 20 * s;
      // La photo dans le polaroid (sans déplacement si penché : on garde le cadrage)
      g.save(); g.beginPath(); g.rect(-cw / 2 + m, -ch / 2 + m, cw - 2 * m, photoH); g.clip();
      const img = imgs[i];
      if(img){ const cc = CR.crop[i] || { x: 0, y: 0, z: 1 }; const k = Math.max((cw - 2 * m) / img.width, photoH / img.height) * (cc.z || 1); const dw = img.width * k, dh = img.height * k;
        g.drawImage(img, -cw / 2 + m + (cw - 2 * m - dw) / 2 - cc.x * Math.max(0, (dw - cw + 2 * m) / 2), -ch / 2 + m + (photoH - dh) / 2 - cc.y * Math.max(0, (dh - photoH) / 2), dw, dh); }
      g.restore();
      if(i === n - 1 && c.titre){ g.font = crFont(P.x, 500, 34 * s); g.fillStyle = '#333'; g.textAlign = 'center'; g.fillText(c.titre, 0, ch / 2 - 46 * s, cw - 40 * s); g.textAlign = 'left'; }
      g.restore();
    });
    if(n === 1) CR.rects.push({ i: 0, x: W / 2 - cw / 2, y: H / 2 - ch / 2 - 30 * s, w: cw, h: ch, libreX: 200 * s, libreY: 200 * s });
    if(c.sous) texte(c.sous, { px: 28 * s, poids: 500, y: H - 150 * s, align: 'centre', couleur: c.encre, maxL: 1 });
    if(c.copyright){ g.font = crFont(P.x, 400, 18 * s); g.fillStyle = 'rgba(0,0,0,.45)'; g.textAlign = 'center'; g.fillText('© ' + crNom(), W / 2, H - 40 * s); g.textAlign = 'left'; }
    return;
  }
  if(st === 'pellicule'){
    g.fillStyle = '#0d0d0d'; g.fillRect(0, 0, W, H);
    const n = Math.max(1, Math.min(3, CR.photos.length));
    const bande = 70 * s, trouW = 26 * s, trouH = 36 * s, pas = 64 * s;
    g.fillStyle = '#f2f2f2';
    for(let y = 20 * s; y < H; y += pas){ crRond(g, (bande - trouW) / 2, y, trouW, trouH, 5 * s); g.fill(); crRond(g, W - bande + (bande - trouW) / 2, y, trouW, trouH, 5 * s); g.fill(); }
    const titreH = c.titre ? 110 * s : 0;
    const zx = bande + 14 * s, zw = W - 2 * zx, gap = 18 * s, zh = (H - 60 * s - titreH - gap * (n - 1)) / n;
    for(let i = 0; i < n; i++) crPhoto(g, imgs[i], i, zx, 30 * s + i * (zh + gap), zw, zh, 0);
    if(c.titre) texte(c.titre, { fam: P.t, poids: P.tw, px: 48 * s * (c.taille || 1), y: H - titreH - 6 * s, align: 'centre', couleur: '#f2f2f2', maxL: 1 });
    if(c.copyright){ g.font = crFont(P.x, 400, 16 * s); g.fillStyle = 'rgba(255,255,255,.5)'; g.textAlign = 'right'; g.fillText('© ' + crNom(), W - bande - 16 * s, H - 14 * s); g.textAlign = 'left'; }
    return;
  }
  // Bordure fine ou passe-partout
  const passe = st === 'passe';
  const fond = passe ? c.fond : '#ffffff';
  g.fillStyle = fond; g.fillRect(0, 0, W, H);
  const m = (passe ? 96 : 60) * s, titreH = c.titre || c.sous ? 150 * s : 0;
  const x = m, y = m, w = W - 2 * m, h = H - 2 * m - titreH;
  const n = Math.max(1, Math.min(3, CR.photos.length));
  const cases = crGrille(n, { x, y, w, h }, 12 * s);
  cases.forEach((r, i) => crPhoto(g, imgs[i], i, r.x, r.y, r.w, r.h, 0));
  g.strokeStyle = passe ? 'rgba(255,255,255,.85)' : c.accent; g.lineWidth = 2 * s;
  g.strokeRect(x - 18 * s, y - 18 * s, w + 36 * s, h + 36 * s);
  const coul = crLisible(fond);
  let yy = y + h + 48 * s;
  if(c.titre) yy += texte(c.titre, { fam: P.t, poids: P.tw, px: 48 * s * (c.taille || 1), y: yy, couleur: coul, maxL: 1, x: m, maxW: W - 2 * m }) + 6 * s;
  if(c.sous) texte(c.sous, { px: 26 * s, poids: 400, y: yy, couleur: coul === '#ffffff' ? 'rgba(255,255,255,.75)' : 'rgba(0,0,0,.6)', maxL: 1, x: m, maxW: W - 2 * m });
  if(c.copyright){ g.font = crFont(P.x, 400, 18 * s); g.fillStyle = coul === '#ffffff' ? 'rgba(255,255,255,.6)' : 'rgba(0,0,0,.45)'; g.textAlign = 'right'; g.fillText('© ' + crNom(), W - m, H - 30 * s); g.textAlign = 'left'; }
}

// ============================================================
// TEXTES PAR L'IA (selon Ma marque et ce que Henzo a aimé)
// ============================================================
async function crIA(){
  if(CR.busy) return;
  const M = crModele();
  CR.busy = 'ia'; crRender();
  try {
    const occ = (CR.occasion || '').trim();
    const champs = {
      affiche: '"eyebrow":"2 ou 3 mots en majuscules","titre":"titre très court (2 à 5 mots)","sous":"une phrase courte","offre":"ce qui est inclus, court","prix":"prix si connu, sinon vide","appel":"bouton, 2 à 4 mots","contact":""',
      epure: '"eyebrow":"1 ou 2 mots","titre":"titre très court","sous":"une phrase courte","prix":"prix si connu, sinon vide","appel":"2 à 4 mots"',
      story: '"titre":"titre très court","sous":"une phrase courte","appel":"2 à 4 mots"',
      mosaique: '"titre":"titre très court","sous":"une phrase courte"',
      cadre: '"titre":"légende très courte","sous":"lieu ou détail, très court"',
      citation: '"citation":"une phrase forte et douce, moins de 14 mots","auteur":"signature courte"',
      avantapres: '"avant":"Avant","apres":"Après","titre":"titre très court"',
      carrousel: '"titre":"titre de la série, très court","sous":"une phrase","appel":"appel final, 2 à 5 mots"',
      storyboard: '"titre":"titre très court","legendes":["moment 1, 2 à 4 mots","moment 2","moment 3"]'
    }[M.k];
    const shoot = CR.shoot_id && typeof mkShoot === 'function' ? mkShoot(CR.shoot_id) : null;
    const q = `TEXTES POUR UN VISUEL "${M.nom}" (${CR_FMT[CR.fmt].nom}).
${occ ? 'Pour : ' + occ + '.' : ''}${shoot ? ` Séance : ${shoot.type || ''}${typeof mkFirst === 'function' && typeof mkClient === 'function' && mkClient(shoot.client_id) ? ' de ' + mkFirst(mkClient(shoot.client_id)) : ''}.` : ''}
Textes très courts, élégants, épurés : c'est une image, pas une légende. Lettres normales seulement. Pas de tiret long. Respecte ce que Henzo a validé et aimé.
Réponds UNIQUEMENT en JSON : {${champs}}`;
    const r = typeof stIA === 'function' ? await stIA(q, [], 900) : (await mkAI({ messages: [{ role: 'user', text: q }], maxTokens: 900 })).text;
    const j = mkJson(typeof r === 'string' ? r : r.text) || {};
    const net = v => (typeof stClean === 'function' ? stClean(v) : String(v || '')).trim();
    Object.keys(j).forEach(k => {
      if(k === 'legendes' && Array.isArray(j[k])) CR.cfg.legendes = j[k].slice(0, 3).map(net);
      else if(typeof j[k] === 'string' && k in CR.cfg && (j[k] || k !== 'contact')) CR.cfg[k] = net(j[k]);
    });
    if(!CR.cfg.contact) CR.cfg.contact = crM().contact || '';
  } catch(e){ agAlert(e.message || String(e)); }
  CR.busy = ''; crRender();
}

// ============================================================
// EXPORT, PARTAGE, PLAN, STYLES
// ============================================================
async function crImages(){
  // Toutes les images finales (plusieurs pour un carrousel)
  const M = crModele();
  const n = M.k === 'carrousel' ? CR.photos.length + 1 : 1;
  const out = [], T = crTailleFinale(), flous = new Set();
  for(let i = 0; i < n; i++){
    const cv = document.createElement('canvas');
    await crDessiner(cv, i, T.exact ? T : T.k);
    (CR.flous || []).forEach(x => flous.add(x));
    const png = CR.exp.type === 'png';
    const blob = await new Promise((ok, ko) => cv.toBlob(b => b ? ok(b) : ko(new Error('Image trop grande pour cet appareil : choisis une qualité plus petite.')), png ? 'image/png' : 'image/jpeg', T.k > 2.5 ? 0.95 : 0.93));
    out.push({ blob, nom: `${(typeof mkSlug === 'function' ? mkSlug(CR.cfg.titre || M.nom) : 'creation')}${n > 1 ? '-' + (i + 1) : ''}-${cv.width}x${cv.height}.${png ? 'png' : 'jpg'}` });
    cv.width = cv.height = 1;   // libère la mémoire tout de suite
  }
  out.flous = [...flous].sort();
  return out;
}
function crApercuMini(){
  const cv = document.getElementById('crCanvas'); if(!cv) return null;
  const k = 260 / Math.max(cv.width, cv.height);
  const c = document.createElement('canvas'); c.width = Math.round(cv.width * k); c.height = Math.round(cv.height * k);
  c.getContext('2d').drawImage(cv, 0, 0, c.width, c.height);
  try { return c.toDataURL('image/jpeg', 0.7); } catch(e){ return null; }
}
async function crExporter(mode){
  if(CR.busy) return;
  CR.busy = 'export'; crRender();
  try {
    const files = await crImages();
    if(files.flous && files.flous.length){
      const quoi = files.flous.length === 1 ? `La photo ${files.flous[0]} est` : `Les photos ${files.flous.join(', ')} sont`;
      agToast(`${quoi} plus petite${files.flous.length > 1 ? 's' : ''} que cette qualité : un peu moins nette${files.flous.length > 1 ? 's' : ''}. Prends l'original depuis le téléphone ou la galerie.`, 'info');
    }
    if(mode === 'telecharger'){
      files.forEach((f, i) => setTimeout(() => { const a = document.createElement('a'); a.href = URL.createObjectURL(f.blob); a.download = f.nom; document.body.appendChild(a); a.click(); a.remove(); }, i * 350));
      agToast(files.length > 1 ? `${files.length} images téléchargées` : 'Image téléchargée');
    } else if(mode === 'partager'){
      const fl = files.map(f => new File([f.blob], f.nom, { type: 'image/jpeg' }));
      if(navigator.canShare && navigator.canShare({ files: fl })){
        try { await navigator.share({ files: fl, title: CR.cfg.titre || crNom() }); } catch(e){ if(e && e.name !== 'AbortError') throw e; }
      } else {
        files.forEach((f, i) => setTimeout(() => { const a = document.createElement('a'); a.href = URL.createObjectURL(f.blob); a.download = f.nom; document.body.appendChild(a); a.click(); a.remove(); }, i * 350));
        agToast('Ton appareil ne sait pas partager directement : image téléchargée');
      }
    } else if(mode === 'plan'){
      const paths = await crEnvoyer(files);
      if(paths.length && typeof mkInsertPost === 'function'){
        const legende = [CR.cfg.titre, CR.cfg.sous, CR.cfg.offre && CR.cfg.prix ? `${CR.cfg.offre} : ${CR.cfg.prix}` : CR.cfg.offre || CR.cfg.prix, CR.cfg.appel, CR.cfg.contact].filter(Boolean).join('\n');
        const row = await mkInsertPost({ network: CR.fmt === 'story' ? 'Statut WhatsApp' : 'Facebook', kind: 'Promo', title: (CR.cfg.titre || crModele().nom).slice(0, 60), caption: legende, images: paths.map(p => ({ path: p })), shoot_id: CR.shoot_id || null });
        if(row) agToast('Ajouté au plan de publication');
      }
    }
    await crGarder(mode === 'plan');
  } catch(e){ agAlert(e.message || String(e)); }
  CR.busy = ''; crRender();
}
// Envoie les images finales dans "Mes photos envoyées" (bucket marketing)
async function crEnvoyer(files){
  const uid = typeof mkUid === 'function' ? await mkUid() : null; if(!uid) throw new Error('Pas connecté');
  const paths = [];
  for(const f of files){
    const path = `${uid}/creation-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
    const { error } = await sb.storage.from('marketing').upload(path, f.blob, { contentType: 'image/jpeg', upsert: false });
    if(error) throw new Error(error.message);
    try { await sb.from('mk_media').insert({ path, size: f.blob.size, source: 'creation' }); } catch(e){}
    paths.push(path);
  }
  CR.media = null;
  return paths;
}
// Garde la création dans "Mes dernières créations" (réglages + petit aperçu)
async function crGarder(){
  try {
    const { data } = await sb.from('creations').insert({ kind: 'creation', nom: CR.cfg.titre || crModele().nom, modele: CR.modele, config: crConfigPour(true), apercu: crApercuMini(), shoot_id: CR.shoot_id || null }).select().single();
    if(data){ CR.recents.unshift(data); CR.recents = CR.recents.slice(0, 30); }
  } catch(e){ console.warn('creation', e); }
}
// Ce qu'on garde : le style (et, pour une création, les photos qui peuvent être retrouvées)
function crConfigPour(avecPhotos, avecTextes){
  const c = Object.assign({}, CR.cfg);
  if(!avecTextes && !avecPhotos){ ['titre', 'sous', 'offre', 'prix', 'citation', 'eyebrow', 'mot', 'credits', 'partenaire'].forEach(k => { c[k] = ''; }); c.legendes = ['', '', '']; }
  const o = { cfg: c, fmt: CR.fmt };
  if(avecPhotos){
    o.photos = CR.photos.map(p => p.src === 'galerie' ? { src: 'galerie', dossier: p.dossier, f: p.f } : p.path ? { src: 'media', path: p.path } : null);
    o.crop = CR.crop;
  }
  return o;
}
async function crGarderStyle(){
  const nom = await agDialog({ kind: 'prompt', msg: 'Nom de ce style\nEx : Promo élégante, Story noir et or', value: (crModele().nom + ' ' + (CR.styles.length + 1)) });
  if(!nom) return;
  const garderTextes = await agConfirm('Garder aussi les textes ?\nOui : le titre, l\'offre et le prix reviennent avec le style.\nNon : seulement la mise en page, la police et les couleurs.', { ok: 'Oui', no: 'Non, juste le style' });
  try {
    const { data, error } = await sb.from('creations').insert({ kind: 'style', nom: String(nom).trim().slice(0, 60), modele: CR.modele, config: crConfigPour(false, garderTextes), apercu: crApercuMini() }).select().single();
    if(error) throw error;
    CR.styles.unshift(data);
    agToast('Style gardé : tu peux le refaire sur d\'autres photos');
    // Le coach et l'agent marketing le savent aussi
    if(typeof mkSaveMemos === 'function'){
      const P = crPolice(), c = CR.cfg;
      mkSaveMemos([{ kind: 'preference', text: `Style de visuel aimé "${String(nom).trim()}" : ${crModele().nom.toLowerCase()}, police ${P.titre}, couleurs ${c.fond} / ${c.accent}, texte ${c.pos === 'haut' ? 'en haut' : c.pos === 'centre' ? 'au centre' : 'en bas'}, ${c.align === 'centre' ? 'centré' : 'à gauche'}` }], 'créations (style gardé)');
    }
  } catch(e){ agAlert('Style non gardé : ' + (e.message || e)); }
}
function crAppliquerStyle(id){
  const st = CR.styles.find(x => x.id === id); if(!st) return;
  const conf = st.config || {};
  CR.modele = st.modele; CR.styleId = id;
  CR.cfg = Object.assign(crCfgDefaut(), conf.cfg || {});
  CR.fmt = conf.fmt || CR.fmt;
  const M = crModele(); if(!M.fmts.includes(CR.fmt)) CR.fmt = M.fmts[0];
  CR.slide = 0;
  CR.vue = CR.photos.length >= M.min ? 'edit' : 'photos';
  if(CR.photos.length > M.max){ CR.photos = CR.photos.slice(0, M.max); CR.crop = CR.crop.slice(0, M.max); }
  crRender(); window.scrollTo({ top: 0 });
}
async function crRouvrir(id){
  const r = CR.recents.find(x => x.id === id); if(!r) return;
  const conf = r.config || {};
  CR.modele = r.modele; CR.cfg = Object.assign(crCfgDefaut(), conf.cfg || {}); CR.fmt = conf.fmt || 'post'; CR.slide = 0; CR.shoot_id = r.shoot_id || null;
  CR.photos = (conf.photos || []).map(p => !p ? null : p.src === 'galerie' ? { k: 'g:' + p.dossier + '/' + p.f, src: 'galerie', dossier: p.dossier, f: p.f, thumb: galPhotoUrl(p.dossier, p.f, 'thumb'), url: galPhotoUrl(p.dossier, p.f, 'medium') } : { k: 'm:' + p.path, src: 'media', path: p.path }).filter(Boolean);
  CR.crop = (conf.crop || []).slice(0, CR.photos.length);
  while(CR.crop.length < CR.photos.length) CR.crop.push({ x: 0, y: 0, z: 1 });
  const M = crModele();
  CR.vue = CR.photos.length >= M.min ? 'edit' : 'photos';
  if(CR.vue === 'photos') agToast('Les photos du téléphone ne sont pas gardées : choisis-les à nouveau', 'info');
  crRender(); window.scrollTo({ top: 0 });
}
async function crSupprimer(id){
  if(!await agConfirm('Supprimer ce style ?')) return;
  const { error } = await sb.from('creations').delete().eq('id', id);
  if(error){ agAlert(error.message); return; }
  CR.styles = CR.styles.filter(x => x.id !== id); crRender();
}

// ============================================================
// ENTREES DEPUIS LE RESTE DE L'APP
// ============================================================
// photos : [{path} | {url, thumb} | {src:'galerie', dossier, f}]
window.crOuvrir = function(o){
  o = o || {};
  CR.photos = (o.photos || []).map((p, i) => p.src === 'galerie' && p.f ? { k: 'g:' + p.dossier + '/' + p.f, src: 'galerie', dossier: p.dossier, f: p.f, thumb: galPhotoUrl(p.dossier, p.f, 'thumb'), url: galPhotoUrl(p.dossier, p.f, 'medium') }
    : p.path ? { k: 'm:' + p.path, src: 'media', path: p.path } : p.file ? { k: 'f:' + i + Math.random(), src: 'fichier', file: p.file, url: URL.createObjectURL(p.file), thumb: URL.createObjectURL(p.file) }
    : p.url ? { k: 'u:' + p.url, src: 'url', url: p.url, thumb: p.thumb || p.url } : null).filter(Boolean).slice(0, 10);
  CR.crop = CR.photos.map(() => ({ x: 0, y: 0, z: 1 }));
  CR.cfg = Object.assign(crCfgDefaut(), o.titre ? { titre: o.titre } : {});
  CR.shoot_id = o.shoot_id || null; CR.occasion = o.occasion || '';
  CR.modele = null; CR.vue = 'accueil';
  if(o.modele) CR.modele = o.modele;
  if(typeof agGoTab === 'function') agGoTab('creations');
  setTimeout(() => { if(CR.modele) crChoisirModele(CR.modele); else crRender(); }, 60);
  if(CR.photos.length && !o.modele) agToast(`${CR.photos.length} photo${CR.photos.length > 1 ? 's' : ''} prête${CR.photos.length > 1 ? 's' : ''} : choisis un modèle`, 'info');
};
window.crDepuisPost = function(a, b){
  const p = typeof mkPropGet === 'function' ? mkPropGet(a, b) : null; if(!p) return;
  const titre = typeof txtDefancy === 'function' ? txtDefancy(String(p.caption || '').split('\n')[0] || p.title || '') : (p.title || '');
  crOuvrir({ photos: p.images || [], titre: titre.slice(0, 60), shoot_id: p.shoot_id || null, occasion: p.title || '' });
};
window.crDepuisPlan = function(id){
  const p = (typeof MK !== 'undefined' ? MK.posts : []).find(x => x.id === id); if(!p) return;
  const titre = typeof txtDefancy === 'function' ? txtDefancy(String(p.caption || '').split('\n')[0] || p.title || '') : (p.title || '');
  crOuvrir({ photos: p.images || [], titre: titre.slice(0, 60), shoot_id: p.shoot_id || null, occasion: p.title || '' });
};

// L'onglet s'affiche : on dessine
(function(){
  const avant = showTab;
  showTab = function(name, btn){ avant(name, btn); if(name === 'creations') crRender(); };
  const a = document.querySelector('.page.active');
  if(a && a.id === 'page-creations') crRender();
})();

// ============================================================
// STYLE
// ============================================================
function crCss(){
  if(document.getElementById('crCss')) return;
  const st = document.createElement('style'); st.id = 'crCss';
  st.textContent = `
.cr-top h2{font-size:22px;margin:4px 0 4px}
.cr-top p{font-size:13.5px;color:var(--muted);margin:0 0 12px;line-height:1.5}
.cr-sec{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:18px 2px 8px;font-weight:700}
.cr-sec i{font-style:normal;background:var(--card3);color:var(--text);border-radius:8px;padding:1px 7px;margin-left:4px}
.cr-modeles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
@media(min-width:700px){.cr-modeles{grid-template-columns:repeat(5,1fr)}}
.cr-mod{display:flex;flex-direction:column;align-items:flex-start;gap:4px;margin:0;padding:12px;border-radius:16px;background:var(--card);border:1px solid var(--border);color:var(--text);cursor:pointer;text-align:left;width:auto}
.cr-mod b{font-size:13px}.cr-mod small{font-size:11px;color:var(--muted);line-height:1.3}
.cr-mini{display:block;width:38px;height:46px;color:var(--accent);margin-bottom:4px}
.cr-mini svg{width:100%;height:100%}
.cr-styles{display:flex;flex-direction:column;gap:8px}
.cr-style{display:flex;gap:12px;align-items:center;padding:10px;border-radius:16px;background:var(--card);border:1px solid var(--border)}
.cr-st-img{width:64px;height:80px;flex:none;margin:0;padding:0;border-radius:10px;overflow:hidden;border:1px solid var(--border);background:var(--card2);cursor:pointer;color:var(--accent)}
.cr-st-img img{width:100%;height:100%;object-fit:cover;display:block}
.cr-st-d{min-width:0;flex:1}.cr-st-d b{display:block;color:var(--text)}.cr-st-d small{color:var(--muted);font-size:12px}
.cr-st-b{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
.cr-st-b button{width:auto;margin:0;padding:6px 10px;border-radius:10px;font:600 12px Inter,sans-serif;background:var(--card2);border:1px solid var(--border);color:var(--text);cursor:pointer}
.cr-st-b button.no{color:var(--red,#ff6b6b)}
.cr-recents{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.cr-rec{margin:0;padding:0;aspect-ratio:4/5;border-radius:10px;overflow:hidden;border:1px solid var(--border);background:var(--card2);cursor:pointer;width:auto;color:var(--accent)}
.cr-rec img{width:100%;height:100%;object-fit:cover;display:block}
.cr-choisies{display:flex;gap:6px;overflow-x:auto;padding:4px 0 10px;min-height:70px;align-items:center}
.cr-ch{position:relative;flex:none;width:60px;height:60px;border-radius:10px;overflow:hidden;border:2px solid var(--accent)}
.cr-ch img{width:100%;height:100%;object-fit:cover}
.cr-ch i{position:absolute;left:3px;top:3px;font-style:normal;font-size:10px;background:var(--accent);color:#fff;border-radius:6px;padding:0 5px}
.cr-ch button{position:absolute;right:2px;top:2px;width:20px;height:20px;margin:0;padding:0;border-radius:50%;border:0;background:rgba(0,0,0,.6);color:#fff;font-size:14px;line-height:1;cursor:pointer}
.cr-srcs{margin-bottom:10px}
.cr-gals{display:flex;flex-direction:column;gap:6px}
.cr-gals button{display:flex;justify-content:space-between;align-items:center;margin:0;padding:12px 14px;border-radius:12px;background:var(--card);border:1px solid var(--border);color:var(--text);cursor:pointer;width:100%}
.cr-gals small{color:var(--muted)}
.cr-grille{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:8px}
.cr-grille button{position:relative;margin:0;padding:0;aspect-ratio:1/1;border-radius:8px;overflow:hidden;border:2px solid transparent;background:var(--card2);cursor:pointer;width:auto}
.cr-grille button.on{border-color:var(--accent)}
.cr-grille button.on::after{content:'✓';position:absolute;right:4px;top:4px;width:20px;height:20px;border-radius:50%;background:var(--accent);color:#fff;font-size:12px;display:grid;place-items:center}
.cr-grille img{width:100%;height:100%;object-fit:cover;display:block}
.cr-foot{position:sticky;bottom:calc(76px + env(safe-area-inset-bottom));margin-top:14px;z-index:5}
.cr-foot .btn-primary{width:100%;margin:0}
.cr-edit{display:grid;gap:14px}
@media(min-width:900px){.cr-edit{grid-template-columns:minmax(0,1fr) 380px;align-items:start}.cr-prev-zone{position:sticky;top:80px}}
.cr-prev{width:100%;max-height:68vh;margin:0 auto;border-radius:14px;overflow:hidden;background:repeating-conic-gradient(var(--card2) 0 25%,var(--card) 0 50%) 0 0/20px 20px;box-shadow:0 10px 30px rgba(0,0,0,.25);display:flex;justify-content:center}
.cr-prev canvas{height:100%;max-height:68vh;width:auto;max-width:100%;display:block;object-fit:contain;cursor:grab}
.cr-slides,.cr-phsel{display:flex;gap:6px;justify-content:center;margin-top:10px;flex-wrap:wrap;align-items:center}
.cr-slides button,.cr-phsel button{width:32px;height:32px;margin:0;padding:0;border-radius:50%;background:var(--card2);border:1px solid var(--border);color:var(--text-2);font:600 12px Inter,sans-serif;cursor:pointer}
.cr-slides button.on,.cr-phsel button.on{background:var(--accent);color:#fff;border-color:transparent}
.cr-phsel small,.cr-zoom small{font-size:11.5px;color:var(--muted)}
.cr-zoom{display:flex;flex-direction:column;align-items:center;gap:4px;margin-top:8px}
.cr-zoom input{width:70%;margin:0;padding:0}
.cr-panneau label{display:block}
.cr-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}
.cr-actions button{margin:0;display:inline-flex;align-items:center;justify-content:center;gap:6px}
.cr-bloc{margin:10px 0;border:1px solid var(--border);border-radius:14px;padding:10px 12px;background:var(--card)}
.cr-bloc summary{cursor:pointer;font-weight:700;color:var(--text);padding:2px 0}
.cr-bloc input[type=range]{padding:0}
.cr-ia{width:100%;margin:8px 0;display:inline-flex;align-items:center;justify-content:center;gap:6px}
.cr-2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.cr-cols{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin:8px 0}
.cr-cols label{font-size:11px;color:var(--muted);text-align:center}
.cr-cols input{height:38px;padding:2px;margin-top:4px}
.cr-drop{margin:4px 0}
.cr-sep{font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:700;margin:16px 0 6px;padding-top:12px;border-top:1px solid var(--border)}
.cr-effets{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px}
.cr-effets button{flex:none;width:68px;margin:0;padding:0;border-radius:10px;overflow:hidden;border:2px solid transparent;background:var(--card2);cursor:pointer;display:flex;flex-direction:column;align-items:center;color:var(--text)}
.cr-effets button.on{border-color:var(--accent)}
.cr-effets img{width:68px;height:68px;object-fit:cover;display:block;background:#222}
.cr-effets small{font-size:10px;padding:3px 2px;max-width:66px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.cr-eff-plus{height:90px;justify-content:center;font-size:24px;font-weight:300;border:1px dashed var(--border-2) !important}
.cr-fmtnom{text-align:center;font-size:12px;color:var(--muted);margin-top:8px}
.cr-fmts{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin:4px 0 6px}
.cr-fmts button{display:grid;grid-template-columns:30px 1fr;grid-template-rows:auto auto;column-gap:8px;align-items:center;text-align:left;margin:0;padding:8px 10px;border-radius:12px;background:var(--card2);border:1px solid var(--border);color:var(--text);cursor:pointer;width:auto}
.cr-fmts button i{grid-row:1/3;justify-self:center;border:2px solid currentColor;border-radius:3px;opacity:.6}
.cr-fmts button b{font-size:12.5px}.cr-fmts button small{font-size:10.5px;color:var(--muted);line-height:1.25}
.cr-fmts button.on{border-color:var(--accent);background:var(--card3)}
.cr-fmts button.on i{opacity:1;color:var(--accent)}
.cr-qual{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin:4px 0 8px}
.cr-qual button{display:flex;flex-direction:column;align-items:flex-start;text-align:left;margin:0;padding:9px 11px;border-radius:12px;background:var(--card2);border:1px solid var(--border);color:var(--text);cursor:pointer;width:auto}
.cr-qual button b{font-size:13px}.cr-qual button small{font-size:11px;color:var(--muted);line-height:1.3}
.cr-qual button.on{border-color:var(--accent);background:var(--card3)}
.cr-taille{margin-top:10px;padding:10px 12px;border-radius:12px;background:var(--card2);font-size:13px;color:var(--text-2)}
.cr-taille b{color:var(--text)}`;
  document.head.appendChild(st);
}
