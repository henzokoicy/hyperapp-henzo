// ============================================================
// SUPER APP HENZO - MOODBOARD (idees de seance)
// - Tableaux par type de seance ou par seance d'un client
// - Images : galerie du telephone, lien Pinterest, partage depuis Pinterest
// - Notes 1 a 5 etoiles, etiquettes, notes, filtre "Les meilleures"
// - IA qui regarde les images : plan de seance, reponses, idees de posts
// - Collage a envoyer au client
// ============================================================

const MB = { boards: [], imgs: [], fb: [], ev: [], loaded: false, cur: null, filter: 'all', sel: new Set(), selMode: false, busy: '' };
const MB_TAGS = ['Pose', 'Lumière', 'Décor', 'Tenue', 'Couleurs', 'Cadrage', 'Accessoire', 'Coiffure / makeup', 'Retouche'];
const MB_TYPES = ['Shooting studio', 'Anniversaire enfant', 'Grossesse', 'Mariage', 'Couple', 'Famille', 'Portrait pro', 'Extérieur', 'Événement', 'Bébé / naissance', 'Mode'];
const MB_NETS = ['Instagram', 'TikTok', 'Facebook', 'Statut WhatsApp', 'Portfolio'];

async function mbLoad(){
  try {
    const [b, i, f, e] = await Promise.all([
      sb.from('mood_boards').select('*').order('created_at', { ascending: false }),
      sb.from('mood_images').select('*').order('position', { ascending: true }).order('created_at', { ascending: true }),
      sb.from('mood_feedback').select('*').order('created_at', { ascending: false }),
      sb.from('mood_events').select('*').order('created_at', { ascending: false }).limit(500)
    ]);
    MB.boards = b.data || []; MB.imgs = i.data || []; MB.fb = f.data || []; MB.ev = (e && e.data) || [];
  } catch(e){ console.warn('moodboard', e); }
  MB.loaded = true;
}
const mbImgs = id => MB.imgs.filter(x => x.board_id === id && !x.hidden);
const mbBoard = id => MB.boards.find(x => x.id === id);
function mbBody(){ return document.getElementById('mbBody'); }
function mbStars(n, id, size){
  size = size || 18; let h = '';
  for(let i = 1; i <= 5; i++) h += `<button class="mb-star ${i <= n ? 'on' : ''}" ${id ? `onclick="event.stopPropagation();mbRate(${id},${i === n ? 0 : i})"` : 'disabled'}><svg width="${size}" height="${size}" viewBox="0 0 24 24"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" stroke-linejoin="round"/></svg></button>`;
  return `<span class="mb-stars">${h}</span>`;
}

// ============================================================
// LISTE DES TABLEAUX
// ============================================================
async function mbRender(){
  const el = mbBody(); if(!el) return;
  if(!MB.loaded){ el.innerHTML = '<div class="ag-empty">Chargement...</div>'; await mbLoad(); }
  if(MB.cur && mbBoard(MB.cur)) return mbRenderBoard();
  MB.cur = null;
  const best = MB.imgs.filter(x => x.rating >= 4).length;
  el.innerHTML = `
    <div class="ag-total">
      <div class="lbl">Moodboard</div>
      <div class="amt">${MB.boards.length} <small>tableau${MB.boards.length > 1 ? 'x' : ''}</small></div>
      <div class="split"><div>Images<b>${MB.imgs.length}</b></div><div>Les meilleures<b>${best}</b></div></div>
    </div>
    <div class="ag-actions" style="grid-template-columns:repeat(3,1fr)">
      <button class="ag-act main" onclick="mbNewBoard()"><span>${agIcon('plus')}</span>Tableau</button>
      <button class="ag-act" onclick="mbPasteLink(null)"><span>${agIcon('link')}</span>Lien Pinterest</button>
      <button class="ag-act" onclick="mbOpenBest()"><span>${agIcon('star')}</span>Meilleures</button>
    </div>
    ${MB.boards.length ? `<div class="mb-boards">${MB.boards.map(b => {
      const im = mbImgs(b.id), s = b.shoot_id ? (shoots || []).find(x => x.id === b.shoot_id) : null;
      const cov = im.slice().sort((a, c) => (c.rating || 0) - (a.rating || 0)).slice(0, 4);
      return `<div class="mb-board" onclick="mbOpen(${b.id})">
        <div class="mb-cov n${cov.length}">${cov.map(x => `<img src="${agEsc(x.url)}" loading="lazy" alt="">`).join('') || `<div class="mb-cov-empty">${agIcon('image', 26)}</div>`}</div>
        <div class="mb-board-t"><b>${agEsc(b.title || 'Sans titre')}</b><span>${agEsc([b.shoot_type, s ? 'séance du ' + crmDate(s.date, { day: 'numeric', month: 'short' }) : ''].filter(Boolean).join(' · ') || 'Tableau')} · ${im.length} image${im.length > 1 ? 's' : ''}</span></div>
      </div>`; }).join('')}</div>`
    : `<div class="ag-list"><div class="ag-empty">Crée ton premier tableau, par exemple "Anniversaire enfant" ou "Grossesse en studio", puis ajoute tes images Pinterest.</div></div>`}`;
}
function mbOpen(id){ mbLoad().then(() => { if(MB.cur === id) mbRenderBoard(); }); MB.cur = id; MB.filter = 'all'; MB.sel.clear(); MB.selMode = false; mbRender(); window.scrollTo({ top: 0 }); }
function mbOpenBest(){
  let b = MB.boards.find(x => x.title === '__best__');
  MB.cur = null; MB.filter = 'best';
  const el = mbBody();
  const best = MB.imgs.filter(x => x.rating >= 4).sort((a, c) => c.rating - a.rating);
  el.innerHTML = `<button class="ag-back" onclick="mbRender()">${agIcon('chev', 16)} Mes tableaux</button>
    <div class="ag-sec"><h3>Les meilleures images</h3><span class="crm-count">${best.length}</span></div>
    ${best.length ? `<div class="mb-grid">${best.map(x => mbTile(x, false)).join('')}</div>` : '<div class="ag-list"><div class="ag-empty">Donne 4 ou 5 étoiles à une image pour la retrouver ici.</div></div>'}`;
}

