// ============================================================
// SUPER APP HENZO - STUDIO DE PUBLICATION + MA MARQUE
// - Ma marque : nom, slogan, ton, structure des legendes, hashtags,
//   titres en gras (lettres Unicode), style appris, police, couleurs, logo
//   -> user_settings.user_preferences.marque (fusion, les autres cles sont gardees)
// - Creer une publication, etape par etape :
//   seance -> photos (galerie liee + photos aimees en premier) -> analyse IA
//   -> questions -> textes par reseau -> image avec titre (facultatif)
//   -> plan de diffusion (minuteur) -> enregistrement dans mk_posts
// - Apprentissage : lecons courtes dans mk_memory (style, resultat)
// Entrees : stCreer({shoot_id, nom}), stMarqueOuvrir(), stOuvrirPost(id)
// Charge par argent.js juste apres marketing.js (l'ordre n'est pas garanti :
// tout ce qui vient de marketing.js est appele plus tard, jamais au chargement).
// ============================================================

// Icones manquantes dans AG_ICONS (argent.js)
(function stIcons(){
  if(typeof AG_ICONS === 'undefined') return;
  const add = {
    check: '<path d="M5 12.5 10 17l9-10"/>',
    up: '<path d="M6 15l6-6 6 6"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6"/>',
    redo: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/>',
    type: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>'
  };
  Object.keys(add).forEach(k => { if(!AG_ICONS[k]) AG_ICONS[k] = add[k]; });
})();

const ST = {
  step: 0, q: '', shoot: null, gal: null, galSure: false, galCands: [], galErr: '', galBusy: false, galAll: null,
  photos: [], order: [], analyse: null, avantIA: null, busy: '', answers: [], skip: {}, J: null, textes: {},
  cover: { open: false, fmt: '4:5', layout: 'bas', x: 0, y: 0, zoom: 1, titre: '', img: null, imgKey: null, blob: null, added: false },
  plan: { done: {} }, post: null, lien: '', publie: false, timer: null, vitesse: 1,
  m: null, marqueLoaded: false, marqueSaved: false, showAll: false
};
window.ST_MARQUE = window.ST_MARQUE || null;

const ST_STEPS = [['seance', 'Séance'], ['photos', 'Photos'], ['analyse', 'Analyse'], ['infos', 'Infos'], ['textes', 'Textes'], ['image', 'Image'], ['diffusion', 'Diffusion']];
const ST_TYPES = [['anniversaire', 'Anniversaire'], ['mariage', 'Mariage'], ['dot', 'Dot'], ['grossesse', 'Grossesse'], ['enfant', 'Enfant'], ['couple', 'Couple'], ['famille', 'Famille'], ['portrait', 'Portrait'], ['studio', 'Studio']];
const ST_TYPE_RE = { anniversaire: /anniv/, mariage: /mariage|wedding|noce/, dot: /\bdot\b/, grossesse: /grossesse|maternit|enceinte|bump/, enfant: /enfant|bebe|kid|bapteme|naissance/, couple: /couple|fianc|love/, famille: /famill/, portrait: /portrait|book|profil|corporate/, studio: /studio/ };
const ST_BLOCS = { titre: 'Titre fort', emotion: "1 ou 2 lignes d'émotion ou d'histoire", detail: 'Détail de la séance', lieu: 'Lieu', appel: 'Appel à réserver', hashtags: 'Hashtags' };
// [cle, nom affiche, reseau mk_posts, couleur, cle du max de hashtags]
const ST_CANAUX = [
  ['page', 'Page Facebook', 'Facebook', '#1877f2'],
  ['perso', 'Profil perso Facebook', 'Facebook', '#4b8ef5'],
  ['groupes', 'Groupes Facebook', 'Facebook', '#6f9be0'],
  ['whatsapp', 'Statut WhatsApp', 'Statut WhatsApp', '#25d366'],
  ['instagram', 'Instagram', 'Instagram', '#e1306c'],
  ['tiktok', 'TikTok', 'TikTok', '#8a8a8a']
];
const ST_POLICES = {
  montserrat: { nom: 'Montserrat + Inter', titre: 'Montserrat', tw: 800, texte: 'Inter', xw: 600, note: 'Titres forts et nets, texte très lisible' },
  poppins: { nom: 'Poppins', titre: 'Poppins', tw: 700, texte: 'Poppins', xw: 500, note: 'Ronde et douce, moderne' },
  outfit: { nom: 'Outfit + Manrope', titre: 'Outfit', tw: 700, texte: 'Manrope', xw: 600, note: 'Fine et élégante, très actuelle' }
};
const ST_GROUPES = {
  anniversaire: "groupes de mamans, d'événements et de ton quartier",
  enfant: 'groupes de mamans et de parents de Bouaké',
  grossesse: 'groupes de mamans et de futures mamans',
  mariage: 'groupes de mariage, de dot et de wedding planners',
  dot: 'groupes de mariage et de dot',
  couple: 'groupes de couples et de bons plans de Bouaké',
  famille: 'groupes de familles, de mamans et de quartier',
  portrait: 'groupes de mode, de beauté et de ventes de Bouaké',
  studio: 'groupes de mode, de beauté et de ventes de Bouaké'
};
const ST_MAX_DEF = { page: 6, perso: 3, groupes: 3, whatsapp: 0, instagram: 15, tiktok: 5 };

function stMarqueDefaut(){
  return {
    nom: '', slogan: 'Sublimer chaque instant de vie', tons: ['elegant', 'chaleureux'], emojis: 'peu',
    structure: ['titre', 'emotion', 'detail', 'lieu', 'appel', 'hashtags'].map(k => ({ k, on: true })),
    lieu: 'Studio à Ahougnansou, Bouaké', fin: 'Réserve ta séance en message privé ou sur WhatsApp.', contact: '',
    hashtags_fixes: '#HenzoPhotographie #PhotographeBouaké #Bouaké #CôteDIvoire',
    hashtags_types: {
      anniversaire: '#AnniversaireBouaké #JoyeuxAnniversaire', mariage: '#MariageIvoirien #MariageBouaké', dot: '#DotIvoirienne #MariageTraditionnel',
      grossesse: '#FutureMaman #SéanceGrossesse', enfant: '#PhotoEnfant #EnfantsBouaké', couple: '#SéanceCouple #LoveStory',
      famille: '#PhotoDeFamille #FamilleBouaké', portrait: '#PortraitStudio #Portrait', studio: '#ShootingStudio #StudioPhotoBouaké'
    },
    max: Object.assign({}, ST_MAX_DEF), gras: true, accents: 'colles',
    exemples: ['', '', ''], style: [], police: 'montserrat',
    couleurs: { fond: '', texte: '#ffffff', accent: '' }, logo: null
  };
}
function stMarqueFusion(m){
  const d = stMarqueDefaut(); m = m && typeof m === 'object' ? m : {};
  const o = Object.assign({}, d, m);
  o.hashtags_types = Object.assign({}, d.hashtags_types, m.hashtags_types || {});
  o.max = Object.assign({}, d.max, m.max || {});
  o.couleurs = Object.assign({}, d.couleurs, m.couleurs || {});
  if(!Array.isArray(o.structure) || !o.structure.length) o.structure = d.structure;
  Object.keys(ST_BLOCS).forEach(k => { if(!o.structure.some(b => b.k === k)) o.structure.push({ k, on: false }); });
  if(!Array.isArray(o.tons)) o.tons = d.tons;
  if(!Array.isArray(o.exemples)) o.exemples = d.exemples;
  while(o.exemples.length < 3) o.exemples.push('');
  if(!Array.isArray(o.style)) o.style = [];
  if(!ST_POLICES[o.police]) o.police = 'montserrat';
  return o;
}
function stM(){ return window.ST_MARQUE || stMarqueFusion(null); }
function stNom(){ return typeof mkMarque === 'function' ? mkMarque() : ((stM().nom || '').trim() || 'Henzo Photographie'); }
function stVar(n, def){ try { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || def; } catch(e){ return def; } }
function stCouleurs(m){ const c = (m || stM()).couleurs || {}; return { fond: c.fond || stVar('--deep', '#00524D'), texte: c.texte || '#ffffff', accent: c.accent || stVar('--accent', '#48A89A') }; }

// ---------- Petits outils ----------
const stE = s => agEsc(s);
function stJ(o){ return stE(JSON.stringify(o)); }
function stClean(s){ return String(s == null ? '' : s).replace(/[\u2014\u2013]/g, '-'); }
function stNorm(s){ return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }
function stShoot(){ return ST.shoot ? mkShoot(ST.shoot) : null; }
function stClient(s){ return s ? mkClient(s.client_id) : null; }
function stPrenom(s){ const c = stClient(s); return c ? mkFirst(c) : ''; }
function stTypesOf(type){ const n = stNorm(type); return ST_TYPES.map(t => t[0]).filter(k => ST_TYPE_RE[k].test(n)); }
function stSel(){ return ST.order.map(k => ST.photos.find(p => p.k === k)).filter(Boolean); }
function stSim(a, b){
  const A = stNorm(a), B = stNorm(b);
  if(A === B) return 1;
  if(!A || !B) return 0;
  const wa = A.split(' '), wb = B.split(' '); const sb2 = new Set(wb);
  const n = wa.filter(w => sb2.has(w)).length;
  const lr = Math.min(A.length, B.length) / Math.max(A.length, B.length);
  return (n / Math.max(wa.length, wb.length)) * 0.7 + lr * 0.3;
}
function stRefresh(){ if(typeof mkRenderTab === 'function' && (MK.tab === 'studio' || MK.tab === 'marque')) mkRenderTab(); }

// ---------- Gras Unicode (lettres mathematiques sans-serif bold) ----------
// A-Z -> U+1D5D4, a-z -> U+1D5EE, 0-9 -> U+1D7EC. Les accents : la lettre de base en gras
// + l'accent combine (e + U+0301 -> 𝗲́), ou la lettre accentuee normale (mode 'normaux').
function stGrasChar(c){
  const k = c.charCodeAt(0);
  if(k >= 65 && k <= 90) return String.fromCodePoint(0x1D5D4 + k - 65);
  if(k >= 97 && k <= 122) return String.fromCodePoint(0x1D5EE + k - 97);
  if(k >= 48 && k <= 57) return String.fromCodePoint(0x1D7EC + k - 48);
  return null;
}
function stGras(s, mode){
  mode = mode || stM().accents || 'colles';
  let out = '';
  for(const ch of String(s || '')){
    const d = ch.normalize('NFD'), base = d[0], marks = d.slice(1);
    const b = stGrasChar(base);
    if(!b){ out += ch; continue; }
    out += !marks ? b : (mode === 'colles' ? b + marks : ch);
  }
  return out;
}
function stTitreReseau(t, canal){
  t = stClean(t).trim(); if(!t) return '';
  const m = stM();
  if(canal === 'whatsapp') return `*${t}*`;
  return m.gras === false ? t : stGras(t);
}

// ---------- Polices (Google Fonts, seulement ici) ----------
function stFonts(){
  if(document.getElementById('stFonts')) return;
  const l = document.createElement('link'); l.id = 'stFonts'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@400;500;600&family=Montserrat:wght@600;700;800&family=Outfit:wght@500;600;700&family=Poppins:wght@400;500;600;700&display=swap';
  document.head.appendChild(l);
}
async function stFontsReady(p){
  stFonts();
  try { await Promise.race([Promise.all([document.fonts.load(`${p.tw} 80px "${p.titre}"`), document.fonts.load(`${p.xw} 30px "${p.texte}"`)]), new Promise(r => setTimeout(r, 2500))]); } catch(e){}
}

