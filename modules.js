// ============================================================
// MODULES.JS — Objectifs, Photo, Business, Motivation, IA, Dashboard
// ============================================================

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
// MODULE OBJECTIFS AMÉLIORÉ
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
  if(pct >= 100) return {level:5, msg:'🎉 OBJECTIF ATTEINT ! Tu es une machine !'};
  if(pct >= 75) return {level:4, msg:'🔥 Tu y es presque ! Plus que quelques efforts.'};
  if(pct >= 50) return {level:3, msg:'💪 À mi-chemin ! Le plus dur est derrière toi.'};
  if(pct >= 25) return {level:2, msg:'⚡ Bon démarrage ! Garde le rythme.'};
  if(pct > 0)   return {level:1, msg:'🌱 C\'est parti ! Chaque franc compte.'};
  return {level:1, msg:'🎯 C\'est le moment de commencer !'};
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
    text = 'Crée ton premier objectif et commence à épargner. Chaque grand voyage commence par un petit pas.';
  } else if(globalPct >= 100){
    title = '🏆 Champion !';
    text = 'Tu as atteint 100% de tes objectifs. Fais-toi plaisir, tu l\'as mérité, et lance-toi un nouveau défi !';
  } else if(globalPct >= 75){
    title = '🔥 Tu y es presque !';
    text = `Tu es à ${globalPct.toFixed(0)}% de tes objectifs. Encore un petit effort et tu y seras. Ne lâche rien maintenant !`;
  } else if(globalPct >= 50){
    title = '💪 À mi-chemin !';
    text = `Tu as complété ${globalPct.toFixed(0)}% de tes objectifs. Le plus dur est fait. Continue à mettre de côté régulièrement.`;
  } else if(globalPct >= 25){
    title = '⚡ Bon démarrage !';
    text = `Tu es à ${globalPct.toFixed(0)}% de tes objectifs. Garde ce rythme, tu es sur la bonne voie !`;
  } else if(globalPct > 0){
    title = '🌱 C\'est parti !';
    text = `Tu as commencé, c'est l'essentiel. Chaque franc épargné te rapproche de ton but. Tiens bon !`;
  } else {
    title = '🎯 À toi de jouer !';
    text = 'Tes objectifs t\'attendent. Commence par un petit montant aujourd\'hui, même 1000 FCFA.';
  }

  const icon1 = document.getElementById('motivIcon');
  const title1 = document.getElementById('motivTitle');
  const text1 = document.getElementById('motivText');
  if(icon1) icon1.textContent = icon;
  if(title1) title1.textContent = title;
  if(text1) text1.textContent = text;
}

