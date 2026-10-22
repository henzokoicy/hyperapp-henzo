// ============================================================
// GALERIE.JS - La galerie clients directement dans la Super App
// ------------------------------------------------------------
// Parle au serveur galerie-clients (Render) avec le mot de passe admin
// deja enregistre dans la Super App. Plus de cadre (iframe) : tout est natif.
// Charge par argent.js.
// ============================================================

let galPwd = '';
let galList = [];
let galLoaded = false;
let galCurrent = null;   // code de la galerie ouverte
let galSearch = '';
let galAvis = [], galAvisNonLus = 0;

function galApiBase(){ return (typeof GALERIE_ORIGIN !== 'undefined' ? GALERIE_ORIGIN : 'https://galerie-clients.onrender.com'); }
function galPhotoUrl(dossier, fichier, v){ return `${galApiBase()}/photo/${encodeURIComponent(dossier)}/${encodeURIComponent(fichier)}${v ? '?v=' + v : ''}`; }
function galClientLink(code){ return `${galApiBase()}/`; }
function galPreviewLink(code){ return `${galApiBase()}/?code=${encodeURIComponent(code)}&auto=1`; }

async function galApi(path, opts){
  opts = opts || {};
  const headers = Object.assign({ 'x-admin-password': galPwd }, opts.headers || {});
  if(opts.json){ headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(opts.json); }
  const r = await fetch(galApiBase() + path, { method: opts.method || 'GET', headers, body: opts.body });
  if(r.status === 401) throw Object.assign(new Error('Mot de passe galerie incorrect'), { code: 401 });
  const data = await r.json().catch(() => ({}));
  if(!r.ok) throw new Error(data.error || ('Erreur ' + r.status));
  return data;
}

function galBody(){
  const page = document.getElementById('page-galerie');
  if(!page) return null;
  const host = page.querySelector('.container') || page;
  let el = document.getElementById('galBody');
  if(!el){
    [...host.children].forEach(c => { if(!c.classList.contains('seg-bar')) c.style.display = 'none'; });
    el = document.createElement('div');
    el.id = 'galBody';
    host.appendChild(el);
  }
  return el;
}

// ---------- Entree dans l'onglet ----------
ouvrirOngletGalerie = window.ouvrirOngletGalerie = async function(){
  const el = galBody();
  if(!el) return;
  if(!galPwd) galPwd = await getGaleriePwd();
  if(!galPwd){ galRenderLogin(); return; }
  if(window.__galDeep){ const code = window.__galDeep; window.__galDeep = null; await galLoad(); if(galList.find(x => x.code === code)){ window.__galTab = 'stats'; setTimeout(() => { window.__galTab = null; }, 4000); galCurrent = code; galOpen(code); } return; }
  if(window.__galAvisDeep){ window.__galAvisDeep = false; galAvisFiltre = 'attente'; await galLoad(); galOpenAvis(); return; }
  if(galCurrent === '__avis__'){ galOpenAvis(); return; }
  if(galCurrent){ galOpen(galCurrent); return; }
  await galLoad();
};

function galRenderLogin(msg){
  galBody().innerHTML = `
    <div class="ag-onb">
      <h3>Connecter ta galerie clients</h3>
      <p>Tape le mot de passe admin de ta plateforme photo. Il reste enregistré dans ton compte, tu ne le taperas qu'une fois.</p>
      ${msg ? `<div class="ag-hint warn" style="margin:-4px 0 10px">${agEsc(msg)}</div>` : ''}
      <input type="password" id="galPwdIn" placeholder="Mot de passe admin galerie">
      <button class="btn-primary" style="width:100%" onclick="galSavePwd()">Se connecter</button>
    </div>`;
}
async function galSavePwd(){
  const v = (document.getElementById('galPwdIn')?.value || '').trim();
  if(!v){ alert('Tape ton mot de passe.'); return; }
  galPwd = v;
  try { localStorage.setItem('galerie_admin_pwd', v); } catch(e){}
  try {
    const u = await getCurrentUser();
    if(u) await sb.from('user_settings').upsert({ user_id: u.id, galerie_admin_pwd: v }, { onConflict: 'user_id' });
  } catch(e){}
  galLoad();
}

function galLoading(txt){
  galBody().innerHTML = `<div class="ag-list"><div class="ag-empty">${txt || 'Chargement de tes galeries...'}<br><span style="font-size:12px">Si le serveur dormait, ça peut prendre jusqu'à 1 minute la première fois.</span></div></div>`;
}

async function galLoad(){
  galLoading();
  try {
    galList = await galApi('/api/admin/galeries');
    galLoaded = true;
    galApi('/api/admin/avis').then(a => { galAvis = Array.isArray(a) ? a : []; galAvisNonLus = galAvisAttente(); if(!galCurrent && document.getElementById('galListBox')) galRenderList(); }).catch(() => {});
    galRenderList();
  } catch(e){
    if(e.code === 401){ galPwd = ''; galRenderLogin('Mot de passe refusé par la galerie. Vérifie-le.'); return; }
    galBody().innerHTML = `<div class="ag-onb"><h3>Galerie injoignable</h3><p>${agEsc(e.message)}</p>
      <p>Si c'est la première fois, la galerie doit autoriser la Super App à lui parler : il faut mettre à jour son fichier server.js.</p>
      <button class="btn-primary" style="width:100%" onclick="galLoad()">Réessayer</button></div>`;
  }
}

// ---------- Liste ----------
function galDaysLeft(g){
  if(!g.dateExpiration) return null;
  return Math.ceil((new Date(g.dateExpiration) - new Date()) / 86400000);
}
function galRenderList(){
  const totPhotos = galList.reduce((s, g) => s + (g.nbPhotos || 0), 0);
  const actives = galList.filter(g => (galDaysLeft(g) ?? 1) > 0).length;
  const q = galSearch.toLowerCase();
  const list = galList.filter(g => !q || (g.nomClient + ' ' + g.code).toLowerCase().includes(q))
    .sort((a, b) => String(b.dateCreation).localeCompare(String(a.dateCreation)));
  galBody().innerHTML = `
    <div class="ag-total">
      <div class="lbl">Galeries clients</div>
      <div class="amt">${galList.length} <small>galerie${galList.length > 1 ? 's' : ''}</small></div>
      <div class="split"><div>Actives<b>${actives}</b></div><div>Photos livrées<b>${totPhotos}</b></div></div>
    </div>
    <div class="ag-actions">
      <button class="ag-act main" onclick="galOpenCreate()"><span>${agIcon('plus')}</span>Nouvelle</button>
      <button class="ag-act" onclick="galOpenAvis()" style="position:relative"><span>${agIcon('star')}</span>Avis${galAvisAttente() ? `<i class="ag-dot" title="${galAvisAttente()} avis en attente">${galAvisAttente()}</i>` : ''}</button>
      <button class="ag-act" onclick="galLoad()"><span>${agIcon('refresh')}</span>Actualiser</button>
      <button class="ag-act" onclick="window.open('${galApiBase()}/admin.html','_blank')"><span>${agIcon('link')}</span>Ancien admin</button>
    </div>
    <input id="galQ" placeholder="Rechercher un client ou un code" value="${agEsc(galSearch)}" oninput="galSearch=this.value;galRenderListOnly()" style="margin-bottom:12px">
    <div id="galListBox">${galListHtml(list)}</div>`;
}
function galRenderListOnly(){
  const q = galSearch.toLowerCase();
  const list = galList.filter(g => !q || (g.nomClient + ' ' + g.code).toLowerCase().includes(q))
    .sort((a, b) => String(b.dateCreation).localeCompare(String(a.dateCreation)));
  const box = document.getElementById('galListBox'); if(box) box.innerHTML = galListHtml(list);
}
function galListHtml(list){
  if(!list.length) return '<div class="ag-list"><div class="ag-empty">Aucune galerie. Crée la première avec le bouton Nouvelle.</div></div>';
  return list.map(g => {
    const d = galDaysLeft(g);
    const etat = d === null ? '' : d > 0 ? `${d} jour${d > 1 ? 's' : ''} restant${d > 1 ? 's' : ''}` : 'Expirée';
    return `<div class="ag-coffre" onclick="galOpen('${agEsc(g.code)}')">
      <div class="h"><div class="t"><div class="e">${agIcon('image')}</div>
        <div style="min-width:0"><div class="nm">${agEsc(g.nomClient)}</div><div class="tag">Code ${agEsc(g.code)}${g.protege ? ' · protégée' : ''}${etat ? ' · ' + etat : ''}</div></div></div>
      <div><div class="v">${g.nbPhotos || 0}</div><div class="goal">photos</div></div></div>
    </div>`;
  }).join('');
}

