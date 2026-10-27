// ============================================================
// VOIX : dictee vocale partout, phrases toutes pretes (/) et lecture de captures
// Charge juste apres ia.js. N'utilise que des fonctions globales deja la
// (iaRelais, iaCfg via aiConfig, iaCompter, agSheet, sb...) et les teste avant.
//
// Fonctions disponibles pour les autres fichiers :
//   vxOuvrirPhrases()                      -> fenetre "Mes phrases toutes pretes"
//   vxLireCapture(type, callback)          -> lit une image (capture WhatsApp, carte de visite...) avec l'IA
//       Exemple :
//       vxLireCapture('contact', o => { document.getElementById('crmEName').value = o.nom; ... });
//       // type 'contact' : {nom, telephone, email, ville, notes}
//       // type 'demande' : {nom, telephone, date_souhaitee, heure, type_seance, budget, message}
//       // Renvoie aussi une promesse (null si annule ou erreur).
//   vxExtraireTexte(texte, type)           -> meme chose a partir d'un texte colle (promesse)
//       Exemple : const o = await vxExtraireTexte(collage, 'demande'); if(o.telephone) ...
//   vxDicter(champ)                        -> lance la dictee dans ce champ
//   vxEquiper(zone)                        -> ajoute tout de suite les micros dans une zone
//   vxPhrases()                            -> la liste des phrases [{k, t, x}]
//   vxInserer(champ, texte)                -> insere du texte a la position du curseur
// Pour couper le micro sur un champ : data-vx="off" (sur le champ ou un parent).
// Pour donner le prenom du client aux phrases : data-prenom="Awa" sur un parent, ou window.vxPrenom.
// ============================================================
(function(){
'use strict';

const LS_PH = 'vxPhrases', LS_REG = 'vxReglages', LS_PAUSE = 'vxGroqPause';
const GROQ_AUDIO = 'https://api.groq.com/openai/v1/audio/transcriptions';
const MAX_MS = 3 * 60 * 1000;
const ADRESSE_DEF = 'Ahougnansou, en face du Restaurant Le Rosier, Bouaké';
const VOCAB = "Henzo, Henzo Studio, Henzo Photographie, Bouaké, Ahougnansou, Restaurant Le Rosier, Abidjan, Yamoussoukro, " +
  "shooting, moodboard, Wave, Orange Money, MTN MoMo, Moov Money, FCFA, dot, acompte, séance photo, retouche, tirage, " +
  "book, mariage civil, baptême, anniversaire, maternité, studio, galerie, Instagram, TikTok, WhatsApp, Facebook.";
const NOMS = /^(Henzo|Bouaké|Bouake|Ahougnansou|Abidjan|Yamoussoukro|Wave|Orange|MTN|Moov|FCFA|Instagram|TikTok|WhatsApp|Facebook|Google|Le Rosier|Dieu|Monsieur|Madame|Mme|M\.)\b/;
// Phrases que Whisper "invente" quand il n'entend que du silence
const HALLU = /amara\.org|sous-titr|merci d'avoir regard|abonnez-vous|^\W*merci\W*$|^\W*musique\W*$/i;

const SVG_MIC = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
const SVG_AI = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>';
const VX = { st: null, pop: null, liste: null, infos: null, lu: false, timer: 0, scanT: 0 };

// ---------- Petits outils ----------
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tirets = s => String(s == null ? '' : s).replace(/[\u2014\u2013]/g, '-');
function lsGet(k, d){ try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch(e){ return d; } }
function lsSet(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
function reglages(){ const r = lsGet(LS_REG, {}) || {}; return { silence: r.silence == null ? 2 : Number(r.silence), moteur: r.moteur === 'navigateur' ? 'navigateur' : 'auto' }; }
function cleGroq(){
  try { if(typeof iaCfg === 'function') return iaCfg().keys.groq || ''; } catch(e){}
  const c = lsGet('aiConfig', {}) || {};
  return (c.keys && c.keys.groq) || (c.provider === 'groq' && c.key) || '';
}
function SRClasse(){ return window.SpeechRecognition || window.webkitSpeechRecognition || null; }
function peutEnregistrer(){ return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder); }
function alerte(m){ if(typeof agAlert === 'function') agAlert(m); else alert(m); }
function declencher(el){
  try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch(e){}
  try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch(e){}
}

// ---------- Style ----------
function css(){
  if(document.getElementById('vxCss')) return;
  const s = document.createElement('style'); s.id = 'vxCss';
  s.textContent = `
.vx-wrap{position:relative;display:block;max-width:100%;min-width:0}
.vx-wrap.vx-il{display:inline-block;vertical-align:middle}
textarea.vx-pad,input.vx-pad{padding-right:42px !important}
textarea.vx-pad2,input.vx-pad2{padding-right:76px !important}
.vx-wrap .vx-b{position:absolute;top:6px;right:6px;width:30px !important;height:30px !important;min-width:0 !important;padding:0 !important;margin:0 !important;border-radius:50% !important;
  border:1px solid transparent !important;background:transparent !important;color:var(--muted,#999) !important;font:15px/28px system-ui,sans-serif !important;text-align:center;display:flex;align-items:center;justify-content:center;cursor:pointer;
  opacity:.55;z-index:2;box-shadow:none !important;transition:opacity .15s,background .15s,transform .15s;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.vx-wrap .vx-b:hover,.vx-wrap:focus-within .vx-b{opacity:.95;background:var(--card3,rgba(127,127,127,.15)) !important}
.vx-wrap .vx-b:focus-visible{outline:2px solid var(--accent,#48A89A);outline-offset:1px}
.vx-wrap .vx-ai{display:none;color:var(--accent,#48A89A) !important;opacity:.9}
.vx-wrap.vx-dicte .vx-ai{display:flex}
.vx-wrap .vx-ai.vx-busy{animation:vxTourne 1s linear infinite}
.vx-wrap.vx-on .vx-mic{opacity:1;background:#e5484d !important;color:#fff !important;border-color:#e5484d !important;animation:vxPulse 1.2s ease-out infinite}
.vx-wrap.vx-on .vx-mic::before{content:'';position:absolute;inset:9px;border-radius:2px;background:#fff}
.vx-wrap.vx-on .vx-mic span{display:none}
.vx-wrap .vx-b span{display:flex}
.vx-wrap.vx-wait .vx-mic{opacity:1;animation:vxTourne 1s linear infinite}
@keyframes vxPulse{0%{box-shadow:0 0 0 0 rgba(229,72,77,.55) !important}70%{box-shadow:0 0 0 10px rgba(229,72,77,0) !important}100%{box-shadow:0 0 0 0 rgba(229,72,77,0) !important}}
@keyframes vxTourne{to{transform:rotate(360deg)}}
#vxBar{position:fixed;left:12px;right:12px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:100001;max-width:520px;margin:0 auto;
  background:var(--card,#202020);color:var(--text,#fff);border:1px solid var(--border-2,rgba(127,127,127,.25));border-radius:16px;padding:10px 12px;
  box-shadow:0 12px 34px rgba(0,0,0,.35);font:500 13px/1.4 Inter,system-ui,sans-serif}
#vxBar .vx-l1{display:flex;align-items:center;gap:10px}
#vxBar .vx-dot{width:12px;height:12px;border-radius:50%;background:#e5484d;flex:none;animation:vxPulse 1.2s ease-out infinite}
#vxBar.vx-attente .vx-dot{background:var(--accent,#48A89A);animation:vxTourne 1s linear infinite;border-radius:3px}
#vxBar .vx-t{flex:1;min-width:0}
#vxBar .vx-t b{display:block;font-size:13px}
#vxBar .vx-t small{display:block;color:var(--muted,#999);font-size:11px}
#vxBar .vx-chrono{font-variant-numeric:tabular-nums;font-weight:700;color:var(--muted,#999)}
#vxBar .vx-niv{height:4px;border-radius:3px;background:var(--border,rgba(127,127,127,.2));margin:8px 0 0;overflow:hidden}
#vxBar .vx-niv i{display:block;height:100%;width:0;background:var(--accent,#48A89A);transition:width .1s}
#vxBar .vx-live{margin-top:8px;font-size:14px;color:var(--text-2,#ddd);font-style:italic;max-height:66px;overflow:auto}
#vxBar .vx-live:empty{display:none}
#vxBar button{width:auto;margin:0;padding:8px 12px;border-radius:10px;font:700 13px Inter,system-ui,sans-serif;cursor:pointer;flex:none}
#vxBar .vx-stop{background:#e5484d;color:#fff;border:0}
#vxBar .vx-x{background:transparent;color:var(--muted,#999);border:1px solid var(--border-2,rgba(127,127,127,.25))}
#vxToast{position:fixed;left:12px;right:12px;bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:100002;max-width:480px;margin:0 auto;display:flex;align-items:center;gap:10px;
  background:var(--card2,#262626);color:var(--text,#fff);border:1px solid var(--border-2,rgba(127,127,127,.25));border-radius:12px;padding:10px 12px;box-shadow:0 10px 26px rgba(0,0,0,.3);font:500 13px/1.4 Inter,system-ui,sans-serif}
#vxToast p{margin:0;flex:1}
#vxToast button{width:auto;margin:0;padding:7px 11px;border-radius:9px;border:1px solid var(--accent,#48A89A);background:transparent;color:var(--accent,#48A89A);font:700 13px Inter,system-ui,sans-serif;cursor:pointer;flex:none}
#vxPop{position:fixed;z-index:100003;background:var(--card,#202020);color:var(--text,#fff);border:1px solid var(--border-2,rgba(127,127,127,.25));border-radius:14px;
  box-shadow:0 14px 34px rgba(0,0,0,.35);overflow:hidden;font:500 13px/1.35 Inter,system-ui,sans-serif;display:flex;flex-direction:column}
#vxPop .vx-pl{overflow:auto;max-height:260px;padding:4px}
#vxPop .vx-pi{display:block;width:100%;text-align:left;margin:0;padding:8px 10px;border:0;border-radius:10px;background:transparent;color:inherit;cursor:pointer;font:inherit}
#vxPop .vx-pi.on,#vxPop .vx-pi:hover{background:var(--card3,rgba(127,127,127,.15))}
#vxPop .vx-pi b{color:var(--accent,#48A89A);font-weight:700}
#vxPop .vx-pi span{font-weight:600;margin-left:6px}
#vxPop .vx-pi small{display:block;color:var(--muted,#999);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}
#vxPop .vx-pf{display:block;width:100%;margin:0;border:0;border-top:1px solid var(--border,rgba(127,127,127,.18));border-radius:0;background:transparent;color:var(--muted,#999);padding:9px 12px;text-align:left;font:600 12px Inter,system-ui,sans-serif;cursor:pointer}
#vxPop .vx-pf:hover{color:var(--accent,#48A89A)}
#vxPop .vx-pv{padding:10px 12px;color:var(--muted,#999);font-size:12px}
.vx-ph{display:flex;flex-direction:column;gap:8px;margin-top:6px}
.vx-ph .vx-it{border:1px solid var(--border,rgba(127,127,127,.18));background:var(--card2,rgba(127,127,127,.06));border-radius:12px;padding:10px 12px}
.vx-ph .vx-it .vx-h{display:flex;align-items:center;gap:8px}
.vx-ph .vx-it .vx-h b{color:var(--accent,#48A89A)}
.vx-ph .vx-it .vx-h span{flex:1;font-weight:600;font-size:13px;min-width:0}
.vx-ph .vx-it p{margin:6px 0 0;font-size:12px;color:var(--muted,#999);white-space:pre-line;max-height:54px;overflow:hidden}
.vx-ph .vx-it button{width:auto;margin:0;padding:6px 10px;font-size:12px;border-radius:9px}
.vx-chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 2px}
.vx-chips button{width:auto;margin:0;padding:5px 9px;font-size:12px;border-radius:20px;background:var(--card3,rgba(127,127,127,.12));border:1px solid var(--border-2,rgba(127,127,127,.2));color:var(--text,#fff);cursor:pointer}
.vx-aide{font-size:12px;color:var(--muted,#999);line-height:1.5;margin:4px 0 8px}
.vx-row{display:flex;gap:8px;margin-top:12px}.vx-row button{flex:1;margin:0}
.vx-sep{font-weight:700;font-size:14px;margin:18px 0 4px}`;
  document.head.appendChild(s);
}

// ---------- Quels champs ? ----------
const MOTS_NON = /cl[eé]s?\b|\bkey|token|secret|\bapi\b|mot.?de.?passe|password|e-?mail|courriel|t[eé]l[eé]phone|phone|\btel\b|whatsapp|num[eé]ro|montant|\bprix\b|iban|\burl\b|https?:|lien wave|\bcode\b|\bslug\b/i;
const RECH = /search|recherch|cherche|filtr|srch/i;
function champOk(el){
  if(!el || el.disabled || el.readOnly) return false;
  if(el.closest && el.closest('[data-vx="off"]')) return false;
  if(el.tagName === 'TEXTAREA') return true;
  if(el.tagName !== 'INPUT') return false;
  const t = (el.getAttribute('type') || 'text').toLowerCase();
  if(t !== 'text' && t !== 'search') return false;
  const im = (el.getAttribute('inputmode') || '').toLowerCase();
  if(['numeric', 'decimal', 'tel', 'email', 'url', 'none'].includes(im)) return false;
  const ac = (el.getAttribute('autocomplete') || '').toLowerCase();
  if(/email|tel|password|url|cc-|one-time|username/.test(ac)) return false;
  return !MOTS_NON.test([el.id, el.name, el.placeholder, el.getAttribute('aria-label'), el.className].join(' '));
}
function estRecherche(el){
  if(el.tagName !== 'INPUT') return false;
  return (el.getAttribute('type') || '').toLowerCase() === 'search' || RECH.test([el.id, el.name, el.placeholder, el.className].join(' '));
}

// ---------- Ajout du bouton micro ----------
// Garde anti-reentree : deplacer un champ qui a le focus puis lui rendre le focus
// declenche "focusin", qui ne doit pas relancer equiper() sur le meme champ.
function equiper(el){
  if(!el || el.__vx || el.__vxNon || VX.occupe) return;
  VX.occupe = true;
  try { equiper1(el); }
  catch(e){ el.__vxNon = true; console.warn('vx equiper', e); }
  finally { VX.occupe = false; }
}
function equiper1(el){
  if(el.__vx || !el.parentElement) return;
  if(!champOk(el) || estRecherche(el)) { el.__vxNon = true; return; }
  const w0 = el.offsetWidth;
  if(!w0) return;                                  // cache pour le moment : on reessaiera
  if(el.tagName === 'INPUT' && w0 <= 120) return;
  const p = el.parentElement, pcs = getComputedStyle(p), cs = getComputedStyle(el);
  const wrap = document.createElement('span'); wrap.className = 'vx-wrap';
  if(/flex/.test(pcs.display)){
    wrap.style.flex = `${cs.flexGrow} ${cs.flexShrink} ${cs.flexBasis}`;
    if(cs.alignSelf && cs.alignSelf !== 'auto') wrap.style.alignSelf = cs.alignSelf;
    if(cs.order && cs.order !== '0') wrap.style.order = cs.order;
    if(cs.flexGrow === '0') wrap.style.width = w0 + 'px';
  } else if(/grid/.test(pcs.display)){
    ['gridColumn', 'gridRow'].forEach(k => { if(cs[k] && cs[k] !== 'auto' && cs[k] !== 'auto / auto') wrap.style[k] = cs[k]; });
  } else if(/^inline/.test(cs.display) && w0 < p.clientWidth - 30){
    wrap.classList.add('vx-il'); wrap.style.width = w0 + 'px';
  }
  const actif = document.activeElement === el;
  const s0 = actif ? el.selectionStart : null, e0 = actif ? el.selectionEnd : null;
  p.insertBefore(wrap, el); wrap.appendChild(el);
  if(actif){ try { el.focus({ preventScroll: true }); if(s0 != null) el.setSelectionRange(s0, e0); } catch(e){} }
  const mic = document.createElement('button');
  mic.type = 'button'; mic.className = 'vx-b vx-mic'; mic.tabIndex = -1;
  mic.title = 'Dicter au micro'; mic.setAttribute('aria-label', 'Dicter au micro'); mic.innerHTML = '<span>' + SVG_MIC + '</span>';
  const ai = document.createElement('button');
  ai.type = 'button'; ai.className = 'vx-b vx-ai'; ai.tabIndex = -1;
  ai.title = 'Mettre au propre (orthographe, ponctuation)'; ai.setAttribute('aria-label', 'Mettre au propre'); ai.innerHTML = SVG_AI;
  [mic, ai].forEach(b => b.addEventListener('pointerdown', ev => ev.preventDefault()));   // garde le curseur dans le champ
  mic.addEventListener('mousedown', ev => ev.preventDefault());
  mic.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); basculer(el); });
  ai.addEventListener('mousedown', ev => ev.preventDefault());
  ai.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); auPropre(el); });
  wrap.appendChild(mic); wrap.appendChild(ai);
  el.classList.add('vx-pad');
  el.__vx = { wrap, mic, ai };
  placer(el);
  if(window.ResizeObserver){ const ro = new ResizeObserver(() => placer(el)); ro.observe(el); el.__vx.ro = ro; }
}
function placer(el){
  const v = el.__vx; if(!v) return;
  const h = el.offsetHeight, w = el.offsetWidth; if(!w) return;
  const cs = getComputedStyle(el);
  const barre = Math.max(0, w - el.clientWidth - (parseFloat(cs.borderLeftWidth) || 0) - (parseFloat(cs.borderRightWidth) || 0));
  const droite = el.offsetLeft + w - barre - 36;
  const haut = el.tagName === 'TEXTAREA' && h > 54 ? el.offsetTop + 6 : el.offsetTop + Math.max(0, (h - 30) / 2);
  v.mic.style.left = droite + 'px'; v.mic.style.top = haut + 'px'; v.mic.style.right = 'auto';
  v.ai.style.left = (droite - 34) + 'px'; v.ai.style.top = haut + 'px'; v.ai.style.right = 'auto';
}
function montrerPropre(el, oui){
  const v = el.__vx; if(!v) return;
  v.wrap.classList.toggle('vx-dicte', !!oui);
  el.classList.toggle('vx-pad2', !!oui);
  placer(el);
}
function scanner(racine){
  css();
  const r = racine && racine.querySelectorAll ? racine : document;
  r.querySelectorAll('textarea, input').forEach(el => { if(!el.__vx && !el.__vxNon) equiper(el); });
  document.querySelectorAll('.vx-wrap > textarea, .vx-wrap > input').forEach(placer);
}
function planifier(){
  if(VX.scanT) return;
  VX.scanT = setTimeout(() => { VX.scanT = 0; try { scanner(); } catch(e){ console.warn('vx scan', e); } }, 160);
}

