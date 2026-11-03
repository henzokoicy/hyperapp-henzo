// ============================================================
// ARGENT-PRECIS.JS - Rester précis sur les espèces et Wave
// ------------------------------------------------------------
// 1. Dépense rapide : montant + quoi (au micro ou au clavier), le
//    compte habituel est déjà choisi, la catégorie est devinée. 5 s.
// 2. Panier d'achats : plusieurs articles, payés en partie en espèces,
//    en partie sur Wave... L'app crée une dépense par compte, liées.
// 3. Faire ma caisse : tu comptes ce que tu as vraiment (billet par
//    billet si tu veux), l'app montre l'écart et tu le règles en un
//    geste (oublis, dépenses diverses du jour, entrée oubliée).
// 4. Résumé en phrases : jour par jour, ce qui est entré et sorti.
// 5. Boutons "i" : ce que veut dire "négatif", "solde de départ"...
// Règles d'argent : les mêmes que argent.js (une dépense part d'un
// compte, txs.unshift + refreshAll).
// ============================================================
(function(){
'use strict';
if(typeof txs === 'undefined' || typeof agSheet !== 'function') return;
const E = s => agEsc(String(s == null ? '' : s)), F = n => agF(n);
const AQ = { panier: null, caisse: null };
window.AQ = AQ;
const nd = s => String(s || '').replace(/[–—]/g, '-');
const auj = () => typeof todayStr === 'function' ? todayStr() : new Date().toISOString().slice(0, 10);
const ls = { get(k, d){ try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch(e){ return d; } }, set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} } };
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ---------- Comptes et catégories ----------
function aqComptes(){ return agActiveAccounts(); }
function aqEspeces(){ const L = aqComptes(); return L.find(a => a.kind === 'especes') || L.find(a => /esp[eè]ce|cash|caisse/i.test(a.name)) || L[0] || null; }
function aqCompteDef(){ const id = ls.get('aq_acc', null); return aqComptes().find(a => a.id === id) || aqEspeces(); }
function aqCats(){
  const base = (typeof CATEGORIES !== 'undefined' && CATEGORIES.depense) ? CATEGORIES.depense.slice() : ['Nourriture', 'Transport', 'Business', 'Autre'];
  const n = {}; txs.filter(t => t.type === 'depense' && !t.cancelled && t.category && !/^frais$/i.test(t.category)).slice(0, 300).forEach(t => { n[t.category] = (n[t.category] || 0) + 1; });
  const freq = Object.keys(n).sort((a, b) => n[b] - n[a]);
  return [...new Set(freq.slice(0, 6).concat(base))].slice(0, 12);
}
const AQ_MOTS = [
  [/taxi|moto|woro|gbaka|car\b|transport|carburant|essence|gasoil|ticket|tricycle/, ['transport']],
  [/riz|garba|manger|repas|nourriture|courses|marche|pain|eau|boisson|attieke|poisson|viande|huile|sucre|lait|biscuit/, ['nourriture', 'alimentation', 'repas']],
  [/credit|unite|forfait|internet|data|recharge|telephone|wifi/, ['communication', 'telephone', 'internet', 'business']],
  [/loyer|courant|cie|sodeci|eau courante|facture/, ['logement', 'charges']],
  [/pharmacie|medicament|hopital|clinique|sante|docteur/, ['sante']],
  [/batterie|carte memoire|objectif|flash|trepied|camera|appareil|papier photo|encre|impression|tirage/, ['materiel photo', 'materiel', 'business']],
  [/ecole|cours|livre|formation|inscription|memoire/, ['education']],
  [/sortie|cinema|maquis|bar|jeu|loisir|anniv/, ['loisirs']]
];
function aqDevine(quoi){
  const q = norm(quoi), cats = aqCats();
  for(const [re, cibles] of AQ_MOTS){
    if(!re.test(q)) continue;
    for(const c of cibles){ const f = cats.find(x => norm(x).includes(c)); if(f) return f; }
  }
  // Ce que tu as déjà noté avec le même mot
  const mot = q.split(/\s+/).find(w => w.length > 3);
  if(mot){ const t = txs.find(x => x.type === 'depense' && !x.cancelled && x.category && norm(x.note).includes(mot)); if(t) return t.category; }
  return null;
}
window.aqDevine = aqDevine;
async function aqDepense(acc, montant, category, note, details){
  const t = await dbInsert('transactions', { type: 'depense', amount: Math.round(montant), category: category || 'Autre', note: nd(note) || null, date: auj(), account_id: acc.id, payment_method: acc.name, details: details || null });
  if(t) txs.unshift(t);
  return t;
}
function aqPills(id, list, sel, extra){
  return `<div class="ag-pills aq-pills" id="${id}">${list.map(([v, l, s]) => `<button type="button" data-v="${E(v)}" class="${String(v) === String(sel) ? 'on' : ''}" onclick="agPick(this)${extra || ''}">${l}${s != null ? `<small class="ag-m">${s}</small>` : ''}</button>`).join('')}</div>`;
}
const aqCompteList = () => aqComptes().map(a => [a.id, E(a.name), F(agAccountBalance(a))]);

