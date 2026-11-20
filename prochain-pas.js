// ============================================================
// PROCHAIN-PAS.JS v1 - Bloc « Prochain pas » sur l'écran d'accueil
//   UNE seule action du moment, avec la raison en UNE phrase, choisie selon la vision
//   de Henzo Studio (faire grandir l'entreprise). Calcul 100 % local, sans IA,
//   à partir des séances, clients, devis, contrats, paiements et relances déjà dans l'app.
//   Règles absolues : jamais de prix bradés, contrat signé + acompte avant une séance,
//   une seule relance polie par client, promos seulement pour un grand événement.
//   Mémoire sur l'appareil (localStorage 'hz_prochain_pas') : pas « faits » ou « plus tard ».
// ============================================================
(function(){
'use strict';
const CLE = 'hz_prochain_pas';
const DEVIS_JOURS = 5;          // un devis sans réponse depuis X jours reçoit UNE relance polie
const PP = { cur: null, steps: [], loading: false };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = n => new Intl.NumberFormat('fr-FR').format(Math.round(Number(n) || 0)).replace(/ | /g, ' ') + ' F';
const pad = n => String(n).padStart(2, '0');
const jourDe = d => { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const ecart = (a, b) => Math.round((Date.parse(a + 'T12:00:00') - Date.parse(b + 'T12:00:00')) / 864e5); // a - b en jours
// Accès sûrs aux données globales de l'app (déclarées dans les autres fichiers)
const g = nom => { try { switch(nom){
  case 'shoots': return typeof shoots !== 'undefined' ? shoots : undefined;
  case 'clients': return typeof clients !== 'undefined' ? clients : undefined;
  case 'PX': return typeof PX !== 'undefined' ? PX : undefined;
  case 'CT': return typeof CT !== 'undefined' ? CT : window.CT;
  case 'CRM': return typeof CRM !== 'undefined' ? CRM : undefined;
} } catch(e){} return undefined; };
const dateFr = iso => { try { return new Date(String(iso).slice(0, 10) + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); } catch(e){ return String(iso).slice(0, 10); } };
const dateCourte = iso => { try { return new Date(String(iso).slice(0, 10) + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }); } catch(e){ return String(iso).slice(0, 10); } };

// ---------- Mémoire sur l'appareil ----------
// { jour: 'AAAA-MM-JJ', vus: [clés vues ou reportées aujourd'hui], faits: { clé: 'AAAA-MM-JJ' } }
function lire(){
  let m = null; try { m = JSON.parse(localStorage.getItem(CLE) || 'null'); } catch(e){}
  if(!m || typeof m !== 'object') m = {};
  if(!Array.isArray(m.vus)) m.vus = [];
  if(!m.faits || typeof m.faits !== 'object') m.faits = {};
  const auj = jourDe();
  if(m.jour !== auj){ m.jour = auj; m.vus = []; }
  Object.keys(m.faits).forEach(k => { if(Math.abs(ecart(auj, m.faits[k])) > 400) delete m.faits[k]; });
  return m;
}
function garder(m){ try { localStorage.setItem(CLE, JSON.stringify(m)); } catch(e){} }
// Après « Fait », combien de jours avant de reproposer le même pas (null = jamais : une seule relance par devis)
const ATTENTE = { paiement: 7, contrat: 1, devis: null, relance: 45, anniversaire: 300, creux: 3, offre: 60, avis: 90 };
function masque(step, m){
  if(m.vus.includes(step.cle)) return true;
  const f = m.faits[step.cle]; if(!f) return false;
  const att = ATTENTE[step.type];
  return att == null || ecart(jourDe(), f) < att;
}

// ---------- Vision (lue dans VISION_HENZO, avec valeurs de secours si absente ou désactivée) ----------
const REGLES_SECOURS = {
  prix: "Ne jamais brader mes prix",
  contrat: "Toujours un contrat signé et un acompte avant une séance",
  relance: "Une seule relance polie par client, puis attendre",
  promo: "Une promo n'est possible que pour un grand événement populaire, limitée dans le temps, sans baisser le tarif de base."
};
function vision(){ try { return (typeof window.VISION_HENZO === 'function' && window.VISION_HENZO()) || {}; } catch(e){ return {}; } }
function lignes(t){ return String(t || '').split('\n').map(x => x.trim()).filter(Boolean); }
function regle(re, secours){
  const l = lignes(vision().regles).find(x => re.test(x));
  return (l || secours).replace(/[.\s]+$/, '');
}
function zone(){ const z = String(vision().zone || '').trim(); return z || "Bouaké d'abord, puis Abidjan."; }
function idees(){ const l = lignes(vision().idees); return l.length ? l : ['Mini-séances thématiques pour les jours creux']; }

// ---------- Mots refusés de « Mon contexte » : jamais dans les textes du bloc ----------
function motsRefuses(){
  const out = new Set();
  try { const ev = (window.ST_MARQUE && window.ST_MARQUE.mots && window.ST_MARQUE.mots.evite) || {}; Object.keys(ev).forEach(k => out.add(k)); } catch(e){}
  try { if(typeof cxTexte === 'function') String(cxTexte('mots_refuses')).split(/[,;\n]+/).forEach(w => { w = w.trim().toLowerCase(); if(w && w.length <= 40) out.add(w); }); } catch(e){}
  return [...out].filter(Boolean);
}
function propre(t){
  let s = String(t || '');
  let change = false;
  motsRefuses().forEach(w => {
    const e = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('(^|[^\\p{L}])' + e + '([^\\p{L}]|$)', 'giu');
    if(re.test(s)){ change = true; s = s.replace(re, '$1$2'); }
  });
  return change ? s.replace(/\s{2,}/g, ' ').replace(/\s+([.,;!?])/g, '$1').trim() : s;
}

// ---------- Données ----------
const annule = s => /annul/i.test((s && s.status) || '');
const prix = s => Number(s.price) || 0;
const recu = s => Number(s.montant_recu) || (s.payment === 'paye' ? prix(s) : 0);
const seances = () => (g('shoots') || []).filter(s => s && s.date && !annule(s) && !s.collab);
const client = id => (g('clients') || []).find(c => c.id === Number(id));
const nomDe = id => { const c = client(id); return c && c.name ? c.name : 'ce client'; };
function crmJours(id){ // jours depuis le dernier message au client (null si jamais)
  try { const msgs = ((g('CRM') || {}).msgs || []).filter(m => m.client_id === Number(id)); if(!msgs.length) return null;
    return Math.max(0, Math.floor((Date.now() - new Date(msgs[0].created_at).getTime()) / 864e5)); } catch(e){ return null; }
}
function contratSigne(shootId){
  const CT = g('CT'); if(!CT || !CT.charge) return null; // inconnu tant que les contrats ne sont pas chargés
  return (CT.liste || []).some(c => c.shoot_id === shootId && c.statut === 'signe');
}
function contratDe(shootId){ const CT = g('CT'); return CT && CT.liste ? CT.liste.find(c => c.shoot_id === shootId) : null; }

// ---------- Calcul des pas, du plus important au moins important ----------
function calculer(){
  const aujourdhui = jourDe(), S = seances(), L = [];
  const rP = regle(/prix|brader/i, REGLES_SECOURS.prix), rC = regle(/contrat|acompte/i, REGLES_SECOURS.contrat), rR = regle(/relance/i, REGLES_SECOURS.relance);

  // 1) Paiement ou acompte en retard (séance passée, reste à payer)
  S.filter(s => String(s.date).slice(0, 10) < aujourdhui && s.payment !== 'paye' && prix(s) - recu(s) > 0)
    .map(s => ({ s, reste: prix(s) - recu(s), j: ecart(aujourdhui, String(s.date).slice(0, 10)) }))
    .sort((a, b) => b.j - a.j || b.reste - a.reste)
    .forEach(({ s, reste, j }) => L.push({ type: 'paiement', cle: 'paiement:' + s.id, p: 1,
      titre: 'Relancer le paiement de ' + nomDe(s.client_id),
      raison: `${nomDe(s.client_id)} doit encore ${nf(reste)} pour la séance du ${dateCourte(s.date)}, il y a ${j} jour${j > 1 ? 's' : ''}.`,
      regle: rR, bouton: 'Encaisser ou relancer', fait: 'Relance envoyée',
      go: () => typeof openPaiementSeance === 'function' ? openPaiementSeance(s.id) : openShootModal(s.id) }));

  // 2) Séance à venir (14 jours) sans contrat signé ou sans acompte
  S.filter(s => { const j = ecart(String(s.date).slice(0, 10), aujourdhui); return j >= 0 && j <= 14 && prix(s) > 0; })
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .forEach(s => {
      const signe = contratSigne(s.id), acompte = recu(s) > 0;
      if(signe !== false && acompte) return;
      const sans = signe === false && !acompte ? 'sans contrat signé ni acompte' : signe === false ? 'sans contrat signé' : "sans acompte";
      const j = ecart(String(s.date).slice(0, 10), aujourdhui);
      const ct = contratDe(s.id);
      L.push({ type: 'contrat', cle: 'contrat:' + s.id, p: 2,
        titre: signe === false ? 'Sécuriser la séance de ' + nomDe(s.client_id) : "Demander l'acompte de " + nomDe(s.client_id),
        raison: `La séance de ${nomDe(s.client_id)} a lieu ${j === 0 ? "aujourd'hui" : j === 1 ? 'demain' : 'le ' + dateFr(s.date)} ${sans}.`,
        regle: rC, bouton: signe === false ? (ct ? 'Ouvrir le contrat' : 'Préparer le contrat') : "Enregistrer l'acompte", fait: signe === false ? 'Contrat prêt' : 'Acompte reçu',
        go: () => { if(signe === false){ if(ct && typeof ctEditer === 'function') ctEditer(ct.id); else if(typeof ctNouveau === 'function') ctNouveau(s.id); else openShootModal(s.id); }
          else if(typeof openPaiementSeance === 'function') openPaiementSeance(s.id); else openShootModal(s.id); } });
    });

  // 3) Devis envoyé sans réponse depuis X jours : UNE seule relance polie, puis attendre
  (((g('PX') || {}).devis) || []).filter(d => d.status === 'envoye' && d.created_at)
    .map(d => ({ d, j: ecart(aujourdhui, jourDe(new Date(d.created_at))) })).filter(x => x.j >= DEVIS_JOURS).sort((a, b) => b.j - a.j)
    .forEach(({ d, j }) => L.push({ type: 'devis', cle: 'devis:' + d.id, p: 3,
      titre: 'Relancer poliment le devis de ' + (d.client_name || nomDe(d.client_id)),
      raison: `Le devis de ${nf(d.total)} attend une réponse depuis ${j} jours : une seule relance polie, puis on attend.`,
      regle: rR, bouton: 'Ouvrir le devis', fait: 'Relance envoyée',
      go: () => typeof pxOpenQuote === 'function' ? pxOpenQuote(d.id) : (typeof agGoTab === 'function' && agGoTab('tarifs')) }));

  // 4) Client à relancer ou anniversaire (crm.js)
  try {
    if(typeof crmSuggestions === 'function') crmSuggestions().filter(x => x.k === 'anniversaire' || x.k === 'relance').forEach(x => {
      const an = x.k === 'anniversaire', nom = x.c.name || 'ce client';
      L.push({ type: an ? 'anniversaire' : 'relance', cle: (an ? 'anniv:' : 'relance:') + x.c.id + (an ? ':' + aujourdhui.slice(0, 4) : ''), p: 4, sous: an ? 0 : 1,
        titre: an ? 'Souhaiter son anniversaire à ' + nom : 'Reprendre contact avec ' + nom,
        raison: an ? `L'anniversaire de ${nom} ${x.s.bday === 0 ? "est aujourd'hui" : 'est dans ' + x.s.bday + ' jour' + (x.s.bday > 1 ? 's' : '')} : un mot attentionné fidélise.`
          : `${nom} n'est pas revenu depuis ${x.s.days >= 60 ? Math.round(x.s.days / 30) + ' mois' : x.s.days + ' jours'} : un message courtois et unique peut le faire revenir.`,
        regle: rR, bouton: 'Ouvrir la fiche', fait: 'Message envoyé', go: () => crmOpenClient(x.c.id) });
    });
  } catch(e){}

  // 5) Jour creux à remplir : mini-séance thématique, au tarif habituel
  try {
    const libres = [];
    for(let i = 1; i <= 7; i++){ const d = new Date(); d.setDate(d.getDate() + i); const j = jourDe(d);
      if(!(g('shoots') || []).some(s => s.date && !annule(s) && String(s.date).slice(0, 10) === j)) libres.push({ j, dow: d.getDay() }); }
    if(libres.length >= 4){
      const pref = libres.find(x => x.dow >= 2 && x.dow <= 4) || libres[0];
      let theme = '';
      try { const f = typeof crmFetes === 'function' ? crmFetes().find(x => x.j >= 7 && x.j <= 45) : null; if(f) theme = f.n; } catch(e){}
      const idee = idees().find(x => /mini/i.test(x)) || idees()[0];
      L.push({ type: 'creux', cle: 'creux:' + pref.j, p: 5,
        titre: 'Remplir ' + dateFr(pref.j),
        raison: `Aucune séance n'est prévue le ${dateFr(pref.j)} : ${theme ? 'une mini-séance autour de « ' + theme + ' »' : 'une mini-séance thématique'} peut remplir ce jour, au tarif habituel.`,
        regle: idee.replace(/[.\s]+$/, '') + '. ' + zone().replace(/[.\s]+$/, ''),
        bouton: 'Créer la séance', fait: 'Mini-séance annoncée', go: () => openShootModal() });
    }
  } catch(e){}

  // 6) Album, tirage, cadre, forfait famille ou parrainage à un client récent
  // 7) Demander un avis ou une recommandation après la séance
  try {
    const par = {}; S.filter(s => String(s.date).slice(0, 10) <= aujourdhui && s.client_id).forEach(s => { (par[s.client_id] = par[s.client_id] || []).push(s); });
    Object.keys(par).forEach(id => {
      const c = client(id); if(!c || (typeof window.estClient === 'function' && !window.estClient(c))) return;
      const l = par[id].sort((a, b) => String(b.date).localeCompare(String(a.date))), der = l[0], j = ecart(aujourdhui, String(der.date).slice(0, 10)), mj = crmJours(id);
      if(((g('shoots') || []).some(s => s.client_id === c.id && !annule(s) && String(s.date).slice(0, 10) > aujourdhui))) return; // il a déjà une séance prévue
      const solde = prix(der) - recu(der) <= 0;
      if(j >= 7 && j <= 45 && solde && (mj == null || mj >= 14)){
        const fam = l.length >= 2;
        L.push({ type: 'offre', cle: 'offre:' + id, p: 6,
          titre: (fam ? 'Proposer un forfait famille à ' : 'Proposer un album à ') + c.name,
          raison: fam ? `${c.name} revient régulièrement : le forfait famille ou le parrainage prolonge la relation, sans toucher au tarif de base.`
            : `La séance de ${c.name} date d'il y a ${j} jours : c'est le bon moment de présenter un album, des tirages ou un cadre.`,
          regle: rP, bouton: 'Ouvrir la fiche', fait: 'Offre proposée', go: () => crmOpenClient(c.id) });
      }
      if(j >= 2 && j <= 21 && solde && (mj == null || mj >= 7))
        L.push({ type: 'avis', cle: 'avis:' + id + ':' + String(der.date).slice(0, 10), p: 7,
          titre: 'Demander un avis à ' + c.name,
          raison: `${c.name} a vu ses photos il y a ${j} jours : un avis ou une recommandation amène de nouveaux clients à Henzo Studio.`,
          regle: rR, bouton: 'Ouvrir la fiche', fait: 'Message envoyé', go: () => crmOpenClient(c.id) });
    });
  } catch(e){}

  return L.sort((a, b) => a.p - b.p || (a.sous || 0) - (b.sous || 0));
}

// ---------- Rendu ----------
function css(){
  if(document.getElementById('ppCss')) return;
  const s = document.createElement('style'); s.id = 'ppCss';
  s.textContent = `#ppCard{background:var(--card);border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:10px;padding:16px;margin:12px 0;color:var(--text)}
  #ppCard .pp-k{font-family:var(--font-display,Fraunces,Georgia,serif);font-size:20px;font-weight:600;margin:0 0 10px;color:var(--text);letter-spacing:.2px}
  #ppCard .pp-t{font-size:16px;font-weight:700;margin:0 0 6px;line-height:1.3;color:var(--text)}
  #ppCard .pp-r{font-size:14px;line-height:1.5;margin:0 0 10px;color:var(--text)}
  #ppCard .pp-g{font-size:12px;line-height:1.4;margin:0 0 14px;color:var(--muted)}
  #ppCard .pp-go{display:block;width:100%;min-height:50px;border:0;border-radius:4px;background:var(--accent);color:var(--on-accent,var(--bg));font:inherit;font-size:16px;font-weight:700;cursor:pointer;padding:12px 16px}
  #ppCard .pp-row{display:flex;gap:8px;margin-top:8px}
  #ppCard .pp-sec{flex:1;min-height:44px;border:1px solid var(--border-2,var(--border));border-radius:4px;background:transparent;color:var(--text);font:inherit;font-size:14px;cursor:pointer;padding:10px 12px}
  #ppCard button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  #ppCard .pp-vide{font-size:14px;line-height:1.5;margin:0 0 12px;color:var(--text)}`;
  document.head.appendChild(s);
}
function html(){
  const m = lire(), restants = PP.steps.filter(x => !masque(x, m));
  PP.cur = restants[0] || null;
  if(!PP.cur){
    const reportes = PP.steps.filter(x => m.vus.includes(x.cle)).length;
    return `<div class="pp-k">Prochain pas</div><p class="pp-vide">Rien d'urgent pour le moment. Continuez à faire grandir Henzo Studio, un pas à la fois.</p>${reportes ? '<button class="pp-sec" style="width:100%" onclick="ppRevoir()">Revoir les pas reportés</button>' : ''}`;
  }
  const s = PP.cur;
  return `<div class="pp-k">Prochain pas</div>
    <p class="pp-t">${esc(propre(s.titre))}</p>
    <p class="pp-r">${esc(propre(s.raison))}</p>
    ${s.regle ? `<p class="pp-g">${esc(propre(s.regle))}</p>` : ''}
    <button class="pp-go" onclick="ppAller()">${esc(s.bouton)}</button>
    <div class="pp-row"><button class="pp-sec" onclick="ppFait()">${esc(s.fait || 'Fait')}</button><button class="pp-sec" onclick="ppPlusTard()">Plus tard</button></div>`;
}
function rendre(){
  css();
  const hote = document.getElementById('agDashMini'); if(!hote) return;
  let el = document.getElementById('ppCard');
  if(!el){
    el = document.createElement('div'); el.id = 'ppCard'; el.setAttribute('aria-live', 'polite');
    const salut = hote.querySelector('.ag-hello');
    if(salut && salut.nextSibling) hote.insertBefore(el, salut.nextSibling); else hote.insertBefore(el, hote.firstChild);
  }
  try { PP.steps = calculer(); el.innerHTML = html(); } catch(e){ console.warn('prochain-pas', e); el.remove(); }
}
// Données lourdes à charger une fois (devis, contrats, historique de messages), puis on redessine
async function charger(){
  if(PP.loading) return; PP.loading = true;
  try {
    const jobs = [];
    const CT = g('CT'); if(CT && !CT.charge && typeof ctCharger === 'function') jobs.push(ctCharger());
    const PXv = g('PX'); if(PXv && !PXv.loaded && typeof pxLoad === 'function') jobs.push(pxLoad());
    const CR = g('CRM'); if(CR && !CR.loaded && typeof crmLoad === 'function') jobs.push(crmLoad());
    if(jobs.length){ await Promise.allSettled(jobs); if(document.getElementById('ppCard')) rendre(); }
  } catch(e){} PP.loading = false;
}

// ---------- Boutons ----------
window.ppAller = function(){
  const s = PP.cur; if(!s) return;
  const m = lire(); m.vus.push(s.cle); garder(m);   // pas répété le même jour
  try { s.go(); } catch(e){ console.warn('prochain-pas', e); }
  rendre();
};
window.ppFait = function(){
  const s = PP.cur; if(!s) return;
  const m = lire(); m.faits[s.cle] = jourDe(); m.vus.push(s.cle); garder(m); rendre();
};
window.ppPlusTard = function(){
  const s = PP.cur; if(!s) return;
  const m = lire(); m.vus.push(s.cle); garder(m); rendre();
};
window.ppRevoir = function(){ const m = lire(); m.vus = []; garder(m); rendre(); };
window.prochainPas = function(){ return PP.steps.slice(); };   // pour les tests

// ---------- Branchement sur l'accueil ----------
if(typeof agRenderDashMini === 'function'){
  const _o = agRenderDashMini;
  agRenderDashMini = window.agRenderDashMini = function(){
    const r = _o.apply(this, arguments);
    try { rendre(); charger(); } catch(e){ console.warn('prochain-pas', e); }
    return r;
  };
  const p = document.getElementById('page-dash');
  if(p && p.classList.contains('active')) setTimeout(() => { try { agRenderDashMini(); } catch(e){} }, 300);
}
})();
