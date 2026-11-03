// ============================================================
// CONTRATS.JS - Des contrats simples et sérieux (Studio > Séances)
// ------------------------------------------------------------
// - Modèles : séance photo, mariage/dot/cérémonie, anniversaire ou
//   événement, projet vidéo/entreprise, collaboration.
// - "À partir d'une séance" : client, date, lieu, prix, acompte et ce
//   qui est compris (lignes du pack) se remplissent tout seuls.
// - Chaque article est écrit en mots simples, modifiable.
// - L'IA vérifie ce qui manque, propose des conditions particulières
//   et explique le contrat en mots simples.
// - Signature : toi dans l'app ; le client sur ton téléphone ("Faire
//   signer ici") ou à distance avec un lien secret (contrat.html).
// - PDF : impression ou "Enregistrer en PDF".
// Table : contrats. Ce n'est pas un avis d'avocat : pour un gros
// contrat (entreprise, gros montant), fais-le relire par un juriste.
// ============================================================
(function(){
'use strict';
if(typeof agSheet !== 'function' || typeof ctArticles !== 'function') return;
const E = s => agEsc(String(s == null ? '' : s));
const CT = { liste: [], charge: false, ed: null, onglet: 'infos' };
window.CT = CT;
const nd = s => String(s || '').replace(/[–—]/g, '-');
const STATUTS = { brouillon: 'Brouillon', envoye: 'Envoyé au client', signe: 'Signé' };

async function ctCharger(){
  try { const { data, error } = await sb.from('contrats').select('*').order('created_at', { ascending: false }); if(!error) CT.liste = data || []; } catch(e){}
  CT.charge = true;
}
function ctStudio(){
  const p = typeof PX !== 'undefined' && PX.page ? PX.page : {};
  return { studio: p.marque || (typeof BRAND !== 'undefined' ? BRAND.name.replace(/\b(\w)(\w*)/g, (m, a, b) => a + b.toLowerCase()) : 'Henzo Photographie'), studio_adresse: p.adresse || 'Ahougnansou, en face du Restaurant Le Rosier, Bouaké', studio_tel: p.phone ? '+' + String(p.phone).replace(/\D/g, '') : '', ville: 'Bouaké' };
}
function ctLien(c){ return `${location.origin}/contrat.html?t=${c.token}`; }

// ---------- La liste ----------
window.ctListe = async function(){
  if(!CT.charge) await ctCharger();
  agSheet('ctListe', `<h3>Mes contrats</h3>
    <div class="ag-hint" style="margin-top:0">Un contrat clair protège tes deux côtés : ce qui est compris, l'acompte, l'annulation, la livraison, les droits sur les photos.</div>
    <button class="btn-primary" onclick="ctNouveau()">+ Nouveau contrat</button>
    <div class="ct-list">${CT.liste.map(c => `<div class="ct-it" onclick="ctEditer(${c.id})"><div class="d"><b>${E(c.titre)}</b><span>${E((c.donnees || {}).client || '')}${(c.donnees || {}).date ? ' · ' + E(new Date(c.donnees.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })) : ''}${(c.donnees || {}).prix ? ' · ' + agF(c.donnees.prix) : ''}</span></div><span class="ct-st ${c.statut}">${STATUTS[c.statut] || c.statut}</span></div>`).join('') || '<div class="ag-empty">Aucun contrat pour l\'instant.</div>'}</div>
    <div class="ag-hint">Ces modèles sont une base sérieuse, pas un avis d'avocat. Pour un gros contrat (entreprise, gros montant), fais-le relire par un juriste.</div>`);
};

// ---------- Nouveau ----------
function ctSeances(){
  const auj = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  return (typeof shoots !== 'undefined' ? shoots : []).filter(s => s.status !== 'annule' && s.date && String(s.date).slice(0, 10) >= auj).sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(0, 40);
}
const nomClient = id => { const c = (typeof clients !== 'undefined' ? clients : []).find(x => x.id === id); return c ? c.name : ''; };
window.ctNouveau = function(shootId){
  const S = ctSeances();
  agSheet('ctNew', `<h3>Nouveau contrat</h3>
    <label>Pour quoi ?</label>
    <div class="ag-pills" id="ctMod">${Object.entries(CT_MODELES).map(([k, m], i) => `<button type="button" data-v="${k}" class="${i === 0 ? 'on' : ''}" onclick="agPick(this)">${E(m.nom)}</button>`).join('')}</div>
    <label for="ctSh">À partir d'une séance (conseillé)</label>
    <select id="ctSh"><option value="">Aucune, je remplis moi-même</option>${S.map(s => `<option value="${s.id}" ${s.id === shootId ? 'selected' : ''}>${E(new Date(String(s.date).slice(0, 10) + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }))} · ${E(nomClient(s.client_id) || 'Client')}${s.type ? ' · ' + E(s.type) : ''}${s.price ? ' · ' + agF(s.price) : ''}</option>`).join('')}</select>
    <div class="ag-hint">Le client, la date, le lieu, le prix, l'acompte et ce qui est compris se remplissent tout seuls. Tu pourras tout changer.</div>
    <button class="btn-primary" style="margin-top:12px" onclick="ctCreer()">Préparer le contrat</button>`);
};
function ctPackDe(s){
  const T = (typeof CRM !== 'undefined' && Array.isArray(CRM.tarifs) ? CRM.tarifs : []).filter(t => (t.kind || 'formule') === 'formule');
  return T.find(t => s.type && t.name && s.type.toLowerCase().includes(t.name.toLowerCase())) || T.find(t => Number(t.price) === Number(s.price)) || null;
}
function ctLignesPack(t){ try { return typeof pxDetLines === 'function' ? pxDetLines(t).filter(l => l.ok).map(l => l.t) : []; } catch(e){ return []; } }
function ctAcompte(t){
  try { const c = t && t.collection_id && typeof PX !== 'undefined' ? PX.cols.find(x => x.id === t.collection_id) : null; if(c && Number(c.acompte)) return Number(c.acompte); } catch(e){}
  return 50;
}
window.ctCreer = async function(){
  const modele = (document.querySelector('#ctMod button.on') || {}).dataset?.v || 'seance';
  const sid = Number(document.getElementById('ctSh').value) || null, s = sid ? shoots.find(x => x.id === sid) : null;
  const cl = s && s.client_id ? clients.find(x => x.id === s.client_id) : null, pk = s ? ctPackDe(s) : null;
  const d = Object.assign(ctStudio(), { modele, client: cl ? cl.name : '', client_tel: cl ? cl.phone || '' : '', date: s ? String(s.date).slice(0, 10) : '', heure: s && String(s.date).length > 11 ? new Date(s.date).toTimeString().slice(0, 5) : '', lieu: s ? s.location || 'Studio, Ahougnansou, Bouaké' : '',
    prix: s ? Number(s.price) || 0 : 0, acompte_pct: ctAcompte(pk), livrables: pk ? ctLignesPack(pk) : [], delai: (pk && pk.details && pk.details.livraison) || '7 jours', report_h: 72, acompte_remb: false, retard_min: 30, image_ok: true, galerie: true,
    prestation: s && s.type ? (modele === 'mariage' ? 'la couverture de « ' + s.type + ' »' : 'une prestation « ' + s.type + ' »') : '' });
  const titre = 'Contrat ' + (CT_MODELES[modele] || {}).nom.split(/[,(]/)[0].trim().toLowerCase() + (d.client ? ' - ' + d.client : '');
  const r = await dbInsert('contrats', { titre, modele, client_id: cl ? cl.id : null, shoot_id: sid, donnees: d, articles: ctArticles(modele, d), statut: 'brouillon' });
  if(!r) return;
  CT.liste.unshift(r);
  agCloseSheet('ctNew'); agCloseSheet('ctListe');
  ctEditer(r.id);
};

// ---------- Éditer ----------
const CHAMPS = [
  ['client', 'Nom du client', 'text'], ['client_tel', 'Téléphone du client', 'tel'], ['client_adresse', 'Adresse du client (facultatif)', 'text'],
  ['prestation', 'La prestation (en quelques mots)', 'text', 'Ex : une séance photo maternité en studio'],
  ['date', 'Date', 'date'], ['heure', 'Heure de début', 'time'], ['heure_fin', 'Heure de fin (facultatif)', 'time'], ['lieu', 'Lieu', 'text'],
  ['prix', 'Prix total (F CFA)', 'number'], ['acompte_pct', 'Acompte (%)', 'number'], ['reste_quand', 'Le reste est payé...', 'text', 'Ex : le jour de la séance, avant la livraison'],
  ['delai', 'Délai de livraison', 'text', 'Ex : 7 jours'], ['report_h', 'Report possible si prévenu ... heures avant', 'number'], ['retard_min', 'Retard toléré (minutes)', 'number'],
  ['heure_sup', 'Heure supplémentaire (facultatif)', 'text', 'Ex : 15 000 F par heure'], ['deplacement', 'Frais de déplacement (facultatif)', 'text', 'Ex : 5 000 F hors Bouaké'],
  ['remuneration', 'Rémunération du collaborateur', 'text', 'Ex : 10 000 F + 5 photos retouchées']
];
window.ctEditer = function(id){
  const c = CT.liste.find(x => x.id === id); if(!c) return;
  CT.ed = JSON.parse(JSON.stringify(c)); CT.ed.donnees = CT.ed.donnees || {}; CT.onglet = 'infos';
  agSheet('ctEd', `<div id="ctEdIn"></div>`);
  ctEdRendre();
};
function ctEdRendre(){
  const c = CT.ed, d = c.donnees, el = document.getElementById('ctEdIn'); if(!el) return;
  const collab = d.modele === 'collab';
  const champs = CHAMPS.filter(([k]) => collab ? !['prix', 'acompte_pct', 'reste_quand', 'delai', 'report_h', 'retard_min', 'heure_sup'].includes(k) : k !== 'remuneration');
  el.innerHTML = `<h3>${E(c.titre)}</h3>
    <div class="ct-top"><span class="ct-st ${c.statut}">${STATUTS[c.statut]}</span>${c.signe_le ? `<small>Signé le ${E(new Date(c.signe_le).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }))}</small>` : ''}</div>
    ${c.statut === 'signe' ? '<div class="ag-hint">Ce contrat est signé : il ne peut plus être modifié. Crée un nouveau contrat si quelque chose change.</div>' : ''}
    <div class="ag-pills"><button type="button" class="${CT.onglet === 'infos' ? 'on' : ''}" onclick="ctOnglet('infos')">Les infos</button><button type="button" class="${CT.onglet === 'texte' ? 'on' : ''}" onclick="ctOnglet('texte')">Le texte</button><button type="button" class="${CT.onglet === 'voir' ? 'on' : ''}" onclick="ctOnglet('voir')">Voir et signer</button></div>
    <div id="ctOn"></div>`;
  const on = document.getElementById('ctOn'), fige = c.statut === 'signe';
  if(CT.onglet === 'infos'){
    on.innerHTML = `<label for="ctTitre">Titre</label><input id="ctTitre" value="${E(c.titre)}" ${fige ? 'disabled' : ''}>
      ${champs.map(([k, l, t, ph]) => `<label for="ct_${k}">${l}</label><input id="ct_${k}" type="${t}" value="${E(d[k] == null ? '' : d[k])}" placeholder="${E(ph || '')}" ${t === 'number' ? 'inputmode="decimal"' : ''} ${fige ? 'disabled' : ''}>`).join('')}
      ${!collab ? `<label for="ct_livrables">Ce qui est compris (une ligne par élément)</label><textarea id="ct_livrables" rows="5" ${fige ? 'disabled' : ''}>${E((d.livrables || []).join('\n'))}</textarea>
      <label class="ag-check"><input type="checkbox" id="ct_acompte_remb" ${d.acompte_remb ? 'checked' : ''} ${fige ? 'disabled' : ''}> Rembourser l'acompte si le client annule à temps</label>
      <label class="ag-check"><input type="checkbox" id="ct_image_ok" ${d.image_ok !== false ? 'checked' : ''} ${fige ? 'disabled' : ''}> Le client accepte que je montre quelques photos (portfolio, réseaux)</label>
      <label class="ag-check"><input type="checkbox" id="ct_galerie" ${d.galerie !== false ? 'checked' : ''} ${fige ? 'disabled' : ''}> Livraison dans une galerie en ligne</label>` : ''}
      <label for="ct_particulieres">Conditions particulières (facultatif)</label><textarea id="ct_particulieres" rows="3" placeholder="Ex : 2 tenues maximum. Le maquillage est à la charge du client." ${fige ? 'disabled' : ''}>${E(d.particulieres || '')}</textarea>
      ${fige ? '' : `<div class="bg-btns"><button class="btn-primary" style="margin:0" onclick="ctSauver(true)">Enregistrer</button><button class="btn-ghost" style="margin:0" onclick="ctIA('verifier')">${agIcon('sparkles', 14)} Vérifier avec l'IA</button></div>`}
      <div id="ctIAR"></div>`;
  } else if(CT.onglet === 'texte'){
    const A = c.articles && c.articles.length ? c.articles : ctArticles(d.modele, d);
    on.innerHTML = `<div class="ag-hint" style="margin-top:0">Chaque article est modifiable. ${fige ? '' : `<a href="#" onclick="event.preventDefault();ctRegenerer()">Refaire le texte à partir des infos</a>`}</div>
      ${A.map((a, i) => `<div class="ct-art"><input class="ct-at" data-i="${i}" value="${E(a.t)}" ${fige ? 'disabled' : ''}><textarea class="ct-ax" data-i="${i}" rows="${Math.min(10, Math.max(3, Math.ceil(a.x.length / 60)))}" ${fige ? 'disabled' : ''}>${E(a.x)}</textarea></div>`).join('')}
      ${fige ? '' : `<div class="bg-btns"><button class="btn-primary" style="margin:0" onclick="ctSauver(true)">Enregistrer</button><button class="btn-ghost" style="margin:0" onclick="ctIA('expliquer')">Expliquer en mots simples</button></div>`}
      <div id="ctIAR"></div>`;
  } else {
    on.innerHTML = `<div class="ct-prev">${ctDocHtml(Object.assign({}, c, { marque: d.studio }))}</div>
      <div class="ct-acts">
        ${fige ? '' : `<button class="btn-primary" onclick="ctSignerStudio()">${c.signature_studio ? 'Refaire ma signature' : 'Signer (moi, le Studio)'}</button>
        <button class="btn-ghost" onclick="ctSignerIci()">Faire signer le client ici</button>
        <button class="btn-ghost" onclick="ctEnvoyer()">Envoyer au client pour signer (lien)</button>`}
        <button class="btn-ghost" onclick="ctImprimer()">PDF / Imprimer</button>
        ${c.statut !== 'signe' ? `<button class="ct-del" onclick="ctSupprimer()">Supprimer ce contrat</button>` : ''}
      </div>
      ${c.statut === 'envoye' ? `<div class="ag-hint">Lien envoyé au client : ${E(ctLien(c))}<br>Dès qu'il signe, le contrat passe en « Signé ». <a href="#" onclick="event.preventDefault();ctRafraichir()">Vérifier maintenant</a></div>` : ''}`;
  }
}
window.ctOnglet = function(k){ if(CT.ed && CT.ed.statut !== 'signe') ctLire(); CT.onglet = k; ctEdRendre(); };
function ctLire(){
  const c = CT.ed, d = c.donnees;
  const t = document.getElementById('ctTitre'); if(t) c.titre = nd(t.value.trim()) || c.titre;
  let infos = false;
  CHAMPS.forEach(([k, , ty]) => { const el = document.getElementById('ct_' + k); if(el){ const v = ty === 'number' ? (el.value === '' ? '' : Number(el.value)) : nd(el.value.trim()); if(String(d[k] == null ? '' : d[k]) !== String(v)) infos = true; d[k] = v; } });
  const lv = document.getElementById('ct_livrables'); if(lv){ const v = lv.value.split('\n').map(x => nd(x.trim())).filter(Boolean); if(JSON.stringify(v) !== JSON.stringify(d.livrables || [])) infos = true; d.livrables = v; }
  ['acompte_remb', 'image_ok', 'galerie'].forEach(k => { const el = document.getElementById('ct_' + k); if(el){ if(!!d[k] !== el.checked) infos = true; d[k] = el.checked; } });
  const pa = document.getElementById('ct_particulieres'); if(pa){ const v = nd(pa.value.trim()); if((d.particulieres || '') !== v) infos = true; d.particulieres = v; }
  const ats = document.querySelectorAll('#ctOn .ct-at'), axs = document.querySelectorAll('#ctOn .ct-ax');
  if(ats.length){ c.articles = [...ats].map((a, i) => ({ t: nd(a.value.trim()), x: nd((axs[i] || {}).value || '') })); d.texte_modifie = true; }
  // Les infos ont changé et le texte n'a pas été retouché à la main : on refait le texte
  else if(infos && !d.texte_modifie) c.articles = ctArticles(d.modele, d);
}
window.ctRegenerer = async function(){
  if(!await agConfirm('Refaire le texte\nLes articles seront réécrits avec les infos. Tes modifications du texte seront perdues.')) return;
  CT.ed.donnees.texte_modifie = false; CT.ed.articles = ctArticles(CT.ed.donnees.modele, CT.ed.donnees); ctEdRendre();
};
window.ctSauver = async function(toast){
  const c = CT.ed; if(!c) return null;
  if(c.statut !== 'signe') ctLire();
  const r = await dbUpdate('contrats', c.id, { titre: c.titre, donnees: c.donnees, articles: c.articles, signature_studio: c.signature_studio || null, updated_at: new Date().toISOString() });
  if(!r) return null;
  const i = CT.liste.findIndex(x => x.id === c.id); if(i >= 0) CT.liste[i] = r;
  CT.ed = JSON.parse(JSON.stringify(r));
  if(toast) agToast('Contrat enregistré');
  ctEdRendre();
  return r;
};

// ---------- Signatures ----------
function ctPad(titre, nomDef, fn){
  agSheet('ctPad', `<h3>${E(titre)}</h3>
    <label for="ctPNom">Nom</label><input id="ctPNom" value="${E(nomDef || '')}">
    <label>Signature (avec le doigt)</label>
    <canvas id="ctCv" class="ct-cv" width="600" height="220"></canvas>
    <div class="bg-btns"><button class="btn-ghost" style="margin:0" onclick="ctPadEffacer()">Effacer</button><button class="btn-primary" style="margin:0" id="ctPOk">Valider la signature</button></div>`);
  const cv = document.getElementById('ctCv'), g = cv.getContext('2d'); let des = false, vide = true, last = null;
  g.lineWidth = 3.2; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#10302c';
  const pt = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; };
  cv.addEventListener('pointerdown', e => { des = true; last = pt(e); cv.setPointerCapture(e.pointerId); e.preventDefault(); });
  cv.addEventListener('pointermove', e => { if(!des) return; const p = pt(e); g.beginPath(); g.moveTo(last.x, last.y); g.lineTo(p.x, p.y); g.stroke(); last = p; vide = false; e.preventDefault(); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => cv.addEventListener(t, () => { des = false; }));
  window.ctPadEffacer = () => { g.clearRect(0, 0, cv.width, cv.height); vide = true; };
  window.ctPadVide = () => vide;
  document.getElementById('ctPOk').onclick = () => {
    const nom = nd(document.getElementById('ctPNom').value.trim());
    if(!nom){ agAlert('Écris le nom.'); return; }
    if(vide){ agAlert('Signe dans le cadre avec ton doigt.'); return; }
    fn({ nom, image: cv.toDataURL('image/png'), date: new Date().toISOString() });
  };
}
window.ctSignerStudio = function(){
  ctLire();
  ctPad('Ma signature (le Studio)', (CT.ed.signature_studio || {}).nom || 'Henzo', async s => {
    CT.ed.signature_studio = s; agCloseSheet('ctPad');
    if(await ctSauver()) agToast('Signé par le Studio');
  });
};
window.ctSignerIci = function(){
  ctLire();
  ctPad('Signature du client', CT.ed.donnees.client || '', async s => {
    if(!await agConfirm(`${s.nom} a lu et accepte le contrat ?\nUne fois signé, le contrat ne peut plus être modifié.`, { ok: 'Oui, c\'est signé' })) return;
    const c = await ctSauver(); if(!c) return;
    const r = await dbUpdate('contrats', c.id, { signature_client: s, statut: 'signe', signe_le: new Date().toISOString(), updated_at: new Date().toISOString() });
    if(!r) return;
    const i = CT.liste.findIndex(x => x.id === r.id); if(i >= 0) CT.liste[i] = r;
    CT.ed = JSON.parse(JSON.stringify(r)); agCloseSheet('ctPad'); ctEdRendre();
    agToast('Contrat signé par le client');
  });
};
window.ctEnvoyer = async function(){
  const c = await ctSauver(); if(!c) return;
  if(!c.signature_studio && !await agConfirm('Tu n\'as pas encore signé\nEnvoyer quand même ? Tu pourras signer après.', { ok: 'Envoyer' })) return;
  const r = await dbUpdate('contrats', c.id, { statut: 'envoye', envoye_le: new Date().toISOString() });
  if(!r) return;
  const i = CT.liste.findIndex(x => x.id === r.id); if(i >= 0) CT.liste[i] = r; CT.ed = JSON.parse(JSON.stringify(r));
  const d = r.donnees || {}, tel = String(d.client_tel || '').replace(/\D/g, ''), num = tel.length === 10 ? '225' + tel : tel;
  const msg = `Bonjour ${d.client || ''},\nVoici votre contrat pour ${d.prestation || 'votre prestation'}${d.date ? ' du ' + new Date(d.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : ''}.\nLisez-le tranquillement, puis signez avec le doigt en bas de la page :\n${ctLien(r)}\n\nSi une question, je suis là.\n${d.studio || 'Henzo Photographie'}`;
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
  ctEdRendre(); agToast('Lien du contrat envoyé');
};
window.ctRafraichir = async function(){
  const { data } = await sb.from('contrats').select('*').eq('id', CT.ed.id).maybeSingle();
  if(data){ const i = CT.liste.findIndex(x => x.id === data.id); if(i >= 0) CT.liste[i] = data; CT.ed = JSON.parse(JSON.stringify(data)); ctEdRendre(); agToast(data.statut === 'signe' ? 'Le client a signé' : 'Pas encore signé', 'info'); }
};
window.ctImprimer = function(){
  if(CT.ed.statut !== 'signe') ctLire();
  const w = window.open('', '_blank'); if(!w){ agAlert('Autorise les fenêtres pour imprimer.'); return; }
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${E(CT.ed.titre)}</title><style>body{margin:0;background:#e9eeed;padding:16px}${CT_CSS}@media print{body{background:#fff;padding:0}}</style></head><body>${ctDocHtml(Object.assign({}, CT.ed, { marque: CT.ed.donnees.studio }))}<script>setTimeout(function(){window.print()},400)<\/script></body></html>`);
  w.document.close();
};
window.ctSupprimer = async function(){
  if(!await agConfirm(`Supprimer le contrat « ${CT.ed.titre} » ?`)) return;
  if(!await dbDelete('contrats', CT.ed.id)) return;
  CT.liste = CT.liste.filter(x => x.id !== CT.ed.id); CT.ed = null;
  agCloseSheet('ctEd'); ctListe();
};

