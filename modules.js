// ============================================================
// MODULES.JS — Objectifs, Photo, Business, Motivation, IA
// ============================================================
// Utilise sb. et les helpers dbInsert/dbUpdate/dbDelete définis dans app.js
// ============================================================


// ============================================================
// MODULE OBJECTIFS
// ============================================================
function openCoffreModal(id){
  editingCoffreId = id || null;
  const c = id ? coffres.find(x => x.id === id) : null;
  document.getElementById('coffreModalTitle').textContent = c ? 'Modifier' : 'Nouvel objectif';
  document.getElementById('coffreSubmit').textContent     = c ? 'Enregistrer' : 'Créer';
  document.getElementById('coffreName').value    = c?.name        || '';
  document.getElementById('coffreGoal').value    = c?.goal        || '';
  document.getElementById('coffreCurrent').value = c?.current     || '';
  document.getElementById('coffreDate').value    = c?.target_date || '';
  document.getElementById('coffreWhy').value     = c?.why         || '';
  document.getElementById('coffreModalBg').classList.add('show');
}
function closeCoffreModal(){
  document.getElementById('coffreModalBg').classList.remove('show');
  editingCoffreId = null;
}
async function saveCoffre(){
  const name        = document.getElementById('coffreName').value.trim();
  const goal        = parseFloat(document.getElementById('coffreGoal').value);
  const current     = parseFloat(document.getElementById('coffreCurrent').value) || 0;
  const target_date = document.getElementById('coffreDate').value || null;
  const why         = document.getElementById('coffreWhy').value.trim();
  if(!name || !goal || goal <= 0){ alert("Nom + montant requis"); return; }

  if(editingCoffreId){
    const result = await dbUpdate('goals', editingCoffreId, {name, goal, current, target_date, why});
    if(!result) return;
    const idx = coffres.findIndex(c => c.id === editingCoffreId);
    coffres[idx] = result;
  } else {
    const result = await dbInsert('goals', {name, goal, current, target_date, why});
    if(!result) return;
    coffres.unshift(result);
  }
  closeCoffreModal();
  renderCoffres();
  render();
}
async function delCoffre(id){
  if(!confirm("Supprimer cet objectif ?")) return;
  const ok = await dbDelete('goals', id);
  if(!ok) return;
  coffres = coffres.filter(c => c.id !== id);
  renderCoffres();
  render();
}
function openDepositModal(id){
  depositingCoffreId = id;
  const c = coffres.find(x => x.id === id);
  document.getElementById('depositCoffreName').textContent = c.name;
  document.getElementById('depositAmount').value = '';
  document.getElementById('depositModalBg').classList.add('show');
}
function closeDepositModal(){
  document.getElementById('depositModalBg').classList.remove('show');
  depositingCoffreId = null;
}
async function confirmDeposit(){
  const amt = parseFloat(document.getElementById('depositAmount').value);
  if(!amt || amt <= 0){ alert("Montant invalide"); return; }
  const c = coffres.find(x => x.id === depositingCoffreId);
  const newCurrent = Number(c.current || 0) + amt;
  const result = await dbUpdate('goals', depositingCoffreId, {current: newCurrent});
  if(!result) return;
  c.current = newCurrent;
  closeDepositModal();
  renderCoffres();
  render();
}
function renderCoffres(){
  const el = document.getElementById('coffresList');
  if(coffres.length === 0){
    el.innerHTML = '<div class="empty">Aucun objectif. Crées-en un.</div>';
    return;
  }
  el.innerHTML = coffres.map(c => {
    const pct  = Math.min(100, (Number(c.current) / Number(c.goal)) * 100);
    const rest = Math.max(0, Number(c.goal) - Number(c.current));
    let timeInfo = '';
    if(c.target_date && rest > 0){
      const days = Math.ceil((new Date(c.target_date) - new Date()) / 86400000);
      if(days > 0){
        const perMonth = (rest / days) * 30;
        timeInfo = `<div class="amt"><span>⏱ ${days}j restants</span><span>≈ ${fmt(perMonth)}/mois</span></div>`;
      } else {
        timeInfo = `<div class="amt"><span style="color:var(--red)">⚠ Date dépassée</span></div>`;
      }
    }
    return `<div class="coffre">
      <div class="head"><div class="name">${c.name}</div><div class="pct">${pct.toFixed(0)}%</div></div>
      <div class="bar"><div style="width:${pct}%;background:${pct>=100?'var(--green)':'var(--accent)'}"></div></div>
      <div class="amt"><span>${fmt(c.current)} / ${fmt(c.goal)}</span><span>Reste: ${fmt(rest)}</span></div>
      ${timeInfo}
      ${c.why ? `<div style="font-size:12px;color:var(--muted);margin-top:8px;font-style:italic">"${c.why}"</div>` : ''}
      <div class="actions">
        <button class="btn-primary" style="margin:0" onclick="openDepositModal(${c.id})">+ Ajouter</button>
        <button class="btn-ghost" style="margin:0" onclick="openCoffreModal(${c.id})">Modifier</button>
        <button class="btn-ghost" style="margin:0" onclick="delCoffre(${c.id})">×</button>
      </div>
    </div>`;
  }).join('');

  const at = document.getElementById('antiTemptation');
  const active = coffres.filter(c => Number(c.current) < Number(c.goal));
  if(active.length === 0){
    at.innerHTML = '<div class="empty">Aucun objectif en cours</div>';
  } else {
    at.innerHTML = active.slice(0, 3).map(c => {
      const rest = Number(c.goal) - Number(c.current);
      const pct  = (Number(c.current) / Number(c.goal) * 100).toFixed(0);
      const msg  = c.why ? `Rappelle-toi : "${c.why}"` : `Tu es à ${pct}%. Ne lâche pas.`;
      return `<div class="insight bad">
        <div class="title">🛑 ${c.name} — encore ${fmt(rest)}</div>
        <div>${msg}</div>
      </div>`;
    }).join('');
  }
}


