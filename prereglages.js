// ============================================================
// PREREGLAGES.JS - Ne plus tout retaper : "Mes préréglages" partout
// ------------------------------------------------------------
// Dans chaque fenêtre avec un formulaire (nouvelle galerie, séance,
// pack, budget, préparation...), une petite barre "Préréglages" :
// - "Enregistrer ces réglages" : tu donnes un nom (ex : "Mariage
//   standard") et tu choisis les champs à garder (le nom du client et
//   la date ne sont pas cochés au départ).
// - Touche un préréglage : tous ses champs se remplissent d'un coup.
//   Tu peux encore tout modifier avant d'enregistrer.
// - Gérer : renommer, mettre à jour avec ce qui est affiché, supprimer.
// Gardé dans user_preferences.prereglages (donc dans la sauvegarde).
// ============================================================
(function(){
'use strict';
if(typeof agSheet !== 'function') return;
const E = s => agEsc(String(s == null ? '' : s));
const PRG = { prefs: null };
window.PRG = PRG;
const nd = s => String(s || '').replace(/[–—]/g, '-');
// Fenêtres où ça n'a pas de sens
const PRG_SANS = ['agDlg', 'noteModalBg', 'caSheet', 'prgSave', 'prgGerer', 'nsPersoS', 'nsApp', 'hiMsg', 'aqRes', 'apExpl', 'apCapSheet', 'prQuiz', 'prVue', 'atSheet', 'ocVue', 'ocPlan', 'agAccView', 'agCoffreView', 'crmHist'];
// Champs qu'on ne garde pas par défaut (propres à chaque fois)
const PRG_UNIQUE = /\bnom\b|name|titre|title|t[ée]l[ée]phone|tel\b|phone|mail|date|jour|heure|time|client|cli\b|code|mdp|mot de passe|pass|montant|amount|prix|price|note|search|recherche|msg\b|message|content|contenu|texte|^q\b/i;

async function prgCharger(){
  if(PRG.prefs) return PRG.prefs;
  try { const { data: u } = await sb.auth.getUser(); const { data } = await sb.from('user_settings').select('user_preferences').eq('user_id', u.user.id).maybeSingle(); PRG.prefs = ((data && data.user_preferences) || {}).prereglages || {}; } catch(e){ PRG.prefs = {}; }
  return PRG.prefs;
}
async function prgSauver(){
  const ok = typeof crmSavePrefs === 'function' ? await crmSavePrefs({ prereglages: PRG.prefs }) : false;
  if(!ok) agAlert('Le préréglage n\'a pas pu être enregistré. Vérifie ta connexion.');
  return ok;
}

// ---------- Lire / remplir les champs d'une fenêtre ----------
function prgChamps(root){
  const L = [];
  root.querySelectorAll('input[id],select[id],textarea[id]').forEach(el => {
    if(el.closest('.prg-zone')) return;
    const t = (el.type || '').toLowerCase();
    if(['file', 'password', 'hidden', 'button', 'submit', 'range'].includes(t)) return;
    if(el.offsetParent === null && !el.closest('details')) return;
    L.push({ id: el.id, k: t === 'checkbox' || t === 'radio' ? 'c' : 'v', el });
  });
  root.querySelectorAll('.ag-pills[id]').forEach(p => { if(!p.closest('.prg-zone') && p.querySelector('button[data-v],button[data-k]')) L.push({ id: p.id, k: 'p', el: p }); });
  return L;
}
function prgLabel(root, c){
  if(c.k === 'p'){ const prev = c.el.previousElementSibling; return prev && prev.tagName === 'LABEL' ? prev.textContent.trim() : c.id; }
  const l = root.querySelector(`label[for="${c.id}"]`); if(l) return l.textContent.trim();
  if(c.el.closest('label')) return c.el.closest('label').textContent.trim();
  let p = c.el.previousElementSibling; while(p && p.tagName !== 'LABEL' && !p.classList.contains('px-mini')) p = p.previousElementSibling;
  return (p && p.textContent.trim()) || c.el.placeholder || c.id;
}
function prgValeur(c){
  if(c.k === 'c') return !!c.el.checked;
  if(c.k === 'p'){ const b = c.el.querySelector('button.on'); return b ? (b.dataset.v != null ? b.dataset.v : b.dataset.k) : null; }
  return c.el.value;
}
function prgRemplir(root, champs){
  let n = 0;
  Object.entries(champs).forEach(([id, x]) => {
    const el = root.querySelector('#' + CSS.escape(id)); if(!el) return;
    if(x.k === 'p'){ const b = el.querySelector(`button[data-v="${CSS.escape(String(x.v))}"],button[data-k="${CSS.escape(String(x.v))}"]`); if(b && !b.classList.contains('on')){ b.click(); n++; } return; }
    if(x.k === 'c'){ if(el.checked !== !!x.v){ el.checked = !!x.v; el.dispatchEvent(new Event('change', { bubbles: true })); n++; } return; }
    if(el.tagName === 'SELECT' && ![...el.options].some(o => o.value === String(x.v))) return;
    el.value = x.v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); n++;
  });
  return n;
}

// ---------- La barre dans les fenêtres ----------
function prgCle(bg){ return bg.id || ''; }
function prgEligible(bg){
  if(!bg || !bg.id || PRG_SANS.includes(bg.id)) return false;
  const w = bg.querySelector('.modal-wrap, .modal'); if(!w) return false;
  if(!w.querySelector('.btn-primary, button[type="submit"]')) return false;
  return prgChamps(w).filter(c => c.k !== 'c').length >= 3;
}
function prgBarre(bg){
  const w = bg.querySelector('.modal-wrap') || bg.querySelector('.modal'); if(!w || w.querySelector('.prg-zone')) return;
  const L = (PRG.prefs && PRG.prefs[prgCle(bg)]) || [];
  const z = document.createElement('div'); z.className = 'prg-zone';
  z.innerHTML = `<span class="prg-t">${agIcon('copy', 13)} Préréglages</span>${L.map((p, i) => `<button type="button" class="prg-p" onclick="prgAppliquer('${bg.id}',${i})">${E(p.nom)}</button>`).join('')}
    <button type="button" class="prg-add" onclick="prgEnregistrer('${bg.id}')">+ Enregistrer ces réglages</button>${L.length ? `<button type="button" class="prg-g" onclick="prgGerer('${bg.id}')">Gérer</button>` : ''}`;
  const h = w.querySelector(':scope > h3, :scope h3, :scope h2');
  if(h && h.parentElement === w) h.insertAdjacentElement('afterend', z); else w.insertBefore(z, w.firstChild);
}
function prgScan(){
  if(!PRG.prefs) return;
  document.querySelectorAll('.modal-bg.show').forEach(bg => { try { if(prgEligible(bg)) prgBarre(bg); } catch(e){} });
}
window.prgScan = prgScan;
function prgMaj(id){ const bg = document.getElementById(id); if(!bg) return; const z = bg.querySelector('.prg-zone'); if(z) z.remove(); prgBarre(bg); }

window.prgAppliquer = function(id, i){
  const bg = document.getElementById(id), p = ((PRG.prefs || {})[id] || [])[i]; if(!bg || !p) return;
  const w = bg.querySelector('.modal-wrap') || bg;
  // 2 passages : un choix peut faire apparaître d'autres champs (ex : type de galerie)
  let n = prgRemplir(w, p.champs);
  setTimeout(() => { n += prgRemplir(w, p.champs); agToast(`Préréglage « ${p.nom} » appliqué : tu peux encore tout modifier`); }, 120);
  bg.querySelectorAll('.prg-p').forEach((b, k) => b.classList.toggle('on', k === i));
};
window.prgEnregistrer = function(id){
  const bg = document.getElementById(id); if(!bg) return;
  const w = bg.querySelector('.modal-wrap') || bg;
  const C = prgChamps(w).map(c => ({ ...c, lab: prgLabel(w, c), val: prgValeur(c) })).filter(c => c.k === 'c' || (c.val != null && String(c.val).trim() !== ''));
  if(!C.length){ agAlert('Remplis d\'abord les champs que tu veux garder.'); return; }
  PRG.enCours = { id, C };
  const titre = (w.querySelector('h3') || {}).textContent || '';
  agSheet('prgSave', `<h3>Enregistrer ces réglages</h3>
    <div class="ag-hint" style="margin-top:0">${E(titre)} : la prochaine fois, un seul toucher remplit tout.</div>
    <label for="prgNom">Nom du préréglage</label><input id="prgNom" placeholder="Ex : Mariage standard, Galerie anniversaire">
    <label>Ce qu'il faut garder</label>
    <div class="prg-ch">${C.map((c, k) => `<label class="ag-check"><input type="checkbox" data-k="${k}" ${PRG_UNIQUE.test(c.id + ' ' + c.lab) && c.k !== 'c' ? '' : 'checked'}> <span><b>${E(c.lab.slice(0, 60))}</b><small>${E(c.k === 'c' ? (c.val ? 'coché' : 'pas coché') : String(c.val).slice(0, 60))}</small></span></label>`).join('')}</div>
    <div class="ag-hint">Le nom du client, la date et les montants ne sont pas cochés au départ : ils changent à chaque fois.</div>
    <button class="btn-primary" style="margin-top:12px" onclick="prgEnregistrerGo()">Enregistrer le préréglage</button>`);
  setTimeout(() => { const i = document.getElementById('prgNom'); if(i) i.focus(); }, 60);
};
window.prgEnregistrerGo = async function(){
  const X = PRG.enCours; if(!X) return;
  const nom = nd((document.getElementById('prgNom').value || '').trim()); if(!nom){ agAlert('Donne un nom au préréglage.'); return; }
  const champs = {};
  document.querySelectorAll('#prgSave .prg-ch input:checked').forEach(i => { const c = X.C[Number(i.dataset.k)]; if(c) champs[c.id] = { k: c.k, v: c.val }; });
  if(!Object.keys(champs).length){ agAlert('Coche au moins un champ.'); return; }
  const L = (PRG.prefs[X.id] = PRG.prefs[X.id] || []);
  const ex = L.findIndex(p => p.nom.toLowerCase() === nom.toLowerCase());
  const p = { nom, champs, maj: new Date().toISOString() };
  if(ex >= 0) L[ex] = p; else L.push(p);
  if(!await prgSauver()) return;
  agCloseSheet('prgSave'); prgMaj(X.id);
  agToast(`Préréglage « ${nom} » enregistré`);
};
window.prgGerer = function(id){
  const L = (PRG.prefs || {})[id] || [];
  agSheet('prgGerer', `<h3>Mes préréglages</h3>
    ${L.map((p, i) => `<div class="prg-row"><div><b>${E(p.nom)}</b><small>${Object.keys(p.champs).length} champ${Object.keys(p.champs).length > 1 ? 's' : ''}${p.maj ? ' · ' + E(new Date(p.maj).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })) : ''}</small></div>
      <button type="button" onclick="prgRenommer('${id}',${i})">Renommer</button><button type="button" onclick="prgMettreAJour('${id}',${i})">Mettre à jour</button><button type="button" class="del" onclick="prgSuppr('${id}',${i})" aria-label="Supprimer">${agIcon('trash', 14)}</button></div>`).join('') || '<div class="ag-empty">Aucun préréglage.</div>'}
    <div class="ag-hint">« Mettre à jour » remplace les valeurs gardées par celles affichées dans la fenêtre.</div>`);
};
window.prgRenommer = async function(id, i){
  const p = PRG.prefs[id][i]; const n = await agPrompt('Renommer le préréglage', p.nom, { ok: 'Renommer' });
  if(!n || !n.trim()) return; p.nom = nd(n.trim());
  if(await prgSauver()){ prgGerer(id); prgMaj(id); }
};
window.prgMettreAJour = async function(id, i){
  const bg = document.getElementById(id), p = PRG.prefs[id][i]; if(!bg){ agAlert('Ouvre d\'abord la fenêtre avec les bonnes valeurs.'); return; }
  const w = bg.querySelector('.modal-wrap') || bg;
  prgChamps(w).forEach(c => { if(p.champs[c.id]) p.champs[c.id].v = prgValeur(c); });
  p.maj = new Date().toISOString();
  if(await prgSauver()){ agToast(`« ${p.nom} » mis à jour`); prgGerer(id); }
};
window.prgSuppr = async function(id, i){
  const p = PRG.prefs[id][i]; if(!await agConfirm(`Supprimer le préréglage « ${p.nom} » ?`)) return;
  PRG.prefs[id].splice(i, 1); if(!PRG.prefs[id].length) delete PRG.prefs[id];
  if(await prgSauver()){ prgGerer(id); prgMaj(id); }
};