// ============================================================
// DICTEE
// ============================================================
function basculer(el){
  if(VX.st && VX.st.el === el){ arreter(); return; }
  if(VX.st) annuler(true);
  demarrer(el);
}
function selectionDe(el){
  const n = el.value.length;
  if(document.activeElement === el && el.selectionStart != null) return { s: el.selectionStart, e: el.selectionEnd };
  if(el.__vxSel && el.__vxSel.s <= n) return { s: Math.min(el.__vxSel.s, n), e: Math.min(el.__vxSel.e, n) };
  return { s: n, e: n };
}
function groqEnPause(){ const p = lsGet(LS_PAUSE, null); return p && p.jusqua > Date.now() ? p : null; }
async function demarrer(el, force){
  css();
  const sel = selectionDe(el);
  const SR = SRClasse(), groq = cleGroq(), enr = peutEnregistrer(), reg = reglages();
  if(force !== 'nav' && reg.moteur !== 'navigateur' && groq && enr && !groqEnPause()) return demarrerGroq(el, sel);
  if(SR) return demarrerNav(el, sel);
  if(groq && enr) return demarrerGroq(el, sel);
  if(!window.isSecureContext) return alerte("La dictée marche seulement sur une adresse sécurisée (qui commence par https). Ouvre l'app depuis son adresse habituelle.");
  alerte("Ton navigateur ne permet pas la dictée. Utilise le micro du clavier de ton téléphone, ou ajoute une clé Groq gratuite dans Réglages IA (onglet Coach) : la dictée marchera alors partout.");
}
function erreurMicro(e){
  const n = (e && (e.name || e.error)) || '';
  if(/NotAllowed|Security|not-allowed|service-not-allowed|Permission/i.test(n))
    return alerte("Autorise le micro dans ton navigateur : touche le cadenas à côté de l'adresse, mets Micro sur Autoriser, puis réessaie.");
  if(/NotFound|DevicesNotFound|audio-capture/i.test(n)) return alerte("Aucun micro trouvé. Branche un micro ou vérifie qu'aucune autre app ne l'utilise.");
  if(/NotReadable|TrackStart/i.test(n)) return alerte("Le micro est déjà utilisé par une autre app (appel, WhatsApp...). Ferme-la et réessaie.");
  alerte("Le micro n'a pas pu démarrer. Réessaie dans un instant.");
}

