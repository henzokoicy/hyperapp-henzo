// ============================================================
// SUPER APP HENZO - EQUIPE ET PARTENAIRES
// - Roles : client, modele, ami, maquilleuse, coiffeuse, assistant...
// - Vue "Equipe & partenaires" dans l'onglet Clients
// - Fiche d'une personne : seances, paye, rapporte, notes, progression, IA
// - Seance collaboration et equipe sur une seance (formulaire seance)
// - Ajouter un contact vite : contacts du telephone, .vcf, texte colle, capture
// Les personnes qui ne sont pas clientes ne comptent pas dans les chiffres clients.
// ============================================================

// Une fiche est cliente si son role est vide, null ou 'client'
window.estClient = function(c){
  if(!c) return false;
  const r = String(c.role == null ? '' : c.role).trim().toLowerCase();
  return !r || r === 'client';
};

const EQ = { evals: [], loaded: false, role: '', q: '', besoin: '', sh: { collab: false, equipe: [], had: false }, ev: null, after: null, imp: {} };
const EQ_ROLES = [
  { k: 'client', n: 'Client', p: 'Clients' },
  { k: 'modele', n: 'Modèle', p: 'Modèles' },
  { k: 'ami', n: 'Ami / proche', p: 'Amis et proches' },
  { k: 'maquilleuse', n: 'Maquilleuse', p: 'Maquilleuses' },
  { k: 'coiffeuse', n: 'Coiffeuse', p: 'Coiffeuses' },
  { k: 'assistant', n: 'Assistant', p: 'Assistants' },
  { k: 'videaste', n: 'Vidéaste', p: 'Vidéastes' },
  { k: 'decorateur', n: 'Décorateur', p: 'Décorateurs' },
  { k: 'partenaire', n: 'Partenaire (lieu, boutique...)', p: 'Partenaires' },
  { k: 'autre', n: 'Autre', p: 'Autres' }
];
// Charge de seance -> roles qu'on peut lui relier
const EQ_CHARGE_ROLES = { 'Makeup': ['maquilleuse', 'coiffeuse'], 'Assistant': ['assistant'], 'Location lieu': ['partenaire'] };
const EQ_TYPES = ['Mariage', 'Dot', 'Anniversaire', 'Grossesse', 'Shooting Studio', 'Shoot Extérieur', 'Événement', 'Portrait', 'Mode', 'Bébé'];
const EQ_BESOINS = [
  ['r:maquilleuse', 'Maquillage'], ['r:coiffeuse', 'Coiffure'], ['r:assistant', 'Un assistant'], ['r:videaste', 'De la vidéo'],
  ['r:decorateur', 'Du décor'], ['r:partenaire', 'Un lieu, une boutique'], ['r:modele', 'Un modèle'],
  ...EQ_TYPES.map(t => ['t:' + t, 'Une séance ' + t.toLowerCase()])
];
const EQ_CRIT = [['ponctualite', 'Ponctualité'], ['qualite', 'Qualité du travail'], ['attitude', 'Attitude'], ['note', 'Note globale']];

// ---------- Outils ----------
const eqDay = 864e5;
function eqE(s){ return typeof agEsc === 'function' ? agEsc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function eqF(n){ return typeof agF === 'function' ? agF(n) : Math.round(Number(n) || 0) + ' F'; }
function eqI(n, s){ return typeof agIcon === 'function' ? agIcon(n, s) : ''; }
function eqNorm(s){ return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }
function eqCancelled(s){ return /annul/i.test((s && s.status) || ''); }
function eqDate(d, o){ return d ? new Date(d).toLocaleDateString('fr-FR', o || { day: 'numeric', month: 'short', year: 'numeric' }) : ''; }
function eqAgo(d){
  if(!d) return 'jamais';
  const j = Math.floor((Date.now() - new Date(d)) / eqDay);
  if(typeof crmAgo === 'function') return crmAgo(j);
  return j < 1 ? "aujourd'hui" : `il y a ${j} j`;
}
function eqNote(n){ return n == null || isNaN(n) ? '-' : (Math.round(n * 10) / 10).toString().replace('.', ','); }
function eqToday(){ return new Date().toISOString().slice(0, 10); }
function eqClients(){ return typeof clients !== 'undefined' && Array.isArray(clients) ? clients : []; }
function eqShoots(){ return typeof shoots !== 'undefined' && Array.isArray(shoots) ? shoots : []; }
function eqPerson(id){ return eqClients().find(c => c.id === Number(id)) || null; }
function eqFirst(c){
  if(typeof crmFirst === 'function') return crmFirst(c);
  return String((c && c.name) || '').split(/\s+/)[0];
}
function eqInitials(c){ return typeof crmInitials === 'function' ? crmInitials(c) : String((c && c.name) || '?').slice(0, 2).toUpperCase(); }

// ---------- Roles ----------
function eqRoleKeyOf(r){
  const n = eqNorm(r);
  if(!n) return 'client';
  const f = EQ_ROLES.find(x => x.k === n || eqNorm(x.n) === n) || EQ_ROLES.find(x => n.length >= 5 && x.k.slice(0, 5) === n.slice(0, 5));
  if(f) return f.k;
  if(/^ami|proche|famil/.test(n)) return 'ami';
  if(/lieu|boutique|partenaire|salle|hotel/.test(n)) return 'partenaire';
  return 'autre';
}
function eqRoleKey(c){ return eqRoleKeyOf(c && c.role); }
function eqRoleLabel(c){ const k = typeof c === 'string' ? c : eqRoleKey(c); const r = EQ_ROLES.find(x => x.k === k); return r ? r.n.replace(/ \(.*\)$/, '') : 'Autre'; }
function eqRolePlural(k){ const r = EQ_ROLES.find(x => x.k === k); return r ? r.p : 'Autres'; }
function eqRoleSelectHtml(id, role){
  const k = eqRoleKeyOf(role);
  return `<label>Rôle</label><select id="${id}">${EQ_ROLES.map(r => `<option value="${r.k}" ${r.k === k ? 'selected' : ''}>${eqE(r.n)}</option>`).join('')}</select>
    <div class="ag-hint" style="margin-top:4px">Modèle, maquilleuse, ami... : la fiche va dans « Équipe & partenaires » et ne compte pas dans tes clients.</div>`;
}

// ---------- Donnees ----------
function eqPeople(){ return eqClients().filter(c => !window.estClient(c)); }
function eqInfo(c){ return c && c.equipe && typeof c.equipe === 'object' && !Array.isArray(c.equipe) ? c.equipe : {}; }
function eqActif(c){ return eqInfo(c).actif !== false; }
function eqTeam(s){ return Array.isArray(s && s.equipe) ? s.equipe : []; }
function eqCharges(s){ return Array.isArray(s && s.shoot_expenses) ? s.shoot_expenses : []; }
function eqIsPast(s){ return s && s.date && new Date(s.date) <= new Date(); }
// Seances ou la personne a travaille (equipe de la seance, ou charge reliee a elle)
function eqWorked(pid){
  pid = Number(pid);
  return eqShoots().filter(s => !eqCancelled(s) && (eqTeam(s).some(e => Number(e.personne_id) === pid) || eqCharges(s).some(e => Number(e.personne_id) === pid)))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}
// Ce que tu lui as paye sur une seance : charges reliees a elle, sinon le montant note dans l'equipe
function eqPaidOn(s, pid){
  pid = Number(pid);
  const ch = eqCharges(s).filter(e => Number(e.personne_id) === pid).reduce((a, e) => a + (Number(e.amount) || 0), 0);
  if(ch) return ch;
  const t = eqTeam(s).find(e => Number(e.personne_id) === pid);
  return Number(t && t.montant) || 0;
}
function eqRoleOn(s, pid){ const t = eqTeam(s).find(e => Number(e.personne_id) === Number(pid)); return (t && t.role) || eqRoleKey(eqPerson(pid)); }
// Seances faites "ensemble" (la personne est le sujet de la seance : modele, ami...)
function eqWith(pid){ return eqShoots().filter(s => !eqCancelled(s) && Number(s.client_id) === Number(pid)).sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))); }
function eqEvalsOf(pid){ return EQ.evals.filter(e => Number(e.personne_id) === Number(pid)).sort((a, b) => String(a.date || a.created_at || '').localeCompare(String(b.date || b.created_at || ''))); }
function eqMean(l){ const v = l.map(Number).filter(x => x > 0); return v.length ? v.reduce((a, x) => a + x, 0) / v.length : null; }
function eqStats(c){
  const w = eqWorked(c.id), done = w.filter(eqIsPast);
  const paid = w.reduce((a, s) => a + eqPaidOn(s, c.id), 0);
  const rapport = w.reduce((a, s) => a + (Number(s.montant_recu) || 0), 0);
  const ev = eqEvalsOf(c.id), evC = ev.filter(e => e.source === 'client');
  const avg = eqMean(ev.map(e => e.note));
  const notes = ev.filter(e => Number(e.note) > 0).map(e => Number(e.note));
  let trend = null;
  if(notes.length >= 2){
    const k = Math.min(3, Math.floor(notes.length / 2)) || 1;
    const rec = eqMean(notes.slice(-k)), old = eqMean(notes.slice(-2 * k, -k));
    trend = rec - old >= 0.3 ? 'hausse' : rec - old <= -0.3 ? 'baisse' : 'stable';
  }
  const last = done[0] ? done[0].date : null;
  return {
    w, done, count: w.length, paid, rapport, ev, evC, avg, notes, trend, last,
    ponct: eqMean(ev.map(e => e.ponctualite)), qual: eqMean(ev.map(e => e.qualite)), att: eqMean(ev.map(e => e.attitude)),
    avgClient: eqMean(evC.map(e => e.note)), reco: evC.length >= 1 && eqMean(evC.map(e => e.note)) >= 4
  };
}
// Fiabilite : moyenne de la ponctualite, de l'attitude et de la note globale
function eqFiabilite(s){ const v = [s.ponct, s.att, s.avg].filter(x => x != null); return v.length ? v.reduce((a, x) => a + x, 0) / v.length : null; }
// Seances passees ou elle etait, pas encore notees par toi
function eqPending(c, maxDays){
  const notees = new Set(EQ.evals.filter(e => Number(e.personne_id) === c.id && e.source !== 'client' && e.shoot_id).map(e => Number(e.shoot_id)));
  return eqWorked(c.id).filter(s => eqIsPast(s) && !notees.has(s.id) && !eqSkipped(c.id, s.id)
    && (!maxDays || (Date.now() - new Date(s.date)) / eqDay <= maxDays));
}
function eqSkipped(pid, sid){ try { return localStorage.getItem('eq_skip_' + pid + '_' + sid) === '1'; } catch(e){ return false; } }
function eqSkip(pid, sid){ try { localStorage.setItem('eq_skip_' + pid + '_' + sid, '1'); } catch(e){} eqRefresh(pid); }
function eqShootLabel(s){
  const c = s && s.client_id ? eqPerson(s.client_id) : null;
  return c ? `la séance de ${c.name}` : `la séance ${(s && s.type) || ''} du ${eqDate(s && s.date, { day: 'numeric', month: 'short' })}`.replace(/\s+/g, ' ');
}

