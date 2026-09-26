// ============================================================
// COACH.JS - Coach personnel intelligent de Henzo
// Analyse l'app, propose des actions, guide étape par étape
// ============================================================

const COACH_LAST_OPEN_KEY = 'coach_last_open_date';
const COACH_IGNORED_TODAY = 'coach_ignored_today';
const COACH_DONE_TODAY = 'coach_done_today';

let coachSuggestions = [];
let coachCurrentSuggestion = null;
let coachCurrentStepIndex = 0;
let coachAILoading = false;

// ============================================================
// ANALYSE GLOBALE
// ============================================================
function coachAnalyze(){
  const suggestions = [];
  try { suggestions.push(...coachAnalyzeFinances()); } catch(e){ console.warn('coachFinances:', e); }
  try { suggestions.push(...coachAnalyzeClients()); } catch(e){ console.warn('coachClients:', e); }
  try { suggestions.push(...coachAnalyzeGoals()); } catch(e){ console.warn('coachGoals:', e); }
  try { suggestions.push(...coachAnalyzeNetwork()); } catch(e){ console.warn('coachNetwork:', e); }

  const order = { urgent: 0, warn: 1, info: 2, good: 3 };
  suggestions.sort((a, b) => (order[a.severity] || 9) - (order[b.severity] || 9));

  // Marquer comme ignorées si déjà dit non aujourd'hui
  const ignoredToday = JSON.parse(localStorage.getItem(COACH_IGNORED_TODAY) || '[]');
  return suggestions.filter(s => !ignoredToday.includes(s.id));
}

// ============================================================
// ANALYSE : FINANCES
// ============================================================
function coachAnalyzeFinances(){
  const out = [];
  const s = computeStats();

  // 1. Solde négatif
  if(s.bal < 0){
    out.push({
      id: 'neg_balance',
      severity: 'urgent',
      icon: '🚨',
      title: 'Solde négatif ce mois',
      subtitle: `Tu es à ${fmt(s.bal)}. On regarde ensemble ?`,
      steps: [
        {
          title: 'Comprendre le déficit',
          text: `Tu as dépensé ${fmt(Math.abs(s.bal))} de plus que tes revenus ce mois. Ce n'est pas grave, mais il faut voir pourquoi.`,
          action: { label: '📊 Voir mon historique', fn: () => { coachClose(); showTab('historique', null); } }
        },
        {
          title: 'Identifier le coupable',
          text: s.sortedCats[0] ? `Ton poste principal est "${s.sortedCats[0][0]}" : ${fmt(s.sortedCats[0][1])}. C'est là qu'il faut regarder en priorité.` : 'Ajoute tes dépenses pour identifier le poste principal.',
          action: { label: '💸 Voir les dépenses', fn: () => { coachClose(); showTab('historique', null); } }
        },
        {
          title: 'Astuce',
          text: 'Pour les 7 prochains jours, note TOUTES tes dépenses, même 100 FCFA. Tu verras mieux où l\'argent part.',
          action: { label: '✅ J\'ai compris', fn: () => coachNextStep() }
        }
      ]
    });
  }

  // 2. Taux d'épargne trop bas
  if(s.totalIn > 0 && s.savingsRate < 0.1 && s.bal > 0){
    out.push({
      id: 'low_savings',
      severity: 'warn',
      icon: '💰',
      title: 'Ton épargne est faible',
      subtitle: `Tu épargnes seulement ${(s.savingsRate*100).toFixed(0)}%. L'objectif est 20%.`,
      steps: [
        {
          title: 'Voir le potentiel',
          text: `Ce mois tu as gagné ${fmt(s.totalIn)}. Avec 20%, tu devrais mettre ${fmt(s.totalIn * 0.2)} de côté.`,
          action: { label: '🎯 Créer un objectif', fn: () => { coachClose(); showTab('objectifs', null); setTimeout(() => openCoffreModal(), 400); } }
        },
        {
          title: 'Appliquer la règle',
          text: 'Dès que tu reçois un paiement, mets 20% en épargne AVANT de dépenser le reste. C\'est la règle du "paie-toi en premier".',
          action: { label: '✅ Compris', fn: () => coachNextStep() }
        }
      ]
    });
  }

  // 3. Aucune transaction ce mois
  if(s.monthTx.length === 0){
    out.push({
      id: 'no_tx',
      severity: 'info',
      icon: '📝',
      title: 'Aucune transaction ce mois',
      subtitle: 'Ajoute tes entrées et sorties pour un meilleur suivi.',
      steps: [
        {
          title: 'Commencer simplement',
          text: 'Ajoute au moins tes 3 dernières entrées d\'argent. Ensuite les dépenses. Ne cherche pas la perfection.',
          action: { label: '💰 Ajouter une entrée', fn: () => { coachClose(); openRevenueModal(); } }
        }
      ]
    });
  }

  return out;
}

