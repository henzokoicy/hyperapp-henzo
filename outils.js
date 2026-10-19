// ============================================================
// SUPER APP HENZO - OUTILS
// - Selection multiple : historique (modifier une a une, annuler, restaurer,
//   changer de compte, supprimer) et coffres (modifier, remettre a 0, supprimer)
// - Mise a jour automatique (donnees + nouvelle version du site)
// - Mes donnees : sauvegarde, import, remise a zero (avec sauvegarde avant)
// - Boutons d'action aussi en haut + bouton "remonter en haut"
// - Demandes de reservation (page reserver.html) + code promo dans les seances
// ============================================================

const OT = { cofSel: false, cofIds: new Set(), cofQueue: [], txQueue: [], lastRefresh: Date.now(), busy: false, resas: [], shootPromo: null, etags: {} };

async function otUid(){ const { data } = await sb.auth.getUser(); return data && data.user ? data.user.id : null; }
function otSheetOpen(){ return !!document.querySelector('.ag-sheet, .modal-bg.show, #detailTxModal'); }
function otActivePage(){ const p = document.querySelector('.page.active'); return p ? p.id.replace('page-', '') : ''; }

// ============================================================
// 1. SELECTION MULTIPLE - HISTORIQUE
// ============================================================
function otSelBar(){
  let bar = document.getElementById('otSelBar');
  const n = (typeof selectedTxIds !== 'undefined') ? selectedTxIds.size : 0;
  if(!n || otActivePage() !== 'historique'){ if(bar) bar.remove(); return; }
  if(!bar){ bar = document.createElement('div'); bar.id = 'otSelBar'; bar.className = 'ot-selbar'; document.body.appendChild(bar); }
  const sel = txs.filter(t => selectedTxIds.has(t.id));
  const canCancel = sel.some(t => !t.cancelled), canRestore = sel.some(t => t.cancelled);
  bar.innerHTML = `
    <div class="ot-sel-h"><b>${n} sélectionné${n > 1 ? 's' : ''}</b><button class="ot-x" onclick="otClearSel()">Tout désélectionner</button></div>
    <div class="ot-sel-b">
      <button onclick="otEditQueue()">${agIcon('edit', 16)}<span>Modifier une à une</span></button>
      ${canCancel ? `<button onclick="otBulkCancel(true)">${agIcon('ban', 16)}<span>Annuler</span></button>` : ''}
      ${canRestore ? `<button onclick="otBulkCancel(false)">${agIcon('refresh', 16)}<span>Restaurer</span></button>` : ''}
      <button onclick="otBulkAccount()">${agIcon('wallet', 16)}<span>Changer de compte</span></button>
      <button class="danger" onclick="otBulkDelete()">${agIcon('trash', 16)}<span>Supprimer</span></button>
    </div>`;
}
function otClearSel(){ selectedTxIds.clear(); if(typeof renderHistory === 'function') renderHistory(); otSelBar(); }
if(typeof toggleTxSelect === 'function'){ const _o = toggleTxSelect; toggleTxSelect = function(){ const r = _o.apply(this, arguments); otSelBar(); return r; }; }
if(typeof toggleSelectAll === 'function'){ const _o = toggleSelectAll; toggleSelectAll = function(){ const r = _o.apply(this, arguments); otSelBar(); return r; }; }
if(typeof renderHistory === 'function'){ const _o = renderHistory; renderHistory = function(){ const r = _o.apply(this, arguments); otSelBar(); return r; }; }