async function eqLoad(){
  try {
    const { data, error } = await sb.from('equipe_evals').select('*').order('date', { ascending: false });
    if(!error) EQ.evals = data || [];
  } catch(e){ console.warn('equipe_evals', e); }
  EQ.loaded = true;
}
async function eqUid(){ try { const { data } = await sb.auth.getUser(); return data && data.user ? data.user.id : null; } catch(e){ return null; } }

// ============================================================
// VUE "EQUIPE & PARTENAIRES"
// ============================================================
function eqSwitchHtml(v){
  const n = eqPeople().length;
  return `<div class="eq-switch">
    <button class="${v === 'clients' ? 'on' : ''}" onclick="CRM.view='clients';crmRender()">Clients</button>
    <button class="${v === 'equipe' ? 'on' : ''}" onclick="CRM.view='equipe';crmRender()">Équipe & partenaires${n ? ` <i>${n}</i>` : ''}</button></div>`;
}
function eqRowHtml(c, s, extra){
  return `<div class="crm-row ${eqActif(c) ? '' : 'off'}" onclick="eqOpen(${c.id})">
    <div class="crm-av">${eqE(eqInitials(c))}</div>
    <div class="d"><b>${eqE(c.name)}</b><span><i class="crm-tag eq-rtag">${eqE(eqRoleLabel(c))}</i>${extra != null ? eqE(extra) : `${s.count} séance${s.count > 1 ? 's' : ''} · dernier travail ${eqAgo(s.last)}`}</span></div>
    <div class="m eq-m">${s.avg != null ? `<b class="eq-avg">${eqI('star', 13)} ${eqNote(s.avg)}</b>` : '<span class="eq-nonote">pas noté</span>'}${s.reco ? '<span class="eq-reco">Recommandé</span>' : ''}</div>
  </div>`;
}
async function eqRender(el){
  el = el || (typeof crmBody === 'function' ? crmBody() : null); if(!el) return;
  if(!EQ.loaded){ el.innerHTML = '<div class="ag-empty">Chargement...</div>'; await eqLoad(); }
  eqStyle();
  const all = eqPeople().map(c => ({ c, s: eqStats(c) }));
  const actives = all.filter(x => eqActif(x.c));
  const paid = all.reduce((a, x) => a + x.s.paid, 0);
  const nbSeances = new Set(all.flatMap(x => x.s.w.map(s => s.id))).size;
  // A noter (60 derniers jours)
  const pend = [];
  all.forEach(x => eqPending(x.c, 60).forEach(s => pend.push({ c: x.c, s })));
  pend.sort((a, b) => String(b.s.date).localeCompare(String(a.s.date)));
  // Pas de travail depuis 3 mois
  const old = actives.filter(x => x.s.last && (Date.now() - new Date(x.s.last)) / eqDay >= 90 && !(typeof crmSnoozed === 'function' && crmSnoozed('eq_' + x.c.id)))
    .sort((a, b) => (b.s.avg || 0) - (a.s.avg || 0)).slice(0, 3);
  // Les plus fiables
  const fiables = all.filter(x => x.s.ev.length).map(x => ({ ...x, f: eqFiabilite(x.s) })).filter(x => x.f != null)
    .sort((a, b) => b.f - a.f || b.s.ev.length - a.s.ev.length).slice(0, 5);
  // Liste
  const roles = EQ_ROLES.filter(r => r.k !== 'client').map(r => ({ ...r, n: all.filter(x => eqRoleKey(x.c) === r.k).length })).filter(r => r.n);
  const q = eqNorm(EQ.q);
  const list = all.filter(x => !EQ.role || eqRoleKey(x.c) === EQ.role)
    .filter(x => !q || eqNorm([x.c.name, x.c.phone, eqInfo(x.c).specialite, eqInfo(x.c).instagram].join(' ')).includes(q));
  const groups = EQ_ROLES.filter(r => r.k !== 'client').map(r => ({ r, l: list.filter(x => eqRoleKey(x.c) === r.k)
    .sort((a, b) => eqActif(b.c) - eqActif(a.c) || (b.s.avg || 0) - (a.s.avg || 0) || b.s.count - a.s.count || a.c.name.localeCompare(b.c.name)) })).filter(g => g.l.length);
  const qui = EQ.besoin ? eqQui(EQ.besoin) : [];

  el.innerHTML = `
    ${eqSwitchHtml('equipe')}
    <div class="ag-total">
      <div class="lbl">Équipe & partenaires</div>
      <div class="amt">${all.length} <small>personne${all.length > 1 ? 's' : ''}</small></div>
      <div class="split"><div>Actives<b>${actives.length}</b></div><div>Séances ensemble<b>${nbSeances}</b></div><div>Payé à l'équipe<b>${eqF(paid)}</b></div></div>
    </div>
    <div class="ag-actions">
      <button class="ag-act main" onclick="eqEdit(null)"><span>${eqI('plus')}</span>Ajouter</button>
      <button class="ag-act" onclick="document.getElementById('eqQuiSec').scrollIntoView({behavior:'smooth'})"><span>${eqI('search')}</span>Qui appeler</button>
      <button class="ag-act" onclick="eqExport()"><span>${eqI('chat')}</span>Partager</button>
      <button class="ag-act" onclick="CRM.view='clients';crmRender()"><span>${eqI('users')}</span>Clients</button>
    </div>

    ${pend.length ? `<div class="ag-sec"><h3>À noter</h3><span class="crm-count">${pend.length}</span></div>
      ${pend.slice(0, 4).map(x => eqPendCard(x.c, x.s)).join('')}<div style="height:14px"></div>` : ''}

    ${old.map(x => `<div class="crm-fete eq-old"><div class="ic">${eqI('history')}</div>
      <div class="d" onclick="eqOpen(${x.c.id})"><b>Tu n'as pas travaillé avec ${eqE(eqFirst(x.c))} depuis ${eqAgo(x.s.last).replace('il y a ', '')}</b><span>${eqE(eqRoleLabel(x.c))}${x.s.avg != null ? ' · note ' + eqNote(x.s.avg) + '/5' : ''} · prends des nouvelles</span></div>
      <button class="ag-ibtn" title="Écrire sur WhatsApp" onclick="crmWa(${x.c.id},'')">${eqI('chat', 17)}</button>
      <button class="ag-ibtn" title="Plus tard (30 jours)" onclick="crmSnooze('eq_${x.c.id}',30)">${eqI('history', 17)}</button></div>`).join('')}

    <div class="ag-sec" id="eqQuiSec" style="margin-top:18px"><h3>Qui appeler pour...</h3></div>
    <select id="eqBesoin" onchange="EQ.besoin=this.value;eqRender()"><option value="">Choisis une séance ou un besoin</option>
      ${EQ_BESOINS.map(([k, n]) => `<option value="${eqE(k)}" ${EQ.besoin === k ? 'selected' : ''}>${eqE(n)}</option>`).join('')}</select>
    ${EQ.besoin ? `<div class="ag-list" id="eqQuiList" style="margin-top:10px">${qui.length ? qui.slice(0, 6).map((x, i) => eqRowHtml(x.c, x.s, `${i === 0 ? 'À appeler en premier · ' : ''}${x.why || eqRoleLabel(x.c)}${x.s.count ? ' · ' + x.s.count + ' séance' + (x.s.count > 1 ? 's' : '') : ''}`)).join('')
      : '<div class="ag-empty">Personne pour ce besoin. Remplis « À rappeler pour » ou la spécialité dans leurs fiches.</div>'}</div>` : '<div style="height:14px"></div>'}

    ${fiables.length ? `<div class="ag-sec"><h3>Les plus fiables</h3></div>
      <div class="ag-list">${fiables.map((x, i) => `<div class="crm-row" onclick="eqOpen(${x.c.id})"><div class="eq-rank">${i + 1}</div>
        <div class="d"><b>${eqE(x.c.name)}</b><span>${eqE(eqRoleLabel(x.c))} · ponctualité ${eqNote(x.s.ponct)} · attitude ${eqNote(x.s.att)} · ${x.s.ev.length} note${x.s.ev.length > 1 ? 's' : ''}</span></div>
        <div class="m"><b class="eq-avg">${eqNote(x.f)}</b></div></div>`).join('')}</div>` : ''}

    <div class="ag-sec"><h3>Mon équipe</h3></div>
    ${roles.length > 1 ? `<div class="ag-pills crm-segs"><button class="${!EQ.role ? 'on' : ''}" onclick="EQ.role='';eqRender()">Tous <i>${all.length}</i></button>${roles.map(r => `<button class="${EQ.role === r.k ? 'on' : ''}" onclick="EQ.role='${r.k}';eqRender()">${eqE(r.p)} <i>${r.n}</i></button>`).join('')}</div>` : ''}
    ${all.length > 5 ? `<input id="eqQ" placeholder="Rechercher un nom, un numéro" value="${eqE(EQ.q)}" oninput="EQ.q=this.value;clearTimeout(EQ.qt);EQ.qt=setTimeout(()=>{eqRender().then(()=>{const i=document.getElementById('eqQ');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length);}})},250)" style="margin:10px 0">` : ''}
    ${groups.length ? groups.map(g => `<h4 class="crm-h4">${eqE(g.r.p)} <span class="crm-count">${g.l.length}</span></h4><div class="ag-list">${g.l.map(x => eqRowHtml(x.c, x.s)).join('')}</div>`).join('')
      : `<div class="ag-list"><div class="ag-empty">${all.length ? 'Personne ici.' : 'Ajoute tes maquilleuses, assistants, modèles, amis qui posent... Ils ne comptent pas dans tes clients.'}</div></div>`}
  `;
}
// "Qui appeler pour..." : liste triee par note
function eqQui(b){
  const kind = b.slice(0, 1), val = b.slice(2), v = eqNorm(val);
  const ppl = eqPeople().filter(eqActif);
  let list;
  if(kind === 'r') list = ppl.filter(c => eqRoleKey(c) === val).map(c => ({ c, why: eqInfo(c).specialite || '' }));
  else list = ppl.map(c => {
    const inf = eqInfo(c);
    const rap = (Array.isArray(inf.a_rappeler_pour) ? inf.a_rappeler_pour : []).some(x => { const n = eqNorm(x); return n && (n.includes(v) || v.includes(n)); });
    const spec = !!inf.specialite && eqNorm(inf.specialite).includes(v);
    const n = eqWorked(c.id).filter(s => eqNorm(s.type).includes(v)).length;
    return { c, ok: rap || spec || n > 0, why: [eqRoleLabel(c), rap ? 'à rappeler pour ' + val.toLowerCase() : '', n ? `${n} ${val.toLowerCase()} ensemble` : ''].filter(Boolean).join(' · ') };
  }).filter(x => x.ok);
  return list.map(x => ({ ...x, s: eqStats(x.c) })).sort((a, b) => (b.s.avg || 0) - (a.s.avg || 0) || b.s.count - a.s.count);
}
function eqPendCard(c, s){
  return `<div class="eq-pend" onclick="eqEvalForm(${c.id},${s.id},'moi')">
    <div class="ic">${eqI('star', 18)}</div>
    <div class="d"><b>Comment était ${eqE(eqFirst(c))} sur ${eqE(eqShootLabel(s))} ?</b><span>${eqE(eqRoleLabel(eqRoleOn(s, c.id)))} · ${eqDate(s.date, { day: 'numeric', month: 'long' })} · ponctualité, qualité, attitude</span></div>
    <button class="ag-ibtn" title="Ne pas noter" onclick="event.stopPropagation();eqSkip(${c.id},${s.id})">${eqI('ban', 16)}</button>
  </div>`;
}
function eqRefresh(pid){
  if(pid && document.getElementById('eqFiche')) eqOpen(pid);
  const p = document.querySelector('.page.active');
  if(p && p.id === 'page-clients' && typeof crmRender === 'function') crmRender();
}

