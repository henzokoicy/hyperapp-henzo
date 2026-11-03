// ============================================================
// MUSIQUE-LIBRE.JS - Musiques et bruitages libres de droits, et
// contrôle des droits avant l'export (Créations)
// ------------------------------------------------------------
// - Bibliothèque en ligne (Openverse : Jamendo, Freesound, Wikimedia,
//   ccMixter...) : chaque son arrive avec sa licence, son auteur et le
//   crédit à mettre. Recherche par ambiance, écoute, puis "Utiliser".
//   (Passage par la fonction Supabase "son-libre" : pas de souci de
//   sécurité du navigateur, rien à installer.)
// - Pour chaque son, l'app dit clairement si c'est OK pour WhatsApp,
//   TikTok, Instagram, Facebook, YouTube et pour un client.
// - Musique importée du téléphone : l'app demande d'où elle vient
//   (chanson connue, son libre, ta musique) et prévient des risques.
// - Bruitages : whoosh, déclencheur photo, applaudissements... placés
//   au moment voulu (ou sur chaque transition), avec leur volume.
// - Avant l'export : "Contrôle des droits" selon l'endroit où tu
//   publies. Fini les sons coupés par surprise.
// Limite : TikTok, Facebook, Instagram, BandLab et Epidemic Sound ne
// permettent pas aux autres applications d'utiliser leurs musiques.
// Pour un son tendance, exporte sans musique et ajoute-le dans l'app.
// ============================================================
(function(){
'use strict';
if(typeof AN === 'undefined' || typeof anVueEdit !== 'function') return;
const E = s => crE(String(s == null ? '' : s));
const ML = { res: [], q: '', cat: 'music', usage: 'pro', busy: false, buf: {}, src: [], ctx: null, bibPour: 'musique', depuisBib: false, page: 1 };
window.ML = ML;

// ---------- Appel de la fonction en ligne ----------
async function mlFn(body, enBlob){
  let tok = SUPABASE_KEY; try { const { data: s } = await sb.auth.getSession(); if(s && s.session) tok = s.session.access_token; } catch(e){}
  const r = await fetch(`${SUPABASE_URL}/functions/v1/son-libre`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + tok }, body: JSON.stringify(body) });
  if(!r.ok){ let j = {}; try { j = await r.json(); } catch(e){} throw new Error(j.error || ('Erreur ' + r.status)); }
  return enBlob ? r.blob() : r.json();
}
window.mlFn = mlFn;