// ============================================================
// 1. DÉPENSE RAPIDE
// ============================================================
window.aqRapide = function(){
  const acc = aqCompteDef();
  if(!acc){ agToast('Crée d\'abord tes comptes', 'info'); return; }
  agSheet('aqRap', `<h3>Dépense rapide</h3>
    <input id="aqRMt" type="number" inputmode="decimal" class="big" placeholder="Montant">
    <input id="aqRQuoi" placeholder="Quoi ? Ex : taxi, riz, crédit..." oninput="aqRapCat()" onkeydown="if(event.key==='Enter')aqRapGo()">
    <label>Payé avec</label>${aqPills('aqRAcc', aqCompteList(), acc.id)}
    <label>Catégorie <span class="aq-auto" id="aqRAuto"></span></label>${aqPills('aqRCat', aqCats().map(c => [c, E(c)]), '', ';AQ.catTouchee=true')}
    <button class="btn-primary" id="aqRBtn" style="margin-top:12px" onclick="aqRapGo()">Noter</button>
    <div class="ag-hint">Astuce : touche le micro dans le champ pour le dire à voix haute. Plusieurs articles payés avec deux comptes ? Utilise le <a href="#" onclick="event.preventDefault();agCloseSheet('aqRap');aqPanier()">panier</a>.</div>`);
  AQ.catTouchee = false;
  setTimeout(() => { const i = document.getElementById('aqRMt'); if(i) i.focus(); }, 80);
};
window.aqRapCat = function(){
  if(AQ.catTouchee) return;
  const c = aqDevine((document.getElementById('aqRQuoi') || {}).value || ''), au = document.getElementById('aqRAuto');
  document.querySelectorAll('#aqRCat button').forEach(b => b.classList.toggle('on', !!c && b.dataset.v === c));
  if(au) au.textContent = c ? '(devinée, tu peux changer)' : '';
};
window.aqRapGo = async function(){
  const mt = Math.round(parseFloat((document.getElementById('aqRMt') || {}).value) || 0);
  if(!(mt > 0)){ agAlert('Tape le montant.'); return; }
  const quoi = (document.getElementById('aqRQuoi').value || '').trim();
  const accId = Number((document.querySelector('#aqRAcc button.on') || {}).dataset?.v), acc = aqComptes().find(a => a.id === accId);
  if(!acc){ agAlert('Choisis le compte.'); return; }
  const cat = (document.querySelector('#aqRCat button.on') || {}).dataset?.v || aqDevine(quoi) || 'Autre';
  if(agAccountBalance(acc) - mt < 0 && !await agConfirm(`${acc.name} va passer en négatif\nIl restera ${F(agAccountBalance(acc) - mt)}. Continuer ?`)) return;
  const b = document.getElementById('aqRBtn'); if(b) b.disabled = true;
  const t = await aqDepense(acc, mt, cat, quoi);
  if(b) b.disabled = false;
  if(!t) return;
  ls.set('aq_acc', acc.id);
  agCloseSheet('aqRap'); refreshAll();
  agToast(`${F(mt)} notés · ${acc.name} · ${cat}`);
};

