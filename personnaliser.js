// ============================================================
// PERSONNALISER.JS - Notes rangées et l'app à ton goût
// ------------------------------------------------------------
// 1. Notes : dossiers (ex : "Tarifs studio"), une couleur et une police
//    par note, des étoiles de 1 à 5. Filtre par dossier et par étoiles,
//    tri par étoiles, couleur ou dossier. "Revenir à l'initial".
//    Colonnes : notes.dossier, notes.etoiles, notes.style {couleur, police}.
//    Les dossiers vides sont gardés dans user_preferences.notes_dossiers.
// 2. Comptes : une couleur par compte (colonne accounts.color).
// 3. Signature des messages WhatsApp : "Henzo Photographie" écrit avec
//    des lettres spéciales (manuscrite, gras, italique...) qui passent
//    dans WhatsApp. Réglage dans user_preferences.signature.
// Tout est dans la base : la sauvegarde de l'app le garde.
// ============================================================
(function(){
'use strict';
if(typeof agSheet !== 'function') return;
const E = s => agEsc(String(s == null ? '' : s));
const NS = { prefs: {}, charge: false, filtre: { dossier: 'tous', tri: 'defaut', min: 0 } };
window.NS = NS;
const nd = s => String(s || '').replace(/[–—]/g, '-');
try { Object.assign(NS.filtre, JSON.parse(localStorage.getItem('ns_filtre') || '{}')); } catch(e){}
const garderFiltre = () => { try { localStorage.setItem('ns_filtre', JSON.stringify(NS.filtre)); } catch(e){} };

const NS_STAR = '<svg width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.8l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 17l-5.8 3.3 1.4-6.4-4.9-4.4 6.5-.7z"/></svg>';
const NS_COULEURS = [['#2ecc71', 'Vert'], ['#ff5a5f', 'Rouge'], ['#3b82f6', 'Bleu'], ['#f5a524', 'Orange'], ['#a855f7', 'Violet'], ['#ec4899', 'Rose'], ['#14b8a6', 'Turquoise'], ['#eab308', 'Jaune'], ['#94a3b8', 'Gris'], ['#8b5a2b', 'Marron']];
const NS_POLICES = [['', 'Normale'], ['Poppins', 'Poppins'], ['Montserrat', 'Montserrat'], ['Playfair Display', 'Playfair (élégante)'], ['Lora', 'Lora'], ['Caveat', 'Caveat (écrite à la main)'], ['Dancing Script', 'Dancing (manuscrite)'], ['Oswald', 'Oswald (haute)'], ['Courier Prime', 'Machine à écrire']];
function nsPolice(p){
  if(!p) return;
  const id = 'nsF_' + p.replace(/\W/g, '');
  if(document.getElementById(id)) return;
  const l = document.createElement('link'); l.id = id; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=' + p.replace(/ /g, '+') + ':wght@400;600;700&display=swap';
  document.head.appendChild(l);
}
function obj(v){ if(typeof v === 'string'){ try { v = JSON.parse(v); } catch(e){ v = null; } } return v && typeof v === 'object' ? v : {}; }

// ---------- Réglages (user_preferences) ----------
async function nsChargerPrefs(){
  if(NS.charge || typeof sb === 'undefined') return;
  try {
    const { data: u } = await sb.auth.getUser();
    const { data } = await sb.from('user_settings').select('user_preferences').eq('user_id', u.user.id).maybeSingle();
    NS.prefs = (data && data.user_preferences) || {};
  } catch(e){}
  NS.charge = true;
}
async function nsSavePrefs(patch){
  const ok = typeof crmSavePrefs === 'function' ? await crmSavePrefs(patch) : false;
  if(ok) Object.assign(NS.prefs, patch);
  return ok;
}

// ============================================================
// 1. NOTES
// ============================================================
function nsDossiers(){
  const L = (Array.isArray(NS.prefs.notes_dossiers) ? NS.prefs.notes_dossiers : []).slice();
  (typeof notes !== 'undefined' ? notes : []).forEach(n => { if(n.dossier && !L.includes(n.dossier)) L.push(n.dossier); });
  return L.sort((a, b) => a.localeCompare(b));
}
window.nsDossiers = nsDossiers;
function nsEtoilesHtml(n, petit){
  const v = Number(n.etoiles) || 0;
  return `<span class="ns-et ${petit ? 'petit' : ''}" role="group" aria-label="Étoiles">${[1, 2, 3, 4, 5].map(i => `<button type="button" class="${i <= v ? 'on' : ''}" onclick="event.stopPropagation();nsEtoiles(${n.id},${i})" aria-label="${i} étoile${i > 1 ? 's' : ''}">${NS_STAR}</button>`).join('')}</span>`;
}
const NS_ET_LIB = { 5: 'Mon préféré', 4: 'Très bien', 3: 'Moyen', 2: 'Bof', 1: 'Pas important' };
async function nsMajNote(id, patch){
  const r = await dbUpdate('notes', id, patch);
  if(!r) return null;
  const i = notes.findIndex(x => x.id === id); if(i >= 0) notes[i] = r;
  return r;
}
window.nsEtoiles = async function(id, v){
  const n = notes.find(x => x.id === id); if(!n) return;
  const nv = Number(n.etoiles) === v ? null : v;
  if(await nsMajNote(id, { etoiles: nv })){ renderNotes(); agToast(nv ? `${nv} étoile${nv > 1 ? 's' : ''} : ${NS_ET_LIB[nv]}` : 'Étoiles retirées'); }
};

// Barre : dossiers, étoiles, tri
function nsBarre(){
  const list = document.getElementById('notesList'); if(!list) return;
  let bar = document.getElementById('nsBar');
  if(!bar){ bar = document.createElement('div'); bar.id = 'nsBar'; list.parentNode.insertBefore(bar, list); }
  const F = NS.filtre, D = nsDossiers();
  if(F.dossier !== 'tous' && F.dossier !== 'aucun' && !D.includes(F.dossier)) F.dossier = 'tous';
  const nb = d => notes.filter(n => !n.archived && (d === 'aucun' ? !n.dossier : n.dossier === d)).length;
  bar.innerHTML = `<div class="ns-dos">${[['tous', 'Tous les dossiers'], ...D.map(d => [d, d]), ['aucun', 'Sans dossier']].map(([k, l]) => `<button type="button" class="${F.dossier === k ? 'on' : ''}" onclick="nsFiltre('dossier',${E(JSON.stringify(k))})">${k !== 'tous' && k !== 'aucun' ? agIcon('note', 13) + ' ' : ''}${E(l)}${k !== 'tous' ? ` <small>${nb(k)}</small>` : ''}</button>`).join('')}<button type="button" class="ns-plus" onclick="nsNouveauDossier()">+ Dossier</button></div>
    <div class="ns-tri"><select aria-label="Étoiles" onchange="nsFiltre('min',Number(this.value))">${[[0, 'Toutes les étoiles'], [5, '5 étoiles seulement'], [4, '4 étoiles et plus'], [3, '3 étoiles et plus'], [1, 'Avec des étoiles']].map(([v, l]) => `<option value="${v}" ${F.min === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <select aria-label="Trier" onchange="nsFiltre('tri',this.value)">${[['defaut', 'Tri : habituel'], ['etoiles', 'Tri : étoiles'], ['couleur', 'Tri : couleur'], ['dossier', 'Tri : dossier'], ['recent', 'Tri : plus récentes']].map(([v, l]) => `<option value="${v}" ${F.tri === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      ${F.dossier !== 'tous' && F.dossier !== 'aucun' ? `<button type="button" class="ns-gerer" onclick="nsGererDossier(${E(JSON.stringify(F.dossier))})">Renommer</button>` : ''}</div>`;
}
window.nsFiltre = function(k, v){ NS.filtre[k] = v; garderFiltre(); renderNotes(); };
window.nsNouveauDossier = async function(depuis){
  const nom = await agPrompt('Nouveau dossier\nEx : Tarifs studio, Réseaux sociaux, Clients', '', { ok: 'Créer' });
  const n = nd(String(nom || '').trim()); if(!n) return null;
  const D = nsDossiers(); if(!D.includes(n)) await nsSavePrefs({ notes_dossiers: D.concat([n]).filter((x, i, a) => a.indexOf(x) === i) });
  if(!depuis){ NS.filtre.dossier = n; garderFiltre(); renderNotes(); }
  agToast('Dossier créé : ' + n);
  return n;
};
window.nsGererDossier = async function(d){
  const nom = await agPrompt('Renommer le dossier\nLes notes dedans suivent. Laisse vide pour supprimer le dossier (les notes restent, sans dossier).', d, { ok: 'Valider' });
  if(nom == null) return;
  const n = nd(String(nom).trim());
  const dedans = notes.filter(x => x.dossier === d);
  for(const x of dedans){ await nsMajNote(x.id, { dossier: n || null }); }
  const D = (Array.isArray(NS.prefs.notes_dossiers) ? NS.prefs.notes_dossiers : []).filter(x => x !== d);
  if(n && !D.includes(n)) D.push(n);
  await nsSavePrefs({ notes_dossiers: D });
  NS.filtre.dossier = n || 'tous'; garderFiltre(); renderNotes();
  agToast(n ? 'Dossier renommé' : 'Dossier supprimé (les notes sont gardées)');
};

// Après l'affichage habituel : filtre, tri et décoration
function nsApres(){
  const el = document.getElementById('notesList'); if(!el) return;
  nsBarre();
  const F = NS.filtre, cards = [...el.querySelectorAll(':scope > .note-card')];
  const ordreC = c => { const i = NS_COULEURS.findIndex(x => x[0] === c); return i < 0 ? 99 : i; };
  let vis = 0;
  cards.forEach(card => {
    const n = notes.find(x => x.id === Number(card.dataset.note)); if(!n) return;
    const st = obj(n.style), ok = (F.dossier === 'tous' || (F.dossier === 'aucun' ? !n.dossier : n.dossier === F.dossier)) && (!F.min || (Number(n.etoiles) || 0) >= F.min);
    card.style.display = ok ? '' : 'none'; if(ok) vis++;
    card.classList.toggle('ns-col', !!st.couleur);
    card.style.setProperty('--ns-c', st.couleur || '');
    if(st.police){ nsPolice(st.police); card.style.setProperty('--ns-f', `"${st.police}"`); card.classList.add('ns-pol'); } else card.classList.remove('ns-pol');
    const t = card.querySelector('.note-title');
    if(t && !t.querySelector('.ns-dch') && n.dossier) t.insertAdjacentHTML('beforeend', `<span class="ns-dch">${agIcon('note', 11)} ${E(n.dossier)}</span>`);
    const meta = card.querySelector('.note-meta');
    if(meta && !meta.querySelector('.ns-et')) meta.insertAdjacentHTML('afterbegin', nsEtoilesHtml(n, true));
    const q = card.querySelector('.note-quick');
    if(q && !q.querySelector('.ns-pb')) q.insertAdjacentHTML('afterbegin', `<button class="ns-pb" onclick="nsPerso(${n.id})" title="Couleur, police, dossier, étoiles" aria-label="Personnaliser"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2a10 10 0 0 0 0 20c1 0 1.5-.8 1.5-1.5 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.8.7-1.5 1.5-1.5H16a6 6 0 0 0 6-6c0-4.9-4.5-8.8-10-8.8z"/></svg></button>`);
  });
  if(F.tri !== 'defaut'){
    const key = c => { const n = notes.find(x => x.id === Number(c.dataset.note)) || {}; return n; };
    const cmp = {
      etoiles: (a, b) => (Number(b.etoiles) || 0) - (Number(a.etoiles) || 0),
      couleur: (a, b) => ordreC(obj(a.style).couleur) - ordreC(obj(b.style).couleur),
      dossier: (a, b) => (a.dossier ? 0 : 1) - (b.dossier ? 0 : 1) || String(a.dossier || '').localeCompare(String(b.dossier || '')),
      recent: (a, b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))
    }[F.tri];
    if(cmp) cards.slice().sort((x, y) => { const a = key(x), b = key(y); return (!!a.archived - !!b.archived) || (!!b.pinned - !!a.pinned) || cmp(a, b); }).forEach(c => el.appendChild(c));
  }
  el.querySelector(':scope > .ns-vide')?.remove();
  if(cards.length && !vis) el.insertAdjacentHTML('beforeend', `<div class="empty ns-vide">Aucune note ${F.dossier === 'aucun' ? 'sans dossier' : F.dossier !== 'tous' ? 'dans « ' + E(F.dossier) + ' »' : ''}${F.min ? ' avec ces étoiles' : ''}.</div>`);
}
if(typeof renderNotes === 'function'){
  const renderNs = renderNotes;
  renderNotes = function(){ const r = renderNs.apply(this, arguments); try { nsApres(); } catch(e){ console.warn('ns notes', e); } return r; };
}

// ---------- Personnaliser une note ----------
window.nsPerso = function(id){
  const n = notes.find(x => x.id === id); if(!n) return;
  const st = obj(n.style);
  NS_POLICES.forEach(p => nsPolice(p[0]));
  NS.edit = { id, couleur: st.couleur || '', police: st.police || '', etoiles: Number(n.etoiles) || 0, dossier: n.dossier || '' };
  agSheet('nsPersoS', `<h3>Personnaliser la note</h3>
    <div class="ns-ap" id="nsAp"></div>
    <label>Couleur</label>
    <div class="ns-cols" id="nsCols">${[['', 'Aucune']].concat(NS_COULEURS).map(([c, l]) => `<button type="button" data-c="${c}" title="${l}" style="${c ? 'background:' + c : ''}" class="${c ? '' : 'none'}" onclick="nsEdit('couleur','${c}')">${c ? '' : '×'}</button>`).join('')}</div>
    <label>Police</label>
    <div class="ns-pols" id="nsPols">${NS_POLICES.map(([p, l]) => `<button type="button" data-p="${E(p)}" style="${p ? `font-family:'${p}'` : ''}" onclick="nsEdit('police',${E(JSON.stringify(p))})">${E(l)}</button>`).join('')}</div>
    <label>Étoiles</label>
    <div class="ns-et grand" id="nsEts">${[1, 2, 3, 4, 5].map(i => `<button type="button" data-i="${i}" onclick="nsEdit('etoiles',${i})" aria-label="${i}">${NS_STAR}</button>`).join('')}<span id="nsEtL"></span></div>
    <label for="nsDos">Dossier</label>
    <div class="ns-dsel"><select id="nsDos" onchange="nsEdit('dossier',this.value)"><option value="">Sans dossier</option>${nsDossiers().map(d => `<option ${d === NS.edit.dossier ? 'selected' : ''}>${E(d)}</option>`).join('')}</select><button type="button" class="btn-ghost" onclick="nsDossierDepuisPerso()">+ Nouveau</button></div>
    <button class="btn-primary" style="margin-top:14px" onclick="nsPersoGo()">Enregistrer</button>
    <button class="btn-ghost" style="width:100%;margin-top:8px" onclick="nsPersoInitial()">Revenir à l'initial</button>`);
  nsPersoMaj();
};
window.nsEdit = function(k, v){ if(k === 'etoiles' && NS.edit.etoiles === v) v = 0; NS.edit[k] = v; nsPersoMaj(); };
function nsPersoMaj(){
  const e = NS.edit, n = notes.find(x => x.id === e.id) || {};
  document.querySelectorAll('#nsCols button').forEach(b => b.classList.toggle('on', b.dataset.c === e.couleur));
  document.querySelectorAll('#nsPols button').forEach(b => b.classList.toggle('on', b.dataset.p === e.police));
  document.querySelectorAll('#nsEts button').forEach(b => b.classList.toggle('on', Number(b.dataset.i) <= e.etoiles));
  const l = document.getElementById('nsEtL'); if(l) l.textContent = e.etoiles ? NS_ET_LIB[e.etoiles] : '';
  const ap = document.getElementById('nsAp');
  if(ap) ap.innerHTML = `<div class="ns-apc" style="${e.couleur ? `--ns-c:${e.couleur};` : ''}${e.police ? `font-family:'${e.police}',Inter,sans-serif` : ''}"><b>${E(n.title || String(n.content || '').slice(0, 40))}</b><p>${E(String(n.content || '').slice(0, 120))}</p>${e.dossier ? `<small>${E(e.dossier)}</small>` : ''}</div>`;
}
window.nsDossierDepuisPerso = async function(){
  const d = await nsNouveauDossier(true); if(!d) return;
  NS.edit.dossier = d;
  const s = document.getElementById('nsDos'); if(s){ if(![...s.options].some(o => o.value === d)) s.insertAdjacentHTML('beforeend', `<option>${E(d)}</option>`); s.value = d; }
  nsPersoMaj();
};
window.nsPersoGo = async function(){
  const e = NS.edit; if(!e) return;
  const style = e.couleur || e.police ? { couleur: e.couleur || null, police: e.police || null } : null;
  if(!await nsMajNote(e.id, { style, etoiles: e.etoiles || null, dossier: e.dossier || null })) return;
  agCloseSheet('nsPersoS'); renderNotes(); agToast('Note personnalisée');
};
window.nsPersoInitial = async function(){
  const e = NS.edit; if(!e) return;
  if(!await nsMajNote(e.id, { style: null })) return;
  agCloseSheet('nsPersoS'); renderNotes(); agToast('Couleur et police remises comme au départ');
};

// ---------- Dans la fenêtre d'une note : dossier et étoiles ----------
if(typeof openNoteModal === 'function' && typeof saveNote === 'function'){
  const ouvrirNoteNs = openNoteModal;
  openNoteModal = function(id){
    const r = ouvrirNoteNs.apply(this, arguments);
    try {
      const n = id ? notes.find(x => x.id === id) : null;
      const tags = document.getElementById('noteTags'); if(!tags) return r;
      let box = document.getElementById('nsNoteBox');
      if(!box){ box = document.createElement('div'); box.id = 'nsNoteBox'; tags.insertAdjacentElement('afterend', box); }
      const dos = n ? n.dossier || '' : (NS.filtre.dossier !== 'tous' && NS.filtre.dossier !== 'aucun' ? NS.filtre.dossier : '');
      NS.modal = { etoiles: n ? Number(n.etoiles) || 0 : 0 };
      box.innerHTML = `<label for="nsMDos">Dossier</label><div class="ns-dsel"><select id="nsMDos"><option value="">Sans dossier</option>${nsDossiers().map(d => `<option ${d === dos ? 'selected' : ''}>${E(d)}</option>`).join('')}</select><button type="button" class="btn-ghost" onclick="nsDossierModal()">+ Nouveau</button></div>
        <label>Étoiles</label><div class="ns-et grand" id="nsMEt">${[1, 2, 3, 4, 5].map(i => `<button type="button" data-i="${i}" onclick="nsModalEt(${i})" aria-label="${i}">${NS_STAR}</button>`).join('')}</div>`;
      nsModalEt(null);
    } catch(e){ console.warn('ns modal', e); }
    return r;
  };
  window.nsModalEt = function(i){ if(i != null) NS.modal.etoiles = NS.modal.etoiles === i ? 0 : i; document.querySelectorAll('#nsMEt button').forEach(b => b.classList.toggle('on', Number(b.dataset.i) <= NS.modal.etoiles)); };
  window.nsDossierModal = async function(){ const d = await nsNouveauDossier(true); if(!d) return; const s = document.getElementById('nsMDos'); if(s){ s.insertAdjacentHTML('beforeend', `<option>${E(d)}</option>`); s.value = d; } };
  const saveNs = saveNote;
  saveNote = async function(){
    const s = document.getElementById('nsMDos');
    const dossier = s ? (s.value || null) : undefined, etoiles = NS.modal ? (NS.modal.etoiles || null) : undefined;
    const idAvant = typeof editingNoteId !== 'undefined' ? editingNoteId : null, nAvant = notes.length, idsAvant = notes.map(x => x.id);
    const r = await saveNs.apply(this, arguments);
    if(dossier === undefined) return r;
    try {
      const n = idAvant ? notes.find(x => x.id === idAvant) : (notes.length > nAvant ? notes.find(x => !idsAvant.includes(x.id)) : null);
      if(n && ((n.dossier || null) !== dossier || (Number(n.etoiles) || null) !== etoiles)){ await nsMajNote(n.id, { dossier, etoiles }); renderNotes(); }
    } catch(e){ console.warn('ns save', e); }
    return r;
  };
}

// ============================================================
// 2. COULEUR DES COMPTES
// ============================================================
function nsCouleursComptes(){
  document.querySelectorAll('.ag-acc[onclick*="agOpenAccount("]').forEach(el => {
    const m = /agOpenAccount\((\d+)\)/.exec(el.getAttribute('onclick') || ''); if(!m) return;
    const a = accounts.find(x => x.id === Number(m[1])); const c = a && a.color;
    el.classList.toggle('ns-acc', !!c); el.style.setProperty('--ns-c', c || '');
  });
}
window.nsCouleursComptes = nsCouleursComptes;
['agRenderArgent', 'agRenderDashMini'].forEach(f => {
  if(typeof window[f] !== 'function') return;
  const o = window[f];
  window[f] = function(){ const r = o.apply(this, arguments); try { nsCouleursComptes(); } catch(e){} return r; };
});
function nsPalette(id, sel, fn){
  return `<div class="ns-cols" id="${id}">${[['', 'Couleur de base']].concat(NS_COULEURS).map(([c, l]) => `<button type="button" data-c="${c}" title="${l}" style="${c ? 'background:' + c : ''}" class="${c ? '' : 'none'} ${c === (sel || '') ? 'on' : ''}" onclick="${fn}('${c}')">${c ? '' : '×'}</button>`).join('')}</div>`;
}
if(typeof agOpenAccountForm === 'function'){
  const formNs = agOpenAccountForm;
  agOpenAccountForm = function(id){
    const r = formNs.apply(this, arguments);
    try {
      const a = id ? accounts.find(x => x.id === id) : null, btn = document.querySelector('#agAccForm .btn-primary'); if(!btn) return r;
      NS.accC = a && a.color || '';
      btn.insertAdjacentHTML('beforebegin', `<label>Couleur du compte</label>${nsPalette('nsAccCol', NS.accC, 'nsAccCouleur')}<div class="ag-hint" style="margin-top:4px">Pour reconnaître le compte d'un coup d'œil. « × » = couleur de base.</div>`);
    } catch(e){}
    return r;
  };
  window.nsAccCouleur = function(c){ NS.accC = c; document.querySelectorAll('#nsAccCol button').forEach(b => b.classList.toggle('on', b.dataset.c === c)); };
  const saveAccNs = agSaveAccount;
  agSaveAccount = async function(id){
    const c = document.getElementById('nsAccCol') ? (NS.accC || null) : undefined, avant = accounts.map(x => x.id);
    const r = await saveAccNs.apply(this, arguments);
    if(c === undefined) return r;
    try {
      if(document.getElementById('agAccForm')) return r;
      const a = id ? accounts.find(x => x.id === id) : accounts.find(x => !avant.includes(x.id));
      if(a && (a.color || null) !== c){ const u = await dbUpdate('accounts', a.id, { color: c }); if(u){ a.color = c; if(typeof agRenderAll === 'function') agRenderAll(); nsCouleursComptes(); } }
    } catch(e){ console.warn('ns acc', e); }
    return r;
  };
}

// ============================================================
// 3. SIGNATURE DES MESSAGES (lettres spéciales WhatsApp)
// ============================================================
const NS_SIG = [
  ['normal', 'Normale', null],
  ['manuscrite', 'Manuscrite', [0x1D4D0, 0x1D4EA, null]],
  ['gras', 'Grasse', [0x1D400, 0x1D41A, 0x1D7CE]],
  ['italique', 'Italique élégante', [0x1D468, 0x1D482, null]],
  ['moderne', 'Moderne grasse', [0x1D5D4, 0x1D5EE, 0x1D7EC]],
  ['gothique', 'Gothique', [0x1D56C, 0x1D586, null]],
  ['capitales', 'Petites capitales', 'caps'],
  ['espacee', 'Espacée', 'espace']
];
const CAPS = { a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 's', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ' };
function nsStyler(txt, style){
  const s = NS_SIG.find(x => x[0] === style); if(!s || !s[2]) return txt;
  const plain = String(txt).normalize('NFD').replace(/[̀-ͯ]/g, '');
  if(s[2] === 'caps') return plain.split('').map(c => CAPS[c.toLowerCase()] || c).join('');
  if(s[2] === 'espace') return plain.toUpperCase().split('').join(' ').replace(/ {3}/g, '   ');
  const [A, a, d] = s[2];
  return [...plain].map(c => { const k = c.charCodeAt(0);
    if(k >= 65 && k <= 90) return String.fromCodePoint(A + k - 65);
    if(k >= 97 && k <= 122) return String.fromCodePoint(a + k - 97);
    if(d && k >= 48 && k <= 57) return String.fromCodePoint(d + k - 48);
    return c; }).join('');
}
window.nsStyler = nsStyler;
function nsSig(){ const s = obj(NS.prefs.signature); return { texte: s.texte || (typeof BRAND !== 'undefined' ? BRAND.name.replace(/\b(\w)(\w*)/g, (m, a, b) => a + b.toLowerCase()) : 'Henzo Photographie'), style: s.style || 'normal', ajouter: !!s.ajouter }; }
// Remplace la signature (dans les 3 dernières lignes) par sa version stylée ; l'ajoute si demandé
function nsSigner(msg){
  const S = nsSig(); if(S.style === 'normal' && !S.ajouter) return msg;
  const noms = [S.texte, 'Henzo Photographie', 'Henzo Studio', typeof BRAND !== 'undefined' ? BRAND.name : ''].filter(Boolean);
  const L = String(msg).split('\n'); let trouve = false;
  for(let i = L.length - 1; i >= Math.max(0, L.length - 3); i--){
    for(const nom of noms){
      const re = new RegExp(nom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      if(re.test(L[i])){ L[i] = L[i].replace(re, nsStyler(S.texte, S.style)); trouve = true; break; }
    }
    if(trouve) break;
  }
  if(!trouve && S.ajouter) L.push('', nsStyler(S.texte, S.style));
  return L.join('\n');
}
window.nsSigner = nsSigner;
const fenetreNs = window.open;
window.open = function(url){
  try {
    if(typeof url === 'string' && /^https:\/\/wa\.me\//.test(url) && /[?&]text=/.test(url)){
      const u = new URL(url), t = u.searchParams.get('text');
      if(t){ const s = nsSigner(t); if(s !== t){ u.searchParams.set('text', s); arguments[0] = u.toString().replace(/\+/g, '%20'); } }
    }
  } catch(e){}
  return fenetreNs.apply(window, arguments);
};

// ============================================================
// 4. LA FENÊTRE "PERSONNALISER L'APP"
// ============================================================
window.nsOuvrir = async function(){
  await nsChargerPrefs();
  const S = nsSig();
  agSheet('nsApp', `<h3>Personnaliser l'app</h3>
    <div class="ns-sec">Signature de mes messages WhatsApp</div>
    <div class="ag-hint" style="margin-top:0">WhatsApp ne permet pas de changer la police. L'app utilise des lettres spéciales qui s'affichent partout. Elle remplace ta signature à la fin des messages.</div>
    <label for="nsSigT">Ma signature</label><input id="nsSigT" value="${E(S.texte)}" oninput="nsSigMaj()">
    <div class="ns-sigs" id="nsSigs">${NS_SIG.map(([k, l]) => `<button type="button" data-k="${k}" class="${k === S.style ? 'on' : ''}" onclick="agPick(this);nsSigMaj()"><span>${E(nsStyler(S.texte, k))}</span><small>${l}</small></button>`).join('')}</div>
    <label class="ag-check"><input type="checkbox" id="nsSigA" ${S.ajouter ? 'checked' : ''}> L'ajouter à la fin des messages qui n'en ont pas</label>
    <div class="ns-sigp" id="nsSigP"></div>
    <button class="btn-primary" onclick="nsSigSave()">Enregistrer la signature</button>
    <button class="btn-ghost" style="width:100%;margin-top:8px" onclick="nsSigInitial()">Revenir à l'initial</button>
    <div class="ns-sec">Couleurs de mes comptes</div>
    ${agActiveAccounts().map(a => `<div class="ns-accr"><b>${E(a.name)}</b>${nsPalette('nsAC' + a.id, a.color || '', 'nsAccDirect' + a.id)}</div>`).join('') || '<div class="ag-empty">Aucun compte.</div>'}
    <div class="ns-sec">Mes dossiers de notes</div>
    <div class="ns-dlist">${nsDossiers().map(d => `<button type="button" onclick="agCloseSheet('nsApp');NS.filtre.dossier=${E(JSON.stringify(d))};agGoTab('notes')">${agIcon('note', 13)} ${E(d)} <small>${notes.filter(n => n.dossier === d).length}</small></button>`).join('') || '<div class="ag-hint">Aucun dossier pour l\'instant.</div>'}</div>
    <button class="btn-ghost" style="width:100%" onclick="nsNouveauDossier(true).then(()=>nsOuvrir())">+ Nouveau dossier</button>
    <div class="ag-hint" style="margin-top:12px">Tout est gardé dans tes données en ligne : la sauvegarde de l'app le garde aussi.</div>`);
  agActiveAccounts().forEach(a => { window['nsAccDirect' + a.id] = c => nsAccDirect(a.id, c); });
  nsSigMaj();
};
window.nsAccDirect = async function(id, c){
  const a = accounts.find(x => x.id === id); if(!a) return;
  const u = await dbUpdate('accounts', id, { color: c || null }); if(!u) return;
  a.color = c || null;
  document.querySelectorAll('#nsAC' + id + ' button').forEach(b => b.classList.toggle('on', b.dataset.c === (c || '')));
  if(typeof agRenderAll === 'function') agRenderAll(); nsCouleursComptes();
  agToast(c ? `Couleur de ${a.name} changée` : `${a.name} : couleur de base`);
};
window.nsSigMaj = function(){
  const t = (document.getElementById('nsSigT') || {}).value || 'Henzo Photographie';
  document.querySelectorAll('#nsSigs button').forEach(b => { const s = b.querySelector('span'); if(s) s.textContent = nsStyler(t, b.dataset.k); });
  const k = (document.querySelector('#nsSigs button.on') || {}).dataset?.k || 'normal';
  const p = document.getElementById('nsSigP'); if(p) p.innerHTML = `<small>Aperçu dans WhatsApp</small><div>Bonjour Awa, vos photos sont prêtes !<br>Merci pour votre confiance.<br><br>${E(nsStyler(t, k))}</div>`;
};
window.nsSigSave = async function(){
  const signature = { texte: nd((document.getElementById('nsSigT').value || '').trim()) || 'Henzo Photographie', style: (document.querySelector('#nsSigs button.on') || {}).dataset?.k || 'normal', ajouter: document.getElementById('nsSigA').checked };
  if(await nsSavePrefs({ signature })) agToast('Signature enregistrée'); else agAlert('La signature n\'a pas pu être enregistrée. Vérifie ta connexion.');
};
window.nsSigInitial = async function(){
  if(await nsSavePrefs({ signature: null })){ agToast('Signature remise comme au départ'); nsOuvrir(); }
};

// ---------- Entrées : menus et page Notes ----------
function nsBoutons(){
  const foot = document.querySelector('#agSide .ag-side-foot');
  if(foot && !foot.querySelector('.ns-side')){ const b = document.createElement('button'); b.className = 'ag-side-it ns-side'; b.innerHTML = `<span class="si">${agIcon('palette', 18)}</span><span class="sl">Personnaliser</span>`; b.onclick = () => nsOuvrir(); foot.insertBefore(b, foot.firstChild); }
  const th = document.querySelector('.drawer-nav.ag-theme-btn');
  if(th && !document.querySelector('.drawer-nav.ns-drawer')){ const b = document.createElement('button'); b.className = 'drawer-nav ns-drawer'; b.innerHTML = `<span class="nav-icon">${agIcon('palette', 16)}</span><span>Personnaliser</span>`; b.onclick = () => { if(typeof closeDrawer === 'function') closeDrawer(); nsOuvrir(); }; th.parentElement.insertBefore(b, th.nextSibling); }
  const um = document.querySelector('.user-menu-items');
  if(um && !um.querySelector('.ns-um')){ const b = document.createElement('button'); b.className = 'ns-um'; b.innerHTML = `<span class="icon">${agIcon('palette', 16)}</span><span>Personnaliser</span>`; b.onclick = () => { if(typeof closeUserMenu === 'function') closeUserMenu(); nsOuvrir(); }; um.insertBefore(b, um.children[1] || null); }
}
window.nsBoutons = nsBoutons;
nsBoutons(); setTimeout(nsBoutons, 1500); setTimeout(nsBoutons, 4000);
if(window.CA_ITEMS){
  CA_ITEMS.push({ id: 'perso', s: 'Réglages et données', t: 'Personnaliser l\'app', q: 'Signature de tes messages WhatsApp en lettres spéciales, couleur de chaque compte, dossiers de notes.', ou: 'Menu > Personnaliser', m: 'personnaliser couleur police signature compte dossier', go: ['nsOuvrir', []] });
  CA_ITEMS.push({ id: 'notesperso', s: 'Idées et organisation', t: 'Notes : dossiers, couleurs, polices, étoiles', q: 'Range tes notes par dossier, donne une couleur et une police à chaque note, note de 1 à 5 étoiles, trie et filtre.', ou: 'Idées > Notes > bouton palette sur une note', m: 'note dossier couleur police étoile trier filtrer ranger', go: 'notes' });
}

(function nsCss(){
  if(document.getElementById('nsCss')) return;
  const st = document.createElement('style'); st.id = 'nsCss';
  st.textContent = `
#nsBar{margin:4px 0 10px}
.ns-dos{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}.ns-dos::-webkit-scrollbar{display:none}
.ns-dos button{flex:0 0 auto;display:inline-flex;align-items:center;gap:4px;padding:7px 12px;border-radius:99px;border:1px solid var(--border);background:var(--card2);color:var(--muted);font-size:12.5px;font-weight:600;cursor:pointer;margin:0;width:auto!important}
.ns-dos button.on{background:var(--accent);border-color:var(--accent);color:#fff}.ns-dos small{opacity:.7}.ns-dos .ns-plus{border-style:dashed;color:var(--accent)}
.ns-tri{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap}.ns-tri select{flex:1;min-width:130px;margin:0;padding:8px 10px;font-size:12.5px}
.ns-gerer{flex:0 0 auto;padding:8px 12px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--muted);font-size:12.5px;cursor:pointer;margin:0;width:auto!important}
.note-card.ns-col{border-left:5px solid var(--ns-c)!important;background:linear-gradient(135deg,color-mix(in srgb,var(--ns-c) 16%,var(--card)),var(--card))!important}
.note-card.ns-col .note-title{color:color-mix(in srgb,var(--ns-c) 35%,var(--text))}
.note-card.ns-pol .note-title,.note-card.ns-pol .note-content{font-family:var(--ns-f),Inter,sans-serif!important}
.ns-dch{display:inline-flex;align-items:center;gap:3px;margin-left:6px;padding:2px 8px;border-radius:99px;background:var(--card2);color:var(--muted);font-size:11px;font-weight:600;vertical-align:middle}
.ns-et{display:inline-flex;align-items:center;gap:1px}.ns-et button{display:inline-grid;place-items:center;background:none;border:0;color:var(--border);font-size:15px;line-height:1;cursor:pointer;padding:1px;margin:0;width:auto!important}
.ns-et button.on{color:#f5c518}.ns-et.petit{margin-right:8px}.ns-et.grand button{font-size:28px;padding:2px 3px}.ns-et.grand span{margin-left:8px;font-size:13px;color:var(--muted)}
.ns-pb{color:var(--accent)!important}
.ns-cols{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0}.ns-cols button{width:34px!important;height:34px;border-radius:50%;border:2px solid transparent;cursor:pointer;margin:0;padding:0;box-shadow:0 0 0 1px var(--border)}
.ns-cols button.none{background:var(--card2);color:var(--muted);font-size:16px}.ns-cols button.on{border-color:var(--text);transform:scale(1.1)}
.ns-pols{display:flex;flex-wrap:wrap;gap:6px}.ns-pols button{padding:8px 12px;border-radius:10px;border:1px solid var(--border);background:var(--card2);color:var(--text);font-size:15px;cursor:pointer;margin:0;width:auto!important}.ns-pols button.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 18%,var(--card2))}
.ns-dsel{display:flex;gap:6px}.ns-dsel select{flex:1;margin:0}.ns-dsel button{margin:0;flex:0 0 auto;width:auto!important;padding:0 12px}
.ns-ap{margin-bottom:6px}.ns-apc{--ns-c:var(--border);padding:12px;border-radius:14px;border-left:5px solid var(--ns-c);background:linear-gradient(135deg,color-mix(in srgb,var(--ns-c) 16%,var(--card2)),var(--card2))}
.ns-apc b{display:block;color:var(--text)}.ns-apc p{margin:4px 0 0;font-size:13px;color:var(--muted)}.ns-apc small{display:inline-block;margin-top:6px;font-size:11px;color:var(--muted)}
.ns-sec{margin:18px 0 6px;font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.ns-sigs{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:6px;margin:8px 0}.ns-sigs button{min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:10px;border-radius:12px;border:1px solid var(--border);background:var(--card2);color:var(--text);cursor:pointer;margin:0;text-align:left;width:auto!important}
.ns-sigs button span{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}.ns-sigs button small{font-size:11px;color:var(--muted)}.ns-sigs button.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 16%,var(--card2))}
.ns-sigp{margin:8px 0 12px;padding:10px 12px;border-radius:12px;background:#0b141a;color:#e9edef;font-size:14px;line-height:1.45}.ns-sigp small{display:block;color:#8696a0;font-size:11px;margin-bottom:4px}
.ns-accr{padding:8px 0;border-bottom:1px solid var(--border)}.ns-accr b{color:var(--text);font-size:14px}
.ns-dlist{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}.ns-dlist button{display:inline-flex;align-items:center;gap:4px;padding:8px 12px;border-radius:10px;border:1px solid var(--border);background:var(--card2);color:var(--text);cursor:pointer;margin:0;width:auto!important}
.ag-acc.ns-acc{border-color:var(--ns-c)!important;box-shadow:inset 0 3px 0 var(--ns-c)}
.ag-acc.ns-acc .ic{background:color-mix(in srgb,var(--ns-c) 28%,transparent)!important;color:var(--ns-c)!important}`;
  document.head.appendChild(st);
})();
nsChargerPrefs().then(() => { try { if(document.getElementById('notesList')) renderNotes(); nsCouleursComptes(); } catch(e){} });
})();
