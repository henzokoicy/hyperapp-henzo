// ============================================================
// ============================================================
// MODULE RAPPELS D'OBJECTIFS (goal_reminders) - COMPLET
// ============================================================
// ============================================================

let editingGoalReminderId = null;

// Messages de motivation prédéfinis
const GOAL_MOTIVATION_MESSAGES = [
  '💪 Chaque petit geste compte. Épargne aujourd\'hui !',
  '🔥 Ton futur toi te remerciera. Allez !',
  '🎯 Un pas de plus vers ton objectif.',
  '💎 Discipline d\'aujourd\'hui, liberté de demain.',
  '🚀 Chaque franc épargné te rapproche du but.',
  '⭐ Sois fier de ce que tu construis.',
  '🌟 Ton objectif t\'attend. Ne lâche pas !',
  '💰 1000 FCFA par jour = 365 000 FCFA par an.',
  '🏆 Les gagnants sont ceux qui persistent.',
  '💪 Tu es plus fort que la tentation.',
  '🌱 Petit à petit, l\'oiseau fait son nid.',
  '🎯 La régularité bat l\'intensité.',
  '🔥 Ne t\'arrête pas maintenant !',
  '✨ Ton avenir se construit aujourd\'hui.',
  '🎁 Fais-toi ce cadeau : épargne aujourd\'hui.'
];

// Conseils quotidiens
const DAILY_TIPS = [
  {i:'💰', t:'Astuce épargne', m:'Épargne 10% de chaque revenu dès qu\'il rentre.'},
  {i:'📸', t:'Astuce business', m:'Un client satisfait = 3 recommandations.'},
  {i:'🎯', t:'Astuce objectif', m:'Découpe ton objectif en paliers de 25%.'},
  {i:'📊', t:'Astuce analyse', m:'Vérifie tes dépenses chaque dimanche.'},
  {i:'💡', t:'Astuce business', m:'Vends un service avant de créer un produit.'},
  {i:'🛡️', t:'Astuce fonds', m:'Garde 3 mois de dépenses en fonds d\'urgence.'},
  {i:'⚡', t:'Astuce action', m:'Fais une action par jour vers ton objectif.'},
  {i:'🧠', t:'Astuce mental', m:'Pense à long terme, agis à court terme.'},
  {i:'🎁', t:'Astuce plaisir', m:'Récompense-toi quand tu atteins un palier.'},
  {i:'📈', t:'Astuce investissement', m:'Investis dans ce qui te rapporte du temps.'}
];

function onGoalFrequencyChange(){
  const freq = document.getElementById('goalReminderFrequency').value;
  const wrap = document.getElementById('goalReminderDayWrap');
  if(wrap) wrap.style.display = (freq === 'weekly') ? 'block' : 'none';
}

async function openGoalReminderModal(id){
  editingGoalReminderId = id || null;
  const r = id ? goalReminders.find(x => x.id === id) : null;

  const sel = document.getElementById('goalReminderGoal');
  if(!sel) return;
  sel.innerHTML = '<option value="">-- Choisir un objectif --</option>' +
    coffres.map(c => `<option value="${c.id}">${getCoffreEmoji(c.name)} ${c.name}</option>`).join('');

  document.getElementById('goalReminderModalTitle').textContent =
    r ? '✏️ Modifier le rappel' : '⏰ Nouveau rappel d\'épargne';
  document.getElementById('goalReminderSubmit').textContent =
    r ? '💾 Enregistrer' : '💾 Enregistrer';

  if(r){
    sel.value = r.goal_id || '';
    document.getElementById('goalReminderMessage').value = r.message || '';
    document.getElementById('goalReminderFrequency').value = r.frequency || 'daily';
    document.getElementById('goalReminderTime').value = r.time || '20:00';
    if(r.day_of_week !== null && r.day_of_week !== undefined){
      document.getElementById('goalReminderDay').value = String(r.day_of_week);
    }
  } else {
    sel.value = coffres[0]?.id || '';
    const randomMsg = GOAL_MOTIVATION_MESSAGES[Math.floor(Math.random() * GOAL_MOTIVATION_MESSAGES.length)];
    document.getElementById('goalReminderMessage').value = randomMsg;
    document.getElementById('goalReminderFrequency').value = 'daily';
    document.getElementById('goalReminderTime').value = '20:00';
    document.getElementById('goalReminderDay').value = '1';
  }

  onGoalFrequencyChange();
  document.getElementById('goalReminderModalBg').classList.add('show');
}