function otEditQueue(){
  OT.txQueue = txs.filter(t => selectedTxIds.has(t.id)).sort((a, b) => String(b.date).localeCompare(String(a.date))).map(t => t.id);
  OT.txQueueTotal = OT.txQueue.length;
  otEditNext();
}
function otEditNext(){
  const id = OT.txQueue.shift();
  if(!id){ agCloseSheet('otTxEdit'); agToast('Modifications terminées'); return; }
  otEditTx(id);
}
function otEditTx(id){
  const t = txs.find(x => x.id === id); if(!t){ otEditNext(); return; }
  const pos = OT.txQueueTotal ? OT.txQueueTotal - OT.txQueue.length : 0;
  const cats = [...new Set(txs.filter(x => x.type === t.type).map(x => x.category).filter(Boolean))].sort();
  const accs = (typeof agActiveAccounts === 'function' ? agActiveAccounts() : []);
  const typeLbl = { revenu: "Entrée d'argent", depense: 'Dépense', transfert: 'Transfert' }[t.type] || t.type;
  agSheet('otTxEdit', `
    <h3>Modifier ${OT.txQueueTotal > 1 ? `<span class="ot-pos">${pos}/${OT.txQueueTotal}</span>` : ''}</h3>
    <div class="ag-hint" style="margin-top:0">${agEsc(typeLbl)}${t.cancelled ? ' · annulée' : ''}</div>
    <label>Montant (FCFA)</label><input id="otAmt" type="number" inputmode="decimal" value="${Number(t.amount) || 0}">
    ${t.type !== 'transfert' ? `<label>Catégorie</label><input id="otCat" list="otCats" value="${agEsc(t.category || '')}"><datalist id="otCats">${cats.map(c => `<option value="${agEsc(c)}">`).join('')}</datalist>` : ''}
    ${t.type !== 'transfert' && accs.length ? `<label>Compte</label><select id="otAcc"><option value="">Aucun</option>${accs.map(a => `<option value="${a.id}" ${a.id === t.account_id ? 'selected' : ''}>${agEsc(a.name)}</option>`).join('')}</select>` : ''}
    <label>Note</label><input id="otNote" value="${agEsc(t.note || '')}">
    <label>Date</label><input id="otDate" type="date" value="${agEsc(String(t.date || '').slice(0, 10))}">
    <div class="ag-hint">Si tu changes le montant d'un mouvement lié à un coffre, le coffre est corrigé automatiquement.</div>
    <button class="btn-primary" onclick="otSaveTx(${id})">${OT.txQueue.length ? 'Enregistrer et suivante' : 'Enregistrer'}</button>
    ${OT.txQueue.length ? `<button class="btn-secondary" style="margin-top:8px" onclick="otEditNext()">Passer celle-ci</button>` : ''}`);
}
async function otSaveTx(id){
  const g = k => document.getElementById(k);
  const data = { amount: parseFloat(g('otAmt').value) || 0, note: g('otNote').value.trim() || null };
  if(g('otDate').value) data.date = g('otDate').value;
  if(g('otCat')) data.category = g('otCat').value.trim() || null;
  if(g('otAcc')) data.account_id = g('otAcc').value ? Number(g('otAcc').value) : null;
  const r = await dbUpdate('transactions', id, data);
  if(!r) return;
  const i = txs.findIndex(x => x.id === id); if(i >= 0) txs[i] = r;
  refreshAll(); if(typeof renderHistory === 'function') renderHistory();
  if(OT.txQueue.length) otEditNext(); else { agCloseSheet('otTxEdit'); agToast('Enregistré'); }
}
async function otBulkCancel(cancel){
  const list = txs.filter(t => selectedTxIds.has(t.id) && !!t.cancelled !== cancel);
  if(!list.length) return;
  if(!confirm(cancel ? `Annuler ${list.length} mouvement(s) ?\nIls restent visibles (barrés) et l'argent revient à sa place.` : `Restaurer ${list.length} mouvement(s) ?`)) return;
  for(const t of list){
    const r = await dbUpdate('transactions', t.id, { cancelled: cancel, cancelled_at: cancel ? new Date().toISOString() : null });
    if(r){ const i = txs.findIndex(x => x.id === t.id); if(i >= 0) txs[i] = r; }
  }
  refreshAll(); if(typeof renderHistory === 'function') renderHistory();
  agToast(cancel ? 'Mouvements annulés' : 'Mouvements restaurés');
}
function otBulkAccount(){
  const accs = agActiveAccounts();
  if(!accs.length){ alert("Crée d'abord tes comptes"); return; }
  agSheet('otAccPick', `<h3>Mettre sur quel compte ?</h3>
    <div class="ag-hint" style="margin-top:0">Pour les entrées et dépenses sélectionnées (les transferts ne changent pas).</div>
    <select id="otAccSel">${accs.map(a => `<option value="${a.id}">${agEsc(a.name)}</option>`).join('')}</select>
    <button class="btn-primary" onclick="otBulkAccountSave()">Valider</button>`);
}
async function otBulkAccountSave(){
  const acc = Number(document.getElementById('otAccSel').value);
  const list = txs.filter(t => selectedTxIds.has(t.id) && t.type !== 'transfert');
  for(const t of list){
    const r = await dbUpdate('transactions', t.id, { account_id: acc });
    if(r){ const i = txs.findIndex(x => x.id === t.id); if(i >= 0) txs[i] = r; }
  }
  agCloseSheet('otAccPick'); refreshAll(); if(typeof renderHistory === 'function') renderHistory();
  agToast(`${list.length} mouvement(s) déplacé(s)`);
}
async function otBulkDelete(){
  const ids = [...selectedTxIds];
  if(!ids.length) return;
  if(!confirm(`Supprimer définitivement ${ids.length} mouvement(s) ?\nL'argent revient à sa place (comptes et coffres).`)) return;
  for(const id of ids){ const ok = await dbDelete('transactions', id); if(ok) txs = txs.filter(t => t.id !== id); }
  selectedTxIds.clear();
  if(typeof populateHistFilters === 'function') populateHistFilters();
  refreshAll(); if(typeof renderHistory === 'function') renderHistory();
  agToast('Supprimé');
}

