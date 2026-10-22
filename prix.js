// ============================================================
// SUPER APP HENZO - TARIFS, DEVIS, CONSEILLER IA, PAGE PUBLIQUE
// - Grille organisee en COLLECTIONS (une grille par type de seance) :
//   packs, options choisies dans la liste commune, acompte, conditions, pack vedette
// - Chaque pack a des infos structurees (details) affichees avec ✔ / ✘ + lignes libres
// - Devis : calculateur par collection, envoi WhatsApp, historique accepte/refuse
// - L'app apprend de tes devis (lignes que tu factures souvent)
// - Conseiller IA : marche de Bouake, test d'une idee, analyse par collection
// - Page publique de tarifs (lien + PDF par collection, catalogue complet)
// ============================================================

const PX = { view: 'grille', devis: [], page: null, cols: [], loaded: false, col: null, q: null, mq: null, idea: '', ideaRes: '', sugg: null, ccol: null, pf: null, cf: null };
const PX_UNITS = { fixe: 'Prix fixe', personne: 'par personne', tirage: 'par tirage', photo: 'par photo', heure: 'par heure', tenue: 'par tenue' };

// Infos d'un pack, dans l'ordre d'affichage. tri = selecteur inclus / non inclus / ne pas afficher
const PX_DET = [
  { k: 'photos', n: 'Photos retouchées', ph: 'Ex : 3, ou Plus de 120 (HD), ou Illimitées (HD)' },
  { k: 'photos_imprimees', n: 'Photos imprimées', tri: 1, yes: 'Photos imprimées incluses', no: 'Sans photos imprimées', ph: 'Ex : 40 (10x15)' },
  { k: 'livraison', n: 'Livraison', ph: 'Ex : 3 jours' },
  { k: 'duree', n: 'Durée de la séance', ph: 'Ex : 1 h' },
  { k: 'tenues', n: 'Tenues', ph: 'Ex : 2' },
  { k: 'maquillage', n: 'Maquillage', tri: 1, yes: 'Maquillage professionnel inclus', no: 'Sans maquillage', ph: 'Laisse vide : "Maquillage professionnel inclus"' },
  { k: 'video', n: 'Vidéo', tri: 1, yes: 'Vidéo incluse', no: 'Sans vidéo', ph: 'Ex : 1 vidéo Réel TikTok (moins de 3 min)' },
  { k: 'heures', n: 'Heures de présence', ph: 'Ex : 4 h' },
  { k: 'equipe', n: 'Équipe', ph: 'Ex : 1 photographe + 1 vidéaste' },
  { k: 'tirages', n: 'Tirages', tri: 1, yes: 'Tirages inclus', no: 'Sans tirage', ph: 'Ex : 2 tirages A4 plastifiés offerts' },
  { k: 'album', n: 'Album', tri: 1, yes: 'Album photo inclus', no: 'Sans album', ph: 'Ex : Album photo offert (60 photos)' },
  { k: 'cadre', n: 'Cadre', tri: 1, yes: 'Cadre photo offert', no: 'Sans cadre', ph: 'Ex : Cadre photo en bois offert' },
  { k: 'usb', n: 'Clé USB', tri: 1, yes: 'Clé USB incluse', no: 'Sans clé USB', ph: 'Ex : Clé USB Premium 32 Go' }
];

async function pxLoad(){
  if(!CRM.loaded) await crmLoad();
  try {
    const [d, p, c] = await Promise.all([
      sb.from('devis').select('*').order('created_at', { ascending: false }),
      sb.from('tarif_page').select('*').maybeSingle(),
      sb.from('tarif_collections').select('*').order('position', { ascending: true })
    ]);
    PX.devis = d.data || []; PX.page = p.data || null; PX.cols = (c && c.data) || [];
  } catch(e){ console.warn('prix load', e); }
  PX.loaded = true;
}

// ---------- Donnees ----------
const pxByPos = (a, b) => ((Number(a.position) || 0) - (Number(b.position) || 0)) || (a.id - b.id);
const pxFormules = () => CRM.tarifs.filter(t => (t.kind || 'formule') === 'formule');
const pxOptions = () => CRM.tarifs.filter(t => t.kind === 'option').sort(pxByPos);
const pxCols = () => PX.cols.slice().sort(pxByPos);
const pxCol = id => PX.cols.find(c => c.id === id) || null;
const pxPacks = cid => pxFormules().filter(t => t.collection_id === cid).sort(pxByPos);
const pxLoose = () => pxFormules().filter(t => !t.collection_id || !pxCol(t.collection_id)).sort(pxByPos);
const pxColOpts = c => ((c && c.options) || []).map(id => CRM.tarifs.find(t => t.id === Number(id) && t.kind === 'option')).filter(Boolean);
function pxUnit(t){ return t.unit && t.unit !== 'fixe' ? ' ' + (PX_UNITS[t.unit] || t.unit) : ''; }
function pxShare(){ const i = CRM.info; return Number(i.seances) ? (Number(i.charges) || 0) / Number(i.seances) : 0; }
function pxMinutes(t){ return (Number(t.duration_min) || 0) + (Number(t.edit_min) || 0) + (Number(t.travel_min) || 0); }
function pxHourly(t){
  const m = pxMinutes(t); if(!m) return null;
  return (Number(t.price) - (Number(t.cost) || 0) - (t.kind === 'option' ? 0 : pxShare())) / (m / 60);
}
function pxSlugify(s){ return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40); }
function pxPhotoN(t){
  const d = t.details || {};
  if(d.photos != null && /^\s*\d+\s*$/.test(String(d.photos))) return Number(d.photos);
  return Number(t.photo_count) || null;
}
function pxRange(c){
  const p = pxPacks(c.id).map(t => Number(t.price) || 0);
  return p.length ? { min: Math.min(...p), max: Math.max(...p) } : null;
}
function pxRangeTxt(c){ const r = pxRange(c); return !r ? 'Aucun pack' : r.min === r.max ? agF(r.min) : 'De ' + agF(r.min) + ' à ' + agF(r.max); }
async function pxUid(){ const { data: u } = await sb.auth.getUser(); return u.user.id; }

// Texte d'une info (meme logique que tarifs.html et reserver.html)
function pxLow(v){ return v.length > 1 && v[1] === v[1].toLowerCase() ? v[0].toLowerCase() + v.slice(1) : v; }
function pxDetText(k, v){
  const n = /^\d+$/.test(v) ? Number(v) : null, s = n > 1 ? 's' : '';
  if(k === 'photos') return n != null ? `${n} photo${s} retouchée${s} HD` : (/photo/i.test(v) ? v : 'Photos retouchées : ' + pxLow(v));
  if(k === 'photos_imprimees') return n != null ? `${n} photo${s} imprimée${s}` : (/imprim|tirage/i.test(v) ? v : 'Photos imprimées : ' + v);
  if(k === 'livraison') return /livr/i.test(v) ? v : /^\d/.test(v) ? 'Livraison en ' + v : 'Livraison : ' + pxLow(v);
  if(k === 'duree') return n != null ? `Séance de ${n} min` : /s[ée]ance|dur[ée]e/i.test(v) ? v : 'Séance de ' + pxLow(v);
  if(k === 'tenues') return n != null ? `${n} tenue${s}` : /tenue/i.test(v) ? v : 'Tenues : ' + pxLow(v);
  if(k === 'heures') return n != null ? `${n} h de présence` : /pr[ée]sence/i.test(v) ? v : v + ' de présence';
  return v;
}
function pxDetLines(t){
  const d = t && t.details && typeof t.details === 'object' ? t.details : null, out = [];
  if(!d){
    if(t.photo_count) out.push({ t: pxDetText('photos', String(t.photo_count)), ok: true });
    if(t.duration_min) out.push({ t: pxDetText('duree', String(t.duration_min)), ok: true });
    if(t.includes) out.push({ t: String(t.includes), ok: true });
    return out;
  }
  PX_DET.forEach(f => {
    const v = d[f.k];
    if(v == null || v === '') return;
    if(v === false){ out.push({ t: f.no || 'Sans ' + f.n.toLowerCase(), ok: false }); return; }
    if(v === true){ out.push({ t: f.yes || f.n + ' inclus', ok: true }); return; }
    const s = String(v).trim(); if(s) out.push({ t: pxDetText(f.k, s), ok: true });
  });
  (Array.isArray(d.lignes) ? d.lignes : []).forEach(l => { if(l && String(l.t || '').trim()) out.push({ t: String(l.t).trim(), ok: l.ok !== false }); });
  return out;
}
// Coche / croix dessinees (les symboles texte ne s'affichent pas sur tous les telephones)
const PX_OK = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const PX_NO = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const pxMark = ok => ok ? PX_OK : PX_NO;
// Carte d'un pack, comme sur le PDF
function pxCardHtml(t, star){
  const ls = pxDetLines(t);
  return `<div class="px-card ${star ? 'star' : ''}">${star ? '<i class="px-card-tag">Le plus choisi</i>' : ''}
    <b class="px-card-n">${agEsc(t.name || 'Nom du pack')}</b><div class="px-card-p">${agN(t.price)} <small>F</small></div>
    ${ls.length ? `<ul>${ls.map(l => `<li class="${l.ok ? 'ok' : 'no'}"><s>${pxMark(l.ok)}</s>${agEsc(l.t)}</li>`).join('')}</ul>` : '<p class="px-card-e">Ajoute ce qui est inclus</p>'}</div>`;
}

// ---------- Incoherences (regles simples) ----------
function pxWarn(c){
  const out = [], packs = pxPacks(c.id);
  if(!Number(c.acompte) && !String(c.conditions || '').trim()) out.push({ m: 'Pas d\'acompte ni de conditions : le client ne sait pas comment réserver.' });
  const withN = packs.filter(t => pxPhotoN(t) && Number(t.price)).sort((a, b) => a.price - b.price);
  if(withN.length){
    const s = withN[0], unit = Number(s.price) / pxPhotoN(s);
    pxColOpts(c).filter(o => o.unit === 'photo' && Number(o.price) < unit).forEach(o =>
      out.push({ m: `"${o.name}" (${agF(o.price)}) coûte moins cher qu'une photo du ${s.name} (${agF(Math.round(unit))}). Le client a intérêt à prendre le petit pack + des photos en plus.` }));
  }
  const sorted = packs.slice().sort((a, b) => a.price - b.price);
  for(let i = 1; i < sorted.length; i++){
    const a = sorted[i - 1], b = sorted[i];
    if(Number(b.price) <= Number(a.price)) continue;
    const has = new Set(pxDetLines(a).filter(l => l.ok).map(l => l.t.toLowerCase()));
    const plus = pxDetLines(b).filter(l => l.ok && !has.has(l.t.toLowerCase()));
    const na = pxPhotoN(a), nb = pxPhotoN(b);
    if(!plus.length && !(nb && na && nb > na)) out.push({ id: b.id, m: `${b.name} coûte ${agF(b.price - a.price)} de plus que ${a.name} mais n'apporte rien de plus.` });
  }
  packs.filter(t => !(t.details && String(t.details.livraison || '').trim())).forEach(t => out.push({ id: t.id, m: `${t.name} : délai de livraison non indiqué.` }));
  return out;
}

