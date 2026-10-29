// ============================================================
// FRAIS.JS - Les frais des opérateurs (Wave, Orange Money, MTN, Moov...)
// ------------------------------------------------------------
// Chargé par argent.js.
// Principe : le client a payé le montant entier (la séance est réglée),
// mais l'opérateur garde une petite partie. Cette partie est notée comme
// une DÉPENSE "Frais", liée à l'entrée (details = 'frais:<id de l'entrée>').
//   - le compte affiche donc ce qui est VRAIMENT arrivé ;
//   - annuler / supprimer l'entrée annule / supprime aussi ses frais ;
//   - les coffres ne sont jamais touchés par les frais.
// Réglage par compte (colonne accounts.frais) :
//   { entree: { mode: 'aucun' | 'auto' | 'demander', taux, fixe },
//     sortie: { mode, taux, fixe } }   (sortie = retrait / envoi vers un autre compte)
// Sans réglage : Espèces = aucun frais ; les autres comptes = "me demander".
// ============================================================

const FR_MODES = { aucun: 'Aucun frais', auto: 'Calcul automatique', demander: 'Me demander à chaque fois' };
let frFile = [];          // mouvements qui attendent la question "des frais ?"
let frMinuteur = null;

function frReglage(acc, sens){
  const f = (acc && acc.frais && acc.frais[sens]) || null;
  if(f && f.mode) return { mode: f.mode, taux: Number(f.taux) || 0, fixe: Number(f.fixe) || 0 };
  if(!acc || acc.kind === 'especes') return { mode: 'aucun', taux: 0, fixe: 0 };
  return { mode: sens === 'entree' ? 'demander' : 'aucun', taux: 0, fixe: 0, defaut: true };
}
function frCalcul(montant, r){ return Math.max(0, Math.round((Number(montant) || 0) * (Number(r.taux) || 0) / 100 + (Number(r.fixe) || 0))); }
function frDejaNote(id){ return txs.some(x => x.details === 'frais:' + id && !x.cancelled); }

// Enregistre la dépense "Frais" liée au mouvement t
async function frEnregistrer(t, acc, montant, sens){
  montant = Math.round(Number(montant) || 0);
  // On remplace les frais déjà notés (modification)
  for(const x of txs.filter(x => x.details === 'frais:' + t.id)){
    const ok = await _agDbDelete('transactions', x.id);
    if(ok) txs = txs.filter(y => y.id !== x.id);
  }
  if(montant <= 0){ refreshAll(); return null; }
  const r = await _agDbInsert('transactions', {
    type: 'depense', category: 'Frais', amount: montant,
    note: `Frais ${acc.name}${sens === 'sortie' ? ' (retrait / envoi)' : ''}${t.note ? ' · ' + String(t.note).slice(0, 60) : ''}`,
    date: t.date || todayStr(), payment_method: acc.name, account_id: acc.id,
    client_id: t.client_id || null, client_name: t.client_name || null,
    details: 'frais:' + t.id
  });
  if(r){ txs.unshift(r); refreshAll(); }
  return r;
}