// ============================================================
// 2. SELECTION MULTIPLE - COFFRES
// ============================================================
if(typeof agRenderCoffresPage === 'function'){
  const _o = agRenderCoffresPage;
  agRenderCoffresPage = function(){
    _o.apply(this, arguments);
    const el = document.getElementById('agCoffresBody'); if(!el) return;
    const cof = agCoffres();
    if(cof.length){
      const tb = document.createElement('div'); tb.className = 'ot-cof-tb';
      tb.innerHTML = OT.cofSel
        ? `<span>${OT.cofIds.size} coffre${OT.cofIds.size > 1 ? 's' : ''} sélectionné${OT.cofIds.size > 1 ? 's' : ''}</span><button onclick="otCofAll()">Tout</button><button onclick="OT.cofSel=false;OT.cofIds.clear();agRenderCoffresPage();otCofBar()">Terminer</button>`
        : `<button onclick="OT.cofSel=true;agRenderCoffresPage();otCofBar()">${agIcon('edit', 14)} Sélectionner plusieurs</button>`;
      const first = el.querySelector('.ag-coffre');
      if(first) el.insertBefore(tb, first);
    }
    if(OT.cofSel){
      el.querySelectorAll('.ag-coffre').forEach((card, i) => {
        const c = cof[i]; if(!c) return;
        card.classList.add('ot-selectable'); card.classList.toggle('ot-on', OT.cofIds.has(c.id));
        card.removeAttribute('onclick');
        card.onclick = () => { OT.cofIds.has(c.id) ? OT.cofIds.delete(c.id) : OT.cofIds.add(c.id); agRenderCoffresPage(); otCofBar(); };
      });
    }
  };
}
function otCofAll(){ const cof = agCoffres(); if(OT.cofIds.size === cof.length) OT.cofIds.clear(); else cof.forEach(c => OT.cofIds.add(c.id)); agRenderCoffresPage(); otCofBar(); }
function otCofBar(){
  let bar = document.getElementById('otCofBar');
  const n = OT.cofIds.size;
  if(!OT.cofSel || !n || otActivePage() !== 'coffres'){ if(bar) bar.remove(); return; }
  if(!bar){ bar = document.createElement('div'); bar.id = 'otCofBar'; bar.className = 'ot-selbar'; document.body.appendChild(bar); }
  bar.innerHTML = `
    <div class="ot-sel-h"><b>${n} coffre${n > 1 ? 's' : ''}</b><button class="ot-x" onclick="OT.cofIds.clear();agRenderCoffresPage();otCofBar()">Tout désélectionner</button></div>
    <div class="ot-sel-b">
      <button onclick="otCofEditQueue()">${agIcon('edit', 16)}<span>Modifier un à un</span></button>
      <button onclick="otCofZero()">${agIcon('refresh', 16)}<span>Remettre à 0</span></button>
      <button class="danger" onclick="otCofDelete()">${agIcon('trash', 16)}<span>Supprimer</span></button>
    </div>`;
}
function otCofEditQueue(){ OT.cofQueue = [...OT.cofIds]; OT.cofQueueTotal = OT.cofQueue.length; otCofNext(); }
function otCofNext(){
  const id = OT.cofQueue.shift();
  const nb = document.getElementById('otNextBar'); if(nb) nb.remove();
  if(!id) return;
  openCoffreModal(id);
  if(OT.cofQueue.length){
    const b = document.createElement('div'); b.id = 'otNextBar'; b.className = 'ot-nextbar';
    b.innerHTML = `<span>Coffre ${OT.cofQueueTotal - OT.cofQueue.length}/${OT.cofQueueTotal}</span><button onclick="if(typeof closeCoffreModal==='function')closeCoffreModal();document.querySelectorAll('.modal-bg.show').forEach(m=>m.classList.remove('show'));otCofNext()">Coffre suivant</button><button class="ot-x" onclick="OT.cofQueue=[];this.parentElement.remove()">Arrêter</button>`;
    document.body.appendChild(b);
  }
}
async function otCofZero(){
  const list = coffres.filter(c => OT.cofIds.has(c.id));
  const tot = list.reduce((s, c) => s + (Number(c.current) || 0), 0);
  if(!confirm(`Remettre ${list.length} coffre(s) à 0 F ?\n${agF(tot)} disparaîtront de tes coffres (sans aller sur un compte).\n\nPour déplacer l'argent vers un compte, utilise plutôt "Retirer".`)) return;
  for(const c of list){ const r = await dbUpdate('goals', c.id, { current: 0 }); if(r) Object.assign(c, r); }
  refreshAll(); agToast('Coffres remis à 0');
}
async function otCofDelete(){
  const list = coffres.filter(c => OT.cofIds.has(c.id));
  if(!confirm(`Supprimer ${list.length} coffre(s) ?\nLes mouvements déjà enregistrés restent dans l'historique.`)) return;
  for(const c of list){ const ok = await dbDelete('goals', c.id); if(ok) coffres = coffres.filter(x => x.id !== c.id); }
  OT.cofIds.clear(); refreshAll(); otCofBar(); agToast('Supprimé');
}

// ============================================================
// 3. MISE A JOUR AUTOMATIQUE
// ============================================================
async function otRefresh(force){
  if(OT.busy) return;
  if(!force && (document.hidden || otSheetOpen() || (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)))) return;
  OT.busy = true;
  try {
    const y = window.scrollY;
    await loadAllData();
    if(typeof crmLoad === 'function') { try { await crmLoad(); } catch(e){} }
    if(typeof pxLoad === 'function' && typeof PX !== 'undefined' && PX.loaded) { try { await pxLoad(); } catch(e){} }
    await otLoadResas();
    refreshAll();
    const p = otActivePage();
    if(p === 'clients' && typeof crmRender === 'function') crmRender();
    if(p === 'tarifs' && typeof crmRenderTarifs === 'function') crmRenderTarifs();
    if(p === 'historique' && typeof renderHistory === 'function') renderHistory();
    window.scrollTo(0, y);
    OT.lastRefresh = Date.now();
  } catch(e){ console.warn('maj auto', e); }
  OT.busy = false;
}
// Nouvelle version du site publiee ? On recharge tout seul.
const OT_FILES = ['index.html', 'argent.js', 'crm.js', 'prix.js', 'outils.js', 'mood.js', 'galerie.js', 'theme.css'];
async function otCheckVersion(){
  let changed = false;
  for(const f of OT_FILES){
    try {
      const r = await fetch(f + '?check=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
      const tag = r.headers.get('etag') || r.headers.get('last-modified') || '';
      if(!tag) continue;
      if(OT.etags[f] && OT.etags[f] !== tag) changed = true;
      OT.etags[f] = tag;
    } catch(e){}
  }
  if(changed) otReloadWhenFree();
}
function otReloadWhenFree(){
  if(otSheetOpen() || (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName))){ setTimeout(otReloadWhenFree, 5000); return; }
  agToast('Nouvelle version, mise à jour...');
  setTimeout(() => location.reload(), 800);
}
document.addEventListener('visibilitychange', () => {
  if(document.hidden) return;
  if(Date.now() - OT.lastRefresh > 20000) otRefresh();
  otCheckVersion();
});
window.addEventListener('online', () => otRefresh());
setInterval(() => { if(!document.hidden) otRefresh(); }, 90000);
setInterval(() => { if(!document.hidden) otCheckVersion(); }, 5 * 60000);
setTimeout(otCheckVersion, 4000);