// ---------- Creation ----------
function galOpenCreate(prefill){
  prefill = prefill || {};
  const opts = (typeof clients !== 'undefined' ? clients : []).slice().sort((a, b) => String(a.name).localeCompare(String(b.name)))
    .map(c => `<option value="${c.id}" ${prefill.clientId === c.id ? 'selected' : ''}>${agEsc(c.name)}</option>`).join('');
  agSheet('galCreate', `
    <h3>Nouvelle galerie</h3>
    <label>Client de la Super App</label>
    <select id="galCli" onchange="galFillClient()"><option value="">Choisir un client (ou taper un nom en dessous)</option>${opts}</select>
    <label>Nom affiché au client</label>
    <input id="galNom" value="${agEsc(prefill.nom || '')}" placeholder="Ex : Mme Koffi">
    <label>Téléphone (pour WhatsApp)</label>
    <input id="galTel" value="${agEsc(prefill.tel || '')}" placeholder="+225 ...">
    <label>Email (optionnel, pour le prévenir quand c'est prêt)</label>
    <input id="galMail" value="${agEsc(prefill.mail || '')}" placeholder="client@email.com">
    <label>Type de séance</label>
    <input id="galCat" value="${agEsc(prefill.cat || '')}" placeholder="Ex : Shooting Studio, Mariage">
    <label>Disponible pendant</label>
    <div class="ag-pills" id="galDur">${[15, 30, 60, 90].map(n => `<button type="button" data-v="${n}" class="${n === 30 ? 'on' : ''}" onclick="agPick(this)">${n} jours</button>`).join('')}</div>
    <label>Mot de passe pour le client (optionnel)</label>
    <input id="galMdp" placeholder="Laisse vide si pas de mot de passe">
    <label>Petit mot pour le client (optionnel)</label>
    <input id="galMsg" placeholder="Ex : Merci pour ta confiance !">
    <button class="btn-primary" id="galCreateBtn" style="width:100%" onclick="galCreate()">Créer la galerie</button>
  `);
  if(prefill.clientId) galFillClient();
}
function galFillClient(){
  const id = Number(document.getElementById('galCli').value);
  const c = (clients || []).find(x => x.id === id);
  if(!c) return;
  document.getElementById('galNom').value = c.name || '';
  document.getElementById('galTel').value = c.phone || '';
  document.getElementById('galMail').value = c.email || '';
  const s = (shoots || []).filter(x => x.client_id === id).sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  if(s && !document.getElementById('galCat').value) document.getElementById('galCat').value = s.type || '';
}
async function galCreate(){
  const btn = document.getElementById('galCreateBtn');
  const nom = document.getElementById('galNom').value.trim();
  if(!nom){ alert('Mets le nom du client.'); return; }
  const cat = document.getElementById('galCat').value.trim();
  const mdp = document.getElementById('galMdp').value.trim();
  const body = {
    nomClient: nom,
    telephone: document.getElementById('galTel').value.trim(),
    email: document.getElementById('galMail').value.trim(),
    message: document.getElementById('galMsg').value.trim(),
    categories: cat ? ['Tout', ...cat.split(',').map(x => x.trim()).filter(Boolean)] : ['Tout'],
    dureeJours: Number(document.querySelector('#galDur button.on')?.dataset.v || 30),
    protege: !!mdp, motDePasse: mdp
  };
  btn.disabled = true; btn.textContent = 'Création...';
  try {
    const g = await galApi('/api/admin/galeries', { method: 'POST', json: body });
    galList.unshift(Object.assign({ nbPhotos: 0 }, g));
    agCloseSheet('galCreate');
    agToast('Galerie créée · code ' + g.code);
    galOpen(g.code);
  } catch(e){ alert(e.message); btn.disabled = false; btn.textContent = 'Créer la galerie'; }
}

// ---------- Detail d'une galerie ----------
async function galOpen(code){
  galCurrent = code;
  const g = galList.find(x => x.code === code);
  if(!g){ galCurrent = null; return galLoad(); }
  const d = galDaysLeft(g);
  const el = galBody();
  el.innerHTML = `
    <button class="ag-back" onclick="galCurrent=null;galRenderList()">${agIcon('chev', 16)} Toutes les galeries</button>
    <div class="ag-total">
      <div class="lbl">Galerie de</div>
      <div class="amt" style="font-size:28px">${agEsc(g.nomClient)}</div>
      <div class="split"><div>Code<b>${agEsc(g.code)}</b></div><div>Photos<b id="galNb">${g.nbPhotos || 0}</b></div><div>Disponible<b>${d === null ? '-' : d > 0 ? d + ' j' : 'Expirée'}</b></div></div>
    </div>
    <div class="ag-actions">
      <button class="ag-act main" onclick="document.getElementById('galFiles').click()"><span>${agIcon('plus')}</span>Photos</button>
      <button class="ag-act" onclick="galWhatsApp('${agEsc(code)}')"><span>${agIcon('chat')}</span>WhatsApp</button>
      <button class="ag-act" onclick="galCopy('${agEsc(code)}')"><span>${agIcon('copy')}</span>Message</button>
      <button class="ag-act" onclick="window.open(galPreviewLink('${agEsc(code)}'),'_blank')"><span>${agIcon('eye')}</span>Voir</button>
    </div>
    <div class="ag-list ag-share">
      <div class="ag-share-row"><div><span>Code d'accès</span><b>${agEsc(g.code)}</b></div>
        <button class="ag-ibtn" title="Copier le code" onclick="galCopyText('${agEsc(g.code)}','Code copié')">${agIcon('copy', 17)}</button></div>
      <div class="ag-share-row"><div style="min-width:0"><span>Lien de la galerie</span><b class="ag-link">${agEsc(galClientLink(g.code))}</b></div>
        <button class="ag-ibtn" title="Copier le lien" onclick="galCopyText(galClientLink('${agEsc(g.code)}'),'Lien copié')">${agIcon('link', 17)}</button></div>
      <div class="ag-share-row"><div style="min-width:0"><span>Infos client</span><b>${agEsc([g.telephone, g.email].filter(Boolean).join(' · ') || 'Aucune')}${g.protege ? ' · protégée par mot de passe' : ''}</b></div>
        <button class="ag-ibtn" title="Modifier la galerie" onclick="galOpenEdit('${agEsc(g.code)}')">${agIcon('edit', 17)}</button></div>
    </div>
    <input type="file" id="galFiles" accept="image/*" multiple style="display:none" onchange="galUpload('${agEsc(code)}', this.files)">
    <div class="ot-dropzone" onclick="document.getElementById('galFiles').click()">${agIcon('download', 20)}<div><b>Glisse tes photos ici</b><span>ou touche pour les choisir</span></div></div>
    <div id="galUp"></div>
    <div class="seg-bar ag-gal-tabs" style="display:flex">
      <button class="on" data-t="photos" onclick="galTab(this)">Photos</button>
      <button data-t="choix" onclick="galTab(this)">Choix du client</button>
      <button data-t="tirages" onclick="galTab(this)">Tirages</button>
      <button data-t="stats" onclick="galTab(this)">Statistiques</button>
    </div>
    <div id="galTabBody"><div class="ag-empty">Chargement...</div></div>
    <button class="btn-danger" style="width:100%;padding:12px;margin-top:16px" onclick="galDelete('${agEsc(code)}')">Supprimer cette galerie</button>`;
  const tab0 = window.__galTab || 'photos';
  if(tab0 !== 'photos'){ const bt = el.querySelector(`.ag-gal-tabs button[data-t="${tab0}"]`); if(bt) agPick(bt); }
  galShowTab(tab0);
}
function galTab(btn){ agPick(btn); galShowTab(btn.dataset.t); }

