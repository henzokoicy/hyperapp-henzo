// ============================================================
// MODULES.JS - Version complète et corrigée
// ============================================================

let editingReminderId = null;
let editingInspirationId = null;
let editingNoteId = null;
let editingGoalReminderId = null;
let paymentLinks = [];

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
  render();
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

  document.getElementById('notesCount').textContent = total;
  document.getElementById('notesReminders').textContent = withReminder;
  document.getElementById('notesUrgent').textContent = urgent;

  const catFilter = document.getElementById('notesFilterCategory').value;
  const statusFilter = document.getElementById('notesFilterStatus').value;
  const search = (document.getElementById('notesSearch').value || '').trim().toLowerCase();

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

  document.getElementById('inspCount').textContent = count;
  document.getElementById('inspFav').textContent = favs;
  document.getElementById('inspCategories').textContent = cats;

  const filterCat = document.getElementById('inspFilterCategory');
  const currentCat = filterCat.value;
  const allCats = [...new Set(inspirations.map(i => i.category).filter(Boolean))].sort();

  filterCat.innerHTML = '<option value="all">Toutes</option>' +
    allCats.map(c => `<option value="${c}">${c}</option>`).join('');
  if(currentCat && [...filterCat.options].some(o => o.value === currentCat)){ filterCat.value = currentCat; }

  const catFilter = filterCat.value;
  const favFilter = document.getElementById('inspFilterFav').value;
  const search = (document.getElementById('inspSearch').value || '').trim().toLowerCase();

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
// ============================================================
// 🆕 SYSTÈME D'OBJECTIFS LIBRES (argent OU quantité)
// ============================================================

// Détection automatique d'unité + emoji depuis le nom
function analyzeCoffreName(name){
  const n = (name || '').toLowerCase();
  const result = { unit: null, emoji: null, quantity: null };

  // Détection de quantité dans le nom (ex: "2 appareils", "3 maisons")
  const qMatch = name.match(/\b(\d+)\s+/);
  if(qMatch){
    const q = parseInt(qMatch[1]);
    if(!isNaN(q) && q > 0) result.quantity = q;
  }

  // Base de données d'unités et emojis
  const dict = [
    // Tech
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

    // Immobilier
    { k:['maison','villa','appartement','appart','studio','logement'], u:'maison', e:'🏠' },
    { k:['terrain','parcelle','lot'], u:'terrain', e:'🌳' },
    { k:['bureau','local','magasin','boutique'], u:'local', e:'🏢' },

    // Véhicules
    { k:['voiture','auto','bmw','toyota','mercedes'], u:'voiture', e:'🚗' },
    { k:['moto','scooter','bécane'], u:'moto', e:'🏍️' },
    { k:['vélo','bicyclette'], u:'vélo', e:'🚲' },

    // Marchandises
    { k:['barrique','bidon','fût','fut'], u:'barrique', e:'🛢️' },
    { k:['sac','carton','palette'], u:'sac', e:'📦' },
    { k:['huile','jus'], u:'bidon', e:'🧴' },
    { k:['riz','farine','sucre','kg','kilo','tonne'], u:'kg', e:'🌾' },

    // Vêtements / luxe
    { k:['chaussure','basket','sneaker','talon'], u:'paire', e:'👟' },
    { k:['montre','rolex','casio'], u:'montre', e:'⌚' },
    { k:['sac à main','sac femme'], u:'sac', e:'👜' },
    { k:['bijou','or','collier','bague'], u:'bijou', e:'💍' },

    // Spécial
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

  // Si pas détecté, on regarde le mot après la quantité
  if(!result.unit && result.quantity !== null){
    const afterQ = name.replace(/^\s*\d+\s*/, '').trim();
    const firstWord = afterQ.split(/\s+/)[0];
    if(firstWord && firstWord.length > 2){
      result.unit = firstWord.toLowerCase();
    }
  }

  // Fallback général
  if(!result.emoji) result.emoji = '🎯';
  if(!result.unit) result.unit = 'unité';

  return result;
}

// Change le type d'objectif (argent ou quantité)
function setGoalType(type){
  const btnMoney = document.getElementById('btnGoalMoney');
  const btnQty = document.getElementById('btnGoalQuantity');
  if(!btnMoney || !btnQty) return;

  const isMoney = type === 'money';

  btnMoney.classList.toggle('active', isMoney);
  btnQty.classList.toggle('active', !isMoney);

  // Adapter les labels
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

// Analyse en direct quand on tape le nom
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

  // Auto-remplissage
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
    dateEl.textContent = today.toLocaleDateString('fr-FR', {day:'2-digit', month:'short'});
  }

  const doneKey = `defi_${dayKey}`;
  if(localStorage.getItem(doneKey)){
    btnEl.classList.add('done');
    btnEl.textContent = '✅ Défi relevé !';
  } else {
    btnEl.classList.remove('done');
    btnEl.textContent = '✓ J\'ai relevé le défi';
  }

  let streak = 0;
  let d = new Date(today);
  while(true){
    const k = `defi_${d.toISOString().slice(0,10)}`;
    if(localStorage.getItem(k)){ streak++; d.setDate(d.getDate()-1); }
    else break;
  }
  streakEl.textContent = streak > 0 ? `🔥 Série : ${streak} jour${streak>1?'s':''} d'affilée !` : '';
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
      if(isMoney){
        return fmt(n);
      }
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
        items.push({
          cls:'',
          title:`${c.name}`,
          text:`Il te faut <strong>${fmtVal(perMonth)}</strong> par mois pour finir à temps.`
        });
      } else {
        items.push({
          cls:'danger',
          title:`${c.name}`,
          text:`Deadline dépassée. Reste ${fmtVal(rest)}.`
        });
      }
    } else {
      items.push({
        cls:'',
        title:`${c.name} : ${pct.toFixed(0)}%`,
        text:`Il te reste <strong>${fmtVal(rest)}</strong> à obtenir.`
      });
    }
  });

  el.innerHTML = items.map(i => `<div class="analyse-item ${i.cls}"><strong>${i.title}</strong>${i.text}</div>`).join('');
}

