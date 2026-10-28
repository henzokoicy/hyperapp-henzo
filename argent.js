// ============================================================
// ARGENT.JS - Comptes, soldes, transferts et nouvelle navigation
// ------------------------------------------------------------
// Charge APRES app.js, modules.js et coach.js.
// Principe : chaque franc a une place.
//   - un COMPTE (Wave, Especes, Mobile Money, Banque...) a un solde
//     = solde de depart + entrees - depenses +/- transferts
//   - un COFFRE garde son montant (colonne goals.current)
//   - un TRANSFERT deplace de l'argent : compte <-> coffre <-> compte
//   - annuler / restaurer / supprimer un mouvement remet l'argent en place
// ============================================================

let accounts = [];
let _agLastMethod = null;      // dernier moyen de paiement choisi (Wave, Especes...)
let _agLastRevenu = null;      // derniere entree creee (pour lier la repartition)
let _agSkipSync = false;

const AG_KINDS = {
  wave:    { label: 'Wave',         icon: '', svg: 'wave' },
  especes: { label: 'Espèces',      icon: '', svg: 'cash' },
  mobile:  { label: 'Mobile Money', icon: '', svg: 'phone' },
  banque:  { label: 'Banque',       icon: '', svg: 'bank' },
  autre:   { label: 'Autre',        icon: '', svg: 'card' }
};

const AG_GROUPS = {
  accueil: { label: 'Accueil', icon: 'home',     tabs: ['dash'] },
  argent:  { label: 'Argent',  icon: 'wallet',   tabs: ['argent', 'coffres', 'objectifs', 'historique', 'materiel'] },
  studio:  { label: 'Studio',  icon: 'camera',   tabs: ['photo', 'clients', 'mood', 'galerie', 'tarifs', 'marketing'] },
  idees:   { label: 'Idées',   icon: 'bulb',     tabs: ['notes', 'business', 'inspiration', 'motiv'] },
  coach:   { label: 'Coach',   icon: 'sparkles', tabs: ['ia'] }
};
const AG_TAB_LABELS = {
  dash: 'Accueil', argent: 'Comptes', coffres: 'Coffres', objectifs: 'Objectifs', historique: 'Historique',
  photo: 'Séances', clients: 'Clients', mood: 'Moodboard', galerie: 'Galerie', tarifs: 'Tarifs', marketing: 'Marketing', materiel: 'Matériel', notes: 'Notes', business: 'Business',
  inspiration: 'Inspiration', motiv: 'Motivation', ia: 'IA'
};
// Pages Clients et Tarifs (remplies par crm.js)
(function agMakeCrmPages(){
  const ref = document.getElementById('page-coffres');
  if(!ref) return;
  [['clients', 'crmClientsBody'], ['mood', 'mbBody'], ['tarifs', 'crmTarifsBody'], ['marketing', 'mkBody'], ['materiel', 'mtBody']].forEach(([n, b]) => {
    if(document.getElementById('page-' + n)) return;
    const d = document.createElement('div');
    d.className = 'page'; d.id = 'page-' + n;
    d.innerHTML = `<div class="container"><div id="${b}"></div></div>`;
    ref.parentNode.insertBefore(d, ref.nextSibling);
  });
})();
const AG_TITLES = {
  dash: 'Accueil', argent: 'Mon argent', coffres: 'Mes coffres', objectifs: 'Mes objectifs',
  historique: 'Historique', photo: 'Studio', clients: 'Mes clients', mood: 'Moodboard', tarifs: 'Grille tarifaire', marketing: 'Agent marketing', materiel: 'Mon matériel', galerie: 'Galerie clients', notes: 'Notes & à faire',
  business: 'Idées business', inspiration: 'Inspiration', motiv: 'Motivation', ia: 'Coach IA'
};

// ------------------------------------------------------------
// OUTILS
// ------------------------------------------------------------
const agEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const agN = n => new Intl.NumberFormat('fr-FR').format(Math.round(Number(n) || 0));
const agF = n => agN(n) + ' F';
const agToast = (m, t) => (typeof afficherToast === 'function' ? afficherToast(m, t || 'success') : (typeof showToast === 'function' ? showToast(m) : alert(m)));

function agKind(a){ return AG_KINDS[a && a.kind] || AG_KINDS.autre; }
function agActiveAccounts(){ return accounts.filter(a => !a.archived).sort((a, b) => (a.position - b.position) || (a.id - b.id)); }
function agPrincipal(){ return agActiveAccounts()[0] || null; }

// Un "vrai" coffre (de l'argent rangé), pas un objectif sans argent
function agIsCoffre(c){
  if(!c) return false;
  if(c.goal_type === 'objectif_pur') return false;
  if((c.goal_type || 'money') !== 'money') return false;
  return Number(c.goal) > 1;
}
function agCoffres(){ return coffres.filter(agIsCoffre); }

function agAccountBalance(acc){
  let s = Number(acc.initial_balance) || 0;
  for(const t of txs){
    if(t.cancelled) continue;
    const a = Number(t.amount) || 0;
    if(t.type === 'revenu'   && t.account_id === acc.id) s += a;
    if(t.type === 'depense'  && t.account_id === acc.id) s -= a;
    if(t.type === 'transfert'){
      if(t.account_id === acc.id) s -= a;
      if(t.to_account_id === acc.id) s += a;
    }
  }
  return s;
}
function agTotals(){
  const comptes = agActiveAccounts().reduce((s, a) => s + agAccountBalance(a), 0);
  const cof = agCoffres().reduce((s, c) => s + (Number(c.current) || 0), 0);
  return { comptes, coffres: cof, total: comptes + cof };
}

// Trouve le compte qui correspond a un moyen de paiement
function agGuessAccount(method){
  const m = String(method || '').toLowerCase();
  const list = agActiveAccounts();
  if(!list.length) return null;
  const byKind = k => list.find(a => a.kind === k);
  let found = null;
  if(m.includes('wave')) found = byKind('wave');
  else if(m.includes('esp') || m.includes('cash') || m.includes('liquide')) found = byKind('especes');
  else if(m.includes('orange') || m.includes('mtn') || m.includes('moov') || m.includes('mobile')) found = byKind('mobile');
  else if(m.includes('banque') || m.includes('virement') || m.includes('carte') || m.includes('chèque') || m.includes('cheque')) found = byKind('banque');
  else if(m.includes('interne') && _agLastMethod && !String(_agLastMethod).toLowerCase().includes('interne')) return agGuessAccount(_agLastMethod);
  return (found || agPrincipal()).id;
}

// Trouve le coffre dont le nom apparait dans la note ("Salaire photographe · Dot")
function agFindGoalInNote(note){
  const n = String(note || '').toLowerCase();
  const sorted = [...coffres].sort((a, b) => String(b.name).length - String(a.name).length);
  return sorted.find(c => c.name && n.includes(String(c.name).toLowerCase())) || null;
}

// Compte choisi dans la fenetre ouverte (Entree / Depense)
function agAccountFromOpenModal(){
  const m1 = document.getElementById('modalBg');
  if(m1 && m1.classList.contains('show')){
    const v = document.getElementById('agTxAccount')?.value;
    if(v) return Number(v);
  }
  const m2 = document.getElementById('revenueModalBg');
  if(m2 && m2.classList.contains('show')){
    const v = document.getElementById('agRevAccount')?.value;
    if(v) return Number(v);
  }
  return null;
}

// Effet d'un mouvement sur les coffres : {goalId: +/- montant}
function agGoalEffect(t){
  const e = {};
  if(!t || t.cancelled || t.type !== 'transfert') return e;
  const a = Number(t.amount) || 0;
  if(t.goal_id)    e[t.goal_id]    = (e[t.goal_id] || 0) - a;
  if(t.to_goal_id) e[t.to_goal_id] = (e[t.to_goal_id] || 0) + a;
  return e;
}
async function agApplyGoalDelta(goalId, delta){
  if(!delta) return;
  const c = coffres.find(x => x.id === goalId);
  if(!c) return;
  const nv = Math.round((Number(c.current) || 0) + delta);
  const r = await _agDbUpdate('goals', goalId, { current: nv });
  if(r) c.current = nv;
}
// Vérifie qu'une série de changements ne rend aucun coffre négatif.
// pairs : [[avant, apres], ...] ; renvoie un message d'erreur ou null.
function agGoalCheck(pairs){
  const delta = {};
  for(const [b, a] of pairs){
    const eb = agGoalEffect(b), ea = agGoalEffect(a);
    for(const id of new Set([...Object.keys(eb), ...Object.keys(ea)])){
      const d = (ea[id] || 0) - (eb[id] || 0);
      if(d) delta[id] = (delta[id] || 0) + d;
    }
  }
  for(const id of Object.keys(delta)){
    const c = coffres.find(x => x.id === Number(id));
    if(!c) return "Impossible : le coffre de ce mouvement n'existe plus.\nL'argent ne peut pas être remis à sa place.";
    const nv = Math.round((Number(c.current) || 0) + delta[id]);
    if(nv < 0) return `Impossible : le coffre "${c.name}" passerait à ${agF(nv)}.\nIl n'a plus que ${agF(c.current)}. Remets d'abord de l'argent dans ce coffre.`;
  }
  return null;
}
// Les mouvements liés à une entrée (sa répartition) qui changeront d'état avec elle
function agLinkedChanges(id, cancelled){
  return txs.filter(x => x.details === 'rep:' + id && !!x.cancelled !== !!cancelled).map(x => [x, { ...x, cancelled: !!cancelled }]);
}

// Un paiement de séance (revenu avec shoot_id) annulé, restauré ou supprimé à la main :
// la séance suit (reçu, réparti, charges couvertes, payé / impayé).
// sign = -1 (annulé / supprimé) ou +1 (restauré). "liees" = ses mouvements rep: qui ont changé avec lui.
async function agSyncShootFromRevenu(rev, sign, liees){
  if(window.__agNoShootSync || !rev || rev.type !== 'revenu' || !rev.shoot_id) return;
  // Paiement d'une dette (suivi client) : c'est un surplus, la séance ne bouge pas
  if(String(rev.details || '').startsWith('dette:')) return;
  const s = (typeof shoots !== 'undefined' ? shoots : []).find(x => x.id === rev.shoot_id);
  if(!s) return;
  const transferts = liees.filter(x => x.type === 'transfert').reduce((a, x) => a + (Number(x.amount) || 0), 0);
  const recu = Math.max(0, (Number(s.montant_recu) || 0) + sign * (Number(rev.amount) || 0));
  const reparti = Math.max(0, (Number(s.montant_reparti) || 0) + sign * transferts);
  // Couvert des charges : allocation_json du revenu (même les charges "déjà payée"),
  // sinon l'ancienne méthode (dépenses de charges liées à ce paiement)
  const exps = retirerCouvertPaiement(Array.isArray(s.shoot_expenses) ? s.shoot_expenses : [], rev, sign, liees);
  const maj = { montant_recu: recu, montant_reparti: reparti, repartition_effectuee: reparti > 0,
    payment: recu > 0 && recu >= (Number(s.price) || 0) ? 'paye' : 'impaye', shoot_expenses: exps };
  const r = await _agDbUpdate('shoots', s.id, maj);
  Object.assign(s, r || maj);
}

async function agSyncGoals(before, after){
  const b = agGoalEffect(before), a = agGoalEffect(after);
  const ids = new Set([...Object.keys(b), ...Object.keys(a)]);
  for(const id of ids){
    const d = (a[id] || 0) - (b[id] || 0);
    if(d) await agApplyGoalDelta(Number(id), d);
  }
}

