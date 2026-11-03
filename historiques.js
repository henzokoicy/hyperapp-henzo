// ============================================================
// HISTORIQUES.JS - Retrouver quand les choses ont été faites
// ------------------------------------------------------------
// 1. Historique des messages : chaque message envoyé (clients, équipe,
//    partenaires) avec le jour et l'heure, les messages programmés,
//    recherche par nom ou par mot, regroupé par jour.
// 2. Séances : filtre par mois précis (ex : août 2026) ou entre deux
//    dates, en plus de "Ce mois", "3 derniers mois"...
// 3. Rappels : date de création et date de dernière modification
//    (colonne reminders.updated_at, remplie à chaque modification).
// ============================================================
(function(){
'use strict';
if(typeof agSheet !== 'function') return;
const E = s => agEsc(String(s == null ? '' : s));
const HI = { q: '', qui: 'tous', progs: null };
window.HI = HI;
const quand = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ' à'); };
const heure = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); };
const jourLong = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); };
const nomDe = id => { const c = (typeof clients !== 'undefined' ? clients : []).find(x => x.id === id); return c ? c.name : 'Contact supprimé'; };
const roleDe = id => { const c = (typeof clients !== 'undefined' ? clients : []).find(x => x.id === id); return c && c.role && c.role !== 'client' ? c.role : ''; };

// ============================================================
// 1. HISTORIQUE DES MESSAGES
// ============================================================
async function hiProgs(){
  if(HI.progs) return HI.progs;
  try { const { data } = await sb.from('messages_programmes').select('*').order('created_at', { ascending: false }).limit(300); HI.progs = data || []; } catch(e){ HI.progs = []; }
  return HI.progs;
}
function hiLignes(){
  const L = [];
  (typeof CRM !== 'undefined' && Array.isArray(CRM.msgs) ? CRM.msgs : []).forEach(m => L.push({ quand: m.created_at, ids: [m.client_id], texte: m.text, type: 'envoye', kind: m.kind, canal: m.channel || 'whatsapp' }));
  (HI.progs || []).forEach(p => {
    const ids = Array.isArray(p.personne_ids) ? p.personne_ids : [];
    if(p.statut === 'prevu') L.push({ quand: p.envoyer_le, ids, texte: p.texte, type: 'prevu', kind: p.occasion, cree: p.created_at });
    else if(p.statut === 'annule') L.push({ quand: p.envoyer_le || p.created_at, ids, texte: p.texte, type: 'annule', kind: p.occasion, cree: p.created_at });
    else if(p.statut === 'envoye' && p.envoye_le){
      // Déjà dans client_messages si envoyé à un client : on ne le compte pas deux fois
      const dej = L.some(x => x.type === 'envoye' && x.texte === p.texte && Math.abs(new Date(x.quand) - new Date(p.envoye_le)) < 36e5);
      if(!dej) L.push({ quand: p.envoye_le, ids, texte: p.texte, type: 'envoye', kind: p.occasion });
    }
  });
  return L.filter(x => x.quand).sort((a, b) => String(b.quand).localeCompare(String(a.quand)));
}
window.hiMessages = async function(){
  agSheet('hiMsg', `<h3>Historique des messages</h3><div id="hiMsgBody"><div class="ag-empty">Chargement...</div></div>`);
  await hiProgs();
  hiMsgRendre();
};
window.hiMsgRendre = function(){
  const el = document.getElementById('hiMsgBody'); if(!el) return;
  const tous = hiLignes();
  const q = HI.q.trim().toLowerCase();
  let L = tous;
  if(HI.qui !== 'tous') L = L.filter(x => HI.qui === 'prevu' ? x.type === 'prevu' : HI.qui === 'equipe' ? x.ids.some(id => roleDe(id)) : x.ids.some(id => !roleDe(id)));
  if(q) L = L.filter(x => (x.texte || '').toLowerCase().includes(q) || x.ids.some(id => nomDe(id).toLowerCase().includes(q)));
  const nbEnv = tous.filter(x => x.type === 'envoye').length, nbPrev = tous.filter(x => x.type === 'prevu').length;
  const parJour = []; L.forEach(x => { const j = String(x.quand).slice(0, 10), g = parJour.find(p => p.j === j); if(g) g.L.push(x); else parJour.push({ j, L: [x] }); });
  const lib = k => typeof msKindLabel === 'function' ? msKindLabel(k) : (k || '');
  el.innerHTML = `<div class="bg-sum"><div>Envoyés<b>${nbEnv}</b></div><div>Programmés<b>${nbPrev}</b></div></div>
    <input id="hiQ" placeholder="Chercher un nom ou un mot..." value="${E(HI.q)}" oninput="HI.q=this.value;hiMsgRendre();setTimeout(()=>{const i=document.getElementById('hiQ');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length);}},0)">
    <div class="ag-pills" style="margin:6px 0 10px">${[['tous', 'Tout'], ['clients', 'Clients'], ['equipe', 'Équipe et partenaires'], ['prevu', 'Programmés']].map(([k, l]) => `<button type="button" class="${HI.qui === k ? 'on' : ''}" onclick="HI.qui='${k}';hiMsgRendre()">${l}</button>`).join('')}</div>
    ${parJour.length ? parJour.map(g => `<div class="hi-jour">${E(jourLong(g.j + 'T12:00:00'))}</div>${g.L.map(x => `<div class="hi-msg ${x.type}">
      <div class="hi-h"><b>${E(x.ids.length > 1 ? x.ids.length + ' personnes' : x.ids.length ? nomDe(x.ids[0]) : 'Sans destinataire')}</b><span>${x.type === 'prevu' ? 'prévu à ' : x.type === 'annule' ? 'annulé · ' : 'envoyé à '}${heure(x.quand)}</span></div>
      ${x.ids.length > 1 ? `<small class="hi-qui">${E(x.ids.slice(0, 8).map(nomDe).join(', '))}${x.ids.length > 8 ? '...' : ''}</small>` : ''}
      ${x.kind ? `<small class="hi-k">${E(lib(x.kind))}${x.cree ? ' · programmé le ' + E(quand(x.cree)) : ''}</small>` : ''}
      <p>${E(x.texte || '').replace(/\n/g, '<br>')}</p></div>`).join('')}`).join('') : '<div class="ag-empty">Aucun message trouvé.</div>'}`;
};
// L'ancien bouton "Envois" ouvre le nouvel historique
if(typeof crmHistory === 'function') crmHistory = function(){ return hiMessages(); };
// Dans "Écrire un message" : accès direct à l'historique
if(typeof msgEcrire === 'function'){
  const ecrireHi = msgEcrire;
  msgEcrire = function(){
    const r = ecrireHi.apply(this, arguments);
    setTimeout(() => {
      const sh = document.getElementById('msSheet'), w = sh && sh.querySelector('.modal-wrap');
      if(w && !w.querySelector('.hi-lien')) w.insertAdjacentHTML('afterbegin', `<button type="button" class="hi-lien" onclick="hiMessages()">${agIcon('history', 14)} Historique des messages</button>`);
    }, 60);
    return r;
  };
  window.msgEcrire = msgEcrire;
}