// ---------- "Charger un préréglage" dans la fenêtre Nouvelle galerie ----------
// Même stockage que plus haut (user_preferences.prereglages), déjà en mémoire :
// aucune requête en plus, la liste s'affiche tout de suite.
function prgGalListe(){
  const P = PRG.prefs || {}, L = [];
  (P.galCreate || []).forEach(p => L.push({ nom: p.nom, champs: p.champs || {} }));
  // Préréglages enregistrés dans "Modifier la galerie" : mêmes champs, autre préfixe (geX -> galX)
  (P.galEdit || []).forEach(p => { const ch = {}; Object.entries(p.champs || {}).forEach(([id, x]) => { ch[id.replace(/^ge/, 'gal')] = x; }); L.push({ nom: p.nom, champs: ch }); });
  return L;
}
function prgGalChamp(){
  const bg = document.getElementById('galCreate'); if(!bg || bg.querySelector('.prg-gal')) return;
  const w = bg.querySelector('.modal-wrap'); if(!w) return;
  const L = prgGalListe();
  const d = document.createElement('div'); d.className = 'prg-gal';
  // Pas d'id sur la liste : elle n'est jamais enregistrée dans un préréglage
  d.innerHTML = `<label>Charger un préréglage</label>` + (L.length
    ? `<select class="prg-gal-sel"><option value="">Aucun</option>${L.map((p, i) => `<option value="${i}">${E(p.nom)}</option>`).join('')}</select>`
    : `<select class="prg-gal-sel" disabled><option value="">Aucun préréglage enregistré</option></select>`);
  const h = w.querySelector(':scope > h3');
  if(h) h.insertAdjacentElement('afterend', d); else w.insertBefore(d, w.firstChild);
  const s = d.querySelector('select');
  s.onchange = () => {
    if(s.value === ''){ if(typeof window.galOpenCreate === 'function') window.galOpenCreate.apply(null, PRG.galArgs || []); return; }
    const p = L[Number(s.value)]; if(!p) return;
    prgRemplir(w, p.champs);
    setTimeout(() => { prgRemplir(w, p.champs); agToast(`Préréglage « ${p.nom} » chargé : tu peux encore tout modifier`); }, 120);
  };
}
function prgGalBrancher(){
  const f = window.galOpenCreate;
  if(typeof f !== 'function' || f.prgGal) return;
  const g = function(){ PRG.galArgs = [...arguments]; const r = f.apply(this, arguments); try { if(PRG.prefs) prgGalChamp(); } catch(e){} return r; };
  g.prgGal = true; window.galOpenCreate = g;
}
prgGalBrancher();