// ---------- Barre en bas pendant la dictee ----------
function barre(st, titre, sous){
  let b = document.getElementById('vxBar');
  if(!b){
    b = document.createElement('div'); b.id = 'vxBar'; b.setAttribute('role', 'status');
    b.innerHTML = `<div class="vx-l1"><span class="vx-dot"></span><div class="vx-t"><b></b><small></small></div><span class="vx-chrono">0:00</span>
      <button type="button" class="vx-x" aria-label="Annuler la dictée">Annuler</button><button type="button" class="vx-stop">Arrêter</button></div>
      <div class="vx-niv"><i></i></div><div class="vx-live"></div>`;
    b.querySelector('.vx-stop').addEventListener('pointerdown', e => e.preventDefault());
    b.querySelector('.vx-x').addEventListener('pointerdown', e => e.preventDefault());
    b.querySelector('.vx-stop').onclick = () => arreter();
    b.querySelector('.vx-x').onclick = () => annuler();
    document.body.appendChild(b);
  }
  b.classList.toggle('vx-attente', st && st.etat === 'attente');
  b.querySelector('.vx-t b').textContent = titre;
  b.querySelector('.vx-t small').textContent = sous || '';
  b.querySelector('.vx-stop').style.display = st && st.etat === 'attente' ? 'none' : '';
  b.querySelector('.vx-niv').style.display = st && st.mode === 'groq' && st.etat !== 'attente' ? '' : 'none';
  return b;
}
function fermerBarre(){ const b = document.getElementById('vxBar'); if(b) b.remove(); }
function chrono(st){
  const b = document.getElementById('vxBar'); if(!b) return;
  const s = Math.floor((Date.now() - st.t0) / 1000);
  b.querySelector('.vx-chrono').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
function live(txt){ const b = document.getElementById('vxBar'); if(b) b.querySelector('.vx-live').textContent = txt || ''; }
function etatChamp(el, cls){
  const v = el.__vx; if(!v) return;
  v.wrap.classList.remove('vx-on', 'vx-wait');
  if(cls) v.wrap.classList.add(cls);
  v.mic.title = cls === 'vx-on' ? 'Arrêter la dictée' : 'Dicter au micro';
}
function silenceTxt(){ const s = reglages().silence; return s > 0 ? `S'arrête seul après ${String(s).replace('.', ',')} s de silence` : 'Touche Arrêter quand tu as fini'; }

// ---------- a) Groq Whisper ----------
function choisirMime(){
  const l = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/aac'];
  for(const m of l){ try { if(MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) return m; } catch(e){} }
  return '';
}
async function demarrerGroq(el, sel){
  const st = { el, sel, mode: 'groq', etat: 'demarrage', t0: Date.now(), parle: false, dernierSon: Date.now(), chunks: [] };
  VX.st = st;
  etatChamp(el, 'vx-wait');
  try { st.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } }); }
  catch(e){ VX.st = null; etatChamp(el, ''); return erreurMicro(e); }
  if(VX.st !== st){ st.stream.getTracks().forEach(t => t.stop()); return; }
  const mime = choisirMime();
  try { st.rec = mime ? new MediaRecorder(st.stream, { mimeType: mime }) : new MediaRecorder(st.stream); }
  catch(e){ try { st.rec = new MediaRecorder(st.stream); } catch(e2){ nettoyerSession(st); VX.st = null; etatChamp(el, ''); return demarrer(el, 'nav'); } }
  st.mime = st.rec.mimeType || mime || 'audio/webm';
  st.rec.ondataavailable = ev => { if(ev.data && ev.data.size) st.chunks.push(ev.data); };
  st.rec.onstop = () => finirGroq(st);
  try { st.rec.start(1000); } catch(e){ nettoyerSession(st); VX.st = null; etatChamp(el, ''); return erreurMicro(e); }
  st.etat = 'ecoute'; st.t0 = Date.now(); st.dernierSon = st.t0;
  etatChamp(el, 'vx-on');
  barre(st, "Je t'écoute...", silenceTxt());
  // Analyse du volume pour l'arret automatique
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if(AC){
      st.ctx = new AC();
      if(st.ctx.state === 'suspended') st.ctx.resume().catch(() => {});
      st.an = st.ctx.createAnalyser(); st.an.fftSize = 1024;
      st.ctx.createMediaStreamSource(st.stream).connect(st.an);
      st.buf = new Float32Array(st.an.fftSize);
      st.fond = [];
    }
  } catch(e){ st.an = null; }
  st.tick = setInterval(() => tickGroq(st), 100);
}
function niveau(st){
  if(!st.an) return -1;
  try { st.an.getFloatTimeDomainData(st.buf); } catch(e){ return -1; }
  let s = 0; for(let i = 0; i < st.buf.length; i++) s += st.buf[i] * st.buf[i];
  return Math.sqrt(s / st.buf.length);
}
function tickGroq(st){
  if(VX.st !== st || st.etat !== 'ecoute') return;
  const now = Date.now(), reg = reglages();
  chrono(st);
  const n = niveau(st);
  if(n >= 0){
    if(st.fond.length < 5) st.fond.push(n);                     // les 500 premieres ms : bruit de fond
    const fond = st.fond.length ? Math.min(...st.fond) : 0;
    const seuil = Math.min(0.06, Math.max(0.012, fond * 3));
    if(n > seuil){ st.parle = true; st.dernierSon = now; }
    const b = document.getElementById('vxBar'); if(b) b.querySelector('.vx-niv i').style.width = Math.min(100, Math.round(n / 0.15 * 100)) + '%';
    if(st.parle && reg.silence > 0 && now - st.dernierSon > reg.silence * 1000) return arreter();
  }
  if(!st.parle && now - st.t0 > 15000 && reg.silence > 0) return arreter();   // rien entendu
  if(now - st.t0 >= MAX_MS){ toast('3 minutes atteintes : la dictée s\'arrête.'); arreter(); }
}
function nettoyerSession(st){
  clearInterval(st.tick); clearInterval(st.tick2); clearTimeout(st.to);
  try { if(st.stream) st.stream.getTracks().forEach(t => t.stop()); } catch(e){}
  try { if(st.ctx && st.ctx.state !== 'closed') st.ctx.close(); } catch(e){}
}
function arreter(){
  const st = VX.st; if(!st) return;
  if(st.mode === 'groq'){
    if(st.etat !== 'ecoute'){ return; }
    st.etat = 'attente';
    clearInterval(st.tick);
    etatChamp(st.el, 'vx-wait');
    barre(st, 'Je transcris...', 'Quelques secondes');
    try { if(st.rec && st.rec.state !== 'inactive') st.rec.stop(); else finirGroq(st); } catch(e){ finirGroq(st); }
  } else if(st.mode === 'nav'){
    st.stop = true;
    try { st.rec.stop(); } catch(e){ finNav(st); }
    clearTimeout(st.to); st.to = setTimeout(() => finNav(st), 1500);   // au cas ou "end" n'arrive pas
  }
}
function annuler(silencieux){
  const st = VX.st; if(!st) return;
  st.annule = true; st.stop = true;
  try { if(st.mode === 'groq' && st.rec && st.rec.state !== 'inactive') st.rec.stop(); } catch(e){}
  try { if(st.mode === 'nav') st.rec.abort(); } catch(e){}
  nettoyerSession(st);
  VX.st = null; etatChamp(st.el, ''); fermerBarre();
  if(!silencieux) toast('Dictée annulée');
}
async function finirGroq(st){
  if(st.fini) return; st.fini = true;
  nettoyerSession(st);
  if(st.annule){ return; }
  const blob = new Blob(st.chunks, { type: st.mime.split(';')[0] || 'audio/webm' });
  if(blob.size < 800 || !st.parle && st.an && Date.now() - st.t0 < 1200){ terminer(st); return toast("Je n'ai rien entendu. Touche le micro et parle près du téléphone."); }
  st.etat = 'attente'; barre(st, 'Je transcris...', 'Quelques secondes');
  let r;
  try { r = await envoyerWhisper(blob, st.mime); }
  catch(e){ r = { erreur: e }; }
  if(st.annule) return;
  if(r && r.texte != null){
    if(r.texte.trim()) inserer(st, r.texte, 'groq');
    else toast("Je n'ai rien entendu. Réessaie en parlant plus près.");
    terminer(st);
    return;
  }
  // Echec : on bascule sur la dictee du navigateur
  terminer(st);
  const raison = (r && r.erreur && r.erreur.vx) || "Groq n'a pas répondu";
  if(SRClasse()){
    setTimeout(() => { demarrer(st.el, 'nav'); toast(`${raison[0].toUpperCase() + raison.slice(1)} : je passe à la dictée du téléphone. Parle à nouveau.`, { ms: 6000 }); }, 300);
  } else alerte(`La dictée n'a pas marché (${raison}). Réessaie dans un moment.`);
}
function terminer(st){
  if(VX.st === st) VX.st = null;
  etatChamp(st.el, ''); fermerBarre();
  if(st.dicte) montrerPropre(st.el, true);
}
function extension(mime){ return /mp4|aac|m4a/.test(mime) ? 'm4a' : /ogg/.test(mime) ? 'ogg' : /wav/.test(mime) ? 'wav' : 'webm'; }
async function envoyerWhisper(blob, mime){
  const key = cleGroq();
  const modeles = ['whisper-large-v3-turbo', 'whisper-large-v3'];
  let derniere;
  for(const model of modeles){
    const fd = new FormData();
    fd.append('file', blob, 'dictee.' + extension(mime));
    fd.append('model', model);
    fd.append('language', 'fr');
    fd.append('response_format', 'json');
    fd.append('temperature', '0');
    fd.append('prompt', `Dictée en français de Côte d'Ivoire, avec ponctuation. Mots possibles : ${VOCAB}`);
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 60000);
    let res, j = {};
    try { res = await fetch(GROQ_AUDIO, { method: 'POST', headers: { Authorization: 'Bearer ' + key }, body: fd, signal: ctl.signal }); }
    catch(e){ clearTimeout(to); const er = new Error('reseau'); er.vx = e && e.name === 'AbortError' ? 'Groq met trop de temps' : 'pas de connexion'; throw er; }
    clearTimeout(to);
    try { j = await res.json(); } catch(e){}
    if(res.ok && j && typeof j.text === 'string'){
      try { if(typeof iaCompter === 'function') iaCompter('Groq Whisper'); } catch(e){}
      const t = j.text.trim();
      return { texte: HALLU.test(t) && t.length < 90 ? '' : t };
    }
    const msg = (j && j.error && (j.error.message || j.error)) || '';
    const raw = String(typeof msg === 'string' ? msg : JSON.stringify(msg));
    if(res.status === 404 || /model_not_found|does not exist|decommissioned/i.test(raw)){ derniere = raw; continue; }
    const er = new Error(raw || 'erreur ' + res.status);
    if(res.status === 429 || /rate.?limit|quota/i.test(raw)){
      const jour = /per day|RPD|ASD|daily/i.test(raw);
      const m = raw.match(/try again in\s*(?:(\d+)h)?\s*(?:(\d+)m(?!s))?\s*(?:([\d.]+)s)?/i);
      let d = m ? ((+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0)) * 1000 : 0;
      const ra = Number(res.headers && res.headers.get && res.headers.get('retry-after')) || 0;
      if(!d && ra) d = ra * 1000;
      if(jour){ try { if(typeof iaApprendreLimite === 'function') iaApprendreLimite('Groq Whisper'); } catch(e){} }
      lsSet(LS_PAUSE, { jusqua: Date.now() + Math.max(d, jour ? 30 * 60000 : 30000), raison: jour ? 'quota du jour' : 'limite à la minute' });
      er.vx = jour ? 'la dictée Groq a atteint son quota du jour' : 'la dictée Groq est à la limite pour le moment';
    } else if(res.status === 401 || res.status === 403){
      lsSet(LS_PAUSE, { jusqua: Date.now() + 10 * 60000, raison: 'clé refusée' });
      er.vx = 'ta clé Groq est refusée';
    } else er.vx = 'Groq a eu un souci';
    throw er;
  }
  const er = new Error(derniere || 'modele'); er.vx = 'le modèle de dictée Groq est indisponible'; throw er;
}

