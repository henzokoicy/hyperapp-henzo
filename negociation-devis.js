// ============================================================
// NEGOCIATION-DEVIS.JS - Coach > Négocier : devis jour par jour
// - Demande : message du client (lu par l'IA) et/ou petite fiche
//   (jours, photo / vidéo par jour, lieu, prix du client facultatif)
// - Analyse : calcul avec les vrais packs (table tarifs), détail
//   par jour, 3 ou 4 offres, prix conseillé, plancher, raisons
// - Discussion avec l'IA (mkAI + mkJson) qui ajuste l'offre
// Règle enveloppe : coNegoForm, coNegoAnaView, coNegoTpl de
// coach2.js sont enveloppés, l'ancien code n'est pas réécrit.
// Aucune nouvelle table : le devis est rangé dans
// negociations.analyse_ia (colonne existante, texte JSON).
// ============================================================
(function(){
if(typeof coNegoForm !== 'function' || typeof coNegoAnaView !== 'function') return;

const ND_E = s => (typeof agEsc === 'function' ? agEsc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
const ND_F = n => (typeof agF === 'function' ? agF(Math.round(Number(n) || 0)) : (Math.round(Number(n) || 0)).toLocaleString('fr-FR') + ' F');
const ND_N = n => (typeof agN === 'function' ? agN(Math.round(Number(n) || 0)) : (Math.round(Number(n) || 0)).toLocaleString('fr-FR'));
const ND_I = (n, s) => (typeof agIcon === 'function' ? agIcon(n, s) : '');
const ND_R = n => Math.round((Number(n) || 0) / 1000) * 1000;
const ND_TOAST = (m, t) => { if(typeof agToast === 'function') agToast(m, t); };
const ND_CLEAN = s => (typeof coClean === 'function' ? coClean(s) : String(s == null ? '' : s));
const ND_NOMS = { 3: ['Économique', 'Normale', 'Complète'], 4: ['Économique', 'Normale', 'Confort', 'Complète'] };
const ND_MAR = /mariage|wedding|noce|\bdot\b/i;

// ---------- Données ----------
function ndCols(){ return (typeof PX !== 'undefined' && Array.isArray(PX.cols) ? PX.cols : []).filter(c => c.actif !== false).slice().sort((a, b) => ((Number(a.position) || 0) - (Number(b.position) || 0)) || (a.id - b.id)); }
function ndFormules(){ return (typeof CRM !== 'undefined' && Array.isArray(CRM.tarifs) ? CRM.tarifs : []).filter(t => (t.kind || 'formule') === 'formule' && t.active !== false && Number(t.price) > 0); }
function ndOptions(){ return (typeof CRM !== 'undefined' && Array.isArray(CRM.tarifs) ? CRM.tarifs : []).filter(t => t.kind === 'option' && t.active !== false); }
function ndDefaultCol(){ const c = ndCols().find(x => ND_MAR.test(x.nom || '')); return c ? c.id : null; }
// Packs utilisés pour le calcul : ceux de la collection choisie, sinon tous les packs "mariage"
function ndPacks(dv){
  const all = ndFormules();
  let L = dv && dv.col ? all.filter(t => t.collection_id === dv.col) : [];
  if(!L.length) L = all.filter(t => ND_MAR.test(`${t.name || ''} ${t.category || ''}`) || ndCols().some(c => c.id === t.collection_id && ND_MAR.test(c.nom || '')));
  return L.sort((a, b) => Number(a.price) - Number(b.price));
}
function ndHasVideo(t){
  const d = t.details && typeof t.details === 'object' ? t.details : {};
  if(d.video === false) return false;
  if(d.video) return true;
  return /vid[ée]o|film|clip|cam[ée]ra/i.test(`${t.name || ''} ${t.includes || ''} ${d.equipe || ''}`);
}
function ndColNom(dv){ const c = ndCols().find(x => x.id === dv.col); return c ? c.nom : 'Mariage'; }
function ndShare(){ try { return typeof pxShare === 'function' ? Number(pxShare()) || 0 : 0; } catch(e){ return 0; } }

function ndNew(n){
  return { msg: '', jours: [{ nom: 'Jour 1', photo: true, video: false }], lieu: '', prix_client: n && Number(n.budget) > 0 ? Number(n.budget) : '', extras: [], remise: 15,
    choix: 1, prixIA: null, chat: [], notes: [], col: (n && n.collection_id) || ndDefaultCol(), lu: false };
}
function ndGet(n){
  if(!n) return null;
  if(!n.dv) n.dv = n.ana && n.ana.devis ? JSON.parse(JSON.stringify(n.ana.devis)) : ndNew(n);
  return n.dv;
}

// ---------- Calcul ----------
// Niveaux de prix tirés des packs : photo seule (P) et photo + vidéo (V)
function ndNiveaux(dv){
  const L = ndPacks(dv); if(!L.length) return null;
  const ph = L.filter(t => !ndHasVideo(t)), vi = L.filter(ndHasVideo);
  const N = Math.min(4, Math.max(3, L.length)), noms = ND_NOMS[N];
  // Prix entre deux packs (interpolation), pack le plus proche pour le nom
  const at = (arr, q, key) => { const x = q * (arr.length - 1), i = Math.floor(x), j = Math.min(arr.length - 1, i + 1), f = x - i;
    const a = Number(arr[i][key]) || 0, b = Number(arr[j][key]) || 0; return a + (b - a) * f; };
  const near = (arr, q) => arr[Math.round(q * (arr.length - 1))];
  const share = ndShare(), out = [];
  for(let k = 0; k < N; k++){
    const q = N > 1 ? k / (N - 1) : 0;
    const pp = ph.length ? near(ph, q) : null, vp = vi.length ? near(vi, q) : null;
    let P = ph.length ? ND_R(at(ph, q, 'price')) : ND_R(at(vi, q, 'price') * 0.6);
    let V = vi.length ? ND_R(at(vi, q, 'price')) : ND_R(P * 1.6);
    if(out.length){ const pr = out[out.length - 1]; if(P < pr.P * 1.1) P = ND_R(pr.P * 1.1); if(V < pr.V * 1.1) V = ND_R(pr.V * 1.1); }
    if(V < P * 1.3) V = ND_R(P * 1.3);
    const Vs = Math.max(ND_R(V - P), ND_R(V * 0.4));
    const cP = ph.length && ph.every(t => Number(t.cost) > 0) ? at(ph, q, 'cost') : null, cV = vi.length && vi.every(t => Number(t.cost) > 0) ? at(vi, q, 'cost') : null;
    const exact = (pk, v) => pk && Number(pk.price) === v;
    out.push({ k, nom: noms[k], P, V, Vs, packP: exact(pp, P) ? pp.name : pp ? 'proche de ' + pp.name : '', packV: exact(vp, V) ? vp.name : vp ? 'proche de ' + vp.name : '', coutP: cP, coutV: cV, share });
  }
  return { niv: out, packs: L, estime: !ph.length || !vi.length };
}
function ndJourBase(j, lv){ return j.photo && j.video ? lv.V : j.photo ? lv.P : j.video ? lv.Vs : 0; }
function ndJourType(j){ return j.photo && j.video ? 'Photo + vidéo' : j.photo ? 'Photo' : j.video ? 'Vidéo' : 'Rien de choisi'; }
function ndOffre(dv, lv){
  const base = dv.jours.map(j => ndJourBase(j, lv));
  let main = -1; base.forEach((b, i) => { if(main < 0 || b > base[main]) main = i; });
  const r = Math.max(0, Math.min(50, Number(dv.remise) || 0)) / 100;
  const jours = dv.jours.map((j, i) => ({ nom: j.nom || `Jour ${i + 1}`, type: ndJourType(j), prix: i === main ? base[i] : ND_R(base[i] * (1 - r)), plein: base[i], principal: i === main }));
  const ext = (dv.extras || []).reduce((a, x) => a + (Number(x.prix) || 0), 0);
  return { k: lv.k, nom: lv.nom, jours, extras: ext, total: jours.reduce((a, x) => a + x.prix, 0) + ext };
}
// Plancher : coûts réels des packs (si connus) + part des charges fixes, par jour
function ndPlancher(dv, lv0){
  let est = false;
  const t = dv.jours.reduce((a, j) => {
    const prix = ndJourBase(j, lv0); if(!prix) return a;
    let c = j.photo && j.video ? lv0.coutV : j.photo ? lv0.coutP : lv0.coutV != null ? lv0.coutV * 0.5 : null;
    if(c == null){ c = prix * 0.6; est = true; return a + c; }
    return a + c + lv0.share;
  }, 0);
  const ext = (dv.extras || []).reduce((a, x) => a + (Number(x.cout) > 0 ? Number(x.cout) : (Number(x.prix) || 0) * 0.5), 0);
  return { val: ND_R(t + ext), estime: est };
}
function ndCalc(n){
  const dv = ndGet(n), N = ndNiveaux(dv);
  if(!N) return null;
  const offres = N.niv.map(lv => ndOffre(dv, lv));
  const pl = ndPlancher(dv, N.niv[0]);
  if(dv.choix == null || dv.choix >= offres.length) dv.choix = Math.min(1, offres.length - 1);
  const ch = offres[dv.choix];
  let conseil = ch.total, iaBas = false;
  if(Number(dv.prixIA) > 0){ conseil = Math.max(ND_R(dv.prixIA), pl.val); iaBas = Number(dv.prixIA) < pl.val; }
  conseil = Math.max(conseil, pl.val);
  const cl = Number(dv.prix_client) || 0, eco = offres[0];
  let verdict = 'inconnu', titre = 'Devis prêt', expl = `Prix conseillé : ${ND_F(conseil)} pour l'offre ${ch.nom}, ${dv.jours.length} jour${dv.jours.length > 1 ? 's' : ''}.`;
  const alertes = [];
  if(cl){
    if(cl >= conseil * 0.95){ verdict = 'bon'; titre = 'Bon prix'; expl = `Le client propose ${ND_F(cl)} : c'est au niveau de ton prix conseillé (${ND_F(conseil)}). Tu peux accepter.`; }
    else if(cl < pl.val){ verdict = 'bas'; titre = 'Trop bas : danger'; expl = `Avec ${ND_F(cl)}, tu perds de l'argent. Ton plancher est ${ND_F(pl.val)}. Refuse ce prix, ou retire des jours ou la vidéo.`;
      alertes.push(`ATTENTION : ${ND_F(cl)} est sous ton plancher (${ND_F(pl.val)}). À ce prix, tu travailles à perte.`); }
    else if(cl < eco.total * 0.9){ verdict = 'bas'; titre = 'Risqué'; expl = `${ND_F(cl)} est en dessous de ton offre la moins chère (${ND_F(eco.total)}). Tu ne perds pas d'argent, mais tu gagnes très peu. Propose l'offre ${eco.nom} ou retire quelque chose.`;
      alertes.push(`Prix risqué : tu gagnes très peu à ${ND_F(cl)}. Ne descends pas plus bas que ${ND_F(pl.val)}.`); }
    else { verdict = 'acceptable'; titre = 'Acceptable si...'; expl = `${ND_F(cl)} est en dessous de ton prix conseillé (${ND_F(conseil)}). Accepte seulement en retirant quelque chose, ou propose l'offre ${(offres.filter(o => o.total <= cl * 1.05).pop() || eco).nom}.`; }
  }
  if(pl.estime) alertes.push('Plancher estimé : mets le coût de tes packs mariage dans Tarifs pour un calcul exact.');
  if(N.estime) alertes.push('Il manque un pack photo seule ou un pack photo + vidéo dans tes tarifs : une partie des prix est estimée.');
  if(iaBas) alertes.push(`L'IA proposait ${ND_F(dv.prixIA)}, sous ton plancher : j'ai remonté à ${ND_F(pl.val)}.`);
  if(dv.jours.some(j => !j.photo && !j.video)) alertes.push('Un jour n\'a ni photo ni vidéo : il compte 0 F.');
  if(dv.lieu && !/bouak/i.test(dv.lieu)) alertes.push(`Lieu : ${dv.lieu}. Hors Bouaké, ajoute le transport et l'hébergement en extra.`);
  // Raisons : comment le prix est calculé
  const lv = N.niv[dv.choix], raisons = [];
  raisons.push(`Base : tes packs ${ndColNom(dv)} (${N.packs.slice(0, 5).map(t => `${t.name} ${ND_F(t.price)}`).join(', ')}).`);
  raisons.push(`Offre ${lv.nom} : un jour photo = ${ND_F(lv.P)}${lv.packP ? ' (' + lv.packP + ')' : ' (estimé)'}, un jour photo + vidéo = ${ND_F(lv.V)}${lv.packV ? ' (' + lv.packV + ')' : ' (estimé)'}, la vidéo seule = ${ND_F(lv.Vs)}.`);
  if(dv.jours.length > 1) raisons.push(`Le plus gros jour est au prix plein. Les autres jours ont -${Number(dv.remise) || 0} % : tu es déjà avec le même client.`);
  if(ch.extras) raisons.push(`Extras : ${(dv.extras || []).map(x => `${x.nom} ${ND_F(x.prix)}`).join(', ')}.`);
  raisons.push(`Plancher ${ND_F(pl.val)}${pl.estime ? ' (estimé)' : ''} : tes coûts + ta part de charges fixes. En dessous, tu perds de l'argent.`);
  if(Number(dv.prixIA) > 0) raisons.push(`Prix ajusté avec l'IA : ${ND_F(conseil)} au lieu de ${ND_F(ch.total)}.`);
  const aj = [];
  if(dv.jours.some(j => j.video)) aj.push('Retirer la vidéo sur un jour moins important');
  if(dv.jours.length > 1) aj.push('Retirer un jour (garder seulement le grand jour)');
  if(offres[dv.choix - 1]) aj.push(`Passer à l'offre ${offres[dv.choix - 1].nom} (${ND_F(offres[dv.choix - 1].total)})`);
  if((dv.extras || []).length) aj.push('Retirer un extra (album, tirages...)');
  aj.push('Paiement en 2 ou 3 fois, avec un acompte pour bloquer les dates');
  return { verdict, titre, explication: expl, ref: ch.total, prix_conseille: conseil, plancher: pl.val, plancher_estime: pl.estime, budget: cl, ajustements: aj, alertes, conseils: [],
    petit: offres[0] && offres[0].k !== dv.choix ? { name: 'offre ' + offres[0].nom, price: offres[0].total } : null, pack_id: null, col: ndColNom(dv), source: dv.chat.length ? 'ia' : 'app',
    offres, raisons, choix: dv.choix };
}
function ndResume(dv){
  return `${ndColNom(dv)} ${dv.jours.length} jour${dv.jours.length > 1 ? 's' : ''} : ${dv.jours.map((j, i) => `${j.nom || 'Jour ' + (i + 1)} ${ndJourType(j).toLowerCase()}`).join(', ')}${dv.extras.length ? ' + ' + dv.extras.map(x => x.nom).join(', ') : ''}${dv.lieu ? ' (' + dv.lieu + ')' : ''}`;
}
// Met à jour CO.nego.ana (compatible avec les autres étapes de coach2.js)
function ndApply(n, keepMsgs){
  const dv = ndGet(n), c = ndCalc(n); if(!c) return false;
  const old = n.ana || {};
  n.ana = { ...c, messages: keepMsgs ? old.messages : undefined, devis: JSON.parse(JSON.stringify(dv)) };
  if(!keepMsgs) n.msgs = {};
  n.travail = ndResume(dv); n.budget = Number(dv.prix_client) > 0 ? Number(dv.prix_client) : '';
  n.collection_id = dv.col || n.collection_id || null; n.prix_ref = c.ref;
  return true;
}
let ndT = null;
function ndSaveSoon(){ clearTimeout(ndT); ndT = setTimeout(() => { if(typeof coNegoSave === 'function') coNegoSave(); }, 700); }
function ndChange(){ const n = CO.nego; if(!n) return; const dv = ndGet(n); dv.prixIA = null; ndApply(n); ndSaveSoon(); coNegoRefresh(); }

// ---------- 1. Demande ----------
const _ndForm = coNegoForm;
coNegoForm = function(s){
  const n = CO.nego;
  if(!n || n.ndVieux) return _ndForm.apply(this, arguments);
  const dv = ndGet(n), cols = ndCols(), packs = ndPacks(dv);
  const cl = (typeof clients !== 'undefined' ? clients : []).filter(c => (typeof estClient !== 'function' || estClient(c)) || c.id === n.client_id).slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const busy = CO.busy === 'nd-lire';
  s.innerHTML = `<div class="co-card co-form nd-form">
    <label>Client</label>
    <select id="coNCl" onchange="coNegoClient(this.value)"><option value="">Client pas encore enregistré</option>${cl.map(c => `<option value="${c.id}" ${n.client_id === c.id ? 'selected' : ''}>${ND_E(c.name)}</option>`).join('')}</select>
    ${n.client_id ? '' : `<input id="coNNom" placeholder="Nom du client" value="${ND_E(n.client_nom)}" oninput="CO.nego.client_nom=this.value">`}
    ${n.client_id && typeof coNegoClientInfo === 'function' ? coNegoClientInfo(n.client_id) : ''}
    ${cols.length ? `<label>Type d'événement (tes tarifs)</label>
      <div class="ag-pills">${cols.map(c => `<button class="${dv.col === c.id ? 'on' : ''}" onclick="ndSetCol(${c.id})">${ND_E(c.nom)}</button>`).join('')}</div>` : ''}
    ${packs.length ? `<div class="ag-hint">Prix utilisés : ${packs.slice(0, 5).map(t => `${ND_E(t.name)} <b>${ND_F(t.price)}</b>`).join(' · ')}</div>`
      : `<div class="ag-hint co-red">Aucun pack trouvé pour ce type d'événement. Ajoute tes packs mariage dans Tarifs, ou choisis un autre type.</div>`}
    <div class="nd-sec">${ND_I('chat', 16)} <b>Message du client</b></div>
    <textarea id="ndMsg" rows="4" placeholder="Colle ici le message du client. Ex : Bonjour, mon mariage dure 3 jours : la dot vendredi, la mairie samedi avec photo et vidéo, l'église dimanche..." oninput="ndGet(CO.nego).msg=this.value">${ND_E(dv.msg)}</textarea>
    <button class="nd-btn2" onclick="ndLire()" ${busy ? 'disabled' : ''}>${ND_I('sparkles', 15)} ${busy ? 'Je lis le message...' : 'Lire le message et remplir la fiche'}</button>
    ${(dv.notes || []).length ? `<div class="ag-hint">${ND_I('info', 13)} ${dv.notes.map(ND_E).join(' · ')}</div>` : ''}
    <div class="nd-sec">${ND_I('calendar', 16)} <b>La fiche</b></div>
    <div class="nd-count"><span>Nombre de jours</span><button onclick="ndJours(-1)" aria-label="Un jour de moins">-</button><b>${dv.jours.length}</b><button onclick="ndJours(1)" aria-label="Un jour de plus">+</button></div>
    ${dv.jours.map((j, i) => `<div class="nd-jour">
      <input value="${ND_E(j.nom)}" placeholder="Jour ${i + 1} (ex : dot, mairie, église)" oninput="ndGet(CO.nego).jours[${i}].nom=this.value">
      <div class="ag-pills"><button class="${j.photo ? 'on' : ''}" onclick="ndTog(${i},'photo',1)">${ND_I('camera', 14)} Photo</button><button class="${j.video ? 'on' : ''}" onclick="ndTog(${i},'video',1)">${ND_I('play', 14)} Vidéo</button></div>
    </div>`).join('')}
    <label>Lieu</label>
    <input id="ndLieu" placeholder="Ex : Bouaké, Yamoussoukro..." value="${ND_E(dv.lieu)}" oninput="ndGet(CO.nego).lieu=this.value">
    <label>Prix proposé par le client (facultatif, FCFA)</label>
    <input id="ndPrix" type="number" inputmode="numeric" placeholder="Laisse vide s'il n'a pas donné de prix" value="${dv.prix_client === '' || dv.prix_client == null ? '' : ND_E(dv.prix_client)}" oninput="ndGet(CO.nego).prix_client=this.value===''?'':Number(this.value)">
    <button class="btn-primary" style="margin-top:14px" onclick="ndDevis()" ${CO.busy ? 'disabled' : ''}>${ND_I('target', 16)} Faire le devis</button>
    <button class="nd-link" onclick="CO.nego.ndVieux=true;coNegoRefresh()">Ancienne version (comparer à un budget)</button>
  </div>`;
};
window.ndSetCol = function(id){ const dv = ndGet(CO.nego); dv.col = dv.col === id ? null : id; CO.nego.collection_id = dv.col; coNegoRefresh(); };
window.ndJours = function(d){
  const dv = ndGet(CO.nego);
  if(d > 0 && dv.jours.length < 10) dv.jours.push({ nom: `Jour ${dv.jours.length + 1}`, photo: true, video: false });
  if(d < 0 && dv.jours.length > 1) dv.jours.pop();
  coNegoRefresh();
};
window.ndTog = function(i, k, form){ const dv = ndGet(CO.nego), j = dv.jours[i]; if(!j) return; j[k] = !j[k]; if(form) coNegoRefresh(); else ndChange(); };
// Lecture simple sans IA (secours)
function ndLireSimple(t){
  const s = String(t || '').toLowerCase(), mots = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5 };
  const m = s.match(/(\d+|un|une|deux|trois|quatre|cinq)\s+jours?/);
  let nb = m ? (mots[m[1]] || Number(m[1])) : 0;
  const noms = [];
  [['dot', 'Dot'], ['mairie', 'Mairie'], ['civil', 'Civil'], ['coutum', 'Coutumier'], ['église|eglise|religieux', 'Église'], ['mosqu', 'Mosquée'], ['réception|reception|soirée|soiree', 'Réception']].forEach(([r, l]) => { if(new RegExp(r).test(s) && !noms.includes(l)) noms.push(l); });
  if(!nb) nb = Math.max(1, noms.length);
  const video = /vid[ée]o|film|clip/.test(s), photo = /photo/.test(s) || !video;
  return { jours: Array.from({ length: Math.min(nb, 10) }, (_, i) => ({ nom: noms[i] || `Jour ${i + 1}`, photo, video })), lieu: '', prix_client: (s.match(/(\d[\d\s.]{3,})\s*(f|fcfa|francs)/) || [])[1] };
}
window.ndLire = async function(){
  const n = CO.nego, dv = ndGet(n), el = document.getElementById('ndMsg'); if(el) dv.msg = el.value.trim();
  if(!dv.msg) return ND_TOAST('Colle d\'abord le message du client');
  if(CO.busy) return;
  let r = null;
  if(typeof mkAI === 'function'){
    CO.busy = 'nd-lire'; coNegoRefresh();
    try {
      const out = await mkAI({ system: 'Tu aides Henzo, photographe à Bouaké (Côte d\'Ivoire), à lire les demandes de ses clients. Réponds seulement en JSON.', maxTokens: 1200,
        messages: [{ role: 'user', text: `Message du client :\n"""${dv.msg}"""\n\nRepère : chaque jour de l'événement, et pour chaque jour s'il veut photo, vidéo ou les deux (si rien n'est dit : photo seulement), le lieu, le prix proposé (nombre en FCFA, sinon null), le nom du client, et les extras demandés (album, tirages, drone, clé USB, cadre...).
JSON : {"nom_client":"" ,"jours":[{"nom":"ex : Dot, Mairie, Église","photo":true,"video":false,"date":""}],"lieu":"","prix_client":null,"extras":["album"],"resume":"1 phrase"}` }] });
      r = (typeof mkJson === 'function' ? mkJson : JSON.parse)(out && out.text);
    } catch(e){ ND_TOAST('IA indisponible : lecture simple du message', 'error'); }
    CO.busy = '';
  }
  if(!r || !Array.isArray(r.jours)) r = ndLireSimple(dv.msg);
  const jours = (r.jours || []).filter(j => j && typeof j === 'object').slice(0, 10).map((j, i) => ({ nom: ND_CLEAN(j.nom || `Jour ${i + 1}`).slice(0, 40) + (j.date ? ` (${ND_CLEAN(j.date).slice(0, 20)})` : ''), photo: j.photo !== false, video: !!j.video }));
  if(jours.length) dv.jours = jours;
  if(r.lieu) dv.lieu = ND_CLEAN(r.lieu).slice(0, 60);
  const p = Number(String(r.prix_client == null ? '' : r.prix_client).replace(/[^\d]/g, ''));
  if(p > 0) dv.prix_client = p;
  if(r.nom_client && !n.client_id && !n.client_nom) n.client_nom = ND_CLEAN(r.nom_client).slice(0, 60);
  dv.notes = [];
  (Array.isArray(r.extras) ? r.extras : []).forEach(x => {
    const nom = ND_CLEAN(typeof x === 'string' ? x : (x && x.nom) || '').trim(); if(!nom) return;
    const o = ndOptions().find(t => String(t.name || '').toLowerCase().includes(nom.toLowerCase()) || nom.toLowerCase().includes(String(t.name || '').toLowerCase()));
    if(o && !dv.extras.some(e => e.id === o.id)) dv.extras.push({ id: o.id, nom: o.name, prix: Number(o.price) || 0, cout: Number(o.cost) || 0 });
    else if(!o) dv.notes.push(`Demandé aussi : ${nom} (ajoute son prix dans le résultat)`);
  });
  dv.lu = true;
  ND_TOAST('Fiche remplie : vérifie les jours');
  coNegoRefresh();
};
window.ndDevis = async function(){
  const n = CO.nego; if(!n || CO.busy) return;
  const dv = ndGet(n), nm = document.getElementById('coNNom'); if(nm) n.client_nom = nm.value.trim();
  if(!ndPacks(dv).length) return typeof agAlert === 'function' ? agAlert('Je ne trouve pas tes packs mariage. Ajoute-les dans Tarifs (avec le prix), puis reviens.') : null;
  if(!dv.jours.some(j => j.photo || j.video)) return ND_TOAST('Choisis photo ou vidéo pour au moins un jour');
  ndApply(n); n.step = 'analyse';
  if(typeof coNegoSave === 'function') await coNegoSave();
  coNegoRefresh();
};

// ---------- 2. Analyse (devis) ----------
const _ndAna = coNegoAnaView;
coNegoAnaView = function(s){
  const n = CO.nego;
  if(!n || !n.ana || !n.ana.devis) return _ndAna.apply(this, arguments);
  ndGet(n); if(!ndApply(n, true)) return _ndAna.apply(this, arguments);
  const a = n.ana, dv = n.dv, ch = a.offres[dv.choix], opts = ndOptions();
  const bk = dv.offreIA != null && a.offres[dv.offreIA] ? dv.offreIA : !a.budget ? Math.min(1, a.offres.length - 1)
    : a.offres.reduce((b, o) => (o.total >= a.plancher && o.total <= Math.max(a.budget * 1.15, a.offres[0].total) ? o.k : b), 0);
  const best = a.offres[bk];
  const busy = CO.busy === 'nd-ia';
  s.innerHTML = `
    <div class="co-verdict v-${a.verdict}"><small>${a.budget ? 'Prix du client' : 'Devis'}</small><b>${ND_E(a.titre)}</b><p>${ND_E(a.explication)}</p></div>
    <div class="co-prices">
      <div><span>Prix du client</span><b>${a.budget ? ND_F(a.budget) : '-'}</b></div>
      <div class="main"><span>Prix conseillé</span><b>${ND_F(a.prix_conseille)}</b></div>
      <div><span>Plancher${a.plancher_estime ? ' (estimé)' : ''}</span><b class="co-red">${ND_F(a.plancher)}</b></div>
    </div>
    ${a.alertes.length ? `<div class="co-card co-sev-warn">${a.alertes.map(x => `<p>${ND_I('info', 14)} ${ND_E(x)}</p>`).join('')}</div>` : ''}

    <div class="co-sec-t">Détail par jour (offre ${ND_E(ch.nom)})</div>
    <div class="co-card nd-det">
      ${ch.jours.map((j, i) => `<div class="nd-drow">
        <div class="d"><b>${ND_E(j.nom)}</b><span>${ND_E(j.type)}${j.principal ? ' · prix plein' : j.prix < j.plein ? ` · -${Number(dv.remise) || 0} %` : ''}</span>
          <div class="ag-pills sm"><button class="${dv.jours[i].photo ? 'on' : ''}" onclick="ndTog(${i},'photo')">Photo</button><button class="${dv.jours[i].video ? 'on' : ''}" onclick="ndTog(${i},'video')">Vidéo</button></div></div>
        <div class="m"><b>${ND_F(j.prix)}</b>${dv.jours.length > 1 ? `<button class="nd-x" onclick="ndDelJour(${i})" aria-label="Enlever ce jour">${ND_I('trash', 15)}</button>` : ''}</div>
      </div>`).join('')}
      ${(dv.extras || []).map((x, i) => `<div class="nd-drow"><div class="d"><b>${ND_E(x.nom)}</b><span>Extra</span></div><div class="m"><b>${ND_F(x.prix)}</b><button class="nd-x" onclick="ndDelExtra(${i})" aria-label="Enlever">${ND_I('trash', 15)}</button></div></div>`).join('')}
      <div class="nd-drow tot"><div class="d"><b>Total offre ${ND_E(ch.nom)}</b></div><div class="m"><b>${ND_F(ch.total)}</b></div></div>
      <div class="nd-add"><button onclick="ndAddJour()">${ND_I('plus', 14)} Un jour</button><button onclick="ndExtraSheet()">${ND_I('plus', 14)} Un extra${opts.length ? '' : ' (album...)'}</button></div>
      ${dv.jours.length > 1 ? `<div class="nd-count sm"><span>Remise jours en plus</span><button onclick="ndRemise(-5)">-</button><b>${Number(dv.remise) || 0} %</b><button onclick="ndRemise(5)">+</button></div>` : ''}
    </div>

    <div class="co-sec-t">Les offres</div>
    <div class="nd-offres">${a.offres.map(o => `<div class="nd-off ${o.k === dv.choix ? 'on' : ''}" onclick="ndChoix(${o.k})">
      <div class="h"><b>${ND_E(o.nom)}</b>${o.k === best.k ? `<i>${ND_I('star', 11)} Conseillée</i>` : ''}</div>
      <div class="p">${ND_F(o.total)}</div>
      ${o.jours.map(j => `<div class="l"><span>${ND_E(j.nom)}</span><span>${ND_N(j.prix)}</span></div>`).join('')}
      ${o.extras ? `<div class="l"><span>Extras</span><span>${ND_N(o.extras)}</span></div>` : ''}
      ${o.total < a.plancher ? '<div class="l co-red">Sous le plancher</div>' : ''}
    </div>`).join('')}</div>

    <div class="co-sec-t">Pourquoi ce prix</div>
    <ul class="co-ret">${a.raisons.map(x => `<li>${ND_I('check', 13)}<span>${ND_E(x)}</span></li>`).join('')}</ul>

    <div class="co-sec-t">Discuter avec l'IA</div>
    <div class="co-card nd-ia">
      ${dv.chat.length ? `<div class="co-chat">${dv.chat.map((m, i) => m.r === 'henzo' ? `<div class="co-msg henzo"><small>Toi</small>${ND_E(m.t).replace(/\n/g, '<br>')}</div>`
        : `<div class="co-msg ia"><small>IA</small>${ND_E(m.t).replace(/\n/g, '<br>')}${m.msg ? `<div class="nd-cmsg">${ND_E(m.msg).replace(/\n/g, '<br>')}</div><div class="co-btns sm"><button onclick="ndCopy(${i})">${ND_I('copy', 14)} Copier</button><button class="main wa" onclick="ndWa(${i})">${ND_I('chat', 14)} WhatsApp</button></div>` : ''}</div>`).join('')}</div>` : '<div class="ag-hint">Pose une question. L\'IA répond et ajuste le devis.</div>'}
      ${busy ? '<div class="co-think">L\'IA réfléchit et ajuste le devis...</div>' : ''}
      <div class="ag-pills nd-chips">${['Le client trouve ça trop cher, que faire ?', 'Quelle offre est la meilleure pour moi ?', 'Écris le message de devis pour le client'].map(q => `<button onclick="ndAsk(this.textContent)" ${busy ? 'disabled' : ''}>${ND_E(q)}</button>`).join('')}</div>
      <textarea id="ndQ" rows="2" placeholder="Ex : il veut la vidéo sur les 3 jours mais son budget est 400 000"></textarea>
      <button class="btn-primary" style="margin-top:8px" onclick="ndAsk()" ${busy ? 'disabled' : ''}>${ND_I('sparkles', 15)} Demander à l'IA</button>
      ${Number(dv.prixIA) > 0 ? `<button class="nd-link" onclick="ndGet(CO.nego).prixIA=null;ndChange()">Revenir au prix calculé</button>` : ''}
    </div>

    <div class="co-btns col" style="margin-top:12px">
      <button class="main" onclick="CO.nego.step='messages';coNegoSave();coNegoRefresh()">${ND_I('chat', 15)} Voir les messages prêts</button>
      <button onclick="CO.nego.step='demande';coNegoRefresh()">${ND_I('edit', 15)} Modifier la demande</button>
    </div>`;
};
window.ndChoix = function(k){ const dv = ndGet(CO.nego); dv.choix = k; dv.prixIA = null; ndApply(CO.nego); ndSaveSoon(); coNegoRefresh(); };
window.ndDelJour = async function(i){
  const dv = ndGet(CO.nego); if(dv.jours.length < 2) return;
  if(typeof agConfirm === 'function' && !await agConfirm(`Enlever "${dv.jours[i].nom}" du devis ?`)) return;
  dv.jours.splice(i, 1); ndChange();
};
window.ndAddJour = function(){ const dv = ndGet(CO.nego); if(dv.jours.length >= 10) return; dv.jours.push({ nom: `Jour ${dv.jours.length + 1}`, photo: true, video: false }); ndChange(); };
window.ndDelExtra = function(i){ ndGet(CO.nego).extras.splice(i, 1); ndChange(); };
window.ndRemise = function(d){ const dv = ndGet(CO.nego); dv.remise = Math.max(0, Math.min(50, (Number(dv.remise) || 0) + d)); ndChange(); };
window.ndExtraSheet = function(){
  const dv = ndGet(CO.nego), opts = ndOptions().filter(o => !dv.extras.some(e => e.id === o.id));
  if(typeof agSheet !== 'function') return ndExtraAutre();
  agSheet('ndExtra', `<h3>Ajouter un extra</h3>
    ${opts.length ? `<div class="ag-list">${opts.map(o => `<div class="crm-row" onclick="ndExtraAdd(${o.id})"><div class="d"><b>${ND_E(o.name)}</b></div><div class="m">${ND_F(o.price)}</div></div>`).join('')}</div>` : '<div class="ag-hint">Pas encore d\'options dans tes tarifs.</div>'}
    <button class="btn-primary" style="margin-top:12px" onclick="ndExtraAutre()">${ND_I('plus', 15)} Autre (album, drone, transport...)</button>`);
};
window.ndExtraAdd = function(id){
  const o = ndOptions().find(t => t.id === id); if(!o) return;
  ndGet(CO.nego).extras.push({ id: o.id, nom: o.name, prix: Number(o.price) || 0, cout: Number(o.cost) || 0 });
  if(typeof agCloseSheet === 'function') agCloseSheet('ndExtra'); ndChange();
};
window.ndExtraAutre = async function(){
  if(typeof agCloseSheet === 'function') agCloseSheet('ndExtra');
  if(typeof agPrompt !== 'function') return;
  const nom = await agPrompt('Nom de l\'extra', 'Album photo'); if(!nom || !String(nom).trim()) return;
  const p = await agPrompt(`Prix de "${String(nom).trim()}" (FCFA)`, ''); const prix = Number(String(p || '').replace(/[^\d]/g, ''));
  if(!(prix > 0)) return ND_TOAST('Prix non valide', 'error');
  ndGet(CO.nego).extras.push({ nom: String(nom).trim().slice(0, 40), prix }); ndChange();
};
window.ndCopy = function(i){ const m = ndGet(CO.nego).chat[i]; if(!m || !m.msg) return; if(typeof coCopy === 'function') coCopy(m.msg); else try { navigator.clipboard.writeText(m.msg); ND_TOAST('Copié'); } catch(e){} };
window.ndWa = function(i){ const m = ndGet(CO.nego).chat[i]; if(m && m.msg && typeof coNegoWa === 'function') coNegoWa(m.msg); };

// ---------- 3. Discussion avec l'IA ----------
function ndBrief(n){
  const dv = ndGet(n), a = n.ana, N = ndNiveaux(dv);
  return `Événement : ${ndColNom(dv)}, ${dv.jours.length} jour(s)${dv.lieu ? ', lieu ' + dv.lieu : ''}.
Client : ${n.client_nom || 'nouveau client'}${dv.msg ? '\nSon message : """' + dv.msg.slice(0, 1200) + '"""' : ''}
Jours demandés : ${dv.jours.map((j, i) => `${i + 1}) ${j.nom} : ${ndJourType(j)}`).join(' ; ')}
Extras : ${dv.extras.length ? dv.extras.map(x => `${x.nom} ${ND_N(x.prix)} F`).join(', ') : 'aucun'}
Remise sur les jours en plus : ${dv.remise} %
Packs de Henzo : ${N.packs.map(t => `${t.name} ${ND_N(t.price)} F${ndHasVideo(t) ? ' (avec vidéo)' : ' (photo)'}`).join(' ; ')}
Offres calculées : ${a.offres.map(o => `${o.nom} = ${ND_N(o.total)} F (${o.jours.map(j => j.nom + ' ' + ND_N(j.prix)).join(', ')})`).join(' | ')}
Offre choisie : ${a.offres[dv.choix].nom}. Prix conseillé : ${ND_N(a.prix_conseille)} F. Plancher (jamais en dessous) : ${ND_N(a.plancher)} F.
Prix proposé par le client : ${a.budget ? ND_N(a.budget) + ' F' : 'pas encore donné'}.`;
}
window.ndAsk = async function(q){
  const n = CO.nego; if(!n || !n.ana || CO.busy) return;
  const el = document.getElementById('ndQ'); q = String(q || (el && el.value) || '').trim();
  if(!q) return ND_TOAST('Écris ta question');
  if(typeof mkAI !== 'function') return typeof agAlert === 'function' ? agAlert("L'IA n'est pas disponible. Connecte-la dans Coach IA.") : null;
  const dv = ndGet(n); dv.chat.push({ r: 'henzo', t: q.slice(0, 600) });
  CO.busy = 'nd-ia'; coNegoRefresh();
  const keys = n.ana.offres.map(o => o.nom).join('|');
  const hist = dv.chat.slice(-9, -1).map(m => ({ role: m.r === 'henzo' ? 'user' : 'assistant', text: m.t }));
  try {
    const out = await mkAI({ maxTokens: 1800,
      system: `Tu es l'expert en vente de Henzo, photographe et vidéaste à Bouaké (Côte d'Ivoire). Tu l'aides à négocier un devis de mariage. Phrases courtes, mots simples, français. Règle d'or : ne pas baisser le prix pour le même travail, plutôt retirer quelque chose (un jour, la vidéo sur un jour, un extra). Jamais sous le plancher. Si le client propose un prix trop bas, dis-le clairement. Réponds seulement en JSON.`,
      messages: [...hist, { role: 'user', text: `LE DEVIS ACTUEL :\n${ndBrief(n)}\n\nQUESTION DE HENZO : ${q}\n\nRéponds en JSON :
{"reponse":"ta réponse, 2 à 6 phrases simples","jours":null ou [{"nom":"...","photo":true,"video":false}] si tu changes les jours,"extras":null ou [{"nom":"...","prix":nombre}] si tu changes les extras,"remise":null ou nombre (0 à 50),"offre":null ou "${keys}","prix_conseille":null ou nombre si tu conseilles un autre prix,"message_client":null ou "message WhatsApp poli pour le client, vouvoiement, signé Henzo Studio"}
Change les jours, les extras ou le prix seulement si c'est utile pour la question.` }] });
    const j = (typeof mkJson === 'function' ? mkJson : JSON.parse)(out && out.text);
    const avant = n.ana.prix_conseille;
    if(Array.isArray(j.jours) && j.jours.length) dv.jours = j.jours.filter(x => x && typeof x === 'object').slice(0, 10).map((x, i) => ({ nom: ND_CLEAN(x.nom || `Jour ${i + 1}`).slice(0, 40), photo: !!x.photo, video: !!x.video }));
    if(Array.isArray(j.extras)) dv.extras = j.extras.filter(x => x && x.nom && Number(x.prix) >= 0).slice(0, 8).map(x => { const o = ndOptions().find(t => String(t.name).toLowerCase() === String(x.nom).toLowerCase()); return { id: o ? o.id : undefined, nom: ND_CLEAN(x.nom).slice(0, 40), prix: Number(x.prix) || 0, cout: o ? Number(o.cost) || 0 : 0 }; });
    if(j.remise != null && !isNaN(Number(j.remise))) dv.remise = Math.max(0, Math.min(50, Math.round(Number(j.remise))));
    if(j.offre){ const k = n.ana.offres.findIndex(o => o.nom.toLowerCase() === String(j.offre).toLowerCase()); if(k >= 0){ dv.choix = k; dv.offreIA = k; } }
    dv.prixIA = Number(j.prix_conseille) > 0 ? Number(j.prix_conseille) : null;
    ndApply(n, true);
    const apres = n.ana.prix_conseille;
    dv.chat.push({ r: 'ia', t: ND_CLEAN(j.reponse || 'Voilà mon avis.') + (apres !== avant ? `\nNouveau prix conseillé : ${ND_F(apres)}.` : ''), msg: j.message_client ? ND_CLEAN(j.message_client) : '' });
    ndApply(n, true);
    if(typeof coNegoSave === 'function') await coNegoSave();
    if(el) el.value = '';
  } catch(e){
    dv.chat.pop();
    if(typeof agAlert === 'function') agAlert(ND_CLEAN((e && e.message) || "L'IA n'a pas répondu, réessaie."));
  }
  CO.busy = ''; coNegoRefresh();
};

// ---------- Messages prêts (étape 3 de coach2) ----------
const _ndTpl = coNegoTpl;
coNegoTpl = function(n, a){
  if(!a || !a.devis || !Array.isArray(a.offres)) return _ndTpl.apply(this, arguments);
  const c = n.client_id && typeof coClient === 'function' ? coClient(n.client_id) : null;
  const p = c && typeof coFirst === 'function' ? coFirst(c) : String(n.client_nom || '').split(' ')[0];
  const sal = p ? `Bonjour ${p}` : 'Bonjour', dv = a.devis, ch = a.offres[a.choix] || a.offres[0], eco = a.offres[0];
  const det = o => o.jours.map(j => `- ${j.nom} (${j.type.toLowerCase()}) : ${ND_F(j.prix)}`).join('\n') + (o.extras ? `\n- Extras : ${ND_F(o.extras)}` : '');
  const acompte = ND_R(a.prix_conseille * 0.3);
  return {
    accepter: `${sal}, merci pour votre confiance !\nVoici mon devis pour votre ${ndColNom(dv).toLowerCase()} :\n${det(ch)}\nTotal : ${ND_F(a.prix_conseille)}.\nPour bloquer les dates, l'acompte est de ${ND_F(acompte)} par Wave ou Orange Money.\nHenzo Studio`,
    contre1: `${sal}, merci pour votre message.\nPour rester dans votre budget, je vous propose une formule plus simple :\n${det(eco)}\nTotal : ${ND_F(eco.total)}.\nSi vous voulez tout ce que vous avez demandé, c'est ${ND_F(a.prix_conseille)}.\nDites-moi ce qui vous arrange.\nHenzo Studio`,
    contre2: `${sal}, j'ai bien noté votre budget.\nJe peux vous faire ${ND_F(Math.max(a.plancher, ND_R(a.prix_conseille * 0.95)))} pour tout, si vous réservez cette semaine avec un acompte de ${ND_F(acompte)}, et le reste en 2 fois avant le mariage.\nC'est mon meilleur prix pour ce travail.\nHenzo Studio`,
    refuser: `${sal}, merci d'avoir pensé à Henzo Studio.\n${a.budget ? `Avec ${ND_F(a.budget)}, je` : 'Je'} ne peux pas couvrir tous ces jours avec la qualité que je garantis.\nSi vous voulez, je peux faire seulement le grand jour, à partir de ${ND_F(Math.max(...eco.jours.map(j => j.plein)))}.\nBelle préparation !`
  };
};

// ---------- Styles ----------
(function ndStyles(){
  if(document.getElementById('ndStyles')) return;
  const st = document.createElement('style'); st.id = 'ndStyles';
  st.textContent = `
.nd-sec{display:flex;align-items:center;gap:8px;margin:16px 0 6px;color:var(--text)}
.nd-btn2{width:100%;margin-top:8px;padding:11px;border-radius:12px;border:1px solid var(--border);background:var(--card);color:var(--text);font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px}
.nd-link{width:auto!important;display:block;margin:12px auto 0;background:none;border:0;color:var(--muted);text-decoration:underline;font-size:13px}
.nd-count{display:flex;align-items:center;gap:10px;margin:6px 0 8px}
.nd-count span{flex:1;font-size:14px;color:var(--text)}
.nd-count button{width:38px!important;height:38px;border-radius:12px;border:1px solid var(--border);background:var(--card);color:var(--text);font-size:20px;line-height:1;padding:0}
.nd-count b{min-width:44px;text-align:center;font-size:17px;color:var(--text)}
.nd-count.sm{margin:10px 0 0}.nd-count.sm button{width:32px!important;height:32px;font-size:17px}
.nd-jour{border:1px solid var(--border);border-radius:14px;padding:9px;margin-bottom:8px}
.nd-jour input{margin-bottom:6px}
.nd-jour .ag-pills,.nd-drow .ag-pills{margin:0}
.nd-det{padding:6px 12px}
.nd-drow{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)}
.nd-drow .d{flex:1;min-width:0}.nd-drow .d b{display:block;font-size:14px;color:var(--text)}.nd-drow .d span{display:block;font-size:12px;color:var(--muted);margin-bottom:4px}
.nd-drow .m{display:flex;align-items:center;gap:6px;white-space:nowrap}.nd-drow .m b{color:var(--text)}
.nd-drow.tot{border-bottom:0}.nd-drow.tot b{font-size:15px}
.nd-x{width:auto!important;background:none;border:0;color:var(--muted);padding:4px}
.ag-pills.sm button{padding:5px 10px;font-size:12px}
.nd-add{display:flex;gap:8px;margin:4px 0 6px}
.nd-add button{width:auto!important;flex:1;padding:9px;border-radius:12px;border:1px dashed var(--border);background:none;color:var(--text);font-size:13px;display:flex;align-items:center;justify-content:center;gap:5px}
.nd-offres{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:12px}
.nd-off{background:var(--card);border:1.5px solid var(--border);border-radius:14px;padding:10px;cursor:pointer;min-width:0}
.nd-off.on{border-color:var(--text)}
.nd-off .h{display:flex;flex-wrap:wrap;align-items:center;gap:4px}.nd-off .h b{font-size:13px;color:var(--text)}
.nd-off .h i{font-style:normal;font-size:10px;background:var(--pri-bg);color:var(--pri-fg);border-radius:8px;padding:2px 6px;display:inline-flex;align-items:center;gap:3px}
.nd-off .p{font-size:16px;font-weight:700;color:var(--text);margin:4px 0 6px}
.nd-off .l{display:flex;justify-content:space-between;gap:6px;font-size:11.5px;color:var(--muted);line-height:1.5}
.nd-off .l span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nd-chips{margin:8px 0}.nd-chips button{font-size:12px;text-align:left}
.nd-cmsg{margin-top:8px;padding:8px;border-radius:10px;background:var(--bg);border:1px solid var(--border);font-size:13px}
`;
  document.head.appendChild(st);
})();

window.ndGet = ndGet;
window.ndChange = ndChange;
window.ndCalc = ndCalc;
})();
