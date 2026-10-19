// ============================================================
// SUPER APP HENZO - TARIFS, DEVIS, CONSEILLER IA, PAGE PUBLIQUE
// - Grille : formules + options/supplements (exterieur, personne en plus, tirage A4...)
// - Devis : calculateur, envoi WhatsApp, historique accepte/refuse
// - L'app apprend de tes devis (lignes que tu factures souvent)
// - Conseiller IA : questions sur le marche de Bouake, test d'une idee de prix,
//   analyse complete, propositions d'options a ajouter
// - Page publique de tarifs (lien a envoyer) + export PDF
// ============================================================

const PX = { view: 'grille', devis: [], page: null, loaded: false, q: null, mq: null, idea: '', ideaRes: '', sugg: null };
const PX_UNITS = { fixe: 'Prix fixe', personne: 'par personne', tirage: 'par tirage', photo: 'par photo', heure: 'par heure', tenue: 'par tenue' };

async function pxLoad(){
  if(!CRM.loaded) await crmLoad();
  try {
    const [d, p] = await Promise.all([
      sb.from('devis').select('*').order('created_at', { ascending: false }),
      sb.from('tarif_page').select('*').maybeSingle()
    ]);
    PX.devis = d.data || []; PX.page = p.data || null;
  } catch(e){ console.warn('prix load', e); }
  PX.loaded = true;
}
const pxFormules = () => CRM.tarifs.filter(t => (t.kind || 'formule') === 'formule');
const pxOptions = () => CRM.tarifs.filter(t => t.kind === 'option');
function pxUnit(t){ return t.unit && t.unit !== 'fixe' ? ' ' + (PX_UNITS[t.unit] || t.unit) : ''; }
function pxShare(){ const i = CRM.info; return Number(i.seances) ? (Number(i.charges) || 0) / Number(i.seances) : 0; }
function pxMinutes(t){ return (Number(t.duration_min) || 0) + (Number(t.edit_min) || 0) + (Number(t.travel_min) || 0); }
function pxHourly(t){
  const m = pxMinutes(t); if(!m) return null;
  return (Number(t.price) - (Number(t.cost) || 0) - (t.kind === 'option' ? 0 : pxShare())) / (m / 60);
}
function pxTypeStats(){
  const m = {}, now = crmNow(), since = new Date(now - 365 * crmDay);
  (shoots || []).filter(s => !crmCancelled(s) && s.date && new Date(s.date) >= since && new Date(s.date) <= now).forEach(s => {
    const k = s.type || 'Autre';
    (m[k] = m[k] || { n: 0, sum: 0, min: Infinity, max: 0 });
    const p = Number(s.price) || 0;
    m[k].n++; m[k].sum += p; m[k].min = Math.min(m[k].min, p); m[k].max = Math.max(m[k].max, p);
  });
  return Object.entries(m).map(([k, v]) => ({ type: k, ...v, avg: v.n ? v.sum / v.n : 0 })).sort((a, b) => b.n - a.n);
}
function pxLink(){ return PX.page && PX.page.slug ? `${location.origin}/tarifs.html?s=${encodeURIComponent(PX.page.slug)}` : ''; }

// ============================================================
// PAGE
// ============================================================
function crmTBody(){ return document.getElementById('crmTarifsBody'); }
async function crmRenderTarifs(){
  const el = crmTBody(); if(!el) return;
  if(!PX.loaded){ el.innerHTML = '<div class="ag-empty">Chargement...</div>'; await pxLoad(); }
  const f = pxFormules(), o = pxOptions(), info = CRM.info;
  const acc = PX.devis.filter(d => d.status === 'accepte').length, ref = PX.devis.filter(d => d.status === 'refuse').length;
  const views = [['grille', 'Ma grille'], ['devis', 'Devis'], ['conseil', 'Conseiller IA'], ['partage', 'Partager']];
  el.innerHTML = `
    <div class="ag-total">
      <div class="lbl">Tarifs et devis</div>
      <div class="amt">${f.length} <small>formule${f.length > 1 ? 's' : ''} · ${o.length} option${o.length > 1 ? 's' : ''}</small></div>
      <div class="split"><div>Devis faits<b>${PX.devis.length}</b></div><div>Acceptés<b>${acc + ref ? Math.round(acc / (acc + ref) * 100) + ' %' : '-'}</b></div><div>Objectif / mois<b>${info.objectif ? agF(info.objectif) : '-'}</b></div></div>
    </div>
    <div class="ag-pills px-tabs">${views.map(([k, n]) => `<button class="${PX.view === k ? 'on' : ''}" onclick="PX.view='${k}';crmRenderTarifs()">${n}</button>`).join('')}</div>
    <div id="pxView"></div>`;
  const v = document.getElementById('pxView');
  if(PX.view === 'devis') pxRenderDevis(v);
  else if(PX.view === 'conseil') pxRenderConseil(v);
  else if(PX.view === 'partage') pxRenderPartage(v);
  else pxRenderGrille(v);
}

