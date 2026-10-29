// ============================================================
// SUPER APP HENZO - AGENT MARKETING
// - Discussion avec un agent qui apprend a connaitre Henzo
//   (photos du telephone, des galeries clients, des moodboards)
// - Aujourd'hui : quoi publier, seances pas encore publiees, resultats a donner
// - Plan de la semaine (genere par l'IA, modifiable)
// - Mes resultats : chiffres des posts, "Ce qui marche", bilan de la semaine
// - Ce que l'agent sait de moi : memoire + photos envoyees
// Fonctions pour le reste de l'app : mkPreparerSeance(id), mkOuvrir(sousOnglet)
// Charge par argent.js. Tout le CSS est ici (classes mk-).
// ============================================================

const MK = {
  tab: 'chat', loaded: false, loadedAt: 0, busy: false, search: false,
  msgs: [], mem: [], posts: [], media: [], tarifs: [], promos: [], avis: [],
  pending: [], edit: null, signed: {}, uid: null, weekOff: 0,
  openMsg: null, sel: new Set(), selMode: false, proposal: null, planDraft: null, ctxShoot: null
};
const MK_NETS = ['Facebook', 'Statut WhatsApp', 'Instagram', 'TikTok', 'Google Maps'];
const MK_NET_COL = { 'Facebook': '#1877f2', 'Statut WhatsApp': '#25d366', 'Instagram': '#e1306c', 'TikTok': '#8a8a8a', 'Google Maps': '#ea4335' };
const MK_KINDS = ['Séance client', 'Avant / après', 'Coulisses', 'Avis client', 'Promo', 'Conseil', 'Vidéo courte', 'Présentation du studio', 'Fête / événement', 'Question / sondage'];
const MK_MEM = {
  profil: 'Mon profil', style: 'Mon style', prix: 'Mes prix', clients: 'Mes clients',
  difficulte: 'Mes difficultés', objectif: 'Mes objectifs', resultat: 'Mes résultats', preference: 'Mes préférences'
};
const MK_TABS = [['chat', 'Discussion'], ['jour', "Aujourd'hui"], ['plan', 'Plan'], ['res', 'Mes résultats'], ['moi', "Ce qu'il sait"]];
const MK_TAB_ALIAS = { discussion: 'chat', chat: 'chat', aujourdhui: 'jour', jour: 'jour', today: 'jour', plan: 'plan', semaine: 'plan', resultats: 'res', res: 'res', stats: 'res', memoire: 'moi', moi: 'moi', profil: 'moi' };
const MK_QUOTA = 1024 * 1024 * 1024; // environ 1 Go
const MK_STATS = [['vues', 'Vues'], ['likes', "J'aime"], ['commentaires', 'Commentaires'], ['partages', 'Partages'], ['messages', 'Messages reçus'], ['clients', 'Clients obtenus']];

// ---------- Outils ----------
const mkDayMs = 864e5;
function mkPad(n){ return String(n).padStart(2, '0'); }
function mkDay(d){ d = d ? new Date(d) : new Date(); return `${d.getFullYear()}-${mkPad(d.getMonth() + 1)}-${mkPad(d.getDate())}`; }
function mkAddDays(iso, n){ const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return mkDay(d); }
function mkDateTxt(iso, opt){ if(!iso) return ''; const d = new Date(String(iso).length === 10 ? iso + 'T12:00:00' : iso); return d.toLocaleDateString('fr-FR', opt || { weekday: 'short', day: 'numeric', month: 'short' }); }
function mkDayName(iso){ const t = mkDay(), n = Math.round((new Date(iso + 'T12:00:00') - new Date(t + 'T12:00:00')) / mkDayMs);
  if(n === 0) return "Aujourd'hui"; if(n === 1) return 'Demain'; if(n === -1) return 'Hier';
  const s = mkDateTxt(iso, { weekday: 'long', day: 'numeric', month: 'short' }); return s.charAt(0).toUpperCase() + s.slice(1); }
