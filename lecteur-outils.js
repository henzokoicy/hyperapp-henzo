// ============================================================
// LECTEUR-OUTILS.JS - Extraction locale + exports du Lecteur d'images
// Tout se fait sur l'appareil, sans IA ni connexion :
// - extraire(texte) : téléphones, prix, dates et heures, e-mails, liens (français et anglais)
// - txt / csv / pdf : fabrication des fichiers d'export (PDF avec jsPDF, déjà dans la Super App)
// - telecharger / partager
// Utilisé par lecteur.js.
// ============================================================
(function(){
if(window.LecteurOutils) return;

// ---------- Outils ----------
const U = 'giu';
const MOIS_FR = 'janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[ée]cembre|janv|f[ée]vr?|avr|juil|sept?|oct|nov|d[ée]c|mar';
const MOIS_EN = 'january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec';
const JOURS = '(?:lun|mar|mer|jeu|ven|sam|dim)[a-zé]*\\.?|(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\\.?';
const NUM = '\\d{1,3}(?:[ \\u00a0\\u202f.,]\\d{3})+(?:[.,]\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?';
const CUR = 'F\\.?\\s?CFA|FCFA|CFA|XOF|F|€|EUR|euros?|\\$|USD|MAD|DHS?';

function ligneDe(texte, i){
  const a = texte.lastIndexOf('\n', i - 1) + 1;
  let b = texte.indexOf('\n', i); if(b < 0) b = texte.length;
  return { debut: a, fin: b, texte: texte.slice(a, b) };
}
// « Détail » d'un élément = le texte de sa ligne, sans les éléments trouvés sur cette ligne (de quoi on parle).
const LIAISON = /(?:\s+(?:le|la|les|l'|à|au|aux|du|de|des|ou|et|puis|vers|pour|en|dès|jusqu'au|on|at|the|and|or))+$/i;
function finir(t, items){
  items.forEach(it => {
    const l = ligneDe(t, it.pos);
    const spans = items.filter(o => o.pos >= l.debut && o.pos < l.fin).sort((a, b) => a.pos - b.pos);
    let r = '', c = l.debut;
    spans.forEach(o => { if(o.pos >= c){ r += t.slice(c, o.pos) + ' '; c = o.pos + o.len; } });
    r += t.slice(c, l.fin);
    r = r.replace(/\s+/g, ' ').replace(/\s*[;,\/|]\s*(?:[;,\/|]\s*)+/g, ' ').replace(/^[\s:;,.\-–—•*·|>]+|[\s:;,.\-–—•*·|>]+$/g, '');
    r = r.replace(LIAISON, '').replace(/[\s:;,.\-–—•*·|>]+$/g, '').trim();
    it.detail = r;
  });
  items.forEach(it => { delete it.len; });
  return items;
}
function chevauche(zones, a, b){ return zones.some(z => a < z[1] && b > z[0]); }
function nombre(s){
  s = String(s).replace(/[  ]/g, ' ').trim();
  if(/^\d{1,3}(?:[ .,]\d{3})+$/.test(s)) return Number(s.replace(/[ .,]/g, ''));              // 150 000 / 50.000 / 1,500
  if(/^\d{1,3}(?:[ .,]\d{3})+[.,]\d{1,2}$/.test(s)){ const d = s.slice(-2).replace(/\D/g, ''); return Number(s.slice(0, -3).replace(/[ .,]/g, '') + '.' + d); }
  return Number(s.replace(/\s/g, '').replace(',', '.'));
}
function devise(c){
  c = String(c || '').toUpperCase().replace(/[\s.]/g, '');
  if(!c) return '';
  if(/^(FCFA|CFA|XOF|F)$/.test(c)) return 'FCFA';
  if(/^(€|EUR|EURO|EUROS)$/.test(c)) return '€';
  if(/^(\$|USD)$/.test(c)) return '$';
  if(/^(MAD|DH|DHS)$/.test(c)) return 'MAD';
  return c;
}
const fr = n => (Math.abs(n) >= 1000 ? String(Math.round(n * 100) / 100).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : String(Math.round(n * 100) / 100)).replace('.', ',');

// ---------- Téléphones ----------
function telephones(t){
  const out = [], vus = new Set();
  const re = /(?<![\d])(?:\+|00)?\d[\d . \-()]{6,18}\d(?!\d)/g;
  let m;
  while((m = re.exec(t))){
    const brut = m[0].trim();
    const plus = /^(\+|00)/.test(brut);
    const chiffres = brut.replace(/\D/g, '');
    let ok = false, affiche = brut.replace(/[ ]/g, ' ');
    if(plus){ const c = chiffres.replace(/^00/, ''); ok = c.length >= 9 && c.length <= 15; }
    else if(chiffres.length === 10 && chiffres[0] === '0'){ ok = true; affiche = chiffres.replace(/(\d{2})(?=\d)/g, '$1 ').trim(); }
    if(!ok) continue;
    const cle = chiffres.replace(/^00/, '');
    if(vus.has(cle)) continue; vus.add(cle);
    out.push({ type: 'tel', texte: affiche, valeur: (plus ? '+' + cle : chiffres), pos: m.index, len: m[0].length });
  }
  return finir(t, out);
}

// ---------- Prix ----------
function prix(t){
  const out = [], zones = [];
  const add = (m, valeur, dev, texte) => {
    const a = m.index, b = m.index + m[0].length;
    if(chevauche(zones, a, b) || !isFinite(valeur)) return;
    zones.push([a, b]);
    out.push({ type: 'prix', texte: texte || m[0].trim(), valeur, devise: dev, pos: a, len: m[0].length });
  };
  let m;
  // 150k FCFA
  const rK = new RegExp(`(?<![\\d.,])(\\d+(?:[.,]\\d+)?)\\s?k\\s?(${CUR})(?![\\p{L}\\d])`, U);
  while((m = rK.exec(t))) add(m, Number(m[1].replace(',', '.')) * 1000, devise(m[2]));
  // 150 000 FCFA, 50.000 F, 12,50 €
  const rS = new RegExp(`(?<![\\d.,])(${NUM})\\s?(${CUR})(?![\\p{L}\\d])`, U);
  const rSg = new RegExp(rS.source, 'giu');
  while((m = rSg.exec(t))) add(m, nombre(m[1]), devise(m[2]));
  // €50, $ 99
  const rP = new RegExp(`(?<![\\p{L}\\d])(€|\\$)\\s?(${NUM})(?![\\d])`, U);
  const rPg = new RegExp(rP.source, 'giu');
  while((m = rPg.exec(t))) add(m, nombre(m[2]), devise(m[1]));
  // « Prix : 5000 », « Total 25 000 » (sans devise écrite)
  const rL = new RegExp(`(?<![\\p{L}])(?:prix|tarifs?|total|montant|solde|reste|avance|forfait|pack)\\b[^\\d\\n]{0,15}(${NUM})(?![\\d]|\\s?(?:%|h\\b))`, U);
  const rLg = new RegExp(rL.source, 'giu');
  while((m = rLg.exec(t))){
    const i = m.index + m[0].lastIndexOf(m[1]);
    const fake = { index: i, 0: m[1] };
    add(fake, nombre(m[1]), '', m[1].trim());
  }
  out.sort((a, b) => a.pos - b.pos);
  return finir(t, out);
}

// ---------- Dates et heures ----------
function dates(t){
  const out = [], zones = [];
  const add = (m, kind, jour) => {
    const a = m.index, b = m.index + m[0].length;
    if(chevauche(zones, a, b)) return;
    zones.push([a, b]);
    out.push({ type: 'date', kind, texte: m[0].trim(), pos: a, len: m[0].length });
  };
  let m;
  const rN = /(?<![\d/.\-])(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4}|\d{2})(?![\d]|[\/.\-]\d)/g;
  while((m = rN.exec(t))){ const j = +m[1], mo = +m[2]; if(j >= 1 && j <= 31 && mo >= 1 && mo <= 12) add(m, 'date'); }
  const rF = new RegExp(`(?<![\\p{L}\\d])(?:(?:${JOURS})\\s+)?(?:\\d{1,2}|1er)\\s*(?:er)?\\s+(?:${MOIS_FR})\\.?(?:\\s+\\d{4})?(?![\\p{L}])`, U);
  const rFg = new RegExp(rF.source, 'giu');
  while((m = rFg.exec(t))) add(m, 'date');
  // Mois + année seuls : « Février 2026 »
  const rM = new RegExp(`(?<![\\p{L}\\d])(?:${MOIS_FR}|${MOIS_EN})\\.?\\s+\\d{4}(?![\\p{L}\\d])`, 'giu');
  while((m = rM.exec(t))) add(m, 'date');
  const rE = new RegExp(`(?<![\\p{L}\\d])(?:(?:${JOURS})\\s+)?(?:${MOIS_EN})\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?(?![\\p{L}\\d])`, U);
  const rEg = new RegExp(rE.source, 'giu');
  while((m = rEg.exec(t))) add(m, 'date');
  // Heures : 15h, 15h30, 15:30, 3:30 pm
  const rH = /(?<![\d:.,])(\d{1,2})\s?h\s?([0-5]\d)?(?![\p{L}\d])/giu;
  while((m = rH.exec(t))){ if(+m[1] <= 24) add(m, 'heure'); }
  const rH2 = /(?<![\d:.,])(\d{1,2}):([0-5]\d)(?::[0-5]\d)?(?:\s?(?:am|pm))?(?![\d])/gi;
  while((m = rH2.exec(t))){ if(+m[1] <= 24) add(m, 'heure'); }
  out.sort((a, b) => a.pos - b.pos);
  return finir(t, out);
}

// ---------- E-mails et liens ----------
function emails(t){
  const out = [], vus = new Set();
  const re = /[\p{L}\d._%+\-]+@[\p{L}\d\-]+(?:\.[\p{L}\d\-]+)+/gu;
  let m;
  while((m = re.exec(t))){
    const e = m[0].replace(/[.,;:]+$/, ''), k = e.toLowerCase();
    if(vus.has(k)) continue; vus.add(k);
    out.push({ type: 'email', texte: e, valeur: e, pos: m.index, len: m[0].length });
  }
  return finir(t, out);
}
function liens(t){
  const out = [], vus = new Set();
  const re = /(?<![@\p{L}\d])(?:https?:\/\/|www\.)[^\s<>"']+/giu;
  let m;
  while((m = re.exec(t))){
    const l = m[0].replace(/[.,;:!?)\]]+$/, ''), k = l.toLowerCase();
    if(vus.has(k)) continue; vus.add(k);
    out.push({ type: 'lien', texte: l, valeur: /^https?:/i.test(l) ? l : 'https://' + l, pos: m.index, len: m[0].length });
  }
  return finir(t, out);
}