// ---------- Les droits, en clair ----------
const PLATS = [['whatsapp', 'WhatsApp'], ['tiktok', 'TikTok'], ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['youtube', 'YouTube'], ['client', 'Pour un client']];
const LIC = {
  cc0: 'CC0 : libre, sans aucune condition.', pdm: 'Domaine public : libre.',
  by: 'CC BY : libre, même pour ton travail, à condition de créditer l\'auteur.',
  'by-sa': 'CC BY-SA : libre avec crédit, mais ta vidéo devrait être partagée sous la même licence (à éviter pour un client).',
  'by-nc': 'CC BY-NC : seulement pour un usage non commercial. Pas pour une publicité, ta page pro ou un client.',
  'by-nc-sa': 'CC BY-NC-SA : non commercial et même licence. Pas pour ta page pro ni un client.',
  'by-nd': 'CC BY-ND : interdit de modifier. On ne peut pas la couper ni la mettre dans un montage.',
  'by-nc-nd': 'CC BY-NC-ND : ni modification, ni usage commercial. À éviter pour un montage.',
  'sampling+': 'Sampling+ : remix autorisé, mais pas pour une publicité.'
};
window.mlDroits = function(info){
  info = info || {};
  const o = {}, set = (v) => PLATS.forEach(([k]) => { o[k] = v; });
  let explication = '', credit = '';
  const lic = String(info.licence || '').toLowerCase();
  if(info.origine === 'moi'){ set('ok'); explication = 'Ta propre musique, ou une musique dont tu as la licence : tu peux l\'utiliser partout.'; }
  else if(info.origine === 'connue' || info.origine === 'inconnu'){
    Object.assign(o, { whatsapp: 'ok', tiktok: 'attention', instagram: 'non', facebook: 'non', youtube: 'non', client: 'non' });
    if(info.origine === 'inconnu') o.whatsapp = 'attention';
    explication = info.origine === 'connue' ? 'Chanson d\'un artiste (radio, YouTube, Boomplay...) : elle a des droits. OK pour un statut WhatsApp. Sur Facebook, Instagram et YouTube, le son peut être coupé ou la vidéo bloquée. Sur TikTok et Instagram, mieux vaut exporter sans musique et ajouter ce son directement dans leur application (leur bibliothèque officielle).' : 'Origine inconnue : traite-la comme une chanson protégée (risque de son coupé sur les réseaux).';
  } else if(lic){
    if(lic === 'cc0' || lic === 'pdm') set('ok');
    else if(lic === 'by') set('credit');
    else if(lic === 'by-sa'){ set('credit'); o.client = 'attention'; }
    else if(lic.indexOf('nd') >= 0) set('non');
    else if(lic.indexOf('nc') >= 0 || lic === 'sampling+'){ set('attention'); o.whatsapp = 'credit'; o.client = 'non'; }
    else set('attention');
    explication = LIC[lic] || ('Licence ' + lic.toUpperCase() + ' : vérifie ses conditions.');
    // Certains artistes Jamendo déclarent leurs titres à Content ID (Facebook, YouTube)
    if(/jamendo/i.test(info.source || '') && o.youtube !== 'non'){ o.youtube = 'attention'; o.facebook = o.facebook === 'non' ? 'non' : 'attention'; explication += ' Attention : certains titres Jamendo sont déclarés à Content ID. Sur Facebook ou YouTube, une réclamation peut arriver (tu peux la contester avec le lien de la licence).'; }
    if(lic !== 'cc0' && lic !== 'pdm') credit = `${info.titre || 'Musique'} - ${info.auteur || 'auteur inconnu'} (${lic === 'by' || lic.startsWith('by') ? 'CC ' + lic.toUpperCase() + (info.version ? ' ' + info.version : '') : lic})${info.page ? ' ' + info.page : ''}`;
  } else { set('attention'); explication = 'Origine non précisée.'; }
  const niveau = Object.values(o).includes('non') ? 'non' : Object.values(o).includes('attention') ? 'attention' : Object.values(o).includes('credit') ? 'credit' : 'ok';
  return { plats: o, explication, credit, niveau };
};
const BADGE = { ok: ['OK', 'ok'], credit: ['OK avec crédit', 'cr'], attention: ['Risque', 'at'], non: ['Non', 'no'] };
function mlBadges(d, seul){ return `<div class="ml-plats">${PLATS.filter(([k]) => !seul || k === seul).map(([k, l]) => `<span class="ml-b ${BADGE[d.plats[k]][1]}"><i>${l}</i>${BADGE[d.plats[k]][0]}</span>`).join('')}</div>`; }
function mlTousLesSons(){
  const V = anVid(), L = [];
  if(V.musique) L.push({ type: 'Musique', nom: (V.musInfo && V.musInfo.titre) || V.musique.nom, info: V.musInfo || { origine: 'inconnu' } });
  (V.sons || []).forEach(s => L.push({ type: 'Bruitage', nom: s.nom, info: Object.assign({ titre: s.nom }, s) }));
  return L;
}

