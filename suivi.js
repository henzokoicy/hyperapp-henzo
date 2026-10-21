// ============================================================
// SUPER APP HENZO - SUIVI CLIENT
// - Impressions sur un client (bonne, neutre, mauvaise expérience)
// - Ce qu'un client te doit (dettes), paiements en plusieurs fois
// - Notes libres datées
// Table : client_suivi (kind 'impression' | 'dette' | 'note')
// Charge par argent.js. Les autres fichiers appellent seulement les
// fonctions sv...() si elles existent (crochets légers).
// ============================================================

const SV = { rows: [], loaded: false, busy: false, syncTimer: null };

// ---------- Style ----------
(function svStyle(){
  if(document.getElementById('svStyle')) return;
  const st = document.createElement('style');
  st.id = 'svStyle';
  st.textContent = `
.sv-dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-left:6px;vertical-align:middle;background:var(--muted);flex-shrink:0}
.sv-dot.positif{background:var(--green)}.sv-dot.neutre{background:var(--muted)}.sv-dot.negatif{background:var(--red)}
.sv-doit{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:8px;font:700 11px Inter,sans-serif;color:var(--red);background:rgba(255,107,107,.12);border:1px solid rgba(255,107,107,.35);vertical-align:middle;white-space:nowrap}
.sv-box{margin:12px 0;padding:12px 14px;border-radius:14px;background:var(--card2);border:1px solid var(--border)}
.sv-box h4{margin:0 0 8px;font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.sv-due{margin:0 0 10px;padding:10px 12px;border-radius:12px;background:rgba(255,107,107,.12);border:1px solid rgba(255,107,107,.45);color:var(--red)}
.sv-due b{display:block;font-size:16px}
.sv-due span{display:block;font-size:12px;margin-top:3px;color:var(--text-2)}
.sv-imp{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;color:var(--text);margin-bottom:10px}
.sv-imp .sv-dot{margin:5px 0 0}
.sv-imp em{display:block;font-style:normal;font-size:11.5px;color:var(--muted);margin-top:2px}
.sv-btns{display:flex;flex-wrap:wrap;gap:6px}
.sv-btns button{width:auto;margin:0;padding:7px 10px;border-radius:10px;font:600 12px Inter,sans-serif;background:var(--card);border:1px solid var(--border);color:var(--text);cursor:pointer}
.sv-btns button.red{color:var(--red);border-color:rgba(255,107,107,.5)}
.sv-btns button.green{color:var(--green);border-color:var(--green)}
.sv-item{padding:10px 0;border-bottom:1px solid var(--border)}
.sv-item:last-child{border-bottom:0}
.sv-item .h{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text)}
.sv-item .h b{flex:1}
.sv-item .h .m{font-weight:700;white-space:nowrap}
.sv-item .h .m.red{color:var(--red)}
.sv-item p{margin:4px 0 6px;font-size:13px;color:var(--text-2);white-space:pre-wrap}
.sv-item .sub{font-size:11.5px;color:var(--muted);margin-bottom:6px}
.sv-item.off{opacity:.55}
.sv-item.off p{text-decoration:line-through}
.sv-alert{margin:10px 0;padding:10px 12px;border-radius:12px;font-size:12.5px;line-height:1.45;background:rgba(255,107,107,.10);border:1px solid rgba(255,107,107,.45);color:var(--text)}
.sv-alert b{color:var(--red)}
.sv-alert.ok{background:var(--card2);border-color:var(--border)}
.sv-alert.ok b{color:var(--green)}
.sv-total{display:flex;align-items:center;gap:10px;margin:10px 0;padding:12px 14px;border-radius:14px;cursor:pointer;background:rgba(255,107,107,.10);border:1px solid rgba(255,107,107,.45)}
.sv-total .d{flex:1}.sv-total b{display:block;color:var(--red);font-size:15px}.sv-total span{font-size:12px;color:var(--muted)}
.sv-hum{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.sv-hum button{margin:0;padding:10px 6px;border-radius:12px;background:var(--card2);border:1px solid var(--border);color:var(--text);font:600 12.5px Inter,sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px}
.sv-hum button.on.positif{border-color:var(--green);color:var(--green)}
.sv-hum button.on.neutre{border-color:var(--text-2)}
.sv-hum button.on.negatif{border-color:var(--red);color:var(--red)}
.sv-hum .sv-dot{margin:0}
`;
  document.head.appendChild(st);
})();

