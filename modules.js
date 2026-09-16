// ============================================================
// MODULES.JS — Objectifs, Photo, Business, Inspiration, Notes, Motivation, IA
// ============================================================

let editingReminderId = null;
let editingInspirationId = null;
let editingNoteId = null;

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
// MODULE NOTES INTELLIGENTES
// ============================================================
function analyzeNoteContent(text){
  const result = {
    category: null, priority: null, date: null, dateLabel: null,
    amount: null, phone: null, tags: []
  };
  if(!text) return result;
  const lower = text.toLowerCase();

  // Catégorie
  if(/\b(appel|appeler|téléphon|joindre|contacter)/i.test(text)) result.category = 'appel';
  else if(/\b(rdv|rendez-vous|rencard|voir|rencontrer|passer chez)/i.test(text)) result.category = 'rdv';
  else if(/\b(acheter|achat|commander|commande|shop)/i.test(text)) result.category = 'achat';
  else if(/\b(devis|facture|client|business|contrat|shoot|mariage|séance|vente)/i.test(text)) result.category = 'business';
  else if(/\b(idée|idee|inspiration|concept|réfléchir)/i.test(text)) result.category = 'idee';
  else if(/\b(faire|terminer|finir|à faire|todo|n'?oublie pas|pense à)/i.test(text)) result.category = 'todo';

  // Priorité
  if(/\b(urgent|urgente|asap|tout de suite|maintenant|vite|impératif)/i.test(text)) result.priority = 'urgente';
  else if(/\b(important|prioritaire|ne pas oublier|absolument|critique)/i.test(text)) result.priority = 'haute';
  else if(/\b(quand possible|bientôt|à voir|peut-être|un jour)/i.test(text)) result.priority = 'basse';
  else result.priority = 'normale';

  // Montant
  const amountMatch = text.match(/(\d[\d\s.,]{2,})\s*(fcfa|francs?|€|euros?|\$|dollars?)/i);
  if(amountMatch){
    const num = parseFloat(amountMatch[1].replace(/[\s.]/g, '').replace(',', '.'));
    if(!isNaN(num)) result.amount = num;
  }

  // Téléphone
  const phoneMatch = text.match(/(\+?\d[\d\s]{7,}\d)/);
  if(phoneMatch) result.phone = phoneMatch[1].replace(/\s/g, '');

  // Tags #
  const tagsFound = text.match(/#[\wÀ-ÿ-]+/g);
  if(tagsFound) result.tags = tagsFound.map(t => t.replace('#','').toLowerCase());

  // Date
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
    if(/\baprès[- ]demain\b/i.test(text)){
      reminderDate = new Date(now); reminderDate.setDate(now.getDate() + 2); label = 'après-demain';
    } else if(/\bdemain\b/i.test(text)){
      reminderDate = new Date(now); reminderDate.setDate(now.getDate() + 1); label = 'demain';
    } else if(/\bce soir\b/i.test(text)){
      reminderDate = new Date(now); reminderDate.setHours(20,0,0,0); label = 'ce soir';
    } else if(/\bce matin\b/i.test(text)){
      reminderDate = new Date(now); reminderDate.setHours(9,0,0,0); label = 'ce matin';
    } else if(/\bcet? après[- ]midi\b/i.test(text)){
      reminderDate = new Date(now); reminderDate.setHours(15,0,0,0); label = 'cet après-midi';
    } else if(/\b(cette semaine)\b/i.test(text)){
      reminderDate = new Date(now); reminderDate.setDate(now.getDate() + 3); label = 'cette semaine';
    }
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
  if(!text || text.length < 5){
    analysisEl.classList.remove('show');
    return;
  }
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
  if(a.dateLabel){
    lines.push(`<div class="ai-line"><strong>📅</strong> Date : <span style="color:var(--yellow)">${a.dateLabel}</span></div>`);
  }
  if(a.amount){
    lines.push(`<div class="ai-line"><strong>💰</strong> Montant : ${fmt(a.amount)}</div>`);
  }
  if(a.phone){
    lines.push(`<div class="ai-line"><strong>📞</strong> Téléphone : ${a.phone}</div>`);
  }
  if(a.tags.length){
    lines.push(`<div class="ai-line"><strong>🏷️</strong> Tags : ${a.tags.join(', ')}</div>`);
  }

  if(lines.length === 0){
    analysisEl.classList.remove('show');
    return;
  }
  analysisEl.innerHTML = lines.join('');
  analysisEl.classList.add('show');
}

function openNoteModal(id){
  editingNoteId = id || null;
  const n = id ? notes.find(x => x.id === id) : null;

  document.getElementById('noteModalTitle').textContent = n ? '✏️ Modifier' : '📝 Nouvelle note';
  document.getElementById('noteSubmit').textContent = n ? '💾 Enregistrer' : '💾 Enregistrer';

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
    } else {
      document.getElementById('noteReminder').value = '';
    }
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
    showToast('✅ Note modifiée');
  } else {
    const result = await dbInsert('notes', data);
    if(!result) return;
    notes.unshift(result);
    closeNoteModal();
    renderNotes();
    showToast('✅ Note créée' + (data.reminder_date ? ' avec rappel' : ''));
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
  showToast(newArchived ? '🗄️ Note archivée' : '📌 Note réactivée');
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

  if(filtered.length === 0){
    el.innerHTML = '<div class="empty">Aucune note trouvée</div>';
    return;
  }

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

    const createdStr = n.created_at
      ? new Date(n.created_at).toLocaleDateString('fr-FR', {day:'2-digit', month:'short'})
      : '';

    const priorityBadge = n.priority && n.priority !== 'normale'
      ? `<span class="note-priority-badge ${n.priority}">${n.priority}</span>`
      : '';

    return `<div class="note-card priority-${n.priority || 'normale'} ${n.archived ? 'archived' : ''}">
      <div class="note-header">
        <div style="flex:1;min-width:0;">
          <div class="note-title">
            ${icon} ${n.title || (n.content || '').substring(0, 40)}
            <span class="note-category-badge">${catLabel}</span>
            ${priorityBadge}
          </div>
        </div>
      </div>

      ${n.content ? `<div class="note-content">${(n.content || '').replace(/\n/g, '<br>')}</div>` : ''}

      <div class="note-meta">
        ${createdStr ? `<span>📅 ${createdStr}</span>` : ''}
        ${reminderHtml}
      </div>

      ${(n.tags && n.tags.length) ? `<div class="note-tags">${n.tags.map(t => `<span class="note-tag">#${t}</span>`).join('')}</div>` : ''}

      <div class="note-actions">
        <button class="note-btn-done" onclick="toggleNoteDone(${n.id})">
          ${n.archived ? '📌 Réactiver' : '✅ Terminer'}
        </button>
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
    if(n.reminder_sent) continue;
    if(!n.reminder_date) continue;
    if(n.archived) continue;

    const reminderTime = new Date(n.reminder_date);
    if(reminderTime <= now){
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
  document.getElementById('inspSubmit').textContent = i ? '💾 Enregistrer' : '💾 Enregistrer';

  if(i){
    let savedCat = i.category || 'Photographe';
    if(INSP_CATEGORIES_FIXES.includes(savedCat)){
      document.getElementById('inspCategory').value = savedCat;
      document.getElementById('inspCustomCategory').value = '';
    } else {
      document.getElementById('inspCategory').value = 'Autre';
      document.getElementById('inspCustomCategory').value = savedCat;
    }
    document.getElementById('inspName').value     = i.name || '';
    document.getElementById('inspPlatform').value = i.platform || '';
    document.getElementById('inspLink').value     = i.link || '';
    document.getElementById('inspPhone').value    = i.phone || '';
    document.getElementById('inspEmail').value    = i.email || '';
    document.getElementById('inspCity').value     = i.city || '';
    document.getElementById('inspWhy').value      = i.why || '';
    document.getElementById('inspTags').value     = (i.tags || []).join(', ');
    document.getElementById('inspFavorite').checked = !!i.favorite;
  } else {
    document.getElementById('inspCategory').value = 'Photographe';
    document.getElementById('inspCustomCategory').value = '';
    document.getElementById('inspName').value     = '';
    document.getElementById('inspPlatform').value = '';
    document.getElementById('inspLink').value     = '';
    document.getElementById('inspPhone').value    = '';
    document.getElementById('inspEmail').value    = '';
    document.getElementById('inspCity').value     = '';
    document.getElementById('inspWhy').value      = '';
    document.getElementById('inspTags').value     = '';
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
    name, category,
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
  if(currentCat && [...filterCat.options].some(o => o.value === currentCat)){
    filterCat.value = currentCat;
  }

  const catFilter = filterCat.value;
  const favFilter = document.getElementById('inspFilterFav').value;
  const search = (document.getElementById('inspSearch').value || '').trim().toLowerCase();

  let filtered = inspirations.filter(i => {
    if(catFilter !== 'all' && i.category !== catFilter) return false;
    if(favFilter === 'fav' && !i.favorite) return false;
    if(search){
      const haystack = [i.name, i.city, i.why, i.platform, (i.tags||[]).join(' ')]
        .filter(Boolean).join(' ').toLowerCase();
      if(!haystack.includes(search)) return false;
    }
    return true;
  });

  filtered.sort((a,b) => {
    if(a.favorite !== b.favorite) return b.favorite ? 1 : -1;
    return (b.created_at || '').localeCompare(a.created_at || '');
  });

  if(filtered.length === 0){
    el.innerHTML = '<div class="empty">Aucune inspiration trouvée</div>';
    return;
  }

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
    if(i.phone){
      const cleanPhone = i.phone.replace(/[^0-9+]/g, '');
      actions.push(`<a href="tel:${cleanPhone}" class="insp-btn-call">📞 Appeler</a>`);
    }
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
// ÉTAT DES NOTIFICATIONS
// ============================================================
function isNotifEnabled(){
  return localStorage.getItem('notif_enabled') === '1';
}

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

// ============================================================
// HELPER NOTIFICATION
// ============================================================
async function showLocalNotification(title, body, url){
  try {
    if('serviceWorker' in navigator){
      const reg = await navigator.serviceWorker.getRegistration();
      if(reg && reg.showNotification){
        await reg.showNotification(title, {
          body: body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          data: { url: url || 'https://hyperapp-henzo.vercel.app' }
        });
        return true;
      }
    }
    if('Notification' in window && Notification.permission === 'granted'){
      new Notification(title, { body: body });
      return true;
    }
    return false;
  } catch(e){
    console.warn('showLocalNotification error:', e);
    return false;
  }
}

// ============================================================
// PLAYER ID ONESIGNAL
// ============================================================
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
    const { data: existing } = await sb
      .from('push_subscriptions').select('id')
      .eq('user_id', user.id).eq('player_id', playerId).maybeSingle();
    if(existing) return;
    await sb.from('push_subscriptions').insert({ user_id: user.id, player_id: playerId });
    console.log('✅ Player ID enregistré:', playerId);
  } catch(e){ console.warn('registerOneSignalPlayer:', e); }
}

// ============================================================
// MODULE OBJECTIFS
// ============================================================
function getCoffreEmoji(name){
  const n = name.toLowerCase();
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

function getMotivationMessage(pct){
  if(pct >= 100) return {level:5, msg:'🎉 OBJECTIF ATTEINT !'};
  if(pct >= 75) return {level:4, msg:'🔥 Tu y es presque !'};
  if(pct >= 50) return {level:3, msg:'💪 À mi-chemin !'};
  if(pct >= 25) return {level:2, msg:'⚡ Bon démarrage !'};
  if(pct > 0)   return {level:1, msg:'🌱 C\'est parti !'};
  return {level:1, msg:'🎯 Commence !'};
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
  if(coffres.length === 0){
    title = '🚀 Lance-toi !';
    text = 'Crée ton premier objectif.';
  } else if(globalPct >= 100){
    title = '🏆 Champion !';
    text = 'Tous tes objectifs atteints !';
  } else if(globalPct >= 75){
    title = '🔥 Tu y es presque !';
    text = `Tu es à ${globalPct.toFixed(0)}%.`;
  } else if(globalPct >= 50){
    title = '💪 À mi-chemin !';
    text = `Tu as complété ${globalPct.toFixed(0)}%.`;
  } else if(globalPct >= 25){
    title = '⚡ Bon démarrage !';
    text = `Tu es à ${globalPct.toFixed(0)}%.`;
  } else if(globalPct > 0){
    title = '🌱 C\'est parti !';
    text = 'Tiens bon !';
  } else {
    title = '🎯 À toi de jouer !';
    text = 'Commence par 1000 FCFA.';
  }

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

  const defiEl  = document.getElementById('defiText');
  const dateEl  = document.getElementById('defiDate');
  const btnEl   = document.getElementById('defiBtn');
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
  if(streak > 0){
    streakEl.textContent = `🔥 Série : ${streak} jour${streak>1?'s':''} d'affilée !`;
  } else {
    streakEl.textContent = '';
  }
}

function validerDefi(){
  const dayKey = new Date().toISOString().slice(0,10);
  localStorage.setItem(`defi_${dayKey}`, '1');
  renderDefiDuJour();
}

function renderAnalysePercutante(){
  const el = document.getElementById('analysePercutante');
  if(coffres.length === 0){
    el.innerHTML = '<div class="empty">Crée un objectif pour voir l\'analyse.</div>';
    return;
  }
  const items = [];
  coffres.forEach(c => {
    const current = Number(c.current || 0);
    const goal = Number(c.goal || 1);
    const rest = Math.max(0, goal - current);
    const pct = (current / goal) * 100;

    if(pct >= 100){
      items.push({cls:'good', title:`✅ ${c.name} — Terminé !`, text:`Tu as réussi !`});
      return;
    }
    if(c.target_date){
      const days = Math.ceil((new Date(c.target_date) - new Date()) / 86400000);
      if(days > 0){
        const perMonth = (rest / days) * 30;
        items.push({cls:'', title:`📊 ${c.name}`, text:`Il te faut ${fmt(perMonth)}/mois.`});
      }
    } else {
      items.push({cls:'', title:`📊 ${c.name} — ${pct.toFixed(0)}%`, text:`Reste ${fmt(rest)}.`});
    }
  });
  el.innerHTML = items.map(i => `<div class="analyse-item ${i.cls}">
    <strong>${i.title}</strong>${i.text}</div>`).join('');
}

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

  const el = document.getElementById('coffresList');
  if(coffres.length === 0){
    el.innerHTML = '<div class="empty">Aucun objectif. Crées-en un.</div>';
    return;
  }

  el.innerHTML = coffres.map(c => {
    const current = Number(c.current || 0);
    const goal    = Number(c.goal || 1);
    const pct     = Math.min(100, (current / goal) * 100);
    const rest    = Math.max(0, goal - current);
    const mot     = getMotivationMessage(pct);
    const color   = getProgressionColor(pct);
    const emoji   = getCoffreEmoji(c.name);
    const done    = pct >= 100;

    let timeInfo = '';
    if(c.target_date && rest > 0){
      const days = Math.ceil((new Date(c.target_date) - new Date()) / 86400000);
      if(days > 0){
        const perWeek = (rest / days) * 7;
        timeInfo = `<div class="coffre-next"><span>⏱ ${days} jours</span><span>${fmt(perWeek)}/semaine</span></div>`;
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

    return `<div class="coffre ${done ? 'completed' : ''}">
      <div class="coffre-header">
        <div class="coffre-name"><span class="coffre-emoji">${emoji}</span>${c.name}</div>
        ${badge}
      </div>
      <div class="coffre-progress"><div class="coffre-progress-fill" style="width:${pct}%;background:${color}"></div></div>
      <div class="coffre-paliers">
        <span class="${p25}">25%</span><span class="${p50}">50%</span>
        <span class="${p75}">75%</span><span class="${p100}">100%</span>
      </div>
      <div class="coffre-amounts">
        <div><span class="current">${fmt(current)}</span> <span class="goal">/ ${fmt(goal)}</span></div>
        ${rest > 0 ? `<div class="rest">Reste : ${fmt(rest)}</div>` : ''}
      </div>
      <div class="coffre-message level-${mot.level}">${mot.msg}</div>
      ${c.why ? `<div class="coffre-why">"${c.why}"</div>` : ''}
      ${timeInfo}
      <div class="coffre-actions">
        <button class="btn-primary" style="margin:0" onclick="openDepositModal(${c.id})">+ Ajouter</button>
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
      const pct  = (Number(c.current) / Number(c.goal) * 100).toFixed(0);
      const msg  = c.why ? `Rappelle-toi : "${c.why}"` : `Tu es à ${pct}%.`;
      return `<div class="insight bad"><div class="title">🛑 ${c.name} — encore ${fmt(rest)}</div><div>${msg}</div></div>`;
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
  document.getElementById('clientCity').value  = c?.city  || '';
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
    city:  document.getElementById('clientCity').value.trim(),
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
      ${c.city  ? `<div class="amt"><span>📍 ${c.city}</span></div>` : ''}
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
  sel.innerHTML = '<option value="">-- Choisir --</option>' +
    clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

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
    document.getElementById('shootLocation').value   = s.location || '';
    document.getElementById('shootPhotoCount').value = s.photo_count || '';
    document.getElementById('shootDate').value  = s.date ? new Date(s.date).toISOString().slice(0,16) : '';
    document.getElementById('shootPrice').value = s.price || '';
    document.getElementById('shootPay').value   = s.payment || 'impaye';
    document.getElementById('shootNotes').value = s.notes || '';
  } else {
    sel.value = '';
    document.getElementById('shootType').value = 'Mariage';
    document.getElementById('shootCustomType').value = '';
    document.getElementById('shootLocation').value = '';
    document.getElementById('shootPhotoCount').value = '';
    document.getElementById('shootDate').value  = new Date().toISOString().slice(0,16);
    document.getElementById('shootPrice').value = '';
    document.getElementById('shootPay').value   = 'impaye';
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
  let   type     = document.getElementById('shootType').value;
  const location = document.getElementById('shootLocation').value.trim();
  const photo_count = parseInt(document.getElementById('shootPhotoCount').value) || 0;
  const date     = document.getElementById('shootDate').value;
  const price    = parseFloat(document.getElementById('shootPrice').value) || 0;
  const payment  = document.getElementById('shootPay').value;
  const notes    = document.getElementById('shootNotes').value.trim();
  if(!date){ alert("Date requise"); return; }

  if(type === 'Autre'){
    const custom = document.getElementById('shootCustomType').value.trim();
    if(custom) type = custom;
  }

  const data = {client_id: clientId ? parseInt(clientId) : null, type, location, photo_count, date, price, payment, notes};

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
  const newPayment = s.payment === 'paye' ? 'impaye' : 'paye';
  const result = await dbUpdate('shoots', id, {payment: newPayment});
  if(!result) return;
  s.payment = newPayment;
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
    }
    else if(today.getTime() === shootDate.getTime() && s.status !== 'encours'){
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
    status: 'annule', cancel_reason: reason.trim() || null,
    status_updated_at: new Date().toISOString()
  });
  if(!result) return;
  s.status = 'annule';
  s.cancel_reason = reason.trim() || null;
  refreshAll();
  showToast('❌ Séance annulée');
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
    status: newStatus, cancel_reason: null,
    status_updated_at: new Date().toISOString()
  });
  if(!result) return;
  s.status = newStatus;
  s.cancel_reason = null;
  refreshAll();
  showToast('✅ Séance réactivée');
}

function renderShoots(){
  const el = document.getElementById('shootsList');
  if(!el) return;

  const statsEl = document.getElementById('shootStatsRow');
  if(statsEl){
    const planifies = shoots.filter(s => s.status === 'planifie' || s.status === 'encours').length;
    const shootes = shoots.filter(s => s.status === 'shoote').length;
    const annules = shoots.filter(s => s.status === 'annule').length;
    const clientsAnnules = new Set(
      shoots.filter(s => s.status === 'annule' && s.client_id).map(s => s.client_id)
    ).size;

    statsEl.innerHTML = `
      <div class="shoot-stat-mini">
        <div class="num" style="color:var(--accent)">${planifies}</div>
        <div class="lbl">📅 Planifiées</div>
      </div>
      <div class="shoot-stat-mini">
        <div class="num" style="color:var(--green)">${shootes}</div>
        <div class="lbl">✅ Shootées</div>
      </div>
      <div class="shoot-stat-mini">
        <div class="num" style="color:var(--red)">${annules}</div>
        <div class="lbl">❌ Annulées</div>
      </div>
      <div class="shoot-stat-mini">
        <div class="num" style="color:var(--yellow)">${clientsAnnules}</div>
        <div class="lbl">👤 Clients concernés</div>
      </div>
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

  if(sorted.length === 0){
    el.innerHTML = '<div class="empty">Aucune séance dans ce filtre</div>';
    return;
  }

  const statusInfo = {
    'planifie': { label: '📅 Planifié', class: 'planifie' },
    'encours':  { label: '🟠 En cours', class: 'encours' },
    'shoote':   { label: '✅ Shooté',   class: 'shoote' },
    'annule':   { label: '❌ Annulé',   class: 'annule' }
  };

  el.innerHTML = sorted.map(s => {
    const client = s.client_id ? clients.find(c => c.id === s.client_id) : null;
    const d = new Date(s.date);
    const dStr = d.toLocaleDateString('fr-FR', {day:'2-digit', month:'short', year:'numeric'}) + ' à ' +
                 d.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
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
        <button class="btn-ghost" style="margin:0;padding:6px" onclick="openShootModal(${s.id})" title="Modifier">✏️</button>
        <button class="btn-ghost shoot-cancel-btn" style="margin:0;padding:6px" onclick="cancelShoot(${s.id})" title="Annuler">🚫 Annuler</button>
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
      <div class="actions" style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
        ${actionButtons}
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
// DASHBOARD
// ============================================================
function renderOverview(){
  const ym = monthKey();
  const monthShoots = shoots.filter(s => s.date && s.date.startsWith(ym));
  const revenue = monthShoots.filter(s => s.payment === 'paye').reduce((sum,s) => sum + Number(s.price), 0);
  const pending = shoots.filter(s => s.payment === 'impaye').reduce((sum,s) => sum + Number(s.price), 0);
  document.getElementById('overviewClients').textContent    = clients.length;
  document.getElementById('overviewShoots').textContent     = monthShoots.length;
  document.getElementById('overviewPhotoRev').textContent   = fmt(revenue);
  document.getElementById('overviewPending').textContent    = fmt(pending);
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
    <div class="legend-item"><div class="legend-dot" style="background:var(--green)"></div>
      <div class="legend-label">Revenus</div><div class="legend-value" style="color:var(--green)">${fmt(s.totalIn)}</div></div>
    <div class="legend-item"><div class="legend-dot" style="background:var(--red)"></div>
      <div class="legend-label">Dépenses</div><div class="legend-value" style="color:var(--red)">${fmt(s.totalOut)}</div></div>`;
}

function renderShootTypesChart(){
  const el = document.getElementById('shootTypesChart');
  if(shoots.length === 0){ el.innerHTML = '<div class="empty">Aucune séance enregistrée</div>'; return; }
  const byType = {};
  shoots.forEach(s => { byType[s.type] = (byType[s.type] || 0) + 1; });
  const entries = Object.entries(byType).sort((a,b) => b[1] - a[1]);
  const total = shoots.length;
  el.innerHTML = entries.map(([type, count]) => {
    const pct = (count / total) * 100;
    return `<div class="cat-row">
      <div class="top"><span>📸 ${type}</span><span>${count} · ${pct.toFixed(0)}%</span></div>
      <div class="bar"><div style="width:${pct}%;background:var(--pink)"></div></div></div>`;
  }).join('');
}

function renderBars6m(){
  const el = document.getElementById('bars6m');
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
    return `<div class="bar-6m">
      <div class="bar-value">${m.total > 0 ? Math.round(m.total/1000)+'k' : '0'}</div>
      <div class="bar-fill" style="height:${height}%"></div>
      <div class="bar-label">${m.label}</div></div>`;
  }).join('');
}

function renderSuggestions(){
  const el = document.getElementById('suggestions');
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

  if(suggestions.length === 0){
    el.innerHTML = '<div class="empty">Tout est en ordre ! 🎉</div>';
    return;
  }
  el.innerHTML = suggestions.slice(0, 5).map(sg => `
    <div class="suggestion">
      <div class="icon">${sg.icon}</div>
      <div class="title">${sg.title}</div>
      <div class="body">${sg.body}</div>
    </div>`).join('');
}

// ============================================================
// HISTORIQUE
// ============================================================
let selectedTxIds = new Set();

function populateHistFilters(){
  const monthSelect = document.getElementById('histMonth');
  const catSelect   = document.getElementById('histCategory');
  if(!monthSelect || !catSelect) return;

  const months = [...new Set(txs.map(t => t.date.slice(0,7)))].sort().reverse();
  const previousMonth = monthSelect.value;
  monthSelect.innerHTML = '<option value="all">Tous les mois</option>' +
    months.map(m => {
      const [y, mo] = m.split('-');
      const label = new Date(y, mo-1, 1).toLocaleDateString('fr-FR', {month:'long', year:'numeric'});
      return `<option value="${m}">${label}</option>`;
    }).join('');
  if(previousMonth && [...monthSelect.options].some(o => o.value === previousMonth)){
    monthSelect.value = previousMonth;
  }

  const cats = [...new Set(txs.map(t => t.category))].sort();
  const previousCat = catSelect.value;
  catSelect.innerHTML = '<option value="all">Toutes les catégories</option>' +
    cats.map(c => `<option value="${c}">${c}</option>`).join('');
  if(previousCat && [...catSelect.options].some(o => o.value === previousCat)){
    catSelect.value = previousCat;
  }
}

function getFilteredTx(){
  const month = document.getElementById('histMonth').value;
  const type  = document.getElementById('histType').value;
  const cat   = document.getElementById('histCategory').value;

  return txs.filter(t => {
    if(month !== 'all' && !t.date.startsWith(month)) return false;
    if(type !== 'all' && t.type !== type) return false;
    if(cat !== 'all' && t.category !== cat) return false;
    return true;
  }).sort((a,b) => b.date.localeCompare(a.date));
}

function renderHistory(){
  const filtered = getFilteredTx();
  const totalIn  = filtered.filter(t => t.type === 'revenu').reduce((s,t) => s + Number(t.amount), 0);
  const totalOut = filtered.filter(t => t.type === 'depense').reduce((s,t) => s + Number(t.amount), 0);
  document.getElementById('histCount').textContent = filtered.length;
  document.getElementById('histIn').textContent    = fmt(totalIn);
  document.getElementById('histOut').textContent   = fmt(totalOut);

  const el = document.getElementById('histList');
  if(filtered.length === 0){
    el.innerHTML = '<div class="empty">Aucune transaction</div>';
    document.getElementById('histSelectAll').checked = false;
    return;
  }

  el.innerHTML = filtered.map(t => {
    const d = new Date(t.date).toLocaleDateString('fr-FR', {day:'2-digit', month:'short', year:'numeric'});
    const sign = t.type === 'revenu' ? '+' : '−';
    const cls  = t.type === 'revenu' ? 'pos' : 'neg';
    const checked = selectedTxIds.has(t.id) ? 'checked' : '';
    return `<div class="hist-item">
      <input type="checkbox" class="hist-check" data-id="${t.id}" ${checked} onchange="toggleTxSelect(${t.id}, this.checked)">
      <div class="hist-content">
        <div class="hist-top">
          <span class="hist-cat">${t.category}</span>
          <span class="hist-amt ${cls}">${sign}${fmt(t.amount)}</span>
        </div>
        <div class="hist-bottom">${d}${t.note ? ' · ' + t.note : ''}</div>
      </div>
      <button class="hist-del" onclick="delTxFromHistory(${t.id})">×</button>
    </div>`;
  }).join('');

  const allChecked = filtered.length > 0 && filtered.every(t => selectedTxIds.has(t.id));
  document.getElementById('histSelectAll').checked = allChecked;
}

function toggleTxSelect(id, checked){
  if(checked) selectedTxIds.add(id);
  else selectedTxIds.delete(id);
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
  const json = JSON.stringify(filtered, null, 2);
  downloadFile(json, `transactions-${todayStr()}.json`, 'application/json');
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
  doc.text("Ma Super App — " + new Date().toLocaleDateString('fr-FR'), 14, 23);

  const totalIn  = filtered.filter(t => t.type === 'revenu').reduce((s,t) => s + Number(t.amount), 0);
  const totalOut = filtered.filter(t => t.type === 'depense').reduce((s,t) => s + Number(t.amount), 0);
  const solde    = totalIn - totalOut;

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(11);
  doc.text(`Revenus : ${fmt(totalIn)}  |  Dépenses : ${fmt(totalOut)}  |  Solde : ${fmt(solde)}`, 14, 45);

  const rows = filtered.map(t => [
    new Date(t.date).toLocaleDateString('fr-FR'),
    t.type === 'revenu' ? 'Revenu' : 'Dépense',
    t.category,
    (t.type === 'revenu' ? '+' : '−') + fmt(t.amount),
    t.note || ''
  ]);

  doc.autoTable({
    startY: 52,
    head: [['Date', 'Type', 'Catégorie', 'Montant', 'Note']],
    body: rows,
    theme: 'striped',
    headStyles: {fillColor: [108, 140, 255], textColor: 255, fontStyle: 'bold'},
    bodyStyles: {fontSize: 9, textColor: 40}
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
      <button class="btn-ghost" style="margin-top:8px;font-size:13px;padding:8px"
        onclick='saveIdea(${JSON.stringify(i).replace(/'/g, "&#39;")})'>⭐ Sauvegarder</button>
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
  const boldRegex    = /\*\*(.+?)\*\*/g;

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
    let body  = content;
    const titleMatch = content.match(/^([^:\n]{2,100}?)(?:\s*:\s*|\n)([\s\S]+)$/);
    if(titleMatch){
      title = titleMatch[1].replace(/\*\*/g, '').trim();
      body  = titleMatch[2];
    } else {
      title = content.replace(/\*\*/g, '').substring(0, 100);
      body = '';
    }
    body = body.replace(boldRegex, '<strong>$1</strong>').replace(/→/g, '•');
    return `<div class="ai-section">
      ${s.num ? `<div class="ai-section-title"><span class="ai-section-num">${s.num}</span>${title}</div>` : ''}
      ${!s.num && title ? `<div class="ai-section-title">${title}</div>` : ''}
      ${body.trim() ? `<div class="ai-section-body">${body.trim().replace(/\n/g, '<br>')}</div>` : ''}
    </div>`;
  }).join('');
}

async function loadIdeasAI(){
  try {
    const user = await getCurrentUser();
    if(!user) return;
    const { data, error } = await sb.from('user_settings')
      .select('ideas_ai, ideas_ai_date').eq('user_id', user.id).maybeSingle();
    if(error){ console.warn('loadIdeasAI:', error.message); return; }
    if(!data || !data.ideas_ai) return;
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
  const dateStr = new Date().toLocaleString('fr-FR', {
    day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'
  });
  localStorage.setItem('ideas_ai_last', text);
  localStorage.setItem('ideas_ai_last_date', dateStr);
  try {
    const user = await getCurrentUser();
    if(!user) return;
    const { error } = await sb.from('user_settings')
      .upsert({ user_id: user.id, ideas_ai: text, ideas_ai_date: dateStr }, { onConflict: 'user_id' });
    if(error) console.warn('saveIdeasAI:', error.message);
  } catch(e){ console.warn('saveIdeasAI error:', e); }
}

async function clearIdeasAI(){
  if(!confirm('Effacer les idées IA ?')) return;
  localStorage.removeItem('ideas_ai_last');
  localStorage.removeItem('ideas_ai_last_date');
  try {
    const user = await getCurrentUser();
    if(user) await sb.from('user_settings').update({ ideas_ai: null, ideas_ai_date: null }).eq('user_id', user.id);
  } catch(e){ console.warn('clearIdeasAI error:', e); }
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
    const btn = document.getElementById('ideasCopyBtn');
    btn.textContent = '✅ Copié !';
    setTimeout(() => btn.textContent = '📋 Copier', 2000);
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
  const prompt = `Voici le profil : ${summary}\n\nGénère 5 idées de business CONCRÈTES et ADAPTÉES (photographe).
Format strict :
1. [Titre]
   → [Description]
   → Revenu potentiel: [fourchette FCFA]
   → Difficulté: Facile/Moyenne/Difficile
(etc.)

N'utilise PAS d'astérisques.`;
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
  const text1  = document.getElementById('quoteText');
  const auth1  = document.getElementById('quoteAuthor');
  if(emoji1) emoji1.textContent = q.e;
  if(text1)  text1.textContent  = '"' + q.q + '"';
  if(auth1)  auth1.textContent  = '— ' + q.a;
  const emoji2 = document.getElementById('dashQuoteEmoji');
  const text2  = document.getElementById('dashQuoteText');
  const auth2  = document.getElementById('dashQuoteAuthor');
  if(emoji2) emoji2.textContent = q.e;
  if(text2)  text2.textContent  = '"' + q.q + '"';
  if(auth2)  auth2.textContent  = '— ' + q.a;
}

// ============================================================
// NOTIFICATIONS GLOBALES
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
  if(isNotifEnabled()){
    localStorage.removeItem('notif_enabled');
    updateNotifButton();
    return;
  }
  if(!('Notification' in window)){
    document.getElementById('notifStatus').textContent = '❌ Non supporté';
    return;
  }
  const permission = await Notification.requestPermission();
  if(permission !== 'granted'){
    document.getElementById('notifStatus').textContent = '❌ Permission refusée.';
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
    await showLocalNotification('🔥 Notifications activées',
      'Tu recevras tes rappels sur tous tes appareils 💪');
  } catch(e){
    console.error('OneSignal error:', e);
    document.getElementById('notifStatus').textContent = '❌ ' + e.message;
  }
}

async function testerNotification(){
  if(!isNotifEnabled()){ alert('Active d\'abord les notifications'); return; }
  const msg = getNotificationMessage('midday');
  await showLocalNotification(msg.i + ' ' + msg.t, msg.m);
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
      localStorage.setItem(key, '1');
    }
  }
  if(hh === 13 && mm >= 0 && mm < 5){
    const key = `notif_midday_${todayKey}`;
    if(!localStorage.getItem(key)){
      const msg = getNotificationMessage('midday');
      await showLocalNotification(msg.i + ' ' + msg.t, msg.m);
      localStorage.setItem(key, '1');
    }
  }
  if(hh === 20 && mm >= 0 && mm < 5){
    const key = `notif_evening_${todayKey}`;
    if(!localStorage.getItem(key)){
      const msg = getNotificationMessage('evening');
      await showLocalNotification(msg.i + ' ' + msg.t, msg.m);
      localStorage.setItem(key, '1');
    }
  }
}

function enableNotifications(){ toggleNotifications(); }

async function checkDailyReminders(){
  if(!('Notification' in window) || Notification.permission !== 'granted') return;
  if(!isNotifEnabled()) return;
  const today  = todayStr();
  const now    = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for(const r of reminders){
    if(r.sent) continue;
    if(r.due_date) continue;
    if(!r.time) continue;
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
// MODULE RAPPELS
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
      document.getElementById('reminderTime').value =
        String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
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
  let   type = document.getElementById('reminderType').value;

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
    const result = await dbUpdate('reminders', editingReminderId, {
      text, time, type, due_date: dueDate, sent: false
    });
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
  if(reminders.length === 0){
    el.innerHTML = '<div class="empty">Aucun rappel. Crées-en un !</div>';
    return;
  }
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

    const dateStr = due
      ? due.toLocaleString('fr-FR', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})
      : r.time || '';

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
// MODULE IA
// ============================================================
function toggleAiConfig(){
  const body  = document.getElementById('aiConfigBody');
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
  const boldRegex    = /\*\*(.+?)\*\*/g;

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
    let body  = content;
    const titleMatch = content.match(/^([^:]{2,80}?)\s*:\s*([\s\S]+)$/);
    if(titleMatch){
      title = titleMatch[1].replace(/\*\*/g, '').trim();
      body  = titleMatch[2];
    } else {
      const firstLineBreak = content.indexOf('\n');
      if(firstLineBreak > 0 && firstLineBreak < 100){
        title = content.substring(0, firstLineBreak).replace(/\*\*/g, '').trim();
        body  = content.substring(firstLineBreak + 1);
      } else {
        title = content.replace(/\*\*/g, '').substring(0, 80);
        body = '';
      }
    }
    body = body.replace(boldRegex, '<strong>$1</strong>');
    const color = detectColor(s.content);
    return `<div class="ai-section ${color}">
      ${s.num ? `<div class="ai-section-title"><span class="ai-section-num">${s.num}</span>${title}</div>` : ''}
      ${!s.num && title ? `<div class="ai-section-title">${title}</div>` : ''}
      ${body.trim() ? `<div class="ai-section-body">${body.trim().replace(/\n/g, '<br>')}</div>` : ''}
    </div>`;
  }).join('');
}

async function loadSavedAnalysis(){
  try {
    const user = await getCurrentUser();
    if(!user) return;
    const { data, error } = await sb.from('user_settings')
      .select('ai_analysis, ai_analysis_date').eq('user_id', user.id).maybeSingle();
    if(error){ console.warn('loadSavedAnalysis:', error.message); return; }
    if(!data || !data.ai_analysis) return;
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
  const dateStr = new Date().toLocaleString('fr-FR', {
    day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'
  });
  localStorage.setItem('ai_last_analysis', text);
  localStorage.setItem('ai_last_analysis_date', dateStr);
  try {
    const user = await getCurrentUser();
    if(!user) return;
    const { error } = await sb.from('user_settings')
      .upsert({ user_id: user.id, ai_analysis: text, ai_analysis_date: dateStr }, { onConflict: 'user_id' });
    if(error) console.warn('saveAnalysis:', error.message);
  } catch(e){ console.warn('saveAnalysis error:', e); }
}

async function clearAnalysis(){
  if(!confirm('Effacer l\'analyse ?')) return;
  localStorage.removeItem('ai_last_analysis');
  localStorage.removeItem('ai_last_analysis_date');
  try {
    const user = await getCurrentUser();
    if(user) await sb.from('user_settings').update({ ai_analysis: null, ai_analysis_date: null }).eq('user_id', user.id);
  } catch(e){ console.warn('clearAnalysis error:', e); }
  document.getElementById('aiOutput').innerHTML =
    '<div class="empty">Clique sur <strong>Analyser</strong>.</div>';
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
    const btn = document.getElementById('aiCopyBtn');
    btn.textContent = '✅ Copié !';
    setTimeout(() => btn.textContent = '📋 Copier', 2000);
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
  const key      = document.getElementById('aiKey').value.trim();
  const url      = document.getElementById('aiUrl').value.trim();
  if(!key){ alert("Colle ta clé"); return; }

  const cfg = {provider, key, url};
  localStorage.setItem('aiConfig', JSON.stringify(cfg));

  try {
    const user = await getCurrentUser();
    if(user){
      await sb.from('user_settings').upsert(
        { user_id: user.id, ai_config: cfg },
        { onConflict: 'user_id' }
      );
    }
  } catch(e){ console.warn('saveAiConfig sync:', e); }

  updateAiStatus();
  alert("✅ Enregistré et synchronisé !");
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

async function loadAiConfigFromSupabase(){
  try {
    const user = await getCurrentUser();
    if(!user) return;

    const { data, error } = await sb.from('user_settings')
      .select('ai_config').eq('user_id', user.id).maybeSingle();

    if(error || !data || !data.ai_config) return;

    localStorage.setItem('aiConfig', JSON.stringify(data.ai_config));
    updateAiStatus();
    console.log('✅ Config IA synchronisée depuis Supabase');
  } catch(e){ console.warn('loadAiConfigFromSupabase:', e); }
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
      body: JSON.stringify({model: AI_MODELS.anthropic, max_tokens: 1500,
        messages: [{role: 'user', content: prompt}]})
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
    body: JSON.stringify({model: AI_MODELS.openai,
      messages: [{role: 'system', content: 'Tu es un conseiller financier personnel direct.'},
                {role: 'user', content: prompt}], temperature: 0.7})
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
  const prompt = `Tu es un conseiller financier personnel. Voici le résumé :

${summary}

Analyse en français, en 8 points numérotés :
1. Diagnostic global
2. Taux d'épargne
3. Poste à surveiller
4. Prévision fin de mois
5. Combien épargner ce mois
6. Une idée de business adaptée
7. Action immédiate aujourd'hui
8. Encouragement personnalisé

Concret, chiffré. N'utilise PAS d'astérisques.`;
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

async function loadChatHistory(){
  try {
    const key = await getChatStorageKey();
    const raw = localStorage.getItem(key);
    chatHistory = raw ? JSON.parse(raw) : [];
  } catch(e){ chatHistory = []; }
}

async function saveChatHistory(){
  try {
    const key = await getChatStorageKey();
    const toSave = chatHistory.slice(-100);
    localStorage.setItem(key, JSON.stringify(toSave));
  } catch(e){ console.warn(e); }
}

async function openChat(){
  await loadChatHistory();
  document.getElementById('chatModalBg').classList.add('show');

  if(chatHistory.length === 0){
    const user = await getCurrentUser();
    const s = computeStats();
    const firstName = (user?.email || '').split('@')[0] || 'toi';

    const welcome = `Salut ${firstName} ! 👋

Je suis ton assistant IA. Je connais déjà ta situation :
• Solde du mois : ${fmt(s.bal)}
• Revenus : ${fmt(s.totalIn)} | Dépenses : ${fmt(s.totalOut)}
• ${clients.length} clients · ${shoots.length} séances · ${coffres.length} objectifs

Pose-moi n'importe quelle question ! 💪`;

    chatHistory.push({ role: 'assistant', content: welcome, ts: Date.now() });
    await saveChatHistory();
  }

  renderChatMessages();
  setTimeout(() => document.getElementById('chatInput')?.focus(), 300);
}

function closeChat(){
  document.getElementById('chatModalBg').classList.remove('show');
}

function sendSuggestion(text){
  const input = document.getElementById('chatInput');
  if(input){
    input.value = text;
    sendChatMessage();
  }
}

async function sendChatMessage(){
  if(chatSending) return;
  const input = document.getElementById('chatInput');
  const btn = document.getElementById('chatSendBtn');
  const text = (input?.value || '').trim();
  if(!text) return;

  let cfg = null;
  try { cfg = JSON.parse(localStorage.getItem('aiConfig')); } catch(e){}
  if(!cfg || !cfg.key){
    alert("Configure d'abord ta clé API IA.");
    return;
  }

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
      lines.push(`• ${c.name}${c.city ? ' (' + c.city + ')' : ''}${c.phone ? ' — ' + c.phone : ''}`);
    });
  }

  if(shoots.length > 0){
    lines.push('');
    lines.push('=== SÉANCES PHOTO ===');
    const sorted = [...shoots].sort((a,b) => (b.date || '').localeCompare(a.date || '')).slice(0, 10);
    sorted.forEach(sh => {
      const client = sh.client_id ? clients.find(c => c.id === sh.client_id) : null;
      const dateStr = sh.date ? new Date(sh.date).toLocaleDateString('fr-FR') : '?';
      lines.push(`• ${dateStr} — ${sh.type}${client ? ' avec ' + client.name : ''} — ${Math.round(sh.price)} — ${sh.payment === 'paye' ? 'payé' : 'impayé'}`);
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
      lines.push(`• ${t.date} ${sign}${Math.round(t.amount)} — ${t.category}${t.note ? ' (' + t.note + ')' : ''}`);
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

  const systemPrompt = `Tu es un assistant financier personnel, direct et concret.

Voici TOUTES les données de l'utilisateur :

${context}

RÈGLES :
- Réponds en français, clair et amical.
- Base-toi sur ces données réelles.
- Conseils CONCRETS et CHIFFRÉS.
- Emojis avec modération.
- N'utilise PAS d'astérisques **.`;

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
        model: AI_MODELS.anthropic, max_tokens: 1500,
        system: systemPrompt, messages: messages.slice(2)
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
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODELS.gemini}:generateContent?key=${cfg.key}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: geminiMessages }) }
    );
    const j = await r.json();
    if(j.error) throw new Error(j.error.message);
    return j.candidates?.[0]?.content?.parts?.[0]?.text || 'Pas de réponse';
  }

  const url = cfg.provider === 'custom' && cfg.url ? cfg.url : 'https://api.openai.com/v1/chat/completions';
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.key}` },
    body: JSON.stringify({ model: AI_MODELS.openai, messages, temperature: 0.7, max_tokens: 1500 })
  });
  const j = await r.json();
  if(j.error) throw new Error(j.error.message);
  return j.choices?.[0]?.message?.content || 'Pas de réponse';
}

function renderChatMessages(){
  const el = document.getElementById('chatMessages');
  if(!el) return;

  if(chatHistory.length === 0){
    el.innerHTML = '<div class="empty">Commence la conversation !</div>';
    return;
  }

  el.innerHTML = chatHistory.map((m, idx) => {
    const isUser = m.role === 'user';
    const content = (m.content || '').replace(/\n/g, '<br>');
    return `<div class="chat-msg ${isUser ? 'user' : 'assistant'}">
      <div>${content}</div>
      <div class="chat-msg-footer">
        <button class="chat-msg-btn" onclick="copyChatMessage(${idx})" title="Copier">📋</button>
      </div>
    </div>`;
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
    navigator.clipboard.writeText(text).then(() => showToast('✅ Copié !'))
      .catch(() => fallbackCopy(text));
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
  showToast('✅ Copié !');
}

function copyFullChat(){
  if(chatHistory.length === 0){ alert('Aucun message'); return; }
  const text = chatHistory.map(m => {
    const who = m.role === 'user' ? '👤 TOI' : '🤖 IA';
    return `${who} :\n${m.content}`;
  }).join('\n\n─────────\n\n');

  if(navigator.clipboard){
    navigator.clipboard.writeText(text).then(() => showToast('✅ Tout copié !'))
      .catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

async function clearChat(){
  if(!confirm('Effacer toute la conversation ?')) return;
  chatHistory = [];
  await saveChatHistory();
  renderChatMessages();
  closeChat();
  setTimeout(() => openChat(), 200);
}

function exportChatPDF(){
  if(chatHistory.length === 0){ alert('Aucun message à exporter'); return; }
  if(!window.jspdf || !window.jspdf.jsPDF){ alert('PDF non chargé'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pageWidth = 190;
  let y = 20;

  doc.setFillColor(108, 140, 255);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Conversation avec l\'IA', 14, 14);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleString('fr-FR'), 14, 22);
  y = 38;

  chatHistory.forEach(m => {
    const isUser = m.role === 'user';
    const who = isUser ? '👤 TOI' : '🤖 IA';
    const dateStr = m.ts ? new Date(m.ts).toLocaleString('fr-FR', {hour: '2-digit', minute: '2-digit'}) : '';

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(isUser ? 108 : 46, isUser ? 140 : 180, isUser ? 255 : 100);
    if(y > 280){ doc.addPage(); y = 20; }
    doc.text(who + (dateStr ? ' — ' + dateStr : ''), 14, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(m.content || '', pageWidth);
    lines.forEach(line => {
      if(y > 285){ doc.addPage(); y = 20; }
      doc.text(line, 14, y);
      y += 5;
    });
    y += 6;
  });

  doc.save(`chat-ia-${todayStr()}.pdf`);
}

function showToast(message){
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    background: var(--green); color: #000; padding: 10px 20px;
    border-radius: 20px; font-size: 13px; font-weight: 700;
    z-index: 999; box-shadow: 0 4px 20px rgba(0,0,0,.3);
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity .3s';
    setTimeout(() => toast.remove(), 300);
  }, 1500);
}

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('chatInput');
  if(input){
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });
  }
});

// ============================================================
// SERVICE WORKER MESSAGE
// ============================================================
if('serviceWorker' in navigator){
  navigator.serviceWorker.addEventListener('message', (event) => {
    if(event.data && event.data.type === 'notification-click'){
      window.focus();
      if(event.data.url) window.location.href = event.data.url;
    }
  });
}

// ============================================================
// SET INTERVAL
// ============================================================
setInterval(() => {
  checkAutomaticNotifications();
  checkDailyReminders();
  checkNoteReminders();
}, 60000);

// ============================================================
// INITIALISATION
// ============================================================
function init(){
  setType('depense');
  setupAutocomplete('shootLocation', 'shootLocationList');
  setupAutocomplete('clientCity', 'clientCityList');
  populateHistFilters();
  refreshAll();
  updateAiStatus();
  newQuote();
  updateNotifButton();
  loadSavedAnalysis();
  loadIdeasAI();
  renderInspirations();
  renderNotes();

  // Charge la config IA depuis Supabase (sync multi-appareils)
  loadAiConfigFromSupabase();

  setTimeout(updateShootStatuses, 1500);
  setTimeout(registerOneSignalPlayer, 2000);
  setTimeout(checkNoteReminders, 3000);

  setTimeout(() => {
    checkAutomaticNotifications();
    checkDailyReminders();
  }, 2500);
}

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