// ---------- Export WhatsApp ----------
function eqExportText(role){
  const ppl = eqPeople().filter(eqActif).filter(c => !role || eqRoleKey(c) === role).map(c => ({ c, s: eqStats(c) }))
    .sort((a, b) => eqRoleKey(a.c).localeCompare(eqRoleKey(b.c)) || (b.s.avg || 0) - (a.s.avg || 0));
  if(!ppl.length) return '';
  const groups = {};
  ppl.forEach(x => (groups[eqRoleKey(x.c)] = groups[eqRoleKey(x.c)] || []).push(x));
  return Object.entries(groups).map(([k, l]) => `Mes contacts ${eqRolePlural(k).toLowerCase()} :\n` + l.map(({ c, s }) => {
    const inf = eqInfo(c);
    return `- ${c.name}${c.phone ? ' : ' + c.phone : ''}${inf.specialite ? ' (' + inf.specialite + ')' : ''}${s.avg != null ? ', note ' + eqNote(s.avg) + '/5' : ''}${inf.instagram ? ', Instagram ' + inf.instagram : ''}`;
  }).join('\n')).join('\n\n');
}
function eqExport(){
  const role = EQ.role || '';
  const roles = EQ_ROLES.filter(r => r.k !== 'client' && eqPeople().some(c => eqRoleKey(c) === r.k));
  agSheet('eqExp', `<h3>Partager mes contacts</h3>
    <label>Qui</label><select id="eqExpRole" onchange="document.getElementById('eqExpTxt').value=eqExportText(this.value)"><option value="">Toute l'équipe</option>${roles.map(r => `<option value="${r.k}" ${r.k === role ? 'selected' : ''}>${eqE(r.p)}</option>`).join('')}</select>
    <label>Message</label><textarea id="eqExpTxt" rows="9">${eqE(eqExportText(role))}</textarea>
    <div class="crm-2" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">
      <button class="btn-secondary" onclick="crmCopy(document.getElementById('eqExpTxt').value)">Copier</button>
      <button class="btn-primary" onclick="window.open('https://wa.me/?text='+encodeURIComponent(document.getElementById('eqExpTxt').value),'_blank')">WhatsApp</button></div>
    <div class="ag-hint">Les personnes inactives ne sont pas dans la liste.</div>`);
}

// ============================================================
// FICHE D'UNE PERSONNE (pas cliente)
// ============================================================
function eqOpen(id){
  const c = eqPerson(id); if(!c) return;
  eqStyle();
  if(!EQ.loaded){ eqLoad().then(() => { if(document.getElementById('eqFiche')) eqOpen(id); }); }
  const s = eqStats(c), inf = eqInfo(c), role = eqRoleKey(c);
  const pend = eqPending(c).slice(0, 3);
  const withShoots = eqWith(c.id);
  const sujet = role === 'modele' || role === 'ami' || withShoots.length > 0;
  const boards = typeof MB !== 'undefined' && Array.isArray(MB.boards) ? MB.boards.filter(b => Number(b.client_id) === c.id || withShoots.some(x => x.id === b.shoot_id)) : [];
  const rap = Array.isArray(inf.a_rappeler_pour) ? inf.a_rappeler_pour.filter(Boolean) : [];
  const tel = typeof crmPhone === 'function' ? crmPhone(c.phone) : String(c.phone || '').replace(/\D/g, '');
  const insta = String(inf.instagram || '').replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/.*$/, '');
  agSheet('eqFiche', `
    <div class="crm-head"><div class="crm-av big">${eqE(eqInitials(c))}</div><div style="min-width:0"><h3 style="margin:0">${eqE(c.name)}</h3>
      <div class="ag-hint" style="margin-top:2px">${eqE([eqRoleLabel(c), inf.specialite].filter(Boolean).join(' · '))}</div></div></div>
    <div class="crm-tags">${eqActif(c) ? '<i class="eq-on">Actif</i>' : '<i class="eq-off">Inactif</i>'}${s.reco ? '<i class="eq-reco-t">Recommandé par les clients</i>' : ''}${rap.map(r => `<i>${eqE(r)}</i>`).join('')}</div>
    <div class="ag-actions" style="margin:12px 0">
      <button class="ag-act main" onclick="crmWa(${c.id},'')"><span>${eqI('chat')}</span>WhatsApp</button>
      <button class="ag-act" onclick="${tel ? `location.href='tel:+${tel}'` : `agAlert('Pas de numéro dans sa fiche.')`}"><span>${eqI('phoneCall')}</span>Appeler</button>
      <button class="ag-act" onclick="eqEdit(${c.id})"><span>${eqI('edit')}</span>Modifier</button>
      <button class="ag-act" onclick="eqAnalyse(${c.id})"><span>${eqI('sparkles')}</span>Analyse IA</button>
    </div>
    <div class="crm-kpis">
      <div><b>${s.count}</b><span>séance${s.count > 1 ? 's' : ''}</span></div>
      <div><b>${eqF(s.paid)}</b><span>tu lui as payé</span></div>
      <div><b>${eqF(s.rapport)}</b><span>ces séances ont rapporté</span></div>
    </div>

    ${pend.length ? `<h4 class="crm-h4">À noter</h4>${pend.map(x => eqPendCard(c, x)).join('')}` : ''}

    <h4 class="crm-h4">Progression</h4>
    ${eqProgHtml(s)}
    <div class="crm-2" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
      <button class="btn-secondary" onclick="eqEvalForm(${c.id},null,'moi')">Ajouter une note</button>
      <button class="btn-secondary" onclick="eqEvalForm(${c.id},null,'client')">Retour d'un client</button>
    </div>

    <div id="eqIaBox">${inf.ia && inf.ia.texte ? eqIaHtml(inf.ia) : ''}</div>

    <h4 class="crm-h4">Infos</h4>
    <div class="crm-info">
      <div><span>Téléphone</span><b>${eqE(c.phone || 'Non renseigné')}</b></div>
      ${insta ? `<div><span>Instagram</span><b><a href="https://instagram.com/${eqE(insta)}" target="_blank" rel="noopener" style="color:var(--accent)">@${eqE(insta)}</a></b></div>` : ''}
      ${inf.specialite ? `<div><span>Spécialité</span><b>${eqE(inf.specialite)}</b></div>` : ''}
      <div><span>Tarif habituel</span><b>${Number(inf.tarif_habituel) > 0 ? eqF(inf.tarif_habituel) : 'Non renseigné'}</b></div>
      ${inf.disponibilites ? `<div><span>Disponibilités</span><b>${eqE(inf.disponibilites)}</b></div>` : ''}
      <div><span>À rappeler pour</span><b>${rap.length ? eqE(rap.join(', ')) : 'Non renseigné'}</b></div>
      ${inf.notes_pro ? `<div><span>Notes pro</span><b>${eqE(inf.notes_pro)}</b></div>` : ''}
    </div>

    <h4 class="crm-h4">Séances où ${eqE(eqFirst(c))} a travaillé</h4>
    <div class="ag-list">${s.w.length ? s.w.map(x => `<div class="crm-line"><div><b>${eqE(x.type || 'Séance')}${x.collab ? ' <i class="crm-tag">Collab</i>' : ''}</b><span>${eqE(eqShootLabel(x).replace(/^la séance /, ''))} · ${eqDate(x.date)} · ${eqE(eqRoleLabel(eqRoleOn(x, c.id)))}</span></div>
      <div class="eq-money"><b>${eqPaidOn(x, c.id) ? 'Payé ' + eqF(eqPaidOn(x, c.id)) : 'Pas payé'}</b><span>Reçu ${eqF(x.montant_recu)}</span></div></div>`).join('')
      : `<div class="ag-empty">Aucune séance pour le moment. Ajoute ${eqE(eqFirst(c))} dans « Équipe sur cette séance » du formulaire de séance.</div>`}</div>

    ${sujet ? `<h4 class="crm-h4">Séances ensemble</h4>
      <div class="ag-list">${withShoots.length ? withShoots.map(x => `<div class="crm-line"><div><b>${eqE(x.type || 'Séance')}${x.collab ? ' <i class="crm-tag">Collab</i>' : ''}</b><span>${eqDate(x.date)}${eqIsPast(x) ? '' : ' · à venir'}</span></div><b>${x.collab ? 'Sans prix' : eqF(x.price)}</b></div>`).join('')
        : '<div class="ag-empty">Pas encore de séance ensemble. Crée une séance et coche « Séance collaboration ».</div>'}</div>
      <h4 class="crm-h4">Moodboards</h4>
      <div class="ag-list">${boards.length ? boards.map(b => `<div class="crm-line" style="cursor:pointer" onclick="agCloseSheet('eqFiche');agGoTab('mood');setTimeout(()=>{if(typeof MB!=='undefined'){MB.cur=${b.id};mbRenderBoard();}},300)"><div><b>${eqE(b.title || 'Tableau')}</b><span>${eqE(b.shoot_type || '')}</span></div>${eqI('chev', 16)}</div>`).join('') : '<div class="ag-empty">Aucun moodboard.</div>'}</div>
      <button class="crm-link" onclick="eqNewBoard(${c.id})">+ Nouveau moodboard pour ${eqE(eqFirst(c))}</button>
      <h4 class="crm-h4">Photos pour le portfolio</h4>
      <div class="ag-list">${withShoots.filter(x => x.collab && eqIsPast(x)).length ? withShoots.filter(x => x.collab && eqIsPast(x)).map(x => `<div class="crm-line"><div><b>${eqE(x.type || 'Séance')}</b><span>${eqDate(x.date)}${x.photo_count ? ' · ' + x.photo_count + ' photos' : ''}${x.location ? ' · ' + eqE(x.location) : ''}</span></div><span>Utilisables</span></div>`).join('')
        : '<div class="ag-empty">Les séances collab passées apparaîtront ici : leurs photos servent pour ton portfolio.</div>'}</div>` : ''}

    ${s.ev.length ? `<h4 class="crm-h4">Notes reçues</h4><div class="ag-list">${s.ev.slice().reverse().map(e => {
      const sh = e.shoot_id ? eqShoots().find(x => x.id === Number(e.shoot_id)) : null;
      return `<div class="crm-line col"><span><i class="crm-tag ${e.source === 'client' ? 'eq-src-c' : ''}">${e.source === 'client' ? 'Client' : 'Moi'}</i>${eqDate(e.date || e.created_at)}${sh ? ' · ' + eqE(sh.type || 'Séance') : ''} · <b class="eq-avg">${eqNote(e.note)}/5</b>
        <button class="eq-del" title="Supprimer" onclick="eqEvalDelete(${e.id},${c.id})">${eqI('trash', 14)}</button></span>
        <span>Ponctualité ${e.ponctualite || '-'} · Qualité ${e.qualite || '-'} · Attitude ${e.attitude || '-'}</span>${e.commentaire ? `<p>${eqE(e.commentaire)}</p>` : ''}</div>`; }).join('')}</div>` : ''}
  `);
}
function eqProgHtml(s){
  if(!s.notes.length) return '<div class="ag-list"><div class="ag-empty">Pas encore de note. Après chaque séance, note sa ponctualité, sa qualité et son attitude.</div></div>';
  const last = s.ev.filter(e => Number(e.note) > 0).slice(-10);
  const tr = { hausse: ['En hausse', 'up'], baisse: ['En baisse', 'down'], stable: ['Stable', 'flat'] }[s.trend] || ['Pas assez de notes', 'flat'];
  return `<div class="eq-prog">
    <div class="eq-prog-h"><div><b class="eq-big">${eqNote(s.avg)}</b><span>/5 de moyenne · ${s.notes.length} note${s.notes.length > 1 ? 's' : ''}</span></div><i class="eq-trend ${tr[1]}">${tr[0]}</i></div>
    <div class="eq-bars">${last.map(e => `<div class="eq-bar" title="${eqDate(e.date || e.created_at)} : ${e.note}/5"><i class="${e.source === 'client' ? 'cl' : ''}" style="height:${Math.max(8, Number(e.note) * 20)}%"></i><span>${e.note}</span></div>`).join('')}</div>
    <div class="eq-crit"><span>Ponctualité <b>${eqNote(s.ponct)}</b></span><span>Qualité <b>${eqNote(s.qual)}</b></span><span>Attitude <b>${eqNote(s.att)}</b></span></div>
    ${s.evC.length ? `<div class="ag-hint" style="margin-top:6px"><i class="eq-dot cl"></i> retours clients (${eqNote(s.avgClient)}/5) <i class="eq-dot"></i> tes notes</div>` : ''}
  </div>`;
}
function eqNewBoard(pid){
  agCloseSheet('eqFiche');
  if(typeof agGoTab === 'function') agGoTab('mood');
  const c = eqPerson(pid);
  setTimeout(() => { if(typeof mbNewBoard === 'function') mbNewBoard({ client_id: pid, title: 'Collab' + (c ? ' - ' + eqFirst(c) : '') }); }, 300);
}