function extraire(texte){
  const t = String(texte || '');
  return { tel: telephones(t), prix: prix(t), dates: dates(t), emails: emails(t), liens: liens(t) };
}
const TYPES = [
  { id: 'tel', icone: '📞', nom: 'Téléphones', vide: 'Aucun numéro de téléphone trouvé.' },
  { id: 'prix', icone: '💰', nom: 'Prix', vide: 'Aucun prix trouvé.' },
  { id: 'dates', icone: '📅', nom: 'Dates et heures', vide: 'Aucune date ni heure trouvée.' },
  { id: 'emails', icone: '✉️', nom: 'E-mails', vide: 'Aucune adresse e-mail trouvée.' },
  { id: 'liens', icone: '🔗', nom: 'Liens', vide: 'Aucun lien trouvé.' }
];
// Ce que « Copier la liste » met dans le presse-papiers pour une ligne
function ligneCopie(it){
  if(it.type === 'prix' || it.type === 'date') return it.detail ? `${it.detail} : ${it.texte}` : it.texte;
  return it.texte;
}

// ---------- Exports ----------
function stamp(){ const d = new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; }
function nomFichier(ext){ return `lecteur-${stamp()}.${ext}`; }

// sections : [{ titre, texte }]
function txt(sections){
  const L = sections.filter(s => s.texte && s.texte.trim());
  if(L.length === 1) return L[0].texte.trim() + '\n';
  return L.map(s => `--- ${s.titre} ---\n${s.texte.trim()}`).join('\n\n') + '\n';
}
function csv(lignes){
  const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  return '﻿' + lignes.map(r => r.map(q).join(';')).join('\r\n') + '\r\n';   // « ; » + BOM : s'ouvre bien dans Excel en français
}
// Lignes CSV des éléments extraits (liste d'objets de extraire())
function csvExtraction(items){
  const nom = { tel: 'Téléphone', prix: 'Prix', date: 'Date', email: 'E-mail', lien: 'Lien' };
  const l = [['Type', 'Valeur', 'Détail', 'Montant', 'Devise']];
  items.forEach(it => l.push([nom[it.type] || it.type, it.texte, it.detail || '', it.type === 'prix' ? it.valeur : '', it.type === 'prix' ? it.devise : '']));
  return csv(l);
}
function blob(contenu, type){ return new Blob([contenu], { type }); }

