// ============================================================
// ECRITURE.JS - Mieux écrire partout dans l'app
// ------------------------------------------------------------
// Quand tu écris dans un champ de texte, une petite barre apparaît
// au-dessus du clavier :
// - Mots proposés : la fin du mot que tu tapes, puis le mot suivant
//   probable. L'app apprend TES mots (notes, messages, clients...) et
//   comprend ce que tu écris d'habitude après tel mot. Touche un mot
//   pour l'ajouter.
// - Fautes fréquentes corrigées en un toucher (ex : "sa va" -> "ça va").
// - "Corriger" : l'IA corrige l'orthographe et la grammaire du texte,
//   tu vois avant / après et tu choisis.
// - "Aide IA" : plus clair, plus pro, plus court, plus chaleureux,
//   continuer la phrase, ou ta propre demande, en tenant compte de
//   l'endroit où tu écris.
// Le correcteur du téléphone est aussi activé en français.
// Réglage : Personnaliser > Aide à l'écriture (ou le x de la barre).
// ============================================================
(function(){
'use strict';
if(typeof agSheet !== 'function') return;
const E = s => agEsc(String(s == null ? '' : s));
const EC = { champ: null, voc: null, bi: null, maj: 0, off: false };
window.EC = EC;
try { EC.off = localStorage.getItem('ec_off') === '1'; } catch(e){}
const norm = s => String(s || '').toLowerCase();

// ---------- Vocabulaire ----------
const EC_BASE = ('bonjour bonsoir merci beaucoup pour votre vos votre confiance photos photo séance séances shooting studio rendez-vous disponible disponibilité '
  + 'acompte paiement payer reste total prix tarif tarifs pack packs option options livraison retouche retouchées galerie lien envoyer envoyé envoie '
  + 'demain aujourd\'hui ce soir samedi dimanche lundi mardi mercredi jeudi vendredi semaine mois prochain prochaine heure heures minutes '
  + 'mariage anniversaire baptême famille couple enfant enfants maternité portrait portraits événement cérémonie dot soutenance '
  + 'client clients cliente madame monsieur mademoiselle chère cher félicitations joyeux bonne journée soirée fête fêtes '
  + 'est sont avec dans pour que qui quoi comment combien quand mais donc alors aussi très bien super magnifique belle beau '
  + 'vous nous je tu il elle ils elles votre notre mon ma mes ton ta tes leur leurs cette cet ces plus moins encore déjà '
  + 'possible confirmer confirmé confirmation réservation réserver réservé date lieu adresse Bouaké Abidjan Ahougnansou '
  + 'Wave espèces Orange Money MTN Moov reçu facture devis contrat merci d\'avance cordialement à bientôt n\'hésitez pas '
  + 'publier publication Facebook Instagram TikTok WhatsApp statut story reel vidéo montage musique budget charges loyer').split(/\s+/);
const EC_FAUTES = [
  [/\bsa va\b/gi, 'ça va'], [/\bsava\b/gi, 'ça va'], [/\bsa fait\b/gi, 'ça fait'], [/\bc'est a dire\b/gi, 'c\'est-à-dire'], [/\bmalgres\b/gi, 'malgré'],
  [/\bquelque soit\b/gi, 'quel que soit'], [/\bje vous est\b/gi, 'je vous ai'], [/\bvous etes\b/gi, 'vous êtes'], [/\bdeja\b/gi, 'déjà'], [/\btres\b/gi, 'très'],
  [/\ba bientot\b/gi, 'à bientôt'], [/\bmerci a vous\b/gi, 'merci à vous'], [/\bil faut que je vais\b/gi, 'il faut que j\'aille'], [/\bpeut etre\b/gi, 'peut-être'],
  [/\bsi il\b/gi, 's\'il'], [/\bentrain\b/gi, 'en train'], [/\bauquel cas\b/gi, 'auquel cas'], [/\bbiensur\b/gi, 'bien sûr'], [/\bbien sur\b/gi, 'bien sûr'],
  [/\bça\s+c'est\b/gi, 'ça, c\'est'], [/\bmes salutations\b/gi, 'mes salutations'], [/\bseance\b/gi, 'séance'], [/\bdisponibilite\b/gi, 'disponibilité'], [/\breserver\b/gi, 'réserver'],
  [/\bphotographie\b/g, 'photographie'], [/\bacompte\b/g, 'acompte'], [/\bacconte\b/gi, 'acompte'], [/\bacompt\b/gi, 'acompte']
];
function ecTextes(){
  const L = [];
  try { (typeof notes !== 'undefined' ? notes : []).forEach(n => L.push(n.title || '', n.content || '')); } catch(e){}
  try { (typeof CRM !== 'undefined' && CRM.msgs ? CRM.msgs : []).slice(0, 300).forEach(m => L.push(m.text || '')); } catch(e){}
  try { (typeof txs !== 'undefined' ? txs : []).slice(0, 400).forEach(t => L.push(t.note || '', t.category || '')); } catch(e){}
  try { (typeof clients !== 'undefined' ? clients : []).forEach(c => L.push(c.name || '')); } catch(e){}
  try { (typeof shoots !== 'undefined' ? shoots : []).slice(0, 200).forEach(s => L.push(s.type || '', s.location || '', s.notes || '')); } catch(e){}
  try { L.push(localStorage.getItem('ec_appris') || ''); } catch(e){}
  return L.join('\n');
}
function ecApprendre(){
  if(EC.voc && Date.now() - EC.maj < 60000) return;
  const voc = new Map(), bi = new Map();
  EC_BASE.forEach(w => voc.set(w, (voc.get(w) || 0) + 2));
  const mots = ecTextes().split(/[^A-Za-zÀ-ÖØ-öø-ÿ'’-]+/).map(w => w.replace(/^['’-]+|['’-]+$/g, '')).filter(w => w.length > 1);
  for(let i = 0; i < mots.length; i++){
    const w = mots[i]; if(w.length >= 3) voc.set(w, (voc.get(w) || 0) + 3);
    if(i > 0){ const a = norm(mots[i - 1]); let m = bi.get(a); if(!m){ m = new Map(); bi.set(a, m); } m.set(w, (m.get(w) || 0) + 1); }
  }
  EC.voc = voc; EC.bi = bi; EC.maj = Date.now();
}
// Les mots tapés et validés enrichissent le vocabulaire (sur cet appareil)
function ecGarder(txt){
  try { const a = (localStorage.getItem('ec_appris') || '') + '\n' + String(txt).slice(0, 400); localStorage.setItem('ec_appris', a.slice(-20000)); } catch(e){}
}
function ecPropositions(val, pos){
  ecApprendre();
  const avant = val.slice(0, pos), m = /([A-Za-zÀ-ÖØ-öø-ÿ'’-]*)$/.exec(avant), part = m ? m[1] : '';
  const out = [];
  if(part.length >= 1){
    const p = norm(part);
    const cands = [...EC.voc.entries()].filter(([w]) => norm(w).startsWith(p) && norm(w) !== p).sort((a, b) => b[1] - a[1]).slice(0, 4).map(x => x[0]);
    // Garde la majuscule tapée
    cands.forEach(w => out.push({ t: part[0] === part[0].toUpperCase() && part[0] !== part[0].toLowerCase() ? w[0].toUpperCase() + w.slice(1) : w, part }));
  } else {
    const prev = (/([A-Za-zÀ-ÖØ-öø-ÿ'’-]+)[^A-Za-zÀ-ÖØ-öø-ÿ]*$/.exec(avant) || [])[1];
    const m2 = prev && EC.bi.get(norm(prev));
    if(m2) [...m2.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).forEach(([w]) => out.push({ t: w, part: '' }));
  }
  return out;
}
function ecFautes(val){
  const L = [];
  EC_FAUTES.forEach(([re, bon]) => { re.lastIndex = 0; const m = val.match(re); if(m) m.forEach(x => { if(x !== bon && !L.some(l => l.de === x)) L.push({ de: x, vers: bon, re }); }); });
  return L.slice(0, 2);
}

// ---------- Quels champs ----------
function ecEligible(el){
  if(!el || EC.off) return false;
  if(el.closest('#ecBar, .ec-no, #agDlg')) return false;
  if(el.tagName === 'TEXTAREA') return true;
  if(el.tagName !== 'INPUT') return false;
  const t = (el.type || 'text').toLowerCase();
  if(!['text', 'search', ''].includes(t)) return false;
  if(/mdp|pass|code|slug|tel|phone|mail|url|lien|link|port|q$|^q|search|recherche|hiQ|caQ/i.test(el.id || '') || el.inputMode === 'tel' || el.autocomplete === 'off') return false;
  return true;
}
function ecContexte(el){
  const bg = el.closest('.modal-bg'), h = bg && bg.querySelector('h3');
  const l = el.id && document.querySelector(`label[for="${el.id}"]`);
  return [h && h.textContent.trim(), l && l.textContent.trim(), el.placeholder].filter(Boolean).join(' · ');
}

// ---------- La barre ----------
function ecBarre(){
  let b = document.getElementById('ecBar');
  if(!b){
    b = document.createElement('div'); b.id = 'ecBar'; b.className = 'ec-bar';
    b.addEventListener('mousedown', e => { if(!e.target.closest('input')) e.preventDefault(); });
    b.addEventListener('touchstart', e => { if(e.target.closest('button')) e.preventDefault(); }, { passive: false });
    document.body.appendChild(b);
  }
  return b;
}
function ecPlacer(){
  const b = document.getElementById('ecBar'); if(!b || b.style.display === 'none') return;
  const vv = window.visualViewport;
  const bas = vv ? Math.max(0, window.innerHeight - (vv.height + vv.offsetTop)) : 0;
  b.style.bottom = bas + 'px';
}
function ecMontrer(){
  const el = EC.champ, b = ecBarre();
  if(!el || !document.contains(el) || document.activeElement !== el){ b.style.display = 'none'; return; }
  const v = el.value || '', pos = el.selectionStart == null ? v.length : el.selectionStart;
  const P = ecPropositions(v, pos), Fa = ecFautes(v);
  b.innerHTML = `<div class="ec-sug">${Fa.map((f, i) => `<button type="button" class="ec-faute" data-f="${i}">${E(f.de)} <span>devient</span> ${E(f.vers)}</button>`).join('')}${P.map((p, i) => `<button type="button" class="ec-mot" data-i="${i}">${E(p.t)}</button>`).join('') || (!Fa.length ? '<span class="ec-vide">Écris : je te propose des mots</span>' : '')}</div>
    <div class="ec-act">${v.trim().length > 3 ? `<button type="button" class="ec-cor" title="Corriger les fautes">${agIcon('check', 14)} Corriger</button>` : ''}<button type="button" class="ec-ia" title="Aide de l'IA">${agIcon('sparkles', 14)} IA</button><button type="button" class="ec-x" title="Masquer" aria-label="Masquer la barre">×</button></div>`;
  b.querySelectorAll('.ec-mot').forEach(x => x.onclick = () => ecInserer(P[Number(x.dataset.i)]));
  b.querySelectorAll('.ec-faute').forEach(x => x.onclick = () => { const f = Fa[Number(x.dataset.f)]; ecRemplacerTout(el.value.split(f.de).join(f.vers)); });
  const c = b.querySelector('.ec-cor'); if(c) c.onclick = () => ecCorriger(el);
  b.querySelector('.ec-ia').onclick = () => ecAide(el);
  b.querySelector('.ec-x').onclick = () => { el.classList.add('ec-no'); b.style.display = 'none'; };
  b.style.display = '';
  ecPlacer();
}
function ecPoser(el, val, curseur){
  el.value = val;
  try { el.setSelectionRange(curseur, curseur); } catch(e){}
  el.dispatchEvent(new Event('input', { bubbles: true }));
}
function ecInserer(p){
  const el = EC.champ; if(!el || !p) return;
  const v = el.value, pos = el.selectionStart == null ? v.length : el.selectionStart;
  const debut = v.slice(0, pos - p.part.length), fin = v.slice(pos);
  const ajout = (debut && !/\s$/.test(debut) && !p.part ? ' ' : '') + p.t + (/^\s/.test(fin) ? '' : ' ');
  ecPoser(el, debut + ajout + fin, (debut + ajout).length);
  el.focus(); ecMontrer();
}
function ecRemplacerTout(txt){ const el = EC.champ; if(!el) return; ecPoser(el, txt, txt.length); el.focus(); ecMontrer(); }

// ---------- IA : corriger ----------
async function ecIA(sys, txt, ctx){
  const r = await mkAI({ system: sys, messages: [{ role: 'user', text: (ctx ? `Endroit dans l'app : ${ctx}\n\n` : '') + 'TEXTE :\n' + txt }], maxTokens: 1200 });
  let t = String(r.text || '').trim().replace(/^["«]\s*|\s*["»]$/g, '');
  if(typeof txtDefancy === 'function') t = txtDefancy(t);
  return t.replace(/[–—]/g, '-');
}
async function ecCorriger(el){
  const txt = el.value; if(!txt.trim()) return;
  const cible = el;
  agSheet('ecCor', `<h3>Corriger le texte</h3><div id="ecCorB"><div class="ag-empty">Je corrige les fautes...</div></div>`);
  try {
    const t = await ecIA('Tu corriges l\'orthographe, la grammaire et la ponctuation d\'un texte en français écrit par Henzo, photographe à Bouaké. Tu gardes exactement le sens, le ton, le tutoiement ou le vouvoiement, les emojis, les retours à la ligne et les noms propres. Tu n\'ajoutes rien. Tirets simples uniquement. Réponds UNIQUEMENT avec le texte corrigé.', txt, ecContexte(el));
    const b = document.getElementById('ecCorB'); if(!b) return;
    if(t.trim() === txt.trim()){ b.innerHTML = '<div class="ec-ok">Aucune faute trouvée. Ton texte est bon.</div>'; return; }
    EC.prop = { el: cible, t };
    b.innerHTML = `<div class="ec-av"><small>Avant</small><p>${E(txt).replace(/\n/g, '<br>')}</p></div><div class="ec-ap"><small>Corrigé</small><p>${ecDiff(txt, t)}</p></div>
      <button class="btn-primary" onclick="ecAccepter()">Remplacer par le texte corrigé</button><button class="btn-ghost" style="width:100%;margin-top:8px" onclick="agCloseSheet('ecCor')">Garder mon texte</button>`;
  } catch(e){ const b = document.getElementById('ecCorB'); if(b) b.innerHTML = `<div class="ag-hint warn">L'IA n'a pas pu corriger : ${E(e.message || e)}</div>`; }
}
// Montre les mots changés en couleur
function ecDiff(a, b){
  const A = a.split(/(\s+)/), B = b.split(/(\s+)/), setA = new Set(A.map(norm));
  return B.map(w => /^\s+$/.test(w) ? w.replace(/\n/g, '<br>') : setA.has(norm(w)) ? E(w) : `<mark>${E(w)}</mark>`).join('');
}
window.ecAccepter = function(mode){
  const P = EC.prop; if(!P || !P.el) return;
  const el = P.el, v = mode === 'ajout' ? (el.value.replace(/\s*$/, '') + (el.value.trim() ? (el.tagName === 'TEXTAREA' ? '\n' : ' ') : '') + P.t) : P.t;
  ecPoser(el, v, v.length); ecGarder(P.t);
  agCloseSheet('ecCor'); agCloseSheet('ecAide');
  setTimeout(() => { try { el.focus(); } catch(e){} }, 50);
  agToast(mode === 'ajout' ? 'Ajouté à la fin' : 'Texte remplacé');
};

// ---------- IA : aide à écrire ----------
const EC_AIDES = [['clair', 'Plus clair'], ['pro', 'Plus professionnel'], ['court', 'Plus court'], ['chaleur', 'Plus chaleureux'], ['vendre', 'Plus vendeur'], ['suite', 'Continuer'], ['idee', 'Je bloque : propose-moi un texte']];
function ecAide(el){
  EC.aideEl = el;
  agSheet('ecAide', `<h3>Aide de l'IA</h3>
    <div class="ag-hint" style="margin-top:0">${E(ecContexte(el) || 'Ton texte')}</div>
    ${el.value.trim() ? `<div class="ec-av"><small>Ton texte</small><p>${E(el.value).replace(/\n/g, '<br>')}</p></div>` : ''}
    <div class="ag-pills" style="margin:8px 0">${EC_AIDES.filter(([k]) => el.value.trim() || k === 'idee').map(([k, l]) => `<button type="button" onclick="ecAideGo('${k}')">${l}</button>`).join('')}</div>
    <div class="ap-ask"><input id="ecQ" class="ec-no" placeholder="Ou dis ce que tu veux : ex « ajoute que l'acompte est de 50 % »" onkeydown="if(event.key==='Enter')ecAideGo('libre')"><button class="btn-primary" onclick="ecAideGo('libre')">OK</button></div>
    <div id="ecAideR"></div>`);
}
window.ecAideGo = async function(k){
  const el = EC.aideEl; if(!el) return;
  const txt = el.value, q = (document.getElementById('ecQ') || {}).value || '';
  const consignes = { clair: 'Réécris ce texte pour qu\'il soit plus clair et simple, même sens.', pro: 'Réécris ce texte de façon plus professionnelle et polie, sans être froid.', court: 'Raccourcis ce texte en gardant l\'essentiel.', chaleur: 'Réécris ce texte de façon plus chaleureuse et humaine.', vendre: 'Réécris ce texte pour donner envie au client de réserver, sans mentir ni exagérer.', suite: 'Écris seulement la suite logique de ce texte (1 à 3 phrases), dans le même style. Ne répète pas le début.', idee: 'Propose un texte adapté à cet endroit de l\'app (si un texte est déjà commencé, pars de lui).', libre: 'Fais ce que demande Henzo : ' + q };
  if(k === 'libre' && !q.trim()) return;
  const r = document.getElementById('ecAideR'); if(r) r.innerHTML = '<div class="ag-empty">L\'IA écrit...</div>';
  try {
    const t = await ecIA(`Tu aides Henzo, photographe et vidéaste à Bouaké (Côte d'Ivoire), à écrire dans son application. Français simple et naturel, adapté à ses clients. Garde le tutoiement ou le vouvoiement du texte. Tirets simples uniquement. ${consignes[k]} Réponds UNIQUEMENT avec le texte à utiliser.`, txt || '(vide)', ecContexte(el));
    EC.prop = { el, t };
    if(r) r.innerHTML = `<div class="ec-ap"><small>Proposition</small><p>${E(t).replace(/\n/g, '<br>')}</p></div>
      <div class="bg-btns"><button class="btn-primary" style="margin:0" onclick="ecAccepter()">${k === 'suite' ? 'Remplacer tout' : 'Utiliser ce texte'}</button><button class="btn-ghost" style="margin:0" onclick="ecAccepter('ajout')">Ajouter à la fin</button></div>
      <button class="btn-ghost" style="width:100%;margin-top:8px" onclick="ecAideGo('${k}')">Autre proposition</button>`;
  } catch(e){ if(r) r.innerHTML = `<div class="ag-hint warn">L'IA n'a pas pu répondre : ${E(e.message || e)}</div>`; }
};

// ---------- Branchements ----------
document.addEventListener('focusin', e => {
  const el = e.target;
  if(ecEligible(el) && !el.classList.contains('ec-no')){
    EC.champ = el;
    if(!el.hasAttribute('spellcheck')) el.setAttribute('spellcheck', 'true');
    if(!el.getAttribute('lang')) el.setAttribute('lang', 'fr');
    ecMontrer();
  }
}, true);
document.addEventListener('focusout', () => { setTimeout(() => { const a = document.activeElement; if(!a || a !== EC.champ){ const b = document.getElementById('ecBar'); if(b && !(a && a.closest && a.closest('#ecBar'))) b.style.display = 'none'; } }, 150); }, true);
document.addEventListener('input', e => { if(e.target === EC.champ) ecMontrer(); }, true);
document.addEventListener('keyup', e => { if(e.target === EC.champ && /Arrow|Home|End/.test(e.key)) ecMontrer(); }, true);
document.addEventListener('click', e => { if(e.target === EC.champ) ecMontrer(); }, true);
if(window.visualViewport){ visualViewport.addEventListener('resize', ecPlacer); visualViewport.addEventListener('scroll', ecPlacer); }
window.ecActiver = function(on){ EC.off = !on; try { localStorage.setItem('ec_off', on ? '0' : '1'); } catch(e){} if(!on){ const b = document.getElementById('ecBar'); if(b) b.style.display = 'none'; } agToast(on ? 'Aide à l\'écriture activée' : 'Aide à l\'écriture désactivée'); };
window.ecCorriger = ecCorriger; window.ecAide = ecAide; window.ecPropositions = ecPropositions; window.ecFautes = ecFautes;

// Réglage dans "Personnaliser l'app"
if(typeof nsOuvrir === 'function'){
  const nsOuvrirEc = nsOuvrir;
  window.nsOuvrir = nsOuvrir = async function(){
    const r = await nsOuvrirEc.apply(this, arguments);
    const w = document.querySelector('#nsApp .modal-wrap');
    if(w && !w.querySelector('.ec-reg')) w.insertAdjacentHTML('beforeend', `<div class="ns-sec ec-reg">Aide à l'écriture</div><label class="ag-check"><input type="checkbox" ${EC.off ? '' : 'checked'} onchange="ecActiver(this.checked)"> Mots proposés, correction et aide de l'IA quand j'écris</label>`);
    return r;
  };
}
if(window.CA_ITEMS) CA_ITEMS.push({ id: 'ecriture', s: 'Idées et organisation', t: 'Correcteur et mots proposés', q: 'En écrivant : mots proposés (ils apprennent tes mots), fautes fréquentes corrigées, « Corriger » par l\'IA, et « IA » pour rendre un texte plus clair, plus pro, plus court ou le continuer.', ou: 'Barre au-dessus du clavier quand tu écris', m: 'orthographe faute correcteur suggestion mot écrire aide IA blocage', go: ['nsOuvrir', []] });

(function ecCss(){
  if(document.getElementById('ecCss')) return;
  const st = document.createElement('style'); st.id = 'ecCss';
  st.textContent = `.ec-bar{position:fixed;left:0;right:0;bottom:0;z-index:9500;display:none;align-items:center;gap:6px;padding:6px 8px calc(6px + env(safe-area-inset-bottom));background:color-mix(in srgb,var(--card) 96%,transparent);border-top:1px solid var(--border);box-shadow:0 -6px 20px rgba(0,0,0,.25);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.ec-bar[style*="bottom"]{display:flex}
.ec-sug{flex:1;min-width:0;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}.ec-sug::-webkit-scrollbar{display:none}
.ec-sug button,.ec-act button{flex:0 0 auto;margin:0;padding:8px 12px;border-radius:10px;border:1px solid var(--border);background:var(--card2);color:var(--text);font-size:14px;cursor:pointer;width:auto!important;white-space:nowrap}
.ec-faute{border-color:#f5a524!important;color:#f5c46a!important}.ec-faute span{opacity:.7}
.ec-vide{font-size:12px;color:var(--muted);padding:8px 4px;white-space:nowrap}
.ec-act{display:flex;gap:6px;flex-shrink:0}.ec-act button{display:inline-flex;align-items:center;gap:4px;font-size:12.5px;font-weight:600;color:var(--accent)}.ec-act .ec-x{color:var(--muted);padding:8px 10px}
.ec-av,.ec-ap{margin:8px 0;padding:10px 12px;border-radius:12px;background:var(--card2);font-size:14px;line-height:1.5;color:var(--text)}.ec-av small,.ec-ap small{display:block;font-size:11px;color:var(--muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em}
.ec-ap{border:1px solid var(--accent)}.ec-ap mark{background:color-mix(in srgb,#34c759 30%,transparent);color:var(--text);border-radius:3px;padding:0 2px}
.ec-ok{padding:14px;border-radius:12px;background:color-mix(in srgb,#34c759 14%,transparent);color:var(--text);text-align:center}`;
  document.head.appendChild(st);
})();
})();