// ------------------------------------------------------------
// BRANCHEMENT SUR LA BASE (toutes les ecritures passent par ici)
// ------------------------------------------------------------
const _agDbInsert = dbInsert;
const _agDbUpdate = dbUpdate;
const _agDbDelete = dbDelete;

dbInsert = async function(table, data){
  let d = data;
  if(table === 'transactions' && d){
    d = { ...d };
    if(d._agRaw){ delete d._agRaw; }
    else {
      // Une "repartition / epargne" n'est pas une depense : c'est un transfert vers un coffre
      if(d.type === 'depense' && d.category === 'Épargne'){
        const g = agFindGoalInNote(d.note);
        d.type = 'transfert';
        d.category = 'Vers coffre';
        d.account_id = d.account_id || agGuessAccount(d.payment_method);
        d.to_goal_id = g ? g.id : null;
        if(_agLastRevenu && Date.now() - _agLastRevenu.ts < 5 * 60 * 1000) d.details = 'rep:' + _agLastRevenu.id;
      } else if((d.type === 'revenu' || d.type === 'depense') && !d.account_id){
        d.account_id = agAccountFromOpenModal() || agGuessAccount(d.payment_method);
      }
    }
  }
  const res = await _agDbInsert(table, d);
  if(res && table === 'transactions' && res.type === 'revenu') _agLastRevenu = { id: res.id, ts: Date.now() };
  return res;
};

dbUpdate = async function(table, id, data){
  let before = null;
  if(table === 'transactions'){
    const t = txs.find(x => x.id === id);
    before = t ? { ...t } : null;
  }
  // Un coffre ne doit jamais devenir négatif (annuler, restaurer, changer le montant...)
  if(before && !_agSkipSync){
    const after = { ...before, ...data };
    const pairs = [[before, after]];
    if(!!before.cancelled !== !!after.cancelled) pairs.push(...agLinkedChanges(id, after.cancelled));
    const err = agGoalCheck(pairs);
    if(err){ agAlert(err); return null; }
  }
  const res = await _agDbUpdate(table, id, data);
  if(res && table === 'transactions' && before && !_agSkipSync){
    await agSyncGoals(before, res);
    // Annuler / restaurer une entree annule / restaure aussi sa repartition dans les coffres
    if(!!before.cancelled !== !!res.cancelled){
      const liees = txs.filter(x => x.details === 'rep:' + id && !!x.cancelled !== !!res.cancelled);
      const changees = [];
      for(const x of liees){
        const r = await dbUpdate('transactions', x.id, { cancelled: !!res.cancelled, cancelled_at: res.cancelled ? new Date().toISOString() : null });
        if(r){ const i = txs.findIndex(y => y.id === x.id); if(i >= 0) txs[i] = r; changees.push(x); }
      }
      await agSyncShootFromRevenu(before, res.cancelled ? -1 : 1, changees);
    }
  }
  return res;
};

dbDelete = async function(table, id){
  let before = null;
  if(table === 'transactions'){
    const t = txs.find(x => x.id === id);
    before = t ? { ...t } : null;
  }
  if(table === 'goals'){
    const c = coffres.find(x => x.id === id);
    if(c && Math.round(Number(c.current) || 0) !== 0){
      agAlert(`Ce coffre contient encore ${agF(c.current)}.\n\nRamène-le d'abord à 0 (transfert vers un compte ou un autre coffre), puis supprime-le.`);
      return false;
    }
  }
  if(before){
    const err = agGoalCheck([[before, null], ...(before.cancelled ? [] : agLinkedChanges(id, true))]);
    if(err){ agAlert(err); return false; }
  }
  const ok = await _agDbDelete(table, id);
  if(ok && table === 'transactions' && before){
    await agSyncGoals(before, null);
    const liees = txs.filter(x => x.details === 'rep:' + id && !x.cancelled);
    const changees = [];
    for(const x of liees){
      const r = await dbUpdate('transactions', x.id, { cancelled: true, cancelled_at: new Date().toISOString() });
      if(r){ const i = txs.findIndex(y => y.id === x.id); if(i >= 0) txs[i] = r; changees.push(x); }
    }
    if(!before.cancelled) await agSyncShootFromRevenu(before, -1, changees);
  }
  return ok;
};

// L'ancienne annulation de repartition retirait l'argent du coffre elle-meme :
// maintenant la suppression du mouvement s'en charge (sinon on retirait 2 fois).
annulerRepartition = async function(shootId, txId, montant){
  if(!await agConfirm('Annuler cette répartition ?')) return;
  const ok = await dbDelete('transactions', txId);
  if(!ok) return;
  txs = txs.filter(t => t.id !== txId);
  const s = shoots.find(x => x.id === shootId);
  if(s){
    const nr = Math.max(0, Number(s.montant_reparti || 0) - montant);
    const upd = await dbUpdate('shoots', shootId, { montant_reparti: nr, repartition_effectuee: nr > 0 });
    if(upd){ s.montant_reparti = nr; s.repartition_effectuee = nr > 0; }
  }
  refreshAll();
  agToast('Répartition annulée · argent remis en place');
};

// Memoriser le moyen de paiement choisi quand une seance est payee
const _agValiderPaiementSeance = validerPaiementSeance;
validerPaiementSeance = async function(shootId){
  _agLastMethod = document.getElementById('paiementMethod')?.value || _agLastMethod;
  return _agValiderPaiementSeance(shootId);
};

// ------------------------------------------------------------
// CHARGEMENT
// ------------------------------------------------------------
async function agLoadAccounts(){
  const { data, error } = await sb.from('accounts').select('*').order('position', { ascending: true });
  if(error){ console.warn('Comptes :', error.message); accounts = []; return; }
  accounts = data || [];
}
const _agLoadAllData = loadAllData;
loadAllData = async function(){
  await _agLoadAllData();
  await agLoadAccounts();
};

// ------------------------------------------------------------
// FEUILLE (fenetre du bas) generique
// ------------------------------------------------------------
function agSheet(id, html){
  agCloseSheet(id);
  const bg = document.createElement('div');
  bg.className = 'modal-bg show ag-sheet';
  bg.id = id;
  bg.onclick = e => { if(e.target === bg) agCloseSheet(id); };
  bg.innerHTML = `<div class="modal"><div class="modal-wrap">${html}<button class="close" onclick="agCloseSheet('${id}')">×</button></div></div>`;
  document.body.appendChild(bg);
  return bg;
}
function agCloseSheet(id){ const el = document.getElementById(id); if(el) el.remove(); }

// ------------------------------------------------------------
// COMPTES : creer / modifier / ajuster
// ------------------------------------------------------------
async function agCreateDefaultAccounts(){
  const rows = [];
  let pos = 0;
  document.querySelectorAll('#agOnb .line').forEach(l => {
    const on = l.querySelector('input[type=checkbox]').checked;
    if(!on) return;
    const kind = l.dataset.kind;
    let name = AG_KINDS[kind].label;
    if(kind === 'mobile'){ name = document.getElementById('agOnbMobileName')?.value || name; }
    const init = parseFloat(l.querySelector('input[type=number]').value) || 0;
    rows.push({ name, kind, emoji: AG_KINDS[kind].icon, initial_balance: init, position: pos++ });
  });
  if(!rows.length){ alert('Coche au moins un compte.'); return; }
  for(const r of rows){
    const res = await _agDbInsert('accounts', r);
    if(res) accounts.push(res);
  }
  agRenderAll();
  agToast('Tes comptes sont prêts');
}

function agOpenAccountForm(id){
  const a = id ? accounts.find(x => x.id === id) : null;
  const kind = a ? a.kind : 'wave';
  agSheet('agAccForm', `
    <h3>${a ? 'Modifier le compte' : 'Nouveau compte'}</h3>
    <label>Type</label>
    <div class="ag-pills" id="agAccKind">${Object.entries(AG_KINDS).map(([k, v]) =>
      `<button type="button" data-k="${k}" class="${k === kind ? 'on' : ''}" onclick="agPick(this)">${v.icon} ${v.label}</button>`).join('')}</div>
    <label>Nom du compte</label>
    <input id="agAccName" value="${agEsc(a ? a.name : 'Wave')}" placeholder="Ex : Wave, Orange Money, Caisse studio">
    <label>Solde de départ (FCFA)</label>
    <input id="agAccInit" type="number" inputmode="decimal" value="${a ? Number(a.initial_balance) : ''}" placeholder="0">
    <div class="ag-hint">Le solde de départ, c'est ce que tu avais sur ce compte au moment de commencer. Ensuite, l'app calcule tout seule.</div>
    <button class="btn-primary" onclick="agSaveAccount(${a ? a.id : 'null'})">${a ? 'Enregistrer' : 'Créer le compte'}</button>
    ${a ? `<button class="btn-danger" style="margin-top:8px;width:100%;padding:12px" onclick="agArchiveAccount(${a.id})">Masquer ce compte</button>` : ''}
  `);
  document.querySelectorAll('#agAccKind button').forEach(b => b.addEventListener('click', () => {
    const n = document.getElementById('agAccName');
    if(!a && n) n.value = AG_KINDS[b.dataset.k].label;
  }));
}
function agPick(btn){
  btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
}
async function agSaveAccount(id){
  const kind = document.querySelector('#agAccKind button.on')?.dataset.k || 'autre';
  const name = document.getElementById('agAccName').value.trim();
  const init = parseFloat(document.getElementById('agAccInit').value) || 0;
  if(!name){ alert('Donne un nom au compte'); return; }
  const data = { name, kind, emoji: AG_KINDS[kind].icon, initial_balance: init };
  if(id){
    const r = await _agDbUpdate('accounts', id, data);
    if(!r) return;
    const i = accounts.findIndex(x => x.id === id); accounts[i] = r;
  } else {
    data.position = accounts.length;
    const r = await _agDbInsert('accounts', data);
    if(!r) return;
    accounts.push(r);
  }
  agCloseSheet('agAccForm');
  agRenderAll();
  agToast(id ? 'Compte modifié' : 'Compte créé');
}
async function agArchiveAccount(id){
  const a = accounts.find(x => x.id === id);
  const bal = agAccountBalance(a);
  if(Math.round(bal) !== 0 && !await agConfirm(`Ce compte a encore ${agF(bal)}.\nIl ne sera plus compté dans ton total. Continuer ?`)) return;
  const r = await _agDbUpdate('accounts', id, { archived: true });
  if(!r) return;
  a.archived = true;
  agCloseSheet('agAccForm'); agCloseSheet('agAccView');
  agRenderAll();
}

function agOpenAccount(id){
  const a = accounts.find(x => x.id === id);
  if(!a) return;
  const k = agKind(a);
  const bal = agAccountBalance(a);
  const mv = txs.filter(t => t.account_id === id || t.to_account_id === id);
  agSheet('agAccView', `
    <h3>${agEsc(a.name)}</h3>
    <div class="ag-total ${bal < 0 ? 'neg' : ''}" style="margin-top:6px">
      <div class="lbl">Solde actuel</div><button class="ag-eye" title="Afficher / cacher les montants" onclick="event.stopPropagation();agToggleMontants()">${agEyeIcon()}</button>
      <div class="amt ag-m">${agN(bal)} <small>FCFA</small></div>
      <div class="split"><div>Solde de départ<b class="ag-m">${agF(a.initial_balance)}</b></div><div>Mouvements<b>${mv.filter(t => !t.cancelled).length}</b></div></div>
    </div>
    <div class="ag-btns">
      <button class="btn-ghost" onclick="agCloseSheet('agAccView');agOpenTransfer({fromAccount:${id}})">⇄ Transférer</button>
      <button class="btn-ghost" onclick="agOpenAdjust(${id})">✏️ Ajuster le solde</button>
    </div>
    <button class="btn-ghost" style="width:100%" onclick="agCloseSheet('agAccView');agOpenAccountForm(${id})">⚙️ Modifier le compte</button>
    <div class="ag-sec" style="margin-top:18px"><h3>Mouvements</h3></div>
    ${agListHtml(mv, { max: 40, forAccount: id })}
  `);
}

