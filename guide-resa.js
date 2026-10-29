// ============================================================
// GUIDE-RESA.JS - Guide pas à pas pour les clients
// (page de tarifs tarifs.html et page de réservation reserver.html)
// ------------------------------------------------------------
// Un bouton "Guide" toujours visible. À la 1re visite, on propose le guide.
// Chaque étape éclaire la bonne partie de la page et dit quoi faire.
// La page reste utilisable pendant le guide : le client choisit son pack,
// remplit ses infos... et le guide passe tout seul à l'étape suivante
// quand c'est fait (type de séance, pack).
// ============================================================
(function(){
'use strict';
var PAGE = /reserver/.test(location.pathname) ? 'reserver' : 'tarifs';
var CLE = 'guideVu_' + PAGE;
var $ = function(s){ return document.querySelector(s); };
var $$ = function(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); };
function visible(el){ if(!el) return false; var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).display !== 'none'; }
function etat(){ return typeof S !== 'undefined' ? S : {}; }

var ETAPES = {
  reserver: [
    { sel: 'h1', t: 'Bienvenue', d: 'Réserver ici prend 2 minutes. Je vous montre chaque étape. Vous pouvez remplir la page pendant que je vous guide.' },
    { sel: '[data-g="cols"]', t: 'Le type de séance', d: 'Touchez la séance qui vous intéresse : anniversaire, mariage, studio...', fait: function(){ return !!etat().col; } },
    { sel: '[data-g="packs"] .f', max: 3, t: 'Votre pack', d: 'Touchez le pack qui vous plaît. Le prix est à droite. « Le plus choisi » est celui que nos clients prennent le plus.', fait: function(){ return !!etat().sel; } },
    { sel: '[data-g="opts"] .o', max: 3, t: 'Les options (facultatif)', d: 'Envie de plus ? Touchez + pour ajouter une option, - pour l\'enlever. Le total se met à jour tout seul.' },
    { sel: '#nom', t: 'Votre nom', d: 'Écrivez votre nom et prénom.' },
    { sel: '#tel', t: 'Votre numéro WhatsApp', d: 'C\'est sur WhatsApp que nous vous confirmons la date. Vérifiez bien le numéro.' },
    { sel: '#date', t: 'Le jour et l\'heure', d: 'Choisissez le jour et l\'heure que vous voulez. Nous vérifions que c\'est libre et nous vous répondons.' },
    { sel: '#msg', t: 'Un message (facultatif)', d: 'Le nombre de personnes, une idée de photos, une question : écrivez-le ici.' },
    { sel: '[data-g="src"]', t: 'Comment vous nous avez connus', d: 'Facultatif : ça nous aide beaucoup.' },
    { sel: '.sum', t: 'Le total', d: 'Voici le total estimé, avec votre réduction si vous avez un code.' },
    { sel: '#go', t: 'Envoyer ma demande', d: 'Quand tout est bon, touchez ce bouton. Ce n\'est pas encore un paiement : nous vous confirmons d\'abord la date sur WhatsApp.' },
    { sel: '#rdv', t: 'Et après ?', d: 'Voici la suite : nous vérifions la date, vous payez l\'acompte pour la bloquer, puis vous recevez votre confirmation.' }
  ],
  tarifs: [
    { sel: 'h1', t: 'Bienvenue', d: 'Voici nos tarifs. Je vous montre comment choisir et réserver, étape par étape.' },
    { sel: '.pills', t: 'Le type de séance', d: 'Touchez une séance pour voir ses packs, ou « Tout voir ».' },
    { sel: '.f', max: 3, t: 'Les packs', d: 'Chaque pack montre ce qui est inclus (✔) ou non (✘). Touchez celui qui vous plaît pour le choisir.', fait: function(){ return !!etat().sel; } },
    { sel: '.o', max: 3, t: 'Les options (facultatif)', d: 'Touchez + pour ajouter une option à votre pack.' },
    { sel: '#bar', t: 'Le total et la réservation', d: '« Réserver en ligne » ouvre un petit formulaire (2 minutes). « Réserver sur WhatsApp » vous met directement en contact avec nous.' },
    { sel: '.pdf', t: 'Garder les tarifs', d: 'Téléchargez la grille en PDF pour la regarder plus tard ou l\'envoyer à quelqu\'un.' },
    { sel: '#rdv', t: 'Comment réserver', d: 'Les étapes après votre choix : vérification de la date, acompte, confirmation.' },
    { sel: '.cond', t: 'Les conditions', d: 'Lisez les conditions : acompte, déplacement, délai de livraison des photos.' }
  ]
};