function mbNewBoard(pre){
  pre = pre || {};
  const b = pre.id ? mbBoard(pre.id) : null;
  const up = (shoots || []).filter(s => !crmCancelled(s)).sort((a, c) => String(c.date).localeCompare(String(a.date))).slice(0, 40);
  const shootId = b ? b.shoot_id : pre.shoot_id;
  // Pour qui : n'importe quelle personne (client, modele, ami...), pas seulement un client
  const pid = b ? b.client_id : pre.client_id;
  const gens = (clients || []).slice().sort((a, c) => String(a.name).localeCompare(String(c.name)));
  agSheet('mbNew', `
    <h3>${b ? 'Modifier le tableau' : 'Nouveau tableau'}</h3>
    <label>Nom</label><input id="mbTitle" value="${agEsc(b ? b.title : (pre.title || ''))}" placeholder="Ex : Anniversaire enfant - thème jungle">
    <label>Type de séance</label><input id="mbType" list="mbTypes" value="${agEsc(b ? b.shoot_type || '' : (pre.shoot_type || ''))}" placeholder="Ex : Grossesse"><datalist id="mbTypes">${MB_TYPES.map(t => `<option value="${agEsc(t)}">`).join('')}</datalist>
    <label>Lier à une séance (facultatif)</label>
    <select id="mbShoot"><option value="">Aucune, tableau général</option>${up.map(s => { const c = (clients || []).find(x => x.id === s.client_id);
      return `<option value="${s.id}" ${s.id === shootId ? 'selected' : ''}>${agEsc((s.type || 'Séance') + (c ? ' · ' + c.name : '') + ' · ' + crmDate(s.date, { day: 'numeric', month: 'short' }))}</option>`; }).join('')}</select>
    <label>Pour qui (facultatif)</label>
    <select id="mbPerson"><option value="">Personne en particulier</option>${gens.map(c => `<option value="${c.id}" ${Number(pid) === c.id ? 'selected' : ''}>${agEsc(c.name + (typeof eqRoleLabel === 'function' && typeof estClient === 'function' && !estClient(c) ? ' · ' + eqRoleLabel(c) : ''))}</option>`).join('')}</select>
    <label>Notes (idée générale, thème, couleurs)</label><textarea id="mbNotes" rows="3" placeholder="Ex : ambiance douce, tons beige et blanc, ballons dorés">${agEsc(b ? b.notes || '' : '')}</textarea>
    <button class="btn-primary" onclick="mbSaveBoard(${b ? b.id : 'null'})">${b ? 'Enregistrer' : 'Créer le tableau'}</button>
    ${b ? `<button class="btn-danger" style="width:100%;padding:12px;margin-top:8px" onclick="mbDeleteBoard(${b.id})">Supprimer le tableau</button>` : ''}`);
}
async function mbSaveBoard(id){
  const v = k => document.getElementById(k).value.trim();
  const shoot_id = v('mbShoot') ? Number(v('mbShoot')) : null;
  const s = shoot_id ? (shoots || []).find(x => x.id === shoot_id) : null;
  const pers = document.getElementById('mbPerson') ? Number(v('mbPerson')) || null : null;
  const data = { title: v('mbTitle') || (s ? s.type : 'Mon tableau'), shoot_type: v('mbType') || (s ? s.type : null), shoot_id, client_id: pers || (s ? s.client_id : null), notes: v('mbNotes') || null };
  try {
    if(id){
      const { data: r, error } = await sb.from('mood_boards').update(data).eq('id', id).select().single();
      if(error) throw error; Object.assign(mbBoard(id), r);
    } else {
      const uid = await otUid();
      const { data: r, error } = await sb.from('mood_boards').insert({ ...data, user_id: uid }).select().single();
      if(error) throw error; MB.boards.unshift(r); MB.cur = r.id;
      if(MB.pendingLink){ const l = MB.pendingLink; MB.pendingLink = null; agCloseSheet('mbNew'); mbRender(); return mbImportLink(r.id, l); }
    }
  } catch(e){ alert('Erreur : ' + (e.message || e)); return; }
  agCloseSheet('mbNew'); mbRender();
}
async function mbDeleteBoard(id){
  const im = mbImgs(id);
  if(!await agConfirm(`Supprimer ce tableau et ses ${im.length} image(s) ?`)) return;
  const all = MB.imgs.filter(x => x.board_id === id);
  const cli = all.filter(x => x.from_client).map(x => x.id);
  if(cli.length) await mbCleanClient(cli);
  const paths = all.filter(x => !x.from_client).map(x => x.path).filter(Boolean);
  if(paths.length) await sb.storage.from('moodboard').remove(paths);
  await sb.from('mood_images').delete().eq('board_id', id);
  const { error } = await sb.from('mood_boards').delete().eq('id', id);
  if(error){ alert(error.message); return; }
  MB.imgs = MB.imgs.filter(x => x.board_id !== id); MB.boards = MB.boards.filter(x => x.id !== id);
  MB.cur = null; agCloseSheet('mbNew'); mbRender();
}