// Appelé après chaque nouvelle entrée d'argent ou transfert entre comptes
function frApres(t){
  if(!t || t.cancelled || t._frNon) return;
  let sens = null, acc = null;
  if(t.type === 'revenu' && t.account_id && t.payment_method !== 'Interne'){ sens = 'entree'; acc = accounts.find(a => a.id === t.account_id); }
  else if(t.type === 'transfert' && t.account_id && t.to_account_id && t.category !== 'Ajustement'){ sens = 'sortie'; acc = accounts.find(a => a.id === t.account_id); }
  if(!sens || !acc || frDejaNote(t.id)) return;
  const r = frReglage(acc, sens);
  if(r.mode === 'aucun') return;
  if(r.mode === 'auto'){
    const m = frCalcul(t.amount, r);
    if(m > 0) frEnregistrer(t, acc, m, sens).then(x => { if(x) agToast(`Frais ${acc.name} : ${agF(m)} notés`); });
    return;
  }
  frFile.push({ id: t.id, sens });
  frPompe();
}
// La question s'affiche quand plus aucune autre fenêtre n'est ouverte
// (ex : après la répartition d'un paiement de séance)
// Une autre fenêtre est ouverte (en dehors de la question des frais) ?
function frAutreFenetre(){
  return [...document.querySelectorAll('.modal-bg.show, .ag-dlg-bg, .modal.show')]
    .some(el => el.id !== 'frSheet' && !el.closest('#frSheet') && getComputedStyle(el).display !== 'none');
}
let frCalme = 0;
function frPompe(){
  clearTimeout(frMinuteur);
  if(!frFile.length) return;
  // On attend que l'écran soit calme pendant 2 secondes (ex : la répartition
  // d'un paiement de séance s'ouvre juste après l'entrée d'argent)
  if(frAutreFenetre() || document.getElementById('frSheet')){ frCalme = 0; frMinuteur = setTimeout(frPompe, 700); return; }
  if(frCalme < 3){ frCalme++; frMinuteur = setTimeout(frPompe, 700); return; }
  frCalme = 0;
  const x = frFile.shift();
  const t = txs.find(y => y.id === x.id);
  if(!t || t.cancelled || frDejaNote(t.id)){ frPompe(); return; }
  frOuvrir(t.id, x.sens, true);
  frSurveiller(x);
}
// Si une autre fenêtre s'ouvre pendant la question, on la range et on la repose plus tard
function frSurveiller(x){
  const iv = setInterval(() => {
    const s = document.getElementById('frSheet');
    if(!s){ clearInterval(iv); return; }
    if(frAutreFenetre()){ clearInterval(iv); s.remove(); frFile.unshift(x); frPompe(); }
  }, 500);
}

