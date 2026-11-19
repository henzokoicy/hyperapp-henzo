// ============================================================
// CONTEXTE-HENZO.JS v1 - "Mon contexte" : la base de tout texte
//   L'app pose des questions (réponses à toucher ou à écrire) pour connaître ta façon d'écrire :
//   ton univers, ton public, ta voix, tes mots, tes débuts et fins de phrase, ce que tu refuses,
//   ta façon d'aborder chaque type de séance. Tout est envoyé à l'IA à chaque texte.
//   Aucune demande d'IA pour répondre. Un bouton (1 demande) permet de recevoir des questions en plus.
//   Gardé dans Ma marque (marque.contexte), sans toucher à la base de données.
// ============================================================
const CTX_Q = [
  { id: 'univers', court: 'Qui je suis', q: "En une ou deux phrases : qui es-tu et que veux-tu que les gens retiennent de toi ?", aide: 'Ex : Photographe à Bouaké, je fais des portraits qui rendent les gens fiers d\'eux.' },
  { id: 'public', court: 'Mon public', q: 'Qui veux-tu attirer en priorité ?', pills: ['Mariés', 'Familles', 'Femmes enceintes', 'Enfants', 'Étudiants', 'Entrepreneurs et pros', 'Couples', 'Mannequins et modèles', 'Entreprises'], multi: true, aide: 'Touche plusieurs choix si besoin, et précise si tu veux.' },
  { id: 'adresse', court: 'Tutoiement', q: 'Tu parles à tes clients en…', pills: ['Je tutoie', 'Je vouvoie', 'Ça dépend (tu sur mon profil, vous sur ma page)'], multi: false },
  { id: 'registre', court: 'Ma façon de parler', q: 'Comment sonnent tes textes quand ils te ressemblent ?', pills: ['Simple et direct', 'Chaleureux', 'Élégant et soigné', 'Drôle et taquin', 'Familier, avec des mots d\'ici', 'Sobre et professionnel', 'Poétique'], multi: true },
  { id: 'debut', court: 'Mes débuts de texte', q: 'Comment aimes-tu commencer un texte ?', pills: ['Une question', 'Une phrase courte et forte', 'Un détail de la photo', 'Une anecdote', 'Le prénom de la personne', 'Un mot qui claque'], multi: true, aide: 'Tu peux aussi écrire ici un début que tu adores.' },
  { id: 'fin', court: 'Mes fins de texte', q: 'Comment aimes-tu finir ?', pills: ['Un appel à réserver', 'Une question', 'Un remerciement', 'Une phrase courte', 'Rien de spécial'], multi: true, aide: 'Écris ta phrase de fin préférée si tu en as une.' },
  { id: 'mots_aimes', court: 'Mes mots préférés', q: 'Quels mots et expressions sonnent comme toi ?', aide: 'Sépare par des virgules. Ex : kiffer, vrai, éclat, on se retrouve, trop beau' },
  { id: 'mots_refuses', court: 'Mots refusés', q: 'Quels mots ne veux-tu JAMAIS lire dans un texte à ton nom ?', aide: 'Sépare par des virgules. Ex : immortaliser, sublimer, magique, inoubliable' },
  { id: 'emojis', court: 'Emojis', q: 'Et les emojis ?', pills: ['Aucun', 'Quelques-uns', 'Beaucoup'], multi: false, aide: 'Si tu en as des préférés, écris-les ici (ex : 📸 ✨).' },
  { id: 'objectif', court: 'Mon objectif', q: "Qu'est-ce que tu veux obtenir avec tes publications ?", pills: ['Plus de réservations', 'Me faire connaître', 'Montrer mon style', 'Fidéliser mes clients', 'Vendre des tirages ou des albums', 'Attirer les mariages'], multi: true },
  { id: 'prix', court: 'Parler de prix', q: 'Parler de prix dans tes textes ?', pills: ['Jamais', 'Parfois, pour une promo', 'Oui, clairement'], multi: false },
  { id: 'approches', court: 'Mes séances', q: 'Comment abordes-tu tes séances ? Pour chaque type que tu fais souvent, dis ce que tu veux mettre en avant.', long: true, aide: 'Ex : Mariage : l\'émotion et les familles, jamais de technique. Portrait : la confiance de la personne. Anniversaire : la joie, les enfants.' },
  { id: 'jamais', court: 'Ce que je ne veux pas', q: 'Ce que tu ne veux jamais voir dans un texte', pills: ['Trop de majuscules', 'Points d\'exclamation partout', 'Phrases trop longues', 'Mots anglais', 'Promesses exagérées', 'Détails sur la vie privée de la cliente', 'Hashtags en rafale'], multi: true },
  { id: 'exemple', court: 'Une description que j\'adore', q: 'Colle une description complète que tu adores (de toi ou d\'un autre photographe).', long: true, aide: 'Elle sera gardée dans ta bibliothèque et servira d\'exemple à l\'IA.' },
  { id: 'libre', court: 'Autre chose', q: 'Autre chose que je dois savoir sur toi ou sur ta façon d\'écrire ?', long: true }
];
const CTX = { i: 0, vue: 'q', busy: '' };
const cxEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let cxTimer = null;

