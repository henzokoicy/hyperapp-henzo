// ============================================================
// BUDGET.JS - Calculateur de budget d'un projet et charges fixes
// ------------------------------------------------------------
// Charge par argent.js (apres app.js, modules.js, coach.js, argent.js).
// Tables : budgets, charges_fixes, charges_paiements.
//
// Regles d'argent (les memes que argent.js) :
//   - une depense part toujours d'un COMPTE ;
//   - une depense payee depuis un COFFRE = transfert coffre -> compte,
//     puis depense depuis ce compte ;
//   - un coffre ne devient jamais negatif : on refuse avant d'ecrire ;
//   - chaque mouvement cree va dans txs (txs.unshift), puis refreshAll().
//
// Fonctions pour les autres fichiers :
//   bgOuvrir(opts)        ouvre le calculateur de budget
//   bgAConfirmer()        budgets prevus dont le jour est arrive
//   bgRenderCharges(el)   dessine la gestion des charges fixes dans el
//   bgChargesResume()     chiffres des charges du mois
//   bgChargesContexte()   court texte pour les IA
// ============================================================

const BG = { budgets: [], charges: [], paiements: [], loaded: false, form: null, conf: null, chargeEls: [], listeTab: 'prevu', busy: false };
const BG_CATS = ['Business', 'Perso', 'Famille', 'Autre'];
const BG_FREQ = { mensuel: 'Tous les mois', trimestriel: 'Tous les 3 mois', annuel: 'Une fois par an', hebdo: 'Chaque semaine' };
const BG_CH_CATS = ['Logement', 'Courant et eau', 'Internet et télé', 'Téléphone', 'Studio', 'Transport', 'Autre'];
const BG_JOURS_SEM = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const BG_KEY_CHARGES = 'bg_charges_coffre_id';
const BG_KEY_PROJETS = 'bg_projets_coffre_id';
const BG_NOM_CHARGES = 'Charges du mois';
const BG_NOM_PROJETS = 'Projets prévus';

// ------------------------------------------------------------
// STYLE
// ------------------------------------------------------------
(function bgStyle(){
  if(document.getElementById('bgStyle')) return;
  const st = document.createElement('style');
  st.id = 'bgStyle';
  st.textContent = `
.bg-zone{display:grid;gap:10px;margin:2px 0 18px}
.bg-tools{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.bg-tools button{margin:0;padding:12px 10px;border-radius:14px;background:var(--card);border:1px solid var(--border);color:var(--text);font:600 13px Inter,sans-serif;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;width:100%}
.bg-tools button.main{border-color:var(--accent);color:var(--light)}
.bg-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:12px 14px;display:flex;align-items:center;gap:12px;cursor:pointer}
.bg-card .ic{width:36px;height:36px;border-radius:12px;background:var(--card2);display:grid;place-items:center;color:var(--light);flex-shrink:0}
.bg-card .d{flex:1;min-width:0}
.bg-card .d b{display:block;font-size:14px;color:var(--text)}
.bg-card .d span{display:block;font-size:12px;color:var(--muted);margin-top:2px;line-height:1.4}
.bg-card .d span em{font-style:normal;color:var(--red);font-weight:600}
.bg-card.warn{border-color:rgba(245,197,66,.55)}
.bg-card.warn .ic{color:var(--yellow)}
.bg-lignes{border-top:1px solid var(--border)}
.bg-line{display:grid;grid-template-columns:minmax(0,1fr) 100px 36px;gap:6px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)}
.bg-line input,.bg-line select{margin:0 !important}
.bg-line .bg-lsrc{grid-column:1 / -1;font-size:12px;padding:6px 8px;color:var(--muted);background:var(--card)}
.bg-line .bg-lsrc.set{color:var(--text);border-color:var(--accent)}
.bg-line.conf{grid-template-columns:minmax(0,1fr) 110px}
.bg-line .bg-nm{font-size:14px;color:var(--text);font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis}
.bg-line .bg-nm small{display:block;font-weight:400;font-size:11.5px;color:var(--muted);margin-top:2px}
.bg-line .bg-ec{grid-column:1 / -1;font-size:11.5px;color:var(--muted)}
.bg-line .bg-ec.plus{color:var(--red)}.bg-line .bg-ec.moins{color:var(--green)}
.bg-x{width:36px;height:36px;margin:0;padding:0;border-radius:10px;background:var(--card2);border:1px solid var(--border);color:var(--muted);cursor:pointer;font-size:18px;line-height:1}
.bg-total{display:flex;justify-content:space-between;align-items:baseline;padding:12px 2px 2px;font-size:14px;color:var(--muted)}
.bg-total b{font-size:22px;color:var(--text)}
.bg-src{margin-top:8px;padding:10px 12px;border-radius:12px;background:var(--card2);border:1px solid var(--border);font-size:12.5px;color:var(--text-2)}
.bg-src .r{display:flex;justify-content:space-between;gap:8px;padding:3px 0}
.bg-src .r span:last-child{text-align:right}
.bg-src .bad{color:var(--red);font-weight:600}
.bg-src .ok{color:var(--green)}
.bg-ia-box{margin-top:10px;padding:12px 14px;border-radius:12px;background:var(--card2);border:1px solid var(--accent);font-size:13px;line-height:1.5;color:var(--text);white-space:pre-wrap}
.bg-ia-box:empty{display:none}
.bg-chip{display:inline-block;padding:2px 8px;border-radius:8px;font:700 11px Inter,sans-serif;background:var(--card2);color:var(--muted);border:1px solid var(--border);white-space:nowrap}
.bg-chip.ok{color:var(--green);border-color:var(--green)}
.bg-chip.warn{color:var(--yellow);border-color:var(--yellow)}
.bg-chip.red{color:var(--red);border-color:var(--red)}
.bg-sum{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:8px 0}
.bg-sum div{background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:10px 12px;font-size:12px;color:var(--muted)}
.bg-sum b{display:block;font-size:16px;color:var(--text);margin-top:2px}
.bg-sum .red{border-color:var(--red)}.bg-sum .red b{color:var(--red)}
.bg-sum .ok b{color:var(--green)}
.bg-bar{height:8px;border-radius:5px;background:var(--card2);overflow:hidden;margin:6px 0 2px;border:1px solid var(--border)}
.bg-bar i{display:block;height:100%;background:var(--accent)}
.bg-list{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:2px 14px;margin:6px 0 14px}
.bg-occ{display:flex;gap:10px;align-items:center;padding:11px 0;border-bottom:1px solid var(--border)}
.bg-occ:last-child{border-bottom:0}
.bg-occ .d{flex:1;min-width:0;cursor:pointer}
.bg-occ .d b{display:block;font-size:14px;color:var(--text)}
.bg-occ .d span{display:block;font-size:12px;color:var(--muted);margin-top:3px;line-height:1.5}
.bg-occ .d span.bg-chip{display:inline-block;margin:0 0 0 4px}
.bg-occ.retard .d b{color:var(--red)}
.bg-occ.off{opacity:.55}
.bg-occ .m{text-align:right;font-weight:700;font-size:14px;color:var(--text);white-space:nowrap}
.bg-occ .m small{display:block;font-weight:500;font-size:11px;color:var(--muted)}
.bg-pay{width:auto;margin:0;padding:8px 12px;border-radius:10px;background:var(--card2);border:1px solid var(--accent);color:var(--light);font:600 12px Inter,sans-serif;cursor:pointer;white-space:nowrap}
.bg-btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.bg-btns > button{flex:1 1 140px;margin:0;width:auto}
.bg-small{width:auto;margin:0;padding:7px 10px;border-radius:10px;background:var(--card2);border:1px solid var(--border);color:var(--text);font:600 12px Inter,sans-serif;cursor:pointer}
.bg-small.red{color:var(--red);border-color:var(--red)}
.bg-small.acc{color:var(--light);border-color:var(--accent)}
.bg-tip{margin:10px 0;padding:10px 12px;border-radius:12px;background:var(--card2);border:1px solid var(--border);font-size:12.5px;line-height:1.5;color:var(--text-2)}
.bg-tip b{color:var(--text)}
.bg-tip.red{border-color:var(--red)}.bg-tip.red b{color:var(--red)}
.bg-rep{margin:0 0 14px;padding:12px;border-radius:12px;border:1px dashed var(--yellow);background:rgba(245,197,66,.08);font-size:12.5px;line-height:1.5;color:var(--text)}
.bg-rep b{color:var(--text)}
.bg-rep .row{display:flex;gap:8px;align-items:center;margin-top:8px}
.bg-rep .row input{margin:0;width:120px;padding:8px 10px;font-size:14px}
.bg-rep .row button{flex:1;margin:0;padding:9px 10px;border-radius:10px;background:var(--card2);border:1px solid var(--yellow);color:var(--text);font:600 12.5px Inter,sans-serif;cursor:pointer}
.bg-rep .row button.on{background:var(--yellow);color:#111;border-color:var(--yellow)}
.bg-rep small{display:block;color:var(--muted);margin-top:6px}
.bg-item{padding:12px 0;border-bottom:1px solid var(--border)}
.bg-item:last-child{border-bottom:0}
.bg-item .h{display:flex;align-items:flex-start;gap:8px}
.bg-item .h .d{flex:1;min-width:0;cursor:pointer}
.bg-item .h b{display:block;font-size:14px;color:var(--text)}
.bg-item .h span{display:block;font-size:12px;color:var(--muted);margin-top:2px}
.bg-item .h .m{font-weight:700;color:var(--text);white-space:nowrap}
.bg-item .bg-btns{margin-top:8px}
.bg-item .bg-btns > button{flex:0 0 auto}
.bg-link{display:block;width:100%;margin:2px 0 8px;padding:9px 12px;border-radius:12px;background:var(--card2);border:1px dashed var(--accent);color:var(--light);font:600 12.5px Inter,sans-serif;cursor:pointer;text-align:left}
.bg-lst-row{display:flex;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;color:var(--text-2)}
.bg-lst-row:last-child{border-bottom:0}
.bg-lst-row b{color:var(--text);white-space:nowrap}
.bg-lst-row s{color:var(--muted)}
`;
  document.head.appendChild(st);
})();