// ============================================================
// UN TABLEAU
// ============================================================
function mbTile(x, selectable){
  const on = MB.sel.has(x.id);
  return `<div class="mb-tile ${on ? 'sel' : ''}" onclick="${selectable && MB.selMode ? `mbToggleSel(${x.id})` : `mbView(${x.id})`}">
    <img src="${agEsc(x.url)}" loading="lazy" alt="">
    ${selectable && MB.selMode ? `<span class="mb-chk">${on ? agIcon('check', 14) : ''}</span>` : ''}
    ${x.rating ? `<span class="mb-r">${'★'.repeat(x.rating)}</span>` : ''}
    ${x.client_pick ? `<span class="mb-cp" title="${agEsc(x.client_note || 'Choisie par le client')}">${agIcon('heart', 13)} Client</span>` : ''}
    ${x.from_client ? `<span class="mb-cp mb-fc">${agIcon('user', 12)} Proposée${x.client_name ? ' par ' + agEsc(x.client_name.split(' ')[0]) : ''}</span>` : ''}
    ${(x.client_pick || x.from_client) && x.client_note ? `<span class="mb-cn">« ${agEsc(x.client_note.slice(0, 60))} »</span>` : ''}
    ${(x.tags || []).length ? `<span class="mb-tg">${agEsc(x.tags.slice(0, 2).join(' · '))}</span>` : ''}
  </div>`;
}
function mbRenderBoard(){
  const el = mbBody(), b = mbBoard(MB.cur); if(!b) return mbRender();
  let im = mbImgs(b.id);
  const allTags = [...new Set(im.flatMap(x => x.tags || []))];
  if(MB.filter === 'best') im = im.filter(x => x.rating >= 4);
  else if(MB.filter === 'client') im = im.filter(x => x.client_pick);
  else if(MB.filter === 'propose') im = im.filter(x => x.from_client);
  else if(MB.filter !== 'all') im = im.filter(x => (x.tags || []).includes(MB.filter));
  const s = b.shoot_id ? (shoots || []).find(x => x.id === b.shoot_id) : null;
  const c = s && s.client_id ? (clients || []).find(x => x.id === s.client_id) : null;
  const sl = b.shot_list || [], done = sl.filter(x => x.done).length;
  const ai = b.ai || {};
  el.innerHTML = `
    <button class="ag-back" onclick="MB.cur=null;mbRender()">${agIcon('chev', 16)} Mes tableaux</button>
    <div class="ag-total">
      <div class="lbl">${agEsc(b.shoot_type || 'Moodboard')}</div>
      <div class="amt" style="font-size:26px">${agEsc(b.title || 'Sans titre')}</div>
      <div class="split"><div>Images<b>${mbImgs(b.id).length}</b></div><div>Meilleures<b>${mbImgs(b.id).filter(x => x.rating >= 4).length}</b></div>${s ? `<div>Séance<b>${crmDate(s.date, { day: 'numeric', month: 'short' })}${c ? ' · ' + agEsc(c.name.split(' ')[0]) : ''}</b></div>` : ''}</div>
    </div>
    ${b.notes ? `<p class="ag-hint" style="margin:-4px 2px 12px">${agEsc(b.notes)}</p>` : ''}
    <div class="ag-actions">
      <button class="ag-act main" onclick="document.getElementById('mbFiles').click()"><span>${agIcon('plus')}</span>Images</button>
      <button class="ag-act" onclick="mbPasteLink(${b.id})"><span>${agIcon('link')}</span>Lien</button>
      <button class="ag-act" onclick="MB.selMode=!MB.selMode;MB.sel.clear();mbRenderBoard()"><span>${agIcon('check')}</span>${MB.selMode ? 'Terminer' : 'Choisir'}</button>
      <button class="ag-act" onclick="mbNewBoard({id:${b.id}})"><span>${agIcon('edit')}</span>Modifier</button>
    </div>
    <button class="btn-secondary mb-sharebtn" onclick="mbShare(${b.id})">${agIcon('chat', 16)} ${b.share_on ? 'Lien client actif : renvoyer ou gérer' : 'Envoyer au client pour qu\'il choisisse'}</button>
    ${mbFbHtml(b.id)}
    ${mbSourceHtml(b)}
    <input type="file" id="mbFiles" accept="image/*" multiple style="display:none" onchange="mbUpload(${b.id}, this.files)">
    <div class="ot-dropzone" onclick="document.getElementById('mbFiles').click()">${agIcon('download', 20)}<div><b>Glisse tes images ici</b><span>ou touche pour les choisir</span></div></div>
    <div id="mbUp"></div>
    ${MB.selMode ? `<div class="mb-selbar"><span>${MB.sel.size} choisie${MB.sel.size > 1 ? 's' : ''}</span>
      <button onclick="mbSelAll()">Tout</button>
      <button ${MB.sel.size ? '' : 'disabled'} onclick="mbCollage()">Collage client</button>
      <button ${MB.sel.size ? '' : 'disabled'} onclick="mbAnalyse()">Analyse IA</button>
      <button ${MB.sel.size ? '' : 'disabled'} onclick="mbMoveSel()">Déplacer</button>
      <button class="danger" ${MB.sel.size ? '' : 'disabled'} onclick="mbDeleteSel()">Supprimer</button></div>` : ''}
    ${mbImgs(b.id).length ? `<div class="ag-pills mb-filters"><button class="${MB.filter === 'all' ? 'on' : ''}" onclick="MB.filter='all';mbRenderBoard()">Toutes</button><button class="${MB.filter === 'best' ? 'on' : ''}" onclick="MB.filter='best';mbRenderBoard()">★ Meilleures</button>${mbImgs(b.id).some(x => x.client_pick) ? `<button class="${MB.filter === 'client' ? 'on' : ''}" onclick="MB.filter='client';mbRenderBoard()">Choix du client</button>` : ''}${mbImgs(b.id).some(x => x.from_client) ? `<button class="${MB.filter === 'propose' ? 'on' : ''}" onclick="MB.filter='propose';mbRenderBoard()">Propositions du client</button>` : ''}${allTags.map(t => `<button class="${MB.filter === t ? 'on' : ''}" onclick="MB.filter=${agEsc(JSON.stringify(t))};mbRenderBoard()">${agEsc(t)}</button>`).join('')}</div>` : ''}
    ${im.length ? `<div class="mb-grid">${im.map(x => mbTile(x, true)).join('')}</div>`
      : `<div class="ag-list"><div class="ag-empty">${mbImgs(b.id).length ? 'Aucune image avec ce filtre.' : 'Ajoute des images depuis ta galerie (captures Pinterest) ou colle un lien Pinterest.'}</div></div>`}

    <div class="ag-sec"><h3>Plan de séance</h3>${sl.length ? `<span class="crm-count">${done}/${sl.length}</span>` : ''}</div>
    <div class="ag-list">
      ${sl.length ? sl.map((x, i) => `<label class="mb-shot ${x.done ? 'done' : ''}"><input type="checkbox" ${x.done ? 'checked' : ''} onchange="mbShotToggle(${i})"><div><b>${agEsc(x.t)}</b>${x.d ? `<span>${agEsc(x.d)}</span>` : ''}</div><button class="ag-ibtn" onclick="event.preventDefault();mbShotDel(${i})">${agIcon('trash', 14)}</button></label>`).join('') : '<div class="ag-empty">Le plan de séance est la liste des photos à faire le jour J. L\'IA peut le préparer à partir de tes images.</div>'}
      <div class="crm-row-in" style="padding:10px 0"><input id="mbShotNew" placeholder="Ajouter une photo à faire"><button class="btn-secondary" onclick="mbShotAdd()">Ajouter</button></div>
    </div>
    <button class="btn-primary" style="width:100%;margin-top:10px" ${MB.busy ? 'disabled' : ''} onclick="mbPlan()">${MB.busy === 'plan' ? "L'IA prépare le plan..." : (sl.length ? 'Refaire le plan avec l\'IA' : 'Préparer le plan avec l\'IA')}</button>

    <div class="ag-sec"><h3>Demander à l'IA</h3></div>
    <div class="ag-list" style="padding:12px 16px">
      ${(ai.chat || []).slice(-6).map(m => `<div class="mb-qa"><b>${agEsc(m.q)}</b>${crmMd(m.a)}</div>`).join('')}
      <div class="crm-row-in"><input id="mbAsk" placeholder="Ex : comment refaire cette lumière en studio ?"><button class="btn-secondary" ${MB.busy ? 'disabled' : ''} onclick="mbAsk()">${MB.busy === 'ask' ? '...' : 'Demander'}</button></div>
      <div class="ag-hint">L'IA regarde tes images (les meilleures, ou celles que tu as choisies) pour répondre.</div>
    </div>

    <div class="ag-sec"><h3>Idées de posts</h3></div>
    <div class="ag-pills mb-nets">${MB_NETS.map(n => `<button class="${(MB.nets || MB_NETS).includes(n) ? 'on' : ''}" onclick="mbNet('${n}')">${n}</button>`).join('')}</div>
    <button class="btn-primary" style="width:100%;margin-top:8px" ${MB.busy ? 'disabled' : ''} onclick="mbPosts()">${MB.busy === 'posts' ? 'Écriture...' : (ai.posts ? 'Autres idées de posts' : 'Trouver des idées de posts')}</button>
    <div id="mbPosts">${mbPostsHtml(ai.posts)}</div>`;
}
function mbToggleSel(id){ MB.sel.has(id) ? MB.sel.delete(id) : MB.sel.add(id); mbRenderBoard(); }
function mbSelAll(){ const im = mbImgs(MB.cur); if(MB.sel.size === im.length) MB.sel.clear(); else im.forEach(x => MB.sel.add(x.id)); mbRenderBoard(); }
function mbNet(n){ const s = new Set(MB.nets || MB_NETS); s.has(n) ? s.delete(n) : s.add(n); MB.nets = [...s]; mbRenderBoard(); }