// ============================================================
// STYLES
// ============================================================
(function stStyles(){
  if(document.getElementById('stStyles')) return;
  const st = document.createElement('style'); st.id = 'stStyles';
  st.textContent = `
.st-hero{display:flex;gap:8px;margin:0 0 12px}
.st-hero button{margin:0;cursor:pointer;border-radius:18px;font-family:Inter,sans-serif;text-align:left}
.st-hero .st-hm{flex:1;display:flex;align-items:center;gap:12px;padding:13px 14px;border:none;background:linear-gradient(135deg,var(--hero-1),var(--hero-2));color:#fff;box-shadow:var(--shadow-glow)}
.st-hero .st-hm .st-hi{flex:0 0 40px;height:40px;border-radius:13px;background:rgba(255,255,255,.14);display:grid;place-items:center}
.st-hero .st-hm b{display:block;font-size:15.5px}
.st-hero .st-hm small{display:block;font-size:11.5px;opacity:.8;margin-top:2px;line-height:1.3}
.st-hero .st-hs{flex:0 0 78px;width:78px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:8px 4px;background:var(--card);border:1px solid var(--border-2);color:var(--text);font-size:11.5px;font-weight:600;text-align:center}
.st-top{display:flex;align-items:center;gap:8px;margin:0 0 10px}
.st-top .ag-back{margin:0}
.st-top h2{flex:1;margin:0;font:700 15px Inter,sans-serif;color:var(--text-2);text-align:right;text-transform:none;letter-spacing:0}
.st-steps{display:flex;gap:4px;margin:0 0 14px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}
.st-steps::-webkit-scrollbar{display:none}
.st-steps button{flex:1 0 auto;width:auto;margin:0;padding:7px 9px;border-radius:11px;border:1px solid var(--border);background:var(--card2);color:var(--muted);font:600 11.5px Inter,sans-serif;cursor:pointer;display:flex;align-items:center;gap:5px;white-space:nowrap}
.st-steps button i{font-style:normal;width:17px;height:17px;border-radius:50%;display:grid;place-items:center;background:var(--card3);font-size:10px;color:var(--text-2)}
.st-steps button.done{color:var(--text-2)}
.st-steps button.done i{background:var(--accent);color:var(--pri-fg)}
.st-steps button.on{background:var(--pri-bg);color:var(--pri-fg);border-color:transparent}
.st-steps button.on i{background:var(--pri-fg);color:var(--pri-bg)}
.st-steps button:disabled{opacity:.45;cursor:default}
.st-card{background:var(--card);border:1px solid var(--border);border-radius:20px;padding:14px;margin-bottom:12px;color:var(--text)}
.st-card h3{margin:0 0 4px;font-size:15.5px;display:flex;align-items:center;gap:8px}
.st-card h3 .crm-count{margin-left:auto}
.st-card > p,.st-p{margin:0 0 10px;font-size:13px;color:var(--muted);line-height:1.5}
.st-card label{font-size:12.5px}
.st-q{position:relative;margin-bottom:10px}
.st-q input{margin:0;padding-left:38px}
.st-q .ag-i{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--muted)}
.st-row{display:flex;align-items:center;gap:10px;padding:11px 12px;border:1px solid var(--border);background:var(--card);border-radius:16px;margin-bottom:8px;cursor:pointer;color:var(--text)}
.st-row:active{transform:scale(.99)}
.st-row .st-dt{flex:0 0 46px;text-align:center;border-radius:12px;background:var(--card2);padding:6px 0;line-height:1.1}
.st-row .st-dt b{display:block;font-size:17px}
.st-row .st-dt small{font-size:10.5px;color:var(--muted);text-transform:uppercase}
.st-row .st-rd{flex:1;min-width:0}
.st-row .st-rd b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.st-row .st-rd span{font-size:12px;color:var(--muted)}
.st-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}
.st-tag{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:700;padding:3px 7px;border-radius:8px;background:var(--card3);color:var(--muted)}
.st-tag.ok{color:var(--green);background:rgba(111,224,199,.12)}
.st-tag.mid{color:var(--yellow);background:rgba(245,197,66,.12)}
.st-tag.low{color:var(--red);background:rgba(255,123,123,.12)}
.st-tag.acc{color:var(--accent)}
.st-tag .ag-i{width:11px;height:11px}
.st-gal{display:flex;align-items:center;gap:10px}
.st-gal .st-gi{flex:0 0 42px;height:42px;border-radius:12px;background:var(--card2);display:grid;place-items:center;color:var(--accent)}
.st-gal div{flex:1;min-width:0}
.st-gal b{display:block;font-size:14px}
.st-gal span{font-size:12px;color:var(--muted)}
.st-gal button,.st-link{width:auto;margin:0;padding:7px 10px;border-radius:10px;background:var(--card2);border:1px solid var(--border-2);color:var(--text);font:600 12px Inter,sans-serif;cursor:pointer}
.st-cands .mk-gl{padding:10px 2px}
.st-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
@media (min-width:640px){.st-grid{grid-template-columns:repeat(5,1fr)}}
.st-ph{position:relative;border-radius:14px;overflow:hidden;background:var(--card3);cursor:pointer;aspect-ratio:1}
.st-ph img{width:100%;height:100%;object-fit:cover;display:block;transition:opacity .15s}
.st-ph.off img{opacity:.55}
.st-ph.sel{outline:3px solid var(--accent);outline-offset:-3px}
.st-ph .st-n{position:absolute;top:6px;right:6px;min-width:24px;height:24px;border-radius:12px;background:rgba(0,0,0,.55);border:2px solid #fff;color:#fff;display:grid;place-items:center;font:700 12px Inter,sans-serif;padding:0 4px}
.st-ph.sel .st-n{background:var(--accent);border-color:var(--accent);color:var(--pri-fg)}
.st-ph .st-fav{position:absolute;left:5px;bottom:5px;display:flex;gap:3px}
.st-ph .st-fav span{display:inline-flex;align-items:center;gap:2px;padding:2px 5px;border-radius:7px;background:rgba(0,0,0,.62);color:#fff;font:700 10px Inter,sans-serif}
.st-ph .st-fav .ag-i{width:11px;height:11px}
.st-ph .st-src{position:absolute;left:5px;top:5px;padding:2px 6px;border-radius:7px;background:rgba(0,0,0,.6);color:#fff;font:600 9.5px Inter,sans-serif}
.st-sep{font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin:14px 2px 8px;display:flex;align-items:center;gap:6px}
.st-strip{display:flex;gap:8px;overflow-x:auto;padding:4px 2px 6px;scrollbar-width:thin}
.st-sp{flex:0 0 84px;position:relative}
.st-sp img{width:84px;height:84px;object-fit:cover;border-radius:12px;display:block;background:var(--card3)}
.st-sp .st-n{position:absolute;top:4px;left:4px;min-width:20px;height:20px;border-radius:10px;background:var(--accent);color:var(--pri-fg);font:700 11px Inter,sans-serif;display:grid;place-items:center;padding:0 3px}
.st-sp .st-mv{display:flex;gap:3px;margin-top:4px}
.st-sp .st-mv button{flex:1;width:auto;height:26px;margin:0;padding:0;border-radius:8px;background:var(--card2);border:1px solid var(--border);color:var(--text-2);cursor:pointer;display:grid;place-items:center}
.st-sp .st-mv button:disabled{opacity:.35}
.st-drop{display:flex;align-items:center;gap:12px;padding:14px;border:1.5px dashed var(--border-2);border-radius:16px;color:var(--text-2);cursor:pointer;margin-top:10px;background:var(--card2)}
.st-drop.over{border-color:var(--accent);background:var(--card3)}
.st-drop b{display:block;font-size:13.5px;color:var(--text)}
.st-drop span{font-size:12px;color:var(--muted)}
.st-foot{position:sticky;bottom:calc(74px + env(safe-area-inset-bottom));z-index:6;display:flex;gap:8px;padding:10px;margin:14px -4px 0;background:var(--bg-2);border:1px solid var(--border-2);border-radius:18px;box-shadow:0 -6px 24px rgba(0,0,0,.18)}
@media (min-width:1000px){body.ag-ui .st-foot{bottom:12px}}
.st-foot button{margin:0;padding:13px 12px;border-radius:13px;font:700 14px Inter,sans-serif;cursor:pointer}
.st-foot .st-b2{flex:0 0 auto;width:auto;background:var(--card2);border:1px solid var(--border);color:var(--text)}
.st-foot .st-b1{flex:1;width:auto;background:var(--pri-bg);color:var(--pri-fg);border:none;display:inline-flex;align-items:center;justify-content:center;gap:6px}
.st-foot button:disabled{opacity:.5}
.st-wait{display:flex;flex-direction:column;align-items:center;gap:10px;padding:30px 10px;color:var(--muted);font-size:13.5px;text-align:center}
.st-wait .mk-typing{align-self:center}
.st-best{display:flex;gap:12px;align-items:stretch}
.st-best img{flex:0 0 42%;width:42%;aspect-ratio:4/5;object-fit:cover;border-radius:14px;background:var(--card3)}
.st-best div{flex:1;min-width:0}
.st-best b{display:block;font-size:15px;margin:2px 0 6px}
.st-best p{margin:0;font-size:13px;line-height:1.5;color:var(--text-2)}
.st-kicker{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--accent)}
.st-mini{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
.st-mini > div{position:relative;width:62px}
.st-mini img{width:62px;height:62px;object-fit:cover;border-radius:10px;display:block;background:var(--card3)}
.st-mini i{position:absolute;top:3px;left:3px;font-style:normal;min-width:18px;height:18px;border-radius:9px;background:rgba(0,0,0,.6);color:#fff;font:700 10.5px/18px Inter,sans-serif;text-align:center;padding:0 3px}
.st-an{display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)}
.st-an:last-child{border-bottom:none}
.st-an img{flex:0 0 64px;width:64px;height:64px;object-fit:cover;border-radius:11px;background:var(--card3)}
.st-an > div{flex:1;min-width:0}
.st-an .st-note{float:right;font:800 15px Inter,sans-serif;color:var(--text)}
.st-an .st-note small{font-size:11px;color:var(--muted);font-weight:600}
.st-an b{font-size:13px}
.st-an p{margin:4px 0 0;font-size:12.5px;color:var(--text-2);line-height:1.45}
.st-qa{padding:12px 0;border-bottom:1px solid var(--border)}
.st-qa:last-child{border-bottom:none}
.st-qa b{display:block;font-size:14px;margin-bottom:8px}
.st-qa textarea{margin:0;min-height:46px;font-size:14.5px}
.st-qa .ag-pills{margin:0 0 8px}
.st-qa .st-skip{margin-top:6px;width:auto;padding:5px 9px;border-radius:9px;background:none;border:1px solid var(--border-2);color:var(--muted);font:600 11.5px Inter,sans-serif;cursor:pointer}
.st-qa.skipped{opacity:.55}
.st-tx{border-radius:18px;border:1px solid var(--border);background:var(--card);margin-bottom:12px;overflow:hidden}
.st-tx-h{display:flex;align-items:center;gap:8px;padding:11px 12px 8px;color:var(--text)}
.st-tx-h b{font-size:14.5px;flex:1}
.st-tx-h i{width:10px;height:10px;border-radius:50%;display:inline-block}
.st-tx-h .st-tag{font-weight:600}
.st-tx-b{padding:0 12px 12px}
.st-tx textarea{width:100%;margin:0;min-height:120px;font-size:14px;line-height:1.5;border-radius:13px;resize:vertical}
.st-tx .st-tones{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:8px 0 0}
.st-tx .st-tones::-webkit-scrollbar{display:none}
.st-tx .st-tones button{flex:0 0 auto;width:auto;margin:0;padding:6px 10px;border-radius:999px;background:var(--card2);border:1px solid var(--border-2);color:var(--text-2);font:600 11.5px Inter,sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:4px}
.st-tx .mk-btns{margin-top:8px}
.st-tx .st-info{font-size:12.5px;line-height:1.5;color:var(--text-2);background:var(--card2);border-radius:12px;padding:10px 11px;margin:0 0 8px}
.st-tx .st-info b{color:var(--text)}
.st-tx .st-warn{font-size:12px;color:var(--yellow);margin:0 0 8px;line-height:1.45}
.st-tx.busy{opacity:.6;pointer-events:none}
.st-cv{width:auto;max-width:100%;height:auto;max-height:58vh;display:block;margin:0 auto;border-radius:16px;background:var(--card3);touch-action:none;cursor:grab;box-shadow:0 10px 30px rgba(0,0,0,.25)}
.st-cv:active{cursor:grabbing}
.st-cvwrap{position:relative;max-width:420px;margin:0 auto}
.st-cvhint{position:absolute;left:50%;top:12px;transform:translateX(-50%);background:rgba(0,0,0,.55);color:#fff;font:600 11.5px Inter,sans-serif;padding:5px 10px;border-radius:999px;pointer-events:none;white-space:nowrap}
.st-demo{display:flex;gap:12px;align-items:center}
.st-demo canvas{flex:0 0 112px;width:112px;border-radius:12px;background:var(--card3)}
.st-demo p{margin:0;font-size:13px;color:var(--text-2);line-height:1.5}
.st-lay{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:6px 0 4px}
.st-lay button{margin:0;width:auto;padding:8px 6px;border-radius:12px;background:var(--card2);border:1px solid var(--border);color:var(--text-2);font:600 12px Inter,sans-serif;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px}
.st-lay button.on{border-color:var(--accent);color:var(--text);background:var(--card3)}
.st-lay svg{width:34px;height:42px}
.st-plan{list-style:none;margin:0;padding:0}
.st-plan li{display:flex;gap:10px;padding:12px 0;border-bottom:1px solid var(--border)}
.st-plan li:last-child{border-bottom:none}
.st-plan input[type=checkbox]{flex:0 0 22px;width:22px;height:22px;margin:2px 0 0;accent-color:var(--accent)}
.st-plan .st-pt{flex:1;min-width:0}
.st-plan .st-pt b{display:block;font-size:14px;color:var(--text)}
.st-plan .st-pt span{display:block;font-size:12.5px;color:var(--muted);line-height:1.45;margin-top:2px}
.st-plan .st-h{flex:0 0 auto;font:800 13px Inter,sans-serif;color:var(--accent);margin-top:2px}
.st-plan li.done b{text-decoration:line-through;color:var(--muted)}
.st-plan .st-pt button{margin:8px 6px 0 0;width:auto;padding:6px 10px;border-radius:10px;background:var(--card2);border:1px solid var(--border-2);color:var(--text);font:600 12px Inter,sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:5px}
.st-timer{position:sticky;top:calc(env(safe-area-inset-top) + 64px);z-index:7;display:flex;align-items:center;gap:10px;padding:10px 12px;margin:0 0 12px;border-radius:16px;background:var(--pri-bg);color:var(--pri-fg);font:600 13px Inter,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.25)}
.st-timer b{font:800 20px Inter,sans-serif;font-variant-numeric:tabular-nums}
.st-timer span{flex:1;min-width:0;line-height:1.3}
.st-timer button{width:auto;margin:0;padding:6px 10px;border-radius:10px;border:none;background:rgba(0,0,0,.15);color:inherit;font:700 12px Inter,sans-serif;cursor:pointer}
.st-tips{margin:8px 0 0;padding-left:18px;font-size:13px;color:var(--text-2);line-height:1.5}
.st-tips li{margin:3px 0}
.st-ok{display:flex;align-items:center;gap:10px;padding:12px;border-radius:14px;background:var(--card2);border:1px solid var(--border);margin:10px 0;cursor:pointer;font-size:14px;font-weight:600;color:var(--text)}
.st-ok input{width:22px;height:22px;margin:0;accent-color:var(--accent)}
/* Ma marque */
.st-blocs{list-style:none;margin:6px 0 0;padding:0}
.st-blocs li{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--border);background:var(--card2);border-radius:12px;margin-bottom:6px;font-size:13.5px;color:var(--text)}
.st-blocs li.off{opacity:.5}
.st-blocs li span{flex:1}
.st-blocs li i{font-style:normal;width:20px;height:20px;border-radius:50%;background:var(--card3);display:grid;place-items:center;font:700 11px Inter,sans-serif;color:var(--text-2)}
.st-blocs input{width:20px;height:20px;margin:0;accent-color:var(--accent)}
.st-blocs button{width:30px;height:30px;margin:0;padding:0;border-radius:9px;background:var(--card3);border:none;color:var(--text-2);cursor:pointer;display:grid;place-items:center}
.st-blocs button:disabled{opacity:.3}
.st-fonts{display:grid;gap:8px}
.st-font{display:block;width:100%;margin:0;text-align:left;padding:14px;border-radius:16px;border:1.5px solid var(--border);background:var(--card2);color:var(--text);cursor:pointer;position:relative}
.st-font.on{border-color:var(--accent);background:var(--card3)}
.st-font .st-fa{display:block;font-size:24px;line-height:1.15;letter-spacing:-.01em}
.st-font .st-fb{display:block;font-size:12px;letter-spacing:.22em;text-transform:uppercase;opacity:.75;margin-top:6px}
.st-font small{display:block;font:500 11.5px Inter,sans-serif;color:var(--muted);margin-top:8px}
.st-font .st-chk{position:absolute;top:12px;right:12px;width:22px;height:22px;border-radius:50%;border:2px solid var(--border-2);display:grid;place-items:center}
.st-font.on .st-chk{background:var(--accent);border-color:var(--accent);color:var(--pri-fg)}
.st-prev{white-space:pre-wrap;font-size:14px;line-height:1.5;background:var(--card2);border-radius:12px;padding:10px 12px;margin:6px 0;color:var(--text);word-break:break-word}
.st-prev small{display:block;font-size:11px;color:var(--muted);margin-bottom:3px}
.st-g2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.st-g3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.st-g2 label,.st-g3 label{margin:0;font-size:12px}
.st-g2 input,.st-g3 input{margin:3px 0 0}
.st-col{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:12px;background:var(--card2);border:1px solid var(--border)}
.st-col input[type=color]{width:34px;height:34px;padding:0;margin:0;border:none;border-radius:9px;background:none}
.st-logo{display:flex;align-items:center;gap:12px;margin-top:8px}
.st-logo .st-lb{width:72px;height:72px;border-radius:14px;background:repeating-conic-gradient(var(--card3) 0 25%, var(--card2) 0 50%) 0 0/14px 14px;display:grid;place-items:center;overflow:hidden}
.st-logo img{max-width:64px;max-height:64px}
.st-rules{margin:8px 0 0;padding-left:18px;font-size:13px;color:var(--text);line-height:1.5}
.st-swatch{display:flex;height:36px;border-radius:12px;overflow:hidden;margin-top:8px;border:1px solid var(--border)}
.st-swatch div{flex:1;display:grid;place-items:center;font:700 12px Inter,sans-serif}
`;
  document.head.appendChild(st);
})();

// ============================================================
// MA MARQUE : chargement, enregistrement
// ============================================================
async function stLirePrefs(){
  const uid = typeof mkUid === 'function' ? await mkUid() : null;
  if(!uid) return null;
  const { data } = await sb.from('user_settings').select('user_preferences').eq('user_id', uid).maybeSingle();
  return (data && data.user_preferences) || {};
}
async function stChargerMarque(force){
  if(ST.marqueLoaded && !force) return window.ST_MARQUE;
  try {
    const pr = await stLirePrefs();
    const m = pr && pr.marque;
    ST.marqueSaved = !!(m && typeof m === 'object');
    window.ST_MARQUE = stMarqueFusion(m);
  } catch(e){ if(!window.ST_MARQUE) window.ST_MARQUE = stMarqueFusion(null); }
  ST.marqueLoaded = true;
  return window.ST_MARQUE;
}
// Fusion : on relit la marque enregistree et on ne remplace que ce qui change.
// crmSavePrefs garde les autres cles de user_preferences (theme, tarifs...).
async function stSauverMarque(m){
  let cur = {};
  try { const pr = await stLirePrefs(); cur = (pr && pr.marque) || {}; } catch(e){}
  const out = Object.assign({}, cur, m);
  let ok = false;
  if(typeof crmSavePrefs === 'function') ok = await crmSavePrefs({ marque: out });
  else {
    try {
      const uid = await mkUid();
      const { data } = await sb.from('user_settings').select('id,user_preferences').eq('user_id', uid).maybeSingle();
      const prefs = Object.assign({}, (data && data.user_preferences) || {}, { marque: out });
      const { error } = data ? await sb.from('user_settings').update({ user_preferences: prefs }).eq('id', data.id)
        : await sb.from('user_settings').upsert({ user_id: uid, user_preferences: prefs }, { onConflict: 'user_id' });
      ok = !error;
    } catch(e){ ok = false; }
    if(!ok) agAlert("Ta marque n'a pas pu être enregistrée. Vérifie ta connexion et réessaie.");
  }
  if(ok){ window.ST_MARQUE = stMarqueFusion(out); ST.marqueSaved = true; }
  return ok;
}

// ============================================================
// ENTREES
// ============================================================
function stTopHtml(){
  return `<div class="st-hero">
    <button class="st-hm" onclick="stCreer()"><span class="st-hi">${agIcon('sparkles', 22)}</span><span><b>Créer une publication</b><small>Séance, photos, textes pour chaque réseau, image et plan de diffusion</small></span></button>
    <button class="st-hs" onclick="stMarqueOuvrir()">${agIcon('palette', 20)}Ma marque</button>
  </div>`;
}
function stAller(tab){
  MK.tab = tab;
  if(typeof agGoTab === 'function' && !(document.querySelector('.page.active') || {}).id?.includes('marketing')) agGoTab('marketing');
  if(typeof mkRender === 'function') mkRender(); else stRefresh();
  window.scrollTo({ top: 0 });
}
function stReset(){
  stTimerStop(true);
  Object.assign(ST, { step: 0, q: '', shoot: null, gal: null, galSure: false, galCands: [], galErr: '', galBusy: false,
    photos: [], order: [], analyse: null, avantIA: null, busy: '', answers: [], skip: {}, J: null, textes: {},
    cover: { open: false, fmt: '4:5', layout: 'bas', x: 0, y: 0, zoom: 1, titre: '', img: null, imgKey: null, blob: null, added: false },
    plan: { done: {} }, post: null, lien: '', publie: false, showAll: false });
}
window.stCreer = function(o){
  o = o || {};
  stReset();
  stAller('studio');
  stChargerMarque();
  stGalListe().then(l => { ST.galAll = l; if(ST.step === 0) stRefresh(); }).catch(e => { ST.galErr = e.message; });
  if(o.shoot_id && mkShoot(o.shoot_id)){ stChoisirSeance(Number(o.shoot_id)); return; }
  ST.q = o.nom || '';
  stRefresh();
};
window.stMarqueOuvrir = async function(){
  await stChargerMarque();
  ST.m = JSON.parse(JSON.stringify(stMarqueFusion(window.ST_MARQUE)));
  if(!ST.m.nom) ST.m.nom = stNom();
  stFonts();
  stAller('marque');
};