// ============================================================
// 2. SÉANCES : MOIS PRÉCIS OU ENTRE DEUX DATES
// ============================================================
function hiSeancesUi(){
  const sel = document.getElementById('shootMonthFilter'); if(!sel || sel.dataset.hi) return;
  sel.dataset.hi = '1';
  sel.insertAdjacentHTML('beforeend', '<option value="hi_mois">Un mois précis...</option><option value="hi_periode">Entre deux dates...</option>');
  const box = document.createElement('div'); box.id = 'hiPer'; box.className = 'hi-per'; box.style.display = 'none';
  const m = new Date().toISOString().slice(0, 7);
  box.innerHTML = `<div id="hiPerM"><label style="margin:0 0 6px;font-size:12px">Quel mois ?</label><input type="month" id="hiMois" value="${m}" onchange="renderShoots()" style="font-size:13px;padding:10px"></div>
    <div id="hiPerP" class="hi-2"><div><label style="margin:0 0 6px;font-size:12px">Du</label><input type="date" id="hiDu" onchange="renderShoots()" style="font-size:13px;padding:10px"></div><div><label style="margin:0 0 6px;font-size:12px">Au</label><input type="date" id="hiAu" onchange="renderShoots()" style="font-size:13px;padding:10px"></div></div>`;
  const grille = sel.closest('div[style*="grid"]') || sel.parentElement;
  grille.insertAdjacentElement('afterend', box);
}
function hiPerMaj(){
  const sel = document.getElementById('shootMonthFilter'), box = document.getElementById('hiPer'); if(!sel || !box) return;
  const v = sel.value; box.style.display = v === 'hi_mois' || v === 'hi_periode' ? '' : 'none';
  document.getElementById('hiPerM').style.display = v === 'hi_mois' ? '' : 'none';
  document.getElementById('hiPerP').style.display = v === 'hi_periode' ? '' : 'none';
}
window.hiFiltreSeance = function(s){
  const v = (document.getElementById('shootMonthFilter') || {}).value, d = String(s.date || '').slice(0, 10);
  if(v === 'hi_mois'){ const m = (document.getElementById('hiMois') || {}).value; return !m || d.slice(0, 7) === m; }
  if(v === 'hi_periode'){ const du = (document.getElementById('hiDu') || {}).value, au = (document.getElementById('hiAu') || {}).value; return !!d && (!du || d >= du) && (!au || d <= au); }
  return true;
};
if(typeof renderShoots === 'function'){
  const shootsHi = renderShoots;
  renderShoots = function(){
    try { hiSeancesUi(); hiPerMaj(); } catch(e){}
    const sel = document.getElementById('shootMonthFilter'), v = sel ? sel.value : 'all';
    if(v !== 'hi_mois' && v !== 'hi_periode') return shootsHi.apply(this, arguments);
    // On montre seulement les séances de la période, puis on laisse l'affichage habituel faire le reste
    const tout = shoots;
    try {
      shoots = tout.filter(hiFiltreSeance);
      sel.value = 'all';
      return shootsHi.apply(this, arguments);
    } finally { shoots = tout; sel.value = v; }
  };
}
if(typeof resetShootFilters === 'function'){
  const resetHi = resetShootFilters;
  resetShootFilters = function(){ const r = resetHi.apply(this, arguments); try { hiPerMaj(); } catch(e){} return r; };
}