// ---------- Ajout d'images ----------
function mbCompress(blob, max){
  max = max || 1600;
  return new Promise((ok, ko) => {
    const url = URL.createObjectURL(blob), img = new Image();
    img.onload = () => {
      const r = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => b ? ok(b) : ko(new Error('Image illisible')), 'image/jpeg', 0.84);
    };
    img.onerror = () => { URL.revokeObjectURL(url); ko(new Error('Image illisible')); };
    img.src = url;
  });
}
async function mbSaveImage(boardId, blob, source){
  const uid = await otUid();
  const small = await mbCompress(blob);
  const path = `${uid}/${boardId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error: e1 } = await sb.storage.from('moodboard').upload(path, small, { contentType: 'image/jpeg', upsert: false });
  if(e1) throw new Error(e1.message);
  const url = sb.storage.from('moodboard').getPublicUrl(path).data.publicUrl;
  const { data, error } = await sb.from('mood_images').insert({ user_id: uid, board_id: boardId, url, path, source_url: source || null, position: mbImgs(boardId).length }).select().single();
  if(error) throw new Error(error.message);
  MB.imgs.push(data);
  return data;
}
async function mbUpload(boardId, files){
  files = [...(files || [])]; if(!files.length) return;
  const box = document.getElementById('mbUp');
  let ok = 0;
  for(let i = 0; i < files.length; i++){
    if(box) box.innerHTML = `<div class="ag-hint">Ajout ${i + 1}/${files.length}...</div>`;
    try { await mbSaveImage(boardId, files[i]); ok++; } catch(e){ console.warn(e); }
  }
  if(box) box.innerHTML = '';
  agToast(`${ok} image${ok > 1 ? 's' : ''} ajoutée${ok > 1 ? 's' : ''}`);
  mbRenderBoard();
}
function mbPasteLink(boardId, link){
  const opts = MB.boards.map(b => `<option value="${b.id}" ${b.id === (boardId || MB.cur) ? 'selected' : ''}>${agEsc(b.title || 'Sans titre')}</option>`).join('');
  agSheet('mbLink', `
    <h3>Ajouter depuis Pinterest</h3>
    <label>Lien de l'épingle</label><input id="mbLinkUrl" value="${agEsc(link || '')}" placeholder="https://pin.it/... ou https://pinterest.com/pin/...">
    <label>Dans quel tableau</label>
    <select id="mbLinkBoard">${opts}<option value="new">+ Nouveau tableau</option></select>
    <div class="ag-hint">Dans Pinterest : ouvre l'image, touche Partager puis Copier le lien. Si l'image ne vient pas, fais une capture d'écran et ajoute-la avec le bouton Images.</div>
    <button class="btn-primary" id="mbLinkGo" onclick="mbLinkGo()">Ajouter l'image</button>
    <div class="crm-err" id="mbLinkErr"></div>`);
  if(!link){ try { navigator.clipboard.readText().then(t => { if(/pin\.it|pinterest\.|pinimg/i.test(t || '')){ const i = document.getElementById('mbLinkUrl'); if(i && !i.value) i.value = t.trim(); } }).catch(() => {}); } catch(e){} }
}
async function mbLinkGo(){
  const url = document.getElementById('mbLinkUrl').value.trim();
  const sel = document.getElementById('mbLinkBoard').value;
  if(!url){ document.getElementById('mbLinkErr').textContent = 'Colle un lien'; return; }
  if(sel === 'new' || !sel){ MB.pendingLink = url; agCloseSheet('mbLink'); return mbNewBoard(); }
  agCloseSheet('mbLink');
  await mbImportLink(Number(sel), url);
}
async function mbImportLink(boardId, link){
  const m = String(link).match(/https?:\/\/\S+/); const url = m ? m[0] : link;
  agToast("Récupération de l'image...");
  try {
    const { data: s } = await sb.auth.getSession();
    const r = await fetch(`${SUPABASE_URL}/functions/v1/pin-image`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + (s && s.session ? s.session.access_token : SUPABASE_KEY) },
      body: JSON.stringify({ url }) });
    if(!r.ok){ let j = {}; try { j = await r.json(); } catch(e){} throw new Error(j.error || "Impossible de récupérer l'image"); }
    const blob = await r.blob();
    await mbSaveImage(boardId, blob, url);
    MB.cur = boardId; agToast('Image ajoutée'); mbRender();
  } catch(e){
    alert((e.message || 'Erreur') + "\n\nAstuce : fais une capture d'écran de l'image et ajoute-la avec le bouton Images.");
    MB.cur = boardId; mbRender();
  }
}

// ---------- Une image ----------
function mbView(id){
  const x = MB.imgs.find(i => i.id === id); if(!x) return;
  const b = mbBoard(x.board_id);
  agSheet('mbView', `
    <img class="mb-big" src="${agEsc(x.url)}" alt="">
    <div class="mb-view-h">${mbStars(x.rating || 0, x.id, 26)}${x.source_url ? `<a class="crm-link" href="${agEsc(x.source_url)}" target="_blank" rel="noopener">Voir sur Pinterest</a>` : ''}</div>
    ${x.from_client || x.client_pick ? `<div class="mb-clientbox">${x.from_client ? `<b>Proposée par ${agEsc(x.client_name || 'le client')}</b>` : '<b>Choisie par le client</b>'}${x.client_note ? `<p>« ${agEsc(x.client_note)} »</p>` : ''}${x.ref_image_id && MB.imgs.find(i => i.id === x.ref_image_id) ? `<span class="mb-ref">En réponse à <img src="${agEsc(MB.imgs.find(i => i.id === x.ref_image_id).url)}" alt="" onclick="mbView(${x.ref_image_id})"></span>` : ''}</div>` : ''}
    <label>Étiquettes</label>
    <div class="ag-pills">${MB_TAGS.map(t => `<button class="${(x.tags || []).includes(t) ? 'on' : ''}" onclick="mbTag(${x.id},${agEsc(JSON.stringify(t))})">${agEsc(t)}</button>`).join('')}</div>
    <label>Ma note</label><textarea id="mbNote" rows="2" placeholder="Ex : refaire cette pose avec la maman, fond beige" onchange="mbSaveNote(${x.id}, this.value)">${agEsc(x.note || '')}</textarea>
    <label>Demander à l'IA sur cette image</label>
    <div class="crm-row-in"><input id="mbAskOne" placeholder="Ex : quel éclairage, quel objectif ?"><button class="btn-secondary" onclick="mbAskOne(${x.id})">Demander</button></div>
    <div id="mbAskOneR" class="crm-ana"></div>
    <div class="crm-2" style="margin-top:14px"><button class="btn-secondary" onclick="mbMoveOne(${x.id})">Déplacer</button><button class="btn-danger" style="padding:12px" onclick="mbDeleteImgs([${x.id}])">Supprimer</button></div>
    ${b ? `<div class="ag-hint" style="text-align:center">Tableau : ${agEsc(b.title || '')}</div>` : ''}`);
}
async function mbUpdateImg(id, patch){
  const x = MB.imgs.find(i => i.id === id); if(!x) return;
  Object.assign(x, patch);
  const { error } = await sb.from('mood_images').update(patch).eq('id', id);
  if(error) agToast('Erreur : ' + error.message);
}
async function mbRate(id, n){ await mbUpdateImg(id, { rating: n }); if(document.getElementById('mbView')) mbView(id); if(MB.cur) mbRenderBoard(); }
async function mbTag(id, t){ const x = MB.imgs.find(i => i.id === id); const s = new Set(x.tags || []); s.has(t) ? s.delete(t) : s.add(t); await mbUpdateImg(id, { tags: [...s] }); mbView(id); if(MB.cur) mbRenderBoard(); }
async function mbSaveNote(id, v){ await mbUpdateImg(id, { note: v.trim() || null }); }
async function mbDeleteImgs(ids){
  if(!await agConfirm(`Supprimer ${ids.length} image(s) ?`)) return;
  const list = MB.imgs.filter(x => ids.includes(x.id));
  const own = list.filter(x => !x.from_client), cli = list.filter(x => x.from_client);
  const paths = own.map(x => x.path).filter(Boolean);
  if(paths.length) await sb.storage.from('moodboard').remove(paths);
  for(const x of own) await sb.from('mood_images').delete().eq('id', x.id);
  if(cli.length) await mbCleanClient(cli.map(x => x.id));
  MB.imgs = MB.imgs.filter(x => !ids.includes(x.id)); ids.forEach(i => MB.sel.delete(i));
  agCloseSheet('mbView'); mbRender();
}
async function mbCleanClient(ids){
  try {
    const { data: ss } = await sb.auth.getSession();
    await fetch(`${SUPABASE_URL}/functions/v1/mood-clean`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + (ss && ss.session ? ss.session.access_token : '') },
      body: JSON.stringify({ ids }) });
  } catch(e){ console.warn(e); }
}
function mbDeleteSel(){ mbDeleteImgs([...MB.sel]); }
function mbMoveOne(id){ MB.moveIds = [id]; mbMovePick(); }
function mbMoveSel(){ MB.moveIds = [...MB.sel]; mbMovePick(); }
function mbMovePick(){
  agSheet('mbMove', `<h3>Déplacer vers</h3><select id="mbMoveTo">${MB.boards.map(b => `<option value="${b.id}">${agEsc(b.title || 'Sans titre')}</option>`).join('')}</select>
    <button class="btn-primary" onclick="mbMoveGo()">Déplacer</button>`);
}
async function mbMoveGo(){
  const to = Number(document.getElementById('mbMoveTo').value);
  for(const id of MB.moveIds || []) await mbUpdateImg(id, { board_id: to });
  MB.sel.clear(); agCloseSheet('mbMove'); agCloseSheet('mbView'); mbRender(); agToast('Déplacé');
}

// ---------- Plan de seance ----------
async function mbSaveBoardPatch(id, patch){
  const b = mbBoard(id); Object.assign(b, patch);
  const { error } = await sb.from('mood_boards').update(patch).eq('id', id);
  if(error) agToast('Erreur : ' + error.message);
}
function mbShotToggle(i){ const b = mbBoard(MB.cur), l = (b.shot_list || []).slice(); l[i] = { ...l[i], done: !l[i].done }; mbSaveBoardPatch(b.id, { shot_list: l }); mbRenderBoard(); }
function mbShotDel(i){ const b = mbBoard(MB.cur), l = (b.shot_list || []).slice(); l.splice(i, 1); mbSaveBoardPatch(b.id, { shot_list: l }); mbRenderBoard(); }
function mbShotAdd(){ const v = document.getElementById('mbShotNew').value.trim(); if(!v) return; const b = mbBoard(MB.cur); mbSaveBoardPatch(b.id, { shot_list: [...(b.shot_list || []), { t: v, done: false }] }); mbRenderBoard(); }

// ============================================================
// IA AVEC IMAGES
// ============================================================
async function mbImgB64(url){
  const r = await fetch(url); const blob = await r.blob();
  const small = await mbCompress(blob, 768);
  return await new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(',')[1]); fr.readAsDataURL(small); });
}
async function mbAI(prompt, urls){
  // Relais automatique entre les IA (ia.js) : les photos vont seulement aux IA qui les voient
  if(typeof window.iaRelais === 'function'){
    const imgs = [];
    for(const u of (urls || []).slice(0, 6)){ try { imgs.push({ mime: 'image/jpeg', data: await mbImgB64(u) }); } catch(e){} }
    const r = await window.iaRelais({ messages: [{ role: 'user', text: prompt }], images: imgs, maxTokens: 2000, tache: imgs.length ? 'images' : (/\bJSON\b/.test(prompt) ? 'json' : 'texte') });
    return r.text;
  }
  let cfg = null; try { cfg = JSON.parse(localStorage.getItem('aiConfig')); } catch(e){}
  if(!cfg || !cfg.key) throw new Error("Configure ta clé IA dans l'onglet Coach");
  const imgs = [];
  for(const u of (urls || []).slice(0, 6)){ try { imgs.push(await mbImgB64(u)); } catch(e){} }
  if(cfg.provider === 'anthropic'){
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': cfg.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: AI_MODELS.anthropic, max_tokens: 2000, messages: [{ role: 'user', content: [...imgs.map(d => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: d } })), { type: 'text', text: prompt }] }] }) });
    const j = await r.json(); if(j.error) throw new Error(j.error.message); return j.content?.[0]?.text || '';
  }
  if(cfg.provider === 'gemini'){
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${AI_MODELS.gemini}:generateContent?key=${cfg.key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [...imgs.map(d => ({ inline_data: { mime_type: 'image/jpeg', data: d } })), { text: prompt }] }] }) });
    const j = await r.json(); if(j.error) throw new Error(j.error.message); return j.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
  }
  const url = cfg.provider === 'custom' && cfg.url ? cfg.url : 'https://api.openai.com/v1/chat/completions';
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.key}` },
    body: JSON.stringify({ model: AI_MODELS.openai, messages: [{ role: 'user', content: [...imgs.map(d => ({ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + d } })), { type: 'text', text: prompt }] }] }) });
  const j = await r.json(); if(j.error) throw new Error(j.error.message); return j.choices?.[0]?.message?.content || '';
}
function mbPickUrls(b){
  let im = mbImgs(b.id);
  if(MB.sel.size) im = im.filter(x => MB.sel.has(x.id));
  else im = im.slice().sort((a, c) => (c.rating || 0) - (a.rating || 0));
  return im.slice(0, 6);
}
function mbContext(b, picked){
  const s = b.shoot_id ? (shoots || []).find(x => x.id === b.shoot_id) : null;
  const c = s && s.client_id ? (clients || []).find(x => x.id === s.client_id) : null;
  return `Tu es le directeur artistique de Henzo Studio, studio photo et vidéo à Bouaké (Côte d'Ivoire). Studio intérieur avec fonds, flashs, et sorties en extérieur possibles.
Tableau : "${b.title || ''}"${b.shoot_type ? ', type de séance : ' + b.shoot_type : ''}.${b.notes ? ' Idée générale : ' + b.notes + '.' : ''}
${s ? `Séance prévue le ${crmDate(s.date)}${c ? ' pour ' + c.name : ''}${s.location ? ' à ' + s.location : ''}${s.notes ? ', notes : ' + s.notes : ''}.` : ''}
Les ${picked.length} images jointes sont l'inspiration choisie par Henzo${picked.some(x => x.note) ? '. Ses notes : ' + picked.map((x, i) => x.note ? `image ${i + 1} : ${x.note}` : '').filter(Boolean).join(' ; ') : ''}.
Réponds en français simple, sans jargon, sans tirets longs, concret et réalisable avec un petit budget.`;
}
async function mbPlan(){
  const b = mbBoard(MB.cur), picked = mbPickUrls(b);
  if(!picked.length){ alert("Ajoute d'abord des images"); return; }
  MB.busy = 'plan'; mbRenderBoard();
  try {
    const r = await mbAI(mbContext(b, picked) + `\n\nRegarde les images et prépare le plan de séance : 8 à 12 photos à faire, dans l'ordre de la séance. Pour chaque photo : un titre court et une ligne de détail (pose, cadrage, lumière, accessoire). Réponds uniquement en JSON : {"plan":[{"t":"...","d":"..."}],"materiel":"liste courte du matériel et accessoires à prévoir"}`, picked.map(x => x.url));
    const j = crmJson(r);
    const plan = (j.plan || []).filter(x => x && x.t).map(x => ({ t: x.t, d: x.d || '', done: false }));
    if(j.materiel) plan.push({ t: 'À prévoir', d: j.materiel, done: false });
    await mbSaveBoardPatch(b.id, { shot_list: plan });
  } catch(e){ alert(e.message); }
  MB.busy = ''; mbRenderBoard();
}
async function mbAsk(){
  const q = (document.getElementById('mbAsk') || {}).value || ''; if(!q.trim()) return;
  const b = mbBoard(MB.cur), picked = mbPickUrls(b);
  MB.busy = 'ask'; mbRenderBoard();
  try {
    const a = await mbAI(mbContext(b, picked) + `\n\nQuestion de Henzo : ${q}\nRéponds court et concret.`, picked.map(x => x.url));
    const ai = Object.assign({}, b.ai || {}); ai.chat = [...(ai.chat || []), { q, a, d: new Date().toISOString() }].slice(-20);
    await mbSaveBoardPatch(b.id, { ai });
  } catch(e){ alert(e.message); }
  MB.busy = ''; mbRenderBoard();
}
async function mbAskOne(id){
  const x = MB.imgs.find(i => i.id === id), b = mbBoard(x.board_id);
  const q = document.getElementById('mbAskOne').value.trim() || "Explique comment refaire cette photo dans mon studio : lumière, pose, cadrage, réglages.";
  const box = document.getElementById('mbAskOneR'); box.innerHTML = '<div class="ag-empty">Analyse...</div>';
  try { const a = await mbAI(mbContext(b, [x]) + `\n\nQuestion sur cette image : ${q}`, [x.url]); box.innerHTML = crmMd(a); }
  catch(e){ box.innerHTML = `<div class="ag-empty">${agEsc(e.message)}</div>`; }
}
async function mbAnalyse(){
  const b = mbBoard(MB.cur), picked = mbPickUrls(b);
  agSheet('mbAna', `<h3>Analyse de ${picked.length} image${picked.length > 1 ? 's' : ''}</h3><div id="mbAnaR" class="crm-ana"><div class="ag-empty">L'IA regarde tes images...</div></div>`);
  try {
    const a = await mbAI(mbContext(b, picked) + `\n\nAnalyse ces images ensemble :
# Ce qui les rend belles (lumière, poses, couleurs, ambiance)
# Comment le refaire chez moi (réglages, placement des flashs ou de la fenêtre, objectif)
# Ce qu'il faut demander au client (tenue, couleurs, accessoires)
# Ma touche pour me démarquer`, picked.map(x => x.url));
    const r = document.getElementById('mbAnaR'); if(r) r.innerHTML = crmMd(a) + `<button class="btn-secondary" style="margin-top:10px" onclick="crmCopy(${agEsc(JSON.stringify(a))})">Copier</button>`;
  } catch(e){ const r = document.getElementById('mbAnaR'); if(r) r.innerHTML = `<div class="ag-empty">${agEsc(e.message)}</div>`; }
}

