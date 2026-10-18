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
    galApi('/api/admin/avis').then(a => { galAvis = Array.isArray(a) ? a : []; galAvisNonLus = galAvis.filter(x => !x.lu).length; if(!galCurrent && document.getElementById('galListBox')) galRenderList(); }).catch(() => {});
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
      <button class="ag-act" onclick="galOpenAvis()" style="position:relative"><span>${agIcon('star')}</span>Avis${galAvisNonLus ? `<i class="ag-dot">${galAvisNonLus}</i>` : ''}</button>
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
    <div id="galUp"></div>
    <div class="seg-bar ag-gal-tabs" style="display:flex">
      <button class="on" data-t="photos" onclick="galTab(this)">Photos</button>
      <button data-t="choix" onclick="galTab(this)">Choix du client</button>
      <button data-t="tirages" onclick="galTab(this)">Tirages</button>
      <button data-t="reactions" onclick="galTab(this)">Réactions</button>
    </div>
    <div id="galTabBody"><div class="ag-empty">Chargement...</div></div>
    <button class="btn-danger" style="width:100%;padding:12px;margin-top:16px" onclick="galDelete('${agEsc(code)}')">Supprimer cette galerie</button>`;
  galShowTab('photos');
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
      const list = await galApi('/api/admin/interactions/' + encodeURIComponent(g.dossier));
      const likes = list.filter(i => i.type === 'like').length, coms = list.filter(i => i.type === 'commentaire');
      const vues = list.filter(i => i.type === 'vue').length;
      box.innerHTML = `<div class="ag-total" style="padding:16px"><div class="split"><div>Vues<b>${vues}</b></div><div>J'aime<b>${likes}</b></div><div>Commentaires<b>${coms.length}</b></div></div></div>` +
        (coms.length ? '<div class="ag-list">' + coms.map(c => `<div class="ag-tx"><div class="ic">${agIcon('chat')}</div><div class="d"><b>${agEsc(c.contenu || '')}</b><span>${agEsc(c.fichier || '')}</span></div></div>`).join('') + '</div>' : '');
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
  if(!confirm('Supprimer cette photo de la galerie ?')) return;
  try { await galApi(`/api/admin/galeries/${encodeURIComponent(code)}/photos/${encodeURIComponent(f)}`, { method: 'DELETE' }); galShowTab('photos'); }
  catch(e){ alert(e.message); }
}
async function galDelete(code){
  const g = galList.find(x => x.code === code);
  if(!confirm(`Supprimer définitivement la galerie de ${g ? g.nomClient : code} et toutes ses photos ?`)) return;
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
  const n = String((g && g.telephone) || '').replace(/[^0-9]/g, '');
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
async function galOpenAvis(){
  galCurrent = '__avis__';
  galBody().innerHTML = `<button class="ag-back" onclick="galCurrent=null;galRenderList()">${agIcon('chev', 16)} Toutes les galeries</button><div class="ag-empty">Chargement des avis...</div>`;
  try { galAvis = await galApi('/api/admin/avis'); } catch(e){ galBody().innerHTML += `<div class="ag-empty">${agEsc(e.message)}</div>`; return; }
  galRenderAvis();
  const nonLus = galAvis.filter(a => !a.lu);
  galAvisNonLus = 0;
  nonLus.forEach(a => galApi('/api/admin/avis/' + a.id, { method: 'PUT', body: JSON.stringify({ lu: true }) }).catch(() => {}));
}
function galRenderAvis(){
  const n = galAvis.length;
  const moy = n ? galAvis.reduce((s, a) => s + (a.note || 0), 0) / n : 0;
  const cinq = galAvis.filter(a => a.note === 5).length;
  galBody().innerHTML = `
    <button class="ag-back" onclick="galCurrent=null;galRenderList()">${agIcon('chev', 16)} Toutes les galeries</button>
    <div class="ag-total">
      <div class="lbl">Avis clients</div>
      <div class="amt">${n ? moy.toFixed(1).replace('.', ',') : '-'} <small>/ 5</small></div>
      <div style="margin:-6px 0 12px;color:#fff">${galStars(Math.round(moy), 18)}</div>
      <div class="split"><div>Avis reçus<b>${n}</b></div><div>5 étoiles<b>${cinq}</b></div><div>Partageables<b>${galAvis.filter(a => a.publiable).length}</b></div></div>
    </div>
    <p class="ag-hint" style="margin:12px 2px">Les clients donnent leur avis sur la page de remerciement, juste après avoir téléchargé leurs photos.</p>
    <div class="ag-list">${n ? galAvis.map(a => `
      <div class="ag-avis">
        <div class="ag-avis-h"><div><b>${agEsc(a.nom_client || 'Client')}</b>${a.lu ? '' : ' <i class="ag-new">Nouveau</i>'}<div class="ag-avis-d">${galStars(a.note)} · ${new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}${a.code ? ' · ' + agEsc(a.code) : ''}</div></div>
          ${a.publiable && a.texte ? `<button class="ag-ibtn" title="Copier pour publier" onclick="galCopyAvis(${a.id})">${agIcon('copy', 16)}</button>` : ''}</div>
        ${a.texte ? `<p class="ag-avis-t">${agEsc(a.texte)}</p>` : '<p class="ag-avis-t" style="opacity:.5">Pas de commentaire</p>'}
        ${a.publiable ? '' : '<div class="ag-avis-d">Le client ne souhaite pas que son avis soit partagé</div>'}
      </div>`).join('') : '<div class="ag-empty">Aucun avis pour le moment.</div>'}</div>`;
}
function galCopyAvis(id){
  const a = galAvis.find(x => x.id === id); if(!a) return;
  galCopyText(`"${a.texte || ''}"\n- ${a.nom_client || 'Client'} ${'★'.repeat(a.note)}`, 'Avis copié');
}