function cxMarque(){ return (typeof ST !== 'undefined' && ST.m && typeof MK !== 'undefined' && MK.tab === 'marque') ? ST.m : window.ST_MARQUE; }
function cxData(){
  const m = cxMarque() || {}; if(!m.contexte || typeof m.contexte !== 'object') m.contexte = {};
  const c = m.contexte; if(!c.r || typeof c.r !== 'object') c.r = {}; if(!Array.isArray(c.extra)) c.extra = [];
  return c;
}
function cxRep(id){ const x = cxData().r[id]; return x && typeof x === 'object' ? { p: Array.isArray(x.p) ? x.p : [], t: String(x.t || '') } : { p: [], t: '' }; }
function cxTexte(id){ const x = cxRep(id); return [x.p.join(', '), x.t.trim()].filter(Boolean).join(x.p.length && x.t.trim() ? '. ' : ''); }
function cxRepondu(id){ const x = cxRep(id); return x.p.length > 0 || x.t.trim().length > 0; }
function cxCount(){ return CTX_Q.filter(q => cxRepondu(q.id)).length + cxData().extra.filter(e => String(e.r || '').trim()).length; }
function cxTotal(){ return CTX_Q.length; }

// Texte envoye a l'IA (court : 2200 caractères au plus)
function ctxPrompt(){
  try {
    const L = [];
    CTX_Q.forEach(q => { if(q.id === 'exemple' || !cxRepondu(q.id)) return; L.push(`- ${q.court} : ${cxTexte(q.id).replace(/\s+/g, ' ').slice(0, q.long ? 700 : 350)}`); });
    cxData().extra.forEach(e => { if(String(e.r || '').trim()) L.push(`- ${String(e.q).slice(0, 120)} : ${String(e.r).replace(/\s+/g, ' ').slice(0, 300)}`); });
    if(!L.length) return '';
    return ('CONTEXTE DONNÉ PAR HENZO LUI-MÊME (c\'est la base de tout texte : sa voix, ses goûts, ses règles. Respecte-le avant tout, même si ça change tes habitudes) :\n' + L.join('\n')).slice(0, 2400);
  } catch(e){ return ''; }
}