// ---------- Notes (equipe_evals) ----------
function eqEvalForm(pid, sid, source){
  const c = eqPerson(pid); if(!c) return;
  const s = sid ? eqShoots().find(x => x.id === Number(sid)) : null;
  EQ.ev = { pid, sid: sid || null, source: source || 'moi', ponctualite: 0, qualite: 0, attitude: 0, note: 0, auto: true };
  const w = eqWorked(pid);
  const titre = source === 'client' ? `Retour d'un client sur ${eqFirst(c)}` : (s ? `Comment était ${eqFirst(c)} sur ${eqShootLabel(s)} ?` : `Noter ${eqFirst(c)}`);
  agSheet('eqEval', `<h3>${eqE(titre)}</h3>
    ${!s ? `<label>Séance</label><select id="eqEvShoot" onchange="EQ.ev.sid=this.value?Number(this.value):null"><option value="">Aucune en particulier</option>${w.map(x => `<option value="${x.id}">${eqE((x.type || 'Séance') + ' · ' + eqShootLabel(x).replace(/^la séance (de )?/, '') + ' · ' + eqDate(x.date, { day: 'numeric', month: 'short' }))}</option>`).join('')}</select>` : ''}
    ${source === 'client' ? '<div class="ag-hint">Note ce que le client a dit de son travail (maquillage, coiffure, accueil...).</div>' : ''}
    <div id="eqStars">${eqStarsHtml()}</div>
    <label>Commentaire</label><textarea id="eqEvCom" rows="3" placeholder="${source === 'client' ? 'Ex : la mariée a adoré son maquillage' : 'Ex : arrivée 30 min en retard, mais très beau travail'}"></textarea>
    <button class="btn-primary" id="eqEvBtn" onclick="eqEvalSave()">Enregistrer</button>`);
}
function eqStarsHtml(){
  const v = EQ.ev;
  return EQ_CRIT.map(([k, n]) => `<div class="eq-crit-row ${k === 'note' ? 'main' : ''}"><span>${n}${k === 'note' && v.auto && v.note ? ' <small>(calculée)</small>' : ''}</span>
    <div class="eq-stars">${[1, 2, 3, 4, 5].map(i => `<button type="button" class="${i <= v[k] ? 'on' : ''}" aria-label="${n} ${i} sur 5" onclick="eqStar('${k}',${i})">${eqI('star', 22)}</button>`).join('')}</div></div>`).join('');
}
function eqStar(k, i){
  const v = EQ.ev; if(!v) return;
  v[k] = i;
  if(k === 'note') v.auto = false;
  else if(v.auto){ const m = eqMean([v.ponctualite, v.qualite, v.attitude]); v.note = m ? Math.round(m) : 0; }
  const el = document.getElementById('eqStars'); if(el) el.innerHTML = eqStarsHtml();
}
async function eqEvalSave(){
  const v = EQ.ev; if(!v) return;
  if(!v.note){ agAlert('Donne au moins la note globale (1 à 5 étoiles).'); return; }
  const btn = document.getElementById('eqEvBtn'); if(btn){ if(btn.dataset.busy) return; btn.dataset.busy = '1'; btn.disabled = true; }
  const row = { personne_id: v.pid, shoot_id: v.sid || null, note: v.note, ponctualite: v.ponctualite || null, qualite: v.qualite || null, attitude: v.attitude || null,
    commentaire: (document.getElementById('eqEvCom') || {}).value ? document.getElementById('eqEvCom').value.trim() : null, source: v.source === 'client' ? 'client' : 'moi', date: eqToday() };
  const r = await dbInsert('equipe_evals', row);
  if(!r){ if(btn){ btn.disabled = false; delete btn.dataset.busy; } return; }
  EQ.evals.unshift(r);
  agCloseSheet('eqEval');
  agToast('Note enregistrée');
  eqRefresh(v.pid);
}
async function eqEvalDelete(id, pid){
  if(!await agConfirm('Supprimer cette note ?')) return;
  const ok = await dbDelete('equipe_evals', id);
  if(!ok) return;
  EQ.evals = EQ.evals.filter(e => e.id !== id);
  eqRefresh(pid);
}

// ---------- Analyse IA ----------
function eqIaHtml(ia){
  return `<div class="eq-ia"><div class="eq-ia-h">${eqI('sparkles', 15)} Analyse IA <span>${eqDate(ia.date, { day: 'numeric', month: 'short' })}</span></div>${typeof crmMd === 'function' ? crmMd(ia.texte) : '<p>' + eqE(ia.texte) + '</p>'}</div>`;
}
function eqBrief(c){
  const s = eqStats(c), inf = eqInfo(c);
  return `${c.name} (${eqRoleLabel(c)}${inf.specialite ? ', ' + inf.specialite : ''}${eqActif(c) ? '' : ', inactif'}) : ${s.count} séance(s), payé ${Math.round(s.paid)} F, ces séances ont rapporté ${Math.round(s.rapport)} F${Number(inf.tarif_habituel) > 0 ? ', tarif habituel ' + Math.round(inf.tarif_habituel) + ' F' : ''}, note moyenne ${s.avg != null ? eqNote(s.avg) + '/5 (' + s.notes.length + ' notes)' : 'aucune'}${s.ponct != null ? ', ponctualité ' + eqNote(s.ponct) : ''}${s.att != null ? ', attitude ' + eqNote(s.att) : ''}${s.avgClient != null ? ', retours clients ' + eqNote(s.avgClient) + '/5' : ''}, dernier travail ${s.last ? eqDate(s.last) : 'jamais'}`;
}
async function eqAnalyse(pid){
  const c = eqPerson(pid); if(!c) return;
  const box = document.getElementById('eqIaBox');
  if(box) box.innerHTML = `<div class="eq-ia"><div class="eq-ia-h">${eqI('sparkles', 15)} Analyse en cours...</div></div>`;
  const s = eqStats(c), role = eqRoleKey(c);
  const autres = eqPeople().filter(x => x.id !== c.id && eqRoleKey(x) === role).slice(0, 8);
  const prompt = `Tu aides Henzo, photographe et vidéaste à Bouaké (Côte d'Ivoire), studio Henzo Studio, à gérer son équipe (maquilleuses, assistants, modèles, partenaires).
Personne à analyser : ${eqBrief(c)}.
Ses notes (de 1 à 5, source "moi" = Henzo, "client" = retour d'un client) :
${s.ev.length ? s.ev.map(e => `- ${e.date || ''} ${e.source} : globale ${e.note}, ponctualité ${e.ponctualite || '-'}, qualité ${e.qualite || '-'}, attitude ${e.attitude || '-'}${e.commentaire ? ', "' + String(e.commentaire).slice(0, 160) + '"' : ''}`).join('\n') : '(aucune note)'}
Ses séances : ${s.w.slice(0, 10).map(x => `${x.type || 'Séance'} le ${eqDate(x.date)}, payé ${Math.round(eqPaidOn(x, c.id))} F, reçu du client ${Math.round(Number(x.montant_recu) || 0)} F${x.collab ? ' (collab)' : ''}`).join(' ; ') || 'aucune'}.
${autres.length ? 'Les autres ' + eqRolePlural(role).toLowerCase() + ' de son équipe :\n' + autres.map(x => '- ' + eqBrief(x)).join('\n') : "Pas d'autre personne avec ce rôle dans l'équipe."}
Écris une analyse courte en français simple, sans jargon, sans tirets longs, avec ces 4 titres en gras : **Fiabilité**, **Rapport qualité-prix**, **Conseils**, **Qui proposer en priorité**. 2 ou 3 phrases par titre. Pour "Qui proposer en priorité", compare avec les autres personnes du même rôle si possible. Ne jamais inventer de chiffres.`;
  try {
    const t = String(await callAI(prompt) || '').replace(/[\u2013\u2014]/g, '-').trim();
    if(!t) throw new Error('vide');
    const ia = { texte: t, date: new Date().toISOString() };
    const r = await dbUpdate('clients', c.id, { equipe: Object.assign({}, eqInfo(c), { ia }) });
    if(r) Object.assign(c, r); else c.equipe = Object.assign({}, eqInfo(c), { ia });
    const b = document.getElementById('eqIaBox'); if(b) b.innerHTML = eqIaHtml(ia);
  } catch(e){
    const b = document.getElementById('eqIaBox');
    if(b) b.innerHTML = `<div class="eq-ia"><div class="eq-ia-h">Analyse IA</div><p>L'IA n'a pas répondu (${eqE(e.message || e)}). Vérifie ta connexion et tes clés IA, puis réessaie.</p></div>`;
  }
}

