// ============================================================
// PATRON.JS - Verifier mes comptes, Mode patron, message "Comment reserver"
// ------------------------------------------------------------
// Charge par argent.js (apres app.js, modules.js, coach.js, argent.js).
// Table : manquants (dette de Henzo envers le studio).
//
// Regles d'argent (les memes que argent.js et budget.js) :
//   - une depense part toujours d'un COMPTE ;
//   - de l'argent qui manque dans un COFFRE = transfert coffre -> compte,
//     puis depense "Manquant constate" depuis ce compte ;
//   - un coffre ne devient jamais negatif : on verifie avant d'ecrire ;
//   - chaque mouvement cree va dans txs (txs.unshift), puis refreshAll() ;
//   - toutes les ecritures portent _agRaw:true (pas de devinette).
//
// Mode patron (decide avec Henzo) : tant qu'un manquant est ouvert, a chaque
// repartition 50/30/20 validee, une part du "Salaire photographe" (20 % par
// defaut) part vers le coffre qui a perdu l'argent (Revenu Studio par defaut).
//
// Fonctions pour les autres fichiers :
//   rdvMessage(client?)  texte "Comment prendre rendez-vous" (variables remplacees)
//   ptVerifier()         ouvre "Verifier mes comptes"
//   ptResume()           {ouvert, du, rembourse, pct, prochaineRetenue}
//   ptRdv                outils du message (texte de base, moyens, rendu)
// ============================================================

const PT = { rows: [], loaded: false, busy: false, v: null, rep: { skip: false }, deleted: new Set() };
const PT_PCT = 20;
const PT_KEY_VERIF = 'pt_derniere_verif';
const PT_KEY_DIR = 'pt_directives';
const PT_KEY_RDV = 'pt_rdv_cache';

// ============================================================
// B. MESSAGE "COMMENT PRENDRE RENDEZ-VOUS" (exporte tout de suite)
// ============================================================
const PT_RDV_DEFAUT = `Bonjour 😊 Merci pour votre intérêt pour Henzo Photographie !
Pour réserver votre séance, c'est simple :
1. Choisissez votre pack ici : {lien_tarifs}
2. Envoyez-nous : votre nom et prénom, le jour et l'heure souhaités, et le pack choisi.
3. Nous vérifions la disponibilité et vous envoyons un lien de paiement.
4. Vous payez un acompte de {acompte} par {moyens} pour bloquer votre date. Pas de {moyen} ? Dites-le-nous, nous vous proposerons un autre moyen.
5. Vous recevez votre confirmation et votre reçu. Le reste se règle le jour de la séance.
📍 {adresse}.
À très vite !`;
// n = nom affiche, p = forme dans une phrase ("par ..."), c = forme courte ("Pas de ...")
const PT_MOYENS = [
  { k: 'wave', n: 'Wave', p: 'Wave', c: 'Wave' },
  { k: 'orange', n: 'Orange Money', p: 'Orange Money', c: 'Orange Money' },
  { k: 'mtn', n: 'MTN Money', p: 'MTN Money', c: 'MTN Money' },
  { k: 'moov', n: 'Moov Money', p: 'Moov Money', c: 'Moov Money' },
  { k: 'especes', n: 'Espèces au studio', p: 'en espèces au studio', c: 'espèces' },
  { k: 'virement', n: 'Virement bancaire', p: 'virement bancaire', c: 'virement' }
];
const PT_ADRESSE = 'Ahougnansou, en face du Restaurant Le Rosier, Bouaké';

