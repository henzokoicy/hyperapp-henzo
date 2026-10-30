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
    ${t.type !== 'transfert' && accs.length ? `<label>Compte</label><select id="otAcc">${accs.map(a => `<option value="${a.id}" ${a.id === t.account_id ? 'selected' : ''}>${agEsc(a.name)}</option>`).join('')}</select>` : ''}
    <label>Note</label><input id="otNote" value="${agEsc(t.note || '')}">
    <label>Date</label><input id="otDate" type="date" value="${agEsc(String(t.date || '').slice(0, 10))}">
    <div class="ag-hint">Si tu changes le montant d'un mouvement lié à un coffre, le coffre est corrigé automatiquement.</div>
    <button class="btn-primary" onclick="otSaveTx(${id})">${OT.txQueue.length ? 'Enregistrer et suivante' : 'Enregistrer'}</button>
    ${OT.txQueue.length ? `<button class="btn-secondary" style="margin-top:8px" onclick="otEditNext()">Passer celle-ci</button>` : ''}`);
}
async function otSaveTx(id){
  const g = k => document.getElementById(k);
  const amt = parseFloat(g('otAmt').value);
  if(g('otAmt').value.trim() === '' || isNaN(amt) || amt < 0){ agAlert('Tape un montant valide (0 ou plus).'); return; }
  const data = { amount: amt, note: g('otNote').value.trim() || null };
  if(g('otDate').value) data.date = g('otDate').value;
  if(g('otCat')) data.category = g('otCat').value.trim() || null;
  if(g('otAcc') && g('otAcc').value) data.account_id = Number(g('otAcc').value);
  const r = await dbUpdate('transactions', id, data);
  if(!r) return;
  const i = txs.findIndex(x => x.id === id); if(i >= 0) txs[i] = r;
  refreshAll(); if(typeof renderHistory === 'function') renderHistory();
  if(OT.txQueue.length) otEditNext(); else { agCloseSheet('otTxEdit'); agToast('Enregistré'); }
}
async function otBulkCancel(cancel){
  const list = txs.filter(t => selectedTxIds.has(t.id) && !!t.cancelled !== cancel);
  if(!list.length) return;
  if(!await agConfirm(cancel ? `Annuler ${list.length} mouvement(s) ?\nIls restent visibles (barrés) et l'argent revient à sa place.` : `Restaurer ${list.length} mouvement(s) ?`)) return;
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
  if(!await agConfirm(`Supprimer définitivement ${ids.length} mouvement(s) ?\nL'argent revient à sa place (comptes et coffres).`)) return;
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
  if(!await agConfirm(`Remettre ${list.length} coffre(s) à 0 F ?\n${agF(tot)} disparaîtront de tes coffres (sans aller sur un compte).\n\nPour déplacer l'argent vers un compte, utilise plutôt "Retirer".`)) return;
  for(const c of list){ const r = await dbUpdate('goals', c.id, { current: 0 }); if(r) Object.assign(c, r); }
  refreshAll(); agToast('Coffres remis à 0');
}
async function otCofDelete(){
  const list = coffres.filter(c => OT.cofIds.has(c.id));
  if(!await agConfirm(`Supprimer ${list.length} coffre(s) ?\nLes mouvements déjà enregistrés restent dans l'historique.`)) return;
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
    // Moodboards : on recharge aussi (sinon des tableaux effaces restent affiches)
    if(typeof mbLoad === 'function' && typeof MB !== 'undefined' && MB.loaded) { try { await mbLoad(); } catch(e){} }
    refreshAll();
    const p = otActivePage();
    if(p === 'mood' && typeof mbRender === 'function') { try { await mbRender(); } catch(e){} }
    if(p === 'clients' && typeof crmRender === 'function') crmRender();
    if(p === 'tarifs' && typeof crmRenderTarifs === 'function') crmRenderTarifs();
    if(p === 'historique' && typeof renderHistory === 'function') renderHistory();
    window.scrollTo(0, y);
    OT.lastRefresh = Date.now();
  } catch(e){ console.warn('maj auto', e); }
  OT.busy = false;
}
// Nouvelle version du site publiee ? On recharge tout seul.
const OT_FILES = ['index.html', 'config.js', 'app.js', 'modules.js', 'ia.js', 'coach.js', 'argent.js', 'crm.js', 'prix.js', 'outils.js', 'mood.js', 'galerie.js', 'extras.js', 'coach2.js', 'marketing.js', 'suivi.js', 'budget.js', 'voix.js', 'equipe.js', 'patron.js', 'studio.js', 'messages.js', 'frais.js', 'creations.js', 'animations.js', 'montage.js', 'styles-montage.js', 'video-plus.js', 'crea-brouillons.js', 'mp4-muxer.esm.js', 'gifenc.esm.js', 'theme.css'];
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
  { k: 'transactions', n: 'Transactions (argent)', t: ['transactions', 'manquants'], d: 'Entrées, dépenses, transferts, manquants (Mode patron)' },
  { k: 'comptes', n: 'Comptes', t: ['accounts'], d: 'Wave, espèces, banque...' },
  { k: 'coffres', n: 'Coffres et objectifs', t: ['goal_reminders', 'goals'], d: 'Avec leurs rappels' },
  { k: 'seances', n: 'Séances', t: ['shoots'] },
  { k: 'clients', n: 'Clients', t: ['client_suivi', 'client_messages', 'messages_programmes', 'reservations', 'equipe_evals', 'clients'], d: 'Avec suivi (impressions, dettes), messages envoyés et programmés, réservations et évaluations de l\'équipe' },
  { k: 'equipe', n: 'Équipe', t: ['equipe_bonus', 'equipe_defis_suivi', 'equipe_defis', 'equipe_taches'], d: 'Tâches, défis du mois et bonus de promotion de ton équipe' },
  { k: 'liens', n: 'Liens de paiement', t: ['payment_links'] },
  { k: 'notes', n: 'Notes et rappels', t: ['notes', 'reminders'] },
  { k: 'idees', n: 'Idées et inspirations', t: ['saved_ideas', 'inspirations'] },
  { k: 'promos', n: 'Promos et bons', t: ['promos'] },
  { k: 'tarifs', n: 'Tarifs, devis, page de tarifs', t: ['devis', 'tarifs', 'tarif_collections', 'tarif_page'] },
  { k: 'mood', n: 'Moodboards', t: ['mood_feedback', 'mood_images', 'mood_boards'], d: 'Tableaux, images et choix des clients' },
  { k: 'materiel', n: 'Matériel', t: ['materiel'], d: 'Ton matériel et son usure' },
  { k: 'creations', n: 'Créations', t: ['creations'], d: 'Tes styles de visuels gardés et tes dernières créations' },
  { k: 'budgets', n: 'Budgets et charges fixes', t: ['charges_paiements', 'charges_fixes', 'budgets'], d: 'Calculs de budget, charges fixes et leurs paiements' },
  { k: 'coach', n: 'Coach', t: ['ecole_progres', 'negociations', 'coach_journal', 'coach_plans'], d: 'Plans d\'action, journal, négociations, école de la vente' },
  { k: 'reglages', n: 'Réglages', t: ['user_settings'], d: 'Notifications, préférences, thème, messages' }
];
const OT_ORDER = ['accounts', 'goals', 'goal_reminders', 'clients', 'shoots', 'client_suivi', 'transactions', 'manquants', 'budgets', 'charges_fixes', 'charges_paiements', 'payment_links', 'notes', 'reminders', 'saved_ideas', 'inspirations', 'client_messages', 'promos', 'tarifs', 'tarif_collections', 'devis', 'tarif_page', 'reservations', 'equipe_evals', 'messages_programmes', 'equipe_taches', 'equipe_defis', 'equipe_defis_suivi', 'equipe_bonus', 'coach_plans', 'coach_journal', 'negociations', 'ecole_progres', 'mood_boards', 'mood_images', 'mood_feedback', 'materiel', 'creations', 'user_settings'];