// ---------- Outils ----------
const svN = n => new Intl.NumberFormat('fr-FR').format(Math.round(Number(n) || 0));
const svF = n => svN(n) + ' F';
const svEsc = s => (typeof agEsc === 'function' ? agEsc(s) : String(s == null ? '' : s));
function svToday(){ const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
function svDate(d, opt){ if(!d) return ''; const x = new Date(String(d).length <= 10 ? d + 'T12:00:00' : d); return isNaN(x) ? '' : x.toLocaleDateString('fr-FR', opt || { day: 'numeric', month: 'short', year: 'numeric' }); }
function svClient(id){ return (typeof clients !== 'undefined' ? clients : []).find(c => c.id === Number(id)) || null; }
const SV_HUM = { positif: 'Bonne expérience', neutre: 'Neutre', negatif: 'Mauvaise expérience' };
const SV_KIND = { impression: 'Impression', dette: 'Il me doit', note: 'Note' };

// ---------- Données ----------
async function svLoad(){
  try {
    const { data, error } = await sb.from('client_suivi').select('*').order('date', { ascending: false });
    if(error) throw error;
    SV.rows = data || [];
  } catch(e){ console.warn('Suivi client :', e.message || e); SV.rows = SV.rows || []; }
  SV.loaded = true;
  await svSync();
}
function svOf(clientId){ return SV.rows.filter(r => Number(r.client_id) === Number(clientId)); }
function svSort(list){ return [...list].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.created_at || '').localeCompare(String(a.created_at || '')) || (b.id - a.id)); }
function svLastImpression(clientId){ return svSort(svOf(clientId).filter(r => r.kind === 'impression'))[0] || null; }

// Paiements d'une dette encore valables : leur transaction existe et n'est pas annulée.
// C'est la vraie source : si on annule ou supprime le paiement dans l'Historique, la dette se rouvre.
function svPaiementsValides(d){
  const list = Array.isArray(d.paiements) ? d.paiements : [];
  return list.filter(p => { const t = (typeof txs !== 'undefined' ? txs : []).find(x => x.id === Number(p.tx_id)); return t && !t.cancelled; });
}
function svPaye(d){ return svPaiementsValides(d).reduce((a, p) => a + (Number(p.montant) || 0), 0); }
function svReste(d){ return Math.max(0, (Number(d.montant) || 0) - svPaye(d)); }
function svDetteOuverte(d){ return d.kind === 'dette' && d.statut !== 'annulee' && svReste(d) > 0; }

// Met paye / statut / paid_at en accord avec les transactions (sans boucle : écriture directe)
async function svSync(){
  if(!SV.loaded || typeof txs === 'undefined') return;
  for(const d of SV.rows.filter(r => r.kind === 'dette')){
    const paye = svPaye(d);
    let statut = d.statut || 'ouverte';
    if(statut !== 'annulee') statut = paye >= (Number(d.montant) || 0) && Number(d.montant) > 0 ? 'payee' : 'ouverte';
    const paid_at = statut === 'payee' ? (d.paid_at || new Date().toISOString()) : null;
    if(Number(d.paye || 0) === paye && (d.statut || 'ouverte') === statut && (d.paid_at || null) === paid_at) continue;
    const patch = { paye, statut, paid_at, updated_at: new Date().toISOString() };
    try { const { error } = await sb.from('client_suivi').update(patch).eq('id', d.id); if(!error) Object.assign(d, patch); } catch(e){}
  }
}
function svSyncSoon(){
  clearTimeout(SV.syncTimer);
  SV.syncTimer = setTimeout(async () => { await svSync(); svRefreshViews(); }, 300);
}

