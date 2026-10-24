// ============================================================
// IA : RELAIS AUTOMATIQUE ENTRE PLUSIEURS IA
// Quand une IA est a la limite (quota) ou surchargee, l'app passe
// toute seule a la suivante. Un message n'apparait que si toutes ont echoue.
// Charge juste apres modules.js : redefinit callAI, callChatAI et l'ecran Reglages IA.
// ============================================================
(function(){
'use strict';

const IA_ST = 'iaRelais';            // pauses, compteurs du jour, liste des modeles (sur cet appareil)
const IA_PROV = {
  gemini:    { nom: 'Gemini (Google)', court: 'Gemini' },
  groq:      { nom: 'Groq', court: 'Groq' },
  deepseek:  { nom: 'DeepSeek', court: 'DeepSeek' },
  anthropic: { nom: 'Claude (Anthropic)', court: 'Claude' },
  openai:    { nom: 'OpenAI (GPT)', court: 'OpenAI' },
  custom:    { nom: 'Autre (compatible OpenAI)', court: 'Autre' }
};
const IA_ORDRE = ['gemini', 'groq', 'deepseek', 'anthropic', 'openai', 'custom'];
const GEM = 'https://generativelanguage.googleapis.com/v1beta';
const GROQ = 'https://api.groq.com/openai/v1';
const DEEPSEEK = 'https://api.deepseek.com';
const MIN = 60000, HEURE = 3600000;
const AIM = () => (typeof AI_MODELS !== 'undefined' && AI_MODELS) || {};

// ---------- Configuration (compatible avec l'ancien format {provider, key, url}) ----------
function iaRaw(){ let c = null; try { c = JSON.parse(localStorage.getItem('aiConfig')); } catch(e){} return c && typeof c === 'object' ? c : {}; }
function iaCfg(){
  const c = iaRaw();
  const keys = {};
  Object.keys(c.keys || {}).forEach(p => { if(IA_PROV[p] && c.keys[p]) keys[p] = String(c.keys[p]).trim(); });
  // Ancien format : une seule cle pour un seul fournisseur
  if(!c.keys && c.key){ const p = IA_PROV[c.provider] ? c.provider : 'openai'; keys[p] = String(c.key).trim(); }
  const ordre = (Array.isArray(c.ordre) ? c.ordre : []).filter((p, i, a) => IA_PROV[p] && a.indexOf(p) === i);
  IA_ORDRE.forEach(p => { if(!ordre.includes(p)) ordre.push(p); });
  return { raw: c, keys, ordre, url: c.url || '' };
}
function iaHasKey(){ const k = iaCfg().keys; return Object.keys(k).some(p => k[p] && (p !== 'custom' || iaCfg().url)); }

// ---------- Etat local (pauses, compteurs, modeles) ----------
function stGet(){ let s = null; try { s = JSON.parse(localStorage.getItem(IA_ST)); } catch(e){} s = s && typeof s === 'object' ? s : {}; s.pause = s.pause || {}; s.compte = s.compte || {}; s.modeles = s.modeles || {}; return s; }
function stPut(s){ try { localStorage.setItem(IA_ST, JSON.stringify(s)); } catch(e){} }

// Heure du Pacifique : Google remet les quotas gratuits a zero a minuit, heure de Californie
function ptParts(d){
  const o = {};
  try { new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(d).forEach(p => { o[p.type] = p.value; }); }
  catch(e){ const u = new Date(d.getTime() - 8 * HEURE); return { year: u.getUTCFullYear(), month: String(u.getUTCMonth() + 1).padStart(2, '0'), day: String(u.getUTCDate()).padStart(2, '0'), hour: u.getUTCHours(), minute: u.getUTCMinutes(), second: u.getUTCSeconds() }; }
  return o;
}
function iaJour(){ const o = ptParts(new Date()); return `${o.year}-${o.month}-${o.day}`; }
function iaMinuitPT(){ const o = ptParts(new Date()); const s = (+o.hour % 24) * 3600 + (+o.minute) * 60 + (+o.second); return Date.now() + (86400 - s) * 1000 + MIN; }
function iaHeure(t){ try { return new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); } catch(e){ return ''; } }

function iaCompter(label){
  const s = stGet(), j = iaJour();
  if(s.jour !== j){ s.jour = j; s.compte = {}; }
  s.compte[label] = (s.compte[label] || 0) + 1;
  // Historique des 14 derniers jours (pour la progression)
  s.histo = s.histo || {};
  s.histo[j] = s.histo[j] || {};
  s.histo[j][label] = (s.histo[j][label] || 0) + 1;
  Object.keys(s.histo).sort().slice(0, -14).forEach(k => delete s.histo[k]);
  stPut(s);
  try { iaMajJauges(); } catch(e){}
}
// Limites gratuites estimees par jour (null = payant, pas de limite fixe)
const IA_LIMITES = { 'Gemini Flash-Lite': 500, 'Gemini Flash': 20, 'Groq': 1000, 'DeepSeek': null, 'Claude': null, 'OpenAI': null, 'Autre IA': null };
function iaUsage(){
  const cfg = iaCfg(), n = iaComptes(), l = [];
  if(cfg.keys.gemini){ l.push('Gemini Flash-Lite'); l.push('Gemini Flash'); }
  [['groq', 'Groq'], ['deepseek', 'DeepSeek'], ['anthropic', 'Claude'], ['openai', 'OpenAI'], ['custom', 'Autre IA']].forEach(([p, lb]) => { if(cfg.keys[p] || n[lb]) l.push(lb); });
  const items = l.map(lb => ({ label: lb, utilise: n[lb] || 0, limite: IA_LIMITES[lb] }));
  const gratuits = items.filter(x => x.limite);
  const total = items.reduce((a, x) => a + x.utilise, 0);
  const max = gratuits.reduce((a, x) => a + x.limite, 0);
  const reste = gratuits.reduce((a, x) => a + Math.max(0, x.limite - x.utilise), 0);
  return { items, total, max, reste };
}
function iaCouleur(pc){ return pc >= 85 ? '#ff6b6b' : pc >= 60 ? '#f5c542' : '#3ecf8e'; }
function iaBarre(u, lim){
  if(!lim) return `<div class="ia-bar off"><i style="width:0"></i></div>`;
  const pc = Math.min(100, Math.round(u / lim * 100));
  return `<div class="ia-bar"><i style="width:${Math.max(pc, u ? 2 : 0)}%;background:${iaCouleur(pc)}"></i></div>`;
}
// Petite jauge resumee (onglet Coach et reglages)
function iaJaugeHtml(){
  const u = iaUsage();
  if(!u.items.length) return '';
  const pc = u.max ? Math.min(100, Math.round((u.max - u.reste) / u.max * 100)) : 0;
  return `<div class="ia-jauge" onclick="iaOuvrirReglages()" title="Voir le détail">
    <div class="l"><b>IA aujourd'hui : ${u.total} demande${u.total > 1 ? 's' : ''}</b><span>${u.max ? `Il te reste environ ${new Intl.NumberFormat('fr-FR').format(u.reste)} demandes gratuites` : 'Clés payantes seulement'}</span></div>
    ${u.max ? iaBarre(u.max - u.reste, u.max) : ''}</div>`;
}
function iaMajJauges(){
  document.querySelectorAll('.ia-jauge-zone').forEach(z => { z.innerHTML = iaJaugeHtml(); });
  if(document.getElementById('iaCompteurs')) iaRenderCompteurs();
}
// La jauge en haut de l'onglet Coach
function iaPoserJaugeCoach(){
  const page = document.getElementById('page-ia'); if(!page) return;
  const host = page.querySelector('.container') || page;
  let z = host.querySelector(':scope > .ia-jauge-zone');
  if(!z){ z = document.createElement('div'); z.className = 'ia-jauge-zone'; host.insertBefore(z, host.firstChild); }
  z.innerHTML = iaJaugeHtml();
}
setTimeout(iaPoserJaugeCoach, 3000);
document.addEventListener('click', () => setTimeout(iaPoserJaugeCoach, 400), true);
function iaComptes(){ const s = stGet(); return s.jour === iaJour() ? s.compte : {}; }
function iaPauseGet(id){ const p = stGet().pause[id]; return p && p.jusqua > Date.now() ? p : null; }
function iaPauseSet(id, jusqua, raison){
  const s = stGet(), now = Date.now();
  Object.keys(s.pause).forEach(k => { if(!(s.pause[k].jusqua > now)) delete s.pause[k]; });
  s.pause[id] = { jusqua, raison: raison || '' };
  stPut(s);
}
function iaFp(k){ return String(k || '').slice(-6); }

// ---------- Choix automatique des modeles ----------
function gemVer(id){ const m = id.match(/gemini-(\d+)(?:\.(\d+))?/); return m ? (+m[1]) * 100 + (+(m[2] || 0)) : 0; }
function gemStable(id){ return !/preview|exp|latest/.test(id); }
function gemRang(ids, lite){
  return ids.filter(id => /^gemini-/.test(id) && /flash/.test(id) && (lite ? /flash-lite/.test(id) : !/lite/.test(id))
      && !/image|tts|audio|live|embed|native|thinking|computer|robot|8b/.test(id))
    .sort((a, b) => (gemStable(b) - gemStable(a)) || (gemVer(b) - gemVer(a)) || (a.length - b.length) || a.localeCompare(b));
}
function gemDefaut(){
  const cfgM = String(AIM().gemini || '');
  const flash = /flash/.test(cfgM) && !/lite/.test(cfgM) ? [cfgM] : [];
  return { lite: ['gemini-flash-lite-latest'], flash: [...flash, 'gemini-flash-latest'].filter((x, i, a) => a.indexOf(x) === i) };
}
const GROQ_TEXTE = ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'openai/gpt-oss-20b', 'llama-3.1-8b-instant'];
function groqRang(ids){
  const ok = ids.filter(id => !/guard|whisper|tts|playai|orpheus|compound|safeguard|distil/.test(id));
  const pref = GROQ_TEXTE.filter(id => ok.includes(id));
  const autres = ok.filter(id => !pref.includes(id) && /gpt-oss|llama/.test(id) && !/scout|maverick|vision/.test(id));
  const vision = ok.filter(id => /llama-4-scout|llama-4-maverick|vision/.test(id)).sort((a, b) => (/scout/.test(b) - /scout/.test(a)));
  return { texte: [...pref, ...autres], vision };
}
function groqDefaut(){ return { texte: ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile'], vision: ['meta-llama/llama-4-scout-17b-16e-instruct'] }; }

async function iaGet(url, headers, ms){
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), ms || 12000);
  try {
    const r = await fetch(url, { method: 'GET', headers: headers || {}, signal: ctl.signal });
    let j = {}; try { j = await r.json(); } catch(e){}
    return { ok: r.ok && !(j && j.error), status: r.status, j };
  } finally { clearTimeout(to); }
}
async function gemListe(key){
  const r = await iaGet(`${GEM}/models?pageSize=1000&key=${encodeURIComponent(key)}`);
  if(!r.ok) { const e = new Error(iaMsg(r.j) || 'erreur ' + r.status); e.status = r.status; e.j = r.j; throw e; }
  const ids = (r.j.models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent')).map(m => String(m.name || '').replace(/^models\//, ''));
  return { lite: gemRang(ids, true), flash: gemRang(ids, false), n: ids.length };
}
async function groqListe(key){
  const r = await iaGet(`${GROQ}/models`, { Authorization: 'Bearer ' + key });
  if(!r.ok) { const e = new Error(iaMsg(r.j) || 'erreur ' + r.status); e.status = r.status; e.j = r.j; throw e; }
  return groqRang((r.j.data || []).filter(m => m && m.id && m.active !== false).map(m => m.id));
}
// Une fois par jour au maximum (10 min si la liste n'a pas pu etre lue)
async function iaModeles(p, key, force){
  const s = stGet(), c = s.modeles[p], fp = iaFp(key);
  if(!force && c && c.fp === fp && c.jusqua > Date.now()) return c.m;
  let m, ok = true;
  try {
    m = p === 'gemini' ? await gemListe(key) : await groqListe(key);
    const def = p === 'gemini' ? gemDefaut() : groqDefaut();
    Object.keys(def).forEach(k => { if(!m[k] || !m[k].length) m[k] = def[k]; });
  } catch(e){ ok = false; m = p === 'gemini' ? gemDefaut() : groqDefaut(); if(force) throw e; }
  const s2 = stGet(); s2.modeles[p] = { fp, m, jusqua: Date.now() + (ok ? 24 * HEURE : 10 * MIN), t: Date.now() };
  stPut(s2);
  return m;
}

// ---------- Erreurs ----------
function iaMsg(j){
  if(!j) return '';
  const e = j.error;
  if(typeof e === 'string') return e;
  return (e && (e.message || e.status || e.type)) || j.message || '';
}
function iaDuree(txt){
  const m = String(txt || '').match(/(?:try again|retry) in\s*(?:(\d+)h)?\s*(?:(\d+)m(?!s))?\s*(?:([\d.]+)s)?/i);
  if(!m || !(m[1] || m[2] || m[3])) return 0;
  return ((+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0)) * 1000;
}
// Classe une reponse en erreur : quota, surcharge, cle, indispo, autre
function iaClasser(p, status, j, headers){
  const msg = iaMsg(j), raw = (() => { try { return JSON.stringify(j || {}).slice(0, 4000); } catch(e){ return msg; } })();
  const now = Date.now();
  const ra = headers && headers.get ? Number(headers.get('retry-after')) : 0;
  if(status === 402 || /insufficient[_ ]balance|insufficient_quota|credit balance is too low/i.test(raw))
    return { type: 'quota', jusqua: now + 6 * HEURE, raison: 'plus de crédit sur le compte' };
  if(status === 429 || /RESOURCE_EXHAUSTED|rate.?limit|quota|too many requests/i.test(raw)){
    if(p === 'gemini'){
      if(/PerDay|per day|daily|_day/i.test(raw)) return { type: 'quota', jusqua: iaMinuitPT(), raison: 'quota du jour atteint' };
      const rd = raw.match(/"retryDelay"\s*:\s*"([\d.]+)s"/) || raw.match(/retry in ([\d.]+)s/i);
      if(rd) return { type: 'quota', jusqua: now + Math.max(+rd[1] * 1000 + 3000, 20000), raison: 'trop de demandes à la minute' };
      return { type: 'quota', jusqua: now + 3 * MIN, raison: 'limite atteinte' };
    }
    const d = iaDuree(msg) || (ra > 0 ? ra * 1000 : 0);
    if(/per day|RPD|TPD|daily/i.test(raw)) return { type: 'quota', jusqua: now + Math.max(d, 10 * MIN), raison: 'quota du jour atteint' };
    return { type: 'quota', jusqua: now + Math.max(d || 2 * MIN, 20000), raison: 'limite atteinte' };
  }
  if(status === 503 || status === 529 || /overloaded|unavailable|high demand/i.test(raw))
    return { type: 'surcharge', jusqua: now + MIN, raison: 'surchargée' };
  if(status === 401 || status === 403 || /api.?key|API_KEY_INVALID|invalid.*key|unauthori[sz]ed|authentication|PERMISSION_DENIED/i.test(raw))
    return { type: 'cle', raison: 'clé refusée' };
  if(status === 404 || /not found|no longer available|not supported for generateContent|decommissioned|does not exist|model_not_found/i.test(raw))
    return { type: 'indispo', jusqua: now + 24 * HEURE, raison: 'modèle plus disponible' };
  return { type: 'autre', raison: (msg || 'erreur ' + status).slice(0, 160) };
}
function iaErr(info){ const e = new Error(info.raison || 'erreur'); e.ia = info; return e; }

// ---------- Appel HTTP avec delai maximum ----------
async function iaPost(p, url, headers, body, ms){
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), ms);
  let r;
  try { r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal: ctl.signal }); }
  catch(e){ clearTimeout(to); throw iaErr({ type: e && e.name === 'AbortError' ? 'delai' : 'reseau', raison: e && e.name === 'AbortError' ? 'trop longue à répondre' : 'pas de connexion' }); }
  let j = {}; try { j = await r.json(); } catch(e){}
  clearTimeout(to);
  if(!r.ok || (j && j.error)) throw iaErr(iaClasser(p, r.status, j, r.headers));
  return j;
}