// ---------- Ajouter / modifier une personne ----------
function eqEdit(id, pre){
  pre = pre || {};
  const c = id ? eqPerson(id) : null, inf = eqInfo(c);
  EQ.after = pre.after || null;
  EQ.rap = Array.isArray(inf.a_rappeler_pour) ? inf.a_rappeler_pour.slice() : [];
  const role = c ? eqRoleKey(c) : (pre.role || EQ.role || 'maquilleuse');
  agSheet('eqEdit', `
    <h3>${c ? 'Modifier ' + eqE(eqFirst(c)) : 'Ajouter une personne'}</h3>
    ${!c ? eqImportBar('eq') : ''}
    <label>Nom complet</label><input id="eqEName" value="${eqE(c ? c.name : (pre.name || ''))}" placeholder="Ex : Koffi Awa">
    ${eqRoleSelectHtml('eqERole', role)}
    <label>Téléphone WhatsApp</label><input id="eqEPhone" type="tel" value="${eqE(c ? c.phone || '' : '')}" placeholder="07 00 00 00 00">
    <label>Email</label><input id="eqEEmail" type="email" value="${eqE(c ? c.email || '' : '')}">
    <label>Instagram</label><input id="eqEInsta" value="${eqE(inf.instagram || '')}" placeholder="@son_compte">
    <label>Spécialité</label><input id="eqESpec" value="${eqE(inf.specialite || '')}" placeholder="Ex : maquillage mariée, peau noire">
    <label>Tarif habituel (FCFA)</label><input id="eqETarif" type="number" inputmode="decimal" value="${Number(inf.tarif_habituel) > 0 ? Number(inf.tarif_habituel) : ''}" placeholder="Ex : 15000">
    <label>Disponibilités</label><input id="eqEDispo" value="${eqE(inf.disponibilites || '')}" placeholder="Ex : week-end, pas le dimanche matin">
    <label>À rappeler pour</label>
    <div class="ag-pills" id="eqERap">${[...new Set([...EQ_TYPES, ...EQ.rap])].map(t => `<button type="button" class="${EQ.rap.includes(t) ? 'on' : ''}" onclick="this.classList.toggle('on')">${eqE(t)}</button>`).join('')}</div>
    <input id="eqERapAutre" placeholder="Autre (ex : shooting mode)" style="margin-top:8px">
    <label>Notes pro</label><textarea id="eqENotes" rows="3" placeholder="Ex : vient avec son matériel, demande le transport">${eqE(inf.notes_pro || '')}</textarea>
    <label class="eq-check"><input type="checkbox" id="eqEActif" ${inf.actif === false ? '' : 'checked'}> Actif (je travaille encore avec cette personne)</label>
    <button class="btn-primary" id="eqESave" onclick="eqSave(${c ? c.id : 'null'})">Enregistrer</button>`);
}
async function eqSave(id){
  const v = k => { const el = document.getElementById(k); return el ? String(el.value || '').trim() : ''; };
  const name = v('eqEName'); if(!name){ agAlert('Donne un nom.'); return; }
  const old = id ? eqPerson(id) : null;
  const rap = [...document.querySelectorAll('#eqERap button.on')].map(b => b.textContent.trim());
  v('eqERapAutre').split(',').map(x => x.trim()).filter(Boolean).forEach(x => { if(!rap.includes(x)) rap.push(x); });
  const role = v('eqERole') || 'autre';
  const phone = v('eqEPhone') ? eqNormPhone(v('eqEPhone')) : null;
  const data = {
    name, role, phone, email: v('eqEEmail') || null,
    equipe: Object.assign({}, eqInfo(old), {
      specialite: v('eqESpec') || null, tarif_habituel: Number(v('eqETarif')) || null, disponibilites: v('eqEDispo') || null,
      instagram: v('eqEInsta') || null, notes_pro: v('eqENotes') || null, a_rappeler_pour: rap, actif: !!(document.getElementById('eqEActif') || {}).checked
    })
  };
  if(!id && !await eqDupConfirm(phone, 'eqEdit')) return;
  const btn = document.getElementById('eqESave'); if(btn){ if(btn.dataset.busy) return; btn.dataset.busy = '1'; btn.disabled = true; }
  let r;
  if(id){ r = await dbUpdate('clients', id, data); if(r) Object.assign(old, r); }
  else { r = await dbInsert('clients', data); if(r) eqClients().unshift(r); }
  if(!r){ if(btn){ btn.disabled = false; delete btn.dataset.busy; } return; }
  agCloseSheet('eqEdit');
  agToast(window.estClient(r) ? 'Enregistré : la fiche est dans tes clients' : 'Personne enregistrée');
  const after = EQ.after; EQ.after = null;
  if(after === 'team'){ eqTeamAdd(r.id); return; }
  if(typeof renderClients === 'function') try { renderClients(); } catch(e){}
  if(document.getElementById('eqFiche') || id){ agCloseSheet('eqFiche'); if(typeof crmOpenClient === 'function') crmOpenClient(r.id); }
  eqRefresh();
}