// ---------- Le bloc Musique de l'éditeur ----------
function mlHtml(){
  const V = anVid(), sons = V.sons || [];
  let carte = '';
  if(V.musique){
    const info = V.musInfo || { origine: 'inconnu' }, d = mlDroits(info);
    carte = `<div class="ml-carte"><div class="ml-ct"><b>${E(info.titre || V.musique.nom)}</b><small>${info.auteur ? E(info.auteur) + ' · ' : ''}${info.licence ? 'Licence ' + E(String(info.licence).toUpperCase()) : info.origine === 'connue' ? 'Chanson protégée' : info.origine === 'moi' ? 'Ma musique / licence achetée' : 'Origine à préciser'}${info.source ? ' · ' + E(info.source) : ''}</small></div>
      ${mlBadges(d)}<div class="ag-hint" style="margin:6px 0 0">${E(d.explication)}</div>
      ${d.credit ? `<div class="ml-credit"><span>${E(d.credit)}</span><button type="button" onclick="mlCopier(this.previousElementSibling.textContent)">Copier le crédit</button></div>` : ''}
      <div class="mt-act">${!V.musInfo || V.musInfo.origine !== 'libre' ? `<button type="button" onclick="mlOrigine()">D'où vient cette musique ?</button>` : ''}${d.niveau === 'non' || d.niveau === 'attention' ? `<button type="button" class="on" onclick="mlSimilaire()">${agIcon('search', 13)} Trouver un son libre qui ressemble</button>` : ''}</div></div>`;
  }
  return `<div class="ml">
    <div class="mt-act" style="margin-top:0"><button type="button" class="on" onclick="mlBib('musique')">${agIcon('music', 14)} Musiques libres de droits</button><button type="button" onclick="mlBib('bruitage')">${agIcon('sparkles', 14)} Bruitages</button></div>
    ${carte}
    ${sons.length ? `<div class="ml-sec">Bruitages <i>${sons.length}</i></div>${sons.map((s, i) => `<div class="ml-son"><div class="ml-st"><b>${E(s.nom)}</b><small>à ${(s.t || 0).toFixed(1).replace('.', ',')} s${s.auteur ? ' · ' + E(s.auteur) : ''}${s.licence ? ' · ' + E(String(s.licence).toUpperCase()) : ''}${ML.buf[s.id] ? '' : ' · chargement...'}</small></div>
        <input type="range" min="0" max="1.5" step="0.05" value="${s.vol == null ? 1 : s.vol}" oninput="anVid().sons[${i}].vol=Number(this.value)" title="Volume">
        <div class="ml-sb"><button type="button" onclick="mlSonIci(${i})">Ici (${AN.t.toFixed(1).replace('.', ',')} s)</button><button type="button" onclick="mlSonEcouter(${i})">${agIcon('play', 11)}</button><button type="button" onclick="mlSonPartout(${i})">Sur chaque transition</button><button type="button" class="no" onclick="mlSonRetirer(${i})">${agIcon('trash', 12)}</button></div></div>`).join('')}` : ''}
  </div>`;
}
window.mlRendu = function(){ const z = document.getElementById('mlZone'); if(z) z.innerHTML = mlHtml(); };
const vueMl = anVueEdit;
anVueEdit = function(){
  let h = vueMl.apply(this, arguments);
  const m = '<details class="cr-bloc" open><summary>Musique</summary>';
  const i = h.indexOf(m);
  if(i >= 0) h = h.slice(0, i + m.length) + `<div id="mlZone">${mlHtml()}</div>` + h.slice(i + m.length);
  return h;
};
window.mlCopier = function(t){ try { navigator.clipboard.writeText(t); agToast('Crédit copié : colle-le dans ta légende'); } catch(e){ agAlert(t); } };