// ---------- Idees de posts ----------
function mbPostsHtml(posts){
  if(!posts || !posts.length) return '';
  return posts.map((p, i) => `<div class="crm-prop mb-post">
    <div class="crm-prop-h"><span class="crm-tag">${agEsc(p.reseau || '')}</span> <b>${agEsc(p.format || '')}</b></div>
    <p class="mb-idea">${agEsc(p.idee || '')}</p>
    ${p.texte ? `<textarea rows="4">${agEsc(p.texte)}</textarea>` : ''}
    ${p.hashtags ? `<p class="mb-hash">${agEsc(p.hashtags)}</p>` : ''}
    <div class="crm-prop-b"><button class="btn-secondary" onclick="mbCopyPost(${i})">Copier le texte</button></div>
  </div>`).join('');
}
function mbCopyPost(i){ const p = (mbBoard(MB.cur).ai || {}).posts[i]; crmCopy([p.texte, p.hashtags].filter(Boolean).join('\n\n')); }
async function mbPosts(){
  const b = mbBoard(MB.cur), picked = mbPickUrls(b), nets = MB.nets || MB_NETS;
  MB.busy = 'posts'; mbRenderBoard();
  try {
    const r = await mbAI(mbContext(b, picked) + `\n\nPropose des idées de publications pour faire connaître ce type de séance et attirer des clients à Bouaké, sur : ${nets.join(', ')}. Une ou deux idées par réseau, adaptées au format du réseau (carrousel, Reel, vidéo TikTok avec idée de son ou tendance, post Facebook, statut WhatsApp court, mise en page portfolio). Pour chaque idée : le texte prêt à publier (accroche forte, appel à réserver), et des hashtags locaux et du métier. Réponds uniquement en JSON : {"posts":[{"reseau":"Instagram","format":"Carrousel","idee":"ce qu'on montre","texte":"...","hashtags":"#..."}]}`, picked.map(x => x.url));
    const j = crmJson(r);
    const ai = Object.assign({}, b.ai || {}); ai.posts = (j.posts || []).filter(p => p && (p.texte || p.idee));
    await mbSaveBoardPatch(b.id, { ai });
  } catch(e){ alert(e.message); }
  MB.busy = ''; mbRenderBoard();
}

