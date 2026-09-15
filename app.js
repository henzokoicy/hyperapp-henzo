// ============================================================
// APP.JS — Cœur de l'app + connexion Supabase
// ============================================================

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
// VARIABLES GLOBALES
// ============================================================
let txs         = [];
let coffres     = [];
let clients     = [];
let shoots      = [];
let reminders   = [];
let savedIdeas  = [];

let currentType       = 'depense';
let editingCoffreId   = null;
let depositingCoffreId = null;
let editingShootId    = null;
let editingClientId   = null;

// ============================================================
// OUTILS
// ============================================================
const fmt = n => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' ' + CURRENCY;
const todayStr = () => new Date().toISOString().slice(0,10);
const monthKey = d => (d || todayStr()).slice(0,7);

// ============================================================
// AUTHENTIFICATION
// ============================================================
async function getCurrentUser(){
  const { data: { session } } = await sb.auth.getSession();
  return session?.user || null;
}

async function handleLogin(){
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const msg      = document.getElementById('loginMessage');
  msg.style.color = 'var(--red)';
  msg.textContent = '';
  if(!email || !password){ msg.textContent = 'Remplis tous les champs.'; return; }
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if(error){ msg.textContent = error.message; return; }
  await startApp();
}

async function handleSignUp(){
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const msg      = document.getElementById('loginMessage');
  msg.style.color = 'var(--red)';
  msg.textContent = '';
  if(!email || !password){ msg.textContent = 'Remplis tous les champs.'; return; }
  if(password.length < 6){ msg.textContent = 'Mot de passe : 6 caractères minimum.'; return; }
  const { data, error } = await sb.auth.signUp({ email, password });
  if(error){ msg.textContent = error.message; return; }
  if(data.session){ await startApp(); }
  else {
    msg.style.color = 'var(--green)';
    msg.textContent = '✅ Compte créé ! Vérifie ton email pour confirmer.';
  }
}

async function handleLogout(){
  if(!confirm('Se déconnecter ?')) return;
  // On garde l'onglet actif pour la prochaine connexion
  await sb.auth.signOut();
  location.reload();
}

// ============================================================
// CHARGEMENT DES DONNÉES
// ============================================================
async function loadAllData(){
  const user = await getCurrentUser();
  if(!user) return;
  const [txRes, goalRes, clientRes, shootRes, reminderRes, ideaRes] = await Promise.all([
    sb.from('transactions').select('*').order('date', {ascending:false}),
    sb.from('goals').select('*').order('created_at', {ascending:false}),
    sb.from('clients').select('*').order('created_at', {ascending:false}),
    sb.from('shoots').select('*').order('date', {ascending:false}),
    sb.from('reminders').select('*').order('created_at', {ascending:true}),
    sb.from('saved_ideas').select('*').order('created_at', {ascending:false})
  ]);
  txs        = txRes.data       || [];
  coffres    = goalRes.data     || [];
  clients    = clientRes.data   || [];
  shoots     = shootRes.data    || [];
  reminders  = reminderRes.data || [];
  savedIdeas = ideaRes.data     || [];
}

// ============================================================
// HELPERS SUPABASE
// ============================================================
async function dbInsert(table, data){
  const user = await getCurrentUser();
  if(!user) return null;
  const { data: result, error } = await sb.from(table)
    .insert({ ...data, user_id: user.id }).select().single();
  if(error){ console.error(error); alert('Erreur : ' + error.message); return null; }
  return result;
}

async function dbUpdate(table, id, data){
  const { data: result, error } = await sb.from(table)
    .update(data).eq('id', id).select().single();
  if(error){ console.error(error); alert('Erreur : ' + error.message); return null; }
  return result;
}

async function dbDelete(table, id){
  const { error } = await sb.from(table).delete().eq('id', id);
  if(error){ console.error(error); alert('Erreur : ' + error.message); return false; }
  return true;
}

// ============================================================
// DÉMARRAGE
// ============================================================
async function startApp(){
  document.body.classList.remove('logged-out');
  document.getElementById('today').textContent =
    new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  await loadAllData();
  init();
  // Restaure le dernier onglet visité (après le rendu initial)
  restoreLastTab();
}

function showLogin(){
  document.body.classList.add('logged-out');
}

// ============================================================
// NAVIGATION + MÉMORISATION DE L'ONGLET
// ============================================================
function showTab(name, btn){
  // Sauvegarde l'onglet actif pour le restaurer après actualisation
  localStorage.setItem('active_tab', name);

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  if(btn) btn.classList.add('active');

  const titres = {
    dash:'💰 Intelligence Financière',
    historique:'📜 Historique',
    objectifs:'🎯 Mes Objectifs',
    photo:'📸 Photo & Clients',
    business:'💡 Business',
    motiv:'🔥 Motivation',
    ia:'🤖 Analyse IA'
  };
  document.getElementById('headerTitle').textContent = titres[name] || 'Ma Super App';

  // Rendus spécifiques à certains onglets
  if(name === 'motiv') newQuote();
  if(name === 'dash' && typeof renderDashboard === 'function') renderDashboard();
  if(name === 'historique' && typeof populateHistFilters === 'function'){
    populateHistFilters();
    if(typeof renderHistory === 'function') renderHistory();
  }
}