// ============================================================
// 2. PANIER D'ACHATS (payé avec plusieurs comptes)
// ============================================================
window.aqPanier = function(pre){
  AQ.panier = { lignes: pre && pre.lignes ? pre.lignes : [{ nom: '', prix: '', q: 1 }], paye: {}, titre: pre && pre.titre || '' };
  const acc = aqCompteDef();
  if(acc) AQ.panier.paye[acc.id] = '';
  agSheet('aqPan', `<h3>Panier d'achats</h3>
    <input id="aqPTitre" placeholder="Pour quoi ? Ex : courses du mois, matériel séance" value="${E(AQ.panier.titre)}">
    <label>Les articles</label><div id="aqPLig"></div>
    <button class="btn-secondary" onclick="aqPAjout()">${agIcon('plus', 15)} Ajouter un article</button>
    <div class="aq-tot">Total <b class="ag-m" id="aqPTot">0 F</b></div>
    <label>Comment tu as payé ?</label>
    <div class="ag-hint" style="margin-top:0">Touche chaque compte utilisé et tape combien il a payé.</div>
    <div id="aqPPay"></div>
    <div id="aqPEcart" class="ag-hint"></div>
    <label>Catégorie</label>${aqPills('aqPCat', aqCats().map(c => [c, E(c)]), aqCats()[0])}
    <button class="btn-primary" id="aqPBtn" style="margin-top:12px" onclick="aqPanierGo()">Noter le panier</button>`);
  aqPRender();
};
function aqPSync(){
  if(!AQ.panier) return;
  document.querySelectorAll('#aqPLig .aq-pl').forEach((r, k) => { const L = AQ.panier.lignes[k]; if(!L) return; L.nom = r.querySelector('.n').value; L.prix = r.querySelector('.p').value; L.q = Math.max(1, parseInt(r.querySelector('.q').value) || 1); });
  document.querySelectorAll('#aqPPay input[data-acc]').forEach(i => { AQ.panier.paye[i.dataset.acc] = i.value; });
}
function aqPTotal(){ return AQ.panier.lignes.reduce((s, l) => s + (Math.round(parseFloat(l.prix) || 0) * (Number(l.q) || 1)), 0); }
function aqPRender(){
  const P = AQ.panier; if(!P) return;
  const el = document.getElementById('aqPLig');
  if(el) el.innerHTML = P.lignes.map((l, k) => `<div class="aq-pl"><input class="n" value="${E(l.nom)}" placeholder="Article" oninput="aqPMaj()"><input class="q" type="number" inputmode="numeric" min="1" value="${Number(l.q) || 1}" aria-label="Quantité" oninput="aqPMaj()"><input class="p" type="number" inputmode="decimal" value="${E(l.prix)}" placeholder="Prix" oninput="aqPMaj()"><button type="button" class="aq-x" onclick="aqPDel(${k})" aria-label="Retirer">${agIcon('trash', 14)}</button></div>`).join('');
  const pay = document.getElementById('aqPPay');
  if(pay) pay.innerHTML = aqComptes().map(a => { const on = P.paye[a.id] != null; return `<div class="aq-pay ${on ? 'on' : ''}"><button type="button" onclick="aqPPayer(${a.id})"><b>${E(a.name)}</b><small class="ag-m">${F(agAccountBalance(a))}</small></button>${on ? `<input data-acc="${a.id}" type="number" inputmode="decimal" value="${E(P.paye[a.id])}" placeholder="Montant payé" oninput="aqPMaj(true)">` : ''}</div>`; }).join('');
  aqPMaj(true);
}
window.aqPMaj = function(sansRendu){
  aqPSync();
  const P = AQ.panier, tot = aqPTotal();
  const t = document.getElementById('aqPTot'); if(t) t.textContent = F(tot);
  const ids = Object.keys(P.paye);
  // Un seul compte coché : il paie tout
  if(ids.length === 1){ const i = document.querySelector(`#aqPPay input[data-acc="${ids[0]}"]`); if(i && document.activeElement !== i){ i.value = tot || ''; P.paye[ids[0]] = String(tot || ''); } }
  const paye = ids.reduce((s, k) => s + (Math.round(parseFloat(P.paye[k]) || 0)), 0);
  const ec = document.getElementById('aqPEcart');
  if(ec) ec.innerHTML = !tot ? '' : paye === tot ? `<span class="aq-ok">Payé ${F(paye)} : le compte est bon.</span>` : paye < tot ? `<span class="aq-ko">Il reste ${F(tot - paye)} à répartir sur un compte.</span>` : `<span class="aq-ko">Tu as tapé ${F(paye - tot)} de trop.</span>`;
};
window.aqPAjout = function(){ aqPSync(); AQ.panier.lignes.push({ nom: '', prix: '', q: 1 }); aqPRender(); const L = document.querySelectorAll('#aqPLig .aq-pl .n'); if(L.length) L[L.length - 1].focus(); };
window.aqPDel = function(k){ aqPSync(); AQ.panier.lignes.splice(k, 1); if(!AQ.panier.lignes.length) AQ.panier.lignes.push({ nom: '', prix: '', q: 1 }); aqPRender(); };
window.aqPPayer = function(id){
  aqPSync(); const P = AQ.panier;
  if(P.paye[id] != null) delete P.paye[id];
  else { const tot = aqPTotal(), deja = Object.values(P.paye).reduce((s, v) => s + (Math.round(parseFloat(v) || 0)), 0); P.paye[id] = String(Math.max(0, tot - deja) || ''); }
  aqPRender();
};
window.aqPanierGo = async function(){
  aqPSync();
  const P = AQ.panier, L = P.lignes.filter(l => String(l.nom).trim() || parseFloat(l.prix) > 0), tot = aqPTotal();
  if(!L.length || !(tot > 0)){ agAlert('Ajoute au moins un article avec son prix.'); return; }
  const parts = Object.entries(P.paye).map(([k, v]) => ({ acc: aqComptes().find(a => a.id === Number(k)), m: Math.round(parseFloat(v) || 0) })).filter(x => x.acc && x.m > 0);
  const paye = parts.reduce((s, x) => s + x.m, 0);
  if(!parts.length){ agAlert('Touche le ou les comptes qui ont payé.'); return; }
  if(paye !== tot){ agAlert(paye < tot ? `Il reste ${F(tot - paye)} à répartir sur un compte.` : `Tu as tapé ${F(paye - tot)} de trop dans les comptes.`); return; }
  const neg = parts.filter(x => agAccountBalance(x.acc) - x.m < 0);
  if(neg.length && !await agConfirm(`${neg.map(x => x.acc.name).join(' et ')} va passer en négatif\nContinuer quand même ?`)) return;
  const titre = nd(document.getElementById('aqPTitre').value.trim());
  const cat = (document.querySelector('#aqPCat button.on') || {}).dataset?.v || 'Autre';
  const liste = L.map(l => `${String(l.nom).trim() || 'article'}${Number(l.q) > 1 ? ' x' + l.q : ''} ${Math.round(parseFloat(l.prix) || 0) * (Number(l.q) || 1)}`).join(', ');
  const id = 'panier:' + Date.now().toString(36);
  const b = document.getElementById('aqPBtn'); if(b) b.disabled = true;
  let n = 0;
  for(const x of parts){
    const note = `${titre || 'Panier'} : ${liste}${parts.length > 1 ? ` (part ${x.acc.name} ${x.m} sur ${tot})` : ''}`;
    if(await aqDepense(x.acc, x.m, cat, note.slice(0, 480), id)) n++;
  }
  if(b) b.disabled = false;
  refreshAll(); agCloseSheet('aqPan');
  agToast(`Panier de ${F(tot)} noté${parts.length > 1 ? ' : ' + parts.map(x => `${F(x.m)} ${x.acc.name}`).join(' + ') : ''}`);
};

