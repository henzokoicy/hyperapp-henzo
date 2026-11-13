// ============================================================
// HENZO-CLOUD.JS - Lien avec Henzo Cloud (mon coffre à fichiers)
// Étape 1 : connexion unique. Étape 2 : mes fichiers (liste, envoi,
// téléchargement, suppression, recherche, miniatures), corbeille 30 jours,
// déplacer vers le PC pour libérer la place en ligne.
// - La Super App montre sa connexion (Supabase) à Henzo Cloud, qui
//   la vérifie et donne sa propre carte d'entrée : plus de 2e code.
// - La toute première fois seulement : on relie les deux comptes en
//   tapant le nom + code secret de Henzo Cloud.
// - Bouton "Fichiers" dans le menu de gauche et le menu du compte.
// - HC.api(...) servira à l'onglet Fichiers (étape 2).
// Aucune table Supabase ajoutée : l'adresse de Henzo Cloud est dans
// config.js (HENZO_CLOUD_URL) ou gardée sur l'appareil.
// ============================================================
(function(){
if(typeof sb === 'undefined' || typeof agSheet !== 'function') return;

const HC_E = s => (typeof agEsc === 'function' ? agEsc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
const HC_TOAST = m => { if(typeof agToast === 'function') agToast(m); };
// Demande de confirmation : la belle fenêtre de la Super App (agConfirm) quand elle existe.
// (Le confirm() habituel y est remplacé par une fenêtre qui "rejoue" le clic, ce qui ne marche pas ici.)
const hcAsk = msg => (typeof agConfirm === 'function' ? agConfirm(msg) : Promise.resolve(window.confirm(msg)));
const HC_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.8A6 6 0 0 0 4.3 12.6 3.5 3.5 0 0 0 6.5 19z"/></svg>';
const HC_SIZE = n => {
  n = Number(n) || 0;
  if(n < 1024) return n + ' o';
  const u = ['Ko', 'Mo', 'Go', 'To']; let i = -1;
  do { n /= 1024; i++; } while(n >= 1024 && i < 3);
  return n.toFixed(n < 10 ? 1 : 0).replace('.', ',') + ' ' + u[i];
};

// ---------- Réglages ----------
function hcUrl(){
  const fromConfig = typeof HENZO_CLOUD_URL !== 'undefined' ? String(HENZO_CLOUD_URL || '') : '';
  let u = fromConfig;
  if(!u){ try { u = localStorage.getItem('hc_url') || ''; } catch(e){} }
  return u.trim().replace(/\/+$/, '');
}
async function hcSupabase(){
  const { data } = await sb.auth.getSession();
  return data && data.session ? data.session : null;
}
const hcTokKey = uid => 'hc_tok_' + uid;
function hcGetTok(uid){ try { return localStorage.getItem(hcTokKey(uid)); } catch(e){ return null; } }
function hcSetTok(uid, t){ try { t ? localStorage.setItem(hcTokKey(uid), t) : localStorage.removeItem(hcTokKey(uid)); } catch(e){} }

class HcError extends Error { constructor(status, msg, extra){ super(msg); this.status = status; Object.assign(this, extra || {}); } }

async function hcFetch(path, { method = 'GET', body, headers = {}, timeout = 90000 } = {}){
  const base = hcUrl();
  if(!base) throw new HcError(-1, "L'adresse de Henzo Cloud n'est pas encore réglée.");
  let res;
  try {
    res = await fetch(base + '/api' + path, {
      method,
      headers: { 'X-Requested-With': 'henzo', ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout ? AbortSignal.timeout(timeout) : undefined,
    });
  } catch(e){
    throw new HcError(0, 'Henzo Cloud ne répond pas (pas d\'internet, ou le serveur se réveille : réessaie dans une minute).');
  }
  const data = await res.json().catch(() => ({}));
  if(!res.ok) throw new HcError(res.status, data.error || ('Erreur de Henzo Cloud (' + res.status + ').'), data);
  return data;
}

// Obtient (ou réutilise) la carte Henzo Cloud grâce à la connexion Super App.
// Plusieurs demandes en même temps se partagent une seule demande de carte.
let hcPending = null;
function hcConnect(force){
  if(hcPending) return hcPending;
  hcPending = hcConnectNow(force).finally(() => { hcPending = null; });
  return hcPending;
}
async function hcConnectNow(force){
  const s = await hcSupabase();
  if(!s) throw new HcError(401, 'Connecte-toi d\'abord à la Super App.');
  const uid = s.user.id;
  if(!force){
    const t = hcGetTok(uid);
    if(t) return { token: t, uid };
  }
  const r = await hcFetch('/sso/superapp', { method: 'POST', headers: { 'X-Superapp-Token': s.access_token } });
  hcSetTok(uid, r.token);
  return { token: r.token, uid };
}

// Appel à Henzo Cloud avec la carte ; si elle a expiré, on en redemande une (sans code).
async function hcApi(method, path, body){
  let c = await hcConnect(false);
  try {
    return await hcFetch(path, { method, body, headers: { Authorization: 'Bearer ' + c.token } });
  } catch(e){
    if(e.status !== 401) throw e;
    if(hcGetTok(c.uid) === c.token) hcSetTok(c.uid, null); // périmée (sauf si une autre demande l'a déjà remplacée)
    c = await hcConnect(!!hcGetTok(c.uid) ? false : true);
    return hcFetch(path, { method, body, headers: { Authorization: 'Bearer ' + c.token } });
  }
}

async function hcLink(username, password){
  const s = await hcSupabase();
  if(!s) throw new HcError(401, 'Connecte-toi d\'abord à la Super App.');
  const r = await hcFetch('/sso/superapp/link', { method: 'POST', body: { username, password }, headers: { 'X-Superapp-Token': s.access_token } });
  hcSetTok(s.user.id, r.token);
  return r;
}

async function hcUnlink(){
  await hcApi('POST', '/sso/superapp/unlink');
  const s = await hcSupabase();
  try { await hcApi('POST', '/logout'); } catch(e){}
  if(s) hcSetTok(s.user.id, null);
}

// ---------- Fenêtre "Fichiers" ----------
function hcSheet(inner){
  agSheet('hcSheet', `<h3>${HC_ICON} Fichiers (Henzo Cloud)</h3>${inner}`);
}

function hcAskUrl(msg){
  hcSheet(`
    <div class="ag-hint" style="margin-top:0">Henzo Cloud, c'est ton coffre à fichiers (photos, rushes, contrats). Indique son adresse une seule fois : celle de ton site Henzo Cloud sur Render.</div>
    <label>Adresse de Henzo Cloud</label>
    <input id="hcUrlIn" type="url" inputmode="url" placeholder="https://xxx.onrender.com" value="${HC_E(hcUrl())}">
    <div id="hcMsg" class="ag-hint" style="color:var(--red)">${HC_E(msg || '')}</div>
    <button class="btn-primary" onclick="hcSaveUrl()">Continuer</button>`);
}
window.hcSaveUrl = function(){
  let u = (document.getElementById('hcUrlIn').value || '').trim().replace(/\/+$/, '');
  if(u && !/^https?:\/\//.test(u)) u = 'https://' + u;
  if(!/^https:\/\/[^\s/]+$/.test(u)){ hcAskUrl('L\'adresse doit ressembler à https://xxx.onrender.com'); return; }
  try { localStorage.setItem('hc_url', u); } catch(e){}
  hcOpen();
};

function hcAskLink(msg){
  hcSheet(`
    <div class="ag-hint" style="margin-top:0"><b>Une seule fois :</b> relie ta Super App à Henzo Cloud avec ton nom et ton code secret <b>de Henzo Cloud</b>. Ensuite, la Super App t'y connecte toute seule, sans code.</div>
    <label>Nom (Henzo Cloud)</label>
    <input id="hcUser" autocomplete="username" autocapitalize="off">
    <label>Code secret (Henzo Cloud)</label>
    <input id="hcPass" type="password" autocomplete="current-password">
    <div id="hcMsg" class="ag-hint" style="color:var(--red)">${HC_E(msg || '')}</div>
    <button class="btn-primary" id="hcLinkBtn" onclick="hcDoLink()">Relier</button>
    <div class="ag-hint">Adresse utilisée : ${HC_E(hcUrl())} ${typeof HENZO_CLOUD_URL !== 'undefined' && HENZO_CLOUD_URL ? '' : '<a href="#" onclick="hcAskUrl();return false">changer</a>'}</div>`);
}
window.hcAskUrl = hcAskUrl;
window.hcDoLink = async function(){
  const u = document.getElementById('hcUser').value.trim();
  const p = document.getElementById('hcPass').value;
  if(!u || !p){ document.getElementById('hcMsg').textContent = 'Nom et code secret nécessaires.'; return; }
  const b = document.getElementById('hcLinkBtn'); b.disabled = true; b.textContent = 'Connexion... (jusqu\'à une minute si le serveur dormait)';
  try {
    await hcLink(u, p);
    HC_TOAST('Super App reliée à Henzo Cloud');
    hcOpen();
  } catch(e){
    hcAskLink(e.message);
  }
};

window.hcDoUnlink = async function(){
  if(!await hcAsk('Délier la Super App de Henzo Cloud ? Tes fichiers ne sont pas touchés. Pour les revoir ici, il faudra retaper ton nom et ton code secret de Henzo Cloud une fois.')) return;
  try { await hcUnlink(); HC_ST.user = null; HC_TOAST('Lien défait'); } catch(e){ alert(e.message); }
  hcOpen();
};

async function hcOpen(){
  if(!hcUrl()){ hcAskUrl(); return; }
  if(HC_ST.user && HC_ST.usage) hcManager(HC_ST.user, HC_ST.files, HC_ST.usage); // tout de suite, puis mise à jour
  else hcSheet(`<div class="ag-empty">Connexion à Henzo Cloud... (jusqu'à une minute si le serveur dormait)</div>`);
  try {
    const me = await hcApi('GET', '/me'); // d'abord la connexion, puis le reste en même temps
    const [files, usage] = await Promise.all([hcApi('GET', '/files'), hcApi('GET', '/usage')]);
    hcManager(me.user, files.files || [], usage);
  } catch(e){
    if(e.needsLink || e.status === 404){ hcAskLink(); return; }
    if(e.status === -1){ hcAskUrl(); return; }
    hcSheet(`<div class="ag-hint" style="margin-top:0;color:var(--red)">${HC_E(e.message)}</div>
      <button class="btn-primary" onclick="hcOpenFiles()">Réessayer</button>
      ${typeof HENZO_CLOUD_URL !== 'undefined' && HENZO_CLOUD_URL ? '' : '<button class="btn-secondary" style="margin-top:8px" onclick="hcAskUrl()">Changer l\'adresse</button>'}`);
  }
}

// ============================================================
// ÉTAPE 2 : MES FICHIERS (liste, envoi, téléchargement, suppression)
// Les fichiers vont directement de l'appareil vers le stockage (Cloudflare ou ton PC),
// par morceaux, avec reprise : la Super App ne fait que demander les "laissez-passer".
// ============================================================
const HC_ST = { user: null, files: [], usage: null, q: '', ups: [], busy: false };
const HC_IC = (n, s) => (typeof agIcon === 'function' ? agIcon(n, s || 16) : '');
const HC_PC = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>';
const HC_DATE = d => { try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); } catch(e){ return ''; } };

function hcStyle(){
  if(document.getElementById('hcStyle')) return;
  const st = document.createElement('style'); st.id = 'hcStyle';
  st.textContent = `
    #hcSheet .modal{max-width:640px}
    .hc-usage{color:var(--muted);font-size:.85rem;margin:0 0 10px}
    .hc-row2{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px}
    .hc-row2 .btn-primary{flex:1;min-width:180px;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;margin:0}
    .hc-row2 select{flex:0 0 auto;width:auto;margin:0}
    .hc-search{width:100%;margin:6px 0 4px}
    .hc-up{padding:8px 0;border-top:1px solid var(--border);font-size:.85rem}
    .hc-up .bar{height:6px;background:var(--border);border-radius:3px;overflow:hidden;margin-top:5px}
    .hc-up .bar i{display:block;height:100%;width:0;background:var(--accent);transition:width .4s}
    .hc-up .m{color:var(--muted);font-size:.8rem;margin-top:3px}
    .hc-up.fail .m{color:var(--red)} .hc-up.ok .m{color:var(--green)}
    .hc-list{margin-top:6px}
    .hc-f{display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--border)}
    .hc-th{flex:0 0 46px;width:46px;height:46px;border-radius:8px;background:var(--card2,var(--border));display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:.65rem;font-weight:700;color:var(--muted)}
    .hc-th img{width:100%;height:100%;object-fit:cover;cursor:pointer}
    .hc-in{flex:1;min-width:0}
    .hc-n{word-break:break-word;font-size:.92rem;line-height:1.25}
    .hc-d{color:var(--muted);font-size:.78rem;margin-top:2px}
    .hc-d .off{color:var(--red)}
    .hc-a{display:flex;gap:4px;flex:0 0 auto}
    .hc-a button{background:none;border:1px solid var(--border);border-radius:8px;padding:7px;color:var(--text);cursor:pointer;line-height:0;margin:0;width:auto}
    .hc-a button:disabled{opacity:.35;cursor:not-allowed}
    .hc-a button.del{color:var(--red)}
    .hc-up .hc-a button{line-height:1.2;padding:6px 10px;display:inline-flex;gap:5px;align-items:center;font-size:.8rem}
    .hc-foot{margin-top:14px;display:flex;gap:8px;flex-wrap:wrap}
    .hc-foot button{flex:1;margin:0;display:inline-flex;align-items:center;justify-content:center;gap:6px}
  `;
  document.head.appendChild(st);
}

function hcManager(user, files, usage){
  hcStyle();
  HC_ST.user = user; HC_ST.files = files; HC_ST.usage = usage;
  const pcOn = usage.pc && usage.pc.configured;
  hcSheet(`
    <div class="hc-usage" id="hcUsage"></div>
    <div class="hc-row2">
      <label class="btn-primary">${HC_IC('download', 16).replace('<svg', '<svg style="transform:rotate(180deg)"')} Envoyer des fichiers
        <input type="file" multiple hidden onchange="hcPicked(this)"></label>
      ${pcOn ? `<select id="hcTarget" title="Où ranger les fichiers"><option value="auto">Automatique</option><option value="pc">Sur mon PC</option></select>` : ''}
    </div>
    <div id="hcUps"></div>
    <input class="hc-search" id="hcSearch" type="search" placeholder="Rechercher un fichier..." value="${HC_E(HC_ST.q)}" oninput="hcSearch(this.value)">
    <div class="hc-list" id="hcList"></div>
    <div class="hc-foot">
      <button class="btn-secondary" onclick="hcRefresh()">${HC_IC('refresh', 14)} Rafraîchir</button>
      <button class="btn-secondary" onclick="hcTrash()">${HC_IC('trash', 14)} Corbeille</button>
      <button class="btn-secondary" onclick="hcDoUnlink()">Délier</button>
    </div>
    <div class="ag-hint">Connecté en tant que <b>${HC_E(user.username)}</b>, sans code : la Super App s'en charge.</div>`);
  hcRenderUsage(); hcRenderUps(); hcRenderList();
}

function hcRenderUsage(){
  const el = document.getElementById('hcUsage'); const u = HC_ST.usage; if(!el || !u) return;
  let t = `${HC_ST.files.length} fichier${HC_ST.files.length > 1 ? 's' : ''} · Stockage en ligne : ${HC_SIZE(u.used)} sur ${HC_SIZE(u.limit)} (à vous tous).`;
  if(u.trash) t += ` Corbeille : ${HC_SIZE(u.trash)}.`;
  let pcOff = '';
  if(u.pc && u.pc.configured){
    if(u.pc.online) t += ` Ton PC est allumé${u.pc.freeBytes != null ? ` (${HC_SIZE(u.pc.freeBytes)} libres)` : ''}.`;
    else {
      const ago = u.pc.lastSeen ? Math.round((Date.now() - new Date(u.pc.lastSeen)) / 60000) : null;
      pcOff = `<div class="ag-hint" style="color:var(--red);margin:6px 0 0">Le site ne reçoit pas de nouvelles de ton PC (${ago == null ? 'jamais reçu' : ago < 60 ? `dernières nouvelles il y a ${ago} min` : `dernières nouvelles le ${HC_DATE(u.pc.lastSeen)}`}). Vérifie sur le PC que l'app Henzo Cloud est lancée : sa page <b>http://localhost:8788</b> dit ce qui ne va pas.
        <button class="btn-secondary" style="margin-top:6px;width:auto;padding:6px 12px" onclick="hcRefresh()">Vérifier de nouveau</button></div>`;
    }
  }
  el.innerHTML = HC_E(t) + pcOff;
}

function hcRenderList(){
  const box = document.getElementById('hcList'); if(!box) return;
  const q = HC_ST.q.trim().toLowerCase();
  const L = q ? HC_ST.files.filter(f => f.name.toLowerCase().includes(q)) : HC_ST.files;
  if(!L.length){ box.innerHTML = `<div class="ag-empty">${q ? 'Aucun fichier ne correspond.' : 'Aucun fichier pour l\'instant. Touche « Envoyer des fichiers ».'}</div>`; return; }
  box.innerHTML = L.map(f => {
    const img = /^image\//.test(f.mime || '') && !f.offline;
    const ext = (f.name.split('.').pop() || '').slice(0, 4).toUpperCase();
    const where = f.location === 'pc' ? (f.offline ? ' · <span class="off">Sur le PC, hors ligne</span>' : ' · Sur le PC')
      : f.moving ? ' · <span style="color:var(--accent)">Déplacement vers le PC...</span>'
      : f.toPc ? ' · <span style="color:var(--accent)">En ligne, ira sur le PC quand il sera rallumé</span>' : '';
    const canMove = f.location !== 'pc' && HC_ST.usage && HC_ST.usage.pc && HC_ST.usage.pc.configured;
    return `<div class="hc-f">
      <div class="hc-th">${img ? `<img alt="" data-hcid="${HC_E(f.id)}" onclick="hcDownload('${HC_E(f.id)}', true)">` : HC_E(ext)}</div>
      <div class="hc-in"><div class="hc-n">${HC_E(f.name)}</div><div class="hc-d">${HC_SIZE(f.size)} · ${HC_DATE(f.createdAt)}${where}</div></div>
      <div class="hc-a">
        <button title="Télécharger" onclick="hcDownload('${HC_E(f.id)}')" ${f.offline ? 'disabled' : ''}>${HC_IC('download', 16)}</button>
        ${canMove ? `<button title="Déplacer sur mon PC (libère la place en ligne)" onclick="hcMove('${HC_E(f.id)}')" ${f.moving || f.toPc ? 'disabled' : ''}>${HC_PC}</button>` : ''}
        <button class="del" title="Mettre à la corbeille" onclick="hcDelete('${HC_E(f.id)}')">${HC_IC('trash', 16)}</button>
      </div></div>`;
  }).join('');
  L.filter(f => f.moving).forEach(f => hcWatchMove(f.id));
  // Miniatures : chargées seulement quand elles apparaissent à l'écran.
  const imgs = box.querySelectorAll('img[data-hcid]');
  const load = im => { const id = im.dataset.hcid; delete im.dataset.hcid; hcApi('GET', `/files/${id}/download`).then(r => { im.src = r.url; }).catch(() => {}); };
  if('IntersectionObserver' in window){
    const ob = new IntersectionObserver(en => en.forEach(e => { if(e.isIntersecting){ ob.unobserve(e.target); load(e.target); } }), { rootMargin: '200px' });
    imgs.forEach(im => ob.observe(im));
  } else imgs.forEach(load);
}

window.hcSearch = v => { HC_ST.q = v; hcRenderList(); };

window.hcRefresh = async function(){
  try {
    const [files, usage] = await Promise.all([hcApi('GET', '/files'), hcApi('GET', '/usage')]);
    HC_ST.files = files.files || []; HC_ST.usage = usage;
    hcRenderUsage(); hcRenderList();
  } catch(e){ HC_TOAST(e.message); }
};

window.hcDownload = async function(id, view){
  const f = HC_ST.files.find(x => x.id === id);
  if(f && f.offline){ alert('Ce fichier est sur ton PC, qui est éteint. Rallume-le puis réessaie.'); return; }
  try {
    const { url } = await hcApi('GET', `/files/${id}/download`);
    if(view){ window.open(url, '_blank', 'noopener'); return; }
    const a = document.createElement('a'); a.href = url; a.rel = 'noopener';
    if(f) a.download = f.name;
    document.body.appendChild(a); a.click(); a.remove();
  } catch(e){ alert(e.message); }
};

window.hcDelete = async function(id){
  const f = HC_ST.files.find(x => x.id === id); if(!f) return;
  if(!await hcAsk(`Mettre « ${f.name} » à la corbeille ?\nTu pourras le récupérer pendant 30 jours (bouton Corbeille).`)) return;
  try {
    await hcApi('DELETE', `/files/${id}`);
    HC_ST.files = HC_ST.files.filter(x => x.id !== id);
    hcRenderList(); hcRefresh();
    HC_TOAST('Mis à la corbeille');
  } catch(e){ alert(e.message); }
};

// ---------- Déplacer vers le PC (libère la place en ligne) ----------
const HC_MOVING = new Set();
window.hcMove = async function(id){
  const f = HC_ST.files.find(x => x.id === id); if(!f) return;
  if(!await hcAsk(`Déplacer « ${f.name} » sur ton PC ?\n\nÇa libère ${HC_SIZE(f.size)} en ligne. Le fichier reste dans ta liste et se télécharge quand ton PC est allumé.`)) return;
  try {
    await hcApi('POST', `/files/${id}/move-to-pc`, {});
    f.moving = true; hcRenderList();
    HC_TOAST('Déplacement vers le PC lancé');
  } catch(e){ alert(e.message); }
};
async function hcWatchMove(id){
  if(HC_MOVING.has(id)) return;
  HC_MOVING.add(id);
  try {
    for(let i = 0; i < 2000; i++){
      await hcSleep(4000);
      const st = await hcApi('GET', `/files/${id}/move`);
      if(st.state === 'done' || st.state === 'none'){ if(st.state === 'done') HC_TOAST('Fichier rangé sur le PC'); break; }
      if(st.state === 'error'){ alert(st.error); break; }
      if(!document.getElementById('hcList')) break; // fenêtre fermée : on reprendra à la prochaine ouverture
    }
  } catch(e){}
  HC_MOVING.delete(id);
  hcRefresh();
}

// ---------- Corbeille ----------
window.hcTrash = async function(){
  hcStyle();
  hcSheet(`<div class="ag-empty">Chargement de la corbeille...</div>`);
  try {
    const { files, days } = await hcApi('GET', '/trash');
    const total = files.reduce((s, f) => s + f.size, 0);
    hcSheet(`
      <div class="ag-hint" style="margin-top:0">Les fichiers supprimés restent ici <b>${days} jours</b>, puis partent pour de bon. Ils prennent encore de la place tant qu'ils sont ici${total ? ` (${HC_SIZE(total)})` : ''}.</div>
      <div class="hc-list">${files.length ? files.map(f => `<div class="hc-f">
        <div class="hc-in"><div class="hc-n">${HC_E(f.name)}</div><div class="hc-d">${HC_SIZE(f.size)} · part pour de bon dans ${f.daysLeft} jour${f.daysLeft > 1 ? 's' : ''}${f.location === 'pc' ? ' · sur le PC' : ''}</div></div>
        <div class="hc-a">
          <button title="Restaurer" onclick="hcRestore('${HC_E(f.id)}')">${HC_IC('refresh', 16)}</button>
          <button class="del" title="Supprimer pour de bon" onclick="hcKill('${HC_E(f.id)}')">${HC_IC('trash', 16)}</button>
        </div></div>`).join('') : '<div class="ag-empty">La corbeille est vide.</div>'}</div>
      <div class="hc-foot">
        <button class="btn-secondary" onclick="hcOpenFiles()">← Mes fichiers</button>
        ${files.length ? `<button class="btn-secondary" style="color:var(--red)" onclick="hcEmptyTrash()">Vider la corbeille</button>` : ''}
      </div>`);
  } catch(e){
    hcSheet(`<div class="ag-hint" style="color:var(--red)">${HC_E(e.message)}</div><button class="btn-secondary" onclick="hcOpenFiles()">← Mes fichiers</button>`);
  }
};
window.hcRestore = async function(id){
  try { await hcApi('POST', `/trash/${id}/restore`, {}); HC_TOAST('Fichier restauré'); hcTrash(); } catch(e){ alert(e.message); }
};
window.hcKill = async function(id){
  if(!await hcAsk('Supprimer ce fichier pour toujours ? Impossible de revenir en arrière.')) return;
  try { await hcApi('DELETE', `/trash/${id}`); hcTrash(); } catch(e){ alert(e.message); }
};
window.hcEmptyTrash = async function(){
  if(!await hcAsk('Vider la corbeille ? Tous ces fichiers seront supprimés pour toujours.')) return;
  try { const r = await hcApi('POST', '/trash/empty', {}); if(r.message) alert(r.message); hcTrash(); } catch(e){ alert(e.message); }
};

// ---------- Envoi par morceaux, avec reprise ----------
const HC_PARALLEL = 3, HC_RETRIES = 5;
const hcSleep = ms => new Promise(r => setTimeout(r, ms));

function hcRenderUps(){
  const box = document.getElementById('hcUps'); if(!box) return;
  box.innerHTML = HC_ST.ups.map(u => `<div class="hc-up ${u.state}">
    <div>${HC_E(u.name)} <span style="color:var(--muted)">(${HC_SIZE(u.size)})</span></div>
    ${u.state === 'ok' ? '' : `<div class="bar"><i style="width:${u.pct}%"></i></div>`}
    <div class="m">${HC_E(u.msg)}</div>
    ${u.state === 'fail' ? `<div class="hc-a" style="margin-top:6px">
      ${u.file ? `<button onclick="hcRetry(${u.id})">${HC_IC('refresh', 14)} Réessayer</button>` : ''}
      <button onclick="hcForget(${u.id})">Retirer</button></div>` : ''}</div>`).join('');
}

// Réessayer un envoi raté : il reprend où il s'était arrêté (les morceaux déjà envoyés sont gardés).
window.hcRetry = function(id){
  const u = HC_ST.ups.find(x => x.id === id); if(!u || !u.file) return;
  u.state = ''; u.msg = 'En attente...';
  const t = document.getElementById('hcTarget'); if(t) u.target = t.value;
  hcRenderUps(); hcQueue();
};
window.hcForget = function(id){ HC_ST.ups = HC_ST.ups.filter(x => x.id !== id); hcRenderUps(); };
let hcUpId = 0;

window.hcPicked = function(input){
  const picked = [...input.files]; input.value = '';
  const target = document.getElementById('hcTarget')?.value || 'auto';
  for(const file of picked) HC_ST.ups.unshift({ id: ++hcUpId, file, name: file.name, size: file.size, pct: 0, msg: 'En attente...', state: '', target });
  hcRenderUps();
  hcQueue();
};

async function hcQueue(){
  if(HC_ST.busy) return;
  HC_ST.busy = true;
  try {
    for(;;){
      const u = HC_ST.ups.slice().reverse().find(x => x.state === ''); // le plus ancien d'abord
      if(!u) break;
      u.state = 'run';
      await hcUploadOne(u);
    }
  } finally {
    HC_ST.busy = false;
    // On garde seulement les 5 derniers envois réussis à l'écran.
    let okSeen = 0; HC_ST.ups = HC_ST.ups.filter(u => u.state !== 'ok' || ++okSeen <= 5);
    hcRenderUps();
  }
}

function hcPut(url, blob, onProgress){
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('PUT', url);
    x.upload.onprogress = e => onProgress(e.loaded);
    x.onload = () => (x.status >= 200 && x.status < 300 ? resolve() : reject(new Error('Refus du stockage (' + x.status + ')')));
    x.onerror = () => reject(new Error('Connexion perdue'));
    x.send(blob);
  });
}

async function hcUploadOne(u){
  const file = u.file;
  const set = (pct, msg) => { if(pct != null) u.pct = pct; if(msg != null) u.msg = msg; hcRenderUps(); };
  // Même "empreinte" que le site Henzo Cloud : un envoi coupé reprend, même commencé sur le site.
  const fingerprint = `${file.name}|${file.size}|${file.lastModified}`;
  try {
    set(0, 'Préparation...');
    const init = await hcApi('POST', '/uploads/init', { name: file.name, size: file.size, type: file.type, fingerprint, target: u.target });
    const { fileId, partSize, totalParts } = init;
    const done = new Set(init.doneParts);
    const sizeOf = n => Math.min(partSize, file.size - (n - 1) * partSize);
    const live = new Map();
    let finished = [...done].reduce((s, n) => s + sizeOf(n), 0);
    const refresh = () => {
      const cur = [...live.values()].reduce((s, v) => s + v, 0);
      const pct = file.size ? Math.min(100, ((finished + cur) / file.size) * 100) : 100;
      set(pct, (init.resumed ? 'Reprise... ' : '') + Math.floor(pct) + ' %');
    };
    refresh();
    const todo = [];
    for(let n = 1; n <= totalParts; n++) if(!done.has(n)) todo.push(n);
    const worker = async () => {
      while(todo.length){
        const n = todo.shift();
        const blob = file.slice((n - 1) * partSize, (n - 1) * partSize + sizeOf(n));
        for(let attempt = 1; ; attempt++){
          try {
            const { urls } = await hcApi('POST', `/uploads/${fileId}/parts`, { partNumbers: [n] });
            await hcPut(urls[n], blob, loaded => { live.set(n, loaded); refresh(); });
            break;
          } catch(err){
            live.delete(n);
            if(attempt >= HC_RETRIES) throw err;
            set(null, `Problème de connexion, nouvel essai (${attempt}/${HC_RETRIES - 1})...`);
            await hcSleep(1000 * 2 ** attempt);
          }
        }
        live.delete(n); finished += sizeOf(n); refresh();
      }
    };
    await Promise.all(Array.from({ length: Math.min(HC_PARALLEL, todo.length) }, worker));
    set(100, 'Finalisation...');
    await hcApi('POST', `/uploads/${fileId}/complete`, {});
    u.state = 'ok'; u.file = null;
    set(100, init.waitingForPc ? 'Terminé. Ton PC est éteint : le fichier attend en ligne et ira dessus tout seul quand il sera rallumé.' : 'Terminé');
    hcRefresh();
  } catch(e){
    u.state = 'fail'; // on garde le fichier pour le bouton Réessayer
    set(null, `${e.message} Touche « Réessayer » : l'envoi reprendra où il s'était arrêté.`);
  }
}

// Fermer la Super App pendant un envoi : on prévient.
window.addEventListener('beforeunload', e => { if(HC_ST.busy){ e.preventDefault(); e.returnValue = ''; } });

// ---------- Boutons dans les menus ----------
function hcButtons(){
  const th = document.querySelector('.drawer-nav.ag-theme-btn');
  if(th && !document.querySelector('.drawer-nav.hc-drawer')){
    const b = document.createElement('button'); b.className = 'drawer-nav hc-drawer';
    b.innerHTML = `<span class="nav-icon">${HC_ICON}</span><span>Fichiers</span>`;
    b.onclick = () => { if(typeof closeDrawer === 'function') closeDrawer(); hcOpen(); };
    th.parentElement.insertBefore(b, th);
  }
  const um = document.querySelector('.user-menu-items');
  if(um && !um.querySelector('.hc-um')){
    const b = document.createElement('button'); b.className = 'hc-um';
    b.innerHTML = `<span class="icon">${HC_ICON}</span><span>Fichiers (Henzo Cloud)</span>`;
    b.onclick = () => { if(typeof closeUserMenu === 'function') closeUserMenu(); hcOpen(); };
    um.insertBefore(b, um.firstChild);
  }
}
// Les menus apparaissent après la connexion : on vérifie chaque seconde jusqu'à les trouver.
const timer = setInterval(() => { hcButtons(); if(document.querySelector('.hc-drawer') && document.querySelector('.hc-um')) clearInterval(timer); }, 1000);

window.hcOpenFiles = hcOpen;
window.HC = { api: hcApi, url: hcUrl, connect: hcConnect, open: hcOpen };
})();
