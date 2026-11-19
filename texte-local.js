// ============================================================
// TEXTE-LOCAL.JS v1 - Le contrôleur de textes "maison" (aucune IA, aucun quota)
//   Vérifie chaque texte de publication sur l'appareil :
//   clichés, formules robotiques, début déjà utilisé, texte trop proche d'un ancien ou d'un autre réseau,
//   trop d'exclamations / d'émojis, longueur.
//   Donne aussi à l'IA ce qu'il faut pour varier (début des anciens textes, style du moment, mots interdits).
// ============================================================
const TXL_CLICHES = [
  [/immortalis/i, 'immortaliser'], [/moments?\s+(pr[ée]cieux|inoubliables?|magiques?|uniques?|d[''’]exception)/i, '« moments précieux / inoubliables »'],
  [/souvenirs?\s+inoubliables?/i, '« souvenirs inoubliables »'], [/n[''’]h[ée]sitez\s+pas/i, '« n\'hésitez pas »'], [/\bd[ée]couvrez\b/i, '« découvrez »'],
  [/\bplongez\b/i, '« plongez »'], [/chaque\s+instant/i, '« chaque instant »'], [/capturer?\s+(l[''’]essence|la\s+magie|des\s+moments|l[''’]instant)/i, '« capturer la magie / l\'essence »'],
  [/laissez[- ]nous/i, '« laissez-nous »'], [/pur\s+bonheur|pure\s+joie/i, '« pur bonheur »'], [/[àa]\s+ne\s+pas\s+manquer/i, '« à ne pas manquer »'],
  [/inoubliable/i, '« inoubliable »'], [/(?:un\s+)?v[ée]ritable\s+(?:chef|bijou|bonheur)/i, '« véritable bijou »'], [/le\s+(?:grand\s+)?jour\s+J/i, '« le jour J » (cliché)'],
  [/\bsplendide\b.*\bsplendide\b|\bmagnifique\b.*\bmagnifique\b|\bsuperbe\b.*\bsuperbe\b/is, 'le même adjectif répété'],
  [/(?:r[êe]ves?\s+(?:devenus?|deviennent)\s+r[ée]alit[ée])/i, '« rêve devenu réalité »'], [/(?:avec\s+tout\s+(?:notre|mon)\s+c(?:œ|oe)ur)/i, '« avec tout mon cœur »']
];
const txlNorm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const txlClean = s => (typeof stDefancy === 'function' ? stDefancy(s) : String(s || ''));
const txlWords = s => txlNorm(s).split(' ').filter(Boolean);
function txlGrams(s, n){ const w = txlWords(s), g = new Set(); for(let i = 0; i + n <= w.length; i++) g.add(w.slice(i, i + n).join(' ')); return g; }
function txlSim(a, b){ const A = txlGrams(a, 3), B = txlGrams(b, 3); if(!A.size || !B.size) return 0; let c = 0; A.forEach(x => { if(B.has(x)) c++; }); return c / Math.min(A.size, B.size); }
// Textes deja ecrits : publications de l'app (captions) + versions retenues
function txlAnciens(n){
  const L = ((typeof MK !== 'undefined' && MK.posts) || []).filter(p => p.caption).slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, n || 14)
    .map(p => ({ t: txlClean(p.caption), titre: p.title || '' }));
  return L;
}
function txlDebut(t){ const l = txlClean(t).split('\n').map(x => x.trim()).filter(Boolean); return l.length ? txlWords(l.length > 1 ? l[1] : l[0]).slice(0, 4).join(' ') : ''; }
function txlCorps(t){ // sans titre (1re ligne), sans hashtags, sans credits
  return txlClean(t).split('\n').filter((l, i) => i > 0 && !/^\s*(#|©|\(c\))/.test(l) && !/:\s*\S/.test(l.slice(0, 22))).join(' ');
}
// Audit d'un texte : {score 0-100, issues:[{k, msg, grave}]}
function txtAudit(texte, canal, autres){
  const t = txlClean(texte).trim(), out = [];
  if(!t) return { score: 100, issues: [] };
  const corps = txlCorps(t) || t, add = (k, msg, grave, pts) => out.push({ k, msg, grave: !!grave, pts });
  const cl = TXL_CLICHES.filter(([re]) => re.test(t)).map(([, n]) => n);
  if(cl.length) add('cliche', 'Formules toutes faites : ' + cl.slice(0, 3).join(', ') + (cl.length > 3 ? ' et ' + (cl.length - 3) + ' autres' : ''), cl.length >= 2, 15 + 10 * cl.length);
  // Debut deja utilise
  const old = txlAnciens(14), d = txlDebut(t);
  if(d && d.split(' ').length >= 2 && old.some(o => txlDebut(o.t) === d)) add('debut', 'Commence comme un de tes anciens textes', true);
  // Trop proche d'un ancien texte
  const proche = old.find(o => txlSim(corps, txlCorps(o.t) || o.t) >= 0.45);
  if(proche) add('ancien', 'Très proche d\'un texte déjà publié' + (proche.titre ? ' (« ' + String(proche.titre).slice(0, 30) + ' »)' : ''), true);
  // Trop proche d'un autre reseau du meme lot
  (autres || []).forEach(a => { if(a && a.texte && txlSim(corps, txlCorps(a.texte) || a.texte) >= 0.55) add('doublon', 'Presque pareil que le texte ' + a.nom, true); });
  const ex = (t.match(/!/g) || []).length; if(ex > 3) add('excl', ex + ' points d\'exclamation : ça fait publicité', false);
  const em = (t.match(/\p{Extended_Pictographic}/gu) || []).filter(e => !/[©®™]/.test(e)).length; if(em > 7) add('emoji', em + ' émojis : trop chargé', false);
  if(/^[\p{Extended_Pictographic}\s✨]{0,4}(?:✨|🌟|📸)/u.test(t) && /^\s*(?:✨|🌟)/.test(t)) add('etoile', 'Commence par ✨ comme beaucoup de textes automatiques', false);
  const mots = txlWords(corps).length;
  const max = { whatsapp: 45, tiktok: 40, perso: 110, groupes: 130, instagram: 120, page: 160 }[canal];
  if(max && mots > max) add('long', 'Long (' + mots + ' mots) : raccourcis', false);
  const w = txlWords(corps), seen = {}; w.filter(x => x.length >= 6).forEach(x => seen[x] = (seen[x] || 0) + 1);
  const rep = Object.entries(seen).filter(([, n]) => n >= 3).map(([k]) => k).slice(0, 2); if(rep.length) add('repete', 'Mot répété : ' + rep.join(', '), false);
  if(mots >= 6 && !/\b\d|[A-ZÀ-Ý][a-zà-ÿ]{2,}/.test(corps.replace(/^\s*\S+/, ''))) add('vague', 'Aucun détail précis (prénom, lieu, tenue, chiffre) : ça pourrait aller sur n\'importe quelle photo', false);
  // Description de photo : pas de voix personnelle, phrases en -ant, mots poétiques vagues
  const libre = txlClean(t).split('\n').filter((l, i) => i > 0 && !/^\s*(#|©|📍)/.test(l) && !TXL_CTA.test(l)).join(' ');
  const mL = txlWords(libre).length;
  if(canal !== 'tiktok' && mL >= 18 && !/\b(je|j|moi|mon|ma|mes|nous|notre|tu|toi|ton|ta|tes|vous|votre|vos)\b/i.test(txlNorm(libre).replace(/\b(j) /g, '$1 '))) add('voix', "Aucune voix personnelle : ça se lit comme la description d'une photo. Parle en « je » (ce que tu as vécu) ou à « tu »", true, 30);
  const ger = (libre.match(/\b(?:cr[ée]ant|rappelant|offrant|r[ée]v[ée]lant|laissant|mettant en valeur|invitant|dégageant|d[ée]gageant|illustrant|incarnant|exprimant|t[ée]moignant|sublimant)\b/gi) || []); if(ger.length >= 1) add('gerondif', 'Tournure de texte automatique : « ' + ger[0].toLowerCase() + ' »', ger.length >= 2, 14 * ger.length);
  const poe = (libre.match(/\b(?:ambiance|l[ée]g[èe]ret[ée]|d[ée]licatesse|[ée]l[ée]gance|authenticit[ée]|complicit[ée]|essence|[ée]clat|harmonie|spontan[ée]it[ée]|sensibilit[ée]|raffinement|tendresse|sérénité|s[ée]r[ée]nit[ée]|insouciance|espi[èe]gle|d[ée]contract[ée]e?)\b/gi) || []); if(poe.length >= 2) add('poesie', 'Mots vagues et poétiques : ' + [...new Set(poe.map(x => x.toLowerCase()))].slice(0, 3).join(', '), true, 22);
  if(/\bv[êe]tue?\s+d[''’]une?\b|\ba\s+laiss[ée]\s+son\s+regard|\bregard\s+(?:balayer|perdu|rêveur|reveur)|clin\s+d[''’]œil\s+espi[èe]gle|\bun\s+rire\s+spontan[ée]\s+a\s+[ée]clat[ée]/i.test(libre)) add('cliche2', 'Description de photo façon IA (« vêtue d\'une… », « un rire spontané a éclaté »)', true, 22);
  const score = Math.max(0, 100 - out.reduce((a, x) => a + (x.pts || (x.grave ? 25 : 12)), 0));
  return { score, issues: out };
}
// Audit de tout un lot (compare aussi les reseaux entre eux)
function txtAuditLot(textes, canaux){
  const res = {}; const noms = {}; (canaux || []).forEach(([c, n]) => noms[c] = n);
  const ids = Object.keys(textes || {});
  ids.forEach((c, i) => {
    const autres = ids.slice(0, i).filter(x => (c === 'whatsapp' || x === 'whatsapp' || c === 'tiktok' || x === 'tiktok') ? false : true).map(x => ({ texte: (textes[x] || {}).texte, nom: noms[x] || x }));
    res[c] = txtAudit((textes[c] || {}).texte, c, autres);
  });
  return res;
}
// Consigne de variation pour l'IA (gratuit : calculee ici)
function txtExtraPrompt(){
  const L = [];
  try { if(typeof mkVaria === 'function') L.push(mkVaria()); } catch(e){}
  try { if(typeof mkDejaEcrit === 'function'){ const x = mkDejaEcrit(); if(x) L.push(x); } } catch(e){}
  L.push('RÈGLE D\'ÉCRITURE : texte humain, comme une vraie personne de Bouaké qui parle de son travail, pas comme une publicité. Au moins UN détail précis tiré de la séance (tenue, lieu, geste, moment). Pas plus de 2 points d\'exclamation. Chaque réseau a sa propre manière de dire, jamais la même phrase recopiée. Formules interdites : « immortaliser », « moments précieux / inoubliables / magiques », « souvenirs inoubliables », « n\'hésitez pas », « découvrez », « chaque instant », « capturer la magie », « rêve devenu réalité », « pur bonheur ».');
  return L.join('\n');
}
// Consigne de correction pour un texte precis
function txtFixConsigne(canal){
  try {
    const T = (typeof ST !== 'undefined' && ST.textes && ST.textes[canal]) || null; if(!T) return '';
    const a = txtAudit(T.texte, canal, []); if(!a.issues.length) return 'RÉÉCRIS pour que ça sonne plus humain et plus précis.';
    return 'CORRIGE CES DÉFAUTS (repérés par l\'app) : ' + a.issues.map(x => x.msg).join(' ; ') + '. Garde le sens et les faits, change la façon de dire.';
  } catch(e){ return ''; }
}
// Pastille sous un texte du studio
function txtBadgeHtml(canal, audit){
  const a = audit || txtAudit(((typeof ST !== 'undefined' && ST.textes[canal]) || {}).texte, canal, []);
  const e = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  if(!a.issues.length) return `<div class="txl ok"><b>Contrôle : bon</b> <span>Pas de formule toute faite, pas de répétition.</span></div>`;
  return `<div class="txl ${a.score < 60 ? 'bad' : 'warn'}"><b>Contrôle : ${a.score < 60 ? 'à refaire' : 'à améliorer'}</b><ul>${a.issues.map(x => `<li>${e(x.msg)}</li>`).join('')}</ul>
    <button onclick="stRefaire('${canal}','fix')">Corriger ces défauts</button></div>`;
}
(function txlCss(){
  if(document.getElementById('txlCss')) return;
  const s = document.createElement('style'); s.id = 'txlCss';
  s.textContent = `.txl{border-radius:10px;padding:8px 10px;margin:8px 0 2px;font-size:12px;line-height:1.4;background:rgba(255,255,255,.05);border-left:3px solid #7ee2a8}
  .txl b{font-size:12px}.txl span{opacity:.7}.txl ul{margin:4px 0 6px;padding-left:16px}.txl.warn{border-left-color:#f5c04e}.txl.bad{border-left-color:#ff6b5e}
  .txl button{border:1px solid rgba(255,255,255,.2);background:transparent;color:inherit;border-radius:8px;padding:5px 9px;font-size:12px;cursor:pointer}`;
  document.head.appendChild(s);
})();
Object.assign(window, { txtAudit, txtAuditLot, txtExtraPrompt, txtFixConsigne, txtBadgeHtml });

// ============================================================
// BIBLIOTHEQUE DE MES TEXTES : anciens textes colles ou lus sur une capture, textes que j'aime.
//   Extraction locale (aucune IA) : hashtags, numeros WhatsApp, appels a reserver, signature, emojis, longueur.
//   Les meilleurs textes servent d'EXEMPLES REELS a l'IA : elle ecrit comme Henzo, pas comme une pub.
// ============================================================
const TXB = { saisie: '', analyse: null, busy: '' };
const txbEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TXL_CTA = /r[ée]serv|[ée]cri[sv]|contact|message|inbox|whats?app|appel|\bdm\b|rendez-vous|prends?\s+(?:ta|ton|rdv)|commande|devis|lien en bio|cliqu/i;
const TXB_APPEL = /r[ée]serv|[ée]cri[sv]|contact|message|inbox|whats?app|appel|\bdm\b|rendez-vous|prends?\s+(?:ta|ton|rdv)|commande|devis|lien en bio|cliqu|disponible|places?\s+(?:limit|restant)/i;
function txbFmtTel(d){
  d = String(d).replace(/\D/g, ''); if(d.startsWith('225') && d.length >= 12) d = d.slice(3);
  return d.length === 10 ? d.replace(/(\d{2})(?=\d)/g, '$1 ').trim() : d;
}
// Extrait ce qu'il y a d'utile dans un ou plusieurs textes
function txtExtraire(textes){
  const L = (Array.isArray(textes) ? textes : [textes]).map(t => txlClean(t).trim()).filter(Boolean);
  const tags = {}, tels = {}, appels = {}, emojis = {}, credits = {}, mentions = {}; let nEmo = 0, mots = 0, lieu = '', copyright = '', tutoie = 0, vouvoie = 0;
  L.forEach(t => {
    (t.match(/#[\p{L}\p{N}_]{2,}/gu) || []).forEach(h => { const k = h.toLowerCase(); tags[k] = tags[k] || { h, n: 0 }; tags[k].n++; });
    (t.match(/\+?\d[\d\s.\-]{7,16}\d/g) || []).forEach(x => { const d = x.replace(/\D/g, ''); const ok = (d.length === 10 && d[0] === '0') || (d.length >= 12 && d.length <= 13 && d.startsWith('225')) || d.length === 8;
      if(ok){ const f = txbFmtTel(d); tels[f] = (tels[f] || 0) + 1; } });
    (t.match(/@[\p{L}\p{N}_.]{2,}/gu) || []).forEach(m => { mentions[m] = (mentions[m] || 0) + 1; });
    t.split('\n').map(l => l.trim()).filter(Boolean).forEach(l => {
      if(/^(#\S+\s*)+$/u.test(l)) return;
      if(/^\s*(?:©|\(c\)|photo\s*©|copyright)/i.test(l)){ copyright = copyright || l; return; }
      if(/📍/.test(l)){ lieu = lieu || l.replace(/📍/g, '').trim(); }
      const m = l.match(/^([A-Za-zÀ-ÿ' -]{3,24})\s*:\s*(.{2,60})$/); if(m && /maquill|coiff|tenue|robe|d[ée]co|mod[eè]le|assistant|retouche|photo|styl|bijou|ongle|fleur|g[aâ]teau|organis/i.test(m[1])) credits[l] = (credits[l] || 0) + 1;
      if(TXB_APPEL.test(l) && l.length < 160 && !/^\W*#/.test(l)){ const c = l.replace(/^[^\p{L}\p{N}]+/u, '').replace(/[^\p{L}\p{N}]+$/u, '').trim(); if(c) appels[c] = (appels[c] || 0) + 1; }
    });
    const em = (t.match(/\p{Extended_Pictographic}/gu) || []).filter(e => !/[©®™]/.test(e)); nEmo += em.length; em.forEach(e => { emojis[e] = (emojis[e] || 0) + 1; });
    mots += txlWords(t).length;
    if(/\b(tu|ton|ta|tes|toi)\b/i.test(t)) tutoie++; if(/\b(vous|votre|vos)\b/i.test(t)) vouvoie++;
  });
  const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(x => x[0]);
  const n = Math.max(1, L.length);
  return {
    n: L.length, mots: Math.round(mots / n), emojisParTexte: Math.round(nEmo / n * 10) / 10, emojisTop: top(emojis, 6),
    hashtags: Object.values(tags).sort((a, b) => b.n - a.n).map(x => x.h), tels: top(tels, 3), appels: top(appels, 4), credits: top(credits, 4), mentions: top(mentions, 6),
    lieu, copyright, adresse: tutoie > vouvoie ? 'tutoie' : vouvoie > tutoie ? 'vouvoie' : ''
  };
}
// ---------- Bibliotheque (gardee dans Ma marque) ----------
function txtBiblio(){ const m = (typeof stM === 'function' ? stM() : window.ST_MARQUE) || {}; return Array.isArray(m.biblio) ? m.biblio : []; }
function txbSim(a, b){ const A = txlGrams(a, 3), B = txlGrams(b, 3); if(!A.size || !B.size) return 0; let c = 0; A.forEach(x => { if(B.has(x)) c++; }); return c / (A.size + B.size - c); }
function txbMerge(list, add){
  const out = list.slice();
  add.forEach(e => { const t = String(e.t || '').trim(); if(t.length < 25) return;
    const i = out.findIndex(x => txbSim(x.t, t) >= 0.8), pr = { aime: 3, publie: 2, ancien: 1 };
    if(i >= 0){ if((pr[e.src] || 1) > (pr[out[i].src] || 1)) out[i].src = e.src; if(e.src !== 'ancien') out[i].t = t.slice(0, 1400); return; }
    out.push({ t: t.slice(0, 1400), src: e.src || 'ancien', canal: e.canal || '', d: new Date().toISOString().slice(0, 10) }); });
  return out.slice(-40);
}
// Appelee quand Henzo touche "J'aime" sur un texte (studio ou chat)
async function txtAimer(texte, canal, avis, src){
  try {
    if(avis !== 'oui' || typeof stSauverMarque !== 'function') return;
    const m = (typeof stM === 'function' ? stM() : window.ST_MARQUE) || {};
    const biblio = txbMerge(Array.isArray(m.biblio) ? m.biblio : [], [{ t: txlClean(texte), src: src || 'aime', canal }]);
    if(biblio.length === (m.biblio || []).length && biblio.every((x, i) => x.t === (m.biblio[i] || {}).t && x.src === (m.biblio[i] || {}).src)) return;
    await stSauverMarque({ biblio });
  } catch(e){ console.warn('biblio', e); }
}
// Exemples reels envoyes a l'IA (les textes aimes d'abord, puis les plus recents)
function txtExemplesPrompt(canal){
  const PR = { aime: 3, publie: 2, ancien: 1 };
  const b = txtBiblio().slice().sort((a, c) => (PR[c.src] || 1) - (PR[a.src] || 1) || String(c.d).localeCompare(String(a.d)));
  const pick = []; const mem = (arr) => arr.forEach(x => { if(pick.length < 4 && !pick.includes(x)) pick.push(x); });
  mem(b.filter(x => canal && x.canal === canal)); mem(b);
  if(!pick.length) return '';
  return 'EXEMPLES RÉELS DE SES TEXTES (c\'est sa vraie façon d\'écrire : imite le ton, le rythme, la longueur, la façon de commencer et de finir, SANS recopier de phrases ni de détails de ces séances) :\n' + pick.map((x, i) => `--- Exemple ${i + 1}${x.src === 'aime' ? ' (qu\'il a aimé)' : x.src === 'publie' ? ' (qu\'il a publié)' : ''} ---\n${txlClean(x.t).slice(0, 700)}`).join('\n');
}
(function(){ const o = txtExtraPrompt; window.txtExtraPrompt = function(canal){
  const ex = txtExemplesPrompt(canal);
  const cx = typeof window.ctxPrompt === 'function' ? window.ctxPrompt() : '';
  return (cx ? cx + '\n' : '') + (ex ? ex + '\n' : '') + o() + '\nIMPORTANT : "emotion" et "detail" doivent se lire comme UN seul texte fluide, naturel, qui se suit, sans répéter ni ressembler à un formulaire.'; }; })();

// ---------- Ecran dans Ma marque ----------
function txbMarque(){ return (typeof ST !== 'undefined' && ST.m) ? ST.m : ((typeof stM === 'function') ? stM() : {}); }
function txbCardHtml(){ return `<div class="st-card" id="txbBox">${txbInner()}</div>`; }
function txbRender(){ const b = document.getElementById('txbBox'); if(b) b.innerHTML = txbInner(); else if(typeof stRefresh === 'function') stRefresh(); }
function txbInner(){
  const m = txbMarque(), b = Array.isArray(m.biblio) ? m.biblio : [], A = TXB.analyse;
  const chk = (id, on, label) => `<label class="txb-ck"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}> <span>${label}</span></label>`;
  const tag = h => `<span class="txb-t">${txbEsc(h)}</span>`;
  let res = '';
  if(A){
    const X = A.x;
    res = `<div class="txb-res"><b>Ce que j'ai trouvé dans ${X.n} texte${X.n > 1 ? 's' : ''}</b>
      <div class="txb-line"><span>Style</span><em>${X.mots} mots en moyenne · ${X.emojisParTexte} emoji(s) par texte${X.emojisTop.length ? ' (' + X.emojisTop.map(txbEsc).join(' ') + ')' : ''}${X.adresse ? ' · tu ' + (X.adresse === 'tutoie' ? 'tutoies' : 'vouvoies') : ''}</em></div>
      ${X.hashtags.length ? `<div class="txb-line"><span>Hashtags</span><div>${X.hashtags.slice(0, 14).map(tag).join('')}</div></div>${chk('txbTags', true, 'Ajouter ces hashtags à mes hashtags habituels')}` : ''}
      ${X.tels.length ? `<div class="txb-line"><span>WhatsApp</span><em>${X.tels.map(txbEsc).join(' · ')}</em></div>${chk('txbTel', true, 'Utiliser <b>' + txbEsc(X.tels[0]) + '</b> comme contact WhatsApp')}` : ''}
      ${X.appels.length ? `<div class="txb-line"><span>Appel à réserver</span></div>${X.appels.map((a, i) => `<label class="txb-ck"><input type="radio" name="txbAppel" value="${i}" ${i === 0 ? 'checked' : ''}> <span>${txbEsc(a)}</span></label>`).join('')}<label class="txb-ck"><input type="radio" name="txbAppel" value="-1"> <span>Ne pas changer ma phrase de fin</span></label>` : ''}
      ${X.lieu ? `<div class="txb-line"><span>Lieu</span><em>${txbEsc(X.lieu)}</em></div>${chk('txbLieu', true, 'Utiliser comme lieu')}` : ''}
      ${X.copyright ? `<div class="txb-line"><span>Signature</span><em>${txbEsc(X.copyright)}</em></div>${chk('txbCopy', true, 'Utiliser comme ligne de copyright')}` : ''}
      ${X.credits.length || X.mentions.length ? `<div class="txb-line"><span>Crédits</span><em>${[...X.credits, ...X.mentions].map(txbEsc).join(' · ')}</em></div>` : ''}
      ${chk('txbEmo', true, 'Régler mes emojis sur « ' + ({ aucun: 'aucun', peu: 'un peu', beaucoup: 'beaucoup' }[X.emojisParTexte === 0 ? 'aucun' : X.emojisParTexte <= 3 ? 'peu' : 'beaucoup']) + ' »')}
      <button class="btn-primary" style="width:100%;margin-top:10px" onclick="txbAppliquer()">Ajouter à ma bibliothèque et appliquer</button></div>`;
  }
  return `<h3>${typeof agIcon === 'function' ? agIcon('note', 18) : ''} Mes anciens textes</h3>
    <p>Colle une ou plusieurs anciennes légendes (sépare-les par une ligne <b>---</b>), ou lis-les depuis une capture d'écran. L'app en sort tes hashtags, ton numéro WhatsApp, tes appels à réserver, ta signature et ton style, puis s'en sert pour <b>écrire comme toi</b>.</p>
    <textarea id="txbIn" rows="6" placeholder="Colle ici une ancienne publication..." oninput="TXB.saisie=this.value">${txbEsc(TXB.saisie)}</textarea>
    <div class="txb-btns"><button class="btn-secondary" onclick="txbOcr()" ${TXB.busy ? 'disabled' : ''}>${TXB.busy === 'ocr' ? 'Lecture de la capture...' : 'Lire une capture d\'écran'}</button>
      <button class="btn-primary" onclick="txbAnalyser()" ${TXB.busy ? 'disabled' : ''}>Analyser</button></div>
    ${res}
    <div class="st-sep" style="margin-top:14px">Ma bibliothèque (${b.length})</div>
    ${b.length ? `<div class="txb-lib">${b.slice().reverse().map((x, ri) => { const i = b.length - 1 - ri; const first = txlClean(x.t).split('\n').find(l => l.trim()) || '';
      return `<div class="txb-it"><span class="txb-s ${x.src === 'aime' || x.src === 'publie' ? 'ok' : ''}">${x.src === 'aime' ? 'Aimé' : x.src === 'publie' ? 'Publié' : 'Ancien'}</span><div>${txbEsc(first.slice(0, 90))}<small>${txbEsc(txlClean(x.t).replace(/\s+/g, ' ').slice(0, 130))}</small></div><button aria-label="Retirer" onclick="txbDel(${i})">×</button></div>`; }).join('')}</div>`
      : `<div class="ag-hint" style="margin:0">Vide pour le moment. Les textes que tu aimes dans le studio s'ajoutent ici tout seuls.</div>`}
    <div class="ag-hint">Pense à toucher « Enregistrer ma marque » en bas si tu retires un texte.</div>`;
}
function txbAnalyser(){
  const el = document.getElementById('txbIn'); if(el) TXB.saisie = el.value;
  const parts = String(TXB.saisie || '').split(/\n\s*-{3,}\s*\n/).map(x => x.trim()).filter(x => x.length >= 25);
  if(!parts.length){ if(typeof agToast === 'function') agToast('Colle au moins un texte', 'error'); return; }
  TXB.analyse = { x: txtExtraire(parts), parts };
  txbRender();
}
function txbAppliquer(){
  const A = TXB.analyse; if(!A || !ST.m) return; const X = A.x, m = ST.m, on = id => { const e = document.getElementById(id); return !!(e && e.checked); };
  if(on('txbTags') && X.hashtags.length){
    const have = new Set((m.hashtags_fixes || '').split(/\s+/).map(x => x.toLowerCase()).filter(Boolean));
    const add = X.hashtags.filter(h => !have.has(h.toLowerCase())).slice(0, 8);
    m.hashtags_fixes = [m.hashtags_fixes || '', ...add].join(' ').replace(/\s+/g, ' ').trim();
  }
  if(on('txbTel') && X.tels[0]) m.contact = 'WhatsApp ' + X.tels[0];
  const r = document.querySelector('input[name="txbAppel"]:checked'); if(r && Number(r.value) >= 0 && X.appels[Number(r.value)]){ m.fin = X.appels[Number(r.value)];
    // Si la phrase de fin contient deja le numéro, inutile de le répéter en contact
    if(X.tels[0] && String(m.fin).replace(/\D/g, '').includes(String(X.tels[0]).replace(/\D/g, '').slice(-8))) m.contact = ''; }
  if(on('txbLieu') && X.lieu) m.lieu = X.lieu;
  if(on('txbCopy') && X.copyright){ m.copyright = Object.assign({ on: true, style: 'leger' }, m.copyright || {}, { texte: X.copyright.replace(/^\s*\(c\)/i, '©') }); }
  if(on('txbEmo')) m.emojis = X.emojisParTexte === 0 ? 'aucun' : X.emojisParTexte <= 3 ? 'peu' : 'beaucoup';
  m.biblio = txbMerge(Array.isArray(m.biblio) ? m.biblio : [], A.parts.map(t => ({ t, src: 'ancien' })));
  TXB.analyse = null; TXB.saisie = '';
  if(typeof agCloseSheet === 'function') agCloseSheet('txb');
  if(typeof stMarqueSave === 'function') stMarqueSave();
}
function txbDel(i){ const m = txbMarque(); if(Array.isArray(m.biblio)){ m.biblio.splice(i, 1); txbRender(); } }
function txbCharger(src){ return new Promise((ok, ko) => { if(window.LecteurOCR) return ok(); const s = document.createElement('script'); s.src = src; s.onload = () => (window.LecteurOCR ? ok() : ko(new Error('Lecteur non chargé'))); s.onerror = () => ko(new Error('Lecteur de texte indisponible')); document.body.appendChild(s); }); }
function txbOcr(){
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true; inp.style.display = 'none';
  inp.onchange = async () => {
    const files = [...inp.files].slice(0, 6); inp.remove(); if(!files.length) return;
    TXB.busy = 'ocr'; txbRender();
    const out = []; let faible = false;
    try {
      await txbCharger('lecteur-ocr.js?v=1');
      for(const f of files){ const r = await window.LecteurOCR.lire(f, {}); const t = String(r.texte || '').trim(); if(t){ out.push(t); if(r.confiance < 60) faible = true; } }
    } catch(e){ if(typeof agAlert === 'function') agAlert('Lecture impossible : ' + (e.message || e)); }
    TXB.busy = '';
    if(out.length){ TXB.saisie = [TXB.saisie, ...out].filter(Boolean).join('\n---\n'); if(typeof agToast === 'function') agToast(faible ? 'Texte lu, vérifie-le avant d\'analyser' : 'Texte lu : vérifie puis touche Analyser'); }
    else if(typeof agToast === 'function') agToast("Je n'ai trouvé aucun texte sur cette image", 'error');
    txbRender();
  };
  document.body.appendChild(inp); inp.click();
}
(function(){
  if(document.getElementById('txbCss')) return;
  const s = document.createElement('style'); s.id = 'txbCss';
  s.textContent = `.txb-btns{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}.txb-btns button{flex:1 1 140px}
  .txb-res{margin-top:12px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.05);font-size:13px}.txb-line{display:flex;flex-direction:column;gap:3px;margin:8px 0 2px}.txb-line span{opacity:.65;font-size:12px}.txb-line em{font-style:normal}
  .txb-t{display:inline-block;margin:0 4px 4px 0;padding:2px 8px;border-radius:99px;background:rgba(255,255,255,.1);font-size:12px}
  .txb-ck{display:flex;gap:8px;align-items:flex-start;margin:4px 0;font-size:13px}.txb-ck input{margin-top:2px;flex:none;width:auto}
  .txb-lib{display:flex;flex-direction:column;gap:6px;margin-top:6px}.txb-it{display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.05);font-size:13px}
  .txb-it>div{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.txb-it small{opacity:.65;font-size:11px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
  .txb-it button{border:0;background:none;color:inherit;opacity:.55;font-size:20px;line-height:1;cursor:pointer;width:auto}.txb-s{flex:none;font-size:11px;padding:2px 7px;border-radius:99px;background:rgba(255,255,255,.1)}.txb-s.ok{background:#7ee2a8;color:#04210f}`;
  document.head.appendChild(s);
})();
Object.assign(window, { TXB, txtExtraire, txtBiblio, txtAimer, txtExemplesPrompt, txbCardHtml, txbAnalyser, txbAppliquer, txbDel, txbOcr });

// ---------- Acces direct depuis le studio (sans passer par Ma marque) ----------
async function txbOuvrir(){
  try { if(typeof stChargerMarque === 'function') await stChargerMarque(); } catch(e){}
  if(typeof ST !== 'undefined' && typeof stMarqueFusion === 'function') ST.m = JSON.parse(JSON.stringify(stMarqueFusion(window.ST_MARQUE)));   // toujours la version a jour
  TXB.analyse = null;
  if(typeof agSheet === 'function') agSheet('txb', `<div id="txbBox">${txbInner()}</div>`);
}
function txbBandeau(){
  const n = txtBiblio().length;
  return `<div class="txb-bd"><span>${n ? `Je m'inspire de <b>${n}</b> de tes textes.` : `Je n'ai encore aucun de tes textes pour m'inspirer.`}</span><button onclick="txbOuvrir()">${n ? 'Ajouter mes textes' : 'Ajouter mes anciens textes'}</button>${typeof window.ctxOuvrir === 'function' ? `<button onclick="ctxOuvrir()">Mon contexte (${window.ctxCount()}/${window.ctxTotal()})</button>` : ''}</div>`;
}
(function(){ const st = document.getElementById('txbCss'); if(st) st.textContent += `.txb-bd{display:flex;flex-wrap:wrap;gap:8px 10px;align-items:center;margin-top:8px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.05);font-size:12px}.txb-bd span{flex:1 1 100%;min-width:0}.txb-bd button{flex:none;width:auto!important;white-space:nowrap;border:1px solid rgba(255,255,255,.2);background:transparent;color:inherit;border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer}`; })();
// ---------- Variation : angles et tons qui changent VRAIMENT la facon d'ecrire ----------
const TXV_ANGLES = [
  ['anecdote', "Raconte un tout petit moment de la séance (un rire, un trac, une surprise) comme une anecdote, à la première personne (« j'ai… »), sans décrire la tenue."],
  ['question', "Commence par une question franche adressée au lecteur, puis réponds en deux phrases courtes."],
  ['coulisses', "Parle du travail derrière la photo : comment tu as placé la lumière, ce que tu as demandé à la personne, ce que tu cherchais. Voix de photographe qui parle de son métier."],
  ['phrase choc', "Commence par une phrase de 5 mots maximum, forte, puis UN seul paragraphe court."],
  ['merci', "Remercie la personne ou dis ce qu'elle t'a apporté, sincèrement, sans superlatifs ni adjectifs ronflants."],
  ['détail', "Pars d'UN détail précis vu sur les photos (un geste, un objet, un regard) et construis tout le texte autour de lui."],
  ['conseil', "Donne un petit conseil utile pour se préparer à une séance photo, en partant de cette séance."]
];
const TXV_TONS = {
  court: "25 mots maximum AU TOTAL, une seule idée, aucun paragraphe de détail, aucune description de tenue.",
  emotion: "Raconte un ressenti VÉCU, à la première personne, avec une phrase très courte pour finir. Interdit de décrire la tenue ou le décor.",
  pro: "Sobre et professionnel : une accroche nette, puis deux phrases sur le travail (lumière, direction, retouche). Aucun émoji, aucune exclamation, aucune image poétique."
};
function txtVariationConsigne(canal, ton){
  const base = "INTERDIT de reprendre la structure, l'accroche ou plus de 3 mots de suite de la version actuelle. Pas de description de photo façon légende de magazine (« vêtue de », « créant une ambiance », « rappelant »). Une vraie personne parle : phrases de longueurs différentes, un détail précis, une voix (« je » ou « tu »).";
  let ang = '';
  if(ton && TXV_TONS[ton]) ang = 'TON DEMANDÉ : ' + TXV_TONS[ton];
  else if(!ton || ton === 'fix'){
    ST.angles = ST.angles || {}; const dej = ST.angles[canal] = ST.angles[canal] || [];
    let rest = TXV_ANGLES.filter(a => !dej.includes(a[0])); if(!rest.length){ ST.angles[canal] = []; rest = TXV_ANGLES.slice(); }
    const a = rest[Math.floor(Math.random() * rest.length)]; ST.angles[canal].push(a[0]); ST.dernierAngle = a[0];
    ang = 'ANGLE À SUIVRE (' + a[0] + ') : ' + a[1];
  }
  return ang + '\n' + base + (ST.retry ? '\nATTENTION : ta proposition précédente ressemblait encore trop à l\'ancienne. Recommence avec une accroche, une structure et un vocabulaire COMPLÈTEMENT différents.' : '');
}
function txtChamps(x){ return Object.values(x || {}).filter(v => typeof v === 'string').join(' ').replace(/\s+/g, ' '); }
function txtTropProche(avant, apres){
  const a = typeof avant === 'string' ? avant : txtChamps(avant), b = typeof apres === 'string' ? apres : txtChamps(apres);
  if(!a || !b) return false;
  const da = txlWords(a).slice(0, 3).join(' '), db = txlWords(b).slice(0, 3).join(' ');
  return txbSim(a, b) >= 0.22 || (da && da === db);
}
// Plusieurs textes publies d'un coup : une seule sauvegarde (sinon ils s'ecraseraient)
async function txtValiderLot(items){
  try {
    if(typeof stSauverMarque !== 'function') return;
    const m = (typeof stM === 'function' ? stM() : window.ST_MARQUE) || {};
    const biblio = txbMerge(Array.isArray(m.biblio) ? m.biblio : [], (items || []).map(x => ({ t: txlClean(x.t), src: 'publie', canal: x.c })));
    await stSauverMarque({ biblio });
  } catch(e){ console.warn('biblio lot', e); }
}
Object.assign(window, { txbOuvrir, txbBandeau, txbRender, txtVariationConsigne, txtTropProche, txtValiderLot, txtValider: (t, c) => txtAimer(t, c, 'oui', 'publie') });


// ============================================================
// RETOUCHES : comparer MA version et la proposition de l'IA (aucune IA), et en tirer des gouts
// ============================================================
const TXD_STOP = new Set('avec dans pour mais plus tout tous cette cette elle elles nous vous leur leurs sont etait etre avoir fait faire comme sans sous chez very votre notre entre alors aussi encore quand dont donc depuis apres avant comme leurs celle celui cela ceux mes tes ses mon ton son nos vos'.split(' '));
function txdTok(t){ return (String(t || '').replace(/[#@][\p{L}\p{N}_]+/gu, ' ').match(/[\p{L}\p{N}'’-]+/gu) || []); }
// Mots remplaces / ajoutes / retires entre la proposition et la version de Henzo
function txtDiffMots(a, b){
  const A = txdTok(a), B = txdTok(b), n = A.length, m = B.length, out = { remplace: [], ajoute: [], retire: [] };
  if(!n || !m || n * m > 160000) return out;
  const na = A.map(txlNorm), nb = B.map(txlNorm), W = m + 1, dp = new Int16Array((n + 1) * W);
  for(let i = n - 1; i >= 0; i--) for(let j = m - 1; j >= 0; j--) dp[i * W + j] = na[i] === nb[j] ? dp[(i + 1) * W + j + 1] + 1 : Math.max(dp[(i + 1) * W + j], dp[i * W + j + 1]);
  let i = 0, j = 0, del = [], add = [];
  const flush = () => { if(del.length && add.length) out.remplace.push([del.join(' '), add.join(' ')]); else if(del.length) out.retire.push(del.join(' ')); else if(add.length) out.ajoute.push(add.join(' ')); del = []; add = []; };
  while(i < n || j < m){
    if(i < n && j < m && na[i] === nb[j]){ flush(); i++; j++; }
    else if(j < m && (i >= n || dp[i * W + j + 1] >= dp[(i + 1) * W + j])){ add.push(B[j]); j++; }
    else { del.push(A[i]); i++; }
  }
  flush();
  return out;
}
function txdDiffTexte(d){
  const q = x => '« ' + x + ' »';
  const L = [];
  d.remplace.slice(0, 12).forEach(([o, n]) => L.push('remplacé ' + q(o) + ' par ' + q(n)));
  d.ajoute.slice(0, 8).forEach(x => L.push('ajouté ' + q(x)));
  d.retire.slice(0, 8).forEach(x => L.push('retiré ' + q(x)));
  return L.join(' ; ');
}
// Goûts appris des retouches : mots qu'il remplace (à éviter) et mots qu'il choisit (à préférer)
let txdTimer = null;
function txtApprendreRetouches(prop, fin){
  try {
    const d = txtDiffMots(txlClean(prop), txlClean(fin)); if(!d.remplace.length && !d.retire.length) return d;
    const m = (typeof stM === 'function' ? stM() : window.ST_MARQUE) || {};
    const mots = m.mots && typeof m.mots === 'object' ? JSON.parse(JSON.stringify(m.mots)) : {};
    mots.evite = mots.evite || {}; mots.prefere = mots.prefere || {};
    const bon = w => w.length >= 4 && !TXD_STOP.has(txlNorm(w));
    d.remplace.forEach(([o, n]) => {
      if(o.split(' ').length > 2) return;   // on apprend des mots, pas des phrases entieres
      o.split(' ').filter(bon).forEach(w => { const k = w.toLowerCase(); mots.evite[k] = (mots.evite[k] || 0) + 1; });
      n.split(' ').filter(bon).forEach(w => { const k = w.toLowerCase(); mots.prefere[k] = (mots.prefere[k] || 0) + 1; });
    });
    d.retire.forEach(w => { if(w.split(' ').length <= 2) w.split(' ').filter(bon).forEach(x => { const k = x.toLowerCase(); mots.evite[k] = (mots.evite[k] || 0) + 1; }); });
    const cap = o => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 40));
    mots.evite = cap(mots.evite); mots.prefere = cap(mots.prefere);
    if(window.ST_MARQUE) window.ST_MARQUE.mots = mots;
    clearTimeout(txdTimer); txdTimer = setTimeout(() => { if(typeof stSauverMarque === 'function') stSauverMarque({ mots }); }, 1500);
    return d;
  } catch(e){ console.warn('retouches', e); return null; }
}
function txtMots(){ const m = (typeof stM === 'function' ? stM() : window.ST_MARQUE) || {}; const o = m.mots || {}; return { evite: Object.keys(o.evite || {}), prefere: Object.keys(o.prefere || {}) }; }
// Profil de gouts calcule sur ses textes (aucune IA)
function txtProfil(){
  const b = txtBiblio(); const L = [];
  if(b.length >= 2){
    const x = txtExtraire(b.map(e => e.t));
    L.push(`longueur habituelle : environ ${x.mots} mots ; emojis : ${x.emojisParTexte <= 0.5 ? 'presque jamais' : x.emojisParTexte <= 3 ? 'quelques-uns' : 'beaucoup'}${x.adresse ? ' ; il ' + (x.adresse === 'tutoie' ? 'tutoie' : 'vouvoie') + ' ses lecteurs' : ''}`);
    const cnt = {}; b.forEach(e => new Set(txlWords(txlCorps(e.t) || e.t).filter(w => w.length >= 5 && !TXD_STOP.has(w))).forEach(w => { cnt[w] = (cnt[w] || 0) + 1; }));
    const fav = Object.entries(cnt).filter(([, n]) => n >= 2).sort((a, c) => c[1] - a[1]).slice(0, 8).map(e => e[0]);
    if(fav.length) L.push('mots qu\'il emploie souvent : ' + fav.join(', '));
  }
  const mo = txtMots();
  if(mo.evite.length) L.push('mots qu\'il remplace ou retire (à éviter) : ' + mo.evite.slice(0, 12).join(', '));
  if(mo.prefere.length) L.push('mots qu\'il choisit à la place : ' + mo.prefere.slice(0, 12).join(', '));
  return L;
}
(function(){ const o = window.txtExtraPrompt; window.txtExtraPrompt = function(canal){ const base = o(canal), pr = txtProfil();
  return base + (pr.length ? '\nSON PROFIL (calculé sur ses vrais textes et ses retouches, il est PRIORITAIRE) :\n- ' + pr.join('\n- ') : ''); }; })();
// L'audit connait maintenant les mots qu'il a deja rejetes
(function(){ const o = window.txtAudit; window.txtAudit = function(texte, canal, autres){
  const a = o(texte, canal, autres), mo = txtMots(); if(!mo.evite.length) return a;
  const w = new Set(txlWords(txlClean(texte))); const hit = mo.evite.filter(x => w.has(txlNorm(x)));
  if(hit.length){ a.issues.push({ k: 'rejete', msg: 'Mot(s) que tu as déjà remplacé(s) : ' + hit.slice(0, 3).join(', '), grave: false, pts: 14 }); a.score = Math.max(0, a.score - 14); }
  return a; }; })();
Object.assign(window, { txtDiffMots, txdDiffTexte, txtApprendreRetouches, txtMots, txtProfil });

// ============================================================
// VEILLE : analyse constante de mes publications (sur l'appareil, sans quota IA)
// ============================================================
function vlScore(p){ return typeof mkScore === 'function' ? mkScore(p) : 0; }
function vlTags(p){ return (String(p.hashtags || '').match(/#[\p{L}\p{N}_]{2,}/gu) || []).map(x => x.toLowerCase()); }
function vlFeat(c){
  const t = txlClean(c), mots = txlWords(t).length;
  return { 'une question': /\?/.test(t), 'un texte court (moins de 45 mots)': mots > 0 && mots < 45, 'des emojis': (t.match(/\p{Extended_Pictographic}/gu) || []).some(e => !/[©®™]/.test(e)),
    'le tutoiement': /\b(tu|ton|ta|tes|toi)\b/i.test(t), 'un appel à réserver': TXL_CTA.test(t) };
}
function txtVeille(){
  const out = []; if(typeof MK === 'undefined' || !MK.posts) return out;
  const today = new Date().toISOString().slice(0, 10), now = Date.now(), D = 864e5;
  const post = p => ({ id: p.id, t: (p.title || 'publication').slice(0, 40), d: p.date });
  const posts = MK.posts.filter(p => p.status !== 'annule' && p.caption);
  const aVenir = posts.filter(p => p.status === 'prevu' && p.date && p.date >= today).slice(0, 8);
  const publies = posts.filter(p => p.status === 'publie').sort((a, b) => String(b.published_at || b.date).localeCompare(String(a.published_at || a.date)));
  const action = p => (p.notes && typeof mkStudioNotes === 'function' && mkStudioNotes(p.notes)) ? { l: 'Ouvrir dans le studio', js: `stOuvrirPost(${p.id})` } : { l: 'Voir mon plan', js: `mkGo('plan')` };
  // 1. Textes prevus qui ont un probleme
  aVenir.forEach(p => { const a = txtAudit(p.caption, 'page', []); if(a.score < 70) out.push({ n: a.score < 50 ? 'bad' : 'warn', titre: `Le texte prévu ${typeof mkDayName === 'function' ? mkDayName(p.date).toLowerCase() : p.date} (« ${post(p).t} ») a un problème`, detail: a.issues.slice(0, 3).map(x => x.msg).join(' · '), act: action(p) }); });
  // 2. Hashtags
  const recents = posts.filter(p => p.status !== 'prevu' || p.date <= today).slice(0, 8);
  const trop = posts.filter(p => vlTags(p).length > 12).slice(0, 1);
  if(trop.length) out.push({ n: 'warn', titre: 'Trop de hashtags', detail: `« ${post(trop[0]).t} » en a ${vlTags(trop[0]).length}. Au-delà de 8 à 10, ça fait spam et ça ne rapporte pas plus.`, act: action(trop[0]) });
  const sets = recents.slice(0, 5).map(p => vlTags(p).sort().join(' ')).filter(Boolean);
  if(sets.length >= 4 && sets.filter(x => x === sets[0]).length >= 3) out.push({ n: 'warn', titre: 'Toujours les mêmes hashtags', detail: 'Tes dernières publications ont exactement le même bloc de hashtags. Change-en la moitié selon la séance.', act: { l: 'Ma marque', js: 'stMarqueOuvrir()' } });
  // 3. Resultats : ce qui marche ou pas (chiffres reels)
  const sc = publies.filter(p => typeof mkHasStats === 'function' && mkHasStats(p) && !(p.stats || {}).ignore);
  if(sc.length >= 6){
    const med = sc.map(vlScore).sort((a, b) => a - b)[Math.floor(sc.length / 2)] || 1;
    const tagPerf = {}; sc.forEach(p => new Set(vlTags(p)).forEach(h => { (tagPerf[h] = tagPerf[h] || []).push(vlScore(p)); }));
    Object.entries(tagPerf).filter(([, v]) => v.length >= 3 && v.length <= sc.length - 3).forEach(([h, v]) => {
      const avec = v.reduce((a, b) => a + b, 0) / v.length, rest = sc.filter(p => !vlTags(p).includes(h)).map(vlScore), sans = rest.reduce((a, b) => a + b, 0) / (rest.length || 1);
      if(sans > 0 && avec < sans * 0.55) out.push({ n: 'info', titre: `${h} semble peu efficace`, detail: `Les publications avec ce hashtag ont eu en moyenne ${Math.round(avec)} points contre ${Math.round(sans)} pour les autres.`, act: { l: 'Ma marque', js: 'stMarqueOuvrir()' } });
      else if(sans > 0 && avec > sans * 1.7) out.push({ n: 'good', titre: `${h} marche bien`, detail: `${Math.round(avec)} points en moyenne contre ${Math.round(sans)} sans lui. Garde-le.` });
    });
    const feats = {}; sc.forEach(p => { const f = vlFeat(p.caption); Object.entries(f).forEach(([k, v]) => { (feats[k] = feats[k] || { y: [], n: [] })[v ? 'y' : 'n'].push(vlScore(p)); }); });
    Object.entries(feats).filter(([, o]) => o.y.length >= 3 && o.n.length >= 3).forEach(([k, o]) => {
      const my = o.y.reduce((a, b) => a + b, 0) / o.y.length, mn = o.n.reduce((a, b) => a + b, 0) / o.n.length;
      if(mn > 0 && my >= mn * 1.6) out.push({ n: 'good', titre: `Tes publications avec ${k} marchent mieux`, detail: `${Math.round(my)} points en moyenne contre ${Math.round(mn)} sans. Fais-en plus souvent.` });
      else if(my > 0 && mn >= my * 1.6) out.push({ n: 'info', titre: `Tes publications avec ${k} marchent moins bien`, detail: `${Math.round(my)} points en moyenne contre ${Math.round(mn)} sans.` });
    });
    publies.filter(p => sc.includes(p) && now - new Date(p.published_at || p.date).getTime() > 3 * D && vlScore(p) < med * 0.35).slice(0, 2).forEach(p => {
      const a = txtAudit(p.caption, 'page', []);
      out.push({ n: 'warn', titre: `« ${post(p).t} » a eu peu de résultats`, detail: `${Math.round(vlScore(p))} points contre ${Math.round(med)} d'habitude.${a.issues.length ? ' Côté texte : ' + a.issues.slice(0, 2).map(x => x.msg).join(' · ') + '.' : ''}`,
        act: { l: 'Demander pourquoi à l\'IA', js: `mkGo('chat');mkSend(${JSON.stringify('Pourquoi ma publication « ' + post(p).t + ' » a eu peu de résultats ? Voici son texte : ' + String(p.caption).replace(/\s+/g, ' ').slice(0, 400) + ' Que dois-je changer la prochaine fois ?')},{search:false})` } });
    });
  } else if(publies.length >= 2) out.push({ n: 'info', titre: 'Je manque de chiffres pour analyser', detail: `Je n'ai les résultats que de ${sc.length} publication(s). Dès 6, je te dirai ce qui marche (hashtags, longueur, question…).`, act: { l: 'Donner mes chiffres', js: `mkGo('res')` } });
  // 4. Mots rejetes dans les textes prevus
  const mo = txtMots();
  if(mo.evite.length) aVenir.forEach(p => { const w = new Set(txlWords(txlClean(p.caption))); const hit = mo.evite.filter(x => w.has(txlNorm(x))); if(hit.length) out.push({ n: 'warn', titre: `Un mot que tu remplaces d'habitude est dans « ${post(p).t} »`, detail: hit.slice(0, 3).join(', '), act: action(p) }); });
  // 5. Contexte vide ou presque
  if(typeof window.ctxCount === 'function' && window.ctxCount() < 5) out.push({ n: 'info', titre: 'Mon contexte est presque vide', detail: 'Réponds à quelques questions (3 minutes) : ta voix, tes mots, ce que tu refuses. L\'IA écrira beaucoup plus comme toi.', act: { l: 'Répondre aux questions', js: 'ctxOuvrir()' } });
  // 6. Bibliotheque vide
  if(!txtBiblio().length) out.push({ n: 'info', titre: 'Je ne connais pas encore ton style', detail: 'Ajoute quelques-unes de tes anciennes légendes : j\'écrirai comme toi.', act: { l: 'Ajouter mes anciens textes', js: 'txbOuvrir()' } });
  const ordre = { bad: 0, warn: 1, info: 2, good: 3 };
  return out.sort((a, b) => ordre[a.n] - ordre[b.n]);
}
function txtVeilleCount(){ try { return txtVeille().filter(x => x.n === 'bad' || x.n === 'warn').length; } catch(e){ return 0; } }
async function txtVeilleIA(){
  if(typeof MK === 'undefined' || MK.veilleBusy) return;
  const pubs = (MK.posts || []).filter(p => p.caption && p.status !== 'annule').sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 10);
  if(!pubs.length){ if(typeof agToast === 'function') agToast('Pas encore de publication à analyser', 'error'); return; }
  MK.veilleBusy = true; if(typeof mkRenderTab === 'function') mkRenderTab();
  try {
    const data = pubs.map(p => `- ${p.date} ${p.network} "${(p.title || '').slice(0, 40)}" [${p.status}] stats: ${typeof mkHasStats === 'function' && mkHasStats(p) ? JSON.stringify(p.stats) : 'aucune'}\n  texte: ${txlClean(p.caption).replace(/\s+/g, ' ').slice(0, 260)}\n  hashtags: ${p.hashtags || ''}`).join('\n');
    const q = `ANALYSE CRITIQUE DE MES PUBLICATIONS. Voici mes ${pubs.length} dernières publications avec leurs résultats quand je les ai. Dis-moi franchement, en 5 points maximum : 1) ce qui ne va pas dans mes descriptions (ton, longueur, formules, voix) ; 2) ce qui ne va pas dans mes hashtags ; 3) ce qui semble marcher ou ne pas attirer de clients, SEULEMENT si les chiffres le montrent (sinon dis que tu manques de chiffres) ; 4) les 2 changements les plus utiles à faire dès la prochaine publication. Cite des publications précises. N'invente aucun chiffre.\n${data}`;
    const r = await (typeof mkAI === 'function' ? mkAI({ system: typeof mkSystem === 'function' ? mkSystem() : '', messages: [{ role: 'user', text: q }], maxTokens: 1800 }) : Promise.reject(new Error('IA indisponible')));
    MK.veilleIA = { texte: String(r.text || '').replace(/```[\s\S]*?```/g, '').trim(), date: Date.now() };
  } catch(e){ if(typeof agAlert === 'function') agAlert(e.message || String(e)); }
  MK.veilleBusy = false; if(typeof mkRenderTab === 'function') mkRenderTab();
}
function txtVeilleHtml(){
  const e = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let L = []; try { L = txtVeille(); } catch(err){ console.warn('veille', err); }
  const ic = { bad: '!', warn: '!', info: 'i', good: '✓' };
  const ia = MK.veilleIA ? `<div class="vl-ia"><b>Analyse de l'IA</b>${typeof mkMd === 'function' ? mkMd(MK.veilleIA.texte) : e(MK.veilleIA.texte)}</div>` : '';
  return `<div class="mk-card vl"><h3>${typeof agIcon === 'function' ? agIcon('target', 18) : ''} Mon analyse${L.filter(x => x.n === 'bad' || x.n === 'warn').length ? `<span class="crm-count">${L.filter(x => x.n === 'bad' || x.n === 'warn').length}</span>` : ''}</h3>
    ${L.length ? L.slice(0, 6).map(x => `<div class="vl-i vl-${x.n}"><i>${ic[x.n]}</i><div><b>${e(x.titre)}</b><span>${e(x.detail)}</span>${x.act ? `<button onclick="${e(x.act.js)}">${e(x.act.l)}</button>` : ''}</div></div>`).join('') : `<div class="ag-hint" style="margin:0">Rien à signaler : tes textes à venir et tes hashtags semblent corrects.</div>`}
    ${ia}
    <button class="btn-secondary mk-ib" style="margin-top:10px" ${MK.veilleBusy ? 'disabled' : ''} onclick="txtVeilleIA()">${MK.veilleBusy ? "L'IA analyse tes publications..." : 'Analyse approfondie par l\'IA (1 demande)'}</button>
    <div class="ag-hint">Ces alertes sont calculées sur ton téléphone : elles ne consomment pas ton quota d'IA. Seul le bouton ci-dessus fait une demande.</div></div>`;
}
(function(){ const st = document.getElementById('txbCss'); if(st) st.textContent += `.vl-i{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid rgba(255,255,255,.08)}.vl-i:first-of-type{border-top:0}.vl-i>i{flex:none;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:700;font-size:12px;background:rgba(255,255,255,.12)}
  .vl-bad>i{background:#ff6b5e;color:#fff}.vl-warn>i{background:#f5c04e;color:#222}.vl-good>i{background:#7ee2a8;color:#04210f}.vl-i>div{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;font-size:13px}.vl-i span{opacity:.75;font-size:12px}
  .vl-i button{align-self:flex-start;margin-top:4px;width:auto;border:1px solid rgba(255,255,255,.2);background:transparent;color:inherit;border-radius:8px;padding:5px 10px;font-size:12px;cursor:pointer}.vl-ia{margin-top:10px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.05);font-size:13px;line-height:1.45}`; })();
Object.assign(window, { txtVeille, txtVeilleCount, txtVeilleIA, txtVeilleHtml });

(function(){ const st = document.getElementById('txbCss'); if(st) st.textContent += `.st-polir{margin:10px 0 4px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.05);display:flex;flex-direction:column;gap:6px;font-size:12px}.st-polir>b{font-size:13px}.st-polir>span{opacity:.72;line-height:1.4}
  .st-polir button{width:auto;align-self:flex-start;border:1px solid rgba(255,255,255,.2);background:transparent;color:inherit;border-radius:10px;padding:8px 12px;font-size:13px;cursor:pointer}.st-polir button.main{background:var(--accent,#c6f432);border-color:transparent;color:#111;font-weight:700}
  .st-pl-r{display:flex;gap:6px;align-items:center}.st-pl-r input{flex:1;min-width:0;font-size:12px;padding:8px 10px;border-radius:10px}.st-pl-r button{flex:none}`; })();