// jsPDF (Helvetica) ne sait écrire que le latin : on remplace le reste proprement
function pdfTexte(s){
  return String(s || '').replace(/[‘’‚]/g, "'").replace(/[“”„]/g, '"').replace(/[–—]/g, '-')
    .replace(/…/g, '...').replace(/[   ]/g, ' ').replace(/€/g, 'EUR').replace(/[•·]/g, '-')
    .replace(/\r/g, '').replace(/[^\n\t -~¡-ÿ]/g, '');
}
function pdf(sections, titre){
  const lib = window.jspdf && window.jspdf.jsPDF;
  if(!lib) throw new Error("Le module PDF n'est pas chargé. Vérifie ta connexion puis recharge l'application.");
  const doc = new lib({ unit: 'mm', format: 'a4' });
  const W = 210, M = 16, H = 297, LH = 5.6, larg = W - 2 * M;
  let y = M;
  const saut = h => { if(y + h > H - M){ doc.addPage(); y = M; } };
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text(pdfTexte(titre || "Texte lu par le Lecteur d'images"), M, y + 4); y += 9;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(120);
  doc.text('Super App Henzo - ' + new Date().toLocaleDateString('fr-FR'), M, y); y += 8; doc.setTextColor(0);
  sections.filter(s => s.texte && s.texte.trim()).forEach((s, i, tab) => {
    if(tab.length > 1){ saut(12); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text(pdfTexte(s.titre), M, y); y += 6.5; }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
    pdfTexte(s.texte).split('\n').forEach(par => {
      const lignes = par.trim() ? doc.splitTextToSize(par, larg) : [''];
      lignes.forEach(l => { saut(LH); doc.text(l, M, y); y += LH; });
    });
    y += 5;
  });
  return doc.output('blob');
}

