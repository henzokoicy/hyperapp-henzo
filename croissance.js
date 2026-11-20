// ============================================================
// CROISSANCE.JS - Tableau de bord de croissance (accueil)
// ------------------------------------------------------------
// Les chiffres suivis de la Vision Henzo Studio, calculés sur l'appareil à
// partir des séances, clients, devis et demandes de réservation :
// séances du mois, chiffre d'affaires, gain moyen par client, clients qui
// reviennent, devis acceptés, demandes en attente, recommandations.
// Chaque chiffre est comparé au mois dernier quand c'est possible.
// ============================================================
(function(){
'use strict';
const JOUR = 864e5;
const esc = s => (typeof agEsc === 'function' ? agEsc(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const cleMois = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
const moisPrec = d => new Date(d.getFullYear(), d.getMonth() - 1, 1);

// ---------- Calcul pur ----------
// ctx : { now, shoots, clients, devis, resas }
function calculer(ctx){
  const now = ctx.now || new Date();
  const mois = cleMois(now), prec = cleMois(moisPrec(now));
  const valides = (ctx.shoots || []).filter(s => s && s.date && !/annul/i.test(s.status || ''));
  const prix = s => Number(s.price) || 0;
  const duMois = k => valides.filter(s => String(s.date).slice(0, 7) === k);
  const m = duMois(mois), p = duMois(prec);
  const ca = l => l.reduce((a, s) => a + prix(s), 0);
  const encaisse = l => l.reduce((a, s) => a + (Number(s.montant_recu) || 0), 0);

  // 12 derniers mois, séances déjà faites : gain moyen par client et clients qui reviennent
  const auj = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  const debut = new Date(now.getTime() - 365 * JOUR); const debutStr = debut.toISOString().slice(0, 10);
  const faites = valides.filter(s => s.client_id && String(s.date).slice(0, 10) <= auj);
  const an = faites.filter(s => String(s.date).slice(0, 10) >= debutStr);
  const parClient = {}; an.forEach(s => { parClient[s.client_id] = (parClient[s.client_id] || 0) + prix(s); });
  const nbClients = Object.keys(parClient).length;
  const gainMoyen = nbClients ? Math.round(Object.values(parClient).reduce((a, b) => a + b, 0) / nbClients) : null;
  const total = {}; faites.forEach(s => { total[s.client_id] = (total[s.client_id] || 0) + 1; });
  const tousClients = Object.keys(total).length;
  const reviennent = Object.values(total).filter(n => n >= 2).length;

  // Devis : même définition que la page Tarifs (acceptés / (acceptés + refusés))
  const dv = ctx.devis || [];
  const acc = dv.filter(d => d.status === 'accepte').length, ref = dv.filter(d => d.status === 'refuse').length;
  const tauxDevis = acc + ref ? Math.round(acc / (acc + ref) * 100) : null;

  // Demandes de réservation en attente et la plus ancienne
  const att = (ctx.resas || []).filter(r => r.status === 'nouvelle' && r.created_at);
  const plusVieille = att.length ? Math.max.apply(null, att.map(r => Math.floor((now.getTime() - new Date(r.created_at).getTime()) / JOUR))) : null;

  // Recommandations : clients arrivés par un client ou le bouche à oreille
  const recoms = (ctx.clients || []).filter(c => c.parrain_id || /recommand|bouche/i.test(c.source || ''));
  const recomMois = recoms.filter(c => c.created_at && String(c.created_at).slice(0, 7) === mois).length;

  return {
    mois, libelle: MOIS[now.getMonth()],
    seances: { v: m.length, avant: p.length },
    ca: { v: ca(m), avant: ca(p), encaisse: encaisse(m) },
    gainMoyen: { v: gainMoyen, clients: nbClients },
    reviennent: { pct: tousClients ? Math.round(reviennent / tousClients * 100) : null, n: reviennent, sur: tousClients },
    devis: { pct: tauxDevis, acc, ref, total: dv.length },
    demandes: { n: att.length, jours: plusVieille },
    recoms: { total: recoms.length, mois: recomMois }
  };
}

// ---------- Affichage ----------
const nb = n => new Intl.NumberFormat('fr-FR').format(Math.round(n));
function argent(n){
  if(n == null) return '-';
  if(Math.abs(n) >= 1e6) return (Math.round(n / 1e4) / 100).toString().replace('.', ',') + ' M F';
  return nb(n) + ' F';
}
function delta(v, avant, fmt){
  if(avant == null || avant === 0 && v === 0) return 'comme le mois dernier';
  const d = v - avant;
  if(d === 0) return 'comme le mois dernier';
  return (d > 0 ? '+' : '-') + (fmt ? fmt(Math.abs(d)) : nb(Math.abs(d))) + ' sur le mois dernier';
}
function tuiles(r){
  return [
    { l: 'Séances ce mois', v: String(r.seances.v), s: delta(r.seances.v, r.seances.avant), bien: r.seances.v >= r.seances.avant },
    { l: 'Chiffre d\'affaires', v: argent(r.ca.v), s: r.ca.v || r.ca.avant ? delta(r.ca.v, r.ca.avant, argent) + ' · encaissé ' + argent(r.ca.encaisse) : 'Aucune séance ce mois', bien: r.ca.v >= r.ca.avant },
    { l: 'Gain moyen par client', v: argent(r.gainMoyen.v), s: r.gainMoyen.clients ? 'sur ' + r.gainMoyen.clients + ' client' + (r.gainMoyen.clients > 1 ? 's' : '') + ', 12 derniers mois' : 'Pas encore de séance faite' },
    { l: 'Clients qui reviennent', v: r.reviennent.pct == null ? '-' : r.reviennent.pct + ' %', s: r.reviennent.sur ? r.reviennent.n + ' sur ' + r.reviennent.sur + ' ont fait 2 séances ou plus' : 'Pas encore de séance faite' },
    { l: 'Devis acceptés', v: r.devis.pct == null ? '-' : r.devis.pct + ' %', s: r.devis.pct == null ? (r.devis.total ? 'Aucune réponse notée sur tes devis' : 'Aucun devis pour le moment') : r.devis.acc + ' accepté' + (r.devis.acc > 1 ? 's' : '') + ', ' + r.devis.ref + ' refusé' + (r.devis.ref > 1 ? 's' : '') },
    { l: 'Demandes en attente', v: String(r.demandes.n), s: r.demandes.n ? 'la plus ancienne date de ' + r.demandes.jours + ' jour' + (r.demandes.jours > 1 ? 's' : '') : 'Tout est traité', bien: r.demandes.n === 0 || r.demandes.jours <= 1 },
    { l: 'Recommandations', v: String(r.recoms.total), s: r.recoms.mois ? '+' + r.recoms.mois + ' ce mois-ci' : 'clients venus par recommandation' }
  ];
}
let donnees = { devis: [], resas: [], charge: false, enCours: false };
function html(){
  let r; try {
    r = calculer({ now: new Date(), shoots: typeof shoots !== 'undefined' ? shoots : [], clients: typeof clients !== 'undefined' ? clients : [], devis: donnees.devis, resas: donnees.resas });
  } catch(e){ console.warn('croissance', e); return ''; }
  return `<div class="hzc-tete"><div class="hzc-tag">Ma croissance</div><div class="hzc-mois">${esc(r.libelle)}</div></div>
    <div class="hzc-grille">${tuiles(r).map(t => `<div class="hzc-t"><div class="hzc-l">${esc(t.l)}</div><div class="hzc-v">${esc(t.v)}</div><div class="hzc-s ${t.bien === false ? 'bas' : ''}">${esc(t.s)}</div></div>`).join('')}</div>`;
}
function rendre(){
  const el = document.getElementById('agDashMini'); if(!el) return;
  let c = document.getElementById('hzCroissance');
  if(!c){
    c = document.createElement('div'); c.id = 'hzCroissance'; c.className = 'hzc-card';
    const apres = document.getElementById('ppCarte') || el.querySelector('.ag-hello');
    if(apres && apres.nextSibling) el.insertBefore(c, apres.nextSibling); else el.insertBefore(c, el.firstChild);
  }
  // Si la carte "Prochain pas" arrive après nous, on repasse derrière elle
  const pp = document.getElementById('ppCarte');
  if(pp && pp.nextSibling !== c) pp.parentNode.insertBefore(c, pp.nextSibling);
  c.innerHTML = html();
}
async function charger(){
  if(donnees.enCours || donnees.charge || typeof sb === 'undefined') return;
  donnees.enCours = true;
  try { const r = await sb.from('devis').select('id,status'); if(!r.error) donnees.devis = r.data || []; } catch(e){}
  try { const r = await sb.from('reservations').select('id,status,created_at'); if(!r.error) donnees.resas = r.data || []; } catch(e){}
  donnees.charge = true; donnees.enCours = false; rendre();
}
window.hzCroissanceRecharger = function(){ donnees.charge = false; charger(); };
window.hzCroissanceCalculer = calculer;

function style(){
  if(document.getElementById('hzcStyle')) return;
  const s = document.createElement('style'); s.id = 'hzcStyle';
  s.textContent = `
  .hzc-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius-md,10px);padding:16px;margin:0 0 14px}
  .hzc-tete{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px}
  .hzc-tag{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:600}
  .hzc-mois{font-family:var(--font-display,inherit);font-size:14px;color:var(--text);text-transform:capitalize}
  .hzc-grille{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .hzc-t{background:var(--card2);border-radius:var(--radius-md,10px);padding:12px;min-width:0}
  .hzc-l{font-size:11px;color:var(--muted)}
  .hzc-v{font-family:var(--font-display,inherit);font-size:28px;line-height:1.15;color:var(--text);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .hzc-s{font-size:12px;color:var(--accent);margin-top:4px;line-height:1.35}
  .hzc-s.bas{color:var(--muted)}`;
  document.head.appendChild(s);
}
function brancher(){
  style();
  if(typeof agRenderDashMini === 'function' && !agRenderDashMini.__hzc){
    const base = agRenderDashMini;
    agRenderDashMini = window.agRenderDashMini = function(){ const r = base.apply(this, arguments); try { rendre(); } catch(e){} return r; };
    agRenderDashMini.__hzc = true;
  }
  charger(); rendre();
}
if(typeof document !== 'undefined' && typeof window !== 'undefined' && document.body){
  let essais = 0;
  const t = setInterval(() => {
    if(typeof agRenderDashMini === 'function' && typeof shoots !== 'undefined' && typeof sb !== 'undefined'){ clearInterval(t); brancher(); }
    else if(++essais > 60) clearInterval(t);
  }, 500);
}
})();
