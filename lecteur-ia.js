// ============================================================
// LECTEUR-IA.JS - Partie « intelligence » du Lecteur d'images
// - Actions rapides (résumer, expliquer, tableau, document propre, comparer, analyse visuelle)
// - Consigne donnée à l'IA : séparer « Visible dans l'image » et « Interprétation », ne rien inventer,
//   poser une question quand la demande est ambiguë
// - Envoi via le relais IA existant de la Super App (ia.js : iaRelais) : mêmes clés, mêmes quotas
// - Affichage des réponses (mini Markdown sécurisé) et récupération des tableaux
// Par défaut, seul le TEXTE lu sur l'appareil est envoyé ; les images ne partent que si on l'a demandé.
// Utilisé par lecteur.js.
// ============================================================
(function(){
if(window.LecteurIA) return;

const ACTIONS = [
  { id: 'resume', icone: '📝', nom: 'Résumer', texte: 'Résume le contenu en quelques points clairs.' },
  { id: 'explique', icone: '💡', nom: 'Expliquer', texte: "Explique-moi ce que contient cette capture et ce que signifie le message ou le document." },
  { id: 'infos', icone: '⭐', nom: 'Infos importantes', texte: "Identifie les informations importantes : noms, montants, dates, numéros, et ce qu'il y a à faire." },
  { id: 'tableau', icone: '📊', nom: 'Mettre en tableau', texte: "Organise les informations sous forme de tableau clair (tableau Markdown)." },
  { id: 'propre', icone: '📄', nom: 'Document propre', texte: "Transforme ce texte en document propre et bien structuré (titres, listes). Corrige seulement les erreurs de lecture évidentes, sans rien inventer." },
  { id: 'comparer', icone: '⚖️', nom: 'Comparer', multi: true, texte: "Compare les informations des différentes images : points communs, différences et informations répétées." },
  { id: 'visuel', icone: '🎨', nom: 'Analyse visuelle', visuel: true, texte: "Analyse visuellement l'image. Si c'est une affiche : titre principal, textes secondaires, prix et promotions, couleurs dominantes, organisation et hiérarchie visuelle, composition. Si c'est une interface : éléments visibles, fonction probable de chaque composant, organisation, problèmes visuels apparents. Si c'est un document : structure, sections, tableaux et listes." }
];

const MAX_TEXTE = 14000;   // caractères de texte lu envoyés au maximum

// Consigne générale. sections : [{ titre, texte }]
function systeme(sections, avecImages){
  let reste = MAX_TEXTE;
  const bloc = (sections || []).map(s => {
    const t = String(s.texte || '').trim().slice(0, Math.max(0, reste)); reste -= t.length;
    return `=== ${s.titre} ===\n${t || '(aucun texte lu)'}`;
  }).join('\n\n');
  return `Tu es l'assistant de lecture d'images de la Super App Henzo. Tu aides à comprendre des captures d'écran et des images (conversations, documents, factures, affiches, interfaces...).

RÈGLES :
- Réponds en français, de façon claire, concise et directement utile.
- N'invente rien : appuie-toi uniquement sur ce qui est fourni. Si une information est absente ou illisible, dis-le.
- Le texte ci-dessous vient d'une lecture automatique (OCR) : il peut contenir des erreurs, surtout dans les chiffres, les noms et les accents. Signale tes doutes quand c'est important.
- Pour une explication, une analyse ou un résumé, sépare toujours clairement deux parties : **Visible dans l'image** (ce qui est réellement écrit ou visible) puis **Interprétation** (ce que tu en déduis ; à prendre avec prudence).
- Pour une simple extraction ou transformation (liste, tableau, document propre), donne directement le résultat, sans ces deux parties.
- Pour un tableau, utilise un tableau Markdown (| Colonne | Colonne |).
- Si la demande est ambiguë ou incomplète, pose UNE question de précision courte au lieu de deviner.
${avecImages
    ? "- Tu reçois aussi les images : décris les éléments visuels (couleurs, organisation, hiérarchie, composition) quand on te le demande, en distinguant ce que tu vois de ce que tu supposes."
    : "- Tu ne vois PAS les images, seulement le texte lu. Si on te demande une analyse visuelle (couleurs, composition...), explique qu'il faut cocher « Inclure aussi les images »."}

TEXTE LU SUR LES IMAGES :
${bloc}`;
}

function blobB64(blob){
  return new Promise((ok, ko) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(',')[1]); fr.onerror = ko; fr.readAsDataURL(blob); });
}

