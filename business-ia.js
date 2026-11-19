// ============================================================
// BUSINESS-IA.JS v1 - Assistant business de Henzo
//   Tableau de bord (calculé sur l'appareil, sans IA) + discussion avec une IA
//   qui connaît séances, clients, devis, argent, charges, tarifs.
//   Plan de la semaine (gardé dans saved_ideas), messages prêts à envoyer.
//   Aucune table créée : la discussion est gardée sur l'appareil.
// ============================================================
const BZ = { msgs: [], busy: false, draft: '', loaded: false, planTab: false, openDetail: null };
try { BZ.msgs = JSON.parse(localStorage.getItem('bzMsgs') || '[]') || []; } catch(e){ BZ.msgs = []; }
const bzEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const bzN = n => new Intl.NumberFormat('fr-FR').format(Math.round(Number(n) || 0));
const bzF = n => bzN(n) + ' F';
const bzDay = d => (d ? new Date(d) : new Date()).toISOString().slice(0, 10);
const bzDays = iso => Math.round((Date.now() - new Date(String(iso).slice(0, 10) + 'T12:00:00').getTime()) / 864e5);
const bzMonth = (off) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + (off || 0)); return d.toISOString().slice(0, 7); };
const bzNorm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
function bzSave(){ try { localStorage.setItem('bzMsgs', JSON.stringify(BZ.msgs.slice(-40))); } catch(e){} }
function bzToast(m, t){ try { if(typeof agToast === 'function') agToast(m, t); else alert(m); } catch(e){} }

// ---------- Données ----------
async function bzLoadMore(){
  try { if(typeof crmLoad === 'function' && typeof CRM !== 'undefined' && !CRM.loaded) await crmLoad(); } catch(e){}
  try { if(typeof pxLoad === 'function' && typeof PX !== 'undefined' && !PX.loaded) await pxLoad(); } catch(e){}
  try { if(typeof bgLoad === 'function' && typeof BG !== 'undefined' && !BG.loaded) await bgLoad(); } catch(e){}
  BZ.loaded = true;
}
const bzCancelled = s => /annul/i.test((s && s.status) || '');
const bzIsClient = c => (typeof estClient !== 'function' || estClient(c));
function bzClient(id){ return (typeof clients !== 'undefined' ? clients : []).find(c => c.id === Number(id)); }
function bzTx(){ return (typeof txs !== 'undefined' ? txs : []).filter(t => !t.cancelled && (t.type === 'revenu' || t.type === 'depense')); }
function bzPrices(s){ return Number(s.price) || 0; }

