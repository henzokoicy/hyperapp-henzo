// ============================================================
// COMMENT-RESERVER.JS - Les étapes pour réserver, en clair
// (page de tarifs tarifs.html et page de réservation reserver.html)
// ------------------------------------------------------------
// rdvHtml2(o) : les 6 étapes + la règle de l'acompte + les moyens de
// paiement. o = { acompte, somme, pour, pliable, ouvert, depuis }
//   depuis 'tarifs' : le client choisit sur la page de tarifs
//   depuis 'reserver' : le client remplit le formulaire
// rdvRegleHtml(acompte, somme) : l'encadré "l'acompte valide le RDV".
// Utilise les fonctions de la page : esc, F, ri, moyensOn.
// ============================================================
(function(){
'use strict';
function wave(){ try { return moyensOn().some(function(m){ return m.k === 'wave'; }); } catch(e){ return true; } }
function autres(){ try { return moyensOn().filter(function(m){ return m.k !== 'wave'; }).map(function(m){ return m.n; }); } catch(e){ return []; } }
function lien(){ return wave() ? 'un lien de paiement Wave' : 'un lien de paiement'; }

window.rdvRegleHtml = function(acc, somme){
  acc = Number(acc) || 0;
  if(!acc) return '';
  return '<div class="rdv-imp"><b>Important : c\'est l\'acompte qui valide votre rendez-vous</b>' +
    '<span>Acompte de ' + acc + ' %' + (somme ? ' (' + F(somme) + ')' : '') + '. Sans acompte, la date n\'est pas réservée. ' +
    'Si un autre client paie l\'acompte pour le même jour et la même heure, il passe en priorité.</span></div>';
};

window.rdvHtml2 = function(o){
  o = o || {};
  var acc = Number(o.acompte) || 0, ms = [];
  try { ms = moyensOn(); } catch(e){}
  var aut = autres();
  var tarifs = o.depuis !== 'reserver';
  var steps = [
    ['pack', 'Choisissez votre pack', tarifs ? 'Touchez le pack qui vous plaît. Ce qui est compris est coché.' : 'Touchez le pack qui vous plaît, plus haut.'],
    ['plus', 'Ajoutez des options si vous voulez', 'Touchez + pour ajouter, - pour enlever. Le total se calcule tout seul' + (tarifs ? ' en bas de l\'écran.' : '.')],
    ['chat', tarifs ? 'Réservez en un geste' : 'Envoyez votre demande', tarifs
      ? 'En bas : « Réserver sur WhatsApp » (le message est déjà écrit) ou « Réserver en ligne » (petit formulaire de 2 minutes). Indiquez le jour et l\'heure que vous voulez.'
      : 'Votre nom, votre numéro WhatsApp, le jour et l\'heure que vous voulez, puis « Envoyer ma demande ». Ce n\'est pas encore un paiement.'],
    ['cal', 'Nous vérifions le jour et l\'heure', 'Nous regardons si le créneau est libre et nous vous répondons sur WhatsApp. Pas libre ? Nous choisissons ensemble un autre moment.'],
    acc ? ['pay', 'Payez l\'acompte avec ' + lien(), 'Nous enregistrons votre rendez-vous et vous envoyons ' + lien() + ' : touchez-le, suivez les instructions, c\'est payé. Acompte : ' + acc + ' %' + (o.somme ? ' (' + F(o.somme) + ')' : '') + (o.pour ? ' pour ' + o.pour : '') + '.' + (wave() ? ' Wave est le moyen le plus simple et celui que nous recommandons.' : '') + (aut.length ? ' Pas de Wave ? Vous pouvez aussi payer par ' + aut.join(', ') + '.' : '')]
        : ['pay', 'Confirmez votre date', 'Nous bloquons votre date dès votre accord.'],
    ['ok', 'Rendez-vous validé, reçu sur WhatsApp', acc ? 'Dès que l\'acompte est reçu, votre rendez-vous est confirmé et vous recevez votre reçu sur WhatsApp. Le reste se paie le jour de la séance.' : 'Vous recevez votre confirmation sur WhatsApp. Le paiement se règle le jour de la séance.']
  ];
  var li = steps.map(function(s, i){ return '<li>' + ri(s[0], i + 1) + '<div><b>' + esc(s[1]) + '</b><span>' + esc(s[2]) + '</span></div></li>'; }).join('');
  var moy = ms.length ? '<div class="rdv-mh">Moyens de paiement acceptés</div><div class="rdv-m">' + ms.map(function(m){
    return '<span class="' + (m.k === 'wave' ? 'reco' : '') + '"><b>' + esc(m.n) + '</b>' + (m.k === 'wave' ? '<em>Recommandé</em>' : '') + (m.info ? '<small>' + esc(m.info) + '</small>' : '') + '</span>';
  }).join('') + '</div>' : '';
  var corps = '<ol>' + li + '</ol>' + rdvRegleHtml(acc, o.somme) + moy;
  if(!o.pliable) return '<section class="rdv" id="rdv"><h2>Comment réserver</h2>' + corps + '</section>';
  return '<section class="rdv pli' + (o.ouvert ? ' open' : '') + '" id="rdv"><button type="button" class="rdv-t" onclick="rdvBasculer()" aria-expanded="' + (o.ouvert ? 'true' : 'false') + '">' +
    '<span><b>Comment réserver</b><small>6 étapes simples, touchez pour voir</small></span><svg class="rdv-ch" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></button>' +
    '<div class="rdv-c">' + corps + '</div></section>';
};
window.RDV_OUVERT = false;
window.rdvBasculer = function(ouvrir){
  var s = document.getElementById('rdv'); if(!s) return;
  var on = ouvrir == null ? !s.classList.contains('open') : !!ouvrir;
  s.classList.toggle('open', on); window.RDV_OUVERT = on;
  var b = s.querySelector('.rdv-t'); if(b) b.setAttribute('aria-expanded', on ? 'true' : 'false');
  if(on && ouvrir != null) setTimeout(function(){ s.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30);
};
(function css(){
  if(document.getElementById('rdvCss')) return;
  var st = document.createElement('style'); st.id = 'rdvCss';
  st.textContent = '' +
    '.rdv.pli{padding:0;overflow:hidden}' +
    '.rdv-t{display:flex;width:100%;align-items:center;justify-content:space-between;gap:10px;padding:16px;border:0;background:transparent;color:var(--txt);font:inherit;text-align:left;cursor:pointer}' +
    '.rdv-t b{display:block;font-size:17px;font-weight:800}.rdv-t small{display:block;font-size:12.5px;color:var(--muted);margin-top:2px}' +
    '.rdv-ch{flex-shrink:0;transition:transform .2s;color:var(--light)}.rdv.open .rdv-ch{transform:rotate(180deg)}' +
    '.rdv.pli .rdv-c{display:none;padding:0 16px 16px}.rdv.pli.open .rdv-c{display:block}' +
    '.rdv-imp{margin-top:12px;padding:12px 14px;border-radius:14px;background:color-mix(in srgb,#f5a524 14%,transparent);border:1px solid color-mix(in srgb,#f5a524 55%,transparent)}' +
    '.rdv-imp b{display:block;font-size:14px;color:var(--txt)}.rdv-imp span{display:block;font-size:13px;line-height:1.5;color:var(--txt);opacity:.85;margin-top:4px}' +
    '.rdv-m span.reco{border-color:var(--accent)}.rdv-m em{font-style:normal;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#fff;background:var(--accent);padding:2px 7px;border-radius:99px}';
  document.head.appendChild(st);
})();
})();
