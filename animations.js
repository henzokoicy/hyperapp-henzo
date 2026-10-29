// ============================================================
// ANIMATIONS.JS - Vidéos et GIF animés avec tes photos (Créations)
// ------------------------------------------------------------
// Modèles : diaporama doux, rythmé (coupes sur la musique), glisse,
// mini-galerie qui se construit, polaroids qui tombent, pellicule,
// titre animé. Musique de ton choix (fichier du téléphone), extrait
// choisi, photos calées sur le rythme. Export vidéo (MP4 si le
// téléphone sait le faire, sinon WebM) ou GIF, en plusieurs qualités.
// Utilise creations.js (photos, formats, polices, effets).
// ============================================================

const CR_VIDEOS = [
  ['v-diapo', 'Diaporama doux', 'Fondu et léger zoom sur chaque photo', 2, 30, ['story', 'post', 'carre', 'large']],
  ['v-dyn', 'Rythmé', 'Coupes rapides sur la musique, effet punch', 3, 30, ['story', 'post', 'carre', 'large']],
  ['v-glisse', 'Glisse', 'Les photos arrivent en glissant', 2, 30, ['story', 'post', 'carre', 'large']],
  ['v-galerie', 'Mini-galerie animée', 'La grille se construit photo par photo', 3, 9, ['story', 'post', 'carre']],
  ['v-polaroid', 'Polaroids', 'Les photos tombent comme des polaroids', 2, 8, ['story', 'post', 'carre']],
  ['v-pellicule', 'Pellicule', 'Un film qui défile', 3, 12, ['story', 'post']],
  ['v-titre', 'Titre animé', 'Un grand mot qui apparaît sur tes photos', 1, 10, ['story', 'post', 'carre', 'large']]
];
const AN_QUAL = [
  ['leger', 'Léger', 720, 2.5e6, 'Envoi rapide, WhatsApp'],
  ['standard', 'TikTok / Reels / Facebook', 1080, 6e6, '1080 px, le format conseillé'],
  ['hd', 'Haute qualité', 1440, 12e6, 'Plus net, fichier plus lourd']
];
const AN_GIF = [['petit', 'Petit', 360, 10], ['normal', 'Normal', 540, 12], ['grand', 'Grand', 720, 12]];
const AN = { vid: null, lecture: false, t: 0, raf: 0, debutLecture: 0, audio: null, buffer: null, beats: [], busy: '', progres: 0, plan: null };

function anEst(k){ return /^v-/.test(k || ''); }
function anModele(k){ const m = CR_VIDEOS.find(x => x[0] === k); return m ? { k: m[0], nom: m[1], desc: m[2], min: m[3], max: m[4], fmts: m[5] } : null; }
function anVid(){
  if(!AN.vid) AN.vid = { duree: 12, fin: true, sync: true, qualite: 'standard', gif: 'normal', sortie: 'video', musique: null, debut: 0, volume: 0.9, fondu: true };
  return AN.vid;
}
const anEase = u => 1 - Math.pow(1 - Math.max(0, Math.min(1, u)), 3);
const anEaseIO = u => { u = Math.max(0, Math.min(1, u)); return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };

// ---------- Le plan : quelle photo à quel moment ----------
function anPlan(){
  const V = anVid(), n = CR.photos.length, M = anModele(CR.modele);
  const finD = V.fin ? 2.4 : 0, D = Math.max(3, V.duree), Dp = Math.max(1, D - finD);
  let cuts = [];
  const beats = V.sync && AN.beats.length ? AN.beats.filter(b => b > 0.3 && b < Dp - 0.3) : [];
  if(M.k === 'v-dyn'){
    // Coupes sur les temps forts (au moins 0,35 s entre deux), sinon toutes les 0,5 s
    if(beats.length){ let last = 0; beats.forEach(b => { if(b - last >= 0.35){ cuts.push(b); last = b; } }); }
    else for(let t = 0.5; t < Dp - 0.2; t += 0.5) cuts.push(t);
  } else if(!['v-galerie', 'v-polaroid', 'v-pellicule'].includes(M.k)){
    const pas = Dp / n;
    for(let i = 1; i < n; i++){
      let t = i * pas;
      if(beats.length){ const p = beats.reduce((a, b) => Math.abs(b - t) < Math.abs(a - t) ? b : a, beats[0]); if(Math.abs(p - t) < pas * 0.35) t = p; }
      cuts.push(t);
    }
  }
  const bornes = [0].concat(cuts, [Dp]);
  const segs = [];
  for(let k = 0; k < bornes.length - 1; k++) segs.push({ i: k % n, t0: bornes[k], t1: bornes[k + 1] });
  return { D, Dp, finD, segs, n };
}