// ---------- Liens ----------
function pxLink(){ return PX.page && PX.page.slug ? `${location.origin}/tarifs.html?s=${encodeURIComponent(PX.page.slug)}` : ''; }
function pxColLink(c){ const l = pxLink(); return l && c ? l + '&c=' + encodeURIComponent(c.slug || '') : l; }
function pxPdfLink(c){ const l = c ? pxColLink(c) : pxLink(); return l ? l + '&pdf=1' : ''; }
function pxNeedPage(){ if(pxLink()) return false; agToast("Crée d'abord ta page dans Partager", 'error'); PX.view = 'partage'; PX.col = null; crmRenderTarifs(); return true; }
function pxOpen(u){ if(!pxNeedPage()) window.open(u, '_blank'); }
function pxCopyLink(cid){ if(pxNeedPage()) return; crmCopy(cid ? pxColLink(pxCol(cid)) : pxLink()); }
function pxWa(cid){
  if(pxNeedPage()) return;
  const c = cid ? pxCol(cid) : null, m = (PX.page && PX.page.marque) || 'Henzo Photographie';
  const txt = c ? `Bonjour ! Voici mes tarifs "${c.nom}". Vous pouvez choisir votre pack et réserver directement ici :\n${pxColLink(c)}\n\n${m}`
    : `Bonjour ! Voici tous mes tarifs, vous pouvez choisir votre formule directement ici :\n${pxLink()}\n\n${m}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank');
}
function pxShareWa(){ pxWa(null); }

// ============================================================
// PAGE
// ============================================================
function crmTBody(){ return document.getElementById('crmTarifsBody'); }
async function crmRenderTarifs(){
  const el = crmTBody(); if(!el) return;
  if(!PX.loaded){ el.innerHTML = '<div class="ag-empty">Chargement...</div>'; await pxLoad(); }
  const f = pxFormules(), o = pxOptions(), cols = pxCols(), info = CRM.info;
  const acc = PX.devis.filter(d => d.status === 'accepte').length, ref = PX.devis.filter(d => d.status === 'refuse').length;
  const views = [['grille', 'Ma grille'], ['devis', 'Devis'], ['negocier', 'Négocier'], ['conseil', 'Conseiller IA'], ['partage', 'Partager']];
  el.innerHTML = `
    <div class="ag-total">
      <div class="lbl">Tarifs et devis</div>
      <div class="amt">${cols.length} <small>collection${cols.length > 1 ? 's' : ''} · ${f.length} pack${f.length > 1 ? 's' : ''} · ${o.length} option${o.length > 1 ? 's' : ''}</small></div>
      <div class="split"><div>Devis faits<b>${PX.devis.length}</b></div><div>Acceptés<b>${acc + ref ? Math.round(acc / (acc + ref) * 100) + ' %' : '-'}</b></div><div>Objectif / mois<b>${info.objectif ? agF(info.objectif) : '-'}</b></div></div>
    </div>
    <div class="ag-pills px-tabs">${views.map(([k, n]) => `<button class="${PX.view === k ? 'on' : ''}" onclick="PX.view='${k}';crmRenderTarifs()">${n}</button>`).join('')}</div>
    <div id="pxView"></div>`;
  const v = document.getElementById('pxView');
  if(PX.view === 'devis') pxRenderDevis(v);
  else if(PX.view === 'negocier'){ if(typeof coRenderNego === 'function') coRenderNego(v); else v.innerHTML = '<div class="ag-empty">La négociation se charge...</div>'; }
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
function pxMarge(t){
  const share = pxShare(), h = pxHourly(t), net = Number(t.price) - (Number(t.cost) || 0) - share;
  const marge = t.price ? Math.round(net / t.price * 100) : 0;
  return (t.cost || share || h) ? `<span class="crm-marge ${marge < 30 ? 'bad' : marge < 50 ? 'mid' : 'good'}">Marge ${marge} %${h != null ? ' · ' + agF(h) + ' / heure' : ''}</span>` : '';
}
function pxRenderGrille(el){
  if(PX.col && pxCol(PX.col)) return pxRenderCol(el, pxCol(PX.col));
  PX.col = null;
  const cols = pxCols(), loose = pxLoose(), o = pxOptions(), learned = pxLearned();
  el.innerHTML = `
    <div class="ag-actions" style="grid-template-columns:repeat(3,1fr)">
      <button class="ag-act main" onclick="pxColForm(null)"><span>${agIcon('plus')}</span>Collection</button>
      <button class="ag-act" onclick="pxOptsSheet()"><span>${agIcon('note')}</span>Options communes</button>
      <button class="ag-act" onclick="crmTarifInfo()"><span>${agIcon('settings')}</span>Mes chiffres</button>
    </div>
    ${!CRM.info.charges ? `<div class="crm-fete" onclick="crmTarifInfo()"><div class="ic">${agIcon('info')}</div><div class="d"><b>Renseigne tes chiffres</b><span>Charges du mois et nombre de séances : l'app calcule ta vraie marge et ton gain par heure</span></div>${agIcon('chev', 16)}</div>` : ''}
    ${learned.map(x => `<div class="crm-fete" onclick="pxForm(null,{kind:'option',name:${agEsc(JSON.stringify(x.name))},price:${x.avg}})"><div class="ic">${agIcon('sparkles')}</div><div class="d"><b>Tu factures souvent "${agEsc(x.name)}"</b><span>${x.n} fois dans tes devis, ${agF(x.avg)} en moyenne. Ajoute-le à tes options communes.</span></div>${agIcon('plus', 16)}</div>`).join('')}
    ${!cols.length && !loose.length ? `<div class="ag-list" style="margin-top:12px"><div class="ag-empty">Ta grille est vide.<br>Crée une collection par type de séance : portrait, couple, famille, mariage...</div>
      <button class="btn-primary" style="width:100%;margin-bottom:12px" onclick="pxStarter()">Créer ma grille de départ</button></div>` : ''}
    <div class="ag-sec" style="margin-top:12px"><h3>Mes collections</h3>${cols.length ? `<span class="crm-count">${cols.length}</span>` : ''}</div>
    <div class="ag-list px-cols">${cols.length ? cols.map(c => {
      const n = pxPacks(c.id).length, w = pxWarn(c).length;
      return `<div class="crm-row px-colrow ${c.actif === false ? 'off' : ''}" onclick="PX.col=${c.id};crmRenderTarifs();window.scrollTo(0,0)">
        <div class="d"><b>${agEsc(c.nom)}${c.public === false ? ' <i class="px-hid">masquée</i>' : ''}</b>
          <span>${agEsc(c.sous_titre || 'Sans sous-titre')}</span>
          <span>${n} pack${n > 1 ? 's' : ''} · ${pxRangeTxt(c)}${Number(c.acompte) ? ' · acompte ' + Number(c.acompte) + ' %' : ''}</span></div>
        ${w ? `<i class="px-warn-n" title="À vérifier">⚠ ${w}</i>` : ''}${agIcon('chev', 16)}</div>`; }).join('') : '<div class="ag-empty">Aucune collection.</div>'}</div>
    ${loose.length ? `<div class="ag-sec"><h3>Sans collection</h3><span class="crm-count">${loose.length}</span></div>
      <p class="ag-hint" style="margin:-4px 2px 8px">Ces anciennes formules ne sont dans aucune collection : ouvre-les pour les ranger ou les supprimer.</p>
      <div class="ag-list">${loose.map(t => `<div class="crm-row ${t.active === false ? 'off' : ''}" onclick="pxForm(${t.id})"><div class="d"><b>${agEsc(t.name)}</b><span>${agEsc(pxDetLines(t).map(l => l.t).join(' · ') || 'Toucher pour ranger')}</span></div><div class="m">${agF(t.price)}</div></div>`).join('')}</div>` : ''}
    <div class="ag-sec"><h3>Options communes</h3><button onclick="pxOptsSheet()">Gérer</button></div>
    <div class="ag-list">${o.length ? o.map(t => `<div class="crm-row ${t.active === false ? 'off' : ''}" onclick="pxForm(${t.id})"><div class="d"><b>${agEsc(t.name)}</b><span>${agEsc(t.includes || PX_UNITS[t.unit] || 'Prix fixe')} · ${pxOptUse(t.id)}</span></div><div class="m">+${agF(t.price)}<span class="px-u">${agEsc(pxUnit(t))}</span></div></div>`).join('') : '<div class="ag-empty">Aucune option.</div>'}</div>
    ${pxTypeStats().length ? `<div class="ag-sec"><h3>Ce que tes clients paient vraiment</h3><span class="crm-count">12 mois</span></div>
    <div class="ag-list">${pxTypeStats().map(x => `<div class="crm-line"><div><b>${agEsc(x.type)}</b><span>${x.n} séance${x.n > 1 ? 's' : ''} · de ${agF(x.min)} à ${agF(x.max)}</span></div><b>${agF(x.avg)}</b></div>`).join('')}</div>` : ''}
    ${pxObjectif()}`;
}
function pxOptUse(id){
  const n = PX.cols.filter(c => (c.options || []).map(Number).includes(id)).length;
  return n ? `dans ${n} collection${n > 1 ? 's' : ''}` : 'dans aucune collection';
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
  try {
    const uid = await pxUid();
    const { data: c, error: e1 } = await sb.from('tarif_collections').insert({ user_id: uid, nom: 'Portrait individuel', slug: 'portrait', sous_titre: 'Shooting studio solo', acompte: 50, conditions: 'Acompte de 50 % pour bloquer la séance.', options: [], position: 0, public: true, actif: true }).select().single();
    if(e1) throw e1;
    const { data: p, error: e2 } = await sb.from('tarifs').insert({ user_id: uid, kind: 'formule', name: 'Pack Essentiel', category: c.nom, collection_id: c.id, price: 15000, photo_count: 3, details: { photos: '3', livraison: '3 jours' }, position: 0, active: true, public: true }).select().single();
    if(e2) throw e2;
    PX.cols.push(c); CRM.tarifs.push(p); PX.col = c.id;
  } catch(e){ alert('Erreur : ' + (e.message || e)); return; }
  agToast('Collection créée : modifie ou complète-la');
  crmRenderTarifs();
}

// ---------- Vue d'une collection ----------
function pxRenderCol(el, c){
  const packs = pxPacks(c.id), opts = pxColOpts(c), warn = pxWarn(c), cols = pxCols(), idx = cols.findIndex(x => x.id === c.id);
  const ana = (CRM.info.col_ana || {})[c.id];
  const up = agIcon('chev', 15).replace('class="ag-i"', 'class="ag-i px-up"'), dn = agIcon('chev', 15).replace('class="ag-i"', 'class="ag-i px-dn"');
  el.innerHTML = `
    <button class="ag-back" onclick="PX.col=null;crmRenderTarifs()">${agIcon('chev', 16)} Mes collections</button>
    <div class="px-colhead">
      <div class="d"><h3>${agEsc(c.nom)}${c.public === false ? ' <i class="px-hid">masquée</i>' : ''}${c.actif === false ? ' <i class="px-hid">plus proposée</i>' : ''}</h3><span>${agEsc(c.sous_titre || '')}</span></div>
      <div class="px-ord"><button class="ag-ibtn" title="Monter la collection" ${idx <= 0 ? 'disabled' : ''} onclick="pxMoveCol(${c.id},-1)">${up}</button><button class="ag-ibtn" title="Descendre la collection" ${idx >= cols.length - 1 ? 'disabled' : ''} onclick="pxMoveCol(${c.id},1)">${dn}</button></div>
    </div>
    <div class="crm-kpis px-kpis"><div><b>${packs.length}</b><span>pack${packs.length > 1 ? 's' : ''}</span></div><div><b>${pxRange(c) ? agN(pxRange(c).min) + (pxRange(c).max !== pxRange(c).min ? ' - ' + agN(pxRange(c).max) : '') : '-'}</b><span>prix (F)</span></div><div><b>${Number(c.acompte) ? Number(c.acompte) + ' %' : '-'}</b><span>acompte</span></div></div>
    <div class="ag-actions px-colact">
      <button class="ag-act main" onclick="pxForm(null,{kind:'formule',collection_id:${c.id}})"><span>${agIcon('plus')}</span>Pack</button>
      <button class="ag-act" onclick="pxColForm(${c.id})"><span>${agIcon('edit')}</span>Modifier</button>
      <button class="ag-act" onclick="pxOpen(pxColLink(pxCol(${c.id})))"><span>${agIcon('eye')}</span>Aperçu</button>
      <button class="ag-act" onclick="pxOpen(pxPdfLink(pxCol(${c.id})))"><span>${agIcon('download')}</span>PDF</button>
      <button class="ag-act" onclick="pxCopyLink(${c.id})"><span>${agIcon('link')}</span>Lien</button>
      <button class="ag-act" onclick="pxWa(${c.id})"><span>${agIcon('chat')}</span>WhatsApp</button>
      <button class="ag-act" onclick="pxDupCol(${c.id})"><span>${agIcon('copy')}</span>Dupliquer</button>
      <button class="ag-act" onclick="pxDelCol(${c.id})"><span>${agIcon('trash')}</span>Supprimer</button>
    </div>
    ${warn.length ? `<div class="px-warn"><b>⚠ À vérifier</b>${warn.map(w => `<p>${agEsc(w.m)}</p>`).join('')}</div>` : ''}
    <div class="ag-sec"><h3>Packs</h3><span class="crm-count">${packs.length}</span></div>
    <div class="ag-list px-packs">${packs.length ? packs.map((t, i) => {
      const star = c.vedette_id === t.id, d = t.details || {}, w = warn.some(x => x.id === t.id);
      const sub = [pxPhotoN(t) ? pxPhotoN(t) + ' photos' : (d.photos ? String(d.photos) : ''), d.livraison ? 'livraison ' + pxLow(String(d.livraison)) : ''].filter(Boolean).join(' · ');
      return `<div class="px-pack ${t.public === false || t.active === false ? 'off' : ''}">
        <div class="px-pack-h" onclick="pxForm(${t.id})"><div class="d"><b>${agEsc(t.name)}${star ? ' <i class="px-star">Le plus choisi</i>' : ''}${t.public === false ? ' <i class="px-hid">masqué</i>' : ''}${t.active === false ? ' <i class="px-hid">plus proposé</i>' : ''}${w ? ' <i class="px-warn-n">⚠</i>' : ''}</b>
          <span>${agEsc(sub || pxDetLines(t).length + ' infos')}</span>${pxMarge(t)}</div><div class="m">${agF(t.price)}</div></div>
        <div class="px-pack-b">
          <button class="ag-ibtn" title="Monter" ${i === 0 ? 'disabled' : ''} onclick="pxMovePack(${t.id},-1)">${up}</button>
          <button class="ag-ibtn" title="Descendre" ${i === packs.length - 1 ? 'disabled' : ''} onclick="pxMovePack(${t.id},1)">${dn}</button>
          <button class="ag-ibtn ${star ? 'on' : ''}" title="${star ? 'Retirer la mise en avant' : 'Mettre en vedette'}" onclick="pxSetVedette(${c.id},${star ? 'null' : t.id})">${agIcon('star', 15)}</button>
          <button class="ag-ibtn" title="${t.public === false ? 'Afficher sur la page' : 'Masquer de la page'}" onclick="pxTogglePack(${t.id})">${agIcon(t.public === false ? 'eye' : 'ban', 15)}</button>
          <button class="ag-ibtn" title="Dupliquer" onclick="pxDupPack(${t.id})">${agIcon('copy', 15)}</button>
          <button class="ag-ibtn" title="Modifier" onclick="pxForm(${t.id})">${agIcon('edit', 15)}</button>
        </div></div>`; }).join('') : '<div class="ag-empty">Aucun pack. Touche "+ Pack".</div>'}</div>
    <div class="ag-sec"><h3>Options de la collection</h3><button onclick="pxColForm(${c.id},'opts')">Choisir</button></div>
    <div class="ag-list">${opts.length ? opts.map(o => `<div class="crm-line"><div><b>${agEsc(o.name)}</b>${o.includes ? `<span>${agEsc(o.includes)}</span>` : ''}</div><b>+${agF(o.price)}<span class="px-u">${agEsc(pxUnit(o))}</span></b></div>`).join('') : '<div class="ag-empty">Aucune option cochée.</div>'}</div>
    <div class="ag-sec"><h3>Conditions et acompte</h3><button onclick="pxColForm(${c.id})">Modifier</button></div>
    <div class="ag-list crm-ana">
      <p><b>Acompte :</b> ${Number(c.acompte) ? Number(c.acompte) + ' % pour réserver' : 'aucun'}</p>
      <p><b>Conditions de la collection :</b> ${c.conditions ? agEsc(c.conditions) : '<i>aucune</i>'}</p>
      <p class="ag-hint"><b>Conditions communes :</b> ${PX.page && PX.page.notes ? agEsc(PX.page.notes) : 'aucune (Partager > Ma page)'}</p>
    </div>
    <div class="ag-sec"><h3>Avis du conseiller</h3>${ana ? `<span class="crm-count">${crmDate(ana.date)}</span>` : ''}</div>
    <div class="ag-list crm-ana" id="pxColAna">${ana ? crmMd(ana.text) : '<div class="ag-empty">L\'IA vérifie tes paliers et tes prix par rapport au marché de Bouaké.</div>'}</div>
    <div class="crm-2"><button class="btn-primary" style="margin:0" onclick="pxAnaCol(${c.id})">${ana ? 'Refaire l\'analyse' : 'Analyser cette collection'}</button>
      <button class="btn-secondary" onclick="PX.ccol=${c.id};PX.view='conseil';crmRenderTarifs()">En parler au conseiller</button></div>`;
}

// ---------- Actions collection / packs ----------
async function pxUpd(table, id, patch){
  const { error } = await sb.from(table).update(patch).eq('id', id);
  if(error){ alert(error.message); return false; }
  const row = table === 'tarifs' ? CRM.tarifs.find(x => x.id === id) : PX.cols.find(x => x.id === id);
  if(row) Object.assign(row, patch);
  return true;
}
async function pxReorder(list, table){
  for(let i = 0; i < list.length; i++){
    if(Number(list[i].position) !== i && !await pxUpd(table, list[i].id, { position: i })) return false;
  }
  return true;
}
async function pxMovePack(id, dir){
  const t = CRM.tarifs.find(x => x.id === id); if(!t) return;
  const list = pxPacks(t.collection_id), i = list.findIndex(x => x.id === id), j = i + dir;
  if(j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await pxReorder(list, 'tarifs'); crmRenderTarifs();
}
async function pxMoveCol(id, dir){
  const list = pxCols(), i = list.findIndex(x => x.id === id), j = i + dir;
  if(j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await pxReorder(list, 'tarif_collections'); crmRenderTarifs();
}
async function pxSetVedette(cid, pid){
  if(await pxUpd('tarif_collections', cid, { vedette_id: pid })) agToast(pid ? 'Pack mis en avant' : 'Mise en avant retirée');
  crmRenderTarifs();
}
async function pxTogglePack(id){
  const t = CRM.tarifs.find(x => x.id === id); if(!t) return;
  const on = t.public === false;
  if(await pxUpd('tarifs', id, { public: on })) agToast(on ? 'Affiché sur la page' : 'Masqué de la page');
  crmRenderTarifs();
}
function pxCopyRow(t){ const o = { ...t }; delete o.id; delete o.created_at; return o; }
async function pxDupPack(id){
  const t = CRM.tarifs.find(x => x.id === id); if(!t) return;
  const list = pxPacks(t.collection_id), i = list.findIndex(x => x.id === id);
  const row = { ...pxCopyRow(t), name: t.name + ' (copie)', details: t.details ? JSON.parse(JSON.stringify(t.details)) : null, position: i + 1 };
  const { data, error } = await sb.from('tarifs').insert(row).select().single();
  if(error){ alert(error.message); return; }
  CRM.tarifs.push(data);
  list.splice(i + 1, 0, data);
  await pxReorder(list, 'tarifs');
  agToast('Pack dupliqué'); crmRenderTarifs();
  pxForm(data.id);
}
async function pxDupCol(id){
  const c = pxCol(id); if(!c) return;
  let slug = pxSlugify(c.slug + '-copie'), k = 2;
  while(PX.cols.some(x => x.slug === slug)) slug = pxSlugify(c.slug + '-copie-' + k++);
  try {
    const row = { ...pxCopyRow(c), nom: c.nom + ' (copie)', slug, position: PX.cols.length, vedette_id: null, options: (c.options || []).slice(), public: false };
    const { data: nc, error } = await sb.from('tarif_collections').insert(row).select().single();
    if(error) throw error;
    PX.cols.push(nc);
    const packs = pxPacks(c.id);
    if(packs.length){
      const { data: np, error: e2 } = await sb.from('tarifs').insert(packs.map(t => ({ ...pxCopyRow(t), collection_id: nc.id, category: nc.nom, details: t.details ? JSON.parse(JSON.stringify(t.details)) : null }))).select();
      if(e2) throw e2;
      CRM.tarifs.push(...(np || []));
      const vi = packs.findIndex(t => t.id === c.vedette_id);
      if(vi >= 0 && np && np[vi]) await pxUpd('tarif_collections', nc.id, { vedette_id: np[vi].id });
    }
    PX.col = nc.id;
  } catch(e){ alert('Erreur : ' + (e.message || e)); return; }
  agToast('Collection dupliquée (masquée sur la page en attendant)'); crmRenderTarifs();
}
async function pxDelCol(id){
  const c = pxCol(id); if(!c) return;
  const n = pxPacks(id).length;
  if(n){
    if(c.public === false){ await agAlert(`"${c.nom}" contient encore ${n} pack${n > 1 ? 's' : ''}. Supprime ou range d'abord ses packs pour pouvoir la supprimer.`); return; }
    if(!await agConfirm(`Cette collection n'est pas vide\n"${c.nom}" contient ${n} pack${n > 1 ? 's' : ''}. Une collection doit être vide pour disparaître. Tu peux la masquer de ta page à la place.`, { ok: 'Masquer', danger: false })) return;
    if(await pxUpd('tarif_collections', id, { public: false })) agToast('Collection masquée');
    crmRenderTarifs(); return;
  }
  if(!await agConfirm(`Supprimer la collection "${c.nom}" ?\nCette action est définitive.`)) return;
  const { error } = await sb.from('tarif_collections').delete().eq('id', id);
  if(error){ alert(error.message); return; }
  PX.cols = PX.cols.filter(x => x.id !== id); PX.col = null;
  agToast('Collection supprimée'); crmRenderTarifs();
}