// ---------- Formats ----------
function iaTours(messages){
  const out = [];
  (messages || []).forEach(m => {
    if(!m) return;
    const role = m.role === 'user' ? 'user' : 'assistant';
    const text = String(m.text != null ? m.text : (m.content != null ? m.content : '')).trim() || '(photo)';
    if(out.length && out[out.length - 1].role === role) out[out.length - 1].text += '\n\n' + text;
    else out.push({ role, text });
  });
  while(out.length && out[0].role !== 'user') out.shift();
  if(!out.length) out.push({ role: 'user', text: 'Bonjour' });
  if(out[out.length - 1].role !== 'user') out.push({ role: 'user', text: 'Continue.' });
  return out;
}
async function iaB64Url(url){
  const r = await fetch(url); const blob = await r.blob();
  const data = await new Promise((ok, ko) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(',')[1]); fr.onerror = ko; fr.readAsDataURL(blob); });
  return { mime: blob.type && /^image\//.test(blob.type) ? blob.type : 'image/jpeg', data };
}
async function iaImages(list){
  const out = [];
  for(const im of (list || []).slice(0, 8)){
    try {
      if(!im) continue;
      if(typeof im === 'string'){
        if(/^data:/.test(im)){ const m = im.match(/^data:([^;]+);base64,(.*)$/); if(m) out.push({ mime: m[1], data: m[2] }); }
        else if(/^(https?:|blob:|\/)/.test(im)) out.push(await iaB64Url(im));
        else out.push({ mime: 'image/jpeg', data: im });
      } else if(im.data) out.push({ mime: im.mime || im.mime_type || 'image/jpeg', data: im.data });
      else if(im.url) out.push(await iaB64Url(im.url));
    } catch(e){ console.warn('ia image', e); }
  }
  return out;
}