// ============================================================
// MODULE PHOTO — CLIENTS
// ============================================================
function openClientModal(id){
  editingClientId = id || null;
  const c = id ? clients.find(x => x.id === id) : null;
  document.getElementById('clientModalTitle').textContent = c ? 'Modifier' : 'Nouveau client';
  document.getElementById('clientName').value  = c?.name  || '';
  document.getElementById('clientPhone').value = c?.phone || '';
  document.getElementById('clientEmail').value = c?.email || '';
  document.getElementById('clientNotes').value = c?.notes || '';
  document.getElementById('clientModalBg').classList.add('show');
}
function closeClientModal(){
  document.getElementById('clientModalBg').classList.remove('show');
  editingClientId = null;
}
async function saveClient(){
  const name = document.getElementById('clientName').value.trim();
  if(!name){ alert("Nom requis"); return; }
  const data = {
    name,
    phone: document.getElementById('clientPhone').value.trim(),
    email: document.getElementById('clientEmail').value.trim(),
    notes: document.getElementById('clientNotes').value.trim()
  };
  if(editingClientId){
    const result = await dbUpdate('clients', editingClientId, data);
    if(!result) return;
    const idx = clients.findIndex(c => c.id === editingClientId);
    clients[idx] = result;
  } else {
    const result = await dbInsert('clients', data);
    if(!result) return;
    clients.unshift(result);
  }
  closeClientModal();
  renderClients();
  renderShoots();
}
async function delClient(id){
  if(!confirm("Supprimer ce client ?")) return;
  const ok = await dbDelete('clients', id);
  if(!ok) return;
  clients = clients.filter(c => c.id !== id);
  shoots.forEach(s => { if(s.client_id === id) s.client_id = null; });
  renderClients();
  renderShoots();
}
function renderClients(){
  const el = document.getElementById('clientsList');
  if(clients.length === 0){ el.innerHTML = '<div class="empty">Aucun client</div>'; return; }
  el.innerHTML = clients.map(c => `
    <div class="item-card">
      <div class="head"><div class="name">👤 ${c.name}</div></div>
      ${c.phone ? `<div class="amt"><span>📞 ${c.phone}</span></div>` : ''}
      ${c.email ? `<div class="amt"><span>✉️ ${c.email}</span></div>` : ''}
      ${c.notes ? `<div style="font-size:12px;color:var(--muted);margin-top:6px">${c.notes}</div>` : ''}
      <div class="actions" style="display:flex;gap:6px;margin-top:8px">
        <button class="btn-ghost" style="margin:0;padding:6px" onclick="openClientModal(${c.id})">Modifier</button>
        <button class="btn-ghost" style="margin:0;padding:6px" onclick="delClient(${c.id})">×</button>
      </div>
    </div>`).join('');
}