// historique : [{ role: 'user'|'assistant', text }] ; blobs : images à joindre (facultatif, 4 max)
async function envoyer({ sections, historique, question, blobs }){
  if(typeof window.iaRelais !== 'function') throw new Error("L'IA de la Super App n'est pas disponible.");
  const imgs = [];
  for(const b of (blobs || []).slice(0, 4)) imgs.push({ mime: b.type && /^image\//.test(b.type) ? b.type : 'image/jpeg', data: await blobB64(b) });
  const r = await window.iaRelais({
    system: systeme(sections, imgs.length > 0),
    messages: [...(historique || []), { role: 'user', text: question }],
    images: imgs, maxTokens: 2500, tache: imgs.length ? 'images' : 'texte'
  });
  return { texte: String(r.text || '').trim(), fournisseur: r.fournisseur || '', modele: r.modele || '' };
}

// ---------- Mini Markdown : en blocs, puis en HTML ou en DOCX ----------
// blocs : { t:'h', n, texte } | { t:'p', texte } | { t:'li', texte, num } | { t:'table', lignes:[[cellules]] } | { t:'vide' }
function blocs(md){
  const L = String(md || '').replace(/\r/g, '').split('\n'), out = [];
  const estLigneTab = l => /^\s*\|.*\|\s*$/.test(l);
  const cellules = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
  for(let i = 0; i < L.length; i++){
    const l = L[i];
    if(estLigneTab(l)){
      const rows = [];
      while(i < L.length && estLigneTab(L[i])){
        const c = cellules(L[i]);
        if(!c.every(x => /^:?-{2,}:?$/.test(x))) rows.push(c);   // saute la ligne |---|---|
        i++;
      }
      i--; if(rows.length) out.push({ t: 'table', lignes: rows });
    } else if(/^\s*#{1,4}\s+/.test(l)){
      out.push({ t: 'h', n: Math.min(4, l.match(/^\s*(#+)/)[1].length), texte: l.replace(/^\s*#+\s+/, '').trim() });
    } else if(/^\s*(?:[-*•]|\d+[.)])\s+/.test(l)){
      const num = /^\s*\d+[.)]/.test(l);
      out.push({ t: 'li', num, texte: l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '') });
    } else if(!l.trim()){
      if(out.length && out[out.length - 1].t !== 'vide') out.push({ t: 'vide' });
    } else out.push({ t: 'p', texte: l.trim() });
  }
  while(out.length && out[out.length - 1].t === 'vide') out.pop();
  return out;
}
const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Gras **x** et italique *x* (après échappement : rien d'exécutable ne peut passer)
const inline = s => E(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[\s(])\*(?!\s)([^*]+?)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
function html(md){
  const B = blocs(md); let h = '', liste = null;
  const fermer = () => { if(liste){ h += `</${liste}>`; liste = null; } };
  B.forEach(b => {
    if(b.t === 'li'){
      const tag = b.num ? 'ol' : 'ul';
      if(liste !== tag){ fermer(); h += `<${tag}>`; liste = tag; }
      h += `<li>${inline(b.texte)}</li>`; return;
    }
    fermer();
    if(b.t === 'h') h += `<h${b.n + 2}>${inline(b.texte)}</h${b.n + 2}>`;
    else if(b.t === 'p') h += `<p>${inline(b.texte)}</p>`;
    else if(b.t === 'table'){
      const [tete, ...corps] = b.lignes;
      h += `<div class="lc-tw"><table><thead><tr>${tete.map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${corps.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
  });
  fermer();
  return h;
}
// Tableaux trouvés dans une réponse : [[ [cellules], ... ], ...]
function tableaux(md){ return blocs(md).filter(b => b.t === 'table').map(b => b.lignes); }
// Retire le gras/italique Markdown pour les exports texte
const nu = s => String(s || '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/(^|\s)\*(?!\s)([^*]+?)\*(?=\s|$)/g, '$1$2');

window.LecteurIA = { ACTIONS, systeme, envoyer, blocs, html, tableaux, nu };
})();