function closeGoalReminderModal(){
  document.getElementById('goalReminderModalBg').classList.remove('show');
  editingGoalReminderId = null;
}

async function saveGoalReminder(){
  const goalId  = parseInt(document.getElementById('goalReminderGoal').value);
  const message = document.getElementById('goalReminderMessage').value.trim();
  const frequency = document.getElementById('goalReminderFrequency').value;
  const time    = document.getElementById('goalReminderTime').value;
  const dayOfWeek = frequency === 'weekly'
    ? parseInt(document.getElementById('goalReminderDay').value)
    : null;

  if(!goalId){ alert('Choisis un objectif'); return; }
  if(!message){ alert('Écris un message de motivation'); return; }
  if(!time){ alert('Choisis une heure'); return; }

  const data = {goal_id: goalId, message, frequency, time, day_of_week: dayOfWeek};

  if(editingGoalReminderId){
    const result = await dbUpdate('goal_reminders', editingGoalReminderId, data);
    if(!result) return;
    const idx = goalReminders.findIndex(r => r.id === editingGoalReminderId);
    if(idx >= 0) goalReminders[idx] = result;
    closeGoalReminderModal();
    renderGoalReminders();
    showToast('✅ Rappel modifié');
  } else {
    const result = await dbInsert('goal_reminders', data);
    if(!result) return;
    goalReminders.push(result);
    closeGoalReminderModal();
    renderGoalReminders();
    showToast('✅ Rappel créé !');
  }
}

async function deleteGoalReminder(id){
  if(!confirm('Supprimer ce rappel ?')) return;
  const ok = await dbDelete('goal_reminders', id);
  if(!ok) return;
  goalReminders = goalReminders.filter(r => r.id !== id);
  renderGoalReminders();
  showToast('🗑 Rappel supprimé');
}

function renderGoalReminders(){
  const el = document.getElementById('goalRemindersList');
  if(!el) return;

  if(goalReminders.length === 0){
    el.innerHTML = '<div class="empty">Aucun rappel. Crées-en un !</div>';
    return;
  }

  const freqLabels = { daily: '🔁 Tous les jours', weekly: '📅 Chaque semaine' };
  const dayLabels = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];

  const sorted = [...goalReminders].sort((a,b) => (a.time || '').localeCompare(b.time || ''));

  el.innerHTML = sorted.map(r => {
    const goal = coffres.find(c => c.id === r.goal_id);
    const goalName = goal ? goal.name : 'Objectif supprimé';
    const emoji = goal ? getCoffreEmoji(goal.name) : '🎯';

    let freqText = freqLabels[r.frequency] || '🔁';
    if(r.frequency === 'weekly' && r.day_of_week !== null && r.day_of_week !== undefined){
      freqText += ' — ' + (dayLabels[r.day_of_week] || '');
    }

    return `<div class="goal-reminder-item">
      <div class="left">
        <div class="title">${emoji} ${goalName}</div>
        <div class="sub">
          <span>${r.message}</span>
          <span class="badge-freq">⏰ ${r.time}</span>
          <span class="badge-freq">${freqText}</span>
        </div>
      </div>
      <div class="actions">
        <button onclick="openGoalReminderModal(${r.id})" title="Modifier">✏️</button>
        <button class="del" onclick="deleteGoalReminder(${r.id})" title="Supprimer">×</button>
      </div>
    </div>`;
  }).join('');
}