// ============================================================
// MODULE PHOTO — SÉANCES
// ============================================================
function openShootModal(id){
  editingShootId = id || null;
  const s = id ? shoots.find(x => x.id === id) : null;
  document.getElementById('shootModalTitle').textContent = s ? 'Modifier la séance' : 'Nouvelle séance';
  const sel = document.getElementById('shootClient');
  sel.innerHTML = '<option value="">-- Choisir --</option>' +
    clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  if(s){
    sel.value = s.client_id || '';
    document.getElementById('shootType').value  = s.type || 'Portrait';
    document.getElementById('shootDate').value  = s.date ? new Date(s.date).toISOString().slice(0,16) : '';
    document.getElementById('shootPrice').value = s.price || '';
    document.getElementById('shootPay').value   = s.payment || 'impaye';
    document.getElementById('shootNotes').value = s.notes || '';
  } else {
    sel.value = '';
    document.getElementById('shootDate').value  = new Date().toISOString().slice(0,16);
    document.getElementById('shootPrice').value = '';
    document.getElementById('shootPay').value   = 'impaye';
    document.getElementById('shootNotes').value = '';
  }
  document.getElementById('shootModalBg').classList.add('show');
}
function closeShootModal(){
  document.getElementById('shootModalBg').classList.remove('show');
  editingShootId = null;
}
async function saveShoot(){
  const clientId = document.getElementById('shootClient').value;
  const type     = document.getElementById('shootType').value;
  const date     = document.getElementById('shootDate').value;
  const price    = parseFloat(document.getElementById('shootPrice').value) || 0;
  const payment  = document.getElementById('shootPay').value;
  const notes    = document.getElementById('shootNotes').value.trim();
  if(!date){ alert("Date requise"); return; }
  const data = {
    client_id: clientId ? parseInt(clientId) : null,
    type, date, price, payment, notes
  };
  if(editingShootId){
    const result = await dbUpdate('shoots', editingShootId, data);
    if(!result) return;
    const idx = shoots.findIndex(s => s.id === editingShootId);
    shoots[idx] = result;
  } else {
    const result = await dbInsert('shoots', data);
    if(!result) return;
    shoots.unshift(result);
  }
  closeShootModal();
  renderShoots();
  renderPhotoStats();
}
async function delShoot(id){
  if(!confirm("Supprimer ?")) return;
  const ok = await dbDelete('shoots', id);
  if(!ok) return;
  shoots = shoots.filter(s => s.id !== id);
  renderShoots();
  renderPhotoStats();
}
async function toggleShootPayment(id){
  const s = shoots.find(x => x.id === id);
  const newPayment = s.payment === 'paye' ? 'impaye' : 'paye';
  const result = await dbUpdate('shoots', id, {payment: newPayment});
  if(!result) return;
  s.payment = newPayment;
  renderShoots();
  renderPhotoStats();
}
function renderShoots(){
  const el = document.getElementById('shootsList');
  const sorted = [...shoots].sort((a,b) => (b.date || '').localeCompare(a.date || ''));
  if(sorted.length === 0){ el.innerHTML = '<div class="empty">Aucune séance</div>'; return; }
  el.innerHTML = sorted.map(s => {
    const client = s.client_id ? clients.find(c => c.id === s.client_id) : null;
    const d = new Date(s.date);
    const dStr = d.toLocaleDateString('fr-FR', {day:'2-digit', month:'short'}) + ' ' +
                 d.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
    return `<div class="item-card">
      <div class="head">
        <div class="name">📸 ${s.type}${client ? ' · ' + client.name : ''}</div>
        <span class="badge ${s.payment}">${s.payment === 'paye' ? 'Payé' : 'Impayé'}</span>
      </div>
      <div class="amt">
        <span>📅 ${dStr}</span>
        <span style="color:var(--green);font-weight:600">${fmt(s.price)}</span>
      </div>
      ${s.notes ? `<div style="font-size:12px;color:var(--muted);margin-top:6px">${s.notes}</div>` : ''}
      <div class="actions" style="display:flex;gap:6px;margin-top:8px">
        <button class="btn-primary" style="margin:0;padding:6px;background:${s.payment==='paye'?'var(--yellow)':'var(--green)'}"
          onclick="toggleShootPayment(${s.id})">
          ${s.payment === 'paye' ? 'Marquer impayé' : '✓ Marquer payé'}
        </button>
        <button class="btn-ghost" style="margin:0;padding:6px" onclick="openShootModal(${s.id})">✏️</button>
        <button class="btn-ghost" style="margin:0;padding:6px" onclick="delShoot(${s.id})">×</button>
      </div>
    </div>`;
  }).join('');
}
function renderPhotoStats(){
  const ym = monthKey();
  const monthShoots = shoots.filter(s => s.date && s.date.startsWith(ym));
  const revenue = monthShoots.filter(s => s.payment === 'paye').reduce((sum,s) => sum + Number(s.price), 0);
  const pending = shoots.filter(s => s.payment === 'impaye').reduce((sum,s) => sum + Number(s.price), 0);
  document.getElementById('photoMonthCount').textContent   = monthShoots.length;
  document.getElementById('photoMonthRevenue').textContent = fmt(revenue);
  document.getElementById('photoPending').textContent      = fmt(pending);
}