prgCharger().then(() => { prgScan(); setInterval(() => { prgGalBrancher(); try { prgGalChamp(); } catch(e){} prgScan(); }, 800); });
if(window.CA_ITEMS) CA_ITEMS.push({ id: 'prereglages', s: 'Réglages et données', t: 'Préréglages (ne plus retaper)', q: 'Dans chaque formulaire (galerie, séance, pack, budget...) : « Enregistrer ces réglages », puis un toucher remplit tout la prochaine fois.', ou: 'En haut de chaque formulaire : Préréglages', m: 'préréglage preset modèle réglage galerie retaper sauvegarder', go: 'galerie' });

(function prgCss(){
  if(document.getElementById('prgCss')) return;
  const st = document.createElement('style'); st.id = 'prgCss';
  st.textContent = `.prg-zone{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:6px 0 10px;padding:8px 10px;border-radius:12px;border:1px dashed var(--border);background:color-mix(in srgb,var(--accent) 6%,transparent)}
.prg-t{display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-right:2px}
.prg-zone button{margin:0;padding:6px 11px;border-radius:99px;border:1px solid var(--border);background:var(--card2);color:var(--text);font-size:12.5px;font-weight:600;cursor:pointer;width:auto!important}
.prg-zone .prg-p.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 20%,var(--card2))}
.prg-zone .prg-add{border-style:dashed;color:var(--accent);background:transparent}.prg-zone .prg-g{background:transparent;color:var(--muted)}
.prg-ch{max-height:46vh;overflow:auto;padding:2px}.prg-ch .ag-check{align-items:flex-start}.prg-ch span{display:flex;flex-direction:column}.prg-ch small{color:var(--muted);font-size:11.5px}
.prg-row{display:flex;align-items:center;gap:6px;padding:10px 0;border-bottom:1px solid var(--border)}.prg-row>div{flex:1;min-width:0}.prg-row b{display:block;color:var(--text)}.prg-row small{color:var(--muted);font-size:11.5px}
.prg-row button{margin:0;padding:7px 10px;border-radius:10px;border:1px solid var(--border);background:var(--card2);color:var(--text);font-size:12px;cursor:pointer;width:auto!important}.prg-row .del{color:#ff6b5a}`;
  document.head.appendChild(st);
})();
})();