function agOpenAdjust(id){
  const a = accounts.find(x => x.id === id);
  const bal = agAccountBalance(a);
  agSheet('agAdjust', `
    <h3>Ajuster le solde</h3>
    <div class="ag-hint" style="margin-top:0">L'app pense que tu as <b style="color:#fff">${agF(bal)}</b> sur ${agEsc(a.name)}. Si ce n'est pas le cas, tape le montant réel : l'écart sera noté dans l'historique.</div>
    <label>Montant réel sur ${agEsc(a.name)}</label>
    <input id="agAdjVal" type="number" inputmode="decimal" class="big" placeholder="${Math.round(bal)}">
    <button class="btn-primary" onclick="agDoAdjust(${id})">Valider</button>
  `);
}
async function agDoAdjust(id){
  const a = accounts.find(x => x.id === id);
  const real = parseFloat(document.getElementById('agAdjVal').value);
  if(isNaN(real)){ alert('Tape un montant'); return; }
  const diff = Math.round(real - agAccountBalance(a));
  if(!diff){ agCloseSheet('agAdjust'); return; }
  const r = await _agDbInsert('transactions', {
    type: 'transfert', category: 'Ajustement', amount: Math.abs(diff),
    note: 'Ajustement du solde ' + a.name, date: todayStr(), payment_method: 'Interne',
    account_id: diff < 0 ? id : null, to_account_id: diff > 0 ? id : null
  });
  if(!r) return;
  txs.unshift(r);
  agCloseSheet('agAdjust'); agCloseSheet('agAccView');
  refreshAll();
  agToast('Solde ajusté');
}

// ------------------------------------------------------------
// TRANSFERTS (compte <-> coffre <-> compte)
// ------------------------------------------------------------
function agEndpointPills(side, sel){
  const accs = agActiveAccounts().map(a => {
    const v = 'a' + a.id;
    return `<button type="button" data-v="${v}" class="${sel === v ? 'on' : ''}" onclick="agPick(this);agTrUpdate()">${agKind(a).icon} ${agEsc(a.name)}<small>${agF(agAccountBalance(a))}</small></button>`;
  }).join('');
  const cofs = agCoffres().map(c => {
    const v = 'g' + c.id;
    const lock = estCoffreBloque(c) ? ' 🔒' : '';
    return `<button type="button" data-v="${v}" class="${sel === v ? 'on' : ''}" onclick="agPick(this);agTrUpdate()">${c.emoji || '🔒'} ${agEsc(c.name)}${lock}<small>${agF(c.current)}</small></button>`;
  }).join('');
  return `<div class="ag-pills" id="agTr${side}">${accs}${cofs}</div>`;
}
function agOpenTransfer(opts){
  opts = opts || {};
  if(!agActiveAccounts().length){ agGoTab('argent'); agToast('Crée d\'abord tes comptes', 'info'); return; }
  const from = opts.fromAccount ? 'a' + opts.fromAccount : opts.fromGoal ? 'g' + opts.fromGoal : (opts.toGoal ? 'a' + agPrincipal().id : '');
  const to   = opts.toAccount ? 'a' + opts.toAccount : opts.toGoal ? 'g' + opts.toGoal : (opts.fromGoal ? 'a' + agPrincipal().id : '');
  const title = opts.toGoal && !opts.fromGoal ? '🔒 Mettre dans un coffre' : opts.fromGoal ? '💸 Sortir d\'un coffre' : '⇄ Transférer';
  agSheet('agTransfer', `
    <h3>${title}</h3>
    <input id="agTrAmount" type="number" inputmode="decimal" class="big" placeholder="0" value="${opts.amount || ''}" oninput="agTrUpdate()">
    <label>D'où part l'argent ?</label>
    ${agEndpointPills('From', from)}
    <div class="ag-arrow">↓</div>
    <label>Où va l'argent ?</label>
    ${agEndpointPills('To', to)}
    <label>Pourquoi ? (note)</label>
    <input id="agTrNote" placeholder="Ex : loyer, mise de côté, retrait pour le studio">
    <label>Date</label>
    <input id="agTrDate" type="date" value="${todayStr()}">
    <div class="ag-hint" id="agTrHint"></div>
    <button class="btn-primary" id="agTrBtn" onclick="agDoTransfer()">Valider le transfert</button>
  `);
  agTrUpdate();
  setTimeout(() => document.getElementById('agTrAmount')?.focus(), 250);
}
function agParseEnd(v){
  if(!v) return null;
  const id = Number(v.slice(1));
  return v[0] === 'a' ? { type: 'account', id, obj: accounts.find(a => a.id === id) } : { type: 'goal', id, obj: coffres.find(c => c.id === id) };
}
function agEndBalance(e){ return e.type === 'account' ? agAccountBalance(e.obj) : Number(e.obj.current) || 0; }
function agTrUpdate(){
  const hint = document.getElementById('agTrHint');
  if(!hint) return;
  const amt = parseFloat(document.getElementById('agTrAmount').value) || 0;
  const from = agParseEnd(document.querySelector('#agTrFrom button.on')?.dataset.v);
  const to = agParseEnd(document.querySelector('#agTrTo button.on')?.dataset.v);
  let msg = '', warn = false;
  if(from && to && from.type === to.type && from.id === to.id){ msg = 'Choisis deux endroits différents.'; warn = true; }
  else if(from && amt > 0){
    const after = agEndBalance(from) - amt;
    msg = `Après le transfert : ${agEsc(from.obj.name)} = ${agF(after)}`;
    if(to) msg += ` · ${agEsc(to.obj.name)} = ${agF(agEndBalance(to) + amt)}`;
    if(after < 0){ warn = true; msg += from.type === 'goal' ? '<br>Ce coffre n\'a pas assez d\'argent.' : '<br>Attention : ce compte passera en négatif.'; }
    if(from.type === 'goal' && estCoffreBloque(from.obj)) { warn = true; msg += '<br>🔒 Ce coffre est bloqué.'; }
  }
  hint.innerHTML = msg;
  hint.className = 'ag-hint' + (warn ? ' warn' : '');
}
async function agDoTransfer(){
  const btn = document.getElementById('agTrBtn');
  const amount = parseFloat(document.getElementById('agTrAmount').value);
  const from = agParseEnd(document.querySelector('#agTrFrom button.on')?.dataset.v);
  const to = agParseEnd(document.querySelector('#agTrTo button.on')?.dataset.v);
  const note = document.getElementById('agTrNote').value.trim();
  const date = document.getElementById('agTrDate').value || todayStr();
  if(!amount || amount <= 0){ alert('Tape un montant'); return; }
  if(!from || !to){ alert('Choisis d\'où part l\'argent et où il va'); return; }
  if(from.type === to.type && from.id === to.id){ alert('Choisis deux endroits différents'); return; }

  if(from.type === 'goal'){
    const c = from.obj;
    if(amount > Number(c.current)){ alert(`Ce coffre n'a que ${agF(c.current)}.`); return; }
    if(estCoffreBloque(c)){
      const lvl = Number(c.lock_level) || getTypeCoffre(c).lockLevel || 1;
      if(lvl >= 2){
        alert(`🔒 "${c.name}" est bloqué.\n\nDébloque-le d'abord (bouton "Débloquer" dans le coffre), puis refais le transfert.`);
        return;
      }
      if(!await agConfirm(`"${c.name}" est protégé. Sortir ${agF(amount)} quand même ?`)) return;
    }
    if(getTypeCoffre(c).id !== 'perso' && !note){ alert('Pour sortir de l\'argent de ce coffre, écris pourquoi dans la note.'); return; }
  } else if(agAccountBalance(from.obj) - amount < 0){
    if(!await agConfirm(`${from.obj.name} va passer en négatif (${agF(agAccountBalance(from.obj) - amount)}). Continuer ?`)) return;
  }

  if(btn){ btn.disabled = true; btn.textContent = 'Transfert en cours...'; }
  let category = 'Transfert';
  if(from.type === 'account' && to.type === 'goal') category = 'Vers coffre';
  if(from.type === 'goal' && to.type === 'account') category = 'Sortie de coffre';
  if(from.type === 'goal' && to.type === 'goal') category = 'Entre coffres';
  const r = await _agDbInsert('transactions', {
    type: 'transfert', category, amount, note: note || null, date, payment_method: 'Interne',
    account_id: from.type === 'account' ? from.id : null, goal_id: from.type === 'goal' ? from.id : null,
    to_account_id: to.type === 'account' ? to.id : null, to_goal_id: to.type === 'goal' ? to.id : null
  });
  if(!r){ if(btn){ btn.disabled = false; btn.textContent = 'Valider le transfert'; } return; }
  txs.unshift(r);
  await agSyncGoals(null, r);
  agCloseSheet('agTransfer'); agCloseSheet('agCoffreView'); agCloseSheet('agAccView');
  refreshAll();
  agToast(`${agF(amount)} : ${from.obj.name} → ${to.obj.name}`);
  const g = to.type === 'goal' ? to.obj : null;
  if(g && Number(g.goal) < 1e8 && Number(g.current) >= Number(g.goal)) setTimeout(() => alert(`🎉 Bravo ! Le coffre "${g.name}" a atteint son objectif.`), 400);
}

// Les anciens boutons des coffres passent maintenant par les transferts
ouvrirEpargnePerso = window.ouvrirEpargnePerso = function(id){ agOpenTransfer({ toGoal: id }); };
openDepositModal = window.openDepositModal = function(id){ agOpenTransfer({ toGoal: id }); };
retirerCoffre = window.retirerCoffre = function(id){ agOpenTransfer({ fromGoal: id }); };