// Ce que le client doit : dettes ouvertes + reste des séances passées ou du jour.
// Les séances à venir ne comptent pas : le client n'a pas encore à payer.
function svDu(clientId){
  const fin = new Date(); fin.setHours(23, 59, 59, 999);
  const dettes = svOf(clientId).filter(svDetteOuverte).map(d => ({ type: 'dette', id: d.id, label: d.text || 'Dette', reste: svReste(d), date: d.date }));
  const seances = (typeof shoots !== 'undefined' ? shoots : []).filter(s => Number(s.client_id) === Number(clientId)
      && !/annul/i.test(s.status || '') && s.date && new Date(s.date) <= fin)
    .map(s => ({ type: 'seance', id: s.id, label: (s.type || 'Séance') + ' du ' + svDate(s.date, { day: 'numeric', month: 'short' }), reste: Math.max(0, (Number(s.price) || 0) - (Number(s.montant_recu) || 0)), date: s.date }))
    .filter(x => x.reste > 0);
  const totDettes = dettes.reduce((a, x) => a + x.reste, 0), totSeances = seances.reduce((a, x) => a + x.reste, 0);
  return { dettes, seances, totDettes, totSeances, total: totDettes + totSeances };
}
function svDuTous(){ return (typeof clients !== 'undefined' ? clients : []).map(c => ({ c, du: svDu(c.id) })).filter(x => x.du.total > 0); }
function svDuDetail(du){
  return [...du.dettes.map(x => `${x.label} : ${svF(x.reste)}`), ...du.seances.map(x => `Reste ${x.label} : ${svF(x.reste)}`)].join(' · ');
}

// ---------- Fiche client : section Suivi ----------
function svFicheHtml(c){
  const du = svDu(c.id), imp = svLastImpression(c.id);
  const list = svSort(svOf(c.id));
  return `<div class="sv-box" id="svFiche">
    <h4>Suivi</h4>
    ${du.total > 0 ? `<div class="sv-due"><b>Il te doit ${svF(du.total)}</b><span>${svEsc(svDuDetail(du))}</span></div>` : ''}
    ${imp ? `<div class="sv-imp"><i class="sv-dot ${imp.humeur || 'neutre'}"></i><div><b>${SV_HUM[imp.humeur] || 'Neutre'}</b>${imp.text ? ' : ' + svEsc(imp.text) : ''}<em>${svDate(imp.date)}</em></div></div>`
      : '<div class="ag-hint" style="margin:0 0 10px">Aucune impression notée pour ce client.</div>'}
    <div class="sv-btns">
      <button onclick="svForm(${c.id},'impression')">Noter une impression</button>
      <button class="red" onclick="svForm(${c.id},'dette')">Il me doit...</button>
      <button onclick="svForm(${c.id},'note')">Note</button>
    </div>
    ${list.length ? `<div style="margin-top:10px">${list.map(svItemHtml).join('')}</div>` : ''}
  </div>`;
}
function svItemHtml(r){
  const date = svDate(r.date);
  if(r.kind === 'dette'){
    const paye = svPaye(r), reste = svReste(r), ouverte = svDetteOuverte(r), annulee = r.statut === 'annulee';
    const s = r.shoot_id ? (typeof shoots !== 'undefined' ? shoots : []).find(x => x.id === Number(r.shoot_id)) : null;
    return `<div class="sv-item ${annulee ? 'off' : ''}">
      <div class="h"><b>${annulee ? 'Dette annulée' : ouverte ? 'Il me doit' : 'Dette payée'}</b><span class="m ${ouverte ? 'red' : ''}">${ouverte ? svF(reste) : svF(r.montant)}</span></div>
      ${r.text ? `<p>${svEsc(r.text)}</p>` : ''}
      <div class="sub">${date}${s ? ' · ' + svEsc((s.type || 'Séance') + ' du ' + svDate(s.date, { day: 'numeric', month: 'short' })) : ''}${paye > 0 ? ` · payé ${svF(paye)} sur ${svF(r.montant)}` : ` · ${svF(r.montant)}`}${!ouverte && !annulee && r.paid_at ? ' · soldée le ' + svDate(r.paid_at) : ''}</div>
      <div class="sv-btns">
        ${ouverte ? `<button class="green" onclick="svPayer(${r.id})">Il a payé</button><button onclick="svRelancer(${r.id})">Relancer sur WhatsApp</button>` : ''}
        <button onclick="svForm(${r.client_id},'dette',${r.id})">Modifier</button>
        ${ouverte ? `<button onclick="svAnnulerDette(${r.id})">Annuler la dette</button>` : ''}
        <button class="red" onclick="svSupprimer(${r.id})">Supprimer</button>
      </div></div>`;
  }
  const head = r.kind === 'impression' ? `<i class="sv-dot ${r.humeur || 'neutre'}" style="margin:0"></i><b>${SV_HUM[r.humeur] || 'Neutre'}</b>` : '<b>Note</b>';
  return `<div class="sv-item">
    <div class="h">${head}<span class="m" style="font-weight:400;color:var(--muted);font-size:11.5px">${date}</span></div>
    ${r.text ? `<p>${svEsc(r.text)}</p>` : ''}
    <div class="sv-btns"><button onclick="svForm(${r.client_id},'${r.kind}',${r.id})">Modifier</button><button class="red" onclick="svSupprimer(${r.id})">Supprimer</button></div>
  </div>`;
}