// ============================================================
// ANALYSE : CLIENTS & SÉANCES
// ============================================================
function coachAnalyzeClients(){
  const out = [];
  const now = new Date();

    // 1. Séances avec reste à payer (acomptes déduits)
  const unpaid = (shoots || []).filter(s => {
    if(!s || s.status === 'annule') return false;
    const prix = Number(s.price || 0);
    const recu = Number(s.montant_recu || 0);
    return prix > 0 && recu < prix;
  });
  if(unpaid.length > 0){
    const total = unpaid.reduce((a, b) => {
      const prix = Number(b.price || 0);
      const recu = Number(b.montant_recu || 0);
      return a + Math.max(0, prix - recu);
    }, 0);
    out.push({
      id: 'unpaid_shoots',
      severity: 'urgent',
      icon: '💸',
      title: `${unpaid.length} séance${unpaid.length > 1 ? 's' : ''} impayée${unpaid.length > 1 ? 's' : ''}`,
      subtitle: `${fmt(total)} à encaisser. On relance ?`,
      steps: unpaid.slice(0, 5).map(sh => {
  const client = sh.client_id ? (clients || []).find(c => c.id === sh.client_id) : null;
  const clientName = client ? client.name : 'ce client';
  const phone = client && client.phone ? client.phone.replace(/[^0-9]/g, '') : '';
  const fullPhone = phone.startsWith('225') ? phone : '225' + phone;
  const prix = Number(sh.price || 0);
  const recu = Number(sh.montant_recu || 0);
  const reste = Math.max(0, prix - recu);
  const msg = `Bonjour ${clientName} 👋,\n\nJ'espère que tu vas bien. Je voulais prendre des nouvelles concernant ton shooting "${sh.type}". Il reste ${fmt(reste)} à régler. Veux-tu qu'on en parle ? 📸`;
        const url = phone
          ? `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`
          : `https://wa.me/?text=${encodeURIComponent(msg)}`;
        return {
          title: `Relancer ${clientName}`,
          text: `Prestation "${sh.type}" · ${fmt(sh.price)}. Un petit message WhatsApp peut débloquer ça.`,
          action: { label: '💬 Ouvrir WhatsApp', fn: () => { window.open(url, '_blank'); coachNextStep(); } }
        };
      })
    });
  }

  // 2. Clients pas contactés depuis 30 jours
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const staleClients = (clients || []).filter(c => {
    const clientShoots = (shoots || []).filter(s => s.client_id === c.id);
    if(clientShoots.length === 0) return false;
    const lastShoot = clientShoots.sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
    return lastShoot && new Date(lastShoot.date) < thirtyDaysAgo;
  });
  if(staleClients.length > 0){
    out.push({
      id: 'stale_clients',
      severity: 'info',
      icon: '📞',
      title: `${staleClients.length} client${staleClients.length > 1 ? 's' : ''} à relancer`,
      subtitle: 'Pas de nouvelles depuis plus de 30 jours.',
      steps: staleClients.slice(0, 3).map(c => ({
        title: `Reprendre contact avec ${c.name}`,
        text: `Un client satisfait = 3 recommandations. Un petit "bonjour, comment vas-tu ?" peut relancer la relation.`,
        action: {
          label: '💬 Envoyer un message',
          fn: () => {
            const phone = c.phone ? c.phone.replace(/[^0-9]/g, '') : '';
            const fullPhone = phone.startsWith('225') ? phone : '225' + phone;
            const msg = `Bonjour ${c.name} 👋,\n\nJ'espère que tu vas bien ! Je pensais à toi, et je me disais qu'on pourrait peut-être refaire un shooting ensemble bientôt 📸\n\nDes nouvelles idées en tête ?\n\nHENZO PHOTOGRAPHIE`;
            const url = phone ? `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
            window.open(url, '_blank');
            coachNextStep();
          }
        }
      }))
    });
  }

  // 3. Séances à venir dans les 3 jours
  const soonShoots = (shoots || []).filter(s => {
    if(!s.date || s.status === 'annule') return false;
    const d = new Date(s.date);
    const diff = d - now;
    return diff > 0 && diff < 3 * 86400000;
  });
  if(soonShoots.length > 0){
    out.push({
      id: 'soon_shoots',
      severity: 'warn',
      icon: '📅',
      title: `${soonShoots.length} séance${soonShoots.length > 1 ? 's' : ''} bientôt`,
      subtitle: 'Prépare ton matériel dès maintenant.',
      steps: soonShoots.slice(0, 3).map(sh => {
        const d = new Date(sh.date);
        const dateStr = d.toLocaleDateString('fr-FR', {weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit'});
        return {
          title: `${sh.type} · ${dateStr}`,
          text: `Vérifie : batterie chargée ? Cartes SD vides ? Objectifs nettoyés ? Tenue prête ?`,
          action: { label: '✅ C\'est prêt', fn: () => coachNextStep() }
        };
      })
    });
  }

  // 4. Aucun client
  if((clients || []).length === 0){
    out.push({
      id: 'no_clients',
      severity: 'info',
      icon: '👥',
      title: 'Aucun client enregistré',
      subtitle: 'Commence par les 3 derniers clients que tu as eus.',
      steps: [
        {
          title: 'Ajouter tes clients',
          text: 'Un client enregistré = un client que tu peux relancer automatiquement plus tard.',
          action: { label: '➕ Ajouter un client', fn: () => { coachClose(); openClientModal(); } }
        }
      ]
    });
  }

  return out;
}

// ============================================================
// ANALYSE : OBJECTIFS
// ============================================================
function coachAnalyzeGoals(){
  const out = [];
  const now = new Date();

  // 1. Objectifs en retard
  const lateGoals = (coffres || []).filter(c => {
    if(!c.target_date) return false;
    const days = Math.ceil((new Date(c.target_date) - now) / 86400000);
    return days < 0 && Number(c.current) < Number(c.goal);
  });
  if(lateGoals.length > 0){
    out.push({
      id: 'late_goals',
      severity: 'urgent',
      icon: '⏰',
      title: `${lateGoals.length} objectif${lateGoals.length > 1 ? 's' : ''} en retard`,
      subtitle: 'On révise la date ou on accélère ?',
      steps: lateGoals.slice(0, 3).map(c => ({
        title: c.name,
        text: `La date était le ${new Date(c.target_date).toLocaleDateString('fr-FR')}. Il te reste ${fmt(Number(c.goal) - Number(c.current))} à trouver. Soit tu révisés la date, soit tu épargnes plus.`,
        action: { label: '✏️ Modifier', fn: () => { coachClose(); openCoffreModal(c.id); } }
      }))
    });
  }

  // 2. Objectifs proches du but (>= 85%)
  const nearGoals = (coffres || []).filter(c => {
    const pct = (Number(c.current) / Number(c.goal)) * 100;
    return pct >= 85 && pct < 100;
  });
  if(nearGoals.length > 0){
    out.push({
      id: 'near_goals',
      severity: 'good',
      icon: '🎯',
      title: `Tu es proche du but !`,
      subtitle: nearGoals.map(c => c.name).join(', '),
      steps: [
        {
          title: 'Allez, un dernier effort',
          text: `Il te reste très peu pour finir "${nearGoals[0].name}". Continue comme ça 💪`,
          action: { label: '🎯 Voir mes objectifs', fn: () => { coachClose(); showTab('objectifs', null); } }
        }
      ]
    });
  }

  // 3. Aucun objectif créé
  if((coffres || []).length === 0){
    out.push({
      id: 'no_goals',
      severity: 'info',
      icon: '🎯',
      title: 'Aucun objectif créé',
      subtitle: 'Commencer par un petit objectif de 50 000 FCFA.',
      steps: [
        {
          title: 'Créer ton premier objectif',
          text: 'Les gens qui écrivent leurs objectifs sont 42% plus susceptibles de les atteindre. Commence petit.',
          action: { label: '➕ Créer un objectif', fn: () => { coachClose(); showTab('objectifs', null); setTimeout(() => openCoffreModal(), 400); } }
        }
      ]
    });
  }

  return out;
}

// ============================================================
// ANALYSE : RÉSEAU (Inspirations + Notes)
// ============================================================
function coachAnalyzeNetwork(){
  const out = [];
  const now = new Date();

  // 1. Notes urgentes non traitées
  const urgentNotes = (notes || []).filter(n => !n.archived && (n.priority === 'urgente' || n.priority === 'haute'));
  if(urgentNotes.length > 0){
    out.push({
      id: 'urgent_notes',
      severity: 'warn',
      icon: '📌',
      title: `${urgentNotes.length} note${urgentNotes.length > 1 ? 's' : ''} urgente${urgentNotes.length > 1 ? 's' : ''}`,
      subtitle: 'À traiter aujourd\'hui.',
      steps: [
        {
          title: 'Voir tes notes',
          text: 'Ouvre tes notes pour les traiter une par une. Tu te sentiras mieux après.',
          action: { label: '📝 Voir mes notes', fn: () => { coachClose(); showTab('notes', null); } }
        }
      ]
    });
  }

  // 2. Inspirations non contactées
  const staleInsp = (inspirations || []).filter(i => {
    if(!i.created_at) return false;
    const days = (now - new Date(i.created_at)) / 86400000;
    return days > 30 && (i.phone || i.email);
  });
  if(staleInsp.length > 0){
    out.push({
      id: 'stale_insp',
      severity: 'info',
      icon: '💫',
      title: `${staleInsp.length} inspiration${staleInsp.length > 1 ? 's' : ''} à contacter`,
      subtitle: 'Ton réseau est précieux.',
      steps: staleInsp.slice(0, 2).map(i => ({
        title: `Contacter ${i.name}`,
        text: `Un petit message peut ouvrir des portes. Tu n'as rien à perdre.`,
        action: {
          label: '📞 Contact',
          fn: () => {
            if(i.phone){
              const phone = i.phone.replace(/[^0-9]/g, '');
              const fullPhone = phone.startsWith('225') ? phone : '225' + phone;
              const msg = `Bonjour ${i.name} 👋,\n\nJ'espère que tu vas bien ! Je suis Henzo, photographe en Côte d'Ivoire. J'admire ton travail et je voulais échanger quelques idées avec toi 📸`;
              window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, '_blank');
              coachNextStep();
            }
          }
        }
      }))
    });
  }

  return out;
}

// ============================================================
// UI : OUVRIR / FERMER
// ============================================================
function coachOpen(){
  coachSuggestions = coachAnalyze();
  coachCurrentSuggestion = null;
  coachCurrentStepIndex = 0;

  const modal = document.getElementById('coachModalBg');
  if(modal) modal.classList.add('show');

  coachRenderList();
  coachUpdateBadge();
}

function coachClose(){
  const modal = document.getElementById('coachModalBg');
  if(modal) modal.classList.remove('show');
  coachCurrentSuggestion = null;
  coachCurrentStepIndex = 0;
}

// ============================================================
// UI : LISTE DES SUGGESTIONS
// ============================================================
function coachRenderList(){
  const el = document.getElementById('coachContent');
  if(!el) return;

  if(coachSuggestions.length === 0){
    el.innerHTML = `
      <div style="text-align:center;padding:30px 10px">
        <div style="font-size:60px;margin-bottom:16px">🎉</div>
        <div style="font-size:18px;font-weight:700;margin-bottom:8px">Tout est au top !</div>
        <div style="color:var(--muted);font-size:14px;line-height:1.6">
          Tu n'as rien à corriger pour l'instant.<br>
          Reviens demain ou ajoute de nouvelles données.
        </div>
      </div>
    `;
    return;
  }

  const severityColors = {
    urgent: 'var(--red)',
    warn: 'var(--yellow)',
    info: 'var(--accent)',
    good: 'var(--green)'
  };

  el.innerHTML = `
    <div style="background:linear-gradient(135deg,rgba(107,142,255,.15),rgba(255,126,179,.08));border-radius:14px;padding:14px;margin-bottom:16px;border-left:3px solid var(--accent)">
      <div style="font-size:13px;color:var(--muted);margin-bottom:4px">🤖 Coach du jour</div>
      <div style="font-weight:700;font-size:15px">${coachSuggestions.length} point${coachSuggestions.length > 1 ? 's' : ''} à regarder</div>
    </div>

    ${coachSuggestions.map((s, i) => `
      <button onclick="coachStartSuggestion(${i})" style="
        width:100%;
        background:linear-gradient(160deg,var(--card2) 0%,var(--card) 100%);
        border:1px solid var(--border);
        border-left:3px solid ${severityColors[s.severity] || 'var(--accent)'};
        border-radius:12px;
        padding:14px;
        text-align:left;
        cursor:pointer;
        margin-bottom:10px;
        font-family:inherit;
        color:var(--text);
        display:flex;
        align-items:flex-start;
        gap:12px;
        transition:transform .2s ease, border-color .2s;
      " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
        <div style="font-size:24px;flex-shrink:0">${s.icon}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:14px;margin-bottom:4px">${s.title}</div>
          <div style="font-size:12px;color:var(--muted);line-height:1.4">${s.subtitle}</div>
        </div>
        <div style="color:${severityColors[s.severity] || 'var(--accent)'};font-size:20px;flex-shrink:0">›</div>
      </button>
    `).join('')}

    <button class="btn-ghost" style="width:100%;margin-top:14px" onclick="coachIgnoreAllToday()">
      😴 Ne plus me montrer aujourd'hui
    </button>
  `;
}

// ============================================================
// UI : ÉTAPE D'UNE SUGGESTION
// ============================================================
function coachStartSuggestion(index){
  coachCurrentSuggestion = coachSuggestions[index];
  coachCurrentStepIndex = 0;
  coachRenderStep();
}

function coachRenderStep(){
  const el = document.getElementById('coachContent');
  if(!el || !coachCurrentSuggestion) return;

  const s = coachCurrentSuggestion;
  const totalSteps = s.steps.length;
  const current = s.steps[coachCurrentStepIndex];
  if(!current){ coachCompleteSuggestion(); return; }

  const progress = ((coachCurrentStepIndex) / totalSteps) * 100;

  el.innerHTML = `
    <div style="margin-bottom:14px">
      <button onclick="coachBackToList()" style="
        background:none;border:none;color:var(--muted);
        font-size:13px;cursor:pointer;padding:4px 0;
        width:auto;font-family:inherit;
      ">← Retour</button>
    </div>

    <div style="background:linear-gradient(135deg,rgba(107,142,255,.15),rgba(255,126,179,.08));border-radius:14px;padding:16px;margin-bottom:16px;border-left:3px solid var(--accent)">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <span style="font-size:22px">${s.icon}</span>
        <span style="font-weight:700;font-size:15px">${s.title}</span>
      </div>
      <div style="font-size:12px;color:var(--muted)">Étape ${coachCurrentStepIndex + 1}/${totalSteps}</div>
      <div style="height:4px;background:var(--card2);border-radius:2px;margin-top:10px;overflow:hidden">
        <div style="height:100%;width:${progress}%;background:linear-gradient(90deg,var(--accent),var(--pink));transition:width .4s ease"></div>
      </div>
    </div>

    <div style="font-size:16px;font-weight:700;margin-bottom:10px">${current.title}</div>
    <div style="font-size:14px;line-height:1.6;color:var(--text);margin-bottom:20px;white-space:pre-wrap">${current.text}</div>

    <div id="coachAIBox"></div>

    <div style="display:grid;gap:8px;margin-top:16px">
      ${current.action ? `
        <button class="btn-primary" style="margin:0;padding:14px;font-size:14px" onclick="coachExecAction()">
          ${current.action.label}
        </button>
      ` : ''}
      <button class="btn-ghost" style="margin:0" onclick="coachSkipStep()">
        ❌ Passer cette étape
      </button>
      <button class="btn-ghost" style="margin:0;border-color:var(--red);color:var(--red)" onclick="coachSkipSuggestion()">
        ⏭ Ne plus me proposer ceci
      </button>
    </div>

    <div style="margin-top:20px;padding-top:14px;border-top:1px solid var(--border)">
      <div style="font-size:12px;color:var(--muted);margin-bottom:8px">💬 Demande à l'IA à propos de cette étape :</div>
      <div style="display:flex;gap:6px">
        <input type="text" id="coachAIInput" placeholder="Ex: Comment je rédige le message ?" style="flex:1;font-size:13px;padding:10px" onkeydown="if(event.key==='Enter'){event.preventDefault();coachAskAI();}">
        <button onclick="coachAskAI()" style="width:auto;padding:10px 14px;background:var(--accent);color:#fff;border:none;border-radius:10px;font-weight:600;cursor:pointer">🤖</button>
      </div>
      <div id="coachAIResponse" style="margin-top:10px"></div>
    </div>
  `;
}

function coachExecAction(){
  if(!coachCurrentSuggestion) return;
  const step = coachCurrentSuggestion.steps[coachCurrentStepIndex];
  if(step && step.action && typeof step.action.fn === 'function'){
    try { step.action.fn(); } catch(e){ console.warn('coach action:', e); }
    // Si l'action a fermé la modale (comme ouvrir un autre modal), on avance
    setTimeout(() => { if(document.getElementById('coachModalBg')?.classList.contains('show')) coachNextStep(); }, 100);
  }
}

function coachNextStep(){
  if(!coachCurrentSuggestion) return;
  coachCurrentStepIndex++;
  if(coachCurrentStepIndex >= coachCurrentSuggestion.steps.length){
    coachCompleteSuggestion();
  } else {
    coachRenderStep();
  }
}

function coachSkipStep(){
  coachNextStep();
}

function coachSkipSuggestion(){
  if(!coachCurrentSuggestion) return;
  const ignored = JSON.parse(localStorage.getItem(COACH_IGNORED_TODAY) || '[]');
  if(!ignored.includes(coachCurrentSuggestion.id)){
    ignored.push(coachCurrentSuggestion.id);
  }
  localStorage.setItem(COACH_IGNORED_TODAY, JSON.stringify(ignored));

  // Retirer de la liste actuelle
  coachSuggestions = coachSuggestions.filter(s => s.id !== coachCurrentSuggestion.id);
  coachCurrentSuggestion = null;
  coachCurrentStepIndex = 0;
  coachRenderList();
  coachUpdateBadge();
  showToast('Suggestion retirée pour aujourd\'hui');
}

function coachCompleteSuggestion(){
  const el = document.getElementById('coachContent');
  if(!el) return;
  el.innerHTML = `
    <div style="text-align:center;padding:40px 10px">
      <div style="font-size:60px;margin-bottom:16px">🎉</div>
      <div style="font-size:18px;font-weight:700;margin-bottom:8px">Super !</div>
      <div style="color:var(--muted);font-size:14px;line-height:1.6;margin-bottom:24px">
        Tu as terminé cette étape.<br>
        On continue avec autre chose ?
      </div>
      <button class="btn-primary" style="margin:0;width:100%" onclick="coachBackToList()">
        ▶ Voir la suite
      </button>
      <button class="btn-ghost" style="margin-top:8px;width:100%" onclick="coachClose()">
        Fermer
      </button>
    </div>
  `;

  // Retirer la suggestion terminée
  if(coachCurrentSuggestion){
    coachSuggestions = coachSuggestions.filter(s => s.id !== coachCurrentSuggestion.id);
  }
  coachCurrentSuggestion = null;
  coachCurrentStepIndex = 0;
  coachUpdateBadge();
}

function coachBackToList(){
  coachCurrentSuggestion = null;
  coachCurrentStepIndex = 0;
  coachRenderList();
}

function coachIgnoreAllToday(){
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem(COACH_LAST_OPEN_KEY, today);
  coachClose();
  showToast('Reviens demain pour de nouveaux conseils 👋');
}

// ============================================================
// IA : POSER UNE QUESTION
// ============================================================
async function coachAskAI(){
  const input = document.getElementById('coachAIInput');
  const box = document.getElementById('coachAIResponse');
  if(!input || !box) return;

  const question = input.value.trim();
  if(!question) return;

  let cfg = null;
  try { cfg = JSON.parse(localStorage.getItem('aiConfig')); } catch(e){}
  if(!cfg || !cfg.key){
    box.innerHTML = '<div style="color:var(--yellow);font-size:12px">⚠️ Configure d\'abord ta clé IA dans l\'onglet 🤖 IA</div>';
    return;
  }

  box.innerHTML = '<div style="color:var(--muted);font-size:12px">🤖 Réflexion en cours...</div>';
  input.value = '';

  try {
    const s = coachCurrentSuggestion;
    const step = s.steps[coachCurrentStepIndex];
    const context = buildSummary();

    const prompt = `Tu es le coach personnel d'Henzo, photographe professionnel en Côte d'Ivoire.

Contexte actuel :
${context}

Conseil en cours : "${s.title}" - ${s.subtitle}
Étape actuelle : "${step.title}" - ${step.text}

Henzo te demande : "${question}"

Réponds en français, de façon directe, concrète et bienveillante. Maximum 150 mots. Va droit au but. Pas d'astérisques.`;

    const response = await callAI(prompt);

    // Formater la réponse
    const formatted = (response || 'Pas de réponse').replace(/\n/g, '<br>');
    box.innerHTML = `
      <div style="background:var(--card);border-radius:10px;padding:12px;border-left:3px solid var(--accent);font-size:13px;line-height:1.6">
        ${formatted}
      </div>
    `;
  } catch(e){
    box.innerHTML = `<div style="color:var(--red);font-size:12px">❌ ${e.message}</div>`;
  }
}

// ============================================================
// BADGE SUR LE BOUTON
// ============================================================
function coachUpdateBadge(){
  const badge = document.getElementById('coachBadge');
  if(!badge) return;

  const count = coachSuggestions.length;
  if(count === 0){
    badge.style.display = 'none';
  } else {
    badge.style.display = 'flex';
    badge.textContent = count;
    badge.style.background = count >= 3 ? 'var(--red)' : 'var(--accent)';
  }
}

// ============================================================
// AUTO-OUVERTURE QUOTIDIENNE
// ============================================================
function coachAutoOpenIfNewDay(){
  const today = new Date().toISOString().slice(0, 10);
  const lastOpen = localStorage.getItem(COACH_LAST_OPEN_KEY);
  const ignored = JSON.parse(localStorage.getItem(COACH_IGNORED_TODAY) || '[]');

  // Si déjà ouvert aujourd'hui → ne pas rouvrir
  if(lastOpen === today) return;

  // Nettoyer les ignorés d'hier
  if(lastOpen !== today){
    localStorage.removeItem(COACH_IGNORED_TODAY);
  }

  // Analyse rapide
  const s = coachAnalyze();

  // Ne pas rouvrir si rien à dire
  if(s.length === 0) return;

  // Marquer comme ouvert aujourd'hui
  localStorage.setItem(COACH_LAST_OPEN_KEY, today);

  // Petit délai pour ne pas bloquer l'app au chargement
  setTimeout(() => {
    coachSuggestions = s;
    const modal = document.getElementById('coachModalBg');
    if(modal) modal.classList.add('show');
    coachRenderList();
    coachUpdateBadge();
  }, 2500);
}

// ============================================================
// INIT
// ============================================================
function initCoach(){
  // Met à jour le badge en arrière-plan
  setTimeout(() => {
    coachSuggestions = coachAnalyze();
    coachUpdateBadge();
  }, 3000);

  // Auto-ouverture une fois par jour
  setTimeout(coachAutoOpenIfNewDay, 4000);

  // Rafraîchir le badge quand les données changent
  setInterval(() => {
    if(document.getElementById('coachModalBg')?.classList.contains('show')) return;
    coachSuggestions = coachAnalyze();
    coachUpdateBadge();
  }, 60000);
}

console.log('✅ Coach.js chargé');