// ---------- Dessin d'une image de la vidéo au temps t ----------
function anCover(g, img, x, y, w, h, zoom, px, py, alpha){
  if(!img) return;
  const k = Math.max(w / img.width, h / img.height) * (zoom || 1);
  const dw = img.width * k, dh = img.height * k;
  const lx = (dw - w) / 2, ly = (dh - h) / 2;
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  if(alpha != null) g.globalAlpha = alpha;
  const f = crFiltre(CR.cfg); if(f) g.filter = f;
  g.drawImage(img, x + (w - dw) / 2 - (px || 0) * lx, y + (h - dh) / 2 - (py || 0) * ly, dw, dh);
  g.restore();
}
function anSeg(plan, t){ return plan.segs.find(sg => t >= sg.t0 && t < sg.t1) || plan.segs[plan.segs.length - 1]; }
function anMotSync(g, W, H, s, txt, o){
  // Comme le mot géant, mais sans attendre la police (déjà chargée avant)
  const c = CR.cfg, pc = CR_POLICES_CREA[c.motPolice] || CR_POLICES_CREA.pinceau, P = crPolices();
  const fam = pc.f || P.t, poids = pc.f ? 400 : 800;
  const lignes = String(txt).toUpperCase().split('\n').map(x => x.trim()).filter(Boolean); if(!lignes.length) return;
  g.font = `${poids} 100px "${fam}", sans-serif`;
  const plus = Math.max(...lignes.map(l => g.measureText(l).width)) || 1;
  const px = Math.min(100 * (W * 0.86) / plus, H * 0.8 / (lignes.length * 1.02)) * (c.motTaille || 1) * (o.echelle || 1);
  const lh = px, total = lignes.length * lh, y0 = (H - total) / 2;
  g.save(); g.globalAlpha = (c.motOpacite == null ? 0.85 : c.motOpacite) * (o.alpha == null ? 1 : o.alpha);
  if(c.motFlou > 0) g.filter = `blur(${(c.motFlou * 1.6 * s).toFixed(1)}px)`;
  g.fillStyle = c.motCouleur || c.accent; g.textAlign = 'center'; g.textBaseline = 'top';
  g.font = `${poids} ${Math.round(px)}px "${fam}", sans-serif`;
  if(o.lettres != null){
    // Les lettres apparaissent une par une
    lignes.forEach((l, i) => { const n = Math.floor(o.lettres * l.length + 0.999); const vis = l.slice(0, n); g.fillText(vis + ' '.repeat(l.length - vis.length), W / 2, y0 + i * lh); });
  } else lignes.forEach((l, i) => g.fillText(l, W / 2, y0 + i * lh));
  g.restore();
}
function anImage(g, W, H, s, t, imgs, plan, logo){
  const c = CR.cfg, M = anModele(CR.modele), P = crPolices();
  g.save(); g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.restore();
  const tt = Math.min(t, plan.Dp);
  if(M.k === 'v-diapo' || M.k === 'v-titre'){
    const xf = 0.6;
    const k = plan.segs.indexOf(anSeg(plan, tt)), sg = plan.segs[k], nx = plan.segs[k + 1];
    const prog = sg2 => (tt - sg2.t0) / Math.max(0.5, sg2.t1 - sg2.t0 + xf);
    const dir = i => (i % 2 ? -1 : 1);
    anCover(g, imgs[sg.i], 0, 0, W, H, 1 + 0.1 * prog(sg), 0.5 * dir(k) * prog(sg), 0);
    if(nx && tt > sg.t1 - xf){ const a = (tt - (sg.t1 - xf)) / xf; anCover(g, imgs[nx.i], 0, 0, W, H, 1 + 0.1 * prog(nx), 0.5 * dir(k + 1) * Math.max(0, prog(nx)), 0, anEaseIO(a)); }
    if(M.k === 'v-titre'){
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, W, H);
      anMotSync(g, W, H, s, c.mot || c.titre || crNom(), { lettres: Math.min(1, tt / 1.4), echelle: 1 + 0.04 * Math.min(1, tt / plan.Dp) });
    }
  } else if(M.k === 'v-dyn'){
    const sg = anSeg(plan, tt), u = tt - sg.t0;
    const z = 1.14 - 0.14 * anEase(u / 0.28);
    anCover(g, imgs[sg.i], 0, 0, W, H, z, 0, 0);
    const fl = Math.max(0, 0.55 - u * 4.5); if(fl > 0 && sg.t0 > 0){ g.fillStyle = `rgba(255,255,255,${fl})`; g.fillRect(0, 0, W, H); }
  } else if(M.k === 'v-glisse'){
    const k = plan.segs.indexOf(anSeg(plan, tt)), sg = plan.segs[k], pv = plan.segs[k - 1];
    const u = anEase((tt - sg.t0) / 0.5), dir = k % 2 ? -1 : 1;
    if(pv && u < 1) anCover(g, imgs[pv.i], -dir * W * 0.3 * u, 0, W, H, 1.04, 0, 0);
    anCover(g, imgs[sg.i], pv ? dir * W * (1 - u) : 0, 0, W, H, 1.04 - 0.04 * Math.min(1, (tt - sg.t0) / (sg.t1 - sg.t0)), 0, 0);
  } else if(M.k === 'v-galerie'){
    g.fillStyle = c.bordCouleur || '#ffffff'; g.fillRect(0, 0, W, H);
    const m = 60 * s, titreH = c.titre ? 150 * s : 0;
    const cases = crGrille(plan.n, { x: m, y: m, w: W - 2 * m, h: H - 2 * m - titreH }, 14 * s);
    const pas = Math.min(0.55, plan.Dp * 0.6 / plan.n);
    const zoomG = 1 + 0.035 * Math.max(0, (tt - pas * plan.n) / Math.max(1, plan.Dp - pas * plan.n));
    g.save(); g.translate(W / 2, H / 2); g.scale(zoomG, zoomG); g.translate(-W / 2, -H / 2);
    cases.forEach((r, i) => {
      const u = anEase((tt - i * pas) / 0.45); if(u <= 0) return;
      const sc = 0.82 + 0.18 * u, cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      g.save(); g.globalAlpha = u; g.translate(cx, cy); g.scale(sc, sc); g.translate(-cx, -cy);
      crRond(g, r.x, r.y, r.w, r.h, 12 * s); g.clip();
      anCover(g, imgs[i], r.x, r.y, r.w, r.h, 1.06 - 0.06 * u, 0, 0);
      g.restore();
    });
    g.restore();
    if(c.titre){ const a = anEase((tt - pas * plan.n) / 0.5); if(a > 0){ g.save(); g.globalAlpha = a; crTexte(g, c.titre, { fam: P.t, poids: P.tw, px: 56 * s, x: m, maxW: W - 2 * m, y: H - m - titreH + 30 * s, couleur: crLisible(c.bordCouleur || '#ffffff'), align: 'centre', maxL: 2, lh: 1.05 }); g.restore(); } }
  } else if(M.k === 'v-polaroid'){
    g.fillStyle = c.clair || '#f6f3ee'; g.fillRect(0, 0, W, H);
    const pas = Math.min(0.9, plan.Dp * 0.7 / plan.n);
    const cw = Math.min(W, H) * 0.62, ch = cw * 1.18, ph = cw - 36 * s, m = 18 * s;
    for(let i = 0; i < plan.n; i++){
      const u = anEase((tt - i * pas) / 0.6); if(u <= 0) continue;
      const sx = Math.sin(i * 12.9898) * 43758.5453, rnd = sx - Math.floor(sx), sy = Math.sin(i * 78.233) * 12345.678, rnd2 = sy - Math.floor(sy);
      const tx = W / 2 + (rnd - 0.5) * W * 0.28, ty = H / 2 + (rnd2 - 0.5) * H * 0.18, rot = (rnd - 0.5) * 16;
      const y = -ch + (ty + ch) * u, r = (rot + (1 - u) * 25) * Math.PI / 180;
      g.save(); g.translate(tx, y); g.rotate(r);
      g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 30 * s; g.shadowOffsetY = 12 * s;
      g.fillStyle = '#fff'; g.fillRect(-cw / 2, -ch / 2, cw, ch); g.shadowColor = 'transparent';
      anCover(g, imgs[i], -cw / 2 + m, -ch / 2 + m, cw - 2 * m, ph, 1.02, 0, 0);
      g.restore();
    }
  } else if(M.k === 'v-pellicule'){
    g.fillStyle = '#0d0d0d'; g.fillRect(0, 0, W, H);
    const bande = 70 * s, zx = bande + 12 * s, zw = W - 2 * zx, ph = zw * 0.75, gap = 22 * s;
    const total = plan.n * (ph + gap);
    const off = (total - H + 60 * s) * anEaseIO(tt / plan.Dp);
    for(let i = 0; i < plan.n; i++){ const y = 30 * s + i * (ph + gap) - off; if(y > H || y + ph < 0) continue; anCover(g, imgs[i], zx, y, zw, ph, 1, 0, 0); }
    g.fillStyle = '#f2f2f2';
    const pasT = 64 * s, dec = off % pasT;
    for(let y = -dec; y < H; y += pasT){ crRond(g, (bande - 26 * s) / 2, y, 26 * s, 36 * s, 5 * s); g.fill(); crRond(g, W - bande + (bande - 26 * s) / 2, y, 26 * s, 36 * s, 5 * s); g.fill(); }
  }
  // Mot géant fixe (sauf pour le titre animé qui a le sien)
  if(c.mot && M.k !== 'v-titre') anMotSync(g, W, H, s, c.mot, { alpha: Math.min(1, tt / 0.6) });
  // Titre au début
  if(c.titre && !['v-titre', 'v-galerie'].includes(M.k)){
    const a = Math.min(anEase((tt - 0.15) / 0.5), 1 - anEase((tt - 2.3) / 0.5));
    if(a > 0){ g.save(); g.globalAlpha = a;
      const y = H - 260 * s;
      const gr = g.createLinearGradient(0, y - 120 * s, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.6)'); g.fillStyle = gr; g.fillRect(0, y - 120 * s, W, H);
      crTexte(g, c.titre, { fam: P.t, poids: P.tw, px: 76 * s, x: 70 * s, maxW: W - 140 * s, y: y - (8 * (1 - a)) * s * 10, couleur: '#fff', align: 'centre', maxL: 2, lh: 1.05, ombre: true });
      if(c.sous) crTexte(g, c.sous, { fam: P.x, poids: 400, px: 32 * s, x: 70 * s, maxW: W - 140 * s, y: y + 110 * s, couleur: 'rgba(255,255,255,.9)', align: 'centre', maxL: 1 });
      g.restore(); }
  }
  // Effets (grain, lumière, vignette, effet perso)
  anEffetsSync(g, W, H, s, t);
  // Carte de fin : logo, appel, contact
  if(plan.finD && t > plan.Dp - 0.3){
    const a = anEase((t - (plan.Dp - 0.3)) / 0.6);
    g.save(); g.globalAlpha = a; g.fillStyle = c.fond || '#000'; g.fillRect(0, 0, W, H);
    const coul = crLisible(c.fond || '#000');
    let y = H / 2 - 160 * s;
    if(logo){ const lh = 110 * s, lw = logo.width * lh / logo.height; g.drawImage(logo, (W - lw) / 2, y - 40 * s, lw, lh); y += 110 * s; }
    else { crTexte(g, crNom().toUpperCase(), { fam: P.t, poids: 700, px: 34 * s, x: 60 * s, maxW: W - 120 * s, y, couleur: coul, align: 'centre', espace: 6 * s, maxL: 1 }); y += 80 * s; }
    const sc = 0.92 + 0.08 * a;
    g.translate(W / 2, y + 60 * s); g.scale(sc, sc); g.translate(-W / 2, -(y + 60 * s));
    y += crTexte(g, c.appel || 'Réserve ta séance', { fam: P.t, poids: P.tw, px: 70 * s, x: 60 * s, maxW: W - 120 * s, y, couleur: coul, align: 'centre', maxL: 2, lh: 1.05 }) + 30 * s;
    if(c.contact) crTexte(g, c.contact, { fam: P.x, poids: 500, px: 32 * s, x: 60 * s, maxW: W - 120 * s, y, couleur: coul, align: 'centre', maxL: 2 });
    g.restore();
  }
}
// Effets sans attente (l'image de l'effet perso est chargée avant)
function anEffetsSync(g, W, H, s, t){
  const e = (CR.cfg && CR.cfg.effets) || {};
  const im = e.perso && e.perso.path ? CR_FX_IMG[e.perso.path] : null;
  if(im){ const k = Math.max(W / im.width, H / im.height), dw = im.width * k, dh = im.height * k;
    g.save(); g.globalAlpha = e.persoOpac == null ? 0.6 : e.persoOpac; g.globalCompositeOperation = e.persoBlend || 'screen'; g.drawImage(im, (W - dw) / 2, (H - dh) / 2, dw, dh); g.restore(); }
  const c2 = Object.assign({}, CR.cfg, { effets: Object.assign({}, e, { perso: null }) });
  crEffetsApres(g, W, H, s, c2, t);   // sans image perso : rien n'est attendu
}