// Chiffres calculés ici (pas par l'IA)
function bzMetrics(){
  const today = bzDay(), ym = bzMonth(0), ymP = bzMonth(-1);
  const sh = (typeof shoots !== 'undefined' ? shoots : []).filter(s => s.date && !bzCancelled(s));
  const real = sh.filter(s => !s.collab);
  const m = { ym };
  const inMonth = (list, k) => list.filter(s => String(s.date).startsWith(k));
  m.caMois = inMonth(real, ym).reduce((a, s) => a + bzPrices(s), 0);
  m.caPrec = inMonth(real, ymP).reduce((a, s) => a + bzPrices(s), 0);
  m.seancesMois = inMonth(real, ym).length; m.seancesPrec = inMonth(real, ymP).length;
  m.encaisseMois = inMonth(real, ym).reduce((a, s) => a + (Number(s.montant_recu) || (s.payment === 'paye' ? bzPrices(s) : 0)), 0);
  // Impayés : séances passées dont le reste à payer > 0
  const dues = real.filter(s => s.date.slice(0, 10) <= today).map(s => {
    const recu = Number(s.montant_recu) || (s.payment === 'paye' ? bzPrices(s) : 0);
    return { s, reste: Math.max(0, bzPrices(s) - recu) };
  }).filter(x => x.reste > 0 && x.s.payment !== 'paye');
  m.impayes = dues.sort((a, b) => b.reste - a.reste);
  m.impayeTotal = dues.reduce((a, x) => a + x.reste, 0);
  m.avenir = real.filter(s => s.date.slice(0, 10) > today).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  m.avenir7 = m.avenir.filter(s => bzDays(s.date) >= -7);
  // Mois : 6 derniers
  m.mois = []; for(let i = 5; i >= 0; i--){ const k = bzMonth(-i); const l = inMonth(real, k);
    m.mois.push({ k, n: l.length, ca: l.reduce((a, s) => a + bzPrices(s), 0) }); }
  // Clients
  const cl = (typeof clients !== 'undefined' ? clients : []).filter(bzIsClient);
  const per = {}; real.filter(s => s.client_id).forEach(s => { (per[s.client_id] = per[s.client_id] || []).push(s); });
  m.nbClients = cl.length;
  m.fideles = Object.values(per).filter(l => l.length > 1).length;
  m.dormants = cl.map(c => { const l = (per[c.id] || []).filter(s => s.date.slice(0, 10) <= today).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return { c, last: l[0] ? l[0].date.slice(0, 10) : null, n: l.length, ca: l.reduce((a, s) => a + bzPrices(s), 0) }; })
    .filter(x => x.last && bzDays(x.last) >= 90 && x.n >= 1).sort((a, b) => b.ca - a.ca);
  m.top = cl.map(c => ({ c, ca: (per[c.id] || []).reduce((a, s) => a + bzPrices(s), 0), n: (per[c.id] || []).length })).filter(x => x.ca > 0).sort((a, b) => b.ca - a.ca).slice(0, 5);
  const tot = m.top.reduce((a, x) => a + x.ca, 0), all = real.reduce((a, s) => a + bzPrices(s), 0);
  m.concentration = all ? Math.round(100 * tot / all) : 0;
  const src = {}; cl.forEach(c => { const k = c.source || (c.parrain_id ? 'parrainage' : 'inconnue'); src[k] = (src[k] || 0) + 1; }); m.sources = src;
  // Types de séance : revenu moyen
  const ty = {}; real.filter(s => bzDays(s.date) <= 365).forEach(s => { const k = s.type || 'Séance'; const t = ty[k] = ty[k] || { n: 0, ca: 0 }; t.n++; t.ca += bzPrices(s); });
  m.types = Object.entries(ty).map(([k, v]) => ({ k, n: v.n, ca: v.ca, moy: v.n ? v.ca / v.n : 0 })).sort((a, b) => b.ca - a.ca);
  // Argent
  const t = bzTx(); const sum = (type, k) => t.filter(x => x.type === type && String(x.date).startsWith(k) && x.category !== 'Épargne').reduce((a, x) => a + Number(x.amount), 0);
  m.entrees = sum('revenu', ym); m.sorties = sum('depense', ym); m.sortiesPrec = sum('depense', ymP); m.entreesPrec = sum('revenu', ymP);
  const cat = {}; t.filter(x => x.type === 'depense' && String(x.date).startsWith(ym) && x.category !== 'Épargne').forEach(x => { cat[x.category] = (cat[x.category] || 0) + Number(x.amount); });
  m.catSorties = Object.entries(cat).sort((a, b) => b[1] - a[1]).slice(0, 6);
  // Charges fixes (mensuel)
  const ch = (typeof BG !== 'undefined' ? BG.charges : []) || [];
  m.charges = ch.filter(c => c.actif !== false).reduce((a, c) => a + (Number(c.montant) || 0) * ({ mensuel: 1, trimestriel: 1 / 3, annuel: 1 / 12, hebdo: 4.3 }[c.frequence] || 1), 0);
  // Devis
  const dv = (typeof PX !== 'undefined' ? PX.devis : []) || [];
  m.devis = { total: dv.length, accepte: dv.filter(d => d.status === 'accepte').length, refuse: dv.filter(d => d.status === 'refuse').length,
    attente: dv.filter(d => d.status === 'envoye').map(d => ({ d, jours: bzDays(d.created_at || bzDay()) })).sort((a, b) => b.jours - a.jours) };
  m.tarifs = ((typeof CRM !== 'undefined' ? CRM.tarifs : []) || []).filter(x => x.active !== false && x.kind !== 'option').slice(0, 14);
  m.coffres = (typeof coffres !== 'undefined' ? coffres : []).filter(c => typeof agIsCoffre === 'function' ? agIsCoffre(c) : Number(c.goal) > 1).slice(0, 6);
  return m;
}