// ------------------------------------------------------------
// COFFRE : fiche detaillee
// ------------------------------------------------------------
function agCoffreCard(c){
  const t = getTypeCoffre(c);
  const hasGoal = Number(c.goal) < 1e8;
  const pct = hasGoal ? Math.min(100, Math.round((Number(c.current) / Number(c.goal)) * 100)) : 0;
  const lock = estCoffreBloque(c) ? '<span class="ag-lock">🔒 bloqué</span>' : '';
  return `<div class="ag-coffre" onclick="agOpenCoffre(${c.id})">
    <div class="h"><div class="t"><div class="e">${agIcon(agCoffreIcon(c))}</div><div style="min-width:0"><div class="nm">${agEsc(c.name)}</div><div class="tag">${agEsc(String(t.label || '').replace(/^\S+\s/, ''))}</div></div></div>
    <div><div class="v ag-m">${agF(c.current)}</div>${hasGoal ? `<div class="goal ag-m">sur ${agF(c.goal)}</div>` : ''}${lock}</div></div>
    ${hasGoal ? `<div class="ag-bar ag-mb"><i style="width:${pct}%"></i></div>` : ''}
  </div>`;
}
function agOpenCoffre(id){
  const c = coffres.find(x => x.id === id);
  if(!c) return;
  const t = getTypeCoffre(c);
  const bloque = estCoffreBloque(c);
  const hasGoal = Number(c.goal) < 1e8;
  const mv = txs.filter(x => x.goal_id === id || x.to_goal_id === id);
  agSheet('agCoffreView', `
    <h3>${agEsc(c.name)}</h3>
    <div class="ag-total">
      <div class="lbl">Dans ce coffre</div><button class="ag-eye" title="Afficher / cacher les montants" onclick="event.stopPropagation();agToggleMontants()">${agEyeIcon()}</button>
      <div class="amt ag-m">${agN(c.current)} <small>FCFA</small></div>
      <div class="split"><div>Type<b>${agEsc(String(t.label || '').replace(/^\S+\s/, ''))}</b></div>${hasGoal ? `<div>Objectif<b class="ag-m">${agF(c.goal)}</b></div>` : ''}<div>État<b>${bloque ? '🔒 Bloqué' : 'Libre'}</b></div></div>
    </div>
    <div class="ag-actions" style="grid-template-columns:repeat(3,1fr);margin-bottom:10px">
      <button class="ag-act main" onclick="agOpenTransfer({toGoal:${id}})"><span>${agIcon('plus')}</span>Déposer</button>
      <button class="ag-act" onclick="agOpenTransfer({fromGoal:${id}})"><span>${agIcon('minus')}</span>Retirer</button>
      <button class="ag-act" onclick="agOpenTransfer({fromGoal:${id},toGoal:null})"><span>${agIcon('transfer')}</span>Transférer</button>
    </div>
    <div class="ag-btns">
      <button class="btn-ghost" onclick="agCloseSheet('agCoffreView');ouvrirComprendreCoffre(${id})">ℹ️ Comprendre</button>
      <button class="btn-ghost" onclick="agCloseSheet('agCoffreView');${bloque ? 'debloquerCoffre' : 'bloquerCoffre'}(${id})">${bloque ? '🔓 Débloquer' : '🔒 Bloquer'}</button>
      <button class="btn-ghost" onclick="agCloseSheet('agCoffreView');openCoffreModal(${id})">⚙️ Modifier</button>
      <button class="btn-danger" onclick="agCloseSheet('agCoffreView');delCoffre(${id})">Supprimer</button>
    </div>
    <div class="ag-sec" style="margin-top:18px"><h3>Mouvements</h3></div>
    ${agListHtml(mv, { max: 40, forGoal: id })}
  `);
}

// ------------------------------------------------------------
// LISTE DES MOUVEMENTS
// ------------------------------------------------------------
function agEndName(type, id){
  if(!id) return null;
  if(type === 'account'){ const a = accounts.find(x => x.id === id); return a ? a.name : 'Compte'; }
  const c = coffres.find(x => x.id === id); return c ? c.name : 'Coffre';
}
function agTxView(t, ctx){
  ctx = ctx || {};
  const a = Number(t.amount) || 0;
  let icon = 'transfer', title = t.category || '', sub = '', cls = 'minus', sign = '−';
  const acc = agEndName('account', t.account_id);
  if(t.type === 'revenu'){
    icon = t.category === 'Shooting photo' ? 'camera' : 'arrowIn'; cls = 'plus'; sign = '+';
    title = t.note || t.category; sub = acc || t.payment_method || '';
  } else if(t.type === 'depense'){
    icon = 'arrowOut'; title = t.note ? (t.category + ' · ' + t.note) : t.category; sub = acc || t.payment_method || '';
  } else {
    const from = agEndName('account', t.account_id) || agEndName('goal', t.goal_id);
    const to = agEndName('account', t.to_account_id) || agEndName('goal', t.to_goal_id);
    icon = t.category === 'Ajustement' ? 'edit' : t.to_goal_id ? 'lock' : t.goal_id ? 'unlock' : 'transfer';
    title = t.category === 'Ajustement' ? 'Ajustement · ' + (from || to) : `${from || '?'} → ${to || '?'}`;
    sub = t.note || t.category;
    cls = 'move'; sign = '';
    // Vu depuis un compte / coffre : on montre si l'argent entre ou sort
    const out = (ctx.forAccount && t.account_id === ctx.forAccount) || (ctx.forGoal && t.goal_id === ctx.forGoal);
    const inn = (ctx.forAccount && t.to_account_id === ctx.forAccount) || (ctx.forGoal && t.to_goal_id === ctx.forGoal);
    if(t.category === 'Ajustement' && !ctx.forAccount){ if(t.to_account_id){ sign = '+'; cls = 'plus'; } else { sign = '−'; cls = 'minus'; } }
    if(out){ sign = '−'; cls = 'minus'; } else if(inn){ sign = '+'; cls = 'plus'; }
  }
  const d = new Date((t.date || '') + 'T12:00:00');
  const ds = isNaN(d) ? '' : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return { icon, title, sub: [sub, ds].filter(Boolean).join(' · '), cls, amt: sign + agN(a) };
}
function agListHtml(list, ctx){
  ctx = ctx || {};
  const rows = [...list].sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.created_at).localeCompare(String(a.created_at))).slice(0, ctx.max || 1e9);
  if(!rows.length) return '<div class="ag-list"><div class="ag-empty">Aucun mouvement pour l\'instant.</div></div>';
  return '<div class="ag-list">' + rows.map(t => {
    const v = agTxView(t, ctx);
    return `<div class="ag-tx ${t.cancelled ? 'cancelled' : ''}" onclick="agOpenTx(${t.id})">
      <div class="ic">${agIcon(v.icon)}</div><div class="d"><b>${agEsc(v.title)}</b><span>${agEsc(v.sub)}${t.cancelled ? ' · annulé' : ''}</span></div>
      <div class="m ${v.cls}">${v.amt}</div></div>`;
  }).join('') + '</div>';
}

function agOpenTx(id){
  const t = txs.find(x => x.id === id);
  if(!t) return;
  const v = agTxView(t);
  const typeLbl = { revenu: "Entrée d'argent", depense: 'Dépense', transfert: 'Transfert' }[t.type] || t.type;
  const rows = [
    ['Type', typeLbl], ['Catégorie', t.category],
    t.type !== 'transfert' ? ['Compte', agEndName('account', t.account_id) || '-'] : null,
    t.type === 'transfert' ? ['De', agEndName('account', t.account_id) || agEndName('goal', t.goal_id) || '-'] : null,
    t.type === 'transfert' ? ['Vers', agEndName('account', t.to_account_id) || agEndName('goal', t.to_goal_id) || '-'] : null,
    t.client_name ? ['Client', t.client_name] : null,
    t.note ? ['Note', t.note] : null,
    ['Date', new Date((t.date || '') + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })],
    ['Enregistré le', new Date(t.created_at).toLocaleString('fr-FR')],
    t.cancelled ? ['État', 'Annulé'] : null
  ].filter(Boolean);
  const liees = txs.filter(x => x.details === 'rep:' + id);
  agSheet('agTxView', `
    <h3>${agEsc(v.title)}</h3>
    <div style="text-align:center;font-size:32px;font-weight:800;margin:4px 0 12px" class="ag-tx"><span class="m ${v.cls}" style="font-size:32px;width:100%;text-align:center">${v.amt} F</span></div>
    ${rows.map(r => `<div class="ag-detail-row"><span>${agEsc(r[0])}</span><span>${agEsc(r[1])}</span></div>`).join('')}
    ${liees.length ? `<div class="ag-hint">Cette entrée a été répartie dans tes coffres (${liees.length} mouvement${liees.length > 1 ? 's' : ''}). Si tu l'annules, la répartition est annulée aussi et l'argent sort des coffres.</div>` : ''}
    <div class="ag-btns">
      ${t.cancelled
        ? `<button class="btn-primary" onclick="agCloseSheet('agTxView');restaurerTx(${id})">↺ Restaurer</button>`
        : `<button class="btn-ghost" onclick="agCloseSheet('agTxView');annulerTx(${id})">🚫 Annuler</button>`}
      <button class="btn-danger" onclick="agDeleteTx(${id})">Supprimer</button>
    </div>
    <div class="ag-hint">Annuler : la ligne reste visible (barrée) et l'argent revient à sa place. Supprimer : la ligne disparaît et l'argent revient aussi à sa place.</div>
  `);
}
async function agDeleteTx(id){
  if(!await agConfirm('Supprimer définitivement ce mouvement ?\nL\'argent reviendra à sa place.')) return;
  const ok = await dbDelete('transactions', id);
  if(!ok) return;
  txs = txs.filter(t => t.id !== id);
  agCloseSheet('agTxView');
  refreshAll();
  agToast('Mouvement supprimé');
}