// ---------- Enregistrement : contexte + effets sur mots, emojis, bibliotheque ----------
function cxSplit(t){ return String(t || '').split(/[,;\n]+/).map(x => x.trim().replace(/^[«"“]|[»"”]$/g, '').trim()).filter(x => x && x.length <= 40); }
function cxSauver(now){
  clearTimeout(cxTimer);
  const go = async () => {
    try {
      if(typeof stSauverMarque !== 'function') return;
      const m = cxMarque() || {}, c = cxData(), out = { contexte: c };
      const mots = m.mots && typeof m.mots === 'object' ? JSON.parse(JSON.stringify(m.mots)) : {}; mots.evite = mots.evite || {}; mots.prefere = mots.prefere || {};
      cxSplit(cxTexte('mots_refuses')).forEach(w => { mots.evite[w.toLowerCase()] = Math.max(mots.evite[w.toLowerCase()] || 0, 3); });
      cxSplit(cxTexte('mots_aimes')).forEach(w => { mots.prefere[w.toLowerCase()] = Math.max(mots.prefere[w.toLowerCase()] || 0, 3); });
      out.mots = mots; if(window.ST_MARQUE) window.ST_MARQUE.mots = mots;
      const em = cxRep('emojis').p[0]; if(em) out.emojis = em === 'Aucun' ? 'aucun' : em === 'Beaucoup' ? 'beaucoup' : 'peu';
      const ex = cxRep('exemple').t.trim();
      if(ex.length >= 25 && typeof txbMerge === 'function'){ out.biblio = txbMerge(Array.isArray(m.biblio) ? m.biblio : [], [{ t: ex, src: 'aime' }]); }
      await stSauverMarque(out);
    } catch(e){ console.warn('contexte', e); }
  };
  if(now) return go(); cxTimer = setTimeout(go, 700);
}
function cxSyncTa(){ const ta = document.getElementById('cxTa'); if(!ta) return; const q = CTX_Q[CTX.i]; if(!q) return; const c = cxData(); const r = cxRep(q.id); c.r[q.id] = { p: r.p, t: ta.value }; }