// ============================================================
// 4. MES DONNEES : sauvegarde, import, remise a zero
// ============================================================
const OT_GROUPS = [
  { k: 'transactions', n: 'Transactions (argent)', t: ['transactions'], d: 'Entrées, dépenses, transferts' },
  { k: 'comptes', n: 'Comptes', t: ['accounts'], d: 'Wave, espèces, banque...' },
  { k: 'coffres', n: 'Coffres et objectifs', t: ['goal_reminders', 'goals'], d: 'Avec leurs rappels' },
  { k: 'seances', n: 'Séances', t: ['shoots'] },
  { k: 'clients', n: 'Clients', t: ['client_messages', 'reservations', 'clients'], d: 'Avec messages envoyés et réservations' },
  { k: 'liens', n: 'Liens de paiement', t: ['payment_links'] },
  { k: 'notes', n: 'Notes et rappels', t: ['notes', 'reminders'] },
  { k: 'idees', n: 'Idées et inspirations', t: ['saved_ideas', 'inspirations'] },
  { k: 'promos', n: 'Promos et bons', t: ['promos'] },
  { k: 'tarifs', n: 'Tarifs, devis, page de tarifs', t: ['devis', 'tarifs', 'tarif_page'] },
  { k: 'mood', n: 'Moodboards', t: ['mood_feedback', 'mood_images', 'mood_boards'], d: 'Tableaux, images et choix des clients' }
];
const OT_ORDER = ['accounts', 'goals', 'goal_reminders', 'clients', 'shoots', 'transactions', 'payment_links', 'notes', 'reminders', 'saved_ideas', 'inspirations', 'client_messages', 'promos', 'tarifs', 'devis', 'tarif_page', 'reservations', 'mood_boards', 'mood_images', 'mood_feedback', 'user_settings'];

