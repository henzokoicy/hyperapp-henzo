// ============================================================
// SUPER APP HENZO - EXTRAS
// - Parrainage (ambassadeurs) : code perso, lien, filleuls, paliers, bons automatiques
// - Checklist avant seance (modele reglable, cases a cocher par seance)
// - Materiel et amortissement (onglet Materiel)
// - Bilan du mois automatique (feuille, conseils IA, partage / PDF)
// ============================================================

const EX = { prefs: {}, prefsLoaded: false, mat: [], matLoaded: false, posts: null, parBusy: false, parAgain: false, parTimer: null, bilan: null };

// ---------- Style (classes ex-) ----------
(function exStyle(){
  if(document.getElementById('exStyle')) return;
  const st = document.createElement('style');
  st.id = 'exStyle';
  st.textContent = `
.ex-tip{margin-top:12px;padding:10px 12px;border-radius:12px;background:var(--card2);border:1px dashed var(--border);font-size:12.5px;color:var(--text-2);line-height:1.45}
.ex-tip b{color:var(--accent)}
.ex-ck-btn{display:inline-flex;align-items:center;gap:6px;width:auto;margin:8px 0 0;padding:5px 10px;border-radius:10px;background:var(--card2);border:1px solid var(--border);color:var(--muted);font:600 12px Inter,sans-serif;cursor:pointer}
.ex-ck-btn.ok{color:var(--green);border-color:var(--green)}
.ex-ck-btn .ag-i{width:14px;height:14px}
.ex-ck-cat{margin:14px 0 4px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.ex-ck-item{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer;font-size:14px;color:var(--text)}
.ex-ck-item:last-child{border-bottom:0}
.ex-ck-item input{width:20px;height:20px;margin:0;accent-color:var(--accent);flex-shrink:0}
.ex-ck-item.done span{color:var(--muted);text-decoration:line-through}
.ex-ck-item span{flex:1}
.ex-ck-item button{width:auto;margin:0;padding:2px 8px;background:none;border:0;color:var(--muted);font-size:18px;cursor:pointer}
.ex-prog{height:8px;border-radius:6px;background:var(--card3);overflow:hidden;margin:8px 0 2px}
.ex-prog i{display:block;height:100%;background:var(--accent);border-radius:6px}
.ex-src{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer}
.ex-src:last-child{border-bottom:0}
.ex-src .d{flex:1;min-width:0}.ex-src .d b{display:block;font-size:13.5px;color:var(--text)}.ex-src .d span{font-size:12px;color:var(--muted)}
.ex-src .m{font-weight:700;font-size:13px;white-space:nowrap;color:var(--text)}
.ex-src.on .d b{color:var(--accent)}
.ex-bar{height:5px;border-radius:4px;background:var(--card3);margin-top:5px;overflow:hidden}.ex-bar i{display:block;height:100%;background:var(--accent)}
.crm-tag.ex-srctag{color:var(--muted);text-transform:none;letter-spacing:0;font-weight:600}
.ex-kpis{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:6px 0}
.ex-kpis>div{background:var(--card2);border:1px solid var(--border);border-radius:14px;padding:10px 12px}
.ex-kpis b{display:block;font-size:16px;color:var(--text)}.ex-kpis span{font-size:11.5px;color:var(--muted)}
.ex-kpis em{display:block;font-style:normal;font-size:11px;margin-top:3px;color:var(--muted)}
.ex-up{color:var(--green) !important}.ex-down{color:var(--red) !important}
.ex-bilan-h{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.ex-bilan-h h3{flex:1;margin:0}
.ex-bilan-h button{width:36px;height:36px;margin:0;padding:0;border-radius:10px;background:var(--card2);border:1px solid var(--border);color:var(--text);cursor:pointer;display:grid;place-items:center}
.ex-bilan-h button:disabled{opacity:.35}
.ex-bilan-h .prev .ag-i{transform:rotate(180deg)}
.ex-ai{margin-top:10px;padding:12px 14px;border-radius:14px;background:var(--card2);border:1px solid var(--border);font-size:13.5px;line-height:1.5;color:var(--text-2)}
.ex-ai:empty{display:none}
.ex-ai p{margin:0 0 6px}.ex-ai ul{margin:4px 0 6px 18px;padding:0}
.ex-hello-btn{display:inline-flex;align-items:center;gap:6px;width:auto;margin:0;padding:8px 12px;border-radius:12px;background:var(--card2);border:1px solid var(--border);color:var(--text);font:600 12.5px Inter,sans-serif;cursor:pointer}
.ex-reward{display:flex;align-items:center;gap:10px;padding:12px 0;border-bottom:1px solid var(--border)}
.ex-reward:last-child{border-bottom:0}
.ex-reward .d{flex:1;min-width:0}.ex-reward .d b{display:block;font-size:14px;color:var(--text)}.ex-reward .d span{display:block;font-size:12px;color:var(--muted);margin-top:2px}
.ex-reward .b{display:flex;flex-direction:column;gap:6px}
.ex-reward .b button{width:auto;margin:0;padding:7px 10px;font-size:12px}
.ex-rank{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;flex-shrink:0;background:var(--card3);color:var(--accent);font:700 12px Inter,sans-serif}
.ex-palier{display:grid;grid-template-columns:60px 1fr;gap:8px;padding:10px;border-radius:14px;background:var(--card2);border:1px solid var(--border);margin-bottom:8px}
.ex-palier input,.ex-palier select{margin:0}
.ex-palier .full{grid-column:1 / -1;display:flex;gap:8px;align-items:center}
.ex-palier .full select{flex:1}.ex-palier .full input{width:90px}
.ex-palier .full button{width:auto;margin:0;padding:6px 10px;background:none;border:1px solid var(--border);border-radius:10px;color:var(--red);cursor:pointer}
.ex-mat-warn{color:var(--yellow)}.ex-mat-late{color:var(--red)}
.ex-src-q{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.ex-src-q button{width:auto;margin:0;padding:8px 11px;border-radius:12px;background:var(--card2);border:1px solid var(--border);color:var(--text-2);font:500 12.5px Inter,sans-serif;cursor:pointer}
.ex-src-q button.on{border-color:var(--accent);color:var(--text);background:var(--card3)}
`;
  document.head.appendChild(st);
})();

// ---------- Outils ----------
function exUser(){ return sb.auth.getUser().then(r => (r && r.data && r.data.user) || null); }
function exNow(){ return new Date(); }
function exClient(id){ return (clients || []).find(c => Number(c.id) === Number(id)); }
function exCancelled(s){ return /annul/i.test((s && s.status) || ''); }
function exPage(){ const p = document.querySelector('.page.active'); return p ? p.id.replace('page-', '') : ''; }
function exSheetOpen(){ return !!document.querySelector('.ag-sheet, .modal-bg.show'); }
function exTxt(s){ return String(s == null ? '' : s).replace(/[  ]/g, ' '); }
function exFirst(c){ return typeof crmFirst === 'function' ? crmFirst(c) : String((c && c.name) || '').split(' ')[0]; }
function exAddMonths(d, n){ const x = new Date(d); const day = x.getDate(); x.setDate(1); x.setMonth(x.getMonth() + n); x.setDate(Math.min(day, new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate())); return x; }

// ---------- Reglages (user_preferences, toujours fusionnes) ----------
async function exLoadPrefs(){
  try {
    const u = await exUser(); if(!u) return;
    const { data } = await sb.from('user_settings').select('user_preferences').eq('user_id', u.id).maybeSingle();
    EX.prefs = (data && data.user_preferences) || {};
    EX.prefsLoaded = true;
  } catch(e){ console.warn('extras prefs', e); }
}
async function exSavePrefs(patch){
  // crmSavePrefs relit les reglages et ne remplace que les cles donnees
  const ok = typeof crmSavePrefs === 'function' ? await crmSavePrefs(patch) : false;
  if(ok) Object.assign(EX.prefs, patch);
  return ok;
}