// ------------------------------------------------------------
// PAGES : Comptes et Coffres
// ------------------------------------------------------------
function agRenderArgent(){
  const el = document.getElementById('agArgentBody');
  if(!el) return;
  const accs = agActiveAccounts();
  if(!accs.length){
    el.innerHTML = `
      <div class="ag-onb" id="agOnb">
        <h3>👋 Crée tes comptes</h3>
        <p>Coche les comptes que tu as et tape combien il y a dessus <b style="color:#fff">aujourd'hui</b>. Ensuite, chaque entrée, dépense ou transfert sera rangé au bon endroit.</p>
        ${['wave', 'especes', 'mobile', 'banque'].map(k => `
          <div class="line" data-kind="${k}">
            <label><input type="checkbox" checked> ${AG_KINDS[k].icon} ${k === 'mobile'
              ? `<select id="agOnbMobileName" style="width:auto;padding:6px 8px;margin:0"><option>Orange Money</option><option>MTN Money</option><option>Moov Money</option></select>`
              : AG_KINDS[k].label}</label>
            <input type="number" inputmode="decimal" placeholder="0 F">
          </div>`).join('')}
        <button class="btn-primary" style="width:100%" onclick="agCreateDefaultAccounts()">Créer mes comptes</button>
        <div class="ag-hint">Tu pourras en ajouter, les renommer ou corriger le solde plus tard.</div>
      </div>`;
    return;
  }
  const tot = agTotals();
  const cof = agCoffres();
  const recent = txs.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 6);
  el.innerHTML = `
    <div class="ag-total ${tot.total < 0 ? 'neg' : ''}">
      <div class="lbl">Mon argent total</div><button class="ag-eye" title="Afficher / cacher les montants" onclick="event.stopPropagation();agToggleMontants()">${agEyeIcon()}</button>
      <div class="amt ag-m">${agN(tot.total)} <small>FCFA</small></div>
      <div class="split"><div>Sur mes comptes<b class="ag-m">${agF(tot.comptes)}</b></div><div>Dans mes coffres<b class="ag-m">${agF(tot.coffres)}</b></div></div>
    </div>
    <div class="ag-actions">
      <button class="ag-act main" onclick="agNewTx('revenu')"><span>${agIcon('plus')}</span>Entrée</button>
      <button class="ag-act" onclick="agNewTx('depense')"><span>${agIcon('minus')}</span>Dépense</button>
      <button class="ag-act" onclick="agOpenTransfer()"><span>${agIcon('transfer')}</span>Transfert</button>
      <button class="ag-act" onclick="agOpenTransfer({toGoal:${cof[0] ? cof[0].id : 'null'}})"><span>${agIcon('lock')}</span>Épargner</button>
    </div>
    <div class="ag-sec"><h3>Mes comptes</h3><button onclick="agOpenAccountForm()">+ Ajouter</button></div>
    <div class="ag-row">
      ${accs.map(a => { const b = agAccountBalance(a); const k = agKind(a); return `
        <div class="ag-acc" onclick="agOpenAccount(${a.id})"><div class="ic">${agIcon(k.svg)}</div>
        <div class="n">${agEsc(a.name)}</div><div class="v ag-m ${b < 0 ? 'neg' : ''}">${agF(b)}</div></div>`; }).join('')}
      <div class="ag-acc add" onclick="agOpenAccountForm()">${agIcon('plus')}Compte</div>
    </div>
    <div class="ag-sec"><h3>Mes coffres</h3><button onclick="agGoTab('coffres')">Tout voir</button></div>
    ${cof.length ? cof.slice(0, 3).map(agCoffreCard).join('') : '<div class="ag-list"><div class="ag-empty">Aucun coffre. <a style="color:var(--light)" onclick="openCoffreModal(null,\'coffre\')">Crée ton premier coffre</a></div></div>'}
    <div class="ag-sec" style="margin-top:14px"><h3>Derniers mouvements</h3><button onclick="agGoTab('historique')">Historique</button></div>
    ${agListHtml(recent)}
  `;
}
function agRenderCoffresPage(){
  const el = document.getElementById('agCoffresBody');
  if(!el) return;
  const cof = agCoffres();
  const tot = cof.reduce((s, c) => s + (Number(c.current) || 0), 0);
  const bloq = cof.filter(estCoffreBloque).reduce((s, c) => s + (Number(c.current) || 0), 0);
  el.innerHTML = `
    <div class="ag-total">
      <div class="lbl">Dans mes coffres</div><button class="ag-eye" title="Afficher / cacher les montants" onclick="event.stopPropagation();agToggleMontants()">${agEyeIcon()}</button>
      <div class="amt ag-m">${agN(tot)} <small>FCFA</small></div>
      <div class="split"><div>Coffres<b>${cof.length}</b></div><div>Bloqué<b class="ag-m">${agF(bloq)}</b></div><div>Libre<b class="ag-m">${agF(tot - bloq)}</b></div></div>
    </div>
    <div class="ag-actions" style="grid-template-columns:repeat(3,1fr)">
      <button class="ag-act main" onclick="agOpenTransfer({toGoal:${cof[0] ? cof[0].id : 'null'}})"><span>${agIcon('plus')}</span>Déposer</button>
      <button class="ag-act" onclick="agOpenTransfer({fromGoal:${cof[0] ? cof[0].id : 'null'}})"><span>${agIcon('minus')}</span>Retirer</button>
      <button class="ag-act" onclick="openCoffreModal(null,'coffre')"><span>${agIcon('plus')}</span>Nouveau</button>
    </div>
    ${cof.length ? cof.map(agCoffreCard).join('') : '<div class="ag-list"><div class="ag-empty">Aucun coffre pour l\'instant.</div></div>'}
    <div class="ag-hint" style="text-align:center;margin-top:10px">Touche un coffre pour déposer, retirer, le bloquer ou voir ses mouvements.</div>
  `;
}
function agNewTx(type){
  if(type === 'revenu' && typeof openRevenueModal === 'function'){ openRevenueModal(); return; }
  openModal(); setType(type);
}
// Accueil : un haut propre (comme la maquette) et les anciens blocs ranges dans "Plus de details"
function agSetupDash(){
  const host = document.querySelector('#page-dash .container');
  if(!host || host.dataset.agDone) return;
  host.dataset.agDone = '1';
  const top = document.createElement('div'); top.id = 'agDashMini';
  const soon = document.createElement('div'); soon.id = 'agDashSoon';
  const det = document.createElement('details'); det.className = 'ag-tools'; det.id = 'agDashMore';
  det.innerHTML = '<summary>📊 Analyses, graphiques et conseils</summary>';
  const keep = ['alertsCard', 'upcomingShootsCard', 'urgentNotesCard'];
  [...host.children].forEach(ch => {
    if(ch.classList.contains('seg-bar')) return;
    const id = ch.id || '';
    if(keep.includes(id)) soon.appendChild(ch);
    else det.appendChild(ch);
  });
  host.appendChild(top); host.appendChild(soon); host.appendChild(det);
}
function agHello(){
  let n = '';
  try { n = (document.getElementById('userDisplayName')?.textContent || document.querySelector('.user-name')?.textContent || '').trim(); } catch(e){}
  if(!n || n.includes('@')) n = 'Henzo';
  const h = new Date().getHours();
  return { greet: h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir', name: (n.split(' ')[0].charAt(0).toUpperCase() + n.split(' ')[0].slice(1)) };
}
function agRenderDashMini(){
  agSetupDash();
  const el = document.getElementById('agDashMini');
  if(!el) return;
  const hi = agHello();
  const head = `<div class="ag-hello"><div><span>${hi.greet}</span><b>${agEsc(hi.name)}</b></div></div>`;
  const actions = `<div class="ag-actions">
      <button class="ag-act main" onclick="agNewTx('revenu')"><span>${agIcon('plus')}</span>Entrée</button>
      <button class="ag-act" onclick="agNewTx('depense')"><span>${agIcon('minus')}</span>Dépense</button>
      <button class="ag-act" onclick="agOpenTransfer()"><span>${agIcon('transfer')}</span>Transfert</button>
      <button class="ag-act" onclick="typeof openNoteModal==='function'?openNoteModal():agGoTab('notes')"><span>${agIcon('note')}</span>Note</button>
    </div>`;
  if(!agActiveAccounts().length){
    el.innerHTML = head + `<div class="ag-total" onclick="agGoTab('argent')" style="cursor:pointer"><div class="lbl">Mon argent</div>
      <div style="color:#fff;font-weight:700;font-size:18px;margin:8px 0 4px">Crée tes comptes pour voir ton solde</div>
      <div class="split"><div>Wave, Espèces, Mobile Money, Banque<b>Commencer →</b></div></div></div>` + actions;
    return;
  }
  const tot = agTotals();
  const accs = agActiveAccounts();
  const recent = txs.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 4);
  el.innerHTML = head + `<div class="ag-total ${tot.total < 0 ? 'neg' : ''}" onclick="agGoTab('argent')" style="cursor:pointer">
    <div class="lbl">Mon argent total</div><button class="ag-eye" title="Afficher / cacher les montants" onclick="event.stopPropagation();agToggleMontants()">${agEyeIcon()}</button><div class="amt ag-m">${agN(tot.total)} <small>FCFA</small></div>
    <div class="split"><div>Sur mes comptes<b class="ag-m">${agF(tot.comptes)}</b></div><div>Dans mes coffres<b class="ag-m">${agF(tot.coffres)}</b></div></div></div>`
    + actions
    + `<div class="ag-sec"><h3>Mes comptes</h3><button onclick="agGoTab('argent')">Tout voir</button></div>
    <div class="ag-row">${accs.map(a => { const b = agAccountBalance(a); const k = agKind(a); return `
      <div class="ag-acc" onclick="agOpenAccount(${a.id})"><div class="ic">${agIcon(k.svg)}</div>
      <div class="n">${agEsc(a.name)}</div><div class="v ag-m ${b < 0 ? 'neg' : ''}">${agF(b)}</div></div>`; }).join('')}</div>
    <div class="ag-sec"><h3>Derniers mouvements</h3><button onclick="agGoTab('historique')">Historique</button></div>
    ${agListHtml(recent)}`;
}

// ------------------------------------------------------------
// HISTORIQUE : nouveau look (memes fonctions de tri, selection, export)
// ------------------------------------------------------------
renderHistory = function(){
  const filtered = getFilteredTx();
  const totalIn = filtered.filter(t => t.type === 'revenu' && !t.cancelled).reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = filtered.filter(t => t.type === 'depense' && !t.cancelled).reduce((s, t) => s + Number(t.amount), 0);
  const set = (id, v) => { const e = document.getElementById(id); if(e) e.textContent = v; };
  set('histCount', filtered.length); set('histIn', fmt(totalIn)); set('histOut', fmt(totalOut));
  const el = document.getElementById('histList');
  if(!el) return;
  if(!filtered.length){ el.innerHTML = '<div class="ag-empty">Aucun mouvement</div>'; return; }
  let lastDay = '';
  el.innerHTML = filtered.map(t => {
    const v = agTxView(t);
    const day = t.date || '';
    let head = '';
    if(day !== lastDay){
      lastDay = day;
      const d = new Date(day + 'T12:00:00');
      head = `<div class="ag-day">${isNaN(d) ? '' : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>`;
    }
    const checked = selectedTxIds.has(t.id) ? 'checked' : '';
    return `${head}<div class="ag-list" style="margin-bottom:6px"><div class="ag-tx ${t.cancelled ? 'cancelled' : ''}" onclick="agOpenTx(${t.id})">
      <input type="checkbox" class="chk hist-check" data-id="${t.id}" ${checked} onclick="event.stopPropagation()" onchange="toggleTxSelect(${t.id}, this.checked)">
      <div class="ic">${agIcon(v.icon)}</div><div class="d"><b>${agEsc(v.title)}</b><span>${agEsc(v.sub)}${t.cancelled ? ' · annulé' : ''}</span></div>
      <div class="m ${v.cls}">${v.amt}</div></div></div>`;
  }).join('');
};