async function otSnapshot(){
  const uid = await otUid(); if(!uid) throw new Error('Non connecté');
  const tables = {};
  for(const t of OT_ORDER){
    const { data, error } = await sb.from(t).select('*').eq('user_id', uid);
    if(!error) tables[t] = data || [];
  }
  return { app: 'henzo-super-app', version: 1, date: new Date().toISOString(), tables };
}
function otCount(snap){ return Object.values(snap.tables || {}).reduce((s, r) => s + r.length, 0); }
async function otCloudSave(label){
  const snap = await otSnapshot();
  const uid = await otUid();
  const txt = JSON.stringify(snap);
  const { error } = await sb.from('app_backups').insert({ user_id: uid, label, data: snap, size: txt.length });
  if(error) throw new Error('Sauvegarde impossible : ' + error.message);
  return snap;
}
function otDownload(snap){
  const blob = new Blob([JSON.stringify(snap, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'henzo-sauvegarde-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}

async function otOpenData(){
  agSheet('otData', `<h3>Mes données</h3><div class="ag-empty">Chargement...</div>`);
  const { data } = await sb.from('app_backups').select('id,label,size,created_at').order('created_at', { ascending: false }).limit(30);
  const list = data || [];
  agSheet('otData', `
    <h3>Mes données</h3>
    <div class="ag-hint" style="margin-top:0">Avant chaque remise à zéro ou import, l'app fait toujours une sauvegarde automatique dans le cloud.</div>
    <h4 class="crm-h4">Sauvegarder</h4>
    <div class="crm-2"><button class="btn-primary" onclick="otBackupNow(true)">Télécharger</button><button class="btn-secondary" onclick="otBackupNow(false)">Dans le cloud</button></div>
    <h4 class="crm-h4">Importer</h4>
    <button class="btn-secondary" onclick="document.getElementById('otImpFile').click()">Choisir un fichier de sauvegarde</button>
    <input type="file" id="otImpFile" accept=".json,application/json" style="display:none" onchange="otImportFile(this.files[0])">
    <h4 class="crm-h4">Sauvegardes dans le cloud</h4>
    <div class="ag-list">${list.length ? list.map(b => `<div class="crm-line"><div><b>${agEsc(b.label || 'Sauvegarde')}</b><span>${new Date(b.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · ${Math.max(1, Math.round((b.size || 0) / 1024))} Ko</span></div>
      <div style="display:flex;gap:6px"><button class="ag-ibtn" title="Télécharger" onclick="otCloudDownload(${b.id})">${agIcon('download', 15)}</button><button class="btn-secondary" style="width:auto;padding:8px 12px" onclick="otCloudRestore(${b.id})">Restaurer</button></div></div>`).join('') : '<div class="ag-empty">Aucune sauvegarde dans le cloud.</div>'}</div>
    <h4 class="crm-h4">Remise à zéro</h4>
    <button class="btn-secondary" onclick="otResetMoney()">Remettre l'argent à zéro</button>
    <button class="btn-danger" style="width:100%;padding:12px;margin-top:8px" onclick="otResetApp()">Réinitialiser l'app (au choix)</button>
    <div class="ag-hint">La galerie clients (photos) n'est jamais touchée par ces boutons.</div>`);
}
async function otBackupNow(download){
  try {
    agToast('Sauvegarde en cours...');
    const snap = await otCloudSave(download ? 'Sauvegarde téléchargée' : 'Sauvegarde manuelle');
    if(download) otDownload(snap);
    agToast(`Sauvegardé (${otCount(snap)} éléments)`);
    otOpenData();
  } catch(e){ alert(e.message); }
}
async function otCloudDownload(id){
  const { data, error } = await sb.from('app_backups').select('data').eq('id', id).single();
  if(error || !data){ alert('Impossible de lire cette sauvegarde'); return; }
  otDownload(data.data);
}
async function otCloudRestore(id){
  const { data, error } = await sb.from('app_backups').select('data,label,created_at').eq('id', id).single();
  if(error || !data){ alert('Impossible de lire cette sauvegarde'); return; }
  otImportChoose(data.data, `${data.label || 'Sauvegarde'} du ${new Date(data.created_at).toLocaleString('fr-FR')}`);
}
function otImportFile(file){
  if(!file) return;
  const r = new FileReader();
  r.onload = () => {
    let snap; try { snap = JSON.parse(r.result); } catch(e){ alert("Ce fichier n'est pas une sauvegarde valide."); return; }
    if(!snap || !snap.tables){ alert("Ce fichier n'est pas une sauvegarde de la Super App."); return; }
    otImportChoose(snap, file.name);
  };
  r.readAsText(file);
}
function otImportChoose(snap, label){
  OT.importSnap = snap;
  const rows = OT_GROUPS.map(g => ({ g, n: g.t.reduce((s, t) => s + ((snap.tables[t] || []).length), 0) })).filter(x => x.n);
  agSheet('otImp', `
    <h3>Restaurer</h3>
    <div class="ag-hint" style="margin-top:0">${agEsc(label)}${snap.date ? ' · faite le ' + new Date(snap.date).toLocaleString('fr-FR') : ''}</div>
    <div class="ag-list">${rows.map(x => `<label class="crm-pick"><input type="checkbox" value="${x.g.k}" checked><div><b>${agEsc(x.g.n)}</b><span>${x.n} élément${x.n > 1 ? 's' : ''}</span></div></label>`).join('') || '<div class="ag-empty">Sauvegarde vide</div>'}</div>
    <label>Comment ?</label>
    <div class="ag-pills" id="otImpMode"><button class="on" data-m="replace" onclick="agPick(this)">Remplacer</button><button data-m="merge" onclick="agPick(this)">Ajouter / mettre à jour</button></div>
    <div class="ag-hint">Remplacer : ce qui est coché est d'abord vidé, puis remis comme dans la sauvegarde. Ajouter : rien n'est effacé, les éléments manquants sont ajoutés.</div>
    <button class="btn-primary" onclick="otImportRun()">Restaurer maintenant</button>`);
}
async function otImportRun(){
  const snap = OT.importSnap; if(!snap) return;
  const keys = [...document.querySelectorAll('#otImp input:checked')].map(i => i.value);
  const mode = document.querySelector('#otImpMode button.on').dataset.m;
  if(!keys.length){ alert('Coche au moins une partie'); return; }
  if(!confirm(mode === 'replace' ? 'Remplacer ces données par celles de la sauvegarde ?\nUne sauvegarde de ton état actuel sera faite avant.' : 'Ajouter les données de la sauvegarde ?')) return;
  const tables = OT_GROUPS.filter(g => keys.includes(g.k)).flatMap(g => g.t);
  try {
    agToast('Sauvegarde de sécurité...');
    await otCloudSave('Automatique avant restauration');
    const uid = await otUid();
    if(mode === 'replace') await otWipe(tables, uid);
    for(const t of OT_ORDER.filter(x => tables.includes(x))){
      const rows = (snap.tables[t] || []).map(r => ({ ...r, user_id: uid }));
      for(let i = 0; i < rows.length; i += 200){
        const part = rows.slice(i, i + 200);
        const { error } = t === 'tarif_page'
          ? await sb.from(t).upsert(part, { onConflict: 'user_id' })
          : await sb.from(t).upsert(part, { onConflict: 'id' });
        if(error) throw new Error(t + ' : ' + error.message);
      }
    }
    try { await sb.rpc('app_fix_sequences'); } catch(e){}
    agCloseSheet('otImp'); agCloseSheet('otData');
    await otRefresh(true);
    agToast('Restauration terminée');
  } catch(e){ alert('Erreur pendant la restauration : ' + e.message + "\nTon état d'avant est dans les sauvegardes cloud."); }
}
async function otWipe(tables, uid){
  const order = ['transactions', 'client_messages', 'reservations', 'devis', 'shoots', 'goal_reminders', 'payment_links', 'notes', 'reminders', 'saved_ideas', 'inspirations', 'promos', 'tarifs', 'tarif_page', 'mood_feedback', 'mood_images', 'mood_boards', 'clients', 'goals', 'accounts'];
  for(const t of order.filter(x => tables.includes(x))){
    const { error } = await sb.from(t).delete().eq('user_id', uid);
    if(error) throw new Error(t + ' : ' + error.message);
  }
}
function otResetMoney(){
  agSheet('otRZ', `
    <h3>Remettre l'argent à zéro</h3>
    <div class="ag-list">
      <label class="crm-pick"><input type="checkbox" id="otRzTx" checked><div><b>Effacer toutes les transactions</b><span>${txs.length} mouvement(s)</span></div></label>
      <label class="crm-pick"><input type="checkbox" id="otRzCof" checked><div><b>Mettre tous les coffres à 0 F</b><span>Les coffres restent, vides</span></div></label>
      <label class="crm-pick"><input type="checkbox" id="otRzAcc" checked><div><b>Mettre le solde de départ des comptes à 0 F</b><span>Les comptes restent</span></div></label>
    </div>
    <div class="ag-hint">Tes clients, séances, notes et le reste ne sont pas touchés. Une sauvegarde est faite juste avant.</div>
    <label>Pour confirmer, écris ZERO</label><input id="otRzOk" autocomplete="off" placeholder="ZERO">
    <button class="btn-danger" style="width:100%;padding:13px;margin-top:10px" onclick="otResetMoneyRun()">Remettre à zéro</button>`);
}
async function otResetMoneyRun(){
  if(document.getElementById('otRzOk').value.trim().toUpperCase() !== 'ZERO'){ alert('Écris ZERO pour confirmer'); return; }
  const doTx = document.getElementById('otRzTx').checked, doCof = document.getElementById('otRzCof').checked, doAcc = document.getElementById('otRzAcc').checked;
  try {
    agToast('Sauvegarde de sécurité...');
    await otCloudSave("Automatique avant remise à zéro de l'argent");
    const uid = await otUid();
    if(doTx){ const { error } = await sb.from('transactions').delete().eq('user_id', uid); if(error) throw error; }
    if(doCof){ const { error } = await sb.from('goals').update({ current: 0 }).eq('user_id', uid); if(error) throw error; }
    if(doAcc){ const { error } = await sb.from('accounts').update({ initial_balance: 0 }).eq('user_id', uid); if(error) throw error; }
    agCloseSheet('otRZ'); agCloseSheet('otData');
    await otRefresh(true);
    agToast("L'argent est remis à zéro");
  } catch(e){ alert('Erreur : ' + (e.message || e)); }
}
function otResetApp(){
  agSheet('otRA', `
    <h3>Réinitialiser l'app</h3>
    <div class="ag-hint" style="margin-top:0">Coche ce que tu veux effacer. Une sauvegarde complète est faite juste avant.</div>
    <button class="crm-link" onclick="document.querySelectorAll('#otRA .crm-pick input').forEach(i=>i.checked=true)">Tout sélectionner</button>
    <div class="ag-list">${OT_GROUPS.map(g => `<label class="crm-pick"><input type="checkbox" value="${g.k}"><div><b>${agEsc(g.n)}</b>${g.d ? `<span>${agEsc(g.d)}</span>` : ''}</div></label>`).join('')}</div>
    <div class="ag-hint">Tes réglages (thème, clé IA, mot de passe galerie) sont gardés.</div>
    <label>Pour confirmer, écris EFFACER</label><input id="otRaOk" autocomplete="off" placeholder="EFFACER">
    <button class="btn-danger" style="width:100%;padding:13px;margin-top:10px" onclick="otResetAppRun()">Effacer ce qui est coché</button>`);
}
async function otResetAppRun(){
  const keys = [...document.querySelectorAll('#otRA .crm-pick input:checked')].map(i => i.value);
  if(!keys.length){ alert('Coche au moins une partie'); return; }
  if(document.getElementById('otRaOk').value.trim().toUpperCase() !== 'EFFACER'){ alert('Écris EFFACER pour confirmer'); return; }
  const tables = OT_GROUPS.filter(g => keys.includes(g.k)).flatMap(g => g.t);
  try {
    agToast('Sauvegarde de sécurité...');
    await otCloudSave('Automatique avant réinitialisation');
    await otWipe(tables, await otUid());
    agCloseSheet('otRA'); agCloseSheet('otData');
    await otRefresh(true);
    agToast('Réinitialisation terminée');
  } catch(e){ alert('Erreur : ' + (e.message || e) + "\nTes données d'avant sont dans les sauvegardes cloud."); }
}
// Bouton "Mes donnees" dans les menus
function otAddMenus(){
  const side = document.querySelector('#agSide .ag-side-foot');
  if(side && !side.querySelector('.ot-data-btn')){
    const b = document.createElement('button'); b.className = 'ag-side-it ot-data-btn';
    b.innerHTML = `<span class="si">${agIcon('shield', 18)}</span><span class="sl">Mes données</span>`;
    b.onclick = otOpenData; side.insertBefore(b, side.firstChild);
  }
  const um = document.querySelector('.user-menu-items');
  if(um && !um.querySelector('.ot-data-btn')){
    const b = document.createElement('button'); b.className = 'ot-data-btn';
    b.innerHTML = `<span class="icon">${agIcon('shield', 16)}</span><span>Mes données</span>`;
    b.onclick = () => { if(typeof closeUserMenu === 'function') closeUserMenu(); otOpenData(); };
    um.insertBefore(b, um.firstChild);
  }
  const th = document.querySelector('.drawer-nav.ag-theme-btn');
  if(th && !document.querySelector('.drawer-nav.ot-data-btn')){
    const b = document.createElement('button'); b.className = 'drawer-nav ot-data-btn';
    b.innerHTML = `<span class="nav-icon">${agIcon('shield', 16)}</span><span>Mes données</span>`;
    b.onclick = () => { if(typeof closeDrawer === 'function') closeDrawer(); otOpenData(); };
    th.parentElement.insertBefore(b, th.nextSibling);
  }
  const hist = document.querySelector('#page-historique .container');
  if(hist && !hist.querySelector('.ot-hist-tools')){
    const d = document.createElement('div'); d.className = 'ot-hist-tools';
    d.innerHTML = `<span>Coche des lignes pour les modifier, annuler ou supprimer ensemble.</span><button onclick="otOpenData()">${agIcon('shield', 14)} Sauvegarde et remise à zéro</button>`;
    hist.appendChild(d);
  }
}

// ============================================================
// 5. BOUTONS EN HAUT + REMONTER
// ============================================================
function otTopButtons(){
  document.querySelectorAll('.page .card').forEach(card => {
    if(card.dataset.otTop) return;
    const btns = [...card.querySelectorAll(':scope > button.btn-pink, :scope > button.btn-primary')]
      .filter(b => /^(open|ouvrir|add|nouvel|creer)/i.test((b.getAttribute('onclick') || '').trim()));
    if(!btns.length) return;
    card.dataset.otTop = '1';
    const h = card.querySelector(':scope > h2');
    const row = document.createElement('div'); row.className = 'ot-toprow';
    btns.forEach(b => { const c = b.cloneNode(true); c.removeAttribute('style'); c.classList.add('ot-topbtn'); row.appendChild(c); });
    if(h) h.insertAdjacentElement('afterend', row); else card.insertBefore(row, card.firstChild);
  });
}
(function otBackTop(){
  const b = document.createElement('button');
  b.id = 'otTop'; b.className = 'ot-backtop'; b.title = 'Remonter en haut';
  b.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  b.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  document.body.appendChild(b);
  const upd = () => b.classList.toggle('show', window.scrollY > 500);
  window.addEventListener('scroll', upd, { passive: true }); upd();
})();

// ============================================================
// 6. RESERVATIONS EN LIGNE + CODE PROMO
// ============================================================
async function otLoadResas(){
  try { const { data } = await sb.from('reservations').select('*').order('created_at', { ascending: false }).limit(100); OT.resas = data || []; } catch(e){ OT.resas = []; }
}
function otResaLink(code){
  const slug = (typeof PX !== 'undefined' && PX.page && PX.page.slug) ? PX.page.slug : 'henzo';
  return `${location.origin}/reserver.html?s=${encodeURIComponent(slug)}${code ? '&code=' + encodeURIComponent(code) : ''}`;
}
function otResaHtml(){
  const nouv = OT.resas.filter(r => r.status === 'nouvelle');
  if(!OT.resas.length) return '';
  return `<div class="ag-sec"><h3>Demandes de réservation</h3>${nouv.length ? `<span class="crm-count ot-new">${nouv.length} nouvelle${nouv.length > 1 ? 's' : ''}</span>` : ''}</div>
    <div class="ag-list">${OT.resas.slice(0, nouv.length ? Math.max(nouv.length, 3) : 3).map(r => `
      <div class="crm-row" onclick="otOpenResa(${r.id})"><div class="crm-av">${agEsc(String(r.nom || '?').slice(0, 2).toUpperCase())}</div>
        <div class="d"><b>${agEsc(r.nom)}</b><span>${agEsc(r.formule || 'Séance')}${r.code ? ' · code ' + agEsc(r.code) : ''} · ${agEsc(r.date_souhaitee ? otFmtDate(r.date_souhaitee) : 'date à fixer')}</span></div>
        <div class="m">${agF(Number(r.prix_estime) - Number(r.remise))}<span class="crm-st ${r.status === 'nouvelle' ? 'st-Actif' : ''}">${{ nouvelle: 'Nouvelle', acceptee: 'Acceptée', refusee: 'Refusée' }[r.status] || r.status}</span></div></div>`).join('')}</div>`;
}
function otFmtDate(s){ const d = new Date(s); return isNaN(d) ? s : d.toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
function otOpenResa(id){
  const r = OT.resas.find(x => x.id === id); if(!r) return;
  const total = Number(r.prix_estime) - Number(r.remise);
  agSheet('otResa', `
    <h3>Réservation de ${agEsc(r.nom)}</h3>
    <div class="crm-info">
      <div><span>Téléphone</span><b>${agEsc(r.telephone)}</b></div>
      <div><span>Formule</span><b>${agEsc(r.formule || 'Non choisie')}</b></div>
      ${(r.options || []).length ? `<div><span>Options</span><b>${r.options.map(o => agEsc(o.name + (o.qty > 1 ? ' x' + o.qty : ''))).join(', ')}</b></div>` : ''}
      <div><span>Date souhaitée</span><b>${agEsc(r.date_souhaitee ? otFmtDate(r.date_souhaitee) : 'À fixer')}</b></div>
      <div><span>Prix</span><b>${agF(r.prix_estime)}</b></div>
      ${r.code ? `<div><span>Code ${agEsc(r.code)}</span><b>-${agF(r.remise)}</b></div>` : ''}
      <div><span>À payer</span><b>${agF(total)}</b></div>
      ${r.message ? `<div><span>Message</span><b>${agEsc(r.message)}</b></div>` : ''}
    </div>
    ${r.status === 'nouvelle' ? `
      <label>Date et heure de la séance</label><input id="otResaDate" type="datetime-local" value="${agEsc(otIsoLocal(r.date_souhaitee))}">
      <label>Prix final (FCFA)</label><input id="otResaPrix" type="number" value="${total}">
      <button class="btn-primary" style="margin-top:12px" onclick="otAcceptResa(${r.id})">Accepter et créer la séance</button>
      <div class="crm-2" style="margin-top:8px"><button class="btn-secondary" onclick="crmWaRaw('${agEsc(crmPhone(r.telephone))}','')">WhatsApp</button><button class="btn-danger" style="padding:12px" onclick="otResaStatus(${r.id},'refusee')">Refuser</button></div>`
    : `<div class="ag-hint">Cette demande est ${r.status === 'acceptee' ? 'acceptée' : 'refusée'}.</div>
       <div class="crm-2" style="margin-top:8px"><button class="btn-secondary" onclick="crmWaRaw('${agEsc(crmPhone(r.telephone))}','')">WhatsApp</button><button class="btn-danger" style="padding:12px" onclick="otResaDelete(${r.id})">Supprimer</button></div>`}`);
}
function otIsoLocal(s){ const d = new Date(s); if(isNaN(d)) return ''; d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }
function crmWaRaw(tel, text){ window.open(`https://wa.me/${tel}${text ? '?text=' + encodeURIComponent(text) : ''}`, '_blank'); }
async function otAcceptResa(id){
  const r = OT.resas.find(x => x.id === id); if(!r) return;
  const date = document.getElementById('otResaDate').value;
  const price = parseFloat(document.getElementById('otResaPrix').value) || 0;
  if(!date){ alert('Choisis la date de la séance'); return; }
  const digits = String(r.telephone || '').replace(/\D/g, '').slice(-8);
  let c = (clients || []).find(x => digits && String(x.phone || '').replace(/\D/g, '').slice(-8) === digits);
  if(!c){ c = await dbInsert('clients', { name: r.nom, phone: r.telephone, categories: [] }); if(!c) return; clients.unshift(c); }
  const notes = ['Réservation en ligne', r.formule ? 'Formule : ' + r.formule : '', (r.options || []).length ? 'Options : ' + r.options.map(o => o.name + (o.qty > 1 ? ' x' + o.qty : '')).join(', ') : '',
    r.code ? `Code ${r.code} : -${agN(r.remise)} F (prix normal ${agN(r.prix_estime)} F)` : '', r.message ? 'Message : ' + r.message : ''].filter(Boolean).join('\n');
  const s = await dbInsert('shoots', { client_id: c.id, type: r.formule || 'Séance', date, price, payment: 'impaye', notes, status: 'planifie', status_updated_at: new Date().toISOString(), shoot_expenses: [] });
  if(!s) return;
  shoots.unshift(s);
  if(r.code) await otPromoUse(r.code, c.id, s.id);
  await sb.from('reservations').update({ status: 'acceptee', shoot_id: s.id }).eq('id', id);
  r.status = 'acceptee'; r.shoot_id = s.id;
  agCloseSheet('otResa'); refreshAll(); if(typeof crmRender === 'function') crmRender();
  const msg = `Bonjour ${String(r.nom).split(' ')[0]}, c'est Henzo Studio. Votre séance est confirmée pour le ${new Date(date).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}.${r.code ? `\nVotre code ${r.code} est appliqué : ${agN(price)} F au lieu de ${agN(r.prix_estime)} F.` : `\nMontant : ${agN(price)} F.`}\nÀ très vite au studio, Ahougnansou en face du Restaurant Le Rosier.\nHenzo Studio`;
  if(confirm('Séance créée. Envoyer la confirmation au client sur WhatsApp ?')) crmWaRaw(crmPhone(r.telephone), msg);
}
async function otResaStatus(id, status){
  await sb.from('reservations').update({ status }).eq('id', id);
  const r = OT.resas.find(x => x.id === id); if(r) r.status = status;
  agCloseSheet('otResa'); if(typeof crmRender === 'function') crmRender();
}
async function otResaDelete(id){
  if(!confirm('Supprimer cette demande ?')) return;
  await sb.from('reservations').delete().eq('id', id);
  OT.resas = OT.resas.filter(x => x.id !== id); agCloseSheet('otResa'); if(typeof crmRender === 'function') crmRender();
}
async function otPromoUse(code, clientId, shootId){
  if(typeof CRM === 'undefined') return;
  const p = CRM.promos.find(x => String(x.code).toUpperCase() === String(code).toUpperCase()); if(!p) return;
  const uses = (p.uses || []).concat([{ client_id: clientId, shoot_id: shootId, date: new Date().toISOString() }]);
  const { error } = await sb.from('promos').update({ uses }).eq('id', p.id);
  if(!error) p.uses = uses;
}

// Code promo dans la fenetre "Nouvelle seance"
function otShootPromoUi(){
  const price = document.getElementById('shootPrice');
  if(!price || document.getElementById('otShootPromo')) return;
  const box = document.createElement('div'); box.id = 'otShootPromo'; box.className = 'ot-shoot-promo';
  box.innerHTML = `<label>Code promo (facultatif)</label>
    <div class="crm-row-in"><input id="otSpCode" placeholder="Ex : HENZO-TREU" style="text-transform:uppercase" autocomplete="off"><button type="button" class="btn-secondary" onclick="otApplyShootPromo()">Appliquer</button></div>
    <div id="otSpRes" class="ag-hint"></div>`;
  price.insertAdjacentElement('afterend', box);
}
function otApplyShootPromo(){
  const code = document.getElementById('otSpCode').value.trim().toUpperCase();
  const res = document.getElementById('otSpRes'), price = document.getElementById('shootPrice');
  const p = (typeof CRM !== 'undefined' ? CRM.promos : []).find(x => String(x.code).toUpperCase() === code);
  if(!p){ res.textContent = 'Code inconnu.'; OT.shootPromo = null; return; }
  if(crmPromoState(p) !== 'Actif'){ res.textContent = 'Ce code est ' + crmPromoState(p).toLowerCase() + '.'; OT.shootPromo = null; return; }
  const base = OT.shootPromo && OT.shootPromo.base != null ? OT.shootPromo.base : (parseFloat(price.value) || 0);
  if(!base){ res.textContent = "Mets d'abord le prix normal de la séance."; return; }
  const remise = Math.min(base, p.kind === 'amount' ? Number(p.value) : Math.round(base * Number(p.value) / 100));
  price.value = base - remise;
  if(typeof calculerNetShoot === 'function') try { calculerNetShoot(); } catch(e){}
  OT.shootPromo = { code: p.code, base, remise };
  res.innerHTML = `<b>${agEsc(p.code)}</b> appliqué : ${agF(base)} - ${agF(remise)} = <b>${agF(base - remise)}</b>`;
}
if(typeof openShootModal === 'function'){
  const _o = openShootModal;
  openShootModal = function(){
    const r = _o.apply(this, arguments);
    OT.shootPromo = null; otShootPromoUi();
    const c = document.getElementById('otSpCode'); if(c) c.value = '';
    const s = document.getElementById('otSpRes'); if(s) s.textContent = '';
    return r;
  };
}
if(typeof saveShoot === 'function'){
  const _o = saveShoot;
  saveShoot = async function(){
    const promo = OT.shootPromo, editId = typeof editingShootId !== 'undefined' ? editingShootId : null;
    const before = shoots.length;
    if(promo){
      const n = document.getElementById('shootNotes');
      if(n && !n.value.includes(promo.code)) n.value = (n.value ? n.value + '\n' : '') + `Code ${promo.code} : -${agN(promo.remise)} F (prix normal ${agN(promo.base)} F)`;
    }
    const r = await _o.apply(this, arguments);
    if(promo){
      const s = editId ? shoots.find(x => x.id === editId) : (shoots.length > before ? shoots[0] : null);
      if(s) await otPromoUse(promo.code, s.client_id, s.id);
      OT.shootPromo = null;
    }
    return r;
  };
}

// ============================================================
// DEMARRAGE
// ============================================================
const _otShowTab = showTab;
showTab = function(name, btn){
  _otShowTab(name, btn);
  otSelBar(); otCofBar();
  if(name !== 'coffres' && OT.cofSel){ OT.cofSel = false; OT.cofIds.clear(); }
  setTimeout(otTopButtons, 50);
};
(async function otInit(){
  await otLoadResas();
  let n = 0; const iv = setInterval(() => { otAddMenus(); otTopButtons(); if(++n > 20) clearInterval(iv); }, 500);
  if(otActivePage() === 'clients' && typeof crmRender === 'function') crmRender();
})();