// ---------- Rendu (appele par mkRenderTab) ----------
window.stRender = function(el){
  if(MK.tab === 'marque'){ el.innerHTML = stMarqueHtml(); stMarqueAfter(); return; }
  el.innerHTML = stStudioHtml();
  if(typeof mkHydrate === 'function') mkHydrate(el);
  stAfter();
};

// ============================================================
// STUDIO : ecran general
// ============================================================
function stStudioHtml(){
  const s = stShoot();
  const steps = `<div class="st-steps">${ST_STEPS.map(([k, l], i) => `<button class="${i === ST.step ? 'on' : i < ST.step ? 'done' : ''}" ${i > 0 && !s ? 'disabled' : ''} onclick="stGoStep(${i})"><i>${i < ST.step ? agIcon('check', 10) : i + 1}</i>${l}</button>`).join('')}</div>`;
  const body = [stStepSeance, stStepPhotos, stStepAnalyse, stStepInfos, stStepTextes, stStepImage, stStepDiffusion][ST.step]();
  return `<div class="st-top"><button class="ag-back" onclick="stQuitter()">${agIcon('chev', 16)} Marketing</button><h2>Créer une publication</h2></div>
    ${stTimerHtml()}${steps}${body}`;
}
function stQuitter(){ MK.tab = 'chat'; mkRenderTab(); window.scrollTo({ top: 0 }); }
function stGoStep(i){
  if(i > 0 && !stShoot()) return;
  stSyncFields();
  ST.step = Math.max(0, Math.min(ST_STEPS.length - 1, i));
  stRefresh(); window.scrollTo({ top: 0 });
  stOnEnter();
}
function stNext(){ stGoStep(ST.step + 1); }
function stPrev(){ stGoStep(ST.step - 1); }
// Actions a l'entree d'une etape
function stOnEnter(){
  const k = ST_STEPS[ST.step][0];
  if(k === 'analyse' && !ST.analyse && !ST.busy && stSel().length) stAnalyser();
  if(k === 'textes' && !ST.J && !ST.busy) stTextesGen();
  if(k === 'image' && !ST.cover.titre) ST.cover.titre = stTitre();
}
function stFoot(main, opt){
  opt = opt || {};
  return `<div class="st-foot">${ST.step > 0 ? `<button class="st-b2" onclick="stPrev()">${agIcon('chev', 14).replace('class="ag-i"', 'class="ag-i" style="transform:rotate(180deg)"')}</button>` : ''}
    ${opt.skip ? `<button class="st-b2" onclick="${opt.skip}">Passer</button>` : ''}
    <button class="st-b1" ${opt.disabled ? 'disabled' : ''} onclick="${opt.action || 'stNext()'}">${main}</button></div>`;
}
// Garde ce qui est tape avant un nouveau rendu
function stSyncFields(){
  document.querySelectorAll('[data-st-tx]').forEach(t => { const c = t.dataset.stTx; if(ST.textes[c]) ST.textes[c].texte = t.value; });
  document.querySelectorAll('[data-st-qa]').forEach(t => { ST.answers[Number(t.dataset.stQa)] = t.value; });
  const l = document.getElementById('stLien'); if(l) ST.lien = l.value.trim();
  const ti = document.getElementById('stCvTitre'); if(ti) ST.cover.titre = ti.value;
}
function stAfter(){
  const k = ST_STEPS[ST.step][0];
  if(k === 'photos') stDropSetup();
  if(k === 'image') stCoverMount();
  if(k === 'textes') document.querySelectorAll('[data-st-tx]').forEach(stGrow);
}
function stGrow(t){ t.style.height = 'auto'; t.style.height = Math.min(520, t.scrollHeight + 4) + 'px'; }

// ============================================================
// ETAPE 1 : LA SEANCE
// ============================================================
function stSeanceTxt(s){
  const c = mkClient(s.client_id);
  const team = (Array.isArray(s.equipe) ? s.equipe : []).map(e => (mkClient(e.personne_id) || {}).name).filter(Boolean);
  return stNorm([c && c.name, s.type, s.location, s.notes ? String(s.notes).slice(0, 200) : '', mkDateTxt(s.date, { day: 'numeric', month: 'long', year: 'numeric' }), mkDateTxt(s.date, { month: 'long' }), mkDay(s.date), ...team].join(' '));
}
function stSeances(q){
  const now = Date.now();
  const all = (typeof shoots !== 'undefined' ? shoots : []).filter(s => s.date && !mkCancelled(s));
  const words = stNorm(q).split(' ').filter(Boolean);
  const list = words.length ? all.filter(s => { const t = stSeanceTxt(s); return words.every(w => t.includes(w)); }) : all;
  const past = list.filter(s => new Date(s.date).getTime() <= now).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const fut = list.filter(s => new Date(s.date).getTime() > now).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return past.concat(fut);
}
function stPubState(s){
  const ps = (MK.posts || []).filter(p => p.shoot_id === s.id && p.status !== 'annule');
  if(ps.some(p => p.status === 'publie')) return ['ok', 'Déjà publiée'];
  if(ps.length) return ['mid', 'Publication prévue'];
  return ['', 'Pas encore publiée'];
}
function stGalState(s){
  if(!ST.galAll) return ST.galErr ? null : ['', 'Galerie : recherche...'];
  const r = stGalRank(s, ST.galAll);
  if(r[0] && r[0].sc >= 90 && (!r[1] || r[1].sc < r[0].sc - 25)) return ['ok', 'Galerie trouvée'];
  if(r[0] && r[0].sc >= 30) return ['mid', 'Galerie possible'];
  return ['low', 'Pas de galerie'];
}
function stSeanceRow(s){
  const c = mkClient(s.client_id), d = new Date(s.date);
  const role = c && typeof estClient === 'function' && !estClient(c) ? (typeof eqRoleLabel === 'function' ? eqRoleLabel(c) : (c.role || '')) : '';
  const g = stGalState(s), p = stPubState(s), fut = d.getTime() > Date.now();
  return `<div class="st-row" onclick="stChoisirSeance(${s.id})">
    <div class="st-dt"><b>${d.getDate()}</b><small>${stE(d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''))} ${String(d.getFullYear()).slice(2)}</small></div>
    <div class="st-rd"><b>${stE(c ? c.name : 'Sans nom')}${role ? ` <span class="st-tag acc">${stE(role)}</span>` : ''}</b>
      <span>${stE(s.type || 'Séance')}${s.collab ? ' · collab' : ''} · ${stE(mkDateTxt(s.date, { day: 'numeric', month: 'long', year: 'numeric' }))}${fut ? ' · à venir' : ''}</span>
      <div class="st-tags">${g ? `<span class="st-tag ${g[0]}">${agIcon('image', 11)} ${g[1]}</span>` : ''}<span class="st-tag ${p[0]}">${p[0] === 'ok' ? agIcon('check', 11) + ' ' : ''}${p[1]}</span></div></div>
    ${agIcon('chev', 16)}</div>`;
}
function stStepSeance(){
  const list = stSeances(ST.q);
  const n = ST.showAll ? 80 : 20;
  return `<div class="st-card"><h3>${agIcon('camera', 18)} Quelle séance publier ?</h3>
      <p>Cherche par prénom, type de séance ou date. Toutes tes séances sont là, même les plus anciennes.</p>
      <div class="st-q">${agIcon('search', 17)}<input id="stQ" value="${stE(ST.q)}" placeholder="Ex : Destinée, anniversaire, avril 2026" oninput="ST.q=this.value;stSeanceList()" autocomplete="off"></div>
    </div>
    <div id="stSeList">${stSeanceListHtml(list, n)}</div>`;
}
function stSeanceListHtml(list, n){
  if(!list.length) return `<div class="ag-list"><div class="ag-empty">Aucune séance trouvée${ST.q ? ` pour "${stE(ST.q)}"` : ''}.</div></div>`;
  return list.slice(0, n).map(stSeanceRow).join('') + (list.length > n ? `<button class="btn-secondary" onclick="ST.showAll=true;stSeanceList()">Voir plus (${list.length - n})</button>` : '');
}
function stSeanceList(){ const b = document.getElementById('stSeList'); if(b) b.innerHTML = stSeanceListHtml(stSeances(ST.q), ST.showAll ? 80 : 20); }
async function stChoisirSeance(id){
  if(ST.shoot !== id){ ST.photos = []; ST.order = []; ST.analyse = null; ST.J = null; ST.textes = {}; ST.answers = []; ST.gal = null; ST.post = null; ST.plan = { done: {} }; ST.publie = false; ST.lien = ''; ST.cover.titre = ''; ST.cover.img = null; ST.cover.added = false; }
  ST.shoot = id; ST.step = 1;
  ST.answers = ST.answers.length ? ST.answers : stLireReponses(mkShoot(id));
  stRefresh(); window.scrollTo({ top: 0 });
  await stTrouverGalerie();
}