// ---------- Formulaire (impression, dette, note) ----------
function svForm(clientId, kind, id){
  const c = svClient(clientId); if(!c) return;
  const r = id ? SV.rows.find(x => x.id === id) : null;
  SV.formHum = r ? (r.humeur || 'neutre') : 'neutre';
  const ss = (typeof shoots !== 'undefined' ? shoots : []).filter(s => Number(s.client_id) === c.id).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const title = r ? 'Modifier' : kind === 'impression' ? 'Noter une impression' : kind === 'dette' ? 'Il me doit...' : 'Note';
  agSheet('svForm', `
    <h3>${title}</h3>
    <div class="ag-hint" style="margin-top:0">${svEsc(c.name)}</div>
    ${kind === 'impression' ? `<label>Comment ça s'est passé ?</label>
      <div class="sv-hum" id="svHum">${Object.entries(SV_HUM).map(([k, n]) => `<button type="button" data-h="${k}" class="${k} ${k === SV.formHum ? 'on' : ''}" onclick="svPickHum('${k}')"><i class="sv-dot ${k}"></i>${n.replace(' expérience', '')}</button>`).join('')}</div>
      <label>Ce que tu retiens</label><textarea id="svText" rows="3" placeholder="Ex : il m'a fait tourner, très ponctuel, a bien recommandé le studio...">${svEsc(r ? r.text || '' : '')}</textarea>` : ''}
    ${kind === 'note' ? `<label>Note</label><textarea id="svText" rows="4">${svEsc(r ? r.text || '' : '')}</textarea>` : ''}
    ${kind === 'dette' ? `
      <label>Montant (FCFA)</label><input id="svMontant" type="number" inputmode="decimal" min="1" value="${r ? Number(r.montant) || '' : ''}" placeholder="Ex : 5000">
      <label>Raison</label><input id="svText" value="${svEsc(r ? r.text || '' : '')}" placeholder="Ex : 2 photos en plus après la séance, tirage, paiement pas fait sur place">
      <label>Séance liée (facultatif)</label>
      <select id="svShoot"><option value="">Aucune</option>${ss.map(s => `<option value="${s.id}" ${r && Number(r.shoot_id) === s.id ? 'selected' : ''}>${svEsc((s.type || 'Séance') + ' du ' + svDate(s.date))}</option>`).join('')}</select>
      <div class="ag-hint">C'est pour un surplus, en plus du prix de la séance. Si c'est le reste du prix de la séance, utilise plutôt « Paiement reçu » sur la séance.</div>` : ''}
    <label>Date</label><input id="svDate" type="date" value="${svEsc(r ? String(r.date || '').slice(0, 10) : svToday())}">
    <button class="btn-primary" id="svFormBtn" style="margin-top:12px" onclick="svSave(${c.id},'${kind}',${r ? r.id : 'null'})">Enregistrer</button>`);
}
function svPickHum(h){
  SV.formHum = h;
  document.querySelectorAll('#svHum button').forEach(b => b.classList.toggle('on', b.dataset.h === h));
}
async function svSave(clientId, kind, id){
  const btn = document.getElementById('svFormBtn');
  if(btn && btn.disabled) return;
  const v = k => { const e = document.getElementById(k); return e ? e.value.trim() : ''; };
  const data = { client_id: clientId, kind, text: v('svText') || null, date: v('svDate') || svToday(), updated_at: new Date().toISOString() };
  const r = id ? SV.rows.find(x => x.id === id) : null;
  if(kind === 'impression') data.humeur = SV.formHum || 'neutre';
  if(kind === 'note' && !data.text){ agAlert('Écris ta note.'); return; }
  if(kind === 'dette'){
    const m = Math.round(parseFloat(v('svMontant')) || 0);
    if(m <= 0){ agAlert('Indique le montant que le client te doit.'); return; }
    if(!data.text){ agAlert('Écris la raison (ex : 2 photos en plus).'); return; }
    if(r && m < svPaye(r)){ agAlert(`Il a déjà payé ${svF(svPaye(r))} sur cette dette : le montant ne peut pas être plus petit.`); return; }
    data.montant = m;
    data.shoot_id = Number(v('svShoot')) || null;
    if(!r){ data.paye = 0; data.statut = 'ouverte'; data.paiements = []; }
  }
  if(btn){ btn.disabled = true; btn.textContent = 'Enregistrement...'; }
  try {
    if(r){
      const res = await dbUpdate('client_suivi', id, data);
      if(!res) return;
      Object.assign(r, res);
    } else {
      const res = await dbInsert('client_suivi', data);
      if(!res) return;
      SV.rows.unshift(res);
    }
    await svSync();
    agCloseSheet('svForm');
    svRefreshViews();
    agToast(kind === 'dette' ? 'Dette enregistrée' : 'Enregistré');
  } finally {
    if(btn && btn.isConnected){ btn.disabled = false; btn.textContent = 'Enregistrer'; }
  }
}
async function svSupprimer(id){
  const r = SV.rows.find(x => x.id === id); if(!r) return;
  const pays = r.kind === 'dette' ? svPaiementsValides(r).length : 0;
  const msg = r.kind === 'dette'
    ? `Supprimer cette dette ?${pays ? `\nLes ${pays} paiement${pays > 1 ? 's' : ''} déjà reçu${pays > 1 ? 's' : ''} restent dans tes entrées d'argent.` : ''}`
    : 'Supprimer cette entrée du suivi ?';
  if(!await agConfirm(msg)) return;
  const ok = await dbDelete('client_suivi', id);
  if(!ok) return;
  SV.rows = SV.rows.filter(x => x.id !== id);
  svRefreshViews();
  agToast('Supprimé');
}
async function svAnnulerDette(id){
  const r = SV.rows.find(x => x.id === id); if(!r) return;
  if(!await agConfirm(`Annuler cette dette ?\nLe client ne te devra plus ${svF(svReste(r))} pour "${r.text || 'cette dette'}". Elle reste visible, barrée.`)) return;
  const res = await dbUpdate('client_suivi', id, { statut: 'annulee', updated_at: new Date().toISOString() });
  if(!res) return;
  Object.assign(r, res);
  svRefreshViews();
  agToast('Dette annulée');
}

