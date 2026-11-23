// ============================================================
// JOURNEE.JS - "Ma journée" : le patron du travail (onglet Coach)
// ------------------------------------------------------------
// - Un plan par jour : chaque tâche a une heure de début et une durée.
// - "Maintenant" : UNE seule chose mise en avant, la suivante en dessous.
// - Tu coches quand c'est fini ; si tu as pris du retard, "Décaler la suite".
// - Le patron (IA) vide ta tête : tu écris tout en vrac, il pose quelques
//   questions, puis propose un planning pour 1 à 7 jours (tu valides).
// - Routines : des tâches qui reviennent seules (ex : retouches chaque matin).
// - Alertes : chaque tâche crée un rappel (table reminders), envoyé sur le
//   téléphone même app fermée, à l'heure du début.
// Données : user_settings.user_preferences.patron_journee (+ copie locale).
// ============================================================
(function(){
'use strict';
if(typeof CO === 'undefined' || typeof CO_TABS === 'undefined') return;

const KEY = 'patron_journee';
const JR = { loaded: false, jour: null, data: { jours: {}, routines: [], vrac: '', regles: { debut: '08:00', fin: '18:00', pauseDeb: '12:30', pauseFin: '13:30' } },
  chat: [], plan: null, busy: false, edit: null, ajout: false, timer: null };
window.JR = JR;
function jrR(){ JR.force = true; return coRender(); }

const E = s => (typeof coE === 'function' ? coE(s) : String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
const aujourdhui = d => (typeof coToday === 'function' ? coToday(d) : new Date().toISOString().slice(0, 10));
const decaler = (iso, n) => aujourdhui(new Date(new Date(iso + 'T12:00:00').getTime() + n * 864e5));
const enMin = h => { const m = /^(\d{1,2}):(\d{2})$/.exec(h || ''); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
const heureFin = n => n >= 1440 ? 'minuit' : enHeure(n);
const enHeure = n => { n = Math.max(0, Math.min(1439, Math.round(n))); return String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0'); };
const duree = m => m >= 60 ? Math.floor(m / 60) + ' h' + (m % 60 ? String(m % 60).padStart(2, '0') : '') : m + ' min';
const maintenantMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const idUnique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const jourLong = iso => new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const jourCourt = iso => new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });

// ---------- Données ----------
function lireLocal(){ try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch(e){ return null; } }
function normaliser(d){
  d = d && typeof d === 'object' ? d : {};
  const r = Object.assign({ debut: '08:00', fin: '18:00', pauseDeb: '12:30', pauseFin: '13:30' }, d.regles || {});
  return { jours: d.jours || {}, routines: Array.isArray(d.routines) ? d.routines : [], vrac: d.vrac || '', regles: r };
}
async function charger(){
  if(JR.loaded) return;
  JR.data = normaliser(lireLocal());
  try {
    const u = (await sb.auth.getUser()).data.user;
    if(u){
      const { data } = await sb.from('user_settings').select('user_preferences').eq('user_id', u.id).maybeSingle();
      const cloud = data && data.user_preferences && data.user_preferences[KEY];
      if(cloud && (!lireLocal() || String(cloud.maj || '') >= String((lireLocal() || {}).maj || ''))) JR.data = normaliser(cloud);
    }
  } catch(e){ console.warn('journee charger', e); }
  JR.loaded = true;
}
let tmSave = null;
function sauver(){
  JR.data.maj = new Date().toISOString();
  try { localStorage.setItem(KEY, JSON.stringify(JR.data)); } catch(e){}
  clearTimeout(tmSave);
  tmSave = setTimeout(async () => {
    try {
      const u = (await sb.auth.getUser()).data.user; if(!u) return;
      const { data } = await sb.from('user_settings').select('id,user_preferences').eq('user_id', u.id).maybeSingle();
      const prefs = Object.assign({}, (data && data.user_preferences) || {}, { [KEY]: JR.data });
      if(data) await sb.from('user_settings').update({ user_preferences: prefs }).eq('id', data.id);
      else await sb.from('user_settings').upsert({ user_id: u.id, user_preferences: prefs }, { onConflict: 'user_id' });
    } catch(e){ console.warn('journee sauver', e); }
  }, 600);
}

// Les routines se posent seules la première fois qu'un jour s'ouvre
function jour(iso){
  let j = JR.data.jours[iso];
  if(!j){
    j = JR.data.jours[iso] = { taches: [], routinesFaites: false };
  }
  if(!j.routinesFaites){
    j.routinesFaites = true;
    const wd = new Date(iso + 'T12:00:00').getDay();
    (JR.data.routines || []).filter(r => (r.jours || []).includes(wd)).forEach(r => {
      j.taches.push({ id: idUnique(), t: r.t, min: r.min, debut: r.debut || '', fait: false, routine: r.id });
    });
    sauver();
  }
  return j;
}
const trier = j => j.taches.sort((a, b) => (enMin(a.debut) == null ? 9999 : enMin(a.debut)) - (enMin(b.debut) == null ? 9999 : enMin(b.debut)));

// Place les tâches sans heure à la suite, en sautant la pause, les séances et les tâches qui ont déjà une heure.
// tout = true : on remet aussi à plat les tâches qui ont une heure (utilisé pour "décaler la suite").
function ranger(iso, depuis, tout){
  const j = jour(iso), r = JR.data.regles;
  const pd = enMin(r.pauseDeb), pf = enMin(r.pauseFin), fin = enMin(r.fin) || 1080;
  let t = Math.max(enMin(r.debut) || 480, depuis || 0);
  const occupe = seancesDuJour(iso).map(f => ({ debut: f.debut, fin: f.fin }));
  const aPlacer = j.taches.filter(x => !x.fait && (tout || enMin(x.debut) == null));
  if(!tout) j.taches.filter(x => !x.fait && enMin(x.debut) != null).forEach(x => occupe.push({ debut: enMin(x.debut), fin: enMin(x.debut) + (Number(x.min) || 30) }));
  aPlacer.sort((a, b) => (enMin(a.debut) == null ? 9999 : enMin(a.debut)) - (enMin(b.debut) == null ? 9999 : enMin(b.debut)));
  aPlacer.forEach(x => {
    const d = Number(x.min) || 30;
    for(let essai = 0; essai < 60; essai++){
      if(pd != null && pf != null && t < pf && t + d > pd){ t = pf; continue; }
      const choc = occupe.find(f => t < f.fin && t + d > f.debut);
      if(choc){ t = choc.fin + 5; continue; }
      break;
    }
    x.debut = enHeure(t); occupe.push({ debut: t, fin: t + d }); t += d + 5;
  });
  trier(j); sauver(); synchroRappels(iso);
  return j.taches.some(x => !x.fait && enMin(x.debut) != null && enMin(x.debut) + (Number(x.min) || 30) > fin);
}
function seancesDuJour(iso){
  try {
    return (typeof shoots !== 'undefined' ? shoots : []).map(sh => {
      const d = sh.date ? new Date(sh.date) : null;
      if(!d || isNaN(d) || aujourdhui(d) !== iso) return null;
      const debut = d.getHours() * 60 + d.getMinutes(); if(!debut) return null;
      return { titre: 'Séance' + (sh.type ? ' ' + sh.type : ''), debut, fin: debut + 120 };
    }).filter(Boolean);
  } catch(e){ return []; }
}

// ---------- Alertes (table reminders : envoyées même app fermée) ----------
async function synchroRappels(iso){
  const j = JR.data.jours[iso]; if(!j || typeof dbInsert !== 'function') return;
  for(const x of j.taches){
    try {
      const veut = !x.fait && x.debut && new Date(iso + 'T' + x.debut + ':00').getTime() > Date.now();
      const txt = `🎯 ${x.debut} · ${x.t} (${duree(Number(x.min) || 30)})`;
      if(x.rappelId && (!veut || x.rappelTxt !== txt)){
        await sb.from('reminders').delete().eq('id', x.rappelId); x.rappelId = null; x.rappelTxt = null; sauver();
      }
      if(veut && !x.rappelId){
        const row = await dbInsert('reminders', { text: txt, time: x.debut, type: 'Journée', due_date: new Date(iso + 'T' + x.debut + ':00').toISOString(), sent: false });
        if(row){ x.rappelId = row.id; x.rappelTxt = txt; sauver(); if(typeof reminders !== 'undefined') reminders.push(row); }
      }
    } catch(e){ console.warn('rappel journee', e); }
  }
}
async function retirerRappel(x){
  if(x && x.rappelId){ try { await sb.from('reminders').delete().eq('id', x.rappelId); if(typeof reminders !== 'undefined') reminders = reminders.filter(r => r.id !== x.rappelId); } catch(e){} x.rappelId = null; }
}

// ---------- Actions ----------
window.jrJour = function(iso){ JR.jour = iso; JR.edit = null; JR.ajout = false; jrR(); };
window.jrFait = async function(iso, id){
  const x = jour(iso).taches.find(t => t.id === id); if(!x) return;
  x.fait = !x.fait; x.finA = x.fait ? new Date().toISOString() : null;
  if(x.fait) await retirerRappel(x); else synchroRappels(iso);
  sauver(); jrR();
};
window.jrSupprimer = async function(iso, id){
  const j = jour(iso), x = j.taches.find(t => t.id === id); if(!x) return;
  if(typeof agConfirm === 'function' && !await agConfirm('Retirer cette tâche ?')) return;
  await retirerRappel(x); j.taches = j.taches.filter(t => t.id !== id); sauver(); jrR();
};
window.jrDecaler = function(iso){
  const j = jour(iso), reste = j.taches.filter(t => !t.fait);
  if(!reste.length) return;
  const trop = ranger(iso, Math.ceil((maintenantMin() + 1) / 5) * 5, true);
  coToast && coToast(trop ? 'Décalé : certaines tâches finissent après ta fin de journée.' : 'Le reste de la journée est décalé à partir de maintenant.');
  jrR();
};
window.jrRanger = function(iso){ const trop = ranger(iso); coToast && coToast(trop ? 'Rangé, mais ça dépasse ta fin de journée : enlève ou raccourcis une tâche.' : 'Journée rangée avec des heures précises.'); jrR(); };
window.jrAjouterForm = function(iso){ JR.ajout = !JR.ajout; JR.edit = null; jrR(); setTimeout(() => { const i = document.getElementById('jrNouv'); if(i) i.focus(); }, 60); };
window.jrEditer = function(id){ JR.edit = JR.edit === id ? null : id; JR.ajout = false; jrR(); };
window.jrEnregistrer = async function(iso, id){
  const g = k => (document.getElementById(k) || {}).value;
  const t = String(g('jrNouv') || '').trim(); if(!t){ coToast && coToast('Écris la tâche', 'error'); return; }
  const libre = (document.getElementById('jrLibre') || {}).checked;
  let debut = '', min;
  if(libre){ min = Number(g('jrDuree')) || 60; }
  else {
    const d = enMin(g('jrDebut')); let f = enMin(g('jrFin'));
    if(d == null || f == null){ coToast && coToast('Choisis l\'heure de début et l\'heure de fin', 'error'); return; }
    if(f === 0) f = 1440;
    if(f <= d){ coToast && coToast('La fin doit être après le début (pour finir à minuit, mets 00:00)', 'error'); return; }
    debut = enHeure(d); min = f - d;
  }
  const rep = (document.getElementById('jrRep') || {}).checked;
  const j = jour(iso);
  let x = id ? j.taches.find(a => a.id === id) : null;
  if(x){ x.t = t; x.min = min; x.debut = debut; }
  else { x = { id: idUnique(), t, min, debut, fait: false }; j.taches.push(x); }
  if(rep){
    const wd = new Date(iso + 'T12:00:00').getDay();
    const r = { id: idUnique(), t, min, debut, jours: [1, 2, 3, 4, 5].includes(wd) ? [1, 2, 3, 4, 5] : [wd] };
    JR.data.routines.push(r); x.routine = r.id;
  }
  trier(j); JR.ajout = false; JR.edit = null; sauver(); await synchroRappels(iso); jrR();
};
window.jrFormMaj = function(){
  const g = k => (document.getElementById(k) || {}).value;
  const libre = (document.getElementById('jrLibre') || {}).checked;
  const h = document.getElementById('jrHoraire'), l = document.getElementById('jrLibreBox'); if(h) h.style.display = libre ? 'none' : ''; if(l) l.style.display = libre ? '' : 'none';
  const o = document.getElementById('jrCalc'); if(!o) return;
  const d = enMin(g('jrDebut')); let f = enMin(g('jrFin')); if(f === 0) f = 1440;
  o.textContent = !libre && d != null && f != null && f > d ? 'Ça fait ' + duree(f - d) : '';
};
window.jrDeplacer = function(iso, id, sens){
  const j = jour(iso), l = j.taches, i = l.findIndex(t => t.id === id), k = i + sens; if(i < 0 || k < 0 || k >= l.length) return;
  const a = l[i], b = l[k]; const da = a.debut; a.debut = b.debut; b.debut = da; l[i] = b; l[k] = a; trier(j); sauver(); synchroRappels(iso); jrR();
};
window.jrRoutinesVoir = function(){ JR.routinesOuvert = !JR.routinesOuvert; jrR(); };
window.jrRoutineSuppr = function(id){ JR.data.routines = JR.data.routines.filter(r => r.id !== id); sauver(); jrR(); };
window.jrRegle = function(k, v){ JR.data.regles[k] = v; sauver(); };
window.jrVrac = function(v){ JR.data.vrac = v; sauver(); };

// ---------- Le patron (IA) ----------
function contexteSemaine(){
  const out = [], base = aujourdhui();
  for(let i = 0; i < 7; i++){
    const iso = decaler(base, i), j = JR.data.jours[iso];
    const fixes = seancesDuJour(iso).map(f => `${enHeure(f.debut)}-${enHeure(f.fin)} ${f.titre}`);
    const deja = j ? j.taches.filter(t => !t.fait).map(t => `${t.debut || '?'} ${t.t} (${t.min} min)`) : [];
    if(fixes.length || deja.length) out.push(`${iso} (${jourCourt(iso)}) : ${[...fixes, ...deja].join(' ; ')}`);
  }
  return out.join('\n') || 'Rien de prévu pour le moment.';
}
function systemePatron(){
  const r = JR.data.regles;
  return `Tu es le PATRON du travail de Henzo, photographe en Côte d'Ivoire (studio Henzo, retouches photo, portfolio, affiches et créations, séances, réseaux). Henzo a plein d'idées la veille mais se disperse le jour J. Ton rôle : l'aider à décider, puis à tenir un planning clair, avec des heures précises et des durées réalistes.
Règles de travail de Henzo : journée de ${r.debut} à ${r.fin}, pause de ${r.pauseDeb} à ${r.pauseFin}. Pas plus de 6 h de travail concentré par jour, garde du temps libre. Une seule chose à la fois : regroupe les tâches du même type (toutes les retouches ensemble, toutes les affiches ensemble). Mets le travail qui demande le plus de concentration le matin. Mets de la marge (5 à 10 min) entre deux blocs. Ne place jamais une tâche pendant une séance déjà prévue.
Ton ton : direct, chaleureux, bref, en français simple. Pas de longs discours.
Aujourd'hui : ${aujourdhui()} (${jourLong(aujourdhui())}).
Déjà prévu :\n${contexteSemaine()}
Réponds UNIQUEMENT en JSON, sous l'une de ces formes :
{"questions":["question courte 1","question courte 2"]}  (au plus 3 questions, seulement si une info manque vraiment : délai, durée, priorité, nombre d'éléments)
{"plan":[{"jour":"AAAA-MM-JJ","titre":"tâche courte et concrète","debut":"HH:MM","duree":90}],"mot":"une phrase de patron pour la journée"}  (duree en minutes)
Si Henzo a déjà répondu à tes questions ou donne assez d'infos, propose le plan directement. Ne repose pas la même question.`;
}
window.jrPatron = async function(texte){
  const t = String(texte != null ? texte : (document.getElementById('jrDiscu') || {}).value || '').trim();
  if(!t || JR.busy) return;
  if(typeof mkAI !== 'function'){ coErr && coErr('IA indisponible : connecte-la dans les réglages du Coach.'); return; }
  JR.chat.push({ role: 'user', text: t }); JR.busy = true; JR.plan = null; jrR();
  try {
    const r = await mkAI({ system: systemePatron(), messages: JR.chat.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', text: m.json || m.text })), maxTokens: 2500 });
    const j = typeof mkJson === 'function' ? mkJson(r.text) : JSON.parse(r.text);
    if(Array.isArray(j.questions) && j.questions.length){
      JR.chat.push({ role: 'coach', text: j.questions.slice(0, 3).join('\n'), json: JSON.stringify(j), qs: j.questions.slice(0, 3) });
    } else if(Array.isArray(j.plan) && j.plan.length){
      const ok = j.plan.map(p => ({ jour: /^\d{4}-\d{2}-\d{2}$/.test(p.jour) ? p.jour : aujourdhui(), titre: String(p.titre || '').trim(), debut: enMin(p.debut) != null ? p.debut : '', min: Math.max(5, Math.min(600, Number(p.duree) || 30)) })).filter(p => p.titre);
      JR.plan = { items: ok, mot: String(j.mot || '') };
      JR.chat.push({ role: 'coach', text: j.mot || 'Voilà ma proposition.', json: JSON.stringify(j) });
    } else throw new Error('Réponse vide, réessaie.');
  } catch(e){ JR.chat.pop(); coErr && coErr(e); }
  JR.busy = false; jrR();
  setTimeout(() => { const el = document.getElementById('jrDiscu'); if(el) el.focus(); }, 80);
};
window.jrVider = function(){
  const v = (document.getElementById('jrVrac') || {}).value || JR.data.vrac;
  if(!String(v).trim()){ coToast && coToast('Écris d\'abord ce que tu as en tête', 'error'); return; }
  JR.chat = []; JR.plan = null; JR.patronOuvert = true;
  jrPatron('Voici tout ce que j\'ai en tête, en vrac :\n' + v + '\nAide-moi à décider quoi faire et à planifier.');
};
window.jrValiderPlan = async function(){
  if(!JR.plan) return;
  const parJour = {};
  JR.plan.items.forEach(p => { (parJour[p.jour] = parJour[p.jour] || []).push(p); });
  for(const iso of Object.keys(parJour)){
    const j = jour(iso);
    parJour[iso].forEach(p => j.taches.push({ id: idUnique(), t: p.titre, min: p.min, debut: p.debut, fait: false }));
    if(parJour[iso].some(p => !p.debut)) ranger(iso); else { trier(j); sauver(); await synchroRappels(iso); }
  }
  const premier = Object.keys(parJour).sort()[0];
  JR.plan = null; JR.chat = []; JR.patronOuvert = false; JR.data.vrac = ''; sauver();
  JR.jour = premier || aujourdhui();
  coToast && coToast('Planning enregistré. Tu seras alerté à chaque heure de début.');
  jrR();
};
window.jrPatronVoir = function(){ JR.patronOuvert = !JR.patronOuvert; jrR(); };
window.jrAnnulerPlan = function(){ JR.plan = null; JR.chat = []; jrR(); };

// ---------- Affichage ----------
function formTache(iso, x){
  const id = x ? `'${x.id}'` : "''";
  const sansHeure = x && !x.debut;
  const dMin = x && enMin(x.debut) != null ? enMin(x.debut) : null;
  const debutV = dMin != null ? x.debut : '', finV = dMin != null ? (dMin + Number(x.min || 30) >= 1440 ? '00:00' : enHeure(dMin + Number(x.min || 30))) : '';
  const durees = [[15, '15 min'], [30, '30 min'], [60, '1 h'], [90, '1 h 30'], [120, '2 h'], [180, '3 h'], [240, '4 h'], [360, '6 h']];
  const dv = x ? Number(x.min) : 60;
  return `<div class="jr-form">
    <input id="jrNouv" placeholder="Ex : Retoucher les photos de Destinée" value="${E(x ? x.t : '')}">
    <div id="jrHoraire" style="${sansHeure ? 'display:none' : ''}">
      <div class="jr-2"><label>De<input id="jrDebut" type="time" value="${E(debutV)}" oninput="jrFormMaj()" onchange="jrFormMaj()"></label>
        <label>À<input id="jrFin" type="time" value="${E(finV)}" oninput="jrFormMaj()" onchange="jrFormMaj()"></label></div>
      <small class="jr-hint" id="jrCalc"></small>
      <small class="jr-hint">Exemples : de 14:00 à 00:00 (minuit), de 18:00 à 20:00.</small>
    </div>
    <label class="ag-check"><input type="checkbox" id="jrLibre" ${sansHeure ? 'checked' : ''} onchange="jrFormMaj()"> Je ne sais pas l'heure : le patron la place</label>
    <div id="jrLibreBox" style="${sansHeure ? '' : 'display:none'}"><label>Combien de temps ?<select id="jrDuree">${durees.map(([m, l]) => `<option value="${m}" ${m === dv ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
    <label class="ag-check"><input type="checkbox" id="jrRep"> Se répète chaque jour de travail (routine)</label>
    <div class="jr-act"><button class="btn-primary" onclick="jrEnregistrer('${iso}',${id})">Enregistrer</button><button class="btn-ghost" onclick="${x ? `jrEditer('${x.id}')` : 'jrAjouterForm()'}">Annuler</button></div>
  </div>`;
}
function ligne(iso, x, maintenant){
  const finMin = enMin(x.debut) != null ? enMin(x.debut) + Number(x.min || 30) : null, fin = finMin != null ? heureFin(finMin) : '';
  const retard = !x.fait && iso === aujourdhui() && finMin != null && finMin < maintenantMin();
  const encours = maintenant && maintenant.id === x.id;
  return `<div class="jr-l ${x.fait ? 'ok' : ''} ${encours ? 'now' : ''} ${retard ? 'late' : ''}">
    <button class="jr-ck" onclick="jrFait('${iso}','${x.id}')" aria-label="Fait">${x.fait ? '✓' : ''}</button>
    <div class="jr-d" onclick="jrEditer('${x.id}')"><b>${E(x.t)}</b>
      <span>${x.debut ? `${E(x.debut)} → ${E(fin)} · ` : 'Sans heure · '}${duree(Number(x.min) || 30)}${x.routine ? ' · routine' : ''}${retard ? ' · en retard' : ''}</span></div>
    <div class="jr-m"><button onclick="jrDeplacer('${iso}','${x.id}',-1)" aria-label="Monter">↑</button><button onclick="jrDeplacer('${iso}','${x.id}',1)" aria-label="Descendre">↓</button><button onclick="jrSupprimer('${iso}','${x.id}')" aria-label="Retirer">✕</button></div>
  </div>${JR.edit === x.id ? formTache(iso, x) : ''}`;
}
function blocPatron(){
  if(!JR.patronOuvert && !JR.plan) return '';
  const q = JR.chat.map(m => m.role === 'user' ? (m.text.startsWith('Voici tout ce que') ? '' : `<div class="jr-msg moi">${E(m.text)}</div>`) : `<div class="jr-msg coach">${E(m.text).replace(/\n/g, '<br>')}</div>`).join('');
  const plan = JR.plan ? `<div class="jr-plan"><h4>Ma proposition</h4>${Object.entries(JR.plan.items.reduce((a, p) => ((a[p.jour] = a[p.jour] || []).push(p), a), {})).sort().map(([iso, l]) => `<div class="jr-pj"><b>${E(jourLong(iso))}</b>${l.map(p => `<div class="jr-pi"><span>${E(p.debut || '--:--')}</span><div>${E(p.titre)}<small>${duree(p.min)}</small></div></div>`).join('')}</div>`).join('')}
    <div class="jr-act"><button class="btn-primary" onclick="jrValiderPlan()">Valider ce planning</button><button class="btn-ghost" onclick="jrAnnulerPlan()">Refaire</button></div>
    <small class="jr-hint">Pour ajuster : écris « mets les affiches l'après-midi » ci-dessous.</small></div>` : '';
  return `<div class="jr-card jr-patron"><h3>Le patron</h3>${q}${JR.busy ? '<div class="jr-msg coach">Je réfléchis...</div>' : ''}${plan}
    <div class="jr-say"><textarea id="jrDiscu" rows="2" placeholder="${JR.chat.length ? 'Ta réponse...' : 'Dis-moi ce que tu veux faire...'}" ${JR.busy ? 'disabled' : ''}></textarea>
    <button class="btn-primary" ${JR.busy ? 'disabled' : ''} onclick="jrPatron()">Envoyer</button></div></div>`;
}
function renderJournee(v){
  const base = aujourdhui(); if(!JR.jour) JR.jour = base;
  const iso = JR.jour, j = jour(iso), reste = j.taches.filter(t => !t.fait);
  const total = j.taches.length, faits = total - reste.length, minReste = reste.reduce((a, t) => a + (Number(t.min) || 30), 0);
  const estAuj = iso === base, nowMin = maintenantMin();
  let maintenant = null;
  if(estAuj && reste.length){
    maintenant = reste.find(t => enMin(t.debut) != null && enMin(t.debut) <= nowMin && nowMin < enMin(t.debut) + (Number(t.min) || 30)) || reste.find(t => enMin(t.debut) == null || enMin(t.debut) <= nowMin) || reste[0];
  } else if(!estAuj && reste.length) maintenant = reste[0];
  const suivante = maintenant ? reste.find(t => t.id !== maintenant.id && (enMin(t.debut) == null || enMin(maintenant.debut) == null || enMin(t.debut) >= enMin(maintenant.debut))) : null;
  const bandeau = Array.from({ length: 7 }, (_, i) => decaler(base, i - 1)).map(d => {
    const jj = JR.data.jours[d], n = jj ? jj.taches.length : 0, f = jj ? jj.taches.filter(t => t.fait).length : 0;
    return `<button class="${d === iso ? 'on' : ''}" onclick="jrJour('${d}')"><small>${d === base ? "Auj." : d === decaler(base, 1) ? 'Demain' : d === decaler(base, -1) ? 'Hier' : jourCourt(d).split(' ')[0]}</small><b>${new Date(d + 'T12:00:00').getDate()}</b><i>${n ? f + '/' + n : '·'}</i></button>`;
  }).join('');
  const fixes = seancesDuJour(iso);
  const pct = total ? Math.round(faits / total * 100) : 0;
  const r = JR.data.regles;
  v.innerHTML = `<div class="jr">
    <div class="jr-jours">${bandeau}</div>
    <div class="jr-tete"><div><h2>${E(jourLong(iso))}</h2><span>${total ? `${faits}/${total} faites · il reste ${duree(minReste)}` : 'Rien de planifié'}</span></div>
      ${total ? `<div class="jr-pct" style="--p:${pct}"><b>${pct}%</b></div>` : ''}</div>
    ${fixes.length ? `<div class="jr-seance">${fixes.map(f => `📷 ${enHeure(f.debut)}-${enHeure(f.fin)} ${E(f.titre)}`).join('<br>')}</div>` : ''}
    ${maintenant ? `<div class="jr-now"><small>${estAuj ? 'MAINTENANT' : 'PREMIÈRE TÂCHE'}</small><h3>${E(maintenant.t)}</h3>
      <p>${maintenant.debut ? `${E(maintenant.debut)} → ${heureFin(enMin(maintenant.debut) + (Number(maintenant.min) || 30))} · ` : ''}${duree(Number(maintenant.min) || 30)}</p>
      <div class="jr-act"><button class="btn-primary" onclick="jrFait('${iso}','${maintenant.id}')">C'est fait</button>${estAuj ? `<button class="btn-ghost" onclick="jrDecaler('${iso}')">Je suis en retard : décaler la suite</button>` : ''}</div>
      ${suivante ? `<div class="jr-next">Ensuite : <b>${E(suivante.t)}</b>${suivante.debut ? ' à ' + E(suivante.debut) : ''}</div>` : '<div class="jr-next">C\'est la dernière.</div>'}
      <div class="jr-regle">Une seule chose à la fois. Ne touche à rien d'autre avant d'avoir coché.</div></div>`
      : total && !reste.length ? `<div class="jr-now fin"><h3>Journée terminée</h3><p>Tout est coché. Prépare demain pendant que tu as les idées claires.</p></div>` : ''}
    ${!total ? `<div class="jr-card jr-aide"><h3>Comment ça marche</h3><ol>
      <li><b>+ Tâche</b> : écris ce que tu dois faire et choisis l'heure, par exemple de 14:00 à 18:00. Tu es alerté à 14:00.</li>
      <li>Le jour J, l'écran te montre <b>une seule tâche</b> : celle de maintenant. Tu ne regardes que celle-là.</li>
      <li>Quand c'est fini, tu coches « C'est fait ». En retard ? « Décaler la suite » refait les heures.</li>
      <li>Les idées pas claires ? <b>Demander au patron</b> : il te pose des questions et fait le planning avec toi.</li></ol></div>` : ''}
    <div class="jr-barre"><button class="btn-primary" onclick="jrAjouterForm()">+ Tâche</button><button class="btn-secondary" onclick="jrPatronVoir()">Demander au patron</button>${reste.some(t => !t.debut) || reste.length > 1 ? `<button class="btn-ghost" onclick="jrRanger('${iso}')">Ranger mes heures</button>` : ''}</div>
    ${JR.ajout ? formTache(iso, null) : ''}
    ${blocPatron()}
    ${total ? `<div class="jr-liste">${j.taches.map(x => ligne(iso, x, maintenant)).join('')}</div>` : ''}
    <details class="jr-card" ${JR.data.vrac ? 'open' : ''}><summary>Vider ma tête (idées de la nuit, choses à faire)</summary>
      <textarea id="jrVrac" rows="4" placeholder="Écris tout ici, sans ordre : retouches de Destinée, finir le portfolio, 3 affiches pour la fête des mères..." oninput="jrVrac(this.value)">${E(JR.data.vrac)}</textarea>
      <div class="jr-act"><button class="btn-primary" onclick="jrVider()">Le patron m'aide à planifier</button></div></details>
    <details class="jr-card" ${JR.routinesOuvert ? 'open' : ''} ontoggle="JR.routinesOuvert=this.open"><summary>Mes règles et routines</summary>
      <div class="jr-2"><label>Début de journée<input type="time" value="${E(r.debut)}" onchange="jrRegle('debut',this.value)"></label><label>Fin de journée<input type="time" value="${E(r.fin)}" onchange="jrRegle('fin',this.value)"></label>
      <label>Pause de<input type="time" value="${E(r.pauseDeb)}" onchange="jrRegle('pauseDeb',this.value)"></label><label>à<input type="time" value="${E(r.pauseFin)}" onchange="jrRegle('pauseFin',this.value)"></label></div>
      <h4>Routines (reviennent seules)</h4>
      ${JR.data.routines.length ? JR.data.routines.map(x => `<div class="jr-rt"><span>${E(x.t)} · ${x.debut ? E(x.debut) + ' · ' : ''}${duree(Number(x.min) || 30)}</span><button onclick="jrRoutineSuppr('${x.id}')">Retirer</button></div>`).join('') : '<small class="jr-hint">Aucune. Coche « Se répète » en ajoutant une tâche.</small>'}</details>
  </div>`;
}

// ---------- Branchement dans l'onglet Coach ----------
if(!CO_TABS.some(t => t[0] === 'journee')) CO_TABS.unshift(['journee', 'Ma journée']);
CO_TAB_ALIAS.journee = 'journee'; CO_TAB_ALIAS.travail = 'journee'; CO_TAB_ALIAS.patron = 'journee';
if(!JR.dejaDefaut){ JR.dejaDefaut = true; if(CO.tab === 'aujourdhui') CO.tab = 'journee'; }
const rendreAvant = coRender;
coRender = window.coRender = async function(){
  if(CO.tab !== 'journee') return rendreAvant.apply(this, arguments);
  // L'écran ne se redessine pas pendant qu'on écrit dedans
  if(!JR.force && JR.rendu && (JR.ajout || JR.edit)) return;
  JR.force = false;
  const a = document.activeElement;
  if(a && a.closest && a.closest('#coBody .jr') && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && JR.rendu) return;
  await charger();
  await rendreAvant.apply(this, arguments);
  JR.rendu = true;
};
const rendreTab = coRenderToday;
// coRender (d'origine) appelle coRenderToday par défaut : on le détourne quand l'onglet est "journee"
coRenderToday = window.coRenderToday = function(v){ if(CO.tab === 'journee') return renderJournee(v); return rendreTab.apply(this, arguments); };

// Alerte douce dans l'app quand l'heure d'une tâche arrive
function veille(){
  clearInterval(JR.timer);
  JR.timer = setInterval(() => {
    if(!JR.loaded) return;
    const iso = aujourdhui(), j = JR.data.jours[iso]; if(!j) return;
    const n = maintenantMin(), x = j.taches.find(t => !t.fait && t.debut === enHeure(n) && JR.signale !== t.id + enHeure(n));
    if(x){ JR.signale = x.id + enHeure(n); coToast && coToast(`C'est l'heure : ${x.t} (${duree(Number(x.min) || 30)})`); }
    const p = document.querySelector('.page.active');
    if(p && p.id === 'page-ia' && CO.tab === 'journee') coRender();
  }, 30000);
}
veille();
// Charge les données tôt pour que les alertes fonctionnent même sans ouvrir l'onglet
setTimeout(() => { charger().then(() => { const iso = aujourdhui(); if(JR.data.jours[iso]) synchroRappels(iso); }); }, 3000);

(function css(){
  if(document.getElementById('jrCss')) return;
  const s = document.createElement('style'); s.id = 'jrCss';
  s.textContent = `
.jr{display:flex;flex-direction:column;gap:12px;padding-bottom:24px}
.jr-jours{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}.jr-jours::-webkit-scrollbar{display:none}
.jr-jours button{flex:1 0 46px;display:flex;flex-direction:column;align-items:center;gap:1px;padding:8px 4px;border-radius:12px;border:1px solid var(--border);background:var(--card);color:var(--muted);cursor:pointer;margin:0}
.jr-jours button b{font-size:16px;color:var(--text)}.jr-jours button small{font-size:10.5px;text-transform:uppercase}.jr-jours button i{font-size:10.5px;font-style:normal}
.jr-jours button.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 16%,transparent)}
.jr-tete{display:flex;align-items:center;justify-content:space-between;gap:10px}.jr-tete h2{margin:0;font-size:18px;text-transform:capitalize;color:var(--text)}.jr-tete span{font-size:12.5px;color:var(--muted)}
.jr-pct{--p:0;width:52px;height:52px;border-radius:50%;background:conic-gradient(var(--accent) calc(var(--p)*1%),var(--card2) 0);display:flex;align-items:center;justify-content:center;position:relative}
.jr-pct::before{content:'';position:absolute;inset:5px;border-radius:50%;background:var(--card)}.jr-pct b{position:relative;font-size:12px;color:var(--text)}
.jr-seance{padding:10px 12px;border-radius:12px;background:var(--card2);color:var(--text);font-size:13px;border:1px dashed var(--border)}
.jr-now{padding:16px;border-radius:16px;background:color-mix(in srgb,var(--accent) 14%,var(--card));border:1px solid var(--accent)}
.jr-now small{letter-spacing:.1em;font-weight:700;color:var(--accent);font-size:11px}.jr-now h3{margin:4px 0;font-size:20px;color:var(--text);line-height:1.25}.jr-now p{margin:0 0 10px;color:var(--muted);font-size:13px}
.jr-now.fin{border-color:var(--border);background:var(--card)}
.jr-next{margin-top:10px;font-size:13px;color:var(--muted)}.jr-next b{color:var(--text)}.jr-regle{margin-top:8px;font-size:11.5px;color:var(--muted);font-style:italic}
.jr-act{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.jr-act button{margin:0;flex:1 1 auto;width:auto}
.jr-barre{display:flex;gap:8px;flex-wrap:wrap}.jr-barre button{margin:0;width:auto;flex:1 1 auto}
.jr-liste{display:flex;flex-direction:column;gap:6px}
.jr-l{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:var(--card);border:1px solid var(--border)}
.jr-l.now{border-color:var(--accent)}.jr-l.late{border-color:var(--red,#e5484d)}.jr-l.ok{opacity:.55}.jr-l.ok .jr-d b{text-decoration:line-through}
.jr-ck{flex:none;width:30px;height:30px;margin:0;padding:0;border-radius:50%;border:2px solid var(--muted);background:transparent;color:var(--on-accent,#fff);font-weight:800;cursor:pointer}
.jr-l.ok .jr-ck{background:var(--accent);border-color:var(--accent)}
.jr-d{flex:1;min-width:0;cursor:pointer}.jr-d b{display:block;font-size:14px;color:var(--text);line-height:1.3}.jr-d span{display:block;font-size:12px;color:var(--muted);margin-top:2px}
.jr-m{display:flex;gap:2px}.jr-m button{width:30px;height:30px;margin:0;padding:0;border-radius:8px;border:0;background:transparent;color:var(--muted);cursor:pointer}
.jr-form{padding:12px;border-radius:14px;background:var(--card2);border:1px solid var(--border);display:flex;flex-direction:column;gap:8px}
.jr-2{display:grid;grid-template-columns:1fr 1fr;gap:8px}.jr-2 label{font-size:12px;color:var(--muted)}.jr-2 input{margin-top:3px}
.jr-card{padding:12px;border-radius:14px;background:var(--card);border:1px solid var(--border)}.jr-card summary{cursor:pointer;font-weight:700;color:var(--text)}.jr-card h3{margin:0 0 8px;font-size:15px;color:var(--text)}.jr-card h4{margin:12px 0 6px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.jr-card textarea{margin-top:8px;width:100%}
.jr-msg{padding:9px 12px;border-radius:12px;margin:6px 0;font-size:13.5px;line-height:1.4;max-width:92%}.jr-msg.coach{background:var(--card2);color:var(--text)}.jr-msg.moi{background:color-mix(in srgb,var(--accent) 20%,transparent);color:var(--text);margin-left:auto}
.jr-say{display:flex;gap:8px;align-items:flex-end;margin-top:8px}.jr-say textarea{margin:0;flex:1}.jr-say button{margin:0;width:auto}
.jr-plan{margin-top:8px}.jr-plan h4{margin:0 0 6px}.jr-pj{margin-bottom:10px}.jr-pj b{display:block;text-transform:capitalize;font-size:13px;color:var(--text);margin-bottom:4px}
.jr-pi{display:flex;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);font-size:13.5px;color:var(--text)}.jr-pi span{flex:none;width:48px;color:var(--accent);font-weight:700}.jr-pi small{display:block;color:var(--muted);font-size:11.5px}
.jr-aide ol{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:8px;font-size:13.5px;color:var(--text);line-height:1.4}
.jr-hint{display:block;color:var(--muted);font-size:11.5px;margin-top:6px}
.jr-rt{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;font-size:13px;color:var(--text)}.jr-rt button{margin:0;width:auto;padding:4px 10px;font-size:12px}
`;
  document.head.appendChild(s);
})();
})();
