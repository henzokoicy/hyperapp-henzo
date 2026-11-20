# Passation : suite de la charte Henzo Studio (galerie, filigranes, equipe, mood)

Fichier prepare pour demarrer une nouvelle conversation. Le message a coller est tout en bas.

## Etat du depot (au moment de la passation)
- Depot : `henzokoicy/hyperapp-henzo`, `main` est a jour (derniere fusion : PR #30).
- Branche de travail a recreer depuis `main` pour la prochaine conversation (nom libre, ex. `claude/galerie-charte`).
- Site : https://hyperapp-henzo.vercel.app (Vercel + apercu Netlify sur chaque PR).

## Deja fait et fusionne dans `main`
| PR | Contenu |
|---|---|
| #25 | Accueil : carte "Prochain pas" (`prochain-pas.js`) |
| #26 | Regles de la Vision appliquees en avertissements (`regles.js`) |
| #27 | Tableau de bord de croissance (`croissance.js`) |
| #28 | Pages reservation et paiement a la charte (`charte-pages.css`, `reserver.html`, `pay.html`, `pages-theme.js`) |
| #29 | Tarifs (ecran + PDF) et contrat a la charte (`tarifs.html`, `contrat.html`, `contrat-commun.js`) |
| #30 | PDF de l'app a la charte (`pdf-charte.js`, reçu client dans `modules.js`) + nouveau logo (dossier `logos/`, `icon-512.png`) |

## Outils deja disponibles pour la suite
- `charte-pages.css` : variables de la charte (sombre par defaut, clair via `data-clair="1"`), logo (`.hz-on-dark` / `.hz-on-light`), polices Fraunces/Inter, couleurs sur surfaces vert olive. A lier apres le `<style>` d'une page.
- `pages-theme.js` : applique le theme envoye par l'app et pose `data-clair` sur `<html>`.
- `pdf-charte.js` : `window.hzPdf` (couleurs en RGB, `logo(doc, x, y, largeur)`, `prete()`), pour jsPDF.
- Logos dans `logos/` (nouveau logo livre par Henzo) : horizontaux clair/sombre (783x360), carres, filigrane blanc et noir (783x360), avatar, symbole transparent, favicons, banniere Facebook, carte de visite, statut WhatsApp. `icon-512.png` refait depuis le logo carre.

## A faire (etape 4 restante)
1. **Galerie et filigranes** (`galerie.js`, ~1035 lignes)
   - Option "Mettre mon nom (filigrane) sur les photos telechargees" ligne ~248 (`o.filigrane`). Aujourd'hui c'est un nom en texte : le brancher sur les filigranes officiels `logos/logo-filigrane-blanc.png` / `logos/logo-filigrane-noir.png` (choisir blanc ou noir selon la photo, placement, taille, opacite).
   - Page galerie cote client : logo, polices, couleurs de la charte (verifier quel fichier HTML la sert et si elle suit le theme).
   - `galerie.js` est le seul fichier qui parle de filigrane.
2. **`equipe.html`** (424 lignes) et **`mood.html`** (251 lignes, avec `mood.js`) : logo, polices, couleurs via `charte-pages.css` ; retirer le bleu/rose/or ou autres couleurs codees en dur.

## Ensuite (reste de la liste d'origine)
5. L'or (`--yellow`/`--gold`) sert aux avertissements dans les themes Henzo : mettre les avertissements en neutre, or seulement pour les mentions premium.
6. Graphiques : echelle de verts secondaire (green-900 `#0f2a1d`, 700 `#375534`, 500 `#6b9071`, 300 `#aec3b0`, 100 `#e3eed4`).
7. Arrondis (31 valeurs) et tailles de texte (31 tailles) a ramener a l'echelle de la charte : touche presque tous les ecrans, seulement sur demande.
8. Ton pro et elegant dans les textes que l'app ecrit (relances, WhatsApp, coach) ; decision en attente : garder ou retirer les anciens themes (Aurora, Neon, etc.).

## Points d'attention / limites connues
- L'app ne charge pas dans le bac a sable (Supabase bloque) : tester avec Playwright et des donnees factices, et le dire clairement.
- Dans une session, l'outil Bash peut etre refuse par un plugin de confidentialite quand une commande lit `modules.js` (il contient des donnees clients). Utiliser Read / Edit / Grep a la place, et demander a Henzo de lancer `node --check modules.js` lui-meme si besoin.
- Pas de PR sans l'accord de Henzo. Habitude : je propose, il dit oui, je cree la PR vers `main`, il dit "fusionne", je m'abonne, je verifie Vercel et Netlify verts, je fusionne (merge classique), puis la branche repart de `main`.
- Pas d'emoji dans l'interface. Couleurs toujours via variables CSS (les themes sont personnalisables).
- Non verifie visuellement en vrai : reçu PDF, PDF des tarifs imprime, signature de contrat, parcours de paiement reel. A demander a Henzo de controler.
- Cache navigateur : l'ancien logo peut rester affiche quelques heures.

## Message a coller dans la nouvelle conversation

```
CONTEXTE (suite de la charte Henzo Studio)

Depot : henzokoicy/hyperapp-henzo = la "Super App" de Henzo Studio (photographe/videaste a Bouake puis Abidjan). Site : https://hyperapp-henzo.vercel.app (Vercel + apercu Netlify sur chaque PR). JavaScript/HTML/CSS sans build. Donnees dans Supabase.

LIS D'ABORD le fichier PASSATION-galerie-filigranes.md (etat, outils deja crees, reste a faire, limites). Il est sur la branche claude/prochain-pas-iz86oy, pas encore dans main : fais `git fetch origin claude/prochain-pas-iz86oy` puis lis-le avec `git show origin/claude/prochain-pas-iz86oy:PASSATION-galerie-filigranes.md`.

COMMENT TRAVAILLER AVEC HENZO
- Reponds en francais simple et court. Il ecrit vite, avec des fautes : comprends l'intention. Il n'est pas developpeur : explique ce que ca change pour lui.
- Ne cree une PR que s'il le demande. Habituel : je propose la PR, il dit oui, je la cree vers main, il dit "fusionne", je m'abonne a la PR, je verifie que Vercel et Netlify sont verts, puis je fusionne (merge classique). Apres fusion, la branche repart de main.
- Sois honnete sur ce qui n'est pas verifie : l'app ne charge pas dans le bac a sable (Supabase bloque). Teste avec Playwright et des donnees factices.
- Verifie la syntaxe (node --check) de chaque JS modifie. Si Bash est refuse par le plugin de confidentialite (surtout sur modules.js), utilise Read/Edit/Grep ; ne mets jamais l'adresse e-mail de Henzo dans une requete externe.
- Pas d'emoji dans l'interface. Couleurs toujours via variables CSS (themes personnalisables). Charte : vert olive sur surface sombre ou claire (jamais vert sur vert), Fraunces titres, Inter texte, Outfit logo seulement, arrondis 4/10/999, or reserve au premium.

BRANCHE : cree une branche depuis main (ex. claude/galerie-charte), pousse-la, puis propose la PR vers main (sans la creer sans l'accord de Henzo).

MISSION DE CETTE CONVERSATION
Terminer l'etape 4 (documents clients a la charte) :
1. Galerie et filigranes (galerie.js) : brancher l'option filigrane sur les filigranes officiels logos/logo-filigrane-blanc.png et logo-filigrane-noir.png (choix blanc/noir, placement, taille, opacite), et mettre la page galerie client a la charte (logo, polices, couleurs).
2. equipe.html et mood.html (+ mood.js) : logo, polices, couleurs via charte-pages.css ; retirer les couleurs codees en dur.
Puis, si Henzo le demande : etape 5 (or reserve au premium, avertissements en neutre), etape 6 (graphiques en echelle de verts), etape 8 (ton pro dans les textes que l'app ecrit).

Commence par lire la passation, ouvre galerie.js autour de la ligne 248 et dis-moi en une phrase ce que tu comptes faire avant de coder.
```