// Restaure le dernier onglet actif après un rafraîchissement
function restoreLastTab(){
  const saved = localStorage.getItem('active_tab');
  if(!saved || saved === 'dash') return; // "dash" est déjà actif par défaut

  // Trouve le bouton correspondant dans la barre d'onglets
  const buttons = document.querySelectorAll('.tabs button');
  for(const btn of buttons){
    const onclick = btn.getAttribute('onclick') || '';
    if(onclick.includes(`'${saved}'`)){
      showTab(saved, btn);
      return;
    }
  }
}

// ============================================================
// TRANSACTIONS
// ============================================================
function setType(t){
  currentType = t;
  document.getElementById('btnRevenu').classList.toggle('active', t==='revenu');
  document.getElementById('btnDepense').classList.toggle('active', t==='depense');
  document.getElementById('category').innerHTML =
    CATEGORIES[t].map(c => `<option>${c}</option>`).join('');
}

function openModal(){
  document.getElementById('modalBg').classList.add('show');
  document.getElementById('date').value   = todayStr();
  document.getElementById('amount').value = '';
  document.getElementById('note').value   = '';
  setType('depense');
  setTimeout(() => document.getElementById('amount').focus(), 200);
}
function closeModal(){ document.getElementById('modalBg').classList.remove('show'); }

async function saveTx(){
  const amount = parseFloat(document.getElementById('amount').value);
  if(!amount || amount <= 0){ alert("Montant invalide"); return; }
  const result = await dbInsert('transactions', {
    type: currentType,
    amount,
    category: document.getElementById('category').value,
    note:     document.getElementById('note').value.trim(),
    date:     document.getElementById('date').value || todayStr()
  });
  if(!result) return;
  txs.unshift(result);
  closeModal();
  refreshAll();
}

async function delTx(id){
  if(!confirm("Supprimer ?")) return;
  const ok = await dbDelete('transactions', id);
  if(!ok) return;
  txs = txs.filter(t => t.id !== id);
  refreshAll();
}

// ============================================================
// MOTEUR D'ANALYSE
// ============================================================
function computeStats(){
  const ym = monthKey();
  const monthTx   = txs.filter(t => t.date.startsWith(ym));
  const totalIn   = monthTx.filter(t => t.type==='revenu').reduce((s,t) => s + Number(t.amount), 0);
  const totalOut  = monthTx.filter(t => t.type==='depense').reduce((s,t) => s + Number(t.amount), 0);
  const bal       = totalIn - totalOut;
  const savingsRate = totalIn > 0 ? (bal / totalIn) : 0;

  const now         = new Date();
  const dayOfMonth  = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const monthProgress = dayOfMonth / daysInMonth;
  const projectedOut  = monthProgress > 0 ? totalOut / monthProgress : 0;
  const projectedBal  = totalIn - projectedOut;

  const byCat = {};
  monthTx.filter(t => t.type==='depense').forEach(t => {
    byCat[t.category] = (byCat[t.category] || 0) + Number(t.amount);
  });
  const sortedCats = Object.entries(byCat).sort((a,b) => b[1] - a[1]);
  const avgPerDay = dayOfMonth > 0 ? totalOut / dayOfMonth : 0;

  const prevMonth = new Date(now.getFullYear(), now.getMonth()-1, 1).toISOString().slice(0,7);
  const prevTx    = txs.filter(t => t.date.startsWith(prevMonth));
  const prevOut   = prevTx.filter(t => t.type==='depense').reduce((s,t) => s + Number(t.amount), 0);
  const prevIn    = prevTx.filter(t => t.type==='revenu').reduce((s,t) => s + Number(t.amount), 0);

  return { ym, monthTx, totalIn, totalOut, bal, savingsRate,
    projectedOut, projectedBal, sortedCats, avgPerDay,
    prevOut, prevIn, dayOfMonth, daysInMonth };
}