// ------------------------------------------------------------
// NAVIGATION : 5 onglets + segments
// ------------------------------------------------------------
function agGroupOf(tab){
  for(const [g, v] of Object.entries(AG_GROUPS)) if(v.tabs.includes(tab)) return g;
  return 'accueil';
}
function agBuildNav(){
  const nav = document.getElementById('mainTabs');
  if(!nav) return;
  nav.innerHTML = Object.entries(AG_GROUPS).map(([g, v]) =>
    `<button class="tab-btn" data-group="${g}" onclick="agGoGroup('${g}')"><span class="tab-icon">${agIcon(v.icon)}</span><span class="tab-label">${v.label}</span></button>`).join('');
}
function agGoGroup(g){
  let last = null;
  try { last = localStorage.getItem('ag_last_' + g); } catch(e){}
  const tabs = AG_GROUPS[g].tabs;
  agGoTab(tabs.includes(last) ? last : tabs[0]);
}
function agGoTab(tab){ showTab(tab); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function agSegBar(tab){
  const g = agGroupOf(tab);
  const tabs = AG_GROUPS[g].tabs;
  const page = document.getElementById('page-' + tab);
  if(!page) return;
  const host = page.querySelector('.container') || page;
  let bar = host.querySelector(':scope > .seg-bar');
  if(tabs.length < 2){ if(bar) bar.remove(); return; }
  if(!bar){ bar = document.createElement('div'); bar.className = 'seg-bar'; host.insertBefore(bar, host.firstChild); }
  bar.innerHTML = tabs.map(t => `<button class="${t === tab ? 'on' : ''}" onclick="agGoTab('${t}')">${AG_TAB_LABELS[t] || t}</button>`).join('');
}

const _agShowTab = showTab;
showTab = function(name, btn){
  if(!document.getElementById('page-' + name)) name = 'dash';
  _agShowTab(name, btn);
  const g = agGroupOf(name);
  try { localStorage.setItem('ag_last_' + g, name); } catch(e){}
  document.querySelectorAll('#mainTabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.group === g));
  const h = document.getElementById('headerTitle');
  if(h) h.textContent = AG_TITLES[name] || h.textContent;
  agSegBar(name);
  if(name === 'argent') agRenderArgent();
  if(name === 'coffres') agRenderCoffresPage();
  if(name === 'dash') agRenderDashMini();
};
restoreLastTab = function(){
  let saved = null;
  try { saved = localStorage.getItem('active_tab'); } catch(e){}
  if(saved && saved !== 'dash' && document.getElementById('page-' + saved)) showTab(saved);
  else showTab('dash');
};
drawerNavigate = function(tab){ showTab(tab); if(typeof closeDrawer === 'function') closeDrawer(); };

function agRenderAll(){
  agRenderArgent();
  agRenderCoffresPage();
  agRenderDashMini();
}
const _agRefreshAll = refreshAll;
refreshAll = window.refreshAll = function(){
  _agRefreshAll();
  agRenderAll();
};

// ------------------------------------------------------------
// CHOIX DU COMPTE dans les fenetres Entree / Depense
// ------------------------------------------------------------
function agAccountOptions(selId){
  return agActiveAccounts().map(a => `<option value="${a.id}" ${a.id === selId ? 'selected' : ''}>${agKind(a).icon} ${agEsc(a.name)} · ${agF(agAccountBalance(a))}</option>`).join('');
}
function agInjectSelect(afterId, selId, labelTxt){
  const anchor = document.getElementById(afterId);
  if(!anchor || document.getElementById(selId)) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = `<label for="${selId}">${labelTxt}</label><select id="${selId}"></select>`;
  anchor.insertAdjacentElement('afterend', wrap);
}
function agFillSelects(){
  const p = agPrincipal();
  const a = document.getElementById('agTxAccount'); if(a) a.innerHTML = agAccountOptions(p && p.id);
  const b = document.getElementById('agRevAccount');
  if(b){
    const m = document.getElementById('revPaymentMethod')?.value;
    b.innerHTML = agAccountOptions(agGuessAccount(m) || (p && p.id));
  }
}
const _agOpenModal = openModal;
openModal = function(){ _agOpenModal(); agFillSelects(); };
if(typeof openRevenueModal === 'function'){
  const _agOpenRevenueModal = openRevenueModal;
  openRevenueModal = function(){ _agOpenRevenueModal.apply(this, arguments); agFillSelects(); };
}

// ============================================================
// DESIGN : icones fines, themes au choix, barre laterale (PC)
// ============================================================
const AG_ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  wallet: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18M16 15h2"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
  sparkles: '<path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z"/><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  transfer: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
  note: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20a6 6 0 0 1 12 0M16 4.5a3.5 3.5 0 0 1 0 7M21 20a6 6 0 0 0-4-5.6"/>',
  flame: '<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.5 1.5 1.5 2.5 3 2.5-1-3 0-6 0-8z"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  bank: '<path d="M3 10 12 4l9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  wave: '<path d="M2 9c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2M2 15c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  arrowIn: '<path d="M17 7 7 17M7 8v9h9"/>', arrowOut: '<path d="M7 17 17 7M8 7h9v9"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.7 1.5-1.5 0-.5-.3-.9-.3-1.4 0-.8.6-1.4 1.4-1.4H17a4 4 0 0 0 4-4c0-5.2-4-8.7-9-8.7z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7.5" r="1"/><circle cx="14.5" cy="7.5" r="1"/>',
  chev: '<path d="m9 6 6 6-6 6"/>', check: '<path d="m5 12 5 5 9-10"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="m5.7 5.7 12.6 12.6"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  phoneCall: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>',
  settings: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  logout: '<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>'
};
function agIcon(n, size){
  return `<svg class="ag-i" width="${size || 20}" height="${size || 20}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${AG_ICONS[n] || AG_ICONS.card}</svg>`;
}
function agCoffreIcon(c){
  const id = (getTypeCoffre(c) || {}).id;
  return { reserve: 'shield', objectif: 'target', entreprise: 'briefcase', perso: 'heart' }[id] || 'lock';
}
const AG_TAB_ICONS = { dash: 'home', argent: 'wallet', coffres: 'lock', objectifs: 'target', historique: 'history',
  photo: 'camera', clients: 'users', mood: 'palette', tarifs: 'briefcase', galerie: 'image', notes: 'note', business: 'bulb', inspiration: 'star', motiv: 'flame', ia: 'sparkles' };

// ---------- Themes ----------
const AG_THEMES = {
  aurora:   { label: 'Aurora',   desc: 'Vert profond et blanc', sw: ['#030b0a', '#00524D', '#48A89A', '#CBEFEB'] },
  graphite: { label: 'Graphite', desc: 'Gris anthracite et vert citron', sw: ['#141414', '#262626', '#b6f23a', '#e9e9e9'] },
  minuit:   { label: 'Minuit',   desc: 'Bleu nuit et bleu clair', sw: ['#070a14', '#1d2a5c', '#6b8eff', '#c9d4ff'] },
  or:       { label: 'Or noir',  desc: 'Noir chaud et doré', sw: ['#0b0a08', '#3a2c12', '#d4a64a', '#f1dfb4'] },
  ivoire:   { label: 'Ivoire',   desc: 'Clair, pour la journée', sw: ['#f4f2ee', '#ffffff', '#1f6f63', '#1b1b1b'] }
};
function agGetTheme(){ try { return localStorage.getItem('ag_theme') || 'aurora'; } catch(e){ return 'aurora'; } }
function agApplyTheme(t){
  if(!AG_THEMES[t]) t = 'aurora';
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem('ag_theme', t); } catch(e){}
  const m = document.querySelector('meta[name="theme-color"]');
  if(m) m.setAttribute('content', AG_THEMES[t].sw[0]);
}
async function agSaveThemeRemote(t){
  try {
    const { data: u } = await sb.auth.getUser();
    if(!u || !u.user) return;
    const { data } = await sb.from('user_settings').select('id,user_preferences').eq('user_id', u.user.id).maybeSingle();
    if(!data) return;
    const prefs = Object.assign({}, data.user_preferences || {}, { theme: t });
    await sb.from('user_settings').update({ user_preferences: prefs }).eq('id', data.id);
  } catch(e){}
}
async function agLoadThemeRemote(){
  try {
    if(localStorage.getItem('ag_theme')) return;
    const { data: u } = await sb.auth.getUser();
    if(!u || !u.user) return;
    const { data } = await sb.from('user_settings').select('user_preferences').eq('user_id', u.user.id).maybeSingle();
    const t = data && data.user_preferences && data.user_preferences.theme;
    if(t) agApplyTheme(t);
  } catch(e){}
}
function agOpenThemes(){
  const cur = agGetTheme();
  agSheet('agThemes', `
    <h3>Thème de l'application</h3>
    <div class="ag-hint" style="margin-top:0">Le thème est gardé sur cet appareil et dans ton compte.</div>
    <div class="ag-themes">${Object.entries(AG_THEMES).map(([k, v]) => `
      <button class="ag-theme ${k === cur ? 'on' : ''}" onclick="agPickTheme('${k}')">
        <span class="sw">${v.sw.map(c => `<i style="background:${c}"></i>`).join('')}</span>
        <span class="tx"><b>${v.label}</b><small>${v.desc}</small></span>
        <span class="ok">${k === cur ? agIcon('check', 18) : ''}</span>
      </button>`).join('')}</div>
  `);
}
function agPickTheme(t){ agApplyTheme(t); agSaveThemeRemote(t); agOpenThemes(); }