// ============================================================
// 3. FAIRE MA CAISSE
// ============================================================
const AQ_BILLETS = [10000, 5000, 2000, 1000, 500, 250, 200, 100, 50, 25];
window.aqCaisse = function(accId){
  const acc = aqComptes().find(a => a.id === accId) || aqEspeces();
  if(!acc){ agToast('Crée d\'abord tes comptes', 'info'); return; }
  AQ.caisse = { acc: acc.id, billets: {} };
  const der = ls.get('aq_caisse', {})[acc.id];
  agSheet('aqCai', `<h3>Faire ma caisse</h3>
    <div class="ag-hint" style="margin-top:0">Compte ce que tu as vraiment, puis tape le total. L'app te dit s'il manque quelque chose.${der ? ` Dernière caisse : ${E(der)}.` : ''}</div>
    <label>Quel compte ?</label>${aqPills('aqCAcc', aqCompteList(), acc.id, ';aqCaisseMaj()')}
    <div class="aq-app" id="aqCApp"></div>
    <label for="aqCReel">Ce que j'ai vraiment</label>
    <input id="aqCReel" type="number" inputmode="decimal" class="big" placeholder="Total compté" oninput="aqCaisseMaj()">
    <details class="aq-bil" id="aqCBil"><summary>Compter billet par billet</summary><div>${AQ_BILLETS.map(v => `<div class="aq-bl"><span>${agN(v)} F</span><div class="pr-q"><button type="button" onclick="aqBillet(${v},-1)">-</button><b id="aqB${v}">0</b><button type="button" onclick="aqBillet(${v},1)">+</button></div></div>`).join('')}</div></details>
    <div id="aqCRes"></div>`);
  aqCaisseMaj();
};
window.aqBillet = function(v, d){
  const B = AQ.caisse.billets; B[v] = Math.max(0, (B[v] || 0) + d);
  const e = document.getElementById('aqB' + v); if(e) e.textContent = B[v];
  const tot = Object.entries(B).reduce((s, [k, n]) => s + Number(k) * n, 0);
  const i = document.getElementById('aqCReel'); if(i) i.value = tot || '';
  aqCaisseMaj();
};
function aqCaisseAcc(){ const id = Number((document.querySelector('#aqCAcc button.on') || {}).dataset?.v); return aqComptes().find(a => a.id === id); }
window.aqCaisseMaj = function(){
  const acc = aqCaisseAcc(); if(!acc) return;
  AQ.caisse.acc = acc.id;
  const bal = Math.round(agAccountBalance(acc));
  const ap = document.getElementById('aqCApp'); if(ap) ap.innerHTML = `Selon l'app, tu as <b class="ag-m">${F(bal)}</b> sur ${E(acc.name)}.${typeof apExpliquer === 'function' ? ` <a href="#" onclick="event.preventDefault();apExpliquer('a',${acc.id})">D'où vient ce montant ?</a>` : ''}`;
  const v = (document.getElementById('aqCReel') || {}).value, el = document.getElementById('aqCRes'); if(!el) return;
  if(v === '' || v == null){ el.innerHTML = ''; return; }
  const reel = Math.round(parseFloat(v) || 0), ec = reel - bal;
  if(ec === 0){ el.innerHTML = `<div class="aq-res ok"><b>C'est juste : ${F(reel)}.</b><span>Rien n'a été oublié. Bravo !</span><button class="btn-primary" onclick="aqCaisseFin('ok')">Terminer</button></div>`; return; }
  if(ec < 0){
    const m = -ec;
    el.innerHTML = `<div class="aq-res ko"><b>Il manque ${F(m)}</b><span>Tu as dépensé ${F(m)} sans le noter (ou une dépense est notée sur le mauvais compte). Que fais-tu ?</span>
      <button class="btn-primary" onclick="aqCaisseOublis(${m})">Noter les oublis (je me souviens)</button>
      <button class="btn-ghost" onclick="aqCaisseDiverses(${m})">Tout mettre en « Dépenses diverses du jour »</button>
      <button class="aq-lien" onclick="aqCaisseFin('plus_tard')">Je recompterai plus tard</button></div>`;
  } else {
    el.innerHTML = `<div class="aq-res plus"><b>Tu as ${F(ec)} de plus</b><span>Une entrée n'a pas été notée (un client, un remboursement...), ou une dépense a été notée deux fois.</span>
      <button class="btn-primary" onclick="aqCaisseEntree(${ec})">Noter une entrée oubliée</button>
      <button class="btn-ghost" onclick="aqCaisseAjuster(${reel})">Juste corriger le solde</button>
      <button class="aq-lien" onclick="aqCaisseFin('plus_tard')">Je recompterai plus tard</button></div>`;
  }
};
function aqCaisseNote(etat){
  const c = ls.get('aq_caisse', {}); c[AQ.caisse.acc] = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }) + (etat === 'ok' ? ' (juste)' : etat === 'plus_tard' ? ' (à recompter)' : ' (réglée)');
  ls.set('aq_caisse', c); ls.set('aq_caisse_jour', auj());
}
window.aqCaisseFin = function(etat){ aqCaisseNote(etat); agCloseSheet('aqCai'); try { agRenderDashMini(); } catch(e){} if(etat === 'ok') agToast('Caisse juste'); };
window.aqCaisseOublis = function(m){
  const acc = aqComptes().find(a => a.id === AQ.caisse.acc); aqCaisseNote('regle'); agCloseSheet('aqCai');
  aqPanier({ titre: 'Oublis du ' + new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) });
  AQ.panier.paye = {}; AQ.panier.paye[acc.id] = ''; aqPRender();
  agToast(`Note ce que tu as acheté : il manque ${F(m)} sur ${acc.name}`, 'info');
  AQ.panier.manque = m;
};
window.aqCaisseDiverses = async function(m){
  const acc = aqComptes().find(a => a.id === AQ.caisse.acc); if(!acc) return;
  const t = await aqDepense(acc, m, 'Autre', 'Dépenses diverses du jour (non notées, trouvées en faisant la caisse)', 'caisse');
  if(!t) return;
  aqCaisseNote('regle'); agCloseSheet('aqCai'); refreshAll();
  agToast(`${F(m)} notés en dépenses diverses : ${acc.name} est juste`);
};
window.aqCaisseEntree = async function(m){
  const acc = aqComptes().find(a => a.id === AQ.caisse.acc); if(!acc) return;
  const quoi = await agPrompt('Entrée oubliée\nD\'où vient cet argent ? (ex : client Awa, remboursement)', '', { ok: 'Noter ' + agN(m) + ' F' });
  if(quoi == null) return;
  const t = await dbInsert('transactions', { type: 'revenu', amount: m, category: 'Autre', note: nd(quoi.trim()) || 'Entrée oubliée (trouvée en faisant la caisse)', date: auj(), account_id: acc.id, payment_method: acc.name, details: 'caisse' });
  if(!t) return; txs.unshift(t);
  aqCaisseNote('regle'); agCloseSheet('aqCai'); refreshAll();
  agToast(`Entrée de ${F(m)} notée sur ${acc.name}`);
};
window.aqCaisseAjuster = function(reel){
  const acc = aqComptes().find(a => a.id === AQ.caisse.acc); if(!acc) return;
  aqCaisseNote('regle'); agCloseSheet('aqCai');
  agOpenAdjust(acc.id);
  setTimeout(() => { const i = document.getElementById('agAdjVal'); if(i) i.value = reel; }, 60);
};

