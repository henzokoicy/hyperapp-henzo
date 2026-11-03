// ============================================================
// PREPARATION.JS - Préparer un voyage, un événement, une séance
// ------------------------------------------------------------
// - Une liste par préparation : chaque chose avec sa quantité, cochée
//   quand elle est prise. Score (ce qui est pris) et conseils.
// - Modèles tout prêts (voyage, séance, événement), liste proposée par
//   l'IA, et MES KITS : un ensemble réutilisable (ex : "Mini PC" avec
//   son chargeur, sa souris, son câble HDMI...). Un kit s'ajoute en un
//   geste et peut prendre les objets de "Mon matériel".
// - Rappels sur le téléphone : 4, 3, 2 jours avant, la veille, le jour J
//   (table reminders, envoyés même app fermée).
// - "As-tu pris ?" : on passe les choses une par une.
// - Après : petit bilan (oublis, choses inutiles) pour faire mieux.
// - Carte sur l'Accueil quand une préparation arrive (4 jours).
// Tables : preparations, kits. Page : Idées > Préparer.
// ============================================================
(function(){
'use strict';
if(typeof agSheet !== 'function' || typeof AG_GROUPS === 'undefined') return;
const E = s => agEsc(String(s == null ? '' : s));
const PR = { preps: [], kits: [], charge: false, onglet: 'avenir' };
window.PR = PR;
const nd = s => String(s || '').replace(/[–—]/g, '-');
const pad = n => String(n).padStart(2, '0');
const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const auj = () => typeof todayStr === 'function' ? todayStr() : ymd(new Date());
const jours = iso => iso ? Math.round((new Date(iso + 'T12:00:00') - new Date(auj() + 'T12:00:00')) / 864e5) : null;
const dateFr = (iso, long) => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', long ? { weekday: 'long', day: 'numeric', month: 'long' } : { day: 'numeric', month: 'short' }) : '';
const quand = j => j == null ? 'sans date' : j === 0 ? "aujourd'hui" : j === 1 ? 'demain' : j === -1 ? 'hier' : j > 0 ? `dans ${j} jours` : `il y a ${-j} jours`;
const uid = () => Math.random().toString(36).slice(2, 9);

const PR_TYPES = { voyage: 'Voyage', evenement: 'Événement', seance: 'Séance photo', autre: 'Autre' };
const PR_TYPE_IC = { voyage: 'link', evenement: 'star', seance: 'camera', autre: 'note' };
const PR_MODELES = {
  voyage: [['Pièce d\'identité', 1], ['Argent liquide', 1], ['Téléphone et chargeur', 1], ['Batterie externe', 1], ['Tenues (une par jour)', 3], ['Sous-vêtements', 3], ['Brosse à dents et dentifrice', 1], ['Savon et serviette', 1], ['Médicaments habituels', 1], ['Ticket de car ou de transport', 1]],
  seance: [['Boîtier photo', 1], ['Objectifs', 2], ['Batteries chargées', 2], ['Cartes mémoire vides', 2], ['Flash et piles', 1], ['Réflecteur', 1], ['Trépied', 1], ['Chiffon pour nettoyer', 1], ['Moodboard du client', 1]],
  evenement: [['Boîtier photo', 1], ['Objectifs', 2], ['Batteries chargées', 4], ['Cartes mémoire vides', 4], ['Flash et piles de rechange', 1], ['Programme de l\'événement', 1], ['Numéro du client', 1], ['Eau et en-cas', 1], ['Tenue correcte', 1], ['PC ou disque pour décharger', 1]],
  autre: []
};

// ---------- Chargement ----------
async function prCharger(){
  if(typeof sb === 'undefined') return;
  try {
    const [p, k] = await Promise.all([sb.from('preparations').select('*').order('date_evt', { ascending: true }), sb.from('kits').select('*').order('nom', { ascending: true })]);
    if(p && !p.error) PR.preps = (p.data || []).map(prNorm);
    if(k && !k.error) PR.kits = (k.data || []).map(x => ({ ...x, items: prArr(x.items) }));
  } catch(e){ console.warn('preparations', e); }
  PR.charge = true;
}
window.prCharger = prCharger;
function prArr(v){ if(Array.isArray(v)) return v; if(typeof v === 'string'){ try { const x = JSON.parse(v); return Array.isArray(x) ? x : []; } catch(e){} } return []; }
function prNorm(p){ return { ...p, items: prArr(p.items), rappels: prArr(p.rappels), bilan: p.bilan && typeof p.bilan === 'object' ? p.bilan : null }; }
function prGet(id){ return PR.preps.find(x => x.id === id); }
async function prMaj(p, data){
  const r = await dbUpdate('preparations', p.id, { ...data, updated_at: new Date().toISOString() });
  if(!r) return null;
  const n = prNorm(r), i = PR.preps.findIndex(x => x.id === p.id);
  if(i >= 0) PR.preps[i] = n;
  return n;
}
// Les cases cochées partent en ligne par petits paquets (pas à chaque toucher)
let prTimer = null;
function prSauverItems(p){
  clearTimeout(prTimer);
  prTimer = setTimeout(async () => { const r = await prMaj(p, { items: p.items }); if(r) prMajAccueil(); }, 600);
}

// ---------- Score et conseils ----------
function prScore(p){
  const L = p.items.filter(i => !i.inutile), pris = L.filter(i => i.pris).length;
  return { total: L.length, pris, reste: L.filter(i => !i.pris), pct: L.length ? Math.round(pris / L.length * 100) : 0 };
}
window.prScore = prScore;
function prConseils(p){
  const S = prScore(p), j = jours(p.date_evt), out = [];
  if(!S.total) return ['Ajoute ce que tu dois emporter : un modèle, un kit, ou la liste de l\'IA.'];
  if(S.pct === 100) return ['Tout est pris. ' + (p.type === 'voyage' ? 'Bon voyage !' : 'Bonne séance !')];
  const noms = S.reste.map(i => i.nom.toLowerCase());
  const a = re => S.reste.filter(i => re.test(i.nom.toLowerCase())).map(i => i.nom);
  const charger = a(/batter|charg|power|piles?\b/);
  const argent = a(/argent|liquide|espèce|wave|ticket/);
  const linge = a(/tenue|vêtement|\bhabits?\b|linge|chemise|robe/);
  const carte = a(/carte mémoire|carte sd|disque/);
  if(charger.length) out.push(`Mets à charger la veille : ${charger.join(', ')}.`);
  if(carte.length) out.push(`Vide et formate avant de partir : ${carte.join(', ')}.`);
  if(argent.length && j != null && j >= 1) out.push(`Prévois avant le jour J : ${argent.join(', ')}.`);
  if(linge.length && j != null && j >= 2) out.push(`Lave et repasse dès maintenant : ${linge.join(', ')}.`);
  if(j != null && j <= 1 && S.reste.length) out.push(`${j <= 0 ? 'C\'est aujourd\'hui' : 'C\'est demain'} : il reste ${S.reste.length} chose${S.reste.length > 1 ? 's' : ''} à prendre (${noms.slice(0, 5).join(', ')}${noms.length > 5 ? '...' : ''}).`);
  else if(j != null && j >= 3 && S.pct < 30) out.push('Commence tôt : prépare un peu chaque jour, et pose tout au même endroit.');
  if(!out.length) out.push(`Encore ${S.reste.length} chose${S.reste.length > 1 ? 's' : ''} à prendre.`);
  return out;
}
function prNiveau(pct){ return pct === 100 ? 'pret' : pct >= 75 ? 'presque' : pct >= 40 ? 'moitie' : 'debut'; }
const PR_NIV = { pret: 'Tout est prêt', presque: 'Presque prêt', moitie: 'À moitié prêt', debut: 'À préparer' };

// ---------- La page Idées > Préparer ----------
(function prPage(){
  if(!AG_GROUPS.idees.tabs.includes('prep')) AG_GROUPS.idees.tabs.splice(1, 0, 'prep');
  AG_TAB_LABELS.prep = 'Préparer'; AG_TITLES.prep = 'Préparer'; if(typeof AG_TAB_ICONS !== 'undefined') AG_TAB_ICONS.prep = 'check';
  if(!document.getElementById('page-prep')){
    const ref = document.getElementById('page-notes'); const d = document.createElement('div');
    d.className = 'page'; d.id = 'page-prep'; d.innerHTML = '<div class="container"><div id="prBody"></div></div>';
    if(ref) ref.parentNode.insertBefore(d, ref.nextSibling); else document.body.appendChild(d);
  }
  // menus déjà construits : on les refait avec le nouvel onglet
  try { const s = document.getElementById('agSide'); if(s && typeof agBuildSide === 'function'){ s.remove(); agBuildSide(); } } catch(e){}
  try { const sec = document.querySelector('.side-drawer .drawer-section[data-ag-done]'); if(sec && typeof agFixDrawer === 'function'){ delete sec.dataset.agDone; agFixDrawer(); } } catch(e){}
})();
const showPr = showTab;
showTab = function(name){
  const r = showPr.apply(this, arguments);
  if(name === 'prep'){ try { if(typeof agSegBar === 'function') agSegBar('prep'); } catch(e){} prRender(); }
  return r;
};
window.prRender = async function(){
  const el = document.getElementById('prBody'); if(!el) return;
  if(!PR.charge){ el.innerHTML = '<div class="ag-empty">Chargement...</div>'; await prCharger(); }
  const t = auj();
  const avenir = PR.preps.filter(p => p.statut !== 'finie' && (!p.date_evt || p.date_evt >= t)).sort((a, b) => String(a.date_evt || '9').localeCompare(String(b.date_evt || '9')));
  const passees = PR.preps.filter(p => !avenir.includes(p)).sort((a, b) => String(b.date_evt || '').localeCompare(String(a.date_evt || '')));
  const L = PR.onglet === 'passees' ? passees : avenir;
  el.innerHTML = `<div class="pr-top">
      <button class="btn-primary" onclick="prNouvelle()">+ Nouvelle préparation</button>
      <button class="btn-ghost" onclick="prKits()">${agIcon('briefcase', 16)} Mes kits (${PR.kits.length})</button>
    </div>
    <div class="ag-pills"><button type="button" class="${PR.onglet !== 'passees' ? 'on' : ''}" onclick="PR.onglet='avenir';prRender()">À venir (${avenir.length})</button><button type="button" class="${PR.onglet === 'passees' ? 'on' : ''}" onclick="PR.onglet='passees';prRender()">Passées (${passees.length})</button></div>
    <div class="pr-list">${L.length ? L.map(prCarte).join('') : `<div class="ag-empty">${PR.onglet === 'passees' ? 'Aucune préparation passée.' : 'Rien à préparer pour l\'instant. Un voyage, un mariage, une séance en extérieur ? Crée ta liste.'}</div>`}</div>`;
};
function prCarte(p){
  const S = prScore(p), j = jours(p.date_evt), niv = prNiveau(S.pct);
  return `<div class="pr-card" onclick="prVoir(${p.id})"><div class="ic">${agIcon(PR_TYPE_IC[p.type] || 'note', 18)}</div>
    <div class="d"><b>${E(p.titre)}</b><span>${E(PR_TYPES[p.type] || '')}${p.date_evt ? ' · ' + dateFr(p.date_evt, true) + ' (' + quand(j) + ')' : ''}${p.lieu ? ' · ' + E(p.lieu) : ''}</span>
    <div class="pr-bar ${niv}"><i style="width:${S.pct}%"></i></div><small>${S.pris}/${S.total} pris${p.bilan ? ' · bilan fait' : ''}</small></div>${agIcon('chev', 16)}</div>`;
}

// ---------- Nouvelle préparation ----------
window.prNouvelle = function(o){
  o = o || {};
  if(!PR.charge) prCharger();
  const sh = (typeof shoots !== 'undefined' ? shoots : []).filter(s => s.status !== 'annule' && s.date && String(s.date).slice(0, 10) >= auj()).sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(0, 15);
  const nomCl = s => { const c = s.client_id && typeof clients !== 'undefined' ? clients.find(x => x.id === s.client_id) : null; return (c ? c.name : 'Séance') + (s.type ? ' · ' + s.type : ''); };
  const type = o.type || 'voyage';
  agSheet('prNew', `<h3>Nouvelle préparation</h3>
    <label>C'est pour</label>
    <div class="ag-pills" id="prNType">${Object.entries(PR_TYPES).map(([k, v]) => `<button type="button" data-k="${k}" class="${k === type ? 'on' : ''}" onclick="agPick(this)">${v}</button>`).join('')}</div>
    <label for="prNTitre">Nom</label><input id="prNTitre" value="${E(o.titre || '')}" placeholder="Ex : Voyage à Abidjan, Mariage de Awa">
    <div class="pr-2"><div><label for="prNDate">Date</label><input id="prNDate" type="date" value="${E(o.date || '')}"></div><div><label for="prNHeure">Heure de départ</label><input id="prNHeure" type="time" value="${E(o.heure || '')}"></div></div>
    <label for="prNLieu">Lieu (facultatif)</label><input id="prNLieu" value="${E(o.lieu || '')}" placeholder="Ex : Abidjan, Cocody">
    ${sh.length ? `<label for="prNShoot">Liée à une séance (facultatif)</label><select id="prNShoot"><option value="">Aucune</option>${sh.map(s => `<option value="${s.id}" ${o.shoot_id === s.id ? 'selected' : ''}>${E(dateFr(String(s.date).slice(0, 10)))} · ${E(nomCl(s))}</option>`).join('')}</select>` : ''}
    <label>Partir de</label>
    <label class="ag-check"><input type="checkbox" id="prNModele" checked> Le modèle tout prêt (selon le type)</label>
    ${PR.kits.length ? `<div class="ag-hint" style="margin:4px 0">Ajouter mes kits :</div><div class="ag-pills pr-kpick" id="prNKits">${PR.kits.map(k => `<button type="button" data-id="${k.id}" onclick="this.classList.toggle('on')">${E(k.nom)} <small>${k.items.length}</small></button>`).join('')}</div>` : ''}
    <button class="btn-primary" id="prNBtn" style="margin-top:12px" onclick="prCreer()">Créer la liste</button>`);
};
window.prCreer = async function(){
  const titre = nd(document.getElementById('prNTitre').value.trim());
  if(!titre){ agAlert('Donne un nom à ta préparation.'); return; }
  const type = (document.querySelector('#prNType button.on') || {}).dataset?.k || 'autre';
  const items = [];
  if(document.getElementById('prNModele').checked) (PR_MODELES[type] || []).forEach(([nom, qte]) => items.push({ id: uid(), nom, qte, pris: false, cat: 'Essentiel' }));
  document.querySelectorAll('#prNKits button.on').forEach(b => { const k = PR.kits.find(x => x.id === Number(b.dataset.id)); if(k) prItemsDuKit(k).forEach(i => items.push(i)); });
  const data = { titre, type, date_evt: document.getElementById('prNDate').value || null, heure: document.getElementById('prNHeure').value || null, lieu: nd(document.getElementById('prNLieu').value.trim()) || null, shoot_id: Number((document.getElementById('prNShoot') || {}).value) || null, items, rappels: [], statut: 'prevue' };
  const b = document.getElementById('prNBtn'); if(b) b.disabled = true;
  const r = await dbInsert('preparations', data);
  if(b) b.disabled = false;
  if(!r) return;
  const p = prNorm(r); PR.preps.push(p);
  agCloseSheet('prNew');
  prRender(); prMajAccueil();
  prVoir(p.id);
  if(p.date_evt && jours(p.date_evt) >= 1) setTimeout(() => prRappels(p.id, true), 400);
};
function prItemsDuKit(k){ return k.items.map(i => ({ id: uid(), nom: i.nom, qte: Number(i.qte) || 1, pris: false, cat: k.nom, kit_id: k.id })); }

// ---------- Voir une préparation ----------
window.prVoir = function(id){
  const p = prGet(id); if(!p) return;
  agSheet('prVue', `<div id="prVueIn"></div>`);
  prVueMaj(id);
};
function prVueMaj(id){
  const p = prGet(id), el = document.getElementById('prVueIn'); if(!p || !el) return;
  const S = prScore(p), j = jours(p.date_evt), niv = prNiveau(S.pct), fini = p.date_evt && j < 0;
  const cats = []; p.items.forEach(i => { const c = i.cat || 'Essentiel'; if(!cats.includes(c)) cats.push(c); });
  const nbRap = p.rappels.filter(r => r.due >= new Date().toISOString()).length;
  el.innerHTML = `<h3>${E(p.titre)}</h3>
    <div class="ag-hint" style="margin-top:0">${E(PR_TYPES[p.type] || '')}${p.date_evt ? ' · ' + dateFr(p.date_evt, true) + (p.heure ? ' à ' + E(p.heure) : '') + ' (' + quand(j) + ')' : ''}${p.lieu ? ' · ' + E(p.lieu) : ''}</div>
    <div class="pr-score ${niv}"><div class="pr-ring" style="--p:${S.pct}"><b>${S.pct}%</b></div><div><b>${PR_NIV[niv]}</b><span>${S.pris} sur ${S.total} pris</span></div></div>
    <div class="pr-cons">${prConseils(p).map(c => `<div>${agIcon('bulb', 14)} ${E(c)}</div>`).join('')}</div>
    <div class="pr-acts">
      ${S.reste.length ? `<button class="btn-primary" onclick="prQuiz(${id})">As-tu pris ?</button>` : ''}
      <button class="btn-ghost" onclick="prRappels(${id})">${agIcon('calendar', 15)} Rappels${nbRap ? ` (${nbRap})` : ''}</button>
      ${fini || p.statut === 'finie' ? `<button class="btn-ghost" onclick="prBilan(${id})">${p.bilan ? 'Voir le bilan' : 'Faire le bilan'}</button>` : ''}
    </div>
    ${cats.map(c => `<div class="pr-cat">${E(c)}</div>${p.items.map((it, k) => (it.cat || 'Essentiel') !== c ? '' : `<div class="pr-it ${it.pris ? 'pris' : ''} ${it.inutile ? 'inut' : ''}">
        <label><input type="checkbox" ${it.pris ? 'checked' : ''} onchange="prCoche(${id},'${it.id}',this.checked)"><span>${E(it.nom)}</span></label>
        <div class="pr-q"><button type="button" onclick="prQte(${id},'${it.id}',-1)" aria-label="Moins">-</button><b>${Number(it.qte) || 1}</b><button type="button" onclick="prQte(${id},'${it.id}',1)" aria-label="Plus">+</button></div>
        <button type="button" class="pr-x" onclick="prRetirer(${id},'${it.id}')" aria-label="Retirer">${agIcon('trash', 14)}</button></div>`).join('')}`).join('') || '<div class="ag-empty">Liste vide.</div>'}
    <div class="pr-add"><input id="prAddNom" placeholder="Ajouter : ex Chargeur du Mini PC" onkeydown="if(event.key==='Enter')prAjouter(${id})"><input id="prAddQte" type="number" inputmode="numeric" min="1" value="1" aria-label="Quantité"><button class="btn-primary" onclick="prAjouter(${id})">Ajouter</button></div>
    ${PR.kits.length ? `<div class="ag-hint" style="margin:10px 0 4px">Ajouter un kit :</div><div class="ag-pills">${PR.kits.map(k => `<button type="button" onclick="prAjouterKit(${id},${k.id})">${E(k.nom)}</button>`).join('')}</div>` : ''}
    <div class="pr-acts small">
      <button onclick="prIA(${id})">${agIcon('sparkles', 14)} Que me manque-t-il ? (IA)</button>
      <button onclick="prVersKit(${id})">Garder comme kit</button>
      <button onclick="prModifier(${id})">Modifier</button>
      <button onclick="prSupprimer(${id})">Supprimer</button>
    </div>
    <div id="prIARep"></div>`;
}
window.prVueMaj = prVueMaj;
function prApres(p){ prVueMaj(p.id); prSauverItems(p); if(document.getElementById('prBody') && document.getElementById('page-prep').classList.contains('active')) prRender(); }
window.prCoche = function(id, iid, on){ const p = prGet(id); const it = p && p.items.find(x => x.id === iid); if(!it) return; it.pris = !!on; if(on) it.inutile = false; prApres(p); if(on && prScore(p).pct === 100) agToast('Tout est pris !'); };
window.prQte = function(id, iid, d){ const p = prGet(id); const it = p && p.items.find(x => x.id === iid); if(!it) return; it.qte = Math.max(1, (Number(it.qte) || 1) + d); prApres(p); };
window.prRetirer = function(id, iid){ const p = prGet(id); if(!p) return; p.items = p.items.filter(x => x.id !== iid); prApres(p); };
window.prAjouter = function(id){
  const p = prGet(id), n = document.getElementById('prAddNom'); if(!p || !n) return;
  const nom = nd(n.value.trim()); if(!nom) return;
  p.items.push({ id: uid(), nom, qte: Math.max(1, Math.round(Number(document.getElementById('prAddQte').value) || 1)), pris: false, cat: 'Ajouts' });
  prApres(p);
  setTimeout(() => { const x = document.getElementById('prAddNom'); if(x) x.focus(); }, 30);
};
window.prAjouterKit = function(id, kid){
  const p = prGet(id), k = PR.kits.find(x => x.id === kid); if(!p || !k) return;
  if(p.items.some(i => i.kit_id === kid)){ agToast(`Le kit "${k.nom}" est déjà dans la liste`, 'info'); return; }
  p.items.push(...prItemsDuKit(k)); prApres(p); agToast(`Kit "${k.nom}" ajouté (${k.items.length})`);
};
window.prModifier = function(id){
  const p = prGet(id); if(!p) return;
  agSheet('prMod', `<h3>Modifier</h3>
    <label for="prMTitre">Nom</label><input id="prMTitre" value="${E(p.titre)}">
    <div class="pr-2"><div><label for="prMDate">Date</label><input id="prMDate" type="date" value="${E(p.date_evt || '')}"></div><div><label for="prMHeure">Heure</label><input id="prMHeure" type="time" value="${E(p.heure || '')}"></div></div>
    <label for="prMLieu">Lieu</label><input id="prMLieu" value="${E(p.lieu || '')}">
    <button class="btn-primary" style="margin-top:12px" onclick="prModifierGo(${id})">Enregistrer</button>`);
};
window.prModifierGo = async function(id){
  const p = prGet(id); if(!p) return;
  const titre = nd(document.getElementById('prMTitre').value.trim()) || p.titre;
  const d0 = p.date_evt;
  const r = await prMaj(p, { titre, date_evt: document.getElementById('prMDate').value || null, heure: document.getElementById('prMHeure').value || null, lieu: nd(document.getElementById('prMLieu').value.trim()) || null });
  if(!r) return;
  agCloseSheet('prMod'); prVueMaj(id); prRender(); prMajAccueil();
  if(r.date_evt !== d0 && r.rappels.length) agToast('La date a changé : refais les rappels', 'info');
};
window.prSupprimer = async function(id){
  const p = prGet(id); if(!p) return;
  if(!await agConfirm(`Supprimer la préparation "${p.titre}" ?`)) return;
  await prRappelsEffacer(p);
  if(!await dbDelete('preparations', p.id)) return;
  PR.preps = PR.preps.filter(x => x.id !== id);
  agCloseSheet('prVue'); prRender(); prMajAccueil(); agToast('Préparation supprimée');
};

// ---------- "As-tu pris ?" une chose après l'autre ----------
window.prQuiz = function(id, k){
  const p = prGet(id); if(!p) return;
  const L = prScore(p).reste; k = k || 0;
  if(k >= L.length || !L.length){
    const S = prScore(p);
    agSheet('prQuiz', `<div class="pr-qz fin"><div class="pr-ring big" style="--p:${S.pct}"><b>${S.pct}%</b></div>
      <h3>${PR_NIV[prNiveau(S.pct)]}</h3><p>${S.pris} sur ${S.total} pris.</p>
      ${S.reste.length ? `<div class="pr-cons">${prConseils(p).map(c => `<div>${agIcon('bulb', 14)} ${E(c)}</div>`).join('')}</div>` : ''}
      <button class="btn-primary" onclick="agCloseSheet('prQuiz');prVoir(${id})">Voir la liste</button></div>`);
    return;
  }
  const it = L[k];
  agSheet('prQuiz', `<div class="pr-qz"><small>${k + 1} / ${L.length} · ${E(p.titre)}</small>
    <span>As-tu pris</span><b>${E(it.nom)}</b>${Number(it.qte) > 1 ? `<em>x ${Number(it.qte)}</em>` : ''}
    <button class="btn-primary" onclick="prQuizRep(${id},'${it.id}','oui',${k})">Oui, c'est pris</button>
    <button class="btn-ghost" onclick="prQuizRep(${id},'${it.id}','non',${k})">Pas encore</button>
    <button class="pr-lien" onclick="prQuizRep(${id},'${it.id}','inutile',${k})">Je n'en ai pas besoin cette fois</button></div>`);
};
window.prQuizRep = function(id, iid, rep, k){
  const p = prGet(id); const it = p && p.items.find(x => x.id === iid); if(!it) return;
  if(rep === 'oui') it.pris = true;
  if(rep === 'inutile') it.inutile = true;
  prSauverItems(p); prVueMaj(id);
  prQuiz(id, rep === 'non' ? k + 1 : k);
};

// ---------- Rappels sur le téléphone ----------
const PR_RAP = [[4, '4 jours avant'], [3, '3 jours avant'], [2, '2 jours avant'], [1, 'La veille'], [0, 'Le jour J']];
window.prRappels = function(id, auto){
  const p = prGet(id); if(!p) return;
  if(!p.date_evt){ if(!auto) agAlert('Ajoute d\'abord une date (bouton Modifier).'); return; }
  const j = jours(p.date_evt);
  const choisis = p.rappels.length ? p.rappels.map(r => r.j) : [3, 1, 0];
  agSheet('prRap', `<h3>Rappels pour "${E(p.titre)}"</h3>
    <div class="ag-hint" style="margin-top:0">Le téléphone te rappelle de préparer, même app fermée. Le jour J, il te demande "As-tu pris ?".</div>
    <div class="pr-raps">${PR_RAP.map(([n, l]) => `<label class="ag-check ${n > j ? 'off' : ''}"><input type="checkbox" data-j="${n}" ${n > j ? 'disabled' : choisis.includes(n) ? 'checked' : ''}> ${l}${p.date_evt ? ` <small>(${dateFr(ymd(new Date(new Date(p.date_evt + 'T12:00:00').getTime() - n * 864e5)))})</small>` : ''}</label>`).join('')}</div>
    <label for="prRapH">À quelle heure ?</label><input id="prRapH" type="time" value="${E((p.rappels[0] || {}).h || '19:00')}">
    <div class="ag-hint">Le jour J, le rappel arrive 2 heures avant ${p.heure ? 'ton départ (' + E(p.heure) + ')' : 'l\'heure choisie si tu n\'as pas mis d\'heure de départ'}.</div>
    <button class="btn-primary" id="prRapBtn" style="margin-top:12px" onclick="prRappelsGo(${id})">${auto ? 'Programmer les rappels' : 'Enregistrer les rappels'}</button>
    ${auto ? `<button class="btn-ghost" style="width:100%;margin-top:8px" onclick="agCloseSheet('prRap')">Pas de rappel</button>` : ''}`);
};
async function prRappelsEffacer(p){
  const now = new Date().toISOString();
  for(const r of p.rappels){
    if(!r.id || r.due < now) continue;
    try { if(await dbDelete('reminders', r.id) && typeof reminders !== 'undefined'){ const i = reminders.findIndex(x => x.id === r.id); if(i >= 0) reminders.splice(i, 1); } } catch(e){}
  }
}
window.prRappelsGo = async function(id){
  const p = prGet(id); if(!p) return;
  const H = document.getElementById('prRapH').value || '19:00';
  const choix = [...document.querySelectorAll('#prRap input[data-j]:checked')].map(x => Number(x.dataset.j));
  const b = document.getElementById('prRapBtn'); if(b) b.disabled = true;
  await prRappelsEffacer(p);
  const out = [], now = Date.now();
  for(const n of choix){
    const d = new Date(new Date(p.date_evt + 'T12:00:00').getTime() - n * 864e5);
    let heure = H;
    if(n === 0 && p.heure){ const [hh, mm] = p.heure.split(':').map(Number); const t = Math.max(0, hh * 60 + mm - 120); heure = pad(Math.floor(t / 60)) + ':' + pad(t % 60); }
    const due = new Date(ymd(d) + 'T' + heure + ':00');
    if(due.getTime() <= now) continue;
    const text = n === 0 ? `${p.titre} : c'est aujourd'hui. As-tu tout pris ? Ouvre ta liste dans Préparer.` : n === 1 ? `${p.titre} : c'est demain. Prépare ce soir et coche ce qui est pris.` : `${p.titre} dans ${n} jours : commence à préparer (charger, laver, acheter ce qui manque).`;
    const r = await dbInsert('reminders', { text, time: heure, type: 'Préparation', due_date: due.toISOString(), sent: false });
    if(r){ out.push({ id: r.id, j: n, h: H, due: r.due_date || due.toISOString() }); if(typeof reminders !== 'undefined') reminders.push(r); }
  }
  const keep = p.rappels.filter(r => r.due < new Date().toISOString());
  await prMaj(p, { rappels: keep.concat(out) });
  agCloseSheet('prRap'); prVueMaj(id);
  agToast(out.length ? `${out.length} rappel${out.length > 1 ? 's' : ''} programmé${out.length > 1 ? 's' : ''}` : 'Aucun rappel');
};

// ---------- L'IA : ce qui manque ----------
window.prIA = async function(id){
  const p = prGet(id), el = document.getElementById('prIARep'); if(!p || !el) return;
  el.innerHTML = '<div class="ag-empty">L\'IA regarde ta liste...</div>';
  const kits = PR.kits.map(k => `${k.nom} : ${k.items.map(i => i.nom).join(', ')}`).join(' | ');
  const sys = 'Tu aides Henzo, photographe et vidéaste à Bouaké (Côte d\'Ivoire), à préparer ses déplacements. Français simple, tirets simples. Tu proposes seulement ce qui manque vraiment, concret et adapté (climat chaud, routes, coupures de courant possibles).';
  const q = `Préparation : ${p.titre} (${PR_TYPES[p.type]}), ${p.date_evt ? 'le ' + p.date_evt : 'sans date'}${p.lieu ? ', à ' + p.lieu : ''}.
Déjà dans la liste : ${p.items.map(i => `${i.nom} x${i.qte}`).join(', ') || 'rien'}.
Mes kits : ${kits || 'aucun'}.
Réponds UNIQUEMENT en JSON : {"manque":[{"nom":"","qte":1,"pourquoi":""}],"conseil":""} avec 3 à 8 choses qui manquent.`;
  try {
    const r = await mkAI({ system: sys, messages: [{ role: 'user', text: q }], maxTokens: 900 });
    const j = mkJson(r.text), L = (j.manque || []).filter(x => x && x.nom).slice(0, 10);
    PR.iaProp = { id, L: L.map(x => ({ nom: nd(x.nom), qte: Math.max(1, Math.round(Number(x.qte) || 1)), pourquoi: nd(x.pourquoi || '') })) };
    el.innerHTML = `<div class="pr-ia">${j.conseil ? `<p>${E(nd(j.conseil))}</p>` : ''}${PR.iaProp.L.map((x, k) => `<label class="ag-check"><input type="checkbox" data-k="${k}" checked> <span><b>${E(x.nom)}</b>${x.qte > 1 ? ' x' + x.qte : ''}${x.pourquoi ? `<small>${E(x.pourquoi)}</small>` : ''}</span></label>`).join('')}
      ${PR.iaProp.L.length ? `<button class="btn-primary" onclick="prIAAjouter(${id})">Ajouter à ma liste</button>` : '<div class="ag-hint">Rien ne manque.</div>'}</div>`;
  } catch(e){ el.innerHTML = `<div class="ag-hint warn">L'IA n'a pas pu répondre : ${E(e.message || e)}</div>`; }
};
window.prIAAjouter = function(id){
  const p = prGet(id); if(!p || !PR.iaProp || PR.iaProp.id !== id) return;
  const ks = [...document.querySelectorAll('#prIARep input[data-k]:checked')].map(x => Number(x.dataset.k));
  ks.forEach(k => { const x = PR.iaProp.L[k]; if(x) p.items.push({ id: uid(), nom: x.nom, qte: x.qte, pris: false, cat: 'Proposé par l\'IA' }); });
  PR.iaProp = null; prApres(p); agToast(`${ks.length} ajout${ks.length > 1 ? 's' : ''}`);
};

// ---------- Bilan après ----------
window.prBilan = function(id){
  const p = prGet(id); if(!p) return;
  const B = p.bilan || {};
  agSheet('prBil', `<h3>Bilan : ${E(p.titre)}</h3>
    <div class="ag-hint" style="margin-top:0">Pour mieux préparer la prochaine fois.</div>
    <label>Qu'est-ce qui n'a pas servi ?</label>
    <div class="pr-bil">${p.items.filter(i => i.pris).map(i => `<label class="ag-check"><input type="checkbox" data-id="${i.id}" ${(B.inutiles || []).includes(i.nom) ? 'checked' : ''}> ${E(i.nom)}</label>`).join('') || '<div class="ag-hint">Rien n\'était coché.</div>'}</div>
    <label for="prBOubli">Qu'as-tu oublié ou qu'est-ce qui t'a manqué ?</label>
    <input id="prBOubli" value="${E((B.oublis || []).join(', '))}" placeholder="Ex : rallonge électrique, parapluie (sépare par des virgules)">
    <label for="prBNote">Une note pour la prochaine fois</label>
    <input id="prBNote" value="${E(B.note || '')}" placeholder="Ex : partir 1 heure plus tôt">
    ${PR.kits.length ? `<label for="prBKit">Ajouter les oublis à un kit</label><select id="prBKit"><option value="">Non</option>${PR.kits.map(k => `<option value="${k.id}">${E(k.nom)}</option>`).join('')}</select>` : ''}
    <button class="btn-primary" style="margin-top:12px" onclick="prBilanGo(${id})">Enregistrer le bilan</button>
    ${B.score != null ? `<div class="pr-cons" style="margin-top:12px">${prBilanConseils(p).map(c => `<div>${agIcon('bulb', 14)} ${E(c)}</div>`).join('')}</div>` : ''}`);
};
function prBilanConseils(p){
  const B = p.bilan || {}, out = [];
  out.push(`Note de préparation : ${B.score}/100.`);
  if((B.oublis || []).length) out.push(`La prochaine fois, pense à : ${B.oublis.join(', ')}.`);
  if((B.inutiles || []).length) out.push(`Tu peux laisser : ${B.inutiles.join(', ')} (ça allège ton sac).`);
  if(!(B.oublis || []).length && !(B.inutiles || []).length) out.push('Préparation parfaite : garde cette liste comme kit pour la prochaine fois.');
  if(B.note) out.push(B.note);
  return out;
}
window.prBilanGo = async function(id){
  const p = prGet(id); if(!p) return;
  const inutIds = [...document.querySelectorAll('#prBil .pr-bil input:checked')].map(x => x.dataset.id);
  const inutiles = p.items.filter(i => inutIds.includes(i.id)).map(i => i.nom);
  const oublis = nd(document.getElementById('prBOubli').value).split(',').map(s => s.trim()).filter(Boolean);
  const S = prScore(p);
  const score = Math.max(0, Math.min(100, Math.round(100 - oublis.length * 12 - inutiles.length * 4 - (100 - S.pct) / 4)));
  const bilan = { oublis, inutiles, note: nd(document.getElementById('prBNote').value.trim()), score, date: auj() };
  const r = await prMaj(p, { bilan, statut: 'finie' });
  if(!r) return;
  const kid = Number((document.getElementById('prBKit') || {}).value) || 0;
  if(kid && oublis.length){ const k = PR.kits.find(x => x.id === kid); if(k) await prKitSauver(k.id, k.nom, k.description, k.items.concat(oublis.filter(o => !k.items.some(i => i.nom.toLowerCase() === o.toLowerCase())).map(o => ({ nom: o, qte: 1 })))); }
  prBilan(id); prRender();
  agToast(`Bilan enregistré : ${score}/100`);
};

// ---------- Mes kits ----------
window.prKits = async function(){
  if(!PR.charge) await prCharger();
  agSheet('prKits', `<h3>Mes kits</h3>
    <div class="ag-hint" style="margin-top:0">Un kit, c'est un ensemble que tu prends toujours ensemble. Ex : "Mini PC" avec son chargeur, sa souris, son câble HDMI. Tu l'ajoutes en un geste à une préparation.</div>
    <button class="btn-primary" onclick="prKitForm()">+ Nouveau kit</button>
    <div class="pr-list">${PR.kits.map(k => `<div class="pr-card" onclick="prKitForm(${k.id})"><div class="ic">${agIcon('briefcase', 18)}</div><div class="d"><b>${E(k.nom)}</b><span>${k.items.length} chose${k.items.length > 1 ? 's' : ''} : ${E(k.items.slice(0, 4).map(i => i.nom + (Number(i.qte) > 1 ? ' x' + i.qte : '')).join(', '))}${k.items.length > 4 ? '...' : ''}</span></div>${agIcon('chev', 16)}</div>`).join('') || '<div class="ag-empty">Aucun kit pour l\'instant.</div>'}</div>`);
};
PR.kf = null;
window.prKitForm = function(id){
  const k = id ? PR.kits.find(x => x.id === id) : null;
  PR.kf = { id: k ? k.id : null, items: k ? k.items.map(i => ({ ...i })) : [] };
  const mat = (typeof EX !== 'undefined' && Array.isArray(EX.mat) ? EX.mat : []).filter(m => m.actif !== false);
  agSheet('prKitF', `<h3>${k ? 'Modifier le kit' : 'Nouveau kit'}</h3>
    <label for="prKNom">Nom du kit</label><input id="prKNom" value="${E(k ? k.nom : '')}" placeholder="Ex : Mini PC, Kit mariage, Kit studio extérieur">
    <label for="prKDesc">Description (facultatif)</label><input id="prKDesc" value="${E(k ? k.description || '' : '')}">
    <label>Ce qu'il contient</label>
    <div id="prKItems"></div>
    <div class="pr-add"><input id="prKAdd" placeholder="Ex : Chargeur" onkeydown="if(event.key==='Enter')prKitAjout()"><input id="prKQte" type="number" inputmode="numeric" min="1" value="1" aria-label="Quantité"><button class="btn-primary" onclick="prKitAjout()">Ajouter</button></div>
    ${mat.length ? `<div class="ag-hint" style="margin:10px 0 4px">Depuis Mon matériel :</div><div class="ag-pills">${mat.slice(0, 40).map(m => `<button type="button" onclick="prKitAjout(${JSON.stringify(m.nom).replace(/"/g, '&quot;')})">${E(m.nom)}</button>`).join('')}</div>` : ''}
    <button class="btn-primary" id="prKBtn" style="margin-top:14px" onclick="prKitGo()">Enregistrer le kit</button>
    ${k ? `<button class="btn-danger" style="width:100%;margin-top:8px;padding:12px" onclick="prKitSuppr(${k.id})">Supprimer le kit</button>` : ''}`);
  prKitItems();
};
function prKitItems(){
  const el = document.getElementById('prKItems'); if(!el || !PR.kf) return;
  el.innerHTML = PR.kf.items.map((i, k) => `<div class="pr-it"><label><span>${E(i.nom)}</span></label>
    <div class="pr-q"><button type="button" onclick="prKitQte(${k},-1)">-</button><b>${Number(i.qte) || 1}</b><button type="button" onclick="prKitQte(${k},1)">+</button></div>
    <button type="button" class="pr-x" onclick="PR.kf.items.splice(${k},1);prKitItems()" aria-label="Retirer">${agIcon('trash', 14)}</button></div>`).join('') || '<div class="ag-hint">Ajoute les choses de ce kit.</div>';
}
window.prKitItems = prKitItems;
window.prKitQte = function(k, d){ const i = PR.kf.items[k]; if(i){ i.qte = Math.max(1, (Number(i.qte) || 1) + d); prKitItems(); } };
window.prKitAjout = function(depuisMat){
  const inp = document.getElementById('prKAdd');
  const nom = nd(String(depuisMat || (inp ? inp.value : '')).trim()); if(!nom || !PR.kf) return;
  const ex = PR.kf.items.find(i => i.nom.toLowerCase() === nom.toLowerCase());
  const q = depuisMat ? 1 : Math.max(1, Math.round(Number((document.getElementById('prKQte') || {}).value) || 1));
  if(ex) ex.qte = (Number(ex.qte) || 1) + q; else PR.kf.items.push({ nom, qte: q });
  if(inp && !depuisMat){ inp.value = ''; inp.focus(); }
  const qe = document.getElementById('prKQte'); if(qe) qe.value = 1;
  prKitItems();
};
async function prKitSauver(id, nom, description, items){
  const data = { nom, description: description || null, items, updated_at: new Date().toISOString() };
  const r = id ? await dbUpdate('kits', id, data) : await dbInsert('kits', data);
  if(!r) return null;
  const n = { ...r, items: prArr(r.items) }, i = PR.kits.findIndex(x => x.id === n.id);
  if(i >= 0) PR.kits[i] = n; else PR.kits.push(n);
  PR.kits.sort((a, b) => a.nom.localeCompare(b.nom));
  return n;
}
window.prKitGo = async function(){
  const nom = nd(document.getElementById('prKNom').value.trim());
  if(!nom){ agAlert('Donne un nom au kit.'); return; }
  if(!PR.kf.items.length){ agAlert('Ajoute au moins une chose dans le kit.'); return; }
  const b = document.getElementById('prKBtn'); if(b) b.disabled = true;
  const r = await prKitSauver(PR.kf.id, nom, nd(document.getElementById('prKDesc').value.trim()), PR.kf.items);
  if(b) b.disabled = false;
  if(!r) return;
  agCloseSheet('prKitF'); if(document.getElementById('prKits')) prKits();
  prRender(); agToast('Kit enregistré : ' + nom);
};
window.prKitSuppr = async function(id){
  const k = PR.kits.find(x => x.id === id); if(!k) return;
  if(!await agConfirm(`Supprimer le kit "${k.nom}" ? Les préparations déjà faites gardent leur liste.`)) return;
  if(!await dbDelete('kits', id)) return;
  PR.kits = PR.kits.filter(x => x.id !== id);
  agCloseSheet('prKitF'); prKits(); prRender();
};
window.prVersKit = async function(id){
  const p = prGet(id); if(!p || !p.items.length) return;
  const nom = await agPrompt('Garder comme kit\nNom du kit (tu pourras l\'ajouter en un geste)', p.titre, { ok: 'Créer le kit' });
  const nomF = nd(String(nom || '').trim());
  if(!nomF) return;
  const items = []; p.items.filter(i => !i.inutile).forEach(i => { if(!items.some(x => x.nom.toLowerCase() === i.nom.toLowerCase())) items.push({ nom: i.nom, qte: Number(i.qte) || 1 }); });
  const r = await prKitSauver(null, nomF, '', items);
  if(r){ agToast(`Kit "${r.nom}" créé (${items.length})`); prVueMaj(id); }
};

// ---------- Carte sur l'Accueil ----------
function prProches(){ return PR.preps.filter(p => p.statut !== 'finie' && p.date_evt && jours(p.date_evt) >= 0 && jours(p.date_evt) <= 4).sort((a, b) => a.date_evt.localeCompare(b.date_evt)); }
window.prProches = prProches;
function prMajAccueil(){ try { if(typeof agRenderDashMini === 'function' && document.getElementById('agDashMini')) agRenderDashMini(); } catch(e){} }
if(typeof agRenderDashMini === 'function'){
  const dashPr = agRenderDashMini;
  agRenderDashMini = function(){
    const r = dashPr.apply(this, arguments);
    try {
      const el = document.getElementById('agDashMini'); if(!el) return r;
      const old = document.getElementById('prDash'); if(old) old.remove();
      const L = prProches(); if(!L.length) return r;
      const p = L[0], S = prScore(p), j = jours(p.date_evt), niv = prNiveau(S.pct);
      const d = document.createElement('div'); d.id = 'prDash'; d.className = 'crm-fete pr-dash ' + niv;
      d.onclick = () => (j <= 1 && S.reste.length ? prQuiz(p.id) : prVoir(p.id));
      d.innerHTML = `<div class="ic">${agIcon(PR_TYPE_IC[p.type] || 'check')}</div><div class="d"><b>${E(p.titre)} ${quand(j)} : ${S.pct} % prêt</b><span>${S.reste.length ? (j <= 1 ? `As-tu pris : ${E(S.reste.slice(0, 3).map(i => i.nom).join(', '))}${S.reste.length > 3 ? '...' : ''} ?` : `${S.reste.length} chose${S.reste.length > 1 ? 's' : ''} à prendre`) : 'Tout est pris'}${L.length > 1 ? ` · et ${L.length - 1} autre${L.length > 2 ? 's' : ''}` : ''}</span><div class="pr-bar ${niv}"><i style="width:${S.pct}%"></i></div></div>${agIcon('chev', 16)}`;
      const ref = el.querySelector('#ocDash') || el.querySelector('#apBudgetDash') || el.querySelector('#otResaDash') || el.querySelector('.ag-hello');
      if(ref && ref.nextSibling) el.insertBefore(d, ref.nextSibling); else el.appendChild(d);
    } catch(e){ console.warn('prep dash', e); }
    return r;
  };
}
setTimeout(async () => { try { const s = typeof sb !== 'undefined' ? (await sb.auth.getSession()).data : null; if(s && s.session){ await prCharger(); prMajAccueil(); if(document.getElementById('page-prep') && document.getElementById('page-prep').classList.contains('active')) prRender(); } } catch(e){} }, 1600);

(function prCss(){
  if(document.getElementById('prCss')) return;
  const st = document.createElement('style'); st.id = 'prCss';
  st.textContent = `
.pr-top{display:flex;gap:8px;margin-bottom:12px}.pr-top button{flex:1;margin:0;display:inline-flex;align-items:center;justify-content:center;gap:6px}
.pr-list{margin-top:10px}
.pr-card{display:flex;align-items:center;gap:12px;padding:12px;border-radius:14px;background:var(--card2);border:1px solid var(--border);margin:8px 0;cursor:pointer}
.pr-card .ic,.pr-dash .ic{flex-shrink:0;width:38px;height:38px;border-radius:12px;background:var(--card);display:flex;align-items:center;justify-content:center;color:var(--accent)}
.pr-card .d{flex:1;min-width:0}.pr-card b{display:block;color:var(--text);font-size:14px}.pr-card span{display:block;color:var(--muted);font-size:12.5px;margin-top:2px}.pr-card small{color:var(--muted);font-size:11.5px}
.pr-bar{height:6px;border-radius:99px;background:var(--card);margin:6px 0 4px;overflow:hidden}.pr-bar i{display:block;height:100%;border-radius:99px;background:#f5a524}
.pr-bar.pret i{background:#34c759}.pr-bar.presque i{background:var(--accent)}.pr-bar.debut i{background:#ff6b5a}
.pr-score{display:flex;align-items:center;gap:14px;margin:12px 0}.pr-score b{display:block;color:var(--text);font-size:16px}.pr-score span{color:var(--muted);font-size:13px}
.pr-ring{--p:0;flex-shrink:0;width:64px;height:64px;border-radius:50%;background:conic-gradient(var(--accent) calc(var(--p)*1%),var(--card2) 0);display:flex;align-items:center;justify-content:center;position:relative}
.pr-ring::before{content:'';position:absolute;inset:6px;border-radius:50%;background:var(--card)}.pr-ring b{position:relative;font-size:15px!important}
.pr-ring.big{width:96px;height:96px;margin:6px auto 10px}.pr-ring.big b{font-size:22px!important}
.pr-score.pret .pr-ring{background:conic-gradient(#34c759 calc(var(--p)*1%),var(--card2) 0)}
.pr-cons{display:flex;flex-direction:column;gap:6px;padding:10px 12px;border-radius:12px;background:var(--card2);font-size:13px;color:var(--text);line-height:1.45}
.pr-cons div{display:flex;gap:6px;align-items:flex-start}.pr-cons svg{flex-shrink:0;margin-top:2px;color:#f5a524}
.pr-acts{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.pr-acts button{flex:1;margin:0;min-width:120px;display:inline-flex;align-items:center;justify-content:center;gap:6px}
.pr-acts.small button{flex:none;min-width:0;width:auto!important;background:transparent;border:1px solid var(--border);color:var(--muted);border-radius:10px;padding:8px 10px;font-size:12.5px;cursor:pointer}
.pr-cat{margin:14px 0 4px;font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.pr-it{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)}
.pr-it label{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:10px;margin:0;cursor:pointer;font-size:14px;color:var(--text)}
.pr-it input[type=checkbox]{width:22px;height:22px;accent-color:var(--accent);flex-shrink:0}
.pr-it.pris span{text-decoration:line-through;color:var(--muted)}.pr-it.inut{opacity:.45}
.pr-q{display:flex;align-items:center;gap:6px;flex:0 0 auto}.pr-q button{width:28px!important;flex:0 0 28px;height:28px;border-radius:8px;border:1px solid var(--border);background:var(--card2);color:var(--text);cursor:pointer;margin:0;padding:0;font-size:16px}
.pr-q b{min-width:20px;text-align:center;color:var(--text);font-size:13px}
.pr-x{background:none;border:0;color:var(--muted);cursor:pointer;padding:4px;margin:0;width:auto!important;flex:0 0 auto}
.pr-add{display:flex;gap:6px;margin-top:12px}.pr-add input{flex:1;margin:0}.pr-add input[type=number]{flex:0 0 60px}.pr-add button{margin:0;padding:0 14px;width:auto!important;flex:0 0 auto}
.pr-2{display:flex;gap:8px}.pr-2>div{flex:1}
.pr-kpick small{opacity:.6;margin-left:4px}
.pr-qz{text-align:center;padding:10px 4px}.pr-qz small{color:var(--muted)}.pr-qz>span{display:block;margin-top:16px;color:var(--muted);font-size:15px}
.pr-qz>b{display:block;font-size:24px;color:var(--text);margin:6px 0}.pr-qz em{display:block;font-style:normal;color:var(--accent);font-weight:700;margin-bottom:8px}
.pr-qz button{width:100%;margin:8px 0 0}.pr-qz p{color:var(--muted)}.pr-qz .pr-cons{text-align:left;margin:10px 0}
.pr-lien{width:auto!important;background:none;border:0;color:var(--muted);text-decoration:underline;cursor:pointer;font-size:13px}
.pr-raps .ag-check.off{opacity:.4}.pr-raps small{color:var(--muted)}
.pr-ia{margin-top:12px;padding:12px;border-radius:12px;background:var(--card2)}.pr-ia p{margin:0 0 8px;font-size:13px;color:var(--text)}
.pr-ia .ag-check span small{display:block;color:var(--muted);font-size:12px}.pr-ia button{margin-top:8px;width:100%}
.pr-dash .pr-bar{margin:6px 0 0}`;
  document.head.appendChild(st);
})();
})();