// ---------- "Il a payé" ----------
function svPayer(id){
  const d = SV.rows.find(x => x.id === id); if(!d) return;
  const c = svClient(d.client_id);
  const reste = svReste(d);
  const comptes = typeof agActiveAccounts === 'function' ? agActiveAccounts() : [];
  if(!comptes.length){ agAlert("Crée d'abord tes comptes (onglet Argent) pour savoir où arrive l'argent."); return; }
  const methodes = [['Wave', 'Wave'], ['Espèces', 'Espèces'], ['Orange Money', 'Orange Money'], ['MTN Money', 'MTN Money'], ['Moov Money', 'Moov Money'], ['Virement bancaire', 'Virement'], ['Chèque', 'Chèque']];
  const cpt = typeof agGuessAccount === 'function' ? agGuessAccount('Wave') : comptes[0].id;
  agSheet('svPay', `
    <h3>Il a payé</h3>
    <div class="ag-hint" style="margin-top:0">${svEsc(c ? c.name : '')} · ${svEsc(d.text || 'Dette')} · reste ${svF(reste)}</div>
    <label>Combien a-t-il payé ? (FCFA)</label>
    <input id="svPayMontant" type="number" inputmode="decimal" min="1" max="${reste}" value="${reste}" style="font-size:20px;font-weight:700;text-align:center">
    <div class="ag-hint">Il peut payer en plusieurs fois : la dette reste ouverte tant que tout n'est pas payé.</div>
    <label>Mode de paiement</label>
    <select id="svPayMethod" onchange="svPayMethode()">${methodes.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
    <label>Arrive sur quel compte ?</label>
    <select id="svPayCompte">${comptes.map(a => `<option value="${a.id}" ${a.id === cpt ? 'selected' : ''}>${svEsc(a.name)}</option>`).join('')}</select>
    <button class="btn-primary" id="svPayBtn" style="margin-top:14px" onclick="svPayValider(${id})">Valider le paiement</button>`);
}
function svPayMethode(){
  const m = document.getElementById('svPayMethod').value, sel = document.getElementById('svPayCompte');
  if(sel && typeof agGuessAccount === 'function'){ const a = agGuessAccount(m); if(a) sel.value = a; }
}
async function svPayValider(id){
  const btn = document.getElementById('svPayBtn');
  if(!btn || btn.disabled) return;
  const d = SV.rows.find(x => x.id === id); if(!d) return;
  const c = svClient(d.client_id);
  const reste = svReste(d);
  const montant = Math.round(parseFloat(document.getElementById('svPayMontant').value) || 0);
  const method = document.getElementById('svPayMethod').value;
  const accountId = Number(document.getElementById('svPayCompte').value) || null;
  if(montant <= 0){ agAlert('Indique un montant valide.'); return; }
  if(montant > reste){ agAlert(`Il ne reste que ${svF(reste)} à payer sur cette dette.`); return; }
  if(!accountId){ agAlert("Choisis sur quel compte l'argent arrive."); return; }
  btn.disabled = true; btn.textContent = 'Enregistrement...';
  let tx = null;
  try {
    const raison = d.text || 'Dette';
    tx = await dbInsert('transactions', {
      _agRaw: true,
      type: 'revenu', amount: montant, category: 'Shooting photo',
      note: 'Dette réglée · ' + raison + (c ? ' · ' + c.name : ''),
      date: svToday(), client_id: c ? c.id : null, client_name: c ? c.name : null,
      shoot_id: d.shoot_id || null, account_id: accountId, payment_method: method,
      details: 'dette:' + d.id
    });
    if(!tx) return;
    txs.unshift(tx);
    const paiements = [...(Array.isArray(d.paiements) ? d.paiements : []), { tx_id: tx.id, montant, date: svToday() }];
    const patch = { paiements, updated_at: new Date().toISOString() };
    const { data, error } = await sb.from('client_suivi').update(patch).eq('id', d.id).select().single();
    if(error){ agAlert("Le paiement est noté dans tes entrées, mais la dette n'a pas pu être mise à jour : " + error.message); }
    Object.assign(d, data || patch);
    await svSync();
  } finally {
    if(btn.isConnected){ btn.disabled = false; btn.textContent = 'Valider le paiement'; }
  }
  agCloseSheet('svPay');
  if(typeof refreshAll === 'function') refreshAll();
  svRefreshViews();
  agToast(svDetteOuverte(d) ? `${svF(montant)} reçu · reste ${svF(svReste(d))}` : 'Dette soldée');
  // Comme une entrée normale : répartition 50/30/20 depuis le même compte (fermer = rien n'est rangé)
  if(typeof ouvrirRepartitionPaiement === 'function' && tx.account_id){
    setTimeout(() => ouvrirRepartitionPaiement({
      kind: 'entree', revenuId: tx.id, montant, aRepartir: montant, accountId: tx.account_id,
      label: 'Dette réglée' + (c ? ' · ' + c.name : '')
    }), 400);
  }
}