function ptNoDash(s){ return String(s == null ? '' : s).replace(/[–—]/g, '-'); }
function ptJson(v, def){
  if(v == null) return def;
  if(typeof v === 'string'){ try { return JSON.parse(v); } catch(e){ return def; } }
  return v;
}
// Moyens enregistres (tous, avec leur numero) : [{k, on, info}]
function ptRdvMoyens(page){
  const m = ptJson(page && page.moyens_paiement, null);
  const list = Array.isArray(m) ? m.filter(x => x && PT_MOYENS.some(d => d.k === x.k)) : [];
  return list.length ? list : [{ k: 'wave', on: true, info: '' }];
}
// Seulement les moyens coches, dans l'ordre de PT_MOYENS (especes et virement a la fin)
function ptRdvMoyensOn(page, liste){
  const l = (liste || ptRdvMoyens(page)).filter(x => x.on !== false);
  const on = PT_MOYENS.filter(d => l.some(x => x.k === d.k)).map(d => ({ ...d, info: (l.find(x => x.k === d.k) || {}).info || '' }));
  return on.length ? on : [{ ...PT_MOYENS[0], info: '' }];
}
function ptRdvJoin(arr){ return arr.length <= 1 ? (arr[0] || '') : arr.slice(0, -1).join(', ') + ' ou ' + arr[arr.length - 1]; }
// La page de tarifs : celle de l'app si elle est chargee, sinon la derniere connue
function ptRdvPage(){
  if(typeof PX !== 'undefined' && PX && PX.page){
    const p = PX.page;
    try { localStorage.setItem(PT_KEY_RDV, JSON.stringify({ slug: p.slug || '', adresse: p.adresse || '', comment_reserver: p.comment_reserver || null, moyens_paiement: ptJson(p.moyens_paiement, null), acompte: ptRdvAcompteNb() })); } catch(e){}
    return p;
  }
  try { return JSON.parse(localStorage.getItem(PT_KEY_RDV) || 'null'); } catch(e){ return null; }
}
// Acompte le plus courant dans les collections visibles (50 % par defaut)
function ptRdvAcompteNb(){
  const cols = (typeof PX !== 'undefined' && PX && Array.isArray(PX.cols)) ? PX.cols.filter(c => c.public !== false && c.actif !== false && Number(c.acompte) > 0) : [];
  if(!cols.length){ const p = typeof PX !== 'undefined' && PX && PX.page ? null : ptRdvPageCache(); return p && Number(p.acompte) > 0 ? Number(p.acompte) : 50; }
  const n = {}; cols.forEach(c => { const a = Number(c.acompte); n[a] = (n[a] || 0) + 1; });
  return Number(Object.entries(n).sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0]);
}
function ptRdvPageCache(){ try { return JSON.parse(localStorage.getItem(PT_KEY_RDV) || 'null'); } catch(e){ return null; } }
function ptRdvLiens(page){
  const slug = page && page.slug;
  const t = typeof pxLink === 'function' && typeof PX !== 'undefined' && PX && PX.page ? pxLink() : (slug ? `${location.origin}/tarifs.html?s=${encodeURIComponent(slug)}` : '');
  const r = typeof otResaLink === 'function' && typeof PX !== 'undefined' && PX && PX.page ? otResaLink('') : (slug ? `${location.origin}/reserver.html?s=${encodeURIComponent(slug)}` : '');
  return { tarifs: t || '', resa: r || '' };
}
function ptPrenom(c){
  if(!c) return '';
  if(typeof c === 'string') c = { name: c };
  if(typeof crmFirst === 'function') return crmFirst(c) || '';
  const w = String(c.name || '').trim().split(/\s+/)[0] || '';
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}
// Remplace les variables. o = {tpl, page, moyens (liste [{k,on,info}]), client, acompte}
function ptRdvTexte(o){
  o = o || {};
  const page = o.page !== undefined ? o.page : ptRdvPage();
  let t = String(o.tpl != null ? o.tpl : ((page && page.comment_reserver) || PT_RDV_DEFAUT));
  const on = ptRdvMoyensOn(page, o.moyens);
  const liens = ptRdvLiens(page);
  const acc = o.acompte != null ? Number(o.acompte) : ptRdvAcompteNb();
  const prenom = ptPrenom(o.client);
  const adr = String((page && page.adresse) || PT_ADRESSE).trim().replace(/[.\s]+$/, '');
  if(prenom && !/\{prenom\}/i.test(t)) t = t.replace(/^(\s*Bonjour)\b/i, '$1 ' + prenom);
  // Lien absent (page pas encore creee) : on enleve le lien et le "ici :" juste avant
  [['lien_tarifs', liens.tarifs], ['lien_reservation', liens.resa]].forEach(([k, v]) => {
    if(!v) t = t.replace(new RegExp('\\s*(?:ici\\s*)?:?\\s*\\{' + k + '\\}', 'gi'), '');
    else t = t.replace(new RegExp('\\{' + k + '\\}', 'gi'), v);
  });
  t = t.replace(/\{prenom\}/gi, prenom)
    .replace(/\{adresse\}/gi, adr)
    .replace(/\{acompte\}/gi, (acc || 50) + ' %')
    .replace(/\{moyens\}/gi, ptRdvJoin(on.map(m => m.p)))
    .replace(/\{moyen\}/gi, on[0].c)
    .replace(/\{numeros\}/gi, on.filter(m => m.info).map(m => m.n + ' : ' + m.info).join('\n'));
  t = t.replace(/\bpar en espèces/g, 'en espèces').replace(/\bPas de ([AEIOUYÉÈaeiouyéè])/g, "Pas d'$1").replace(/\bBonjour\s+😊/, 'Bonjour 😊');
  return ptNoDash(t).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
function rdvMessage(client, opts){
  try { return ptRdvTexte({ ...(opts || {}), client: client || null }); }
  catch(e){ return ptNoDash(PT_RDV_DEFAUT).replace(/\s*ici\s*:\s*\{lien_tarifs\}/, '').replace('{acompte}', '50 %').replace('{moyens}', 'Wave').replace('{moyen}', 'Wave').replace('{adresse}', PT_ADRESSE); }
}
window.rdvMessage = rdvMessage;
window.ptRdv = { DEFAUT: PT_RDV_DEFAUT, MOYENS: PT_MOYENS, moyens: ptRdvMoyens, moyensOn: ptRdvMoyensOn, texte: ptRdvTexte, join: ptRdvJoin };

// ------------------------------------------------------------
// STYLE
// ------------------------------------------------------------
(function ptStyle(){
  if(document.getElementById('ptStyle')) return;
  const st = document.createElement('style');
  st.id = 'ptStyle';
  st.textContent = `
.pt-verif{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:12px 14px;display:flex;align-items:center;gap:12px;cursor:pointer;margin:2px 0 14px}
.pt-verif .ic{width:36px;height:36px;border-radius:12px;background:var(--card2);display:grid;place-items:center;color:var(--light);flex-shrink:0}
.pt-verif .d{flex:1;min-width:0}
.pt-verif .d b{display:block;font-size:14px;color:var(--text)}
.pt-verif .d span{display:block;font-size:12px;color:var(--muted);margin-top:2px;line-height:1.4}
.pt-verif.warn{border-color:rgba(245,197,66,.55)}.pt-verif.warn .ic{color:var(--yellow)}
.pt-card{background:var(--card);border:1.5px solid var(--yellow);border-radius:18px;padding:14px;margin:0 0 14px}
.pt-card-h{display:flex;gap:12px;align-items:center}
.pt-card-h .ic{width:40px;height:40px;border-radius:12px;background:rgba(245,197,66,.14);color:var(--yellow);display:grid;place-items:center;flex-shrink:0}
.pt-card-h b{display:block;font-size:15px;color:var(--text)}
.pt-card-h span{display:block;font-size:12.5px;color:var(--muted);margin-top:2px}
.pt-card-h span b{display:inline;font-size:inherit;color:var(--text)}
.pt-bar{height:9px;border-radius:6px;background:var(--card2);border:1px solid var(--border);overflow:hidden;margin:12px 0 6px}
.pt-bar i{display:block;height:100%;background:var(--yellow);border-radius:6px}
.pt-card-s{display:flex;justify-content:space-between;gap:8px;font-size:12px;color:var(--muted)}
.pt-card-r{margin-top:8px;font-size:12.5px;color:var(--text-2, var(--text));line-height:1.45}
.pt-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
.pt-btns button{margin:0;width:100%;padding:10px 8px;border-radius:12px;background:var(--card2);border:1px solid var(--border);color:var(--text);font:600 12.5px Inter,sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;text-align:center;line-height:1.25}
.pt-btns button.main{border-color:var(--yellow);color:var(--text)}
.pt-sec{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:16px 2px 8px}
.pt-vrow{background:var(--card2);border:1px solid var(--border);border-radius:14px;padding:11px 12px;margin-bottom:8px}
.pt-vrow .h{display:flex;justify-content:space-between;gap:8px;align-items:baseline}
.pt-vrow .h b{font-size:14px;color:var(--text);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pt-vrow .h span{font-size:12px;color:var(--muted);white-space:nowrap}
.pt-vrow .r{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin-top:8px;align-items:center}
.pt-vrow .r input{margin:0 !important;font-size:16px}
.pt-vrow .r button{margin:0;width:auto;padding:10px 12px;border-radius:12px;background:var(--card);border:1px solid var(--accent);color:var(--light);font:600 12.5px Inter,sans-serif;cursor:pointer;white-space:nowrap}
.pt-vrow .ec{font-size:12.5px;margin-top:6px;color:var(--muted);min-height:0}
.pt-vrow .ec:empty{display:none}
.pt-vrow .ec.ok{color:var(--green)}.pt-vrow .ec.plus{color:var(--green)}.pt-vrow .ec.moins{color:var(--red);font-weight:600}
.pt-vrow.ok{border-color:var(--green)}.pt-vrow.moins{border-color:var(--red)}
.pt-tot{margin:12px 0 4px;padding:12px 14px;border-radius:14px;background:var(--card2);border:1px solid var(--border);font-size:13px;color:var(--muted);display:flex;justify-content:space-between;gap:8px;align-items:baseline}
.pt-tot b{font-size:18px;color:var(--text)}
.pt-tot.moins b{color:var(--red)}.pt-tot.plus b{color:var(--green)}
.pt-line{display:flex;justify-content:space-between;gap:8px;padding:9px 0;border-bottom:1px solid var(--border);font-size:13.5px;color:var(--text)}
.pt-line:last-child{border-bottom:0}
.pt-line b{white-space:nowrap}.pt-line b.moins{color:var(--red)}.pt-line b.plus{color:var(--green)}
.pt-box{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:2px 14px;margin:6px 0 10px}
.pt-info{margin:10px 0;padding:11px 13px;border-radius:12px;background:var(--card2);border:1px solid var(--border);font-size:12.5px;line-height:1.55;color:var(--text)}
.pt-info.warn{border-color:var(--yellow);background:rgba(245,197,66,.08)}
.pt-info.red{border-color:var(--red)}
.pt-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.pt-chips button{margin:0;width:auto;padding:7px 11px;border-radius:10px;background:var(--card2);border:1px solid var(--border);color:var(--text);font:600 12px Inter,sans-serif;cursor:pointer}
.pt-tag{font-style:normal;font-size:10px;font-weight:700;color:var(--accent);margin-left:4px}
.pt-rep{margin:0 0 12px;padding:12px;border-radius:12px;border:1px dashed var(--yellow);background:rgba(245,197,66,.08);font-size:12.8px;line-height:1.5;color:var(--text)}
.pt-rep small{display:block;color:var(--muted);margin-top:4px}
.pt-rep button{margin:8px 0 0;width:auto;padding:8px 12px;border-radius:10px;background:var(--card2);border:1px solid var(--yellow);color:var(--text);font:600 12.5px Inter,sans-serif;cursor:pointer}
.pt-rep.skip{border-style:solid;border-color:var(--border);background:var(--card2)}
.pt-dir{display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-bottom:1px solid var(--border)}
.pt-dir:last-child{border-bottom:0}
.pt-dir .ck{width:30px;height:30px;border-radius:10px;border:1.5px solid var(--border);background:var(--card2);display:grid;place-items:center;flex-shrink:0;cursor:pointer;color:transparent;margin:0;padding:0}
.pt-dir .ck.on{background:var(--green);border-color:var(--green);color:#06221c}
.pt-dir .d{flex:1;min-width:0}
.pt-dir .d b{display:block;font-size:14px;color:var(--text);line-height:1.4;font-weight:600}
.pt-dir .d span{display:block;font-size:12px;color:var(--muted);margin-top:3px}
.pt-dir .d span.on{color:var(--green)}
.pt-ia{margin-top:10px;padding:12px 14px;border-radius:12px;background:var(--card2);border:1px solid var(--accent);font-size:13px;line-height:1.55;color:var(--text);white-space:pre-wrap}
.pt-ia:empty{display:none}
.pt-fuite{padding:11px 0;border-bottom:1px solid var(--border)}
.pt-fuite:last-child{border-bottom:0}
.pt-fuite b{display:block;font-size:13.5px;color:var(--text)}
.pt-fuite span{display:block;font-size:12.5px;color:var(--muted);margin-top:3px;line-height:1.45}
.pt-fuite.alert b{color:var(--red)}
.pt-src{display:flex;flex-wrap:wrap;gap:6px}
.pt-mq{padding:12px 0;border-bottom:1px solid var(--border)}
.pt-mq:last-child{border-bottom:0}
.pt-mq .h{display:flex;justify-content:space-between;gap:8px}
.pt-mq .h b{font-size:14px;color:var(--text)}
.pt-mq span{display:block;font-size:12px;color:var(--muted);margin-top:3px;line-height:1.45}
.pt-mq .st{font-size:11px;font-weight:700;padding:2px 8px;border-radius:8px;border:1px solid var(--border);white-space:nowrap;height:fit-content}
.pt-mq .st.ouvert{color:var(--yellow);border-color:var(--yellow)}.pt-mq .st.rembourse{color:var(--green);border-color:var(--green)}
.pt-rdv-m{display:grid;grid-template-columns:minmax(0,150px) minmax(0,1fr);gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)}
.pt-rdv-m:last-child{border-bottom:0}
.pt-rdv-m label{margin:0 !important;display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--text)}
.pt-rdv-m label input{width:auto;margin:0}
.pt-rdv-m input[type=text]{margin:0 !important;font-size:13px;padding:8px 10px}
.pt-rdv-m input[type=text]:disabled{opacity:.45}
.pt-rdv-prev{margin-top:6px;padding:12px 14px;border-radius:12px;background:var(--card2);border:1px solid var(--border);font-size:13px;line-height:1.55;color:var(--text);white-space:pre-wrap;word-break:break-word}
.pt-rdv-vars{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 2px}
.pt-rdv-vars button{margin:0;width:auto;padding:5px 9px;border-radius:8px;background:var(--card2);border:1px solid var(--border);color:var(--light);font:600 11.5px Inter,sans-serif;cursor:pointer}
.pt-small{margin:8px 0 0;width:auto;padding:7px 10px;border-radius:10px;background:var(--card2);border:1px solid var(--border);color:var(--text);font:600 12px Inter,sans-serif;cursor:pointer}
.pt-ok{text-align:center;padding:8px 0 4px}
.pt-ok .ic{width:56px;height:56px;border-radius:50%;margin:0 auto 10px;display:grid;place-items:center;background:var(--green);color:#06221c}
@media (max-width:380px){.pt-rdv-m{grid-template-columns:1fr}.pt-btns{grid-template-columns:1fr}}
`;
  document.head.appendChild(st);
})();

// ------------------------------------------------------------
// OUTILS
// ------------------------------------------------------------
function ptToday(){ return typeof todayStr === 'function' ? todayStr() : new Date().toISOString().slice(0, 10); }
function ptDayStr(d){ const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
function ptAddDays(iso, n){ const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return ptDayStr(d); }
function ptDaysBetween(a, b){ return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5); }
function ptRefresh(){ if(typeof refreshAll === 'function') refreshAll(); }
function ptArr(v){ const a = ptJson(v, []); return Array.isArray(a) ? a : []; }
function ptCoffre(id){ return coffres.find(c => c.id === Number(id)) || null; }
function ptCompte(id){ return accounts.find(a => a.id === Number(id)) || null; }
function ptRepIds(){
  let ids = {};
  try { ids = JSON.parse(localStorage.getItem('rep_coffre_ids') || '{}') || {}; } catch(e){}
  if(typeof _repCoffreIds !== 'undefined' && _repCoffreIds){ ['salaire', 'studio', 'epargne'].forEach(k => { if(_repCoffreIds[k]) ids[k] = _repCoffreIds[k]; }); }
  return ids;
}
function ptCoffreNom(k){
  const noms = { salaire: 'Salaire photographe', studio: 'Revenu Studio', epargne: 'Épargne Studio' };
  const ids = ptRepIds();
  return coffres.find(c => c.id === Number(ids[k]) && agIsCoffre(c)) || coffres.find(c => c.name === noms[k] && agIsCoffre(c)) || null;
}

// ------------------------------------------------------------
// CHARGEMENT
// ------------------------------------------------------------
async function ptLoad(){
  if(typeof sb === 'undefined') return;
  try {
    const { data, error } = await sb.from('manquants').select('*').order('created_at', { ascending: true });
    if(!error) PT.rows = (data || []).map(r => ({ ...r, remboursements: ptArr(r.remboursements) }));
  } catch(e){ console.warn('manquants', e); }
  PT.loaded = true;
}
if(typeof loadAllData === 'function'){
  const _ptLoadAllData = loadAllData;
  loadAllData = async function(){
    const r = await _ptLoadAllData.apply(this, arguments);
    await ptLoad();
    return r;
  };
}
(function ptInit(){
  setTimeout(async () => {
    try {
      if(typeof sb === 'undefined') return;
      const { data } = await sb.auth.getSession();
      if(!data || !data.session) return;
      await ptLoad();
      await ptSync();
      if(typeof agRenderArgent === 'function') agRenderArgent();
    } catch(e){}
  }, 950);
})();

// ------------------------------------------------------------
// CALCULS DU MANQUANT
// ------------------------------------------------------------
// Un remboursement compte s'il a de l'argent et si son mouvement n'a pas ete annule ou supprime
function ptValide(e){
  if(!e || !(Number(e.montant) > 0) || e.annule) return false;
  if(e.tx_id){
    if(PT.deleted.has(e.tx_id)) return false;
    const t = txs.find(x => x.id === e.tx_id);
    if(t && t.cancelled) return false;
  }
  return true;
}
function ptPaye(r){ return Math.round(ptArr(r.remboursements).filter(ptValide).reduce((s, e) => s + Number(e.montant), 0)); }
function ptReste(r){ return Math.max(0, Math.round(Number(r.montant) || 0) - ptPaye(r)); }
function ptOuverts(){ return PT.rows.filter(r => r.statut === 'ouvert' && ptReste(r) > 0).sort((a, b) => String(a.created_at || a.date).localeCompare(String(b.created_at || b.date)) || a.id - b.id); }
function ptDu(){ return ptOuverts().reduce((s, r) => s + ptReste(r), 0); }
function ptPct(){ const o = ptOuverts(); const p = o.length ? Number(o[o.length - 1].pct) : PT_PCT; return p > 0 ? Math.min(100, Math.round(p)) : PT_PCT; }
// Le coffre qui recoit le remboursement : celui qui a perdu l'argent, sinon Revenu Studio
function ptCible(r){
  const sal = ptCoffreNom('salaire');
  const g = r && r.goal_id ? ptCoffre(r.goal_id) : null;
  if(g && agIsCoffre(g) && (!sal || g.id !== sal.id)) return g;
  return ptCoffreNom('studio');
}
// Ou va l'argent rembourse : par defaut, la ou il manquait (le compte ou le coffre), sinon Revenu Studio
function ptDest(r){
  const sal = ptCoffreNom('salaire');
  if(r && r.account_id){ const a = ptCompte(r.account_id); if(a && !a.archived) return { account_id: a.id, name: a.name }; }
  const g = r && r.goal_id ? ptCoffre(r.goal_id) : null;
  if(g && agIsCoffre(g) && (!sal || g.id !== sal.id)) return { goal_id: g.id, name: g.name };
  const st = ptCoffreNom('studio');
  return st ? { goal_id: st.id, name: st.name } : null;
}
const ptMemeLieu = (a, b) => !!a && !!b && ((a.account_id && a.account_id === b.account_id) || (a.goal_id && a.goal_id === b.goal_id));
function ptRetenue(salaire){
  const du = ptDu();
  if(!(du > 0) || !(salaire > 0)) return 0;
  return Math.min(du, Math.round(salaire * ptPct() / 100));
}
async function ptMajRow(r, patch){
  const res = await dbUpdate('manquants', r.id, { ...patch, updated_at: new Date().toISOString() });
  Object.assign(r, res ? { ...res, remboursements: ptArr(res.remboursements) } : patch);
  return !!res;
}
// Recalcule "rembourse" et le statut si un mouvement de remboursement a ete annule ou supprime
async function ptSync(){
  for(const r of PT.rows){
    if(r.statut === 'annule') continue;
    const paye = ptPaye(r), du = Math.round(Number(r.montant) || 0);
    const st = paye >= du ? 'rembourse' : 'ouvert';
    if(Math.round(Number(r.rembourse) || 0) !== paye || r.statut !== st) await ptMajRow(r, { rembourse: paye, statut: st });
  }
}
let _ptSyncT = null;
function ptSyncSoon(){ clearTimeout(_ptSyncT); _ptSyncT = setTimeout(async () => { try { await ptSync(); ptMajArgent(); } catch(e){} }, 300); }
(function ptWatchTx(){
  const _u = dbUpdate, _d = dbDelete;
  dbUpdate = async function(table, id){ const r = await _u.apply(this, arguments); if(r && table === 'transactions' && ptTouche(id)) ptSyncSoon(); return r; };
  dbDelete = async function(table, id){ const r = await _d.apply(this, arguments); if(r && table === 'transactions' && ptTouche(id)){ PT.deleted.add(id); ptSyncSoon(); } return r; };
})();
function ptTouche(txId){ return PT.rows.some(r => ptArr(r.remboursements).some(e => e.tx_id === txId)); }

// ------------------------------------------------------------
// MOUVEMENTS D'ARGENT (toujours verifies avant d'ecrire)
// ------------------------------------------------------------
async function ptTx(row){
  const r = await dbInsert('transactions', { _agRaw: true, payment_method: 'Interne', date: ptToday(), ...row });
  if(!r) return null;
  txs.unshift(r);
  if(r.type === 'transfert') await agSyncGoals(null, r);
  return r;
}
async function ptTransfert({ from, to, amount, note, details }){
  amount = Math.round(Number(amount) || 0);
  if(!(amount > 0)) return null;
  if(from.goal_id){
    const c = ptCoffre(from.goal_id);
    if(!c){ await agAlert("Ce coffre n'existe plus."); return null; }
    if(amount > Math.round(Number(c.current) || 0)){ await agAlert(`Le coffre "${c.name}" n'a que ${agF(c.current)}.\nImpossible d'en sortir ${agF(amount)}.`); return null; }
  }
  let category = 'Transfert';
  if(from.account_id && to.goal_id) category = 'Vers coffre';
  if(from.goal_id && to.account_id) category = 'Sortie de coffre';
  if(from.goal_id && to.goal_id) category = 'Entre coffres';
  return ptTx({ type: 'transfert', category, amount, note: note || null, details: details || null,
    account_id: from.account_id || null, goal_id: from.goal_id || null, to_account_id: to.account_id || null, to_goal_id: to.goal_id || null });
}
function ptCatManquant(){
  const set = new Set((typeof CATEGORIES !== 'undefined' && CATEGORIES.depense) || []);
  (txs || []).forEach(t => { if(t.type === 'depense' && t.category) set.add(t.category); });
  return set.has('Manquant') ? 'Manquant' : (set.has('Autre') ? 'Autre' : 'Autre');
}

// ============================================================
// A1. VERIFIER MES COMPTES
// ============================================================
function ptDerniereVerif(){ try { return localStorage.getItem(PT_KEY_VERIF) || ''; } catch(e){ return ''; } }
function ptItems(){
  return agActiveAccounts().map(a => ({ k: 'a' + a.id, type: 'account', id: a.id, name: a.name, app: Math.round(agAccountBalance(a)) }))
    .concat(agCoffres().map(c => ({ k: 'g' + c.id, type: 'goal', id: c.id, name: c.name, app: Math.round(Number(c.current) || 0) })));
}
function ptAppVal(it){ return it.type === 'account' ? Math.round(agAccountBalance(ptCompte(it.id))) : Math.round(Number((ptCoffre(it.id) || {}).current) || 0); }
function ptVerifier(){
  if(!agActiveAccounts().length){ if(typeof agGoTab === 'function') agGoTab('argent'); agToast("Crée d'abord tes comptes", 'info'); return; }
  PT.v = { items: ptItems(), reel: {} };
  ptVerifStep1();
}
function ptVRow(it){
  const v = PT.v.reel[it.k];
  return `<div class="pt-vrow" data-k="${it.k}">
    <div class="h"><b>${agEsc(it.type === 'goal' ? 'Coffre ' + it.name : it.name)}</b><span>Selon l'app : ${agF(it.app)}</span></div>
    <div class="r"><input type="number" inputmode="decimal" min="0" placeholder="Ce que j'ai vraiment" aria-label="Ce que j'ai vraiment sur ${agEsc(it.name)}" value="${v != null ? v : ''}" oninput="ptVSet('${it.k}',this.value)">
      <button type="button" onclick="ptVSame('${it.k}')">C'est pareil</button></div>
    <div class="ec"></div></div>`;
}
function ptVerifStep1(){
  const v = PT.v;
  const accs = v.items.filter(x => x.type === 'account'), cofs = v.items.filter(x => x.type === 'goal');
  const last = ptDerniereVerif();
  agSheet('ptVerif', `
    <h3>Vérifier mes comptes</h3>
    <div class="ag-hint" style="margin-top:0">Regarde ce que tu as vraiment (ton Wave, ta caisse, tes coffres) et tape-le. L'app compare avec ses chiffres. Si c'est le même montant, touche "C'est pareil".</div>
    <div class="pt-sec">Mes comptes</div>
    ${accs.map(ptVRow).join('')}
    ${cofs.length ? `<div class="pt-sec">Mes coffres</div>${cofs.map(ptVRow).join('')}` : ''}
    <div class="pt-tot" id="ptVTot"><span>Écart total</span><b>-</b></div>
    <button class="btn-primary" id="ptVBtn" style="margin-top:10px" onclick="ptVerifSuite()">Continuer</button>
    <div class="ag-hint">À faire une fois par semaine, le dimanche par exemple. Un rappel te sera envoyé chaque semaine.${last ? ' Dernier contrôle : ' + ptQuand(last) + '.' : ''}</div>
  `);
  ptVMaj();
}
function ptQuand(iso){
  const j = ptDaysBetween(String(iso).slice(0, 10), ptToday());
  return j <= 0 ? "aujourd'hui" : j === 1 ? 'hier' : 'il y a ' + j + ' jours';
}
function ptVSet(k, val){
  const s = String(val).trim();
  if(s === '') delete PT.v.reel[k]; else PT.v.reel[k] = Math.round(parseFloat(s) || 0);
  ptVMaj();
}
function ptVSame(k){
  const it = PT.v.items.find(x => x.k === k); if(!it) return;
  PT.v.reel[k] = it.app;
  const inp = document.querySelector(`#ptVerif .pt-vrow[data-k="${k}"] input`); if(inp) inp.value = it.app;
  ptVMaj();
}
function ptVEcarts(){
  return PT.v.items.filter(it => PT.v.reel[it.k] != null).map(it => ({ ...it, reel: PT.v.reel[it.k], ecart: PT.v.reel[it.k] - ptAppVal(it) }));
}
function ptVMaj(){
  if(!PT.v) return;
  PT.v.items.forEach(it => {
    const row = document.querySelector(`#ptVerif .pt-vrow[data-k="${it.k}"]`); if(!row) return;
    const ec = row.querySelector('.ec'), r = PT.v.reel[it.k];
    row.classList.remove('ok', 'moins');
    if(r == null){ ec.textContent = ''; ec.className = 'ec'; return; }
    const d = r - it.app;
    if(r < 0){ ec.textContent = 'Le montant ne peut pas être négatif.'; ec.className = 'ec moins'; return; }
    if(!d){ ec.textContent = 'Pareil'; ec.className = 'ec ok'; row.classList.add('ok'); }
    else if(d > 0){ ec.textContent = `+${agF(d)} de plus que prévu`; ec.className = 'ec plus'; }
    else { ec.textContent = `Il manque ${agF(-d)}`; ec.className = 'ec moins'; row.classList.add('moins'); }
  });
  const l = ptVEcarts(), tot = l.reduce((s, x) => s + x.ecart, 0), box = document.getElementById('ptVTot');
  if(box){
    box.className = 'pt-tot' + (tot < 0 ? ' moins' : tot > 0 ? ' plus' : '');
    box.innerHTML = l.length ? `<span>Écart total (${l.length} vérifié${l.length > 1 ? 's' : ''} sur ${PT.v.items.length})</span><b>${tot > 0 ? '+' : ''}${agF(tot)}</b>` : '<span>Écart total</span><b>-</b>';
  }
}
function ptVerifSuite(){
  const l = ptVEcarts();
  if(!l.length){ agAlert("Tape au moins un montant, ou touche \"C'est pareil\"."); return; }
  if(l.some(x => x.reel < 0)){ agAlert('Un montant ne peut pas être négatif.'); return; }
  const plus = l.filter(x => x.ecart > 0), moins = l.filter(x => x.ecart < 0);
  if(!plus.length && !moins.length){
    try { localStorage.setItem(PT_KEY_VERIF, ptToday()); } catch(e){}
    agSheet('ptVerif', `<div class="pt-ok"><div class="ic">${agIcon('check', 26)}</div><h3>Tout est juste</h3>
      <div class="ag-hint">${l.length} vérifié${l.length > 1 ? 's' : ''} : l'app et la réalité sont pareilles. Bravo, continue comme ça.</div></div>
      <div class="ag-hint" style="text-align:center">Prochain contrôle conseillé : dans 7 jours.</div>
      <button class="btn-primary" onclick="agCloseSheet('ptVerif');ptMajArgent()">Fermer</button>`);
    ptMajArgent();
    return;
  }
  const totM = moins.reduce((s, x) => s - x.ecart, 0);
  PT.v.etape2 = { plus: plus.map(x => x.k), moins: moins.map(x => x.k) };
  const nom = x => agEsc(x.type === 'goal' ? 'Coffre ' + x.name : x.name);
  agSheet('ptVerif', `
    <h3>Résultat du contrôle</h3>
    <div class="pt-box">${l.filter(x => x.ecart).map(x => `<div class="pt-line"><span>${nom(x)}</span><b class="${x.ecart > 0 ? 'plus' : 'moins'}">${x.ecart > 0 ? '+' : '-'}${agF(Math.abs(x.ecart))}</b></div>`).join('')}</div>
    ${plus.length ? `<div class="pt-sec">Il y a plus que prévu</div>
      ${plus.map(x => `<div class="pt-vrow"><div class="h"><b>${nom(x)}</b><span>+${agF(x.ecart)}</span></div>
        <label for="ptOrig_${x.k}" style="margin-top:8px">D'où vient cet argent ?</label>
        <input id="ptOrig_${x.k}" placeholder="Ex : un client a payé, j'avais oublié de noter">
        <label class="ag-check" style="margin-top:8px"><input type="checkbox" id="ptAdj_${x.k}" checked> Ajuster le solde (+${agF(x.ecart)})</label></div>`).join('')}` : ''}
    ${moins.length ? `<div class="pt-sec">Il manque de l'argent</div>
      <div class="pt-info red">Il manque <b>${agF(totM)}</b> en tout. Explique ce qui a pu se passer. Tu peux répondre "Je ne sais pas".</div>
      <label for="ptExpl">Explication (obligatoire)</label>
      <textarea id="ptExpl" rows="3" placeholder="Ex : j'ai payé un repas avec l'argent du studio sans le noter"></textarea>
      <div class="pt-chips"><button type="button" onclick="document.getElementById('ptExpl').value='Je ne sais pas'">Je ne sais pas</button><button type="button" onclick="document.getElementById('ptExpl').value='Dépenses perso pas notées'">Dépenses perso pas notées</button><button type="button" onclick="document.getElementById('ptExpl').value='Erreur de saisie'">Erreur de saisie</button></div>
      <div class="pt-info warn"><b>Ce qui va se passer :</b><br>
        1. L'app corrige les soldes pour coller à la réalité (dépense "Manquant constaté"${moins.some(x => x.type === 'goal') ? ', et pour un coffre : sortie du coffre puis dépense' : ''}).<br>
        2. Elle note que tu dois ${agF(totM)} au studio.<br>
        3. Le <b>Mode patron</b> s'active : à chaque paiement reçu, ${ptPct()} % de ta part "Salaire photographe" rembourse le studio, jusqu'à ce que ce soit réglé.</div>` : ''}
    <button class="btn-primary" id="ptVBtn2" style="margin-top:12px" onclick="ptVerifValider()">${moins.length ? 'Valider et corriger' : 'Valider'}</button>
    <button class="btn-ghost" style="width:100%;margin-top:8px" onclick="ptVerifStep1()">Revenir aux montants</button>
  `);
}
async function ptVerifValider(){
  if(PT.busy || !PT.v || !PT.v.etape2) return;
  const l = ptVEcarts();
  const plus = l.filter(x => x.ecart > 0 && PT.v.etape2.plus.includes(x.k));
  const moins = l.filter(x => x.ecart < 0 && PT.v.etape2.moins.includes(x.k));
  const expl = ptNoDash((document.getElementById('ptExpl') || {}).value || '').trim();
  if(moins.length && expl.length < 2){ await agAlert("Écris une explication.\nMême \"Je ne sais pas\" est accepté."); document.getElementById('ptExpl')?.focus(); return; }
  if(moins.some(x => x.type === 'goal') && !agPrincipal()){ await agAlert("Crée d'abord un compte : une dépense part toujours d'un compte."); return; }
  // Les coffres ne peuvent pas passer en negatif : on verifie avant d'ecrire
  for(const x of moins){
    if(x.type !== 'goal') continue;
    const c = ptCoffre(x.id);
    if(!c || -x.ecart > Math.round(Number(c.current) || 0)){ await agAlert(`Le coffre "${x.name}" a changé pendant le contrôle.\nRefais le contrôle.`); return; }
  }
  PT.busy = true;
  const btn = document.getElementById('ptVBtn2');
  if(btn){ btn.disabled = true; btn.textContent = 'Correction en cours...'; }
  const crees = [], fautes = [];
  try {
    // 1. Plus que prevu : ajustement (comme "Ajuster le solde")
    for(const x of plus){
      if(!document.getElementById('ptAdj_' + x.k)?.checked) continue;
      const orig = ptNoDash((document.getElementById('ptOrig_' + x.k) || {}).value || '').trim();
      const note = `Ajustement du solde ${x.name} · contrôle${orig ? ' · ' + orig : ''}`;
      const r = await ptTx({ type: 'transfert', category: 'Ajustement', amount: x.ecart, note, details: 'ptverif',
        account_id: null, goal_id: null, to_account_id: x.type === 'account' ? x.id : null, to_goal_id: x.type === 'goal' ? x.id : null });
      if(!r) fautes.push(x.name);
    }
    // 2. Il manque : correction + ligne "manquants"
    const pct = ptPct(), cat = ptCatManquant();
    for(const x of moins){
      const m = -x.ecart;
      let dep = null;
      if(x.type === 'account'){
        const a = ptCompte(x.id);
        dep = await ptTx({ type: 'depense', category: cat, amount: m, note: 'Manquant constaté · ' + expl, account_id: x.id, payment_method: a ? a.name : 'Interne', details: 'ptmq' });
      } else {
        const via = agPrincipal();
        const tr = await ptTransfert({ from: { goal_id: x.id }, to: { account_id: via.id }, amount: m, note: `Manquant constaté · coffre ${x.name}`, details: 'ptmq' });
        if(tr) dep = await ptTx({ type: 'depense', category: cat, amount: m, note: `Manquant constaté · coffre ${x.name} · ${expl}`, account_id: via.id, payment_method: via.name, details: 'ptmq' });
      }
      if(!dep){ fautes.push(x.name); continue; }
      const row = await dbInsert('manquants', { date: ptToday(), montant: m, account_id: x.type === 'account' ? x.id : null, goal_id: x.type === 'goal' ? x.id : null,
        explication: expl, statut: 'ouvert', rembourse: 0, pct, remboursements: [], ajustement_tx_id: dep.id, updated_at: new Date().toISOString() });
      if(row){ row.remboursements = ptArr(row.remboursements); PT.rows.push(row); crees.push(row); }
      else fautes.push(x.name + ' (dette non notée)');
    }
  } finally {
    PT.busy = false;
  }
  try { localStorage.setItem(PT_KEY_VERIF, ptToday()); } catch(e){}
  PT.v = null;
  ptRefresh();
  if(fautes.length) await agAlert("Une partie n'a pas pu être enregistrée :\n" + fautes.join(', ') + '\nRefais le contrôle pour vérifier.');
  if(crees.length){
    const tot = crees.reduce((s, r) => s + Number(r.montant), 0);
    agSheet('ptVerif', `<div class="pt-ok"><div class="ic" style="background:var(--yellow)">${agIcon('shield', 26)}</div><h3>Mode patron activé</h3>
      <div class="ag-hint">Les soldes collent maintenant à la réalité. Tu dois <b>${agF(tot)}</b> au studio.<br>À chaque paiement reçu, ${ptPct()} % de ton salaire le rembourse, tout seul, juste après la répartition.</div></div>
      <button class="btn-primary" onclick="agCloseSheet('ptVerif');ptDirectives()">Voir mes directives</button>
      <button class="btn-ghost" style="width:100%;margin-top:8px" onclick="agCloseSheet('ptVerif')">Fermer</button>`);
    ptDirGen(true).catch(() => {});
  } else {
    agCloseSheet('ptVerif');
    agToast('Soldes ajustés');
  }
  ptMajArgent();
}

// ============================================================
// A2. MODE PATRON : retenue a la repartition
// ============================================================
function ptRepLigne(){
  const btn = document.getElementById('repValiderBtn');
  let d = document.getElementById('ptRepLine');
  const ctx = typeof _repCtx !== 'undefined' ? _repCtx : null;
  if(!btn || !ctx || !ptOuverts().length){ if(d) d.remove(); return; }
  const sal = Math.round(parseFloat(document.getElementById('repSalaireMontant')?.value) || 0);
  const ret = ptRetenue(sal), du = ptDu();
  if(!d){ d = document.createElement('div'); d.id = 'ptRepLine'; btn.insertAdjacentElement('beforebegin', d); }
  const r0 = ptOuverts()[0], cible = ptDest(r0), salC = ptCoffreNom('salaire');
  d.className = 'pt-rep' + (PT.rep.skip ? ' skip' : '');
  if(PT.rep.skip){
    d.innerHTML = `<b>Mode patron : retenue passée pour ce paiement.</b> Ce sera noté. Il reste ${agF(du)} à rembourser.
      <br><button type="button" onclick="ptRepSkip(false)">Finalement, rembourser</button>`;
  } else if(!ret){
    d.innerHTML = `<b>Mode patron :</b> pas de part salaire dans ce paiement, rien n'est retenu (reste ${agF(du)}).`;
  } else {
    d.innerHTML = `<b>Mode patron : ${agF(ret)} de ton salaire remboursent le studio (reste ${agF(du - ret)})</b>
      <small>${ptPct()} % de la part salaire, fait juste après la validation : ${agEsc(salC ? salC.name : 'Salaire photographe')} vers ${agEsc(cible ? cible.name : 'Revenu Studio')}.</small>
      <button type="button" onclick="ptRepSkip(true)">Pas cette fois</button>`;
  }
}
function ptRepSkip(on){ PT.rep.skip = !!on; ptRepLigne(); }
if(typeof ouvrirRepartitionPaiement === 'function'){
  const _ptOuvrirRep = ouvrirRepartitionPaiement;
  ouvrirRepartitionPaiement = async function(){
    PT.rep = { skip: false };
    document.getElementById('ptRepLine')?.remove();
    const r = await _ptOuvrirRep.apply(this, arguments);
    try { ptRepLigne(); } catch(e){ console.warn('patron rep', e); }
    return r;
  };
}
if(typeof mettreAJourCompteur === 'function'){
  const _ptCompteur = mettreAJourCompteur;
  mettreAJourCompteur = function(){
    const r = _ptCompteur.apply(this, arguments);
    try { if(document.getElementById('ptRepLine') || ptOuverts().length) ptRepLigne(); } catch(e){}
    return r;
  };
}
if(typeof validerRepartitionPaiement === 'function'){
  const _ptValiderRep = validerRepartitionPaiement;
  validerRepartitionPaiement = async function(){
    const avant = typeof _repCtx !== 'undefined' ? _repCtx : null;
    const occupe = typeof _repIsProcessing !== 'undefined' && _repIsProcessing;
    const actif = !occupe && !!avant && ptOuverts().length > 0;
    const salId = typeof _repCoffreIds !== 'undefined' && _repCoffreIds ? _repCoffreIds.salaire : null;
    const salM = Math.round(parseFloat(document.getElementById('repSalaireMontant')?.value) || 0);
    const skip = PT.rep.skip;
    const r = await _ptValiderRep.apply(this, arguments);
    // Validation reussie : la fenetre a remis _repCtx a null
    if(actif && typeof _repCtx !== 'undefined' && _repCtx === null){
      PT.rep = { skip: false };
      document.getElementById('ptRepLine')?.remove();
      try { await ptRetenueApres(salId, salM, skip, avant.label || 'Paiement'); } catch(e){ console.warn('patron retenue', e); }
    }
    return r;
  };
}
// Ajoute un remboursement (ou une retenue passee) a un manquant, puis verifie la fin
async function ptNoter(r, e){
  const list = ptArr(r.remboursements).concat([e]);
  const paye = list.filter(ptValide).reduce((s, x) => s + Number(x.montant), 0);
  await ptMajRow(r, { remboursements: list, rembourse: Math.round(paye) });
}
async function ptRetenueApres(salId, salM, skip, label){
  const ouverts = ptOuverts();
  if(!ouverts.length) return;
  const voulu = ptRetenue(salM);
  if(skip){
    await ptNoter(ouverts[0], { date: ptToday(), montant: 0, tx_id: null, source: 'passe', prevu: voulu, note: label });
    agToast(`Mode patron : retenue passée pour ce paiement (${agF(voulu)}, noté)`, 'info');
    ptMajArgent();
    return;
  }
  const sal = ptCoffre(salId) || ptCoffreNom('salaire');
  if(!sal || !(voulu > 0)) return;
  let reste = Math.min(voulu, Math.round(Number(sal.current) || 0)), fait = 0;
  for(const r of ouverts){
    if(!(reste > 0)) break;
    const cible = ptDest(r);
    if(!cible || cible.goal_id === sal.id) continue;
    const part = Math.min(reste, ptReste(r), Math.round(Number(sal.current) || 0));
    if(!(part > 0)) continue;
    const tr = await ptTransfert({ from: { goal_id: sal.id }, to: cible.account_id ? { account_id: cible.account_id } : { goal_id: cible.goal_id }, amount: part, note: 'Mode patron · remboursement du studio · ' + label, details: 'ptremb:' + r.id });
    if(!tr) break;
    await ptNoter(r, { date: ptToday(), montant: part, tx_id: tr.id, source: 'retenue', note: label });
    reste -= part; fait += part;
  }
  ptRefresh();
  if(fait > 0){
    const du = ptDu();
    agToast(du > 0 ? `Mode patron : ${agF(fait)} rendus au studio · reste ${agF(du)}` : `Mode patron : ${agF(fait)} rendus au studio`);
  }
  await ptFinCheck();
}
// Un manquant entierement rembourse : statut, felicitations, journal du coach
async function ptFinCheck(){
  const finis = PT.rows.filter(r => r.statut === 'ouvert' && ptReste(r) <= 0);
  if(!finis.length) return;
  const episode = ptEpisode();
  for(const r of finis) await ptMajRow(r, { statut: 'rembourse', rembourse: ptPaye(r) });
  ptMajArgent();
  if(ptOuverts().length) return;
  // Plus rien d'ouvert : le Mode patron s'arrete, une seule note dans le journal du coach
  try {
    const { data: u } = await sb.auth.getUser();
    const tot = episode.reduce((s, r) => s + Math.round(Number(r.montant) || 0), 0);
    const all = episode.flatMap(r => ptArr(r.remboursements));
    const nb = all.filter(ptValide).length, passe = all.filter(e => e.source === 'passe').length;
    const debut = episode.map(r => String(r.date || ptToday()).slice(0, 10)).sort()[0] || ptToday();
    const nj = Math.max(1, ptDaysBetween(debut, ptToday()));
    const raisons = [...new Set(episode.map(r => r.explication).filter(Boolean))].join(' / ') || 'non dite';
    const text = `Mode patron terminé : ${agF(tot)} remboursés au studio en ${nj} jour${nj > 1 ? 's' : ''} (${nb} remboursement${nb > 1 ? 's' : ''}${passe ? ', ' + passe + ' retenue' + (passe > 1 ? 's' : '') + ' passée' + (passe > 1 ? 's' : '') : ''}). Raison du manquant : ${raisons}.`;
    const { data, error } = await sb.from('coach_journal').insert({ user_id: u && u.user ? u.user.id : undefined, kind: 'resultat', text: ptNoDash(text), data: { source: 'patron', manquant_ids: episode.map(r => r.id), montant: tot } }).select().single();
    if(!error && data && typeof CO !== 'undefined' && CO && Array.isArray(CO.journal)) CO.journal.unshift(data);
  } catch(e){}
  agSheet('ptBravo', `<div class="pt-ok"><div class="ic">${agIcon('star', 26)}</div><h3>Bravo, le studio est remboursé !</h3>
    <div class="ag-hint">Tu as rendu tout l'argent qui manquait. Le Mode patron est désactivé : ton salaire est de nouveau entier.<br>Garde les bonnes habitudes : note chaque dépense le jour même et vérifie tes comptes chaque semaine.</div></div>
    <button class="btn-primary" onclick="agCloseSheet('ptBravo')">Merci</button>`);
}
// Les manquants de la periode en cours : ceux ouverts, et ceux deja rembourses depuis le plus ancien ouvert
function ptEpisode(){
  const o = PT.rows.filter(r => r.statut === 'ouvert');
  if(!o.length) return [];
  const debut = o.map(r => String(r.created_at || r.date || '')).sort()[0];
  return PT.rows.filter(r => r.statut === 'ouvert' || (r.statut === 'rembourse' && ptArr(r.remboursements).some(e => String(e.date) >= debut.slice(0, 10))) || (r.statut === 'rembourse' && String(r.created_at || r.date || '') >= debut));
}

// ---------- Rembourser a la main ----------
function ptRembourser(){
  const ouverts = ptOuverts();
  if(!ouverts.length){ agToast('Rien à rembourser', 'info'); return; }
  const du = ptDu(), d0 = ptDest(ouverts[0]);
  const sal = ptCoffreNom('salaire');
  const lieu = (k, nom, solde, on, tag) => `<button type="button" data-v="${k}" class="${on ? 'on' : ''}" onclick="agPick(this);ptRbMaj()">${agEsc(nom)}${tag ? ` <em class="pt-tag">${tag}</em>` : ''}<small>${agF(solde)}</small></button>`;
  const srcs = agActiveAccounts().map(a => lieu('a' + a.id, a.name, agAccountBalance(a), false))
    .concat(agCoffres().map(c => lieu('g' + c.id, c.name, c.current, sal && c.id === sal.id, sal && c.id === sal.id ? 'ton salaire' : '')));
  const dsts = agActiveAccounts().map(a => lieu('a' + a.id, a.name, agAccountBalance(a), d0 && d0.account_id === a.id, d0 && d0.account_id === a.id ? 'là où il manquait' : ''))
    .concat(agCoffres().filter(c => !sal || c.id !== sal.id).map(c => lieu('g' + c.id, c.name, c.current, d0 && d0.goal_id === c.id, d0 && d0.goal_id === c.id ? (ouverts[0].goal_id === c.id ? 'là où il manquait' : 'par défaut') : '')));
  agSheet('ptRemb', `
    <h3>Je rembourse le studio</h3>
    <div class="ag-hint" style="margin-top:0">Tu dois encore <b>${agF(du)}</b> au studio.</div>
    <label>Combien tu rembourses ?</label>
    <input id="ptRbMt" type="number" inputmode="decimal" class="big" value="${du}" placeholder="0" oninput="ptRbMaj()">
    <label>1. D'où part l'argent ?</label>
    <div class="ag-hint" style="margin-top:-2px">Là où tu prends l'argent pour rembourser (ex : ton coffre Salaire, ou l'argent que tu as sur toi en espèces).</div>
    <div class="ag-pills pt-src" id="ptRbFrom">${srcs.join('')}</div>
    <label>2. Où va l'argent ?</label>
    <div class="ag-hint" style="margin-top:-2px">Là où l'argent doit revenir. Par défaut : là où il manquait.</div>
    <div class="ag-pills pt-src" id="ptRbTo">${dsts.join('')}</div>
    <div class="pt-rep" id="ptRbRes" style="margin-top:12px"></div>
    <button class="btn-primary" id="ptRbBtn" style="margin-top:12px" onclick="ptRembourserGo()">Rembourser</button>
  `);
  if(!document.querySelector('#ptRbFrom button.on')) document.querySelector('#ptRbFrom button')?.classList.add('on');
  if(!document.querySelector('#ptRbTo button.on')) document.querySelector('#ptRbTo button')?.classList.add('on');
  ptRbMaj();
}
function ptRbLieu(v){
  if(!v) return null;
  if(v[0] === 'g'){ const c = ptCoffre(Number(v.slice(1))); return c ? { goal_id: c.id, name: c.name } : null; }
  const a = ptCompte(Number(v.slice(1))); return a ? { account_id: a.id, name: a.name } : null;
}
// Le resume en clair : d'ou ca part, ou ca va, ce qu'il reste
function ptRbMaj(){
  const box = document.getElementById('ptRbRes'); if(!box) return;
  const mt = Math.min(Math.round(parseFloat(document.getElementById('ptRbMt')?.value) || 0), ptDu());
  const from = ptRbLieu(document.querySelector('#ptRbFrom button.on')?.dataset.v), to = ptRbLieu(document.querySelector('#ptRbTo button.on')?.dataset.v);
  if(!(mt > 0) || !from || !to){ box.innerHTML = 'Choisis le montant, d\'où part l\'argent et où il va.'; return; }
  if(ptMemeLieu(from, to)){ box.innerHTML = '<b>Choisis deux endroits différents</b> : l\'argent ne peut pas partir et arriver au même endroit.'; return; }
  box.innerHTML = `<b>${agF(mt)} vont sortir de « ${agEsc(from.name)} » et arriver dans « ${agEsc(to.name)} ».</b>
    <small>Ton argent total ne change pas : il change seulement de place. Il restera ${agF(ptDu() - mt)} à rembourser.</small>`;
}
async function ptRembourserGo(){
  if(PT.busy) return;
  let amount = Math.round(parseFloat(document.getElementById('ptRbMt')?.value) || 0);
  const src = ptRbLieu(document.querySelector('#ptRbFrom button.on')?.dataset.v);
  const dst = ptRbLieu(document.querySelector('#ptRbTo button.on')?.dataset.v);
  if(!(amount > 0)){ agAlert('Tape un montant.'); return; }
  if(!src){ agAlert("Choisis d'où part l'argent."); return; }
  if(!dst){ agAlert("Choisis où va l'argent."); return; }
  if(ptMemeLieu(src, dst)){ agAlert("L'argent ne peut pas partir et arriver au même endroit."); return; }
  const du = ptDu();
  if(amount > du){ amount = du; }
  if(src.goal_id){
    const c = ptCoffre(src.goal_id);
    if(!c || amount > Math.round(Number(c.current) || 0)){ agAlert(`Le coffre "${c ? c.name : ''}" n'a que ${agF(c ? c.current : 0)}.`); return; }
  } else {
    const a = ptCompte(src.account_id);
    if(agAccountBalance(a) - amount < 0 && !await agConfirm(`${a.name} va passer en négatif\nIl restera ${agF(agAccountBalance(a) - amount)}. Continuer ?`)) return;
  }
  PT.busy = true;
  const btn = document.getElementById('ptRbBtn'); if(btn){ btn.disabled = true; btn.textContent = 'En cours...'; }
  let fait = 0;
  try {
    let reste = amount;
    for(const r of ptOuverts()){
      if(!(reste > 0)) break;
      const part = Math.min(reste, ptReste(r));
      const tr = await ptTransfert({ from: src.goal_id ? { goal_id: src.goal_id } : { account_id: src.account_id }, to: dst.goal_id ? { goal_id: dst.goal_id } : { account_id: dst.account_id }, amount: part, note: 'Mode patron · je rembourse le studio', details: 'ptremb:' + r.id });
      if(!tr) break;
      await ptNoter(r, { date: ptToday(), montant: part, tx_id: tr.id, source: 'manuel' });
      reste -= part; fait += part;
    }
  } finally { PT.busy = false; }
  agCloseSheet('ptRemb');
  ptRefresh();
  if(fait) agToast(`${agF(fait)} remboursés : de ${src.name} vers ${dst.name}${ptDu() > 0 ? ' · reste ' + agF(ptDu()) : ''}`);
  await ptFinCheck();
}

// ---------- Detail, retenue, annulation ----------
function ptDetail(){
  const rows = PT.rows.slice().sort((a, b) => String(b.created_at || b.date).localeCompare(String(a.created_at || a.date)));
  const src = { retenue: 'Retenue sur salaire', manuel: 'Remboursé à la main', passe: 'Retenue passée' };
  agSheet('ptDet', `
    <h3>Mode patron : le détail</h3>
    <label for="ptPctIn">Part du salaire retenue à chaque paiement (%)</label>
    <div style="display:flex;gap:8px;align-items:center"><input id="ptPctIn" type="number" inputmode="numeric" min="5" max="100" value="${ptPct()}" style="margin:0;max-width:110px"><button class="btn-secondary" style="width:auto;margin:0;padding:11px 14px" onclick="ptSetPct()">Enregistrer</button></div>
    <div class="ag-hint">20 % par défaut. Entre 5 et 100 %. Le Mode patron ne se coupe pas : il s'arrête tout seul quand tout est remboursé.</div>
    <div class="pt-sec">Les manquants</div>
    <div class="pt-box">${rows.length ? rows.map(r => {
      const lieu = r.goal_id ? 'coffre ' + ((ptCoffre(r.goal_id) || {}).name || '?') : ((ptCompte(r.account_id) || {}).name || 'compte');
      const hist = ptArr(r.remboursements);
      return `<div class="pt-mq"><div class="h"><b>${agF(r.montant)} · ${agEsc(lieu)}</b><span class="st ${r.statut}">${{ ouvert: 'En cours', rembourse: 'Remboursé', annule: 'Annulé' }[r.statut] || r.statut}</span></div>
        <span>Constaté le ${new Date(String(r.date).slice(0, 10) + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} · ${agEsc(r.explication || '')}</span>
        <span>Remboursé ${agF(ptPaye(r))} · reste ${agF(r.statut === 'annule' ? 0 : ptReste(r))}</span>
        ${hist.length ? `<span>${hist.slice(-6).map(e => `${new Date(String(e.date).slice(0, 10) + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} : ${src[e.source] || e.source}${Number(e.montant) ? ' ' + agF(e.montant) : e.prevu ? ' (' + agF(e.prevu) + ')' : ''}${ptValide(e) || e.source === 'passe' ? '' : ' (annulé)'}`).join('<br>')}</span>` : ''}
        ${r.statut === 'ouvert' ? `<button class="pt-small" onclick="ptAnnuler(${r.id})">Annuler ce manquant</button>` : ''}</div>`;
    }).join('') : '<div class="ag-empty">Aucun manquant.</div>'}</div>
  `);
}
async function ptSetPct(){
  const p = Math.round(parseFloat(document.getElementById('ptPctIn')?.value) || 0);
  if(p < 5 || p > 100){ agAlert('Choisis un pourcentage entre 5 et 100.'); return; }
  for(const r of ptOuverts()) await ptMajRow(r, { pct: p });
  agToast('Retenue : ' + p + ' % du salaire');
  ptMajArgent(); ptDetail();
}
async function ptAnnuler(id){
  const r = PT.rows.find(x => x.id === id); if(!r) return;
  const why = await agPrompt("Pourquoi annuler ce manquant ?\nEx : j'ai retrouvé l'argent, erreur de comptage. Ce sera noté.", '');
  if(why == null) return;
  if(ptNoDash(why).trim().length < 3){ await agAlert("Écris la raison : le Mode patron ne s'arrête pas sans le dire."); return; }
  await ptMajRow(r, { statut: 'annule', explication: ptNoDash(`${r.explication || ''} · Annulé le ${ptToday()} : ${why.trim()}`) });
  agToast('Manquant annulé. Si tu as retrouvé l\'argent, refais "Vérifier mes comptes" pour remettre les soldes justes.', 'info');
  ptMajArgent(); ptDetail();
}

// ---------- Rythme et resume ----------
function ptRythme(){
  const du = ptDu(); if(!(du > 0)) return '';
  const today = ptToday(), depuis = ptAddDays(today, -28);
  let paye = 0, debut = today;
  PT.rows.forEach(r => {
    if(String(r.date || today) < debut) debut = String(r.date).slice(0, 10);
    ptArr(r.remboursements).filter(ptValide).forEach(e => { if(String(e.date) >= depuis) paye += Number(e.montant); });
  });
  const jours = Math.min(28, Math.max(7, ptDaysBetween(debut < depuis ? depuis : debut, today)));
  let parSem = paye / jours * 7, estime = false;
  if(!(parSem > 0)){
    const rev = txs.filter(t => t.type === 'revenu' && !t.cancelled && String(t.date) >= depuis).reduce((s, t) => s + (Number(t.amount) || 0), 0);
    parSem = rev * 0.5 * ptPct() / 100 / 4; estime = true;
  }
  if(!(parSem > 0)) return `Pas encore de rythme : à chaque paiement reçu, ${ptPct()} % de ton salaire rembourse le studio.`;
  const sem = du / parSem;
  const q = sem < 1 ? `environ ${Math.max(1, Math.ceil(sem * 7))} jour${Math.ceil(sem * 7) > 1 ? 's' : ''}` : sem > 9 ? `environ ${Math.round(sem / 4.3)} mois` : `environ ${Math.round(sem)} semaine${Math.round(sem) > 1 ? 's' : ''}`;
  return `${estime ? 'Avec tes revenus du mois' : 'Au rythme actuel'} : remboursé dans ${q}.`;
}
function ptProchaineRetenue(){
  const du = ptDu(); if(!(du > 0)) return 0;
  const sal = ptCoffreNom('salaire'); if(!sal) return null;
  const parts = txs.filter(t => t.type === 'transfert' && !t.cancelled && t.to_goal_id === sal.id && String(t.details || '').startsWith('rep:')).slice(0, 5).map(t => Number(t.amount) || 0);
  if(!parts.length) return null;
  return Math.min(du, Math.round(parts.reduce((s, v) => s + v, 0) / parts.length * ptPct() / 100));
}
function ptResume(){
  const o = ptOuverts(), ep = o.length ? ptEpisode() : [];
  const total = ep.reduce((s, r) => s + Math.round(Number(r.montant) || 0), 0);
  return { ouvert: o.length > 0, du: ptDu(), rembourse: ep.reduce((s, r) => s + Math.min(ptPaye(r), Math.round(Number(r.montant) || 0)), 0), total, pct: ptPct(), prochaineRetenue: ptProchaineRetenue(), rythme: ptRythme(), nb: o.length };
}

// ============================================================
// A3. DIRECTIVES CLAIRES
// ============================================================
function ptDirGet(){ try { return JSON.parse(localStorage.getItem(PT_KEY_DIR) || 'null') || null; } catch(e){ return null; } }
function ptDirSet(d){ try { localStorage.setItem(PT_KEY_DIR, JSON.stringify(d)); } catch(e){} }
function ptPerso(t){
  if(t.type !== 'depense' || t.cancelled) return false;
  if(t.shoot_id || /^(rep:|bg|ptmq)/.test(String(t.details || ''))) return false;
  return !['Business', 'Matériel photo'].includes(t.category);
}
function ptPersoParJour(jours){
  const depuis = ptAddDays(ptToday(), -jours);
  const tot = txs.filter(t => ptPerso(t) && String(t.date) > depuis).reduce((s, t) => s + (Number(t.amount) || 0), 0);
  return tot / jours;
}
function ptDirDefaut(){
  const moy = ptPersoParJour(30);
  const plafond = Math.max(1000, Math.round(moy * 0.7 / 500) * 500 || 2000);
  const ep = ptCoffreNom('epargne');
  return [
    `Pas plus de ${agF(plafond)} de dépenses perso par jour cette semaine`,
    ep ? `Ne touche pas au coffre ${ep.name}` : "Ne sors pas d'argent d'un coffre sans écrire pourquoi",
    'Note chaque dépense le jour même, avec une petite note',
    'Vérifie tes comptes chaque dimanche'
  ];
}
function ptDirContexte(){
  const d14 = ptAddDays(ptToday(), -14);
  const dep = txs.filter(t => t.type === 'depense' && !t.cancelled && String(t.date) > d14).slice(0, 40)
    .map(t => `- ${t.date} ${t.category}${t.note ? ' (' + String(t.note).slice(0, 40) + ')' : ''} : ${agF(t.amount)}${ptPerso(t) ? ' [perso]' : ''}`).join('\n');
  const cats = {};
  txs.filter(t => ptPerso(t) && String(t.date) > ptAddDays(ptToday(), -30)).forEach(t => { cats[t.category] = (cats[t.category] || 0) + (Number(t.amount) || 0); });
  const r = ptResume();
  return `Monnaie : FCFA. Manquant à rembourser au studio : ${agF(r.du)} (retenue de ${r.pct} % du salaire à chaque paiement).
Dépenses des 14 derniers jours :
${dep || '- aucune'}
Dépenses perso des 30 derniers jours par catégorie : ${Object.entries(cats).map(([k, v]) => k + ' ' + agF(v)).join(' ; ') || 'aucune'}
Moyenne perso par jour (30 jours) : ${agF(ptPersoParJour(30))}
Coffres : ${agCoffres().map(c => `${c.name} ${agF(c.current)}`).join(' ; ') || 'aucun'}
Comptes : ${agActiveAccounts().map(a => `${a.name} ${agF(agAccountBalance(a))}`).join(' ; ')}
Explication du manquant : ${ptOuverts().map(x => x.explication).filter(Boolean).join(' / ') || 'non dite'}`;
}
function ptDirParse(txt){
  const s = ptNoDash(String(txt || '')).replace(/```json|```/g, '');
  let l = [];
  const a = s.indexOf('['), b = s.lastIndexOf(']');
  if(a >= 0 && b > a){ try { const j = JSON.parse(s.slice(a, b + 1)); if(Array.isArray(j)) l = j.map(x => typeof x === 'string' ? x : (x && (x.regle || x.texte || x.t)) || ''); } catch(e){} }
  if(!l.length) l = s.split('\n').map(x => x.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '')).filter(x => x.length > 8 && x.length < 140);
  return l.map(x => String(x).trim().replace(/\.$/, '')).filter(Boolean).slice(0, 5);
}
async function ptDirGen(silencieux){
  let regles = null, src = 'defaut';
  if(typeof callAI === 'function'){
    try {
      const txt = await callAI(`Tu es le coach d'argent de Henzo, photographe à Bouaké. Il a pris de l'argent du studio sans le noter et le rembourse (Mode patron).
Donne 3 à 5 règles très concrètes pour cette semaine, adaptées à ses dépenses ci-dessous. Chaque règle : une phrase courte, en français simple, vérifiable chaque jour, avec un chiffre quand c'est utile.
Exemples : "Pas plus de 2 000 F de dépenses perso par jour cette semaine", "Ne touche pas au coffre Épargne", "Note chaque dépense le jour même", "Vérifie tes comptes chaque dimanche".
N'utilise jamais de tiret long. Réponds seulement en JSON : ["règle 1", "règle 2", ...]

${ptDirContexte()}`);
      const l = ptDirParse(txt);
      if(l.length >= 3){ regles = l; src = 'ia'; }
    } catch(e){ if(!silencieux) agToast("L'IA n'a pas répondu : règles de base", 'info'); }
  }
  if(!regles) regles = ptDirDefaut();
  const old = ptDirGet() || {};
  ptDirSet({ regles, src, date: ptToday(), coche: old.coche && JSON.stringify(old.regles) === JSON.stringify(regles) ? old.coche : {} });
  if(document.getElementById('ptDir')) ptDirectives();
  ptMajArgent();
  return regles;
}
function ptDirData(){
  let d = ptDirGet();
  if(!d || !Array.isArray(d.regles) || !d.regles.length){ d = { regles: ptDirDefaut(), src: 'defaut', date: ptToday(), coche: {} }; ptDirSet(d); }
  d.coche = d.coche || {};
  return d;
}
function ptSerie(d, i){
  const today = ptToday();
  let jour = (d.coche[today] || []).includes(i) ? today : ptAddDays(today, -1), n = 0;
  while((d.coche[jour] || []).includes(i)){ n++; jour = ptAddDays(jour, -1); }
  return n;
}
function ptDirectives(){
  const d = ptDirData(), today = ptToday(), faits = d.coche[today] || [];
  agSheet('ptDir', `
    <h3>Mes directives</h3>
    <div class="ag-hint" style="margin-top:0">${d.src === 'ia' ? "Règles écrites par l'IA d'après tes dépenses." : 'Règles de base.'} Coche chaque règle respectée aujourd'hui.</div>
    <div class="pt-box">${d.regles.map((t, i) => { const on = faits.includes(i), s = ptSerie(d, i); return `<div class="pt-dir">
      <button type="button" class="ck ${on ? 'on' : ''}" aria-label="Respectée aujourd'hui" title="Respectée aujourd'hui" onclick="ptDirCoche(${i})">${agIcon('check', 16)}</button>
      <div class="d"><b>${agEsc(t)}</b><span class="${on ? 'on' : ''}">${on ? "Respectée aujourd'hui" : "Pas encore cochée aujourd'hui"}${s ? ` · série de ${s} jour${s > 1 ? 's' : ''}` : ''}</span></div></div>`; }).join('')}</div>
    <div class="ag-hint">${faits.length}/${d.regles.length} aujourd'hui. Règles du ${new Date(d.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}.</div>
    <button class="btn-ghost" id="ptDirBtn" style="width:100%;margin-top:10px" onclick="ptDirRefaire()">${agIcon('sparkles', 16)} Nouvelles règles avec l'IA</button>
  `);
}
function ptDirCoche(i){
  const d = ptDirData(), t = ptToday();
  const l = new Set(d.coche[t] || []);
  if(l.has(i)) l.delete(i); else l.add(i);
  d.coche[t] = [...l];
  // On garde 60 jours d'historique
  const lim = ptAddDays(t, -60);
  Object.keys(d.coche).forEach(k => { if(k < lim) delete d.coche[k]; });
  ptDirSet(d);
  ptDirectives(); ptMajArgent();
}
async function ptDirRefaire(){
  const b = document.getElementById('ptDirBtn'); if(b){ b.disabled = true; b.textContent = "L'IA réfléchit..."; }
  await ptDirGen(false);
  ptDirectives();
}

// ============================================================
// A4. "OU CA A PU FUIR ?"
// ============================================================
function ptFuites(){
  const today = ptToday(), d30 = ptAddDays(today, -30), d60 = ptAddDays(today, -60);
  const out = [];
  // 1. Depenses perso en hausse (30 derniers jours contre les 30 d'avant)
  const cur = {}, prev = {};
  txs.filter(ptPerso).forEach(t => {
    const dt = String(t.date);
    if(dt > d30) cur[t.category] = (cur[t.category] || 0) + (Number(t.amount) || 0);
    else if(dt > d60) prev[t.category] = (prev[t.category] || 0) + (Number(t.amount) || 0);
  });
  const hausses = Object.keys(cur).map(k => ({ k, a: cur[k], b: prev[k] || 0 })).filter(x => x.a - x.b >= 2000 && x.a > x.b * 1.2).sort((x, y) => (y.a - y.b) - (x.a - x.b));
  const totP = Object.values(cur).reduce((s, v) => s + v, 0), totPrev = Object.values(prev).reduce((s, v) => s + v, 0);
  out.push(hausses.length
    ? { alert: true, t: 'Dépenses perso en hausse', d: hausses.slice(0, 3).map(x => `${x.k} : ${agF(x.a)} contre ${agF(x.b)} le mois d'avant`).join(' · ') }
    : { t: 'Dépenses perso', d: `${agF(totP)} sur 30 jours${totPrev ? ' (contre ' + agF(totPrev) + ' avant)' : ''}. Pas de hausse forte.` });
  // 2. Depenses sans note
  const sans = txs.filter(t => t.type === 'depense' && !t.cancelled && String(t.date) > d30 && !String(t.note || '').trim());
  const totS = sans.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  out.push(sans.length ? { alert: sans.length >= 3, t: `${sans.length} dépense${sans.length > 1 ? 's' : ''} sans note`, d: `${agF(totS)} sans explication. Difficile de savoir à quoi ça a servi.` } : { t: 'Dépenses sans note', d: 'Aucune : bravo.' });
  // 3. Retraits de coffres
  const ret = txs.filter(t => t.type === 'transfert' && !t.cancelled && t.goal_id && t.to_account_id && String(t.date) > d30 && !/^(ptmq|bg)/.test(String(t.details || '')));
  const totR = ret.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const parC = {}; ret.forEach(t => { const n = (ptCoffre(t.goal_id) || {}).name || 'Coffre'; parC[n] = (parC[n] || 0) + (Number(t.amount) || 0); });
  out.push(ret.length ? { alert: true, t: `${ret.length} retrait${ret.length > 1 ? 's' : ''} de coffres`, d: `${agF(totR)} sortis : ` + Object.entries(parC).map(([k, v]) => k + ' ' + agF(v)).join(' · ') } : { t: 'Retraits de coffres', d: 'Aucun retrait vers un compte en 30 jours.' });
  // 4. Jours sans rien noter
  const jours = new Set(txs.filter(t => !t.cancelled && String(t.date) > d30).map(t => String(t.date).slice(0, 10)));
  let vides = 0, suite = 0, max = 0;
  for(let i = 29; i >= 0; i--){ const j = ptAddDays(today, -i); if(jours.has(j)){ suite = 0; } else { vides++; suite++; max = Math.max(max, suite); } }
  out.push({ alert: vides >= 10, t: `${vides} jour${vides > 1 ? 's' : ''} sans rien noter sur 30`, d: max >= 3 ? `Jusqu'à ${max} jours de suite sans enregistrement : c'est souvent là que l'argent part sans trace.` : 'Tu notes assez régulièrement.' });
  return out;
}
function ptFuite(){
  const f = ptFuites();
  agSheet('ptFuite', `
    <h3>Où ça a pu fuir ?</h3>
    <div class="ag-hint" style="margin-top:0">Une analyse simple de tes 30 derniers jours.</div>
    <div class="pt-box">${f.map(x => `<div class="pt-fuite ${x.alert ? 'alert' : ''}"><b>${agEsc(x.t)}</b><span>${agEsc(x.d)}</span></div>`).join('')}</div>
    <button class="btn-ghost" id="ptFuiteBtn" style="width:100%" onclick="ptFuiteIA()">${agIcon('sparkles', 16)} L'avis de l'IA</button>
    <div class="pt-ia ag-keep" id="ptFuiteIa"></div>
  `);
}
async function ptFuiteIA(){
  const box = document.getElementById('ptFuiteIa'), btn = document.getElementById('ptFuiteBtn');
  if(typeof callAI !== 'function'){ if(box) box.textContent = "L'IA n'est pas configurée (onglet Coach)."; return; }
  if(btn){ btn.disabled = true; btn.textContent = 'Analyse en cours...'; }
  if(box) box.textContent = 'Analyse en cours...';
  try {
    const f = ptFuites().map(x => `- ${x.t} : ${x.d}`).join('\n');
    const txt = await callAI(`Tu es le coach d'argent de Henzo, photographe à Bouaké. Il lui manque de l'argent dans ses comptes du studio.
Voici l'analyse de ses 30 derniers jours :
${f}

${ptDirContexte()}

En français très simple, sans jargon, en 4 points courts : où l'argent a le plus probablement fui, et une action concrète pour chaque point. Utilise des tirets simples "-", jamais de tiret long.`);
    if(box) box.textContent = ptNoDash(String(txt || '').trim());
  } catch(e){ if(box) box.textContent = "L'analyse n'a pas marché : " + (e && e.message ? e.message : 'erreur') + '.'; }
  if(btn){ btn.disabled = false; btn.innerHTML = `${agIcon('sparkles', 16)} Redemander à l'IA`; }
}

// ============================================================
// BRANCHEMENTS : onglet Argent
// ============================================================
function ptCarteHtml(){
  const r = ptResume(); if(!r.ouvert) return '';
  const pc = r.total ? Math.min(100, Math.round(r.rembourse / r.total * 100)) : 0;
  const d = ptDirData(), faits = (d.coche[ptToday()] || []).length;
  return `<div class="pt-card" id="ptCard">
    <div class="pt-card-h"><div class="ic">${agIcon('shield', 20)}</div><div><b>Mode patron</b><span>Tu dois encore <b class="ag-m">${agF(r.du)}</b> au studio</span></div></div>
    <div class="pt-bar ag-mb"><i style="width:${pc}%"></i></div>
    <div class="pt-card-s"><span>Remboursé <span class="ag-m">${agF(r.rembourse)}</span> sur <span class="ag-m">${agF(r.total)}</span></span><span>Retenue : ${r.pct} %</span></div>
    <div class="pt-card-r">${agEsc(r.rythme)}</div>
    <div class="pt-btns">
      <button class="main" onclick="ptRembourser()">${agIcon('arrowIn', 15)} Je rembourse maintenant</button>
      <button onclick="ptDirectives()">${agIcon('check', 15)} Directives (${faits}/${d.regles.length})</button>
      <button onclick="ptFuite()">${agIcon('search', 15)} Où ça a pu fuir ?</button>
      <button onclick="ptDetail()">${agIcon('settings', 15)} Détail et retenue</button>
    </div></div>`;
}
function ptVerifBtnHtml(){
  const last = ptDerniereVerif();
  const j = last ? ptDaysBetween(last, ptToday()) : null;
  const warn = j == null || j > 7;
  return `<div class="pt-verif ${warn ? 'warn' : ''}" id="ptVerifBtn" role="button" tabindex="0" onclick="ptVerifier()"><div class="ic">${agIcon('check', 18)}</div>
    <div class="d"><b>Vérifier mes comptes</b><span>${last ? 'Dernier contrôle : ' + ptQuand(last) + '.' : "Compare l'app avec ce que tu as vraiment."}${warn ? ' Conseillé une fois par semaine.' : ''}</span></div>${agIcon('chev', 16)}</div>`;
}
function ptInjectArgent(){
  const el = document.getElementById('agArgentBody');
  if(!el || !agActiveAccounts().length) return;
  el.querySelector(':scope > .pt-card')?.remove();
  el.querySelector(':scope > .pt-verif')?.remove();
  const carte = ptCarteHtml();
  if(carte){
    const top = el.querySelector(':scope > .ag-total') || el.firstElementChild;
    if(top) top.insertAdjacentHTML('beforebegin', carte); else el.insertAdjacentHTML('afterbegin', carte);
  }
  const row = el.querySelector(':scope > .ag-row');
  if(row) row.insertAdjacentHTML('afterend', ptVerifBtnHtml());
}
function ptMajArgent(){ try { ptInjectArgent(); } catch(e){} }
if(typeof agRenderArgent === 'function'){
  const _ptRenderArgent = agRenderArgent;
  agRenderArgent = function(){
    const r = _ptRenderArgent.apply(this, arguments);
    try { ptInjectArgent(); } catch(e){ console.warn('patron argent', e); }
    return r;
  };
}

// ============================================================
// BRANCHEMENTS : bouton "Comment reserver" dans la fiche client
// ============================================================
function ptRdvClient(id){
  const c = (typeof clients !== 'undefined' ? clients : []).find(x => x.id === id); if(!c) return;
  if(typeof crmWa === 'function') crmWa(id, rdvMessage(c), 'rdv');
}
(function ptHookFiche(){
  let n = 0;
  const hook = () => {
    if(typeof crmOpenClient !== 'function' || typeof CRM_GOALS === 'undefined'){ if(++n < 100) setTimeout(hook, 150); return; }
    if(crmOpenClient.__pt) return;
    const _open = crmOpenClient;
    const w = function(id){
      const r = _open.apply(this, arguments);
      try {
        const sh = document.getElementById('crmClient');
        if(sh && !sh.querySelector('.pt-rdv-btn')){
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'btn-secondary pt-rdv-btn';
          b.style.cssText = 'margin:-4px 0 14px;width:100%';
          b.innerHTML = `${agIcon('calendar', 16)} Comment réserver (envoyer le message)`;
          b.onclick = () => ptRdvClient(id);
          const ref = sh.querySelector('.crm-nego') || sh.querySelector('.ag-actions');
          if(ref) ref.insertAdjacentElement('afterend', b);
        }
      } catch(e){}
      return r;
    };
    w.__pt = true;
    crmOpenClient = w;
  };
  hook();
})();

// ---------- Exports ----------
window.ptVerifier = ptVerifier;
window.ptResume = ptResume;
window.ptRembourser = ptRembourser;
window.ptDirectives = ptDirectives;
window.ptFuite = ptFuite;
window.ptLoad = ptLoad;
try { if(PT.loaded) agRenderArgent(); } catch(e){}
