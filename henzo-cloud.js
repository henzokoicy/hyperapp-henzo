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
const HC_ST = { user: null, files: [], usage: null, q: '', ups: [], busy: false, sel: new Set(), trash: [], tsel: new Set(), days: 30 };
const HC_IC = (n, s) => (typeof agIcon === 'function' ? agIcon(n, s || 16) : '');
const HC_PC = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>';
const HC_DATE = d => { try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); } catch(e){ return ''; } };

// ---------- Nom de cet appareil (pour savoir d'où vient chaque fichier) ----------
function hcGuessDevice(){
  const ua = navigator.userAgent || '';
  if(/iPhone/.test(ua)) return 'iPhone';
  if(/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad';
  if(/Android/.test(ua)){ const m = /Android[^;]*; ([^;)]+?)(?: Build|\))/.exec(ua); return 'Android' + (m && m[1].trim() !== 'K' ? ' ' + m[1].trim() : ''); }
  if(/Windows/.test(ua)) return 'PC Windows';
  if(/Mac/.test(ua)) return 'Mac';
  if(/CrOS/.test(ua)) return 'Chromebook';
  if(/Linux/.test(ua)) return 'PC Linux';
  return 'Navigateur';
}
function hcDevice(){
  let v = ''; try { v = localStorage.getItem('hc_device') || ''; } catch(e){}
  return v.trim() || hcGuessDevice();
}
window.hcSetDevice = function(input){
  try { localStorage.setItem('hc_device', input.value.trim()); } catch(e){}
  input.value = hcDevice();
};
const HC_DEV_IC = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/></svg>';

