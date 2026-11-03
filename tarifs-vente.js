// ============================================================
// TARIFS-VENTE.JS - Donner envie de réserver (Studio > Tarifs)
// ------------------------------------------------------------
// Réglages pour la page de tarifs publique (tarifs.html) :
// - Pack : prix barré (prix normal avant réduction) -> "Vous économisez".
// - Collection : bonus offert sur un pack (ex : +1 tirage A4 offert) et
//   offre avec une vraie date de fin.
// - Ma page : lien du portfolio ("Voir mon travail"), séances possibles
//   par mois (créneaux restants calculés avec tes vraies séances), pack
//   le plus complet en premier, "Pour seulement +X F...", avis de vrais
//   clients, ton engagement.
// Colonnes : tarifs.prix_barre, tarif_collections.vente, tarif_page.vente.
// Chargé par crm.js après prix.js.
// ============================================================
(function(){
'use strict';
if(typeof PX === 'undefined' || typeof pxPackForm !== 'function') return;
const E = s => agEsc(String(s == null ? '' : s));
const TV = { avis: [] };
window.TV = TV;
const objet = v => { if(typeof v === 'string'){ try { v = JSON.parse(v); } catch(e){ v = null; } } return v && typeof v === 'object' ? v : {}; };
const nd = s => String(s || '').replace(/[–—]/g, '-');

// ---------- Carte d'un pack (aperçu) : prix barré ----------
const carteTv = pxCardHtml;
pxCardHtml = function(t, star){
  let h = carteTv.apply(this, arguments);
  const pb = Number(t && t.prix_barre) || 0;
  if(pb > Number(t.price)) h = h.replace('<div class="px-card-p">', `<div class="px-card-p"><del class="tv-del">${agN(pb)} F</del>`).replace(/(<div class="px-card-p">[\s\S]*?<\/div>)/, `$1<span class="tv-eco">Vous économisez ${agF(pb - Number(t.price))}</span>`);
  return h;
};
const lireTv = pxPfRead;
pxPfRead = function(){ const r = lireTv.apply(this, arguments); const b = document.getElementById('tvBarre'); if(b) r.prix_barre = parseFloat(b.value) || 0; return r; };

// ---------- Fiche d'un pack : prix barré ----------
const formTv = pxPackForm;
pxPackForm = function(id, pre){
  const r = formTv.apply(this, arguments);
  try {
    const t = id ? CRM.tarifs.find(x => x.id === id) : null;
    const prix = document.getElementById('pxPPrice'), row = prix && prix.closest('.crm-2');
    if(row && !document.getElementById('tvBarre')){
      const d = document.createElement('div'); d.className = 'tv-box';
      d.innerHTML = `<label for="tvBarre">Prix barré (facultatif)</label><input id="tvBarre" type="number" inputmode="decimal" value="${t && Number(t.prix_barre) ? Math.round(t.prix_barre) : ''}" placeholder="Ex : 30000" oninput="pxPfPrev();tvBarreInfo()">
        <div class="ag-hint" id="tvBarreInfo" style="margin-top:4px"></div>`;
      row.insertAdjacentElement('afterend', d);
      prix.addEventListener('input', tvBarreInfo);
      tvBarreInfo(); pxPfPrev();
    }
  } catch(e){ console.warn('tv pack', e); }
  return r;
};
window.tvBarreInfo = function(){
  const el = document.getElementById('tvBarreInfo'); if(!el) return;
  const b = parseFloat((document.getElementById('tvBarre') || {}).value) || 0, p = parseFloat((document.getElementById('pxPPrice') || {}).value) || 0;
  el.innerHTML = !b ? 'Le prix normal, avant réduction. Il s\'affiche barré à côté du vrai prix, sur la page et dans le PDF.'
    : b <= p ? '<span style="color:#f5a524">Le prix barré doit être plus grand que le prix.</span>'
    : `Le client voit <s>${agF(b)}</s> <b>${agF(p)}</b> et « Vous économisez ${agF(b - p)} » (${Math.round((b - p) / b * 100)} %).`;
};
const saveTv = pxPackSave;
pxPackSave = async function(id){
  const inp = document.getElementById('tvBarre');
  const barre = inp ? (parseFloat(inp.value) || 0) : undefined;
  const avant = CRM.tarifs.map(x => x.id);
  const r = await saveTv.apply(this, arguments);
  if(barre === undefined) return r;
  try {
    if(document.getElementById('pxPack')) return r; // pas enregistré
    const t = id ? CRM.tarifs.find(x => x.id === id) : CRM.tarifs.find(x => !avant.includes(x.id));
    if(!t) return r;
    const v = barre > 0 ? barre : null;
    if((Number(t.prix_barre) || null) !== v){ await pxUpd('tarifs', t.id, { prix_barre: v }); crmRenderTarifs(); }
  } catch(e){ console.warn('tv barre', e); }
  return r;
};

// ---------- Fiche d'une collection : bonus et offre ----------
const colFormTv = pxColForm;
pxColForm = function(id, focus){
  const r = colFormTv.apply(this, arguments);
  try {
    const c = id ? pxCol(id) : null, V = objet(c && c.vente), b = V.bonus || {}, o = V.offre || {};
    const ps = c ? pxPacks(c.id) : [];
    const btn = document.querySelector('#pxColF .btn-primary'); if(!btn) return r;
    const d = document.createElement('div'); d.className = 'tv-box'; d.id = 'tvCol';
    d.innerHTML = `<h4 class="crm-h4">Donner envie (page de tarifs)</h4>
      <label for="tvBoPack">Bonus offert sur un pack</label>
      <select id="tvBoPack"><option value="">Pas de bonus</option>${ps.map(t => `<option value="${t.id}" ${Number(b.pack_id) === t.id ? 'selected' : ''}>${E(t.name)} (${agF(t.price)})</option>`).join('')}</select>
      ${!c ? '<div class="ag-hint">Enregistre d\'abord la collection et ses packs pour choisir un bonus.</div>' : ''}
      <input id="tvBoTxt" value="${E(b.texte || '')}" placeholder="Ex : 1 tirage A4 offert" style="margin-top:6px">
      <div class="ag-hint">Mets le bonus sur le pack que tu veux faire choisir (souvent celui juste au-dessus du moins cher).</div>
      <label for="tvOfTxt">Offre du moment (facultatif)</label>
      <input id="tvOfTxt" value="${E(o.texte || '')}" placeholder="Ex : -10 % sur tous les packs pour les fêtes">
      <label for="tvOfFin">Jusqu'au</label><input id="tvOfFin" type="date" value="${E(o.fin || '')}">
      <div class="ag-hint">L'offre disparaît toute seule après cette date. Les 7 derniers jours, le client voit « plus que X jours ». Mets une vraie date et tiens-la.</div>`;
    btn.insertAdjacentElement('beforebegin', d);
  } catch(e){ console.warn('tv col', e); }
  return r;
};
const colSaveTv = pxColSave;
pxColSave = async function(id){
  const box = document.getElementById('tvCol');
  let vente = null;
  if(box){
    const pid = Number(document.getElementById('tvBoPack').value) || null, bt = nd(document.getElementById('tvBoTxt').value.trim());
    const ot = nd(document.getElementById('tvOfTxt').value.trim()), of = document.getElementById('tvOfFin').value || null;
    vente = { bonus: pid && bt ? { pack_id: pid, texte: bt } : null, offre: ot ? { texte: ot, fin: of } : null };
  }
  const avant = PX.cols.map(x => x.id);
  const r = await colSaveTv.apply(this, arguments);
  if(!vente) return r;
  try {
    if(document.getElementById('pxColF')) return r;
    const c = id ? pxCol(id) : PX.cols.find(x => !avant.includes(x.id));
    if(!c) return r;
    if(JSON.stringify(objet(c.vente)) !== JSON.stringify(vente)){ await pxUpd('tarif_collections', c.id, { vente }); crmRenderTarifs(); }
  } catch(e){ console.warn('tv col save', e); }
  return r;
};

// ---------- Partager > Ma page : "Donner envie de réserver" ----------
const partTv = pxRenderPartage;
pxRenderPartage = function(el){
  const r = partTv.apply(this, arguments);
  try {
    if(!el) return r;
    const V = objet(PX.page && PX.page.vente);
    TV.avis = (Array.isArray(V.avis) ? V.avis : []).map(a => ({ nom: a.nom || '', texte: a.texte || '' }));
    const secs = [...el.querySelectorAll('.ag-sec')], ref = secs.find(s => /Ma page/.test(s.textContent));
    const d = document.createElement('div'); d.id = 'tvPage';
    d.innerHTML = `<div class="ag-sec"><h3>Donner envie de réserver</h3></div>
      <div class="ag-list" style="padding:4px 16px 14px">
        ${!PX.page ? '<div class="ag-hint">Crée d\'abord ta page (plus bas), puis reviens ici.</div>' : ''}
        <label for="tvPort">Lien de ton portfolio</label><input id="tvPort" type="url" value="${E(V.portfolio || '')}" placeholder="Ex : https://henzostudio.com ou ton Instagram">
        <label for="tvPortT">Texte du bouton</label><input id="tvPortT" value="${E(V.portfolio_txt || '')}" placeholder="Voir mon travail">
        <label for="tvCap">Séances possibles par mois</label><input id="tvCap" type="number" inputmode="numeric" value="${Number(V.capacite) || ''}" placeholder="Ex : 20 (vide = ne pas afficher)">
        <div class="ag-hint">La page affiche les créneaux libres des 3 prochains mois : ce nombre moins tes séances déjà prévues. Ex : « Plus que 4 créneaux libres en décembre ». Les chiffres sont toujours vrais.</div>
        <label class="ag-check"><input type="checkbox" id="tvPrem" ${V.premium ? 'checked' : ''}> Montrer le pack le plus complet en premier</label>
        <div class="ag-hint" style="margin-top:-2px">À côté du grand pack, celui du milieu paraît plus raisonnable. Pense aussi à « Le plus choisi » dans la fiche du pack.</div>
        <label class="ag-check"><input type="checkbox" id="tvEco" ${V.economies !== false ? 'checked' : ''}> Afficher « Vous économisez X F » (packs avec un prix barré)</label>
        <label class="ag-check"><input type="checkbox" id="tvMont" ${V.montee !== false ? 'checked' : ''}> Quand le client choisit un pack : « Pour seulement +X F, passez au pack au-dessus » avec ce qu'il gagne en plus</label>
        <label for="tvGar">Ton engagement (facultatif)</label><textarea id="tvGar" rows="2" placeholder="Ex : Si une photo ne vous plaît pas, nous refaisons la retouche gratuitement.">${E(V.garantie || '')}</textarea>
        <label>Avis de vrais clients (facultatif, 6 au plus)</label>
        <div id="tvAvis"></div>
        <button class="crm-link" onclick="tvAvisAjout()">+ Ajouter un avis</button>
        <div class="ag-hint">Copie ce que tes clients t'ont vraiment écrit (WhatsApp, Facebook), avec leur accord.</div>
        <button class="btn-primary" style="margin-top:12px" onclick="tvSavePage()">Enregistrer</button>
        ${typeof pxLink === 'function' && pxLink() ? `<button class="btn-secondary" style="margin-top:8px" onclick="pxOpen(pxLink())">${agIcon('eye', 15)} Voir ma page</button>` : ''}
      </div>`;
    if(ref) ref.insertAdjacentElement('beforebegin', d); else el.appendChild(d);
    tvAvisRender();
  } catch(e){ console.warn('tv partage', e); }
  return r;
};
function tvAvisSync(){ document.querySelectorAll('#tvAvis .tv-av').forEach((row, k) => { if(TV.avis[k]){ TV.avis[k].nom = row.querySelector('.n').value; TV.avis[k].texte = row.querySelector('.t').value; } }); }
function tvAvisRender(){
  const el = document.getElementById('tvAvis'); if(!el) return;
  el.innerHTML = TV.avis.map((a, k) => `<div class="tv-av"><input class="n" value="${E(a.nom)}" placeholder="Prénom (ex : Awa K.)"><textarea class="t" rows="2" placeholder="Ce que le client a dit">${E(a.texte)}</textarea><button class="ag-ibtn" title="Retirer" onclick="tvAvisDel(${k})">${agIcon('trash', 14)}</button></div>`).join('');
}
window.tvAvisAjout = function(){ tvAvisSync(); if(TV.avis.length >= 6){ agToast('6 avis au plus', 'info'); return; } TV.avis.push({ nom: '', texte: '' }); tvAvisRender(); };
window.tvAvisDel = function(k){ tvAvisSync(); TV.avis.splice(k, 1); tvAvisRender(); };
window.tvSavePage = async function(){
  if(!PX.page){ agAlert('Crée d\'abord ta page (bouton « Créer ma page » plus bas).'); return; }
  tvAvisSync();
  const g = id => (document.getElementById(id) || {}).value || '';
  let port = g('tvPort').trim(); if(port && !/^https?:\/\//i.test(port)) port = 'https://' + port.replace(/^@/, 'instagram.com/');
  const vente = { portfolio: port, portfolio_txt: nd(g('tvPortT').trim()), capacite: Math.max(0, parseInt(g('tvCap')) || 0),
    premium: document.getElementById('tvPrem').checked, economies: document.getElementById('tvEco').checked, montee: document.getElementById('tvMont').checked,
    garantie: nd(g('tvGar').trim()), avis: TV.avis.map(a => ({ nom: nd(a.nom.trim()), texte: nd(a.texte.trim()) })).filter(a => a.texte).slice(0, 6) };
  const { error } = await sb.from('tarif_page').update({ vente }).eq('user_id', PX.page.user_id || await pxUid());
  if(error){ agAlert('Erreur : ' + error.message); return; }
  PX.page.vente = vente; agToast('Enregistré : ta page de tarifs est à jour');
};

(function tvCss(){
  if(document.getElementById('tvCss')) return;
  const st = document.createElement('style'); st.id = 'tvCss';
  st.textContent = `.tv-box{margin-top:8px}.tv-del{display:block;font-size:12px;font-weight:600;opacity:.6;text-decoration:line-through}
.tv-eco{display:inline-block;margin:2px 0 6px;font-size:11px;font-weight:700;color:#0b3d2e;background:#7ee0a8;padding:2px 8px;border-radius:99px}
.tv-av{display:grid;grid-template-columns:1fr auto;gap:6px;margin:6px 0;padding:8px;border-radius:12px;background:var(--card2)}
.tv-av .n{grid-column:1}.tv-av .t{grid-column:1;margin:0}.tv-av .ag-ibtn{grid-column:2;grid-row:1/3;align-self:center}`;
  document.head.appendChild(st);
})();
})();