// ============================================================
// 4. RÉSUMÉ EN PHRASES (jour par jour)
// ============================================================
window.aqResume = function(accId, jours){
  jours = jours || 7;
  const R = typeof apResume === 'function' ? apResume('a', accId) : null;
  if(!R){ agToast('Résumé indisponible', 'info'); return; }
  const lim = new Date(Date.now() - (jours - 1) * 864e5).toISOString().slice(0, 10);
  const parJour = {}; R.L.filter(x => String(x.t.date || '').slice(0, 10) >= lim).forEach(x => { const d = String(x.t.date).slice(0, 10); (parJour[d] = parJour[d] || []).push(x); });
  const avant = R.L.filter(x => String(x.t.date || '').slice(0, 10) < lim);
  const debut = avant.length ? avant[avant.length - 1].apres : R.depart;
  const dates = Object.keys(parJour).sort().reverse();
  const lib = x => { const l = typeof apLibelle === 'function' ? apLibelle(x.t, 'a', accId) : { quoi: x.t.type, detail: x.t.note || '' }; return l.detail && l.quoi !== 'Entrée' && l.quoi !== 'Dépense' ? l.quoi + ' (' + l.detail + ')' : (l.detail || l.quoi); };
  const totE = R.L.filter(x => String(x.t.date || '').slice(0, 10) >= lim && x.e > 0).reduce((s, x) => s + x.e, 0);
  const totS = R.L.filter(x => String(x.t.date || '').slice(0, 10) >= lim && x.e < 0).reduce((s, x) => s - x.e, 0);
  agSheet('aqRes', `<h3>${E(R.nom)} : ${jours === 7 ? 'ma semaine' : jours + ' derniers jours'}</h3>
    <div class="aq-phrase">Il y a ${jours === 7 ? '7 jours' : jours + ' jours'}, tu avais <b class="ag-m">${F(debut)}</b>. Depuis, <b class="aq-in ag-m">+${F(totE)}</b> sont entrés et <b class="aq-out ag-m">-${F(totS)}</b> sont sortis. Aujourd'hui : <b class="ag-m">${F(R.actuel)}</b>.</div>
    <div class="ag-pills" style="margin:8px 0">${[7, 14, 30].map(j => `<button type="button" class="${j === jours ? 'on' : ''}" onclick="aqResume(${accId},${j})">${j} jours</button>`).join('')}</div>
    ${dates.length ? dates.map(d => { const L = parJour[d], ent = L.filter(x => x.e > 0), sor = L.filter(x => x.e < 0), fin = L[L.length - 1].apres;
      return `<div class="aq-jour"><b>${E(new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))}</b>
        ${ent.length ? `<p><span class="aq-in">Entré :</span> ${ent.map(x => `<b class="ag-m">+${F(x.e)}</b> ${E(lib(x))}`).join(', ')}.</p>` : ''}
        ${sor.length ? `<p><span class="aq-out">Sorti :</span> ${sor.map(x => `<b class="ag-m">-${F(-x.e)}</b> ${E(lib(x))}`).join(', ')}.</p>` : ''}
        <small>Le soir : il restait <b class="ag-m">${F(fin)}</b></small></div>`; }).join('') : '<div class="ag-empty">Aucun mouvement sur cette période.</div>'}
    <div class="bg-btns"><button class="btn-ghost" onclick="agCloseSheet('aqRes');aqCaisse(${accId})">Faire ma caisse</button>${typeof apExpliquer === 'function' ? `<button class="btn-ghost" onclick="agCloseSheet('aqRes');apExpliquer('a',${accId})">Tout le détail</button>` : ''}</div>`);
};

