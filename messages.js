// ============================================================
// SUPER APP HENZO - ECRIRE UN MESSAGE + NOTE CLIENT
// 1. "Écrire un message" pour tout le monde (clients, équipe, partenaires)
//    A qui -> Pourquoi -> Questions de l'IA -> 3 versions -> Envoyer
//    Envoi WhatsApp un par un (crmWa), copie, ou programmé pour plus tard
//    (table messages_programmes). Anniversaires de tout le monde.
// 2. Score client sur 100 (paiements, ponctualité, avis, parrainage,
//    fidélité, impressions, ta note) + filtres "Meilleurs clients" et
//    "À surveiller". La ponctualité est gardée dans shoots.checklist.ponctualite.
// Fonctions globales : msgEcrire({ids, occasion, texte}), msgProgrammes(),
//   msScore(c), msBdays(jours), msKindLabel(kind)
// ============================================================

(function msStyle(){
  if(document.getElementById('msStyle')) return;
  const st = document.createElement('style');
  st.id = 'msStyle';
  st.textContent = `
.ms-top{margin:0 0 14px}
.ms-write{display:flex;align-items:center;gap:12px;width:100%;margin:0;padding:14px;border-radius:18px;border:none;cursor:pointer;text-align:left;background:var(--pri-bg);color:var(--pri-fg);font:700 15px Inter,sans-serif}
.ms-write .ic{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:rgba(255,255,255,.18);flex-shrink:0}
.ms-write small{display:block;font:500 12px Inter,sans-serif;opacity:.85;margin-top:2px}
.ms-card{margin:10px 0 0;padding:12px 14px;border-radius:18px;background:var(--card);border:1px solid var(--border);color:var(--text)}
.ms-card h4{display:flex;align-items:center;gap:8px;margin:0 0 6px;font-size:14px}
.ms-card h4 .ag-i{color:var(--accent)}
.ms-card h4 i{font-style:normal;margin-left:auto;font-size:11px;padding:2px 8px;border-radius:9px;background:var(--card3);color:var(--accent)}
.ms-line{display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid var(--border)}
.ms-line:first-of-type{border-top:0}
.ms-line .d{flex:1;min-width:0}
.ms-line .d b{display:block;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ms-line .d span{display:block;font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ms-line .d p{margin:4px 0 0;font-size:12.5px;color:var(--text-2);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-wrap}
.ms-line .b{display:flex;gap:6px;flex-shrink:0}
.ms-sm{width:auto !important;margin:0 !important;padding:8px 11px !important;border-radius:11px !important;font:600 12px Inter,sans-serif !important;cursor:pointer;background:var(--card2);border:1px solid var(--border);color:var(--text)}
.ms-sm.pri{background:var(--pri-bg);color:var(--pri-fg);border-color:transparent}
.ms-sm.ok{color:var(--green);border-color:var(--green)}
.ms-sm.red{color:var(--red);border-color:rgba(255,107,107,.5)}
.ms-link{display:block;width:auto;margin:8px 0 0;padding:4px 0;background:none;border:none;color:var(--accent);font:600 12.5px Inter,sans-serif;cursor:pointer;text-align:left}
.ms-ok{color:var(--green);font-size:12px;font-weight:700}
.ms-steps{display:flex;gap:5px;margin:2px 40px 12px 0}
.ms-steps i{flex:1;height:4px;border-radius:3px;background:var(--card3)}
.ms-steps i.on{background:var(--accent)}
.ms-stepl{font-size:11.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px}
.ms-h3{margin:0 0 10px !important}
.ms-who{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:14px;background:var(--card2);border:1px solid var(--border);margin-bottom:12px;cursor:pointer;color:var(--text)}
.ms-who .d{flex:1;min-width:0;font-size:13px}.ms-who .d b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ms-who .d span{font-size:11.5px;color:var(--muted)}
.ms-quick{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;margin:0 0 8px;scrollbar-width:none}
.ms-quick button{flex:0 0 auto;width:auto;margin:0;padding:9px 12px;border-radius:12px;background:var(--card);border:1px dashed var(--border-2);color:var(--text);font:600 12.5px Inter,sans-serif;cursor:pointer}
.ms-quick button i{font-style:normal;opacity:.6;margin-left:4px}
.ms-quick button:disabled{opacity:.4}
.ms-list{max-height:46vh;overflow-y:auto;border:1px solid var(--border);border-radius:14px;background:var(--card);margin:8px 0 10px}
.ms-pick{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--border);cursor:pointer;margin:0;color:var(--text)}
.ms-pick:last-child{border-bottom:0}
.ms-pick input{width:20px;height:20px;margin:0;flex-shrink:0;accent-color:var(--accent)}
.ms-pick .d{flex:1;min-width:0}.ms-pick .d b{display:block;font-size:13.5px}.ms-pick .d span{font-size:11.5px;color:var(--muted)}
.ms-bd{font-style:normal;font-size:10.5px;font-weight:700;padding:1px 6px;border-radius:7px;background:rgba(255,193,7,.16);color:var(--yellow);margin-left:4px}
.ms-sel{display:flex;justify-content:space-between;align-items:center;font-size:12.5px;color:var(--muted);margin:2px 2px 0}
.ms-sel button{width:auto;margin:0;padding:4px 0;background:none;border:none;color:var(--accent);font:600 12.5px Inter,sans-serif;cursor:pointer}
.ms-occ{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:4px 0 10px}
.ms-occ button{margin:0;padding:12px 10px;border-radius:14px;background:var(--card2);border:1.5px solid var(--border);color:var(--text);font:600 13px Inter,sans-serif;cursor:pointer;text-align:left;display:flex;align-items:center;gap:8px}
.ms-occ button .ag-i{color:var(--accent);flex-shrink:0}
.ms-occ button.on{border-color:var(--accent);background:var(--card3)}
.ms-warn{margin:8px 0;padding:10px 12px;border-radius:12px;font-size:12.5px;line-height:1.45;background:rgba(255,107,107,.10);border:1px solid rgba(255,107,107,.45);color:var(--text)}
.ms-info{margin:8px 0;padding:10px 12px;border-radius:12px;font-size:12.5px;line-height:1.45;background:var(--card2);border:1px solid var(--border);color:var(--text-2)}
.ms-q{padding:12px;border-radius:14px;background:var(--card2);border:1px solid var(--border);margin-bottom:10px}
.ms-q > b{display:block;font-size:14px;margin-bottom:8px;color:var(--text)}
.ms-q .ag-pills{margin:0 0 8px}
.ms-q input{margin:0}
.ms-load{display:flex;align-items:center;gap:10px;padding:18px 4px;color:var(--muted);font-size:13.5px}
.ms-spin{width:18px;height:18px;border-radius:50%;border:2.5px solid var(--card3);border-top-color:var(--accent);animation:msSpin .8s linear infinite}
@keyframes msSpin{to{transform:rotate(360deg)}}
.ms-v{background:var(--card2);border:1px solid var(--border);border-radius:16px;padding:12px;margin-bottom:10px}
.ms-v.on{border-color:var(--accent)}
.ms-v-h{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:13px}
.ms-v-h b{flex:1}
.ms-v textarea{width:100%;font-size:14px;line-height:1.5;margin:0}
.ms-v-b{display:flex;gap:8px;margin-top:8px}.ms-v-b .btn-primary{flex:1;margin:0}
.ms-tw{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:4px 0 12px}
.ms-tw button{margin:0;padding:9px 4px;border-radius:12px;background:var(--card);border:1px solid var(--border);color:var(--text);font:600 12px Inter,sans-serif;cursor:pointer}
.ms-tw button:disabled{opacity:.5}
.ms-prev{margin-top:8px;font-size:12.5px}
.ms-prev summary{cursor:pointer;color:var(--accent);font-weight:600}
.ms-prev div{margin-top:6px;padding:8px 10px;border-radius:10px;background:var(--card);border:1px solid var(--border)}
.ms-prev div b{display:block;font-size:11.5px;color:var(--muted)}
.ms-prev div p{margin:2px 0 0;white-space:pre-wrap;color:var(--text)}
.ms-big{display:flex;align-items:center;justify-content:center;gap:8px}
.ms-q-row{display:flex;justify-content:space-between;align-items:center;margin:0 0 10px}
.ms-prog{margin-top:10px;padding:12px;border-radius:14px;background:var(--card2);border:1px solid var(--border)}
.ms-prog input{margin:6px 0 8px}
.ms-done{display:flex;align-items:center;gap:8px;justify-content:center;padding:12px;border-radius:14px;background:var(--card2);color:var(--green);font-weight:700}
.ms-send{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)}
.ms-send:last-child{border-bottom:0}
.ms-send .d{flex:1;min-width:0}.ms-send .d b{display:block;font-size:13.5px}.ms-send .d span{font-size:11.5px;color:var(--muted)}
.ms-send.ok .d b{color:var(--green)}
.ms-err{color:var(--red);font-size:12.5px;margin:6px 0}
/* Score client */
.ms-sc{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:8px;font:700 11px Inter,sans-serif;vertical-align:middle;white-space:nowrap;border:1px solid}
.ms-sc.ok{color:var(--green);background:rgba(46,204,113,.12);border-color:rgba(46,204,113,.45)}
.ms-sc.mid{color:var(--yellow);background:rgba(255,193,7,.12);border-color:rgba(255,193,7,.45)}
.ms-sc.bad{color:var(--red);background:rgba(255,107,107,.12);border-color:rgba(255,107,107,.45)}
.ms-sc.big{flex:0 0 auto;width:auto;margin:0;font-size:15px;padding:5px 12px;border-radius:12px}
.ms-score{margin:12px 0;padding:12px 14px;border-radius:14px;background:var(--card2);border:1px solid var(--border)}
.ms-score-h{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.ms-score-h .na{font-size:12.5px;color:var(--muted)}
.ms-stars{display:flex;align-items:center;gap:2px}
.ms-stars span{font-size:11.5px;color:var(--muted);margin-right:6px}
.ms-stars button{width:30px !important;height:30px;margin:0 !important;padding:0 !important;border:none;background:none;cursor:pointer;font-size:22px;line-height:1;color:var(--border-2)}
.ms-stars button.on{color:var(--yellow)}
.ms-why{margin-top:10px;font-size:12.5px}
.ms-why summary{cursor:pointer;color:var(--accent);font-weight:600}
.ms-why ul{margin:8px 0 0;padding-left:18px;color:var(--text);line-height:1.5}
.ms-why li span{color:var(--muted)}
.ms-why li b.neu{color:var(--muted);font-weight:600}
.ms-pt{display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin-top:6px;font-size:11.5px;color:var(--muted)}
.ms-pt button{width:auto;margin:0;padding:4px 9px;border-radius:9px;background:var(--card2);border:1px solid var(--border);color:var(--text-2);font:600 11.5px Inter,sans-serif;cursor:pointer}
.ms-pt button.on.heure{color:var(--green);border-color:var(--green)}
.ms-pt button.on.retard{color:var(--yellow);border-color:var(--yellow)}
.ms-pt button.on.absent{color:var(--red);border-color:var(--red)}
`;
  document.head.appendChild(st);
})();