// ============================================================
// ETAPE 2 : LES PHOTOS
// ============================================================
function stLinks(){ try { return JSON.parse(localStorage.getItem('stGalLinks') || '{}') || {}; } catch(e){ return {}; } }
function stLinkSet(shootId, code){ try { const l = stLinks(); l[shootId] = code; localStorage.setItem('stGalLinks', JSON.stringify(l)); } catch(e){} }
async function stGalListe(){
  if(typeof galApi !== 'function') throw new Error("La galerie n'est pas encore chargée. Réessaie dans un instant, ou ajoute tes photos du téléphone.");
  if(typeof galPwd !== 'undefined' && !galPwd && typeof getGaleriePwd === 'function') galPwd = await getGaleriePwd();
  if(typeof galPwd === 'undefined' || !galPwd) throw new Error("Connecte d'abord ta galerie dans l'onglet Galerie, ou ajoute tes photos du téléphone.");
  if(typeof galList !== 'undefined' && galList.length) return galList;
  const l = await galApi('/api/admin/galeries');
  try { galList = Array.isArray(l) ? l : []; galLoaded = true; } catch(e){}
  return Array.isArray(l) ? l : [];
}
// Lien galerie <-> seance : meme numero, meme nom, date de creation juste apres la seance, type
function stGalScore(g, s){
  const link = stLinks()[s.id];
  if(link && link === g.code) return 1000;
  const c = mkClient(s.client_id); let sc = 0;
  if(c){
    const ph = x => String(x || '').replace(/\D/g, '').slice(-8);
    if(c.phone && g.telephone && ph(c.phone).length === 8 && ph(c.phone) === ph(g.telephone)) sc += 100;
    const a = stNorm(c.name), b = stNorm(g.nomClient);
    if(a && a === b) sc += 80;
    else if(a && b){
      const A = a.split(' ').filter(w => w.length > 2), B = b.split(' ').filter(w => w.length > 2);
      const n = A.filter(w => B.includes(w)).length;
      if(n) sc += n === A.length ? 70 : 45;
      else if(A[0] && B.some(w => w.slice(0, 4) === A[0].slice(0, 4) || stSim(w, A[0]) > 0.8)) sc += 25;
    }
  }
  if(g.dateCreation && s.date){
    const d = (new Date(g.dateCreation) - new Date(s.date)) / 864e5;
    if(d >= -3 && d <= 45) sc += 20; else if(d < -3) sc -= 30; else sc -= 5;
  }
  const cats = stNorm((g.categories || []).filter(x => x !== 'Tout').join(' '));
  const ty = stTypesOf(s.type);
  if(cats && ty.some(t => ST_TYPE_RE[t].test(cats))) sc += 10;
  return sc;
}
function stGalRank(s, list){ return (list || []).map(g => ({ g, sc: stGalScore(g, s) })).sort((a, b) => b.sc - a.sc); }
async function stTrouverGalerie(){
  const s = stShoot(); if(!s) return;
  if(ST.gal){ if(!ST.photos.some(p => p.src === 'galerie')) await stChargerPhotos(); return; }
  ST.galBusy = true; ST.galErr = ''; stRefresh();
  try {
    const list = ST.galAll || await stGalListe(); ST.galAll = list;
    const r = stGalRank(s, list);
    const sure = r[0] && r[0].sc >= 90 && (!r[1] || r[1].sc < r[0].sc - 25);
    ST.galCands = r.filter(x => x.sc >= 25).slice(0, 5).map(x => x.g);
    if(sure){ ST.gal = r[0].g; ST.galSure = true; stLinkSet(s.id, r[0].g.code); await stChargerPhotos(); }
  } catch(e){ ST.galErr = e.message || String(e); }
  ST.galBusy = false; stRefresh();
}
async function stChoisirGalerie(code){
  const s = stShoot(); const g = (ST.galAll || []).find(x => x.code === code); if(!g || !s) return;
  ST.gal = g; ST.galSure = true; stLinkSet(s.id, code);
  ST.photos = ST.photos.filter(p => p.src !== 'galerie'); ST.order = ST.order.filter(k => ST.photos.some(p => p.k === k));
  agCloseSheet('stGalPick');
  ST.galBusy = true; stRefresh();
  await stChargerPhotos();
  ST.galBusy = false; stRefresh();
}
function stGalChanger(){
  const list = (ST.galAll || []).slice().sort((a, b) => String(b.dateCreation).localeCompare(String(a.dateCreation)));
  agSheet('stGalPick', `<h3>Choisir la galerie</h3>
    <input placeholder="Rechercher" oninput="const q=this.value.toLowerCase();document.querySelectorAll('#stGalPickL .mk-gl').forEach(r=>r.style.display=r.dataset.n.includes(q)?'':'none')" style="margin-bottom:8px">
    <div id="stGalPickL">${list.map(g => `<div class="mk-gl" data-n="${stE((g.nomClient + ' ' + g.code).toLowerCase())}" onclick="stChoisirGalerie(${stJ(g.code)})">${agIcon('image', 18)} <b>${stE(g.nomClient || g.code)}</b><span>${g.nbPhotos || 0} photos · ${stE(mkDateTxt(g.dateCreation, { day: 'numeric', month: 'short', year: 'numeric' }))}</span></div>`).join('') || '<div class="ag-empty">Aucune galerie.</div>'}</div>`);
}
// Photos de la galerie + ce que le client a aime, choisi, telecharge
async function stChargerPhotos(){
  const g = ST.gal; if(!g) return;
  try {
    const r = await galApi('/api/admin/galeries/' + encodeURIComponent(g.code) + '/photos');
    const dossier = r.dossier || g.dossier, files = r.photos || [];
    let A = null;
    try { A = await galApi('/api/admin/activite/' + encodeURIComponent(dossier)); }
    catch(e){
      A = { evenements: [], interactions: [], selections: [] };
      try { A.interactions = await galApi('/api/admin/interactions/' + encodeURIComponent(dossier)); } catch(er){}
      try { A.selections = await galApi('/api/admin/selections/' + encodeURIComponent(dossier)); } catch(er){}
    }
    const fav = {};
    const add = (f, k) => { if(!f || f === '__galerie__') return; (fav[f] = fav[f] || { l: 0, d: 0, s: 0, c: 0 })[k]++; };
    (A.interactions || []).forEach(i => { if(i.type === 'like') add(i.fichier, 'l'); if(i.type === 'commentaire') add(i.fichier, 'c'); });
    (A.evenements || []).forEach(e => { if(e.type === 'telechargement_photo') add((e.details || {}).fichier, 'd'); if(e.type === 'like') add((e.details || {}).fichier, 'l'); });
    (A.selections || []).forEach(x => (x.photos || []).forEach(f => add(f, 's')));
    const score = f => { const v = fav[f]; return v ? v.l * 3 + v.s * 3 + v.d * 2 + v.c * 2 : 0; };
    const list = files.map((f, i) => ({ k: 'g:' + f, src: 'galerie', f, dossier, i, url: galPhotoUrl(dossier, f, 'medium'), thumb: galPhotoUrl(dossier, f, 'thumb'), fav: fav[f] || null, sc: score(f) }))
      .sort((a, b) => (b.sc - a.sc) || (a.i - b.i));
    const others = ST.photos.filter(p => p.src !== 'galerie');
    ST.photos = list.concat(others);
    // Pre-selection : les photos aimees (6 au plus), sinon les 4 premieres
    if(!ST.order.some(k => k.startsWith('g:'))){
      const pre = list.filter(p => p.sc > 0).slice(0, 6);
      ST.order = (pre.length ? pre : list.slice(0, 4)).map(p => p.k).concat(ST.order);
    }
    ST.favCount = list.filter(p => p.sc > 0).length;
  } catch(e){ ST.galErr = e.message || String(e); }
}
function stFavHtml(p){
  const v = p.fav; if(!v) return '';
  return `<div class="st-fav">${v.l ? `<span title="Aimée">${agIcon('heart', 11)}${v.l > 1 ? v.l : ''}</span>` : ''}${v.s ? `<span title="Choisie">${agIcon('check', 11)}</span>` : ''}${v.d ? `<span title="Téléchargée">${agIcon('download', 11)}</span>` : ''}${v.c ? `<span title="Commentée">${agIcon('chat', 11)}</span>` : ''}</div>`;
}
function stThumb(p){ return p.file || p.preview ? (p.preview || '') : (p.thumb || p.url || ''); }
function stImgTag(p, extra){ return p.path && !p.preview ? mkImgTag({ path: p.path }, extra) : `<img src="${stE(stThumb(p))}" loading="lazy" alt="" ${extra || ''}>`; }
function stAncien(s){ return (MK.posts || []).filter(p => p.shoot_id === s.id && p.status !== 'annule' && typeof mkStudioNotes === 'function' && mkStudioNotes(p.notes)).pop() || null; }
function stStepPhotos(){
  const s = stShoot(); if(!s) return stStepSeance();
  const c = stClient(s);
  let galBox;
  if(ST.galBusy) galBox = `<div class="st-gal"><span class="st-gi">${agIcon('image', 20)}</span><div><b>Recherche de la galerie...</b><span>Si le serveur dormait, ça peut prendre 1 minute.</span></div></div>`;
  else if(ST.gal) galBox = `<div class="st-gal"><span class="st-gi">${agIcon('image', 20)}</span><div><b>Galerie trouvée</b><span>${stE(ST.gal.nomClient || ST.gal.code)} · code ${stE(ST.gal.code)}${ST.favCount ? ` · ${ST.favCount} photo${ST.favCount > 1 ? 's' : ''} aimée${ST.favCount > 1 ? 's' : ''}` : ''}</span></div><button onclick="stGalChanger()">Changer</button></div>`;
  else if(ST.galErr) galBox = `<div class="ag-hint warn" style="margin:0">${stE(ST.galErr)}</div>`;
  else galBox = `<div class="st-gal"><span class="st-gi">${agIcon('image', 20)}</span><div><b>Galerie pas trouvée à coup sûr</b><span>${ST.galCands.length ? 'Celles qui ressemblent :' : 'Aucune galerie ne ressemble à cette séance.'}</span></div>${(ST.galAll || []).length ? `<button onclick="stGalChanger()">Toutes</button>` : ''}</div>
      ${ST.galCands.length ? `<div class="st-cands">${ST.galCands.map(g => `<div class="mk-gl" onclick="stChoisirGalerie(${stJ(g.code)})">${agIcon('image', 18)} <b>${stE(g.nomClient || g.code)}</b><span>${g.nbPhotos || 0} photos · ${stE(mkDateTxt(g.dateCreation, { day: 'numeric', month: 'short' }))}</span></div>`).join('')}</div>` : ''}`;
  const sel = stSel();
  const favs = ST.photos.filter(p => p.sc > 0), rest = ST.photos.filter(p => !(p.sc > 0));
  const tile = p => { const i = ST.order.indexOf(p.k);
    return `<div class="st-ph ${i >= 0 ? 'sel' : sel.length ? 'off' : ''}" onclick="stTogglePhoto(${stJ(p.k)})">${stImgTag(p)}${p.src !== 'galerie' ? `<span class="st-src">${p.src === 'couverture' ? 'image titre' : p.src}</span>` : ''}${stFavHtml(p)}<span class="st-n">${i >= 0 ? i + 1 : ''}</span></div>`; };
  return `<div class="st-card">
      <div class="st-kicker">${stE(s.type || 'Séance')} · ${stE(mkDateTxt(s.date, { day: 'numeric', month: 'long', year: 'numeric' }))}</div>
      <h3 style="margin:2px 0 10px">${stE(c ? c.name : 'Séance')}</h3>
      ${galBox}
      ${!ST.post && stAncien(s) ? `<div class="ag-hint warn" style="margin-top:10px">Tu as déjà préparé une publication pour cette séance avec le studio. <button class="st-link" onclick="stOuvrirPost(${stAncien(s).id})">La rouvrir</button></div>` : ''}
    </div>
    ${sel.length ? `<div class="st-card"><h3>${agIcon('star', 17)} Ta publication<span class="crm-count">${sel.length}</span></h3>
      <p style="margin-bottom:6px">Dans cet ordre. La 1re photo est celle que les gens voient en premier.</p>
      <div class="st-strip">${sel.map((p, i) => `<div class="st-sp" draggable="true" ondragstart="ST.drag=${i}" ondragover="event.preventDefault()" ondrop="event.preventDefault();stMove(ST.drag, ${i})">${stImgTag(p)}<span class="st-n">${i + 1}</span>
        <div class="st-mv"><button title="Avant" ${i === 0 ? 'disabled' : ''} onclick="stMove(${i},${i - 1})">${agIcon('chev', 13).replace('class="ag-i"', 'class="ag-i" style="transform:rotate(180deg)"')}</button><button title="Après" ${i === sel.length - 1 ? 'disabled' : ''} onclick="stMove(${i},${i + 1})">${agIcon('chev', 13)}</button></div></div>`).join('')}</div></div>` : ''}
    ${favs.length ? `<div class="st-sep">${agIcon('heart', 13)} Aimées, choisies ou téléchargées par la cliente (${favs.length})</div><div class="st-grid">${favs.map(tile).join('')}</div>` : ''}
    ${rest.length ? `<div class="st-sep">${favs.length ? 'Les autres photos' : 'Les photos'} (${rest.length})</div><div class="st-grid">${rest.map(tile).join('')}</div>` : ''}
    <div class="st-drop" id="stDrop" onclick="stPickFiles()">${agIcon('plus', 22)}<div><b>Ajouter des photos du téléphone ou de l'ordinateur</b><span>Touche ici, ou glisse tes photos dans ce cadre</span></div></div>
    <div class="ag-hint">Touche une photo pour la mettre ou l'enlever. 10 photos au plus (Facebook en montre 10 dans une publication).</div>
    ${stFoot(`${agIcon('sparkles', 16)} Analyser ${sel.length ? 'les ' + Math.min(sel.length, 8) + ' photos' : ''}`, { disabled: !sel.length, action: 'stVersAnalyse()' })}`;
}
function stTogglePhoto(k){
  const i = ST.order.indexOf(k);
  if(i >= 0) ST.order.splice(i, 1);
  else { if(ST.order.length >= 10){ agToast('10 photos au plus', 'error'); return; } ST.order.push(k); }
  ST.analyse = null; ST.J = null;
  stRefresh();
}
function stMove(a, b){
  if(a == null || b == null || a === b || b < 0 || b >= ST.order.length) return;
  const k = ST.order.splice(a, 1)[0]; ST.order.splice(b, 0, k); ST.drag = null;
  stRefresh();
}
function stPickFiles(){
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true; inp.style.display = 'none';
  inp.onchange = () => { stAddFiles(inp.files); inp.remove(); };
  document.body.appendChild(inp); inp.click();
}
function stAddFiles(files){
  const src = mkIsMobile() ? 'téléphone' : 'ordinateur';
  const list = [...(files || [])].filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name || ''));
  let n = 0;
  list.forEach(f => {
    const k = 'f:' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    ST.photos.push({ k, src, file: f, preview: URL.createObjectURL(f) });
    if(ST.order.length < 10){ ST.order.push(k); n++; }
  });
  if(list.length){ ST.analyse = null; ST.J = null; agToast(`${list.length} photo${list.length > 1 ? 's' : ''} ajoutée${list.length > 1 ? 's' : ''}`); stRefresh(); }
}
function stDropSetup(){
  const z = document.getElementById('stDrop'); if(!z || z.dataset.on) return;
  z.dataset.on = '1';
  ['dragenter', 'dragover'].forEach(ev => z.addEventListener(ev, e => { if(e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files')){ e.preventDefault(); z.classList.add('over'); } }));
  z.addEventListener('dragleave', () => z.classList.remove('over'));
  z.addEventListener('drop', e => { e.preventDefault(); z.classList.remove('over'); if(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) stAddFiles(e.dataTransfer.files); });
}
function stVersAnalyse(){ ST.analyse = ST.analyse || null; stGoStep(2); }

// ============================================================
// IA : contexte, appels
// ============================================================
function stSystem(){
  return `Tu aides Henzo, photographe et vidéaste à Bouaké (Côte d'Ivoire), à publier ses séances. Sa marque : "${stNom()}" (écris toujours ce nom exact). Studio au quartier Ahougnansou, en face du restaurant Le Rosier.
Règles : français simple et chaleureux, phrases courtes, pas de mots techniques ni anglais. Jamais de tiret long, seulement "-". Tu ne publies pas à sa place : tu prépares les textes, il copie et publie lui-même. Respecte la vie privée : prénom seulement, jamais le nom de famille ni le numéro du client.

${stContexte()}`;
}
function stContexte(){
  const m = stM(), s = stShoot(), L = [];
  L.push(`MARQUE : ${stNom()}${m.slogan ? ', slogan "' + m.slogan + '"' : ''}. Ton : ${(m.tons || []).map(t => ({ elegant: 'élégant', chaleureux: 'chaleureux', fun: 'fun' }[t] || t)).join(', ') || 'chaleureux'}. Emojis : ${{ aucun: 'aucun', peu: 'un peu (2 ou 3 au plus)', beaucoup: 'beaucoup' }[m.emojis] || 'un peu'}.`);
  L.push(`Lieu : ${m.lieu || 'Ahougnansou, Bouaké'}. Phrase de fin : ${m.fin || 'aucune'}. Contact : ${m.contact || 'en message privé'}.`);
  const style = (m.style || []).slice(0, 10);
  const memo = (MK.mem || []).filter(x => x.kind === 'style').slice(-8).map(x => x.text);
  if(style.length || memo.length) L.push('STYLE APPRIS (à respecter) :\n' + style.concat(memo).map(x => '- ' + x).join('\n'));
  const res = (MK.mem || []).filter(x => x.kind === 'resultat').slice(-4).map(x => x.text);
  if(res.length) L.push('CE QUI A MARCHÉ :\n' + res.map(x => '- ' + x).join('\n'));
  const pub = (MK.posts || []).filter(p => p.status === 'publie').sort((a, b) => String(b.published_at || b.date).localeCompare(String(a.published_at || a.date))).slice(0, 5);
  if(pub.length) L.push('5 DERNIÈRES PUBLICATIONS :\n' + pub.map(p => { const st = p.stats || {};
    return `- ${p.date} ${p.heure || ''} ${p.network} "${(p.title || '').slice(0, 50)}" : "${stClean(p.caption || '').replace(/\s+/g, ' ').slice(0, 140)}" -> ${typeof mkHasStats === 'function' && mkHasStats(p) && !st.ignore ? MK_STATS.filter(([k]) => st[k] != null).map(([k, l]) => `${l.toLowerCase()} ${st[k]}`).join(', ') : 'chiffres pas donnés'}`; }).join('\n'));
  if(s){
    const c = stClient(s);
    const role = c && typeof estClient === 'function' && !estClient(c) ? (typeof eqRoleLabel === 'function' ? eqRoleLabel(c) : c.role) : '';
    L.push(`SÉANCE : ${s.type || 'Séance'} du ${mkDateTxt(s.date, { day: 'numeric', month: 'long', year: 'numeric' })}${s.location ? ', lieu : ' + s.location : ''}${s.collab ? ', séance en collaboration (portfolio)' : ''}. Personne photographiée : ${stPrenom(s) || 'pas de nom'}${role ? ' (' + role + ')' : ''}.`);
  }
  const rep = stReponsesTxt(); if(rep) L.push('CE QUE HENZO A DIT SUR LA SÉANCE :\n' + rep);
  const f = stFetes(); if(f) L.push(`FÊTES PROCHES : ${f}.`);
  return L.join('\n\n');
}
function stFetes(){
  try { if(typeof crmFetes === 'function') return crmFetes().filter(f => f.j <= 75).slice(0, 3).map(f => `${f.n} dans ${f.j} jours`).join(', '); } catch(e){}
  return typeof mkFetesTxt === 'function' ? mkFetesTxt() : '';
}
async function stIA(prompt, images, maxTokens){
  const r = await mkAI({ system: stSystem(), messages: [{ role: 'user', text: prompt }], images: images || [], maxTokens: maxTokens || 3000 });
  return r.text;
}
async function stB64(p){
  if(p.file) return mkB64(await mkShrink(p.file, 1024, 0.8));
  if(p.path){ const [u] = await mkSign([p.path]); return mkUrlB64(u); }
  return mkUrlB64(p.url || p.thumb);
}

// ============================================================
// ETAPE 3 : ANALYSE DES PHOTOS
// ============================================================
async function stAnalyser(){
  const sel = stSel().slice(0, 8);
  if(!sel.length || ST.busy) return;
  ST.busy = 'analyse'; stRefresh();
  try {
    const b64 = [], used = [];
    for(const p of sel){ try { b64.push(await stB64(p)); used.push(p); } catch(e){ console.warn('photo IA', e); } }
    if(!b64.length) throw new Error("Les photos n'ont pas pu être lues. Vérifie ta connexion.");
    const s = stShoot();
    const q = `ANALYSE DES PHOTOS POUR UNE PUBLICATION. Voici ${b64.length} photo(s) de la séance ${s ? s.type || '' : ''}, numérotées de 1 à ${b64.length} dans l'ordre.
Pour chaque photo, juge simplement : sourire, émotion (en 1 ou 2 mots), lumière, netteté, cadrage. Pour sourire, lumière, netteté et cadrage, réponds "bien", "moyen" ou "faible". Donne une note sur 10 et une phrase courte.
Puis DÉCIDE toi-même (ne demande pas à Henzo) :
- la photo à mettre en premier, avec la raison en une phrase simple ;
- l'ordre du carrousel (toutes les photos à publier) ;
- la ou les photos pour le statut WhatsApp ;
- les photos à ne pas publier, avec la raison (floue, yeux fermés, doublon...).
Enfin, écris 1 à 3 questions TRÈS courtes à poser à Henzo pour écrire un bon texte (ex : "C'était pour quoi ? Anniversaire ? Quel âge ?", "On peut citer son prénom ou la tagger ?", "Un détail à mettre en avant : tenue, décor, maquillage par... ?"). Ne pose pas une question dont la réponse est déjà dans le contexte.
Réponds UNIQUEMENT en JSON :
{"photos":[{"n":1,"sourire":"bien","emotion":"joie","lumiere":"bien","nettete":"bien","cadrage":"moyen","note":8,"avis":"phrase courte"}],"premiere":{"n":1,"raison":"..."},"ordre":[1,2],"statut":[2],"eviter":[{"n":3,"raison":"..."}],"questions":["..."],"resume":"une phrase sur la séance"}`;
    const j = mkJson(await stIA(q, b64, 3500));
    const byN = n => used[Number(n) - 1];
    const A = { photos: {}, premiere: null, ordre: [], statut: [], eviter: [], questions: [], resume: stClean(j.resume || '') };
    (j.photos || []).forEach(x => { const p = byN(x.n); if(p) A.photos[p.k] = { sourire: x.sourire, emotion: stClean(x.emotion || ''), lumiere: x.lumiere, nettete: x.nettete, cadrage: x.cadrage, note: Number(x.note) || null, avis: stClean(x.avis || '') }; });
    if(j.premiere && byN(j.premiere.n)) A.premiere = { k: byN(j.premiere.n).k, raison: stClean(j.premiere.raison || '') };
    A.ordre = (j.ordre || []).map(byN).filter(Boolean).map(p => p.k);
    A.statut = (j.statut || []).map(byN).filter(Boolean).map(p => p.k);
    A.eviter = (j.eviter || []).map(x => ({ p: byN(x.n), raison: stClean(x.raison || '') })).filter(x => x.p).map(x => ({ k: x.p.k, raison: x.raison }));
    A.questions = (j.questions || []).map(stClean).filter(Boolean).slice(0, 3);
    ST.analyse = A;
    stAppliquerOrdre();
  } catch(e){ ST.busy = ''; stRefresh(); agAlert(e.message || String(e)); return; }
  ST.busy = ''; stRefresh();
}
// L'IA decide de l'ordre : la 1re photo conseillee, puis son ordre ; les photos a eviter sortent du carrousel
function stAppliquerOrdre(){
  const A = ST.analyse; if(!A) return;
  ST.avantIA = ST.order.slice();
  const out = new Set(A.eviter.map(x => x.k));
  let ord = [];
  if(A.premiere) ord.push(A.premiere.k);
  A.ordre.forEach(k => { if(!ord.includes(k)) ord.push(k); });
  ST.order.forEach(k => { if(!ord.includes(k)) ord.push(k); });
  ord = ord.filter(k => !out.has(k) && ST.photos.some(p => p.k === k));
  if(ord.length) ST.order = ord;
}
function stRevenirOrdre(){ if(ST.avantIA){ ST.order = ST.avantIA.slice(); ST.avantIA = null; ST.J = null; stRefresh(); agToast('Ton ordre est remis'); } }
function stRemettre(k){ if(!ST.order.includes(k) && ST.order.length < 10){ ST.order.push(k); ST.J = null; stRefresh(); } }
function stLvl(v){ const s = stNorm(v); if(/bien|bon|bonne|tres|excellent|oui|net|nette|beau|belle/.test(s)) return 'ok'; if(/moyen|correct|assez|un peu/.test(s)) return 'mid'; if(/faible|flou|mauvais|sombre|non|pas/.test(s)) return 'low'; return ''; }
function stBadges(a){
  if(!a) return '';
  const b = (l, v) => v ? `<span class="st-tag ${stLvl(v)}">${l}</span>` : '';
  return `<div class="st-tags">${b('Sourire', a.sourire)}${b('Lumière', a.lumiere)}${b('Netteté', a.nettete)}${b('Cadrage', a.cadrage)}${a.emotion ? `<span class="st-tag acc">${stE(a.emotion)}</span>` : ''}</div>`;
}
function stStepAnalyse(){
  const A = ST.analyse, sel = stSel();
  if(ST.busy === 'analyse') return `<div class="st-card"><div class="st-wait"><div class="mk-typing"><span></span><span></span><span></span></div><b style="color:var(--text)">L'IA regarde tes ${Math.min(sel.length, 8)} photos...</b>Sourire, lumière, netteté, cadrage. Ça prend 10 à 30 secondes.</div></div>${stFoot('Patiente...', { disabled: true })}`;
  if(!A) return `<div class="st-card"><h3>${agIcon('sparkles', 18)} Analyse des photos</h3><p>L'IA te dit quelle photo mettre en premier, dans quel ordre publier, laquelle garder pour le statut WhatsApp, et celles à ne pas publier.</p>
      <button class="btn-primary" style="width:100%" ${sel.length ? '' : 'disabled'} onclick="stAnalyser()">Analyser mes ${Math.min(sel.length, 8)} photos</button></div>${stFoot('Continuer sans analyse', { action: 'stGoStep(3)' })}`;
  const P = k => ST.photos.find(p => p.k === k);
  const first = A.premiere && P(A.premiere.k);
  const all = Object.keys(A.photos).map(k => [P(k), A.photos[k]]).filter(x => x[0]).sort((a, b) => (b[1].note || 0) - (a[1].note || 0));
  return `${first ? `<div class="st-card"><div class="st-best">${stImgTag(first)}<div><div class="st-kicker">À mettre en premier</div><b>Photo n°1 conseillée</b><p>${stE(A.premiere.raison || '')}</p>${stBadges(A.photos[first.k])}</div></div></div>` : ''}
    <div class="st-card"><h3>${agIcon('star', 17)} Ordre de la publication</h3><p style="margin-bottom:4px">L'IA a rangé tes photos. Tu peux encore changer à l'étape Photos.</p>
      <div class="st-mini">${sel.map((p, i) => `<div>${stImgTag(p)}<i>${i + 1}</i></div>`).join('')}</div>
      ${ST.avantIA ? `<button class="st-link" style="margin-top:10px" onclick="stRevenirOrdre()">Revenir à mon ordre</button>` : ''}</div>
    ${A.statut.length ? `<div class="st-card"><h3>${agIcon('chat', 17)} Pour le statut WhatsApp</h3><div class="st-mini">${A.statut.map(P).filter(Boolean).map(p => `<div>${stImgTag(p)}</div>`).join('')}</div></div>` : ''}
    ${A.eviter.length ? `<div class="st-card"><h3>${agIcon('ban', 17)} À ne pas publier</h3>${A.eviter.map(x => { const p = P(x.k); return p ? `<div class="st-an">${stImgTag(p)}<div><b>Retirée de la publication</b><p>${stE(x.raison)}</p>${ST.order.includes(x.k) ? '' : `<button class="st-link" style="margin-top:6px" onclick="stRemettre(${stJ(x.k)})">La remettre quand même</button>`}</div></div>` : ''; }).join('')}</div>` : ''}
    <div class="st-card"><h3>${agIcon('eye', 17)} Photo par photo</h3>
      ${all.map(([p, a]) => `<div class="st-an">${stImgTag(p)}<div>${a.note ? `<span class="st-note">${a.note}<small>/10</small></span>` : ''}<b>${ST.order.includes(p.k) ? 'Photo ' + (ST.order.indexOf(p.k) + 1) : 'Pas publiée'}</b>${stBadges(a)}${a.avis ? `<p>${stE(a.avis)}</p>` : ''}</div></div>`).join('')}
      <button class="st-link" style="margin-top:10px" onclick="ST.analyse=null;stAnalyser()">${agIcon('redo', 13)} Refaire l'analyse</button></div>
    ${stFoot('Continuer')}`;
}

// ============================================================
// ETAPE 4 : LES QUESTIONS
// ============================================================
function stQuestions(){
  const A = ST.analyse;
  if(A && A.questions.length) return A.questions;
  const s = stShoot(), t = stTypesOf(s && s.type);
  return [
    t.includes('anniversaire') ? "C'était pour quoi ? Anniversaire de qui, quel âge ?" : "C'était pour quoi ? Une occasion spéciale ?",
    'On peut citer son prénom ou la tagger ?',
    'Un détail à mettre en avant (tenue, décor, maquillage par...) ?'
  ];
}
function stReponsesTxt(){
  const qs = stQuestions();
  return qs.map((q, i) => ST.answers[i] && !ST.skip[i] ? `- ${q} ${String(ST.answers[i]).trim()}` : '').filter(Boolean).join('\n');
}
function stStepInfos(){
  const qs = stQuestions();
  return `<div class="st-card"><h3>${agIcon('chat', 18)} Quelques questions</h3><p>Pour un texte qui sonne vrai. Réponds en tapant ou en dictant, ou touche "Passer".</p>
    ${qs.map((q, i) => { const tag = /pr[ée]nom|tagg|citer/i.test(q);
      return `<div class="st-qa ${ST.skip[i] ? 'skipped' : ''}"><b>${stE(q)}</b>
        ${tag ? `<div class="ag-pills">${['Oui, son prénom', 'Oui, je la tague', 'Non, pas de nom'].map(x => `<button type="button" onclick="stRep(${i}, ${stJ(x)})">${x}</button>`).join('')}</div>` : ''}
        <textarea rows="2" data-st-qa="${i}" placeholder="Ta réponse" oninput="ST.answers[${i}]=this.value;ST.skip[${i}]=false">${stE(ST.answers[i] || '')}</textarea>
        <button class="st-skip" onclick="ST.skip[${i}]=!ST.skip[${i}];stSyncFields();stRefresh()">${ST.skip[i] ? 'Répondre' : 'Passer'}</button></div>`; }).join('')}
  </div>
  ${stFoot(`${agIcon('sparkles', 16)} Écrire mes textes`, { action: 'stInfosOk()', skip: 'stInfosOk(true)' })}`;
}
function stRep(i, v){ stSyncFields(); ST.answers[i] = v; ST.skip[i] = false; stRefresh(); }
async function stInfosOk(passer){
  stSyncFields();
  if(passer) stQuestions().forEach((q, i) => { if(!ST.answers[i]) ST.skip[i] = true; });
  ST.J = null; ST.textes = {};
  await stSauverReponses();
  stGoStep(4);
}
// Les reponses vont dans la seance (shoots.notes), sur une ligne "Pour la publication : ..."
const ST_NOTE_TAG = 'Pour la publication : ';
function stLireReponses(s){
  if(!s || !s.notes) return [];
  const line = String(s.notes).split('\n').find(l => l.startsWith(ST_NOTE_TAG)); if(!line) return [];
  const qs = stQuestions(), out = [];
  line.slice(ST_NOTE_TAG.length).split(' | ').forEach(part => { const m = part.match(/^(.*\?)\s*(.*)$/); if(!m) return; const i = qs.findIndex(q => stSim(q, m[1]) > 0.6); if(i >= 0) out[i] = m[2]; });
  return out;
}
async function stSauverReponses(){
  const s = stShoot(); if(!s) return;
  const qs = stQuestions();
  const parts = qs.map((q, i) => ST.answers[i] && !ST.skip[i] ? `${q} ${String(ST.answers[i]).replace(/\s+/g, ' ').trim()}` : '').filter(Boolean);
  if(!parts.length) return;
  const line = ST_NOTE_TAG + parts.join(' | ');
  const lines = String(s.notes || '').split('\n').filter(l => !l.startsWith(ST_NOTE_TAG));
  while(lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const notes = (lines.length ? lines.join('\n') + '\n' : '') + line;
  if(notes === s.notes) return;
  try {
    const { error } = await sb.from('shoots').update({ notes }).eq('id', s.id);
    if(error) throw error;
    s.notes = notes;
  } catch(e){ console.warn('notes seance', e); agToast("Réponses non gardées dans la séance", 'error'); }
}

// ============================================================
// ETAPE 5 : LES TEXTES (une version par reseau)
// ============================================================
function stTitre(){
  if(ST.J && ST.J.titre) return stClean(ST.J.titre);
  const s = stShoot(); const p = stPrenom(s);
  return [p, s && s.type].filter(Boolean).join(' - ') || 'Ma séance';
}
function stSplitTags(t){ return String(t || '').split(/[\s,]+/).map(x => x.trim()).filter(x => /^#[^\s#]{2,}/.test(x)); }
function stTags(canal, ai){
  const m = stM(); const max = m.max && m.max[canal] != null && m.max[canal] !== '' ? Number(m.max[canal]) : ST_MAX_DEF[canal];
  if(!max) return '';
  const s = stShoot();
  const typ = stTypesOf(s && s.type).map(k => (m.hashtags_types || {})[k] || '').join(' ');
  const seen = new Set(), out = [];
  [...stSplitTags(m.hashtags_fixes), ...stSplitTags(typ), ...stSplitTags(Array.isArray(ai) ? ai.join(' ') : ai)].forEach(t => { const k = stNorm(t); if(k && !seen.has(k)){ seen.add(k); out.push(t); } });
  return out.slice(0, max).join(' ');
}
function stEmo(){ return stM().emojis !== 'aucun'; }
function stCompose(canal){
  const J = ST.J || {}, m = stM(), x = J[canal] || {};
  const titre = stTitre(), lieu = m.lieu ? (stEmo() ? '📍 ' : '') + m.lieu : '';
  const appel = (t) => [stClean(t || m.fin || ''), m.contact].filter(Boolean).join('\n');
  let t = '';
  if(canal === 'page'){
    const parts = [];
    (m.structure || []).filter(b => b.on).forEach(b => {
      if(b.k === 'titre') parts.push(stTitreReseau(titre, 'page'));
      if(b.k === 'emotion' && x.emotion) parts.push(stClean(x.emotion));
      if(b.k === 'detail' && x.detail) parts.push(stClean(x.detail));
      if(b.k === 'lieu' && lieu) parts.push(lieu);
      if(b.k === 'appel') parts.push(appel(x.appel));
      if(b.k === 'hashtags'){ const h = stTags('page', J.hashtags); if(h) parts.push(h); }
    });
    t = parts.filter(Boolean).join('\n\n');
  } else if(canal === 'perso'){
    t = [stClean(x.texte), stTags('perso', J.hashtags)].filter(Boolean).join('\n\n');
  } else if(canal === 'groupes'){
    t = [stClean(x.texte), lieu, appel(x.appel), stTags('groupes', J.hashtags)].filter(Boolean).join('\n\n');
  } else if(canal === 'whatsapp'){
    t = [stTitreReseau(titre, 'whatsapp'), stClean(x.phrase || x.texte), stClean(x.appel || m.fin || '')].filter(Boolean).join('\n');
  } else if(canal === 'instagram'){
    t = [stClean(x.accroche), stClean(x.texte), lieu, appel(x.appel), stTags('instagram', J.hashtags)].filter(Boolean).join('\n\n');
  } else if(canal === 'tiktok'){
    t = [stClean(x.legende || x.accroche), stTags('tiktok', J.hashtags)].filter(Boolean).join('\n\n');
  }
  return t.replace(/[\u2014\u2013]/g, '-');
}
function stTextesPrompt(seul, ton){
  const m = stM(), s = stShoot();
  const struct = (m.structure || []).filter(b => b.on).map(b => ST_BLOCS[b.k]).join(' > ');
  const tonTxt = ton ? { court: 'PLUS COURT (moitié moins long)', emotion: "AVEC PLUS D'ÉMOTION (histoire, ressenti)", pro: 'PLUS PRO (sobre, élégant, sérieux)' }[ton] || '' : '';
  const shapes = {
    page: '"page":{"emotion":"1 ou 2 lignes d\'émotion ou d\'histoire","detail":"détail de la séance (tenue, décor, ambiance)","appel":"appel à réserver, court"}',
    perso: '"perso":{"texte":"texte pour son profil perso quand il partage la publication : à la première personne, personnel, différent de la page (ex : Merci Destinée pour ta confiance...)"}',
    groupes: '"groupes":{"texte":"texte pour les groupes Facebook : moins publicitaire, plus service rendu (conseil, info utile), qui donne envie d\'écrire","appel":"court"}',
    whatsapp: '"whatsapp":{"phrase":"une seule phrase très courte","appel":"appel très court"}',
    instagram: '"instagram":{"accroche":"première ligne accrocheuse (moins de 70 caractères)","texte":"légende Instagram, 2 à 4 lignes","appel":"court"}',
    tiktok: '"tiktok":{"idee":"idée de vidéo de 15 à 30 secondes avec les photos ou les coulisses, en 2 ou 3 étapes","accroche":"phrase dite ou écrite dans les 2 premières secondes","texte_ecran":"texte à l\'écran, très court","son":"type de son tendance à chercher dans TikTok (sans inventer un titre précis)","legende":"légende TikTok courte"}'
  };
  const keys = seul ? [seul] : Object.keys(shapes);
  return `${seul ? 'REFAIRE UNE VERSION. ' : ''}TEXTES DE PUBLICATION pour la séance ${s ? (s.type || '') + ' de ' + (stPrenom(s) || 'la cliente') : ''}${ST.analyse && ST.analyse.resume ? ' (' + ST.analyse.resume + ')' : ''}.
${seul ? `Réécris seulement la version "${ST_CANAUX.find(c => c[0] === seul)[1]}"${tonTxt ? ', ' + tonTxt : ''}. Le texte actuel : """${(ST.textes[seul] || {}).texte || ''}"""` : 'Écris une version différente pour chaque réseau.'}
Structure de la page Facebook voulue par Henzo : ${struct || 'libre'}. Le titre est mis en gras par l'app : ne le répète pas dans les autres champs. Ne mets pas de hashtags dans les textes, ils vont dans "hashtags". Respecte son style appris. Utilise ce que Henzo a dit sur la séance. Pas de nom de famille.
Réponds UNIQUEMENT en JSON :
{"titre":"titre court, ex : Destinée - 25 ans",${keys.map(k => shapes[k]).join(',')}${seul ? '' : ',"hashtags":["5 à 8 hashtags propres à cette séance"],"conseils":["2 ou 3 conseils de diffusion adaptés à ce type de séance (groupes Facebook à viser, moment)"]'}}`;
}
async function stTextesGen(){
  if(ST.busy) return;
  ST.busy = 'textes'; stRefresh();
  try {
    const j = mkJson(await stIA(stTextesPrompt(), [], 4500));
    ST.J = j; ST.textes = {};
    ST_CANAUX.forEach(([c]) => { const t = stCompose(c); ST.textes[c] = { texte: t, prop: t, copie: null }; });
    ST.cover.titre = stTitre();
  } catch(e){ ST.busy = ''; stRefresh(); agAlert(e.message || String(e)); return; }
  ST.busy = ''; stRefresh();
}
async function stRefaire(canal, ton){
  if(ST.busy) return;
  stSyncFields();
  ST.busy = 'refaire:' + canal; stRefresh();
  try {
    const j = mkJson(await stIA(stTextesPrompt(canal, ton), [], 1800));
    ST.J = ST.J || {};
    if(j[canal]) ST.J[canal] = j[canal];
    const t = stCompose(canal);
    ST.textes[canal] = { texte: t, prop: t, copie: null };
    agToast('Nouvelle version prête');
  } catch(e){ agAlert(e.message || String(e)); }
  ST.busy = ''; stRefresh();
}
function stCanalInfo(canal){
  const J = ST.J || {}, x = J[canal] || {};
  if(canal === 'tiktok') return `<div class="st-info"><b>Idée de vidéo :</b> ${stE(stClean(x.idee || ''))}<br><b>Accroche :</b> ${stE(stClean(x.accroche || ''))}<br><b>Texte à l'écran :</b> ${stE(stClean(x.texte_ecran || ''))}<br><b>Son :</b> ${stE(stClean(x.son || 'un son tendance du moment'))}, à chercher dans TikTok (Ajouter un son).</div>`;
  if(canal === 'groupes') return `<div class="st-warn">Lis les règles de chaque groupe avant : certains interdisent la pub. Laisse 15 à 20 minutes entre deux groupes.</div>`;
  if(canal === 'perso') return `<div class="ag-hint" style="margin:0 0 8px">Partage la publication de ta page sur ton profil, avec ce texte plus personnel.</div>`;
  if(canal === 'whatsapp') return `<div class="ag-hint" style="margin:0 0 8px">Texte court avec *gras* WhatsApp. Ajoute la photo ${ST.analyse && ST.analyse.statut.length ? 'conseillée pour le statut' : 'la plus forte'}.</div>`;
  return '';
}
function stOuvrirLabel(canal){
  const share = !!(navigator.canShare && mkIsMobile());
  if(canal === 'whatsapp') return share ? 'Partager avec les photos' : 'Ouvrir WhatsApp';
  if(share) return 'Partager avec les photos';
  return { page: 'Ouvrir Facebook', perso: 'Ouvrir Facebook', groupes: 'Ouvrir Facebook', instagram: 'Ouvrir Instagram', tiktok: 'Ouvrir TikTok' }[canal];
}
function stStepTextes(){
  if(ST.busy === 'textes' || (!ST.J && !Object.keys(ST.textes).length)) {
    return `<div class="st-card"><div class="st-wait"><div class="mk-typing"><span></span><span></span><span></span></div><b style="color:var(--text)">L'IA écrit tes 6 textes...</b>Page Facebook, profil perso, groupes, statut WhatsApp, Instagram et TikTok.</div>
      ${ST.busy ? '' : `<button class="btn-primary" style="width:100%" onclick="stTextesGen()">Écrire mes textes</button>`}</div>${stFoot('Patiente...', { disabled: true })}`;
  }
  return `<div class="st-card" style="padding:12px 14px"><p style="margin:0">Voici tes textes, un par réseau. <b style="color:var(--text)">Touche Copier, puis publie toi-même.</b> Tu peux tout modifier.</p></div>
    ${ST_CANAUX.map(([c, nom, , col]) => { const T = ST.textes[c] || { texte: '' }; const busy = ST.busy === 'refaire:' + c;
      return `<div class="st-tx ${busy ? 'busy' : ''}" id="stTx_${c}"><div class="st-tx-h"><i style="background:${col}"></i><b>${nom}</b>${T.copie != null ? `<span class="st-tag ok">${agIcon('check', 11)} Copié</span>` : ''}${busy ? '<span class="st-tag">écrit...</span>' : ''}</div>
        <div class="st-tx-b">${stCanalInfo(c)}
          <textarea data-st-tx="${c}" oninput="ST.textes['${c}'].texte=this.value;stGrow(this)">${stE(T.texte)}</textarea>
          <div class="st-tones"><button onclick="stRefaire('${c}')">${agIcon('redo', 12)} Refaire</button><button onclick="stRefaire('${c}','court')">Plus court</button><button onclick="stRefaire('${c}','emotion')">Plus d'émotion</button><button onclick="stRefaire('${c}','pro')">Plus pro</button></div>
          <div class="mk-btns"><button class="main" onclick="stCopier('${c}')">${agIcon('copy', 14)} Copier</button><button onclick="stOuvrir('${c}')">${agIcon(c === 'whatsapp' ? 'chat' : 'share', 14)} ${stOuvrirLabel(c)}</button></div>
        </div></div>`; }).join('')}
    ${stFoot('Continuer')}`;
}
function stCopier(c){
  stSyncFields();
  const T = ST.textes[c]; if(!T) return;
  mkCopy(T.texte); T.copie = T.texte;
  const h = document.querySelector(`#stTx_${c} .st-tx-h`);
  if(h && !h.querySelector('.st-tag.ok')) h.insertAdjacentHTML('beforeend', `<span class="st-tag ok">${agIcon('check', 11)} Copié</span>`);
}
async function stFichiers(only){
  const list = (only || stSel()).slice(0, 10), files = [];
  for(const [i, p] of list.entries()){
    try {
      if(p.file){ files.push(p.file.name ? p.file : new File([p.file], `photo-${i + 1}.jpg`, { type: 'image/jpeg' })); continue; }
      const url = p.path ? (await mkSign([p.path]))[0] : (p.url || p.thumb);
      const b = await mkUrlBlob(url);
      files.push(new File([b], `${mkSlug(stNom())}-${i + 1}.jpg`, { type: b.type || 'image/jpeg' }));
    } catch(e){}
  }
  return files;
}
async function stOuvrir(c){
  stSyncFields();
  const T = ST.textes[c] || { texte: '' }; const text = T.texte;
  try { if(navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text); T.copie = text; } catch(e){}
  if(navigator.canShare && mkIsMobile()){
    agToast('Préparation des photos...');
    try {
      const statut = c === 'whatsapp' && ST.analyse && ST.analyse.statut.length ? ST.analyse.statut.map(k => ST.photos.find(p => p.k === k)).filter(Boolean) : null;
      const files = await stFichiers(statut);
      if(files.length && navigator.canShare({ files })){
        await navigator.share({ files, text, title: stTitre() });
        agToast('Texte copié aussi : colle-le si l\'app ne le reprend pas'); return;
      }
    } catch(e){ if(e && e.name === 'AbortError') return; }
  }
  const url = { whatsapp: 'https://wa.me/?text=' + encodeURIComponent(text), page: 'https://www.facebook.com/', perso: 'https://www.facebook.com/', groupes: 'https://www.facebook.com/groups/feed/', instagram: 'https://www.instagram.com/', tiktok: 'https://www.tiktok.com/upload' }[c];
  if(c !== 'whatsapp') agToast('Texte copié : colle-le dans la publication');
  window.open(url, '_blank');
}

// ============================================================
// ETAPE 6 : IMAGE AVEC TITRE (couverture, facultative)
// ============================================================
function stCoverSrc(){ return stSel().find(p => p.k !== 'cover') || null; }
async function stCoverImg(){
  const p = stCoverSrc(); if(!p) return null;
  if(ST.cover.img && ST.cover.imgKey === p.k) return ST.cover.img;
  let blob;
  if(p.file) blob = p.file;
  else { const url = p.path ? (await mkSign([p.path]))[0] : (p.src === 'galerie' ? galPhotoUrl(p.dossier, p.f, 'medium') : p.url); blob = await mkUrlBlob(url); }
  const u = URL.createObjectURL(blob);
  const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error('Image illisible')); i.src = u; });
  ST.cover.img = img; ST.cover.imgKey = p.k; ST.cover.x = 0; ST.cover.y = 0;
  return img;
}
async function stLogoImg(){
  const m = stM(); if(!m.logo) return null;
  if(ST.logoImg && ST.logoImg._p === m.logo) return ST.logoImg;
  let src = null;
  try { src = localStorage.getItem('stLogo:' + m.logo); } catch(e){}
  if(!src){ try { const [u] = await mkSign([m.logo]); const b = await mkUrlBlob(u); src = URL.createObjectURL(b); } catch(e){ return null; } }
  const img = await new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
  if(img) img._p = m.logo;
  ST.logoImg = img; return img;
}
const ST_LAYOUTS = [['bas', 'En bas'], ['centre', 'Centré'], ['bandeau', 'Bandeau']];
function stLayIcon(k){
  const g = '<rect x="1" y="1" width="32" height="40" rx="4" fill="currentColor" opacity=".18"/>';
  if(k === 'bas') return `<svg viewBox="0 0 34 42">${g}<rect x="5" y="27" width="18" height="4" rx="1" fill="currentColor"/><rect x="5" y="33" width="11" height="2" rx="1" fill="currentColor" opacity=".7"/></svg>`;
  if(k === 'centre') return `<svg viewBox="0 0 34 42">${g}<rect x="7" y="27" width="20" height="4" rx="1" fill="currentColor"/><rect x="11" y="33" width="12" height="2" rx="1" fill="currentColor" opacity=".7"/></svg>`;
  return `<svg viewBox="0 0 34 42">${g}<rect x="1" y="30" width="32" height="11" rx="0" fill="currentColor" opacity=".55"/><rect x="5" y="33" width="16" height="3" rx="1" fill="currentColor"/></svg>`;
}
function stStepImage(){
  const src = stCoverSrc(), C = ST.cover;
  const intro = `<div class="st-card"><h3>${agIcon('type', 18)} Image avec titre <span class="st-tag" style="margin-left:4px">facultatif</span></h3>
    <p style="margin-bottom:${C.open ? 0 : 10}px">C'est la première image que les gens voient, avec ton titre dessus, comme une affiche.</p>
    ${C.open ? '' : `<div class="st-demo"><canvas id="stCvDemo" width="216" height="270"></canvas><p>Exemple avec ta 1re photo : le titre <b style="color:var(--text)">"${stE(C.titre || stTitre())}"</b>, le nom <b style="color:var(--text)">${stE(stNom())}</b>${stM().logo ? ' et ton logo' : ''}. Tu peux la télécharger ou l'ajouter en 1re photo de ta publication.</p></div>
      <button class="btn-primary" style="width:100%;margin-top:12px" ${src ? '' : 'disabled'} onclick="ST.cover.open=true;stRefresh()">Créer une image avec titre (facultatif)</button>`}</div>`;
  if(!C.open) return intro + stFoot('Passer cette étape', { action: 'stGoStep(6)' });
  return intro + `<div class="st-card">
      <div class="st-cvwrap"><canvas id="stCv" class="st-cv"></canvas><span class="st-cvhint">Glisse pour placer la photo</span></div>
      <label>Titre</label><input id="stCvTitre" value="${stE(C.titre || stTitre())}" oninput="ST.cover.titre=this.value;stCoverPaint()" maxlength="60">
      <label>Format</label><div class="ag-pills">${[['4:5', '4:5 Facebook / Instagram'], ['1:1', '1:1 Carré']].map(([k, l]) => `<button class="${C.fmt === k ? 'on' : ''}" onclick="stSyncFields();ST.cover.fmt='${k}';ST.cover.x=0;ST.cover.y=0;stRefresh()">${l}</button>`).join('')}</div>
      <label>Disposition</label><div class="st-lay">${ST_LAYOUTS.map(([k, l]) => `<button class="${C.layout === k ? 'on' : ''}" onclick="stSyncFields();ST.cover.layout='${k}';stRefresh()">${stLayIcon(k)}${l}</button>`).join('')}</div>
      <label>Zoom</label><input type="range" min="1" max="2.5" step="0.05" value="${C.zoom}" oninput="ST.cover.zoom=Number(this.value);stCoverPaint()" style="width:100%;margin:6px 0 4px;accent-color:var(--accent)">
      <div class="mk-btns"><button class="main" onclick="stCoverAjouter()">${C.added ? agIcon('check', 14) + ' Ajoutée en 1re photo' : agIcon('plus', 14) + ' Ajouter à la publication'}</button><button onclick="stCoverTelecharger()">${agIcon('download', 14)} Télécharger (JPEG)</button></div>
    </div>
    ${stFoot('Continuer')}`;
}
async function stCoverMount(){
  const C = ST.cover;
  const P = ST_POLICES[stM().police] || ST_POLICES.montserrat;
  try { await stCoverImg(); } catch(e){ agToast("La photo n'a pas pu être chargée", 'error'); return; }
  await Promise.all([stFontsReady(P), stLogoImg()]);
  if(!C.open){ const d = document.getElementById('stCvDemo'); if(d) stCoverPaint(d, true); return; }
  const cv = document.getElementById('stCv'); if(!cv) return;
  stCoverPaint(cv);
  let drag = null;
  cv.onpointerdown = e => { drag = { x: e.clientX, y: e.clientY, ox: C.x, oy: C.y }; cv.setPointerCapture(e.pointerId); const h = cv.parentElement.querySelector('.st-cvhint'); if(h) h.style.display = 'none'; };
  cv.onpointermove = e => { if(!drag) return; const r = cv.width / cv.getBoundingClientRect().width; C.x = drag.ox + (e.clientX - drag.x) * r; C.y = drag.oy + (e.clientY - drag.y) * r; C.blob = null; stCoverPaintRaf(); };
  cv.onpointerup = cv.onpointercancel = () => { drag = null; };
}
let stRaf = 0;
function stCoverPaintRaf(){ if(stRaf) return; stRaf = requestAnimationFrame(() => { stRaf = 0; stCoverPaint(); }); }
function stFit(g, text, font, size, maxW){ let s = size; g.font = font(s); while(g.measureText(text).width > maxW && s > 40){ s -= 2; g.font = font(s); } return s; }
function stWrap(g, text, maxW){
  const w = String(text).split(' '); const lines = []; let cur = '';
  w.forEach(x => { const t = cur ? cur + ' ' + x : x; if(g.measureText(t).width > maxW && cur){ lines.push(cur); cur = x; } else cur = t; });
  if(cur) lines.push(cur);
  return lines.slice(0, 3);
}
function stCoverPaint(cv, small){
  cv = cv || document.getElementById('stCv'); if(!cv) return;
  const C = ST.cover, im = C.img; if(!im) return;
  const m = stM(), P = ST_POLICES[m.police] || ST_POLICES.montserrat, col = stCouleurs(m);
  const W = 1080, H = C.fmt === '1:1' ? 1080 : 1350;
  const k = small ? cv.width / W : 1;
  if(!small){ cv.width = W; cv.height = H; } else cv.height = Math.round(cv.width * H / W);
  const g = cv.getContext('2d');
  g.setTransform(k, 0, 0, k, 0, 0);
  g.fillStyle = '#111'; g.fillRect(0, 0, W, H);
  const band = C.layout === 'bandeau' ? Math.round(H * 0.19) : 0, area = H - band;
  const s = Math.max(W / im.width, area / im.height) * (C.zoom || 1);
  const dw = im.width * s, dh = im.height * s, mx = (dw - W) / 2, my = (dh - area) / 2;
  C.x = Math.max(-mx, Math.min(mx, C.x || 0)); C.y = Math.max(-my, Math.min(my, C.y || 0));
  g.save(); g.beginPath(); g.rect(0, 0, W, area); g.clip();
  g.drawImage(im, (W - dw) / 2 + C.x, (area - dh) / 2 + C.y, dw, dh);
  g.restore();
  const titre = stClean(C.titre || stTitre()).trim(), nom = stNom().toUpperCase();
  const fT = sz => `${P.tw} ${sz}px "${P.titre}", Inter, sans-serif`, fX = sz => `${P.xw} ${sz}px "${P.texte}", Inter, sans-serif`;
  const M = 72, logo = ST.logoImg;
  const sp = px => { try { g.letterSpacing = px + 'px'; } catch(e){} };
  if(C.layout === 'bandeau'){
    g.fillStyle = col.fond; g.fillRect(0, area, W, band);
    g.fillStyle = col.accent; g.fillRect(0, area, W, 6);
    const lw = logo ? Math.min(150, band - 60) : 0;
    sp(0); g.fillStyle = col.texte; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    const sz = stFit(g, titre, fT, 76, W - 2 * M - (lw ? lw + 30 : 0));
    g.fillText(titre, M, area + band * 0.52);
    sp(7); g.font = fX(26); g.fillStyle = col.accent; g.fillText(nom, M, area + band * 0.52 + sz * 0.55 + 18);
    if(logo){ const r = Math.min(lw / logo.width, lw / logo.height); g.drawImage(logo, W - M - logo.width * r, area + (band - logo.height * r) / 2, logo.width * r, logo.height * r); }
  } else {
    const gr = g.createLinearGradient(0, H * 0.42, 0, H);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.55, 'rgba(0,0,0,.38)'); gr.addColorStop(1, 'rgba(0,0,0,.78)');
    g.fillStyle = gr; g.fillRect(0, H * 0.42, W, H * 0.58);
    const center = C.layout === 'centre';
    const lw = logo ? 110 : 0;
    const maxW = W - 2 * M - (!center && lw ? lw + 30 : 0);
    sp(-1); g.font = fT(92);
    let sz = 92; let lines = [titre];
    if(g.measureText(titre).width > maxW){ sz = stFit(g, titre, fT, 92, maxW); if(sz < 64){ sz = 72; g.font = fT(sz); lines = stWrap(g, titre, maxW); } }
    g.font = fT(sz); g.fillStyle = '#fff'; g.textAlign = center ? 'center' : 'left'; g.textBaseline = 'alphabetic';
    g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 18;
    const x = center ? W / 2 : M, base = H - 118;
    lines.forEach((l, i) => g.fillText(l, x, base - (lines.length - 1 - i) * sz * 1.08));
    g.shadowBlur = 0;
    const topY = base - (lines.length - 1) * sz * 1.08 - sz - 26;
    g.fillStyle = col.accent;
    if(center) g.fillRect(W / 2 - 36, topY, 72, 6); else g.fillRect(M, topY, 64, 6);
    sp(8); g.font = fX(27); g.fillStyle = 'rgba(255,255,255,.88)';
    g.fillText(nom, x + (center ? 4 : 0), base + 58);
    sp(0);
    if(logo){
      const r = Math.min(lw / logo.width, lw / logo.height), w = logo.width * r, h = logo.height * r;
      if(center) g.drawImage(logo, W / 2 - w / 2, 56, w, h);
      else g.drawImage(logo, W - M - w, base + 64 - h, w, h);
    }
  }
  try { g.letterSpacing = '0px'; } catch(e){}
  g.textAlign = 'left';
}
function stCoverBlob(){
  return new Promise((ok, ko) => {
    stSyncFields();
    const cv = document.createElement('canvas');
    cv.width = 1080; cv.height = ST.cover.fmt === '1:1' ? 1080 : 1350;
    stCoverPaint(cv);
    cv.toBlob(b => b ? ok(b) : ko(new Error('Image non créée')), 'image/jpeg', 0.92);
  });
}
async function stCoverTelecharger(){
  try {
    const b = await stCoverBlob(); ST.cover.blob = b;
    const a = document.createElement('a'); a.href = URL.createObjectURL(b);
    a.download = `${mkSlug(stClean(ST.cover.titre || stTitre()))}-${ST.cover.fmt === '1:1' ? 'carre' : '4x5'}.jpg`;
    document.body.appendChild(a); a.click(); a.remove();
    agToast('Image téléchargée');
  } catch(e){ agAlert(e.message || String(e)); }
}
async function stCoverAjouter(){
  try {
    const b = await stCoverBlob(); ST.cover.blob = b;
    const file = new File([b], `${mkSlug(stClean(ST.cover.titre || stTitre()))}.jpg`, { type: 'image/jpeg' });
    ST.photos = ST.photos.filter(p => p.k !== 'cover');
    ST.photos.unshift({ k: 'cover', src: 'couverture', file, preview: URL.createObjectURL(b), saved: null });
    ST.order = ['cover'].concat(ST.order.filter(k => k !== 'cover')).slice(0, 10);
    ST.cover.added = true;
    agToast('Image ajoutée en 1re photo');
    stRefresh();
  } catch(e){ agAlert(e.message || String(e)); }
}

// ============================================================
// ETAPE 7 : PLAN DE DIFFUSION + ENREGISTRER
// ============================================================
// Meilleure heure : d'apres ses resultats (par tranche d'heure), sinon 19 h
function stHeure(){
  const withS = (MK.posts || []).filter(p => p.status === 'publie' && p.heure && p.network === 'Facebook' && typeof mkHasStats === 'function' && mkHasStats(p) && !p.stats.ignore);
  const g = {};
  withS.forEach(p => { const h = String(p.heure).slice(0, 2); const s = p.stats; const v = (Number(s.likes) || 0) + (Number(s.commentaires) || 0) * 2 + (Number(s.partages) || 0) * 2 + (Number(s.clients) || 0) * 20 + (Number(s.vues) || 0) / 50;
    (g[h] = g[h] || { n: 0, v: 0 }); g[h].n++; g[h].v += v; });
  const best = Object.entries(g).filter(([, o]) => o.n >= 2).sort((a, b) => b[1].v / b[1].n - a[1].v / a[1].n)[0];
  if(best) return { h: best[0] + ':00', why: "ton meilleur moment d'après tes résultats" };
  const d = new Date().getDay();
  if(d === 0) return { h: '18:00', why: 'le dimanche, les gens sont en ligne plus tôt' };
  return { h: '19:00', why: 'le soir, quand les gens de Bouaké sont sur Facebook' };
}
function stPlanDate(h){
  const now = new Date(), [H, Mi] = h.split(':').map(Number);
  const t = new Date(); t.setHours(H, Mi || 0, 0, 0);
  return mkDay(now.getTime() < t.getTime() - 20 * 60000 ? now : new Date(now.getTime() + 864e5));
}
function stAddMin(h, n){ const [H, M] = h.split(':').map(Number); const t = H * 60 + (M || 0) + n; return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; }
function stPlanEtapes(){
  const { h } = stHeure();
  const s = stShoot(), t = stTypesOf(s && s.type);
  const grp = t.map(k => ST_GROUPES[k]).find(Boolean) || "groupes de ta ville et de ton quartier";
  return [
    { k: 'page', h, t: `Publier sur ta page Facebook à ${h.replace(':', ' h ')}`, d: 'Texte "Page Facebook", les photos dans l\'ordre conseillé.', delai: 10, next: 'Statut WhatsApp', canal: 'page' },
    { k: 'statut', h: stAddMin(h, 10), t: 'Statut WhatsApp, 10 min après', d: 'Texte "Statut WhatsApp" avec la photo pour le statut.', delai: 10, next: 'Partage sur ton profil', canal: 'whatsapp' },
    { k: 'perso', h: stAddMin(h, 20), t: 'Partager sur ton profil perso', d: 'Partage la publication de ta page avec le texte "Profil perso".', delai: 15, next: '1er groupe', canal: 'perso' },
    { k: 'groupes', h: stAddMin(h, 35), t: 'Partager dans 2 ou 3 groupes de Bouaké', d: `Vise les ${grp}. Laisse 15 à 20 min entre chaque groupe, sinon Facebook peut te bloquer pour spam. Un groupe d'Abidjan de temps en temps : 1 fois par semaine au maximum.`, delai: 18, next: 'groupe suivant', canal: 'groupes' },
    { k: 'comm', h: stAddMin(h, 60), t: "Répondre aux commentaires dans l'heure", d: 'Réponds à chaque commentaire et message : la publication sera montrée à plus de monde.', delai: 60, next: 'vérifier les commentaires' },
    { k: 'insta', h: '', t: 'Instagram et TikTok, quand tu veux cette semaine', d: 'Texte Instagram avec les mêmes photos. TikTok : l\'idée de vidéo du studio.' },
    { k: 'demain', h: 'Demain', t: 'Demain : une autre photo en statut WhatsApp', d: 'Une photo pas encore montrée, avec une phrase courte et "Réserve ta séance".' }
  ];
}
function stStepDiffusion(){
  const et = stPlanEtapes(), { h, why } = stHeure(), date = stPlanDate(h);
  const conseils = ((ST.J && ST.J.conseils) || []).map(stClean).filter(Boolean).slice(0, 3);
  const post = ST.post && (MK.posts || []).find(p => p.id === ST.post);
  return `<div class="st-card"><h3>${agIcon('calendar', 18)} Plan de diffusion</h3>
      <p>${stE(mkDayName(date))} à ${h.replace(':', ' h ')} : ${stE(why)}. Coche chaque étape quand c'est fait. Le minuteur te prévient pour la suivante.</p>
      <ul class="st-plan">${et.map(e => `<li class="${ST.plan.done[e.k] ? 'done' : ''}"><input type="checkbox" ${ST.plan.done[e.k] ? 'checked' : ''} onchange="stCocher('${e.k}', this.checked)">
        <div class="st-pt"><b>${stE(e.t)}</b><span>${stE(e.d)}</span>
          ${e.canal && ST.textes[e.canal] ? `<button onclick="stCopier('${e.canal}')">${agIcon('copy', 13)} Copier le texte</button>` : ''}${e.delai ? `<button onclick="stTimerStart(${e.delai}, ${stJ(e.next)})">${agIcon('clock', 13)} Minuteur ${e.delai} min</button>` : ''}</div>
        ${e.h ? `<span class="st-h">${stE(e.h.replace(':', ' h '))}</span>` : ''}</li>`).join('')}</ul>
      ${conseils.length ? `<div class="st-sep" style="margin-top:6px">${agIcon('bulb', 13)} Conseils pour cette séance</div><ul class="st-tips">${conseils.map(c => `<li>${stE(c)}</li>`).join('')}</ul>` : ''}
    </div>
    <div class="st-card"><h3>${agIcon('check', 18)} Enregistrer</h3>
      <label class="st-ok"><input type="checkbox" ${ST.publie ? 'checked' : ''} onchange="stCocher('page', this.checked)"> Publié sur ma page Facebook</label>
      <label>Lien de la publication (facultatif)</label><input id="stLien" value="${stE(ST.lien)}" placeholder="Colle ici le lien Facebook" oninput="ST.lien=this.value.trim()" inputmode="url">
      <button class="btn-primary" style="width:100%;margin-top:12px" ${ST.busy ? 'disabled' : ''} onclick="stEnregistrer()">${ST.busy === 'save' ? 'Enregistrement...' : post ? 'Enregistrer les changements' : 'Enregistrer dans mon plan'}</button>
      ${post ? `<div class="ag-hint">${post.status === 'publie' ? 'Publiée' : `Prévue ${stE(mkDayName(post.date).toLowerCase())} à ${stE(post.heure || '')}`}. Elle est dans Marketing > Plan.</div>` : ''}
    </div>
    <div class="st-card"><h3>${agIcon('target', 18)} Le suivi</h3>
      <p>2 jours après, l'app te demandera tes résultats (Marketing > Aujourd'hui). Elle ne peut pas lire les j'aime toute seule : Facebook et TikTok la bloquent. Tape les chiffres, ou envoie une capture d'écran de tes statistiques : l'IA les lit pour toi.</p>
      ${post && post.status === 'publie' ? `<button class="btn-secondary mk-ib" onclick="mkStatsOpen(${post.id})">${agIcon('image', 15)} Lire une capture de mes statistiques</button>` : '<div class="ag-hint" style="margin:0">Le bouton "Lire une capture de mes statistiques" apparaît ici quand c\'est publié.</div>'}
    </div>
    <div class="st-foot"><button class="st-b2" onclick="stPrev()">${agIcon('chev', 14).replace('class="ag-i"', 'class="ag-i" style="transform:rotate(180deg)"')}</button><button class="st-b1" onclick="stEnregistrer(true)">${post ? 'Terminer' : 'Enregistrer et terminer'}</button></div>`;
}
async function stCocher(k, on){
  stSyncFields();
  ST.plan.done[k] = !!on;
  if(k === 'page'){
    ST.publie = !!on;
    if(on){ ST.plan.done.page = true; await stEnregistrer(false, true); }
    else if(ST.post) await stEnregistrer(false, true);
  }
  if(on && k !== 'page' && k !== 'demain') { const et = stPlanEtapes(); const e = et.find(x => x.k === k); if(e && e.delai && !ST.timer) agToast('Bien ! Lance le minuteur pour la suite'); }
  stRefresh();
}
// ---------- Minuteur ----------
function stTimerHtml(){
  const T = ST.timer; if(!T) return '';
  const left = Math.max(0, T.end - Date.now());
  return `<div class="st-timer" id="stTimer">${agIcon('clock', 20)}<b id="stTimerT">${stTimerFmt(left)}</b><span>avant : ${stE(T.label)}</span><button onclick="stTimerStop()">Arrêter</button></div>`;
}
function stTimerFmt(ms){ const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
async function stTimerStart(min, label){
  stTimerStop(true);
  try { if('Notification' in window && Notification.permission === 'default') await Notification.requestPermission(); } catch(e){}
  ST.timer = { end: Date.now() + min * 60000 * (ST.vitesse || 1), label: label || 'étape suivante', min };
  ST.timer.iv = setInterval(() => {
    const T = ST.timer; if(!T) return;
    const left = T.end - Date.now();
    const el = document.getElementById('stTimerT');
    if(el) el.textContent = stTimerFmt(Math.max(0, left));
    if(left <= 0) stTimerFin();
  }, 1000);
  agToast(`Minuteur lancé : ${min} min`);
  stRefresh();
}
function stTimerFin(){
  const T = ST.timer; if(!T) return;
  clearInterval(T.iv); ST.timer = null;
  const msg = `C'est l'heure : ${T.label}`;
  let notif = false;
  try { if('Notification' in window && Notification.permission === 'granted'){ new Notification(stNom(), { body: msg, icon: 'icon-192.png' }); notif = true; } } catch(e){}
  try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch(e){}
  agToast(msg);
  ST.lastAlert = { msg, notif };
  stRefresh();
}
function stTimerStop(silent){ if(ST.timer){ clearInterval(ST.timer.iv); ST.timer = null; if(!silent) stRefresh(); } }

// ---------- Enregistrer dans mk_posts ----------
function stSplitPage(t){
  const m = String(t || '').match(/\n\n((?:#[^\s#]+[ \t]*)+)\s*$/);
  return m ? { caption: t.slice(0, m.index).trim(), hashtags: m[1].trim() } : { caption: String(t || '').trim(), hashtags: '' };
}
async function stImages(){
  const sel = stSel(), out = [];
  const files = sel.filter(p => p.file && !p.saved);
  if(files.length){
    const st = await mkStore(files.map(p => ({ file: p.file, src: p.src === 'couverture' ? 'couverture' : 'telephone' })), false);
    files.forEach((p, i) => { if(st.images[i]) p.saved = st.images[i]; });
  }
  sel.forEach(p => {
    if(p.saved) out.push(p.saved);
    else if(p.path) out.push({ path: p.path, media_id: p.media_id || null });
    else if(p.url) out.push({ url: p.url, thumb: p.thumb || null, src: p.src === 'galerie' ? 'galerie' : p.src });
  });
  return out;
}
function stNotesJson(old){
  const versions = {}; ST_CANAUX.forEach(([c]) => { if(ST.textes[c]) versions[c] = ST.textes[c].texte; });
  const prop = {}; ST_CANAUX.forEach(([c]) => { if(ST.textes[c] && ST.textes[c].prop && ST.textes[c].prop !== ST.textes[c].texte) prop[c] = ST.textes[c].prop; });
  return JSON.stringify(Object.assign({}, old || {}, { studio: 1, v: 1, titre: stTitre(), versions, propose: prop, idee_tiktok: ST.J && ST.J.tiktok ? ST.J.tiktok : undefined,
    conseils: ST.J && ST.J.conseils ? ST.J.conseils : undefined, galerie: ST.gal ? { code: ST.gal.code, dossier: ST.gal.dossier } : undefined,
    plan: { done: ST.plan.done }, lien: ST.lien || '', reponses: stReponsesTxt() || undefined }));
}
async function stEnregistrer(fin, quiet){
  stSyncFields();
  const s = stShoot(); if(!s){ agToast('Choisis une séance', 'error'); return; }
  if(!Object.keys(ST.textes).length && !quiet){ agToast("Écris d'abord tes textes", 'error'); return; }
  if(ST.busy === 'save') return;
  ST.busy = 'save'; if(!quiet) stRefresh();
  try {
    const { h } = stHeure();
    const page = stSplitPage((ST.textes.page || {}).texte || '');
    const old = ST.post ? (MK.posts || []).find(p => p.id === ST.post) : null;
    const row = { network: 'Facebook', kind: 'Séance client', shoot_id: s.id, title: stTitre(), caption: page.caption || null, hashtags: page.hashtags || null,
      images: await stImages(), notes: stNotesJson(old && typeof mkStudioNotes === 'function' ? mkStudioNotes(old.notes) : null),
      status: ST.publie ? 'publie' : (old && old.status === 'publie' ? 'prevu' : (old ? old.status : 'prevu')) };
    if(row.status === 'annule') row.status = 'prevu';
    if(!old){ row.date = stPlanDate(h); row.heure = h; }
    if(ST.publie && !(old && old.published_at)){ row.published_at = new Date().toISOString(); row.date = mkDay(); row.heure = new Date().toTimeString().slice(0, 5); }
    if(!ST.publie && old && old.published_at) row.published_at = null;
    let ok;
    if(old) ok = await mkUpdatePost(old.id, row);
    else { const r = await mkInsertPost(row); ok = !!r; if(r){ ST.post = r.id; if(row.published_at){ await mkUpdatePost(r.id, { published_at: row.published_at }); } } }
    if(!ok) throw new Error("La publication n'a pas été enregistrée");
    ST.busy = '';
    if(!quiet) agToast(ST.publie ? 'Bravo ! Dans 2 jours, donne tes chiffres' : 'Enregistrée dans ton plan');
    else if(ST.publie) agToast('Publiée : bravo ! La séance est marquée publiée');
    stApprendreTextes();
  } catch(e){ ST.busy = ''; stRefresh(); agAlert(e.message || String(e)); return; }
  if(fin){ stTimerStop(true); MK.tab = 'jour'; mkRenderTab(); window.scrollTo({ top: 0 }); return; }
  stRefresh();
}
// Reprendre une publication faite avec le studio
function stReprendre(p){
  const n = typeof mkStudioNotes === 'function' ? mkStudioNotes(p.notes) : null; if(!n) return;
  ST.post = p.id; ST.shoot = p.shoot_id || ST.shoot; ST.lien = n.lien || ''; ST.publie = p.status === 'publie';
  ST.plan = { done: (n.plan && n.plan.done) || {} };
  ST.textes = {}; Object.entries(n.versions || {}).forEach(([c, t]) => { ST.textes[c] = { texte: t, prop: (n.propose || {})[c] || t, copie: null, appris: t }; });
  ST.J = { titre: n.titre, tiktok: n.idee_tiktok, conseils: n.conseils };
  if(!ST.photos.length){
    ST.photos = (p.images || []).map((im, i) => {
      const g = !im.path && String(im.url || '').match(/\/photo\/([^/?]+)\/([^/?]+)/);
      if(g) return { k: 'g:' + decodeURIComponent(g[2]), src: 'galerie', f: decodeURIComponent(g[2]), dossier: decodeURIComponent(g[1]), url: im.url, thumb: im.thumb };
      return { k: im.path ? 'p:' + im.path : 'u:' + (im.url || i), src: im.path ? 'téléphone' : (im.src || 'photo'), path: im.path || null, media_id: im.media_id || null, url: im.url, thumb: im.thumb, saved: im.path ? im : null };
    });
    ST.order = ST.photos.map(x => x.k);
  }
  ST.step = 6;
}
window.stOuvrirPost = function(id){
  const p = (MK.posts || []).find(x => x.id === id); if(!p) return;
  stReset(); stReprendre(p);
  stAller('studio');
  stChargerMarque();
};

// ============================================================
// APPRENTISSAGE
// ============================================================
// Ce que Henzo change dans les textes proposes -> lecons de style (mk_memory, kind 'style')
async function stApprendreTextes(){
  const pairs = [];
  ST_CANAUX.forEach(([c, nom]) => {
    const T = ST.textes[c]; if(!T || !T.prop) return;
    const fin = T.copie != null ? T.copie : T.texte;
    if(!fin || fin === T.appris) return;
    if(stSim(T.prop, fin) >= 0.85 && Math.abs(fin.length - T.prop.length) < T.prop.length * 0.2) return;
    pairs.push({ c, nom, prop: T.prop, fin }); T.appris = fin;
  });
  if(!pairs.length || typeof mkSaveMemos !== 'function') return;
  let lecons = [];
  try {
    const q = `LEÇONS DE STYLE. Voici des textes proposés à Henzo et ce qu'il a vraiment gardé après modification. Déduis 1 à 3 règles courtes et générales sur son style (longueur, ton, emojis, formules, ce qu'il enlève ou ajoute). Une règle = une phrase de moins de 15 mots. Pas de règle sur une seule cliente.
${pairs.map(x => `[${x.nom}]\nProposé : """${x.prop.slice(0, 900)}"""\nGardé : """${x.fin.slice(0, 900)}"""`).join('\n\n')}
Réponds UNIQUEMENT en JSON : {"lecons":["..."]}`;
    const r = await mkAI({ messages: [{ role: 'user', text: q }], maxTokens: 600 });
    lecons = (mkJson(r.text).lecons || []).map(stClean).filter(Boolean).slice(0, 3);
  } catch(e){
    // Sans IA : lecons simples
    pairs.forEach(x => {
      if(x.fin.length < x.prop.length * 0.75) lecons.push(`Préfère des textes ${x.nom === 'Page Facebook' ? 'de page ' : ''}plus courts que ceux proposés`);
      else if(x.fin.length > x.prop.length * 1.3) lecons.push('Aime développer un peu plus ses textes');
      const emo = s => (s.match(/\p{Extended_Pictographic}/gu) || []).length;
      if(emo(x.fin) < emo(x.prop) - 1) lecons.push("Met moins d'emojis que proposé");
      if(emo(x.fin) > emo(x.prop) + 1) lecons.push("Aime ajouter des emojis");
    });
  }
  lecons = [...new Set(lecons)];
  if(lecons.length) await mkSaveMemos(lecons.map(t => ({ kind: 'style', text: t })), 'studio (textes modifiés)');
}
// Chiffres d'une publication -> lecon courte (mk_memory, kind 'resultat')
window.stLeconResultat = async function(p){
  if(!p || !p.stats || p.stats.ignore || typeof mkSaveMemos !== 'function') return;
  const s = p.stats, inter = (Number(s.likes) || 0) + (Number(s.commentaires) || 0) + (Number(s.partages) || 0);
  const others = (MK.posts || []).filter(x => x.id !== p.id && x.stats && !x.stats.ignore && x.network === p.network && Number(x.stats.vues));
  const avg = others.length ? Math.round(others.reduce((a, x) => a + Number(x.stats.vues), 0) / others.length) : null;
  const sh = p.shoot_id ? mkShoot(p.shoot_id) : null;
  const jour = p.date ? ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][new Date(p.date + 'T12:00:00').getDay()] : '';
  const quoi = `${p.network} ${p.kind ? '(' + p.kind.toLowerCase() + (sh && sh.type ? ', ' + sh.type.toLowerCase() : '') + ')' : ''}`.trim();
  let cmp = '';
  if(avg != null && Number(s.vues)){ const r = Number(s.vues) / Math.max(1, avg); cmp = r >= 1.3 ? ` : mieux que d'habitude (${avg} vues en moyenne)` : r <= 0.7 ? ` : moins bien que d'habitude (${avg} vues en moyenne)` : ''; }
  const text = `${quoi} publié un ${jour}${p.heure ? ' à ' + String(p.heure).slice(0, 5).replace(':', ' h ') : ''} : ${s.vues != null ? s.vues + ' vues, ' : ''}${inter} réactions${Number(s.clients) ? ', ' + s.clients + ' client(s)' : ''}${cmp}`;
  await mkSaveMemos([{ kind: 'resultat', text: stClean(text) }], 'résultats');
};

// ============================================================
// MA MARQUE : ecran
// ============================================================
function stMarqueHtml(){
  const m = ST.m || stMarqueFusion(window.ST_MARQUE);
  ST.m = m;
  const pills = (key, list, multi) => `<div class="ag-pills">${list.map(([k, l]) => { const on = multi ? (m[key] || []).includes(k) : m[key] === k;
    return `<button type="button" class="${on ? 'on' : ''}" onclick="stMPill('${key}','${k}',${multi ? 1 : 0})">${l}</button>`; }).join('')}</div>`;
  const ex = 'Élégance en noir';
  const col = stCouleurs(m);
  return `<div class="st-top"><button class="ag-back" onclick="stQuitter()">${agIcon('chev', 16)} Marketing</button><h2>Ma marque</h2></div>
    <p class="mk-intro">Tout ce que l'app et l'IA utilisent pour écrire tes publications comme toi : ton nom, ton ton, ta façon de présenter une légende, tes hashtags, ta police.</p>
    <div class="st-card"><h3>${agIcon('star', 18)} Mon identité</h3>
      <label>Nom de la marque</label><input value="${stE(m.nom)}" oninput="ST.m.nom=this.value" placeholder="Henzo Photographie">
      <label>Slogan</label><input value="${stE(m.slogan)}" oninput="ST.m.slogan=this.value" placeholder="Sublimer chaque instant de vie">
      <label>Ton (plusieurs choix possibles)</label>${pills('tons', [['elegant', 'Élégant'], ['chaleureux', 'Chaleureux'], ['fun', 'Fun']], true)}
      <label>Emojis</label>${pills('emojis', [['aucun', 'Aucun'], ['peu', 'Un peu'], ['beaucoup', 'Beaucoup']])}
    </div>
    <div class="st-card"><h3>${agIcon('note', 18)} Structure de mes légendes</h3>
      <p>Coche les parties à mettre et range-les dans l'ordre. L'IA suit cet ordre pour la page Facebook.</p>
      <ul class="st-blocs">${m.structure.map((b, i) => `<li class="${b.on ? '' : 'off'}"><input type="checkbox" ${b.on ? 'checked' : ''} onchange="ST.m.structure[${i}].on=this.checked;stRefresh()"><i>${i + 1}</i><span>${stE(ST_BLOCS[b.k] || b.k)}</span>
        <button title="Monter" ${i === 0 ? 'disabled' : ''} onclick="stMBloc(${i},-1)">${agIcon('up', 15)}</button><button title="Descendre" ${i === m.structure.length - 1 ? 'disabled' : ''} onclick="stMBloc(${i},1)">${agIcon('down', 15)}</button></li>`).join('')}</ul>
      <label>Lieu</label><input value="${stE(m.lieu)}" oninput="ST.m.lieu=this.value" placeholder="Studio à Ahougnansou, Bouaké">
      <label>Phrase de fin (appel à réserver)</label><input value="${stE(m.fin)}" oninput="ST.m.fin=this.value" placeholder="Réserve ta séance en message privé">
      <label>Contact WhatsApp</label><input value="${stE(m.contact)}" oninput="ST.m.contact=this.value" placeholder="Ex : WhatsApp 07 00 00 00 00" inputmode="tel">
    </div>
    <div class="st-card"><h3>${agIcon('type', 18)} Titres en gras</h3>
      <p>Facebook et Instagram n'ont pas de gras : l'app utilise des lettres spéciales, seulement pour le titre. Sur WhatsApp, elle met *le titre entre étoiles*.</p>
      <div class="ag-pills"><button type="button" class="${m.gras !== false ? 'on' : ''}" onclick="stMGras(true)">Oui, titre en gras</button><button type="button" class="${m.gras === false ? 'on' : ''}" onclick="stMGras(false)">Non</button></div>
      ${m.gras !== false ? `<label>Lettres avec accent</label>${pills('accents', [['colles', 'Accent sur la lettre en gras'], ['normaux', 'Lettre accentuée normale']])}` : ''}
      <div class="st-prev"><small>Aperçu Facebook</small>${stE(m.gras !== false ? stGras(ex + ' - Destinée, 25 ans', m.accents) : ex + ' - Destinée, 25 ans')}</div>
      <div class="st-prev"><small>Aperçu WhatsApp</small><b>${stE(ex)} - Destinée, 25 ans</b></div>
    </div>
    <div class="st-card"><h3>${agIcon('search', 18)} Mes hashtags</h3>
      <label>Toujours mis (dans cet ordre)</label><textarea rows="2" oninput="ST.m.hashtags_fixes=this.value">${stE(m.hashtags_fixes)}</textarea>
      <label>Par type de séance</label>
      ${ST_TYPES.map(([k, l]) => `<label style="margin-top:6px">${l}</label><input value="${stE(m.hashtags_types[k] || '')}" oninput="ST.m.hashtags_types['${k}']=this.value">`).join('')}
      <label style="margin-top:12px">Nombre maximum de hashtags par réseau</label>
      <div class="st-g3">${ST_CANAUX.map(([c, nom]) => `<label>${nom.replace('Profil perso Facebook', 'Profil perso').replace('Groupes Facebook', 'Groupes')}<input type="number" min="0" max="30" inputmode="numeric" value="${stE(m.max[c] != null ? m.max[c] : ST_MAX_DEF[c])}" oninput="ST.m.max['${c}']=this.value===''?null:Number(this.value)"></label>`).join('')}</div>
    </div>
    <div class="st-card"><h3>${agIcon('sparkles', 18)} Exemples de mes publications</h3>
      <p>Colle 2 ou 3 anciennes légendes que tu aimes. L'IA en tire ton style en règles courtes, et s'en sert pour chaque texte.</p>
      ${m.exemples.map((t, i) => `<textarea rows="3" style="margin-bottom:8px" placeholder="Légende ${i + 1}" oninput="ST.m.exemples[${i}]=this.value">${stE(t)}</textarea>`).join('')}
      <button class="btn-secondary mk-ib" ${ST.busy === 'style' ? 'disabled' : ''} onclick="stApprendreStyle()">${agIcon('sparkles', 15)} ${ST.busy === 'style' ? "L'IA lit tes légendes..." : 'Apprendre mon style'}</button>
      ${m.style.length ? `<div class="st-sep">Mon style (modifiable, une règle par ligne)</div><textarea rows="${Math.min(8, m.style.length + 1)}" oninput="ST.m.style=this.value.split('\\n').map(x=>x.trim()).filter(Boolean)">${stE(m.style.join('\n'))}</textarea>` : ''}
    </div>
    <div class="st-card"><h3>${agIcon('type', 18)} Ma police</h3>
      <p>Sans empattement, propre et moderne. Elle sert pour l'image avec titre.</p>
      <div class="st-fonts">${Object.entries(ST_POLICES).map(([k, p]) => `<button class="st-font ${m.police === k ? 'on' : ''}" data-police="${k}" onclick="ST.m.police='${k}';stRefresh()">
        <span class="st-fa" style="font-family:'${p.titre}',sans-serif;font-weight:${p.tw}">Destinée - 25 ans</span>
        <span class="st-fb" style="font-family:'${p.texte}',sans-serif;font-weight:${p.xw}">${stE(m.nom || 'Henzo Photographie')}</span>
        <small>${stE(p.nom)} · ${stE(p.note)}</small><span class="st-chk">${m.police === k ? agIcon('check', 13) : ''}</span></button>`).join('')}</div>
    </div>
    <div class="st-card"><h3>${agIcon('palette', 18)} Couleurs et logo</h3>
      <div class="st-g3">${[['fond', 'Bandeau'], ['texte', 'Texte'], ['accent', 'Accent']].map(([k, l]) => `<label>${l}<div class="st-col"><input type="color" value="${stE(col[k])}" oninput="ST.m.couleurs['${k}']=this.value;stMSwatch()"><span style="font-size:11px;color:var(--muted)">${stE(col[k])}</span></div></label>`).join('')}</div>
      <div class="st-swatch" id="stSwatch">${stMSwatchHtml(col, m)}</div>
      <button class="st-link" style="margin-top:8px" onclick="ST.m.couleurs={fond:'',texte:'#ffffff',accent:''};stRefresh()">Couleurs de l'app</button>
      <div class="st-logo"><div class="st-lb">${m.logo ? `<img id="stLogoPrev" alt="Logo">` : `<span style="font-size:11px;color:var(--muted)">Pas de logo</span>`}</div>
        <div><button class="st-link" onclick="stLogoChoisir()">${m.logo ? 'Changer le logo' : 'Ajouter mon logo (PNG)'}</button>${m.logo ? `<button class="st-link" style="margin-left:6px;color:var(--red)" onclick="ST.m.logo=null;stRefresh()">Retirer</button>` : ''}
        <div class="ag-hint" style="margin-top:6px">Facultatif. Un PNG avec fond transparent est le plus joli.</div></div></div>
    </div>
    <div class="st-foot"><button class="st-b1" ${ST.busy === 'marque' ? 'disabled' : ''} onclick="stMarqueSave()">${ST.busy === 'marque' ? 'Enregistrement...' : 'Enregistrer ma marque'}</button></div>`;
}
function stLisible(hex){ const h = String(hex || '').replace('#', ''); if(h.length < 6) return '#fff'; const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#111' : '#fff'; }
function stMSwatchHtml(col, m){ const p = ST_POLICES[m.police] || ST_POLICES.montserrat; return `<div style="background:${stE(col.fond)};color:${stE(col.texte)};font-family:'${p.titre}',sans-serif">Titre</div><div style="background:${stE(col.accent)};color:${stLisible(col.accent)}">Accent</div>`; }
function stMSwatch(){ const el = document.getElementById('stSwatch'); if(el) el.innerHTML = stMSwatchHtml(stCouleurs(ST.m), ST.m); }
function stMPill(key, k, multi){
  const m = ST.m;
  if(multi){ const a = m[key] || []; m[key] = a.includes(k) ? a.filter(x => x !== k) : a.concat([k]); if(!m[key].length) m[key] = [k]; }
  else m[key] = k;
  stRefresh();
}
function stMGras(on){ ST.m.gras = !!on; stRefresh(); }
function stMBloc(i, d){ const s = ST.m.structure, j = i + d; if(j < 0 || j >= s.length) return; const x = s.splice(i, 1)[0]; s.splice(j, 0, x); stRefresh(); }
async function stMarqueAfter(){
  stFonts();
  const m = ST.m; if(!m || !m.logo) return;
  const img = document.getElementById('stLogoPrev'); if(!img) return;
  let src = null; try { src = localStorage.getItem('stLogo:' + m.logo); } catch(e){}
  if(!src){ try { src = (await mkSign([m.logo]))[0]; } catch(e){} }
  if(src) img.src = src;
}
async function stMarqueSave(){
  if(!ST.m) return;
  ST.busy = 'marque'; stRefresh();
  const m = JSON.parse(JSON.stringify(ST.m));
  m.nom = String(m.nom || '').trim() || 'Henzo Photographie';
  m.exemples = (m.exemples || []).map(x => String(x || ''));
  const ok = await stSauverMarque(m);
  ST.busy = '';
  if(ok){ ST.m = JSON.parse(JSON.stringify(window.ST_MARQUE)); agToast('Ma marque est enregistrée'); }
  stRefresh();
}
async function stApprendreStyle(){
  const ex = (ST.m.exemples || []).map(x => String(x || '').trim()).filter(x => x.length > 20);
  if(!ex.length){ agToast('Colle au moins une ancienne légende', 'error'); return; }
  ST.busy = 'style'; stRefresh();
  try {
    const q = `APPRENDRE MON STYLE. Voici ${ex.length} légende(s) que Henzo a déjà publiées :\n${ex.map((t, i) => `--- Légende ${i + 1} ---\n${t.slice(0, 1500)}`).join('\n')}\n\nRésume son style en 4 à 7 règles courtes et concrètes (longueur, ton, emojis, formules qu'il aime, façon de commencer et de finir, hashtags). Une règle = une phrase de moins de 15 mots, en français simple.\nRéponds UNIQUEMENT en JSON : {"regles":["..."]}`;
    const r = await mkAI({ messages: [{ role: 'user', text: q }], maxTokens: 800 });
    const regles = (mkJson(r.text).regles || []).map(stClean).filter(Boolean).slice(0, 8);
    if(!regles.length) throw new Error("L'IA n'a pas trouvé de règle. Réessaie.");
    ST.m.style = regles;
    agToast('Style appris : pense à enregistrer');
  } catch(e){ agAlert(e.message || String(e)); }
  ST.busy = ''; stRefresh();
}
function stLogoChoisir(){
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/png,image/*'; inp.style.display = 'none';
  inp.onchange = async () => {
    const f = inp.files[0]; inp.remove(); if(!f) return;
    try {
      const png = await stLogoPng(f, 512);
      const uid = await mkUid(); if(!uid) throw new Error('Pas connecté');
      const path = `${uid}/marque-logo-${Date.now()}.png`;
      const { error } = await sb.storage.from('marketing').upload(path, png, { contentType: 'image/png', upsert: true });
      if(error) throw new Error(error.message || 'envoi');
      const data = await new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(png); });
      try { if(String(data).length < 400000) localStorage.setItem('stLogo:' + path, data); } catch(e){}
      ST.m.logo = path; ST.logoImg = null;
      agToast('Logo ajouté : pense à enregistrer');
      stRefresh();
    } catch(e){ agAlert('Logo non envoyé : ' + (e.message || e)); }
  };
  document.body.appendChild(inp); inp.click();
}
// Reduit le logo en PNG (garde la transparence)
function stLogoPng(file, max){
  return new Promise((ok, ko) => {
    const u = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const r = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * r)); c.height = Math.max(1, Math.round(img.height * r));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
      c.toBlob(b => b ? ok(b) : ko(new Error('Image illisible')), 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(u); ko(new Error('Image illisible')); };
    img.src = u;
  });
}

// ---------- Demarrage ----------
// marketing.js peut arriver apres ce fichier : on attend qu'il soit la pour afficher le bouton
(function stInit(){
  let n = 0;
  const go = () => {
    if(typeof mkRenderTab !== 'function' || typeof MK === 'undefined'){ if(++n < 60) setTimeout(go, 250); return; }
    if(MK.loaded && document.getElementById('mkBody') && !document.querySelector('#mkBody .st-hero') && !['studio', 'marque'].includes(MK.tab)) mkRenderTab();
  };
  go();
})();