// ---------- Musique ----------
async function anChoisirMusique(files){
  const f = files && files[0]; if(!f) return;
  const V = anVid();
  try {
    if(AN.audio){ AN.audio.pause(); URL.revokeObjectURL(AN.audio.src); }
    AN.audio = new Audio(URL.createObjectURL(f)); AN.audio.preload = 'auto';
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    AN.buffer = await ctx.decodeAudioData(await f.arrayBuffer());
    ctx.close && ctx.close();
    V.musique = { nom: f.name.replace(/\.[^.]+$/, '').slice(0, 40), duree: AN.buffer.duration };
    V.debut = Math.min(V.debut || 0, Math.max(0, AN.buffer.duration - V.duree));
    anCalculerBeats();
    agToast('Musique ajoutée');
  } catch(e){ agAlert('Cette musique ne peut pas être lue. Essaie un fichier MP3 ou M4A.'); AN.buffer = null; V.musique = null; }
  const inp = document.getElementById('anMusFile'); if(inp) inp.value = '';
  crRender();
}
// Les temps forts de la musique (pour caler les photos)
function anCalculerBeats(){
  const V = anVid(), b = AN.buffer; AN.beats = [];
  if(!b) return;
  const sr = b.sampleRate, d0 = Math.floor(V.debut * sr), d1 = Math.min(b.length, Math.floor((V.debut + V.duree) * sr));
  const ch = b.getChannelData(0), ch2 = b.numberOfChannels > 1 ? b.getChannelData(1) : null;
  const pas = Math.floor(sr / 100), env = [];
  for(let i = d0; i < d1; i += pas){ let e = 0; for(let j = i; j < Math.min(i + pas, d1); j++){ const v = ch2 ? (ch[j] + ch2[j]) / 2 : ch[j]; e += v * v; } env.push(Math.sqrt(e / pas)); }
  const on = env.map((v, i) => Math.max(0, v - (env[i - 1] || 0)));
  const fen = 75;
  for(let i = 1; i < on.length - 1; i++){
    const a = Math.max(0, i - fen), z = Math.min(on.length, i + fen);
    let m = 0; for(let k = a; k < z; k++) m += on[k]; m /= (z - a);
    let sd = 0; for(let k = a; k < z; k++) sd += (on[k] - m) ** 2; sd = Math.sqrt(sd / (z - a));
    if(on[i] > m + 1.4 * sd && on[i] >= on[i - 1] && on[i] >= on[i + 1]){
      const t = i / 100; if(!AN.beats.length || t - AN.beats[AN.beats.length - 1] > 0.22) AN.beats.push(t);
    }
  }
}
function anDessinerOnde(){
  const cv = document.getElementById('anOnde'); if(!cv || !AN.buffer) return;
  const V = anVid(), b = AN.buffer, W = cv.width = cv.clientWidth * 2 || 600, H = cv.height = 120;
  const g = cv.getContext('2d'), ch = b.getChannelData(0), n = Math.floor(ch.length / W);
  g.clearRect(0, 0, W, H);
  const acc = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#48A89A';
  const x0 = V.debut / b.duration * W, x1 = Math.min(W, (V.debut + V.duree) / b.duration * W);
  g.fillStyle = 'rgba(128,128,128,.18)'; g.fillRect(x0, 0, x1 - x0, H);
  for(let x = 0; x < W; x += 2){ let m = 0; for(let j = x * n; j < (x + 1) * n; j += 16) m = Math.max(m, Math.abs(ch[j] || 0)); const h = m * H * 0.9;
    g.fillStyle = x >= x0 && x <= x1 ? acc : 'rgba(128,128,128,.5)'; g.fillRect(x, (H - h) / 2, 1.5, Math.max(1, h)); }
  g.strokeStyle = acc; g.lineWidth = 3; g.strokeRect(x0, 1, x1 - x0, H - 2);
}