async function checkGoalReminders(){
  if(!isNotifEnabled()) return;
  if(goalReminders.length === 0) return;

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todayKey = now.toISOString().slice(0,10);
  const todayDow = now.getDay();

  for(const r of goalReminders){
    if(!r.time) continue;

    if(r.frequency === 'weekly'){
      if(r.day_of_week === null || r.day_of_week === undefined) continue;
      if(parseInt(r.day_of_week) !== todayDow) continue;
    }

    const [h, m] = r.time.split(':').map(Number);
    const rMin = h * 60 + m;
    const key = `goal_reminder_${r.id}_${todayKey}`;

    if(!localStorage.getItem(key) && Math.abs(nowMin - rMin) <= 2){
      const goal = coffres.find(c => c.id === r.goal_id);
      const title = '🎯 ' + (goal ? goal.name : 'Objectif');
      await showLocalNotification(title, r.message);
      localStorage.setItem(key, '1');
    }
  }
}

// ============================================================
// SUGGESTIONS INTELLIGENTES POUR LES OBJECTIFS
// ============================================================
function renderGoalSuggestions(){
  const el = document.getElementById('goalSuggestions');
  if(!el) return;

  if(coffres.length === 0){
    el.innerHTML = '<div class="empty">Crée un objectif pour voir les suggestions.</div>';
    return;
  }

  const suggestions = [];
  const s = computeStats();

  coffres.forEach(c => {
    const current = Number(c.current || 0);
    const goal = Number(c.goal || 1);
    const pct = (current / goal) * 100;
    const rest = goal - current;

    if(pct >= 100){
      suggestions.push({
        cls: 'good', icon: '🏆',
        title: `"${c.name}" atteint !`,
        body: `Félicitations ! Fixe-toi un nouveau défi.`
      });
      return;
    }

    if(pct === 0){
      suggestions.push({
        cls: 'urgent', icon: '🚀',
        title: `Démarre "${c.name}"`,
        body: `Commence par <strong>${fmt(goal * 0.05)}</strong> (5%).`
      });
      return;
    }

    if(c.target_date){
      const days = Math.ceil((new Date(c.target_date) - new Date()) / 86400000);
      if(days > 0 && days < 30){
        suggestions.push({
          cls: 'urgent', icon: '⏱',
          title: `Deadline proche : ${c.name}`,
          body: `Reste <strong>${days} jours</strong> pour économiser <strong>${fmt(rest)}</strong>. Soit ${fmt(rest/days)}/jour.`
        });
      } else if(days > 0){
        const perMonth = (rest / days) * 30;
        suggestions.push({
          cls: '', icon: '📊',
          title: `Rythme pour "${c.name}"`,
          body: `Épargne <strong>${fmt(perMonth)}</strong> par mois pour finir à temps.`
        });
      } else {
        suggestions.push({
          cls: 'urgent', icon: '⚠️',
          title: `Deadline dépassée : ${c.name}`,
          body: `Reste <strong>${fmt(rest)}</strong>. Replanifie une date cible.`
        });
      }
    } else {
      suggestions.push({
        cls: '', icon: '📈',
        title: `${c.name} : ${pct.toFixed(0)}%`,
        body: `Reste <strong>${fmt(rest)}</strong>. Ajoute ${fmt(rest/4)} chaque semaine.`
      });
    }
  });

  if(s.totalIn > 0){
    const monthlyPotential = s.totalIn * SAVINGS_TARGET;
    const totalMonthlyTarget = coffres.reduce((sum, c) => {
      if(!c.target_date) return sum;
      const days = Math.ceil((new Date(c.target_date) - new Date()) / 86400000);
      if(days <= 0) return sum;
      return sum + ((Number(c.goal) - Number(c.current)) / days) * 30;
    }, 0);

    if(totalMonthlyTarget > monthlyPotential){
      suggestions.push({
        cls: 'urgent', icon: '⚠️',
        title: 'Budget épargne serré',
        body: `Objectifs demandent <strong>${fmt(totalMonthlyTarget)}/mois</strong>. Capacité : ${fmt(monthlyPotential)}. Réduis ou prolonge.`
      });
    } else if(totalMonthlyTarget > 0){
      suggestions.push({
        cls: 'good', icon: '✅',
        title: 'Budget épargne OK',
        body: `Objectifs : ${fmt(totalMonthlyTarget)}/mois. Capacité : <strong>${fmt(monthlyPotential)}</strong>.`
      });
    }
  }

  if(suggestions.length === 0){
    el.innerHTML = '<div class="empty">Continue à ajouter de l\'épargne !</div>';
    return;
  }

  el.innerHTML = suggestions.slice(0, 6).map(sg => `
    <div class="goal-suggestion ${sg.cls}">
      <div class="icon">${sg.icon}</div>
      <div class="title">${sg.title}</div>
      <div class="body">${sg.body}</div>
    </div>
  `).join('');
}