// ---------- Collage pour le client ----------
async function mbCollage(){
  const b = mbBoard(MB.cur);
  const im = mbImgs(b.id).filter(x => MB.sel.has(x.id)).slice(0, 9);
  if(!im.length) return;
  agToast('Création du collage...');
  const W = 1080, H = 1350, pad = 16, foot = 110;
  const n = im.length, cols = n <= 1 ? 1 : n <= 4 ? 2 : 3, rows = Math.ceil(n / cols);
  const cw = (W - pad * (cols + 1)) / cols, ch = (H - foot - pad * (rows + 1)) / rows;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#0b1513'; g.fillRect(0, 0, W, H);
  const load = u => new Promise((ok, ko) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = ko; i.src = u + (u.includes('?') ? '&' : '?') + 'c=1'; });
  for(let k = 0; k < n; k++){
    try {
      const img = await load(im[k].url);
      const x = pad + (k % cols) * (cw + pad), y = pad + Math.floor(k / cols) * (ch + pad);
      const r = Math.max(cw / img.width, ch / img.height), sw = cw / r, sh = ch / r;
      g.save(); g.beginPath(); if(g.roundRect) g.roundRect(x, y, cw, ch, 18); else g.rect(x, y, cw, ch); g.clip();
      g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, cw, ch); g.restore();
    } catch(e){}
  }
  g.fillStyle = '#ffffff'; g.font = '700 40px Inter, sans-serif'; g.textBaseline = 'middle';
  g.fillText((b.title || 'Moodboard').slice(0, 38), pad + 8, H - foot / 2 - 14);
  g.fillStyle = '#9cbdb8'; g.font = '500 26px Inter, sans-serif';
  g.fillText('Henzo Studio · Bouaké · idées pour votre séance', pad + 8, H - foot / 2 + 26);
  c.toBlob(async blob => {
    const file = new File([blob], 'moodboard-henzo.jpg', { type: 'image/jpeg' });
    agSheet('mbCol', `<h3>Collage pour le client</h3><img class="mb-big" src="${URL.createObjectURL(blob)}" alt="">
      <div class="crm-2" style="margin-top:12px"><button class="btn-primary" onclick="mbShareCollage()">Partager</button><button class="btn-secondary" onclick="mbDlCollage()">Télécharger</button></div>
      <div class="ag-hint">Partager ouvre WhatsApp (ou une autre app) avec l'image. Sinon, télécharge-la et envoie-la depuis ta galerie.</div>`);
    MB.collage = file;
  }, 'image/jpeg', 0.9);
}
async function mbShareCollage(){
  const f = MB.collage; if(!f) return;
  if(navigator.canShare && navigator.canShare({ files: [f] })){ try { await navigator.share({ files: [f], title: 'Moodboard Henzo Studio', text: 'Voici les idées pour votre séance' }); return; } catch(e){ if(e.name === 'AbortError') return; } }
  mbDlCollage();
}
function mbDlCollage(){ const f = MB.collage; if(!f) return; const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); }

