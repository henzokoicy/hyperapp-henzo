// ============================================================
// REGLES.JS - Les règles de Henzo Studio appliquées pour de vrai
// ------------------------------------------------------------
// Avant d'agir, l'app vérifie les règles de la Vision et prévient :
//  1. Séance proche sans contrat signé ou sans acompte
//  2. Une seule relance polie par client, puis attendre
//  3. Promo : seulement pour un grand événement, limitée dans le temps,
//     sur une offre précise
//  4. Devis avec une remise manuelle (jamais brader les prix)
// Ce sont des avertissements : Henzo reste le patron et peut passer
// outre avec "Enregistrer / Envoyer quand même".
// ============================================================
(function(){
'use strict';
const JOUR = 864e5;
const F = n => (typeof agF === 'function' ? agF(n) : Math.round(n) + ' F');
const demander = (txt, ok) => (typeof agConfirm === 'function' ? agConfirm(txt, { ok: ok || 'Continuer quand même' }) : Promise.resolve(window.confirm(txt.replace('\n', '\n\n'))));
const actif = () => { try { return !(window.VISION_HENZO && VISION_HENZO().actif === false); } catch(e){ return true; } };
const jourLocal = d => { d = new Date(d); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const ecart = (dateStr) => Math.round((new Date(String(dateStr).slice(0, 10) + 'T12:00:00') - new Date(jourLocal(new Date()) + 'T12:00:00')) / JOUR);

// ---------- Règles (pures, testables) ----------
// 1. Séance : que manque-t-il ? signe/acompteRecu viennent de l'app
function manqueSeance(o){
  if(!(o.prix > 0) || o.annulee) return [];
  if(o.jours == null || o.jours < 0 || o.jours > 3) return [];
  const m = [];
  if(!o.contratSigne) m.push('contrat signé');
  if(!(o.acompteRecu > 0)) m.push('acompte');
  return m;
}
// 2. Relance : le dernier message de relance au client, s'il date de moins de 30 jours
const TYPES_RELANCE = ['relance', 'fidelite', 'promo', 'fete'];
function derniereRelance(msgs, clientId, now){
  const t = (now || new Date()).getTime();
  const m = (msgs || []).filter(x => x.client_id === clientId && TYPES_RELANCE.includes(x.kind))
    .map(x => new Date(x.created_at).getTime()).sort((a, b) => b - a)[0];
  if(!m) return null;
  const j = Math.floor((t - m) / JOUR);
  return j < 30 ? j : null;
}
// 3. Promo : problèmes éventuels. fetes = [{n, j}] (j = jours avant la fête)
function problemesPromo(o){
  const p = [];
  if(!o.fin){ p.push('elle n\'a pas de date de fin (une promo doit être limitée dans le temps)'); }
  else {
    const j = ecart(o.fin);
    if(j > 45) p.push('elle dure plus de 45 jours (garde-la courte)');
    const fete = (o.fetes || []).find(f => f.j >= -3 && f.j <= j + 3);
    if(!fete) p.push('elle ne tombe sur aucun grand événement populaire (fêtes, rentrée)');
  }
  if(!String(o.notes || '').trim()) p.push('elle ne précise pas l\'offre concernée (écris-la dans "Notes")');
  return p;
}

// ---------- Branchements ----------
let cacheContrats = { t: 0, liste: [] };
async function contrats(){
  if(Date.now() - cacheContrats.t < 30000) return cacheContrats.liste;
  const r = await sb.from('contrats').select('id,shoot_id,statut');
  if(r.error) throw r.error;
  cacheContrats = { t: Date.now(), liste: r.data || [] };
  return cacheContrats.liste;
}

function brancherSeance(){
  const base = window.saveShoot; if(typeof base !== 'function' || base.__regles) return false;
  const nouveau = async function(){
    try {
      if(actif()){
        const date = (document.getElementById('shootDate') || {}).value;
        const prix = parseFloat((document.getElementById('shootPrice') || {}).value) || 0;
        const jours = date ? ecart(date) : null;
        const ex = typeof editingShootId !== 'undefined' && editingShootId ? (shoots || []).find(s => s.id === editingShootId) : null;
        if(prix > 0 && jours != null && jours >= 0 && jours <= 3){
          let signe = false;
          if(ex){ try { signe = (await contrats()).some(c => c.shoot_id === ex.id && c.statut === 'signe'); } catch(e){ signe = true; /* on ne bloque pas si on ne sait pas */ } }
          const manque = manqueSeance({ prix, jours, annulee: ex && /annul/i.test(ex.status || ''), contratSigne: signe, acompteRecu: ex ? Number(ex.montant_recu) || 0 : 0 });
          if(manque.length){
            const quand = jours === 0 ? "aujourd'hui" : jours === 1 ? 'demain' : 'dans ' + jours + ' jours';
            const ok = await demander(`Séance ${quand} : il manque ${manque.join(' et ')}\nTa règle : un contrat signé et un acompte avant chaque séance. ${ex ? '' : 'Pense à préparer le contrat et à demander l\'acompte juste après l\'enregistrement. '}Enregistrer quand même ?`, 'Enregistrer quand même');
            if(!ok) return;
          }
        }
      }
    } catch(e){ console.warn('règles séance', e); }
    return base.apply(this, arguments);
  };
  nouveau.__regles = true; window.saveShoot = nouveau;
  try { saveShoot = nouveau; } catch(e){}
  return true;
}

function brancherRelance(){
  const base = window.crmWa; if(typeof base !== 'function' || base.__regles) return false;
  const nouveau = async function(clientId, text, kind){
    try {
      if(actif() && TYPES_RELANCE.includes(kind) && window.CRM){
        const j = derniereRelance(CRM.msgs, clientId);
        if(j != null){
          const c = (clients || []).find(x => x.id === clientId);
          const ok = await demander(`${(c && c.name) || 'Ce client'} a déjà reçu une relance il y a ${j} jour${j > 1 ? 's' : ''}\nTa règle : une seule relance polie par client, puis attendre. Envoyer quand même ?`, 'Envoyer quand même');
          if(!ok) return false;
        }
      }
    } catch(e){ console.warn('règles relance', e); }
    return base.apply(this, arguments);
  };
  nouveau.__regles = true; window.crmWa = nouveau;
  try { crmWa = nouveau; } catch(e){}
  return true;
}

function brancherPromo(){
  const base = window.crmPromoSave; if(typeof base !== 'function' || base.__regles) return false;
  const nouveau = async function(id){
    try {
      if(actif() && !id){ // seulement à la création : on ne dérange pas pour une simple modification
        const v = k => ((document.getElementById(k) || {}).value || '').trim();
        const fetes = typeof crmFetes === 'function' ? crmFetes() : [];
        const pb = problemesPromo({ fin: v('crmPUntil'), notes: v('crmPNotes'), fetes });
        if(pb.length && parseFloat(v('crmPValue'))){
          const ok = await demander(`Cette promo sort de tes règles\nTa règle : une promo seulement pour un grand événement, limitée dans le temps, sur une offre précise, sans baisser le tarif de base. Ici : ${pb.join(' ; ')}. Créer quand même ?`, 'Créer quand même');
          if(!ok) return;
        }
      }
    } catch(e){ console.warn('règles promo', e); }
    return base.apply(this, arguments);
  };
  nouveau.__regles = true; window.crmPromoSave = nouveau;
  try { crmPromoSave = nouveau; } catch(e){}
  return true;
}

function brancherDevis(){
  const base = window.pxSaveQuote; if(typeof base !== 'function' || base.__regles) return false;
  const nouveau = async function(){
    try {
      if(actif() && typeof pxCompute === 'function' && window.PX && PX.q && (PX.q.disc === 'percent' || PX.q.disc === 'amount')){
        const r = pxCompute();
        if(r.lines.length && r.discount > 0){
          const ok = await demander(`Ce devis contient une remise de ${F(r.discount)}\nTa règle : ne jamais brader tes prix. Une remise n'est possible que par une promo liée à un grand événement. Enregistrer quand même ?`, 'Enregistrer quand même');
          if(!ok) return null;
        }
      }
    } catch(e){ console.warn('règles devis', e); }
    return base.apply(this, arguments);
  };
  nouveau.__regles = true; window.pxSaveQuote = nouveau;
  try { pxSaveQuote = nouveau; } catch(e){}
  return true;
}

window.hzRegles = { manqueSeance, derniereRelance, problemesPromo, TYPES_RELANCE };

if(typeof document !== 'undefined' && typeof window !== 'undefined' && document.body){
  const faits = {}; let essais = 0;
  const t = setInterval(() => {
    ['Seance', 'Relance', 'Promo', 'Devis'].forEach(k => { if(!faits[k]) faits[k] = ({ Seance: brancherSeance, Relance: brancherRelance, Promo: brancherPromo, Devis: brancherDevis })[k](); });
    if((faits.Seance && faits.Relance && faits.Promo && faits.Devis) || ++essais > 80) clearInterval(t);
  }, 500);
}
})();