// ============================================================
// 1. PARRAINAGE (AMBASSADEURS)
// ============================================================
const EX_PAR_DEF = { on: true, validite: 30, paliers: [
  { n: 1, recompense: '-10 % sur sa prochaine séance', kind: 'percent', value: 10 },
  { n: 3, recompense: '-25 % sur sa prochaine séance', kind: 'percent', value: 25 },
  { n: 5, recompense: 'Séance studio offerte', kind: 'offert', value: 100 }
] };
function exParCfg(){
  const p = EX.prefs.parrainage || {};
  const paliers = (Array.isArray(p.paliers) && p.paliers.length ? p.paliers : EX_PAR_DEF.paliers)
    .map(x => ({ n: Math.max(1, parseInt(x.n) || 1), recompense: x.recompense || '', kind: x.kind || 'percent', value: Number(x.value) || 0 }))
    .sort((a, b) => a.n - b.n);
  return { on: p.on !== false, validite: Math.max(1, parseInt(p.validite) || EX_PAR_DEF.validite), paliers };
}
function exNorm(s){ return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, ''); }
function exParPrenom(c){
  const base = String((c && c.crm && c.crm.appel) || (c && c.name) || '').trim()
    .replace(/^(mr|mme|mlle|m\.|monsieur|madame|mademoiselle|dr|me)\.?\s+/i, '');
  return exNorm(base.split(/\s+/)[0]).slice(0, 10) || 'CLIENT';
}
function exParCodeNew(c){
  const base = exParPrenom(c);
  const used = new Set((clients || []).map(x => String(x.code_parrain || '').toUpperCase()).filter(Boolean));
  ((typeof CRM !== 'undefined' && CRM.promos) || []).forEach(p => used.add(String(p.code || '').toUpperCase()));
  for(let i = 0; i < 300; i++){ const code = base + String(10 + Math.floor(Math.random() * 90)); if(!used.has(code)) return code; }
  for(let n = 100; n < 10000; n++){ if(!used.has(base + n)) return base + n; }
  return base + Date.now().toString().slice(-5);
}
async function exParEnsureCode(c){
  if(!c) return null;
  if(c.code_parrain) return c.code_parrain;
  const code = exParCodeNew(c);
  const r = await dbUpdate('clients', c.id, { code_parrain: code });
  if(!r) return null;
  Object.assign(c, r); if(!c.code_parrain) c.code_parrain = code;
  return c.code_parrain;
}
function exParLink(code){
  if(!code || typeof otHasPage !== 'function' || !otHasPage() || typeof otResaLink !== 'function') return '';
  return otResaLink('') + '&p=' + encodeURIComponent(code);
}
function exShootPaid(s){
  if(!s || exCancelled(s)) return false;
  return s.payment === 'paye' || (Number(s.price) > 0 && Number(s.montant_recu || 0) >= Number(s.price));
}
function exFilleulValide(f, depuis){
  return (shoots || []).some(s => Number(s.client_id) === Number(f.id) && exShootPaid(s) && (!depuis || String(s.date || '').slice(0, 10) >= depuis));
}
// Date de remise a zero du compteur (bon perdu), ou null
function exParReset(c){ return (c && c.crm && c.crm.parrain_reset) || null; }
function exParStats(c){
  // Un filleul qui n'est pas client (modele, ami...) ne compte que s'il a vraiment paye une seance
  const all = (clients || []).filter(x => x.parrain_id != null && Number(x.parrain_id) === Number(c.id) && x.id !== c.id && (typeof estClient !== 'function' || estClient(x) || exFilleulValide(x)));
  const reset = exParReset(c);
  const val = all.filter(f => exFilleulValide(f, reset));
  // Valides avant la remise a zero : perdus (ne comptent plus)
  const perdus = reset ? all.filter(f => !val.includes(f) && exFilleulValide(f)) : [];
  return { all, val, perdus, att: all.filter(x => !val.includes(x) && !perdus.includes(x)) };
}
function exToday(){ return new Date().toISOString().slice(0, 10); }
// Un bon compte comme utilise s'il a servi sur une seance ou dans une reservation faite a temps
function exParBonUtilise(promo){
  if(!promo) return false;
  if((promo.uses || []).length) return true;
  const resas = ((typeof OT !== 'undefined' && Array.isArray(OT.resas)) ? OT.resas : []).concat(EX.resasCodes || []);
  return resas.some(r => String(r.code || '').toUpperCase() === String(promo.code || '').toUpperCase() && r.status !== 'refusee'
    && (!promo.valid_until || String(r.created_at || '').slice(0, 10) <= promo.valid_until));
}
function exParJoursRestants(promo){
  if(!promo || !promo.valid_until) return null;
  return Math.round((new Date(promo.valid_until + 'T23:59:59') - new Date()) / 864e5);
}
// Bon perdu (date passee, pas utilise) : le compteur du client repart a zero
async function exParExpirations(){
  const perdus = [];
  // Les reservations faites avec ces codes (pour ne jamais retirer un bon deja utilise)
  const codes = [];
  (clients || []).forEach(c => exParDonnes(c).forEach(d => { const pr = (CRM.promos || []).find(p => p.id === d.promo_id); if(pr && pr.code) codes.push(String(pr.code).toUpperCase()); }));
  if(!codes.length) return perdus;
  try {
    const { data, error } = await sb.from('reservations').select('code,created_at,status').in('code', codes);
    if(error) return perdus;                 // dans le doute, on ne retire rien
    EX.resasCodes = data || [];
  } catch(e){ return perdus; }
  for(const c of (clients || []).slice()){
    const exp = exParDonnes(c).filter(d => {
      const promo = (CRM.promos || []).find(p => p.id === d.promo_id);
      return promo && promo.valid_until && promo.valid_until < exToday() && !exParBonUtilise(promo);
    });
    if(!exp.length) continue;
    for(const d of exp){
      const promo = (CRM.promos || []).find(p => p.id === d.promo_id);
      if(promo && promo.status === 'active'){
        const notes = String(promo.notes || '') + ' - Expiré sans être utilisé, compteur remis à zéro.';
        const { error } = await sb.from('promos').update({ status: 'arrete', notes }).eq('id', promo.id);
        if(!error){ promo.status = 'arrete'; promo.notes = notes; }
      }
    }
    const old = Array.isArray(c.crm && c.crm.parrain_perdus) ? c.crm.parrain_perdus : [];
    const crm = Object.assign({}, c.crm || {}, {
      parrain_reset: exToday(),
      parrain_paliers: [],
      parrain_perdus: old.concat(exParDonnes(c).map(d => ({ ...d, perdu_le: exToday(), expire: exp.includes(d) })))
    });
    const r = await dbUpdate('clients', c.id, { crm });
    if(r) Object.assign(c, r); else c.crm = crm;
    perdus.push(c);
  }
  if(perdus.length) agToast(perdus.length === 1 ? `Bon de ${perdus[0].name} expiré sans être utilisé : son compteur repart à zéro` : `${perdus.length} bons expirés : compteurs remis à zéro`);
  return perdus;
}
function exParDonnes(c){ const l = c && c.crm && c.crm.parrain_paliers; return Array.isArray(l) ? l : []; }
function exParNext(n){ return exParCfg().paliers.find(p => p.n > n) || null; }
function exParVous(t){ return String(t || '').replace(/\bsa\b/gi, 'votre').replace(/\bson\b/gi, 'votre').replace(/\bses\b/gi, 'vos'); }
function exParRecompense(p){
  if(p.recompense) return p.recompense;
  if(p.kind === 'offert') return 'Séance offerte';
  return p.kind === 'amount' ? '-' + agF(p.value) + ' sur sa prochaine séance' : '-' + p.value + ' % sur sa prochaine séance';
}