// ---------- Formulaire d'une collection ----------
function pxColForm(id, focus){
  const c = id ? pxCol(id) : null;
  const sel = c ? (c.options || []).map(Number).filter(x => pxOptions().some(o => o.id === x)) : [];
  PX.cf = { order: [...sel, ...pxOptions().map(o => o.id).filter(x => !sel.includes(x))], on: new Set(sel), slugTouched: !!c };
  agSheet('pxColF', `
    <h3>${c ? 'Modifier la collection' : 'Nouvelle collection'}</h3>
    <label>Nom</label><input id="pxCNom" value="${agEsc(c ? c.nom : '')}" placeholder="Ex : Portrait individuel, Mariage civil" oninput="pxCfSlug()">
    <label>Adresse du lien (sans accents)</label><div class="px-slug"><span>...&c=</span><input id="pxCSlug" value="${agEsc(c ? c.slug || '' : '')}" placeholder="ex : solo" oninput="PX.cf.slugTouched=true"></div>
    <label>Sous-titre</label><input id="pxCSous" value="${agEsc(c ? c.sous_titre || '' : '')}" placeholder="Ex : Shooting studio solo">
    <label>Petit texte (facultatif)</label><textarea id="pxCIntro" rows="2" placeholder="Ex : Une séance pour vous, en studio, avec retouche professionnelle.">${agEsc(c ? c.intro || '' : '')}</textarea>
    <label>Acompte pour réserver (%)</label><input id="pxCAcc" type="number" inputmode="numeric" value="${c ? (c.acompte == null ? '' : c.acompte) : 50}" placeholder="Ex : 50">
    <label>Conditions propres à cette collection</label><textarea id="pxCCond" rows="3" placeholder="Ex : Acompte de 50 % pour bloquer la date. Le solde est à régler le jour J.">${agEsc(c ? c.conditions || '' : '')}</textarea>
    <p class="ag-hint" style="margin-top:6px">Les conditions communes (Partager > Ma page) s'ajoutent toujours en dessous.</p>
    <label id="pxCOptL">Options proposées (liste commune)</label>
    <div class="ag-list px-cfopts" id="pxCfOpts"></div>
    <button class="crm-link" onclick="pxOptForm(null,{back:'col'})">+ Nouvelle option commune</button>
    <label class="ag-check"><input type="checkbox" id="pxCPub" ${!c || c.public !== false ? 'checked' : ''}> Visible sur ma page de tarifs</label>
    <label class="ag-check"><input type="checkbox" id="pxCAct" ${!c || c.actif !== false ? 'checked' : ''}> Proposée en ce moment</label>
    <button class="btn-primary" onclick="pxColSave(${c ? c.id : 'null'})">Enregistrer</button>`);
  pxCfRender();
  if(focus === 'opts') setTimeout(() => { const l = document.getElementById('pxCOptL'); if(l) l.scrollIntoView({ block: 'start' }); }, 50);
}
function pxCfSlug(){ if(PX.cf && !PX.cf.slugTouched){ const s = document.getElementById('pxCSlug'); if(s) s.value = pxSlugify(document.getElementById('pxCNom').value); } }
function pxCfRender(){
  const box = document.getElementById('pxCfOpts'); if(!box || !PX.cf) return;
  const cf = PX.cf, opts = pxOptions();
  cf.order = cf.order.filter(id => opts.some(o => o.id === id));
  opts.forEach(o => { if(!cf.order.includes(o.id)) cf.order.push(o.id); });
  const on = cf.order.filter(id => cf.on.has(id));
  const up = agIcon('chev', 14).replace('class="ag-i"', 'class="ag-i px-up"'), dn = agIcon('chev', 14).replace('class="ag-i"', 'class="ag-i px-dn"');
  box.innerHTML = cf.order.length ? cf.order.map(id => {
    const o = opts.find(x => x.id === id), k = on.indexOf(id);
    return `<div class="px-cfo ${cf.on.has(id) ? 'on' : ''}"><label class="crm-pick"><input type="checkbox" data-id="${id}" ${cf.on.has(id) ? 'checked' : ''} onchange="pxCfToggle(${id},this.checked)"><div><b>${agEsc(o.name)}</b><span>+${agF(o.price)}${agEsc(pxUnit(o))}</span></div></label>
      ${cf.on.has(id) ? `<button class="ag-ibtn" title="Monter" ${k === 0 ? 'disabled' : ''} onclick="pxCfMove(${id},-1)">${up}</button><button class="ag-ibtn" title="Descendre" ${k === on.length - 1 ? 'disabled' : ''} onclick="pxCfMove(${id},1)">${dn}</button>` : ''}</div>`; }).join('')
    : '<div class="ag-empty">Aucune option commune pour le moment.</div>';
}
function pxCfToggle(id, on){
  const cf = PX.cf;
  if(on){ cf.on.add(id); const sel = cf.order.filter(x => cf.on.has(x) && x !== id); cf.order = [...sel, id, ...cf.order.filter(x => !cf.on.has(x))]; }
  else { cf.on.delete(id); cf.order = [...cf.order.filter(x => cf.on.has(x)), id, ...cf.order.filter(x => !cf.on.has(x) && x !== id)]; }
  pxCfRender();
}
function pxCfMove(id, dir){
  const cf = PX.cf, on = cf.order.filter(x => cf.on.has(x)), i = on.indexOf(id), j = i + dir;
  if(j < 0 || j >= on.length) return;
  [on[i], on[j]] = [on[j], on[i]];
  cf.order = [...on, ...cf.order.filter(x => !cf.on.has(x))]; pxCfRender();
}
async function pxColSave(id){
  const v = k => (document.getElementById(k).value || '').trim();
  const nom = v('pxCNom'); if(!nom){ alert('Donne un nom à la collection'); return; }
  const slug = pxSlugify(v('pxCSlug') || nom);
  if(!slug){ alert('Choisis une adresse de lien (lettres et chiffres)'); return; }
  if(PX.cols.some(c => c.slug === slug && c.id !== id)){ alert(`L'adresse "${slug}" est déjà prise par une autre collection. Choisis-en une autre.`); return; }
  const acc = v('pxCAcc');
  const data = { nom, slug, sous_titre: v('pxCSous') || null, intro: v('pxCIntro') || null, acompte: acc === '' ? 0 : Math.max(0, Math.min(100, parseInt(acc) || 0)),
    conditions: v('pxCCond') || null, options: PX.cf.order.filter(x => PX.cf.on.has(x)), public: document.getElementById('pxCPub').checked, actif: document.getElementById('pxCAct').checked };
  try {
    if(id){
      const { data: r, error } = await sb.from('tarif_collections').update(data).eq('id', id).select().single();
      if(error) throw error; Object.assign(pxCol(id), r || data);
      // Le nom de la collection sert aussi de categorie a ses packs (devis, stats)
      const old = pxPacks(id).filter(t => t.category !== nom);
      for(const t of old) await pxUpd('tarifs', t.id, { category: nom });
    } else {
      const { data: r, error } = await sb.from('tarif_collections').insert({ ...data, user_id: await pxUid(), position: PX.cols.length ? Math.max(...PX.cols.map(c => Number(c.position) || 0)) + 1 : 0 }).select().single();
      if(error) throw error; PX.cols.push(r); PX.col = r.id;
    }
  } catch(e){ alert(/duplicate|unique/i.test(e.message || '') ? 'Cette adresse de lien est déjà prise, choisis-en une autre.' : 'Erreur : ' + (e.message || e)); return; }
  agCloseSheet('pxColF'); agToast('Collection enregistrée'); crmRenderTarifs();
}

