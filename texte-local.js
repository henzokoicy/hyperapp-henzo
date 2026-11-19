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
  const em = (t.match(/\p{Extended_Pictographic}/gu) || []).length; if(em > 7) add('emoji', em + ' émojis : trop chargé', false);
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