// ---------- Ordre des photos ----------
let galOrder = [], galDossier = '', galOrderDirty = false, galReorder = false, galDragIdx = null;
function galRenderPhotos(){
  const g = galList.find(x => x.code === galCurrent);
  const box = document.getElementById('galTabBody');
  if(!g || !box) return;
  if(!galOrder.length){ box.innerHTML = '<div class="ag-list"><div class="ag-empty">Pas encore de photos. Ajoute-les avec le bouton Photos.</div></div>'; return; }
  const bar = galReorder
    ? `<div class="ag-gal-bar"><span>Glisse les photos, ou utilise les flèches. La 1re photo est la couverture.</span>
        <div><button class="btn-ghost" onclick="galReorder=false;galShowTab('photos')">Annuler</button>
        <button class="btn-primary" ${galOrderDirty ? '' : 'disabled'} onclick="galSaveOrder()">Enregistrer l'ordre</button></div></div>`
    : `<div class="ag-gal-bar"><span>${galOrder.length} photo${galOrder.length > 1 ? 's' : ''}</span>
        <div><button class="btn-ghost" onclick="galReorder=true;galRenderPhotos()">${agIcon('transfer', 15)} Changer l'ordre</button></div></div>`;
  box.innerHTML = bar + `<div class="ag-gal-grid ${galReorder ? 'reorder' : ''}">${galOrder.map((p, i) => `
    <div class="ag-gal-ph" ${galReorder ? `draggable="true" ondragstart="galDragIdx=${i}" ondragover="event.preventDefault()" ondrop="galDropOn(${i})"` : ''}>
      <img loading="lazy" src="${galPhotoUrl(galDossier, p, 'thumb')}" alt="">
      ${galReorder
        ? `<span class="ag-gal-n">${i + 1}</span><div class="ag-gal-mv">
            <button title="Avant" onclick="galMove(${i},-1)" ${i === 0 ? 'disabled' : ''}>${agIcon('chev', 15)}</button>
            <button title="Mettre en premier" onclick="galMove(${i},-999)" ${i === 0 ? 'disabled' : ''}>1</button>
            <button title="Après" onclick="galMove(${i},1)" ${i === galOrder.length - 1 ? 'disabled' : ''}>${agIcon('chev', 15)}</button></div>`
        : `${i === 0 ? '<span class="ag-gal-cover">Couverture</span>' : ''}<button class="ag-gal-del" title="Supprimer" onclick="galDelPhoto('${agEsc(g.code)}','${agEsc(p)}')">${agIcon('trash', 15)}</button>`}
    </div>`).join('')}</div>`;
}
function galMove(i, d){
  const p = galOrder.splice(i, 1)[0];
  const j = d === -999 ? 0 : Math.max(0, Math.min(galOrder.length, i + d));
  galOrder.splice(j, 0, p); galOrderDirty = true; galRenderPhotos();
}
function galDropOn(i){
  if(galDragIdx === null || galDragIdx === i) return;
  const p = galOrder.splice(galDragIdx, 1)[0];
  galOrder.splice(i, 0, p); galDragIdx = null; galOrderDirty = true; galRenderPhotos();
}
async function galSaveOrder(){
  try {
    await galApi(`/api/admin/galeries/${encodeURIComponent(galCurrent)}/photos/ordre`, { method: 'PUT', json: { ordre: galOrder } });
    galReorder = false; galOrderDirty = false; agToast('Ordre enregistré'); galRenderPhotos();
  } catch(e){ alert(e.message); }
}