// ============================================================
// MODULE BUSINESS
// ============================================================
function generateIdeas(){
  const shuffled = [...LOCAL_IDEAS].sort(() => Math.random() - 0.5).slice(0, 5);
  const el = document.getElementById('ideasList');
  el.innerHTML = shuffled.map((i) => `
    <div class="idea">
      <div class="t">💡 ${i.t}</div>
      <div class="d">${i.d}</div>
      <div>${i.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
      <button class="btn-ghost" style="margin-top:8px;font-size:13px;padding:8px"
        onclick='saveIdea(${JSON.stringify(i).replace(/'/g, "&#39;")})'>⭐ Sauvegarder</button>
    </div>`).join('');
}
async function saveIdea(idea){
  if(savedIdeas.some(x => x.title === idea.t)){ alert("Déjà sauvegardée"); return; }
  const result = await dbInsert('saved_ideas', {
    title: idea.t,
    description: idea.d,
    tags: idea.tags
  });
  if(!result) return;
  savedIdeas.unshift(result);
  renderSavedIdeas();
}
async function delSavedIdea(id){
  const ok = await dbDelete('saved_ideas', id);
  if(!ok) return;
  savedIdeas = savedIdeas.filter(i => i.id !== id);
  renderSavedIdeas();
}
function renderSavedIdeas(){
  const el = document.getElementById('savedIdeasList');
  if(savedIdeas.length === 0){ el.innerHTML = '<div class="empty">Aucune idée sauvegardée</div>'; return; }
  el.innerHTML = savedIdeas.map(i => `
    <div class="idea">
      <div class="t">⭐ ${i.title}</div>
      <div class="d">${i.description || ''}</div>
      <button class="btn-ghost" style="margin-top:8px;font-size:12px;padding:6px"
        onclick="delSavedIdea(${i.id})">× Retirer</button>
    </div>`).join('');
}


// ============================================================
// MODULE MOTIVATION
// ============================================================
function newQuote(){
  const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  document.getElementById('quoteEmoji').textContent  = q.e;
  document.getElementById('quoteText').textContent   = '"' + q.q + '"';
  document.getElementById('quoteAuthor').textContent = '— ' + q.a;
}
function enableNotifications(){
  if(!('Notification' in window)){
    document.getElementById('notifStatus').textContent = "❌ Non supporté sur ce navigateur";
    return;
  }
  Notification.requestPermission().then(p => {
    if(p === 'granted'){
      document.getElementById('notifStatus').textContent = "✅ Notifications activées";
      checkDailyReminders();
      new Notification("🔥 Ma Super App", {body:"Notifications activées ! Reste focus 💪"});
    } else {
      document.getElementById('notifStatus').textContent = "❌ Refusé.";
    }
  });
}
function checkDailyReminders(){
  if(!('Notification' in window) || Notification.permission !== 'granted') return;
  const today  = todayStr();
  const now    = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  reminders.forEach(r => {
    const [h, m] = r.time.split(':').map(Number);
    const rMin   = h * 60 + m;
    const key    = `reminder_${r.id}_${today}`;
    if(!localStorage.getItem(key) && Math.abs(nowMin - rMin) <= 5){
      new Notification("⏰ Rappel", {body: r.text});
      localStorage.setItem(key, '1');
    }
  });
  const key = `savings_${today}`;
  if(!localStorage.getItem(key)){
    const s = computeStats();
    if(s.bal > 0){
      const reco = s.totalIn * SAVINGS_TARGET;
      new Notification("💰 Pense à épargner", {
        body: `Objectif : mettre ${fmt(reco)} de côté aujourd'hui 💪`});
      localStorage.setItem(key, '1');
    }
  }
}
function openReminderModal(){
  document.getElementById('reminderText').value = '';
  document.getElementById('reminderTime').value = '09:00';
  document.getElementById('reminderModalBg').classList.add('show');
}
function closeReminderModal(){
  document.getElementById('reminderModalBg').classList.remove('show');
}
async function saveReminder(){
  const text = document.getElementById('reminderText').value.trim();
  const time = document.getElementById('reminderTime').value;
  if(!text || !time){ alert("Message + heure requis"); return; }
  const result = await dbInsert('reminders', {text, time});
  if(!result) return;
  reminders.push(result);
  closeReminderModal();
  renderReminders();
}
async function delReminder(id){
  const ok = await dbDelete('reminders', id);
  if(!ok) return;
  reminders = reminders.filter(r => r.id !== id);
  renderReminders();
}
function renderReminders(){
  const el = document.getElementById('remindersList');
  if(reminders.length === 0){ el.innerHTML = '<div class="empty">Aucun rappel</div>'; return; }
  el.innerHTML = reminders.map(r => `
    <div class="reminder">
      <div class="txt">${r.text}</div>
      <div class="time">${r.time}</div>
      <button class="del" onclick="delReminder(${r.id})">×</button>
    </div>`).join('');
}
setInterval(checkDailyReminders, 60000);


