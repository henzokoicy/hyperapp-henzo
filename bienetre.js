// ============================================================
// BIENETRE.JS - Bien-être de Henzo (onglet Coach)
// ------------------------------------------------------------
// - SOMMEIL (le coeur) : on planifie le prochain coucher ; à l'heure, l'écran
//   INSISTE ("il est l'heure, va te coucher") et des rappels de plus en plus
//   fermes partent sur le téléphone. Si tu ne respectes pas l'heure, tu notes
//   l'heure réelle + le motif. Au réveil, diagnostic + comment rattraper.
//   Mode "le sommeil ne vient pas" : film/audio avec minuterie, respiration,
//   vider sa tête. L'app retient ce qui t'endort vraiment.
// - REPAS : calories par photo (IA), texte, recherche d'aliment, favoris.
// - CORPS : poids, eau, caféine (coupure selon ton coucher), sport.
// - MENTAL : humeur/énergie, gratitude, respiration, pauses.
// - BILAN : analyse de la semaine + conseils recherchés (IA).
// Conseils de bien-être uniquement, pas de conseil médical.
// Données : user_settings.user_preferences.bienetre_data (+ copie locale).
// Rappels : table reminders (envoyés même app fermée).
// ============================================================
(function(){
'use strict';
if(typeof CO === 'undefined' || typeof CO_TABS === 'undefined') return;

const KEY = 'bienetre_data';
const BE = { loaded: false, sub: 'sommeil', data: null, busy: false, mode: 'texte', estim: null, res: [], resp: null, ov: null, force: false };
window.BE = BE;

const E = s => (typeof coE === 'function' ? coE(s) : String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
const p2 = n => String(n).padStart(2, '0');
const hhmm = d => p2(d.getHours()) + ':' + p2(d.getMinutes());
const idU = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const enMin = h => { const m = /^(\d{1,2}):(\d{2})$/.exec(h || ''); return m ? +m[1] * 60 + +m[2] : null; };
const dureeTxt = m => { m = Math.round(m); const a = Math.abs(m); return (a >= 60 ? Math.floor(a / 60) + ' h' + (a % 60 ? p2(a % 60) : '') : a + ' min'); };
// Un "jour" commence à 5 h : à 2 h du matin, on est encore dans la journée d'hier
const isoDe = d => { const x = new Date(d.getTime() - 5 * 36e5); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
const jourBE = () => isoDe(new Date());
const jourLong = iso => new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const jourCourt = iso => new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
const num = (v, d) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : (d == null ? 0 : d); };
const toast = (m, t) => { if(typeof coToast === 'function') coToast(m, t); };
const erreur = e => { if(typeof coErr === 'function') coErr(e); else alert((e && e.message) || e); };
const beR = () => { BE.force = true; setTimeout(() => { try { rendreAccueil(); } catch(e){} }, 0); return coRender(); };
window.beR = beR;
// prochaine fois que l'horloge affiche HH:MM
function prochaineHeure(hm){
  const m = enMin(hm); if(m == null) return null;
  const d = new Date(); d.setHours(Math.floor(m / 60), m % 60, 0, 0);
  if(d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d;
}

// ---------- Données ----------
function defaut(){
  return {
    profil: { ok: false, sexe: 'h', age: '', taille: '', poids: '', cible: '', rythme: 0.5, activite: 1.375, regime: '', allergies: '', sante: '', budget: '', temps: '' },
    poids: [], repas: {}, favoris: [], eau: {}, cafe: {}, sport: {}, humeur: {}, journal: {},
    sommeil: { minH: 7, rappelsOn: true, prochain: null, encours: null, nuits: [], aides: {} },
    notifs: { on: true }, rappels: {}, pauses: { on: false, every: 50, last: 0 }, bilan: null
  };
}
function normaliser(d){
  const b = defaut(); d = d && typeof d === 'object' ? d : {};
  const r = Object.assign(b, d);
  r.profil = Object.assign(b.profil, d.profil || {}); r.sommeil = Object.assign(defaut().sommeil, d.sommeil || {});
  r.notifs = Object.assign({ on: true }, d.notifs || {}); r.pauses = Object.assign({ on: false, every: 50, last: 0 }, d.pauses || {});
  ['poids', 'favoris'].forEach(k => { if(!Array.isArray(r[k])) r[k] = []; });
  ['repas', 'eau', 'cafe', 'sport', 'humeur', 'journal', 'rappels'].forEach(k => { if(!r[k] || typeof r[k] !== 'object') r[k] = {}; });
  if(!Array.isArray(r.sommeil.nuits)) r.sommeil.nuits = [];
  return r;
}
const lireLocal = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch(e){ return null; } };
async function charger(){
  if(BE.loaded) return;
  BE.data = normaliser(lireLocal());
  try {
    const u = (await sb.auth.getUser()).data.user;
    if(u){
      const { data } = await sb.from('user_settings').select('user_preferences').eq('user_id', u.id).maybeSingle();
      const cloud = data && data.user_preferences && data.user_preferences[KEY];
      if(cloud && (!lireLocal() || String(cloud.maj || '') >= String((lireLocal() || {}).maj || ''))) BE.data = normaliser(cloud);
    }
  } catch(e){ console.warn('bienetre charger', e); }
  BE.loaded = true;
}
let tmSave = null;
function sauver(){
  BE.data.maj = new Date().toISOString();
  try { localStorage.setItem(KEY, JSON.stringify(BE.data)); } catch(e){}
  clearTimeout(tmSave);
  tmSave = setTimeout(async () => {
    try {
      const u = (await sb.auth.getUser()).data.user; if(!u) return;
      const { data } = await sb.from('user_settings').select('id,user_preferences').eq('user_id', u.id).maybeSingle();
      const prefs = Object.assign({}, (data && data.user_preferences) || {}, { [KEY]: BE.data });
      if(data) await sb.from('user_settings').update({ user_preferences: prefs }).eq('id', data.id);
      else await sb.from('user_settings').upsert({ user_id: u.id, user_preferences: prefs }, { onConflict: 'user_id' });
    } catch(e){ console.warn('bienetre sauver', e); }
  }, 600);
}

// ---------- Calculs corps ----------
// Ce que tu ne sais pas est estimé (et signalé), jamais inventé en silence
function valeurs(){
  const P = BE.data.profil, w = num(P.poids, 0) >= 30 ? num(P.poids) : 70, est = [];
  let h = num(P.taille, 0), a = num(P.age, 0), c = num(P.cible, 0);
  if(h < 120 || h > 230){ h = P.sexe === 'f' ? 163 : 172; est.push('taille ' + h + ' cm'); }
  if(a < 14 || a > 100){ a = 30; est.push('âge 30 ans'); }
  if(c < 30 || c >= w){ if(c >= w && c) est.push('objectif au-dessus de ton poids, remplacé'); c = Math.round(w * 0.93 * 2) / 2; est.push('premier objectif ' + c + ' kg (−7 %)'); }
  return { w, h, a, c, est };
}
const cibleKg = () => valeurs().c;
function cibles(){
  const P = BE.data.profil, V = valeurs(), w = V.w, h = V.h, a = V.a;
  const bmr = 10 * w + 6.25 * h - 5 * a + (P.sexe === 'f' ? -161 : 5);
  const tdee = bmr * num(P.activite, 1.375);
  const rythme = Math.min(num(P.rythme, 0.5), Math.max(0.25, w * 0.01)); // jamais plus de 1 % du poids par semaine
  const plancher = P.sexe === 'f' ? 1200 : 1500;
  const kcal = Math.max(plancher, Math.round((tdee - rythme * 7700 / 7) / 10) * 10);
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), kcal, prot: Math.round(1.6 * w), eau: Math.round(w * 35 / 50) * 50, rythme,
    semaines: w > V.c ? Math.ceil((w - V.c) / rythme) : 0, est: V.est };
}
const poidsActuel = () => { const l = BE.data.poids.slice().sort((a, b) => a.d < b.d ? -1 : 1).pop(); return l ? l.kg : num(BE.data.profil.poids, 0); };
function totalJour(iso){
  const r = BE.data.repas[iso] || [];
  return r.reduce((t, x) => ({ kcal: t.kcal + (x.kcal || 0), p: t.p + (x.p || 0), g: t.g + (x.g || 0), l: t.l + (x.l || 0) }), { kcal: 0, p: 0, g: 0, l: 0 });
}

// ---------- Sommeil : logique ----------
const S = () => BE.data.sommeil;
const dernierNuit = () => S().nuits.find(n => n.duree != null) || null;
function retardMin(){ const p = S().prochain; return p && !p.logged ? Math.floor((Date.now() - new Date(p.at).getTime()) / 60000) : null; }
const MOTIFS = ['Travail / retouche', 'Développement / recherches', 'Film / téléphone', 'Pas sommeil', 'Social / sorti', 'Autre'];
function messageRetard(n){
  if(n < 5) return ['IL EST L\'HEURE.', 'Pose tout. Sauvegarde. Va te coucher.'];
  if(n < 15) return ['Tu es déjà en retard.', 'Ferme l\'ordinateur. Ce que tu fais peut attendre demain.'];
  if(n < 30) return [n + ' minutes de retard.', 'Chaque minute maintenant, c\'est du sommeil en moins pour demain. Va dormir.'];
  if(n < 60) return ['Une demi-heure de retard.', 'Ton toi de demain te demande de dormir. Sauvegarde et éteins.'];
  return ['Stop. ' + dureeTxt(n) + ' de retard.', 'Rien de ce que tu fais ne vaut une nuit foutue. Éteins tout et couche-toi, maintenant.'];
}
function setProchain(date, minH){
  const s = S(); s.minH = minH || s.minH || 7;
  s.prochain = { at: date.toISOString(), logged: false, snooze: 0 };
  sauver(); syncRappels();
}
function logCoucher(coucherDate, motif){
  const s = S(), p = s.prochain, prevu = p ? new Date(p.at) : null;
  const n = { id: idU(), jour: isoDe(coucherDate), prevu: prevu ? prevu.toISOString() : null, coucher: coucherDate.toISOString(),
    ecart: prevu ? Math.round((coucherDate - prevu) / 60000) : 0, motif: motif || '', duree: null };
  s.nuits.unshift(n); s.encours = n.id;
  if(p){ p.logged = true; }
  sauver(); syncRappels();
  return n;
}
function enCours(){ const s = S(); return s.encours ? s.nuits.find(n => n.id === s.encours) : null; }

// Diagnostic local (sert aussi de secours sans IA)
function diagLocal(n){
  const cible = S().minH * 60, d = n.duree, manque = cible - d, out = {};
  out.verdict = manque <= 30 ? 'ok' : manque <= 90 ? 'moyen' : 'a_rattraper';
  const ecartTxt = n.ecart > 10 ? `Tu t'es couché avec ${dureeTxt(n.ecart)} de retard${n.motif ? ' (' + n.motif.toLowerCase() + ')' : ''}. ` : n.ecart < -10 ? `Tu t'es couché ${dureeTxt(n.ecart)} en avance : bien. ` : 'Heure de coucher respectée : bien. ';
  out.diagnostic = ecartTxt + `Tu as dormi environ ${dureeTxt(d)} sur ${dureeTxt(cible)} visées` + (manque > 30 ? ` : il manque ${dureeTxt(manque)}.` : ' : c\'est suffisant.');
  if(manque > 30){
    out.sieste = manque >= 90 ? { duree: 90, debut: 'dans les 8 h après ton réveil' } : { duree: 25, debut: 'en début d\'après-midi' };
    out.rattrapage = `Fais une sieste de ${out.sieste.duree} min ${out.sieste.debut}, pas plus tard. Ce soir, couche-toi ${dureeTxt(Math.min(manque, 60))} plus tôt que d'habitude, et coupe la caféine plus tôt. Ne cherche pas à tout rattraper en une fois : deux nuits correctes valent mieux qu'une grasse matinée de 12 h.`;
  } else out.rattrapage = 'Rien à rattraper. Garde le même rythme ce soir.';
  return out;
}
async function diagIA(n){
  if(typeof window.mkAI !== 'function') return null;
  const s = S(), hist = s.nuits.slice(0, 7).map(x => `${jourCourt(x.jour)} : prévu ${x.prevu ? hhmm(new Date(x.prevu)) : '?'}, couché ${hhmm(new Date(x.coucher))}${x.motif ? ' (' + x.motif + ')' : ''}${x.duree != null ? ', dormi ' + dureeTxt(x.duree) : ''}`).join('\n');
  const sys = `Tu es le coach sommeil de Henzo, photographe et créatif qui travaille surtout la nuit (retouche, recherches, développement web, portfolio) et finit souvent entre 5 h et 9 h du matin. Son rythme est décalé et variable : tu ne le ramènes PAS de force à un horaire de bureau, tu l'aides à dormir assez (objectif ${s.minH} h par 24 h, sieste comprise) à des heures aussi régulières que possible. Ton ton : franc, chaleureux, un peu exigeant, jamais culpabilisant. Pas de conseil médical : si les problèmes durent, tu suggères d'en parler à un professionnel.
Réponds UNIQUEMENT en JSON : {"verdict":"ok|moyen|a_rattraper","diagnostic":"2-3 phrases : ce qui s'est passé et si c'est grave ou non","rattrapage":"2-4 phrases concrètes : quand dormir, sieste, caféine, quoi alléger","coucher":"HH:MM (heure de coucher conseillée pour la prochaine fois)","sieste":{"debut":"HH:MM","duree":minutes}|null,"mot":"une phrase d'encouragement"}`;
  const q = `Dernière nuit : prévu ${n.prevu ? hhmm(new Date(n.prevu)) : '?'}, couché à ${hhmm(new Date(n.coucher))} (écart ${n.ecart} min${n.motif ? ', motif : ' + n.motif : ''}), réveil ${hhmm(new Date(n.reveil))}, ${n.latence != null ? 'mis ' + n.latence + ' min à s\'endormir, ' : ''}durée dormie estimée ${dureeTxt(n.duree)}.\nHistorique :\n${hist}`;
  const r = await window.mkAI({ system: sys, messages: [{ role: 'user', text: q }], maxTokens: 900 });
  const j = typeof mkJson === 'function' ? mkJson(r.text) : JSON.parse(r.text);
  if(!j || !j.diagnostic) return null;
  return j;
}
async function logReveil(hm, latence, aide){
  const n = enCours(); if(!n) return;
  let rv = new Date(); const m = enMin(hm);
  if(m != null){ rv.setHours(Math.floor(m / 60), m % 60, 0, 0); if(rv < new Date(n.coucher)) rv.setDate(rv.getDate() + 1); if(rv > new Date(Date.now() + 36e5)) rv.setDate(rv.getDate() - 1); }
  n.reveil = rv.toISOString(); n.latence = latence; n.aide = aide || '';
  n.duree = Math.max(0, Math.round((rv - new Date(n.coucher)) / 60000) - (latence || 0));
  if(aide){ S().aides[aide] = S().aides[aide] || { oui: 0 }; S().aides[aide].oui++; }
  S().encours = null;
  n.diag = diagLocal(n); sauver(); beR();
  try { const j = await diagIA(n); if(j){ n.diag = Object.assign(n.diag, j); n.diagIA = true; sauver(); } } catch(e){ console.warn('diag IA', e); }
  beR();
}
// Proposer le prochain coucher à partir du conseil
window.beAppliquerCoucher = function(id){
  const n = S().nuits.find(x => x.id === id); if(!n || !n.diag) return;
  const hm = /^\d{1,2}:\d{2}$/.test(n.diag.coucher || '') ? n.diag.coucher : '';
  S().formCoucher = hm || S().formCoucher; BE.sub = 'sommeil'; BE.planOuvert = true; beR();
  toast(hm ? `Coucher conseillé : ${hm}. Vérifie et valide ci-dessous.` : 'Choisis ton prochain coucher ci-dessous.');
};

// ---------- Rappels (table reminders) ----------
const BOOST = [
  'Tu avances, même quand ça ne se voit pas. Un verre d\'eau et on y va 💪',
  'Prendre soin de toi, c\'est la base de tout ce que tu crées. Bonne journée Henzo.',
  'Petit pas aujourd\'hui, gros résultat dans un mois. Tiens ton plan.',
  'Ton corps est ton premier outil de travail. Traite-le comme ton meilleur matériel 📷',
  'Un repas simple et propre vaut mieux qu\'un repas parfait que tu ne fais pas.',
  'Tu n\'as pas besoin d\'être parfait, juste régulier. Aujourd\'hui, on coche.',
  'Les créatifs fatigués font du travail moyen. Les créatifs reposés font des chefs-d\'œuvre.',
  'Chaque choix sain est un vote pour la personne que tu deviens ✨'
];
function planRappels(){
  const s = S(), p = s.prochain, out = [];
  if(!p) return out;
  const nuit = p.logged ? enCours() : null;
  if(p.logged && !nuit) return out;
  const at = new Date(p.logged ? nuit.coucher : p.at), mn = x => new Date(at.getTime() + x * 60000);
  if(!p.logged && s.rappelsOn !== false){
    out.push({ k: 'c-45', at: mn(-45), txt: '🌙 Dans 45 min, c\'est l\'heure de te coucher. Fini la caféine, termine ce que tu fais.' });
    out.push({ k: 'c-15', at: mn(-15), txt: '⏰ 15 min avant le coucher : sauvegarde ton travail, prépare-toi à éteindre.' });
    out.push({ k: 'c0', at: mn(0), txt: '🛏️ IL EST L\'HEURE. Pose tout et va te coucher. Maintenant.' });
    out.push({ k: 'c10', at: mn(10), txt: '🛏️ Tu es en retard de 10 min. Ferme l\'ordinateur et couche-toi.' });
    out.push({ k: 'c25', at: mn(25), txt: '🚨 25 min de retard. Ton sommeil d\'abord, le travail sera là demain.' });
    out.push({ k: 'c45', at: mn(45), txt: '🚨 45 min de retard. Stop. Éteins tout et dors.' });
  }
  if(BE.data.notifs.on){
    const rv = new Date(at.getTime() + (s.minH || 7) * 3600000 + 20 * 60000);
    const b = BOOST[(rv.getDate() + rv.getMonth()) % BOOST.length];
    out.push({ k: 'm', at: new Date(rv.getTime() + 20 * 60000), txt: '☀️ Bien dormi ? Verre d\'eau d\'abord, puis ton premier repas. ' + b });
    out.push({ k: 'r', at: new Date(rv.getTime() + 4 * 3600000), txt: '🍽️ Pense à manger et à boire. 5 min d\'étirements, regarde au loin 20 secondes.' });
    out.push({ k: 's', at: new Date(rv.getTime() + 9 * 3600000), txt: '📓 Check-in rapide : comment tu te sens ? Note aussi une chose dont tu es fier aujourd\'hui.' });
    if(!p.logged) out.push({ k: 'j', at: mn(-100), txt: '🧘 Il reste moins de 2 h avant ton coucher. Dernier café maintenant, puis plus rien de stimulant.' });
  }
  return out.filter(x => x.at.getTime() > Date.now() + 30000);
}
let syncEnCours = false;
async function syncRappels(){
  if(syncEnCours || typeof dbInsert !== 'function') return;
  syncEnCours = true;
  try {
    const veut = planRappels(), R = BE.data.rappels, vus = new Set();
    for(const v of veut){
      vus.add(v.k); const due = v.at.toISOString(), ex = R[v.k];
      if(ex && ex.txt === v.txt && ex.due === due) continue;
      if(ex && ex.id){ try { await sb.from('reminders').delete().eq('id', ex.id); } catch(e){} }
      const row = await dbInsert('reminders', { text: v.txt, time: hhmm(v.at), type: 'Journée', due_date: due, sent: false });
      if(row){ R[v.k] = { id: row.id, txt: v.txt, due }; if(typeof reminders !== 'undefined') reminders.push(row); } else delete R[v.k];
    }
    for(const k of Object.keys(R)){
      if(vus.has(k)) continue;
      try { await sb.from('reminders').delete().eq('id', R[k].id); if(typeof reminders !== 'undefined') reminders = reminders.filter(r => r.id !== R[k].id); } catch(e){}
      delete R[k];
    }
    sauver();
  } catch(e){ console.warn('bienetre rappels', e); }
  syncEnCours = false;
}

// ---------- Plein écran : l'heure de dormir ----------
function ov(html, cls){
  let o = document.getElementById('beOv');
  if(!o){ o = document.createElement('div'); o.id = 'beOv'; document.body.appendChild(o); }
  o.className = 'be-ov ' + (cls || ''); o.innerHTML = html; BE.ov = cls || 'x';
}
function ovFermer(){ const o = document.getElementById('beOv'); if(o) o.remove(); BE.ov = null; clearTimeout(BE.tmResp); clearInterval(BE.tmMin); BE.resp = null; }
function ovCoucher(){
  const n = retardMin(); if(n == null) return;
  const [t1, t2] = messageRetard(n), p = S().prochain;
  ov(`<div class="be-ov-in"><h1>${E(t1)}</h1><p>${E(t2)}</p>
    <div class="be-ov-h">Prévu à ${hhmm(new Date(p.at))}${n > 0 ? ' · il est ' + hhmm(new Date()) : ''}</div>
    <button class="be-gros" onclick="beJeMeCouche()">Je me couche maintenant</button>
    <button class="be-lien" onclick="beCouchePlusTard()">J'ai une raison, je me couche plus tard…</button>
    ${p.snooze ? `<small>Déjà repoussé ${p.snooze} fois.</small>` : ''}</div>`, 'coucher');
}
window.beJeMeCouche = function(){ const n = retardMin(); logCoucher(new Date(), n != null && n > 10 ? 'Retard' : ''); ovBonneNuit(); };
window.beCouchePlusTard = function(){
  const o = document.getElementById('beOv'); if(!o) return;
  const dflt = hhmm(new Date(Date.now() + 30 * 60000));
  ov(`<div class="be-ov-in"><h2>Pas tout de suite ? Note-le honnêtement.</h2>
    <label>Tu comptes te coucher à quelle heure ?<input type="time" id="beHr" value="${dflt}"></label>
    <label>Pourquoi ?</label><div class="be-chips" id="beMotifs">${MOTIFS.map((m, i) => `<button type="button" onclick="beMotif(${i})">${E(m)}</button>`).join('')}</div>
    <div class="be-ov-h">Je te relance à l'heure que tu choisis.</div>
    <button class="be-gros" onclick="beReporter()">Valider, mais je me couche à cette heure-là</button>
    <button class="be-lien" onclick="ovCoucherRetour()">Non, je me couche maintenant</button></div>`, 'coucher');
  BE.motif = '';
};
window.ovCoucherRetour = ovCoucher;
window.beMotif = function(i){ BE.motif = MOTIFS[i]; document.querySelectorAll('#beMotifs button').forEach((b, k) => b.classList.toggle('on', k === i)); };
window.beReporter = function(){
  const hm = (document.getElementById('beHr') || {}).value, m = enMin(hm); if(m == null) return;
  const d = new Date(); d.setHours(Math.floor(m / 60), m % 60, 0, 0); if(d.getTime() < Date.now() - 60000) d.setDate(d.getDate() + 1);
  const p = S().prochain; p.snooze = (p.snooze || 0) + 1; p.motifs = (p.motifs || []).concat(BE.motif || 'Autre');
  p.reporteA = d.toISOString(); p.prochainRappel = d.getTime(); sauver(); ovFermer();
  toast('Noté. Je te relance à ' + hm + '.');
};
function ovBonneNuit(){
  const n = enCours(), late = n && n.ecart > 10;
  ov(`<div class="be-ov-in"><h2>${late ? 'Couché avec ' + dureeTxt(n.ecart) + ' de retard. C\'est noté.' : 'Bonne nuit Henzo.'}</h2>
    <p>${late ? 'Pas de culpabilité : on rattrape demain. Maintenant, dors.' : 'Pose le téléphone en dessous du niveau de ton visage, luminosité au minimum.'}</p>
    <button class="be-gros" onclick="beAide()">Je n'arrive pas à dormir</button>
    <button class="be-lien" onclick="ovFermerOuv()">Fermer, bonne nuit</button></div>`, 'nuit');
}
window.ovFermerOuv = function(){ ovFermer(); beR(); };
window.beAide = function(){
  const top = Object.entries(S().aides).sort((a, b) => b[1].oui - a[1].oui)[0];
  ov(`<div class="be-ov-in"><h2>Le sommeil ne vient pas ? Essayons.</h2>
    ${top ? `<div class="be-ov-h">Ce qui t'a le plus endormi jusqu'ici : <b>${E(top[0])}</b> (${top[1].oui} fois)</div>` : ''}
    <button class="be-opt" onclick="beResp('478')">Respiration 4-7-8 (3 minutes)</button>
    <button class="be-opt" onclick="beMinuteur()">Film ou audio avec minuterie</button>
    <button class="be-opt" onclick="beVider()">Vider ma tête (ça tourne dans mon cerveau)</button>
    <button class="be-opt" onclick="beTelPose()">Poser le téléphone 20 minutes</button>
    <button class="be-lien" onclick="ovFermerOuv()">Fermer</button></div>`, 'nuit');
};
const RESP = { '478': { nom: '4-7-8', ph: [['Inspire', 4], ['Retiens', 7], ['Expire doucement', 8]], cycles: 6 },
  'car': { nom: 'Carrée', ph: [['Inspire', 4], ['Retiens', 4], ['Expire', 4], ['Retiens', 4]], cycles: 6 },
  'coh': { nom: 'Cohérence', ph: [['Inspire', 5], ['Expire', 5]], cycles: 12 } };
window.beResp = function(k, retour){
  const r = RESP[k]; if(!r) return; BE.resp = { k, i: 0, c: 0, retour: retour || 'aide' };
  ov(`<div class="be-ov-in"><div class="be-cercle" id="beCer"></div><h2 id="bePh">Prépare-toi…</h2><div class="be-ov-h" id="beCy"></div>
    <button class="be-lien" onclick="${retour === 'mental' ? 'ovFermerOuv()' : 'beAide()'}">Arrêter</button></div>`, 'nuit');
  const etape = () => {
    if(!BE.resp || BE.resp.k !== k) return;
    const cer = document.getElementById('beCer'); if(!cer) return;
    if(BE.resp.c >= r.cycles){ document.getElementById('bePh').textContent = 'Bien joué. Respire normalement.'; cer.style.transform = 'scale(.6)'; return; }
    const [txt, s] = r.ph[BE.resp.i];
    document.getElementById('bePh').textContent = txt + ' · ' + s;
    document.getElementById('beCy').textContent = `Cycle ${BE.resp.c + 1} / ${r.cycles}`;
    cer.style.transition = `transform ${s}s ease-in-out`; cer.style.transform = /Inspire/.test(txt) ? 'scale(1)' : /Expire/.test(txt) ? 'scale(.6)' : cer.style.transform;
    BE.resp.i++; if(BE.resp.i >= r.ph.length){ BE.resp.i = 0; BE.resp.c++; }
    BE.tmResp = setTimeout(etape, s * 1000);
  };
  const cer0 = document.getElementById('beCer'); if(cer0) cer0.style.transform = 'scale(.6)';
  BE.tmResp = setTimeout(etape, 800);
};
window.beMinuteur = function(){
  ov(`<div class="be-ov-in"><h2>Film ou audio avec minuterie</h2>
    <p>Luminosité au minimum. Choisis un film que tu connais déjà (pas une série qui enchaîne), ou un audio calme. Mets la minuterie de sommeil de ton lecteur, et pose-toi.</p>
    <div class="be-chips">${[20, 30, 45, 60, 90].map(m => `<button onclick="beMinGo(${m})">${m} min</button>`).join('')}</div>
    <div class="be-ov-h">Cet écran sert de minuterie de secours : il devient noir et te le dit quand le temps est écoulé.</div>
    <button class="be-lien" onclick="beAide()">Retour</button></div>`, 'nuit');
};
window.beMinGo = function(m){
  const fin = Date.now() + m * 60000;
  ov(`<div class="be-ov-in noir"><div class="be-min" id="beMin"></div><div class="be-ov-h">Dors bien. Cet écran te dira quand éteindre.</div><button class="be-lien" onclick="beAide()">Annuler</button></div>`, 'noir');
  clearInterval(BE.tmMin);
  const maj = () => {
    const el = document.getElementById('beMin'); if(!el){ clearInterval(BE.tmMin); return; }
    const r = Math.max(0, fin - Date.now());
    if(r <= 0){ clearInterval(BE.tmMin); el.textContent = 'Éteins maintenant'; try { navigator.vibrate && navigator.vibrate([300, 150, 300]); } catch(e){} return; }
    el.textContent = p2(Math.floor(r / 60000)) + ':' + p2(Math.floor(r % 60000 / 1000));
  };
  maj(); BE.tmMin = setInterval(maj, 1000);
};
window.beVider = function(){
  ov(`<div class="be-ov-in"><h2>Vide ta tête</h2><p>Écris tout ce qui tourne. Tu le retrouveras demain, ça n'a plus besoin de rester dans ton cerveau.</p>
    <textarea id="beVide" rows="6" placeholder="Ce que je dois faire, ce qui m'inquiète, mes idées…"></textarea>
    <button class="be-gros" onclick="beVideOk()">C'est noté, je lâche</button><button class="be-lien" onclick="beAide()">Retour</button></div>`, 'nuit');
};
window.beVideOk = function(){
  const v = ((document.getElementById('beVide') || {}).value || '').trim();
  if(v){ const j = jourBE(); BE.data.journal[j] = BE.data.journal[j] || {}; BE.data.journal[j].tete = ((BE.data.journal[j].tete || '') + '\n' + v).trim(); sauver(); }
  toast('Noté pour demain.'); beAide();
};
window.beTelPose = function(){
  ov(`<div class="be-ov-in"><h2>Pose-le. 20 minutes.</h2>
    <p>Éloigne le téléphone du lit. Lumière très faible, yeux fermés, respire lentement. Si le sommeil n'est toujours pas là après 20 minutes, lève-toi 5 minutes (lumière douce, pas d'écran) puis reviens.</p>
    <button class="be-gros" onclick="ovFermerOuv()">Compris, bonne nuit</button><button class="be-lien" onclick="beAide()">Retour</button></div>`, 'nuit');
};

// Veille : l'heure du coucher arrive => plein écran ; pauses
function veille(){
  clearInterval(BE.timer);
  BE.timer = setInterval(() => {
    if(!BE.loaded || !BE.data) return;
    const n = retardMin(), p = S().prochain;
    if(n != null && n >= 0 && BE.ov !== 'nuit' && BE.ov !== 'noir'){
      const attendre = p.prochainRappel && Date.now() < p.prochainRappel;
      const ecranPrincipal = !!document.querySelector('#beOv .be-ov-in h1');
      if(!attendre && (!BE.ov || (BE.ov === 'coucher' && ecranPrincipal))) ovCoucher();
    }
    const pa = BE.data.pauses;
    if(pa.on && Date.now() - (pa.last || 0) >= pa.every * 60000){
      pa.last = Date.now(); sauver();
      toast('⏸Pause : regarde au loin 20 s, bois un verre d\'eau, étire ton dos.');
      try { navigator.vibrate && navigator.vibrate(200); } catch(e){}
    }
  }, 20000);
}

// ---------- Repas ----------
// [nom, kcal, protéines, glucides, lipides] pour 100 g (valeurs moyennes, estimations)
const ALIMENTS = [
  ['Attiéké (cuit)', 150, 1, 35, 0.3], ['Alloco (banane plantain frite)', 240, 1.5, 38, 10], ['Banane plantain bouillie', 120, 1, 31, 0.3], ['Foutou banane', 125, 1, 29, 0.3],
  ['Igname bouillie', 118, 1.5, 28, 0.2], ['Manioc bouilli', 160, 1.4, 38, 0.3], ['Riz blanc cuit', 130, 2.7, 28, 0.3], ['Pâtes cuites', 158, 5.8, 31, 0.9],
  ['Pain (baguette)', 270, 9, 55, 1.2], ['Pomme de terre bouillie', 87, 2, 20, 0.1], ['Frites', 312, 3.4, 41, 15], ['Haricots niébé cuits', 116, 8, 21, 0.5],
  ['Poulet braisé', 215, 27, 0, 12], ['Poulet blanc cuit', 165, 31, 0, 3.6], ['Poisson braisé', 150, 24, 0, 6], ['Thon en boîte (naturel)', 116, 26, 0, 1],
  ['Sardines en boîte', 208, 25, 0, 11], ['Bœuf cuit', 250, 26, 0, 15], ['Kedjenou de poulet', 130, 14, 4, 6], ['Sauce graine', 160, 3, 6, 14],
  ['Sauce tomate', 60, 1, 6, 3], ['Sauce feuille', 90, 4, 5, 6], ['Œuf (dur ou au plat)', 143, 12.6, 0.7, 9.5], ['Omelette', 154, 11, 1, 12],
  ['Banane', 89, 1.1, 23, 0.3], ['Orange', 47, 0.9, 12, 0.1], ['Mangue', 60, 0.8, 15, 0.4], ['Papaye', 43, 0.5, 11, 0.3], ['Ananas', 50, 0.5, 13, 0.1], ['Pomme', 52, 0.3, 14, 0.2],
  ['Avocat', 160, 2, 9, 15], ['Cacahuètes', 570, 26, 16, 49], ['Yaourt nature', 60, 3.5, 5, 3], ['Lait', 60, 3.2, 4.8, 3.3], ['Fromage', 350, 22, 1, 28],
  ['Café noir', 2, 0.1, 0, 0], ['Café au lait sucré', 45, 1.5, 6, 1.5], ['Sucre', 400, 0, 100, 0], ['Huile', 884, 0, 0, 100], ['Soda', 42, 0, 10.6, 0], ['Jus de fruit', 45, 0.5, 11, 0],
  ['Biscuit', 450, 6, 70, 16], ['Chocolat', 540, 6, 55, 32], ['Salade / légumes cuits', 30, 1.5, 5, 0.3], ['Shawarma / sandwich', 230, 12, 24, 9]
];
const sans = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
window.beChercher = function(v){
  const q = sans(v).trim(); BE.res = q ? ALIMENTS.filter(a => sans(a[0]).includes(q)).slice(0, 8) : ALIMENTS.slice(0, 8);
  const el = document.getElementById('beRes'); if(el) el.innerHTML = htmlRes();
};
function htmlRes(){
  return BE.res.map((a, i) => `<div class="be-ligne"><div class="be-d"><b>${E(a[0])}</b><span>${a[1]} kcal / 100 g</span></div>
    <input type="number" id="beG${i}" value="100" min="5" step="5" aria-label="grammes"><small>g</small><button onclick="beAjoutAliment(${i})">+</button></div>`).join('') || '<small class="be-hint">Aucun résultat. Utilise « Saisie directe » ci-dessous.</small>';
}
window.beAjoutAliment = function(i){
  const a = BE.res[i]; if(!a) return; const g = num((document.getElementById('beG' + i) || {}).value, 100), f = g / 100;
  ajouterRepas({ nom: `${a[0]} (${g} g)`, kcal: Math.round(a[1] * f), p: +(a[2] * f).toFixed(1), g: +(a[3] * f).toFixed(1), l: +(a[4] * f).toFixed(1) });
};
window.beAjoutDirect = function(){
  const nom = (document.getElementById('beDN') || {}).value || 'Repas', kcal = num((document.getElementById('beDK') || {}).value, 0);
  if(!kcal){ toast('Indique les calories.', 'error'); return; }
  ajouterRepas({ nom, kcal: Math.round(kcal), p: num((document.getElementById('beDP') || {}).value, 0), g: 0, l: 0 });
};
function ajouterRepas(x){
  const j = jourBE(); (BE.data.repas[j] = BE.data.repas[j] || []).push(Object.assign({ id: idU(), h: hhmm(new Date()) }, x));
  sauver(); toast(`+ ${x.kcal} kcal ajoutées`); beR();
}
window.beSupprRepas = function(id){ const j = jourBE(); BE.data.repas[j] = (BE.data.repas[j] || []).filter(x => x.id !== id); sauver(); beR(); };
window.beFavori = function(id){
  const x = (BE.data.repas[jourBE()] || []).find(r => r.id === id); if(!x) return;
  if(BE.data.favoris.some(f => f.nom === x.nom)){ toast('Déjà dans tes favoris'); return; }
  BE.data.favoris.push({ nom: x.nom, kcal: x.kcal, p: x.p, g: x.g, l: x.l }); sauver(); toast('Ajouté aux favoris '); beR();
};
window.beAjoutFavori = function(i){ const f = BE.data.favoris[i]; if(f) ajouterRepas(Object.assign({}, f)); };
window.beSupprFavori = function(i){ BE.data.favoris.splice(i, 1); sauver(); beR(); };
window.beMode = function(m){ BE.mode = m; BE.estim = null; if(m === 'chercher') BE.res = ALIMENTS.slice(0, 8); beR(); };
const SYS_NUTRI = () => `Tu es un nutritionniste prudent. Henzo mange souvent de la cuisine ivoirienne (attiéké, alloco, foutou, sauces, poisson/poulet braisé) mais aussi des plats courants. Estime les calories et macros (en grammes) du repas décrit ou photographié, portions réalistes. Si tu hésites, donne une estimation moyenne et dis-le dans "remarque". Réponds UNIQUEMENT en JSON : {"items":[{"nom":"","qte":"","kcal":0,"p":0,"g":0,"l":0}],"remarque":""}`;
function lireEstim(r){
  const j = typeof mkJson === 'function' ? mkJson(r.text) : JSON.parse(r.text);
  const items = (j.items || []).map(i => ({ nom: String(i.nom || 'Aliment') + (i.qte ? ' (' + i.qte + ')' : ''), kcal: Math.round(num(i.kcal)), p: +num(i.p).toFixed(1), g: +num(i.g).toFixed(1), l: +num(i.l).toFixed(1) })).filter(i => i.kcal > 0);
  if(!items.length) throw new Error('Je n\'ai rien pu estimer. Décris le repas plus précisément.');
  return { items, remarque: String(j.remarque || '') };
}
window.beEstimerTexte = async function(){
  const t = ((document.getElementById('beTxt') || {}).value || '').trim(); if(!t || BE.busy) return;
  if(typeof window.mkAI !== 'function'){ erreur('IA indisponible : connecte-la dans les réglages du Coach.'); return; }
  BE.busy = true; BE.txt = t; beR();
  try { BE.estim = lireEstim(await window.mkAI({ system: SYS_NUTRI(), messages: [{ role: 'user', text: t }], maxTokens: 900 })); } catch(e){ erreur(e); }
  BE.busy = false; beR();
};
function reduirePhoto(file){
  return new Promise((ok, ko) => {
    const fr = new FileReader();
    fr.onerror = () => ko(new Error('Photo illisible.'));
    fr.onload = () => { const im = new Image(); im.onerror = () => ko(new Error('Photo illisible.')); im.onload = () => {
      const k = Math.min(1, 900 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', 0.8).split(',')[1]); }; im.src = fr.result; };
    fr.readAsDataURL(file);
  });
}
window.bePhoto = async function(inp){
  const f = inp.files && inp.files[0]; if(!f || BE.busy) return;
  if(typeof window.mkAI !== 'function'){ erreur('IA indisponible : connecte-la dans les réglages du Coach.'); return; }
  BE.busy = true; BE.txt = 'Photo du repas'; beR();
  try {
    const b64 = await reduirePhoto(f);
    BE.estim = lireEstim(await window.mkAI({ system: SYS_NUTRI(), messages: [{ role: 'user', text: 'Voici la photo de mon repas. Estime-le.' }], images: [b64], maxTokens: 900 }));
  } catch(e){ erreur(e); }
  BE.busy = false; beR();
};
window.beValiderEstim = function(){
  const e = BE.estim; if(!e) return; const J = jourBE(); BE.data.repas[J] = BE.data.repas[J] || [];
  e.items.forEach((it, i) => { const k = num((document.getElementById('beEk' + i) || {}).value, it.kcal); const f = it.kcal ? k / it.kcal : 1;
    BE.data.repas[J].push({ id: idU(), h: hhmm(new Date()), nom: it.nom, kcal: Math.round(k), p: +(it.p * f).toFixed(1), g: +(it.g * f).toFixed(1), l: +(it.l * f).toFixed(1) }); });
  BE.estim = null; sauver(); toast('Repas ajouté'); beR();
};

// ---------- Corps : poids, eau, café, sport ----------
window.beAjoutPoids = function(){
  const kg = num((document.getElementById('bePk') || {}).value, 0); if(kg < 25 || kg > 300){ toast('Poids invalide', 'error'); return; }
  const d = jourBE(); BE.data.poids = BE.data.poids.filter(x => x.d !== d); BE.data.poids.push({ d, kg }); BE.data.profil.poids = kg; sauver(); beR();
};
window.beEau = function(ml){ const j = jourBE(); BE.data.eau[j] = Math.max(0, (BE.data.eau[j] || 0) + ml); sauver(); beR(); };
window.beCafe = function(){
  const j = jourBE(); (BE.data.cafe[j] = BE.data.cafe[j] || []).push(hhmm(new Date())); sauver();
  const l = limiteCafe(); if(l && Date.now() > l.getTime()) toast('C\'est après ta limite caféine : ça risque de retarder ton sommeil.', 'error');
  beR();
};
window.beCafeMoins = function(){ const j = jourBE(); (BE.data.cafe[j] || []).pop(); sauver(); beR(); };
function limiteCafe(){ const p = S().prochain; return p && !p.logged ? new Date(new Date(p.at).getTime() - 8 * 3600000) : null; }
window.beSport = function(type){
  const j = jourBE(), m = type === 'Marche' ? 30 : type === 'Étirements' ? 10 : 30;
  (BE.data.sport[j] = BE.data.sport[j] || []).push({ id: idU(), type, min: m }); sauver(); toast(`${type} ${m} min ajouté `); beR();
};
window.beSportSuppr = function(i){ const j = jourBE(); (BE.data.sport[j] || []).splice(i, 1); sauver(); beR(); };
function sparkline(){
  const l = BE.data.poids.slice().sort((a, b) => a.d < b.d ? -1 : 1).slice(-30); if(l.length < 2) return '';
  const mn = Math.min(...l.map(x => x.kg)), mx = Math.max(...l.map(x => x.kg)), W = 280, H = 64, r = mx - mn || 1;
  const pts = l.map((x, i) => `${(i / (l.length - 1) * W).toFixed(1)},${(H - 6 - (x.kg - mn) / r * (H - 12)).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${H}" class="be-spark" role="img" aria-label="Courbe de poids"><polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <div class="be-hint">${l[0].kg} kg → ${l[l.length - 1].kg} kg sur ${l.length} pesées</div>`;
}

// ---------- Mental ----------
window.beHumeur = function(k, v){ const j = jourBE(); BE.data.humeur[j] = Object.assign(BE.data.humeur[j] || {}, { [k]: v }); sauver(); beR(); };
window.beGratitude = function(i, v){ const j = jourBE(); BE.data.journal[j] = BE.data.journal[j] || {}; const g = BE.data.journal[j].grat = BE.data.journal[j].grat || ['', '', '']; g[i] = v; sauver(); };
window.bePauses = function(on){ BE.data.pauses.on = on; BE.data.pauses.last = Date.now(); sauver(); beR(); };
window.bePauseEvery = function(v){ BE.data.pauses.every = Math.max(20, num(v, 50)); sauver(); };
window.beNotifs = function(k, on){ if(k === 'rappels') S().rappelsOn = on; else BE.data.notifs.on = on; sauver(); syncRappels(); };
function etat(){
  const h = BE.data.humeur[jourBE()] || {}, n = dernierNuit();
  const dur = n ? n.duree : null, manque = dur != null ? S().minH * 60 - dur : 0;
  if((h.energie && h.energie <= 2) || manque > 90) return 'fatigué : sois doux, rassurant, propose le minimum vital';
  if(h.energie >= 4 && manque <= 30) return 'en forme : sois tonique et ambitieux';
  return 'normal : sois chaleureux et motivant';
}
window.beBoost = async function(){
  if(BE.busy) return; if(typeof window.mkAI !== 'function'){ erreur('IA indisponible : connecte-la dans les réglages du Coach.'); return; }
  BE.busy = true; beR();
  try {
    const t = totalJour(jourBE()), c = cibles(), n = dernierNuit();
    const r = await window.mkAI({ system: `Tu es le coach bien-être de Henzo, photographe/créatif qui travaille la nuit et veut perdre du poids. Écris un message court (3 phrases max) qui le booste, personnalisé, jamais culpabilisant, sans liste. État du moment : ${etat()}.`,
      messages: [{ role: 'user', text: `Aujourd'hui : ${t.kcal}/${c.kcal} kcal, ${Math.round((BE.data.eau[jourBE()] || 0))} ml d'eau${n ? ', dernière nuit ' + dureeTxt(n.duree) : ''}. Poids ${poidsActuel()} kg, objectif ${cibleKg()} kg.` }], maxTokens: 300 });
    BE.boost = r.text.trim();
  } catch(e){ erreur(e); }
  BE.busy = false; beR();
};
window.beBilan = async function(){
  if(BE.busy) return; if(typeof window.mkAI !== 'function'){ erreur('IA indisponible : connecte-la dans les réglages du Coach.'); return; }
  BE.busy = true; beR();
  try {
    const base = new Date(), jours = []; for(let i = 0; i < 7; i++) jours.push(isoDe(new Date(base.getTime() - i * 864e5)));
    const kc = jours.map(j => totalJour(j).kcal).filter(Boolean), nuits = S().nuits.filter(n => n.duree != null && jours.includes(n.jour));
    const moy = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null, c = cibles();
    const hum = jours.map(j => BE.data.humeur[j]).filter(Boolean);
    const resume = `Calories moyennes ${moy(kc) || '?'} (cible ${c.kcal}) sur ${kc.length} jours renseignés. Sommeil moyen ${nuits.length ? dureeTxt(moy(nuits.map(n => n.duree))) : '?'} sur ${nuits.length} nuits (cible ${S().minH} h), ${nuits.filter(n => n.ecart > 10).length} couchers en retard${nuits.filter(n => n.ecart > 10).length ? ' (motifs : ' + [...new Set(nuits.filter(n => n.ecart > 10).map(n => n.motif).filter(Boolean))].join(', ') + ')' : ''}. Poids ${poidsActuel()} kg, objectif ${cibleKg()} kg. Énergie moyenne ${moy(hum.map(h => h.energie).filter(Boolean)) || '?'}/5, humeur ${moy(hum.map(h => h.humeur).filter(Boolean)) || '?'}/5. Eau moyenne ${moy(jours.map(j => BE.data.eau[j] || 0).filter(Boolean)) || '?'} ml. Valeurs estimées faute de données : ${c.est.length ? c.est.join(', ') : 'aucune'}. Régime/allergies : ${BE.data.profil.regime || 'aucun'} ${BE.data.profil.allergies || ''}. Budget/temps : ${BE.data.profil.budget || ''} ${BE.data.profil.temps || ''}.`;
    const r = await window.mkAI({ recherche: true, maxTokens: 1600, system: `Tu es le coach bien-être de Henzo (photographe/créatif, travaille la nuit, veut perdre du poids avec un rythme de sommeil décalé). Fais le bilan de sa semaine : 1) ce qui va bien (sois sincère et encourageant), 2) ce qui bloque, 3) 3 actions concrètes pour la semaine, simples et peu chères, 4) un conseil appuyé sur une source fiable que tu as recherchée (OMS, HAS, Sleep Foundation, etc.) sur le sommeil décalé ou la perte de poids. Français simple, court, markdown léger. Pas de conseil médical ; si un problème de santé est évoqué, suggère un professionnel.`, messages: [{ role: 'user', text: resume }] });
    BE.data.bilan = { date: new Date().toISOString(), texte: r.text, sources: r.sources || [] }; sauver();
  } catch(e){ erreur(e); }
  BE.busy = false; beR();
};

// ---------- Profil ----------
window.beProfil = function(){
  const g = id => (document.getElementById(id) || {}).value, P = BE.data.profil;
  const kg = num(g('bpPoids'), 0);
  if(kg < 30 || kg > 300){ toast('Indique ton poids, même approximatif (balance de pharmacie, de salle de sport, chez un proche).', 'error'); return; }
  const opt = id => { const v = num(g(id), 0); return v > 0 ? v : ''; };
  Object.assign(P, { ok: true, sexe: g('bpSexe'), age: opt('bpAge'), taille: opt('bpTaille'), poids: kg, cible: opt('bpCible'), rythme: num(g('bpRythme'), 0.5), activite: num(g('bpAct'), 1.375),
    regime: (g('bpRegime') || '').trim(), allergies: (g('bpAll') || '').trim(), sante: (g('bpSante') || '').trim(), budget: (g('bpBudget') || '').trim(), temps: (g('bpTemps') || '').trim() });
  const d = jourBE(); BE.data.poids = BE.data.poids.filter(x => x.d !== d); BE.data.poids.push({ d, kg: P.poids });
  S().minH = num(g('bpMinH'), 7); BE.edit = false; sauver(); toast('Profil enregistré'); beR();
};
window.beEditProfil = function(){ BE.edit = !BE.edit; beR(); };
window.beSub = function(k){ BE.sub = k; beR(); };
window.beProchainOk = function(){
  const hm = (document.getElementById('beNext') || {}).value, mh = num((document.getElementById('beMinH') || {}).value, 7), d = prochaineHeure(hm);
  if(!d){ toast('Choisis une heure', 'error'); return; }
  delete S().formCoucher; BE.planOuvert = false; setProchain(d, mh); toast('Coucher planifié à ' + hm + '. Je te le rappelle.'); beR();
};
window.beProchainAnnuler = function(){ S().prochain = null; sauver(); syncRappels(); beR(); };
window.beNuitMaintenant = function(){ logCoucher(new Date(), 'Pas de plan'); ovBonneNuit(); };
window.beReveil = function(){
  const hm = (document.getElementById('beRv') || {}).value, lat = num(BE.latence, 20);
  logReveil(hm || hhmm(new Date()), lat, BE.aideSel || ''); BE.aideSel = ''; BE.latence = 20;
};
window.beLatence = function(v){ BE.latence = v; document.querySelectorAll('#beLat button').forEach(b => b.classList.toggle('on', +b.dataset.v === v)); };
window.beAideSel = function(v){ BE.aideSel = BE.aideSel === v ? '' : v; document.querySelectorAll('#beAid button').forEach(b => b.classList.toggle('on', b.dataset.v === BE.aideSel)); };
window.beOpenCoucherForm = function(){ BE.planOuvert = !BE.planOuvert; beR(); };

// ---------- Écrans ----------
const AIDES = ['Respiration', 'Film', 'Téléphone', 'Lecture / audio', 'Rien, naturel'];
function carteResume(){
  const c = cibles(), t = totalJour(jourBE()), n = dernierNuit(), eau = BE.data.eau[jourBE()] || 0;
  const pc = (a, b) => Math.max(0, Math.min(100, Math.round(a / b * 100)));
  return `<div class="be-resume">
    <div class="be-r"><small>Sommeil</small><b>${n ? dureeTxt(n.duree) : '–'}</b><i style="--p:${n ? pc(n.duree, S().minH * 60) : 0}%"></i></div>
    <div class="be-r"><small>Calories</small><b>${t.kcal}<em>/${c.kcal}</em></b><i style="--p:${pc(t.kcal, c.kcal)}%"></i></div>
    <div class="be-r"><small>Eau</small><b>${(eau / 1000).toFixed(2).replace('.', ',')}<em> L</em></b><i style="--p:${pc(eau, c.eau)}%"></i></div></div>`;
}
function ecranSommeil(){
  const s = S(), p = s.prochain && !s.prochain.logged ? s.prochain : null, n = enCours(), retard = retardMin(), last = dernierNuit(), nuits = s.nuits.slice(0, 7);
  const next = prochaineHeure(s.formCoucher || '') ? s.formCoucher : (p ? hhmm(new Date(p.at)) : '07:00');
  const top = Object.entries(s.aides).sort((a, b) => b[1].oui - a[1].oui);
  return `
  ${n ? `<div class="be-card be-nuit"><h3>Tu dors depuis ${hhmm(new Date(n.coucher))}</h3><p>Au réveil, dis-moi comment ça s'est passé. Je fais le diagnostic.</p>
    <label>Heure de réveil<input type="time" id="beRv" value="${hhmm(new Date())}"></label>
    <label>Combien de temps pour t'endormir ?</label><div class="be-chips" id="beLat">${[5, 15, 30, 60, 90].map(v => `<button type="button" data-v="${v}" class="${(BE.latence || 20) === v ? 'on' : ''}" onclick="beLatence(${v})">${v} min</button>`).join('')}</div>
    <label>Qu'est-ce qui t'a aidé à dormir ?</label><div class="be-chips" id="beAid">${AIDES.map(a => `<button type="button" data-v="${E(a)}" onclick="beAideSel('${E(a)}')">${E(a)}</button>`).join('')}</div>
    <button class="btn-primary" onclick="beReveil()">Je me réveille : faire le diagnostic</button>
    <button class="be-lien2" onclick="beAide()">Je n'arrive pas à dormir</button></div>` : ''}
  ${p && !n ? `<div class="be-card ${retard != null && retard >= 0 ? 'be-alerte' : ''}"><h3>${retard != null && retard >= 0 ? '' + messageRetard(retard)[0] : 'Prochain coucher : ' + hhmm(new Date(p.at))}</h3>
    <p>${retard != null && retard >= 0 ? messageRetard(retard)[1] : `Réveil prévu vers ${hhmm(new Date(new Date(p.at).getTime() + (s.minH || 7) * 3600000 + 20 * 60000))} (${s.minH || 7} h de sommeil). Je t'alerte avant, puis je t'insiste à l'heure.`}</p>
    <div class="be-act"><button class="btn-primary" onclick="beJeMeCouche()">Je me couche maintenant</button><button class="btn-ghost" onclick="beOpenCoucherForm()">Changer l'heure</button></div></div>` : ''}
  ${(!p || BE.planOuvert) && !n ? `<div class="be-card"><h3>Planifier mon prochain coucher</h3>
    <p class="be-hint">Choisis une heure réaliste selon ta journée de travail : tu peux la changer chaque jour. L'important : quand elle sonne, tu y vas.</p>
    <div class="be-2"><label>Coucher à<input type="time" id="beNext" value="${E(next)}"></label><label>Heures de sommeil visées<input type="number" id="beMinH" min="4" max="10" step="0.5" value="${s.minH || 7}"></label></div>
    <div class="be-act"><button class="btn-primary" onclick="beProchainOk()">Valider et me le rappeler</button>${p ? '<button class="btn-ghost" onclick="beProchainAnnuler()">Annuler le plan</button>' : '<button class="btn-ghost" onclick="beNuitMaintenant()">Je me couche déjà</button>'}</div></div>` : ''}
  ${last && last.diag ? `<div class="be-card"><h3>${last.diag.verdict === 'ok' ? '' : last.diag.verdict === 'moyen' ? '' : ''} Diagnostic de ta dernière nuit ${last.diagIA ? '<small>(IA)</small>' : ''}</h3>
    <p>${E(last.diag.diagnostic)}</p><h4>Comment rattraper</h4><p>${E(last.diag.rattrapage)}</p>
    ${last.diag.sieste && last.diag.sieste.duree ? `<p><b>Sieste :</b> ${last.diag.sieste.duree} min ${E(last.diag.sieste.debut || '')}</p>` : ''}
    ${last.diag.mot ? `<p class="be-mot">${E(last.diag.mot)}</p>` : ''}
    ${last.diag.coucher ? `<div class="be-act"><button class="btn-secondary" onclick="beAppliquerCoucher('${last.id}')">Planifier mon prochain coucher (${E(last.diag.coucher)})</button></div>` : ''}</div>` : ''}
  <div class="be-card"><h3>Mes nuits</h3>${nuits.length ? nuits.map(x => `<div class="be-rt"><span>${jourCourt(x.jour)}</span><span>couché ${hhmm(new Date(x.coucher))}${x.ecart > 10 ? ` <em class="rouge">+${dureeTxt(x.ecart)}</em>` : x.prevu ? ` ${agIcon('check', 12)}` : ''}</span><b>${x.duree != null ? dureeTxt(x.duree) : '…'}</b></div>${x.motif && x.ecart > 10 ? `<div class="be-motif">${E(x.motif)}</div>` : ''}`).join('') : '<small class="be-hint">Aucune nuit notée pour le moment.</small>'}
    ${top.length ? `<h4>Ce qui t'endort</h4><div class="be-hint">${top.map(([k, v]) => `${E(k)} : ${v.oui}×`).join(' · ')}</div>` : ''}</div>
  <div class="be-card"><h3>Besoin d'aide pour dormir ?</h3><div class="be-act"><button class="btn-secondary" onclick="beAide()">Le sommeil ne vient pas</button><button class="btn-ghost" onclick="beResp('478','mental')">Respiration 4-7-8</button></div></div>
  <details class="be-card"><summary>Rappels et notifications</summary>
    <label class="ag-check"><input type="checkbox" ${s.rappelsOn !== false ? 'checked' : ''} onchange="beNotifs('rappels',this.checked)"> Rappels de coucher insistants (avant, à l'heure, puis de plus en plus fermes)</label>
    <label class="ag-check"><input type="checkbox" ${BE.data.notifs.on ? 'checked' : ''} onchange="beNotifs('boost',this.checked)"> Messages du coach dans la journée (réveil, repas, bilan, dernier café)</label>
    <small class="be-hint">Ils sont envoyés sur ton téléphone même app fermée, à partir de l'heure de coucher que tu planifies.</small></details>`;
}
function ecranRepas(){
  const J = jourBE(), c = cibles(), t = totalJour(J), liste = BE.data.repas[J] || [], reste = c.kcal - t.kcal;
  const modes = [['texte', 'Texte'], ['photo', 'Photo'], ['chercher', 'Chercher'], ['favoris', 'Favoris ']];
  let corps = '';
  if(BE.mode === 'texte') corps = `<textarea id="beTxt" rows="3" placeholder="Ex : 2 œufs, un morceau de pain, un café au lait sucré">${E(BE.txt && BE.txt !== 'Photo du repas' ? BE.txt : '')}</textarea><small class="be-hint">Astuce : dicte avec le micro de ton clavier.</small>
    <button class="btn-primary" ${BE.busy ? 'disabled' : ''} onclick="beEstimerTexte()">${BE.busy ? 'Estimation…' : 'Estimer les calories'}</button>`;
  else if(BE.mode === 'photo') corps = `<p class="be-hint">Prends ton repas en photo, l'IA estime les calories. Tu peux corriger avant d'ajouter.</p>
    <label class="btn-primary be-file">${BE.busy ? 'Analyse…' : 'Photographier mon repas'}<input type="file" accept="image/*" capture="environment" onchange="bePhoto(this)" ${BE.busy ? 'disabled' : ''}></label>`;
  else if(BE.mode === 'chercher') corps = `<input type="search" placeholder="Attiéké, poulet, banane…" oninput="beChercher(this.value)"><div id="beRes">${htmlRes()}</div>
    <h4>Saisie directe</h4><div class="be-2"><label>Nom<input id="beDN" placeholder="Repas"></label><label>Calories<input id="beDK" type="number" inputmode="numeric"></label></div>
    <button class="btn-ghost" onclick="beAjoutDirect()">Ajouter</button>`;
  else corps = BE.data.favoris.length ? BE.data.favoris.map((f, i) => `<div class="be-ligne"><div class="be-d"><b>${E(f.nom)}</b><span>${f.kcal} kcal</span></div><button onclick="beAjoutFavori(${i})">+</button><button class="x" onclick="beSupprFavori(${i})" aria-label="Retirer">${agIcon('trash', 15)}</button></div>`).join('')
    : '<small class="be-hint">Aucun favori. Étoile un repas de ta journée pour le retrouver en 1 clic.</small>';
  const est = BE.estim ? `<div class="be-card be-estim"><h3>Estimation</h3>${BE.estim.items.map((it, i) => `<div class="be-ligne"><div class="be-d"><b>${E(it.nom)}</b><span>P ${it.p} · G ${it.g} · L ${it.l}</span></div><input type="number" id="beEk${i}" value="${it.kcal}"><small>kcal</small></div>`).join('')}
    ${BE.estim.remarque ? `<small class="be-hint">${E(BE.estim.remarque)}</small>` : ''}<div class="be-act"><button class="btn-primary" onclick="beValiderEstim()">Ajouter à ma journée</button><button class="btn-ghost" onclick="BE.estim=null;beR()">Annuler</button></div></div>` : '';
  return `<div class="be-card"><h3>Aujourd'hui</h3>
    <div class="be-jauge"><i style="width:${Math.min(100, Math.round(t.kcal / c.kcal * 100))}%;background:${reste < 0 ? 'var(--red,#e5484d)' : 'var(--accent)'}"></i></div>
    <div class="be-gros-n"><b>${t.kcal}</b> / ${c.kcal} kcal <span>${reste >= 0 ? 'reste ' + reste : 'dépassé de ' + (-reste)}</span></div>
    <div class="be-hint">Protéines ${Math.round(t.p)} / ${c.prot} g · Glucides ${Math.round(t.g)} g · Lipides ${Math.round(t.l)} g</div>
    ${liste.length ? `<div class="be-liste">${liste.map(x => `<div class="be-ligne"><div class="be-d"><b>${E(x.nom)}</b><span>${E(x.h || '')} · ${x.kcal} kcal</span></div><button class="x" onclick="beFavori('${x.id}')" aria-label="Favori">${agIcon('star', 15)}</button><button class="x" onclick="beSupprRepas('${x.id}')" aria-label="Retirer">${agIcon('trash', 15)}</button></div>`).join('')}</div>` : '<small class="be-hint">Rien d\'ajouté. Commence par ton premier repas.</small>'}</div>
  <div class="be-card"><h3>Ajouter un repas</h3><div class="be-chips">${modes.map(([k, l]) => `<button class="${BE.mode === k ? 'on' : ''}" onclick="beMode('${k}')">${l}</button>`).join('')}</div>${corps}</div>${est}`;
}
function ecranCorps(){
  const J = jourBE(), c = cibles(), eau = BE.data.eau[J] || 0, cafes = BE.data.cafe[J] || [], lim = limiteCafe(), sp = BE.data.sport[J] || [];
  const pa = poidsActuel(), P = BE.data.profil;
  return `<div class="be-card"><h3>Poids</h3><div class="be-gros-n"><b>${pa}</b> kg <span>objectif ${cibleKg()} kg${pa > cibleKg() ? ' · reste ' + (pa - cibleKg()).toFixed(1).replace('.', ',') + ' kg' : ' '}</span></div>
    ${sparkline()}<div class="be-ligne"><input type="number" id="bePk" step="0.1" inputmode="decimal" placeholder="Poids du jour (kg)"><button onclick="beAjoutPoids()">Noter</button></div>
    <small class="be-hint">Pèse-toi 1 à 2 fois par semaine, le matin au réveil : la tendance compte, pas un jour isolé.</small></div>
  <div class="be-card"><h3>Eau</h3><div class="be-gros-n"><b>${(eau / 1000).toFixed(2).replace('.', ',')}</b> / ${(c.eau / 1000).toFixed(1).replace('.', ',')} L</div>
    <div class="be-jauge"><i style="width:${Math.min(100, Math.round(eau / c.eau * 100))}%"></i></div>
    <div class="be-act"><button class="btn-secondary" onclick="beEau(250)">+ 250 ml</button><button class="btn-secondary" onclick="beEau(500)">+ 500 ml</button><button class="btn-ghost" onclick="beEau(-250)">− 250</button></div></div>
  <div class="be-card"><h3>Caféine</h3><div class="be-gros-n"><b>${cafes.length}</b> aujourd'hui <span>${cafes.length ? 'dernier à ' + cafes[cafes.length - 1] : ''}</span></div>
    ${lim ? `<div class="be-hint">${Date.now() > lim.getTime() ? 'Limite dépassée' : '⏳ Dernier café avant'} <b>${hhmm(lim)}</b> (8 h avant ton coucher).</div>` : '<div class="be-hint">Planifie ton coucher pour avoir ta limite caféine.</div>'}
    <div class="be-act"><button class="btn-secondary" onclick="beCafe()">+ Un café / boisson énergisante</button>${cafes.length ? '<button class="btn-ghost" onclick="beCafeMoins()">Annuler le dernier</button>' : ''}</div></div>
  <div class="be-card"><h3>Mouvement</h3>${sp.length ? sp.map((x, i) => `<div class="be-rt"><span>${E(x.type)}</span><b>${x.min} min</b><button onclick="beSportSuppr(${i})" aria-label="Retirer">${agIcon('trash', 15)}</button></div>`).join('') : '<small class="be-hint">Rien aujourd\'hui. Même 10 minutes comptent.</small>'}
    <div class="be-chips">${['Marche', 'Étirements', 'Renforcement', 'Course', 'Vélo'].map(t => `<button onclick="beSport('${t}')">+ ${t}</button>`).join('')}</div></div>`;
}
function ecranMental(){
  const J = jourBE(), h = BE.data.humeur[J] || {}, g = (BE.data.journal[J] || {}).grat || ['', '', ''], pa = BE.data.pauses;
  const echelle = (k, lab, emo) => `<div class="be-ech"><b>${lab}</b><div class="be-chips">${[1, 2, 3, 4, 5].map(v => `<button class="${h[k] === v ? 'on' : ''}" onclick="beHumeur('${k}',${v})">${emo[v - 1]}</button>`).join('')}</div></div>`;
  return `<div class="be-card"><h3>Comment tu te sens ?</h3>
    ${echelle('humeur', 'Humeur', ['😞', '😕', '😐', '🙂', '😄'])}${echelle('energie', 'Énergie', ['🪫', '😴', '⚡', '🔋', '🚀'])}${echelle('stress', 'Stress', ['😌', '🙂', '😐', '😟', '🤯'])}</div>
  <div class="be-card"><h3>Gratitude du jour</h3><small class="be-hint">3 choses, même toutes petites.</small>
    ${[0, 1, 2].map(i => `<input class="be-gr" value="${E(g[i] || '')}" placeholder="${['Quelque chose qui s\'est bien passé', 'Quelqu\'un ou quelque chose qui m\'aide', 'Une victoire, même petite'][i]}" oninput="beGratitude(${i},this.value)">`).join('')}</div>
  <div class="be-card"><h3>Respiration</h3><div class="be-act"><button class="btn-secondary" onclick="beResp('478','mental')">4-7-8 (apaiser)</button><button class="btn-secondary" onclick="beResp('car','mental')">Carrée (focus)</button><button class="btn-secondary" onclick="beResp('coh','mental')">Cohérence (stress)</button></div></div>
  <div class="be-card"><h3>⏸Pauses pendant le travail</h3>
    <label class="ag-check"><input type="checkbox" ${pa.on ? 'checked' : ''} onchange="bePauses(this.checked)"> Me rappeler une pause toutes les</label>
    <input type="number" min="20" step="5" value="${pa.every}" onchange="bePauseEvery(this.value)"><small class="be-hint">minutes. Regarde au loin 20 s, bois, étire dos et poignets. Fonctionne quand l'app est ouverte, pendant que tu retouches ou développes.</small></div>
  <div class="be-card"><h3>Un boost</h3>${BE.boost ? `<p class="be-mot">${E(BE.boost)}</p>` : '<small class="be-hint">Un message pour toi, adapté à ton état du moment.</small>'}
    <div class="be-act"><button class="btn-primary" ${BE.busy ? 'disabled' : ''} onclick="beBoost()">${BE.busy ? '…' : 'Me booster'}</button></div></div>`;
}
function ecranBilan(){
  const b = BE.data.bilan, md = t => typeof mkMd === 'function' ? mkMd(t) : '<p>' + E(t).replace(/\n/g, '<br>') + '</p>';
  return `<div class="be-card"><h3>Bilan de ma semaine</h3><p class="be-hint">Je regarde ton sommeil, tes repas, ton poids et ton humeur, je cherche des conseils fiables et je te propose 3 actions.</p>
    <div class="be-act"><button class="btn-primary" ${BE.busy ? 'disabled' : ''} onclick="beBilan()">${BE.busy ? 'Analyse en cours…' : b ? 'Refaire le bilan' : 'Faire mon bilan'}</button></div></div>
    ${b ? `<div class="be-card"><small class="be-hint">Fait le ${new Date(b.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</small><div class="be-md">${md(b.texte)}</div>
      ${(b.sources || []).length ? `<h4>Sources</h4>${b.sources.map(s => `<div><a href="${E(s.uri)}" target="_blank" rel="noopener">${E(s.title)}</a></div>`).join('')}` : ''}</div>` : ''}
    <div class="be-card"><small class="be-hint">Ces conseils sont du bien-être général, pas des conseils médicaux. En cas de souci de santé ou de sommeil qui dure, parle à un professionnel.</small></div>`;
}
function formProfil(){
  const P = BE.data.profil, c = P.ok ? cibles() : null;
  return `<div class="be-card"><h3>${P.ok ? 'Mon profil' : 'Faisons connaissance'}</h3>
    ${P.ok ? '' : '<p>Quelques questions pour calculer tes objectifs. Tout reste modifiable plus tard.</p>'}
    <p class="be-hint">Tu ne connais pas un chiffre ? <b>Laisse-le vide</b> : je prends une valeur moyenne, je te le dis clairement, et tu pourras corriger quand tu sauras. Seul le poids est demandé, même à peu près.</p>
    <details class="be-aide"><summary>Comment connaître ma taille et mon poids ?</summary>
      <small class="be-hint"><b>Taille :</b> dos et talons contre un mur, un livre à plat sur la tête, une marque au mur, puis un mètre ruban. Ton tailleur ou ton barbier a peut-être déjà ta taille.<br><b>Poids :</b> une balance de pharmacie, de salle de sport ou chez un proche. Un chiffre à 2-3 kg près suffit pour démarrer ; ta vraie courbe se construit ensuite avec tes pesées.</small></details>
    <div class="be-2"><label>Sexe<select id="bpSexe"><option value="h" ${P.sexe === 'h' ? 'selected' : ''}>Homme</option><option value="f" ${P.sexe === 'f' ? 'selected' : ''}>Femme</option></select></label><label>Âge <small>(facultatif)</small><input id="bpAge" type="number" inputmode="numeric" placeholder="Je ne sais pas" value="${P.age}"></label>
    <label>Taille en cm <small>(facultatif)</small><input id="bpTaille" type="number" inputmode="numeric" placeholder="Je ne sais pas" value="${P.taille}"></label><label>Poids actuel en kg <small>(approximatif ok)</small><input id="bpPoids" type="number" step="0.1" inputmode="decimal" placeholder="Ex : 85" value="${P.poids}"></label>
    <label>Poids visé en kg <small>(facultatif)</small><input id="bpCible" type="number" step="0.1" inputmode="decimal" placeholder="Je ne sais pas" value="${P.cible}"></label><label>Rythme de perte<select id="bpRythme">${[[0.25, 'Très doux · 0,25 kg/sem'], [0.5, 'Doux · 0,5 kg/sem (conseillé)'], [0.75, 'Soutenu · 0,75 kg/sem']].map(([v, l]) => `<option value="${v}" ${num(P.rythme) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label>Activité<select id="bpAct">${[[1.2, 'Très sédentaire (assis toute la nuit)'], [1.375, 'Peu actif'], [1.55, 'Actif (sport 3-4×/sem)']].map(([v, l]) => `<option value="${v}" ${num(P.activite) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label>Sommeil visé (h / 24 h)<input id="bpMinH" type="number" step="0.5" min="4" max="10" value="${S().minH}"></label></div>
    <label>Régime (halal, végétarien…) <input id="bpRegime" value="${E(P.regime)}"></label><label>Allergies, aliments que tu évites <input id="bpAll" value="${E(P.allergies)}"></label>
    <label>Santé / traitement à connaître (optionnel) <input id="bpSante" value="${E(P.sante)}"></label><label>Budget repas <input id="bpBudget" value="${E(P.budget)}" placeholder="Ex : 2 000 F par jour"></label><label>Temps pour cuisiner <input id="bpTemps" value="${E(P.temps)}" placeholder="Ex : 20 min max les soirs de montage"></label>
    ${c && c.est.length ? `<div class="be-hint be-est">Estimé pour toi, faute de données : ${E(c.est.join(' · '))}. C'est une base pour démarrer, pas une mesure : corrige dès que tu sais.</div>` : ''}
    ${c ? `<div class="be-hint">Ton métabolisme de base ≈ ${c.bmr} kcal, dépense ≈ ${c.tdee} kcal/jour. Objectif : <b>${c.kcal} kcal</b>/jour, <b>${c.prot} g</b> de protéines, <b>${(c.eau / 1000).toFixed(1).replace('.', ',')} L</b> d'eau.${c.semaines ? ` Objectif atteint dans environ ${c.semaines} semaines.` : ''}</div>` : ''}
    <div class="be-act"><button class="btn-primary" onclick="beProfil()">${P.ok ? 'Enregistrer' : 'Calculer mes objectifs et commencer'}</button>${P.ok ? '<button class="btn-ghost" onclick="beEditProfil()">Fermer</button>' : ''}</div>
    <small class="be-hint">Conseils de bien-être, pas de conseil médical. Je ne descends jamais sous un minimum calorique sûr et je plafonne le rythme de perte.</small></div>`;
}
function renderBienetre(v){
  if(!BE.data.profil.ok || BE.edit){ v.innerHTML = `<div class="be">${formProfil()}</div>`; return; }
  const subs = [['sommeil', 'Sommeil'], ['repas', 'Repas'], ['corps', 'Corps'], ['mental', 'Mental'], ['bilan', 'Bilan']];
  const ec = BE.sub === 'repas' ? ecranRepas : BE.sub === 'corps' ? ecranCorps : BE.sub === 'mental' ? ecranMental : BE.sub === 'bilan' ? ecranBilan : ecranSommeil;
  v.innerHTML = `<div class="be">${carteResume()}<div class="be-subs">${subs.map(([k, l]) => `<button class="${BE.sub === k ? 'on' : ''}" onclick="beSub('${k}')">${l}</button>`).join('')}</div>${ec()}
    <button class="be-lien2" onclick="beEditProfil()">Modifier mon profil et mes objectifs</button></div>`;
}

// ---------- Branchement dans l'onglet Coach ----------
if(!CO_TABS.some(t => t[0] === 'bienetre')){ const i = CO_TABS.findIndex(t => t[0] === 'journee'); CO_TABS.splice(i >= 0 ? i + 1 : 0, 0, ['bienetre', 'Bien-être']); }
CO_TAB_ALIAS.bienetre = 'bienetre'; CO_TAB_ALIAS.sommeil = 'bienetre'; CO_TAB_ALIAS['bien-etre'] = 'bienetre';
const rendreAvant = coRender;
coRender = window.coRender = async function(){
  if(CO.tab !== 'bienetre') return rendreAvant.apply(this, arguments);
  if(!BE.force && BE.rendu){ const a = document.activeElement; if(a && a.closest && a.closest('#coBody .be') && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return; }
  BE.force = false;
  await charger();
  await rendreAvant.apply(this, arguments);
  BE.rendu = true;
};
const rendreTab = coRenderToday;
coRenderToday = window.coRenderToday = function(v){ if(CO.tab === 'bienetre') return renderBienetre(v); return rendreTab.apply(this, arguments); };

// ---------- Widget de l'accueil ----------
window.beOuvrir = function(sub, plan){
  BE.sub = sub || 'sommeil'; if(plan) BE.planOuvert = true;
  if(typeof coOpen === 'function') coOpen('bienetre');
};
window.beEauAcc = function(){
  const j = jourBE(); BE.data.eau[j] = (BE.data.eau[j] || 0) + 250; sauver(); rendreAccueil(); toast('+ 250 ml');
};
function actionAcc(){
  const s = S(), p = s.prochain && !s.prochain.logged ? s.prochain : null, n = enCours(), r = retardMin();
  if(!BE.data.profil.ok) return { t: 'Mets en place ton bien-être', r: 'Sommeil, calories, énergie : deux minutes pour commencer.', b: 'Commencer', f: "beOuvrir('sommeil')" };
  if(r != null && r >= 0) return { t: messageRetard(r)[0], r: messageRetard(r)[1], b: 'Je me couche maintenant', f: 'beJeMeCouche()', urgent: true };
  if(n) return { t: 'Tu dors depuis ' + hhmm(new Date(n.coucher)), r: 'Au réveil, fais le diagnostic de ta nuit.', b: 'Je me réveille', f: "beOuvrir('sommeil')" };
  if(!p) return { t: 'Planifie ton prochain coucher', r: 'Sans heure, pas de rappel. Choisis-la selon ta nuit de travail.', b: 'Planifier', f: "beOuvrir('sommeil', true)" };
  const at = new Date(p.at), lim = limiteCafe();
  return { t: 'Prochain coucher à ' + hhmm(at), r: 'Dans ' + dureeTxt((at - Date.now()) / 60000) + (lim && lim.getTime() > Date.now() ? ' · dernier café avant ' + hhmm(lim) : lim ? ' · plus de caféine maintenant' : ''), b: 'Voir mon sommeil', f: "beOuvrir('sommeil')" };
}
function accHtml(){
  const a = actionAcc();
  const rapide = BE.data.profil.ok ? `<div class="be-acc-q"><button onclick="beEauAcc()">+ 250 ml d'eau</button><button onclick="beOuvrir('repas')">Repas</button><button onclick="beOuvrir('mental')">Humeur</button></div>` : '';
  return `<div class="be-acc ${a.urgent ? 'urgent' : ''}"><div class="be-acc-tag">Bien-être</div>
    <div class="be-acc-t">${E(a.t)}</div><div class="be-acc-r">${E(a.r)}</div>
    <div class="be-acc-b"><button class="be-acc-go" onclick="${a.f}">${E(a.b)}</button><button class="be-acc-plus" onclick="beOuvrir('sommeil')">Ouvrir</button></div>
    ${BE.data.profil.ok ? carteResume() : ''}${rapide}</div>`;
}
function rendreAccueil(){
  const el = document.getElementById('agDashMini'); if(!el) return;
  if(!BE.loaded){ charger().then(() => rendreAccueil()); return; }
  let h = document.getElementById('beAccueil');
  if(!h){
    h = document.createElement('div'); h.id = 'beAccueil';
    const pp = document.getElementById('ppCarte'), tete = el.querySelector('.ag-hello');
    if(pp && pp.parentNode === el) el.insertBefore(h, pp.nextSibling);
    else if(tete && tete.nextSibling) el.insertBefore(h, tete.nextSibling); else el.insertBefore(h, el.firstChild);
  }
  h.innerHTML = accHtml();
}
(function brancherAccueil(){
  let essais = 0;
  const t = setInterval(() => {
    if(typeof agRenderDashMini === 'function'){
      clearInterval(t);
      if(!agRenderDashMini.__be){
        const base = agRenderDashMini;
        agRenderDashMini = window.agRenderDashMini = function(){ const r = base.apply(this, arguments); try { rendreAccueil(); } catch(e){} return r; };
        agRenderDashMini.__be = true;
      }
      try { rendreAccueil(); } catch(e){}
    } else if(++essais > 60) clearInterval(t);
  }, 500);
  setInterval(() => { try { if(BE.loaded) rendreAccueil(); } catch(e){} }, 60000);
})();
veille();
// Charge tôt pour que le plein écran de coucher marche même sans ouvrir l'onglet
setTimeout(() => { charger().then(() => { if(BE.data.sommeil.prochain) syncRappels(); }); }, 3500);

(function css(){
  if(document.getElementById('beCss')) return;
  const s = document.createElement('style'); s.id = 'beCss';
  s.textContent = `
.be-acc{background:var(--card);border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:var(--radius-md,10px);padding:16px;margin:0 0 14px;display:flex;flex-direction:column;gap:8px}
.be-acc.urgent{border-left-color:var(--red,#e5484d)}
.be-est{padding:8px 10px;border-radius:10px;background:var(--card2);border:1px dashed var(--border)}.be-aide summary{cursor:pointer;font-size:12.5px;color:var(--muted)}.be-card label small{font-size:11px;opacity:.8}
.be-acc-tag{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:600}
.be-acc-t{font-family:var(--font-display,inherit);font-size:16px;font-weight:600;color:var(--text);line-height:1.3}.be-acc-r{font-size:14px;color:var(--muted);line-height:1.45}
.be-acc-b{display:flex;gap:10px;flex-wrap:wrap}.be-acc-go{background:var(--accent);color:var(--on-accent,var(--bg));border:0;border-radius:var(--radius-sm,4px);padding:10px 16px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit}
.be-acc-plus{background:transparent;color:var(--muted);border:1px solid var(--border);border-radius:var(--radius-sm,4px);padding:10px 14px;font-size:14px;cursor:pointer;font-family:inherit}
.be-acc-q{display:flex;gap:6px;flex-wrap:wrap}.be-acc-q button{margin:0;width:auto;padding:7px 12px;border-radius:999px;border:1px solid var(--border);background:var(--card2);color:var(--text);font-size:12.5px;cursor:pointer;font-family:inherit}
.be-acc .be-resume{margin-top:2px}
.be{display:flex;flex-direction:column;gap:12px;padding-bottom:28px}
.be-resume{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.be-r{padding:10px;border-radius:14px;background:var(--card);border:1px solid var(--border)}.be-r small{display:block;font-size:11px;color:var(--muted);text-transform:uppercase}.be-r b{display:block;font-size:18px;color:var(--text);margin:2px 0 6px}.be-r em{font-style:normal;font-size:12px;color:var(--muted)}
.be-r i{display:block;height:5px;border-radius:3px;background:var(--card2);position:relative;overflow:hidden}.be-r i::after{content:'';position:absolute;inset:0;width:var(--p);background:var(--accent);border-radius:3px}
.be-subs{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}.be-subs::-webkit-scrollbar{display:none}
.be-subs button{flex:0 0 auto;margin:0;width:auto;padding:8px 14px;border-radius:999px;border:1px solid var(--border);background:var(--card);color:var(--muted);font-size:13px;cursor:pointer}
.be-subs button.on{border-color:var(--accent);color:var(--text);background:color-mix(in srgb,var(--accent) 16%,transparent)}
.be-card{padding:14px;border-radius:14px;background:var(--card);border:1px solid var(--border);display:flex;flex-direction:column;gap:8px}
.be-card h3{margin:0;font-size:15px;color:var(--text)}.be-card h4{margin:8px 0 2px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}.be-card p{margin:0;font-size:13.5px;line-height:1.45;color:var(--text)}
.be-card summary{cursor:pointer;font-weight:700;color:var(--text)}.be-card label{font-size:12px;color:var(--muted);display:flex;flex-direction:column;gap:3px}.be-card label.ag-check{flex-direction:row}
.be-card input,.be-card select,.be-card textarea{margin:0;width:100%}
.be-alerte{border-color:var(--red,#e5484d);background:color-mix(in srgb,var(--red,#e5484d) 10%,var(--card))}.be-nuit{border-color:var(--accent)}
.be-act{display:flex;gap:8px;flex-wrap:wrap}.be-act button{margin:0;flex:1 1 auto;width:auto}
.be-2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.be-chips{display:flex;flex-wrap:wrap;gap:6px}.be-chips button{margin:0;width:auto;padding:7px 12px;border-radius:999px;border:1px solid var(--border);background:var(--card2);color:var(--text);font-size:13px;cursor:pointer}.be-chips button.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 20%,transparent)}
.be-hint{display:block;color:var(--muted);font-size:11.5px;line-height:1.4}
.be-ligne{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)}.be-ligne input{flex:0 0 78px;width:78px;margin:0}.be-ligne>input:only-of-type:first-child{flex:1;width:auto}
.be-ligne button{margin:0;width:auto;padding:6px 12px;border-radius:10px;border:1px solid var(--border);background:var(--card2);color:var(--text);cursor:pointer}.be-ligne button.x{border:0;background:transparent;color:var(--muted);padding:6px}
.be-d{flex:1;min-width:0}.be-d b{display:block;font-size:13.5px;color:var(--text)}.be-d span{font-size:12px;color:var(--muted)}
.be-gros-n{font-size:13px;color:var(--muted)}.be-gros-n b{font-size:26px;color:var(--text)}.be-gros-n span{margin-left:6px}
.be-jauge{height:8px;border-radius:4px;background:var(--card2);overflow:hidden}.be-jauge i{display:block;height:100%;background:var(--accent);border-radius:4px}
.be-spark{width:100%;height:64px}
.be-rt{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:5px 0;font-size:13px;color:var(--text)}.be-rt button{margin:0;width:auto;border:0;background:transparent;color:var(--muted);cursor:pointer}.be-rt .rouge,.rouge{color:var(--red,#e5484d);font-style:normal}.be-motif{font-size:11.5px;color:var(--muted);margin:-2px 0 4px}
.be-ech{display:flex;flex-direction:column;gap:4px}.be-ech b{font-size:12px;color:var(--muted)}
.be-mot{font-style:italic;color:var(--text)}.be-gr{margin:0}
.be-lien2{margin:0;background:transparent;border:0;color:var(--muted);font-size:12.5px;text-decoration:underline;cursor:pointer;width:auto;align-self:center}
.be-file{display:flex;align-items:center;justify-content:center;cursor:pointer;text-align:center}.be-file input{display:none}
.be-md p{margin:6px 0;font-size:13.5px;line-height:1.5}.be-md h4{margin:10px 0 2px;color:var(--text)}
.be-ov{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;background:#0d0f0c;color:#f4f2ec;font-family:inherit;overflow:auto;text-align:center}
.be-ov.coucher{background:radial-gradient(circle at 50% 30%,color-mix(in srgb,var(--accent) 22%,#0d0f0c),#0d0f0c 70%)}.be-ov.noir{background:#000}
.be-ov-in{width:100%;max-width:420px;display:flex;flex-direction:column;gap:14px}.be-ov h1{font-size:34px;margin:0;line-height:1.1}.be-ov h2{font-size:22px;margin:0}.be-ov p{margin:0;font-size:16px;line-height:1.5;color:#cfcdc2}
.be-ov-h{font-size:13px;color:#8f9181}.be-ov small{color:#8f9181}

.be-ov label{display:flex;flex-direction:column;gap:6px;font-size:14px;color:#cfcdc2;text-align:left}.be-ov input,.be-ov textarea{margin:0;width:100%;background:#161913;color:#f4f2ec;border:1px solid #2a2e24;border-radius:12px;padding:12px;font-size:16px}
.be-gros{margin:0;width:100%;padding:18px;border:0;border-radius:16px;font-family:inherit;background:var(--accent);color:var(--on-accent,#fff);font-size:18px;font-weight:800;cursor:pointer}
.be-opt{margin:0;width:100%;padding:15px;border:1px solid #2a2e24;border-radius:14px;background:#161913;color:#f4f2ec;font-size:15px;text-align:left;cursor:pointer}
.be-lien{margin:0;background:transparent;border:0;color:#8f9181;font-size:14px;text-decoration:underline;cursor:pointer;width:auto;align-self:center}
.be-ov .be-chips{justify-content:center}.be-ov .be-chips button{background:#161913;color:#f4f2ec;border-color:#2a2e24}.be-ov .be-chips button.on{background:var(--accent);border-color:var(--accent);color:var(--on-accent,#fff)}
.be-cercle{width:200px;height:200px;border-radius:50%;margin:10px auto;background:radial-gradient(circle,color-mix(in srgb,var(--accent) 80%,#fff),var(--accent));box-shadow:0 0 60px color-mix(in srgb,var(--accent) 40%,transparent);transform:scale(.6)}
.be-min{font-size:64px;font-weight:300;color:#33362b;font-variant-numeric:tabular-nums}.be-ov.noir .be-ov-h,.be-ov.noir .be-lien{color:#262920}
`;
  document.head.appendChild(s);
})();
})();