function buildInsights(){
  const s   = computeStats();
  const ins = [];
  if(s.monthTx.length === 0){
    return ['<div class="empty">Ajoute des transactions pour voir l\'analyse</div>'];
  }
  if(s.totalIn > 0){
    const pct = (s.savingsRate * 100).toFixed(0);
    if(s.savingsRate >= SAVINGS_TARGET){
      ins.push({cls:'good', t:'✅ Taux d\'épargne sain',
        m:`Tu épargnes ${pct}% de tes revenus ce mois. Excellent.`});
    } else if(s.savingsRate >= 0){
      const missing = (s.totalIn * SAVINGS_TARGET) - (s.totalIn * s.savingsRate);
      ins.push({cls:'warn', t:'⚠ Épargne un peu faible',
        m:`${pct}% épargné. Objectif ${(SAVINGS_TARGET*100)}%. Il te manque ${fmt(missing)} ce mois.`});
    } else {
      ins.push({cls:'bad', t:'🚨 Dépenses > Revenus',
        m:`Déficit de ${fmt(Math.abs(s.bal))} ce mois.`});
    }
  }
  if(s.dayOfMonth >= 3 && s.totalOut > 0 && s.projectedBal < 0){
    ins.push({cls:'bad', t:'📉 Prévision négative',
      m:`Au rythme actuel, tu finiras le mois à ${fmt(s.projectedBal)}.`});
  }
  if(s.sortedCats[0] && s.totalOut > 0){
    const pct = (s.sortedCats[0][1] / s.totalOut * 100).toFixed(0);
    ins.push({cls: pct > 40 ? 'warn' : '', t:'🎯 Poste principal',
      m:`"${s.sortedCats[0][0]}" : ${fmt(s.sortedCats[0][1])} (${pct}%).`});
  }
  if(s.prevOut > 0){
    const diff = ((s.totalOut - s.prevOut) / s.prevOut) * 100;
    if(diff > 15) ins.push({cls:'warn', t:'📈 Dépenses en hausse',
      m:`+${diff.toFixed(0)}% vs mois dernier.`});
    else if(diff < -15) ins.push({cls:'good', t:'📉 Dépenses en baisse',
      m:`${diff.toFixed(0)}% vs mois dernier.`});
  }
  if(s.totalIn > 0){
    ins.push({cls:'', t:'💡 Recommandation',
      m:`Mets ${fmt(s.totalIn * SAVINGS_TARGET)} (${(SAVINGS_TARGET*100)}%) dans un objectif.`});
  }
  coffres.forEach(c => {
    const rest = Number(c.goal) - Number(c.current);
    if(rest <= 0) return;
    if(c.target_date){
      const days = Math.ceil((new Date(c.target_date) - new Date()) / 86400000);
      if(days > 0 && days <= 90){
        ins.push({cls:'warn', t:`⏱ "${c.name}"`,
          m:`Reste ${fmt(rest)} en ${days} jours. Soit ${fmt(rest/days)}/jour.`});
      }
    }
  });
  return ins.map(i => `<div class="insight ${i.cls}">
    <div class="title">${i.t}</div>
    <div>${i.m}</div>
  </div>`);
}

// ============================================================
// RENDU PRINCIPAL
// ============================================================
function render(){
  renderDashboard();
}

// ============================================================
// RENDU COMPLET DU TABLEAU DE BORD
// ============================================================
function renderDashboard(){
  const s = computeStats();

  const balEl = document.getElementById('balance');
  balEl.textContent = fmt(s.bal);
  balEl.className = 'balance ' + (s.bal >= 0 ? 'pos' : 'neg');
  document.getElementById('totalIn').textContent     = fmt(s.totalIn);
  document.getElementById('totalOut').textContent    = fmt(s.totalOut);
  document.getElementById('savingsRate').textContent = (s.savingsRate * 100).toFixed(0) + '%';

  if(typeof renderOverview === 'function')        renderOverview();
  if(typeof renderHealthScore === 'function')     renderHealthScore();
  if(typeof renderRevDepDonut === 'function')     renderRevDepDonut();
  if(typeof renderShootTypesChart === 'function') renderShootTypesChart();
  if(typeof renderBars6m === 'function')          renderBars6m();

  document.getElementById('insights').innerHTML = buildInsights().join('');

  if(typeof renderSuggestions === 'function')     renderSuggestions();

  const cb = document.getElementById('catBreakdown');
  if(s.sortedCats.length === 0){
    cb.innerHTML = '<div class="empty">Aucune dépense ce mois</div>';
  } else {
    cb.innerHTML = s.sortedCats.map(([cat, amt]) => {
      const pct = s.totalOut > 0 ? (amt / s.totalOut * 100) : 0;
      return `<div class="cat-row">
        <div class="top"><span>${cat}</span><span>${fmt(amt)} · ${pct.toFixed(0)}%</span></div>
        <div class="bar"><div style="width:${pct}%"></div></div>
      </div>`;
    }).join('');
  }

  const tl = document.getElementById('txList');
  const sorted = [...s.monthTx].sort((a,b) => b.date.localeCompare(a.date));
  if(sorted.length === 0){
    tl.innerHTML = '<div class="empty">Aucune transaction ce mois</div>';
  } else {
    tl.innerHTML = sorted.map(t => {
      const d    = new Date(t.date).toLocaleDateString('fr-FR', {day:'2-digit', month:'short'});
      const sign = t.type === 'revenu' ? '+' : '−';
      const cls  = t.type === 'revenu' ? 'pos' : 'neg';
      return `<div class="tx">
        <div class="left">
          <div class="cat">${t.category}</div>
          <div class="note">${d}${t.note ? ' · ' + t.note : ''}</div>
        </div>
        <div style="display:flex;align-items:center;gap:4px">
          <div class="amt ${cls}">${sign}${fmt(t.amount)}</div>
          <button class="del" onclick="delTx(${t.id})">×</button>
        </div>
      </div>`;
    }).join('');
  }
}