// ------------------------------------------------------------
// OUTILS
// ------------------------------------------------------------
const bgPad = n => String(n).padStart(2, '0');
const bgYmd = d => d.getFullYear() + '-' + bgPad(d.getMonth() + 1) + '-' + bgPad(d.getDate());
function bgToday(){ return typeof todayStr === 'function' ? todayStr() : bgYmd(new Date()); }
function bgMois(){ return bgToday().slice(0, 7); }
function bgAddMois(m, n){ const [y, mo] = m.split('-').map(Number); const d = new Date(y, mo - 1 + n, 1, 12); return d.getFullYear() + '-' + bgPad(d.getMonth() + 1); }
function bgDe(m){ const l = bgMoisLabel(m); return (/^[aeiouyàâéèêîïôûh]/i.test(l) ? "d'" : 'de ') + l; }
function bgMoisLabel(m){ const [y, mo] = String(m).split('-').map(Number); return new Date(y, mo - 1, 1, 12).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); }
function bgJours(iso){ return Math.round((new Date(iso + 'T12:00:00') - new Date(bgToday() + 'T12:00:00')) / 864e5); }
function bgDateFr(iso, long){
  if(!iso) return '';
  const d = new Date(String(iso).slice(0, 10) + 'T12:00:00');
  return isNaN(d) ? '' : d.toLocaleDateString('fr-FR', long ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short' });
}
function bgQuand(j){
  if(j === 0) return "aujourd'hui";
  if(j === 1) return 'demain';
  if(j > 1) return 'dans ' + j + ' jours';
  return 'en retard de ' + (-j) + ' jour' + (j < -1 ? 's' : '');
}
function bgIsoWeek(iso){
  const d = new Date(iso + 'T12:00:00');
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day + 3);
  const y = d.getFullYear();
  const jan4 = new Date(y, 0, 4, 12);
  const w = 1 + Math.round(((d - jan4) / 864e5 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
  return y + '-W' + bgPad(w);
}
function bgArr(v){
  if(Array.isArray(v)) return v;
  if(typeof v === 'string'){ try { const a = JSON.parse(v); return Array.isArray(a) ? a : []; } catch(e){ return []; } }
  return [];
}
function bgClone(v){ return JSON.parse(JSON.stringify(v == null ? null : v)); }
function bgTotal(lignes){ return bgArr(lignes).reduce((s, l) => s + (Math.round(Number(l.prix)) || 0), 0); }
function bgTotalReel(lignes){ return bgArr(lignes).reduce((s, l) => s + (Math.round(Number(l.reel != null ? l.reel : l.prix)) || 0), 0); }
function bgRefresh(){ if(typeof refreshAll === 'function') refreshAll(); }
function bgNoDash(s){ return String(s || '').replace(/[\u2013\u2014]/g, '-'); }

// Sources d'argent : comptes actifs et vrais coffres
function bgSrcVal(o){ return o && o.goal_id ? 'g' + o.goal_id : o && o.account_id ? 'a' + o.account_id : ''; }
function bgSrcParse(v){
  if(!v) return { account_id: null, goal_id: null };
  const id = Number(String(v).slice(1));
  return v[0] === 'g' ? { account_id: null, goal_id: id } : { account_id: id, goal_id: null };
}
function bgSrcObj(v){
  const p = bgSrcParse(v);
  if(p.goal_id){ const c = coffres.find(x => x.id === p.goal_id); return c ? { type: 'goal', obj: c, name: c.name, solde: Number(c.current) || 0 } : null; }
  if(p.account_id){ const a = accounts.find(x => x.id === p.account_id); return a ? { type: 'account', obj: a, name: a.name, solde: agAccountBalance(a) } : null; }
  return null;
}
function bgSrcOptions(sel, defLabel){
  const accs = agActiveAccounts().map(a => `<option value="a${a.id}" ${sel === 'a' + a.id ? 'selected' : ''}>${agEsc(a.name)} · ${agF(agAccountBalance(a))}</option>`).join('');
  const cofs = agCoffres().map(c => `<option value="g${c.id}" ${sel === 'g' + c.id ? 'selected' : ''}>Coffre ${agEsc(c.name)} · ${agF(c.current)}</option>`).join('');
  return (defLabel != null ? `<option value="">${agEsc(defLabel)}</option>` : '')
    + (accs ? `<optgroup label="Mes comptes">${accs}</optgroup>` : '')
    + (cofs ? `<optgroup label="Mes coffres">${cofs}</optgroup>` : '');
}

// Categories de depense : celles de l'app et celles deja utilisees
function bgCatsExistantes(){
  const set = new Set((typeof CATEGORIES !== 'undefined' && CATEGORIES.depense) || []);
  (txs || []).forEach(t => { if(t.type === 'depense' && t.category) set.add(t.category); });
  return [...set];
}
function bgNorm(s){ return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
function bgCatDepense(cat){
  if(cat === 'Business') return 'Business';
  const ex = bgCatsExistantes();
  const same = ex.find(c => bgNorm(c) === bgNorm(cat));
  if(same) return same;
  const map = { Perso: 'Loisirs', Famille: 'Autre', Autre: 'Autre' };
  const v = map[cat] || 'Autre';
  return ex.includes(v) ? v : 'Autre';
}
function bgCatCharges(){
  const ex = bgCatsExistantes();
  return ex.find(c => bgNorm(c) === 'charges') || (ex.includes('Logement') ? 'Logement' : 'Autre');
}

// ------------------------------------------------------------
// CHARGEMENT
// ------------------------------------------------------------
async function bgLoad(){
  if(typeof sb === 'undefined') return;
  try {
    const [b, c, p] = await Promise.all([
      sb.from('budgets').select('*').order('created_at', { ascending: false }),
      sb.from('charges_fixes').select('*').order('jour', { ascending: true }),
      sb.from('charges_paiements').select('*')
    ]);
    if(b && !b.error) BG.budgets = (b.data || []).map(x => ({ ...x, lignes: bgArr(x.lignes) }));
    if(c && !c.error) BG.charges = c.data || [];
    if(p && !p.error) BG.paiements = p.data || [];
  } catch(e){ console.warn('budget load', e); }
  BG.loaded = true;
}
if(typeof loadAllData === 'function'){
  const _bgLoadAllData = loadAllData;
  loadAllData = async function(){
    const r = await _bgLoadAllData.apply(this, arguments);
    await bgLoad();
    return r;
  };
}
(function bgInit(){
  const go = async () => {
    try {
      if(typeof sb === 'undefined') return;
      const { data } = await sb.auth.getSession();
      if(!data || !data.session) return;
      await bgLoad();
      if(typeof agRenderArgent === 'function') agRenderArgent();
    } catch(e){}
  };
  setTimeout(go, 900);
})();

// ------------------------------------------------------------
// COFFRES SPECIAUX : "Charges du mois" et "Projets prevus"
// ------------------------------------------------------------
const BG_MODELES = {
  charges: { key: BG_KEY_CHARGES, name: BG_NOM_CHARGES, data: { emoji: '🧾', type_coffre: 'entreprise', description: "L'argent gardé pour payer les charges fixes du mois", why: 'Payer le loyer et les factures sans stress', purpose: 'Garder l argent des charges fixes', urgency: 'urgent' } },
  projets: { key: BG_KEY_PROJETS, name: BG_NOM_PROJETS, data: { emoji: '🗓️', type_coffre: 'perso', description: "L'argent mis de côté pour mes budgets prévus", why: 'Payer mes projets sans toucher au reste', purpose: 'Garder l argent des budgets prévus', urgency: 'moyen' } }
};
function bgFindCoffre(k){
  const m = BG_MODELES[k];
  let id = null;
  try { id = Number(localStorage.getItem(m.key)) || null; } catch(e){}
  return coffres.find(x => x.id === id && agIsCoffre(x)) || coffres.find(x => x.name === m.name && agIsCoffre(x)) || null;
}
async function bgEnsureCoffre(k){
  const m = BG_MODELES[k];
  let c = bgFindCoffre(k);
  if(!c){
    c = await dbInsert('goals', { name: m.name, goal: 999999999, current: 0, goal_type: 'money', unit: 'FCFA', lock_level: 0, ...m.data });
    if(c) coffres.unshift(c);
  }
  if(c) try { localStorage.setItem(m.key, String(c.id)); } catch(e){}
  return c;
}
function bgCoffreBloqueMsg(c){
  if(!c || !estCoffreBloque(c)) return null;
  const lvl = Number(c.lock_level) || (getTypeCoffre(c) || {}).lockLevel || 1;
  return lvl >= 2 ? `Le coffre "${c.name}" est bloqué.\nDébloque-le d'abord (bouton "Débloquer" dans le coffre), puis recommence.` : '';
}

// ------------------------------------------------------------
// MOUVEMENTS D'ARGENT (toujours verifies avant d'ecrire)
// ------------------------------------------------------------
async function bgTransfert({ from, to, amount, note, date, details }){
  amount = Math.round(Number(amount) || 0);
  if(!(amount > 0)) return null;
  if(from.goal_id){
    const c = coffres.find(x => x.id === from.goal_id);
    if(!c){ agAlert("Ce coffre n'existe plus."); return null; }
    if(amount > Math.round(Number(c.current) || 0)){ agAlert(`Le coffre "${c.name}" n'a que ${agF(c.current)}.\nImpossible d'en sortir ${agF(amount)}.`); return null; }
  }
  let category = 'Transfert';
  if(from.account_id && to.goal_id) category = 'Vers coffre';
  if(from.goal_id && to.account_id) category = 'Sortie de coffre';
  if(from.goal_id && to.goal_id) category = 'Entre coffres';
  const r = await dbInsert('transactions', {
    _agRaw: true, type: 'transfert', category, amount, note: note || null, date: date || bgToday(), payment_method: 'Interne',
    account_id: from.account_id || null, goal_id: from.goal_id || null,
    to_account_id: to.account_id || null, to_goal_id: to.goal_id || null, details: details || null
  });
  if(!r) return null;
  txs.unshift(r);
  await agSyncGoals(null, r);
  return r;
}
// Payer une depense depuis une source (compte, ou coffre -> compte -> depense)
async function bgPayer({ src, amount, category, note, date, details, viaAccount }){
  amount = Math.round(Number(amount) || 0);
  if(!(amount > 0)) return null;
  let acc = src.account_id;
  if(src.goal_id){
    acc = viaAccount || (agPrincipal() || {}).id;
    if(!acc){ agAlert("Crée d'abord un compte : une dépense part toujours d'un compte."); return null; }
    const tr = await bgTransfert({ from: { goal_id: src.goal_id }, to: { account_id: acc }, amount, note, date, details });
    if(!tr) return null;
  }
  const a = accounts.find(x => x.id === acc);
  if(!a){ agAlert('Choisis un compte.'); return null; }
  const d = await dbInsert('transactions', { type: 'depense', amount, category, note: note || null, date: date || bgToday(), account_id: acc, payment_method: a.name, details: details || null });
  if(!d) return null;
  txs.unshift(d);
  return d;
}
// Verifie qu'on peut sortir ces montants : {'g12': 5000, 'a1': 3000}
async function bgCheckNeeds(needs){
  for(const [k, v] of Object.entries(needs)){
    if(k[0] !== 'g' || !(v > 0)) continue;
    const c = coffres.find(x => x.id === Number(k.slice(1)));
    if(!c){ await agAlert("Un coffre choisi n'existe plus. Choisis une autre source."); return false; }
    const cur = Math.round(Number(c.current) || 0);
    if(v > cur){
      await agAlert(`Le coffre "${c.name}" n'a pas assez.\nIl a ${agF(cur)}, il faut ${agF(v)} (il manque ${agF(v - cur)}).\n\nChoisis une autre source pour une partie des lignes, ou remets d'abord de l'argent dans ce coffre.`);
      return false;
    }
    const lock = bgCoffreBloqueMsg(c);
    if(lock){ await agAlert(lock); return false; }
    if(lock === '' && !await agConfirm(`"${c.name}" est protégé.\nSortir ${agF(v)} quand même ?`)) return false;
  }
  for(const [k, v] of Object.entries(needs)){
    if(k[0] !== 'a' || !(v > 0)) continue;
    const a = accounts.find(x => x.id === Number(k.slice(1)));
    if(!a){ await agAlert("Un compte choisi n'existe plus. Choisis une autre source."); return false; }
    const apres = agAccountBalance(a) - v;
    if(apres < 0 && !await agConfirm(`${a.name} va passer en négatif\nIl restera ${agF(apres)} après ces dépenses. Continuer ?`)) return false;
  }
  return true;
}
function bgNeeds(lignes, useReel){
  const n = {};
  for(const l of lignes){
    if(l.tx_id) continue;
    const m = Math.round(Number(useReel && l.reel != null ? l.reel : l.prix) || 0);
    const k = bgSrcVal(l);
    if(m > 0 && k) n[k] = (n[k] || 0) + m;
  }
  return n;
}

// ============================================================
// A. CALCULATEUR DE BUDGET D'UN PROJET
// ============================================================
function bgVide(){ return { nom: '', prix: '', src: '' }; }
function bgOuvrir(opts){
  opts = opts || {};
  if(!agActiveAccounts().length){ agGoTab('argent'); agToast("Crée d'abord tes comptes", 'info'); return; }
  const base = opts.id ? BG.budgets.find(b => b.id === opts.id) : opts.copie ? BG.budgets.find(b => b.id === opts.copie) : null;
  const gsrc = base ? (bgSrcVal({ account_id: base.source_account_id, goal_id: base.source_goal_id })) : '';
  const projets = bgFindCoffre('projets');
  const srcAvant = l => {
    if(opts.copie && l.account_id_avant) return 'a' + l.account_id_avant;
    const v = bgSrcVal(l);
    if(opts.copie && projets && v === 'g' + projets.id) return '';
    return v;
  };
  let glob = gsrc;
  if(opts.copie && projets && glob === 'g' + projets.id) glob = base.lignes.find(l => l.account_id_avant) ? 'a' + base.lignes.find(l => l.account_id_avant).account_id_avant : '';
  if(!glob) glob = 'a' + agPrincipal().id;
  BG.form = {
    id: opts.id && base ? base.id : null,
    titre: base ? base.titre : '',
    categorie: base ? (base.categorie || 'Business') : 'Business',
    date_evt: opts.id && base ? (base.date_evt || '') : '',
    src: glob,
    notes: base ? (base.notes || '') : '',
    analyse_ia: opts.id && base ? (base.analyse_ia || '') : '',
    lignes: base ? base.lignes.map(l => ({ nom: l.nom || '', prix: l.prix != null ? String(l.prix) : '', src: srcAvant(l) === glob ? '' : srcAvant(l) })) : []
  };
  if(!BG.form.lignes.length || bgLigneRemplie(BG.form.lignes[BG.form.lignes.length - 1])) BG.form.lignes.push(bgVide());
  const f = BG.form;
  agSheet('bgForm', `
    <h3>${f.id ? 'Modifier le budget' : 'Calculer un budget'}</h3>
    <div class="ag-hint" style="margin-top:0">Liste tout ce que tu vas payer pour ce projet. L'app fait le total et te dit si tu as assez.</div>
    <label for="bgTitre">Titre du projet</label>
    <input id="bgTitre" value="${agEsc(f.titre)}" placeholder="Ex : Déplacement pour un mariage à Yamoussoukro">
    <label>Catégorie</label>
    <div class="ag-pills" id="bgCat">${BG_CATS.map(c => `<button type="button" data-k="${c}" class="${c === f.categorie ? 'on' : ''}" onclick="agPick(this)">${c}</button>`).join('')}</div>
    <label for="bgDate">Date de l'événement</label>
    <input id="bgDate" type="date" value="${agEsc(f.date_evt)}" onchange="bgMajForm()">
    <label>Ce que tu vas payer</label>
    <div class="bg-lignes" id="bgLignes">${f.lignes.map((l, i) => bgLigneHtml(l, i)).join('')}</div>
    <div class="bg-total"><span>Total</span><b id="bgTotal">0 F</b></div>
    <label for="bgSrc">D'où part l'argent ? (pour tout)</label>
    <select id="bgSrc" onchange="BG.form.src=this.value;bgMajForm()">${bgSrcOptions(f.src)}</select>
    <div class="ag-hint" style="margin-top:4px">Tu peux changer la source d'une seule ligne avec le petit choix sous la ligne.</div>
    <div class="bg-src" id="bgSrcInfo"></div>
    <button class="btn-ghost" id="bgIaBtn" style="margin-top:12px;width:100%" onclick="bgAnalyser()">${agIcon('sparkles', 16)} Analyser avec l'IA</button>
    <div class="bg-ia-box" id="bgIa">${agEsc(f.analyse_ia)}</div>
    <label for="bgNotes">Notes (facultatif)</label>
    <input id="bgNotes" value="${agEsc(f.notes)}" placeholder="Ex : avec l'assistant, 2 jours sur place">
    <div class="ag-hint" id="bgDateHint"></div>
    <button class="btn-primary" id="bgValBtn" style="margin-top:12px" onclick="bgValider()">Valider</button>
    <div class="bg-btns">
      <button class="btn-ghost" onclick="bgEnregistrerModele()">Enregistrer comme modèle</button>
      <button class="btn-ghost" onclick="bgOuvrirListe()">Mes budgets</button>
    </div>
  `);
  bgMajForm();
  if(!f.titre) setTimeout(() => document.getElementById('bgTitre')?.focus(), 250);
}
function bgLigneRemplie(l){ return !!(String(l.nom || '').trim() || String(l.prix || '').trim()); }
function bgLigneHtml(l, i){
  return `<div class="bg-line" data-i="${i}">
    <input class="bg-nom" value="${agEsc(l.nom)}" placeholder="${i === 0 ? 'Ex : Transport aller' : 'Autre chose à payer'}" oninput="bgL(${i},'nom',this.value)">
    <input class="bg-prix" type="number" inputmode="decimal" value="${agEsc(l.prix)}" placeholder="Prix" oninput="bgL(${i},'prix',this.value)">
    <button type="button" class="bg-x" title="Supprimer la ligne" aria-label="Supprimer la ligne" onclick="bgDelLigne(${i})">×</button>
    <select class="bg-lsrc ${l.src ? 'set' : ''}" onchange="bgL(${i},'src',this.value)">${bgSrcOptions(l.src, 'Source générale')}</select>
  </div>`;
}
function bgL(i, k, v){
  const f = BG.form; if(!f || !f.lignes[i]) return;
  f.lignes[i][k] = v;
  if(k === 'src'){ const s = document.querySelector(`#bgLignes .bg-line[data-i="${i}"] .bg-lsrc`); if(s) s.classList.toggle('set', !!v); }
  if(i === f.lignes.length - 1 && bgLigneRemplie(f.lignes[i])){
    f.lignes.push(bgVide());
    const box = document.getElementById('bgLignes');
    if(box) box.insertAdjacentHTML('beforeend', bgLigneHtml(f.lignes[f.lignes.length - 1], f.lignes.length - 1));
  }
  bgMajForm();
}
function bgDelLigne(i){
  const f = BG.form; if(!f) return;
  f.lignes.splice(i, 1);
  if(!f.lignes.length || bgLigneRemplie(f.lignes[f.lignes.length - 1])) f.lignes.push(bgVide());
  const box = document.getElementById('bgLignes');
  if(box) box.innerHTML = f.lignes.map((l, j) => bgLigneHtml(l, j)).join('');
  bgMajForm();
}
function bgLireForm(){
  const f = BG.form; if(!f) return null;
  const g = id => document.getElementById(id);
  if(g('bgTitre')) f.titre = bgNoDash(g('bgTitre').value.trim());
  if(g('bgDate')) f.date_evt = g('bgDate').value;
  if(g('bgSrc')) f.src = g('bgSrc').value;
  if(g('bgNotes')) f.notes = bgNoDash(g('bgNotes').value.trim());
  f.categorie = document.querySelector('#bgCat button.on')?.dataset.k || f.categorie || 'Autre';
  return f;
}
// Lignes "propres" : nom, prix et la vraie source de chaque ligne
function bgLignesForm(f){
  return f.lignes.filter(l => Math.round(Number(l.prix) || 0) > 0).map((l, i) => {
    const p = bgSrcParse(l.src || f.src);
    return { nom: bgNoDash(String(l.nom || '').trim()) || ('Ligne ' + (i + 1)), prix: Math.round(Number(l.prix)), account_id: p.account_id, goal_id: p.goal_id };
  });
}
function bgSrcInfoHtml(lignes, useReel){
  const needs = bgNeeds(lignes, useReel);
  const keys = Object.keys(needs);
  if(!keys.length) return '<div class="r"><span>Ajoute des lignes avec un prix pour voir si tu as assez.</span></div>';
  return keys.map(k => {
    const s = bgSrcObj(k);
    if(!s) return `<div class="r bad"><span>Source introuvable</span><span>${agF(needs[k])}</span></div>`;
    const apres = s.solde - needs[k];
    const msg = apres < 0
      ? `<span class="bad">Pas assez : il manque ${agF(-apres)}${s.type === 'goal' ? '. Un coffre ne peut pas passer en négatif.' : ''}</span>`
      : `<span class="ok">Il restera ${agF(apres)}</span>`;
    return `<div class="r"><span><b>${agEsc(s.type === 'goal' ? 'Coffre ' + s.name : s.name)}</b><br>Solde actuel : ${agF(s.solde)}</span><span>À sortir : ${agF(needs[k])}<br>${msg}</span></div>`;
  }).join('');
}
function bgMajForm(){
  const f = bgLireForm(); if(!f) return;
  const lignes = bgLignesForm(f);
  const t = document.getElementById('bgTotal'); if(t) t.textContent = agF(bgTotal(lignes));
  const info = document.getElementById('bgSrcInfo'); if(info) info.innerHTML = bgSrcInfoHtml(lignes);
  const btn = document.getElementById('bgValBtn');
  const hint = document.getElementById('bgDateHint');
  const today = bgToday();
  if(!f.date_evt){ if(btn) btn.textContent = 'Valider'; if(hint) hint.textContent = "Choisis la date de l'événement."; }
  else if(f.date_evt <= today){ if(btn) btn.textContent = 'Enregistrer les dépenses'; if(hint) hint.textContent = "Date passée ou aujourd'hui : chaque ligne devient une dépense tout de suite."; }
  else { if(btn) btn.textContent = 'Prévoir ce budget'; if(hint) hint.textContent = `Date future (${bgQuand(bgJours(f.date_evt))}) : rien n'est dépensé maintenant. Tu pourras mettre l'argent de côté, puis confirmer le jour J.`; }
}
function bgSaveBudgetLocal(b){
  if(!b) return null;
  b = { ...b, lignes: bgArr(b.lignes) };
  const i = BG.budgets.findIndex(x => x.id === b.id);
  if(i >= 0) BG.budgets[i] = b; else BG.budgets.unshift(b);
  return b;
}
async function bgValider(){
  if(BG.busy) return;
  const f = bgLireForm(); if(!f) return;
  const lignes = bgLignesForm(f);
  if(!f.titre){ agAlert('Donne un titre à ton projet.\nEx : Concert, Déplacement pour un mariage à Yamoussoukro.'); return; }
  if(!f.date_evt){ agAlert("Choisis la date de l'événement."); return; }
  if(!lignes.length){ agAlert('Ajoute au moins une ligne avec un prix.'); return; }
  if(lignes.some(l => !l.account_id && !l.goal_id)){ agAlert("Choisis d'où part l'argent."); return; }
  const passe = f.date_evt <= bgToday();
  if(passe && !await bgCheckNeeds(bgNeeds(lignes))) return;
  const g = bgSrcParse(f.src);
  const row = { titre: f.titre, categorie: f.categorie, date_evt: f.date_evt, statut: 'prevu', lignes, source_account_id: g.account_id, source_goal_id: g.goal_id,
    analyse_ia: f.analyse_ia || null, modele: false, notes: f.notes || null, updated_at: new Date().toISOString() };
  BG.busy = true;
  const btn = document.getElementById('bgValBtn');
  if(btn){ btn.disabled = true; btn.textContent = 'Enregistrement...'; }
  try {
    let b = f.id ? await dbUpdate('budgets', f.id, row) : await dbInsert('budgets', row);
    if(!b) return;
    b = bgSaveBudgetLocal(b);
    if(passe){
      const ok = await bgExecuter(b, bgClone(lignes), false);
      agCloseSheet('bgForm');
      bgRefresh();
      if(ok) agToast(`${lignes.length} dépense${lignes.length > 1 ? 's' : ''} enregistrée${lignes.length > 1 ? 's' : ''} · ${agF(bgTotal(lignes))}`);
    } else {
      agCloseSheet('bgForm');
      bgRefresh();
      agToast('Budget prévu pour le ' + bgDateFr(b.date_evt));
      bgProposerCote(b.id);
    }
  } finally {
    BG.busy = false;
    if(btn && btn.isConnected){ btn.disabled = false; bgMajForm(); }
  }
}
// Cree une depense par ligne (montant reel s'il existe) et marque le budget "fait"
async function bgExecuter(b, lignes, useReel){
  const cat = bgCatDepense(b.categorie);
  let fail = false;
  for(const l of lignes){
    if(l.tx_id) continue;
    const m = Math.round(Number(useReel && l.reel != null ? l.reel : l.prix) || 0);
    if(!(m > 0)) continue;
    const t = await bgPayer({ src: l, amount: m, category: cat, note: `${b.titre} · ${l.nom}`, date: b.date_evt, details: 'bg:' + b.id });
    if(!t){ fail = true; break; }
    l.tx_id = t.id;
  }
  const maj = { lignes, statut: fail ? 'prevu' : 'fait', updated_at: new Date().toISOString() };
  const r = await dbUpdate('budgets', b.id, maj);
  bgSaveBudgetLocal({ ...b, ...(r || maj) });
  if(fail) agAlert("Une dépense n'a pas pu être enregistrée.\nLe budget reste \"prévu\" : les lignes déjà payées sont gardées, tu peux réessayer.");
  return !fail;
}

// ---------- IA ----------
function bgSeancesAVenir(){
  const t = bgToday();
  return (typeof shoots !== 'undefined' ? shoots : []).filter(s => s.date && String(s.date).slice(0, 10) >= t && s.status !== 'annule')
    .sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(0, 8);
}
function bgRevenusMois(){
  const m = bgMois();
  const l = txs.filter(t => t.type === 'revenu' && !t.cancelled && String(t.date || '').slice(0, 7) === m);
  return { total: l.reduce((s, t) => s + (Number(t.amount) || 0), 0), n: l.length };
}
function bgPromptBudget(f, lignes){
  const tot = bgTotal(lignes);
  const srcNom = l => { const s = bgSrcObj(bgSrcVal(l)); return s ? (s.type === 'goal' ? 'coffre ' + s.name : 'compte ' + s.name) : '?'; };
  const comptes = agActiveAccounts().map(a => `${a.name} ${agF(agAccountBalance(a))}`).join(' ; ');
  const cof = agCoffres().map(c => `${c.name} (${String((getTypeCoffre(c) || {}).label || '').replace(/^\S+\s/, '')}) ${agF(c.current)}`).join(' ; ');
  const rev = bgRevenusMois();
  const sea = bgSeancesAVenir().map(s => `${String(s.date).slice(0, 10)} ${s.type || 'séance'} ${agF(s.price)}${Number(s.montant_recu) ? ' (déjà reçu ' + agF(s.montant_recu) + ')' : ''}`).join(' ; ');
  const j = f.date_evt ? bgJours(f.date_evt) : null;
  return `Tu es le conseiller d'argent de Henzo, photographe et vidéaste à Bouaké (Côte d'Ivoire). Monnaie : FCFA.
Réponds en français très simple, sans jargon, en 5 points courts (une ou deux phrases chacun). Utilise des tirets simples "-" pour les listes, jamais de tiret long.

BUDGET À ANALYSER
Titre : ${f.titre || '(sans titre)'}
Catégorie choisie : ${f.categorie}
Date : ${f.date_evt || 'pas encore choisie'}${j != null ? ' (' + bgQuand(j) + ')' : ''}
Lignes :
${lignes.map(l => `- ${l.nom} : ${agF(l.prix)} (payé depuis ${srcNom(l)})`).join('\n') || '- aucune'}
Total : ${agF(tot)}

SITUATION
Comptes : ${comptes || 'aucun'}
Coffres : ${cof || 'aucun'}
Charges fixes : ${bgChargesContexte()}
Revenus de ce mois : ${agF(rev.total)} (${rev.n} entrée${rev.n > 1 ? 's' : ''})
Séances à venir : ${sea || 'aucune'}

RÉPONDS AVEC CES 5 POINTS
1. Raisonnable ? (oui / attention / non, et pourquoi en une phrase)
2. Impact : ce qui reste après sur la source choisie, et si la prochaine charge fixe sera encore payable
3. Business ou perso ? (dis si la catégorie choisie est la bonne)
4. Ce qui manque peut-être dans la liste (ex : le retour, la nourriture du 2e jour, le carburant)
5. Conseil sur la source choisie (ex : ne prends pas dans l'épargne pour un concert)`;
}
async function bgAnalyser(){
  const f = bgLireForm(); if(!f) return;
  const lignes = bgLignesForm(f);
  if(!lignes.length){ agAlert("Ajoute au moins une ligne avec un prix avant d'analyser."); return; }
  const box = document.getElementById('bgIa');
  const btn = document.getElementById('bgIaBtn');
  if(btn){ btn.disabled = true; btn.textContent = 'Analyse en cours...'; }
  if(box) box.textContent = 'Analyse en cours...';
  let txt = '';
  try {
    txt = bgNoDash(String(await window.callAI(bgPromptBudget(f, lignes)) || '').trim());
  } catch(e){
    if(box) box.textContent = "L'analyse n'a pas marché : " + (e && e.message ? e.message : 'erreur') + '.';
    if(btn){ btn.disabled = false; btn.innerHTML = `${agIcon('sparkles', 16)} Analyser avec l'IA`; }
    return;
  }
  f.analyse_ia = txt;
  if(box) box.textContent = txt;
  if(btn){ btn.disabled = false; btn.innerHTML = `${agIcon('sparkles', 16)} Analyser à nouveau`; }
  if(f.id){
    const r = await dbUpdate('budgets', f.id, { analyse_ia: txt, updated_at: new Date().toISOString() });
    if(r) bgSaveBudgetLocal(r);
  }
}

// ---------- Modeles ----------
async function bgEnregistrerModele(id){
  let src;
  if(id){
    const b = BG.budgets.find(x => x.id === id); if(!b) return;
    src = { titre: b.titre, categorie: b.categorie, lignes: b.lignes.map(l => ({ nom: l.nom, prix: Math.round(Number(l.prix) || 0), account_id: l.account_id_avant || l.account_id || null, goal_id: l.account_id_avant ? null : (l.goal_id || null) })),
      source_account_id: b.source_account_id, source_goal_id: b.source_goal_id, notes: b.notes };
  } else {
    const f = bgLireForm(); if(!f) return;
    const lignes = bgLignesForm(f);
    if(!f.titre){ agAlert('Donne un titre au modèle.'); return; }
    if(!lignes.length){ agAlert('Ajoute au moins une ligne avec un prix.'); return; }
    const g = bgSrcParse(f.src);
    src = { titre: f.titre, categorie: f.categorie, lignes, source_account_id: g.account_id, source_goal_id: g.goal_id, notes: f.notes || null };
  }
  const r = await dbInsert('budgets', { ...src, date_evt: null, statut: 'prevu', modele: true, analyse_ia: null, updated_at: new Date().toISOString() });
  if(!r) return;
  bgSaveBudgetLocal(r);
  bgRefresh();
  agToast('Modèle enregistré : ' + r.titre);
  if(document.getElementById('bgListe')) bgOuvrirListe(BG.listeTab);
}

// ---------- Mettre l'argent de cote (budget futur) ----------
function bgCote(b){
  let total = 0, goalId = null, accountId = null;
  txs.forEach(t => {
    if(t.cancelled) return;
    if(t.details === 'bgcote:' + b.id){ total += Number(t.amount) || 0; goalId = t.to_goal_id; accountId = t.account_id; }
    if(t.details === 'bgretour:' + b.id){ total -= Number(t.amount) || 0; }
  });
  return { total: Math.max(0, Math.round(total)), goalId, accountId };
}
function bgProposerCote(id){
  const b = BG.budgets.find(x => x.id === id); if(!b) return;
  const tot = bgTotal(b.lignes);
  const deja = bgCote(b).total;
  const parCompte = b.lignes.filter(l => l.account_id).reduce((s, l) => s + Math.round(Number(l.prix) || 0), 0);
  const defAcc = b.source_account_id || (b.lignes.find(l => l.account_id) || {}).account_id || agPrincipal().id;
  const projets = bgFindCoffre('projets');
  const autres = agCoffres().filter(c => !projets || c.id !== projets.id);
  agSheet('bgCoteSheet', `
    <h3>Mettre l'argent de côté</h3>
    <div class="ag-hint" style="margin-top:0"><b>${agEsc(b.titre)}</b> est prévu pour le ${bgDateFr(b.date_evt, true)} (${agF(tot)}). Range l'argent maintenant dans un coffre : il ne sera pas dépensé ailleurs.${deja ? `<br>Déjà de côté : ${agF(deja)}.` : ''}</div>
    <input id="bgCoteMt" type="number" inputmode="decimal" class="big" value="${Math.max(0, (parCompte || tot) - deja)}" placeholder="0">
    <label>D'où part l'argent ?</label>
    <div class="ag-pills" id="bgCoteFrom">${agActiveAccounts().map(a => `<button type="button" data-v="${a.id}" class="${a.id === defAcc ? 'on' : ''}" onclick="agPick(this)">${agEsc(a.name)}<small>${agF(agAccountBalance(a))}</small></button>`).join('')}</div>
    <label for="bgCoteTo">Dans quel coffre ?</label>
    <select id="bgCoteTo">
      <option value="projets">${BG_NOM_PROJETS}${projets ? ' · ' + agF(projets.current) : ' (créé pour toi)'}</option>
      ${autres.map(c => `<option value="${c.id}">${agEsc(c.name)} · ${agF(c.current)}</option>`).join('')}
    </select>
    <div class="ag-hint">Le jour J, quand tu confirmes le budget, les dépenses sortent de ce coffre. S'il reste de l'argent, il revient sur ton compte.</div>
    <button class="btn-primary" id="bgCoteBtn" style="margin-top:12px" onclick="bgFaireCote(${b.id})">Mettre de côté</button>
    <button class="btn-ghost" style="width:100%;margin-top:8px" onclick="agCloseSheet('bgCoteSheet')">Plus tard</button>
  `);
}
async function bgFaireCote(id){
  if(BG.busy) return;
  const b = BG.budgets.find(x => x.id === id); if(!b) return;
  const amount = Math.round(parseFloat(document.getElementById('bgCoteMt')?.value) || 0);
  const accId = Number(document.querySelector('#bgCoteFrom button.on')?.dataset.v) || null;
  const to = document.getElementById('bgCoteTo')?.value;
  if(!(amount > 0)){ agAlert('Tape un montant.'); return; }
  if(!accId){ agAlert("Choisis d'où part l'argent."); return; }
  const a = accounts.find(x => x.id === accId);
  if(agAccountBalance(a) - amount < 0 && !await agConfirm(`${a.name} va passer en négatif\nIl restera ${agF(agAccountBalance(a) - amount)}. Continuer ?`)) return;
  BG.busy = true;
  try {
    const c = to === 'projets' ? await bgEnsureCoffre('projets') : coffres.find(x => x.id === Number(to));
    if(!c){ agAlert("Le coffre n'a pas pu être trouvé."); return; }
    const tr = await bgTransfert({ from: { account_id: accId }, to: { goal_id: c.id }, amount, note: `${b.titre} · mis de côté`, date: bgToday(), details: 'bgcote:' + b.id });
    if(!tr) return;
    // Si tout ce qui part des comptes est couvert, ces lignes partiront du coffre le jour J
    const lignes = bgClone(b.lignes);
    const parCompte = lignes.filter(l => l.account_id && !l.tx_id).reduce((s, l) => s + Math.round(Number(l.prix) || 0), 0);
    const cote = bgCote(b).total;
    const maj = { updated_at: new Date().toISOString() };
    if(parCompte > 0 && cote >= parCompte){
      lignes.forEach(l => { if(l.account_id && !l.tx_id){ l.account_id_avant = l.account_id; l.account_id = null; l.goal_id = c.id; } });
      maj.lignes = lignes; maj.source_goal_id = c.id; maj.source_account_id = null;
    }
    const r = await dbUpdate('budgets', b.id, maj);
    bgSaveBudgetLocal({ ...b, ...(r || maj) });
    agCloseSheet('bgCoteSheet');
    bgRefresh();
    agToast(`${agF(amount)} mis de côté dans ${c.name}`);
  } finally { BG.busy = false; }
}
// Remet sur le compte l'argent mis de cote qui n'a pas servi
async function bgRendreCote(b, dejaPris){
  const cote = bgCote(b);
  const reste = Math.round(cote.total - (dejaPris || 0));
  if(!(reste > 0) || !cote.goalId) return 0;
  const c = coffres.find(x => x.id === cote.goalId);
  const acc = cote.accountId || (agPrincipal() || {}).id;
  if(!c || !acc) return 0;
  const m = Math.min(reste, Math.round(Number(c.current) || 0));
  if(!(m > 0)) return 0;
  const tr = await bgTransfert({ from: { goal_id: c.id }, to: { account_id: acc }, amount: m, note: `${b.titre} · reste remis sur le compte`, date: bgToday(), details: 'bgretour:' + b.id });
  return tr ? m : 0;
}

// ---------- Budgets a confirmer (le jour J ou apres) ----------
function bgAConfirmer(){
  const t = bgToday();
  return BG.budgets.filter(b => !b.modele && b.statut === 'prevu' && b.date_evt && b.date_evt <= t)
    .sort((a, b) => String(a.date_evt).localeCompare(String(b.date_evt)))
    .map(b => ({ ...b, total: bgTotal(b.lignes), cote: bgCote(b).total }));
}
function bgOuvrirConfirmer(id){
  const b = BG.budgets.find(x => x.id === id); if(!b) return;
  BG.conf = { id, lignes: bgClone(b.lignes).map(l => ({ ...l, reel: l.reel != null ? l.reel : l.prix, src: bgSrcVal(l) })) };
  const cote = bgCote(b);
  const coffreCote = cote.goalId ? coffres.find(x => x.id === cote.goalId) : null;
  agSheet('bgConfSheet', `
    <h3>Budget à confirmer</h3>
    <div class="ag-hint" style="margin-top:0"><b>${agEsc(b.titre)}</b> · ${bgDateFr(b.date_evt, true)}<br>Tape ce que tu as vraiment payé pour chaque ligne (0 si tu n'as rien payé). Les dépenses seront créées à la date de l'événement.</div>
    ${cote.total ? `<div class="bg-tip">Tu avais mis <b>${agF(cote.total)}</b> de côté dans ${agEsc(coffreCote ? coffreCote.name : 'un coffre')}. Les dépenses sortent de ce coffre, et ce qui reste revient sur ton compte.</div>` : ''}
    <div class="bg-lignes" id="bgConfLignes">${BG.conf.lignes.map((l, i) => `
      <div class="bg-line conf" data-i="${i}">
        <div class="bg-nm">${agEsc(l.nom)}${l.tx_id ? '<small>Déjà payée</small>' : `<small>Prévu : ${agF(l.prix)}</small>`}</div>
        <input type="number" inputmode="decimal" value="${agEsc(l.reel)}" ${l.tx_id ? 'disabled' : ''} oninput="bgConfL(${i},'reel',this.value)">
        ${l.tx_id ? '' : `<select class="bg-lsrc set" onchange="bgConfL(${i},'src',this.value)">${bgSrcOptions(l.src)}</select>`}
        <div class="bg-ec" data-ec="${i}"></div>
      </div>`).join('')}</div>
    <div class="bg-sum" id="bgConfSum"></div>
    <div class="bg-src" id="bgConfSrc"></div>
    <button class="btn-primary" id="bgConfBtn" style="margin-top:12px" onclick="bgConfirmer(${id})">Valider les dépenses réelles</button>
    <div class="bg-btns">
      <button class="btn-ghost" onclick="agCloseSheet('bgConfSheet');bgOuvrir({id:${id}})">Modifier le budget</button>
      <button class="btn-ghost" onclick="agCloseSheet('bgConfSheet')">Pas encore</button>
    </div>
  `);
  bgMajConf();
}
function bgConfL(i, k, v){
  const c = BG.conf; if(!c || !c.lignes[i]) return;
  if(k === 'reel') c.lignes[i].reel = v === '' ? 0 : Math.round(Number(v) || 0);
  if(k === 'src'){ c.lignes[i].src = v; const p = bgSrcParse(v); c.lignes[i].account_id = p.account_id; c.lignes[i].goal_id = p.goal_id; }
  bgMajConf();
}
function bgMajConf(){
  const c = BG.conf; if(!c) return;
  c.lignes.forEach((l, i) => {
    const el = document.querySelector(`#bgConfLignes [data-ec="${i}"]`); if(!el) return;
    const d = Math.round(Number(l.reel) || 0) - Math.round(Number(l.prix) || 0);
    el.className = 'bg-ec ' + (d > 0 ? 'plus' : d < 0 ? 'moins' : '');
    el.textContent = d === 0 ? 'Comme prévu' : d > 0 ? `${agF(d)} de plus que prévu` : `${agF(-d)} de moins que prévu`;
  });
  const p = bgTotal(c.lignes), r = bgTotalReel(c.lignes), d = r - p;
  const sum = document.getElementById('bgConfSum');
  if(sum) sum.innerHTML = `<div>Prévu<b>${agF(p)}</b></div><div class="${d > 0 ? 'red' : d < 0 ? 'ok' : ''}">Réel<b>${agF(r)}</b>${d ? (d > 0 ? '+' : '-') + agF(Math.abs(d)) : 'pile comme prévu'}</div>`;
  const src = document.getElementById('bgConfSrc'); if(src) src.innerHTML = bgSrcInfoHtml(c.lignes, true);
}
async function bgConfirmer(id){
  if(BG.busy) return;
  const b = BG.budgets.find(x => x.id === id); const c = BG.conf;
  if(!b || !c || c.id !== id) return;
  const lignes = c.lignes.map(l => { const o = { ...l }; delete o.src; o.reel = Math.max(0, Math.round(Number(o.reel) || 0)); return o; });
  if(lignes.some(l => !l.tx_id && l.reel > 0 && !l.account_id && !l.goal_id)){ agAlert("Choisis d'où part l'argent pour chaque ligne."); return; }
  if(!await bgCheckNeeds(bgNeeds(lignes, true))) return;
  BG.busy = true;
  const btn = document.getElementById('bgConfBtn');
  if(btn){ btn.disabled = true; btn.textContent = 'Enregistrement...'; }
  try {
    const cote = bgCote(b);
    const ok = await bgExecuter(b, lignes, true);
    if(!ok) return;
    // L'argent mis de cote qui n'a pas servi revient sur le compte
    const prisCoffre = cote.goalId ? lignes.filter(l => l.goal_id === cote.goalId).reduce((s, l) => s + l.reel, 0) : 0;
    const rendu = await bgRendreCote(b, prisCoffre);
    agCloseSheet('bgConfSheet');
    bgRefresh();
    const p = bgTotal(lignes), r = bgTotalReel(lignes), d = r - p;
    agSheet('bgConfDone', `
      <h3>Budget confirmé</h3>
      <div class="ag-hint" style="margin-top:0">${agEsc(b.titre)} · ${bgDateFr(b.date_evt, true)}</div>
      <div class="bg-sum"><div>Prévu<b>${agF(p)}</b></div><div class="${d > 0 ? 'red' : d < 0 ? 'ok' : ''}">Réel<b>${agF(r)}</b></div></div>
      <div class="bg-tip ${d > 0 ? 'red' : ''}">${d === 0 ? 'Pile comme prévu. Bravo !' : d > 0 ? `Tu as dépensé <b>${agF(d)} de plus</b> que prévu. La prochaine fois, prévois un peu plus pour ce genre de projet.` : `Tu as dépensé <b>${agF(-d)} de moins</b> que prévu.`}${rendu ? `<br>${agF(rendu)} mis de côté sont revenus sur ton compte.` : ''}</div>
      ${lignes.map(l => { const e = l.reel - Math.round(Number(l.prix) || 0); return `<div class="bg-lst-row"><span>${agEsc(l.nom)}</span><b>${agF(l.reel)}${e ? ` <small style="color:var(${e > 0 ? '--red' : '--green'})">(${e > 0 ? '+' : '-'}${agN(Math.abs(e))})</small>` : ''}</b></div>`; }).join('')}
      <button class="btn-primary" style="margin-top:14px" onclick="agCloseSheet('bgConfDone')">OK</button>
    `);
  } finally {
    BG.busy = false;
    if(btn && btn.isConnected){ btn.disabled = false; btn.textContent = 'Valider les dépenses réelles'; }
  }
}

// ---------- Annuler / supprimer ----------
async function bgAnnuler(id){
  const b = BG.budgets.find(x => x.id === id); if(!b || b.statut !== 'prevu' || b.modele) return;
  const cote = bgCote(b);
  if(!await agConfirm(`Annuler ce budget ?\n"${b.titre}" ne sera pas dépensé.${cote.total ? ` Les ${agF(cote.total)} mis de côté reviennent sur ton compte.` : ''}`)) return;
  if(cote.total){
    const c = coffres.find(x => x.id === cote.goalId);
    if(c && Math.round(Number(c.current) || 0) < cote.total){
      if(!await agConfirm(`Le coffre "${c.name}" n'a plus que ${agF(c.current)}\nOn remet seulement ce qui reste sur ton compte. Continuer ?`)) return;
    }
    await bgRendreCote(b, 0);
  }
  const r = await dbUpdate('budgets', id, { statut: 'annule', updated_at: new Date().toISOString() });
  if(!r) return;
  bgSaveBudgetLocal(r);
  bgRefresh();
  agToast('Budget annulé');
  if(document.getElementById('bgListe')) bgOuvrirListe(BG.listeTab);
}
async function bgSupprimerModele(id){
  const b = BG.budgets.find(x => x.id === id); if(!b || !b.modele) return;
  if(!await agConfirm(`Supprimer ce modèle ?\n"${b.titre}"`)) return;
  const ok = await dbDelete('budgets', id);
  if(!ok) return;
  BG.budgets = BG.budgets.filter(x => x.id !== id);
  bgRefresh();
  bgOuvrirListe('modele');
}

// ---------- Liste "Mes budgets" ----------
function bgOuvrirListe(tab){
  BG.listeTab = tab || BG.listeTab || 'prevu';
  const t = BG.listeTab;
  const groupes = {
    prevu: BG.budgets.filter(b => !b.modele && b.statut === 'prevu'),
    fait: BG.budgets.filter(b => !b.modele && b.statut === 'fait'),
    modele: BG.budgets.filter(b => b.modele),
    annule: BG.budgets.filter(b => !b.modele && b.statut === 'annule')
  };
  const lbl = { prevu: 'Prévus', fait: 'Faits', modele: 'Modèles', annule: 'Annulés' };
  const today = bgToday();
  const liste = groupes[t].slice().sort((a, b) => t === 'prevu' ? String(a.date_evt).localeCompare(String(b.date_evt)) : String(b.date_evt || b.created_at).localeCompare(String(a.date_evt || a.created_at)));
  const item = b => {
    const tot = t === 'fait' ? bgTotalReel(b.lignes) : bgTotal(b.lignes);
    const cote = bgCote(b).total;
    const jour = b.date_evt ? bgDateFr(b.date_evt, true) : '';
    let sub = [b.categorie, jour, b.lignes.length + ' ligne' + (b.lignes.length > 1 ? 's' : '')].filter(Boolean).join(' · ');
    if(t === 'prevu' && cote) sub += ' · ' + agF(cote) + ' de côté';
    if(t === 'prevu' && b.date_evt && b.date_evt <= today) sub += ' · à confirmer';
    let btns = '';
    if(t === 'prevu') btns = `${b.date_evt && b.date_evt <= today ? `<button class="bg-small acc" onclick="agCloseSheet('bgListe');bgOuvrirConfirmer(${b.id})">Confirmer</button>` : ''}
      <button class="bg-small" onclick="agCloseSheet('bgListe');bgOuvrir({id:${b.id}})">Modifier</button>
      <button class="bg-small" onclick="bgProposerCote(${b.id})">Mettre de côté</button>
      <button class="bg-small red" onclick="bgAnnuler(${b.id})">Annuler</button>`;
    if(t === 'fait' || t === 'annule') btns = `<button class="bg-small acc" onclick="agCloseSheet('bgListe');bgOuvrir({copie:${b.id}})">Refaire ce budget</button>
      <button class="bg-small" onclick="bgEnregistrerModele(${b.id})">Enregistrer comme modèle</button>`;
    if(t === 'modele') btns = `<button class="bg-small acc" onclick="agCloseSheet('bgListe');bgOuvrir({copie:${b.id}})">Utiliser</button>
      <button class="bg-small red" onclick="bgSupprimerModele(${b.id})">Supprimer</button>`;
    return `<div class="bg-item"><div class="h"><div class="d" onclick="bgVoir(${b.id})"><b>${agEsc(b.titre)}</b><span>${agEsc(sub)}</span></div><div class="m">${agF(tot)}</div></div><div class="bg-btns">${btns}</div></div>`;
  };
  agSheet('bgListe', `
    <h3>Mes budgets</h3>
    <div class="ag-pills">${Object.keys(lbl).filter(k => k !== 'annule' || groupes.annule.length).map(k => `<button type="button" class="${k === t ? 'on' : ''}" onclick="bgOuvrirListe('${k}')">${lbl[k]} <i>${groupes[k].length}</i></button>`).join('')}</div>
    <div class="bg-list">${liste.length ? liste.map(item).join('') : `<div class="ag-empty">${t === 'modele' ? 'Aucun modèle. Dans le calculateur, touche "Enregistrer comme modèle" pour réutiliser un budget.' : 'Aucun budget ici.'}</div>`}</div>
    ${t === 'fait' ? '<div class="ag-hint">Un budget fait garde ses dépenses. Pour en annuler une, passe par l\'Historique, comme d\'habitude.</div>' : ''}
    <button class="btn-primary" style="margin-top:8px" onclick="agCloseSheet('bgListe');bgOuvrir()">Calculer un nouveau budget</button>
  `);
}
function bgVoir(id){
  const b = BG.budgets.find(x => x.id === id); if(!b) return;
  const fait = b.statut === 'fait';
  const srcN = l => { const s = bgSrcObj(bgSrcVal(l)); return s ? s.name : ''; };
  const txOk = l => { if(!l.tx_id) return ''; const t = txs.find(x => x.id === l.tx_id); return !t ? ' · supprimée' : t.cancelled ? ' · annulée' : ''; };
  agSheet('bgVoirSheet', `
    <h3>${agEsc(b.titre)}</h3>
    <div class="ag-hint" style="margin-top:0">${agEsc([b.categorie, b.date_evt ? bgDateFr(b.date_evt, true) : (b.modele ? 'Modèle' : '')].filter(Boolean).join(' · '))}</div>
    <div class="bg-list">${b.lignes.map(l => `<div class="bg-lst-row"><span>${agEsc(l.nom)}<br><small style="color:var(--muted)">${agEsc(srcN(l))}${txOk(l)}</small></span><b>${fait && l.reel != null && Number(l.reel) !== Number(l.prix) ? `<s>${agN(l.prix)}</s> ${agF(l.reel)}` : agF(fait && l.reel != null ? l.reel : l.prix)}</b></div>`).join('')}
      <div class="bg-lst-row"><span>Total${fait ? ' réel' : ''}</span><b>${agF(fait ? bgTotalReel(b.lignes) : bgTotal(b.lignes))}</b></div></div>
    ${b.analyse_ia ? `<label>Analyse de l'IA</label><div class="bg-ia-box">${agEsc(b.analyse_ia)}</div>` : ''}
    ${b.notes ? `<div class="ag-hint">${agEsc(b.notes)}</div>` : ''}
    <button class="btn-ghost" style="width:100%;margin-top:12px" onclick="agCloseSheet('bgVoirSheet')">Fermer</button>
  `);
}

// ============================================================
// B. CHARGES FIXES
// ============================================================
function bgClamp(n, a, b){ return Math.max(a, Math.min(b, Math.round(Number(n) || a))); }
// Echeances d'une charge pour un mois 'YYYY-MM' : [{periode, echeance}]
function bgOccMois(c, m){
  const cm = String(c.created_at || '').slice(0, 7) || m;
  if(m < cm) return [];
  const [y, mo] = m.split('-').map(Number);
  const nbj = new Date(y, mo, 0).getDate();
  const f = c.frequence || 'mensuel';
  if(f === 'hebdo'){
    const dow = bgClamp(c.jour, 1, 7);
    const debut = String(c.created_at || '').slice(0, 10);
    const out = [];
    for(let d = 1; d <= nbj; d++){
      const dt = new Date(y, mo - 1, d, 12);
      if(((dt.getDay() + 6) % 7) + 1 !== dow) continue;
      const iso = bgYmd(dt);
      if(debut && iso < debut) continue;
      out.push({ periode: bgIsoWeek(iso), echeance: iso });
    }
    return out;
  }
  const [cy, cmo] = cm.split('-').map(Number);
  const diff = (y * 12 + mo) - (cy * 12 + cmo);
  const step = f === 'trimestriel' ? 3 : f === 'annuel' ? 12 : 1;
  if(diff % step) return [];
  return [{ periode: m, echeance: `${m}-${bgPad(Math.min(bgClamp(c.jour, 1, 31), nbj))}` }];
}
// Deja paye pour une echeance : seulement les paiements dont la depense existe et n'est pas annulee
// (un paiement sans tx_id = "deja payee avant l'app")
function bgPayePour(chargeId, periode){
  return BG.paiements.filter(p => p.charge_id === chargeId && p.periode === periode).reduce((s, p) => {
    if(p.tx_id){ const t = txs.find(x => x.id === p.tx_id); if(!t || t.cancelled) return s; }
    return s + (Number(p.montant) || 0);
  }, 0);
}
function bgOccurrences(){
  const m = bgMois(), prev = bgAddMois(m, -1);
  const out = [];
  BG.charges.filter(c => c.actif !== false).forEach(c => {
    const montant = Math.round(Number(c.montant) || 0);
    const add = (o, retardMoisPasse) => {
      const paye = Math.min(montant, Math.round(bgPayePour(c.id, o.periode)));
      const reste = Math.max(0, montant - paye);
      if(retardMoisPasse && reste <= 0) return;
      const jours = bgJours(o.echeance);
      out.push({ id: c.id, nom: c.nom, montant, echeance: o.echeance, periode: o.periode, jours, paye: reste <= 0, payeMontant: paye, reste, retard: reste > 0 && jours < 0, charge: c });
    };
    bgOccMois(c, prev).forEach(o => add(o, true));
    bgOccMois(c, m).forEach(o => add(o, false));
  });
  return out.sort((a, b) => a.echeance.localeCompare(b.echeance));
}
function bgChargesResume(){
  const occ = bgOccurrences();
  const total = occ.reduce((s, o) => s + o.montant, 0);
  const paye = occ.reduce((s, o) => s + o.payeMontant, 0);
  const reste = Math.max(0, total - paye);
  const cf = bgFindCoffre('charges');
  const deCote = cf ? Math.round(Number(cf.current) || 0) : 0;
  return {
    mois: bgMois(), total, paye, reste, deCote, manque: Math.max(0, reste - deCote),
    prochaines: occ.map(o => ({ id: o.id, nom: o.nom, montant: o.montant, echeance: o.echeance, jours: o.jours, paye: o.paye, reste: o.reste, periode: o.periode, retard: o.retard }))
  };
}
// Prochaine charge non payee (ou la premiere du mois suivant)
function bgProchaineCharge(){
  const r = bgChargesResume();
  const n = r.prochaines.find(o => !o.paye);
  if(n) return n;
  const m2 = bgAddMois(bgMois(), 1);
  const nx = [];
  BG.charges.filter(c => c.actif !== false).forEach(c => bgOccMois(c, m2).forEach(o => nx.push({ id: c.id, nom: c.nom, montant: Math.round(Number(c.montant) || 0), echeance: o.echeance, jours: bgJours(o.echeance), paye: false, reste: Math.round(Number(c.montant) || 0), periode: o.periode })));
  return nx.sort((a, b) => a.echeance.localeCompare(b.echeance))[0] || null;
}
function bgChargesContexte(){
  if(!BG.charges.filter(c => c.actif !== false).length) return 'Aucune charge fixe enregistrée.';
  const r = bgChargesResume();
  const parts = [`Charges fixes ${bgDe(r.mois)} : ${agF(r.total)} au total, ${agF(r.paye)} déjà payé, ${agF(r.deCote)} de côté dans le coffre "${BG_NOM_CHARGES}", il manque ${agF(r.manque)}.`];
  const ret = r.prochaines.filter(o => o.retard);
  if(ret.length) parts.push('En retard : ' + ret.map(o => `${o.nom} ${agF(o.reste)} (${bgQuand(o.jours)})`).join(', ') + '.');
  const n = bgProchaineCharge();
  if(n && !n.retard) parts.push(`Prochaine : ${n.nom} ${agF(n.reste)} le ${bgDateFr(n.echeance)} (${bgQuand(n.jours)}).`);
  return parts.join(' ');
}

// "Combien de seances pour couvrir ce qui manque ?"
function bgSeancesPour(montant){
  montant = Math.round(Number(montant) || 0);
  if(!(montant > 0)) return null;
  const t = bgToday();
  const lim = bgYmd(new Date(new Date(t + 'T12:00:00').setMonth(new Date(t + 'T12:00:00').getMonth() - 3)));
  const charges = s => (typeof chargesTotal === 'function' ? chargesTotal(s) : 0);
  const list = (typeof shoots !== 'undefined' ? shoots : []).filter(s => s.payment === 'paye' && s.status !== 'annule' && s.date && String(s.date).slice(0, 10) >= lim && String(s.date).slice(0, 10) <= t);
  const nets = list.map(s => (Number(s.price) || Number(s.montant_recu) || 0) - charges(s)).filter(n => n > 0);
  const packs = (typeof CRM !== 'undefined' && Array.isArray(CRM.tarifs) ? CRM.tarifs : []).filter(p => p.active !== false && (p.kind || 'formule') === 'formule' && Number(p.price) > 0);
  let net = 0, pack = null, base = '';
  if(nets.length){
    net = Math.round(nets.reduce((s, n) => s + n, 0) / nets.length);
    const prixMoy = list.reduce((s, x) => s + (Number(x.price) || Number(x.montant_recu) || 0), 0) / list.length;
    if(packs.length) pack = packs.slice().sort((a, b) => Math.abs(a.price - prixMoy) - Math.abs(b.price - prixMoy))[0];
    base = `en moyenne ${agF(net)} gagnés par séance, charges retirées (${nets.length} séance${nets.length > 1 ? 's' : ''} payée${nets.length > 1 ? 's' : ''} sur 3 mois)`;
  } else if(packs.length){
    const tri = packs.slice().sort((a, b) => a.price - b.price);
    pack = tri[Math.floor((tri.length - 1) / 2)];
    net = Math.round(Number(pack.price));
    base = `au prix du pack ${pack.name} (${agF(pack.price)}), sans compter les charges`;
  } else return { n: null, net: 0, pack: null, texte: "Ajoute tes tarifs ou des séances payées pour savoir combien de séances il te faut." };
  const n = Math.max(1, Math.ceil(montant / net));
  return { n, net, pack: pack ? pack.name : null, texte: `Il te faut environ ${n} séance${n > 1 ? 's' : ''}${pack ? ' ' + pack.name : ''} pour couvrir ${agN(montant)}\u00a0F`, detail: base };
}

// ---------- Vue des charges ----------
function bgChargesHtml(){
  if(!BG.loaded) return '<div class="ag-empty">Chargement...</div>';
  const r = bgChargesResume();
  const occ = bgOccurrences();
  const actives = BG.charges.filter(c => c.actif !== false);
  const pct = r.total ? Math.min(100, Math.round((r.paye + Math.min(r.deCote, r.reste)) / r.total * 100)) : 0;
  const s = r.manque > 0 ? bgSeancesPour(r.manque) : null;
  const occHtml = o => {
    const chip = o.paye ? '<span class="bg-chip ok">Payée</span>'
      : o.retard ? `<span class="bg-chip red">${bgQuand(o.jours)}</span>`
      : o.payeMontant > 0 ? '<span class="bg-chip warn">Payée en partie</span>'
      : `<span class="bg-chip">${bgQuand(o.jours)}</span>`;
    const per = o.charge.frequence === 'hebdo' ? ' · semaine ' + o.periode.slice(-2) : o.periode !== r.mois ? ' · ' + bgMoisLabel(o.periode) : '';
    return `<div class="bg-occ ${o.retard ? 'retard' : ''}">
      <div class="d" onclick="bgChargeForm(${o.id})"><b>${agEsc(o.nom)}</b><span>Échéance le ${bgDateFr(o.echeance)}${per} ${chip}${o.payeMontant > 0 && !o.paye ? `<br>Payé ${agF(o.payeMontant)} · reste ${agF(o.reste)}` : ''}</span></div>
      <div class="m">${agF(o.paye ? o.montant : o.reste)}<small>${o.paye ? 'réglé' : o.payeMontant ? 'reste' : 'à payer'}</small></div>
      ${o.paye ? '' : `<button class="bg-pay" onclick="bgPayerCharge(${o.id},'${o.periode}')">Payer</button>`}
    </div>`;
  };
  return `
    <div class="bg-tip" style="margin-top:0"><b>Charges ${agEsc(bgDe(r.mois))}</b>${r.prochaines.some(o => o.periode < r.mois && !o.paye) ? ' (avec les retards du mois passé)' : ''}</div>
    <div class="bg-sum">
      <div>Total du mois<b>${agF(r.total)}</b></div>
      <div class="ok">Déjà payé<b>${agF(r.paye)}</b></div>
      <div>De côté (coffre)<b>${agF(r.deCote)}</b></div>
      <div class="${r.manque > 0 ? 'red' : 'ok'}">Il manque<b>${agF(r.manque)}</b></div>
    </div>
    <div class="bg-bar"><i style="width:${pct}%"></i></div>
    <div class="ag-hint" style="margin-top:2px">${r.total ? (r.manque > 0 ? `Payé ou de côté : ${pct} %. Il manque encore ${agF(r.manque)}.` : 'Tout est payé ou mis de côté pour ce mois.') : 'Ajoute tes charges fixes : loyer, courant, eau, internet...'}</div>
    ${s ? `<div class="bg-tip"><b>${agEsc(s.texte)}</b>${s.detail ? `<br>${agEsc(s.detail)}` : ''}</div>` : ''}
    <div class="bg-btns">
      <button class="btn-primary" style="margin:0" onclick="bgMettreDeCoteCharges()">Mettre de côté</button>
      <button class="btn-ghost" style="margin:0" onclick="bgChargeForm()">+ Ajouter une charge</button>
    </div>
    <div class="ag-sec" style="margin-top:16px"><h3>Ce mois-ci</h3></div>
    <div class="bg-list">${occ.length ? occ.map(occHtml).join('') : '<div class="ag-empty">Aucune charge à payer ce mois-ci.</div>'}</div>
    <div class="ag-sec"><h3>Toutes mes charges</h3><button onclick="bgChargeForm()">+ Ajouter</button></div>
    <div class="bg-list">${BG.charges.length ? BG.charges.slice().sort((a, b) => (b.actif !== false) - (a.actif !== false) || (Number(a.jour) - Number(b.jour))).map(c => {
      const acc = accounts.find(a => a.id === c.account_id);
      const quand = c.frequence === 'hebdo' ? 'chaque ' + BG_JOURS_SEM[bgClamp(c.jour, 1, 7) - 1] : `le ${bgClamp(c.jour, 1, 31)}${c.frequence === 'trimestriel' ? ', tous les 3 mois' : c.frequence === 'annuel' ? ', une fois par an' : ' du mois'}`;
      return `<div class="bg-occ ${c.actif === false ? 'off' : ''}"><div class="d" onclick="bgChargeForm(${c.id})"><b>${agEsc(c.nom)}</b><span>${agEsc([quand, c.categorie, acc ? acc.name : '', c.actif === false ? 'désactivée' : ''].filter(Boolean).join(' · '))}</span></div><div class="m">${agF(c.montant)}</div></div>`;
    }).join('') : '<div class="ag-empty">Aucune charge fixe pour l\'instant.</div>'}</div>
    ${actives.length ? `<div class="ag-hint">Le coffre "${BG_NOM_CHARGES}" garde l'argent des charges. "Payer" le prend dans ce coffre s'il a assez, sinon sur un compte.</div>` : ''}
  `;
}
function bgRenderCharges(el){
  if(!el) return;
  if(!BG.chargeEls.includes(el)) BG.chargeEls.push(el);
  el.classList.add('bg-charges');
  el.innerHTML = bgChargesHtml();
}
function bgRefreshCharges(){
  BG.chargeEls = BG.chargeEls.filter(e => e && e.isConnected);
  BG.chargeEls.forEach(e => { try { e.innerHTML = bgChargesHtml(); } catch(err){ console.warn(err); } });
}
function bgOuvrirCharges(){
  agSheet('bgChargesSheet', `<h3>Charges fixes</h3><div id="bgChargesHost"></div>`);
  bgRenderCharges(document.getElementById('bgChargesHost'));
}

// ---------- Ajouter / modifier une charge ----------
function bgChargeForm(id){
  const c = id ? BG.charges.find(x => x.id === id) : null;
  const f = c ? (c.frequence || 'mensuel') : 'mensuel';
  const mois0 = c ? String(c.created_at || '').slice(0, 7) : bgMois();
  agSheet('bgChForm', `
    <h3>${c ? 'Modifier la charge' : 'Nouvelle charge fixe'}</h3>
    <label for="bgChNom">Nom</label>
    <input id="bgChNom" value="${agEsc(c ? c.nom : '')}" placeholder="Ex : Loyer, Courant, Eau, Canal+, Internet">
    <label for="bgChMt">Montant (FCFA)</label>
    <input id="bgChMt" type="number" inputmode="decimal" value="${c ? Math.round(Number(c.montant) || 0) : ''}" placeholder="0">
    <label>Fréquence</label>
    <div class="ag-pills" id="bgChFreq">${Object.entries(BG_FREQ).map(([k, v]) => `<button type="button" data-k="${k}" class="${k === f ? 'on' : ''}" onclick="agPick(this);bgChFreqMaj()">${v}</button>`).join('')}</div>
    <div id="bgChJourBox"></div>
    <div id="bgChMoisBox" style="display:none"><label for="bgChMois">Premier mois à payer</label><input id="bgChMois" type="month" value="${agEsc(mois0)}"></div>
    <label for="bgChCat">Catégorie</label>
    <select id="bgChCat">${BG_CH_CATS.map(k => `<option ${c && c.categorie === k ? 'selected' : ''}>${k}</option>`).join('')}</select>
    <label for="bgChAcc">Compte habituel</label>
    <select id="bgChAcc">${agActiveAccounts().map(a => `<option value="${a.id}" ${c && c.account_id === a.id ? 'selected' : ''}>${agEsc(a.name)}</option>`).join('')}</select>
    <label for="bgChNotes">Notes (facultatif)</label>
    <input id="bgChNotes" value="${agEsc(c ? c.notes || '' : '')}" placeholder="Ex : numéro de compteur, nom du bailleur">
    <button class="btn-primary" style="margin-top:12px" onclick="bgChargeSave(${c ? c.id : 'null'})">${c ? 'Enregistrer' : 'Ajouter la charge'}</button>
    ${c ? `<div class="bg-btns">
      <button class="btn-ghost" onclick="bgChargeActif(${c.id}, ${c.actif === false})">${c.actif === false ? 'Réactiver' : 'Désactiver'}</button>
      <button class="btn-danger" style="padding:12px" onclick="bgChargeDelete(${c.id})">Supprimer</button>
    </div>
    <button class="btn-ghost" style="width:100%;margin-top:8px" onclick="bgDejaPayee(${c.id})">Déjà payée ce mois-ci (hors app)</button>` : ''}
  `);
  bgChFreqMaj(c ? c.jour : null);
}
function bgChFreqMaj(jour){
  const f = document.querySelector('#bgChFreq button.on')?.dataset.k || 'mensuel';
  const box = document.getElementById('bgChJourBox'); if(!box) return;
  const cur = jour != null ? Number(jour) : Number(document.getElementById('bgChJour')?.value) || null;
  box.innerHTML = f === 'hebdo'
    ? `<label for="bgChJour">Jour de la semaine</label><select id="bgChJour">${BG_JOURS_SEM.map((d, i) => `<option value="${i + 1}" ${cur === i + 1 ? 'selected' : ''}>${d}</option>`).join('')}</select>`
    : `<label for="bgChJour">Jour d'échéance (1 à 31)</label><input id="bgChJour" type="number" inputmode="numeric" min="1" max="31" value="${cur || 5}">`;
  const mb = document.getElementById('bgChMoisBox'); if(mb) mb.style.display = (f === 'trimestriel' || f === 'annuel') ? '' : 'none';
}
async function bgChargeSave(id){
  const nom = bgNoDash(document.getElementById('bgChNom').value.trim());
  const montant = Math.round(parseFloat(document.getElementById('bgChMt').value) || 0);
  const frequence = document.querySelector('#bgChFreq button.on')?.dataset.k || 'mensuel';
  const jour = Math.round(Number(document.getElementById('bgChJour')?.value) || 0);
  if(!nom){ agAlert('Donne un nom à la charge.'); return; }
  if(!(montant > 0)){ agAlert('Tape le montant de la charge.'); return; }
  if(frequence === 'hebdo' ? (jour < 1 || jour > 7) : (jour < 1 || jour > 31)){ agAlert("Choisis un jour d'échéance entre 1 et 31."); return; }
  const data = { nom, montant, jour, frequence, categorie: document.getElementById('bgChCat').value, account_id: Number(document.getElementById('bgChAcc').value) || null, notes: bgNoDash(document.getElementById('bgChNotes').value.trim()) || null };
  const mois = document.getElementById('bgChMois')?.value;
  const c0 = id ? BG.charges.find(x => x.id === id) : null;
  // Pour "tous les 3 mois" et "une fois par an", le premier mois sert de repère
  if((frequence === 'trimestriel' || frequence === 'annuel') && /^\d{4}-\d{2}$/.test(mois || '') && (!c0 || String(c0.created_at || '').slice(0, 7) !== mois)) data.created_at = mois + '-01T12:00:00Z';
  let r;
  if(id) r = await dbUpdate('charges_fixes', id, data);
  else r = await dbInsert('charges_fixes', { ...data, actif: true });
  if(!r) return;
  const i = BG.charges.findIndex(x => x.id === r.id);
  if(i >= 0) BG.charges[i] = r; else BG.charges.push(r);
  agCloseSheet('bgChForm');
  bgRefresh();
  agToast(id ? 'Charge modifiée' : 'Charge ajoutée : ' + nom);
}
async function bgChargeActif(id, actif){
  const r = await dbUpdate('charges_fixes', id, { actif: !!actif });
  if(!r) return;
  const i = BG.charges.findIndex(x => x.id === id); if(i >= 0) BG.charges[i] = r;
  agCloseSheet('bgChForm');
  bgRefresh();
  agToast(actif ? 'Charge réactivée' : 'Charge désactivée');
}
async function bgChargeDelete(id){
  const c = BG.charges.find(x => x.id === id); if(!c) return;
  if(!await agConfirm(`Supprimer la charge "${c.nom}" ?\nLes dépenses déjà payées restent dans l'Historique.`)) return;
  const ok = await dbDelete('charges_fixes', id);
  if(!ok) return;
  try { await sb.from('charges_paiements').delete().eq('charge_id', id); } catch(e){}
  BG.charges = BG.charges.filter(x => x.id !== id);
  BG.paiements = BG.paiements.filter(p => p.charge_id !== id);
  agCloseSheet('bgChForm');
  bgRefresh();
  agToast('Charge supprimée');
}
async function bgDejaPayee(id){
  const o = bgOccurrences().find(x => x.id === id && !x.paye);
  if(!o){ agAlert('Cette charge est déjà payée pour ce mois.'); return; }
  if(!await agConfirm(`Marquer "${o.nom}" comme payée ?\nAucune dépense n'est créée : à utiliser seulement si tu l'as payée avant d'utiliser l'app (${agF(o.reste)}).`)) return;
  const r = await dbInsert('charges_paiements', { charge_id: id, periode: o.periode, montant: o.reste, tx_id: null, date: bgToday() });
  if(!r) return;
  BG.paiements.push(r);
  agCloseSheet('bgChForm');
  bgRefresh();
  agToast(o.nom + ' marquée comme payée');
}

// ---------- Mettre de cote / payer une charge ----------
async function bgMettreDeCoteCharges(){
  const c = await bgEnsureCoffre('charges');
  if(!c) return;
  const r = bgChargesResume();
  agOpenTransfer({ toGoal: c.id, amount: r.manque || '' });
  const n = document.getElementById('agTrNote'); if(n) n.value = 'Charges ' + bgDe(r.mois);
}
function bgPayerCharge(id, periode){
  const o = bgOccurrences().find(x => x.id === id && x.periode === periode);
  if(!o || o.paye){ agToast('Cette charge est déjà payée', 'info'); return; }
  const cf = bgFindCoffre('charges');
  const cur = cf ? Math.round(Number(cf.current) || 0) : 0;
  const defAcc = o.charge.account_id && accounts.find(a => a.id === o.charge.account_id && !a.archived) ? o.charge.account_id : agPrincipal().id;
  const def = cf && cur >= o.reste ? 'g' + cf.id : 'a' + defAcc;
  const pills = (cf ? [`<button type="button" data-v="g${cf.id}" class="${def === 'g' + cf.id ? 'on' : ''}" onclick="agPick(this)">Coffre ${agEsc(cf.name)}<small>${agF(cur)}</small></button>`] : [])
    .concat(agActiveAccounts().map(a => `<button type="button" data-v="a${a.id}" class="${def === 'a' + a.id ? 'on' : ''}" onclick="agPick(this)">${agEsc(a.name)}<small>${agF(agAccountBalance(a))}</small></button>`)).join('');
  agSheet('bgPaySheet', `
    <h3>Payer ${agEsc(o.nom)}</h3>
    <div class="ag-hint" style="margin-top:0">Échéance le ${bgDateFr(o.echeance, true)} · ${agF(o.montant)}${o.payeMontant ? ` · déjà payé ${agF(o.payeMontant)}` : ''}<br>Tu peux payer une partie seulement.</div>
    <input id="bgPayMt" type="number" inputmode="decimal" class="big" value="${o.reste}">
    <label>D'où part l'argent ?</label>
    <div class="ag-pills" id="bgPayFrom">${pills}</div>
    ${cf && cur < o.reste ? `<div class="ag-hint warn">Le coffre "${agEsc(cf.name)}" n'a que ${agF(cur)} : choisis un compte, ou paie une partie depuis le coffre.</div>` : ''}
    <button class="btn-primary" id="bgPayBtn" style="margin-top:12px" onclick="bgPayerChargeGo(${id},'${periode}')">Payer</button>
  `);
}
async function bgPayerChargeGo(id, periode){
  if(BG.busy) return;
  const o = bgOccurrences().find(x => x.id === id && x.periode === periode);
  if(!o) return;
  const amount = Math.round(parseFloat(document.getElementById('bgPayMt')?.value) || 0);
  const v = document.querySelector('#bgPayFrom button.on')?.dataset.v;
  if(!(amount > 0)){ agAlert('Tape un montant.'); return; }
  if(amount > o.reste){ agAlert(`Il ne reste que ${agF(o.reste)} à payer pour ${o.nom}.`); return; }
  if(!v){ agAlert("Choisis d'où part l'argent."); return; }
  const src = bgSrcParse(v);
  if(!await bgCheckNeeds({ [v]: amount })) return;
  BG.busy = true;
  const btn = document.getElementById('bgPayBtn'); if(btn){ btn.disabled = true; btn.textContent = 'Paiement...'; }
  try {
    const via = o.charge.account_id && accounts.find(a => a.id === o.charge.account_id && !a.archived) ? o.charge.account_id : null;
    const lib = o.charge.frequence === 'hebdo' ? 'semaine du ' + bgDateFr(o.echeance) : bgMoisLabel(o.periode);
    const t = await bgPayer({ src, amount, category: bgCatCharges(), note: `${o.nom} · ${lib}`, date: bgToday(), details: `ch:${id}:${periode}`, viaAccount: via });
    if(!t) return;
    const p = await dbInsert('charges_paiements', { charge_id: id, periode, montant: amount, tx_id: t.id, date: bgToday() });
    if(p) BG.paiements.push(p);
    agCloseSheet('bgPaySheet');
    bgRefresh();
    agToast(amount >= o.reste ? `${o.nom} payée` : `${agF(amount)} payés · reste ${agF(o.reste - amount)}`);
  } finally {
    BG.busy = false;
    if(btn && btn.isConnected){ btn.disabled = false; btn.textContent = 'Payer'; }
  }
}

// ============================================================
// BRANCHEMENTS SUR L'APP
// ============================================================
// Onglet Argent : outils budget, budgets a confirmer, carte des charges
function bgInjectArgent(){
  const el = document.getElementById('agArgentBody');
  if(!el || !agActiveAccounts().length) return;
  const acts = el.querySelector(':scope > .ag-actions');
  if(!acts) return;
  el.querySelector(':scope > .bg-zone')?.remove();
  const z = document.createElement('div');
  z.className = 'bg-zone';
  const conf = bgAConfirmer();
  const actives = BG.charges.filter(c => c.actif !== false);
  const r = bgChargesResume();
  const prochaine = r.prochaines.find(o => !o.paye);
  z.innerHTML = `
    <div class="bg-tools">
      <button class="main" onclick="bgOuvrir()">${agIcon('note', 17)} Calculer un budget</button>
      <button onclick="bgOuvrirListe()">${agIcon('calendar', 17)} Mes budgets</button>
    </div>
    ${conf.map(b => `<div class="bg-card warn" onclick="bgOuvrirConfirmer(${b.id})"><div class="ic">${agIcon('check', 18)}</div>
      <div class="d"><b>Budget à confirmer : ${agEsc(b.titre)}</b><span>${bgDateFr(b.date_evt, true)} · prévu ${agF(b.total)}${b.cote ? ' · ' + agF(b.cote) + ' de côté' : ''}<br>Tape ce que tu as vraiment payé.</span></div>${agIcon('chev', 16)}</div>`).join('')}
    <div class="bg-card" onclick="bgOuvrirCharges()"><div class="ic">${agIcon('home', 18)}</div>
      <div class="d">${actives.length
        ? `<b>Charges du mois : ${agF(r.reste)} à payer, ${agF(r.deCote)} de côté</b><span>${r.manque > 0 ? `<em>Il manque ${agF(r.manque)}</em>` : 'Tout est couvert'}${prochaine ? ` · ${agEsc(prochaine.nom)} ${bgQuand(prochaine.jours)}` : ''}</span>`
        : `<b>Charges fixes</b><span>Ajoute ton loyer, le courant, l'eau, internet... pour savoir combien garder chaque mois.</span>`}</div>${agIcon('chev', 16)}</div>`;
  acts.insertAdjacentElement('afterend', z);
}
if(typeof agRenderArgent === 'function'){
  const _bgRenderArgent = agRenderArgent;
  agRenderArgent = function(){
    const r = _bgRenderArgent.apply(this, arguments);
    try { bgInjectArgent(); } catch(e){ console.warn('budget argent', e); }
    try { bgRefreshCharges(); } catch(e){}
    return r;
  };
}

// Fenetre Depense : lien vers le calculateur
function bgMajLienDepense(){
  const tg = document.querySelector('#modalBg .type-toggle');
  if(!tg) return;
  let a = document.getElementById('bgDepLink');
  if(!a){
    a = document.createElement('button');
    a.type = 'button'; a.id = 'bgDepLink'; a.className = 'bg-link';
    a.textContent = 'Plusieurs dépenses pour un même projet ? Calculer un budget';
    a.onclick = () => { if(typeof closeModal === 'function') closeModal(); bgOuvrir(); };
    tg.insertAdjacentElement('afterend', a);
  }
  a.style.display = (typeof currentType !== 'undefined' && currentType === 'depense') ? '' : 'none';
}
if(typeof setType === 'function'){
  const _bgSetType = setType;
  setType = function(t){ const r = _bgSetType.apply(this, arguments); try { bgMajLienDepense(); } catch(e){} return r; };
}

// Repartition 50/30/20 : suggestion pour les charges du mois.
// Choix : on ne touche PAS aux 3 parts ni a leur controle. Si Henzo dit oui,
// juste apres une validation reussie, on deplace le montant de la part Studio
// (coffre deja rempli par la repartition) vers le coffre "Charges du mois".
// C'est un transfert entre coffres : aucun compte ne bouge, et le montant est
// limite a ce que la part Studio vient de recevoir.
BG.rep = { on: false };
function bgRepSuggestion(){
  document.getElementById('bgRepSugg')?.remove();
  BG.rep = { on: false };
  if(!BG.loaded || !BG.charges.some(c => c.actif !== false)) return;
  const r = bgChargesResume();
  if(!(r.manque > 0)) return;
  const btn = document.getElementById('repValiderBtn');
  if(!btn) return;
  const studio = Math.round(parseFloat(document.getElementById('repStudioMontant')?.value) || 0);
  const x = Math.min(r.manque, studio > 0 ? studio : r.manque);
  const n = r.prochaines.find(o => !o.paye);
  const d = document.createElement('div');
  d.id = 'bgRepSugg'; d.className = 'bg-rep';
  d.innerHTML = `<b>Mettre ${agF(x)} de côté pour tes charges</b> (il manque ${agF(r.manque)}${n ? `, ${agEsc(String(n.nom).toLowerCase())} ${bgQuand(n.jours)}` : ''}).
    <div class="row"><input id="bgRepMt" type="number" inputmode="decimal" value="${x}" aria-label="Montant pour les charges">
    <button type="button" id="bgRepBtn" onclick="bgRepToggle()">Oui, après la validation</button></div>
    <small>L'argent est pris sur la part Studio et va dans le coffre "${BG_NOM_CHARGES}", juste après la validation. Les 3 parts ne changent pas.</small>`;
  btn.insertAdjacentElement('beforebegin', d);
}
function bgRepToggle(){
  BG.rep.on = !BG.rep.on;
  const b = document.getElementById('bgRepBtn');
  if(b){ b.classList.toggle('on', BG.rep.on); b.textContent = BG.rep.on ? 'Oui, ce sera fait après la validation' : 'Oui, après la validation'; }
}
if(typeof ouvrirRepartitionPaiement === 'function'){
  const _bgOuvrirRep = ouvrirRepartitionPaiement;
  ouvrirRepartitionPaiement = async function(){
    document.getElementById('bgRepSugg')?.remove();
    BG.rep = { on: false };
    const r = await _bgOuvrirRep.apply(this, arguments);
    try { bgRepSuggestion(); } catch(e){ console.warn('budget rep', e); }
    return r;
  };
}
if(typeof validerRepartitionPaiement === 'function'){
  const _bgValiderRep = validerRepartitionPaiement;
  validerRepartitionPaiement = async function(){
    const avant = (typeof _repCtx !== 'undefined') ? _repCtx : null;
    const occupe = (typeof _repIsProcessing !== 'undefined') && _repIsProcessing;
    const veut = !occupe && avant && BG.rep && BG.rep.on;
    const studioId = (typeof _repCoffreIds !== 'undefined' && _repCoffreIds) ? _repCoffreIds.studio : null;
    const studioM = Math.round(parseFloat(document.getElementById('repStudioMontant')?.value) || 0);
    const voulu = Math.round(parseFloat(document.getElementById('bgRepMt')?.value) || 0);
    const r = await _bgValiderRep.apply(this, arguments);
    // Validation reussie : la fenetre a remis _repCtx a null
    if(veut && typeof _repCtx !== 'undefined' && _repCtx === null){
      BG.rep = { on: false };
      document.getElementById('bgRepSugg')?.remove();
      try { await bgRepApres(studioId, Math.min(voulu, studioM)); } catch(e){ console.warn('budget rep apres', e); }
    }
    return r;
  };
}
async function bgRepApres(studioId, montant){
  const res = bgChargesResume();
  montant = Math.min(Math.round(montant || 0), res.manque);
  if(!(montant > 0) || !studioId) return;
  const s = coffres.find(x => x.id === studioId);
  const cf = await bgEnsureCoffre('charges');
  if(!s || !cf || s.id === cf.id) return;
  montant = Math.min(montant, Math.round(Number(s.current) || 0));
  if(!(montant > 0)) return;
  const tr = await bgTransfert({ from: { goal_id: s.id }, to: { goal_id: cf.id }, amount: montant, note: 'Charges ' + bgDe(res.mois) + ' · mis de côté après la répartition', date: bgToday(), details: 'bgcharges' });
  if(!tr) return;
  bgRefresh();
  agToast(`${agF(montant)} mis de côté pour tes charges (${s.name} → ${cf.name})`);
}

// ---------- Exports ----------
window.bgOuvrir = bgOuvrir;
window.bgAConfirmer = bgAConfirmer;
window.bgRenderCharges = bgRenderCharges;
window.bgChargesResume = bgChargesResume;
window.bgChargesContexte = bgChargesContexte;
window.bgSeancesPour = bgSeancesPour;
window.bgOuvrirListe = bgOuvrirListe;
window.bgOuvrirCharges = bgOuvrirCharges;
window.bgLoad = bgLoad;
// Si l'onglet Argent est deja affiche, on ajoute tout de suite les outils
try { if(BG.loaded) agRenderArgent(); } catch(e){}