var G = null; // guide en cours : { etapes, i, minuteur }
function lesEtapes(){
  return ETAPES[PAGE].filter(function(e){ var els = $$(e.sel).filter(visible); return els.length > 0 || e.sel === 'h1'; });
}
function zone(e){
  var els = $$(e.sel).filter(visible).slice(0, e.max || 99);
  if(!els.length) return null;
  var r = els.map(function(x){ return x.getBoundingClientRect(); });
  var x0 = Math.min.apply(null, r.map(function(a){ return a.left; })), y0 = Math.min.apply(null, r.map(function(a){ return a.top; }));
  var x1 = Math.max.apply(null, r.map(function(a){ return a.right; })), y1 = Math.max.apply(null, r.map(function(a){ return a.bottom; }));
  return { el: els[0], x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
function demarrer(){
  try { localStorage.setItem(CLE, '1'); } catch(e){}
  var p = $('#gr-propose'); if(p) p.remove();
  G = { etapes: ETAPES[PAGE], i: 0 };
  var v = document.createElement('div'); v.id = 'gr-visite';
  v.innerHTML = '<div class="gr-trou" id="gr-trou"></div><div class="gr-bulle" id="gr-bulle" role="dialog" aria-live="polite"></div>';
  document.body.appendChild(v);
  montrer();
  window.addEventListener('resize', placer); window.addEventListener('scroll', placerVite, { passive: true });
  // La page se redessine quand le client choisit : on suit
  G.obs = new MutationObserver(function(){ placerVite(); });
  var app = $('#app'); if(app) G.obs.observe(app, { childList: true, subtree: true });
}
function finir(){
  var v = $('#gr-visite'); if(v) v.remove();
  if(G){ clearInterval(G.minuteur); if(G.obs) G.obs.disconnect(); }
  G = null;
  window.removeEventListener('resize', placer); window.removeEventListener('scroll', placerVite);
}
function aller(d){
  if(!G) return;
  clearInterval(G.minuteur);
  G.i += d;
  while(G.i < G.etapes.length && G.i >= 0 && G.etapes[G.i].sel !== 'h1' && !zone(G.etapes[G.i])) G.i += d > 0 ? 1 : -1;
  if(G.i >= G.etapes.length || G.i < 0){ finir(); return; }
  montrer();
}
function montrer(){
  var e = G.etapes[G.i], n = G.etapes.length;
  // Étape dont la partie n'existe pas (encore) : on passe
  if(e.sel !== 'h1' && !zone(e)){ aller(1); return; }
  var b = $('#gr-bulle');
  b.innerHTML = '<div class="gr-n">Étape ' + (G.i + 1) + ' sur ' + n + '</div><h4>' + e.t + '</h4><p>' + e.d + '</p>' +
    (e.fait && !e.fait() ? '<p class="gr-astuce">Faites votre choix : je passe à la suite tout seul.</p>' : '') +
    '<div class="gr-btns"><button class="gr-b gr-ghost" id="gr-quit">Quitter</button><span>' +
    (G.i > 0 ? '<button class="gr-b gr-ghost" id="gr-prev">‹ Retour</button>' : '') +
    '<button class="gr-b" id="gr-next">' + (G.i === n - 1 ? 'Terminé ✓' : 'Suivant ›') + '</button></span></div>';
  $('#gr-quit').onclick = finir; $('#gr-next').onclick = function(){ aller(1); };
  var pv = $('#gr-prev'); if(pv) pv.onclick = function(){ aller(-1); };
  var z = zone(e);
  if(z && z.el){
    var r = z.el.getBoundingClientRect();
    if(r.top < 80 || r.top > innerHeight * 0.55) window.scrollTo({ top: Math.max(0, window.scrollY + r.top - innerHeight * 0.22), behavior: 'smooth' });
  }
  setTimeout(placer, 380);
  // Choix fait par le client -> étape suivante toute seule
  if(e.fait){
    var deja = e.fait();
    G.minuteur = setInterval(function(){ if(!G) return; if(!deja && e.fait()){ clearInterval(G.minuteur); setTimeout(function(){ if(G) aller(1); }, 700); } }, 400);
  }
}
var raf = 0;
function placerVite(){ if(raf) return; raf = requestAnimationFrame(function(){ raf = 0; placer(); }); }
function placer(){
  if(!G) return;
  var e = G.etapes[G.i], trou = $('#gr-trou'), b = $('#gr-bulle'); if(!trou || !b) return;
  var z = zone(e), H = innerHeight, W = innerWidth;
  var bw = Math.min(360, W - 24);
  if(!z){ trou.style.cssText = 'left:' + W / 2 + 'px;top:' + H / 2 + 'px;width:0;height:0'; b.style.cssText = 'left:50%;top:50%;transform:translate(-50%,-50%);width:' + bw + 'px'; return; }
  var m = 8, top = Math.max(-m, z.y - m), haut = Math.min(z.h + 2 * m, H * 0.62);
  trou.style.cssText = 'left:' + (z.x - m) + 'px;top:' + top + 'px;width:' + (z.w + 2 * m) + 'px;height:' + haut + 'px';
  var bas = top + haut + 12, left = Math.max(12, Math.min(W - bw - 12, z.x + z.w / 2 - bw / 2));
  var hb = b.offsetHeight || 190;
  if(H - bas > hb + 12) b.style.cssText = 'left:' + left + 'px;top:' + bas + 'px;width:' + bw + 'px';
  else if(top - 12 > hb + 12) b.style.cssText = 'left:' + left + 'px;top:' + (top - 12 - hb) + 'px;width:' + bw + 'px';
  else b.style.cssText = 'left:' + left + 'px;bottom:' + (PAGE === 'tarifs' && visible($('#bar')) ? 130 : 16) + 'px;width:' + bw + 'px';
}

// ---------- Bouton "Guide" et proposition à la 1re visite ----------
function bouton(){
  if($('#gr-btn')) return;
  var b = document.createElement('button');
  b.id = 'gr-btn'; b.type = 'button'; b.setAttribute('aria-label', 'Guide : comment réserver');
  b.innerHTML = '<span>?</span><em>Guide</em>';
  b.onclick = function(){ if(G) finir(); demarrer(); };
  document.body.appendChild(b);
}
function proposer(){
  var vu = false; try { vu = localStorage.getItem(CLE) === '1'; } catch(e){}
  if(vu || $('#gr-propose') || G) return;
  var p = document.createElement('div'); p.id = 'gr-propose';
  p.innerHTML = '<span>' + (PAGE === 'reserver' ? 'Première réservation ? Je vous montre comment faire, étape par étape.' : 'Je vous montre comment choisir votre pack et réserver ?') + '</span>' +
    '<div><button class="gr-b" id="gr-go">▶ Suivre le guide</button><button class="gr-b gr-ghost" id="gr-non">Non merci</button></div>';
  document.body.appendChild(p);
  $('#gr-go').onclick = demarrer;
  $('#gr-non').onclick = function(){ try { localStorage.setItem(CLE, '1'); } catch(e){} p.remove(); };
}
function css(){
  if($('#gr-css')) return;
  var s = document.createElement('style'); s.id = 'gr-css';
  s.textContent = '' +
    '#gr-btn{position:fixed;right:12px;top:calc(12px + env(safe-area-inset-top));z-index:60;display:flex;align-items:center;gap:8px;background:var(--card,#0a1c1a);color:var(--txt,#fff);border:1px solid var(--accent,#48A89A);border-radius:999px;padding:7px 14px 7px 7px;font:600 14px Inter,system-ui,sans-serif;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.35)}' +
    '#gr-btn span{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:var(--accent,#48A89A);color:#fff;font-weight:800}' +
    '#gr-btn em{font-style:normal}' +
    '#gr-visite{position:fixed;inset:0;z-index:200;pointer-events:none}' +
    '.gr-trou{position:fixed;border-radius:16px;box-shadow:0 0 0 9999px rgba(0,0,0,.66);outline:2px solid var(--accent,#48A89A);transition:all .3s cubic-bezier(.16,1,.3,1)}' +
    '.gr-bulle{position:fixed;pointer-events:auto;background:var(--card,#0a1c1a);color:var(--txt,#fff);border:1px solid var(--accent,#48A89A);border-radius:18px;padding:15px 16px;box-shadow:0 16px 40px rgba(0,0,0,.5);transition:top .3s ease,left .3s ease;font-family:Inter,system-ui,sans-serif}' +
    '.gr-bulle h4{font-size:17px;margin:4px 0 6px}' +
    '.gr-bulle p{font-size:14px;line-height:1.55;color:var(--muted,#9cbdb8);margin:0}' +
    '.gr-bulle .gr-astuce{margin-top:8px;color:var(--light,#CBEFEB);font-size:13px}' +
    '.gr-n{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--light,#CBEFEB);opacity:.8}' +
    '.gr-btns{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:12px}.gr-btns span{display:flex;gap:6px}' +
    '.gr-b{border:0;border-radius:12px;padding:9px 13px;font:700 13.5px Inter,system-ui,sans-serif;cursor:pointer;background:#fff;color:var(--deep,#00524D);width:auto;margin:0}' +
    '.gr-b.gr-ghost{background:transparent;color:var(--txt,#fff);border:1px solid var(--line,#173b37);font-weight:600}' +
    '#gr-propose{position:fixed;left:12px;right:12px;bottom:calc(76px + env(safe-area-inset-bottom));z-index:70;max-width:480px;margin:0 auto;display:flex;flex-direction:column;gap:10px;background:var(--card,#0a1c1a);color:var(--txt,#fff);border:1px solid var(--accent,#48A89A);border-radius:18px;padding:14px;box-shadow:0 14px 40px rgba(0,0,0,.45);font:500 14px/1.45 Inter,system-ui,sans-serif}' +
    '#gr-propose div{display:flex;gap:8px}' +
    'body.gr-barre #gr-propose{bottom:calc(210px + env(safe-area-inset-bottom))}';
  document.head.appendChild(s);
}
function surveiller(){
  // Page de tarifs : la barre du total en bas -> on remonte le bouton
  var bar = $('#bar');
  document.body.classList.toggle('gr-barre', !!(bar && visible(bar)));
}
function lancer(){
  css(); bouton();
  setInterval(surveiller, 600);
  // On attend que les tarifs soient chargés pour proposer le guide
  var essais = 0;
  var t = setInterval(function(){
    essais++;
    if($('h1') && ($$('.f').length || $$('.cols button').length || essais > 20)){ clearInterval(t); setTimeout(proposer, 900); }
  }, 300);
}
window.guideResa = demarrer;
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', lancer); else lancer();
})();