// ---------- Relance WhatsApp ----------
function svRelanceTexte(d){
  const s = d.shoot_id ? (typeof shoots !== 'undefined' ? shoots : []).find(x => x.id === Number(d.shoot_id)) : null;
  const paye = svPaye(d);
  return `Bonjour {prenom}, c'est Henzo Studio.\n`
    + `Petit rappel : il reste ${svF(svReste(d))} à régler pour ${d.text || 'votre commande'}${s ? ' (séance du ' + svDate(s.date, { day: 'numeric', month: 'long' }) + ')' : ''}${paye > 0 ? `, après les ${svF(paye)} déjà reçus, merci` : ''}.\n`
    + `Vous pouvez payer par Wave ou Orange Money, ou directement au studio.\n`
    + `Merci de me dire quand vous pourrez le faire.\nHenzo Studio`;
}
async function svRelancer(id){
  const d = SV.rows.find(x => x.id === id); if(!d) return;
  if(typeof crmWa !== 'function') return;
  await crmWa(d.client_id, svRelanceTexte(d), 'dette');
}

// ---------- Liste des clients, filtres, total ----------
function svListBadge(c){
  const imp = svLastImpression(c.id), du = svDu(c.id);
  return `${imp ? `<i class="sv-dot ${imp.humeur || 'neutre'}" title="${svEsc(SV_HUM[imp.humeur] || '')}"></i>` : ''}${du.total > 0 ? `<span class="sv-doit">doit ${svF(du.total)}</span>` : ''}`;
}
function svTotalHtml(){
  const l = svDuTous();
  if(!l.length) return '';
  const tot = l.reduce((a, x) => a + x.du.total, 0);
  return `<div class="sv-total" onclick="CRM.seg='dettes';crmRender()"><div class="d"><b>On te doit ${svF(tot)}</b><span>${l.length} client${l.length > 1 ? 's' : ''} · touche pour voir</span></div>${typeof agIcon === 'function' ? agIcon('chev', 16) : ''}</div>`;
}