// ---------- La bibliothèque ----------
const CHIPS_M = [['Afro', 'afrobeat'], ['Joyeux', 'happy upbeat'], ['Mariage', 'wedding romantic'], ['Romantique', 'romantic love'], ['Épique', 'epic cinematic'], ['Piano', 'piano'], ['Guitare', 'acoustic guitar'], ['Hip-hop', 'hip hop beat'], ['Lofi', 'lofi chill'], ['Électro', 'electronic dance'], ['Gospel', 'gospel'], ['Percussions', 'african drums percussion'], ['Anniversaire', 'happy birthday party'], ['Calme', 'calm ambient'], ['Mode', 'fashion house'], ['Émotion', 'emotional strings']];
const CHIPS_B = [['Whoosh', 'whoosh'], ['Déclencheur photo', 'camera shutter'], ['Applaudissements', 'applause'], ['Battement de cœur', 'heartbeat'], ['Rires', 'laughter'], ['Foule', 'crowd cheer'], ['Ding', 'ding bell'], ['Pop', 'pop'], ['Montée', 'riser'], ['Impact', 'impact hit'], ['Glitch', 'glitch'], ['Feu d\'artifice', 'fireworks'], ['Cloches', 'church bells'], ['Bisou', 'kiss'], ['Bébé', 'baby laugh'], ['Vent', 'wind'], ['Pluie', 'rain'], ['Machine à écrire', 'typewriter']];
window.mlBib = function(pour, q){
  ML.bibPour = pour || 'musique'; ML.cat = ML.bibPour === 'bruitage' ? 'sound_effect' : 'music'; ML.res = []; ML.page = 1;
  const chips = ML.bibPour === 'bruitage' ? CHIPS_B : CHIPS_M;
  agSheet('mlSheet', `<h3>${ML.bibPour === 'bruitage' ? 'Bruitages libres' : 'Musiques libres de droits'}</h3>
    <div class="ag-hint" style="margin-top:0">Des sons partagés par leurs auteurs avec une licence libre (Jamendo, Freesound, Wikimedia...). Chaque son affiche ce qu'il permet.</div>
    <div class="ap-ask"><input id="mlQ" placeholder="${ML.bibPour === 'bruitage' ? 'Ex : whoosh, applause...' : 'Ex : afrobeat, piano, wedding...'}" value="${E(q || '')}" onkeydown="if(event.key==='Enter')mlChercher()"><button class="btn-primary" onclick="mlChercher()">${agIcon('search', 15)}</button></div>
    <div class="ml-chips">${chips.map(([l, k]) => `<button type="button" onclick="document.getElementById('mlQ').value='${k}';mlChercher()">${l}</button>`).join('')}</div>
    <div class="ag-pills mt-pills" style="margin-top:8px"><button type="button" class="${ML.usage === 'pro' ? 'on' : ''}" onclick="ML.usage='pro';mlChercher(true)">Pour le travail (réseaux, clients)</button><button type="button" class="${ML.usage !== 'pro' ? 'on' : ''}" onclick="ML.usage='tout';mlChercher(true)">Tout (usage perso)</button></div>
    <div id="mlRes"><div class="ag-empty">Choisis une ambiance ou tape un mot (en anglais, ça trouve plus de sons).</div></div>`);
  if(q) mlChercher();
};
window.mlChercher = async function(memes, plus){
  const q = ((document.getElementById('mlQ') || {}).value || ML.q || '').trim(); if(!q) return;
  ML.q = q; if(!plus) ML.page = 1;
  const el = document.getElementById('mlRes'); if(el && !plus) el.innerHTML = '<div class="ag-empty">Recherche...</div>';
  document.querySelectorAll('#mlSheet .mt-pills button').forEach((b, i) => b.classList.toggle('on', (i === 0) === (ML.usage === 'pro')));
  try {
    const r = await mlFn({ action: 'chercher', q, categorie: ML.cat, usage: ML.usage, n: 20, page: ML.page, duree: ML.bibPour === 'bruitage' ? 'court' : '' });
    ML.res = plus ? ML.res.concat(r.resultats || []) : (r.resultats || []);
    mlResRendu(r.total);
  } catch(e){ if(el) el.innerHTML = `<div class="ag-hint warn">Recherche impossible : ${E(e.message || e)}<br>Vérifie ta connexion et réessaie.</div>`; }
};
function mlResRendu(total){
  const el = document.getElementById('mlRes'); if(!el) return;
  if(!ML.res.length){ el.innerHTML = '<div class="ag-empty">Aucun son trouvé. Essaie un autre mot, en anglais.</div>'; return; }
  el.innerHTML = `<div class="ml-res">${ML.res.map((x, i) => { const d = mlDroits(Object.assign({}, x, { origine: 'libre' })); return `<div class="ml-r">
      <div class="ml-rt"><b>${E(x.titre || 'Sans titre')}</b><small>${E(x.auteur || '')}${x.duree ? ' · ' + Math.floor(x.duree / 60) + ':' + String(x.duree % 60).padStart(2, '0') : ''} · ${E(x.source || '')} · ${E(String(x.licence || '').toUpperCase())}</small></div>
      <audio controls preload="none" src="${E(x.url)}" onplay="document.querySelectorAll('#mlRes audio').forEach(a=>{if(a!==this)a.pause()})"></audio>
      ${mlBadges(d)}
      <div class="mt-act"><button type="button" class="on" onclick="mlUtiliser(${i})">${ML.bibPour === 'bruitage' ? 'Ajouter ici' : 'Utiliser cette musique'}</button>${x.page ? `<a class="ml-lien" href="${E(x.page)}" target="_blank" rel="noopener">Voir la source et la licence</a>` : ''}</div></div>`; }).join('')}</div>
    ${ML.res.length < (total || 0) ? `<button class="btn-ghost" style="width:100%;margin-top:8px" onclick="ML.page++;mlChercher(true,true)">Voir plus</button>` : ''}`;
}
window.mlUtiliser = async function(i){
  const x = ML.res[i]; if(!x) return;
  const d = mlDroits(Object.assign({}, x, { origine: 'libre' }));
  if(d.niveau === 'non' && !await agConfirm(`${LIC[String(x.licence).toLowerCase()] || 'Cette licence limite l\'usage.'}\nL'utiliser quand même ?`, { ok: 'Oui', no: 'Non' })) return;
  agToast('Téléchargement du son...', 'info');
  try {
    const blob = await mlFn({ action: 'fichier', url: x.url }, true);
    const meta = { titre: x.titre, auteur: x.auteur, licence: x.licence, version: x.version, source: x.source, page: x.page, attribution: x.attribution, origine: 'libre' };
    if(ML.bibPour === 'bruitage'){
      const V = anVid(); V.sons = V.sons || [];
      const s = Object.assign({ id: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), nom: x.titre || 'Bruitage', url: x.url, t: Math.round(AN.t * 10) / 10, vol: 1 }, meta);
      V.sons.push(s); await mlChargerSon(s, blob);
      agCloseSheet('mlSheet'); mlRendu(); agToast('Bruitage ajouté à ' + s.t.toFixed(1).replace('.', ',') + ' s');
    } else {
      const ext = (blob.type.split('/')[1] || 'mp3').replace('mpeg', 'mp3');
      const f = new File([blob], (x.titre || 'musique').slice(0, 40) + '.' + ext, { type: blob.type || 'audio/mpeg' });
      ML.depuisBib = true;
      try { await anChoisirMusique([f]); } finally { ML.depuisBib = false; }
      anVid().musInfo = meta;
      agCloseSheet('mlSheet'); crRender();
      agToast(d.credit ? 'Musique ajoutée · pense au crédit (bouton Copier)' : 'Musique ajoutée');
    }
  } catch(e){ agAlert('Ce son n\'a pas pu être téléchargé : ' + (e.message || e) + '\nEssaie un autre son.'); }
};
// Un son libre qui ressemble à la musique actuelle (ambiance et tempo)
window.mlSimilaire = async function(){
  const V = anVid(), info = V.musInfo || {}, A = AN.buffer && typeof mtsAnalyse === 'function' ? mtsAnalyse() : null;
  let q = A && A.bpm >= 110 ? 'upbeat afrobeat' : 'romantic acoustic';
  try {
    const r = await mkAI({ messages: [{ role: 'user', text: `Musique : "${info.titre || (V.musique && V.musique.nom) || ''}"${A ? ', tempo ' + A.bpm + ' BPM' : ''}. Donne 2 à 4 mots-clés EN ANGLAIS pour trouver une musique libre de droits qui ressemble (genre, ambiance, instruments). Réponds seulement avec les mots-clés.` }], maxTokens: 60 });
    const t = String(r.text || '').replace(/["\n]/g, ' ').trim(); if(t && t.length < 60) q = t;
  } catch(e){}
  mlBib('musique', q);
};

// ---------- Musique importée : d'où vient-elle ? ----------
window.mlOrigine = function(){
  agSheet('mlOrig', `<h3>D'où vient cette musique ?</h3>
    <div class="ag-hint" style="margin-top:0">Pour te prévenir avant qu'un réseau coupe le son ou bloque ta vidéo.</div>
    <div class="ml-orig">${[['connue', 'Une chanson d\'un artiste', 'Radio, YouTube, Boomplay, Spotify, un son tendance...'], ['libre', 'Un son libre de droits', 'Trouvé sur un site de sons libres, avec une licence'], ['moi', 'Ma musique ou j\'ai la licence', 'Je l\'ai créée, commandée ou achetée avec licence'], ['inconnu', 'Je ne sais pas', 'L\'app sera prudente']].map(([k, t, d]) => `<button type="button" onclick="mlFixerOrigine('${k}')"><b>${t}</b><small>${d}</small></button>`).join('')}</div>`);
};
window.mlFixerOrigine = function(k){
  const V = anVid(); V.musInfo = Object.assign({}, V.musInfo || {}, { origine: k, titre: (V.musInfo && V.musInfo.titre) || (V.musique && V.musique.nom) });
  if(k === 'libre' && !V.musInfo.licence) V.musInfo.licence = 'by';
  agCloseSheet('mlOrig'); mlRendu();
  if(k === 'connue') agToast('Noté : l\'app te préviendra selon l\'endroit où tu publies', 'info');
};
const choisirMl = anChoisirMusique;
anChoisirMusique = async function(files){
  const f0 = files && files[0], bib = ML.depuisBib, silence = AN.silence;   // (la liste de fichiers se vide après lecture)
  const r = await choisirMl.apply(this, arguments);
  if(!bib && !silence && f0 && anVid().musique && !window.ML_SANS_QUESTION){ anVid().musInfo = { titre: anVid().musique.nom, origine: null }; setTimeout(() => { if(CR.vue === 'edit') mlOrigine(); }, 300); }
  return r;
};

// ---------- Bruitages : chargement, écoute, place ----------
async function mlChargerSon(s, blob){
  try {
    if(!blob) blob = await mlFn({ action: 'fichier', url: s.url }, true);
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    ML.buf[s.id] = await ctx.decodeAudioData(await blob.arrayBuffer()); ctx.close && ctx.close();
  } catch(e){ console.warn('bruitage', e); }
}
window.mlSonIci = function(i){ const s = anVid().sons[i]; s.t = Math.round(AN.t * 10) / 10; mlRendu(); agToast('Bruitage placé à ' + s.t.toFixed(1).replace('.', ',') + ' s'); };
window.mlSonRetirer = function(i){ anVid().sons.splice(i, 1); mlRendu(); };
window.mlSonPartout = function(i){
  const V = anVid(), s = V.sons[i], plan = anPlan(); if(!plan.segs || plan.segs.length < 2) return;
  const coupes = plan.segs.slice(0, -1).map(sg => Math.max(0, sg.t1 - 0.15));
  V.sons.splice(i, 1);
  coupes.forEach((t, j) => V.sons.push(Object.assign({}, s, { id: s.id + '-' + j, t: Math.round(t * 100) / 100 })));
  coupes.forEach((t, j) => { ML.buf[s.id + '-' + j] = ML.buf[s.id]; });
  mlRendu(); agToast(`${coupes.length} bruitages placés sur les transitions`);
};
window.mlSonEcouter = function(i){ const s = anVid().sons[i], b = ML.buf[s.id]; if(!b) return; const c = new (window.AudioContext || window.webkitAudioContext)(), src = c.createBufferSource(), g = c.createGain(); g.gain.value = s.vol == null ? 1 : s.vol; src.buffer = b; src.connect(g); g.connect(c.destination); src.start(); src.onended = () => c.close(); };
// Les bruitages d'un brouillon rouvert se rechargent
const prepMl = anPreparer;
anPreparer = async function(){ const r = await prepMl.apply(this, arguments); for(const s of anVid().sons || []){ if(!ML.buf[s.id]){ const base = String(s.id).split('-')[0], b = ML.buf[base]; if(b) ML.buf[s.id] = b; else if(s.url) await mlChargerSon(s); } } return r; };
// Pendant la lecture de l'aperçu
const lectureMl = anLecture;
anLecture = function(){
  const r = lectureMl.apply(this, arguments);
  ML.src.forEach(x => { try { x.stop(); } catch(e){} }); ML.src = [];
  const sons = anVid().sons || [];
  if(AN.lecture && sons.length){
    if(!ML.ctx) ML.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const c = ML.ctx, t0 = AN.t;
    sons.forEach(s => { const b = ML.buf[s.id]; if(!b || s.t < t0 - 0.05) return; const src = c.createBufferSource(), g = c.createGain(); g.gain.value = s.vol == null ? 1 : s.vol; src.buffer = b; src.connect(g); g.connect(c.destination); src.start(c.currentTime + Math.max(0, s.t - t0)); ML.src.push(src); });
  }
  return r;
};
const stopMl = anStop;
anStop = function(){ ML.src.forEach(x => { try { x.stop(); } catch(e){} }); ML.src = []; return stopMl.apply(this, arguments); };
// Dans la vidéo finale
window.mlAjouterSons = async function(off, D){
  for(const s of anVid().sons || []){
    const b = ML.buf[s.id]; if(!b || !(s.t < D)) continue;
    const src = off.createBufferSource(), g = off.createGain(); g.gain.value = s.vol == null ? 1 : s.vol; src.buffer = b; src.connect(g); g.connect(off.destination); src.start(Math.max(0, s.t));
  }
};

// ---------- Contrôle des droits avant l'export ----------
const exporterMl = anExporter;
anExporter = async function(mode){
  const V = anVid(), L = mlTousLesSons();
  if(!L.length || V.sortie === 'gif' || ML.passe || window.ML_SANS_CONTROLE){ ML.passe = false; return exporterMl.apply(this, arguments); }
  const dest = V.destination;
  const pb = dest ? L.filter(x => ['non', 'attention'].includes(mlDroits(x.info).plats[dest])) : [];
  const credits = L.map(x => mlDroits(x.info).credit).filter(Boolean);
  if(dest && !pb.length && !credits.length) return exporterMl.apply(this, arguments);
  ML.modeExport = mode;
  mlControle();
};
window.mlControle = function(){
  const V = anVid(), L = mlTousLesSons(), dest = V.destination;
  const credits = L.map(x => mlDroits(x.info).credit).filter(Boolean);
  const pb = dest ? L.filter(x => ['non', 'attention'].includes(mlDroits(x.info).plats[dest])) : [];
  agSheet('mlCtrl', `<h3>Contrôle des droits</h3>
    <label>Où vas-tu publier cette vidéo ?</label>
    <div class="ag-pills mt-pills">${PLATS.map(([k, l]) => `<button type="button" class="${dest === k ? 'on' : ''}" onclick="anVid().destination='${k}';mlControle()">${l}</button>`).join('')}</div>
    ${dest ? `<div class="ml-ctl">${L.map(x => { const d = mlDroits(x.info), v = d.plats[dest]; return `<div class="ml-cl ${BADGE[v][1]}"><span class="ml-b ${BADGE[v][1]}">${BADGE[v][0]}</span><div><b>${x.type} : ${E(x.nom)}</b><small>${E(d.explication)}</small></div></div>`; }).join('')}</div>
      ${pb.length ? `<div class="ag-hint warn">${pb.some(x => mlDroits(x.info).plats[dest] === 'non') ? 'Sur cette plateforme, le son risque d\'être coupé ou la vidéo bloquée.' : 'Il y a un risque sur cette plateforme.'}${dest === 'tiktok' || dest === 'instagram' ? ' Astuce : exporte sans musique, puis ajoute le son directement dans ' + (dest === 'tiktok' ? 'TikTok' : 'Instagram') + ' (bibliothèque officielle).' : ''}</div>` : '<div class="ag-hint">Tout est bon pour cette plateforme.</div>'}
      ${credits.length ? `<div class="ml-credit"><span>${E(credits.join(' · '))}</span><button type="button" onclick="mlCopier(this.previousElementSibling.textContent)">Copier le crédit</button></div><div class="ag-hint">Colle ce crédit dans ta légende : c'est la condition de la licence.</div>` : ''}
      <div class="ml-ctl-b">
        ${pb.length && anVid().musique ? `<button class="btn-ghost" onclick="agCloseSheet('mlCtrl');mlSimilaire()">${agIcon('search', 14)} Trouver un son libre qui ressemble</button><button class="btn-ghost" onclick="mlExporterSansMusique()">Exporter sans la musique</button>` : ''}
        <button class="btn-primary" onclick="agCloseSheet('mlCtrl');ML.passe=true;anExporter(ML.modeExport||'telecharger')">${pb.length ? 'Exporter quand même' : 'Exporter'}</button>
      </div>` : '<div class="ag-hint">Choisis la plateforme : l\'app vérifie chaque son.</div>'}`);
};
window.mlExporterSansMusique = async function(){
  agCloseSheet('mlCtrl');
  ML.sansMus = true;
  try { ML.passe = true; await anExporter(ML.modeExport || 'telecharger'); } finally { ML.sansMus = false; }
};
// Pendant un export "sans la musique" : la musique est mise de côté juste le temps de fabriquer la vidéo
const videoMl = anVideo;
anVideo = async function(){
  if(!ML.sansMus) return videoMl.apply(this, arguments);
  const b = AN.buffer; AN.buffer = null;
  try { return await videoMl.apply(this, arguments); } finally { AN.buffer = b; }
};

(function mlCss(){
  if(document.getElementById('mlCss')) return;
  const st = document.createElement('style'); st.id = 'mlCss';
  st.textContent = `
.ml-carte{margin-top:10px;padding:10px;border-radius:12px;background:var(--card2)}
.ml-ct b{display:block;color:var(--text);font-size:13.5px}.ml-ct small{display:block;color:var(--muted);font-size:11.5px;margin-top:2px}
.ml-plats{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px}
.ml-b{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:999px;font-size:10.5px;font-weight:700;background:var(--card)}
.ml-b i{font-style:normal;font-weight:500;color:var(--muted)}
.ml-b.ok{color:#2fbf71}.ml-b.cr{color:var(--accent)}.ml-b.at{color:#f5a524}.ml-b.no{color:#e5484d}
.ml-credit{display:flex;gap:8px;align-items:center;margin-top:8px;padding:8px;border-radius:10px;background:var(--card);font-size:11.5px;color:var(--text)}.ml-credit span{flex:1;min-width:0;word-break:break-word}.ml-credit button{width:auto;margin:0;padding:6px 10px;border-radius:8px;border:0;background:var(--accent);color:#fff;font-size:11.5px;cursor:pointer;white-space:nowrap}
.ml-sec{margin:12px 0 6px;font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}.ml-sec i{font-style:normal}
.ml-son{padding:8px 10px;border-radius:10px;background:var(--card2);margin-bottom:6px}.ml-st b{display:block;font-size:12.5px;color:var(--text)}.ml-st small{font-size:11px;color:var(--muted)}
.ml-son input[type=range]{width:100%;margin:6px 0}
.ml-sb{display:flex;flex-wrap:wrap;gap:5px}.ml-sb button{width:auto;margin:0;padding:5px 9px;border-radius:999px;border:1px solid var(--border);background:var(--card);color:var(--text);font-size:11.5px;cursor:pointer;display:inline-flex;align-items:center}.ml-sb button.no{color:#e5484d}
.ml-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.ml-chips button{width:auto;margin:0;padding:6px 10px;border-radius:999px;border:1px solid var(--border);background:var(--card2);color:var(--text);font-size:12px;cursor:pointer}
.ml-res{display:flex;flex-direction:column;gap:8px;margin-top:10px}
.ml-r{padding:10px;border-radius:12px;background:var(--card2)}.ml-rt b{display:block;color:var(--text);font-size:13px}.ml-rt small{color:var(--muted);font-size:11px}
.ml-r audio{width:100%;height:36px;margin-top:6px}
.ml-lien{align-self:center;font-size:12px;color:var(--accent)}
.ml-orig{display:flex;flex-direction:column;gap:8px}.ml-orig button{margin:0;padding:12px;border-radius:12px;border:1px solid var(--border);background:var(--card2);text-align:left;cursor:pointer}.ml-orig b{display:block;color:var(--text);font-size:13.5px}.ml-orig small{color:var(--muted);font-size:12px}
.ml-ctl{display:flex;flex-direction:column;gap:6px;margin:10px 0}
.ml-cl{display:flex;gap:10px;align-items:flex-start;padding:10px;border-radius:12px;background:var(--card2)}.ml-cl b{display:block;color:var(--text);font-size:13px}.ml-cl small{color:var(--muted);font-size:11.5px;line-height:1.4}
.ml-ctl-b{display:flex;flex-direction:column;gap:8px;margin-top:10px}.ml-ctl-b button{width:100%;margin:0}`;
  document.head.appendChild(st);
})();
})();