// ---------- Ma grille ----------
function pxLearned(){
  const m = {};
  PX.devis.forEach(d => (d.items || []).filter(i => i.custom).forEach(i => {
    const k = String(i.name || '').trim().toLowerCase(); if(!k) return;
    (m[k] = m[k] || { name: i.name.trim(), n: 0, sum: 0 });
    m[k].n++; m[k].sum += Number(i.price) || 0;
  }));
  const known = new Set(CRM.tarifs.map(t => String(t.name).trim().toLowerCase()));
  return Object.values(m).filter(x => x.n >= 2 && !known.has(x.name.toLowerCase())).map(x => ({ ...x, avg: Math.round(x.sum / x.n / 500) * 500 }));
}
function pxRenderGrille(el){
  const f = pxFormules(), o = pxOptions(), share = pxShare();
  const cats = [...new Set(f.map(t => t.category || 'Autres'))];
  const learned = pxLearned();
  const row = t => {
    const h = pxHourly(t), net = Number(t.price) - (Number(t.cost) || 0) - (t.kind === 'option' ? 0 : share);
    const marge = t.price ? Math.round(net / t.price * 100) : 0;
    const det = [t.duration_min ? t.duration_min + ' min' : '', t.photo_count ? t.photo_count + ' photos' : '', t.includes || ''].filter(Boolean).join(' · ');
    return `<div class="crm-row ${t.active === false ? 'off' : ''}" onclick="pxForm(${t.id})">
      <div class="d"><b>${agEsc(t.name)}${t.public === false ? ' <i class="px-hid">masqué</i>' : ''}</b><span>${agEsc(det || (t.kind === 'option' ? (PX_UNITS[t.unit] || 'Prix fixe') : 'Toucher pour détailler'))}</span>
      ${(t.cost || share || h) && t.kind !== 'option' ? `<span class="crm-marge ${marge < 30 ? 'bad' : marge < 50 ? 'mid' : 'good'}">Marge ${marge} %${h != null ? ' · ' + agF(h) + ' / heure' : ''}</span>` : ''}</div>
      <div class="m">${t.kind === 'option' ? '+' : ''}${agF(t.price)}<span class="px-u">${agEsc(pxUnit(t))}</span></div></div>`;
  };
  el.innerHTML = `
    <div class="ag-actions" style="grid-template-columns:repeat(3,1fr)">
      <button class="ag-act main" onclick="pxForm(null,{kind:'formule'})"><span>${agIcon('plus')}</span>Formule</button>
      <button class="ag-act" onclick="pxForm(null,{kind:'option'})"><span>${agIcon('plus')}</span>Option</button>
      <button class="ag-act" onclick="crmTarifInfo()"><span>${agIcon('settings')}</span>Mes chiffres</button>
    </div>
    ${!CRM.info.charges ? `<div class="crm-fete" onclick="crmTarifInfo()"><div class="ic">${agIcon('info')}</div><div class="d"><b>Renseigne tes chiffres</b><span>Charges du mois et nombre de séances : l'app calcule ta vraie marge et ton gain par heure</span></div>${agIcon('chev', 16)}</div>` : ''}
    ${learned.map(x => `<div class="crm-fete" onclick="pxForm(null,{kind:'option',name:${agEsc(JSON.stringify(x.name))},price:${x.avg}})"><div class="ic">${agIcon('sparkles')}</div><div class="d"><b>Tu factures souvent "${agEsc(x.name)}"</b><span>${x.n} fois dans tes devis, ${agF(x.avg)} en moyenne. Ajoute-le à ta grille.</span></div>${agIcon('plus', 16)}</div>`).join('')}
    ${!f.length && !o.length ? `<div class="ag-list"><div class="ag-empty">Ta grille est vide.<br>Commence avec ce que tu factures déjà : shooting studio, supplément extérieur...</div>
      <button class="btn-primary" style="width:100%;margin-bottom:12px" onclick="pxStarter()">Créer ma grille de départ</button></div>` : ''}
    ${cats.map(cat => `<div class="ag-sec"><h3>${agEsc(cat)}</h3></div><div class="ag-list">${f.filter(t => (t.category || 'Autres') === cat).map(row).join('')}</div>`).join('')}
    ${o.length ? `<div class="ag-sec"><h3>Options et suppléments</h3></div><div class="ag-list">${o.map(row).join('')}</div>` : ''}
    ${pxTypeStats().length ? `<div class="ag-sec"><h3>Ce que tes clients paient vraiment</h3><span class="crm-count">12 mois</span></div>
    <div class="ag-list">${pxTypeStats().map(x => `<div class="crm-line"><div><b>${agEsc(x.type)}</b><span>${x.n} séance${x.n > 1 ? 's' : ''} · de ${agF(x.min)} à ${agF(x.max)}</span></div><b>${agF(x.avg)}</b></div>`).join('')}</div>` : ''}
    ${pxObjectif()}`;
}
function pxObjectif(){
  const info = CRM.info, obj = Number(info.objectif) || 0;
  const st = pxTypeStats(), n = st.reduce((a, x) => a + x.n, 0);
  const moy = n ? st.reduce((a, x) => a + x.sum, 0) / n : (pxFormules()[0] ? Number(pxFormules()[0].price) : 0);
  if(!obj || !moy) return '';
  const need = Math.ceil((obj + (Number(info.charges) || 0)) / moy);
  return `<div class="ag-sec"><h3>Pour atteindre ton objectif</h3></div>
    <div class="ag-list crm-sim"><p>Avec un prix moyen de <b>${agF(moy)}</b>, il te faut <b>${need} séances par mois</b> pour gagner ${agF(obj)} après tes charges.</p>
    <p>Avec +10 % sur tes prix : <b>${Math.ceil((obj + (Number(info.charges) || 0)) / (moy * 1.1))} séances</b>. Avec +5 000 F d'options en moyenne : <b>${Math.ceil((obj + (Number(info.charges) || 0)) / (moy + 5000))} séances</b>.</p></div>`;
}
async function pxStarter(){
  const { data: u } = await sb.auth.getUser();
  const rows = [
    { name: 'Shooting studio', category: 'Studio', kind: 'formule', price: 15000, duration_min: 30, edit_min: 30, position: 0 },
    { name: 'Supplément extérieur', kind: 'option', unit: 'fixe', price: 5000, travel_min: 45, position: 1 }
  ].map(r => ({ ...r, user_id: u.user.id, active: true, public: true }));
  const { data, error } = await sb.from('tarifs').insert(rows).select();
  if(error){ alert(error.message); return; }
  CRM.tarifs.push(...(data || []));
  agToast('Grille créée : modifie ou complète-la');
  crmRenderTarifs();
}