// ---------- Alertes : nouvelle séance et réservations ----------
function svAlertLines(clientId){
  const imp = svLastImpression(clientId), du = svDu(clientId), out = [];
  if(imp && imp.humeur === 'negatif') out.push(`<b>Attention : mauvaise expérience</b> le ${svDate(imp.date, { day: 'numeric', month: 'short' })}${imp.text ? ' : ' + svEsc(imp.text) : ''}`);
  if(du.total > 0) out.push(`<b>Il te doit ${svF(du.total)}</b> (${svEsc(svDuDetail(du))})`);
  return out;
}
function svShootAlert(){
  const sel = document.getElementById('shootClient');
  if(!sel) return;
  let box = document.getElementById('svShootAlert');
  const id = sel.value && sel.value !== '__new__' ? Number(sel.value) : null;
  const lines = id ? svAlertLines(id) : [];
  if(!lines.length){ if(box) box.remove(); return; }
  if(!box){ box = document.createElement('div'); box.id = 'svShootAlert'; box.className = 'sv-alert'; sel.insertAdjacentElement('afterend', box); }
  box.innerHTML = lines.join('<br>');
}
function svClientDeResa(r){
  const digits = String(r.telephone || '').replace(/\D/g, '').slice(-8);
  const nom = String(r.nom || '').trim().toLowerCase();
  const list = typeof clients !== 'undefined' ? clients : [];
  return (digits.length >= 8 && list.find(c => String(c.phone || '').replace(/\D/g, '').slice(-8) === digits))
    || (nom && list.find(c => String(c.name || '').trim().toLowerCase() === nom)) || null;
}
function svResaBadge(r){
  const c = svClientDeResa(r); if(!c) return '';
  const imp = svLastImpression(c.id), du = svDu(c.id);
  if(!imp && !du.total) return '';
  return `<span style="display:block;margin-top:2px">${imp ? `<i class="sv-dot ${imp.humeur || 'neutre'}" style="margin:0 4px 0 0"></i>` : ''}${du.total > 0 ? `<span class="sv-doit" style="margin:0">doit ${svF(du.total)}</span>` : ''}</span>`;
}
function svResaAlertHtml(r){
  const c = svClientDeResa(r); if(!c) return '';
  const imp = svLastImpression(c.id), lines = svAlertLines(c.id);
  if(imp && imp.humeur !== 'negatif') lines.unshift(`${SV_HUM[imp.humeur] || 'Impression'} le ${svDate(imp.date, { day: 'numeric', month: 'short' })}${imp.text ? ' : ' + svEsc(imp.text) : ''}`);
  return `<div class="sv-alert ${lines.length && (imp && imp.humeur === 'negatif' || svDu(c.id).total > 0) ? '' : 'ok'}"><b style="color:inherit">Déjà client : ${svEsc(c.name)}</b>${lines.length ? '<br>' + lines.join('<br>') : ''}</div>`;
}