// ---------- Retirer les emojis de l'affichage (look epure) ----------
const AG_EMOJI = /(?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:️|‍|\p{Extended_Pictographic}|\p{Emoji_Modifier})*️?\s?/gu;
const AG_SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'OPTION', 'svg', 'SVG']);
function agStripNode(n){
  if(n.nodeType === 3){
    const v = n.nodeValue;
    if(!v || !AG_EMOJI.test(v)) { AG_EMOJI.lastIndex = 0; return; }
    AG_EMOJI.lastIndex = 0;
    const p = n.parentElement;
    if(!p || AG_SKIP.has(p.tagName) || p.closest('[contenteditable],.ag-keep')) return;
    const nv = v.replace(AG_EMOJI, '');
    if(nv !== v){
      n.nodeValue = nv;
      if(!nv.trim() && !p.textContent.trim() && !p.querySelector('svg,img')){
        if(p.tagName === 'BUTTON' || p.tagName === 'A'){
          const oc = (p.getAttribute('onclick') || '') + ' ' + p.className;
          const lbl = p.getAttribute('title') || p.getAttribute('aria-label') || (/del|suppr/i.test(oc) ? 'Supprimer' : /edit|modif/i.test(oc) ? 'Modifier' : /copi|copy/i.test(oc) ? 'Copier' : /fav/i.test(oc) ? 'Favori' : '');
          const ic = agBtnIcon(lbl);
          if(ic){ p.innerHTML = agIcon(ic, 17); p.classList.add('ag-ibtn'); p.setAttribute('aria-label', lbl); if(!p.title) p.title = lbl; }
          else p.textContent = lbl;
        }
        else p.setAttribute('data-agx', '');
      }
    }
    return;
  }
  if(n.nodeType !== 1 || AG_SKIP.has(n.tagName)) return;
  if(n.tagName === 'OPTION' || n.tagName === 'SELECT'){
    (n.tagName === 'SELECT' ? n.querySelectorAll('option') : [n]).forEach(o => { const t = o.textContent.replace(AG_EMOJI, ''); if(t !== o.textContent) o.textContent = t; });
    return;
  }
  for(const c of n.childNodes) agStripNode(c);
}
function agStartStrip(){
  agStripNode(document.body);
  document.title = document.title.replace(AG_EMOJI, '');
  new MutationObserver(ms => {
    for(const m of ms){
      if(m.type === 'characterData') agStripNode(m.target);
      else m.addedNodes.forEach(agStripNode);
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
}

function agBtnIcon(t){
  t = String(t || '').toLowerCase();
  const map = [['whatsapp','chat'],['calendrier','calendar'],['modifier','edit'],['supprimer','trash'],['effacer','trash'],['annuler','ban'],
    ['lien','link'],['réactiver','refresh'],['restaurer','refresh'],['voir','eye'],['appeler','phoneCall'],['mail','mail'],['copier','copy'],
    ['pdf','download'],['export','download'],['bloquer','lock'],['débloquer','unlock'],['comprendre','sparkles'],['favori','star'],['épargner','plus'],['retirer','minus']];
  for(const [k, v] of map) if(t.includes(k)) return v;
  return null;
}

// Les coffres "sans objectif" (999 999 999) ne sont pas des objectifs : on les cache des analyses d'objectifs
function agWithRealGoals(fn){
  const all = coffres;
  coffres = all.filter(c => !(Number(c.goal) >= 1e8));
  try { return fn(); } finally { coffres = all; }
}
['renderMotivationJour', 'renderAnalysePercutante', 'renderGoalSuggestions', 'renderDefiDuJour', 'renderDashboardGoals', 'renderCoffres'].forEach(n => {
  const f = window[n];
  if(typeof f !== 'function') return;
  const w = function(){
    const r = agWithRealGoals(() => f.apply(this, arguments));
    if(n === 'renderCoffres'){
      const at = document.getElementById('antiTemptation');
      const real = coffres.filter(c => !(Number(c.goal) >= 1e8) && Number(c.goal) > 1 && Number(c.current) < Number(c.goal));
      if(at && !real.length) at.innerHTML = '<div class="empty">Aucun objectif chiffré en cours. Crée un objectif avec un montant à atteindre.</div>';
    }
    return r;
  };
  try { window[n] = w; } catch(e){}
  try { eval(n + ' = w'); } catch(e){}
});

// Ranger les filtres et les longues explications dans des blocs repliables
function agFold(el, title){
  if(!el || el.closest('details.ag-tools') || el.dataset.agFold) return;
  el.dataset.agFold = '1';
  const det = document.createElement('details');
  det.className = 'ag-tools ag-fold';
  det.innerHTML = `<summary>${title}</summary>`;
  el.parentNode.insertBefore(det, el);
  det.appendChild(el);
}
function agFoldAll(){
  document.querySelectorAll('.page .container div').forEach(d => {
    if(d.children.length) return;
    const t = (d.textContent || '').trim().toLowerCase();
    if(t === 'filtres avancés') agFold(d.parentElement, 'Filtres et recherche');
  });
  document.querySelectorAll('.page .card > h2').forEach(h => {
    const t = (h.textContent || '').trim().toLowerCase();
    if(t === 'filtrer' || t === 'filtres') agFold(h.parentElement, 'Filtres et recherche');
  });
  document.querySelectorAll('.page .container div[style*="font-size:11px"]').forEach(d => {
    const t = (d.textContent || '').trim();
    if(t.length > 180 && !d.children.length || (t.length > 180 && d.querySelectorAll('br').length === d.children.length)) agFold(d, 'Comment sont calculés ces chiffres ?');
  });
}

// ---------- Barre laterale (ordinateur) ----------
function agBuildSide(){
  if(document.getElementById('agSide')) return;
  const side = document.createElement('aside');
  side.id = 'agSide';
  const item = t => `<button class="ag-side-it" data-tab="${t}" onclick="agGoTab('${t}')"><span class="si">${agIcon(AG_TAB_ICONS[t], 18)}</span><span class="sl">${AG_TAB_LABELS[t]}</span><span class="sc">${agIcon('chev', 16)}</span></button>`;
  side.innerHTML = `
    <div class="ag-side-brand"><span class="lg">H</span><span><b>Henzo Studio</b><small>Super App</small></span></div>
    <div class="ag-side-sec">Menu principal</div>${item('dash')}
    <div class="ag-side-sec">Argent</div>${AG_GROUPS.argent.tabs.map(item).join('')}
    <div class="ag-side-sec">Studio</div>${AG_GROUPS.studio.tabs.map(item).join('')}
    <div class="ag-side-sec">Idées</div>${AG_GROUPS.idees.tabs.map(item).join('')}
    <div class="ag-side-sec">Coach</div>${item('ia')}
    <div class="ag-side-foot">
      <button class="ag-side-it" onclick="agOpenThemes()"><span class="si">${agIcon('palette', 18)}</span><span class="sl">Thème</span></button>
      <button class="ag-side-it" onclick="typeof openProfileModal==='function'&&openProfileModal()"><span class="si">${agIcon('user', 18)}</span><span class="sl">Mon profil</span></button>
    </div>`;
  document.body.appendChild(side);
}
function agSyncSide(tab){
  document.querySelectorAll('#agSide .ag-side-it[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
}

// ---------- Boutons du haut : icones fines ----------
function agHeaderIcons(){
  const set = (sel, ic) => { const b = document.querySelector(sel); if(!b || b.dataset.agi) return; b.dataset.agi = '1';
    const keep = [...b.children].filter(c => c.classList.contains('coach-badge'));
    b.innerHTML = agIcon(ic, 19); keep.forEach(k => b.appendChild(k)); };
  set('button.header-icon-btn[onclick*="ouvrirRechercheGlobale"]', 'search');
  set('#coachBtn', 'sparkles');
  set('button.header-icon-btn[onclick*="openQuickAdd"]', 'plus');
  // Choix du theme dans le menu du compte et le menu lateral (mobile)
  const um = document.querySelector('.user-menu-items');
  if(um && !um.querySelector('.ag-theme-btn')){
    const b = document.createElement('button'); b.className = 'ag-theme-btn';
    b.innerHTML = `<span class="icon">${agIcon('palette', 16)}</span><span>Thème</span>`;
    b.onclick = () => { if(typeof closeUserMenu === 'function') closeUserMenu(); agOpenThemes(); };
    um.insertBefore(b, um.firstChild);
  }
  const dr = document.querySelector('.drawer-section .drawer-nav[onclick*="preferences"]');
  if(dr && !document.querySelector('.drawer-nav.ag-theme-btn')){
    const b = document.createElement('button'); b.className = 'drawer-nav ag-theme-btn';
    b.innerHTML = `<span class="nav-icon">${agIcon('palette', 16)}</span><span>Thème</span>`;
    b.onclick = () => { if(typeof closeDrawer === 'function') closeDrawer(); agOpenThemes(); };
    dr.parentElement.insertBefore(b, dr);
  }
}

// ---------- Branchements ----------
const _agShowTab2 = showTab;
showTab = function(name, btn){
  _agShowTab2(name, btn);
  let cur = name;
  try { cur = localStorage.getItem('active_tab') || name; } catch(e){}
  agSyncSide(document.getElementById('page-' + cur) ? cur : name);
};
agApplyTheme(agGetTheme());
// ---------- Installable sur telephone (comme une vraie app) ----------
let _agInstallEvt = null;
function agSetupInstall(){
  const head = document.head;
  const add = (tag, attrs) => { const el = document.createElement(tag); Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v)); head.appendChild(el); };
  if(!document.querySelector('link[rel="manifest"]')) add('link', { rel: 'manifest', href: '/manifest.webmanifest' });
  if(!document.querySelector('link[rel="apple-touch-icon"]')) add('link', { rel: 'apple-touch-icon', href: '/icon-180.png' });
  if(!document.querySelector('meta[name="theme-color"]')) add('meta', { name: 'theme-color', content: AG_THEMES[agGetTheme()].sw[0] });
  add('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
  add('meta', { name: 'mobile-web-app-capable', content: 'yes' });
  add('meta', { name: 'apple-mobile-web-app-title', content: 'Henzo Studio' });
  add('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' });
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); _agInstallEvt = e; agShowInstallBtn(); });
}
function agIsInstalled(){ return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone; }
// Menu lateral du telephone : meme organisation que la barre du bas + bouton Installer
function agFixDrawer(){
  const navBtn = document.querySelector('.side-drawer .drawer-nav[data-tab="dash"]');
  const sec = navBtn && navBtn.closest('.drawer-section');
  if(sec && !sec.dataset.agDone){
    sec.dataset.agDone = '1';
    const groups = [['Accueil', ['dash']], ['Argent', AG_GROUPS.argent.tabs], ['Studio', AG_GROUPS.studio.tabs], ['Idées', AG_GROUPS.idees.tabs], ['Coach', ['ia']]];
    sec.innerHTML = groups.map(([g, tabs]) => `<div class="drawer-section-title">${g}</div>` + tabs.map(t =>
      `<button class="drawer-nav" data-tab="${t}" onclick="drawerNavigate('${t}')"><span class="nav-icon">${agIcon(AG_TAB_ICONS[t], 16)}</span><span>${AG_TAB_LABELS[t]}</span></button>`).join('')).join('');
  }
  const qmap = { addRevenue: 'arrowIn', addTx: 'arrowOut', addClient: 'users', addShoot: 'camera', addGoal: 'target', addNote: 'note', analyze: 'sparkles',
    profile: 'user', preferences: 'settings', about: 'info', logout: 'logout' };
  document.querySelectorAll('.side-drawer .drawer-nav, .side-drawer .drawer-quick, .user-menu-items > button').forEach(b => {
    if(b.querySelector('svg')) return;
    const m = (b.getAttribute('onclick') || '').match(/drawerAction\('(\w+)'\)|open(Profile|Preferences|About)Modal|handleLogout/);
    if(!m) return;
    const key = m[1] || (m[2] ? m[2].toLowerCase() : 'logout');
    const ic = qmap[key]; if(!ic) return;
    const holder = b.querySelector('.nav-icon, .icon, span');
    const span = document.createElement('span'); span.className = 'nav-icon ag-ic'; span.innerHTML = agIcon(ic, 16);
    if(holder && holder.hasAttribute('data-agx')){ holder.replaceWith(span); } else b.insertBefore(span, b.firstChild);
  });
  const acc = document.querySelector('.side-drawer .drawer-nav[onclick*="profile"]');
  if(acc && !agIsInstalled() && !document.querySelector('.drawer-nav.ag-install-dr')){
    const b = document.createElement('button'); b.className = 'drawer-nav ag-install-dr';
    b.innerHTML = `<span class="nav-icon">${agIcon('download', 16)}</span><span>Installer l'app</span>`;
    b.onclick = () => { if(typeof closeDrawer === 'function') closeDrawer(); agInstall(); };
    acc.parentElement.insertBefore(b, acc);
  }
}
function agShowInstallBtn(){
  if(agIsInstalled() || document.getElementById('agInstallBtn')) return;
  const foot = document.querySelector('.ag-side-foot');
  const b = document.createElement('button');
  b.id = 'agInstallBtn'; b.className = 'ag-side-it';
  b.innerHTML = `<span class="si">${agIcon('download', 18)}</span><span class="sl">Installer l'app</span>`;
  b.onclick = agInstall;
  if(foot) foot.insertBefore(b, foot.firstChild);
  const um = document.querySelector('.user-menu-items');
  if(um && !um.querySelector('.ag-install-btn')){
    const m = document.createElement('button'); m.className = 'ag-install-btn';
    m.innerHTML = `<span class="icon">${agIcon('download', 16)}</span><span>Installer l'app</span>`;
    m.onclick = () => { if(typeof closeUserMenu === 'function') closeUserMenu(); agInstall(); };
    um.insertBefore(m, um.firstChild);
  }
}
async function agInstall(){
  if(_agInstallEvt){ _agInstallEvt.prompt(); await _agInstallEvt.userChoice; _agInstallEvt = null; document.getElementById('agInstallBtn')?.remove(); document.querySelector('.ag-install-btn')?.remove(); return; }
  agSheet('agInstallHelp', `<h3>Installer l'app sur ton téléphone</h3>
    <div class="ag-detail-row"><span>Android (Chrome)</span><span>Menu ⋮ puis "Installer l'application"</span></div>
    <div class="ag-detail-row"><span>iPhone (Safari)</span><span>Bouton Partager puis "Sur l'écran d'accueil"</span></div>
    <div class="ag-hint">L'app s'ouvre ensuite en plein écran avec son icône. Les mises à jour arrivent toutes seules.</div>`);
}
agSetupInstall();