async function appelGemini(c, model, o, key, recherche){
  const last = o.tours.length - 1;
  const contents = o.tours.map((t, i) => ({ role: t.role === 'user' ? 'user' : 'model',
    parts: [...(i === last ? o.imgs.map(im => ({ inline_data: { mime_type: im.mime, data: im.data } })) : []), { text: t.text }] }));
  const body = { ...(o.system ? { system_instruction: { parts: [{ text: o.system }] } } : {}), contents,
    ...(recherche ? { tools: [{ google_search: {} }] } : {}),
    generationConfig: { temperature: o.temperature, maxOutputTokens: Math.max(o.maxTokens * 2, 4096) } };
  const j = await iaPost('gemini', `${GEM}/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {}, body, o.delai);
  const cand = (j.candidates || [])[0] || {};
  const text = ((cand.content || {}).parts || []).filter(p => !p.thought).map(p => p.text || '').join('');
  if(!text.trim()){
    if(cand.finishReason === 'SAFETY' || (j.promptFeedback && j.promptFeedback.blockReason)) throw iaErr({ type: 'refus', raison: "L'IA n'a pas voulu répondre à ça. Reformule ta demande." });
    throw iaErr({ type: 'vide', raison: 'réponse vide' });
  }
  const gm = cand.groundingMetadata || {};
  const sources = (gm.groundingChunks || []).map(x => x.web).filter(w => w && w.uri).slice(0, 4).map(w => ({ title: w.title || 'source', uri: w.uri }));
  return { text, sources };
}
async function appelOpenAI(c, model, o, key, url){
  const last = o.tours.length - 1;
  const messages = [...(o.system ? [{ role: 'system', content: o.system }] : []), ...o.tours.map((t, i) => ({ role: t.role,
    content: i === last && o.imgs.length ? [{ type: 'text', text: t.text }, ...o.imgs.map(im => ({ type: 'image_url', image_url: { url: `data:${im.mime};base64,${im.data}` } }))] : t.text }))];
  const body = { model, messages, temperature: o.temperature, max_tokens: o.maxTokens };
  if(/gpt-oss/.test(model)){ body.reasoning_effort = 'low'; body.max_tokens = o.maxTokens + 1500; }
  const j = await iaPost(c.p, url, { Authorization: 'Bearer ' + key }, body, o.delai);
  const m = ((j.choices || [])[0] || {}).message || {};
  const text = Array.isArray(m.content) ? m.content.map(x => x.text || '').join('') : String(m.content || '');
  if(!text.trim()) throw iaErr({ type: 'vide', raison: 'réponse vide' });
  return { text, sources: [] };
}
async function appelAnthropic(c, model, o, key){
  const last = o.tours.length - 1;
  const msgs = o.tours.map((t, i) => ({ role: t.role, content: i === last && o.imgs.length
    ? [...o.imgs.map(im => ({ type: 'image', source: { type: 'base64', media_type: im.mime, data: im.data } })), { type: 'text', text: t.text }] : t.text }));
  const j = await iaPost('anthropic', 'https://api.anthropic.com/v1/messages',
    { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    { model, max_tokens: o.maxTokens, ...(o.system ? { system: o.system } : {}), messages: msgs }, o.delai);
  const text = (j.content || []).map(x => x.text || '').join('');
  if(!text.trim()) throw iaErr({ type: 'vide', raison: 'réponse vide' });
  return { text, sources: [] };
}

// ---------- Liste des IA a essayer, selon la tache ----------
// Texte / JSON : Flash-Lite (500 par jour) puis Flash, Groq, DeepSeek, Claude, OpenAI (dans l'ordre choisi).
// Photos ou recherche : Gemini passe devant, et Flash avant Flash-Lite (il voit et cherche mieux,
// et ces demandes sont rares, donc ses 20 par jour suffisent). Seules les IA qui voient les photos sont gardees.
function iaCandidats(o, cfg, mod){
  const photos = o.imgs.length > 0, devant = photos || o.recherche;
  let ordre = cfg.ordre.filter(p => cfg.keys[p] && (p !== 'custom' || cfg.url));
  if(devant && ordre.includes('gemini')) ordre = ['gemini', ...ordre.filter(p => p !== 'gemini')];
  const out = [];
  ordre.forEach(p => {
    const key = cfg.keys[p];
    if(p === 'gemini'){
      const L = { p, key, kind: 'lite', liste: mod.gemini.lite, label: 'Gemini Flash-Lite', vision: true, cherche: true };
      const F = { p, key, kind: 'flash', liste: mod.gemini.flash, label: 'Gemini Flash', vision: true, cherche: true };
      out.push(...(devant ? [F, L] : [L, F]));
    } else if(p === 'groq'){
      if(photos){ if(mod.groq.vision.length) out.push({ p, key, liste: mod.groq.vision, label: 'Groq', vision: true }); }
      else mod.groq.texte.slice(0, 2).forEach(m => out.push({ p, key, liste: [m], label: 'Groq' }));
    }
    else if(p === 'deepseek'){ if(!photos) out.push({ p, key, liste: ['deepseek-chat'], label: 'DeepSeek' }); }
    else if(p === 'anthropic') out.push({ p, key, liste: [AIM().anthropic || 'claude-sonnet-4-20250514'], label: 'Claude', vision: true });
    else if(p === 'openai') out.push({ p, key, liste: [AIM().openai || 'gpt-4o-mini'], label: 'OpenAI', vision: true });
    else if(p === 'custom') out.push({ p, key, liste: [AIM().openai || 'gpt-4o-mini'], label: 'Autre IA', vision: true, url: cfg.url });
  });
  return out;
}
async function iaAppel(c, model, o, recherche){
  if(c.p === 'gemini') return appelGemini(c, model, o, c.key, recherche);
  if(c.p === 'anthropic') return appelAnthropic(c, model, o, c.key);
  const url = c.p === 'groq' ? `${GROQ}/chat/completions` : c.p === 'deepseek' ? `${DEEPSEEK}/chat/completions`
    : c.p === 'openai' ? 'https://api.openai.com/v1/chat/completions' : c.url;
  return appelOpenAI(c, model, o, c.key, url);
}

// ---------- Le relais ----------
// iaRelais({system, messages:[{role, text}], images:[{mime, data} | url | base64], recherche, maxTokens, tache:'texte'|'images'|'json'})
//  -> {text, sources, fournisseur, modele}
async function iaRelais(opts){
  opts = opts || {};
  const cfg = iaCfg();
  if(!Object.keys(cfg.keys).length){
    const e = new Error("Configure ta clé IA dans Réglages IA (onglet Coach, Connexion IA)."); e.iaCle = true; throw e;
  }
  const o = {
    system: opts.system || '',
    tours: iaTours(opts.messages || [{ role: 'user', text: opts.prompt || '' }]),
    recherche: !!opts.recherche,
    maxTokens: Math.max(256, Number(opts.maxTokens) || 2500),
    tache: opts.tache || 'texte',
    temperature: opts.tache === 'json' ? 0.5 : 0.8
  };
  o.imgs = await iaImages(opts.images);
  o.delai = opts.delai || (o.imgs.length || o.maxTokens > 4000 || o.recherche ? 90000 : 60000);

  const mod = { gemini: gemDefaut(), groq: groqDefaut() };
  await Promise.all(['gemini', 'groq'].filter(p => cfg.keys[p]).map(async p => { try { mod[p] = await iaModeles(p, cfg.keys[p]); } catch(e){} }));
  const cands = iaCandidats(o, cfg, mod);
  const echecs = [];
  for(const c of cands){
    let essaye = false;
    for(const model of c.liste){
      const pid = `${c.p}:${model}`;
      const pz = iaPauseGet(pid);
      if(pz){ echecs.push({ c, model, type: 'pause', raison: pz.raison, jusqua: pz.jusqua }); if(pz.raison === 'modèle plus disponible') continue; break; }
      essaye = true;
      try {
        let res;
        const cherche = o.recherche && c.cherche;
        try { res = await iaAppel(c, model, o, cherche); }
        catch(e){
          // Recherche refusee pour une autre raison qu'un quota : on reessaie sans recherche
          if(cherche && e.ia && (e.ia.type === 'autre' || e.ia.type === 'vide')) res = await iaAppel(c, model, o, false);
          else throw e;
        }
        iaCompter(c.label);
        return { text: res.text, sources: res.sources || [], fournisseur: c.label, modele: model };
      } catch(e){
        const info = e.ia || { type: 'autre', raison: e.message || String(e) };
        if(info.type === 'refus'){ const er = new Error(info.raison); er.iaRefus = true; throw er; }
        if(info.jusqua) iaPauseSet(pid, info.jusqua, info.raison);
        echecs.push({ c, model, ...info });
        console.warn(`[IA relais] ${c.label} (${model}) : ${info.type} - ${info.raison}`);
        if(info.type === 'indispo') continue;   // modele suivant du meme fournisseur
        break;
      }
    }
    if(!essaye && !c.liste.length) echecs.push({ c, type: 'pause', raison: 'aucun modèle' });
  }
  throw iaEchecFinal(o, cfg, cands, echecs);
}

function iaEchecFinal(o, cfg, cands, echecs){
  const limite = t => ['quota', 'surcharge', 'pause', 'indispo'].includes(t);
  let msg, bandeau = false;
  const prochain = echecs.filter(x => x.jusqua).map(x => x.jusqua).sort((a, b) => a - b)[0];
  if(o.imgs.length && !cands.length){
    msg = "Les photos demandent Gemini : ajoute ta clé Gemini dans Réglages IA (les autres IA ne voient pas les photos)."; bandeau = true;
  } else if(o.imgs.length && echecs.some(x => limite(x.type))){
    msg = `Les photos demandent Gemini, qui est à la limite pour le moment. Réessaie plus tard${prochain ? ' (vers ' + iaHeure(prochain) + ')' : ''}.`; bandeau = true;
  } else if(echecs.length && echecs.some(x => limite(x.type)) && echecs.every(x => limite(x.type) || ['cle', 'autre', 'vide', 'reseau', 'delai'].includes(x.type))){
    msg = cfg.keys.groq
      ? "Toutes tes IA sont à la limite pour le moment. Réessaie dans quelques minutes, ou ajoute une clé DeepSeek dans Réglages IA pour ne plus être bloqué."
      : "Toutes tes IA sont à la limite pour le moment. Ajoute une clé Groq gratuite dans Réglages IA pour ne plus être bloqué.";
    bandeau = true;
  } else if(echecs.length && echecs.every(x => x.type === 'cle')){
    const noms = [...new Set(echecs.map(x => IA_PROV[x.c.p].court))].join(', ');
    msg = `Ta clé ${noms} est refusée. Vérifie-la dans Réglages IA (bouton Tester).`; bandeau = true;
  } else if(echecs.length && echecs.every(x => x.type === 'reseau' || x.type === 'delai')){
    msg = "Pas de réponse de l'IA. Vérifie ta connexion internet et réessaie.";
  } else {
    const d = echecs.filter(x => x.type !== 'pause').pop() || echecs[echecs.length - 1];
    msg = "L'IA n'a pas pu répondre : " + ((d && d.raison) || 'aucune IA disponible') + '.';
  }
  const e = new Error(msg); e.iaLimite = bandeau; e.echecs = echecs.map(x => ({ ia: x.c && x.c.label, modele: x.model, type: x.type, raison: x.raison }));
  if(bandeau) iaBandeau(msg);
  return e;
}

// ---------- Bandeau avec bouton vers les reglages ----------
function iaCss(){
  if(document.getElementById('iaCss')) return;
  const s = document.createElement('style'); s.id = 'iaCss';
  s.textContent = `
#iaBandeau{position:fixed;left:12px;right:12px;top:12px;z-index:100000;max-width:520px;margin:0 auto;background:var(--card2,#262626);color:var(--text,#fff);border:1px solid var(--border-2,rgba(255,255,255,.15));border-radius:14px;padding:12px 14px;box-shadow:0 10px 30px rgba(0,0,0,.35);font:500 13px/1.45 Inter,system-ui,sans-serif;display:flex;gap:10px;align-items:flex-start}
#iaBandeau p{margin:0;flex:1}
#iaBandeau .ia-b-go{display:block;margin-top:8px;background:var(--accent,#48A89A);color:#fff;border:0;border-radius:10px;padding:8px 12px;font:700 13px Inter,system-ui,sans-serif;cursor:pointer}
#iaBandeau .ia-b-x{background:none;border:0;color:var(--muted,#999);font-size:20px;line-height:1;cursor:pointer;padding:0 2px}
.ia-set{display:flex;flex-direction:column;gap:2px}
.ia-set .ia-intro{font-size:13px;color:var(--text-2,#ddd);line-height:1.5;margin:0 0 6px}
.ia-set .ia-lien{font-size:12px;color:var(--muted,#999);margin:4px 0 6px}
.ia-set .ia-lien a{color:var(--accent,#48A89A);font-weight:600}
.ia-set details{margin:8px 0 4px;border:1px solid var(--border,rgba(255,255,255,.08));border-radius:12px;padding:8px 12px}
.ia-set summary{cursor:pointer;font-weight:600;font-size:13px}
.ia-set .ia-h{font-weight:700;font-size:14px;margin:16px 0 6px}
.ia-ordre{display:flex;flex-direction:column;gap:6px}
.ia-o{display:flex;align-items:center;gap:8px;background:var(--card2,#262626);border:1px solid var(--border,rgba(255,255,255,.08));border-radius:12px;padding:8px 10px}
.ia-o.off{opacity:.55}
.ia-o .n{width:22px;height:22px;border-radius:50%;background:var(--accent,#48A89A);color:#fff;font:700 12px/22px Inter,sans-serif;text-align:center;flex:none}
.ia-o .t{flex:1;min-width:0;font-size:13px}
.ia-o .t b{display:block;font-size:13px}
.ia-o .t span{display:block;font-size:11px;color:var(--muted,#999);line-height:1.35}
.ia-o button{width:34px;height:34px;flex:none;border-radius:10px;border:1px solid var(--border-2,rgba(255,255,255,.12));background:var(--card,#202020);color:var(--text,#fff);font-size:14px;cursor:pointer;padding:0}
.ia-o button:disabled{opacity:.3;cursor:default}
.ia-btns{display:flex;gap:8px;margin-top:14px}
.ia-btns button{flex:1;margin:0}
.ia-res{margin-top:10px;display:flex;flex-direction:column;gap:6px}
.ia-r{font-size:13px;line-height:1.45;padding:8px 10px;border-radius:10px;background:var(--card2,#262626)}
.ia-r.ok b{color:#3ecf8e}.ia-r.ko b{color:#ff6b6b}
.ia-cpt{font-size:13px;line-height:1.7}
.ia-cpt .pz{color:var(--yellow,#f5c542);font-size:12px}
.ia-note{font-size:12px;color:var(--muted,#999);margin-top:8px;line-height:1.5}
.ia-bar{height:8px;border-radius:6px;background:var(--border,rgba(127,127,127,.18));overflow:hidden;margin:4px 0 8px}
.ia-bar i{display:block;height:100%;border-radius:6px;transition:width .4s}
.ia-bar.off{opacity:.4}
.ia-l{display:flex;justify-content:space-between;gap:8px;font-size:13px}
.ia-l span{color:var(--muted,#999);font-size:12px;white-space:nowrap}
.ia-jauge{cursor:pointer;background:var(--card,rgba(127,127,127,.08));border:1px solid var(--border,rgba(127,127,127,.18));border-radius:14px;padding:10px 12px;margin:0 0 12px}
.ia-jauge .l{display:flex;flex-direction:column;gap:2px}
.ia-jauge .l b{font-size:13px}.ia-jauge .l span{font-size:12px;color:var(--muted,#999)}
.ia-jauge .ia-bar{margin:8px 0 0}
.ia-semaine{display:flex;align-items:flex-end;gap:6px;height:70px;margin:8px 0 4px}
.ia-semaine div{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;height:100%;justify-content:flex-end}
.ia-semaine i{display:block;width:100%;max-width:26px;border-radius:5px 5px 2px 2px;background:var(--accent,#48A89A);min-height:2px}
.ia-semaine span{font-size:10px;color:var(--muted,#999)}
.ia-semaine em{font-style:normal;font-size:10px;font-weight:700}`;
  document.head.appendChild(s);
}
function iaEsc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function iaBandeau(msg){
  try {
    iaCss();
    const old = document.getElementById('iaBandeau'); if(old) old.remove();
    const d = document.createElement('div'); d.id = 'iaBandeau'; d.setAttribute('role', 'alert');
    d.innerHTML = `<p>${iaEsc(msg)}<button class="ia-b-go" type="button">Ouvrir Réglages IA</button></p><button class="ia-b-x" type="button" aria-label="Fermer">×</button>`;
    d.querySelector('.ia-b-go').onclick = () => { d.remove(); iaOuvrirReglages(); };
    d.querySelector('.ia-b-x').onclick = () => d.remove();
    document.body.appendChild(d);
    clearTimeout(iaBandeau.t); iaBandeau.t = setTimeout(() => d.remove(), 15000);
  } catch(e){}
}
function iaOuvrirReglages(){
  document.querySelectorAll('.ag-sheet-bg,.ag-dlg-bg').forEach(x => { try { x.remove(); } catch(e){} });
  if(typeof agGoTab === 'function') agGoTab('ia'); else if(typeof showTab === 'function') showTab('ia', null);
  setTimeout(() => {
    if(typeof coShowAIConfig === 'function') coShowAIConfig();
    else { const b = document.getElementById('aiConfigBody'); if(b && b.style.display === 'none' && typeof toggleAiConfig === 'function') toggleAiConfig(); if(b) b.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }, 350);
}

// ============================================================
// ECRAN REGLAGES IA
// ============================================================
const IA_UI = { ordre: null };
const IA_CHAMPS = [
  ['gemini', 'Clé Gemini (Google)', 'AIza...', 'Gratuite : <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>. Voit les photos et cherche sur internet.'],
  ['groq', 'Clé Groq (facultative)', 'gsk_...', 'Créer une clé gratuite : <a href="https://console.groq.com/keys" target="_blank" rel="noopener">console.groq.com/keys</a>. Environ 1 000 demandes par jour.'],
  ['deepseek', 'Clé DeepSeek (facultative)', 'sk-...', 'Très peu chère, à recharger : <a href="https://platform.deepseek.com" target="_blank" rel="noopener">platform.deepseek.com</a>. Texte seulement.']
];
const IA_AUTRES = [['anthropic', 'Clé Claude (Anthropic)', 'sk-ant-...'], ['openai', 'Clé OpenAI (GPT)', 'sk-...'], ['custom', 'Clé d\'une autre IA (compatible OpenAI)', 'clé']];
function iaDesc(p){
  return {
    gemini: "Flash-Lite d'abord, puis Flash. Pour les photos et la recherche : Flash d'abord.",
    groq: (((stGet().modeles.groq || {}).m || {}).vision || []).length ? 'Gratuit, environ 1 000 par jour. Voit aussi les photos' : 'Gratuit, environ 1 000 par jour, texte seulement',
    deepseek: 'Très peu cher, texte seulement',
    anthropic: 'Payant, voit les photos', openai: 'Payant, voit les photos', custom: 'Ton adresse personnalisée'
  }[p] || '';
}
function iaRenderReglages(){
  const body = document.getElementById('aiConfigBody'); if(!body) return;
  iaCss();
  const cfg = iaCfg();
  if(!IA_UI.ordre) IA_UI.ordre = cfg.ordre.slice();
  const champ = (p, l, ph, aide) => `<label for="iaK_${p}">${l}</label><input type="password" id="iaK_${p}" autocomplete="off" placeholder="${ph}" value="${iaEsc(cfg.keys[p] || '')}" oninput="iaRenderOrdre()">${aide ? `<div class="ia-lien">${aide}</div>` : ''}`;
  const autres = IA_AUTRES.some(([p]) => cfg.keys[p]);
  body.innerHTML = `<div class="ia-set">
    <p class="ia-intro">L'app essaie tes IA dans l'ordre ci-dessous. Si une IA est à la limite, elle passe toute seule à la suivante. Tu n'as rien à faire.</p>
    ${IA_CHAMPS.map(c => champ(...c)).join('')}
    <details${autres ? ' open' : ''}><summary>Autres clés (facultatives, payantes)</summary>
      ${IA_AUTRES.map(([p, l, ph]) => champ(p, l, ph, '')).join('')}
      <label for="iaUrl">Adresse de l'autre IA</label><input type="text" id="iaUrl" placeholder="https://.../v1/chat/completions" value="${iaEsc(cfg.url)}">
    </details>
    <div class="ia-h">Ordre du relais</div>
    <div class="ia-ordre" id="iaOrdre"></div>
    <div class="ia-btns"><button class="btn-primary" type="button" onclick="saveAiConfig()">Enregistrer</button><button class="btn-secondary" type="button" id="iaTestBtn" onclick="iaTester()">Tester</button></div>
    <div class="ia-res" id="iaTestRes"></div>
    <div class="ia-h">Aujourd'hui</div>
    <div class="ia-cpt" id="iaCompteurs"></div>
    <div class="ia-note">Clés gardées sur cet appareil et dans ton compte privé (jamais dans les sauvegardes). Le bouton Tester ne consomme pas ton quota.</div>
  </div>`;
  iaRenderOrdre(); iaRenderCompteurs();
}
function iaRenderOrdre(){
  const box = document.getElementById('iaOrdre'); if(!box) return;
  const cfg = iaCfg(), o = IA_UI.ordre || cfg.ordre;
  const a = id => { const el = document.getElementById('iaK_' + id); return el ? el.value.trim() : cfg.keys[id]; };
  box.innerHTML = o.map((p, i) => {
    const on = !!a(p);
    return `<div class="ia-o${on ? '' : ' off'}"><div class="n">${i + 1}</div><div class="t"><b>${IA_PROV[p].nom}</b><span>${on ? iaDesc(p) : 'Pas de clé'}</span></div>
      <button type="button" aria-label="Monter" onclick="iaMonter(${i},-1)" ${i === 0 ? 'disabled' : ''}>▲</button><button type="button" aria-label="Descendre" onclick="iaMonter(${i},1)" ${i === o.length - 1 ? 'disabled' : ''}>▼</button></div>`;
  }).join('');
}
function iaMonter(i, d){
  const o = (IA_UI.ordre || iaCfg().ordre).slice(), j = i + d;
  if(j < 0 || j >= o.length) return;
  [o[i], o[j]] = [o[j], o[i]]; IA_UI.ordre = o;
  const raw = iaRaw();
  if(raw.keys || raw.key){
    raw.ordre = o; try { localStorage.setItem('aiConfig', JSON.stringify(raw)); } catch(e){}
    clearTimeout(iaMonter.t); iaMonter.t = setTimeout(() => iaSync(raw), 1500);
  }
  iaRenderOrdre();
}
function iaRenderCompteurs(){
  const box = document.getElementById('iaCompteurs'); if(!box) return;
  const st = stGet(), now = Date.now(), u = iaUsage();
  const pauseDe = pref => Object.keys(st.pause).filter(k => k.startsWith(pref) && st.pause[k].jusqua > now && st.pause[k].raison !== 'modèle plus disponible').map(k => st.pause[k]).sort((a, b) => b.jusqua - a.jusqua)[0];
  const gm = (st.modeles.gemini || {}).m || gemDefaut();
  const pref = { 'Gemini Flash-Lite': 'gemini:' + (gm.lite[0] || ''), 'Gemini Flash': 'gemini:' + (gm.flash[0] || ''), 'Groq': 'groq:', 'DeepSeek': 'deepseek:', 'Claude': 'anthropic:', 'OpenAI': 'openai:', 'Autre IA': 'custom:' };
  const N = x => new Intl.NumberFormat('fr-FR').format(x);
  const lignes = u.items.map(x => {
    const pz = pauseDe(pref[x.label] || x.label);
    return `<div class="ia-l"><b>${x.label}</b><span>${x.limite ? `${N(x.utilise)} / ${N(x.limite)}` : `${N(x.utilise)} (payant)`}</span></div>
      ${iaBarre(x.utilise, x.limite)}${pz ? `<div class="pz" style="margin:-4px 0 8px">En pause jusqu'à ${iaHeure(pz.jusqua)} (${iaEsc(pz.raison)}) : l'app utilise les autres.</div>` : ''}`;
  });
  // 7 derniers jours
  const h = st.histo || {}, jours = [];
  for(let i = 6; i >= 0; i--){
    const d = new Date(Date.now() - i * 864e5), o = ptParts(d), k = `${o.year}-${o.month}-${o.day}`;
    const t = Object.values(h[k] || {}).reduce((a, v) => a + v, 0);
    jours.push({ k, t, nom: i === 0 ? 'Auj.' : d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '') });
  }
  const mx = Math.max(1, ...jours.map(j => j.t));
  const semaine = `<div class="ia-h" style="margin-top:12px">Les 7 derniers jours</div>
    <div class="ia-semaine">${jours.map(j => `<div><em>${j.t || ''}</em><i style="height:${Math.round(j.t / mx * 48)}px"></i><span>${j.nom}</span></div>`).join('')}</div>`;
  box.innerHTML = (u.items.length ? iaJaugeHtml() + lignes.join('') + semaine
      : '<div class="ia-note" style="margin:0">Aucune clé pour le moment.</div>')
    + `<div class="ia-note">Les limites sont des estimations des offres gratuites. Les compteurs repartent à zéro chaque jour vers ${iaHeure(iaMinuitPT() - MIN)}. Ils comptent les demandes faites depuis cet appareil.</div>`;
}
window.iaUsage = iaUsage;
async function iaTester(){
  const btn = document.getElementById('iaTestBtn'), box = document.getElementById('iaTestRes'); if(!box) return;
  const v = p => { const el = document.getElementById('iaK_' + p); return el ? el.value.trim() : ''; };
  const url = (document.getElementById('iaUrl') || {}).value || '';
  const liste = IA_ORDRE.filter(p => v(p));
  if(!liste.length){ box.innerHTML = '<div class="ia-r ko"><b>✘</b> Colle au moins une clé avant de tester.</div>'; return; }
  if(btn){ btn.disabled = true; btn.textContent = 'Test en cours...'; }
  box.innerHTML = liste.map(p => `<div class="ia-r" id="iaT_${p}">${IA_PROV[p].nom} : test...</div>`).join('');
  await Promise.all(liste.map(async p => {
    let ok = false, txt = '';
    try { [ok, txt] = await iaTest1(p, v(p), url.trim()); }
    catch(e){ ok = false; txt = e && e.name === 'AbortError' ? 'pas de réponse (connexion ?)' : 'pas de connexion, ou accès bloqué'; }
    const el = document.getElementById('iaT_' + p);
    if(el){ el.className = 'ia-r ' + (ok ? 'ok' : 'ko'); el.innerHTML = `<b>${ok ? '✓' : '✘'}</b> ${IA_PROV[p].nom} : ${iaEsc(txt)}`; }
  }));
  if(btn){ btn.disabled = false; btn.textContent = 'Tester'; }
  iaRenderCompteurs();
}
function iaRaison(r){
  const c = iaClasser('', r.status, r.j);
  if(c.type === 'cle') return 'clé refusée, vérifie-la (copie-la en entier)';
  if(c.type === 'quota') return 'clé valide, mais ' + c.raison;
  return (iaMsg(r.j) || 'erreur ' + r.status).slice(0, 120);
}
async function iaTest1(p, key, url){
  if(p === 'gemini'){
    const r = await iaGet(`${GEM}/models?pageSize=1000&key=${encodeURIComponent(key)}`);
    if(!r.ok) return [false, iaRaison(r)];
    try { await iaModeles('gemini', key, true); } catch(e){}
    const m = (stGet().modeles.gemini || {}).m || gemDefaut();
    return [true, `clé valide. Flash-Lite : ${m.lite[0] || '?'}, Flash : ${m.flash[0] || '?'}`];
  }
  if(p === 'groq'){
    const r = await iaGet(`${GROQ}/models`, { Authorization: 'Bearer ' + key });
    if(!r.ok) return [false, iaRaison(r)];
    try { await iaModeles('groq', key, true); } catch(e){}
    const m = (stGet().modeles.groq || {}).m || groqDefaut();
    return [true, `clé valide. Texte : ${m.texte[0] || '?'}${m.vision.length ? ', photos : ' + m.vision[0] : ', pas de modèle photo'}`];
  }
  if(p === 'deepseek'){
    const r = await iaGet(`${DEEPSEEK}/user/balance`, { Authorization: 'Bearer ' + key });
    if(!r.ok) return [false, iaRaison(r)];
    const b = (r.j.balance_infos || [])[0];
    if(r.j.is_available === false) return [false, 'clé valide, mais plus de crédit : recharge sur platform.deepseek.com'];
    return [true, 'clé valide' + (b ? `, solde : ${b.total_balance} ${b.currency}` : '')];
  }
  if(p === 'anthropic'){
    const r = await iaGet('https://api.anthropic.com/v1/models', { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' });
    return r.ok ? [true, 'clé valide'] : [false, iaRaison(r)];
  }
  if(p === 'openai'){
    const r = await iaGet('https://api.openai.com/v1/models', { Authorization: 'Bearer ' + key });
    return r.ok ? [true, 'clé valide'] : [false, iaRaison(r)];
  }
  if(p === 'custom'){
    if(!url) return [false, "ajoute l'adresse de l'autre IA"];
    try { await iaPost('custom', url, { Authorization: 'Bearer ' + key }, { model: AIM().openai || 'gpt-4o-mini', messages: [{ role: 'user', content: 'OK' }], max_tokens: 3 }, 20000); return [true, 'répond bien']; }
    catch(e){ return [false, (e.ia && e.ia.raison) || e.message]; }
  }
  return [false, 'inconnu'];
}

async function iaSync(cfg){
  try {
    const user = typeof getCurrentUser === 'function' ? await getCurrentUser() : null;
    if(user && typeof sb !== 'undefined'){ await sb.from('user_settings').upsert({ user_id: user.id, ai_config: cfg }, { onConflict: 'user_id' }); }
  } catch(e){}
}
// Remplace les anciennes fonctions de modules.js (memes noms, memes usages)
async function saveAiConfig(){
  const v = p => { const el = document.getElementById('iaK_' + p); return el ? el.value.trim() : ''; };
  const keys = {}; IA_ORDRE.forEach(p => { if(v(p)) keys[p] = v(p); });
  const url = ((document.getElementById('iaUrl') || {}).value || '').trim();
  if(!Object.keys(keys).length){ (typeof agAlert === 'function' ? agAlert : alert)('Colle au moins une clé (Gemini par exemple).'); return; }
  const old = iaCfg();
  const ordre = (IA_UI.ordre || old.ordre).slice();
  const prem = ordre.find(p => keys[p] && (p !== 'custom' || url)) || Object.keys(keys)[0];
  // provider + key gardes pour la compatibilite avec l'ancien format
  const cfg = { ...old.raw, provider: prem, key: keys[prem], url, keys, ordre, v: 2 };
  localStorage.setItem('aiConfig', JSON.stringify(cfg));
  // Nouvelle cle = nouveaux quotas : on oublie les pauses et la liste des modeles de ce fournisseur
  const s = stGet();
  Object.keys(keys).forEach(p => { if(keys[p] !== old.keys[p]){ Object.keys(s.pause).forEach(k => { if(k.startsWith(p + ':')) delete s.pause[k]; }); delete s.modeles[p]; } });
  stPut(s);
  await iaSync(cfg);
  updateAiStatus();
  if(typeof agToast === 'function') agToast('Réglages IA enregistrés'); else alert('Enregistré !');
}
function updateAiStatus(){
  const el = document.getElementById('aiStatus');
  const cfg = iaCfg(), n = Object.keys(cfg.keys).length;
  if(el){
    if(n){ el.textContent = n > 1 ? `connectée (${n} IA)` : 'connectée'; el.classList.add('on'); }
    else { el.textContent = 'non configurée'; el.classList.remove('on'); }
  }
  IA_UI.ordre = null;
  iaRenderReglages();
}
function toggleCustomUrl(){}

// callAI(prompt) -> texte (meme signature qu'avant)
async function callAI(prompt){
  const p = String(prompt == null ? '' : prompt);
  const r = await iaRelais({ messages: [{ role: 'user', text: p }], maxTokens: 3000, tache: /\bJSON\b/.test(p) ? 'json' : 'texte' });
  return r.text;
}
// Discussion de l'onglet IA (meme signature qu'avant)
async function callChatAI(userMessage){
  const context = typeof buildChatContext === 'function' ? buildChatContext() : '';
  const hist = (typeof chatHistory !== 'undefined' && Array.isArray(chatHistory) ? chatHistory : [])
    .filter(m => m.role === 'user' || m.role === 'assistant').slice(-20).map(m => ({ role: m.role, text: m.content }));
  if(hist.length && hist[hist.length - 1].role === 'user') hist.pop();
  const system = `Tu es un assistant financier personnel, direct et concret.\n\nVoici TOUTES les données de l'utilisateur :\n\n${context}\n\nRÈGLES :\n- Réponds en français, clair et amical.\n- Base-toi sur ces données réelles.\n- Conseils CONCRETS et CHIFFRÉS.\n- Emojis avec modération.\n- N'utilise PAS d'astérisques **.`;
  const r = await iaRelais({ system, messages: [...hist, { role: 'user', text: userMessage }], maxTokens: 1500 });
  return r.text || 'Pas de réponse';
}

// Pour les tests et le depannage
function iaRelaisEtat(){ const s = stGet(); return { jour: s.jour, compte: iaComptes(), pause: s.pause, modeles: s.modeles, cfg: { ordre: iaCfg().ordre, fournisseurs: Object.keys(iaCfg().keys) } }; }
function iaRelaisReset(){ const s = stGet(); s.pause = {}; stPut(s); }

Object.assign(window, { iaRelais, iaRelaisEtat, iaRelaisReset, iaHasKey, iaOuvrirReglages, iaTester, iaMonter, iaRenderReglages, iaRenderOrdre,
  saveAiConfig, updateAiStatus, toggleCustomUrl, callAI, callChatAI });

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iaRenderReglages); else iaRenderReglages();
})();
