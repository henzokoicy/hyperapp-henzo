// ============================================================
// SUPER APP HENZO - CLIENTS, RELANCES, PROMOS ET TARIFS
// - Fiche client complete (seances, total, anniversaire, notes)
// - Relances du jour : inactifs, anniversaires, fetes, apres seance
// - Messages ecrits par l'IA (questions, propositions, modifs)
// - Envoi WhatsApp en 1 clic, historique des messages
// - Promos ciblees et bons de reduction
// - (Tarifs, devis et page publique : fichier prix.js)
// ============================================================

const CRM = {
  msgs: [], promos: [], tarifs: [], info: {}, analysis: null,
  loaded: false, seg: 'tous', q: '', comp: null, view: 'clients'
};

// ---------- Outils ----------
const crmDay = 864e5;
function crmNow(){ return new Date(); }
function crmDate(d, opt){ if(!d) return ''; return new Date(d).toLocaleDateString('fr-FR', opt || { day: 'numeric', month: 'short', year: 'numeric' }); }
function crmAgo(days){
  if(days == null) return 'jamais';
  if(days < 1) return "aujourd'hui";
  if(days < 30) return `il y a ${days} j`;
  const m = Math.round(days / 30);
  if(m < 12) return `il y a ${m} mois`;
  const y = Math.floor(m / 12);
  return `il y a ${y} an${y > 1 ? 's' : ''}`;
}
function crmCancelled(s){ return /annul/i.test(s.status || ''); }
function crmPhone(p){
  let d = String(p || '').replace(/[^0-9]/g, '');
  if(!d) return '';
  if(d.startsWith('00')) d = d.slice(2);
  if(d.length === 10) d = '225' + d;
  return d;
}
function crmFirst(c){
  if(c && c.crm && c.crm.appel) return c.crm.appel;
  const n = String((c && c.name) || '').trim();
  if(!n) return '';
  if(/^(mr|mme|mlle|m\.|monsieur|madame|mademoiselle|dr|me)\b/i.test(n)) return n.split('&')[0].trim().split(/\s+/).slice(0, 2).join(' ');
  const w = n.split(/\s+/)[0];
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}
function crmPromoCode(){ const k = CRM.comp; const p = k && k.promoId ? CRM.promos.find(x => x.id === k.promoId) : null; return p ? p.code : ''; }
function crmFill(text, c){
  let t = String(text || '').replace(/\{prenom\}/gi, crmFirst(c) || '');
  if(/\{lien\}/i.test(t)) t = t.replace(/\{lien\}/gi, typeof otResaLink === 'function' ? otResaLink(crmPromoCode()) : '');
  return t;
}
function crmMd(t){
  const lines = agEsc(t || '').split('\n');
  let html = '', inList = false;
  lines.forEach(l => {
    let x = l.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    if(/^\s*[-*•]\s+/.test(x)){ if(!inList){ html += '<ul>'; inList = true; } html += '<li>' + x.replace(/^\s*[-*•]\s+/, '') + '</li>'; return; }
    if(inList){ html += '</ul>'; inList = false; }
    if(/^#{1,4}\s/.test(x)) html += '<h4>' + x.replace(/^#{1,4}\s/, '') + '</h4>';
    else if(x.trim()) html += '<p>' + x + '</p>';
  });
  if(inList) html += '</ul>';
  return html;
}
function crmJson(t){
  const s = String(t || '').replace(/```json|```/g, '');
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if(a < 0 || b < a) throw new Error("Réponse de l'IA illisible, réessaie.");
  return JSON.parse(s.slice(a, b + 1));
}
function crmSnoozed(key){ try { return Number(localStorage.getItem('crm_snz_' + key) || 0) > Date.now(); } catch(e){ return false; } }
function crmSnooze(key, days){ try { localStorage.setItem('crm_snz_' + key, Date.now() + days * crmDay); } catch(e){} crmRender(); }

// ---------- Fetes (Cote d'Ivoire) ----------
function crmLastSunday(y, m){ const d = new Date(y, m + 1, 0); d.setDate(d.getDate() - d.getDay()); return d; }
function crmNthSunday(y, m, n){ const d = new Date(y, m, 1); d.setDate(1 + ((7 - d.getDay()) % 7) + (n - 1) * 7); return d; }
function crmEaster(y){
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31),
    da = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, mo - 1, da);
}
const CRM_FETES_VARIABLES = { // dates approximatives (selon la lune)
  2026: { korite: '2026-03-20', tabaski: '2026-05-27' },
  2027: { korite: '2027-03-10', tabaski: '2027-05-17' },
  2028: { korite: '2028-02-27', tabaski: '2028-05-05' }
};
function crmFetes(){
  const out = [], y0 = crmNow().getFullYear();
  [y0, y0 + 1].forEach(y => {
    out.push({ k: 'nouvel-an', n: 'Nouvel an', d: new Date(y, 0, 1) });
    out.push({ k: 'saint-valentin', n: 'Saint-Valentin', d: new Date(y, 1, 14) });
    out.push({ k: 'femme', n: 'Journée de la femme', d: new Date(y, 2, 8) });
    out.push({ k: 'paques', n: 'Pâques', d: crmEaster(y) });
    out.push({ k: 'meres', n: 'Fête des mères', d: crmLastSunday(y, 4) });
    out.push({ k: 'peres', n: 'Fête des pères', d: crmNthSunday(y, 5, 3) });
    out.push({ k: 'independance', n: "Fête de l'indépendance", d: new Date(y, 7, 7) });
    out.push({ k: 'rentree', n: 'Rentrée scolaire', d: new Date(y, 8, 15) });
    out.push({ k: 'noel', n: 'Noël', d: new Date(y, 11, 25) });
    const v = CRM_FETES_VARIABLES[y];
    if(v){ out.push({ k: 'korite', n: 'Korité (Ramadan)', d: new Date(v.korite) }); out.push({ k: 'tabaski', n: 'Tabaski', d: new Date(v.tabaski) }); }
  });
  const t = crmNow(); t.setHours(0, 0, 0, 0);
  return out.map(f => ({ ...f, j: Math.round((f.d - t) / crmDay) })).filter(f => f.j >= 0).sort((a, b) => a.j - b.j);
}

// ---------- Donnees ----------
async function crmLoad(){
  try {
    const [m, p, t] = await Promise.all([
      sb.from('client_messages').select('*').order('created_at', { ascending: false }),
      sb.from('promos').select('*').order('created_at', { ascending: false }),
      sb.from('tarifs').select('*').order('position', { ascending: true })
    ]);
    CRM.msgs = m.data || []; CRM.promos = p.data || []; CRM.tarifs = t.data || [];
  } catch(e){ console.warn('crm load', e); }
  try {
    const { data: u } = await sb.auth.getUser();
    if(u && u.user){
      const { data } = await sb.from('user_settings').select('user_preferences').eq('user_id', u.user.id).maybeSingle();
      const pr = (data && data.user_preferences) || {};
      CRM.info = pr.tarif_info || {};
      CRM.analysis = pr.tarif_analysis || null;
    }
  } catch(e){}
  CRM.loaded = true;
}
async function crmSavePrefs(patch){
  try {
    const { data: u } = await sb.auth.getUser();
    if(!u || !u.user) return;
    const { data } = await sb.from('user_settings').select('id,user_preferences').eq('user_id', u.user.id).maybeSingle();
    if(!data) return;
    const prefs = Object.assign({}, data.user_preferences || {}, patch);
    await sb.from('user_settings').update({ user_preferences: prefs }).eq('id', data.id);
  } catch(e){ console.warn(e); }
}

