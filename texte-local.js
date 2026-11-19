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
    const i = out.findIndex(x => txbSim(x.t, t) >= 0.8);
    if(i >= 0){ if(e.src === 'aime') out[i].src = 'aime'; return; }
    out.push({ t: t.slice(0, 1400), src: e.src || 'ancien', canal: e.canal || '', d: new Date().toISOString().slice(0, 10) }); });
  return out.slice(-40);
}
// Appelee quand Henzo touche "J'aime" sur un texte (studio ou chat)
async function txtAimer(texte, canal, avis){
  try {
    if(avis !== 'oui' || typeof stSauverMarque !== 'function') return;
    const m = (typeof stM === 'function' ? stM() : window.ST_MARQUE) || {};
    const biblio = txbMerge(Array.isArray(m.biblio) ? m.biblio : [], [{ t: txlClean(texte), src: 'aime', canal }]);
    if(biblio.length === (m.biblio || []).length && biblio.every((x, i) => x.t === (m.biblio[i] || {}).t && x.src === (m.biblio[i] || {}).src)) return;
    await stSauverMarque({ biblio });
  } catch(e){ console.warn('biblio', e); }
}
// Exemples reels envoyes a l'IA (les textes aimes d'abord, puis les plus recents)
function txtExemplesPrompt(canal){
  const b = txtBiblio().slice().sort((a, c) => (c.src === 'aime') - (a.src === 'aime') || String(c.d).localeCompare(String(a.d)));
  const pick = []; const mem = (arr) => arr.forEach(x => { if(pick.length < 4 && !pick.includes(x)) pick.push(x); });
  mem(b.filter(x => canal && x.canal === canal)); mem(b);
  if(!pick.length) return '';
  return 'EXEMPLES RÉELS DE SES TEXTES (c\'est sa vraie façon d\'écrire : imite le ton, le rythme, la longueur, la façon de commencer et de finir, SANS recopier de phrases ni de détails de ces séances) :\n' + pick.map((x, i) => `--- Exemple ${i + 1}${x.src === 'aime' ? ' (qu\'il a aimé)' : ''} ---\n${txlClean(x.t).slice(0, 700)}`).join('\n');
}
(function(){ const o = txtExtraPrompt; window.txtExtraPrompt = function(canal){
  const ex = txtExemplesPrompt(canal);
  return (ex ? ex + '\n' : '') + o() + '\nIMPORTANT : "emotion" et "detail" doivent se lire comme UN seul texte fluide, naturel, qui se suit, sans répéter ni ressembler à un formulaire.'; }; })();