// ============================================================
// 3. RAPPELS : CRÉÉ LE / MODIFIÉ LE
// ============================================================
if(typeof dbUpdate === 'function'){
  const majHi = dbUpdate;
  dbUpdate = async function(table, id, data){
    if(table === 'reminders' && data && typeof data === 'object' && !('updated_at' in data)) data = { ...data, updated_at: new Date().toISOString() };
    return majHi.call(this, table, id, data);
  };
}
if(typeof renderReminders === 'function'){
  const remHi = renderReminders;
  renderReminders = function(){
    const r = remHi.apply(this, arguments);
    try {
      const el = document.getElementById('remindersList'); if(!el) return r;
      const sorted = [...reminders].sort((a, b) => String(a.due_date || a.created_at || '').localeCompare(String(b.due_date || b.created_at || '')));
      el.querySelectorAll(':scope > .reminder').forEach((card, i) => {
        const x = sorted[i]; if(!x) return;
        const meta = card.querySelector('.reminder-meta'); if(!meta || meta.querySelector('.hi-dates')) return;
        meta.insertAdjacentHTML('afterend', `<div class="hi-dates">Créé le ${E(quand(x.created_at))}${x.updated_at ? ` · Modifié le ${E(quand(x.updated_at))}` : ''}</div>`);
      });
    } catch(e){ console.warn('hi rappels', e); }
    return r;
  };
}

if(window.CA_ITEMS){
  CA_ITEMS.push({ id: 'histomsg', s: 'Clients', t: 'Historique des messages', q: 'Chaque message envoyé aux clients et à l\'équipe, avec le jour et l\'heure, et les messages programmés. Recherche par nom ou par mot.', ou: 'Studio > Clients > Envois', m: 'historique message envoyé quand heure whatsapp', go: ['hiMessages', []] });
  CA_ITEMS.push({ id: 'filtremois', s: 'Séances', t: 'Séances d\'un mois précis', q: 'Filtre des séances par mois précis (ex : août) ou entre deux dates.', ou: 'Studio > Séances > Filtres avancés > Mois', m: 'filtre mois période date séance', go: 'photo' });
}

(function hiCss(){
  if(document.getElementById('hiCss')) return;
  const st = document.createElement('style'); st.id = 'hiCss';
  st.textContent = `.hi-jour{margin:14px 0 6px;font-size:12px;font-weight:700;color:var(--muted);text-transform:capitalize}
.hi-msg{padding:10px 12px;border-radius:12px;background:var(--card2);border:1px solid var(--border);margin:6px 0}
.hi-msg.prevu{border-color:var(--accent);border-style:dashed}.hi-msg.annule{opacity:.55}
.hi-h{display:flex;justify-content:space-between;gap:8px}.hi-h b{color:var(--text);font-size:13.5px}.hi-h span{color:var(--muted);font-size:12px;white-space:nowrap}
.hi-qui,.hi-k{display:block;color:var(--muted);font-size:11.5px;margin-top:2px}.hi-msg p{margin:6px 0 0;font-size:13px;line-height:1.45;color:var(--text);white-space:normal}
.hi-lien{display:inline-flex;align-items:center;gap:6px;margin:0 0 8px;padding:7px 12px;border-radius:99px;border:1px solid var(--border);background:var(--card2);color:var(--accent);font-size:12.5px;font-weight:600;cursor:pointer;width:auto!important}
.hi-per{margin-bottom:10px}.hi-2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.hi-dates{font-size:11px;color:var(--muted);margin-top:4px}`;
  document.head.appendChild(st);
})();
try { if(document.getElementById('shootMonthFilter')) hiSeancesUi(); } catch(e){}
})();