// Fenêtre "Des frais sur ce mouvement ?"
function frOuvrir(id, sens, auto){
  const t = txs.find(x => x.id === id); if(!t) return;
  sens = sens || (t.type === 'revenu' ? 'entree' : 'sortie');
  const acc = accounts.find(a => a.id === t.account_id); if(!acc) return;
  const r = frReglage(acc, sens);
  const deja = txs.filter(x => x.details === 'frais:' + id && !x.cancelled).reduce((a, x) => a + (Number(x.amount) || 0), 0);
  const propose = deja || (r.taux || r.fixe ? frCalcul(t.amount, r) : 0);
  const tauxs = [0.5, 1, 1.5, 2, 3];
  const titre = sens === 'entree' ? `${agF(t.amount)} arrivés sur ${acc.name}` : `${agF(t.amount)} envoyés depuis ${acc.name}`;
  agSheet('frSheet', `
    <h3>Des frais sur ce mouvement ?</h3>
    <div class="ag-hint" style="margin-top:0">${agEsc(titre)}${t.note ? ' · ' + agEsc(String(t.note).slice(0, 70)) : ''}</div>
    <label>Pourcentage de l'opérateur</label>
    <div class="ag-pills" id="frTaux">${tauxs.map(x => `<button type="button" data-v="${x}" class="${r.taux === x && !deja ? 'on' : ''}" onclick="agPick(this);frTauxChoisi(${x})">${String(x).replace('.', ',')} %</button>`).join('')}</div>
    <label>Frais (FCFA)</label>
    <input id="frMontant" type="number" inputmode="decimal" class="big" value="${propose || ''}" placeholder="0" oninput="frMaj()">
    <div class="ag-hint" id="frNet"></div>
    <label class="ag-check" style="margin-top:6px"><input type="checkbox" id="frRetenir"> Retenir pour ${agEsc(acc.name)} : calculer tout seul la prochaine fois</label>
    <button class="btn-primary" style="width:100%" onclick="frValider(${id},'${sens}')">${deja ? 'Enregistrer' : 'Noter les frais'}</button>
    <button class="btn-ghost" style="width:100%;margin-top:8px" onclick="frSansFrais(${id})">${deja ? 'Retirer les frais' : 'Pas de frais'}</button>
    ${auto ? `<button class="btn-ghost" style="width:100%;margin-top:8px;font-size:12.5px" onclick="frNePlusDemander(${acc.id},'${sens}')">Ne plus demander pour ${agEsc(acc.name)}</button>` : ''}
    <div class="ag-hint">Le client a payé le montant entier : la séance reste réglée. Les frais sont notés comme une dépense "Frais", pour que ton compte corresponde à ce que tu as vraiment.</div>
  `);
  frMaj();
}
function frTauxChoisi(x){
  const t = txs.find(y => document.getElementById('frSheet') && y.id === frIdOuvert()); if(!t) return;
  document.getElementById('frMontant').value = Math.round(Number(t.amount) * x / 100);
  document.getElementById('frSheet').dataset.taux = x;
  frMaj();
}
function frIdOuvert(){ const b = document.querySelector('#frSheet .btn-primary'); const m = b && (b.getAttribute('onclick') || '').match(/frValider\((\d+)/); return m ? Number(m[1]) : null; }
function frMaj(){
  const t = txs.find(y => y.id === frIdOuvert()); const el = document.getElementById('frNet'); if(!t || !el) return;
  const f = Math.round(Number(document.getElementById('frMontant').value) || 0);
  const pct = t.amount ? Math.round(f / Number(t.amount) * 1000) / 10 : 0;
  el.innerHTML = f > 0
    ? (t.type === 'revenu' ? `Vraiment arrivé sur le compte : <b>${agF(Number(t.amount) - f)}</b> (frais ${String(pct).replace('.', ',')} %)` : `Vraiment sorti du compte : <b>${agF(Number(t.amount) + f)}</b> (frais ${String(pct).replace('.', ',')} %)`)
    : 'Pas de frais.';
}
async function frValider(id, sens){
  const t = txs.find(x => x.id === id); if(!t) return;
  const acc = accounts.find(a => a.id === t.account_id); if(!acc) return;
  const m = Math.round(Number(document.getElementById('frMontant').value) || 0);
  if(m < 0){ agAlert('Tape un montant positif.'); return; }
  if(m >= Number(t.amount)){ agAlert('Les frais ne peuvent pas être plus grands que le montant.'); return; }
  if(document.getElementById('frRetenir')?.checked && m > 0){
    const sheet = document.getElementById('frSheet');
    const taux = Number(sheet.dataset.taux) || Math.round(m / Number(t.amount) * 1000) / 10;
    await frSauverReglage(acc, sens, { mode: 'auto', taux, fixe: 0 });
  }
  agCloseSheet('frSheet');
  const r = await frEnregistrer(t, acc, m, sens);
  agToast(m > 0 ? (r ? `Frais notés : ${agF(m)}` : 'Les frais n\'ont pas pu être notés') : 'Pas de frais');
  frPompe();
}
async function frSansFrais(id){
  const t = txs.find(x => x.id === id);
  agCloseSheet('frSheet');
  if(t && frDejaNote(id)){ const acc = accounts.find(a => a.id === t.account_id); await frEnregistrer(t, acc, 0); agToast('Frais retirés'); }
  frPompe();
}
async function frNePlusDemander(accId, sens){
  const acc = accounts.find(a => a.id === accId); if(!acc) return;
  await frSauverReglage(acc, sens, { mode: 'aucun', taux: 0, fixe: 0 });
  agCloseSheet('frSheet');
  agToast(`Plus de question pour ${acc.name}. Tu peux changer ça dans le compte.`);
  frPompe();
}
async function frSauverReglage(acc, sens, val){
  const frais = { ...(acc.frais || {}), [sens]: val };
  const r = await _agDbUpdate('accounts', acc.id, { frais });
  if(r){ const i = accounts.findIndex(a => a.id === acc.id); if(i >= 0) accounts[i] = r; else acc.frais = frais; }
  else acc.frais = frais;
}

// ---------- Réglages dans la fiche du compte ----------
function frFormHtml(a){
  const bloc = (sens, titre, aide) => {
    const r = frReglage(a || { kind: 'wave' }, sens);
    return `<div class="fr-bloc"><b>${titre}</b><div class="ag-hint" style="margin:2px 0 6px">${aide}</div>
      <div class="ag-pills" id="frM_${sens}">${Object.entries(FR_MODES).map(([k, l]) => `<button type="button" data-v="${k}" class="${r.mode === k ? 'on' : ''}" onclick="agPick(this);frFormMaj()">${l}</button>`).join('')}</div>
      <div class="fr-2" id="frV_${sens}"><div><label>Pourcentage (%)</label><input id="frT_${sens}" type="number" inputmode="decimal" step="0.1" value="${r.taux || ''}" placeholder="Ex : 1"></div>
      <div><label>+ Montant fixe (F)</label><input id="frF_${sens}" type="number" inputmode="decimal" value="${r.fixe || ''}" placeholder="0"></div></div></div>`;
  };
  return `<details class="fr-reg" ${a && a.frais && Object.keys(a.frais).length ? 'open' : ''}><summary>Frais de l'opérateur</summary>
    ${bloc('entree', "Quand de l'argent arrive", 'Ex : un client te paie par Wave et 1 % est retenu.')}
    ${bloc('sortie', 'Quand tu retires ou envoies vers un autre compte', 'Ex : retrait Orange Money vers tes espèces.')}
  </details>`;
}
function frFormMaj(){
  ['entree', 'sortie'].forEach(s => {
    const m = document.querySelector(`#frM_${s} button.on`)?.dataset.v;
    const v = document.getElementById('frV_' + s); if(v) v.style.display = m === 'auto' ? '' : 'none';
  });
}
function frFormLire(){
  if(!document.getElementById('frM_entree')) return null;
  const lire = s => ({
    mode: document.querySelector(`#frM_${s} button.on`)?.dataset.v || 'aucun',
    taux: Math.max(0, Number(document.getElementById('frT_' + s)?.value) || 0),
    fixe: Math.max(0, Math.round(Number(document.getElementById('frF_' + s)?.value) || 0))
  });
  return { entree: lire('entree'), sortie: lire('sortie') };
}
// Les champs % s'affichent seulement en "Calcul automatique"
new MutationObserver(() => { if(document.getElementById('frM_entree') && !document.getElementById('frM_entree').dataset.pret){ document.getElementById('frM_entree').dataset.pret = 1; frFormMaj(); } })
  .observe(document.body, { childList: true, subtree: true });

// ---------- Branchements ----------
// 1) Toutes les entrées d'argent passent par dbInsert (séances, dettes, entrées à la main...)
(function(){
  const avant = dbInsert;
  dbInsert = async function(table, data){
    const res = await avant(table, data);
    if(res && table === 'transactions' && !(data && data._frNon)) setTimeout(() => frApres(res), 300);
    return res;
  };
})();
// 2) Les transferts entre comptes (fenêtre Transférer)
(function(){
  if(typeof agDoTransfer !== 'function') return;
  const avant = agDoTransfer;
  agDoTransfer = async function(){
    const ids = new Set(txs.map(t => t.id));
    const r = await avant.apply(this, arguments);
    const nouveau = txs.find(t => !ids.has(t.id) && t.type === 'transfert');
    if(nouveau) setTimeout(() => frApres(nouveau), 300);
    return r;
  };
})();

// 3) Résumé "Frais ce mois" sur la page Comptes
function frTotalMois(){
  const m = todayStr().slice(0, 7);
  return txs.filter(t => !t.cancelled && t.type === 'depense' && t.category === 'Frais' && String(t.date || '').slice(0, 7) === m).reduce((a, t) => a + (Number(t.amount) || 0), 0);
}
(function(){
  if(typeof agRenderArgent !== 'function') return;
  const avant = agRenderArgent;
  agRenderArgent = function(){
    const r = avant.apply(this, arguments);
    const el = document.getElementById('agArgentBody');
    if(el && !el.querySelector('.fr-mois')){
      const tot = frTotalMois();
      const d = document.createElement('div');
      d.className = 'ag-hint fr-mois';
      d.innerHTML = tot > 0
        ? `Frais des opérateurs ce mois : <b class="ag-m">${agF(tot)}</b> (déjà retirés de tes comptes).`
        : `Les frais Wave, Orange Money... se règlent dans chaque compte (bouton Modifier le compte).`;
      el.appendChild(d);
    }
    return r;
  };
})();

(function frCss(){
  if(document.getElementById('frCss')) return;
  const st = document.createElement('style'); st.id = 'frCss';
  st.textContent = `
.fr-reg{margin:14px 0 6px;border:1px solid var(--border);border-radius:14px;padding:10px 12px;background:var(--card)}
.fr-reg summary{cursor:pointer;font-weight:600;color:var(--text)}
.fr-bloc{margin-top:12px}
.fr-bloc b{color:var(--text);font-size:14px}
.fr-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.fr-mois{margin-top:14px}`;
  document.head.appendChild(st);
})();
