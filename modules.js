// ============================================================
// MODULES.JS - Version complète et corrigée
// PARTIE 1/3
// ============================================================

let editingReminderId = null;
let editingInspirationId = null;
let editingNoteId = null;
let editingGoalReminderId = null;
let paymentLinks = [];

// Charges de séance
let currentShootExpenses = [];

const APP_URL = 'https://hyperapp-henzo.vercel.app';
const WAVE_MERCHANT_ID = 'M_ci_gF0f5OK6l1I2';

const VILLES_CI = [
  "Abidjan","Bouaké","Yamoussoukro","Daloa","Korhogo","San-Pédro","Man",
  "Divo","Gagnoa","Abengourou","Anyama","Grand-Bassam","Dabou","Agboville",
  "Bingerville","Adzopé","Aboisso","Bondoukou","Séguéla","Odienné",
  "Ferkessédougou","Katiola","Soubré","Issia","Guiglo","Toumodi","Tiassalé",
  "Bonoua","Sassandra","Tabou","Grand-Lahou","Jacqueville","Sikensi","Lakota",
  "Duekoué","Danané","Bouna","Bongouanou","Daoukro","M'Bahiakro","Bouaflé",
  "Sinfra","Vavoua","Zuénoula","Mankono","Touba","Kouto","Tengréla",
  "Ouangolodougou","Boundiali","M'Bengué","Dikodougou","Kong","Dabakala",
  "Béoumi","Botro","Sakassou","Niakaramandougou","Prikro","Arrah","Kétesso",
  "Alépé","Oumé","Dimbokro","Bocanda","Tanda","Koun-Fao","Agnibilékrou",
  "Bettié","Ayamé","Adiaké","Tiébissou","Yopougon","Cocody",
  "Plateau","Marcory","Treichville","Koumassi","Adjamé","Attécoubé","Port-Bouët"
];

// ============================================================
// RAFRAÎCHISSEMENT GLOBAL
// ============================================================
function refreshAll(){
  if(typeof renderOverview === 'function')        renderOverview();
  if(typeof renderMoneyDetails === 'function')    renderMoneyDetails();
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
  if(typeof renderPaymentLinks === 'function')    renderPaymentLinks();
  if(typeof render === 'function')                render();
}

// ============================================================
// AUTOCOMPLÉTION VILLES
// ============================================================
function setupAutocomplete(inputId, listId){
  const input = document.getElementById(inputId);
  const list  = document.getElementById(listId);
  if(!input || !list) return;

  input.addEventListener('input', () => {
    const val = input.value.trim().toLowerCase();
    if(val.length < 1){ list.style.display='none'; list.innerHTML=''; return; }

    const matches = VILLES_CI.filter(v => v.toLowerCase().includes(val)).slice(0, 8);
    if(matches.length === 0){ list.style.display='none'; list.innerHTML=''; return; }

    list.innerHTML = matches.map(v => `<div onclick="selectCity('${inputId}','${listId}','${v}')">${v}</div>`).join('');
    list.style.display = 'block';
  });

  input.addEventListener('blur', () => {
    setTimeout(() => { list.style.display='none'; }, 150);
  });
}

function selectCity(inputId, listId, city){
  document.getElementById(inputId).value = city;
  document.getElementById(listId).style.display = 'none';
}

// ============================================================
// NOTES INTELLIGENTES
// ============================================================
function analyzeNoteContent(text){
  const result = { category: null, priority: null, date: null, dateLabel: null, amount: null, phone: null, tags: [] };
  if(!text) return result;
  const lower = text.toLowerCase();

  if(/\b(appel|appeler|téléphon|joindre|contacter)/i.test(text)) result.category = 'appel';
  else if(/\b(rdv|rendez-vous|rencard|voir|rencontrer|passer chez)/i.test(text)) result.category = 'rdv';
  else if(/\b(acheter|achat|commander|commande|shop)/i.test(text)) result.category = 'achat';
  else if(/\b(devis|facture|client|business|contrat|shoot|mariage|séance|vente)/i.test(text)) result.category = 'business';
  else if(/\b(idée|idee|inspiration|concept|réfléchir)/i.test(text)) result.category = 'idee';
  else if(/\b(faire|terminer|finir|à faire|todo|n'?oublie pas|pense à)/i.test(text)) result.category = 'todo';

  if(/\b(urgent|urgente|asap|tout de suite|maintenant|vite|impératif)/i.test(text)) result.priority = 'urgente';
  else if(/\b(important|prioritaire|ne pas oublier|absolument|critique)/i.test(text)) result.priority = 'haute';
  else if(/\b(quand possible|bientôt|à voir|peut-être|un jour)/i.test(text)) result.priority = 'basse';
  else result.priority = 'normale';

  const amountMatch = text.match(/(\d[\d\s.,]{2,})\s*(fcfa|francs?|€|euros?|\$|dollars?)/i);
  if(amountMatch){
    const num = parseFloat(amountMatch[1].replace(/[\s.]/g, '').replace(',', '.'));
    if(!isNaN(num)) result.amount = num;
  }

  const phoneMatch = text.match(/(\+?\d[\d\s]{7,}\d)/);
  if(phoneMatch) result.phone = phoneMatch[1].replace(/\s/g, '');

  const tagsFound = text.match(/#[\wÀ-ÿ-]+/g);
  if(tagsFound) result.tags = tagsFound.map(t => t.replace('#','').toLowerCase());

  const now = new Date();
  let reminderDate = null;
  let label = null;

  const dansMatch = lower.match(/dans\s+(\d+)\s+(jour|jours|heure|heures|h|minute|minutes|min|semaine|semaines)/);
  if(dansMatch){
    const n = parseInt(dansMatch[1]);
    const unit = dansMatch[2];
    reminderDate = new Date(now);
    if(unit.startsWith('jour')) reminderDate.setDate(now.getDate() + n);
    else if(unit.startsWith('heure') || unit === 'h') reminderDate.setHours(now.getHours() + n);
    else if(unit.startsWith('minute') || unit === 'min') reminderDate.setMinutes(now.getMinutes() + n);
    else if(unit.startsWith('semaine')) reminderDate.setDate(now.getDate() + n*7);
    label = `dans ${n} ${unit}`;
  }

  if(!reminderDate){
    if(/\baprès[- ]demain\b/i.test(text)){ reminderDate = new Date(now); reminderDate.setDate(now.getDate() + 2); label = 'après-demain'; }
    else if(/\bdemain\b/i.test(text)){ reminderDate = new Date(now); reminderDate.setDate(now.getDate() + 1); label = 'demain'; }
    else if(/\bce soir\b/i.test(text)){ reminderDate = new Date(now); reminderDate.setHours(20,0,0,0); label = 'ce soir'; }
    else if(/\bce matin\b/i.test(text)){ reminderDate = new Date(now); reminderDate.setHours(9,0,0,0); label = 'ce matin'; }
    else if(/\bcet? après[- ]midi\b/i.test(text)){ reminderDate = new Date(now); reminderDate.setHours(15,0,0,0); label = 'cet après-midi'; }
    else if(/\b(cette semaine)\b/i.test(text)){ reminderDate = new Date(now); reminderDate.setDate(now.getDate() + 3); label = 'cette semaine'; }
  }

  const timeMatch = lower.match(/\b(\d{1,2})\s*[h:]\s*(\d{2})?\b/);
  if(timeMatch){
    const h = parseInt(timeMatch[1]);
    const m = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    if(h >= 0 && h <= 23){
      if(!reminderDate) reminderDate = new Date(now);
      reminderDate.setHours(h, m, 0, 0);
      if(!label) label = `${h}h${m ? m.toString().padStart(2,'0') : ''}`;
      else label += ` à ${h}h${m ? m.toString().padStart(2,'0') : ''}`;
    }
  }

  const dateMatch = lower.match(/\b(?:le\s+)?(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?\b/);
  if(dateMatch){
    const day = parseInt(dateMatch[1]);
    const month = parseInt(dateMatch[2]) - 1;
    const year = dateMatch[3] ? parseInt(dateMatch[3]) : now.getFullYear();
    const fullYear = year < 100 ? 2000 + year : year;
    if(day >= 1 && day <= 31 && month >= 0 && month <= 11){
      if(!reminderDate) reminderDate = new Date(now);
      reminderDate.setFullYear(fullYear, month, day);
      label = `le ${day}/${month+1}`;
    }
  }

  if(reminderDate && reminderDate > now){
    result.date = reminderDate.toISOString();
    result.dateLabel = label || reminderDate.toLocaleString('fr-FR', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'});
  }
  return result;
}

function analyzeNoteLive(){
  const text = document.getElementById('noteContent').value;
  const analysisEl = document.getElementById('noteAnalysis');
  if(!analysisEl) return;
  if(!text || text.length < 5){ analysisEl.classList.remove('show'); return; }

  const a = analyzeNoteContent(text);
  const lines = [];

  if(a.category){
    const catIcons = {appel:'📞', rdv:'📅', achat:'🛒', business:'💼', idee:'💡', todo:'✅'};
    const catLabels = {appel:'Appel', rdv:'Rendez-vous', achat:'Achat', business:'Business', idee:'Idée', todo:'À faire'};
    lines.push(`<div class="ai-line"><strong>${catIcons[a.category]||'📝'}</strong> Catégorie : ${catLabels[a.category]}</div>`);
  }
  if(a.priority && a.priority !== 'normale'){
    const prioIcons = {urgente:'🔴', haute:'🟠', basse:'🟢'};
    lines.push(`<div class="ai-line"><strong>${prioIcons[a.priority]}</strong> Priorité : ${a.priority}</div>`);
  }
  if(a.dateLabel) lines.push(`<div class="ai-line"><strong>📅</strong> Date : <span style="color:var(--yellow)">${a.dateLabel}</span></div>`);
  if(a.amount) lines.push(`<div class="ai-line"><strong>💰</strong> Montant : ${fmt(a.amount)}</div>`);
  if(a.phone) lines.push(`<div class="ai-line"><strong>📞</strong> Téléphone : ${a.phone}</div>`);
  if(a.tags.length) lines.push(`<div class="ai-line"><strong>🏷️</strong> Tags : ${a.tags.join(', ')}</div>`);

  if(lines.length === 0){ analysisEl.classList.remove('show'); return; }
  analysisEl.innerHTML = lines.join('');
  analysisEl.classList.add('show');
}

function openNoteModal(id){
  editingNoteId = id || null;
  const n = id ? notes.find(x => x.id === id) : null;

  document.getElementById('noteModalTitle').textContent = n ? '✏️ Modifier' : '📝 Nouvelle note';
  document.getElementById('noteSubmit').textContent = '💾 Enregistrer';

  if(n){
    document.getElementById('noteTitle').value = n.title || '';
    document.getElementById('noteContent').value = n.content || '';
    document.getElementById('noteCategory').value = n.category || 'note';
    document.getElementById('notePriority').value = n.priority || 'normale';
    document.getElementById('noteTags').value = (n.tags || []).join(', ');
    if(n.reminder_date){
      const d = new Date(n.reminder_date);
      const localISO = new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,16);
      document.getElementById('noteReminder').value = localISO;
    } else { document.getElementById('noteReminder').value = ''; }
  } else {
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    document.getElementById('noteCategory').value = 'note';
    document.getElementById('notePriority').value = 'normale';
    document.getElementById('noteTags').value = '';
    document.getElementById('noteReminder').value = '';
  }

  document.getElementById('noteAnalysis').classList.remove('show');
  document.getElementById('noteModalBg').classList.add('show');
  setTimeout(() => document.getElementById('noteContent').focus(), 200);
}

function closeNoteModal(){
  document.getElementById('noteModalBg').classList.remove('show');
  editingNoteId = null;
}

function autoFillFromContent(){
  const text = document.getElementById('noteContent').value;
  if(!text || text.length < 5) return;
  const a = analyzeNoteContent(text);
  const catSelect = document.getElementById('noteCategory');
  const prioSelect = document.getElementById('notePriority');
  const remInput = document.getElementById('noteReminder');
  if(catSelect.value === 'note' && a.category) catSelect.value = a.category;
  if(prioSelect.value === 'normale' && a.priority) prioSelect.value = a.priority;
  if(!remInput.value && a.date) remInput.value = a.date.slice(0,16);
}

async function saveNote(){
  const content = document.getElementById('noteContent').value.trim();
  if(!content){ alert("Écris du contenu"); return; }

  autoFillFromContent();

  const title = document.getElementById('noteTitle').value.trim();
  let category = document.getElementById('noteCategory').value;
  let priority = document.getElementById('notePriority').value;
  const reminderInput = document.getElementById('noteReminder').value;
  const tagsRaw = document.getElementById('noteTags').value.trim();
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  const a = analyzeNoteContent(content);
  if(category === 'note' && a.category) category = a.category;
  if(priority === 'normale' && a.priority) priority = a.priority;

  const data = {
    title: title || null,
    content,
    category,
    priority,
    reminder_date: reminderInput ? new Date(reminderInput).toISOString() : (a.date || null),
    tags: tags.length ? tags : null
  };

  if(editingNoteId){
    const result = await dbUpdate('notes', editingNoteId, data);
    if(!result) return;
    const idx = notes.findIndex(x => x.id === editingNoteId);
    if(idx >= 0) notes[idx] = result;
    closeNoteModal();
    renderNotes();
    showToast('Note modifiée');
  } else {
    const result = await dbInsert('notes', data);
    if(!result) return;
    notes.unshift(result);
    closeNoteModal();
    renderNotes();
    showToast('Note créée' + (data.reminder_date ? ' avec rappel' : ''));
  }
  refreshAll();
}

async function delNote(id){
  if(!confirm('Supprimer cette note ?')) return;
  const ok = await dbDelete('notes', id);
  if(!ok) return;
  notes = notes.filter(n => n.id !== id);
  renderNotes();
  refreshAll();
}

async function toggleNoteDone(id){
  const n = notes.find(x => x.id === id);
  if(!n) return;
  const newArchived = !n.archived;
  const result = await dbUpdate('notes', id, {archived: newArchived});
  if(!result) return;
  n.archived = newArchived;
  renderNotes();
  showToast(newArchived ? 'Note archivée' : 'Note réactivée');
}

function renderNotes(){
  const el = document.getElementById('notesList');
  if(!el) return;

  const total = notes.filter(n => !n.archived).length;
  const withReminder = notes.filter(n => n.reminder_date && !n.reminder_sent && !n.archived).length;
  const urgent = notes.filter(n => (n.priority === 'urgente' || n.priority === 'haute') && !n.archived).length;

  const cEl = document.getElementById('notesCount');
  const rEl = document.getElementById('notesReminders');
  const uEl = document.getElementById('notesUrgent');
  if(cEl) cEl.textContent = total;
  if(rEl) rEl.textContent = withReminder;
  if(uEl) uEl.textContent = urgent;

  const catFilterEl = document.getElementById('notesFilterCategory');
  const statusFilterEl = document.getElementById('notesFilterStatus');
  const searchEl = document.getElementById('notesSearch');
  if(!catFilterEl || !statusFilterEl || !searchEl) return;

  const catFilter = catFilterEl.value;
  const statusFilter = statusFilterEl.value;
  const search = (searchEl.value || '').trim().toLowerCase();

  let filtered = notes.filter(n => {
    if(statusFilter === 'active' && n.archived) return false;
    if(statusFilter === 'archived' && !n.archived) return false;
    if(catFilter !== 'all' && n.category !== catFilter) return false;
    if(search){
      const haystack = [n.title, n.content, (n.tags||[]).join(' ')].filter(Boolean).join(' ').toLowerCase();
      if(!haystack.includes(search)) return false;
    }
    return true;
  });

  const prioOrder = {urgente: 0, haute: 1, normale: 2, basse: 3};
  filtered.sort((a,b) => {
    if(a.archived !== b.archived) return a.archived ? 1 : -1;
    const pa = prioOrder[a.priority] ?? 2;
    const pb = prioOrder[b.priority] ?? 2;
    if(pa !== pb) return pa - pb;
    return (b.created_at || '').localeCompare(a.created_at || '');
  });

  if(filtered.length === 0){ el.innerHTML = '<div class="empty">Aucune note trouvée</div>'; return; }

  const catIcons = {note:'📝', idee:'💡', todo:'✅', appel:'📞', rdv:'📅', achat:'🛒', business:'💼'};
  const catLabels = {note:'Note', idee:'Idée', todo:'À faire', appel:'Appel', rdv:'RDV', achat:'Achat', business:'Business'};

  el.innerHTML = filtered.map(n => {
    const icon = catIcons[n.category] || '📝';
    const catLabel = catLabels[n.category] || 'Note';

    let reminderHtml = '';
    if(n.reminder_date){
      const d = new Date(n.reminder_date);
      const dateStr = d.toLocaleString('fr-FR', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'});
      const isDone = n.reminder_sent;
      const cls = isDone ? 'done' : '';
      reminderHtml = `<span class="note-reminder-tag ${cls}">${isDone ? '✅' : '⏰'} ${dateStr}</span>`;
    }

    const createdStr = n.created_at ? new Date(n.created_at).toLocaleDateString('fr-FR', {day:'2-digit', month:'short'}) : '';
    const priorityBadge = n.priority && n.priority !== 'normale' ? `<span class="note-priority-badge ${n.priority}">${n.priority}</span>` : '';

    return `<div class="note-card priority-${n.priority || 'normale'} ${n.archived ? 'archived' : ''}">
      <div class="note-header">
        <div style="flex:1;min-width:0;">
          <div class="note-title">${icon} ${n.title || (n.content || '').substring(0, 40)}
          <span class="note-category-badge">${catLabel}</span>${priorityBadge}</div>
        </div>
      </div>
      ${n.content ? `<div class="note-content">${(n.content || '').replace(/\n/g, '<br>')}</div>` : ''}
      <div class="note-meta">${createdStr ? `<span>📅 ${createdStr}</span>` : ''}${reminderHtml}</div>
      ${(n.tags && n.tags.length) ? `<div class="note-tags">${n.tags.map(t => `<span class="note-tag">#${t}</span>`).join('')}</div>` : ''}
      <div class="note-actions">
        <button class="note-btn-done" onclick="toggleNoteDone(${n.id})">${n.archived ? '📌 Réactiver' : '✅ Terminer'}</button>
        <button class="note-btn-edit" onclick="openNoteModal(${n.id})">✏️ Modifier</button>
        <button class="note-btn-del" onclick="delNote(${n.id})">🗑</button>
      </div>
    </div>`;
  }).join('');
}

async function checkNoteReminders(){
  const now = new Date();
  let changed = false;

  for(const n of notes){
    if(n.reminder_sent || !n.reminder_date || n.archived) continue;
    if(new Date(n.reminder_date) <= now){
      const title = '📝 ' + (n.title || 'Rappel de note');
      const body = (n.content || '').substring(0, 100);
      await showLocalNotification(title, body);
      await dbUpdate('notes', n.id, {reminder_sent: true});
      n.reminder_sent = true;
      changed = true;
    }
  }

  if(changed) renderNotes();
}

// ============================================================
// MODULE INSPIRATION
// ============================================================
const INSP_CATEGORIES_FIXES = ['Photographe','Artiste','Mentor','Business','Client potentiel','Ami','Autre'];

function onInspCategoryChange(){
  const val = document.getElementById('inspCategory').value;
  const wrap = document.getElementById('inspCustomCategoryWrap');
  if(wrap) wrap.style.display = (val === 'Autre') ? 'block' : 'none';
}

function openInspirationModal(id){
  editingInspirationId = id || null;
  const i = id ? inspirations.find(x => x.id === id) : null;

  document.getElementById('inspirationModalTitle').textContent = i ? '✏️ Modifier' : '💫 Nouvelle inspiration';
  document.getElementById('inspSubmit').textContent = '💾 Enregistrer';

  if(i){
    let savedCat = i.category || 'Photographe';
    if(INSP_CATEGORIES_FIXES.includes(savedCat)){
      document.getElementById('inspCategory').value = savedCat;
      document.getElementById('inspCustomCategory').value = '';
    } else {
      document.getElementById('inspCategory').value = 'Autre';
      document.getElementById('inspCustomCategory').value = savedCat;
    }
    document.getElementById('inspName').value = i.name || '';
    document.getElementById('inspPlatform').value = i.platform || '';
    document.getElementById('inspLink').value = i.link || '';
    document.getElementById('inspPhone').value = i.phone || '';
    document.getElementById('inspEmail').value = i.email || '';
    document.getElementById('inspCity').value = i.city || '';
    document.getElementById('inspWhy').value = i.why || '';
    document.getElementById('inspTags').value = (i.tags || []).join(', ');
    document.getElementById('inspFavorite').checked = !!i.favorite;
  } else {
    document.getElementById('inspCategory').value = 'Photographe';
    document.getElementById('inspCustomCategory').value = '';
    document.getElementById('inspName').value = '';
    document.getElementById('inspPlatform').value = '';
    document.getElementById('inspLink').value = '';
    document.getElementById('inspPhone').value = '';
    document.getElementById('inspEmail').value = '';
    document.getElementById('inspCity').value = '';
    document.getElementById('inspWhy').value = '';
    document.getElementById('inspTags').value = '';
    document.getElementById('inspFavorite').checked = false;
  }

  onInspCategoryChange();
  document.getElementById('inspirationModalBg').classList.add('show');
}

function closeInspirationModal(){
  document.getElementById('inspirationModalBg').classList.remove('show');
  editingInspirationId = null;
}

async function saveInspiration(){
  const name = document.getElementById('inspName').value.trim();
  if(!name){ alert("Le nom est requis"); return; }

  let category = document.getElementById('inspCategory').value;
  if(category === 'Autre'){
    const custom = document.getElementById('inspCustomCategory').value.trim();
    if(custom) category = custom;
  }

  const tagsRaw = document.getElementById('inspTags').value.trim();
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  let link = document.getElementById('inspLink').value.trim();
  if(link && !/^https?:\/\//i.test(link)) link = 'https://' + link;

  const data = {
    name,
    category,
    platform: document.getElementById('inspPlatform').value || null,
    link: link || null,
    phone: document.getElementById('inspPhone').value.trim() || null,
    email: document.getElementById('inspEmail').value.trim() || null,
    city: document.getElementById('inspCity').value.trim() || null,
    why: document.getElementById('inspWhy').value.trim() || null,
    tags: tags.length ? tags : null,
    favorite: document.getElementById('inspFavorite').checked
  };

  if(editingInspirationId){
    const result = await dbUpdate('inspirations', editingInspirationId, data);
    if(!result) return;
    const idx = inspirations.findIndex(x => x.id === editingInspirationId);
    if(idx >= 0) inspirations[idx] = result;
  } else {
    const result = await dbInsert('inspirations', data);
    if(!result) return;
    inspirations.unshift(result);
  }

  closeInspirationModal();
  renderInspirations();
}

async function delInspiration(id){
  if(!confirm("Supprimer cette inspiration ?")) return;
  const ok = await dbDelete('inspirations', id);
  if(!ok) return;
  inspirations = inspirations.filter(x => x.id !== id);
  renderInspirations();
}

async function toggleFavoriteInspiration(id){
  const i = inspirations.find(x => x.id === id);
  if(!i) return;
  const newFav = !i.favorite;
  const result = await dbUpdate('inspirations', id, {favorite: newFav});
  if(!result) return;
  i.favorite = newFav;
  renderInspirations();
}

function inspInitials(name){
  if(!name) return '?';
  const parts = name.trim().replace('@','').split(/\s+/);
  if(parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.replace('@','').substring(0, 2).toUpperCase();
}

function inspPlatformIcon(platform){
  const icons = {
    'Instagram': '📷','TikTok': '🎵','YouTube': '▶️','Facebook': '📘',
    'Twitter/X': '🐦','LinkedIn': '💼','Site web': '🌐','Pinterest': '📌','Behance': '🎨'
  };
  return icons[platform] || '🔗';
}

function renderInspirations(){
  const el = document.getElementById('inspirationsList');
  if(!el) return;

  const count = inspirations.length;
  const favs = inspirations.filter(i => i.favorite).length;
  const cats = new Set(inspirations.map(i => i.category).filter(Boolean)).size;

  const cEl = document.getElementById('inspCount');
  const fEl = document.getElementById('inspFav');
  const caEl = document.getElementById('inspCategories');
  if(cEl) cEl.textContent = count;
  if(fEl) fEl.textContent = favs;
  if(caEl) caEl.textContent = cats;

  const filterCat = document.getElementById('inspFilterCategory');
  if(!filterCat) return;
  const currentCat = filterCat.value;
  const allCats = [...new Set(inspirations.map(i => i.category).filter(Boolean))].sort();

  filterCat.innerHTML = '<option value="all">Toutes</option>' +
    allCats.map(c => `<option value="${c}">${c}</option>`).join('');
  if(currentCat && [...filterCat.options].some(o => o.value === currentCat)){ filterCat.value = currentCat; }

  const catFilter = filterCat.value;
  const favFilterEl = document.getElementById('inspFilterFav');
  const searchEl = document.getElementById('inspSearch');
  const favFilter = favFilterEl ? favFilterEl.value : 'all';
  const search = (searchEl ? searchEl.value : '').trim().toLowerCase();

  let filtered = inspirations.filter(i => {
    if(catFilter !== 'all' && i.category !== catFilter) return false;
    if(favFilter === 'fav' && !i.favorite) return false;
    if(search){
      const haystack = [i.name, i.city, i.why, i.platform, (i.tags||[]).join(' ')].filter(Boolean).join(' ').toLowerCase();
      if(!haystack.includes(search)) return false;
    }
    return true;
  });

  filtered.sort((a,b) => {
    if(a.favorite !== b.favorite) return b.favorite ? 1 : -1;
    return (b.created_at || '').localeCompare(a.created_at || '');
  });

  if(filtered.length === 0){ el.innerHTML = '<div class="empty">Aucune inspiration trouvée</div>'; return; }

  el.innerHTML = filtered.map(i => {
    const initials = inspInitials(i.name);
    const isFav = i.favorite ? 'favorite' : '';

    const metaParts = [];
    if(i.platform) metaParts.push(inspPlatformIcon(i.platform) + ' ' + i.platform);
    if(i.city) metaParts.push('📍 ' + i.city);
    if(i.phone) metaParts.push('📞 ' + i.phone);
    if(i.email) metaParts.push('✉️ ' + i.email);

    const actions = [];
    if(i.link) actions.push(`<a href="${i.link}" target="_blank" rel="noopener" class="insp-btn-link">🔗 Voir sa page</a>`);
    if(i.phone){ const cleanPhone = i.phone.replace(/[^0-9+]/g, ''); actions.push(`<a href="tel:${cleanPhone}" class="insp-btn-call">📞 Appeler</a>`); }
    if(i.email) actions.push(`<a href="mailto:${i.email}" class="insp-btn-mail">✉️ Mail</a>`);
    actions.push(`<button class="insp-btn-edit" onclick="openInspirationModal(${i.id})">✏️ Modifier</button>`);
    actions.push(`<button class="insp-btn-del" onclick="delInspiration(${i.id})">🗑</button>`);

    return `<div class="insp-card ${isFav}">
      <div class="insp-card-header">
        <div class="insp-avatar">${initials}</div>
        <div class="insp-title">
          <div class="insp-name">${i.name}${i.favorite ? ' <span class="insp-fav-star">⭐</span>' : ''}</div>
          <div><span class="insp-category">${i.category || 'Autre'}</span></div>
          ${metaParts.length ? `<div class="insp-meta">${metaParts.map(m => `<span>${m}</span>`).join('')}</div>` : ''}
        </div>
        <button class="insp-btn-fav" onclick="toggleFavoriteInspiration(${i.id})" title="Favori"
          style="background:none;border:none;font-size:20px;cursor:pointer;color:${i.favorite?'var(--yellow)':'var(--muted)'};padding:4px;">
          ${i.favorite ? '⭐' : '☆'}
        </button>
      </div>
      ${i.why ? `<div class="insp-why">"${i.why}"</div>` : ''}
      ${(i.tags && i.tags.length) ? `<div class="insp-tags">${i.tags.map(t => `<span class="insp-tag">${t}</span>`).join('')}</div>` : ''}
      <div class="insp-actions">${actions.join('')}</div>
    </div>`;
  }).join('');
}

// ============================================================
// NOTIFICATIONS
// ============================================================
function isNotifEnabled(){ return localStorage.getItem('notif_enabled') === '1'; }

function updateNotifButton(){
  const btn = document.getElementById('notifBtn');
  const status = document.getElementById('notifStatus');
  if(!btn) return;

  if(isNotifEnabled()){
    btn.classList.add('active');
    btn.textContent = '✅ Notifications activées';
    if(status) status.textContent = 'Tu recevras tes rappels sur tous tes appareils';
  } else {
    btn.classList.remove('active');
    btn.textContent = '🔔 Activer les notifications';
    if(status) status.textContent = '';
  }
}

async function showLocalNotification(title, body, url){
  try {
    if('serviceWorker' in navigator){
      const reg = await navigator.serviceWorker.getRegistration();
      if(reg && reg.showNotification){
        await reg.showNotification(title, {
          body: body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          vibrate: [200, 100, 200],
          tag: 'henzo-notif-' + Date.now(),
          renotify: true,
          requireInteraction: true,
          silent: false,
          data: { url: url || 'https://hyperapp-henzo.vercel.app' }
        });
        return true;
      }
    }
    if('Notification' in window && Notification.permission === 'granted'){
      new Notification(title, {
        body: body,
        icon: '/favicon.ico',
        requireInteraction: true,
        silent: false
      });
      return true;
    }
    return false;
  } catch(e){
    console.warn('showLocalNotification error:', e);
    return false;
  }
}

async function registerOneSignalPlayer(){
  try {
    const user = await getCurrentUser();
    if(!user) return;
    const OneSignal = window.OneSignal;
    if(!OneSignal) return;

    await new Promise(resolve => setTimeout(resolve, 1500));
    const sub = OneSignal.User?.PushSubscription;
    if(!sub) return;

    const playerId = sub.id;
    if(!playerId) return;

    const { data: existing } = await sb.from('push_subscriptions')
      .select('id').eq('user_id', user.id).eq('player_id', playerId).maybeSingle();
    if(existing) return;

    await sb.from('push_subscriptions').insert({ user_id: user.id, player_id: playerId });
    console.log('Player ID enregistré:', playerId);
  } catch(e){
    console.warn('registerOneSignalPlayer:', e);
  }
}

// ============================================================
// MODULE OBJECTIFS
// ============================================================
function getCoffreEmoji(name){
  const n = (name || '').toLowerCase();
  if(n.includes('urgence') || n.includes('secours')) return '🛡️';
  if(n.includes('voyage') || n.includes('vacance')) return '✈️';
  if(n.includes('maison') || n.includes('appart')) return '🏠';
  if(n.includes('voiture') || n.includes('auto') || n.includes('moto')) return '🚗';
  if(n.includes('mariage')) return '💍';
  if(n.includes('étud') || n.includes('formation')) return '🎓';
  if(n.includes('business') || n.includes('entreprise')) return '💼';
  if(n.includes('retraite')) return '🌴';
  if(n.includes('matos') || n.includes('matériel')) return '📷';
  if(n.includes('ordinateur') || n.includes('pc')) return '💻';
  if(n.includes('téléphone') || n.includes('phone')) return '📱';
  if(n.includes('santé') || n.includes('médec')) return '💊';
  return '🎯';
}

function analyzeCoffreName(name){
  const n = (name || '').toLowerCase();
  const result = { unit: null, emoji: null, quantity: null };

  const qMatch = name.match(/\b(\d+)\s+/);
  if(qMatch){
    const q = parseInt(qMatch[1]);
    if(!isNaN(q) && q > 0) result.quantity = q;
  }

  const dict = [
    { k:['téléphone','tel','phone','iphone','samsung','smartphone'], u:'téléphone', e:'📱' },
    { k:['appareil photo','appareil','camera','boitier','reflex'], u:'appareil photo', e:'📷' },
    { k:['objectif','lens','zoom','24-70','50mm','85mm'], u:'objectif', e:'🔭' },
    { k:['ordinateur','pc','macbook','laptop','imac'], u:'ordinateur', e:'💻' },
    { k:['tablette','ipad'], u:'tablette', e:'📱' },
    { k:['drone'], u:'drone', e:'🚁' },
    { k:['trépied','tripod'], u:'trépied', e:'📐' },
    { k:['flash','lumière','softbox'], u:'éclairage', e:'💡' },
    { k:['micro','microphone'], u:'micro', e:'🎤' },
    { k:['carte sd','sd card','disque','ssd','stockage'], u:'disque', e:'💾' },
    { k:['maison','villa','appartement','appart','studio','logement'], u:'maison', e:'🏠' },
    { k:['terrain','parcelle','lot'], u:'terrain', e:'🌳' },
    { k:['bureau','local','magasin','boutique'], u:'local', e:'🏢' },
    { k:['voiture','auto','bmw','toyota','mercedes'], u:'voiture', e:'🚗' },
    { k:['moto','scooter','bécane'], u:'moto', e:'🏍️' },
    { k:['vélo','bicyclette'], u:'vélo', e:'🚲' },
    { k:['barrique','bidon','fût','fut'], u:'barrique', e:'🛢️' },
    { k:['sac','carton','palette'], u:'sac', e:'📦' },
    { k:['huile','jus'], u:'bidon', e:'🧴' },
    { k:['riz','farine','sucre','kg','kilo','tonne'], u:'kg', e:'🌾' },
    { k:['chaussure','basket','sneaker','talon'], u:'paire', e:'👟' },
    { k:['montre','rolex','casio'], u:'montre', e:'⌚' },
    { k:['sac à main','sac femme'], u:'sac', e:'👜' },
    { k:['bijou','or','collier','bague'], u:'bijou', e:'💍' },
    { k:['formation','cours','diplôme','certificat'], u:'formation', e:'🎓' },
    { k:['voyage','voyages','tour'], u:'voyage', e:'✈️' },
    { k:['mariage','alliance'], u:'mariage', e:'💍' }
  ];

  for(const item of dict){
    if(item.k.some(k => n.includes(k))){
      result.unit = item.u;
      result.emoji = item.e;
      break;
    }
  }

  if(!result.unit && result.quantity !== null){
    const afterQ = name.replace(/^\s*\d+\s*/, '').trim();
    const firstWord = afterQ.split(/\s+/)[0];
    if(firstWord && firstWord.length > 2){
      result.unit = firstWord.toLowerCase();
    }
  }

  if(!result.emoji) result.emoji = '🎯';
  if(!result.unit) result.unit = 'unité';

  return result;
}

function setGoalType(type){
  const btnMoney = document.getElementById('btnGoalMoney');
  const btnQty = document.getElementById('btnGoalQuantity');
  if(!btnMoney || !btnQty) return;

  const isMoney = type === 'money';

  btnMoney.classList.toggle('active', isMoney);
  btnQty.classList.toggle('active', !isMoney);

  const goalLabel = document.getElementById('coffreGoalLabel');
  const currentLabel = document.getElementById('coffreCurrentLabel');
  const unitInput = document.getElementById('coffreUnit');

  if(isMoney){
    if(goalLabel) goalLabel.textContent = 'Montant à atteindre';
    if(currentLabel) currentLabel.textContent = 'Déjà épargné';
    if(unitInput && unitInput.value === '') unitInput.value = 'FCFA';
  } else {
    if(goalLabel) goalLabel.textContent = 'Quantité visée';
    if(currentLabel) currentLabel.textContent = 'Déjà acquis';
    if(unitInput && unitInput.value === 'FCFA') unitInput.value = '';
  }
}

function analyzeCoffreNameLive(){
  const name = (document.getElementById('coffreName')?.value || '').trim();
  const el = document.getElementById('coffreAnalysis');
  if(!el) return;

  if(name.length < 3){
    el.classList.remove('show');
    el.innerHTML = '';
    return;
  }

  const a = analyzeCoffreName(name);
  const lines = [];

  if(a.quantity){
    lines.push(`<div class="ai-line"><strong>🔢</strong> Quantité détectée : <span style="color:var(--gold-soft)">${a.quantity}</span></div>`);
  }
  if(a.unit && a.unit !== 'unité'){
    lines.push(`<div class="ai-line"><strong>📏</strong> Unité : <span style="color:var(--accent)">${a.unit}</span></div>`);
  }
  if(a.emoji && a.emoji !== '🎯'){
    lines.push(`<div class="ai-line"><strong>${a.emoji}</strong> Emoji suggéré</div>`);
  }

  if(lines.length === 0){
    el.classList.remove('show');
    return;
  }

  el.innerHTML = lines.join('');
  el.classList.add('show');

  if(a.quantity !== null){
    const goalInput = document.getElementById('coffreGoal');
    if(goalInput && !goalInput.value) goalInput.value = a.quantity;
  }
  if(a.emoji && a.emoji !== '🎯'){
    const emojiInput = document.getElementById('coffreEmoji');
    if(emojiInput && !emojiInput.value) emojiInput.value = a.emoji;
  }
  if(a.unit && a.unit !== 'unité'){
    const unitInput = document.getElementById('coffreUnit');
    if(unitInput && (!unitInput.value || unitInput.value === 'FCFA')){
      const btnQty = document.getElementById('btnGoalQuantity');
      if(btnQty && !btnQty.classList.contains('active')){
        setGoalType('quantity');
      }
      unitInput.value = a.unit;
    }
  }
}

function getMotivationMessage(pct){
  if(pct >= 100) return {level:5, msg:'OBJECTIF ATTEINT !'};
  if(pct >= 75) return {level:4, msg:'Tu y es presque !'};
  if(pct >= 50) return {level:3, msg:'À mi-chemin !'};
  if(pct >= 25) return {level:2, msg:'Bon démarrage !'};
  if(pct > 0)   return {level:1, msg:'C\'est parti !'};
  return {level:1, msg:'Commence !'};
}

function getProgressionColor(pct){
  if(pct >= 100) return 'var(--green)';
  if(pct >= 75) return '#5fd47f';
  if(pct >= 50) return 'var(--accent)';
  if(pct >= 25) return 'var(--yellow)';
  return 'var(--red)';
}

function renderMotivationJour(){
  const totalGoal = coffres.reduce((s,c) => s + Number(c.goal || 0), 0);
  const totalCurrent = coffres.reduce((s,c) => s + Number(c.current || 0), 0);
  const globalPct = totalGoal > 0 ? (totalCurrent / totalGoal) * 100 : 0;

  const icons = ['🔥','💪','🚀','⭐','💎','🏆','🌟','⚡'];
  const today = new Date().getDate();
  const icon = icons[today % icons.length];

  let title, text;
  if(coffres.length === 0){ title = 'Lance-toi !'; text = 'Crée ton premier objectif.'; }
  else if(globalPct >= 100){ title = 'Champion !'; text = 'Tous tes objectifs atteints !'; }
  else if(globalPct >= 75){ title = 'Tu y es presque !'; text = `Tu es à ${globalPct.toFixed(0)}%.`; }
  else if(globalPct >= 50){ title = 'À mi-chemin !'; text = `Tu as complété ${globalPct.toFixed(0)}%.`; }
  else if(globalPct >= 25){ title = 'Bon démarrage !'; text = `Tu es à ${globalPct.toFixed(0)}%.`; }
  else if(globalPct > 0){ title = 'C\'est parti !'; text = 'Tiens bon !'; }
  else { title = 'À toi de jouer !'; text = 'Commence par 1000 FCFA.'; }

  const icon1 = document.getElementById('motivIcon');
  const title1 = document.getElementById('motivTitle');
  const text1 = document.getElementById('motivText');
  if(icon1) icon1.textContent = icon;
  if(title1) title1.textContent = title;
  if(text1) text1.textContent = text;
}

const DEFIS = [
  "Aujourd'hui, n'achète rien d'impulsif.",
  "Épargne 1000 FCFA aujourd'hui.",
  "Note TOUS tes achats de la journée.",
  "Prépare ton repas maison.",
  "Évite les réseaux sociaux pendant 2h.",
  "Contacte un ancien client.",
  "Aujourd'hui, utilise uniquement du cash.",
  "Range ton espace de travail.",
  "Propose une mini-session à 3 clients.",
  "Vérifie tes abonnements.",
  "Pas de livraison aujourd'hui.",
  "Écris tes 3 objectifs financiers.",
  "Poste une de tes meilleures photos.",
  "Contacte un photographe pro.",
  "Dis non à une dépense inutile."
];

function renderDefiDuJour(){
  const today = new Date();
  const dayKey = today.toISOString().slice(0,10);
  const dayIndex = Math.floor(new Date(dayKey).getTime() / 86400000) % DEFIS.length;

  const defiEl = document.getElementById('defiText');
  const dateEl = document.getElementById('defiDate');
  const btnEl = document.getElementById('defiBtn');
  const streakEl = document.getElementById('defiStreak');

  if(defiEl){
    defiEl.textContent = DEFIS[dayIndex];
    if(dateEl) dateEl.textContent = today.toLocaleDateString('fr-FR', {day:'2-digit', month:'short'});
  }

  const doneKey = `defi_${dayKey}`;
  if(btnEl){
    if(localStorage.getItem(doneKey)){
      btnEl.classList.add('done');
      btnEl.textContent = '✅ Défi relevé !';
    } else {
      btnEl.classList.remove('done');
      btnEl.textContent = '✓ J\'ai relevé le défi';
    }
  }

  let streak = 0;
  let d = new Date(today);
  while(true){
    const k = `defi_${d.toISOString().slice(0,10)}`;
    if(localStorage.getItem(k)){ streak++; d.setDate(d.getDate()-1); }
    else break;
  }
  if(streakEl) streakEl.textContent = streak > 0 ? `🔥 Série : ${streak} jour${streak>1?'s':''} d'affilée !` : '';
}

function validerDefi(){
  const dayKey = new Date().toISOString().slice(0,10);
  localStorage.setItem(`defi_${dayKey}`, '1');
  renderDefiDuJour();
}

function renderAnalysePercutante(){
  const el = document.getElementById('analysePercutante');
  if(!el) return;
  if(coffres.length === 0){ el.innerHTML = '<div class="empty">Crée un objectif pour voir l\'analyse.</div>'; return; }

  const items = [];
  coffres.forEach(c => {
    const current = Number(c.current || 0);
    const goal = Number(c.goal || 1);
    const rest = Math.max(0, goal - current);
    const pct = (current / goal) * 100;
    const unit = c.unit || 'FCFA';
    const isMoney = (c.goal_type || 'money') === 'money';

    const fmtVal = (n) => {
      if(isMoney){ return fmt(n); }
      const numStr = (n % 1 === 0) ? Math.round(n).toString() : n.toFixed(1);
      return numStr + ' ' + unit;
    };

    if(pct >= 100){
      items.push({cls:'good', title:`${c.name} : Terminé !`, text:`Tu as atteint ton objectif 🏆`});
      return;
    }

    if(c.target_date){
      const days = Math.ceil((new Date(c.target_date) - new Date()) / 86400000);
      if(days > 0){
        const perMonth = (rest / days) * 30;
        items.push({ cls:'', title:`${c.name}`, text:`Il te faut <strong>${fmtVal(perMonth)}</strong> par mois pour finir à temps.` });
      } else {
        items.push({ cls:'danger', title:`${c.name}`, text:`Deadline dépassée. Reste ${fmtVal(rest)}.` });
      }
    } else {
      items.push({ cls:'', title:`${c.name} : ${pct.toFixed(0)}%`, text:`Il te reste <strong>${fmtVal(rest)}</strong> à obtenir.` });
    }
  });

  el.innerHTML = items.map(i => `<div class="analyse-item ${i.cls}"><strong>${i.title}</strong>${i.text}</div>`).join('');
}

function openCoffreModal(id, mode){
  editingCoffreId = id || null;
  const c = id ? coffres.find(x => x.id === id) : null;

  // 🆕 Déterminer le mode : 'objectif' ou 'coffre'
  let currentMode = mode || 'objectif';
  
  // Si on édite, on déduit le mode depuis les données
  if(c && !mode){
    const isObjectifPur = c.goal_type === 'objectif_pur' || !c.goal || Number(c.goal) <= 1;
    currentMode = isObjectifPur ? 'objectif' : 'coffre';
  }

  const isCoffreMode = currentMode === 'coffre';

  // Titre et bouton
  document.getElementById('coffreModalTitle').textContent = 
    c ? (isCoffreMode ? 'Modifier le coffre' : 'Modifier l\'objectif')
      : (isCoffreMode ? 'Nouveau coffre' : 'Nouvel objectif');
  
  document.getElementById('coffreSubmit').textContent = c ? 'Enregistrer' : (isCoffreMode ? 'Créer le coffre' : 'Créer l\'objectif');

  // Adapter les textes selon le mode
  const nameInput = document.getElementById('coffreName');
  if(nameInput){
    nameInput.placeholder = isCoffreMode 
      ? 'Ex: Coffre Loyer, Coffre Voiture, Coffre Réserve...'
      : 'Ex: 50 mariages cette année, 100 clients, Apprendre le drone...';
  }

  // La case à cocher "a un montant" — pré-cochée si mode coffre
  const hasMoneyCheckbox = document.getElementById('coffreHasMoney');
  const moneyFieldsWrap = document.getElementById('coffreMoneyFields');
  
  let hasMoney;
  if(c){
    hasMoney = !(c.goal_type === 'objectif_pur' || !c.goal || Number(c.goal) <= 1);
  } else {
    hasMoney = isCoffreMode; // Par défaut : coffre = avec argent, objectif = sans argent
  }

  if(hasMoneyCheckbox){
    hasMoneyCheckbox.checked = hasMoney;
  }
  if(moneyFieldsWrap){
    moneyFieldsWrap.style.display = hasMoney ? 'block' : 'none';
  }

  // Remplir les champs
  setGoalType(c?.goal_type === 'quantity' ? 'quantity' : 'money');
  document.getElementById('coffreName').value = c?.name || '';
  document.getElementById('coffreGoal').value = c?.goal || '';
  document.getElementById('coffreCurrent').value = c?.current || '';
  document.getElementById('coffreDate').value = c?.target_date || '';
  document.getElementById('coffreWhy').value = c?.why || '';
  document.getElementById('coffreEmoji').value = c?.emoji || '';
  document.getElementById('coffreUnit').value = c?.unit || 'FCFA';
  document.getElementById('coffreDescription').value = c?.description || '';

  const analysis = document.getElementById('coffreAnalysis');
  if(analysis) {
    analysis.classList.remove('show');
    analysis.innerHTML = '';
  }

  document.getElementById('coffreModalBg').classList.add('show');
}
function closeCoffreModal(){
  document.getElementById('coffreModalBg').classList.remove('show');
  editingCoffreId = null;
}

async function saveCoffre(){
  const name = document.getElementById('coffreName').value.trim();
  if(!name){ alert('Le nom est requis'); return; }

  const hasMoneyCheckbox = document.getElementById('coffreHasMoney');
  const hasMoney = hasMoneyCheckbox ? hasMoneyCheckbox.checked : true;

  let goal = 0;
  let current = 0;
  let unit = '';
  let goal_type = 'objectif_pur';

  if(hasMoney){
    goal = parseFloat(document.getElementById('coffreGoal').value);
    current = parseFloat(document.getElementById('coffreCurrent').value) || 0;
    unit = document.getElementById('coffreUnit').value.trim() || 'FCFA';
    
    if(!goal || goal <= 0){ alert('Indique un montant à atteindre'); return; }

    const btnQty = document.getElementById('btnGoalQuantity');
    goal_type = (btnQty && btnQty.classList.contains('active')) ? 'quantity' : 'money';
  } else {
    // Objectif sans argent : on met un placeholder
    goal = 1;
    current = 0;
    unit = 'unité';
    goal_type = 'objectif_pur';
  }

  const target_date = document.getElementById('coffreDate').value || null;
  const why = document.getElementById('coffreWhy').value.trim();
  const emoji = document.getElementById('coffreEmoji').value.trim();
  const description = document.getElementById('coffreDescription').value.trim();

  // Détection type automatique (pour les coffres)
  const analyseType = analyserCoffre(name);
  
  const data = { 
    name, 
    goal, 
    current, 
    target_date, 
    why: why || null, 
    goal_type, 
    unit, 
    emoji: emoji || null, 
    description: description || null,
    type_coffre: hasMoney ? analyseType.typeId : 'objectif_pur'
  };

  if(editingCoffreId){
    const result = await dbUpdate('goals', editingCoffreId, data);
    if(!result) return;
    const idx = coffres.findIndex(c => c.id === editingCoffreId);
    coffres[idx] = result;
    showToast(hasMoney ? 'Coffre modifié' : 'Objectif modifié');
  } else {
    const result = await dbInsert('goals', data);
    if(!result) return;
    coffres.unshift(result);
    showToast(hasMoney ? 'Coffre créé' : 'Objectif créé');
  }

  closeCoffreModal();
  refreshAll();
}

async function delCoffre(id){
  if(!confirm("Supprimer cet objectif ?")) return;
  const ok = await dbDelete('goals', id);
  if(!ok) return;
  coffres = coffres.filter(c => c.id !== id);
  refreshAll();
}

function openDepositModal(id){
  depositingCoffreId = id;
  const c = coffres.find(x => x.id === id);
  if(!c) return;
  const el = document.getElementById('depositCoffreName');
  if(el) el.textContent = c.name;
  const inp = document.getElementById('depositAmount');
  if(inp) inp.value = '';
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
  if(!c) return;
  const newCurrent = Number(c.current || 0) + amt;
  const result = await dbUpdate('goals', depositingCoffreId, {current: newCurrent});
  if(!result) return;
  c.current = newCurrent;
  closeDepositModal();
  refreshAll();
}

function renderCoffres(){
  renderMotivationJour();
  renderDefiDuJour();
  renderAnalysePercutante();
  renderGoalReminders();
  renderGoalSuggestions();

  // 🆕 Séparer les objectifs purs et les coffres
  const objectifsPurs = coffres.filter(c => c.goal_type === 'objectif_pur' || !c.goal || Number(c.goal) <= 1);
  const coffresReels = coffres.filter(c => !(c.goal_type === 'objectif_pur' || !c.goal || Number(c.goal) <= 1));

  // Rendu des objectifs purs
  const elObj = document.getElementById('objectifsPursList');
  if(elObj){
    if(objectifsPurs.length === 0){
      elObj.innerHTML = '<div class="empty">Aucun objectif. Crées-en un.</div>';
    } else {
      elObj.innerHTML = objectifsPurs.map(c => {
        const dateStr = c.target_date ? new Date(c.target_date).toLocaleDateString('fr-FR', {day:'2-digit', month:'long', year:'numeric'}) : '';
        const emoji = c.emoji || '🎯';
        return `<div class="coffre" style="border-left:3px solid var(--accent)">
          <div class="coffre-header">
            <div class="coffre-name">
              <span class="coffre-emoji">${emoji}</span>${c.name}
            </div>
            <span class="coffre-badge">🎯 OBJECTIF</span>
          </div>
          ${c.description ? `<div class="coffre-why" style="border-left-color:var(--accent)">📝 ${c.description}</div>` : ''}
          ${c.why ? `<div class="coffre-why">"${c.why}"</div>` : ''}
          ${dateStr ? `<div class="coffre-next"><span>📅 Objectif : ${dateStr}</span></div>` : ''}
          <div class="coffre-actions">
            <button class="btn-ghost" style="margin:0;padding:8px" onclick="openCoffreModal(${c.id})" title="Modifier">✏️ Modifier</button>
            <button class="btn-ghost" style="margin:0;padding:8px;border-color:var(--red);color:var(--red)" onclick="delCoffre(${c.id})" title="Supprimer">🗑</button>
          </div>
        </div>`;
      }).join('');
    }
  }

  // Rendu des coffres réels
  const el = document.getElementById('coffresList');
  if(!el) return;
  if(coffresReels.length === 0){ el.innerHTML = '<div class="empty">Aucun coffre. Crées-en un.</div>'; return; }

  el.innerHTML = coffresReels.map(c => {
    const current = Number(c.current || 0);
    const goal = Number(c.goal || 1);
    const pct = Math.min(100, (current / goal) * 100);
    const rest = Math.max(0, goal - current);
    const mot = getMotivationMessage(pct);
    const color = getProgressionColor(pct);
    const emoji = c.emoji || getCoffreEmoji(c.name);
    const done = pct >= 100;
    const isMoney = (c.goal_type || 'money') === 'money';
    const unit = c.unit || 'FCFA';

    const fmtVal = (n) => {
      if(isMoney){ return fmt(n); }
      const numStr = (n % 1 === 0) ? Math.round(n).toString() : n.toFixed(1);
      return numStr + ' ' + unit;
    };

    let timeInfo = '';
    if(c.target_date && rest > 0){
      const days = Math.ceil((new Date(c.target_date) - new Date()) / 86400000);
      if(days > 0){
        const perWeek = (rest / days) * 7;
        timeInfo = `<div class="coffre-next"><span>⏱ ${days} jours</span><span>${fmtVal(perWeek)}/semaine</span></div>`;
      } else {
        timeInfo = `<div class="coffre-next"><span style="color:var(--red)">⚠ Date dépassée</span></div>`;
      }
    }

    let badge = '';
    if(pct >= 100) badge = '<span class="coffre-badge done">🏆 Atteint</span>';
    else if(pct >= 75) badge = '<span class="coffre-badge">🔥 ' + pct.toFixed(0) + '%</span>';
    else if(pct >= 50) badge = '<span class="coffre-badge">💪 ' + pct.toFixed(0) + '%</span>';
    else if(pct >= 25) badge = '<span class="coffre-badge">⚡ ' + pct.toFixed(0) + '%</span>';
    else badge = '<span class="coffre-badge">🌱 ' + pct.toFixed(0) + '%</span>';

    const p25 = pct >= 25 ? 'reached' : '';
    const p50 = pct >= 50 ? 'reached' : '';
    const p75 = pct >= 75 ? 'reached' : '';
    const p100 = pct >= 100 ? 'reached' : '';

    const typeTag = isMoney
      ? '<span style="font-size:10px;color:var(--gold-soft);background:rgba(245,197,66,.12);padding:2px 8px;border-radius:8px;font-weight:700;margin-left:6px">💰 ARGENT</span>'
      : '<span style="font-size:10px;color:var(--accent-2);background:rgba(107,142,255,.12);padding:2px 8px;border-radius:8px;font-weight:700;margin-left:6px">🔢 QUANTITÉ</span>';

        const type = getTypeCoffre(c);
    const bloque = estCoffreBloque(c);
    const lockLabel = bloque
      ? (Number(c.lock_level) >= 3 ? '🔒🔒🔒 Verrouillé' : '🔒🔒 Bloqué')
      : '🔓 Libre';

    return `<div class="coffre ${done ? 'completed' : ''}">
      <div style="background:linear-gradient(135deg,${type.color}22,${type.color}08);border-left:3px solid ${type.color};border-radius:10px;padding:10px 12px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <div style="font-size:11px;font-weight:700;color:${type.color};text-transform:uppercase;letter-spacing:1px">${type.icon} ${type.label}</div>
          <div style="font-size:10px;font-weight:700;color:${bloque ? 'var(--yellow)' : 'var(--muted)'}">${lockLabel}</div>
        </div>
        <div style="font-size:11px;color:var(--muted);line-height:1.4">${type.desc}</div>
      </div>
      <div class="coffre-header">
        <div class="coffre-name" style="flex-wrap:wrap">
          <span class="coffre-emoji">${emoji}</span>${c.name}${typeTag}
        </div>
        ${badge}
      </div>
      <div class="coffre-progress"><div class="coffre-progress-fill" style="width:${pct}%;background:${color}"></div></div>
      <div class="coffre-paliers">
        <span class="${p25}">25%</span><span class="${p50}">50%</span><span class="${p75}">75%</span><span class="${p100}">100%</span>
      </div>
      <div class="coffre-amounts">
        <div><span class="current">${fmtVal(current)}</span> <span class="goal">/ ${fmtVal(goal)}</span></div>
        ${rest > 0 ? `<div class="rest">Reste : ${fmtVal(rest)}</div>` : ''}
      </div>
      <div class="coffre-message level-${mot.level}">${mot.msg}</div>
           ${bloque
        ? `<div style="background:rgba(245,197,66,.08);border-left:3px solid var(--yellow);border-radius:10px;padding:10px 12px;margin-bottom:10px;font-size:12px;line-height:1.5">
            <div style="font-weight:700;color:var(--yellow);margin-bottom:4px">🔒 Coffre protégé</div>
            <div style="color:var(--text)">${type.message.short}</div>
            <div style="font-size:10px;color:var(--muted);margin-top:4px">✅ Tu peux toujours ajouter · ❌ Tu dois débloquer pour retirer</div>
          </div>`
        : ''
      }
      ${c.description ? `<div class="coffre-why" style="border-left-color:var(--pink)">📝 ${c.description}</div>` : ''}
      ${c.why ? `<div class="coffre-why">"${c.why}"</div>` : ''}
      ${timeInfo}
           <div class="coffre-actions">
        ${estCoffreBloque(c)
          ? `<button class="btn-ghost" style="margin:0;background:rgba(245,197,66,.15);color:var(--yellow);border-color:var(--yellow);font-weight:700;font-size:11px" onclick="debloquerCoffre(${c.id})">🔒 Débloquer</button>`
          : `<button class="btn-ghost" style="margin:0;background:rgba(107,142,255,.10);color:var(--accent);border-color:var(--accent);font-weight:700;font-size:11px" onclick="bloquerCoffre(${c.id})">🔓 Bloquer</button>`
        }
        <button class="btn-primary" style="margin:0;background:var(--green);font-size:11px;font-weight:700" onclick="ouvrirEpargnePerso(${c.id})">➕ Ajouter</button>
        ${!estCoffreBloque(c) && Number(c.current) > 0
          ? `<button class="btn-ghost" style="margin:0;background:rgba(255,107,107,.10);color:var(--red);border-color:var(--red);font-weight:700;font-size:11px" onclick="retirerCoffre(${c.id})">💸 Retirer</button>`
          : ''
        }
        <button class="btn-ghost" style="margin:0;padding:8px" onclick="openCoffreModal(${c.id})" title="Modifier">✏️</button>
        <button class="btn-ghost" style="margin:0;padding:8px;border-color:var(--red);color:var(--red)" onclick="delCoffre(${c.id})" title="Supprimer">🗑</button>
      </div>
    </div>`;
  }).join('');

  const at = document.getElementById('antiTemptation');
  if(!at) return;
  const active = coffres.filter(c => Number(c.current) < Number(c.goal));
  if(active.length === 0){
    at.innerHTML = '<div class="empty">Aucun objectif en cours</div>';
  } else {
    at.innerHTML = active.slice(0, 3).map(c => {
      const rest = Number(c.goal) - Number(c.current);
      const pct = (Number(c.current) / Number(c.goal) * 100).toFixed(0);
      const isMoney = (c.goal_type || 'money') === 'money';
      const unit = c.unit || 'FCFA';
      const restStr = isMoney ? fmt(rest) : Math.round(rest) + ' ' + unit;
      const msg = c.why ? `Rappelle-toi : "${c.why}"` : `Tu es à ${pct}%.`;
      return `<div class="insight bad"><div class="title">🛑 ${c.name} : encore ${restStr}</div><div>${msg}</div></div>`;
    }).join('');
  }
}

// ============================================================
// MODULE PHOTO - CLIENTS
// ============================================================
function openClientModal(id){
  editingClientId = id || null;
  const c = id ? clients.find(x => x.id === id) : null;

  document.getElementById('clientModalTitle').textContent = c ? 'Modifier' : 'Nouveau client';
  document.getElementById('clientName').value = c?.name || '';
  document.getElementById('clientPhone').value = c?.phone || '';
  document.getElementById('clientEmail').value = c?.email || '';
  document.getElementById('clientCity').value = c?.city || '';
  document.getElementById('clientNotes').value = c?.notes || '';

  // 🆕 Remplir les cases de catégories
  const existingCats = Array.isArray(c?.categories) ? c.categories : [];
  document.querySelectorAll('.client-cat').forEach(cb => {
    cb.checked = existingCats.includes(cb.value);
  });

  // 🆕 Champ catégorie perso (si une catégorie n'est pas dans la liste)
  const knownCats = ['VIP','Fidèle','Nouveau','Inactif','Mariage','Corporate','Portrait','Événement','Studio','Extérieur','Famille','Baptême','Scolaire','Autre'];
  const customCats = existingCats.filter(cat => !knownCats.includes(cat));
  const customInput = document.getElementById('clientCustomCategory');
  if(customInput) customInput.value = customCats.join(', ');

  document.getElementById('clientModalBg').classList.add('show');
}

function closeClientModal(){
  document.getElementById('clientModalBg').classList.remove('show');
  editingClientId = null;
}

async function saveClient(){
  const name = document.getElementById('clientName').value.trim();
  if(!name){ alert("Nom requis"); return; }

  // 🆕 Récupérer les catégories cochées
  const checkedCats = [];
  document.querySelectorAll('.client-cat:checked').forEach(cb => {
    checkedCats.push(cb.value);
  });

  // 🆕 Ajouter la catégorie perso si présente
  const customInput = document.getElementById('clientCustomCategory');
  if(customInput){
    const customRaw = customInput.value.trim();
    if(customRaw){
      const customs = customRaw.split(',').map(s => s.trim()).filter(Boolean);
      customs.forEach(c => {
        if(!checkedCats.includes(c)) checkedCats.push(c);
      });
    }
  }

  const data = {
    name,
    phone: document.getElementById('clientPhone').value.trim(),
    email: document.getElementById('clientEmail').value.trim(),
    city: document.getElementById('clientCity').value.trim(),
    notes: document.getElementById('clientNotes').value.trim(),
    categories: checkedCats
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
  refreshAll();
}

async function delClient(id){
  if(!confirm("Supprimer ce client ?")) return;
  const ok = await dbDelete('clients', id);
  if(!ok) return;
  clients = clients.filter(c => c.id !== id);
  shoots.forEach(s => { if(s.client_id === id) s.client_id = null; });
  refreshAll();
}

function renderClients(){
  const el = document.getElementById('clientsList');
  if(!el) return;
  if(clients.length === 0){ el.innerHTML = '<div class="empty">Aucun client</div>'; return; }

  // Filtre par catégorie
  const catFilter = document.getElementById('clientFilterCategory')?.value || 'all';
  const searchEl = document.getElementById('clientSearch');
  const search = (searchEl?.value || '').trim().toLowerCase();

  let filtered = clients.filter(c => {
    if(catFilter !== 'all'){
      const cats = Array.isArray(c.categories) ? c.categories : [];
      if(!cats.includes(catFilter)) return false;
    }
    if(search){
      const haystack = [c.name, c.phone, c.email, c.city, c.notes].filter(Boolean).join(' ').toLowerCase();
      if(!haystack.includes(search)) return false;
    }
    return true;
  });

  if(filtered.length === 0){
    el.innerHTML = '<div class="empty">Aucun client ne correspond</div>';
    return;
  }

  // Compter pour le résumé
  const totalClients = clients.length;
  const affiches = filtered.length;

  el.innerHTML = `
    <div style="font-size:12px;color:var(--muted);text-align:center;margin-bottom:10px">
      ${affiches} client${affiches > 1 ? 's' : ''} affiché${affiches > 1 ? 's' : ''} sur ${totalClients}
    </div>
  ` + filtered.map(c => {
    const cats = Array.isArray(c.categories) ? c.categories : [];
    const catHtml = cats.length > 0
      ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px">
          ${cats.map(cat => `<span style="background:linear-gradient(135deg,rgba(107,142,255,.20),rgba(255,126,179,.12));color:var(--accent-2);padding:3px 8px;border-radius:10px;font-size:11px;font-weight:700">🏷️ ${cat}</span>`).join('')}
        </div>`
      : '';

      // Calcul des infos date/heure
    const dateAjout = c.created_at 
      ? new Date(c.created_at).toLocaleString('fr-FR', {day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'})
      : 'Date inconnue';
    
    // Séances de ce client
    const clientShoots = shoots.filter(s => s.client_id === c.id);
    const nombreSeances = clientShoots.length;
    const totalEncaisse = clientShoots.reduce((sum, s) => sum + Number(s.montant_recu || 0), 0);
    
    // Dernière séance
    let derniereSeance = 'Aucune séance';
    if(clientShoots.length > 0){
      const sorted = [...clientShoots].sort((a,b) => (b.date || '').localeCompare(a.date || ''));
      if(sorted[0]?.date){
        derniereSeance = new Date(sorted[0].date).toLocaleString('fr-FR', {day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'});
      }
    }

    return `<div class="item-card">
      <div class="head"><div class="name">👤 ${c.name}</div></div>
      ${c.phone ? `<div class="amt"><span>📞 ${c.phone}</span></div>` : ''}
      ${c.email ? `<div class="amt"><span>✉️ ${c.email}</span></div>` : ''}
      ${c.city ? `<div class="amt"><span>📍 ${c.city}</span></div>` : ''}
      ${c.notes ? `<div style="font-size:12px;color:var(--muted);margin-top:6px">${c.notes}</div>` : ''}
      ${catHtml}
      
      <div style="background:var(--card);border-radius:10px;padding:10px 12px;margin-top:10px;border:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:11px">
          <span style="color:var(--muted)">📅 Ajouté le</span>
          <span style="font-weight:600;text-align:right;font-size:11px">${dateAjout}</span>
        </div>
        ${nombreSeances > 0 ? `
          <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:11px">
            <span style="color:var(--muted)">📸 Séances</span>
            <span style="font-weight:600">${nombreSeances}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:11px">
            <span style="color:var(--muted)">💰 Encaissé</span>
            <span style="font-weight:600;color:var(--green)">${fmt(totalEncaisse)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:11px">
            <span style="color:var(--muted)">📅 Dernière</span>
            <span style="font-weight:600;text-align:right;font-size:11px">${derniereSeance}</span>
          </div>
        ` : ''}
      </div>
      
      <div class="actions" style="display:flex;gap:6px;margin-top:8px">
        <button class="btn-ghost" style="margin:0;padding:6px" onclick="openClientModal(${c.id})">Modifier</button>
        <button class="btn-ghost" style="margin:0;padding:6px" onclick="delClient(${c.id})">×</button>
      </div>
    </div>`;
  }).join('');
}

// ============================================================
// Voir les règles de répartition
// ============================================================
function ouvrirGuideRegles(){
  const existing = document.getElementById('reglesModal');
  if(existing) existing.remove();

  const rows = Object.entries(REGLES_REPARTITION)
    .filter(([k]) => k !== 'default')
    .map(([key, r]) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-weight:700;font-size:14px">${r.icon} ${r.label}</div>
          <div style="font-size:11px;color:var(--muted)">Répartition conseillée</div>
        </div>
        <div style="text-align:right;font-size:12px">
          <div style="color:var(--green);font-weight:700">💰 ${r.epargne}%</div>
          <div style="color:var(--yellow);font-weight:700">🏠 ${r.charges}%</div>
          <div style="color:var(--accent);font-weight:700">🎉 ${r.libre}%</div>
        </div>
      </div>
    `).join('');

  const modal = document.createElement('div');
  modal.className = 'modal-bg show';
  modal.id = 'reglesModal';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-wrap">
        <h3>🧠 Mes règles de répartition</h3>
        <button class="close" onclick="document.getElementById('reglesModal').remove()">×</button>
      </div>

      <div style="background:linear-gradient(135deg,rgba(107,142,255,.12),rgba(255,126,179,.06));border-radius:12px;padding:14px;margin-bottom:16px;font-size:13px;color:var(--text);line-height:1.5">
        💡 Quand tu reçois un paiement, l'app te suggère une répartition automatique selon le type de prestation.
      </div>

      <div style="background:var(--card2);border-radius:12px;padding:14px;margin-bottom:16px">
        ${rows}
      </div>

      <div style="font-size:12px;color:var(--muted);text-align:center;line-height:1.5">
        Ces règles sont des <strong>suggestions</strong>. Tu restes libre d'appliquer ou non.
      </div>

      <button class="btn-ghost" style="margin-top:16px;width:100%" onclick="document.getElementById('reglesModal').remove()">Fermer</button>
    </div>
  `;
  document.body.appendChild(modal);
}
// ============================================================
// RÉPARTITION D'UNE SÉANCE (Manuel / Auto + 3 options)
// ============================================================
function ouvrirRepartitionSeance(shootId){
  const s = shoots.find(x => x.id === shootId);
  if(!s){ alert('Séance introuvable'); return; }

  const prix = Number(s.price || 0);
  const recu = Number(s.montant_recu || 0);
  const charges = (s.shoot_expenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const reparti = Number(s.montant_reparti || 0);
  const netEncaisse = recu - charges;
  const disponible = Math.max(0, netEncaisse - reparti);

  if(disponible <= 0){
    alert('Rien à répartir sur cette séance.');
    return;
  }

  const existing = document.getElementById('repartitionModal');
  if(existing) existing.remove();

  const activeGoals = coffres.filter(c => Number(c.current) < Number(c.goal));
  const client = s.client_id ? clients.find(c => c.id === s.client_id) : null;
  const clientName = client ? client.name : '';

  const modal = document.createElement('div');
  modal.className = 'modal-bg show';
  modal.id = 'repartitionModal';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-wrap">
        <h3>💰 Répartir l'argent</h3>
        <button class="close" onclick="fermerRepartition()">×</button>
      </div>

      <div style="background:linear-gradient(135deg,rgba(107,142,255,.12),rgba(52,211,153,.08));border-radius:14px;padding:16px;margin-bottom:16px">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Séance</div>
        <div style="font-weight:700;font-size:15px;margin-bottom:10px">📸 ${s.type}${clientName ? ' · ' + clientName : ''}</div>
        <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px">
          <span style="color:var(--muted)">Net encaissé</span>
          <span style="font-weight:700">${fmt(netEncaisse)}</span>
        </div>
        ${reparti > 0 ? `
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px">
            <span style="color:var(--muted)">Déjà réparti</span>
            <span style="color:var(--accent);font-weight:700">${fmt(reparti)}</span>
          </div>
        ` : ''}
        <div style="display:flex;justify-content:space-between;padding:10px 0 0;border-top:1px solid var(--border);margin-top:6px">
          <span style="font-weight:700;font-size:14px">🎯 Disponible</span>
          <span style="font-weight:800;font-size:18px;color:var(--green)">${fmt(disponible)}</span>
        </div>
      </div>

      <label>Mode de répartition</label>
      <div class="type-toggle" style="margin-bottom:14px">
        <button type="button" id="repModeManuel" class="active" onclick="setRepartMode('manuel')">✋ Manuel</button>
        <button type="button" id="repModeAuto" onclick="setRepartMode('auto')">🤖 Automatique</button>
      </div>

      <div id="repAutoInfo" style="display:none;background:linear-gradient(135deg,rgba(245,197,66,.12),rgba(245,197,66,.04));border:1px solid rgba(245,197,66,.25);border-radius:12px;padding:12px;margin-bottom:14px;font-size:12px;color:var(--gold-soft);line-height:1.5">
        🤖 L'IA va te proposer une répartition basée sur tes habitudes et tes objectifs. Tu pourras la modifier avant de valider.
      </div>

      <label>Destination</label>
      <div style="display:grid;gap:8px;margin-bottom:14px">
        <button type="button" id="repDest1" class="active" onclick="setRepartDest(1)" style="background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:12px 14px;text-align:left;cursor:pointer;font-family:inherit;color:var(--text);width:100%">
          <div style="font-weight:700;font-size:13px;margin-bottom:2px">🎯 Objectif existant</div>
          <div style="font-size:11px;color:var(--muted)">Alimenter un coffre que tu as déjà créé</div>
        </button>
        <button type="button" id="repDest2" onclick="setRepartDest(2)" style="background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:12px 14px;text-align:left;cursor:pointer;font-family:inherit;color:var(--text);width:100%">
          <div style="font-weight:700;font-size:13px;margin-bottom:2px">➕ Nouvel objectif</div>
          <div style="font-size:11px;color:var(--muted)">Créer un nouveau coffre et l'alimenter</div>
        </button>
        <button type="button" id="repDest3" onclick="setRepartDest(3)" style="background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:12px 14px;text-align:left;cursor:pointer;font-family:inherit;color:var(--text);width:100%">
          <div style="font-weight:700;font-size:13px;margin-bottom:2px">💼 Épargne libre</div>
          <div style="font-size:11px;color:var(--muted)">Mettre de côté sans objectif précis</div>
        </button>
      </div>

      <div id="repDest1Box">
        <label>Choisis l'objectif</label>
        <select id="repGoalId">
          ${activeGoals.length === 0
            ? '<option value="">Aucun objectif actif</option>'
            : activeGoals.map(c => {
                const pct = (Number(c.current) / Number(c.goal) * 100).toFixed(0);
                return `<option value="${c.id}">${c.emoji || '🎯'} ${c.name} (${pct}%)</option>`;
              }).join('')
          }
        </select>
      </div>

      <div id="repDest2Box" style="display:none">
        <label>Nom du nouvel objectif</label>
        <input type="text" id="repNewGoalName" placeholder="Ex: Nouveau matériel photo">
        <label>Montant cible (FCFA)</label>
        <input type="number" id="repNewGoalTarget" inputmode="decimal" placeholder="Ex: 500000">
      </div>

      <div id="repDest3Box" style="display:none">
        <div style="background:rgba(107,142,255,.08);border-radius:10px;padding:10px;font-size:12px;color:var(--muted);line-height:1.4">
          💼 L'argent ira dans une réserve générale. Tu pourras la consulter dans la section Épargne.
        </div>
      </div>

      <label style="margin-top:14px">Montant à répartir (FCFA)</label>
      <input type="number" id="repAmount" inputmode="decimal" value="${disponible}" placeholder="0" style="font-size:20px;font-weight:700;text-align:center;color:var(--green)">

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px">
        <button class="btn-ghost" style="margin:0;padding:8px;font-size:11px" onclick="document.getElementById('repAmount').value=${Math.round(disponible*0.25)}">25%</button>
        <button class="btn-ghost" style="margin:0;padding:8px;font-size:11px" onclick="document.getElementById('repAmount').value=${Math.round(disponible*0.5)}">50%</button>
        <button class="btn-ghost" style="margin:0;padding:8px;font-size:11px" onclick="document.getElementById('repAmount').value=${Math.round(disponible*0.75)}">75%</button>
        <button class="btn-ghost" style="margin:0;padding:8px;font-size:11px;background:rgba(52,211,153,.10);color:var(--green);border-color:var(--green)" onclick="document.getElementById('repAmount').value=${disponible}">Tout</button>
      </div>

      <button class="btn-primary" style="margin-top:18px;width:100%;background:linear-gradient(135deg,var(--green),#10b981);color:#000;font-weight:800;padding:16px" onclick="validerRepartition(${shootId}, ${disponible})">
        ✅ Valider la répartition
      </button>
      <button class="btn-ghost" style="margin-top:8px;width:100%" onclick="fermerRepartition()">Annuler</button>
    </div>
  `;
  document.body.appendChild(modal);
  window.__repartitionShootId = shootId;
  window.__repartitionDisponible = disponible;
  window.__repartitionMode = 'manuel';
  window.__repartitionDest = 1;
}

function fermerRepartition(){
  const m = document.getElementById('repartitionModal');
  if(m) m.remove();
  window.__repartitionShootId = null;
}

function setRepartMode(mode){
  window.__repartitionMode = mode;
  document.getElementById('repModeManuel').classList.toggle('active', mode === 'manuel');
  document.getElementById('repModeAuto').classList.toggle('active', mode === 'auto');
  document.getElementById('repAutoInfo').style.display = mode === 'auto' ? 'block' : 'none';
}

function setRepartDest(dest){
  window.__repartitionDest = dest;
  for(let i = 1; i <= 3; i++){
    document.getElementById('repDest' + i).classList.toggle('active', i === dest);
    document.getElementById('repDest' + i).style.border = (i === dest) ? '1px solid var(--accent)' : '1px solid var(--border)';
    document.getElementById('repDest' + i).style.background = (i === dest) ? 'linear-gradient(135deg,rgba(107,142,255,.15),rgba(107,142,255,.05))' : 'var(--card2)';
  }
  document.getElementById('repDest1Box').style.display = dest === 1 ? 'block' : 'none';
  document.getElementById('repDest2Box').style.display = dest === 2 ? 'block' : 'none';
  document.getElementById('repDest3Box').style.display = dest === 3 ? 'block' : 'none';
}

async function validerRepartition(shootId, maxDisponible){
  const montant = parseFloat(document.getElementById('repAmount').value) || 0;
  if(montant <= 0){ alert('Montant invalide'); return; }
  if(montant > maxDisponible){ alert('Montant supérieur au disponible'); return; }

  const dest = window.__repartitionDest;
  const s = shoots.find(x => x.id === shootId);
  if(!s) return;

  let goalId = null;
  let goalName = '';

  if(dest === 1){
    goalId = parseInt(document.getElementById('repGoalId').value);
    if(!goalId){ alert('Choisis un objectif'); return; }
    const goal = coffres.find(c => c.id === goalId);
    if(goal){
      const newCurrent = Number(goal.current || 0) + montant;
      const upd = await dbUpdate('goals', goalId, {current: newCurrent});
      if(upd){ goal.current = newCurrent; }
      goalName = goal.name;
    }
  } else if(dest === 2){
    const name = document.getElementById('repNewGoalName').value.trim();
    const target = parseFloat(document.getElementById('repNewGoalTarget').value) || 0;
    if(!name){ alert('Donne un nom au nouvel objectif'); return; }
    if(target <= 0){ alert('Indique un montant cible'); return; }
    const newGoal = await dbInsert('goals', {
      name: name,
      goal: target,
      current: montant,
      goal_type: 'money',
      unit: 'FCFA',
      emoji: getCoffreEmoji(name),
      why: 'Créé lors d\'une répartition',
      description: null,
      target_date: null
    });
    if(newGoal){
      coffres.unshift(newGoal);
      goalId = newGoal.id;
      goalName = name;
    }
  } else {
    goalName = 'Épargne libre';
  }

  // Créer une transaction "Épargne" (dépense interne)
  const txResult = await dbInsert('transactions', {
    type: 'depense',
    amount: montant,
    category: 'Épargne',
    note: 'Répartition séance ' + s.type + (goalName ? ' · ' + goalName : ''),
    date: todayStr(),
    payment_method: 'Interne'
  });
  if(txResult){ txs.unshift(txResult); }

  // Mettre à jour la séance
  const newReparti = Number(s.montant_reparti || 0) + montant;
  const upd = await dbUpdate('shoots', shootId, {
    montant_reparti: newReparti,
    repartition_effectuee: true
  });
  if(upd){
    s.montant_reparti = newReparti;
    s.repartition_effectuee = true;
  }

  fermerRepartition();
  refreshAll();
  showToast(`✅ ${fmt(montant)} réparti vers ${goalName}`);
}

// ============================================================
// ANNULER UNE RÉPARTITION
// ============================================================
async function annulerRepartition(shootId, txId, montant, goalId){
  if(!confirm('Annuler cette répartition ?')) return;

  // Supprimer la transaction d'épargne
  const ok = await dbDelete('transactions', txId);
  if(!ok) return;
  txs = txs.filter(t => t.id !== txId);

  // Retirer le montant de l'objectif
  if(goalId){
    const goal = coffres.find(c => c.id === goalId);
    if(goal){
      const newCurrent = Math.max(0, Number(goal.current || 0) - montant);
      const upd = await dbUpdate('goals', goalId, {current: newCurrent});
      if(upd){ goal.current = newCurrent; }
    }
  }

  // Retirer le montant de la séance
  const s = shoots.find(x => x.id === shootId);
  if(s){
    const newReparti = Math.max(0, Number(s.montant_reparti || 0) - montant);
    const upd = await dbUpdate('shoots', shootId, {
      montant_reparti: newReparti,
      repartition_effectuee: newReparti > 0
    });
    if(upd){
      s.montant_reparti = newReparti;
      s.repartition_effectuee = newReparti > 0;
    }
  }

  refreshAll();
  showToast('Répartition annulée');
}

// ============================================================
// MODULE PHOTO - SÉANCES
// ============================================================
const TYPES_FIXES = ['Mariage','Dot','Shooting Studio','Shoot Extérieur','Autre'];
let currentShootFilter = 'all';

function onShootTypeChange(){
  const t = document.getElementById('shootType').value;
  const wrap = document.getElementById('shootCustomTypeWrap');
  if(wrap) wrap.style.display = (t === 'Autre') ? 'block' : 'none';
}

function openShootModal(id){
  editingShootId = id || null;
  const s = id ? shoots.find(x => x.id === id) : null;

  document.getElementById('shootModalTitle').textContent = s ? 'Modifier la séance' : 'Nouvelle séance';

  const sel = document.getElementById('shootClient');
  if(sel){
    sel.innerHTML = '<option value="">-- Choisir --</option>'
      + clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('')
      + '<option value="__new__" style="color:var(--green);font-weight:700">➕ Créer un nouveau client</option>';
  }

  const newWrap = document.getElementById('shootNewClientWrap');
  if(newWrap) newWrap.style.display = 'none';

  currentShootExpenses = [];
  if(s && s.shoot_expenses && Array.isArray(s.shoot_expenses)){
    currentShootExpenses = JSON.parse(JSON.stringify(s.shoot_expenses));
  }

  if(s){
    if(sel) sel.value = s.client_id || '';
    const savedType = s.type || 'Mariage';
    if(TYPES_FIXES.includes(savedType)){
      document.getElementById('shootType').value = savedType;
      document.getElementById('shootCustomType').value = '';
    } else {
      document.getElementById('shootType').value = 'Autre';
      document.getElementById('shootCustomType').value = savedType;
    }
    document.getElementById('shootLocation').value = s.location || '';
    document.getElementById('shootPhotoCount').value = s.photo_count || '';
    document.getElementById('shootDate').value = s.date ? new Date(s.date).toISOString().slice(0,16) : '';
    document.getElementById('shootPrice').value = s.price || '';
    document.getElementById('shootPay').value = s.payment || 'impaye';
    document.getElementById('shootNotes').value = s.notes || '';
  } else {
    if(sel) sel.value = '';
    document.getElementById('shootType').value = 'Mariage';
    document.getElementById('shootCustomType').value = '';
    document.getElementById('shootLocation').value = '';
    document.getElementById('shootPhotoCount').value = '';
    document.getElementById('shootDate').value = new Date().toISOString().slice(0,16);
    document.getElementById('shootPrice').value = '';
    document.getElementById('shootPay').value = 'impaye';
    document.getElementById('shootNotes').value = '';
  }

  onShootTypeChange();
  renderShootExpenses();
  document.getElementById('shootModalBg').classList.add('show');
}

function closeShootModal(){
  document.getElementById('shootModalBg').classList.remove('show');
  editingShootId = null;
  currentShootExpenses = [];
}

async function saveShoot(){
  const clientId = document.getElementById('shootClient').value;
  let type = document.getElementById('shootType').value;
  const location = document.getElementById('shootLocation').value.trim();
  const photo_count = parseInt(document.getElementById('shootPhotoCount').value) || 0;
  const date = document.getElementById('shootDate').value;
  const price = parseFloat(document.getElementById('shootPrice').value) || 0;
  const payment = document.getElementById('shootPay').value;
  const notes = document.getElementById('shootNotes').value.trim();

  if(!date){ alert("Date requise"); return; }

  if(type === 'Autre'){
    const custom = document.getElementById('shootCustomType').value.trim();
    if(custom) type = custom;
  }

  const clientObj = clientId && clientId !== '__new__' ? clients.find(c => c.id === parseInt(clientId)) : null;
  const clientName = clientObj ? clientObj.name : '';

  const shoot_expenses = currentShootExpenses
    .filter(e => e && e.amount && Number(e.amount) > 0)
    .map(e => ({ type: e.type, amount: Number(e.amount) }));

  const data = {
    client_id: clientId && clientId !== '__new__' ? parseInt(clientId) : null,
    type, location, photo_count, date, price, payment, notes,
    shoot_expenses
  };

  if(!editingShootId){
    data.status = 'planifie';
    data.status_updated_at = new Date().toISOString();
  }

  let savedShoot = null;
  if(editingShootId){
    const result = await dbUpdate('shoots', editingShootId, data);
    if(!result) return;
    const idx = shoots.findIndex(s => s.id === editingShootId);
    shoots[idx] = result;
    savedShoot = result;
  } else {
    const result = await dbInsert('shoots', data);
    if(!result) return;
    shoots.unshift(result);
    savedShoot = result;
  }

  if(shoot_expenses.length > 0 && savedShoot){
    const shootLabel = type + (clientName ? ' · ' + clientName : '');
    for(const exp of shoot_expenses){
      const txCharge = await dbInsert('transactions', {
        type: 'depense',
        amount: exp.amount,
        category: 'Business',
        note: exp.type + ' · ' + shootLabel,
        date: date.slice(0, 10),
        payment_method: 'Interne'
      });
      if(txCharge){
        txs.unshift(txCharge);
      }
    }
  }

  closeShootModal();
  refreshAll();
}

async function delShoot(id){
  if(!confirm("Supprimer ?")) return;
  const ok = await dbDelete('shoots', id);
  if(!ok) return;
  shoots = shoots.filter(s => s.id !== id);
  refreshAll();
}

// ============================================================
// PAIEMENT REÇU D'UNE SÉANCE
// ============================================================
function openPaiementSeance(shootId){
  const s = shoots.find(x => x.id === shootId);
  if(!s){ alert('Séance introuvable'); return; }

  const client = s.client_id ? clients.find(c => c.id === s.client_id) : null;
  const clientName = client ? client.name : '';

  const prix = Number(s.price || 0);
  const recu = Number(s.montant_recu || 0);
  const resteAPayer = Math.max(0, prix - recu);

  if(prix <= 0){
    alert('❌ Cette séance n\'a pas de prix défini.');
    return;
  }

  if(resteAPayer <= 0){
    alert(`✅ Cette séance est déjà entièrement payée.\n\nPrix : ${fmt(prix)}\nReçu : ${fmt(recu)}`);
    return;
  }

  const existing = document.getElementById('paiementSeanceModal');
  if(existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'modal-bg show';
  modal.id = 'paiementSeanceModal';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-wrap">
        <h3>💰 Paiement reçu</h3>
        <button class="close" onclick="fermerPaiementSeance()">×</button>
      </div>

      <div style="background:linear-gradient(135deg,rgba(52,211,153,.12),rgba(107,142,255,.06));border-radius:14px;padding:14px;margin-bottom:16px">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Séance</div>
        <div style="font-weight:700;font-size:15px;margin-bottom:10px">📸 ${s.type}${clientName ? ' · ' + clientName : ''}</div>

        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px">
          <span style="color:var(--muted)">Prix total client</span>
          <span style="font-weight:700">${fmt(prix)}</span>
        </div>
        ${recu > 0 ? `
          <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px">
            <span style="color:var(--muted)">Déjà reçu</span>
            <span style="color:var(--green);font-weight:700">${fmt(recu)}</span>
          </div>
        ` : ''}
        <div style="display:flex;justify-content:space-between;padding:10px 0 0;border-top:1px solid var(--border);margin-top:6px">
          <span style="font-weight:700;font-size:14px">⏳ Reste à payer</span>
          <span style="font-weight:800;font-size:18px;color:var(--yellow)">${fmt(resteAPayer)}</span>
        </div>
      </div>

      <label>Combien as-tu reçu ? (FCFA)</label>
      <input type="number" id="paiementMontant" inputmode="decimal" value="${resteAPayer}" placeholder="0" style="font-size:20px;font-weight:700;text-align:center;color:var(--green)">

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px">
        <button class="btn-ghost" style="margin:0;padding:8px;font-size:11px" onclick="document.getElementById('paiementMontant').value=${Math.round(prix*0.3)}">30%</button>
        <button class="btn-ghost" style="margin:0;padding:8px;font-size:11px" onclick="document.getElementById('paiementMontant').value=${Math.round(prix*0.5)}">50%</button>
        <button class="btn-ghost" style="margin:0;padding:8px;font-size:11px" onclick="document.getElementById('paiementMontant').value=${Math.round(prix*0.7)}">70%</button>
        <button class="btn-ghost" style="margin:0;padding:8px;font-size:11px;background:rgba(52,211,153,.10);color:var(--green);border-color:var(--green)" onclick="document.getElementById('paiementMontant').value=${resteAPayer}">Solde</button>
      </div>

      <label style="margin-top:16px">Mode de paiement</label>
      <select id="paiementMethod">
        <option value="Wave">💙 Wave</option>
        <option value="Espèces">💵 Espèces</option>
        <option value="Orange Money">🟠 Orange Money</option>
        <option value="MTN Money">🟡 MTN Money</option>
        <option value="Moov Money">🔵 Moov Money</option>
        <option value="Virement bancaire">🏦 Virement</option>
        <option value="Chèque">📝 Chèque</option>
      </select>

      <div style="background:linear-gradient(135deg,rgba(245,197,66,.12),rgba(245,197,66,.05));border:1px solid rgba(245,197,66,.25);border-radius:12px;padding:12px;margin-top:16px;font-size:12px;color:var(--gold-soft);line-height:1.5">
        💡 Une transaction "Revenu" sera créée dans ton historique, puis l'assistant de répartition te proposera d'épargner.
      </div>

      <button class="btn-primary" style="margin:0;margin-top:16px;width:100%;background:linear-gradient(135deg,var(--green),#10b981);color:#000;font-weight:800;padding:16px" onclick="validerPaiementSeance(${shootId})">
        ✅ Valider le paiement
      </button>
      <button class="btn-ghost" style="margin-top:8px;width:100%" onclick="fermerPaiementSeance()">
        Annuler
      </button>
    </div>
  `;
  document.body.appendChild(modal);
}

async function validerPaiementSeance(shootId){
  const s = shoots.find(x => x.id === shootId);
  if(!s){ alert('Séance introuvable'); return; }

  const montant = parseFloat(document.getElementById('paiementMontant')?.value) || 0;
  const method = document.getElementById('paiementMethod')?.value || 'Wave';

    if(!montant || montant <= 0){ alert('Indique un montant valide'); return; }

  // 🆕 Empêcher d'encaisser plus que le reste à payer
  const prixTotal = Number(s.price || 0);
  const dejaRecu = Number(s.montant_recu || 0);
  const resteAPayer = Math.max(0, prixTotal - dejaRecu);

  if(montant > resteAPayer){
    alert(`❌ Montant trop élevé.\n\nPrix total : ${fmt(prixTotal)}\nDéjà reçu : ${fmt(dejaRecu)}\nReste à payer : ${fmt(resteAPayer)}\n\nTu ne peux pas encaisser plus de ${fmt(resteAPayer)}.`);
    return;
  }

  const prix = Number(s.price || 0);
  const recuAvant = Number(s.montant_recu || 0);
  const nouveauRecu = recuAvant + montant;

  const client = s.client_id ? clients.find(c => c.id === s.client_id) : null;
  const clientName = client ? client.name : '';

  let montantType = 'acompte';
  if(nouveauRecu >= prix) montantType = 'complet';

  const noteLabel = (s.type || 'Séance') + (clientName ? ' · ' + clientName : '') + (montantType === 'acompte' ? ' (acompte)' : '');
  const txResult = await dbInsert('transactions', {
    type: 'revenu',
    amount: montant,
    category: 'Shooting photo',
    note: noteLabel,
    date: todayStr(),
    client_id: s.client_id || null,
    client_name: clientName || null,
    prestation_type: s.type || 'Séance',
    location: s.location || null,
    payment_method: method,
    amount_type: montantType,
    photo_count: s.photo_count || null
  });

  if(txResult){ txs.unshift(txResult); }

  const newPaymentStatus = nouveauRecu >= prix ? 'paye' : 'impaye';
  const upd = await dbUpdate('shoots', shootId, {
    montant_recu: nouveauRecu,
    payment: newPaymentStatus
  });

  if(upd){
    s.montant_recu = nouveauRecu;
    s.payment = newPaymentStatus;
  }

  fermerPaiementSeance();
  refreshAll();

  const reste = Math.max(0, prix - nouveauRecu);
  if(newPaymentStatus === 'paye'){
    showToast(`✅ Séance payée intégralement · ${fmt(nouveauRecu)}`);
  } else {
    showToast(`💰 ${fmt(montant)} reçu · reste ${fmt(reste)}`);
  }

  setTimeout(() => {
    demarrerAssistant({
      amount: montant,
      prestationType: s.type || 'Séance',
      clientName: clientName,
      location: s.location || '',
      source: 'Séance photo'
    });
  }, 500);
}

function fermerPaiementSeance(){
  const m = document.getElementById('paiementSeanceModal');
  if(m) m.remove();
}

function filterShoots(filter, btn){
  currentShootFilter = filter;
  document.querySelectorAll('.shoot-filter-btn').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderShoots();
}

async function updateShootStatuses(){
  const today = new Date();
  today.setHours(0,0,0,0);
  let hasChanges = false;

  for(const s of shoots){
    if(s.status === 'annule') continue;
    const shootDate = new Date(s.date);
    shootDate.setHours(0,0,0,0);
    const dayAfter = new Date(shootDate);
    dayAfter.setDate(dayAfter.getDate() + 1);

    if(today >= dayAfter && s.status !== 'shoote'){
      s.status = 'shoote';
      s.status_updated_at = new Date().toISOString();
      await dbUpdate('shoots', s.id, {status: 'shoote', status_updated_at: s.status_updated_at});
      hasChanges = true;
    } else if(today.getTime() === shootDate.getTime() && s.status !== 'encours'){
      s.status = 'encours';
      await dbUpdate('shoots', s.id, {status: 'encours'});
      hasChanges = true;
    }
  }

  if(hasChanges) renderShoots();
}

async function cancelShoot(id){
  const s = shoots.find(x => x.id === id);
  if(!s) return;
  const reason = prompt(`Annuler la séance "${s.type}" ?\n\nRaison (optionnel) :`, '');
  if(reason === null) return;

  const result = await dbUpdate('shoots', id, {
    status: 'annule',
    cancel_reason: reason.trim() || null,
    status_updated_at: new Date().toISOString()
  });
  if(!result) return;

  s.status = 'annule';
  s.cancel_reason = reason.trim() || null;
  refreshAll();
  showToast('Séance annulée');
}

async function reactivateShoot(id){
  const s = shoots.find(x => x.id === id);
  if(!s) return;
  if(!confirm('Réactiver cette séance ?')) return;

  const today = new Date();
  today.setHours(0,0,0,0);
  const shootDate = new Date(s.date);
  shootDate.setHours(0,0,0,0);
  const dayAfter = new Date(shootDate);
  dayAfter.setDate(dayAfter.getDate() + 1);

  let newStatus = 'planifie';
  if(today >= dayAfter) newStatus = 'shoote';
  else if(today.getTime() === shootDate.getTime()) newStatus = 'encours';

  const result = await dbUpdate('shoots', id, {
    status: newStatus,
    cancel_reason: null,
    status_updated_at: new Date().toISOString()
  });
  if(!result) return;

  s.status = newStatus;
  s.cancel_reason = null;
  refreshAll();
  showToast('Séance réactivée');
}

function renderShoots(){
  const el = document.getElementById('shootsList');
  if(!el) return;

  // ---- Stats du haut ----
  const statsEl = document.getElementById('shootStatsRow');
  if(statsEl){
    const planifies = shoots.filter(s => s.status === 'planifie' || s.status === 'encours').length;
    const shootes = shoots.filter(s => s.status === 'shoote').length;
    const annules = shoots.filter(s => s.status === 'annule').length;
    const clientsAnnules = new Set(shoots.filter(s => s.status === 'annule' && s.client_id).map(s => s.client_id)).size;

    statsEl.innerHTML = `
      <div class="shoot-stat-mini"><div class="num" style="color:var(--accent)">${planifies}</div><div class="lbl">📅 Planifiées</div></div>
      <div class="shoot-stat-mini"><div class="num" style="color:var(--green)">${shootes}</div><div class="lbl">✅ Shootées</div></div>
      <div class="shoot-stat-mini"><div class="num" style="color:var(--red)">${annules}</div><div class="lbl">❌ Annulées</div></div>
      <div class="shoot-stat-mini"><div class="num" style="color:var(--yellow)">${clientsAnnules}</div><div class="lbl">👤 Clients concernés</div></div>
    `;
  }

  // ---- Filtrer ----
  let list = [...shoots];

  // Filtre statut (boutons du haut)
  if(currentShootFilter !== 'all'){
    if(currentShootFilter === 'planifie'){
      list = list.filter(s => s.status === 'planifie' || s.status === 'encours');
    } else {
      list = list.filter(s => s.status === currentShootFilter);
    }
  }

  // 🆕 Filtre recherche
  const searchEl = document.getElementById('shootSearchInput');
  const search = (searchEl?.value || '').trim().toLowerCase();
  if(search){
    list = list.filter(s => {
      const client = s.client_id ? clients.find(c => c.id === s.client_id) : null;
      const haystack = [
        s.type, s.location, s.notes,
        client?.name, client?.phone, client?.city
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(search);
    });
  }

  // 🆕 Filtre mois
  const monthFilter = document.getElementById('shootMonthFilter')?.value || 'all';
  if(monthFilter !== 'all'){
    const now = new Date();
    const thisMonthKey = now.toISOString().slice(0, 7);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = lastMonth.toISOString().slice(0, 7);

    list = list.filter(s => {
      if(!s.date) return false;
      const key = s.date.slice(0, 7);
      if(monthFilter === 'this') return key === thisMonthKey;
      if(monthFilter === 'last') return key === lastMonthKey;
      if(monthFilter === 'year') return s.date.startsWith(now.getFullYear().toString());
      if(monthFilter === '3m'){
        const sDate = new Date(s.date);
        const diff = (now - sDate) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 90;
      }
      return true;
    });
  }

  // 🆕 Filtre prix min
  const minPriceEl = document.getElementById('shootMinPrice');
  const minPrice = minPriceEl ? parseFloat(minPriceEl.value) : NaN;
  if(!isNaN(minPrice) && minPrice > 0){
    list = list.filter(s => Number(s.price || 0) >= minPrice);
  }

  // 🆕 Filtre prix max
  const maxPriceEl = document.getElementById('shootMaxPrice');
  const maxPrice = maxPriceEl ? parseFloat(maxPriceEl.value) : NaN;
  if(!isNaN(maxPrice) && maxPrice > 0){
    list = list.filter(s => Number(s.price || 0) <= maxPrice);
  }

  // 🆕 Tri
  const sortFilter = document.getElementById('shootSortFilter')?.value || 'date-desc';
  list.sort((a, b) => {
    switch(sortFilter){
      case 'date-desc': return (b.date || '').localeCompare(a.date || '');
      case 'date-asc': return (a.date || '').localeCompare(b.date || '');
      case 'price-desc': return Number(b.price || 0) - Number(a.price || 0);
      case 'price-asc': return Number(a.price || 0) - Number(b.price || 0);
      case 'paid-desc': return Number(b.montant_recu || 0) - Number(a.montant_recu || 0);
      case 'rest-desc': {
        const restA = Math.max(0, Number(a.price || 0) - Number(a.montant_recu || 0));
        const restB = Math.max(0, Number(b.price || 0) - Number(b.montant_recu || 0));
        return restB - restA;
      }
      case 'name-asc': {
        const ca = a.client_id ? clients.find(c => c.id === a.client_id)?.name || '' : '';
        const cb = b.client_id ? clients.find(c => c.id === b.client_id)?.name || '' : '';
        return ca.localeCompare(cb);
      }
      case 'name-desc': {
        const ca = a.client_id ? clients.find(c => c.id === a.client_id)?.name || '' : '';
        const cb = b.client_id ? clients.find(c => c.id === b.client_id)?.name || '' : '';
        return cb.localeCompare(ca);
      }
      default: return (b.date || '').localeCompare(a.date || '');
    }
  });

  // 🆕 Résumé filtres
  const summaryEl = document.getElementById('shootFiltersSummary');
  if(summaryEl){
    const totalBase = shoots.length;
    const totalFiltre = list.length;
    if(totalFiltre === totalBase){
      summaryEl.textContent = `${totalFiltre} séance${totalFiltre > 1 ? 's' : ''} au total`;
    } else {
      summaryEl.textContent = `${totalFiltre} séance${totalFiltre > 1 ? 's' : ''} affichée${totalFiltre > 1 ? 's' : ''} sur ${totalBase}`;
    }
  }

  if(list.length === 0){ 
    el.innerHTML = '<div class="empty">Aucune séance ne correspond à ces filtres</div>'; 
    return; 
  }

  const statusInfo = {
    'planifie': { label: '📅 Planifié', class: 'planifie' },
    'encours':  { label: '🟠 En cours',  class: 'encours' },
    'shoote':   { label: '✅ Shooté',    class: 'shoote' },
    'annule':   { label: '❌ Annulé',    class: 'annule' }
  };

  el.innerHTML = list.map(s => {
    const client = s.client_id ? clients.find(c => c.id === s.client_id) : null;
    const d = new Date(s.date);
    const dStr = d.toLocaleDateString('fr-FR', {day:'2-digit', month:'short', year:'numeric'}) + ' à ' + d.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
    const locInfo = s.location ? `📍 ${s.location}` : '';
    const photoInfo = s.photo_count ? `📷 ${s.photo_count} photos` : '';
    const metaInfo = [locInfo, photoInfo].filter(x => x).join(' · ');

    const prix = Number(s.price || 0);
    const recu = Number(s.montant_recu || 0);
    const charges = (s.shoot_expenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const reparti = Number(s.montant_reparti || 0);
    const resteAPayerClient = Math.max(0, prix - recu);
    const netEncaisse = recu - charges;
    const disponible = Math.max(0, netEncaisse - reparti);

    let financeBlock = '';
    if(prix > 0){
      financeBlock = `
        <div style="background:var(--card);border-radius:10px;padding:10px 12px;margin-top:10px;border:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px">
            <span style="color:var(--muted)">💵 Prix client</span>
            <span style="font-weight:700">${fmt(prix)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px">
            <span style="color:var(--muted)">✅ Reçu</span>
            <span style="color:${recu > 0 ? 'var(--green)' : 'var(--muted)'};font-weight:700">${fmt(recu)}</span>
          </div>
          ${resteAPayerClient > 0 ? `
            <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px">
              <span style="color:var(--muted)">⏳ Reste à payer client</span>
              <span style="color:var(--yellow);font-weight:700">${fmt(resteAPayerClient)}</span>
            </div>
          ` : ''}
          ${charges > 0 ? `
            <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px">
              <span style="color:var(--muted)">💸 Charges</span>
              <span style="color:var(--red);font-weight:700">-${fmt(charges)}</span>
            </div>
          ` : ''}
          ${reparti > 0 ? `
            <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px">
              <span style="color:var(--muted)">💰 Déjà réparti</span>
              <span style="color:var(--accent);font-weight:700">-${fmt(reparti)}</span>
            </div>
          ` : ''}
          ${disponible > 0 ? `
            <div style="display:flex;justify-content:space-between;padding:6px 0 0;border-top:1px solid var(--border);margin-top:4px;font-size:13px">
              <span style="font-weight:700">🎯 Disponible à répartir</span>
              <span style="color:var(--green);font-weight:800">${fmt(disponible)}</span>
            </div>
          ` : `
            ${reparti > 0 ? `
              <div style="text-align:center;padding:6px 0 0;border-top:1px solid var(--border);margin-top:4px;font-size:11px;color:var(--green);font-weight:700">
                ✅ Tout est réparti
              </div>
            ` : ''}
          `}
        </div>
      `;
    }

    const stat = statusInfo[s.status] || statusInfo['planifie'];
    const isCancelled = s.status === 'annule';
    const isDone = s.status === 'shoote';
    const itemClass = isCancelled ? 'cancelled' : (isDone ? 'done' : '');

    let paymentBadge = '';
    if(!isCancelled && prix > 0){
      if(recu <= 0){
        paymentBadge = `<span class="badge impaye">Impayé</span>`;
      } else if(recu >= prix){
        paymentBadge = `<span class="badge paye">Payé</span>`;
      } else {
        paymentBadge = `<span class="badge" style="background:var(--yellow);color:#000">Acompte</span>`;
      }
    }

    let actionButtons = '';
    if(isCancelled){
      actionButtons = `
        <button class="btn-ghost" style="margin:0;padding:6px;background:rgba(46,204,113,.15);color:var(--green);border-color:var(--green);flex:1" onclick="reactivateShoot(${s.id})">🔄 Réactiver</button>
        <button class="btn-ghost" style="margin:0;padding:6px" onclick="openShootModal(${s.id})" title="Modifier">✏️</button>
        <button class="btn-ghost" style="margin:0;padding:6px;border-color:var(--red);color:var(--red)" onclick="delShoot(${s.id})" title="Supprimer">🗑</button>
      `;
    } else {
      const canPay = prix > 0 && resteAPayerClient > 0;
      const canRepartir = disponible > 0;

      actionButtons = `
        ${canPay ? `
          <button class="btn-primary" style="margin:0;padding:8px;background:linear-gradient(135deg,var(--green),#10b981);flex:1;font-weight:700;font-size:12px" onclick="openPaiementSeance(${s.id})">
            💰 Paiement reçu
          </button>
        ` : `
          <button class="btn-ghost" style="margin:0;padding:8px;background:rgba(52,211,153,.10);color:var(--green);border-color:var(--green);flex:1;font-weight:700;font-size:12px;opacity:0.7;cursor:default">
            ✅ Payé intégralement
          </button>
        `}
        ${canRepartir ? `
          <button class="btn-ghost" style="margin:0;padding:8px;background:linear-gradient(135deg,rgba(107,142,255,.15),rgba(52,211,153,.10));color:var(--accent);border-color:var(--accent);font-weight:700;font-size:12px" onclick="ouvrirRepartitionSeance(${s.id})" title="Répartir vers un objectif">💰 Répartir</button>
        ` : `
          ${reparti > 0 ? `
            <button class="btn-ghost" style="margin:0;padding:8px;background:rgba(52,211,153,.08);color:var(--green);border-color:var(--green);font-weight:700;font-size:12px;opacity:0.7;cursor:default" title="Tout est réparti">✅ Réparti</button>
          ` : ''}
        `}
        ${s.payment === 'impaye' && resteAPayerClient > 0 ? `<button class="btn-ghost" style="margin:0;padding:6px;border-color:var(--wave);color:var(--wave)" onclick="genererLienPaiementClient(${s.id})" title="Envoyer lien de paiement">📤 Lien</button>` : ''}
        <button class="btn-ghost" style="margin:0;padding:6px" onclick="openShootModal(${s.id})" title="Modifier">✏️</button>
        <button class="btn-ghost shoot-cancel-btn" style="margin:0;padding:6px" onclick="cancelShoot(${s.id})" title="Annuler">🚫</button>
        <button class="btn-ghost" style="margin:0;padding:6px;border-color:var(--red);color:var(--red)" onclick="delShoot(${s.id})" title="Supprimer">🗑</button>
      `;
    }

    return `<div class="item-card ${itemClass}">
      <div class="head">
        <div class="name">📸 ${s.type}${client ? ' · ' + client.name : ''}</div>
        <div class="shoot-badges">
          <span class="shoot-status ${stat.class}">${stat.label}</span>
          ${paymentBadge}
        </div>
      </div>
      <div class="amt">
        <span>📅 ${dStr}</span>
        <span style="color:var(--green);font-weight:600">${fmt(s.price)}</span>
      </div>
      ${metaInfo ? `<div style="font-size:12px;color:var(--muted);margin-top:6px">${metaInfo}</div>` : ''}
      ${financeBlock}
      ${isCancelled && s.cancel_reason ? `<div style="font-size:12px;color:var(--red);margin-top:6px;font-style:italic">❌ Raison : ${s.cancel_reason}</div>` : ''}
      ${s.notes ? `<div style="font-size:12px;color:var(--muted);margin-top:4px">${s.notes}</div>` : ''}
      <div class="actions" style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">${actionButtons}</div>
    </div>`;
  }).join('');
}

// ---- Réinitialiser les filtres ----
function resetShootFilters(){
  const search = document.getElementById('shootSearchInput');
  const month = document.getElementById('shootMonthFilter');
  const sort = document.getElementById('shootSortFilter');
  const minP = document.getElementById('shootMinPrice');
  const maxP = document.getElementById('shootMaxPrice');
  
  if(search) search.value = '';
  if(month) month.value = 'all';
  if(sort) sort.value = 'date-desc';
  if(minP) minP.value = '';
  if(maxP) maxP.value = '';
  
  // Reset aussi les boutons de statut
  currentShootFilter = 'all';
  document.querySelectorAll('.shoot-filter-btn').forEach(b => b.classList.remove('active'));
  const allBtn = document.querySelector('.shoot-filter-btn[data-filter="all"]');
  if(allBtn) allBtn.classList.add('active');
  
  renderShoots();
  showToast('Filtres réinitialisés');
}

// ============================================================
// CRÉATION RAPIDE DE CLIENT DEPUIS LA MODALE SÉANCE
// ============================================================
function onShootClientChange(){
  const sel = document.getElementById('shootClient');
  const wrap = document.getElementById('shootNewClientWrap');
  if(!sel || !wrap) return;

  if(sel.value === '__new__'){
    wrap.style.display = 'block';
    const dl = document.getElementById('shootNewClientCityList');
    if(dl && typeof VILLES_CI !== 'undefined'){
      dl.innerHTML = VILLES_CI.map(v => `<option value="${v}">`).join('');
    }
    setTimeout(() => document.getElementById('shootNewClientName')?.focus(), 150);
  } else {
    wrap.style.display = 'none';
  }
}

function annulerNouveauClientShoot(){
  const sel = document.getElementById('shootClient');
  const wrap = document.getElementById('shootNewClientWrap');
  if(sel) sel.value = '';
  if(wrap) wrap.style.display = 'none';
  const nameEl = document.getElementById('shootNewClientName');
  const phoneEl = document.getElementById('shootNewClientPhone');
  const cityEl = document.getElementById('shootNewClientCity');
  if(nameEl) nameEl.value = '';
  if(phoneEl) phoneEl.value = '';
  if(cityEl) cityEl.value = '';
}

async function sauverNouveauClientShoot(){
  const name = (document.getElementById('shootNewClientName')?.value || '').trim();
  const phone = (document.getElementById('shootNewClientPhone')?.value || '').trim();
  const city = (document.getElementById('shootNewClientCity')?.value || '').trim();

  if(!name){
    alert('Le nom du client est requis');
    document.getElementById('shootNewClientName')?.focus();
    return;
  }

  const result = await dbInsert('clients', {
    name, phone: phone || null, email: null, city: city || null, notes: null
  });

  if(!result) return;

  clients.unshift(result);

  const sel = document.getElementById('shootClient');
  if(sel){
    sel.innerHTML = '<option value="">-- Choisir --</option>'
      + clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('')
      + '<option value="__new__" style="color:var(--green);font-weight:700">➕ Créer un nouveau client</option>';
    sel.value = result.id;
  }

  const wrap = document.getElementById('shootNewClientWrap');
  if(wrap) wrap.style.display = 'none';

  document.getElementById('shootNewClientName').value = '';
  document.getElementById('shootNewClientPhone').value = '';
  document.getElementById('shootNewClientCity').value = '';

  if(typeof renderClients === 'function') renderClients();
  if(typeof refreshAll === 'function') refreshAll();

  showToast('✅ Client créé : ' + result.name);
}

// ============================================================
// GESTION DES CHARGES DE SÉANCE
// ============================================================
const CHARGES_PRESETS = [
  { icon: '🎨', label: 'Makeup' },
  { icon: '🚗', label: 'Transport' },
  { icon: '📷', label: 'Location matériel' },
  { icon: '👤', label: 'Assistant' },
  { icon: '🏠', label: 'Location lieu' },
  { icon: '🍽️', label: 'Repas' },
  { icon: '🎁', label: 'Cadeau client' },
  { icon: '✏️', label: 'Autre' }
];

function renderShootExpenses(){
  const el = document.getElementById('shootExpensesList');
  if(!el) return;

  if(!currentShootExpenses || currentShootExpenses.length === 0){
    el.innerHTML = '<div style="font-size:12px;color:var(--muted);text-align:center;padding:8px;background:var(--card2);border-radius:10px">Aucune charge ajoutée</div>';
    calculerNetShoot();
    return;
  }

  el.innerHTML = currentShootExpenses.map((exp, idx) => `
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;background:var(--card2);padding:8px;border-radius:10px">
      <select onchange="updateChargeType(${idx}, this.value)" style="flex:0 0 100px;font-size:12px;padding:6px">
        ${CHARGES_PRESETS.map(p => `<option value="${p.label}" ${exp.type === p.label ? 'selected' : ''}>${p.icon} ${p.label}</option>`).join('')}
      </select>
      <input type="number" value="${exp.amount || ''}" placeholder="0" inputmode="decimal"
        oninput="updateChargeAmount(${idx}, this.value)"
        style="flex:1;font-size:13px;padding:6px;text-align:right;font-weight:600">
      <span style="font-size:11px;color:var(--muted);flex-shrink:0">FCFA</span>
      <button type="button" onclick="supprimerChargeShoot(${idx})"
        style="width:auto;padding:6px 10px;margin:0;background:transparent;border:1px solid var(--red);color:var(--red);border-radius:8px;font-size:14px;cursor:pointer">×</button>
    </div>
  `).join('');

  calculerNetShoot();
}

function ajouterChargeShoot(){
  currentShootExpenses.push({ type: 'Makeup', amount: 0 });
  renderShootExpenses();
}

function updateChargeType(idx, type){
  if(currentShootExpenses[idx]){
    currentShootExpenses[idx].type = type;
    calculerNetShoot();
  }
}

function updateChargeAmount(idx, val){
  if(currentShootExpenses[idx]){
    currentShootExpenses[idx].amount = parseFloat(val) || 0;
    calculerNetShoot();
  }
}

function supprimerChargeShoot(idx){
  currentShootExpenses.splice(idx, 1);
  renderShootExpenses();
}

function calculerNetShoot(){
  const price = parseFloat(document.getElementById('shootPrice')?.value) || 0;
  const totalCharges = (currentShootExpenses || []).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const net = price - totalCharges;

  const summary = document.getElementById('shootNetSummary');
  const priceEl = document.getElementById('shootNetPrice');
  const chargesEl = document.getElementById('shootNetCharges');
  const resultEl = document.getElementById('shootNetResult');

  if(!summary) return;

  if(price > 0 || totalCharges > 0){
    summary.style.display = 'block';
    if(priceEl) priceEl.textContent = fmt(price);
    if(chargesEl) chargesEl.textContent = '-' + fmt(totalCharges);
    if(resultEl){
      resultEl.textContent = fmt(net);
      resultEl.style.color = net >= 0 ? 'var(--green)' : 'var(--red)';
    }
  } else {
    summary.style.display = 'none';
  }
}

function renderPhotoStats(){
  const el = document.getElementById('photoMonthCount');
  if(!el) return;

  const ym = monthKey();
  const monthShoots = shoots.filter(s => s.date && s.date.startsWith(ym));

  // 💰 Revenus = montant RÉELLEMENT reçu (acomptes inclus)
  const revenue = monthShoots.reduce((sum, s) => sum + Number(s.montant_recu || 0), 0);

  // ⏳ À encaisser = reste à payer sur TOUTES les séances non soldées
  const pending = shoots
    .filter(s => s.status !== 'annule')
    .reduce((sum, s) => {
      const prix = Number(s.price || 0);
      const recu = Number(s.montant_recu || 0);
      return sum + Math.max(0, prix - recu);
    }, 0);

  document.getElementById('photoMonthCount').textContent = monthShoots.length;
  document.getElementById('photoMonthRevenue').textContent = fmt(revenue);
  document.getElementById('photoPending').textContent = fmt(pending);
}

// ============================================================
// DASHBOARD
// ============================================================
function renderOverview(){
  const ym = monthKey();
  const monthShoots = shoots.filter(s => s.date && s.date.startsWith(ym));
    const revenue = monthShoots.reduce((sum, s) => sum + Number(s.montant_recu || 0), 0);
  const pending = shoots
    .filter(s => s.status !== 'annule')
    .reduce((sum, s) => {
      const prix = Number(s.price || 0);
      const recu = Number(s.montant_recu || 0);
      return sum + Math.max(0, prix - recu);
    }, 0);

  const cEl = document.getElementById('overviewClients');
  const sEl = document.getElementById('overviewShoots');
  const rEl = document.getElementById('overviewPhotoRev');
  const pEl = document.getElementById('overviewPending');
  if(cEl) cEl.textContent = clients.length;
  if(sEl) sEl.textContent = monthShoots.length;
  if(rEl) rEl.textContent = fmt(revenue);
  if(pEl) pEl.textContent = fmt(pending);
}

function computeHealthScore(){
  const s = computeStats();
  let score = 50;

  if(s.totalIn > 0){
    const rate = s.savingsRate;
    if(rate >= 0.30) score += 30;
    else if(rate >= 0.20) score += 20;
    else if(rate >= 0.10) score += 10;
    else if(rate < 0) score -= 20;
  }

  if(coffres.length > 0) score += 10;
  if(shoots.some(s => s.payment === 'paye')) score += 10;
  if(clients.length >= 3) score += 10;

  const pendingTotal = shoots.filter(s => s.payment === 'impaye').reduce((a,b) => a + Number(b.price), 0);
  if(pendingTotal > 0 && s.totalIn > 0 && pendingTotal > s.totalIn * 0.5) score -= 15;

  return Math.max(0, Math.min(100, score));
}

function renderHealthScore(){
  const score = computeHealthScore();
  const el = document.getElementById('healthScore');
  const title = document.getElementById('healthTitle');
  const text = document.getElementById('healthText');
  if(!el) return;

  let color = 'var(--accent)';
  if(score >= 75) color = 'var(--green)';
  else if(score >= 50) color = 'var(--yellow)';
  else color = 'var(--red)';

  el.style.background = `conic-gradient(${color} 0% ${score}%, var(--card2) ${score}% 100%)`;
  el.innerHTML = `<span>${score}</span>`;

  if(title && text){
    if(score >= 75){ title.textContent = '🌟 Excellente santé'; text.textContent = 'Continue !'; }
    else if(score >= 50){ title.textContent = '👍 Bonne santé'; text.textContent = 'Quelques ajustements.'; }
    else { title.textContent = '⚠ À améliorer'; text.textContent = 'Concentre-toi sur l\'épargne.'; }
  }
}

function renderRevDepDonut(){
  const s = computeStats();
  const total = s.totalIn + s.totalOut;
  const donut = document.getElementById('donutRevDep');
  const centerText = document.getElementById('donutRevDepText');
  const legend = document.getElementById('legendRevDep');
  if(!donut) return;

  if(total === 0){
    donut.style.background = 'conic-gradient(var(--card2) 0% 100%)';
    if(centerText) centerText.textContent = '--';
    if(legend) legend.innerHTML = '<div class="empty" style="padding:0">Aucune donnée</div>';
    return;
  }

  const pctIn = (s.totalIn / total) * 100;
  donut.style.background = `conic-gradient(var(--green) 0% ${pctIn}%, var(--red) ${pctIn}% 100%)`;
  if(centerText) centerText.innerHTML = `<div><div style="font-size:14px">${Math.round(pctIn)}%</div><div style="font-size:9px;color:var(--muted)">Revenus</div></div>`;

  if(legend) legend.innerHTML = `
    <div class="legend-item"><div class="legend-dot" style="background:var(--green)"></div><div class="legend-label">Revenus</div><div class="legend-value" style="color:var(--green)">${fmt(s.totalIn)}</div></div>
    <div class="legend-item"><div class="legend-dot" style="background:var(--red)"></div><div class="legend-label">Dépenses</div><div class="legend-value" style="color:var(--red)">${fmt(s.totalOut)}</div></div>`;
}

function renderShootTypesChart(){
  const el = document.getElementById('shootTypesChart');
  if(!el) return;
  if(shoots.length === 0){ el.innerHTML = '<div class="empty">Aucune séance enregistrée</div>'; return; }

  const byType = {};
  shoots.forEach(s => { byType[s.type] = (byType[s.type] || 0) + 1; });
  const entries = Object.entries(byType).sort((a,b) => b[1] - a[1]);
  const total = shoots.length;

  el.innerHTML = entries.map(([type, count]) => {
    const pct = (count / total) * 100;
    return `<div class="cat-row"><div class="top"><span>📸 ${type}</span><span>${count} · ${pct.toFixed(0)}%</span></div><div class="bar"><div style="width:${pct}%;background:var(--pink)"></div></div></div>`;
  }).join('');
}

function renderBars6m(){
  const el = document.getElementById('bars6m');
  if(!el) return;

  const now = new Date();
  const months = [];
  for(let i = 5; i >= 0; i--){
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toISOString().slice(0,7);
    const label = d.toLocaleDateString('fr-FR', {month:'short'});
    const total = txs.filter(t => t.type === 'revenu' && t.date.startsWith(key)).reduce((a,b) => a + Number(b.amount), 0);
    months.push({ label, total });
  }

  const max = Math.max(...months.map(m => m.total), 1);
  el.innerHTML = months.map(m => {
    const height = (m.total / max) * 100;
    return `<div class="bar-6m"><div class="bar-value">${m.total > 0 ? Math.round(m.total/1000)+'k' : '0'}</div><div class="bar-fill" style="height:${height}%"></div><div class="bar-label">${m.label}</div></div>`;
  }).join('');
}

function renderSuggestions(){
  const el = document.getElementById('suggestions');
  if(!el) return;

  const s = computeStats();
  const suggestions = [];

  if(s.totalIn > 0 && s.savingsRate < SAVINGS_TARGET){
    const missing = (s.totalIn * SAVINGS_TARGET) - (s.totalIn * s.savingsRate);
    suggestions.push({icon:'💰', title:'Augmente ton épargne', body:`Encore ${fmt(missing)}.`});
  }
  const pending = shoots.filter(s => s.payment === 'impaye').reduce((a,b) => a + Number(b.price), 0);
  if(pending > 0) suggestions.push({icon:'📞', title:'Relance tes clients', body:`${fmt(pending)} à encaisser.`});
  if(clients.length === 0) suggestions.push({icon:'👥', title:'Ajoute tes clients', body:'Commence par tes clients.'});
  if(coffres.length === 0) suggestions.push({icon:'🎯', title:'Crée un objectif', body:'50 000 FCFA pour commencer.'});

  if(suggestions.length === 0){ el.innerHTML = '<div class="empty">Tout est en ordre ! 🎉</div>'; return; }

  el.innerHTML = suggestions.slice(0, 5).map(sg => `<div class="suggestion"><div class="icon">${sg.icon}</div><div class="title">${sg.title}</div><div class="body">${sg.body}</div></div>`).join('');
}

// ============================================================
// HISTORIQUE
// ============================================================
let selectedTxIds = new Set();

function populateHistFilters(){
  const monthSelect = document.getElementById('histMonth');
  const catSelect = document.getElementById('histCategory');
  if(!monthSelect || !catSelect) return;

  const months = [...new Set(txs.map(t => t.date.slice(0,7)))].sort().reverse();
  const previousMonth = monthSelect.value;
  monthSelect.innerHTML = '<option value="all">Tous les mois</option>' + months.map(m => {
    const [y, mo] = m.split('-');
    const label = new Date(y, mo-1, 1).toLocaleDateString('fr-FR', {month:'long', year:'numeric'});
    return `<option value="${m}">${label}</option>`;
  }).join('');
  if(previousMonth && [...monthSelect.options].some(o => o.value === previousMonth)) monthSelect.value = previousMonth;

  const cats = [...new Set(txs.map(t => t.category))].sort();
  const previousCat = catSelect.value;
  catSelect.innerHTML = '<option value="all">Toutes les catégories</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
  if(previousCat && [...catSelect.options].some(o => o.value === previousCat)) catSelect.value = previousCat;
}

// ---- Réinitialiser les filtres de date (historique) ----
function resetHistDates(){
  const from = document.getElementById('histDateFrom');
  const to = document.getElementById('histDateTo');
  if(from) from.value = '';
  if(to) to.value = '';
  renderHistory();
  showToast('Dates effacées');
}
function getFilteredTx(){
  const monthEl = document.getElementById('histMonth');
  const typeEl = document.getElementById('histType');
  const catEl = document.getElementById('histCategory');
  const searchEl = document.getElementById('histSearch');
  const sortEl = document.getElementById('histSort');
  const dateFromEl = document.getElementById('histDateFrom');
  const dateToEl = document.getElementById('histDateTo');
  if(!monthEl || !typeEl || !catEl) return [];

  const month = monthEl.value;
  const type = typeEl.value;
  const cat = catEl.value;
  const search = (searchEl?.value || '').trim().toLowerCase();
  const sort = sortEl?.value || 'date-desc';
  const dateFrom = dateFromEl?.value || '';
  const dateTo = dateToEl?.value || '';

  let filtered = txs.filter(t => {
    if(month !== 'all' && !t.date.startsWith(month)) return false;
    if(type !== 'all' && t.type !== type) return false;
    if(cat !== 'all' && t.category !== cat) return false;
    if(dateFrom && t.date < dateFrom) return false;
    if(dateTo && t.date > dateTo) return false;
    if(search){
      const haystack = [
        t.category,
        t.note,
        t.client_name,
        t.prestation_type,
        t.location,
        t.payment_method
      ].filter(Boolean).join(' ').toLowerCase();
      if(!haystack.includes(search)) return false;
    }
    return true;
  });

  // Tri
  filtered.sort((a, b) => {
    switch(sort){
      case 'date-asc':
        return (a.date || '').localeCompare(b.date || '');
      case 'amount-desc':
        return Number(b.amount || 0) - Number(a.amount || 0);
      case 'amount-asc':
        return Number(a.amount || 0) - Number(b.amount || 0);
      case 'type':
        if(a.type !== b.type) return a.type === 'revenu' ? -1 : 1;
        return (b.date || '').localeCompare(a.date || '');
      case 'date-desc':
      default:
        return (b.date || '').localeCompare(a.date || '');
    }
  });

  return filtered;
}
function renderHistory(){
  const filtered = getFilteredTx();
  const totalIn = filtered.filter(t => t.type === 'revenu').reduce((s,t) => s + Number(t.amount), 0);
  const totalOut = filtered.filter(t => t.type === 'depense').reduce((s,t) => s + Number(t.amount), 0);

  const cEl = document.getElementById('histCount');
  const iEl = document.getElementById('histIn');
  const oEl = document.getElementById('histOut');
  if(cEl) cEl.textContent = filtered.length;
  if(iEl) iEl.textContent = fmt(totalIn);
  if(oEl) oEl.textContent = fmt(totalOut);

  const el = document.getElementById('histList');
  if(!el) return;
  if(filtered.length === 0){
    el.innerHTML = '<div class="empty">Aucune transaction</div>';
    const selAll = document.getElementById('histSelectAll');
    if(selAll) selAll.checked = false;
    return;
  }

  el.innerHTML = filtered.map(t => {
        const dateObj = new Date(t.created_at || t.date);
    const d = dateObj.toLocaleDateString('fr-FR', {day:'2-digit', month:'short', year:'numeric'}) + ' à ' + dateObj.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
    const sign = t.type === 'revenu' ? '+' : '-';
    const cls = t.type === 'revenu' ? 'pos' : 'neg';
    const checked = selectedTxIds.has(t.id) ? 'checked' : '';
    const isCancelled = !!t.cancelled;

    const details = [];
    if(t.client_name) details.push('👤 ' + t.client_name);
    if(t.prestation_type) details.push('📸 ' + t.prestation_type);
    if(t.payment_method) details.push('💳 ' + t.payment_method);
    if(t.location) details.push('📍 ' + t.location);
    if(t.photo_count) details.push('📷 ' + t.photo_count);
    if(t.amount_type && t.amount_type !== 'complet') details.push('💰 ' + (t.amount_type === 'acompte' ? 'Acompte' : 'Solde'));

    return `<div class="hist-item ${isCancelled ? 'cancelled' : ''}" onclick="ouvrirDetailTx(${t.id}, event)" style="cursor:pointer; ${isCancelled ? 'opacity:0.5;' : ''}">
      <input type="checkbox" class="hist-check" data-id="${t.id}" ${checked} onchange="toggleTxSelect(${t.id}, this.checked); event.stopPropagation();">
      <div class="hist-content">
        <div class="hist-top">
          <span class="hist-cat" style="${isCancelled ? 'text-decoration:line-through;' : ''}">${t.category}${isCancelled ? ' <span style="font-size:10px;color:var(--red);font-weight:700">ANNULÉE</span>' : ''}</span>
          <span class="hist-amt ${cls}" style="${isCancelled ? 'text-decoration:line-through;' : ''}">${sign}${fmt(t.amount)}</span>
        </div>
        <div class="hist-bottom">${d}${t.note ? ' · ' + t.note : ''}</div>
        ${details.length > 0 ? `<div style="font-size:11px;color:var(--accent);margin-top:3px">${details.join(' · ')}</div>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:4px">
        ${isCancelled
          ? `<button class="hist-del" style="color:var(--green)" onclick="event.stopPropagation();restaurerTx(${t.id})" title="Restaurer">↺</button>`
          : `<button class="hist-del" onclick="event.stopPropagation();annulerTx(${t.id})" title="Annuler">🚫</button>`
        }
        <span style="color:var(--muted);font-size:18px">›</span>
      </div>
    </div>`;
  }).join('');
}

function ouvrirDetailTx(txId, event){
  if(event) event.stopPropagation();
  const t = txs.find(x => x.id === txId);
  if(!t){ alert('Transaction introuvable'); return; }

  const existing = document.getElementById('detailTxModal');
  if(existing) existing.remove();

  const isRevenu = t.type === 'revenu';
  const sign = isRevenu ? '+' : '-';
  const color = isRevenu ? 'var(--green)' : 'var(--red)';
    const dateObj = new Date(t.created_at || t.date);
  const dateStr = dateObj.toLocaleDateString('fr-FR', {weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'}) + ' à ' + dateObj.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit', second:'2-digit'});

  const details = [];
  if(t.client_name) details.push(['👤 Client', t.client_name]);
  if(t.prestation_type) details.push(['📸 Prestation', t.prestation_type]);
  if(t.payment_method) details.push(['💳 Mode de paiement', t.payment_method]);
  if(t.location) details.push(['📍 Lieu', t.location]);
  if(t.photo_count) details.push(['📷 Nombre de photos', t.photo_count + ' photos']);
  if(t.duration_hours) details.push(['⏱ Durée', t.duration_hours + 'h']);
  if(t.amount_type){
    const labels = {complet: 'Complet', acompte: 'Acompte', solde: 'Solde restant'};
    details.push(['💰 Type de paiement', labels[t.amount_type] || t.amount_type]);
  }
  if(t.details) details.push(['📝 Détails', t.details]);

  const modal = document.createElement('div');
  modal.className = 'modal-bg show';
  modal.id = 'detailTxModal';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-wrap">
        <h3>📋 Détail de la transaction</h3>
        <button class="close" onclick="fermerDetailTx()">×</button>
      </div>

      <div style="background:linear-gradient(135deg,rgba(52,211,153,.12),rgba(107,142,255,.06));border-radius:14px;padding:18px;margin-bottom:16px;text-align:center">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px">${isRevenu ? 'Revenu' : 'Dépense'}</div>
        <div style="font-size:32px;font-weight:800;color:${color};letter-spacing:-1px">${sign}${fmt(t.amount)}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:6px">${dateStr}</div>
      </div>

      <div style="background:var(--card2);border-radius:12px;padding:14px;margin-bottom:12px">
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Catégorie</div>
        <div style="font-weight:700;font-size:15px">${t.category || 'Non spécifiée'}</div>
      </div>

      ${t.note ? `
        <div style="background:var(--card2);border-radius:12px;padding:14px;margin-bottom:12px">
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Note</div>
          <div style="font-size:14px;line-height:1.5">${t.note}</div>
        </div>
      ` : ''}

      ${details.length > 0 ? `
        <div style="background:var(--card2);border-radius:12px;padding:14px;margin-bottom:12px">
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Détails</div>
          ${details.map(([label, value]) => `
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px">
              <span style="color:var(--muted)">${label}</span>
              <span style="font-weight:600;text-align:right;max-width:60%">${value}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div style="background:var(--card2);border-radius:12px;padding:14px;margin-bottom:16px">
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Référence</div>
        <div style="font-family:monospace;font-size:12px;color:var(--accent)">TX-${String(t.id).padStart(5, '0')}</div>
      </div>

      <div style="display:grid;gap:8px">
        ${t.client_id ? `
          <button class="btn-ghost" style="margin:0;width:100%" onclick="fermerDetailTx(); showTab('photo', null);">
            👤 Voir ce client dans Photo
          </button>
        ` : ''}
        <button class="btn-ghost" style="margin:0;width:100%;border-color:var(--yellow);color:var(--yellow)" onclick="fermerDetailTx(); setTimeout(() => resetTx(${t.id}), 200);">
          ↺ Remettre le montant à 0
        </button>
        ${t.cancelled
          ? `<button class="btn-primary" style="margin:0;width:100%;background:linear-gradient(135deg,var(--green),#10b981);color:#000" onclick="fermerDetailTx(); setTimeout(() => restaurerTx(${t.id}), 200);">
              ↺ Restaurer cette transaction
            </button>`
          : `<button class="btn-ghost" style="margin:0;width:100%;border-color:var(--red);color:var(--red)" onclick="fermerDetailTx(); setTimeout(() => annulerTx(${t.id}), 200);">
              🚫 Annuler cette transaction
            </button>`
        }
        <button class="btn-ghost" style="margin:0;width:100%;border-color:var(--red);color:var(--red);opacity:0.7" onclick="fermerDetailTx(); setTimeout(() => delTxFromHistory(${t.id}), 200);">
          🗑 Supprimer définitivement
        </button>
        <button class="btn-primary" style="margin:0;width:100%" onclick="fermerDetailTx()">
          Fermer
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function fermerDetailTx(){
  const m = document.getElementById('detailTxModal');
  if(m) m.remove();
}

function toggleTxSelect(id, checked){
  if(checked) selectedTxIds.add(id); else selectedTxIds.delete(id);
  const filtered = getFilteredTx();
  const allChecked = filtered.length > 0 && filtered.every(t => selectedTxIds.has(t.id));
  const selAll = document.getElementById('histSelectAll');
  if(selAll) selAll.checked = allChecked;
}

function toggleSelectAll(){
  const chk = document.getElementById('histSelectAll');
  if(!chk) return;
  const isChecked = chk.checked;
  const filtered = getFilteredTx();
  if(isChecked) filtered.forEach(t => selectedTxIds.add(t.id));
  else filtered.forEach(t => selectedTxIds.delete(t.id));
  renderHistory();
}

async function deleteSelected(){
  if(selectedTxIds.size === 0){ alert("Aucune transaction sélectionnée"); return; }
  if(!confirm(`Supprimer ${selectedTxIds.size} transaction(s) ?`)) return;

  const ids = [...selectedTxIds];
  for(const id of ids) await dbDelete('transactions', id);
  txs = txs.filter(t => !selectedTxIds.has(t.id));
  selectedTxIds.clear();
  populateHistFilters();
  renderHistory();
  refreshAll();
}

async function deleteAllFiltered(){
  const filtered = getFilteredTx();
  if(filtered.length === 0){ alert("Aucune transaction à supprimer"); return; }
  if(!confirm(`⚠ Supprimer ${filtered.length} transaction(s) ?`)) return;
  if(!confirm(`Confirmer ?`)) return;

  for(const t of filtered) await dbDelete('transactions', t.id);
  const ids = new Set(filtered.map(t => t.id));
  txs = txs.filter(t => !ids.has(t.id));
  selectedTxIds.clear();
  populateHistFilters();
  renderHistory();
  refreshAll();
}

async function delTxFromHistory(id){
  if(!confirm("Supprimer cette transaction ?")) return;
  const ok = await dbDelete('transactions', id);
  if(!ok) return;
  txs = txs.filter(t => t.id !== id);
  selectedTxIds.delete(id);
  populateHistFilters();
  renderHistory();
  refreshAll();
}

// ============================================================
// RESET UNE TRANSACTION À 0 (sans la supprimer)
// ============================================================
async function resetTx(txId){
  const t = txs.find(x => x.id === txId);
  if(!t){ alert('Transaction introuvable'); return; }

  if(!confirm(`Remettre "${t.category}" à 0 ?\n\nLe montant sera mis à zéro mais la ligne restera visible dans l'historique.`)) return;

  const result = await dbUpdate('transactions', txId, {
    amount: 0,
    note: (t.note || '') + ' [remis à 0]'
  });
  if(!result){ alert('Erreur'); return; }

  const idx = txs.findIndex(x => x.id === txId);
  if(idx >= 0) txs[idx] = result;

  populateHistFilters();
  renderHistory();
  refreshAll();
  showToast('Transaction remise à 0');
}

// ============================================================
// SUPPRESSION = ANNULATION (restaurable)
// ============================================================
async function annulerTx(txId){
  const t = txs.find(x => x.id === txId);
  if(!t){ alert('Transaction introuvable'); return; }

  if(t.cancelled){
    alert('Cette transaction est déjà annulée.');
    return;
  }

  if(!confirm(`Annuler cette transaction ?\n\nElle restera visible mais barrée, et tu pourras la restaurer.`)) return;

  const result = await dbUpdate('transactions', txId, {
    cancelled: true,
    cancelled_at: new Date().toISOString()
  });
  if(!result){ alert('Erreur'); return; }

  const idx = txs.findIndex(x => x.id === txId);
  if(idx >= 0) txs[idx] = result;

  populateHistFilters();
  renderHistory();
  refreshAll();
  showToast('Transaction annulée (restaurable)');
}

async function restaurerTx(txId){
  const t = txs.find(x => x.id === txId);
  if(!t){ alert('Transaction introuvable'); return; }

  if(!t.cancelled){
    alert('Cette transaction n\'est pas annulée.');
    return;
  }

  const result = await dbUpdate('transactions', txId, {
    cancelled: false,
    cancelled_at: null
  });
  if(!result){ alert('Erreur'); return; }

  const idx = txs.findIndex(x => x.id === txId);
  if(idx >= 0) txs[idx] = result;

  populateHistFilters();
  renderHistory();
  refreshAll();
  showToast('Transaction restaurée');
}

function downloadFile(content, filename, mimeType){
  const blob = new Blob([content], {type: mimeType});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportHistoryCSV(){
  const filtered = getFilteredTx();
  if(filtered.length === 0){ alert("Aucune transaction à exporter"); return; }

    const header = "Date;Type;Catégorie;Montant;Note\n";
    const rows = filtered.map(t => {
    const note = (t.note || '').replace(/;/g, ',').replace(/"/g, '""');
    const dateObj = t.created_at ? new Date(t.created_at) : new Date(t.date);
    const fullDate = dateObj.toLocaleDateString('fr-FR') + ' ' + dateObj.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
    return `"${fullDate}";${t.type};${t.category};${t.amount};"${note}"`;
  }).join('\n');

  downloadFile(header + rows, `transactions-${todayStr()}.csv`, 'text/csv;charset=utf-8;');
}

function exportHistoryJSON(){
  const filtered = getFilteredTx();
  if(filtered.length === 0){ alert("Aucune transaction à exporter"); return; }
  downloadFile(JSON.stringify(filtered, null, 2), `transactions-${todayStr()}.json`, 'application/json');
}

function exportHistoryPDF(){
  const filtered = getFilteredTx();
    // Correction : on va nettoyer les données avant de les mettre dans le PDF
  if(filtered.length === 0){ alert("Aucune transaction à exporter"); return; }
  if(!window.jspdf || !window.jspdf.jsPDF){ alert("PDF non chargé"); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFillColor(108, 140, 255);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text("Historique des transactions", 14, 15);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text("Super App Henzo · " + new Date().toLocaleDateString('fr-FR'), 14, 23);

  const totalIn = filtered.filter(t => t.type === 'revenu').reduce((s,t) => s + Number(t.amount), 0);
  const totalOut = filtered.filter(t => t.type === 'depense').reduce((s,t) => s + Number(t.amount), 0);

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(11);
  doc.text(`Revenus : ${fmt(totalIn)}  |  Dépenses : ${fmt(totalOut)}  |  Solde : ${fmt(totalIn-totalOut)}`, 14, 45);

    const rows = filtered.map(t => [
    (t.created_at ? new Date(t.created_at) : new Date(t.date)).toLocaleDateString('fr-FR') + ' ' + (t.created_at ? new Date(t.created_at) : new Date(t.date)).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}),
    t.type === 'revenu' ? 'Revenu' : 'Dépense',
    nettoyerPourPDF(t.category),
    (t.type === 'revenu' ? '+' : '-') + nettoyerPourPDF(fmt(t.amount)),
    nettoyerPourPDF(t.note || '')
  ]);

  doc.autoTable({
    startY: 52,
    head: [['Date', 'Type', 'Catégorie', 'Montant', 'Note']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [108, 140, 255], textColor: 255, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9, textColor: 40 }
  });

  doc.save(`historique-${todayStr()}.pdf`);
}

// ============================================================
// BUSINESS
// ============================================================
function generateIdeas(){
  const shuffled = [...LOCAL_IDEAS].sort(() => Math.random() - 0.5).slice(0, 5);
  const el = document.getElementById('ideasList');
  if(!el) return;

  el.innerHTML = shuffled.map((i) => `
    <div class="idea">
      <div class="t">💡 ${i.t}</div>
      <div class="d">${i.d}</div>
      <div>${i.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
      <button class="btn-ghost" style="margin-top:8px;font-size:13px;padding:8px" onclick='saveIdea(${JSON.stringify(i).replace(/'/g, "&#39;")})'>⭐ Sauvegarder</button>
    </div>`).join('');
}

async function saveIdea(idea){
  if(savedIdeas.some(x => x.title === idea.t)){ alert("Déjà sauvegardée"); return; }
  const result = await dbInsert('saved_ideas', {title: idea.t, description: idea.d, tags: idea.tags});
  if(!result) return;
  savedIdeas.unshift(result);
  refreshAll();
}

async function delSavedIdea(id){
  const ok = await dbDelete('saved_ideas', id);
  if(!ok) return;
  savedIdeas = savedIdeas.filter(i => i.id !== id);
  refreshAll();
}

function renderSavedIdeas(){
  const el = document.getElementById('savedIdeasList');
  if(!el) return;
  if(savedIdeas.length === 0){ el.innerHTML = '<div class="empty">Aucune idée sauvegardée</div>'; return; }

  el.innerHTML = savedIdeas.map(i => `<div class="idea"><div class="t">⭐ ${i.title}</div><div class="d">${i.description || ''}</div><button class="btn-ghost" style="margin-top:8px;font-size:12px;padding:6px" onclick="delSavedIdea(${i.id})">× Retirer</button></div>`).join('');
}

// ============================================================
// IDÉES IA
// ============================================================
function formatIdeasText(text){
  if(!text) return '<div class="empty">Pas de contenu</div>';

  let safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = safe.split('\n');

  let sections = [];
  let currentSection = null;
  let currentContent = [];
  const sectionRegex = /^\s*(\d+)\s*[.)]\s*(.+?)$/;
  const boldRegex = /\*\*(.+?)\*\*/g;

  lines.forEach(line => {
    const match = line.match(sectionRegex);
    if(match){
      if(currentSection !== null || currentContent.length > 0){
        sections.push({num: currentSection, content: currentContent.join('\n').trim()});
      }
      currentSection = match[1];
      currentContent = [match[2]];
    } else {
      currentContent.push(line);
    }
  });
  if(currentSection !== null || currentContent.length > 0){
    sections.push({num: currentSection, content: currentContent.join('\n').trim()});
  }
  sections = sections.filter(s => s.content);
  if(sections.length === 0) sections = [{num: null, content: safe}];

  return sections.map(s => {
    let content = s.content;
    let title = '';
    let body = content;

    const titleMatch = content.match(/^([^:\n]{2,100}?)(?:\s*:\s*|\n)([\s\S]+)$/);
    if(titleMatch){
      title = titleMatch[1].replace(/\*\*/g, '').trim();
      body = titleMatch[2];
    } else {
      title = content.replace(/\*\*/g, '').substring(0, 100);
      body = '';
    }

    body = body.replace(boldRegex, '<strong>$1</strong>').replace(/→/g, '•');

    return `<div class="ai-section">${s.num ? `<div class="ai-section-title"><span class="ai-section-num">${s.num}</span>${title}</div>` : ''}${!s.num && title ? `<div class="ai-section-title">${title}</div>` : ''}${body.trim() ? `<div class="ai-section-body">${body.trim().replace(/\n/g, '<br>')}</div>` : ''}</div>`;
  }).join('');
}

async function loadIdeasAI(){
  try {
    const user = await getCurrentUser();
    if(!user) return;

    const { data, error } = await sb.from('user_settings').select('ideas_ai, ideas_ai_date').eq('user_id', user.id).maybeSingle();
    if(error || !data || !data.ideas_ai) return;

    localStorage.setItem('ideas_ai_last', data.ideas_ai);
    localStorage.setItem('ideas_ai_last_date', data.ideas_ai_date || '');

    const outEl = document.getElementById('ideasAIOutput');
    if(outEl) outEl.innerHTML = formatIdeasText(data.ideas_ai);
    const cpBtn = document.getElementById('ideasCopyBtn');
    const pdfBtn = document.getElementById('ideasPdfBtn');
    const clBtn = document.getElementById('ideasClearBtn');
    if(cpBtn) cpBtn.disabled = false;
    if(pdfBtn) pdfBtn.disabled = false;
    if(clBtn) clBtn.disabled = false;

    if(data.ideas_ai_date){
      const dateEl = document.getElementById('ideasLastUpdate');
      if(dateEl){
        dateEl.textContent = '🕐 Dernière génération : ' + data.ideas_ai_date;
        dateEl.classList.add('visible');
      }
    }
  } catch(e){ console.warn('loadIdeasAI error:', e); }
}

async function saveIdeasAI(text){
  const dateStr = new Date().toLocaleString('fr-FR', {day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'});
  localStorage.setItem('ideas_ai_last', text);
  localStorage.setItem('ideas_ai_last_date', dateStr);
  try {
    const user = await getCurrentUser();
    if(!user) return;
    await sb.from('user_settings').upsert({ user_id: user.id, ideas_ai: text, ideas_ai_date: dateStr }, { onConflict: 'user_id' });
  } catch(e){ console.warn('saveIdeasAI error:', e); }
}

async function clearIdeasAI(){
  if(!confirm('Effacer les idées IA ?')) return;
  localStorage.removeItem('ideas_ai_last');
  localStorage.removeItem('ideas_ai_last_date');
  try {
    const user = await getCurrentUser();
    if(user) await sb.from('user_settings').update({ ideas_ai: null, ideas_ai_date: null }).eq('user_id', user.id);
  } catch(e){}

  const outEl = document.getElementById('ideasAIOutput');
  if(outEl) outEl.innerHTML = '<div class="empty">Clique sur <strong>Générer</strong>.</div>';
  const dateEl = document.getElementById('ideasLastUpdate');
  if(dateEl) dateEl.classList.remove('visible');
  const cpBtn = document.getElementById('ideasCopyBtn');
  const pdfBtn = document.getElementById('ideasPdfBtn');
  const clBtn = document.getElementById('ideasClearBtn');
  if(cpBtn) cpBtn.disabled = true;
  if(pdfBtn) pdfBtn.disabled = true;
  if(clBtn) clBtn.disabled = true;
}

async function copyIdeasAI(){
  const text = localStorage.getItem('ideas_ai_last');
  if(!text){ alert('Aucune idée à copier'); return; }
  try {
    await navigator.clipboard.writeText(text);
    const btn = document.getElementById('ideasCopyBtn');
    if(btn){
      btn.textContent = '✅ Copié !';
      setTimeout(() => btn.textContent = '📋 Copier', 2000);
    }
  } catch(e){
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

function exportIdeasAIPDF(){
  const text = localStorage.getItem('ideas_ai_last');
  const date = localStorage.getItem('ideas_ai_last_date');
  if(!text){ alert('Aucune idée à exporter'); return; }
  if(!window.jspdf || !window.jspdf.jsPDF){ alert('PDF non chargé'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFillColor(255, 107, 157);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text("Idées de business IA", 14, 16);
  doc.setFontSize(10);
  if(date) doc.text(date, 14, 24);

  const cleanText = nettoyerPourPDF(text.replace(/\*\*/g, '').replace(/→/g, '-'));
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(11);
  const splitText = doc.splitTextToSize(cleanText, 180);
  let y = 42;
  const pageHeight = doc.internal.pageSize.height - 15;

  splitText.forEach(line => {
    if(y > pageHeight){ doc.addPage(); y = 15; }
    doc.text(line, 14, y);
    y += 6;
  });

  doc.save(`idees-ia-${todayStr()}.pdf`);
}

async function generateAIIdeas(){
  let cfg = null;
  try { cfg = JSON.parse(localStorage.getItem('aiConfig')); } catch(e){}
  if(!cfg || !cfg.key){ alert("Configure ta clé dans l'onglet IA"); return; }

  const out = document.getElementById('ideasAIOutput');
  if(!out) return;
  out.innerHTML = '<div class="empty">⏳ Génération en cours...</div>';

  const summary = buildSummary();
  const prompt = `Voici le profil : ${summary}\n\nGénère 5 idées de business CONCRÈTES et ADAPTÉES (photographe).\nFormat strict :\n1. [Titre]\n   • [Description]\n   • Revenu potentiel: [fourchette FCFA]\n   • Difficulté: Facile/Moyenne/Difficile\n(etc.)\n\nN'utilise PAS d'astérisques.`;

  try {
    const text = await callAI(prompt);
    if(!text || !text.trim()){ out.innerHTML = '<div class="empty">❌ Pas de réponse.</div>'; return; }

    await saveIdeasAI(text);
    out.innerHTML = formatIdeasText(text);

    const cpBtn = document.getElementById('ideasCopyBtn');
    const pdfBtn = document.getElementById('ideasPdfBtn');
    const clBtn = document.getElementById('ideasClearBtn');
    if(cpBtn) cpBtn.disabled = false;
    if(pdfBtn) pdfBtn.disabled = false;
    if(clBtn) clBtn.disabled = false;

    const dateEl = document.getElementById('ideasLastUpdate');
    if(dateEl){
      dateEl.textContent = '🕐 Dernière génération : ' + new Date().toLocaleString('fr-FR');
      dateEl.classList.add('visible');
    }
  } catch(e){
    out.innerHTML = `<div class="empty">❌ ${e.message}</div>`;
  }
}

// ============================================================
// CITATIONS
// ============================================================
function newQuote(){
  const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];

  const emoji1 = document.getElementById('quoteEmoji');
  const text1 = document.getElementById('quoteText');
  const auth1 = document.getElementById('quoteAuthor');
  if(emoji1) emoji1.textContent = q.e;
  if(text1) text1.textContent = '"' + q.q + '"';
  if(auth1) auth1.textContent = q.a;

  const emoji2 = document.getElementById('dashQuoteEmoji');
  const text2 = document.getElementById('dashQuoteText');
  const auth2 = document.getElementById('dashQuoteAuthor');
  if(emoji2) emoji2.textContent = q.e;
  if(text2) text2.textContent = '"' + q.q + '"';
  if(auth2) auth2.textContent = q.a;
}

// ============================================================
// NOTIFICATIONS AUTOMATIQUES
// ============================================================
const NOTIF_MESSAGES = {
  morning: [
    {i:'🌅', t:'Bonjour !', m:'Nouvelle journée, nouvelle opportunité.'},
    {i:'☀️', t:'C\'est le matin !', m:'La discipline du matin fait la réussite du soir.'},
    {i:'🚀', t:'Debout !', m:'Les gagnants se lèvent avant les autres.'},
    {i:'💪', t:'Coucou !', m:'Sois meilleur que hier.'},
    {i:'🔥', t:'Allez !', m:'Ta seule limite, c\'est toi-même.'}
  ],
  midday: [
    {i:'💰', t:'Conseil finance', m:'Avant chaque achat, demande-toi : "En ai-je vraiment besoin ?"'},
    {i:'📸', t:'Astuce photo', m:'Publie 1 photo de ton travail aujourd\'hui.'},
    {i:'💡', t:'Idée business', m:'Un client satisfait = 3 recommandations.'},
    {i:'🎯', t:'Focus', m:'Écris tes 3 priorités du jour.'},
    {i:'💎', t:'Conseil', m:'Épargner 1000 FCFA/jour = 30 000 FCFA/mois.'}
  ],
  evening: [
    {i:'🌙', t:'Bilan du jour', m:'As-tu épargné quelque chose aujourd\'hui ?'},
    {i:'💰', t:'Pense à épargner', m:'Ouvre ton app et ajoute tes transactions.'},
    {i:'🎯', t:'Objectifs', m:'Chaque jour sans épargne est un jour de retard.'},
    {i:'🔥', t:'Discipline', m:'Le succès est un choix quotidien.'},
    {i:'💪', t:'Repose-toi', m:'Le repos est aussi productif que le travail.'}
  ]
};

function getNotificationMessage(type){
  const dayIndex = Math.floor(Date.now() / 86400000);
  const messages = NOTIF_MESSAGES[type];
  return messages[dayIndex % messages.length];
}

async function toggleNotifications(){
  if(isNotifEnabled()){ localStorage.removeItem('notif_enabled'); updateNotifButton(); return; }

  if(!('Notification' in window)){ 
    const st = document.getElementById('notifStatus');
    if(st) st.textContent = '❌ Non supporté'; 
    return; 
  }

  const permission = await Notification.requestPermission();
  if(permission !== 'granted'){ 
    const st = document.getElementById('notifStatus');
    if(st) st.textContent = '❌ Permission refusée.'; 
    return; 
  }

  try {
    const OneSignal = window.OneSignal;
    if(OneSignal){
      await OneSignal.User.PushSubscription.optIn();
      const user = await getCurrentUser();
      if(user && user.email) await OneSignal.login(user.email);
    }
    localStorage.setItem('notif_enabled', '1');
    updateNotifButton();
    setTimeout(registerOneSignalPlayer, 2000);
    await showLocalNotification('🔥 Notifications activées', 'Tu recevras tes rappels sur tous tes appareils 💪');
  } catch(e){
    console.error('OneSignal error:', e);
    const st = document.getElementById('notifStatus');
    if(st) st.textContent = '❌ ' + e.message;
  }
}

async function testerNotification(){
  if(!isNotifEnabled()){ alert('Active d\'abord les notifications'); return; }
  const msg = getNotificationMessage('midday');
  await showLocalNotification(msg.i + ' ' + msg.t, msg.m);
  afficherPopupNotif(msg.i + ' ' + msg.t, msg.m, msg.i, 6000);
}

async function checkAutomaticNotifications(){
  if(!isNotifEnabled()) return;
  if(!('Notification' in window) || Notification.permission !== 'granted') return;

  const now = new Date();
  const hh = now.getHours();
  const mm = now.getMinutes();
  const todayKey = now.toISOString().slice(0,10);

  if(hh === 8 && mm >= 0 && mm < 5){
    const key = `notif_morning_${todayKey}`;
    if(!localStorage.getItem(key)){
      const msg = getNotificationMessage('morning');
      await showLocalNotification(msg.i + ' ' + msg.t, msg.m);
      afficherPopupNotif(msg.i + ' ' + msg.t, msg.m, msg.i, 6000);
      localStorage.setItem(key, '1');
    }
  }
  if(hh === 13 && mm >= 0 && mm < 5){
    const key = `notif_midday_${todayKey}`;
    if(!localStorage.getItem(key)){
      const msg = getNotificationMessage('midday');
      await showLocalNotification(msg.i + ' ' + msg.t, msg.m);
      afficherPopupNotif(msg.i + ' ' + msg.t, msg.m, msg.i, 6000);
      localStorage.setItem(key, '1');
    }
  }
  if(hh === 20 && mm >= 0 && mm < 5){
    const key = `notif_evening_${todayKey}`;
    if(!localStorage.getItem(key)){
      const msg = getNotificationMessage('evening');
      await showLocalNotification(msg.i + ' ' + msg.t, msg.m);
      afficherPopupNotif(msg.i + ' ' + msg.t, msg.m, msg.i, 6000);
      localStorage.setItem(key, '1');
    }
  }
}

function enableNotifications(){ toggleNotifications(); }

async function checkDailyReminders(){
  if(!('Notification' in window) || Notification.permission !== 'granted') return;
  if(!isNotifEnabled()) return;

  const today = todayStr();
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  for(const r of reminders){
    if(r.sent || r.due_date || !r.time) continue;
    const [h, m] = r.time.split(':').map(Number);
    const rMin = h * 60 + m;
    const key = `reminder_${r.id}_${today}`;
    if(!localStorage.getItem(key) && Math.abs(nowMin - rMin) <= 5){
      await showLocalNotification("⏰ Rappel", r.text);
      localStorage.setItem(key, '1');
    }
  }
}

async function checkShootReminders(){
  if(!isNotifEnabled()) return;
  if(!('Notification' in window) || Notification.permission !== 'granted') return;
  if(!shoots || shoots.length === 0) return;

  const now = new Date();
  const hh = now.getHours();
  const mm = now.getMinutes();

  for(const s of shoots){
    if(!s.date) continue;
    if(s.status === 'annule' || s.status === 'shoote') continue;

    const shootDate = new Date(s.date);
    const diffMs = shootDate - now;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    const client = s.client_id ? clients.find(c => c.id === s.client_id) : null;
    const clientName = client ? ' · ' + client.name : '';
    const location = s.location ? ' 📍 ' + s.location : '';
    const timeStr = shootDate.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
    const dateStr = shootDate.toLocaleDateString('fr-FR', {weekday:'long', day:'2-digit', month:'long'});

    if(diffDays > 6.5 && diffDays < 7.5 && hh === 20 && mm < 5){
      const key = `shoot_j7_${s.id}`;
      if(!localStorage.getItem(key)){
        await showLocalNotification('📸 Shoot dans 1 semaine !', `${s.type}${clientName} · ${dateStr} à ${timeStr}${location}`);
        afficherPopupNotif('📸 Shoot dans 1 semaine !', `${s.type}${clientName} · ${dateStr} à ${timeStr}${location}`, '📸', 10000);
        localStorage.setItem(key, '1');
      }
    }
    if(diffDays > 3.5 && diffDays < 4.5 && hh === 20 && mm < 5){
      const key = `shoot_j4_${s.id}`;
      if(!localStorage.getItem(key)){
        await showLocalNotification('📸 Shoot dans 4 jours !', `${s.type}${clientName} · ${dateStr} à ${timeStr}${location}`);
        afficherPopupNotif('📸 Shoot dans 4 jours !', `${s.type}${clientName} · ${dateStr} à ${timeStr}${location}`, '📸', 10000);
        localStorage.setItem(key, '1');
      }
    }
    if(diffDays > 1.5 && diffDays < 2.5 && hh === 20 && mm < 5){
      const key = `shoot_j2_${s.id}`;
      if(!localStorage.getItem(key)){
        await showLocalNotification('📸 Shoot dans 2 jours !', `${s.type}${clientName} · ${dateStr} à ${timeStr}${location}`);
        afficherPopupNotif('📸 Shoot dans 2 jours !', `${s.type}${clientName} · ${dateStr} à ${timeStr}${location}`, '📸', 10000);
        localStorage.setItem(key, '1');
      }
    }
    if(diffDays > 0.5 && diffDays < 1.5 && hh === 20 && mm < 5){
      const key = `shoot_j1_${s.id}`;
      if(!localStorage.getItem(key)){
        await showLocalNotification('📸 Shoot DEMAIN !', `${s.type}${clientName} · ${dateStr} à ${timeStr}${location}`);
        afficherPopupNotif('📸 Shoot DEMAIN !', `${s.type}${clientName} · ${dateStr} à ${timeStr}${location}`, '📸', 12000);
        localStorage.setItem(key, '1');
      }
    }
    if(diffHours > 2.75 && diffHours < 3.25){
      const key = `shoot_h3_${s.id}`;
      if(!localStorage.getItem(key)){
        await showLocalNotification('⏰ Shoot dans 3h !', `${s.type}${clientName} à ${timeStr}${location}`);
        afficherPopupNotif('⏰ Shoot dans 3h !', `${s.type}${clientName} à ${timeStr}${location}`, '⏰', 12000);
        localStorage.setItem(key, '1');
      }
    }
  }
}

// ============================================================
// MODULE RAPPELS NORMAUX
// ============================================================
const REMINDER_TYPES_FIXES = ['perso','rdv','appel','paiement','Autre'];

function onReminderTypeChange(){
  const valEl = document.getElementById('reminderType');
  const wrap = document.getElementById('reminderCustomTypeWrap');
  if(!valEl || !wrap) return;
  wrap.style.display = (valEl.value === 'Autre') ? 'block' : 'none';
}

function openReminderModal(id){
  editingReminderId = id || null;
  const r = id ? reminders.find(x => x.id === id) : null;

  document.getElementById('reminderModalTitle').textContent = r ? '✏️ Modifier' : '⏰ Nouveau rappel';
  document.getElementById('reminderSubmit').textContent = r ? '💾 Enregistrer' : '➕ Créer';

  if(r){
    let savedType = r.type || 'perso';
    if(REMINDER_TYPES_FIXES.includes(savedType)){
      document.getElementById('reminderType').value = savedType;
      document.getElementById('reminderCustomType').value = '';
    } else {
      document.getElementById('reminderType').value = 'Autre';
      document.getElementById('reminderCustomType').value = savedType;
    }
    document.getElementById('reminderText').value = r.text || '';
    if(r.due_date){
      const d = new Date(r.due_date);
      document.getElementById('reminderDate').value = d.toISOString().slice(0,10);
      document.getElementById('reminderTime').value = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
    } else {
      document.getElementById('reminderDate').value = new Date().toISOString().slice(0,10);
      document.getElementById('reminderTime').value = r.time || '09:00';
    }
  } else {
    document.getElementById('reminderType').value = 'perso';
    document.getElementById('reminderCustomType').value = '';
    document.getElementById('reminderText').value = '';
    document.getElementById('reminderDate').value = new Date().toISOString().slice(0,10);
    document.getElementById('reminderTime').value = '09:00';
  }

  onReminderTypeChange();
  document.getElementById('reminderModalBg').classList.add('show');
}

function closeReminderModal(){
  document.getElementById('reminderModalBg').classList.remove('show');
  editingReminderId = null;
}

async function saveReminder(){
  const text = document.getElementById('reminderText').value.trim();
  const time = document.getElementById('reminderTime').value;
  const date = document.getElementById('reminderDate').value;
  let type = document.getElementById('reminderType').value;

  if(!text){ alert("Écris un message"); return; }
  if(!date){ alert("Choisis une date"); return; }
  if(!time){ alert("Choisis une heure"); return; }

  if(type === 'Autre'){
    const custom = document.getElementById('reminderCustomType').value.trim();
    if(custom) type = custom;
    else { alert("Précise le type"); return; }
  }

  const dueDate = new Date(date + 'T' + time + ':00').toISOString();

  if(editingReminderId){
    const result = await dbUpdate('reminders', editingReminderId, {text, time, type, due_date: dueDate, sent: false});
    if(!result) return;
    const idx = reminders.findIndex(r => r.id === editingReminderId);
    if(idx >= 0) reminders[idx] = result;
    closeReminderModal();
    refreshAll();
    alert('✅ Rappel modifié !');
    return;
  }

  const result = await dbInsert('reminders', {text, time, type, due_date: dueDate, sent: false});
  if(!result) return;
  reminders.push(result);
  closeReminderModal();
  refreshAll();
  alert('✅ Rappel créé !\nMême app fermée 🔔');
}

async function delReminder(id){
  const ok = await dbDelete('reminders', id);
  if(!ok) return;
  reminders = reminders.filter(r => r.id !== id);
  refreshAll();
}

function renderReminders(){
  const el = document.getElementById('remindersList');
  if(!el) return;
  if(reminders.length === 0){ el.innerHTML = '<div class="empty">Aucun rappel. Crées-en un !</div>'; return; }

  const fixedIcons = {perso:'🔔', rdv:'📅', appel:'📞', paiement:'💰', Autre:'✏️'};
  const sorted = [...reminders].sort((a,b) => {
    const da = a.due_date || a.created_at || '';
    const db_ = b.due_date || b.created_at || '';
    return da.localeCompare(db_);
  });

  el.innerHTML = sorted.map(r => {
    const icon = fixedIcons[r.type] || '✏️';
    const now = new Date();
    const due = r.due_date ? new Date(r.due_date) : null;

    let statusBadge = '';
    let statusClass = '';

    if(r.sent){ statusBadge = '✅ Envoyé'; statusClass = 'sent'; }
    else if(due && due < now){ statusBadge = '⏱ En cours'; statusClass = 'pending'; }
    else if(due){
      const diff = due - now;
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(hours / 24);
      if(hours < 1) statusBadge = '⏱ Moins d\'1h';
      else if(hours < 24) statusBadge = `⏱ Dans ${hours}h`;
      else statusBadge = `📅 Dans ${days}j`;
    }

    const dateStr = due ? due.toLocaleString('fr-FR', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'}) : r.time || '';

    return `<div class="reminder ${statusClass}">
      <div class="reminder-icon">${icon}</div>
      <div class="reminder-content">
        <div class="reminder-text">${r.text}</div>
        <div class="reminder-meta">
          <span>${dateStr}</span>
          ${statusBadge ? `<span class="reminder-badge">${statusBadge}</span>` : ''}
        </div>
      </div>
      <div class="reminder-actions">
        <button class="reminder-edit" onclick="openReminderModal(${r.id})" title="Modifier">✏️</button>
        <button class="reminder-del" onclick="delReminder(${r.id})" title="Supprimer">×</button>
      </div>
    </div>`;
  }).join('');
}

// ============================================================
// RAPPELS D'OBJECTIFS
// ============================================================
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
  const el = document.getElementById('goalReminderFrequency');
  const wrap = document.getElementById('goalReminderDayWrap');
  if(!el || !wrap) return;
  wrap.style.display = (el.value === 'weekly') ? 'block' : 'none';
}

async function openGoalReminderModal(id){
  editingGoalReminderId = id || null;
  const r = id ? goalReminders.find(x => x.id === id) : null;

  const sel = document.getElementById('goalReminderGoal');
  if(!sel) return;

  sel.innerHTML = '<option value="">-- Choisir un objectif --</option>' + coffres.map(c => `<option value="${c.id}">${getCoffreEmoji(c.name)} ${c.name}</option>`).join('');

  document.getElementById('goalReminderModalTitle').textContent = r ? '✏️ Modifier le rappel' : '⏰ Nouveau rappel d\'épargne';
  document.getElementById('goalReminderSubmit').textContent = '💾 Enregistrer';

  if(r){
    sel.value = r.goal_id || '';
    document.getElementById('goalReminderMessage').value = r.message || '';
    document.getElementById('goalReminderFrequency').value = r.frequency || 'daily';
    document.getElementById('goalReminderTime').value = r.time || '20:00';
    if(r.day_of_week !== null && r.day_of_week !== undefined){ document.getElementById('goalReminderDay').value = String(r.day_of_week); }
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
  const goalId = parseInt(document.getElementById('goalReminderGoal').value);
  const message = document.getElementById('goalReminderMessage').value.trim();
  const frequency = document.getElementById('goalReminderFrequency').value;
  const time = document.getElementById('goalReminderTime').value;
  const dayOfWeek = frequency === 'weekly' ? parseInt(document.getElementById('goalReminderDay').value) : null;

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
    showToast('Rappel modifié');
  } else {
    const result = await dbInsert('goal_reminders', data);
    if(!result) return;
    goalReminders.push(result);
    closeGoalReminderModal();
    renderGoalReminders();
    showToast('Rappel créé !');
  }
}

async function deleteGoalReminder(id){
  if(!confirm('Supprimer ce rappel ?')) return;
  const ok = await dbDelete('goal_reminders', id);
  if(!ok) return;
  goalReminders = goalReminders.filter(r => r.id !== id);
  renderGoalReminders();
  showToast('Rappel supprimé');
}

function renderGoalReminders(){
  const el = document.getElementById('goalRemindersList');
  if(!el) return;
  if(goalReminders.length === 0){ el.innerHTML = '<div class="empty">Aucun rappel. Crées-en un !</div>'; return; }

  const freqLabels = { daily: '🔁 Tous les jours', weekly: '📅 Chaque semaine' };
  const dayLabels = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const sorted = [...goalReminders].sort((a,b) => (a.time || '').localeCompare(b.time || ''));

  el.innerHTML = sorted.map(r => {
    const goal = coffres.find(c => c.id === r.goal_id);
    const goalName = goal ? goal.name : 'Objectif supprimé';
    const emoji = goal ? getCoffreEmoji(goal.name) : '🎯';

    let freqText = freqLabels[r.frequency] || '🔁';
    if(r.frequency === 'weekly' && r.day_of_week !== null && r.day_of_week !== undefined){
      freqText += ' · ' + (dayLabels[r.day_of_week] || '');
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
  if(typeof isNotifEnabled === 'function' && !isNotifEnabled()) return;
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
      if(typeof showLocalNotification === 'function'){ await showLocalNotification(title, r.message); }
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
  if(coffres.length === 0){ el.innerHTML = '<div class="empty">Crée un objectif pour voir les suggestions.</div>'; return; }

  const suggestions = [];
  const s = computeStats();

  coffres.forEach(c => {
    const current = Number(c.current || 0);
    const goal = Number(c.goal || 1);
    const pct = (current / goal) * 100;
    const rest = goal - current;

    if(pct >= 100){
      suggestions.push({cls:'good', icon:'🏆', title:`"${c.name}" atteint !`, body:`Félicitations ! Fixe-toi un nouveau défi.`});
      return;
    }
    if(pct === 0){
      suggestions.push({cls:'urgent', icon:'🚀', title:`Démarre "${c.name}"`, body:`Commence par <strong>${fmt(goal * 0.05)}</strong> (5%).`});
      return;
    }

    if(c.target_date){
      const days = Math.ceil((new Date(c.target_date) - new Date()) / 86400000);
      if(days > 0 && days < 30){
        suggestions.push({cls:'urgent', icon:'⏱', title:`Deadline proche : ${c.name}`, body:`Reste <strong>${days} jours</strong> pour économiser <strong>${fmt(rest)}</strong>. Soit ${fmt(rest/days)}/jour.`});
      } else if(days > 0){
        const perMonth = (rest / days) * 30;
        suggestions.push({cls:'', icon:'📊', title:`Rythme pour "${c.name}"`, body:`Épargne <strong>${fmt(perMonth)}</strong> par mois pour finir à temps.`});
      } else {
        suggestions.push({cls:'urgent', icon:'⚠️', title:`Deadline dépassée : ${c.name}`, body:`Reste <strong>${fmt(rest)}</strong>. Replanifie une date cible.`});
      }
    } else {
      suggestions.push({cls:'', icon:'📈', title:`${c.name} : ${pct.toFixed(0)}%`, body:`Reste <strong>${fmt(rest)}</strong>. Ajoute ${fmt(rest/4)} chaque semaine.`});
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
      suggestions.push({cls:'urgent', icon:'⚠️', title:'Budget épargne serré', body:`Objectifs : <strong>${fmt(totalMonthlyTarget)}/mois</strong>. Capacité : ${fmt(monthlyPotential)}.`});
    } else if(totalMonthlyTarget > 0){
      suggestions.push({cls:'good', icon:'✅', title:'Budget épargne OK', body:`Objectifs : ${fmt(totalMonthlyTarget)}/mois. Capacité : <strong>${fmt(monthlyPotential)}</strong>.`});
    }
  }

  if(suggestions.length === 0){ el.innerHTML = '<div class="empty">Continue à ajouter de l\'épargne !</div>'; return; }

  el.innerHTML = suggestions.slice(0, 6).map(sg => `<div class="goal-suggestion ${sg.cls}"><div class="icon">${sg.icon}</div><div class="title">${sg.title}</div><div class="body">${sg.body}</div></div>`).join('');
}

// ============================================================
// MON ARGENT EN DÉTAIL (Dashboard détaillé)
// ============================================================
function renderMoneyDetails(){
  const el = document.getElementById('moneyDetailsCard');
  if(!el) return;

  const ym = monthKey();
  const monthTx = txs.filter(t => t.date && t.date.startsWith(ym));

  // SECTION 1 : D'OÙ VIENT L'ARGENT
  const revenus = monthTx.filter(t => t.type === 'revenu');
  const totalIn = revenus.reduce((s,t) => s + Number(t.amount || 0), 0);

  const sourcesMap = {};
  revenus.forEach(t => {
    const key = t.prestation_type || t.category || 'Autre';
    if(!sourcesMap[key]) sourcesMap[key] = { total: 0, count: 0 };
    sourcesMap[key].total += Number(t.amount || 0);
    sourcesMap[key].count++;
  });
  const sources = Object.entries(sourcesMap).sort((a,b) => b[1].total - a[1].total);

  // SECTION 2 : OÙ VA L'ARGENT
  const depenses = monthTx.filter(t => t.type === 'depense');
  const totalOut = depenses.reduce((s,t) => s + Number(t.amount || 0), 0);

  const catsMap = {};
  depenses.forEach(t => {
    const key = t.category || 'Autre';
    if(!catsMap[key]) catsMap[key] = { total: 0, count: 0 };
    catsMap[key].total += Number(t.amount || 0);
    catsMap[key].count++;
  });
  const cats = Object.entries(catsMap).sort((a,b) => b[1].total - a[1].total);

  // SECTION 3 : ÉPARGNE PAR OBJECTIF
  const totalEpargne = coffres.reduce((sum, c) => sum + Number(c.current || 0), 0);
  const objectifsActifs = coffres.filter(c => Number(c.current) < Number(c.goal));

  // SECTION 4 : ARGENT À VENIR
  const seancesEnCours = shoots.filter(s => {
    const prix = Number(s.price || 0);
    const recu = Number(s.montant_recu || 0);
    return prix > 0 && recu < prix && s.status !== 'annule';
  });
  const totalAttente = seancesEnCours.reduce((sum, s) =>
    sum + Math.max(0, Number(s.price) - Number(s.montant_recu || 0)), 0);

  let html = '';

  // BLOC 1 : Revenus
  html += `
    <div style="background:linear-gradient(135deg,rgba(52,211,153,.10),rgba(52,211,153,.02));border-radius:14px;padding:16px;margin-bottom:14px;border:1px solid rgba(52,211,153,.25)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div>
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1.2px;font-weight:700">💰 Argent reçu</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${revenus.length} entrée${revenus.length > 1 ? 's' : ''} ce mois</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:24px;font-weight:800;color:var(--green);letter-spacing:-1px">${fmt(totalIn)}</div>
        </div>
      </div>
      ${sources.length > 0 ? sources.slice(0, 5).map(([name, data]) => {
        const pct = totalIn > 0 ? (data.total / totalIn * 100) : 0;
        return `
          <div style="margin-top:10px">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
              <span style="color:var(--text)">• ${name}</span>
              <span style="color:var(--green);font-weight:700">${fmt(data.total)} <span style="color:var(--muted);font-weight:400">(${pct.toFixed(0)}%)</span></span>
            </div>
            <div style="height:4px;background:rgba(52,211,153,.12);border-radius:2px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--green),#6ee7b7);border-radius:2px"></div>
            </div>
          </div>
        `;
      }).join('') : '<div style="font-size:12px;color:var(--muted);text-align:center;padding:8px">Aucun revenu ce mois</div>'}
    </div>
  `;

  // BLOC 2 : Dépenses
  html += `
    <div style="background:linear-gradient(135deg,rgba(255,107,107,.10),rgba(255,107,107,.02));border-radius:14px;padding:16px;margin-bottom:14px;border:1px solid rgba(255,107,107,.25)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div>
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1.2px;font-weight:700">💸 Argent sorti</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${depenses.length} sortie${depenses.length > 1 ? 's' : ''} ce mois</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:24px;font-weight:800;color:var(--red);letter-spacing:-1px">${fmt(totalOut)}</div>
        </div>
      </div>
      ${cats.length > 0 ? cats.slice(0, 6).map(([name, data]) => {
        const pct = totalOut > 0 ? (data.total / totalOut * 100) : 0;
        return `
          <div style="margin-top:10px">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
              <span style="color:var(--text)">• ${name}</span>
              <span style="color:var(--red);font-weight:700">${fmt(data.total)} <span style="color:var(--muted);font-weight:400">(${pct.toFixed(0)}%)</span></span>
            </div>
            <div style="height:4px;background:rgba(255,107,107,.12);border-radius:2px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--red),#ff9b9b);border-radius:2px"></div>
            </div>
          </div>
        `;
      }).join('') : '<div style="font-size:12px;color:var(--muted);text-align:center;padding:8px">Aucune dépense ce mois</div>'}
    </div>
  `;

  // BLOC 3 : Épargne
  if(totalEpargne > 0){
    html += `
      <div style="background:linear-gradient(135deg,rgba(107,142,255,.10),rgba(107,142,255,.02));border-radius:14px;padding:16px;margin-bottom:14px;border:1px solid rgba(107,142,255,.25)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div>
            <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1.2px;font-weight:700">🎯 Argent épargné</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">${coffres.length} objectif${coffres.length > 1 ? 's' : ''} · ${objectifsActifs.length} en cours</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:24px;font-weight:800;color:var(--accent);letter-spacing:-1px">${fmt(totalEpargne)}</div>
          </div>
        </div>
        ${coffres.slice(0, 4).map(c => {
          const current = Number(c.current || 0);
          const goal = Number(c.goal || 1);
          const pct = Math.min(100, (current / goal) * 100);
          const emoji = c.emoji || getCoffreEmoji(c.name);
          const isMoney = (c.goal_type || 'money') === 'money';
          const unit = c.unit || 'FCFA';
          const valStr = isMoney ? fmt(current) : current + ' ' + unit;
          const goalStr = isMoney ? fmt(goal) : goal + ' ' + unit;
          const color = pct >= 100 ? 'var(--green)' : pct >= 50 ? 'var(--accent)' : 'var(--yellow)';
          return `
            <div style="margin-top:10px">
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
                <span style="color:var(--text)">${emoji} ${c.name}</span>
                <span style="color:${color};font-weight:700">${valStr} <span style="color:var(--muted);font-weight:400">/ ${goalStr}</span></span>
              </div>
              <div style="height:4px;background:rgba(107,142,255,.12);border-radius:2px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:${color};border-radius:2px"></div>
              </div>
            </div>
          `;
        }).join('')}
        ${coffres.length > 4 ? `<div style="font-size:11px;color:var(--muted);text-align:center;margin-top:8px">+${coffres.length - 4} autre${coffres.length - 4 > 1 ? 's' : ''}</div>` : ''}
      </div>
    `;
  }

  // BLOC 4 : À venir
  if(seancesEnCours.length > 0){
    html += `
      <div style="background:linear-gradient(135deg,rgba(245,197,66,.10),rgba(245,197,66,.02));border-radius:14px;padding:16px;margin-bottom:14px;border:1px solid rgba(245,197,66,.25)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div>
            <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1.2px;font-weight:700">⏳ Argent à venir</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">${seancesEnCours.length} séance${seancesEnCours.length > 1 ? 's' : ''} en attente de paiement</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:24px;font-weight:800;color:var(--yellow);letter-spacing:-1px">${fmt(totalAttente)}</div>
          </div>
        </div>
        ${seancesEnCours.slice(0, 4).map(s => {
          const client = s.client_id ? clients.find(c => c.id === s.client_id) : null;
          const reste = Number(s.price) - Number(s.montant_recu || 0);
          const pct = Number(s.price) > 0 ? (Number(s.montant_recu || 0) / Number(s.price) * 100) : 0;
          const d = new Date(s.date);
          const dateStr = d.toLocaleDateString('fr-FR', {day:'2-digit', month:'short'});
          return `
            <div style="margin-top:10px">
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
                <span style="color:var(--text)">📸 ${s.type}${client ? ' · ' + client.name : ''} <span style="color:var(--muted);font-size:11px">(${dateStr})</span></span>
                <span style="color:var(--yellow);font-weight:700">${fmt(reste)}</span>
              </div>
              <div style="height:4px;background:rgba(245,197,66,.12);border-radius:2px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--yellow),#ffd97a);border-radius:2px"></div>
              </div>
            </div>
          `;
        }).join('')}
        ${seancesEnCours.length > 4 ? `<div style="font-size:11px;color:var(--muted);text-align:center;margin-top:8px">+${seancesEnCours.length - 4} autre${seancesEnCours.length - 4 > 1 ? 's' : ''}</div>` : ''}
        <button class="btn-ghost" style="margin-top:12px;width:100%;font-size:12px" onclick="showTab('photo', null)">
          📸 Voir toutes les séances
        </button>
      </div>
    `;
  }

  // RÉSUMÉ FINAL
  const solde = totalIn - totalOut;
  html += `
    <div style="background:var(--card2);border-radius:14px;padding:16px;border:1px solid var(--border)">
      <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1.2px;font-weight:700;text-align:center;margin-bottom:12px">📊 Résumé du mois</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div style="text-align:center;padding:10px;background:rgba(52,211,153,.08);border-radius:10px">
          <div style="font-size:11px;color:var(--muted);margin-bottom:2px">Reçu</div>
          <div style="font-size:16px;font-weight:800;color:var(--green)">${fmt(totalIn)}</div>
        </div>
        <div style="text-align:center;padding:10px;background:rgba(255,107,107,.08);border-radius:10px">
          <div style="font-size:11px;color:var(--muted);margin-bottom:2px">Sorti</div>
          <div style="font-size:16px;font-weight:800;color:var(--red)">${fmt(totalOut)}</div>
        </div>
        <div style="text-align:center;padding:10px;background:rgba(107,142,255,.08);border-radius:10px">
          <div style="font-size:11px;color:var(--muted);margin-bottom:2px">Épargné</div>
          <div style="font-size:16px;font-weight:800;color:var(--accent)">${fmt(totalEpargne)}</div>
        </div>
        <div style="text-align:center;padding:10px;background:rgba(245,197,66,.08);border-radius:10px">
          <div style="font-size:11px;color:var(--muted);margin-bottom:2px">Solde net</div>
          <div style="font-size:16px;font-weight:800;color:${solde >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt(solde)}</div>
        </div>
      </div>
      <button class="btn-ghost" style="margin-top:14px;width:100%;font-size:13px" onclick="showTab('historique', null)">
        📜 Voir tout l'historique détaillé
      </button>
    </div>
  `;

  el.innerHTML = html;
}
// ============================================================
// VUE GLOBALE DU DASHBOARD
// ============================================================
function renderGlobalOverview(){
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

  const analysisEl = document.getElementById('globalAnalysis');
  if(!analysisEl) return;
  if(txs.length === 0){ analysisEl.innerHTML = '<div class="empty">Ajoute des transactions pour voir l\'analyse globale.</div>'; return; }

  const lines = [];
  const months = new Set(txs.map(t => t.date.slice(0,7))).size;
  const avgMonthly = months > 0 ? totalIn / months : 0;
  const savingsRate = totalIn > 0 ? ((totalIn - totalOut) / totalIn * 100) : 0;

  lines.push(`<div class="insight ${savingsRate >= 20 ? 'good' : savingsRate >= 0 ? 'warn' : 'bad'}"><div class="title">📊 Taux d'épargne global : ${savingsRate.toFixed(0)}%</div><div>${savingsRate >= 20 ? 'Excellent ! Tu épargnes bien.' : savingsRate >= 0 ? 'Peut mieux faire. Vise 20%.' : 'Attention, tu dépenses plus que tu ne gagnes.'}</div></div>`);
  lines.push(`<div class="insight"><div class="title">💵 Revenu moyen mensuel</div><div>${fmt(avgMonthly)} sur ${months} mois d'activité</div></div>`);

  if(coffres.length > 0){
    const totalGoal = coffres.reduce((sum, c) => sum + Number(c.goal), 0);
    const pct = totalGoal > 0 ? (totalSaved / totalGoal * 100) : 0;
    lines.push(`<div class="insight ${pct >= 50 ? 'good' : 'warn'}"><div class="title">🎯 Progression globale des objectifs</div><div>${pct.toFixed(0)}% (${fmt(totalSaved)} / ${fmt(totalGoal)})</div></div>`);
  }

  analysisEl.innerHTML = lines.join('');
}

function renderDailyTip(){
  const el = document.getElementById('dailyTip');
  if(!el) return;
  const todayIndex = Math.floor(Date.now() / 86400000) % DAILY_TIPS.length;
  const tip = DAILY_TIPS[todayIndex];
  el.innerHTML = `<div class="icon">${tip.i}</div><div class="title">${tip.t}</div><div class="body">${tip.m}</div>`;
}

function renderDashboardGoalReminders(){
  const card = document.getElementById('dashboardGoalRemindersCard');
  const el = document.getElementById('dashboardGoalRemindersList');
  if(!card || !el) return;
  if(goalReminders.length === 0){ card.style.display = 'none'; return; }

  card.style.display = 'block';
  const sorted = [...goalReminders].sort((a,b) => (a.time || '').localeCompare(b.time || ''));
  const freqLabels = { daily: '🔁 Quotidien', weekly: '📅 Hebdo' };

  el.innerHTML = sorted.slice(0, 3).map(r => {
    const goal = coffres.find(c => c.id === r.goal_id);
    const goalName = goal ? goal.name : 'Objectif';
    const emoji = goal ? getCoffreEmoji(goal.name) : '🎯';
    return `<div class="goal-reminder-item"><div class="left"><div class="title">${emoji} ${goalName}</div><div class="sub"><span>⏰ ${r.time}</span><span class="badge-freq">${freqLabels[r.frequency] || ''}</span></div></div></div>`;
  }).join('') + (goalReminders.length > 3 ? `<div style="text-align:center;font-size:12px;color:var(--muted);margin-top:8px">+${goalReminders.length - 3} autre(s)</div>` : '');
}

function renderDashboardGoals(){
  const card = document.getElementById('dashboardGoalsCard');
  const el = document.getElementById('dashboardGoalsList');
  if(!card || !el) return;

  const active = coffres.filter(c => Number(c.current) < Number(c.goal));
  if(active.length === 0){ card.style.display = 'none'; return; }

  card.style.display = 'block';
  el.innerHTML = active.slice(0, 3).map(c => {
    const current = Number(c.current || 0);
    const goal = Number(c.goal || 1);
    const pct = Math.min(100, (current / goal) * 100);
    const color = getProgressionColor(pct);
    const emoji = getCoffreEmoji(c.name);
    return `<div class="top-goal-item"><div class="left"><div class="title">${emoji} ${c.name}</div><div class="sub">${fmt(current)} / ${fmt(goal)} · ${pct.toFixed(0)}%</div></div><div class="progress-mini"><div style="width:${pct}%;background:${color}"></div></div><div style="font-size:11px;color:${color};font-weight:700;margin-left:6px">${pct.toFixed(0)}%</div></div>`;
  }).join('');
}
// ============================================================
// MODULE IA
// ============================================================
function toggleAiConfig(){
  const body = document.getElementById('aiConfigBody');
  const arrow = document.getElementById('aiConfigArrow');
  if(!body || !arrow) return;
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  arrow.classList.toggle('open', !isOpen);
}

function formatAnalysisText(text){
  if(!text) return '<div class="empty">Pas de contenu</div>';

  let safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = safe.split('\n');

  let sections = [];
  let currentSection = null;
  let currentContent = [];
  const sectionRegex = /^\s*(\d+)\s*[.)]\s*(.+?)$/;
  const boldRegex = /\*\*(.+?)\*\*/g;

  lines.forEach(line => {
    const match = line.match(sectionRegex);
    if(match){
      if(currentSection !== null || currentContent.length > 0){
        sections.push({num: currentSection, content: currentContent.join('\n').trim()});
      }
      currentSection = match[1];
      currentContent = [match[2]];
    } else {
      currentContent.push(line);
    }
  });
  if(currentSection !== null || currentContent.length > 0){
    sections.push({num: currentSection, content: currentContent.join('\n').trim()});
  }
  sections = sections.filter(s => s.content);
  if(sections.length === 0) sections = [{num: null, content: safe}];

  function detectColor(content){
    const lower = content.toLowerCase();
    if(/attention|danger|déficit|négatif|perte|sous-évalu|trop|⚠|🚨/i.test(content)) return 'bad';
    if(/surveille|serré|faible|augmente/i.test(lower)) return 'warn';
    if(/excellent|bravo|bon|félicitation|bien|progrès|solide|🏆|🌟/i.test(content)) return 'good';
    return '';
  }

  return sections.map(s => {
    let content = s.content;
    let title = '';
    let body = content;

    const titleMatch = content.match(/^([^:]{2,80}?)\s*:\s*([\s\S]+)$/);
    if(titleMatch){
      title = titleMatch[1].replace(/\*\*/g, '').trim();
      body = titleMatch[2];
    } else {
      const firstLineBreak = content.indexOf('\n');
      if(firstLineBreak > 0 && firstLineBreak < 100){
        title = content.substring(0, firstLineBreak).replace(/\*\*/g, '').trim();
        body = content.substring(firstLineBreak + 1);
      } else {
        title = content.replace(/\*\*/g, '').substring(0, 80);
        body = '';
      }
    }

    body = body.replace(boldRegex, '<strong>$1</strong>');
    const color = detectColor(s.content);

    return `<div class="ai-section ${color}">${s.num ? `<div class="ai-section-title"><span class="ai-section-num">${s.num}</span>${title}</div>` : ''}${!s.num && title ? `<div class="ai-section-title">${title}</div>` : ''}${body.trim() ? `<div class="ai-section-body">${body.trim().replace(/\n/g, '<br>')}</div>` : ''}</div>`;
  }).join('');
}

async function loadSavedAnalysis(){
  try {
    const user = await getCurrentUser();
    if(!user) return;

    const { data, error } = await sb.from('user_settings').select('ai_analysis, ai_analysis_date').eq('user_id', user.id).maybeSingle();
    if(error || !data || !data.ai_analysis) return;

    localStorage.setItem('ai_last_analysis', data.ai_analysis);
    localStorage.setItem('ai_last_analysis_date', data.ai_analysis_date || '');

    const outEl = document.getElementById('aiOutput');
    if(outEl) outEl.innerHTML = formatAnalysisText(data.ai_analysis);
    const cpBtn = document.getElementById('aiCopyBtn');
    const pdfBtn = document.getElementById('aiPdfBtn');
    const clBtn = document.getElementById('aiClearBtn');
    if(cpBtn) cpBtn.disabled = false;
    if(pdfBtn) pdfBtn.disabled = false;
    if(clBtn) clBtn.disabled = false;

    if(data.ai_analysis_date){
      const dateEl = document.getElementById('aiLastUpdate');
      if(dateEl){
        dateEl.textContent = '🕐 Dernière analyse : ' + data.ai_analysis_date;
        dateEl.classList.add('visible');
      }
    }
  } catch(e){ console.warn('loadSavedAnalysis error:', e); }
}

async function saveAnalysis(text){
  const dateStr = new Date().toLocaleString('fr-FR', {day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'});
  localStorage.setItem('ai_last_analysis', text);
  localStorage.setItem('ai_last_analysis_date', dateStr);
  try {
    const user = await getCurrentUser();
    if(!user) return;
    await sb.from('user_settings').upsert({ user_id: user.id, ai_analysis: text, ai_analysis_date: dateStr }, { onConflict: 'user_id' });
  } catch(e){}
}

async function clearAnalysis(){
  if(!confirm('Effacer l\'analyse ?')) return;
  localStorage.removeItem('ai_last_analysis');
  localStorage.removeItem('ai_last_analysis_date');
  try {
    const user = await getCurrentUser();
    if(user) await sb.from('user_settings').update({ ai_analysis: null, ai_analysis_date: null }).eq('user_id', user.id);
  } catch(e){}

  const outEl = document.getElementById('aiOutput');
  if(outEl) outEl.innerHTML = '<div class="empty">Clique sur <strong>Analyser</strong>.</div>';
  const dateEl = document.getElementById('aiLastUpdate');
  if(dateEl) dateEl.classList.remove('visible');
  const cpBtn = document.getElementById('aiCopyBtn');
  const pdfBtn = document.getElementById('aiPdfBtn');
  const clBtn = document.getElementById('aiClearBtn');
  if(cpBtn) cpBtn.disabled = true;
  if(pdfBtn) pdfBtn.disabled = true;
  if(clBtn) clBtn.disabled = true;
}

async function copyAnalysis(){
  const text = localStorage.getItem('ai_last_analysis');
  if(!text){ alert('Aucune analyse à copier'); return; }
  try {
    await navigator.clipboard.writeText(text);
    const btn = document.getElementById('aiCopyBtn');
    if(btn){
      btn.textContent = '✅ Copié !';
      setTimeout(() => btn.textContent = '📋 Copier', 2000);
    }
  } catch(e){
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

function exportAnalysisPDF(){
  const text = localStorage.getItem('ai_last_analysis');
  const date = localStorage.getItem('ai_last_analysis_date');
  if(!text){ alert('Aucune analyse à exporter'); return; }
  if(!window.jspdf || !window.jspdf.jsPDF){ alert('PDF non chargé'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFillColor(108, 140, 255);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text("Analyse financière IA", 14, 16);
  doc.setFontSize(10);
  if(date) doc.text(date, 14, 24);

    const cleanText = nettoyerPourPDF(text.replace(/\*\*/g, ''));
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(11);
  const splitText = doc.splitTextToSize(cleanText, 180);
  let y = 42;
  const pageHeight = doc.internal.pageSize.height - 15;

  splitText.forEach(line => {
    if(y > pageHeight){ doc.addPage(); y = 15; }
    doc.text(line, 14, y);
    y += 6;
  });

  doc.save(`analyse-ia-${todayStr()}.pdf`);
}

async function saveAiConfig(){
  const providerEl = document.getElementById('aiProvider');
  const keyEl = document.getElementById('aiKey');
  const urlEl = document.getElementById('aiUrl');
  if(!providerEl || !keyEl || !urlEl) return;

  const provider = providerEl.value;
  const key = keyEl.value.trim();
  const url = urlEl.value.trim();
  if(!key){ alert("Colle ta clé"); return; }

  const cfg = {provider, key, url};
  localStorage.setItem('aiConfig', JSON.stringify(cfg));

  try {
    const user = await getCurrentUser();
    if(user){ await sb.from('user_settings').upsert({ user_id: user.id, ai_config: cfg }, { onConflict: 'user_id' }); }
  } catch(e){}

  updateAiStatus();
  alert("Enregistré et synchronisé !");
}

function updateAiStatus(){
  let cfg = null;
  try { cfg = JSON.parse(localStorage.getItem('aiConfig')); } catch(e){}

  const el = document.getElementById('aiStatus');
  if(!el) return;

  if(cfg && cfg.key){
    el.textContent = 'connectée';
    el.classList.add('on');
    const pv = document.getElementById('aiProvider');
    const kv = document.getElementById('aiKey');
    const uv = document.getElementById('aiUrl');
    if(pv) pv.value = cfg.provider;
    if(kv) kv.value = cfg.key;
    if(uv && cfg.url) uv.value = cfg.url;
  } else {
    el.textContent = 'non configurée';
    el.classList.remove('on');
  }
  toggleCustomUrl();
}

async function loadAiConfigFromSupabase(){
  try {
    const user = await getCurrentUser();
    if(!user) return;

    const { data, error } = await sb.from('user_settings').select('ai_config').eq('user_id', user.id).maybeSingle();
    if(error || !data || !data.ai_config) return;

    localStorage.setItem('aiConfig', JSON.stringify(data.ai_config));
    updateAiStatus();
  } catch(e){}
}

function toggleCustomUrl(){
  const sel = document.getElementById('aiProvider');
  if(!sel) return;
  const isCustom = sel.value === 'custom';
  const lbl = document.getElementById('aiUrlLabel');
  const inp = document.getElementById('aiUrl');
  if(lbl) lbl.style.display = isCustom ? 'block' : 'none';
  if(inp) inp.style.display = isCustom ? 'block' : 'none';
}

function buildSummary(){
  const s = computeStats();
  const lines = [
    `Devise: ${CURRENCY}`,
    `Mois: ${s.ym}`,
    `Revenus: ${Math.round(s.totalIn)}`,
    `Dépenses: ${Math.round(s.totalOut)}`,
    `Solde: ${Math.round(s.bal)}`,
    `Taux épargne: ${(s.savingsRate * 100).toFixed(1)}%`
  ];

  if(s.sortedCats.length) lines.push('Répartition: ' + s.sortedCats.map(([c,a]) => `${c}=${Math.round(a)}`).join(', '));

  if(coffres.length){
    lines.push("Objectifs:");
    coffres.forEach(c => lines.push(`- ${c.name}: ${Math.round(c.current)}/${Math.round(c.goal)} (${((c.current/c.goal)*100).toFixed(0)}%)`));
  }

  if(shoots.length){
    const ym = monthKey();
    const ms = shoots.filter(s => s.date && s.date.startsWith(ym));
    lines.push(`Séances photo ce mois: ${ms.length}`);
    const r = ms.filter(s => s.payment === 'paye').reduce((a,b) => a + Number(b.price), 0);
    lines.push(`Revenus photo: ${Math.round(r)}`);
  }

  if(clients.length) lines.push(`Clients: ${clients.length}`);
  if(inspirations.length) lines.push(`Inspirations: ${inspirations.length}`);
  if(notes.length) lines.push(`Notes: ${notes.length}`);

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
        model: AI_MODELS.anthropic,
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const j = await r.json();
    if(j.error) throw new Error(j.error.message);
    return j.content?.[0]?.text || '';
  }

  if(cfg.provider === 'gemini'){
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${AI_MODELS.gemini}:generateContent?key=${cfg.key}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
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
        { role: 'system', content: 'Tu es un conseiller financier personnel direct.' },
        { role: 'user', content: prompt }
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
  if(!out) return;
  out.innerHTML = '<div class="empty">⏳ Analyse en cours...</div>';

  const summary = buildSummary();
  const prompt = `Tu es un conseiller financier personnel. Voici le résumé :\n\n${summary}\n\nAnalyse en français, en 8 points numérotés :\n1. Diagnostic global\n2. Taux d'épargne\n3. Poste à surveiller\n4. Prévision fin de mois\n5. Combien épargner ce mois\n6. Une idée de business adaptée\n7. Action immédiate aujourd'hui\n8. Encouragement personnalisé\n\nConcret, chiffré. N'utilise PAS d'astérisques.`;

  try {
    const text = await callAI(prompt);
    if(!text || !text.trim()){ out.innerHTML = '<div class="empty">❌ Pas de réponse.</div>'; return; }

    await saveAnalysis(text);
    out.innerHTML = formatAnalysisText(text);

    const cpBtn = document.getElementById('aiCopyBtn');
    const pdfBtn = document.getElementById('aiPdfBtn');
    const clBtn = document.getElementById('aiClearBtn');
    if(cpBtn) cpBtn.disabled = false;
    if(pdfBtn) pdfBtn.disabled = false;
    if(clBtn) clBtn.disabled = false;

    const dateEl = document.getElementById('aiLastUpdate');
    if(dateEl){
      dateEl.textContent = '🕐 Dernière analyse : ' + new Date().toLocaleString('fr-FR');
      dateEl.classList.add('visible');
    }
  } catch(e){
    out.innerHTML = `<div class="empty">❌ ${e.message}</div>`;
  }
}

// ============================================================
// CHAT IA
// ============================================================
let chatHistory = [];
let chatSending = false;

async function getChatStorageKey(){
  const user = await getCurrentUser();
  return 'chat_history_' + (user?.email || 'anon');
}

async function loadChatHistory(){
  try {
    const user = await getCurrentUser();
    if(user){
      const { data, error } = await sb.from('user_settings')
        .select('chat_history')
        .eq('user_id', user.id)
        .maybeSingle();

      if(!error && data && Array.isArray(data.chat_history)){
        chatHistory = data.chat_history;
        const key = await getChatStorageKey();
        localStorage.setItem(key, JSON.stringify(chatHistory));
        return;
      }
    }
  } catch(e){
    console.warn('loadChatHistory Supabase error:', e);
  }

  try {
    const key = await getChatStorageKey();
    const raw = localStorage.getItem(key);
    chatHistory = raw ? JSON.parse(raw) : [];
  } catch(e){ chatHistory = []; }
}

async function saveChatHistory(){
  const toSave = chatHistory.slice(-50);
  chatHistory = toSave;

  try {
    const key = await getChatStorageKey();
    localStorage.setItem(key, JSON.stringify(toSave));
  } catch(e){}

  try {
    const user = await getCurrentUser();
    if(user){
      await sb.from('user_settings').upsert(
        { user_id: user.id, chat_history: toSave },
        { onConflict: 'user_id' }
      );
    }
  } catch(e){
    console.warn('saveChatHistory Supabase error:', e);
  }
}

async function openChat(){
  await loadChatHistory();
  document.getElementById('chatModalBg').classList.add('show');

  if(chatHistory.length === 0){
    const user = await getCurrentUser();
    const s = computeStats();
    const firstName = (user?.email || '').split('@')[0] || 'toi';

    const welcome = `Salut ${firstName} ! 👋\n\nJe suis ton assistant IA. Je connais déjà ta situation :\n• Solde du mois : ${fmt(s.bal)}\n• Revenus : ${fmt(s.totalIn)} | Dépenses : ${fmt(s.totalOut)}\n• ${clients.length} clients · ${shoots.length} séances · ${coffres.length} objectifs\n\nPose-moi n\'importe quelle question ! 💪`;
    chatHistory.push({ role: 'assistant', content: welcome, ts: Date.now() });
    await saveChatHistory();
  }

  renderChatMessages();
  setTimeout(() => document.getElementById('chatInput')?.focus(), 300);
}

function closeChat(){ document.getElementById('chatModalBg').classList.remove('show'); }

function sendSuggestion(text){
  const input = document.getElementById('chatInput');
  if(input){ input.value = text; sendChatMessage(); }
}

async function sendChatMessage(){
  if(chatSending) return;

  const input = document.getElementById('chatInput');
  const btn = document.getElementById('chatSendBtn');
  const text = (input?.value || '').trim();
  if(!text) return;

  let cfg = null;
  try { cfg = JSON.parse(localStorage.getItem('aiConfig')); } catch(e){}
  if(!cfg || !cfg.key){ alert("Configure d'abord ta clé API IA."); return; }

  chatSending = true;
  input.value = '';
  input.style.height = 'auto';
  btn.disabled = true;

  chatHistory.push({ role: 'user', content: text, ts: Date.now() });
  await saveChatHistory();
  renderChatMessages();

  const loadingMsg = document.createElement('div');
  loadingMsg.className = 'chat-msg assistant typing';
  loadingMsg.id = 'chatLoading';
  loadingMsg.textContent = 'Analyse en cours';
  document.getElementById('chatMessages').appendChild(loadingMsg);
  scrollChatToBottom();

  try {
    const response = await callChatAI(text);
    document.getElementById('chatLoading')?.remove();
    chatHistory.push({ role: 'assistant', content: response, ts: Date.now() });
    await saveChatHistory();
    renderChatMessages();
  } catch(e){
    document.getElementById('chatLoading')?.remove();
    chatHistory.push({ role: 'assistant', content: '❌ Erreur : ' + e.message, ts: Date.now() });
    renderChatMessages();
  } finally {
    chatSending = false;
    btn.disabled = false;
  }
}

function buildChatContext(){
  const s = computeStats();
  const lines = [];

  lines.push('=== SITUATION FINANCIÈRE ===');
  lines.push(`Mois : ${s.ym}`);
  lines.push(`Revenus : ${Math.round(s.totalIn)} ${CURRENCY}`);
  lines.push(`Dépenses : ${Math.round(s.totalOut)} ${CURRENCY}`);
  lines.push(`Solde : ${Math.round(s.bal)} ${CURRENCY}`);
  lines.push(`Taux d'épargne : ${(s.savingsRate * 100).toFixed(1)}%`);

  if(s.sortedCats.length > 0){
    lines.push('');
    lines.push('=== DÉPENSES PAR CATÉGORIE ===');
    s.sortedCats.slice(0, 8).forEach(([cat, amt]) => {
      const pct = (amt / s.totalOut * 100).toFixed(0);
      lines.push(`• ${cat} : ${Math.round(amt)} (${pct}%)`);
    });
  }

  if(coffres.length > 0){
    lines.push('');
    lines.push('=== OBJECTIFS ===');
    coffres.forEach(c => {
      const pct = ((c.current / c.goal) * 100).toFixed(0);
      lines.push(`• ${c.name} : ${Math.round(c.current)}/${Math.round(c.goal)} (${pct}%)`);
    });
  }

  if(clients.length > 0){
    lines.push('');
    lines.push(`=== CLIENTS (${clients.length}) ===`);
    clients.slice(0, 10).forEach(c => {
      lines.push(`• ${c.name}${c.city ? ' (' + c.city + ')' : ''}${c.phone ? ' · ' + c.phone : ''}`);
    });
  }

  if(shoots.length > 0){
    lines.push('');
    lines.push('=== SÉANCES PHOTO ===');
    const sorted = [...shoots].sort((a,b) => (b.date || '').localeCompare(a.date || '')).slice(0, 10);
    sorted.forEach(sh => {
      const client = sh.client_id ? clients.find(c => c.id === sh.client_id) : null;
      const dateStr = sh.date ? new Date(sh.date).toLocaleDateString('fr-FR') : '?';
      lines.push(`• ${dateStr} · ${sh.type}${client ? ' avec ' + client.name : ''} · ${Math.round(sh.price)} · ${sh.payment === 'paye' ? 'payé' : 'impayé'}`);
    });
  }

  if(notes.length > 0){
    lines.push('');
    lines.push(`=== NOTES (${notes.filter(n => !n.archived).length} actives) ===`);
    notes.filter(n => !n.archived).slice(0, 8).forEach(n => {
      lines.push(`• [${n.category}] ${n.title || n.content.substring(0,60)}`);
    });
  }

  const recentTx = [...txs].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 15);
  if(recentTx.length > 0){
    lines.push('');
    lines.push('=== TRANSACTIONS RÉCENTES ===');
    recentTx.forEach(t => {
      const sign = t.type === 'revenu' ? '+' : '-';
      lines.push(`• ${t.date} ${sign}${Math.round(t.amount)} · ${t.category}${t.note ? ' (' + t.note + ')' : ''}`);
    });
  }

  return lines.join('\n');
}

async function callChatAI(userMessage){
  let cfg = null;
  try { cfg = JSON.parse(localStorage.getItem('aiConfig')); } catch(e){}
  if(!cfg || !cfg.key) throw new Error("Configure ta clé IA");

  const context = buildChatContext();
  const recentHistory = chatHistory
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-20)
    .map(m => ({ role: m.role, content: m.content }));

  if(recentHistory.length > 0 && recentHistory[recentHistory.length - 1].role === 'user'){
    recentHistory.pop();
  }

  const systemPrompt = `Tu es un assistant financier personnel, direct et concret.\n\nVoici TOUTES les données de l'utilisateur :\n\n${context}\n\nRÈGLES :\n- Réponds en français, clair et amical.\n- Base-toi sur ces données réelles.\n- Conseils CONCRETS et CHIFFRÉS.\n- Emojis avec modération.\n- N'utilise PAS d'astérisques **.`;

  const messages = [
    { role: 'user', content: systemPrompt + '\n\nRéponds juste "OK".' },
    { role: 'assistant', content: 'OK.' },
    ...recentHistory,
    { role: 'user', content: userMessage }
  ];

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
        model: AI_MODELS.anthropic,
        max_tokens: 1500,
        system: systemPrompt,
        messages: messages.slice(2)
      })
    });
    const j = await r.json();
    if(j.error) throw new Error(j.error.message);
    return j.content?.[0]?.text || 'Pas de réponse';
  }

  if(cfg.provider === 'gemini'){
    const geminiMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${AI_MODELS.gemini}:generateContent?key=${cfg.key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: geminiMessages })
    });
    const j = await r.json();
    if(j.error) throw new Error(j.error.message);
    return j.candidates?.[0]?.content?.parts?.[0]?.text || 'Pas de réponse';
  }

  const url = cfg.provider === 'custom' && cfg.url ? cfg.url : 'https://api.openai.com/v1/chat/completions';
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cfg.key}`
    },
    body: JSON.stringify({ model: AI_MODELS.openai, messages, temperature: 0.7, max_tokens: 1500 })
  });
  const j = await r.json();
  if(j.error) throw new Error(j.error.message);
  return j.choices?.[0]?.message?.content || 'Pas de réponse';
}

function renderChatMessages(){
  const el = document.getElementById('chatMessages');
  if(!el) return;

  if(chatHistory.length === 0){ el.innerHTML = '<div class="empty">Commence la conversation !</div>'; return; }

  el.innerHTML = chatHistory.map((m, idx) => {
    const isUser = m.role === 'user';
    const content = (m.content || '').replace(/\n/g, '<br>');
    return `<div class="chat-msg ${isUser ? 'user' : 'assistant'}"><div>${content}</div><div class="chat-msg-footer"><button class="chat-msg-btn" onclick="copyChatMessage(${idx})" title="Copier">📋</button></div></div>`;
  }).join('');

  scrollChatToBottom();
}

function scrollChatToBottom(){
  const el = document.getElementById('chatMessages');
  if(el) setTimeout(() => { el.scrollTop = el.scrollHeight; }, 50);
}

function copyChatMessage(idx){
  const m = chatHistory[idx];
  if(!m) return;
  const text = m.content;
  if(navigator.clipboard){
    navigator.clipboard.writeText(text).then(() => showToast('Copié !')).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text){
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  showToast('Copié !');
}

function copyFullChat(){
  if(chatHistory.length === 0){ alert('Aucun message'); return; }
  const text = chatHistory.map(m => {
    const who = m.role === 'user' ? '👤 TOI' : '🤖 IA';
    return `${who} :\n${m.content}`;
  }).join('\n\n─────────\n\n');

  if(navigator.clipboard){
    navigator.clipboard.writeText(text).then(() => showToast('Tout copié !')).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

async function clearChat(){
  if(!confirm('Effacer toute la conversation sur TOUS tes appareils ?')) return;
  chatHistory = [];

  try {
    const key = await getChatStorageKey();
    localStorage.removeItem(key);
  } catch(e){}

  try {
    const user = await getCurrentUser();
    if(user){
      await sb.from('user_settings').upsert(
        { user_id: user.id, chat_history: [] },
        { onConflict: 'user_id' }
      );
    }
  } catch(e){
    console.warn('clearChat Supabase error:', e);
  }

  renderChatMessages();
  closeChat();
  setTimeout(() => openChat(), 200);
}

function cleanTextForPDF(text){
  if(!text) return '';
  return String(text)
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{1F000}-\u{1F02F}]/gu, '')
    .replace(/[\u{1F0A0}-\u{1F0FF}]/gu, '')
    .replace(/[\u{1F100}-\u{1F1FF}]/gu, '')
    .replace(/[\u{1F200}-\u{1F2FF}]/gu, '')
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
    .replace(/[\u{1FA00}-\u{1FAFF}]/gu, '')
    .replace(/[\u{2300}-\u{23FF}]/gu, '')
    .replace(/[\u{25A0}-\u{25FF}]/gu, '')
    .replace(/[\u{2190}-\u{21FF}]/gu, '->')
    .replace(/[—–]/g, '-')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/…/g, '...')
    .replace(/\u202F|\u00A0|\u2009/g, ' ')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim();
}

function exportChatPDF(){
  if(chatHistory.length === 0){ alert('Aucun message à exporter'); return; }
  if(!window.jspdf || !window.jspdf.jsPDF){ alert('PDF non chargé'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pageWidth = 182;
  const margin = 14;
  let y = 20;

  doc.setFillColor(108, 140, 255);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Conversation avec l\'IA', margin, 14);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleString('fr-FR'), margin, 22);

  y = 38;

  chatHistory.forEach(m => {
    const isUser = m.role === 'user';
    const who = isUser ? 'TOI' : 'IA';
    const dateStr = m.ts ? new Date(m.ts).toLocaleString('fr-FR', {hour: '2-digit', minute: '2-digit'}) : '';

        const cleanContent = nettoyerPourPDF(cleanTextForPDF(m.content || ''));

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    if(isUser){ doc.setTextColor(108, 140, 255); }
    else { doc.setTextColor(46, 180, 100); }

    if(y > 270){ doc.addPage(); y = 20; }
    doc.text(who + (dateStr ? '  -  ' + dateStr : ''), margin, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);

    const lines = doc.splitTextToSize(cleanContent, pageWidth);
    lines.forEach(line => {
      if(y > 275){ doc.addPage(); y = 20; }
      doc.text(line, margin, y);
      y += 5;
    });

    y += 6;
  });

  const pageCount = doc.internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++){
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Conversation exportée depuis Super App Henzo', 105, 290, { align: 'center' });
  }

  doc.save(`chat-ia-${todayStr()}.pdf`);
}

function showToast(message){
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: var(--green); color: #000; padding: 10px 20px; border-radius: 20px; font-size: 13px; font-weight: 700; z-index: 999; box-shadow: 0 4px 20px rgba(0,0,0,.3);`;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity .3s';
    setTimeout(() => toast.remove(), 300);
  }, 1500);
}

// ============================================================
// MODULE ÉPARGNE PERSO
// ============================================================
function ouvrirEpargnePerso(coffreId) {
  const coffre = coffres.find(c => c.id === coffreId);
  if(!coffre) return;

  localStorage.setItem('epargne_en_cours', JSON.stringify({coffreId: coffreId, ts: Date.now()}));
  afficherModalEpargne(coffreId);
}

function afficherModalEpargne(coffreId) {
  const coffre = coffres.find(c => c.id === coffreId);
  if(!coffre) return;

  const existing = document.getElementById('epargnePersoModal');
  if(existing) existing.remove();

  const rest = Number(coffre.goal) - Number(coffre.current);

  const modal = document.createElement('div');
  modal.className = 'modal-bg show';
  modal.id = 'epargnePersoModal';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-wrap">
        <h3>🎯 Épargner dans "${coffre.name}"</h3>
        <button class="close" onclick="fermerEpargnePerso()">×</button>
      </div>
      <div style="background:var(--card2);border-radius:12px;padding:14px;margin-bottom:14px">
        <div style="font-size:12px;color:var(--muted);margin-bottom:6px">Progression actuelle</div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:16px;font-weight:700;color:var(--green)">${fmt(coffre.current)}</div>
          <div style="font-size:13px;color:var(--muted)">/ ${fmt(coffre.goal)}</div>
        </div>
        <div style="font-size:12px;color:var(--yellow);margin-top:6px">Reste : ${fmt(rest)}</div>
      </div>
      <div style="background:linear-gradient(135deg,rgba(29,200,255,.15),rgba(108,140,255,.08));border-radius:12px;padding:14px;margin-bottom:14px;border:1px solid var(--wave)">
        <div style="font-weight:700;font-size:14px;margin-bottom:8px">📱 Étape 1 : Ouvre Wave</div>
        <div style="font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:12px">Fais ton virement de ton compte Wave vers ton <strong>Coffre Wave</strong>. Puis reviens ici pour enregistrer.</div>
        <button class="btn-primary" style="margin:0;width:100%;background:var(--wave);color:#000;font-weight:700" onclick="ouvrirAppWave()">📲 Ouvrir Wave</button>
      </div>
      <div style="background:var(--card2);border-radius:12px;padding:14px;margin-bottom:14px">
        <div style="font-weight:700;font-size:14px;margin-bottom:8px">✅ Étape 2 : J'ai épargné</div>
        <label>Combien as-tu épargné ? (FCFA)</label>
        <input type="number" id="epargneMontant" placeholder="Ex: 5000" inputmode="decimal" autofocus>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px">
          <button class="btn-ghost" style="margin:0;padding:8px;font-size:12px" onclick="setEpargneMontant(1000)">1 000</button>
          <button class="btn-ghost" style="margin:0;padding:8px;font-size:12px" onclick="setEpargneMontant(2000)">2 000</button>
          <button class="btn-ghost" style="margin:0;padding:8px;font-size:12px" onclick="setEpargneMontant(5000)">5 000</button>
          <button class="btn-ghost" style="margin:0;padding:8px;font-size:12px" onclick="setEpargneMontant(10000)">10 000</button>
          <button class="btn-ghost" style="margin:0;padding:8px;font-size:12px" onclick="setEpargneMontant(25000)">25 000</button>
          <button class="btn-ghost" style="margin:0;padding:8px;font-size:12px" onclick="setEpargneMontant(${Math.round(rest)})">Reste</button>
        </div>
        <button class="btn-primary" style="margin-top:14px;background:var(--green);width:100%" onclick="validerEpargnePerso(${coffreId})">✅ J'ai épargné</button>
      </div>
      <button class="btn-ghost" onclick="fermerEpargnePerso()">Annuler</button>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('epargneMontant')?.focus(), 300);
}

function setEpargneMontant(m) {
  const input = document.getElementById('epargneMontant');
  if(input) { input.value = m; input.focus(); }
}

function ouvrirAppWave() {
  const ua = navigator.userAgent.toLowerCase();
  const isMobile = /android|iphone|ipad|ipod/.test(ua);

  const modal = document.createElement('div');
  modal.className = 'modal-bg show';
  modal.id = 'waveInstructionsModal';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-wrap"><h3>📱 Ouvre l'app Wave</h3><button class="close" onclick="fermerInstructionsWave()">×</button></div>
      <div style="text-align:center;padding:20px 0 10px">
        <div style="font-size:60px;margin-bottom:12px">💙</div>
        <div style="font-size:15px;color:var(--muted);line-height:1.6;margin-bottom:20px">Pour faire ton virement, ouvre <strong>manuellement</strong> l'application Wave sur ton téléphone, puis :</div>
      </div>
      <div style="background:var(--card2);border-radius:12px;padding:16px;margin-bottom:16px">
        <div style="display:flex;gap:12px;margin-bottom:12px"><div style="font-size:22px;font-weight:700;color:var(--accent)">1</div><div style="font-size:14px;line-height:1.5">Ouvre l'app <strong>Wave</strong> sur ton écran d'accueil</div></div>
        <div style="display:flex;gap:12px;margin-bottom:12px"><div style="font-size:22px;font-weight:700;color:var(--accent)">2</div><div style="font-size:14px;line-height:1.5">Va dans ton <strong>Coffre</strong> (icône rose)</div></div>
        <div style="display:flex;gap:12px;margin-bottom:12px"><div style="font-size:22px;font-weight:700;color:var(--accent)">3</div><div style="font-size:14px;line-height:1.5">Fais ton <strong>virement</strong> du montant souhaité</div></div>
        <div style="display:flex;gap:12px"><div style="font-size:22px;font-weight:700;color:var(--green)">4</div><div style="font-size:14px;line-height:1.5">Reviens ici et clique sur <strong>"✅ J'ai épargné"</strong></div></div>
      </div>
      ${isMobile
        ? `<button class="btn-primary" style="background:var(--wave);color:#000;font-weight:700;width:100%;margin-bottom:8px" onclick="tenterOuvrirWave()">📲 Essayer d'ouvrir Wave</button>`
        : `<div style="background:rgba(245,185,66,.15);border-radius:10px;padding:12px;font-size:13px;color:var(--yellow);text-align:center;margin-bottom:12px">⚠️ Cette action fonctionne uniquement depuis un téléphone</div>`
      }
      <button class="btn-ghost" style="width:100%;margin:0" onclick="fermerInstructionsWave()">J'ai compris</button>
    </div>
  `;
  document.body.appendChild(modal);
}

function tenterOuvrirWave(){
  try { window.location.href = 'wave://'; } catch(e){}
  setTimeout(() => { fermerInstructionsWave(); }, 800);
}

function fermerInstructionsWave(){
  const modal = document.getElementById('waveInstructionsModal');
  if(modal) modal.remove();
}

function fermerEpargnePerso(){
  const modal = document.getElementById('epargnePersoModal');
  if(modal) modal.remove();
  localStorage.removeItem('epargne_en_cours');
}

async function validerEpargnePerso(coffreId) {
  const montant = parseFloat(document.getElementById('epargneMontant').value);
  if(!montant || montant <= 0){ alert('Entre un montant valide'); return; }

  const coffre = coffres.find(c => c.id === coffreId);
  if(!coffre) return;

  const newCurrent = Number(coffre.current || 0) + montant;
  const result = await dbUpdate('goals', coffreId, {current: newCurrent});
  if(!result){ alert('Erreur lors de la mise à jour'); return; }

  coffre.current = newCurrent;
  fermerEpargnePerso();
  refreshAll();
  showToast(fmt(montant) + ' épargné dans "' + coffre.name + '"');

  if(newCurrent >= Number(coffre.goal)){
    setTimeout(() => alert('🎉 FÉLICITATIONS !\nTu as atteint ton objectif "' + coffre.name + '" !'), 500);
  }
}

function verifierEpargneEnCours() {
  const saved = localStorage.getItem('epargne_en_cours');
  if(!saved) return;

  try {
    const data = JSON.parse(saved);
    if(Date.now() - data.ts < 30 * 60 * 1000) {
      if(typeof coffres !== 'undefined' && coffres.length > 0) {
        setTimeout(() => {
          afficherModalEpargne(data.coffreId);
          showToast('Reprends ton épargne là où tu t\'étais arrêté');
        }, 1000);
      }
    } else {
      localStorage.removeItem('epargne_en_cours');
    }
  } catch(e) {
    localStorage.removeItem('epargne_en_cours');
  }
}

document.addEventListener('visibilitychange', () => {
  if(document.visibilityState === 'visible') {
    const saved = localStorage.getItem('epargne_en_cours');
    if(saved) {
      const modal = document.getElementById('epargnePersoModal');
      if(!modal) verifierEpargneEnCours();
    }
  }
});

// ============================================================
// LIEN DE PAIEMENT CLIENT
// ============================================================
function genererLienPaiementClient(shootId) {
  const shoot = shoots.find(s => s.id === shootId);
  if(!shoot) return;
  const client = shoot.client_id ? clients.find(c => c.id === shoot.client_id) : null;
  const clientName = client ? client.name : '';
  const clientPhone = client ? (client.phone || '') : '';

  let shootDateLocal = '';
  if(shoot.date){
    const d = new Date(shoot.date);
    const tzOffset = d.getTimezoneOffset() * 60000;
    shootDateLocal = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  }

  ouvrirCreerLien({
    clientName: clientName,
    clientPhone: clientPhone,
    description: shoot.type + (clientName ? ' · ' + clientName : ''),
    totalAmount: Math.round(shoot.price),
    paymentType: 'complet',
    shootType: shoot.type || '',
    shootDate: shootDateLocal,
    shootLocation: shoot.location || '',
    shootNotes: shoot.notes || '',
    photoCount: shoot.photo_count || ''
  });
}

async function loadPaymentLinks() {
  try {
    const user = await getCurrentUser();
    if(!user) return;
    const { data, error } = await sb.from('payment_links').select('*').order('created_at', {ascending: false});
    if(error) { console.warn('loadPaymentLinks:', error); return; }
    paymentLinks = data || [];
  } catch(e) { console.warn('loadPaymentLinks error:', e); }
}

function ouvrirCreerLien(prefill) {
  prefill = prefill || {};

  const modal = document.createElement('div');
  modal.className = 'modal-bg show';
  modal.id = 'creerLienModal';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-wrap">
        <h3>🔗 Créer un lien de paiement</h3>
        <button class="close" onclick="fermerCreerLien()">×</button>
      </div>

      <div style="background:linear-gradient(135deg,rgba(29,200,255,.15),rgba(108,140,255,.08));border:1px solid var(--wave);border-radius:12px;padding:12px;margin-bottom:14px">
        <div style="font-weight:700;font-size:13px;margin-bottom:6px;color:var(--wave)">📌 Étape préalable</div>
        <div style="font-size:12px;color:var(--muted);line-height:1.5">Avant de créer ce lien, ouvre l'app Wave et génère un lien de paiement pour ce client.</div>
        <button class="btn-ghost" style="margin-top:10px;width:100%;padding:8px;font-size:12px;background:var(--wave);color:#000;border-color:var(--wave);font-weight:700" onclick="ouvrirAppWave()">📱 Ouvrir Wave</button>
      </div>

      <label>Nom du client</label>
      <div style="display:flex;gap:6px;align-items:stretch">
        <input type="text" id="lienClientName" placeholder="Ex: M. Kouassi" list="lienClientsList" autocomplete="off" style="flex:1" value="${(prefill.clientName || '').replace(/"/g, '&quot;')}" oninput="syncLienClientPhone()">
        <button type="button" onclick="ouvrirNouveauClientLien()" style="width:auto;padding:0 16px;margin:0;background:var(--green);color:#000;border:none;border-radius:10px;font-weight:800;font-size:18px;cursor:pointer;flex-shrink:0" title="Créer un nouveau client">➕</button>
      </div>
      <datalist id="lienClientsList">
        ${clients.map(c => `<option value="${c.name}">`).join('')}
      </datalist>

      <div id="lienNewClientWrap" style="display:none;background:var(--card2);border-radius:12px;padding:12px;margin-top:10px;border:1px solid var(--green)">
        <div style="font-size:12px;color:var(--green);font-weight:700;margin-bottom:10px">➕ Nouveau client rapide</div>

        <label style="margin-top:0">Nom complet *</label>
        <input type="text" id="lienNewClientName" placeholder="Ex: Awa Kouassi">

        <label>Téléphone (optionnel)</label>
        <input type="tel" id="lienNewClientPhone" placeholder="Ex: 07 00 00 00 00">

        <label>Ville (optionnel)</label>
        <input type="text" id="lienNewClientCity" placeholder="Ex: Abidjan" list="lienNewClientCityList" autocomplete="off">
        <datalist id="lienNewClientCityList"></datalist>

        <div style="display:flex;gap:6px;margin-top:12px">
          <button type="button" class="btn-ghost" style="margin:0;flex:1;font-size:13px" onclick="annulerNouveauClientLien()">Annuler</button>
          <button type="button" class="btn-primary" style="margin:0;flex:2;background:var(--green);font-size:13px" onclick="sauverNouveauClientLien()">✅ Créer le client</button>
        </div>
      </div>

      <label>Téléphone (optionnel)</label>
      <input type="tel" id="lienClientPhone" placeholder="Ex: 07 00 00 00 00" value="${(prefill.clientPhone || '').replace(/"/g, '&quot;')}">

      <label>Description de la prestation</label>
      <input type="text" id="lienDesc" placeholder="Ex: Shooting mariage 15 octobre" value="${(prefill.description || '').replace(/"/g, '&quot;')}">

      <label>Type de prestation (optionnel)</label>
      <input type="text" id="lienShootType" placeholder="Ex: Mariage, Portrait, Studio..." value="${(prefill.shootType || '').replace(/"/g, '&quot;')}">

      <label>Date & heure du shoot (optionnel)</label>
      <input type="datetime-local" id="lienShootDate" value="${prefill.shootDate || ''}">

      <label>Lieu du shoot (optionnel)</label>
      <input type="text" id="lienShootLocation" placeholder="Ex: Cocody, Abidjan" value="${(prefill.shootLocation || '').replace(/"/g, '&quot;')}">

      <div class="row" style="gap:8px">
        <div style="flex:1">
          <label>Durée (h)</label>
          <input type="number" id="lienShootDuration" placeholder="Ex: 4" step="0.5" inputmode="decimal" value="${prefill.shootDuration || ''}">
        </div>
        <div style="flex:1">
          <label>Nb photos</label>
          <input type="number" id="lienPhotoCount" placeholder="Ex: 250" inputmode="numeric" value="${prefill.photoCount || ''}">
        </div>
      </div>

      <label>Notes libres (optionnel)</label>
      <input type="text" id="lienShootNotes" placeholder="Ex: Retouches incluses, album 30 pages" value="${(prefill.shootNotes || '').replace(/"/g, '&quot;')}">

      <label>Mode de paiement</label>
      <select id="lienPaymentMethod">
        <option value="Wave">💙 Wave</option>
        <option value="Espèces">💵 Espèces</option>
        <option value="Orange Money">🟠 Orange Money</option>
        <option value="MTN Money">🟡 MTN Money</option>
        <option value="Moov Money">🔵 Moov Money</option>
        <option value="Virement bancaire">🏦 Virement</option>
        <option value="Chèque">📝 Chèque</option>
      </select>

      <label>Montant total de la prestation (FCFA)</label>
      <input type="number" id="lienTotalAmount" placeholder="Ex: 100000" inputmode="decimal" oninput="mettreAJourMontant()" value="${prefill.totalAmount || ''}">

            <label>Type de paiement</label>
      <select id="lienPaymentType" onchange="mettreAJourMontant()">
        <option value="acompte30"${prefill.paymentType === 'acompte30' ? ' selected' : ''}>💰 Acompte 30%</option>
        <option value="acompte50"${prefill.paymentType === 'acompte50' ? ' selected' : ''}>💰 Acompte 50%</option>
        <option value="complet"${prefill.paymentType === 'complet' ? ' selected' : ''}>✅ Paiement complet (100%)</option>
        <option value="libre"${prefill.paymentType === 'libre' ? ' selected' : ''}>💵 Montant libre</option>
      </select>

      <div id="montantFlexBox" style="margin-top:10px">
        <label for="lienMontantFlex">💰 Montant à payer par le client (FCFA)</label>
        <div style="display:flex;gap:8px;align-items:center">
          <input type="number" id="lienMontantFlex" placeholder="Ex: 5000" inputmode="decimal" oninput="mettreAJourMontant()" style="flex:2;font-size:18px;font-weight:700;text-align:center;color:var(--green)">
          <div id="lienPourcentFlex" style="flex:1;text-align:center;background:var(--card2);border-radius:10px;padding:12px;font-weight:800;font-size:18px;color:var(--accent)">0%</div>
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:6px;text-align:center">
          Tape un montant ou choisis un % : l'app calcule l'autre automatiquement
        </div>
      </div>

      <div id="montantCalcule" style="background:linear-gradient(135deg,rgba(46,204,113,.15),rgba(108,140,255,.08));border-radius:12px;padding:14px;margin-top:14px;display:none">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Le client devra payer</div>
        <div id="montantCalculeValue" style="font-weight:700;color:var(--green);font-size:22px">...</div>
      </div>
     <div id="fraisWaveBox" style="display:none;margin-top:14px">
        <button class="btn-ghost" style="margin:0;width:100%;padding:12px;background:rgba(245,197,66,.12);color:var(--gold-soft);border-color:var(--gold-soft);font-weight:700" onclick="calculerFraisWave()">
          💸 Calculer les frais Wave
        </button>
        <div id="fraisWaveResult" style="display:none;margin-top:12px"></div>
      </div>

      <label style="margin-top:14px">🔗 Lien Wave (créé par toi)</label>
      <input type="url" id="lienWaveUrl" placeholder="Colle ici le lien Wave que tu as créé">
      <div style="font-size:11px;color:var(--muted);margin-top:6px;line-height:1.5">Colle le lien généré depuis ton app Wave (ex: https://pay.wave.com/m/...)</div>

      <button class="btn-primary" style="background:var(--wave);color:#000;font-weight:700;margin-top:14px" onclick="genererLienPersonnalise()">🚀 Générer le lien</button>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => {
    if(prefill.totalAmount) mettreAJourMontant();
    document.getElementById('lienClientName')?.focus();
  }, 300);
}

function fermerCreerLien(){
  const m = document.getElementById('creerLienModal');
  if(m) m.remove();
}

function mettreAJourMontant() {
  const totalEl = document.getElementById('lienTotalAmount');
  const typeEl = document.getElementById('lienPaymentType');
  const flexEl = document.getElementById('lienMontantFlex');
  const pctEl = document.getElementById('lienPourcentFlex');
  const box = document.getElementById('montantCalcule');
  const value = document.getElementById('montantCalculeValue');

  if(!totalEl || !typeEl || !box || !value) return;

  const total = parseFloat(totalEl.value) || 0;
  const type = typeEl.value;

  // Étape 1 : si on a changé de type (clic utilisateur), on pré-remplit le champ
  const lastType = typeEl.dataset.lastType || '';
  const typeChanged = lastType !== type;

  if(typeChanged && flexEl){
    if(type === 'acompte30'){
      flexEl.value = total > 0 ? Math.round(total * 0.30) : '';
    } else if(type === 'acompte50'){
      flexEl.value = total > 0 ? Math.round(total * 0.50) : '';
    } else if(type === 'complet'){
      flexEl.value = total > 0 ? Math.round(total) : '';
    } else if(type === 'libre'){
      flexEl.value = '';
    }
    typeEl.dataset.lastType = type;
  }

  // Étape 2 : lire le montant final
  let montantFinal = flexEl ? (parseFloat(flexEl.value) || 0) : 0;

  // Étape 3 : DÉTECTION AUTO — si l'utilisateur tape un montant qui ne correspond pas au type choisi
  if(!typeChanged && total > 0 && montantFinal > 0 && type !== 'libre'){
    let montantAttendu = 0;
    if(type === 'acompte30') montantAttendu = Math.round(total * 0.30);
    else if(type === 'acompte50') montantAttendu = Math.round(total * 0.50);
    else if(type === 'complet') montantAttendu = Math.round(total);

    // Si le montant saisi est différent du montant attendu → bascule auto en "Montant libre"
    if(montantAttendu > 0 && montantFinal !== montantAttendu){
      typeEl.value = 'libre';
      typeEl.dataset.lastType = 'libre';
    }
  }

  // Étape 4 : mettre à jour le badge %
  if(pctEl){
    if(total > 0 && montantFinal > 0){
      const pct = (montantFinal / total) * 100;
      pctEl.textContent = pct.toFixed(1).replace('.0', '') + '%';
      pctEl.style.color = pct > 100 ? 'var(--red)' : 'var(--accent)';
    } else {
      pctEl.textContent = '0%';
      pctEl.style.color = 'var(--muted)';
    }
  }

  // Étape 5 : afficher le récap "Le client devra payer"
  if(!total || total <= 0 || montantFinal <= 0){
    box.style.display = 'none';
    return;
  }

  value.textContent = new Intl.NumberFormat('fr-FR').format(Math.round(montantFinal)) + ' FCFA';
  box.style.display = 'block';
    // 🆕 Afficher le bouton "Calculer les frais Wave" quand il y a un montant
  const fraisBox = document.getElementById('fraisWaveBox');
  const fraisResult = document.getElementById('fraisWaveResult');
  if(fraisBox && montantFinal > 0){
    fraisBox.style.display = 'block';
  } else if(fraisBox){
    fraisBox.style.display = 'none';
    if(fraisResult) fraisResult.style.display = 'none';
  }
}

function syncLienClientPhone(){
  const nameInput = document.getElementById('lienClientName');
  const phoneInput = document.getElementById('lienClientPhone');
  if(!nameInput || !phoneInput) return;
  const name = nameInput.value.trim().toLowerCase();
  if(!name) return;
  const found = clients.find(c => c.name.toLowerCase() === name);
  if(found && found.phone){ phoneInput.value = found.phone; }
}

function ouvrirNouveauClientLien(){
  const wrap = document.getElementById('lienNewClientWrap');
  if(!wrap) return;
  wrap.style.display = 'block';

  const dl = document.getElementById('lienNewClientCityList');
  if(dl && typeof VILLES_CI !== 'undefined'){
    dl.innerHTML = VILLES_CI.map(v => `<option value="${v}">`).join('');
  }

  setTimeout(() => document.getElementById('lienNewClientName')?.focus(), 150);
}

function annulerNouveauClientLien(){
  const wrap = document.getElementById('lienNewClientWrap');
  if(wrap) wrap.style.display = 'none';
  const n = document.getElementById('lienNewClientName');
  const p = document.getElementById('lienNewClientPhone');
  const c = document.getElementById('lienNewClientCity');
  if(n) n.value = '';
  if(p) p.value = '';
  if(c) c.value = '';
}

async function sauverNouveauClientLien(){
  const name = (document.getElementById('lienNewClientName')?.value || '').trim();
  const phone = (document.getElementById('lienNewClientPhone')?.value || '').trim();
  const city = (document.getElementById('lienNewClientCity')?.value || '').trim();

  if(!name){
    alert('Le nom du client est requis');
    document.getElementById('lienNewClientName')?.focus();
    return;
  }

  const result = await dbInsert('clients', {
    name, phone: phone || null, email: null, city: city || null, notes: null
  });

  if(!result) return;

  clients.unshift(result);

  const nameInput = document.getElementById('lienClientName');
  const phoneInput = document.getElementById('lienClientPhone');
  if(nameInput) nameInput.value = result.name;
  if(phoneInput && result.phone) phoneInput.value = result.phone;

  const dl = document.getElementById('lienClientsList');
  if(dl){ dl.innerHTML = clients.map(c => `<option value="${c.name}">`).join(''); }

  annulerNouveauClientLien();

  if(typeof renderClients === 'function') renderClients();
  if(typeof refreshAll === 'function') refreshAll();

  showToast('✅ Client créé : ' + result.name);
}

async function genererLienPersonnalise() {
  const clientName = document.getElementById('lienClientName').value.trim();
  const clientPhone = document.getElementById('lienClientPhone').value.trim();
  const totalAmount = parseFloat(document.getElementById('lienTotalAmount').value);
  const desc = document.getElementById('lienDesc').value.trim() || 'Paiement';
  const paymentType = document.getElementById('lienPaymentType').value;
  const waveLink = document.getElementById('lienWaveUrl').value.trim();

  const shootType = document.getElementById('lienShootType').value.trim();
  const shootDate = document.getElementById('lienShootDate').value || null;
  const shootLocation = document.getElementById('lienShootLocation').value.trim();
  const shootDuration = parseFloat(document.getElementById('lienShootDuration').value) || null;
  const photoCount = parseInt(document.getElementById('lienPhotoCount').value) || null;
  const shootNotes = document.getElementById('lienShootNotes').value.trim();
  const paymentMethod = document.getElementById('lienPaymentMethod').value || 'Wave';

  if(!clientName) { alert('Entrez le nom du client'); return; }
  if(!totalAmount || totalAmount <= 0) { alert('Entrez le montant total'); return; }
  if(!waveLink) { alert('Collez votre lien Wave'); return; }
  if(!waveLink.includes('pay.wave.com')) { alert('Le lien Wave semble invalide. Il doit contenir "pay.wave.com"'); return; }

   // 🆕 Lire le montant depuis le champ flex en priorité
  const flexEl = document.getElementById('lienMontantFlex');
  let montant = flexEl ? (parseFloat(flexEl.value) || 0) : 0;

  // Fallback : si le champ flex est vide, on calcule selon le type
  if(montant <= 0){
    if(paymentType === 'acompte30') montant = totalAmount * 0.30;
    else if(paymentType === 'acompte50') montant = totalAmount * 0.50;
    else montant = totalAmount;
  }

  // 🆕 Sécurité : si le type n'est pas "libre" mais que le montant diffère du calcul normal → passe en libre
  if(paymentType !== 'libre'){
    let montantAttendu = totalAmount;
    if(paymentType === 'acompte30') montantAttendu = totalAmount * 0.30;
    else if(paymentType === 'acompte50') montantAttendu = totalAmount * 0.50;

    if(Math.abs(montant - montantAttendu) > 1){
      paymentType = 'libre';
    }
  }

  const result = await dbInsert('payment_links', {
    client_name: clientName,
    client_phone: clientPhone || null,
    description: desc,
    amount: Math.round(montant),
    total_amount: Math.round(totalAmount),
    payment_type: paymentType,
    wave_link: waveLink,
    status: 'pending',
    shoot_type: shootType || null,
    shoot_date: shootDate ? new Date(shootDate).toISOString() : null,
    shoot_location: shootLocation || null,
    shoot_duration: shootDuration,
    photo_count: photoCount,
    shoot_notes: shootNotes || null,
    payment_method: paymentMethod
  });

  if(!result) return;

  paymentLinks.unshift(result);
  fermerCreerLien();
  afficherLienGenere(result);
  renderPaymentLinks();
}

function afficherLienGenere(link) {
  const ref = 'PL-' + String(link.id).padStart(4, '0');

  const params = new URLSearchParams({
    n: link.client_name || '',
    m: link.amount || 0,
    t: link.total_amount || 0,
    d: link.description || 'Paiement',
    ty: link.payment_type || 'complet',
    w: link.wave_link || '',
    ref: ref
  });
  const lien = `${APP_URL}/pay.html?${params.toString()}`;

  window.__lienCourant = {
    lien: lien,
    clientName: link.client_name || 'Client',
    desc: link.description || 'Paiement',
    montant: link.amount || 0,
    phone: link.client_phone || '',
    ref: ref,
    paymentType: link.payment_type || 'complet',
    totalAmount: link.total_amount || 0,
    shootDate: link.shoot_date || null,
    shootLocation: link.shoot_location || '',
    shootType: link.shoot_type || '',
    photoCount: link.photo_count || null,
    shootDuration: link.shoot_duration || null,
    paymentMethod: link.payment_method || ''
  };

  const typeLabels = {
    'complet': '✅ Paiement complet',
    'acompte30': '💰 Acompte 30%',
    'acompte50': '💰 Acompte 50%',
    'solde': '📌 Solde restant'
  };

  const existing = document.getElementById('lienGenereModal');
  if(existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'modal-bg show';
  modal.id = 'lienGenereModal';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-wrap"><h3>✅ Lien créé</h3><button class="close" onclick="fermerLienGenere()">×</button></div>
      <div style="background:var(--card2);border-radius:12px;padding:14px;margin-bottom:16px">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Client</div>
        <div style="font-weight:700;margin-bottom:10px">${link.client_name}</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Prestation</div>
        <div style="font-weight:600;margin-bottom:10px">${link.description}</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Type</div>
        <div style="font-weight:600;margin-bottom:10px">${typeLabels[link.payment_type] || 'Paiement'}</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Montant à payer</div>
        <div style="font-weight:700;color:var(--green);font-size:22px;margin-bottom:6px">${fmt(link.amount)}</div>
        ${link.total_amount && link.total_amount > link.amount ? `<div style="font-size:12px;color:var(--muted)">sur un total de ${fmt(link.total_amount)}</div>` : ''}
        <div style="font-size:12px;color:var(--muted);margin:10px 0 4px">Référence</div>
        <div style="font-family:monospace;font-weight:600">${ref}</div>
      </div>
      <div style="background:var(--card2);border-radius:10px;padding:12px;margin-bottom:14px">
        <div style="font-size:11px;color:var(--muted);margin-bottom:6px">🔗 Lien à envoyer au client</div>
        <div style="font-family:monospace;font-size:11px;color:var(--accent);word-break:break-all">${lien}</div>
      </div>
      <div style="background:rgba(29,200,255,.1);border-radius:10px;padding:10px;margin-bottom:14px;font-size:11px;color:var(--muted)">
        🔒 Le client verra ton portail Henzo, puis sera redirigé vers ton lien Wave.
      </div>
      <div style="display:grid;gap:8px">
        <button class="btn-primary" style="margin:0;background:var(--green);width:100%" onclick="envoyerLienWhatsAppActuel()">💬 Envoyer via WhatsApp</button>
        <button class="btn-ghost" style="margin:0;width:100%" onclick="copierLienPersoActuel()">📋 Copier le lien</button>
        <button class="btn-ghost" style="margin:0;width:100%" onclick="apercuLienActuel()">👁️ Aperçu</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function fermerLienGenere(){
  const m = document.getElementById('lienGenereModal');
  if(m) m.remove();
}

function envoyerLienWhatsAppActuel() {
  const data = window.__lienCourant;
  if(!data) { alert('Erreur : lien introuvable'); return; }
  // 🆕 Calcul intelligent du type selon le % réel
  const montantPaye = Number(data.montant) || 0;
  const montantTotal = Number(data.totalAmount) || 0;
  const pct = montantTotal > 0 ? Math.round((montantPaye / montantTotal) * 100) : 0;

  let typeInfo;
  if(pct >= 100){
    typeInfo = {icon: '✅', label: 'Paiement complet'};
  } else if(pct === 50){
    typeInfo = {icon: '💰', label: 'Acompte 50%'};
  } else if(pct === 30){
    typeInfo = {icon: '💰', label: 'Acompte 30%'};
  } else {
    typeInfo = {icon: '💵', label: 'Acompte ' + pct + '%'};
  }

  let message = `Bonjour ${data.clientName} 👋,\n\n`;
  message += `Voici votre lien de paiement sécurisé :\n\n`;
  message += `📝 *Prestation :* ${data.desc}\n`;

  if(data.shootDate){
    const d = new Date(data.shootDate);
    const dateStr = d.toLocaleDateString('fr-FR', {weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'});
    const timeStr = d.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'});
    message += `📅 *Date :* ${dateStr} à ${timeStr}\n`;
  }
  if(data.shootLocation){ message += `📍 *Lieu :* ${data.shootLocation}\n`; }
  if(data.shootDuration){ message += `⏱ *Durée :* ${data.shootDuration}h\n`; }
  if(data.photoCount){ message += `📷 *Photos :* ${data.photoCount}\n`; }
  message += `\n`;

  message += `${typeInfo.icon} *${typeInfo.label}*\n`;
  message += `💵 *Montant à payer :* ${fmt(data.montant)}\n`;

  if(data.totalAmount && data.totalAmount > data.montant){
    const reste = data.totalAmount - data.montant;
    message += `\n📊 *Détail du paiement :*\n`;
    message += `• Total prestation : ${fmt(data.totalAmount)}\n`;
    message += `• Vous payez maintenant : ${fmt(data.montant)}\n`;
    message += `• Reste à payer plus tard : ${fmt(reste)}\n`;
  }

  if(data.ref){ message += `\n📄 *Référence :* ${data.ref}\n`; }

  message += `\n👉 *Cliquez ici pour payer :*\n${data.lien}\n\n`;
  message += `Merci pour votre confiance !\n`;
  message += `HENZO PHOTOGRAPHIE 📸`;

  let url;
  if(data.phone) {
    const clean = data.phone.replace(/[^0-9]/g, '');
    const fullPhone = clean.startsWith('225') ? clean : '225' + clean;
    url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  } else {
    url = `https://wa.me/?text=${encodeURIComponent(message)}`;
  }
  window.open(url, '_blank');
}

function copierLienPersoActuel() {
  const data = window.__lienCourant;
  if(!data) return;

  if(navigator.clipboard) {
    navigator.clipboard.writeText(data.lien).then(() => showToast('Lien copié'));
  } else {
    const ta = document.createElement('textarea');
    ta.value = data.lien;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Lien copié');
  }
}

function apercuLienActuel() {
  const data = window.__lienCourant;
  if(!data) return;
  window.open(data.lien, '_blank');
}

// ============================================================
// REÇU PDF CLIENT
// ============================================================
function ouvrirRecuModal(linkId) {
  const l = paymentLinks.find(x => x.id === linkId);
  if(!l) { alert('Lien introuvable'); return; }

  const existing = document.getElementById('recuModal');
  if(existing) existing.remove();

  const ref = 'PL-' + String(l.id).padStart(4, '0');
  const paidDate = l.paid_at
    ? new Date(l.paid_at).toLocaleString('fr-FR', {day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'})
    : new Date().toLocaleString('fr-FR', {day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'});

  const typeLabels = {
    'complet': '✅ Paiement complet',
    'acompte30': '💰 Acompte 30%',
    'acompte50': '💰 Acompte 50%',
    'solde': '📌 Solde restant'
  };

  const modal = document.createElement('div');
  modal.className = 'modal-bg show';
  modal.id = 'recuModal';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-wrap">
        <h3>✅ Paiement reçu</h3>
        <button class="close" onclick="fermerRecuModal()">×</button>
      </div>

      <div style="text-align:center;margin-bottom:20px">
        <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--green),#10b981);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:42px;box-shadow:0 10px 30px rgba(52,211,153,.4)">✓</div>
      </div>

      <div style="background:var(--card2);border-radius:14px;padding:16px;margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--muted);font-size:12px">Client</span>
          <span style="font-weight:600">${l.client_name || '-'}</span>
        </div>
        ${l.client_phone ? `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--muted);font-size:12px">Téléphone</span>
          <span style="font-weight:600">${l.client_phone}</span>
        </div>` : ''}
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--muted);font-size:12px">Prestation</span>
          <span style="font-weight:600;text-align:right">${l.description || 'Paiement'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--muted);font-size:12px">Type</span>
          <span style="font-weight:600">${typeLabels[l.payment_type] || 'Paiement'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--muted);font-size:12px">Montant payé</span>
          <span style="font-weight:800;color:var(--green);font-size:16px">${fmt(l.amount)}</span>
        </div>
        ${l.total_amount && l.total_amount > l.amount ? `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--muted);font-size:12px">Total prestation</span>
          <span style="font-weight:600">${fmt(l.total_amount)}</span>
        </div>` : ''}
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--muted);font-size:12px">Référence</span>
          <span style="font-family:monospace;color:var(--gold-soft);font-weight:700">${ref}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0">
          <span style="color:var(--muted);font-size:12px">Payé le</span>
          <span style="font-weight:600;font-size:12px">${paidDate}</span>
        </div>
      </div>

      <div style="background:linear-gradient(135deg,rgba(245,197,66,.12),rgba(245,197,66,.05));border:1px solid rgba(245,197,66,.25);border-radius:12px;padding:12px;margin-bottom:16px;font-size:12px;color:var(--gold-soft);line-height:1.5">
        📄 <strong>Génère le reçu PDF</strong> et envoie-le au client pour qu'il ait une preuve officielle de son paiement.
      </div>

      <div style="display:grid;gap:8px">
        <button class="btn-primary" style="margin:0;background:linear-gradient(135deg,#25D366,#128C7E);width:100%;color:#fff" onclick="envoyerRecuWhatsApp(${l.id})">
          💬 Envoyer le reçu sur WhatsApp
        </button>
        <button class="btn-primary" style="margin:0;background:linear-gradient(135deg,var(--gold),#e0b02f);color:#000;width:100%" onclick="telechargerRecuClient(${l.id})">
          ⬇️ Télécharger le reçu PDF
        </button>
        <button class="btn-ghost" style="margin:0;width:100%" onclick="fermerRecuModal()">
          Fermer
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function fermerRecuModal() {
  const m = document.getElementById('recuModal');
  if(m) m.remove();
}

function genererRecuPDFClient(link) {
  if(!window.jspdf || !window.jspdf.jsPDF) {
    throw new Error('Le générateur de PDF n\'est pas chargé. Vérifie ta connexion.');
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pageWidth = 210;
  const margin = 14;
  const ref = 'PL-' + String(link.id).padStart(4, '0');
  const paidDate = link.paid_at ? new Date(link.paid_at) : new Date();

  const cleanStr = (s) => String(s || '')
    .replace(/[\u202F\u00A0\u2009]/g, ' ')
    .replace(/[—–]/g, '-')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/…/g, '...');

  const formatNum = (n) => cleanStr(new Intl.NumberFormat('fr-FR').format(Math.round(n)));

  const typeLabels = {
    'complet': 'Paiement complet',
    'acompte30': 'Acompte 30%',
    'acompte50': 'Acompte 50%',
    'solde': 'Solde restant'
  };

  doc.setFillColor(107, 142, 255);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('HENZO PHOTOGRAPHIE', margin, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Photographe professionnel · Côte d\'Ivoire', margin, 25);
  doc.text('WhatsApp : +225 01 70 99 89 64', margin, 31);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('REÇU DE PAIEMENT', pageWidth - margin, 18, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('N° ' + ref, pageWidth - margin, 25, { align: 'right' });
  doc.text(paidDate.toLocaleDateString('fr-FR'), pageWidth - margin, 31, { align: 'right' });

  doc.setFillColor(240, 255, 245);
  doc.roundedRect(margin, 50, pageWidth - margin * 2, 14, 2, 2, 'F');
  doc.setTextColor(16, 130, 80);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PAIEMENT REÇU ET CONFIRMÉ', pageWidth / 2, 59, { align: 'center' });

  let y = 78;
  const colWidth = (pageWidth - margin * 2 - 6) / 2;

  doc.setTextColor(120, 120, 120);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('ÉMETTEUR', margin, y);

  doc.setTextColor(40, 40, 40);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('HENZO PHOTOGRAPHIE', margin, y + 6);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 90, 90);
  doc.text('Photographe professionnel', margin, y + 12);
  doc.text('Abidjan · Bouaké, Côte d\'Ivoire', margin, y + 17);
  doc.text('+225 01 70 99 89 64', margin, y + 22);
  doc.text('henzophotographie@gmail.com', margin, y + 27);

  const colRight = margin + colWidth + 6;
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT', colRight, y);

  doc.setTextColor(40, 40, 40);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(cleanStr(link.client_name) || '-', colRight, y + 6);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 90, 90);
  if(link.client_phone) doc.text('Tel : ' + cleanStr(link.client_phone), colRight, y + 12);

  y += 38;

  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setTextColor(120, 120, 120);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('DÉTAILS DE LA PRESTATION', margin, y);
  y += 8;

  const details = [];
  if(link.shoot_type) details.push(['Type', cleanStr(link.shoot_type)]);
  details.push(['Description', cleanStr(link.description) || 'Paiement']);

  if(link.shoot_date){
    const d = new Date(link.shoot_date);
    const dateStr = d.toLocaleDateString('fr-FR', {weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'});
    const timeStr = d.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'});
    details.push(['Date du shoot', dateStr]);
    details.push(['Heure', timeStr]);
  }
  if(link.shoot_location) details.push(['Lieu', cleanStr(link.shoot_location)]);
  if(link.shoot_duration) details.push(['Durée', link.shoot_duration + ' h']);
  if(link.photo_count) details.push(['Nombre de photos', link.photo_count + ' photos']);
  if(link.payment_method) details.push(['Mode de paiement', cleanStr(link.payment_method)]);

  doc.setTextColor(40, 40, 40);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  details.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(90, 90, 90);
    doc.text(label + ' :', margin, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    const valueLines = doc.splitTextToSize(value, pageWidth - margin * 2 - 50);
    doc.text(valueLines, margin + 45, y);
    y += Math.max(6, valueLines.length * 5);

    if(y > 240){ doc.addPage(); y = 20; }
  });

  if(link.shoot_notes){
    y += 4;
    doc.setDrawColor(240, 240, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(90, 90, 90);
    doc.setFontSize(8);
    doc.text('NOTES', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    const noteLines = doc.splitTextToSize(cleanStr(link.shoot_notes), pageWidth - margin * 2);
    noteLines.forEach(line => {
      if(y > 270){ doc.addPage(); y = 20; }
      doc.text(line, margin, y);
      y += 5;
    });
  }

  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.setFont('helvetica', 'normal');
  doc.text('Type de paiement : ' + (typeLabels[link.payment_type] || 'Paiement'), margin, y);

  if(link.created_at){
    const createdStr = new Date(link.created_at).toLocaleDateString('fr-FR');
    doc.text('Lien émis le : ' + createdStr, pageWidth - margin, y, { align: 'right' });
  }

  y += 14;

  const boxHeight = 48;
  doc.setFillColor(248, 250, 255);
  doc.roundedRect(margin, y, pageWidth - margin * 2, boxHeight, 3, 3, 'F');

  doc.setDrawColor(107, 142, 255);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, pageWidth - margin * 2, boxHeight, 3, 3, 'S');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 90, 120);
  doc.text('MONTANT PAYÉ', margin + 8, y + 13);

  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 130, 80);
  const amountStr = formatNum(link.amount) + ' FCFA';
  doc.text(amountStr, margin + 8, y + 32);

  if(link.total_amount && link.total_amount > link.amount) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    const totalStr = 'sur un total de ' + formatNum(link.total_amount) + ' FCFA';
    const restStr = 'Reste à payer : ' + formatNum(link.total_amount - link.amount) + ' FCFA';
    doc.text(totalStr, margin + 8, y + 42);
    doc.text(restStr, pageWidth - margin - 8, y + 42, { align: 'right' });
  } else {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('Paiement intégral', margin + 8, y + 42);
  }

  y += boxHeight + 12;

  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'normal');
  doc.text('Ce reçu atteste du paiement reçu par HENZO PHOTOGRAPHIE.', pageWidth / 2, y + 8, { align: 'center' });
  doc.text('Merci pour votre confiance !', pageWidth / 2, y + 14, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('henzophotographie@gmail.com  ·  +225 01 70 99 89 64  ·  Côte d\'Ivoire', pageWidth / 2, 285, { align: 'center' });

  return doc;
}

function telechargerRecuClient(linkId) {
  const link = paymentLinks.find(x => x.id === linkId);
  if(!link) { alert('Lien introuvable'); return; }

  try {
    const doc = genererRecuPDFClient(link);
    const ref = 'PL-' + String(link.id).padStart(4, '0');
    const safeName = (link.client_name || 'client').replace(/[^a-zA-Z0-9]/g, '-');
    doc.save(`Recu-${ref}-${safeName}.pdf`);
    showToast('Reçu téléchargé');
  } catch(e) {
    console.error(e);
    alert('Erreur PDF : ' + e.message);
  }
}

async function envoyerRecuWhatsApp(linkId) {
  const link = paymentLinks.find(x => x.id === linkId);
  if(!link) { alert('Lien introuvable'); return; }

  const ref = 'PL-' + String(link.id).padStart(4, '0');
  const amountStr = fmt(link.amount);

  const message =
    `Bonjour ${link.client_name || ''} 👋,\n\n` +
    `Merci pour votre paiement de ${amountStr} 💚\n\n` +
    `📝 Prestation : ${link.description || 'Paiement'}\n` +
    `📄 Référence : ${ref}\n` +
    `✅ Statut : PAYÉ\n\n` +
    `Vous trouverez votre reçu en pièce jointe 📎\n\n` +
    `Merci pour votre confiance !\n` +
    `HENZO PHOTOGRAPHIE 📸`;

  let waUrl;
  if(link.client_phone) {
    const clean = link.client_phone.replace(/[^0-9]/g, '');
    const fullPhone = clean.startsWith('225') ? clean : '225' + clean;
    waUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  } else {
    waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  }

  try {
    const doc = genererRecuPDFClient(link);
    const pdfBlob = doc.output('blob');
    const fileName = `Recu-${ref}.pdf`;
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

    if(navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'Reçu Henzo Photographie',
        text: message
      });
      showToast('Reçu partagé');
      return;
    }
  } catch(shareErr) {
    if(shareErr.name === 'AbortError') return;
    console.warn('Web Share indisponible, fallback WhatsApp Web:', shareErr);
  }

  try {
    const doc = genererRecuPDFClient(link);
    doc.save(`Recu-${ref}.pdf`);
    setTimeout(() => { window.open(waUrl, '_blank'); }, 500);
    showToast('Reçu téléchargé · Ajoute-le sur WhatsApp');
  } catch(e) {
    console.error(e);
    alert('Erreur PDF : ' + e.message);
  }
}

async function marquerLienPaye(id) {
  const link = paymentLinks.find(l => l.id === id);
  if(!link) { alert('Lien introuvable'); return; }

  if(!confirm(`Confirmer que tu as reçu ${fmt(link.amount)} pour "${link.description}" ?`)) return;

  const result = await dbUpdate('payment_links', id, {
    status: 'paid',
    paid_at: new Date().toISOString()
  });
  if(!result) return;

  const idx = paymentLinks.findIndex(l => l.id === id);
  if(idx >= 0) paymentLinks[idx] = result;

  const txResult = await dbInsert('transactions', {
    type: 'revenu',
    amount: Number(link.amount),
    category: 'Shooting photo',
    note: (link.description || 'Paiement') + ' · ' + (link.client_name || ''),
    date: todayStr()
  });

  if(txResult){ txs.unshift(txResult); }

  renderPaymentLinks();
  refreshAll();
  showToast(fmt(link.amount) + ' ajouté aux revenus');

  setTimeout(() => {
    demarrerAssistant({
      amount: Number(link.amount),
      prestationType: link.description || 'Paiement',
      clientName: link.client_name || '',
      location: '',
      source: 'Lien de paiement'
    });
  }, 500);
}

async function supprimerLien(id) {
  if(!confirm('Supprimer ce lien ?')) return;
  const ok = await dbDelete('payment_links', id);
  if(!ok) return;
  paymentLinks = paymentLinks.filter(l => l.id !== id);
  renderPaymentLinks();
}

function renderPaymentLinks() {
  const el = document.getElementById('paymentLinksList');
  if(!el) return;
  if(paymentLinks.length === 0){ el.innerHTML = '<div class="empty">Aucun lien créé</div>'; return; }

  const pending = paymentLinks.filter(l => l.status === 'pending');
  const paid = paymentLinks.filter(l => l.status === 'paid');

  let html = '';
  if(pending.length > 0){
    html += `<div style="font-size:11px;color:var(--yellow);font-weight:700;text-transform:uppercase;margin-bottom:8px;letter-spacing:1px">⏳ En attente (${pending.length})</div>`;
    html += pending.map(l => renderLienItem(l, false)).join('');
  }
  if(paid.length > 0){
    html += `<div style="font-size:11px;color:var(--green);font-weight:700;text-transform:uppercase;margin:14px 0 8px;letter-spacing:1px">✅ Payés (${paid.length})</div>`;
    html += paid.map(l => renderLienItem(l, true)).join('');
  }
  el.innerHTML = html;
}

function renderLienItem(l, isPaid) {
  const ref = 'PL-' + String(l.id).padStart(4, '0');
  const dateStr = new Date(l.created_at).toLocaleDateString('fr-FR', {day:'2-digit', month:'short'});
  const borderColor = isPaid ? 'var(--green)' : 'var(--yellow)';
  const typeLabels = { 'complet': '✅ Complet', 'acompte30': '💰 Acompte 30%', 'acompte50': '💰 Acompte 50%', 'solde': '📌 Solde' };

  return `<div style="background:var(--card2);border-radius:12px;padding:12px;margin-bottom:8px;border-left:3px solid ${borderColor}">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;gap:8px">
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:14px;margin-bottom:2px">${l.client_name}</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px">${l.description || 'Paiement'}</div>
        <div style="font-size:11px;color:var(--accent);font-weight:600">${typeLabels[l.payment_type] || 'Paiement'}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-weight:700;color:${isPaid ? 'var(--green)' : 'var(--yellow)'};font-size:15px">${fmt(l.amount)}</div>
        ${l.total_amount && l.total_amount > l.amount ? `<div style="font-size:10px;color:var(--muted)">/ ${fmt(l.total_amount)}</div>` : ''}
        <div style="font-size:10px;color:var(--muted);font-family:monospace;margin-top:2px">${ref}</div>
      </div>
    </div>
    <div style="font-size:11px;color:var(--muted);margin-bottom:8px">📅 ${dateStr}${l.client_phone ? ' · 📞 ' + l.client_phone : ''}</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${!isPaid
        ? `<button class="btn-ghost" style="flex:1;margin:0;padding:6px;font-size:11px;background:rgba(46,204,113,.1);color:var(--green);border-color:var(--green)" onclick="marquerLienPaye(${l.id})">✅ Paiement reçu</button>`
        : `<button class="btn-ghost" style="flex:1;margin:0;padding:6px;font-size:11px;background:rgba(245,197,66,.12);color:var(--gold-soft);border-color:var(--gold-soft);font-weight:700" onclick="ouvrirRecuModal(${l.id})">📄 Voir le reçu</button>`
      }
      <button class="btn-ghost" style="flex:1;margin:0;padding:6px;font-size:11px" onclick="revOirLien(${l.id})">🔗 Revoir</button>
      <button class="btn-ghost" style="margin:0;padding:6px;font-size:11px;border-color:var(--red);color:var(--red)" onclick="supprimerLien(${l.id})">🗑</button>
    </div>
  </div>`;
}

function revOirLien(id) {
  const l = paymentLinks.find(x => x.id === id);
  if(l) afficherLienGenere(l);
}

// ============================================================
// GUIDE FINANCIER INTELLIGENT
// ============================================================
const REGLES_REPARTITION = {
  'mariage':    { epargne: 30, charges: 40, libre: 30, icon: '💍', label: 'Mariage' },
  'dot':        { epargne: 30, charges: 40, libre: 30, icon: '💐', label: 'Dot' },
  'studio':     { epargne: 25, charges: 45, libre: 30, icon: '🎬', label: 'Studio' },
  'shooting':   { epargne: 20, charges: 50, libre: 30, icon: '📸', label: 'Shooting' },
  'corporate':  { epargne: 25, charges: 45, libre: 30, icon: '💼', label: 'Corporate' },
  'drone':      { epargne: 30, charges: 40, libre: 30, icon: '🚁', label: 'Drone' },
  'default':    { epargne: 20, charges: 50, libre: 30, icon: '💰', label: 'Paiement' }
};

function detecterTypePrestation(description){
  const d = (description || '').toLowerCase();
  if(d.includes('mariage'))    return 'mariage';
  if(d.includes('dot'))        return 'dot';
  if(d.includes('studio'))     return 'studio';
  if(d.includes('corporate') || d.includes('pme') || d.includes('entreprise')) return 'corporate';
  if(d.includes('drone'))      return 'drone';
  if(d.includes('shooting') || d.includes('shoot') || d.includes('séance') || d.includes('seance')) return 'shooting';
  return 'default';
}

function ouvrirGuideRepartition(linkId) {
  const link = paymentLinks.find(l => l.id === linkId);
  if(!link) return;

  const existing = document.getElementById('guideRepartitionModal');
  if(existing) existing.remove();

  const montant = Number(link.amount);
  const type = detecterTypePrestation(link.description);
  const regle = REGLES_REPARTITION[type];

  const epargne = Math.round(montant * regle.epargne / 100);
  const charges = Math.round(montant * regle.charges / 100);
  const libre = montant - epargne - charges;

  const modal = document.createElement('div');
  modal.className = 'modal-bg show';
  modal.id = 'guideRepartitionModal';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-wrap">
        <h3>🧠 Guide de répartition</h3>
        <button class="close" onclick="fermerGuideRepartition()">×</button>
      </div>

      <div style="background:linear-gradient(135deg,rgba(52,211,153,.15),rgba(107,142,255,.10));border-radius:14px;padding:16px;margin-bottom:16px;text-align:center">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Montant reçu</div>
        <div style="font-size:32px;font-weight:800;color:var(--green);letter-spacing:-1px">${fmt(montant)}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:6px">${regle.icon} ${regle.label} · ${link.client_name || ''}</div>
      </div>

      <div style="background:var(--card2);border-radius:12px;padding:14px;margin-bottom:16px">
        <div style="font-size:12px;color:var(--muted);margin-bottom:10px">💡 Suggestion automatique :</div>

        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
          <div><div style="font-weight:700;color:var(--green);font-size:14px">💰 Épargne</div><div style="font-size:11px;color:var(--muted)">${regle.epargne}% · Priorité absolue</div></div>
          <div style="font-weight:800;color:var(--green);font-size:16px">${fmt(epargne)}</div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
          <div><div style="font-weight:700;color:var(--yellow);font-size:14px">🏠 Charges</div><div style="font-size:11px;color:var(--muted)">${regle.charges}% · Loyer, transport</div></div>
          <div style="font-weight:800;color:var(--yellow);font-size:16px">${fmt(charges)}</div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0">
          <div><div style="font-weight:700;color:var(--accent);font-size:14px">🎉 Libre</div><div style="font-size:11px;color:var(--muted)">${regle.libre}% · Plaisir</div></div>
          <div style="font-weight:800;color:var(--accent);font-size:16px">${fmt(libre)}</div>
        </div>
      </div>

      <div style="display:grid;gap:8px">
        <button class="btn-primary" style="margin:0;background:linear-gradient(135deg,var(--green),#10b981);width:100%;color:#000;font-weight:800" onclick="appliquerRepartition(${link.id}, ${epargne})">
          ✅ Appliquer l'épargne (${fmt(epargne)})
        </button>
        <button class="btn-ghost" style="margin:0;width:100%" onclick="fermerGuideRepartition()">Plus tard</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function appliquerRepartition(linkId, montantEpargne){
  if(!confirm(`Créer une épargne de ${fmt(montantEpargne)} ?`)) return;

  const result = await dbInsert('transactions', {
    type: 'depense',
    amount: montantEpargne,
    category: 'Épargne',
    note: 'Épargne automatique (guide)',
    date: todayStr()
  });

  if(!result){ alert('Erreur lors de la création'); return; }

  txs.unshift(result);
  fermerGuideRepartition();
  refreshAll();
  showToast(fmt(montantEpargne) + ' placé en épargne ! 🎯');
}

function fermerGuideRepartition(){
  const m = document.getElementById('guideRepartitionModal');
  if(m) m.remove();
}

// ============================================================
// POPUP CUSTOM DANS L'APP
// ============================================================
function afficherPopupNotif(title, message, emoji = '🔔', duration = 10000){
  if(!duration || duration < 8000) duration = 10000;

  const old = document.getElementById('henzoPopup');
  if(old) old.remove();

  if(!document.getElementById('henzoPopupStyles')){
    const style = document.createElement('style');
    style.id = 'henzoPopupStyles';
    style.textContent = `
      @keyframes popupEmojiPulse{
        0%, 100%{ transform:scale(1); }
        50%{ transform:scale(1.08); }
      }
      @keyframes popupSoftGlow{
        0%, 100%{ box-shadow: 0 20px 48px rgba(0,0,0,.60), 0 0 0 1px rgba(255,255,255,.06) inset, 0 0 30px rgba(107,142,255,.20); }
        50%      { box-shadow: 0 20px 48px rgba(0,0,0,.60), 0 0 0 1px rgba(255,255,255,.06) inset, 0 0 50px rgba(107,142,255,.45); }
      }
    `;
    document.head.appendChild(style);
  }

  const popup = document.createElement('div');
  popup.id = 'henzoPopup';
  popup.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%) translateY(-180%) scale(0.85);
    max-width: 92%;
    width: 400px;
    background: linear-gradient(135deg, #141822 0%, #1c2130 100%);
    border: 1px solid rgba(107,142,255,.45);
    border-radius: 18px;
    padding: 16px 18px 20px 18px;
    z-index: 99999;
    display: flex;
    align-items: center;
    gap: 14px;
    transition: transform .6s cubic-bezier(.34,1.56,.64,1), opacity .4s ease;
    opacity: 0;
    pointer-events: auto;
    cursor: pointer;
    overflow: hidden;
    animation: popupSoftGlow 3s ease-in-out infinite;
  `;
  popup.innerHTML = `
    <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--pink));display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;box-shadow:0 8px 20px rgba(107,142,255,.45);animation: popupEmojiPulse 2s ease-in-out infinite;">${emoji}</div>
    <div style="flex:1;min-width:0">
      <div style="font-weight:700;font-size:14px;color:var(--text);margin-bottom:3px">${title}</div>
      <div style="font-size:13px;color:var(--muted);line-height:1.4">${message}</div>
    </div>
    <button onclick="event.stopPropagation();fermerPopupNotif()" style="background:rgba(255,255,255,.08);border:none;color:var(--muted);width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:background .2s;">×</button>
    <div id="henzoPopupProgress" style="position:absolute;bottom:0;left:0;height:3px;background:linear-gradient(90deg,var(--accent),var(--pink));width:100%;border-radius:0 0 18px 18px;"></div>
  `;

  popup.onclick = () => fermerPopupNotif();
  document.body.appendChild(popup);

  requestAnimationFrame(() => {
    popup.style.transform = 'translateX(-50%) translateY(0) scale(1)';
    popup.style.opacity = '1';
  });

  const bar = popup.querySelector('#henzoPopupProgress');
  if(bar){
    bar.style.transition = 'width ' + duration + 'ms linear';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { bar.style.width = '0%'; });
    });
  }

  if(navigator.vibrate){
    try { navigator.vibrate([100, 50, 100]); } catch(e){}
  }

  window.__popupTimer = setTimeout(() => { fermerPopupNotif(); }, duration);
}

function fermerPopupNotif(){
  const popup = document.getElementById('henzoPopup');
  if(!popup) return;
  if(window.__popupTimer){
    clearTimeout(window.__popupTimer);
    window.__popupTimer = null;
  }
  popup.style.transform = 'translateX(-50%) translateY(-180%) scale(0.9)';
  popup.style.opacity = '0';
  setTimeout(() => popup.remove(), 500);
}

function testerPopupNotif(){
  const msg = getNotificationMessage('midday');
  afficherPopupNotif(msg.i + ' ' + msg.t, msg.m, msg.i, 6000);
}

// ============================================================
// MODULE ENTRÉE D'ARGENT DÉTAILLÉE
// ============================================================
let currentRevenueType = 'complet';

function openRevenueModal(){
  const modal = document.getElementById('revenueModalBg');
  if(!modal) return;

  document.getElementById('revAmount').value = '';
  document.getElementById('revClientName').value = '';
  document.getElementById('revPrestationType').value = 'Mariage';
  document.getElementById('revPaymentMethod').value = 'Wave';
  document.getElementById('revLocation').value = '';
  document.getElementById('revDuration').value = '';
  document.getElementById('revPhotoCount').value = '';
  document.getElementById('revDetails').value = '';

  const now = new Date();
  const localISO = new Date(now.getTime() - now.getTimezoneOffset()*60000).toISOString().slice(0,16);
  document.getElementById('revDate').value = localISO;

  const dl = document.getElementById('revClientsList');
  if(dl){ dl.innerHTML = clients.map(c => `<option value="${c.name}">`).join(''); }

  setRevenueType('complet');

  const body = document.getElementById('revDetailsBody');
  if(body) body.style.display = 'none';
  const arrow = document.getElementById('revDetailsArrow');
  if(arrow) arrow.classList.remove('open');

  modal.classList.add('show');
  setTimeout(() => document.getElementById('revAmount')?.focus(), 300);
}

function closeRevenueModal(){
  const modal = document.getElementById('revenueModalBg');
  if(modal) modal.classList.remove('show');
}

function setRevenueType(type){
  currentRevenueType = type;
  document.getElementById('revTypeComplet').classList.toggle('active', type === 'complet');
  document.getElementById('revTypeAcompte').classList.toggle('active', type === 'acompte');
  document.getElementById('revTypeSolde').classList.toggle('active', type === 'solde');
}

function toggleRevenueDetails(){
  const body = document.getElementById('revDetailsBody');
  const arrow = document.getElementById('revDetailsArrow');
  if(!body) return;
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if(arrow) arrow.classList.toggle('open', !isOpen);
}

async function saveRevenue(){
  const amount = parseFloat(document.getElementById('revAmount').value);
  if(!amount || amount <= 0){ alert('Indique un montant valide'); return; }

  const clientName = document.getElementById('revClientName').value.trim();
  const prestationType = document.getElementById('revPrestationType').value;
  const paymentMethod = document.getElementById('revPaymentMethod').value;
  const dateInput = document.getElementById('revDate').value;
  const location = document.getElementById('revLocation').value.trim();
  const duration = parseFloat(document.getElementById('revDuration').value) || null;
  const photoCount = parseInt(document.getElementById('revPhotoCount').value) || null;
  const details = document.getElementById('revDetails').value.trim();

  let clientId = null;
  if(clientName){
    const existing = clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
    if(existing) clientId = existing.id;
  }

  const noteParts = [];
  if(clientName) noteParts.push(clientName);
  noteParts.push(prestationType);
  const noteSummary = noteParts.join(' · ');

  const now = new Date();
  const data = {
    type: 'revenu',
    amount: amount,
    category: 'Shooting photo',
    note: noteSummary,
    date: dateInput ? dateInput.slice(0,10) : todayStr(),
    created_at: now.toISOString(),
    client_id: clientId,
    client_name: clientName || null,
    payment_method: paymentMethod,
    prestation_type: prestationType,
    location: location || null,
    amount_type: currentRevenueType,
    duration_hours: duration,
    photo_count: photoCount,
    details: details || null
  };

  const result = await dbInsert('transactions', data);
  if(!result){ alert('Erreur lors de la sauvegarde'); return; }

  txs.unshift(result);
  closeRevenueModal();
  refreshAll();
  showToast('💰 ' + fmt(amount) + ' enregistré');

  setTimeout(() => {
    demarrerAssistant({
      amount: amount,
      prestationType: prestationType,
      clientName: clientName,
      location: location,
      source: paymentMethod
    });
  }, 400);
}

function formatTxDetail(t){
  const parts = [];
  if(t.client_name) parts.push('👤 ' + t.client_name);
  if(t.prestation_type) parts.push('📸 ' + t.prestation_type);
  if(t.payment_method && t.payment_method !== 'Espèces') parts.push('💳 ' + t.payment_method);
  if(t.location) parts.push('📍 ' + t.location);
  if(t.photo_count) parts.push('📷 ' + t.photo_count + ' photos');
  if(t.duration_hours) parts.push('⏱ ' + t.duration_hours + 'h');
  return parts.join(' · ');
}

// ============================================================
// ASSISTANT FINANCIER CONVERSATIONNEL
// ============================================================
let assistantData = null;
let assistantStep = 0;
let assistantAnswers = {};

function getSourceIcon(source){
  if(!source) return '💰';
  const s = source.toLowerCase();
  if(s.includes('séance') || s.includes('seance')) return '📸';
  if(s.includes('lien')) return '🔗';
  if(s.includes('entrée')) return '💰';
  return '💰';
}

function demarrerAssistant(data){
  assistantData = data;
  assistantStep = 0;
  assistantAnswers = {
    hasCharges: null,
    chargesAmount: 0,
    chargesDetails: '',
    hasGoal: null,
    goalId: null,
    epargneAmount: 0,
    epargnePercent: 0,
    freeAmount: 0,
    useAI: false
  };

  const modal = document.getElementById('assistantModalBg');
  if(modal) modal.classList.add('show');

  renderAssistantStep();
}

function closeAssistant(){
  const modal = document.getElementById('assistantModalBg');
  if(modal) modal.classList.remove('show');
  assistantData = null;
  assistantStep = 0;
}

function detecterTypeFromPrestation(prestationType){
  const d = (prestationType || '').toLowerCase();
  if(d.includes('mariage')) return 'mariage';
  if(d.includes('dot')) return 'dot';
  if(d.includes('studio')) return 'studio';
  if(d.includes('corporate')) return 'corporate';
  if(d.includes('drone')) return 'drone';
  if(d.includes('shoot') || d.includes('extérieur') || d.includes('événement') || d.includes('evenement')) return 'shooting';
  return 'default';
}

function renderAssistantStep(){
  const el = document.getElementById('assistantStep');
  const bar = document.getElementById('assistantProgressBar');
  if(!el) return;

  const totalSteps = 4;
  const progress = (assistantStep / totalSteps) * 100;
  if(bar) bar.style.width = progress + '%';

  const m = assistantData.amount;
  const regle = REGLES_REPARTITION[detecterTypeFromPrestation(assistantData.prestationType)];

  if(assistantStep === 0){
    el.innerHTML = `
      <div style="background:linear-gradient(135deg,rgba(52,211,153,.15),rgba(107,142,255,.10));border-radius:14px;padding:18px;margin-bottom:20px;text-align:center">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Entrée enregistrée</div>
        <div style="font-size:32px;font-weight:800;color:var(--green);letter-spacing:-1px">${fmt(m)}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:6px">
          ${getSourceIcon(assistantData.source)} ${assistantData.source || 'Entrée'} · ${assistantData.prestationType}${assistantData.clientName ? ' · ' + assistantData.clientName : ''}
        </div>
      </div>

      <div style="background:var(--card2);border-radius:12px;padding:14px;margin-bottom:20px;font-size:14px;line-height:1.6;color:var(--text)">
        Bonjour Henzo 👋<br><br>
        Je vais te poser <strong>4 questions rapides</strong> pour t'aider à répartir intelligemment cet argent.<br><br>
        Ça prend <strong>moins d'1 minute</strong>. Prêt ?
      </div>

      <button class="btn-primary" style="margin:0;width:100%;padding:16px;font-size:16px" onclick="assistantNext()">🚀 C'est parti !</button>
      <button class="btn-ghost" style="margin-top:8px;width:100%" onclick="closeAssistant()">Ignorer</button>
    `;
    return;
  }

  if(assistantStep === 1){
    el.innerHTML = `
      <div style="font-size:13px;color:var(--muted);margin-bottom:6px">Question 1 / 4</div>
      <div style="font-size:17px;font-weight:700;line-height:1.4;margin-bottom:16px">
        💸 As-tu des <strong>charges</strong> liées à cette prestation ?<br>
        <span style="font-size:13px;color:var(--muted);font-weight:400">(transport, assistant, location matériel, repas client...)</span>
      </div>

      <div style="background:linear-gradient(135deg,rgba(107,142,255,.10),rgba(255,126,179,.05));border-left:3px solid var(--accent);border-radius:10px;padding:12px;margin-bottom:16px;font-size:12px;color:var(--muted);line-height:1.5">
        💡 <strong>Exemple :</strong> Un mariage à Bouaké = 15 000 FCFA de transport + 10 000 FCFA d'assistant.
      </div>

      <div class="type-toggle" style="margin-bottom:14px">
        <button type="button" id="aChargesNon" class="${assistantAnswers.hasCharges === false ? 'active' : ''}" onclick="assistantSetCharges(false)">❌ Non, aucune</button>
        <button type="button" id="aChargesOui" class="${assistantAnswers.hasCharges === true ? 'active' : ''}" onclick="assistantSetCharges(true)">✅ Oui</button>
      </div>

      <div id="assistantChargesBox" style="display:${assistantAnswers.hasCharges === true ? 'block' : 'none'}">
        <label>Montant total des charges (FCFA)</label>
        <input type="number" id="assistantChargesAmount" inputmode="decimal" placeholder="Ex: 25000" value="${assistantAnswers.chargesAmount || ''}" oninput="assistantUpdateChargesAmount()">

        <label>Détail des charges (optionnel)</label>
        <textarea id="assistantChargesDetails" rows="2" placeholder="Ex: 15k transport + 10k assistant">${assistantAnswers.chargesDetails || ''}</textarea>
      </div>

      <button class="btn-primary" style="margin-top:14px;width:100%;padding:14px" onclick="assistantValidateCharges()">Continuer →</button>
    `;
    return;
  }

  if(assistantStep === 2){
    const activeGoals = coffres.filter(c => Number(c.current) < Number(c.goal));

    el.innerHTML = `
      <div style="font-size:13px;color:var(--muted);margin-bottom:6px">Question 2 / 4</div>
      <div style="font-size:17px;font-weight:700;line-height:1.4;margin-bottom:16px">
        🎯 Sur quel <strong>objectif d'épargne</strong> veux-tu mettre une partie de cet argent ?
      </div>

      ${activeGoals.length === 0 ? `
        <div style="background:rgba(245,197,66,.12);border:1px solid rgba(245,197,66,.30);border-radius:12px;padding:14px;margin-bottom:16px;font-size:13px;color:var(--gold-soft);line-height:1.5">
          ⚠️ Tu n'as pas encore d'objectif actif.
        </div>
      ` : `
        <div style="display:grid;gap:8px;margin-bottom:16px">
          ${activeGoals.map(c => {
            const pct = (Number(c.current) / Number(c.goal) * 100).toFixed(0);
            const emoji = c.emoji || getCoffreEmoji(c.name);
            const unit = c.unit || 'FCFA';
            const isMoney = (c.goal_type || 'money') === 'money';
            const goalStr = isMoney ? fmt(c.goal) : c.goal + ' ' + unit;
            const currentStr = isMoney ? fmt(c.current) : c.current + ' ' + unit;
            const selected = assistantAnswers.goalId === c.id;
            return `
              <button type="button" onclick="assistantSetGoal(${c.id})" style="background:${selected ? 'linear-gradient(135deg,rgba(107,142,255,.20),rgba(107,142,255,.08))' : 'var(--card2)'};border:1px solid ${selected ? 'var(--accent)' : 'var(--border)'};border-radius:12px;padding:12px 14px;text-align:left;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:10px;font-family:inherit;color:var(--text);width:100%;">
                <div style="flex:1;min-width:0">
                  <div style="font-weight:700;font-size:14px;margin-bottom:3px">${emoji} ${c.name}</div>
                  <div style="font-size:11px;color:var(--muted)">${currentStr} / ${goalStr} · ${pct}%</div>
                </div>
                ${selected ? '<div style="color:var(--accent);font-size:22px;font-weight:700">✓</div>' : ''}
              </button>
            `;
          }).join('')}
          <button type="button" onclick="assistantSetGoal(null)" style="background:${assistantAnswers.goalId === null ? 'linear-gradient(135deg,rgba(107,142,255,.20),rgba(107,142,255,.08))' : 'var(--card2)'};border:1px solid ${assistantAnswers.goalId === null ? 'var(--accent)' : 'var(--border)'};border-radius:12px;padding:12px 14px;text-align:center;cursor:pointer;font-family:inherit;color:var(--text);width:100%;font-weight:600;font-size:13px;">🤷 Aucun objectif pour l'instant</button>
        </div>
      `}

      <button class="btn-primary" style="margin-top:10px;width:100%;padding:14px" onclick="assistantNext()">Continuer →</button>
    `;
    return;
  }

  if(assistantStep === 3){
    const suggested = Math.round(m * regle.epargne / 100);
    const userAmount = assistantAnswers.epargneAmount || suggested;

    el.innerHTML = `
      <div style="font-size:13px;color:var(--muted);margin-bottom:6px">Question 3 / 4</div>
      <div style="font-size:17px;font-weight:700;line-height:1.4;margin-bottom:16px">
        💰 Combien veux-tu <strong>épargner</strong> sur ce montant ?
      </div>

      <div style="background:linear-gradient(135deg,rgba(52,211,153,.12),rgba(107,142,255,.05));border-radius:12px;padding:12px 14px;margin-bottom:16px;font-size:13px;color:var(--text);line-height:1.5">
        💡 <strong>Suggestion pour ${regle.label} :</strong> ${regle.epargne}% = <strong style="color:var(--green)">${fmt(suggested)}</strong>
      </div>

      <label>Montant à épargner (FCFA)</label>
      <input type="number" id="assistantEpargneAmount" inputmode="decimal" value="${userAmount}" placeholder="0" oninput="assistantUpdateEpargne()" style="font-size:20px;font-weight:700;text-align:center;color:var(--green)">

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px">
        <button class="btn-ghost" style="margin:0;padding:8px;font-size:11px" onclick="assistantQuickEpargne(${Math.round(m*0.1)})">10%</button>
        <button class="btn-ghost" style="margin:0;padding:8px;font-size:11px" onclick="assistantQuickEpargne(${Math.round(m*0.2)})">20%</button>
        <button class="btn-ghost" style="margin:0;padding:8px;font-size:11px;background:rgba(52,211,153,.10);color:var(--green);border-color:var(--green)" onclick="assistantQuickEpargne(${suggested})">${regle.epargne}% ✓</button>
        <button class="btn-ghost" style="margin:0;padding:8px;font-size:11px" onclick="assistantQuickEpargne(${Math.round(m*0.5)})">50%</button>
      </div>

      <button class="btn-primary" style="margin-top:16px;width:100%;padding:14px" onclick="assistantValidateEpargne()">Continuer →</button>
    `;
    return;
  }

  if(assistantStep === 4){
    const charges = assistantAnswers.chargesAmount || 0;
    const epargne = assistantAnswers.epargneAmount || 0;
    const libre = m - charges - epargne;

    if(libre < 0){
      el.innerHTML = `
        <div style="text-align:center;padding:20px 0">
          <div style="font-size:60px;margin-bottom:10px">⚠️</div>
          <div style="font-size:18px;font-weight:700;margin-bottom:10px">Attention !</div>
          <div style="color:var(--muted);font-size:14px;line-height:1.6;margin-bottom:20px">Tes charges + épargne dépassent le montant reçu.<br>Réajuste pour continuer.</div>
          <button class="btn-ghost" onclick="assistantStep=3;renderAssistantStep()">← Modifier</button>
        </div>
      `;
      return;
    }

    const goalObj = assistantAnswers.goalId ? coffres.find(c => c.id === assistantAnswers.goalId) : null;
    const goalName = goalObj ? (goalObj.emoji || getCoffreEmoji(goalObj.name)) + ' ' + goalObj.name : null;

    el.innerHTML = `
      <div style="font-size:13px;color:var(--muted);margin-bottom:6px">Récapitulatif</div>
      <div style="font-size:17px;font-weight:700;line-height:1.4;margin-bottom:16px">✨ Voici ta répartition intelligente</div>

      <div style="background:linear-gradient(135deg,rgba(52,211,153,.12),rgba(107,142,255,.06));border-radius:14px;padding:16px;margin-bottom:16px;text-align:center">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Montant reçu</div>
        <div style="font-size:28px;font-weight:800;color:var(--green);letter-spacing:-1px">${fmt(m)}</div>
      </div>

      <div style="background:var(--card2);border-radius:12px;padding:14px;margin-bottom:16px">
        ${charges > 0 ? `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
            <div><div style="font-weight:700;color:var(--yellow);font-size:14px">🏠 Charges</div><div style="font-size:11px;color:var(--muted)">${assistantAnswers.chargesDetails || 'Frais liés à la prestation'}</div></div>
            <div style="font-weight:800;color:var(--yellow);font-size:16px">-${fmt(charges)}</div>
          </div>
        ` : ''}

        ${epargne > 0 ? `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
            <div><div style="font-weight:700;color:var(--green);font-size:14px">💰 Épargne</div><div style="font-size:11px;color:var(--muted)">${goalName || 'Réserve générale'}</div></div>
            <div style="font-weight:800;color:var(--green);font-size:16px">-${fmt(epargne)}</div>
          </div>
        ` : ''}

        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0">
          <div><div style="font-weight:700;color:var(--accent);font-size:14px">🎉 Pour toi</div><div style="font-size:11px;color:var(--muted)">Reste à utiliser librement</div></div>
          <div style="font-weight:800;color:var(--accent);font-size:18px">${fmt(libre)}</div>
        </div>
      </div>

      <div style="display:grid;gap:8px">
        <button class="btn-primary" style="margin:0;background:linear-gradient(135deg,var(--green),#10b981);width:100%;color:#000;font-weight:800;padding:16px" onclick="assistantAppliquer()">✅ Créer les transactions</button>
        <button class="btn-ghost" style="margin:0;width:100%" onclick="closeAssistant()">Juste enregistrer sans répartition</button>
      </div>
    `;
    return;
  }
}

function assistantNext(){
  assistantStep++;
  renderAssistantStep();
}

function assistantSetCharges(has){
  assistantAnswers.hasCharges = has;
  const box = document.getElementById('assistantChargesBox');
  if(box) box.style.display = has ? 'block' : 'none';
  const non = document.getElementById('aChargesNon');
  const oui = document.getElementById('aChargesOui');
  if(non) non.classList.toggle('active', !has);
  if(oui) oui.classList.toggle('active', has);
}

function assistantUpdateChargesAmount(){
  const val = parseFloat(document.getElementById('assistantChargesAmount').value) || 0;
  assistantAnswers.chargesAmount = val;
}

function assistantValidateCharges(){
  if(assistantAnswers.hasCharges === null){
    alert('Choisis Oui ou Non');
    return;
  }
  if(assistantAnswers.hasCharges){
    const val = parseFloat(document.getElementById('assistantChargesAmount').value) || 0;
    if(val <= 0){
      alert('Indique un montant de charges');
      return;
    }
    assistantAnswers.chargesAmount = val;
    assistantAnswers.chargesDetails = document.getElementById('assistantChargesDetails').value.trim();
  } else {
    assistantAnswers.chargesAmount = 0;
    assistantAnswers.chargesDetails = '';
  }
  assistantNext();
}

function assistantSetGoal(id){
  assistantAnswers.goalId = id;
  renderAssistantStep();
}

function assistantUpdateEpargne(){
  const val = parseFloat(document.getElementById('assistantEpargneAmount').value) || 0;
  assistantAnswers.epargneAmount = val;
}

function assistantQuickEpargne(amount){
  const input = document.getElementById('assistantEpargneAmount');
  if(input){
    input.value = amount;
    assistantAnswers.epargneAmount = amount;
  }
}

function assistantValidateEpargne(){
  const val = parseFloat(document.getElementById('assistantEpargneAmount').value) || 0;
  const m = assistantData.amount;
  const charges = assistantAnswers.chargesAmount || 0;

  if(val < 0){ alert('Montant invalide'); return; }
  if(val + charges > m){
    alert('Épargne + charges dépassent le montant reçu');
    return;
  }
  assistantAnswers.epargneAmount = val;
  assistantNext();
}

async function assistantAppliquer(){
  const charges = assistantAnswers.chargesAmount || 0;
  const epargne = assistantAnswers.epargneAmount || 0;
  const goalId = assistantAnswers.goalId;

  let txCreated = 0;

  if(charges > 0){
    const chargeResult = await dbInsert('transactions', {
      type: 'depense',
      amount: charges,
      category: 'Business',
      note: 'Charges prestation · ' + (assistantAnswers.chargesDetails || ''),
      date: todayStr(),
      payment_method: 'Interne'
    });
    if(chargeResult){
      txs.unshift(chargeResult);
      txCreated++;
    }
  }

  if(epargne > 0){
    const epargneResult = await dbInsert('transactions', {
      type: 'depense',
      amount: epargne,
      category: 'Épargne',
      note: 'Épargne automatique (assistant)',
      date: todayStr(),
      payment_method: 'Interne'
    });
    if(epargneResult){
      txs.unshift(epargneResult);
      txCreated++;
    }

    if(goalId){
      const goal = coffres.find(c => c.id === goalId);
      if(goal){
        const newCurrent = Number(goal.current || 0) + epargne;
        const upd = await dbUpdate('goals', goalId, {current: newCurrent});
        if(upd){ goal.current = newCurrent; }
      }
    }
  }

  closeAssistant();
  refreshAll();

  const msg = txCreated > 0
    ? `✅ Répartition appliquée · ${txCreated} transaction${txCreated > 1 ? 's' : ''} créée${txCreated > 1 ? 's' : ''}`
    : 'Enregistré sans répartition';
  showToast(msg);
}

// ============================================================
// INITIALISATION
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('chatInput');
  if(input){
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });
  }
  const aiProvider = document.getElementById('aiProvider');
  if(aiProvider){ aiProvider.addEventListener('change', toggleCustomUrl); }
});

if('serviceWorker' in navigator){
  navigator.serviceWorker.addEventListener('message', (event) => {
    if(event.data && event.data.type === 'notification-click'){
      window.focus();
      if(event.data.url) window.location.href = event.data.url;
    }
  });
}

setInterval(() => {
  checkAutomaticNotifications();
  checkDailyReminders();
  checkNoteReminders();
  checkGoalReminders();
  checkShootReminders();
}, 60000);

function init(){
  if(typeof initCoach === 'function') initCoach();
  setType('depense');
  setupAutocomplete('shootLocation', 'shootLocationList');
  setupAutocomplete('clientCity', 'clientCityList');
  setupAutocomplete('revLocation', 'revLocationList');
  populateHistFilters();
  refreshAll();
  updateAiStatus();
  newQuote();
  updateNotifButton();
  loadSavedAnalysis();
  loadIdeasAI();
  renderInspirations();
  renderNotes();
  renderGoalReminders();
  renderGoalSuggestions();
  renderGlobalOverview();
  renderDailyTip();
  renderDashboardGoalReminders();
  renderDashboardGoals();
  loadSuggestionIAEpargne();
  loadAiConfigFromSupabase();
  loadPaymentLinks().then(() => renderPaymentLinks());

  setTimeout(updateShootStatuses, 1500);
  setTimeout(registerOneSignalPlayer, 2000);
  setTimeout(checkNoteReminders, 3000);
  setTimeout(verifierEpargneEnCours, 2000);

  setTimeout(() => {
    checkAutomaticNotifications();
    checkDailyReminders();
    checkGoalReminders();
    checkShootReminders();
  }, 2500);
}
// ============================================================
// RECHERCHE GLOBALE (cherche dans toute l'app)
// ============================================================
function ouvrirRechercheGlobale(){
  const existing = document.getElementById('rechercheGlobaleModal');
  if(existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'modal-bg show';
  modal.id = 'rechercheGlobaleModal';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-wrap">
        <h3>🔍 Recherche globale</h3>
        <button class="close" onclick="fermerRechercheGlobale()">×</button>
      </div>

      <input type="text" id="rechercheGlobaleInput" placeholder="Tape un mot-clé..." autocomplete="off" oninput="lancerRechercheGlobale()" style="font-size:16px;padding:14px">

      <div id="rechercheGlobaleResults" style="margin-top:16px"></div>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('rechercheGlobaleInput')?.focus(), 200);
}

function fermerRechercheGlobale(){
  const m = document.getElementById('rechercheGlobaleModal');
  if(m) m.remove();
}

function lancerRechercheGlobale(){
  const q = (document.getElementById('rechercheGlobaleInput')?.value || '').trim().toLowerCase();
  const el = document.getElementById('rechercheGlobaleResults');
  if(!el) return;

  if(q.length < 2){
    el.innerHTML = '<div class="empty" style="padding:20px">Tape au moins 2 caractères</div>';
    return;
  }

  const results = {
    transactions: [],
    clients: [],
    shoots: [],
    coffres: [],
    notes: [],
    inspirations: [],
    reminders: []
  };

  // Transactions
  txs.forEach(t => {
    const haystack = [t.category, t.note, t.client_name, t.prestation_type, t.location, t.payment_method].filter(Boolean).join(' ').toLowerCase();
    if(haystack.includes(q)) results.transactions.push(t);
  });

  // Clients
  clients.forEach(c => {
    const haystack = [c.name, c.phone, c.email, c.city, c.notes].filter(Boolean).join(' ').toLowerCase();
    if(haystack.includes(q)) results.clients.push(c);
  });

  // Séances
  shoots.forEach(s => {
    const client = s.client_id ? clients.find(c => c.id === s.client_id) : null;
    const haystack = [s.type, s.location, s.notes, client?.name].filter(Boolean).join(' ').toLowerCase();
    if(haystack.includes(q)) results.shoots.push(s);
  });

  // Objectifs
  coffres.forEach(c => {
    const haystack = [c.name, c.why, c.description].filter(Boolean).join(' ').toLowerCase();
    if(haystack.includes(q)) results.coffres.push(c);
  });

  // Notes
  notes.forEach(n => {
    const haystack = [n.title, n.content, (n.tags || []).join(' ')].filter(Boolean).join(' ').toLowerCase();
    if(haystack.includes(q)) results.notes.push(n);
  });

  // Inspirations
  inspirations.forEach(i => {
    const haystack = [i.name, i.why, i.city, i.platform, (i.tags || []).join(' ')].filter(Boolean).join(' ').toLowerCase();
    if(haystack.includes(q)) results.inspirations.push(i);
  });

  // Rappels
  reminders.forEach(r => {
    if((r.text || '').toLowerCase().includes(q)) results.reminders.push(r);
  });

  const total = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

  if(total === 0){
    el.innerHTML = '<div class="empty" style="padding:24px">Aucun résultat pour "' + q + '"</div>';
    return;
  }

  let html = `<div style="font-size:12px;color:var(--muted);text-align:center;margin-bottom:14px">${total} résultat${total > 1 ? 's' : ''}</div>`;

  // Transactions
  if(results.transactions.length > 0){
    html += `<div style="font-size:11px;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">💰 Transactions (${results.transactions.length})</div>`;
    html += results.transactions.slice(0, 5).map(t => {
      const d = new Date(t.date).toLocaleDateString('fr-FR', {day:'2-digit', month:'short'});
      const sign = t.type === 'revenu' ? '+' : '-';
      const color = t.type === 'revenu' ? 'var(--green)' : 'var(--red)';
      return `<div onclick="fermerRechercheGlobale();showTab('historique', null);setTimeout(() => ouvrirDetailTx(${t.id}), 400)" style="background:var(--card2);border-radius:10px;padding:10px 12px;margin-bottom:6px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px">
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px">${t.category}${t.note ? ' · ' + t.note.substring(0, 30) : ''}</div>
          <div style="font-size:11px;color:var(--muted)">${d}</div>
        </div>
        <div style="color:${color};font-weight:700;font-size:13px">${sign}${fmt(t.amount)}</div>
      </div>`;
    }).join('');
  }

  // Clients
  if(results.clients.length > 0){
    html += `<div style="font-size:11px;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:14px 0 8px">👥 Clients (${results.clients.length})</div>`;
    html += results.clients.slice(0, 5).map(c => `
      <div onclick="fermerRechercheGlobale();showTab('photo', null)" style="background:var(--card2);border-radius:10px;padding:10px 12px;margin-bottom:6px;cursor:pointer">
        <div style="font-weight:600;font-size:13px">👤 ${c.name}</div>
        <div style="font-size:11px;color:var(--muted)">${c.phone || ''}${c.city ? ' · 📍 ' + c.city : ''}</div>
      </div>
    `).join('');
  }

  // Séances
  if(results.shoots.length > 0){
    html += `<div style="font-size:11px;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:14px 0 8px">📸 Séances (${results.shoots.length})</div>`;
    html += results.shoots.slice(0, 5).map(s => {
      const client = s.client_id ? clients.find(c => c.id === s.client_id) : null;
      const d = new Date(s.date).toLocaleDateString('fr-FR', {day:'2-digit', month:'short'});
      return `<div onclick="fermerRechercheGlobale();showTab('photo', null)" style="background:var(--card2);border-radius:10px;padding:10px 12px;margin-bottom:6px;cursor:pointer">
        <div style="font-weight:600;font-size:13px">📸 ${s.type}${client ? ' · ' + client.name : ''}</div>
        <div style="font-size:11px;color:var(--muted)">${d} · ${fmt(s.price)}</div>
      </div>`;
    }).join('');
  }

  // Objectifs
  if(results.coffres.length > 0){
    html += `<div style="font-size:11px;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:14px 0 8px">🎯 Objectifs (${results.coffres.length})</div>`;
    html += results.coffres.slice(0, 5).map(c => {
      const pct = ((Number(c.current) / Number(c.goal)) * 100).toFixed(0);
      const emoji = c.emoji || getCoffreEmoji(c.name);
      return `<div onclick="fermerRechercheGlobale();showTab('objectifs', null)" style="background:var(--card2);border-radius:10px;padding:10px 12px;margin-bottom:6px;cursor:pointer">
        <div style="font-weight:600;font-size:13px">${emoji} ${c.name}</div>
        <div style="font-size:11px;color:var(--muted)">${pct}% · ${fmt(c.current)} / ${fmt(c.goal)}</div>
      </div>`;
    }).join('');
  }

  // Notes
  if(results.notes.length > 0){
    html += `<div style="font-size:11px;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:14px 0 8px">📝 Notes (${results.notes.length})</div>`;
    html += results.notes.slice(0, 5).map(n => `
      <div onclick="fermerRechercheGlobale();showTab('notes', null)" style="background:var(--card2);border-radius:10px;padding:10px 12px;margin-bottom:6px;cursor:pointer">
        <div style="font-weight:600;font-size:13px">📝 ${n.title || (n.content || '').substring(0, 40)}</div>
        <div style="font-size:11px;color:var(--muted)">${n.priority || ''}</div>
      </div>
    `).join('');
  }

  // Inspirations
  if(results.inspirations.length > 0){
    html += `<div style="font-size:11px;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:14px 0 8px">💫 Inspirations (${results.inspirations.length})</div>`;
    html += results.inspirations.slice(0, 5).map(i => `
      <div onclick="fermerRechercheGlobale();showTab('inspiration', null)" style="background:var(--card2);border-radius:10px;padding:10px 12px;margin-bottom:6px;cursor:pointer">
        <div style="font-weight:600;font-size:13px">💫 ${i.name}</div>
        <div style="font-size:11px;color:var(--muted)">${i.category || ''}${i.city ? ' · 📍 ' + i.city : ''}</div>
      </div>
    `).join('');
  }

  // Rappels
  if(results.reminders.length > 0){
    html += `<div style="font-size:11px;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:14px 0 8px">⏰ Rappels (${results.reminders.length})</div>`;
    html += results.reminders.slice(0, 5).map(r => `
      <div onclick="fermerRechercheGlobale();showTab('motiv', null)" style="background:var(--card2);border-radius:10px;padding:10px 12px;margin-bottom:6px;cursor:pointer">
        <div style="font-weight:600;font-size:13px">⏰ ${r.text}</div>
        <div style="font-size:11px;color:var(--muted)">${r.time || ''}</div>
      </div>
    `).join('');
  }

  el.innerHTML = html;
}

// ============================================================
// DÉFIS QUOTIDIENS AMÉLIORÉS (avec impact + variété + focus)
// ============================================================
const DEFIS_POOL = {
  epargne: [
    { i:'💰', t:'Épargne 1000 FCFA aujourd\'hui', d:'Chaque petit geste compte. Même 1000 FCFA x 30 jours = 30 000 FCFA par mois.' },
    { i:'🏦', t:'Mets 10% de chaque entrée de côté', d:'La règle d\'or : paie-toi en PREMIER avant de dépenser.' },
    { i:'🎯', t:'Alimente ton objectif principal', d:'Un petit versement aujourd\'hui te rapproche du but.' },
    { i:'🛑', t:'Zéro dépense impulsive aujourd\'hui', d:'Chaque achat non essentiel évité = de l\'argent gagné.' },
    { i:'📊', t:'Vérifie ton solde du mois', d:'Comprendre où tu en es te permet de mieux avancer.' }
  ],
  business: [
    { i:'📸', t:'Publie une photo de ton travail', d:'Ta visibilité attire les clients. Une publication par jour = 30 par mois.' },
    { i:'📞', t:'Contacte 1 ancien client', d:'Un client satisfait = 3 recommandations. Prends de ses nouvelles.' },
    { i:'🎁', t:'Propose une offre spéciale à un client', d:'Une remise limitée dans le temps déclenche souvent la décision.' },
    { i:'💼', t:'Note 3 idées business dans l\'app', d:'Les bonnes idées viennent quand tu les écris.' },
    { i:'🌟', t:'Demande un témoignage à un client', d:'Les avis clients rassurent les futurs acheteurs.' }
  ],
  discipline: [
    { i:'📝', t:'Note TOUTES tes dépenses aujourd\'hui', d:'Même 100 FCFA. Tu verras où part ton argent.' },
    { i:'🧘', t:'Prends 5 min pour toi', d:'Un esprit reposé prend de meilleures décisions.' },
    { i:'📵', t:'Pas de réseaux sociaux pendant 2h', d:'Ce temps peut servir à avancer sur tes objectifs.' },
    { i:'🍽️', t:'Prépare ton repas maison', d:'Cuisiner coûte moins cher que commander.' },
    { i:'🌅', t:'Lève-toi 30 min plus tôt', d:'Les gagnants se lèvent avant les autres.' }
  ],
  photo: [
    { i:'📷', t:'Nettoie ton matériel photo', d:'Un objectif propre = des photos nettes.' },
    { i:'🎨', t:'Retouche 3 anciennes photos', d:'Améliore ton portfolio en quelques minutes.' },
    { i:'📚', t:'Regarde 1 tutoriel photo', d:'L\'apprentissage continu fait la différence.' },
    { i:'💾', t:'Sauvegarde tes photos du mois', d:'Ne perds jamais ton travail à cause d\'un disque plein.' },
    { i:'🌳', t:'Repère un nouveau lieu de shooting', d:'La variété des lieux attire plus de clients.' }
  ]
};

function getDefiDuJourAmeliore(){
  const today = new Date();
  const dayKey = today.toISOString().slice(0,10);

  // Détermine la catégorie selon le jour de la semaine
  const dayOfWeek = today.getDay();
  let categorie;
  if(dayOfWeek === 0 || dayOfWeek === 6) categorie = 'photo';       // Week-end : focus photo
  else if(dayOfWeek === 1) categorie = 'epargne';                    // Lundi : épargne
  else if(dayOfWeek === 3) categorie = 'business';                   // Mercredi : business
  else categorie = 'discipline';                                     // Autres : discipline

  const liste = DEFIS_POOL[categorie];
  const dayIndex = Math.floor(new Date(dayKey).getTime() / 86400000) % liste.length;
  return { categorie, ...liste[dayIndex] };
}

// Override de la fonction existante renderDefiDuJour
window.renderDefiDuJour = function(){
  const today = new Date();
  const dayKey = today.toISOString().slice(0,10);
  const defi = getDefiDuJourAmeliore();

  const defiEl = document.getElementById('defiText');
  const dateEl = document.getElementById('defiDate');
  const btnEl = document.getElementById('defiBtn');
  const streakEl = document.getElementById('defiStreak');

  if(defiEl){
    defiEl.innerHTML = `<div style="font-size:32px;margin-bottom:10px;text-align:center">${defi.i}</div>
      <div style="font-size:16px;font-weight:700;margin-bottom:8px;text-align:center">${defi.t}</div>
      <div style="font-size:13px;color:var(--muted);line-height:1.5;text-align:center">${defi.d}</div>`;
    if(dateEl) dateEl.textContent = today.toLocaleDateString('fr-FR', {day:'2-digit', month:'short'});
  }

  const doneKey = `defi_${dayKey}`;
  if(btnEl){
    if(localStorage.getItem(doneKey)){
      btnEl.classList.add('done');
      btnEl.textContent = '✅ Défi relevé !';
    } else {
      btnEl.classList.remove('done');
      btnEl.textContent = '✓ J\'ai relevé le défi';
    }
  }

  let streak = 0;
  let d = new Date(today);
  while(true){
    const k = `defi_${d.toISOString().slice(0,10)}`;
    if(localStorage.getItem(k)){ streak++; d.setDate(d.getDate()-1); }
    else break;
  }
  if(streakEl) streakEl.textContent = streak > 0 ? `🔥 Série : ${streak} jour${streak>1?'s':''} d'affilée !` : '';
};

// ============================================================
// ANALYSE AUTO D'UNE ENTRÉE D'ARGENT
// ============================================================
async function analyserEntreeArgent(amount, prestationType, clientName){
  // Sugère une répartition en % selon le type de prestation
  const regle = REGLES_REPARTITION[detecterTypePrestation(prestationType)] || REGLES_REPARTITION.default;

  const epargne = Math.round(amount * regle.epargne / 100);
  const charges = Math.round(amount * regle.charges / 100);
  const libre = amount - epargne - charges;

  return {
    epargne,
    charges,
    libre,
    regle,
    message: `Pour ${prestationType}, la suggestion est : ${regle.epargne}% épargne (${fmt(epargne)}), ${regle.charges}% charges (${fmt(charges)}), ${(100 - regle.epargne - regle.charges)}% libre (${fmt(libre)}).`
  };
}
// ============================================================
// CADENAS SUR LES COFFRES
// ============================================================
async function toggleCadenasCoffre(coffreId){
  const c = coffres.find(x => x.id === coffreId);
  if(!c) return;

  // Si déjà bloqué → débloquer
  if(estCoffreBloque(c)){
    await debloquerCoffre(coffreId);
    return;
  }

  // Sinon → bloquer
  await bloquerCoffre(coffreId);
}
async function deverrouillerCoffre(coffreId){
  const c = coffres.find(x => x.id === coffreId);
  if(!c) return;

  if(!confirm(`Déverrouiller "${c.name}" ?\n\nCet objectif était bloqué pour t'aider à ne pas y toucher. Es-tu sûr(e) ?`)) return;

  const result = await dbUpdate('goals', coffreId, {
    locked: false,
    locked_at: null
  });

  if(!result){ alert('Erreur'); return; }

  c.locked = false;
  c.locked_at = null;

  refreshAll();
  showToast('🔓 Objectif déverrouillé');
}

// Modification de ouvrirEpargnePerso pour vérifier le cadenas
const _oldOuvrirEpargnePerso = window.ouvrirEpargnePerso;
window.ouvrirEpargnePerso = function(coffreId){
  const c = coffres.find(x => x.id === coffreId);
  if(c && c.locked){
    alert(`🔒 "${c.name}" est verrouillé.\n\nDéverrouille-le d'abord si tu veux y ajouter de l'argent.`);
    return;
  }
  if(typeof _oldOuvrirEpargnePerso === 'function') return _oldOuvrirEpargnePerso(coffreId);
};

// ============================================================
// ÉPARGNE LIBRE (sans objectif)
// ============================================================
async function getEpargneLibreTotal(){
  // Somme des transactions d'épargne qui ne sont PAS liées à un objectif
  const epargneTxs = txs.filter(t => t.category === 'Épargne' && t.type === 'depense');
  const total = epargneTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // Retirer les versements déjà comptés dans les objectifs (via note "· nom objectif")
  // Pour simplifier, on compte TOUT ce qui est catégorie Épargne
  return { total, count: epargneTxs.length };
}

function renderEpargneLibre(){
  const el = document.getElementById('epargneLibreDisplay');
  if(!el) return;

  const { total, count } = getEpargneLibreTotal();

  if(total <= 0){
    el.innerHTML = `<div class="empty" style="padding:16px">Aucune épargne libre pour l'instant</div>`;
    return;
  }

  el.innerHTML = `
    <div style="background:linear-gradient(135deg,rgba(52,211,153,.12),rgba(107,142,255,.06));border-radius:14px;padding:16px;text-align:center">
      <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1.2px;margin-bottom:6px">Total épargne libre</div>
      <div style="font-size:28px;font-weight:800;color:var(--green);letter-spacing:-1px">${fmt(total)}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:4px">${count} versement${count > 1 ? 's' : ''}</div>
    </div>
  `;
}

async function ajouterEpargneLibre(){
  const montantStr = prompt('💰 Combien veux-tu ajouter à ton épargne libre ?\n\n(Ex: 5000)', '');
  if(montantStr === null) return;

  const montant = parseFloat(montantStr);
  if(!montant || montant <= 0){ alert('Montant invalide'); return; }

  const noteStr = prompt('📝 Petite note (optionnel) ?', 'Épargne libre');
  const note = noteStr === null ? 'Épargne libre' : (noteStr.trim() || 'Épargne libre');

  const result = await dbInsert('transactions', {
    type: 'depense',
    amount: montant,
    category: 'Épargne',
    note: note,
    date: todayStr(),
    payment_method: 'Interne'
  });

  if(!result){ alert('Erreur'); return; }

  txs.unshift(result);
  refreshAll();
  showToast(`✅ ${fmt(montant)} ajouté à ton épargne libre`);
}

async function retirerEpargneLibre(){
  const { total } = getEpargneLibreTotal();

  if(total <= 0){
    alert('Tu n\'as pas d\'épargne libre à retirer.');
    return;
  }

  const montantStr = prompt(`➖ Combien veux-tu retirer ?\n\nDisponible : ${fmt(total)}\n\n(Ex: 5000)`, '');
  if(montantStr === null) return;

  const montant = parseFloat(montantStr);
  if(!montant || montant <= 0){ alert('Montant invalide'); return; }
  if(montant > total){ alert('Montant supérieur à ton épargne libre'); return; }

  const motifStr = prompt('📝 Motif du retrait ?', '');
  const motif = motifStr === null ? '' : motifStr.trim();

  const result = await dbInsert('transactions', {
    type: 'revenu',
    amount: montant,
    category: 'Retrait épargne',
    note: motif || 'Retrait épargne libre',
    date: todayStr(),
    payment_method: 'Interne'
  });

  if(!result){ alert('Erreur'); return; }

  txs.unshift(result);
  refreshAll();
  showToast(`✅ ${fmt(montant)} retiré de ton épargne libre`);
}

function voirHistoriqueEpargneLibre(){
  const epargneTxs = txs.filter(t => t.category === 'Épargne' || t.category === 'Retrait épargne')
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const existing = document.getElementById('histoEpargneModal');
  if(existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'modal-bg show';
  modal.id = 'histoEpargneModal';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-wrap">
        <h3>📜 Historique épargne</h3>
        <button class="close" onclick="document.getElementById('histoEpargneModal').remove()">×</button>
      </div>

      ${epargneTxs.length === 0
        ? '<div class="empty" style="padding:24px">Aucun mouvement d\'épargne</div>'
        : epargneTxs.map(t => {
            const d = new Date(t.date).toLocaleDateString('fr-FR', {day:'2-digit', month:'short', year:'numeric'});
            const isRetrait = t.category === 'Retrait épargne';
            const color = isRetrait ? 'var(--red)' : 'var(--green)';
            const sign = isRetrait ? '-' : '+';
            return `
              <div style="background:var(--card2);border-radius:10px;padding:10px 12px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;gap:8px">
                <div style="flex:1;min-width:0">
                  <div style="font-size:13px;font-weight:600">${t.note || t.category}</div>
                  <div style="font-size:11px;color:var(--muted)">${d}</div>
                </div>
                <div style="color:${color};font-weight:700;font-size:14px">${sign}${fmt(t.amount)}</div>
              </div>
            `;
          }).join('')
      }

      <button class="btn-ghost" style="margin-top:16px;width:100%" onclick="document.getElementById('histoEpargneModal').remove()">Fermer</button>
    </div>
  `;
  document.body.appendChild(modal);
}

// ============================================================
// MOTIVATION PERSONNALISÉE
// ============================================================
function getMotivationPersonnalisee(){
  const now = new Date();
  const hour = now.getHours();

  // Trouve l'objectif le plus "urgent" (celui qui a le moins de temps ou le plus proche du but)
  let motivation = null;

  if(coffres.length > 0){
    // Priorité : objectif proche du but + deadline proche
    const scored = coffres
      .filter(c => Number(c.current) < Number(c.goal))
      .map(c => {
        const pct = (Number(c.current) / Number(c.goal)) * 100;
        const rest = Number(c.goal) - Number(c.current);
        let urgency = pct; // Plus pct élevé = plus proche du but

        if(c.target_date){
          const days = Math.ceil((new Date(c.target_date) - now) / 86400000);
          if(days > 0 && days < 30) urgency += 50; // Bonus si deadline proche
          if(days < 0) urgency += 100; // Très urgent si en retard
        }
        return { c, pct, rest, urgency };
      })
      .sort((a, b) => b.urgency - a.urgency);

    if(scored.length > 0){
      const top = scored[0];
      const emoji = top.c.emoji || getCoffreEmoji(top.c.name);

      if(top.pct >= 90){
        motivation = { emoji: '🎉', title: 'Dernière ligne droite !', text: `${emoji} "${top.c.name}" est à ${top.pct.toFixed(0)}%. Il te reste ${fmt(top.rest)}. Tu y es presque !` };
      } else if(top.pct >= 50){
        motivation = { emoji: '💪', title: 'Plus de la moitié !', text: `${emoji} "${top.c.name}" est à ${top.pct.toFixed(0)}%. Continue, chaque franc compte.` };
      } else if(top.pct > 0){
        motivation = { emoji: '🌱', title: 'Bon démarrage !', text: `${emoji} "${top.c.name}" est à ${top.pct.toFixed(0)}%. Reste ${fmt(top.rest)} pour finir.` };
      } else {
        motivation = { emoji: '🚀', title: 'Il faut commencer !', text: `${emoji} "${top.c.name}" t'attend. Un petit versement aujourd'hui peut tout changer.` };
      }
    }
  }

  // Si pas d'objectif → message selon l'heure
  if(!motivation){
    if(hour < 12){
      motivation = { emoji: '🌅', title: 'Bonjour Henzo !', text: 'Chaque matin est une nouvelle chance de faire mieux qu\'hier. Commence par créer un objectif !' };
    } else if(hour < 18){
      motivation = { emoji: '☀️', title: 'Bon après-midi !', text: 'Prends 2 minutes pour noter tes dépenses du jour. Tu verras où part ton argent.' };
    } else {
      motivation = { emoji: '🌙', title: 'Bonsoir Henzo', text: 'Ce soir, demande-toi : qu\'est-ce que j\'ai fait aujourd\'hui pour mon futur ?' };
    }
  }

  return motivation;
}

function afficherMotivationPersonnalisee(){
  const motiv = getMotivationPersonnalisee();
  const iconEl = document.getElementById('motivIcon');
  const titleEl = document.getElementById('motivTitle');
  const textEl = document.getElementById('motivText');

  if(iconEl) iconEl.textContent = motiv.emoji;
  if(titleEl) titleEl.textContent = motiv.title;
  if(textEl) textEl.textContent = motiv.text;
}

// Override de renderMotivationJour pour utiliser la version personnalisée
const _oldRenderMotivationJour = window.renderMotivationJour;
window.renderMotivationJour = function(){
  afficherMotivationPersonnalisee();
};

// Override de renderCoffres pour ajouter l'épargne libre
const _oldRenderCoffres = window.renderCoffres;
window.renderCoffres = function(){
  if(typeof _oldRenderCoffres === 'function') _oldRenderCoffres();
  renderEpargneLibre();
};

// ============================================================
// PROJECTIONS DU MOIS
// ============================================================
function renderProjections(){
  const el = document.getElementById('projectionsCard');
  if(!el) return;

  const now = new Date();
  const ym = monthKey();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysLeft = daysInMonth - dayOfMonth;

  const monthTx = txs.filter(t => t.date && t.date.startsWith(ym));
  const totalIn = monthTx.filter(t => t.type === 'revenu').reduce((s,t) => s + Number(t.amount || 0), 0);
  const totalOut = monthTx.filter(t => t.type === 'depense').reduce((s,t) => s + Number(t.amount || 0), 0);

  // Projection : rythme actuel × jours restants
  const avgInPerDay = dayOfMonth > 0 ? totalIn / dayOfMonth : 0;
  const avgOutPerDay = dayOfMonth > 0 ? totalOut / dayOfMonth : 0;
  const projectedIn = avgInPerDay * daysInMonth;
  const projectedOut = avgOutPerDay * daysInMonth;
  const projectedBalance = projectedIn - projectedOut;

  // Séances prévues (non payées mais planifiées)
  const shootsPlanifies = shoots.filter(s => {
    if(s.status === 'annule' || s.status === 'shoote') return false;
    const d = new Date(s.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const caPrevu = shootsPlanifies.reduce((sum, s) => {
    const prix = Number(s.price || 0);
    const recu = Number(s.montant_recu || 0);
    return sum + Math.max(0, prix - recu);
  }, 0);

  const totalProjete = projectedIn + caPrevu;

  if(monthTx.length === 0 && shootsPlanifies.length === 0){
    el.innerHTML = '<div class="empty" style="padding:20px">Ajoute des transactions et des séances pour voir tes projections.</div>';
    return;
  }

  el.innerHTML = `
    <div style="background:linear-gradient(135deg,rgba(107,142,255,.12),rgba(52,211,153,.06));border-radius:14px;padding:16px;margin-bottom:12px">
      <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1.2px;font-weight:700;margin-bottom:6px">💰 CA projeté fin de mois</div>
      <div style="font-size:28px;font-weight:800;color:var(--green);letter-spacing:-1px">${fmt(totalProjete)}</div>
      <div style="font-size:12px;color:var(--muted);margin-top:6px">
        Rythme actuel (${fmt(totalIn)}) + séances à venir (${fmt(caPrevu)})
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
      <div style="background:rgba(52,211,153,.08);border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:10px;color:var(--muted);margin-bottom:4px">Encaissé</div>
        <div style="font-size:16px;font-weight:800;color:var(--green)">${fmt(totalIn)}</div>
      </div>
      <div style="background:rgba(255,107,107,.08);border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:10px;color:var(--muted);margin-bottom:4px">Dépensé</div>
        <div style="font-size:16px;font-weight:800;color:var(--red)">${fmt(totalOut)}</div>
      </div>
    </div>

    <div style="background:var(--card2);border-radius:12px;padding:14px">
      <div style="font-size:12px;color:var(--muted);margin-bottom:8px">📊 Détail projections</div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid var(--border)">
        <span style="color:var(--muted)">Revenus projetés (rythme)</span>
        <span style="font-weight:700;color:var(--green)">${fmt(projectedIn)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid var(--border)">
        <span style="color:var(--muted)">Dépenses projetées</span>
        <span style="font-weight:700;color:var(--red)">${fmt(projectedOut)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid var(--border)">
        <span style="color:var(--muted)">Séances prévues</span>
        <span style="font-weight:700;color:var(--yellow)">${shootsPlanifies.length}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:10px 0 0;margin-top:6px;font-size:14px">
        <span style="font-weight:700">💚 Solde projeté fin de mois</span>
        <span style="font-weight:800;color:${projectedBalance >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt(projectedBalance)}</span>
      </div>
    </div>

    <div style="font-size:12px;color:var(--muted);text-align:center;margin-top:12px;line-height:1.5">
      ⏱ Il reste ${daysLeft} jour${daysLeft > 1 ? 's' : ''} dans le mois
    </div>
  `;
}

// ============================================================
// SUGGESTIONS IA D'ÉPARGNE PERSONNALISÉES (avec sauvegarde)
// ============================================================
async function demanderSuggestionIAEpargne(){
  const el = document.getElementById('iaEpargneCard');
  if(!el) return;

  let cfg = null;
  try { cfg = JSON.parse(localStorage.getItem('aiConfig')); } catch(e){}

  if(!cfg || !cfg.key){
    el.innerHTML = `
      <div style="background:rgba(245,197,66,.12);border:1px solid rgba(245,197,66,.30);border-radius:12px;padding:14px;font-size:13px;color:var(--gold-soft);line-height:1.5">
        ⚠️ Configure d'abord ta clé IA dans l'onglet 🤖 IA pour recevoir des suggestions personnalisées.
      </div>
    `;
    return;
  }

  el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted)">🤖 Analyse en cours...</div>';

  const s = computeStats();
  const activeGoals = coffres.filter(c => Number(c.current) < Number(c.goal));
  const epargneLibre = getEpargneLibreTotal();

  const prompt = `Tu es un conseiller financier personnel d'Henzo, photographe en Côte d'Ivoire.

Situation actuelle :
- Revenus ce mois : ${Math.round(s.totalIn)} FCFA
- Dépenses ce mois : ${Math.round(s.totalOut)} FCFA
- Solde : ${Math.round(s.bal)} FCFA
- Taux d'épargne : ${(s.savingsRate * 100).toFixed(1)}%
- Objectifs actifs : ${activeGoals.length}
${activeGoals.map(c => `  • ${c.name} : ${Math.round(c.current)}/${Math.round(c.goal)} FCFA`).join('\n')}
- Épargne libre : ${Math.round(epargneLibre.total)} FCFA

Donne une suggestion PERSONNALISÉE en français, maximum 120 mots, structurée ainsi :
1. Combien épargner cette semaine
2. Sur quel objectif prioritaire
3. Une astuce concrète pour y arriver

Sois direct, chiffré, encourageant. Pas d'astérisques.`;

  try {
    const text = await callAI(prompt);
    if(!text || !text.trim()){
      el.innerHTML = '<div class="empty">❌ Pas de réponse.</div>';
      return;
    }

    await saveSuggestionIAEpargne(text);
    afficherSuggestionIAEpargne(text);

  } catch(e){
    el.innerHTML = `<div style="color:var(--red);font-size:13px;padding:12px">❌ ${e.message}</div>`;
  }
}

// ---- Sauvegarde + chargement ----
async function saveSuggestionIAEpargne(text){
  const dateStr = new Date().toLocaleString('fr-FR', {day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'});
  localStorage.setItem('ia_epargne_last', text);
  localStorage.setItem('ia_epargne_last_date', dateStr);
  try {
    const user = await getCurrentUser();
    if(!user) return;
    await sb.from('user_settings').upsert(
      { user_id: user.id, ia_epargne: text, ia_epargne_date: dateStr },
      { onConflict: 'user_id' }
    );
  } catch(e){ console.warn('saveSuggestionIAEpargne error:', e); }
}

async function loadSuggestionIAEpargne(){
  try {
    const user = await getCurrentUser();
    if(!user) return;

    const { data, error } = await sb.from('user_settings')
      .select('ia_epargne, ia_epargne_date')
      .eq('user_id', user.id)
      .maybeSingle();

    if(error || !data || !data.ia_epargne) return;

    localStorage.setItem('ia_epargne_last', data.ia_epargne);
    localStorage.setItem('ia_epargne_last_date', data.ia_epargne_date || '');

    afficherSuggestionIAEpargne(data.ia_epargne, data.ia_epargne_date);
  } catch(e){ console.warn('loadSuggestionIAEpargne error:', e); }
}

function afficherSuggestionIAEpargne(text, dateStr){
  const el = document.getElementById('iaEpargneCard');
  if(!el) return;

  const formatted = text.replace(/\n/g, '<br>');
  el.innerHTML = `
    <div style="background:linear-gradient(135deg,rgba(107,142,255,.10),rgba(255,126,179,.05));border-left:3px solid var(--accent);border-radius:12px;padding:14px;font-size:13px;line-height:1.7">
      ${formatted}
    </div>
  `;

  // Afficher la date
  const dateEl = document.getElementById('iaEpargneLastUpdate');
  const date = dateStr || localStorage.getItem('ia_epargne_last_date');
  if(dateEl && date){
    dateEl.textContent = '🕐 Dernière suggestion : ' + date;
    dateEl.classList.add('visible');
  }

  // Activer les boutons
  const cpBtn = document.getElementById('iaEpargneCopyBtn');
  const pdfBtn = document.getElementById('iaEpargnePdfBtn');
  const clBtn = document.getElementById('iaEpargneClearBtn');
  if(cpBtn) cpBtn.disabled = false;
  if(pdfBtn) pdfBtn.disabled = false;
  if(clBtn) clBtn.disabled = false;
}

// ---- Boutons Copier / PDF / Effacer ----
async function copierSuggestionIAEpargne(){
  const text = localStorage.getItem('ia_epargne_last');
  if(!text){ alert('Aucune suggestion à copier'); return; }
  try {
    await navigator.clipboard.writeText(text);
    const btn = document.getElementById('iaEpargneCopyBtn');
    if(btn){
      btn.textContent = '✅ Copié !';
      setTimeout(() => btn.textContent = '📋 Copier', 2000);
    }
    showToast('Suggestion copiée');
  } catch(e){
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Suggestion copiée');
  }
}

function exportSuggestionIAEpargnePDF(){
  const text = localStorage.getItem('ia_epargne_last');
  const date = localStorage.getItem('ia_epargne_last_date');
  if(!text){ alert('Aucune suggestion à exporter'); return; }
  if(!window.jspdf || !window.jspdf.jsPDF){ alert('PDF non chargé'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFillColor(107, 142, 255);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text("Suggestion IA - Épargne", 14, 16);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if(date) doc.text(date, 14, 24);

  const cleanText = text.replace(/\*\*/g, '').replace(/[—–]/g, '-');
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(11);
  const splitText = doc.splitTextToSize(cleanText, 180);
  let y = 42;
  const pageHeight = doc.internal.pageSize.height - 15;

  splitText.forEach(line => {
    if(y > pageHeight){ doc.addPage(); y = 15; }
    doc.text(line, 14, y);
    y += 6;
  });

  doc.save(`suggestion-epargne-${todayStr()}.pdf`);
  showToast('PDF téléchargé');
}

async function effacerSuggestionIAEpargne(){
  if(!confirm('Effacer la suggestion IA sur tous tes appareils ?')) return;

  localStorage.removeItem('ia_epargne_last');
  localStorage.removeItem('ia_epargne_last_date');

  try {
    const user = await getCurrentUser();
    if(user){
      await sb.from('user_settings')
        .update({ ia_epargne: null, ia_epargne_date: null })
        .eq('user_id', user.id);
    }
  } catch(e){ console.warn(e); }

  const el = document.getElementById('iaEpargneCard');
  if(el) el.innerHTML = '<div class="empty">Clique sur <strong>Analyser</strong> pour recevoir une suggestion personnalisée.</div>';

  const dateEl = document.getElementById('iaEpargneLastUpdate');
  if(dateEl) dateEl.classList.remove('visible');

  const cpBtn = document.getElementById('iaEpargneCopyBtn');
  const pdfBtn = document.getElementById('iaEpargnePdfBtn');
  const clBtn = document.getElementById('iaEpargneClearBtn');
  if(cpBtn) cpBtn.disabled = true;
  if(pdfBtn) pdfBtn.disabled = true;
  if(clBtn) clBtn.disabled = true;

  showToast('Suggestion effacée');
}

// ============================================================
// NOTIFICATIONS ACTIONNABLES (clic → ouvre la bonne action)
// ============================================================
function ouvrirActionDepuisNotif(actionType, param){
  switch(actionType){
    case 'e pargner':
    case 'epargner':
      showTab('objectifs', null);
      setTimeout(() => {
        if(coffres.length > 0) ouvrirEpargnePerso(coffres[0].id);
      }, 400);
      break;
    case 'seance':
      showTab('photo', null);
      break;
    case 'client':
      showTab('photo', null);
      break;
    case 'note':
      showTab('notes', null);
      break;
    case 'transaction':
      showTab('historique', null);
      break;
    case 'objectif':
      showTab('objectifs', null);
      break;
    default:
      // Ouvre le dashboard par défaut
      showTab('dash', null);
  }
}

// Vérifie si l'URL contient une action au chargement
function verifierActionURL(){
  const params = new URLSearchParams(window.location.search);
  const action = params.get('action');
  const param = params.get('param');

  if(action){
    setTimeout(() => {
      ouvrirActionDepuisNotif(action, param);
      // Nettoie l'URL
      window.history.replaceState({}, '', window.location.pathname);
    }, 800);
  }
}

// Override de init pour ajouter les nouvelles fonctions
const _oldInit = window.init;
window.init = function(){
  if(typeof _oldInit === 'function') _oldInit();
  renderProjections();
  renderEpargneLibre();
  verifierActionURL();
};

// Override de refreshAll pour inclure les projections
const _oldRefreshAll = window.refreshAll;
window.refreshAll = function(){
  if(typeof _oldRefreshAll === 'function') _oldRefreshAll();
  renderProjections();
  renderEpargneLibre();
};
// ============================================================
// PHASE 1 — SYSTÈME DE COFFRES INTELLIGENTS
// Types + Détection auto + Blocage intelligent
// ============================================================

// ---- 4 TYPES DE COFFRES ----
const COFFRE_TYPES = {
  reserve: {
    id: 'reserve',
    label: '🛡️ Réserve / Urgence',
    icon: '🛡️',
    color: '#ff6b6b',
    desc: 'Ta bouée de sauvetage. Argent bloqué pour les imprévus.',
    lockLevel: 3,          // 3 = auto-bloqué total
    autoLock: true,        // Bloqué automatiquement
    message: {
      short: 'Cet argent est ta sécurité. N\'y touche pas.',
      long: 'Ce coffre est ta BOUÉE DE SAUVETAGE.\n\nC\'est ce qui te permet de :\n• Ne pas paniquer en cas d\'imprévu (santé, panne, urgence)\n• Ne pas t\'endetter pour un accident de la vie\n• Dormir tranquille la nuit\n\nSi tu le casses maintenant, que se passera-t-il si ta moto tombe en panne demain ?'
    }
  },
  objectif: {
    id: 'objectif',
    label: '🎯 Objectif / Long terme',
    icon: '🎯',
    color: '#6b8eff',
    desc: 'Un objectif précis à atteindre. Blocage suggéré.',
    lockLevel: 2,          // 2 = suggéré
    autoLock: false,
    message: {
      short: 'Cet argent travaille pour ton objectif. Continue !',
      long: 'Ce coffre, c\'est ton RÊVE en construction.\n\nChaque franc que tu retires aujourd\'hui, c\'est un jour de plus avant de l\'avoir.\n\nTu es sur la bonne voie. Ne lâche pas maintenant.'
    }
  },
  entreprise: {
    id: 'entreprise',
    label: '💼 Entreprise / Charges',
    icon: '💼',
    color: '#f5c542',
    desc: 'Pour les charges de ton activité. Libre mais chaque retrait est noté.',
    lockLevel: 1,          // 1 = pas de blocage mais noté
    autoLock: false,
    message: {
      short: 'Cet argent sert à ton activité. Utilise-le bien.',
      long: 'Ce coffre finance ton ACTIVITÉ.\n\nChaque retrait doit avoir une raison : loyer, transport, matériel, assistant...\n\nL\'app va noter où va ton argent pour que tu puisses voir si ton entreprise est rentable.'
    }
  },
  perso: {
    id: 'perso',
    label: '🎉 Perso / Plaisir',
    icon: '🎉',
    color: '#34d399',
    desc: 'Ton argent personnel. Totalement libre.',
    lockLevel: 0,          // 0 = pas de blocage
    autoLock: false,
    message: {
      short: 'Fais-toi plaisir, tu l\'as mérité.',
      long: 'Cet argent est pour TOI.\n\nTu as travaillé dur. Tu peux l\'utiliser librement pour tes sorties, tes envies, tes cadeaux.\n\nProfite ! 🎉'
    }
  }
};

// Types personnalisés (stockés en local + Supabase)
let COFFRE_TYPES_PERSO = [];
try {
  const saved = localStorage.getItem('coffre_types_perso');
  if(saved) COFFRE_TYPES_PERSO = JSON.parse(saved);
} catch(e){}

function getCoffreType(typeId){
  if(COFFRE_TYPES[typeId]) return COFFRE_TYPES[typeId];
  const perso = COFFRE_TYPES_PERSO.find(t => t.id === typeId);
  if(perso) return perso;
  return COFFRE_TYPES.objectif; // défaut
}

// ---- DÉTECTION INTELLIGENTE DU TYPE SELON LE NOM ----
function detecterTypeCoffre(nom){
  const n = (nom || '').toLowerCase();

  // Réserve / Urgence
  const motsReserve = ['urgence', 'secours', 'sécurité', 'securite', 'imprévu', 'imprevu', 'accident', 'maladie', 'santé', 'sante', 'médecine', 'medecine', 'hôpital', 'hopital', 'pharmacie', 'panne', 'réparation', 'reparation'];
  if(motsReserve.some(m => n.includes(m))) return 'reserve';

  // Entreprise / Charges
  const motsEntreprise = ['loyer', 'charges', 'transport', 'essence', 'carburant', 'assistant', 'makeup', 'maquillage', 'matériel', 'materiel', 'studio', 'local', 'bureau', 'publicité', 'publicite', 'marketing', 'abonnement', 'internet', 'téléphone', 'telephone', 'impôts', 'impots', 'taxes', 'facture', 'matériel photo', 'location'];
  if(motsEntreprise.some(m => n.includes(m))) return 'entreprise';

  // Objectif / Long terme
  const motsObjectif = ['appareil', 'objectif', 'boitier', 'drone', 'ordinateur', 'voiture', 'moto', 'villa', 'maison', 'terrain', 'voyage', 'vacances', 'formation', 'diplôme', 'diplome', 'investissement', 'matériel premium', 'studio pro', 'fond'];
  if(motsObjectif.some(m => n.includes(m))) return 'objectif';

  // Perso
  const motsPerso = ['sortie', 'plaisir', 'cadeau', 'fête', 'fete', 'resto', 'restaurant', 'cinéma', 'cinema', 'shopping', 'vêtement', 'vetement', 'chaussure', 'jeu', 'loisir'];
  if(motsPerso.some(m => n.includes(m))) return 'perso';

  // Par défaut : objectif
  return 'objectif';
}

// ---- ANALYSE INTELLIGENTE D'UN COFFRE ----
function analyserCoffre(nom){
  const typeId = detecterTypeCoffre(nom);
  const type = getCoffreType(typeId);

  return {
    typeId,
    type,
    lockLevel: type.lockLevel,
    autoLock: type.autoLock,
    recommandation: type.autoLock
      ? '🔒 Ce coffre sera BLOQUÉ AUTOMATIQUEMENT pour te protéger.'
      : type.lockLevel === 2
        ? '🔒 Il est RECOMMANDÉ de bloquer ce coffre jusqu\'à 100%.'
        : '🔓 Ce coffre reste libre d\'accès.'
  };
}

// ---- AFFICHAGE DYNAMIQUE DANS LA MODALE DE CRÉATION ----
function afficherAnalyseCoffre(){
  const nom = (document.getElementById('coffreName')?.value || '').trim();
  const el = document.getElementById('coffreAnalysis');
  if(!el) return;

  if(nom.length < 3){
    el.classList.remove('show');
    el.innerHTML = '';
    return;
  }

  const analyse = analyserCoffre(nom);
  const type = analyse.type;

  el.innerHTML = `
    <div class="ai-line" style="margin-bottom:6px">
      <strong>${type.icon}</strong> 
      Type détecté : <span style="color:${type.color};font-weight:700">${type.label}</span>
    </div>
    <div class="ai-line" style="font-size:11px;line-height:1.5;color:var(--muted);margin-bottom:6px">
      ${type.desc}
    </div>
    <div class="ai-line" style="font-size:12px;font-weight:700;color:${type.lockLevel >= 2 ? 'var(--yellow)' : 'var(--green)'}">
      ${analyse.recommandation}
    </div>
  `;
  el.classList.add('show');
}
// ============================================================
// PHASE 1 — PARTIE 2 : BLOCAGE INTELLIGENT DES COFFRES
// ============================================================

// ---- Récupère le type d'un coffre existant ----
function getTypeCoffre(coffre){
  if(!coffre) return COFFRE_TYPES.objectif;
  return getCoffreType(coffre.type_coffre || 'objectif');
}

// ---- Vérifie si un coffre est bloqué ----
function estCoffreBloque(coffre){
  if(!coffre) return false;
  // Bloqué si auto_locked est true OU lock_level >= 1 (blocage manuel)
  return !!coffre.auto_locked || Number(coffre.lock_level) >= 1;
}

// ---- Bloque un coffre ----
async function bloquerCoffre(coffreId){
  const c = coffres.find(x => x.id === coffreId);
  if(!c) return;

  const type = getTypeCoffre(c);
  const msg = `🔒 Bloquer "${c.name}" ?\n\n` +
    `Une fois bloqué :\n` +
    `✅ Tu pourras TOUJOURS ajouter de l'argent\n` +
    `❌ Tu ne pourras PLUS retirer sans raison valable\n\n` +
    `Type : ${type.icon} ${type.label}\n` +
    `Niveau de protection : ${type.lockLevel === 3 ? '🔒🔒🔒 Maximum' : '🔒🔒 Fort'}\n\n` +
    `Confirmer ?`;

  if(!confirm(msg)) return;

  const result = await dbUpdate('goals', coffreId, {
    auto_locked: true,
    lock_level: type.lockLevel,
    locked_at: new Date().toISOString()
  });

  if(!result){ alert('Erreur'); return; }

  c.auto_locked = true;
  c.lock_level = type.lockLevel;
  c.locked_at = new Date().toISOString();

  refreshAll();
  showToast('🔒 Coffre bloqué');
}

// ---- Débloque un coffre ----
async function debloquerCoffre(coffreId){
  const c = coffres.find(x => x.id === coffreId);
  if(!c) return;

  const type = getTypeCoffre(c);
  const lockLevel = Number(c.lock_level) || type.lockLevel;

  // Niveau 3 (Réserve) → TRÈS STRICT : 3 confirmations + raison
  if(lockLevel >= 3){
    await debloquerCoffreTresStrict(c, type);
    return;
  }

  // Niveau 2 (Objectif) → STRICT : 2 confirmations + raison
  if(lockLevel === 2){
    await debloquerCoffreStrict(c, type);
    return;
  }

  // Niveau 1 (Entreprise) → SIMPLE : 1 confirmation + raison
  if(lockLevel === 1){
    await debloquerCoffreSimple(c, type);
    return;
  }

  // Niveau 0 (Perso) → LIBRE
  const result = await dbUpdate('goals', coffreId, {
    auto_locked: false,
    lock_level: 0
  });
  if(!result) return;
  c.auto_locked = false;
  c.lock_level = 0;
  refreshAll();
  showToast('🔓 Coffre débloqué');
}

// ---- Déblocage TRÈS STRICT (coffres vitaux) ----
async function debloquerCoffreTresStrict(c, type){
  // Message cognitif personnalisé selon le thème
  const msg = `🛡️ STOP. Réfléchis 10 secondes.\n\n` +
    `Ce coffre "${c.name}" est ta BOUÉE DE SAUVETAGE.\n\n` +
    `C'est ce qui te permet de :\n` +
    `• Ne pas paniquer en cas d'imprévu (santé, panne, urgence)\n` +
    `• Ne pas t'endetter pour un accident de la vie\n` +
    `• Dormir tranquille la nuit\n\n` +
    `Si tu le casses maintenant, que se passera-t-il si ta moto tombe en panne demain ?\n\n` +
    `⚠️ Pour débloquer ce coffre, tu dois :\n` +
    `1. Écrire une raison valable\n` +
    `2. Confirmer 3 fois\n\n` +
    `Confirmation 1/3 : Veux-tu VRAIMENT débloquer ce coffre vital ?`;

  if(!confirm(msg)) return;

  const raison = prompt(
    `📝 Confirmation 2/3 : Écris la RAISON (obligatoire).\n\n` +
    `Pourquoi veux-tu débloquer "${c.name}" ?\n\n` +
    `Sois honnête. Si c'est pour une vraie urgence, c'est ok.\n` +
    `Si c'est pour un caprice, tu vas le regretter.`,
    ''
  );
  if(raison === null) return;
  if(!raison.trim() || raison.trim().length < 10){
    alert('❌ Raison trop courte. Écris au moins 10 caractères.');
    return;
  }

  const confirm3 = prompt(
    `⚠️ Confirmation 3/3 — DERNIÈRE CHANCE.\n\n` +
    `Ta raison : "${raison.trim()}"\n\n` +
    `Ce coffre a actuellement ${fmt(c.current)} / ${fmt(c.goal)}.\n\n` +
    `Pour confirmer, tape EXACTEMENT : OUI JE CONFIRME`,
    ''
  );
  if(confirm3 === null) return;
  if(confirm3.trim().toUpperCase() !== 'OUI JE CONFIRME'){
    alert('❌ Confirmation échouée. Le coffre reste bloqué.');
    return;
  }

  const result = await dbUpdate('goals', coffreId = c.id, {
    auto_locked: false,
    lock_level: 0,
    unlock_reason: raison.trim(),
    unlock_count: (Number(c.unlock_count) || 0) + 1
  });

  if(!result){ alert('Erreur'); return; }

  c.auto_locked = false;
  c.lock_level = 0;
  c.unlock_reason = raison.trim();
  c.unlock_count = (Number(c.unlock_count) || 0) + 1;

  refreshAll();
  showToast('🔓 Coffre débloqué (noté dans l\'historique)');
}

// ---- Déblocage STRICT (objectifs) ----
async function debloquerCoffreStrict(c, type){
  const pct = ((Number(c.current) / Number(c.goal)) * 100).toFixed(0);
  const rest = Number(c.goal) - Number(c.current);

  const msg = `${type.icon} Attention Henzo.\n\n` +
    `Ce coffre "${c.name}" est un OBJECTIF important.\n\n` +
    `Tu es à ${pct}% (${fmt(c.current)} / ${fmt(c.goal)}).\n` +
    `Il te reste ${fmt(rest)} pour l'atteindre.\n\n` +
    `Chaque franc retiré, c'est un jour de plus avant de l'avoir.\n\n` +
    `⚠️ Veux-tu vraiment débloquer ce coffre ?\n\n` +
    `(Il te faudra écrire une raison + confirmer 2 fois)`;

  if(!confirm(msg)) return;

  const raison = prompt(
    `📝 Confirmation 2/2 : Pourquoi veux-tu débloquer "${c.name}" ?\n\n` +
    `(Raison obligatoire, min 5 caractères)`,
    ''
  );
  if(raison === null) return;
  if(!raison.trim() || raison.trim().length < 5){
    alert('❌ Raison trop courte.');
    return;
  }

  const result = await dbUpdate('goals', c.id, {
    auto_locked: false,
    lock_level: 0,
    unlock_reason: raison.trim(),
    unlock_count: (Number(c.unlock_count) || 0) + 1
  });

  if(!result){ alert('Erreur'); return; }

  c.auto_locked = false;
  c.lock_level = 0;
  c.unlock_reason = raison.trim();
  c.unlock_count = (Number(c.unlock_count) || 0) + 1;

  refreshAll();
  showToast('🔓 Coffre débloqué');
}

// ---- Déblocage SIMPLE (entreprise) ----
async function debloquerCoffreSimple(c, type){
  const raison = prompt(
    `${type.icon} Retirer d'un coffre entreprise\n\n` +
    `Tu vas débloquer "${c.name}" pour retirer de l'argent.\n\n` +
    `Pourquoi ? (obligatoire, noté dans l'historique)\n` +
    `Ex: loyer, transport, matériel, assistant...`,
    ''
  );
  if(raison === null) return;
  if(!raison.trim()){
    alert('❌ Raison obligatoire pour les retraits entreprise.');
    return;
  }

  const result = await dbUpdate('goals', c.id, {
    auto_locked: false,
    unlock_reason: raison.trim(),
    unlock_count: (Number(c.unlock_count) || 0) + 1
  });

  if(!result){ alert('Erreur'); return; }

  c.auto_locked = false;
  c.unlock_reason = raison.trim();
  c.unlock_count = (Number(c.unlock_count) || 0) + 1;

  refreshAll();
  showToast('🔓 Retrait noté : ' + raison.trim());
}

// ---- Retirer de l'argent d'un coffre ----
async function retirerCoffre(coffreId){
  const c = coffres.find(x => x.id === coffreId);
  if(!c){ alert('Coffre introuvable'); return; }

  // Si bloqué → on demande le déblocage
  if(estCoffreBloque(c)){
    const type = getTypeCoffre(c);
    const lockLevel = Number(c.lock_level) || type.lockLevel;

    if(lockLevel >= 3){
      alert(
        `🔒🔒🔒 COFFRE VITAL BLOQUÉ\n\n` +
        `"${c.name}" est verrouillé au maximum.\n\n` +
        `Pour retirer, tu dois d'abord le débloquer (3 confirmations + raison).\n\n` +
        `Clique sur "🔒 Débloquer" sur le coffre.`
      );
      return;
    }

    if(lockLevel === 2){
      alert(
        `🔒🔒 COFFRE BLOQUÉ\n\n` +
        `"${c.name}" est verrouillé.\n\n` +
        `Pour retirer, tu dois d'abord le débloquer (2 confirmations + raison).\n\n` +
        `Clique sur "🔒 Débloquer" sur le coffre.`
      );
      return;
    }
  }

  // Le coffre est débloqué → on peut retirer
  const montantStr = prompt(
    `💸 Retirer de "${c.name}"\n\n` +
    `Actuellement : ${fmt(c.current)}\n` +
    `Combien veux-tu retirer ?`,
    ''
  );
  if(montantStr === null) return;

  const montant = parseFloat(montantStr);
  if(!montant || montant <= 0){ alert('Montant invalide'); return; }
  if(montant > Number(c.current)){
    alert(`❌ Tu ne peux pas retirer ${fmt(montant)}.\nTu n'as que ${fmt(c.current)} dans ce coffre.`);
    return;
  }

  const type = getTypeCoffre(c);
  let raison = '';
  if(type.id !== 'perso'){
    const raisonStr = prompt(
      `📝 Pourquoi retires-tu ${fmt(montant)} ?\n\n` +
      `(Obligatoire pour ce type de coffre)`,
      ''
    );
    if(raisonStr === null) return;
    raison = raisonStr.trim();
    if(!raison){ alert('Raison obligatoire'); return; }
  }

  const nouveauMontant = Number(c.current) - montant;
  const result = await dbUpdate('goals', coffreId, {
    current: nouveauMontant
  });
  if(!result){ alert('Erreur'); return; }

  // Créer une transaction "Retrait épargne"
  await dbInsert('transactions', {
    type: 'revenu',
    amount: montant,
    category: 'Retrait épargne',
    note: 'Retrait "' + c.name + '"' + (raison ? ' · ' + raison : ''),
    date: todayStr(),
    payment_method: 'Interne'
  });

  c.current = nouveauMontant;
  refreshAll();
  showToast(`💸 ${fmt(montant)} retiré de "${c.name}"`);
}

// ---- Override de ouvrirEpargnePerso pour le blocage ----
const _oldOuvrirEpargnePerso_v2 = window.ouvrirEpargnePerso;
window.ouvrirEpargnePerso = function(coffreId){
  const c = coffres.find(x => x.id === coffreId);
  if(!c) return;
  // L'ajout est TOUJOURS autorisé (même bloqué)
  if(typeof _oldOuvrirEpargnePerso_v2 === 'function'){
    return _oldOuvrirEpargnePerso_v2(coffreId);
  }
};

// ---- Blocage auto à la création ----
const _oldSaveCoffre = window.saveCoffre;
window.saveCoffre = async function(){
  const nomEl = document.getElementById('coffreName');
  const nom = (nomEl?.value || '').trim();

  if(!nom){
    // Laisse la fonction originale gérer l'erreur
    if(typeof _oldSaveCoffre === 'function') return _oldSaveCoffre();
    return;
  }

  // Détection du type
  const analyse = analyserCoffre(nom);

  // Si c'est un nouveau coffre ET que c'est un coffre vital (auto-lock), on prévient
  if(!editingCoffreId && analyse.autoLock){
    const confirmMsg = `🛡️ COFFRE VITAL DÉTECTÉ\n\n` +
      `"${nom}" est un coffre vital (${analyse.type.icon} ${analyse.type.label}).\n\n` +
      `Ce coffre sera BLOQUÉ AUTOMATIQUEMENT à la création.\n\n` +
      `✅ Tu pourras toujours AJOUTER de l'argent\n` +
      `❌ Tu ne pourras PAS RETIRER sans 3 confirmations + raison\n\n` +
      `C'est pour te protéger de toi-même. 💪\n\n` +
      `Confirmer la création ?`;

    if(!confirm(confirmMsg)){
      return;
    }
  }

  // Appelle la fonction originale
  if(typeof _oldSaveCoffre === 'function'){
    await _oldSaveCoffre();
  }

  // Récupère le dernier coffre créé (celui qu'on vient d'ajouter)
  const nouveauCoffre = coffres[0];
  if(nouveauCoffre && nouveauCoffre.name === nom){
    // Applique le type et le blocage auto
    const updateData = {
      type_coffre: analyse.typeId
    };

    if(analyse.autoLock){
      updateData.auto_locked = true;
      updateData.lock_level = analyse.lockLevel;
      updateData.locked_at = new Date().toISOString();
    }

    const updated = await dbUpdate('goals', nouveauCoffre.id, updateData);
    if(updated){
      Object.assign(nouveauCoffre, updateData);
    }
  }
};
// ============================================================
// PHASE 1 — PARTIE 5 : COACH INTELLIGENT DES COFFRES
// ============================================================

// ---- Analyse intelligente des coffres ----
function analyserCoffresCoach(){
  const conseils = [];
  const now = new Date();

  coffres.forEach(c => {
    const type = getTypeCoffre(c);
    const bloque = estCoffreBloque(c);
    const current = Number(c.current || 0);
    const goal = Number(c.goal || 0);
    const pct = goal > 0 ? (current / goal) * 100 : 0;
    const rest = goal - current;
    const isMoney = (c.goal_type || 'money') === 'money';

    const fmtVal = (n) => {
      if(isMoney) return fmt(n);
      return Math.round(n) + ' ' + (c.unit || 'unité');
    };

    // 🔴 CAS 1 : Coffre vital (🛡️) NON BLOQUÉ → URGENT
    if(type.id === 'reserve' && !bloque && current > 0){
      conseils.push({
        severity: 'urgent',
        icon: '🛡️',
        title: `Bloque "${c.name}" maintenant`,
        text: `Ce coffre est ta sécurité. Il contient ${fmtVal(current)} mais il n'est pas protégé. N'importe quelle tentation peut le vider. **Bloque-le dès maintenant.**`,
        action: { label: '🔒 Bloquer', fn: () => bloquerCoffre(c.id) }
      });
      return;
    }

    // 🔴 CAS 2 : Coffre vital (🛡️) BLOQUÉ mais VIDE → à remplir
    if(type.id === 'reserve' && bloque && current === 0){
      conseils.push({
        severity: 'warn',
        icon: '🛡️',
        title: `Remplis "${c.name}"`,
        text: `Tu as bien bloqué ce coffre vital, mais il est VIDE. Commence par y mettre un petit montant (même 5 000 FCFA). C'est ta sécurité.`,
        action: { label: '➕ Ajouter', fn: () => ouvrirEpargnePerso(c.id) }
      });
      return;
    }

    // 🔴 CAS 3 : Coffre vital (🛡️) < 30% après 30 jours → alerte
    if(type.id === 'reserve' && c.created_at){
      const days = Math.ceil((now - new Date(c.created_at)) / 86400000);
      if(days > 30 && pct < 30){
        conseils.push({
          severity: 'warn',
          icon: '⏰',
          title: `"${c.name}" est en retard`,
          text: `Ça fait ${days} jours et tu n'es qu'à ${pct.toFixed(0)}%. Ton fonds de sécurité est trop faible. Ajoute ${fmtVal(rest / 4)} cette semaine.`,
          action: { label: '➕ Ajouter', fn: () => ouvrirEpargnePerso(c.id) }
        });
        return;
      }
    }

    // 🟠 CAS 4 : Objectif (🎯) proche du but mais pas bloqué → suggestion
    if(type.id === 'objectif' && pct >= 50 && !bloque){
      conseils.push({
        severity: 'warn',
        icon: '🎯',
        title: `Bloque "${c.name}"`,
        text: `Tu es à ${pct.toFixed(0)}% ! Encore ${fmtVal(rest)} et c'est bon. Si tu le bloques maintenant, tu ne pourras plus reculer. **C'est le moment.**`,
        action: { label: '🔒 Bloquer', fn: () => bloquerCoffre(c.id) }
      });
      return;
    }

    // 🟠 CAS 5 : Objectif (🎯) en retard
    if(type.id === 'objectif' && c.target_date){
      const days = Math.ceil((new Date(c.target_date) - now) / 86400000);
      if(days < 0 && pct < 100){
        conseils.push({
          severity: 'urgent',
          icon: '⚠️',
          title: `Deadline dépassée : "${c.name}"`,
          text: `La date cible est passée. Reste ${fmtVal(rest)}. Soit tu ajoutes de l'argent, soit tu modifies la date.`,
          action: { label: '✏️ Modifier', fn: () => openCoffreModal(c.id) }
        });
        return;
      }
      if(days > 0 && days < 30 && pct < 80){
        const perWeek = (rest / days) * 7;
        conseils.push({
          severity: 'warn',
          icon: '⏱️',
          title: `"${c.name}" dans ${days} jours`,
          text: `Il faut mettre ${fmtVal(perWeek)} par semaine pour finir à temps. Tu es à ${pct.toFixed(0)}%.`,
          action: { label: '➕ Ajouter', fn: () => ouvrirEpargnePerso(c.id) }
        });
        return;
      }
    }

    // 🟢 CAS 6 : Coffre atteint → féliciter
    if(pct >= 100 && !c._felicite){
      conseils.push({
        severity: 'good',
        icon: '🏆',
        title: `"${c.name}" atteint !`,
        text: `Félicitations ! Tu as réussi à économiser ${fmtVal(goal)}. Fixe-toi un nouveau défi ou utilise l'argent pour ce que tu voulais.`,
        action: { label: '🎯 Voir', fn: () => {} }
      });
      return;
    }

    // 🟠 CAS 7 : Coffre entreprise vide depuis longtemps
    if(type.id === 'entreprise' && current === 0 && c.created_at){
      const days = Math.ceil((now - new Date(c.created_at)) / 86400000);
      if(days > 15){
        conseils.push({
          severity: 'warn',
          icon: '💼',
          title: `"${c.name}" est vide`,
          text: `Ça fait ${days} jours et ce coffre d'entreprise est vide. N'oublie pas de provisionner pour tes charges pro.`,
          action: { label: '➕ Ajouter', fn: () => ouvrirEpargnePerso(c.id) }
        });
        return;
      }
    }

    // 🟠 CAS 8 : Coffre débloqué qui recule (retrait récent)
    if(!bloque && current > 0 && c.unlock_reason){
      conseils.push({
        severity: 'warn',
        icon: '👀',
        title: `"${c.name}" a été retiré`,
        text: `Raison notée : "${c.unlock_reason}". N'oublie pas de replacer cet argent quand tu peux.`,
        action: { label: '➕ Ajouter', fn: () => ouvrirEpargnePerso(c.id) }
      });
      return;
    }
  });

  // Trier par sévérité
  const order = { urgent: 0, warn: 1, good: 2 };
  conseils.sort((a, b) => (order[a.severity] || 9) - (order[b.severity] || 9));

  return conseils.slice(0, 5); // Max 5 conseils
}

// ---- Affichage du coach dans l'onglet Objectifs ----
function renderCoachCoffres(){
  let el = document.getElementById('coachCoffresCard');
  
  // Si le conteneur n'existe pas, on le crée au début de l'onglet Objectifs
  if(!el){
    const pageObjectifs = document.getElementById('page-objectifs');
    if(!pageObjectifs) return;
    
    const container = pageObjectifs.querySelector('.container');
    if(!container) return;
    
    el = document.createElement('div');
    el.id = 'coachCoffresCard';
    el.className = 'card';
    el.style.cssText = 'background:linear-gradient(135deg,rgba(139,92,246,.10),rgba(107,142,255,.05));border-left:3px solid #8b5cf6';
    container.insertBefore(el, container.firstChild);
  }

  const conseils = analyserCoffresCoach();

  if(conseils.length === 0){
    el.style.display = 'none';
    return;
  }

  el.style.display = 'block';

  const severityColors = {
    urgent: 'var(--red)',
    warn: 'var(--yellow)',
    good: 'var(--green)'
  };

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <h2 style="margin:0;color:#8b5cf6">🧠 Coach des coffres</h2>
      <span style="font-size:11px;color:var(--muted);font-weight:600">${conseils.length} conseil${conseils.length > 1 ? 's' : ''}</span>
    </div>

    ${conseils.map((c, i) => `
      <div style="background:var(--card2);border-radius:12px;padding:12px 14px;margin-bottom:8px;border-left:3px solid ${severityColors[c.severity] || 'var(--accent)'}">
        <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px">
          <div style="font-size:22px;flex-shrink:0">${c.icon}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:13px;margin-bottom:3px">${c.title}</div>
            <div style="font-size:12px;color:var(--muted);line-height:1.5">${c.text.replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text)">$1</strong>')}</div>
          </div>
        </div>
        ${c.action ? `
          <button class="btn-ghost" style="width:100%;margin:0;padding:8px;font-size:12px;font-weight:700;background:rgba(139,92,246,.10);color:#a78bfa;border-color:#8b5cf6" onclick="coachExecActionCoffre(${i})">
            ${c.action.label}
          </button>
        ` : ''}
      </div>
    `).join('')}
  `;

  // Stocke les conseils pour pouvoir les exécuter
  window.__coachCoffresConseils = conseils;
}

function coachExecActionCoffre(index){
  const conseils = window.__coachCoffresConseils || [];
  const c = conseils[index];
  if(!c || !c.action || typeof c.action.fn !== 'function') return;
  try {
    c.action.fn();
  } catch(e){
    console.warn('coachExecActionCoffre:', e);
  }
}

// ---- Override de renderCoffres pour ajouter le coach ----
const _oldRenderCoffres_v3 = window.renderCoffres;
window.renderCoffres = function(){
  if(typeof _oldRenderCoffres_v3 === 'function') _oldRenderCoffres_v3();
  renderCoachCoffres();
};

// ---- Override de init pour charger le coach ----
const _oldInit_v3 = window.init;
window.init = function(){
  if(typeof _oldInit_v3 === 'function') _oldInit_v3();
  renderCoachCoffres();
};

// ---- Override de refreshAll pour rafraîchir le coach ----
const _oldRefreshAll_v3 = window.refreshAll;
window.refreshAll = function(){
  if(typeof _oldRefreshAll_v3 === 'function') _oldRefreshAll_v3();
  renderCoachCoffres();
};
// ============================================================
// PHASE 1 — PARTIE 6 : RÉPARTITION AUTO + RAPPORT HEBDO
// ============================================================

// ---- Propose une répartition automatique ----
async function proposerRepartitionAuto(montant, source){
  // Vérifier qu'il y a des coffres
  if(coffres.length === 0){
    return; // Pas de coffres → pas de répartition
  }

  const activeGoals = coffres.filter(c => Number(c.current) < Number(c.goal));
  if(activeGoals.length === 0) return;

  // Détecter le type de revenu
  const d = (source || '').toLowerCase();
  let regle;
  if(d.includes('mariage')) regle = { reserve: 10, objectif: 25, entreprise: 35, perso: 30, label: 'Mariage' };
  else if(d.includes('shoot') || d.includes('studio') || d.includes('extérieur')) regle = { reserve: 10, objectif: 15, entreprise: 45, perso: 30, label: 'Shooting' };
  else if(d.includes('corporate') || d.includes('pme')) regle = { reserve: 15, objectif: 20, entreprise: 40, perso: 25, label: 'Corporate' };
  else regle = { reserve: 10, objectif: 20, entreprise: 40, perso: 30, label: 'Revenu' };

  // Calculer les montants
  const reserveAmt = Math.round(montant * regle.reserve / 100);
  const objectifAmt = Math.round(montant * regle.objectif / 100);
  const entrepriseAmt = Math.round(montant * regle.entreprise / 100);
  const persoAmt = montant - reserveAmt - objectifAmt - entrepriseAmt;

  // Trouver les coffres par type
  const coffreReserve = coffres.find(c => c.type_coffre === 'reserve' && Number(c.current) < Number(c.goal));
  const coffreObjectif = coffres.find(c => c.type_coffre === 'objectif' && Number(c.current) < Number(c.goal));
  const coffreEntreprise = coffres.find(c => c.type_coffre === 'entreprise');
  const coffrePerso = coffres.find(c => c.type_coffre === 'perso');

  // Construire la proposition
  const proposition = [];
  if(reserveAmt > 0 && coffreReserve) proposition.push({ type: 'reserve', label: '🛡️ Réserve', montant: reserveAmt, coffre: coffreReserve });
  if(objectifAmt > 0 && coffreObjectif) proposition.push({ type: 'objectif', label: '🎯 Objectif', montant: objectifAmt, coffre: coffreObjectif });
  if(entrepriseAmt > 0 && coffreEntreprise) proposition.push({ type: 'entreprise', label: '💼 Entreprise', montant: entrepriseAmt, coffre: coffreEntreprise });
  if(persoAmt > 0 && coffrePerso) proposition.push({ type: 'perso', label: '🎉 Perso', montant: persoAmt, coffre: coffrePerso });

  // Si aucun coffre ne correspond → on skip
  if(proposition.length === 0) return;

  // Afficher la modale
  afficherModaleRepartitionAuto(montant, source, proposition, regle);
}

function afficherModaleRepartitionAuto(montant, source, proposition, regle){
  const existing = document.getElementById('repartitionAutoModal');
  if(existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'modal-bg show';
  modal.id = 'repartitionAutoModal';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-wrap">
        <h3>💡 Proposition de répartition</h3>
        <button class="close" onclick="fermerRepartitionAuto()">×</button>
      </div>

      <div style="background:linear-gradient(135deg,rgba(107,142,255,.12),rgba(52,211,153,.08));border-radius:14px;padding:16px;margin-bottom:16px;text-align:center">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Tu viens de recevoir</div>
        <div style="font-size:28px;font-weight:800;color:var(--green);letter-spacing:-1px">${fmt(montant)}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:6px">${source || 'Revenu'} · Règle ${regle.label}</div>
      </div>

      <div style="font-size:13px;color:var(--muted);margin-bottom:12px;line-height:1.5">
        Voici ma proposition pour dispatcher intelligemment cet argent dans tes coffres :
      </div>

      <div id="repartitionAutoList">
        ${proposition.map((p, i) => `
          <div style="background:var(--card2);border-radius:12px;padding:12px 14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:10px">
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:13px">${p.label}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:2px">${p.coffre.emoji || '🎯'} ${p.coffre.name}</div>
            </div>
            <div style="text-align:right">
              <input type="number" id="repartAuto-${i}" value="${p.montant}" 
                style="width:100px;padding:6px;font-size:14px;font-weight:700;text-align:right;color:var(--green);background:var(--card);border:1px solid var(--border);border-radius:8px"
                oninput="recalculerRepartAuto(${montant})">
              <div style="font-size:10px;color:var(--muted);margin-top:2px">FCFA</div>
            </div>
          </div>
        `).join('')}
      </div>

      <div id="repartAutoTotal" style="background:var(--card);border-radius:12px;padding:12px;margin-top:12px;text-align:center">
        <div style="font-size:11px;color:var(--muted)">Total alloué</div>
        <div style="font-size:18px;font-weight:800;color:var(--accent)" id="repartAutoTotalValue">${fmt(montant)}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px">sur ${fmt(montant)} reçus</div>
      </div>

      <div style="display:grid;gap:8px;margin-top:16px">
        <button class="btn-primary" style="margin:0;background:linear-gradient(135deg,var(--green),#10b981);color:#000;font-weight:800;padding:16px" onclick="validerRepartitionAuto(${montant})">
          ✅ Valider la répartition
        </button>
        <button class="btn-ghost" style="margin:0" onclick="fermerRepartitionAuto()">
          ⏭️ Plus tard (garder en libre)
        </button>
      </div>

      <div style="font-size:11px;color:var(--muted);text-align:center;margin-top:12px;line-height:1.5">
        💡 Tu peux modifier chaque montant. Si tu laisses tout en libre, rien ne change.
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  window.__repartAutoProposition = proposition;
  window.__repartAutoMontant = montant;
}

function recalculerRepartAuto(montantTotal){
  const proposition = window.__repartAutoProposition || [];
  let total = 0;
  proposition.forEach((p, i) => {
    const input = document.getElementById('repartAuto-' + i);
    if(input) total += parseFloat(input.value) || 0;
  });
  const el = document.getElementById('repartAutoTotalValue');
  if(el){
    el.textContent = fmt(total);
    el.style.color = total > montantTotal ? 'var(--red)' : 'var(--accent)';
  }
}

function fermerRepartitionAuto(){
  const m = document.getElementById('repartitionAutoModal');
  if(m) m.remove();
  window.__repartAutoProposition = null;
}

async function validerRepartitionAuto(montantTotal){
  const proposition = window.__repartAutoProposition || [];
  if(proposition.length === 0){ fermerRepartitionAuto(); return; }

  // Récupérer les montants
  const allocations = [];
  let totalAlloue = 0;
  proposition.forEach((p, i) => {
    const input = document.getElementById('repartAuto-' + i);
    const val = input ? parseFloat(input.value) || 0 : 0;
    if(val > 0){
      allocations.push({ ...p, montant: val });
      totalAlloue += val;
    }
  });

  if(totalAlloue > montantTotal){
    alert(`❌ Total alloué (${fmt(totalAlloue)}) supérieur au montant reçu (${fmt(montantTotal)}).`);
    return;
  }

  if(allocations.length === 0){
    fermerRepartitionAuto();
    return;
  }

  // Créer les transactions + mettre à jour les coffres
  for(const a of allocations){
    // Créer la transaction "Épargne"
    await dbInsert('transactions', {
      type: 'depense',
      amount: a.montant,
      category: 'Épargne',
      note: 'Répartition auto · ' + a.coffre.name,
      date: todayStr(),
      payment_method: 'Interne'
    });

    // Mettre à jour le coffre
    const newCurrent = Number(a.coffre.current || 0) + a.montant;
    await dbUpdate('goals', a.coffre.id, { current: newCurrent });
    a.coffre.current = newCurrent;
  }

  fermerRepartitionAuto();
  refreshAll();
  showToast(`✅ ${fmt(totalAlloue)} réparti dans ${allocations.length} coffre${allocations.length > 1 ? 's' : ''}`);
}

// ---- Override de saveRevenue pour proposer la répartition ----
const _oldSaveRevenue = window.saveRevenue;
window.saveRevenue = async function(){
  if(typeof _oldSaveRevenue !== 'function') return;

  // Récupérer le montant et la source AVANT la sauvegarde
  const amountEl = document.getElementById('revAmount');
  const prestationEl = document.getElementById('revPrestationType');
  const montant = amountEl ? parseFloat(amountEl.value) : 0;
  const prestation = prestationEl ? prestationEl.value : '';

  // Appeler la fonction originale
  await _oldSaveRevenue();

  // Si la sauvegarde a réussi (le modal est fermé) → proposer la répartition
  setTimeout(() => {
    const modalEncore = document.getElementById('revenueModalBg');
    if(!modalEncore || !modalEncore.classList.contains('show')){
      // Le modal est fermé → sauvegarde OK
      if(montant > 0){
        proposerRepartitionAuto(montant, prestation);
      }
    }
  }, 600);
};

// ---- RAPPORT HEBDO DU COACH ----
async function genererRapportHebdo(){
  const conseils = analyserCoffresCoach();
  const now = new Date();
  
  let rapport = `📊 RAPPORT HEBDO DU COACH\n`;
  rapport += `Semaine du ${now.toLocaleDateString('fr-FR', {day:'2-digit', month:'long', year:'numeric'})}\n\n`;

  // Stats globales
  const totalEpargne = coffres.reduce((s, c) => s + Number(c.current || 0), 0);
  const totalGoal = coffres.reduce((s, c) => s + Number(c.goal || 0), 0);
  const pct = totalGoal > 0 ? ((totalEpargne / totalGoal) * 100).toFixed(0) : 0;

  rapport += `💰 Total épargné : ${fmt(totalEpargne)} / ${fmt(totalGoal)} (${pct}%)\n`;
  rapport += `🎯 Nombre de coffres : ${coffres.length}\n`;
  rapport += `🔒 Coffres bloqués : ${coffres.filter(estCoffreBloque).length}\n\n`;

  if(conseils.length > 0){
    rapport += `🧠 CONSEILS DU COACH :\n`;
    conseils.forEach((c, i) => {
      rapport += `\n${i+1}. ${c.icon} ${c.title}\n${c.text.replace(/\*\*/g, '')}\n`;
    });
  } else {
    rapport += `✅ Tout est en ordre. Continue comme ça !\n`;
  }

  rapport += `\n📅 Prochain rapport dans 7 jours.`;

  return rapport;
}

async function sauvegarderRapportHebdo(rapport){
  const dateStr = new Date().toLocaleString('fr-FR', {day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'});
  localStorage.setItem('rapport_hebdo_last', rapport);
  localStorage.setItem('rapport_hebdo_date', dateStr);

  try {
    const user = await getCurrentUser();
    if(!user) return;
    await sb.from('user_settings').upsert(
      { user_id: user.id, rapport_hebdo: rapport, rapport_hebdo_date: dateStr },
      { onConflict: 'user_id' }
    );
  } catch(e){ console.warn('sauvegarderRapportHebdo:', e); }
}

async function verifierRapportHebdo(){
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=dimanche
  const today = now.toISOString().slice(0, 10);
  const lastRapport = localStorage.getItem('rapport_hebdo_date_key');

  // Rapport chaque dimanche
  if(dayOfWeek !== 0) return;
  if(lastRapport === today) return;

  const rapport = await genererRapportHebdo();
  await sauvegarderRapportHebdo(rapport);
  localStorage.setItem('rapport_hebdo_date_key', today);

  // Notification
  if(typeof showLocalNotification === 'function'){
    await showLocalNotification('📊 Rapport hebdo du coach', 'Ouvre l\'app pour voir tes conseils de la semaine !');
  }

  // Popup in-app
  if(typeof afficherPopupNotif === 'function'){
    afficherPopupNotif('📊 Rapport hebdo', 'Ouvre l\'onglet Objectifs pour voir le rapport complet.', '📊', 8000);
  }
}

// ---- Override de init pour ajouter les vérifications ----
const _oldInit_v4 = window.init;
window.init = function(){
  if(typeof _oldInit_v4 === 'function') _oldInit_v4();
  setTimeout(verifierRapportHebdo, 3000);
};
// ============================================================
// EXPORT CLIENTS AVEC DÉTAILS COMPLETS
// ============================================================

// ---- Construire les données enrichies de chaque client ----
function construireDonneesClientsEnrichies(){
  return clients.map(c => {
    // Trouver toutes les séances de ce client
    const clientShoots = shoots.filter(s => s.client_id === c.id);
    
    // Trier par date (plus récent en premier)
    const shootsSorted = [...clientShoots].sort((a,b) => (b.date || '').localeCompare(a.date || ''));
    
    // Calculer les stats
    const totalDepense = clientShoots.reduce((sum, s) => sum + Number(s.montant_recu || 0), 0);
    const totalFacture = clientShoots.reduce((sum, s) => sum + Number(s.price || 0), 0);
    const nombreSeances = clientShoots.length;
    const derniereSeance = shootsSorted[0]?.date || null;
    const premiereSeance = shootsSorted[shootsSorted.length - 1]?.date || null;
    
    // Types de séances (uniques)
    const typesSeances = [...new Set(clientShoots.map(s => s.type).filter(Boolean))];
    
    // Résumé des séances (format compact)
    const seancesResume = shootsSorted.map(s => {
      const d = s.date ? new Date(s.date).toLocaleDateString('fr-FR') : '?';
      return `${d} · ${s.type} · ${fmt(s.price)}${s.montant_recu > 0 ? ' (reçu: ' + fmt(s.montant_recu) + ')' : ''}`;
    }).join(' | ');
    
    return {
      // Infos client
      id: c.id,
      nom: c.name || '',
      telephone: c.phone || '',
      email: c.email || '',
      ville: c.city || '',
      notes: c.notes || '',
      dateAjout: c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR') : '',
      
      // Stats
      nombreSeances: nombreSeances,
      totalFacture: totalFacture,
      totalDepense: totalDepense,
      derniereSeance: derniereSeance ? new Date(derniereSeance).toLocaleDateString('fr-FR') : 'Aucune',
      premiereSeance: premiereSeance ? new Date(premiereSeance).toLocaleDateString('fr-FR') : 'Aucune',
      typesSeances: typesSeances.join(', '),
      
      // Détails bruts
      seancesResume: seancesResume || 'Aucune séance',
      seancesDetail: shootsSorted.map(s => ({
        date: s.date,
        type: s.type,
        lieu: s.location,
        prix: s.price,
        montantRecu: s.montant_recu,
        statut: s.status,
        paiement: s.payment,
        nbPhotos: s.photo_count,
        notes: s.notes
      }))
    };
  });
}

// ---- EXPORT CSV ----
function exportClientsCSV(){
  if(clients.length === 0){ alert('Aucun client à exporter'); return; }
  
  const donnees = construireDonneesClientsEnrichies();
  
  // En-tête CSV
  const header = [
    'Nom',
    'Téléphone',
    'Email',
    'Ville',
    'Date ajout',
    'Nombre séances',
    'Total facturé',
    'Total encaissé',
    'Dernière séance',
    'Première séance',
    'Types de séances',
    'Notes',
    'Détail des séances'
  ].join(';');
  
  // Lignes
  const rows = donnees.map(c => {
    const cleanStr = (s) => String(s || '').replace(/;/g, ',').replace(/"/g, '""').replace(/\n/g, ' ');
    return [
      `"${cleanStr(c.nom)}"`,
      `"${cleanStr(c.telephone)}"`,
      `"${cleanStr(c.email)}"`,
      `"${cleanStr(c.ville)}"`,
      `"${cleanStr(c.dateAjout)}"`,
      c.nombreSeances,
      c.totalFacture,
      c.totalDepense,
      `"${cleanStr(c.derniereSeance)}"`,
      `"${cleanStr(c.premiereSeance)}"`,
      `"${cleanStr(c.typesSeances)}"`,
      `"${cleanStr(c.notes)}"`,
      `"${cleanStr(c.seancesResume)}"`
    ].join(';');
  });
  
  const csv = header + '\n' + rows.join('\n');
  const blob = new Blob(['\ufeff' + csv], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `clients-henzo-${todayStr()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast(`${clients.length} clients exportés en CSV`);
}

// ---- EXPORT JSON ----
function exportClientsJSON(){
  if(clients.length === 0){ alert('Aucun client à exporter'); return; }
  
  const donnees = construireDonneesClientsEnrichies();
  const json = JSON.stringify({
    export_date: new Date().toISOString(),
    total_clients: donnees.length,
    clients: donnees
  }, null, 2);
  
  const blob = new Blob([json], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `clients-henzo-${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast(`${clients.length} clients exportés en JSON`);
}

// ---- EXPORT PDF ----
function exportClientsPDF(){
  if(clients.length === 0){ alert('Aucun client à exporter'); return; }
  if(!window.jspdf || !window.jspdf.jsPDF){ alert('PDF non chargé'); return; }
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pageWidth = 210;
  const margin = 14;
  
  const donnees = construireDonneesClientsEnrichies();
  
  // En-tête
  doc.setFillColor(107, 142, 255);
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('HENZO PHOTOGRAPHIE', margin, 15);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Base de données clients · ' + new Date().toLocaleDateString('fr-FR'), margin, 24);
  
  let y = 45;
  
  // Stats globales
  const totalClients = donnees.length;
  const totalCA = donnees.reduce((sum, c) => sum + c.totalDepense, 0);
  const totalSeances = donnees.reduce((sum, c) => sum + c.nombreSeances, 0);
  
  doc.setFillColor(240, 245, 255);
  doc.roundedRect(margin, y - 4, pageWidth - margin * 2, 18, 2, 2, 'F');
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
      doc.text(`${totalClients} clients · ${totalSeances} séances · ${nettoyerPourPDF(fmt(totalCA))} encaissés`, margin + 4, y + 6);
  
  y += 25;
  
  // Pour chaque client
  donnees.forEach((c, idx) => {
    // Nouvelle page si nécessaire
    if(y > 240){
      doc.addPage();
      y = 20;
    }
    
    // Fond du bloc client
    doc.setFillColor(250, 250, 252);
    doc.roundedRect(margin, y - 3, pageWidth - margin * 2, 32, 2, 2, 'F');
    
    // Nom
    doc.setTextColor(107, 142, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(c.nom || 'Client sans nom', margin + 4, y + 6);
    
    // Infos
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    let ligne1 = [];
    if(c.telephone) ligne1.push('📞 ' + c.telephone);
    if(c.email) ligne1.push('✉ ' + c.email);
    if(c.ville) ligne1.push('📍 ' + c.ville);
    doc.text(ligne1.join('   '), margin + 4, y + 13);
    
    // Stats
    doc.setTextColor(16, 130, 80);
    doc.setFont('helvetica', 'bold');
        doc.text(`${c.nombreSeances} séance(s) · ${nettoyerPourPDF(fmt(c.totalDepense))} encaissés`, margin + 4, y + 20);
    
    if(c.derniereSeance !== 'Aucune'){
      doc.setTextColor(120, 120, 120);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Dernière séance : ${c.derniereSeance}`, margin + 4, y + 26);
    }
    
    // Notes (si présentes)
    if(c.notes){
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
     const notesLines = doc.splitTextToSize('Note: ' + nettoyerPourPDF(c.notes), pageWidth - margin * 2 - 8);
      notesLines.slice(0, 2).forEach((line, i) => {
        doc.text(line, margin + 4, y + 30 + (i * 4));
      });
    }
    
    y += 38;
  });
  
  // Pied de page
  const pageCount = doc.internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++){
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('HENZO PHOTOGRAPHIE · ' + (BRAND?.phone || '') + ' · Base de données clients', pageWidth / 2, 290, { align: 'center' });
  }
  
  doc.save(`clients-henzo-${todayStr()}.pdf`);
  showToast(`${clients.length} clients exportés en PDF`);
}
// ============================================================
// NETTOYAGE POUR LES PDF (enlève les emojis)
// ============================================================
function nettoyerPourPDF(texte){
  if(!texte) return '';
  return String(texte)
    // Enlever les emojis (plage Unicode)
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{1F000}-\u{1F02F}]/gu, '')
    .replace(/[\u{1F0A0}-\u{1F0FF}]/gu, '')
    .replace(/[\u{1F100}-\u{1F1FF}]/gu, '')
    .replace(/[\u{1F200}-\u{1F2FF}]/gu, '')
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
    .replace(/[\u{1FA00}-\u{1FAFF}]/gu, '')
    .replace(/[\u{2300}-\u{23FF}]/gu, '')
    .replace(/[\u{25A0}-\u{25FF}]/gu, '')
    .replace(/[\u{2190}-\u{21FF}]/gu, '-')
    // Remplacer les caractères spéciaux par équivalents
    .replace(/[—–]/g, '-')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/…/g, '...')
    .replace(/\u202F|\u00A0|\u2009/g, ' ')
    // Nettoyer les espaces multiples
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================
// CALCUL DES FRAIS WAVE (sur l'acompte uniquement)
// ============================================================
function calculerFraisWave(){
  const flexEl = document.getElementById('lienMontantFlex');
  const montantAcompte = flexEl ? (parseFloat(flexEl.value) || 0) : 0;
  
  if(montantAcompte <= 0){
    alert('Renseigne d\'abord le montant à payer par le client.');
    return;
  }

  // Le taux par défaut est 1%, mais on peut le modifier
  let tauxFrais = parseFloat(localStorage.getItem('wave_frais_taux') || '1');
  
  // Demander le taux si l'utilisateur veut le modifier
  const tauxSaisi = prompt(
    `💸 Calcul des frais Wave\n\n` +
    `Montant à payer par le client : ${fmt(montantAcompte)}\n\n` +
    `Taux de frais Wave actuel : ${tauxFrais}%\n\n` +
    `Tu peux modifier ce taux si tu veux (ou laisse tel quel et clique OK) :`,
    tauxFrais
  );
  
  if(tauxSaisi === null) return;
  
  const nouveauTaux = parseFloat(tauxSaisi);
  if(!isNaN(nouveauTaux) && nouveauTaux >= 0){
    tauxFrais = nouveauTaux;
    localStorage.setItem('wave_frais_taux', String(tauxFrais));
  }

  // Formule : montant à saisir = acompte / (1 - taux/100)
  const montantAvecFrais = Math.ceil(montantAcompte / (1 - (tauxFrais / 100)));
  const frais = montantAvecFrais - montantAcompte;

  const resultEl = document.getElementById('fraisWaveResult');
  if(!resultEl) return;

  resultEl.style.display = 'block';
  resultEl.innerHTML = `
    <div style="background:linear-gradient(135deg,rgba(245,197,66,.12),rgba(245,197,66,.04));border:1px solid rgba(245,197,66,.35);border-radius:12px;padding:14px">
      <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;font-weight:700">💸 Frais Wave (${tauxFrais}%)</div>
      
      <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid var(--border)">
        <span style="color:var(--muted)">Acompte client</span>
        <span style="font-weight:700">${fmt(montantAcompte)}</span>
      </div>
      
      <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid var(--border)">
        <span style="color:var(--muted)">Frais Wave</span>
        <span style="font-weight:700;color:var(--yellow)">${fmt(frais)}</span>
      </div>
      
      <div style="display:flex;justify-content:space-between;padding:10px 0 0;margin-top:6px">
        <span style="font-weight:800;font-size:14px;color:var(--gold-soft)">📌 À saisir dans Wave</span>
        <span style="font-weight:800;font-size:20px;color:var(--gold-soft)">${fmt(montantAvecFrais)}</span>
      </div>
      
      <button class="btn-primary" style="margin:12px 0 0;width:100%;background:linear-gradient(135deg,var(--gold),#e0b02f);color:#000;font-weight:800" onclick="copierMontantWave(${montantAvecFrais})">
        📋 Copier ${fmt(montantAvecFrais)}
      </button>
      
      <div style="font-size:11px;color:var(--muted);text-align:center;margin-top:10px;line-height:1.5">
        Ouvre ton app Wave, crée le lien de paiement avec ce montant,<br>puis colle le lien Wave ci-dessous.
      </div>
    </div>
  `;
}

function copierMontantWave(montant){
  const texte = String(montant);
  if(navigator.clipboard){
    navigator.clipboard.writeText(texte).then(() => {
      showToast('✅ ' + fmt(montant) + ' copié !');
    }).catch(() => fallbackCopierWave(texte));
  } else {
    fallbackCopierWave(texte);
  }
}

function fallbackCopierWave(texte){
  const ta = document.createElement('textarea');
  ta.value = texte;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  showToast('✅ Montant copié !');
}
// ============================================================
// TOGGLE : "Cet objectif a un montant"
// ============================================================
function toggleCoffreHasMoney(){
  const checkbox = document.getElementById('coffreHasMoney');
  const moneyFields = document.getElementById('coffreMoneyFields');
  const titleEl = document.getElementById('coffreModalTitle');
  const submitEl = document.getElementById('coffreSubmit');
  const nameInput = document.getElementById('coffreName');
  
  if(!checkbox || !moneyFields) return;

  if(checkbox.checked){
    moneyFields.style.display = 'block';
    setGoalType('money');
    // Adapter les textes
    if(titleEl && !editingCoffreId) titleEl.textContent = 'Nouveau coffre';
    if(submitEl && !editingCoffreId) submitEl.textContent = 'Créer le coffre';
    if(nameInput) nameInput.placeholder = 'Ex: Coffre Loyer, Coffre Voiture, Coffre Réserve...';
  } else {
    moneyFields.style.display = 'none';
    setGoalType('quantity');
    // Adapter les textes
    if(titleEl && !editingCoffreId) titleEl.textContent = 'Nouvel objectif';
    if(submitEl && !editingCoffreId) submitEl.textContent = 'Créer l\'objectif';
    if(nameInput) nameInput.placeholder = 'Ex: 50 mariages cette année, 100 clients...';
  }
}

// ============================================================
// SYSTÈME DE TOASTS + MODALES DE CONFIRMATION
// ============================================================

// ---- TOASTS ----
function afficherToast(message, type){
  type = type || 'success';
  
  const colors = {
    success: { bg: 'linear-gradient(135deg, #10b981, #059669)', icon: '✅' },
    error:   { bg: 'linear-gradient(135deg, #ef4444, #dc2626)', icon: '❌' },
    warning: { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', icon: '⚠️' },
    info:    { bg: 'linear-gradient(135deg, #6b8eff, #4a6ee0)', icon: 'ℹ️' }
  };
  
  const style = colors[type] || colors.success;
  
  // Supprimer les toasts existants pour ne pas surcharger
  document.querySelectorAll('.henzo-toast').forEach(t => {
    if(t.dataset.old === 'true') t.remove();
  });
  
  const toast = document.createElement('div');
  toast.className = 'henzo-toast';
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%) translateY(-120px);
    background: ${style.bg};
    color: #fff;
    padding: 14px 22px;
    border-radius: 14px;
    font-size: 14px;
    font-weight: 600;
    z-index: 999999;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 12px 40px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.1) inset;
    transition: transform .4s cubic-bezier(.34,1.56,.64,1), opacity .3s ease;
    opacity: 0;
    pointer-events: none;
    max-width: 90vw;
    white-space: nowrap;
  `;
  toast.innerHTML = `<span style="font-size:18px">${style.icon}</span><span>${message}</span>`;
  
  document.body.appendChild(toast);
  
  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(-50%) translateY(0)';
    toast.style.opacity = '1';
  });
  
  // Vibration sur mobile
  if(navigator.vibrate){
    try { navigator.vibrate(type === 'error' ? [100, 50, 100] : [50]); } catch(e){}
  }
  
  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(-120px)';
    toast.style.opacity = '0';
    toast.dataset.old = 'true';
    setTimeout(() => toast.remove(), 500);
  }, 2500);
}

// ---- MODALE DE CONFIRMATION ----
function confirmer(message, options){
  options = options || {};
  
  return new Promise((resolve) => {
    const titre = options.titre || 'Confirmation';
    const texteAnnuler = options.texteAnnuler || 'Annuler';
    const texteConfirmer = options.texteConfirmer || 'Confirmer';
    const typeBouton = options.type || 'danger'; // danger, warning, info
    
    const colors = {
      danger:  { bg: 'linear-gradient(135deg, #ef4444, #dc2626)', icon: '🗑️' },
      warning: { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', icon: '⚠️' },
      info:    { bg: 'linear-gradient(135deg, #6b8eff, #4a6ee0)', icon: '❓' }
    };
    const c = colors[typeBouton] || colors.info;
    
    const modal = document.createElement('div');
    modal.className = 'modal-bg show';
    modal.id = 'henzoConfirmModal';
    modal.style.zIndex = '999998';
    modal.innerHTML = `
      <div class="modal" style="max-width:420px;border-radius:20px 20px 0 0">
        <div style="text-align:center;padding:10px 0 20px">
          <div style="font-size:52px;margin-bottom:12px">${c.icon}</div>
          <div style="font-size:18px;font-weight:800;margin-bottom:10px;letter-spacing:-.3px">${titre}</div>
          <div style="font-size:14px;color:var(--muted);line-height:1.6;white-space:pre-wrap;padding:0 10px">${message}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px">
          <button class="btn-ghost" style="margin:0;padding:14px;font-weight:700" onclick="window.__henzoConfirmResolve(false);document.getElementById('henzoConfirmModal').remove();">
            ${texteAnnuler}
          </button>
          <button style="margin:0;padding:14px;font-weight:700;background:${c.bg};color:#fff;border:none;border-radius:10px;cursor:pointer;font-family:inherit;font-size:15px" onclick="window.__henzoConfirmResolve(true);document.getElementById('henzoConfirmModal').remove();">
            ${texteConfirmer}
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Vibration
    if(navigator.vibrate){
      try { navigator.vibrate(50); } catch(e){}
    }
    
    window.__henzoConfirmResolve = (val) => {
      resolve(val);
      delete window.__henzoConfirmResolve;
    };
    
    // Clic sur le fond = annuler
    modal.addEventListener('click', (e) => {
      if(e.target === modal){
        window.__henzoConfirmResolve(false);
        modal.remove();
      }
    });
  });
}

// ---- MODALE D'ALERTE (pour les erreurs importantes) ----
function afficherAlerte(message, options){
  options = options || {};
  return new Promise((resolve) => {
    const titre = options.titre || 'Attention';
    const icone = options.icone || '⚠️';
    
    const modal = document.createElement('div');
    modal.className = 'modal-bg show';
    modal.id = 'henzoAlertModal';
    modal.style.zIndex = '999998';
    modal.innerHTML = `
      <div class="modal" style="max-width:420px;border-radius:20px 20px 0 0">
        <div style="text-align:center;padding:10px 0 20px">
          <div style="font-size:52px;margin-bottom:12px">${icone}</div>
          <div style="font-size:18px;font-weight:800;margin-bottom:10px;letter-spacing:-.3px">${titre}</div>
          <div style="font-size:14px;color:var(--muted);line-height:1.6;white-space:pre-wrap;padding:0 10px">${message}</div>
        </div>
        <button class="btn-primary" style="margin-top:16px;width:100%;padding:14px;font-weight:700" onclick="window.__henzoAlertResolve();document.getElementById('henzoAlertModal').remove();">
          OK
        </button>
      </div>
    `;
    
    document.body.appendChild(modal);
    window.__henzoAlertResolve = () => {
      resolve();
      delete window.__henzoAlertResolve;
    };
    
    modal.addEventListener('click', (e) => {
      if(e.target === modal){
        window.__henzoAlertResolve();
        modal.remove();
      }
    });
  });
}

// ---- RAFRAÎCHIR LA FONCTION showToast EXISTANTE ----
// Redirige l'ancien showToast vers le nouveau
const _ancienShowToast = window.showToast;
window.showToast = function(message){
  afficherToast(message, 'success');
};

(async function bootstrap(){
  const user = await getCurrentUser();
  const loading = document.getElementById('loadingScreen');
  if(loading) loading.classList.add('hidden');
  if(user){ await startApp(); } else { showLogin(); }
})();