// ============================================================
// MODULE IA
// ============================================================
function saveAiConfig(){
  const provider = document.getElementById('aiProvider').value;
  const key      = document.getElementById('aiKey').value.trim();
  const url      = document.getElementById('aiUrl').value.trim();
  if(!key){ alert("Colle ta clé"); return; }
  localStorage.setItem('aiConfig', JSON.stringify({provider, key, url}));
  updateAiStatus();
  alert("✅ Enregistré");
}
function updateAiStatus(){
  let cfg = null;
  try { cfg = JSON.parse(localStorage.getItem('aiConfig')); } catch(e){}
  const el = document.getElementById('aiStatus');
  if(cfg && cfg.key){
    el.textContent = 'connectée';
    el.classList.add('on');
    document.getElementById('aiProvider').value = cfg.provider;
    document.getElementById('aiKey').value      = cfg.key;
    if(cfg.url) document.getElementById('aiUrl').value = cfg.url;
  } else {
    el.textContent = 'non configurée';
    el.classList.remove('on');
  }
  toggleCustomUrl();
}
function toggleCustomUrl(){
  const isCustom = document.getElementById('aiProvider').value === 'custom';
  document.getElementById('aiUrlLabel').style.display = isCustom ? 'block' : 'none';
  document.getElementById('aiUrl').style.display      = isCustom ? 'block' : 'none';
}
document.getElementById('aiProvider').addEventListener('change', toggleCustomUrl);

function buildSummary(){
  const s = computeStats();
  const lines = [
    `Devise: ${CURRENCY}`, `Mois: ${s.ym}`,
    `Revenus: ${Math.round(s.totalIn)}`, `Dépenses: ${Math.round(s.totalOut)}`,
    `Solde: ${Math.round(s.bal)}`, `Taux épargne: ${(s.savingsRate * 100).toFixed(1)}%`
  ];
  if(s.sortedCats.length) lines.push('Répartition: '+s.sortedCats.map(([c,a])=>`${c}=${Math.round(a)}`).join(', '));
  if(s.prevOut || s.prevIn) lines.push(`Mois-1 — rev: ${Math.round(s.prevIn)}, dép: ${Math.round(s.prevOut)}`);
  if(coffres.length){
    lines.push("Objectifs d'épargne:");
    coffres.forEach(c => lines.push(
      `- ${c.name}: ${Math.round(c.current)}/${Math.round(c.goal)} (${((c.current/c.goal)*100).toFixed(0)}%)${c.target_date?` date ${c.target_date}`:''}${c.why?` raison: ${c.why}`:''}`
    ));
  }
  if(shoots.length){
    const ym = monthKey();
    const ms = shoots.filter(s => s.date && s.date.startsWith(ym));
    lines.push(`Séances photo ce mois: ${ms.length}`);
    const r = ms.filter(s => s.payment === 'paye').reduce((a,b) => a + Number(b.price), 0);
    lines.push(`Revenus photo: ${Math.round(r)}`);
  }
  if(clients.length) lines.push(`Clients: ${clients.length}`);
  const recent = [...txs].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 15);
  if(recent.length){
    lines.push('Transactions récentes:');
    recent.forEach(t => lines.push(`- ${t.date} ${t.type} ${t.category} ${Math.round(t.amount)}${t.note?' ('+t.note+')':''}`));
  }
  return lines.join('\n');
}

