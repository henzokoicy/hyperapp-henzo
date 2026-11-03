// ============================================================
// ARGENT-CLAIR.JS - Comprendre et ranger son argent sans se perdre
// ------------------------------------------------------------
// 1. "D'où vient ce montant ?" : sur un compte ou un coffre, l'app
//    raconte de A à Z chaque mouvement qui donne le solde, et tu peux
//    poser tes questions à l'IA.
// 2. Capture Wave / Orange Money : l'IA lit ta capture d'historique,
//    la compare à l'app et propose les mouvements oubliés (tu valides).
// 3. Budgets : "Mettre de côté" depuis un compte OU un coffre libre
//    (coffre bloqué : il faut le débloquer). Chaque budget montre ce
//    qui est de côté et ce qui reste à trouver. Rappel sur l'Accueil.
// 4. Paiement en espèces : à la répartition, tu choisis d'où sort
//    l'argent rangé dans les coffres (compte ou coffre libre).
// 5. Notes : bouton "Modifier" en haut de chaque note.
// 6. Bouton retour du téléphone : revient à l'écran d'avant ; pour
//    quitter, appuyer deux fois depuis l'Accueil.
// Règles d'argent : les mêmes que argent.js et budget.js.
// ============================================================
(function(){
'use strict';
if(typeof txs === 'undefined' || typeof agSheet !== 'function') return;
const E = s => agEsc(String(s == null ? '' : s));
const F = n => agF(n);
const jour = d => { try { return new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' }); } catch(e){ return d || ''; } };
function apNomBout(t, cote){ return cote === 'de' ? (agEndName('account', t.account_id) || agEndName('goal', t.goal_id) || '') : (agEndName('account', t.to_account_id) || agEndName('goal', t.to_goal_id) || ''); }

// ============================================================
// 1. D'OÙ VIENT CE MONTANT ?
// ============================================================
function apEffet(t, kind, id){
  const a = Number(t.amount) || 0;
  if(kind === 'a'){
    if(t.type === 'revenu' && t.account_id === id) return a;
    if(t.type === 'depense' && t.account_id === id) return -a;
    if(t.type === 'transfert'){ let e = 0; if(t.account_id === id) e -= a; if(t.to_account_id === id) e += a; return e; }
    return 0;
  }
  if(t.type === 'transfert'){ let e = 0; if(t.goal_id === id) e -= a; if(t.to_goal_id === id) e += a; return e; }
  return 0;
}
function apLibelle(t, kind, id){
  if(t.type === 'revenu') return { quoi: 'Entrée', detail: [t.category, t.client_name, t.note].filter(Boolean).join(' · ') || 'Argent reçu' };
  if(t.type === 'depense') return { quoi: 'Dépense', detail: [t.category, t.note].filter(Boolean).join(' · ') || 'Dépense' };
  const sortie = kind === 'a' ? t.account_id === id : t.goal_id === id;
  const autre = sortie ? apNomBout(t, 'vers') : apNomBout(t, 'de');
  let quoi = sortie ? 'Envoyé vers ' + (autre || '?') : 'Reçu de ' + (autre || '?');
  if(/^rep:/.test(t.details || '')) quoi = sortie ? 'Répartition vers ' + (autre || 'un coffre') : 'Répartition depuis ' + (autre || 'un compte');
  if(/^bgcote:/.test(t.details || '')) quoi = sortie ? 'Mis de côté (budget) vers ' + autre : 'Mis de côté (budget) depuis ' + autre;
  if(/^frais:/.test(t.details || '')) quoi = 'Frais d\'opérateur';
  return { quoi, detail: t.note || t.category || '' };
}
function apHistorique(kind, id){
  const L = txs.filter(t => !t.cancelled && (kind === 'a' ? (t.account_id === id || t.to_account_id === id) : (t.goal_id === id || t.to_goal_id === id)))
    .map(t => ({ t, e: apEffet(t, kind, id) })).filter(x => x.e !== 0)
    .sort((x, y) => String(x.t.date || '').localeCompare(String(y.t.date || '')) || String(x.t.created_at || '').localeCompare(String(y.t.created_at || '')) || (x.t.id - y.t.id));
  return L;
}
function apResume(kind, id){
  const o = kind === 'a' ? accounts.find(x => x.id === id) : coffres.find(x => x.id === id); if(!o) return null;
  const L = apHistorique(kind, id);
  const somme = L.reduce((s, x) => s + x.e, 0);
  const actuel = kind === 'a' ? agAccountBalance(o) : Math.round(Number(o.current) || 0);
  const depart = kind === 'a' ? Math.round(Number(o.initial_balance) || 0) : Math.round(actuel - somme);
  let s = depart; L.forEach(x => { s += x.e; x.apres = s; });
  const parts = { entrees: 0, depenses: 0, arrivees: 0, envois: 0, nE: 0, nD: 0, nA: 0, nV: 0 };
  L.forEach(x => { if(x.t.type === 'revenu'){ parts.entrees += x.e; parts.nE++; } else if(x.t.type === 'depense'){ parts.depenses += -x.e; parts.nD++; } else if(x.e > 0){ parts.arrivees += x.e; parts.nA++; } else { parts.envois += -x.e; parts.nV++; } });
  return { o, L, depart, actuel, parts, nom: o.name };
}
window.apExpliquer = function(kind, id){
  const R = apResume(kind, id); if(!R) return;
  const p = R.parts;
  const ligne = (lbl, v, n, cls) => `<div class="ap-r ${cls || ''}"><span>${lbl}${n != null ? ` <i>${n}</i>` : ''}</span><b class="ag-m">${v}</b></div>`;
  const recit = [
    `Au départ : <b>${F(R.depart)}</b>${kind === 'g' && R.depart ? ' (déjà dans le coffre avant l\'historique)' : ''}.`,
    p.nE ? `Tu as reçu <b>${p.nE} entrée${p.nE > 1 ? 's' : ''}</b> pour <b>+${F(p.entrees)}</b>.` : '',
    p.nA ? `<b>${p.nA}</b> arrivée${p.nA > 1 ? 's' : ''} d'un autre compte ou coffre : <b>+${F(p.arrivees)}</b>.` : '',
    p.nD ? `<b>${p.nD} dépense${p.nD > 1 ? 's' : ''}</b> : <b>-${F(p.depenses)}</b>.` : '',
    p.nV ? `<b>${p.nV}</b> envoi${p.nV > 1 ? 's' : ''} vers d'autres comptes ou coffres (répartition, mise de côté...) : <b>-${F(p.envois)}</b>.` : '',
    `Résultat : <b>${F(R.actuel)}</b>.`
  ].filter(Boolean).join(' ');
  const recents = R.L.slice().reverse();
  agSheet('apExpl', `
    <h3>D'où viennent les ${F(R.actuel)} ?</h3>
    <div class="ag-hint" style="margin-top:0">${kind === 'a' ? 'Compte' : 'Coffre'} <b>${E(R.nom)}</b> : voici chaque mouvement, du plus récent au plus ancien, avec le montant juste après.</div>
    <div class="ap-recit">${recit}</div>
    <div class="ap-tab">
      ${ligne('Départ', F(R.depart))}
      ${p.nE ? ligne('Entrées', '+' + F(p.entrees), p.nE, 'plus') : ''}
      ${p.nA ? ligne('Reçu d\'autres comptes ou coffres', '+' + F(p.arrivees), p.nA, 'plus') : ''}
      ${p.nD ? ligne('Dépenses', '-' + F(p.depenses), p.nD, 'moins') : ''}
      ${p.nV ? ligne('Envoyé ailleurs', '-' + F(p.envois), p.nV, 'moins') : ''}
      ${ligne('= Aujourd\'hui', F(R.actuel), null, 'tot')}
    </div>
    ${kind === 'a' ? `<button class="btn-ghost ap-cap" onclick="apCapture(${id})">${agIcon('image', 16)} Vérifier avec une capture (Wave, Orange Money...)</button>` : ''}
    <div class="ap-sec">Mouvement par mouvement <i>${R.L.length}</i></div>
    <div class="ap-list">${recents.length ? recents.slice(0, 120).map(x => { const l = apLibelle(x.t, kind, id); return `<button type="button" class="ap-m" onclick="agOpenTx(${x.t.id})">
        <span class="ap-d">${jour(x.t.date)}</span><span class="ap-q"><b>${E(l.quoi)}</b><small>${E(l.detail)}</small></span>
        <span class="ap-v"><b class="ag-m ${x.e > 0 ? 'plus' : 'moins'}">${x.e > 0 ? '+' : '-'}${F(Math.abs(x.e))}</b><small class="ag-m">reste ${F(x.apres)}</small></span></button>`; }).join('') : '<div class="ag-empty">Aucun mouvement.</div>'}
      ${recents.length > 120 ? `<div class="ag-hint">Les ${recents.length - 120} plus anciens sont dans l'Historique.</div>` : ''}</div>
    <div class="ap-sec">Une question ?</div>
    <div class="ap-qs">${['Pourquoi j\'ai ce montant ?', 'Quelles sont les plus grosses sorties ?', 'Qu\'ai-je peut-être oublié de noter ?', 'Que s\'est-il passé cette semaine ?'].map(q => `<button type="button" onclick="apDemander('${kind}',${id},this.textContent)">${E(q)}</button>`).join('')}</div>
    <div class="ap-ask"><input id="apQ" placeholder="Ex : d'où viennent les 42 000 sur Wave ?" onkeydown="if(event.key==='Enter')apDemander('${kind}',${id})"><button class="btn-primary" onclick="apDemander('${kind}',${id})">Demander</button></div>
    <div id="apRep"></div>`);
};
// L'IA répond avec les vrais mouvements sous les yeux
window.apDemander = async function(kind, id, q){
  q = q || (document.getElementById('apQ') || {}).value || ''; q = String(q).trim(); if(!q) return;
  const R = apResume(kind, id); if(!R) return;
  const el = document.getElementById('apRep'); if(el) el.innerHTML = '<div class="ag-empty">Je regarde tes mouvements...</div>';
  const lignes = R.L.slice(-150).map(x => { const l = apLibelle(x.t, kind, id); return `${x.t.date} | ${x.e > 0 ? '+' : '-'}${Math.abs(Math.round(x.e))} | ${l.quoi} | ${l.detail} | après: ${Math.round(x.apres)}`; }).join('\n');
  const sys = `Tu aides Henzo (photographe à Bouaké) à comprendre son argent dans sa Super App. Tu réponds en français simple, sans jargon, avec des tirets simples, en t'appuyant UNIQUEMENT sur les mouvements fournis. Cite les dates et montants exacts. Si l'information n'est pas dans les mouvements, dis-le et propose quoi vérifier (capture Wave, mouvement à ajouter, ajustement). Montants en FCFA. Court et clair.`;
  const ctx = `${kind === 'a' ? 'COMPTE' : 'COFFRE'} : ${R.nom}\nMontant actuel : ${Math.round(R.actuel)}\nDépart : ${Math.round(R.depart)}\nMouvements (date | effet | quoi | détail | montant après) :\n${lignes || '(aucun)'}\n\nQUESTION : ${q}`;
  try {
    const r = await mkAI({ system: sys, messages: [{ role: 'user', text: ctx }], maxTokens: 900 });
    const t = typeof txtDefancy === 'function' ? txtDefancy(r.text || '') : (r.text || '');
    if(el) el.innerHTML = `<div class="ap-ia"><b>${E(q)}</b><div>${E(t).replace(/\n/g, '<br>')}</div></div>`;
  } catch(e){ if(el) el.innerHTML = `<div class="ag-hint warn">L'IA n'a pas pu répondre : ${E(e.message || e)}</div>`; }
};
// Le bouton dans les fiches compte et coffre (et le montant devient cliquable)
const openAccAp = agOpenAccount;
agOpenAccount = function(id){
  const r = openAccAp.apply(this, arguments);
  const sh = document.getElementById('agAccView'); const tot = sh && sh.querySelector('.ag-total');
  if(tot && !sh.querySelector('.ap-pourquoi')){ tot.insertAdjacentHTML('afterend', `<button class="ap-pourquoi" onclick="apExpliquer('a',${id})">${agIcon('info', 15)} D'où vient ce montant ?</button>`); }
  return r;
};
const openCofAp = agOpenCoffre;
agOpenCoffre = function(id){
  const r = openCofAp.apply(this, arguments);
  const sh = document.getElementById('agCoffreView'); const tot = sh && sh.querySelector('.ag-total');
  if(tot && !sh.querySelector('.ap-pourquoi')){ tot.insertAdjacentHTML('afterend', `<button class="ap-pourquoi" onclick="apExpliquer('g',${id})">${agIcon('info', 15)} D'où vient ce montant ?</button>`); }
  return r;
};

// ============================================================
// 2. CAPTURE WAVE / ORANGE MONEY : retrouver les mouvements oubliés
// ============================================================
const AP = { cap: null };
window.apCapture = function(accId){
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true; inp.style.display = 'none';
  inp.onchange = async () => { const f = [...(inp.files || [])].slice(0, 6); inp.remove(); if(f.length) await apLireCapture(accId, f); };
  document.body.appendChild(inp); inp.click();
};
async function apLireCapture(accId, fichiers){
  const a = accounts.find(x => x.id === accId); if(!a) return;
  agSheet('apCapSheet', `<h3>Lecture de ta capture</h3><div class="ag-empty">L'IA lit ${fichiers.length > 1 ? 'tes ' + fichiers.length + ' captures' : 'ta capture'} et compare avec l'app...</div>`);
  try {
    const imgs = []; for(const f of fichiers) imgs.push(await mkB64(await mkShrink(f, 1600, 0.85)));
    const depuis = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
    const app = txs.filter(t => !t.cancelled && (t.account_id === accId || t.to_account_id === accId) && String(t.date || '') >= depuis)
      .map(t => `${t.id} | ${t.date} | ${apEffet(t, 'a', accId) > 0 ? '+' : '-'}${Math.abs(Math.round(apEffet(t, 'a', accId)))} | ${apLibelle(t, 'a', accId).quoi} ${apLibelle(t, 'a', accId).detail}`).join('\n');
    const q = `Voici ${imgs.length > 1 ? 'des captures' : 'une capture'} de l'historique du compte "${a.name}" (Wave, Orange Money, MTN, Moov ou banque) de Henzo, photographe à Bouaké.
Lis TOUTES les opérations visibles (date, entrée ou sortie, montant, frais, nom ou numéro de l'autre personne). Les dates relatives ("hier", "lun. 3 nov.") se convertissent en YYYY-MM-DD (aujourd'hui : ${new Date().toISOString().slice(0, 10)}).
Compare avec les mouvements DÉJÀ notés dans l'app (id | date | effet | quoi) :
${app || '(aucun)'}
Une opération est "deja" si un mouvement de l'app a le même montant (à quelques francs près) et une date proche (2 jours). Propose une catégorie simple pour chaque opération manquante (Shooting photo, Transport, Nourriture, Matériel, Internet, Famille, Loyer, Transfert, Autre).
Réponds UNIQUEMENT en JSON : {"solde_capture": nombre ou null, "operations":[{"date":"YYYY-MM-DD","sens":"entree|sortie","montant":0,"frais":0,"libelle":"court","contrepartie":"nom ou numéro","categorie":"...","deja":true|false,"id_app":null}]}`;
    const r = await mkAI({ messages: [{ role: 'user', text: q }], images: imgs, maxTokens: 2500 });
    const j = mkJson(r.text || '') || {};
    const ops = (Array.isArray(j.operations) ? j.operations : []).filter(o => Number(o.montant) > 0).map((o, i) => ({ ...o, i, montant: Math.round(Number(o.montant)), frais: Math.round(Number(o.frais) || 0), coche: !o.deja }));
    AP.cap = { accId, ops, solde: j.solde_capture != null && isFinite(Number(j.solde_capture)) ? Math.round(Number(j.solde_capture)) : null };
    apCapRendu();
  } catch(e){ agSheet('apCapSheet', `<h3>Lecture de ta capture</h3><div class="ag-hint warn">La capture n'a pas pu être lue : ${E(e.message || e)}<br>Essaie une capture plus nette, ou une seule page à la fois.</div>`); }
}
function apCapRendu(){
  const C = AP.cap; if(!C) return; const a = accounts.find(x => x.id === C.accId);
  const manque = C.ops.filter(o => !o.deja), deja = C.ops.filter(o => o.deja);
  const bal = agAccountBalance(a);
  agSheet('apCapSheet', `
    <h3>Ce que montre ta capture</h3>
    <div class="ag-hint" style="margin-top:0"><b>${C.ops.length}</b> opération${C.ops.length > 1 ? 's' : ''} lue${C.ops.length > 1 ? 's' : ''} · <b>${deja.length}</b> déjà dans l'app · <b>${manque.length}</b> à ajouter.${C.solde != null ? `<br>Solde sur la capture : <b>${F(C.solde)}</b> · dans l'app : <b>${F(bal)}</b>${C.solde !== Math.round(bal) ? ` (écart ${F(C.solde - bal)})` : ' : identique'}.` : ''}</div>
    ${manque.length ? `<div class="ap-sec">À ajouter (décoche ce qui est faux)</div>
      <div class="ap-caps">${manque.map(o => `<label class="ap-cop"><input type="checkbox" ${o.coche ? 'checked' : ''} onchange="AP.cap.ops[${o.i}].coche=this.checked">
        <span class="ap-q"><b>${o.sens === 'entree' ? 'Entrée' : 'Sortie'} · ${E(o.libelle || o.contrepartie || '')}</b><small>${jour(o.date)}${o.contrepartie ? ' · ' + E(o.contrepartie) : ''}${o.frais ? ' · frais ' + F(o.frais) : ''}</small>
        <input class="ap-cat" value="${E(o.categorie || 'Autre')}" onchange="AP.cap.ops[${o.i}].categorie=this.value" onclick="event.preventDefault()"></span>
        <b class="ag-m ${o.sens === 'entree' ? 'plus' : 'moins'}">${o.sens === 'entree' ? '+' : '-'}${F(o.montant)}</b></label>`).join('')}</div>
      <button class="btn-primary" style="margin-top:10px" onclick="apCapAjouter()">Ajouter les mouvements cochés</button>` : '<div class="ag-empty">Rien ne manque : tout est déjà noté.</div>'}
    ${deja.length ? `<details class="ap-deja"><summary>Déjà dans l'app (${deja.length})</summary>${deja.map(o => `<div class="ap-cop"><span class="ap-q"><b>${E(o.libelle || '')}</b><small>${jour(o.date)}</small></span><b class="ag-m">${o.sens === 'entree' ? '+' : '-'}${F(o.montant)}</b></div>`).join('')}</details>` : ''}
    <div class="ag-hint">Vérifie toujours : l'IA peut mal lire un chiffre. Rien n'est ajouté sans ton accord.</div>`);
}
window.AP = AP;
window.apCapAjouter = async function(){
  const C = AP.cap; if(!C) return; const a = accounts.find(x => x.id === C.accId);
  const L = C.ops.filter(o => !o.deja && o.coche); if(!L.length){ agToast('Rien de coché', 'info'); return; }
  let n = 0;
  for(const o of L){
    const base = { amount: o.montant, category: o.categorie || (o.sens === 'entree' ? 'Autre entrée' : 'Autre'), note: [o.libelle, o.contrepartie].filter(Boolean).join(' · ') + ' (capture)', date: o.date || todayStr(), account_id: a.id, payment_method: a.name };
    const t = await dbInsert('transactions', Object.assign({ type: o.sens === 'entree' ? 'revenu' : 'depense' }, base));
    if(t){ txs.unshift(t); n++; if(o.frais > 0){ const f = await dbInsert('transactions', { type: 'depense', amount: o.frais, category: 'Frais', note: 'Frais ' + a.name + ' · ' + (o.libelle || ''), date: base.date, account_id: a.id, payment_method: a.name, details: 'frais:' + t.id }); if(f) txs.unshift(f); } }
  }
  refreshAll();
  const bal = agAccountBalance(a);
  agCloseSheet('apCapSheet');
  agToast(`${n} mouvement${n > 1 ? 's' : ''} ajouté${n > 1 ? 's' : ''} sur ${a.name}`);
  if(C.solde != null && C.solde !== Math.round(bal) && await agConfirm(`La capture montre ${F(C.solde)} sur ${a.name}, l'app ${F(bal)}.\nAjuster le solde de l'app pour qu'il soit identique ?`, { ok: 'Ajuster', no: 'Plus tard' })) agOpenAdjust(a.id);
};

// ============================================================
// 3. BUDGETS : mettre de côté depuis un compte ou un coffre libre
// ============================================================
if(typeof bgCote === 'function'){
  bgCote = function(b){
    let total = 0, goalId = null, accountId = null, srcGoal = null; const parts = [];
    txs.forEach(t => {
      if(t.cancelled) return;
      if(t.details === 'bgcote:' + b.id){ const m = Number(t.amount) || 0; total += m; goalId = t.to_goal_id; accountId = t.account_id || null; srcGoal = t.goal_id || null; parts.push({ m, account_id: t.account_id || null, goal_id: t.goal_id || null, date: t.date }); }
      if(t.details === 'bgretour:' + b.id) total -= Number(t.amount) || 0;
    });
    return { total: Math.max(0, Math.round(total)), goalId, accountId, srcGoal, parts };
  };
  // Ce qui n'a pas servi revient d'où il est venu (compte ou coffre)
  bgRendreCote = async function(b, dejaPris){
    const cote = bgCote(b), reste = Math.round(cote.total - (dejaPris || 0));
    if(!(reste > 0) || !cote.goalId) return 0;
    const c = coffres.find(x => x.id === cote.goalId); if(!c) return 0;
    const m = Math.min(reste, Math.round(Number(c.current) || 0)); if(!(m > 0)) return 0;
    const vers = cote.accountId ? { account_id: cote.accountId } : cote.srcGoal && coffres.find(x => x.id === cote.srcGoal) ? { goal_id: cote.srcGoal } : { account_id: (agPrincipal() || {}).id };
    if(!vers.account_id && !vers.goal_id) return 0;
    const tr = await bgTransfert({ from: { goal_id: c.id }, to: vers, amount: m, note: `${b.titre} · reste remis`, date: bgToday(), details: 'bgretour:' + b.id });
    return tr ? m : 0;
  };
  const srcNom = p => p.account_id ? agEndName('account', p.account_id) : agEndName('goal', p.goal_id);
  window.apCoteTexte = function(b){
    const tot = bgTotal(b.lignes), c = bgCote(b), reste = Math.max(0, tot - c.total);
    const srcs = {}; c.parts.forEach(p => { const n = srcNom(p) || '?'; srcs[n] = (srcs[n] || 0) + p.m; });
    const d = Object.entries(srcs).map(([n, m]) => `${F(m)} de ${n}`).join(', ');
    return { tot, cote: c.total, reste, d, pct: tot ? Math.min(100, Math.round(c.total / tot * 100)) : 0 };
  };
  bgProposerCote = function(id){
    const b = BG.budgets.find(x => x.id === id); if(!b) return;
    const T = apCoteTexte(b);
    const projets = bgFindCoffre('projets');
    const libres = agCoffres().filter(c => !projets || c.id !== projets.id);
    const comptes = agActiveAccounts();
    const defAcc = b.source_account_id || (comptes[0] || {}).id;
    const pill = (v, nom, montant, on, bloque) => `<button type="button" data-v="${v}" class="${on ? 'on' : ''} ${bloque ? 'ap-bloque' : ''}" onclick="${bloque ? `apCoffreBloque(${String(v).slice(1)})` : 'agPick(this);apCoteMaj()'}">${bloque ? agIcon('lock', 12) + ' ' : ''}${E(nom)}<small class="ag-m">${F(montant)}</small></button>`;
    agSheet('bgCoteSheet', `
      <h3>Mettre de côté pour « ${E(b.titre)} »</h3>
      <div class="ap-bgp"><div class="ap-bar"><i style="width:${T.pct}%"></i></div>
        <div class="ap-bgl"><span>De côté <b class="ag-m">${F(T.cote)}</b></span><span>Budget <b class="ag-m">${F(T.tot)}</b></span><span>Reste <b class="ag-m">${F(T.reste)}</b></span></div>
        ${T.d ? `<small>Déjà : ${E(T.d)}</small>` : ''}${b.date_evt ? `<small>Prévu le ${bgDateFr(b.date_evt, true)} (${bgQuand(bgJours(b.date_evt))})</small>` : ''}</div>
      <label for="bgCoteMt">Combien je mets de côté maintenant ?</label>
      <input id="bgCoteMt" type="number" inputmode="decimal" class="big" value="${T.reste || ''}" placeholder="0" oninput="apCoteMaj()">
      <label>D'où vient l'argent ?</label>
      <div class="ap-grp">Mes comptes</div>
      <div class="ag-pills" id="bgCoteFrom">${comptes.map(a => pill('a' + a.id, a.name, agAccountBalance(a), a.id === defAcc, false)).join('')}</div>
      <div class="ap-grp">Mes coffres</div>
      <div class="ag-pills" id="bgCoteFromG">${libres.map(c => pill('g' + c.id, c.name, c.current, false, !!bgCoffreBloqueMsg(c))).join('') || '<span class="ag-hint" style="margin:0">Aucun coffre</span>'}</div>
      <label for="bgCoteTo">Où le ranger ?</label>
      <select id="bgCoteTo">
        <option value="projets">${BG_NOM_PROJETS}${projets ? ' · ' + F(projets.current) : ' (créé pour toi)'}</option>
        ${libres.map(c => `<option value="${c.id}">${E(c.name)} · ${F(c.current)}</option>`).join('')}
      </select>
      <div class="ag-hint" id="apCoteInfo"></div>
      <button class="btn-primary" id="bgCoteBtn" style="margin-top:12px" onclick="bgFaireCote(${b.id})">Mettre de côté</button>
      <button class="btn-ghost" style="width:100%;margin-top:8px" onclick="agCloseSheet('bgCoteSheet')">Plus tard</button>`);
    // Un seul choix entre comptes et coffres
    document.querySelectorAll('#bgCoteFrom button, #bgCoteFromG button').forEach(btn => { if(!btn.classList.contains('ap-bloque')) btn.addEventListener('click', () => { document.querySelectorAll('#bgCoteFrom button, #bgCoteFromG button').forEach(x => { if(x !== btn) x.classList.remove('on'); }); btn.classList.add('on'); apCoteMaj(); }); });
    apCoteMaj();
  };
  window.apCoffreBloque = function(id){ const c = coffres.find(x => x.id === id); const msg = bgCoffreBloqueMsg(c); agAlert(msg || `Le coffre "${c ? c.name : ''}" est protégé.`); };
  window.apCoteMaj = function(){
    const b = document.getElementById('bgCoteSheet'); if(!b) return;
    const v = (document.querySelector('#bgCoteFrom button.on, #bgCoteFromG button.on') || {}).dataset || {};
    const m = Math.round(parseFloat((document.getElementById('bgCoteMt') || {}).value) || 0);
    const src = v.v ? (v.v[0] === 'a' ? accounts.find(x => x.id === Number(v.v.slice(1))) : coffres.find(x => x.id === Number(v.v.slice(1)))) : null;
    const dispo = src ? (v.v[0] === 'a' ? agAccountBalance(src) : Math.round(Number(src.current) || 0)) : 0;
    const info = document.getElementById('apCoteInfo');
    if(info) info.innerHTML = src ? (m > dispo ? `<span class="warn">${E(src.name)} n'a que ${F(dispo)}.</span>` : `${F(m)} quittent <b>${E(src.name)}</b> (il restera ${F(dispo - m)}) et sont rangés pour ce budget. Le jour J, les dépenses sortent de là. S'il reste de l'argent, il revient d'où il est venu.`) : 'Choisis d\'où vient l\'argent.';
  };
  bgFaireCote = async function(id){
    if(BG.busy) return;
    const b = BG.budgets.find(x => x.id === id); if(!b) return;
    const amount = Math.round(parseFloat(document.getElementById('bgCoteMt')?.value) || 0);
    const v = (document.querySelector('#bgCoteFrom button.on, #bgCoteFromG button.on') || {}).dataset || {};
    const to = document.getElementById('bgCoteTo')?.value;
    if(!(amount > 0)){ agAlert('Tape un montant.'); return; }
    if(!v.v){ agAlert("Choisis d'où vient l'argent."); return; }
    const from = v.v[0] === 'a' ? { account_id: Number(v.v.slice(1)) } : { goal_id: Number(v.v.slice(1)) };
    if(from.account_id){
      const a = accounts.find(x => x.id === from.account_id);
      if(agAccountBalance(a) - amount < 0 && !await agConfirm(`${a.name} va passer en négatif\nIl restera ${F(agAccountBalance(a) - amount)}. Continuer ?`)) return;
    } else {
      const c = coffres.find(x => x.id === from.goal_id);
      const msg = bgCoffreBloqueMsg(c); if(msg){ agAlert(msg); return; }
      if(msg === '' && !await agConfirm(`Le coffre "${c.name}" est protégé.\nPrendre quand même ${F(amount)} pour ce budget ?`)) return;
    }
    BG.busy = true;
    try {
      const c = to === 'projets' ? await bgEnsureCoffre('projets') : coffres.find(x => x.id === Number(to));
      if(!c){ agAlert("Le coffre n'a pas pu être trouvé."); return; }
      if(from.goal_id === c.id){ agAlert('Choisis un autre coffre de rangement que celui d\'où vient l\'argent.'); return; }
      const tr = await bgTransfert({ from, to: { goal_id: c.id }, amount, note: `${b.titre} · mis de côté`, date: bgToday(), details: 'bgcote:' + b.id });
      if(!tr) return;
      const lignes = bgClone(b.lignes);
      const aPayer = lignes.filter(l => (l.account_id || l.goal_id) && !l.tx_id && l.goal_id !== c.id).reduce((s, l) => s + Math.round(Number(l.prix) || 0), 0);
      const cote = bgCote(b).total;
      const maj = { updated_at: new Date().toISOString() };
      // Tout est couvert : le jour J, les dépenses sortiront du coffre de rangement
      if(aPayer > 0 && cote >= bgTotal(lignes)){
        lignes.forEach(l => { if(!l.tx_id && l.goal_id !== c.id){ l.account_id_avant = l.account_id; l.goal_id_avant = l.goal_id; l.account_id = null; l.goal_id = c.id; } });
        maj.lignes = lignes; maj.source_goal_id = c.id; maj.source_account_id = null;
      }
      const r = await dbUpdate('budgets', b.id, maj);
      bgSaveBudgetLocal({ ...b, ...(r || maj) });
      agCloseSheet('bgCoteSheet'); bgRefresh();
      const T = apCoteTexte(BG.budgets.find(x => x.id === id) || b);
      agToast(`${F(amount)} mis de côté pour « ${b.titre} »${T.reste ? ' · reste ' + F(T.reste) : ' · budget couvert'}`);
      if(document.getElementById('bgListe')) bgOuvrirListe('prevu');
    } finally { BG.busy = false; }
  };
  // La barre "de côté / reste" sur chaque budget prévu
  const listeAp = bgOuvrirListe;
  bgOuvrirListe = function(){
    const r = listeAp.apply(this, arguments);
    document.querySelectorAll('#bgListe .bg-item').forEach(it => {
      const d = it.querySelector('.d[onclick^="bgVoir("]'); if(!d) return;
      const id = Number((d.getAttribute('onclick').match(/\d+/) || [])[0]); const b = BG.budgets.find(x => x.id === id);
      if(!b || b.modele || b.statut !== 'prevu' || it.querySelector('.ap-bgp')) return;
      const T = apCoteTexte(b);
      it.querySelector('.h').insertAdjacentHTML('afterend', `<div class="ap-bgp"><div class="ap-bar"><i style="width:${T.pct}%"></i></div><small>${T.cote ? `<b class="ag-m">${F(T.cote)}</b> de côté${T.d ? ' (' + E(T.d) + ')' : ''} · ` : 'Rien de côté · '}${T.reste ? `reste <b class="ag-m">${F(T.reste)}</b> à trouver` : '<b>budget couvert</b>'}</small></div>`);
    });
    return r;
  };
  const voirAp = bgVoir;
  bgVoir = function(id){
    const r = voirAp.apply(this, arguments);
    const b = BG.budgets.find(x => x.id === id), sh = document.getElementById('bgVoirSheet');
    if(b && sh && b.statut === 'prevu' && !b.modele && !sh.querySelector('.ap-bgp')){
      const T = apCoteTexte(b), h = sh.querySelector('h3');
      if(h) h.insertAdjacentHTML('afterend', `<div class="ap-bgp"><div class="ap-bar"><i style="width:${T.pct}%"></i></div><div class="ap-bgl"><span>De côté <b class="ag-m">${F(T.cote)}</b></span><span>Reste <b class="ag-m">${F(T.reste)}</b></span></div>${T.d ? `<small>${E(T.d)}</small>` : ''}${T.reste ? `<button class="bg-small acc" style="margin-top:6px" onclick="bgProposerCote(${b.id})">Mettre de côté</button>` : ''}</div>`);
    }
    return r;
  };
}
// Sur l'Accueil : les budgets proches qui ne sont pas encore couverts
if(typeof agRenderDashMini === 'function'){
  const dashAp = agRenderDashMini;
  agRenderDashMini = function(){
    const r = dashAp.apply(this, arguments);
    try {
      const el = document.getElementById('agDashMini'); if(!el || typeof BG === 'undefined' || !BG.loaded || typeof apCoteTexte !== 'function') return r;
      const old = document.getElementById('apBudgetDash'); if(old) old.remove();
      const L = BG.budgets.filter(b => !b.modele && b.statut === 'prevu' && b.date_evt && bgJours(b.date_evt) >= 0 && bgJours(b.date_evt) <= 14).map(b => ({ b, T: apCoteTexte(b) })).filter(x => x.T.reste > 0).sort((x, y) => String(x.b.date_evt).localeCompare(String(y.b.date_evt)));
      if(!L.length) return r;
      const x = L[0], d = document.createElement('div'); d.id = 'apBudgetDash'; d.className = 'crm-fete ap-bdash';
      d.onclick = () => bgProposerCote(x.b.id);
      d.innerHTML = `<div class="ic">${agIcon('target')}</div><div class="d"><b>${E(x.b.titre)} ${bgQuand(bgJours(x.b.date_evt))}</b><span>${F(x.T.cote)} de côté · reste ${F(x.T.reste)} à mettre de côté${L.length > 1 ? ' · et ' + (L.length - 1) + ' autre' + (L.length > 2 ? 's' : '') : ''}</span><div class="ap-bar"><i style="width:${x.T.pct}%"></i></div></div>${agIcon('chev', 16)}`;
      const hello = el.querySelector('.ag-hello'), apres = el.querySelector('#otResaDash') || hello;
      if(apres && apres.nextSibling) el.insertBefore(d, apres.nextSibling); else el.appendChild(d);
    } catch(e){}
    return r;
  };
}

// ============================================================
// 4. PAIEMENT EN ESPÈCES : d'où sort l'argent rangé dans les coffres
// ============================================================
window.AP_REP_SRC = null;
if(typeof ouvrirRepartitionPaiement === 'function'){
  const ouvrirRepAp = ouvrirRepartitionPaiement;
  ouvrirRepartitionPaiement = async function(ctx){
    window.AP_REP_SRC = null;
    const r = await ouvrirRepAp.apply(this, arguments);
    try {
      const btn = document.getElementById('repValiderBtn'); if(!btn || !ctx) return r;
      const old = document.getElementById('apRepSrc'); if(old) old.remove();
      const acc = accounts.find(a => a.id === ctx.accountId);
      const comptes = agActiveAccounts().filter(a => a.id !== ctx.accountId);
      const cofs = agCoffres();
      const p = (v, nom, mt, on, bloque) => `<button type="button" data-v="${v}" class="${on ? 'on' : ''} ${bloque ? 'ap-bloque' : ''}" onclick="apRepChoix(this)">${bloque ? agIcon('lock', 12) + ' ' : ''}${E(nom)}${mt != null ? `<small class="ag-m">${F(mt)}</small>` : ''}</button>`;
      btn.insertAdjacentHTML('beforebegin', `<div id="apRepSrc" class="ap-rep">
        <label>D'où sort l'argent rangé dans les coffres ?</label>
        <div class="ag-pills">${p('', 'Là où il est entré' + (acc ? ' (' + acc.name + ')' : ''), null, true, false)}${comptes.map(a => p('a' + a.id, a.name, agAccountBalance(a), false, false)).join('')}${cofs.map(c => p('g' + c.id, c.name, c.current, false, estCoffreBloque(c) && !!bgRepBloqueMsg(c))).join('')}</div>
        <div class="ag-hint" id="apRepInfo">Le client a payé en espèces et tu gardes l'espèce ? Choisis le compte ou le coffre qui remplace cet argent : l'espèce reste dans ${acc ? E(acc.name) : 'ton compte'}, et c'est lui qui alimente les coffres.</div></div>`);
    } catch(e){ console.warn('répartition', e); }
    return r;
  };
}
function bgRepBloqueMsg(c){ return typeof bgCoffreBloqueMsg === 'function' ? bgCoffreBloqueMsg(c) : (estCoffreBloque(c) ? 'Ce coffre est bloqué.' : null); }
window.apRepChoix = async function(btn){
  const v = btn.dataset.v || '';
  if(v[0] === 'g'){
    const c = coffres.find(x => x.id === Number(v.slice(1)));
    const msg = bgRepBloqueMsg(c);
    if(msg){ agAlert(msg); return; }
    if(msg === '' && !await agConfirm(`Le coffre "${c.name}" est protégé.\nTu ne devrais pas toucher cet argent. L'utiliser quand même ?`, { ok: 'Oui, l\'utiliser', no: 'Non' })) return;
  }
  document.querySelectorAll('#apRepSrc button').forEach(x => x.classList.toggle('on', x === btn));
  window.AP_REP_SRC = v ? (v[0] === 'a' ? { account_id: Number(v.slice(1)) } : { goal_id: Number(v.slice(1)) }) : null;
  const info = document.getElementById('apRepInfo');
  if(info && window.AP_REP_SRC){ const o = v[0] === 'a' ? accounts.find(x => x.id === Number(v.slice(1))) : coffres.find(x => x.id === Number(v.slice(1))); info.innerHTML = `L'argent rangé dans les coffres sortira de <b>${E(o ? o.name : '')}</b> (il a ${F(v[0] === 'a' ? agAccountBalance(o) : o.current)}). L'espèce reçue reste là où tu l'as notée.`; }
};
if(typeof verserDansCoffre === 'function'){
  const verserAp = verserDansCoffre;
  verserDansCoffre = async function(o){
    const S = window.AP_REP_SRC;
    if(!S || !/^rep:/.test(o.details || '')) return verserAp.apply(this, arguments);
    if(S.account_id) return verserAp.call(this, Object.assign({}, o, { accountId: S.account_id }));
    // Depuis un coffre : transfert de coffre à coffre (le même coffre : l'argent y est déjà)
    if(S.goal_id === o.goalId) return { id: 0, deja: true };
    const src = coffres.find(x => x.id === S.goal_id), c = coffres.find(x => x.id === o.goalId);
    if(!src || !c) return null;
    if(o.amount > Math.round(Number(src.current) || 0)){ agAlert(`Le coffre "${src.name}" n'a que ${F(src.current)}.`); return null; }
    const tr = await dbInsert('transactions', { _agRaw: true, type: 'transfert', category: 'Entre coffres', amount: o.amount, goal_id: src.id, to_goal_id: c.id, details: o.details, shoot_id: o.shootId || null, note: o.note || null, date: o.date || todayStr(), payment_method: 'Interne' });
    if(!tr) return null;
    txs.unshift(tr); await agSyncGoals(null, tr);
    return tr;
  };
}
if(typeof validerRepartitionPaiement === 'function'){
  const validerAp = validerRepartitionPaiement;
  validerRepartitionPaiement = async function(){
    const S = window.AP_REP_SRC;
    if(S && S.goal_id){
      const src = coffres.find(x => x.id === S.goal_id);
      const ids = [['repSalaireMontant', 'salaire'], ['repStudioMontant', 'studio'], ['repEpargneMontant', 'epargne']];
      let besoin = 0; ids.forEach(([el, k]) => { const m = Math.round(parseFloat(document.getElementById(el)?.value) || 0); if(typeof _repCoffreIds !== 'undefined' && _repCoffreIds[k] !== S.goal_id) besoin += m; });
      if(src && besoin > Math.round(Number(src.current) || 0)){ agAlert(`Le coffre "${src.name}" n'a que ${F(src.current)}.\nIl faut ${F(besoin)} pour cette répartition : choisis une autre source ou baisse les montants.`); return; }
    } else if(S && S.account_id){
      const a = accounts.find(x => x.id === S.account_id);
      const tot = Math.round(Number((typeof _repCtx !== 'undefined' && _repCtx || {}).aRepartir) || 0);
      if(a && agAccountBalance(a) < tot && !await agConfirm(`${a.name} n'a que ${F(agAccountBalance(a))}.\nIl passera en négatif. Continuer ?`)) return;
    }
    try { return await validerAp.apply(this, arguments); } finally { if(!document.getElementById('repartitionPaiementBg')?.classList.contains('show')) window.AP_REP_SRC = null; }
  };
}

// ============================================================
// 5. NOTES : "Modifier" en haut de chaque note
// ============================================================
if(typeof renderNotes === 'function'){
  const notesAp = renderNotes;
  renderNotes = function(){
    const r = notesAp.apply(this, arguments);
    document.querySelectorAll('.note-card[data-note]').forEach(c => {
      const q = c.querySelector('.note-quick'); if(!q || q.querySelector('.ap-ned')) return;
      const id = Number(c.dataset.note);
      q.insertAdjacentHTML('afterbegin', `<button class="ap-ned" onclick="openNoteModal(${id})" title="Modifier la note" aria-label="Modifier">${agIcon('edit', 15)}<span>Modifier</span></button>`);
    });
    return r;
  };
}
if(typeof openNoteModal === 'function'){
  const noteOpenAp = openNoteModal;
  openNoteModal = function(id){
    const r = noteOpenAp.apply(this, arguments);
    const ta = document.getElementById('noteContent');
    if(ta){ const n = (ta.value.match(/\n/g) || []).length + Math.ceil(ta.value.length / 60); ta.rows = Math.max(5, Math.min(18, n + 1)); setTimeout(() => { try { ta.setSelectionRange(0, 0); ta.scrollTop = 0; } catch(e){} }, 220); }
    // Enregistrer aussi en haut (plus besoin de descendre)
    const h = document.querySelector('#noteModalBg .modal-wrap');
    if(h && !h.querySelector('.ap-nsave')) h.insertAdjacentHTML('beforeend', `<button type="button" class="ap-nsave" onclick="document.getElementById('noteSubmit').click()">${agIcon('download', 14)} Enregistrer</button>`);
    return r;
  };
}

// ============================================================
// 6. BOUTON RETOUR DU TÉLÉPHONE : rester dans l'app
// ============================================================
const NAV = { pile: [], retour: false, quitter: 0 };
if(typeof showTab === 'function'){
  const showAp = showTab;
  showTab = function(name){
    const avant = typeof otActivePage === 'function' ? otActivePage() : null;
    const r = showAp.apply(this, arguments);
    if(!NAV.retour && avant && avant !== name){ NAV.pile.push(avant); if(NAV.pile.length > 30) NAV.pile.shift(); }
    return r;
  };
}
function apVisible(el){ return !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'; }
// Ferme ce qui est ouvert, du plus haut au plus bas. Renvoie true si quelque chose a été fait.
function apRetour(){
  const dlg = document.querySelector('.ag-dlg-bg'); if(dlg){ const no = dlg.querySelector('.ag-dlg-no') || dlg.querySelector('.ag-dlg-ok'); if(no) no.click(); else dlg.remove(); return true; }
  const sheets = [...document.querySelectorAll('.ag-sheet')]; if(sheets.length){ sheets[sheets.length - 1].remove(); return true; }
  const modals = [...document.querySelectorAll('.modal-bg.show')].filter(apVisible);
  if(modals.length){ const m = modals[modals.length - 1]; const x = m.querySelector('.close, [aria-label="Fermer"]'); if(x) x.click(); else m.classList.remove('show'); return true; }
  if(document.body.classList.contains('ed-ouvert')){ const b = document.querySelector('#edPortail .ed-g .ag-back'); if(b){ b.click(); return true; } }
  const page = document.querySelector('.page.active');
  const back = page && [...page.querySelectorAll('.ag-back')].find(apVisible); if(back){ back.click(); return true; }
  if(NAV.pile.length){ const t = NAV.pile.pop(); NAV.retour = true; try { agGoTab(t); } finally { NAV.retour = false; } return true; }
  const act = typeof otActivePage === 'function' ? otActivePage() : 'dashboard';
  if(act && act !== 'dashboard' && act !== 'dash'){ NAV.retour = true; try { agGoTab('dashboard'); } finally { NAV.retour = false; } return true; }
  return false;
}
// Une "marche" d'historique en plus : le retour du téléphone tombe dessus au lieu de quitter.
// Chrome ignore les marches ajoutées sans geste de l'utilisateur : on la remet à chaque toucher.
function apMarche(){ try { if(!history.state || history.state.ag !== 'app') history.pushState({ ag: 'app' }, ''); } catch(e){} }
try {
  if(!history.state || !history.state.ag) history.replaceState({ ag: 'base' }, '');
  apMarche();
  ['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, apMarche, true));
  window.addEventListener('popstate', () => {
    if(apRetour()){ apMarche(); return; }
    if(Date.now() - NAV.quitter < 2200){ history.back(); return; }   // deuxième appui : on quitte vraiment
    NAV.quitter = Date.now(); agToast('Appuie encore sur retour pour quitter l\'app', 'info');
    apMarche();
  });
} catch(e){}

(function apCss(){
  if(document.getElementById('apCss')) return;
  const st = document.createElement('style'); st.id = 'apCss';
  st.textContent = `
.ap-pourquoi{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;margin:8px 0 10px;padding:10px;border-radius:12px;border:1px dashed color-mix(in srgb,var(--accent) 55%,transparent);background:color-mix(in srgb,var(--accent) 8%,transparent);color:var(--text);font-weight:600;font-size:13px;cursor:pointer}
.ap-recit{padding:10px 12px;border-radius:12px;background:var(--card2);font-size:13px;line-height:1.5;color:var(--text);margin:8px 0}
.ap-tab{border-radius:12px;border:1px solid var(--border);overflow:hidden;margin-bottom:10px}
.ap-r{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;font-size:13px;color:var(--text);border-top:1px solid var(--border)}.ap-r:first-child{border-top:0}
.ap-r i{font-style:normal;font-size:11px;color:var(--muted);margin-left:4px}.ap-r.plus b{color:var(--accent)}.ap-r.moins b{color:#e5484d}.ap-r.tot{background:var(--card2);font-weight:700}
.ap-sec{margin:14px 0 6px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}.ap-sec i{font-style:normal;margin-left:4px}
.ap-list{display:flex;flex-direction:column;gap:4px;max-height:44vh;overflow-y:auto}
.ap-m{display:flex;align-items:center;gap:10px;width:100%;margin:0;padding:8px 10px;border-radius:10px;border:0;background:var(--card2);text-align:left;cursor:pointer;color:var(--text)}
.ap-d{flex:none;width:58px;font-size:11px;color:var(--muted)}
.ap-q{flex:1;min-width:0;display:flex;flex-direction:column}.ap-q b{font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ap-q small{font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ap-v{flex:none;display:flex;flex-direction:column;align-items:flex-end}.ap-v small{font-size:10.5px;color:var(--muted)}
.plus{color:var(--accent)}.moins{color:#e5484d}
.ap-qs{display:flex;flex-wrap:wrap;gap:6px}.ap-qs button{width:auto;margin:0;padding:6px 10px;border-radius:999px;border:1px solid var(--border);background:var(--card2);color:var(--text);font-size:12px;cursor:pointer}
.ap-ask{display:flex;gap:6px;margin-top:8px}.ap-ask input{flex:1;margin:0}.ap-ask button{width:auto;margin:0;padding:0 16px}
.ap-ia{margin-top:10px;padding:12px;border-radius:12px;background:color-mix(in srgb,var(--accent) 10%,var(--card));font-size:13px;line-height:1.55;color:var(--text)}.ap-ia b{display:block;margin-bottom:4px}
.ap-cap{width:100%;display:flex;align-items:center;justify-content:center;gap:6px}
.ap-caps{display:flex;flex-direction:column;gap:6px}
.ap-cop{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;background:var(--card2)}.ap-cop input[type=checkbox]{width:20px;height:20px;flex:none;margin:0}
.ap-cat{margin:4px 0 0;padding:4px 8px;font-size:12px;height:auto;border-radius:8px;max-width:180px}
.ap-deja{margin-top:10px}.ap-deja summary{cursor:pointer;font-size:12.5px;color:var(--muted)}.ap-deja .ap-cop{margin-top:4px;opacity:.75}
.ap-bgp{margin:6px 0 4px}.ap-bgp small{display:block;font-size:11.5px;color:var(--muted);margin-top:4px}
.ap-bar{height:8px;border-radius:6px;background:var(--card2);overflow:hidden}.ap-bar i{display:block;height:100%;background:var(--accent);border-radius:6px}
.ap-bgl{display:flex;justify-content:space-between;gap:8px;margin-top:6px;font-size:12px;color:var(--muted)}.ap-bgl b{color:var(--text)}
.ap-grp{font-size:11px;color:var(--muted);margin:8px 0 4px;font-weight:600}
.ag-pills button.ap-bloque{opacity:.55}
.ap-rep{margin:12px 0 4px;padding:10px;border-radius:12px;background:var(--card2)}.ap-rep label{display:block;font-size:12.5px;margin-bottom:6px}
.ap-bdash .ap-bar{margin-top:6px;height:5px}
.ap-ned{display:inline-flex !important;align-items:center;gap:4px;width:auto !important;padding:5px 9px !important;border-radius:999px !important;font-size:12px;font-weight:600}
.ap-nsave{display:inline-flex;align-items:center;gap:5px;width:auto;margin:0 34px 0 auto;padding:7px 12px;border-radius:10px;border:0;background:var(--accent);color:#fff;font-weight:700;font-size:12.5px;cursor:pointer}
#noteModalBg .modal-wrap{display:flex;align-items:center;gap:8px}`;
  document.head.appendChild(st);
})();
})();