const MS = { prog: [], loaded: false, marque: null, w: null, sc: null };

// ---------- Petits outils ----------
const msE = s => (typeof agEsc === 'function' ? agEsc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
const msI = (n, s) => (typeof agIcon === 'function' ? agIcon(n, s) : '');
const msF = n => (typeof agF === 'function' ? agF(n) : Math.round(Number(n) || 0) + ' F');
const msDay = 864e5;
function msClean(t){ return String(t == null ? '' : t).replace(/[\u2014\u2013]/g, '-').replace(/\r/g, '').trim(); }
function msAll(){ return typeof clients !== 'undefined' && Array.isArray(clients) ? clients : []; }
function msShoots(){ return typeof shoots !== 'undefined' && Array.isArray(shoots) ? shoots : []; }
function msPerson(id){ return msAll().find(c => c.id === Number(id)) || null; }
function msFirst(c){ return typeof crmFirst === 'function' ? crmFirst(c) : String((c && c.name) || '').split(/\s+/)[0]; }
function msFill(t, c){ return typeof crmFill === 'function' ? crmFill(t, c) : String(t || '').replace(/\{prenom\}/gi, msFirst(c)); }
function msIsClient(c){ return typeof window.estClient === 'function' ? window.estClient(c) : !(c && c.role) || c.role === 'client'; }
function msRoleKey(c){
  if(msIsClient(c)) return 'client';
  if(typeof eqRoleKeyOf === 'function') return eqRoleKeyOf(c.role);
  return String(c.role || 'autre').toLowerCase();
}
function msRoleLabel(c){
  const k = msRoleKey(c);
  if(k === 'client') return 'Client';
  if(typeof eqRoleLabel === 'function') return eqRoleLabel(k);
  return k.charAt(0).toUpperCase() + k.slice(1);
}
// Groupe pour les filtres : client, equipe (modèles, maquilleuses, amis...) ou partenaire
function msGroup(c){ const k = msRoleKey(c); return k === 'client' ? 'client' : k === 'partenaire' ? 'partenaire' : 'equipe'; }
function msActif(c){ return !(c && c.equipe && typeof c.equipe === 'object' && c.equipe.actif === false); }
function msPhone(c){ return typeof crmPhone === 'function' ? crmPhone(c && c.phone) : String((c && c.phone) || '').replace(/\D/g, ''); }
function msToday0(){ const t = new Date(); t.setHours(0, 0, 0, 0); return t; }
function msDate(d, o){ return d ? new Date(d).toLocaleDateString('fr-FR', o || { day: 'numeric', month: 'short' }) : ''; }
function msHeure(d){ return d ? new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''; }
function msLocalInput(d){ const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); }
function msCopy(t){
  if(typeof crmCopy === 'function') return crmCopy(t);
  (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => agToast('Copié')).catch(() => prompt('Copie :', t));
}

// ---------- Anniversaires (tout le monde : clients, équipe, partenaires) ----------
function msBdayIn(c){
  if(!c || !c.birthday) return null;
  const b = new Date(String(c.birthday).slice(0, 10) + 'T12:00:00'); if(isNaN(b)) return null;
  const t = msToday0();
  let n = new Date(t.getFullYear(), b.getMonth(), b.getDate());
  if(n < t) n = new Date(t.getFullYear() + 1, b.getMonth(), b.getDate());
  return Math.round((n - t) / msDay);
}
function msAge(c){
  if(!c || !c.birthday) return null;
  const y = Number(String(c.birthday).slice(0, 4));
  if(!y || y < 1920 || y > new Date().getFullYear() - 1) return null;
  const j = msBdayIn(c); if(j == null) return null;
  const nextYear = new Date(Date.now() + j * msDay).getFullYear();
  return nextYear - y; // l'âge qu'il ou elle va avoir (ou a aujourd'hui)
}
function msBdays(maxDays){
  return msAll().map(c => ({ c, j: msBdayIn(c) })).filter(x => x.j != null && x.j <= (maxDays == null ? 7 : maxDays))
    .sort((a, b) => a.j - b.j || String(a.c.name).localeCompare(String(b.c.name)));
}
function msBdaySent(c){
  const l = (typeof CRM !== 'undefined' && CRM.msgs) || [];
  return l.some(m => Number(m.client_id) === c.id && m.kind === 'anniversaire' && (Date.now() - new Date(m.created_at)) / msDay < 10);
}
function msBdayTxt(j){ return j === 0 ? "aujourd'hui" : j === 1 ? 'demain' : 'dans ' + j + ' jours'; }

// ---------- Occasions ----------
const MS_OCC = [
  { k: 'anniversaire', n: 'Joyeux anniversaire', ic: 'star' },
  { k: 'merci', n: 'Merci', ic: 'heart' },
  { k: 'felicitations', n: 'Félicitations', ic: 'sparkles', sub: ['Mariage', 'Naissance', 'Diplôme', 'Nouveau travail', 'Fiançailles', 'Autre réussite'] },
  { k: 'invitation', n: 'Invitation', ic: 'mail' },
  { k: 'rappel', n: 'Rappel', ic: 'history' },
  { k: 'service', n: 'Demande de service', ic: 'briefcase' },
  { k: 'excuses', n: 'Excuses', ic: 'chat' },
  { k: 'condoleances', n: 'Condoléances', ic: 'heart' },
  { k: 'fete', n: 'Bonne fête', ic: 'calendar' },
  { k: 'promo', n: 'Nouvelle promo', ic: 'star' },
  { k: 'photos', n: 'Photos prêtes', ic: 'image' },
  { k: 'nouvelles', n: 'Prendre des nouvelles', ic: 'users' },
  { k: 'autre', n: 'Autre', ic: 'edit' }
];
function msOcc(k){ return MS_OCC.find(o => o.k === k) || null; }
function msKindLabel(k){
  const o = msOcc(k); if(o) return o.n;
  const g = typeof CRM_GOALS !== 'undefined' && CRM_GOALS[k]; if(g) return g.n;
  return k || '';
}
// Fêtes proposées (celles qui approchent d'abord)
const MS_FETES_OK = ['nouvel-an', 'saint-valentin', 'femme', 'paques', 'meres', 'peres', 'independance', 'noel', 'korite', 'tabaski'];
function msFetes(){
  const l = typeof crmFetes === 'function' ? crmFetes() : [];
  const seen = new Set();
  return l.filter(f => MS_FETES_OK.includes(f.k) && !seen.has(f.k) && seen.add(f.k));
}

// ---------- Marque ----------
function msMarque(){
  const m = window.ST_MARQUE || MS.marque || {};
  const st = window.ST_MARQUE && String(window.ST_MARQUE.nom || '').trim(), pr = MS.marque && String(MS.marque.nom || '').trim();
  const nom = st || pr || (typeof mkMarque === 'function' ? mkMarque() : '') || 'Henzo Photographie';
  return { nom, emojis: m.emojis || 'peu', tons: Array.isArray(m.tons) ? m.tons : [] };
}

// ---------- Données ----------
async function msLoad(){
  try {
    const { data, error } = await sb.from('messages_programmes').select('*').eq('statut', 'prevu').order('envoyer_le', { ascending: true });
    if(!error) MS.prog = (data || []).filter(p => p.statut === 'prevu');
  } catch(e){ console.warn('messages programmes', e); }
  try {
    const { data: u } = await sb.auth.getUser();
    if(u && u.user){
      const { data } = await sb.from('user_settings').select('user_preferences').eq('user_id', u.user.id).maybeSingle();
      const m = data && data.user_preferences && data.user_preferences.marque;
      MS.marque = m && typeof m === 'object' ? m : (typeof m === 'string' && m ? { nom: m } : null);
    }
  } catch(e){}
  MS.loaded = true;
}
// Texte affiché dans les cartes : le prénom de la personne s'il n'y en a qu'une
function msProgTexte(p){
  const ids = Array.isArray(p.personne_ids) ? p.personne_ids : [];
  const c = ids.length === 1 ? msPerson(ids[0]) : null;
  return c ? msFill(p.texte, c) : msGeneric(p.texte);
}
function msProgSort(){ MS.prog.sort((a, b) => String(a.envoyer_le).localeCompare(String(b.envoyer_le))); }
function msProgDue(){
  const fin = msToday0(); fin.setDate(fin.getDate() + 1);
  return MS.prog.filter(p => p.statut === 'prevu' && p.envoyer_le && new Date(p.envoyer_le) < fin);
}
function msProgNames(p){
  const ids = Array.isArray(p.personne_ids) ? p.personne_ids : [];
  const ps = ids.map(msPerson).filter(Boolean);
  if(!ps.length) return 'Personne';
  return ps.length <= 2 ? ps.map(c => c.name).join(', ') : `${ps[0].name} et ${ps.length - 1} autres`;
}

