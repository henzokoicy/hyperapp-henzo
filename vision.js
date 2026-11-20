// ============================================================
// VISION.JS - La vision Henzo Studio : une seule source pour toute l'app
// ------------------------------------------------------------
// Mission, objectifs, offres, principes, règles absolues, idées de croissance
// et chiffres suivis. Toutes les IA de l'app (coach, assistant business,
// marketing, textes, messages) la reçoivent avant chaque demande, donc elles
// travaillent pour le même but. Gardée sur l'appareil et dans le compte
// (user_preferences.vision). Les autres fonctions lisent window.VISION_HENZO().
// ============================================================
(function(){
'use strict';
const CLE = 'hz_vision';
const DEFAUT = {
  actif: true,
  mission: "Faire grandir Henzo Studio, studio de photographie et vidéographie basé à Bouaké puis Abidjan : des images élégantes et pleines d'émotion, à un prix juste, avec une vraie rigueur professionnelle.",
  objectifs: "Plus de séances par mois\nGagner plus par séance (packs, options, albums, tirages)\nAvoir un vrai studio à moi\nMonter une équipe",
  offres: "Portrait studio\nBeauté\nCouple\nAnniversaire d'enfants\nMaternité\nFamille\nMariage\nÉvénementiel et entreprises (portraits pros)",
  principes: "Élégance sans froideur\nAccessible mais qualitatif\nÉmotion et souvenirs de famille\nRigueur et transparence",
  regles: "Ne jamais brader mes prix\nToujours un contrat signé et un acompte avant une séance\nUne seule relance polie par client, puis attendre\nJamais de mots refusés ni de ton familier : ton pro et élégant (voir Mon contexte)",
  promos: "Une promo n'est possible que pour un grand événement populaire (fêtes, rentrée, etc.), limitée dans le temps, sur une offre précise, sans jamais baisser le tarif de base.",
  idees: "Forfait famille à l'année et parrainage\nAlbums, tirages et cadres proposés dans chaque devis\nMini-séances thématiques pour les jours creux\nPartenariats (écoles, églises, organisateurs de mariage, boutiques) et portraits pros pour entreprises",
  mesures: "Nombre de séances par mois\nChiffre d'affaires du mois\nGain moyen par client\nClients qui reviennent\nTaux de devis acceptés\nDélai de réponse à une demande\nRecommandations et avis reçus",
  zone: "Bouaké d'abord, puis Abidjan.",
  comportement: "Proposer un seul prochain pas clair à la fois, avec la raison en une phrase."
};
const CHAMPS = [
  ['mission', 'Ma mission', 'Une ou deux phrases : pourquoi Henzo Studio existe et où il va.', false],
  ['objectifs', 'Mes objectifs à 12 mois', 'Un par ligne.', true],
  ['offres', 'Séances à pousser en priorité', 'Un par ligne.', true],
  ['principes', 'Mes principes', 'Ce qui guide toutes les propositions et descriptions. Un par ligne.', true],
  ['regles', 'Mes règles absolues', 'Ce que l\'app ne doit jamais contourner. Un par ligne.', true],
  ['promos', 'Mes promos exceptionnelles', 'Quand une promo est permise.', false],
  ['idees', 'Mes idées de croissance', 'Ce que l\'app peut proposer pour grandir. Un par ligne.', true],
  ['mesures', 'Les chiffres que je suis', 'Un par ligne.', true],
  ['zone', 'Ma zone', 'Où concentrer les efforts.', false],
  ['comportement', 'Comment l\'app me propose les choses', 'Sa façon de me conseiller.', false]
];
let V = null, timer = null;
const esc = s => (typeof agEsc === 'function' ? agEsc(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));

function lire(){
  if(V) return V;
  let l = null; try { l = JSON.parse(localStorage.getItem(CLE) || 'null'); } catch(e){}
  V = Object.assign({}, DEFAUT, l && typeof l === 'object' ? l : {});
  return V;
}
function garder(){ try { localStorage.setItem(CLE, JSON.stringify(V)); } catch(e){} }
function envoyer(){
  clearTimeout(timer);
  timer = setTimeout(() => { if(typeof crmSavePrefs === 'function') crmSavePrefs({ vision: V }).catch(() => {}); }, 1200);
}
async function chargerCompte(){
  try {
    if(localStorage.getItem(CLE) || typeof sb === 'undefined') return;
    const { data: u } = await sb.auth.getUser(); if(!u || !u.user) return;
    const { data } = await sb.from('user_settings').select('user_preferences').eq('user_id', u.user.id).maybeSingle();
    const v = data && data.user_preferences && data.user_preferences.vision;
    if(v && typeof v === 'object'){ V = Object.assign({}, DEFAUT, v); garder(); }
  } catch(e){}
}
const lignes = t => String(t || '').split('\n').map(x => x.trim()).filter(Boolean);

// Le texte donné à toutes les IA
window.VISION_HENZO = function(){ return lire(); };
window.visionPourIA = function(){
  const v = lire(); if(!v.actif) return '';
  const l = (titre, t) => lignes(t).length ? `${titre} :\n${lignes(t).map(x => '- ' + x).join('\n')}` : '';
  return ['VISION DE HENZO STUDIO (à respecter dans toute proposition, description, message ou conseil, sans la recopier) :',
    v.mission && 'Mission : ' + v.mission,
    l('Objectifs à 12 mois', v.objectifs), l('Séances à pousser', v.offres), l('Principes', v.principes),
    l('Règles absolues', v.regles), v.promos && 'Promos : ' + v.promos, l('Idées de croissance', v.idees),
    l('Chiffres suivis', v.mesures), v.zone && 'Zone : ' + v.zone, v.comportement && 'Façon de conseiller : ' + v.comportement,
    'Ton : professionnel et élégant, chaleureux sans familiarité. Français clair.'].filter(Boolean).join('\n');
};

window.visionOuvrir = function(){
  if(typeof agSheet !== 'function') return;
  const v = lire();
  agSheet('hzVision', `
    <h3>Vision Henzo Studio</h3>
    <div class="ag-hint" style="margin-top:0">Une seule vision pour toute l'app. Le coach, l'assistant business, le marketing et tous les textes la lisent avant de répondre, pour travailler vers le même but : faire grandir l'entreprise.</div>
    <label class="ag-check" style="margin:12px 0"><input type="checkbox" ${v.actif ? 'checked' : ''} onchange="visionSet('actif', this.checked)"> Les IA utilisent cette vision</label>
    ${CHAMPS.map(([k, t, aide, multi]) => `<div class="ag-app-sec">${t}</div><textarea id="hzv_${k}" rows="${multi ? 4 : 3}" oninput="visionSet('${k}', this.value)" style="width:100%">${esc(v[k])}</textarea><div class="ag-hint">${aide}</div>`).join('')}
    <button class="btn-ghost" style="margin-top:14px" onclick="visionReset()">Remettre la vision d'origine</button>
  `);
};
window.visionSet = function(k, val){ lire()[k] = val; garder(); envoyer(); };
window.visionReset = async function(){
  if(typeof agConfirm === 'function' && !(await agConfirm("Remettre la vision d'origine ? Tes modifications seront perdues."))) return;
  V = Object.assign({}, DEFAUT); garder(); envoyer(); window.visionOuvrir();
};

// Boutons de menu (menu du compte, menu latéral mobile, barre latérale ordinateur)
function boutons(){
  const ic = (typeof agIcon === 'function') ? agIcon('target', 16) : '';
  const um = document.querySelector('.user-menu-items');
  if(um && !um.querySelector('.hz-vision-btn')){
    const b = document.createElement('button'); b.className = 'hz-vision-btn';
    b.innerHTML = `<span class="icon">${ic}</span><span>Vision Henzo Studio</span>`;
    b.onclick = () => { if(typeof closeUserMenu === 'function') closeUserMenu(); visionOuvrir(); };
    um.insertBefore(b, um.firstChild);
  }
  const dr = document.querySelector('.drawer-section .drawer-nav[onclick*="preferences"]');
  if(dr && !document.querySelector('.drawer-nav.hz-vision-btn')){
    const b = document.createElement('button'); b.className = 'drawer-nav hz-vision-btn';
    b.innerHTML = `<span class="nav-icon">${ic}</span><span>Vision Henzo Studio</span>`;
    b.onclick = () => { if(typeof closeDrawer === 'function') closeDrawer(); visionOuvrir(); };
    dr.parentElement.insertBefore(b, dr);
  }
  const foot = document.querySelector('#agSide .ag-side-foot');
  if(foot && !foot.querySelector('.hz-vision-btn')){
    const b = document.createElement('button'); b.className = 'ag-side-it hz-vision-btn';
    b.innerHTML = `<span class="si">${(typeof agIcon === 'function') ? agIcon('target', 18) : ''}</span><span class="sl">Vision</span>`;
    b.onclick = visionOuvrir; foot.insertBefore(b, foot.firstChild);
  }
}
let essais = 0; const t = setInterval(() => { boutons(); if(++essais > 40) clearInterval(t); }, 500);
setTimeout(chargerCompte, 4000);
})();