// ---------- Modifier une galerie apres creation ----------
function galOpenEdit(code){
  const g = galList.find(x => x.code === code); if(!g) return;
  const cats = (g.categories || []).filter(c => c && c !== 'Tout').join(', ');
  const d = galDaysLeft(g);
  agSheet('galEdit', `
    <h3>Modifier la galerie</h3>
    <label>Nom affiché au client</label><input id="geNom" value="${agEsc(g.nomClient || '')}">
    <label>Téléphone (WhatsApp)</label><input id="geTel" value="${agEsc(g.telephone || '')}" placeholder="+225 ...">
    <label>Email</label><input id="geMail" value="${agEsc(g.email || '')}" placeholder="client@email.com">
    <label>Type de séance</label><input id="geCat" value="${agEsc(cats)}" placeholder="Ex : Shooting Studio">
    <label>Petit mot pour le client</label><input id="geMsg" value="${agEsc(g.message || '')}">
    <label>Disponibilité ${d !== null ? `(actuellement ${d > 0 ? d + ' jours restants' : 'expirée'})` : ''}</label>
    <div class="ag-pills" id="geDur"><button type="button" data-v="" class="on" onclick="agPick(this)">Ne pas changer</button>${[15, 30, 60, 90].map(n => `<button type="button" data-v="${n}" onclick="agPick(this)">${n} jours à partir d'aujourd'hui</button>`).join('')}</div>
    <label>Mot de passe pour le client</label>
    <div class="ag-pills" id="geProt">
      <button type="button" data-v="keep" class="on" onclick="agPick(this);galEditProt()">${g.protege ? 'Garder le mot de passe' : 'Pas de mot de passe'}</button>
      <button type="button" data-v="new" onclick="agPick(this);galEditProt()">${g.protege ? 'Changer le mot de passe' : 'Ajouter un mot de passe'}</button>
      ${g.protege ? '<button type="button" data-v="off" onclick="agPick(this);galEditProt()">Retirer le mot de passe</button>' : ''}
    </div>
    <input id="geMdp" placeholder="Nouveau mot de passe" style="display:none">
    <button class="btn-primary" id="geBtn" style="width:100%" onclick="galSaveEdit('${agEsc(code)}')">Enregistrer</button>
  `);
}
function galEditProt(){
  const v = document.querySelector('#geProt button.on')?.dataset.v;
  document.getElementById('geMdp').style.display = v === 'new' ? 'block' : 'none';
}
async function galSaveEdit(code){
  const g = galList.find(x => x.code === code); if(!g) return;
  const nom = document.getElementById('geNom').value.trim();
  if(!nom){ alert('Mets le nom du client.'); return; }
  const cat = document.getElementById('geCat').value.trim();
  const body = {
    nomClient: nom,
    telephone: document.getElementById('geTel').value.trim(),
    email: document.getElementById('geMail').value.trim(),
    message: document.getElementById('geMsg').value.trim(),
    categories: cat ? ['Tout', ...cat.split(',').map(x => x.trim()).filter(Boolean)] : ['Tout']
  };
  const dur = document.querySelector('#geDur button.on')?.dataset.v; if(dur) body.dureeJours = Number(dur);
  const prot = document.querySelector('#geProt button.on')?.dataset.v;
  if(prot === 'off') body.protege = false;
  if(prot === 'new'){
    const m = document.getElementById('geMdp').value.trim();
    if(!m){ alert('Tape le nouveau mot de passe.'); return; }
    body.protege = true; body.motDePasse = m;
  }
  const btn = document.getElementById('geBtn'); btn.disabled = true; btn.textContent = 'Enregistrement...';
  try {
    const r = await galApi('/api/admin/galeries/' + encodeURIComponent(code), { method: 'PUT', json: body });
    Object.assign(g, r && r.code ? r : body, { nbPhotos: g.nbPhotos });
    agCloseSheet('galEdit'); agToast('Galerie modifiée'); galOpen(code);
  } catch(e){ alert(e.message); btn.disabled = false; btn.textContent = 'Enregistrer'; }
}
async function galCopyText(t, ok){
  try { await navigator.clipboard.writeText(t); agToast(ok || 'Copié'); }
  catch(e){ prompt('Copie ceci :', t); }
}
async function galShowTab(t){
  const g = galList.find(x => x.code === galCurrent);
  const box = document.getElementById('galTabBody');
  if(!g || !box) return;
  box.innerHTML = '<div class="ag-list"><div class="ag-empty">Chargement...</div></div>';
  try {
    if(t === 'photos'){
      const r = await galApi('/api/admin/galeries/' + encodeURIComponent(g.code) + '/photos');
      const photos = r.photos || [];
      g.nbPhotos = photos.length; const nb = document.getElementById('galNb'); if(nb) nb.textContent = photos.length;
      galOrder = photos.slice(); galDossier = r.dossier; galOrderDirty = false;
      galRenderPhotos();
    } else if(t === 'choix'){
      const list = await galApi('/api/admin/selections/' + encodeURIComponent(g.dossier));
      box.innerHTML = list.length ? list.map(s => `<div class="ag-list" style="padding:12px 14px">
        <div style="display:flex;justify-content:space-between;color:var(--text);font-weight:600"><span>${(s.photos || []).length} photo${(s.photos || []).length > 1 ? 's' : ''} choisie${(s.photos || []).length > 1 ? 's' : ''}</span><span class="ag-hint" style="margin:0">${new Date(s.date_creation).toLocaleDateString('fr-FR')}</span></div>
        ${s.message ? `<div class="ag-hint">${agEsc(s.message)}</div>` : ''}${s.statut ? `<div class="ag-hint">Statut : ${agEsc(s.statut)}</div>` : ''}
        <div class="ag-gal-grid" style="margin-top:10px">${(s.photos || []).map(f => `<div class="ag-gal-ph"><img loading="lazy" src="${galPhotoUrl(g.dossier, f, 'thumb')}" alt=""></div>`).join('')}</div></div>`).join('')
        : '<div class="ag-list"><div class="ag-empty">Le client n\'a pas encore envoyé de choix.</div></div>';
    } else if(t === 'tirages'){
      const list = await galApi('/api/admin/tirages/' + encodeURIComponent(g.dossier));
      box.innerHTML = list.length ? '<div class="ag-list">' + list.map(x => `<div class="ag-tx">
        <div class="ic" style="padding:0;overflow:hidden"><img src="${galPhotoUrl(g.dossier, x.fichier, 'thumb')}" style="width:100%;height:100%;object-fit:cover" alt=""></div>
        <div class="d"><b>${agEsc([x.taille, x.finition].filter(Boolean).join(' · ') || 'Tirage')} · x${x.quantite || 1}</b><span>${agEsc(x.statut || 'en attente')} · ${new Date(x.date_creation).toLocaleDateString('fr-FR')}${x.notes ? ' · ' + agEsc(x.notes) : ''}</span></div>
        <div class="m">${x.prix_estime ? agF(x.prix_estime) : ''}</div></div>`).join('') + '</div>'
        : '<div class="ag-list"><div class="ag-empty">Aucune commande de tirage.</div></div>';
    } else {
      await galStats(g, box);
    }
  } catch(e){
    box.innerHTML = `<div class="ag-list"><div class="ag-empty">${agEsc(e.message)}</div></div>`;
  }
}

// Envoi des photos par petits paquets (plus fiable avec une connexion mobile)
async function galUpload(code, files){
  files = [...(files || [])];
  if(!files.length) return;
  const up = document.getElementById('galUp');
  const total = files.length; let done = 0, errs = 0;
  const show = () => { if(up) up.innerHTML = `<div class="ag-list" style="padding:14px"><div style="display:flex;justify-content:space-between;color:var(--text);font-weight:600"><span>Envoi des photos</span><span>${done} / ${total}</span></div><div class="ag-bar"><i style="width:${Math.round(done / total * 100)}%"></i></div>${errs ? `<div class="ag-hint warn">${errs} photo(s) non envoyée(s)</div>` : ''}</div>`; };
  show();
  for(let i = 0; i < files.length; i += 4){
    const fd = new FormData();
    files.slice(i, i + 4).forEach(f => fd.append('photos', f));
    try {
      const r = await galApi('/api/admin/galeries/' + encodeURIComponent(code) + '/photos', { method: 'POST', body: fd });
      done += (r.nb || 0); errs += (r.erreurs || []).length;
    } catch(e){ errs += Math.min(4, files.length - i); }
    show();
  }
  agToast(`${done} photo${done > 1 ? 's' : ''} ajoutée${done > 1 ? 's' : ''}`);
  setTimeout(() => { if(up) up.innerHTML = ''; }, 2500);
  document.getElementById('galFiles').value = '';
  galShowTab('photos');
}
async function galDelPhoto(code, f){
  if(!await agConfirm('Supprimer cette photo de la galerie ?')) return;
  try { await galApi(`/api/admin/galeries/${encodeURIComponent(code)}/photos/${encodeURIComponent(f)}`, { method: 'DELETE' }); galShowTab('photos'); }
  catch(e){ alert(e.message); }
}
async function galDelete(code){
  const g = galList.find(x => x.code === code);
  if(!await agConfirm(`Supprimer définitivement la galerie de ${g ? g.nomClient : code} et toutes ses photos ?`)) return;
  try {
    await galApi('/api/admin/galeries/' + encodeURIComponent(code), { method: 'DELETE' });
    galList = galList.filter(x => x.code !== code); galCurrent = null; galRenderList(); agToast('Galerie supprimée');
  } catch(e){ alert(e.message); }
}

