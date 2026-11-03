// ============================================================
// GUIDES.JS - Les guides du Coach (Coach > Guides)
// ------------------------------------------------------------
// De vrais guides, concrets, pour un photographe à Bouaké :
// parler aux clients, vendre sans forcer, réseaux sociaux, trouver
// des clients sans les réseaux, augmenter ses revenus, poser ses
// règles, WhatsApp Business et la fiche Google.
// Chaque guide : les points clés, des phrases prêtes à dire, un
// exercice, des liens officiels pour vérifier, une liste "à faire"
// (cochée et gardée), et "Demander au coach" (l'IA répond avec tes
// vrais chiffres).
// Coches gardées dans user_preferences.guides_faits.
// ============================================================
(function(){
'use strict';
if(typeof agSheet !== 'function') return;
const E = s => agEsc(String(s == null ? '' : s));
const GD = { faits: null, ouvert: null };
window.GD = GD;

const GUIDES = [
  { id: 'parler', titre: 'Parler aux clients sur WhatsApp', resume: 'Répondre vite, clair et chaleureux : c\'est souvent là que le client décide.',
    parties: [
      { t: 'Les règles de base', p: ['Réponds dans l\'heure pendant la journée. Un client qui attend va voir un autre photographe.', 'Commence par son prénom et une phrase chaleureuse, puis réponds à sa question.', 'Un message = une idée. Évite les pavés : 3 à 5 lignes maximum.', 'Pose une question à la fin pour faire avancer : « Pour quelle date ? », « C\'est pour combien de personnes ? »', 'Envoie toujours 3 ou 4 photos d\'exemple du même type de séance que ce qu\'il cherche.'] },
      { t: 'Quand il demande « c\'est combien ? »', p: ['Ne réponds jamais juste un prix. Demande d\'abord le type de séance et la date, puis envoie ta page de tarifs avec 2 ou 3 packs.', 'Mets en avant le pack du milieu : « La plupart de mes clients prennent celui-ci parce que... »', 'Rappelle tout de suite la règle : « La date est bloquée dès réception de l\'acompte par Wave. »'] },
      { t: 'Quand il dit « c\'est trop cher »', p: ['Ne baisse pas ton prix tout de suite. Demande : « Quel budget aviez-vous prévu ? »', 'Propose un pack plus petit plutôt qu\'une réduction : moins de photos, moins de temps, même qualité.', 'Explique ce qu\'il paie : retouche de chaque photo, matériel, déplacement, délai de livraison.', 'Si tu fais un geste, donne quelque chose en plus (un tirage) plutôt que d\'enlever de l\'argent.'] },
      { t: 'Relancer sans déranger', p: ['Pas de réponse après un devis : relance une fois après 1 jour, puis après 3 jours. Ensuite, laisse tranquille.', 'Relance avec quelque chose d\'utile : une photo d\'exemple, une date encore libre, une offre qui finit bientôt.'] }
    ],
    phrases: ['Bonjour Awa, merci pour votre message ! C\'est pour quelle occasion et à quelle date ?', 'Voici quelques photos de séances comme la vôtre, et mes tarifs : [lien]. La plupart de mes clients choisissent le pack Élégance.', 'Pour bloquer votre date, je vous envoie le lien de paiement Wave pour l\'acompte. Dès qu\'il est reçu, c\'est confirmé.'],
    exercice: 'Prends tes 5 derniers messages de clients. Pour chacun, note le temps que tu as mis à répondre et si tu as fini par une question.',
    taches: ['Créer 5 réponses rapides dans WhatsApp Business', 'Mettre un message d\'accueil et un message d\'absence', 'Préparer un album de photos d\'exemple par type de séance'],
    sources: [['WhatsApp Business : réponses rapides, messages d\'accueil, étiquettes', 'https://business.whatsapp.com/']] },
  { id: 'vendre', titre: 'Vendre sans forcer', resume: 'Comprendre ce que veut le client, proposer la bonne chose, et faire payer l\'acompte.',
    parties: [
      { t: 'Écouter avant de proposer', p: ['Pose 3 questions : l\'occasion, la date, ce qu\'il veut faire des photos (cadre, réseaux, album).', 'Répète ce qu\'il veut avec ses mots : il se sent compris et te fait confiance.'] },
      { t: 'Proposer 3 choix', p: ['Toujours 3 packs : un petit, un moyen (celui que tu veux vendre), un grand. Le grand rend le moyen raisonnable.', 'Dis ce que chaque pack lui apporte, pas seulement ce qu\'il contient : « Avec l\'album, vos enfants pourront le regarder dans 20 ans. »', 'Propose les options au bon moment : les tirages et cadres à la livraison, quand il voit ses belles photos.'] },
      { t: 'Faire payer l\'acompte', p: ['L\'acompte n\'est pas une question de confiance, c\'est la règle pour tout le monde. Dis-le calmement et toujours de la même façon.', 'Envoie le lien Wave tout de suite après l\'accord, pendant que le client est motivé.', 'Pas d\'acompte = pas de date bloquée. Un client qui a payé passe avant.'] },
      { t: 'Après la séance', p: ['Demande un avis par écrit dans les 3 jours, quand le client est content.', 'Propose le parrainage : un bon de réduction pour lui s\'il t\'envoie un ami.'] }
    ],
    phrases: ['Pour être sûr de bien comprendre : vous voulez des photos de famille en extérieur, pour faire un grand cadre au salon, c\'est ça ?', 'Je vous propose 3 formules. Celle du milieu est la plus choisie : elle a juste ce qu\'il faut pour le cadre et les réseaux.', 'C\'est la même règle pour tout le monde : la date est réservée dès que l\'acompte est payé. Je vous envoie le lien Wave ?'],
    exercice: 'Écris tes 3 questions de départ et ta phrase pour l\'acompte. Dis-les à voix haute 5 fois pour qu\'elles deviennent naturelles.',
    taches: ['Avoir 3 packs par type de séance', 'Mettre un pack « Le plus choisi »', 'Demander un avis à chaque client livré'],
    sources: [] },
  { id: 'reseaux', titre: 'Les réseaux sociaux qui ramènent des clients', resume: 'Publier régulièrement ce qui donne envie de réserver, et le montrer aux bonnes personnes.',
    parties: [
      { t: 'Ce qui marche le mieux', p: ['Les vidéos courtes (Reels, TikTok) : coulisses d\'une séance, avant / après retouche, réaction du client. Ce sont elles que Facebook, Instagram et TikTok montrent le plus aux gens qui ne te suivent pas encore.', 'Le visage et les émotions de vrais clients (avec leur accord) plus que des paysages.', 'Les avant / après : ils montrent ton travail de retouche en 2 secondes.', 'Les avis clients en capture (prénom seulement).'] },
      { t: 'Un rythme simple', p: ['3 publications par semaine sur Facebook et Instagram, au moins une vidéo courte.', 'Statut WhatsApp tous les jours : c\'est là que tes contacts de Bouaké te voient le plus.', 'Garde le même style de couleurs et de textes pour qu\'on te reconnaisse.'] },
      { t: 'Bien écrire la légende', p: ['Première ligne qui accroche : une question ou une émotion.', 'Dis clairement quoi faire : « Écris-moi sur WhatsApp pour réserver ta date. »', 'Ajoute la ville (Bouaké) et quelques mots-clés : mariage, anniversaire, studio photo.'] },
      { t: 'Mesurer', p: ['Chaque semaine, regarde quelle publication a amené des messages, pas seulement des « j\'aime ».', 'Demande toujours aux nouveaux clients comment ils t\'ont connu (l\'app le note).'] }
    ],
    phrases: ['Elle n\'en revenait pas de voir ses photos... Toi aussi, offre-toi ce moment. Réservation sur WhatsApp, studio à Ahougnansou, Bouaké.', 'Avant / après : 3 minutes de retouche, une photo qui restera 30 ans.'],
    exercice: 'Filme 3 courtes vidéos pendant ta prochaine séance (installation, moment drôle, résultat). Publie-en une par jour.',
    taches: ['Publier 1 vidéo courte cette semaine', 'Mettre le lien de réservation dans ta bio', 'Faire un statut WhatsApp par jour pendant 7 jours'],
    sources: [['Instagram pour les créateurs (conseils officiels)', 'https://creators.instagram.com/'], ['Meta pour les entreprises (Facebook et Instagram)', 'https://www.facebook.com/business'], ['TikTok pour les entreprises', 'https://www.tiktok.com/business/']] },
  { id: 'horsreseaux', titre: 'Trouver des clients sans les réseaux', resume: 'À Bouaké, le bouche-à-oreille et les partenariats ramènent souvent les meilleurs clients.',
    parties: [
      { t: 'Les partenaires', p: ['Salons de coiffure et instituts de beauté : leurs clientes se préparent pour un événement. Propose un bon de réduction à afficher, et une commission pour chaque cliente envoyée.', 'Boutiques de robes, tailleurs, pâtisseries, décorateurs, organisateurs d\'événements, salles de fête : ils voient les futurs mariés et les anniversaires avant toi.', 'Écoles et crèches : photos de classe, fêtes de fin d\'année, remises de diplômes.', 'Entreprises et commerces : photos de l\'équipe, des produits, portraits pour CV et LinkedIn.'] },
      { t: 'Être facile à trouver', p: ['Crée ta fiche Google (Google Business Profile) : gratuite, elle te montre sur Google Maps quand quelqu\'un cherche « photographe Bouaké ».', 'Une enseigne visible devant le studio et des cartes de visite avec un QR code vers tes tarifs.'] },
      { t: 'Le bouche-à-oreille', p: ['Donne à chaque client un bon à offrir à un ami : il te fait de la publicité.', 'Livre toujours un peu en avance et avec une jolie présentation : les gens parlent de ce qui les surprend.', 'Sois présent aux événements : un stand photo à une fête de quartier ou un salon.'] }
    ],
    phrases: ['Bonjour Madame, je suis photographe à Ahougnansou. Vos clientes se préparent souvent pour des événements : je vous propose un partenariat, elles ont -10 % chez moi et vous recevez 2 000 F pour chaque cliente envoyée.'],
    exercice: 'Liste 10 commerces près du studio qui voient tes futurs clients. Va en voir 2 cette semaine avec des cartes et quelques tirages.',
    taches: ['Créer ma fiche Google', 'Imprimer des cartes avec un QR code vers mes tarifs', 'Proposer un partenariat à 2 commerces'],
    sources: [['Google Business Profile (fiche gratuite sur Google Maps)', 'https://www.google.com/business/']] },
  { id: 'revenus', titre: 'Augmenter tes revenus', resume: 'Gagner plus par client, garder tes clients, et remplir les mois calmes.',
    parties: [
      { t: 'Gagner plus par client', p: ['Propose tirages, cadres et albums à la livraison. Un client sur trois qui prend un tirage, c\'est déjà beaucoup en plus chaque mois.', 'Crée des packs qui incluent le tirage plutôt que de le vendre à part.', 'Revois tes prix au moins une fois par an : si tu es complet souvent, tu es trop bon marché.'] },
      { t: 'Garder tes clients', p: ['Note les anniversaires et les dates importantes de tes clients : l\'app te les rappelle. Écris-leur un mois avant.', 'Propose un rendez-vous chaque année aux familles (photo de l\'anniversaire de l\'enfant).'] },
      { t: 'Remplir les mois calmes', p: ['Prépare à l\'avance des mini-séances à thème pour les fêtes (Noël, Saint-Valentin, Tabaski, rentrée, fin d\'année scolaire).', 'Propose des abonnements photo aux commerces : un revenu chaque mois.', 'Sers-toi de l\'onglet « Faire travailler mon argent » pour d\'autres idées.'] }
    ],
    phrases: ['Vos photos sont prêtes ! Beaucoup de mes clients en font imprimer 2 ou 3 pour les offrir : 15x21 à 2 000 F, je m\'en occupe.'],
    exercice: 'Calcule combien tu gagnerais en plus par mois si 1 client sur 3 prenait un tirage à 2 000 F.',
    taches: ['Avoir des tirages d\'exemple à montrer', 'Préparer la prochaine journée de mini-séances', 'Écrire aux clients dont l\'anniversaire arrive'],
    sources: [] },
  { id: 'posture', titre: 'Ta posture de professionnel', resume: 'Être pris au sérieux : ponctuel, clair sur tes règles, et calme avec les clients difficiles.',
    parties: [
      { t: 'Être pro', p: ['Arrive 15 minutes avant, matériel prêt et batteries chargées (l\'onglet Préparer t\'aide).', 'Une tenue propre et simple, un ton calme, un sourire.', 'Écris tes règles une fois pour toutes (acompte, retard, livraison) et envoie-les toujours de la même façon. Un contrat les rend officielles.'] },
      { t: 'Dire non poliment', p: ['« Je comprends. Malheureusement, je ne bloque pas de date sans acompte, c\'est la règle pour tous mes clients. »', 'Ne te justifie pas trop : une phrase claire et polie suffit.'] },
      { t: 'Les clients difficiles', p: ['Reste calme et écris plutôt que d\'appeler quand ça chauffe : tu gardes une trace.', 'Reviens toujours à ce qui était prévu (le devis, le contrat).', 'Si un client ne respecte rien, tu as le droit de refuser de travailler avec lui.'] }
    ],
    phrases: ['Je comprends tout à fait. Comme prévu dans le contrat, le report est possible une fois si vous prévenez 72 heures avant. Quelle date vous arrangerait ?'],
    exercice: 'Écris tes 3 règles (acompte, retard, livraison) en une phrase chacune et mets-les dans une note épinglée.',
    taches: ['Écrire mes 3 règles', 'Faire un contrat pour ma prochaine grosse séance', 'Préparer une checklist matériel'],
    sources: [] }
];
window.GUIDES = GUIDES;

async function gdCharger(){
  if(GD.faits) return GD.faits;
  try { const { data: u } = await sb.auth.getUser(); const { data } = await sb.from('user_settings').select('user_preferences').eq('user_id', u.user.id).maybeSingle(); GD.faits = ((data && data.user_preferences) || {}).guides_faits || {}; } catch(e){ GD.faits = {}; }
  return GD.faits;
}
function gdProgres(g){ const f = (GD.faits || {})[g.id] || []; return { n: f.length, t: g.taches.length }; }
function gdListeHtml(){
  return `<div class="gd-intro">Des guides concrets pour communiquer, vendre et trouver des clients à Bouaké. Chaque guide a des phrases prêtes à dire, un exercice et une petite liste à cocher.</div>
    ${GUIDES.map(g => { const P = gdProgres(g); return `<div class="gd-card" onclick="gdOuvrir('${g.id}')"><div class="d"><b>${E(g.titre)}</b><span>${E(g.resume)}</span><div class="gd-bar"><i style="width:${P.t ? Math.round(P.n / P.t * 100) : 0}%"></i></div><small>${P.n}/${P.t} fait</small></div>${agIcon('chev', 16)}</div>`; }).join('')}
    <div class="gd-ask"><b>${agIcon('sparkles', 14)} Une question sur la communication, la vente ou les réseaux ?</b><div class="ap-ask"><input id="gdQ" placeholder="Ex : comment répondre à un client qui veut négocier ?" onkeydown="if(event.key==='Enter')gdDemander()"><button class="btn-primary" onclick="gdDemander()">Demander</button></div><div id="gdRep"></div></div>`;
}
window.gdOuvrir = async function(id){
  await gdCharger();
  const g = GUIDES.find(x => x.id === id); if(!g) return;
  GD.ouvert = id;
  const f = GD.faits[id] || [];
  agSheet('gdSheet', `<h3>${E(g.titre)}</h3><div class="ag-hint" style="margin-top:0">${E(g.resume)}</div>
    ${g.parties.map(p => `<div class="gd-sec"><h4>${E(p.t)}</h4><ul>${p.p.map(x => `<li>${E(x)}</li>`).join('')}</ul></div>`).join('')}
    ${g.phrases.length ? `<div class="gd-sec"><h4>Phrases prêtes à dire</h4>${g.phrases.map((x, i) => `<div class="gd-ph"><p>${E(x)}</p><button type="button" onclick="gdCopier(${i})">${agIcon('copy', 13)} Copier</button></div>`).join('')}</div>` : ''}
    <div class="gd-sec gd-ex"><h4>Exercice</h4><p>${E(g.exercice)}</p></div>
    <div class="gd-sec"><h4>À faire</h4>${g.taches.map((t, i) => `<label class="ag-check"><input type="checkbox" ${f.includes(i) ? 'checked' : ''} onchange="gdCocher('${id}',${i},this.checked)"> ${E(t)}</label>`).join('')}</div>
    ${g.sources.length ? `<div class="gd-sec"><h4>Pour vérifier et aller plus loin</h4>${g.sources.map(([n, u]) => `<a class="gd-src" href="${E(u)}" target="_blank" rel="noopener">${E(n)}</a>`).join('')}</div>` : ''}
    <div class="gd-ask"><b>${agIcon('sparkles', 14)} Demander au coach sur ce guide</b><div class="ap-ask"><input id="gdQ2" placeholder="Ex : adapte ça à mes séances anniversaire" onkeydown="if(event.key==='Enter')gdDemander('${id}')"><button class="btn-primary" onclick="gdDemander('${id}')">Demander</button></div><div id="gdRep2"></div></div>`);
};
window.gdCopier = function(i){ const g = GUIDES.find(x => x.id === GD.ouvert); if(!g) return; const t = g.phrases[i]; try { navigator.clipboard.writeText(t); agToast('Phrase copiée'); } catch(e){ agPrompt('Copie la phrase', t); } };
window.gdCocher = async function(id, i, on){
  await gdCharger();
  const L = (GD.faits[id] || []).filter(x => x !== i); if(on) L.push(i);
  GD.faits[id] = L.sort();
  if(typeof crmSavePrefs === 'function') await crmSavePrefs({ guides_faits: GD.faits });
  if(on) agToast('Bravo, une chose de faite');
  const v = document.getElementById('gdView'); if(v) v.innerHTML = gdListeHtml();
};
function gdContexte(){
  const P = [];
  try { const mois = new Date().toISOString().slice(0, 7); const sh = shoots.filter(s => String(s.date || '').slice(0, 7) === mois && s.status !== 'annule'); P.push(`Séances ce mois : ${sh.length}.`); } catch(e){}
  try { P.push(`Clients enregistrés : ${clients.filter(c => !c.role || c.role === 'client').length}.`); } catch(e){}
  try { const t = (CRM.tarifs || []).filter(x => (x.kind || 'formule') === 'formule' && x.active !== false).slice(0, 10).map(x => `${x.name} ${Math.round(x.price)} F`).join(', '); if(t) P.push('Tarifs : ' + t + '.'); } catch(e){}
  try { const src = {}; (typeof OT !== 'undefined' && OT.resas ? OT.resas : []).forEach(r => { if(r.source) src[r.source] = (src[r.source] || 0) + 1; }); const s = Object.entries(src).map(([k, n]) => `${k} ${n}`).join(', '); if(s) P.push('Comment les clients l\'ont connu : ' + s + '.'); } catch(e){}
  return P.join(' ');
}
window.gdDemander = async function(id){
  const g = id ? GUIDES.find(x => x.id === id) : null;
  const inp = document.getElementById(id ? 'gdQ2' : 'gdQ'), el = document.getElementById(id ? 'gdRep2' : 'gdRep');
  const q = (inp && inp.value || '').trim(); if(!q || !el) return;
  el.innerHTML = '<div class="ag-empty">Le coach réfléchit...</div>';
  const sys = 'Tu es le coach de Henzo, photographe et vidéaste à Bouaké (Côte d\'Ivoire), studio à Ahougnansou. Français simple, sans jargon, tirets simples. Conseils concrets, réalistes pour Bouaké, avec des phrases prêtes à dire quand c\'est utile. Ne donne pas de chiffres ou statistiques que tu ne peux pas vérifier ; si tu cites une fonction d\'une plateforme, reste sur ce qui est sûr. 12 lignes maximum.';
  const ctx = (g ? `Guide : ${g.titre}. Points du guide : ${g.parties.map(p => p.t + ' : ' + p.p.join(' ')).join(' | ')}\n` : '') + `Situation de Henzo : ${gdContexte()}\n\nQUESTION : ${q}`;
  try {
    const r = await mkAI({ system: sys, messages: [{ role: 'user', text: ctx }], maxTokens: 900 });
    const t = String(typeof txtDefancy === 'function' ? txtDefancy(r.text || '') : (r.text || '')).replace(/[–—]/g, '-');
    el.innerHTML = `<div class="ap-ia"><div>${E(t).replace(/\n/g, '<br>')}</div></div>`;
  } catch(e){ el.innerHTML = `<div class="ag-hint warn">Le coach n'a pas pu répondre : ${E(e.message || e)}</div>`; }
};
window.gdListe = async function(){ await gdCharger(); agSheet('gdListeS', `<h3>Guides du coach</h3><div id="gdView">${gdListeHtml()}</div>`); };

// ---------- Dans le Coach : onglet "Guides" ----------
if(typeof CO_TABS !== 'undefined' && typeof coRender === 'function'){
  if(!CO_TABS.some(t => t[0] === 'guides')) CO_TABS.splice(1, 0, ['guides', 'Guides']);
  if(typeof CO_TAB_ALIAS !== 'undefined') CO_TAB_ALIAS.guides = 'guides';
  const renderGd = coRender;
  coRender = async function(){
    const r = await renderGd.apply(this, arguments);
    if(CO.tab === 'guides'){ await gdCharger(); const v = document.getElementById('coView'); if(v) v.innerHTML = `<div id="gdView">${gdListeHtml()}</div>`; }
    return r;
  };
}
if(window.CA_ITEMS){
  CA_ITEMS.push({ id: 'guides', s: 'Coach', t: 'Guides : communiquer, vendre, réseaux, clients', q: 'Parler aux clients sur WhatsApp, vendre sans forcer, réseaux sociaux, trouver des clients sans les réseaux, augmenter tes revenus, ta posture de pro. Avec phrases prêtes, exercices et liens officiels.', ou: 'Coach > Guides', m: 'guide communication vente stratégie réseaux sociaux clients revenus attitude comportement', go: ['gdListe', []] });
}

(function gdCss(){
  if(document.getElementById('gdCss')) return;
  const st = document.createElement('style'); st.id = 'gdCss';
  st.textContent = `.gd-intro{font-size:13.5px;color:var(--muted);line-height:1.5;margin:4px 0 10px}
.gd-card{display:flex;align-items:center;gap:10px;padding:14px;border-radius:14px;background:var(--card2);border:1px solid var(--border);margin:8px 0;cursor:pointer}
.gd-card .d{flex:1;min-width:0}.gd-card b{display:block;color:var(--text);font-size:14.5px}.gd-card span{display:block;color:var(--muted);font-size:12.5px;margin-top:2px;line-height:1.4}.gd-card small{color:var(--muted);font-size:11px}
.gd-bar{height:5px;border-radius:99px;background:var(--card);margin:8px 0 3px;overflow:hidden}.gd-bar i{display:block;height:100%;background:var(--accent)}
.gd-sec{margin:14px 0}.gd-sec h4{margin:0 0 6px;font-size:14px;color:var(--text)}.gd-sec ul{margin:0;padding-left:18px}.gd-sec li{font-size:13.5px;line-height:1.5;color:var(--text);margin:4px 0}.gd-sec p{font-size:13.5px;line-height:1.5;color:var(--text);margin:0}
.gd-ph{padding:10px 12px;border-radius:12px;background:var(--card2);margin:6px 0}.gd-ph p{font-style:italic}.gd-ph button{margin:6px 0 0;padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--accent);font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;width:auto!important}
.gd-ex{padding:12px;border-radius:12px;background:color-mix(in srgb,var(--accent) 12%,transparent);border:1px solid var(--accent)}
.gd-src{display:block;padding:8px 0;color:var(--accent);font-size:13px;text-decoration:underline}
.gd-ask{margin-top:16px;padding:12px;border-radius:14px;background:var(--card2);border:1px solid var(--border)}.gd-ask b{display:flex;align-items:center;gap:6px;color:var(--text);font-size:13.5px}.gd-ask b svg{color:var(--accent)}`;
  document.head.appendChild(st);
})();
})();