// ============================================================
// DASHBOARD — FONCTIONS MANQUANTES
// ============================================================

// 🌍 VUE GLOBALE (regroupe TOUT)
function renderGlobalOverview(){
  const s = computeStats();
  const totalIn = txs.filter(t => t.type === 'revenu').reduce((a,b) => a + Number(b.amount), 0);
  const totalOut = txs.filter(t => t.type === 'depense').reduce((a,b) => a + Number(b.amount), 0);
  const totalSaved = coffres.reduce((sum, c) => sum + Number(c.current || 0), 0);
  const goalsDone = coffres.filter(c => Number(c.current) >= Number(c.goal)).length;

  const el1 = document.getElementById('globalTotalIn');
  const el2 = document.getElementById('globalTotalOut');
  const el3 = document.getElementById('globalBalance');
  const el4 = document.getElementById('globalSaved');
  const el5 = document.getElementById('globalGoalsDone');
  const el6 = document.getElementById('globalClients');

  if(el1) el1.textContent = fmt(totalIn);
  if(el2) el2.textContent = fmt(totalOut);
  if(el3) el3.textContent = fmt(totalIn - totalOut);
  if(el4) el4.textContent = fmt(totalSaved);
  if(el5) el5.textContent = goalsDone + ' / ' + coffres.length;
  if(el6) el6.textContent = clients.length;

  // Analyse globale
  const analysisEl = document.getElementById('globalAnalysis');
  if(!analysisEl) return;

  const lines = [];
  const months = new Set(txs.map(t => t.date.slice(0,7))).size;
  const avgMonthly = months > 0 ? totalIn / months : 0;
  const savingsRate = totalIn > 0 ? ((totalIn - totalOut) / totalIn * 100) : 0;

  if(txs.length === 0){
    analysisEl.innerHTML = '<div class="empty">Ajoute des transactions pour voir l\'analyse globale.</div>';
    return;
  }

  lines.push(`<div class="insight ${savingsRate >= 20 ? 'good' : savingsRate >= 0 ? 'warn' : 'bad'}">
    <div class="title">📊 Taux d'épargne global : ${savingsRate.toFixed(0)}%</div>
    <div>${savingsRate >= 20 ? 'Excellent ! Tu épargnes bien.' : savingsRate >= 0 ? 'Peut mieux faire. Vise 20%.' : 'Attention, tu dépenses plus que tu ne gagnes.'}</div>
  </div>`);

  lines.push(`<div class="insight">
    <div class="title">💵 Revenu moyen mensuel</div>
    <div>${fmt(avgMonthly)} sur ${months} mois d'activité</div>
  </div>`);

  if(coffres.length > 0){
    const totalGoal = coffres.reduce((sum, c) => sum + Number(c.goal), 0);
    const pct = totalGoal > 0 ? (totalSaved / totalGoal * 100) : 0;
    lines.push(`<div class="insight ${pct >= 50 ? 'good' : 'warn'}">
      <div class="title">🎯 Progression globale des objectifs</div>
      <div>${pct.toFixed(0)}% (${fmt(totalSaved)} / ${fmt(totalGoal)})</div>
    </div>`);
  }

  analysisEl.innerHTML = lines.join('');
}

// 💡 CONSEIL DU JOUR
function renderDailyTip(){
  const el = document.getElementById('dailyTip');
  if(!el) return;

  const todayIndex = Math.floor(Date.now() / 86400000) % DAILY_TIPS.length;
  const tip = DAILY_TIPS[todayIndex];

  el.innerHTML = `
    <div class="icon">${tip.i}</div>
    <div class="title">${tip.t}</div>
    <div class="body">${tip.m}</div>
  `;
}