function openCoffreModal(id){
  editingCoffreId = id || null;
  const c = id ? coffres.find(x => x.id === id) : null;

  document.getElementById('coffreModalTitle').textContent = c ? 'Modifier' : 'Nouvel objectif';
  document.getElementById('coffreSubmit').textContent = c ? 'Enregistrer' : 'Créer';

  // Reset type par défaut
  setGoalType(c?.goal_type || 'money');

  document.getElementById('coffreName').value = c?.name || '';
  document.getElementById('coffreGoal').value = c?.goal || '';
  document.getElementById('coffreCurrent').value = c?.current || '';
  document.getElementById('coffreDate').value = c?.target_date || '';
  document.getElementById('coffreWhy').value = c?.why || '';
  document.getElementById('coffreEmoji').value = c?.emoji || '';
  document.getElementById('coffreUnit').value = c?.unit || 'FCFA';
  document.getElementById('coffreDescription').value = c?.description || '';

  // Reset analyse
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
  const goal = parseFloat(document.getElementById('coffreGoal').value);
  const current = parseFloat(document.getElementById('coffreCurrent').value) || 0;
  const target_date = document.getElementById('coffreDate').value || null;
  const why = document.getElementById('coffreWhy').value.trim();
  const emoji = document.getElementById('coffreEmoji').value.trim();
  const unit = document.getElementById('coffreUnit').value.trim() || 'FCFA';
  const description = document.getElementById('coffreDescription').value.trim();

  // Détecter le type
  const btnQty = document.getElementById('btnGoalQuantity');
  const goal_type = (btnQty && btnQty.classList.contains('active')) ? 'quantity' : 'money';

  if(!name){ alert('Le nom de l\'objectif est requis'); return; }
  if(!goal || goal <= 0){ alert('Indique une valeur à atteindre'); return; }

  const data = {
    name,
    goal,
    current,
    target_date,
    why: why || null,
    goal_type,
    unit,
    emoji: emoji || null,
    description: description || null
  };

  if(editingCoffreId){
    const result = await dbUpdate('goals', editingCoffreId, data);
    if(!result) return;
    const idx = coffres.findIndex(c => c.id === editingCoffreId);
    coffres[idx] = result;
    showToast('Objectif modifié');
  } else {
    const result = await dbInsert('goals', data);
    if(!result) return;
    coffres.unshift(result);
    showToast('Objectif créé');
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
  refreshAll();
}

function renderCoffres(){
  renderMotivationJour();
  renderDefiDuJour();
  renderAnalysePercutante();
  renderGoalReminders();
  renderGoalSuggestions();

  const el = document.getElementById('coffresList');
  if(!el) return;
  if(coffres.length === 0){ el.innerHTML = '<div class="empty">Aucun objectif. Crées-en un.</div>'; return; }

  el.innerHTML = coffres.map(c => {
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
      if(isMoney){
        return fmt(n);
      }
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

    return `<div class="coffre ${done ? 'completed' : ''}">
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
      ${c.description ? `<div class="coffre-why" style="border-left-color:var(--pink)">📝 ${c.description}</div>` : ''}
      ${c.why ? `<div class="coffre-why">"${c.why}"</div>` : ''}
      ${timeInfo}
      <div class="coffre-actions">
        <button class="btn-primary" style="margin:0;background:var(--green)" onclick="ouvrirEpargnePerso(${c.id})">${isMoney ? '🎯 Épargner' : '✅ Ajouter'}</button>
        <button class="btn-ghost" style="margin:0" onclick="openCoffreModal(${c.id})">✏️ Modifier</button>
        <button class="btn-ghost" style="margin:0" onclick="delCoffre(${c.id})">🗑</button>
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
    city: document.getElementById('clientCity').value.trim(),
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
  if(clients.length === 0){ el.innerHTML = '<div class="empty">Aucun client</div>'; return; }

  el.innerHTML = clients.map(c => `
    <div class="item-card">
      <div class="head"><div class="name">👤 ${c.name}</div></div>
      ${c.phone ? `<div class="amt"><span>📞 ${c.phone}</span></div>` : ''}
      ${c.email ? `<div class="amt"><span>✉️ ${c.email}</span></div>` : ''}
      ${c.city ? `<div class="amt"><span>📍 ${c.city}</span></div>` : ''}
      ${c.notes ? `<div style="font-size:12px;color:var(--muted);margin-top:6px">${c.notes}</div>` : ''}
      <div class="actions" style="display:flex;gap:6px;margin-top:8px">
        <button class="btn-ghost" style="margin:0;padding:6px" onclick="openClientModal(${c.id})">Modifier</button>
        <button class="btn-ghost" style="margin:0;padding:6px" onclick="delClient(${c.id})">×</button>
      </div>
    </div>`).join('');
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
// MODULE PHOTO - SÉANCES
// ============================================================
const TYPES_FIXES = ['Mariage','Dot','Shooting Studio','Shoot Extérieur','Autre'];
let currentShootFilter = 'all';

function onShootTypeChange(){
  const t = document.getElementById('shootType').value;
  document.getElementById('shootCustomTypeWrap').style.display = (t === 'Autre') ? 'block' : 'none';
}

function openShootModal(id){
  editingShootId = id || null;
  const s = id ? shoots.find(x => x.id === id) : null;

  document.getElementById('shootModalTitle').textContent = s ? 'Modifier la séance' : 'Nouvelle séance';

  const sel = document.getElementById('shootClient');
  sel.innerHTML = '<option value="">-- Choisir --</option>' + clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  if(s){
    sel.value = s.client_id || '';
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
    sel.value = '';
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
  document.getElementById('shootModalBg').classList.add('show');
}

function closeShootModal(){
  document.getElementById('shootModalBg').classList.remove('show');
  editingShootId = null;
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

  const data = {
    client_id: clientId ? parseInt(clientId) : null,
    type, location, photo_count, date, price, payment, notes
  };

  if(!editingShootId){
    data.status = 'planifie';
    data.status_updated_at = new Date().toISOString();
  }

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
  refreshAll();
}

async function delShoot(id){
  if(!confirm("Supprimer ?")) return;
  const ok = await dbDelete('shoots', id);
  if(!ok) return;
  shoots = shoots.filter(s => s.id !== id);
  refreshAll();
}

async function toggleShootPayment(id){
  const s = shoots.find(x => x.id === id);
  if(!s) return;
  const newPayment = s.payment === 'paye' ? 'impaye' : 'paye';
  const wasUnpaid = s.payment === 'impaye';

  const result = await dbUpdate('shoots', id, {payment: newPayment});
  if(!result) return;
  s.payment = newPayment;

  // Si on vient de marquer comme PAYÉ, on propose la répartition
  if(newPayment === 'paye' && wasUnpaid && Number(s.price) > 0){
    // Créer automatiquement la transaction de revenu
    const client = s.client_id ? clients.find(c => c.id === s.client_id) : null;
    const clientName = client ? client.name : '';
    const note = (s.type || 'Séance') + (clientName ? ' · ' + clientName : '');

    const txResult = await dbInsert('transactions', {
      type: 'revenu',
      amount: Number(s.price),
      category: 'Shooting photo',
      note: note,
      date: todayStr(),
      client_id: s.client_id || null,
      client_name: clientName || null,
      prestation_type: s.type || 'Séance',
      location: s.location || null,
      payment_method: 'Espèces',
      amount_type: 'complet',
      photo_count: s.photo_count || null
    });

    if(txResult){
      txs.unshift(txResult);
    }

    refreshAll();
    showToast('✓ Payé · ' + fmt(s.price) + ' ajouté aux revenus');

    // 🎯 Lancer l'assistant de répartition
    setTimeout(() => {
      demarrerAssistant({
        amount: Number(s.price),
        prestationType: s.type || 'Séance',
        clientName: clientName,
        location: s.location || '',
        source: 'Séance photo'
      });
    }, 500);
    return;
  }

  refreshAll();
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

  let list = [...shoots];
  if(currentShootFilter !== 'all'){
    if(currentShootFilter === 'planifie'){
      list = list.filter(s => s.status === 'planifie' || s.status === 'encours');
    } else {
      list = list.filter(s => s.status === currentShootFilter);
    }
  }
  const sorted = list.sort((a,b) => (b.date || '').localeCompare(a.date || ''));

  if(sorted.length === 0){ el.innerHTML = '<div class="empty">Aucune séance dans ce filtre</div>'; return; }

  const statusInfo = {
    'planifie': { label: '📅 Planifié', class: 'planifie' },
    'encours':  { label: '🟠 En cours',  class: 'encours' },
    'shoote':   { label: '✅ Shooté',    class: 'shoote' },
    'annule':   { label: '❌ Annulé',    class: 'annule' }
  };

  el.innerHTML = sorted.map(s => {
    const client = s.client_id ? clients.find(c => c.id === s.client_id) : null;
    const d = new Date(s.date);
    const dStr = d.toLocaleDateString('fr-FR', {day:'2-digit', month:'short', year:'numeric'}) + ' à ' + d.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
    const locInfo = s.location ? `📍 ${s.location}` : '';
    const photoInfo = s.photo_count ? `📷 ${s.photo_count} photos` : '';
    const metaInfo = [locInfo, photoInfo].filter(x => x).join(' · ');

    const stat = statusInfo[s.status] || statusInfo['planifie'];
    const isCancelled = s.status === 'annule';
    const isDone = s.status === 'shoote';
    const itemClass = isCancelled ? 'cancelled' : (isDone ? 'done' : '');

    let actionButtons = '';
    if(isCancelled){
      actionButtons = `
        <button class="btn-ghost" style="margin:0;padding:6px;background:rgba(46,204,113,.15);color:var(--green);border-color:var(--green);flex:1" onclick="reactivateShoot(${s.id})">🔄 Réactiver</button>
        <button class="btn-ghost" style="margin:0;padding:6px" onclick="openShootModal(${s.id})" title="Modifier">✏️</button>
        <button class="btn-ghost" style="margin:0;padding:6px;border-color:var(--red);color:var(--red)" onclick="delShoot(${s.id})" title="Supprimer">🗑</button>
      `;
    } else {
      actionButtons = `
        <button class="btn-primary" style="margin:0;padding:6px;background:${s.payment==='paye'?'var(--yellow)':'var(--green)'};flex:1" onclick="toggleShootPayment(${s.id})">
          ${s.payment === 'paye' ? '💸 Impayé' : '✓ Payé'}
        </button>
        ${s.payment === 'impaye' ? `<button class="btn-ghost" style="margin:0;padding:6px;border-color:var(--wave);color:var(--wave)" onclick="genererLienPaiementClient(${s.id})" title="Envoyer lien de paiement">📤 Lien</button>` : ''}
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
          ${!isCancelled ? `<span class="badge ${s.payment}">${s.payment === 'paye' ? 'Payé' : 'Impayé'}</span>` : ''}
        </div>
      </div>
      <div class="amt">
        <span>📅 ${dStr}</span>
        <span style="color:var(--green);font-weight:600">${fmt(s.price)}</span>
      </div>
      ${metaInfo ? `<div style="font-size:12px;color:var(--muted);margin-top:6px">${metaInfo}</div>` : ''}
      ${isCancelled && s.cancel_reason ? `<div style="font-size:12px;color:var(--red);margin-top:6px;font-style:italic">❌ Raison : ${s.cancel_reason}</div>` : ''}
      ${s.notes ? `<div style="font-size:12px;color:var(--muted);margin-top:4px">${s.notes}</div>` : ''}
      <div class="actions" style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">${actionButtons}</div>
    </div>`;
  }).join('');
}

function renderPhotoStats(){
  const ym = monthKey();
  const monthShoots = shoots.filter(s => s.date && s.date.startsWith(ym));
  const revenue = monthShoots.filter(s => s.payment === 'paye').reduce((sum,s) => sum + Number(s.price), 0);
  const pending = shoots.filter(s => s.payment === 'impaye').reduce((sum,s) => sum + Number(s.price), 0);

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
  const revenue = monthShoots.filter(s => s.payment === 'paye').reduce((sum,s) => sum + Number(s.price), 0);
  const pending = shoots.filter(s => s.payment === 'impaye').reduce((sum,s) => sum + Number(s.price), 0);

  document.getElementById('overviewClients').textContent = clients.length;
  document.getElementById('overviewShoots').textContent = monthShoots.length;
  document.getElementById('overviewPhotoRev').textContent = fmt(revenue);
  document.getElementById('overviewPending').textContent = fmt(pending);
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

  let color = 'var(--accent)';
  if(score >= 75) color = 'var(--green)';
  else if(score >= 50) color = 'var(--yellow)';
  else color = 'var(--red)';

  el.style.background = `conic-gradient(${color} 0% ${score}%, var(--card2) ${score}% 100%)`;
  el.innerHTML = `<span>${score}</span>`;

  if(score >= 75){ title.textContent = '🌟 Excellente santé'; text.textContent = 'Continue !'; }
  else if(score >= 50){ title.textContent = '👍 Bonne santé'; text.textContent = 'Quelques ajustements.'; }
  else { title.textContent = '⚠ À améliorer'; text.textContent = 'Concentre-toi sur l\'épargne.'; }
}

function renderRevDepDonut(){
  const s = computeStats();
  const total = s.totalIn + s.totalOut;
  const donut = document.getElementById('donutRevDep');
  const centerText = document.getElementById('donutRevDepText');
  const legend = document.getElementById('legendRevDep');

  if(total === 0){
    donut.style.background = 'conic-gradient(var(--card2) 0% 100%)';
    centerText.textContent = '--';
    legend.innerHTML = '<div class="empty" style="padding:0">Aucune donnée</div>';
    return;
  }

  const pctIn = (s.totalIn / total) * 100;
  donut.style.background = `conic-gradient(var(--green) 0% ${pctIn}%, var(--red) ${pctIn}% 100%)`;
  centerText.innerHTML = `<div><div style="font-size:14px">${Math.round(pctIn)}%</div><div style="font-size:9px;color:var(--muted)">Revenus</div></div>`;

  legend.innerHTML = `
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

function getFilteredTx(){
  const month = document.getElementById('histMonth').value;
  const type = document.getElementById('histType').value;
  const cat = document.getElementById('histCategory').value;

  return txs.filter(t => {
    if(month !== 'all' && !t.date.startsWith(month)) return false;
    if(type !== 'all' && t.type !== type) return false;
    if(cat !== 'all' && t.category !== cat) return false;
    return true;
  }).sort((a,b) => b.date.localeCompare(a.date));
}

function renderHistory(){
  const filtered = getFilteredTx();
  const totalIn = filtered.filter(t => t.type === 'revenu').reduce((s,t) => s + Number(t.amount), 0);
  const totalOut = filtered.filter(t => t.type === 'depense').reduce((s,t) => s + Number(t.amount), 0);

  document.getElementById('histCount').textContent = filtered.length;
  document.getElementById('histIn').textContent = fmt(totalIn);
  document.getElementById('histOut').textContent = fmt(totalOut);

  const el = document.getElementById('histList');
  if(filtered.length === 0){
    el.innerHTML = '<div class="empty">Aucune transaction</div>';
    document.getElementById('histSelectAll').checked = false;
    return;
  }

  el.innerHTML = filtered.map(t => {
    const d = new Date(t.date).toLocaleDateString('fr-FR', {day:'2-digit', month:'short', year:'numeric'});
    const sign = t.type === 'revenu' ? '+' : '-';
    const cls = t.type === 'revenu' ? 'pos' : 'neg';
    const checked = selectedTxIds.has(t.id) ? 'checked' : '';

    return `<div class="hist-item">
      <input type="checkbox" class="hist-check" data-id="${t.id}" ${checked} onchange="toggleTxSelect(${t.id}, this.checked)">
      <div class="hist-content">
        <div class="hist-top"><span class="hist-cat">${t.category}</span><span class="hist-amt ${cls}">${sign}${fmt(t.amount)}</span></div>
        <div class="hist-bottom">${d}${t.note ? ' · ' + t.note : ''}</div>
      </div>
      <button class="hist-del" onclick="delTxFromHistory(${t.id})">×</button>
    </div>`;
  }).join('');

  const allChecked = filtered.length > 0 && filtered.every(t => selectedTxIds.has(t.id));
  document.getElementById('histSelectAll').checked = allChecked;
}

function toggleTxSelect(id, checked){
  if(checked) selectedTxIds.add(id); else selectedTxIds.delete(id);
  const filtered = getFilteredTx();
  const allChecked = filtered.length > 0 && filtered.every(t => selectedTxIds.has(t.id));
  document.getElementById('histSelectAll').checked = allChecked;
}

function toggleSelectAll(){
  const isChecked = document.getElementById('histSelectAll').checked;
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
    return `${t.date};${t.type};${t.category};${t.amount};"${note}"`;
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
    new Date(t.date).toLocaleDateString('fr-FR'),
    t.type === 'revenu' ? 'Revenu' : 'Dépense',
    t.category,
    (t.type === 'revenu' ? '+' : '-') + fmt(t.amount),
    t.note || ''
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

    document.getElementById('ideasAIOutput').innerHTML = formatIdeasText(data.ideas_ai);
    document.getElementById('ideasCopyBtn').disabled = false;
    document.getElementById('ideasPdfBtn').disabled = false;
    document.getElementById('ideasClearBtn').disabled = false;

    if(data.ideas_ai_date){
      const dateEl = document.getElementById('ideasLastUpdate');
      dateEl.textContent = '🕐 Dernière génération : ' + data.ideas_ai_date;
      dateEl.classList.add('visible');
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

  document.getElementById('ideasAIOutput').innerHTML = '<div class="empty">Clique sur <strong>Générer</strong>.</div>';
  document.getElementById('ideasLastUpdate').classList.remove('visible');
  document.getElementById('ideasCopyBtn').disabled = true;
  document.getElementById('ideasPdfBtn').disabled = true;
  document.getElementById('ideasClearBtn').disabled = true;
}

async function copyIdeasAI(){
  const text = localStorage.getItem('ideas_ai_last');
  if(!text){ alert('Aucune idée à copier'); return; }
  try {
    await navigator.clipboard.writeText(text);
    const btn = document.getElementById('ideasCopyBtn');
    btn.textContent = '✅ Copié !';
    setTimeout(() => btn.textContent = '📋 Copier', 2000);
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

  const cleanText = text.replace(/\*\*/g, '').replace(/→/g, '•');
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
  out.innerHTML = '<div class="empty">⏳ Génération en cours...</div>';

  const summary = buildSummary();
  const prompt = `Voici le profil : ${summary}\n\nGénère 5 idées de business CONCRÈTES et ADAPTÉES (photographe).\nFormat strict :\n1. [Titre]\n   • [Description]\n   • Revenu potentiel: [fourchette FCFA]\n   • Difficulté: Facile/Moyenne/Difficile\n(etc.)\n\nN'utilise PAS d'astérisques.`;

  try {
    const text = await callAI(prompt);
    if(!text || !text.trim()){ out.innerHTML = '<div class="empty">❌ Pas de réponse.</div>'; return; }

    await saveIdeasAI(text);
    out.innerHTML = formatIdeasText(text);

    document.getElementById('ideasCopyBtn').disabled = false;
    document.getElementById('ideasPdfBtn').disabled = false;
    document.getElementById('ideasClearBtn').disabled = false;

    const dateEl = document.getElementById('ideasLastUpdate');
    dateEl.textContent = '🕐 Dernière génération : ' + new Date().toLocaleString('fr-FR');
    dateEl.classList.add('visible');
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

  if(!('Notification' in window)){ document.getElementById('notifStatus').textContent = '❌ Non supporté'; return; }

  const permission = await Notification.requestPermission();
  if(permission !== 'granted'){ document.getElementById('notifStatus').textContent = '❌ Permission refusée.'; return; }

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
    document.getElementById('notifStatus').textContent = '❌ ' + e.message;
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

// ============================================================
// 🆕 RAPPELS AUTOMATIQUES POUR LES SÉANCES PHOTO
// 5 rappels : J-7, J-4, J-2, J-1 (à 20h), et 3h avant le shoot
// ============================================================
async function checkShootReminders(){
  if(!isNotifEnabled()) return;
  if(!('Notification' in window) || Notification.permission !== 'granted') return;
  if(!shoots || shoots.length === 0) return;

  const now = new Date();
  const todayKey = now.toISOString().slice(0,10);
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

    // J-7
    if(diffDays > 6.5 && diffDays < 7.5){
      if(hh === 20 && mm < 5){
        const key = `shoot_j7_${s.id}`;
        if(!localStorage.getItem(key)){
          await showLocalNotification(
            '📸 Shoot dans 1 semaine !',
            `${s.type}${clientName} · ${dateStr} à ${timeStr}${location}`
          );
          afficherPopupNotif(
            '📸 Shoot dans 1 semaine !',
            `${s.type}${clientName} · ${dateStr} à ${timeStr}${location}`,
            '📸',
            10000
          );
          localStorage.setItem(key, '1');
        }
      }
    }

    // J-4
    if(diffDays > 3.5 && diffDays < 4.5){
      if(hh === 20 && mm < 5){
        const key = `shoot_j4_${s.id}`;
        if(!localStorage.getItem(key)){
          await showLocalNotification(
            '📸 Shoot dans 4 jours !',
            `${s.type}${clientName} · ${dateStr} à ${timeStr}${location}`
          );
          afficherPopupNotif(
            '📸 Shoot dans 4 jours !',
            `${s.type}${clientName} · ${dateStr} à ${timeStr}${location}`,
            '📸',
            10000
          );
          localStorage.setItem(key, '1');
        }
      }
    }

    // J-2
    if(diffDays > 1.5 && diffDays < 2.5){
      if(hh === 20 && mm < 5){
        const key = `shoot_j2_${s.id}`;
        if(!localStorage.getItem(key)){
          await showLocalNotification(
            '📸 Shoot dans 2 jours !',
            `${s.type}${clientName} · ${dateStr} à ${timeStr}${location}`
          );
          afficherPopupNotif(
            '📸 Shoot dans 2 jours !',
            `${s.type}${clientName} · ${dateStr} à ${timeStr}${location}`,
            '📸',
            10000
          );
          localStorage.setItem(key, '1');
        }
      }
    }

    // J-1 (veille)
    if(diffDays > 0.5 && diffDays < 1.5){
      if(hh === 20 && mm < 5){
        const key = `shoot_j1_${s.id}`;
        if(!localStorage.getItem(key)){
          await showLocalNotification(
            '📸 Shoot DEMAIN !',
            `${s.type}${clientName} · ${dateStr} à ${timeStr}${location}`
          );
          afficherPopupNotif(
            '📸 Shoot DEMAIN !',
            `${s.type}${clientName} · ${dateStr} à ${timeStr}${location}`,
            '📸',
            12000
          );
          localStorage.setItem(key, '1');
        }
      }
    }

    // 3h avant
    if(diffHours > 2.75 && diffHours < 3.25){
      const key = `shoot_h3_${s.id}`;
      if(!localStorage.getItem(key)){
        await showLocalNotification(
          '⏰ Shoot dans 3h !',
          `${s.type}${clientName} à ${timeStr}${location}`
        );
        afficherPopupNotif(
          '⏰ Shoot dans 3h !',
          `${s.type}${clientName} à ${timeStr}${location}`,
          '⏰',
          12000
        );
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
  const val = document.getElementById('reminderType').value;
  const wrap = document.getElementById('reminderCustomTypeWrap');
  if(wrap) wrap.style.display = (val === 'Autre') ? 'block' : 'none';
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
// RAPPELS D'OBJECTIFS (goal_reminders)
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
  const freq = document.getElementById('goalReminderFrequency').value;
  const wrap = document.getElementById('goalReminderDayWrap');
  if(wrap) wrap.style.display = (freq === 'weekly') ? 'block' : 'none';
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

    document.getElementById('aiOutput').innerHTML = formatAnalysisText(data.ai_analysis);
    document.getElementById('aiCopyBtn').disabled = false;
    document.getElementById('aiPdfBtn').disabled = false;
    document.getElementById('aiClearBtn').disabled = false;

    if(data.ai_analysis_date){
      const dateEl = document.getElementById('aiLastUpdate');
      dateEl.textContent = '🕐 Dernière analyse : ' + data.ai_analysis_date;
      dateEl.classList.add('visible');
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

  document.getElementById('aiOutput').innerHTML = '<div class="empty">Clique sur <strong>Analyser</strong>.</div>';
  document.getElementById('aiLastUpdate').classList.remove('visible');
  document.getElementById('aiCopyBtn').disabled = true;
  document.getElementById('aiPdfBtn').disabled = true;
  document.getElementById('aiClearBtn').disabled = true;
}

async function copyAnalysis(){
  const text = localStorage.getItem('ai_last_analysis');
  if(!text){ alert('Aucune analyse à copier'); return; }
  try {
    await navigator.clipboard.writeText(text);
    const btn = document.getElementById('aiCopyBtn');
    btn.textContent = '✅ Copié !';
    setTimeout(() => btn.textContent = '📋 Copier', 2000);
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

  const cleanText = text.replace(/\*\*/g, '');
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
  const provider = document.getElementById('aiProvider').value;
  const key = document.getElementById('aiKey').value.trim();
  const url = document.getElementById('aiUrl').value.trim();
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
    document.getElementById('aiProvider').value = cfg.provider;
    document.getElementById('aiKey').value = cfg.key;
    if(cfg.url) document.getElementById('aiUrl').value = cfg.url;
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
  document.getElementById('aiUrlLabel').style.display = isCustom ? 'block' : 'none';
  document.getElementById('aiUrl').style.display = isCustom ? 'block' : 'none';
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
  out.innerHTML = '<div class="empty">⏳ Analyse en cours...</div>';

  const summary = buildSummary();
  const prompt = `Tu es un conseiller financier personnel. Voici le résumé :\n\n${summary}\n\nAnalyse en français, en 8 points numérotés :\n1. Diagnostic global\n2. Taux d'épargne\n3. Poste à surveiller\n4. Prévision fin de mois\n5. Combien épargner ce mois\n6. Une idée de business adaptée\n7. Action immédiate aujourd'hui\n8. Encouragement personnalisé\n\nConcret, chiffré. N'utilise PAS d'astérisques.`;

  try {
    const text = await callAI(prompt);
    if(!text || !text.trim()){ out.innerHTML = '<div class="empty">❌ Pas de réponse.</div>'; return; }

    await saveAnalysis(text);
    out.innerHTML = formatAnalysisText(text);

    document.getElementById('aiCopyBtn').disabled = false;
    document.getElementById('aiPdfBtn').disabled = false;
    document.getElementById('aiClearBtn').disabled = false;

    const dateEl = document.getElementById('aiLastUpdate');
    dateEl.textContent = '🕐 Dernière analyse : ' + new Date().toLocaleString('fr-FR');
    dateEl.classList.add('visible');
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

// Charge la conversation depuis Supabase (avec fallback localStorage)
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
        // Mettre à jour le cache local
        const key = await getChatStorageKey();
        localStorage.setItem(key, JSON.stringify(chatHistory));
        return;
      }
    }
  } catch(e){
    console.warn('loadChatHistory Supabase error:', e);
  }

  // Fallback : localStorage
  try {
    const key = await getChatStorageKey();
    const raw = localStorage.getItem(key);
    chatHistory = raw ? JSON.parse(raw) : [];
  } catch(e){ chatHistory = []; }
}

// Sauvegarde dans Supabase ET localStorage (50 derniers messages)
async function saveChatHistory(){
  // Limiter à 50 messages
  const toSave = chatHistory.slice(-50);
  chatHistory = toSave;

  // 1. Sauvegarder dans localStorage (rapide)
  try {
    const key = await getChatStorageKey();
    localStorage.setItem(key, JSON.stringify(toSave));
  } catch(e){}

  // 2. Sauvegarder dans Supabase (synchro entre appareils)
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

  // Effacer du localStorage
  try {
    const key = await getChatStorageKey();
    localStorage.removeItem(key);
  } catch(e){}

  // Effacer de Supabase
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

// 🆕 Nettoie le texte pour jsPDF (retire emojis et caractères non supportés)
function cleanTextForPDF(text){
  if(!text) return '';
  return String(text)
    // Emojis et symboles Unicode → à retirer
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
    .replace(/[\u{2300}-\u{23FF}]/gu, '')  // symboles techniques
    .replace(/[\u{25A0}-\u{25FF}]/gu, '')  // formes géométriques
    .replace(/[\u{2190}-\u{21FF}]/gu, '→') // flèches → "→"
    // Caractères typographiques spéciaux
    .replace(/[—–]/g, '-')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/…/g, '...')
    .replace(/\u202F|\u00A0|\u2009/g, ' ') // espaces insécables
    // Caractères de contrôle
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    // Nettoyage final
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

  // En-tête
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

    // 🆕 Nettoyer le contenu AVANT tout traitement
    const cleanContent = cleanTextForPDF(m.content || '');

    // Marqueur de qui parle
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    if(isUser){
      doc.setTextColor(108, 140, 255);
    } else {
      doc.setTextColor(46, 180, 100);
    }

    if(y > 270){ doc.addPage(); y = 20; }
    doc.text(who + (dateStr ? '  -  ' + dateStr : ''), margin, y);
    y += 7;

    // Contenu (nettoyé)
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);

    const lines = doc.splitTextToSize(cleanContent, pageWidth);
    lines.forEach(line => {
      if(y > 275){
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += 5;
    });

    y += 6;
  });

  // Pied de page sur la dernière page
  const pageCount = doc.internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++){
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      'Conversation exportée depuis Super App Henzo',
      105,
      290,
      { align: 'center' }
    );
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
// LIEN DE PAIEMENT CLIENT (unifié avec payment_links)
// ============================================================
function genererLienPaiementClient(shootId) {
  const shoot = shoots.find(s => s.id === shootId);
  if(!shoot) return;
  const client = shoot.client_id ? clients.find(c => c.id === shoot.client_id) : null;
  const clientName = client ? client.name : '';
  const clientPhone = client ? (client.phone || '') : '';

  // Préparer la date pour input datetime-local
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
    // 🆕 On transmet TOUS les détails du shoot
    shootType: shoot.type || '',
    shootDate: shootDateLocal,
    shootLocation: shoot.location || '',
    shootNotes: shoot.notes || '',
    photoCount: shoot.photo_count || ''
  });
}

// ============================================================
// LIENS DE PAIEMENT PERSONNALISÉS (payment_links)
// ============================================================
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
      <input type="text" id="lienClientName" placeholder="Ex: M. Kouassi" list="lienClientsList" autocomplete="off" value="${(prefill.clientName || '').replace(/"/g, '&quot;')}">
      <datalist id="lienClientsList">
        ${clients.map(c => `<option value="${c.name}">`).join('')}
      </datalist>

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
        <option value="solde"${prefill.paymentType === 'solde' ? ' selected' : ''}>📌 Solde restant (à saisir)</option>
      </select>

      <div id="montantCalcule" style="background:linear-gradient(135deg,rgba(46,204,113,.15),rgba(108,140,255,.08));border-radius:12px;padding:14px;margin-top:14px;display:none">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Le client devra payer</div>
        <div id="montantCalculeValue" style="font-weight:700;color:var(--green);font-size:22px">...</div>
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
  const total = parseFloat(document.getElementById('lienTotalAmount').value) || 0;
  const type = document.getElementById('lienPaymentType').value;
  const box = document.getElementById('montantCalcule');
  const value = document.getElementById('montantCalculeValue');

  if(!total || total <= 0) { box.style.display = 'none'; return; }

  let montant = total;
  if(type === 'acompte30') montant = total * 0.30;
  else if(type === 'acompte50') montant = total * 0.50;

  value.textContent = new Intl.NumberFormat('fr-FR').format(Math.round(montant)) + ' FCFA';
  box.style.display = 'block';
}

async function genererLienPersonnalise() {
  const clientName = document.getElementById('lienClientName').value.trim();
  const clientPhone = document.getElementById('lienClientPhone').value.trim();
  const totalAmount = parseFloat(document.getElementById('lienTotalAmount').value);
  const desc = document.getElementById('lienDesc').value.trim() || 'Paiement';
  const paymentType = document.getElementById('lienPaymentType').value;
  const waveLink = document.getElementById('lienWaveUrl').value.trim();

  // 🆕 Nouveaux champs détails
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

  let montant = totalAmount;
  if(paymentType === 'acompte30') montant = totalAmount * 0.30;
  else if(paymentType === 'acompte50') montant = totalAmount * 0.50;

  const result = await dbInsert('payment_links', {
    client_name: clientName,
    client_phone: clientPhone || null,
    description: desc,
    amount: Math.round(montant),
    total_amount: Math.round(totalAmount),
    payment_type: paymentType,
    wave_link: waveLink,
    status: 'pending',
    // 🆕 Détails du shoot
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
    phone: link.client_phone || ''
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

  const message = `Bonjour ${data.clientName} 👋,\n\nVoici votre lien de paiement sécurisé :\n\n📝 ${data.desc}\n💳 ${fmt(data.montant)}\n\n👉 Cliquez ici pour payer :\n${data.lien}\n\nMerci pour votre confiance !\nHENZO PHOTOGRAPHIE`;

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
// ⚠️ NE PAS MODIFIER LA SUITE — voir PARTIE 2/2
// ============================================================
// ============================================================
// REÇU PDF CLIENT
// ============================================================

// Ouvre la modale du reçu avec 3 actions
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

// Génère le PDF du reçu (retourne le document jsPDF)
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

  // Nettoyage des espaces insécables et caractères spéciaux
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

  // ---- EN-TÊTE ----
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

  // ---- STATUT PAYÉ ----
  doc.setFillColor(240, 255, 245);
  doc.roundedRect(margin, 50, pageWidth - margin * 2, 14, 2, 2, 'F');
  doc.setTextColor(16, 130, 80);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PAIEMENT REÇU ET CONFIRMÉ', pageWidth / 2, 59, { align: 'center' });

  // ---- BLOC CLIENT / ÉMETTEUR ----
  let y = 78;
  const colWidth = (pageWidth - margin * 2 - 6) / 2;

  // Émetteur (gauche)
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

  // Client (droite)
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

  // ---- DÉTAILS DE LA PRESTATION ----
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setTextColor(120, 120, 120);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('DÉTAILS DE LA PRESTATION', margin, y);
  y += 8;

  // Construction de la liste des détails
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

  // Notes libres (si présentes)
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

  // ---- TYPE DE PAIEMENT ----
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

  // ---- BLOC MONTANT ----
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

  // ---- MENTION LÉGALE ----
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'Ce reçu atteste du paiement reçu par HENZO PHOTOGRAPHIE.',
    pageWidth / 2,
    y + 8,
    { align: 'center' }
  );
  doc.text(
    'Merci pour votre confiance !',
    pageWidth / 2,
    y + 14,
    { align: 'center' }
  );

  // ---- PIED DE PAGE ----
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    'henzophotographie@gmail.com  ·  +225 01 70 99 89 64  ·  Côte d\'Ivoire',
    pageWidth / 2,
    285,
    { align: 'center' }
  );

  return doc;
}
// Télécharger le reçu PDF
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

// Envoyer le reçu par WhatsApp (avec partage natif si possible)
async function envoyerRecuWhatsApp(linkId) {
  const link = paymentLinks.find(x => x.id === linkId);
  if(!link) { alert('Lien introuvable'); return; }

  const ref = 'PL-' + String(link.id).padStart(4, '0');
  const amountStr = fmt(link.amount);

  // Message WhatsApp
  const message =
    `Bonjour ${link.client_name || ''} 👋,\n\n` +
    `Merci pour votre paiement de ${amountStr} 💚\n\n` +
    `📝 Prestation : ${link.description || 'Paiement'}\n` +
    `📄 Référence : ${ref}\n` +
    `✅ Statut : PAYÉ\n\n` +
    `Vous trouverez votre reçu en pièce jointe 📎\n\n` +
    `Merci pour votre confiance !\n` +
    `HENZO PHOTOGRAPHIE 📸`;

  // Numéro WhatsApp (format international sans +)
  let waUrl;
  if(link.client_phone) {
    const clean = link.client_phone.replace(/[^0-9]/g, '');
    const fullPhone = clean.startsWith('225') ? clean : '225' + clean;
    waUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
  } else {
    waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  }

  // 1. ESSAI : Web Share API (permet d'envoyer le PDF directement)
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
    // L'utilisateur a peut-être annulé le partage
    if(shareErr.name === 'AbortError') return;
    console.warn('Web Share indisponible, fallback WhatsApp Web:', shareErr);
  }

  // 2. FALLBACK : télécharger le PDF + ouvrir WhatsApp
  try {
    const doc = genererRecuPDFClient(link);
    doc.save(`Recu-${ref}.pdf`);

    setTimeout(() => {
      window.open(waUrl, '_blank');
    }, 500);

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

  // 1. Marquer le lien comme payé
  const result = await dbUpdate('payment_links', id, {
    status: 'paid',
    paid_at: new Date().toISOString()
  });
  if(!result) return;

  const idx = paymentLinks.findIndex(l => l.id === id);
  if(idx >= 0) paymentLinks[idx] = result;

  // 2. Créer AUTOMATIQUEMENT la transaction de revenu
  const txResult = await dbInsert('transactions', {
    type: 'revenu',
    amount: Number(link.amount),
    category: 'Shooting photo',
    note: (link.description || 'Paiement') + ' · ' + (link.client_name || ''),
    date: todayStr()
  });

  if(txResult){
    txs.unshift(txResult);
  }

  // 3. Rafraîchir tout
  renderPaymentLinks();
  refreshAll();
  showToast(fmt(link.amount) + ' ajouté aux revenus');

  // 4. Ouvrir la modale de répartition intelligente
   // 4. Lancer l'assistant conversationnel
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
// 🆕 GUIDE FINANCIER INTELLIGENT
// Aide Henzo à répartir ses revenus par type de prestation
// ============================================================

// Règles par défaut de répartition (%)
const REGLES_REPARTITION = {
  'mariage':    { epargne: 30, charges: 40, libre: 30, icon: '💍', label: 'Mariage' },
  'dot':        { epargne: 30, charges: 40, libre: 30, icon: '💐', label: 'Dot' },
  'studio':     { epargne: 25, charges: 45, libre: 30, icon: '🎬', label: 'Studio' },
  'shooting':   { epargne: 20, charges: 50, libre: 30, icon: '📸', label: 'Shooting' },
  'corporate':  { epargne: 25, charges: 45, libre: 30, icon: '💼', label: 'Corporate' },
  'drone':      { epargne: 30, charges: 40, libre: 30, icon: '🚁', label: 'Drone' },
  'default':    { epargne: 20, charges: 50, libre: 30, icon: '💰', label: 'Paiement' }
};

// Détecter le type de prestation depuis le texte
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

// Ouvre la modale de répartition intelligente
function ouvrirGuideRepartition(linkId) {
  const link = paymentLinks.find(l => l.id === linkId);
  if(!link) return;

  const existing = document.getElementById('guideRepartitionModal');
  if(existing) existing.remove();

  const montant = Number(link.amount);
  const type = detecterTypePrestation(link.description);
  const regle = REGLES_REPARTITION[type];

  // Calcul de la répartition suggérée
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
        <div style="font-size:12px;color:var(--muted);margin-bottom:10px">💡 Suggestion automatique basée sur le type de prestation :</div>

        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-weight:700;color:var(--green);font-size:14px">💰 Épargne</div>
            <div style="font-size:11px;color:var(--muted)">${regle.epargne}% · Priorité absolue</div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:800;color:var(--green);font-size:16px">${fmt(epargne)}</div>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-weight:700;color:var(--yellow);font-size:14px">🏠 Charges</div>
            <div style="font-size:11px;color:var(--muted)">${regle.charges}% · Loyer, transport, nourriture</div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:800;color:var(--yellow);font-size:16px">${fmt(charges)}</div>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0">
          <div>
            <div style="font-weight:700;color:var(--accent);font-size:14px">🎉 Libre</div>
            <div style="font-size:11px;color:var(--muted)">${regle.libre}% · Plaisir, sortie, achat perso</div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:800;color:var(--accent);font-size:16px">${fmt(libre)}</div>
          </div>
        </div>
      </div>

      <div style="background:linear-gradient(135deg,rgba(245,197,66,.12),rgba(245,197,66,.05));border:1px solid rgba(245,197,66,.25);border-radius:12px;padding:12px;margin-bottom:16px;font-size:12px;color:var(--gold-soft);line-height:1.5">
        💡 <strong>Conseil :</strong> ${getConseilGuide(type, montant, epargne)}
      </div>

      <div style="font-size:13px;color:var(--muted);margin-bottom:10px;text-align:center">
        Veux-tu appliquer cette répartition ?
      </div>

      <div style="display:grid;gap:8px">
        <button class="btn-primary" style="margin:0;background:linear-gradient(135deg,var(--green),#10b981);width:100%;color:#000;font-weight:800" onclick="appliquerRepartition(${link.id}, ${epargne})">
          ✅ Appliquer l'épargne (${fmt(epargne)})
        </button>
        <button class="btn-ghost" style="margin:0;width:100%" onclick="fermerGuideRepartition()">
          Plus tard
        </button>
      </div>

      <div style="font-size:11px;color:var(--muted);margin-top:12px;text-align:center;line-height:1.5">
        Tu peux toujours ajuster manuellement tes transactions plus tard.
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// Conseil personnalisé selon le type
function getConseilGuide(type, montant, epargne){
  const conseils = {
    'mariage':    `Un mariage c'est un gros paiement ponctuel. Mets de côté ${fmt(epargne)} maintenant, tu ne le regretteras pas.`,
    'dot':        `Après un dot, mets immédiatement ton épargne de côté. C'est un revenu qu'on ne reverra pas de sitôt.`,
    'studio':     `Le studio c'est régulier. Une épargne de ${fmt(epargne)} te construira un vrai matelas de sécurité.`,
    'shooting':   `Les shootings s'enchaînent bien. Épargne ${fmt(epargne)} pour tes prochains investissements matériel.`,
    'corporate':  `Un client corporate = revenu fiable. Place ${fmt(epargne)} en épargne pour équilibrer tes mois creux.`,
    'drone':      `Le drone demande de l'entretien. Épargne ${fmt(epargne)} pour anticiper les réparations.`,
    'default':    `Épargne ${fmt(epargne)} dès maintenant. Petit à petit, tu construis ta liberté.`
  };
  return conseils[type] || conseils.default;
}

// Appliquer la répartition : crée une transaction d'épargne
async function appliquerRepartition(linkId, montantEpargne){
  if(!confirm(`Créer une épargne de ${fmt(montantEpargne)} ?\n\n(Ça créera une transaction de dépense "Épargne" pour équilibrer)`)) return;

  // Créer une transaction d'épargne (dépense qui va dans les objectifs)
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
// 🆕 POPUP CUSTOM DANS L'APP (glisse depuis le haut)
// ============================================================
function afficherPopupNotif(title, message, emoji = '🔔', duration = 10000){
  // Durée minimum : 8 secondes, même si un appelant passe moins
  if(!duration || duration < 8000) duration = 10000;

  // Supprime l'ancien popup s'il existe
  const old = document.getElementById('henzoPopup');
  if(old) old.remove();

  // Injecte les keyframes une seule fois
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
    <div style="
      width:48px;height:48px;border-radius:50%;
      background:linear-gradient(135deg,var(--accent),var(--pink));
      display:flex;align-items:center;justify-content:center;
      font-size:24px;flex-shrink:0;
      box-shadow:0 8px 20px rgba(107,142,255,.45);
      animation: popupEmojiPulse 2s ease-in-out infinite;
    ">${emoji}</div>
    <div style="flex:1;min-width:0">
      <div style="font-weight:700;font-size:14px;color:var(--text);margin-bottom:3px">${title}</div>
      <div style="font-size:13px;color:var(--muted);line-height:1.4">${message}</div>
    </div>
    <button onclick="event.stopPropagation();fermerPopupNotif()" style="
      background:rgba(255,255,255,.08);
      border:none;color:var(--muted);
      width:28px;height:28px;border-radius:50%;
      cursor:pointer;font-size:16px;flex-shrink:0;
      display:flex;align-items:center;justify-content:center;
      transition:background .2s;
    ">×</button>
    <div id="henzoPopupProgress" style="
      position:absolute;bottom:0;left:0;height:3px;
      background:linear-gradient(90deg,var(--accent),var(--pink));
      width:100%;border-radius:0 0 18px 18px;
    "></div>
  `;

  popup.onclick = () => fermerPopupNotif();

  document.body.appendChild(popup);

  // Animation d'entrée
  requestAnimationFrame(() => {
    popup.style.transform = 'translateX(-50%) translateY(0) scale(1)';
    popup.style.opacity = '1';
  });

  // Barre de progression qui se vide
  const bar = popup.querySelector('#henzoPopupProgress');
  if(bar){
    bar.style.transition = 'width ' + duration + 'ms linear';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bar.style.width = '0%';
      });
    });
  }

  // Vibration sur mobile
  if(navigator.vibrate){
    try { navigator.vibrate([100, 50, 100]); } catch(e){}
  }

  // Auto-fermeture
  window.__popupTimer = setTimeout(() => {
    fermerPopupNotif();
  }, duration);
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

// Test manuel du popup
function testerPopupNotif(){
  const msg = getNotificationMessage('midday');
  afficherPopupNotif(msg.i + ' ' + msg.t, msg.m, msg.i, 6000);
}

// ============================================================
// 💰 MODULE ENTRÉE D'ARGENT DÉTAILLÉE
// ============================================================
let currentRevenueType = 'complet';

// Ouvre la modale
function openRevenueModal(){
  const modal = document.getElementById('revenueModalBg');
  if(!modal) return;

  // Reset des champs
  document.getElementById('revAmount').value = '';
  document.getElementById('revClientName').value = '';
  document.getElementById('revPrestationType').value = 'Mariage';
  document.getElementById('revPaymentMethod').value = 'Wave';
  document.getElementById('revLocation').value = '';
  document.getElementById('revDuration').value = '';
  document.getElementById('revPhotoCount').value = '';
  document.getElementById('revDetails').value = '';

  // Date/heure actuelle
  const now = new Date();
  const localISO = new Date(now.getTime() - now.getTimezoneOffset()*60000).toISOString().slice(0,16);
  document.getElementById('revDate').value = localISO;

  // Remplir la liste des clients
  const dl = document.getElementById('revClientsList');
  if(dl){
    dl.innerHTML = clients.map(c => `<option value="${c.name}">`).join('');
  }

  setRevenueType('complet');

  // Reset détails
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

// Sauvegarde l'entrée puis lance l'assistant
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

  const data = {
    type: 'revenu',
    amount: amount,
    category: 'Shooting photo',
    note: noteSummary,
    date: dateInput ? dateInput.slice(0,10) : todayStr(),
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

  // 🎯 Lancer l'assistant après un court délai
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

// Guide de répartition simplifié (direct sur le montant)
function ouvrirGuideRepartitionSimple(montant, prestationType, clientName){
  const d = (prestationType || '').toLowerCase();
  let type = 'default';
  if(d.includes('mariage')) type = 'mariage';
  else if(d.includes('dot')) type = 'dot';
  else if(d.includes('studio')) type = 'studio';
  else if(d.includes('corporate')) type = 'corporate';
  else if(d.includes('drone')) type = 'drone';
  else if(d.includes('shoot') || d.includes('extérieur') || d.includes('evenement')) type = 'shooting';

  const regle = REGLES_REPARTITION[type];
  const epargne = Math.round(montant * regle.epargne / 100);
  const charges = Math.round(montant * regle.charges / 100);
  const libre = montant - epargne - charges;

  const existing = document.getElementById('guideRepartitionModal');
  if(existing) existing.remove();

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
        <div style="font-size:12px;color:var(--muted);margin-top:6px">${regle.icon} ${regle.label} · ${clientName || ''}</div>
      </div>

      <div style="background:var(--card2);border-radius:12px;padding:14px;margin-bottom:16px">
        <div style="font-size:12px;color:var(--muted);margin-bottom:10px">💡 Suggestion :</div>

        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-weight:700;color:var(--green);font-size:14px">💰 Épargne</div>
            <div style="font-size:11px;color:var(--muted)">${regle.epargne}% · Priorité absolue</div>
          </div>
          <div style="font-weight:800;color:var(--green);font-size:16px">${fmt(epargne)}</div>
        </div>

        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-weight:700;color:var(--yellow);font-size:14px">🏠 Charges</div>
            <div style="font-size:11px;color:var(--muted)">${regle.charges}% · Loyer, transport</div>
          </div>
          <div style="font-weight:800;color:var(--yellow);font-size:16px">${fmt(charges)}</div>
        </div>

        <div style="display:flex;justify-content:space-between;padding:10px 0">
          <div>
            <div style="font-weight:700;color:var(--accent);font-size:14px">🎉 Libre</div>
            <div style="font-size:11px;color:var(--muted)">${regle.libre}% · Plaisir</div>
          </div>
          <div style="font-weight:800;color:var(--accent);font-size:16px">${fmt(libre)}</div>
        </div>
      </div>

      <div style="display:grid;gap:8px">
        <button class="btn-primary" style="margin:0;background:linear-gradient(135deg,var(--green),#10b981);width:100%;color:#000;font-weight:800" onclick="appliquerRepartitionDepuisEntree(${epargne})">
          ✅ Créer l'épargne (${fmt(epargne)})
        </button>
        <button class="btn-ghost" style="margin:0;width:100%" onclick="fermerGuideRepartition()">
          Ignorer
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function appliquerRepartitionDepuisEntree(montantEpargne){
  const result = await dbInsert('transactions', {
    type: 'depense',
    amount: montantEpargne,
    category: 'Épargne',
    note: 'Épargne automatique (guide)',
    date: todayStr(),
    payment_method: 'Interne'
  });

  if(!result){ alert('Erreur'); return; }
  txs.unshift(result);
  fermerGuideRepartition();
  refreshAll();
  showToast(fmt(montantEpargne) + ' placé en épargne ! 🎯');
}

// Modifier l'affichage de l'historique pour montrer les détails
function formatTxDetail(t){
  const parts = [];
  if(t.client_name) parts.push('👤 ' + t.client_name);
  if(t.prestation_type) parts.push('📸 ' + t.prestation_type);
  if(t.payment_method && t.payment_method !== 'Espèces') parts.push('💳 ' + t.payment_method);
  if(t.location) parts.push('📍 ' + t.location);
  if(t.photo_count) parts.push('📷 ' + t.photo_count + ' photos');
  if(t.duration_hours) parts.push('⏱ ' + t.duration_hours + 'h');
  return parts.join(' · ');
}// ============================================================
// 🤖 ASSISTANT FINANCIER CONVERSATIONNEL
// Pose des questions une par une, puis calcule la répartition
// ============================================================

let assistantData = null;  // Données en cours
let assistantStep = 0;      // Étape actuelle
let assistantAnswers = {};  // Réponses
// Détecte automatiquement la source pour l'afficher
function getSourceIcon(source){
  if(!source) return '💰';
  const s = source.toLowerCase();
  if(s.includes('séance') || s.includes('seance')) return '📸';
  if(s.includes('lien')) return '🔗';
  if(s.includes('entrée')) return '💰';
  return '💰';
}
// État initial de l'assistant
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

// Calcul du type de prestation pour les règles
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

// Affiche l'étape actuelle
function renderAssistantStep(){
  const el = document.getElementById('assistantStep');
  const bar = document.getElementById('assistantProgressBar');
  if(!el) return;

  const totalSteps = 4;
  const progress = (assistantStep / totalSteps) * 100;
  if(bar) bar.style.width = progress + '%';

  const m = assistantData.amount;
  const regle = REGLES_REPARTITION[detecterTypeFromPrestation(assistantData.prestationType)];

  // ================== ÉTAPE 0 : WELCOME ==================
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

      <button class="btn-primary" style="margin:0;width:100%;padding:16px;font-size:16px" onclick="assistantNext()">
        🚀 C'est parti !
      </button>
      <button class="btn-ghost" style="margin-top:8px;width:100%" onclick="closeAssistant()">
        Ignorer
      </button>
    `;
    return;
  }

  // ================== ÉTAPE 1 : CHARGES ==================
  if(assistantStep === 1){
    el.innerHTML = `
      <div style="font-size:13px;color:var(--muted);margin-bottom:6px">Question 1 / 4</div>
      <div style="font-size:17px;font-weight:700;line-height:1.4;margin-bottom:16px">
        💸 As-tu des <strong>charges</strong> liées à cette prestation ?<br>
        <span style="font-size:13px;color:var(--muted);font-weight:400">(transport, assistant, location matériel, repas client...)</span>
      </div>

      <div style="background:linear-gradient(135deg,rgba(107,142,255,.10),rgba(255,126,179,.05));border-left:3px solid var(--accent);border-radius:10px;padding:12px;margin-bottom:16px;font-size:12px;color:var(--muted);line-height:1.5">
        💡 <strong>Exemple :</strong> Un mariage à Bouaké = 15 000 FCFA de transport + 10 000 FCFA d'assistant = 25 000 FCFA de charges.
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

      <button class="btn-primary" style="margin-top:14px;width:100%;padding:14px" onclick="assistantValidateCharges()">
        Continuer →
      </button>
    `;
    return;
  }

  // ================== ÉTAPE 2 : OBJECTIF ==================
  if(assistantStep === 2){
    const activeGoals = coffres.filter(c => Number(c.current) < Number(c.goal));

    el.innerHTML = `
      <div style="font-size:13px;color:var(--muted);margin-bottom:6px">Question 2 / 4</div>
      <div style="font-size:17px;font-weight:700;line-height:1.4;margin-bottom:16px">
        🎯 Sur quel <strong>objectif d'épargne</strong> veux-tu mettre une partie de cet argent ?
      </div>

      ${activeGoals.length === 0 ? `
        <div style="background:rgba(245,197,66,.12);border:1px solid rgba(245,197,66,.30);border-radius:12px;padding:14px;margin-bottom:16px;font-size:13px;color:var(--gold-soft);line-height:1.5">
          ⚠️ Tu n'as pas encore d'objectif actif.<br>
          Tu peux continuer sans, ou créer un objectif dans l'onglet 🎯.
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
              <button type="button" onclick="assistantSetGoal(${c.id})" style="
                background:${selected ? 'linear-gradient(135deg,rgba(107,142,255,.20),rgba(107,142,255,.08))' : 'var(--card2)'};
                border:1px solid ${selected ? 'var(--accent)' : 'var(--border)'};
                border-radius:12px;padding:12px 14px;text-align:left;cursor:pointer;
                display:flex;justify-content:space-between;align-items:center;gap:10px;
                font-family:inherit;color:var(--text);width:100%;
              ">
                <div style="flex:1;min-width:0">
                  <div style="font-weight:700;font-size:14px;margin-bottom:3px">${emoji} ${c.name}</div>
                  <div style="font-size:11px;color:var(--muted)">${currentStr} / ${goalStr} · ${pct}%</div>
                </div>
                ${selected ? '<div style="color:var(--accent);font-size:22px;font-weight:700">✓</div>' : ''}
              </button>
            `;
          }).join('')}
          <button type="button" onclick="assistantSetGoal(null)" style="
            background:${assistantAnswers.goalId === null ? 'linear-gradient(135deg,rgba(107,142,255,.20),rgba(107,142,255,.08))' : 'var(--card2)'};
            border:1px solid ${assistantAnswers.goalId === null ? 'var(--accent)' : 'var(--border)'};
            border-radius:12px;padding:12px 14px;text-align:center;cursor:pointer;
            font-family:inherit;color:var(--text);width:100%;font-weight:600;font-size:13px;
          ">
            🤷 Aucun objectif pour l'instant
          </button>
        </div>
      `}

      <button class="btn-primary" style="margin-top:10px;width:100%;padding:14px" onclick="assistantNext()">
        Continuer →
      </button>
    `;
    return;
  }

  // ================== ÉTAPE 3 : MONTANT ÉPARGNE ==================
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
      <input type="number" id="assistantEpargneAmount" inputmode="decimal"
        value="${userAmount}" placeholder="0"
        oninput="assistantUpdateEpargne()"
        style="font-size:20px;font-weight:700;text-align:center;color:var(--green)">

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px">
        <button class="btn-ghost" style="margin:0;padding:8px;font-size:11px" onclick="assistantQuickEpargne(${Math.round(m*0.1)})">10%</button>
        <button class="btn-ghost" style="margin:0;padding:8px;font-size:11px" onclick="assistantQuickEpargne(${Math.round(m*0.2)})">20%</button>
        <button class="btn-ghost" style="margin:0;padding:8px;font-size:11px;background:rgba(52,211,153,.10);color:var(--green);border-color:var(--green)" onclick="assistantQuickEpargne(${suggested})">${regle.epargne}% ✓</button>
        <button class="btn-ghost" style="margin:0;padding:8px;font-size:11px" onclick="assistantQuickEpargne(${Math.round(m*0.5)})">50%</button>
      </div>

      <button class="btn-primary" style="margin-top:16px;width:100%;padding:14px" onclick="assistantValidateEpargne()">
        Continuer →
      </button>
    `;
    return;
  }

  // ================== ÉTAPE 4 : RÉCAPITULATIF ==================
  if(assistantStep === 4){
    const charges = assistantAnswers.chargesAmount || 0;
    const epargne = assistantAnswers.epargneAmount || 0;
    const libre = m - charges - epargne;

    if(libre < 0){
      el.innerHTML = `
        <div style="text-align:center;padding:20px 0">
          <div style="font-size:60px;margin-bottom:10px">⚠️</div>
          <div style="font-size:18px;font-weight:700;margin-bottom:10px">Attention !</div>
          <div style="color:var(--muted);font-size:14px;line-height:1.6;margin-bottom:20px">
            Tes charges + épargne dépassent le montant reçu.<br>
            Réajuste pour continuer.
          </div>
          <button class="btn-ghost" onclick="assistantStep=3;renderAssistantStep()">← Modifier</button>
        </div>
      `;
      return;
    }

    const goalObj = assistantAnswers.goalId ? coffres.find(c => c.id === assistantAnswers.goalId) : null;
    const goalName = goalObj ? (goalObj.emoji || getCoffreEmoji(goalObj.name)) + ' ' + goalObj.name : null;

    el.innerHTML = `
      <div style="font-size:13px;color:var(--muted);margin-bottom:6px">Récapitulatif</div>
      <div style="font-size:17px;font-weight:700;line-height:1.4;margin-bottom:16px">
        ✨ Voici ta répartition intelligente
      </div>

      <div style="background:linear-gradient(135deg,rgba(52,211,153,.12),rgba(107,142,255,.06));border-radius:14px;padding:16px;margin-bottom:16px;text-align:center">
        <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Montant reçu</div>
        <div style="font-size:28px;font-weight:800;color:var(--green);letter-spacing:-1px">${fmt(m)}</div>
      </div>

      <div style="background:var(--card2);border-radius:12px;padding:14px;margin-bottom:16px">

        ${charges > 0 ? `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
            <div>
              <div style="font-weight:700;color:var(--yellow);font-size:14px">🏠 Charges</div>
              <div style="font-size:11px;color:var(--muted)">${assistantAnswers.chargesDetails || 'Frais liés à la prestation'}</div>
            </div>
            <div style="font-weight:800;color:var(--yellow);font-size:16px">-${fmt(charges)}</div>
          </div>
        ` : ''}

        ${epargne > 0 ? `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
            <div>
              <div style="font-weight:700;color:var(--green);font-size:14px">💰 Épargne</div>
              <div style="font-size:11px;color:var(--muted)">${goalName || 'Réserve générale'}</div>
            </div>
            <div style="font-weight:800;color:var(--green);font-size:16px">-${fmt(epargne)}</div>
          </div>
        ` : ''}

        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0">
          <div>
            <div style="font-weight:700;color:var(--accent);font-size:14px">🎉 Pour toi</div>
            <div style="font-size:11px;color:var(--muted)">Reste à utiliser librement</div>
          </div>
          <div style="font-weight:800;color:var(--accent);font-size:18px">${fmt(libre)}</div>
        </div>
      </div>

      <div style="background:linear-gradient(135deg,rgba(245,197,66,.12),rgba(245,197,66,.05));border:1px solid rgba(245,197,66,.25);border-radius:12px;padding:12px;margin-bottom:16px;font-size:12px;color:var(--gold-soft);line-height:1.5">
        💡 <strong>Conseil :</strong> ${getConseilAssistant(detecterTypeFromPrestation(assistantData.prestationType), m, epargne, goalName)}
      </div>

      <div style="display:grid;gap:8px">
        <button class="btn-primary" style="margin:0;background:linear-gradient(135deg,var(--green),#10b981);width:100%;color:#000;font-weight:800;padding:16px" onclick="assistantAppliquer()">
          ✅ Créer les transactions
        </button>
        <button class="btn-ghost" style="margin:0;width:100%" onclick="closeAssistant()">
          Juste enregistrer sans répartition
        </button>
      </div>
    `;
    return;
  }
}

// Conseil intelligent selon le contexte
function getConseilAssistant(type, montant, epargne, goalName){
  if(epargne >= montant * 0.4){
    return `Excellente discipline ! Tu mets ${Math.round(epargne/montant*100)}% de côté. Continue comme ça 💪`;
  }
  if(goalName){
    return `Ton épargne va directement alimenter "${goalName}". Chaque entrée te rapproche de ton objectif 🎯`;
  }
  const conseils = {
    'mariage': 'Un mariage = revenu rare. Épargner tôt te protège des mois creux.',
    'dot': 'Après un dot, mets immédiatement une partie de côté. Tu ne le regretteras pas.',
    'studio': 'Le studio c\'est régulier. Une épargne automatique te construit un vrai matelas.',
    'shooting': 'Les shootings s\'enchaînent. Épargner 20% te laisse de la marge pour investir.',
    'corporate': 'Client corporate = revenu fiable. Épargne pour équilibrer tes mois creux.',
    'drone': 'Le drone demande de l\'entretien. Épargne pour anticiper les réparations.',
    'default': 'Épargne maintenant, profite après. C\'est comme ça qu\'on devient libre 🚀'
  };
  return conseils[type] || conseils.default;
}

// ============================================================
// INTERACTIONS DE L'ASSISTANT
// ============================================================

function assistantNext(){
  assistantStep++;
  renderAssistantStep();
}

function assistantSetCharges(has){
  assistantAnswers.hasCharges = has;
  const box = document.getElementById('assistantChargesBox');
  if(box) box.style.display = has ? 'block' : 'none';
  document.getElementById('aChargesNon')?.classList.toggle('active', !has);
  document.getElementById('aChargesOui')?.classList.toggle('active', has);
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

  if(val < 0){
    alert('Montant invalide');
    return;
  }
  if(val + charges > m){
    alert('Épargne + charges dépassent le montant reçu');
    return;
  }
  assistantAnswers.epargneAmount = val;
  assistantNext();
}

// Appliquer la répartition → créer les transactions
async function assistantAppliquer(){
  const charges = assistantAnswers.chargesAmount || 0;
  const epargne = assistantAnswers.epargneAmount || 0;
  const goalId = assistantAnswers.goalId;

  let txCreated = 0;

  // 1. Créer la transaction de charges (si > 0)
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

  // 2. Créer la transaction d'épargne (si > 0)
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

    // 3. Alimenter l'objectif si sélectionné
    if(goalId){
      const goal = coffres.find(c => c.id === goalId);
      if(goal){
        const newCurrent = Number(goal.current || 0) + epargne;
        const upd = await dbUpdate('goals', goalId, {current: newCurrent});
        if(upd){
          goal.current = newCurrent;
        }
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
  setupAutocomplete('revLocation', 'revLocationList');  // 🆕 Ajout
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

(async function bootstrap(){
  const user = await getCurrentUser();
  const loading = document.getElementById('loadingScreen');
  if(loading) loading.classList.add('hidden');
  if(user){ await startApp(); } else { showLogin(); }
})();