const DEFIS = [
  "Aujourd'hui, n'achète rien d'impulsif. Avant chaque achat, demande-toi : 'Est-ce que j'en ai VRAIMENT besoin ?'",
  "Épargne 1000 FCFA aujourd'hui, même si c'est symbolique. Le geste compte plus que le montant.",
  "Note TOUS tes achats de la journée, même un simple café. La conscience est le premier pas.",
  "Prépare ton repas maison au lieu de commander. Économie garantie.",
  "Évite les réseaux sociaux pendant 2h et utilise ce temps pour réfléchir à un revenu supplémentaire.",
  "Contacte un ancien client pour prendre de ses nouvelles. Le réseau, c'est du business qui dort.",
  "Aujourd'hui, utilise uniquement du cash. Pas de carte, pas de mobile money. Tu verras la différence.",
  "Range ton espace de travail. Un esprit clair attire plus d'opportunités.",
  "Envoie un message à 3 clients passés pour leur proposer une mini-session à prix réduit.",
  "Fais le point sur tes abonnements : y en a-t-il un que tu peux annuler ?",
  "Aujourd'hui, pas de livraison. Va chercher toi-même ce dont tu as besoin.",
  "Prends 15 minutes pour écrire tes 3 objectifs financiers des 3 prochains mois.",
  "Poste une de tes meilleures photos sur Instagram avec un prix 'à partir de'. Teste le marché.",
  "Contacte un photographe pro pour échanger des conseils. Le réseau pro est précieux.",
  "Aujourd'hui, dis non à une dépense qui ne sert pas ton futur."
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
      items.push({
        cls:'good',
        title:`✅ ${c.name} — Terminé !`,
        text:`Tu as réussi à épargner ${fmt(goal)}. Félicitations, c'est une vraie victoire !`
      });
      return;
    }

    if(c.target_date){
      const days = Math.ceil((new Date(c.target_date) - new Date()) / 86400000);
      if(days > 0){
        const perDay = rest / days;
        const perWeek = perDay * 7;
        const perMonth = perDay * 30;

        const s = computeStats();
        const monthlyCapacity = s.bal > 0 ? s.bal : (s.totalIn * SAVINGS_TARGET);

        if(monthlyCapacity >= perMonth){
          items.push({
            cls:'good',
            title:`🎯 ${c.name} est faisable !`,
            text:`À ton rythme actuel, tu peux y arriver. Il te faut ${fmt(perMonth)}/mois, soit ${fmt(perWeek)}/semaine ou ${fmt(perDay)}/jour.`
          });
        } else {
          items.push({
            cls:'warn',
            title:`⚠ ${c.name} — Rythme serré`,
            text:`Il te faudrait ${fmt(perMonth)}/mois, mais ta capacité d'épargne estimée est de ${fmt(monthlyCapacity)}. Soit tu prolonges la date, soit tu augmentes tes revenus.`
          });
        }
      }
    } else {
      items.push({
        cls:'',
        title:`📊 ${c.name} — ${pct.toFixed(0)}%`,
        text:`Il te reste ${fmt(rest)}. À 5000 FCFA/semaine, tu atteindras ton objectif dans ${Math.ceil(rest / 5000)} semaines.`
      });
    }
  });

  const totalGoal = coffres.reduce((s,c) => s + Number(c.goal || 0), 0);
  const totalCurrent = coffres.reduce((s,c) => s + Number(c.current || 0), 0);
  const globalPct = (totalCurrent / totalGoal) * 100;

  if(coffres.length >= 2){
    items.push({
      cls: globalPct >= 50 ? 'good' : 'warn',
      title: '💡 Conseil global',
      text: globalPct >= 50
        ? `Tu progresses bien sur l'ensemble de tes ${coffres.length} objectifs (${globalPct.toFixed(0)}% total). Concentre-toi maintenant sur celui qui est le plus loin du but.`
        : `Tu as ${coffres.length} objectifs en cours mais seulement ${globalPct.toFixed(0)}% complétés. Peut-être te concentrer sur 1 ou 2 objectifs serait plus efficace.`
    });
  }

  el.innerHTML = items.map(i => `
    <div class="analyse-item ${i.cls}">
      <strong>${i.title}</strong>
      ${i.text}
    </div>
  `).join('');
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
        timeInfo = `<div class="coffre-next">
          <span>⏱ ${days} jours restants</span>
          <span>${fmt(perWeek)}/semaine</span>
        </div>`;
      } else {
        timeInfo = `<div class="coffre-next"><span style="color:var(--red)">⚠ Date dépassée</span></div>`;
      }
    } else if(rest > 0){
      timeInfo = `<div class="coffre-next">
        <span>💡 Astuce : ajoute régulièrement de petites sommes</span>
      </div>`;
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
        <div class="coffre-name">
          <span class="coffre-emoji">${emoji}</span>
          ${c.name}
        </div>
        ${badge}
      </div>

      <div class="coffre-progress">
        <div class="coffre-progress-fill" style="width:${pct}%;background:${color}"></div>
      </div>
      <div class="coffre-paliers">
        <span class="${p25}">25%</span>
        <span class="${p50}">50%</span>
        <span class="${p75}">75%</span>
        <span class="${p100}">100%</span>
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

function onShootTypeChange(){
  const t = document.getElementById('shootType').value;
  document.getElementById('shootCustomTypeWrap').style.display =
    (t === 'Autre') ? 'block' : 'none';
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

  const data = {
    client_id: clientId ? parseInt(clientId) : null,
    type, location, photo_count, date, price, payment, notes
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
function renderShoots(){
  const el = document.getElementById('shootsList');
  const sorted = [...shoots].sort((a,b) => (b.date || '').localeCompare(a.date || ''));
  if(sorted.length === 0){ el.innerHTML = '<div class="empty">Aucune séance</div>'; return; }
  el.innerHTML = sorted.map(s => {
    const client = s.client_id ? clients.find(c => c.id === s.client_id) : null;
    const d = new Date(s.date);
    const dStr = d.toLocaleDateString('fr-FR', {day:'2-digit', month:'short'}) + ' ' +
                 d.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
    const locInfo = s.location ? `📍 ${s.location}` : '';
    const photoInfo = s.photo_count ? `📷 ${s.photo_count} photos` : '';
    const metaInfo = [locInfo, photoInfo].filter(x => x).join(' · ');
    return `<div class="item-card">
      <div class="head">
        <div class="name">📸 ${s.type}${client ? ' · ' + client.name : ''}</div>
        <span class="badge ${s.payment}">${s.payment === 'paye' ? 'Payé' : 'Impayé'}</span>
      </div>
      <div class="amt">
        <span>📅 ${dStr}</span>
        <span style="color:var(--green);font-weight:600">${fmt(s.price)}</span>
      </div>
      ${metaInfo ? `<div style="font-size:12px;color:var(--muted);margin-top:6px">${metaInfo}</div>` : ''}
      ${s.notes ? `<div style="font-size:12px;color:var(--muted);margin-top:4px">${s.notes}</div>` : ''}
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
// DASHBOARD ENRICHI
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
  if(score >= 75){
    title.textContent = '🌟 Excellente santé';
    text.textContent = 'Tu es sur la bonne voie. Continue comme ça !';
  } else if(score >= 50){
    title.textContent = '👍 Bonne santé';
    text.textContent = 'Quelques ajustements pour passer au niveau supérieur.';
  } else {
    title.textContent = '⚠ À améliorer';
    text.textContent = 'Concentre-toi sur ton épargne et tes revenus.';
  }
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
    <div class="legend-item">
      <div class="legend-dot" style="background:var(--green)"></div>
      <div class="legend-label">Revenus</div>
      <div class="legend-value" style="color:var(--green)">${fmt(s.totalIn)}</div>
    </div>
    <div class="legend-item">
      <div class="legend-dot" style="background:var(--red)"></div>
      <div class="legend-label">Dépenses</div>
      <div class="legend-value" style="color:var(--red)">${fmt(s.totalOut)}</div>
    </div>
  `;
}

function renderShootTypesChart(){
  const el = document.getElementById('shootTypesChart');
  if(shoots.length === 0){
    el.innerHTML = '<div class="empty">Aucune séance enregistrée</div>';
    return;
  }
  const byType = {};
  shoots.forEach(s => { byType[s.type] = (byType[s.type] || 0) + 1; });
  const entries = Object.entries(byType).sort((a,b) => b[1] - a[1]);
  const total = shoots.length;
  el.innerHTML = entries.map(([type, count]) => {
    const pct = (count / total) * 100;
    return `<div class="cat-row">
      <div class="top"><span>📸 ${type}</span><span>${count} séance${count>1?'s':''} · ${pct.toFixed(0)}%</span></div>
      <div class="bar"><div style="width:${pct}%;background:var(--pink)"></div></div>
    </div>`;
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
    const total = txs
      .filter(t => t.type === 'revenu' && t.date.startsWith(key))
      .reduce((a,b) => a + Number(b.amount), 0);
    months.push({ label, total });
  }
  const max = Math.max(...months.map(m => m.total), 1);
  el.innerHTML = months.map(m => {
    const height = (m.total / max) * 100;
    return `<div class="bar-6m">
      <div class="bar-value">${m.total > 0 ? Math.round(m.total/1000)+'k' : '0'}</div>
      <div class="bar-fill" style="height:${height}%"></div>
      <div class="bar-label">${m.label}</div>
    </div>`;
  }).join('');
}

function renderSuggestions(){
  const el = document.getElementById('suggestions');
  const s = computeStats();
  const suggestions = [];

  if(s.totalIn > 0 && s.savingsRate < SAVINGS_TARGET){
    const missing = (s.totalIn * SAVINGS_TARGET) - (s.totalIn * s.savingsRate);
    suggestions.push({icon:'💰', title:'Augmente ton épargne',
      body:`Tu peux encore épargner ${fmt(missing)} ce mois pour atteindre ton objectif de ${(SAVINGS_TARGET*100)}%.`});
  }
  const pending = shoots.filter(s => s.payment === 'impaye').reduce((a,b) => a + Number(b.price), 0);
  if(pending > 0){
    suggestions.push({icon:'📞', title:'Relance tes clients',
      body:`Tu as ${fmt(pending)} à encaisser. Un petit message peut accélérer le paiement.`});
  }
  if(clients.length === 0){
    suggestions.push({icon:'👥', title:'Commence par tes clients',
      body:'Ajoute tes clients existants pour suivre leurs séances et paiements.'});
  }
  if(coffres.length === 0){
    suggestions.push({icon:'🎯', title:'Crée ton premier objectif',
      body:'Un objectif d\'épargne te motive à mettre de côté. Commence petit : 50 000 FCFA.'});
  }
  if(s.sortedCats[0]){
    const pct = (s.sortedCats[0][1] / s.totalOut * 100);
    if(pct > 40){
      suggestions.push({icon:'🎯', title:`Attention à "${s.sortedCats[0][0]}"`,
        body:`Ce poste représente ${pct.toFixed(0)}% de tes dépenses. Essaie de le réduire de 10%.`});
    }
  }
  if(shoots.length > 0 && s.totalIn > 0){
    const photoRevenue = shoots.filter(s => s.payment === 'paye').reduce((a,b) => a + Number(b.price), 0);
    if(photoRevenue < s.totalIn * 0.3){
      suggestions.push({icon:'💡', title:'Développe ton activité photo',
        body:'La photo représente moins de 30% de tes revenus. Pense à des mini-sessions ou partenariats.'});
    }
  }
  if(suggestions.length === 0){
    el.innerHTML = '<div class="empty">Tout est en ordre ! Continue comme ça. 🎉</div>';
    return;
  }
  el.innerHTML = suggestions.slice(0, 5).map(sg => `
    <div class="suggestion">
      <div class="icon">${sg.icon}</div>
      <div class="title">${sg.title}</div>
      <div class="body">${sg.body}</div>
    </div>
  `).join('');
}

// ============================================================
// MODULE HISTORIQUE
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
  if(selectedTxIds.size === 0){
    alert("Aucune transaction sélectionnée");
    return;
  }
  if(!confirm(`Supprimer ${selectedTxIds.size} transaction(s) ?`)) return;

  const ids = [...selectedTxIds];
  for(const id of ids){
    await dbDelete('transactions', id);
  }
  txs = txs.filter(t => !selectedTxIds.has(t.id));
  selectedTxIds.clear();
  populateHistFilters();
  renderHistory();
  refreshAll();
}

async function deleteAllFiltered(){
  const filtered = getFilteredTx();
  if(filtered.length === 0){
    alert("Aucune transaction à supprimer");
    return;
  }
  if(!confirm(`⚠ Supprimer ${filtered.length} transaction(s) ?`)) return;
  if(!confirm(`Confirmer la suppression définitive ?`)) return;

  for(const t of filtered){
    await dbDelete('transactions', t.id);
  }
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

  if(!window.jspdf || !window.jspdf.jsPDF){
    alert("La bibliothèque PDF n'est pas encore chargée. Attends 2 secondes et réessaie.");
    return;
  }

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

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  const month  = document.getElementById('histMonth').value;
  const type   = document.getElementById('histType').value;
  const cat    = document.getElementById('histCategory').value;
  const filterLines = [];
  filterLines.push("Mois : " + (month === 'all' ? 'Tous' : month));
  filterLines.push("Type : " + (type === 'all' ? 'Tous' : (type === 'revenu' ? 'Revenus' : 'Dépenses')));
  filterLines.push("Catégorie : " + (cat === 'all' ? 'Toutes' : cat));
  doc.text(filterLines.join("   |   "), 14, 40);

  const totalIn  = filtered.filter(t => t.type === 'revenu').reduce((s,t) => s + Number(t.amount), 0);
  const totalOut = filtered.filter(t => t.type === 'depense').reduce((s,t) => s + Number(t.amount), 0);
  const solde    = totalIn - totalOut;

  doc.setFontSize(11);
  doc.setTextColor(46, 204, 113);
  doc.text(`Revenus : ${fmt(totalIn)}`, 14, 50);
  doc.setTextColor(255, 92, 92);
  doc.text(`Dépenses : ${fmt(totalOut)}`, 80, 50);
  doc.setTextColor(solde >= 0 ? 46 : 255, solde >= 0 ? 204 : 92, solde >= 0 ? 113 : 92);
  doc.text(`Solde : ${fmt(solde)}`, 146, 50);

  const rows = filtered.map(t => [
    new Date(t.date).toLocaleDateString('fr-FR'),
    t.type === 'revenu' ? 'Revenu' : 'Dépense',
    t.category,
    (t.type === 'revenu' ? '+' : '−') + fmt(t.amount),
    t.note || ''
  ]);

  doc.autoTable({
    startY: 58,
    head: [['Date', 'Type', 'Catégorie', 'Montant', 'Note']],
    body: rows,
    theme: 'striped',
    headStyles: {fillColor: [108, 140, 255], textColor: 255, fontStyle: 'bold'},
    bodyStyles: {fontSize: 9, textColor: 40},
    alternateRowStyles: {fillColor: [245, 247, 250]},
    columnStyles: {
      0: {cellWidth: 22},
      1: {cellWidth: 20},
      2: {cellWidth: 35},
      3: {cellWidth: 30, halign: 'right'},
      4: {cellWidth: 'auto'}
    }
  });

  const pageCount = doc.internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++){
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Page ${i} / ${pageCount}  —  Ma Super App`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  doc.save(`historique-${todayStr()}.pdf`);
}

// ============================================================
// MODULE BUSINESS — IDÉES LOCALES
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
// IDÉES IA — AVEC SAUVEGARDE + BOUTONS (comme l'analyse)
// ============================================================

// Formate le texte des idées IA en cartes propres
function formatIdeasText(text){
  if(!text) return '<div class="empty">Pas de contenu</div>';

  let safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

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
        sections.push({
          num: currentSection,
          content: currentContent.join('\n').trim()
        });
      }
      currentSection = match[1];
      currentContent = [match[2]];
    } else {
      currentContent.push(line);
    }
  });

  if(currentSection !== null || currentContent.length > 0){
    sections.push({
      num: currentSection,
      content: currentContent.join('\n').trim()
    });
  }

  sections = sections.filter(s => s.content);

  if(sections.length === 0){
    sections = [{num: null, content: safe}];
  }

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

    body = body.replace(boldRegex, '<strong>$1</strong>');
    body = body.replace(/→/g, '•');

    return `<div class="ai-section">
      ${s.num ? `<div class="ai-section-title"><span class="ai-section-num">${s.num}</span>${title}</div>` : ''}
      ${!s.num && title ? `<div class="ai-section-title">${title}</div>` : ''}
      ${body.trim() ? `<div class="ai-section-body">${body.trim().replace(/\n/g, '<br>')}</div>` : ''}
    </div>`;
  }).join('');
}

// Charge les idées IA sauvegardées
async function loadIdeasAI(){
  try {
    const user = await getCurrentUser();
    if(!user) return;

    const { data, error } = await sb
      .from('user_settings')
      .select('ideas_ai, ideas_ai_date')
      .eq('user_id', user.id)
      .maybeSingle();

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
  } catch(e){
    console.warn('loadIdeasAI error:', e);
  }
}

// Sauvegarde les idées IA
async function saveIdeasAI(text){
  const dateStr = new Date().toLocaleString('fr-FR', {
    day:'2-digit', month:'long', year:'numeric',
    hour:'2-digit', minute:'2-digit'
  });

  localStorage.setItem('ideas_ai_last', text);
  localStorage.setItem('ideas_ai_last_date', dateStr);

  try {
    const user = await getCurrentUser();
    if(!user) return;

    const { error } = await sb
      .from('user_settings')
      .upsert(
        { user_id: user.id, ideas_ai: text, ideas_ai_date: dateStr },
        { onConflict: 'user_id' }
      );

    if(error) console.warn('saveIdeasAI Supabase:', error.message);
  } catch(e){
    console.warn('saveIdeasAI error:', e);
  }
}

// Efface les idées IA
async function clearIdeasAI(){
  if(!confirm('Effacer les idées IA ?')) return;

  localStorage.removeItem('ideas_ai_last');
  localStorage.removeItem('ideas_ai_last_date');

  try {
    const user = await getCurrentUser();
    if(user){
      await sb.from('user_settings')
        .update({ ideas_ai: null, ideas_ai_date: null })
        .eq('user_id', user.id);
    }
  } catch(e){
    console.warn('clearIdeasAI error:', e);
  }

  document.getElementById('ideasAIOutput').innerHTML =
    '<div class="empty">Clique sur <strong>Générer</strong> pour obtenir 5 idées de business personnalisées.</div>';
  document.getElementById('ideasLastUpdate').classList.remove('visible');
  document.getElementById('ideasCopyBtn').disabled = true;
  document.getElementById('ideasPdfBtn').disabled = true;
  document.getElementById('ideasClearBtn').disabled = true;
}

// Copie les idées IA
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

// Export PDF des idées IA
function exportIdeasAIPDF(){
  const text = localStorage.getItem('ideas_ai_last');
  const date = localStorage.getItem('ideas_ai_last_date');
  if(!text){ alert('Aucune idée à exporter'); return; }

  if(!window.jspdf || !window.jspdf.jsPDF){
    alert('La bibliothèque PDF n\'est pas encore chargée. Attends 2 secondes et réessaie.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFillColor(255, 107, 157);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text("Idées de business IA", 14, 16);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if(date) doc.text(date, 14, 24);

  const cleanText = text.replace(/\*\*/g, '').replace(/→/g, '•');

  doc.setTextColor(40, 40, 40);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const splitText = doc.splitTextToSize(cleanText, 180);
  let y = 42;
  const pageHeight = doc.internal.pageSize.height - 15;

  splitText.forEach(line => {
    if(y > pageHeight){
      doc.addPage();
      y = 15;
    }
    doc.text(line, 14, y);
    y += 6;
  });

  const pageCount = doc.internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++){
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Page ${i} / ${pageCount}  —  Ma Super App`,
      14,
      doc.internal.pageSize.height - 8
    );
  }

  doc.save(`idees-ia-${todayStr()}.pdf`);
}

// Fonction principale (bouton "🤖 Générer")
async function generateAIIdeas(){
  let cfg = null;
  try { cfg = JSON.parse(localStorage.getItem('aiConfig')); } catch(e){}
  if(!cfg || !cfg.key){ alert("Configure ta clé dans l'onglet IA"); return; }

  const out = document.getElementById('ideasAIOutput');
  out.innerHTML = '<div class="empty">⏳ Génération en cours... (5 à 15 secondes)</div>';

  const summary = buildSummary();
  const prompt = `Voici le profil financier et photo d'une personne :

${summary}

Génère 5 idées de business CONCRÈTES et ADAPTÉES à ce profil (photographe, veut diversifier ses revenus).
Format strict, chaque idée sur un numéro :
1. [Titre court]
   → [Description en 2 lignes]
   → Revenu potentiel: [fourchette en FCFA]
   → Difficulté: Facile / Moyenne / Difficile
2. [Titre]
   → ...
(etc. pour les 5)

N'utilise PAS d'astérisques. Sois concret et chiffré.`;

  try {
    const text = await callAI(prompt);
    if(!text || !text.trim()){
      out.innerHTML = '<div class="empty">❌ Pas de réponse de l\'IA. Réessaie.</div>';
      return;
    }

    await saveIdeasAI(text);
    out.innerHTML = formatIdeasText(text);

    document.getElementById('ideasCopyBtn').disabled = false;
    document.getElementById('ideasPdfBtn').disabled = false;
    document.getElementById('ideasClearBtn').disabled = false;

    const dateEl = document.getElementById('ideasLastUpdate');
    dateEl.textContent = '🕐 Dernière génération : ' + new Date().toLocaleString('fr-FR', {
      day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'
    });
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
// NOTIFICATIONS GLOBALES AUTOMATIQUES
// ============================================================
const NOTIF_MESSAGES = {
  morning: [
    {i:'🌅', t:'Bonjour !', m:'Nouvelle journée, nouvelle opportunité. Chaque petit effort compte.'},
    {i:'☀️', t:'C\'est le matin !', m:'La discipline du matin fait la réussite du soir.'},
    {i:'🚀', t:'Debout !', m:'Les gagnants se lèvent avant les autres. Tu es un gagnant.'},
    {i:'💪', t:'Coucou !', m:'Aujourd\'hui, sois meilleur que hier. C\'est tout.'},
    {i:'🔥', t:'Allez !', m:'Ta seule limite, c\'est toi-même. Fonce.'},
    {i:'⭐', t:'Bon réveil !', m:'Un petit pas aujourd\'hui vaut mieux qu\'un grand demain.'},
    {i:'🌱', t:'Nouveau jour', m:'Plante aujourd\'hui ce que tu veux récolter dans 1 an.'},
    {i:'🎯', t:'Objectif du jour', m:'Décide maintenant de ce que tu vas accomplir aujourd\'hui.'},
    {i:'🏆', t:'Champion', m:'Les champions sont ceux qui se lèvent quand les autres dorment.'},
    {i:'💎', t:'Réveil précieux', m:'Ton temps est ta ressource la plus précieuse. Utilise-le bien.'},
    {i:'🌞', t:'Bonjour soleil', m:'Chaque matin est une chance de recommencer. Saisis-la.'},
    {i:'📸', t:'Photographe', m:'Ton regard unique mérite d\'être partagé. Prépare-toi à créer.'},
    {i:'💼', t:'Homme d\'affaires', m:'Pense comme un entrepreneur dès le matin. Agis en conséquence.'},
    {i:'🎨', t:'Créativité', m:'Ton imagination est ta meilleure alliée aujourd\'hui.'},
    {i:'🌟', t:'Brille !', m:'Le monde a besoin de ce que tu as à offrir. Aujourd\'hui, offre-le.'},
    {i:'⚡', t:'Énergie', m:'Booste ton corps et ton esprit. Tu vas réussir.'},
    {i:'🧠', t:'Esprit clair', m:'Un esprit préparé attire les meilleures opportunités.'},
    {i:'🎁', t:'Cadeau du jour', m:'Aujourd\'hui est un cadeau. Ne le gaspille pas.'},
    {i:'🚴', t:'Avance !', m:'Le succès n\'est pas une ligne droite, mais chaque pas compte.'},
    {i:'🦁', t:'Fier', m:'Sois fier de qui tu es et de ce que tu fais. Continue.'},
    {i:'📈', t:'Croissance', m:'La croissance commence par l\'inconfort. Sors de ta zone aujourd\'hui.'},
    {i:'🌍', t:'Ton monde', m:'Tu es le maître de ton destin. Agis en conséquence.'},
    {i:'⏰', t:'Chaque minute', m:'Chaque minute bien utilisée est une brique de ton succès.'},
    {i:'🌻', t:'Épanouis-toi', m:'Comme une fleur, ouvre-toi à la lumière du jour.'},
    {i:'🎵', t:'Harmonie', m:'Trouve ton rythme aujourd\'hui et danse avec la vie.'},
    {i:'🧗', t:'Grimpe !', m:'Chaque petit pas te rapproche du sommet. Ne t\'arrête pas.'},
    {i:'🔥', t:'Feu intérieur', m:'Cette flamme en toi, c\'est ton moteur. Alimente-la.'},
    {i:'🌊', t:'Grand large', m:'Navigue vers tes rêves. Le vent est avec toi ce matin.'},
    {i:'💡', t:'Idée du jour', m:'Une idée lumineuse peut changer ta journée. Cherche-la.'},
    {i:'🛤️', t:'Ta route', m:'Tu es sur le bon chemin. Continue à avancer avec confiance.'},
    {i:'🎬', t:'Action !', m:'Le film de ta réussite commence maintenant. À toi de jouer.'},
    {i:'🌸', t:'Fraîcheur', m:'Commence cette journée avec un esprit frais et ouvert.'},
    {i:'🏗️', t:'Construction', m:'Tu construis ton empire. Chaque jour compte.'},
    {i:'💫', t:'Étoile', m:'Tu es unique. Personne ne peut faire ce que tu fais comme toi.'},
    {i:'🧭', t:'Boussole', m:'Rappelle-toi pourquoi tu fais tout ça. Puis avance.'},
    {i:'🥇', t:'Premier', m:'Sois le premier à agir aujourd\'hui, pas le dernier.'},
    {i:'🌺', t:'Beauté', m:'Crée quelque chose de beau aujourd\'hui, même petit.'},
    {i:'🎓', t:'Apprends', m:'Chaque jour est une leçon. Sois attentif à ce qu\'il t\'enseigne.'},
    {i:'🦋', t:'Transformation', m:'Tu évolues chaque jour. Aujourd\'hui, sois la meilleure version de toi.'},
    {i:'🌄', t:'Aube', m:'Un nouveau lever de soleil, un nouveau départ. Profite-en.'},
    {i:'⭐', t:'Brille', m:'Ta lumière intérieure attire le succès. Laisse-la éclater.'},
    {i:'🎯', t:'Précision', m:'Vise juste, tire fort, reste concentré.'},
    {i:'💪', t:'Force', m:'Ta force est en toi. Réveille-la aujourd\'hui.'},
    {i:'🌈', t:'Après la pluie', m:'Même les jours difficiles mènent à un arc-en-ciel. Persévère.'},
    {i:'🎪', t:'Ta scène', m:'Le monde est ta scène. Aujourd\'hui, donne ton meilleur show.'},
    {i:'🕊️', t:'Paix', m:'Commence la journée avec calme. La paix attire la clarté.'},
    {i:'🎁', t:'Surprise', m:'Attends-toi à du positif aujourd\'hui. Il arrive souvent quand on l\'accueille.'},
    {i:'🌳', t:'Racines', m:'Tes efforts d\'hier sont tes racines d\'aujourd\'hui. Grandis.'},
    {i:'🔑', t:'Clé', m:'La clé du succès, c\'est la constance. Sois constant aujourd\'hui.'},
    {i:'⚓', t:'Ancre', m:'Reste ancré dans tes valeurs, peu importe les tempêtes.'}
  ],
  midday: [
    {i:'💰', t:'Conseil finance', m:'Avant chaque achat, demande-toi : "En ai-je VRAIMENT besoin ?"'},
    {i:'📸', t:'Astuce photo', m:'Publie 1 photo de ton travail aujourd\'hui. La visibilité, c\'est du business.'},
    {i:'💡', t:'Idée business', m:'Un client satisfait = 3 recommandations potentielles. Soigne tes relations.'},
    {i:'🎯', t:'Focus', m:'Écris tes 3 priorités de la journée. Fais-les avant tout le reste.'},
    {i:'📊', t:'Conseil', m:'Note tes dépenses du jour. La conscience est le 1er pas vers la liberté.'},
    {i:'💼', t:'Business', m:'Propose un mini-shooting à 3 anciens clients cette semaine.'},
    {i:'💎', t:'Conseil', m:'Épargner 1000 FCFA/jour = 30 000 FCFA/mois. Commence petit.'},
    {i:'💵', t:'Rappel', m:'Mets 20% de chaque revenu de côté AVANT de dépenser.'},
    {i:'🎬', t:'Prospection', m:'Contacte 1 nouveau client aujourd\'hui. Le succès demande de l\'audace.'},
    {i:'📱', t:'Marketing', m:'Poste 1 story sur ton activité. Gratuit et puissant.'},
    {i:'🧾', t:'Comptabilité', m:'Note tous tes paiements. La mémoire oublie, les chiffres non.'},
    {i:'🌟', t:'Témoignage', m:'Demande à un client satisfait de te recommander. C\'est gratuit.'},
    {i:'🏪', t:'Marché', m:'Connais-tu la concurrence ? Regarde ce que font les autres pros.'},
    {i:'📝', t:'Idée', m:'Note 1 idée business qui te vient à l\'esprit. Elle vaut de l\'or.'},
    {i:'💡', t:'Astuce tarif', m:'Ne brade pas tes prix. La qualité a un coût, c\'est normal.'},
    {i:'🎁', t:'Fidélisation', m:'Un petit cadeau à un client fidèle = un client à vie.'},
    {i:'🕐', t:'Pause', m:'Fais une vraie pause. La productivité aime les esprits reposés.'},
    {i:'🔍', t:'Veille', m:'Renseigne-toi sur les nouvelles tendances photo.'},
    {i:'🎓', t:'Formation', m:'Apprends 1 nouvelle compétence par mois. Aujourd\'hui, commence.'},
    {i:'💬', t:'Communication', m:'Réponds vite à tes messages clients. La réactivité gagne.'},
    {i:'📈', t:'Croissance', m:'Analyse tes chiffres du mois. Où peux-tu améliorer ?'},
    {i:'🤝', t:'Réseau', m:'Contacte 1 professionnel pour échanger des idées.'},
    {i:'🎨', t:'Style', m:'Développe ton style unique. C\'est ce qui te différencie.'},
    {i:'📷', t:'Matériel', m:'Entretiens ton matériel. Un outil propre = un travail propre.'},
    {i:'🗂️', t:'Organisation', m:'Trie tes fichiers photos. Le désordre coûte du temps.'},
    {i:'💼', t:'Devis', m:'Suis 1 devis envoyé mais sans réponse. Relance poliment.'},
    {i:'🎯', t:'Ciblage', m:'Quel est ton client idéal ? Adapte ton offre à lui.'},
    {i:'🌐', t:'En ligne', m:'Ton portfolio est-il à jour ? Mets-y tes 3 meilleures photos.'},
    {i:'📢', t:'Publicité', m:'Investis 5 000 FCFA dans une pub Facebook ciblée. Teste.'},
    {i:'💰', t:'Épargne', m:'Ouvre un coffre Mobile Money dédié à ton épargne. Sépare-la.'},
    {i:'🎁', t:'Offre', m:'Crée une offre packagée (ex : mariage + retouches) pour vendre plus.'},
    {i:'⏱️', t:'Efficacité', m:'Regroupe tes tâches similaires. Tu gagneras 30% de temps.'},
    {i:'📚', t:'Lecture', m:'Lis 10 pages d\'un livre de business aujourd\'hui.'},
    {i:'🎥', t:'Coulisses', m:'Filme-toi en train de travailler. Le public adore l\'authentique.'},
    {i:'🎯', t:'Objectif', m:'Ton objectif du mois est-il encore clair ? Sinon, réajuste.'},
    {i:'🤖', t:'Automatisation', m:'Peux-tu automatiser une tâche répétitive ? Gagne du temps.'},
    {i:'🌟', t:'Avis', m:'Demande un avis Google à un client récent. Ça booste ton SEO.'},
    {i:'💎', t:'Qualité', m:'Ne sacrifie jamais la qualité pour la rapidité.'},
    {i:'📊', t:'Analyse', m:'Quel type de séance te rapporte le plus ? Concentre-toi dessus.'},
    {i:'🛠️', t:'Compétences', m:'Le montage vidéo est demandé. Forme-toi si tu peux.'},
    {i:'💬', t:'Client', m:'Demande toujours un feedback après une prestation.'},
    {i:'📸', t:'Instagram', m:'Utilise 5 hashtags locaux pertinents. Ça change tout.'},
    {i:'🎬', t:'Storytelling', m:'Raconte une histoire derrière chaque photo. Les gens adorent.'},
    {i:'🎁', t:'Bonus', m:'Offre un petit extra à ton prochain client. Il se souviendra.'},
    {i:'🚀', t:'Innovation', m:'Essaie une nouvelle technique photo cette semaine.'},
    {i:'💰', t:'Cash-flow', m:'Un acompte de 50% protège ton travail. Exige-le.'},
    {i:'⏰', t:'Priorités', m:'Le plus important d\'abord, le reste après. Toujours.'},
    {i:'🎓', t:'Mentor', m:'Identifie 1 photographe pro que tu admires et étudie son parcours.'},
    {i:'💼', t:'Partenariats', m:'Propose un partenariat à un wedding planner ou un traiteur.'},
    {i:'🌟', t:'Excellence', m:'Vise l\'excellence, pas la perfection. La première est atteignable.'}
  ],
  evening: [
    {i:'🌙', t:'Bilan du jour', m:'As-tu épargné quelque chose aujourd\'hui ? Même 500 FCFA compte.'},
    {i:'💰', t:'Pense à épargner', m:'Ouvre ton app et ajoute tes transactions du jour.'},
    {i:'🎯', t:'Objectifs', m:'Chaque jour sans épargne est un jour de retard sur tes rêves.'},
    {i:'🔥', t:'Discipline', m:'Le succès n\'est pas un hasard, c\'est un choix quotidien.'},
    {i:'📸', t:'Bilan photo', m:'As-tu relancé tes clients impayés aujourd\'hui ?'},
    {i:'⭐', t:'Bien joué', m:'Tu as survécu à une journée de plus. Demain sera meilleur.'},
    {i:'💪', t:'Repose-toi', m:'Le repos est aussi productif que le travail.'},
    {i:'📖', t:'Bilan', m:'Note 3 choses positives qui sont arrivées aujourd\'hui.'},
    {i:'🧘', t:'Calme', m:'Avant de dormir, respire profondément 5 fois. Demain sera clair.'},
    {i:'💭', t:'Réflexion', m:'Qu\'as-tu appris aujourd\'hui ? La leçon est partout.'},
    {i:'🎬', t:'Cinéma', m:'Quelle scène de ta journée mériterait d\'être dans un film ?'},
    {i:'🌌', t:'Nuit', m:'La nuit porte conseil. Laisse tes idées venir.'},
    {i:'🎯', t:'Demain', m:'Écris tes 3 priorités de demain avant de dormir.'},
    {i:'💎', t:'Gratitude', m:'Remercie pour 1 chose qui t\'est arrivée aujourd\'hui.'},
    {i:'📊', t:'Chiffres', m:'Combien as-tu gagné et dépensé aujourd\'hui ? Fais le calcul.'},
    {i:'🌙', t:'Coucher', m:'Le sommeil est ta meilleure arme pour réussir demain.'},
    {i:'🔥', t:'Motivation', m:'Même si la journée était dure, tu as tenu. Bravo.'},
    {i:'📝', t:'Journal', m:'Note une idée qui t\'est venue aujourd\'hui. Elle est précieuse.'},
    {i:'💤', t:'Repos', m:'Un corps reposé crée un esprit vif. Dors bien.'},
    {i:'⭐', t:'Fierté', m:'Sois fier du chemin parcouru, peu importe où tu en es.'},
    {i:'🎁', t:'Demain', m:'Demain est une nouvelle chance. Ce soir, prépare-toi à la saisir.'},
    {i:'🏆', t:'Victoire', m:'Chaque jour est une victoire si tu continues d\'avancer.'},
    {i:'📸', t:'Photos', m:'Range tes photos du jour. Ton futur toi te remerciera.'},
    {i:'💰', t:'Argent', m:'Fais le point sur ton solde du jour. Sois honnête avec toi-même.'},
    {i:'🎯', t:'Objectif', m:'Ton objectif du mois avance-t-il ? Sinon, décide d\'un plan.'},
    {i:'💭', t:'Rêves', m:'Un rêve sans plan reste un rêve. Pense à ton plan ce soir.'},
    {i:'🌜', t:'Douce nuit', m:'Laisse tes soucis au placard. Ils seront là demain.'},
    {i:'💪', t:'Fierté', m:'Tu as fait de ton mieux aujourd\'hui. C\'est ce qui compte.'},
    {i:'🕯️', t:'Lumière', m:'Même petit, ton impact est réel. Continue.'},
    {i:'🎓', t:'Leçon', m:'Quelle leçon retiens-tu de ta journée ? Note-la.'},
    {i:'💼', t:'Business', m:'As-tu pensé à ton business aujourd\'hui ? Sinon, 5 minutes avant de dormir.'},
    {i:'🌊', t:'Lâcher-prise', m:'Ce qui est fait est fait. Ce qui vient viendra. Repose-toi.'},
    {i:'🎬', t:'Bilan vidéo', m:'Si tu devais résumer ta journée en 30 secondes, tu dirais quoi ?'},
    {i:'🌟', t:'Étoile', m:'Même les nuages cachent le soleil. Il revient toujours. Toi aussi.'},
    {i:'😌', t:'Détente', m:'Pas d\'écran 1h avant de dormir. Ton cerveau te remerciera.'},
    {i:'🎯', t:'Cap', m:'Garde le cap. Même lent, tu avances.'},
    {i:'🚀', t:'Demain', m:'Demain sera meilleur. Prépare-toi, champion.'},
    {i:'💎', t:'Valeur', m:'Ce que tu as fait aujourd\'hui a de la valeur. Ne l\'oublie pas.'},
    {i:'📖', t:'Histoire', m:'Tu écris ton histoire chaque jour. Ce soir, relis le chapitre.'},
    {i:'🌙', t:'Nuit', m:'Bonne nuit, futur(e) grand(e). Dors bien.'},
    {i:'💤', t:'Sommeil', m:'8 heures de sommeil = cerveau au top demain. Priorité.'},
    {i:'🎁', t:'Cadeau', m:'Aujourd\'hui était un cadeau. Demain en sera un autre.'},
    {i:'🔥', t:'Flamme', m:'Garde la flamme allumée. Le succès se construit dans le temps.'},
    {i:'💪', t:'Force', m:'Tu es plus fort(e) que tu ne le penses. Repose-toi en paix.'},
    {i:'🌠', t:'Étoiles', m:'Regarde les étoiles si tu peux. Elles te rappellent ton immensité.'},
    {i:'🎯', t:'Focus', m:'Demain matin, réveille-toi avec ton objectif en tête.'},
    {i:'💭', t:'Vision', m:'Visualise ta réussite. Ton esprit attire ce que tu imagines.'},
    {i:'🌿', t:'Paix', m:'Termine la journée en paix avec toi-même. Tu le mérites.'},
    {i:'💎', t:'Précieux', m:'Chaque heure de ta vie est précieuse. Pardonne-toi les erreurs.'},
    {i:'🌟', t:'Demain', m:'Un nouveau jour, une nouvelle chance. À demain, champion.'}
  ]
};

function getNotificationMessage(type){
  const dayIndex = Math.floor(Date.now() / 86400000);
  const messages = NOTIF_MESSAGES[type];
  return messages[dayIndex % messages.length];
}

function isNotifEnabled(){
  return localStorage.getItem('notif_enabled') === '1';
}

async function toggleNotifications(){
  if(isNotifEnabled()){
    // Désactive
    localStorage.removeItem('notif_enabled');
    try {
      const OneSignal = window.OneSignal;
      if(OneSignal) await OneSignal.User.PushSubscription.optOut();
    } catch(e){ console.warn(e); }
    updateNotifButton();
    return;
  }

  // Active
  if(!('Notification' in window)){
    document.getElementById('notifStatus').textContent = '❌ Non supporté sur ce navigateur';
    return;
  }

  const permission = await Notification.requestPermission();
  if(permission !== 'granted'){
    document.getElementById('notifStatus').textContent = '❌ Permission refusée. Autorise dans les réglages du navigateur.';
    return;
  }

  try {
    const OneSignal = window.OneSignal;
    if(OneSignal){
      await OneSignal.User.PushSubscription.optIn();
      // Identifie l'utilisateur avec son email
      const user = await getCurrentUser();
      if(user && user.email){
        await OneSignal.login(user.email);
      }
    }
    localStorage.setItem('notif_enabled', '1');
    updateNotifButton();

    new Notification('🔥 Notifications activées', {
      body: 'Tu recevras tes rappels sur tous tes appareils, même app fermée 💪'
    });
  } catch(e){
    console.error('OneSignal error:', e);
    document.getElementById('notifStatus').textContent = '❌ Erreur : ' + e.message;
  }
}

async function updateNotifButton(){
  const btn = document.getElementById('notifBtn');
  const status = document.getElementById('notifStatus');
  if(!btn) return;
  if(isNotifEnabled()){
    btn.classList.add('active');
    btn.textContent = '✅ Notifications activées';
    if(status) status.textContent = 'Tu recevras tes rappels sur tous tes appareils';
    // Lie l'utilisateur à OneSignal au démarrage
    try {
      const OneSignal = window.OneSignal;
      const user = await getCurrentUser();
      if(OneSignal && user && user.email){
        await OneSignal.login(user.email);
      }
    } catch(e){ console.warn(e); }
  } else {
    btn.classList.remove('active');
    btn.textContent = '🔔 Activer les notifications';
    if(status) status.textContent = '';
  }
}

function testerNotification(){
  if(!isNotifEnabled()){
    alert('Active d\'abord les notifications');
    return;
  }
  const msg = getNotificationMessage('midday');
  new Notification(msg.i + ' ' + msg.t, { body: msg.m });
}

function checkAutomaticNotifications(){
  if(!isNotifEnabled()) return;
  if(!('Notification' in window) || Notification.permission !== 'granted') return;

  const now = new Date();
  const hh  = now.getHours();
  const mm  = now.getMinutes();
  const todayKey = now.toISOString().slice(0,10);

  if(hh === 8 && mm >= 0 && mm < 5){
    const key = `notif_morning_${todayKey}`;
    if(!localStorage.getItem(key)){
      const msg = getNotificationMessage('morning');
      new Notification(msg.i + ' ' + msg.t, { body: msg.m });
      localStorage.setItem(key, '1');
    }
  }
  if(hh === 13 && mm >= 0 && mm < 5){
    const key = `notif_midday_${todayKey}`;
    if(!localStorage.getItem(key)){
      const msg = getNotificationMessage('midday');
      new Notification(msg.i + ' ' + msg.t, { body: msg.m });
      localStorage.setItem(key, '1');
    }
  }
  if(hh === 20 && mm >= 0 && mm < 5){
    const key = `notif_evening_${todayKey}`;
    if(!localStorage.getItem(key)){
      const msg = getNotificationMessage('evening');
      new Notification(msg.i + ' ' + msg.t, { body: msg.m });
      localStorage.setItem(key, '1');
    }
  }
}

function enableNotifications(){
  toggleNotifications();
}

function checkDailyReminders(){
  if(!('Notification' in window) || Notification.permission !== 'granted') return;
  if(!isNotifEnabled()) return;

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
  refreshAll();
}
async function delReminder(id){
  const ok = await dbDelete('reminders', id);
  if(!ok) return;
  reminders = reminders.filter(r => r.id !== id);
  refreshAll();
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

setInterval(() => {
  checkAutomaticNotifications();
  checkDailyReminders();
}, 60000);

// ============================================================
// MODULE IA — ANALYSE SYNCHRONISÉE (Supabase + local)
// ============================================================

function toggleAiConfig(){
  const body  = document.getElementById('aiConfigBody');
  const arrow = document.getElementById('aiConfigArrow');
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  arrow.classList.toggle('open', !isOpen);
}

// Convertit le markdown brut en HTML propre avec cartes numérotées
function formatAnalysisText(text){
  if(!text) return '<div class="empty">Pas de contenu</div>';

  let safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

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
        sections.push({
          num: currentSection,
          content: currentContent.join('\n').trim()
        });
      }
      currentSection = match[1];
      currentContent = [match[2]];
    } else {
      currentContent.push(line);
    }
  });

  if(currentSection !== null || currentContent.length > 0){
    sections.push({
      num: currentSection,
      content: currentContent.join('\n').trim()
    });
  }

  sections = sections.filter(s => s.content);

  if(sections.length === 0){
    sections = [{num: null, content: safe}];
  }

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

// Charge l'analyse sauvegardée depuis Supabase
async function loadSavedAnalysis(){
  try {
    const user = await getCurrentUser();
    if(!user) return;

    const { data, error } = await sb
      .from('user_settings')
      .select('ai_analysis, ai_analysis_date')
      .eq('user_id', user.id)
      .maybeSingle();

    if(error){ console.warn('loadSavedAnalysis:', error.message); return; }
    if(!data || !data.ai_analysis) return;

    localStorage.setItem('ai_last_analysis', data.ai_analysis);
    localStorage.setItem('ai_last_analysis_date', data.ai_analysis_date || '');

    const html = formatAnalysisText(data.ai_analysis);
    document.getElementById('aiOutput').innerHTML = html;
    document.getElementById('aiCopyBtn').disabled = false;
    document.getElementById('aiPdfBtn').disabled = false;
    document.getElementById('aiClearBtn').disabled = false;

    if(data.ai_analysis_date){
      const dateEl = document.getElementById('aiLastUpdate');
      dateEl.textContent = '🕐 Dernière analyse : ' + data.ai_analysis_date;
      dateEl.classList.add('visible');
    }
  } catch(e){
    console.warn('loadSavedAnalysis error:', e);
  }
}

// Sauvegarde l'analyse dans Supabase + cache local
async function saveAnalysis(text){
  const dateStr = new Date().toLocaleString('fr-FR', {
    day:'2-digit', month:'long', year:'numeric',
    hour:'2-digit', minute:'2-digit'
  });

  localStorage.setItem('ai_last_analysis', text);
  localStorage.setItem('ai_last_analysis_date', dateStr);

  try {
    const user = await getCurrentUser();
    if(!user) return;

    const { error } = await sb
      .from('user_settings')
      .upsert(
        { user_id: user.id, ai_analysis: text, ai_analysis_date: dateStr },
        { onConflict: 'user_id' }
      );

    if(error) console.warn('saveAnalysis Supabase:', error.message);
  } catch(e){
    console.warn('saveAnalysis error:', e);
  }
}

// Efface l'analyse
async function clearAnalysis(){
  if(!confirm('Effacer l\'analyse ?')) return;

  localStorage.removeItem('ai_last_analysis');
  localStorage.removeItem('ai_last_analysis_date');

  try {
    const user = await getCurrentUser();
    if(user){
      await sb.from('user_settings')
        .update({ ai_analysis: null, ai_analysis_date: null })
        .eq('user_id', user.id);
    }
  } catch(e){
    console.warn('clearAnalysis error:', e);
  }

  document.getElementById('aiOutput').innerHTML =
    '<div class="empty">Clique sur <strong>Analyser</strong> pour obtenir ton bilan personnalisé.</div>';
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

  if(!window.jspdf || !window.jspdf.jsPDF){
    alert('La bibliothèque PDF n\'est pas encore chargée. Attends 2 secondes et réessaie.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFillColor(108, 140, 255);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text("Analyse financière IA", 14, 16);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if(date) doc.text(date, 14, 24);

  const cleanText = text.replace(/\*\*/g, '');

  doc.setTextColor(40, 40, 40);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const splitText = doc.splitTextToSize(cleanText, 180);
  let y = 42;
  const pageHeight = doc.internal.pageSize.height - 15;

  splitText.forEach(line => {
    if(y > pageHeight){
      doc.addPage();
      y = 15;
    }
    doc.text(line, 14, y);
    y += 6;
  });

  const pageCount = doc.internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++){
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `Page ${i} / ${pageCount}  —  Ma Super App`,
      14,
      doc.internal.pageSize.height - 8
    );
  }

  doc.save(`analyse-ia-${todayStr()}.pdf`);
}

// ============================================================
// CONFIG IA
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
      `- ${c.name}: ${Math.round(c.current)}/${Math.round(c.goal)} (${((c.current/c.goal)*100).toFixed(0)}%)`
    ));
  }
  if(shoots.length){
    const ym = monthKey();
    const ms = shoots.filter(s => s.date && s.date.startsWith(ym));
    lines.push(`Séances photo ce mois: ${ms.length}`);
    const r = ms.filter(s => s.payment === 'paye').reduce((a,b) => a + Number(b.price), 0);
    lines.push(`Revenus photo: ${Math.round(r)}`);
    const types = {};
    shoots.forEach(sh => types[sh.type] = (types[sh.type]||0)+1);
    lines.push('Types de séances: ' + Object.entries(types).map(([t,c])=>`${t}=${c}`).join(', '));
  }
  if(clients.length){
    lines.push(`Clients: ${clients.length}`);
    const cities = [...new Set(clients.map(c => c.city).filter(x => x))];
    if(cities.length) lines.push(`Villes clients: ${cities.join(', ')}`);
  }
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
  out.innerHTML = '<div class="empty">⏳ Analyse en cours... (5 à 15 secondes)</div>';

  const summary = buildSummary();
  const prompt = `Tu es un conseiller financier personnel, direct et bienveillant. Voici le résumé :

${summary}

Analyse en français, en 8 points numérotés. Chaque point DOIT commencer par son numéro suivi d'un titre court puis deux points :
1. Diagnostic global
2. Taux d'épargne
3. Poste à surveiller
4. Prévision fin de mois
5. Combien épargner ce mois
6. Une idée de business adaptée
7. Action immédiate aujourd'hui
8. Encouragement personnalisé

Concret, chiffré, pas de blabla. N'utilise PAS d'astérisques. Écris en français simple.`;

  try {
    const text = await callAI(prompt);
    if(!text || !text.trim()){
      out.innerHTML = '<div class="empty">❌ Pas de réponse de l\'IA. Réessaie.</div>';
      return;
    }

    await saveAnalysis(text);
    out.innerHTML = formatAnalysisText(text);

    document.getElementById('aiCopyBtn').disabled = false;
    document.getElementById('aiPdfBtn').disabled = false;
    document.getElementById('aiClearBtn').disabled = false;

    const dateEl = document.getElementById('aiLastUpdate');
    dateEl.textContent = '🕐 Dernière analyse : ' + new Date().toLocaleString('fr-FR', {
      day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'
    });
    dateEl.classList.add('visible');

  } catch(e){
    out.innerHTML = `<div class="empty">❌ ${e.message}</div>`;
  }
}

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
  setTimeout(() => {
    checkAutomaticNotifications();
    checkDailyReminders();
  }, 2000);
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