// ============================================================
// AJOUTER UN CONTACT FACILEMENT
// ============================================================
const EQ_FIELDS = { crm: { name: 'crmEName', phone: 'crmEPhone', email: 'crmEEmail', role: 'crmERole', sheet: 'crmEdit' }, eq: { name: 'eqEName', phone: 'eqEPhone', email: 'eqEEmail', role: 'eqERole', sheet: 'eqEdit' } };
function eqHasPicker(){ return 'contacts' in navigator && typeof navigator.contacts.select === 'function'; }
function eqImportBar(p){
  eqStyle();
  const picker = eqHasPicker(), cap = typeof window.vxLireCapture === 'function';
  return `<div class="eq-imp" id="eqImp_${p}">
    <div class="eq-imp-h">${eqI('user', 15)} Remplir depuis un contact</div>
    <div class="eq-imp-b">
      ${picker ? `<button type="button" onclick="eqPickContacts('${p}')">${eqI('phone', 16)}Contacts du téléphone</button>` : ''}
      <button type="button" onclick="document.getElementById('eqVcf_${p}').click()">${eqI('download', 16)}Importer un contact (.vcf)</button>
      <button type="button" onclick="eqPasteOpen('${p}')">${eqI('copy', 16)}Coller un texte</button>
      ${cap ? `<button type="button" onclick="eqCapture('${p}')">${eqI('image', 16)}Lire une capture</button>` : ''}
    </div>
    <input type="file" id="eqVcf_${p}" accept=".vcf,.vcard,text/vcard,text/x-vcard" style="display:none" onchange="eqVcfFile(this,'${p}')">
    ${picker ? '' : '<div class="ag-hint" style="margin-top:6px">Contacts du téléphone : disponible sur Android avec Chrome. Ailleurs, dans WhatsApp : ouvre le contact, « Partager », puis importe le fichier .vcf ici.</div>'}
    <div id="eqDup_${p}"></div>
  </div>`;
}
// Numero au format de l'app : 07 07 12 34 56 (crmPhone ajoute 225 pour WhatsApp)
function eqNormPhone(p){
  const raw = String(p || '').trim(); if(!raw) return '';
  let d = raw.replace(/[^0-9]/g, ''); if(!d) return raw;
  if(d.startsWith('00')) d = d.slice(2);
  if(d.length === 13 && d.startsWith('225')) d = d.slice(3);
  if(d.length === 10) return d.replace(/(\d{2})(?=\d)/g, '$1 ');
  if(raw.startsWith('+') || raw.startsWith('00') || d.length > 10) return '+' + d;
  return raw;
}
function eqPhoneKey(p){ return typeof crmPhone === 'function' ? crmPhone(p) : String(p || '').replace(/\D/g, ''); }
function eqFindDup(phone, exceptId){
  const k = eqPhoneKey(phone); if(!k || k.length < 8) return null;
  return eqClients().find(c => c.id !== exceptId && eqPhoneKey(c.phone) === k) || null;
}
function eqDupShow(p, phone){
  const box = document.getElementById('eqDup_' + p); if(!box) return;
  const d = eqFindDup(phone);
  box.innerHTML = d ? `<div class="eq-dup">${eqI('info', 16)}<div><b>Ce numéro existe déjà : ${eqE(d.name)}</b><span>${eqE(window.estClient(d) ? 'Client' : eqRoleLabel(d))}${d.phone ? ' · ' + eqE(d.phone) : ''}</span></div>
    <button type="button" onclick="eqOpenDup(${d.id},'${EQ_FIELDS[p].sheet}')">Ouvrir la fiche</button></div>` : '';
}
function eqOpenDup(id, sheet){ agCloseSheet(sheet); EQ.after = null; if(typeof crmOpenClient === 'function') crmOpenClient(id); else eqOpen(id); }
// Avant de creer : meme numero deja enregistre ? true = on continue
async function eqDupConfirm(phone, sheet){
  const d = eqFindDup(phone); if(!d) return true;
  const open = await agConfirm(`Ce numéro est déjà enregistré\n${d.name} (${window.estClient(d) ? 'client' : eqRoleLabel(d).toLowerCase()}) a le même numéro.`, { ok: 'Ouvrir sa fiche', no: 'Créer quand même' });
  if(open){ eqOpenDup(d.id, sheet); return false; }
  return true;
}
function eqFill(p, ct){
  const f = EQ_FIELDS[p]; if(!f || !ct) return;
  const set = (id, val) => { const el = document.getElementById(id); if(el && val){ el.value = val; el.classList.add('eq-filled'); } };
  set(f.name, ct.name); set(f.phone, eqNormPhone(ct.phone)); set(f.email, ct.email);
  eqDupShow(p, ct.phone);
  agToast('Formulaire rempli : vérifie avant d\'enregistrer');
}
function eqGotContacts(p, list){
  list = (list || []).filter(x => x && (x.name || x.phone));
  if(!list.length){ agAlert("Aucun contact trouvé.\nVérifie le fichier ou le texte."); return; }
  if(list.length === 1) return eqFill(p, list[0]);
  eqChooseContacts(p, list);
}
// Plusieurs contacts : Henzo coche ceux a importer
function eqChooseContacts(p, list){
  EQ.imp[p] = list;
  agSheet('eqPick', `<h3>${list.length} contacts trouvés</h3>
    <div class="ag-hint" style="margin-top:0">Coche ceux à importer. Un seul coché : le formulaire est rempli. Plusieurs : ils sont ajoutés directement avec le rôle choisi.</div>
    <div class="ag-list" style="margin-top:10px;max-height:46vh;overflow:auto">${list.map((x, i) => { const d = eqFindDup(x.phone); return `
      <label class="crm-pick eq-pick"><input type="checkbox" value="${i}" ${d ? '' : 'checked'}>
        <div><b>${eqE(x.name || 'Sans nom')}</b><span>${eqE(eqNormPhone(x.phone) || 'Pas de numéro')}${x.email ? ' · ' + eqE(x.email) : ''}${d ? ` · <em class="eq-warn">déjà enregistré (${eqE(d.name)})</em>` : ''}</span></div></label>`; }).join('')}</div>
    <button class="btn-primary" onclick="eqChooseDone('${p}')">Importer</button>`);
}
async function eqChooseDone(p){
  const list = EQ.imp[p] || [];
  const picked = [...document.querySelectorAll('#eqPick input:checked')].map(i => list[Number(i.value)]).filter(Boolean);
  if(!picked.length){ agAlert('Coche au moins un contact.'); return; }
  agCloseSheet('eqPick');
  if(picked.length === 1) return eqFill(p, picked[0]);
  const f = EQ_FIELDS[p], roleEl = document.getElementById(f.role);
  const role = (roleEl && roleEl.value) || (p === 'crm' ? 'client' : 'autre');
  let n = 0, skip = 0;
  for(const x of picked){
    const phone = eqNormPhone(x.phone) || null;
    if(phone && eqFindDup(phone)){ skip++; continue; }
    const r = await dbInsert('clients', { name: x.name || phone || 'Contact', phone, email: x.email || null, role, ...(role === 'client' ? {} : { equipe: { actif: true } }) });
    if(r){ eqClients().unshift(r); n++; }
  }
  agCloseSheet(f.sheet);
  agToast(`${n} contact${n > 1 ? 's' : ''} ajouté${n > 1 ? 's' : ''}${skip ? `, ${skip} déjà enregistré${skip > 1 ? 's' : ''}` : ''}`);
  if(typeof renderClients === 'function') try { renderClients(); } catch(e){}
  eqRefresh();
}
async function eqPickContacts(p){
  try {
    const r = await navigator.contacts.select(['name', 'tel', 'email'], { multiple: true });
    eqGotContacts(p, (r || []).map(x => ({ name: ((x.name || [])[0] || '').trim(), phone: eqNormPhone((x.tel || [])[0] || ''), email: ((x.email || [])[0] || '').trim() })));
  } catch(e){ if(!/abort|cancel/i.test(String(e && (e.name || e.message)))) agAlert("Impossible d'ouvrir tes contacts.\n" + (e.message || e)); }
}
function eqVcfFile(input, p){
  const f = input.files && input.files[0]; if(!f) return;
  const rd = new FileReader();
  rd.onload = () => { input.value = ''; eqGotContacts(p, eqParseVcf(String(rd.result || ''))); };
  rd.onerror = () => agAlert('Fichier illisible.');
  rd.readAsText(f);
}
function eqQp(s){
  try { return decodeURIComponent(String(s).replace(/=\r?\n/g, '').replace(/%/g, '%25').replace(/=([0-9A-F]{2})/gi, '%$1')); } catch(e){ return s; }
}
// Lit un fichier .vcf (vCard 2.1, 3.0, 4.0 ; WhatsApp, Android, iPhone) : FN, N, TEL, EMAIL
function eqParseVcf(txt){
  const raw = String(txt || '').replace(/\r\n?/g, '\n').split('\n');
  const lines = [];
  raw.forEach(l => {
    if(/^[ \t]/.test(l) && lines.length) lines[lines.length - 1] += l.slice(1);
    else if(lines.length && /QUOTED-PRINTABLE/i.test(lines[lines.length - 1]) && /=$/.test(lines[lines.length - 1])) lines[lines.length - 1] = lines[lines.length - 1].slice(0, -1) + l;
    else lines.push(l);
  });
  const out = []; let cur = null;
  const unesc = s => String(s || '').replace(/\\n/gi, ' ').replace(/\\([,;:\\])/g, '$1').trim();
  for(const l0 of lines){
    const l = l0.trim(); if(!l) continue;
    if(/^BEGIN:VCARD/i.test(l)){ cur = { fn: '', n: '', tels: [], emails: [] }; continue; }
    if(/^END:VCARD/i.test(l)){
      if(cur){
        const name = cur.fn || cur.n;
        if(name || cur.tels.length) out.push({ name: name || '', phone: eqNormPhone(cur.tels[0] || ''), phones: cur.tels.map(eqNormPhone), email: cur.emails[0] || '' });
      }
      cur = null; continue;
    }
    if(!cur) continue;
    const i = l.indexOf(':'); if(i < 0) continue;
    const key = l.slice(0, i), parts = key.split(';');
    const prop = parts[0].replace(/^[\w-]+\./, '').toUpperCase(), params = parts.slice(1).join(';');
    let val = l.slice(i + 1);
    if(/QUOTED-PRINTABLE/i.test(params)) val = eqQp(val);
    if(prop === 'FN') cur.fn = unesc(val);
    else if(prop === 'N'){
      const p = val.split(/(?<!\\);/).map(unesc);
      cur.n = [p[3], p[1], p[2], p[0], p[4]].filter(Boolean).join(' ').trim();
    } else if(prop === 'TEL'){
      let t = unesc(val).replace(/^tel:/i, '');
      const wa = (params.match(/waid=(\d+)/i) || [])[1];
      if(!t.replace(/\D/g, '') && wa) t = '+' + wa;
      if(t) cur.tels.push(t);
    } else if(prop === 'EMAIL'){ const e = unesc(val).replace(/^mailto:/i, ''); if(e) cur.emails.push(e); }
  }
  return out;
}
// Texte colle (message WhatsApp, signature...) : nom, numero, email
const EQ_TEL_RE = /(?:\+|00)?\s*(?:225[\s.\-]*)?(?:0[157]|2[57])(?:[\s.\-]*\d){8}(?!\d)/g;
function eqParseTexte(t){
  t = String(t || '');
  const email = (t.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/) || [])[0] || '';
  const tels = (t.match(EQ_TEL_RE) || []).map(x => x.trim()).filter(x => { const d = x.replace(/\D/g, ''); return d.length === 10 || (d.length === 13 && d.startsWith('225')) || (d.length === 15 && d.startsWith('00225')); });
  let name = ((t.match(/(?:^|\n)\s*(?:nom(?: complet)?|name|contact|prénom et nom)\s*[:\-]\s*([^\n]+)/i) || [])[1] || '').trim();
  if(!name){
    const ln = t.split('\n').map(l => l.replace(EQ_TEL_RE, ' ').replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, ' ')
      .replace(/^\s*(?:t[ée]l(?:[ée]phone)?|num[ée]ro|whatsapp|portable|mobile|email|mail|contact)\s*[:\-]?\s*/i, '').replace(/[|:;,]+/g, ' ').replace(/\s+/g, ' ').trim())
      .filter(l => /[a-zA-ZÀ-ÿ]{2,}/.test(l) && !/\d{3,}/.test(l) && l.length <= 40 && !/^(bonjour|salut|bonsoir|voici|merci|ok)\b/i.test(l));
    name = ln[0] || '';
  }
  // Enleve le role colle au nom (ex : "Awa Koffi maquilleuse")
  name = name.replace(/\s+(maquilleu[sr]e?|coiffeu[sr]e?|assistante?|mod[eè]le|vid[ée]aste|d[ée]corat(eur|rice)|photographe|cliente?)\b.*$/i, '');
  name = name.replace(/[*_~]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
  return { name, phone: tels[0] ? eqNormPhone(tels[0]) : '', email };
}
function eqCoerce(r){
  if(!r) return [];
  if(typeof r === 'string'){ try { r = JSON.parse(r); } catch(e){ return [eqParseTexte(r)]; } }
  if(r && !Array.isArray(r) && Array.isArray(r.contacts)) r = r.contacts;
  return (Array.isArray(r) ? r : [r]).filter(Boolean).map(x => ({
    name: String(x.nom || x.name || x.nom_complet || x.fn || '').trim(),
    phone: eqNormPhone(x.telephone || x.tel || x.phone || x.numero || (Array.isArray(x.tels) ? x.tels[0] : '') || ''),
    email: String(x.email || x.mail || '').trim()
  })).filter(x => x.name || x.phone);
}
async function eqFromText(t){
  const one = eqParseTexte(t);
  if(typeof window.vxExtraireTexte === 'function'){
    try {
      const raw = await window.vxExtraireTexte(t, 'contact');
      const l = eqCoerce(raw);
      if(l.length > 1) return l;
      if(l.length === 1){
        // Lu par l'IA : on lui fait confiance. Sinon on garde notre lecture et on complete avec la sienne
        const ia = raw && raw._source === 'ia', x = l[0], pick = k => ia ? (x[k] || one[k]) : (one[k] || x[k]);
        return [{ name: pick('name'), phone: one.phone || x.phone, email: one.email || x.email }];
      }
    } catch(e){ console.warn('vxExtraireTexte', e); }
  }
  return one.name || one.phone ? [one] : [];
}
function eqPasteOpen(p){
  agSheet('eqPaste', `<h3>Coller un texte</h3>
    <div class="ag-hint" style="margin-top:0">Colle un message WhatsApp, une signature, une fiche... L'app trouve le nom, le numéro et l'email.</div>
    <textarea id="eqPasteTxt" rows="6" placeholder="Ex : Awa Koffi maquilleuse, 07 07 12 34 56"></textarea>
    <button class="btn-primary" id="eqPasteBtn" onclick="eqPasteGo('${p}')">Remplir le formulaire</button>`);
  setTimeout(async () => {
    const ta = document.getElementById('eqPasteTxt'); if(!ta) return;
    ta.focus();
    try { if(navigator.clipboard && navigator.clipboard.readText){ const c = await navigator.clipboard.readText(); if(c && !ta.value && /\d{8}/.test(c.replace(/\D/g, ''))) ta.value = c; } } catch(e){}
  }, 80);
}
async function eqPasteGo(p){
  const t = (document.getElementById('eqPasteTxt') || {}).value || '';
  if(!t.trim()) return;
  const b = document.getElementById('eqPasteBtn'); if(b){ b.disabled = true; b.textContent = 'Lecture...'; }
  const l = await eqFromText(t);
  agCloseSheet('eqPaste');
  eqGotContacts(p, l);
}
function eqCapture(p){
  if(typeof window.vxLireCapture !== 'function') return;
  try { window.vxLireCapture('contact', r => eqGotContacts(p, eqCoerce(r))); } catch(e){ agAlert('Lecture impossible : ' + (e.message || e)); }
}
// Verifie les doublons pendant la saisie du numero
document.addEventListener('input', e => {
  const id = e.target && e.target.id;
  if(id === 'crmEPhone' && document.getElementById('eqDup_crm')) eqDupShow('crm', e.target.value);
  if(id === 'eqEPhone' && document.getElementById('eqDup_eq')) eqDupShow('eq', e.target.value);
});