// ---------- Contexte pour l'IA ----------
function bzContext(){
  const m = bzMetrics(), L = [];
  L.push(`Aujourd'hui : ${bzDay()}. Devise : F CFA.`);
  L.push(`\nACTIVITÉ (séances payantes, hors collaborations) :`);
  L.push('- 6 derniers mois : ' + m.mois.map(x => `${x.k} : ${x.n} séances, ${bzF(x.ca)}`).join(' | '));
  L.push(`- Ce mois : ${bzF(m.caMois)} facturés (${m.seancesMois} séances), ${bzF(m.encaisseMois)} encaissés. Mois précédent : ${bzF(m.caPrec)} (${m.seancesPrec} séances).`);
  if(m.impayes.length) L.push(`- IMPAYÉS : ${bzF(m.impayeTotal)} sur ${m.impayes.length} séances : ` + m.impayes.slice(0, 6).map(x => { const c = bzClient(x.s.client_id); return `${c ? c.name : 'client ?'} ${String(x.s.date).slice(0, 10)} reste ${bzF(x.reste)}`; }).join(' ; '));
  if(m.avenir.length) L.push(`- À VENIR (${m.avenir.length}) : ` + m.avenir.slice(0, 8).map(s => { const c = bzClient(s.client_id); return `${String(s.date).slice(0, 10)} ${s.type || 'séance'}${c ? ' ' + c.name : ''} ${bzF(s.price)}`; }).join(' ; '));
  if(m.types.length) L.push('- PAR TYPE (12 mois) : ' + m.types.slice(0, 8).map(x => `${x.k} ${x.n}x, ${bzF(x.ca)}, moyenne ${bzF(x.moy)}`).join(' | '));
  L.push(`\nCLIENTS : ${m.nbClients} fiches, ${m.fideles} reviennent (2 séances ou plus). Sources : ${Object.entries(m.sources).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(', ') || 'non notées'}.`);
  if(m.top.length) L.push(`- Meilleurs clients : ` + m.top.map(x => `${x.c.name} ${bzF(x.ca)} (${x.n}x)`).join(' ; ') + `. Les 5 premiers = ${m.concentration} % du chiffre.`);
  if(m.dormants.length) L.push(`- À RELANCER (plus de séance depuis 3 mois ou plus) : ` + m.dormants.slice(0, 8).map(x => `${x.c.name} (id ${x.c.id}, dernière ${x.last}, ${x.n}x, ${bzF(x.ca)}${x.c.phone ? '' : ', pas de numéro'})`).join(' ; '));
  L.push(`\nARGENT CE MOIS : entrées ${bzF(m.entrees)}, sorties ${bzF(m.sorties)} (mois précédent : ${bzF(m.entreesPrec)} / ${bzF(m.sortiesPrec)}).` + (m.catSorties.length ? ' Dépenses : ' + m.catSorties.map(([k, v]) => `${k} ${bzF(v)}`).join(', ') + '.' : ''));
  if(m.charges) L.push(`- Charges fixes : environ ${bzF(m.charges)} par mois.`);
  if(m.coffres.length) L.push('- Objectifs d\'épargne : ' + m.coffres.map(c => `${c.name} ${bzF(c.current)}/${bzF(c.goal)}`).join(' ; '));
  L.push(`\nDEVIS : ${m.devis.total} faits, ${m.devis.accepte} acceptés, ${m.devis.refuse} refusés, ${m.devis.attente.length} sans réponse` + (m.devis.attente.length ? ' : ' + m.devis.attente.slice(0, 5).map(x => `${x.d.client_name || 'client'} ${bzF(x.d.total)} (il y a ${x.jours} j)`).join(' ; ') : '') + '.');
  if(m.tarifs.length) L.push('TARIFS : ' + m.tarifs.map(t => `${t.name} ${bzF(t.price)}`).join(', ') + '.');
  const plan = bzPlan().filter(p => p.statut !== 'fait').slice(0, 8);
  if(plan.length) L.push('\nPLAN EN COURS (déjà décidé, ne le répète pas) : ' + plan.map(p => `${p.title} [${p.statut}]`).join(' ; '));
  return L.join('\n');
}
function bzSystem(){
  return `Tu es l'assistant business personnel de Henzo (KONAN Cédric), photographe et vidéaste indépendant à Bouaké (Côte d'Ivoire), marque "Henzo Photographie". Tu es son directeur commercial et financier : tu lis ses vrais chiffres, tu les analyses, tu lui dis où il gagne et où il perd, et tu lui donnes des actions précises.

COMMENT TU TRAVAILLES :
- Tu t'appuies d'abord sur LES CHIFFRES du contexte. Tu cites des montants, des noms de clients, des dates réels. Tu n'inventes jamais un chiffre : si une donnée manque, tu dis laquelle et pourquoi elle t'aiderait.
- Tu es honnête et direct, même si ça pique (clients trop dépendants, prix trop bas, impayés, séances à perte). Pas de flatterie, pas de généralités du genre "il faut se démarquer".
- Chaque conseil donne : quoi faire, pour qui, à quel prix ou montant, d'ici quand, et le gain attendu en F CFA (une fourchette réaliste, en disant que c'est une estimation).
- Tu connais le marché de Bouaké et de la Côte d'Ivoire : pouvoir d'achat, paiement par Wave, Orange et MTN, importance du bouche à oreille, saisons (mariages, dots, rentrée, fêtes, Tabaski, Korité), WhatsApp comme outil de vente.
- Pour les prix, les tendances ou les idées de revenus, tu t'appuies sur la recherche web quand elle est disponible, et tu dis d'où vient l'information.
- Français simple, phrases courtes, pas de jargon (dis "marge" plutôt que "EBITDA", "clients qui reviennent" plutôt que "rétention"). Jamais de tiret long, seulement "-".
- Au maximum 1 question à la fin, seulement si la réponse change vraiment ton conseil.
- Tu ne peux rien envoyer ni payer toi-même : tu prépares, Henzo valide. Ne dis jamais "j'ai envoyé" ou "c'est fait".

BLOCS SPÉCIAUX (tout à la fin, format exact : trois accents graves + nom, JSON sur la ligne suivante, trois accents graves) :
1) Quand tu donnes des actions à faire (plan de la semaine ou conseil concret), un bloc plan, 1 à 5 actions maximum, les plus rentables d'abord :
\`\`\`plan
[{"titre":"court, commence par un verbe","detail":"pour qui, comment, combien","gain":"ex : 30 000 à 60 000 F","delai":"AAAA-MM-JJ"}]
\`\`\`
2) Quand tu prépares un message à envoyer (relance de client, de devis, de paiement, offre), un bloc par message, texte prêt à copier, humain, court, sans formule robotique, avec le prénom du client :
\`\`\`message
{"client_id":12,"titre":"Relance paiement Awa","texte":"Bonjour Awa, ..."}
\`\`\`
client_id = l'identifiant (id) donné dans le contexte, sinon null.
3) À la fin, 2 ou 3 suites que Henzo pourrait demander (moins de 60 caractères, écrites comme s'il parlait) :
\`\`\`suivi
["Prépare la relance pour les impayés","Combien augmenter mes mariages ?"]
\`\`\`

CONTEXTE (chiffres réels, calculés à l'instant) :
${bzContext()}`;
}