// ---------- IA ----------
window.ctIA = async function(k){
  ctLire();
  const c = CT.ed, d = c.donnees, el = document.getElementById('ctIAR'); if(el) el.innerHTML = '<div class="ag-empty">L\'IA lit le contrat...</div>';
  const txt = (c.articles || []).map((a, i) => `${i + 1}. ${a.t}\n${a.x}`).join('\n\n');
  const sys = 'Tu aides Henzo, photographe et vidéaste à Bouaké (Côte d\'Ivoire), qui n\'a aucune notion juridique. Français très simple, phrases courtes, tirets simples. Tu n\'es pas avocat : tu le dis en une phrase à la fin et tu conseilles un juriste pour les gros montants.';
  const q = k === 'expliquer'
    ? `Explique ce contrat en mots simples, article par article (une ou deux phrases chacun), comme à un ami. Puis dis en 3 points ce que Henzo doit dire au client à voix haute avant qu'il signe.\n\n${txt}`
    : `Vérifie ce contrat de ${(CT_MODELES[d.modele] || {}).nom || 'prestation'}. Infos : ${JSON.stringify({ client: d.client, date: d.date, lieu: d.lieu, prix: d.prix, acompte: d.acompte_pct, livrables: d.livrables, particulieres: d.particulieres })}.\n\n${txt}\n\nDonne : 1) ce qui manque ou n'est pas clair (maximum 5 points), 2) les risques pour Henzo, 3) des conditions particulières utiles à ajouter, écrites prêtes à copier, chacune sur une ligne qui commence par "+ ".`;
  try {
    const r = await mkAI({ system: sys, messages: [{ role: 'user', text: q }], maxTokens: 1300 });
    let t = String(typeof txtDefancy === 'function' ? txtDefancy(r.text || '') : (r.text || '')).replace(/[–—]/g, '-');
    CT.propositions = t.split('\n').filter(l => /^\s*\+\s+/.test(l)).map(l => l.replace(/^\s*\+\s+/, '').trim());
    if(el) el.innerHTML = `<div class="ap-ia"><div>${E(t).replace(/\n/g, '<br>')}</div>${CT.propositions.length && c.statut !== 'signe' ? `<button class="btn-ghost" style="width:100%;margin-top:8px" onclick="ctAjouterProps()">Ajouter ces conditions au contrat</button>` : ''}</div>`;
  } catch(e){ if(el) el.innerHTML = `<div class="ag-hint warn">L'IA n'a pas pu répondre : ${E(e.message || e)}</div>`; }
};
window.ctAjouterProps = function(){
  const d = CT.ed.donnees, L = CT.propositions || []; if(!L.length) return;
  d.particulieres = [d.particulieres, ...L].filter(Boolean).join('\n');
  if(!d.texte_modifie) CT.ed.articles = ctArticles(d.modele, d);
  else { const A = CT.ed.articles, i = A.findIndex(a => /particuli/i.test(a.t)); if(i >= 0) A[i].x = d.particulieres; else A.splice(A.length - 1, 0, { t: 'Conditions particulières', x: d.particulieres }); }
  CT.onglet = 'infos'; ctEdRendre(); agToast(`${L.length} condition${L.length > 1 ? 's' : ''} ajoutée${L.length > 1 ? 's' : ''} : pense à enregistrer`);
};