// ============================================================
// FORMULAIRE SEANCE : COLLABORATION ET EQUIPE
// ============================================================
function eqShootOpen(){ return !!document.getElementById('shootModalBg') && document.getElementById('shootModalBg').classList.contains('show'); }
function eqShootClientLabels(){
  const sel = document.getElementById('shootClient'); if(!sel) return;
  [...sel.options].forEach(o => {
    const c = /^\d+$/.test(o.value) ? eqPerson(o.value) : null;
    if(c && !window.estClient(c) && !o.dataset.eq){ o.textContent = c.name + ' · ' + eqRoleLabel(c); o.dataset.eq = '1'; }
  });
}
function eqShootSetup(id){
  eqStyle();
  const s = id ? eqShoots().find(x => x.id === id) : null;
  EQ.sh = { collab: !!(s && s.collab), equipe: JSON.parse(JSON.stringify(eqTeam(s))), had: !!(s && (s.collab || eqTeam(s).length)), oldPrice: '' };
  eqShootClientLabels();
  const sel = document.getElementById('shootClient'); if(!sel) return;
  let box = document.getElementById('eqCollabBox');
  if(!box){
    box = document.createElement('div'); box.id = 'eqCollabBox';
    (document.getElementById('shootNewClientWrap') || sel).insertAdjacentElement('afterend', box);
  }
  let tb = document.getElementById('eqTeamBox');
  if(!tb){
    tb = document.createElement('div'); tb.id = 'eqTeamBox';
    const list = document.getElementById('shootExpensesList');
    const sec = list ? list.parentElement : null;
    if(sec && sec.parentElement && sec.parentElement.classList.contains('modal')) sec.insertAdjacentElement('afterend', tb);
    else (document.getElementById('shootPay') || sel).insertAdjacentElement('beforebegin', tb);
  }
  eqApplyCollab();
  eqShootRender();
}
function eqApplyCollab(){
  const on = !!EQ.sh.collab, pr = document.getElementById('shootPrice');
  if(pr){
    if(on){ if(pr.value && pr.value !== '0') EQ.sh.oldPrice = pr.value; pr.value = '0'; pr.disabled = true; }
    else { pr.disabled = false; if(pr.value === '0' && EQ.sh.oldPrice) pr.value = EQ.sh.oldPrice; }
  }
  const box = document.getElementById('eqCollabBox');
  if(box) box.innerHTML = `<label class="eq-switchline"><input type="checkbox" id="eqCollab" ${on ? 'checked' : ''} onchange="eqSetCollab(this.checked)">
    <span><b>Séance collaboration</b><small>Modèle, ami, test, portfolio</small></span></label>
    ${on ? `<div class="eq-collab-hint">Pas de prix : elle ne compte pas dans ton chiffre d'affaires ni dans « à encaisser ». Ses charges comptent bien comme dépenses.</div>` : ''}`;
}
function eqSetCollab(on){
  EQ.sh.collab = !!on;
  eqApplyCollab();
  if(typeof calculerNetShoot === 'function') calculerNetShoot();
}
function eqShootRender(){
  const tb = document.getElementById('eqTeamBox'); if(!tb) return;
  const team = EQ.sh.equipe || [];
  const exps = typeof currentShootExpenses !== 'undefined' && Array.isArray(currentShootExpenses) ? currentShootExpenses : [];
  const roles = EQ_ROLES.filter(r => r.k !== 'client');
  const lbl = e => (typeof chargeLabel === 'function' ? chargeLabel(e) : (e.customLabel || e.type));
  // Suggestions : charge Makeup pas encore reliee et une maquilleuse dans l'equipe
  const sugg = [];
  exps.forEach((e, i) => {
    if(e.personne_id) return;
    const rs = EQ_CHARGE_ROLES[e.type]; if(!rs) return;
    const t = team.find(m => rs.includes(m.role || eqRoleKey(eqPerson(m.personne_id))));
    if(t && eqPerson(t.personne_id)) sugg.push({ i, e, p: eqPerson(t.personne_id) });
  });
  tb.innerHTML = `<div class="eq-team">
    <div class="eq-team-h"><b>Équipe sur cette séance</b><button type="button" onclick="eqTeamAddOpen()">+ Ajouter</button></div>
    ${team.length ? team.map((m, i) => { const p = eqPerson(m.personne_id); const viaCharge = exps.filter(e => Number(e.personne_id) === Number(m.personne_id)).reduce((a, e) => a + (Number(e.amount) || 0), 0); return `
      <div class="eq-team-row">
        <div class="eq-team-n"><b>${eqE(p ? p.name : 'Personne supprimée')}</b>
          <select onchange="EQ.sh.equipe[${i}].role=this.value;eqShootRender()">${roles.map(r => `<option value="${r.k}" ${r.k === (m.role || eqRoleKey(p)) ? 'selected' : ''}>${eqE(eqRoleLabel(r.k))}</option>`).join('')}</select></div>
        ${viaCharge ? `<span class="eq-team-paid">Payé ${eqF(viaCharge)} (charge)</span>` : `<input type="number" inputmode="decimal" placeholder="Montant (facultatif)" value="${Number(m.montant) > 0 ? Number(m.montant) : ''}" oninput="EQ.sh.equipe[${i}].montant=Number(this.value)||0">`}
        <button type="button" class="eq-x" title="Retirer" onclick="eqTeamRemove(${i})">×</button>
      </div>`; }).join('') : '<div class="eq-team-empty">Maquilleuse, assistant, vidéaste... Ajoute qui a travaillé avec toi.</div>'}
    ${sugg.map(x => `<div class="eq-sugg"><span>Relier la charge ${eqE(lbl(x.e))}${Number(x.e.amount) > 0 ? ' (' + eqF(x.e.amount) + ')' : ''} à ${eqE(eqFirst(x.p))} ?</span><button type="button" onclick="eqLinkCharge(${x.i},${x.p.id})">Relier</button></div>`).join('')}
    ${team.length && exps.length ? `<div class="eq-links"><span class="eq-links-h">Charges payées à quelqu'un de l'équipe</span>${exps.map((e, i) => `<div class="eq-link"><span>${eqE(lbl(e))}${Number(e.amount) > 0 ? ' · ' + eqF(e.amount) : ''}</span>
      <select onchange="eqLinkCharge(${i},this.value)"><option value="">Personne</option>${team.map(m => { const p = eqPerson(m.personne_id); return p ? `<option value="${p.id}" ${Number(e.personne_id) === p.id ? 'selected' : ''}>${eqE(p.name)}</option>` : ''; }).join('')}</select></div>`).join('')}</div>` : ''}
    ${team.length && !exps.length ? '<div class="eq-team-empty">Pour que ce que tu leur paies compte dans tes dépenses, ajoute une charge (Makeup, Assistant...) et relie-la.</div>' : ''}
  </div>`;
}
function eqLinkCharge(i, pid){
  const exps = typeof currentShootExpenses !== 'undefined' ? currentShootExpenses : [];
  const e = exps[i]; if(!e) return;
  if(pid) e.personne_id = Number(pid); else delete e.personne_id;
  eqShootRender();
}
function eqTeamRemove(i){
  const m = (EQ.sh.equipe || [])[i]; if(!m) return;
  EQ.sh.equipe.splice(i, 1);
  (typeof currentShootExpenses !== 'undefined' ? currentShootExpenses : []).forEach(e => { if(Number(e.personne_id) === Number(m.personne_id)) delete e.personne_id; });
  eqShootRender();
}
function eqTeamAdd(pid){
  const p = eqPerson(pid); if(!p) return;
  agCloseSheet('eqTeamAdd');
  if(!(EQ.sh.equipe || []).some(m => Number(m.personne_id) === p.id)) EQ.sh.equipe.push({ personne_id: p.id, role: eqRoleKey(p) === 'client' ? 'autre' : eqRoleKey(p) });
  eqShootRender();
}
function eqTeamAddOpen(){
  const deja = new Set((EQ.sh.equipe || []).map(m => Number(m.personne_id)));
  const ppl = eqPeople().filter(c => !deja.has(c.id)).sort((a, b) => eqActif(b) - eqActif(a) || eqRoleKey(a).localeCompare(eqRoleKey(b)) || a.name.localeCompare(b.name));
  agSheet('eqTeamAdd', `<h3>Ajouter à l'équipe</h3>
    ${ppl.length > 6 ? `<input placeholder="Rechercher" oninput="const q=this.value.toLowerCase();document.querySelectorAll('#eqTeamAddList .crm-row').forEach(r=>r.style.display=r.dataset.n.includes(q)?'':'none')" style="margin-bottom:10px">` : ''}
    <div class="ag-list" id="eqTeamAddList">${ppl.length ? ppl.map(c => { const s = eqStats(c); return `<div class="crm-row ${eqActif(c) ? '' : 'off'}" data-n="${eqE((c.name + ' ' + eqRoleLabel(c)).toLowerCase())}" onclick="eqTeamAdd(${c.id})">
      <div class="crm-av">${eqE(eqInitials(c))}</div><div class="d"><b>${eqE(c.name)}</b><span><i class="crm-tag eq-rtag">${eqE(eqRoleLabel(c))}</i>${s.avg != null ? 'note ' + eqNote(s.avg) + '/5 · ' : ''}${s.count} séance${s.count > 1 ? 's' : ''}</span></div>${eqI('plus', 16)}</div>`; }).join('')
      : '<div class="ag-empty">Personne dans ton équipe pour le moment.</div>'}</div>
    <button class="btn-secondary" style="width:100%;margin-top:4px" onclick="agCloseSheet('eqTeamAdd');eqEdit(null,{after:'team'})">+ Nouvelle personne</button>`);
}
// Ce que saveShoot (modules.js) enregistre en plus
function eqShootPatch(){
  if(!eqShootOpen()) return {};
  const list = (EQ.sh.equipe || []).filter(m => m.personne_id).map(m => {
    const o = { personne_id: Number(m.personne_id), role: m.role || null };
    if(Number(m.montant) > 0) o.montant = Number(m.montant);
    return o;
  });
  const out = {};
  if(EQ.sh.collab || list.length || EQ.sh.had){ out.collab = !!EQ.sh.collab; out.equipe = list; }
  if(EQ.sh.collab) out.price = 0;
  return out;
}
// Liste des seances : badge Collab et equipe
function eqDecorateShoots(){
  document.querySelectorAll('.item-card').forEach(card => {
    if(card.dataset.eqDone) return;
    card.dataset.eqDone = '1';
    const m = (card.innerHTML.match(/openShootModal\((\d+)\)/) || [])[1]; if(!m) return;
    const s = eqShoots().find(x => x.id === Number(m)); if(!s) return;
    const team = eqTeam(s).map(t => eqPerson(t.personne_id)).filter(Boolean);
    if(s.collab){ const b = card.querySelector('.shoot-badges'); if(b) b.insertAdjacentHTML('beforeend', '<span class="badge eq-collab-badge">Collab</span>'); }
    if(team.length){ const h = card.querySelector('.head'); if(h) h.insertAdjacentHTML('afterend', `<div class="eq-teamline">Équipe : ${team.map(p => `<a onclick="eqOpen(${p.id})">${eqE(eqFirst(p))}</a> (${eqE(eqRoleLabel(eqRoleOn(s, p.id)).toLowerCase())})`).join(', ')}</div>`); }
  });
}

