// ============================================================
// OBJECTIFS-CHARGES.JS - Avoir ses charges prêtes à l'avance
// ------------------------------------------------------------
// Exemple : "le loyer doit être prêt avant le 15 du mois d'avant".
// - Dans la fiche d'une charge : "Avoir cette charge prête à l'avance"
//   (jour limite + coffre où garder l'argent). Stocké dans
//   charges_fixes.objectif (jsonb) : { actif, jour, coffre_id }.
// - L'app suit l'argent déjà de côté, compte les jours, dit combien
//   garder par jour et à chaque paiement client, et motive.
// - Plan rapide : clients qui te doivent, séances prévues, nombre de
//   séances à trouver, puis un plan de l'IA si les clients manquent.
// - Carte sur l'Accueil quand l'objectif n'est pas encore atteint.
// - Répartition d'un paiement : propose aussi de remplir l'objectif.
// Chargé après budget.js (et argent-clair.js).
// ============================================================
(function(){
'use strict';
if(typeof BG === 'undefined' || typeof bgOccMois !== 'function') return;
const E = s => agEsc(String(s == null ? '' : s)), F = n => agF(Math.round(Number(n) || 0));
const OC = { rep: null };
window.OC = OC;

// ---------- Lire l'objectif d'une charge ----------
function ocObj(c){
  if(!c || c.actif === false || c.frequence === 'hebdo') return null;
  let o = c.objectif;
  if(typeof o === 'string'){ try { o = JSON.parse(o); } catch(e){ o = null; } }
  return o && o.actif && Number(o.jour) >= 1 && Number(o.jour) <= 31 ? o : null;
}
window.ocObj = ocObj;
const ocD = d => String(bgDateFr(d)).replace(/\.$/, '');
function ocJourMois(m, j){ const [y, mo] = m.split('-').map(Number); const nbj = new Date(y, mo, 0).getDate(); return `${m}-${bgPad(Math.min(j, nbj))}`; }
function ocCoffre(o){
  const c = o && o.coffre_id ? coffres.find(x => x.id === Number(o.coffre_id)) : null;
  return c || bgFindCoffre('charges');
}
// Toutes les échéances non payées, du mois passé à +3 mois
function ocToutes(){
  const m0 = bgAddMois(bgMois(), -1), L = [];
  BG.charges.filter(c => c.actif !== false).forEach(c => {
    const montant = Math.round(Number(c.montant) || 0);
    for(let k = 0; k < 5; k++) bgOccMois(c, bgAddMois(m0, k)).forEach(o => {
      const paye = Math.min(montant, Math.round(bgPayePour(c.id, o.periode)));
      if(montant - paye > 0) L.push({ c, echeance: o.echeance, periode: o.periode, montant, reste: montant - paye });
    });
  });
  return L.sort((a, b) => a.echeance.localeCompare(b.echeance));
}

// ---------- Le calcul ----------
// Rend { c, o, cible, limite, jours, pret, manque, pct, statut, parJour, parPaiement, nbPaiements, coffre, texte }
function ocEtat(c){
  const o = ocObj(c); if(!o) return null;
  const toutes = ocToutes();
  const T = toutes.find(x => x.c.id === c.id); if(!T) return { c, o, fini: true, statut: 'pret', pct: 100, manque: 0, pret: 0 };
  const J = Number(o.jour), dueJ = Number(T.echeance.slice(8, 10));
  const limite = J < dueJ ? ocJourMois(T.echeance.slice(0, 7), J) : ocJourMois(bgAddMois(T.echeance.slice(0, 7), -1), J);
  const cf = ocCoffre(o), pool = cf ? Math.max(0, Math.round(Number(cf.current) || 0)) : 0;
  // Si on garde dans le coffre des charges, les charges qui tombent avant passent d'abord
  const partage = !o.coffre_id || (cf && bgFindCoffre('charges') && cf.id === bgFindCoffre('charges').id);
  const avant = partage ? toutes.filter(x => x !== T && x.echeance < T.echeance).reduce((s, x) => s + x.reste, 0) : 0;
  const pret = Math.max(0, Math.min(T.reste, pool - avant));
  const manque = T.reste - pret;
  const jours = bgJours(limite);
  const pct = T.reste ? Math.round(pret / T.reste * 100) : 100;
  // Où on devrait en être : on remplit en 30 jours jusqu'au jour limite
  const attendu = Math.round(T.reste * Math.max(0, Math.min(1, (30 - jours) / 30)));
  const statut = manque <= 0 ? 'pret' : jours < 0 ? 'depasse' : pret >= attendu ? 'avance' : 'retard';
  const P = ocPaiements();
  const nbPaiements = Math.max(1, Math.round(P.parJour * Math.max(1, jours)));
  return { c, o, T, cible: T.echeance, limite, jours, pool, avant, pret, manque, pct, attendu, statut, coffre: cf,
    parJour: jours > 0 ? Math.ceil(manque / jours / 100) * 100 : manque,
    parPaiement: Math.ceil(manque / nbPaiements / 100) * 100, nbPaiements, P };
}
window.ocEtat = ocEtat;
function ocEtats(){ return BG.charges.map(ocEtat).filter(Boolean).filter(x => !x.fini); }
window.ocEtats = ocEtats;

// Rythme des paiements clients sur 60 jours
function ocPaiements(){
  const t = bgToday(), lim = bgYmd(new Date(new Date(t + 'T12:00:00').getTime() - 60 * 864e5));
  const L = txs.filter(x => x.type === 'revenu' && !x.cancelled && x.date && String(x.date).slice(0, 10) >= lim && String(x.date).slice(0, 10) <= t && !/ajust|report|solde/i.test(String(x.category || '')));
  const tot = L.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const mois = txs.filter(x => x.type === 'revenu' && !x.cancelled && String(x.date || '').slice(0, 7) === bgMois()).reduce((s, x) => s + (Number(x.amount) || 0), 0);
  return { n: L.length, total: tot, moyen: L.length ? Math.round(tot / L.length) : 0, parJour: L.length / 60, mois };
}
function ocLimiteTexte(s){ return `${bgDateFr(s.limite, true)}`; }
function ocTitre(s){ return `${s.c.nom} ${bgDe(s.T.periode)}`; }

// ---------- Les mots pour motiver ----------
const OC_MOTS = {
  pret: ['Bravo, c\'est prêt en avance. Tu dors tranquille.', 'Objectif atteint. Le reste de ce que tu gagnes peut avancer tes projets.', 'Prêt avant l\'heure : c\'est comme ça qu\'on construit un studio solide.'],
  avance: ['Tu es en avance sur ton plan. Continue comme ça.', 'Bon rythme. Chaque paiement client te rapproche du but.', 'Tu tiens le rythme, garde le cap.'],
  retard: ['Tu es un peu en retard, mais c\'est rattrapable : une ou deux séances de plus suffisent.', 'Pas de panique : un petit montant de côté à chaque paiement et tu rattrapes.', 'C\'est le moment de relancer tes clients et de proposer une offre rapide.'],
  depasse: ['Le jour limite est passé. On rattrape maintenant : chaque franc mis de côté compte.', 'Pas grave, on repart : vise d\'abord la moitié, puis le reste.', 'Concentre-toi sur les clients qui te doivent : c\'est l\'argent le plus rapide.']
};
function ocMot(s){ const L = OC_MOTS[s.statut] || OC_MOTS.avance; return L[(new Date().getDate() + s.c.id) % L.length]; }
const OC_LIB = { pret: 'Prêt', avance: 'Dans les temps', retard: 'En retard', depasse: 'Jour limite passé' };

function ocConseil(s){
  if(s.statut === 'pret') return `${F(s.T.reste)} sont prêts pour l'échéance du ${bgDateFr(s.cible, true)}.`;
  const bits = [];
  if(s.jours > 0) bits.push(`Mets environ ${F(s.parJour)} de côté par jour d'ici le ${ocD(s.limite)}`);
  if(s.P.n) bits.push(`ou ${F(s.parPaiement)} à chaque paiement client (environ ${s.nbPaiements} paiement${s.nbPaiements > 1 ? 's' : ''} attendu${s.nbPaiements > 1 ? 's' : ''} d'ici là)`);
  return bits.join(', ') + '.';
}

// ---------- Fiche d'un objectif ----------
function ocBarre(s){ return `<div class="oc-bar ${s.statut}"><i style="width:${Math.min(100, s.pct)}%"></i>${s.attendu && s.statut !== 'pret' ? `<em style="left:${Math.min(100, Math.round(s.attendu / Math.max(1, s.T.reste) * 100))}%"></em>` : ''}</div>`; }
function ocCarte(s){
  return `<div class="oc-card ${s.statut}" onclick="ocVoir(${s.c.id})">
    <div class="oc-h"><b>${E(ocTitre(s))} prêt avant le ${ocD(s.limite)}</b><span class="oc-chip ${s.statut}">${OC_LIB[s.statut]}</span></div>
    ${ocBarre(s)}
    <div class="oc-l"><span>Prêt <b class="ag-m">${F(s.pret)}</b> / ${F(s.T.reste)}</span><span>${s.manque > 0 ? `Manque <b class="ag-m">${F(s.manque)}</b>` : 'Complet'}${s.statut !== 'pret' && s.jours >= 0 ? ` · ${bgQuand(s.jours)}` : ''}</span></div>
    ${s.statut !== 'pret' ? `<small>${E(ocConseil(s))}</small>` : `<small>${E(ocMot(s))}</small>`}
  </div>`;
}
window.ocVoir = function(id){
  const c = BG.charges.find(x => x.id === id), s = ocEtat(c);
  if(!s){ bgChargeForm(id); return; }
  if(s.fini){ agToast('Tout est payé pour cette charge', 'info'); return; }
  const sea = s.manque > 0 && typeof bgSeancesPour === 'function' ? bgSeancesPour(s.manque) : null;
  agSheet('ocVue', `
    <h3>${E(ocTitre(s))}</h3>
    <div class="ag-hint" style="margin-top:0">Échéance le ${bgDateFr(s.cible, true)} · objectif : prêt avant le ${ocLimiteTexte(s)}${s.jours >= 0 ? ` (${bgQuand(s.jours)})` : ''}</div>
    <div class="oc-big ${s.statut}"><span>${OC_LIB[s.statut]}</span><b class="ag-m">${F(s.pret)}</b><small>prêts sur ${F(s.T.reste)}</small></div>
    ${ocBarre(s)}
    <div class="oc-mot">${E(ocMot(s))}</div>
    <div class="bg-sum">
      <div>Dans le coffre<b>${F(s.pool)}</b></div>
      <div>${s.avant ? 'Pour les charges d\'avant' : 'Déjà payé'}<b>${F(s.avant || (s.T.montant - s.T.reste))}</b></div>
      <div class="${s.manque > 0 ? 'red' : 'ok'}">Il manque<b>${F(s.manque)}</b></div>
      <div>Encaissé ce mois<b>${F(s.P.mois)}</b></div>
    </div>
    ${s.avant ? `<div class="ag-hint">Le coffre "${E(s.coffre ? s.coffre.name : '')}" garde d'abord ${F(s.avant)} pour les charges qui tombent avant.</div>` : ''}
    ${s.manque > 0 ? `<div class="oc-dir"><b>Ce que tu fais maintenant</b><ul>
      ${s.jours > 0 ? `<li>Garde <b>${F(s.parJour)}</b> par jour jusqu'au ${ocD(s.limite)}.</li>` : '<li>Mets de côté tout de suite ce que tu peux, même une petite somme.</li>'}
      ${s.P.n ? `<li>À chaque paiement client, range <b>${F(s.parPaiement)}</b> dans le coffre (tu reçois en moyenne ${F(s.P.moyen)} par paiement).</li>` : ''}
      ${sea && sea.n ? `<li>${E(sea.texte)}.</li>` : ''}
    </ul></div>` : ''}
    <div class="bg-btns">
      ${s.manque > 0 ? `<button class="btn-primary" style="margin:0" onclick="ocCote(${id})">Mettre de côté</button><button class="btn-ghost" style="margin:0" onclick="ocPlan(${id})">${agIcon('bulb', 15)} Plan rapide</button>` : ''}
    </div>
    <button class="btn-ghost" style="width:100%;margin-top:8px" onclick="agCloseSheet('ocVue');bgChargeForm(${id})">Modifier l'objectif</button>
  `);
};
window.ocCote = async function(id){
  const s = ocEtat(BG.charges.find(x => x.id === id)); if(!s) return;
  let cf = s.coffre; if(!cf) cf = await bgEnsureCoffre('charges');
  if(!cf) return;
  agCloseSheet('ocVue');
  agOpenTransfer({ toGoal: cf.id, amount: s.manque || '' });
  const n = document.getElementById('agTrNote'); if(n) n.value = ocTitre(s) + ' · objectif';
};

// ---------- Plan rapide ----------
function ocClientNom(sh){ const c = sh && sh.client_id && typeof clients !== 'undefined' ? clients.find(x => x.id === sh.client_id) : null; return c ? c.name : (sh.name || sh.title || 'Client'); }
function ocDettes(){
  return (typeof shoots !== 'undefined' ? shoots : []).filter(s => s.status !== 'annule' && s.payment !== 'paye' && Number(s.price) > 0)
    .map(s => ({ s, nom: ocClientNom(s), du: Math.max(0, Math.round(Number(s.price) - (Number(s.montant_recu) || 0))) })).filter(x => x.du > 0)
    .sort((a, b) => b.du - a.du);
}
function ocPrevues(limite){
  const t = bgToday();
  return (typeof shoots !== 'undefined' ? shoots : []).filter(s => s.status !== 'annule' && s.date && String(s.date).slice(0, 10) >= t && String(s.date).slice(0, 10) <= limite);
}
window.ocPlan = function(id){
  const s = ocEtat(BG.charges.find(x => x.id === id)); if(!s) return;
  const D = ocDettes(), totD = D.reduce((a, x) => a + x.du, 0);
  const P = ocPrevues(s.limite < bgToday() ? bgYmd(new Date(Date.now() + 14 * 864e5)) : s.limite);
  const sea = bgSeancesPour(Math.max(0, s.manque - totD));
  agCloseSheet('ocVue');
  agSheet('ocPlan', `
    <h3>Plan rapide : ${F(s.manque)} à trouver</h3>
    <div class="ag-hint" style="margin-top:0">Pour ${E(ocTitre(s))}, avant le ${ocLimiteTexte(s)}.</div>
    <div class="oc-step"><i>1</i><div><b>L'argent le plus rapide : les clients qui te doivent</b>
      ${D.length ? `<span>${D.length} client${D.length > 1 ? 's' : ''} te doi${D.length > 1 ? 'vent' : 't'} ${F(totD)} en tout. Relance-les aujourd'hui, poliment, avec la date de livraison.</span>
      <div class="oc-mini">${D.slice(0, 6).map(x => `<div><span>${E(x.nom)}${x.s.date ? ' · ' + bgDateFr(String(x.s.date).slice(0, 10)) : ''}</span><b class="ag-m">${F(x.du)}</b></div>`).join('')}</div>` : '<span>Personne ne te doit d\'argent en ce moment.</span>'}</div></div>
    <div class="oc-step"><i>2</i><div><b>Les séances déjà prévues avant le ${ocD(s.limite)}</b>
      <span>${P.length ? `${P.length} séance${P.length > 1 ? 's' : ''} prévue${P.length > 1 ? 's' : ''}. Demande un acompte à la réservation et garde ${F(s.parPaiement)} de chaque paiement.` : 'Aucune séance prévue d\'ici là : il faut en trouver.'}</span></div></div>
    <div class="oc-step"><i>3</i><div><b>Ce qu'il faut trouver en plus</b>
      <span>${s.manque - totD <= 0 ? 'Si tes clients paient ce qu\'ils doivent, c\'est couvert.' : sea && sea.n ? E(sea.texte) + '.' + (sea.detail ? ' ' + E(sea.detail) + '.' : '') : 'Ajoute tes tarifs pour savoir combien de séances il te faut.'}</span></div></div>
    <div class="oc-step"><i>4</i><div><b>Idées rapides pour trouver des clients</b>
      <span>Statut WhatsApp avec 3 belles photos et un prix clair · offre "mini-séance" 15 minutes à petit prix · rappeler tes anciens clients (anniversaire, fête qui arrive) · proposer des tirages à ceux déjà photographiés.</span></div></div>
    <button class="btn-primary" id="ocPlanBtn" style="margin-top:12px" onclick="ocPlanIA(${id})">${agIcon('sparkles', 15)} Plan détaillé de l'IA</button>
    <div id="ocPlanIA"></div>
  `);
};
window.ocPlanIA = async function(id){
  const s = ocEtat(BG.charges.find(x => x.id === id)); if(!s) return;
  const el = document.getElementById('ocPlanIA'), b = document.getElementById('ocPlanBtn');
  if(el) el.innerHTML = '<div class="ag-empty">Je prépare ton plan...</div>'; if(b) b.disabled = true;
  const D = ocDettes(), P = ocPrevues(s.limite), tarifs = (typeof CRM !== 'undefined' && Array.isArray(CRM.tarifs) ? CRM.tarifs : []).filter(p => p.active !== false).slice(0, 12).map(p => `${p.name} ${Math.round(p.price)} F`).join(', ');
  const sys = `Tu es le coach business de Henzo, photographe à Bouaké (Côte d'Ivoire). Français simple, sans jargon, tirets simples uniquement. Tu donnes un plan d'action concret, jour par jour si possible, réaliste pour Bouaké, avec des montants en FCFA. Motive-le sans exagérer. Pas plus de 12 lignes.`;
  const ctx = `Objectif : ${ocTitre(s)} (${Math.round(s.T.reste)} F) doit être prêt avant le ${s.limite}. Aujourd'hui : ${bgToday()}. Prêt : ${s.pret} F. Il manque ${s.manque} F. Jours restants : ${s.jours}.
Paiements clients sur 60 jours : ${s.P.n} paiements, ${Math.round(s.P.total)} F, moyenne ${s.P.moyen} F. Encaissé ce mois : ${Math.round(s.P.mois)} F.
Clients qui doivent de l'argent : ${D.length ? D.slice(0, 8).map(x => `${x.nom} ${x.du} F`).join(', ') : 'aucun'}.
Séances prévues d'ici là : ${P.length}.
Tarifs : ${tarifs || 'non renseignés'}.
${typeof bgChargesContexte === 'function' ? bgChargesContexte() : ''}
Donne : 1) quoi faire aujourd'hui, 2) cette semaine, 3) une offre rapide à proposer avec prix, 4) une phrase de motivation.`;
  try {
    const r = await mkAI({ system: sys, messages: [{ role: 'user', text: ctx }], maxTokens: 900 });
    const t = typeof txtDefancy === 'function' ? txtDefancy(r.text || '') : (r.text || '');
    if(el) el.innerHTML = `<div class="ap-ia oc-ia"><div>${E(bgNoDash(t)).replace(/\n/g, '<br>')}</div></div>`;
  } catch(e){ if(el) el.innerHTML = `<div class="ag-hint warn">L'IA n'a pas pu répondre : ${E(e.message || e)}</div>`; }
  if(b) b.disabled = false;
};

// ---------- Dans la fiche d'une charge : régler l'objectif ----------
function ocExemple(jour, dueJ){
  const J = Number(jour) || 15, d = Number(dueJ) || 5;
  return J < d ? `Ex : la charge du ${d} devra être prête dès le ${J} du même mois.` : `Ex : la charge du ${d} devra être prête le ${J} du mois d'avant (le loyer du ${d} décembre, prêt le ${J} novembre).`;
}
const formOc = bgChargeForm;
bgChargeForm = function(id){
  const r = formOc.apply(this, arguments);
  try {
    const sh = document.getElementById('bgChForm'), btn = sh && sh.querySelector('.btn-primary'); if(!btn) return r;
    const c = id ? BG.charges.find(x => x.id === id) : null, o = ocObj(c) || (c && c.objectif) || {};
    const coffresOk = agCoffres().filter(x => !estCoffreBloque(x) || (o.coffre_id && x.id === Number(o.coffre_id)));
    const cfCh = bgFindCoffre('charges');
    const d = document.createElement('div'); d.className = 'oc-form'; d.id = 'ocForm';
    d.innerHTML = `<label class="ag-check"><input type="checkbox" id="ocOn" ${o.actif ? 'checked' : ''} onchange="ocFormMaj()"> Avoir cette charge prête à l'avance</label>
      <div id="ocBox" style="${o.actif ? '' : 'display:none'}">
        <label for="ocJour">Prête avant le (jour du mois)</label>
        <input id="ocJour" type="number" inputmode="numeric" min="1" max="31" value="${Number(o.jour) || 15}" oninput="ocFormMaj()">
        <div class="ag-hint" id="ocEx"></div>
        <label for="ocCf">Où garder cet argent ?</label>
        <select id="ocCf"><option value="">Coffre "${E(cfCh ? cfCh.name : BG_NOM_CHARGES)}" (avec les autres charges)</option>${coffresOk.filter(x => !cfCh || x.id !== cfCh.id).map(x => `<option value="${x.id}" ${Number(o.coffre_id) === x.id ? 'selected' : ''}>Coffre ${E(x.name)}</option>`).join('')}</select>
      </div>`;
    btn.insertAdjacentElement('beforebegin', d);
    ocFormMaj();
  } catch(e){ console.warn('oc form', e); }
  return r;
};
window.ocFormMaj = function(){
  const on = document.getElementById('ocOn'), box = document.getElementById('ocBox'); if(!on || !box) return;
  const hebdo = (document.querySelector('#bgChFreq button.on') || {}).dataset?.k === 'hebdo';
  document.getElementById('ocForm').style.display = hebdo ? 'none' : '';
  box.style.display = on.checked ? '' : 'none';
  const ex = document.getElementById('ocEx'); if(ex) ex.textContent = ocExemple(document.getElementById('ocJour').value, document.getElementById('bgChJour') && document.getElementById('bgChJour').value);
};
if(typeof bgChFreqMaj === 'function'){
  const freqOc = bgChFreqMaj;
  bgChFreqMaj = function(){ const r = freqOc.apply(this, arguments); try { ocFormMaj(); } catch(e){} return r; };
}
function ocLireForm(){
  const on = document.getElementById('ocOn'); if(!on) return undefined;
  if(!on.checked) return { actif: false, jour: Math.round(Number(document.getElementById('ocJour').value) || 15) };
  const j = Math.round(Number(document.getElementById('ocJour').value) || 0);
  const cf = Number(document.getElementById('ocCf').value) || null;
  return { actif: true, jour: Math.max(1, Math.min(31, j || 15)), coffre_id: cf };
}
const saveOc = bgChargeSave;
bgChargeSave = async function(id){
  const obj = ocLireForm();
  const avantIds = BG.charges.map(x => x.id), avantObj = id ? BG.charges.find(x => x.id === id) : null;
  const r = await saveOc.apply(this, arguments);
  if(obj === undefined) return r;
  try {
    let c = id ? BG.charges.find(x => x.id === id) : BG.charges.find(x => !avantIds.includes(x.id));
    if(!c || (id && c === avantObj)) return r; // pas enregistré (erreur de saisie)
    const old = ocObj(c) || {};
    if(JSON.stringify({ a: !!old.actif, j: old.jour, c: old.coffre_id || null }) === JSON.stringify({ a: !!obj.actif, j: obj.jour, c: obj.coffre_id || null }) && !!old.actif === !!obj.actif) return r;
    const u = await dbUpdate('charges_fixes', c.id, { objectif: obj });
    if(u){ const i = BG.charges.findIndex(x => x.id === c.id); if(i >= 0) BG.charges[i] = u; bgRefresh(); if(obj.actif) agToast(`Objectif : ${c.nom} prêt avant le ${obj.jour}`); }
  } catch(e){ console.warn('oc save', e); }
  return r;
};

// ---------- Dans la vue des charges ----------
const htmlOc = bgChargesHtml;
bgChargesHtml = function(){
  const h = htmlOc.apply(this, arguments);
  try {
    if(!BG.loaded) return h;
    const S = ocEtats();
    const logement = BG.charges.find(c => c.actif !== false && c.frequence !== 'hebdo' && /loyer|logement/i.test(c.nom + ' ' + (c.categorie || ''))) || BG.charges.find(c => c.actif !== false && c.frequence !== 'hebdo');
    const bloc = S.length ? `<div class="ag-sec" style="margin-top:16px"><h3>Mes objectifs d'avance</h3></div>${S.map(ocCarte).join('')}`
      : logement ? `<div class="bg-tip oc-tip" onclick="bgChargeForm(${logement.id})"><b>Prendre de l'avance</b><br>Fixe un objectif, par exemple : "${E(logement.nom)} prêt avant le 15 du mois d'avant". L'app suit tes revenus et te dit combien garder. <u>Régler</u></div>` : '';
    if(!bloc) return h;
    const k = h.indexOf('<div class="ag-sec" style="margin-top:16px"><h3>Ce mois-ci');
    return k >= 0 ? h.slice(0, k) + bloc + h.slice(k) : bloc + h;
  } catch(e){ console.warn('oc html', e); return h; }
};
// Carte "Charges du mois" de l'onglet Argent : rappel de l'objectif
const injOc = bgInjectArgent;
bgInjectArgent = function(){
  const r = injOc.apply(this, arguments);
  try {
    const S = ocEtats().filter(s => s.statut !== 'pret').sort((a, b) => a.jours - b.jours);
    const sp = document.querySelector('#agArgentBody .bg-zone .bg-card:last-child .d span');
    if(S.length && sp) sp.insertAdjacentHTML('beforeend', `<br><em class="oc-em">${E(S[0].c.nom)} : ${F(S[0].manque)} à mettre de côté avant le ${ocD(S[0].limite)}</em>`);
  } catch(e){}
  return r;
};

// ---------- Accueil ----------
if(typeof agRenderDashMini === 'function'){
  const dashOc = agRenderDashMini;
  agRenderDashMini = function(){
    const r = dashOc.apply(this, arguments);
    try {
      const el = document.getElementById('agDashMini'); if(!el || !BG.loaded) return r;
      const old = document.getElementById('ocDash'); if(old) old.remove();
      const S = ocEtats().filter(s => s.statut !== 'pret' && s.jours <= 20).sort((a, b) => a.jours - b.jours);
      if(!S.length) return r;
      const s = S[0], d = document.createElement('div'); d.id = 'ocDash'; d.className = 'crm-fete oc-dash ' + s.statut;
      d.onclick = () => ocVoir(s.c.id);
      d.innerHTML = `<div class="ic">${agIcon('home')}</div><div class="d"><b>${E(s.c.nom)} prêt avant le ${ocD(s.limite)} : ${s.pct} %</b><span>${s.manque > 0 ? `Il manque ${F(s.manque)}` : ''}${s.jours >= 0 ? ' · ' + bgQuand(s.jours) : ''}${s.jours > 0 ? ` · ${F(s.parJour)} par jour` : ''}</span>${ocBarre(s)}</div>${agIcon('chev', 16)}`;
      const ref = el.querySelector('#apBudgetDash') || el.querySelector('#otResaDash') || el.querySelector('.ag-hello');
      if(ref && ref.nextSibling) el.insertBefore(d, ref.nextSibling); else el.appendChild(d);
    } catch(e){ console.warn('oc dash', e); }
    return r;
  };
}

// ---------- Répartition d'un paiement : remplir aussi l'objectif ----------
const suggOc = bgRepSuggestion;
bgRepSuggestion = function(){
  const r = suggOc.apply(this, arguments);
  OC.rep = null;
  try {
    const S = ocEtats().filter(s => s.manque > 0).sort((a, b) => a.jours - b.jours);
    if(!S.length || !document.getElementById('repValiderBtn')) return r;
    const s = S[0];
    const res = bgChargesResume(), mois = Math.max(0, res.manque);
    // Ce qui est déjà compté dans le manque du mois (même coffre) ne compte pas deux fois
    const enPlus = Math.max(0, s.manque - (s.T.periode === res.mois && !s.o.coffre_id ? mois : 0));
    if(!(enPlus > 0)) return r;
    const studio = Math.round(parseFloat(document.getElementById('repStudioMontant')?.value) || 0);
    OC.rep = { id: s.c.id, max: enPlus };
    let d = document.getElementById('bgRepSugg');
    if(d){
      const inp = document.getElementById('bgRepMt');
      const x = Math.min(mois + Math.min(enPlus, s.parPaiement || enPlus), studio > 0 ? studio : mois + enPlus);
      if(inp) inp.value = x;
      d.querySelector('b').insertAdjacentHTML('afterend', `<span class="oc-rep"> + ton objectif "${E(s.c.nom)} prêt avant le ${ocD(s.limite)}" (manque ${F(s.manque)})</span>`);
    } else {
      const x = Math.min(Math.min(enPlus, s.parPaiement || enPlus), studio > 0 ? studio : enPlus);
      d = document.createElement('div'); d.id = 'bgRepSugg'; d.className = 'bg-rep';
      d.innerHTML = `<b>Mettre ${F(x)} de côté pour ${E(ocTitre(s))}</b> (objectif : prêt avant le ${ocD(s.limite)}, il manque ${F(s.manque)}).
        <div class="row"><input id="bgRepMt" type="number" inputmode="decimal" value="${x}" aria-label="Montant pour l'objectif">
        <button type="button" id="bgRepBtn" onclick="bgRepToggle()">Oui, après la validation</button></div>
        <small>L'argent est pris sur la part Studio et va dans le coffre "${E(s.coffre ? s.coffre.name : BG_NOM_CHARGES)}", juste après la validation. Les 3 parts ne changent pas.</small>`;
      document.getElementById('repValiderBtn').insertAdjacentElement('beforebegin', d);
    }
  } catch(e){ console.warn('oc rep', e); }
  return r;
};
const apresOc = bgRepApres;
bgRepApres = async function(studioId, montant){
  const res = bgChargesResume(), rep = OC.rep; OC.rep = null;
  montant = Math.round(montant || 0);
  const p1 = Math.min(montant, Math.max(0, res.manque));
  if(p1 > 0) await apresOc.call(this, studioId, p1);
  const reste = montant - p1;
  if(!(reste > 0) || !rep || !studioId) return;
  const s = ocEtat(BG.charges.find(x => x.id === rep.id)); if(!s || !(s.manque > 0)) return;
  const st = coffres.find(x => x.id === studioId);
  const cf = s.coffre || await bgEnsureCoffre('charges');
  if(!st || !cf || st.id === cf.id) return;
  const m = Math.min(reste, s.manque, Math.round(Number(st.current) || 0));
  if(!(m > 0)) return;
  const tr = await bgTransfert({ from: { goal_id: st.id }, to: { goal_id: cf.id }, amount: m, note: ocTitre(s) + ' · objectif, après la répartition', date: bgToday(), details: 'bgcharges' });
  if(!tr) return;
  bgRefresh();
  agToast(`${F(m)} de côté pour ${s.c.nom} (${st.name} → ${cf.name})`);
};

// L'IA du coach et des autres outils voit aussi les objectifs
const ctxOc = bgChargesContexte;
bgChargesContexte = function(){
  const t = ctxOc.apply(this, arguments);
  try { const S = ocEtats(); if(S.length) return t + ' Objectifs d\'avance : ' + S.map(s => `${ocTitre(s)} prêt avant le ${s.limite} (${s.pct} %, manque ${s.manque} F)`).join(' ; ') + '.'; } catch(e){}
  return t;
};
window.bgChargesContexte = bgChargesContexte;

(function ocCss(){
  if(document.getElementById('ocCss')) return;
  const st = document.createElement('style'); st.id = 'ocCss';
  st.textContent = `
.oc-card{padding:12px;border-radius:14px;background:var(--card2);border:1px solid var(--border);margin:8px 0;cursor:pointer}
.oc-card.retard,.oc-card.depasse{border-color:rgba(245,165,36,.55)}.oc-card.pret{border-color:rgba(52,199,89,.5)}
.oc-h{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}.oc-h b{font-size:13.5px;color:var(--text)}
.oc-chip{flex-shrink:0;font-size:11px;font-weight:700;padding:3px 8px;border-radius:99px;background:var(--card);color:var(--muted)}
.oc-chip.pret{background:rgba(52,199,89,.15);color:#34c759}.oc-chip.avance{background:rgba(52,199,89,.12);color:#34c759}
.oc-chip.retard{background:rgba(245,165,36,.15);color:#f5a524}.oc-chip.depasse{background:rgba(255,69,58,.15);color:#ff453a}
.oc-bar{position:relative;height:8px;border-radius:99px;background:var(--card);overflow:visible;margin:8px 0 6px}
.oc-bar i{display:block;height:100%;border-radius:99px;background:var(--accent)}.oc-bar.pret i,.oc-bar.avance i{background:#34c759}.oc-bar.retard i{background:#f5a524}.oc-bar.depasse i{background:#ff453a}
.oc-bar em{position:absolute;top:-3px;width:2px;height:14px;background:var(--text);opacity:.6}
.oc-l{display:flex;justify-content:space-between;gap:8px;font-size:12.5px;color:var(--muted)}.oc-l b{color:var(--text)}
.oc-card small{display:block;margin-top:6px;font-size:12px;color:var(--muted);line-height:1.4}
.oc-big{text-align:center;margin:10px 0 4px}.oc-big span{display:block;font-size:12px;font-weight:700;color:var(--muted)}.oc-big b{display:block;font-size:28px;color:var(--text)}.oc-big small{color:var(--muted)}
.oc-big.retard span{color:#f5a524}.oc-big.depasse span{color:#ff453a}.oc-big.pret span,.oc-big.avance span{color:#34c759}
.oc-mot{text-align:center;font-size:13px;color:var(--text);margin:6px 0 12px;font-style:italic}
.oc-dir{margin-top:12px;padding:12px;border-radius:12px;background:var(--card2)}.oc-dir b{color:var(--text)}.oc-dir ul{margin:6px 0 0;padding-left:18px;color:var(--muted);font-size:13px;line-height:1.5}
.oc-step{display:flex;gap:10px;margin:12px 0}.oc-step>i{flex-shrink:0;width:24px;height:24px;border-radius:50%;background:var(--accent);color:#fff;font-style:normal;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center}
.oc-step b{display:block;color:var(--text);font-size:13.5px}.oc-step span{display:block;color:var(--muted);font-size:12.5px;line-height:1.45;margin-top:2px}
.oc-mini{margin-top:6px}.oc-mini div{display:flex;justify-content:space-between;font-size:12.5px;padding:4px 0;border-bottom:1px solid var(--border);color:var(--muted)}.oc-mini b{color:var(--text)}
.oc-form{margin-top:12px;padding:10px 12px;border-radius:12px;background:var(--card2)}
.oc-tip{cursor:pointer}.oc-em{font-style:normal;color:#f5a524}.oc-rep{color:var(--muted)}
#ocVue .bg-btns button,#ocPlan .btn-primary{display:inline-flex;align-items:center;justify-content:center;gap:6px}
.oc-dash .oc-bar{margin:6px 0 0;height:6px}.oc-ia{margin-top:12px}`;
  document.head.appendChild(st);
})();
try { if(BG.loaded && typeof agRenderArgent === 'function') agRenderArgent(); } catch(e){}
})();