// ---------- Entrées ----------
function ctBouton(){
  const pg = document.querySelector('#page-photo .container'); if(!pg || pg.querySelector('.ct-entree')) return;
  const b = document.createElement('div'); b.className = 'crm-fete ct-entree';
  b.onclick = () => ctListe();
  b.innerHTML = `<div class="ic">${agIcon('note')}</div><div class="d"><b>Mes contrats</b><span>Un contrat clair pour chaque séance, mariage ou projet : acompte, annulation, livraison, signature en ligne.</span></div>${agIcon('chev', 16)}`;
  const seg = pg.querySelector(':scope > .seg-bar');
  if(seg) seg.insertAdjacentElement('afterend', b); else pg.insertBefore(b, pg.firstChild);
}
if(typeof showTab === 'function'){
  const tabCt = showTab;
  showTab = function(name){ const r = tabCt.apply(this, arguments); if(name === 'photo') setTimeout(ctBouton, 50); return r; };
}
setTimeout(ctBouton, 1500);
if(window.CA_ITEMS) CA_ITEMS.push({ id: 'contrats', s: 'Séances', t: 'Contrats (séance, mariage, projet)', q: 'Un contrat rempli tout seul à partir d\'une séance : ce qui est compris, acompte, annulation, livraison, droits sur les photos. L\'IA le vérifie et l\'explique. Signature dans l\'app ou par un lien envoyé au client. PDF.', ou: 'Studio > Séances > Mes contrats', m: 'contrat signature signer juridique professionnel mariage acompte annulation', go: ['ctListe', []] });