// ---------- Partager au client ----------
function mbShareLink(b){ return `${location.origin}/mood.html?t=${encodeURIComponent(b.share_token)}`; }
async function mbShare(id){
  const b = mbBoard(id);
  if(!b.share_token || !b.share_on){
    const tok = Array.from(crypto.getRandomValues(new Uint8Array(12))).map(x => x.toString(36).padStart(2, '0')).join('').slice(0, 18);
    await mbSaveBoardPatch(id, { share_token: b.share_token || tok, share_on: true });
  }
  const s = b.shoot_id ? (shoots || []).find(x => x.id === b.shoot_id) : null;
  const c = b.client_id ? (clients || []).find(x => x.id === b.client_id) : (s && s.client_id ? (clients || []).find(x => x.id === s.client_id) : null);
  const link = mbShareLink(b);
  const msg = `Bonjour${c ? ' ' + crmFirst(c) : ''}, c'est Henzo Studio. Voici des idées pour votre séance${b.shoot_type ? ' (' + b.shoot_type + ')' : ''}.\nChoisissez les photos qui vous plaisent, ajoutez vos propres idées (photos de tenues, poses, décors...), puis envoyez :\n${link}\n\nÀ très vite !`;
  MB.shareMsg = msg;
  agSheet('mbShare', `
    <h3>Envoyer au client</h3>
    <div class="ag-hint" style="margin-top:0">Le client ouvre le lien, voit les images (sans tes notes privées), choisit celles qu'il aime, ajoute ses propres photos et idées, puis t'envoie tout. Tu les retrouves ici, marquées "Client" et "Proposée".</div>
    <div class="ag-list ag-share" style="margin-top:10px"><div class="ag-share-row"><div style="min-width:0"><span>Lien du moodboard</span><b class="ag-link">${agEsc(link)}</b></div>
      <button class="ag-ibtn" title="Copier" onclick="crmCopy('${agEsc(link)}')">${agIcon('link', 17)}</button></div></div>
    <label>Message</label><textarea id="mbShareMsg" rows="5" oninput="MB.shareMsg=this.value">${agEsc(msg)}</textarea>
    <button class="btn-primary" style="margin-top:10px" onclick="crmWaRaw('${agEsc(c ? crmPhone(c.phone) : '')}', MB.shareMsg)">${agIcon('chat', 16)} Envoyer sur WhatsApp${c ? ' à ' + agEsc(c.name.split(' ')[0]) : ''}</button>
    <div class="crm-2" style="margin-top:8px"><button class="btn-secondary" onclick="window.open('${agEsc(link)}','_blank')">Voir comme le client</button><button class="btn-danger" style="padding:12px" onclick="mbShareOff(${id})">Désactiver le lien</button></div>`);
  mbRenderBoard();
}
async function mbShareOff(id){ await mbSaveBoardPatch(id, { share_on: false }); agCloseSheet('mbShare'); mbRenderBoard(); agToast('Lien désactivé'); }
function mbActHtml(id){
  const ev = MB.ev.filter(e => e.board_id === id), ouv = ev.filter(e => e.type === 'ouverture');
  if(!ev.length) return '';
  const dt = d => new Date(d).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return `<div class="mb-act">${agIcon('eye', 15)}<span>Lien ouvert <b>${ouv.length} fois</b>${ouv[0] ? ` · dernière fois ${dt(ouv[0].created_at)}${ouv[0].appareil ? ' (' + agEsc(ouv[0].appareil === 'Ordinateur' ? 'ordinateur' : ouv[0].appareil) + ')' : ''}` : ''}${ev.filter(e => e.type === 'envoi').length ? ` · ${ev.filter(e => e.type === 'envoi').length} envoi(s)` : ''}</span></div>`;
}
function mbFbHtml(id){
  const fb = MB.fb.filter(f => f.board_id === id);
  if(!fb.length) return mbActHtml(id);
  const last = fb[0], added = mbImgs(id).filter(x => x.from_client).length;
  return mbActHtml(id) + `<div class="mb-fb ${last.lu ? '' : 'new'}" onclick="mbFbOpen(${id})"><div class="ic">${agIcon('heart', 18)}</div>
    <div class="d"><b>${agEsc(last.nom || 'Le client')} a choisi ${(last.picks || []).length} photo${(last.picks || []).length > 1 ? 's' : ''}${added ? ` et proposé ${added} image${added > 1 ? 's' : ''}` : ''}</b><span>${new Date(last.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}${last.message ? ' · « ' + agEsc(last.message.slice(0, 60)) + ' »' : ''}</span></div>${agIcon('chev', 16)}</div>`;
}
// Reponse du client a "Comment avez-vous connu Henzo Studio ?"
function mbBoardClient(b){
  const s = b && b.shoot_id ? (shoots || []).find(x => x.id === b.shoot_id) : null;
  const cid = (b && b.client_id) || (s && s.client_id);
  return cid ? (clients || []).find(c => c.id === Number(cid)) : null;
}
function mbSourceHtml(b){
  if(!b || !b.client_source) return '';
  const c = mbBoardClient(b), lbl = typeof crmSrcLabel === 'function' ? crmSrcLabel(b.client_source) : b.client_source;
  return `<div class="mb-act">${agIcon('users', 15)}<span>Le client a connu Henzo Studio par : <b>${agEsc(lbl)}</b>${c && c.source ? ' · déjà dans sa fiche' : ''}</span></div>
    ${c && !c.source ? `<button class="crm-link" onclick="mbSourceCopy(${b.id})">Recopier dans la fiche de ${agEsc(c.name)}</button>` : ''}`;
}
async function mbSourceCopy(id){
  const b = mbBoard(id), c = mbBoardClient(b); if(!b || !c || c.source) return;
  const r = await dbUpdate('clients', c.id, { source: b.client_source });
  if(!r) return;
  Object.assign(c, r); agToast('Ajouté dans la fiche de ' + c.name); mbRenderBoard();
}
async function mbFbOpen(id){
  const fb = MB.fb.filter(f => f.board_id === id);
  agSheet('mbFb', `<h3>Réponses du client</h3>${fb.map(f => `<div class="crm-line col"><span><b>${agEsc(f.nom || 'Client')}</b> · ${new Date(f.created_at).toLocaleString('fr-FR')} · ${(f.picks || []).length} photo(s)</span>
    ${f.message ? `<p>${agEsc(f.message)}</p>` : ''}
    <div class="mb-fb-imgs">${(f.picks || []).map(p => { const x = MB.imgs.find(i => i.id === Number(p.id)); return x ? `<div><img src="${agEsc(x.url)}" alt="">${p.note ? `<span>${agEsc(p.note)}</span>` : ''}</div>` : ''; }).join('')}</div></div>`).join('')}
    ${mbImgs(id).some(x => x.from_client) ? `<h4 class="crm-h4">Images proposées par le client</h4><div class="mb-fb-imgs">${mbImgs(id).filter(x => x.from_client).map(x => {
      const ref = x.ref_image_id ? MB.imgs.find(i => i.id === x.ref_image_id) : null;
      return `<div><img src="${agEsc(x.url)}" alt="" onclick="mbView(${x.id})">${x.client_note ? `<span>${agEsc(x.client_note)}</span>` : ''}${ref ? `<span class="mb-ref">en réponse à <img src="${agEsc(ref.url)}" alt=""></span>` : ''}</div>`; }).join('')}</div>` : ''}
    <div class="crm-2" style="margin-top:12px"><button class="btn-primary" onclick="agCloseSheet('mbFb');MB.filter='client';mbRenderBoard()">Ses coups de cœur</button><button class="btn-secondary" onclick="agCloseSheet('mbFb');MB.filter='propose';mbRenderBoard()">Ses propositions</button></div>`);
  for(const f of fb.filter(x => !x.lu)){ f.lu = true; sb.from('mood_feedback').update({ lu: true }).eq('id', f.id); }
}