// ============================================================
// HAUT DE L'ONGLET CLIENTS (les 2 vues) : bouton, messages du jour, anniversaires
// ============================================================
function msTopHtml(){
  const due = msProgDue();
  const bd = msBdays(7);
  const autres = MS.prog.length - due.length;
  return `<div class="ms-top" id="msTop">
    <button class="ms-write" onclick="msgEcrire()"><span class="ic">${msI('chat', 20)}</span><span>Écrire un message<small>Anniversaire, merci, fête, promo... l'IA t'aide</small></span></button>
    ${due.length ? `<div class="ms-card" id="msDue"><h4>${msI('calendar', 17)} Messages à envoyer aujourd'hui <i>${due.length}</i></h4>
      ${due.map(p => `<div class="ms-line"><div class="d"><b>${msE(msProgNames(p))}</b><span>${msE(msKindLabel(p.occasion) || 'Message')} · ${new Date(p.envoyer_le) < msToday0() ? 'prévu le ' + msDate(p.envoyer_le) : 'à ' + msHeure(p.envoyer_le)}</span><p class="ag-keep">${msE(msProgTexte(p))}</p></div>
        <div class="b"><button class="ms-sm pri" onclick="msProgEnvoyer(${p.id})">Envoyer</button><button class="ms-sm ok" onclick="msProgFait(${p.id})">C'est envoyé</button></div></div>`).join('')}
    </div>` : ''}
    ${bd.length ? `<div class="ms-card" id="msBdays"><h4>${msI('star', 17)} Anniversaires de la semaine <i>${bd.length}</i></h4>
      ${bd.slice(0, 6).map(x => `<div class="ms-line"><div class="d"><b>${msE(x.c.name)}</b><span>${msE(msRoleLabel(x.c))} · ${msBdayTxt(x.j)}${msAge(x.c) ? ' · ' + msAge(x.c) + ' ans' : ''}</span></div>
        <div class="b">${msBdaySent(x.c) ? `<span class="ms-ok">${msI('check', 14)} Envoyé</span>` : `<button class="ms-sm pri" onclick="msgEcrire({ids:[${x.c.id}],occasion:'anniversaire'})">Écrire</button>`}</div></div>`).join('')}
      ${bd.length > 1 ? `<button class="ms-link" onclick="msgEcrire({ids:[${bd.map(x => x.c.id).join(',')}],occasion:'anniversaire'})">Écrire aux ${bd.length} (un message chacun)</button>` : ''}
    </div>` : ''}
    ${MS.prog.length ? `<button class="ms-link" onclick="msgProgrammes()">${msI('history', 14)} Messages programmés (${MS.prog.length})${autres > 0 && due.length ? ' · ' + autres + ' plus tard' : ''}</button>` : ''}
  </div>`;
}
// Ajoute le haut de page dès que l'onglet Clients se dessine (vue Clients ou vue Équipe)
function msInjectTop(){
  const body = document.getElementById('crmClientsBody'); if(!body) return;
  const sw = body.querySelector(':scope > .eq-switch');
  const isMain = sw || (typeof CRM !== 'undefined' && (CRM.view === 'clients' || CRM.view === 'equipe') && body.querySelector(':scope > .ag-total'));
  const old = body.querySelector(':scope > #msTop');
  if(!isMain){ if(old) old.remove(); return; }
  const html = msTopHtml();
  if(old) old.remove();
  const t = document.createElement('div'); t.innerHTML = html;
  const node = t.firstElementChild;
  if(sw) sw.insertAdjacentElement('afterend', node); else body.insertBefore(node, body.firstChild);
}
function msRefreshTop(){
  try { msInjectTop(); } catch(e){}
  try { if(document.getElementById('agDashMini') && typeof agRenderDashMini === 'function') msDashCard(); } catch(e){}
}
function msDashCard(){
  const el = document.getElementById('agDashMini'); if(!el) return;
  const old = document.getElementById('msDashCard'); if(old) old.remove();
  const due = msProgDue(), bd = msBdays(0).filter(x => !msBdaySent(x.c));
  if(!due.length && !bd.length) return;
  const d = document.createElement('div');
  d.id = 'msDashCard'; d.className = 'crm-fete';
  d.onclick = () => { if(typeof CRM !== 'undefined') CRM.view = 'clients'; if(typeof agGoTab === 'function') agGoTab('clients'); };
  const t = [due.length ? `${due.length} message${due.length > 1 ? 's' : ''} à envoyer aujourd'hui` : '', bd.length ? `Anniversaire : ${bd.slice(0, 2).map(x => msFirst(x.c)).join(', ')}${bd.length > 2 ? '...' : ''}` : ''].filter(Boolean);
  d.innerHTML = `<div class="ic">${msI(due.length ? 'calendar' : 'star')}</div><div class="d"><b>${msE(t[0])}</b><span>${msE(t[1] || 'Touche pour les envoyer')}</span></div>${msI('chev', 16)}`;
  const act = el.querySelector('.ag-actions');
  if(act && act.nextSibling) el.insertBefore(d, act.nextSibling); else el.appendChild(d);
}

// ============================================================
// ECRIRE UN MESSAGE (feuille en 5 étapes)
// ============================================================
const MS_STEPS = ['À qui', 'Pourquoi', 'Questions', '3 versions', 'Envoyer'];
function msgEcrire(o){
  o = o || {};
  const ids = [...new Set((o.ids || []).map(Number).filter(id => msPerson(id)))];
  const occ = msOcc(o.occasion) ? o.occasion : (o.occasion ? 'autre' : null);
  MS.w = {
    step: 1, ids, filt: 'tous', q: '', occ, sub: o.sub || '', desc: o.occasion && !msOcc(o.occasion) ? String(o.occasion) : (o.desc || ''),
    vous: null, questions: [], answers: {}, qDone: false, versions: [], pick: null, text: '', sent: {}, busy: '', err: '',
    progId: o.progId || null, showProg: false, progAt: ''
  };
  const w = MS.w;
  if(occ === 'fete' && !w.sub){ const f = msFetes()[0]; if(f) w.sub = f.n; }
  w.vous = msDefaultVous();
  if(o.texte){ w.text = msClean(o.texte); w.step = ids.length ? 5 : 1; w.fromText = true; }
  else if(ids.length && occ && occ !== 'autre') w.step = 3;
  else if(ids.length) w.step = 2;
  if(typeof agSheet === 'function') agSheet('msSheet', '<div id="msBody"></div>');
  msRender();
  if(w.step === 3) msAskQuestions();
}
function msDefaultVous(){
  const cs = msSel();
  if(!cs.length) return true;
  return cs.some(c => msIsClient(c)); // clients : vous ; équipe, amis : tu
}
function msSel(){ return MS.w ? MS.w.ids.map(msPerson).filter(Boolean) : []; }
function msGo(step){
  const w = MS.w; if(!w) return;
  if(step === 2 && !w.ids.length){ agToast('Choisis au moins une personne'); return; }
  if(step === 3){
    if(!w.occ){ agToast('Choisis pourquoi tu écris'); return; }
    if(w.occ === 'autre' && !String(w.desc || '').trim()){ w.err = 'Dis en quelques mots ce que tu veux dire (tu peux dicter).'; msRender(); return; }
  }
  if(step === 5 && !String(w.text || '').trim()){ agToast('Choisis une version'); return; }
  w.err = ''; w.step = step; msRender();
  if(step === 3 && !w.qDone && !w.busy) msAskQuestions();
  if(step === 4 && !w.versions.length && !w.busy) msGenerate('new');
}
function msRender(){
  const el = document.getElementById('msBody'); const w = MS.w;
  if(!el || !w) return;
  const head = `<div class="ms-steps">${MS_STEPS.map((s, i) => `<i class="${i < w.step ? 'on' : ''}"></i>`).join('')}</div>
    <div class="ms-stepl">Étape ${w.step} sur 5 · ${MS_STEPS[w.step - 1]}</div>`;
  const back = w.step > 1 ? `<button class="ag-back" onclick="msGo(${w.step === 5 && w.fromText ? 1 : w.step - 1})">${msI('chev', 16)} Retour</button>` : '';
  const body = [null, msStep1, msStep2, msStep3, msStep4, msStep5][w.step]();
  el.innerHTML = back + head + body + (w.err ? `<div class="ms-err" id="msErr">${msE(w.err)}</div>` : '');
}
function msWhoHtml(){
  const cs = msSel();
  const t = cs.length === 0 ? 'Personne' : cs.length <= 3 ? cs.map(c => c.name).join(', ') : `${cs.slice(0, 2).map(c => c.name).join(', ')} et ${cs.length - 2} autres`;
  return `<div class="ms-who" onclick="msGo(1)">${msI('users', 18)}<div class="d"><b>${msE(t)}</b><span>${cs.length} personne${cs.length > 1 ? 's' : ''} · toucher pour changer</span></div>${msI('chev', 16)}</div>`;
}