function hcStyle(){
  if(document.getElementById('hcStyle')) return;
  const st = document.createElement('style'); st.id = 'hcStyle';
  st.textContent = `
    #hcSheet .modal{max-width:640px}
    #hcSheet{--hc-ga:var(--grad-a, var(--accent-2));--hc-gb:var(--grad-b, var(--accent))}
    .hc-store{position:relative;border-radius:24px;padding:18px 18px 16px;margin:0 0 14px;background:linear-gradient(165deg,var(--card3),var(--card));border:1px solid var(--border-2);box-shadow:0 24px 40px -24px rgba(0,0,0,.65),inset 0 1px 0 rgba(255,255,255,.06)}
    .hc-store-h{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
    .hc-store-h b{font-size:1.05rem;font-weight:600}
    .hc-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:999px;border:1px solid var(--border-2);background:color-mix(in srgb,var(--card) 70%,transparent);font-size:.78rem;color:var(--text-2)}
    .hc-chip .dot{width:7px;height:7px;border-radius:50%;background:var(--hc-gb);box-shadow:0 0 8px var(--hc-gb)}
    .hc-chip.off{color:var(--red)} .hc-chip.off .dot{background:var(--red);box-shadow:none}
    .hc-store-pct{font-size:2.7rem;font-weight:500;letter-spacing:-.04em;line-height:1;margin:12px 0 14px}
    .hc-store-pct span{color:var(--muted);font-weight:400}
    .hc-store-bar{position:relative;height:44px;border-radius:999px;background:color-mix(in srgb,var(--muted) 30%,transparent)}
    .hc-store-bar i{position:absolute;left:0;top:0;bottom:0;border-radius:999px;background:linear-gradient(90deg,var(--hc-ga),var(--hc-gb));box-shadow:0 0 24px color-mix(in srgb,var(--hc-gb) 55%,transparent);transition:width .8s cubic-bezier(.16,1,.3,1)}
    .hc-store-bar span{position:absolute;right:16px;top:50%;transform:translateY(-50%);font-weight:600;font-size:.9rem;color:var(--text-2);text-shadow:0 1px 2px rgba(0,0,0,.25)}
    .hc-store-sub{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px;color:var(--muted);font-size:.8rem}
    .hc-usage{margin:0}
    .hc-row2{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px}
    .hc-row2 .btn-primary{flex:1;min-width:180px;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;margin:0}
    .hc-row2 select{flex:0 0 auto;width:auto;margin:0}
    .hc-search{width:100%;margin:6px 0 4px}
    .hc-up{padding:8px 0;border-top:1px solid var(--border);font-size:.85rem}
    .hc-up .bar{height:10px;background:color-mix(in srgb,var(--muted) 25%,transparent);border-radius:999px;margin-top:7px}
    .hc-up .bar i{display:block;height:100%;width:0;border-radius:999px;background:linear-gradient(90deg,var(--hc-ga),var(--hc-gb));box-shadow:0 0 14px color-mix(in srgb,var(--hc-gb) 50%,transparent);transition:width .4s}
    .hc-up .m{color:var(--muted);font-size:.8rem;margin-top:3px}
    .hc-up.fail .m{color:var(--red)} .hc-up.ok .m{color:var(--green)}
    .hc-list{margin-top:6px}
    .hc-f{display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--border)}
    .hc-th{position:relative;flex:0 0 48px;width:48px;height:48px;border-radius:12px;display:flex;flex-direction:column;gap:1px;align-items:center;justify-content:center;overflow:hidden;color:var(--accent-2,var(--accent));background:linear-gradient(145deg,color-mix(in srgb,var(--accent) 22%,var(--card3,var(--card2))),var(--card3,var(--card2)))}
    .hc-th small{font-size:.55rem;font-weight:800;color:var(--muted);letter-spacing:.04em}
    .hc-th.k-video{color:#ff9b7a;background:linear-gradient(145deg,color-mix(in srgb,#ff7a59 22%,var(--card3,var(--card2))),var(--card3,var(--card2)))}
    .hc-th.k-audio{color:#c49bff;background:linear-gradient(145deg,color-mix(in srgb,#a77bff 24%,var(--card3,var(--card2))),var(--card3,var(--card2)))}
    .hc-th.k-pdf{color:#ff7b7b;background:linear-gradient(145deg,color-mix(in srgb,#ff5c5c 22%,var(--card3,var(--card2))),var(--card3,var(--card2)))}
    .hc-th img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;cursor:pointer;opacity:0;transition:opacity .3s}
    .hc-th.has-img img{opacity:1}
    .hc-in{flex:1;min-width:0}
    .hc-n{word-break:break-word;font-size:.92rem;line-height:1.25}
    .hc-d{color:var(--muted);font-size:.78rem;margin-top:2px}
    .hc-d .off{color:var(--red)}
    .hc-a{display:flex;gap:4px;flex:0 0 auto}
    .hc-a button{background:none;border:1px solid var(--border);border-radius:8px;padding:7px;color:var(--text);cursor:pointer;line-height:0;margin:0;width:auto}
    .hc-a button:disabled{opacity:.35;cursor:not-allowed}
    .hc-a button.del{color:var(--red)}
    .hc-ck{width:20px !important;height:20px;min-height:0;flex:0 0 20px;margin:0 !important;padding:0;accent-color:var(--accent);cursor:pointer}
    .hc-selbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 0;font-size:.85rem;color:var(--muted)}
    .hc-selbar label{display:flex;align-items:center;gap:8px;margin:0;cursor:pointer;color:var(--text)}
    .hc-selbar .sp{flex:1}
    .hc-selbar button{background:none;border:1px solid var(--border);border-radius:8px;padding:6px 10px;color:var(--text);cursor:pointer;margin:0;width:auto;display:inline-flex;gap:5px;align-items:center;font-size:.8rem}
    .hc-selbar button.del{color:var(--red)}
    .hc-f.on{background:color-mix(in srgb, var(--accent) 10%, transparent);border-radius:8px}
    .hc-up .hc-a button{line-height:1.2;padding:6px 10px;display:inline-flex;gap:5px;align-items:center;font-size:.8rem}
    .hc-dev{color:var(--accent-2,var(--accent))}
    .hc-th,.hc-in{cursor:pointer}
    #hcViewer{position:fixed;inset:0;z-index:100000;display:flex;flex-direction:column;background:rgba(0,0,0,.94);color:#fff}
    #hcViewer .hv-bar{display:flex;align-items:center;gap:6px;padding:10px 12px;background:rgba(0,0,0,.5)}
    #hcViewer .hv-t{flex:1;min-width:0;display:flex;flex-direction:column}
    #hcViewer .hv-t b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.95rem}
    #hcViewer .hv-t small{color:#cfd3dc;font-size:.74rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    #hcViewer .hv-b{background:none;border:1px solid rgba(255,255,255,.3);color:#fff;border-radius:10px;padding:6px 11px;font-size:1.1rem;cursor:pointer;margin:0;width:auto;line-height:1.2}
    #hcViewer .hv-b:disabled{opacity:.3;cursor:default}
    #hcViewer .hv-body{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;overflow:auto;padding:10px}
    #hcViewer img.hv-img,#hcViewer video{max-width:100%;max-height:100%;object-fit:contain}
    #hcViewer video{width:100%;height:100%;background:#000}
    #hcViewer .hv-audio{display:flex;flex-direction:column;align-items:center;gap:16px;width:100%}
    #hcViewer .hv-audio img{width:min(260px,70vw);border-radius:16px}
    #hcViewer audio{width:min(560px,100%)}
    #hcViewer .hv-pdf{align-self:flex-start;width:100%;display:flex;flex-direction:column;align-items:center;gap:10px}
    #hcViewer .hv-pdf canvas{max-width:100%;height:auto;background:#fff;box-shadow:0 2px 14px rgba(0,0,0,.5)}
    #hcViewer pre{align-self:stretch;width:100%;margin:0;padding:14px;background:rgba(255,255,255,.07);border-radius:12px;white-space:pre-wrap;word-break:break-word;overflow:auto;font:13px/1.5 ui-monospace,Menlo,Consolas,monospace;text-align:left;color:#fff}
    #hcViewer .hv-note{text-align:center;max-width:420px;color:#cfd3dc;display:flex;flex-direction:column;align-items:center;gap:12px}
    #hcViewer .hv-note button{background:var(--accent,#6c5ce7);color:#fff;border:0;border-radius:12px;padding:10px 18px;font:inherit;cursor:pointer;margin:0;width:auto}
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
    <label style="display:block;margin:4px 0 8px;font-size:.82rem;color:var(--muted)">Cet appareil s'appelle (affiché sur chaque fichier envoyé d'ici)
      <input id="hcDevice" maxlength="60" placeholder="Ex. Téléphone de Henzo" value="${HC_E(hcDevice())}" onchange="hcSetDevice(this)" style="margin-top:4px"></label>
    <div id="hcUps"></div>
    <input class="hc-search" id="hcSearch" type="search" placeholder="Rechercher un fichier..." value="${HC_E(HC_ST.q)}" oninput="hcSearch(this.value)">
    <div class="hc-selbar" id="hcSelBar"></div>
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
  const n = HC_ST.files.length;
  const pct = u.limit ? Math.min(100, (u.used / u.limit) * 100) : 0;
  const pctTxt = pct === 0 ? '0' : pct < 10 ? pct.toFixed(1).replace('.', ',') : Math.round(pct);
  const free = Math.max(0, u.limit - u.used);
  let pc = '', pcOff = '';
  if(u.pc && u.pc.configured){
    if(u.pc.online) pc = `<span class="hc-chip"><span class="dot"></span>PC allumé${u.pc.freeBytes != null ? ` · ${HC_SIZE(u.pc.freeBytes)} libres` : ''}</span>`;
    else {
      pc = `<span class="hc-chip off"><span class="dot"></span>PC éteint</span>`;
      const ago = u.pc.lastSeen ? Math.round((Date.now() - new Date(u.pc.lastSeen)) / 60000) : null;
      pcOff = `<div class="ag-hint" style="color:var(--red);margin:10px 0 0">Le site ne reçoit pas de nouvelles de ton PC (${ago == null ? 'jamais reçu' : ago < 60 ? `dernières nouvelles il y a ${ago} min` : `dernières nouvelles le ${HC_DATE(u.pc.lastSeen)}`}). Vérifie sur le PC que l'app Henzo Cloud est lancée : sa page <b>http://localhost:8788</b> dit ce qui ne va pas.
        <button class="btn-secondary" style="margin-top:6px;width:auto;padding:6px 12px" onclick="hcRefresh()">Vérifier de nouveau</button></div>`;
    }
  }
  el.innerHTML = `<div class="hc-store">
    <div class="hc-store-h"><b>Stockage en ligne</b><span class="hc-chip">${n} fichier${n > 1 ? 's' : ''}</span></div>
    <div class="hc-store-pct">${pctTxt}<span>%</span></div>
    <div class="hc-store-bar"><i style="width:${u.used > 0 ? `max(44px, ${pct}%)` : '0'}"></i><span>${HC_SIZE(free)} libres</span></div>
    <div class="hc-store-sub"><span>${HC_SIZE(u.used)} utilisés sur ${HC_SIZE(u.limit)} (à vous tous)</span>${u.trash ? `<span>· Corbeille ${HC_SIZE(u.trash)}</span>` : ''}${pc}</div>
    ${pcOff}</div>`;
}

function hcRenderList(){
  const box = document.getElementById('hcList'); if(!box) return;
  const q = HC_ST.q.trim().toLowerCase();
  const L = q ? HC_ST.files.filter(f => f.name.toLowerCase().includes(q)) : HC_ST.files;
  const ids = new Set(HC_ST.files.map(f => f.id));
  [...HC_ST.sel].forEach(id => { if(!ids.has(id)) HC_ST.sel.delete(id); }); // fichiers disparus
  hcRenderSel(L);
  if(!L.length){ box.innerHTML = `<div class="ag-empty">${q ? 'Aucun fichier ne correspond.' : 'Aucun fichier pour l\'instant. Touche « Envoyer des fichiers ».'}</div>`; return; }
  box.innerHTML = L.map(f => {
    const T = window.HCThumbs;
    const k = T ? T.kind(f.name, f.mime) : 'file';
    const ext = (f.name.split('.').pop() || '').slice(0, 4).toUpperCase();
    const where = f.location === 'pc' ? (f.offline ? ' · <span class="off">Sur le PC, hors ligne</span>' : ' · Sur le PC')
      : f.moving ? ' · <span style="color:var(--accent)">Déplacement vers le PC...</span>'
      : f.toPc ? ' · <span style="color:var(--accent)">En ligne, ira sur le PC quand il sera rallumé</span>' : '';
    const canMove = f.location !== 'pc' && HC_ST.usage && HC_ST.usage.pc && HC_ST.usage.pc.configured;
    const on = HC_ST.sel.has(f.id);
    return `<div class="hc-f${on ? ' on' : ''}">
      <input type="checkbox" class="hc-ck" title="Sélectionner" ${on ? 'checked' : ''} onchange="hcToggle('${HC_E(f.id)}', this.checked)">
      <div class="hc-th k-${k}" data-th="${HC_E(f.id)}" onclick="hcView('${HC_E(f.id)}')">${T ? T.icon(k, 20) : ''}<small>${HC_E(ext)}</small>${f.hasThumb ? `<img alt="" data-hcid="${HC_E(f.id)}" onload="this.parentNode.classList.add('has-img')">` : ''}</div>
      <div class="hc-in" onclick="hcView('${HC_E(f.id)}')"><div class="hc-n">${HC_E(f.name)}</div><div class="hc-d">${HC_SIZE(f.size)} · ${HC_DATE(f.createdAt)}${where}${f.device ? ` · <span class="hc-dev">${HC_DEV_IC} ${HC_E(f.device)}</span>` : ''}</div></div>
      <div class="hc-a">
        <button title="Télécharger" onclick="hcDownload('${HC_E(f.id)}')" ${f.offline ? 'disabled' : ''}>${HC_IC('download', 16)}</button>
        ${canMove ? `<button title="Déplacer sur mon PC (libère la place en ligne)" onclick="hcMove('${HC_E(f.id)}')" ${f.moving || f.toPc ? 'disabled' : ''}>${HC_PC}</button>` : ''}
        <button class="del" title="Mettre à la corbeille" onclick="hcDelete('${HC_E(f.id)}')">${HC_IC('trash', 16)}</button>
      </div></div>`;
  }).join('');
  L.filter(f => f.moving).forEach(f => hcWatchMove(f.id));
  // Miniatures : demandées par paquets quand elles apparaissent à l'écran.
  const imgs = box.querySelectorAll('img[data-hcid]');
  const load = im => { const id = im.dataset.hcid; delete im.dataset.hcid; hcWantThumb(id, im); };
  if('IntersectionObserver' in window){
    const ob = new IntersectionObserver(en => en.forEach(e => { if(e.isIntersecting){ ob.unobserve(e.target); load(e.target); } }), { rootMargin: '200px' });
    imgs.forEach(im => ob.observe(im));
  } else imgs.forEach(load);
  // Fichiers sans miniature (envoyés avant, ou depuis le PC) : on la fabrique en arrière-plan.
  if(window.HCThumbs) L.filter(f => !f.hasThumb && !f.offline && ['image', 'video', 'pdf', 'audio'].includes(window.HCThumbs.kind(f.name, f.mime))).forEach(hcBackfill);
}

// ---------- Miniatures (photo, vidéo, PDF, pochette de musique) ----------
const HC_THUMBS = new Map(), HC_WANT = new Map();
let hcThumbTimer = null;
function hcWantThumb(id, img){
  if(HC_THUMBS.has(id)){ img.src = HC_THUMBS.get(id); return; }
  if(!HC_WANT.has(id)) HC_WANT.set(id, []);
  HC_WANT.get(id).push(img);
  clearTimeout(hcThumbTimer); hcThumbTimer = setTimeout(hcFlushThumbs, 60);
}
async function hcFlushThumbs(){
  const ids = [...HC_WANT.keys()].slice(0, 100);
  const waiting = ids.map(i => [i, HC_WANT.get(i)]);
  ids.forEach(i => HC_WANT.delete(i));
  try {
    const { thumbs } = await hcApi('POST', '/thumbs', { ids });
    for(const [i, imgs] of waiting) if(thumbs[i]){ HC_THUMBS.set(i, thumbs[i]); imgs.forEach(im => { im.src = thumbs[i]; }); }
  } catch(e){}
  if(HC_WANT.size) hcThumbTimer = setTimeout(hcFlushThumbs, 60);
}
const HC_TRIED = new Set((() => { try { return JSON.parse(localStorage.getItem('hc_thumb_tried') || '[]'); } catch(e){ return []; } })());
const HC_BACK = []; let hcBackBusy = false;
function hcBackfill(f){
  if(HC_TRIED.has(f.id) || HC_BACK.some(x => x.id === f.id)) return;
  HC_BACK.push(f); hcRunBackfill();
}
async function hcRunBackfill(){
  if(hcBackBusy) return; hcBackBusy = true;
  while(HC_BACK.length){
    const f = HC_BACK.shift();
    HC_TRIED.add(f.id);
    try { localStorage.setItem('hc_thumb_tried', JSON.stringify([...HC_TRIED].slice(-1000))); } catch(e){}
    const k = window.HCThumbs.kind(f.name, f.mime);
    if((k === 'image' && f.size > 40e6) || (k === 'pdf' && f.size > 60e6)) continue; // trop gros à relire
    try {
      const { url } = await hcApi('GET', `/files/${f.id}/download`);
      const data = await window.HCThumbs.make(url, f.name, f.mime);
      if(data){ await hcApi('POST', `/files/${f.id}/thumb`, { data }); HC_THUMBS.set(f.id, data); f.hasThumb = true; hcShowThumb(f.id, data); }
    } catch(e){}
  }
  hcBackBusy = false;
}
function hcShowThumb(id, data){
  const th = document.querySelector(`[data-th="${CSS.escape(id)}"]`);
  if(!th || th.querySelector('img')) return;
  const im = document.createElement('img'); im.alt = '';
  im.onload = () => th.classList.add('has-img');
  im.src = data; th.appendChild(im);
}
// Le lecteur de PDF (pdf.js) et la fabrique de miniatures : chargés une fois.
(function(){ if(window.HCThumbs) return; const sc = document.createElement('script'); sc.src = 'henzo-miniatures.js?v=2'; document.head.appendChild(sc); })();

window.hcSearch = v => { HC_ST.q = v; hcRenderList(); };

// ---------- Sélection de plusieurs fichiers ----------
const hcVisible = () => { const q = HC_ST.q.trim().toLowerCase(); return q ? HC_ST.files.filter(f => f.name.toLowerCase().includes(q)) : HC_ST.files; };
function hcRenderSel(L){
  const bar = document.getElementById('hcSelBar'); if(!bar) return;
  L = L || hcVisible();
  if(!L.length){ bar.innerHTML = ''; return; }
  const n = HC_ST.sel.size;
  const all = L.every(f => HC_ST.sel.has(f.id));
  const size = HC_ST.files.filter(f => HC_ST.sel.has(f.id)).reduce((t, f) => t + f.size, 0);
  const pcOn = HC_ST.usage && HC_ST.usage.pc && HC_ST.usage.pc.configured;
  bar.innerHTML = `<label><input type="checkbox" class="hc-ck" ${all ? 'checked' : ''} onchange="hcSelAll(this.checked)"> ${n ? `${n} sélectionné${n > 1 ? 's' : ''} (${HC_SIZE(size)})` : 'Tout sélectionner'}</label>
    <span class="sp"></span>
    ${n ? `<button onclick="hcBatchDownload()">${HC_IC('download', 14)} Télécharger</button>
      ${pcOn ? `<button onclick="hcBatchMove()">${HC_PC.replace('width="16" height="16"', 'width="14" height="14"')} Vers le PC</button>` : ''}
      <button class="del" onclick="hcBatchDelete()">${HC_IC('trash', 14)} Corbeille</button>
      <button onclick="hcSelAll(false)">Annuler</button>` : ''}`;
}
window.hcToggle = (id, on) => { on ? HC_ST.sel.add(id) : HC_ST.sel.delete(id); hcRenderList(); };
window.hcSelAll = on => { hcVisible().forEach(f => on ? HC_ST.sel.add(f.id) : HC_ST.sel.delete(f.id)); if(!on) HC_ST.sel.clear(); hcRenderList(); };

const hcChosen = () => HC_ST.files.filter(f => HC_ST.sel.has(f.id));

window.hcBatchDelete = async function(){
  const L = hcChosen(); if(!L.length) return;
  if(!await hcAsk(`Mettre ${L.length} fichier${L.length > 1 ? 's' : ''} à la corbeille ?\nTu pourras les récupérer pendant 30 jours (bouton Corbeille).`)) return;
  let bad = 0;
  for(const f of L){ try { await hcApi('DELETE', `/files/${f.id}`); HC_ST.sel.delete(f.id); } catch(e){ bad++; } }
  HC_TOAST(bad ? `${L.length - bad} mis à la corbeille, ${bad} en échec` : `${L.length} mis à la corbeille`);
  hcRefresh();
};

window.hcBatchMove = async function(){
  const L = hcChosen().filter(f => f.location !== 'pc' && !f.moving && !f.toPc);
  if(!L.length){ alert('Les fichiers choisis sont déjà sur ton PC (ou en route).'); return; }
  const size = L.reduce((t, f) => t + f.size, 0);
  if(!await hcAsk(`Déplacer ${L.length} fichier${L.length > 1 ? 's' : ''} sur ton PC ?\n\nÇa libère ${HC_SIZE(size)} en ligne. Les fichiers restent dans ta liste et se téléchargent quand ton PC est allumé.`)) return;
  let done = 0;
  for(const f of L){
    try { await hcApi('POST', `/files/${f.id}/move-to-pc`, {}); done++; }
    catch(e){ alert(`${f.name} : ${e.message}`); break; } // PC éteint ou plein : inutile d'insister
  }
  if(done) HC_TOAST(`${done} fichier${done > 1 ? 's' : ''} en route vers le PC`);
  HC_ST.sel.clear();
  hcRefresh();
};

window.hcBatchDownload = async function(){
  const L = hcChosen().filter(f => !f.offline);
  if(!L.length){ alert('Ces fichiers sont sur ton PC, qui est éteint.'); return; }
  if(L.length > 1) HC_TOAST(`Téléchargement de ${L.length} fichiers... (le navigateur peut demander l'autorisation)`);
  for(const f of L){
    try {
      const { url } = await hcApi('GET', `/files/${f.id}/download`);
      const a = document.createElement('a'); a.href = url; a.rel = 'noopener'; a.download = f.name;
      document.body.appendChild(a); a.click(); a.remove();
      await hcSleep(1200); // un par un, sinon le navigateur en bloque
    } catch(e){ alert(`${f.name} : ${e.message}`); }
  }
};

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
    HC_ST.trash = files; HC_ST.days = days;
    const ids = new Set(files.map(f => f.id));
    [...HC_ST.tsel].forEach(id => { if(!ids.has(id)) HC_ST.tsel.delete(id); });
    hcRenderTrash();
  } catch(e){
    hcSheet(`<div class="ag-hint" style="color:var(--red)">${HC_E(e.message)}</div><button class="btn-secondary" onclick="hcOpenFiles()">← Mes fichiers</button>`);
  }
};
function hcRenderTrash(){
  const files = HC_ST.trash;
  const total = files.reduce((t, f) => t + f.size, 0);
  const n = HC_ST.tsel.size;
  const all = files.length && files.every(f => HC_ST.tsel.has(f.id));
  hcSheet(`
    <div class="ag-hint" style="margin-top:0">Les fichiers supprimés restent ici <b>${HC_ST.days} jours</b>, puis partent pour de bon. Ils prennent encore de la place tant qu'ils sont ici${total ? ` (${HC_SIZE(total)})` : ''}.</div>
    ${files.length ? `<div class="hc-selbar">
      <label><input type="checkbox" class="hc-ck" ${all ? 'checked' : ''} onchange="hcTSelAll(this.checked)"> ${n ? `${n} sélectionné${n > 1 ? 's' : ''}` : 'Tout sélectionner'}</label>
      <span class="sp"></span>
      ${n ? `<button onclick="hcBatchRestore()">${HC_IC('refresh', 14)} Restaurer</button>
        <button class="del" onclick="hcBatchKill()">${HC_IC('trash', 14)} Supprimer pour de bon</button>` : ''}
    </div>` : ''}
    <div class="hc-list">${files.length ? files.map(f => { const on = HC_ST.tsel.has(f.id); return `<div class="hc-f${on ? ' on' : ''}">
      <input type="checkbox" class="hc-ck" ${on ? 'checked' : ''} onchange="hcTToggle('${HC_E(f.id)}', this.checked)">
      <div class="hc-in"><div class="hc-n">${HC_E(f.name)}</div><div class="hc-d">${HC_SIZE(f.size)} · part pour de bon dans ${f.daysLeft} jour${f.daysLeft > 1 ? 's' : ''}${f.location === 'pc' ? ' · sur le PC' : ''}</div></div>
      <div class="hc-a">
        <button title="Restaurer" onclick="hcRestore('${HC_E(f.id)}')">${HC_IC('refresh', 16)}</button>
        <button class="del" title="Supprimer pour de bon" onclick="hcKill('${HC_E(f.id)}')">${HC_IC('trash', 16)}</button>
      </div></div>`; }).join('') : '<div class="ag-empty">La corbeille est vide.</div>'}</div>
    <div class="hc-foot">
      <button class="btn-secondary" onclick="hcOpenFiles()">← Mes fichiers</button>
      ${files.length ? `<button class="btn-secondary" style="color:var(--red)" onclick="hcEmptyTrash()">Vider la corbeille</button>` : ''}
    </div>`);
}
window.hcTToggle = (id, on) => { on ? HC_ST.tsel.add(id) : HC_ST.tsel.delete(id); hcRenderTrash(); };
window.hcTSelAll = on => { HC_ST.tsel = new Set(on ? HC_ST.trash.map(f => f.id) : []); hcRenderTrash(); };
window.hcBatchRestore = async function(){
  const L = HC_ST.trash.filter(f => HC_ST.tsel.has(f.id)); let bad = 0;
  for(const f of L){ try { await hcApi('POST', `/trash/${f.id}/restore`, {}); HC_ST.tsel.delete(f.id); } catch(e){ bad++; } }
  HC_TOAST(bad ? `${L.length - bad} restauré(s), ${bad} en échec` : `${L.length} fichier${L.length > 1 ? 's' : ''} restauré${L.length > 1 ? 's' : ''}`);
  hcTrash();
};
window.hcBatchKill = async function(){
  const L = HC_ST.trash.filter(f => HC_ST.tsel.has(f.id)); if(!L.length) return;
  if(!await hcAsk(`Supprimer ${L.length} fichier${L.length > 1 ? 's' : ''} pour toujours ?\nImpossible de revenir en arrière.`)) return;
  let bad = 0, msg = '';
  for(const f of L){ try { await hcApi('DELETE', `/trash/${f.id}`); HC_ST.tsel.delete(f.id); } catch(e){ bad++; msg = e.message; } }
  if(bad) alert(`${bad} fichier(s) non supprimé(s) : ${msg}`);
  hcTrash();
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
    const init = await hcApi('POST', '/uploads/init', { name: file.name, size: file.size, type: file.type, fingerprint, target: u.target, device: hcDevice() });
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
    // Miniature fabriquée sur cet appareil, à partir du fichier (photo, vidéo, PDF, pochette).
    if(window.HCThumbs){
      set(100, 'Miniature...');
      try { const data = await window.HCThumbs.make(file, file.name, file.type); if(data){ await hcApi('POST', `/files/${fileId}/thumb`, { data }); HC_THUMBS.set(fileId, data); } } catch(e){}
    }
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

// ---------- Lecteur intégré : image, vidéo, musique, PDF, texte ----------
const HC_TEXT_EXT = /^(txt|md|markdown|json|csv|tsv|log|xml|html?|css|js|mjs|ts|jsx|tsx|py|java|kt|c|h|cpp|cs|go|rs|php|sh|bat|ps1|yml|yaml|toml|ini|cfg|conf|env|sql|srt|vtt|svg|tex|rtf)$/;
function hcViewKind(f){
  const T = window.HCThumbs; const k = T ? T.kind(f.name, f.mime) : 'file';
  const e = (f.name.split('.').pop() || '').toLowerCase();
  if(['image', 'video', 'audio', 'pdf'].includes(k)){
    if(k === 'image' && /^(heic|heif|tiff?)$/.test(e)) return 'other'; // pas affichable dans un navigateur
    return k;
  }
  if((String(f.mime).startsWith('text/') || HC_TEXT_EXT.test(e)) && f.size <= 5e6) return 'text';
  return 'other';
}
const HV = { list: [], i: -1, token: 0 };
function hvBody(){ return document.getElementById('hvBody'); }
function hvStop(){
  const b = hvBody(); if(!b) return;
  b.querySelectorAll('video,audio').forEach(m => { m.pause(); m.removeAttribute('src'); m.load(); });
  b.innerHTML = '';
}
function hvNote(msg, f, withDl){
  const b = hvBody(); if(!b) return;
  b.innerHTML = '';
  const box = document.createElement('div'); box.className = 'hv-note';
  const t = document.createElement('div'); t.textContent = msg; box.appendChild(t);
  if(withDl !== false && f && !f.offline){
    const btn = document.createElement('button'); btn.textContent = 'Télécharger';
    btn.onclick = () => hcDownload(f.id); box.appendChild(btn);
  }
  b.appendChild(box);
}
async function hvRender(){
  const f = HV.list[HV.i]; if(!f) return hcCloseViewer();
  const token = ++HV.token;
  hvStop();
  document.getElementById('hvName').textContent = f.name;
  document.getElementById('hvMeta').textContent = [HC_SIZE(f.size), HC_DATE(f.createdAt), f.device ? 'Envoyé depuis ' + f.device : '', f.location === 'pc' ? 'Sur le PC' : 'En ligne'].filter(Boolean).join(' · ');
  document.getElementById('hvPrev').disabled = HV.i <= 0;
  document.getElementById('hvNext').disabled = HV.i >= HV.list.length - 1;
  document.getElementById('hvDl').disabled = !!f.offline;
  if(f.offline) return hvNote('Ce fichier est sur ton PC, qui est éteint ou hors ligne. Rallume ton PC puis réessaie.', f, false);
  const k = hcViewKind(f);
  if(k === 'other') return hvNote("Ce type de fichier ne peut pas être lu ici. Télécharge-le pour l'ouvrir.", f);
  hvBody().textContent = 'Chargement...';
  let url;
  try { url = (await hcApi('GET', `/files/${f.id}/download?inline=1`)).url; }
  catch(e){ if(token === HV.token) hvNote(e.message, f, false); return; }
  if(token !== HV.token) return;
  const b = hvBody();
  if(k === 'image'){
    const im = document.createElement('img'); im.className = 'hv-img'; im.alt = f.name;
    im.onerror = () => token === HV.token && hvNote("Impossible d'afficher cette image.", f);
    im.src = url; b.innerHTML = ''; b.appendChild(im);
  } else if(k === 'video'){
    const v = document.createElement('video'); v.controls = true; v.autoplay = true; v.playsInline = true;
    v.onerror = () => token === HV.token && hvNote('Ton navigateur ne sait pas lire cette vidéo (format ou codec). Télécharge-la pour la lire avec une autre application.', f);
    v.src = url; b.innerHTML = ''; b.appendChild(v);
  } else if(k === 'audio'){
    const wrap = document.createElement('div'); wrap.className = 'hv-audio';
    const cover = HC_THUMBS.get(f.id);
    if(cover){ const im = document.createElement('img'); im.alt = ''; im.src = cover; wrap.appendChild(im); }
    const a = document.createElement('audio'); a.controls = true; a.autoplay = true;
    a.onerror = () => token === HV.token && hvNote('Ton navigateur ne sait pas lire ce son.', f);
    a.src = url; wrap.appendChild(a); b.innerHTML = ''; b.appendChild(wrap);
  } else if(k === 'pdf'){
    await hvPdf(url, f, token);
  } else if(k === 'text'){
    try {
      const r = await fetch(url); if(!r.ok) throw 0;
      const txt = await r.text();
      if(token !== HV.token) return;
      const pre = document.createElement('pre'); pre.textContent = txt; b.innerHTML = ''; b.appendChild(pre);
    } catch(e){ if(token === HV.token) hvNote('Impossible de lire ce fichier.', f); }
  }
}
async function hvPdf(url, f, token){
  const b = hvBody();
  try {
    const L = await window.HCThumbs.pdfjs();
    const doc = await L.getDocument({ url }).promise;
    if(token !== HV.token){ doc.destroy(); return; }
    const wrap = document.createElement('div'); wrap.className = 'hv-pdf';
    b.innerHTML = ''; b.appendChild(wrap);
    const dpr = window.devicePixelRatio || 1;
    const width = Math.min(b.clientWidth - 20, 900);
    for(let n = 1; n <= doc.numPages; n++){
      if(token !== HV.token){ doc.destroy(); return; }
      const page = await doc.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: (width / base.width) * dpr });
      const c = document.createElement('canvas');
      c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
      c.style.width = Math.ceil(vp.width / dpr) + 'px';
      wrap.appendChild(c);
      await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    }
  } catch(e){ if(token === HV.token) hvNote("Impossible d'afficher ce PDF ici.", f); }
}
window.hcView = function(id){
  const L = hcVisible(); const i = L.findIndex(x => x.id === id);
  if(i < 0) return;
  HV.list = L; HV.i = i;
  hcStyle();
  let v = document.getElementById('hcViewer');
  if(!v){
    v = document.createElement('div'); v.id = 'hcViewer';
    v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true');
    v.innerHTML = `<div class="hv-bar"><div class="hv-t"><b id="hvName"></b><small id="hvMeta"></small></div>
      <button class="hv-b" id="hvPrev" title="Précédent" onclick="hcViewStep(-1)">‹</button>
      <button class="hv-b" id="hvNext" title="Suivant" onclick="hcViewStep(1)">›</button>
      <button class="hv-b" id="hvDl" title="Télécharger" onclick="hcViewDl()">${HC_IC('download', 18)}</button>
      <button class="hv-b" title="Fermer" onclick="hcCloseViewer()">✕</button></div>
      <div class="hv-body" id="hvBody"></div>`;
    document.body.appendChild(v);
  }
  hvRender();
};
window.hcViewStep = d => { const n = HV.i + d; if(n < 0 || n >= HV.list.length) return; HV.i = n; hvRender(); };
window.hcViewDl = () => { const f = HV.list[HV.i]; if(f) hcDownload(f.id); };
window.hcCloseViewer = function(){
  HV.token++; hvStop();
  const v = document.getElementById('hcViewer'); if(v) v.remove();
};
document.addEventListener('keydown', e => {
  if(!document.getElementById('hcViewer')) return;
  if(e.key === 'Escape') hcCloseViewer();
  else if(e.key === 'ArrowLeft') hcViewStep(-1);
  else if(e.key === 'ArrowRight') hcViewStep(1);
});

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
