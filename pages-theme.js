// ============================================================
// PAGES-THEME.JS - Les pages clients (tarifs, réservation) prennent
// le thème choisi dans la Super App : couleurs, effet, police.
// Le thème est gardé dans tarif_page.apparence (rempli par l'app).
// Appel : appliquerApparencePage(S.page.apparence) une fois la page lue.
// ============================================================
(function(){
'use strict';
function hex(h){ h = String(h || '').trim().replace('#', ''); if(h.length === 3) h = h.split('').map(function(c){ return c + c; }).join(''); return [0, 2, 4].map(function(i){ return parseInt(h.slice(i, i + 2), 16) || 0; }); }
function lum(h){ var c = hex(h); return (c[0] * 299 + c[1] * 587 + c[2] * 114) / 255000; }
function mix(a, b, t){ var A = hex(a), B = hex(b); return '#' + A.map(function(v, i){ return Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0'); }).join(''); }
var POLICES = { poppins: 'Poppins', outfit: 'Outfit', manrope: 'Manrope', montserrat: 'Montserrat', dmsans: 'DM Sans' };
var CARTES = '.f,.o,.sum,.rdv,.par,.cols button,.src button,.col,.hint,.cond,.promo,.pills button,.ok .ic';

window.appliquerApparencePage = function(a){
  if(!a || !a.vars) return;
  var v = a.vars, r = document.documentElement.style;
  var set = function(n, x){ if(x) r.setProperty('--' + n, x); };
  set('bg', v.bg); set('card', v.card); set('card2', v.card2); set('line', v.line); set('txt', v.txt); set('muted', v.muted);
  set('accent', v.accent); set('light', v.light); set('deep', v.deep); set('forest', v.forest);
  set('pri-bg', v.pri_bg); set('pri-fg', v.pri_fg);
  // Le PDF est imprimé sur papier blanc : on garde des couleurs lisibles
  var acc = lum(v.accent) > 0.72 ? (lum(v.deep) < 0.5 ? v.deep : '#222222') : v.accent;
  var dp = lum(v.deep) < 0.55 ? v.deep : acc;
  set('pacc', acc); set('pdeep', dp); set('pink', mix(dp, '#000000', 0.3));
  var meta = document.querySelector('meta[name="theme-color"]'); if(meta) meta.setAttribute('content', v.bg);
  var css = '';
  if(a.clair){
    css += '.st button{color:var(--txt)}.promo,.promo *{color:#fff}' +
      '.f.on,.cols button.on,.src button.on{background:color-mix(in srgb,var(--accent) 12%,var(--card)) !important}' +
      '.bar{box-shadow:0 -6px 24px rgba(0,0,0,.08)}.foot{color:var(--muted)}';
  }
  var P = POLICES[a.police];
  if(P){
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=' + P.replace(/ /g, '+') + ':wght@400;500;600;700;800&display=swap';
    document.head.appendChild(l);
    css += 'body,body button,body input,body textarea,body select,body h1,body h2,body b,body span,body p,body label,body a,body div{font-family:"' + P + '",Inter,system-ui,sans-serif !important}';
  }
  var S = CARTES;
  if(a.style === 'verre') css += 'body{background:radial-gradient(900px 650px at 0% 0%,color-mix(in srgb,var(--accent) 24%,transparent),transparent 62%),radial-gradient(800px 600px at 100% 100%,color-mix(in srgb,var(--deep) 45%,transparent),transparent 62%),var(--bg) !important;background-attachment:fixed !important}' +
    S.split(',').join(',') + '{background:color-mix(in srgb,var(--card) 55%,transparent) !important;-webkit-backdrop-filter:blur(16px) saturate(150%);backdrop-filter:blur(16px) saturate(150%);border-color:color-mix(in srgb,var(--light) 18%,transparent) !important}' +
    '.f.on,.cols button.on{background:color-mix(in srgb,var(--accent) 22%,transparent) !important}';
  if(a.style === 'doux') css += S + '{border-radius:24px !important;box-shadow:0 14px 34px rgba(0,0,0,.2);border-color:transparent !important}input,textarea{border-radius:16px !important}.btn{border-radius:18px !important}';
  if(a.style === 'plat') css += S + '{box-shadow:none !important;border-radius:10px !important}body{background:var(--bg) !important}.btn{border-radius:10px !important}';
  if(a.style === 'neon') css += S + '{border:1px solid color-mix(in srgb,var(--accent) 45%,transparent) !important;box-shadow:0 0 22px color-mix(in srgb,var(--accent) 16%,transparent)}.btn{box-shadow:0 0 20px color-mix(in srgb,var(--accent) 50%,transparent)}';
  if(a.style === 'editorial') css += S + '{border-radius:6px !important;box-shadow:none !important}input,textarea,.btn{border-radius:6px !important}body{background:var(--bg) !important}';
  if(a.anim && a.anim !== 'aucune'){
    var k = { fondu: 'from{opacity:0}to{opacity:1}', glisse: 'from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}', monte: 'from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}', zoom: 'from{opacity:0;transform:scale(.97)}to{opacity:1;transform:none}' }[a.anim];
    if(k) css += '@keyframes pgEntree{' + k + '}#app{animation:pgEntree .4s cubic-bezier(.16,1,.3,1) both}@media (prefers-reduced-motion:reduce){#app{animation:none}}';
  }
  var st = document.getElementById('pgTheme'); if(!st){ st = document.createElement('style'); st.id = 'pgTheme'; document.head.appendChild(st); }
  st.textContent = css;
};
})();