// La cle IA et le mot de passe galerie ne partent jamais dans une sauvegarde
const OT_SECRETS = ['ai_config', 'galerie_admin_pwd'];
function otNoSecrets(r){
  const o = { ...r };
  OT_SECRETS.forEach(k => { delete o[k]; });
  if(o.user_preferences && typeof o.user_preferences === 'object'){
    const p = { ...o.user_preferences }; delete p.aiConfig; delete p.ai_config; delete p.galerie_admin_pwd; o.user_preferences = p;
  }
  return o;
}
async function otSnapshot(){
  const uid = await otUid(); if(!uid) throw new Error('Non connecté');
  const tables = {};
  for(const t of OT_ORDER){
    // Par paquets de 1000 (la base n'en renvoie jamais plus d'un coup)
    let data = [], error = null;
    for(let from = 0; ; from += 1000){
      const r = await sb.from(t).select('*').eq('user_id', uid).range(from, from + 999);
      if(r.error){ error = r.error; break; }
      data = data.concat(r.data || []);
      if(!r.data || r.data.length < 1000) break;
    }
    if(error){ console.warn('Sauvegarde : ' + t + ' ignorée (' + error.message + ')'); continue; }
    tables[t] = t === 'user_settings' ? data.map(otNoSecrets) : data;
  }
  return { app: 'henzo-super-app', version: 1, date: new Date().toISOString(), tables };
}
function otResume(tables){
  const n = t => (tables && tables[t] ? (Array.isArray(tables[t]) ? tables[t].length : Number(tables[t]) || 0) : 0);
  const parts = [[n('shoots'), 'séance'], [n('transactions'), 'mouvement'], [n('clients'), 'client'], [n('goals'), 'coffre']]
    .filter(x => x[0]).map(([v, l]) => v + ' ' + l + (v > 1 ? 's' : ''));
  return parts.join(' · ') || 'vide';
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
  if(snap && snap.tables && snap.tables.user_settings) snap = { ...snap, tables: { ...snap.tables, user_settings: snap.tables.user_settings.map(otNoSecrets) } };
  const blob = new Blob([JSON.stringify(snap, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'henzo-sauvegarde-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}

async function otOpenData(){
  agSheet('otData', `<h3>Mes données</h3><div class="ag-empty">Chargement...</div>`);
  // On lit juste le nombre d'elements de chaque sauvegarde (pas tout le contenu)
  let { data, error } = await sb.from('app_backups').select('id,label,size,created_at,shoots:data->tables->shoots,transactions:data->tables->transactions,clients:data->tables->clients,goals:data->tables->goals').order('created_at', { ascending: false }).limit(30);
  if(error){ ({ data } = await sb.from('app_backups').select('id,label,size,created_at').order('created_at', { ascending: false }).limit(30)); }
  const list = data || [];
  OT.lastBackupAt = list[0] ? list[0].created_at : null;
  agSheet('otData', `
    <h3>Mes données</h3>
    <div class="ag-hint" style="margin-top:0">Une sauvegarde contient TOUT ton panel : argent, comptes, coffres, séances, clients, notes, promos, tarifs, moodboards et réglages (sauf ta clé IA et ton mot de passe galerie).</div>
    <h4 class="crm-h4">Sauvegarder maintenant</h4>
    <div class="crm-2"><button class="btn-primary" onclick="otBackupNow(false)">Garder en ligne</button><button class="btn-secondary" onclick="otBackupNow(true)">+ fichier sur mon téléphone</button></div>
    <div class="ag-hint"><b>En ligne</b> = rangée dans ton compte de l'app (sur internet), pas sur ton téléphone. Tu la retrouves dans la liste juste en dessous, même si tu changes de téléphone.<br><b>Fichier</b> = en plus, un fichier .json va dans les Téléchargements de ton téléphone ou de ton ordinateur.<br>L'app fait aussi une sauvegarde en ligne automatique chaque jour, et avant chaque remise à zéro ou restauration.</div>
    <h4 class="crm-h4">Restaurer depuis un fichier</h4>
    <button class="btn-secondary" onclick="document.getElementById('otImpFile').click()">Choisir un fichier de sauvegarde (.json)</button>
    <input type="file" id="otImpFile" accept=".json,application/json" style="display:none" onchange="otImportFile(this.files[0])">
    <h4 class="crm-h4">Mes sauvegardes en ligne (la plus récente en haut)</h4>
    <div class="ag-list">${list.length ? list.map((b, i) => `<div class="crm-line"><div><b>${i === 0 ? '🟢 ' : ''}${agEsc(b.label || 'Sauvegarde')}</b><span>${new Date(b.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · ${otResume(b)}</span></div>
      <div style="display:flex;gap:6px"><button class="ag-ibtn" title="Télécharger" onclick="otCloudDownload(${b.id})">${agIcon('download', 15)}</button><button class="btn-secondary" style="width:auto;padding:8px 12px" onclick="otCloudRestore(${b.id})">Restaurer</button></div></div>`).join('') : '<div class="ag-empty">Aucune sauvegarde en ligne pour le moment.</div>'}</div>
    <h4 class="crm-h4">Remise à zéro</h4>
    <button class="btn-secondary" onclick="otResetMoney()">Remettre l'argent à zéro</button>
    <button class="btn-danger" style="width:100%;padding:12px;margin-top:8px" onclick="otResetApp()">Réinitialiser l'app (au choix)</button>
    <div class="ag-hint">La galerie clients (photos) n'est jamais touchée par ces boutons.</div>`);
}
async function otBackupNow(download){
  try {
    agToast('Sauvegarde en cours...');
    const snap = await otCloudSave(download ? 'Sauvegarde (+ fichier)' : 'Sauvegarde manuelle');
    if(download) otDownload(snap);
    agToast(`Sauvegardé en ligne${download ? ' + fichier téléchargé' : ''} : ${otResume(snap.tables)}`);
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
  const plusRecente = OT.lastBackupAt && snap.date && (new Date(OT.lastBackupAt) - new Date(snap.date) > 60000);
  agSheet('otImp', `
    <h3>Restaurer</h3>
    <div class="ag-hint" style="margin-top:0">${agEsc(label)}${snap.date ? ' · faite le <b>' + new Date(snap.date).toLocaleString('fr-FR') + '</b>' : ''}<br>Contenu : ${otResume(snap.tables)}</div>
    ${plusRecente ? `<div class="ag-hint" style="color:var(--yellow);border:1px solid var(--yellow);border-radius:10px;padding:10px">⚠️ Cette sauvegarde est plus ANCIENNE que ta dernière sauvegarde en ligne (${new Date(OT.lastBackupAt).toLocaleString('fr-FR')}). Tout ce que tu as fait après le ${new Date(snap.date).toLocaleString('fr-FR')} ne sera pas dedans. Vérifie que c'est bien celle que tu veux.</div>` : ''}
    <div class="ag-list">${rows.map(x => `<label class="crm-pick"><input type="checkbox" value="${x.g.k}" checked><div><b>${agEsc(x.g.n)}</b><span>${x.n} élément${x.n > 1 ? 's' : ''}</span></div></label>`).join('') || '<div class="ag-empty">Sauvegarde vide</div>'}</div>
    <label>Comment ?</label>
    <div class="ag-pills" id="otImpMode"><button class="on" data-m="replace" onclick="agPick(this)">Remplacer</button><button data-m="merge" onclick="agPick(this)">Ajouter / mettre à jour</button></div>
    <div class="ag-hint">Remplacer : ce qui est coché redevient exactement comme dans la sauvegarde (les clients ne sont jamais effacés, seulement ajoutés ou mis à jour). Ajouter : rien n'est effacé, les éléments de la sauvegarde sont ajoutés ou remis.</div>
    <button class="btn-primary" id="otImpBtn" onclick="otImportRun()">Restaurer maintenant</button>`);
}
async function otImportRun(){
  const snap = OT.importSnap; if(!snap) return;
  if(OT.importBusy || !document.getElementById('otImp')) return;
  const keys = [...document.querySelectorAll('#otImp input:checked')].map(i => i.value);
  const mode = document.querySelector('#otImpMode button.on').dataset.m;
  if(!keys.length){ alert('Coche au moins une partie'); return; }
  if(!await agConfirm(mode === 'replace' ? 'Remplacer ces données par celles de la sauvegarde ?\nUne sauvegarde de ton état actuel sera faite avant.' : 'Ajouter les données de la sauvegarde ?')) return;
  if(OT.importBusy) return;
  OT.importBusy = true;
  const btn = document.getElementById('otImpBtn');
  if(btn){ btn.disabled = true; btn.textContent = 'Restauration en cours, patiente...'; }
  const tables = OT_GROUPS.filter(g => keys.includes(g.k)).flatMap(g => g.t);
  try {
    agToast('Sauvegarde de sécurité...');
    await otCloudSave('Automatique avant restauration');
    const uid = await otUid();
    // 1. On remet d'abord tout ce qui est dans la sauvegarde (rien n'est vidé avant :
    //    si quelque chose plante en route, aucune donnée n'est perdue)
    for(const t of OT_ORDER.filter(x => tables.includes(x))){
      let rows = (snap.tables[t] || []).map(r => ({ ...(t === 'user_settings' ? otNoSecrets(r) : r), user_id: uid }));
      if(t === 'user_settings'){
        // On garde la cle IA et le mot de passe galerie de maintenant
        const { data: cur } = await sb.from('user_settings').select('*').eq('user_id', uid).maybeSingle();
        rows = rows.slice(0, 1).map(r => {
          const o = { ...r }; delete o.id;
          if(cur && cur.user_preferences && typeof cur.user_preferences === 'object' && o.user_preferences && typeof o.user_preferences === 'object'){
            const keep = {}; ['aiConfig', 'ai_config', 'galerie_admin_pwd'].forEach(k => { if(k in cur.user_preferences) keep[k] = cur.user_preferences[k]; });
            o.user_preferences = { ...o.user_preferences, ...keep };
          }
          return o;
        });
      }
      for(let i = 0; i < rows.length; i += 200){
        const part = rows.slice(i, i + 200);
        const conflict = (t === 'tarif_page' || t === 'user_settings') ? 'user_id' : 'id';
        const { error } = await sb.from(t).upsert(part, { onConflict: conflict });
        if(error) throw new Error(t + ' : ' + error.message);
      }
    }
    // 2. Mode Remplacer : on enleve seulement ce qui n'existait pas dans la sauvegarde
    //    (les plus "dependants" d'abord). Les clients ne sont jamais effaces.
    if(mode === 'replace'){
      const order = ['manquants', 'equipe_bonus', 'equipe_defis_suivi', 'equipe_defis', 'equipe_taches', 'messages_programmes', 'equipe_evals', 'charges_paiements', 'ecole_progres', 'negociations', 'coach_journal', 'coach_plans', 'transactions', 'client_suivi', 'client_messages', 'reservations', 'devis', 'shoots', 'goal_reminders', 'payment_links', 'notes', 'reminders', 'saved_ideas', 'inspirations', 'promos', 'tarifs', 'tarif_collections', 'mood_feedback', 'mood_images', 'mood_boards', 'materiel', 'creations', 'charges_fixes', 'budgets', 'goals', 'accounts'];
      for(const t of order.filter(x => tables.includes(x))){
        const ids = (snap.tables[t] || []).map(r => r.id).filter(v => v != null);
        let q = sb.from(t).delete().eq('user_id', uid);
        if(ids.length) q = q.not('id', 'in', '(' + ids.join(',') + ')');
        const { error } = await q;
        if(error) throw new Error(t + ' : ' + error.message);
      }
    }
    try { await sb.rpc('app_fix_sequences'); } catch(e){}
    agCloseSheet('otImp'); agCloseSheet('otData');
    await otRefresh(true);
    agToast('Restauration terminée : ' + otResume(snap.tables));
  } catch(e){
    alert('Erreur pendant la restauration : ' + e.message + "\nTon état d'avant est dans tes sauvegardes en ligne (\"Automatique avant restauration\").");
  } finally {
    OT.importBusy = false;
    const b = document.getElementById('otImpBtn');
    if(b){ b.disabled = false; b.textContent = 'Restaurer maintenant'; }
  }
}

// Sauvegarde en ligne automatique, une fois par jour (a l'ouverture de l'app)
async function otAutoBackup(){
  try {
    const uid = await otUid(); if(!uid) return;
    const { data } = await sb.from('app_backups').select('created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(1);
    const last = data && data[0] ? new Date(data[0].created_at) : null;
    if(last && Date.now() - last.getTime() < 24 * 3600 * 1000) return;
    await otCloudSave('Automatique du jour');
  } catch(e){ console.warn('Sauvegarde auto :', e.message || e); }
}
setTimeout(otAutoBackup, 20000);

async function otWipe(tables, uid){
  const order = ['manquants', 'equipe_bonus', 'equipe_defis_suivi', 'equipe_defis', 'equipe_taches', 'messages_programmes', 'equipe_evals', 'charges_paiements', 'ecole_progres', 'negociations', 'coach_journal', 'coach_plans', 'transactions', 'client_suivi', 'client_messages', 'reservations', 'devis', 'shoots', 'goal_reminders', 'payment_links', 'notes', 'reminders', 'saved_ideas', 'inspirations', 'promos', 'tarifs', 'tarif_collections', 'tarif_page', 'mood_feedback', 'mood_images', 'mood_boards', 'materiel', 'creations', 'charges_fixes', 'budgets', 'clients', 'goals', 'accounts'];
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
      <label class="crm-pick"><input type="checkbox" id="otRzCof" checked><div><b>Mettre tous les coffres à 0 F</b><span>Les coffres d'argent restent, vides (les objectifs et les séances ne changent pas)</span></div></label>
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
    if(doCof){
      // Seulement les vrais coffres d'argent : les objectifs (quantite, sans argent) gardent leur progression
      for(const c of coffres.filter(agIsCoffre)){
        const { error } = await sb.from('goals').update({ current: 0 }).eq('id', c.id);
        if(error) throw error;
      }
    }
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
  } catch(e){ alert('Erreur : ' + (e.message || e) + "\nTes données d'avant sont dans tes sauvegardes en ligne."); }
}
// Bouton "Mes donnees" dans les menus
function otAddMenus(){
  const side = document.querySelector('#agSide .ag-side-foot');
  if(side && !side.querySelector('.ot-data-btn')){
    const b = document.createElement('button'); b.className = 'ag-side-it ot-data-btn';
    b.innerHTML = `<span class="si">${agIcon('shield', 18)}</span><span class="sl">Mes données</span>`;
    b.onclick = otOpenData; side.insertBefore(b, side.firstChild);
  }
  if(side && !side.querySelector('.ot-nt-btn')){
    const b = document.createElement('button'); b.className = 'ag-side-it ot-nt-btn';
    b.innerHTML = `<span class="si">${OT_BELL}</span><span class="sl">Notifications</span>`;
    b.onclick = () => otNotifs(); side.insertBefore(b, side.firstChild);
  }
  const um0 = document.querySelector('.user-menu-items');
  if(um0 && !um0.querySelector('.ot-nt-btn')){
    const b = document.createElement('button'); b.className = 'ot-nt-btn';
    b.innerHTML = `<span class="icon">${OT_BELL}</span><span>Notifications</span>`;
    b.onclick = () => { if(typeof closeUserMenu === 'function') closeUserMenu(); otNotifs(); };
    um0.insertBefore(b, um0.firstChild);
  }
  const th0 = document.querySelector('.drawer-nav.ag-theme-btn');
  if(th0 && !document.querySelector('.drawer-nav.ot-nt-btn')){
    const b = document.createElement('button'); b.className = 'drawer-nav ot-nt-btn';
    b.innerHTML = `<span class="nav-icon">${OT_BELL}</span><span>Notifications</span>`;
    b.onclick = () => { if(typeof closeDrawer === 'function') closeDrawer(); otNotifs(); };
    th0.parentElement.insertBefore(b, th0.nextSibling);
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
// La page de tarifs publique existe-t-elle ? (sinon, pas de lien a envoyer)
function otHasPage(){ return !!(typeof PX !== 'undefined' && PX.page && PX.page.slug); }
function otResaLink(code){
  if(!otHasPage()) return '';
  return `${location.origin}/reserver.html?s=${encodeURIComponent(PX.page.slug)}${code ? '&code=' + encodeURIComponent(code) : ''}`;
}
// Ouvre Tarifs > Partager pour creer la page
function otOpenPartage(){
  document.querySelectorAll('.ag-sheet-bg, .ag-sheet').forEach(el => { if(el.id) agCloseSheet(el.id); });
  if(typeof PX !== 'undefined') PX.view = 'partage';
  if(typeof showTab === 'function') showTab('tarifs');
  if(typeof crmRenderTarifs === 'function') crmRenderTarifs();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function otNoPageHtml(txt){
  return `<div class="crm-fete ot-nopage" style="cursor:default"><div class="ic">${agIcon('link')}</div><div class="d"><b>Ta page de tarifs n'est pas encore créée</b><span>${agEsc(txt || "Sans elle, il n'y a pas de lien de réservation à envoyer. Les messages partent sans lien.")}</span></div></div>
    <button class="btn-secondary" style="margin-top:6px" onclick="otOpenPartage()">Créer ma page</button>`;
}
function otResaHtml(){
  const nouv = OT.resas.filter(r => r.status === 'nouvelle');
  if(!OT.resas.length) return '';
  return `<div class="ag-sec"><h3>Demandes de réservation</h3>${nouv.length ? `<span class="crm-count ot-new">${nouv.length} nouvelle${nouv.length > 1 ? 's' : ''}</span>` : ''}</div>
    <div class="ag-list">${OT.resas.slice(0, nouv.length ? Math.max(nouv.length, 3) : 3).map(r => `
      <div class="crm-row" onclick="otOpenResa(${r.id})"><div class="crm-av">${agEsc(String(r.nom || '?').slice(0, 2).toUpperCase())}</div>
        <div class="d"><b>${agEsc(r.nom)}</b><span>${agEsc(r.formule || 'Séance')}${r.code ? ' · code ' + agEsc(r.code) : ''} · ${agEsc(r.date_souhaitee ? otFmtDate(r.date_souhaitee) : 'date à fixer')}</span>${typeof svResaBadge === 'function' ? svResaBadge(r) : ''}</div>
        <div class="m">${agF(Number(r.prix_estime) - Number(r.remise))}<span class="crm-st ${r.status === 'nouvelle' ? 'st-Actif' : ''}">${{ nouvelle: 'Nouvelle', acceptee: 'Acceptée', refusee: 'Refusée' }[r.status] || r.status}</span></div></div>`).join('')}</div>`;
}
function otFmtDate(s){ const d = new Date(s); return isNaN(d) ? s : d.toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
function otOpenResa(id){
  const r = OT.resas.find(x => x.id === id); if(!r) return;
  const total = Number(r.prix_estime) - Number(r.remise);
  agSheet('otResa', `
    <h3>Réservation de ${agEsc(r.nom)}</h3>
    ${typeof svResaAlertHtml === 'function' ? svResaAlertHtml(r) : ''}
    <div class="crm-info">
      <div><span>Téléphone</span><b>${agEsc(r.telephone)}</b></div>
      <div><span>Formule</span><b>${agEsc(r.formule || 'Non choisie')}</b></div>
      ${(r.options || []).length ? `<div><span>Options</span><b>${r.options.map(o => agEsc(o.name + (o.qty > 1 ? ' x' + o.qty : ''))).join(', ')}</b></div>` : ''}
      <div><span>Date souhaitée</span><b>${agEsc(r.date_souhaitee ? otFmtDate(r.date_souhaitee) : 'À fixer')}</b></div>
      <div><span>Prix</span><b>${agF(r.prix_estime)}</b></div>
      ${r.code ? `<div><span>Code ${agEsc(r.code)}</span><b>-${agF(r.remise)}</b></div>` : ''}
      <div><span>À payer</span><b>${agF(total)}</b></div>
      ${r.message ? `<div><span>Message</span><b>${agEsc(r.message)}</b></div>` : ''}
      ${r.source ? `<div><span>Nous a connu par</span><b>${agEsc(typeof crmSrcLabel === 'function' ? crmSrcLabel(r.source) : r.source)}</b></div>` : ''}
      ${r.parrain_code ? `<div><span>Recommandé par</span><b>${agEsc(((clients || []).find(x => String(x.code_parrain || '').toUpperCase() === String(r.parrain_code).toUpperCase()) || {}).name || 'code ' + r.parrain_code)}</b></div>` : ''}
    </div>
    ${r.status === 'nouvelle' ? `
      <label>Date et heure de la séance</label><input id="otResaDate" type="datetime-local" value="${agEsc(otIsoLocal(r.date_souhaitee))}">
      <label>Prix final (FCFA)</label><input id="otResaPrix" type="number" value="${total}">
      <button class="btn-primary" style="margin-top:12px" onclick="otAcceptResa(${r.id})">Accepter et créer la séance</button>
      ${typeof coNegocier === 'function' ? `<button class="btn-secondary" style="margin-top:8px" onclick="otNegoResa(${r.id})">${agIcon('briefcase', 16)} Négocier le prix</button>` : ''}
      <div class="crm-2" style="margin-top:8px"><button class="btn-secondary" onclick="crmWaRaw('${agEsc(crmPhone(r.telephone))}','')">WhatsApp</button><button class="btn-danger" style="padding:12px" onclick="otResaStatus(${r.id},'refusee')">Refuser</button></div>
      ${typeof rdvMessage === 'function' ? `<button class="btn-secondary ot-rdv-btn" style="margin-top:8px;width:100%" onclick="otRdvResa(${r.id})">${agIcon('calendar', 16)} Comment réserver (envoyer le message)</button>` : ''}`
    : `<div class="ag-hint">Cette demande est ${r.status === 'acceptee' ? 'acceptée' : 'refusée'}.</div>
       <div class="crm-2" style="margin-top:8px"><button class="btn-secondary" onclick="crmWaRaw('${agEsc(crmPhone(r.telephone))}','')">WhatsApp</button><button class="btn-danger" style="padding:12px" onclick="otResaDelete(${r.id})">Supprimer</button></div>`}`);
}
// Ouvre la negociation du coach, preremplie avec la demande (coach2.js)
function otNegoResa(id){
  const r = OT.resas.find(x => x.id === id); if(!r || typeof coNegocier !== 'function') return;
  const c = typeof svClientDeResa === 'function' ? svClientDeResa(r) : null;
  const opts = (r.options || []).map(o => o.name + (o.qty > 1 ? ' x' + o.qty : '')).join(', ');
  const travail = [r.formule || 'Séance', opts ? 'options : ' + opts : '', r.date_souhaitee ? 'le ' + otFmtDate(r.date_souhaitee) : '', r.message ? 'message : ' + r.message : ''].filter(Boolean).join(', ');
  agCloseSheet('otResa');
  coNegocier({ reservation_id: r.id, client_id: c ? c.id : null, client_nom: c ? c.name : r.nom, travail, prix: Number(r.prix_estime) - Number(r.remise || 0) });
}
function otIsoLocal(s){ const d = new Date(s); if(isNaN(d)) return ''; d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }
// Envoie le message "Comment reserver" (patron.js) au client de la demande
function otRdvResa(id){
  const r = OT.resas.find(x => x.id === id); if(!r || typeof rdvMessage !== 'function') return;
  const tel = crmPhone(r.telephone);
  const txt = rdvMessage({ name: r.nom });
  if(!tel){ crmCopy(txt); return; }
  crmWaRaw(tel, txt);
}
function crmWaRaw(tel, text){ window.open(`https://wa.me/${tel}${text ? '?text=' + encodeURIComponent(text) : ''}`, '_blank'); }
async function otAcceptResa(id){
  const r = OT.resas.find(x => x.id === id); if(!r) return;
  const date = document.getElementById('otResaDate').value;
  const price = parseFloat(document.getElementById('otResaPrix').value) || 0;
  if(!date){ alert('Choisis la date de la séance'); return; }
  const digits = String(r.telephone || '').replace(/\D/g, '').slice(-8);
  let c = (clients || []).find(x => digits && String(x.phone || '').replace(/\D/g, '').slice(-8) === digits);
  // Parrain : le client dont le code perso = code de la reservation (jamais soi-meme)
  const parCode = String(r.parrain_code || '').trim().toUpperCase();
  const parrain = parCode ? (clients || []).find(x => String(x.code_parrain || '').toUpperCase() === parCode && (!c || x.id !== c.id)) : null;
  const srcResa = String(r.source || '').trim() || (parrain ? 'Recommandé par un client' : '');
  if(!c){
    c = await dbInsert('clients', { name: r.nom, phone: r.telephone, categories: [], source: srcResa || null, parrain_id: parrain ? parrain.id : null }); if(!c) return; clients.unshift(c);
  } else {
    // Sans ecraser ce qui est deja rempli
    const patch = {};
    if(!c.source && srcResa) patch.source = srcResa;
    if(c.parrain_id == null && parrain) patch.parrain_id = parrain.id;
    if(Object.keys(patch).length){ const u = await dbUpdate('clients', c.id, patch); if(u) Object.assign(c, u); else Object.assign(c, patch); }
  }
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
  if(await agConfirm('Séance créée. Envoyer la confirmation au client sur WhatsApp ?')) crmWaRaw(crmPhone(r.telephone), msg);
}
async function otResaStatus(id, status){
  await sb.from('reservations').update({ status }).eq('id', id);
  const r = OT.resas.find(x => x.id === id); if(r) r.status = status;
  agCloseSheet('otResa'); if(typeof crmRender === 'function') crmRender();
}
async function otResaDelete(id){
  if(!await agConfirm('Supprimer cette demande ?')) return;
  await sb.from('reservations').delete().eq('id', id);
  OT.resas = OT.resas.filter(x => x.id !== id); agCloseSheet('otResa'); if(typeof crmRender === 'function') crmRender();
}
async function otPromoUse(code, clientId, shootId){
  if(typeof CRM === 'undefined') return;
  const p = CRM.promos.find(x => String(x.code).toUpperCase() === String(code).toUpperCase()); if(!p) return;
  // Une seule utilisation comptée par séance (le lien séance <-> code est gardé dans promos.uses)
  if(shootId && (p.uses || []).some(u => u.shoot_id === shootId)) return;
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
  OT.shootPromo = { id: p.id, code: p.code, base, remise };
  res.innerHTML = `<b>${agEsc(p.code)}</b> appliqué : ${agF(base)} - ${agF(remise)} = <b>${agF(base - remise)}</b>`;
}
// Bon personnel (clients ciblés) : une seule fois, et seulement pour ce client. Henzo peut forcer.
function otPromoIsPersonal(p){ return !!(p && p.target && Array.isArray(p.target.ids) && p.target.ids.length); }
async function otShootPromoCheck(promo, editId){
  const p = (typeof CRM !== 'undefined' ? CRM.promos : []).find(x => x.id === promo.id || String(x.code).toUpperCase() === String(promo.code).toUpperCase());
  if(!p || !otPromoIsPersonal(p)) return true;
  const sel = document.getElementById('shootClient');
  const cid = sel && sel.value && sel.value !== '__new__' ? Number(sel.value) : null;
  const ids = p.target.ids.map(Number);
  const nomDe = id => (((clients || []).find(c => c.id === Number(id))) || {}).name || 'un autre client';
  const autres = (p.uses || []).filter(u => !editId || u.shoot_id !== editId);
  const pb = [];
  if(!cid || !ids.includes(cid)) pb.push(`Ce bon est réservé à ${ids.length === 1 ? nomDe(ids[0]) : ids.length + ' clients choisis'}${cid ? ', pas à ' + nomDe(cid) : ''}.`);
  const deja = autres.filter(u => ids.length === 1 || Number(u.client_id) === cid);
  if(deja.length) pb.push(`Il a déjà servi${deja[0].client_id ? ' pour ' + nomDe(deja[0].client_id) : ''}${deja[0].date ? ' le ' + new Date(deja[0].date).toLocaleDateString('fr-FR') : ''}. Un bon personnel ne sert qu'une fois.`);
  if(!pb.length) return true;
  return await agConfirm(`Code ${p.code} : attention\n${pb.join('\n')}\n\nL'utiliser quand même pour cette séance ?`, { ok: 'Utiliser quand même', no: 'Non, revenir' });
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
    if(promo && !await otShootPromoCheck(promo, editId)) return;
    if(promo){
      const n = document.getElementById('shootNotes');
      if(n && !n.value.includes(promo.code)) n.value = (n.value ? n.value + '\n' : '') + `Code ${promo.code} : -${agN(promo.remise)} F (prix normal ${agN(promo.base)} F)`;
    }
    const r = await _o.apply(this, arguments);
    // On compte l'utilisation seulement si la séance a vraiment été enregistrée
    if(promo && r && r.id){
      await otPromoUse(promo.code, r.client_id, r.id);
      OT.shootPromo = null;
    }
    return r;
  };
}

// ============================================================
// 7. GLISSER-DEPOSER DES PHOTOS (galerie et moodboard)
// ============================================================
function otDropTarget(){
  const p = otActivePage();
  if(p === 'galerie' && typeof galCurrent !== 'undefined' && galCurrent && galCurrent !== '__avis__' && typeof galUpload === 'function'){
    const g = (typeof galList !== 'undefined' ? galList : []).find(x => x.code === galCurrent);
    return { label: 'Galerie de ' + (g ? g.nomClient : galCurrent), run: files => galUpload(galCurrent, files) };
  }
  if(p === 'mood' && typeof MB !== 'undefined' && MB.cur && typeof mbUpload === 'function'){
    const b = mbBoard(MB.cur);
    return { label: 'Moodboard ' + (b ? b.title : ''), run: files => mbUpload(MB.cur, files) };
  }
  return null;
}
(function otDragDrop(){
  let depth = 0;
  const hasFiles = e => e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files');
  const overlay = () => {
    let o = document.getElementById('otDrop');
    if(!o){ o = document.createElement('div'); o.id = 'otDrop'; o.className = 'ot-drop'; document.body.appendChild(o); }
    return o;
  };
  const hide = () => { depth = 0; const o = document.getElementById('otDrop'); if(o) o.classList.remove('show'); };
  document.addEventListener('dragenter', e => {
    if(!hasFiles(e)) return;
    const t = otDropTarget(); if(!t) return;
    e.preventDefault(); depth++;
    const o = overlay();
    o.innerHTML = `<div class="ot-drop-in">${agIcon('download', 34)}<b>Dépose tes photos</b><span>${agEsc(t.label)}</span></div>`;
    o.classList.add('show');
  });
  document.addEventListener('dragover', e => { if(hasFiles(e) && otDropTarget()){ e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } });
  document.addEventListener('dragleave', e => { if(!hasFiles(e)) return; depth = Math.max(0, depth - 1); if(!depth) hide(); });
  document.addEventListener('drop', e => {
    if(!hasFiles(e)) return;
    const t = otDropTarget(); hide();
    if(!t) return;
    e.preventDefault();
    const files = [...e.dataTransfer.files].filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name));
    if(!files.length){ agToast('Dépose des photos (JPG, PNG...)'); return; }
    t.run(files);
  });
})();

// ============================================================
// 8. RAPPELS DE SEANCES (notifications envoyees par le serveur)
// ============================================================
const OT_BELL = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';
const OT_BELL_OFF = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.7 3A6 6 0 0 1 18 8a21 21 0 0 0 .6 5"/><path d="M17 17H3s3-2 3-9a4.7 4.7 0 0 1 .3-1.7"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="m2 2 20 20"/></svg>';
// Reglages des notifications (enregistres dans user_preferences.notifs, lus par le serveur)
const OT_NT_DEF = {
  seances: { on: true, regles: [{ t: 'jour', j: 2, h: '09:00' }, { t: 'jour', j: 1, h: '09:00' }, { t: 'jour', j: 1, h: '19:00' }, { t: 'jour', j: 0, h: '07:00' }, { t: 'avant', m: 120 }] },
  galerie: { on: true, mode: 'direct', heures: ['10:00', '20:00'] },
  mood: { on: true, ouverture: true },
  resa: { on: true },
  motivation: { on: true, heures: ['08:00', '13:00', '20:00'] },
  // Lus par le serveur : user_preferences.notifs.<cle> (garder ces noms)
  marketing: { on: true, heure: '18:00' },
  stats_posts: { on: true },
  bilan_semaine: { on: true, jour: 0, heure: '19:00' },
  bilan_mois: { on: true, heure: '09:00' },
  checklist: { on: true, heure: '20:00' },
  dettes: { on: true, jours: 7 },
  coach: { on: true, heure: '08:00' },
  charges: { on: true, jours: [7, 2] },
  coach_resultats: { on: true },
  // Espace equipe : tache faite par un membre, defi a valider, bonus a payer (envoye par le serveur)
  equipe: { on: true }
};
const OT_JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const OT_PRESETS = {
  leger: { n: 'Léger', regles: [{ t: 'jour', j: 1, h: '19:00' }, { t: 'avant', m: 120 }] },
  standard: { n: 'Standard', regles: OT_NT_DEF.seances.regles },
  intense: { n: 'Intense', regles: [{ t: 'quotidien', j: 3, h: '09:00' }, { t: 'quotidien', j: 3, h: '19:00' }, { t: 'jour', j: 0, h: '07:00' }, { t: 'avant', m: 120 }, { t: 'avant', m: 60 }, { t: 'avant', m: 30 }] }
};
const otClone = o => JSON.parse(JSON.stringify(o));
OT.nt = otClone(OT_NT_DEF);
OT.rap = { get on(){ return OT.nt.seances.on !== false; } };
async function otLoadRappels(){
  try {
    const uid = await otUid(); if(!uid) return;
    const { data } = await sb.from('user_settings').select('user_preferences').eq('user_id', uid).maybeSingle();
    const p = (data && data.user_preferences) || {};
    const n = p.notifs || {};
    OT.nt = otClone(OT_NT_DEF);
    Object.keys(OT.nt).forEach(k => { if(n[k]) OT.nt[k] = Object.assign(OT.nt[k], n[k]); });
    if(!n.seances && p.rappels && p.rappels.on === false) OT.nt.seances.on = false;
  } catch(e){}
}
async function otSaveNotifs(){
  // Cles du coach (lues par le serveur) : coach, charges, coach_resultats
  ['coach', 'charges', 'coach_resultats', 'equipe'].forEach(k => { OT.nt[k] = Object.assign(otClone(OT_NT_DEF[k]), OT.nt[k] || {}); });
  OT.nt.charges.jours = [...new Set((OT.nt.charges.jours || []).map(Number).filter(n => n >= 0 && n <= 30))].sort((a, b) => b - a);
  return typeof crmSavePrefs === 'function' ? await crmSavePrefs({ notifs: OT.nt }) : false;
}
function otRegleTxt(r){
  const [hh, mm] = String(r.h || '09:00').split(':'); const h = Number(hh) + ' h' + (mm && mm !== '00' ? ' ' + mm : '');
  if(r.t === 'jour') return r.j === 0 ? `Le jour même à ${h}` : r.j === 1 ? `La veille à ${h}` : `${r.j} jours avant à ${h}`;
  if(r.t === 'quotidien') return `Chaque jour à ${h}, pendant les ${r.j} jours avant`;
  const m = r.m || 60; return m < 60 ? `${m} minutes avant` : m % 60 ? `${Math.floor(m / 60)} h ${m % 60} avant` : `${m / 60} heure${m >= 120 ? 's' : ''} avant`;
}
function otRapResume(){
  const s = OT.nt.seances;
  if(s.on === false) return 'désactivés';
  return (s.regles || []).length ? s.regles.length + ' rappel' + (s.regles.length > 1 ? 's' : '') + ' par séance' : 'aucun rappel choisi';
}
// Page Motivation : affiche les vraies heures reglees dans Notifications
function otMotivHeures(){
  const el = document.getElementById('motivHeures'); if(!el) return;
  const m = OT.nt.motivation || {};
  const hs = [...new Set((m.heures || []).filter(Boolean))].sort();
  if(m.on === false) el.textContent = '(la motivation du jour est coupée dans Notifications)';
  else if(!hs.length) el.textContent = 'aux heures choisies dans Notifications';
  else el.textContent = 'à ' + hs.map(h => { const [a, b] = h.split(':'); return Number(a) + ' h' + (b && b !== '00' ? ' ' + b : ''); }).join(', ').replace(/, ([^,]*)$/, ' et $1') + ' (réglable dans Notifications)';
}
function otRappelsCard(){
  const host = document.getElementById('photo-subpage-seances');
  const card = host && host.querySelector('.card');
  if(!card) return;
  let el = document.getElementById('otRapCard');
  if(!el){ el = document.createElement('div'); el.id = 'otRapCard'; el.className = 'ot-rap'; const h = card.querySelector(':scope > h2'); if(h) h.insertAdjacentElement('afterend', el); else card.insertBefore(el, card.firstChild); }
  const on = OT.nt.seances.on !== false;
  el.innerHTML = `<span class="ic ${on ? 'on' : ''}">${on ? OT_BELL : OT_BELL_OFF}</span><div><b>Rappels de séances ${on ? 'activés' : 'désactivés'}</b><span>${agEsc(otRapResume())}</span></div><button onclick="otNotifs('seances')">Régler</button>`;
}
function otRappels(){ otNotifs('seances'); }
function otSwitch(id, on, label, sub){ return `<label class="ot-sw"><div><b>${label}</b>${sub ? `<span>${sub}</span>` : ''}</div><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><i></i></label>`; }
function otHeuresHtml(cat){
  const hs = OT.nt[cat].heures || [];
  return `<div class="ot-hours">${hs.map((h, i) => `<span class="ot-hour"><input type="time" value="${agEsc(h)}" onchange="OT.nt.${cat}.heures[${i}]=this.value"><button onclick="OT.nt.${cat}.heures.splice(${i},1);otNotifsRender()" title="Retirer">×</button></span>`).join('')}
    <button class="ot-addh" onclick="OT.nt.${cat}.heures.push('12:00');otNotifsRender()">+ Heure</button></div>`;
}
function otNotifs(focus){
  OT.ntFocus = focus || '';
  agSheet('otNt', '<div id="otNtBody"></div>');
  otNotifsRender();
  if(focus) setTimeout(() => { const el = document.getElementById('otNt-' + focus); if(el) el.scrollIntoView({ block: 'start' }); }, 50);
}
function otNotifsRead(){
  const c = id => { const e = document.getElementById(id); return e ? e.checked : undefined; };
  ['seances', 'galerie', 'mood', 'resa', 'motivation', 'marketing', 'stats_posts', 'bilan_semaine', 'bilan_mois', 'checklist', 'dettes', 'coach', 'charges', 'coach_resultats', 'equipe'].forEach(k => { const v = c('otNtOn-' + k); if(v !== undefined) OT.nt[k].on = v; });
  const val = id => { const e = document.getElementById(id); return e ? e.value : ''; };
  [['marketing', '18:00'], ['bilan_semaine', '19:00'], ['bilan_mois', '09:00'], ['checklist', '20:00'], ['coach', '08:00']].forEach(([k, d]) => { const h = val('otNtH-' + k); if(h) OT.nt[k].heure = h; else if(!OT.nt[k].heure) OT.nt[k].heure = d; });
  const j = val('otNtJ-bilan_semaine'); if(j !== '') OT.nt.bilan_semaine.jour = Number(j);
  const mo = c('otNtMoodOpen'); if(mo !== undefined) OT.nt.mood.ouverture = mo;
  const dj = parseInt(val('otNtJ-dettes'), 10); if(dj > 0) OT.nt.dettes.jours = Math.min(60, dj);
  const cj = [...document.querySelectorAll('#otNtCh input[type=checkbox]')]; if(cj.length) OT.nt.charges.jours = cj.filter(x => x.checked).map(x => Number(x.value));
}
function otNotifsRender(){
  const box = document.getElementById('otNtBody'); if(!box) return;
  if(box.innerHTML) otNotifsRead();
  const N = OT.nt, s = N.seances;
  box.innerHTML = `
    <h3>Notifications</h3>
    <div class="ag-hint" style="margin-top:0">Choisis quand ton téléphone te prévient, même app fermée. Tout est déjà réglé de base, tu modifies si tu veux.</div>

    <div class="ot-nt" id="otNt-seances">
      ${otSwitch('otNtOn-seances', s.on !== false, 'Rappels de séances', 'Avant chaque séance planifiée')}
      <div class="ot-nt-in">
        <div class="ot-presets">${Object.entries(OT_PRESETS).map(([k, p]) => `<button onclick="OT.nt.seances.regles=otClone(OT_PRESETS.${k}.regles);otNotifsRender()">${p.n}</button>`).join('')}</div>
        <div class="ot-rules">${(s.regles || []).map((r, i) => `<div class="ot-rule"><span>${agIcon('calendar', 15)}</span><b>${agEsc(otRegleTxt(r))}</b><button onclick="OT.nt.seances.regles.splice(${i},1);otNotifsRender()" title="Retirer">×</button></div>`).join('') || '<div class="ag-empty" style="padding:10px">Aucun rappel. Ajoute-en un ci-dessous.</div>'}</div>
        <div class="ot-add">
          <select id="otRt" onchange="otRuleUi()"><option value="jour">X jours avant, à une heure</option><option value="quotidien">Chaque jour, pendant X jours avant</option><option value="avant">X heures / minutes avant</option></select>
          <div id="otRuleUi"></div>
          <button class="btn-secondary" onclick="otRuleAdd()">+ Ajouter ce rappel</button>
        </div>
        <div class="ag-hint">Une séance enregistrée au dernier moment reçoit tout de suite le rappel. Pour couper une seule séance, touche la cloche sur la séance.</div>
      </div>
    </div>

    <div class="ot-nt" id="otNt-galerie">
      ${otSwitch('otNtOn-galerie', N.galerie.on !== false, 'Galerie clients', 'Téléchargements, j\'aime, commentaires, choix, avis')}
      <div class="ot-nt-in">
        <div class="ag-pills"><button class="${N.galerie.mode !== 'heures' ? 'on' : ''}" onclick="otNotifsRead();OT.nt.galerie.mode='direct';otNotifsRender()">À chaque visite du client</button><button class="${N.galerie.mode === 'heures' ? 'on' : ''}" onclick="otNotifsRead();OT.nt.galerie.mode='heures';otNotifsRender()">Résumé à heures fixes</button></div>
        ${N.galerie.mode === 'heures' ? `<div class="ag-hint">Tu reçois un résumé de toute l'activité à ces heures-là :</div>${otHeuresHtml('galerie')}` : '<div class="ag-hint">Une notification quelques minutes après chaque visite, qui résume tout ce que le client a fait.</div>'}
      </div>
    </div>

    <div class="ot-nt" id="otNt-mood">
      ${otSwitch('otNtOn-mood', N.mood.on !== false, 'Moodboard', 'Quand le client envoie ses choix')}
      <div class="ot-nt-in">${otSwitch('otNtMoodOpen', N.mood.ouverture !== false, 'Aussi quand il ouvre le lien', '')}</div>
    </div>

    <div class="ot-nt" id="otNt-resa">${otSwitch('otNtOn-resa', N.resa.on !== false, 'Réservations en ligne', 'Quand un client réserve depuis ta page')}</div>

    <div class="ot-nt" id="otNt-motivation">
      ${otSwitch('otNtOn-motivation', N.motivation.on !== false, 'Motivation du jour', 'Conseils et messages pour avancer')}
      <div class="ot-nt-in">${otHeuresHtml('motivation')}</div>
    </div>

    <div class="ot-nt" id="otNt-checklist">
      ${otSwitch('otNtOn-checklist', N.checklist.on !== false, 'Checklist avant séance', "La veille d'une séance, pour vérifier ton matériel")}
      <div class="ot-nt-in"><div class="ot-row"><span>La veille à</span><input type="time" id="otNtH-checklist" value="${agEsc(N.checklist.heure || '20:00')}"></div></div>
    </div>

    <div class="ot-nt" id="otNt-marketing">
      ${otSwitch('otNtOn-marketing', N.marketing.on !== false, "Quoi publier aujourd'hui", 'Une idée de publication pour tes réseaux')}
      <div class="ot-nt-in"><div class="ot-row"><span>Chaque jour à</span><input type="time" id="otNtH-marketing" value="${agEsc(N.marketing.heure || '18:00')}"></div></div>
    </div>

    <div class="ot-nt" id="otNt-stats_posts">${otSwitch('otNtOn-stats_posts', N.stats_posts.on !== false, 'Résultats de mes publications', 'Demander les résultats 2 jours après une publication')}</div>

    <div class="ot-nt" id="otNt-bilan_semaine">
      ${otSwitch('otNtOn-bilan_semaine', N.bilan_semaine.on !== false, 'Bilan de la semaine', 'Le résumé de ta semaine')}
      <div class="ot-nt-in"><div class="ot-row"><select id="otNtJ-bilan_semaine">${OT_JOURS.map((d, i) => `<option value="${i}" ${Number(N.bilan_semaine.jour) === i ? 'selected' : ''}>Chaque ${d.toLowerCase()}</option>`).join('')}</select><span>à</span><input type="time" id="otNtH-bilan_semaine" value="${agEsc(N.bilan_semaine.heure || '19:00')}"></div></div>
    </div>

    <div class="ot-nt" id="otNt-bilan_mois">
      ${otSwitch('otNtOn-bilan_mois', N.bilan_mois.on !== false, 'Bilan du mois', 'Le 1er du mois, ton bilan du mois passé est prêt')}
      <div class="ot-nt-in"><div class="ot-row"><span>Le 1er du mois à</span><input type="time" id="otNtH-bilan_mois" value="${agEsc(N.bilan_mois.heure || '09:00')}"></div></div>
    </div>

    <div class="ot-nt" id="otNt-dettes">
      ${otSwitch('otNtOn-dettes', (N.dettes || {}).on !== false, "Clients qui te doivent de l'argent", 'Un rappel quand une dette n\'est pas payée, puis chaque semaine')}
      <div class="ot-nt-in"><div class="ot-row"><span>Premier rappel après</span><input type="number" id="otNtJ-dettes" min="1" max="60" inputmode="numeric" value="${Number((N.dettes || {}).jours) || 7}" style="width:80px"><span>jours</span></div></div>
    </div>

    <div class="ot-nt" id="otNt-coach">
      ${otSwitch('otNtOn-coach', (N.coach || {}).on !== false, 'Le conseil du jour', 'Le coach te dit la chose la plus importante à faire aujourd\'hui')}
      <div class="ot-nt-in"><div class="ot-row"><span>Chaque jour à</span><input type="time" id="otNtH-coach" value="${agEsc((N.coach || {}).heure || '08:00')}"></div></div>
    </div>

    <div class="ot-nt" id="otNt-charges">
      ${otSwitch('otNtOn-charges', (N.charges || {}).on !== false, 'Charges fixes', 'Avant chaque charge (loyer, électricité, crédit...)')}
      <div class="ot-nt-in"><div class="ot-row" id="otNtCh" style="flex-wrap:wrap">${[[7, '7 jours avant'], [3, '3 jours avant'], [2, '2 jours avant'], [1, 'La veille'], [0, 'Le jour même']].map(([d, l]) => `<label style="display:inline-flex;align-items:center;gap:6px;margin:0 12px 6px 0;font-size:13px;color:var(--text)"><input type="checkbox" value="${d}" style="width:18px;height:18px;margin:0" ${((N.charges || {}).jours || []).map(Number).includes(d) ? 'checked' : ''}>${l}</label>`).join('')}</div></div>
    </div>

    <div class="ot-nt" id="otNt-coach_resultats">${otSwitch('otNtOn-coach_resultats', (N.coach_resultats || {}).on !== false, 'Résultats demandés par le coach', 'Quelques jours après une étape faite ou une négociation en cours')}</div>

    <div class="ot-nt" id="otNt-equipe">${otSwitch('otNtOn-equipe', (N.equipe || {}).on !== false, 'Mon équipe', 'Tâche faite par un membre, défi à valider, bonus de promotion à payer')}</div>

    <button class="btn-primary" style="margin-top:14px" onclick="otNotifsSave()">Enregistrer</button>
    <button class="btn-secondary" style="margin-top:8px" onclick="otNotifsReset()">Remettre les réglages de base</button>`;
  otRuleUi();
}
// Remet les valeurs de base. On vide la fenetre avant de redessiner, sinon les anciens interrupteurs sont relus.
function otNotifsReset(){
  OT.nt = otClone(OT_NT_DEF);
  const box = document.getElementById('otNtBody'); if(box) box.innerHTML = '';
  otNotifsRender();
  agToast('Réglages de base remis. Touche Enregistrer pour les garder.');
}
function otRuleUi(){
  const t = (document.getElementById('otRt') || {}).value, el = document.getElementById('otRuleUi'); if(!el) return;
  if(t === 'avant') el.innerHTML = `<div class="ot-row"><input type="number" id="otRv" value="1" min="1" inputmode="numeric"><select id="otRu"><option value="60">heure(s) avant</option><option value="1">minutes avant</option></select></div>`;
  else el.innerHTML = `<div class="ot-row"><input type="number" id="otRv" value="${t === 'quotidien' ? 3 : 1}" min="0" max="30" inputmode="numeric"><span>${t === 'quotidien' ? 'jours avant, chaque jour à' : 'jour(s) avant, à'}</span><input type="time" id="otRh" value="09:00"></div><div class="ag-hint" style="margin:4px 0 0">${t === 'quotidien' ? 'Ex : 3 = un rappel chaque jour à cette heure pendant les 3 jours avant la séance.' : 'Mets 0 pour le jour même.'}</div>`;
}
function otRuleAdd(){
  otNotifsRead();
  const t = document.getElementById('otRt').value, v = Math.max(0, parseInt(document.getElementById('otRv').value) || 0);
  let r;
  if(t === 'avant'){ const m = v * Number(document.getElementById('otRu').value); if(!m){ agToast('Indique une durée'); return; } r = { t, m }; }
  else r = { t, j: Math.min(30, v), h: document.getElementById('otRh').value || '09:00' };
  OT.nt.seances.regles = [...(OT.nt.seances.regles || []), r];
  otNotifsRender();
}
async function otNotifsSave(){
  otNotifsRead();
  ['galerie', 'motivation'].forEach(k => { OT.nt[k].heures = [...new Set((OT.nt[k].heures || []).filter(Boolean))].sort(); });
  if(!await otSaveNotifs()) return;   // le message d'erreur est deja affiche
  agCloseSheet('otNt'); otRappelsCard(); otShootBells(true); otMotivHeures(); agToast('Notifications enregistrées');
}
async function otRappelsSave(){ return otNotifsSave(); }
function otShootBells(force){
  document.querySelectorAll('.item-card .actions').forEach(a => {
    const m = (a.innerHTML.match(/openShootModal\((\d+)\)/) || [])[1];
    if(!m) return;
    const s = (shoots || []).find(x => x.id === Number(m)); if(!s) return;
    let b = a.querySelector('.ot-bell');
    if(b && !force && b.dataset.off === String(!!s.rappels_off)) return;
    if(!b){ b = document.createElement('button'); b.className = 'btn-ghost ag-ibtn ot-bell'; a.insertBefore(b, a.firstChild); }
    const off = !!s.rappels_off || !OT.rap.on;
    b.dataset.off = String(!!s.rappels_off);
    b.title = s.rappels_off ? 'Rappels coupés pour cette séance (toucher pour réactiver)' : 'Rappels activés (toucher pour couper)';
    b.innerHTML = off ? OT_BELL_OFF : OT_BELL;
    b.classList.toggle('off', off);
    b.onclick = e => { e.stopPropagation(); otToggleShootRappel(s.id); };
  });
}
async function otToggleShootRappel(id){
  const s = (shoots || []).find(x => x.id === id); if(!s) return;
  if(!OT.rap.on){
    // Rappels coupés partout : on propose de les rallumer, sans toucher à cette séance
    if(await agConfirm('Les rappels sont coupés pour toutes les séances. Les réactiver ?', { ok: 'Réactiver' })){
      OT.nt.seances.on = true; await otSaveNotifs(); otRappelsCard(); otShootBells(true);
      agToast('Rappels de séances réactivés');
    }
    return;
  }
  const r = await dbUpdate('shoots', id, { rappels_off: !s.rappels_off });
  if(r){ Object.assign(s, r); otShootBells(true); agToast(r.rappels_off ? 'Rappels coupés pour cette séance' : 'Rappels réactivés pour cette séance'); }
}
new MutationObserver(() => { otShootBells(false); if(document.getElementById('photo-subpage-seances') && !document.getElementById('otRapCard')) otRappelsCard(); }).observe(document.body, { childList: true, subtree: true });

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
// Lien direct depuis une notification : /?tab=galerie&g=CODE ou /?tab=mood&mb=ID
(function otDeepLink(){
  const q = new URLSearchParams(location.search), tab = q.get('tab');
  if(!tab) return;
  if(q.get('g')) window.__galDeep = q.get('g');
  if(q.get('mb')) window.__mbDeep = Number(q.get('mb'));
  if(q.get('bilan')) window.__bilanDeep = q.get('bilan');
  if(q.get('dettes')) window.__dettesDeep = 1;
  if(q.get('co')) window.__coDeep = q.get('co');
  history.replaceState(null, '', location.pathname);
  try { localStorage.setItem('active_tab', tab); } catch(e){}
  const go = () => { if(document.getElementById('page-' + tab) && !document.body.classList.contains('logged-out')){ agGoTab(tab); if(tab === 'mood' && typeof mbRender === 'function'){ if(window.__mbDeep && typeof MB !== 'undefined'){ MB.cur = window.__mbDeep; window.__mbDeep = null; } mbRender(); } } else setTimeout(go, 400); };
  setTimeout(go, 300);
})();
// Carte "Nouvelle réservation" sur l'Accueil (tant qu'une demande n'est pas traitée)
(function otResaAccueil(){
  if(typeof agRenderDashMini !== 'function') return;
  const avant = agRenderDashMini;
  agRenderDashMini = function(){
    const r = avant.apply(this, arguments);
    try {
      const el = document.getElementById('agDashMini'); if(!el) return r;
      const old = document.getElementById('otResaDash'); if(old) old.remove();
      const nouv = (OT.resas || []).filter(x => x.status === 'nouvelle');
      if(!nouv.length) return r;
      const x = nouv[0];
      const d = document.createElement('div');
      d.id = 'otResaDash'; d.className = 'crm-fete ot-resa-dash';
      d.onclick = () => { if(nouv.length === 1) otOpenResa(x.id); else agGoTab('clients'); };
      d.innerHTML = `<div class="ic">${agIcon('calendar')}</div><div class="d"><b>${nouv.length === 1 ? 'Nouvelle réservation' : nouv.length + ' nouvelles réservations'}</b><span>${agEsc(x.nom || 'Un client')} · ${agEsc(x.formule || 'Séance')} · ${agEsc(x.date_souhaitee ? (/T|:/.test(String(x.date_souhaitee)) ? otFmtDate(x.date_souhaitee) : new Date(x.date_souhaitee + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })) : 'date à fixer')}${nouv.length > 1 ? ' · et ' + (nouv.length - 1) + ' autre' + (nouv.length > 2 ? 's' : '') : ''}</span></div>${agIcon('chev', 16)}`;
      const hello = el.querySelector('.ag-hello');
      if(hello && hello.nextSibling) el.insertBefore(d, hello.nextSibling); else el.insertBefore(d, el.firstChild);
    } catch(e){}
    return r;
  };
  if(!document.getElementById('otResaDashCss')){
    const st = document.createElement('style'); st.id = 'otResaDashCss';
    st.textContent = '.ot-resa-dash{border:1.5px solid var(--accent) !important;animation:otPulse 2.4s ease-in-out 2}.ot-resa-dash .ic{background:var(--accent) !important;color:#fff !important}@keyframes otPulse{50%{box-shadow:0 0 0 6px color-mix(in srgb,var(--accent) 25%,transparent)}}';
    document.head.appendChild(st);
  }
})();
(async function otInit(){
  await otLoadResas();
  try { agRenderDashMini(); } catch(e){}
  await otLoadRappels(); otRappelsCard(); otShootBells(true); otMotivHeures();
  let n = 0; const iv = setInterval(() => { otAddMenus(); otTopButtons(); if(++n > 20) clearInterval(iv); }, 500);
  if(otActivePage() === 'clients' && typeof crmRender === 'function') crmRender();
})();