// ============================================================
// BRANCHEMENTS
// ============================================================
// Bouton "Moodboard" sur chaque seance
function mbFromShoot(shootId){
  const b = MB.boards.find(x => x.shoot_id === shootId);
  agGoTab('mood');
  if(b){ MB.cur = b.id; mbRender(); return; }
  const s = (shoots || []).find(x => x.id === shootId), c = s && (clients || []).find(x => x.id === s.client_id);
  setTimeout(() => mbNewBoard({ shoot_id: shootId, shoot_type: s ? s.type : '', title: (s ? s.type : 'Séance') + (c ? ' - ' + c.name.split(' ')[0] : '') }), 200);
}
(function mbShootButtons(){
  const add = () => document.querySelectorAll('.item-card .actions').forEach(a => {
    if(a.querySelector('.mb-shoot-btn')) return;
    const m = (a.innerHTML.match(/openShootModal\((\d+)\)/) || [])[1];
    if(!m) return;
    const b = document.createElement('button');
    b.className = 'btn-ghost ag-ibtn mb-shoot-btn'; b.title = 'Moodboard (idées)';
    b.innerHTML = agIcon('palette', 17);
    b.onclick = () => mbFromShoot(Number(m));
    a.insertBefore(b, a.querySelector('.ag-ibtn') || null);
  });
  new MutationObserver(() => add()).observe(document.body, { childList: true, subtree: true });
  add();
})();
// Partage depuis Pinterest (app installee) : /?share=1&url=...&text=...
function mbCheckShare(){
  const q = new URLSearchParams(location.search);
  if(!q.has('share') && !q.has('url') && !q.has('text')) return;
  const raw = [q.get('url'), q.get('text'), q.get('title')].filter(Boolean).join(' ');
  history.replaceState(null, '', location.pathname);
  const m = raw.match(/https?:\/\/\S+/);
  agGoTab('mood');
  setTimeout(() => mbPasteLink(MB.boards[0] ? MB.boards[0].id : null, m ? m[0] : ''), 400);
}
const _mbShowTab = showTab;
showTab = function(name, btn){ _mbShowTab(name, btn); if(name === 'mood') mbRender(); };
(async function mbInit(){
  await mbLoad();
  if(window.__mbDeep && mbBoard(window.__mbDeep)){ MB.cur = window.__mbDeep; window.__mbDeep = null; }
  const a = document.querySelector('.page.active');
  if(a && a.id === 'page-mood') mbRender();
  mbCheckShare();
})();