function mkNorm(s){ return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }
function mkClean(s){ return String(s == null ? '' : s).replace(/[\u2014\u2013]/g, '-'); }
function mkNum(v){
  if(v == null || v === '') return null;
  const s = String(v).toLowerCase().replace(/\s/g, '').replace(',', '.');
  const m = s.match(/^(\d+(?:\.\d+)?)(k|m)?$/);
  if(!m){ const n = Number(s); return isFinite(n) ? Math.round(n) : null; }
  return Math.round(Number(m[1]) * (m[2] === 'k' ? 1000 : m[2] === 'm' ? 1e6 : 1));
}
function mkSlug(s){ return mkNorm(s).replace(/ /g, '-') || 'photo'; }
function mkRand(){ return Math.random().toString(36).slice(2, 8); }
function mkIsMobile(){ try { return matchMedia('(pointer:coarse)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent); } catch(e){ return false; } }
function mkShoot(id){ return (typeof shoots !== 'undefined' ? shoots : []).find(s => s.id === Number(id)); }
function mkClient(id){ return (typeof clients !== 'undefined' ? clients : []).find(c => c.id === Number(id)); }
function mkFirst(c){ return c && c.name ? String(c.name).trim().split(/\s+/)[0] : ''; }
function mkCancelled(s){ return /annul/i.test((s && s.status) || ''); }
function mkShootLabel(s){ if(!s) return ''; const c = mkClient(s.client_id); return `${s.type || 'Séance'}${c ? ' · ' + c.name : ''} · ${mkDateTxt(s.date, { day: 'numeric', month: 'short' })}`; }
function mkNet(n){
  const s = mkNorm(n);
  if(/whats|statut|status/.test(s)) return 'Statut WhatsApp';
  if(/insta|ig\b/.test(s)) return 'Instagram';
  if(/tik/.test(s)) return 'TikTok';
  if(/google|maps|fiche/.test(s)) return 'Google Maps';
  if(/face|fb/.test(s)) return 'Facebook';
  return MK_NETS.includes(n) ? n : 'Facebook';
}
function mkNetChip(n){ return `<span class="mk-net"><i style="background:${MK_NET_COL[n] || 'var(--accent)'}"></i>${agEsc(n || 'Réseau')}</span>`; }
function mkHasStats(p){ const s = p && p.stats; return !!(s && (s.ignore || MK_STATS.some(([k]) => s[k] != null && s[k] !== ''))); }
// Texte prêt à publier : toujours la même mise en forme (Ma marque : titre gras, mentions, copyright)
function mkCanal(net){ return /whatsapp|statut/i.test(net || '') ? 'whatsapp' : /tiktok/i.test(net || '') ? 'tiktok' : 'page'; }
function mkPostText(p){
  const brut = [mkClean(p.caption), mkClean(p.hashtags)].filter(Boolean).join('\n\n');
  return typeof window.txtMiseEnForme === 'function' ? window.txtMiseEnForme(brut, { canal: mkCanal(p.network) }) : brut;
}
function mkCopy(t){
  const done = () => agToast('Copié');
  if(navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t).then(done).catch(() => mkCopyOld(t));
  mkCopyOld(t);
}
function mkCopyOld(t){ const a = document.createElement('textarea'); a.value = t; a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); agToast('Copié'); } catch(e){} a.remove(); }
async function mkUid(){
  if(MK.uid) return MK.uid;
  try { const { data } = await sb.auth.getUser(); MK.uid = data && data.user ? data.user.id : null; } catch(e){}
  return MK.uid;
}
function mkMd(t){
  const lines = agEsc(mkClean(t)).split('\n');
  let html = '', list = '';
  const inl = x => x.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s.,;:!?)]|$)/g, '$1<i>$2</i>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const close = () => { if(list){ html += `</${list}>`; list = ''; } };
  lines.forEach(l => {
    if(/^\s*[-*•]\s+/.test(l)){ if(list !== 'ul'){ close(); html += '<ul>'; list = 'ul'; } html += '<li>' + inl(l.replace(/^\s*[-*•]\s+/, '')) + '</li>'; return; }
    if(/^\s*\d+[.)]\s+/.test(l)){ if(list !== 'ol'){ close(); html += '<ol>'; list = 'ol'; } html += '<li>' + inl(l.replace(/^\s*\d+[.)]\s+/, '')) + '</li>'; return; }
    close();
    if(/^#{1,4}\s/.test(l)) html += '<h4>' + inl(l.replace(/^#{1,4}\s/, '')) + '</h4>';
    else if(l.trim()) html += '<p>' + inl(l) + '</p>';
  });
  close();
  return html;
}
function mkJson(t){
  const s = String(t || '').replace(/```(json)?/g, '');
  const a1 = s.indexOf('{'), a2 = s.indexOf('[');
  const start = a1 < 0 ? a2 : a2 < 0 ? a1 : Math.min(a1, a2);
  if(start < 0) throw new Error("Réponse de l'IA illisible, réessaie.");
  const end = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
  try { return JSON.parse(s.slice(start, end + 1)); }
  catch(e){ throw new Error("Réponse de l'IA illisible, réessaie."); }
}

// ---------- Styles ----------
(function mkStyles(){
  if(document.getElementById('mkStyles')) return;
  const st = document.createElement('style'); st.id = 'mkStyles';
  st.textContent = `
.mk-tabs{display:flex;gap:6px;overflow-x:auto;margin:0 -2px 14px;padding:2px;scrollbar-width:none}
.mk-tabs::-webkit-scrollbar{display:none}
.mk-tabs button{flex:0 0 auto;width:auto;margin:0;padding:9px 14px;border-radius:999px;background:var(--card2);border:1px solid var(--border);color:var(--text-2);font:600 13px Inter,sans-serif;cursor:pointer;white-space:nowrap}
.mk-tabs button.on{background:var(--pri-bg);color:var(--pri-fg);border-color:transparent}
.mk-tabs button i{font-style:normal;display:inline-block;min-width:17px;padding:0 5px;margin-left:5px;border-radius:9px;background:var(--red);color:#fff;font-size:10.5px;line-height:17px}
.mk-chat{display:flex;flex-direction:column;gap:10px;padding:4px 0 8px;min-height:40vh}
.mk-msg{max-width:88%;padding:10px 13px;border-radius:18px;font-size:14px;line-height:1.5;color:var(--text);word-wrap:break-word;position:relative}
.mk-msg.agent{align-self:flex-start;background:var(--card);border:1px solid var(--border);border-bottom-left-radius:6px}
.mk-msg.user{align-self:flex-end;background:var(--deep);color:#fff;border-bottom-right-radius:6px}
.mk-msg.user a{color:#fff}
.mk-msg p{margin:0 0 7px}.mk-msg p:last-child{margin-bottom:0}
.mk-msg ul,.mk-msg ol{margin:4px 0 8px;padding-left:20px}.mk-msg li{margin:2px 0}
.mk-msg h4{margin:10px 0 5px;font-size:14px;color:var(--accent)}
.mk-msg.user h4{color:#fff}
.mk-msg a{color:var(--accent);word-break:break-all}
.mk-time{display:block;font-size:10.5px;opacity:.55;margin-top:4px}
.mk-mact{display:flex;gap:6px;margin-top:8px}
.mk-mact button{width:auto;margin:0;padding:5px 10px;border-radius:10px;background:var(--card2);border:1px solid var(--border);color:var(--text);font:600 12px Inter,sans-serif;cursor:pointer}
.mk-mact button.danger{color:var(--red)}
.mk-imgs{display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:5px;margin:2px 0 7px}
.mk-imgs img,.mk-thumb img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;background:var(--card3);display:block}
.mk-typing{align-self:flex-start;background:var(--card);border:1px solid var(--border);border-radius:18px;padding:12px 14px;display:flex;gap:5px;align-items:center;color:var(--muted);font-size:12.5px}
.mk-typing span{width:7px;height:7px;border-radius:50%;background:var(--accent);animation:mkDot 1.2s infinite}
.mk-typing span:nth-child(2){animation-delay:.2s}.mk-typing span:nth-child(3){animation-delay:.4s}
@keyframes mkDot{0%,60%,100%{opacity:.25;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}
.mk-quick{display:flex;gap:6px;overflow-x:auto;padding:2px 0 8px;scrollbar-width:none}
.mk-quick::-webkit-scrollbar{display:none}
.mk-quick button{flex:0 0 auto;width:auto;margin:0;padding:7px 11px;border-radius:999px;background:var(--card2);border:1px solid var(--border-2);color:var(--text-2);font:500 12.5px Inter,sans-serif;cursor:pointer;white-space:nowrap}
.mk-compose{position:sticky;bottom:calc(74px + env(safe-area-inset-bottom));z-index:5;background:var(--bg-2);border:1px solid var(--border-2);border-radius:20px;padding:8px;margin-top:6px;box-shadow:0 -6px 24px rgba(0,0,0,.18)}
@media (min-width:1000px){body.ag-ui .mk-compose{bottom:12px}}
.mk-tools{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:6px}
.mk-tools button{width:auto;margin:0;display:inline-flex;align-items:center;gap:5px;padding:6px 9px;border-radius:11px;background:var(--card2);border:1px solid var(--border);color:var(--text-2);font:600 12px Inter,sans-serif;cursor:pointer}
.mk-tools .mk-sw{margin-left:auto}
.mk-tools .mk-sw.on{border-color:var(--accent);color:var(--accent)}
.mk-row{display:flex;gap:8px;align-items:flex-end}
.mk-row textarea{flex:1;margin:0;min-height:44px;max-height:160px;resize:none;font-size:15px;line-height:1.4;padding:11px 12px;border-radius:14px}
.mk-send{width:46px !important;height:46px;flex:0 0 46px;margin:0 !important;padding:0 !important;border-radius:14px;border:none;background:var(--pri-bg);color:var(--pri-fg);display:grid;place-items:center;cursor:pointer}
.mk-send:disabled{opacity:.45}
.mk-pend{display:flex;gap:6px;overflow-x:auto;padding:2px 0 8px}
.mk-pend div{position:relative;flex:0 0 58px;height:58px}
.mk-pend img{width:58px;height:58px;object-fit:cover;border-radius:10px}
.mk-pend button,.mk-thumb button{position:absolute;top:-5px;right:-5px;width:22px !important;height:22px;margin:0 !important;padding:0 !important;border-radius:50%;border:none;background:#000c;color:#fff;font-size:14px;line-height:22px;cursor:pointer}
.mk-pend small{position:absolute;left:3px;bottom:3px;font-size:9px;padding:1px 4px;border-radius:5px;background:#000a;color:#fff}
.mk-card{background:var(--card);border:1px solid var(--border);border-radius:20px;padding:14px;margin-bottom:14px}
.mk-card h3{margin:0 0 10px;font-size:15.5px;color:var(--text);display:flex;align-items:center;gap:8px}
.mk-card h3 .crm-count{margin-left:auto}
.mk-post{background:var(--card2);border:1px solid var(--border);border-radius:16px;padding:12px;margin:8px 0;color:var(--text)}
.mk-msg .mk-post{background:var(--card2);margin:8px -3px 4px}
.mk-post-h{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:12px;color:var(--muted);margin-bottom:6px}
.mk-post-h b{color:var(--text);font-size:13.5px;flex-basis:100%}
.mk-net{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;padding:3px 8px;border-radius:9px;background:var(--card3);color:var(--text)}
.mk-net i{width:8px;height:8px;border-radius:50%;display:inline-block}
.mk-st{font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:8px;background:var(--card3);color:var(--muted);text-transform:uppercase}
.mk-st.publie{color:var(--green)}.mk-st.annule{color:var(--red)}.mk-st.retard{color:var(--yellow)}
.mk-suivis{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 2px}
.mk-suivis button{width:auto;margin:0;padding:7px 11px;border-radius:14px;font:500 12.5px Inter,sans-serif;background:var(--card3,var(--card2));border:1px solid var(--border);color:var(--text);cursor:pointer;text-align:left}
.mk-avis{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;align-items:center}
.mk-avis button{width:auto;margin:0;padding:6px 10px;border-radius:10px;font:600 12px Inter,sans-serif;background:var(--card2);border:1px solid var(--border);color:var(--text-2);cursor:pointer;display:inline-flex;gap:5px;align-items:center}
.mk-avis span{font-size:12px;color:var(--green,#3ecf8e);font-weight:600}
.mk-cap{white-space:pre-wrap;font-size:13.5px;line-height:1.5;margin:6px 0}
.mk-hash{font-size:12.5px;color:var(--accent);margin:4px 0 2px;word-break:break-word}
.mk-btns{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.mk-btns button{flex:1 1 auto;width:auto;margin:0;padding:9px 10px;border-radius:12px;background:var(--card3);border:1px solid var(--border);color:var(--text);font:600 12.5px Inter,sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:5px}
.mk-btns button.main{background:var(--pri-bg);color:var(--pri-fg);border-color:transparent}
.mk-btns button.ok{color:var(--green)}
.mk-btns button:disabled{opacity:.5}
.mk-line{display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid var(--border)}
.mk-line:last-child{border-bottom:none}
.mk-line .d{flex:1;min-width:0}
.mk-line .d b{display:block;font-size:13.5px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mk-line .d span{font-size:12px;color:var(--muted)}
.mk-line > button{width:auto;margin:0;flex:0 0 auto;padding:8px 11px;border-radius:11px;background:var(--card3);border:1px solid var(--border);color:var(--text);font:600 12px Inter,sans-serif;cursor:pointer}
.mk-day{margin-bottom:12px}
.mk-day-h{display:flex;justify-content:space-between;align-items:center;font-size:12.5px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin:0 4px 6px}
.mk-day-h button{width:auto;margin:0;padding:3px 8px;border-radius:9px;background:none;border:1px solid var(--border-2);color:var(--text-2);font:600 11.5px Inter,sans-serif;cursor:pointer;text-transform:none;letter-spacing:0}
.mk-day.today .mk-day-h{color:var(--accent)}
.mk-slot{display:flex;align-items:center;gap:10px;background:var(--card);border:1px solid var(--border);border-radius:14px;padding:9px 10px;margin-bottom:6px;cursor:pointer}
.mk-slot .h{font-size:12.5px;font-weight:700;color:var(--text);min-width:42px}
.mk-slot .d{flex:1;min-width:0}
.mk-slot .d b{display:block;font-size:13px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mk-slot .d span{font-size:11.5px;color:var(--muted)}
.mk-slot .mv{display:flex;gap:2px}
.mk-slot .mv button{width:28px;height:28px;margin:0;padding:0;border-radius:8px;background:var(--card3);border:none;color:var(--text-2);font-size:15px;cursor:pointer}
.mk-slot.publie{opacity:.7}.mk-slot.annule{opacity:.45}
.mk-empty-day{font-size:12.5px;color:var(--muted);padding:9px 12px;border:1px dashed var(--border-2);border-radius:14px}
.mk-table{width:100%;border-collapse:collapse;font-size:12px;color:var(--text)}
.mk-ib{display:inline-flex !important;align-items:center;justify-content:center;gap:6px}
.mk-ib .ag-i{display:inline-block}
.mk-table th{font-weight:600;color:var(--muted);text-align:right;padding:6px 4px;border-bottom:1px solid var(--border-2);white-space:nowrap}
.mk-table th:first-child,.mk-table td:first-child{text-align:left}
.mk-table td{text-align:right;padding:8px 4px;border-bottom:1px solid var(--border)}
.mk-table tr.best td{color:var(--accent);font-weight:700}
.mk-scroll{overflow-x:auto;margin:0 -4px;padding:0 4px}
.mk-bar{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--text);margin:7px 0}
.mk-bar span{flex:0 0 38%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mk-bar div{flex:1;height:8px;background:var(--card3);border-radius:6px;overflow:hidden}
.mk-bar div i{display:block;height:100%;background:var(--accent);border-radius:6px}
.mk-bar b{flex:0 0 30px;text-align:right}
.mk-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.mk-stats label{margin:0;font-size:12px}
.mk-stats input{margin:3px 0 0}
.mk-stats input.mk-ai{border-color:var(--accent);box-shadow:0 0 0 2px rgba(72,168,154,.2)}
.mk-mini{display:flex;flex-wrap:wrap;gap:10px;font-size:12px;color:var(--muted);margin-top:4px}
.mk-mini b{color:var(--text)}
.mk-mem-g{margin-bottom:14px}
.mk-mem-g h4{margin:0 2px 6px;font-size:12.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
.mk-mem{display:flex;gap:8px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--border);font-size:13.5px;color:var(--text);line-height:1.45}
.mk-mem:last-child{border-bottom:none}
.mk-mem p{flex:1;margin:0}
.mk-mem small{display:block;color:var(--muted);font-size:11px;margin-top:2px}
.mk-gauge{height:9px;background:var(--card3);border-radius:6px;overflow:hidden;margin:8px 0 4px}
.mk-gauge i{display:block;height:100%;background:var(--accent);border-radius:6px}
.mk-gauge.warn i{background:var(--yellow)}
.mk-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
@media (min-width:640px){.mk-grid{grid-template-columns:repeat(5,1fr)}}
.mk-tile{position:relative;border-radius:12px;overflow:hidden;cursor:pointer;background:var(--card3)}
.mk-tile img{width:100%;aspect-ratio:1;object-fit:cover;display:block}
.mk-tile small{position:absolute;left:4px;bottom:4px;font-size:9.5px;padding:1px 5px;border-radius:6px;background:#000a;color:#fff}
.mk-tile.sel{outline:3px solid var(--accent);outline-offset:-3px}
.mk-tile .mk-chk{position:absolute;top:5px;right:5px;width:22px;height:22px;border-radius:50%;background:#000a;border:2px solid #fff;display:grid;place-items:center;color:#fff}
.mk-tile.sel .mk-chk{background:var(--accent);border-color:var(--accent)}
.mk-thumbs{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}
.mk-thumb{position:relative;width:64px}
.mk-pick{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;max-height:52vh;overflow-y:auto;margin-top:8px}
.mk-pick .mk-tile img{aspect-ratio:1}
.mk-gl{display:flex;align-items:center;gap:10px;padding:11px 2px;border-bottom:1px solid var(--border);cursor:pointer;color:var(--text);font-size:14px}
.mk-gl span{color:var(--muted);font-size:12px;margin-left:auto}
.mk-intro{font-size:13px;color:var(--muted);line-height:1.5;margin:0 2px 12px}
.mk-err{color:var(--red);font-size:13px;margin-top:8px}
.mk-src{font-size:11.5px;color:var(--muted);margin-top:6px}
.mk-studio-card{border-color:var(--accent)}
.mk-plan-prev .mk-post{position:relative;padding-left:40px}
.mk-plan-prev .mk-post input[type=checkbox]{position:absolute;left:12px;top:14px;width:18px;height:18px;margin:0;accent-color:var(--accent)}
`;
  document.head.appendChild(st);
})();

// ============================================================
// DONNEES
// ============================================================
async function mkLoad(force){
  if(MK.loaded && !force && Date.now() - MK.loadedAt < 60000) return;
  try {
    const [m, mem, p, med, t, pr] = await Promise.all([
      sb.from('mk_messages').select('*').order('created_at', { ascending: false }).limit(200),
      sb.from('mk_memory').select('*').order('created_at', { ascending: true }),
      sb.from('mk_posts').select('*').order('date', { ascending: true }),
      sb.from('mk_media').select('*').order('created_at', { ascending: false }),
      sb.from('tarifs').select('*').order('position', { ascending: true }),
      sb.from('promos').select('*').order('created_at', { ascending: false })
    ]);
    MK.msgs = ((m && m.data) || []).slice().sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)) || (a.id - b.id));
    MK.mem = (mem && mem.data) || []; MK.posts = (p && p.data) || []; MK.media = (med && med.data) || [];
    MK.tarifs = (t && t.data) || []; MK.promos = (pr && pr.data) || [];
  } catch(e){ console.warn('marketing load', e); }
  // Nom de la marque (page tarifs), si prix.js ne l'a pas deja charge
  if(!(typeof PX !== 'undefined' && PX.page)){
    try { const { data } = await sb.from('tarif_page').select('marque').maybeSingle(); MK.marquePage = (data && data.marque) || null; } catch(e){}
  }
  if(typeof window.stChargerMarque === 'function') try { await window.stChargerMarque(); } catch(e){}
  MK.loaded = true; MK.loadedAt = Date.now();
  mkLoadAvis();
}
async function mkLoadAvis(){
  try {
    if(typeof galAvis !== 'undefined' && Array.isArray(galAvis) && galAvis.length){ MK.avis = galAvis; return; }
    if(typeof galApi !== 'function') return;
    if(typeof galPwd !== 'undefined' && !galPwd && typeof getGaleriePwd === 'function') galPwd = await getGaleriePwd();
    if(typeof galPwd === 'undefined' || !galPwd) return;
    const a = await galApi('/api/admin/avis');
    MK.avis = Array.isArray(a) ? a : [];
  } catch(e){}
}
function mkSortPosts(){ MK.posts.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.heure || '').localeCompare(String(b.heure || ''))); }

// ---------- Images : URL signees (bucket prive) ----------
async function mkSign(paths){
  const now = Date.now();
  const need = [...new Set(paths.filter(p => p && !(MK.signed[p] && MK.signed[p].exp > now)))];
  if(need.length){
    try {
      const { data } = await sb.storage.from('marketing').createSignedUrls(need, 3600);
      (data || []).forEach(x => { if(x && x.signedUrl) MK.signed[x.path] = { url: x.signedUrl, exp: now + 50 * 60000 }; });
    } catch(e){ console.warn('signed urls', e); }
  }
  return paths.map(p => (MK.signed[p] || {}).url || '');
}
function mkImgSrc(im){ if(!im) return ''; if(im.path) return (MK.signed[im.path] || {}).url || ''; return im.thumb || im.url || ''; }
function mkImgTag(im, extra){
  const src = mkImgSrc(im);
  return `<img ${im && im.path ? `data-mkp="${agEsc(im.path)}"` : ''} src="${agEsc(src)}" loading="lazy" alt="" ${extra || ''}>`;
}
async function mkHydrate(root){
  root = root || document;
  const imgs = [...root.querySelectorAll('img[data-mkp]')];
  if(!imgs.length) return;
  const paths = imgs.map(i => i.dataset.mkp);
  const urls = await mkSign(paths);
  imgs.forEach((i, k) => { if(urls[k] && i.getAttribute('src') !== urls[k]) i.src = urls[k]; });
}

// ---------- Images : reduire, envoyer, lire ----------
function mkShrink(blob, max, q){
  max = max || 1280; q = q || 0.8;
  return new Promise((ok, ko) => {
    const url = URL.createObjectURL(blob), img = new Image();
    img.onload = () => {
      const r = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * r)); c.height = Math.max(1, Math.round(img.height * r));
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => {
        if(!b) return ko(new Error('Image illisible'));
        if(b.size > 320000 && q > 0.62) c.toBlob(b2 => ok(b2 || b), 'image/jpeg', q - 0.12);
        else ok(b);
      }, 'image/jpeg', q);
    };
    img.onerror = () => { URL.revokeObjectURL(url); ko(new Error('Image illisible')); };
    img.src = url;
  });
}
function mkB64(blob){ return new Promise((ok, ko) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(',')[1]); fr.onerror = ko; fr.readAsDataURL(blob); }); }
async function mkUrlBlob(url){
  try { const r = await fetch(url, { mode: 'cors' }); if(!r.ok) throw new Error('http ' + r.status); return await r.blob(); }
  catch(e){
    return await new Promise((ok, ko) => {
      const i = new Image(); i.crossOrigin = 'anonymous';
      i.onload = () => { try { const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; c.getContext('2d').drawImage(i, 0, 0); c.toBlob(b => b ? ok(b) : ko(new Error('lecture')), 'image/jpeg', 0.85); } catch(er){ ko(er); } };
      i.onerror = () => ko(new Error('lecture')); i.src = url;
    });
  }
}
async function mkUrlB64(url){ const b = await mkUrlBlob(url); return mkB64(await mkShrink(b, 1024, 0.8)); }
async function mkImgB64(im){
  if(im.path){ const [u] = await mkSign([im.path]); return mkUrlB64(u); }
  return mkUrlB64(im.url || im.thumb);
}
// Envoie les photos en attente : fichiers -> bucket + mk_media ; galerie/moodboard -> on garde juste l'URL
async function mkStore(items, forAI){
  const images = [], b64 = [], media = []; let fails = 0, aiFails = 0;
  const uid = await mkUid();
  for(const it of items){
    try {
      if(it.file){
        if(!uid) throw new Error('Pas connecté');
        const blob = await mkShrink(it.file, 1280, 0.8);
        const path = `${uid}/${Date.now()}-${mkRand()}.jpg`;
        const { error } = await sb.storage.from('marketing').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
        if(error) throw new Error(error.message || 'envoi');
        const { data: m } = await sb.from('mk_media').insert({ path, size: blob.size, source: it.src || 'telephone' }).select().single();
        if(m){ MK.media.unshift(m); media.push(m); }
        MK.signed[path] = { url: URL.createObjectURL(blob), exp: Date.now() + 50 * 60000 };
        images.push({ path, media_id: m ? m.id : null });
        if(forAI) b64.push(await mkB64(blob.size > 260000 ? await mkShrink(blob, 1024, 0.78) : blob));
      } else if(it.url){
        images.push({ url: it.url, thumb: it.thumb || null, src: it.src });
        if(forAI){ try { b64.push(await mkUrlB64(it.url)); } catch(e){ aiFails++; } }
      }
    } catch(e){ console.warn('photo', e); fails++; }
  }
  if(fails) agToast(`${fails} photo(s) non envoyée(s)`, 'error');
  if(aiFails) agToast(`${aiFails} photo(s) de la galerie n'ont pas pu être lues par l'IA`, 'error');
  return { images, b64, media };
}

// ============================================================
// IA
// ============================================================
function mkAiCfg(){ let c = null; try { c = JSON.parse(localStorage.getItem('aiConfig')); } catch(e){} return c; }
function mkAiError(status, msg){
  const m = String(msg || '');
  if(status === 429 || /quota|RESOURCE_EXHAUSTED|rate.?limit|too many requests/i.test(m))
    return new Error("Tu as atteint la limite de l'IA pour le moment (quota dépassé). Attends quelques minutes, ou demain pour la version gratuite, puis réessaie.");
  if(status === 401 || status === 403 || /api key|api_key|invalid.*key|permission|unauthori[sz]ed/i.test(m))
    return new Error("Ta clé IA est refusée. Vérifie-la dans l'onglet Coach IA.");
  if(status === 503 || status === 529 || /overloaded|unavailable/i.test(m))
    return new Error("L'IA est surchargée en ce moment. Réessaie dans une minute.");
  if(/Failed to fetch|NetworkError|network|aborted|timeout/i.test(m))
    return new Error("Pas de réponse de l'IA. Vérifie ta connexion internet et réessaie.");
  return new Error("L'IA n'a pas pu répondre : " + (m.slice(0, 160) || 'erreur ' + status));
}
async function mkFetchJson(url, opts){
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 120000);
  let r;
  try { r = await fetch(url, { ...opts, signal: ctl.signal }); }
  catch(e){ clearTimeout(to); throw mkAiError(0, e.name === 'AbortError' ? 'timeout' : (e.message || 'network')); }
  clearTimeout(to);
  let j = {}; try { j = await r.json(); } catch(e){}
  if(!r.ok || j.error){ const e = mkAiError(r.status, (j.error && (j.error.message || j.error.status)) || j.message || ''); e.status = r.status; throw e; }
  return j;
}
// Fusionne les messages qui se suivent avec le meme role (Anthropic/Gemini l'exigent)
function mkTurns(messages){
  const out = [];
  (messages || []).forEach(m => {
    const role = m.role === 'user' ? 'user' : 'assistant';
    const text = String(m.text || '').trim() || '(photo)';
    if(out.length && out[out.length - 1].role === role) out[out.length - 1].text += '\n\n' + text;
    else out.push({ role, text });
  });
  while(out.length && out[0].role !== 'user') out.shift();
  if(!out.length) out.push({ role: 'user', text: 'Bonjour' });
  return out;
}
// mkAI({system, messages:[{role:'user'|'agent', text}], images:[base64 jpeg], recherche, maxTokens}) -> {text, sources}
async function mkAI(o){
  // Relais automatique entre les IA (ia.js) : meme entree, meme sortie {text, sources}
  if(typeof window.iaRelais === 'function'){
    const imgs = (o.images || []).slice(0, 8);
    const r = await window.iaRelais({ system: o.system || '', messages: mkTurns(o.messages || [{ role: 'user', text: o.prompt || '' }]),
      images: imgs.map(d => ({ mime: 'image/jpeg', data: d })), recherche: !!o.recherche, maxTokens: o.maxTokens || 2500, tache: imgs.length ? 'images' : 'texte' });
    return { text: r.text, sources: r.sources || [], fournisseur: r.fournisseur, modele: r.modele };
  }
  const cfg = mkAiCfg();
  if(!cfg || !cfg.key) throw new Error("Configure d'abord ta clé IA dans l'onglet Coach IA.");
  const turns = mkTurns(o.messages || [{ role: 'user', text: o.prompt || '' }]);
  const imgs = (o.images || []).slice(0, 8);
  const sys = o.system || '';
  const maxT = o.maxTokens || 2500;
  if(cfg.provider === 'gemini'){
    const contents = turns.map((t, i) => ({
      role: t.role === 'user' ? 'user' : 'model',
      parts: [...(i === turns.length - 1 ? imgs.map(d => ({ inline_data: { mime_type: 'image/jpeg', data: d } })) : []), { text: t.text }]
    }));
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODELS.gemini}:generateContent?key=${encodeURIComponent(cfg.key)}`;
    const body = s => JSON.stringify({ ...(sys ? { system_instruction: { parts: [{ text: sys }] } } : {}), contents,
      ...(s ? { tools: [{ google_search: {} }] } : {}), generationConfig: { temperature: 0.8, maxOutputTokens: maxT } });
    let j;
    if(o.recherche){
      try { j = await mkFetchJson(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body(true) }); }
      catch(e){ if(e.status === 429 || e.status === 401 || e.status === 403) throw e; j = null; }
    }
    if(!j) j = await mkFetchJson(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body(false) });
    const cand = (j.candidates || [])[0] || {};
    const text = ((cand.content || {}).parts || []).map(p => p.text || '').join('');
    if(!text.trim()) throw new Error(cand.finishReason === 'SAFETY' ? "L'IA n'a pas voulu répondre à ça. Reformule ta demande." : "L'IA a renvoyé une réponse vide. Réessaie.");
    const gm = cand.groundingMetadata || {};
    const sources = (gm.groundingChunks || []).map(c => c.web).filter(w => w && w.uri).slice(0, 4).map(w => ({ title: w.title || 'source', uri: w.uri }));
    return { text, sources };
  }
  if(cfg.provider === 'anthropic'){
    const msgs = turns.map((t, i) => ({ role: t.role, content: i === turns.length - 1 && imgs.length
      ? [...imgs.map(d => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: d } })), { type: 'text', text: t.text }] : t.text }));
    const j = await mkFetchJson('https://api.anthropic.com/v1/messages', { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': cfg.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: AI_MODELS.anthropic, max_tokens: maxT, system: sys || undefined, messages: msgs }) });
    const text = (j.content || []).map(c => c.text || '').join('');
    if(!text.trim()) throw new Error("L'IA a renvoyé une réponse vide. Réessaie.");
    return { text, sources: [] };
  }
  const url = cfg.provider === 'custom' && cfg.url ? cfg.url : 'https://api.openai.com/v1/chat/completions';
  const msgs = [...(sys ? [{ role: 'system', content: sys }] : []), ...turns.map((t, i) => ({ role: t.role, content: i === turns.length - 1 && imgs.length
    ? [...imgs.map(d => ({ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + d } })), { type: 'text', text: t.text }] : t.text }))];
  const j = await mkFetchJson(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.key}` },
    body: JSON.stringify({ model: AI_MODELS.openai, messages: msgs, temperature: 0.8, max_tokens: maxT }) });
  const text = ((j.choices || [])[0] || {}).message?.content || '';
  if(!String(text).trim()) throw new Error("L'IA a renvoyé une réponse vide. Réessaie.");
  return { text, sources: [] };
}

// ---------- Contexte (court) ----------
function mkFetesTxt(){
  try { if(typeof crmFetes === 'function') return crmFetes().filter(f => f.j <= 45).slice(0, 3).map(f => `${f.n} dans ${f.j} j`).join(', '); } catch(e){}
  return '';
}
function mkContext(){
  const L = [], today = mkDay(), now = Date.now();
  const days = []; for(let i = 0; i < 7; i++){ const d = mkAddDays(today, i); days.push(`${mkDateTxt(d, { weekday: 'long' })} ${d}`); }
  L.push(`Aujourd'hui : ${days[0]}. Les 7 jours : ${days.join(', ')}.`);
  const f = mkFetesTxt(); if(f) L.push(`Fêtes à venir : ${f}.`);
  // Profil
  if(MK.mem.length){
    L.push('\nCE QUE TU SAIS DE HENZO :');
    Object.keys(MK_MEM).forEach(k => { const it = MK.mem.filter(m => (m.kind || 'profil') === k).slice(-12); if(it.length) L.push(`- ${k} : ${it.map(m => m.text).join(' | ')}`); });
    const other = MK.mem.filter(m => !MK_MEM[m.kind || 'profil']).slice(-8); if(other.length) L.push(`- autre : ${other.map(m => m.text).join(' | ')}`);
  } else L.push("\nTu ne sais encore presque rien de Henzo : pose-lui des questions utiles, une ou deux à la fois.");
  // Seances
  const all = (typeof shoots !== 'undefined' ? shoots : []).filter(s => s.date && !mkCancelled(s));
  const recent = all.filter(s => { const t = new Date(s.date).getTime(); return t >= now - 60 * mkDayMs && t <= now; }).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 15);
  const up = all.filter(s => new Date(s.date).getTime() > now).sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(0, 8);
  const line = s => { const c = mkClient(s.client_id); const pub = MK.posts.some(p => p.shoot_id === s.id && p.status === 'publie'); const plan = MK.posts.some(p => p.shoot_id === s.id && p.status === 'prevu');
    return `- n°${s.id} ${mkDay(s.date)} ${s.type || 'Séance'}${c ? ' (' + mkFirst(c) + ')' : ''}, ${s.collab ? 'séance collaboration (portfolio, sans prix)' : s.payment === 'paye' ? 'payée' : 'pas encore payée'}${s.price ? ', ' + Math.round(s.price) + ' F' : ''}, ${pub ? 'déjà publiée' : plan ? 'publication prévue' : 'pas encore publiée'}`; };
  L.push(`\nSÉANCES DES 60 DERNIERS JOURS (${recent.length}) :`); recent.forEach(s => L.push(line(s)));
  if(up.length){ L.push('SÉANCES À VENIR :'); up.forEach(s => L.push(line(s))); }
  // Clients (sans l'equipe : modeles, maquilleuses...)
  const cl = (typeof clients !== 'undefined' ? clients : []).filter(c => (typeof estClient !== 'function' || estClient(c)));
  const src = {}; cl.forEach(c => { const k = c.source || (c.parrain_id ? 'parrainage' : 'inconnue'); src[k] = (src[k] || 0) + 1; });
  L.push(`\nCLIENTS : ${cl.length} au total. D'où ils viennent : ${Object.entries(src).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ') || 'pas noté'}.`);
  // Avis
  const av = (MK.avis || []).slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 4);
  if(av.length){ L.push('AVIS RÉCENTS : ' + av.map(a => `${a.note}/5${a.texte ? ' "' + String(a.texte).slice(0, 90) + '"' : ''}${a.publiable ? ' (partageable)' : ''}`).join(' ; ')); }
  // Tarifs, promos
  const ta = MK.tarifs.filter(t => t.active !== false && t.kind !== 'option').slice(0, 8);
  if(ta.length) L.push('TARIFS : ' + ta.map(t => `${t.name} ${Math.round(t.price || 0)} F`).join(', ') + '.');
  const pr = MK.promos.filter(p => p.status !== 'arrete' && (!p.valid_until || p.valid_until >= today));
  if(pr.length) L.push('PROMOS ACTIVES : ' + pr.slice(0, 4).map(p => `${p.title || 'Promo'} (${p.kind === 'percent' ? p.value + ' %' : Math.round(p.value) + ' F'}, code ${p.code}${p.valid_until ? ", jusqu'au " + p.valid_until : ''})`).join(' ; ') + '.');
  // Publications
  const pub = MK.posts.filter(p => p.status === 'publie').sort((a, b) => String(b.published_at || b.date).localeCompare(String(a.published_at || a.date))).slice(0, 10);
  if(pub.length){ L.push('\nPUBLICATIONS RÉCENTES :'); pub.forEach(p => { const s = p.stats || {};
    L.push(`- ${p.date} ${p.heure || ''} ${p.network} ${p.kind || ''} "${(p.title || '').slice(0, 50)}" : ${mkHasStats(p) && !s.ignore ? MK_STATS.filter(([k]) => s[k] != null).map(([k]) => `${k} ${s[k]}`).join(', ') : 'chiffres pas encore donnés'}`); }); }
  const plan = MK.posts.filter(p => p.status === 'prevu' && p.date >= today && p.date <= mkAddDays(today, 7));
  if(plan.length) L.push('DÉJÀ PRÉVU : ' + plan.map(p => `${p.date} ${p.heure || ''} ${p.network} "${(p.title || '').slice(0, 40)}"`).join(' ; '));
  return L.join('\n');
}
// Nom de la marque : kit "Ma marque", sinon page tarifs (tarif_page.marque), sinon "Henzo Photographie"
function mkMarque(){
  const k = window.ST_MARQUE && window.ST_MARQUE.nom;
  const p = (typeof PX !== 'undefined' && PX.page && PX.page.marque) || MK.marquePage;
  const n = String(k || p || '').trim() || 'Henzo Photographie';
  return /^henzo\s*studio$/i.test(n) ? 'Henzo Photographie' : n;
}
function mkMarqueCtx(){
  const m = window.ST_MARQUE; if(!m) return '';
  const L = [];
  if(m.slogan) L.push(`Slogan : "${m.slogan}".`);
  if((m.tons || []).length) L.push(`Ton des textes : ${m.tons.join(', ')}.`);
  if(m.emojis) L.push(`Emojis : ${m.emojis}.`);
  if((m.style || []).length) L.push(`Son style d'écriture : ${m.style.slice(0, 8).join(' ; ')}.`);
  return L.length ? '\nSA MARQUE : ' + L.join(' ') : '';
}
function mkSystem(){
  const marque = mkMarque();
  return `Tu es l'agent marketing personnel de Henzo (KONAN Cédric), photographe et vidéaste. Sa marque s'appelle "${marque}" (écris toujours ce nom exact, jamais un autre nom de studio). Son studio est au quartier Ahougnansou à Bouaké (Côte d'Ivoire), en face du restaurant Le Rosier. Ton but : l'aider à avoir plus de clients à Bouaké et dans toute la Côte d'Ivoire, et à se faire un nom.${mkMarqueCtx()}

TU ES UN EXPERT du marketing pour photographes et tu connais bien le marché ivoirien :
- Facebook est très fort : page pro, groupes de quartier et de Bouaké, groupes de mamans, de mariages, de ventes. Les gens commentent et écrivent en privé.
- Statut WhatsApp : très vu par les contacts et anciens clients, idéal chaque jour (coulisses, avant/après, places libres, avis).
- Bouche à oreille et parrainage : les clients contents ramènent des clients.
- Instagram (portfolio, Reels), TikTok (coulisses, avant/après, tendances, sons du moment), fiche Google Maps (avis, photos, horaires, pour être trouvé).
- Les moments qui comptent : mariages, dots, baptêmes, anniversaires d'enfants, grossesse, remises de diplômes, fête des mères, Saint-Valentin, Pâques, Tabaski, Korité, 7 août, rentrée (portraits, photos d'identité), période des fêtes de fin d'année.

COMMENT TU RÉPONDS :
- Conseils PRÉCIS et faisables tout de suite : quoi publier, sur quel réseau, quel jour et à quelle heure, le texte prêt à copier, les hashtags (locaux comme #Bouaké #CôteDIvoire #PhotographeBouaké, et du métier).
- Honnête et direct. Tu pousses Henzo à agir, sans le flatter. Si une photo n'est pas assez bonne pour être publiée, dis-le et explique pourquoi.
- Textes à publier : ton pro et chaleureux, avec une touche ivoirienne quand ça colle (sans exagérer), et toujours un appel à l'action clair (écrire sur WhatsApp, réserver).
- Français simple, phrases courtes, réponses claires. Pas de mots techniques ou anglais (pas de "engagement", "reach", "CTA", "feed", "insights", "algorithme"...) : dis "les gens qui réagissent", "les gens qui voient", "l'appel à réserver". Va à l'essentiel.
- N'utilise jamais de tiret long. Seulement le tiret simple "-".
- MISE EN FORME DES LÉGENDES : écris en lettres normales, jamais de lettres spéciales, de gras ou d'italique (l'app fait la mise en forme, toujours la même : 1re ligne = titre en gras, personnes créditées et copyright en lettres fines). La 1re ligne d'une légende est un titre court. Les personnes ou pages à créditer : "Maquillage : [[Nom]]" (crochets doubles). N'ajoute jamais de ligne ©, l'app la met.
- Ce que Henzo a VALIDÉ ou AIMÉ (dans le contexte, "preference") est la règle : reprends ces choix, ne propose pas autre chose sauf s'il le demande.
- Tu ne peux PAS publier à la place de Henzo (ni Facebook, ni WhatsApp, ni ailleurs) et tu ne vois pas ses pages. Ne dis jamais "je publie" ni "publie dès maintenant" comme si c'était fait. Donne le texte et dis : "Voici ton texte, touche Copier puis publie."
- Quand il y a plusieurs photos, c'est TOI qui décides laquelle mettre en premier et dans quel ordre, et tu expliques pourquoi en une phrase (sourire, regard, lumière, netteté). Ne demande jamais "laquelle tu préfères ?".
- Tu n'inventes pas de chiffres sur ses résultats : utilise le contexte ci-dessous.
- Pour apprendre à le connaître : au maximum 1 ou 2 questions par réponse, à la fin, seulement si c'est utile.

BLOCS SPÉCIAUX (à la toute fin de ta réponse). Format exact : trois accents graves suivis du nom du bloc, le JSON sur la ligne suivante, puis trois accents graves. Jamais de crochets autour ("[post {...}]" est interdit), jamais de JSON au milieu du texte.
1) Si tu apprends un fait NOUVEAU et durable sur Henzo, ajoute :
\`\`\`memo
[{"kind":"style","text":"phrase courte"}]
\`\`\`
kind parmi : profil, style, prix, clients, difficulte, objectif, resultat, preference. Pas de bloc memo si rien de nouveau. Ne répète pas ce qui est déjà su.
2) Quand tu proposes une publication concrète, ajoute un bloc par publication :
\`\`\`post
{"network":"Facebook","kind":"Séance client","date":"AAAA-MM-JJ","heure":"19:00","title":"titre court","caption":"texte prêt à publier","hashtags":"#Bouaké ...","shoot_id":null,"photos":[1]}
\`\`\`
network parmi : ${MK_NETS.join(', ')}. kind parmi : ${MK_KINDS.join(', ')}. shoot_id = numéro de la séance liée ou null. photos = numéros des photos jointes à mon dernier message à utiliser, dans l'ordre que tu conseilles (sinon []). Ne recopie pas la légende au-dessus du bloc.
3) Quand Henzo veut publier une séance précise (ex : "publier le shooting de Destinée"), ajoute :
\`\`\`studio
{"shoot_id":30,"nom":"Destinée"}
\`\`\`
L'app lui proposera d'ouvrir le studio de publication (photos de la galerie, textes pour chaque réseau, image avec titre, plan de diffusion). shoot_id = numéro de la séance si tu le connais, sinon null.
4) À la fin de chaque réponse, propose 2 ou 3 suites que Henzo pourrait te demander ensuite, écrites comme s'il parlait (courtes, moins de 70 caractères), adaptées à ce qu'il aime, à ce qu'il a validé et à sa situation :
\`\`\`suivi
["Fais-moi l'affiche promo de la fête des mères","Quel jour publier la séance de Destinée ?"]
\`\`\`

CONTEXTE :
${mkContext()}`;
}
// Historique court : les 20 derniers messages, blocs remplaces par un resume
function mkHistory(list){
  return (list || MK.msgs).slice(-20).map(m => {
    const P = mkParse(m.text);
    return { role: m.role,
      text: P.clean + P.posts.map(p => `\n(publication proposée : ${p.title || ''}, ${p.network || ''}, ${p.date || ''})`).join('')
        + P.studios.map(x => `\n(studio de publication proposé pour ${x.nom || 'la séance'})`).join('')
        + ((m.images || []).length ? `\n(${m.images.length} photo(s) jointe(s))` : '') };
  });
}

// ---------- Blocs memo / post / studio ----------
// L'IA ne respecte pas toujours le format : on reconnait toutes les variantes
//   ```post {...}```, ```json {...}```, [post {...}], post {...}, {"network":...} seul,
//   pareil pour memo et studio, plusieurs blocs, JSON mal ferme (petite reparation).
// Ces blocs sont TOUJOURS retires du texte affiche.
const MK_BLOCKS = ['post', 'memo', 'studio', 'suivi'];
function mkKindOf(j){
  const one = Array.isArray(j) ? j[0] : j;
  if(!one || typeof one !== 'object') return null;
  if(['network', 'caption', 'reseau', 'legende'].some(k => k in one)) return 'post';
  if('studio' in one || ('shoot_id' in one && 'nom' in one)) return 'studio';
  if('text' in one && 'kind' in one) return 'memo';
  return null;
}
function mkGuessKind(raw){
  const s = String(raw || '');
  if(/"(network|caption|reseau|legende)"\s*:/.test(s)) return 'post';
  if(/"studio"\s*:/.test(s)) return 'studio';
  if(/"kind"\s*:/.test(s) && /"text"\s*:/.test(s)) return 'memo';
  return null;
}
// Fin d'une valeur JSON qui commence a i (en tenant compte des chaines). -1 si pas fermee.
function mkJsonEnd(s, i){
  let depth = 0, inS = false, esc = false;
  for(let k = i; k < s.length; k++){
    const ch = s[k];
    if(inS){ if(esc) esc = false; else if(ch === '\\') esc = true; else if(ch === '"') inS = false; continue; }
    if(ch === '"') inS = true;
    else if(ch === '{' || ch === '[') depth++;
    else if(ch === '}' || ch === ']'){ depth--; if(depth <= 0) return k + 1; }
  }
  return -1;
}
// JSON.parse, puis petite reparation (guillemets courbes, virgules en trop, accolades pas fermees)
function mkRepair(raw){
  let t = String(raw || '').trim();
  if(!t) return undefined;
  try { return JSON.parse(t); } catch(e){}
  t = t.replace(/[“”]/g, '"').replace(/,\s*([}\]])/g, '$1');
  try { return JSON.parse(t); } catch(e){}
  const stack = []; let inS = false, esc = false;
  for(const ch of t){
    if(inS){ if(esc) esc = false; else if(ch === '\\') esc = true; else if(ch === '"') inS = false; continue; }
    if(ch === '"') inS = true;
    else if(ch === '{' || ch === '[') stack.push(ch === '{' ? '}' : ']');
    else if(ch === '}' || ch === ']') stack.pop();
  }
  let u = t + (inS ? '"' : '');
  u = u.replace(/,\s*$/, '').replace(/,?\s*"[^"]*"\s*:\s*$/, '') + stack.reverse().join('');
  try { return JSON.parse(u.replace(/,\s*([}\]])/g, '$1')); } catch(e){}
  return undefined;
}
function mkParse(text){
  const posts = [], memos = [], studios = [], suivis = [];
  const take = (kind, j) => {
    if(kind === 'suivi'){ (Array.isArray(j) ? j : (j && j.questions) || []).forEach(q => { if(typeof q === 'string' && q.trim()) suivis.push(mkClean(q.trim()).slice(0, 120)); }); return; }
    if(j == null || typeof j !== 'object') return;
    (Array.isArray(j) ? j : [j]).forEach(x => {
      if(!x || typeof x !== 'object') return;
      if(kind === 'memo'){ if(x.text) memos.push(x); }
      else if(kind === 'post') posts.push(x);
      else if(kind === 'studio') studios.push(x);
    });
  };
  let s = String(text || '');
  // 1. Blocs entre ``` (post, memo, studio, json, ou sans nom)
  s = s.replace(/```[ \t]*([a-zA-Z]*)[ \t]*\n?([\s\S]*?)(?:```|$)/g, (all, lang, body) => {
    lang = String(lang || '').toLowerCase();
    const b = body.trim();
    if(MK_BLOCKS.includes(lang)){ take(lang, mkRepair(b)); return '\n'; }
    if(lang && lang !== 'json') return all;
    const lab = b.match(/^\[?\s*(post|memo|studio)\s*:?\s*([\[{][\s\S]*?)\]?$/i);
    if(lab){ take(lab[1].toLowerCase(), mkRepair(lab[2])); return '\n'; }
    if(!/^[\[{]/.test(b)) return all;
    const j = mkRepair(b), k = j !== undefined ? mkKindOf(j) : mkGuessKind(b);
    if(k){ take(k, j); return '\n'; }
    return all;
  });
  // 2. Variantes dans le texte : [post {...}], post {...}, {"network":...} seul
  let out = '', pos = 0;
  const re = /(\[[ \t]*)?\b(post|memo|studio)\b[ \t]*:?[ \t]*(?=[\[{])|\{\s*"|\[\s*\{\s*"/gi;
  while(pos < s.length){
    re.lastIndex = pos;
    const m = re.exec(s);
    if(!m){ out += s.slice(pos); break; }
    const start = m.index, label = m[2] ? m[2].toLowerCase() : null, jStart = label ? start + m[0].length : start;
    let end = mkJsonEnd(s, jStart);
    if(end < 0){ const para = s.indexOf('\n\n', jStart); end = para < 0 ? s.length : para; }
    const raw = s.slice(jStart, end);
    const j = mkRepair(raw);
    const kind = label || (j !== undefined ? mkKindOf(j) : mkGuessKind(raw));
    if(!kind){ out += s.slice(pos, start + 1); pos = start + 1; continue; }
    let after = end;
    if(m[1]){ const mm = /^[ \t]*\]/.exec(s.slice(after)); if(mm) after += mm[0].length; }
    take(kind, j);
    out += s.slice(pos, start);
    pos = after;
  }
  const clean = out.replace(/([^\s])[ \t]{2,}(?=[^\s])/g, '$1 ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return { clean, posts, memos, studios, suivis: suivis.slice(0, 3) };
}
function mkPostBlock(p){ return '```post\n' + JSON.stringify(p) + '\n```'; }
function mkStudioBlock(x){ return '```studio\n' + JSON.stringify(x) + '\n```'; }
// Remet un message au format propre : texte, puis les blocs
function mkBuild(clean, posts, studios){
  return [String(clean || '').trim(), ...(posts || []).map(mkPostBlock), ...(studios || []).map(mkStudioBlock)].filter(Boolean).join('\n\n');
}
function mkSim(a, b){
  const A = new Set(mkNorm(a).split(' ').filter(w => w.length > 2)), B = new Set(mkNorm(b).split(' ').filter(w => w.length > 2));
  if(!A.size || !B.size) return 0;
  let n = 0; A.forEach(w => { if(B.has(w)) n++; });
  return n / Math.min(A.size, B.size) * 0.5 + n / new Set([...A, ...B]).size * 0.5;
}
async function mkSaveMemos(memos, source){
  let added = 0, updated = 0;
  for(const m of memos){
    const kind = MK_MEM[m.kind] ? m.kind : 'profil';
    const text = mkClean(String(m.text || '').trim()).slice(0, 400);
    if(!text) continue;
    const nt = mkNorm(text);
    if(MK.mem.some(x => mkNorm(x.text) === nt)) continue;
    let best = null, bs = 0;
    MK.mem.forEach(x => { const s = mkSim(x.text, text) + ((x.kind || 'profil') === kind ? 0.1 : 0); if(s > bs){ bs = s; best = x; } });
    try {
      if(best && bs >= 0.62){
        const patch = { text, kind, updated_at: new Date().toISOString(), source: source || 'discussion' };
        const { error } = await sb.from('mk_memory').update(patch).eq('id', best.id);
        if(!error){ Object.assign(best, patch); updated++; }
      } else {
        const { data, error } = await sb.from('mk_memory').insert({ kind, text, source: source || 'discussion' }).select().single();
        if(!error && data){ MK.mem.push(data); added++; }
      }
    } catch(e){ console.warn('memo', e); }
  }
  if(added + updated) agToast(added + updated === 1 ? "L'agent a retenu une nouvelle info" : `L'agent a retenu ${added + updated} infos`);
}
// Normalise une publication proposee par l'IA
function mkFixPost(p, imgs){
  p = p || {};
  const today = mkDay();
  let date = /^\d{4}-\d{2}-\d{2}$/.test(p.date || '') ? p.date : today;
  if(date < today) date = today;
  const heure = /^\d{1,2}:\d{2}$/.test(p.heure || '') ? p.heure.padStart(5, '0') : '19:00';
  const out = {
    network: mkNet(p.network || p.reseau), kind: p.kind || p.type || 'Séance client', date, heure,
    title: mkClean(p.title || p.titre || '').slice(0, 120), caption: mkClean(p.caption || p.texte || p.legende || ''),
    hashtags: mkClean(Array.isArray(p.hashtags) ? p.hashtags.join(' ') : (p.hashtags || '')),
    shoot_id: p.shoot_id && mkShoot(p.shoot_id) ? Number(p.shoot_id) : null,
    images: Array.isArray(p.images) ? p.images : []
  };
  if(!out.images.length && Array.isArray(p.photos) && imgs && imgs.length) out.images = p.photos.map(n => imgs[Number(n) - 1]).filter(Boolean);
  if(!out.title) out.title = (out.caption.split('\n')[0] || out.kind).slice(0, 60);
  return out;
}

// ============================================================
// RENDU GENERAL
// ============================================================
function mkBody(){ return document.getElementById('mkBody'); }
function mkBadge(t){
  const today = mkDay();
  if(t === 'jour') return MK.posts.filter(p => p.status === 'prevu' && p.date && p.date <= today).length;
  if(t === 'res') return MK.posts.filter(p => p.status === 'publie' && !mkHasStats(p) && p.published_at && Date.now() - new Date(p.published_at).getTime() > 48 * 3600000).length;
  return 0;
}
async function mkRender(){
  const el = mkBody(); if(!el) return;
  if(!MK.loaded){ el.innerHTML = '<div class="ag-list"><div class="ag-empty">Chargement...</div></div>'; await mkLoad(); }
  else if(Date.now() - MK.loadedAt > 60000 && !MK.busy) mkLoad(true).then(() => mkRenderTab());
  mkRenderTab();
}
function mkRenderTab(){
  const el = mkBody(); if(!el) return;
  // Studio de publication et Ma marque (studio.js) : ecrans plein onglet
  if((MK.tab === 'studio' || MK.tab === 'marque') && typeof window.stRender === 'function'){ window.stRender(el); return; }
  if(MK.tab === 'studio' || MK.tab === 'marque') MK.tab = 'chat';
  const top = typeof window.stTopHtml === 'function' ? window.stTopHtml() : '';
  const bar = top + `<div class="mk-tabs">${MK_TABS.map(([k, l]) => { const n = mkBadge(k); return `<button class="${MK.tab === k ? 'on' : ''}" onclick="mkGo('${k}')">${l}${n ? `<i>${n}</i>` : ''}</button>`; }).join('')}</div>`;
  let h = '';
  if(MK.tab === 'jour') h = mkJourHtml();
  else if(MK.tab === 'plan') h = mkPlanHtml();
  else if(MK.tab === 'res') h = mkResHtml();
  else if(MK.tab === 'moi') h = mkMoiHtml();
  else h = mkChatHtml();
  el.innerHTML = bar + h;
  mkHydrate(el);
  if(MK.tab === 'chat') mkAfterChat();
}
function mkGo(t){ MK.tab = MK_TAB_ALIAS[t] || t; MK.selMode = false; MK.sel.clear(); mkRenderTab(); if(MK.tab !== 'chat') window.scrollTo({ top: 0 }); }

// ============================================================
// 1. DISCUSSION
// ============================================================
const MK_QUICK = [
  ['analyse', 'Analyse mes photos'], ['jour', 'Quoi publier aujourd\'hui ?'], ['legende', 'Écris une légende'],
  ['clients', 'Comment avoir plus de clients ce mois-ci ?'], ['resultats', 'Analyse mes résultats']
];
function mkChatHtml(){
  const msgs = MK.msgs;
  const empty = !msgs.length ? `<div class="mk-msg agent"><p>Salut Henzo ! Je suis ton agent marketing. Mon travail : t'aider à avoir plus de clients et à faire connaître ${agEsc(mkMarque())} partout en Côte d'Ivoire.</p><p>Envoie-moi des photos, pose-moi une question, ou touche un des boutons en bas. Plus on parle, mieux je te connais.</p></div>` : '';
  return `<div class="mk-chat" id="mkChat">${empty}${msgs.map(mkMsgHtml).join('')}${MK.busy === 'chat' ? mkTyping() : ''}</div>
    <div class="mk-compose">
      <div class="mk-quick">${MK_QUICK.map(([k, l]) => `<button onclick="mkQuick('${k}')" ${MK.busy ? 'disabled' : ''}>${agEsc(l)}</button>`).join('')}</div>
      ${MK.pending.length ? `<div class="mk-pend">${MK.pending.map((p, i) => `<div><img src="${agEsc(p.preview)}" alt="">${p.src === 'galerie' || p.src === 'moodboard' ? `<small>${p.src}</small>` : ''}<button onclick="mkUnpend(${i})" title="Retirer">×</button></div>`).join('')}</div>` : ''}
      <div class="mk-tools">
        <button onclick="mkPickFiles('chat')">${agIcon('image', 15)} Photo</button>
        <button onclick="mkPickGalerie('chat')">${agIcon('users', 15)} Mes galeries</button>
        <button onclick="mkPickMood('chat')">${agIcon('palette', 15)} Moodboards</button>
        <button class="mk-sw ${MK.search ? 'on' : ''}" onclick="MK.search=!MK.search;mkRenderTab()" title="Chercher sur internet (Gemini)">${agIcon('search', 15)} ${MK.search ? 'Internet activé' : 'Chercher sur internet'}</button>
      </div>
      <div class="mk-row">
        <textarea id="mkIn" rows="1" placeholder="Écris à ton agent..." oninput="mkGrow(this)" onkeydown="if(event.key==='Enter'&&!event.shiftKey&&!mkIsMobile()){event.preventDefault();mkSend()}">${agEsc(MK.draft || '')}</textarea>
        <button class="mk-send" onclick="mkSend()" ${MK.busy ? 'disabled' : ''} title="Envoyer"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12 20 4l-6 16-3-7z"/></svg></button>
      </div>
    </div>
    <div class="ag-sec" style="margin-top:14px"><span class="ag-hint" style="margin:0">L'agent se souvient de ce que tu lui apprends (onglet "Ce qu'il sait").</span>${msgs.length ? `<button onclick="mkClearChat()">Effacer la discussion</button>` : ''}</div>`;
}
function mkTyping(){ return `<div class="mk-typing" id="mkTyping"><span></span><span></span><span></span>&nbsp;écrit...</div>`; }
function mkGrow(t){ MK.draft = t.value; t.style.height = 'auto'; t.style.height = Math.min(160, t.scrollHeight) + 'px'; }
function mkAfterChat(){
  const t = document.getElementById('mkIn'); if(t && t.value) mkGrow(t);
  const c = document.getElementById('mkChat');
  if(c && c.lastElementChild && MK.scroll !== false){ requestAnimationFrame(() => { const r = c.lastElementChild.getBoundingClientRect(); window.scrollBy({ top: r.bottom - (window.innerHeight - 240), behavior: 'auto' }); }); }
  MK.scroll = true;
}
function mkMsgHtml(m){
  const { clean, posts, studios, suivis } = mkParse(m.text);
  const imgs = m.images || [];
  const dernier = m.role !== 'user' && MK.msgs.length && MK.msgs[MK.msgs.length - 1].id === m.id;
  const open = MK.openMsg === m.id;
  const t = new Date(m.created_at || Date.now()).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return `<div class="mk-msg ${m.role === 'user' ? 'user' : 'agent'}" onclick="mkMsgTap(event, ${m.id})">
    ${imgs.length ? `<div class="mk-imgs">${imgs.map(im => mkImgTag(im)).join('')}</div>` : ''}
    ${m.role === 'user' ? agEsc(mkClean(clean)).replace(/\n/g, '<br>') : mkMd(clean)}
    ${posts.map((p, i) => mkPostCard(p, { msg: m.id, i })).join('')}
    ${studios.map(mkStudioCard).join('')}
    ${dernier && suivis.length ? `<div class="mk-suivis">${suivis.map(q => `<button onclick="event.stopPropagation();mkSend(${agEsc(JSON.stringify(q))})">${agEsc(q)}</button>`).join('')}</div>` : ''}
    <span class="mk-time">${t}</span>
    ${open ? `<div class="mk-mact"><button onclick="event.stopPropagation();mkCopy(${agEsc(JSON.stringify(mkClean(clean)))})">Copier</button><button class="danger" onclick="event.stopPropagation();mkDelMsg(${m.id})">Supprimer</button></div>` : ''}
  </div>`;
}
function mkMsgTap(e, id){
  if(e.target.closest('button,a,textarea,input,.mk-post')) return;
  MK.openMsg = MK.openMsg === id ? null : id; MK.scroll = false; mkRenderTab();
}
// Carte de publication (dans la discussion ou ailleurs)
function mkPostCard(p, ref){
  const imgs = p.images || [];
  const r = ref.msg != null ? `${ref.msg},${ref.i}` : (ref.prop ? `'prop',${ref.i || 0}` : '');
  const added = p.plan_id && MK.posts.find(x => x.id === p.plan_id);
  return `<div class="mk-post">
    <div class="mk-post-h">${mkNetChip(p.network)}<span>${agEsc(p.kind || '')}</span><span>· ${agEsc(mkDayName(p.date || mkDay()))} ${agEsc(p.heure || '')}</span>${p.shoot_id && mkShoot(p.shoot_id) ? `<span>· ${agEsc(mkShootLabel(mkShoot(p.shoot_id)))}</span>` : ''}<b>${agEsc(p.title || '')}</b></div>
    ${imgs.length ? `<div class="mk-imgs">${imgs.map(im => mkImgTag(im)).join('')}</div>` : ''}
    <div class="mk-cap">${agEsc(mkPostText(p))}</div>
    <div class="mk-btns">
      ${added ? `<button class="ok" onclick="mkGo('plan')">${agIcon('check', 14)} Dans le plan</button>` : `<button class="main" onclick="mkPropAdd(${r})">${agIcon('calendar', 14)} Ajouter au plan</button>`}
      <button onclick="mkPropCopy(${r})">${agIcon('copy', 14)} Copier le texte</button>
      <button onclick="mkPropShare(${r})">${agIcon('chat', 14)} Partager sur WhatsApp</button>
    </div>
    ${r ? (() => { const av = (MK.avisMap || {})[r.replace(/'/g, '')]; return `<div class="mk-avis">${av ? `<span>${av === 'oui' ? 'Retenu : tu aimes' : 'Retenu : pas ton style'}</span>` : `<button onclick="mkPostAvis(${r},'oui')">${agIcon('check', 13)} J'aime</button><button onclick="mkPostAvis(${r},'non')">Pas mon style</button>`}${typeof crOuvrir === 'function' ? `<button onclick="crDepuisPost(${r})">${agIcon('image', 13)} Créer un visuel</button>` : ''}</div>`; })() : ''}
  </div>`;
}
// Carte "Ouvrir le studio de publication" (bloc studio de l'IA, ou intention detectee)
function mkStudioCard(x){
  const s = x && x.shoot_id ? mkShoot(x.shoot_id) : null;
  const nom = mkClean((x && x.nom) || (s ? mkFirst(mkClient(s.client_id)) : '') || 'cette séance');
  const arg = agEsc(JSON.stringify({ shoot_id: s ? s.id : null, nom }));
  return `<div class="mk-post mk-studio-card">
    <div class="mk-post-h"><b>${agIcon('sparkles', 15)} Studio de publication</b></div>
    <div class="mk-cap" style="margin:2px 0 0">Photos, textes pour chaque réseau, image avec titre et plan de diffusion${s ? ' pour ' + agEsc(mkShootLabel(s)) : ''}.</div>
    <div class="mk-btns"><button class="main" onclick="event.stopPropagation();window.stCreer && stCreer(${arg})">${agIcon('sparkles', 14)} Ouvrir le studio de publication pour ${agEsc(nom)}</button></div>
  </div>`;
}
function mkPropGet(a, b){
  if(a === 'prop') return MK.proposal;
  const m = MK.msgs.find(x => x.id === a); if(!m) return null;
  return mkParse(m.text).posts[b] || null;
}
async function mkPropAdd(a, b){
  const p = mkPropGet(a, b); if(!p) return;
  const row = await mkInsertPost(mkFixPost(p));
  if(!row) return;
  p.plan_id = row.id;
  if(a !== 'prop'){
    const m = MK.msgs.find(x => x.id === a);
    const P = mkParse(m.text); P.posts[b] = p;
    const text = mkBuild(P.clean, P.posts, P.studios);
    m.text = text;
    await sb.from('mk_messages').update({ text }).eq('id', m.id);
  }
  agToast(`Ajouté au plan : ${mkDayName(row.date)} ${row.heure || ''}`);
  mkRenderTab();
}
// J'aime / Pas mon style sur une publication proposée : gardé comme préférence
async function mkPostAvis(a, b, avis){
  const p = mkPropGet(a, b); if(!p) return;
  MK.avisMap = MK.avisMap || {}; MK.avisMap[a + ',' + b] = avis;
  mkRenderTab();
  const extrait = mkClean(typeof window.txtDefancy === 'function' ? window.txtDefancy(p.caption || '') : p.caption || '').replace(/\s+/g, ' ').slice(0, 110);
  await mkSaveMemos([{ kind: 'preference', text: `${avis === 'oui' ? 'Aime' : "N'aime pas"} ce genre de publication (${p.network || 'réseau'}, ${p.kind || 'publication'}) : «${extrait}»` }], 'avis sur une publication');
}
function mkPropCopy(a, b){ const p = mkPropGet(a, b); if(p) mkCopy(mkPostText(p)); }
function mkPropShare(a, b){ const p = mkPropGet(a, b); if(p) mkShare(p); }
async function mkInsertPost(p){
  const row = { date: p.date || mkDay(), heure: p.heure || null, network: p.network || 'Facebook', kind: p.kind || null, shoot_id: p.shoot_id || null,
    title: p.title || null, caption: p.caption || null, hashtags: p.hashtags || null, images: p.images || [], status: p.status || 'prevu', notes: p.notes || null };
  const { data, error } = await sb.from('mk_posts').insert(row).select().single();
  if(error || !data){ agAlert('Erreur : ' + ((error && error.message) || "la publication n'a pas été enregistrée")); return null; }
  MK.posts.push(data); mkSortPosts();
  return data;
}

// ---------- Photos : choisir ----------
function mkPickFiles(target){
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true; inp.style.display = 'none';
  inp.onchange = () => { mkAddFiles(target, inp.files); inp.remove(); };
  document.body.appendChild(inp); inp.click();
}
function mkAddFiles(target, files){
  const src = mkIsMobile() ? 'telephone' : 'ordinateur';
  const list = [...(files || [])].filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name || ''));
  const items = list.map(f => ({ file: f, src, preview: URL.createObjectURL(f) }));
  mkAddPending(target, items);
}
function mkAddPending(target, items){
  if(!items.length) return;
  if(target === 'post' && MK.edit){ MK.edit.pending.push(...items); mkEditImgs(); return; }
  MK.pending.push(...items);
  if(MK.pending.length > 8){ MK.pending = MK.pending.slice(0, 8); agToast('8 photos maximum par message', 'error'); }
  if(MK.tab !== 'chat') MK.tab = 'chat';
  MK.draft = (document.getElementById('mkIn') || {}).value ?? MK.draft;
  mkRenderTab();
}
function mkUnpend(i){ MK.draft = (document.getElementById('mkIn') || {}).value ?? MK.draft; MK.pending.splice(i, 1); MK.scroll = false; mkRenderTab(); }
// Galeries clients (photos envoyees a l'IA sans copie dans le stockage)
async function mkPickGalerie(target){
  MK.pickTarget = target;
  agSheet('mkGal', `<h3>Mes galeries clients</h3><div id="mkGalBox"><div class="ag-empty">Chargement de tes galeries...</div></div>`);
  try {
    if(typeof galApi !== 'function') throw new Error("La galerie n'est pas encore chargée. Réessaie dans un instant.");
    if(typeof galPwd !== 'undefined' && !galPwd && typeof getGaleriePwd === 'function') galPwd = await getGaleriePwd();
    if(typeof galPwd === 'undefined' || !galPwd) throw new Error("Connecte d'abord ta galerie dans l'onglet Galerie.");
    let list = (typeof galList !== 'undefined' && galList.length) ? galList : await galApi('/api/admin/galeries');
    list = (list || []).slice().sort((a, b) => String(b.dateCreation).localeCompare(String(a.dateCreation)));
    const box = document.getElementById('mkGalBox'); if(!box) return;
    box.innerHTML = list.length ? list.map(g => `<div class="mk-gl" onclick="mkGalOpen(${agEsc(JSON.stringify(g.code))})">${agIcon('image', 18)} <b>${agEsc(g.nomClient || g.code)}</b><span>${g.nbPhotos || 0} photos</span></div>`).join('')
      : '<div class="ag-empty">Aucune galerie.</div>';
  } catch(e){ const box = document.getElementById('mkGalBox'); if(box) box.innerHTML = `<div class="ag-empty">${agEsc(e.message)}</div>`; }
}
async function mkGalOpen(code){
  const box = document.getElementById('mkGalBox'); if(!box) return;
  box.innerHTML = '<div class="ag-empty">Chargement des photos...</div>';
  try {
    const r = await galApi('/api/admin/galeries/' + encodeURIComponent(code) + '/photos');
    const photos = r.photos || [], dossier = r.dossier;
    MK.galPick = { dossier, photos, sel: new Set() };
    box.innerHTML = `<button class="ag-back" onclick="mkPickGalerie(MK.pickTarget)">${agIcon('chev', 16)} Toutes les galeries</button>
      <div class="ag-hint" style="margin-top:0">Touche les photos à montrer à l'agent (8 au plus). Elles ne sont pas recopiées : elles restent dans ta galerie.</div>
      <div class="mk-pick">${photos.map((f, i) => `<div class="mk-tile" id="mkGp${i}" onclick="mkGalSel(${i})"><img loading="lazy" src="${agEsc(galPhotoUrl(dossier, f, 'thumb'))}" alt=""><span class="mk-chk"></span></div>`).join('') || '<div class="ag-empty">Galerie vide.</div>'}</div>
      <button class="btn-primary" id="mkGalOk" style="margin-top:12px" onclick="mkGalDone()">Choisir (0)</button>`;
  } catch(e){ box.innerHTML = `<div class="ag-empty">${agEsc(e.message)}</div>`; }
}
function mkGalSel(i){
  const s = MK.galPick.sel;
  if(s.has(i)) s.delete(i); else { if(s.size >= 8){ agToast('8 photos maximum', 'error'); return; } s.add(i); }
  const t = document.getElementById('mkGp' + i); if(t) t.classList.toggle('sel', s.has(i));
  const b = document.getElementById('mkGalOk'); if(b) b.textContent = `Choisir (${s.size})`;
}
function mkGalDone(){
  const g = MK.galPick; if(!g) return;
  const items = [...g.sel].map(i => ({ url: galPhotoUrl(g.dossier, g.photos[i]), thumb: galPhotoUrl(g.dossier, g.photos[i], 'thumb'), preview: galPhotoUrl(g.dossier, g.photos[i], 'thumb'), src: 'galerie' }));
  agCloseSheet('mkGal'); mkAddPending(MK.pickTarget, items);
}
// Moodboards (images deja en ligne)
async function mkPickMood(target){
  MK.pickTarget = target;
  try { if(typeof MB !== 'undefined' && !MB.loaded && typeof mbLoad === 'function') await mbLoad(); } catch(e){}
  let boards = typeof MB !== 'undefined' ? MB.boards : [], imgs = typeof MB !== 'undefined' ? MB.imgs : [];
  if(!boards.length){
    try { const [b, i] = await Promise.all([sb.from('mood_boards').select('*'), sb.from('mood_images').select('*')]); boards = b.data || []; imgs = i.data || []; } catch(e){}
  }
  MK.moodPick = { boards, imgs: imgs.filter(x => !x.hidden && x.url), sel: new Set() };
  agSheet('mkMood', `<h3>Mes moodboards</h3><div id="mkMoodBox">${boards.length ? boards.map(b => `<div class="mk-gl" onclick="mkMoodOpen(${b.id})">${agIcon('palette', 18)} <b>${agEsc(b.title || 'Sans titre')}</b><span>${MK.moodPick.imgs.filter(x => x.board_id === b.id).length} images</span></div>`).join('') : '<div class="ag-empty">Aucun moodboard.</div>'}</div>`);
}
function mkMoodOpen(id){
  const box = document.getElementById('mkMoodBox'); if(!box) return;
  const im = MK.moodPick.imgs.filter(x => x.board_id === id);
  MK.moodPick.cur = im; MK.moodPick.sel = new Set();
  box.innerHTML = `<button class="ag-back" onclick="mkPickMood(MK.pickTarget)">${agIcon('chev', 16)} Tous les tableaux</button>
    <div class="mk-pick">${im.map((x, i) => `<div class="mk-tile" id="mkMp${i}" onclick="mkMoodSel(${i})"><img loading="lazy" src="${agEsc(x.url)}" alt=""><span class="mk-chk"></span></div>`).join('') || '<div class="ag-empty">Tableau vide.</div>'}</div>
    <button class="btn-primary" id="mkMoodOk" style="margin-top:12px" onclick="mkMoodDone()">Choisir (0)</button>`;
}
function mkMoodSel(i){
  const s = MK.moodPick.sel;
  if(s.has(i)) s.delete(i); else { if(s.size >= 8){ agToast('8 images maximum', 'error'); return; } s.add(i); }
  const t = document.getElementById('mkMp' + i); if(t) t.classList.toggle('sel', s.has(i));
  const b = document.getElementById('mkMoodOk'); if(b) b.textContent = `Choisir (${s.size})`;
}
function mkMoodDone(){
  const m = MK.moodPick; if(!m || !m.cur) return;
  const items = [...m.sel].map(i => ({ url: m.cur[i].url, preview: m.cur[i].url, src: 'moodboard' }));
  agCloseSheet('mkMood'); mkAddPending(MK.pickTarget, items);
}

// ---------- Envoyer un message ----------
const MK_SEARCH_RE = /tendance|autres photographes|concurren|meilleur(e)? (moment|heure|jour)|quelle heure|heure.{0,20}publi|algorithme|en ce moment|actualit|populaire|viral|son(s)? (tiktok|du moment)|ce qui marche (sur|en)|prix (des|du) march|combien (prennent|demandent)/i;
async function mkQuick(k){
  const inp = document.getElementById('mkIn');
  if(k === 'analyse'){
    if(!MK.pending.length){ MK.draft = 'Analyse ces photos : lesquelles publier, sur quel réseau, avec quel texte ? Dis-moi aussi ce qui peut être amélioré.'; if(inp) inp.value = MK.draft; agToast('Ajoute les photos à analyser'); mkPickFiles('chat'); return; }
    return mkSend('Analyse ces photos : lesquelles publier, sur quel réseau, avec quel texte ? Dis-moi franchement ce qui peut être amélioré.');
  }
  if(k === 'legende'){
    if(MK.pending.length) return mkSend('Écris une légende pour ces photos, prête à publier.');
    MK.draft = 'Écris une légende pour '; if(inp){ inp.value = MK.draft; inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); } return;
  }
  if(k === 'jour') return mkSend("Quoi publier aujourd'hui ? Donne-moi une publication précise prête à poster (et une idée de statut WhatsApp).");
  if(k === 'clients') return mkSend('Comment avoir plus de clients ce mois-ci ? Donne-moi un plan concret, avec ce que je fais cette semaine.');
  if(k === 'resultats') return mkSend("Analyse mes résultats : qu'est-ce qui marche, qu'est-ce qui ne marche pas, et que dois-je changer ?", { search: false });
}
async function mkSend(text, opt){
  opt = opt || {};
  if(MK.busy) return;
  const inp = document.getElementById('mkIn');
  text = String(text != null ? text : (inp ? inp.value : '')).trim();
  const pend = MK.pending.slice();
  if(!text && !pend.length) return;
  if(!text) text = 'Voici des photos. Analyse-les et dis-moi quoi en faire pour mon marketing.';
  MK.busy = 'chat'; MK.tab = 'chat'; MK.draft = ''; MK.pending = [];
  // Affichage immediat
  const tmp = { id: -Date.now(), role: 'user', text, images: pend.map(p => p.file ? { thumb: p.preview } : { url: p.url, thumb: p.thumb || p.preview }), created_at: new Date().toISOString() };
  const hist = MK.msgs.slice();
  MK.msgs.push(tmp); mkRenderTab();
  let st, userRow;
  try {
    st = await mkStore(pend, true);
    const { data, error } = await sb.from('mk_messages').insert({ role: 'user', text, images: st.images }).select().single();
    if(error) throw new Error(error.message);
    userRow = data; Object.assign(tmp, data);
  } catch(e){
    MK.msgs = MK.msgs.filter(m => m !== tmp); MK.busy = false; MK.pending = pend; MK.draft = text; mkRenderTab();
    agAlert("Message non envoyé : " + (e.message || e)); return;
  }
  const recherche = opt.search != null ? opt.search : (MK.search || MK_SEARCH_RE.test(text));
  // "publier le shooting de Destinée" : on proposera d'ouvrir le studio de publication
  const intent = mkStudioIntent(text);
  if(intent) opt.hidden = [opt.hidden, `Henzo veut publier une séance${intent.shoot_id ? ' (séance n°' + intent.shoot_id + ')' : ''} : réponds en 2 ou 3 phrases et ajoute le bloc studio. L'app lui proposera d'ouvrir le studio de publication.`].filter(Boolean).join('\n');
  let reply;
  try {
    const res = await mkAI({ system: mkSystem(), messages: [...mkHistory(hist), { role: 'user', text: text + (opt.hidden ? '\n\n' + opt.hidden : '') + (st.b64.length ? `\n\n(${st.b64.length} photo(s) jointe(s), numérotées de 1 à ${st.b64.length})` : '') }], images: st.b64, recherche });
    reply = res;
  } catch(e){
    MK.busy = false; mkRenderTab();
    agAlert(e.message || String(e)); return;
  }
  const out = await mkSaveReply(reply, { images: st.images, shoot: opt.shoot, media: st.media, source: 'discussion', studio: intent });
  MK.busy = false;
  if(opt.after) opt.after(out);
  mkRenderTab();
}
// Intention "publier la seance / le shooting de X" -> {shoot_id, nom} ou null
function mkStudioIntent(text){
  const t = String(text || '');
  if(!/publi|poster|partag|mettre en ligne/i.test(t)) return null;
  const re = /(?:shooting|s[ée]ance|photos?|anniversaire|mariage|dot|grossesse|bapt[eê]me)\s+(?:de|d'|d’|du|avec|pour)\s*([A-Za-zÀ-ÿ’-]{2,})/gi;
  let m, nom = '';
  while((m = re.exec(t))){ if(!/^(la|le|les|ma|mon|mes|cette|ce|hier|aujourd|demain|samedi|dimanche|ma[dm]ame|monsieur)$/i.test(m[1])){ nom = m[1]; break; } }
  if(!nom) return null;
  const n = mkNorm(nom);
  const list = (typeof shoots !== 'undefined' ? shoots : []).filter(s => !mkCancelled(s)).filter(s => { const c = mkClient(s.client_id); return c && mkNorm(c.name).split(' ').includes(n); })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const past = list.filter(s => new Date(s.date).getTime() <= Date.now());
  const s = past[0] || list[0];
  return { shoot_id: s ? s.id : null, nom: nom.charAt(0).toUpperCase() + nom.slice(1) };
}
// Enregistre la reponse : retient les memos, normalise les blocs post, garde le message
async function mkSaveReply(reply, o){
  o = o || {};
  const P = mkParse(reply.text), memos = P.memos;
  const posts = P.posts.map(x => { const p = mkFixPost(x, o.images); if(o.shoot && !p.shoot_id) p.shoot_id = o.shoot; return p; });
  const studios = P.studios.slice();
  if(o.studio && !studios.some(x => Number(x.shoot_id) === Number(o.studio.shoot_id))) studios.push(o.studio);
  let txt = mkClean(P.clean).replace(/Henzo Studio/g, mkMarque());
  if(reply.sources && reply.sources.length) txt += '\n\nSources : ' + reply.sources.map(s => `[${String(s.title).replace(/[\[\]]/g, '')}](${s.uri})`).join(', ');
  const body = mkBuild(txt, posts, studios);
  if(memos.length) await mkSaveMemos(memos, o.source);
  let row = null;
  try {
    const { data, error } = await sb.from('mk_messages').insert({ role: 'agent', text: body, images: [] }).select().single();
    if(error) throw error; row = data;
  } catch(e){ row = { id: -Date.now(), role: 'agent', text: body, images: [], created_at: new Date().toISOString() }; agToast('Réponse non enregistrée', 'error'); }
  MK.msgs.push(row);
  // Garde l'analyse sur les photos envoyees
  (o.media || []).forEach(m => { const a = mkParse(body).clean.slice(0, 1500); m.analyse_ia = a; sb.from('mk_media').update({ analyse_ia: a }).eq('id', m.id); });
  return { row, posts: mkParse(body).posts };
}
async function mkDelMsg(id){
  if(!await agConfirm('Supprimer ce message ?')) return;
  const { error } = await sb.from('mk_messages').delete().eq('id', id);
  if(error){ agAlert(error.message); return; }
  MK.msgs = MK.msgs.filter(m => m.id !== id); MK.openMsg = null; MK.scroll = false; mkRenderTab();
}
async function mkClearChat(){
  if(!await agConfirm("Effacer toute la discussion ?\nCe que l'agent sait de toi est gardé, ainsi que tes photos et ton plan.")) return;
  const { error } = await sb.from('mk_messages').delete().gte('id', 0);
  if(error){ agAlert(error.message); return; }
  MK.msgs = []; mkRenderTab(); agToast('Discussion effacée');
}

// ---------- Partager ----------
async function mkShare(p){
  const text = mkPostText(p);
  const imgs = p.images || [];
  try { if(navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text); } catch(e){}
  if(imgs.length && navigator.canShare){
    agToast('Préparation des photos...');
    try {
      const files = [];
      for(const [i, im] of imgs.slice(0, 10).entries()){
        let url = im.path ? (await mkSign([im.path]))[0] : (im.url || im.thumb);
        try { const b = await mkUrlBlob(url); files.push(new File([b], `${mkSlug(mkMarque())}-${i + 1}.jpg`, { type: b.type || 'image/jpeg' })); } catch(e){}
      }
      if(files.length && navigator.canShare({ files })){
        await navigator.share({ files, text, title: p.title || mkMarque() });
        agToast('Texte copié aussi : colle-le si WhatsApp ne le reprend pas');
        return;
      }
    } catch(e){ if(e && e.name === 'AbortError') return; }
  }
  if(navigator.share && mkIsMobile()){ try { await navigator.share({ text }); return; } catch(e){ if(e && e.name === 'AbortError') return; } }
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
}

// ============================================================
// 2. AUJOURD'HUI
// ============================================================
function mkJourHtml(){
  const today = mkDay(), now = Date.now();
  const due = MK.posts.filter(p => p.status === 'prevu' && p.date && p.date <= today);
  const unpub = (typeof shoots !== 'undefined' ? shoots : []).filter(s => s.date && !mkCancelled(s) && new Date(s.date).getTime() < now && new Date(s.date).getTime() > now - 60 * mkDayMs
    && !MK.posts.some(p => p.shoot_id === s.id && p.status !== 'annule')).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const noStats = MK.posts.filter(p => p.status === 'publie' && !mkHasStats(p) && p.published_at && now - new Date(p.published_at).getTime() > 48 * 3600000);
  const next = MK.posts.find(p => p.status === 'prevu' && p.date > today);
  return `
    <div class="mk-card"><h3>${agIcon('flame', 18)} À publier aujourd'hui${due.length ? `<span class="crm-count">${due.length}</span>` : ''}</h3>
      ${due.length ? due.map(p => mkPlanCard(p)).join('') : `
        <p class="mk-intro" style="margin:0 0 10px">Rien de prévu pour aujourd'hui.${next ? ` Prochaine publication : ${agEsc(mkDayName(next.date))} sur ${agEsc(next.network)}.` : ''}</p>
        ${MK.proposal ? mkPostCard(MK.proposal, { prop: true }) : ''}
        <button class="btn-primary" style="width:100%" ${MK.busy ? 'disabled' : ''} onclick="mkPropose()">${MK.busy === 'prop' ? "L'agent réfléchit..." : MK.proposal ? 'Autre proposition' : 'Me proposer quelque chose'}</button>`}
    </div>
    <div class="mk-card"><h3>${agIcon('camera', 18)} Séances pas encore publiées${unpub.length ? `<span class="crm-count">${unpub.length}</span>` : ''}</h3>
      ${unpub.length ? unpub.slice(0, 8).map(s => `<div class="mk-line"><div class="d"><b>${agEsc(s.type || 'Séance')}${mkClient(s.client_id) ? ' · ' + agEsc(mkClient(s.client_id).name) : ''}</b><span>${agEsc(mkDateTxt(s.date, { day: 'numeric', month: 'long' }))}</span></div><button onclick="${typeof window.stCreer === 'function' ? `stCreer({shoot_id:${s.id}})` : `mkPreparerSeance(${s.id})`}">Préparer une publication</button></div>`).join('')
        : '<div class="ag-hint" style="margin:0">Toutes tes séances récentes ont une publication. Bravo.</div>'}
    </div>
    <div class="mk-card"><h3>${agIcon('target', 18)} Résultats à donner${noStats.length ? `<span class="crm-count">${noStats.length}</span>` : ''}</h3>
      ${noStats.length ? noStats.map(p => `<div class="mk-line"><div class="d"><b>${agEsc(p.title || p.kind || 'Publication')}</b><span>${agEsc(p.network)} · publié ${agEsc(mkDateTxt(p.published_at))}</span></div><button onclick="mkStatsOpen(${p.id})">Donner les chiffres</button></div>`).join('')
        : '<div class="ag-hint" style="margin:0">Rien à donner pour le moment. 2 jours après chaque publication, note ses chiffres ici : c\'est comme ça que l\'agent apprend ce qui marche.</div>'}
    </div>`;
}
function mkPlanCard(p){
  const late = p.status === 'prevu' && p.date < mkDay();
  return `<div class="mk-post">
    <div class="mk-post-h">${mkNetChip(p.network)}<span>${agEsc(p.kind || '')}</span><span>· ${agEsc(p.heure || '')}</span>${late ? `<span class="mk-st retard">prévu ${agEsc(mkDayName(p.date).toLowerCase())}</span>` : ''}${p.shoot_id && mkShoot(p.shoot_id) ? `<span>· ${agEsc(mkShootLabel(mkShoot(p.shoot_id)))}</span>` : ''}<b>${agEsc(p.title || '')}</b></div>
    ${(p.images || []).length ? `<div class="mk-imgs">${p.images.map(im => mkImgTag(im)).join('')}</div>` : ''}
    <div class="mk-cap">${agEsc(mkPostText(p))}</div>
    <div class="mk-btns">
      <button onclick="mkCopyPost(${p.id})">${agIcon('copy', 14)} Copier</button>
      ${typeof crDepuisPlan === 'function' && (p.images || []).length ? `<button onclick="crDepuisPlan(${p.id})">${agIcon('image', 14)} Créer un visuel</button>` : ''}
      <button onclick="mkSharePost(${p.id})">${agIcon('chat', 14)} Partager</button>
      <button class="main" onclick="mkPublished(${p.id})">${agIcon('check', 14)} Je l'ai publié</button>
    </div>
    <div class="mk-btns" style="margin-top:6px">
      <button onclick="mkEditPost(${p.id})">${agIcon('edit', 14)} Modifier</button>
      <button onclick="mkPostpone(${p.id})">${agIcon('calendar', 14)} Reporter</button>
    </div>
  </div>`;
}
// Notes d'une publication faite avec le studio : JSON {"studio":1, versions, plan, lien...}
function mkStudioNotes(n){ if(!n || !/^\s*\{\s*"studio"/.test(String(n))) return null; try { return JSON.parse(n); } catch(e){ return null; } }
function mkCopyPost(id){ const p = MK.posts.find(x => x.id === id); if(p) mkCopy(mkPostText(p)); }
function mkSharePost(id){ const p = MK.posts.find(x => x.id === id); if(p) mkShare(p); }
async function mkUpdatePost(id, patch){
  const p = MK.posts.find(x => x.id === id); if(!p) return false;
  const { error } = await sb.from('mk_posts').update(patch).eq('id', id);
  if(error){ agAlert('Erreur : ' + error.message); return false; }
  Object.assign(p, patch); mkSortPosts(); return true;
}
async function mkPublished(id){
  if(await mkUpdatePost(id, { status: 'publie', published_at: new Date().toISOString() })){
    agToast('Bravo ! Dans 2 jours, note ses chiffres dans "Mes résultats"'); mkRenderTab();
  }
}
function mkPostpone(id){
  const p = MK.posts.find(x => x.id === id); if(!p) return;
  const t = mkDay();
  agSheet('mkPp', `<h3>Reporter la publication</h3>
    <div class="ag-pills">${[[1, 'Demain'], [2, 'Après-demain'], [7, 'Dans une semaine']].map(([n, l]) => `<button onclick="mkPostponeGo(${id}, '${mkAddDays(t, n)}')">${l}<small>${agEsc(mkDateTxt(mkAddDays(t, n)))}</small></button>`).join('')}</div>
    <label>Autre date</label><input type="date" id="mkPpD" value="${mkAddDays(t, 1)}" min="${t}">
    <label>Heure</label><input type="time" id="mkPpH" value="${agEsc(p.heure || '19:00')}">
    <button class="btn-primary" onclick="mkPostponeGo(${id})">Reporter</button>`);
}
async function mkPostponeGo(id, d){
  const date = d || document.getElementById('mkPpD').value; if(!date) return;
  const h = document.getElementById('mkPpH'); const patch = { date };
  if(h && h.value) patch.heure = h.value;
  if(await mkUpdatePost(id, patch)){ agCloseSheet('mkPp'); agToast('Reporté à ' + mkDayName(date).toLowerCase()); mkRenderTab(); }
}
async function mkPropose(){
  if(MK.busy) return;
  MK.busy = 'prop'; mkRenderTab();
  try {
    const q = "Propose-moi UNE publication pour aujourd'hui, la plus utile pour avoir des clients en ce moment (séance récente pas encore publiée, avis, coulisses, promo, fête qui approche...). Donne le réseau, l'heure, le texte prêt à publier et les hashtags dans un bloc post. Explique en 2 phrases pourquoi.";
    const res = await mkAI({ system: mkSystem(), messages: [...mkHistory(), { role: 'user', text: q }] });
    const out = await mkSaveReply(res, { source: 'aujourdhui' });
    MK.proposal = out.posts[0] ? Object.assign(out.posts[0], { date: mkDay() }) : null;
    if(!MK.proposal) agToast("L'agent a répondu dans la discussion");
  } catch(e){ agAlert(e.message || String(e)); }
  MK.busy = false; mkRenderTab();
}

// ============================================================
// 3. PLAN DE LA SEMAINE
// ============================================================
function mkPlanHtml(){
  const start = mkAddDays(mkDay(), MK.weekOff * 7), today = mkDay();
  const days = []; for(let i = 0; i < 7; i++) days.push(mkAddDays(start, i));
  const inWeek = MK.posts.filter(p => p.date >= start && p.date <= days[6] && p.status !== 'annule');
  return `
    <div class="ag-sec"><h3>${MK.weekOff === 0 ? 'Les 7 prochains jours' : `Du ${agEsc(mkDateTxt(start, { day: 'numeric', month: 'short' }))} au ${agEsc(mkDateTxt(days[6], { day: 'numeric', month: 'short' }))}`}</h3>
      <div>${MK.weekOff > 0 ? `<button onclick="MK.weekOff--;mkRenderTab()">‹ Avant</button>` : ''}<button onclick="MK.weekOff++;mkRenderTab()">Après ›</button></div></div>
    <div class="crm-2" style="margin-bottom:14px">
      <button class="btn-primary" ${MK.busy ? 'disabled' : ''} onclick="mkGenPlan()">${MK.busy === 'plan' ? "L'agent prépare..." : 'Générer mon plan de la semaine'}</button>
      <button class="btn-secondary mk-ib" onclick="mkEditPost(null)">${agIcon('plus', 15)} Ajouter</button>
    </div>
    <div class="mk-mini" style="margin:-4px 2px 12px"><span>Cette semaine : <b>${inWeek.filter(p => p.network !== 'Statut WhatsApp').length}</b> publication(s) et <b>${inWeek.filter(p => p.network === 'Statut WhatsApp').length}</b> statut(s) WhatsApp</span></div>
    ${days.map(d => { const list = MK.posts.filter(p => p.date === d);
      return `<div class="mk-day ${d === today ? 'today' : ''}"><div class="mk-day-h"><span>${agEsc(mkDayName(d))}</span><button onclick="mkEditPost(null, '${d}')">+ Ajouter</button></div>
        ${list.length ? list.map(p => `<div class="mk-slot ${p.status}" onclick="mkEditPost(${p.id})">
          <span class="h">${agEsc(p.heure || '--:--')}</span>
          <div class="d"><b>${agEsc(p.title || p.kind || 'Publication')}</b><span>${mkNetChip(p.network)} ${p.status !== 'prevu' ? `<span class="mk-st ${p.status}">${p.status === 'publie' ? 'publié' : 'annulé'}</span>` : ''}${(p.images || []).length ? ` · ${p.images.length} photo${p.images.length > 1 ? 's' : ''}` : ''}</span></div>
          ${p.status === 'prevu' ? `<div class="mv"><button title="Un jour avant" onclick="event.stopPropagation();mkShift(${p.id},-1)">‹</button><button title="Un jour après" onclick="event.stopPropagation();mkShift(${p.id},1)">›</button></div>` : ''}
        </div>`).join('') : '<div class="mk-empty-day">Rien de prévu</div>'}</div>`; }).join('')}
    ${MK.planNote ? `<div class="mk-card"><h3>${agIcon('info', 18)} Pourquoi ce rythme</h3><div class="ag-hint" style="margin:0;font-size:13px">${agEsc(MK.planNote)}</div></div>` : ''}`;
}
async function mkShift(id, n){
  const p = MK.posts.find(x => x.id === id); if(!p) return;
  const d = mkAddDays(p.date, n);
  if(d < mkDay()){ agToast('Pas de date dans le passé', 'error'); return; }
  if(await mkUpdatePost(id, { date: d })) mkRenderTab();
}
async function mkGenPlan(){
  if(MK.busy) return;
  MK.busy = 'plan'; mkRenderTab();
  const start = mkAddDays(mkDay(), MK.weekOff * 7), end = mkAddDays(start, 6);
  const deja = MK.posts.filter(p => p.status === 'prevu' && p.date >= start && p.date <= end).map(p => `${p.date} ${p.heure || ''} ${p.network}`).join(' ; ');
  const q = `Prépare mon plan de publications du ${start} au ${end}.
- Propose une fréquence adaptée à ma situation (par défaut 4 à 5 publications par semaine sur Facebook, Instagram, TikTok ou Google Maps, plus des statuts WhatsApp presque chaque jour) et explique ton choix en 2 ou 3 phrases simples.
- Varie les réseaux et les types : séances récentes pas encore publiées (mets leur shoot_id), avis clients, coulisses, avant/après, promo, conseil, fête qui approche.
- Choisis les meilleurs jours et heures pour Bouaké.
${deja ? '- Déjà prévu (ne pas refaire) : ' + deja : ''}
Réponds UNIQUEMENT en JSON, sans texte autour :
{"explication":"...","frequence":"...","posts":[{"date":"AAAA-MM-JJ","heure":"19:00","network":"Facebook","kind":"Séance client","title":"...","caption":"texte prêt à publier","hashtags":"#...","shoot_id":null}]}`;
  try {
    const res = await mkAI({ system: mkSystem(), messages: [...mkHistory(MK.msgs.slice(-6)), { role: 'user', text: q }], maxTokens: 6000 });
    const j = mkJson(res.text);
    const posts = (Array.isArray(j) ? j : (j.posts || [])).filter(p => p && (p.caption || p.title || p.texte)).map(p => mkFixPost(p)).map(p => { if(p.date < start) p.date = start; if(p.date > end) p.date = end; return p; });
    if(!posts.length) throw new Error("L'agent n'a pas proposé de publication. Réessaie.");
    MK.planDraft = { posts, sel: new Set(posts.map((p, i) => i)), note: mkClean([j.frequence, j.explication].filter(Boolean).join(' - ')) };
    mkPlanPreview();
  } catch(e){ agAlert(e.message || String(e)); }
  MK.busy = false; mkRenderTab();
}
function mkPlanPreview(){
  const d = MK.planDraft; if(!d) return;
  agSheet('mkPlanP', `<h3>Ton plan proposé</h3>
    ${d.note ? `<div class="ag-hint" style="margin-top:0;font-size:13px">${agEsc(d.note)}</div>` : ''}
    <div class="ag-hint">Décoche ce que tu ne veux pas. Tu pourras tout modifier ou déplacer ensuite.</div>
    <div class="mk-plan-prev">${d.posts.map((p, i) => `<label class="mk-post" style="display:block;cursor:pointer"><input type="checkbox" ${d.sel.has(i) ? 'checked' : ''} onchange="mkPlanSel(${i}, this.checked)">
      <div class="mk-post-h">${mkNetChip(p.network)}<span>${agEsc(mkDayName(p.date))} ${agEsc(p.heure)}</span><span>· ${agEsc(p.kind)}</span><b>${agEsc(p.title)}</b></div>
      <div class="mk-cap" style="max-height:5.6em;overflow:hidden">${agEsc(p.caption)}</div></label>`).join('')}</div>
    <button class="btn-primary" id="mkPlanGo" onclick="mkPlanSave()">Ajouter au plan (${d.sel.size})</button>`);
}
function mkPlanSel(i, on){ const d = MK.planDraft; on ? d.sel.add(i) : d.sel.delete(i); const b = document.getElementById('mkPlanGo'); if(b) b.textContent = `Ajouter au plan (${d.sel.size})`; }
async function mkPlanSave(){
  const d = MK.planDraft; if(!d) return;
  const rows = d.posts.filter((p, i) => d.sel.has(i)).map(p => ({ date: p.date, heure: p.heure, network: p.network, kind: p.kind, shoot_id: p.shoot_id, title: p.title, caption: p.caption, hashtags: p.hashtags, images: [], status: 'prevu' }));
  if(!rows.length){ agCloseSheet('mkPlanP'); return; }
  const { data, error } = await sb.from('mk_posts').insert(rows).select();
  if(error){ agAlert('Erreur : ' + error.message); return; }
  MK.posts.push(...(data || [])); mkSortPosts();
  MK.planNote = d.note;
  if(d.note){
    const text = `Plan de la semaine prêt : ${rows.length} publications ajoutées.\n\n${d.note}`;
    try { const { data: m } = await sb.from('mk_messages').insert({ role: 'agent', text, images: [] }).select().single(); if(m) MK.msgs.push(m); } catch(e){}
  }
  MK.planDraft = null; agCloseSheet('mkPlanP'); agToast(`${rows.length} publications ajoutées`); mkRenderTab();
}

// ---------- Ajouter / modifier une publication ----------
function mkEditPost(id, date, pre){
  const p = id ? MK.posts.find(x => x.id === id) : null;
  const v = Object.assign({ network: 'Facebook', kind: 'Séance client', date: date || mkDay(), heure: '19:00', status: 'prevu', images: [] }, pre || {}, p || {});
  MK.edit = { id: p ? p.id : null, images: (v.images || []).slice(), pending: [] };
  const now = Date.now();
  const sh = (typeof shoots !== 'undefined' ? shoots : []).filter(s => s.date && !mkCancelled(s) && Math.abs(new Date(s.date).getTime() - now) < 120 * mkDayMs).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  agSheet('mkEdit', `
    <h3>${p ? 'Modifier la publication' : 'Nouvelle publication'}</h3>
    <div class="crm-2"><div><label>Réseau</label><select id="mkPNet">${MK_NETS.map(n => `<option ${n === v.network ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div><label>Type</label><input id="mkPKind" list="mkKinds" value="${agEsc(v.kind || '')}"><datalist id="mkKinds">${MK_KINDS.map(k => `<option value="${agEsc(k)}">`).join('')}</datalist></div></div>
    <div class="crm-2"><div><label>Date</label><input type="date" id="mkPDate" value="${agEsc(v.date || '')}"></div><div><label>Heure</label><input type="time" id="mkPHeure" value="${agEsc(v.heure || '')}"></div></div>
    <label>Séance liée (facultatif)</label>
    <select id="mkPShoot"><option value="">Aucune</option>${sh.map(s => `<option value="${s.id}" ${s.id === v.shoot_id ? 'selected' : ''}>${agEsc(mkShootLabel(s))}</option>`).join('')}</select>
    <label>Titre (pour toi)</label><input id="mkPTitle" value="${agEsc(v.title || '')}" placeholder="Ex : Anniversaire de Kenzo, 5 ans">
    <label>Légende</label><textarea id="mkPCap" rows="6" placeholder="Le texte à publier">${agEsc(v.caption || '')}</textarea>
    <label>Hashtags</label><input id="mkPHash" value="${agEsc(v.hashtags || '')}" placeholder="#Bouaké #PhotographeBouaké">
    <label>Photos</label>
    <div class="mk-thumbs" id="mkPImgs"></div>
    <div class="mk-tools"><button onclick="mkPickFiles('post')">${agIcon('image', 15)} Téléphone / ordi</button><button onclick="mkPickGalerie('post')">${agIcon('users', 15)} Galeries</button><button onclick="mkPickMood('post')">${agIcon('palette', 15)} Moodboards</button></div>
    ${p ? `<label>État</label><div class="ag-pills" id="mkPSt">${[['prevu', 'Prévu'], ['publie', 'Publié'], ['annule', 'Annulé']].map(([k, l]) => `<button data-s="${k}" class="${v.status === k ? 'on' : ''}" onclick="document.querySelectorAll('#mkPSt button').forEach(b=>b.classList.toggle('on', b===this))">${l}</button>`).join('')}</div>` : ''}
    ${mkStudioNotes(v.notes) ? `<label>Studio de publication</label><div class="ag-hint" style="margin:2px 0 6px">Les textes des autres réseaux, le plan de diffusion et le lien sont gardés par le studio.</div>${typeof window.stOuvrirPost === 'function' && p ? `<button class="btn-secondary mk-ib" onclick="agCloseSheet('mkEdit');stOuvrirPost(${p.id})">${agIcon('sparkles', 15)} Ouvrir dans le studio</button>` : ''}`
      : `<label>Notes</label><input id="mkPNotes" value="${agEsc(v.notes || '')}" placeholder="Facultatif">`}
    <button class="btn-primary" id="mkPSave" style="margin-top:12px" onclick="mkSavePost()">${p ? 'Enregistrer' : 'Ajouter au plan'}</button>
    ${p ? `<div class="crm-2" style="margin-top:8px"><button class="btn-secondary" onclick="mkCopyPost(${p.id})">Copier le texte</button><button class="btn-danger" style="padding:12px" onclick="mkDelPost(${p.id})">Supprimer</button></div>` : ''}`);
  mkEditImgs();
}
function mkEditImgs(){
  const box = document.getElementById('mkPImgs'); if(!box || !MK.edit) return;
  const e = MK.edit;
  box.innerHTML = e.images.map((im, i) => `<div class="mk-thumb">${mkImgTag(im)}<button onclick="MK.edit.images.splice(${i},1);mkEditImgs()">×</button></div>`).join('')
    + e.pending.map((im, i) => `<div class="mk-thumb"><img src="${agEsc(im.preview)}" alt=""><button onclick="MK.edit.pending.splice(${i},1);mkEditImgs()">×</button></div>`).join('')
    || '<span class="ag-hint" style="margin:0">Aucune photo</span>';
  mkHydrate(box);
}
async function mkSavePost(){
  const e = MK.edit; if(!e) return;
  const g = k => (document.getElementById(k) || {}).value || '';
  const btn = document.getElementById('mkPSave'); if(btn){ btn.disabled = true; btn.textContent = 'Enregistrement...'; }
  let imgs = e.images.slice();
  if(e.pending.length){ const st = await mkStore(e.pending, false); imgs = imgs.concat(st.images); }
  const stBtn = document.querySelector('#mkPSt button.on');
  const data = { network: g('mkPNet'), kind: g('mkPKind').trim() || null, date: g('mkPDate') || mkDay(), heure: g('mkPHeure') || null,
    shoot_id: g('mkPShoot') ? Number(g('mkPShoot')) : null, title: g('mkPTitle').trim() || null, caption: mkClean(g('mkPCap').trim()) || null,
    hashtags: mkClean(g('mkPHash').trim()) || null, images: imgs };
  if(document.getElementById('mkPNotes')) data.notes = g('mkPNotes').trim() || null;
  if(stBtn){ data.status = stBtn.dataset.s; const p = MK.posts.find(x => x.id === e.id); if(data.status === 'publie' && p && !p.published_at) data.published_at = new Date().toISOString(); }
  let ok;
  if(e.id) ok = await mkUpdatePost(e.id, data);
  else ok = !!(await mkInsertPost(data));
  if(!ok){ if(btn){ btn.disabled = false; btn.textContent = 'Réessayer'; } return; }
  MK.edit = null; agCloseSheet('mkEdit'); agToast('Enregistré'); mkRenderTab();
}
async function mkDelPost(id){
  if(!await agConfirm('Supprimer cette publication du plan ?')) return;
  const { error } = await sb.from('mk_posts').delete().eq('id', id);
  if(error){ agAlert(error.message); return; }
  MK.posts = MK.posts.filter(p => p.id !== id); agCloseSheet('mkEdit'); mkRenderTab();
}

// ============================================================
// 4. MES RESULTATS
// ============================================================
function mkAgg(list, keyFn){
  const g = {};
  list.forEach(p => { const k = keyFn(p); if(k == null) return; const s = p.stats || {};
    const o = g[k] || (g[k] = { k, n: 0, vues: 0, inter: 0, messages: 0, clients: 0 });
    o.n++; o.vues += Number(s.vues) || 0; o.inter += (Number(s.likes) || 0) + (Number(s.commentaires) || 0) + (Number(s.partages) || 0);
    o.messages += Number(s.messages) || 0; o.clients += Number(s.clients) || 0; });
  return Object.values(g).sort((a, b) => (b.clients - a.clients) || (b.inter / b.n - a.inter / a.n));
}
function mkAggTable(rows, label){
  if(!rows.length) return '';
  const best = rows.slice().sort((a, b) => (b.clients - a.clients) || (b.inter / b.n - a.inter / a.n))[0];
  return `<div class="mk-scroll"><table class="mk-table"><tr><th>${label}</th><th>Posts</th><th>Vues</th><th>Réac.</th><th>Msg</th><th>Clients</th></tr>
    ${rows.map(r => `<tr class="${r === best && rows.length > 1 ? 'best' : ''}"><td>${agEsc(r.k)}</td><td>${r.n}</td><td>${Math.round(r.vues / r.n)}</td><td>${Math.round(r.inter / r.n)}</td><td>${r.messages}</td><td>${r.clients}</td></tr>`).join('')}</table></div>`;
}
function mkSlot(h){ const n = parseInt(String(h || '').slice(0, 2), 10); if(isNaN(n)) return null; return n < 12 ? 'Matin (avant 12 h)' : n < 15 ? 'Midi (12 h - 15 h)' : n < 18 ? 'Après-midi (15 h - 18 h)' : n < 21 ? 'Soir (18 h - 21 h)' : 'Nuit (après 21 h)'; }
function mkResHtml(){
  const pub = MK.posts.filter(p => p.status === 'publie').sort((a, b) => String(b.published_at || b.date).localeCompare(String(a.published_at || a.date)));
  const withS = pub.filter(p => mkHasStats(p) && !p.stats.ignore);
  const cl = (typeof clients !== 'undefined' ? clients : []).filter(c => (typeof estClient !== 'function' || estClient(c)));
  const src = {}; cl.forEach(c => { const k = c.source || (c.parrain_id ? 'Parrainage' : null); if(k) src[k] = (src[k] || 0) + 1; });
  const srcRows = Object.entries(src).sort((a, b) => b[1] - a[1]); const srcMax = srcRows.length ? srcRows[0][1] : 1;
  const unknown = cl.filter(c => !c.source && !c.parrain_id).length;
  const tot = k => withS.reduce((s, p) => s + (Number(p.stats[k]) || 0), 0);
  const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  return `
    <div class="ag-total"><div class="lbl">Mes résultats</div><div class="amt">${tot('clients')} <small>client${tot('clients') > 1 ? 's' : ''} grâce aux posts</small></div>
      <div class="split"><div>Publiés<b>${pub.length}</b></div><div>Vues<b>${agN(tot('vues'))}</b></div><div>Messages<b>${tot('messages')}</b></div></div></div>
    <button class="btn-primary" style="width:100%;margin-bottom:14px" ${MK.busy ? 'disabled' : ''} onclick="mkBilan()">${MK.busy === 'bilan' ? "L'agent analyse ta semaine..." : 'Bilan de la semaine'}</button>
    <div class="mk-card"><h3>${agIcon('note', 18)} Mes publications</h3>
      ${pub.length ? pub.slice(0, 30).map(p => { const s = p.stats || {};
        return `<div class="mk-line"><div class="d"><b>${agEsc(p.title || p.kind || 'Publication')}</b><span>${agEsc(p.network)} · ${agEsc(mkDateTxt(p.published_at || p.date))}</span>
          ${mkHasStats(p) && !s.ignore ? `<div class="mk-mini">${MK_STATS.filter(([k]) => s[k] != null && s[k] !== '').map(([k, l]) => `<span>${l} <b>${s[k]}</b></span>`).join('')}</div>` : ''}</div>
          <button onclick="mkStatsOpen(${p.id})">${mkHasStats(p) ? 'Modifier' : 'Donner les chiffres'}</button></div>`; }).join('')
        : '<div class="ag-hint" style="margin:0">Quand tu publies, touche "Je l\'ai publié" dans Aujourd\'hui. Tu pourras ensuite noter les chiffres ici.</div>'}
    </div>
    <div class="mk-card"><h3>${agIcon('star', 18)} Ce qui marche</h3>
      ${withS.length ? `
        <div class="ag-hint" style="margin:0 0 6px">Vues et Réac. (j'aime + commentaires + partages) = moyenne par post. Msg = messages reçus. La ligne en couleur est celle qui marche le mieux.</div>
        <h4 class="crm-h4" style="margin:10px 0 4px">Par réseau</h4>${mkAggTable(mkAgg(withS, p => p.network), 'Réseau')}
        <h4 class="crm-h4" style="margin:14px 0 4px">Par type de post</h4>${mkAggTable(mkAgg(withS, p => p.kind || 'Autre'), 'Type')}
        <h4 class="crm-h4" style="margin:14px 0 4px">Par jour</h4>${mkAggTable(mkAgg(withS, p => p.date ? jours[new Date(p.date + 'T12:00:00').getDay()] : null), 'Jour')}
        <h4 class="crm-h4" style="margin:14px 0 4px">Par heure</h4>${mkAggTable(mkAgg(withS, p => mkSlot(p.heure)), 'Moment')}`
        : '<div class="ag-hint" style="margin:0">Note les chiffres de quelques publications pour voir ici ce qui marche le mieux (réseau, type, jour, heure).</div>'}
    </div>
    <div class="mk-card"><h3>${agIcon('users', 18)} D'où viennent mes vrais clients</h3>
      ${srcRows.length ? srcRows.map(([k, n]) => `<div class="mk-bar"><span>${agEsc(k)}</span><div><i style="width:${Math.round(n / srcMax * 100)}%"></i></div><b>${n}</b></div>`).join('') : ''}
      ${unknown ? `<div class="ag-hint">${unknown} client${unknown > 1 ? 's' : ''} sans source notée. Pense à demander "Comment vous m'avez connu ?" et à le noter dans la fiche client.</div>` : ''}
      ${!srcRows.length && !unknown ? '<div class="ag-hint" style="margin:0">Pas encore de clients.</div>' : ''}
    </div>`;
}
function mkStatsOpen(id){
  const p = MK.posts.find(x => x.id === id); if(!p) return;
  const s = p.stats || {};
  agSheet('mkStats', `<h3>Chiffres de la publication</h3>
    <div class="ag-hint" style="margin-top:0">${mkNetChip(p.network)} ${agEsc(p.title || '')} · ${agEsc(mkDateTxt(p.published_at || p.date))}</div>
    <button class="btn-secondary mk-ib" style="margin:10px 0" id="mkCapBtn" onclick="mkStatsCapture(${id})">${agIcon('image', 16)} Lire une capture de mes statistiques</button>
    <div id="mkCapMsg"></div>
    <div class="mk-stats">${MK_STATS.map(([k, l]) => `<label>${l}<input type="number" inputmode="numeric" min="0" id="mkS_${k}" value="${s[k] != null ? agEsc(s[k]) : ''}"></label>`).join('')}</div>
    <button class="btn-primary" style="margin-top:12px" onclick="mkStatsSave(${id})">Enregistrer</button>
    ${!mkHasStats(p) ? `<button class="btn-secondary" style="margin-top:8px" onclick="mkStatsIgnore(${id})">Je n'ai pas les chiffres</button>` : ''}`);
}
function mkStatsCapture(id){
  const p = MK.posts.find(x => x.id === id); if(!p) return;
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.style.display = 'none';
  inp.onchange = async () => {
    const f = inp.files[0]; inp.remove(); if(!f) return;
    const msg = document.getElementById('mkCapMsg'), btn = document.getElementById('mkCapBtn');
    if(btn){ btn.disabled = true; btn.textContent = "L'IA lit ta capture..."; }
    try {
      const b64 = await mkB64(await mkShrink(f, 1600, 0.85));
      const res = await mkAI({ messages: [{ role: 'user', text: `Voici une capture d'écran des statistiques d'une publication ${p.network}. Lis les chiffres. Réponds UNIQUEMENT en JSON : {"vues":n,"likes":n,"commentaires":n,"partages":n,"messages":n,"remarque":"phrase courte"}. "vues" = vues, impressions ou couverture (prends le plus grand des deux si les deux sont là). "likes" = j'aime ou réactions. Mets null si un chiffre n'apparaît pas. Convertis 1,2 k en 1200 et 1,5 M en 1500000.` }], images: [b64], maxTokens: 600 });
      const j = mkJson(res.text);
      let n = 0;
      ['vues', 'likes', 'commentaires', 'partages', 'messages'].forEach(k => { const v = mkNum(j[k]); const el = document.getElementById('mkS_' + k); if(el && v != null){ el.value = v; el.classList.add('mk-ai'); n++; } });
      if(msg) msg.innerHTML = `<div class="ag-hint" style="margin:0 0 8px">${n ? `${n} chiffre(s) lu(s), en couleur. <b>Vérifie-les</b> avant d'enregistrer.` : "Aucun chiffre trouvé. Tape-les à la main."}${j.remarque ? ' ' + agEsc(mkClean(j.remarque)) : ''}</div>`;
    } catch(e){ if(msg) msg.innerHTML = `<div class="mk-err">${agEsc(e.message || e)}</div>`; }
    if(btn){ btn.disabled = false; btn.innerHTML = `${agIcon('image', 16)} Lire une autre capture`; }
  };
  document.body.appendChild(inp); inp.click();
}
async function mkStatsSave(id){
  const stats = {};
  MK_STATS.forEach(([k]) => { const v = mkNum((document.getElementById('mkS_' + k) || {}).value); if(v != null) stats[k] = Math.max(0, v); });
  if(!Object.keys(stats).length){ agToast('Mets au moins un chiffre', 'error'); return; }
  if(await mkUpdatePost(id, { stats })){
    agCloseSheet('mkStats'); agToast('Chiffres enregistrés'); mkRenderTab();
    // Apprentissage : une lecon courte dans "Ce qu'il sait" (studio.js)
    if(typeof window.stLeconResultat === 'function') try { window.stLeconResultat(MK.posts.find(x => x.id === id)); } catch(e){}
  }
}
async function mkStatsIgnore(id){ if(await mkUpdatePost(id, { stats: { ignore: true } })){ agCloseSheet('mkStats'); mkRenderTab(); } }
async function mkBilan(){
  if(MK.busy) return;
  MK.busy = 'bilan'; mkRenderTab();
  const now = Date.now();
  const inWin = (p, a, b) => { const t = new Date(p.published_at || p.date).getTime(); return t >= now - a * mkDayMs && t < now - b * mkDayMs; };
  const fmt = l => l.map(p => { const s = p.stats || {}; return `- ${p.date} ${p.heure || ''} ${p.network} ${p.kind || ''} "${(p.title || '').slice(0, 50)}" : ${mkHasStats(p) && !s.ignore ? MK_STATS.filter(([k]) => s[k] != null).map(([k]) => k + ' ' + s[k]).join(', ') : 'pas de chiffres'}`; }).join('\n') || '- aucune';
  const pub = MK.posts.filter(p => p.status === 'publie');
  const prevus = MK.posts.filter(p => p.date >= mkAddDays(mkDay(), -7) && p.date < mkDay());
  const q = `Fais le bilan marketing de ma semaine.
Publié ces 7 derniers jours :
${fmt(pub.filter(p => inWin(p, 7, 0)))}
Semaine d'avant :
${fmt(pub.filter(p => inWin(p, 14, 7)))}
Prévu mais pas publié cette semaine : ${prevus.filter(p => p.status === 'prevu').length}.
Dis en quelques lignes ce qui a marché et ce qui n'a pas marché (avec les chiffres), puis donne exactement 3 actions précises pour la semaine prochaine (quoi, où, quand). Sois franc.`;
  try {
    const res = await mkAI({ system: mkSystem(), messages: [{ role: 'user', text: q }] });
    const out = await mkSaveReply({ text: '**Bilan de la semaine**\n\n' + res.text, sources: [] }, { source: 'bilan' });
    agSheet('mkBil', `<h3>Bilan de la semaine</h3><div class="crm-ana" style="padding:0">${mkMd(mkParse(out.row.text).clean)}</div>
      <div class="ag-hint">Ce bilan est aussi gardé dans la discussion.</div>
      <button class="btn-secondary" style="margin-top:10px" onclick="agCloseSheet('mkBil');mkGo('chat')">En parler avec l'agent</button>`);
  } catch(e){ agAlert(e.message || String(e)); }
  MK.busy = false; mkRenderTab();
}

// ============================================================
// 5. CE QUE L'AGENT SAIT DE MOI
// ============================================================
function mkMoiHtml(){
  const used = MK.media.reduce((s, m) => s + (Number(m.size) || 0), 0), pct = Math.min(100, used / MK_QUOTA * 100);
  const groups = Object.keys(MK_MEM).map(k => [k, MK.mem.filter(m => (m.kind || 'profil') === k)]).filter(g => g[1].length);
  const other = MK.mem.filter(m => !MK_MEM[m.kind || 'profil']);
  if(other.length) groups.push(['autre', other]);
  const mo = n => n >= 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' Mo' : Math.round(n / 1024) + ' Ko';
  return `
    <p class="mk-intro">Tout ce que l'agent a retenu sur toi et ton studio. Il s'en sert pour te donner des conseils sur mesure. Corrige ou supprime ce qui est faux.</p>
    <button class="btn-primary mk-ib" style="width:100%;margin-bottom:14px" onclick="mkMemEdit(null)">${agIcon('plus', 15)} Ajouter une info</button>
    ${groups.length ? groups.map(([k, list]) => `<div class="mk-mem-g"><h4>${agEsc(MK_MEM[k] || 'Autre')}</h4><div class="ag-list">${list.map(m => `<div class="mk-mem"><p>${agEsc(m.text)}<small>${agEsc(mkDateTxt(m.updated_at || m.created_at, { day: 'numeric', month: 'short', year: 'numeric' }))}${m.source ? ' · ' + agEsc(m.source) : ''}</small></p>
      <button class="ag-ibtn" title="Modifier" onclick="mkMemEdit(${m.id})">${agIcon('edit', 15)}</button><button class="ag-ibtn" title="Supprimer" onclick="mkMemDel(${m.id})">${agIcon('trash', 15)}</button></div>`).join('')}</div></div>`).join('')
      : '<div class="ag-list"><div class="ag-empty">L\'agent ne sait encore rien de toi. Discute avec lui, ou ajoute une info toi-même (ex : "Mes clients sont surtout des mamans de 25-40 ans").</div></div>'}
    <div class="mk-card" style="margin-top:6px"><h3>${agIcon('image', 18)} Mes photos envoyées<span class="crm-count">${MK.media.length}</span></h3>
      <div class="mk-gauge ${pct >= 80 ? 'warn' : ''}"><i style="width:${Math.max(pct, used ? 1 : 0)}%"></i></div>
      <div class="ag-hint" style="margin:0">${mo(used)} utilisés sur environ 1 Go (${pct < 1 && used ? 'moins de 1' : Math.round(pct)} %).</div>
      ${pct >= 80 ? `<div class="ag-hint warn">Attention : la place est presque pleine. Supprime les photos dont tu n'as plus besoin.</div>` : ''}
      ${MK.media.length ? `<div class="mk-btns" style="margin:10px 0">
          <button onclick="MK.selMode=!MK.selMode;MK.sel.clear();mkRenderTab()">${agIcon('check', 14)} ${MK.selMode ? 'Terminer' : 'Choisir'}</button>
          ${MK.selMode ? `<button onclick="mkMediaAll()">Tout</button><button class="ok" style="color:var(--red)" ${MK.sel.size ? '' : 'disabled'} onclick="mkMediaDel()">${agIcon('trash', 14)} Supprimer (${MK.sel.size})</button>` : ''}
        </div>
        <div class="mk-grid">${MK.media.map(m => `<div class="mk-tile ${MK.sel.has(m.id) ? 'sel' : ''}" onclick="${MK.selMode ? `mkMediaSel(${m.id})` : `mkMediaView(${m.id})`}">${m.path ? mkImgTag({ path: m.path }) : `<img src="${agEsc(m.url || '')}" alt="">`}${MK.selMode ? `<span class="mk-chk">${MK.sel.has(m.id) ? agIcon('check', 12) : ''}</span>` : ''}<small>${agEsc(m.size ? mo(m.size) : (m.source || ''))}</small></div>`).join('')}</div>`
        : '<div class="ag-hint">Les photos que tu envoies à l\'agent apparaissent ici.</div>'}
    </div>`;
}
function mkMemEdit(id){
  const m = id ? MK.mem.find(x => x.id === id) : null;
  agSheet('mkMem', `<h3>${m ? "Modifier l'info" : 'Ajouter une info'}</h3>
    <label>Type</label><select id="mkMK">${Object.entries(MK_MEM).map(([k, l]) => `<option value="${k}" ${(m ? m.kind : 'profil') === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <label>Ce que l'agent doit savoir</label><textarea id="mkMT" rows="3" placeholder="Ex : Je veux surtout plus de mariages et de dots">${agEsc(m ? m.text : '')}</textarea>
    <button class="btn-primary" onclick="mkMemSave(${m ? m.id : 'null'})">Enregistrer</button>`);
}
async function mkMemSave(id){
  const text = mkClean(document.getElementById('mkMT').value.trim()), kind = document.getElementById('mkMK').value;
  if(!text){ agToast('Écris quelque chose', 'error'); return; }
  if(id){
    const patch = { text, kind, updated_at: new Date().toISOString() };
    const { error } = await sb.from('mk_memory').update(patch).eq('id', id);
    if(error){ agAlert(error.message); return; }
    Object.assign(MK.mem.find(x => x.id === id), patch);
  } else {
    const { data, error } = await sb.from('mk_memory').insert({ text, kind, source: 'ajouté par Henzo' }).select().single();
    if(error){ agAlert(error.message); return; }
    MK.mem.push(data);
  }
  agCloseSheet('mkMem'); mkRenderTab();
}
async function mkMemDel(id){
  const m = MK.mem.find(x => x.id === id); if(!m) return;
  if(!await agConfirm(`Supprimer cette info ?\n"${m.text.slice(0, 120)}"`)) return;
  const { error } = await sb.from('mk_memory').delete().eq('id', id);
  if(error){ agAlert(error.message); return; }
  MK.mem = MK.mem.filter(x => x.id !== id); mkRenderTab(); agToast('Info supprimée');
}
function mkMediaSel(id){ MK.sel.has(id) ? MK.sel.delete(id) : MK.sel.add(id); mkRenderTab(); }
function mkMediaAll(){ if(MK.sel.size === MK.media.length) MK.sel.clear(); else MK.media.forEach(m => MK.sel.add(m.id)); mkRenderTab(); }
function mkMediaView(id){
  const m = MK.media.find(x => x.id === id); if(!m) return;
  agSheet('mkMedV', `${m.path ? mkImgTag({ path: m.path }, 'style="width:100%;border-radius:14px"') : `<img src="${agEsc(m.url || '')}" style="width:100%;border-radius:14px" alt="">`}
    <div class="ag-hint">${agEsc(mkDateTxt(m.created_at, { day: 'numeric', month: 'long', year: 'numeric' }))} · ${agEsc(m.source || '')}${m.size ? ' · ' + Math.round(m.size / 1024) + ' Ko' : ''}</div>
    ${m.analyse_ia ? `<div class="crm-ana" style="padding:0">${mkMd(m.analyse_ia.slice(0, 800))}</div>` : ''}
    <button class="btn-danger" style="width:100%;padding:12px;margin-top:12px" onclick="mkMediaDel([${m.id}])">Supprimer la photo</button>`);
  mkHydrate(document.getElementById('mkMedV'));
}
async function mkMediaDel(ids){
  ids = Array.isArray(ids) ? ids : [...MK.sel];
  if(!ids.length) return;
  if(!await agConfirm(`Supprimer ${ids.length} photo${ids.length > 1 ? 's' : ''} ?\nElles disparaissent aussi des anciens messages et publications.`)) return;
  const list = MK.media.filter(m => ids.includes(m.id));
  const paths = list.map(m => m.path).filter(Boolean);
  if(paths.length){ const { error } = await sb.storage.from('marketing').remove(paths); if(error){ agAlert('Erreur : ' + error.message); return; } }
  for(const m of list) await sb.from('mk_media').delete().eq('id', m.id);
  MK.media = MK.media.filter(m => !ids.includes(m.id));
  paths.forEach(p => delete MK.signed[p]);
  MK.sel.clear(); MK.selMode = false; agCloseSheet('mkMedV'); mkRenderTab();
  agToast(`${list.length} photo${list.length > 1 ? 's' : ''} supprimée${list.length > 1 ? 's' : ''}`);
}

// ============================================================
// ENTREES DEPUIS LE RESTE DE L'APP
// ============================================================
window.mkOuvrir = function(sous){
  if(sous) MK.tab = MK_TAB_ALIAS[sous] || (MK_TABS.some(t => t[0] === sous) ? sous : 'chat');
  if(typeof agGoTab === 'function') agGoTab('marketing'); else if(typeof showTab === 'function') showTab('marketing');
  mkRender();
};
window.mkPreparerSeance = async function(shootId){
  const s = mkShoot(shootId);
  MK.tab = 'chat';
  if(typeof agGoTab === 'function') agGoTab('marketing');
  await mkRender();
  if(!s){ agToast('Séance introuvable', 'error'); return; }
  const c = mkClient(s.client_id);
  const q = `Prépare une publication pour ma séance ${s.type || ''} du ${mkDateTxt(s.date, { day: 'numeric', month: 'long' })}${c ? ' avec ' + mkFirst(c) : ''} (séance n°${s.id}). Dis-moi quelles photos choisir, sur quel réseau et quand publier, et donne la légende et les hashtags.`;
  if(MK.busy){ MK.draft = q; mkRenderTab(); return; }
  mkSend(q, { shoot: s.id, hidden: `Mets "shoot_id":${s.id} dans le bloc post.` });
};
window.mkRender = mkRender;
window.mkAI = mkAI;

// Bouton "Publier" sur les seances passees (onglet Seances)
(function mkShootButtons(){
  const add = () => document.querySelectorAll('.item-card .actions').forEach(a => {
    if(a.querySelector('.mk-shoot-btn')) return;
    const m = (a.innerHTML.match(/openShootModal\((\d+)\)/) || [])[1];
    if(!m) return;
    const s = mkShoot(m);
    if(!s || mkCancelled(s) || !s.date || new Date(s.date).getTime() > Date.now()) return;
    const b = document.createElement('button');
    b.className = 'btn-ghost ag-ibtn mk-shoot-btn'; b.title = 'Préparer une publication';
    b.innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v3a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/></svg>';
    b.onclick = () => window.mkPreparerSeance(Number(m));
    a.insertBefore(b, a.querySelector('.ag-ibtn') || null);
  });
  let t = null;
  new MutationObserver(() => { clearTimeout(t); t = setTimeout(add, 150); }).observe(document.body, { childList: true, subtree: true });
  add();
})();

// Lien direct : /?tab=marketing&mk=aujourdhui (ou resultats, plan, discussion, memoire)
(function mkDeepLink(){
  let q = new URLSearchParams(location.search);
  if(!q.get('tab')){ try { const n = performance.getEntriesByType('navigation')[0]; if(n && n.name) q = new URL(n.name).searchParams; } catch(e){} }
  if(q.get('tab') !== 'marketing') return;
  const sous = q.get('mk');
  if(sous) MK.tab = MK_TAB_ALIAS[sous] || 'chat';
  if(location.search.includes('tab=')) { try { localStorage.setItem('active_tab', 'marketing'); } catch(e){} }
  let n = 0;
  const go = () => {
    if(document.getElementById('page-marketing') && !document.body.classList.contains('logged-out') && typeof agGoTab === 'function'){ agGoTab('marketing'); mkRender(); }
    else if(++n < 40) setTimeout(go, 400);
  };
  setTimeout(go, 500);
})();

const _mkShowTab = showTab;
showTab = function(name, btn){ _mkShowTab(name, btn); if(name === 'marketing') mkRender(); };
(async function mkInit(){
  const a = document.querySelector('.page.active');
  if(a && a.id === 'page-marketing') mkRender();
})();