async function callAI(prompt){
  let cfg = null;
  try { cfg = JSON.parse(localStorage.getItem('aiConfig')); } catch(e){}
  if(!cfg || !cfg.key) throw new Error("Configure ta clé dans l'onglet IA");

  if(cfg.provider === 'anthropic'){
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': cfg.key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: AI_MODELS.anthropic, max_tokens: 1500,
        messages: [{role: 'user', content: prompt}]
      })
    });
    const j = await r.json();
    if(j.error) throw new Error(j.error.message);
    return j.content?.[0]?.text || '';
  }
  if(cfg.provider === 'gemini'){
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${AI_MODELS.gemini}:generateContent?key=${cfg.key}`,{
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({contents: [{parts: [{text: prompt}]}]})
    });
    const j = await r.json();
    if(j.error) throw new Error(j.error.message);
    return j.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
  const url = cfg.provider === 'custom' && cfg.url ? cfg.url : 'https://api.openai.com/v1/chat/completions';
  const r = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.key}`},
    body: JSON.stringify({
      model: AI_MODELS.openai,
      messages: [
        {role: 'system', content: 'Tu es un conseiller financier personnel direct.'},
        {role: 'user', content: prompt}
      ],
      temperature: 0.7
    })
  });
  const j = await r.json();
  if(j.error) throw new Error(j.error.message);
  return j.choices?.[0]?.message?.content || '';
}

async function askAI(){
  let cfg = null;
  try { cfg = JSON.parse(localStorage.getItem('aiConfig')); } catch(e){}
  if(!cfg || !cfg.key){ alert("Configure ta clé dans cette page"); return; }
  const out = document.getElementById('aiOutput');
  out.textContent = '⏳ Analyse…';
  const summary = buildSummary();
  const prompt = `Tu es un conseiller financier personnel, direct et bienveillant. Voici le résumé :

${summary}

Analyse en français, 8 points numérotés :
1. Diagnostic global (2 phrases)
2. Taux d'épargne : bon ? que faire ?
3. Poste à surveiller
4. Prévision fin de mois
5. Combien épargner ce mois + où le mettre
6. Une idée de business adaptée (elle fait de la photo)
7. Action immédiate aujourd'hui
8. Encouragement personnalisé

Concret, chiffré, pas de blabla.`;
  try {
    const text = await callAI(prompt);
    out.textContent = text || 'Pas de réponse';
  } catch(e){
    out.textContent = '❌ ' + e.message;
  }
}

async function generateAIIdeas(){
  let cfg = null;
  try { cfg = JSON.parse(localStorage.getItem('aiConfig')); } catch(e){}
  if(!cfg || !cfg.key){ alert("Configure ta clé dans l'onglet IA"); return; }
  const el = document.getElementById('ideasList');
  el.innerHTML = '<div class="empty">⏳ Génération…</div>';
  const summary = buildSummary();
  const prompt = `Voici le profil financier et photo d'une personne :

${summary}

Génère 5 idées de business CONCRÈTES et ADAPTÉES à ce profil (photographe, veut diversifier ses revenus).
Format strict :
1. [Titre court]
   → [Description en 2 lignes]
   → Revenu potentiel estimé: [fourchette en FCFA]
   → Difficulté: Facile / Moyenne / Difficile
(etc. pour les 5)

Pas de blabla, sois concret.`;
  try {
    const text = await callAI(prompt);
    el.innerHTML = `<div class="idea"><div class="d" style="white-space:pre-wrap">${text}</div></div>`;
  } catch(e){
    el.innerHTML = `<div class="empty">❌ ${e.message}</div>`;
  }
}


// ============================================================
// INITIALISATION
// ============================================================
function init(){
  setType('depense');
  renderCoffres();
  renderClients();
  renderShoots();
  renderPhotoStats();
  renderSavedIdeas();
  renderReminders();
  render();
  updateAiStatus();
  newQuote();
  setTimeout(checkDailyReminders, 2000);
}

// ============================================================
// DÉMARRAGE AUTOMATIQUE
// ============================================================
(async function bootstrap(){
  const user = await getCurrentUser();
  const loading = document.getElementById('loadingScreen');
  if(loading) loading.classList.add('hidden');
  if(user){
    await startApp();
  } else {
    showLogin();
  }
})();