// ---------- Options communes ----------
function pxOptsSheet(){
  const o = pxOptions();
  agSheet('pxOpts', `
    <h3>Options communes</h3>
    <div class="ag-hint">Une seule liste pour toutes tes collections. Une option modifiée ici change partout. Dans chaque collection, tu coches celles que tu proposes.</div>
    <div class="ag-list" style="margin-top:12px">${o.length ? o.map(t => `<div class="crm-row ${t.active === false ? 'off' : ''}" onclick="pxOptForm(${t.id},{back:'opts'})"><div class="d"><b>${agEsc(t.name)}</b><span>${agEsc(t.includes || PX_UNITS[t.unit] || 'Prix fixe')} · ${pxOptUse(t.id)}</span></div><div class="m">+${agF(t.price)}<span class="px-u">${agEsc(pxUnit(t))}</span></div></div>`).join('') : '<div class="ag-empty">Aucune option. Ex : photo en plus, tirage A4, maquillage.</div>'}</div>
    <button class="btn-primary" onclick="pxOptForm(null,{back:'opts'})">${agIcon('plus', 16)} Nouvelle option</button>`);
}
function pxForm(id, pre){
  pre = pre || {};
  const t = id ? CRM.tarifs.find(x => x.id === id) : null;
  if((t ? t.kind : pre.kind) === 'option') return pxOptForm(id, pre);
  return pxPackForm(id, pre);
}
function pxOptForm(id, pre){
  pre = pre || {};
  const t = id ? CRM.tarifs.find(x => x.id === id) : null;
  const val = k => t ? (t[k] == null ? '' : t[k]) : (pre[k] != null ? pre[k] : '');
  agSheet('pxOpt', `
    <h3>${t ? "Modifier l'option" : 'Nouvelle option commune'}</h3>
    <label>Nom</label><input id="pxOName" value="${agEsc(val('name'))}" placeholder="Ex : Photo retouchée supplémentaire, Tirage A4">
    <div class="crm-2"><div><label>Prix (FCFA)</label><input id="pxOPrice" type="number" inputmode="decimal" value="${val('price')}"></div>
      <div><label>Compté</label><select id="pxOUnit">${Object.entries(PX_UNITS).map(([k, n]) => `<option value="${k}" ${(val('unit') || 'fixe') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div></div>
    <label>Détail (facultatif)</label><input id="pxOInc" value="${agEsc(val('includes'))}" placeholder="Ex : livrée sous 48 h">
    <label>Ce que ça te coûte (FCFA)</label><input id="pxOCost" type="number" inputmode="decimal" value="${val('cost')}" placeholder="Papier, encre, maquilleuse...">
    <label>Temps passé (minutes)</label>
    <div class="crm-2 px-3"><div><span class="px-mini">Séance</span><input id="pxODur" type="number" value="${val('duration_min')}"></div><div><span class="px-mini">Retouche</span><input id="pxOEdit" type="number" value="${val('edit_min')}"></div><div><span class="px-mini">Trajet</span><input id="pxOTravel" type="number" value="${val('travel_min')}"></div></div>
    <label class="ag-check"><input type="checkbox" id="pxOAct" ${!t || t.active !== false ? 'checked' : ''}> Proposée en ce moment</label>
    <label class="ag-check"><input type="checkbox" id="pxOPub" ${!t || t.public !== false ? 'checked' : ''}> Visible sur ma page de tarifs</label>
    ${t ? `<p class="ag-hint">Utilisée ${pxOptUse(t.id)}. Une modification change partout.</p>` : ''}
    <button class="btn-primary" onclick="pxOptSave(${t ? t.id : 'null'},'${agEsc(pre.back || '')}')">Enregistrer</button>
    ${t ? `<button class="btn-danger" style="width:100%;padding:12px;margin-top:8px" onclick="pxOptDelete(${t.id},'${agEsc(pre.back || '')}')">Supprimer</button>` : ''}`);
}
function pxOptBack(back){
  if(back === 'opts') pxOptsSheet();
  if(back === 'col' && PX.cf) pxCfRender();
}
async function pxOptSave(id, back){
  const v = k => (document.getElementById(k).value || '').trim();
  const data = { kind: 'option', name: v('pxOName'), category: 'Options', price: parseFloat(v('pxOPrice')) || 0, cost: parseFloat(v('pxOCost')) || 0, unit: v('pxOUnit') || 'fixe',
    includes: v('pxOInc') || null, duration_min: parseInt(v('pxODur')) || null, edit_min: parseInt(v('pxOEdit')) || null, travel_min: parseInt(v('pxOTravel')) || null,
    active: document.getElementById('pxOAct').checked, public: document.getElementById('pxOPub').checked, collection_id: null };
  if(!data.name){ alert('Donne un nom'); return; }
  try {
    if(id){
      const { data: r, error } = await sb.from('tarifs').update(data).eq('id', id).select().single();
      if(error) throw error; Object.assign(CRM.tarifs.find(x => x.id === id), r || data);
    } else {
      const pos = pxOptions().reduce((m, o) => Math.max(m, Number(o.position) || 0), 99) + 1;
      const { data: r, error } = await sb.from('tarifs').insert({ ...data, user_id: await pxUid(), position: pos }).select().single();
      if(error) throw error; CRM.tarifs.push(r);
      if(back === 'col' && PX.cf){ PX.cf.on.add(r.id); PX.cf.order = [...PX.cf.order.filter(x => PX.cf.on.has(x) && x !== r.id), r.id, ...PX.cf.order.filter(x => !PX.cf.on.has(x))]; }
    }
  } catch(e){ alert('Erreur : ' + (e.message || e)); return; }
  agCloseSheet('pxOpt'); agToast('Option enregistrée'); crmRenderTarifs(); pxOptBack(back);
}
async function pxOptDelete(id, back){
  const used = PX.cols.filter(c => (c.options || []).map(Number).includes(id));
  if(!await agConfirm(`Supprimer cette option ?${used.length ? '\nElle sera retirée de ' + used.length + ' collection' + (used.length > 1 ? 's' : '') + ' : ' + used.map(c => c.nom).join(', ') + '.' : ''}`)) return;
  const { error } = await sb.from('tarifs').delete().eq('id', id);
  if(error){ alert(error.message); return; }
  CRM.tarifs = CRM.tarifs.filter(x => x.id !== id);
  for(const c of used) await pxUpd('tarif_collections', c.id, { options: (c.options || []).map(Number).filter(x => x !== id) });
  if(PX.cf){ PX.cf.on.delete(id); PX.cf.order = PX.cf.order.filter(x => x !== id); }
  agCloseSheet('pxOpt'); agToast('Option supprimée'); crmRenderTarifs(); pxOptBack(back);
}

// ---------- Formulaire d'un pack ----------
function pxPackForm(id, pre){
  pre = pre || {};
  const t = id ? CRM.tarifs.find(x => x.id === id) : null;
  const cid = t ? (pxCol(t.collection_id) ? t.collection_id : null) : (pre.collection_id || PX.col || null);
  const c = cid ? pxCol(cid) : null;
  const val = (k, d) => t ? (t[k] == null ? '' : t[k]) : (pre[k] != null ? pre[k] : (d || ''));
  // Anciennes formules sans details : on reprend le nombre de photos et le texte "inclus"
  let det = t && t.details && typeof t.details === 'object' ? JSON.parse(JSON.stringify(t.details)) : {};
  if(t && !t.details){ if(t.photo_count) det.photos = String(t.photo_count); if(t.includes) det.lignes = [{ t: t.includes, ok: true }]; }
  if(!t && !pre.details){
    const last = c ? pxPacks(c.id).slice(-1)[0] : null; // un nouveau pack reprend la livraison du precedent
    if(last && last.details && last.details.livraison) det.livraison = last.details.livraison;
  }
  PX.pf = { lignes: (det.lignes || []).map(l => ({ t: l.t || '', ok: l.ok !== false })) };
  const tri = f => { const v = det[f.k]; return v === false ? 'no' : (v == null || v === '') ? 'hide' : 'yes'; };
  const field = f => {
    const v = det[f.k], txt = v === true || v === false || v == null ? '' : String(v);
    if(!f.tri) return `<div class="px-df"><label>${agEsc(f.n)}</label><input id="pxD_${f.k}" value="${agEsc(txt)}" placeholder="${agEsc(f.ph || '')}" oninput="pxPfPrev()"></div>`;
    const s = tri(f);
    return `<div class="px-df"><label>${agEsc(f.n)}</label>
      <div class="px-tri" id="pxT_${f.k}"><button data-v="yes" class="${s === 'yes' ? 'on' : ''}" onclick="pxTri(this)">${PX_OK} Inclus</button><button data-v="no" class="${s === 'no' ? 'on' : ''}" onclick="pxTri(this)">${PX_NO} Non inclus</button><button data-v="hide" class="${s === 'hide' ? 'on' : ''}" onclick="pxTri(this)">Ne pas afficher</button></div>
      <input id="pxD_${f.k}" value="${agEsc(txt)}" placeholder="${agEsc(f.ph || f.yes || '')}" oninput="pxPfPrev()" style="${s === 'yes' ? '' : 'display:none'}"></div>`;
  };
  const cols = pxCols();
  agSheet('pxPack', `
    <h3>${t ? 'Modifier le pack' : 'Nouveau pack'}</h3>
    <label>Nom</label><input id="pxPName" value="${agEsc(val('name'))}" placeholder="Ex : Pack Solo Essentiel" oninput="pxPfPrev()">
    <div class="crm-2"><div><label>Prix (FCFA)</label><input id="pxPPrice" type="number" inputmode="decimal" value="${val('price')}" oninput="pxPfPrev();pxCalcUi()"></div>
      <div><label>Collection</label><select id="pxPCol" onchange="pxPfPrev()"><option value="">Sans collection</option>${cols.map(x => `<option value="${x.id}" ${x.id === cid ? 'selected' : ''}>${agEsc(x.nom)}</option>`).join('')}</select></div></div>
    <div class="px-prev-w"><span class="px-mini">Aperçu (comme sur le PDF)</span><div id="pxPrev"></div></div>
    <h4 class="crm-h4">Ce qui est inclus</h4>
    <div class="px-dfs">${PX_DET.map(field).join('')}</div>
    <h4 class="crm-h4">Lignes libres</h4>
    <p class="ag-hint" style="margin:-4px 0 8px">Ce que tu veux ajouter, cochées (incluses) ou barrées (non incluses).</p>
    <div id="pxLines"></div>
    <button class="btn-secondary" onclick="pxLnAdd()">${agIcon('plus', 15)} Ajouter une ligne</button>
    <label class="ag-check"><input type="checkbox" id="pxPStar" ${c && t && c.vedette_id === t.id ? 'checked' : ''} onchange="pxPfPrev()"> Mettre en avant ("Le plus choisi")</label>
    <h4 class="crm-h4">Tes chiffres</h4>
    <label>Ce que ça te coûte (FCFA)</label><input id="pxPCost" type="number" inputmode="decimal" value="${val('cost')}" placeholder="Maquillage, transport, papier, encre..." oninput="pxCalcUi()">
    <label>Temps passé (minutes)</label>
    <div class="crm-2 px-3"><div><span class="px-mini">Séance</span><input id="pxPDur" type="number" value="${val('duration_min')}" oninput="pxCalcUi()"></div><div><span class="px-mini">Retouche</span><input id="pxPEdit" type="number" value="${val('edit_min')}" oninput="pxCalcUi()"></div><div><span class="px-mini">Trajet</span><input id="pxPTravel" type="number" value="${val('travel_min')}" oninput="pxCalcUi()"></div></div>
    <div class="ag-hint" id="pxCalc" style="margin-top:10px"></div>
    <label class="ag-check"><input type="checkbox" id="pxPAct" ${!t || t.active !== false ? 'checked' : ''}> Proposé en ce moment</label>
    <label class="ag-check"><input type="checkbox" id="pxPPub" ${!t || t.public !== false ? 'checked' : ''}> Visible sur ma page de tarifs</label>
    <button class="btn-primary" onclick="pxPackSave(${t ? t.id : 'null'})">Enregistrer</button>
    ${t ? `<button class="btn-danger" style="width:100%;padding:12px;margin-top:8px" onclick="pxPackDelete(${t.id})">Supprimer ce pack</button>` : ''}`);
  pxLnRender(); pxPfPrev(); pxCalcUi();
}
function pxTri(btn){
  agPick(btn);
  const k = btn.parentElement.id.slice(4), inp = document.getElementById('pxD_' + k);
  if(inp) inp.style.display = btn.dataset.v === 'yes' ? '' : 'none';
  pxPfPrev();
}
function pxLnSync(){
  document.querySelectorAll('#pxLines .px-ln input').forEach((i, k) => { if(PX.pf.lignes[k]) PX.pf.lignes[k].t = i.value; });
}
function pxLnRender(){
  const box = document.getElementById('pxLines'); if(!box) return;
  const L = PX.pf.lignes;
  const up = agIcon('chev', 14).replace('class="ag-i"', 'class="ag-i px-up"'), dn = agIcon('chev', 14).replace('class="ag-i"', 'class="ag-i px-dn"');
  box.innerHTML = L.map((l, k) => `<div class="px-ln">
    <button class="px-ok ${l.ok ? 'ok' : 'no'}" title="Inclus ou non inclus" onclick="pxLnOk(${k})">${pxMark(l.ok)}</button>
    <input value="${agEsc(l.t)}" placeholder="Ex : Shooting extérieur (10 retouches)" oninput="pxLnSync();pxPfPrev()">
    <button class="ag-ibtn" title="Monter" ${k === 0 ? 'disabled' : ''} onclick="pxLnMove(${k},-1)">${up}</button>
    <button class="ag-ibtn" title="Descendre" ${k === L.length - 1 ? 'disabled' : ''} onclick="pxLnMove(${k},1)">${dn}</button>
    <button class="ag-ibtn" title="Supprimer la ligne" onclick="pxLnDel(${k})">${agIcon('trash', 14)}</button></div>`).join('');
}
function pxLnAdd(){ pxLnSync(); PX.pf.lignes.push({ t: '', ok: true }); pxLnRender(); const i = document.querySelectorAll('#pxLines .px-ln input'); if(i.length) i[i.length - 1].focus(); pxPfPrev(); }
function pxLnOk(k){ pxLnSync(); PX.pf.lignes[k].ok = !PX.pf.lignes[k].ok; pxLnRender(); pxPfPrev(); }
function pxLnDel(k){ pxLnSync(); PX.pf.lignes.splice(k, 1); pxLnRender(); pxPfPrev(); }
function pxLnMove(k, d){ pxLnSync(); const L = PX.pf.lignes, j = k + d; if(j < 0 || j >= L.length) return; [L[k], L[j]] = [L[j], L[k]]; pxLnRender(); pxPfPrev(); }
function pxPfRead(){
  const g = id => ((document.getElementById(id) || {}).value || '').trim();
  const details = {};
  PX_DET.forEach(f => {
    const txt = g('pxD_' + f.k);
    if(f.tri){
      const b = document.querySelector('#pxT_' + f.k + ' button.on'), s = b ? b.dataset.v : 'hide';
      if(s === 'no') details[f.k] = false;
      else if(s === 'yes') details[f.k] = txt || true;
    } else if(txt) details[f.k] = txt;
  });
  pxLnSync();
  const lignes = PX.pf.lignes.map(l => ({ t: String(l.t || '').trim(), ok: l.ok !== false })).filter(l => l.t);
  if(lignes.length) details.lignes = lignes;
  return { name: g('pxPName'), price: parseFloat(g('pxPPrice')) || 0, details };
}
function pxPfPrev(){
  const box = document.getElementById('pxPrev'); if(!box) return;
  const s = document.getElementById('pxPStar');
  box.innerHTML = pxCardHtml(pxPfRead(), s && s.checked);
}
function pxCalcUi(){
  const g = i => parseFloat((document.getElementById(i) || {}).value) || 0;
  const price = g('pxPPrice'), cost = g('pxPCost'), m = g('pxPDur') + g('pxPEdit') + g('pxPTravel');
  const share = pxShare(), net = price - cost - share;
  const box = document.getElementById('pxCalc'); if(!box) return;
  if(!price){ box.textContent = ''; return; }
  box.innerHTML = `Tu gagnes vraiment <b>${agF(net)}</b>${share ? ` (après ${agF(share)} de charges fixes par séance)` : ''}${m ? `, soit <b>${agF(net / (m / 60))} par heure</b> de travail (${m} min au total)` : ''}.`;
}
async function pxPackSave(id){
  const v = k => ((document.getElementById(k) || {}).value || '').trim();
  const r0 = pxPfRead(), t = id ? CRM.tarifs.find(x => x.id === id) : null;
  const cid = Number(v('pxPCol')) || null, c = cid ? pxCol(cid) : null;
  if(!r0.name){ alert('Donne un nom au pack'); return; }
  const ph = r0.details.photos != null && /^\d+$/.test(String(r0.details.photos)) ? Number(r0.details.photos) : null;
  const data = {
    kind: 'formule', name: r0.name, price: r0.price, collection_id: cid, category: c ? c.nom : ((t && t.category) || null),
    details: r0.details, photo_count: ph, unit: null, cost: parseFloat(v('pxPCost')) || 0,
    duration_min: parseInt(v('pxPDur')) || null, edit_min: parseInt(v('pxPEdit')) || null, travel_min: parseInt(v('pxPTravel')) || null,
    active: document.getElementById('pxPAct').checked, public: document.getElementById('pxPPub').checked
  };
  if(!t || t.collection_id !== cid) data.position = cid ? pxPacks(cid).reduce((m, x) => Math.max(m, (Number(x.position) || 0) + 1), 0) : CRM.tarifs.length;
  const star = document.getElementById('pxPStar').checked;
  let saved;
  try {
    if(id){
      const { data: r, error } = await sb.from('tarifs').update(data).eq('id', id).select().single();
      if(error) throw error; saved = Object.assign(t, r || data);
    } else {
      const { data: r, error } = await sb.from('tarifs').insert({ ...data, user_id: await pxUid() }).select().single();
      if(error) throw error; CRM.tarifs.push(r); saved = r;
    }
    // Vedette : une seule par collection
    for(const x of PX.cols){
      if(x.vedette_id === saved.id && (x.id !== cid || !star)) await pxUpd('tarif_collections', x.id, { vedette_id: null });
    }
    if(c && star && c.vedette_id !== saved.id) await pxUpd('tarif_collections', c.id, { vedette_id: saved.id });
  } catch(e){ alert('Erreur : ' + (e.message || e)); return; }
  agCloseSheet('pxPack'); agToast('Pack enregistré');
  if(cid && PX.view === 'grille') PX.col = cid;
  crmRenderTarifs();
}
async function pxPackDelete(id){
  const t = CRM.tarifs.find(x => x.id === id); if(!t) return;
  if(!await agConfirm(`Supprimer le pack "${t.name}" ?\nIl disparaît de ta grille et de ta page. Les anciens devis gardent son nom.`)) return;
  const { error } = await sb.from('tarifs').delete().eq('id', id);
  if(error){ alert(error.message); return; }
  CRM.tarifs = CRM.tarifs.filter(x => x.id !== id);
  for(const c of PX.cols.filter(x => x.vedette_id === id)) await pxUpd('tarif_collections', c.id, { vedette_id: null });
  agCloseSheet('pxPack'); agToast('Pack supprimé'); crmRenderTarifs();
}
// Ancien nom (garde pour compatibilite)
async function crmTarifDelete(id){ const t = CRM.tarifs.find(x => x.id === id); return t && t.kind === 'option' ? pxOptDelete(id) : pxPackDelete(id); }

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
function pxNewQuote(){ PX.q = { clientId: null, clientName: '', f: {}, o: {}, customs: [], disc: 'none', discVal: 0, promoId: null, note: '', col: PX.q ? PX.q.col : null }; }
function pxQCol(){
  const q = PX.q, cols = pxCols().filter(c => c.actif !== false);
  if(q.col === 0 && pxLoose().length) return 0;
  if(q.col && cols.some(c => c.id === q.col)) return q.col;
  q.col = cols.length ? cols[0].id : 0;
  return q.col;
}
function pxCompute(){
  const q = PX.q, lines = [];
  let minutes = 0, cost = 0;
  Object.entries(q.f).forEach(([id, n]) => { const t = CRM.tarifs.find(x => x.id === Number(id)); if(t && n > 0){ const c = pxCol(t.collection_id); lines.push({ id: t.id, name: t.name + (c ? ' (' + c.nom + ')' : ''), qty: n, price: Number(t.price) }); minutes += pxMinutes(t) * n; cost += (Number(t.cost) || 0) * n + pxShare() * n; } });
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
// Collections des formules choisies (pour l'acompte et les conditions du devis)
function pxQuoteCols(){
  return [...new Set(Object.keys(PX.q.f).map(id => (CRM.tarifs.find(x => x.id === Number(id)) || {}).collection_id).filter(Boolean))].map(pxCol).filter(Boolean);
}
function pxQuoteText(r){
  const q = PX.q, name = q.clientId ? (((clients || []).find(c => c.id === q.clientId)) || {}).name : q.clientName;
  const cs = pxQuoteCols(), P = PX.page || {};
  const acc = cs.length === 1 && Number(cs[0].acompte) ? Number(cs[0].acompte) : 0;
  return `${String(P.marque || 'Henzo Studio').toUpperCase()} - Devis\n${name ? 'Pour : ' + name + '\n' : ''}Date : ${crmDate(new Date())}\n\n` +
    r.lines.map(l => `- ${l.name}${l.qty > 1 ? ' x' + l.qty : ''} : ${agN(l.price * l.qty)} F`).join('\n') +
    (r.discount ? `\n\nSous-total : ${agN(r.subtotal)} F\n${r.discLabel} : -${agN(r.discount)} F` : '') +
    `\n\nTOTAL : ${agN(r.total)} F` + (acc ? `\nAcompte pour réserver (${acc} %) : ${agN(Math.round(r.total * acc / 100))} F` : '') +
    (q.note ? `\n\n${q.note}` : '') + cs.filter(c => c.conditions).map(c => `\n\n${c.conditions}`).join('') + (P.notes ? `\n\n${P.notes}` : '') +
    `\n\n${P.marque || 'Henzo Studio'} - ${P.adresse || 'Ahougnansou, en face du Restaurant Le Rosier, Bouaké'}`;
}
function pxRenderDevis(el){
  if(!PX.q) pxNewQuote();
  const q = PX.q, cid = pxQCol(), cols = pxCols().filter(c => c.actif !== false), loose = pxLoose().filter(t => t.active !== false);
  const col = pxCol(cid);
  const f = (cid ? pxPacks(cid) : loose).filter(t => t.active !== false);
  const allO = pxOptions().filter(t => t.active !== false), colO = col ? pxColOpts(col).filter(t => t.active !== false) : [];
  const otherO = allO.filter(t => !colO.includes(t));
  const elsewhere = Object.keys(q.f).map(id => CRM.tarifs.find(x => x.id === Number(id))).filter(t => t && !f.includes(t));
  const r = pxCompute();
  const promos = CRM.promos.filter(p => crmPromoState(p) === 'Actif');
  const step = (kind, t) => { const n = q[kind][t.id] || 0; return `<div class="px-step"><button onclick="pxQty('${kind}',${t.id},-1)">-</button><b>${n}</b><button onclick="pxQty('${kind}',${t.id},1)">+</button></div>`; };
  const oLine = t => `<div class="px-line"><div class="d"><b>${agEsc(t.name)}</b><span>+${agF(t.price)}${agEsc(pxUnit(t))}</span></div>${step('o', t)}</div>`;
  const acc = col && Number(col.acompte) ? Number(col.acompte) : 0;
  el.innerHTML = `
    ${!pxFormules().length ? `<div class="ag-list"><div class="ag-empty">Ajoute d'abord tes packs dans "Ma grille".</div></div>` : ''}
    <div class="ag-sec"><h3>Nouveau devis</h3>${Object.keys(q.f).length || Object.keys(q.o).length || q.customs.length ? `<button class="crm-link" onclick="pxNewQuote();crmRenderTarifs()">Effacer</button>` : ''}</div>
    <div class="ag-list" style="padding-top:12px;padding-bottom:12px">
      <label style="margin-top:0">Client</label>
      <select onchange="PX.q.clientId=this.value?Number(this.value):null;crmRenderTarifs()"><option value="">Nouveau client / autre</option>${(clients || []).slice().sort((a, b) => a.name.localeCompare(b.name)).map(c => `<option value="${c.id}" ${c.id === q.clientId ? 'selected' : ''}>${agEsc(c.name)}</option>`).join('')}</select>
      ${q.clientId ? '' : `<input placeholder="Nom du client" value="${agEsc(q.clientName)}" oninput="PX.q.clientName=this.value" style="margin-top:8px">`}
    </div>
    ${cols.length || loose.length ? `<div class="ag-sec"><h3>Collection</h3></div>
    <div class="ag-pills px-tabs px-qcols">${cols.map(c => `<button class="${c.id === cid ? 'on' : ''}" onclick="PX.q.col=${c.id};crmRenderTarifs()">${agEsc(c.nom)}</button>`).join('')}${loose.length ? `<button class="${cid === 0 ? 'on' : ''}" onclick="PX.q.col=0;crmRenderTarifs()">Sans collection</button>` : ''}</div>` : ''}
    ${f.length ? `<div class="ag-sec"><h3>${col ? 'Packs ' + agEsc(col.nom) : 'Formules'}</h3></div><div class="ag-list">${f.map(t => `<div class="px-line"><div class="d"><b>${agEsc(t.name)}${col && col.vedette_id === t.id ? ' <i class="px-star">Le plus choisi</i>' : ''}</b><span>${agF(t.price)}${pxPhotoN(t) ? ' · ' + pxPhotoN(t) + ' photos' : ''}</span></div>${step('f', t)}</div>`).join('')}</div>` : (cols.length ? '<div class="ag-list"><div class="ag-empty">Aucun pack proposé dans cette collection.</div></div>' : '')}
    ${elsewhere.length ? `<div class="ag-sec"><h3>Aussi dans ce devis</h3></div><div class="ag-list">${elsewhere.map(t => `<div class="px-line"><div class="d"><b>${agEsc(t.name)}</b><span>${agEsc((pxCol(t.collection_id) || {}).nom || 'Sans collection')} · ${agF(t.price)}</span></div>${step('f', t)}</div>`).join('')}</div>` : ''}
    ${colO.length ? `<div class="ag-sec"><h3>Options de la collection</h3></div><div class="ag-list">${colO.map(oLine).join('')}</div>` : ''}
    ${otherO.length ? `<details class="px-det px-other" ${!colO.length || otherO.some(t => q.o[t.id]) ? 'open' : ''}><summary>${colO.length ? 'Autres options' : 'Options'} (${otherO.length})</summary><div class="ag-list">${otherO.map(oLine).join('')}</div></details>` : ''}
    <div class="ag-sec"><h3>Autre ligne</h3><button class="crm-link" onclick="PX.q.customs.push({name:'',price:'',qty:1});crmRenderTarifs()">+ Ajouter</button></div>
    ${q.customs.length ? `<div class="ag-list" style="padding-top:10px;padding-bottom:10px">${q.customs.map((c, i) => `<div class="px-custom"><input placeholder="Ex : Photo de groupe" value="${agEsc(c.name)}" oninput="PX.q.customs[${i}].name=this.value"><input type="number" placeholder="Prix" value="${agEsc(c.price)}" oninput="PX.q.customs[${i}].price=this.value" onchange="crmRenderTarifs()"><button class="ag-ibtn" onclick="PX.q.customs.splice(${i},1);crmRenderTarifs()">${agIcon('trash', 15)}</button></div>`).join('')}
      <div class="ag-hint" style="margin-top:6px">Les lignes que tu ajoutes souvent ici te seront proposées pour ta grille.</div></div>` : ''}
    <div class="ag-sec"><h3>Remise</h3></div>
    <div class="ag-pills">${[['none', 'Aucune'], ['percent', 'En %'], ['amount', 'En FCFA'], ...(promos.length ? [['promo', 'Code promo']] : [])].map(([k, n]) => `<button class="${q.disc === k ? 'on' : ''}" onclick="PX.q.disc='${k}';crmRenderTarifs()">${n}</button>`).join('')}</div>
    ${q.disc === 'percent' || q.disc === 'amount' ? `<input type="number" value="${q.discVal || ''}" placeholder="${q.disc === 'percent' ? 'Ex : 10' : 'Ex : 2000'}" onchange="PX.q.discVal=this.value;crmRenderTarifs()" style="margin-top:8px">` : ''}
    ${q.disc === 'promo' ? `<select onchange="PX.q.promoId=Number(this.value);crmRenderTarifs()" style="margin-top:8px"><option value="">Choisir</option>${promos.map(p => `<option value="${p.id}" ${p.id === q.promoId ? 'selected' : ''}>${agEsc(p.code + ' - ' + crmPromoValue(p))}</option>`).join('')}</select>` : ''}
    <label>Note (date, détails)</label><input value="${agEsc(q.note)}" oninput="PX.q.note=this.value" placeholder="Ex : Séance prévue samedi 10 h">
    <div class="px-total">
      <div class="px-total-h"><span>Total</span><b>${agF(r.total)}</b></div>
      ${r.discount ? `<div class="px-total-l"><span>Sous-total</span><span>${agF(r.subtotal)}</span></div><div class="px-total-l"><span>${agEsc(r.discLabel)}</span><span>-${agF(r.discount)}</span></div>` : ''}
      ${acc && r.total ? `<div class="px-total-l"><span>Acompte (${acc} %)</span><span>${agF(Math.round(r.total * acc / 100))}</span></div>` : ''}
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
    const { data, error } = await sb.from('devis').insert({ user_id: await pxUid(), client_id: q.clientId, client_name: name || null, items: r.lines, subtotal: r.subtotal, discount: r.discount, total: r.total, notes: q.note || null, status: 'envoye' }).select().single();
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
    if(t){ q[t.kind === 'option' ? 'o' : 'f'][t.id] = i.qty; if(t.kind !== 'option' && q.col == null) q.col = t.collection_id || 0; }
    else q.customs.push({ name: i.name, price: i.price, qty: i.qty });
  });
  const first = (d.items || []).map(i => i.id && CRM.tarifs.find(x => x.id === i.id)).find(t => t && t.kind !== 'option');
  if(first) q.col = pxCol(first.collection_id) ? first.collection_id : 0;
  agCloseSheet('pxQuote'); PX.view = 'devis'; crmRenderTarifs();
}