// ============================================================
// 5. BOUTONS "i" : explications
// ============================================================
const AQ_INFO = {
  solde: ['Le solde', 'C\'est l\'argent que l\'app pense que tu as sur ce compte : le solde de départ, plus les entrées, moins les dépenses, plus ou moins les transferts. S\'il ne correspond pas à la réalité, c\'est qu\'un mouvement manque : fais ta caisse ou envoie une capture Wave.'],
  depart: ['Le solde de départ', 'C\'est ce que tu avais sur ce compte le jour où tu as commencé à utiliser l\'app. Si ce chiffre est faux, tout le reste est décalé du même montant.'],
  negatif: ['Passer en négatif', 'Négatif veut dire en dessous de 0. Dans la vraie vie, ton portefeuille ou ton Wave ne peut pas être à moins de 0 : si l\'app affiche un négatif, c\'est qu\'elle n\'a pas vu tout l\'argent entré. En général : une entrée pas encore notée (un client qui a payé), un transfert oublié, ou un solde de départ trop petit. Pour corriger : fais ta caisse (ou envoie une capture Wave), l\'app te dit quoi ajouter.'],
  coffre: ['Les coffres', 'Un coffre, c\'est de l\'argent mis de côté pour un but (salaire, studio, épargne, loyer...). Il ne bouge que par des transferts. Un coffre ne peut jamais être négatif.'],
  caisse: ['Faire ma caisse', 'Le soir (ou quand tu veux), tu comptes ce que tu as vraiment et tu le tapes. Si l\'app trouve un écart, tu notes les oublis ou tu dis « dépenses diverses du jour » en un geste. Ton compte reste juste même si tu as oublié des petits achats.'],
  panier: ['Le panier', 'Pour plusieurs achats d\'un coup, payés avec un ou plusieurs comptes (une partie en espèces, une partie sur Wave). L\'app crée une dépense par compte, avec la liste des articles.']
};
window.aqInfo = function(k){ const x = AQ_INFO[k]; if(x) agAlert(x[0] + '\n' + x[1]); };
const aqI = k => `<button type="button" class="aq-i" onclick="event.stopPropagation();aqInfo('${k}')" aria-label="Explication">i</button>`;
window.aqI = aqI;
// Les messages "va passer en négatif" expliquent ce que ça veut dire
if(typeof agDialog === 'function'){
  const dlgAq = agDialog;
  agDialog = function(o){
    if(o && /passer en n[ée]gatif|passera en n[ée]gatif/i.test(o.msg || '') && !/ en dessous de 0/.test(o.msg)) o = { ...o, msg: o.msg + '\n\n(Négatif = en dessous de 0 dans l\'app. Souvent, une entrée n\'a pas encore été notée sur ce compte.)' };
    return dlgAq.apply(this, [o]);
  };
}