// ---------- DOCX (Word) : fabriqué à la main avec fflate (déjà dans la Super App), aucune bibliothèque en plus ----------
let fflateP = null;
function chargerFflate(){
  if(window.fflate) return Promise.resolve();
  if(!fflateP) fflateP = new Promise((ok, ko) => {
    const s = document.createElement('script'); s.src = 'henzo-fflate.min.js?v=1'; s.onload = ok;
    s.onerror = () => { fflateP = null; ko(new Error("Le module Word n'a pas pu être chargé. Vérifie ta connexion.")); };
    document.head.appendChild(s);
  });
  return fflateP;
}
const X = s => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function run(texte, o){
  o = o || {};
  const pr = (o.b ? '<w:b/>' : '') + (o.i ? '<w:i/>' : '') + (o.sz ? `<w:sz w:val="${o.sz}"/>` : '');
  return `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ''}<w:t xml:space="preserve">${X(texte)}</w:t></w:r>`;
}
// Gras **x** dans une ligne de réponse
function runs(texte, o){
  return String(texte).split(/(\*\*.+?\*\*)/).filter(x => x !== '').map(x => /^\*\*.+\*\*$/.test(x) ? run(x.slice(2, -2), { ...o, b: true }) : run(x, o)).join('');
}
function para(contenu, o){
  o = o || {};
  const ppr = (o.puce ? '<w:ind w:left="360" w:hanging="260"/>' : '') + (o.apres != null ? `<w:spacing w:after="${o.apres}"/>` : '');
  return `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ''}${contenu}</w:p>`;
}
// blocs : même format que LecteurIA.blocs ; on y ajoute { t:'h', n, texte } pour les titres
function docx(blocs, titre){
  return chargerFflate().then(() => {
    let corps = para(run(titre || "Texte lu par le Lecteur d'images", { b: true, sz: 32 }), { apres: 120 })
      + para(run('Super App Henzo - ' + new Date().toLocaleDateString('fr-FR'), { sz: 18 }), { apres: 240 });
    let n = 0;
    blocs.forEach(b => {
      if(b.t === 'h') corps += para(runs(b.texte, { b: true, sz: b.n <= 1 ? 30 : b.n === 2 ? 26 : 24 }), { apres: 100 });
      else if(b.t === 'p') corps += para(runs(b.texte), { apres: 100 });
      else if(b.t === 'li'){ n = b.num ? n + 1 : 0; corps += para(run(b.num ? n + '. ' : '\u2022 ') + runs(b.texte), { puce: true, apres: 40 }); }
      else if(b.t === 'vide') corps += para('', { apres: 60 });
      else if(b.t === 'table'){
        const bord = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(k => `<w:${k} w:val="single" w:sz="4" w:space="0" w:color="999999"/>`).join('');
        const cols = Math.max(...b.lignes.map(r => r.length));
        corps += `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${bord}</w:tblBorders></w:tblPr><w:tblGrid>${'<w:gridCol/>'.repeat(cols)}</w:tblGrid>`
          + b.lignes.map((r, i) => `<w:tr>${Array.from({ length: cols }, (_, k) => `<w:tc><w:tcPr><w:tcW w:w="${Math.round(5000 / cols)}" w:type="pct"/>${i === 0 ? '<w:shd w:val="clear" w:color="auto" w:fill="E8EEF0"/>' : ''}</w:tcPr>${para(runs(r[k] || '', i === 0 ? { b: true } : {}))}</w:tc>`).join('')}</w:tr>`).join('')
          + '</w:tbl>' + para('', { apres: 80 });
      }
    });
    const f = window.fflate, u = f.strToU8, ns = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
    const zip = f.zipSync({
      '[Content_Types].xml': u('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),
      '_rels/.rels': u('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'),
      'word/document.xml': u(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${ns}><w:body>${corps}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`)
    });
    return new Blob([zip], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  });
}
// Blocs DOCX pour du texte lu : un titre par image puis une ligne = un paragraphe
function blocsTexte(sections){
  const out = [];
  sections.filter(s => s.texte && s.texte.trim()).forEach((s, i, tab) => {
    if(tab.length > 1) out.push({ t: 'h', n: 2, texte: s.titre });
    s.texte.replace(/\r/g, '').split('\n').forEach(l => out.push(l.trim() ? { t: 'p', texte: l.replace(/\*\*/g, '') } : { t: 'vide' }));
    out.push({ t: 'vide' });
  });
  return out;
}

// ---------- Informations répétées entre plusieurs images ----------
function repetees(sections){
  const norm = l => l.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9@+]+/g, ' ').trim();
  const vus = new Map();
  sections.forEach(s => {
    const deja = new Set();
    String(s.texte || '').split('\n').forEach(l => {
      const k = norm(l); if(k.length < 6 || deja.has(k)) return; deja.add(k);
      const e = vus.get(k) || { texte: l.trim(), images: [] }; e.images.push(s.titre); vus.set(k, e);
    });
  });
  return [...vus.values()].filter(e => e.images.length > 1);
}

function telecharger(b, nom){
  const url = URL.createObjectURL(b), a = document.createElement('a');
  a.href = url; a.download = nom; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 4000);
}
async function partager(texte){
  if(!navigator.share) throw new Error('Le partage n’est pas disponible sur cet appareil. Utilise « Copier ».');
  try { await navigator.share({ text: String(texte) }); }
  catch(e){ if(e && e.name === 'AbortError') return; throw e; }
}

window.LecteurOutils = { extraire, TYPES, ligneCopie, fr, txt, csv, csvExtraction, pdf, docx, blocsTexte, repetees, blob, nomFichier, telecharger, partager };
})();