// ---------- Conseiller IA ----------
function pxPackBrief(t, c){
  const ls = pxDetLines(t).map(l => (l.ok ? '✔ ' : '✘ ') + l.t).join(' ; ');
  return `  - ${t.name} : ${Math.round(t.price)} F${c && c.vedette_id === t.id ? ' [MIS EN AVANT]' : ''}${t.public === false ? ' [masqué sur la page]' : ''}${t.active === false ? ' [plus proposé]' : ''}${pxPhotoN(t) ? ', ' + pxPhotoN(t) + ' photos (' + Math.round(t.price / pxPhotoN(t)) + ' F la photo)' : ''}${t.cost ? ', coût ' + Math.round(t.cost) + ' F' : ''}${pxMinutes(t) ? ', ' + pxMinutes(t) + ' min de travail' : ''}${ls ? ' | ' + ls : ''}`;
}
function pxColBrief(c){
  const w = pxWarn(c);
  return `## ${c.nom}${c.sous_titre ? ' (' + c.sous_titre + ')' : ''}${c.public === false ? ' [masquée]' : ''}${c.actif === false ? ' [plus proposée]' : ''}
  Acompte : ${Number(c.acompte) ? Number(c.acompte) + ' %' : 'aucun'}. Conditions : ${c.conditions || 'aucune'}
  Packs :
${pxPacks(c.id).map(t => pxPackBrief(t, c)).join('\n') || '  (aucun)'}
  Options proposées : ${pxColOpts(c).map(o => `${o.name} +${Math.round(o.price)} F${pxUnit(o)}`).join(' ; ') || 'aucune'}${w.length ? '\n  Alertes de l\'app : ' + w.map(x => x.m).join(' / ') : ''}`;
}
function pxContext(){
  const i = CRM.info, st = pxTypeStats(), P = PX.page || {};
  const dv = PX.devis.slice(0, 30);
  const marche = (i.marche || []).filter(x => x.a);
  const loose = pxLoose();
  return `Tu es le conseiller tarifs de ${P.marque || 'Henzo Studio'}, studio photo et vidéo à Bouaké (Côte d'Ivoire), quartier Ahougnansou. Monnaie : FCFA. Spécialités : portrait studio, anniversaires d'enfants, mariage, dot, grossesse, famille, événements. Il fait aussi de petites impressions (format A4...).
Ses tarifs sont rangés en COLLECTIONS (une grille par type de séance). Chaque collection a ses packs (du moins cher au plus cher), ses options choisies dans une liste commune, son acompte et ses conditions. Donne tes conseils collection par collection.
COLLECTIONS :
${pxCols().map(pxColBrief).join('\n') || '(aucune)'}
${loose.length ? 'FORMULES SANS COLLECTION (anciennes) :\n' + loose.map(t => pxPackBrief(t, null)).join('\n') + '\n' : ''}OPTIONS COMMUNES (liste commune) :
${pxOptions().map(t => `- ${t.name} : +${Math.round(t.price)} F${pxUnit(t)}${t.cost ? ', coût ' + Math.round(t.cost) + ' F' : ''}${pxMinutes(t) ? ', ' + pxMinutes(t) + ' min' : ''}${t.active === false ? ' (plus proposée)' : ''}`).join('\n') || '(aucune)'}
CONDITIONS COMMUNES : ${P.notes || '(aucune)'}
PRIX RÉELLEMENT PAYÉS (12 mois) :
${st.map(x => `- ${x.type} : ${x.n} séances, moyenne ${Math.round(x.avg)} F (de ${Math.round(x.min)} à ${Math.round(x.max)})`).join('\n') || '(pas de données)'}
DEVIS RÉCENTS (et réponse du client) :
${dv.map(d => `- ${(d.items || []).map(x => x.name + (x.qty > 1 ? ' x' + x.qty : '') + ' ' + Math.round(x.price) + ' F').join(' + ')} = ${Math.round(d.total)} F -> ${{ envoye: 'sans réponse', accepte: 'ACCEPTÉ', refuse: 'REFUSÉ' }[d.status] || d.status}`).join('\n') || '(aucun)'}
CHIFFRES : charges fixes ${i.charges || '?'} F/mois, ${i.seances || '?'} séances/mois, objectif ${i.objectif || '?'} F/mois après charges. Matériel : ${i.materiel || '?'}. Clientèle : ${i.clientele || '?'}. Concurrents : ${i.concurrents || '?'}.
CE QUE HENZO SAIT DE SON MARCHÉ :
${marche.map(x => `- ${x.q} -> ${x.a}`).join('\n') || '(rien encore)'}
Règles : français simple, sans jargon, sans tirets longs, montants réalistes pour Bouaké, honnête même si ce n'est pas ce qu'il veut entendre. Ne présente pas des suppositions comme des faits : si tu ne connais pas un prix du marché, dis que c'est une estimation.`;
}
async function pxAnaCol(cid){
  const c = pxCol(cid); if(!c) return;
  const box = document.getElementById('pxColAna') || document.getElementById('pxCcAna');
  if(box) box.innerHTML = '<div class="ag-empty">L\'IA analyse cette collection...</div>';
  try {
    const r = await callAI(pxContext() + `\n\nAnalyse uniquement la collection "${c.nom}". Vérifie :
- les paliers : chaque pack plus cher apporte-t-il clairement plus au client ? Les écarts de prix sont-ils logiques ?
- le prix par photo de chaque pack, et le prix des options (une photo en plus ne doit pas coûter moins cher qu'une photo dans un pack) ;
- le pack mis en avant : est-ce le bon pour faire monter le panier ?
- l'acompte, les conditions, le délai de livraison ;
- les prix par rapport au marché de Bouaké (dis quand c'est une estimation).
Réponds avec ces parties :
# Verdict (une phrase)
# Les paliers
# Prix conseillés (liste : pack -> prix actuel -> prix conseillé -> pourquoi)
# Les options
# 3 améliorations concrètes (ce qu'il faut changer exactement dans la grille)`);
    const all = Object.assign({}, CRM.info.col_ana || {}); all[cid] = { text: r, date: new Date().toISOString() };
    CRM.info = Object.assign({}, CRM.info, { col_ana: all });
    await crmSavePrefs({ tarif_info: CRM.info });
  } catch(e){ if(box) box.innerHTML = `<div class="ag-empty">${agEsc(e.message)}</div>`; return; }
  crmRenderTarifs();
}
async function pxAskCol(){
  const c = pxCol(PX.ccol); if(!c) return;
  const q = (document.getElementById('pxCcQ') || {}).value || ''; if(!q.trim()) return;
  const box = document.getElementById('pxCcR'); box.innerHTML = '<div class="ag-empty">Réflexion...</div>';
  const ana = (CRM.info.col_ana || {})[c.id];
  try {
    const r = await callAI(pxContext() + `\n\n${ana ? 'Ton analyse précédente de la collection "' + c.nom + '" :\n' + ana.text + '\n\n' : ''}Henzo revoit ses prix de la collection "${c.nom}". Sa question : ${q}\nRéponds court et concret, avec des prix exacts si c'est utile.`);
    box.innerHTML = `<div class="ag-list crm-ana" style="margin-top:10px"><p><b>${agEsc(q)}</b></p>${crmMd(r)}</div>`;
  } catch(e){ box.innerHTML = `<div class="ag-empty">${agEsc(e.message)}</div>`; }
}
function pxRenderConseil(el){
  const i = CRM.info, marche = (i.marche || []).filter(x => x.a);
  const mq = PX.mq, cols = pxCols();
  if(cols.length && !pxCol(PX.ccol)) PX.ccol = cols[0].id;
  const cc = pxCol(PX.ccol), ana = cc ? (i.col_ana || {})[cc.id] : null;
  el.innerHTML = `
    ${cols.length ? `<div class="ag-sec"><h3>Revoir mes prix par collection</h3></div>
    <div class="ag-pills px-tabs">${cols.map(c => `<button class="${c.id === PX.ccol ? 'on' : ''}" onclick="PX.ccol=${c.id};crmRenderTarifs()">${agEsc(c.nom)}${(i.col_ana || {})[c.id] ? ' <i>✔</i>' : ''}</button>`).join('')}</div>
    <div class="ag-list" style="padding:12px 16px">
      <p class="ag-hint" style="margin:0 0 8px">${agEsc(cc.nom)} : ${pxPacks(cc.id).length} packs, ${agEsc(pxRangeTxt(cc).toLowerCase())}.${pxWarn(cc).length ? ' ⚠ ' + pxWarn(cc).length + ' point(s) à vérifier.' : ''}</p>
      <div class="crm-ana" id="pxCcAna" style="padding:0">${ana ? crmMd(ana.text) : ''}</div>
      <button class="btn-primary" style="width:100%;margin-top:10px" onclick="pxAnaCol(${cc.id})">${ana ? 'Refaire l\'analyse' : 'Analyser cette collection'}</button>
      <div class="crm-row-in" style="margin-top:10px"><input id="pxCcQ" placeholder="Ex : je monte le Signature à 45 000 F ?"><button class="btn-secondary" onclick="pxAskCol()">Demander</button></div>
      <div id="pxCcR"></div>
      <button class="crm-link" onclick="PX.col=${cc.id};PX.view='grille';crmRenderTarifs()">Ouvrir la collection pour changer les prix</button>
    </div>` : ''}

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
      <textarea id="pxIdea" rows="3" oninput="PX.idea=this.value" placeholder="Ex : je passe le Pack Solo Éclat à 22 000 F. Ou : photo en plus à 6 000 F au lieu de 5 000 F.">${agEsc(PX.idea)}</textarea>
      <button class="btn-primary" style="width:100%;margin-top:10px" onclick="pxTestIdea()">Est-ce une bonne idée ?</button>
      <div id="pxIdeaRes" class="crm-ana">${PX.ideaRes ? crmMd(PX.ideaRes) : ''}</div>
    </div>

    <div class="ag-sec"><h3>Options à ajouter</h3></div>
    <div class="ag-list" style="padding:12px 16px">
      <p class="ag-hint" style="margin:0 0 10px">L'IA te propose des options et suppléments pour gagner plus par client (impressions, retouches, vidéo...). Tu ajoutes celles qui te plaisent en 1 clic dans ta liste commune.</p>
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
# Les paliers de la collection (est-ce que les packs restent logiques entre eux ?)
# Par rapport au marché de Bouaké
# Ma proposition (le prix ou le pack exact à mettre)`);
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
    const r = await callAI(pxContext() + `\n\nPropose 4 options ou suppléments que Henzo n'a pas encore dans sa liste commune et qui feraient monter le panier moyen sans faire fuir ses clients (exemples possibles : tirage A4, cadre, photo en plus, retouche avancée, livraison express, personne en plus, tenue en plus, vidéo courte, maquillage). Dis pour quelles collections chaque option est utile. Prix réalistes pour Bouaké. Unités possibles : fixe, personne, tirage, photo, heure, tenue. Réponds uniquement en JSON : {"options":[{"name":"...","price":0,"unit":"fixe","why":"une phrase"}]}`);
    PX.sugg = (crmJson(r).options || []).filter(x => x && x.name).slice(0, 5);
  } catch(e){ PX.sugg = null; alert(e.message); }
  const b = document.getElementById('pxSugg'); if(b) b.innerHTML = pxSuggHtml();
}
async function pxAddSugg(k){
  const s = PX.sugg[k]; if(!s) return;
  const pos = pxOptions().reduce((m, o) => Math.max(m, Number(o.position) || 0), 99) + 1;
  const { data, error } = await sb.from('tarifs').insert({ user_id: await pxUid(), kind: 'option', name: s.name, price: Number(s.price) || 0, unit: PX_UNITS[s.unit] ? s.unit : 'fixe', category: 'Options', includes: s.why || null, active: true, public: true, position: pos }).select().single();
  if(error){ alert(error.message); return; }
  CRM.tarifs.push(data); s.added = true;
  document.getElementById('pxSugg').innerHTML = pxSuggHtml(); agToast('Ajouté aux options communes : coche-la dans tes collections');
}
async function crmAnalyse(){
  const el = document.getElementById('crmAna');
  if(el) el.innerHTML = '<div class="ag-empty">L\'IA analyse tes tarifs...</div>';
  try {
    const r = await callAI(pxContext() + `\n\nAnalyse toute la grille, collection par collection. Structure :
# Ce qui va bien
# Ce qui pose problème (prix trop bas, paliers incohérents, marge faible, temps mal payé, écarts entre grille et prix réels, devis refusés)
# Prix conseillés (par collection : pack -> prix actuel -> prix conseillé -> pourquoi)
# Les options (prix, et dans quelles collections les proposer)
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
  const p = PX.page || {}, link = pxLink(), cols = pxCols();
  const shareBtns = cid => `<div class="px-shb">
      <button class="ag-ibtn" title="Copier le lien" onclick="pxCopyLink(${cid || 0})">${agIcon('link', 16)}</button>
      <button class="ag-ibtn" title="PDF" onclick="pxOpen(pxPdfLink(${cid ? 'pxCol(' + cid + ')' : 'null'}))">${agIcon('download', 16)}</button>
      <button class="ag-ibtn" title="WhatsApp" onclick="pxWa(${cid || 0})">${agIcon('chat', 16)}</button>
      <button class="ag-ibtn" title="Voir" onclick="pxOpen(${cid ? 'pxColLink(pxCol(' + cid + '))' : 'pxLink()'})">${agIcon('eye', 16)}</button></div>`;
  el.innerHTML = `
    ${link ? `<div class="ag-sec" style="margin-top:12px"><h3>Catalogue complet</h3></div>
    <div class="ag-list ag-share">
      <div class="ag-share-row px-shrow"><div style="min-width:0"><span>Toutes les collections</span><b class="ag-link">${agEsc(link)}</b></div>${shareBtns(0)}</div>
      <div class="ag-share-row"><div style="min-width:0"><span>Lien pour réserver en ligne</span><b class="ag-link">${agEsc(typeof otResaLink === 'function' ? otResaLink('') : '')}</b></div>
        <button class="ag-ibtn" title="Copier le lien" onclick="crmCopy(otResaLink(''))">${agIcon('link', 17)}</button></div></div>
    <button class="btn-secondary" style="margin:-6px 0 6px" onclick="crmCopyGrille()">${agIcon('copy', 15)} Copier tous mes tarifs en texte</button>
    <p class="ag-hint" style="margin:4px 2px 12px">PDF : la page s'ouvre, choisis "Enregistrer en PDF" pour la garder ou l'envoyer.</p>
    <div class="ag-sec"><h3>Par collection</h3><span class="crm-count">${cols.length}</span></div>
    <div class="ag-list ag-share">${cols.length ? cols.map(c => `<div class="ag-share-row px-shrow ${c.public === false || c.actif === false ? 'off' : ''}"><div style="min-width:0"><span>${agEsc(c.nom)}${c.public === false ? ' · masquée' : ''}${c.actif === false ? ' · plus proposée' : ''}</span><b class="ag-link">${agEsc('...&c=' + (c.slug || ''))}</b></div>${shareBtns(c.id)}</div>`).join('') : '<div class="ag-empty">Crée tes collections dans "Ma grille".</div>'}</div>` :
    `<div class="crm-fete" style="cursor:default"><div class="ic">${agIcon('link')}</div><div class="d"><b>Crée ta page de tarifs</b><span>Un lien et un PDF par collection, plus un catalogue complet. Le client choisit son pack et te réserve sur WhatsApp.</span></div></div>`}
    <div class="ag-sec"><h3>Ma page</h3></div>
    <div class="ag-list" style="padding:4px 16px 14px">
      <label>Marque</label><input id="pxMarque" value="${agEsc(p.marque || 'Henzo Photographie')}">
      <label>Slogan</label><input id="pxSlogan" value="${agEsc(p.slogan || '')}" placeholder="Ex : Sublimer chaque instant de vie">
      <label>Adresse du lien</label><div class="px-slug"><span>.../tarifs.html?s=</span><input id="pxSlug" value="${agEsc(p.slug || 'henzo')}"></div>
      <label>Titre de la page</label><input id="pxTitle" value="${agEsc(p.title || 'Henzo Photographie - Tarifs')}">
      <label>Numéro WhatsApp pour réserver</label><input id="pxPhone" type="tel" value="${agEsc(p.phone || (typeof BRAND !== 'undefined' ? BRAND.whatsapp : ''))}">
      <label>Instagram</label><input id="pxInsta" value="${agEsc(p.instagram || '')}" placeholder="Ex : @henzophotographie">
      <label>Adresse du studio</label><input id="pxAdr" value="${agEsc(p.adresse || '')}" placeholder="Ex : Ahougnansou, en face du Restaurant Le Rosier, Bouaké">
      <label>Petit texte d'accueil</label><textarea id="pxIntro" rows="2" placeholder="Ex : Studio photo à Bouaké. Portraits, familles, mariages.">${agEsc(p.intro || '')}</textarea>
      <label>Conditions communes (sur toutes les collections)</label><textarea id="pxNotes" rows="3" placeholder="Ex : Réservation : acompte de 50 % pour bloquer votre date.">${agEsc(p.notes || '')}</textarea>
      <button class="btn-primary" style="margin-top:12px" onclick="pxSavePage()">${link ? 'Enregistrer' : 'Créer ma page'}</button>
    </div>`;
}
async function pxSavePage(){
  const v = k => document.getElementById(k).value.trim();
  const slug = pxSlugify(v('pxSlug')) || 'henzo';
  const row = { user_id: await pxUid(), slug, title: v('pxTitle') || null, phone: crmPhone(v('pxPhone')) || null, intro: v('pxIntro') || null, notes: v('pxNotes') || null,
    marque: v('pxMarque') || null, slogan: v('pxSlogan') || null, instagram: v('pxInsta') || null, adresse: v('pxAdr') || null };
  const { data, error } = await sb.from('tarif_page').upsert(row, { onConflict: 'user_id' }).select().single();
  if(error){ alert(/duplicate|unique/i.test(error.message) ? 'Cette adresse est déjà prise, choisis-en une autre.' : error.message); return; }
  PX.page = data || row; agToast('Page enregistrée'); crmRenderTarifs();
}
function crmCopyGrille(){
  const pub = t => t.active !== false && t.public !== false;
  const cols = pxCols().filter(c => c.public !== false && c.actif !== false), P = PX.page || {};
  if(!cols.some(c => pxPacks(c.id).some(pub))){ agToast("Ajoute d'abord des packs"); return; }
  const txt = `${String(P.marque || 'Henzo Studio').toUpperCase()} - Tarifs` + cols.map(c => {
    const ps = pxPacks(c.id).filter(pub); if(!ps.length) return '';
    const os = pxColOpts(c).filter(pub);
    return `\n\n${c.nom.toUpperCase()}${c.sous_titre ? ' - ' + c.sous_titre : ''}\n` + ps.map(t => `- ${t.name} : ${agN(t.price)} F${c.vedette_id === t.id ? ' (le plus choisi)' : ''}\n` + pxDetLines(t).map(l => `   ${l.ok ? '✔' : '✘'} ${l.t}`).join('\n')).join('\n') +
      (os.length ? '\nOptions : ' + os.map(o => `${o.name} +${agN(o.price)} F${pxUnit(o)}`).join(' ; ') : '') +
      (Number(c.acompte) ? `\nAcompte : ${Number(c.acompte)} %` : '') + (c.conditions ? '\n' + c.conditions : '');
  }).join('') + (P.notes ? '\n\n' + P.notes : '') + (pxLink() ? '\n\nTous les détails : ' + pxLink() : '') +
    '\n\n' + (P.adresse || 'Ahougnansou, en face du Restaurant Le Rosier, Bouaké');
  crmCopy(txt);
}

// ---------- Demarrage ----------
(async function pxInit(){
  await pxLoad();
  const a = document.querySelector('.page.active');
  if(a && a.id === 'page-tarifs') crmRenderTarifs();
})();
