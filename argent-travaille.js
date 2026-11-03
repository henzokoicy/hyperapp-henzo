// ============================================================
// ARGENT-TRAVAILLE.JS - Faire travailler son argent (Bouaké)
// ------------------------------------------------------------
// - Bilan : l'argent qui dort, ce qu'il faut garder en sécurité,
//   ce qu'on peut faire travailler sans risque pour le loyer.
// - Idées concrètes pour un photographe à Bouaké (tirages, cadres,
//   mini-séances, marchandise chez un revendeur...), avec mise, gain,
//   délai, risque et étapes. "Adapter à moi" et "Idées IA".
// - Mes projets : on suit ce que rapporte chaque idée (bénéfice,
//   rentabilité). "Ça ne marche pas" : questions précises puis
//   diagnostic et meilleures solutions par l'IA.
// - Booster un revenu : "+X F par mois", combien de séances, et un
//   plan de l'IA.
// Table : projets_argent. Information seulement, pas un conseil
// financier professionnel.
// ============================================================
(function(){
'use strict';
if(typeof agRenderArgent !== 'function') return;
const E = s => agEsc(String(s == null ? '' : s)), F = n => agF(Math.round(Number(n) || 0));
const AT = { projets: [], charge: false, tab: 'idees', ia: [], diag: null, boost: 50000 };
window.AT = AT;
const nd = s => typeof bgNoDash === 'function' ? bgNoDash(s) : String(s || '').replace(/[–—]/g, '-');
const today = () => typeof bgToday === 'function' ? bgToday() : new Date().toISOString().slice(0, 10);

// ---------- Le catalogue d'idées ----------
// mise : [min, max] en FCFA · gain : texte · gainMois : estimation prudente par mois
const AT_IDEES = [
  { id: 'tirages', cat: 'photo', titre: 'Vendre des tirages à tes clients', mise: [5000, 20000], gainMois: 15000, delai: 'Dès la prochaine séance', risque: 'faible',
    gain: '+1 000 à 2 000 F par tirage (ex : 15x21 acheté 500 à 700 F au labo, vendu 1 500 à 2 500 F)',
    pourquoi: 'Tes clients aiment déjà leurs photos : un tirage, c\'est un petit achat facile à dire oui.',
    etapes: ['Demande les prix à 2 labos de Bouaké (10x15, 15x21, A4)', 'Fixe 3 prix simples (ex : 1 500, 2 500, 5 000 F)', 'Fais imprimer 2 ou 3 beaux tirages d\'exemple à montrer', 'Propose les tirages à chaque livraison de photos', 'Encaisse avant de commander au labo'],
    pieges: ['Commander sans être payé', 'Trop de formats : le client hésite'] },
  { id: 'cadres', cat: 'photo', titre: 'Photos encadrées (cadeaux)', mise: [15000, 40000], gainMois: 20000, delai: '1 à 2 semaines', risque: 'faible',
    gain: '+2 000 à 5 000 F par cadre',
    pourquoi: 'Anniversaires, mariages, fête des mères : la photo encadrée est un cadeau qui se vend bien.',
    etapes: ['Achète 5 cadres simples au marché (2 tailles)', 'Prépare une photo d\'exemple encadrée pour ton statut', 'Annonce "photo + cadre" à prix fixe avant chaque fête', 'Garde les cadres invendus pour la fête suivante'],
    pieges: ['Acheter trop de cadres d\'un coup', 'Cadres fragiles qui cassent au transport'] },
  { id: 'mini', cat: 'photo', titre: 'Journée mini-séances à thème', mise: [10000, 30000], gainMois: 60000, delai: '2 semaines de préparation', risque: 'moyen',
    gain: '50 000 à 150 000 F sur une journée (ex : 15 clients x 5 000 F)',
    pourquoi: 'Un seul décor, des séances de 15 minutes : beaucoup de clients en une journée.',
    etapes: ['Choisis la date : fête (Tabaski, Noël, fête des mères, rentrée...)', 'Monte un décor simple et réutilisable', 'Fixe un prix bas avec 3 photos retouchées', 'Prends les réservations avec acompte sur WhatsApp', 'Propose les tirages et les photos en plus sur place'],
    pieges: ['Pas d\'acompte : les gens ne viennent pas', 'Trop de photos par client : tu perds du temps'] },
  { id: 'identite', cat: 'photo', titre: 'Photos d\'identité et photos CV', mise: [0, 15000], gainMois: 15000, delai: 'Tout de suite', risque: 'faible',
    gain: '+500 à 1 500 F par client, tous les jours',
    pourquoi: 'Concours, dossiers, CV : il y a toujours des gens qui en ont besoin.',
    etapes: ['Prépare un fond blanc ou bleu clair', 'Affiche le prix devant le studio et sur ton statut', 'Propose la version "photo CV / LinkedIn" un peu plus chère', 'Imprime en planche pour réduire le coût'],
    pieges: ['Mauvais format pour les dossiers officiels : vérifie les tailles'] },
  { id: 'abonnement', cat: 'photo', titre: 'Abonnement photo pour boutiques et restaurants', mise: [0, 5000], gainMois: 40000, delai: '1 mois', risque: 'faible',
    gain: '15 000 à 30 000 F par mois et par boutique',
    pourquoi: 'Les commerçants vendent sur WhatsApp et Facebook : ils ont besoin de belles photos chaque mois.',
    etapes: ['Fais 5 photos gratuites pour 2 boutiques comme exemple', 'Propose une formule : X photos par mois pour un prix fixe', 'Passe le même jour chaque mois', 'Demande le paiement en début de mois'],
    pieges: ['Trop de photos pour le prix : écris ce qui est compris'] },
  { id: 'location', cat: 'photo', titre: 'Louer ton matériel qui dort', mise: [0, 0], gainMois: 15000, delai: 'Tout de suite', risque: 'moyen',
    gain: '2 000 à 10 000 F par jour de location',
    pourquoi: 'Flash, trépied, fond, réflecteur : d\'autres photographes ou vidéastes en cherchent.',
    etapes: ['Fais la liste du matériel que tu n\'utilises pas tous les jours', 'Fixe un prix par jour et une caution', 'Écris un petit papier de location (état, date de retour)', 'Ne loue qu\'à des gens que tu connais au début'],
    pieges: ['Matériel cassé sans caution', 'Prêter le matériel dont tu as besoin pour tes séances'] },
  { id: 'formation', cat: 'photo', titre: 'Petite formation "belles photos au téléphone"', mise: [5000, 10000], gainMois: 30000, delai: '2 semaines', risque: 'faible',
    gain: '5 000 à 10 000 F par personne, groupe de 5 à 10',
    pourquoi: 'Vendeuses en ligne, commerçants, jeunes : tout le monde veut de belles photos au téléphone.',
    etapes: ['Prépare 2 heures de cours pratique (lumière, cadrage, retouche)', 'Trouve une salle ou fais-le au studio', 'Annonce sur WhatsApp avec places limitées', 'Encaisse à l\'inscription'],
    pieges: ['Trop théorique : fais-les pratiquer'] },
  { id: 'revendeur', cat: 'commerce', titre: 'Marchandise chez un revendeur (biscuits, eau, crédit)', mise: [10000, 25000], gainMois: 8000, delai: '1 à 2 semaines par tour', risque: 'moyen',
    gain: 'environ 10 à 20 % de marge par tour, partagée avec le revendeur',
    pourquoi: 'Ton argent tourne pendant que tu travailles : un revendeur vend pour toi devant sa boutique.',
    etapes: ['Choisis un produit qui part vite (biscuits, eau, sachets, crédit)', 'Achète en gros chez un grossiste du grand marché', 'Mets par écrit le partage avec le revendeur (ex : il garde 25 F par paquet)', 'Note ce que tu donnes et passe encaisser chaque semaine', 'Recommence seulement avec le bénéfice, garde ta mise de départ'],
    pieges: ['Pas de cahier : on ne sait plus qui doit quoi', 'Produit qui périme', 'Revendeur pas sérieux : commence petit'] },
  { id: 'tontine', cat: 'epargne', titre: 'Tontine avec des gens de confiance', mise: [5000, 50000], gainMois: 0, delai: 'Selon le tour', risque: 'moyen',
    gain: 'Pas de gain, mais une grosse somme d\'un coup pour acheter du matériel',
    pourquoi: 'Elle force à mettre de côté chaque semaine ou chaque mois.',
    etapes: ['Rejoins une tontine de gens que tu connais bien', 'Choisis un montant que tu peux payer même un mauvais mois', 'Décide à l\'avance ce que tu achètes avec ton tour (objectif précis)'],
    pieges: ['Quelqu\'un qui disparaît après son tour', 'Montant trop gros pour toi'] },
  { id: 'placement', cat: 'epargne', titre: 'Épargne qui rapporte (banque, obligations UEMOA)', mise: [50000, 500000], gainMois: 0, delai: '6 mois et plus', risque: 'faible',
    gain: 'Quelques % par an (à vérifier auprès de la banque ou d\'une SGI)',
    pourquoi: 'Pour l\'argent dont tu n\'as pas besoin pendant longtemps. Ça rapporte peu mais c\'est calme.',
    etapes: ['Garde d\'abord 1 mois de dépenses en sécurité', 'Demande les conditions à ta banque (compte à terme) ou à une SGI agréée', 'Vérifie : durée bloquée, frais, ce qui se passe si tu retires avant'],
    pieges: ['Promesses de gros gains rapides : c\'est souvent une arnaque', 'Bloquer l\'argent du loyer'] }
];
window.AT_IDEES = AT_IDEES;
const AT_RISQUE = { faible: 'Risque faible', moyen: 'Risque moyen', eleve: 'Risque élevé' };
const AT_CATS = [['tout', 'Tout'], ['photo', 'Avec la photo'], ['commerce', 'Petit commerce'], ['epargne', 'Épargne']];

// ---------- Le bilan de l'argent ----------
function atMoisDepenses(){
  const t = today(), lim = typeof bgAddMois === 'function' ? bgAddMois(t.slice(0, 7), -3) : t.slice(0, 7);
  const L = txs.filter(x => x.type === 'depense' && !x.cancelled && x.date && String(x.date).slice(0, 7) >= lim && String(x.date).slice(0, 7) < t.slice(0, 7));
  const mois = new Set(L.map(x => String(x.date).slice(0, 7))).size || 1;
  return Math.round(L.reduce((s, x) => s + (Number(x.amount) || 0), 0) / mois);
}
function atRevenus(mois){
  const t = today(), lim = typeof bgAddMois === 'function' ? bgAddMois(t.slice(0, 7), -mois) : t.slice(0, 7);
  return txs.filter(x => x.type === 'revenu' && !x.cancelled && String(x.date || '').slice(0, 7) >= lim && String(x.date || '').slice(0, 7) < t.slice(0, 7)).reduce((s, x) => s + (Number(x.amount) || 0), 0);
}
function atBilan(){
  const comptes = agActiveAccounts().reduce((s, a) => s + Math.max(0, agAccountBalance(a)), 0);
  const spec = ['charges', 'projets'].map(k => typeof bgFindCoffre === 'function' ? bgFindCoffre(k) : null).filter(Boolean).map(c => c.id);
  const libres = agCoffres().filter(c => !estCoffreBloque(c) && !spec.includes(c.id));
  const coffresLibres = libres.reduce((s, c) => s + Math.max(0, Number(c.current) || 0), 0);
  const depMois = atMoisDepenses();
  const chManque = typeof bgChargesResume === 'function' && typeof BG !== 'undefined' && BG.loaded ? bgChargesResume().manque : 0;
  const securite = depMois + chManque;
  const dort = comptes + coffresLibres;
  const utilisable = Math.max(0, dort - securite);
  return { comptes, coffresLibres, depMois, chManque, securite, dort, utilisable, conseil: Math.round(utilisable * 0.3 / 1000) * 1000, revMois: Math.round(atRevenus(3) / 3) };
}
window.atBilan = atBilan;
function atContexte(){
  const B = atBilan();
  const t = today(), lim = typeof bgAddMois === 'function' ? bgAddMois(t.slice(0, 7), -3) : '';
  const sh = (typeof shoots !== 'undefined' ? shoots : []).filter(s => s.status !== 'annule' && String(s.date || '').slice(0, 7) >= lim);
  const prix = sh.filter(s => Number(s.price) > 0), moy = prix.length ? Math.round(prix.reduce((a, s) => a + Number(s.price), 0) / prix.length) : 0;
  const tarifs = (typeof CRM !== 'undefined' && Array.isArray(CRM.tarifs) ? CRM.tarifs : []).filter(p => p.active !== false).slice(0, 12).map(p => `${p.name} ${Math.round(p.price)} F`).join(', ');
  return `Henzo, photographe à Bouaké (Côte d'Ivoire), studio photo et vidéo.
Revenus moyens par mois (3 derniers mois) : ${B.revMois} F. Dépenses moyennes par mois : ${B.depMois} F.
Séances sur 3 mois : ${sh.length}, prix moyen ${moy} F. Tarifs : ${tarifs || 'non renseignés'}.
Argent disponible : comptes ${Math.round(B.comptes)} F, coffres libres ${Math.round(B.coffresLibres)} F. À garder en sécurité : ${B.securite} F. Utilisable : ${B.utilisable} F.
${typeof bgChargesContexte === 'function' ? bgChargesContexte() : ''}
Projets en cours : ${AT.projets.filter(p => p.statut === 'en_cours').map(p => `${p.titre} (mise ${Math.round(p.mise || 0)} F, bénéfice ${atChiffres(p).benef} F)`).join(' ; ') || 'aucun'}.`;
}
const AT_SYS = `Tu es le conseiller business de Henzo, photographe à Bouaké (Côte d'Ivoire). Français simple, sans jargon, tirets simples uniquement, montants en FCFA réalistes pour Bouaké. Tu proposes des choses concrètes, faisables et rentables, à petit risque, adaptées à son argent réel. Jamais de promesses de gains rapides ni de placements douteux. Tu n'es pas un conseiller financier agréé : pour l'épargne et la bourse, tu donnes de l'information et tu dis de vérifier.`;

// ---------- Projets (table projets_argent) ----------
async function atCharger(){
  if(typeof sb === 'undefined') return;
  try { const { data, error } = await sb.from('projets_argent').select('*').order('created_at', { ascending: false }); if(!error) AT.projets = (data || []).map(atNorm); } catch(e){ console.warn('projets', e); }
  AT.charge = true;
}
function atArr(v){ if(Array.isArray(v)) return v; if(typeof v === 'string'){ try { const x = JSON.parse(v); return Array.isArray(x) ? x : []; } catch(e){} } return []; }
function atObj(v){ if(v && typeof v === 'object') return v; if(typeof v === 'string'){ try { return JSON.parse(v) || {}; } catch(e){} } return {}; }
function atNorm(p){ return { ...p, suivis: atArr(p.suivis), diagnostic: atArr(p.diagnostic), idee: atObj(p.idee) }; }
function atChiffres(p){
  const S = atArr(p.suivis);
  const ventes = S.filter(x => x.type !== 'depense').reduce((s, x) => s + (Number(x.montant) || 0), 0);
  const depenses = S.filter(x => x.type === 'depense').reduce((s, x) => s + (Number(x.montant) || 0), 0);
  const mise = Math.round(Number(p.mise) || 0);
  const benef = Math.round(ventes - depenses - mise);
  const cout = mise + depenses;
  return { ventes, depenses, mise, benef, roi: cout ? Math.round(benef / cout * 100) : null, n: S.length };
}
window.atChiffres = atChiffres;
async function atMaj(p, data){
  const r = await dbUpdate('projets_argent', p.id, { ...data, updated_at: new Date().toISOString() });
  if(!r) return null;
  const i = AT.projets.findIndex(x => x.id === p.id), n = atNorm(r);
  if(i >= 0) AT.projets[i] = n;
  return n;
}

// ---------- La fenêtre principale ----------
window.atOuvrir = async function(tab){
  if(tab) AT.tab = tab;
  if(!AT.charge) await atCharger();
  agSheet('atSheet', `<h3>Faire travailler mon argent</h3>
    <div class="ag-pills at-tabs">${[['idees', 'Idées'], ['projets', 'Mes projets'], ['booster', 'Booster un revenu']].map(([k, l]) => `<button type="button" class="${AT.tab === k ? 'on' : ''}" onclick="atTab('${k}')">${l}${k === 'projets' && AT.projets.filter(p => p.statut === 'en_cours').length ? ` (${AT.projets.filter(p => p.statut === 'en_cours').length})` : ''}</button>`).join('')}</div>
    <div id="atBody"></div>
    <div class="ag-hint at-note">Ce sont des idées et des calculs pour t'aider à décider. Ce n'est pas un conseil financier professionnel : commence petit et ne touche jamais à l'argent du loyer.</div>`);
  atRendre();
};
window.atTab = function(k){ AT.tab = k; document.querySelectorAll('#atSheet .at-tabs button').forEach((b, i) => b.classList.toggle('on', ['idees', 'projets', 'booster'][i] === k)); atRendre(); };
function atRendre(){
  const el = document.getElementById('atBody'); if(!el) return;
  el.innerHTML = AT.tab === 'projets' ? atProjetsHtml() : AT.tab === 'booster' ? atBoosterHtml() : atIdeesHtml();
  if(AT.tab === 'booster') atBoostCalc();
}
window.atRendre = atRendre;

// ---------- Onglet Idées ----------
function atBilanHtml(){
  const B = atBilan();
  return `<div class="at-bilan">
    <div class="bg-sum">
      <div>Argent qui dort<b>${F(B.dort)}</b></div>
      <div>À garder en sécurité<b>${F(B.securite)}</b></div>
      <div class="${B.utilisable > 0 ? 'ok' : 'red'}">Peut travailler<b>${F(B.utilisable)}</b></div>
    </div>
    <div class="ag-hint" style="margin-top:4px">${B.utilisable > 0
      ? `Sécurité = 1 mois de dépenses (${F(B.depMois)})${B.chManque ? ` + ${F(B.chManque)} de charges à couvrir` : ''}. Pour commencer, ne mets pas plus de <b>${F(Math.max(B.conseil, 5000))}</b> dans une seule idée.`
      : `Garde d'abord ${F(B.securite)} en sécurité (1 mois de dépenses${B.chManque ? ' + tes charges' : ''}). En attendant, choisis les idées sans mise : elles rapportent avec ton travail.`}</div>
  </div>`;
}
function atIdeeCarte(x, ia){
  const mise = x.mise && x.mise[1] ? (x.mise[0] === x.mise[1] ? F(x.mise[0]) : `${F(x.mise[0])} à ${F(x.mise[1])}`) : 'Aucune';
  const key = ia ? `ia:${ia}` : x.id;
  return `<div class="at-idee" data-id="${E(key)}">
    <div class="at-ih"><b>${E(x.titre)}</b><span class="at-r ${x.risque}">${AT_RISQUE[x.risque] || ''}</span></div>
    <div class="at-ig"><span>Mise<b>${mise}</b></span><span>Gain<b>${E(x.gain)}</b></span><span>Délai<b>${E(x.delai)}</b></span></div>
    ${x.pourquoi ? `<p>${E(x.pourquoi)}</p>` : ''}
    <details><summary>Les étapes${x.pieges && x.pieges.length ? ' et les pièges' : ''}</summary><ol>${(x.etapes || []).map(e => `<li>${E(e)}</li>`).join('')}</ol>${x.pieges && x.pieges.length ? `<div class="at-pg"><b>Attention :</b> ${x.pieges.map(E).join(' · ')}</div>` : ''}</details>
    <div class="at-ib"><button class="btn-primary" onclick="atLancer('${E(key)}')">Je me lance</button><button class="btn-ghost" onclick="atAdapter('${E(key)}')">${agIcon('sparkles', 14)} Adapter à moi</button></div>
    <div class="at-ad" id="atAd_${E(key).replace(/[^a-z0-9]/gi, '_')}"></div>
  </div>`;
}
function atIdee(key){ if(String(key).startsWith('ia:')) return AT.ia[Number(String(key).slice(3))] || null; return AT_IDEES.find(x => x.id === key) || null; }
function atIdeesHtml(){
  const cat = AT.cat || 'tout', B = atBilan();
  const L = AT_IDEES.filter(x => cat === 'tout' || x.cat === cat).sort((a, b) => ((a.mise[0] > B.utilisable && a.mise[0] > 0) - (b.mise[0] > B.utilisable && b.mise[0] > 0)));
  return `${atBilanHtml()}
    <div class="ag-pills" style="margin-top:12px">${AT_CATS.map(([k, l]) => `<button type="button" class="${cat === k ? 'on' : ''}" onclick="AT.cat='${k}';atRendre()">${l}</button>`).join('')}</div>
    <button class="btn-ghost at-iabtn" id="atIaBtn" onclick="atIdeesIA()">${agIcon('sparkles', 15)} 3 idées de l'IA faites pour moi</button>
    <div id="atIaList">${AT.ia.map((x, i) => atIdeeCarte(x, String(i))).join('')}</div>
    ${L.map(x => atIdeeCarte(x)).join('')}`;
}
window.atIdeesIA = async function(){
  const b = document.getElementById('atIaBtn'), el = document.getElementById('atIaList');
  if(b){ b.disabled = true; b.textContent = 'L\'IA réfléchit...'; }
  try {
    const r = await mkAI({ system: AT_SYS, messages: [{ role: 'user', text: atContexte() + `\n\nDonne 3 idées concrètes pour faire travailler son argent ou gagner plus, différentes de : ${AT_IDEES.map(x => x.titre).join(', ')}. Adapte la mise à l'argent utilisable. Réponds UNIQUEMENT en JSON : [{"titre":"","mise":[min,max],"gain":"","gainMois":0,"delai":"","risque":"faible|moyen|eleve","pourquoi":"","etapes":["",""],"pieges":[""]}]` }], maxTokens: 1600 });
    const j = mkJson(r.text);
    AT.ia = (Array.isArray(j) ? j : j.idees || []).slice(0, 3).map(x => ({ titre: nd(x.titre), mise: Array.isArray(x.mise) ? x.mise.map(n => Math.round(Number(n) || 0)) : [0, Math.round(Number(x.mise) || 0)], gain: nd(x.gain), gainMois: Math.round(Number(x.gainMois) || 0), delai: nd(x.delai), risque: ['faible', 'moyen', 'eleve'].includes(x.risque) ? x.risque : 'moyen', pourquoi: nd(x.pourquoi), etapes: (x.etapes || []).map(nd), pieges: (x.pieges || []).map(nd), cat: 'ia' }));
    if(el) el.innerHTML = AT.ia.map((x, i) => atIdeeCarte(x, String(i))).join('');
  } catch(e){ agToast('L\'IA n\'a pas pu répondre : ' + (e.message || e), 'error'); }
  if(b && b.isConnected){ b.disabled = false; b.innerHTML = `${agIcon('sparkles', 15)} 3 autres idées de l'IA`; }
};
window.atAdapter = async function(key){
  const x = atIdee(key); if(!x) return;
  const el = document.getElementById('atAd_' + String(key).replace(/[^a-z0-9]/gi, '_')); if(!el) return;
  el.innerHTML = '<div class="ag-empty">Je l\'adapte à ta situation...</div>';
  try {
    const r = await mkAI({ system: AT_SYS, messages: [{ role: 'user', text: atContexte() + `\n\nIdée : ${x.titre}. Mise ${x.mise.join(' à ')} F. Gain : ${x.gain}. Étapes : ${(x.etapes || []).join(' / ')}.\nAdapte cette idée à Henzo : combien mettre exactement, quel prix de vente, combien il peut gagner le premier mois (prudent), les 3 premières actions cette semaine. 10 lignes maximum.` }], maxTokens: 800 });
    el.innerHTML = `<div class="ap-ia"><div>${E(nd(typeof txtDefancy === 'function' ? txtDefancy(r.text) : r.text)).replace(/\n/g, '<br>')}</div></div>`;
  } catch(e){ el.innerHTML = `<div class="ag-hint warn">L'IA n'a pas pu répondre : ${E(e.message || e)}</div>`; }
};
window.atLancer = function(key){
  const x = atIdee(key); if(!x) return;
  const B = atBilan(), m0 = x.mise[1] ? Math.min(x.mise[1], Math.max(x.mise[0], B.conseil || x.mise[0])) : 0;
  agSheet('atLance', `<h3>Je me lance</h3>
    <label for="atLTitre">Nom du projet</label><input id="atLTitre" value="${E(x.titre)}">
    <label for="atLMise">Combien je mets au départ (FCFA)</label><input id="atLMise" type="number" inputmode="decimal" value="${m0}">
    ${m0 > B.utilisable ? `<div class="ag-hint warn">Attention : c'est plus que l'argent qui peut travailler (${F(B.utilisable)}). Commence plus petit.</div>` : ''}
    <label for="atLGain">Ce que je vise de gagner (bénéfice, FCFA)</label><input id="atLGain" type="number" inputmode="decimal" value="${Math.round(x.gainMois || 0) || ''}" placeholder="Ex : 15000">
    <div class="ag-hint">Pense à noter aussi les vraies dépenses et entrées dans tes comptes. Ici, on suit seulement ce que l'idée rapporte.</div>
    <button class="btn-primary" id="atLBtn" style="margin-top:12px" onclick="atLancerGo('${E(key)}')">Créer le projet</button>`);
};
window.atLancerGo = async function(key){
  const x = atIdee(key); if(!x) return;
  const titre = nd(document.getElementById('atLTitre').value.trim()) || x.titre;
  const mise = Math.max(0, Math.round(parseFloat(document.getElementById('atLMise').value) || 0));
  const gain = Math.max(0, Math.round(parseFloat(document.getElementById('atLGain').value) || 0));
  const b = document.getElementById('atLBtn'); if(b) b.disabled = true;
  const r = await dbInsert('projets_argent', { titre, categorie: x.cat || 'autre', mise, gain_vise: gain || null, statut: 'en_cours', idee: { id: x.id || null, titre: x.titre, etapes: x.etapes || [], pieges: x.pieges || [], gain: x.gain, faits: [] }, suivis: [], diagnostic: [] });
  if(b) b.disabled = false;
  if(!r) return;
  AT.projets.unshift(atNorm(r));
  agCloseSheet('atLance');
  AT.tab = 'projets'; atOuvrir('projets');
  agToast('Projet créé : ' + titre);
};

// ---------- Onglet Mes projets ----------
function atProjetsHtml(){
  if(!AT.projets.length) return `<div class="ag-empty">Aucun projet pour l'instant. Choisis une idée et appuie sur "Je me lance".</div><button class="btn-ghost" style="width:100%" onclick="atTab('idees')">Voir les idées</button>`;
  const enCours = AT.projets.filter(p => p.statut === 'en_cours'), finis = AT.projets.filter(p => p.statut !== 'en_cours');
  const tot = AT.projets.reduce((s, p) => s + atChiffres(p).benef, 0);
  return `<div class="bg-sum"><div>Projets en cours<b>${enCours.length}</b></div><div class="${tot >= 0 ? 'ok' : 'red'}">Bénéfice total<b>${tot >= 0 ? '+' : '-'}${F(Math.abs(tot))}</b></div></div>
    ${enCours.map(atProjetCarte).join('')}
    ${finis.length ? `<div class="ag-sec"><h3>Terminés</h3></div>${finis.map(atProjetCarte).join('')}` : ''}`;
}
function atProjetCarte(p){
  const C = atChiffres(p), et = p.idee.etapes || [], faits = p.idee.faits || [];
  const vise = Math.round(Number(p.gain_vise) || 0), pct = vise ? Math.max(0, Math.min(100, Math.round(C.benef / vise * 100))) : null;
  return `<div class="at-p ${p.statut}">
    <div class="at-ih"><b>${E(p.titre)}</b><span class="at-r ${C.benef >= 0 ? 'faible' : 'eleve'}">${C.benef >= 0 ? '+' : '-'}${F(Math.abs(C.benef))}</span></div>
    <div class="at-ig"><span>Mise<b>${F(C.mise)}</b></span><span>Ventes<b>${F(C.ventes)}</b></span><span>Dépenses<b>${F(C.depenses)}</b></span><span>Rentabilité<b>${C.roi == null ? '-' : C.roi + ' %'}</b></span></div>
    ${pct != null ? `<div class="oc-bar ${pct >= 100 ? 'pret' : 'avance'}"><i style="width:${pct}%"></i></div><div class="ag-hint" style="margin:0">Bénéfice visé ${F(vise)} : ${pct} %</div>` : ''}
    ${C.mise && C.benef < 0 ? `<div class="ag-hint" style="margin:4px 0 0">Il faut encore ${F(-C.benef)} de bénéfice pour récupérer ta mise.</div>` : C.mise ? `<div class="ag-hint ok" style="margin:4px 0 0">Mise récupérée. Tout ce qui rentre maintenant est du bénéfice.</div>` : ''}
    ${et.length ? `<details><summary>Étapes (${faits.length}/${et.length})</summary>${et.map((e, i) => `<label class="ag-check"><input type="checkbox" ${faits.includes(i) ? 'checked' : ''} onchange="atEtape(${p.id},${i},this.checked)"> ${E(e)}</label>`).join('')}</details>` : ''}
    ${p.suivis.length ? `<details><summary>Résultats notés (${p.suivis.length})</summary><div class="oc-mini">${p.suivis.slice().reverse().slice(0, 20).map(s => `<div><span>${E(s.date ? bgDateFr(s.date) : '')} · ${E(s.note || (s.type === 'depense' ? 'Dépense' : 'Vente'))}</span><b class="ag-m">${s.type === 'depense' ? '-' : '+'}${F(s.montant)}</b></div>`).join('')}</div></details>` : ''}
    ${p.statut === 'en_cours' ? `<div class="at-ib"><button class="btn-primary" onclick="atSuivi(${p.id})">+ Résultat</button><button class="btn-ghost" onclick="atDiag(${p.id})">Ça ne marche pas</button></div>
      <div class="at-ib small"><button onclick="atFinir(${p.id},'termine')">Terminer</button><button onclick="atFinir(${p.id},'abandonne')">Abandonner</button></div>`
      : `<div class="ag-hint" style="margin:6px 0 0">${p.statut === 'abandonne' ? 'Abandonné' : 'Terminé'}${p.diagnostic.length ? ' · diagnostic fait' : ''} <button class="at-lien" onclick="atFinir(${p.id},'en_cours')">Reprendre</button></div>`}
  </div>`;
}
window.atEtape = async function(id, i, on){
  const p = AT.projets.find(x => x.id === id); if(!p) return;
  const idee = { ...p.idee, faits: (p.idee.faits || []).filter(x => x !== i).concat(on ? [i] : []).sort((a, b) => a - b) };
  p.idee = idee; await atMaj(p, { idee }); atRendre();
};
window.atSuivi = function(id){
  const p = AT.projets.find(x => x.id === id); if(!p) return;
  agSheet('atSuivi', `<h3>${E(p.titre)} : noter un résultat</h3>
    <div class="ag-pills" id="atSType"><button type="button" data-k="vente" class="on" onclick="agPick(this)">Vente / gain</button><button type="button" data-k="depense" onclick="agPick(this)">Dépense en plus</button></div>
    <label for="atSMt">Montant (FCFA)</label><input id="atSMt" type="number" inputmode="decimal" class="big" placeholder="0">
    <label for="atSNote">Note</label><input id="atSNote" placeholder="Ex : 3 tirages 15x21 à Awa">
    <label for="atSDate">Date</label><input id="atSDate" type="date" value="${today()}">
    <button class="btn-primary" style="margin-top:12px" onclick="atSuiviGo(${id})">Enregistrer</button>`);
};
window.atSuiviGo = async function(id){
  const p = AT.projets.find(x => x.id === id); if(!p) return;
  const montant = Math.round(parseFloat(document.getElementById('atSMt').value) || 0);
  if(!(montant > 0)){ agAlert('Tape un montant.'); return; }
  const s = { type: (document.querySelector('#atSType button.on') || {}).dataset?.k || 'vente', montant, note: nd(document.getElementById('atSNote').value.trim()), date: document.getElementById('atSDate').value || today() };
  const r = await atMaj(p, { suivis: p.suivis.concat([s]) });
  if(!r) return;
  agCloseSheet('atSuivi'); atRendre();
  const C = atChiffres(r);
  agToast(C.benef >= 0 ? `Bénéfice : +${F(C.benef)}` : `Encore ${F(-C.benef)} pour récupérer la mise`);
};
window.atFinir = async function(id, statut){
  const p = AT.projets.find(x => x.id === id); if(!p) return;
  if(statut !== 'en_cours' && !await agConfirm(statut === 'termine' ? `Terminer "${p.titre}" ?` : `Abandonner "${p.titre}" ? Tu pourras le reprendre.`)) return;
  await atMaj(p, { statut }); atRendre();
};

// ---------- "Ça ne marche pas" : diagnostic ----------
const AT_QUESTIONS = [
  ['proposes', 'À combien de personnes as-tu proposé ?', 'Ex : 10'],
  ['oui', 'Combien ont dit oui ou ont acheté ?', 'Ex : 1'],
  ['prix', 'Quel prix as-tu demandé ?', 'Ex : 2 000 F le tirage'],
  ['comment', 'Comment et où l\'as-tu proposé ?', 'Ex : statut WhatsApp, au studio, à la livraison'],
  ['refus', 'Qu\'ont dit ceux qui ont refusé ?', 'Ex : trop cher, plus tard, pas besoin'],
  ['probleme', 'Selon toi, qu\'est-ce qui bloque ?', 'Ex : le revendeur ne paie pas, pas le temps...']
];
window.atDiag = function(id){
  const p = AT.projets.find(x => x.id === id); if(!p) return;
  const der = p.diagnostic[p.diagnostic.length - 1];
  AT.diag = { id, msgs: der && der.msgs ? der.msgs.slice() : [] };
  agSheet('atDiag', `<h3>Ça ne marche pas : on cherche pourquoi</h3>
    <div class="ag-hint" style="margin-top:0">${E(p.titre)} · réponds simplement, même avec des chiffres approximatifs.</div>
    ${AT_QUESTIONS.map(([k, q, ph]) => `<label for="atQ_${k}">${E(q)}</label><input id="atQ_${k}" placeholder="${E(ph)}" value="${E(der && der.reponses ? der.reponses[k] || '' : '')}">`).join('')}
    <button class="btn-primary" id="atDBtn" style="margin-top:12px" onclick="atDiagGo(${id})">${agIcon('sparkles', 15)} Trouver la cause et de meilleures solutions</button>
    <div id="atDRep">${AT.diag.msgs.length ? atDiagFil() : ''}</div>`);
};
function atDiagFil(){
  return AT.diag.msgs.filter((m, i) => i > 0).map(m => `<div class="at-msg ${m.role}">${E(m.text).replace(/\n/g, '<br>')}</div>`).join('') +
    `<div class="ap-ask"><input id="atDQ" placeholder="Pose une autre question..." onkeydown="if(event.key==='Enter')atDiagSuite()"><button class="btn-primary" onclick="atDiagSuite()">Envoyer</button></div>`;
}
window.atDiagGo = async function(id){
  const p = AT.projets.find(x => x.id === id); if(!p) return;
  const rep = {}; AT_QUESTIONS.forEach(([k]) => { rep[k] = nd((document.getElementById('atQ_' + k) || {}).value || '').trim(); });
  if(!Object.values(rep).some(Boolean)){ agAlert('Réponds au moins à une question.'); return; }
  const C = atChiffres(p);
  const q = `${atContexte()}\n\nPROJET : ${p.titre}. Mise ${C.mise} F, ventes ${C.ventes} F, dépenses ${C.depenses} F, bénéfice ${C.benef} F, depuis le ${String(p.created_at || '').slice(0, 10)}. Bénéfice visé : ${Math.round(p.gain_vise || 0)} F.
Étapes prévues : ${(p.idee.etapes || []).join(' / ')}. Étapes faites : ${(p.idee.faits || []).length}.
Résultats notés : ${p.suivis.map(s => `${s.date} ${s.type} ${s.montant} ${s.note || ''}`).join(' ; ') || 'aucun'}.
Réponses de Henzo :\n${AT_QUESTIONS.map(([k, qq]) => `- ${qq} ${rep[k] || '(pas de réponse)'}`).join('\n')}

Fais un diagnostic : 1) la cause la plus probable (en 2 lignes, avec les chiffres), 2) trois meilleures solutions concrètes à essayer cette semaine (avec prix et comment le dire au client), 3) s'il vaut mieux continuer, changer ou arrêter, et pourquoi. 14 lignes maximum.`;
  const b = document.getElementById('atDBtn'), el = document.getElementById('atDRep');
  if(b) b.disabled = true; if(el) el.innerHTML = '<div class="ag-empty">Je cherche la cause...</div>';
  try {
    const r = await mkAI({ system: AT_SYS, messages: [{ role: 'user', text: q }], maxTokens: 1100 });
    const t = nd(typeof txtDefancy === 'function' ? txtDefancy(r.text) : r.text);
    AT.diag = { id, msgs: [{ role: 'user', text: q }, { role: 'assistant', text: t }] };
    const d = p.diagnostic.concat([{ date: today(), reponses: rep, msgs: AT.diag.msgs }]).slice(-5);
    await atMaj(p, { diagnostic: d });
    if(el) el.innerHTML = atDiagFil();
  } catch(e){ if(el) el.innerHTML = `<div class="ag-hint warn">L'IA n'a pas pu répondre : ${E(e.message || e)}</div>`; }
  if(b && b.isConnected) b.disabled = false;
};
window.atDiagSuite = async function(){
  const D = AT.diag, inp = document.getElementById('atDQ'); if(!D || !D.msgs.length || !inp) return;
  const q = nd(inp.value.trim()); if(!q) return;
  D.msgs.push({ role: 'user', text: q });
  const el = document.getElementById('atDRep'); if(el) el.innerHTML = atDiagFil().replace(/<div class="ap-ask">[\s\S]*$/, '<div class="ag-empty">...</div>');
  try {
    const r = await mkAI({ system: AT_SYS, messages: D.msgs, maxTokens: 800 });
    D.msgs.push({ role: 'assistant', text: nd(typeof txtDefancy === 'function' ? txtDefancy(r.text) : r.text) });
    const p = AT.projets.find(x => x.id === D.id);
    if(p && p.diagnostic.length){ const d = p.diagnostic.slice(); d[d.length - 1] = { ...d[d.length - 1], msgs: D.msgs.slice(-20) }; await atMaj(p, { diagnostic: d }); }
  } catch(e){ D.msgs.push({ role: 'assistant', text: 'L\'IA n\'a pas pu répondre : ' + (e.message || e) }); }
  if(el) el.innerHTML = atDiagFil();
};

// ---------- Onglet Booster un revenu ----------
function atBoosterHtml(){
  const B = atBilan(), v = AT.boost || '';
  return `<div class="bg-sum"><div>Tes revenus par mois<b>${F(B.revMois)}</b></div><div>Tes dépenses par mois<b>${F(B.depMois)}</b></div></div>
    <label for="atBMt">Je veux gagner en plus chaque mois (FCFA)</label>
    <input id="atBMt" type="number" inputmode="decimal" class="big" value="${v}" oninput="AT.boost=Math.round(this.value)||0;atBoostCalc()">
    <div class="ag-pills">${[25000, 50000, 100000, 200000].map(n => `<button type="button" onclick="document.getElementById('atBMt').value=${n};AT.boost=${n};atBoostCalc()">+${agN(n)}</button>`).join('')}</div>
    <div id="atBCalc"></div>
    <button class="btn-primary" id="atBBtn" style="margin-top:12px" onclick="atBoostIA()">${agIcon('sparkles', 15)} Mon plan de l'IA pour y arriver</button>
    <div id="atBIA"></div>`;
}
window.atBoostCalc = function(){
  const el = document.getElementById('atBCalc'); if(!el) return;
  const v = Math.round(AT.boost || 0);
  if(!(v > 0)){ el.innerHTML = ''; return; }
  const s = typeof bgSeancesPour === 'function' ? bgSeancesPour(v) : null;
  const sem = s && s.n ? Math.ceil(s.n / 4) : null;
  // Les idées du catalogue qui peuvent y contribuer
  const L = AT_IDEES.filter(x => x.gainMois > 0).slice().sort((a, b) => b.gainMois - a.gainMois);
  let tot = 0; const mix = []; for(const x of L){ if(tot >= v) break; mix.push(x); tot += x.gainMois; if(mix.length >= 3) break; }
  el.innerHTML = `<div class="at-bc">
    ${s && s.n ? `<div class="oc-step"><i>1</i><div><b>Avec des séances en plus</b><span>${E(s.texte)} par mois, soit environ ${sem} par semaine.${s.detail ? ' ' + E(s.detail) + '.' : ''}</span></div></div>` : ''}
    <div class="oc-step"><i>${s && s.n ? 2 : 1}</i><div><b>Ou en mélangeant des idées</b><span>${mix.map(x => `${E(x.titre)} (environ ${F(x.gainMois)} par mois)`).join(' + ')} = environ ${F(tot)} par mois${tot < v ? ', il faudra aussi quelques séances en plus' : ''}.</span></div></div>
  </div>`;
};
window.atBoostIA = async function(){
  const v = Math.round(AT.boost || 0); if(!(v > 0)){ agAlert('Tape combien tu veux gagner en plus.'); return; }
  const el = document.getElementById('atBIA'), b = document.getElementById('atBBtn');
  if(el) el.innerHTML = '<div class="ag-empty">Je prépare ton plan...</div>'; if(b) b.disabled = true;
  try {
    const r = await mkAI({ system: AT_SYS, messages: [{ role: 'user', text: atContexte() + `\n\nObjectif : gagner ${v} F de plus chaque mois. Donne un plan concret sur 4 semaines (semaine 1, 2, 3, 4) : quelles offres, à quel prix, combien de clients, comment les trouver à Bouaké, et ce qu'il faut mettre de côté. Termine par 2 indicateurs simples à suivre. 16 lignes maximum.` }], maxTokens: 1200 });
    if(el) el.innerHTML = `<div class="ap-ia"><div>${E(nd(typeof txtDefancy === 'function' ? txtDefancy(r.text) : r.text)).replace(/\n/g, '<br>')}</div></div>`;
  } catch(e){ if(el) el.innerHTML = `<div class="ag-hint warn">L'IA n'a pas pu répondre : ${E(e.message || e)}</div>`; }
  if(b && b.isConnected) b.disabled = false;
};

// ---------- Entrée dans l'onglet Argent ----------
function atInject(){
  const el = document.getElementById('agArgentBody'); if(!el || !agActiveAccounts().length) return;
  el.querySelector(':scope > .at-zone')?.remove();
  const ref = el.querySelector(':scope > .bg-zone') || el.querySelector(':scope > .ag-actions'); if(!ref) return;
  const B = atBilan(), n = AT.projets.filter(p => p.statut === 'en_cours').length;
  const z = document.createElement('div'); z.className = 'at-zone';
  z.innerHTML = `<div class="bg-card at-card" onclick="atOuvrir()"><div class="ic">${agIcon('flame', 18)}</div>
    <div class="d"><b>Faire travailler mon argent</b><span>${n ? `${n} projet${n > 1 ? 's' : ''} en cours · ` : ''}${B.utilisable > 0 ? `${F(B.utilisable)} peuvent travailler` : 'Idées pour gagner plus, sans mise'}</span></div>${agIcon('chev', 16)}</div>`;
  ref.insertAdjacentElement('afterend', z);
}
const renderAt = agRenderArgent;
agRenderArgent = function(){
  const r = renderAt.apply(this, arguments);
  try { atInject(); } catch(e){ console.warn('argent travaille', e); }
  return r;
};
window.atInject = atInject;
// charge les projets en douce pour la carte
setTimeout(async () => { try { const s = typeof sb !== 'undefined' ? (await sb.auth.getSession()).data : null; if(s && s.session){ await atCharger(); atInject(); } } catch(e){} }, 1500);

(function atCss(){
  if(document.getElementById('atCss')) return;
  const st = document.createElement('style'); st.id = 'atCss';
  st.textContent = `
.at-tabs{margin-bottom:10px}.at-note{margin-top:16px;font-size:11.5px}
.at-bilan{padding:10px 12px;border-radius:14px;background:var(--card2)}
.at-iabtn{width:100%;margin:10px 0 0;display:flex;align-items:center;justify-content:center;gap:6px}
.at-idee,.at-p{padding:12px;border-radius:14px;background:var(--card2);border:1px solid var(--border);margin:10px 0}
.at-p.termine,.at-p.abandonne{opacity:.75}
.at-ih{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}.at-ih b{font-size:14px;color:var(--text)}
.at-r{flex-shrink:0;font-size:11px;font-weight:700;padding:3px 8px;border-radius:99px}
.at-r.faible{background:rgba(52,199,89,.14);color:#34c759}.at-r.moyen{background:rgba(245,165,36,.15);color:#f5a524}.at-r.eleve{background:rgba(255,69,58,.15);color:#ff453a}
.at-ig{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:6px;margin:8px 0}
.at-ig span{font-size:11px;color:var(--muted);background:var(--card);border-radius:10px;padding:6px 8px}.at-ig b{display:block;font-size:12.5px;color:var(--text);margin-top:2px;font-weight:600}
.at-idee p{margin:4px 0;font-size:12.5px;color:var(--muted);line-height:1.45}
.at-idee details,.at-p details{margin:6px 0;font-size:12.5px;color:var(--muted)}.at-idee summary,.at-p summary{cursor:pointer;color:var(--accent);font-weight:600}
.at-idee ol{margin:6px 0;padding-left:18px;line-height:1.5}.at-pg{margin-top:4px}.at-pg b{color:#f5a524}
.at-ib{display:flex;gap:8px;margin-top:8px}.at-ib button{flex:1;margin:0;padding:10px;font-size:13px}
.at-ib.small button{background:transparent;border:1px solid var(--border);color:var(--muted);border-radius:10px;cursor:pointer}
.at-lien{background:none;border:0;color:var(--accent);cursor:pointer;font-weight:600;padding:0 4px}
.at-msg{margin:8px 0;padding:10px 12px;border-radius:12px;font-size:13px;line-height:1.5}.at-msg.assistant{background:var(--card2);color:var(--text)}.at-msg.user{background:var(--accent);color:#fff;margin-left:30px}
.at-card .ic{color:#f5a524}`;
  document.head.appendChild(st);
})();
try { atInject(); } catch(e){}
})();