function pxForm(id, pre){
  pre = pre || {};
  const t = id ? CRM.tarifs.find(x => x.id === id) : null;
  const kind = t ? (t.kind || 'formule') : (pre.kind || 'formule');
  const cats = [...new Set(['Studio', 'Extérieur', 'Anniversaire', 'Mariage', 'Grossesse', 'Famille', 'Groupe', 'Événement', 'Vidéo', 'Impression', ...CRM.tarifs.map(x => x.category).filter(Boolean)])];
  const val = (k, d) => t ? (t[k] == null ? '' : t[k]) : (pre[k] != null ? pre[k] : (d || ''));
  agSheet('crmTarif', `
    <h3>${t ? 'Modifier' : kind === 'option' ? 'Nouvelle option' : 'Nouvelle formule'}</h3>
    <div class="ag-pills" id="pxKind"><button data-k="formule" class="${kind === 'formule' ? 'on' : ''}" onclick="agPick(this);pxKindUi()">Formule</button><button data-k="option" class="${kind === 'option' ? 'on' : ''}" onclick="agPick(this);pxKindUi()">Option / supplément</button></div>
    <label>Nom</label><input id="crmTName" value="${agEsc(val('name'))}" placeholder="${kind === 'option' ? 'Ex : Supplément extérieur, Tirage A4, Personne en plus' : 'Ex : Shooting studio solo'}">
    <div class="px-f"><label>Catégorie</label><input id="crmTCat" list="crmTCats" value="${agEsc(val('category'))}" placeholder="Ex : Studio"><datalist id="crmTCats">${cats.map(c => `<option value="${agEsc(c)}">`).join('')}</datalist></div>
    <div class="crm-2"><div><label>Prix (FCFA)</label><input id="crmTPrice" type="number" inputmode="decimal" value="${val('price')}"></div>
      <div class="px-o"><label>Compté</label><select id="pxUnit">${Object.entries(PX_UNITS).map(([k, n]) => `<option value="${k}" ${(val('unit') || 'fixe') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div></div>
    <label>Ce que ça te coûte (FCFA)</label><input id="crmTCost" type="number" inputmode="decimal" value="${val('cost')}" placeholder="Maquillage, transport, papier, encre...">
    <label>Temps passé (minutes)</label>
    <div class="crm-2 px-3"><div><span class="px-mini">Séance</span><input id="crmTDur" type="number" value="${val('duration_min')}"></div><div><span class="px-mini">Retouche</span><input id="pxEdit" type="number" value="${val('edit_min')}"></div><div><span class="px-mini">Trajet</span><input id="pxTravel" type="number" value="${val('travel_min')}"></div></div>
    <div class="px-f"><label>Photos livrées</label><input id="crmTPh" type="number" value="${val('photo_count')}"></div>
    <label>Ce qui est inclus / détails</label><input id="crmTInc" value="${agEsc(val('includes'))}" placeholder="Ex : 2 tenues, retouche, 1 tirage A4">
    <label class="ag-check"><input type="checkbox" id="crmTAct" ${!t || t.active !== false ? 'checked' : ''}> Proposé en ce moment</label>
    <label class="ag-check"><input type="checkbox" id="pxPub" ${!t || t.public !== false ? 'checked' : ''}> Visible sur ma page de tarifs</label>
    <div class="ag-hint" id="pxCalc"></div>
    <button class="btn-primary" onclick="pxSave(${t ? t.id : 'null'})">Enregistrer</button>
    ${t ? `<button class="btn-danger" style="width:100%;padding:12px;margin-top:8px" onclick="crmTarifDelete(${t.id})">Supprimer</button>` : ''}`);
  pxKindUi();
  ['crmTPrice', 'crmTCost', 'crmTDur', 'pxEdit', 'pxTravel'].forEach(i => document.getElementById(i).addEventListener('input', pxCalcUi));
  pxCalcUi();
}
function pxKindUi(){
  const k = document.querySelector('#pxKind button.on').dataset.k;
  document.querySelectorAll('#crmTarif .px-f').forEach(e => e.style.display = k === 'formule' ? '' : 'none');
  document.querySelectorAll('#crmTarif .px-o').forEach(e => e.style.display = k === 'option' ? '' : 'none');
  pxCalcUi();
}
function pxCalcUi(){
  const g = i => parseFloat((document.getElementById(i) || {}).value) || 0;
  const k = document.querySelector('#pxKind button.on').dataset.k;
  const price = g('crmTPrice'), cost = g('crmTCost'), m = g('crmTDur') + g('pxEdit') + g('pxTravel');
  const share = k === 'formule' ? pxShare() : 0, net = price - cost - share;
  const box = document.getElementById('pxCalc'); if(!box) return;
  if(!price){ box.textContent = ''; return; }
  box.innerHTML = `Tu gagnes vraiment <b>${agF(net)}</b>${share ? ` (après ${agF(share)} de charges fixes par séance)` : ''}${m ? `, soit <b>${agF(net / (m / 60))} par heure</b> de travail (${m} min au total)` : ''}.`;
}
async function pxSave(id){
  const v = k => (document.getElementById(k) || {}).value?.trim?.() || '';
  const kind = document.querySelector('#pxKind button.on').dataset.k;
  const data = {
    kind, name: v('crmTName'), category: kind === 'formule' ? (v('crmTCat') || null) : 'Options',
    price: parseFloat(v('crmTPrice')) || 0, cost: parseFloat(v('crmTCost')) || 0,
    unit: kind === 'option' ? v('pxUnit') : null,
    duration_min: parseInt(v('crmTDur')) || null, edit_min: parseInt(v('pxEdit')) || null, travel_min: parseInt(v('pxTravel')) || null,
    photo_count: kind === 'formule' ? (parseInt(v('crmTPh')) || null) : null, includes: v('crmTInc') || null,
    active: document.getElementById('crmTAct').checked, public: document.getElementById('pxPub').checked
  };
  if(!data.name){ alert('Donne un nom'); return; }
  try {
    if(id){
      const { data: r, error } = await sb.from('tarifs').update(data).eq('id', id).select().single();
      if(error) throw error; Object.assign(CRM.tarifs.find(x => x.id === id), r || data);
    } else {
      const { data: u } = await sb.auth.getUser();
      const { data: r, error } = await sb.from('tarifs').insert({ ...data, user_id: u.user.id, position: CRM.tarifs.length }).select().single();
      if(error) throw error; CRM.tarifs.push(r);
    }
  } catch(e){ alert('Erreur : ' + (e.message || e)); return; }
  agCloseSheet('crmTarif'); agToast('Enregistré'); crmRenderTarifs();
}
async function crmTarifDelete(id){
  if(!await agConfirm('Supprimer cette ligne de ta grille ?')) return;
  const { error } = await sb.from('tarifs').delete().eq('id', id);
  if(error){ alert(error.message); return; }
  CRM.tarifs = CRM.tarifs.filter(x => x.id !== id); agCloseSheet('crmTarif'); crmRenderTarifs();
}
function crmTarifInfo(){
  const i = CRM.info;
  agSheet('crmInfo', `
    <h3>Mes chiffres</h3>
    <div class="ag-hint">Ils servent à calculer ta vraie marge, ton gain par heure, et à conseiller l'IA. Mets des valeurs approximatives si tu ne sais pas.</div>
    <label>Charges fixes par mois (FCFA)</label><input id="crmICh" type="number" value="${i.charges || ''}" placeholder="Loyer + électricité + internet + crédit...">
    <label>Séances par mois en moyenne</label><input id="crmISe" type="number" value="${i.seances || ''}" placeholder="Ex : 12">
    <label>Combien tu veux gagner par mois (après charges)</label><input id="crmIOb" type="number" value="${i.objectif || ''}" placeholder="Ex : 300000">
    <label>Matériel</label><input id="crmIMat" value="${agEsc(i.materiel || '')}" placeholder="Ex : Canon R6, 2 flashs, fond papier, imprimante">
    <label>Concurrents et leurs prix (si tu sais)</label><textarea id="crmICo" rows="3" placeholder="Ex : Studio X fait le solo à 10 000 F">${agEsc(i.concurrents || '')}</textarea>
    <label>Ta clientèle</label><input id="crmICl" value="${agEsc(i.clientele || '')}" placeholder="Ex : étudiantes, mamans, entreprises">
    <button class="btn-primary" onclick="crmTarifInfoSave()">Enregistrer</button>`);
}
async function crmTarifInfoSave(){
  const v = k => document.getElementById(k).value.trim();
  CRM.info = Object.assign({}, CRM.info, { charges: parseFloat(v('crmICh')) || 0, seances: parseFloat(v('crmISe')) || 0, objectif: parseFloat(v('crmIOb')) || 0,
    materiel: v('crmIMat'), concurrents: v('crmICo'), clientele: v('crmICl') });
  await crmSavePrefs({ tarif_info: CRM.info });
  agCloseSheet('crmInfo'); agToast('Chiffres enregistrés'); crmRenderTarifs();
}

// ---------- Devis ----------
function pxNewQuote(){ PX.q = { clientId: null, clientName: '', f: {}, o: {}, customs: [], disc: 'none', discVal: 0, promoId: null, note: '' }; }
function pxCompute(){
  const q = PX.q, lines = [];
  let minutes = 0, cost = 0;
  Object.entries(q.f).forEach(([id, n]) => { const t = CRM.tarifs.find(x => x.id === Number(id)); if(t && n > 0){ lines.push({ id: t.id, name: t.name, qty: n, price: Number(t.price) }); minutes += pxMinutes(t) * n; cost += (Number(t.cost) || 0) * n + pxShare() * n; } });
  Object.entries(q.o).forEach(([id, n]) => { const t = CRM.tarifs.find(x => x.id === Number(id)); if(t && n > 0){ lines.push({ id: t.id, name: t.name + (t.unit && t.unit !== 'fixe' ? ' (' + PX_UNITS[t.unit] + ')' : ''), qty: n, price: Number(t.price), option: true }); minutes += pxMinutes(t) * n; cost += (Number(t.cost) || 0) * n; } });
  q.customs.filter(c => c.name && c.price).forEach(c => lines.push({ name: c.name, qty: c.qty || 1, price: Number(c.price), custom: true }));
  const subtotal = lines.reduce((a, l) => a + l.qty * l.price, 0);
  let discount = 0, discLabel = '';
  if(q.disc === 'percent'){ discount = subtotal * (Number(q.discVal) || 0) / 100; discLabel = `Remise ${q.discVal} %`; }
  if(q.disc === 'amount'){ discount = Number(q.discVal) || 0; discLabel = 'Remise'; }
  if(q.disc === 'promo'){ const p = CRM.promos.find(x => x.id === q.promoId); if(p){ discount = p.kind === 'amount' ? Number(p.value) : subtotal * Number(p.value) / 100; discLabel = `Code ${p.code}`; } }
  discount = Math.min(Math.round(discount), subtotal);
  const total = subtotal - discount;
  return { lines, subtotal, discount, discLabel, total, minutes, cost, gain: total - cost };
}
function pxQuoteText(r){
  const q = PX.q, name = q.clientId ? (((clients || []).find(c => c.id === q.clientId)) || {}).name : q.clientName;
  return `HENZO STUDIO - Devis\n${name ? 'Pour : ' + name + '\n' : ''}Date : ${crmDate(new Date())}\n\n` +
    r.lines.map(l => `- ${l.name}${l.qty > 1 ? ' x' + l.qty : ''} : ${agN(l.price * l.qty)} F`).join('\n') +
    (r.discount ? `\n\nSous-total : ${agN(r.subtotal)} F\n${r.discLabel} : -${agN(r.discount)} F` : '') +
    `\n\nTOTAL : ${agN(r.total)} F` + (q.note ? `\n\n${q.note}` : '') + (PX.page && PX.page.notes ? `\n\n${PX.page.notes}` : '') +
    `\n\nHenzo Studio - Ahougnansou, en face du Restaurant Le Rosier, Bouaké`;
}
function pxRenderDevis(el){
  if(!PX.q) pxNewQuote();
  const q = PX.q, f = pxFormules().filter(t => t.active !== false), o = pxOptions().filter(t => t.active !== false);
  const r = pxCompute();
  const promos = CRM.promos.filter(p => crmPromoState(p) === 'Actif');
  const step = (kind, t) => { const n = q[kind][t.id] || 0; return `<div class="px-step"><button onclick="pxQty('${kind}',${t.id},-1)">-</button><b>${n}</b><button onclick="pxQty('${kind}',${t.id},1)">+</button></div>`; };
  el.innerHTML = `
    ${!f.length ? `<div class="ag-list"><div class="ag-empty">Ajoute d'abord tes formules dans "Ma grille".</div></div>` : ''}
    <div class="ag-sec"><h3>Nouveau devis</h3>${Object.keys(q.f).length || Object.keys(q.o).length || q.customs.length ? `<button class="crm-link" onclick="pxNewQuote();crmRenderTarifs()">Effacer</button>` : ''}</div>
    <div class="ag-list" style="padding-top:12px;padding-bottom:12px">
      <label style="margin-top:0">Client</label>
      <select onchange="PX.q.clientId=this.value?Number(this.value):null;crmRenderTarifs()"><option value="">Nouveau client / autre</option>${(clients || []).slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => `<option value="${c.id}" ${c.id === q.clientId ? 'selected' : ''}>${agEsc(c.name)}</option>`).join('')}</select>
      ${q.clientId ? '' : `<input placeholder="Nom du client" value="${agEsc(q.clientName)}" oninput="PX.q.clientName=this.value" style="margin-top:8px">`}
    </div>
    ${f.length ? `<div class="ag-sec"><h3>Formules</h3></div><div class="ag-list">${f.map(t => `<div class="px-line"><div class="d"><b>${agEsc(t.name)}</b><span>${agF(t.price)}</span></div>${step('f', t)}</div>`).join('')}</div>` : ''}
    ${o.length ? `<div class="ag-sec"><h3>Options</h3></div><div class="ag-list">${o.map(t => `<div class="px-line"><div class="d"><b>${agEsc(t.name)}</b><span>+${agF(t.price)}${agEsc(pxUnit(t))}</span></div>${step('o', t)}</div>`).join('')}</div>` : ''}
    <div class="ag-sec"><h3>Autre ligne</h3><button class="crm-link" onclick="PX.q.customs.push({name:'',price:'',qty:1});crmRenderTarifs()">+ Ajouter</button></div>
    ${q.customs.length ? `<div class="ag-list" style="padding-top:10px;padding-bottom:10px">${q.customs.map((c, i) => `<div class="px-custom"><input placeholder="Ex : Photo de groupe" value="${agEsc(c.name)}" oninput="PX.q.customs[${i}].name=this.value"><input type="number" placeholder="Prix" value="${agEsc(c.price)}" oninput="PX.q.customs[${i}].price=this.value" onchange="crmRenderTarifs()"><button class="ag-ibtn" onclick="PX.q.customs.splice(${i},1);crmRenderTarifs()">${agIcon('trash', 15)}</button></div>`).join('')}
      <div class="ag-hint" style="margin-top:6px">Les lignes que tu ajoutes souvent ici te seront proposées pour ta grille.</div></div>` : ''}
    <div class="ag-sec"><h3>Remise</h3></div>
    <div class="ag-pills">${[['none', 'Aucune'], ['percent', 'En %'], ['amount', 'En FCFA'], ...(promos.length ? [['promo', 'Code promo']] : [])].map(([k, n]) => `<button class="${q.disc === k ? 'on' : ''}" onclick="PX.q.disc='${k}';crmRenderTarifs()">${n}</button>`).join('')}</div>
    ${q.disc === 'percent' || q.disc === 'amount' ? `<input type="number" value="${q.discVal || ''}" placeholder="${q.disc === 'percent' ? 'Ex : 10' : 'Ex : 2000'}" onchange="PX.q.discVal=this.value;crmRenderTarifs()" style="margin-top:8px">` : ''}
    ${q.disc === 'promo' ? `<select onchange="PX.q.promoId=Number(this.value);crmRenderTarifs()" style="margin-top:8px"><option value="">Choisir</option>${promos.map(p => `<option value="${p.id}" ${p.id === q.promoId ? 'selected' : ''}>${agEsc(p.code + ' - ' + crmPromoValue(p))}</option>`).join('')}</select>` : ''}
    <label>Note (acompte, date, conditions)</label><input value="${agEsc(q.note)}" oninput="PX.q.note=this.value" placeholder="Ex : Acompte de 50 % pour réserver">
    <div class="px-total">
      <div class="px-total-h"><span>Total</span><b>${agF(r.total)}</b></div>
      ${r.discount ? `<div class="px-total-l"><span>Sous-total</span><span>${agF(r.subtotal)}</span></div><div class="px-total-l"><span>${agEsc(r.discLabel)}</span><span>-${agF(r.discount)}</span></div>` : ''}
      <div class="px-total-l"><span>Ce que tu gagnes vraiment</span><span>${agF(r.gain)}</span></div>
      ${r.minutes ? `<div class="px-total-l"><span>Temps de travail</span><span>${Math.floor(r.minutes / 60)} h ${String(r.minutes % 60).padStart(2, '0')} · ${agF(r.gain / (r.minutes / 60))} / heure</span></div>` : ''}
    </div>
    <div class="crm-btns">
      <button class="btn-primary" ${r.lines.length ? '' : 'disabled'} onclick="pxSendQuote()">${agIcon('chat', 16)} Envoyer sur WhatsApp</button>
      <div class="crm-2"><button class="btn-secondary" ${r.lines.length ? '' : 'disabled'} onclick="crmCopy(pxQuoteText(pxCompute()))">Copier</button><button class="btn-secondary" ${r.lines.length ? '' : 'disabled'} onclick="pxSaveQuote(false)">Enregistrer</button></div>
    </div>
    <div class="ag-sec"><h3>Mes devis</h3>${PX.devis.length ? `<span class="crm-count">${PX.devis.length}</span>` : ''}</div>
    <div class="ag-list">${PX.devis.length ? PX.devis.slice(0, 30).map(d => `
      <div class="crm-row" onclick="pxOpenQuote(${d.id})"><div class="d"><b>${agEsc(d.client_name || 'Client')}</b><span>${crmDate(d.created_at)} · ${(d.items || []).map(i => i.name).join(', ')}</span></div>
      <div class="m">${agF(d.total)}<span class="crm-st st-${d.status === 'accepte' ? 'Actif' : ''}">${{ envoye: 'Envoyé', accepte: 'Accepté', refuse: 'Refusé' }[d.status] || d.status}</span></div></div>`).join('') : '<div class="ag-empty">Aucun devis pour le moment.</div>'}</div>`;
}
function pxQty(kind, id, d){ const q = PX.q; q[kind][id] = Math.max(0, (q[kind][id] || 0) + d); if(!q[kind][id]) delete q[kind][id]; crmRenderTarifs(); }
async function pxSaveQuote(silent){
  const r = pxCompute(), q = PX.q;
  if(!r.lines.length) return null;
  const name = q.clientId ? (((clients || []).find(c => c.id === q.clientId)) || {}).name : q.clientName;
  try {
    const { data: u } = await sb.auth.getUser();
    const { data, error } = await sb.from('devis').insert({ user_id: u.user.id, client_id: q.clientId, client_name: name || null, items: r.lines, subtotal: r.subtotal, discount: r.discount, total: r.total, notes: q.note || null, status: 'envoye' }).select().single();
    if(error) throw error;
    PX.devis.unshift(data);
    if(!silent){ agToast('Devis enregistré'); pxNewQuote(); crmRenderTarifs(); }
    return data;
  } catch(e){ alert('Erreur : ' + (e.message || e)); return null; }
}
async function pxSendQuote(){
  const r = pxCompute(), q = PX.q, txt = pxQuoteText(r);
  const c = q.clientId ? (clients || []).find(x => x.id === q.clientId) : null;
  window.open(`https://wa.me/${crmPhone(c && c.phone)}?text=${encodeURIComponent(txt)}`, '_blank');
  await pxSaveQuote(true);
  if(c) crmLog(c.id, 'devis', txt);
  pxNewQuote(); crmRenderTarifs();
}
function pxOpenQuote(id){
  const d = PX.devis.find(x => x.id === id); if(!d) return;
  agSheet('pxQuote', `<h3>Devis - ${agEsc(d.client_name || 'Client')}</h3>
    <div class="ag-hint">${crmDate(d.created_at)}</div>
    <div class="ag-list" style="margin-top:10px">${(d.items || []).map(i => `<div class="crm-line"><div><b>${agEsc(i.name)}${i.qty > 1 ? ' x' + i.qty : ''}</b></div><b>${agF(i.price * i.qty)}</b></div>`).join('')}
      ${d.discount ? `<div class="crm-line"><div><span>Remise</span></div><b>-${agF(d.discount)}</b></div>` : ''}
      <div class="crm-line"><div><b>Total</b></div><b>${agF(d.total)}</b></div></div>
    ${d.notes ? `<p class="ag-hint" style="margin-top:8px">${agEsc(d.notes)}</p>` : ''}
    <label>Réponse du client</label>
    <div class="ag-pills">${[['envoye', 'En attente'], ['accepte', 'Accepté'], ['refuse', 'Refusé']].map(([k, n]) => `<button class="${d.status === k ? 'on' : ''}" onclick="pxQuoteStatus(${d.id},'${k}')">${n}</button>`).join('')}</div>
    <div class="ag-hint">Indique si le client a accepté : l'IA s'en sert pour savoir quels prix marchent.</div>
    <div class="crm-2" style="margin-top:14px"><button class="btn-secondary" onclick="pxReuse(${d.id})">Refaire ce devis</button><button class="btn-danger" style="padding:12px" onclick="pxQuoteDelete(${d.id})">Supprimer</button></div>`);
}
async function pxQuoteStatus(id, status){
  const { error } = await sb.from('devis').update({ status }).eq('id', id);
  if(error){ alert(error.message); return; }
  PX.devis.find(x => x.id === id).status = status; pxOpenQuote(id); crmRenderTarifs();
}
async function pxQuoteDelete(id){
  if(!await agConfirm('Supprimer ce devis ?')) return;
  const { error } = await sb.from('devis').delete().eq('id', id);
  if(error){ alert(error.message); return; }
  PX.devis = PX.devis.filter(x => x.id !== id); agCloseSheet('pxQuote'); crmRenderTarifs();
}
function pxReuse(id){
  const d = PX.devis.find(x => x.id === id); if(!d) return;
  pxNewQuote(); const q = PX.q;
  q.clientId = d.client_id; q.clientName = d.client_name || ''; q.note = d.notes || '';
  (d.items || []).forEach(i => {
    const t = i.id && CRM.tarifs.find(x => x.id === i.id);
    if(t) q[t.kind === 'option' ? 'o' : 'f'][t.id] = i.qty; else q.customs.push({ name: i.name, price: i.price, qty: i.qty });
  });
  agCloseSheet('pxQuote'); PX.view = 'devis'; crmRenderTarifs();
}

// ---------- Conseiller IA ----------
function pxContext(){
  const i = CRM.info, st = pxTypeStats();
  const dv = PX.devis.slice(0, 30);
  const marche = (i.marche || []).filter(x => x.a);
  return `Tu es le conseiller tarifs de Henzo Studio, studio photo et vidéo à Bouaké (Côte d'Ivoire), quartier Ahougnansou. Monnaie : FCFA. Spécialités : portrait studio, anniversaires d'enfants, mariage, grossesse, événements. Il fait aussi de petites impressions (format A4...).
FORMULES :
${pxFormules().map(t => `- [${t.category || 'Autre'}] ${t.name} : ${Math.round(t.price)} F${t.cost ? ', coût ' + Math.round(t.cost) + ' F' : ''}${pxMinutes(t) ? ', ' + pxMinutes(t) + ' min de travail' : ''}${t.photo_count ? ', ' + t.photo_count + ' photos' : ''}${t.includes ? ', inclus : ' + t.includes : ''}${t.active === false ? ' (plus proposée)' : ''}`).join('\n') || '(aucune)'}
OPTIONS :
${pxOptions().map(t => `- ${t.name} : +${Math.round(t.price)} F${pxUnit(t)}${t.cost ? ', coût ' + Math.round(t.cost) + ' F' : ''}${pxMinutes(t) ? ', ' + pxMinutes(t) + ' min' : ''}`).join('\n') || '(aucune)'}
PRIX RÉELLEMENT PAYÉS (12 mois) :
${st.map(x => `- ${x.type} : ${x.n} séances, moyenne ${Math.round(x.avg)} F (de ${Math.round(x.min)} à ${Math.round(x.max)})`).join('\n') || '(pas de données)'}
DEVIS RÉCENTS (et réponse du client) :
${dv.map(d => `- ${(d.items || []).map(x => x.name + (x.qty > 1 ? ' x' + x.qty : '') + ' ' + Math.round(x.price) + ' F').join(' + ')} = ${Math.round(d.total)} F -> ${{ envoye: 'sans réponse', accepte: 'ACCEPTÉ', refuse: 'REFUSÉ' }[d.status] || d.status}`).join('\n') || '(aucun)'}
CHIFFRES : charges fixes ${i.charges || '?'} F/mois, ${i.seances || '?'} séances/mois, objectif ${i.objectif || '?'} F/mois après charges. Matériel : ${i.materiel || '?'}. Clientèle : ${i.clientele || '?'}. Concurrents : ${i.concurrents || '?'}.
CE QUE HENZO SAIT DE SON MARCHÉ :
${marche.map(x => `- ${x.q} -> ${x.a}`).join('\n') || '(rien encore)'}
Règles : français simple, sans jargon, sans tirets longs, montants réalistes pour Bouaké, honnête même si ce n'est pas ce qu'il veut entendre. Ne présente pas des suppositions comme des faits : si tu ne connais pas un prix du marché, dis que c'est une estimation.`;
}
function pxRenderConseil(el){
  const i = CRM.info, marche = (i.marche || []).filter(x => x.a);
  const mq = PX.mq;
  el.innerHTML = `
    <div class="ag-sec"><h3>Mon marché à Bouaké</h3>${marche.length ? `<span class="crm-count">${marche.length} réponses</span>` : ''}</div>
    <div class="ag-list" style="padding:12px 16px">
      <p class="ag-hint" style="margin:0 0 10px">L'IA te pose des questions sur ta ville, tes clients et tes concurrents. Tes réponses rendent tous ses conseils plus justes.</p>
      ${marche.length ? `<details class="px-det"><summary>Voir mes réponses</summary>${marche.map((x, k) => `<div class="crm-line col"><span>${agEsc(x.q)}</span><p>${agEsc(x.a)}</p><button class="crm-link" style="text-align:left" onclick="pxDelMarche(${k})">Retirer</button></div>`).join('')}</details>` : ''}
      ${mq && mq.questions.length ? `<div class="crm-qs" style="margin-top:6px">${mq.questions.map((q, k) => `<label>${agEsc(q)}</label><textarea rows="2" oninput="PX.mq.answers[${k}]=this.value" placeholder="Ta réponse (laisse vide si tu ne sais pas)">${agEsc(mq.answers[k] || '')}</textarea>`).join('')}
        <button class="btn-primary" style="margin-top:10px" onclick="pxSaveMarche()">Enregistrer mes réponses</button></div>`
        : `<button class="btn-primary" style="width:100%" ${mq && mq.busy ? 'disabled' : ''} onclick="pxAskMarche()">${mq && mq.busy ? 'Réflexion...' : (marche.length ? 'Encore des questions' : "L'IA me pose des questions")}</button>`}
    </div>

    <div class="ag-sec"><h3>Tester une idée de prix</h3></div>
    <div class="ag-list" style="padding:12px 16px">
      <textarea id="pxIdea" rows="3" oninput="PX.idea=this.value" placeholder="Ex : je passe l'extérieur à 20 000 F tout compris au lieu de 15 000 + 5 000. Ou : photo de groupe à 5 000 F par personne en plus.">${agEsc(PX.idea)}</textarea>
      <button class="btn-primary" style="width:100%;margin-top:10px" onclick="pxTestIdea()">Est-ce une bonne idée ?</button>
      <div id="pxIdeaRes" class="crm-ana">${PX.ideaRes ? crmMd(PX.ideaRes) : ''}</div>
    </div>

    <div class="ag-sec"><h3>Options à ajouter</h3></div>
    <div class="ag-list" style="padding:12px 16px">
      <p class="ag-hint" style="margin:0 0 10px">L'IA te propose des options et suppléments pour gagner plus par client (impressions, retouches, vidéo...). Tu ajoutes celles qui te plaisent en 1 clic.</p>
      <div id="pxSugg">${pxSuggHtml()}</div>
      <button class="btn-secondary" onclick="pxSuggest()">${PX.sugg ? 'Autres propositions' : 'Propose-moi des options'}</button>
    </div>

    <div class="ag-sec"><h3>Analyse complète</h3>${CRM.analysis ? `<span class="crm-count">${crmDate(CRM.analysis.date)}</span>` : ''}</div>
    <div class="ag-list crm-ana" id="crmAna">${CRM.analysis ? crmMd(CRM.analysis.text) : '<div class="ag-empty">Touche le bouton pour une analyse de toute ta grille.</div>'}</div>
    <button class="btn-primary" style="width:100%;margin-top:10px" onclick="crmAnalyse()">${CRM.analysis ? "Refaire l'analyse" : 'Analyser ma grille'}</button>
    <div class="crm-row-in" style="margin-top:10px"><input id="crmAskT" placeholder="Pose une question sur tes tarifs"><button class="btn-secondary" onclick="crmAskTarif()">Demander</button></div>
    <div id="crmAskR"></div>`;
}
async function pxAskMarche(){
  PX.mq = { questions: [], answers: {}, busy: true }; crmRenderTarifs();
  try {
    const r = await callAI(pxContext() + `\n\nPose à Henzo 5 questions courtes et concrètes pour mieux comprendre son marché à Bouaké : prix pratiqués par les autres studios, ce que demandent ses clients, budget habituel, saisons fortes, ce qui le différencie, ce que les clients trouvent cher... Ne repose pas une question déjà répondue. Réponds uniquement en JSON : {"questions":["..."]}`);
    PX.mq = { questions: (crmJson(r).questions || []).slice(0, 6), answers: {}, busy: false };
  } catch(e){ PX.mq = null; alert(e.message); }
  crmRenderTarifs();
}
async function pxSaveMarche(){
  const mq = PX.mq; if(!mq) return;
  const add = mq.questions.map((q, k) => ({ q, a: (mq.answers[k] || '').trim(), d: new Date().toISOString().slice(0, 10) })).filter(x => x.a);
  CRM.info = Object.assign({}, CRM.info, { marche: [...(CRM.info.marche || []), ...add].slice(-40) });
  await crmSavePrefs({ tarif_info: CRM.info });
  PX.mq = null; agToast(add.length ? 'Réponses enregistrées' : 'Rien à enregistrer'); crmRenderTarifs();
}
async function pxDelMarche(k){
  const m = (CRM.info.marche || []).filter(x => x.a); m.splice(k, 1);
  CRM.info = Object.assign({}, CRM.info, { marche: m });
  await crmSavePrefs({ tarif_info: CRM.info }); crmRenderTarifs();
}
async function pxTestIdea(){
  const idea = (PX.idea || '').trim(); if(!idea){ alert("Écris ton idée d'abord"); return; }
  const box = document.getElementById('pxIdeaRes'); box.innerHTML = '<div class="ag-empty">Analyse...</div>';
  try {
    PX.ideaRes = await callAI(pxContext() + `\n\nHenzo veut tester cette idée : "${idea}"\nRéponds avec ces parties :
# Verdict (Bonne idée, À ajuster ou Risqué, en une phrase)
# Ce que tu gagnes (calcul simple par séance et par mois, comparé à maintenant)
# Ton temps (est-ce que tu gagnes plus par heure de travail ?)
# Par rapport au marché de Bouaké
# Ma proposition (le prix ou la formule exacte à mettre)`);
  } catch(e){ PX.ideaRes = ''; box.innerHTML = `<div class="ag-empty">${agEsc(e.message)}</div>`; return; }
  box.innerHTML = crmMd(PX.ideaRes);
}
function pxSuggHtml(){
  if(!PX.sugg) return '';
  if(PX.sugg === 'busy') return '<div class="ag-empty">Réflexion...</div>';
  return PX.sugg.map((s, k) => `<div class="px-sugg"><div class="d"><b>${agEsc(s.name)}</b><span class="v">+${agF(s.price)}${agEsc(s.unit && s.unit !== 'fixe' ? ' ' + (PX_UNITS[s.unit] || s.unit) : '')}</span><span>${agEsc(s.why || '')}</span></div>
    ${s.added ? '<span class="crm-st st-Actif">Ajouté</span>' : `<button class="btn-primary" onclick="pxAddSugg(${k})">Ajouter</button>`}</div>`).join('');
}
async function pxSuggest(){
  PX.sugg = 'busy'; document.getElementById('pxSugg').innerHTML = pxSuggHtml();
  try {
    const r = await callAI(pxContext() + `\n\nPropose 4 options ou suppléments que Henzo n'a pas encore et qui feraient monter le panier moyen sans faire fuir ses clients (exemples possibles : tirage A4, cadre, photo en plus, retouche avancée, livraison express, personne en plus, tenue en plus, vidéo courte, maquillage). Prix réalistes pour Bouaké. Unités possibles : fixe, personne, tirage, photo, heure, tenue. Réponds uniquement en JSON : {"options":[{"name":"...","price":0,"unit":"fixe","why":"une phrase"}]}`);
    PX.sugg = (crmJson(r).options || []).filter(x => x && x.name).slice(0, 5);
  } catch(e){ PX.sugg = null; alert(e.message); }
  const b = document.getElementById('pxSugg'); if(b) b.innerHTML = pxSuggHtml();
}
async function pxAddSugg(k){
  const s = PX.sugg[k]; if(!s) return;
  const { data: u } = await sb.auth.getUser();
  const { data, error } = await sb.from('tarifs').insert({ user_id: u.user.id, kind: 'option', name: s.name, price: Number(s.price) || 0, unit: PX_UNITS[s.unit] ? s.unit : 'fixe', category: 'Options', includes: s.why || null, active: true, public: true, position: CRM.tarifs.length }).select().single();
  if(error){ alert(error.message); return; }
  CRM.tarifs.push(data); s.added = true;
  document.getElementById('pxSugg').innerHTML = pxSuggHtml(); agToast('Ajouté à ta grille');
}
async function crmAnalyse(){
  const el = document.getElementById('crmAna');
  if(el) el.innerHTML = '<div class="ag-empty">L\'IA analyse tes tarifs...</div>';
  try {
    const r = await callAI(pxContext() + `\n\nAnalyse toute la grille. Structure :
# Ce qui va bien
# Ce qui pose problème (prix trop bas, marge faible, temps mal payé, écarts entre grille et prix réels, devis refusés)
# Prix conseillés (liste : formule -> prix actuel -> prix conseillé -> pourquoi)
# Comment facturer l'extérieur, les groupes et les impressions
# Pour te démarquer à Bouaké
# 3 actions à faire cette semaine`);
    CRM.analysis = { text: r, date: new Date().toISOString() };
    await crmSavePrefs({ tarif_analysis: CRM.analysis });
  } catch(e){ if(el) el.innerHTML = `<div class="ag-empty">${agEsc(e.message)}</div>`; return; }
  crmRenderTarifs();
}
async function crmAskTarif(){
  const q = (document.getElementById('crmAskT') || {}).value || ''; if(!q.trim()) return;
  const box = document.getElementById('crmAskR'); box.innerHTML = '<div class="ag-empty">Réflexion...</div>';
  try {
    const r = await callAI(pxContext() + `\n\n${CRM.analysis ? 'Ton analyse précédente :\n' + CRM.analysis.text + '\n\n' : ''}Question de Henzo : ${q}\nRéponds court et concret.`);
    box.innerHTML = `<div class="ag-list crm-ana" style="margin-top:10px"><p><b>${agEsc(q)}</b></p>${crmMd(r)}</div>`;
  } catch(e){ box.innerHTML = `<div class="ag-empty">${agEsc(e.message)}</div>`; }
}

// ---------- Partager ----------
function pxRenderPartage(el){
  const p = PX.page || {}, link = pxLink();
  const pubs = CRM.tarifs.filter(t => t.active !== false);
  el.innerHTML = `
    ${link ? `<div class="ag-list ag-share" style="margin-top:12px">
      <div class="ag-share-row"><div style="min-width:0"><span>Lien de ma page de tarifs</span><b class="ag-link">${agEsc(link)}</b></div>
        <button class="ag-ibtn" title="Copier le lien" onclick="crmCopy(pxLink())">${agIcon('link', 17)}</button></div>
      <div class="ag-share-row"><div style="min-width:0"><span>Lien pour réserver en ligne</span><b class="ag-link">${agEsc(typeof otResaLink === 'function' ? otResaLink('') : '')}</b></div>
        <button class="ag-ibtn" title="Copier le lien" onclick="crmCopy(otResaLink(''))">${agIcon('link', 17)}</button></div></div>
    <div class="ag-actions" style="margin-top:12px">
      <button class="ag-act main" onclick="pxShareWa()"><span>${agIcon('chat')}</span>WhatsApp</button>
      <button class="ag-act" onclick="window.open(pxLink(),'_blank')"><span>${agIcon('eye')}</span>Voir</button>
      <button class="ag-act" onclick="window.open(pxLink()+'&pdf=1','_blank')"><span>${agIcon('download')}</span>PDF</button>
      <button class="ag-act" onclick="crmCopyGrille()"><span>${agIcon('copy')}</span>Texte</button>
    </div>
    <p class="ag-hint" style="margin:4px 2px 0">PDF : la page s'ouvre, choisis "Enregistrer en PDF" pour la garder ou l'envoyer.</p>` :
    `<div class="crm-fete" style="cursor:default"><div class="ic">${agIcon('link')}</div><div class="d"><b>Crée ta page de tarifs</b><span>Un lien que tu envoies à quiconque te demande tes prix. Le client choisit sa formule et te réserve sur WhatsApp.</span></div></div>`}
    <div class="ag-sec"><h3>Ma page</h3></div>
    <div class="ag-list" style="padding:4px 16px 14px">
      <label>Adresse du lien</label><div class="px-slug"><span>.../tarifs.html?s=</span><input id="pxSlug" value="${agEsc(p.slug || 'henzo')}"></div>
      <label>Titre</label><input id="pxTitle" value="${agEsc(p.title || 'Henzo Studio - Tarifs')}">
      <label>Numéro WhatsApp pour réserver</label><input id="pxPhone" type="tel" value="${agEsc(p.phone || (typeof BRAND !== 'undefined' ? BRAND.whatsapp : ''))}">
      <label>Petit texte d'accueil</label><textarea id="pxIntro" rows="2" placeholder="Ex : Studio photo à Bouaké, Ahougnansou. Portraits, anniversaires, mariages.">${agEsc(p.intro || '')}</textarea>
      <label>Conditions</label><textarea id="pxNotes" rows="2" placeholder="Ex : Acompte de 50 % pour réserver. Photos livrées en 72 h.">${agEsc(p.notes || '')}</textarea>
      <button class="btn-primary" style="margin-top:12px" onclick="pxSavePage()">${link ? 'Enregistrer' : 'Créer ma page'}</button>
    </div>
    <div class="ag-sec"><h3>Ce qui s'affiche sur la page</h3></div>
    <div class="ag-list">${pubs.length ? pubs.map(t => `<label class="crm-pick"><input type="checkbox" ${t.public !== false ? 'checked' : ''} onchange="pxTogglePub(${t.id},this.checked)"><div><b>${agEsc(t.name)}</b><span>${t.kind === 'option' ? '+' : ''}${agF(t.price)}${agEsc(pxUnit(t))}</span></div></label>`).join('') : '<div class="ag-empty">Ajoute d\'abord tes tarifs dans "Ma grille".</div>'}</div>`;
}
async function pxSavePage(){
  const v = k => document.getElementById(k).value.trim();
  const slug = v('pxSlug').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'henzo';
  const { data: u } = await sb.auth.getUser();
  const row = { user_id: u.user.id, slug, title: v('pxTitle') || null, phone: crmPhone(v('pxPhone')) || null, intro: v('pxIntro') || null, notes: v('pxNotes') || null };
  const { data, error } = await sb.from('tarif_page').upsert(row, { onConflict: 'user_id' }).select().single();
  if(error){ alert(/duplicate|unique/i.test(error.message) ? 'Cette adresse est déjà prise, choisis-en une autre.' : error.message); return; }
  PX.page = data || row; agToast('Page enregistrée'); crmRenderTarifs();
}
async function pxTogglePub(id, on){
  const { error } = await sb.from('tarifs').update({ public: on }).eq('id', id);
  if(error){ alert(error.message); return; }
  CRM.tarifs.find(x => x.id === id).public = on;
}
function pxShareWa(){ window.open(`https://wa.me/?text=${encodeURIComponent('Bonjour ! Voici mes tarifs, vous pouvez choisir votre formule directement ici :\n' + pxLink() + '\n\nHenzo Studio')}`, '_blank'); }
function crmCopyGrille(){
  const f = pxFormules().filter(t => t.active !== false && t.public !== false), o = pxOptions().filter(t => t.active !== false && t.public !== false);
  if(!f.length && !o.length){ agToast("Ajoute d'abord des tarifs"); return; }
  const det = t => [t.duration_min ? t.duration_min + ' min' : '', t.photo_count ? t.photo_count + ' photos' : '', t.includes || ''].filter(Boolean).join(', ');
  const cats = [...new Set(f.map(t => t.category || 'Autres'))];
  const txt = 'HENZO STUDIO - Tarifs\n' + cats.map(c => '\n' + c.toUpperCase() + '\n' + f.filter(t => (t.category || 'Autres') === c).map(t => `- ${t.name} : ${agN(t.price)} F${det(t) ? ' (' + det(t) + ')' : ''}`).join('\n')).join('\n') +
    (o.length ? '\n\nOPTIONS\n' + o.map(t => `- ${t.name} : +${agN(t.price)} F${pxUnit(t)}`).join('\n') : '') +
    (PX.page && PX.page.notes ? '\n\n' + PX.page.notes : '') + (pxLink() ? '\n\nTous les détails : ' + pxLink() : '') +
    '\n\nAhougnansou, en face du Restaurant Le Rosier, Bouaké';
  crmCopy(txt);
}

// ---------- Demarrage ----------
(async function pxInit(){
  await pxLoad();
  const a = document.querySelector('.page.active');
  if(a && a.id === 'page-tarifs') crmRenderTarifs();
})();