// ---------- IA ----------
async function bzAI(system, messages, recherche){
  const turns = []; messages.forEach(m => { const role = m.role === 'user' ? 'user' : 'assistant'; const text = String(m.text || '').trim() || '...';
    if(turns.length && turns[turns.length - 1].role === role) turns[turns.length - 1].text += '\n\n' + text; else turns.push({ role, text }); });
  while(turns.length && turns[0].role !== 'user') turns.shift();
  if(typeof window.iaRelais === 'function'){
    const r = await window.iaRelais({ system, messages: turns, images: [], recherche: !!recherche, maxTokens: 3000, tache: 'texte' });
    return { text: r.text, sources: r.sources || [] };
  }
  if(typeof window.mkAI === 'function'){ const r = await window.mkAI({ system, messages: turns, recherche: !!recherche, maxTokens: 3000 }); return { text: r.text, sources: r.sources || [] }; }
  const t = await callAI(system + '\n\n' + turns.map(x => (x.role === 'user' ? 'Henzo : ' : 'Toi : ') + x.text).join('\n'));
  return { text: t, sources: [] };
}
const BZ_SEARCH = /prix|tarif|combien|march[eé]|concurren|tendance|id[eé]e|nouveau revenu|opportunit|partenariat|en ce moment|saison|augmenter/i;
function bzParse(raw){
  let t = String(raw || ''); const out = { plan: [], messages: [], suivis: [] };
  t = t.replace(/```(plan|message|suivi)\s*([\s\S]*?)```/g, (all, k, body) => {
    try { const j = JSON.parse(body.trim()); if(k === 'plan') out.plan.push(...(Array.isArray(j) ? j : [j])); else if(k === 'message') out.messages.push(...(Array.isArray(j) ? j : [j])); else out.suivis.push(...(Array.isArray(j) ? j : [])); } catch(e){}
    return '';
  });
  out.clean = t.replace(/[—–]/g, '-').replace(/\n{3,}/g, '\n\n').trim();
  return out;
}
async function bzSend(text){
  if(BZ.busy) return;
  const inp = document.getElementById('bzIn');
  text = String(text != null ? text : (inp ? inp.value : '')).trim(); if(!text) return;
  BZ.draft = ''; BZ.busy = true; BZ.msgs.push({ role: 'user', text, t: Date.now() }); bzSave(); bzRender();
  try {
    if(!BZ.loaded) await bzLoadMore();
    const hist = BZ.msgs.slice(-14).map(m => ({ role: m.role, text: m.role === 'user' ? m.text : bzParse(m.text).clean }));
    const res = await bzAI(bzSystem(), hist, BZ_SEARCH.test(text));
    let txt = res.text || '';
    if(res.sources && res.sources.length) txt += '\n\nSources : ' + res.sources.map(s => `${String(s.title).replace(/[\[\]]/g, '')} (${s.uri})`).join(', ');
    BZ.msgs.push({ role: 'agent', text: txt, t: Date.now() });
  } catch(e){
    BZ.msgs.push({ role: 'agent', text: "Je n'ai pas pu répondre : " + (e.message || e), t: Date.now(), err: true });
  }
  BZ.busy = false; bzSave(); bzRender();
}
function bzNew(){ BZ.msgs = []; bzSave(); bzRender(); bzToast('Nouvelle conversation'); }
const BZ_QUICK = [
  ['Analyse mon activité', "Fais l'analyse complète de mon activité : ce qui va bien, ce qui va mal, où je perds de l'argent, et les 3 choses les plus importantes à faire."],
  ['Mon plan de la semaine', "Donne-moi mon plan de la semaine : les 3 à 5 actions les plus rentables à faire maintenant, avec le gain attendu."],
  ['Qui relancer ?', "Qui dois-je relancer en priorité (clients, devis, impayés) ? Prépare-moi les messages."],
  ['Juge mes prix', "Juge mes tarifs : sont-ils trop bas, trop hauts, bien rangés ? Que dois-je changer, et de combien ?"],
  ['Nouveaux revenus', "Quelles nouvelles sources de revenus conviennent à MA situation ? Donne-m'en 3 chiffrées, la plus facile à tester d'abord."]
];

