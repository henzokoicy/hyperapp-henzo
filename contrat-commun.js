// ============================================================
// CONTRAT-COMMUN.JS - Le texte d'un contrat (app + page client)
// ------------------------------------------------------------
// ctArticles(modele, d) : les articles du contrat, remplis avec les
//   données d (client, date, lieu, prix, acompte, livrables...).
// ctDocHtml(c) : le contrat complet, prêt à lire, imprimer ou signer.
// Utilisé par contrats.js (dans l'app) et contrat.html (le client lit
// et signe avec un lien secret).
// ============================================================
(function(){
'use strict';
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function N(n){ return new Intl.NumberFormat('fr-FR').format(Math.round(Number(n) || 0)).replace(/[  ]/g, ' '); }
function F(n){ return N(n) + ' F CFA'; }
function dateFr(iso){ if(!iso) return '[date à préciser]'; var d = new Date(String(iso).slice(0, 10) + 'T12:00:00'); return isNaN(d) ? iso : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
window.ctEsc = esc; window.ctF = F; window.ctDateFr = dateFr;

var MODELES = {
  seance: { nom: 'Séance photo', prestation: 'une séance photo' },
  mariage: { nom: 'Mariage, dot ou cérémonie', prestation: 'la couverture photo et vidéo d\'une cérémonie' },
  evenement: { nom: 'Anniversaire ou événement', prestation: 'la couverture photo d\'un événement' },
  video: { nom: 'Projet vidéo ou prestation pour une entreprise', prestation: 'une prestation photo et vidéo' },
  collab: { nom: 'Collaboration (modèle, maquilleuse, assistant)', prestation: 'une collaboration sur une séance photo' }
};
window.CT_MODELES = MODELES;

// d : studio, studio_adresse, studio_tel, client, client_tel, client_adresse, prestation, date, heure, heure_fin, lieu,
//     prix, acompte_pct, livrables[], delai, galerie, report_h, acompte_remb, retard_min, heure_sup, image_ok, deplacement,
//     remuneration, particulieres
window.ctArticles = function(modele, d){
  d = d || {};
  var studio = d.studio || 'Henzo Photographie', client = d.client || '[nom du client]';
  var prix = Math.round(Number(d.prix) || 0), pct = Math.max(0, Math.min(100, Number(d.acompte_pct) || 0));
  var acompte = Math.round(prix * pct / 100), reste = prix - acompte;
  var A = [];
  var collab = modele === 'collab';
  A.push({ t: 'Les parties', x: 'Entre ' + studio + (d.studio_adresse ? ', ' + d.studio_adresse : '') + (d.studio_tel ? ', tél. ' + d.studio_tel : '') + ', appelé « le Studio »,\net ' + client + (d.client_tel ? ', tél. ' + d.client_tel : '') + (d.client_adresse ? ', ' + d.client_adresse : '') + ', appelé « ' + (collab ? 'le Collaborateur' : 'le Client') + ' ».' });
  A.push({ t: 'Ce que couvre ce contrat', x: 'Ce contrat fixe les conditions dans lesquelles le Studio réalise ' + (d.prestation || (MODELES[modele] || MODELES.seance).prestation) + (collab ? ' avec le Collaborateur.' : ' pour le Client.') });
  A.push({ t: 'Date, heure et lieu', x: 'Le ' + dateFr(d.date) + (d.heure ? ', à partir de ' + d.heure : '') + (d.heure_fin ? ' jusqu\'à ' + d.heure_fin : '') + ', à ' + (d.lieu || '[lieu à préciser]') + '.' + (d.deplacement ? '\nFrais de déplacement : ' + d.deplacement + '.' : '') });
  if(collab){
    A.push({ t: 'Rôle et rémunération', x: (d.remuneration ? 'Le Collaborateur reçoit : ' + d.remuneration + '.' : 'La collaboration est sans paiement : chacun peut utiliser les photos comme prévu ci-dessous.') + '\nLe Collaborateur arrive à l\'heure prévue, prêt, et prévient au moins 24 heures à l\'avance en cas d\'empêchement.' });
    A.push({ t: 'Utilisation des photos', x: 'Le Studio garde ses droits d\'auteur sur les photos. Le Collaborateur peut les publier sur ses réseaux et son portfolio en citant le Studio. Toute utilisation pour vendre un produit ou une publicité payante demande l\'accord écrit des deux parties.' });
  } else {
    var L = (d.livrables || []).filter(function(x){ return String(x || '').trim(); });
    A.push({ t: 'Ce qui est compris', x: L.length ? L.map(function(x){ return '- ' + x; }).join('\n') : '[Liste de ce qui est compris : nombre de photos retouchées, vidéo, tirages, album...]' });
    A.push({ t: 'Prix et paiement', x: 'Prix total : ' + F(prix) + '.' +
      (pct ? '\nAcompte : ' + pct + ' % soit ' + F(acompte) + ', à payer pour réserver la date. Le rendez-vous est confirmé seulement après réception de l\'acompte. Sans acompte, la date n\'est pas bloquée et peut être donnée à un autre client.\nLe reste, soit ' + F(reste) + ', est payé ' + (d.reste_quand || 'le jour de la prestation, avant la livraison des photos') + '.' : '\nLe paiement est fait ' + (d.reste_quand || 'le jour de la prestation') + '.') +
      '\nMoyen de paiement recommandé : Wave (lien de paiement envoyé par le Studio). Autres moyens possibles sur accord. Un reçu est envoyé pour chaque paiement.' });
    A.push({ t: 'Annulation et report', x: 'Report : possible une fois sans frais si le Client prévient au moins ' + (Number(d.report_h) || 72) + ' heures à l\'avance, selon les disponibilités du Studio.\n' +
      'Annulation par le Client : ' + (d.acompte_remb ? 'l\'acompte est remboursé si l\'annulation est faite au moins ' + (Number(d.report_h) || 72) + ' heures à l\'avance ; après, il est gardé par le Studio.' : 'l\'acompte n\'est pas remboursé, car la date a été bloquée pour lui et refusée à d\'autres clients.') + '\n' +
      'Annulation par le Studio (maladie, accident...) : le Studio propose une nouvelle date ou rembourse tout ce qui a été payé.' });
    A.push({ t: 'Ponctualité', x: 'En cas de retard du Client de plus de ' + (Number(d.retard_min) || 30) + ' minutes, la prestation peut être raccourcie d\'autant, sans baisse du prix.' + (d.heure_sup ? '\nHeure supplémentaire demandée sur place : ' + d.heure_sup + '.' : '') });
    A.push({ t: 'Livraison', x: 'Les photos sont livrées ' + (d.delai ? 'dans un délai de ' + d.delai : 'dans le délai annoncé') + ' après la prestation' + (d.galerie !== false ? ', dans une galerie en ligne privée (lien et code envoyés au Client)' : '') + '. Le Studio choisit et retouche les meilleures photos ; les fichiers bruts (non retouchés) ne sont pas remis. La galerie reste disponible pendant la durée indiquée : le Client pense à télécharger ses photos.' });
    A.push({ t: 'Droits sur les photos', x: 'Le Studio est l\'auteur des photos et garde ses droits d\'auteur. Le Client peut les utiliser pour lui-même : les garder, les imprimer, les partager avec ses proches et sur ses réseaux (une mention du Studio est appréciée). Toute utilisation commerciale (publicité, vente) demande l\'accord écrit du Studio.' });
    A.push({ t: 'Utilisation par le Studio (droit à l\'image)', x: d.image_ok === false ? 'Le Client N\'AUTORISE PAS le Studio à publier les photos où il apparaît. Le Studio les garde pour lui seulement.' : 'Le Client autorise le Studio à montrer quelques photos dans son portfolio et sur ses réseaux. Le Client peut demander à tout moment le retrait d\'une photo, le Studio la retire dans un délai raisonnable.' });
    A.push({ t: 'Imprévus', x: 'En cas de panne de matériel, le Studio utilise son matériel de secours. En cas d\'événement grave qui empêche la prestation (météo très dangereuse, troubles, deuil...), les deux parties choisissent ensemble une nouvelle date. Si des fichiers sont perdus par la faute du Studio, sa responsabilité est limitée au remboursement de la prestation.' });
  }
  if(modele === 'mariage') A.push({ t: 'Le jour J', x: 'Le Client donne au Studio, au moins 7 jours avant : le programme de la journée, la liste des photos de groupe souhaitées et le numéro d\'une personne à contacter sur place. L\'équipe du Studio a accès aux lieux et reçoit à boire et à manger pendant les longues journées.' });
  if(modele === 'video') A.push({ t: 'Validation', x: 'Le Client donne ses retours sur la première version dans les 7 jours. Deux séries de petites modifications sont comprises ; les suivantes, ou un changement d\'idée complet, sont facturées en plus après accord.' });
  if(String(d.particulieres || '').trim()) A.push({ t: 'Conditions particulières', x: String(d.particulieres).trim() });
  A.push({ t: 'Accord', x: 'En signant, les deux parties disent avoir lu et accepté ce contrat. ' + (d.ville ? 'Fait à ' + d.ville : 'Fait') + ', en deux exemplaires (un pour chacun, ou en version signée en ligne).' });
  return A;
};

// c : { titre, donnees, articles, signature_studio, signature_client, signe_le, marque, adresse, phone }
window.ctDocHtml = function(c){
  var d = c.donnees || {}, A = Array.isArray(c.articles) && c.articles.length ? c.articles : ctArticles(d.modele, d);
  var sig = function(s, qui){
    return '<div class="ct-sig"><small>' + qui + '</small>' + (s && s.image ? '<img src="' + esc(s.image) + '" alt="Signature">' : '<div class="ct-sig-vide"></div>') +
      '<b>' + esc(s && s.nom || '') + '</b>' + (s && s.date ? '<em>Signé le ' + esc(new Date(s.date).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })) + '</em>' : '') + '</div>';
  };
  return '<article class="ct-doc"><header><div class="ct-marque"><img src="logos/logo-horizontal-sombre-fondclair.png" alt="' + esc(c.marque || d.studio || 'Henzo Studio') + '"></div><h1>' + esc(c.titre || 'Contrat de prestation') + '</h1>' +
    (d.prix ? '<div class="ct-res"><span>' + esc(dateFr(d.date)) + '</span><span>' + esc(d.lieu || '') + '</span><span>' + esc(F(d.prix)) + '</span></div>' : '') + '</header>' +
    A.map(function(a, i){ return '<section><h2>' + (i + 1) + '. ' + esc(a.t) + '</h2><p>' + esc(a.x).replace(/\n/g, '<br>') + '</p></section>'; }).join('') +
    '<div class="ct-sigs">' + sig(c.signature_studio, 'Le Studio') + sig(c.signature_client, d.modele === 'collab' ? 'Le Collaborateur' : 'Le Client') + '</div></article>';
};
window.CT_CSS = '.ct-doc{max-width:760px;margin:0 auto;font-family:Inter,system-ui,sans-serif;color:#13150f;background:#fff;padding:28px 26px;border-radius:10px;line-height:1.55}' +
  '.ct-doc header{position:static!important;display:block!important;background:none!important;box-shadow:none!important;backdrop-filter:none!important;color:#13150f!important;border-bottom:2px solid #5f6e3a;padding:0 0 14px!important;margin-bottom:16px;height:auto!important}.ct-marque img{height:46px;width:auto;display:block}' +
  '.ct-doc h1{font-family:\'Libre Franklin\',Arial,sans-serif;font-weight:600;font-size:28px;margin:12px 0 8px;color:#13150f}.ct-res{display:flex;flex-wrap:wrap;gap:6px}.ct-res span{font-size:12.5px;background:#f1efe9;border-radius:99px;padding:3px 10px;color:#5f6e3a;text-transform:capitalize}' +
  '.ct-doc section{margin:14px 0;break-inside:avoid}.ct-doc h2{font-family:\'Libre Franklin\',Arial,sans-serif;font-weight:600;font-size:16px;margin:0 0 4px;color:#5f6e3a}.ct-doc p{margin:0;font-size:13.5px;color:#3a3d32}' +
  '.ct-sigs{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:26px}.ct-sig{border:1px solid #e2e0d6;border-radius:12px;padding:10px;min-height:120px;display:flex;flex-direction:column;gap:4px}' +
  '.ct-sig small{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#5c5f54}.ct-sig img{max-width:100%;height:70px;object-fit:contain;object-position:left}.ct-sig-vide{height:70px;border-bottom:1px dashed #d3d0c3}' +
  '.ct-sig b{font-size:13px}.ct-sig em{font-style:normal;font-size:11px;color:#5c5f54}@media print{.ct-doc{padding:0;border-radius:0}}';
})();