// ---------- Étape 1 : à qui ----------
function msQuickSets(){
  const team = msAll().filter(c => msGroup(c) === 'equipe' && msActif(c));
  let inact = [];
  try { inact = typeof crmSegment === 'function' ? crmSegment('inactifs').map(x => x.c) : []; } catch(e){}
  return [
    { k: 'bd0', n: 'Anniversaires du jour', l: msBdays(0).map(x => x.c) },
    { k: 'bd7', n: 'Anniversaires de la semaine', l: msBdays(7).map(x => x.c) },
    { k: 'team', n: "Toute l'équipe", l: team },
    { k: 'inact', n: 'Clients inactifs', l: inact }
  ];
}
function msQuick(k){
  const s = msQuickSets().find(x => x.k === k); if(!s) return;
  MS.w.ids = s.l.map(c => c.id);
  MS.w.filt = 'tous'; MS.w.q = '';
  if(k === 'bd0' || k === 'bd7'){ if(!MS.w.occ) MS.w.occ = 'anniversaire'; }
  MS.w.vous = msDefaultVous();
  msRender();
  agToast(`${s.l.length} personne${s.l.length > 1 ? 's' : ''} choisie${s.l.length > 1 ? 's' : ''}`);
}
function msFiltered(){
  const w = MS.w, q = String(w.q || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return msAll().filter(c => w.filt === 'tous' || msGroup(c) === w.filt)
    .filter(c => !q || [c.name, c.phone, msRoleLabel(c)].join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}
function msListHtml(){
  const sel = new Set(MS.w.ids), l = msFiltered();
  if(!l.length) return '<div class="ag-empty" style="padding:16px">Personne ici.</div>';
  return l.map(c => { const j = msBdayIn(c); return `<label class="ms-pick"><input type="checkbox" ${sel.has(c.id) ? 'checked' : ''} onchange="msToggle(${c.id},this.checked)">
    <div class="d"><b>${msE(c.name)}${j != null && j <= 7 ? `<i class="ms-bd">anniv. ${j === 0 ? "aujourd'hui" : 'J-' + j}</i>` : ''}</b><span>${msE(msRoleLabel(c))}${msPhone(c) ? '' : ' · pas de numéro'}</span></div></label>`; }).join('');
}
function msToggle(id, on){
  const w = MS.w, s = new Set(w.ids);
  if(on) s.add(id); else s.delete(id);
  w.ids = [...s]; w.vous = msDefaultVous();
  const n = document.getElementById('msSelN'); if(n) n.textContent = w.ids.length;
  const b = document.getElementById('msNext1'); if(b) b.textContent = `Continuer (${w.ids.length})`;
}
function msSearch(v){ MS.w.q = v; const el = document.getElementById('msList'); if(el) el.innerHTML = msListHtml(); }
function msAllVisible(on){
  const s = new Set(MS.w.ids);
  msFiltered().forEach(c => { if(on) s.add(c.id); else s.delete(c.id); });
  MS.w.ids = [...s]; MS.w.vous = msDefaultVous(); msRender();
}
function msStep1(){
  const w = MS.w, all = msAll();
  const cnt = g => g === 'tous' ? all.length : all.filter(c => msGroup(c) === g).length;
  return `<h3 class="ms-h3">À qui tu écris ?</h3>
    <div class="ms-quick">${msQuickSets().map(s => `<button ${s.l.length ? '' : 'disabled'} onclick="msQuick('${s.k}')">${msE(s.n)}<i>${s.l.length}</i></button>`).join('')}</div>
    <div class="ag-pills">${[['tous', 'Tous'], ['client', 'Clients'], ['equipe', 'Équipe'], ['partenaire', 'Partenaires']].map(([k, n]) => `<button class="${w.filt === k ? 'on' : ''}" onclick="MS.w.filt='${k}';msRender()">${n} <i style="font-style:normal;opacity:.6">${cnt(k)}</i></button>`).join('')}</div>
    <input id="msQ" data-vx="off" placeholder="Rechercher un nom, un numéro" value="${msE(w.q)}" oninput="msSearch(this.value)" style="margin:8px 0 0">
    <div class="ms-list" id="msList">${msListHtml()}</div>
    <div class="ms-sel"><span><b id="msSelN">${w.ids.length}</b> choisie(s)</span><span><button onclick="msAllVisible(true)">Tout cocher</button> · <button onclick="msAllVisible(false)">Aucun</button></span></div>
    <button class="btn-primary" id="msNext1" style="margin-top:10px" onclick="msGo(${w.fromText ? 5 : 2})">Continuer (${w.ids.length})</button>`;
}

// ---------- Étape 2 : pourquoi ----------
function msPickOcc(k){
  const w = MS.w; w.occ = k; w.err = '';
  const o = msOcc(k);
  if(k === 'fete'){ const f = msFetes()[0]; w.sub = f ? f.n : ''; }
  else if(o && o.sub) w.sub = o.sub[0];
  else w.sub = '';
  w.questions = []; w.answers = {}; w.qDone = false; w.versions = [];
  msRender();
}
function msStep2(){
  const w = MS.w, o = msOcc(w.occ), cs = msSel();
  const dettes = typeof svDu === 'function' ? cs.filter(c => svDu(c.id).total > 0) : [];
  const fetes = msFetes();
  return `${msWhoHtml()}<h3 class="ms-h3">Pourquoi tu écris ?</h3>
    <div class="ms-occ">${MS_OCC.map(x => `<button class="${w.occ === x.k ? 'on' : ''}" onclick="msPickOcc('${x.k}')">${msI(x.ic, 17)}${msE(x.n)}</button>`).join('')}</div>
    ${w.occ === 'fete' ? `<label>Quelle fête ?</label><div class="ag-pills">${fetes.slice(0, 4).map(f => `<button class="${w.sub === f.n ? 'on' : ''}" onclick="MS.w.sub=${msE(JSON.stringify(f.n))};MS.w.versions=[];msRender()">${msE(f.n)}<small>${f.j === 0 ? "aujourd'hui" : 'dans ' + f.j + ' j'}</small></button>`).join('')}</div>
      <select onchange="MS.w.sub=this.value;MS.w.versions=[];msRender()" style="margin-top:6px"><option value="">Autre fête...</option>${fetes.map(f => `<option ${w.sub === f.n ? 'selected' : ''}>${msE(f.n)}</option>`).join('')}</select>` : ''}
    ${o && o.sub ? `<label>Pour quoi ?</label><div class="ag-pills">${o.sub.map(s => `<button class="${w.sub === s ? 'on' : ''}" onclick="MS.w.sub=${msE(JSON.stringify(s))};MS.w.versions=[];msRender()">${msE(s)}</button>`).join('')}</div>` : ''}
    ${w.occ ? `<label>${w.occ === 'autre' ? 'Dis ce que tu veux dire (tape ou dicte)' : 'Un détail à ajouter ? (facultatif)'}</label>
      <textarea id="msDesc" rows="3" oninput="MS.w.desc=this.value;MS.w.versions=[];MS.w.qDone=false" placeholder="${w.occ === 'autre' ? 'Ex : dire à Awa que la séance de samedi est déplacée à 16 h' : 'Ex : la séance de mars, un petit cadeau, une date...'}">${msE(w.desc)}</textarea>` : ''}
    ${w.occ === 'promo' && dettes.length ? `<div class="ms-warn"><b>${msE(dettes.map(c => c.name).join(', '))}</b> ${dettes.length > 1 ? 'te doivent' : 'te doit'} de l'argent : pas de promo pour ${dettes.length > 1 ? 'eux' : 'cette personne'}. Enlève-${dettes.length > 1 ? 'les' : 'la'} de la liste ou choisis une autre occasion.
      <button class="ms-link" onclick="msSansDettes()">Enlever ${dettes.length > 1 ? 'ces ' + dettes.length + ' personnes' : 'cette personne'}</button></div>` : ''}
    <button class="btn-primary" style="margin-top:12px" onclick="msGo(3)">Continuer</button>`;
}
function msSansDettes(){
  MS.w.ids = MS.w.ids.filter(id => !(typeof svDu === 'function' && svDu(id).total > 0));
  msRender();
}

// ---------- Contexte pour l'IA ----------
function msWorkedWith(c){
  return msShoots().filter(s => !/annul/i.test(s.status || '') && (Number(s.client_id) === c.id || (Array.isArray(s.equipe) && s.equipe.some(e => Number(e.personne_id) === c.id))))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}
function msBrief(c){
  const L = [`${c.name} (prénom à utiliser : ${msFirst(c)}) - rôle : ${msRoleLabel(c)}`];
  const ss = msWorkedWith(c), now = new Date();
  const done = ss.filter(s => s.date && new Date(s.date) <= now), next = ss.filter(s => s.date && new Date(s.date) > now);
  if(done.length) L.push(`${done.length} séance(s) ${msIsClient(c) ? '' : 'ensemble '}: ${done.slice(0, 3).map(s => (s.type || 'Séance') + ' en ' + new Date(s.date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })).join(', ')}`);
  else L.push('aucune séance passée');
  if(next.length) L.push(`séance prévue le ${msDate(next[0].date, { day: 'numeric', month: 'long' })}`);
  const j = msBdayIn(c), age = msAge(c);
  if(c.birthday) L.push(`anniversaire le ${msDate(String(c.birthday).slice(0, 10) + 'T12:00:00', { day: 'numeric', month: 'long' })}${j === 0 ? " (c'est aujourd'hui)" : j != null && j <= 30 ? ' (dans ' + j + ' jours)' : ''}${age ? ', va avoir ' + age + ' ans' : ''}`);
  if(typeof svLastImpression === 'function'){ const imp = svLastImpression(c.id); if(imp) L.push(`dernière impression de Henzo : ${imp.humeur === 'positif' ? 'bonne' : imp.humeur === 'negatif' ? 'mauvaise' : 'neutre'}${imp.text ? ' (' + imp.text + ')' : ''}`); }
  if(typeof svDu === 'function'){ const du = svDu(c.id); if(du.total > 0) L.push(`DOIT ENCORE ${Math.round(du.total)} F : pas de promo, pas de cadeau, pas de réduction`); }
  const sc = msIsClient(c) ? msScore(c) : null;
  if(sc && sc.score != null) L.push(`score client ${sc.score}/100${sc.surveiller ? ' (client à surveiller)' : sc.score >= 75 ? ' (très bon client)' : ''}`);
  const crm = c.crm || {};
  if(crm.famille) L.push('famille : ' + crm.famille);
  if(crm.aime) L.push('aime : ' + crm.aime);
  if(c.equipe && c.equipe.specialite) L.push('spécialité : ' + c.equipe.specialite);
  if(c.notes) L.push('notes : ' + String(c.notes).slice(0, 200));
  return '- ' + L.join(' ; ');
}
function msOccTxt(){
  const w = MS.w, o = msOcc(w.occ);
  let t = o ? o.n : 'Message';
  if(w.occ === 'fete' && w.sub) t = 'Bonne fête : ' + w.sub;
  else if(w.sub) t += ' (' + w.sub + ')';
  if(w.desc && String(w.desc).trim()) t += '. Ce que Henzo veut dire : ' + String(w.desc).trim();
  return t;
}
function msSystem(){
  const m = msMarque();
  const emo = { aucun: "aucun emoji", peu: "1 ou 2 emojis au plus", beaucoup: "quelques emojis bien choisis" }[m.emojis] || '1 ou 2 emojis au plus';
  return `Tu aides Henzo, photographe et vidéaste à Bouaké (Côte d'Ivoire), à écrire des messages WhatsApp personnels. Sa marque : "${m.nom}" (studio à Ahougnansou, en face du Restaurant Le Rosier).
Tu écris en français de Côte d'Ivoire naturel, simple et chaleureux, comme un vrai message entre personnes, jamais comme une publicité. Phrases courtes. ${emo}. N'utilise jamais de tiret long ni de tiret moyen. N'invente aucun prix, aucune réduction, aucune date qui ne sont pas donnés.`;
}
function msPeopleCtx(){
  const cs = msSel();
  if(cs.length <= 6) return 'Destinataire(s) :\n' + cs.map(msBrief).join('\n');
  const g = { client: 0, equipe: 0, partenaire: 0 }; cs.forEach(c => g[msGroup(c)]++);
  return `Message pour ${cs.length} personnes (${g.client} clients, ${g.equipe} de l'équipe, ${g.partenaire} partenaires). Exemples :\n` + cs.slice(0, 4).map(msBrief).join('\n');
}
async function msAI(prompt){
  if(typeof window.iaRelais === 'function'){
    const r = await window.iaRelais({ system: msSystem(), messages: [{ role: 'user', text: prompt }], tache: 'json', maxTokens: 1800 });
    return (r && (r.text != null ? r.text : r)) || '';
  }
  if(typeof callAI === 'function') return await callAI(msSystem() + '\n\n' + prompt);
  throw new Error("L'IA n'est pas disponible.");
}
function msJson(t){
  if(typeof crmJson === 'function') return crmJson(t);
  const s = String(t || '').replace(/```json|```/g, ''); const a = s.indexOf('{'), b = s.lastIndexOf('}');
  return JSON.parse(s.slice(a, b + 1));
}

// ---------- Étape 3 : questions de l'IA ----------
function msQFallback(){
  const w = MS.w, cs = msSel(), one = cs.length === 1 ? cs[0] : null;
  const q = [];
  const done = one ? msWorkedWith(one).filter(s => s.date && new Date(s.date) <= new Date()) : [];
  if(one && done.length && ['anniversaire', 'merci', 'nouvelles', 'fete'].includes(w.occ))
    q.push({ q: `Tu veux rappeler sa séance de ${new Date(done[0].date).toLocaleDateString('fr-FR', { month: 'long' })} ?`, choix: ['Oui', 'Non'] });
  q.push({ q: 'Ton plutôt drôle ou élégant ?', choix: ['Drôle', 'Élégant', 'Simple et chaleureux'] });
  if(['anniversaire', 'fete', 'merci', 'felicitations'].includes(w.occ) && !(one && typeof svDu === 'function' && svDu(one.id).total > 0))
    q.push({ q: 'Tu lui offres quelque chose ?', choix: ['Non, juste les voeux', 'Une petite réduction', 'Un tirage photo offert'] });
  return q.slice(0, 3);
}
async function msAskQuestions(){
  const w = MS.w; if(!w) return;
  w.busy = 'q'; w.err = ''; msRender();
  try {
    const r = await msAI(`${msPeopleCtx()}
Occasion : ${msOccTxt()}.
Avant d'écrire, pose à Henzo 1 à 3 questions très courtes (moins de 12 mots) qui rendront ce message plus personnel : un souvenir commun (une séance), le ton (drôle ou élégant), un cadeau, une date, un détail. Ne pose pas de question dont tu connais déjà la réponse. Ne propose jamais de cadeau ou de réduction à quelqu'un qui doit de l'argent.
Pour chaque question, donne 2 à 4 réponses rapides très courtes (1 à 4 mots).
Réponds uniquement en JSON : {"questions":[{"q":"...","choix":["...","..."]}]}`);
    const j = msJson(r);
    const qs = (j.questions || []).map(x => typeof x === 'string' ? { q: x, choix: [] } : x).filter(x => x && x.q)
      .slice(0, 3).map(x => ({ q: msClean(x.q), choix: (Array.isArray(x.choix) ? x.choix : []).map(msClean).filter(Boolean).slice(0, 4) }));
    if(!qs.length) throw new Error('aucune question');
    if(MS.w !== w) return;
    w.questions = qs;
  } catch(e){
    if(MS.w !== w) return;
    w.questions = msQFallback();
  }
  w.answers = {}; w.qDone = true; w.busy = ''; msRender();
}
function msAnswer(i, v){
  const w = MS.w; w.answers[i] = w.answers[i] === v ? '' : v;
  const box = document.getElementById('msQ' + i); if(!box) return;
  box.querySelectorAll('.ag-pills button').forEach(b => b.classList.toggle('on', b.dataset.v === w.answers[i]));
  const inp = box.querySelector('input'); if(inp) inp.value = '';
  w.versions = [];
}
function msStep3(){
  const w = MS.w;
  if(w.busy === 'q') return `${msWhoHtml()}<h3 class="ms-h3">Quelques questions</h3><div class="ms-load"><i class="ms-spin"></i> L'IA prépare ses questions...</div>`;
  return `${msWhoHtml()}<h3 class="ms-h3">Quelques questions</h3>
    <div class="ms-q-row"><span class="ag-hint" style="margin:0">${msE(msKindLabel(w.occ))}${w.sub ? ' · ' + msE(w.sub) : ''}</span>
      <div class="ag-pills" style="margin:0">${[[false, 'Tu'], [true, 'Vous']].map(([v, n]) => `<button class="${w.vous === v ? 'on' : ''}" onclick="MS.w.vous=${v};MS.w.versions=[];msRender()">${n}</button>`).join('')}</div></div>
    ${w.questions.map((q, i) => `<div class="ms-q" id="msQ${i}"><b>${msE(q.q)}</b>
      ${q.choix.length ? `<div class="ag-pills">${q.choix.map(c => `<button data-v="${msE(c)}" class="${w.answers[i] === c ? 'on' : ''}" onclick="msAnswer(${i},this.dataset.v)">${msE(c)}</button>`).join('')}</div>` : ''}
      <input placeholder="Ou écris ta réponse" value="${msE(q.choix.includes(w.answers[i]) ? '' : (w.answers[i] || ''))}" oninput="MS.w.answers[${i}]=this.value;MS.w.versions=[];this.closest('.ms-q').querySelectorAll('.ag-pills button').forEach(b=>b.classList.remove('on'))"></div>`).join('')}
    <button class="btn-primary ms-big" onclick="MS.w.versions=[];msGo(4)">${msI('sparkles', 16)} Écrire les 3 versions</button>
    <button class="btn-secondary" style="margin-top:8px" onclick="MS.w.answers={};MS.w.versions=[];msGo(4)">Passer les questions</button>`;
}

// ---------- Étape 4 : 3 versions ----------
const MS_VTYPES = [['courte', 'Courte'], ['chaleureuse', 'Chaleureuse'], ['pro', 'Pro']];
function msVersionsPrompt(){
  const w = MS.w, cs = msSel(), m = msMarque();
  const rep = w.questions.map((q, i) => `- ${q.q} -> ${w.answers[i] || '(pas de réponse)'}`).join('\n');
  const dettes = typeof svDu === 'function' ? cs.filter(c => svDu(c.id).total > 0) : [];
  return `${msPeopleCtx()}
Occasion : ${msOccTxt()}.
${rep ? 'Réponses de Henzo :\n' + rep : ''}
Écris 3 versions du message :
1. "courte" : 1 ou 2 phrases.
2. "chaleureuse" : plus personnelle et émouvante, 3 à 5 phrases.
3. "pro" : élégante et professionnelle, 2 à 4 phrases.
Règles : ${w.vous ? 'vouvoiement' : 'tutoiement'}. Commence en saluant avec {prenom} (ce mot sera remplacé par le prénom de chaque personne, garde-le tel quel). ${cs.length > 1 ? "C'est le même texte pour plusieurs personnes : ne cite aucun détail propre à une seule personne. " : ''}Signe "${m.nom}" ou "Henzo".${dettes.length ? ` Aucune promo, aucun cadeau, aucune réduction pour ${dettes.map(c => c.name).join(', ')} (doit de l'argent).` : ''}
Réponds uniquement en JSON : {"versions":[{"type":"courte","texte":"..."},{"type":"chaleureuse","texte":"..."},{"type":"pro","texte":"..."}]}`;
}
const MS_TWEAKS = {
  refaire: 'Refais les 3 versions, vraiment différentes des actuelles (autres mots, autre angle).',
  court: 'Rends les 3 versions plus courtes (environ moitié moins de mots).',
  drole: 'Rends les 3 versions plus drôles et légères, avec une touche ivoirienne, sans vulgarité.',
  elegant: 'Rends les 3 versions plus élégantes et raffinées.'
};
async function msGenerate(mode){
  const w = MS.w; if(!w || w.busy) return;
  const cs = msSel(), one = cs.length === 1 ? cs[0] : null;
  const old = w.versions.map(v => ({ ...v }));
  w.busy = mode === 'new' ? 'gen' : mode; w.err = ''; msRender();
  let p = msVersionsPrompt();
  if(mode !== 'new' && old.length) p += `\n\nVoici les versions actuelles :\n${JSON.stringify(old.map(v => ({ type: v.type, texte: one ? v.texte.split(msFirst(one)).join('{prenom}') : v.texte })))}\nDemande de Henzo : ${MS_TWEAKS[mode] || mode}. Garde {prenom}. Même format JSON.`;
  try {
    const j = msJson(await msAI(p));
    const l = (j.versions || []).filter(v => v && v.texte);
    if(!l.length) throw new Error('aucune version');
    if(MS.w !== w) return;
    w.versions = MS_VTYPES.map(([k], i) => { const v = l.find(x => String(x.type || '').toLowerCase().startsWith(k.slice(0, 4))) || l[i] || l[0]; return { type: k, texte: msClean(v.texte) }; });
  } catch(e){
    if(MS.w !== w) return;
    if(!old.length || mode === 'new') w.versions = msModeles();
    w.err = "L'IA n'a pas répondu. Voici des modèles à adapter.";
  }
  if(one) w.versions.forEach(v => { v.texte = v.texte.replace(/\{prenom\}/gi, msFirst(one)); });
  w.busy = ''; msRender();
  if(w.err){ const e = document.getElementById('msErr'); if(e) e.textContent = w.err; }
}
function msPrevHtml(t){
  const cs = msSel(); if(cs.length < 2) return '';
  return `<details class="ms-prev ag-keep"><summary>Aperçu par personne (${cs.length})</summary>${cs.slice(0, 12).map(c => `<div><b>${msE(c.name)}</b><p>${msE(msFill(t, c))}</p></div>`).join('')}${cs.length > 12 ? `<div><b>+ ${cs.length - 12} autres</b></div>` : ''}</details>`;
}
function msVEdit(i, v){
  MS.w.versions[i].texte = v;
  const p = document.getElementById('msPrev' + i); if(p) p.outerHTML = `<div id="msPrev${i}">${msPrevHtml(v)}</div>`;
}
function msUse(i){ const w = MS.w; w.text = w.versions[i].texte; w.pick = i; w.sent = {}; msGo(5); }
function msStep4(){
  const w = MS.w, cs = msSel();
  if(w.busy === 'gen') return `${msWhoHtml()}<h3 class="ms-h3">3 versions</h3><div class="ms-load"><i class="ms-spin"></i> L'IA écrit tes 3 versions...</div>`;
  const b = !!w.busy;
  return `${msWhoHtml()}<h3 class="ms-h3">3 versions</h3>
    <div class="ms-tw">${[['refaire', 'Refaire'], ['court', 'Plus court'], ['drole', 'Plus drôle'], ['elegant', 'Plus élégant']].map(([k, n]) => `<button ${b ? 'disabled' : ''} onclick="msGenerate('${k}')">${w.busy === k ? '...' : n}</button>`).join('')}</div>
    ${w.versions.map((v, i) => `<div class="ms-v ${w.pick === i ? 'on' : ''}">
      <div class="ms-v-h"><b>${msE((MS_VTYPES.find(x => x[0] === v.type) || [0, 'Version ' + (i + 1)])[1])}</b></div>
      <textarea rows="${Math.min(9, Math.max(3, Math.ceil(v.texte.length / 38) + (v.texte.match(/\n/g) || []).length))}" oninput="msVEdit(${i},this.value)">${msE(v.texte)}</textarea>
      <div id="msPrev${i}">${msPrevHtml(v.texte)}</div>
      <div class="ms-v-b"><button class="btn-primary" ${b ? 'disabled' : ''} onclick="msUse(${i})">Choisir celle-ci</button>
        <button class="ag-ibtn" title="Copier" onclick="msCopy(${cs.length === 1 ? 'MS.w.versions[' + i + '].texte' : 'msGeneric(MS.w.versions[' + i + '].texte)'})">${msI('copy', 16)}</button></div>
    </div>`).join('')}
    ${cs.length > 1 ? `<div class="ag-hint">{prenom} est remplacé par le prénom de chaque personne à l'envoi.</div>` : ''}`;
}
// Texte sans {prenom} (pour un statut ou une liste de diffusion)
function msGeneric(t){ return String(t || '').replace(/\s*\{prenom\}\s*/gi, ' ').replace(/(Bonjour|Bonsoir|Salut|Coucou|Joyeux anniversaire)\s+([,!.])/gi, '$1$2').replace(/ {2,}/g, ' ').replace(/ ([,.])/g, '$1').trim(); }

// Modèles quand l'IA ne répond pas
function msVoeu(sub, vous){
  const f = String(sub || '').toLowerCase();
  if(/no[eë]l/.test(f)) return 'Joyeux Noël';
  if(/nouvel/.test(f)) return 'Bonne année';
  if(/p[aâ]ques/.test(f)) return 'Joyeuses Pâques';
  if(/valentin/.test(f)) return 'Joyeuse Saint-Valentin';
  if(/m[eè]res/.test(f)) return 'Bonne fête des mères';
  if(/p[eè]res/.test(f)) return 'Bonne fête des pères';
  if(/femme/.test(f)) return 'Bonne Journée de la femme';
  if(/ind[eé]pendance/.test(f)) return "Bonne fête de l'indépendance";
  if(/korit/.test(f)) return 'Bonne fête de Korité';
  if(/tabaski/.test(f)) return 'Bonne fête de Tabaski';
  return sub ? 'Bonne fête de ' + sub : 'Bonne fête';
}
function msModeles(){
  const w = MS.w, v = w.vous, m = msMarque(), e = m.emojis !== 'aucun';
  const V = (tu, vous) => v ? vous : tu, sig = m.nom;
  const sub = w.sub || '', desc = String(w.desc || '').trim();
  const T = {
    anniversaire: [`Joyeux anniversaire {prenom} !${e ? ' 🎉' : ''} ${V('Passe', 'Passez')} une très belle journée.`,
      `Joyeux anniversaire {prenom} !${e ? ' 🎂' : ''}\nQue cette nouvelle année ${V("t'apporte", 'vous apporte')} la santé, la joie et plein de beaux moments. Merci pour tout, c'est un vrai plaisir de ${V('te', 'vous')} compter parmi les miens.`,
      `Bonjour {prenom},\nToute l'équipe ${sig} ${V('te', 'vous')} souhaite un très joyeux anniversaire. Que cette année soit pleine de réussite.`],
    merci: [`Merci {prenom} !${e ? ' 🙏' : ''} ${V('Tu as', 'Vous avez')} été top.`,
      `Bonjour {prenom},\nJe voulais juste ${V('te', 'vous')} dire un grand merci${desc ? ' pour ' + desc : ''}. Ça me touche vraiment, et j'ai hâte de ${V('te', 'vous')} revoir.`,
      `Bonjour {prenom},\nMerci pour ${V('ta', 'votre')} confiance${desc ? ' et pour ' + desc : ''}. Au plaisir de ${V('te', 'vous')} retrouver très bientôt.`],
    felicitations: [`Félicitations {prenom}${sub ? ' pour ' + sub.toLowerCase() : ''} !${e ? ' 🎉' : ''}`,
      `Bonjour {prenom},\nQuelle belle nouvelle${sub ? ' : ' + sub.toLowerCase() : ''} ! Je suis vraiment content pour ${V('toi', 'vous')}. ${V('Tu le mérites', 'Vous le méritez')}, profite${V('', 'z')} bien de ce moment.`,
      `Bonjour {prenom},\nToutes mes félicitations${sub ? ' pour ' + sub.toLowerCase() : ''}. Je ${V('te', 'vous')} souhaite le meilleur pour la suite.`],
    invitation: [`{prenom}, ${V("tu es", 'vous êtes')} invité${desc ? ' : ' + desc : ''} !`,
      `Bonjour {prenom},\nJ'aimerais beaucoup ${V("t'avoir", 'vous avoir')} avec nous${desc ? ' pour ' + desc : ''}. Ça me ferait vraiment plaisir. ${V('Tu me dis', 'Vous me dites')} si ${V("tu peux", 'vous pouvez')} venir ?`,
      `Bonjour {prenom},\nJ'ai le plaisir de ${V("t'inviter", 'vous inviter')}${desc ? ' : ' + desc : ''}. Merci de me confirmer ${V('ta', 'votre')} présence.`],
    rappel: [`Petit rappel {prenom} : ${desc || 'notre rendez-vous approche'}.`,
      `Bonjour {prenom},\nJuste un petit rappel${desc ? ' : ' + desc : ' pour notre rendez-vous'}. N'hésite${V('', 'z')} pas si ${V('tu as', 'vous avez')} une question.`,
      `Bonjour {prenom},\nJe me permets de ${V('te', 'vous')} rappeler${desc ? ' : ' + desc : ' notre rendez-vous'}. Merci de me confirmer.`],
    service: [`{prenom}, ${V('tu es', 'vous êtes')} dispo${desc ? ' pour ' + desc : ''} ?`,
      `Bonjour {prenom},\nJ'espère que ${V('tu vas', 'vous allez')} bien. J'aurais besoin de ${V('toi', 'vous')}${desc ? ' pour ' + desc : ''}. ${V('Tu es', 'Vous êtes')} disponible ?`,
      `Bonjour {prenom},\nJe ${V('te', 'vous')} contacte pour une collaboration${desc ? ' : ' + desc : ''}. ${V('Dis-moi', 'Dites-moi')} si c'est possible pour ${V('toi', 'vous')}.`],
    excuses: [`{prenom}, toutes mes excuses${desc ? ' pour ' + desc : ''}.`,
      `Bonjour {prenom},\nJe tiens vraiment à ${V("m'excuser", "m'excuser")}${desc ? ' pour ' + desc : ''}. Ce n'était pas normal, et je vais tout faire pour que ça ne se reproduise pas.`,
      `Bonjour {prenom},\nJe ${V('te', 'vous')} présente mes sincères excuses${desc ? ' pour ' + desc : ''}. Merci pour ${V('ta', 'votre')} compréhension.`],
    condoleances: [`{prenom}, toutes mes condoléances. Je pense fort à ${V('toi', 'vous')}.`,
      `Bonjour {prenom},\nJ'ai appris la triste nouvelle. Je ${V("t'adresse", 'vous adresse')} mes sincères condoléances, à ${V('toi', 'vous')} et à toute la famille. Courage, je suis de tout coeur avec ${V('toi', 'vous')}.`,
      `Bonjour {prenom},\nJe ${V("te", 'vous')} présente mes sincères condoléances. Que Dieu ${V("te", 'vous')} donne la force dans ce moment difficile.`],
    fete: [`${msVoeu(sub, v)} {prenom} !${e ? ' 🎊' : ''}`,
      `Bonjour {prenom},\n${msVoeu(sub, v)} ! Je ${V('te', 'vous')} souhaite une très belle fête, pleine de joie avec ${V('tes', 'vos')} proches. Merci d'être là.`,
      `Bonjour {prenom},\n${sig} ${V('te', 'vous')} souhaite ${sub ? 'une excellente fête : ' + msVoeu(sub, v).toLowerCase() : 'une excellente fête'}.`],
    promo: [`{prenom}, nouvelle offre au studio${desc ? ' : ' + desc : ''} !`,
      `Bonjour {prenom},\nJ'ai pensé à ${V('toi', 'vous')} : il y a une nouvelle offre au studio${desc ? ' : ' + desc : ''}. ${V('Réponds', 'Répondez')} à ce message pour réserver ${V('ta', 'votre')} place.`,
      `Bonjour {prenom},\n${sig} lance une nouvelle offre${desc ? ' : ' + desc : ''}. ${V('Écris-moi', 'Écrivez-moi')} pour en profiter.`],
    photos: [`{prenom}, ${V('tes', 'vos')} photos sont prêtes !${e ? ' 📸' : ''}`,
      `Bonjour {prenom},\nBonne nouvelle : ${V('tes', 'vos')} photos sont prêtes ! J'ai hâte que ${V('tu les voies', 'vous les voyiez')}. ${V('Dis-moi', 'Dites-moi')} ce que ${V('tu en penses', 'vous en pensez')}.`,
      `Bonjour {prenom},\n${V('Tes', 'Vos')} photos sont prêtes. Je ${V('te', 'vous')} les envoie dès que ${V('tu es', 'vous êtes')} disponible.`],
    nouvelles: [`Coucou {prenom}, ${V('tu vas', 'vous allez')} bien ?`,
      `Bonjour {prenom},\nÇa fait un moment ! Je pensais à ${V('toi', 'vous')} et je voulais prendre de ${V('tes', 'vos')} nouvelles. J'espère que tout va bien.`,
      `Bonjour {prenom},\nJ'espère que ${V('tu vas', 'vous allez')} bien. Au plaisir d'avoir de ${V('tes', 'vos')} nouvelles.`],
    autre: [`{prenom}, ${desc || '...'}`, `Bonjour {prenom},\n${desc || '...'}`, `Bonjour {prenom},\n${desc || '...'}\nBien cordialement.`]
  };
  const l = T[w.occ] || T.autre;
  return MS_VTYPES.map(([k], i) => ({ type: k, texte: msClean(l[i] + '\n' + (i === 0 ? 'Henzo' : sig)) }));
}

// ---------- Étape 5 : envoyer ----------
function msStep5(){
  const w = MS.w, cs = msSel();
  const withTel = cs.filter(c => msPhone(c)), noTel = cs.filter(c => !msPhone(c));
  const nb = withTel.filter(c => w.sent[c.id]).length;
  const next = withTel.find(c => !w.sent[c.id]);
  const one = cs.length === 1 ? cs[0] : null;
  let send;
  if(!cs.length) send = `<div class="ms-info">Choisis d'abord à qui tu envoies.</div><button class="btn-primary" onclick="msGo(1)">Choisir</button>`;
  else if(one) send = msPhone(one)
    ? (w.sent[one.id] ? `<div class="ms-done">${msI('check', 18)} Envoyé à ${msE(msFirst(one))} et noté dans sa fiche</div>`
      : `<button class="btn-primary ms-big" id="msSend" onclick="msSendOne(${one.id})">${msI('chat', 16)} Envoyer à ${msE(msFirst(one))} sur WhatsApp</button>`)
    : `<div class="ms-warn"><b>${msE(one.name)} n'a pas de numéro.</b> Copie le message et envoie-le toi-même. Il ne sera pas noté comme envoyé.</div>
       <button class="btn-primary ms-big" onclick="msCopy(msFill(MS.w.text,msPerson(${one.id})))">${msI('copy', 16)} Copier le message</button>`;
  else send = `${next ? `<button class="btn-primary ms-big" id="msSend" onclick="msSendOne(${next.id})">${msI('chat', 16)} ${nb ? 'Envoyer au suivant' : 'Envoyer'} : ${msE(msFirst(next))} (${nb + 1} / ${withTel.length})</button>
      <div class="ag-hint">WhatsApp ne permet pas d'envoyer à plusieurs personnes d'un coup. Touche le bouton, envoie dans WhatsApp, reviens ici : la personne suivante est prête.</div>`
      : `<div class="ms-done">${msI('check', 18)} Envoyé à tout le monde (${nb} / ${withTel.length})</div>`}
    <div class="ag-list" style="margin-top:10px;padding:0 12px">${cs.map(c => { const ok = w.sent[c.id], tel = msPhone(c);
      return `<div class="ms-send ${ok ? 'ok' : ''}"><div class="d"><b>${msE(c.name)}</b><span>${tel ? msE(c.phone) : 'Pas de numéro : copie le message'}${ok ? ' · envoyé' : ''}</span></div>
        ${tel ? `<button class="ms-sm ${ok ? '' : 'pri'}" onclick="msSendOne(${c.id})">${ok ? 'Renvoyer' : 'Envoyer'}</button>` : `<button class="ms-sm" onclick="msCopy(msFill(MS.w.text,msPerson(${c.id})))">Copier</button>`}</div>`; }).join('')}</div>
    ${noTel.length ? `<div class="ag-hint">${noTel.length} personne${noTel.length > 1 ? 's' : ''} sans numéro : copie le message pour ${noTel.length > 1 ? 'elles' : 'elle'}. Rien n'est noté comme envoyé.</div>` : ''}`;
  const prog = w.progId ? MS.prog.find(p => p.id === w.progId) : null;
  return `${msWhoHtml()}<h3 class="ms-h3">Envoyer</h3>
    <label>Message (modifiable)</label>
    <textarea id="msText" rows="${Math.min(10, Math.max(4, Math.ceil(String(w.text).length / 38) + 1))}" oninput="MS.w.text=this.value;const p=document.getElementById('msPrevS');if(p)p.outerHTML='<div id=&quot;msPrevS&quot;>'+msPrevHtml(this.value)+'</div>'">${msE(w.text)}</textarea>
    <div id="msPrevS">${msPrevHtml(w.text)}</div>
    <div style="margin-top:12px">${send}</div>
    <div class="ms-v-b" style="margin-top:10px">
      <button class="btn-secondary ms-big" style="margin:0" onclick="msCopy(${one ? 'msFill(MS.w.text,msPerson(' + one.id + '))' : 'msGeneric(MS.w.text)'})">${msI('copy', 15)} Copier</button>
      ${prog ? `<button class="btn-secondary ms-big" style="margin:0;color:var(--green)" onclick="msProgFait(${prog.id},true)">${msI('check', 15)} C'est envoyé</button>`
        : `<button class="btn-secondary ms-big" style="margin:0" onclick="MS.w.showProg=!MS.w.showProg;msRender()">${msI('calendar', 15)} Programmer</button>`}
    </div>
    ${!prog && w.showProg ? `<div class="ms-prog" id="msProgBox"><b>Programmer pour plus tard</b>
      <div class="ag-hint" style="margin:4px 0 0">Le jour venu, tu reçois une notification et le message t'attend dans « Messages à envoyer aujourd'hui ».</div>
      <input type="datetime-local" id="msProgAt" value="${msE(w.progAt || msDefaultAt())}" onchange="MS.w.progAt=this.value">
      <button class="btn-primary" onclick="msProgSave()">Enregistrer pour plus tard</button></div>` : ''}
    <button class="btn-secondary" style="margin-top:10px" onclick="agCloseSheet('msSheet');msRefreshTop()">Terminer</button>`;
}
function msDefaultAt(){
  const w = MS.w, cs = msSel();
  if(w.occ === 'anniversaire' && cs.length === 1){ const j = msBdayIn(cs[0]); if(j != null && j > 0){ const d = msToday0(); d.setDate(d.getDate() + j); d.setHours(8, 0, 0, 0); return msLocalInput(d); } }
  const d = msToday0(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0);
  return msLocalInput(d);
}
async function msSendOne(id){
  const w = MS.w; if(!w) return;
  const t = msClean(w.text); if(!t){ agToast('Le message est vide'); return; }
  if(typeof crmWa !== 'function'){ msCopy(msFill(t, msPerson(id))); return; }
  const ok = await crmWa(id, t, w.occ || 'libre');
  if(!ok) return;
  w.sent[id] = true;
  msRender();
  // Message programmé : tout est parti -> on le marque envoyé
  if(w.progId){
    const withTel = msSel().filter(c => msPhone(c));
    if(withTel.length && withTel.every(c => w.sent[c.id])) await msProgFait(w.progId, false, true);
  }
  msRefreshTop();
}

// ============================================================
// MESSAGES PROGRAMMES
// ============================================================
async function msProgSave(){
  const w = MS.w, at = (document.getElementById('msProgAt') || {}).value || w.progAt;
  const t = msClean(w.text);
  if(!at){ agToast('Choisis la date et l\'heure'); return; }
  if(!t){ agToast('Le message est vide'); return; }
  const d = new Date(at);
  if(isNaN(d)){ agToast('Date invalide'); return; }
  if(d < new Date(Date.now() - 60000) && !await agConfirm("Cette date est déjà passée. Le message apparaîtra tout de suite dans « Messages à envoyer aujourd'hui ».", { ok: 'Enregistrer' })) return;
  const row = { personne_ids: w.ids.slice(), texte: t, occasion: w.occ || 'autre', envoyer_le: d.toISOString(), statut: 'prevu' };
  try {
    const { data, error } = await sb.from('messages_programmes').insert(row).select().single();
    if(error) throw error;
    MS.prog.push(data || row); msProgSort();
  } catch(e){ await agAlert("Le message n'a pas pu être programmé. Vérifie ta connexion et réessaie.\n" + (e.message || '')); return; }
  agCloseSheet('msSheet');
  agToast(`Programmé pour le ${msDate(d, { weekday: 'long', day: 'numeric', month: 'long' })} à ${msHeure(d)}`);
  msRefreshTop();
}
function msProgEnvoyer(id){
  const p = MS.prog.find(x => x.id === id); if(!p) return;
  agCloseSheet('msProgList');
  msgEcrire({ ids: p.personne_ids || [], occasion: msOcc(p.occasion) ? p.occasion : null, texte: p.texte, progId: p.id });
}
async function msProgFait(id, closeSheet, auto){
  const p = MS.prog.find(x => x.id === id); if(!p) return;
  try {
    const { error } = await sb.from('messages_programmes').update({ statut: 'envoye', envoye_le: new Date().toISOString() }).eq('id', id);
    if(error) throw error;
  } catch(e){ await agAlert("Ça n'a pas pu être enregistré. Réessaie."); return; }
  MS.prog = MS.prog.filter(x => x.id !== id);
  if(MS.w && MS.w.progId === id) MS.w.progId = null;
  agToast(auto ? 'Tout est envoyé : message programmé terminé' : 'Noté comme envoyé');
  if(closeSheet) agCloseSheet('msSheet');
  if(document.getElementById('msProgList')) msgProgrammes();
  msRefreshTop();
}
function msgProgrammes(){
  const l = MS.prog.slice().sort((a, b) => String(a.envoyer_le).localeCompare(String(b.envoyer_le)));
  agSheet('msProgList', `<h3>Messages programmés</h3>
    ${l.length ? `<div class="ag-list" style="padding:0 12px">${l.map(p => `<div class="ms-line"><div class="d"><b>${msE(msProgNames(p))}</b>
        <span>${msE(msDate(p.envoyer_le, { weekday: 'short', day: 'numeric', month: 'short' }))} à ${msHeure(p.envoyer_le)} · ${msE(msKindLabel(p.occasion) || 'Message')}</span><p class="ag-keep">${msE(msProgTexte(p))}</p>
        <div class="ms-v-b" style="margin-top:6px"><button class="ms-sm pri" onclick="msProgEnvoyer(${p.id})">Envoyer</button><button class="ms-sm" onclick="msProgEdit(${p.id})">Modifier</button><button class="ms-sm red" onclick="msProgAnnuler(${p.id})">Annuler</button></div></div></div>`).join('')}</div>`
      : '<div class="ag-list"><div class="ag-empty">Aucun message programmé. Dans « Écrire un message », touche « Programmer » à la fin.</div></div>'}`);
}
function msProgEdit(id){
  const p = MS.prog.find(x => x.id === id); if(!p) return;
  agSheet('msProgEd', `<h3>Modifier le message</h3>
    <div class="ag-hint">Pour ${msE(msProgNames(p))}</div>
    <label>Message</label><textarea id="msPeT" rows="6">${msE(p.texte)}</textarea>
    <label>Date et heure</label><input type="datetime-local" id="msPeAt" value="${msE(msLocalInput(p.envoyer_le))}">
    <button class="btn-primary" onclick="msProgEditSave(${id})">Enregistrer</button>`);
}
async function msProgEditSave(id){
  const p = MS.prog.find(x => x.id === id); if(!p) return;
  const texte = msClean((document.getElementById('msPeT') || {}).value), at = (document.getElementById('msPeAt') || {}).value;
  if(!texte || !at){ agToast('Message et date obligatoires'); return; }
  const patch = { texte, envoyer_le: new Date(at).toISOString() };
  try { const { error } = await sb.from('messages_programmes').update(patch).eq('id', id); if(error) throw error; }
  catch(e){ await agAlert("La modification n'a pas pu être enregistrée. Réessaie."); return; }
  Object.assign(p, patch); msProgSort();
  agCloseSheet('msProgEd'); agToast('Message modifié');
  if(document.getElementById('msProgList')) msgProgrammes();
  msRefreshTop();
}
async function msProgAnnuler(id){
  if(!await agConfirm('Annuler ce message programmé ?\nIl ne sera pas envoyé.', { ok: 'Annuler le message', no: 'Garder' })) return;
  try { const { error } = await sb.from('messages_programmes').update({ statut: 'annule' }).eq('id', id); if(error) throw error; }
  catch(e){ await agAlert("Ça n'a pas pu être annulé. Réessaie."); return; }
  MS.prog = MS.prog.filter(x => x.id !== id);
  agToast('Message annulé');
  msgProgrammes(); msRefreshTop();
}

// ============================================================
// 2. NOTE CLIENT : score sur 100
// ============================================================
// Ponctualité gardée dans shoots.checklist.ponctualite ('heure' | 'retard' | 'absent')
const MS_PONCT = [['heure', 'Oui'], ['retard', 'En retard'], ['absent', 'Absent']];
function msPonct(s){ const v = s && s.checklist && typeof s.checklist === 'object' ? s.checklist.ponctualite : null; return ['heure', 'retard', 'absent'].includes(v) ? v : null; }
function msAvisOf(c){
  const l = typeof galAvis !== 'undefined' && Array.isArray(galAvis) ? galAvis : [];
  const pn = String(c.name || '').toLowerCase().replace(/^(mr|mme|mlle)\s+/, '').split(' ')[0];
  return l.filter(a => a.nom_client && pn && a.nom_client.toLowerCase().split(' ')[0] === pn && Number(a.note) > 0);
}
function msDateOf(d){ return new Date(String(d || '').length <= 10 ? d + 'T12:00:00' : d); }
function msScore(c){
  if(!c || !msIsClient(c)) return null;
  if(!MS.sc){ MS.sc = new Map(); setTimeout(() => { MS.sc = null; }, 0); }
  if(MS.sc.has(c.id)) return MS.sc.get(c.id);
  const now = new Date();
  const ss = msShoots().filter(s => Number(s.client_id) === c.id && !/annul/i.test(s.status || ''));
  const done = ss.filter(s => s.date && new Date(s.date) <= now);
  const P = [];
  let has = done.length > 0;
  // 1. Paiements (25)
  const payables = done.filter(s => Number(s.price) > 0 && !(Number(s.recu_hors_app) > 0));
  const horsApp = done.filter(s => Number(s.recu_hors_app) > 0).length;
  const du = typeof svDu === 'function' ? svDu(c.id) : { dettes: [], seances: [], total: 0 };
  const late = x => x.date && (now - msDateOf(x.date)) / msDay > 15;
  const dLate = du.dettes.filter(late), dNew = du.dettes.filter(x => !late(x)), sLate = du.seances.filter(late);
  if(!payables.length && !du.dettes.length){
    P.push({ k: 'pay', n: 'Paiements', pts: 15, max: 25, neu: true, t: horsApp ? 'Payé hors app : neutre' : 'Pas encore de séance à payer : neutre' });
  } else {
    has = true;
    const paid = payables.filter(s => Number(s.montant_recu) >= Number(s.price)).length;
    let pts = payables.length ? 25 * paid / payables.length : 15;
    pts -= dLate.length * 8 + dNew.length * 3 + sLate.length * 4;
    const t = [payables.length ? `${paid} séance${paid > 1 ? 's' : ''} payée${paid > 1 ? 's' : ''} sur ${payables.length}` : ''];
    if(dLate.length || sLate.length) t.push(`${dLate.length + sLate.length} retard${dLate.length + sLate.length > 1 ? 's' : ''} de paiement (plus de 15 jours)`);
    if(dNew.length) t.push('une dette récente');
    if(du.total > 0) t.push('doit ' + msF(du.total));
    if(horsApp) t.push(horsApp + ' payée(s) hors app, neutre');
    P.push({ k: 'pay', n: 'Paiements', pts: Math.max(0, Math.min(25, pts)), max: 25, t: t.filter(Boolean).join(', ') });
  }
  // 2. Ponctualité (15)
  const pv = done.map(msPonct).filter(Boolean);
  if(!pv.length) P.push({ k: 'ponct', n: 'Ponctualité', pts: 9, max: 15, neu: true, t: "Pas d'info : neutre" });
  else {
    has = true;
    const n = k => pv.filter(v => v === k).length;
    const val = (n('heure') + n('retard') * 0.5) / pv.length;
    P.push({ k: 'ponct', n: 'Ponctualité', pts: 15 * val, max: 15, t: [n('heure') ? n('heure') + " fois à l'heure" : '', n('retard') ? n('retard') + ' retard' + (n('retard') > 1 ? 's' : '') : '', n('absent') ? n('absent') + ' absence' + (n('absent') > 1 ? 's' : '') : ''].filter(Boolean).join(', ') });
  }
  // 3. Avis (10)
  const av = msAvisOf(c);
  if(!av.length) P.push({ k: 'avis', n: 'Avis laissés', pts: 6, max: 10, neu: true, t: 'Aucun avis : neutre' });
  else { has = true; const m = av.reduce((a, x) => a + Number(x.note), 0) / av.length; P.push({ k: 'avis', n: 'Avis laissés', pts: 4 + 6 * (m - 1) / 4, max: 10, t: `${av.length} avis, moyenne ${String(Math.round(m * 10) / 10).replace('.', ',')}/5` }); }
  // 4. Recommandations (10)
  const fil = msAll().filter(x => x.id !== c.id && x.parrain_id != null && Number(x.parrain_id) === c.id).length;
  if(fil) has = true;
  P.push({ k: 'reco', n: 'Recommandations', pts: [4, 7, 9][fil] != null ? [4, 7, 9][fil] : 10, max: 10, t: fil ? `${fil} personne${fil > 1 ? 's' : ''} recommandée${fil > 1 ? 's' : ''}` : 'Aucun filleul pour le moment' });
  // 5. Fidélité (20)
  const enc = msShoots().filter(s => Number(s.client_id) === c.id).reduce((a, s) => a + (Number(s.montant_recu) || 0), 0);
  const fPts = Math.min(12, done.length * 4) + (enc >= 150000 ? 8 : enc >= 75000 ? 6 : enc >= 30000 ? 4 : enc > 0 ? 2 : 0);
  P.push({ k: 'fid', n: 'Fidélité', pts: fPts, max: 20, t: `${done.length} séance${done.length > 1 ? 's' : ''}, ${msF(enc)} encaissé` });
  // 6. Impressions (10)
  const imp = typeof svLastImpression === 'function' ? svLastImpression(c.id) : null;
  if(!imp) P.push({ k: 'imp', n: 'Impression', pts: 6, max: 10, neu: true, t: 'Aucune impression notée : neutre' });
  else { has = true; P.push({ k: 'imp', n: 'Impression', pts: imp.humeur === 'positif' ? 10 : imp.humeur === 'negatif' ? 0 : 6, max: 10, t: (imp.humeur === 'positif' ? 'Bonne expérience' : imp.humeur === 'negatif' ? 'Mauvaise expérience' : 'Neutre') + (imp.text ? ' : ' + String(imp.text).slice(0, 60) : '') }); }
  // 7. Ta note (10)
  const na = Number(c.note_admin);
  if(na >= 1 && na <= 5){ has = true; P.push({ k: 'admin', n: 'Ta note', pts: na * 2, max: 10, t: na + ' étoile' + (na > 1 ? 's' : '') + ' sur 5' }); }
  else P.push({ k: 'admin', n: 'Ta note', pts: 6, max: 10, neu: true, t: 'Pas encore notée : neutre' });
  P.forEach(p => { p.pts = Math.round(p.pts * 10) / 10; });
  const score = has ? Math.max(0, Math.min(100, Math.round(P.reduce((a, p) => a + p.pts, 0)))) : null;
  const negatif = imp && imp.humeur === 'negatif';
  const r = { score, parts: P, couleur: score == null ? '' : score >= 70 ? 'ok' : score >= 45 ? 'mid' : 'bad',
    surveiller: score != null && (score < 45 || dLate.length + sLate.length > 0 || !!negatif || pv.includes('absent')) };
  MS.sc.set(c.id, r);
  return r;
}
function msScoreBadge(c){
  const s = msScore(c); if(!s || s.score == null) return '';
  return `<span class="ms-sc ${s.couleur}" title="Score client">Score ${s.score}</span>`;
}
function msScoreBrief(c){
  const s = msScore(c); if(!s || s.score == null) return '';
  const low = s.parts.filter(p => !p.neu && p.pts < p.max * 0.5).map(p => p.n.toLowerCase());
  return `, score client ${s.score}/100${low.length ? ' (points faibles : ' + low.join(', ') + ')' : ''}${s.surveiller ? ', client à surveiller : reste poli, pas de cadeau' : s.score >= 75 ? ', très bon client' : ''}`;
}
function msScoreFicheHtml(c){
  const s = msScore(c); if(!s) return '';
  const na = Number(c.note_admin) || 0;
  return `<div class="ms-score" id="msScoreBox">
    <div class="ms-score-h">${s.score != null ? `<span class="ms-sc big ${s.couleur}">Score ${s.score}</span>` : '<span class="na">Pas encore de score (il faut une séance ou une info)</span>'}
      <div class="ms-stars ag-keep"><span>Ta note</span>${[1, 2, 3, 4, 5].map(i => `<button class="${i <= na ? 'on' : ''}" aria-label="${i} sur 5" onclick="event.stopPropagation();msSetNote(${c.id},${i})">★</button>`).join('')}</div></div>
    ${s.score != null ? `<details class="ms-why"><summary>Pourquoi ce score ?</summary><ul>${s.parts.map(p => `<li><b class="${p.neu ? 'neu' : ''}">${msE(p.n)} : ${String(p.pts).replace('.', ',')} / ${p.max}</b> <span>${msE(p.t)}</span></li>`).join('')}</ul>
      ${s.surveiller ? '<div class="ag-hint" style="color:var(--red)">À surveiller : retard de paiement, absence, mauvaise expérience ou score bas.</div>' : ''}</details>` : ''}
  </div>`;
}
async function msSetNote(id, n){
  const c = msPerson(id); if(!c) return;
  const v = Number(c.note_admin) === n ? null : n; // toucher la même étoile enlève la note
  try {
    const { error } = await sb.from('clients').update({ note_admin: v }).eq('id', id);
    if(error) throw error;
  } catch(e){ await agAlert("La note n'a pas pu être enregistrée. Réessaie."); return; }
  c.note_admin = v; MS.sc = null;
  agToast(v ? `Note : ${v} sur 5` : 'Note enlevée');
  msRefreshFiche(id);
}
function msRefreshFiche(id){
  const sh = document.getElementById('crmClient');
  const y = sh && sh.querySelector('.modal') ? sh.querySelector('.modal').scrollTop : 0;
  if(sh && typeof crmOpenClient === 'function'){ crmOpenClient(id); const m = document.querySelector('#crmClient .modal'); if(m) m.scrollTop = y; }
  if(typeof crmRenderListOnly === 'function' && document.getElementById('crmList')) try { crmRenderListOnly(); } catch(e){}
}
function msPonctHtml(s, clientId){
  if(!s || !s.date || new Date(s.date) > new Date()) return '';
  const v = msPonct(s);
  return `<div class="ms-pt"><span>Venu à l'heure ?</span>${MS_PONCT.map(([k, n]) => `<button class="${k} ${v === k ? 'on' : ''}" onclick="event.stopPropagation();msSetPonct(${s.id},'${k}',${clientId || s.client_id})">${n}</button>`).join('')}</div>`;
}
async function msSetPonct(shootId, v, clientId){
  const s = msShoots().find(x => x.id === shootId); if(!s) return;
  const cur = s.checklist && typeof s.checklist === 'object' ? s.checklist : {};
  const checklist = Object.assign({}, cur, { ponctualite: cur.ponctualite === v ? null : v });
  const r = typeof dbUpdate === 'function' ? await dbUpdate('shoots', shootId, { checklist }) : null;
  if(!r) return;
  s.checklist = r.checklist || checklist; MS.sc = null;
  msRefreshFiche(clientId);
}

// ============================================================
// BRANCHEMENTS
// ============================================================
Object.assign(window, { msgEcrire, msgProgrammes, msScore, msBdays, msKindLabel, msScoreBadge, msScoreFicheHtml, msScoreBrief, msPonctHtml });
(function msInit(){
  let n = 0;
  const hook = () => {
    if(typeof CRM_SEGS === 'undefined' || typeof crmRender !== 'function'){ if(++n < 100) setTimeout(hook, 150); return; }
    // Filtres de la liste Clients
    if(!CRM_SEGS.top){
      if(CRM_SEGS.vip) CRM_SEGS.vip.n = 'Gros budgets';
      CRM_SEGS.top = { n: 'Meilleurs clients', f: x => { const s = msScore(x.c); return !!s && s.score != null && s.score >= 75; }, d: 'Score de 75 ou plus' };
      CRM_SEGS.surveiller = { n: 'À surveiller', f: x => { const s = msScore(x.c); return !!s && s.surveiller; }, d: 'Retard de paiement, absence, mauvaise expérience ou score bas' };
    }
    // Haut de l'onglet Clients : se remet à chaque dessin (vue Clients et vue Équipe)
    const body = document.getElementById('crmClientsBody');
    if(body && !body.__msObs){
      body.__msObs = true;
      try { new MutationObserver(() => { if(!body.querySelector(':scope > #msTop') || !body.querySelector(':scope > .eq-switch, :scope > .ag-total')) msInjectTop(); }).observe(body, { childList: true }); } catch(e){}
    }
    // Accueil
    if(typeof agRenderDashMini === 'function' && !agRenderDashMini.__ms){
      const _d = agRenderDashMini;
      agRenderDashMini = function(){ const r = _d.apply(this, arguments); try { msDashCard(); } catch(e){} return r; };
      agRenderDashMini.__ms = true;
    }
    (async () => {
      await msLoad();
      const p = document.querySelector('.page.active');
      if(p && p.id === 'page-clients') crmRender(); else msRefreshTop();
      if(p && p.id === 'page-dash') try { msDashCard(); } catch(e){}
    })();
  };
  hook();
})();