// ---------- b) Dictee du navigateur ----------
function demarrerNav(el, sel){
  const SR = SRClasse();
  let rec;
  try { rec = new SR(); } catch(e){ return alerte("La dictée du navigateur n'a pas pu démarrer."); }
  rec.lang = 'fr-FR'; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1;
  const st = { el, sel, mode: 'nav', etat: 'ecoute', rec, t0: Date.now(), dernier: Date.now(), parle: false, nFinal: 0, interim: '' };
  VX.st = st;
  rec.onstart = () => { st.nFinal = 0; };
  rec.onresult = ev => {
    if(VX.st !== st) return;
    let interim = '';
    for(let i = ev.resultIndex; i < ev.results.length; i++){
      const r = ev.results[i];
      if(r.isFinal){ if(i >= st.nFinal){ inserer(st, r[0].transcript, 'nav'); st.nFinal = i + 1; } }
      else interim += r[0].transcript;
    }
    st.interim = interim; live(interim);
    st.parle = true; st.dernier = Date.now();
  };
  rec.onerror = ev => { st.err = ev.error || 'erreur'; };
  rec.onend = () => {
    if(VX.st !== st || st.annule) return;
    if(!st.stop && !st.err && Date.now() - st.t0 < MAX_MS){ try { rec.start(); return; } catch(e){} }   // Android coupe souvent : on relance
    finNav(st);
  };
  try { rec.start(); }
  catch(e){ VX.st = null; return erreurMicro(e); }
  etatChamp(el, 'vx-on');
  barre(st, "Je t'écoute...", 'Dictée du téléphone. ' + silenceTxt());
  st.tick = setInterval(() => {
    if(VX.st !== st) return clearInterval(st.tick);
    chrono(st);
    const s = reglages().silence, now = Date.now();
    if(s > 0 && st.parle && now - st.dernier > s * 1000 + 1500) arreter();
    else if(s > 0 && !st.parle && now - st.t0 > 15000) arreter();
    else if(now - st.t0 >= MAX_MS) arreter();
  }, 250);
}
function finNav(st){
  if(st.fini) return; st.fini = true;
  nettoyerSession(st);
  if(st.interim && !st.err) inserer(st, st.interim, 'nav');      // le dernier morceau pas encore valide
  st.interim = '';
  terminer(st);
  const e = st.err;
  if(e && e !== 'aborted'){
    if(e === 'not-allowed' || e === 'service-not-allowed') erreurMicro({ name: 'NotAllowedError' });
    else if(e === 'no-speech') toast("Je n'ai rien entendu. Réessaie en parlant plus près du téléphone.");
    else if(e === 'network') alerte("La dictée du navigateur a besoin d'internet. Vérifie ta connexion et réessaie.");
    else if(e === 'audio-capture') erreurMicro({ name: 'NotFoundError' });
    else if(e === 'language-not-supported') alerte("Ton navigateur ne connaît pas la dictée en français. Ajoute une clé Groq gratuite dans Réglages IA.");
    else toast('La dictée s\'est arrêtée (' + e + ').');
  }
}