// ---------- IA (messages clients) ----------
function svBrief(c){
  const imp = svLastImpression(c.id), du = svDu(c.id), out = [];
  if(imp) out.push(`impression de Henzo : ${(SV_HUM[imp.humeur] || 'neutre').toLowerCase()}${imp.text ? ' (' + imp.text + ')' : ''}`);
  if(du.total > 0) out.push(`doit encore ${Math.round(du.total)} F (${svDuDetail(du)})`);
  return out.length ? ', ' + out.join(', ') : '';
}
function svRules(cs, k){
  const bloques = (cs || []).filter(c => svDu(c.id).total > 0 || (svLastImpression(c.id) || {}).humeur === 'negatif');
  let t = '';
  if(bloques.length) t += `\nNe propose jamais de promo, de réduction ni de cadeau à ${bloques.length > 6 ? 'un client qui doit de l\'argent ou avec qui l\'expérience a été mauvaise' : bloques.map(c => c.name).join(', ') + ' (il doit de l\'argent ou l\'expérience a été mauvaise)'}.`;
  if(k && k.goal === 'dette') t += `\nC'est une relance pour un montant dû : ton poli mais ferme, rappelle le montant exact et la raison, propose de payer par Wave ou Orange Money, et demande quand le client pourra payer. Pas de promo.`;
  return t;
}

// ---------- Bilan du mois ----------
function svBilan(y, m){
  const dues = SV.rows.filter(svDetteOuverte).reduce((a, d) => a + svReste(d), 0);
  let recup = 0;
  SV.rows.filter(r => r.kind === 'dette').forEach(d => svPaiementsValides(d).forEach(p => {
    const dt = new Date(String(p.date || '').length <= 10 ? p.date + 'T12:00:00' : p.date);
    if(dt.getFullYear() === y && dt.getMonth() === m) recup += Number(p.montant) || 0;
  }));
  return { dettesDues: dues, dettesRecup: recup };
}

// ---------- Rafraîchir ce qui est affiché ----------
function svRefreshViews(){
  const fiche = document.getElementById('svFiche');
  if(fiche && document.getElementById('crmClient') && typeof crmOpenClient === 'function'){
    const cid = SV.lastClient;
    if(cid) crmOpenClient(cid);
  }
  const page = document.querySelector('.page.active');
  if(page && page.id === 'page-clients' && typeof crmRender === 'function') crmRender();
  svShootAlert();
}

// ---------- Branchements ----------
(function svInit(){
  // Les transactions changent (annuler, restaurer, supprimer) : on recalcule les dettes
  const _u = dbUpdate, _d = dbDelete;
  dbUpdate = async function(table, id, data){ const r = await _u.apply(this, arguments); if(r && table === 'transactions') svSyncSoon(); return r; };
  dbDelete = async function(table, id){ const r = await _d.apply(this, arguments); if(r && table === 'transactions') svSyncSoon(); return r; };
  const _l = loadAllData;
  loadAllData = async function(){ const r = await _l.apply(this, arguments); await svLoad(); return r; };

  // crm.js peut arriver avant ou après ce fichier : on attend qu'il soit prêt
  let n = 0;
  const hook = () => {
    if(typeof CRM_SEGS === 'undefined' || typeof crmOpenClient !== 'function'){ if(++n < 100) setTimeout(hook, 150); return; }
    CRM_SEGS.dettes = { n: "Me doivent de l'argent", f: x => svDu(x.c.id).total > 0, d: "Dettes ou reste de séances passées" };
    CRM_SEGS.mauvaise = { n: 'Mauvaise expérience', f: x => (svLastImpression(x.c.id) || {}).humeur === 'negatif', d: 'Dernière impression mauvaise' };
    if(typeof CRM_GOALS !== 'undefined' && !CRM_GOALS.dette) CRM_GOALS.dette = { n: 'Relance dette', d: 'Rappeler poliment un montant dû' };
    const _open = crmOpenClient;
    crmOpenClient = function(id){ SV.lastClient = id; return _open.apply(this, arguments); };
    // Lien direct : ?tab=clients&dettes=1
    if(window.__dettesDeep || /[?&]dettes=1/.test(location.search)){
      window.__dettesDeep = 0;
      CRM.seg = 'dettes';
      const go = () => { if(document.getElementById('page-clients') && !document.body.classList.contains('logged-out') && typeof agGoTab === 'function'){ agGoTab('clients'); crmRender(); } else setTimeout(go, 400); };
      setTimeout(go, 600);
    }
    const p = document.querySelector('.page.active');
    if(p && p.id === 'page-clients') crmRender();
  };
  hook();
  (async () => { await svLoad(); svRefreshViews(); })();
})();
