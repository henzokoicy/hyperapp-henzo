// ============================================================
// CENTRE-AIDE.JS - Tout ce que l'app sait faire, et où le trouver
// ------------------------------------------------------------
// - Liste de toutes les fonctions de l'app, rangées par thème, avec
//   "Où le trouver" et un bouton "Y aller".
// - Recherche (sans accents, mots du quotidien : "loyer", "facture"...).
// - "L'app peut-elle... ?" : l'IA répond (oui / non / en partie) en
//   s'appuyant sur cette liste, explique comment faire et propose les
//   bons boutons.
// Ouverture : bouton "?" en haut, menu, ou caOuvrir('mot').
// ============================================================
(function(){
'use strict';
if(typeof agSheet !== 'function') return;
const E = s => agEsc(String(s == null ? '' : s));
const CA = { sec: 'tout', q: '' };
window.CA = CA;

// [id, section, titre, ce que ça fait, où, mots-clés, aller : [fonction, arguments] ou onglet]
const CA_LISTE = [
  // ---- Argent
  ['entree', 'Argent', 'Noter une entrée d\'argent', 'Un client paie : tu notes le montant, le compte (Wave, espèces...) et le client. L\'app propose ensuite de répartir l\'argent dans tes coffres.', 'Accueil > Entrée', 'paiement encaisser revenu recette client payé', ['agNewTx', ['revenu']]],
  ['depense', 'Argent', 'Noter une dépense', 'Tu notes ce que tu as payé, depuis quel compte, avec une catégorie.', 'Accueil > Dépense', 'achat payer sortie frais', ['agNewTx', ['depense']]],
  ['transfert', 'Argent', 'Transférer entre comptes et coffres', 'Déplacer de l\'argent : d\'un compte à un autre, vers un coffre ou sortir d\'un coffre.', 'Accueil > Transfert', 'virement déplacer mettre coffre retirer', ['agOpenTransfer', []]],
  ['comptes', 'Argent', 'Mes comptes et leurs soldes', 'Wave, espèces, Mobile Money, banque : chaque compte a son solde exact.', 'Argent > Comptes', 'solde wave orange money espèces banque', 'argent'],
  ['dou', 'Argent', 'D\'où vient ce montant ?', 'Sur un compte ou un coffre, l\'app raconte chaque mouvement qui donne le solde, et tu peux poser tes questions à l\'IA.', 'Argent > un compte > D\'où vient ce montant ?', 'comprendre solde explication pourquoi montant historique', 'argent'],
  ['capture', 'Argent', 'Lire une capture Wave ou Orange Money', 'Tu envoies la capture de ton historique : l\'IA la compare à l\'app et propose les mouvements oubliés.', 'Argent > un compte > D\'où vient ce montant ? > capture', 'capture écran oubli manquant vérifier wave', 'argent'],
  ['coffres', 'Argent', 'Coffres (épargne, salaire, studio)', 'Mettre de l\'argent de côté par objectif. Un coffre peut être bloqué pour ne pas y toucher.', 'Argent > Coffres', 'épargne économiser bloquer objectif tirelire', 'coffres'],
  ['repartition', 'Argent', 'Répartition d\'un paiement (50/30/20)', 'Après une entrée, l\'argent est réparti entre salaire, studio et épargne. Pour un paiement en espèces, tu choisis d\'où sort l\'argent.', 'Après une entrée', 'répartir partager 50 30 20 espèces', 'argent'],
  ['frais', 'Argent', 'Frais Wave, Orange, MTN, Moov', 'Les frais de l\'opérateur sont notés tout seuls : le compte montre ce qui est vraiment arrivé.', 'Argent > un compte > réglages', 'frais opérateur commission retrait', 'argent'],
  ['historique', 'Argent', 'Historique et sélection multiple', 'Tous les mouvements, avec filtres. Tu peux en choisir plusieurs pour les modifier, annuler ou changer de compte.', 'Argent > Historique', 'liste mouvements annuler modifier supprimer filtre', 'historique'],
  ['verifier', 'Argent', 'Vérifier mes comptes (Mode patron)', 'Tu compares l\'argent réel et l\'app ; ce qui manque est noté comme dette envers le studio.', 'Argent > Vérifier', 'contrôle manquant dette patron caisse', ['ptVerifier', []]],
  ['objectifs', 'Argent', 'Mes objectifs', 'Suivre un objectif d\'argent (matériel, projet) avec des rappels.', 'Argent > Objectifs', 'but objectif rappel', 'objectifs'],
  ['materiel', 'Argent', 'Mon matériel et son usure', 'Liste du matériel, prix, durée de vie : l\'app calcule combien mettre de côté pour le remplacer.', 'Argent > Matériel', 'amortissement appareil boîtier objectif remplacer', 'materiel'],
  // ---- Charges et budgets
  ['charges', 'Charges et budgets', 'Charges fixes (loyer, courant, internet)', 'Tes charges de chaque mois : ce qui est payé, de côté, et ce qui manque.', 'Argent > Charges du mois', 'loyer courant eau internet canal facture', ['bgOuvrirCharges', []]],
  ['avance', 'Charges et budgets', 'Avoir le loyer prêt à l\'avance', 'Objectif "prêt avant le 15" : l\'app suit tes revenus, dit combien garder par jour et par paiement, et fait un plan rapide si les clients manquent.', 'Argent > Charges du mois > une charge > Avoir cette charge prête à l\'avance', 'loyer avance objectif prêt plan rapide motivation', ['bgOuvrirCharges', []]],
  ['budget', 'Charges et budgets', 'Calculer un budget', 'Plusieurs dépenses pour un même projet (sortie, voyage, achat) : total, d\'où vient l\'argent, et "mettre de côté".', 'Argent > Calculer un budget', 'budget projet sortie voyage prévoir', ['bgOuvrir', []]],
  ['budgets', 'Charges et budgets', 'Mes budgets et l\'argent de côté', 'Voir chaque budget : combien est de côté, combien reste. Mettre de côté depuis un compte ou un coffre libre.', 'Argent > Mes budgets', 'de côté reste budget', ['bgOuvrirListe', []]],
  // ---- Faire travailler l'argent
  ['travaille', 'Faire travailler l\'argent', 'Faire travailler mon argent', 'Bilan de l\'argent qui dort, idées concrètes pour Bouaké (tirages, cadres, mini-séances, revendeur...) avec mise, gain et étapes.', 'Argent > Faire travailler mon argent', 'investir placement rentable idée gagner plus business biscuits revendeur', ['atOuvrir', ['idees']]],
  ['projets', 'Faire travailler l\'argent', 'Suivre un projet qui rapporte', 'Tu notes les ventes et dépenses d\'une idée : bénéfice, rentabilité. "Ça ne marche pas" : l\'IA trouve la cause et de meilleures solutions.', 'Argent > Faire travailler mon argent > Mes projets', 'projet bénéfice rentabilité échec diagnostic', ['atOuvrir', ['projets']]],
  ['booster', 'Faire travailler l\'argent', 'Gagner X de plus par mois', 'Tu choisis combien gagner en plus : nombre de séances, idées à mélanger et plan sur 4 semaines.', 'Argent > Faire travailler mon argent > Booster un revenu', 'augmenter revenu objectif plan', ['atOuvrir', ['booster']]],
  // ---- Clients
  ['clients', 'Clients', 'Fiches clients', 'Chaque client : séances, total payé, anniversaire, notes, score sur 100.', 'Studio > Clients', 'client fiche contact anniversaire', 'clients'],
  ['relances', 'Clients', 'Relances du jour', 'Clients à relancer : inactifs, anniversaires, fêtes, après une séance. Message prêt, envoi WhatsApp en 1 clic.', 'Studio > Clients', 'relancer whatsapp message anniversaire', 'clients'],
  ['message', 'Clients', 'Écrire un message avec l\'IA', 'À qui, pourquoi, questions de l\'IA, 3 versions, envoi WhatsApp ou programmé pour plus tard.', 'Studio > Clients > Écrire un message', 'message whatsapp texte programmer', ['msgEcrire', [{}]]],
  ['dettes', 'Clients', 'Ce qu\'un client te doit', 'Dettes, paiements en plusieurs fois, impressions sur un client.', 'Studio > Clients > fiche > Suivi', 'dette doit impayé reste à payer acompte', 'clients'],
  ['promos', 'Clients', 'Promos et bons de réduction', 'Promos ciblées, codes promo, bons automatiques.', 'Studio > Clients > Promos', 'promo réduction code bon', 'clients'],
  ['parrainage', 'Clients', 'Parrainage (ambassadeurs)', 'Un code par client, ses filleuls, paliers et bons automatiques.', 'Studio > Clients > Parrainage', 'parrain ambassadeur filleul', 'clients'],
  ['equipe', 'Clients', 'Équipe et partenaires', 'Maquilleuse, assistant, modèles : séances, paye, tâches, défis, bonus, lien personnel.', 'Studio > Clients > Équipe', 'équipe assistant maquilleuse tâche défi bonus', 'clients'],
  // ---- Séances
  ['seances', 'Séances', 'Mes séances', 'Planning des séances, paiement, charges de la séance, statut.', 'Studio > Séances', 'séance shooting rendez-vous planning', 'photo'],
  ['checklist', 'Séances', 'Checklist avant séance', 'Les étapes à ne pas oublier avant chaque séance (modèle réglable).', 'Studio > Séances > Checklist', 'checklist étapes avant séance', 'photo'],
  ['resa', 'Séances', 'Demandes de réservation', 'Les clients réservent depuis ta page : tu acceptes, proposes une autre date, négocies.', 'Studio > Séances > Réservations', 'réservation demande page réserver', 'photo'],
  // ---- Tarifs
  ['tarifs', 'Tarifs et devis', 'Grille de tarifs', 'Collections par type de séance, packs, options, acompte, conditions, pack vedette.', 'Studio > Tarifs', 'prix pack tarif collection', 'tarifs'],
  ['devis', 'Tarifs et devis', 'Faire un devis', 'Calculer un devis, l\'envoyer sur WhatsApp, suivre accepté / refusé.', 'Studio > Tarifs > Devis', 'devis facture prix client', 'tarifs'],
  ['page', 'Tarifs et devis', 'Page publique de tarifs et PDF', 'Un lien de tes tarifs à envoyer, et le PDF par collection.', 'Studio > Tarifs > Page publique', 'lien pdf catalogue site', 'tarifs'],
  ['nego', 'Tarifs et devis', 'Négocier avec un client', 'Analyse du budget du client, messages prêts, simulation de discussion.', 'Coach > Négocier', 'négocier budget trop cher réduction', 'ia'],
  // ---- Marketing
  ['marketing', 'Marketing', 'Agent marketing', 'Quoi publier aujourd\'hui, plan de la semaine, résultats des posts.', 'Studio > Marketing', 'publier facebook instagram tiktok post statut', 'marketing'],
  ['publication', 'Marketing', 'Créer une publication', 'Séance, photos, textes par réseau, titre sur l\'image, plan de diffusion.', 'Studio > Marketing > Créer une publication', 'publication légende hashtag texte', 'marketing'],
  ['marque', 'Marketing', 'Ma marque', 'Nom, slogan, ton, hashtags, police, couleurs, logo, utilisés partout.', 'Studio > Marketing > Ma marque', 'marque logo couleur police slogan', ['stMarqueOuvrir', []]],
  ['mood', 'Marketing', 'Moodboards', 'Images d\'idées par séance (Pinterest, galerie), notes, plan de séance par l\'IA, collage à envoyer.', 'Studio > Moodboard', 'idée pinterest inspiration collage pose', 'mood'],
  // ---- Créations
  ['visuels', 'Créations', 'Affiches et visuels', 'Affiches promo, stories, mosaïques, cadres, citations, avant / après, carrousels.', 'Studio > Créations', 'affiche flyer story visuel carrousel', 'creations'],
  ['videos', 'Créations', 'Vidéos et GIF avec tes photos', 'Diaporamas, rythmés, polaroids, pellicule... export MP4 ou GIF.', 'Studio > Créations > Vidéo', 'vidéo gif diaporama reel', 'creations'],
  ['montage', 'Créations', 'Table de montage', 'Chaque photo ou vidéo est un plan : durée, ordre, couper, mouvements, 32 transitions, cadrage, écran partagé.', 'Studio > Créations > une vidéo > Montage', 'montage timeline couper transition plan', 'creations'],
  ['rythme', 'Créations', 'Monter au rythme de la musique', 'Couper sur les temps, les mesures, les temps forts ou tes propres repères tapés en écoutant.', 'Studio > Créations > Montage > Rythme des coupes', 'rythme beat temps musique coupe', 'creations'],
  ['musique', 'Créations', 'Musiques et bruitages libres de droits', 'Bibliothèque en ligne avec la licence de chaque son, et contrôle des droits pour TikTok, Instagram, Facebook, WhatsApp.', 'Studio > Créations > Musique > Bibliothèque', 'musique son droits copyright tiktok libre', 'creations'],
  ['rushs', 'Créations', 'Vidéos filmées (rushs)', 'Ajouter tes vidéos : passage, ralenti, accéléré, image figée, rampe de vitesse.', 'Studio > Créations > Montage', 'rush vidéo ralenti vitesse', 'creations'],
  ['brouillons', 'Créations', 'Brouillons en ligne', 'Ton montage est gardé tout seul, sur l\'appareil et en ligne : tu reprends sur un autre téléphone.', 'Studio > Créations > Mes brouillons', 'brouillon sauvegarde reprendre', 'creations'],
  // ---- Galerie
  ['galerie', 'Galerie', 'Galerie clients', 'Livrer les photos aux clients, voir leurs choix, directement dans l\'app.', 'Studio > Galerie', 'livraison photos client galerie lien', 'galerie'],
  // ---- Idées, notes, préparation
  ['notes', 'Idées et organisation', 'Notes et rappels', 'Notes, à faire, rappels sur le téléphone même app fermée.', 'Idées > Notes', 'note rappel à faire tâche', 'notes'],
  ['preparer', 'Idées et organisation', 'Préparer un voyage, un événement, une séance', 'Liste de ce qu\'il faut prendre avec les quantités, rappels avant le départ, "As-tu pris ?", score et conseils, bilan après.', 'Idées > Préparer', 'préparer voyage valise oublier checklist bagage événement mariage', ['prNouvelle', []]],
  ['kits', 'Idées et organisation', 'Mes kits (ex : Mini PC)', 'Un ensemble réutilisable (Mini PC + chargeur + souris + câble...) à ajouter en un geste dans une préparation.', 'Idées > Préparer > Mes kits', 'kit ensemble matériel accessoires', ['prKits', []]],
  ['business', 'Idées et organisation', 'Idées business et inspiration', 'Idées gardées, inspirations, motivation.', 'Idées > Business', 'idée business inspiration motivation', 'business'],
  ['voix', 'Idées et organisation', 'Dictée vocale et phrases toutes prêtes', 'Le bouton micro dans les champs, et tes phrases à insérer avec "/".', 'Dans les champs de texte', 'dicter voix micro phrase raccourci', ['vxOuvrirPhrases', []]],
  ['recherche', 'Idées et organisation', 'Recherche dans toute l\'app', 'Retrouver un client, une séance, un mouvement.', 'Loupe en haut', 'chercher trouver recherche', ['ouvrirRechercheGlobale', []]],
  // ---- Coach
  ['coach', 'Coach', 'Coach du jour et plans d\'action', 'Le coach repère les problèmes et propose un plan de 3 à 6 étapes qu\'il suit avec toi.', 'Coach', 'coach conseil plan problème', 'ia'],
  ['ecole', 'Coach', 'École de la vente', 'Leçons courtes et exercices notés par l\'IA.', 'Coach > École de la vente', 'vente apprendre leçon', 'ia'],
  ['bilan', 'Coach', 'Bilan du mois', 'Argent, séances, clients, publications du mois, avec conseils et PDF.', 'Accueil > Mon bilan', 'bilan mois résumé rapport pdf', 'dash'],
  // ---- Réglages
  ['donnees', 'Réglages et données', 'Sauvegarder mes données', 'Sauvegarde, import, sauvegarde automatique en ligne. Rien n\'est perdu.', 'Menu > Mes données', 'sauvegarde backup exporter importer restaurer', ['otOpenData', []]],
  ['notifs', 'Réglages et données', 'Notifications', 'Choisir les rappels qui arrivent sur le téléphone.', 'Menu > Notifications', 'notification alerte rappel', ['otNotifs', []]],
  ['theme', 'Réglages et données', 'Thème et couleurs', 'Changer les couleurs et l\'effet de l\'app.', 'Menu > Thème', 'couleur thème sombre clair', ['agOpenThemes', []]],
  ['retour', 'Réglages et données', 'Bouton retour du téléphone', 'Le bouton retour ferme la fenêtre ouverte ou revient à la page d\'avant. Il faut appuyer 2 fois pour quitter.', 'Partout', 'retour quitter fermer', 'dash'],
  ['installer', 'Réglages et données', 'Installer l\'app sur le téléphone', 'L\'app s\'installe comme une vraie app (écran d\'accueil).', 'Menu > Installer', 'installer écran accueil application', 'dash']
];
const CA_ITEMS = CA_LISTE.map(([id, s, t, q, ou, m, go]) => ({ id, s, t, q, ou, m, go }));
window.CA_ITEMS = CA_ITEMS;
const CA_SECTIONS = [...new Set(CA_ITEMS.map(x => x.s))];
const CA_NOUVEAU = ['avance', 'travaille', 'projets', 'preparer', 'kits', 'dou', 'capture', 'rythme', 'musique'];

// ---------- Recherche ----------
const caNorm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const CA_VIDES = new Set('le la les de du des un une pour avec et a au aux l d mon ma mes est peut faire comment app est-ce que qui quoi ou je j tu il en sur dans ce cette ces se si y on peux veux'.split(' '));
function caChercher(q){
  const mots = caNorm(q).split(/[^a-z0-9]+/).filter(w => w.length > 1 && !CA_VIDES.has(w));
  if(!mots.length) return CA_ITEMS.slice();
  return CA_ITEMS.map(x => {
    const t = caNorm(x.t), m = caNorm(x.m), d = caNorm(x.q + ' ' + x.ou);
    let sc = 0;
    mots.forEach(w => { const r = w.length > 4 ? w.slice(0, w.length - 1) : w; if(t.includes(r)) sc += 3; if(m.includes(r)) sc += 2; if(d.includes(r)) sc += 1; });
    return { x, sc };
  }).filter(o => o.sc > 0).sort((a, b) => b.sc - a.sc).map(o => o.x);
}
window.caChercher = caChercher;

// ---------- La fenêtre ----------
window.caOuvrir = function(q){
  CA.q = q || ''; CA.sec = 'tout';
  agSheet('caSheet', `<h3>Centre d'aide</h3>
    <div class="ca-ask"><b>${agIcon('sparkles', 15)} L'app peut-elle... ?</b>
      <div class="ap-ask"><input id="caQIA" placeholder="Ex : l'app peut-elle me rappeler de prendre mes batteries ?" onkeydown="if(event.key==='Enter')caDemander()"><button class="btn-primary" id="caQBtn" onclick="caDemander()">Demander</button></div>
      <div id="caRep"></div></div>
    <div class="ca-search">${agIcon('search', 16)}<input id="caQ" placeholder="Chercher une fonction : loyer, devis, musique..." value="${E(CA.q)}" oninput="CA.q=this.value;caListe()"></div>
    <div class="ag-pills ca-secs">${['tout'].concat(CA_SECTIONS).map(s => `<button type="button" data-s="${E(s)}" class="${s === 'tout' ? 'on' : ''}" onclick="caSection(this)">${s === 'tout' ? 'Tout' : E(s)}</button>`).join('')}</div>
    <div id="caList"></div>`);
  caListe();
};
window.caSection = function(b){ CA.sec = b.dataset.s; document.querySelectorAll('#caSheet .ca-secs button').forEach(x => x.classList.toggle('on', x === b)); caListe(); };
function caCarte(x){
  return `<div class="ca-it" data-id="${x.id}"><div class="d"><b>${E(x.t)}${CA_NOUVEAU.includes(x.id) ? ' <span class="ca-new">Nouveau</span>' : ''}</b><p>${E(x.q)}</p><small>${agIcon('link', 12)} ${E(x.ou)}</small></div>
    <button type="button" onclick="caAller('${x.id}')">Y aller</button></div>`;
}
window.caListe = function(){
  const el = document.getElementById('caList'); if(!el) return;
  let L = caChercher(CA.q);
  if(CA.sec !== 'tout') L = L.filter(x => x.s === CA.sec);
  if(!L.length){ el.innerHTML = `<div class="ag-empty">Rien trouvé pour "${E(CA.q)}". Pose la question à l'IA juste au-dessus.</div>`; return; }
  if(CA.q.trim() || CA.sec !== 'tout'){ el.innerHTML = `<div class="ca-n">${L.length} résultat${L.length > 1 ? 's' : ''}</div>` + L.map(caCarte).join(''); return; }
  const nv = CA_ITEMS.filter(x => CA_NOUVEAU.includes(x.id));
  el.innerHTML = `<div class="ca-sec">Nouveautés</div>${nv.map(caCarte).join('')}` + CA_SECTIONS.map(s => `<div class="ca-sec">${E(s)}</div>${L.filter(x => x.s === s).map(caCarte).join('')}`).join('');
};
window.caAller = function(id){
  const x = CA_ITEMS.find(i => i.id === id); if(!x) return;
  agCloseSheet('caSheet');
  try {
    if(Array.isArray(x.go) && typeof window[x.go[0]] === 'function'){ window[x.go[0]].apply(null, x.go[1] || []); return; }
    const tab = Array.isArray(x.go) ? null : x.go;
    if(tab && document.getElementById('page-' + tab)) agGoTab(tab);
    else agToast('Où le trouver : ' + x.ou, 'info');
  } catch(e){ agToast('Où le trouver : ' + x.ou, 'info'); }
};

// ---------- "L'app peut-elle... ?" ----------
window.caDemander = async function(q){
  const inp = document.getElementById('caQIA'); q = String(q || (inp ? inp.value : '')).trim(); if(!q) return;
  const el = document.getElementById('caRep'), b = document.getElementById('caQBtn');
  if(el) el.innerHTML = '<div class="ag-empty">Je regarde ce que l\'app sait faire...</div>'; if(b) b.disabled = true;
  const proches = caChercher(q).slice(0, 4);
  const cat = CA_ITEMS.map(x => `${x.id} | ${x.t} | où : ${x.ou} | ${x.q}`).join('\n');
  const sys = `Tu es le centre d'aide de la Super App de Henzo (photographe à Bouaké). Tu réponds en français simple, sans jargon, tirets simples. Tu t'appuies UNIQUEMENT sur la liste des fonctions fournie. Commence par "Oui", "Non" ou "En partie". Puis explique en 2 à 5 lignes comment faire (où cliquer). Si l'app ne sait pas le faire, dis-le franchement et propose ce qui s'en rapproche le plus, et ajoute qu'il peut demander cette fonction. Termine par une ligne exacte "OUVRIR: id1, id2" avec au plus 3 identifiants de la liste utiles (ou "OUVRIR:" si aucun).`;
  try {
    const r = await mkAI({ system: sys, messages: [{ role: 'user', text: `FONCTIONS DE L'APP (id | titre | où | ce que ça fait) :\n${cat}\n\nQUESTION : ${q}` }], maxTokens: 700 });
    let t = String(typeof txtDefancy === 'function' ? txtDefancy(r.text || '') : (r.text || '')).replace(/[–—]/g, '-');
    let ids = [];
    const m = t.match(/OUVRIR\s*:\s*([^\n]*)/i);
    if(m){ ids = m[1].split(/[,\s]+/).map(s => s.trim()).filter(id => CA_ITEMS.some(x => x.id === id)).slice(0, 3); t = t.replace(m[0], '').trim(); }
    const rep = /^\s*\**\s*(oui|non|en partie)/i.exec(t), cls = rep ? caNorm(rep[1]).replace(' ', '') : '';
    if(el) el.innerHTML = `<div class="ca-rep ${cls}"><div>${E(t).replace(/\*\*/g, '').replace(/\n/g, '<br>')}</div>${ids.length ? `<div class="ca-go">${ids.map(id => { const x = CA_ITEMS.find(i => i.id === id); return `<button type="button" onclick="caAller('${id}')">${E(x.t)}</button>`; }).join('')}</div>` : ''}</div>`;
  } catch(e){
    if(el) el.innerHTML = `<div class="ag-hint warn">L'IA n'a pas pu répondre (${E(e.message || e)}). ${proches.length ? 'Voici ce qui s\'en rapproche :' : ''}</div>${proches.map(caCarte).join('')}`;
  }
  if(b) b.disabled = false;
};

// ---------- Les entrées : bouton "?" en haut, menus ----------
function caBoutons(){
  const s = document.querySelector('button.header-icon-btn[onclick*="ouvrirRechercheGlobale"]');
  if(s && !document.getElementById('caHdr')){
    const b = document.createElement('button'); b.id = 'caHdr'; b.className = 'header-icon-btn'; b.type = 'button';
    b.title = 'Centre d\'aide'; b.setAttribute('aria-label', 'Centre d\'aide'); b.innerHTML = agIcon('info', 19);
    b.onclick = () => caOuvrir(); s.parentNode.insertBefore(b, s);
  }
  const foot = document.querySelector('#agSide .ag-side-foot');
  if(foot && !foot.querySelector('.ca-side')){
    const b = document.createElement('button'); b.className = 'ag-side-it ca-side';
    b.innerHTML = `<span class="si">${agIcon('info', 18)}</span><span class="sl">Centre d'aide</span>`; b.onclick = () => caOuvrir();
    foot.insertBefore(b, foot.firstChild);
  }
  const th = document.querySelector('.drawer-nav.ag-theme-btn');
  if(th && !document.querySelector('.drawer-nav.ca-drawer')){
    const b = document.createElement('button'); b.className = 'drawer-nav ca-drawer';
    b.innerHTML = `<span class="nav-icon">${agIcon('info', 16)}</span><span>Centre d'aide</span>`;
    b.onclick = () => { if(typeof closeDrawer === 'function') closeDrawer(); caOuvrir(); };
    th.parentElement.insertBefore(b, th);
  }
}
window.caBoutons = caBoutons;
caBoutons(); setTimeout(caBoutons, 1500); setTimeout(caBoutons, 4000);

(function caCss(){
  if(document.getElementById('caCss')) return;
  const st = document.createElement('style'); st.id = 'caCss';
  st.textContent = `
.ca-ask{padding:12px;border-radius:14px;background:var(--card2);border:1px solid var(--border)}.ca-ask>b{display:flex;align-items:center;gap:6px;color:var(--text);font-size:14px}.ca-ask>b svg{color:var(--accent)}
.ca-ask .ap-ask{margin-top:8px}
.ca-rep{margin-top:10px;padding:10px 12px;border-radius:12px;background:var(--card);font-size:13.5px;line-height:1.5;color:var(--text);border-left:3px solid var(--accent)}
.ca-rep.oui{border-left-color:#34c759}.ca-rep.non{border-left-color:#ff453a}.ca-rep.enpartie{border-left-color:#f5a524}
.ca-go{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.ca-go button{width:auto!important;margin:0;padding:7px 12px;border-radius:99px;border:1px solid var(--accent);background:transparent;color:var(--accent);font-size:12.5px;font-weight:600;cursor:pointer}
.ca-search{display:flex;align-items:center;gap:8px;margin:14px 0 8px;padding:0 12px;border-radius:12px;background:var(--card2);border:1px solid var(--border);color:var(--muted)}
.ca-search input{flex:1;border:0!important;background:transparent!important;margin:0!important;padding:12px 0!important;box-shadow:none!important}
.ca-secs{margin-bottom:6px}
.ca-sec{margin:16px 0 6px;font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}.ca-n{font-size:12px;color:var(--muted);margin:8px 0}
.ca-it{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:var(--card2);margin:6px 0}
.ca-it .d{flex:1;min-width:0}.ca-it b{display:block;color:var(--text);font-size:13.5px}.ca-it p{margin:3px 0;color:var(--muted);font-size:12.5px;line-height:1.4}
.ca-it small{display:flex;align-items:center;gap:4px;color:var(--accent);font-size:11.5px}
.ca-it>button{flex:0 0 auto;width:auto!important;margin:0;padding:8px 12px;border-radius:10px;border:1px solid var(--border);background:var(--card);color:var(--text);font-size:12.5px;cursor:pointer}
.ca-new{display:inline-block;margin-left:4px;padding:1px 7px;border-radius:99px;background:var(--accent);color:#fff;font-size:10px;font-weight:700;vertical-align:middle}`;
  document.head.appendChild(st);
})();
})();