// ---------- Éditeur ----------
function anVueEdit(){
  const M = anModele(CR.modele), c = CR.cfg, V = anVid(), F = crDims(CR.fmt, 0.5);
  const plan = anPlan();
  const pills = (list, val, fn) => `<div class="ag-pills">${list.map(([k, l]) => `<button type="button" class="${val === k ? 'on' : ''}" onclick="${fn}('${k}')">${l}</button>`).join('')}</div>`;
  const champ = (k, l, ph) => `<div><label>${l}</label><input value="${crE(c[k] || '')}" oninput="CR.cfg['${k}']=this.value;anApercuUneFois()" placeholder="${crE(ph || '')}"></div>`;
  const parPhoto = M.k === 'v-dyn' ? `${plan.segs.length} coupes` : `${(plan.Dp / Math.max(1, plan.segs.length)).toFixed(1).replace('.', ',')} s par photo`;
  return `<button class="ag-back" onclick="anStop();CR.vue='accueil';crRender()">${agIcon('chev', 16)} Créations</button>
    <div class="cr-edit">
      <div class="cr-prev-zone">
        <div class="cr-prev" style="aspect-ratio:${F.w}/${F.h}"><canvas id="anCanvas" width="${F.w}" height="${F.h}"></canvas></div>
        <div class="an-lect"><button type="button" class="an-play" onclick="anLecture()" id="anPlay">${AN.lecture ? '❚❚' : '▶'}</button>
          <input type="range" id="anScrub" min="0" max="${plan.D}" step="0.05" value="${AN.t}" oninput="anAller(this.value)"><span id="anTemps">0,0 / ${plan.D.toFixed(0)} s</span></div>
        <div class="cr-fmtnom">${crE(M.nom)} · ${CR.photos.length} photos · ${parPhoto}</div>
      </div>
      <div class="cr-panneau">
        <details class="cr-bloc" open><summary>Exporter</summary>
          <div class="ag-pills"><button type="button" class="${V.sortie !== 'gif' ? 'on' : ''}" onclick="anSet('sortie','video')">Vidéo (avec musique)</button><button type="button" class="${V.sortie === 'gif' ? 'on' : ''}" onclick="anSet('sortie','gif')">GIF animé (sans son)</button></div>
          ${V.sortie === 'gif' ? `<label>Taille du GIF</label>${pills(AN_GIF.map(q => [q[0], q[1] + ' (' + q[2] + ' px)']), V.gif, "anSet.bind(null,'gif')")}<div class="ag-hint">Un GIF est plus lourd qu'une vidéo et n'a pas de son : garde-le court (5 à 8 s).</div>`
            : `<label>Qualité</label><div class="cr-qual">${AN_QUAL.map(([k, nom, px, br, d]) => `<button type="button" class="${V.qualite === k ? 'on' : ''}" onclick="anSet('qualite','${k}')"><b>${nom}</b><small>${d}</small></button>`).join('')}</div>
              <div class="cr-taille">${(() => { const q = AN_QUAL.find(x => x[0] === V.qualite) || AN_QUAL[1]; const d = crDims(CR.fmt, q[2] / 1080); return `<b>${d.w} x ${d.h} px</b> · ${anFormatNom()} · environ ${Math.max(1, Math.round(q[3] * plan.D / 8e6))} Mo`; })()}</div>`}
          <div class="cr-actions" style="margin-top:10px"><button class="btn-primary" ${AN.busy ? 'disabled' : ''} onclick="anExporter('partager')">${agIcon('share', 16)} ${AN.busy ? anProgresTxt() : 'Créer et partager'}</button><button class="btn-secondary" ${AN.busy ? 'disabled' : ''} onclick="anExporter('telecharger')">${agIcon('download', 16)} Télécharger</button></div>
          ${AN.busy ? `<div class="an-prog"><i style="width:${Math.round(AN.progres * 100)}%"></i></div><div class="ag-hint">Garde l'écran allumé et l'app ouverte pendant la création.</div>` : ''}
        </details>
        <details class="cr-bloc" open><summary>Musique</summary>
          ${V.musique ? `<div class="an-mus"><b>♪ ${crE(V.musique.nom)}</b><small>${Math.round(V.musique.duree)} s</small><button class="st-link" onclick="anRetirerMusique()">Retirer</button></div>
            <canvas id="anOnde" class="an-onde"></canvas>
            <label>Début de l'extrait : <b id="anDebutTxt">${anMinSec(V.debut)}</b></label><input type="range" min="0" max="${Math.max(0, V.musique.duree - V.duree).toFixed(1)}" step="0.1" value="${V.debut}" oninput="anDebut(this.value)">
            <label>Volume</label><input type="range" min="0.1" max="1" step="0.05" value="${V.volume}" oninput="anVid().volume=Number(this.value);if(AN.audio)AN.audio.volume=Number(this.value)">
            <label class="ag-check"><input type="checkbox" ${V.fondu ? 'checked' : ''} onchange="anVid().fondu=this.checked"> Fondu au début et à la fin</label>
            <label class="ag-check"><input type="checkbox" ${V.sync ? 'checked' : ''} onchange="anSet('sync',this.checked)"> Caler les photos sur le rythme (${AN.beats.length} temps forts trouvés)</label>`
            : `<button class="btn-secondary" style="width:100%;margin:4px 0" onclick="document.getElementById('anMusFile').click()">♪ Choisir une musique sur mon téléphone</button>
              <div class="ag-hint">N'importe quelle musique (MP3, M4A...). Tu choisis ensuite le passage. Sur Facebook, une musique connue peut être coupée pour les droits : pour TikTok et Reels, tu peux aussi ajouter le son directement dans l'app.</div>`}
          <input type="file" id="anMusFile" accept="audio/*" style="display:none" onchange="anChoisirMusique(this.files)">
        </details>
        <details class="cr-bloc" open><summary>Durée et format</summary>
          <label>Durée totale : <b id="anDureeTxt">${V.duree} s</b></label><input type="range" min="4" max="60" step="1" value="${V.duree}" oninput="anDuree(this.value)">
          <label>Format</label>${pills(M.fmts.map(f => [f, CR_FMT[f].nom]), CR.fmt, "anFmt")}
          <label class="ag-check"><input type="checkbox" ${V.fin ? 'checked' : ''} onchange="anSet('fin',this.checked)"> Carte de fin : logo, « ${crE(c.appel || 'Réserve ta séance')} », contact</label>
        </details>
        <details class="cr-bloc"><summary>Textes</summary>
          ${champ('titre', M.k === 'v-titre' ? 'Mot ou titre animé' : 'Titre au début', 'Ex : Le mariage de Awa')}
          ${champ('sous', 'Petite phrase sous le titre', 'Ex : Bouaké, octobre')}
          ${M.k === 'v-titre' ? '' : champ('mot', 'Grand texte créatif (facultatif)', 'Ex : PHOTOGRAPHIE')}
          ${champ('appel', 'Carte de fin : appel', 'Réserve ta séance')}
          ${champ('contact', 'Carte de fin : contact', 'WhatsApp 07 00 00 00 00')}
        </details>
        <details class="cr-bloc"><summary>Effets créatifs</summary>${crEffetsHtml(Object.assign({}, M, { min: 0 }))}</details>
        <button class="btn-ghost" style="width:100%;margin-top:8px;display:flex;align-items:center;justify-content:center;gap:6px" onclick="anStop();CR.vue='photos';crRender()">${agIcon('image', 15)} Changer les photos</button>
      </div>
    </div>`;
}
function anMinSec(t){ t = Math.max(0, Number(t) || 0); return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`; }
function anFormatNom(){ return anMime().ext === 'mp4' ? 'MP4' : 'WebM'; }
function anProgresTxt(){ return AN.busy === 'gif' ? `GIF ${Math.round(AN.progres * 100)} %` : `Vidéo ${Math.round(AN.progres * 100)} %`; }
function anSet(k, v){ anVid()[k] = v; if(k === 'sync') AN.plan = null; crRender(); }
function anFmt(f){ CR.fmt = f; crRender(); }
function anDuree(v){ const V = anVid(); V.duree = Number(v); const el = document.getElementById('anDureeTxt'); if(el) el.textContent = V.duree + ' s'; if(V.musique){ V.debut = Math.min(V.debut, Math.max(0, V.musique.duree - V.duree)); anCalculerBeats(); } clearTimeout(anDuree.t); anDuree.t = setTimeout(crRender, 350); }
function anDebut(v){ const V = anVid(); V.debut = Number(v); const el = document.getElementById('anDebutTxt'); if(el) el.textContent = anMinSec(V.debut); anCalculerBeats(); anDessinerOnde(); if(AN.lecture) anAller(AN.t); }
function anRetirerMusique(){ if(AN.audio){ AN.audio.pause(); } AN.audio = null; AN.buffer = null; AN.beats = []; const V = anVid(); V.musique = null; V.debut = 0; crRender(); }

// ---------- Aperçu (lecture) ----------
let AN_IMGS = [], AN_LOGO = null;
async function anPreparer(hd){
  AN_IMGS = await Promise.all(CR.photos.map(p => (hd ? crImageHD(p) : crImage(p)).catch(() => null)));
  AN_LOGO = CR.cfg.logo ? await crLogo() : null;
  const e = CR.cfg.effets || {}; if(e.perso) await crEffetImage(e.perso);
  if(CR.cfg.mot || anModele(CR.modele).k === 'v-titre'){ crPolicesCreaLien(); const pc = CR_POLICES_CREA[CR.cfg.motPolice] || CR_POLICES_CREA.pinceau; if(pc.f){ try { await Promise.race([document.fonts.load(`400 100px "${pc.f}"`), new Promise(r => setTimeout(r, 2500))]); } catch(er){} } }
  if(typeof stFontsReady === 'function'){ try { await stFontsReady(crPolice()); } catch(er){} }
}
async function anDemarrerApercu(){
  await anPreparer(false);
  AN.plan = anPlan();
  anDessinerOnde();
  anApercuUneFois();
}
function anApercuUneFois(){
  const cv = document.getElementById('anCanvas'); if(!cv) return;
  AN.plan = anPlan();
  const g = cv.getContext('2d'), s = Math.min(cv.width, cv.height) / 1080;
  try { anImage(g, cv.width, cv.height, s, AN.t, AN_IMGS, AN.plan, AN_LOGO); } catch(e){ console.warn('anim', e); }
  const tx = document.getElementById('anTemps'); if(tx) tx.textContent = `${AN.t.toFixed(1).replace('.', ',')} / ${AN.plan.D.toFixed(0)} s`;
  const sc = document.getElementById('anScrub'); if(sc && document.activeElement !== sc) sc.value = AN.t;
}
function anLecture(){
  if(AN.lecture){ anStop(); return; }
  AN.lecture = true;
  const D = anPlan().D; if(AN.t >= D - 0.05) AN.t = 0;
  AN.debutLecture = performance.now() - AN.t * 1000;
  const V = anVid();
  if(AN.audio){ AN.audio.currentTime = V.debut + AN.t; AN.audio.volume = V.volume; AN.audio.play().catch(() => {}); }
  const b = document.getElementById('anPlay'); if(b) b.textContent = '❚❚';
  const tour = () => {
    if(!AN.lecture) return;
    AN.t = (performance.now() - AN.debutLecture) / 1000;
    if(AN.t >= D){ AN.t = D; anApercuUneFois(); anStop(); return; }
    anApercuUneFois();
    AN.raf = requestAnimationFrame(tour);
  };
  AN.raf = requestAnimationFrame(tour);
}
function anStop(){
  AN.lecture = false; cancelAnimationFrame(AN.raf);
  if(AN.audio) AN.audio.pause();
  const b = document.getElementById('anPlay'); if(b) b.textContent = '▶';
}
function anAller(v){
  AN.t = Number(v);
  if(AN.lecture){ AN.debutLecture = performance.now() - AN.t * 1000; if(AN.audio) AN.audio.currentTime = anVid().debut + AN.t; }
  anApercuUneFois();
}

// ---------- Export vidéo ----------
function anMime(){
  // MP4 en H.264 d'abord (lu partout : iPhone, WhatsApp, Facebook, TikTok), sinon WebM.
  // "video/mp4" sans précision n'est pris que sur Safari (ailleurs ce peut être du VP9 que l'iPhone ne lit pas).
  const safari = /Safari/.test(navigator.userAgent) && !/Chrome|Chromium|Android/.test(navigator.userAgent);
  const l = [['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'mp4'], ['video/mp4;codecs=avc1.4D401F,mp4a.40.2', 'mp4'], ['video/mp4;codecs=avc1', 'mp4']]
    .concat(safari ? [['video/mp4', 'mp4']] : [])
    .concat([['video/webm;codecs=vp9,opus', 'webm'], ['video/webm;codecs=vp8,opus', 'webm'], ['video/webm', 'webm']]);
  if(typeof MediaRecorder === 'undefined') return { type: '', ext: 'webm' };
  const t = l.find(x => { try { return MediaRecorder.isTypeSupported(x[0]); } catch(e){ return false; } });
  return t ? { type: t[0], ext: t[1] } : { type: '', ext: 'webm' };
}
async function anVideo(){
  const V = anVid(), q = AN_QUAL.find(x => x[0] === V.qualite) || AN_QUAL[1];
  const d = crDims(CR.fmt, q[2] / 1080);
  await anPreparer(q[2] > 1080);
  const plan = anPlan();
  const cv = document.createElement('canvas'); cv.width = d.w; cv.height = d.h;
  const g = cv.getContext('2d'), s = Math.min(d.w, d.h) / 1080;
  anImage(g, d.w, d.h, s, 0, AN_IMGS, plan, AN_LOGO);
  const flux = cv.captureStream(30);
  let ctx = null, src = null;
  if(AN.buffer){
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const dest = ctx.createMediaStreamDestination(), gain = ctx.createGain();
    src = ctx.createBufferSource(); src.buffer = AN.buffer;
    src.connect(gain); gain.connect(dest);
    const t0 = ctx.currentTime + 0.15, vol = V.volume;
    gain.gain.setValueAtTime(V.fondu ? 0.0001 : vol, t0);
    if(V.fondu){ gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.8); gain.gain.setValueAtTime(vol, t0 + plan.D - 1.2); gain.gain.exponentialRampToValueAtTime(0.0001, t0 + plan.D); }
    src.start(t0, V.debut, plan.D + 0.2);
    dest.stream.getAudioTracks().forEach(tr => flux.addTrack(tr));
  }
  const mm = anMime();
  const rec = new MediaRecorder(flux, Object.assign({ videoBitsPerSecond: q[3], audioBitsPerSecond: 160000 }, mm.type ? { mimeType: mm.type } : {}));
  const morceaux = [];
  rec.ondataavailable = e => { if(e.data && e.data.size) morceaux.push(e.data); };
  const fini = new Promise(ok => { rec.onstop = ok; });
  await new Promise(r => setTimeout(r, 150));
  rec.start(250);
  const debut = performance.now();
  await new Promise(ok => {
    const tour = () => {
      const t = (performance.now() - debut) / 1000;
      anImage(g, d.w, d.h, s, Math.min(t, plan.D), AN_IMGS, plan, AN_LOGO);
      AN.progres = Math.min(1, t / plan.D); anMajProgres();
      if(t >= plan.D + 0.1) return ok();
      requestAnimationFrame(tour);
    };
    requestAnimationFrame(tour);
  });
  rec.stop(); await fini;
  try { if(src) src.stop(); if(ctx) ctx.close(); } catch(e){}
  flux.getTracks().forEach(tr => tr.stop());
  const blob = new Blob(morceaux, { type: (mm.type || 'video/webm').split(';')[0] });
  return { blob, nom: `${anNomFichier()}-${d.w}x${d.h}.${mm.ext}`, type: blob.type };
}
// ---------- Export GIF (bibliothèque gifenc, dans l'app) ----------
async function anGif(){
  const V = anVid(), q = AN_GIF.find(x => x[0] === V.gif) || AN_GIF[1];
  const d = crDims(CR.fmt, q[2] / 1080);
  await anPreparer(false);
  const plan = anPlan();
  const { GIFEncoder, quantize, applyPalette } = await import('./gifenc.esm.js');
  const cv = document.createElement('canvas'); cv.width = d.w; cv.height = d.h;
  const g = cv.getContext('2d', { willReadFrequently: true }), s = Math.min(d.w, d.h) / 1080;
  const fps = q[3], n = Math.ceil(plan.D * fps), gif = GIFEncoder();
  for(let i = 0; i < n; i++){
    anImage(g, d.w, d.h, s, i / fps, AN_IMGS, plan, AN_LOGO);
    const data = g.getImageData(0, 0, d.w, d.h).data;
    const pal = quantize(data, 256, { format: 'rgb565' });
    gif.writeFrame(applyPalette(data, pal, 'rgb565'), d.w, d.h, { palette: pal, delay: Math.round(1000 / fps) });
    AN.progres = (i + 1) / n; if(i % 2 === 0){ anMajProgres(); await new Promise(r => setTimeout(r, 0)); }
  }
  gif.finish();
  const blob = new Blob([gif.bytes()], { type: 'image/gif' });
  return { blob, nom: `${anNomFichier()}-${d.w}x${d.h}.gif`, type: 'image/gif' };
}
function anNomFichier(){ return (typeof mkSlug === 'function' ? mkSlug(CR.cfg.titre || anModele(CR.modele).nom) : 'video'); }
function anMajProgres(){
  const b = document.querySelector('.an-prog i'); if(b) b.style.width = Math.round(AN.progres * 100) + '%';
  const bt = document.querySelector('.cr-panneau .btn-primary'); if(bt && AN.busy) bt.textContent = anProgresTxt();
}
async function anExporter(mode){
  if(AN.busy) return;
  anStop();
  const V = anVid();
  if(V.sortie !== 'gif' && (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream)){ agAlert("Ce navigateur ne sait pas créer de vidéo. Essaie avec Chrome, ou choisis GIF."); return; }
  AN.busy = V.sortie === 'gif' ? 'gif' : 'video'; AN.progres = 0; crRender();
  try {
    const f = AN.busy === 'gif' ? await anGif() : await anVideo();
    const file = new File([f.blob], f.nom, { type: f.type });
    if(mode === 'partager' && navigator.canShare && navigator.canShare({ files: [file] })){
      try { await navigator.share({ files: [file], title: CR.cfg.titre || crNom() }); } catch(e){ if(e && e.name !== 'AbortError') throw e; }
    } else {
      const a = document.createElement('a'); a.href = URL.createObjectURL(f.blob); a.download = f.nom; document.body.appendChild(a); a.click(); a.remove();
      agToast(`${AN.busy === 'gif' ? 'GIF' : 'Vidéo'} prêt${AN.busy === 'gif' ? '' : 'e'} : ${(f.blob.size / 1e6).toFixed(1).replace('.', ',')} Mo`);
    }
    try { await sb.from('creations').insert({ kind: 'creation', nom: CR.cfg.titre || anModele(CR.modele).nom, modele: CR.modele, config: Object.assign(crConfigPour(true), { vid: Object.assign({}, V, { musique: V.musique ? { nom: V.musique.nom } : null }) }), apercu: anMini(), shoot_id: CR.shoot_id || null }); } catch(e){}
  } catch(e){ agAlert('Création impossible : ' + (e.message || e)); }
  AN.busy = ''; crRender();
}
function anMini(){
  const cv = document.getElementById('anCanvas'); if(!cv) return null;
  const k = 260 / Math.max(cv.width, cv.height), c = document.createElement('canvas'); c.width = Math.round(cv.width * k); c.height = Math.round(cv.height * k);
  c.getContext('2d').drawImage(cv, 0, 0, c.width, c.height);
  try { return c.toDataURL('image/jpeg', 0.7); } catch(e){ return null; }
}

(function anCss(){
  if(document.getElementById('anCss')) return;
  const st = document.createElement('style'); st.id = 'anCss';
  st.textContent = `
.an-lect{display:flex;align-items:center;gap:10px;margin-top:10px}
.an-play{width:44px;height:44px;flex:none;margin:0;padding:0;border-radius:50%;border:0;background:var(--accent);color:#fff;font-size:16px;cursor:pointer}
.an-lect input{flex:1;margin:0;padding:0}
.an-lect span{font-size:12px;color:var(--muted);white-space:nowrap;min-width:70px;text-align:right}
.an-mus{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:12px;background:var(--card2);margin-bottom:8px}
.an-mus b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text)}
.an-mus small{color:var(--muted)}
.an-onde{width:100%;height:60px;display:block;border-radius:10px;background:var(--card2)}
.an-prog{height:8px;border-radius:6px;background:var(--card2);overflow:hidden;margin-top:10px}
.an-prog i{display:block;height:100%;width:0;background:var(--accent);transition:width .2s}`;
  document.head.appendChild(st);
})();