function crmStats(c){
  const now = crmNow();
  const ss = (shoots || []).filter(s => s.client_id === c.id && !crmCancelled(s));
  const done = ss.filter(s => s.date && new Date(s.date) <= now);
  const upcoming = ss.filter(s => s.date && new Date(s.date) > now);
  const total = done.reduce((a, s) => a + (Number(s.price) || 0), 0);
  const last = done.map(s => s.date).sort().pop() || null;
  const days = last ? Math.floor((now - new Date(last)) / crmDay) : null;
  const msgs = CRM.msgs.filter(m => m.client_id === c.id);
  const lastMsgDays = msgs.length ? Math.floor((now - new Date(msgs[0].created_at)) / crmDay) : null;
  const types = [...new Set(done.map(s => s.type).filter(Boolean))];
  let bday = null;
  if(c.birthday){
    const b = new Date(c.birthday), t = new Date(now); t.setHours(0, 0, 0, 0);
    let n = new Date(t.getFullYear(), b.getMonth(), b.getDate());
    if(n < t) n = new Date(t.getFullYear() + 1, b.getMonth(), b.getDate());
    bday = Math.round((n - t) / crmDay);
  }
  return { ss, done, upcoming, total, last, days, count: done.length, msgs, lastMsgDays, types, bday };
}
function crmAllStats(){ return (clients || []).map(c => ({ c, s: crmStats(c) })); }
function crmVipMin(all){
  const tot = all.map(x => x.s.total).filter(v => v > 0).sort((a, b) => b - a);
  if(tot.length < 3) return Infinity;
  return Math.max(tot[Math.max(0, Math.ceil(tot.length * 0.2) - 1)], 1);
}
const CRM_SEGS = {
  tous:      { n: 'Tous',        f: () => true },
  fideles:   { n: 'Fidèles',     f: x => x.s.count >= 2, d: '2 séances ou plus' },
  vip:       { n: 'Meilleurs',   f: (x, vip) => x.s.total >= vip, d: 'Ceux qui dépensent le plus' },
  inactifs:  { n: 'Inactifs',    f: x => x.s.count > 0 && x.s.days >= 90 && !x.s.upcoming.length, d: 'Pas de séance depuis 3 mois' },
  nouveaux:  { n: 'Nouveaux',    f: x => x.s.count === 1 && x.s.days < 90, d: 'Une seule séance, récente' },
  avenir:    { n: 'À venir',     f: x => x.s.upcoming.length > 0, d: 'Séance prévue' },
  prospects: { n: 'Prospects',   f: x => x.s.count === 0 && !x.s.upcoming.length, d: 'Jamais venus en séance' }
};
function crmSegment(key){
  const all = crmAllStats(), vip = crmVipMin(all), seg = CRM_SEGS[key] || CRM_SEGS.tous;
  return all.filter(x => seg.f(x, vip));
}

// ---------- Relances du jour ----------
function crmSuggestions(){
  const out = [];
  crmAllStats().forEach(({ c, s }) => {
    const recentMsg = s.lastMsgDays != null && s.lastMsgDays < 21;
    if(s.bday != null && s.bday <= 7 && !(s.lastMsgDays != null && s.lastMsgDays < 3))
      out.push({ c, s, k: 'anniversaire', p: 1, t: s.bday === 0 ? "Anniversaire aujourd'hui" : `Anniversaire dans ${s.bday} j`, why: 'Souhaite-lui, avec une petite surprise' });
    if(s.count > 0 && s.days >= 2 && s.days <= 10 && !recentMsg)
      out.push({ c, s, k: 'merci', p: 2, t: `Séance ${crmAgo(s.days)}`, why: 'Remercie et demande un avis' });
    if(s.count > 0 && s.days >= 90 && !s.upcoming.length && !recentMsg)
      out.push({ c, s, k: 'relance', p: 3, t: `Dernière séance ${crmAgo(s.days)}`, why: s.count >= 2 ? 'Client fidèle à faire revenir' : 'Donne-lui envie de revenir' });
    if(s.count >= 3 && s.days < 90 && (s.lastMsgDays == null || s.lastMsgDays > 60))
      out.push({ c, s, k: 'fidelite', p: 4, t: `${s.count} séances`, why: 'Remercie sa fidélité avec un bon' });
  });
  const seen = new Set();
  return out.filter(x => !crmSnoozed(x.c.id + '_' + x.k)).sort((a, b) => a.p - b.p || (a.s.bday ?? 99) - (b.s.bday ?? 99))
    .filter(x => { if(seen.has(x.c.id)) return false; seen.add(x.c.id); return true; });
}
const CRM_GOALS = {
  relance:      { n: 'Relance',       d: 'Faire revenir un client' },
  fidelite:     { n: 'Fidélité',      d: 'Remercier un client fidèle' },
  anniversaire: { n: 'Anniversaire',  d: 'Souhaiter son anniversaire' },
  fete:         { n: 'Fête',          d: 'Offre spéciale fête' },
  promo:        { n: 'Promo / bon',   d: 'Annoncer une réduction' },
  merci:        { n: 'Merci + avis',  d: 'Après la séance' },
  nouveaute:    { n: 'Nouveauté',     d: 'Nouvelle offre, nouveau décor' },
  libre:        { n: 'Libre',         d: 'Ce que tu veux' }
};

// ============================================================
// PAGE CLIENTS
// ============================================================
function crmBody(){ return document.getElementById('crmClientsBody'); }
async function crmRender(){
  const el = crmBody(); if(!el) return;
  if(!CRM.loaded){ el.innerHTML = '<div class="ag-empty">Chargement...</div>'; await crmLoad(); }
  if(CRM.view === 'promos') return crmRenderPromos();
  const all = crmAllStats(), vip = crmVipMin(all);
  const sug = crmSuggestions();
  const fid = all.filter(x => x.s.count >= 2).length;
  const ca = all.reduce((a, x) => a + x.s.total, 0);
  const fetes = crmFetes().filter(f => f.j <= 30).slice(0, 2);
  const seg = CRM_SEGS[CRM.seg] || CRM_SEGS.tous;
  const q = CRM.q.toLowerCase();
  const list = all.filter(x => seg.f(x, vip)).filter(x => !q || (x.c.name + ' ' + (x.c.phone || '') + ' ' + (x.c.city || '')).toLowerCase().includes(q))
    .sort((a, b) => (b.s.last || b.c.created_at || '').localeCompare(a.s.last || a.c.created_at || ''));

  el.innerHTML = `
    <div class="ag-total">
      <div class="lbl">Mes clients</div>
      <div class="amt">${all.length} <small>client${all.length > 1 ? 's' : ''}</small></div>
      <div class="split"><div>Fidèles<b>${fid}</b></div><div>À relancer<b>${sug.length}</b></div><div>Chiffre total<b>${agF(ca)}</b></div></div>
    </div>
    <div class="ag-actions">
      <button class="ag-act main" onclick="crmCompose([])"><span>${agIcon('sparkles')}</span>Message IA</button>
      <button class="ag-act" onclick="crmEditClient(null)"><span>${agIcon('plus')}</span>Client</button>
      <button class="ag-act" onclick="CRM.view='promos';crmRender()"><span>${agIcon('star')}</span>Promos</button>
      <button class="ag-act" onclick="crmHistory()"><span>${agIcon('history')}</span>Envois</button>
    </div>

    ${fetes.map((f, i) => `<div class="crm-fete" onclick="crmCompose(crmSegment('tous').map(x=>x.c.id),{goal:'fete',fete:crmFetes()[${i}].n})">
      <div class="ic">${agIcon('calendar')}</div><div class="d"><b>${agEsc(f.n)} ${f.j === 0 ? "aujourd'hui" : 'dans ' + f.j + ' jour' + (f.j > 1 ? 's' : '')}</b><span>${crmDate(f.d, { day: 'numeric', month: 'long' })} · prépare une offre pour tes clients</span></div>${agIcon('chev', 16)}</div>`).join('')}

    ${typeof otResaHtml === 'function' ? otResaHtml() : ''}
    <div class="ag-sec"><h3>À relancer</h3>${sug.length ? `<span class="crm-count">${sug.length}</span>` : ''}</div>
    ${sug.length ? `<div class="ag-list">${sug.slice(0, 8).map(x => `
      <div class="crm-sug">
        <div class="crm-av">${agEsc(crmInitials(x.c))}</div>
        <div class="d" onclick="crmOpenClient(${x.c.id})"><b>${agEsc(x.c.name)}</b><span><i class="crm-tag k-${x.k}">${CRM_GOALS[x.k].n}</i> ${agEsc(x.t)}</span><span class="why">${agEsc(x.why)}</span></div>
        <div class="crm-sug-b">
          <button class="ag-ibtn" title="Écrire avec l'IA" onclick="crmCompose([${x.c.id}],{goal:'${x.k}'})">${agIcon('sparkles', 17)}</button>
          <button class="ag-ibtn" title="Plus tard (7 jours)" onclick="crmSnooze('${x.c.id}_${x.k}',7)">${agIcon('history', 17)}</button>
        </div>
      </div>`).join('')}${sug.length > 8 ? `<div class="ag-empty" style="padding:10px">+ ${sug.length - 8} autres. Elles apparaîtront quand tu auras traité celles-ci.</div>` : ''}</div>`
      : '<div class="ag-list"><div class="ag-empty">Rien à relancer aujourd\'hui. Bravo !</div></div>'}

    <div class="ag-sec"><h3>Tous mes clients</h3></div>
    <div class="ag-pills crm-segs">${Object.entries(CRM_SEGS).map(([k, v]) => {
      const n = all.filter(x => v.f(x, vip)).length;
      return `<button class="${k === CRM.seg ? 'on' : ''}" onclick="CRM.seg='${k}';crmRender()">${v.n} <i>${n}</i></button>`; }).join('')}</div>
    <input id="crmQ" placeholder="Rechercher un nom, un numéro, une ville" value="${agEsc(CRM.q)}" oninput="CRM.q=this.value;crmRenderListOnly()" style="margin:10px 0">
    ${CRM.seg !== 'tous' && list.length ? `<button class="btn-primary crm-segbtn" onclick="crmCompose(crmSegment('${CRM.seg}').map(x=>x.c.id))">${agIcon('chat', 16)} Écrire aux ${list.length} client${list.length > 1 ? 's' : ''} "${agEsc(seg.n)}"</button>` : ''}
    <div id="crmList">${crmListHtml(list)}</div>`;
}
function crmRenderListOnly(){
  const all = crmAllStats(), vip = crmVipMin(all), seg = CRM_SEGS[CRM.seg] || CRM_SEGS.tous, q = CRM.q.toLowerCase();
  const list = all.filter(x => seg.f(x, vip)).filter(x => !q || (x.c.name + ' ' + (x.c.phone || '') + ' ' + (x.c.city || '')).toLowerCase().includes(q))
    .sort((a, b) => (b.s.last || b.c.created_at || '').localeCompare(a.s.last || a.c.created_at || ''));
  const el = document.getElementById('crmList'); if(el) el.innerHTML = crmListHtml(list);
}
function crmInitials(c){ return String(c.name || '?').replace(/^(mr|mme|mlle|m\.)\s+/i, '').split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase(); }
function crmListHtml(list){
  if(!list.length) return '<div class="ag-list"><div class="ag-empty">Aucun client ici.</div></div>';
  return `<div class="ag-list">${list.map(({ c, s }) => `
    <div class="crm-row" onclick="crmOpenClient(${c.id})">
      <div class="crm-av">${agEsc(crmInitials(c))}</div>
      <div class="d"><b>${agEsc(c.name)}</b><span>${s.count} séance${s.count > 1 ? 's' : ''} · ${s.upcoming.length ? 'prochaine ' + crmDate(s.upcoming[0].date, { day: 'numeric', month: 'short' }) : 'dernière ' + crmAgo(s.days)}</span></div>
      <div class="m">${agF(s.total)}</div>
    </div>`).join('')}</div>`;
}

