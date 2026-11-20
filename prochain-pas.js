// ============================================================
// PROCHAIN-PAS.JS - "Prochain pas" sur l'accueil
// ------------------------------------------------------------
// UNE seule action du moment, avec la raison en une phrase, un bouton direct
// et "Plus tard". Calcul 100 % local (pas d'IA), à partir des séances, clients,
// contrats, devis et messages de l'app. Suit la Vision Henzo Studio :
// contrat signé + acompte avant la séance, une seule relance par client,
// jamais de baisse de prix. Pas faits / "plus tard" gardés sur l'appareil.
// ============================================================
(function(){
'use strict';
const CLE = 'hz_prochain_pas';
const JOUR = 864e5;
const esc = s => (typeof agEsc === 'function' ? agEsc(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
const F = n => (typeof agF === 'function' ? agF(n) : Math.round(n) + ' F');

// ---------- Mémoire (sur l'appareil) ----------
function memoLire(){ try { const m = JSON.parse(localStorage.getItem(CLE) || 'null'); return m && typeof m === 'object' ? m : {}; } catch(e){ return {}; } }
function memoEcrire(m){
  const now = Date.now();
  Object.keys(m).forEach(k => { if(!(m[k] > now)) delete m[k]; }); // on oublie ce qui est expiré
  try { localStorage.setItem(CLE, JSON.stringify(m)); } catch(e){}
}

// ---------- Outils de date ----------
const jourStr = d => { d = new Date(d); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const jourDe = s => String(s || '').slice(0, 10);
function ecart(now, dateStr){ // jours entre aujourd'hui et une date (positif = dans le futur)
  const a = new Date(jourStr(now) + 'T12:00:00'), b = new Date(jourDe(dateStr) + 'T12:00:00');
  return Math.round((b - a) / JOUR);
}
const dateLongue = s => new Date(jourDe(s) + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
const quand = n => n === 0 ? "aujourd'hui" : n === 1 ? 'demain' : 'dans ' + n + ' jours';
const prenom = c => { const n = String((c && c.name) || '').replace(/^(mr|mme|mlle|m\.)\s+/i, '').trim().split(/\s+/)[0] || ''; return n; };

// ---------- Le calcul (pur : reçoit tout, ne touche à rien) ----------
// ctx : { now, shoots, clients, contrats, devis, msgs, suggestions }
// Renvoie la liste des pas possibles, du plus important au moins important.
function calculer(ctx){
  const now = ctx.now || new Date();
  const shoots = (ctx.shoots || []).filter(s => !/annul/i.test(s.status || ''));
  const clients = ctx.clients || [];
  const contrats = ctx.contrats || [];
  const msgs = ctx.msgs || [];
  const client = id => clients.find(c => c.id === id) || null;
  const nom = s => { const c = client(s.client_id); return c ? c.name : (s.client_name || 'Un client'); };
  const joursDernierMsg = id => {
    const m = msgs.filter(x => x.client_id === id).map(x => new Date(x.created_at).getTime()).sort((a, b) => b - a)[0];
    return m ? Math.floor((now.getTime() - m) / JOUR) : null;
  };
  const out = [];
  const add = p => out.push(p);

  // 1. Paiement en retard (séance passée, reste à payer)
  shoots.forEach(s => {
    if(!s.date || !(Number(s.price) > 0)) return;
    const j = ecart(now, s.date); // négatif = passée
    const reste = Number(s.price) - (Number(s.montant_recu) || 0);
    if(j <= -2 && reste > 0 && s.payment !== 'paye'){
      const dm = s.client_id ? joursDernierMsg(s.client_id) : null;
      if(dm != null && dm < 5) return; // une seule relance polie, puis on attend
      add({ cle: 'paiement:' + s.id, p: 10, tri: j, type: 'paiement', icone: 'wallet',
        titre: `Paiement en retard : ${nom(s)}`,
        raison: `Il reste ${F(reste)} à encaisser pour la séance du ${dateLongue(s.date)}.`,
        bouton: 'Envoyer le lien de paiement', agir: { fn: 'lienPaiement', id: s.id }, jours: 2 });
    }
  });

  // 2. Séance à venir sans contrat signé, puis sans acompte
  const venir = shoots.filter(s => s.date && ecart(now, s.date) >= 0 && ecart(now, s.date) <= 21).sort((a, b) => jourDe(a.date).localeCompare(jourDe(b.date)));
  venir.forEach(s => {
    const j = ecart(now, s.date);
    const urg = j <= 3 ? 0 : j <= 10 ? 1 : 2;
    const cts = contrats.filter(c => c.shoot_id === s.id && c.statut !== 'archive');
    const signe = cts.some(c => c.statut === 'signe');
    if(!signe){
      const ct = cts[0];
      add({ cle: 'contrat:' + s.id, p: 20 + urg, tri: j, type: 'contrat', icone: 'note',
        titre: ct ? `Faire signer le contrat de ${nom(s)}` : `Préparer le contrat de ${nom(s)}`,
        raison: `La séance a lieu ${quand(j)} (${dateLongue(s.date)}) et la règle est : contrat signé avant la séance.`,
        bouton: ct ? 'Ouvrir le contrat' : 'Préparer le contrat', agir: ct ? { fn: 'contrat', id: ct.id } : { fn: 'nouveauContrat', id: s.id }, jours: 2 });
    }
    if(Number(s.price) > 0 && !(Number(s.montant_recu) > 0)){
      add({ cle: 'acompte:' + s.id, p: 23 + urg, tri: j, type: 'acompte', icone: 'wallet',
        titre: `Acompte à demander : ${nom(s)}`,
        raison: `Aucun acompte reçu pour la séance ${quand(j)} (${dateLongue(s.date)}) : il est requis avant de réserver la date.`,
        bouton: "Envoyer le lien d'acompte", agir: { fn: 'lienPaiement', id: s.id }, jours: 2 });
    }
  });

  // 3. Devis sans réponse : UNE seule relance, puis on attend
  (ctx.devis || []).forEach(d => {
    if(d.status !== 'envoye' || !d.client_id || !d.created_at) return;
    const age = Math.floor((now.getTime() - new Date(d.created_at).getTime()) / JOUR);
    if(age < 4 || age > 45) return;
    const dejaRelance = msgs.some(m => m.client_id === d.client_id && new Date(m.created_at) > new Date(d.created_at));
    if(dejaRelance) return;
    const c = client(d.client_id); if(!c) return;
    add({ cle: 'devis:' + d.id, p: 30, tri: -age, type: 'devis', icone: 'note',
      titre: `Devis sans réponse : ${c.name}`,
      raison: `Envoyé il y a ${age} jours, sans nouvelles. Une seule relance polie, puis on attend.`,
      bouton: 'Écrire la relance', agir: { fn: 'ecrire', ids: [c.id], goal: 'relance', idee: `Relance polie et unique du devis envoyé il y a ${age} jours. Ne pas baisser le prix, ne pas proposer de réduction.` }, jours: 30 });
  });

  // 4. Clients (anniversaire, remerciement et avis, relance) – calculés par crm.js
  (ctx.suggestions || []).forEach(x => {
    if(!x || !x.c) return;
    const k = x.k;
    const p = k === 'anniversaire' ? 40 : k === 'merci' ? 41 : k === 'relance' ? 44 : 46;
    const titre = k === 'anniversaire' ? `Anniversaire de ${x.c.name}` : k === 'merci' ? `Demander un avis à ${x.c.name}` : k === 'relance' ? `Faire revenir ${x.c.name}` : `Remercier ${x.c.name}`;
    const raison = k === 'merci' ? `Sa séance date de ${x.s.days} jour${x.s.days > 1 ? 's' : ''} : c'est le bon moment pour un remerciement et une recommandation.`
      : k === 'anniversaire' ? `${x.t}. Un message élégant renforce la relation.`
      : k === 'relance' ? `${x.t}. Un message poli pour lui donner envie de revenir.`
      : `${x.t} : un mot de remerciement pour sa fidélité.`;
    add({ cle: 'client:' + k + ':' + x.c.id, p, tri: x.s.days == null ? 0 : -x.s.days, type: 'client', icone: 'users', titre, raison,
      bouton: k === 'merci' ? 'Écrire le message' : 'Écrire le message', agir: { fn: 'ecrire', ids: [x.c.id], goal: k }, jours: 30 });
  });

  // 5. Client récent : album, tirage, forfait famille, parrainage
  const parClient = {};
  shoots.forEach(s => { if(s.client_id) (parClient[s.client_id] = parClient[s.client_id] || []).push(s); });
  Object.keys(parClient).forEach(id => {
    const ss = parClient[id];
    const faites = ss.filter(s => s.date && ecart(now, s.date) < 0);
    const aVenir = ss.some(s => s.date && ecart(now, s.date) >= 0);
    if(!faites.length || aVenir) return;
    const derniere = faites.map(s => jourDe(s.date)).sort().pop();
    const age = -ecart(now, derniere);
    if(age < 4 || age > 30) return;
    const c = client(ss[0].client_id); if(!c) return;
    if(joursDernierMsg(c.id) != null && joursDernierMsg(c.id) < 21) return;
    const fidele = faites.length >= 2;
    const idee = fidele ? 'Proposer le forfait famille à l\'année et le parrainage, sans réduction de tarif.' : 'Proposer un album photo, des tirages ou un cadre avec ses photos, au tarif normal.';
    add({ cle: 'offre:' + c.id, p: 50, tri: age, type: 'offre', icone: 'sparkles',
      titre: fidele ? `Proposer le forfait famille à ${c.name}` : `Proposer un album ou des tirages à ${c.name}`,
      raison: `Sa dernière séance date de ${age} jours : ses photos sont encore fraîches, c'est le moment ${fidele ? 'du forfait famille et du parrainage' : "d'un album ou d'un tirage"}.`,
      bouton: 'Écrire la proposition', agir: { fn: 'ecrire', ids: [c.id], goal: 'relance', idee }, jours: 30 });
  });

  // 6. Jour creux : peu de séances dans les 7 prochains jours
  const sem = shoots.filter(s => s.date && ecart(now, s.date) >= 0 && ecart(now, s.date) <= 7);
  if(sem.length < 2){
    add({ cle: 'creux:' + jourStr(new Date(now.getTime() - ((now.getDay() + 6) % 7) * JOUR)), p: 60, tri: 0, type: 'creux', icone: 'camera',
      titre: 'Semaine calme : lancer une mini-séance',
      raison: sem.length ? 'Une seule séance prévue ces 7 prochains jours : une mini-séance thématique, au tarif normal, remplit les jours creux.' : 'Aucune séance prévue ces 7 prochains jours : une mini-séance thématique, au tarif normal, remplit les jours creux.',
      bouton: 'Préparer le message', agir: { fn: 'miniSeance' }, jours: 7 });
  }

  return out.sort((a, b) => a.p - b.p || a.tri - b.tri);
}
// Premier pas qui n'est ni fait ni remis à plus tard
function choisir(liste, memo, now){
  const t = (now || new Date()).getTime();
  return liste.find(x => !(memo[x.cle] > t)) || null;
}

// ---------- Les actions ----------
const ACTIONS = {
  lienPaiement: a => { if(typeof genererLienPaiementClient === 'function') genererLienPaiementClient(a.id); else if(typeof openShootModal === 'function') openShootModal(a.id); },
  nouveauContrat: a => { if(typeof ctNouveau === 'function') ctNouveau(a.id); else agGoTab('studio'); },
  contrat: a => { if(typeof ctEditer === 'function'){ const go = () => ctEditer(a.id); if(typeof ctListe === 'function' && !(window.CT && CT.charge)) ctListe().then(go); else go(); } },
  ecrire: a => {
    if(typeof crmCompose !== 'function') return agGoTab('clients');
    crmCompose(a.ids, { goal: a.goal });
    if(a.idee && window.CRM && CRM.comp){ CRM.comp.idea = a.idee; if(typeof crmCompRender === 'function') crmCompRender(); }
  },
  miniSeance: () => {
    if(typeof crmCompose !== 'function') return agGoTab('clients');
    const t = Date.now();
    const recents = id => { const m = (CRM.msgs || []).filter(x => x.client_id === id).map(x => new Date(x.created_at).getTime()).sort((a, b) => b - a)[0]; return m && (t - m) < 21 * JOUR; };
    const ids = (typeof crmSegment === 'function' ? crmSegment('fideles').concat(crmSegment('inactifs')) : []).map(x => x.c.id).filter(id => !recents(id)).slice(0, 15);
    if(!ids.length) return agGoTab('clients');
    crmCompose(ids, { goal: 'relance' });
    if(window.CRM && CRM.comp){ CRM.comp.idea = 'Annoncer une mini-séance thématique, places limitées, au tarif habituel (sans réduction).'; if(typeof crmCompRender === 'function') crmCompRender(); }
  }
};

// ---------- Affichage ----------
let donnees = { contrats: [], devis: [], charge: false, enCours: false };
function contexte(){
  let sug = []; try { if(typeof crmSuggestions === 'function' && window.CRM && CRM.loaded) sug = crmSuggestions(); } catch(e){}
  return { now: new Date(), shoots: typeof shoots !== 'undefined' ? shoots : [], clients: typeof clients !== 'undefined' ? clients : [],
    contrats: donnees.contrats, devis: donnees.devis, msgs: (window.CRM && CRM.msgs) || [], suggestions: sug };
}
async function charger(){
  if(donnees.enCours || donnees.charge || typeof sb === 'undefined') return;
  donnees.enCours = true;
  try { if(window.CRM && !CRM.loaded && typeof crmLoad === 'function') await crmLoad(); } catch(e){}
  try { const r = await sb.from('contrats').select('id,shoot_id,client_id,statut'); if(!r.error) donnees.contrats = r.data || []; } catch(e){}
  try { const r = await sb.from('devis').select('id,client_id,status,created_at'); if(!r.error) donnees.devis = r.data || []; } catch(e){}
  donnees.charge = true; donnees.enCours = false;
  rendre();
}
let courant = null;
function carteHtml(){
  if(!donnees.charge) return '';
  let pas = null;
  try { pas = choisir(calculer(contexte()), memoLire()); } catch(e){ console.warn('prochain pas', e); }
  courant = pas;
  const ic = n => (typeof agIcon === 'function' ? agIcon(n, 20) : '');
  if(!pas) return `<div class="pp-card pp-calme"><div class="pp-tag">Prochain pas</div><div class="pp-titre">Tout est en ordre pour le moment</div><div class="pp-raison">Aucun contrat, acompte ou relance en attente. Bon moment pour penser à une nouvelle idée pour Henzo Studio.</div></div>`;
  return `<div class="pp-card"><div class="pp-tag">Prochain pas</div>
    <div class="pp-ligne"><div class="pp-ic">${ic(pas.icone)}</div><div class="pp-txt"><div class="pp-titre">${esc(pas.titre)}</div><div class="pp-raison">${esc(pas.raison)}</div></div></div>
    <div class="pp-btns"><button class="pp-go" onclick="ppFaire()">${esc(pas.bouton)}</button><button class="pp-plus" onclick="ppPlusTard()">Plus tard</button></div></div>`;
}
function rendre(){
  const el = document.getElementById('agDashMini'); if(!el) return;
  let h = document.getElementById('ppCarte');
  const html = carteHtml();
  if(!html){ if(h) h.remove(); return; }
  if(!h){
    h = document.createElement('div'); h.id = 'ppCarte';
    const tete = el.querySelector('.ag-hello');
    if(tete && tete.nextSibling) el.insertBefore(h, tete.nextSibling); else el.insertBefore(h, el.firstChild);
  }
  h.innerHTML = html;
}
window.ppFaire = function(){
  const pas = courant; if(!pas) return;
  const m = memoLire(); m[pas.cle] = Date.now() + (pas.jours || 2) * JOUR; memoEcrire(m);
  try { const f = ACTIONS[pas.agir.fn]; if(f) f(pas.agir); } catch(e){ console.warn('prochain pas', e); }
  rendre();
};
window.ppPlusTard = function(){
  const pas = courant; if(!pas) return;
  const m = memoLire(); m[pas.cle] = Date.now() + JOUR; memoEcrire(m);
  rendre();
};
window.ppRecharger = function(){ donnees.charge = false; donnees.enCours = false; charger(); };
window.ppCalculer = calculer; window.ppChoisir = choisir;

// ---------- Style (couleurs et arrondis de la charte, via les variables du thème) ----------
function style(){
  if(document.getElementById('ppStyle')) return;
  const s = document.createElement('style'); s.id = 'ppStyle';
  s.textContent = `
  .pp-card{background:var(--card);border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:var(--radius-md,10px);padding:16px;margin:0 0 14px}
  .pp-tag{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:600;margin-bottom:10px}
  .pp-ligne{display:flex;gap:12px;align-items:flex-start}
  .pp-ic{flex:0 0 auto;width:36px;height:36px;border-radius:var(--radius-md,10px);background:var(--card2);color:var(--accent);display:flex;align-items:center;justify-content:center}
  .pp-txt{min-width:0}
  .pp-titre{font-family:var(--font-display,inherit);font-size:16px;font-weight:600;color:var(--text);line-height:1.3}
  .pp-raison{font-size:14px;color:var(--muted);margin-top:4px;line-height:1.45}
  .pp-btns{display:flex;gap:10px;margin-top:14px;align-items:center;flex-wrap:wrap}
  .pp-go{background:var(--accent);color:var(--on-accent,var(--bg));border:0;border-radius:var(--radius-sm,4px);padding:10px 16px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit}
  .pp-plus{background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:var(--radius-sm,4px);padding:10px 14px;font-size:14px;cursor:pointer;font-family:inherit}
  .pp-calme{border-left-color:var(--border)}`;
  document.head.appendChild(s);
}

function brancher(){
  style();
  if(typeof agRenderDashMini === 'function' && !agRenderDashMini.__pp){
    const base = agRenderDashMini;
    agRenderDashMini = window.agRenderDashMini = function(){ const r = base.apply(this, arguments); try { rendre(); } catch(e){} return r; };
    agRenderDashMini.__pp = true;
  }
  charger();
}
if(typeof document !== 'undefined' && typeof window !== 'undefined' && document.body){
  let essais = 0;
  const t = setInterval(() => {
    if(typeof agRenderDashMini === 'function' && typeof crmSuggestions === 'function' && typeof shoots !== 'undefined'){ clearInterval(t); brancher(); }
    else if(++essais > 60) clearInterval(t);
  }, 500);
}
})();
