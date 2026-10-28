// ============================================================
// SUPER APP HENZO - EQUIPE ET PARTENAIRES
// - Roles : client, modele, ami, maquilleuse, coiffeuse, assistant...
// - Vue "Equipe & partenaires" dans l'onglet Clients
// - Fiche d'une personne : seances, paye, rapporte, notes, progression, IA
// - Seance collaboration et equipe sur une seance (formulaire seance)
// - Ajouter un contact vite : contacts du telephone, .vcf, texte colle, capture
// - Espace equipe : lien personnel secret (equipe.html?t=...), taches, defis, bonus de promotion, analyse
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
  await eqLoadPort(true);
  EQ.loaded = true;
  eqBonusSoon();
  setTimeout(eqParRepair, 3000);
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

    ${eqEspaceHtml()}

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
  else if(Date.now() - EQ.portAt > 60000) eqLoadPort().then(() => { if(document.getElementById('eqFiche')){ eqPortRender(id); eqTachesRender(id); const b = document.getElementById('eqBonusBox'); if(b) b.innerHTML = eqBonusHtml(c); } });
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
    ${typeof window.msgEcrire === 'function' ? `<button class="btn-secondary eq-msg" onclick="window.msgEcrire({ids:[${c.id}]})">${eqI('mail', 16)} Écrire un message</button>` : ''}

    <div id="eqPortBox">${eqPortHtml(c)}</div>
    <div id="eqTachesBox">${eqTachesHtml(c)}</div>
    <div id="eqBonusBox">${eqBonusHtml(c)}</div>
    <div id="eqAnaBox">${eqAnaHtml(c)}</div>

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
  // On garde ce qui vient de l'espace equipe (consignes, presence confirmee)
  const list = (EQ.sh.equipe || []).filter(m => m.personne_id).map(m => {
    const o = Object.assign({}, m, { personne_id: Number(m.personne_id), role: m.role || null });
    if(Number(m.montant) > 0) o.montant = Number(m.montant); else delete o.montant;
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
// ESPACE EQUIPE : lien personnel secret, taches, defis, bonus, analyse
// Le membre ouvre equipe.html?t=TOKEN (sans compte). La page ne lit rien
// directement : elle passe par les fonctions equipe_portail, equipe_tache_maj,
// equipe_confirmer et equipe_defi_maj, qui verifient le lien.
// ============================================================
const EQ_VOIR = [
  ['seances', 'Ses séances', 'Date, heure, lieu, consignes, moodboard. Jamais le prix ni le nom du client'],
  ['taches', 'Ses tâches', 'Il coche « fait » et laisse un commentaire'],
  ['notes', 'Ses notes', 'Moyennes et courbe'],
  ['commentaires', 'Tes commentaires', 'Les derniers commentaires de ses notes'],
  ['paiements', 'Ses paiements', 'Ce que tu lui as payé et ce que tu lui dois'],
  ['promo', 'Promotion', 'Son lien à partager, son bonus, ses filleuls'],
  ['defis', 'Défis du mois', 'Il avance et dit quand il a fini'],
  ['classement', 'Classement du mois', 'Prénoms, clients ramenés et défis validés']
];
const EQ_VOIR_DEF = { seances: true, taches: true, notes: true, commentaires: false, paiements: true, promo: true, defis: true, classement: true };
const EQ_MODELES = {
  maquilleuse: ['Arriver 30 min avant', 'Kit nettoyé', 'Produits pour peau noire prêts', 'Envoyer une photo du maquillage fini'],
  coiffeuse: ['Arriver 30 min avant', 'Matériel propre', 'Perruques et accessoires prêts'],
  assistant: ['Batteries chargées', 'Fond installé', 'Cartes mémoire vidées', 'Lumières testées', 'Ranger le studio après'],
  videaste: ['Batteries chargées', 'Cartes vidées', 'Envoyer les rushs', 'Micro testé'],
  modele: ['Tenues préparées', 'Arriver à l\'heure', 'Partager les photos en story'],
  decorateur: ['Décor installé 1 h avant', 'Photos du décor envoyées'],
  partenaire: ['Lieu ouvert et propre', 'Confirmer la réservation'],
  autre: ['Arriver à l\'heure', 'Confirmer sa présence']
};
Object.assign(EQ, { taches: [], defis: [], suivi: [], bonus: [], promo: {}, portAt: 0 });

function eqPort(c){ const p = c && c.portail; return p && typeof p === 'object' && !Array.isArray(p) ? p : {}; }
function eqPortOn(c){ return eqPort(c).actif === true && !!(c && c.portail_token); }
function eqVoir(c){ return Object.assign({}, EQ_VOIR_DEF, eqPort(c).voir || {}); }
// Lien secret : 40 caracteres tires au hasard (crypto), sans biais
function eqNewToken(){
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', out = [], buf = new Uint8Array(64);
  while(out.length < 40){ crypto.getRandomValues(buf); for(const b of buf){ if(b < 248 && out.length < 40) out.push(A[b % 62]); } }
  return out.join('');
}
function eqPortUrl(c){
  if(!c || !c.portail_token) return '';
  const base = /^https?:/.test(location.origin) ? location.origin : 'https://hyperapp-henzo.vercel.app';
  return base + '/equipe.html?t=' + encodeURIComponent(c.portail_token);
}
function eqPromoCfg(){ return Object.assign({ bonus_type: 'montant', valeur: 0, message: '', classement: true, depuis: null }, EQ.promo || {}); }
function eqTime(d){ return d ? new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', ' h ') : ''; }
function eqShootPaid(s){
  if(!s || eqCancelled(s) || s.collab) return false;
  return s.payment === 'paye' || (Number(s.price) > 0 && Number(s.montant_recu || 0) >= Number(s.price));
}

// ---------- Chargement ----------
async function eqLoadPort(force){
  if(!force && EQ.portAt && Date.now() - EQ.portAt < 60000) return;
  EQ.portAt = Date.now();
  const get = async t => { try { const { data, error } = await sb.from(t).select('*').order('id', { ascending: false }); return error ? null : (data || []); } catch(e){ return null; } };
  const [t, d, s, b] = await Promise.all([get('equipe_taches'), get('equipe_defis'), get('equipe_defis_suivi'), get('equipe_bonus')]);
  if(t) EQ.taches = t; if(d) EQ.defis = d; if(s) EQ.suivi = s; if(b) EQ.bonus = b;
  try {
    const u = await eqUid();
    if(u){ const { data } = await sb.from('user_settings').select('user_preferences').eq('user_id', u).maybeSingle(); EQ.promo = (data && data.user_preferences && data.user_preferences.equipe_promo) || {}; }
  } catch(e){}
  // Les membres confirment leur presence depuis leur page : on reprend shoots.equipe a jour
  try {
    const { data } = await sb.from('shoots').select('id,equipe').gte('date', new Date(Date.now() - 45 * eqDay).toISOString());
    (data || []).forEach(r => { const s = eqShoots().find(x => x.id === r.id); if(s && Array.isArray(r.equipe)) s.equipe = r.equipe; });
  } catch(e){}
  EQ.portLoaded = true;
}

// ============================================================
// FICHE MEMBRE : ESPACE PERSONNEL
// ============================================================
function eqPortHtml(c){
  const on = eqPortOn(c), p = eqPort(c), v = eqVoir(c), url = eqPortUrl(c);
  const next = eqWorked(c.id).filter(s => s.date && new Date(s.date) >= new Date(Date.now() - 3 * 3600e3)).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return `<div class="eq-port ${on ? 'on' : ''}">
    <div class="eq-port-h"><div><b>Espace personnel</b><span>${on ? (p.vu ? 'Ouvert ' + eqAgo(p.vu) : 'Lien pas encore ouvert') : p.actif === false && c.portail_token ? 'Lien coupé' : 'Un lien secret, sans compte ni mot de passe'}</span></div>
      <i class="eq-port-st">${on ? 'Actif' : 'Inactif'}</i></div>
    ${on ? `<div class="eq-port-url" onclick="crmCopy('${eqE(url)}')"><span>${eqE(url.replace(/^https?:\/\//, ''))}</span>${eqI('copy', 15)}</div>
      <div class="eq-port-b">
        <button class="main" onclick="eqPortWa(${c.id})">${eqI('chat', 15)}Envoyer sur WhatsApp</button>
        <button onclick="crmCopy('${eqE(url)}')">${eqI('copy', 15)}Copier</button>
        <button onclick="window.open('${eqE(url)}','_blank')">${eqI('eye', 15)}Voir sa page</button>
        <button onclick="eqPortRegen(${c.id})">${eqI('refresh', 15)}Nouveau lien</button>
        <button class="danger" onclick="eqPortCouper(${c.id})">${eqI('ban', 15)}Couper</button>
      </div>
      <div class="eq-sub">Ce qu'il voit</div>
      <div class="eq-voir">${EQ_VOIR.map(([k, n, d]) => `<label class="eq-tg"><div><b>${eqE(n)}</b><span>${eqE(d)}</span></div><input type="checkbox" ${v[k] ? 'checked' : ''} onchange="eqVoirSet(${c.id},'${k}',this.checked)"><i></i></label>`).join('')}</div>
      <div class="eq-sub">Consignes pour toutes ses séances</div>
      <textarea id="eqConsAll" rows="2" placeholder="Ex : toujours arriver 30 min avant, tenue noire">${eqE(p.consignes || '')}</textarea>
      <button class="eq-mini" onclick="eqConsAllSave(${c.id})">Enregistrer</button>
      ${next.length ? `<div class="eq-sub">Consignes pour ses prochaines séances</div>${next.slice(0, 5).map(s => { const m = eqTeam(s).find(e => Number(e.personne_id) === c.id) || {}; return `
        <div class="eq-cons"><div class="eq-cons-h"><b>${eqE(s.type || 'Séance')} · ${eqDate(s.date, { weekday: 'short', day: 'numeric', month: 'short' })} ${eqTime(s.date)}</b>
          ${m.confirme ? '<i class="eq-ok">Présence confirmée</i>' : '<i class="eq-wait">Pas encore confirmé</i>'}</div>
          <textarea id="eqCons_${s.id}" rows="2" placeholder="Ex : maquillage naturel, la mariée a la peau sensible">${eqE(m.consignes || '')}</textarea>
          <button class="eq-mini" onclick="eqConsSave(${c.id},${s.id})">Enregistrer</button></div>`; }).join('')}` : ''}`
    : `<p class="eq-port-txt">${eqE(eqFirst(c))} reçoit un lien personnel. Il y voit ses séances, ses tâches, ses notes, ses paiements, son lien de promotion et les défis du mois, selon ce que tu choisis. Pas de compte, pas de mot de passe.</p>
      <button class="btn-primary" onclick="eqPortActiver(${c.id})">${c.portail_token ? 'Réactiver son espace' : 'Activer son espace'}</button>`}
  </div>`;
}
function eqPortRender(id){
  const c = eqPerson(id), el = document.getElementById('eqPortBox');
  if(c && el) el.innerHTML = eqPortHtml(c);
}
async function eqPortSave(c, patch, extra){
  const portail = Object.assign({}, eqPort(c), patch);
  const r = await dbUpdate('clients', c.id, Object.assign({ portail }, extra || {}));
  if(r) Object.assign(c, r);
  return r;
}
async function eqPortActiver(id){
  const c = eqPerson(id); if(!c) return;
  const extra = c.portail_token ? {} : { portail_token: eqNewToken() };
  const r = await eqPortSave(c, { actif: true, voir: eqVoir(c), active_le: eqPort(c).active_le || new Date().toISOString() }, extra);
  if(!r) return;
  if(!c.code_parrain && typeof exParEnsureCode === 'function'){ try { await exParEnsureCode(c); } catch(e){} }
  agToast('Espace personnel activé');
  eqPortRender(id);
}
async function eqPortRegen(id){
  const c = eqPerson(id); if(!c) return;
  if(!await agConfirm(`Créer un nouveau lien ?\nL'ancien lien de ${eqFirst(c)} ne marchera plus. Tu devras lui envoyer le nouveau.`, { ok: 'Nouveau lien' })) return;
  const r = await eqPortSave(c, { actif: true }, { portail_token: eqNewToken() });
  if(r){ agToast('Nouveau lien créé : l\'ancien ne marche plus'); eqPortRender(id); }
}
async function eqPortCouper(id){
  const c = eqPerson(id); if(!c) return;
  if(!await agConfirm(`Couper l'espace de ${eqFirst(c)} ?\nSon lien ne montrera plus rien. Tu pourras le réactiver plus tard.`, { ok: 'Couper' })) return;
  const r = await eqPortSave(c, { actif: false });
  if(r){ agToast('Espace coupé'); eqPortRender(id); }
}
async function eqVoirSet(id, k, on){
  const c = eqPerson(id); if(!c) return;
  const v = eqVoir(c); v[k] = !!on;
  const r = await eqPortSave(c, { voir: v });
  if(!r) eqPortRender(id);
}
function eqPortMsg(c){
  const v = eqVoir(c), url = eqPortUrl(c);
  const l = [v.seances && 'tes séances avec l\'heure, le lieu et mes consignes', v.taches && 'tes tâches à cocher', v.notes && 'tes notes', v.paiements && 'tes paiements',
    v.promo && 'ton lien pour me ramener des clients (avec un bonus pour toi)', v.defis && 'les défis du mois'].filter(Boolean);
  return `Bonjour ${eqFirst(c)} ! Voici ton espace personnel Henzo Photographie :\n${url}\n\n${l.length ? 'Tu y trouveras :\n' + l.map(x => '- ' + x).join('\n') + '\n\n' : ''}Pense à confirmer ta présence avant chaque séance. Ce lien est personnel : ne le partage pas. Garde-le dans tes favoris.`;
}
function eqPortWa(id){ const c = eqPerson(id); if(c) crmWa(id, eqPortMsg(c)); }
async function eqConsAllSave(id){
  const c = eqPerson(id), el = document.getElementById('eqConsAll'); if(!c || !el) return;
  const r = await eqPortSave(c, { consignes: el.value.trim().slice(0, 1000) });
  if(r) agToast('Consignes enregistrées');
}
async function eqConsSave(pid, sid){
  const s = eqShoots().find(x => x.id === Number(sid)), el = document.getElementById('eqCons_' + sid); if(!s || !el) return;
  const txt = el.value.trim().slice(0, 1000);
  const team = JSON.parse(JSON.stringify(eqTeam(s)));
  let m = team.find(e => Number(e.personne_id) === Number(pid));
  if(!m){ m = { personne_id: Number(pid), role: eqRoleKey(eqPerson(pid)) }; team.push(m); }
  if(txt) m.consignes = txt; else delete m.consignes;
  const r = await dbUpdate('shoots', s.id, { equipe: team });
  if(r){ Object.assign(s, r); if(!Array.isArray(s.equipe)) s.equipe = team; agToast('Consignes enregistrées'); }
}

// ============================================================
// TACHES
// ============================================================
function eqTacheLate(t){ return (t.statut === 'a_faire' || t.statut === 'refuse') && t.echeance && new Date(t.echeance) < new Date(); }
const EQ_TST = { a_faire: ['À faire', ''], fait: ['Fait, à valider', 'fait'], valide: ['Validé', 'ok'], refuse: ['Refusé, à refaire', 'ko'] };
function eqTacheRow(t, withName){
  const p = withName ? eqPerson(t.personne_id) : null, s = t.shoot_id ? eqShoots().find(x => x.id === Number(t.shoot_id)) : null;
  const late = eqTacheLate(t), st = EQ_TST[t.statut] || EQ_TST.a_faire;
  return `<div class="eq-task ${late ? 'late' : ''} ${t.statut}">
    <div class="eq-task-h"><b>${p ? eqE(eqFirst(p)) + ' · ' : ''}${eqE(t.titre || 'Tâche')}</b><i class="eq-st ${late ? 'late' : st[1]}">${late ? 'En retard' : st[0]}</i></div>
    <span>${[t.echeance ? 'Pour le ' + eqDate(t.echeance, { day: 'numeric', month: 'short' }) + ' ' + eqTime(t.echeance) : 'Sans date', s ? eqE((s.type || 'Séance') + ' du ' + eqDate(s.date, { day: 'numeric', month: 'short' })) : ''].filter(Boolean).join(' · ')}</span>
    ${t.detail ? `<p>${eqE(t.detail)}</p>` : ''}
    ${t.fait_le ? `<span class="eq-done">Fait ${eqAgo(t.fait_le)}${t.echeance && new Date(t.fait_le) > new Date(t.echeance) ? ' (en retard)' : ''}</span>` : ''}
    ${t.commentaire ? `<p class="eq-com">« ${eqE(t.commentaire)} »</p>` : ''}
    ${t.photo_url ? `<a class="eq-photo" href="${eqE(t.photo_url)}" target="_blank" rel="noopener">Voir la photo</a>` : ''}
    <div class="eq-task-b">
      ${t.statut === 'fait' ? `<button class="ok" onclick="eqTacheValider(${t.id},true)">Valider</button><button class="ko" onclick="eqTacheValider(${t.id},false)">Refuser</button>` : ''}
      ${t.statut !== 'valide' ? `<button onclick="eqTacheForm(${t.personne_id},${t.id})">Modifier</button>` : ''}
      <button onclick="eqTacheDelete(${t.id})">Supprimer</button>
    </div></div>`;
}
function eqTachesHtml(c){
  const all = EQ.taches.filter(t => Number(t.personne_id) === c.id);
  const ouvertes = all.filter(t => t.statut !== 'valide').sort((a, b) => (b.statut === 'fait') - (a.statut === 'fait') || String(a.echeance || '9').localeCompare(String(b.echeance || '9')));
  const faites = all.filter(t => t.statut === 'valide').sort((a, b) => String(b.valide_le || '').localeCompare(String(a.valide_le || ''))).slice(0, 3);
  return `<h4 class="crm-h4">Tâches <span class="crm-count">${ouvertes.length}</span></h4>
    ${ouvertes.length ? ouvertes.map(t => eqTacheRow(t)).join('') : '<div class="ag-list"><div class="ag-empty">Pas de tâche en cours.</div></div>'}
    ${faites.length ? `<div class="eq-sub">Dernières validées</div>${faites.map(t => `<div class="eq-task-mini"><i class="eq-ck"></i>${eqE(t.titre)} <span>${eqDate(t.valide_le, { day: 'numeric', month: 'short' })}</span></div>`).join('')}` : ''}
    <button class="crm-link" onclick="eqTacheForm(${c.id},null)">+ Nouvelle tâche pour ${eqE(eqFirst(c))}</button>`;
}
function eqTachesRender(pid){
  const c = eqPerson(pid), el = document.getElementById('eqTachesBox');
  if(c && el) el.innerHTML = eqTachesHtml(c);
  const ana = document.getElementById('eqAnaBox'); if(c && ana) ana.innerHTML = eqAnaHtml(c);
  if(document.querySelector('.page.active#page-clients') && typeof CRM !== 'undefined' && CRM.view === 'equipe' && !document.getElementById('eqFiche')) eqRender();
}
function eqLocalInput(d){ if(!d) return ''; const x = new Date(d); return new Date(x - x.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); }
function eqTacheForm(pid, id){
  const c = eqPerson(pid); if(!c) return;
  const t = id ? EQ.taches.find(x => x.id === Number(id)) : null;
  const ss = eqWorked(pid).filter(s => s.date && new Date(s.date) > Date.now() - 7 * eqDay).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const mod = EQ_MODELES[eqRoleKey(c)] || EQ_MODELES.autre;
  agSheet('eqTache', `<h3>${t ? 'Modifier la tâche' : 'Tâche pour ' + eqE(eqFirst(c))}</h3>
    ${!t ? `<label>Modèles rapides</label><div class="ag-pills" id="eqTMod">${mod.map(m => `<button type="button" onclick="document.getElementById('eqTTitre').value=this.textContent;this.parentElement.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===this))">${eqE(m)}</button>`).join('')}</div>` : ''}
    <label>Titre</label><input id="eqTTitre" maxlength="150" value="${eqE(t ? t.titre : '')}" placeholder="Ex : Arriver 30 min avant">
    <label>Détail (facultatif)</label><textarea id="eqTDetail" rows="2" maxlength="600">${eqE(t ? t.detail || '' : '')}</textarea>
    <label>Séance liée (facultatif)</label><select id="eqTShoot" onchange="const o=this.selectedOptions[0];const e=document.getElementById('eqTEch');if(o&&o.dataset.d&&!e.value)e.value=o.dataset.d">
      <option value="">Aucune</option>${ss.map(s => `<option value="${s.id}" data-d="${eqLocalInput(s.date)}" ${t && Number(t.shoot_id) === s.id ? 'selected' : ''}>${eqE((s.type || 'Séance') + ' · ' + eqDate(s.date, { day: 'numeric', month: 'short' }) + ' ' + eqTime(s.date))}</option>`).join('')}</select>
    <label>Échéance</label><input id="eqTEch" type="datetime-local" value="${eqLocalInput(t && t.echeance)}">
    <button class="btn-primary" id="eqTBtn" onclick="eqTacheSave(${pid},${t ? t.id : 'null'})">Enregistrer</button>`);
}
async function eqTacheSave(pid, id){
  const v = k => String((document.getElementById(k) || {}).value || '').trim();
  const titre = v('eqTTitre').slice(0, 150); if(!titre){ agAlert('Donne un titre à la tâche.'); return; }
  const btn = document.getElementById('eqTBtn'); if(btn){ if(btn.dataset.busy) return; btn.dataset.busy = '1'; btn.disabled = true; }
  const row = { personne_id: Number(pid), titre, detail: v('eqTDetail').slice(0, 600) || null, shoot_id: v('eqTShoot') ? Number(v('eqTShoot')) : null, echeance: v('eqTEch') ? new Date(v('eqTEch')).toISOString() : null };
  let r;
  if(id){ r = await dbUpdate('equipe_taches', id, row); if(r) Object.assign(EQ.taches.find(x => x.id === id) || {}, r); }
  else { r = await dbInsert('equipe_taches', Object.assign(row, { statut: 'a_faire' })); if(r) EQ.taches.unshift(r); }
  if(!r){ if(btn){ btn.disabled = false; delete btn.dataset.busy; } return; }
  agCloseSheet('eqTache');
  agToast(id ? 'Tâche modifiée' : 'Tâche créée : elle apparaît sur sa page');
  eqTachesRender(pid);
}
async function eqTacheValider(id, ok){
  const t = EQ.taches.find(x => x.id === Number(id)); if(!t) return;
  let patch;
  if(ok) patch = { statut: 'valide', valide_le: new Date().toISOString() };
  else {
    const why = await agPrompt('Refuser la tâche\nDis-lui ce qui ne va pas (il le verra sur sa page).', '');
    if(why == null) return;
    patch = { statut: 'refuse', fait_le: null, valide_le: null, commentaire: ('Henzo : ' + (why.trim() || 'à refaire')).slice(0, 500) };
  }
  const r = await dbUpdate('equipe_taches', t.id, patch);
  if(!r) return;
  Object.assign(t, r);
  agToast(ok ? 'Tâche validée' : 'Tâche refusée : il doit la refaire');
  eqTachesRender(t.personne_id);
  if(document.getElementById('eqAValider')) eqAValider();
}
async function eqTacheDelete(id){
  const t = EQ.taches.find(x => x.id === Number(id)); if(!t) return;
  if(!await agConfirm('Supprimer cette tâche ?')) return;
  if(!await dbDelete('equipe_taches', t.id)) return;
  EQ.taches = EQ.taches.filter(x => x.id !== t.id);
  eqTachesRender(t.personne_id);
}

// ============================================================
// DEFIS DU MOIS
// ============================================================
function eqDefiOuvert(d){ const t = eqToday(); return d.actif !== false && (!d.fin || d.fin >= t) && (!d.debut || d.debut <= t); }
function eqSuiviOf(did){ return EQ.suivi.filter(s => Number(s.defi_id) === Number(did)); }
function eqDefis(){
  const l = EQ.defis.slice().sort((a, b) => (eqDefiOuvert(b) - eqDefiOuvert(a)) || String(b.debut || '').localeCompare(String(a.debut || '')));
  agSheet('eqDefis', `<h3>Défis du mois</h3>
    <div class="ag-hint" style="margin-top:0">Un défi motive ton équipe : « Ramène 3 clients », « 5 stories sur Henzo »... Chacun avance depuis sa page, tu valides.</div>
    <button class="btn-primary" style="margin:10px 0" onclick="eqDefiForm(null)">+ Nouveau défi</button>
    ${l.length ? l.map(d => {
      const su = eqSuiviOf(d.id), obj = Math.max(1, Number(d.objectif) || 1);
      return `<div class="eq-defi ${eqDefiOuvert(d) ? '' : 'off'}">
        <div class="eq-task-h"><b>${eqE(d.titre)}</b><i class="eq-st ${eqDefiOuvert(d) ? 'ok' : ''}">${d.actif === false ? 'Arrêté' : eqDefiOuvert(d) ? 'En cours' : 'Terminé'}</i></div>
        <span>${d.debut ? 'Du ' + eqDate(d.debut, { day: 'numeric', month: 'short' }) : ''}${d.fin ? ' au ' + eqDate(d.fin, { day: 'numeric', month: 'short' }) : ''} · objectif ${obj}${d.recompense ? ' · ' + eqE(d.recompense) : ''}</span>
        ${d.detail ? `<p>${eqE(d.detail)}</p>` : ''}
        <div class="eq-defi-l">${su.length ? su.map(s => { const p = eqPerson(s.personne_id); const pc = Math.min(100, Math.round((Number(s.progres) || 0) / obj * 100)); return `
          <div class="eq-defi-r"><div class="eq-defi-n"><b>${eqE(p ? eqFirst(p) : 'Personne')}</b><span>${Number(s.progres) || 0}/${obj}${s.preuve ? ' · ' + eqE(String(s.preuve).slice(0, 120)) : ''}</span>
            <div class="eq-pbar"><i style="width:${pc}%"></i></div></div>
            ${s.statut === 'a_valider' ? `<div class="eq-task-b"><button class="ok" onclick="eqDefiValider(${s.id},true)">Valider</button><button class="ko" onclick="eqDefiValider(${s.id},false)">Refuser</button></div>`
              : `<i class="eq-st ${s.statut === 'valide' ? 'ok' : s.statut === 'refuse' ? 'ko' : ''}">${{ valide: 'Validé', refuse: 'Refusé', en_cours: 'En cours' }[s.statut] || 'En cours'}</i>`}</div>`; }).join('')
          : '<div class="eq-team-empty">Personne n\'a encore commencé.</div>'}</div>
        <div class="eq-task-b"><button onclick="eqDefiForm(${d.id})">Modifier</button><button onclick="eqDefiPartager(${d.id})">Annoncer sur WhatsApp</button></div>
      </div>`; }).join('') : '<div class="ag-list"><div class="ag-empty">Aucun défi pour le moment.</div></div>'}`);
}
function eqDefiForm(id){
  const d = id ? EQ.defis.find(x => x.id === Number(id)) : null;
  const now = new Date(), fin = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const ymd = x => new Date(x - x.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  agSheet('eqDefiF', `<h3>${d ? 'Modifier le défi' : 'Nouveau défi'}</h3>
    ${!d ? `<label>Idées</label><div class="ag-pills">${[['Ramène 3 clients', 3, 'Partage ton lien et ramène 3 nouveaux clients ce mois'], ['5 stories sur Henzo', 5, 'Publie 5 stories qui parlent du studio'], ['Zéro retard ce mois', 1, 'Arrive à l\'heure à toutes tes séances'], ['2 avis Google', 2, 'Demande à 2 clients de laisser un avis']]
      .map(([t, o, dt]) => `<button type="button" onclick="eqDefiIdee(this)" data-t="${eqE(t)}" data-o="${o}" data-d="${eqE(dt)}">${eqE(t)}</button>`).join('')}</div>` : ''}
    <label>Titre</label><input id="eqDTitre" maxlength="120" value="${eqE(d ? d.titre : '')}" placeholder="Ex : Ramène 3 clients">
    <label>Détail</label><textarea id="eqDDetail" rows="2" maxlength="600">${eqE(d ? d.detail || '' : '')}</textarea>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div><label>Début</label><input id="eqDDebut" type="date" value="${eqE(d ? d.debut || '' : ymd(now))}"></div>
      <div><label>Fin</label><input id="eqDFin" type="date" value="${eqE(d ? d.fin || '' : ymd(fin))}"></div></div>
    <label>Objectif (nombre)</label><input id="eqDObj" type="number" min="1" inputmode="numeric" value="${d ? Number(d.objectif) || 1 : 3}">
    <label>Récompense</label><input id="eqDRec" maxlength="150" value="${eqE(d ? d.recompense || '' : '')}" placeholder="Ex : 5 000 F de bonus">
    <label class="eq-check"><input type="checkbox" id="eqDActif" ${!d || d.actif !== false ? 'checked' : ''}> Défi actif (visible par l'équipe)</label>
    <button class="btn-primary" id="eqDBtn" onclick="eqDefiSave(${d ? d.id : 'null'})">Enregistrer</button>`);
}
function eqDefiIdee(b){ document.getElementById('eqDTitre').value = b.dataset.t; document.getElementById('eqDObj').value = b.dataset.o; const d = document.getElementById('eqDDetail'); if(!d.value) d.value = b.dataset.d; }
async function eqDefiSave(id){
  const v = k => String((document.getElementById(k) || {}).value || '').trim();
  const titre = v('eqDTitre').slice(0, 120); if(!titre){ agAlert('Donne un titre au défi.'); return; }
  if(v('eqDFin') && v('eqDDebut') && v('eqDFin') < v('eqDDebut')){ agAlert('La date de fin est avant le début.'); return; }
  const btn = document.getElementById('eqDBtn'); if(btn){ if(btn.dataset.busy) return; btn.dataset.busy = '1'; btn.disabled = true; }
  const row = { titre, detail: v('eqDDetail').slice(0, 600) || null, debut: v('eqDDebut') || eqToday(), fin: v('eqDFin') || null, objectif: Math.max(1, parseInt(v('eqDObj')) || 1), recompense: v('eqDRec').slice(0, 150) || null, actif: !!(document.getElementById('eqDActif') || {}).checked };
  let r;
  if(id){ r = await dbUpdate('equipe_defis', id, row); if(r) Object.assign(EQ.defis.find(x => x.id === id) || {}, r); }
  else { r = await dbInsert('equipe_defis', row); if(r) EQ.defis.unshift(r); }
  if(!r){ if(btn){ btn.disabled = false; delete btn.dataset.busy; } return; }
  agCloseSheet('eqDefiF');
  agToast(id ? 'Défi modifié' : 'Défi créé : il apparaît sur la page de ton équipe');
  eqDefis();
}
async function eqDefiValider(sid, ok){
  const s = EQ.suivi.find(x => x.id === Number(sid)); if(!s) return;
  const p = eqPerson(s.personne_id), d = EQ.defis.find(x => x.id === Number(s.defi_id));
  if(!await agConfirm(ok ? `Valider le défi de ${p ? eqFirst(p) : 'ce membre'} ?${d && d.recompense ? '\nRécompense : ' + d.recompense : ''}` : `Refuser le défi de ${p ? eqFirst(p) : 'ce membre'} ?\nIl pourra continuer et le renvoyer.`, { ok: ok ? 'Valider' : 'Refuser' })) return;
  const r = await dbUpdate('equipe_defis_suivi', s.id, ok ? { statut: 'valide', valide_le: new Date().toISOString() } : { statut: 'refuse', valide_le: null });
  if(!r) return;
  Object.assign(s, r);
  agToast(ok ? 'Défi validé' : 'Défi refusé');
  if(document.getElementById('eqDefis')) eqDefis();
  if(document.getElementById('eqAValider')) eqAValider();
}
function eqDefiPartager(id){
  const d = EQ.defis.find(x => x.id === Number(id)); if(!d) return;
  const t = `Défi du mois Henzo Photographie : ${d.titre}\n${d.detail ? d.detail + '\n' : ''}Objectif : ${Number(d.objectif) || 1}${d.fin ? ', avant le ' + eqDate(d.fin, { day: 'numeric', month: 'long' }) : ''}${d.recompense ? '\nRécompense : ' + d.recompense : ''}\n\nSuis tes progrès et dis-moi quand tu as fini dans ton espace personnel.`;
  window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank');
}

// ============================================================
// BONUS DE PROMOTION
// Un membre de l'equipe qui ramene un client (clients.parrain_id = membre) recoit un bonus
// en argent (equipe_bonus) quand ce client a une seance payee : une seule fois par seance.
// Les paliers de reduction du parrainage client (extras.js) restent pour les clients :
// un membre de l'equipe n'en recoit pas en plus (voir eqHooks, exParGive).
// ============================================================
async function eqBonusCheck(){
  const cfg = eqPromoCfg();
  if(!EQ.portLoaded || !(Number(cfg.valeur) > 0) || cfg.on === false) return [];
  if(EQ.bonusBusy) return [];
  EQ.bonusBusy = true;
  const out = [];
  try {
    const uid = await eqUid(); if(!uid) return [];
    for(const m of eqPeople()){
      const fs = eqClients().filter(f => f.parrain_id != null && Number(f.parrain_id) === m.id && f.id !== m.id);
      for(const f of fs){
        for(const s of eqShoots().filter(x => Number(x.client_id) === f.id && eqShootPaid(x) && (!cfg.depuis || String(x.date || '').slice(0, 10) >= cfg.depuis))){
          if(EQ.bonus.some(b => Number(b.personne_id) === m.id && Number(b.shoot_id) === s.id)) continue;
          const montant = cfg.bonus_type === 'pourcent' ? Math.round((Number(s.price) || 0) * Number(cfg.valeur) / 100) : Math.round(Number(cfg.valeur));
          if(!(montant > 0)) continue;
          const row = { user_id: uid, personne_id: m.id, client_id: f.id, shoot_id: s.id, montant, statut: 'du', motif: `${eqFirst(f)} : séance ${String(s.type || '').toLowerCase()} payée`.replace(/\s+/g, ' ').slice(0, 200) };
          const { data, error } = await sb.from('equipe_bonus').insert(row).select().single();
          if(!error && data){ EQ.bonus.unshift(data); out.push({ m, f, b: data }); }
          else if(error) console.warn('equipe_bonus', error.message);
        }
      }
    }
  } catch(e){ console.warn('eqBonusCheck', e); }
  finally { EQ.bonusBusy = false; }
  if(out.length) agToast(out.length === 1 ? `Bonus de ${eqF(out[0].b.montant)} pour ${eqFirst(out[0].m)} : ${eqFirst(out[0].f)} a payé sa séance` : `${out.length} bonus de promotion à payer à ton équipe`);
  return out;
}
// Securite : si un bon de parrainage client a ete cree pour un membre de l'equipe avant que
// la regle ci-dessus soit en place (chargement tres rapide), on l'arrete s'il n'a pas servi.
async function eqParRepair(){
  try {
    const promos = typeof CRM !== 'undefined' && Array.isArray(CRM.promos) ? CRM.promos : [];
    for(const c of eqPeople()){
      const ref = 'Réf. parrainage ' + c.id + '-';
      for(const p of promos.filter(x => x.status === 'active' && String(x.notes || '').includes(ref) && !(x.uses || []).length)){
        const notes = String(p.notes || '') + ' - Arrêté : membre de l\'équipe, il reçoit le bonus équipe à la place.';
        const { error } = await sb.from('promos').update({ status: 'arrete', notes }).eq('id', p.id);
        if(!error){ p.status = 'arrete'; p.notes = notes; }
      }
    }
  } catch(e){ console.warn('eqParRepair', e); }
}
function eqBonusSoon(){ clearTimeout(EQ.bonusT); EQ.bonusT = setTimeout(() => { eqBonusCheck(); }, 1500); }
function eqBonusDus(pid){ return EQ.bonus.filter(b => b.statut === 'du' && (!pid || Number(b.personne_id) === Number(pid))); }
function eqBonusHtml(c){
  const l = EQ.bonus.filter(b => Number(b.personne_id) === c.id);
  if(!l.length) return '';
  const du = l.filter(b => b.statut === 'du'), paye = l.filter(b => b.statut === 'paye');
  return `<h4 class="crm-h4">Bonus de promotion</h4>
    ${du.map(b => `<div class="eq-bonus"><div><b>${eqF(b.montant)}</b><span>${eqE(b.motif || 'Bonus')} · ${eqDate(b.created_at, { day: 'numeric', month: 'short' })}</span></div><button onclick="eqBonusPay(${b.id})">Payer le bonus</button></div>`).join('')}
    ${paye.length ? `<div class="ag-hint">Déjà payé : ${eqF(paye.reduce((a, b) => a + (Number(b.montant) || 0), 0))} (${paye.length} bonus)</div>` : ''}`;
}
function eqBonusPay(id){
  const b = EQ.bonus.find(x => x.id === Number(id)); if(!b || b.statut !== 'du') return;
  const p = eqPerson(b.personne_id);
  const accs = typeof agActiveAccounts === 'function' ? agActiveAccounts() : (typeof accounts !== 'undefined' ? accounts : []);
  if(!accs.length){ agAlert("Crée d'abord un compte : une dépense part toujours d'un compte."); return; }
  agSheet('eqPay', `<h3>Payer le bonus de ${eqE(p ? eqFirst(p) : '')}</h3>
    <div class="ag-hint" style="margin-top:0">${eqE(b.motif || '')}</div>
    <div class="eq-pay-amt">${eqF(b.montant)}</div>
    <label>Depuis quel compte</label><select id="eqPayAcc">${accs.map(a => `<option value="${a.id}">${eqE(a.name)}${typeof agAccountBalance === 'function' ? ' · ' + eqF(agAccountBalance(a)) : ''}</option>`).join('')}</select>
    <div class="ag-hint">Une dépense « Équipe » est créée dans ce compte.</div>
    <button class="btn-primary" id="eqPayBtn" onclick="eqBonusPayGo(${b.id})">Payer ${eqF(b.montant)}</button>`);
}
async function eqBonusPayGo(id){
  const b = EQ.bonus.find(x => x.id === Number(id)); if(!b || b.statut !== 'du') return;
  const btn = document.getElementById('eqPayBtn'); if(btn){ if(btn.dataset.busy) return; btn.dataset.busy = '1'; btn.disabled = true; }
  const acc = Number((document.getElementById('eqPayAcc') || {}).value);
  const p = eqPerson(b.personne_id);
  const note = `Bonus promotion ${p ? eqFirst(p) : ''} : ${b.motif || ''}`.slice(0, 200);
  let d = null;
  try {
    // Deja paye depuis un autre appareil ?
    const { data: cur } = await sb.from('equipe_bonus').select('*').eq('id', b.id).maybeSingle();
    if(cur && cur.statut === 'paye'){ Object.assign(b, cur); agCloseSheet('eqPay'); agToast('Ce bonus est déjà payé'); eqAfterBonus(b); return; }
    if(typeof bgPayer === 'function') d = await bgPayer({ src: { account_id: acc }, amount: b.montant, category: 'Équipe', note, details: 'eqbonus:' + b.id });
    else {
      const a = (typeof accounts !== 'undefined' ? accounts : []).find(x => x.id === acc);
      d = await dbInsert('transactions', { type: 'depense', amount: Math.round(Number(b.montant)), category: 'Équipe', note, date: eqToday(), account_id: acc, payment_method: a ? a.name : null, details: 'eqbonus:' + b.id });
      if(d && typeof txs !== 'undefined') txs.unshift(d);
    }
  } catch(e){ console.warn(e); }
  if(!d){ if(btn){ btn.disabled = false; delete btn.dataset.busy; } return; }
  const r = await dbUpdate('equipe_bonus', b.id, { statut: 'paye', tx_id: d.id, paye_le: new Date().toISOString() });
  Object.assign(b, r || { statut: 'paye', tx_id: d.id });
  agCloseSheet('eqPay');
  agToast('Bonus payé : dépense créée');
  if(typeof refreshAll === 'function') try { refreshAll(); } catch(e){}
  eqAfterBonus(b);
}
function eqAfterBonus(b){
  const el = document.getElementById('eqBonusBox'), p = eqPerson(b.personne_id);
  if(el && p) el.innerHTML = eqBonusHtml(p);
  if(document.getElementById('eqAValider')) eqAValider();
}
function eqPromoReglage(){
  const c = eqPromoCfg();
  agSheet('eqPromo', `<h3>Bonus de promotion</h3>
    <div class="ag-hint" style="margin-top:0">Quand un client ramené par un membre de ton équipe (avec son lien ou son code) a une séance payée, l'app crée un bonus à lui payer. Une seule fois par séance.</div>
    <label>Type de bonus</label><select id="eqPrType"><option value="montant" ${c.bonus_type !== 'pourcent' ? 'selected' : ''}>Montant fixe (F)</option><option value="pourcent" ${c.bonus_type === 'pourcent' ? 'selected' : ''}>Pourcentage de la séance (%)</option></select>
    <label>Valeur</label><input id="eqPrVal" type="number" min="0" inputmode="decimal" value="${Number(c.valeur) || ''}" placeholder="Ex : 5000 ou 10">
    <label>Message pour ton équipe (facultatif)</label><textarea id="eqPrMsg" rows="3" maxlength="600" placeholder="Ex : Chaque client que tu ramènes = 5 000 F pour toi !">${eqE(c.message || '')}</textarea>
    <label class="eq-check"><input type="checkbox" id="eqPrCl" ${c.classement !== false ? 'checked' : ''}> Montrer le classement du mois à l'équipe</label>
    <div class="ag-hint">Les membres de l'équipe ne reçoivent pas les réductions du parrainage client : ils reçoivent ce bonus en argent.${c.depuis ? ' Compte les séances depuis le ' + eqDate(c.depuis) + '.' : ''}</div>
    <button class="btn-primary" id="eqPrBtn" onclick="eqPromoSave()">Enregistrer</button>`);
}
async function eqPromoSave(){
  const v = k => (document.getElementById(k) || {}).value;
  const old = eqPromoCfg();
  const p = { bonus_type: v('eqPrType') === 'pourcent' ? 'pourcent' : 'montant', valeur: Math.max(0, Number(v('eqPrVal')) || 0), message: String(v('eqPrMsg') || '').trim().slice(0, 600), classement: !!(document.getElementById('eqPrCl') || {}).checked };
  if(p.bonus_type === 'pourcent' && p.valeur > 100){ agAlert('Un pourcentage ne peut pas dépasser 100.'); return; }
  // Les seances payees avant le premier reglage ne donnent pas de bonus
  p.depuis = old.depuis || (p.valeur > 0 ? eqToday() : null);
  const ok = typeof crmSavePrefs === 'function' ? await crmSavePrefs({ equipe_promo: p }) : false;
  if(!ok) return;
  EQ.promo = p;
  agCloseSheet('eqPromo');
  agToast('Réglage enregistré');
  eqBonusCheck();
}

// ============================================================
// ANALYSE DES MEMBRES
// ============================================================
function eqMois(d){ const n = new Date(); return d && String(d).slice(0, 7) === `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`; }
function eqAna(c){
  const now = Date.now();
  const tt = EQ.taches.filter(t => Number(t.personne_id) === c.id);
  const comptees = tt.filter(t => ['fait', 'valide', 'refuse'].includes(t.statut) || (t.echeance && new Date(t.echeance) < now));
  const aTemps = comptees.filter(t => (t.statut === 'fait' || t.statut === 'valide') && (!t.echeance || !t.fait_le || new Date(t.fait_le) <= new Date(t.echeance)));
  const sh = eqWorked(c.id).filter(s => s.date && new Date(s.date) > now - 90 * eqDay && new Date(s.date) < now + 2 * eqDay);
  const conf = sh.filter(s => (eqTeam(s).find(e => Number(e.personne_id) === c.id) || {}).confirme);
  const st = eqStats(c);
  const fil = eqClients().filter(f => f.parrain_id != null && Number(f.parrain_id) === c.id && f.id !== c.id);
  const filMois = fil.filter(f => eqMois(f.created_at));
  const dv = EQ.suivi.filter(s => Number(s.personne_id) === c.id && s.statut === 'valide');
  const dvMois = dv.filter(s => eqMois(s.valide_le));
  const parts = [];
  if(comptees.length) parts.push({ k: 'Tâches faites à temps', v: aTemps.length / comptees.length, w: 30, t: `${aTemps.length}/${comptees.length}` });
  if(sh.length) parts.push({ k: 'Présence confirmée', v: conf.length / sh.length, w: 20, t: `${conf.length}/${sh.length} séances` });
  if(st.avg != null) parts.push({ k: 'Notes', v: st.avg / 5, w: 30, t: eqNote(st.avg) + '/5' });
  if(fil.length || eqPortOn(c)) parts.push({ k: 'Clients ramenés', v: Math.min(1, fil.length / 3), w: 10, t: `${fil.length}${filMois.length ? ' dont ' + filMois.length + ' ce mois' : ''}` });
  if(dv.length || EQ.defis.some(eqDefiOuvert)) parts.push({ k: 'Défis validés', v: Math.min(1, dv.length / 2), w: 10, t: `${dv.length}${dvMois.length ? ' dont ' + dvMois.length + ' ce mois' : ''}` });
  const W = parts.reduce((a, x) => a + x.w, 0);
  const score = W ? Math.round(parts.reduce((a, x) => a + x.v * x.w, 0) / W * 100) : null;
  return { tachesN: comptees.length, tachesOk: aTemps.length, tauxTaches: comptees.length ? aTemps.length / comptees.length : null,
    seances: sh.length, conf: conf.length, tauxPresence: sh.length ? conf.length / sh.length : null, avg: st.avg,
    clients: fil.length, clientsMois: filMois.length, defis: dv.length, defisMois: dvMois.length, parts, score,
    enRetard: tt.filter(eqTacheLate).length, aValider: tt.filter(t => t.statut === 'fait').length };
}
function eqPct(x){ return x == null ? '-' : Math.round(x * 100) + ' %'; }
function eqScoreCls(s){ return s == null ? '' : s >= 75 ? 'hi' : s >= 50 ? 'mid' : 'lo'; }
function eqAnaHtml(c){
  const a = eqAna(c);
  if(!a.parts.length) return '';
  return `<h4 class="crm-h4">Note équipe</h4>
    <div class="eq-score"><div class="eq-score-n ${eqScoreCls(a.score)}"><b>${a.score}</b><span>/100</span></div>
      <div class="eq-score-d">${a.parts.map(x => `<div><span>${eqE(x.k)}</span><b>${eqE(x.t)}</b><div class="eq-pbar"><i style="width:${Math.round(x.v * 100)}%"></i></div></div>`).join('')}</div></div>
    <div class="ag-hint">Calcul : tâches à temps 30 %, notes 30 %, présence confirmée 20 %, clients ramenés 10 % (3 = plein), défis validés 10 % (2 = plein). Seulement ce qui existe compte.</div>`;
}
function eqMembresMois(){
  return eqPeople().filter(eqActif).map(c => ({ c, a: eqAna(c) }))
    .filter(x => eqPortOn(x.c) || x.a.tachesN || x.a.seances || x.a.clients || x.a.defis)
    .sort((x, y) => (y.a.clientsMois + y.a.defisMois) - (x.a.clientsMois + x.a.defisMois) || (y.a.score || 0) - (x.a.score || 0) || x.c.name.localeCompare(y.c.name));
}
function eqEspaceHtml(){
  const rows = eqMembresMois();
  const aVal = EQ.taches.filter(t => t.statut === 'fait').length + EQ.suivi.filter(s => s.statut === 'a_valider').length;
  const dus = eqBonusDus(), duTot = dus.reduce((a, b) => a + (Number(b.montant) || 0), 0);
  const late = EQ.taches.filter(eqTacheLate).length;
  const defisOn = EQ.defis.filter(eqDefiOuvert).length;
  const cfg = eqPromoCfg();
  const mois = new Date().toLocaleDateString('fr-FR', { month: 'long' });
  return `<div class="ag-sec" style="margin-top:6px"><h3>Espace équipe</h3></div>
    <div class="eq-tiles">
      <button onclick="eqAValider()" class="${aVal ? 'hot' : ''}"><b>${aVal}</b><span>À valider</span></button>
      <button onclick="eqAValider()" class="${late ? 'bad' : ''}"><b>${late}</b><span>Tâches en retard</span></button>
      <button onclick="eqAValider()" class="${dus.length ? 'hot' : ''}"><b>${dus.length ? eqF(duTot) : '0'}</b><span>Bonus à payer</span></button>
      <button onclick="eqDefis()"><b>${defisOn}</b><span>Défis en cours</span></button>
    </div>
    <div class="eq-port-b" style="margin:8px 0 4px">
      <button onclick="eqDefis()">${eqI('target', 15)}Défis du mois</button>
      <button onclick="eqPromoReglage()">${eqI('cash', 15)}Bonus promotion${Number(cfg.valeur) > 0 ? ' · ' + (cfg.bonus_type === 'pourcent' ? cfg.valeur + ' %' : eqF(cfg.valeur)) : ''}</button>
      <button onclick="eqAnalyseEquipe()">${eqI('sparkles', 15)}Analyse IA</button>
    </div>
    <div class="ag-sec" style="margin-top:16px"><h3>Mon équipe ce mois</h3><span class="crm-count">${eqE(mois)}</span></div>
    ${rows.length ? `<div class="eq-mois">${rows.map((x, i) => `<div class="eq-mois-r" onclick="eqOpen(${x.c.id})">
        <div class="eq-rank">${i + 1}</div>
        <div class="d"><b>${eqE(x.c.name)}</b><span>${eqE(eqRoleLabel(x.c))}${eqPortOn(x.c) ? ' · espace actif' : ''}</span>
          <div class="eq-chips"><i>Tâches ${eqPct(x.a.tauxTaches)}</i><i>Présence ${eqPct(x.a.tauxPresence)}</i><i>Note ${eqNote(x.a.avg)}</i><i>${x.a.clientsMois} client${x.a.clientsMois > 1 ? 's' : ''} ce mois</i><i>${x.a.defisMois} défi${x.a.defisMois > 1 ? 's' : ''}</i>${x.a.enRetard ? `<i class="bad">${x.a.enRetard} en retard</i>` : ''}</div></div>
        <div class="eq-score-n sm ${eqScoreCls(x.a.score)}"><b>${x.a.score == null ? '-' : x.a.score}</b></div></div>`).join('')}</div>
      <div class="ag-hint">Classé par clients ramenés et défis validés ce mois, puis par note équipe (sur 100).</div>`
      : '<div class="ag-list"><div class="ag-empty">Active l\'espace personnel d\'un membre (dans sa fiche) pour lui donner des tâches et des défis.</div></div>'}
    <div id="eqTeamIa"></div>`;
}
function eqAValider(){
  const ft = EQ.taches.filter(t => t.statut === 'fait');
  const late = EQ.taches.filter(eqTacheLate);
  const ds = EQ.suivi.filter(s => s.statut === 'a_valider');
  const dus = eqBonusDus();
  agSheet('eqAValider', `<h3>À faire pour ton équipe</h3>
    <h4 class="crm-h4">Tâches faites à valider <span class="crm-count">${ft.length}</span></h4>
    ${ft.length ? ft.map(t => eqTacheRow(t, true)).join('') : '<div class="ag-list"><div class="ag-empty">Rien à valider.</div></div>'}
    ${late.length ? `<h4 class="crm-h4">En retard <span class="crm-count">${late.length}</span></h4>${late.map(t => eqTacheRow(t, true)).join('')}` : ''}
    <h4 class="crm-h4">Défis à valider <span class="crm-count">${ds.length}</span></h4>
    ${ds.length ? ds.map(s => { const p = eqPerson(s.personne_id), d = EQ.defis.find(x => x.id === Number(s.defi_id)) || {}; return `<div class="eq-task fait"><div class="eq-task-h"><b>${eqE(p ? eqFirst(p) : '')} · ${eqE(d.titre || 'Défi')}</b><i class="eq-st fait">${Number(s.progres) || 0}/${Number(d.objectif) || 1}</i></div>
      ${s.preuve ? `<p class="eq-com">« ${eqE(s.preuve)} »</p>` : ''}${d.recompense ? `<span>Récompense : ${eqE(d.recompense)}</span>` : ''}
      <div class="eq-task-b"><button class="ok" onclick="eqDefiValider(${s.id},true)">Valider</button><button class="ko" onclick="eqDefiValider(${s.id},false)">Refuser</button></div></div>`; }).join('') : '<div class="ag-list"><div class="ag-empty">Rien à valider.</div></div>'}
    <h4 class="crm-h4">Bonus à payer <span class="crm-count">${dus.length}</span></h4>
    ${dus.length ? dus.map(b => { const p = eqPerson(b.personne_id); return `<div class="eq-bonus"><div><b>${eqF(b.montant)} · ${eqE(p ? eqFirst(p) : '')}</b><span>${eqE(b.motif || '')}</span></div><button onclick="eqBonusPay(${b.id})">Payer</button></div>`; }).join('') : '<div class="ag-list"><div class="ag-empty">Aucun bonus à payer.</div></div>'}`);
}
async function eqAnalyseEquipe(){
  const box = document.getElementById('eqTeamIa');
  if(box) box.innerHTML = `<div class="eq-ia"><div class="eq-ia-h">${eqI('sparkles', 15)} Analyse en cours...</div></div>`;
  const rows = eqMembresMois();
  const cfg = eqPromoCfg();
  const prompt = `Tu aides Henzo, photographe et vidéaste à Bouaké (Côte d'Ivoire), studio Henzo Photographie, à gérer son équipe (maquilleuses, assistants, modèles...).
Voici son équipe ce mois-ci (chiffres réels, ne rien inventer) :
${rows.length ? rows.map(x => `- ${eqFirst(x.c)} (${eqRoleLabel(x.c)}) : note équipe ${x.a.score == null ? 'inconnue' : x.a.score + '/100'}, tâches à temps ${eqPct(x.a.tauxTaches)} (${x.a.tachesOk}/${x.a.tachesN}), ${x.a.enRetard} tâche(s) en retard, présence confirmée ${eqPct(x.a.tauxPresence)} (${x.a.conf}/${x.a.seances}), note moyenne ${eqNote(x.a.avg)}/5, clients ramenés ${x.a.clients} (dont ${x.a.clientsMois} ce mois), défis validés ${x.a.defis} (dont ${x.a.defisMois} ce mois)`).join('\n') : '(personne pour le moment)'}
Défis en cours : ${EQ.defis.filter(eqDefiOuvert).map(d => d.titre + ' (objectif ' + (d.objectif || 1) + ')').join(', ') || 'aucun'}.
Bonus de promotion : ${Number(cfg.valeur) > 0 ? (cfg.bonus_type === 'pourcent' ? cfg.valeur + ' % de la séance' : Math.round(cfg.valeur) + ' F') + ' par client ramené' : 'pas encore réglé'}.
Écris un conseil court en français simple, sans jargon, sans tirets longs, avec ces titres en gras : **Qui va bien**, **Qui aider**, **Idées pour motiver**, **À faire cette semaine**. 2 ou 3 phrases par titre, avec les prénoms.`;
  try {
    const raw = typeof callAI === 'function' ? await callAI(prompt) : (await window.iaRelais({ messages: [{ role: 'user', text: prompt }], maxTokens: 1500, tache: 'texte' })).text;
    const t = String(raw || '').replace(/[\u2013\u2014]/g, '-').trim();
    if(!t) throw new Error('vide');
    const b = document.getElementById('eqTeamIa');
    if(b) b.innerHTML = eqIaHtml({ texte: t, date: new Date().toISOString() });
  } catch(e){
    const b = document.getElementById('eqTeamIa');
    if(b) b.innerHTML = `<div class="eq-ia"><div class="eq-ia-h">Analyse IA</div><p>L'IA n'a pas répondu (${eqE(e.message || e)}). Vérifie ta connexion et tes clés IA, puis réessaie.</p></div>`;
  }
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
  // Parrainage client (extras.js) : un membre de l'equipe ne recoit pas les bons de reduction
  // des clients. Il recoit a la place un bonus en argent (equipe_bonus, voir eqBonusCheck).
  // extras.js peut se charger apres equipe.js : on reessaie jusqu'a ce qu'il soit la
  (function wrapPar(n){
    if(typeof exParGive === 'function'){
      if(exParGive.eqWrapped) return;
      const _o = exParGive;
      exParGive = async function(c){ if(c && !window.estClient(c)) return null; return _o.apply(this, arguments); };
      exParGive.eqWrapped = true;
      setTimeout(eqParRepair, 4000);
      return;
    }
    if(n < 750) setTimeout(() => wrapPar(n + 1), 20);
  })(0);
  // Apres chaque changement d'argent ou de seance : bonus de promotion a creer ?
  if(typeof refreshAll === 'function'){
    const _o = refreshAll;
    refreshAll = function(){ const r = _o.apply(this, arguments); try { if(EQ.portLoaded) eqBonusSoon(); } catch(e){} return r; };
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
/* Espace equipe */
.eq-msg{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;margin:0 0 4px}
.eq-port{margin:14px 0 4px;padding:14px;border-radius:18px;background:var(--card2);border:1px solid var(--border)}
.eq-port.on{border-color:var(--accent)}
.eq-port-h{display:flex;justify-content:space-between;align-items:center;gap:10px}
.eq-port-h b{display:block;font-size:14.5px}.eq-port-h span{display:block;font-size:12px;color:var(--muted);margin-top:2px}
.eq-port-st{font-style:normal;font-size:11px;font-weight:700;padding:4px 10px;border-radius:10px;background:var(--card3);color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.eq-port.on .eq-port-st{color:var(--green)}
.eq-port-txt{font-size:13px;color:var(--text-2,var(--muted));line-height:1.5;margin:10px 0}
.eq-port-url{display:flex;align-items:center;gap:8px;margin:12px 0 10px;padding:10px 12px;border-radius:12px;background:var(--card);border:1px dashed var(--accent);color:var(--accent);font-size:12px;cursor:pointer}
.eq-port-url span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.eq-port-b{display:flex;flex-wrap:wrap;gap:6px}
.eq-port-b button{display:inline-flex;align-items:center;gap:6px;width:auto;margin:0;padding:8px 11px;border-radius:11px;border:1px solid var(--border);background:var(--card);color:var(--text);font:600 12.5px Inter,sans-serif;cursor:pointer}
.eq-port-b button .ag-i{color:var(--accent)}
.eq-port-b button.main{background:var(--accent);border-color:var(--accent);color:#fff}.eq-port-b button.main .ag-i{color:#fff}
.eq-port-b button.danger{color:var(--red)}.eq-port-b button.danger .ag-i{color:var(--red)}
.eq-sub{font-size:11.5px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin:16px 0 6px}
.eq-voir{border-radius:14px;background:var(--card);border:1px solid var(--border);overflow:hidden}
.eq-tg{display:flex !important;align-items:center;gap:12px;margin:0 !important;padding:10px 12px;border-top:1px solid var(--border);cursor:pointer;position:relative}
.eq-tg:first-child{border-top:0}
.eq-tg div{flex:1;min-width:0}.eq-tg b{display:block;font-size:13px;color:var(--text)}.eq-tg span{display:block;font-size:11.5px;color:var(--muted);font-weight:500;line-height:1.35}
.eq-tg input{position:absolute;opacity:0;width:1px !important;height:1px;margin:0}
.eq-tg i{flex-shrink:0;width:40px;height:23px;border-radius:12px;background:var(--card3,#333);position:relative;transition:background .15s}
.eq-tg i:after{content:'';position:absolute;top:3px;left:3px;width:17px;height:17px;border-radius:50%;background:#fff;transition:left .15s}
.eq-tg input:checked+i{background:var(--accent)}.eq-tg input:checked+i:after{left:20px}
.eq-tg input:focus-visible+i{outline:2px solid var(--accent);outline-offset:2px}
.eq-port textarea{margin:0}
.eq-mini{width:auto !important;margin:6px 0 0 !important;padding:7px 14px !important;border-radius:10px;border:0;background:var(--accent);color:#fff;font:700 12px Inter,sans-serif;cursor:pointer}
.eq-cons{margin-top:8px;padding:10px;border-radius:12px;background:var(--card);border:1px solid var(--border)}
.eq-cons-h{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap}.eq-cons-h b{font-size:12.5px}
.eq-ok,.eq-wait{font-style:normal;font-size:11px;font-weight:700}.eq-ok{color:var(--green)}.eq-wait{color:var(--yellow)}
.eq-task,.eq-defi{margin:0 0 8px;padding:12px 14px;border-radius:16px;background:var(--card);border:1px solid var(--border)}
.eq-task.fait{border-color:var(--accent)}.eq-task.valide{opacity:.75}
.eq-task.late{border-color:var(--red);background:color-mix(in srgb,var(--red) 8%,var(--card))}
.eq-task-h{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}.eq-task-h b{font-size:13.5px;line-height:1.3}
.eq-task>span,.eq-defi>span{display:block;font-size:12px;color:var(--muted);margin-top:3px}
.eq-task p,.eq-defi p{font-size:12.5px;margin:6px 0 0;line-height:1.45;color:var(--text-2,var(--text))}
.eq-task p.eq-com{font-style:italic;color:var(--text)}
.eq-done{display:block;font-size:12px;color:var(--green);margin-top:4px;font-weight:600}
.eq-photo{display:inline-block;margin-top:6px;font-size:12px;color:var(--accent);font-weight:600}
.eq-st{font-style:normal;flex-shrink:0;font-size:10.5px;font-weight:700;padding:3px 8px;border-radius:8px;background:var(--card3,#333);color:var(--muted);white-space:nowrap}
.eq-st.fait{color:var(--accent)}.eq-st.ok{color:var(--green)}.eq-st.ko,.eq-st.late{color:var(--red)}
.eq-task-b{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.eq-task-b button{width:auto;margin:0;padding:7px 12px;border-radius:10px;border:1px solid var(--border);background:none;color:var(--text-2,var(--text));font:600 12px Inter,sans-serif;cursor:pointer}
.eq-task-b button.ok{background:var(--green);border-color:var(--green);color:#fff}
.eq-task-b button.ko{border-color:var(--red);color:var(--red)}
.eq-task-mini{display:flex;align-items:center;gap:6px;font-size:12.5px;padding:4px 2px;color:var(--text-2,var(--text))}.eq-task-mini span{margin-left:auto;color:var(--muted);font-size:11.5px}
.eq-ck{display:inline-block;width:8px;height:12px;border:solid var(--green);border-width:0 2px 2px 0;transform:rotate(45deg);margin:0 4px 2px 2px}
.eq-defi.off{opacity:.6}
.eq-defi-l{margin-top:10px;border-top:1px solid var(--border)}
.eq-defi-r{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)}
.eq-defi-r .eq-task-b{margin:0}
.eq-defi-n{flex:1;min-width:0}.eq-defi-n b{font-size:13px}.eq-defi-n span{display:block;font-size:11.5px;color:var(--muted)}
.eq-pbar{height:6px;border-radius:4px;background:var(--card3,#333);margin-top:5px;overflow:hidden}.eq-pbar i{display:block;height:100%;border-radius:4px;background:var(--accent)}
.eq-bonus{display:flex;align-items:center;gap:10px;margin:0 0 8px;padding:12px 14px;border-radius:16px;background:var(--card);border:1px solid var(--yellow)}
.eq-bonus div{flex:1;min-width:0}.eq-bonus b{display:block;font-size:14px}.eq-bonus span{display:block;font-size:12px;color:var(--muted)}
.eq-bonus button{width:auto;margin:0;padding:8px 12px;border-radius:10px;border:0;background:var(--yellow);color:#111;font:700 12px Inter,sans-serif;cursor:pointer;white-space:nowrap}
.eq-pay-amt{font-size:30px;font-weight:800;margin:10px 0 2px}
.eq-score{display:flex;gap:14px;align-items:center;padding:14px;border-radius:18px;background:var(--card2);border:1px solid var(--border)}
.eq-score-n{flex-shrink:0;width:74px;height:74px;border-radius:50%;display:grid;place-content:center;text-align:center;border:3px solid var(--muted)}
.eq-score-n b{font-size:24px;font-weight:800;line-height:1}.eq-score-n span{font-size:11px;color:var(--muted)}
.eq-score-n.hi{border-color:var(--green)}.eq-score-n.mid{border-color:var(--yellow)}.eq-score-n.lo{border-color:var(--red)}
.eq-score-n.sm{width:44px;height:44px;border-width:2px}.eq-score-n.sm b{font-size:15px}
.eq-score-d{flex:1;min-width:0;display:flex;flex-direction:column;gap:7px}
.eq-score-d>div{display:grid;grid-template-columns:1fr auto;font-size:12px;gap:0 8px}.eq-score-d span{color:var(--muted)}.eq-score-d .eq-pbar{grid-column:1/-1;margin-top:3px}
.eq-tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.eq-tiles button{width:auto;margin:0;padding:10px 4px;border-radius:14px;border:1px solid var(--border);background:var(--card);color:var(--text);cursor:pointer;text-align:center}
.eq-tiles b{display:block;font-size:15px;font-weight:800}.eq-tiles span{display:block;font-size:10.5px;color:var(--muted);margin-top:2px;line-height:1.2}
.eq-tiles button.hot{border-color:var(--accent)}.eq-tiles button.hot b{color:var(--accent)}
.eq-tiles button.bad{border-color:var(--red)}.eq-tiles button.bad b{color:var(--red)}
.eq-mois{display:flex;flex-direction:column;gap:6px}
.eq-mois-r{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:16px;background:var(--card);border:1px solid var(--border);cursor:pointer}
.eq-mois-r .d{flex:1;min-width:0}.eq-mois-r .d>b{display:block;font-size:13.5px}.eq-mois-r .d>span{display:block;font-size:11.5px;color:var(--muted)}
.eq-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px}
.eq-chips i{font-style:normal;font-size:10.5px;padding:2px 7px;border-radius:7px;background:var(--card3,#333);color:var(--text-2,var(--muted))}.eq-chips i.bad{color:var(--red)}
`;
  document.head.appendChild(st);
}
eqStyle();
// La page Clients est peut-etre deja affichee
(function(){ const p = document.querySelector('.page.active'); if(p && p.id === 'page-clients' && typeof crmRender === 'function' && typeof CRM !== 'undefined' && CRM.loaded) crmRender(); })();