// ---------- Plan (saved_ideas : tags = ['plan', 'semaine:AAAA-MM-JJ', 'statut:todo'] ) ----------
function bzPlan(){
  return (typeof savedIdeas !== 'undefined' ? savedIdeas : []).filter(i => Array.isArray(i.tags) && i.tags.includes('plan')).map(i => {
    const tag = p => (i.tags.find(t => String(t).startsWith(p)) || '').slice(p.length);
    return { id: i.id, title: i.title, detail: i.description || '', statut: tag('statut:') || 'todo', delai: tag('delai:'), gain: tag('gain:'), raw: i };
  }).sort((a, b) => (a.statut === 'fait') - (b.statut === 'fait') || String(a.delai || 'z').localeCompare(String(b.delai || 'z')));
}
async function bzAddPlan(msgIdx, i){
  const m = BZ.msgs[msgIdx]; if(!m) return; const p = bzParse(m.text).plan[i]; if(!p) return;
  const title = String(p.titre || '').slice(0, 120); if(!title) return;
  if(savedIdeas.some(x => x.title === title && (x.tags || []).includes('plan'))){ bzToast('Déjà dans ton plan'); return; }
  const tags = ['plan', 'statut:todo']; if(/^\d{4}-\d{2}-\d{2}$/.test(p.delai || '')) tags.push('delai:' + p.delai); if(p.gain) tags.push('gain:' + String(p.gain).slice(0, 60));
  const r = await dbInsert('saved_ideas', { title, description: String(p.detail || '').slice(0, 600), tags });
  if(!r) return; savedIdeas.unshift(r); bzRender(); bzToast('Ajouté à ton plan');
}
async function bzAddAllPlan(msgIdx){ const n = bzParse((BZ.msgs[msgIdx] || {}).text).plan.length; for(let i = 0; i < n; i++) await bzAddPlan(msgIdx, i); }
async function bzSetStatut(id, statut){
  const it = savedIdeas.find(x => x.id === id); if(!it) return;
  const tags = (it.tags || []).filter(t => !String(t).startsWith('statut:')).concat('statut:' + statut);
  const { error } = await sb.from('saved_ideas').update({ tags }).eq('id', id);
  if(error){ bzToast(error.message, 'error'); return; } it.tags = tags; bzRender();
}
async function bzDelPlan(id){
  if(typeof agConfirm === 'function' && !await agConfirm('Retirer cette action du plan ?')) return;
  if(await dbDelete('saved_ideas', id)){ savedIdeas = savedIdeas.filter(x => x.id !== id); bzRender(); }
}