// ---------- Ecran dans Ma marque ----------
function txbMarque(){ return (typeof ST !== 'undefined' && ST.m) ? ST.m : ((typeof stM === 'function') ? stM() : {}); }
function txbCardHtml(){
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
  return `<div class="st-card"><h3>${typeof agIcon === 'function' ? agIcon('note', 18) : ''} Mes anciens textes</h3>
    <p>Colle une ou plusieurs anciennes légendes (sépare-les par une ligne <b>---</b>), ou lis-les depuis une capture d'écran. L'app en sort tes hashtags, ton numéro WhatsApp, tes appels à réserver, ta signature et ton style, puis s'en sert pour <b>écrire comme toi</b>.</p>
    <textarea id="txbIn" rows="6" placeholder="Colle ici une ancienne publication..." oninput="TXB.saisie=this.value">${txbEsc(TXB.saisie)}</textarea>
    <div class="txb-btns"><button class="btn-secondary" onclick="txbOcr()" ${TXB.busy ? 'disabled' : ''}>${TXB.busy === 'ocr' ? 'Lecture de la capture...' : 'Lire une capture d\'écran'}</button>
      <button class="btn-primary" onclick="txbAnalyser()" ${TXB.busy ? 'disabled' : ''}>Analyser</button></div>
    ${res}
    <div class="st-sep" style="margin-top:14px">Ma bibliothèque (${b.length})</div>
    ${b.length ? `<div class="txb-lib">${b.slice().reverse().map((x, ri) => { const i = b.length - 1 - ri; const first = txlClean(x.t).split('\n').find(l => l.trim()) || '';
      return `<div class="txb-it"><span class="txb-s ${x.src === 'aime' ? 'ok' : ''}">${x.src === 'aime' ? 'Aimé' : 'Ancien'}</span><div>${txbEsc(first.slice(0, 90))}<small>${txbEsc(txlClean(x.t).replace(/\s+/g, ' ').slice(0, 130))}</small></div><button aria-label="Retirer" onclick="txbDel(${i})">×</button></div>`; }).join('')}</div>`
      : `<div class="ag-hint" style="margin:0">Vide pour le moment. Les textes que tu aimes dans le studio s'ajoutent ici tout seuls.</div>`}
    <div class="ag-hint">Pense à toucher « Enregistrer ma marque » en bas si tu retires un texte.</div></div>`;
}
function txbAnalyser(){
  const el = document.getElementById('txbIn'); if(el) TXB.saisie = el.value;
  const parts = String(TXB.saisie || '').split(/\n\s*-{3,}\s*\n/).map(x => x.trim()).filter(x => x.length >= 25);
  if(!parts.length){ if(typeof agToast === 'function') agToast('Colle au moins un texte', 'error'); return; }
  TXB.analyse = { x: txtExtraire(parts), parts };
  if(typeof stRefresh === 'function') stRefresh();
}
function txbAppliquer(){
  const A = TXB.analyse; if(!A || !ST.m) return; const X = A.x, m = ST.m, on = id => { const e = document.getElementById(id); return !!(e && e.checked); };
  if(on('txbTags') && X.hashtags.length){
    const have = new Set((m.hashtags_fixes || '').split(/\s+/).map(x => x.toLowerCase()).filter(Boolean));
    const add = X.hashtags.filter(h => !have.has(h.toLowerCase())).slice(0, 8);
    m.hashtags_fixes = [m.hashtags_fixes || '', ...add].join(' ').replace(/\s+/g, ' ').trim();
  }
  if(on('txbTel') && X.tels[0]) m.contact = 'WhatsApp ' + X.tels[0];
  const r = document.querySelector('input[name="txbAppel"]:checked'); if(r && Number(r.value) >= 0 && X.appels[Number(r.value)]) m.fin = X.appels[Number(r.value)];
  if(on('txbLieu') && X.lieu) m.lieu = X.lieu;
  if(on('txbCopy') && X.copyright){ m.copyright = Object.assign({ on: true, style: 'leger' }, m.copyright || {}, { texte: X.copyright.replace(/^\s*\(c\)/i, '©') }); }
  if(on('txbEmo')) m.emojis = X.emojisParTexte === 0 ? 'aucun' : X.emojisParTexte <= 3 ? 'peu' : 'beaucoup';
  m.biblio = txbMerge(Array.isArray(m.biblio) ? m.biblio : [], A.parts.map(t => ({ t, src: 'ancien' })));
  TXB.analyse = null; TXB.saisie = '';
  if(typeof stMarqueSave === 'function') stMarqueSave();
}
function txbDel(i){ const m = txbMarque(); if(Array.isArray(m.biblio)){ m.biblio.splice(i, 1); if(typeof stRefresh === 'function') stRefresh(); } }
function txbCharger(src){ return new Promise((ok, ko) => { if(window.LecteurOCR) return ok(); const s = document.createElement('script'); s.src = src; s.onload = () => (window.LecteurOCR ? ok() : ko(new Error('Lecteur non chargé'))); s.onerror = () => ko(new Error('Lecteur de texte indisponible')); document.body.appendChild(s); }); }
function txbOcr(){
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true; inp.style.display = 'none';
  inp.onchange = async () => {
    const files = [...inp.files].slice(0, 6); inp.remove(); if(!files.length) return;
    TXB.busy = 'ocr'; if(typeof stRefresh === 'function') stRefresh();
    const out = []; let faible = false;
    try {
      await txbCharger('lecteur-ocr.js?v=1');
      for(const f of files){ const r = await window.LecteurOCR.lire(f, {}); const t = String(r.texte || '').trim(); if(t){ out.push(t); if(r.confiance < 60) faible = true; } }
    } catch(e){ if(typeof agAlert === 'function') agAlert('Lecture impossible : ' + (e.message || e)); }
    TXB.busy = '';
    if(out.length){ TXB.saisie = [TXB.saisie, ...out].filter(Boolean).join('\n---\n'); if(typeof agToast === 'function') agToast(faible ? 'Texte lu, vérifie-le avant d\'analyser' : 'Texte lu : vérifie puis touche Analyser'); }
    else if(typeof agToast === 'function') agToast("Je n'ai trouvé aucun texte sur cette image", 'error');
    if(typeof stRefresh === 'function') stRefresh();
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