// ⏰ APERÇU RAPPELS D'OBJECTIFS SUR LE DASHBOARD
function renderDashboardGoalReminders(){
  const card = document.getElementById('dashboardGoalRemindersCard');
  const el = document.getElementById('dashboardGoalRemindersList');
  if(!card || !el) return;

  if(goalReminders.length === 0){
    card.style.display = 'none';
    return;
  }

  card.style.display = 'block';

  const sorted = [...goalReminders].sort((a,b) => (a.time || '').localeCompare(b.time || ''));

  el.innerHTML = sorted.slice(0, 3).map(r => {
    const goal = coffres.find(c => c.id === r.goal_id);
    const goalName = goal ? goal.name : 'Objectif';
    const emoji = goal ? getCoffreEmoji(goal.name) : '🎯';
    const freqLabels = { daily: '🔁 Quotidien', weekly: '📅 Hebdo' };

    return `<div class="goal-reminder-item">
      <div class="left">
        <div class="title">${emoji} ${goalName}</div>
        <div class="sub">
          <span>⏰ ${r.time}</span>
          <span class="badge-freq">${freqLabels[r.frequency] || ''}</span>
        </div>
      </div>
    </div>`;
  }).join('') + (goalReminders.length > 3 ? `<div style="text-align:center;font-size:12px;color:var(--muted);margin-top:8px">+${goalReminders.length - 3} autre(s)</div>` : '');
}

// 🎯 APERÇU OBJECTIFS AVEC MOTIVATION
function renderDashboardGoals(){
  const card = document.getElementById('dashboardGoalsCard');
  const el = document.getElementById('dashboardGoalsList');
  if(!card || !el) return;

  const active = coffres.filter(c => Number(c.current) < Number(c.goal));
  if(active.length === 0){
    card.style.display = 'none';
    return;
  }

  card.style.display = 'block';

  el.innerHTML = active.slice(0, 3).map(c => {
    const current = Number(c.current || 0);
    const goal = Number(c.goal || 1);
    const pct = Math.min(100, (current / goal) * 100);
    const mot = getMotivationMessage(pct);
    const color = getProgressionColor(pct);
    const emoji = getCoffreEmoji(c.name);

    return `<div class="top-goal-item">
      <div class="left">
        <div class="title">${emoji} ${c.name}</div>
        <div class="sub">${fmt(current)} / ${fmt(goal)} · ${pct.toFixed(0)}%</div>
      </div>
      <div class="progress-mini"><div style="width:${pct}%;background:${color}"></div></div>
      <div style="font-size:11px;color:${color};font-weight:700;margin-left:6px">${pct.toFixed(0)}%</div>
    </div>`;
  }).join('');
}

// ============================================================
// HOOK DANS refreshAll()
// ============================================================
// ⚠️ Cette fonction remplace le refreshAll() actuel
// Tu peux soit la remplacer, soit juste ajouter les lignes
function refreshAll(){
  if(typeof renderOverview === 'function')        renderOverview();
  if(typeof renderHealthScore === 'function')     renderHealthScore();
  if(typeof renderRevDepDonut === 'function')     renderRevDepDonut();
  if(typeof renderShootTypesChart === 'function') renderShootTypesChart();
  if(typeof renderBars6m === 'function')          renderBars6m();
  if(typeof renderSuggestions === 'function')     renderSuggestions();
  if(typeof renderCoffres === 'function')         renderCoffres();
  if(typeof renderClients === 'function')         renderClients();
  if(typeof renderShoots === 'function')          renderShoots();
  if(typeof renderPhotoStats === 'function')      renderPhotoStats();
  if(typeof renderSavedIdeas === 'function')      renderSavedIdeas();
  if(typeof renderReminders === 'function')       renderReminders();
  if(typeof renderInspirations === 'function')    renderInspirations();
  if(typeof renderNotes === 'function')           renderNotes();
  if(typeof renderGoalReminders === 'function')   renderGoalReminders();
  if(typeof renderGoalSuggestions === 'function') renderGoalSuggestions();
  if(typeof renderGlobalOverview === 'function')  renderGlobalOverview();
  if(typeof renderDailyTip === 'function')        renderDailyTip();
  if(typeof renderDashboardGoalReminders === 'function') renderDashboardGoalReminders();
  if(typeof renderDashboardGoals === 'function')  renderDashboardGoals();
  render();
}