// Galerie clients integree (fichier galerie.js)
(function(){ const sc = document.createElement('script'); sc.src = 'galerie.js?v=6'; document.body.appendChild(sc); })();
// Clients, relances, promos et tarifs (fichier crm.js)
(function(){ const sc = document.createElement('script'); sc.src = 'crm.js?v=14'; document.body.appendChild(sc); })();
// Moodboard : idees de seance (fichier mood.js)
(function(){ const sc = document.createElement('script'); sc.src = 'mood.js?v=4'; document.body.appendChild(sc); })();
(function(){ const sc = document.createElement('script'); sc.src = 'marketing.js?v=4'; document.body.appendChild(sc); })();
// Studio de publication et Ma marque (fichier studio.js)
(function(){ const sc = document.createElement('script'); sc.src = 'studio.js?v=1'; document.body.appendChild(sc); })();
(function(){ const sc = document.createElement('script'); sc.src = 'extras.js?v=5'; document.body.appendChild(sc); })();
(function(){ const sc = document.createElement('script'); sc.src = 'budget.js?v=2'; document.body.appendChild(sc); })();
(function(){ const sc = document.createElement('script'); sc.src = 'coach2.js?v=4'; document.body.appendChild(sc); })();
(function(){ const sc = document.createElement('script'); sc.src = 'equipe.js?v=2'; document.body.appendChild(sc); })();
(function(){ const sc = document.createElement('script'); sc.src = 'patron.js?v=3'; document.body.appendChild(sc); })();
// Suivi client : impressions et dettes (fichier suivi.js)
(function(){ const sc = document.createElement('script'); sc.src = 'suivi.js?v=1'; document.body.appendChild(sc); })();

(function agDesignInit(){
  document.body.classList.add('ag-ui');
  agBuildSide();
  agHeaderIcons();
  agStartStrip();
  agFoldAll();
  agFixDrawer();
  if(!agIsInstalled() && /android|iphone|ipad/i.test(navigator.userAgent)) agShowInstallBtn();
  agLoadThemeRemote();
  const act = document.querySelector('.page.active');
  if(act) agSyncSide(act.id.replace('page-', ''));
})();

// ------------------------------------------------------------
// DEMARRAGE
// ------------------------------------------------------------
(function agInit(){
  agBuildNav();
  agInjectSelect('amount', 'agTxAccount', 'Compte');
  agInjectSelect('revAmount', 'agRevAccount', 'Arrive sur quel compte ?');
  const rm = document.getElementById('revPaymentMethod');
  if(rm) rm.addEventListener('change', () => {
    const b = document.getElementById('agRevAccount');
    const id = agGuessAccount(rm.value);
    if(b && id) b.value = id;
  });
  // Historique : le resume puis la liste en premier, filtres / export / actions repliables
  (function(){
    const host = document.querySelector('#page-historique .container');
    if(!host || host.dataset.agDone) return;
    host.dataset.agDone = '1';
    const cards = [...host.querySelectorAll(':scope > .card')];
    const listCard = cards.find(c => c.querySelector('#histList'));
    const sumCard = cards.find(c => c.querySelector('#histCount'));
    const tools = cards.filter(c => c !== listCard && c !== sumCard);
    const det = document.createElement('details');
    det.className = 'ag-tools';
    det.innerHTML = '<summary>🔎 Filtres, recherche, export et actions</summary>';
    tools.forEach(c => det.appendChild(c));
    if(sumCard) host.appendChild(sumCard);
    host.appendChild(det);
    if(listCard) host.appendChild(listCard);
  })();
  const ht = document.getElementById('histType');
  if(ht && !ht.querySelector('option[value="transfert"]')) ht.insertAdjacentHTML('beforeend', '<option value="transfert">Transferts</option>');
  // Quand les donnees sont deja chargees (startApp a tourne avant), on charge les comptes
  const tick = async () => {
    if(typeof sb === 'undefined') return;
    const { data } = await sb.auth.getSession();
    if(!data || !data.session) return;
    await agLoadAccounts();
    refreshAll();
    let saved = null;
    try { saved = localStorage.getItem('active_tab'); } catch(e){}
    showTab(saved && document.getElementById('page-' + saved) ? saved : 'dash');
  };
  setTimeout(tick, 600);
})();

// ============================================================
// 0. FENETRES DE CONFIRMATION ET MESSAGES (remplacent les pop-up du navigateur)
// ============================================================
function agDialog(o){
  return new Promise(res => {
    const old = document.getElementById('agDlg'); if(old) old.remove();
    const bg = document.createElement('div'); bg.id = 'agDlg'; bg.className = 'ag-dlg-bg';
    const danger = o.danger || /supprim|effac|vider|retir|annuler|d[ée]finitiv|r[ée]initialis/i.test(o.msg || '');
    const lines = String(o.msg || '').split('\n');
    const title = o.title || (o.kind === 'alert' ? '' : lines.length > 1 ? lines.shift() : '');
    const body = lines.join('\n').trim();
    bg.innerHTML = `<div class="ag-dlg ${danger && o.kind !== 'alert' ? 'danger' : ''}" role="dialog" aria-modal="true">
      <div class="ag-dlg-ic">${o.kind === 'alert' ? agIcon('info', 22) : danger ? agIcon('trash', 22) : agIcon('check', 22)}</div>
      ${title ? `<h4>${agEsc(title)}</h4>` : ''}${body ? `<p>${agEsc(body)}</p>` : ''}
      ${o.kind === 'prompt' ? `<input id="agDlgIn" value="${agEsc(o.value || '')}" ${o.readonly ? 'readonly' : ''}>` : ''}
      <div class="ag-dlg-b">
        ${o.kind === 'alert' ? '' : `<button class="ag-dlg-no">${agEsc(o.no || 'Annuler')}</button>`}
        ${o.copy ? `<button class="ag-dlg-copy">Copier</button>` : ''}
        <button class="ag-dlg-ok">${agEsc(o.ok || (o.kind === 'alert' ? 'OK' : danger ? 'Confirmer' : 'Valider'))}</button>
      </div></div>`;
    document.body.appendChild(bg);
    requestAnimationFrame(() => bg.classList.add('show'));
    const done = v => { bg.classList.remove('show'); setTimeout(() => bg.remove(), 160); document.removeEventListener('keydown', key, true); res(v); };
    const key = e => { if(e.key === 'Escape'){ e.preventDefault(); done(o.kind === 'prompt' ? null : false); } if(e.key === 'Enter' && o.kind !== 'prompt'){ e.preventDefault(); done(true); } };
    document.addEventListener('keydown', key, true);
    bg.querySelector('.ag-dlg-ok').onclick = () => done(o.kind === 'prompt' ? document.getElementById('agDlgIn').value : true);
    const no = bg.querySelector('.ag-dlg-no'); if(no) no.onclick = () => done(o.kind === 'prompt' ? null : false);
    const cp = bg.querySelector('.ag-dlg-copy'); if(cp) cp.onclick = () => { const i = document.getElementById('agDlgIn'); i.select(); try { navigator.clipboard.writeText(i.value); } catch(e){ document.execCommand('copy'); } cp.textContent = 'Copié'; };
    bg.onclick = e => { if(e.target === bg && o.kind === 'alert') done(true); };
    setTimeout(() => { const i = document.getElementById('agDlgIn'); if(i){ i.focus(); i.select(); } else bg.querySelector('.ag-dlg-ok').focus(); }, 60);
  });
}
const agConfirm = (msg, o) => agDialog({ ...(o || {}), msg, kind: 'confirm' });
const agAlert = (msg, o) => agDialog({ ...(o || {}), msg, kind: 'alert' });
const agPrompt = (msg, value, o) => agDialog({ ...(o || {}), msg, value, kind: 'prompt' });
// Les anciens confirm()/prompt() de l'app sont synchrones : on affiche la belle fenetre,
// et si tu valides, on rejoue le meme clic en repondant "oui" automatiquement.
(function otNativePopups(){
  const nConfirm = window.confirm.bind(window), nPrompt = window.prompt.bind(window);
  let last = null, lastAt = 0, pass = 0, passVal = [];
  document.addEventListener('click', e => { last = e.target; lastAt = Date.now(); }, true);
  let passTimer = null;
  const armPass = () => { clearTimeout(passTimer); passTimer = setTimeout(() => { pass = 0; passVal = []; }, 8000); };
  const replay = () => {
    const t = last;
    if(!t || !t.isConnected) return false;
    window.__agReplaying = true;
    armPass();
    try { t.click(); } finally { window.__agReplaying = false; }
    return true;
  };
  const usable = () => last && last.isConnected && Date.now() - lastAt < 4000 && !/^(SELECT|INPUT|TEXTAREA|OPTION)$/.test(last.tagName);
  window.__agChain = 0;
  window.alert = msg => { agAlert(String(msg == null ? '' : msg)); };
  window.confirm = msg => {
    if(pass > 0){ pass--; return true; }
    if(!usable()) return nConfirm(msg);
    const n = window.__agChain;
    agConfirm(String(msg == null ? '' : msg)).then(ok => { if(!ok){ window.__agChain = 0; return; } window.__agChain = n + 1; pass = window.__agChain; if(!replay()) agAlert("L'action n'a pas pu être relancée, réessaie."); window.__agChain = 0; });
    return false;
  };
  window.prompt = (msg, def) => {
    if(passVal.length){ return passVal.shift(); }
    const txt = String(msg == null ? '' : msg);
    const isCopy = /copie/i.test(txt);
    if(isCopy){ agPrompt(txt, def || '', { readonly: true, copy: true, ok: 'Fermer', no: 'Annuler' }); return null; }
    if(!usable()) return nPrompt(msg, def);
    agPrompt(txt, def || '').then(v => { if(v === null) return; passVal = [v]; if(!replay()) agAlert("L'action n'a pas pu être relancée, réessaie."); });
    return null;
  };
})();



// ------------------------------------------------------------
// MONTANTS CACHES : caches a chaque ouverture, l'oeil les montre
// (jamais memorise : ils se recachent en quittant l'app ou en actualisant)
// ------------------------------------------------------------
function agEyeIcon(){
  const ouvert = document.body.classList.contains('ag-voir');
  return ouvert
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.7-1.3"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
}
function agMajYeux(){ document.querySelectorAll('.ag-eye').forEach(b => { b.innerHTML = agEyeIcon(); b.title = document.body.classList.contains('ag-voir') ? 'Cacher les montants' : 'Afficher les montants'; }); }
function agToggleMontants(force){
  const voir = typeof force === 'boolean' ? force : !document.body.classList.contains('ag-voir');
  document.body.classList.toggle('ag-voir', voir);
  agMajYeux();
}
(function agMontantsCaches(){
  const st = document.createElement('style');
  st.textContent = `
    .ag-total{position:relative}
    .ag-eye{position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:inherit;display:grid;place-items:center;cursor:pointer;padding:0;margin:0}
    .ag-eye:active{transform:scale(.94)}
    body:not(.ag-voir) .ag-m{font-size:0 !important;letter-spacing:0 !important}
    body:not(.ag-voir) .ag-m *{display:none !important}
    body:not(.ag-voir) .ag-m::after{content:'••••••';font-size:1rem;letter-spacing:.12em;opacity:.85}
    body:not(.ag-voir) .ag-total .amt.ag-m::after{content:'•••••••';font-size:30px;letter-spacing:.14em}
    body:not(.ag-voir) .ag-acc .v.ag-m::after,body:not(.ag-voir) .ag-coffre .v.ag-m::after{content:'•••••';font-size:15px}
    body:not(.ag-voir) .ag-coffre .goal.ag-m::after{content:'sur •••••';font-size:12px}
    body:not(.ag-voir) .ag-mb i{width:0 !important}
    body:not(.ag-voir) .ag-total.neg .amt,body:not(.ag-voir) .ag-acc .v.neg{color:inherit}
    body:not(.ag-voir) .ag-total .amt.ag-m{color:#fff}
  `;
  document.head.appendChild(st);
  // Toujours caches au demarrage, et des qu'on quitte l'app
  document.body.classList.remove('ag-voir');
  document.addEventListener('visibilitychange', () => { if(document.hidden) agToggleMontants(false); });
  window.addEventListener('pagehide', () => agToggleMontants(false));
})();