(function ctCss(){
  if(document.getElementById('ctCss')) return;
  const st = document.createElement('style'); st.id = 'ctCss';
  st.textContent = CT_CSS + `
.ct-list{margin-top:10px}.ct-it{display:flex;align-items:center;gap:10px;padding:12px;border-radius:14px;background:var(--card2);border:1px solid var(--border);margin:8px 0;cursor:pointer}
.ct-it .d{flex:1;min-width:0}.ct-it b{display:block;color:var(--text);font-size:14px}.ct-it span{font-size:12.5px;color:var(--muted)}
.ct-st{flex-shrink:0;font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;background:var(--card);color:var(--muted)}.ct-st.envoye{background:rgba(245,165,36,.16);color:#f5a524}.ct-st.signe{background:rgba(52,199,89,.16);color:#34c759}
.ct-top{display:flex;align-items:center;gap:8px;margin:-4px 0 8px}.ct-top small{color:var(--muted);font-size:12px}
.ct-art{margin:10px 0;padding:10px;border-radius:12px;background:var(--card2)}.ct-art .ct-at{font-weight:700;margin:0 0 6px}.ct-art textarea{margin:0}
.ct-prev{max-height:60vh;overflow:auto;border-radius:14px;border:1px solid var(--border)}.ct-prev .ct-doc{padding:18px 14px;border-radius:0}
.ct-acts{display:flex;flex-direction:column;gap:8px;margin-top:12px}.ct-acts button{margin:0;width:100%}
.ct-del{background:none;border:0;color:#ff6b5a;text-decoration:underline;cursor:pointer;padding:6px}
.ct-cv{width:100%;height:auto;aspect-ratio:600/220;background:#fff;border-radius:12px;touch-action:none;display:block}`;
  document.head.appendChild(st);
})();
})();