// ---------- Messages prêts à envoyer ----------
async function bzCopy(txt){
  try { if(navigator.clipboard && window.isSecureContext){ await navigator.clipboard.writeText(txt); bzToast('Copié'); return; } } catch(e){}
  const a = document.createElement('textarea'); a.value = txt; a.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); bzToast('Copié'); } catch(e){} a.remove();
}
function bzMsgData(msgIdx, i){ const m = BZ.msgs[msgIdx]; return m ? bzParse(m.text).messages[i] : null; }
function bzCopyMsg(a, b){ const d = bzMsgData(a, b); if(d) bzCopy(d.texte || ''); }
function bzWhats(a, b){
  const d = bzMsgData(a, b); if(!d) return; const c = bzClient(d.client_id);
  let tel = String((c && c.phone) || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
  if(tel && tel.length === 10 && tel[0] === '0') tel = '225' + tel; else if(tel && tel.length === 8) tel = '225' + tel;
  if(!tel){ bzCopy(d.texte || ''); bzToast('Pas de numéro : message copié'); return; }
  window.open('https://wa.me/' + tel + '?text=' + encodeURIComponent(d.texte || ''), '_blank');
}

// ---------- Rendu ----------
function bzMd(t){
  let s = bzEsc(t).replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  const lines = s.split('\n'), out = []; let inList = false;
  lines.forEach(l => { const li = l.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)$/);
    if(li){ if(!inList){ out.push('<ul>'); inList = true; } out.push('<li>' + li[1] + '</li>'); }
    else { if(inList){ out.push('</ul>'); inList = false; } out.push(l.trim() ? '<p>' + l + '</p>' : ''); } });
  if(inList) out.push('</ul>');
  return out.join('');
}
function bzBadge(txt, tone){ return `<span class="bz-b bz-${tone || 'n'}">${bzEsc(txt)}</span>`; }
function bzKpi(label, val, sub, tone){ return `<div class="bz-k ${tone ? 'bz-' + tone : ''}"><small>${bzEsc(label)}</small><b>${bzEsc(val)}</b>${sub ? `<em>${bzEsc(sub)}</em>` : ''}</div>`; }
function bzDash(){
  const m = bzMetrics();
  const evo = m.caPrec ? Math.round(100 * (m.caMois - m.caPrec) / m.caPrec) : null;
  const k = [
    bzKpi('Facturé ce mois', bzF(m.caMois), evo == null ? `${m.seancesMois} séances` : `${evo >= 0 ? '+' : ''}${evo} % vs mois passé`, evo != null && evo < 0 ? 'bad' : 'ok'),
    bzKpi('Encaissé ce mois', bzF(m.encaisseMois), m.caMois ? `${Math.round(100 * m.encaisseMois / m.caMois)} % du facturé` : ''),
    bzKpi('Impayés', bzF(m.impayeTotal), m.impayes.length ? `${m.impayes.length} séance(s)` : 'Rien à relancer', m.impayeTotal ? 'bad' : 'ok'),
    bzKpi('Marge du mois', bzF(m.entrees - m.sorties), `Entrées ${bzF(m.entrees)} · Sorties ${bzF(m.sorties)}`, m.entrees - m.sorties < 0 ? 'bad' : 'ok')
  ].join('');
  const al = [];
  if(m.impayes.length){ const x = m.impayes[0], c = bzClient(x.s.client_id); al.push(['bad', `${bzF(m.impayeTotal)} à encaisser`, `Le plus gros : ${c ? c.name : 'un client'} (${bzF(x.reste)}).`, 'Prépare les relances de paiement pour mes impayés.']); }
  const old = m.devis.attente.filter(x => x.jours >= 3); if(old.length) al.push(['warn', `${old.length} devis sans réponse`, `Le plus ancien date d'il y a ${old[0].jours} jours (${old[0].d.client_name || 'client'}).`, 'Prépare la relance de mes devis sans réponse.']);
  if(m.dormants.length) al.push(['warn', `${m.dormants.length} anciens clients à relancer`, `Ils ont déjà payé ${bzF(m.dormants.reduce((a, x) => a + x.ca, 0))} au total.`, 'Qui dois-je relancer parmi mes anciens clients ? Prépare les messages.']);
  if(m.concentration >= 60 && m.nbClients >= 8) al.push(['warn', `Trop dépendant de peu de clients`, `Tes 5 meilleurs clients font ${m.concentration} % du chiffre.`, 'Je dépends de peu de clients. Comment élargir ?']);
  if(m.avenir7.length === 0 && (m.avenir.length === 0)) al.push(['bad', 'Aucune séance à venir', 'Ton agenda est vide : il faut remplir les semaines qui viennent.', 'Mon agenda est vide, que dois-je faire cette semaine pour avoir des réservations ?']);
  if(m.entrees - m.sorties < 0 && m.sorties) al.push(['bad', 'Tu dépenses plus que tu ne gagnes', `Sorties ${bzF(m.sorties)} pour ${bzF(m.entrees)} d'entrées ce mois.`, 'Où partent mes dépenses et que puis-je couper ?']);
  const bars = m.mois, mx = Math.max(1, ...bars.map(x => x.ca));
  return `<div class="bz-kpis">${k}</div>
    ${al.length ? `<div class="bz-al">${al.slice(0, 4).map(([t, a, b, q]) => `<button class="bz-a bz-${t}" onclick="bzSend(${bzEsc(JSON.stringify(q))})"><b>${bzEsc(a)}</b><span>${bzEsc(b)}</span><i>Demander à l'assistant</i></button>`).join('')}</div>` : ''}
    <div class="bz-chart" aria-label="Facturé par mois">${bars.map(x => `<div title="${x.k} : ${bzF(x.ca)}"><i style="height:${Math.max(3, Math.round(70 * x.ca / mx))}px"></i><span>${x.k.slice(5)}</span></div>`).join('')}</div>`;
}
function bzPlanHtml(){
  const p = bzPlan(); if(!p.length) return '';
  const todo = p.filter(x => x.statut !== 'fait'), done = p.length - todo.length;
  return `<div class="bz-sec"><h3>Mon plan ${bzBadge(todo.length + ' à faire' + (done ? ' · ' + done + ' fait' + (done > 1 ? 's' : '') : ''), 'n')}</h3>
    ${p.map(x => `<div class="bz-p ${x.statut === 'fait' ? 'done' : ''}">
      <button class="bz-ck" onclick="bzSetStatut(${x.id},'${x.statut === 'fait' ? 'todo' : 'fait'}')" aria-label="Fait">${x.statut === 'fait' ? '✓' : ''}</button>
      <div><b>${bzEsc(x.title)}</b>${x.detail ? `<small>${bzEsc(x.detail)}</small>` : ''}<small>${[x.delai ? 'Pour le ' + x.delai.split('-').reverse().join('/') : '', x.gain ? 'Gain : ' + x.gain : ''].filter(Boolean).map(bzEsc).join(' · ')}</small></div>
      <button class="bz-x" onclick="bzDelPlan(${x.id})" aria-label="Retirer">×</button></div>`).join('')}</div>`;
}
function bzMsgHtml(m, idx){
  if(m.role === 'user') return `<div class="bz-m user">${bzEsc(m.text).replace(/\n/g, '<br>')}</div>`;
  const P = bzParse(m.text);
  return `<div class="bz-m agent ${m.err ? 'err' : ''}">${bzMd(P.clean)}
    ${P.plan.length ? `<div class="bz-plan"><h4>Actions proposées</h4>${P.plan.map((a, i) => `<div class="bz-pa"><b>${bzEsc(a.titre)}</b><small>${bzEsc(a.detail || '')}</small><small>${[a.gain ? 'Gain estimé : ' + a.gain : '', a.delai ? 'Pour le ' + String(a.delai).split('-').reverse().join('/') : ''].filter(Boolean).map(bzEsc).join(' · ')}</small>
      <button onclick="bzAddPlan(${idx},${i})">Ajouter à mon plan</button></div>`).join('')}${P.plan.length > 1 ? `<button class="bz-all" onclick="bzAddAllPlan(${idx})">Tout ajouter au plan</button>` : ''}</div>` : ''}
    ${P.messages.map((d, i) => { const c = bzClient(d.client_id); return `<div class="bz-msg"><h4>${bzEsc(d.titre || 'Message')}${c ? ' · ' + bzEsc(c.name) : ''}</h4><p>${bzEsc(d.texte || '').replace(/\n/g, '<br>')}</p>
      <div><button onclick="bzCopyMsg(${idx},${i})">Copier</button><button class="main" onclick="bzWhats(${idx},${i})">WhatsApp</button></div></div>`; }).join('')}
    ${idx === BZ.msgs.length - 1 && P.suivis.length ? `<div class="bz-su">${P.suivis.map(q => `<button onclick="bzSend(${bzEsc(JSON.stringify(q))})">${bzEsc(q)}</button>`).join('')}</div>` : ''}
  </div>`;
}
function bzCss(){
  if(document.getElementById('bzCss')) return;
  const s = document.createElement('style'); s.id = 'bzCss';
  s.textContent = `#bzRoot{margin-bottom:14px}#bzRoot .bz-card{background:var(--card,#1b2a2a);border-radius:16px;padding:14px;margin-bottom:12px}
  #bzRoot h2{margin:0 0 4px;font-size:18px}#bzRoot .bz-sub{opacity:.7;font-size:13px;margin:0 0 12px}
  .bz-kpis{display:grid;grid-template-columns:1fr 1fr;gap:8px}.bz-k{background:rgba(255,255,255,.05);border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:2px}
  .bz-k small{opacity:.7;font-size:12px}.bz-k b{font-size:17px}.bz-k em{font-style:normal;font-size:11px;opacity:.75}.bz-k.bz-bad b{color:#ff8a80}.bz-k.bz-ok b{color:#7ee2a8}
  .bz-al{display:flex;flex-direction:column;gap:6px;margin-top:10px}.bz-a{text-align:left;border:0;border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:2px;color:inherit;background:rgba(255,255,255,.06);border-left:4px solid #f5c04e;cursor:pointer}
  .bz-a.bz-bad{border-left-color:#ff6b5e}.bz-a b{font-size:14px}.bz-a span{font-size:12px;opacity:.8}.bz-a i{font-size:11px;opacity:.6;font-style:normal}
  .bz-chart{display:flex;align-items:flex-end;gap:8px;height:96px;margin-top:12px;padding-top:6px}.bz-chart div{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px}
  .bz-chart i{width:100%;max-width:34px;background:var(--accent,#48A89A);border-radius:6px 6px 2px 2px;display:block}.bz-chart span{font-size:11px;opacity:.65}
  .bz-quick{display:flex;gap:6px;overflow-x:auto;padding:2px 0 10px;scrollbar-width:none}.bz-quick button{flex:none;border:1px solid rgba(255,255,255,.18);background:transparent;color:inherit;border-radius:999px;padding:8px 12px;font-size:13px;cursor:pointer}
  .bz-chat{display:flex;flex-direction:column;gap:8px;max-height:60vh;overflow-y:auto;margin-bottom:10px}
  .bz-m{border-radius:14px;padding:10px 12px;font-size:14px;line-height:1.45;max-width:94%}.bz-m.user{align-self:flex-end;background:var(--accent,#48A89A);color:#fff}.bz-m.agent{align-self:flex-start;background:rgba(255,255,255,.07)}
  .bz-m.err{border:1px solid #ff6b5e}.bz-m p{margin:0 0 8px}.bz-m ul{margin:0 0 8px;padding-left:18px}.bz-m li{margin-bottom:3px}
  .bz-plan,.bz-msg{background:rgba(255,255,255,.06);border-radius:12px;padding:10px;margin-top:8px}.bz-plan h4,.bz-msg h4{margin:0 0 6px;font-size:13px}.bz-pa{margin-bottom:8px;display:flex;flex-direction:column;gap:2px}.bz-pa small{opacity:.75;font-size:12px}
  .bz-pa button,.bz-all,.bz-msg button,.bz-su button{border:1px solid rgba(255,255,255,.2);background:transparent;color:inherit;border-radius:10px;padding:6px 10px;font-size:12px;cursor:pointer;margin:4px 6px 0 0;align-self:flex-start}
  .bz-msg button.main{background:#25d366;border-color:#25d366;color:#04210f;font-weight:600}.bz-msg p{font-size:13px}.bz-su{display:flex;flex-wrap:wrap;margin-top:6px}
  .bz-row{display:flex;gap:8px;align-items:flex-end}.bz-row textarea{flex:1;border-radius:12px;padding:10px;font-size:14px;resize:none;min-height:42px;max-height:140px}.bz-row button{border:0;border-radius:12px;padding:0 16px;height:42px;background:var(--accent,#48A89A);color:#fff;font-weight:600;cursor:pointer}.bz-row button:disabled{opacity:.5}
  .bz-foot{display:flex;justify-content:space-between;margin-top:8px;font-size:12px}.bz-foot button{background:none;border:0;color:inherit;opacity:.65;cursor:pointer;text-decoration:underline;font-size:12px}
  .bz-sec h3{margin:0 0 8px;font-size:15px;display:flex;gap:8px;align-items:center}.bz-b{font-size:11px;padding:2px 8px;border-radius:99px;background:rgba(255,255,255,.1);font-weight:500}
  .bz-p{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid rgba(255,255,255,.08)}.bz-p>div{flex:1;display:flex;flex-direction:column;gap:2px}.bz-p small{opacity:.72;font-size:12px}.bz-p.done b{text-decoration:line-through;opacity:.5}
  .bz-ck{width:24px;height:24px;border-radius:7px;border:2px solid var(--accent,#48A89A);background:transparent;color:#fff;cursor:pointer;flex:none;font-size:14px;line-height:1}.bz-p.done .bz-ck{background:var(--accent,#48A89A)}
  .bz-x{border:0;background:none;color:inherit;opacity:.5;font-size:20px;cursor:pointer;line-height:1}
  .bz-typing{opacity:.7;font-size:13px;padding:4px 2px}`;
  document.head.appendChild(s);
}
function bzRoot(){
  const page = document.getElementById('page-business'); if(!page) return null;
  let r = document.getElementById('bzRoot');
  if(!r){
    const cont = page.querySelector('.container'); if(!cont) return null;
    r = document.createElement('div'); r.id = 'bzRoot'; cont.insertBefore(r, cont.firstChild);
    // Les anciennes cartes (générateur d'idées) restent, rangées dans un volet replié
    const old = [...cont.children].filter(c => c !== r);
    if(old.length){ const d = document.createElement('details'); d.className = 'bz-card'; d.innerHTML = '<summary style="cursor:pointer;font-weight:600">Anciennes idées rapides</summary>'; old.forEach(c => d.appendChild(c)); cont.appendChild(d); }
    const t = document.querySelector('#headerTitle'); if(t && page.classList.contains('active')) t.textContent = '💼 Assistant business';
  }
  return r;
}
function bzRender(){
  bzCss(); const r = bzRoot(); if(!r) return;
  const msgs = BZ.msgs;
  const empty = !msgs.length ? `<div class="bz-m agent"><p>Salut Henzo. Je lis tes séances, tes clients, tes devis et ton argent pour t'aider à gagner plus et à mieux décider.</p><p>Touche une question ci-dessus, ou écris-moi directement.</p></div>` : '';
  const keep = document.getElementById('bzIn'); const val = keep ? keep.value : BZ.draft;
  r.innerHTML = `<div class="bz-card"><h2>💼 Mon activité</h2><p class="bz-sub">Chiffres calculés à partir de tes vraies données.</p>${bzDash()}</div>
    ${bzPlanHtml() ? `<div class="bz-card">${bzPlanHtml()}</div>` : ''}
    <div class="bz-card"><h2>🤝 Assistant business</h2>
      <div class="bz-quick">${BZ_QUICK.map(([l, q]) => `<button onclick="bzSend(${bzEsc(JSON.stringify(q))})" ${BZ.busy ? 'disabled' : ''}>${bzEsc(l)}</button>`).join('')}</div>
      <div class="bz-chat" id="bzChat">${empty}${msgs.map(bzMsgHtml).join('')}${BZ.busy ? '<div class="bz-typing">Je réfléchis à tes chiffres...</div>' : ''}</div>
      <div class="bz-row"><textarea id="bzIn" rows="1" placeholder="Pose ta question business..." oninput="BZ.draft=this.value;this.style.height='auto';this.style.height=Math.min(140,this.scrollHeight)+'px'" onkeydown="if(event.key==='Enter'&&!event.shiftKey&&!/Android|iPhone|iPad/i.test(navigator.userAgent)){event.preventDefault();bzSend()}">${bzEsc(val)}</textarea><button onclick="bzSend()" ${BZ.busy ? 'disabled' : ''}>Envoyer</button></div>
      <div class="bz-foot"><span style="opacity:.6">Il prépare, tu valides. Rien n'est envoyé sans toi.</span>${msgs.length ? '<button onclick="bzNew()">Nouvelle conversation</button>' : ''}</div></div>`;
  const c = document.getElementById('bzChat'); if(c) c.scrollTop = c.scrollHeight;
}
// Branchement : affichage à l'ouverture de l'onglet Business, et après chaque rafraîchissement des données
(function bzHook(){
  const wrap = (name, fn) => { const o = window[name]; if(typeof o !== 'function' || o.__bz) return; const w = function(){ const r = o.apply(this, arguments); try { fn.apply(this, arguments); } catch(e){ console.warn('business-ia', e); } return r; }; w.__bz = true; window[name] = w; };
  wrap('showTab', function(n){ if(n === 'business'){ bzRender(); bzLoadMore().then(bzRender); } });
  wrap('refreshAll', function(){ const p = document.getElementById('page-business'); if(p && p.classList.contains('active')) bzRender(); });
  if(document.getElementById('page-business') && document.getElementById('page-business').classList.contains('active')){ bzRender(); bzLoadMore().then(bzRender); }
})();
window.bzSend = bzSend; window.bzNew = bzNew; window.bzAddPlan = bzAddPlan; window.bzAddAllPlan = bzAddAllPlan; window.bzSetStatut = bzSetStatut; window.bzDelPlan = bzDelPlan;
window.bzCopyMsg = bzCopyMsg; window.bzWhats = bzWhats; window.BZ = BZ;