// ---------- Message au client ----------
function galMessage(code){
  const g = galList.find(x => x.code === code); if(!g) return '';
  const cats = (g.categories || []).filter(c => c && c !== 'Tout');
  const d = galDaysLeft(g);
  const exp = g.dateExpiration ? new Date(g.dateExpiration).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  return `Bonjour ${(g.nomClient || '').trim() || 'vous'},\n\nTes photos sont prêtes !${cats.length ? '\nSéance : ' + cats.join(', ') : ''}\n\n` +
    `Pour les voir et les télécharger :\n1. Ouvre ce lien : ${galClientLink(code)}\n2. Touche "Voir mes photos" et entre ton code d'accès : ${code}` +
    `${g.protege ? '\nN\'oublie pas le mot de passe que je t\'ai communiqué.' : ''}` +
    `\n3. Télécharge tes photos${d > 0 ? `\nDisponible encore ${d} jour${d > 1 ? 's' : ''} (jusqu'au ${exp}).` : ''}` +
    `${g.message ? '\n\n' + g.message : ''}\n\nN'hésite pas à laisser tes réactions et tes photos préférées directement dans la galerie !\n\nÀ bientôt,\nStudio Henzo`;
}
function galWhatsApp(code){
  const g = galList.find(x => x.code === code);
  // crmPhone ajoute l'indicatif 225 aux numeros a 10 chiffres
  const n = typeof crmPhone === 'function' ? crmPhone(g && g.telephone) : String((g && g.telephone) || '').replace(/[^0-9]/g, '');
  window.open(`https://wa.me/${n}?text=${encodeURIComponent(galMessage(code))}`, '_blank');
}
async function galCopy(code){
  try { await navigator.clipboard.writeText(galMessage(code)); agToast('Message copié'); }
  catch(e){ prompt('Copie ce message :', galMessage(code)); }
}

// ---------- Depuis une seance : bouton "Galerie" ----------
function galFromShoot(shootId){
  const s = (shoots || []).find(x => x.id === shootId); if(!s) return;
  const c = (clients || []).find(x => x.id === s.client_id);
  const exist = c && galList.find(g => (g.nomClient || '').toLowerCase() === (c.name || '').toLowerCase());
  agGoTab('galerie');
  setTimeout(() => {
    if(exist) galOpen(exist.code);
    else galOpenCreate({ clientId: c ? c.id : null, nom: c ? c.name : '', tel: c ? c.phone : '', mail: c ? c.email : '', cat: s.type || '' });
  }, galLoaded ? 50 : 1500);
}
(function galShootButtons(){
  const add = () => document.querySelectorAll('.item-card .actions').forEach(a => {
    if(a.querySelector('.ag-gal-btn')) return;
    const m = (a.innerHTML.match(/openShootModal\((\d+)\)/) || [])[1];
    if(!m) return;
    const b = document.createElement('button');
    b.className = 'btn-ghost ag-ibtn ag-gal-btn'; b.title = 'Galerie photos';
    b.innerHTML = agIcon('image', 17);
    b.onclick = () => galFromShoot(Number(m));
    a.insertBefore(b, a.querySelector('.ag-ibtn') || null);
  });
  new MutationObserver(() => add()).observe(document.body, { childList: true, subtree: true });
  add();
})();

// Charger la liste en arriere-plan (pour le bouton Galerie des seances)
setTimeout(async () => { try { galPwd = await getGaleriePwd(); if(galPwd && !galLoaded){ galList = await galApi('/api/admin/galeries'); galLoaded = true; } } catch(e){} }, 3000);

// ---------- Avis clients (laisses sur la page merci) ----------
function galStars(n, size){
  size = size || 15; let h = '';
  for(let i = 1; i <= 5; i++) h += `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="vertical-align:-2px"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" fill="${i <= n ? '#ffd166' : 'none'}" stroke="${i <= n ? '#ffd166' : 'currentColor'}" stroke-width="1.5" stroke-linejoin="round" opacity="${i <= n ? 1 : .35}"/></svg>`;
  return h;
}
// Etat d'un avis pour le site : en attente / sur le site / refuse
function galAvisEtat(a){ return a.approuve === true ? 'site' : a.approuve === false ? 'refuse' : 'attente'; }
function galAvisPrive(a){ return a.publiable === false; }
// A traiter : en attente ET le client a accepte la publication
function galAvisAttente(){ return galAvis.filter(a => galAvisEtat(a) === 'attente' && !galAvisPrive(a)).length; }
// "Awa Kone" -> "Awa K." ; "KONAN Cedric" -> "Cedric K." (meme regle que le serveur)
function galPrenomInitiale(nom){
  const T = /^(m\.?|mr\.?|mme\.?|mlle\.?|madame|monsieur|mademoiselle|dr\.?|docteur)$/i;
  const mots = String(nom || '').replace(/[<>"]/g, '').split(/[\s,&+/]+/).map(m => m.trim()).filter(m => m && !T.test(m));
  if(!mots.length) return 'Client';
  const caps = m => m.length > 1 && m === m.toUpperCase() && /[A-ZÀ-Ý]/.test(m);
  let p = mots[0], o = mots[1];
  if(caps(mots[0]) && mots.slice(1).some(m => !caps(m))){ p = mots.slice(1).find(m => !caps(m)); o = mots[0]; }
  p = p.split('-').map(x => x ? x.charAt(0).toUpperCase() + x.slice(1).toLowerCase() : x).join('-');
  return o ? `${p} ${o.charAt(0).toUpperCase()}.` : p;
}
const GAL_OK_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const GAL_NO_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
let galAvisFiltre = null;
let galWidgetOpt = { theme: 'clair', nombre: 6, min: 1 };
try { if(new URLSearchParams(location.search).get('avis')) window.__galAvisDeep = true; } catch(e){}

(function galAvisCss(){
  if(document.getElementById('galAvisCss')) return;
  const st = document.createElement('style');
  st.id = 'galAvisCss';
  st.textContent = `
.gal-av-etat{display:inline-block;font-style:normal;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;margin-left:6px;vertical-align:1px;border:1px solid var(--border)}
.gal-av-etat.attente{background:rgba(245,197,66,.15);color:var(--yellow);border-color:rgba(245,197,66,.35)}
.gal-av-etat.site{background:rgba(52,211,153,.14);color:var(--green);border-color:rgba(52,211,153,.35)}
.gal-av-etat.refuse{background:var(--card2);color:var(--muted)}
.gal-av-etat.prive{background:var(--card2);color:var(--muted)}
.gal-av-act{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.gal-av-act button{display:inline-flex;align-items:center;gap:6px;width:auto;margin:0;padding:8px 13px;border-radius:12px;font:600 13px Inter,sans-serif;cursor:pointer;border:1px solid var(--border);background:var(--card2);color:var(--text)}
.gal-av-act button.ok{background:var(--pri-bg);color:var(--pri-fg);border-color:transparent}
.gal-av-act button.no{color:var(--red)}
.gal-av-nom{font-size:12.5px;color:var(--text-2);margin-top:8px}
.gal-av-nom b{color:var(--text)}
.gal-av-warn{font-size:12.5px;color:var(--muted);margin-top:10px;padding:8px 10px;border-radius:10px;background:var(--card2);border:1px dashed var(--border)}
.gal-pills{display:flex;gap:6px;overflow-x:auto;margin:4px 0 12px;scrollbar-width:none}
.gal-pills::-webkit-scrollbar{display:none}
.gal-pills button{flex:none;width:auto;margin:0;padding:8px 12px;border-radius:12px;background:var(--card2);border:1px solid var(--border);color:var(--text-2);font:500 13px Inter,sans-serif;cursor:pointer;white-space:nowrap}
.gal-pills button.on{background:var(--card3);border-color:var(--accent);color:var(--text)}
.gal-pills button i{font-style:normal;font-size:11px;font-weight:700;margin-left:5px;padding:1px 6px;border-radius:9px;background:var(--card3);color:var(--muted)}
.gal-pills button i.chaud{background:#ff6b6b;color:#fff}
.gal-site{margin-top:18px;padding:16px;border-radius:16px;background:var(--card);border:1px solid var(--border)}
.gal-site h3{font-size:15px;margin:0 0 4px}
.gal-site p{font-size:13px;color:var(--muted);margin:0 0 12px;line-height:1.45}
.gal-code{font:12px/1.5 ui-monospace,Menlo,Consolas,monospace;background:var(--bg-2);border:1px solid var(--border);border-radius:12px;padding:12px;white-space:pre-wrap;word-break:break-all;color:var(--text-2);user-select:all}
.gal-site .row2{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0}
.gal-site select{width:auto;margin:0;padding:8px 10px;font-size:13px}
.gal-prev{margin-top:12px;padding:18px 16px;border-radius:14px;border:1px solid var(--border)}
.gal-prev.clair{background:#f6f5f2}
.gal-prev.sombre{background:#0e0f11}
.gal-prev-l{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:14px 2px 6px}
.gal-av-mini{border:1px solid var(--border);border-radius:14px;padding:12px;margin:10px 0;background:var(--card2)}
`;
  document.head.appendChild(st);
})();

async function galOpenAvis(){
  galCurrent = '__avis__';
  galBody().innerHTML = `<button class="ag-back" onclick="galCurrent=null;galRenderList()">${agIcon('chev', 16)} Toutes les galeries</button><div class="ag-empty">Chargement des avis...</div>`;
  try { galAvis = await galApi('/api/admin/avis'); } catch(e){ galBody().innerHTML += `<div class="ag-empty">${agEsc(e.message)}</div>`; return; }
  if(!Array.isArray(galAvis)) galAvis = [];
  if(!galAvisFiltre) galAvisFiltre = galAvisAttente() ? 'attente' : 'tous';
  galRenderAvis();
  const nonLus = galAvis.filter(a => !a.lu);
  galAvisNonLus = 0;
  // Format attendu par le serveur : JSON avec Content-Type (sinon "lu" n'est pas lu)
  nonLus.forEach(a => galApi('/api/admin/avis/' + a.id, { method: 'PUT', json: { lu: true } }).then(() => { a.lu = true; }).catch(e => console.warn('avis lu', e)));
}
function galAvisFiltrer(f){ galAvisFiltre = f; galRenderAvis(); }
function galRenderAvis(){
  const n = galAvis.length;
  const moy = n ? galAvis.reduce((s, a) => s + (a.note || 0), 0) / n : 0;
  const nb = { attente: galAvisAttente(), site: galAvis.filter(a => galAvisEtat(a) === 'site').length, refuse: galAvis.filter(a => galAvisEtat(a) === 'refuse').length, tous: n };
  const f = galAvisFiltre || 'tous';
  const list = galAvis.filter(a => f === 'tous' ? true : f === 'attente' ? (galAvisEtat(a) === 'attente' && !galAvisPrive(a)) : galAvisEtat(a) === f);
  const vide = { attente: 'Aucun avis en attente. Tout est traité.', site: "Aucun avis sur ton site pour l'instant. Accepte un avis pour l'y mettre.", refuse: 'Aucun avis refusé.', tous: 'Aucun avis pour le moment.' }[f];
  const pill = (k, l) => `<button class="${f === k ? 'on' : ''}" onclick="galAvisFiltrer('${k}')">${l}<i class="${k === 'attente' && nb[k] ? 'chaud' : ''}">${nb[k]}</i></button>`;
  galBody().innerHTML = `
    <button class="ag-back" onclick="galCurrent=null;galRenderList()">${agIcon('chev', 16)} Toutes les galeries</button>
    <div class="ag-total">
      <div class="lbl">Avis clients</div>
      <div class="amt">${n ? moy.toFixed(1).replace('.', ',') : '-'} <small>/ 5</small></div>
      <div style="margin:-6px 0 12px;color:#fff">${galStars(Math.round(moy), 18)}</div>
      <div class="split"><div>Avis reçus<b>${n}</b></div><div>Sur ton site<b>${nb.site}</b></div><div>En attente<b>${nb.attente}</b></div></div>
    </div>
    ${nb.attente ? `<div class="ag-hint warn" style="margin:12px 2px 0">${nb.attente} avis en attente : accepte-les pour les mettre sur ton site, ou refuse-les.</div>` : ''}
    <p class="ag-hint" style="margin:10px 2px">Les clients donnent leur avis sur la page de remerciement. Rien ne va sur ton site sans ton accord.</p>
    <div class="gal-pills">${pill('attente', 'En attente')}${pill('site', 'Sur le site')}${pill('refuse', 'Refusés')}${pill('tous', 'Tous')}</div>
    <div class="ag-list" id="galAvisList">${list.length ? list.map(galAvisCarte).join('') : `<div class="ag-empty">${vide}</div>`}</div>
    ${galSiteEncart()}`;
  galWidgetPreview();
}
function galAvisCarte(a){
  const e = galAvisEtat(a), prive = galAvisPrive(a);
  const etat = prive && e !== 'site' ? '<i class="gal-av-etat prive">Privé</i>' : `<i class="gal-av-etat ${e}">${{ attente: 'En attente', site: 'Sur le site', refuse: 'Refusé' }[e]}</i>`;
  let act = '';
  if(prive){
    act = `<div class="gal-av-warn">Le client n'a pas accepté la publication : cet avis ne peut pas aller sur ton site.</div>`
      + (e === 'site' ? `<div class="gal-av-act"><button class="no" onclick="galAvisRetirer(${a.id})">Retirer du site</button></div>` : '');
  } else if(e === 'attente'){
    act = `<div class="gal-av-act"><button class="ok" onclick="galAvisAccepter(${a.id})">${GAL_OK_SVG} Accepter</button><button class="no" onclick="galAvisRefuser(${a.id})">${GAL_NO_SVG} Refuser</button></div>`;
  } else if(e === 'site'){
    act = `<div class="gal-av-nom">Nom affiché sur le site : <b>${agEsc(a.nom_affiche || galPrenomInitiale(a.nom_client))}</b></div>
      <div class="gal-av-act"><button onclick="galAvisAccepter(${a.id})">${agIcon('edit', 14)} Modifier le nom</button><button class="no" onclick="galAvisRetirer(${a.id})">Retirer du site</button></div>`;
  } else {
    act = `<div class="gal-av-act"><button class="ok" onclick="galAvisAccepter(${a.id})">${GAL_OK_SVG} Accepter quand même</button></div>`;
  }
  return `<div class="ag-avis" data-avis="${a.id}">
    <div class="ag-avis-h"><div><b>${agEsc(a.nom_client || 'Client')}</b>${etat}${a.lu ? '' : ' <i class="ag-new">Nouveau</i>'}<div class="ag-avis-d">${galStars(a.note)} · ${new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}${a.code ? ' · ' + agEsc(a.code) : ''}${a.source ? ' · connu par ' + agEsc(typeof crmSrcLabel === 'function' ? crmSrcLabel(a.source) : a.source) : ''}</div></div>
      ${!prive && a.texte ? `<button class="ag-ibtn" title="Copier pour publier" onclick="galCopyAvis(${a.id})">${agIcon('copy', 16)}</button>` : ''}</div>
    ${a.texte ? `<p class="ag-avis-t">${agEsc(a.texte)}</p>` : '<p class="ag-avis-t" style="opacity:.5">Pas de commentaire</p>'}
    ${act}
  </div>`;
}
async function galAvisMaj(id, json){
  const a = galAvis.find(x => x.id === id); if(!a) return null;
  const r = await galApi('/api/admin/avis/' + id, { method: 'PUT', json });
  if(r && r.avis) Object.assign(a, r.avis);
  else { Object.assign(a, json); if('approuve' in json) a.approuve_le = json.approuve === true ? new Date().toISOString() : null; }
  return a;
}
function galAvisAccepter(id){
  const a = galAvis.find(x => x.id === id); if(!a) return;
  if(galAvisPrive(a)){ alert("Le client n'a pas accepté la publication : cet avis ne peut pas aller sur ton site."); return; }
  const nom = a.nom_affiche || galPrenomInitiale(a.nom_client);
  agSheet('galAvisOk', `
    <h3>${a.approuve === true ? 'Nom affiché sur le site' : 'Mettre cet avis sur ton site'}</h3>
    <div class="gal-av-mini"><div>${galStars(a.note)}</div>${a.texte ? `<p class="ag-avis-t" style="margin-top:6px">${agEsc(a.texte)}</p>` : ''}</div>
    <label for="galAvNom">Nom affiché</label>
    <input id="galAvNom" maxlength="60" value="${agEsc(nom)}" placeholder="Ex : Awa K.">
    <div class="ag-hint">Par défaut : le prénom et l'initiale du nom (${agEsc(galPrenomInitiale(a.nom_client))}). Tu peux le changer.</div>
    <button class="btn-primary" style="width:100%;margin-top:14px" onclick="galAvisValider(${a.id})">${a.approuve === true ? 'Enregistrer' : 'Mettre sur le site'}</button>`);
  setTimeout(() => { const i = document.getElementById('galAvNom'); if(i){ i.focus(); i.select(); } }, 80);
}
async function galAvisValider(id){
  const a = galAvis.find(x => x.id === id); if(!a) return;
  const nom = (document.getElementById('galAvNom')?.value || '').trim() || galPrenomInitiale(a.nom_client);
  const deja = a.approuve === true;
  try { await galAvisMaj(id, { approuve: true, nom_affiche: nom }); }
  catch(e){ alert(e.message); return; }
  agCloseSheet('galAvisOk');
  galRenderAvis();
  agToast(deja ? 'Nom enregistré' : 'Avis mis sur ton site');
}
async function galAvisRefuser(id){
  try { await galAvisMaj(id, { approuve: false }); } catch(e){ alert(e.message); return; }
  galRenderAvis(); agToast('Avis refusé : il ne sera pas sur ton site');
}
async function galAvisRetirer(id){
  if(typeof agConfirm === 'function' && !await agConfirm('Retirer cet avis de ton site ?')) return;
  try { await galAvisMaj(id, { approuve: false }); } catch(e){ alert(e.message); return; }
  galRenderAvis(); agToast('Avis retiré du site');
}
function galCopyAvis(id){
  const a = galAvis.find(x => x.id === id); if(!a) return;
  galCopyText(`"${a.texte || ''}"\n- ${a.nom_affiche || galPrenomInitiale(a.nom_client)} ${'★'.repeat(a.note)}`, 'Avis copié');
}

// ---------- Encart "Afficher mes avis sur mon site" ----------
function galWidgetCode(){
  const o = galWidgetOpt, at = [];
  if(o.theme === 'sombre') at.push('data-theme="sombre"');
  if(o.nombre !== 6) at.push(`data-nombre="${o.nombre}"`);
  if(o.min > 1) at.push(`data-note-min="${o.min}"`);
  return `<div id="henzo-avis"${at.length ? ' ' + at.join(' ') : ''}></div>\n<script src="${galApiBase()}/avis-widget.js" async></script>`;
}
function galSiteEncart(){
  const o = galWidgetOpt;
  const opt = (v, cur, l) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${l}</option>`;
  return `<div class="gal-site" id="galSite">
    <h3>Afficher mes avis sur mon site</h3>
    <p>Colle ce code une seule fois sur ton site, à l'endroit où tu veux les avis. Ensuite, chaque avis que tu acceptes ici apparaît tout seul sur le site (en quelques minutes).</p>
    <div class="row2">
      <div class="gal-pills" style="margin:0">${['clair', 'sombre'].map(t => `<button class="${o.theme === t ? 'on' : ''}" onclick="galWidgetSet('theme','${t}')">Fond ${t}</button>`).join('')}</div>
      <select onchange="galWidgetSet('nombre',+this.value)" aria-label="Nombre d'avis">${[3, 6, 9, 12].map(n => opt(n, o.nombre, n + ' avis')).join('')}</select>
      <select onchange="galWidgetSet('min',+this.value)" aria-label="Note minimum">${opt(1, o.min, 'Toutes les notes')}${opt(4, o.min, '4 étoiles et +')}${opt(5, o.min, '5 étoiles')}</select>
    </div>
    <div class="gal-code" id="galWidgetCode">${agEsc(galWidgetCode())}</div>
    <button class="btn-primary" style="width:100%;margin-top:10px;display:flex;align-items:center;justify-content:center;gap:8px" onclick="galCopyText(galWidgetCode(),'Code copié : colle-le sur ton site')">${agIcon('copy', 15)} Copier le code</button>
    <div class="gal-prev-l">Aperçu sur ton site</div>
    <div class="gal-prev ${o.theme}"><div id="galWidgetPrev" data-henzo-apercu></div></div>
  </div>`;
}
function galWidgetSet(k, v){
  galWidgetOpt[k] = v;
  const box = document.getElementById('galSite');
  if(box){ box.outerHTML = galSiteEncart(); galWidgetPreview(); }
}
// Meme filtre que le serveur (/api/avis-publics), pour un apercu immediat
function galAvisPublics(){
  const o = galWidgetOpt, M = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const ok = galAvis.filter(a => a.approuve === true && a.publiable !== false && a.note >= 1);
  const total = ok.length, moyenne = total ? Math.round(ok.reduce((s, a) => s + a.note, 0) / total * 10) / 10 : 0;
  const avis = ok.filter(a => a.note >= o.min).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, o.nombre)
    .map(a => { const d = new Date(a.created_at); return { id: a.id, nom: a.nom_affiche || galPrenomInitiale(a.nom_client), note: a.note, texte: a.texte || '', mois: isNaN(d) ? '' : M[d.getUTCMonth()] + ' ' + d.getUTCFullYear() }; });
  return { total, moyenne, avis };
}
function galWidgetPreview(){
  const el = document.getElementById('galWidgetPrev'); if(!el) return;
  const data = galAvisPublics();
  if(!data.avis.length){ el.innerHTML = `<div class="ag-empty" style="color:${galWidgetOpt.theme === 'sombre' ? '#a1a1a6' : '#6e6e73'}">Aucun avis accepté${galWidgetOpt.min > 1 ? ' avec cette note' : ''} : rien ne s'affiche encore sur ton site.</div>`; return; }
  const go = () => { try { window.HenzoAvis.afficher(el, data, { theme: galWidgetOpt.theme }); } catch(e){ console.warn('apercu avis', e); } };
  if(window.HenzoAvis) return go();
  if(!window.__galWidgetLoading){
    window.__galWidgetLoading = new Promise((ok, ko) => { const s = document.createElement('script'); s.src = galApiBase() + '/avis-widget.js'; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
  }
  window.__galWidgetLoading.then(() => { if(document.getElementById('galWidgetPrev') === el) go(); })
    .catch(() => { window.__galWidgetLoading = null; el.innerHTML = '<div class="ag-empty">Aperçu indisponible : la galerie ne répond pas. Réessaie dans une minute.</div>'; });
}

// ---------- Statistiques d'une galerie ----------
const GAL_EV = {
  ouverture: ['eye', 'a ouvert la galerie'], telechargement_tout: ['download', 'a téléchargé toutes les photos'],
  telechargement_photo: ['download', 'a téléchargé'], like: ['heart', 'a aimé'], commentaire: ['chat', 'a commenté'],
  selection: ['check', 'a envoyé sa sélection'], tirage: ['image', 'a demandé un tirage'], avis: ['star', 'a laissé un avis'],
  partage: ['link', 'a partagé une photo'], diaporama: ['image', 'a lancé le diaporama']
};
function galQual(q){ return q === 'web1200' ? 'qualité moyenne' : 'originale'; }
async function galStats(g, box){
  let A;
  try { A = await galApi('/api/admin/activite/' + encodeURIComponent(g.dossier)); }
  catch(e){ const i = await galApi('/api/admin/interactions/' + encodeURIComponent(g.dossier)); A = { evenements: [], interactions: i, selections: [], tirages: [], avis: [], vieux: true }; }
  const ev = A.evenements || [], it = A.interactions || [];
  const ouv = ev.filter(e => e.type === 'ouverture');
  const nbOuv = ouv.length || it.filter(i => i.type === 'vue').length;
  const zips = ev.filter(e => e.type === 'telechargement_tout');
  const singles = ev.filter(e => e.type === 'telechargement_photo');
  const total = g.nbPhotos || 0;
  const dlSet = new Set(singles.map(e => (e.details || {}).fichier).filter(Boolean));
  const nbDl = zips.length ? Math.max(total, ...zips.map(z => (z.details || {}).nb || 0)) : dlSet.size;
  const likes = it.filter(i => i.type === 'like'), coms = it.filter(i => i.type === 'commentaire');
  const avis = A.avis || [], sels = A.selections || [], tirs = A.tirages || [];
  const dev = {}; ev.forEach(e => { if(e.appareil && e.type === 'ouverture') dev[e.appareil] = (dev[e.appareil] || 0) + 1; });
  // Fil d'activite (regroupe les actions identiques proches)
  const items = [
    ...ev.filter(e => !['like', 'commentaire', 'selection', 'tirage', 'avis'].includes(e.type)).map(e => ({ t: e.type, d: e.date_creation, x: e.details || {}, a: e.appareil })),
    ...it.filter(i => i.type === 'like' || i.type === 'commentaire').map(i => ({ t: i.type, d: i.date_creation, x: { fichier: i.fichier, contenu: i.contenu } })),
    ...sels.map(x => ({ t: 'selection', d: x.date_creation, x: { nb: (x.photos || []).length, message: x.message } })),
    ...tirs.map(x => ({ t: 'tirage', d: x.date_creation, x: { fichier: x.fichier, nb: x.quantite || 1 } })),
    ...avis.map(x => ({ t: 'avis', d: x.created_at, x: { note: x.note, texte: x.texte, source: x.source } }))
  ].filter(x => x.d).sort((a, b) => String(b.d).localeCompare(String(a.d)));
  const groups = [];
  items.forEach(x => {
    const last = groups[groups.length - 1];
    if(last && last.t === x.t && ['telechargement_photo', 'like', 'partage'].includes(x.t) && Math.abs(new Date(last.d0) - new Date(x.d)) < 15 * 60000){ last.n++; last.files.push(x.x.fichier); last.d0 = x.d; if(x.x.qualite) last.q.add(x.x.qualite); }
    else groups.push({ ...x, n: 1, files: [x.x.fichier], d0: x.d, q: new Set(x.x.qualite ? [x.x.qualite] : []) });
  });
  const lastAct = items[0] ? new Date(items[0].d) : null;
  // Photos preferees
  const score = {};
  const add = (f, k) => { if(!f || f === '__galerie__') return; (score[f] = score[f] || { l: 0, d: 0, c: 0 })[k]++; };
  likes.forEach(l => add(l.fichier, 'l')); coms.forEach(c => add(c.fichier, 'c')); singles.forEach(s => add((s.details || {}).fichier, 'd'));
  const top = Object.entries(score).sort((a, b) => (b[1].l * 3 + b[1].d * 2 + b[1].c * 2) - (a[1].l * 3 + a[1].d * 2 + a[1].c * 2)).slice(0, 8);
  const dt = d => new Date(d).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const line = x => {
    const [ic, lbl] = GAL_EV[x.t] || ['info', x.t];
    let txt = lbl;
    if(x.t === 'telechargement_photo') txt = `a téléchargé ${x.n} photo${x.n > 1 ? 's' : ''} (${[...x.q].map(galQual).join(', ') || 'originale'})`;
    if(x.t === 'telechargement_tout') txt = `a téléchargé toutes ses photos : ${x.x.nb || '?'} (${galQual(x.x.qualite)})`;
    if(x.t === 'like') txt = `a aimé ${x.n} photo${x.n > 1 ? 's' : ''}`;
    if(x.t === 'commentaire') txt = `a commenté : « ${agEsc(x.x.contenu || '')} »`;
    if(x.t === 'selection') txt = `a choisi ${x.x.nb} photo${x.x.nb > 1 ? 's' : ''}${x.x.message ? ' : « ' + agEsc(x.x.message) + ' »' : ''}`;
    if(x.t === 'tirage') txt = `a demandé ${x.x.nb} tirage${x.x.nb > 1 ? 's' : ''}`;
    if(x.t === 'avis') txt = `a donné un avis ${'★'.repeat(x.x.note || 0)}${x.x.texte ? ' : « ' + agEsc(x.x.texte) + ' »' : ''}${x.x.source ? ' · a connu Henzo Studio par ' + agEsc(x.x.source) : ''}`;
    if(x.t === 'partage') txt = `a partagé ${x.n > 1 ? x.n + ' photos' : 'une photo'}${x.x.canal ? ' (' + agEsc(x.x.canal) + ')' : ''}`;
    if(x.t === 'ouverture') txt = `a ouvert la galerie${x.a ? ' sur ' + agEsc(x.a === 'Ordinateur' ? 'ordinateur' : x.a) : ''}`;
    const thumbs = x.files.filter(Boolean).filter(f => f !== '__galerie__').slice(0, 6);
    return `<div class="gal-ev"><div class="ic">${agIcon(ic, 16)}</div><div class="d"><b>${txt}</b><span>${dt(x.d)}</span>
      ${thumbs.length && x.t !== 'telechargement_tout' ? `<div class="gal-ev-th">${thumbs.map(f => `<img loading="lazy" src="${galPhotoUrl(g.dossier, f, 'thumb')}" alt="">`).join('')}${x.files.length > 6 ? `<i>+${x.files.length - 6}</i>` : ''}</div>` : ''}</div></div>`;
  };
  box.innerHTML = `
    ${A.vieux ? '<div class="ag-hint">Mets à jour le fichier server.js de la galerie pour voir tous les détails (téléchargements, appareil...).</div>' : ''}
    <div class="gal-kpis">
      <div><b>${nbOuv}</b><span>ouverture${nbOuv > 1 ? 's' : ''}</span></div>
      <div><b>${nbDl}${total ? '<small>/' + total + '</small>' : ''}</b><span>photos téléchargées</span></div>
      <div><b>${likes.length}</b><span>j'aime</span></div>
      <div><b>${coms.length}</b><span>commentaire${coms.length > 1 ? 's' : ''}</span></div>
      <div><b>${sels.reduce((a, x) => a + (x.photos || []).length, 0)}</b><span>photos choisies</span></div>
      <div><b>${avis.length ? avis[0].note + '/5' : '-'}</b><span>avis</span></div>
    </div>
    <div class="ag-list gal-sum">
      <div class="crm-line"><div><span>Dernière activité</span></div><b>${lastAct ? dt(lastAct) : 'Aucune'}</b></div>
      ${zips.length ? `<div class="crm-line"><div><span>Tout téléchargé</span></div><b>${zips.length} fois, la dernière le ${dt(zips[0].date_creation)}</b></div>` : `<div class="crm-line"><div><span>Tout téléchargé</span></div><b>Pas encore</b></div>`}
      ${Object.keys(dev).length ? `<div class="crm-line"><div><span>Appareils</span></div><b>${Object.entries(dev).map(([k, v]) => agEsc(k) + ' (' + v + ')').join(', ')}</b></div>` : ''}
      ${tirs.length ? `<div class="crm-line"><div><span>Tirages demandés</span></div><b>${tirs.reduce((a, x) => a + (x.quantite || 1), 0)}</b></div>` : ''}
    </div>
    ${top.length ? `<div class="ag-sec"><h3>Photos préférées</h3></div><div class="gal-top">${top.map(([f, v]) => `<div><img loading="lazy" src="${galPhotoUrl(g.dossier, f, 'thumb')}" alt=""><span>${v.l ? agIcon('heart', 11) + v.l : ''} ${v.d ? agIcon('download', 11) + v.d : ''} ${v.c ? agIcon('chat', 11) + v.c : ''}</span></div>`).join('')}</div>` : ''}
    <div class="ag-sec"><h3>Ce que le client a fait</h3>${groups.length ? `<span class="crm-count">${groups.length}</span>` : ''}</div>
    <div class="ag-list">${groups.length ? groups.slice(0, 120).map(line).join('') : '<div class="ag-empty">Aucune activité pour le moment.</div>'}</div>
    <button class="btn-secondary" style="margin-top:12px" onclick="galTestPush()">${agIcon('info', 14)} Tester la notification sur mon téléphone</button>`;
}
async function galTestPush(){
  try { await galApi('/api/admin/test-push', { method: 'POST' }); agToast('Notification envoyée, regarde ton téléphone'); }
  catch(e){ alert(e.message); }
}