// ---------- Insertion au curseur ----------
function motsCommandes(t, mode){
  t = ' ' + t + ' ';
  t = t.replace(/[ ,;]*\s(?:nouveau paragraphe)[.,;!]?\s*/gi, '\n\n');
  t = t.replace(/[ ,;]*\s(?:nouvelle ligne|retour à la ligne|retour a la ligne|à la ligne|a la ligne)[.,;!]?\s*/gi, '\n');
  t = t.replace(/[ ,]*\s(?:point d['’ ]interrogation)[.,]?(?=\s)/gi, '?');
  t = t.replace(/[ ,]*\s(?:point d['’ ]exclamation)[.,]?(?=\s)/gi, '!');
  t = t.replace(/[ ,]*\s(?:points de suspension)[.,]?(?=\s)/gi, '...');
  t = t.replace(/[ ,]*\s(?:point[- ]virgule)[.,]?(?=\s)/gi, ';');
  t = t.replace(/[ ,]*\s(?:virgule)[.,]?(?=\s)/gi, ',');
  if(mode === 'nav'){
    t = t.replace(/[ ,]*\s(?:deux[- ]points)(?=\s)/gi, ':');
    // "point" seul : seulement s'il ne fait pas partie d'une expression ("le point de vue", "à point"...)
    t = t.replace(/(\S+)\s+point(?=[\s.,!?]|$)/gi, (m, avant, off, tout) => {
      if(/^(le|un|du|au|ce|mon|ton|son|bon|en|à|a|de|mis|mise|chaque|quel|cet)$/i.test(avant)) return m;
      const suite = tout.slice(off + m.length).trim();
      if(/^(de|du|d['’]|des|fort|faible|final|commun|culminant|vue)\b/i.test(suite)) return m;
      return avant + '.';
    });
  }
  return t;
}
function nettoyer(brut, mode){
  let t = tirets(String(brut || '')).replace(/[ \t\r]+/g, ' ').trim();
  if(!t) return '';
  if(mode === 'groq' && HALLU.test(t) && t.length < 90) return '';
  t = motsCommandes(t, mode);
  t = t.replace(/[ \t]+([,.])/g, '$1')
    .replace(/([,;!?])(?=[A-Za-zÀ-ÿ])/g, '$1 ')
    .replace(/\.(?=[A-ZÀ-Ý])/g, '. ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n\.+/g, '\n')
    .replace(/([.!?]\s+|\n)([a-zà-ÿ])/g, (m, a, b) => a + b.toUpperCase())
    .replace(/^[ \t]+|[ \t]+$/g, '')
    .replace(/ {2,}/g, ' ');
  return t;
}
function majuscule(t){ const i = t.search(/[A-Za-zÀ-ÿ]/); return i < 0 ? t : t.slice(0, i) + t[i].toUpperCase() + t.slice(i + 1); }
// Mots courants qu'on remet en minuscule au milieu d'une phrase (les noms propres gardent leur majuscule)
const COURANTS = /^(je|j['’]|tu|il|elle|on|nous|vous|ils|elles|le|la|les|l['’]|un|une|des|du|de|d['’]|et|mais|ou|donc|car|ce|c['’]|ça|cette|ces|cet|mon|ma|mes|ton|ta|tes|son|sa|ses|notre|nos|votre|vos|leur|leurs|si|quand|comme|pour|par|avec|sans|dans|en|à|au|aux|y|ne|n['’]|qui|que|qu['’]|quoi|oui|non|merci|me|m['’]|te|t['’]|se|s['’]|lui|alors|puis|ensuite|aussi|très|tout|tous|toute|toutes|demain|aujourd['’]hui|hier|bien|pas|plus|moins|est|sont|a|ai|as|avez|avons|peux|peut|pouvez|veux|veut|voulez|faut|faire|fais|fait|là|ici|chez|après|avant|depuis|pendant|vers|entre|sur|sous)$/i;
function minuscule(t){
  if(NOMS.test(t)) return t;
  const m = t.match(/^([A-ZÀ-Ý][a-zà-ÿ]*['’]?)/);
  if(!m || !COURANTS.test(m[1])) return t;
  return t[0].toLowerCase() + t.slice(1);
}
function accorder(avant, t, apres){
  const debut = !avant.trim() || /[.!?…]["»)]?\s*$/.test(avant) || /\n\s*$/.test(avant);
  if(debut) t = majuscule(t);
  else if(/[A-Za-zÀ-ÿ0-9,;:'’]\s*$/.test(avant) && !/^\n/.test(t)) t = minuscule(t);
  if(avant && !/[\s(\[«"'’\n]$/.test(avant) && !/^[\s.,!?;:)\]…»]/.test(t)) t = ' ' + t;
  if(apres){
    if(/^\s*[a-zà-ÿ]/.test(apres)) t = t.replace(/\.$/, '');          // on insere au milieu d'une phrase
    if(/^[A-Za-zÀ-ÿ0-9(«]/.test(apres) && !/\s$/.test(t)) t += ' ';
  }
  return t;
}
function inserer(st, brut, mode){
  const el = st.el;
  let t = nettoyer(brut, mode);
  if(!t) return false;
  if(el.tagName === 'INPUT') t = t.replace(/\s*\n+\s*/g, ' ');
  const v = el.value, n = v.length;
  const s = Math.min(st.sel.s, n), e = Math.min(Math.max(st.sel.e, s), n);
  const avant = v.slice(0, s), apres = v.slice(e);
  t = accorder(avant, t, apres);
  if(el.maxLength > 0 && avant.length + t.length + apres.length > el.maxLength) t = t.slice(0, Math.max(0, el.maxLength - avant.length - apres.length));
  el.value = avant + t + apres;
  const pos = avant.length + t.length;
  st.sel = { s: pos, e: pos }; el.__vxSel = st.sel;
  if(document.activeElement === el){ try { el.setSelectionRange(pos, pos); } catch(e){} }
  st.dicte = true;
  declencher(el);
  return true;
}
// Insertion simple, pour les autres fichiers
function vxInserer(el, texte){
  if(!el) return;
  const st = { el, sel: selectionDe(el) };
  const v = el.value, s = Math.min(st.sel.s, v.length), e = Math.min(st.sel.e, v.length);
  el.value = v.slice(0, s) + texte + v.slice(e);
  const pos = s + texte.length; el.__vxSel = { s: pos, e: pos };
  try { el.focus({ preventScroll: true }); el.setSelectionRange(pos, pos); } catch(e2){}
  declencher(el);
}

// ---------- Mettre au propre ----------
const SYS_PROPRE = `Tu mets au propre un texte écrit ou dicté à voix haute par Henzo, photographe à Bouaké (Côte d'Ivoire).
- Corrige l'orthographe, la grammaire, les accents, la ponctuation et les majuscules.
- Mets en forme (retours à la ligne, petite liste) seulement si ça aide à lire.
- Ne change PAS le sens, ni le ton, ni le niveau de langue, ni la langue. Garde les expressions ivoiriennes, les emojis, les chiffres et les noms.
- N'ajoute rien et n'enlève aucune information. Pas de formule de politesse en plus.
- N'utilise jamais de tiret long : seulement le tiret simple "-".
- Réponds UNIQUEMENT avec le texte corrigé, sans guillemets, sans titre et sans commentaire.`;
async function auPropre(el){
  const v = el.__vx;
  const ancien = el.value;
  if(!ancien.trim()) return toast('Le champ est vide.');
  if(typeof iaRelais !== 'function') return alerte("L'IA n'est pas disponible. Ajoute une clé dans Réglages IA.");
  if(v) v.ai.classList.add('vx-busy');
  try {
    const r = await iaRelais({ system: SYS_PROPRE, messages: [{ role: 'user', text: ancien }], maxTokens: Math.min(4000, 300 + Math.ceil(ancien.length / 2)), tache: 'texte' });
    let t = tirets(String(r.text || '')).replace(/^```[a-z]*\n?|```$/g, '').trim();
    if(/^["«“].*["»”]$/s.test(t) && !/^["«“]/.test(ancien.trim())) t = t.slice(1, -1).trim();
    if(el.tagName === 'INPUT') t = t.replace(/\s*\n+\s*/g, ' ');
    if(!t) throw new Error("L'IA a renvoyé un texte vide.");
    if(el.value !== ancien) return toast('Le texte a changé pendant la correction : rien n\'a été remplacé.');
    el.value = t; el.__vxSel = { s: t.length, e: t.length };
    declencher(el);
    montrerPropre(el, false);
    toast('Texte mis au propre.', { action: 'Annuler', ms: 12000, fn: () => { el.value = ancien; el.__vxSel = { s: ancien.length, e: ancien.length }; declencher(el); montrerPropre(el, true); toast("C'est revenu comme avant."); } });
  } catch(e){
    if(!e.iaLimite) alerte((e && e.message) || "La mise au propre n'a pas marché.");
  } finally { if(v) v.ai.classList.remove('vx-busy'); }
}

// ---------- Petit message en bas ----------
function toast(msg, o){
  o = o || {}; css();
  let t = document.getElementById('vxToast'); if(t) t.remove();
  t = document.createElement('div'); t.id = 'vxToast'; t.setAttribute('role', 'status');
  t.innerHTML = `<p>${esc(msg)}</p>${o.action ? `<button type="button">${esc(o.action)}</button>` : ''}`;
  if(o.action) t.querySelector('button').onclick = () => { t.remove(); try { o.fn(); } catch(e){} };
  const bar = document.getElementById('vxBar');
  if(bar) t.style.bottom = (window.innerHeight - bar.getBoundingClientRect().top + 10) + 'px';
  document.body.appendChild(t);
  clearTimeout(toast.t); toast.t = setTimeout(() => t.remove(), o.ms || 4000);
}

// ============================================================
// PHRASES TOUTES PRETES
// ============================================================
const RDV_DEFAUT = `Bonjour 😊 Merci pour votre intérêt pour Henzo Photographie !
Pour réserver votre séance, c'est simple :
1. Choisissez votre pack ici : {lien_tarifs}
2. Envoyez-nous : votre nom et prénom, le jour et l'heure souhaités, et le pack choisi.
3. Nous vérifions la disponibilité et vous envoyons un lien de paiement.
4. Vous payez un acompte de 50 % par Wave pour bloquer votre date. Pas de Wave ? Dites-le-nous, nous vous proposerons un autre moyen.
5. Vous recevez votre confirmation et votre reçu. Le reste se règle le jour de la séance.
📍 Ahougnansou, en face du Restaurant Le Rosier, Bouaké.
À très vite !`;
const PH_BASE = [
  { k: 'rdv', t: 'Comment prendre rendez-vous', x: '' },   // '' = texte automatique
  { k: 'merci', t: 'Merci après la séance', x: "Bonjour {prenom} 😊\nMerci encore pour votre confiance et pour cette belle séance ! Nous commençons le tri et la retouche de vos photos. Nous vous prévenons dès qu'elles sont prêtes.\nBonne journée !" },
  { k: 'avis', t: "Demande d'avis", x: "Bonjour {prenom} 😊\nNous espérons que vos photos vous plaisent ! Votre avis compte beaucoup pour nous : pouvez-vous écrire quelques mots sur votre expérience avec Henzo Photographie ? Ça aide d'autres clients à nous faire confiance.\nMerci beaucoup 🙏" },
  { k: 'acompte', t: 'Relance acompte', x: "Bonjour {prenom},\nPetit rappel : pour bloquer votre date, il reste l'acompte de 50 % à régler. Vous pouvez payer par Wave au {wave}. Sans acompte, nous ne pouvons pas garder le créneau.\nMerci et à bientôt !" },
  { k: 'adresse', t: 'Adresse et itinéraire', x: "📍 Le studio est à {adresse}.\nÀ Ahougnansou, demandez le Restaurant Le Rosier : le studio est juste en face. Si vous ne trouvez pas, appelez-nous et nous vous guidons." },
  { k: 'delai', t: 'Délai de livraison', x: "Bonjour {prenom},\nVos photos retouchées seront prêtes environ 7 jours après la séance (un peu plus pour les mariages et les dots). Nous vous envoyons le lien de téléchargement dès qu'elles sont prêtes." },
  { k: 'pretes', t: 'Photos prêtes', x: "Bonjour {prenom} 🎉\nVos photos sont prêtes ! Vous pouvez les voir et les télécharger ici : \nDites-nous ce que vous en pensez 😊" },
  { k: 'report', t: 'Report de séance', x: "Bonjour {prenom},\nPas de souci pour reporter votre séance, votre acompte reste valable. Dites-nous le jour et l'heure qui vous arrangent, et nous vérifions la disponibilité.\nÀ bientôt !" },
  { k: 'tarifs', t: 'Nos tarifs', x: "Bonjour {prenom} 😊\nVoici nos packs et nos prix : {lien_tarifs}\nPour réserver directement : {lien_reservation}\nSi vous avez une question, je suis là !" }
];
function phrases(){
  if(!VX.liste){ const l = lsGet(LS_PH, null); VX.liste = Array.isArray(l && l.liste) ? l.liste : PH_BASE.map(p => ({ ...p })); VX.infos = (l && l.infos) || {}; }
  return VX.liste;
}
function infos(){ phrases(); return VX.infos || {}; }
async function lirePrefs(){
  if(VX.lu) return; VX.lu = true;
  try {
    if(typeof sb === 'undefined') return;
    const { data: u } = await sb.auth.getUser();
    if(!u || !u.user) return;
    const { data } = await sb.from('user_settings').select('user_preferences').eq('user_id', u.user.id).maybeSingle();
    const pr = (data && data.user_preferences) || {};
    if(Array.isArray(pr.phrases)){
      VX.liste = pr.phrases.filter(p => p && p.k);
      VX.infos = pr.phrases_infos || VX.infos || {};
      lsSet(LS_PH, { liste: VX.liste, infos: VX.infos });
    }
  } catch(e){ VX.lu = false; }
}
async function sauverPrefs(patch){
  try { const l = lsGet('user_preferences', {}) || {}; lsSet('user_preferences', Object.assign(l, patch)); } catch(e){}
  try {
    if(typeof sb === 'undefined') return false;
    const { data: u } = await sb.auth.getUser();
    if(!u || !u.user) return false;
    const { data, error: e1 } = await sb.from('user_settings').select('id,user_preferences').eq('user_id', u.user.id).maybeSingle();
    if(e1) throw e1;
    const prefs = Object.assign({}, (data && data.user_preferences) || {}, patch);   // on garde les autres reglages
    const { error } = data
      ? await sb.from('user_settings').update({ user_preferences: prefs }).eq('id', data.id)
      : await sb.from('user_settings').upsert({ user_id: u.user.id, user_preferences: prefs }, { onConflict: 'user_id' });
    if(error) throw error;
    return true;
  } catch(e){ console.warn('vx prefs', e); return false; }
}
async function sauverPhrases(){
  lsSet(LS_PH, { liste: VX.liste, infos: VX.infos || {} });
  const ok = await sauverPrefs({ phrases: VX.liste, phrases_infos: VX.infos || {} });
  if(!ok) toast("Gardé sur cet appareil. L'envoi en ligne n'a pas marché : vérifie ta connexion.", { ms: 6000 });
  return ok;
}

// Variables
function prenomContexte(el){
  try {
    const d = el && el.closest && el.closest('[data-prenom]');
    if(d && d.dataset.prenom) return premierMot(d.dataset.prenom);
    if(typeof window.vxPrenom === 'function'){ const p = window.vxPrenom(el); if(p) return premierMot(p); }
    else if(typeof window.vxPrenom === 'string' && window.vxPrenom) return premierMot(window.vxPrenom);
    const zone = el && el.closest && el.closest('.modal, .ag-sheet, .modal-bg, form, .card, [class*="sheet"]');
    if(zone){
      for(const f of zone.querySelectorAll('input, select')){
        if(f === el) continue;
        const quoi = [f.id, f.name, f.placeholder, f.getAttribute('aria-label')].join(' ');
        if(!/pr[ée]nom|client|\bnom\b|name/i.test(quoi) || /email|t[ée]l|phone|ville/i.test(quoi)) continue;
        const v = f.tagName === 'SELECT' ? (f.selectedOptions[0] && f.value ? f.selectedOptions[0].textContent : '') : f.value;
        if(v && v.trim() && !/^\d+$/.test(v.trim()) && !/choisir|--/i.test(v)) return premierMot(v);
      }
    }
  } catch(e){}
  return '';
}
function premierMot(s){
  const w = String(s).trim().replace(/^(m\.|mme|mr|mlle|madame|monsieur)\s+/i, '').split(/\s+/)[0] || '';
  return w ? w[0].toUpperCase() + w.slice(1) : '';
}
function variables(el){
  const inf = infos();
  let tarifs = '', resa = '', adr = inf.adresse || '';
  try { if(typeof pxLink === 'function') tarifs = pxLink() || ''; } catch(e){}
  try { if(typeof otResaLink === 'function') resa = otResaLink('') || ''; } catch(e){}
  try { if(!adr && typeof PX !== 'undefined' && PX.page && PX.page.adresse) adr = PX.page.adresse; } catch(e){}
  return { prenom: prenomContexte(el), lien_tarifs: tarifs, lien_reservation: resa, adresse: adr || ADRESSE_DEF, wave: inf.wave || '' };
}
function remplir(x, vars){
  return String(x || '').replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m))
    .replace(/Bonjour[ \t]+([,!])/g, 'Bonjour$1').replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+\n/g, '\n');
}
async function texteDe(p, el){
  let x = p.x;
  if(p.k === 'rdv' && !x){
    try { if(typeof window.rdvMessage === 'function'){ const r = await window.rdvMessage(); if(r && String(r).trim()) return tirets(String(r)); } } catch(e){}
    x = RDV_DEFAUT;
  }
  return tirets(remplir(x, variables(el)));
}

// ---------- Liste "/" ----------
function slashOk(el){ return champOk(el) && !estRecherche(el) && !(el.closest && el.closest('[data-vx-slash="off"]')); }
function surSaisie(ev){
  const el = ev.target;
  if(!el || !(el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')) return;
  if(el.__vx && el.value === '') montrerPropre(el, false);
  if(!slashOk(el)) return;
  if(el.selectionStart == null || el.selectionStart !== el.selectionEnd) return fermerPop();
  const pos = el.selectionStart, avant = el.value.slice(0, pos);
  const m = avant.match(/(^|\s)\/([A-Za-zÀ-ÿ0-9_-]{0,24})$/);
  if(!m) return fermerPop();
  ouvrirPop(el, m[2], pos - m[2].length - 1, pos);
}
function filtrer(q){
  const n = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const qq = n(q);
  const l = phrases().map((p, i) => ({ p, i }));
  if(!qq) return l;
  const debut = l.filter(o => n(o.p.k).startsWith(qq));
  const dedans = l.filter(o => !debut.includes(o) && (n(o.p.k).includes(qq) || n(o.p.t).split(/\s+/).some(w => w.startsWith(qq))));
  return debut.concat(dedans);
}
function ouvrirPop(el, q, debut, fin){
  css();
  lirePrefs();
  const res = filtrer(q);
  let pop = document.getElementById('vxPop');
  if(!res.length && q.length > 2){ fermerPop(); return; }
  if(!pop){ pop = document.createElement('div'); pop.id = 'vxPop'; pop.setAttribute('role', 'listbox'); document.body.appendChild(pop); }
  const ancien = VX.pop;
  VX.pop = { el, q, debut, fin, res, i: ancien && ancien.el === el && ancien.q === q ? Math.min(ancien.i, Math.max(0, res.length - 1)) : 0 };
  pop.innerHTML = `<div class="vx-pl">${res.length ? res.map((o, j) => `<button type="button" class="vx-pi${j === VX.pop.i ? ' on' : ''}" data-j="${j}" role="option"><b>/${esc(o.p.k)}</b><span>${esc(o.p.t)}</span><small>${esc(apercu(o.p))}</small></button>`).join('')
    : '<div class="vx-pv">Aucune phrase avec ce nom.</div>'}</div>
    <button type="button" class="vx-pf">Gérer mes phrases toutes prêtes</button>`;
  pop.querySelectorAll('.vx-pi, .vx-pf').forEach(b => { b.addEventListener('pointerdown', e => e.preventDefault()); b.addEventListener('mousedown', e => e.preventDefault()); });
  pop.querySelectorAll('.vx-pi').forEach(b => b.addEventListener('click', () => choisir(+b.dataset.j)));
  pop.querySelector('.vx-pf').addEventListener('click', () => { fermerPop(); vxOuvrirPhrases(); });
  placerPop();
}
function apercu(p){ return (p.k === 'rdv' && !p.x ? 'Message automatique : comment réserver, acompte Wave, adresse' : String(p.x || '').replace(/\s+/g, ' ')).slice(0, 90); }
function placerPop(){
  const pop = document.getElementById('vxPop'); if(!pop || !VX.pop) return;
  const r = VX.pop.el.getBoundingClientRect();
  if(!r.width){ fermerPop(); return; }
  const vv = window.visualViewport, H = vv ? vv.height + vv.offsetTop : window.innerHeight, W = window.innerWidth;
  const larg = Math.min(Math.max(r.width, 260), 380, W - 16);
  const gauche = Math.max(8, Math.min(r.left, W - larg - 8));
  pop.style.width = larg + 'px'; pop.style.left = gauche + 'px';
  const h = Math.min(pop.scrollHeight, 310);
  const bas = H - r.bottom, haut = r.top;
  if(bas >= h + 8 || bas >= haut){ pop.style.top = (r.bottom + 4) + 'px'; pop.style.bottom = 'auto'; pop.style.maxHeight = Math.max(120, bas - 12) + 'px'; }
  else { pop.style.top = 'auto'; pop.style.bottom = (window.innerHeight - r.top + 4) + 'px'; pop.style.maxHeight = Math.max(120, haut - 12) + 'px'; }
}
function fermerPop(){ VX.pop = null; const p = document.getElementById('vxPop'); if(p) p.remove(); }
async function choisir(j){
  const P = VX.pop; if(!P) return;
  const o = P.res[j]; if(!o) return;
  const el = P.el;
  fermerPop();
  let t = await texteDe(o.p, el);
  if(el.tagName === 'INPUT') t = t.replace(/\s*\n+\s*/g, ' ');
  const v = el.value;
  if(v.slice(P.debut, P.fin) !== '/' + P.q) return;               // le texte a bouge entre-temps
  const apres = v.slice(P.fin);
  const ajout = t + (apres && !/^\s/.test(apres) ? ' ' : '');
  el.value = v.slice(0, P.debut) + ajout + apres;
  const pos = P.debut + ajout.length;
  try { el.focus({ preventScroll: true }); el.setSelectionRange(pos, pos); } catch(e){}
  el.__vxSel = { s: pos, e: pos };
  declencher(el);
}
function surTouche(ev){
  const P = VX.pop;
  if(!P || ev.target !== P.el) return;
  const n = P.res.length;
  if(ev.key === 'Escape'){ ev.preventDefault(); ev.stopPropagation(); fermerPop(); return; }
  if(!n) return;
  if(ev.key === 'ArrowDown' || ev.key === 'ArrowUp'){
    ev.preventDefault(); ev.stopPropagation();
    P.i = (P.i + (ev.key === 'ArrowDown' ? 1 : n - 1)) % n;
    document.querySelectorAll('#vxPop .vx-pi').forEach((b, j) => { b.classList.toggle('on', j === P.i); if(j === P.i) b.scrollIntoView({ block: 'nearest' }); });
  } else if((ev.key === 'Enter' && !ev.shiftKey) || ev.key === 'Tab'){
    ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
    choisir(P.i);
  }
}

// ---------- Fenetre "Mes phrases toutes pretes" ----------
let PH_EDIT = null;   // index en cours de modification (-1 = nouvelle)
function feuille(id, html){
  if(typeof agSheet === 'function') return agSheet(id, html);
  const old = document.getElementById(id); if(old) old.remove();
  const bg = document.createElement('div'); bg.className = 'modal-bg show ag-sheet'; bg.id = id;
  bg.onclick = e => { if(e.target === bg) bg.remove(); };
  bg.innerHTML = `<div class="modal"><div class="modal-wrap">${html}<button class="close" onclick="document.getElementById('${id}').remove()">×</button></div></div>`;
  document.body.appendChild(bg); return bg;
}
function vxOuvrirPhrases(){
  css(); PH_EDIT = null;
  lirePrefs().then(() => { if(document.getElementById('vxPhSheet') && PH_EDIT === null) rendrePhrases(); });
  rendrePhrases();
}
function rendrePhrases(){
  const l = phrases(), inf = infos(), reg = reglages();
  const keep = document.getElementById('vxPhSheet');
  const scroll = keep ? (keep.querySelector('.modal') || {}).scrollTop : 0;
  const ed = PH_EDIT !== null ? (PH_EDIT >= 0 ? l[PH_EDIT] : { k: '', t: '', x: '' }) : null;
  const html = `<h3>Mes phrases toutes prêtes</h3>
  <div data-vx-slash="off">
  <p class="vx-aide">Dans n'importe quelle zone de texte, tape <b>/</b> puis le début du raccourci (ex : <b>/rdv</b>) et choisis la phrase. Les mots entre accolades sont remplis tout seuls.</p>
  ${ed ? `<div class="vx-it" id="vxPhEd">
      <label for="vxPhK">Raccourci (sans le /)</label><input id="vxPhK" data-vx="off" maxlength="24" autocomplete="off" value="${esc(ed.k)}" placeholder="Ex : merci">
      <label for="vxPhT">Titre</label><input id="vxPhT" value="${esc(ed.t)}" placeholder="Ex : Merci après la séance">
      <label for="vxPhX">Texte</label><textarea id="vxPhX" rows="7" placeholder="${ed.k === 'rdv' ? 'Laisse vide pour le message automatique' : 'Bonjour {prenom}, ...'}">${esc(ed.x)}</textarea>
      ${ed.k === 'rdv' ? '<div class="vx-aide">Laisse vide pour utiliser le message automatique "Comment prendre rendez-vous" (avec ton lien de tarifs).</div>' : ''}
      <div class="vx-chips">${['prenom', 'lien_tarifs', 'lien_reservation', 'adresse', 'wave'].map(v => `<button type="button" onclick="vxPhVar('${v}')">{${v}}</button>`).join('')}</div>
      <div class="vx-row"><button type="button" class="btn-secondary" onclick="vxPhAnnuler()">Annuler</button><button type="button" class="btn-primary" onclick="vxPhGarder()">Enregistrer la phrase</button></div>
    </div>`
  : `<button type="button" class="btn-primary" onclick="vxPhModifier(-1)">+ Ajouter une phrase</button>`}
  <div class="vx-ph">${l.map((p, i) => `<div class="vx-it"><div class="vx-h"><b>/${esc(p.k)}</b><span>${esc(p.t)}</span>
      <button type="button" class="btn-secondary" onclick="vxPhModifier(${i})">Modifier</button><button type="button" class="btn-secondary" onclick="vxPhSupprimer(${i})" aria-label="Supprimer">Supprimer</button></div>
      <p>${esc(apercu(p))}</p></div>`).join('') || '<p class="vx-aide">Aucune phrase. Ajoute la première !</p>'}</div>
  <div class="vx-sep">Infos utilisées dans les phrases</div>
  <label for="vxPhWave">Ton numéro Wave (pour {wave})</label><input id="vxPhWave" data-vx="off" inputmode="tel" value="${esc(inf.wave || '')}" placeholder="Ex : 07 07 00 00 00">
  <label for="vxPhAdr">Adresse du studio (pour {adresse})</label><input id="vxPhAdr" value="${esc(inf.adresse || '')}" placeholder="${esc(ADRESSE_DEF)}">
  <div class="vx-row"><button type="button" class="btn-secondary" onclick="vxPhInfos()">Enregistrer ces infos</button></div>
  <div class="vx-sep">Dictée vocale</div>
  <label for="vxRegS">Arrêt automatique après un silence de</label>
  <select id="vxRegS" onchange="vxPhReglage()">${[[1, '1 seconde'], [1.5, '1,5 seconde'], [2, '2 secondes'], [3, '3 secondes'], [5, '5 secondes'], [0, 'Jamais (je touche Arrêter)']].map(([v, t]) => `<option value="${v}"${reg.silence === v ? ' selected' : ''}>${t}</option>`).join('')}</select>
  <label for="vxRegM">Moteur de dictée</label>
  <select id="vxRegM" onchange="vxPhReglage()"><option value="auto"${reg.moteur === 'auto' ? ' selected' : ''}>Automatique (Groq si tu as une clé, sinon le téléphone)</option><option value="navigateur"${reg.moteur === 'navigateur' ? ' selected' : ''}>Toujours la dictée du téléphone</option></select>
  <p class="vx-aide">${cleGroq() ? 'Clé Groq trouvée : la dictée utilise Groq Whisper (très précis, gratuit), et le téléphone en secours.' : "Sans clé Groq, c'est la dictée du téléphone qui écrit. Ajoute une clé Groq gratuite dans Réglages IA pour une dictée plus précise."}</p>
  <div class="vx-row"><button type="button" class="btn-secondary" onclick="vxPhBase()">Remettre les phrases de base</button></div>
  </div>`;
  const sh = feuille('vxPhSheet', html);
  const m = sh && sh.querySelector('.modal'); if(m && scroll) m.scrollTop = scroll;
  if(ed){ setTimeout(() => { const f = document.getElementById(ed.k ? 'vxPhX' : 'vxPhK'); if(f) f.focus(); }, 50); }
}
function vxPhModifier(i){ PH_EDIT = i; rendrePhrases(); const e = document.getElementById('vxPhEd'); if(e) e.scrollIntoView({ block: 'nearest' }); }
function vxPhAnnuler(){ PH_EDIT = null; rendrePhrases(); }
function vxPhVar(v){ const t = document.getElementById('vxPhX'); if(t) vxInserer(t, '{' + v + '}'); }
async function vxPhGarder(){
  const k = (document.getElementById('vxPhK').value || '').trim().replace(/^\/+/, '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  const t = tirets((document.getElementById('vxPhT').value || '').trim());
  const x = tirets(document.getElementById('vxPhX').value || '').replace(/\s+$/, '');
  if(!k) return alerte('Donne un raccourci à la phrase (ex : merci).');
  if(!x.trim() && k !== 'rdv') return alerte('Écris le texte de la phrase.');
  const l = phrases();
  const dbl = l.findIndex((p, i) => p.k === k && i !== PH_EDIT);
  if(dbl >= 0) return alerte(`Le raccourci /${k} existe déjà. Choisis-en un autre.`);
  const p = { k, t: t || k, x };
  if(PH_EDIT >= 0) l[PH_EDIT] = p; else l.push(p);
  PH_EDIT = null; rendrePhrases();
  if(await sauverPhrases()) toast(`Phrase /${k} enregistrée.`);
}
async function vxPhSupprimer(i){
  const l = phrases(), p = l[i]; if(!p) return;
  const ok = typeof agConfirm === 'function' ? await agConfirm(`Supprimer la phrase /${p.k} ?`) : confirm(`Supprimer la phrase /${p.k} ?`);
  if(!ok) return;
  l.splice(i, 1); PH_EDIT = null; rendrePhrases();
  await sauverPhrases();
}
async function vxPhInfos(){
  VX.infos = Object.assign({}, infos(), { wave: (document.getElementById('vxPhWave').value || '').trim(), adresse: tirets((document.getElementById('vxPhAdr').value || '').trim()) });
  if(await sauverPhrases()) toast('Infos enregistrées.');
}
async function vxPhBase(){
  const ok = typeof agConfirm === 'function' ? await agConfirm('Remettre les 9 phrases de base ? Tes phrases à toi sont gardées.') : true;
  if(!ok) return;
  const l = phrases();
  PH_BASE.forEach(b => { const i = l.findIndex(p => p.k === b.k); if(i >= 0) l[i] = { ...b }; else l.push({ ...b }); });
  PH_EDIT = null; rendrePhrases(); await sauverPhrases();
}
function vxPhReglage(){
  const r = lsGet(LS_REG, {}) || {};
  r.silence = Number(document.getElementById('vxRegS').value);
  r.moteur = document.getElementById('vxRegM').value;
  lsSet(LS_REG, r);
  toast('Réglage de la dictée enregistré.');
}

// ============================================================
// LIRE UNE CAPTURE / UN TEXTE COLLE
// ============================================================
const SCHEMAS = {
  contact: { champs: ['nom', 'telephone', 'email', 'ville', 'notes'],
    aide: 'nom : prénom et nom de la personne (le client, pas Henzo). notes : infos utiles en une phrase (métier, entreprise, ce qu\'elle veut).' },
  demande: { champs: ['nom', 'telephone', 'date_souhaitee', 'heure', 'type_seance', 'budget', 'message'],
    aide: 'date_souhaitee : format AAAA-MM-JJ si tu peux la déduire, sinon "". heure : format HH:MM. type_seance : Mariage, Dot, Anniversaire, Maternité, Portrait, Famille, Couple, Baptême, Studio, Événement, Vidéo... budget : un nombre en FCFA sans espace (ex : 50000), sinon "". message : résumé court de la demande.' }
};
function schema(type){ return SCHEMAS[type] || { champs: Array.isArray(type) ? type : ['texte'], aide: '' }; }
function vide(type){ const o = {}; schema(type).champs.forEach(c => { o[c] = ''; }); return o; }
function jsonDe(txt){
  let t = String(txt || '').replace(/```(?:json)?/gi, '').trim();
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if(a < 0 || b <= a) return null;
  try { return JSON.parse(t.slice(a, b + 1)); } catch(e){ try { return JSON.parse(t.slice(a, b + 1).replace(/,\s*}/g, '}')); } catch(e2){ return null; } }
}
function promptIA(type, source){
  const s = schema(type), auj = new Date();
  const jour = auj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return `${source === 'image' ? "Lis cette image (capture d'écran WhatsApp, carte de visite, liste, formulaire...)." : 'Lis ce texte copié (souvent un message WhatsApp).'}
Le photographe s'appelle Henzo (Henzo Studio / Henzo Photographie, Bouaké, Côte d'Ivoire) : ne le prends pas pour le client.
Nous sommes le ${jour} (${auj.toISOString().slice(0, 10)}).
Réponds UNIQUEMENT avec un objet JSON avec exactement ces clés : ${JSON.stringify(vide(type))}
${s.aide}
telephone : numéro ivoirien au format "+225 07 07 12 34 56" si possible.
Laisse "" quand l'info n'est pas là. N'invente rien.`;
}
function normaliser(type, o){
  const out = vide(type);
  Object.keys(out).forEach(k => { const v = o && o[k]; out[k] = v == null ? '' : (typeof v === 'number' ? v : tirets(String(v)).trim()); });
  if(out.telephone){ const t = telephones(String(out.telephone))[0]; if(t) out.telephone = t; }
  if('budget' in out && out.budget !== ''){ const n = Number(String(out.budget).replace(/[^\d]/g, '')); out.budget = n || ''; }
  return out;
}
// Fichier image -> data URL reduite (moins lourd pour l'IA)
function reduire(file, max){
  return new Promise((ok, ko) => {
    const fr = new FileReader();
    fr.onerror = () => ko(new Error("L'image n'a pas pu être lue."));
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const k = Math.min(1, (max || 1600) / Math.max(img.width, img.height));
          if(k >= 1 && file.size < 1.5e6) return ok(fr.result);
          const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          ok(c.toDataURL('image/jpeg', 0.86));
        } catch(e){ ok(fr.result); }
      };
      img.onerror = () => ok(fr.result);
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
function choisirImage(){
  return new Promise(ok => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.style.cssText = 'position:fixed;left:-9999px;opacity:0';
    let fait = false;
    inp.onchange = () => { fait = true; const f = inp.files && inp.files[0]; inp.remove(); ok(f || null); };
    window.addEventListener('focus', () => setTimeout(() => { if(!fait){ inp.remove(); ok(null); } }, 1200), { once: true });
    document.body.appendChild(inp);
    inp.click();
  });
}
async function vxLireCapture(type, callback, opts){
  opts = opts || {};
  type = type || 'contact';
  try {
    const f = opts.fichier || await choisirImage();
    if(!f) return null;
    if(!/^image\//.test(f.type || 'image/')) { alerte('Choisis une image (capture d\'écran ou photo).'); return null; }
    if(typeof iaRelais !== 'function') { alerte("L'IA n'est pas disponible. Ajoute une clé dans Réglages IA."); return null; }
    toast('Je lis la capture...', { ms: 30000 });
    const img = await reduire(f, 1600);
    const r = await iaRelais({ system: "Tu extrais des informations d'une image. Tu réponds seulement en JSON valide.", messages: [{ role: 'user', text: promptIA(type, 'image') }], images: [img], tache: 'images', maxTokens: 900 });
    const j = jsonDe(r.text);
    const t = document.getElementById('vxToast'); if(t) t.remove();
    if(!j){ alerte("Je n'ai pas réussi à lire cette capture. Essaie avec une image plus nette."); return null; }
    const o = normaliser(type, j);
    o._source = 'ia';
    if(typeof callback === 'function') callback(o);
    return o;
  } catch(e){
    const t = document.getElementById('vxToast'); if(t) t.remove();
    if(!e.iaLimite) alerte((e && e.message) || "La lecture de la capture n'a pas marché.");
    return null;
  }
}

// ---------- Extraction sans IA ----------
function telephones(txt){
  const out = [], re = /(^|[^\d])((?:\+|00)\s?225[\s.\-]*)?((?:0[157]|2[57])(?:[\s.\-]?\d){8})(?!\d)/g;
  let m;
  while((m = re.exec(String(txt || '')))){
    const d = m[3].replace(/\D/g, '');
    const f = '+225 ' + d.replace(/(\d{2})(?=\d)/g, '$1 ');
    if(!out.includes(f)) out.push(f);
  }
  return out;
}
const MOIS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const VILLES = ['Bouaké', 'Abidjan', 'Yamoussoukro', 'Korhogo', 'Daloa', 'San-Pédro', 'Man', 'Katiola', 'Béoumi', 'Sakassou', 'Dabou', 'Gagnoa', 'Divo', 'Bondoukou', 'Odienné', 'Séguéla', 'Ferkessédougou', 'Abengourou', 'Grand-Bassam', 'Bingerville', 'Anyama', 'Toumodi', 'Dimbokro', "M'Bahiakro", 'Brobo', 'Botro', 'Agboville', 'Adzopé', 'Soubré', 'Issia', 'Sinfra', 'Bouaflé', 'Tiébissou', 'Dabakala'];
const TYPES = [[/mariage civil/i, 'Mariage civil'], [/\bdot\b/i, 'Dot'], [/mariage|noces/i, 'Mariage'], [/anniv/i, 'Anniversaire'], [/maternit|grossesse|enceinte|baby ?bump/i, 'Maternité'],
  [/bapt[eê]me/i, 'Baptême'], [/soutenance/i, 'Soutenance'], [/fian[cç]aille|couple|saint.?valentin/i, 'Couple'], [/famille|familial/i, 'Famille'], [/\bbook\b/i, 'Book'],
  [/portrait|photo d'identit|photo de profil|cv\b/i, 'Portrait'], [/soir[ée]e|[ée]v[ée]nement|conf[ée]rence|s[ée]minaire|concert|gala|fun[ée]railles/i, 'Événement'], [/vid[ée]o|clip|film/i, 'Vidéo'], [/studio/i, 'Studio']];
const sansAccent = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function iso(d){ return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function dateDe(txt){
  const t = sansAccent(txt), auj = new Date(); auj.setHours(12, 0, 0, 0);
  let m = t.match(/\b(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?\b/);
  if(m && +m[2] >= 1 && +m[2] <= 12 && +m[1] >= 1 && +m[1] <= 31){
    let y = m[3] ? +m[3] : auj.getFullYear(); if(y < 100) y += 2000;
    const d = new Date(y, +m[2] - 1, +m[1], 12);
    if(!m[3] && d < auj - 864e5) d.setFullYear(y + 1);
    return iso(d);
  }
  m = t.match(new RegExp(`\\b(\\d{1,2}|1er)\\s+(${MOIS.join('|')}|janv|fevr?|avr|juil|sept|oct|nov|dec)\\.?(?:\\s+(\\d{4}))?`));
  if(m){
    const mi = MOIS.findIndex(x => x.startsWith(m[2].slice(0, 3)));
    const y = m[3] ? +m[3] : auj.getFullYear();
    const d = new Date(y, mi, m[1] === '1er' ? 1 : +m[1], 12);
    if(!m[3] && d < auj - 864e5) d.setFullYear(y + 1);
    return iso(d);
  }
  if(/apres[- ]demain/.test(t)){ const d = new Date(auj); d.setDate(d.getDate() + 2); return iso(d); }
  if(/\bdemain\b/.test(t)){ const d = new Date(auj); d.setDate(d.getDate() + 1); return iso(d); }
  if(/aujourd'?hui|ce soir/.test(t)) return iso(auj);
  m = t.match(new RegExp(`\\b(${JOURS.join('|')})\\b(\\s+prochain)?`));
  if(m){
    const j = JOURS.indexOf(m[1]); const d = new Date(auj);
    let n = (j - d.getDay() + 7) % 7; if(n === 0) n = 7;
    d.setDate(d.getDate() + n); return iso(d);
  }
  return '';
}
function heureDe(txt){
  const m = String(txt).match(/\b(?:à|a|vers|pour|de)?\s*(\d{1,2})\s*(?:h|heures?|:)\s*(\d{2})?\b/i);
  if(!m || +m[1] > 23) return '';
  return `${String(m[1]).padStart(2, '0')}:${m[2] || '00'}`;
}
function budgetDe(txt){
  const re = /(budget|prix|tarif|max(?:imum)?|j'ai|jusqu'à|jusqu'a|autour de|environ)?[^\d\n]{0,12}?(\d{1,3}(?:[ .\u202f\u00a0]\d{3})+|\d+)\s*(k\b|mille\b|milles\b)?\s*(f\b|fcfa\b|francs?\b|cfa\b|xof\b|frs?\b)?/gi;
  let m;
  while((m = re.exec(String(txt)))){
    const brut = m[2].replace(/[^\d]/g, '');
    if(!m[3] && !m[4] && !m[1]) continue;
    if(/^0[157]|^2[57]/.test(brut) && brut.length >= 8) continue;      // un numero de telephone
    let n = Number(brut); if(m[3]) n *= 1000;
    if(n >= 1000 && n < 1e8) return n;
  }
  return '';
}
function nomDe(txt){
  let m = String(txt).match(/^\s*\[?\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\]?\s*(?:-\s*)?([^:\n]{2,40}):/m);
  if(m){ const n = m[1].trim(); if(!/henzo/i.test(n) && !/^\+?[\d\s.\-]+$/.test(n)) return n; }
  m = String(txt).match(/(?:[Jj]e m'appelle|[Jj]e me nomme|[Mm]oi c'est|[Mm]on nom est|[Nn]om\s*:|[Ii]ci c'est|[Cc]'est)\s+((?:[A-ZÀ-Ý][A-Za-zÀ-ÿ'’-]+)(?:\s+[A-ZÀ-Ý][A-Za-zÀ-ÿ'’-]+){0,2})/);
  if(m && !/^(Henzo|Bonjour|Bonsoir|Merci)$/.test(m[1])) return m[1];
  return '';
}
function sansEntetes(txt){ return String(txt || '').replace(/^\s*\[?\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\]?\s*(?:-\s*)?[^:\n]{2,40}:\s*/gm, ''); }
function extraireSansIA(texte, type){
  const o = vide(type), corps = sansEntetes(texte);
  const tel = telephones(texte); if('telephone' in o && tel.length) o.telephone = tel[0];
  if('nom' in o) o.nom = nomDe(texte);
  const em = String(texte).match(/[\w.+-]+@[\w-]+\.[\w.-]+/); if('email' in o && em) o.email = em[0];
  if('ville' in o){ const t = sansAccent(texte); const v = VILLES.find(x => new RegExp(`\\b${sansAccent(x).replace(/[-']/g, '.')}\\b`).test(t)); if(v) o.ville = v; }
  if('date_souhaitee' in o) o.date_souhaitee = dateDe(corps);
  if('heure' in o) o.heure = heureDe(corps);
  if('type_seance' in o){ const ty = TYPES.find(([r]) => r.test(corps)); if(ty) o.type_seance = ty[1]; }
  if('budget' in o) o.budget = budgetDe(corps);
  if('message' in o) o.message = corps.replace(/\s*\n+\s*/g, ' ').trim().slice(0, 600);
  return o;
}
async function vxExtraireTexte(texte, type, opts){
  opts = opts || {}; type = type || 'contact';
  const base = extraireSansIA(texte, type);
  const manque = type === 'demande' ? (!base.nom || !base.type_seance || !base.date_souhaitee) : type === 'contact' ? !base.nom : true;
  const iaOk = opts.ia !== false && typeof iaRelais === 'function' && (typeof iaHasKey !== 'function' || iaHasKey());
  if(!manque || !iaOk || !String(texte || '').trim()) return Object.assign(normaliser(type, base), { _source: 'regex' });
  try {
    const r = await iaRelais({ system: 'Tu extrais des informations. Tu réponds seulement en JSON valide.', messages: [{ role: 'user', text: promptIA(type, 'texte') + '\n\nTEXTE :\n' + String(texte).slice(0, 6000) }], tache: 'json', maxTokens: 700 });
    const j = normaliser(type, jsonDe(r.text) || {});
    const out = {};
    Object.keys(base).forEach(k => {
      // Le numero et l'email trouves sans IA sont plus surs ; pour le reste, l'IA comprend mieux
      out[k] = (k === 'telephone' || k === 'email') ? (base[k] || j[k]) : (j[k] !== '' && j[k] != null ? j[k] : base[k]);
    });
    return Object.assign(normaliser(type, out), { _source: 'ia' });
  } catch(e){
    return Object.assign(normaliser(type, base), { _source: 'regex' });
  }
}

// ============================================================
// DEMARRAGE
// ============================================================
// Elements crees par voix.js (on ne reagit pas a leurs changements)
function aMoi(n){
  if(!n || n.nodeType !== 1) return false;
  if(n.id === 'vxBar' || n.id === 'vxToast' || n.id === 'vxPop' || n.id === 'vxCss') return true;
  const c = n.classList;
  return !!(c && (c.contains('vx-wrap') || c.contains('vx-b'))) || !!(n.closest && n.closest('#vxBar, #vxToast, #vxPop'));
}
function init(){
  css();
  scanner();
  try {
    const mo = new MutationObserver(muts => {
      if(VX.occupe) return;
      for(const m of muts){
        if(aMoi(m.target)) continue;                                   // nos propres changements
        if(m.type === 'attributes'){ planifier(); return; }
        for(const n of m.addedNodes){ if(n.nodeType === 1 && !aMoi(n)){ planifier(); return; } }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'open'] });
  } catch(e){}
  document.addEventListener('focusin', ev => { const el = ev.target; if(!VX.occupe && el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') && !el.__vx && !el.__vxNon) equiper(el); }, true);
  document.addEventListener('focusout', ev => {
    const el = ev.target;
    if(el && el.selectionStart != null && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')) el.__vxSel = { s: el.selectionStart, e: el.selectionEnd };
    if(VX.pop && ev.target === VX.pop.el) setTimeout(() => { if(VX.pop && document.activeElement !== VX.pop.el) fermerPop(); }, 180);
  }, true);
  document.addEventListener('input', surSaisie, true);
  document.addEventListener('keydown', surTouche, true);
  document.addEventListener('click', () => planifier(), true);
  window.addEventListener('resize', () => { planifier(); placerPop(); });
  window.addEventListener('scroll', () => placerPop(), true);
  if(window.visualViewport) window.visualViewport.addEventListener('resize', placerPop);
  setTimeout(lirePrefs, 4000);
}

Object.assign(window, {
  vxOuvrirPhrases, vxLireCapture, vxExtraireTexte, vxInserer, vxDicter: el => el && basculer(el), vxEquiper: z => scanner(z), vxPhrases: () => phrases().slice(),
  vxPhModifier, vxPhAnnuler, vxPhVar, vxPhGarder, vxPhSupprimer, vxPhInfos, vxPhBase, vxPhReglage,
  vxReglages: reglages,
  __vxTest: { nettoyer, accorder, telephones, extraireSansIA, etat: () => VX.st && { mode: VX.st.mode, etat: VX.st.etat } }
});

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