// Verifie les paliers atteints et cree les bons (jamais deux fois)
async function exParCheck(){
  const cfg = exParCfg();
  if(!cfg.on || typeof CRM === 'undefined' || !CRM.loaded || !Array.isArray(clients)) return [];
  if(EX.parBusy){ EX.parAgain = true; return []; }
  EX.parBusy = true;
  const out = [];
  try {
    await exParExpirations();
    for(const c of clients.slice()){
      const n = exParStats(c).val.length; if(!n) continue;
      for(const p of cfg.paliers){
        if(p.n > n || exParDonnes(c).some(d => Number(d.n) === p.n)) continue;
        const r = await exParGive(c, p);
        if(r) out.push(r);
      }
    }
  } catch(e){ console.warn('parrainage', e); }
  EX.parBusy = false;
  if(out.length){
    agToast(out.length === 1 ? `Récompense de parrainage pour ${out[0].c.name} : un bon a été créé` : `${out.length} récompenses de parrainage créées`);
    if(exPage() === 'clients' && typeof crmRender === 'function' && !exSheetOpen()) crmRender();
  }
  if(EX.parAgain){ EX.parAgain = false; setTimeout(exParCheck, 300); }
  return out;
}
function exParSoon(){ clearTimeout(EX.parTimer); EX.parTimer = setTimeout(exParCheck, 1200); }
async function exParGive(c, p){
  // Apres une remise a zero, c'est un nouveau cycle : nouvelle reference
  const ref = `Réf. parrainage ${c.id}-${p.n}` + (exParReset(c) ? ' cycle ' + exParReset(c) : '');
  let promo = (CRM.promos || []).find(x => { const n = String(x.notes || ''); return n.includes(ref) && (exParReset(c) || !n.includes(ref + ' cycle')); });
  if(!promo){
    const used = new Set((CRM.promos || []).map(x => String(x.code || '').toUpperCase()));
    let code = (c.code_parrain || exParPrenom(c)) + '-P' + p.n;
    while(used.has(code.toUpperCase())) code = (c.code_parrain || exParPrenom(c)) + '-P' + p.n + Math.floor(Math.random() * 90 + 10);
    const offert = p.kind === 'offert';
    const until = new Date(Date.now() + exParCfg().validite * 864e5).toISOString().slice(0, 10);
    const u = await exUser(); if(!u) return null;
    const data = {
      user_id: u.id, title: 'Parrainage : ' + exParRecompense(p),
      kind: offert ? 'percent' : (p.kind === 'amount' ? 'amount' : 'percent'), value: offert ? 100 : (Number(p.value) || 0),
      code, valid_until: until, target: { ids: [c.id] }, status: 'active', uses: [],
      notes: `Merci pour ${p.n} personne${p.n > 1 ? 's' : ''} recommandée${p.n > 1 ? 's' : ''}. A utiliser avant le ${until}, sinon il est perdu et le compteur repart à zéro. ${ref}`
    };
    const { data: r, error } = await sb.from('promos').insert(data).select().single();
    if(error || !r){ console.warn('bon parrainage', error); return null; }
    CRM.promos.unshift(r); promo = r;
  }
  const done = exParDonnes(c).filter(d => Number(d.n) !== p.n).concat([{ n: p.n, promo_id: promo.id, code: promo.code, date: new Date().toISOString(), envoye: false }]);
  const crm = Object.assign({}, c.crm || {}, { parrain_paliers: done });
  const r = await dbUpdate('clients', c.id, { crm });
  if(r) Object.assign(c, r); else c.crm = crm;
  return { c, p, promo };
}
function exParRewards(){
  const out = [];
  (clients || []).forEach(c => exParDonnes(c).forEach(d => { if(!d.envoye) out.push({ c, d, promo: (CRM.promos || []).find(p => p.id === d.promo_id) }); }));
  return out;
}
function exParBientot(){
  const out = [];
  (clients || []).forEach(c => exParDonnes(c).forEach(d => {
    if(!d.envoye) return;
    const promo = (CRM.promos || []).find(p => p.id === d.promo_id);
    const j = exParJoursRestants(promo);
    if(promo && j != null && j >= 0 && j <= 7 && !exParBonUtilise(promo)) out.push({ c, d, promo, j });
  }));
  return out.sort((a, b) => a.j - b.j);
}
function exParBientotHtml(){
  const l = exParBientot(); if(!l.length) return '';
  return `<div class="ag-sec"><h3>Bons qui vont expirer</h3><span class="crm-count">${l.length}</span></div>
    <div class="ag-list">${l.map(x => `<div class="ex-reward">
      <div class="crm-av">${agEsc(crmInitials(x.c))}</div>
      <div class="d" onclick="crmOpenClient(${x.c.id})"><b>${agEsc(x.c.name)}</b><span>${agEsc((x.promo.title || '').replace(/^Parrainage : /, ''))} · code ${agEsc(x.promo.code)}</span><span style="color:var(--yellow)">${x.j === 0 ? "Expire aujourd'hui" : 'Expire dans ' + x.j + ' jour' + (x.j > 1 ? 's' : '')} · pas encore utilisé</span></div>
      <div class="b"><button class="btn-primary" onclick="exParRappelBon(${x.c.id},${x.d.n})">Le prévenir</button></div>
    </div>`).join('')}</div>`;
}
async function exParRappelBon(cid, n){
  const c = exClient(cid); if(!c) return;
  const d = exParDonnes(c).find(x => Number(x.n) === Number(n)); if(!d) return;
  const promo = (CRM.promos || []).find(p => p.id === d.promo_id); if(!promo) return;
  const until = new Date(promo.valid_until + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const txt = `Bonjour {prenom}, petit rappel : votre cadeau de parrainage (${exParVous((promo.title || '').replace(/^Parrainage : /, ''))}) est valable jusqu'au ${until}.\nVotre code : ${promo.code}.\nPassé cette date, il sera perdu et votre compteur repartira à zéro. Réservez vite votre séance en répondant à ce message !\nHenzo Studio`;
  await crmWa(c.id, txt, 'parrainage');
}
function exParRewardsHtml(){
  if(typeof CRM === 'undefined') return '';
  const l = exParRewards(); if(!l.length) return exParBientotHtml();
  return exParBientotHtml() + `<div class="ag-sec"><h3>Récompenses à donner</h3><span class="crm-count">${l.length}</span></div>
    <div class="ag-list">${l.map(x => `<div class="ex-reward">
      <div class="crm-av">${agEsc(crmInitials(x.c))}</div>
      <div class="d" onclick="crmOpenClient(${x.c.id})"><b>${agEsc(x.c.name)}</b><span>${x.d.n} personne${x.d.n > 1 ? 's' : ''} recommandée${x.d.n > 1 ? 's' : ''} · ${agEsc(x.promo ? (x.promo.title || '').replace(/^Parrainage : /, '') : 'Bon')}</span><span>Code ${agEsc(x.d.code || (x.promo && x.promo.code) || '')}</span></div>
      <div class="b"><button class="btn-primary" onclick="exParSendReward(${x.c.id},${x.d.n})">WhatsApp</button><button class="btn-secondary" onclick="exParRewardDone(${x.c.id},${x.d.n})">C'est fait</button></div>
    </div>`).join('')}</div>`;
}
async function exParRewardDone(cid, n){
  const c = exClient(cid); if(!c) return;
  const done = exParDonnes(c).map(d => Number(d.n) === Number(n) ? { ...d, envoye: true, envoye_le: new Date().toISOString() } : d);
  const crm = Object.assign({}, c.crm || {}, { parrain_paliers: done });
  const r = await dbUpdate('clients', c.id, { crm });
  if(r) Object.assign(c, r); else c.crm = crm;
  if(typeof crmRender === 'function' && exPage() === 'clients') crmRender();
}
async function exParSendReward(cid, n){
  const c = exClient(cid); if(!c) return;
  const d = exParDonnes(c).find(x => Number(x.n) === Number(n)); if(!d) return;
  const promo = (CRM.promos || []).find(p => p.id === d.promo_id);
  const p = exParCfg().paliers.find(x => x.n === Number(n)) || { n, recompense: promo ? promo.title : '' };
  const until = promo && promo.valid_until ? new Date(promo.valid_until + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '';
  const txt = `Bonjour {prenom}, bonne nouvelle !\nGrâce à vous, ${n} personne${n > 1 ? 's ont' : ' a'} fait ${n > 1 ? 'leur' : 'sa'} séance chez Henzo Studio. Merci du fond du cœur pour votre confiance.\nPour vous remercier : ${exParVous(exParRecompense(p))}.\nVotre code : ${d.code || (promo && promo.code) || ''}${until ? " (valable jusqu'au " + until + ')' : ''}.\nAttention : s'il n'est pas utilisé avant cette date, il est perdu et votre compteur repart à zéro.\nRépondez à ce message pour réserver votre séance.\nHenzo Studio`;
  const ok = await crmWa(c.id, txt, 'parrainage');
  if(ok) await exParRewardDone(cid, n);
}
function exParMessage(c, code){
  const lien = exParLink(code);
  const pal = exParCfg().paliers.map(p => `- ${p.n} personne${p.n > 1 ? 's' : ''} : ${exParVous(exParRecompense(p))}`).join('\n');
  return `Bonjour {prenom}, merci pour votre confiance !\nRecommandez-moi : à chaque personne qui fait une séance grâce à vous, vous gagnez des cadeaux :\n${pal}\n`
    + (lien ? `Partagez ce lien à vos proches pour réserver : ${lien}\n` : `Vos proches donnent simplement votre code quand ils réservent.\n`)
    + `Chaque cadeau est valable ${exParCfg().validite} jours : s'il n'est pas utilisé à temps, il est perdu et le compteur repart à zéro.\n`
    + `Votre code : ${code}\nHenzo Studio`;
}
async function exParSend(cid){
  const c = exClient(cid); if(!c) return;
  const code = await exParEnsureCode(c); if(!code) return;
  await crmWa(c.id, exParMessage(c, code), 'parrainage');
  if(document.getElementById('crmClient')) crmOpenClient(cid);
}
async function exParCreateCode(cid){
  const c = exClient(cid); if(!c) return;
  if(await exParEnsureCode(c)){ agToast('Code de parrainage créé : ' + c.code_parrain); crmOpenClient(cid); }
}
function exParFicheHtml(c){
  if(!c) return '';
  const st = exParStats(c), code = c.code_parrain || '', lien = exParLink(code), next = exParNext(st.val.length);
  return `<h4 class="crm-h4">Parrainage</h4>
    <div class="crm-info">
      <div><span>Son code</span><b>${code ? agEsc(code) : 'Pas encore créé'}</b></div>
      <div><span>Ses filleuls</span><b>${st.val.length} validé${st.val.length > 1 ? 's' : ''}${st.att.length ? ' · ' + st.att.length + ' en attente' : ''}</b></div>
      ${next ? `<div><span>Prochaine récompense</span><b>Encore ${next.n - st.val.length} : ${agEsc(exParRecompense(next))}</b></div>` : ''}
      ${exParDonnes(c).map(d => { const pr = (CRM.promos || []).find(p => p.id === d.promo_id); if(!pr) return ''; const j = exParJoursRestants(pr); const u = exParBonUtilise(pr);
        return `<div><span>Bon ${agEsc(pr.code)}</span><b>${u ? 'Utilisé' : j != null && j >= 0 ? 'Valable encore ' + j + ' jour' + (j > 1 ? 's' : '') : 'Expiré'}</b></div>`; }).join('')}
      ${exParReset(c) ? `<div><span>Compteur remis à zéro</span><b>le ${new Date(exParReset(c) + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} (bon non utilisé à temps)${st.perdus.length ? ' · ' + st.perdus.length + ' filleul' + (st.perdus.length > 1 ? 's' : '') + ' perdu' + (st.perdus.length > 1 ? 's' : '') : ''}</b></div>` : ''}
    </div>
    ${code && lien ? `<div class="ag-list ag-share" style="margin-top:10px"><div class="ag-share-row"><div style="min-width:0"><span>Son lien de parrainage</span><b class="ag-link">${agEsc(lien)}</b></div>
      <button class="ag-ibtn" title="Copier le lien" onclick="crmCopy(exParLink('${agEsc(code)}'))">${agIcon('link', 17)}</button></div></div>` : ''}
    ${typeof otHasPage === 'function' && !otHasPage() && typeof otNoPageHtml === 'function' ? otNoPageHtml("Sans elle, pas de lien de parrainage. Le message enverra seulement son code.") : ''}
    <div class="crm-2" style="margin-top:10px">
      <button class="btn-primary" onclick="exParSend(${c.id})">Envoyer sur WhatsApp</button>
      ${code ? `<button class="btn-secondary" onclick="agCloseSheet('crmClient');CRM.view='ambassadeurs';agGoTab('clients');crmRender()">Ambassadeurs</button>` : `<button class="btn-secondary" onclick="exParCreateCode(${c.id})">Créer son code</button>`}
    </div>
    ${st.all.length ? `<div class="ag-list" style="margin-top:10px">${st.all.map(f => `<div class="crm-line" onclick="crmOpenClient(${f.id})" style="cursor:pointer"><div><b>${agEsc(f.name)}</b><span>${st.val.includes(f) ? 'Séance payée : validé' : st.perdus.includes(f) ? 'Compté avant la remise à zéro (perdu)' : 'En attente de sa séance payée'}</span></div>${st.val.includes(f) ? agIcon('check', 16) : ''}</div>`).join('')}</div>` : ''}`;
}
function exParEntryHtml(){
  if(typeof CRM === 'undefined') return '';
  const amb = (clients || []).filter(c => exParStats(c).all.length);
  const val = amb.reduce((a, c) => a + exParStats(c).val.length, 0);
  return `<div class="crm-fete" onclick="CRM.view='ambassadeurs';crmRender();window.scrollTo({top:0})"><div class="ic">${agIcon('heart')}</div><div class="d"><b>Ambassadeurs</b><span>${amb.length ? `${amb.length} client${amb.length > 1 ? 's' : ''} t'ont recommandé · ${val} filleul${val > 1 ? 's' : ''} validé${val > 1 ? 's' : ''}` : 'Fais-toi recommander par tes clients, avec des récompenses'}</span></div>${agIcon('chev', 16)}</div>`;
}
function exRenderAmbassadeurs(){
  const el = document.getElementById('crmClientsBody'); if(!el) return;
  const cfg = exParCfg();
  const rows = (clients || []).map(c => ({ c, s: exParStats(c) })).filter(x => x.s.all.length)
    .sort((a, b) => b.s.val.length - a.s.val.length || b.s.all.length - a.s.all.length || a.c.name.localeCompare(b.c.name));
  const att = (clients || []).filter(f => f.parrain_id != null && !exFilleulValide(f) && exClient(f.parrain_id));
  const val = rows.reduce((a, x) => a + x.s.val.length, 0);
  el.innerHTML = `
    <button class="ag-back" onclick="CRM.view='clients';crmRender()">${agIcon('chev', 16)} Mes clients</button>
    <div class="ag-total">
      <div class="lbl">Ambassadeurs</div>
      <div class="amt">${val} <small>filleul${val > 1 ? 's' : ''} validé${val > 1 ? 's' : ''}</small></div>
      <div class="split"><div>Ambassadeurs<b>${rows.length}</b></div><div>En attente<b>${att.length}</b></div><div>Parrainage<b>${cfg.on ? 'Activé' : 'Coupé'}</b></div></div>
    </div>
    <div class="ag-sec"><h3>Les récompenses</h3><button onclick="exParPaliersForm()">Régler</button></div>
    <div class="ag-list">${cfg.paliers.map(p => `<div class="crm-line"><div><b>${p.n} personne${p.n > 1 ? 's' : ''} recommandée${p.n > 1 ? 's' : ''}</b><span>${agEsc(exParRecompense(p))}</span></div></div>`).join('')}</div>
    <div class="ag-hint" style="margin:-8px 2px 14px">Un filleul est validé quand une de ses séances est payée. Le bon est alors créé tout seul pour le client qui l'a recommandé. Chaque bon est valable <b>${cfg.validite} jours</b> : s'il n'est pas utilisé à temps (séance ou réservation), il est perdu et le compteur du client repart à zéro.</div>
    ${exParRewardsHtml()}
    <div class="ag-sec"><h3>Classement</h3></div>
    <div class="ag-list">${rows.length ? rows.map((x, i) => { const nx = exParNext(x.s.val.length); return `
      <div class="crm-row" onclick="crmOpenClient(${x.c.id})"><div class="ex-rank">${i + 1}</div>
        <div class="d"><b>${agEsc(x.c.name)}</b><span>${x.s.val.length} validé${x.s.val.length > 1 ? 's' : ''}${x.s.att.length ? ' · ' + x.s.att.length + ' en attente' : ''}${nx ? ' · encore ' + (nx.n - x.s.val.length) + ' pour : ' + agEsc(exParRecompense(nx)) : ' · tous les paliers atteints'}</span></div>
        <div class="m">${x.s.val.length}</div></div>`; }).join('')
      : '<div class="ag-empty">Personne pour le moment. Ouvre la fiche d\'un client content et envoie-lui son lien de parrainage.</div>'}</div>
    ${att.length ? `<div class="ag-sec"><h3>En attente</h3><span class="crm-count">${att.length}</span></div>
    <div class="ag-list">${att.map(f => `<div class="crm-row" onclick="crmOpenClient(${f.id})"><div class="crm-av">${agEsc(crmInitials(f))}</div><div class="d"><b>${agEsc(f.name)}</b><span>Recommandé par ${agEsc((exClient(f.parrain_id) || {}).name || '')} · pas encore de séance payée</span></div></div>`).join('')}</div>` : ''}`;
}
function exParPaliersForm(){
  EX.palEdit = JSON.parse(JSON.stringify(exParCfg()));
  agSheet('exPal', '<div id="exPalBody"></div>');
  exParPaliersRender();
}
function exParPaliersRead(){
  const box = document.getElementById('exPalBody'); if(!box || !EX.palEdit) return;
  const on = document.getElementById('exPalOn'); if(on) EX.palEdit.on = on.checked;
  const va = document.getElementById('exPalVal'); if(va) EX.palEdit.validite = Math.max(1, parseInt(va.value) || 30);
  box.querySelectorAll('.ex-palier').forEach((row, i) => {
    const p = EX.palEdit.paliers[i]; if(!p) return;
    p.n = Math.max(1, parseInt(row.querySelector('[data-k=n]').value) || 1);
    p.recompense = row.querySelector('[data-k=r]').value.trim();
    p.kind = row.querySelector('[data-k=k]').value;
    p.value = parseFloat(row.querySelector('[data-k=v]').value) || 0;
  });
}
function exParPaliersRender(){
  const box = document.getElementById('exPalBody'); if(!box) return;
  const E = EX.palEdit;
  box.innerHTML = `<h3>Récompenses de parrainage</h3>
    <div class="ot-nt" style="margin-top:0">${typeof otSwitch === 'function' ? otSwitch('exPalOn', E.on, 'Parrainage activé', 'Les bons sont créés tout seuls') : `<label><input type="checkbox" id="exPalOn" ${E.on ? 'checked' : ''}> Parrainage activé</label>`}</div>
    <label>Durée de validité des bons (jours)</label>
    <input id="exPalVal" type="number" min="1" inputmode="numeric" value="${E.validite || 30}">
    <div class="ag-hint" style="margin-top:4px">Si le client n'utilise pas son bon (séance ou réservation) avant la fin, le bon est perdu et son compteur repart à zéro.</div>
    <div class="ag-hint">Pour chaque palier : le nombre de personnes recommandées (avec une séance payée) et ce que ton client gagne.</div>
    <div style="margin-top:10px">${E.paliers.map((p, i) => `<div class="ex-palier">
      <input data-k="n" type="number" min="1" inputmode="numeric" value="${p.n}" title="Nombre de personnes">
      <input data-k="r" value="${agEsc(p.recompense)}" placeholder="Ex : -10 % sur sa prochaine séance">
      <div class="full"><select data-k="k"><option value="percent" ${p.kind === 'percent' ? 'selected' : ''}>Réduction en %</option><option value="amount" ${p.kind === 'amount' ? 'selected' : ''}>Réduction en FCFA</option><option value="offert" ${p.kind === 'offert' ? 'selected' : ''}>Séance offerte</option></select>
      <input data-k="v" type="number" inputmode="decimal" value="${p.value}" placeholder="Valeur"><button onclick="exParPaliersRead();EX.palEdit.paliers.splice(${i},1);exParPaliersRender()">×</button></div>
    </div>`).join('')}</div>
    <button class="btn-secondary" onclick="exParPaliersRead();EX.palEdit.paliers.push({n:(EX.palEdit.paliers.slice(-1)[0]||{n:0}).n+1,recompense:'',kind:'percent',value:10});exParPaliersRender()">+ Ajouter un palier</button>
    <button class="btn-primary" style="margin-top:10px" onclick="exParPaliersSave()">Enregistrer</button>
    <button class="crm-link" onclick="EX.palEdit=JSON.parse(JSON.stringify(EX_PAR_DEF));exParPaliersRender()">Remettre les récompenses de base</button>`;
}
async function exParPaliersSave(){
  exParPaliersRead();
  const E = EX.palEdit;
  E.paliers = E.paliers.filter(p => p.n > 0).sort((a, b) => a.n - b.n);
  if(!E.paliers.length){ agAlert('Garde au moins un palier.'); return; }
  if(new Set(E.paliers.map(p => p.n)).size !== E.paliers.length){ agAlert('Deux paliers ont le même nombre de personnes.'); return; }
  if(!await exSavePrefs({ parrainage: { on: E.on, validite: Math.max(1, parseInt(E.validite) || 30), paliers: E.paliers } })) return;
  agCloseSheet('exPal'); agToast('Récompenses enregistrées');
  await exParCheck();
  if(typeof crmRender === 'function') crmRender();
}

// ============================================================
// 2. CHECKLIST AVANT SEANCE
// ============================================================
const EX_CK_DEF = { base: [
  { c: 'Matériel', t: 'Batteries chargées' }, { c: 'Matériel', t: 'Cartes mémoire vides' }, { c: 'Matériel', t: 'Objectifs propres' },
  { c: 'Matériel', t: 'Flash et piles' }, { c: 'Matériel', t: 'Trépied' }, { c: 'Matériel', t: 'Réflecteur' },
  { c: 'Lieu', t: 'Lieu confirmé' }, { c: 'Lieu', t: 'Itinéraire prévu' },
  { c: 'Client', t: 'Rappel envoyé' }, { c: 'Client', t: 'Tenues confirmées' }, { c: 'Client', t: 'Acompte reçu' },
  { c: 'Studio', t: 'Fond installé' }, { c: 'Studio', t: 'Lumière testée' }, { c: 'Studio', t: 'Clim allumée' }
], types: {} };
const EX_CK_CATS = ['Matériel', 'Lieu', 'Client', 'Studio', 'Autre'];
function exCkModel(){
  const m = EX.prefs.checklist || {};
  return { base: Array.isArray(m.base) ? m.base : EX_CK_DEF.base, types: (m.types && typeof m.types === 'object') ? m.types : {} };
}
function exCkItemsFor(type){
  const m = exCkModel();
  return [...m.base, ...((type && m.types[type]) || [])].map(x => ({ c: x.c || 'Autre', t: x.t, done: false }));
}
function exCkItems(s){ return s && s.checklist && Array.isArray(s.checklist.items) ? s.checklist.items : exCkItemsFor(s && s.type); }
function exCkUpcoming(s){
  if(!s || !s.date || exCancelled(s) || s.status === 'shoote') return false;
  const t = exNow(); t.setHours(0, 0, 0, 0);
  return new Date(s.date) >= t;
}
function exChecklistBtn(s){
  if(!exCkUpcoming(s)) return '';
  const it = exCkItems(s), d = it.filter(x => x.done).length;
  return `<button class="ex-ck-btn ${it.length && d === it.length ? 'ok' : ''}" onclick="event.stopPropagation();exCkOpen(${s.id})">${agIcon('check', 14)} Checklist ${d}/${it.length}</button>`;
}
function exCkOpen(id){
  EX.ckId = id;
  agSheet('exCk', '<div id="exCkBody"></div>');
  exCkRender();
}
function exCkRender(){
  const box = document.getElementById('exCkBody'); if(!box) return;
  const s = (shoots || []).find(x => x.id === EX.ckId); if(!s){ agCloseSheet('exCk'); return; }
  const it = exCkItems(s), d = it.filter(x => x.done).length, c = exClient(s.client_id);
  const cats = [...new Set(it.map(x => x.c || 'Autre'))];
  box.innerHTML = `<h3>Checklist avant séance</h3>
    <div class="ag-hint" style="margin-top:0">${agEsc(s.type || 'Séance')}${c ? ' · ' + agEsc(c.name) : ''} · ${new Date(s.date).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</div>
    <div class="ex-prog"><i style="width:${it.length ? Math.round(d / it.length * 100) : 0}%"></i></div>
    <div class="ag-hint" style="margin-top:2px"><b>${d}/${it.length}</b> prêt${d > 1 ? 's' : ''}${it.length && d === it.length ? ' · tout est prêt !' : ''}</div>
    ${cats.map(cat => `<div class="ex-ck-cat">${agEsc(cat)}</div><div class="ag-list" style="margin-bottom:6px">${it.map((x, i) => (x.c || 'Autre') !== cat ? '' : `
      <label class="ex-ck-item ${x.done ? 'done' : ''}"><input type="checkbox" ${x.done ? 'checked' : ''} onchange="exCkToggle(${i})"><span>${agEsc(x.t)}</span><button title="Retirer" onclick="event.preventDefault();exCkRemove(${i})">×</button></label>`).join('')}</div>`).join('')}
    <label>Ajouter un point pour cette séance</label>
    <div class="crm-row-in"><input id="exCkNew" placeholder="Ex : ballons dorés, gâteau"><button class="btn-secondary" onclick="exCkAdd()">Ajouter</button></div>
    <div class="crm-2" style="margin-top:14px"><button class="btn-secondary" onclick="exCkReset()">Tout décocher</button><button class="btn-secondary" onclick="exCkModelOpen('${agEsc(s.type || '')}')">Modifier mon modèle</button></div>
    <div class="ag-hint">Tu reçois un rappel la veille pour la vérifier (réglable dans Notifications).</div>`;
}
async function exCkSave(items){
  const s = (shoots || []).find(x => x.id === EX.ckId); if(!s) return;
  const checklist = { items, maj: new Date().toISOString() };
  s.checklist = checklist; exCkRender();
  const r = await dbUpdate('shoots', s.id, { checklist });
  if(r) s.checklist = r.checklist || checklist;
  if(typeof renderShoots === 'function') try { renderShoots(); } catch(e){}
}
function exCkCur(){ const s = (shoots || []).find(x => x.id === EX.ckId); return exCkItems(s).map(x => ({ ...x })); }
function exCkToggle(i){ const l = exCkCur(); if(!l[i]) return; l[i].done = !l[i].done; exCkSave(l); }
function exCkRemove(i){ const l = exCkCur(); l.splice(i, 1); exCkSave(l); }
function exCkAdd(){ const v = (document.getElementById('exCkNew') || {}).value || ''; if(!v.trim()) return; const l = exCkCur(); l.push({ c: 'Pour cette séance', t: v.trim(), done: false }); exCkSave(l); }
async function exCkReset(){ const l = exCkCur().map(x => ({ ...x, done: false })); exCkSave(l); }

function exCkModelOpen(type){
  EX.ckEdit = JSON.parse(JSON.stringify(exCkModel()));
  EX.ckType = '';
  EX.ckTypeHint = type || '';
  agSheet('exCkM', '<div id="exCkMBody"></div>');
  exCkModelRender();
}
function exCkModelRender(){
  const box = document.getElementById('exCkMBody'); if(!box) return;
  const E = EX.ckEdit, T = EX.ckType;
  const types = [...new Set([...(shoots || []).map(s => s.type).filter(Boolean), ...Object.keys(E.types), EX.ckTypeHint].filter(Boolean))].sort();
  const list = T ? (E.types[T] || []) : E.base;
  const cats = [...new Set([...EX_CK_CATS, ...list.map(x => x.c)])];
  box.innerHTML = `<h3>Mon modèle de checklist</h3>
    <div class="ag-hint" style="margin-top:0">La liste de base sert pour toutes les séances. Tu peux ajouter des points en plus pour un type de séance.</div>
    <label>Pour</label>
    <select onchange="EX.ckType=this.value;exCkModelRender()"><option value="">Toutes les séances (liste de base)</option>${types.map(t => `<option value="${agEsc(t)}" ${t === T ? 'selected' : ''}>En plus pour : ${agEsc(t)}</option>`).join('')}</select>
    ${cats.filter(cat => list.some(x => x.c === cat)).map(cat => `<div class="ex-ck-cat">${agEsc(cat)}</div><div class="ag-list" style="margin-bottom:6px">${list.map((x, i) => x.c !== cat ? '' : `
      <div class="ex-ck-item"><span>${agEsc(x.t)}</span><button title="Retirer" onclick="exCkModelDel(${i})">×</button></div>`).join('')}</div>`).join('') || '<div class="ag-list" style="margin-top:10px"><div class="ag-empty">Aucun point ici pour le moment.</div></div>'}
    <label>Ajouter un point</label>
    <div class="crm-row-in"><select id="exCkMCat" style="max-width:130px;margin:0">${cats.map(c => `<option>${agEsc(c)}</option>`).join('')}</select><input id="exCkMNew" placeholder="Ex : Batterie de secours"><button class="btn-secondary" onclick="exCkModelAdd()">Ajouter</button></div>
    <button class="btn-primary" style="margin-top:14px" onclick="exCkModelSave()">Enregistrer le modèle</button>
    <button class="crm-link" onclick="EX.ckEdit=JSON.parse(JSON.stringify(EX_CK_DEF));EX.ckType='';exCkModelRender()">Remettre la liste de base</button>
    <div class="ag-hint">Les séances déjà commencées gardent leur liste. Le modèle sert pour les prochaines.</div>`;
}
function exCkModelList(){ const E = EX.ckEdit; if(!EX.ckType) return E.base; return (E.types[EX.ckType] = E.types[EX.ckType] || []); }
function exCkModelDel(i){ exCkModelList().splice(i, 1); if(EX.ckType && !EX.ckEdit.types[EX.ckType].length) delete EX.ckEdit.types[EX.ckType]; exCkModelRender(); }
function exCkModelAdd(){
  const t = document.getElementById('exCkMNew').value.trim(); if(!t) return;
  exCkModelList().push({ c: document.getElementById('exCkMCat').value || 'Autre', t });
  exCkModelRender();
}
async function exCkModelSave(){
  if(!await exSavePrefs({ checklist: EX.ckEdit })) return;
  agCloseSheet('exCkM'); agToast('Modèle de checklist enregistré');
  if(document.getElementById('exCk')) exCkRender();
  if(typeof renderShoots === 'function') try { renderShoots(); } catch(e){}
}

// ============================================================
// 3. MATERIEL ET AMORTISSEMENT
// ============================================================
const EX_MAT_CATS = ['Boîtier', 'Objectif', 'Lumière / flash', 'Trépied / support', 'Fond / décor', 'Ordinateur / stockage', 'Vidéo / drone', 'Autre'];
const EX_MAT_COFFRE = 'Renouvellement matériel';
async function exMatLoad(){
  try {
    const { data, error } = await sb.from('materiel').select('*').order('created_at', { ascending: true });
    if(error) throw error;
    EX.mat = data || [];
  } catch(e){ console.warn('materiel', e); EX.mat = EX.mat || []; }
  EX.matLoaded = true;
}
function exMatCalc(m, now){
  now = now || exNow();
  const prix = Number(m.prix) || 0, rev = Math.min(prix, Number(m.valeur_revente) || 0), duree = Math.max(1, parseInt(m.duree_mois) || 36);
  const usure = Math.max(0, prix - rev) / duree;
  const achat = new Date((m.date_achat ? m.date_achat + 'T12:00:00' : m.created_at) || now);
  const fin = exAddMonths(achat, duree);
  const mois = Math.max(0, (now - achat) / (30.4375 * 864e5));
  const valeur = Math.max(rev, prix - usure * mois);
  return { usure, fin, valeur, mois, duree };
}
function exMatSeancesMois(now){
  now = now || exNow();
  const from = exAddMonths(now, -3);
  const n = (shoots || []).filter(s => s.date && !exCancelled(s) && new Date(s.date) >= from && new Date(s.date) <= now).length;
  return Math.max(1, n / 3);
}
function exMatTotals(now){
  const act = (EX.mat || []).filter(m => m.actif !== false);
  const mois = act.reduce((a, m) => a + exMatCalc(m, now).usure, 0);
  const sm = exMatSeancesMois(now);
  return { mois, seance: mois / sm, seancesMois: sm, valeur: act.reduce((a, m) => a + exMatCalc(m, now).valeur, 0), achat: act.reduce((a, m) => a + (Number(m.prix) || 0), 0), n: act.length };
}
function exMatCoffre(){ return (coffres || []).find(c => c.name === EX_MAT_COFFRE && (typeof agIsCoffre !== 'function' || agIsCoffre(c))); }
function exMatDate(d){ return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); }
async function exRenderMateriel(){
  const el = document.getElementById('mtBody'); if(!el) return;
  if(!EX.matLoaded){ el.innerHTML = '<div class="ag-empty">Chargement...</div>'; await exMatLoad(); }
  const now = exNow(), T = exMatTotals(now), cof = exMatCoffre();
  const act = EX.mat.filter(m => m.actif !== false).sort((a, b) => exMatCalc(a, now).fin - exMatCalc(b, now).fin);
  const off = EX.mat.filter(m => m.actif === false);
  const row = m => { const k = exMatCalc(m, now), left = (k.fin - now) / (30.4375 * 864e5);
    const cls = m.actif === false ? '' : left < 0 ? 'ex-mat-late' : left < 6 ? 'ex-mat-warn' : '';
    return `<div class="crm-row ${m.actif === false ? 'off' : ''}" onclick="exMatForm(${m.id})"><div class="crm-av">${agIcon('camera', 17)}</div>
      <div class="d"><b>${agEsc(m.nom)}</b><span>${agEsc(m.categorie || 'Matériel')} · ${agF(m.prix)}${m.actif === false ? ' · ' + agEsc(m.etat || 'retiré') : ` · usure ${agF(k.usure)}/mois`}</span>
      ${m.actif === false ? '' : `<span class="${cls}">À remplacer vers ${exMatDate(k.fin)}${left < 0 ? ' (dépassé)' : ''}</span>`}</div>
      <div class="m">${m.actif === false ? '' : agF(k.valeur)}</div></div>`; };
  el.innerHTML = `
    <div class="ag-total">
      <div class="lbl">Mon matériel</div>
      <div class="amt">${agN(T.valeur)} <small>FCFA aujourd'hui</small></div>
      <div class="split"><div>À mettre de côté<b>${agF(T.mois)} / mois</b></div><div>Par séance<b>${agF(T.seance)}</b></div><div>Objets<b>${T.n}</b></div></div>
    </div>
    ${T.n ? `<div class="ag-hint" style="margin:-6px 2px 12px">Calcul : usure de chaque objet = (prix - revente) / durée. Par séance : ${agF(T.mois)} divisé par ${String(Math.round(T.seancesMois * 10) / 10).replace('.', ',')} séance${T.seancesMois > 1 ? 's' : ''} par mois (moyenne des 3 derniers mois).</div>` : ''}
    ${cof ? `<div class="crm-fete" onclick="agGoTab('coffres')"><div class="ic">${agIcon('lock')}</div><div class="d"><b>Coffre ${agEsc(EX_MAT_COFFRE)} : ${agF(cof.current)}</b><span>${T.mois > 0 ? 'Conseil : verse ' + agF(Math.ceil(T.mois / 100) * 100) + ' chaque mois' : 'Ajoute ton matériel pour connaître le montant conseillé'}</span></div>${agIcon('chev', 16)}</div>`
      : `<div class="crm-fete" style="cursor:default"><div class="ic">${agIcon('lock')}</div><div class="d"><b>Prépare le remplacement de ton matériel</b><span>${T.mois > 0 ? 'Mets ' + agF(Math.ceil(T.mois / 100) * 100) + ' de côté chaque mois dans un coffre à part.' : 'Un coffre à part pour racheter ton matériel le jour où il s\'use.'}</span></div></div>
         <button class="btn-secondary" style="margin-top:8px" onclick="exMatCoffreCreate()">Créer le coffre ${agEsc(EX_MAT_COFFRE)}</button>`}
    <button class="btn-primary" style="width:100%;margin:14px 0" onclick="exMatForm(null)">+ Ajouter du matériel</button>
    <div class="ag-sec"><h3>En service</h3>${act.length ? `<span class="crm-count">${act.length}</span>` : ''}</div>
    <div class="ag-list">${act.length ? act.map(row).join('') : '<div class="ag-empty">Ajoute ton boîtier, tes objectifs, tes flashs... L\'app calcule combien garder de côté pour les remplacer.</div>'}</div>
    ${off.length ? `<div class="ag-sec"><h3>Vendu ou hors service</h3><span class="crm-count">${off.length}</span></div><div class="ag-list">${off.map(row).join('')}</div>` : ''}`;
}
async function exMatCoffreCreate(){
  if(exMatCoffre()){ agToast('Le coffre existe déjà'); return exRenderMateriel(); }
  const c = await dbInsert('goals', { name: EX_MAT_COFFRE, goal: 999999999, current: 0, goal_type: 'money', unit: 'FCFA', emoji: '📷', type_coffre: 'entreprise',
    description: 'Pour racheter le matériel quand il s\'use', why: 'Remplacer mon matériel sans stress', purpose: 'Renouveler le matériel', urgency: 'moyen' });
  if(!c) return;
  coffres.unshift(c);
  if(typeof refreshAll === 'function') try { refreshAll(); } catch(e){}
  const T = exMatTotals();
  agToast('Coffre créé' + (T.mois > 0 ? ' : verse ' + agF(Math.ceil(T.mois / 100) * 100) + ' par mois' : ''));
  exRenderMateriel();
}
function exMatForm(id){
  const m = id ? EX.mat.find(x => x.id === id) : null;
  const k = m ? exMatCalc(m) : null;
  agSheet('exMat', `<h3>${m ? 'Modifier' : 'Ajouter du matériel'}</h3>
    <label>Nom</label><input id="exMNom" value="${agEsc(m ? m.nom : '')}" placeholder="Ex : Canon R6, Godox AD200">
    <label>Catégorie</label><select id="exMCat">${EX_MAT_CATS.map(c => `<option ${m && m.categorie === c ? 'selected' : ''}>${agEsc(c)}</option>`).join('')}</select>
    <label>Prix d'achat (FCFA)</label><input id="exMPrix" type="number" inputmode="decimal" value="${m ? Number(m.prix) || '' : ''}" placeholder="Ex : 1200000">
    <label>Date d'achat</label><input id="exMDate" type="date" value="${m && m.date_achat ? String(m.date_achat).slice(0, 10) : new Date().toISOString().slice(0, 10)}">
    <label>Durée de vie prévue (mois)</label><input id="exMDuree" type="number" inputmode="numeric" value="${m ? m.duree_mois || 36 : 36}">
    <div class="ag-hint" style="margin-top:4px">36 mois = 3 ans. Un boîtier : 36 à 48 mois. Un flash ou des piles : 18 à 24 mois.</div>
    <label>Valeur de revente à la fin (FCFA)</label><input id="exMRev" type="number" inputmode="decimal" value="${m ? Number(m.valeur_revente) || 0 : 0}">
    <label>État</label><select id="exMEtat">${['neuf', 'bon', 'usé', 'à réparer'].map(e => `<option ${m && m.etat === e ? 'selected' : ''}>${e}</option>`).join('')}</select>
    <label>Notes</label><input id="exMNotes" value="${agEsc(m ? m.notes || '' : '')}" placeholder="Numéro de série, garantie...">
    ${k ? `<div class="crm-info" style="margin-top:12px"><div><span>Usure par mois</span><b>${agF(k.usure)}</b></div><div><span>Valeur aujourd'hui</span><b>${agF(k.valeur)}</b></div><div><span>À remplacer vers</span><b>${exMatDate(k.fin)}</b></div></div>` : ''}
    <button class="btn-primary" style="margin-top:12px" onclick="exMatSave(${m ? m.id : 'null'})">Enregistrer</button>
    ${m ? (m.actif === false
      ? `<div class="crm-2" style="margin-top:8px"><button class="btn-secondary" onclick="exMatSet(${m.id},{actif:true,etat:'bon'})">Remettre en service</button><button class="btn-danger" style="padding:12px" onclick="exMatDelete(${m.id})">Supprimer</button></div>`
      : `<div class="crm-2" style="margin-top:8px"><button class="btn-secondary" onclick="exMatSet(${m.id},{actif:false,etat:'vendu'})">Marquer vendu</button><button class="btn-secondary" onclick="exMatSet(${m.id},{actif:false,etat:'hors service'})">Hors service</button></div>`) : ''}`);
}
async function exMatSave(id){
  const v = k => document.getElementById(k).value.trim();
  const nom = v('exMNom'); if(!nom){ agAlert('Donne un nom à ce matériel.'); return; }
  const prix = parseFloat(v('exMPrix')) || 0;
  const data = { nom, categorie: v('exMCat'), prix, date_achat: v('exMDate') || null, duree_mois: Math.max(1, parseInt(v('exMDuree')) || 36),
    valeur_revente: Math.min(prix, Math.max(0, parseFloat(v('exMRev')) || 0)), etat: v('exMEtat'), notes: v('exMNotes') || null };
  if(id){ const r = await dbUpdate('materiel', id, data); if(!r) return; Object.assign(EX.mat.find(x => x.id === id), r); }
  else { const r = await dbInsert('materiel', { ...data, actif: true }); if(!r) return; EX.mat.push(r); }
  agCloseSheet('exMat'); agToast('Matériel enregistré'); exRenderMateriel();
}
async function exMatSet(id, patch){
  const r = await dbUpdate('materiel', id, patch); if(!r) return;
  Object.assign(EX.mat.find(x => x.id === id), r);
  agCloseSheet('exMat'); agToast(patch.actif === false ? 'Retiré de la liste en service' : 'Remis en service'); exRenderMateriel();
}
async function exMatDelete(id){
  if(!await agConfirm('Supprimer ce matériel ?\nIl disparaît de la liste pour toujours. Pour le garder en mémoire, laisse-le dans "Vendu ou hors service".')) return;
  if(!await dbDelete('materiel', id)) return;
  EX.mat = EX.mat.filter(x => x.id !== id);
  agCloseSheet('exMat'); agToast('Supprimé'); exRenderMateriel();
}
// Petite ligne d'info dans la fenetre "Paiement reçu" (aucun calcul de paiement touché)
function exMatTip(){
  const m = document.getElementById('paiementSeanceModal'); if(!m || m.querySelector('.ex-tip')) return;
  const T = exMatTotals(); if(!(T.seance > 0)) return;
  const btn = m.querySelector('#paiementValiderBtn'); if(!btn) return;
  btn.insertAdjacentHTML('beforebegin', `<div class="ex-tip">Conseil : garde <b>${agF(Math.ceil(T.seance / 100) * 100)}</b> pour ton matériel${exMatCoffre() ? ' (coffre ' + agEsc(EX_MAT_COFFRE) + ')' : ''}.</div>`);
}

// ============================================================
// 4. BILAN DU MOIS
// ============================================================
const EX_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
function exMoisDe(m){ const n = EX_MOIS[m]; return (/^[aeiouyéèê]/i.test(n) ? "d'" : 'de ') + n; }
function exInMonth(d, y, m){
  if(!d) return false;
  const s = String(d), dt = s.length === 10 ? new Date(s + 'T12:00:00') : new Date(s);
  return !isNaN(dt) && dt.getFullYear() === y && dt.getMonth() === m;
}
function exPrevMonth(y, m){ return m === 0 ? [y - 1, 11] : [y, m - 1]; }
async function exPostsLoad(force){
  if(EX.posts && !force) return EX.posts;
  try { const { data, error } = await sb.from('mk_posts').select('*'); if(error) throw error; EX.posts = data || []; }
  catch(e){ EX.posts = []; }
  return EX.posts;
}
function exBilanCalc(y, m, opt){
  opt = opt || {};
  const posts = opt.posts || EX.posts || [];
  const tx = (txs || []).filter(t => !t.cancelled && exInMonth(t.date, y, m));
  const sum = l => l.reduce((a, t) => a + (Number(t.amount) || 0), 0);
  const rev = tx.filter(t => t.type === 'revenu'), dep = tx.filter(t => t.type === 'depense');
  const tr = tx.filter(t => t.type === 'transfert' && t.category !== 'Ajustement');
  const entrees = sum(rev), depenses = sum(dep);
  const epargne = sum(tr.filter(t => t.to_goal_id && !t.goal_id));
  const retraits = sum(tr.filter(t => t.goal_id && !t.to_goal_id));
  const depCat = {};
  dep.forEach(t => { const k = t.category || 'Autre'; depCat[k] = (depCat[k] || 0) + (Number(t.amount) || 0); });
  const ss = (shoots || []).filter(s => !exCancelled(s) && exInMonth(s.date, y, m));
  const parType = {};
  ss.forEach(s => { const k = s.type || 'Séance'; parType[k] = (parType[k] || 0) + 1; });
  const annulees = (shoots || []).filter(s => exCancelled(s) && exInMonth(s.date, y, m)).length;
  const nouveaux = (clients || []).filter(c => exInMonth(c.created_at, y, m) && (typeof estClient !== 'function' || estClient(c)));
  const sources = {};
  nouveaux.forEach(c => { const k = (typeof crmSrcLabel === 'function' ? crmSrcLabel(c.source) : c.source) || 'Non renseigné'; sources[k] = (sources[k] || 0) + 1; });
  const filleuls = nouveaux.filter(c => c.parrain_id != null);
  const av = (typeof galAvis !== 'undefined' && Array.isArray(galAvis) ? galAvis : []).filter(a => exInMonth(a.created_at, y, m));
  const pub = (posts || []).filter(p => p.status === 'publie' && exInMonth(p.published_at || p.date, y, m));
  const stats = {}, reseaux = {};
  pub.forEach(p => {
    if(p.network) reseaux[p.network] = (reseaux[p.network] || 0) + 1;
    const st = p.stats && typeof p.stats === 'object' ? p.stats : {};
    Object.entries(st).forEach(([k, v]) => { const n = Number(v); if(isFinite(n) && v !== '' && v !== null && typeof v !== 'boolean') stats[k] = (stats[k] || 0) + n; });
  });
  const all = coffres || [];
  const cof = all.filter(c => typeof agIsCoffre === 'function' ? agIsCoffre(c) : (c.goal_type || 'money') === 'money').map(c => {
    const verse = sum(tr.filter(t => Number(t.to_goal_id) === Number(c.id))), retire = sum(tr.filter(t => Number(t.goal_id) === Number(c.id)));
    return { id: c.id, name: c.name, current: Number(c.current) || 0, verse, retire };
  }).filter(c => c.verse || c.retire || c.current);
  const obj = all.filter(c => !(typeof agIsCoffre === 'function' ? agIsCoffre(c) : false) && Number(c.goal) > 0)
    .map(c => ({ id: c.id, name: c.name, current: Number(c.current) || 0, goal: Number(c.goal) || 0, unit: c.unit || '', pct: Math.min(100, Math.round((Number(c.current) || 0) / Number(c.goal) * 100)) }));
  const b = {
    y, m, entrees, depenses, epargne, retraits, net: entrees - depenses,
    depCat: Object.entries(depCat).sort((a, b) => b[1] - a[1]),
    seances: ss.length, parType: Object.entries(parType).sort((a, b) => b[1] - a[1]), annulees, facture: ss.reduce((a, s) => a + (Number(s.price) || 0), 0),
    nouveaux: nouveaux.length, sources: Object.entries(sources).sort((a, b) => b[1] - a[1]), filleuls: filleuls.length,
    avis: av.length, avisMoy: av.length ? av.reduce((a, x) => a + (Number(x.note) || 0), 0) / av.length : 0,
    posts: pub.length, stats: Object.entries(stats).sort((a, b) => b[1] - a[1]), reseaux: Object.entries(reseaux).sort((a, b) => b[1] - a[1]),
    coffres: cof, objectifs: obj
  };
  if(typeof svBilan === 'function') Object.assign(b, svBilan(y, m));
  if(!opt.noPrev){ const [py, pm] = exPrevMonth(y, m); b.prev = exBilanCalc(py, pm, { posts, noPrev: true }); }
  return b;
}
function exDiff(cur, prev, money, invert){
  if(prev == null) return '';
  const d = cur - prev;
  if(!d) return '<em>pareil que le mois d\'avant</em>';
  const good = invert ? d < 0 : d > 0;
  return `<em class="${good ? 'ex-up' : 'ex-down'}">${d > 0 ? '+' : '-'}${money ? agF(Math.abs(d)) : Math.abs(d)} vs ${EX_MOIS[exPrevMonth(EX.bilan ? EX.bilan.y : 0, EX.bilan ? EX.bilan.m : 0)[1]]}</em>`;
}
async function exBilanOpen(y, m){
  if(y == null){ const n = exNow(); if(n.getDate() <= 7){ [y, m] = exPrevMonth(n.getFullYear(), n.getMonth()); } else { y = n.getFullYear(); m = n.getMonth(); } }
  agSheet('exBilan', '<div id="exBilanBody"><div class="ag-empty">Calcul du bilan...</div></div>');
  await exPostsLoad();
  EX.bilan = exBilanCalc(y, m);
  exBilanRender();
}
function exBilanNav(d){ let y = EX.bilan.y, m = EX.bilan.m + d; if(m < 0){ m = 11; y--; } if(m > 11){ m = 0; y++; } EX.bilan = exBilanCalc(y, m); exBilanRender(); }
function exBilanRender(){
  const el = document.getElementById('exBilanBody'); const b = EX.bilan; if(!el || !b) return;
  const p = b.prev || {}, n = exNow(), isCur = b.y === n.getFullYear() && b.m === n.getMonth();
  const kpi = (v, l, d) => `<div><b>${v}</b><span>${l}</span>${d || ''}</div>`;
  const pdf = !!(window.jspdf && window.jspdf.jsPDF);
  el.innerHTML = `
    <div class="ex-bilan-h"><button class="prev" onclick="exBilanNav(-1)" title="Mois d'avant">${agIcon('chev', 16)}</button><h3>Bilan ${exMoisDe(b.m)} ${b.y}</h3><button onclick="exBilanNav(1)" ${isCur ? 'disabled' : ''} title="Mois suivant">${agIcon('chev', 16)}</button></div>
    ${isCur ? '<div class="ag-hint" style="margin-top:0">Mois en cours : les chiffres bougent encore.</div>' : ''}
    <h4 class="crm-h4">Argent</h4>
    <div class="ex-kpis">
      ${kpi(agF(b.entrees), 'Argent entré', exDiff(b.entrees, p.entrees, true))}
      ${kpi(agF(b.depenses), 'Dépenses', exDiff(b.depenses, p.depenses, true, true))}
      ${kpi(agF(b.epargne), 'Mis en épargne (vers coffres)', exDiff(b.epargne, p.epargne, true))}
      ${kpi(`<span class="${b.net < 0 ? 'ex-down' : 'ex-up'}" style="font-size:16px;color:inherit">${b.net < 0 ? '-' : ''}${agF(Math.abs(b.net))}</span>`, 'Net (entrées - dépenses)', exDiff(b.net, p.net, true))}
    </div>
    ${b.retraits ? `<div class="ag-hint">Retiré des coffres : ${agF(b.retraits)}</div>` : ''}
    ${b.depCat.length ? `<div class="ag-list" style="margin-top:8px">${b.depCat.slice(0, 4).map(([k, v]) => `<div class="crm-line"><div><b>${agEsc(k)}</b></div><b>${agF(v)}</b></div>`).join('')}</div>` : ''}
    <h4 class="crm-h4">Séances</h4>
    <div class="ex-kpis">${kpi(b.seances, 'séance' + (b.seances > 1 ? 's' : ''), exDiff(b.seances, p.seances))}${kpi(agF(b.facture), 'Facturé', exDiff(b.facture, p.facture, true))}</div>
    ${b.parType.length ? `<div class="ag-list" style="margin-top:8px">${b.parType.map(([k, v]) => `<div class="crm-line"><div><b>${agEsc(k)}</b></div><b>${v}</b></div>`).join('')}</div>` : ''}
    ${b.annulees ? `<div class="ag-hint">${b.annulees} séance${b.annulees > 1 ? 's' : ''} annulée${b.annulees > 1 ? 's' : ''}</div>` : ''}
    <h4 class="crm-h4">Clients</h4>
    <div class="ex-kpis">${kpi(b.nouveaux, 'nouveau' + (b.nouveaux > 1 ? 'x' : '') + ' client' + (b.nouveaux > 1 ? 's' : ''), exDiff(b.nouveaux, p.nouveaux))}${kpi(b.filleuls, 'grâce au parrainage', exDiff(b.filleuls, p.filleuls))}</div>
    ${b.dettesDues || b.dettesRecup ? `<div class="ag-hint">Dettes : ${agF(b.dettesDues || 0)} encore dues, ${agF(b.dettesRecup || 0)} récupérées ce mois</div>` : ''}
    ${b.sources.length ? `<div class="ag-list" style="margin-top:8px">${b.sources.map(([k, v]) => `<div class="crm-line"><div><b>${agEsc(k)}</b><span>comment ils t'ont connu</span></div><b>${v}</b></div>`).join('')}</div>` : ''}
    <h4 class="crm-h4">Avis et publications</h4>
    <div class="ex-kpis">${kpi(b.avis ? b.avis + ' · ' + String(b.avisMoy.toFixed(1)).replace('.', ',') + '/5' : '0', 'avis reçu' + (b.avis > 1 ? 's' : ''), exDiff(b.avis, p.avis))}${kpi(b.posts, 'publication' + (b.posts > 1 ? 's' : ''), exDiff(b.posts, p.posts))}</div>
    ${b.stats.length || b.reseaux.length ? `<div class="ag-list" style="margin-top:8px">${b.reseaux.map(([k, v]) => `<div class="crm-line"><div><b>${agEsc(k)}</b></div><b>${v} post${v > 1 ? 's' : ''}</b></div>`).join('')}${b.stats.map(([k, v]) => `<div class="crm-line"><div><span>${agEsc(k.charAt(0).toUpperCase() + k.slice(1))}</span></div><b>${agN(v)}</b></div>`).join('')}</div>` : ''}
    ${b.coffres.length || b.objectifs.length ? `<h4 class="crm-h4">Coffres et objectifs</h4><div class="ag-list">
      ${b.coffres.map(c => `<div class="crm-line"><div><b>${agEsc(c.name)}</b><span>${c.verse ? '+' + agF(c.verse) + ' ce mois' : 'rien versé ce mois'}${c.retire ? ' · -' + agF(c.retire) + ' retiré' : ''}</span></div><b>${agF(c.current)}</b></div>`).join('')}
      ${b.objectifs.map(o => `<div class="crm-line"><div style="flex:1"><b>${agEsc(o.name)}</b><div class="ex-bar"><i style="width:${o.pct}%"></i></div></div><b>${o.pct} %</b></div>`).join('')}</div>` : ''}
    <div id="exBilanAI" class="ex-ai">${EX.bilanAI && EX.bilanAI.k === b.y + '-' + b.m ? crmMd(EX.bilanAI.t) : ''}</div>
    <button class="btn-primary" style="margin-top:12px" id="exBilanAiBtn" onclick="exBilanAI()">Conseils de l'IA</button>
    <div class="crm-2" style="margin-top:8px"><button class="btn-secondary" onclick="exBilanShare()">Partager (texte)</button>${pdf ? '<button class="btn-secondary" onclick="exBilanPdf()">Télécharger en PDF</button>' : '<button class="btn-secondary" onclick="crmCopy(exBilanText(EX.bilan))">Copier</button>'}</div>`;
}
function exBilanText(b){
  const L = [];
  const mois = EX_MOIS[b.m];
  L.push(`Bilan ${exMoisDe(b.m)} ${b.y} - Henzo Studio`, '');
  L.push('ARGENT', `Argent entré : ${agF(b.entrees)}`, `Dépenses : ${agF(b.depenses)}`, `Mis en épargne : ${agF(b.epargne)}`, `Net : ${b.net < 0 ? '-' : ''}${agF(Math.abs(b.net))}`);
  if(b.prev) L.push(`(mois d'avant : entré ${agF(b.prev.entrees)}, dépenses ${agF(b.prev.depenses)}, net ${b.prev.net < 0 ? '-' : ''}${agF(Math.abs(b.prev.net))})`);
  b.depCat.slice(0, 4).forEach(([k, v]) => L.push(`- ${k} : ${agF(v)}`));
  L.push('', 'SÉANCES', `${b.seances} séance(s), facturé ${agF(b.facture)}${b.prev ? ` (mois d'avant : ${b.prev.seances})` : ''}`);
  b.parType.forEach(([k, v]) => L.push(`- ${k} : ${v}`));
  if(b.annulees) L.push(`${b.annulees} annulée(s)`);
  L.push('', 'CLIENTS', `${b.nouveaux} nouveau(x) client(s)${b.prev ? ` (mois d'avant : ${b.prev.nouveaux})` : ''}, dont ${b.filleuls} grâce au parrainage`);
  b.sources.forEach(([k, v]) => L.push(`- ${k} : ${v}`));
  if(b.dettesDues || b.dettesRecup) L.push(`Dettes : ${agF(b.dettesDues || 0)} encore dues, ${agF(b.dettesRecup || 0)} récupérées ce mois`);
  L.push('', 'AVIS ET PUBLICATIONS', `${b.avis} avis${b.avis ? ' (moyenne ' + b.avisMoy.toFixed(1).replace('.', ',') + '/5)' : ''}`, `${b.posts} publication(s)`);
  b.reseaux.forEach(([k, v]) => L.push(`- ${k} : ${v}`));
  b.stats.forEach(([k, v]) => L.push(`- ${k} : ${agN(v)}`));
  if(b.coffres.length || b.objectifs.length){
    L.push('', 'COFFRES ET OBJECTIFS');
    b.coffres.forEach(c => L.push(`- ${c.name} : ${agF(c.current)}${c.verse ? ' (+' + agF(c.verse) + ' en ' + mois + ')' : ''}`));
    b.objectifs.forEach(o => L.push(`- ${o.name} : ${o.pct} %`));
  }
  if(EX.bilanAI && EX.bilanAI.k === b.y + '-' + b.m) L.push('', "CONSEILS DE L'IA", EX.bilanAI.t.replace(/\*\*/g, ''));
  return exTxt(L.join('\n'));
}
async function exBilanAI(){
  const b = EX.bilan; if(!b) return;
  const btn = document.getElementById('exBilanAiBtn'), box = document.getElementById('exBilanAI');
  if(btn){ btn.disabled = true; btn.textContent = "L'IA lit ton bilan..."; }
  try {
    const t = await callAI(`Tu es le coach business de Henzo, photographe et vidéaste à Bouaké (Côte d'Ivoire), Henzo Studio. Voici son bilan du mois :\n\n${exBilanText({ ...b })}\n\nDonne-lui 3 à 5 conseils concrets et encourageants pour le mois prochain (argent, clients, publications, parrainage). Français simple, phrases courtes, pas de jargon, pas de tirets longs. Commence par une phrase qui résume le mois.`);
    EX.bilanAI = { k: b.y + '-' + b.m, t: String(t || '').replace(/[—–]/g, '-') };
    if(box) box.innerHTML = crmMd(EX.bilanAI.t);
  } catch(e){ if(box) box.innerHTML = `<p>L'IA n'a pas répondu : ${agEsc(e.message || e)}</p>`; }
  if(btn){ btn.disabled = false; btn.textContent = "Conseils de l'IA"; }
}
async function exBilanShare(){
  const t = exBilanText(EX.bilan);
  if(navigator.share){ try { await navigator.share({ title: 'Bilan ' + exMoisDe(EX.bilan.m) + ' ' + EX.bilan.y, text: t }); return; } catch(e){ if(e && e.name === 'AbortError') return; } }
  crmCopy(t);
}
function exBilanPdf(){
  const b = EX.bilan; if(!b || !window.jspdf) return;
  const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
  const lines = exBilanText(b).split('\n');
  let y = 18;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text(lines.shift(), 15, y); y += 10;
  doc.setFontSize(11);
  lines.forEach(l => {
    const head = /^[A-ZÉÈ' ]{4,}$/.test(l.trim());
    doc.setFont('helvetica', head ? 'bold' : 'normal');
    doc.splitTextToSize(l || ' ', 180).forEach(part => { if(y > 282){ doc.addPage(); y = 18; } doc.text(part, 15, y); y += head ? 7 : 5.6; });
  });
  doc.save(`bilan-${b.y}-${String(b.m + 1).padStart(2, '0')}.pdf`);
}
function exBilanDashCard(){
  const el = document.getElementById('agDashMini'); if(!el) return;
  const hello = el.querySelector('.ag-hello');
  if(hello && !hello.querySelector('.ex-hello-btn')){
    const b = document.createElement('button'); b.className = 'ex-hello-btn'; b.innerHTML = agIcon('history', 15) + ' Mon bilan';
    b.onclick = () => exBilanOpen(); hello.appendChild(b);
  }
  const old = document.getElementById('exBilanCard'); if(old) old.remove();
  const n = exNow(); if(n.getDate() > 7) return;
  const [y, m] = exPrevMonth(n.getFullYear(), n.getMonth());
  const d = document.createElement('div');
  d.id = 'exBilanCard'; d.className = 'crm-fete';
  d.onclick = () => exBilanOpen(y, m);
  d.innerHTML = `<div class="ic">${agIcon('sparkles')}</div><div class="d"><b>Ton bilan ${exMoisDe(m)} est prêt</b><span>Argent, séances, clients, publications</span></div>${agIcon('chev', 16)}`;
  const act = el.querySelector('.ag-actions');
  if(act) act.insertAdjacentElement('afterend', d); else el.appendChild(d);
}

// ============================================================
// BRANCHEMENTS (sans toucher la logique d'argent)
// ============================================================
if(typeof dbUpdate === 'function'){
  const _exDbUpdate = dbUpdate;
  dbUpdate = async function(table, id, data){
    const r = await _exDbUpdate.apply(this, arguments);
    try { if(r && table === 'shoots' && data && ('montant_recu' in data || 'payment' in data)) exParSoon(); } catch(e){}
    return r;
  };
}
if(typeof dbInsert === 'function'){
  const _exDbInsert = dbInsert;
  dbInsert = async function(table, data){
    const r = await _exDbInsert.apply(this, arguments);
    try { if(r && table === 'shoots' && (Number(r.montant_recu) > 0 || r.payment === 'paye')) exParSoon(); } catch(e){}
    return r;
  };
}
if(typeof openPaiementSeance === 'function'){
  const _exOpenPay = openPaiementSeance;
  openPaiementSeance = function(){
    const r = _exOpenPay.apply(this, arguments);
    try { exMatTip(); } catch(e){}
    return r;
  };
}
if(typeof agRenderDashMini === 'function'){
  const _exDash = agRenderDashMini;
  agRenderDashMini = function(){
    const r = _exDash.apply(this, arguments);
    try { exBilanDashCard(); } catch(e){}
    return r;
  };
}
const _exShowTab = showTab;
showTab = function(name, btn){
  const r = _exShowTab.apply(this, arguments);
  if(name === 'materiel') exRenderMateriel();
  return r;
};
if(typeof refreshAll === 'function'){
  const _exRefresh = refreshAll;
  refreshAll = window.refreshAll = function(){
    const r = _exRefresh.apply(this, arguments);
    try { if(exPage() === 'materiel' && !exSheetOpen()) exRenderMateriel(); } catch(e){}
    return r;
  };
}
// Lien direct : ?tab=dash&bilan=1 ouvre le bilan du mois precedent
function exBilanDeep(){
  const q = new URLSearchParams(location.search);
  return window.__bilanDeep || q.get('bilan');
}
(async function exInit(){
  const deep = exBilanDeep();
  await exLoadPrefs();
  exMatLoad().then(() => { if(exPage() === 'materiel') exRenderMateriel(); });
  // Attendre les donnees (clients, seances, promos)
  for(let i = 0; i < 60 && !(typeof CRM !== 'undefined' && CRM.loaded && Array.isArray(clients) && !document.body.classList.contains('logged-out')); i++) await new Promise(r => setTimeout(r, 500));
  if(exPage() === 'materiel') exRenderMateriel();
  if(exPage() === 'clients' && typeof crmRender === 'function' && !exSheetOpen()) crmRender();
  if(exPage() === 'dash') try { exBilanDashCard(); } catch(e){}
  if(typeof renderShoots === 'function') try { renderShoots(); } catch(e){}
  await exParCheck();
  if(deep){
    window.__bilanDeep = null;
    if(location.search.includes('bilan=')) history.replaceState(null, '', location.pathname);
    const n = exNow(), [y, m] = exPrevMonth(n.getFullYear(), n.getMonth());
    if(typeof agGoTab === 'function' && exPage() !== 'dash') agGoTab('dash');
    exBilanOpen(y, m);
  }
})();