// ---------- Interface (fenetre) ----------
function cxInner(){
  const n = cxCount(), tot = cxTotal(), pct = Math.round(100 * CTX_Q.filter(q => cxRepondu(q.id)).length / tot);
  const head = `<h3>Mon contexte</h3><div class="cx-prog"><i style="width:${pct}%"></i></div><p class="cx-sub">${CTX_Q.filter(q => cxRepondu(q.id)).length} réponses sur ${tot}. Plus tu en donnes, plus l'IA écrit comme toi. Aucune de ces réponses ne consomme ton quota d'IA.</p>`;
  if(CTX.vue === 'liste'){
    const c = cxData();
    return head + `<div class="cx-list">${CTX_Q.map((q, i) => `<button class="cx-li ${cxRepondu(q.id) ? 'ok' : ''}" onclick="ctxAller(${i})"><b>${cxEsc(q.court)}</b><span>${cxRepondu(q.id) ? cxEsc(cxTexte(q.id).slice(0, 90)) : 'Pas encore répondu'}</span></button>`).join('')}</div>
      ${c.extra.length ? `<div class="cx-sep">Questions en plus (de l'IA)</div>${c.extra.map((e, i) => `<div class="cx-ex"><b>${cxEsc(e.q)}</b><textarea rows="2" placeholder="Ta réponse" onchange="ctxExtra(${i}, this.value)">${cxEsc(e.r || '')}</textarea></div>`).join('')}` : ''}
      <button class="cx-b2" ${CTX.busy ? 'disabled' : ''} onclick="ctxQuestionsIA()">${CTX.busy === 'ia' ? "L'IA prépare tes questions..." : 'Me poser d\'autres questions (1 demande IA)'}</button>
      <button class="cx-b1" onclick="agCloseSheet('ctxSheet')">Terminer</button>`;
  }
  const q = CTX_Q[CTX.i], r = cxRep(q.id), last = CTX.i === CTX_Q.length - 1;
  return head + `<div class="cx-q"><small>Question ${CTX.i + 1} sur ${tot}</small><b>${cxEsc(q.q)}</b>
    ${q.pills ? `<div class="cx-pills">${q.pills.map(p => `<button type="button" class="${r.p.includes(p) ? 'on' : ''}" onclick="ctxPill(${JSON.stringify(p).replace(/"/g, '&quot;')})">${cxEsc(p)}</button>`).join('')}</div>` : ''}
    <textarea id="cxTa" rows="${q.long ? 6 : 3}" placeholder="${cxEsc(q.aide || 'Écris ici, à ta façon (tu peux dicter avec le micro du clavier)')}" oninput="cxSyncTa()">${cxEsc(r.t)}</textarea></div>
    <div class="cx-nav"><button class="cx-b2" ${CTX.i === 0 ? 'disabled' : ''} onclick="ctxNav(-1)">Précédent</button><button class="cx-b2" onclick="ctxNav(1, true)">Passer</button><button class="cx-b1" onclick="ctxNav(${last ? 0 : 1}, false, ${last})">${last ? 'Terminer' : 'Suivant'}</button></div>
    <button class="cx-link" onclick="ctxVue('liste')">Voir toutes mes réponses</button>`;
}
function ctxRender(){ const b = document.getElementById('cxBox'); if(b) b.innerHTML = cxInner(); }
function ctxOuvrir(i){
  try { if(typeof stChargerMarque === 'function' && !window.ST_MARQUE) stChargerMarque(); } catch(e){}
  if(typeof stMarqueFusion === 'function' && window.ST_MARQUE) cxData();
  const prem = CTX_Q.findIndex(q => !cxRepondu(q.id));
  CTX.i = typeof i === 'number' ? i : (prem >= 0 ? prem : 0); CTX.vue = typeof i !== 'number' && prem < 0 ? 'liste' : 'q'; CTX.busy = '';
  if(typeof agSheet === 'function') agSheet('ctxSheet', `<div id="cxBox">${cxInner()}</div>`);
}
function ctxAller(i){ CTX.i = i; CTX.vue = 'q'; ctxRender(); }
function ctxVue(v){ cxSyncTa(); cxSauver(); CTX.vue = v; ctxRender(); }
function ctxPill(p){
  cxSyncTa(); const q = CTX_Q[CTX.i], c = cxData(), r = cxRep(q.id);
  const sel = r.p.includes(p) ? r.p.filter(x => x !== p) : (q.multi ? r.p.concat([p]) : [p]);
  c.r[q.id] = { p: sel, t: r.t }; cxSauver(); ctxRender();
}
function ctxNav(d, passer, fin){
  cxSyncTa(); cxSauver(passer ? false : false);
  if(fin){ CTX.vue = 'liste'; if(typeof agToast === 'function') agToast('Contexte enregistré : l\'IA va s\'en servir'); cxSauver(true); ctxRender(); return; }
  CTX.i = Math.max(0, Math.min(CTX_Q.length - 1, CTX.i + d)); ctxRender();
}
function ctxExtra(i, v){ const c = cxData(); if(c.extra[i]){ c.extra[i].r = v; cxSauver(); } }
async function ctxQuestionsIA(){
  if(CTX.busy) return; cxSyncTa(); CTX.busy = 'ia'; ctxRender();
  try {
    const dej = cxData().extra.map(e => e.q).join(' | ');
    const q = `Tu aides Henzo, photographe à Bouaké, à construire la fiche qui permettra à une IA d'écrire ses publications exactement comme lui. Voici ce qu'il a déjà dit :\n${ctxPrompt() || '(rien pour le moment)'}\n${typeof txtProfil === 'function' && txtProfil().length ? 'Ce qu\'on sait de ses textes : ' + txtProfil().join(' ; ') + '\n' : ''}${dej ? 'Questions déjà posées (ne les répète pas) : ' + dej + '\n' : ''}Pose-lui 4 questions NOUVELLES, courtes, concrètes et faciles à répondre, qui manquent pour mieux l'imiter (sa façon de réagir à une cliente timide, comment il remercie, ce qu'il dit d'un client difficile, sa blague préférée, comment il parle d'un mariage ou d'un prix…). Chaque question doit contenir un exemple de réponse possible.\nRéponds UNIQUEMENT en JSON : {"questions":["..."]}`;
    const r = await mkAI({ messages: [{ role: 'user', text: q }], maxTokens: 700 });
    const l = (mkJson(r.text).questions || []).map(x => String(x).replace(/[—–]/g, '-').trim()).filter(x => x.length > 10).slice(0, 4);
    if(!l.length) throw new Error("L'IA n'a pas trouvé de question. Réessaie.");
    const c = cxData(); l.forEach(x => c.extra.push({ q: x.slice(0, 220), r: '' })); c.extra = c.extra.slice(-12); cxSauver(true);
  } catch(e){ if(typeof agAlert === 'function') agAlert(e.message || String(e)); }
  CTX.busy = ''; CTX.vue = 'liste'; ctxRender();
}
// Carte dans Ma marque
function ctxCardHtml(){
  const n = CTX_Q.filter(q => cxRepondu(q.id)).length, tot = cxTotal();
  return `<div class="st-card"><h3>${typeof agIcon === 'function' ? agIcon('bulb', 18) : ''} Mon contexte</h3>
    <p>La base de tous tes textes : ta façon de parler, tes mots, tes débuts et tes fins de phrase, ce que tu refuses, comment tu abordes chaque séance. L'app te pose les questions une par une, et l'IA s'en sert à chaque texte.</p>
    <div class="cx-prog"><i style="width:${Math.round(100 * n / tot)}%"></i></div><p class="cx-sub">${n} réponses sur ${tot}${n ? '' : ' : commence, ça prend 3 minutes'}</p>
    <div class="txb-btns"><button class="btn-primary" onclick="ctxOuvrir()">${n ? 'Continuer les questions' : 'Répondre aux questions'}</button><button class="btn-secondary" onclick="ctxOuvrir(0);ctxVue('liste')">Voir mes réponses</button></div></div>`;
}
(function(){
  if(document.getElementById('cxCss')) return;
  const s = document.createElement('style'); s.id = 'cxCss';
  s.textContent = `#cxBox h3{margin:0 0 8px}.cx-prog{height:6px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden}.cx-prog i{display:block;height:100%;background:var(--accent,#c6f432);border-radius:99px}.cx-sub{font-size:12px;opacity:.7;margin:6px 0 10px}
  .cx-q{display:flex;flex-direction:column;gap:10px}.cx-q small{opacity:.6;font-size:12px}.cx-q>b{font-size:16px;line-height:1.35}.cx-q textarea{width:100%}
  .cx-pills{display:flex;flex-wrap:wrap;gap:6px}.cx-pills button{width:auto;border:1px solid rgba(255,255,255,.2);background:transparent;color:inherit;border-radius:99px;padding:8px 12px;font-size:13px;cursor:pointer}.cx-pills button.on{background:var(--accent,#c6f432);border-color:transparent;color:#111;font-weight:700}
  .cx-nav{display:flex;gap:8px;margin-top:12px}.cx-nav button{flex:1}.cx-b1{width:100%;border:0;border-radius:12px;padding:12px;background:var(--accent,#c6f432);color:#111;font-weight:700;font-size:14px;cursor:pointer}.cx-nav .cx-b1{width:auto}
  .cx-b2{border:1px solid rgba(255,255,255,.2);background:transparent;color:inherit;border-radius:12px;padding:12px;font-size:14px;cursor:pointer;width:100%;margin-top:8px}.cx-b2:disabled{opacity:.4}.cx-nav .cx-b2{width:auto;margin:0}
  .cx-link{display:block;margin:12px auto 0;border:0;background:none;color:inherit;opacity:.7;text-decoration:underline;font-size:13px;cursor:pointer;width:auto}
  .cx-list{display:flex;flex-direction:column;gap:6px;margin-bottom:10px}.cx-li{display:flex;flex-direction:column;gap:2px;text-align:left;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:inherit;border-radius:12px;padding:10px 12px;cursor:pointer;width:100%}
  .cx-li b{font-size:13px}.cx-li span{font-size:12px;opacity:.65}.cx-li.ok{border-color:rgba(126,226,168,.5)}.cx-sep{margin:10px 0 6px;font-size:12px;opacity:.65}.cx-ex{display:flex;flex-direction:column;gap:6px;margin-bottom:10px;font-size:13px}.cx-ex textarea{width:100%}`;
  document.head.appendChild(s);
})();
Object.assign(window, { CTX, ctxPrompt, ctxOuvrir, ctxAller, ctxVue, ctxPill, ctxNav, ctxExtra, ctxQuestionsIA, ctxCardHtml, cxSyncTa, ctxRender, ctxCount: cxCount, ctxTotal: cxTotal });