// ---------- Fiche client ----------
function crmOpenClient(id){
  const c = (clients || []).find(x => x.id === id); if(!c) return;
  const s = crmStats(c);
  const crm = c.crm || {};
  const tags = (c.categories || []).filter(Boolean);
  const promos = CRM.promos.filter(p => crmPromoTargets(p).includes(c.id));
  const avis = (typeof galAvis !== 'undefined' ? galAvis : []).filter(a => a.nom_client && c.name && a.nom_client.toLowerCase().split(' ')[0] === c.name.toLowerCase().replace(/^(mr|mme|mlle)\s+/, '').split(' ')[0]);
  agSheet('crmClient', `
    <div class="crm-head"><div class="crm-av big">${agEsc(crmInitials(c))}</div><div><h3 style="margin:0">${agEsc(c.name)}</h3>
      <div class="ag-hint">${agEsc([c.phone, c.city].filter(Boolean).join(' · ') || 'Pas de numéro')}</div></div></div>
    ${tags.length ? `<div class="crm-tags">${tags.map(t => `<i>${agEsc(t)}</i>`).join('')}</div>` : ''}
    <div class="crm-kpis">
      <div><b>${s.count}</b><span>séance${s.count > 1 ? 's' : ''}</span></div>
      <div><b>${agF(s.total)}</b><span>dépensé</span></div>
      <div><b>${s.days == null ? '-' : crmAgo(s.days).replace('il y a ', '')}</b><span>dernière</span></div>
    </div>
    <div class="ag-actions" style="margin:14px 0">
      <button class="ag-act main" onclick="agCloseSheet('crmClient');crmCompose([${c.id}])"><span>${agIcon('sparkles')}</span>Message IA</button>
      <button class="ag-act" onclick="crmWa(${c.id},'')"><span>${agIcon('chat')}</span>WhatsApp</button>
      <button class="ag-act" onclick="agCloseSheet('crmClient');crmPromoForm(null,{ids:[${c.id}]})"><span>${agIcon('star')}</span>Offrir un bon</button>
      <button class="ag-act" onclick="crmEditClient(${c.id})"><span>${agIcon('edit')}</span>Modifier</button>
    </div>
    <div class="crm-info">
      <div><span>Anniversaire</span><b>${c.birthday ? crmDate(c.birthday, { day: 'numeric', month: 'long' }) + (s.bday != null && s.bday <= 30 ? ` (dans ${s.bday} j)` : '') : 'Non renseigné'}</b></div>
      <div><span>On l'appelle</span><b>${agEsc(crmFirst(c))}</b></div>
      ${crm.famille ? `<div><span>Famille</span><b>${agEsc(crm.famille)}</b></div>` : ''}
      ${crm.aime ? `<div><span>Ce qu'il/elle aime</span><b>${agEsc(crm.aime)}</b></div>` : ''}
      ${c.notes ? `<div><span>Notes</span><b>${agEsc(c.notes)}</b></div>` : ''}
    </div>
    <h4 class="crm-h4">Séances</h4>
    <div class="ag-list">${[...s.upcoming, ...s.done].length ? [...s.upcoming, ...s.done].sort((a, b) => String(b.date).localeCompare(String(a.date))).map(x => `
      <div class="crm-line"><div><b>${agEsc(x.type || 'Séance')}</b><span>${crmDate(x.date)}${new Date(x.date) > crmNow() ? ' · à venir' : ''}</span></div><b>${agF(x.price)}</b></div>`).join('') : '<div class="ag-empty">Aucune séance</div>'}</div>
    ${promos.length ? `<h4 class="crm-h4">Bons de réduction</h4><div class="ag-list">${promos.map(p => `<div class="crm-line"><div><b>${agEsc(p.title || p.code)}</b><span>Code ${agEsc(p.code)} · ${crmPromoValue(p)}</span></div><b>${(p.uses || []).some(u => u.client_id === c.id) ? 'Utilisé' : crmPromoState(p)}</b></div>`).join('')}</div>` : ''}
    ${avis.length ? `<h4 class="crm-h4">Ses avis</h4><div class="ag-list">${avis.map(a => `<div class="crm-line"><div><b>${'★'.repeat(a.note)}${'☆'.repeat(5 - a.note)}</b><span>${agEsc(a.texte || 'Sans commentaire')}</span></div></div>`).join('')}</div>` : ''}
    <h4 class="crm-h4">Messages envoyés</h4>
    <div class="ag-list">${s.msgs.length ? s.msgs.slice(0, 10).map(m => `<div class="crm-line col"><span>${crmDate(m.created_at)} · ${agEsc((CRM_GOALS[m.kind] || {}).n || m.kind || '')}</span><p>${agEsc(m.text)}</p></div>`).join('') : '<div class="ag-empty">Aucun message pour le moment</div>'}</div>
  `);
}

function crmEditClient(id){
  const c = id ? (clients || []).find(x => x.id === id) : null;
  const crm = (c && c.crm) || {};
  agSheet('crmEdit', `
    <h3>${c ? 'Modifier le client' : 'Nouveau client'}</h3>
    <label>Nom complet</label><input id="crmEName" value="${agEsc(c ? c.name : '')}" placeholder="Ex : Mme Koffi Awa">
    <label>Comment tu l'appelles dans tes messages</label><input id="crmEAppel" value="${agEsc(crm.appel || '')}" placeholder="${agEsc(c ? crmFirst(c) : 'Ex : Awa, Mme Koffi')}">
    <label>Téléphone WhatsApp</label><input id="crmEPhone" type="tel" value="${agEsc(c ? c.phone || '' : '')}" placeholder="07 00 00 00 00">
    <label>Email</label><input id="crmEEmail" type="email" value="${agEsc(c ? c.email || '' : '')}">
    <label>Ville / quartier</label><input id="crmECity" value="${agEsc(c ? c.city || '' : '')}">
    <label>Date d'anniversaire</label><input id="crmEBday" type="date" value="${c && c.birthday ? String(c.birthday).slice(0, 10) : ''}">
    <label>Étiquettes (séparées par des virgules)</label><input id="crmETags" value="${agEsc(c ? (c.categories || []).join(', ') : '')}" placeholder="Ex : Fidèle, Maman, Entreprise">
    <label>Famille (enfants, conjoint...)</label><input id="crmEFam" value="${agEsc(crm.famille || '')}" placeholder="Ex : 2 enfants, Kevin 5 ans">
    <label>Ce qu'il/elle aime</label><input id="crmEAime" value="${agEsc(crm.aime || '')}" placeholder="Ex : photos en extérieur, style chic">
    <label>Notes</label><textarea id="crmENotes" rows="3">${agEsc(c ? c.notes || '' : '')}</textarea>
    <div class="ag-hint">Plus tu remplis, plus l'IA écrit des messages personnels.</div>
    <button class="btn-primary" onclick="crmSaveClient(${c ? c.id : 'null'})">Enregistrer</button>`);
}
async function crmSaveClient(id){
  const v = k => document.getElementById(k).value.trim();
  const name = v('crmEName'); if(!name){ alert('Donne un nom'); return; }
  const old = id ? (clients || []).find(x => x.id === id) : null;
  const data = {
    name, phone: v('crmEPhone') || null, email: v('crmEEmail') || null, city: v('crmECity') || null,
    birthday: v('crmEBday') || null, notes: v('crmENotes') || null,
    categories: v('crmETags').split(',').map(t => t.trim()).filter(Boolean),
    crm: Object.assign({}, (old && old.crm) || {}, { appel: v('crmEAppel') || null, famille: v('crmEFam') || null, aime: v('crmEAime') || null })
  };
  try {
    if(id){
      const { data: r, error } = await sb.from('clients').update(data).eq('id', id).select().single();
      if(error) throw error;
      Object.assign(old, r || data);
    } else {
      const { data: u } = await sb.auth.getUser();
      const { data: r, error } = await sb.from('clients').insert({ ...data, user_id: u.user.id }).select().single();
      if(error) throw error;
      clients.push(r);
    }
  } catch(e){ alert('Erreur : ' + (e.message || e)); return; }
  agCloseSheet('crmEdit');
  agToast('Client enregistré');
  crmRender();
  if(id && document.getElementById('crmClient')) crmOpenClient(id);
  if(typeof renderClients === 'function') try { renderClients(); } catch(e){}
}

// ---------- WhatsApp + historique ----------
async function crmLog(clientId, kind, text){
  try {
    const { data: u } = await sb.auth.getUser();
    const { data } = await sb.from('client_messages').insert({ user_id: u.user.id, client_id: clientId, kind, text, channel: 'whatsapp' }).select().single();
    if(data) CRM.msgs.unshift(data);
  } catch(e){ console.warn(e); }
}
function crmWa(clientId, text, kind){
  const c = (clients || []).find(x => x.id === clientId);
  const n = crmPhone(c && c.phone);
  const msg = crmFill(text, c);
  window.open(`https://wa.me/${n}${msg ? '?text=' + encodeURIComponent(msg) : ''}`, '_blank');
  if(msg) crmLog(clientId, kind || 'libre', msg);
}
function crmHistory(){
  const rows = CRM.msgs.slice(0, 80);
  agSheet('crmHist', `<h3>Messages envoyés</h3>
    <div class="ag-list">${rows.length ? rows.map(m => {
      const c = (clients || []).find(x => x.id === m.client_id);
      return `<div class="crm-line col"><span><b>${agEsc(c ? c.name : 'Client')}</b> · ${crmDate(m.created_at)} · ${agEsc((CRM_GOALS[m.kind] || {}).n || '')}</span><p>${agEsc(m.text)}</p></div>`; }).join('') : '<div class="ag-empty">Aucun message envoyé pour le moment.</div>'}</div>`);
}

// ============================================================
// REDACTION IA
// ============================================================
function crmCompose(ids, opt){
  opt = opt || {};
  CRM.comp = {
    ids: [...new Set(ids || [])], goal: opt.goal || (ids && ids.length === 1 ? 'relance' : 'promo'),
    fete: opt.fete || '', promoId: opt.promoId || null, ton: 'chaleureux', vous: true,
    idea: '', questions: [], answers: {}, props: [], step: 'brief', sent: {}, busy: false
  };
  if(opt.goal === 'fete' && !opt.fete){ const f = crmFetes()[0]; if(f) CRM.comp.fete = f.n; }
  agSheet('crmComp', '<div id="crmCompBody"></div>');
  crmCompRender();
}
function crmCompClients(){ return CRM.comp.ids.map(id => (clients || []).find(c => c.id === id)).filter(Boolean); }
function crmCompRender(){
  const el = document.getElementById('crmCompBody'); if(!el) return;
  const k = CRM.comp, cs = crmCompClients();
  if(k.step === 'send') return crmSendRender(el);
  const who = cs.length === 0 ? 'Personne pour le moment' : cs.length <= 3 ? cs.map(c => c.name).join(', ') : `${cs.length} clients`;
  const activePromos = CRM.promos.filter(p => crmPromoState(p) === 'Actif');
  el.innerHTML = `
    <h3>Message avec l'IA</h3>
    <label>Pour qui</label>
    <div class="crm-who" onclick="crmPickClients()"><div><b>${agEsc(who)}</b><span>Toucher pour choisir</span></div>${agIcon('chev', 16)}</div>
    <label>Objectif</label>
    <div class="ag-pills">${Object.entries(CRM_GOALS).map(([g, v]) => `<button class="${g === k.goal ? 'on' : ''}" onclick="crmCompSet('goal','${g}')">${v.n}</button>`).join('')}</div>
    ${k.goal === 'fete' ? `<label>Quelle fête</label><select onchange="crmCompSet('fete',this.value)">${crmFetes().slice(0, 8).map(f => `<option ${f.n === k.fete ? 'selected' : ''}>${agEsc(f.n)}</option>`).join('')}</select>` : ''}
    ${(k.goal === 'promo' || k.goal === 'fete' || k.goal === 'fidelite' || k.goal === 'relance') ? `<label>Bon de réduction à inclure</label>
      <select onchange="crmCompSet('promoId',this.value?Number(this.value):null)"><option value="">Aucun</option>${activePromos.map(p => `<option value="${p.id}" ${p.id === k.promoId ? 'selected' : ''}>${agEsc((p.title || p.code) + ' - ' + crmPromoValue(p))}</option>`).join('')}</select>
      <button class="crm-link" onclick="crmPromoForm(null,{ids:CRM.comp.ids,back:true})">+ Créer un bon maintenant</button>` : ''}
    <label>Ton</label>
    <div class="ag-pills">${[['chaleureux', 'Chaleureux'], ['pro', 'Professionnel'], ['fun', 'Fun'], ['court', 'Très court']].map(([t, n]) => `<button class="${t === k.ton ? 'on' : ''}" onclick="crmCompSet('ton','${t}')">${n}</button>`).join('')}</div>
    <div class="ag-pills" style="margin-top:8px">${[[true, 'Vouvoyer'], [false, 'Tutoyer']].map(([v, n]) => `<button class="${v === k.vous ? 'on' : ''}" onclick="crmCompSet('vous',${v})">${n}</button>`).join('')}</div>
    <label>Dis à l'IA ce que tu veux dire</label>
    <textarea id="crmIdea" rows="3" oninput="CRM.comp.idea=this.value" placeholder="Ex : promo -20% sur les shootings famille jusqu'à fin novembre, nouveau décor de Noël">${agEsc(k.idea)}</textarea>
    ${k.questions.length ? `<div class="crm-qs"><div class="crm-qs-h">${agIcon('sparkles', 15)} L'IA a besoin de précisions</div>${k.questions.map((q, i) => `
      <label>${agEsc(q)}</label><input value="${agEsc(k.answers[i] || '')}" oninput="CRM.comp.answers[${i}]=this.value" placeholder="Ta réponse (tu peux laisser vide)">`).join('')}</div>` : ''}
    <div class="crm-btns">
      <button class="btn-primary" ${k.busy ? 'disabled' : ''} onclick="crmGenerate()">${k.busy === 'gen' ? 'Écriture en cours...' : (k.props.length ? 'Refaire 3 propositions' : 'Écrire 3 propositions')}</button>
      ${k.questions.length ? '' : `<button class="btn-secondary" ${k.busy ? 'disabled' : ''} onclick="crmAskQuestions()">${k.busy === 'q' ? 'Réflexion...' : "L'IA me pose des questions d'abord"}</button>`}
    </div>
    <div id="crmErr" class="crm-err"></div>
    ${k.props.length ? `<h4 class="crm-h4">Propositions</h4>${k.props.map((p, i) => `
      <div class="crm-prop">
        <div class="crm-prop-h"><b>${agEsc(p.titre || 'Proposition ' + (i + 1))}</b></div>
        <textarea rows="6" oninput="CRM.comp.props[${i}].texte=this.value">${agEsc(p.texte)}</textarea>
        <div class="crm-prop-b">
          <button class="btn-primary" onclick="crmUse(${i})">Utiliser</button>
          <button class="ag-ibtn" title="Copier" onclick="crmCopy(CRM.comp.props[${i}].texte)">${agIcon('copy', 16)}</button>
          <button class="ag-ibtn" title="Refaire celle-ci" onclick="crmRedo(${i})">${agIcon('refresh', 16)}</button>
        </div>
      </div>`).join('')}
      <label>Demander une modification à l'IA</label>
      <div class="crm-row-in"><input id="crmTweak" placeholder="Ex : plus court, ajoute le prix, enlève la promo"><button class="btn-secondary" ${k.busy ? 'disabled' : ''} onclick="crmTweak()">${k.busy === 't' ? '...' : 'Appliquer'}</button></div>
      <div class="ag-hint">{prenom} sera remplacé par le prénom de chaque client à l'envoi.</div>` : ''}
  `;
}
function crmCompSet(k, v){ CRM.comp[k] = v; crmCompRender(); }
function crmCopy(t){ (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => agToast('Copié')).catch(() => prompt('Copie :', t)); }
function crmErr(m){ const e = document.getElementById('crmErr'); if(e) e.textContent = m || ''; }

function crmPickClients(){
  const sel = new Set(CRM.comp.ids);
  const all = crmAllStats(), vip = crmVipMin(all);
  agSheet('crmPick', `
    <h3>Choisir les clients</h3>
    <div class="ag-pills">${Object.entries(CRM_SEGS).map(([k, v]) => `<button onclick="crmPickSeg('${k}')">${v.n} <i>${all.filter(x => v.f(x, vip)).length}</i></button>`).join('')}<button onclick="crmPickSeg('aucun')">Aucun</button></div>
    <input placeholder="Rechercher" oninput="crmPickFilter(this.value)" style="margin:10px 0">
    <div class="ag-list" id="crmPickList">${all.sort((a, b) => a.c.name.localeCompare(b.c.name)).map(({ c, s }) => `
      <label class="crm-pick" data-n="${agEsc(c.name.toLowerCase())}"><input type="checkbox" value="${c.id}" ${sel.has(c.id) ? 'checked' : ''}>
        <div><b>${agEsc(c.name)}</b><span>${s.count} séance${s.count > 1 ? 's' : ''}${c.phone ? '' : ' · pas de numéro'}</span></div></label>`).join('')}</div>
    <button class="btn-primary" onclick="crmPickDone()">Valider</button>`);
}
function crmPickSeg(k){
  const ids = k === 'aucun' ? [] : crmSegment(k).map(x => x.c.id);
  document.querySelectorAll('#crmPickList input').forEach(i => i.checked = ids.includes(Number(i.value)));
}
function crmPickFilter(q){ q = q.toLowerCase(); document.querySelectorAll('#crmPickList .crm-pick').forEach(l => l.style.display = l.dataset.n.includes(q) ? '' : 'none'); }
function crmPickDone(){
  CRM.comp.ids = [...document.querySelectorAll('#crmPickList input:checked')].map(i => Number(i.value));
  agCloseSheet('crmPick'); crmCompRender();
}

function crmClientBrief(c){
  const s = crmStats(c), crm = c.crm || {};
  return `- ${c.name} (appeler : ${crmFirst(c)}) : ${s.count} séance(s)${s.types.length ? ' [' + s.types.join(', ') + ']' : ''}, total ${Math.round(s.total)} F, dernière ${s.last ? crmDate(s.last) : 'aucune'}${s.upcoming.length ? ', séance prévue le ' + crmDate(s.upcoming[0].date) : ''}${c.city ? ', ' + c.city : ''}${(c.categories || []).length ? ', étiquettes : ' + c.categories.join(', ') : ''}${c.birthday ? ', anniversaire le ' + crmDate(c.birthday, { day: 'numeric', month: 'long' }) : ''}${crm.famille ? ', famille : ' + crm.famille : ''}${crm.aime ? ', aime : ' + crm.aime : ''}${c.notes ? ', notes : ' + c.notes : ''}`;
}
function crmContext(){
  const k = CRM.comp, cs = crmCompClients();
  const promo = k.promoId ? CRM.promos.find(p => p.id === k.promoId) : null;
  const tarifs = CRM.tarifs.filter(t => t.active !== false).slice(0, 12).map(t => `${t.name} : ${Math.round(t.price)} F`).join(' ; ');
  const tons = { chaleureux: 'chaleureux et humain', pro: 'professionnel et élégant', fun: 'joyeux et dynamique, quelques expressions ivoiriennes légères', court: 'très court, 2 ou 3 phrases maximum' };
  let who;
  if(!cs.length) who = 'Message général pour mes clients.';
  else if(cs.length <= 6) who = 'Destinataires :\n' + cs.map(crmClientBrief).join('\n');
  else {
    const st = cs.map(crmStats);
    who = `Message groupé pour ${cs.length} clients (${st.filter(s => s.count >= 2).length} fidèles, ${st.filter(s => s.count === 0).length} jamais venus en séance). Exemples :\n` + cs.slice(0, 4).map(crmClientBrief).join('\n');
  }
  return `Tu écris des messages WhatsApp pour Henzo Studio, studio photo et vidéo à Bouaké (Côte d'Ivoire), quartier Ahougnansou, en face du Restaurant Le Rosier. Le photographe s'appelle Henzo. Spécialités : portrait studio, anniversaires d'enfants, mariage, grossesse, événements.
Objectif du message : ${CRM_GOALS[k.goal].n} (${CRM_GOALS[k.goal].d})${k.goal === 'fete' && k.fete ? ' - fête : ' + k.fete : ''}.
${who}
${promo ? `Bon de réduction à inclure : "${promo.title || ''}" ${crmPromoValue(promo)}, code ${promo.code}${promo.valid_until ? ", valable jusqu'au " + crmDate(promo.valid_until, { day: 'numeric', month: 'long' }) : ''}. Termine le message par une ligne qui invite à réserver avec ce lien, écrit exactement {lien} (il sera remplacé par le vrai lien, où le code est déjà rempli).` : ''}
${tarifs ? 'Mes tarifs (à citer seulement si utile) : ' + tarifs : ''}
Ce que Henzo veut dire : ${k.idea || '(rien de précis, propose)'}
${k.questions.length ? 'Précisions de Henzo :\n' + k.questions.map((q, i) => `- ${q} -> ${k.answers[i] || '(pas de réponse)'}`).join('\n') : ''}
Règles : en français simple, ton ${tons[k.ton]}, ${k.vous ? 'vouvoiement' : 'tutoiement'}, commence par saluer avec {prenom} (ce mot sera remplacé par le prénom), pas d'emoji ou au maximum 1, pas de tirets longs, une seule invitation claire à répondre ou réserver, signe "Henzo Studio". Ne jamais inventer de prix ni de réduction qui ne sont pas donnés ici.`;
}
async function crmAskQuestions(){
  const k = CRM.comp; k.busy = 'q'; crmCompRender(); crmErr('');
  try {
    const r = await callAI(crmContext() + `\n\nAvant d'écrire, pose à Henzo 2 à 4 questions courtes et concrètes qui t'aideraient à rendre le message plus précis et plus efficace (date limite, prix, cadeau, détail sur le client...). Ne pose pas de question déjà répondue. Réponds uniquement en JSON : {"questions":["...","..."]}`);
    const j = crmJson(r);
    k.questions = (j.questions || []).slice(0, 4); k.answers = {};
  } catch(e){ k.busy = false; crmCompRender(); crmErr(e.message); return; }
  k.busy = false; crmCompRender();
}
async function crmGenerate(){
  const k = CRM.comp; k.busy = 'gen'; crmCompRender(); crmErr('');
  try {
    const r = await callAI(crmContext() + `\n\nÉcris 3 propositions différentes (angles différents : émotion, offre, curiosité). Réponds uniquement en JSON : {"propositions":[{"titre":"2 à 4 mots","texte":"..."}]}`);
    const j = crmJson(r);
    k.props = (j.propositions || []).filter(p => p && p.texte).slice(0, 3);
    if(!k.props.length) throw new Error('Aucune proposition, réessaie.');
  } catch(e){ k.busy = false; if(!k.props.length) k.props = crmFallback(); crmCompRender(); crmErr("L'IA n'a pas répondu (" + e.message + '). Voici des modèles à adapter.'); return; }
  k.busy = false; crmCompRender();
}
async function crmRedo(i){
  const k = CRM.comp; k.busy = 'gen'; crmCompRender(); crmErr('');
  try {
    const r = await callAI(crmContext() + `\n\nVoici une proposition qui ne convient pas :\n"""${k.props[i].texte}"""\nÉcris-en une nouvelle, vraiment différente. Réponds uniquement en JSON : {"titre":"2 à 4 mots","texte":"..."}`);
    const j = crmJson(r); if(j.texte) k.props[i] = j;
  } catch(e){ crmErr(e.message); }
  k.busy = false; crmCompRender();
}
async function crmTweak(){
  const ask = (document.getElementById('crmTweak') || {}).value || '';
  if(!ask.trim()) return;
  const k = CRM.comp; k.busy = 't'; crmCompRender(); crmErr('');
  try {
    const r = await callAI(crmContext() + `\n\nVoici les propositions actuelles :\n${JSON.stringify(k.props)}\nHenzo demande cette modification : "${ask}". Applique-la aux 3 propositions en gardant {prenom}. Réponds uniquement en JSON : {"propositions":[{"titre":"...","texte":"..."}]}`);
    const j = crmJson(r); if(j.propositions && j.propositions.length) k.props = j.propositions.slice(0, 3);
  } catch(e){ crmErr(e.message); }
  k.busy = false; crmCompRender();
}
function crmFallback(){
  const k = CRM.comp, v = k.vous, promo = k.promoId ? CRM.promos.find(p => p.id === k.promoId) : null;
  const pr = promo ? ` Profite${v ? 'z' : ''} de ${crmPromoValue(promo)} avec le code ${promo.code}${promo.valid_until ? " jusqu'au " + crmDate(promo.valid_until, { day: 'numeric', month: 'long' }) : ''}.` : '';
  const T = {
    relance: `Bonjour {prenom}, c'est Henzo du studio. Ça fait un moment ! J'ai pensé à ${v ? 'vous' : 'toi'} : de nouvelles idées de photos ${v ? 'vous' : "t'"}attendent au studio.${pr} ${v ? 'Dites-moi' : 'Dis-moi'} quand ${v ? 'vous êtes' : "tu es"} disponible.\nHenzo Studio`,
    fidelite: `Bonjour {prenom}, merci pour ${v ? 'votre' : 'ta'} fidélité, ça me touche vraiment.${pr || ' Pour ' + (v ? 'vous' : 'te') + ' remercier, ' + (v ? 'votre' : 'ta') + ' prochaine séance aura un petit cadeau.'} À très vite au studio !\nHenzo Studio`,
    anniversaire: `Joyeux anniversaire {prenom} ! Toute l'équipe Henzo Studio ${v ? 'vous' : 'te'} souhaite une très belle année.${pr} Et si on immortalisait ce moment ?\nHenzo Studio`,
    fete: `Bonjour {prenom}, ${k.fete || 'la fête'} arrive ! C'est le moment parfait pour de belles photos en famille ou entre amis.${pr} Les places partent vite, ${v ? 'réservez' : 'réserve'} ${v ? 'votre' : 'ton'} créneau.\nHenzo Studio`,
    promo: `Bonjour {prenom}, bonne nouvelle !${pr || ' Une offre spéciale est disponible au studio en ce moment.'} ${v ? 'Répondez' : 'Réponds'} à ce message pour réserver.\nHenzo Studio`,
    merci: `Bonjour {prenom}, merci encore pour ${v ? 'votre' : 'ta'} séance au studio ! J'espère que les photos ${v ? 'vous' : 'te'} plaisent. ${v ? 'Votre' : 'Ton'} avis compte beaucoup pour moi : ${v ? 'pouvez-vous' : 'peux-tu'} me dire en une phrase ce que ${v ? 'vous avez' : 'tu as'} pensé ?\nHenzo Studio`,
    nouveaute: `Bonjour {prenom}, du nouveau au studio ! ${k.idea || 'Un nouveau décor vient d\'arriver.'}${pr} ${v ? 'Venez' : 'Viens'} le découvrir.\nHenzo Studio`,
    libre: `Bonjour {prenom}, ${k.idea || ''}\nHenzo Studio`
  };
  return [{ titre: 'Modèle', texte: T[k.goal] || T.libre }];
}
function crmUse(i){
  const k = CRM.comp;
  if(!k.ids.length){ crmPickClients(); agToast('Choisis d\'abord les clients'); return; }
  k.text = k.props[i].texte;
  if(k.promoId && !/\{lien\}/i.test(k.text)) k.text += '\nRéservez avec votre code ici : {lien}';
  k.step = 'send'; crmCompRender();
}
function crmSendRender(el){
  const k = CRM.comp, cs = crmCompClients();
  const nb = Object.keys(k.sent).length;
  const next = cs.find(c => !k.sent[c.id] && crmPhone(c.phone));
  const prev = next || cs[0];
  el.innerHTML = `
    <button class="ag-back" onclick="CRM.comp.step='brief';crmCompRender()">${agIcon('chev', 16)} Retour aux propositions</button>
    <h3>Envoyer (${nb}/${cs.length})</h3>
    <label>Message (modifiable)</label>
    <textarea rows="6" oninput="CRM.comp.text=this.value;const p=document.getElementById('crmPrev');if(p)p.textContent=crmFill(this.value,(clients||[]).find(x=>x.id===${prev ? prev.id : 0}))">${agEsc(k.text)}</textarea>
    ${prev ? `<div class="crm-prev"><span>Aperçu pour ${agEsc(prev.name)}</span><p id="crmPrev">${agEsc(crmFill(k.text, prev))}</p></div>` : ''}
    ${next ? `<button class="btn-primary crm-next" onclick="crmSendOne(${next.id})">${agIcon('chat', 16)} ${nb ? 'Suivant : ' : 'Envoyer à '}${agEsc(next.name)}</button>
      <div class="ag-hint">Envoyer à tous : touche ce bouton, envoie dans WhatsApp, reviens ici, et le client suivant est déjà prêt. WhatsApp ne permet pas d'envoyer à plusieurs personnes d'un seul coup sans un compte professionnel payant.</div>`
      : `<div class="crm-done">${agIcon('check', 18)} Envoyé à tout le monde</div>`}
    <button class="btn-secondary" style="margin-top:8px" onclick="crmCopyBroadcast()">Copier pour une liste de diffusion WhatsApp</button>
    <div class="ag-list" style="margin-top:12px">${cs.map(c => {
      const ok = k.sent[c.id], tel = crmPhone(c.phone);
      return `<div class="crm-send ${ok ? 'ok' : ''}"><div class="d"><b>${agEsc(c.name)}</b><span>${tel ? agEsc(c.phone) : 'Pas de numéro'}${ok ? ' · envoyé' : ''}</span></div>
        ${tel ? `<button class="${ok ? 'btn-secondary' : 'btn-primary'}" onclick="crmSendOne(${c.id})">${ok ? 'Renvoyer' : 'Envoyer'}</button>`
              : `<button class="btn-secondary" onclick="crmCopy(crmFill(CRM.comp.text, (clients||[]).find(x=>x.id===${c.id})))">Copier</button>`}</div>`; }).join('')}</div>
    <button class="btn-secondary" style="width:100%;margin-top:12px" onclick="agCloseSheet('crmComp');crmRender()">Terminer</button>`;
}
function crmCopyBroadcast(){
  const t = crmFill(String(CRM.comp.text || '').replace(/\s*\{prenom\}\s*,?/gi, ' ').replace(/Bonjour\s+,/i, 'Bonjour,').replace(/  +/g, ' '), null);
  crmCopy(t);
  agToast('Copié : colle-le dans ta liste de diffusion WhatsApp');
}
function crmSendOne(id){
  const k = CRM.comp;
  crmWa(id, k.text, k.goal);
  k.sent[id] = true;
  crmSendRender(document.getElementById('crmCompBody'));
}

// ============================================================
// PROMOS ET BONS DE REDUCTION
// ============================================================
function crmPromoValue(p){ return p.kind === 'amount' ? '-' + agF(p.value) : '-' + Math.round(p.value) + ' %'; }
function crmPromoState(p){
  if(p.status === 'arrete') return 'Arrêté';
  if(p.valid_until && new Date(p.valid_until + 'T23:59:59') < crmNow()) return 'Expiré';
  return 'Actif';
}
function crmPromoTargets(p){
  const t = p.target || {};
  if(Array.isArray(t.ids) && t.ids.length) return t.ids;
  if(t.segment) return crmSegment(t.segment).map(x => x.c.id);
  return [];
}
function crmPromoTargetLabel(p){
  const t = p.target || {};
  if(Array.isArray(t.ids) && t.ids.length) return t.ids.length === 1 ? (((clients || []).find(c => c.id === t.ids[0]) || {}).name || '1 client') : t.ids.length + ' clients choisis';
  if(t.segment) return 'Segment ' + ((CRM_SEGS[t.segment] || {}).n || t.segment);
  return 'Tout le monde';
}
function crmCode(){ const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = 'HENZO-'; for(let i = 0; i < 4; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
function crmPromoIdeas(){
  const ideas = [], all = crmAllStats();
  const n = k => crmSegment(k).length;
  if(n('fideles')) ideas.push({ title: 'Merci fidélité', kind: 'percent', value: 15, segment: 'fideles', why: `${n('fideles')} clients fidèles : récompense-les pour qu'ils reviennent encore` });
  if(n('inactifs')) ideas.push({ title: 'Bon retour', kind: 'percent', value: 10, segment: 'inactifs', why: `${n('inactifs')} clients ne sont pas revenus depuis 3 mois` });
  if(n('prospects')) ideas.push({ title: 'Première séance', kind: 'amount', value: 5000, segment: 'prospects', why: `${n('prospects')} contacts ne sont jamais venus en séance` });
  if(n('nouveaux')) ideas.push({ title: 'Deuxième séance', kind: 'percent', value: 10, segment: 'nouveaux', why: `${n('nouveaux')} nouveaux clients : transforme-les en habitués` });
  const f = crmFetes().find(x => x.j <= 45);
  if(f) ideas.push({ title: 'Spécial ' + f.n, kind: 'percent', value: 10, segment: 'tous', why: `${f.n} dans ${f.j} jours`, days: Math.max(f.j, 7) });
  return ideas.slice(0, 4);
}
function crmRenderPromos(){
  const el = crmBody();
  const act = CRM.promos.filter(p => crmPromoState(p) === 'Actif');
  const used = CRM.promos.reduce((a, p) => a + (p.uses || []).length, 0);
  el.innerHTML = `
    <button class="ag-back" onclick="CRM.view='clients';crmRender()">${agIcon('chev', 16)} Mes clients</button>
    <div class="ag-total">
      <div class="lbl">Promos et bons</div>
      <div class="amt">${act.length} <small>actif${act.length > 1 ? 's' : ''}</small></div>
      <div class="split"><div>Créés<b>${CRM.promos.length}</b></div><div>Utilisés<b>${used}</b></div></div>
    </div>
    <button class="btn-primary" style="width:100%;margin:14px 0" onclick="crmPromoForm(null,{})">${agIcon('plus', 16)} Créer une promo ou un bon</button>
    ${crmPromoIdeas().length ? `<div class="ag-sec"><h3>Idées selon tes clients</h3></div>
    <div class="crm-ideas">${crmPromoIdeas().map((x, i) => `<div class="crm-idea" onclick="crmPromoFromIdea(${i})"><b>${agEsc(x.title)}</b><span class="v">${x.kind === 'amount' ? '-' + agF(x.value) : '-' + x.value + ' %'}</span><span>${agEsc(x.why)}</span></div>`).join('')}</div>` : ''}
    <div class="ag-sec"><h3>Mes promos</h3></div>
    <div class="ag-list">${CRM.promos.length ? CRM.promos.map(p => `
      <div class="crm-row" onclick="crmPromoOpen(${p.id})">
        <div class="crm-av">${agIcon('star', 16)}</div>
        <div class="d"><b>${agEsc(p.title || p.code)}</b><span>${agEsc(p.code)} · ${agEsc(crmPromoTargetLabel(p))}${p.valid_until ? ' · jusqu\'au ' + crmDate(p.valid_until, { day: 'numeric', month: 'short' }) : ''}</span></div>
        <div class="m"><div>${crmPromoValue(p)}</div><span class="crm-st st-${crmPromoState(p)}">${crmPromoState(p)}</span></div>
      </div>`).join('') : '<div class="ag-empty">Aucune promo pour le moment.</div>'}</div>`;
}
function crmPromoFromIdea(i){
  const x = crmPromoIdeas()[i]; if(!x) return;
  const d = new Date(Date.now() + (x.days || 30) * crmDay);
  crmPromoForm(null, { title: x.title, kind: x.kind, value: x.value, segment: x.segment, until: d.toISOString().slice(0, 10) });
}
function crmPromoForm(id, pre){
  pre = pre || {};
  const p = id ? CRM.promos.find(x => x.id === id) : null;
  const t = p ? (p.target || {}) : { ids: pre.ids, segment: pre.segment };
  const mode = t.ids && t.ids.length ? 'ids' : (t.segment ? 'seg' : 'all');
  CRM.promoIds = (t.ids || []).slice();
  CRM.promoBack = !!pre.back;
  const def = new Date(Date.now() + 30 * crmDay).toISOString().slice(0, 10);
  agSheet('crmPromo', `
    <h3>${p ? 'Modifier la promo' : 'Nouvelle promo'}</h3>
    <label>Nom</label><input id="crmPTitle" value="${agEsc(p ? p.title : (pre.title || ''))}" placeholder="Ex : Spécial Noël, Merci fidélité">
    <label>Réduction</label>
    <div class="ag-pills" id="crmPKind"><button data-k="percent" class="${(p ? p.kind : (pre.kind || 'percent')) === 'percent' ? 'on' : ''}" onclick="agPick(this)">En %</button><button data-k="amount" class="${(p ? p.kind : pre.kind) === 'amount' ? 'on' : ''}" onclick="agPick(this)">En FCFA</button></div>
    <input id="crmPValue" type="number" inputmode="decimal" value="${p ? Number(p.value) : (pre.value || '')}" placeholder="Ex : 10" style="margin-top:8px">
    <label>Code</label><input id="crmPCode" value="${agEsc(p ? p.code : crmCode())}" style="text-transform:uppercase">
    <label>Valable jusqu'au</label><input id="crmPUntil" type="date" value="${p ? (p.valid_until || '') : (pre.until || def)}">
    <label>Pour qui</label>
    <div class="ag-pills" id="crmPMode">
      <button data-m="all" class="${mode === 'all' ? 'on' : ''}" onclick="agPick(this);crmPModeUi()">Tout le monde</button>
      <button data-m="seg" class="${mode === 'seg' ? 'on' : ''}" onclick="agPick(this);crmPModeUi()">Un groupe</button>
      <button data-m="ids" class="${mode === 'ids' ? 'on' : ''}" onclick="agPick(this);crmPModeUi()">Clients choisis</button>
    </div>
    <div id="crmPModeBox"></div>
    <label>Notes (conditions)</label><input id="crmPNotes" value="${agEsc(p ? p.notes || '' : '')}" placeholder="Ex : valable sur les shootings studio uniquement">
    <button class="btn-primary" onclick="crmPromoSave(${p ? p.id : 'null'}, '${agEsc(t.segment || 'fideles')}')">${p ? 'Enregistrer' : 'Créer'}</button>`);
  crmPModeUi(t.segment);
}
function crmPModeUi(seg){
  const m = document.querySelector('#crmPMode button.on').dataset.m, box = document.getElementById('crmPModeBox');
  if(m === 'seg'){
    const cur = seg || (document.getElementById('crmPSeg') || {}).value || 'fideles';
    box.innerHTML = `<select id="crmPSeg" style="margin-top:8px">${Object.entries(CRM_SEGS).filter(([k]) => k !== 'tous').map(([k, v]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${v.n} (${crmSegment(k).length}) - ${v.d}</option>`).join('')}</select>`;
  } else if(m === 'ids'){
    box.innerHTML = `<div class="ag-list" style="margin-top:8px;max-height:220px;overflow:auto">${(clients || []).slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => `
      <label class="crm-pick"><input type="checkbox" value="${c.id}" ${CRM.promoIds.includes(c.id) ? 'checked' : ''} onchange="CRM.promoIds=[...document.querySelectorAll('#crmPModeBox input:checked')].map(i=>Number(i.value))"><div><b>${agEsc(c.name)}</b></div></label>`).join('')}</div>`;
  } else box.innerHTML = '';
}
async function crmPromoSave(id){
  const v = k => document.getElementById(k).value.trim();
  const m = document.querySelector('#crmPMode button.on').dataset.m;
  const target = m === 'seg' ? { segment: v('crmPSeg') } : m === 'ids' ? { ids: CRM.promoIds } : {};
  if(m === 'ids' && !CRM.promoIds.length){ alert('Choisis au moins un client'); return; }
  const data = {
    title: v('crmPTitle') || null, kind: document.querySelector('#crmPKind button.on').dataset.k,
    value: parseFloat(v('crmPValue')) || 0, code: v('crmPCode').toUpperCase() || crmCode(),
    valid_until: v('crmPUntil') || null, target, notes: v('crmPNotes') || null
  };
  if(!data.value){ alert('Indique la réduction'); return; }
  try {
    if(id){
      const { data: r, error } = await sb.from('promos').update(data).eq('id', id).select().single();
      if(error) throw error;
      Object.assign(CRM.promos.find(x => x.id === id), r || data);
    } else {
      const { data: u } = await sb.auth.getUser();
      const { data: r, error } = await sb.from('promos').insert({ ...data, user_id: u.user.id, status: 'active', uses: [] }).select().single();
      if(error) throw error;
      CRM.promos.unshift(r); id = r.id;
    }
  } catch(e){ alert('Erreur : ' + (e.message || e)); return; }
  agCloseSheet('crmPromo');
  agToast('Promo enregistrée');
  if(CRM.promoBack && CRM.comp && document.getElementById('crmComp')){ CRM.comp.promoId = id; crmCompRender(); return; }
  crmRender();
  crmPromoOpen(id);
}
function crmPromoOpen(id){
  const p = CRM.promos.find(x => x.id === id); if(!p) return;
  const targets = crmPromoTargets(p), uses = p.uses || [];
  agSheet('crmPromoView', `
    <h3>${agEsc(p.title || 'Promo')}</h3>
    <div class="crm-coupon"><span>${crmPromoValue(p)}</span><b>${agEsc(p.code)}</b><i>${p.valid_until ? "Valable jusqu'au " + crmDate(p.valid_until, { day: 'numeric', month: 'long', year: 'numeric' }) : 'Sans date limite'}</i></div>
    <div class="crm-info"><div><span>Pour</span><b>${agEsc(crmPromoTargetLabel(p))}${targets.length ? ' (' + targets.length + ')' : ''}</b></div><div><span>État</span><b>${crmPromoState(p)}</b></div>${p.notes ? `<div><span>Conditions</span><b>${agEsc(p.notes)}</b></div>` : ''}<div><span>Utilisé</span><b>${uses.length} fois</b></div></div>
    <div class="ag-actions" style="margin:14px 0">
      <button class="ag-act main" onclick="agCloseSheet('crmPromoView');crmCompose(${JSON.stringify(targets.length ? targets : crmSegment('tous').map(x => x.c.id))},{goal:'promo',promoId:${p.id}})"><span>${agIcon('sparkles')}</span>Envoyer</button>
      <button class="ag-act" onclick="crmPromoUse(${p.id})"><span>${agIcon('plus')}</span>Utilisé</button>
      <button class="ag-act" onclick="agCloseSheet('crmPromoView');crmPromoForm(${p.id})"><span>${agIcon('edit')}</span>Modifier</button>
      <button class="ag-act" onclick="crmPromoStop(${p.id})"><span>${agIcon('ban')}</span>${p.status === 'arrete' ? 'Réactiver' : 'Arrêter'}</button>
    </div>
    <div class="ag-list ag-share"><div class="ag-share-row"><div style="min-width:0"><span>Lien de réservation avec ce code</span><b class="ag-link">${agEsc(typeof otResaLink === 'function' ? otResaLink(p.code) : '')}</b></div>
      <button class="ag-ibtn" title="Copier le lien" onclick="crmCopy(otResaLink('${agEsc(p.code)}'))">${agIcon('link', 17)}</button></div></div>
    <div class="ag-hint">Le client ouvre ce lien, choisit sa formule et sa date : la réduction est déjà appliquée. Sa demande arrive dans Clients > Demandes de réservation.</div>
    ${uses.length ? `<h4 class="crm-h4">Utilisations</h4><div class="ag-list">${uses.map(u => `<div class="crm-line"><div><b>${agEsc((((clients || []).find(c => c.id === u.client_id)) || {}).name || u.name || 'Client')}</b><span>${crmDate(u.date)}</span></div></div>`).join('')}</div>` : ''}
    <button class="btn-danger" style="width:100%;padding:12px;margin-top:14px" onclick="crmPromoDelete(${p.id})">Supprimer</button>`);
}
function crmPromoUse(id){
  const p = CRM.promos.find(x => x.id === id);
  const opts = (clients || []).slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => `<option value="${c.id}">${agEsc(c.name)}</option>`).join('');
  agSheet('crmPromoUse', `<h3>Qui a utilisé ${agEsc(p.code)} ?</h3><select id="crmPUc">${opts}</select>
    <button class="btn-primary" onclick="crmPromoUseSave(${id})">Valider</button>`);
}
async function crmPromoUseSave(id){
  const p = CRM.promos.find(x => x.id === id);
  const cid = Number(document.getElementById('crmPUc').value);
  const uses = (p.uses || []).concat([{ client_id: cid, date: new Date().toISOString() }]);
  const { error } = await sb.from('promos').update({ uses }).eq('id', id);
  if(error){ alert(error.message); return; }
  p.uses = uses; agCloseSheet('crmPromoUse'); agToast('Utilisation notée'); crmPromoOpen(id); crmRender();
}
async function crmPromoStop(id){
  const p = CRM.promos.find(x => x.id === id);
  const status = p.status === 'arrete' ? 'active' : 'arrete';
  const { error } = await sb.from('promos').update({ status }).eq('id', id);
  if(error){ alert(error.message); return; }
  p.status = status; crmPromoOpen(id); crmRender();
}
async function crmPromoDelete(id){
  if(!await agConfirm('Supprimer cette promo ?')) return;
  const { error } = await sb.from('promos').delete().eq('id', id);
  if(error){ alert(error.message); return; }
  CRM.promos = CRM.promos.filter(x => x.id !== id);
  agCloseSheet('crmPromoView'); crmRender();
}

// ============================================================
// BRANCHEMENTS
// ============================================================
const _crmShowTab = showTab;
showTab = function(name, btn){
  _crmShowTab(name, btn);
  if(name === 'clients') crmRender();
  if(name === 'tarifs' && typeof crmRenderTarifs === 'function') crmRenderTarifs();
};
// Accueil : rappel des relances
if(typeof agRenderDashMini === 'function'){
  const _crmDash = agRenderDashMini;
  agRenderDashMini = function(){
    _crmDash();
    try {
      const el = document.getElementById('agDashMini'); if(!el || !CRM.loaded) return;
      const n = crmSuggestions().length; if(!n) return;
      const old = document.getElementById('crmDashCard'); if(old) old.remove();
      const d = document.createElement('div');
      d.id = 'crmDashCard'; d.className = 'crm-fete';
      d.onclick = () => agGoTab('clients');
      d.innerHTML = `<div class="ic">${agIcon('users')}</div><div class="d"><b>${n} client${n > 1 ? 's' : ''} à relancer</b><span>Anniversaires, inactifs, remerciements</span></div>${agIcon('chev', 16)}`;
      const act = el.querySelector('.ag-actions');
      if(act && act.nextSibling) el.insertBefore(d, act.nextSibling); else el.appendChild(d);
    } catch(e){}
  };
}
if(typeof refreshAll === 'function'){
  const _crmRefresh = refreshAll;
  refreshAll = window.refreshAll = function(){
    const r = _crmRefresh.apply(this, arguments);
    const active = document.querySelector('.page.active');
    if(active && active.id === 'page-clients' && !document.querySelector('.ag-sheet')) crmRender();
    return r;
  };
}
(async function crmInit(){
  await crmLoad();
  const active = document.querySelector('.page.active');
  if(active && active.id === 'page-clients') crmRender();
  if(active && active.id === 'page-tarifs' && typeof crmRenderTarifs === 'function') crmRenderTarifs();
  if(active && active.id === 'page-dash' && typeof agRenderDashMini === 'function') agRenderDashMini();
})();
// Empeche le navigateur de remplir les champs tout seul (nom, numero...)
if(typeof agSheet === 'function'){
  const _crmSheet = agSheet;
  agSheet = function(id, html){
    const bg = _crmSheet(id, html);
    try {
      bg.querySelectorAll('input, textarea').forEach(i => {
        if(['checkbox', 'radio', 'file', 'date'].includes(i.type)) return;
        i.setAttribute('autocomplete', 'off');
        i.setAttribute('autocorrect', 'off');
        i.setAttribute('data-lpignore', 'true');
        i.setAttribute('data-form-type', 'other');
        i.setAttribute('name', 'h' + Math.random().toString(36).slice(2, 9));
      });
    } catch(e){}
    return bg;
  };
}
// Tarifs, devis, conseiller IA et page publique (fichier prix.js)
(function(){ const sc = document.createElement('script'); sc.src = 'prix.js?v=2'; document.body.appendChild(sc); })();
// Selection multiple, mise a jour auto, sauvegardes, reservations (fichier outils.js)
(function(){ const sc = document.createElement('script'); sc.src = 'outils.js?v=1'; document.body.appendChild(sc); })();