// ============================================================
// BRANCHEMENTS
// ============================================================
(function eqHooks(){
  if(typeof openShootModal === 'function'){
    const _o = openShootModal;
    openShootModal = function(id){ const r = _o.apply(this, arguments); try { eqShootSetup(id || null); } catch(e){ console.warn('eqShootSetup', e); } return r; };
  }
  if(typeof closeShootModal === 'function'){
    const _o = closeShootModal;
    closeShootModal = function(){ const pr = document.getElementById('shootPrice'); if(pr) pr.disabled = false; return _o.apply(this, arguments); };
  }
  if(typeof renderShootExpenses === 'function'){
    const _o = renderShootExpenses;
    renderShootExpenses = function(){ const r = _o.apply(this, arguments); try { eqShootRender(); } catch(e){} return r; };
  }
  if(typeof sauverNouveauClientShoot === 'function'){
    const _o = sauverNouveauClientShoot;
    sauverNouveauClientShoot = async function(){ const r = await _o.apply(this, arguments); try { eqShootClientLabels(); } catch(e){} return r; };
  }
  if(typeof updateChargeAmount === 'function'){
    const _o = updateChargeAmount;
    updateChargeAmount = function(){ const r = _o.apply(this, arguments); clearTimeout(EQ.rt); EQ.rt = setTimeout(() => { try { eqShootRender(); } catch(e){} }, 600); return r; };
  }
  // Coach (coach.js) : les relances de clients inactifs ne concernent que les clients
  if(typeof coachAnalyzeClients === 'function'){
    const _o = coachAnalyzeClients;
    coachAnalyzeClients = function(){
      const all = eqClients();
      try { clients = all.filter(c => window.estClient(c)); return _o.apply(this, arguments); } finally { clients = all; }
    };
  }
  new MutationObserver(() => { try { eqDecorateShoots(); } catch(e){} }).observe(document.body, { childList: true, subtree: true });
  setTimeout(() => { if(!EQ.loaded && typeof sb !== 'undefined') eqLoad(); }, 2500);
})();

// ---------- Styles ----------
function eqStyle(){
  if(document.getElementById('eqCss')) return;
  const st = document.createElement('style'); st.id = 'eqCss';
  st.textContent = `
.eq-switch{display:flex;gap:4px;padding:4px;margin:0 0 14px;border-radius:16px;background:var(--card2);border:1px solid var(--border)}
.eq-switch button{flex:1;width:auto;margin:0;padding:10px 6px;border:0;border-radius:12px;background:none;color:var(--muted);font:600 13px Inter,sans-serif;cursor:pointer}
.eq-switch button.on{background:var(--card);color:var(--text);box-shadow:0 0 0 1px var(--accent) inset}
.eq-switch button i{font-style:normal;opacity:.65;margin-left:3px}
.eq-rtag{color:var(--text-2) !important}
.eq-m{display:flex;flex-direction:column;align-items:flex-end;gap:3px}
.eq-avg{display:inline-flex;align-items:center;gap:3px;color:var(--yellow);font-weight:700}
.eq-avg .ag-i{fill:currentColor}
.eq-nonote{font-size:11px;color:var(--muted);font-weight:500}
.eq-reco{font-size:10px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.03em}
.eq-rank{width:30px;height:30px;border-radius:10px;display:grid;place-items:center;background:var(--card3);color:var(--accent);font-weight:800;flex-shrink:0}
.eq-pend{display:flex;align-items:center;gap:12px;padding:12px 14px;margin:0 0 8px;border-radius:18px;background:var(--card);border:1px solid var(--accent);cursor:pointer;color:var(--text)}
.eq-pend .ic{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:var(--card3);color:var(--yellow);flex-shrink:0}
.eq-pend .ic .ag-i{fill:currentColor}
.eq-pend .d{flex:1;min-width:0}.eq-pend .d b{display:block;font-size:13.5px;line-height:1.3}.eq-pend .d span{display:block;font-size:12px;color:var(--muted);margin-top:3px}
.eq-old{margin:8px 0 0}.eq-old .d{cursor:pointer}
.crm-tags i.eq-on{color:var(--green)}.crm-tags i.eq-off{color:var(--red)}
.crm-tags i.eq-reco-t{color:var(--yellow);border-color:var(--yellow)}
.eq-money{text-align:right;white-space:nowrap}.eq-money b{display:block;font-size:13px}.eq-money span{font-size:11px;color:var(--muted)}
.eq-prog{background:var(--card2);border:1px solid var(--border);border-radius:18px;padding:14px}
.eq-prog-h{display:flex;justify-content:space-between;align-items:center;gap:10px}
.eq-prog-h span{font-size:12px;color:var(--muted);margin-left:4px}
.eq-big{font-size:28px;font-weight:800;color:var(--text)}
.eq-trend{font-style:normal;font-size:12px;font-weight:700;padding:4px 10px;border-radius:10px;background:var(--card3)}
.eq-trend.up{color:var(--green)}.eq-trend.down{color:var(--red)}.eq-trend.flat{color:var(--muted)}
.eq-bars{display:flex;align-items:flex-end;gap:6px;height:96px;margin:14px 0 8px;padding-bottom:16px;border-bottom:1px solid var(--border)}
.eq-bar{flex:1;max-width:34px;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;position:relative}
.eq-bar i{display:block;width:100%;border-radius:7px 7px 3px 3px;background:var(--accent)}
.eq-bar i.cl{background:var(--yellow)}
.eq-bar span{position:absolute;bottom:-17px;font-size:10.5px;color:var(--muted)}
.eq-crit{display:flex;justify-content:space-between;gap:6px;font-size:12px;color:var(--muted);margin-top:6px}.eq-crit b{color:var(--text)}
.eq-dot{display:inline-block;width:9px;height:9px;border-radius:3px;background:var(--accent);margin:0 3px 0 8px;vertical-align:-1px}.eq-dot.cl{background:var(--yellow);margin-left:0}
.eq-crit-row{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid var(--border)}
.eq-crit-row>span{font-size:13.5px;font-weight:600}.eq-crit-row small{font-weight:400;color:var(--muted)}
.eq-crit-row.main{border-bottom:0}.eq-crit-row.main>span{color:var(--accent)}
.eq-stars{display:flex;gap:2px;flex-shrink:0}
.eq-stars button{width:36px !important;height:36px;margin:0;padding:0;display:grid;place-items:center;border:0;background:none;color:var(--border-2,#555);cursor:pointer}
.eq-stars button .ag-i{stroke:var(--muted)}
.eq-stars button.on{color:var(--yellow)}.eq-stars button.on .ag-i{fill:var(--yellow);stroke:var(--yellow)}
.eq-del{float:right;width:auto;margin:0;padding:0 2px;border:0;background:none;color:var(--muted);cursor:pointer}
.crm-tag.eq-src-c{color:var(--yellow)}
.eq-ia{margin-top:14px;padding:12px 14px;border-radius:16px;border:1px solid var(--accent);background:var(--card2);font-size:13.5px;line-height:1.5}
.eq-ia-h{display:flex;align-items:center;gap:6px;font-weight:700;color:var(--accent);margin-bottom:4px}.eq-ia-h span{margin-left:auto;font-weight:500;font-size:12px;color:var(--muted)}
.eq-ia p{margin:6px 0}.eq-ia ul{margin:6px 0;padding-left:18px}
.eq-check{display:flex !important;align-items:center;gap:10px;margin-top:14px;font-weight:600}.eq-check input{width:auto !important;margin:0}
.eq-imp{margin:4px 0 6px;padding:12px;border-radius:16px;background:var(--card2);border:1px dashed var(--border-2,var(--border))}
.eq-imp-h{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;color:var(--accent);margin-bottom:8px}
.eq-imp-b{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.eq-imp-b button{display:flex;align-items:center;gap:7px;width:100%;margin:0;padding:10px;border-radius:12px;border:1px solid var(--border);background:var(--card);color:var(--text);font:600 12.5px Inter,sans-serif;text-align:left;cursor:pointer;line-height:1.25}
.eq-imp-b button .ag-i{flex-shrink:0;color:var(--accent)}
.eq-dup{display:flex;align-items:center;gap:10px;margin-top:10px;padding:10px 12px;border-radius:12px;border:1px solid var(--yellow);color:var(--text)}
.eq-dup>.ag-i{color:var(--yellow);flex-shrink:0}.eq-dup div{flex:1;min-width:0}.eq-dup b{display:block;font-size:13px}.eq-dup span{font-size:12px;color:var(--muted)}
.eq-dup button{width:auto;margin:0;padding:8px 10px;border-radius:10px;border:0;background:var(--yellow);color:#111;font:700 12px Inter,sans-serif;cursor:pointer;white-space:nowrap}
.eq-filled{border-color:var(--accent) !important}
.eq-pick span{display:block;font-size:12px;color:var(--muted)}.eq-warn{color:var(--yellow);font-style:normal}
.eq-switchline{display:flex !important;align-items:center;gap:12px;margin:12px 0 0;padding:12px;border-radius:12px;background:var(--card2);border:1px solid var(--border);cursor:pointer}
.eq-switchline input{width:20px !important;height:20px;margin:0;flex-shrink:0;accent-color:var(--accent)}
.eq-switchline b{display:block;font-size:13.5px;color:var(--text)}.eq-switchline small{display:block;font-size:12px;color:var(--muted);font-weight:500}
.eq-collab-hint{font-size:12px;color:var(--accent);margin:6px 2px 0;line-height:1.4}
#shootPrice:disabled{opacity:.55}
.eq-team{margin-top:14px;padding:12px;border-radius:14px;background:var(--card2);border:1px solid var(--border)}
.eq-team-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.eq-team-h b{font-size:13px}
.eq-team-h button{width:auto;margin:0;padding:5px 12px;border-radius:9px;border:0;background:var(--accent);color:#fff;font:700 12px Inter,sans-serif;cursor:pointer}
.eq-team-row{display:flex;align-items:center;gap:6px;padding:8px 0;border-top:1px solid var(--border);flex-wrap:wrap}
.eq-team-n{flex:1 1 150px;min-width:0;display:flex;flex-direction:column;gap:4px}.eq-team-n b{font-size:13px}
.eq-team-n select,.eq-team-row input,.eq-link select{margin:0;padding:6px;font-size:12px}
.eq-team-row input{flex:1 1 110px;min-width:0}
.eq-team-paid{font-size:12px;color:var(--green);font-weight:600}
.eq-x{width:auto !important;margin:0;padding:4px 10px;border:1px solid var(--red);border-radius:8px;background:none;color:var(--red);font-size:14px;cursor:pointer}
.eq-team-empty{font-size:12px;color:var(--muted);padding:4px 0}
.eq-sugg{display:flex;align-items:center;gap:8px;margin-top:8px;padding:8px 10px;border-radius:10px;border:1px solid var(--accent);font-size:12.5px}
.eq-sugg span{flex:1}.eq-sugg button{width:auto;margin:0;padding:6px 12px;border-radius:9px;border:0;background:var(--accent);color:#fff;font:700 12px Inter,sans-serif;cursor:pointer}
.eq-links{margin-top:10px;padding-top:8px;border-top:1px solid var(--border)}
.eq-links-h{display:block;font-size:11.5px;color:var(--muted);margin-bottom:4px}
.eq-link{display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12.5px}.eq-link span{flex:1;min-width:0}.eq-link select{flex:0 0 46%}
.eq-collab-badge{background:var(--card3,#333) !important;color:var(--accent) !important;border:1px solid var(--accent)}
.eq-teamline{font-size:12px;color:var(--muted);margin:4px 0 0}.eq-teamline a{color:var(--accent);cursor:pointer;font-weight:600}
`;
  document.head.appendChild(st);
}
eqStyle();
// La page Clients est peut-etre deja affichee
(function(){ const p = document.querySelector('.page.active'); if(p && p.id === 'page-clients' && typeof crmRender === 'function' && typeof CRM !== 'undefined' && CRM.loaded) crmRender(); })();
