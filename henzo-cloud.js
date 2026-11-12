// ============================================================
// HENZO-CLOUD.JS - Lien avec Henzo Cloud (mon coffre à fichiers)
// Étape 1 : connexion unique.
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
  if(!confirm('Délier la Super App de Henzo Cloud ? Tes fichiers ne sont pas touchés. Pour les revoir ici, il faudra retaper ton nom et ton code secret de Henzo Cloud une fois.')) return;
  try { await hcUnlink(); HC_TOAST('Lien défait'); } catch(e){ alert(e.message); }
  hcOpen();
};

async function hcOpen(){
  if(!hcUrl()){ hcAskUrl(); return; }
  hcSheet(`<div class="ag-empty">Connexion à Henzo Cloud... (jusqu'à une minute si le serveur dormait)</div>`);
  try {
    const me = await hcApi('GET', '/me'); // d'abord la connexion, puis le reste en même temps
    const [files, usage] = await Promise.all([hcApi('GET', '/files'), hcApi('GET', '/usage')]);
    const n = (files.files || []).length;
    const pc = usage.pc && usage.pc.configured ? (usage.pc.online ? 'Ton PC est allumé.' : 'Ton PC est éteint : ses fichiers sont indisponibles pour le moment.') : '';
    hcSheet(`
      <div class="ag-hint" style="margin-top:0;color:var(--green)"><b>Connecté à Henzo Cloud</b> en tant que <b>${HC_E(me.user.username)}</b>, sans code : la Super App s'en charge.</div>
      <p><b>${n}</b> fichier${n > 1 ? 's' : ''} dans ton coffre.<br>Stockage en ligne : ${HC_SIZE(usage.used)} sur ${HC_SIZE(usage.limit)}. ${HC_E(pc)}</p>
      <div class="ag-hint">Bientôt ici : la liste de tes fichiers, l'envoi et le téléchargement, et les fichiers de chaque client et shooting. En attendant, ils sont sur le site Henzo Cloud.</div>
      <a class="btn-secondary" style="display:block;text-align:center;text-decoration:none;margin-top:8px" href="${HC_E(hcUrl())}" target="_blank" rel="noopener">Ouvrir le site Henzo Cloud</a>
      <button class="btn-secondary" style="margin-top:8px" onclick="hcDoUnlink()">Délier</button>`);
  } catch(e){
    if(e.needsLink || e.status === 404){ hcAskLink(); return; }
    if(e.status === -1){ hcAskUrl(); return; }
    hcSheet(`<div class="ag-hint" style="margin-top:0;color:var(--red)">${HC_E(e.message)}</div>
      <button class="btn-primary" onclick="hcOpenFiles()">Réessayer</button>
      ${typeof HENZO_CLOUD_URL !== 'undefined' && HENZO_CLOUD_URL ? '' : '<button class="btn-secondary" style="margin-top:8px" onclick="hcAskUrl()">Changer l\'adresse</button>'}`);
  }
}

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