// ---------- Branchements : fiche d'un compte ----------
if(typeof agOpenAccount === 'function'){
  const openAq = agOpenAccount;
  agOpenAccount = function(id){
    const r = openAq.apply(this, arguments);
    try {
      const sh = document.getElementById('agAccView'), a = accounts.find(x => x.id === id); if(!sh || !a) return r;
      const lbl = sh.querySelector('.ag-total .lbl'); if(lbl && !lbl.querySelector('.aq-i')) lbl.insertAdjacentHTML('beforeend', ' ' + aqI('solde'));
      const sp = [...sh.querySelectorAll('.ag-total .split > div')].find(d => /Solde de départ/.test(d.textContent)); if(sp && !sp.querySelector('.aq-i')) sp.firstChild.after(document.createRange().createContextualFragment(' ' + aqI('depart')));
      const tot = sh.querySelector('.ag-total');
      if(tot && !sh.querySelector('.aq-acts')){
        const bal = agAccountBalance(a);
        tot.insertAdjacentHTML('afterend', `${bal < 0 ? `<div class="aq-neg"><b>${E(a.name)} est en négatif (${F(bal)})</b><span>L'app n'a pas vu tout l'argent entré sur ce compte. Fais ta caisse ou envoie une capture : l'app te dira quoi ajouter.</span><button class="aq-lien" onclick="aqInfo('negatif')">Qu'est-ce que ça veut dire ?</button></div>` : ''}
          <div class="aq-acts"><button onclick="aqResume(${id})">${agIcon('history', 15)} Ma semaine en clair</button><button onclick="aqCaisse(${id})">${agIcon('cash', 15)} Faire ma caisse</button></div>`);
      }
    } catch(e){ console.warn('aq compte', e); }
    return r;
  };
}

// ---------- Boutons rapides (Accueil et Argent) ----------
function aqRangee(){
  return `<div class="aq-row"><button onclick="aqRapide()">${agIcon('minus', 15)} Dépense rapide</button><button onclick="aqPanier()">${agIcon('note', 15)} Panier</button><button onclick="aqCaisse()">${agIcon('cash', 15)} Ma caisse</button></div>`;
}
function aqPoser(host){
  if(!host || !aqComptes().length) return;
  const acts = host.querySelector(':scope > .ag-actions'); if(!acts) return;
  host.querySelector(':scope > .aq-row')?.remove();
  acts.insertAdjacentHTML('afterend', aqRangee());
}
// Comptes en négatif sur la page Argent : une explication
function aqNegArgent(){
  const el = document.getElementById('agArgentBody'); if(!el) return;
  el.querySelector(':scope > .aq-negz')?.remove();
  const neg = aqComptes().filter(a => agAccountBalance(a) < 0); if(!neg.length) return;
  const row = el.querySelector(':scope > .aq-row'); if(!row) return;
  row.insertAdjacentHTML('afterend', `<div class="aq-neg aq-negz"><b>${neg.map(a => `${E(a.name)} : ${F(agAccountBalance(a))}`).join(' · ')}</b><span>Un compte en négatif, c'est presque toujours une entrée pas notée. <button class="aq-lien" onclick="aqInfo('negatif')">Comprendre</button> · <button class="aq-lien" onclick="aqCaisse(${neg[0].id})">Faire ma caisse</button></span></div>`);
}
if(typeof agRenderArgent === 'function'){
  const argAq = agRenderArgent;
  agRenderArgent = function(){ const r = argAq.apply(this, arguments); try { aqPoser(document.getElementById('agArgentBody')); aqNegArgent(); } catch(e){ console.warn('aq argent', e); } return r; };
}
if(typeof agRenderDashMini === 'function'){
  const dashAq = agRenderDashMini;
  agRenderDashMini = function(){
    const r = dashAq.apply(this, arguments);
    try {
      const el = document.getElementById('agDashMini'); aqPoser(el);
      // Le soir : rappel de faire la caisse des espèces
      el && el.querySelector('#aqDashCaisse')?.remove();
      const esp = aqEspeces();
      if(el && esp && new Date().getHours() >= 18 && ls.get('aq_caisse_jour', '') !== auj()){
        const d = document.createElement('div'); d.id = 'aqDashCaisse'; d.className = 'crm-fete';
        d.onclick = () => aqCaisse(esp.id);
        d.innerHTML = `<div class="ic">${agIcon('cash')}</div><div class="d"><b>Faire ma caisse (2 minutes)</b><span>Compte tes ${E(esp.name.toLowerCase())} : l'app te dit s'il manque quelque chose aujourd'hui.</span></div>${agIcon('chev', 16)}`;
        const ref = el.querySelector(':scope > .aq-row'); if(ref) ref.insertAdjacentElement('afterend', d);
      }
    } catch(e){ console.warn('aq dash', e); }
    return r;
  };
}

(function aqCss(){
  if(document.getElementById('aqCss')) return;
  const st = document.createElement('style'); st.id = 'aqCss';
  st.textContent = `
.aq-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0 4px}
.aq-row button{display:flex;align-items:center;justify-content:center;gap:5px;padding:10px 6px;border-radius:12px;border:1px solid var(--border);background:var(--card2);color:var(--text);font-size:12.5px;font-weight:600;cursor:pointer;margin:0;width:auto}
.aq-row button svg{flex-shrink:0;color:var(--accent)}
.aq-i{display:inline-grid;place-items:center;width:17px;height:17px;border-radius:50%;border:1px solid currentColor;background:transparent;color:inherit;opacity:.7;font:700 10.5px/1 Georgia,serif;font-style:italic;cursor:pointer;padding:0;margin:0 0 0 3px;vertical-align:middle;width:17px!important}
.aq-pills button small{display:block;font-size:11px;opacity:.7}
.aq-auto{font-weight:400;font-size:11.5px;color:var(--accent)}
.aq-pl{display:grid;grid-template-columns:1fr 54px 92px auto;gap:6px;margin:6px 0}.aq-pl input{margin:0}
.aq-x{background:none;border:0;color:var(--muted);cursor:pointer;padding:4px;margin:0;width:auto!important}
#aqPan .btn-secondary{display:flex;align-items:center;justify-content:center;gap:6px}
.aq-tot{display:flex;justify-content:space-between;align-items:baseline;margin:12px 0 4px;padding:10px 12px;border-radius:12px;background:var(--card2);color:var(--muted)}.aq-tot b{font-size:20px;color:var(--text)}
.aq-pay{display:flex;gap:8px;align-items:center;margin:6px 0}
.aq-pay button{flex:0 0 46%;display:flex;flex-direction:column;align-items:flex-start;padding:9px 12px;border-radius:12px;border:1px solid var(--border);background:var(--card2);color:var(--text);cursor:pointer;margin:0;text-align:left;width:auto!important}
.aq-pay.on button{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 14%,var(--card2))}.aq-pay small{font-size:11.5px;color:var(--muted)}
.aq-pay input{flex:1;margin:0}
.aq-ok{color:#34c759}.aq-ko{color:#f5a524}
.aq-app{margin:10px 0 0;padding:10px 12px;border-radius:12px;background:var(--card2);font-size:13.5px;color:var(--muted)}.aq-app b{color:var(--text)}.aq-app a{color:var(--accent)}
.aq-bil{margin-top:8px}.aq-bil summary{cursor:pointer;color:var(--accent);font-weight:600;font-size:13px}
.aq-bl{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);font-size:14px;color:var(--text)}
.aq-bl .pr-q{display:flex;align-items:center;gap:6px}.aq-bl .pr-q button{width:30px!important;height:30px;border-radius:8px;border:1px solid var(--border);background:var(--card2);color:var(--text);cursor:pointer;margin:0;padding:0}.aq-bl .pr-q b{min-width:22px;text-align:center}
.aq-res{margin-top:12px;padding:14px;border-radius:14px;display:flex;flex-direction:column;gap:8px;border:1px solid var(--border);background:var(--card2)}
.aq-res b{font-size:16px;color:var(--text)}.aq-res span{font-size:13px;color:var(--muted);line-height:1.45}.aq-res button{margin:0}
.aq-res.ok{border-color:#34c759}.aq-res.ko{border-color:#f5a524}.aq-res.plus{border-color:var(--accent)}
.aq-lien{background:none;border:0;color:var(--accent);text-decoration:underline;cursor:pointer;font-size:13px;padding:0;margin:0;width:auto!important}
.aq-neg{margin:10px 0;padding:12px;border-radius:14px;border:1px solid rgba(255,69,58,.5);background:rgba(255,69,58,.08)}
.aq-neg b{display:block;color:var(--text);font-size:14px}.aq-neg span{display:block;font-size:12.5px;color:var(--muted);margin-top:3px;line-height:1.45}
.aq-acts{display:flex;gap:8px;margin:10px 0}.aq-acts button{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border-radius:12px;border:1px solid var(--border);background:var(--card2);color:var(--text);font-size:13px;font-weight:600;cursor:pointer;margin:0}
.aq-phrase{padding:12px;border-radius:12px;background:var(--card2);font-size:14px;line-height:1.55;color:var(--text)}
.aq-in{color:#34c759}.aq-out{color:#ff6b5a}
.aq-jour{padding:10px 0;border-bottom:1px solid var(--border)}.aq-jour>b{display:block;color:var(--text);font-size:14px;text-transform:capitalize}
.aq-jour p{margin:4px 0;font-size:13px;color:var(--muted);line-height:1.5}.aq-jour p b{color:var(--text)}.aq-jour small{font-size:12px;color:var(--muted)}`;
  document.head.appendChild(st);
})();
try { if(typeof agRenderArgent === 'function' && document.getElementById('agArgentBody')) agRenderArgent(); } catch(e){}
try { if(document.getElementById('agDashMini')) agRenderDashMini(); } catch(e){}
})();
