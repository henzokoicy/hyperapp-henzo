// ============================================================
// COACH2.JS - Le Coach complet de Henzo Studio (onglet Coach)
// Sous-onglets : Aujourd'hui, Mes plans, Charges fixes, Négocier,
// École de la vente, Journal.
// - Le coach détecte les problèmes (finances, marketing, clients,
//   ventes, organisation), propose un plan de 3 à 6 étapes, suit les
//   étapes (fait / échec), demande les résultats, garde un journal.
// - École de la vente : programme de leçons courtes + exercice noté par l'IA.
// - Négociation : analyse d'un budget client, messages prêts,
//   simulation, vraie discussion, résultat. window.coNegocier({...})
// Tables : coach_plans, coach_journal, negociations, ecole_progres
// Charges fixes : budget.js (bgRenderCharges, bgChargesResume, bgChargesContexte)
// ============================================================

// ------------------------------------------------------------
// 1. PROGRAMME DE L'ÉCOLE DE LA VENTE
// ------------------------------------------------------------
// exemple : [qui, texte]  c = client, h = Henzo
const CO_LECONS = [
{ id: 'l01', titre: 'Tu es un expert, pas un vendeur qui supplie', theme: 'Posture', tags: ['posture', 'trop_cher'],
  technique: `Le client sent tout de suite si tu as besoin de son argent. Quand tu écris "svp, je peux faire un petit prix pour toi", tu dis sans le vouloir que ton travail ne vaut pas grand-chose.
Le bon photographe parle comme un médecin : il écoute, il pose des questions, puis il conseille. Il ne se justifie pas, il explique.
Ta posture, c'est : "Je suis là pour que tes photos soient belles. Je te dis ce qui marche." Tu restes calme, souriant, et sûr de ton prix.`,
  exemple: [['c', 'Bonsoir, c\'est combien la séance photo ?'], ['h', 'Bonsoir ! Merci de m\'écrire. Pour te conseiller la bonne formule, c\'est pour quelle occasion ? Anniversaire, photos de couple, photos pro ?'], ['c', 'C\'est pour mon anniversaire samedi.'], ['h', 'Super, joyeux anniversaire en avance ! Pour un anniversaire, la plupart de mes clientes prennent la formule avec 2 tenues. Je t\'envoie les 3 formules et je te dis laquelle je te conseille.']],
  retenir: ['Tu conseilles, tu ne supplies pas.', 'Pas de "petit prix pour toi" avant même que le client demande.', 'Calme et sûr de toi, même quand le client hésite.'],
  exo: { client: 'Fatou, 24 ans, étudiante, a vu tes photos sur Facebook. Elle est polie mais un peu timide.', consigne: 'Réponds avec la posture d\'un expert : accueille-la, pose une question, ne donne pas de prix au hasard.', premier: 'Bonsoir monsieur, svp vous faites les photos ? Je voulais savoir le prix.' } },

{ id: 'l02', titre: 'Poser des questions avant de donner un prix', theme: 'Découverte', tags: ['questions', 'trop_cher', 'conclure'],
  technique: `Si tu donnes ton prix dans le premier message, le client compare seulement des chiffres. Il ne sait pas encore ce que tu vas lui apporter.
Avant le prix, pose 2 ou 3 questions simples : l'occasion, la date, le nombre de personnes, ce qu'il veut faire des photos (statut, cadre, cadeau).
Ses réponses te donnent les mots pour vendre : "Tu veux un cadre pour ta maman ? Alors le pack avec tirage est fait pour toi." Et le client se sent écouté.`,
  exemple: [['c', 'Le shooting c\'est combien ?'], ['h', 'Bonsoir ! Je te réponds tout de suite. Juste 2 questions pour te donner le bon prix : c\'est pour quelle occasion, et vous serez combien sur les photos ?'], ['c', 'C\'est pour moi et mon mari, 5 ans de mariage.'], ['h', 'Félicitations ! Pour un anniversaire de mariage, je vous conseille le pack Couple : 2 tenues, 15 photos retouchées, et un tirage A4 pour votre salon.']],
  retenir: ['2 ou 3 questions, pas un interrogatoire.', 'L\'occasion, la date, le nombre de personnes, l\'usage des photos.', 'Réutilise ses mots dans ta proposition.'],
  exo: { client: 'Kouassi, 35 ans, commerçant, pressé, écrit en messages très courts.', consigne: 'Il demande le prix direct. Pose tes questions sans l\'énerver, en restant court.', premier: 'Prix photo ?' } },

{ id: 'l03', titre: 'L\'écoute : laisse le client parler', theme: 'Découverte', tags: ['ecoute', 'questions'],
  technique: `Le client te dit souvent ce qu'il veut acheter, si tu le laisses parler. "Je veux des photos simples, rien de trop" ne veut pas dire "je veux le moins cher". Ça peut vouloir dire "je ne suis pas à l'aise devant l'appareil".
Écouter, c'est : lire tout son message, reformuler ("Si je comprends bien, tu veux..."), et répondre à SA peur, pas à la tienne.
Un vocal WhatsApp du client est une mine d'or : il parle de sa famille, de son budget, de son stress. Note ces détails dans sa fiche client.`,
  exemple: [['c', 'Je veux faire des photos mais je ne suis pas photogénique hein, je ne sais pas poser.'], ['h', 'Je comprends, beaucoup de mes clientes me disent la même chose au début. Pendant la séance, je te guide à chaque pose, tu n\'as rien à savoir. Et je te montre les photos sur l\'écran au fur et à mesure.'], ['c', 'Ah bon ? Ça me rassure.']],
  retenir: ['Reformule pour montrer que tu as compris.', 'Réponds à sa vraie peur (poser, le prix, le résultat).', 'Note les détails dans la fiche client.'],
  exo: { client: 'Mariam, 30 ans, maman de 2 enfants, stressée par les photos de famille.', consigne: 'Elle exprime une peur. Montre que tu l\'as écoutée et rassure-la, sans parler de prix.', premier: 'Bonjour, je veux faire des photos de famille mais mes enfants bougent trop, je ne sais pas si ça va aller...' } },

{ id: 'l04', titre: 'Présenter 3 packs', theme: 'Offre', tags: ['trois_packs', 'trop_cher', 'monter'],
  technique: `Avec un seul prix, le client a deux choix : oui ou non. Avec 3 packs, il choisit LEQUEL. Tu passes de "est-ce que j'achète ?" à "qu'est-ce que je prends ?".
Le petit pack sert à ceux qui ont peu de budget. Le pack du milieu est celui que tu veux vendre : mets-le en avant ("le plus choisi"). Le grand pack rend le pack du milieu raisonnable.
Présente-les du plus complet au plus simple, avec ce qui change entre eux, en 3 lignes chacun. Pas de roman.`,
  exemple: [['h', 'Voici mes 3 formules pour ton anniversaire :\n- Prestige : 3 tenues, 25 photos, maquillage, cadre A4 = 45 000 F\n- Classique (la plus choisie) : 2 tenues, 15 photos = 25 000 F\n- Solo : 1 tenue, 6 photos = 12 000 F\nTu préfères laquelle ?'], ['c', 'Je pense que la Classique va aller.']],
  retenir: ['3 choix : on choisit lequel, pas si on achète.', 'Le pack du milieu est ta cible : dis "le plus choisi".', 'Finis par une question : "Tu préfères laquelle ?"'],
  exo: { client: 'Aya, 26 ans, veut des photos pour ses 26 ans, budget pas dit.', consigne: 'Présente-lui 3 formules claires (invente des prix réalistes pour Bouaké) et pousse doucement celle du milieu.', premier: 'Bonsoir, je veux faire des photos pour mon anniversaire, vous avez quoi comme formules ?' } },

{ id: 'l05', titre: 'L\'ancrage : montre d\'abord le plus complet', theme: 'Prix', tags: ['ancrage', 'trop_cher', 'monter'],
  technique: `Le premier prix que le client voit devient sa référence. Si tu commences par 10 000 F, alors 25 000 F paraît cher. Si tu commences par 60 000 F, alors 25 000 F paraît raisonnable.
C'est l'ancrage. Dans ta grille, sur ton statut, dans tes messages : montre toujours le pack le plus complet en premier.
Attention : l'ancre doit être un vrai pack que tu vends, pas un prix inventé. Certains clients le prendront, et c'est tant mieux.`,
  exemple: [['c', 'Combien pour les photos de mariage ?'], ['h', 'Pour le mariage, ma formule Or couvre toute la journée avec 2 photographes et la vidéo : 350 000 F. La formule Argent, la plus demandée, couvre la mairie et la réception : 180 000 F. Et la formule Essentielle, juste la cérémonie : 90 000 F.']],
  retenir: ['Le premier chiffre devient la référence.', 'Commence par le pack le plus complet.', 'L\'ancre est un vrai pack, jamais un faux prix.'],
  exo: { client: 'Serge, 32 ans, fonctionnaire, prépare son mariage civil.', consigne: 'Présente tes formules mariage en utilisant l\'ancrage.', premier: 'Bonjour, je me marie en décembre, vous prenez combien pour le mariage ?' } },

{ id: 'l06', titre: 'Répondre à "c\'est trop cher"', theme: 'Objections', tags: ['trop_cher', 'prix'],
  technique: `"C'est trop cher" n'est presque jamais un non. Ça veut dire : "je ne vois pas encore pourquoi ça vaut ce prix", ou "je n'ai pas ce montant maintenant", ou "je teste si tu vas baisser".
Ne baisse jamais tout de suite. D'abord, accueille ("Je comprends"), puis demande ("Trop cher par rapport à quoi ?" ou "Tu avais prévu combien ?").
Ensuite tu as 3 réponses : rappeler la valeur, proposer un pack plus petit, ou étaler le paiement avec un acompte. Le prix reste le même.`,
  exemple: [['c', '25 000 F c\'est trop cher oh, fais un geste.'], ['h', 'Je comprends, c\'est un budget. Tu avais prévu combien ?'], ['c', '15 000.'], ['h', 'D\'accord. Pour 15 000 F je peux te faire la formule Solo : 1 tenue et 8 photos retouchées. Ou tu gardes la Classique et tu payes 10 000 F d\'acompte maintenant, le reste le jour de la séance. Qu\'est-ce qui t\'arrange ?']],
  retenir: ['"Trop cher" est une question, pas un refus.', 'Demande son budget avant de répondre.', 'Change le contenu ou le paiement, pas le prix.'],
  exo: { client: 'Brice, 28 ans, veut des photos pro pour LinkedIn, trouve ton prix de 20 000 F trop élevé.', consigne: 'Réponds à "c\'est trop cher" sans baisser ton prix.', premier: '20 000 F pour des photos ? C\'est trop cher hein, mon ami fait ça à 10 000.' } },

{ id: 'l07', titre: 'La valeur plutôt que le prix', theme: 'Prix', tags: ['valeur', 'trop_cher'],
  technique: `Le client n'achète pas "15 photos". Il achète le souvenir de son anniversaire, une belle photo pour sa maman au village, une photo de profil qui fait sérieux, le sourire de son bébé.
Parle du résultat, pas de la technique. Au lieu de "éclairage professionnel", dis "une peau lumineuse sur toutes les photos". Au lieu de "retouche", dis "tu seras au top, même si tu as mal dormi".
Et compare avec la durée : une tenue de fête se porte 2 fois, une belle photo se garde toute la vie.`,
  exemple: [['c', 'Pourquoi c\'est plus cher que le photographe du quartier ?'], ['h', 'Bonne question. Chez moi, chaque photo est retouchée une par une : peau, lumière, couleurs. Tu as tes photos en 3 jours, prêtes pour ton statut et pour imprimer. C\'est une photo que tu vas garder 20 ans, je préfère qu\'elle soit parfaite.']],
  retenir: ['Vends le souvenir et le résultat, pas la technique.', 'Utilise des mots simples : lumineuse, au top, prête pour ton statut.', 'Une photo se garde toute la vie.'],
  exo: { client: 'Nadège, 40 ans, veut une photo de famille pour les 70 ans de son papa.', consigne: 'Elle compare ton prix au photographe ambulant. Vends la valeur.', premier: 'Le photographe au marché prend 500 F la photo, pourquoi vous c\'est 30 000 ?' } },

{ id: 'l08', titre: 'Négocier sans baisser le prix : retirer plutôt que réduire', theme: 'Négociation', tags: ['retirer', 'trop_cher', 'prix'],
  technique: `Si tu baisses ton prix pour le même travail, tu dis au client que ton premier prix était faux. Il va recommencer la prochaine fois, et il va le dire à ses amis.
La règle d'or : si le prix baisse, quelque chose part. Moins de photos, sans la vidéo, sans le tirage, une seule tenue, un autre jour moins demandé (en semaine).
Tu restes gentil et flexible, mais ton prix garde sa valeur.`,
  exemple: [['c', 'On fait 30 000 au lieu de 40 000 ?'], ['h', 'Pour 30 000 F, c\'est possible si on enlève la vidéo souvenir : tu gardes les 20 photos retouchées et le tirage. Ou on garde tout, et on fait la séance un mardi au lieu du samedi. Tu préfères quoi ?']],
  retenir: ['Prix plus bas = moins de contenu.', 'Propose 2 options, le client choisit.', 'Jamais "ok, je te fais 30 000" pour le même travail.'],
  exo: { client: 'Eric, 34 ans, veut photos + vidéo pour le baptême de son fils, prix 60 000 F.', consigne: 'Il propose 45 000 F. Négocie en retirant, pas en réduisant.', premier: 'Patron, 60 000 c\'est lourd. On fait 45 000 et c\'est réglé ?' } },

{ id: 'l09', titre: 'Quand la famille négocie', theme: 'Négociation', tags: ['famille', 'trop_cher', 'mariage'],
  technique: `Chez nous, une séance ou un mariage, c'est souvent une affaire de famille. La tante, le grand frère, la maman donnent leur avis et veulent "parler avec le photographe".
Reste respectueux : salue, utilise "tantie", "maman", "tonton" si c'est naturel. Mais garde la même règle : le prix ne baisse pas sans contrepartie.
Trouve qui décide et qui paie. Écris un récapitulatif clair (ce qui est inclus, le prix, l'acompte) que la personne peut montrer à toute la famille.`,
  exemple: [['c', 'Bonjour, c\'est la tante de la mariée. On a vu votre prix, mais on est en famille, il faut nous aider.'], ['h', 'Bonjour tantie, merci de m\'écrire, et félicitations pour le mariage ! Je veux vous aider. Je vous envoie le récapitulatif clair. Si le budget est serré, on peut retirer l\'album et garder toutes les photos : ça fait 30 000 F de moins. Vous me dites ce que la famille préfère.']],
  retenir: ['Respect et chaleur avec les aînés.', 'Trouve qui décide et qui paie.', 'Un récapitulatif écrit que la famille peut lire.'],
  exo: { client: 'Tantie Odette, 55 ans, parle au nom de sa nièce qui fait sa dot. Très chaleureuse mais elle négocie dur.', consigne: 'Respecte-la, reste ferme sur le prix, propose une solution.', premier: 'Mon fils, c\'est la tantie de Christelle. Votre prix là, faut diminuer pour nous, c\'est la famille même !' } },

{ id: 'l10', titre: 'Répondre à "on va voir"', theme: 'Objections', tags: ['on_va_voir', 'relance', 'conclure'],
  technique: `"On va voir" ou "je vais réfléchir" veut souvent dire : il y a une question que le client n'a pas posée. Le prix, la date, la peur du résultat, l'accord du mari...
Réponds avec douceur et une question ouverte : "Pas de souci. Qu'est-ce qui te fait hésiter ?" Beaucoup de clients répondent honnêtement.
Puis fixe un petit rendez-vous : "Je te garde le samedi jusqu'à jeudi, ça te va ?" Sans date, "on va voir" devient "jamais".`,
  exemple: [['c', 'Ok merci, on va voir.'], ['h', 'Pas de souci, prends ton temps. Juste pour t\'aider : c\'est plutôt le prix, la date, ou autre chose qui te fait hésiter ?'], ['c', 'C\'est la date, je ne sais pas si je serai libre.'], ['h', 'Je comprends. Je te garde le samedi 14 jusqu\'à mercredi soir. Si ça ne va pas, on trouve un autre jour, sans problème.']],
  retenir: ['"On va voir" cache une question.', 'Demande avec douceur ce qui fait hésiter.', 'Fixe un délai : "je te garde la date jusqu\'à..."'],
  exo: { client: 'Rachelle, 29 ans, a demandé les prix pour des photos de grossesse.', consigne: 'Elle dit "on va voir". Découvre ce qui bloque et fixe un délai.', premier: 'D\'accord, merci pour les infos. On va voir.' } },

{ id: 'l11', titre: 'Faire monter au pack du dessus', theme: 'Offre', tags: ['monter', 'valeur'],
  technique: `Quand le client a choisi, il est content et détendu. C'est le meilleur moment pour proposer un petit plus, sans forcer.
Montre la différence en une phrase et donne l'écart de prix, pas le prix total : "Pour 8 000 F de plus, tu as une 2e tenue et 10 photos en plus."
Une seule proposition, une seule fois. S'il dit non, tu valides son choix avec le sourire : "Très bon choix, la Solo est déjà très belle."`,
  exemple: [['c', 'Je prends la formule Solo.'], ['h', 'Parfait ! Petite info : pour 8 000 F de plus, la Classique te donne une 2e tenue et 9 photos en plus. Beaucoup prennent une tenue simple et une tenue de soirée. Je te mets laquelle ?']],
  retenir: ['Propose après le oui, pas avant.', 'Donne l\'écart ("8 000 F de plus"), pas le total.', 'Une seule fois, puis tu valides son choix.'],
  exo: { client: 'Christelle, 22 ans, vient de choisir la formule Solo à 12 000 F.', consigne: 'Propose-lui le pack du dessus, sans forcer.', premier: 'Ok je prends la Solo pour samedi !' } },

{ id: 'l12', titre: 'L\'acompte : bloquer la date', theme: 'Paiement', tags: ['acompte', 'paiement', 'conclure'],
  technique: `Sans acompte, une réservation n'est qu'une promesse. Le client peut annuler la veille, et toi tu as refusé quelqu'un d'autre pour cette date.
Présente l'acompte comme une protection pour lui : "L'acompte bloque ta date, personne d'autre ne peut la prendre." Donne un montant clair (30 à 50 %) et le moyen de payer (Wave, Orange Money).
Pour les mariages et les dots, l'acompte est normal. Les clients sérieux comprennent tout de suite.`,
  exemple: [['c', 'Ok c\'est bon pour le 20.'], ['h', 'Super ! Pour bloquer le 20 à ton nom, l\'acompte est de 10 000 F par Wave au 07 00 00 00 00. Dès que je le reçois, je t\'envoie la confirmation, et la date est à toi.']],
  retenir: ['L\'acompte protège la date du client.', 'Un montant clair et un moyen de payer simple.', 'Pas d\'acompte = pas de date bloquée.'],
  exo: { client: 'Didier, 38 ans, organise l\'anniversaire de sa fille dans 3 semaines.', consigne: 'Il est d\'accord sur le prix. Demande-lui l\'acompte avec assurance.', premier: 'C\'est bon, on part sur le pack à 50 000. On se voit le jour J !' } },

{ id: 'l13', titre: 'L\'urgence honnête', theme: 'Conclure', tags: ['urgence', 'conclure', 'saisons'],
  technique: `Les gens décident quand il y a une raison de décider maintenant. Mais au studio, l'urgence doit être vraie, sinon tu perds la confiance.
Les vraies urgences : les places du samedi sont limitées, une promo finit à une date précise, la fête approche (Noël, Tabaski, fête des mères), le délai de livraison.
Dis-le simplement, sans pression : "Il me reste 2 places ce samedi."`,
  exemple: [['c', 'Je vais voir pour décembre.'], ['h', 'Pas de souci. Juste pour info : pour les fêtes de décembre, il me reste 3 samedis libres, après je suis complet. Si tu veux, je te mets une option sur le 13 jusqu\'à vendredi.']],
  retenir: ['Une urgence vraie : places, date de fin, fête.', 'Jamais de fausse urgence.', 'Propose une option avec une date limite.'],
  exo: { client: 'Inès, 27 ans, hésite à réserver pour la fête des mères.', consigne: 'Crée une urgence honnête pour qu\'elle décide cette semaine.', premier: 'Les photos mère et fille là, je vais voir et je vous reviens.' } },

{ id: 'l14', titre: 'Conclure : demander la décision', theme: 'Conclure', tags: ['conclure', 'questions'],
  technique: `Beaucoup de ventes sont perdues parce que le photographe n'a jamais demandé : "On réserve ?" Le client attend qu'on l'aide à décider.
Utilise une question à choix : "Tu préfères samedi matin ou dimanche après-midi ?", "Je te mets la Classique ou la Prestige ?". Le client choisit, et c'est réservé.
Après ta question, tais-toi. Laisse-le répondre.`,
  exemple: [['c', 'Ça a l\'air bien votre travail.'], ['h', 'Merci beaucoup ! Je te réserve un créneau ? J\'ai samedi à 10 h ou dimanche à 15 h, qu\'est-ce qui t\'arrange ?'], ['c', 'Dimanche 15 h.'], ['h', 'C\'est noté pour dimanche 15 h ! L\'acompte de 8 000 F par Wave bloque le créneau.']],
  retenir: ['Demande clairement la décision.', 'Une question à deux choix.', 'Après la question, laisse le client répondre.'],
  exo: { client: 'Paul, 31 ans, a posé plein de questions sur la séance photo couple, il semble intéressé.', consigne: 'Conclus la vente avec une question à choix.', premier: 'Ok je vois, vos photos sont vraiment belles. Et vous êtes où exactement ?' } },

{ id: 'l15', titre: 'Relancer sans harceler', theme: 'Relance', tags: ['relance', 'on_va_voir', 'devis'],
  technique: `La plupart des clients ne disent pas non : ils oublient. Une relance polie, au bon moment, récupère beaucoup de ventes.
Règle simple : 1re relance 2 jours après, 2e relance 1 semaine après, puis tu arrêtes. Chaque relance apporte quelque chose de nouveau : une photo récente, une place libre, une question.
Jamais de reproche ("tu ne m'as pas répondu"). Toujours une porte ouverte.`,
  exemple: [['h', 'Bonjour Aïcha, j\'espère que tu vas bien ! Je viens de finir une séance anniversaire avec un décor rose et doré, ça m\'a fait penser à ton projet. Tu as pu y réfléchir ? Il me reste le samedi 21 si tu veux.']],
  retenir: ['2 jours, puis 1 semaine, puis stop.', 'Chaque relance apporte du nouveau.', 'Jamais de reproche.'],
  exo: { client: 'Aïcha, 25 ans, a demandé un devis il y a 4 jours et n\'a plus répondu. Elle répond enfin, gênée.', consigne: 'Écris d\'abord ta relance, puis réponds à sa réaction.', premier: '(Aïcha n\'a pas répondu depuis 4 jours. Écris ta relance.)' } },

{ id: 'l16', titre: 'Le message WhatsApp parfait', theme: 'WhatsApp', tags: ['whatsapp', 'confiance'],
  technique: `Sur WhatsApp, le client lit vite. Un bon message est court, clair et chaleureux.
La structure : 1) salutation avec le prénom, 2) une phrase qui répond à sa question, 3) l'info utile (prix, date, ce qui est inclus) en 2 ou 3 lignes, 4) une question pour avancer.
Évite les pavés, les fautes, les "bjr" et les 10 émojis. Un ou deux émojis suffisent. Signe "Henzo Studio" pour faire pro.`,
  exemple: [['h', 'Bonsoir Grâce,\nMerci pour ton message ! Oui, je suis libre samedi 14.\nLa formule Classique : 2 tenues, 15 photos retouchées, livrées en 3 jours, 25 000 F.\nJe te bloque samedi 10 h ?\nHenzo Studio']],
  retenir: ['Prénom, réponse, info utile, question.', 'Court : 4 à 6 lignes.', 'Signe Henzo Studio.'],
  exo: { client: 'Grâce, 23 ans, demande si tu es libre ce samedi et ce qui est inclus.', consigne: 'Écris LE message WhatsApp parfait.', premier: 'Bsr vous êtes dispo samedi ? Et ya quoi dans le shooting ?' } },

{ id: 'l17', titre: 'Le statut WhatsApp qui vend', theme: 'Marketing', tags: ['statut', 'marketing'],
  technique: `Tes contacts regardent tes statuts chaque jour. C'est ta vitrine gratuite, mais seulement si tu postes avec une intention.
Un bon statut : une belle photo, une phrase courte, et une action ("Écris-moi FÊTE pour réserver"). Varie : une séance client (avec son accord), les coulisses, un avis client, une place libre.
Poste 2 ou 3 statuts par jour, aux heures où les gens regardent : le midi et le soir à partir de 19 h.`,
  exemple: [['h', 'Statut : photo d\'une cliente en robe rouge.\n"Elle voulait se sentir belle pour ses 30 ans. Mission réussie. Il reste 2 places ce samedi : écris-moi ANNIV."']],
  retenir: ['Photo + phrase + action.', 'Varie : séance, coulisses, avis, place libre.', 'Midi et soir.'],
  exo: { client: 'Une ancienne cliente, Sandrine, voit ton statut et te répond.', consigne: 'Écris d\'abord le texte d\'un statut qui vend, puis réponds à sa réaction.', premier: '(Écris le texte de ton statut du jour.)' } },

{ id: 'l18', titre: 'Les photos avant / après', theme: 'Marketing', tags: ['avant_apres', 'valeur', 'statut'],
  technique: `Le client ne voit pas le travail de retouche. Un avant / après le lui montre en une seconde, et ça justifie ton prix.
Montre une photo brute à côté de la photo finale : lumière, peau, couleurs, fond. Demande toujours l'accord du client avant de publier.
Utilise-le aussi en discussion : quand un client dit "pourquoi c'est cher ?", envoie un avant / après. Ça parle mieux que 10 phrases.`,
  exemple: [['c', 'C\'est quoi la différence avec les photos de téléphone ?'], ['h', 'Regarde ces deux photos de la même séance : à gauche, la photo sans retouche ; à droite, la photo que la cliente a reçue. Lumière, peau, couleurs : c\'est ce travail que tu payes.']],
  retenir: ['L\'avant / après montre le travail invisible.', 'Toujours avec l\'accord du client.', 'Une arme parfaite contre "c\'est cher".'],
  exo: { client: 'Joël, 27 ans, pense qu\'un bon téléphone suffit.', consigne: 'Explique la valeur de ta retouche en proposant de lui montrer un avant / après.', premier: 'Franchement avec un iPhone on peut faire les mêmes photos non ?' } },

{ id: 'l19', titre: 'La preuve sociale et les avis', theme: 'Confiance', tags: ['avis', 'preuve', 'confiance'],
  technique: `Les gens font confiance à ce que disent les autres clients, plus qu'à ce que tu dis toi-même.
Demande un avis à chaque client content, au bon moment : juste après la livraison, quand il est heureux. Facilite-lui la tâche : envoie le lien, ou demande juste un vocal ou une phrase.
Ensuite, utilise ces avis : sur ton statut, dans tes messages ("Regarde ce que Awa a dit"), sur ta page.`,
  exemple: [['h', 'Merci encore Awa ! Je suis content que les photos te plaisent. Ça m\'aiderait beaucoup si tu pouvais laisser un petit avis ici (1 minute) : [lien]. Ou juste une phrase en réponse, je la partage avec ton accord.'], ['c', 'Avec plaisir ! Vous êtes le meilleur, je vous recommande à toutes mes amies.']],
  retenir: ['Demande l\'avis juste après la livraison.', 'Rends ça facile : un lien ou une phrase.', 'Utilise les avis partout.'],
  exo: { client: 'Awa, 28 ans, vient de recevoir ses photos et dit merci.', consigne: 'Demande-lui un avis, de façon naturelle.', premier: 'Waouh merci beaucoup les photos sont trop belles !!' } },

{ id: 'l20', titre: 'Demander une recommandation', theme: 'Fidélité', tags: ['recommandation', 'fideliser', 'clients'],
  technique: `Ton meilleur commercial, c'est un client content. À Bouaké, le bouche-à-oreille va vite.
Demande clairement : "Tu connais quelqu'un qui a un anniversaire ou un événement bientôt ?" Donne une raison d'en parler : un code parrain, une petite réduction pour lui et pour son ami.
Remercie toujours celui qui t'a recommandé, même si la personne n'a pas réservé.`,
  exemple: [['h', 'Merci encore Koffi ! Si tu connais quelqu\'un qui fête un anniversaire ou un mariage bientôt, voici ton code KOFFI : ton ami a 10 % de moins, et toi tu as 5 000 F sur ta prochaine séance.']],
  retenir: ['Demande directement, au bon moment.', 'Donne un avantage aux deux.', 'Remercie toujours.'],
  exo: { client: 'Koffi, 33 ans, très content de sa séance couple.', consigne: 'Demande-lui une recommandation.', premier: 'Merci pour tout, ma femme a adoré les photos.' } },

{ id: 'l21', titre: 'Vendre avec les fêtes et les saisons', theme: 'Marketing', tags: ['saisons', 'marketing', 'urgence'],
  technique: `Chaque fête est une raison d'acheter : fête des mères, fête des pères, Saint-Valentin, Tabaski, Ramadan, Pâques, Noël, rentrée, fin d'année scolaire, remises de diplômes.
Prépare 3 semaines avant : une offre spéciale (décor, tirage cadeau), un statut, un message aux anciens clients.
Pense cadeau : "Offre une séance à ta maman" vend mieux que "séance photo à 20 000 F".`,
  exemple: [['h', 'Fête des mères dans 3 semaines !\nOffre "Mère et fille" : 2 tenues, 10 photos, 1 tirage A4 encadré pour maman, 30 000 F.\nSeulement 8 places. Écris-moi MAMAN pour réserver.']],
  retenir: ['Chaque fête = une raison d\'acheter.', 'Prépare 3 semaines avant.', 'Vends un cadeau, pas une séance.'],
  exo: { client: 'Rita, 35 ans, cliente de l\'an dernier.', consigne: 'Propose-lui une offre fête des mères (ou Noël) qui donne envie.', premier: 'Bonjour Henzo, ça fait longtemps ! Vous faites quoi de beau en ce moment ?' } },

{ id: 'l22', titre: 'Vendre un mariage ou une dot', theme: 'Mariage', tags: ['mariage', 'famille', 'acompte'],
  technique: `Un mariage ou une dot, c'est un gros budget, des émotions et beaucoup de monde qui décide. Le couple a besoin de confiance avant tout.
Propose un rendez-vous (au studio ou un appel) avant de parler prix. Montre un mariage complet que tu as fait, pas seulement les plus belles photos. Explique le déroulé de la journée.
Écris tout : heures de présence, nombre de photos, délai, acompte, reste à payer. Un contrat simple rassure la famille.`,
  exemple: [['c', 'On fait notre dot le 12 avril, vous êtes libre ?'], ['h', 'Félicitations à vous deux ! Je suis libre le 12 avril. Pour une dot, je vous propose qu\'on s\'appelle 10 minutes pour comprendre le déroulé (heures, lieu, nombre d\'invités). Ensuite je vous envoie 3 formules et un exemple de dot que j\'ai couverte. Demain 18 h, ça vous va ?']],
  retenir: ['La confiance avant le prix.', 'Un appel ou un rendez-vous.', 'Tout par écrit : heures, photos, délai, acompte.'],
  exo: { client: 'Laeticia, 29 ans, prépare sa dot et compare 3 photographes.', consigne: 'Gagne sa confiance et propose un rendez-vous.', premier: 'Bonsoir, je compare les photographes pour ma dot en avril. Vous êtes à combien ?' } },

{ id: 'l23', titre: 'Vendre la vidéo', theme: 'Offre', tags: ['video', 'monter', 'valeur'],
  technique: `Beaucoup de clients ne pensent pas à la vidéo. Pourtant une photo garde un instant, une vidéo garde les voix, les rires, la danse de la maman.
Propose la vidéo comme un souvenir en plus, pas comme une obligation : un petit film de 1 à 3 minutes, parfait pour le statut et TikTok.
Montre un exemple court. Les gens achètent la vidéo quand ils l'ont vue.`,
  exemple: [['c', 'Juste les photos ça va aller.'], ['h', 'Très bien ! Je te montre juste ce petit film de 1 minute d\'un anniversaire que j\'ai fait, pour que tu voies. Pour 15 000 F de plus, tu as le même pour ton événement, prêt pour ton statut.']],
  retenir: ['La vidéo garde les voix et les émotions.', 'Montre un exemple court.', 'Propose-la en plus, sans forcer.'],
  exo: { client: 'Marc, 36 ans, organise les 1 an de sa fille, veut juste des photos.', consigne: 'Donne-lui envie de la vidéo.', premier: 'Pour l\'anniversaire de ma fille je veux juste des photos, pas de vidéo.' } },

{ id: 'l24', titre: 'Vendre les tirages et l\'album', theme: 'Offre', tags: ['tirages', 'monter', 'valeur'],
  technique: `Les photos dans le téléphone se perdent : téléphone volé, mémoire pleine, on ne les regarde plus. Un tirage sur le mur, on le voit chaque jour.
Propose le tirage au moment où le client découvre ses photos : il est ému, il a envie de les garder. "Laquelle tu veux voir sur ton mur ?"
Pense aux cadeaux : un tirage encadré pour la maman, un album pour le mariage, des petites photos pour la famille au village.`,
  exemple: [['c', 'Les photos sont trop belles !'], ['h', 'Merci ! Laquelle tu veux voir chaque jour dans ton salon ? Je peux te l\'imprimer en A4 avec un joli cadre pour 7 000 F, prêt en 2 jours.']],
  retenir: ['Le téléphone perd, le mur garde.', 'Propose au moment de l\'émotion.', 'Pense cadeau pour la famille.'],
  exo: { client: 'Sylvie, 45 ans, vient de recevoir les photos de famille.', consigne: 'Vends-lui un tirage ou un album.', premier: 'Merci beaucoup, toute la famille a aimé les photos !' } },

{ id: 'l25', titre: 'Les prix psychologiques', theme: 'Prix', tags: ['prix_psy', 'prix'],
  technique: `La façon d'écrire un prix change la façon dont il est ressenti.
Les prix ronds (25 000 F) font "qualité". Les prix comme 24 900 F font "promo". Pour un studio qui veut paraître pro, préfère les prix ronds.
Écris le prix sans "F CFA" en gros, et parle de ce qui est inclus juste avant. Pour un gros montant, montre l'acompte : "Réserve avec 20 000 F". Et propose le paiement en 2 fois.`,
  exemple: [['h', 'Formule Prestige : 3 tenues, maquillage, 25 photos et un cadre. 45 000 F, et tu réserves avec 15 000 F seulement.']],
  retenir: ['Prix rond = qualité, prix en 900 = promo.', 'Ce qui est inclus avant le prix.', 'Montre l\'acompte pour les gros montants.'],
  exo: { client: 'Diane, 31 ans, trouve que 45 000 F fait beaucoup d\'un coup.', consigne: 'Présente le prix autrement pour qu\'il paraisse accessible.', premier: '45 000 d\'un coup c\'est beaucoup pour moi...' } },

{ id: 'l26', titre: 'Inspirer confiance dès le premier message', theme: 'Confiance', tags: ['confiance', 'whatsapp'],
  technique: `Un nouveau client ne te connaît pas. Il a peur de payer et d'être déçu, ou de ne jamais recevoir ses photos.
Rassure-le vite : réponds rapidement, donne ton adresse (Ahougnansou, en face du Restaurant Le Rosier), montre des photos récentes, dis ton délai de livraison et respecte-le.
Une photo de profil pro, un catalogue WhatsApp à jour et quelques avis font la moitié du travail.`,
  exemple: [['c', 'Vous êtes sérieux ? Mon amie a payé un photographe et elle n\'a jamais eu ses photos.'], ['h', 'Je comprends ta peur, c\'est triste ce qui est arrivé à ton amie. Mon studio est à Ahougnansou, en face du Restaurant Le Rosier, tu peux passer voir. Je livre en 3 jours par un lien de galerie privée, et voici 2 avis de clientes du mois dernier.']],
  retenir: ['Réponds vite.', 'Adresse, délai, avis : du concret.', 'Respecte toujours tes délais.'],
  exo: { client: 'Prisca, 26 ans, méfiante après une mauvaise expérience.', consigne: 'Rassure-la avec du concret.', premier: 'Bonjour, comment je peux être sûre que vous allez livrer les photos ? J\'ai déjà été arnaquée.' } },

{ id: 'l27', titre: 'Raconter une histoire (storytelling)', theme: 'Marketing', tags: ['storytelling', 'statut', 'marketing'],
  technique: `Les gens oublient les chiffres, mais ils se souviennent des histoires. "Séance grossesse 25 000 F" ne touche personne. "Elle avait peur de ne pas se trouver belle enceinte. Regarde son sourire" touche tout le monde.
Une bonne petite histoire : la situation du client, sa peur ou son rêve, ce que tu as fait, le résultat.
Utilise-la dans tes statuts, tes posts Facebook et même dans la discussion avec un client qui hésite.`,
  exemple: [['h', 'Post : "Mme Koné voulait offrir une photo à son papa pour ses 80 ans. Toute la famille est venue au studio, même les petits-enfants. Quand il a vu le tirage, il a pleuré. C\'est pour ça que je fais ce métier."']],
  retenir: ['Situation, émotion, ce que tu as fait, résultat.', 'Court et vrai.', 'Toujours avec l\'accord du client.'],
  exo: { client: 'Un client hésitant, Junior, demande pourquoi faire des photos de famille.', consigne: 'Réponds-lui avec une courte histoire vraie (inventée pour l\'exercice).', premier: 'Des photos de famille, c\'est vraiment utile ? On a déjà des photos au téléphone.' } },

{ id: 'l28', titre: 'Gérer les retards de paiement', theme: 'Paiement', tags: ['paiement', 'relance', 'dettes'],
  technique: `Un client qui doit de l'argent, ce n'est pas forcément un mauvais client. Souvent il a oublié, ou il a un problème de fin de mois.
Relance poliment mais clairement : le montant exact, pour quoi, et une question qui demande une date. "Tu peux le régler quand ?" Propose de payer en 2 fois si besoin.
Pour éviter les retards : acompte avant la séance, et livraison des photos en haute qualité après le paiement complet.`,
  exemple: [['h', 'Bonjour Jean, c\'est Henzo Studio. Petit rappel : il reste 10 000 F pour la séance du 12 octobre. Tu peux payer par Wave ou Orange Money. Tu peux le faire quand ?'], ['c', 'Ah pardon j\'avais oublié, fin du mois c\'est possible ?'], ['h', 'Pas de souci, je note le 30. Merci Jean !']],
  retenir: ['Montant exact + raison + question sur la date.', 'Poli et ferme.', 'Acompte avant, photos HD après paiement.'],
  exo: { client: 'Jean, 34 ans, doit 15 000 F depuis 3 semaines et esquive.', consigne: 'Relance-le et obtiens une date de paiement.', premier: 'Bonsoir Henzo, je sais pour l\'argent là, mais c\'est un peu dur en ce moment...' } },

{ id: 'l29', titre: 'Dire non à un mauvais client', theme: 'Posture', tags: ['mauvais_client', 'posture'],
  technique: `Certains clients coûtent plus qu'ils ne rapportent : ils veulent tout gratuit, changent tout le temps, ne paient pas, te manquent de respect.
Tu as le droit de dire non, poliment. "Je ne pense pas être le bon photographe pour ce projet" ferme la porte sans conflit.
Pose tes règles dès le début : acompte obligatoire, nombre de photos défini, délai clair. Le bon client les accepte, le mauvais client part tout seul.`,
  exemple: [['c', 'Tu fais les photos gratuitement, je vais te faire de la publicité, j\'ai beaucoup d\'abonnés.'], ['h', 'Merci de penser à moi. Je ne fais pas de séances gratuites, mais je peux te proposer la formule Solo à 12 000 F, et si tu publies avec mon nom, je t\'offre un tirage A4. Ça te va ?']],
  retenir: ['Tu as le droit de dire non.', 'Une phrase polie ferme la porte.', 'Des règles claires dès le début.'],
  exo: { client: 'Kader, 25 ans, influenceur local, veut des photos gratuites contre de la visibilité.', consigne: 'Dis non poliment ou propose une vraie offre.', premier: 'Grand frère, j\'ai 8 000 abonnés sur TikTok. Tu me fais le shooting cadeau et je te fais la pub ?' } },

{ id: 'l30', titre: 'Fidéliser : le client qui revient', theme: 'Fidélité', tags: ['fideliser', 'clients', 'relance'],
  technique: `Trouver un nouveau client coûte beaucoup plus d'effort que de faire revenir un ancien. Un client content revient pour chaque événement de sa vie : anniversaire, grossesse, bébé, mariage.
Garde le lien : un message pour son anniversaire, une offre "ancien client", des nouvelles de temps en temps (sans spam).
Note ce qu'il aime dans sa fiche client : la couleur préférée, le nom des enfants. Quand tu t'en souviens, il se sent spécial.`,
  exemple: [['h', 'Bonjour Linda ! Joyeux anniversaire au petit Ethan, déjà 2 ans ! Ça fait un an qu\'on a fait ses photos de 1 an. Si tu veux, je te garde un créneau pour les photos de ses 2 ans, avec 10 % pour les anciennes clientes.']],
  retenir: ['L\'ancien client vaut de l\'or.', 'Un message aux bons moments.', 'Souviens-toi des détails.'],
  exo: { client: 'Linda, 32 ans, a fait les photos des 1 an de son fils l\'an dernier.', consigne: 'Elle te répond après ton message d\'anniversaire. Fais-la revenir.', premier: 'Merci Henzo, tu t\'en souviens ! Oui il a grandi vite.' } },

{ id: 'l31', titre: '"Mon cousin a un appareil photo"', theme: 'Objections', tags: ['objections', 'valeur', 'trop_cher'],
  technique: `Le client compare avec un proche qui a un appareil ou un bon téléphone. Ne critique jamais le cousin : tu passerais pour jaloux.
Explique ce qui fait la différence : la lumière du studio, la direction des poses, la retouche, la livraison à temps, la sérénité le jour J (le cousin veut aussi profiter de la fête).
Laisse le choix avec le sourire. Souvent, le client revient après une expérience décevante.`,
  exemple: [['c', 'Mon cousin a un Canon, il peut faire les photos du mariage.'], ['h', 'C\'est bien d\'avoir quelqu\'un dans la famille ! Pour un mariage, la vraie différence c\'est que moi je ne fais que ça toute la journée : je ne rate pas l\'entrée des mariés ni le premier baiser, et ton cousin peut profiter de la fête. Si tu veux, je peux aussi couvrir seulement la cérémonie, et ton cousin la soirée.']],
  retenir: ['Ne critique jamais le proche.', 'Explique ta différence concrète.', 'Propose une solution qui l\'inclut.'],
  exo: { client: 'Hervé, 30 ans, pense que son cousin peut faire les photos de son anniversaire.', consigne: 'Réponds sans critiquer le cousin et montre ta valeur.', premier: 'Merci pour le devis mais je pense que mon cousin va faire les photos, il a un bon appareil.' } },

{ id: 'l32', titre: 'Quand le client compare avec un autre studio', theme: 'Objections', tags: ['comparaison', 'trop_cher', 'valeur'],
  technique: `"Le studio d'à côté fait moins cher." Ne baisse pas ton prix pour t'aligner : tu entres dans une course où tout le monde perd.
Demande ce que l'autre propose exactement (nombre de photos, retouche, délai, tirage). Souvent, ce n'est pas la même chose.
Puis rappelle ce qui te rend unique : ton style, ta lumière, ton délai, tes avis. Et laisse une porte ouverte : un pack plus simple chez toi.`,
  exemple: [['c', 'Le studio de Commerce fait 15 000 F.'], ['h', 'D\'accord, merci de me le dire. Chez eux, c\'est combien de photos retouchées et en combien de jours ? Chez moi, c\'est 15 photos retouchées une par une, livrées en 3 jours. Si ton budget est 15 000 F, je peux te faire la Solo : 8 photos, même qualité.']],
  retenir: ['Ne t\'aligne pas sur le prix.', 'Compare le contenu, pas juste le prix.', 'Propose ton pack plus simple.'],
  exo: { client: 'Ruth, 24 ans, a reçu un devis moins cher dans un autre studio.', consigne: 'Garde ta valeur sans dénigrer l\'autre studio.', premier: 'Un autre studio m\'a proposé 15 000 pour la même chose, vous pouvez faire pareil ?' } },

{ id: 'l33', titre: 'Annoncer une hausse de prix', theme: 'Prix', tags: ['prix', 'fideliser', 'posture'],
  technique: `Augmenter tes prix est normal : ton matériel, ton loyer et ton expérience augmentent. Ce qui fâche les clients, c'est la surprise.
Annonce-le à l'avance (2 à 4 semaines), avec une raison simple (nouveau décor, nouveau matériel, livraison plus rapide), et un cadeau pour les fidèles : "jusqu'au 30, l'ancien prix pour toi".
Ça crée aussi une urgence honnête : beaucoup réservent avant la date.`,
  exemple: [['h', 'Bonjour Eunice ! Petite info : à partir du 1er décembre, mes tarifs changent (nouveau fond et nouvelle lumière au studio). Pour mes clientes fidèles, l\'ancien prix reste valable pour toute réservation avant le 30 novembre.']],
  retenir: ['Prévenir, jamais surprendre.', 'Une raison simple.', 'Un avantage pour les fidèles avant la date.'],
  exo: { client: 'Eunice, 30 ans, cliente fidèle, réagit à l\'annonce de hausse.', consigne: 'Elle n\'est pas contente. Explique avec calme et garde-la.', premier: 'Ah bon vous augmentez ? Moi qui viens souvent, c\'est pas gentil ça...' } },

{ id: 'l34', titre: 'L\'après-séance : livrer et revendre', theme: 'Fidélité', tags: ['fideliser', 'tirages', 'avis', 'recommandation'],
  technique: `La vente ne s'arrête pas à la séance. La livraison est le moment où le client est le plus heureux : c'est là que tu demandes un avis, proposes un tirage et une recommandation.
Livre à l'heure, avec un joli message. Puis, dans la même semaine : le tirage ou l'album, l'avis, le code parrain.
Trois semaines plus tard, un petit message : "Tu as imprimé ta photo préférée ?" Ça garde le lien.`,
  exemple: [['h', 'Bonjour Carine ! Tes photos sont prêtes, voici ta galerie privée. J\'ai adoré la série en robe verte. Dis-moi ta préférée, je peux te l\'imprimer en A4. Et si tu as une minute, ton avis m\'aide beaucoup.']],
  retenir: ['La livraison = le moment le plus heureux.', 'Avis, tirage, recommandation.', 'Un petit message 3 semaines après.'],
  exo: { client: 'Carine, 27 ans, reçoit ses photos aujourd\'hui.', consigne: 'Elle est ravie. Profite du moment sans être lourd.', premier: 'Je viens de voir la galerie, je suis trop contente !!!' } }
];

// ------------------------------------------------------------
// 2. ÉTAT, OUTILS, DONNÉES
// ------------------------------------------------------------
const CO = { tab: 'aujourdhui', loaded: false, loading: null, plans: [], journal: [], negos: [], ecole: [], posts: null, devis: null,
  planOpen: null, nego: null, negoEl: null, lecon: null, ex: null, jf: 'tout', busy: '', draft: null };
const CO_TABS = [['aujourdhui', "Aujourd'hui"], ['plans', 'Mes plans'], ['charges', 'Charges fixes'], ['negocier', 'Négocier'], ['ecole', 'École de la vente'], ['journal', 'Journal']];
const CO_TAB_ALIAS = { aujourdhui: 'aujourdhui', today: 'aujourdhui', jour: 'aujourdhui', plans: 'plans', plan: 'plans', charges: 'charges', negocier: 'negocier', negociation: 'negocier', ecole: 'ecole', journal: 'journal', bilan: 'aujourdhui' };
const CO_DOM = { finances: { n: 'Finances', ic: 'wallet' }, marketing: { n: 'Marketing', ic: 'star' }, clients: { n: 'Clients', ic: 'users' }, ventes: { n: 'Ventes', ic: 'briefcase' }, organisation: { n: 'Organisation', ic: 'calendar' } };
const CO_SEV = { urgent: 0, warn: 1, info: 2, good: 3 };
const CO_JK = { resultat: 'Résultat', echec: 'Échec', apprentissage: 'Appris', astuce: 'Astuce' };

const coE = s => (typeof agEsc === 'function' ? agEsc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
const coN = n => new Intl.NumberFormat('fr-FR').format(Math.round(Number(n) || 0));
const coF = n => coN(n) + ' F';
const coI = (n, s) => (typeof agIcon === 'function' ? agIcon(n, s) : '');
const coClean = t => String(t == null ? '' : t).replace(/[\u2014\u2013]/g, '-');
const coR500 = n => Math.round((Number(n) || 0) / 500) * 500;
const coDayMs = 864e5;
function coToday(d){ const x = d ? new Date(d) : new Date(); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); }
function coAgo(d){ return d ? Math.floor((Date.now() - new Date(d).getTime()) / coDayMs) : null; }
function coDate(d, o){ if(!d) return ''; const x = new Date(String(d).length <= 10 ? d + 'T12:00:00' : d); return isNaN(x) ? '' : x.toLocaleDateString('fr-FR', o || { day: 'numeric', month: 'short' }); }
function coQuand(j){ j = Number(j); if(j < 0) return `en retard de ${-j} j`; if(j === 0) return "aujourd'hui"; if(j === 1) return 'demain'; return `dans ${j} jours`; }
function coToast(m, t){ if(typeof agToast === 'function') agToast(m, t); }
function coErr(e){ const m = coClean((e && e.message) || e || 'Erreur'); if(typeof agAlert === 'function') agAlert(m); else alert(m); }
function coClient(id){ return (typeof clients !== 'undefined' ? clients : []).find(c => c.id === Number(id)) || null; }
function coFirst(c){ if(typeof crmFirst === 'function' && c) return crmFirst(c); return String((c && c.name) || '').split(' ')[0]; }
function coHasAI(){ try { const c = JSON.parse(localStorage.getItem('aiConfig') || 'null'); return !!(c && c.key); } catch(e){ return false; } }
function coCopy(t){ if(typeof crmCopy === 'function') return crmCopy(t); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => coToast('Copié')).catch(() => prompt('Copie :', t)); }

async function coUid(){ const { data } = await sb.auth.getUser(); return data && data.user ? data.user.id : null; }
async function coIns(t, row){
  const uid = await coUid();
  const { data, error } = await sb.from(t).insert({ ...row, ...(uid ? { user_id: uid } : {}) }).select().single();
  if(error) throw error; return data;
}
async function coUpd(t, id, patch){
  if(t === 'coach_plans' || t === 'negociations') patch = { ...patch, updated_at: new Date().toISOString() };
  const { data, error } = await sb.from(t).update(patch).eq('id', id).select().single();
  if(error) throw error; return data || patch;
}
async function coDel(t, id){ const { error } = await sb.from(t).delete().eq('id', id); if(error) throw error; }

async function coLoad(force){
  if(CO.loaded && !force) return;
  if(CO.loading) return CO.loading;
  CO.loading = (async () => {
    const get = async (t, ord) => {
      try { const { data, error } = await sb.from(t).select('*').order(ord || 'created_at', { ascending: false }); if(error) throw error; return data || []; }
      catch(e){ console.warn('Coach ' + t + ' :', e.message || e); return null; }
    };
    const mkOk = typeof MK !== 'undefined' && MK.loaded, pxOk = typeof PX !== 'undefined' && PX.loaded;
    const [p, j, n, e, mp, dv] = await Promise.all([get('coach_plans'), get('coach_journal'), get('negociations'), get('ecole_progres'),
      mkOk ? null : get('mk_posts', 'date'), pxOk ? null : get('devis')]);
    CO.plans = p || []; CO.journal = j || []; CO.negos = n || []; CO.ecole = e || [];
    if(mp) CO.posts = mp; if(dv) CO.devis = dv;
    CO.loaded = true; CO.loading = null;
  })();
  return CO.loading;
}
const coPosts = () => ((typeof MK !== 'undefined' && MK.loaded) ? MK.posts : CO.posts) || [];
const coDevis = () => ((typeof PX !== 'undefined' && PX.loaded) ? PX.devis : CO.devis) || [];
const coSort = l => l.slice().sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')) || (b.id - a.id));

// ---------- IA ----------
const CO_SYS = `Tu es le coach business de Henzo, photographe et vidéaste à Bouaké (Côte d'Ivoire). Son studio : Henzo Studio, quartier Ahougnansou, en face du Restaurant Le Rosier. Spécialités : portrait studio, anniversaires d'enfants, mariages, dots, grossesse, famille, événements. Ses clients lui écrivent surtout sur WhatsApp. Monnaie : FCFA (écris "F").
Règles : français simple, phrases courtes, aucun jargon, jamais de tirets longs. Sois concret, honnête et bienveillant. Montants réalistes pour Bouaké. Ne présente pas une supposition comme un fait.`;
async function coAsk(prompt, o){
  o = o || {};
  if(typeof window.mkAI === 'function'){
    const r = await window.mkAI({ system: o.system || CO_SYS, messages: [{ role: 'user', text: prompt }], maxTokens: o.maxTokens || 2500 });
    return coClean(r && r.text);
  }
  if(typeof callAI === 'function') return coClean(await callAI((o.system || CO_SYS) + '\n\n' + prompt));
  throw new Error("L'IA n'est pas disponible.");
}
function coJson(t){
  const s = String(t || '');
  const m = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = m ? m[1] : s;
  const a = raw.indexOf('{'), b = raw.lastIndexOf('}');
  const a2 = raw.indexOf('['), b2 = raw.lastIndexOf(']');
  try { if(a >= 0 && b > a && (a2 < 0 || a < a2)) return JSON.parse(raw.slice(a, b + 1)); } catch(e){}
  try { if(a2 >= 0 && b2 > a2) return JSON.parse(raw.slice(a2, b2 + 1)); } catch(e){}
  return null;
}
function coMd(t){ return typeof crmMd === 'function' ? crmMd(coClean(t)) : coE(coClean(t)).replace(/\n/g, '<br>'); }
function coMemoire(n){
  const l = coSort(CO.journal).slice(0, n || 12);
  return l.length ? l.map(j => `- [${CO_JK[j.kind] || j.kind}] ${String(j.text || '').slice(0, 180)}`).join('\n') : '(rien encore)';
}
function coContexte(){
  const L = [`Aujourd'hui : ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.`];
  try { const s = computeStats(); L.push(`Ce mois : entrées ${coN(s.totalIn)} F, dépenses ${coN(s.totalOut)} F, solde ${coN(s.bal)} F. Mois dernier : entrées ${coN(s.prevIn)} F, dépenses ${coN(s.prevOut)} F.`); } catch(e){}
  try { if(typeof window.bgChargesContexte === 'function'){ const c = window.bgChargesContexte(); if(c) L.push('Charges fixes : ' + String(c).slice(0, 600)); } } catch(e){}
  try { if(typeof svDuTous === 'function'){ const d = svDuTous(); if(d.length) L.push(`On lui doit ${coN(d.reduce((a, x) => a + x.du.total, 0))} F (${d.slice(0, 5).map(x => x.c.name + ' ' + coN(x.du.total) + ' F').join(', ')}).`); } } catch(e){}
  try { const pb = coDetect().slice(0, 6); if(pb.length) L.push('Problèmes repérés : ' + pb.map(p => p.titre).join(' ; ') + '.'); } catch(e){}
  const act = CO.plans.filter(p => p.statut === 'en_cours');
  if(act.length) L.push('Plans en cours : ' + act.map(p => p.titre).join(' ; ') + '.');
  const st = coNegoStats(); if(st.n) L.push(`Négociations : ${st.n} terminées, ${st.taux} % acceptées.`);
  L.push(`Clients : ${(typeof clients !== 'undefined' ? clients : []).length}. Séances ce mois : ${(typeof shoots !== 'undefined' ? shoots : []).filter(s => s.date && String(s.date).slice(0, 7) === coToday().slice(0, 7)).length}.`);
  L.push('Ce que le coach a appris sur Henzo (journal) :\n' + coMemoire(10));
  return L.join('\n');
}

// ------------------------------------------------------------
// 3. DÉTECTION DES PROBLÈMES
// ------------------------------------------------------------
function coCharges(){
  try { if(typeof window.bgChargesResume === 'function'){ const r = window.bgChargesResume(); if(r && typeof r === 'object') return r; } } catch(e){ console.warn('bgChargesResume', e); }
  return null;
}
function coDuTous(){ try { return typeof svDuTous === 'function' ? svDuTous().sort((a, b) => b.du.total - a.du.total) : []; } catch(e){ return []; } }
function coLastDone(c){
  const now = Date.now();
  return (typeof shoots !== 'undefined' ? shoots : []).filter(s => Number(s.client_id) === c.id && s.date && !/annul/i.test(s.status || '') && new Date(s.date).getTime() <= now).map(s => s.date).sort().pop() || null;
}
function coInactifs(days){
  return (typeof clients !== 'undefined' ? clients : []).map(c => ({ c, last: coLastDone(c) })).filter(x => x.last && coAgo(x.last) > (days || 90))
    .filter(x => { try { return !(typeof svDu === 'function' && svDu(x.c.id).total > 0) && ((typeof svLastImpression === 'function' ? svLastImpression(x.c.id) : null) || {}).humeur !== 'negatif'; } catch(e){ return true; } })
    .sort((a, b) => String(b.last).localeCompare(String(a.last)));
}
function coRecentDone(days){
  const now = Date.now();
  return (typeof shoots !== 'undefined' ? shoots : []).filter(s => s.date && !/annul/i.test(s.status || '') && new Date(s.date).getTime() <= now && now - new Date(s.date).getTime() < days * coDayMs);
}
function coDetect(){
  const out = [], add = p => out.push(p);
  const safe = f => { try { f(); } catch(e){ console.warn('Coach détection :', e); } };
  // ----- Finances : charges fixes qui arrivent -----
  safe(() => {
    const r = coCharges(); if(!r) return;
    const list = (r.prochaines || []).filter(c => !c.paye && Number(c.reste != null ? c.reste : c.montant) > 0 && c.jours != null && Number(c.jours) <= 15).sort((a, b) => a.jours - b.jours);
    if(!list.length) return;
    const c = list[0], manque = Math.max(0, Number(r.manque) || 0), reste = Number(c.reste != null ? c.reste : c.montant) || 0;
    add({ id: 'charge_' + c.id + '_' + (r.mois || coToday().slice(0, 7)), domaine: 'finances', sev: manque > 0 ? 'urgent' : (c.jours <= 3 ? 'warn' : 'info'), tags: ['conclure', 'relance'],
      titre: `${c.nom} de ${coF(reste)} ${coQuand(c.jours)}`,
      detail: manque > 0 ? `Il manque ${coF(manque)} pour payer tes charges du mois.` : `Tu as déjà ${coF(r.deCote || 0)} de côté. Prévois le paiement.`,
      data: { charge: c, manque, reste, deCote: Number(r.deCote) || 0 } });
  });
  // ----- Finances : analyse de coach.js -----
  safe(() => {
    if(typeof coachAnalyzeFinances !== 'function') return;
    const map = { neg_balance: 'historique', low_savings: 'coffres', no_tx: 'historique' };
    coachAnalyzeFinances().forEach(s => add({ id: 'fin_' + s.id, domaine: 'finances', sev: s.severity, titre: coClean(s.title), detail: coClean(s.subtitle), tags: [],
      etapes: (s.steps || []).map(st => ({ t: coClean(st.title), detail: coClean(String(st.text || '').replace(/<[^>]+>/g, '')), go: map[s.id] || '' })) }));
  });
  safe(() => {
    if(typeof coachAnalyzeGoals !== 'function') return;
    coachAnalyzeGoals().filter(s => s.id === 'late_goals').forEach(s => add({ id: 'obj_retard', domaine: 'finances', sev: 'warn', titre: coClean(s.title), detail: coClean(s.subtitle), tags: [],
      etapes: [{ t: 'Revoir la date ou le montant de chaque objectif en retard', go: 'objectifs' }, { t: 'Choisir un montant à mettre de côté chaque semaine', detail: 'Même petit : 5 000 F par semaine, c\'est 20 000 F par mois.', go: 'coffres' }, { t: 'Mettre ce montant de côté à chaque paiement reçu', go: 'coffres' }] }));
  });
  // ----- Finances : dépenses en hausse -----
  safe(() => {
    const s = computeStats(); if(s.dayOfMonth < 8 || !s.prevOut) return;
    const proj = s.totalOutAutre / s.dayOfMonth * s.daysInMonth;
    if(proj > s.prevOut * 1.3 && s.totalOutAutre > 20000){
      const top = s.sortedCats.filter(([c]) => c !== 'Épargne')[0];
      add({ id: 'depenses_' + s.ym, domaine: 'finances', sev: 'warn', tags: [], titre: 'Tes dépenses montent ce mois', detail: `À ce rythme, tu vas dépenser environ ${coF(proj)}, contre ${coF(s.prevOut)} le mois dernier.${top ? ' Poste principal : ' + top[0] + '.' : ''}`,
        etapes: [{ t: 'Regarder tes dépenses du mois', detail: top ? `Commence par "${top[0]}" : ${coF(top[1])}.` : '', go: 'historique' }, { t: 'Choisir une dépense à couper ou à reporter', detail: 'Une seule, mais vraiment.' }, { t: 'Fixer une limite par semaine jusqu\'à la fin du mois', detail: `Par exemple ${coF(coR500(Math.max(5000, (s.prevOut - s.totalOutAutre) / Math.max(1, (s.daysInMonth - s.dayOfMonth) / 7))))} par semaine.` }, { t: 'Noter toutes les dépenses pendant 7 jours', go: 'historique' }] });
    }
  });
  // ----- Clients : dettes -----
  safe(() => {
    const d = coDuTous(); if(!d.length) return;
    const tot = d.reduce((a, x) => a + x.du.total, 0);
    add({ id: 'dettes', domaine: 'clients', sev: tot >= 20000 ? 'urgent' : 'warn', tags: ['paiement'], titre: `On te doit ${coF(tot)}`, detail: `${d.length} client${d.length > 1 ? 's' : ''} : ${d.slice(0, 3).map(x => x.c.name).join(', ')}${d.length > 3 ? '...' : ''}.`,
      etapes: [...d.slice(0, 4).map(x => ({ t: `Envoyer la relance à ${x.c.name} (${coF(x.du.total)})`, detail: 'Message poli, montant exact, et demande une date de paiement.', go: 'relance:' + x.c.id })),
        { t: 'Noter les paiements reçus dans la fiche client', go: 'dettes' }] });
  });
  // ----- Clients : inactifs -----
  safe(() => {
    const l = coInactifs(90); if(l.length < 2) return;
    const top = l.slice(0, 3);
    add({ id: 'inactifs', domaine: 'clients', sev: 'info', tags: ['fideliser'], titre: `${l.length} anciens clients ne sont pas revenus`, detail: `Plus de 3 mois sans séance : ${top.map(x => x.c.name).join(', ')}.`,
      etapes: [{ t: `Écrire à ${top.map(x => coFirst(x.c)).join(', ')}`, detail: 'Un message personnel, avec une nouveauté ou une offre ancien client.', go: 'compose:' + top.map(x => x.c.id).join(',') },
        { t: 'Créer un bon "ancien client" (10 %, valable 15 jours)', go: 'promo' }, { t: 'Publier une séance récente en statut WhatsApp', go: 'marketing:jour' }] });
  });
  // ----- Clients : avis -----
  safe(() => {
    const done = coRecentDone(45); if(done.length < 2) return;
    const av = (typeof galAvis !== 'undefined' && Array.isArray(galAvis)) ? galAvis : ((typeof MK !== 'undefined' && MK.avis) || []);
    if(av.some(a => coAgo(a.created_at) != null && coAgo(a.created_at) <= 60)) return;
    const ids = [...new Set(done.map(s => Number(s.client_id)).filter(Boolean))].slice(0, 3);
    if(!ids.length) return;
    add({ id: 'avis', domaine: 'clients', sev: 'info', tags: ['avis'], titre: 'Pas de nouvel avis depuis 2 mois', detail: `${done.length} séances ces 45 derniers jours, mais aucun avis client. Les avis font venir les nouveaux clients.`,
      etapes: [{ t: 'Demander un avis à tes derniers clients', detail: 'Juste après la livraison, avec le lien de ta galerie.', go: 'compose_merci:' + ids.join(',') }, { t: 'Lire la leçon sur les avis', go: 'ecole:l19' }, { t: 'Partager le meilleur avis en statut', go: 'marketing:jour' }] });
  });
  // ----- Marketing : publications -----
  safe(() => {
    const posts = coPosts(); const pub = posts.filter(p => p.status === 'publie');
    const last = pub.map(p => String(p.published_at || p.date || '')).filter(Boolean).sort().pop();
    const j = last ? coAgo(last) : null;
    if(!posts.length && !(typeof MK !== 'undefined' && MK.loaded) && CO.posts === null) return;
    if(j == null || j >= 5){
      add({ id: 'pub_absente', domaine: 'marketing', sev: j == null || j >= 10 ? 'warn' : 'info', tags: ['statut'], titre: j == null ? 'Aucune publication notée' : `Pas de publication depuis ${j} jours`, detail: 'Sans publication, les nouveaux clients ne te voient pas. 3 publications par semaine suffisent pour commencer.',
        etapes: [{ t: 'Choisir une séance récente à montrer', go: 'seances' }, { t: 'Écrire le post avec l\'agent marketing', go: 'marketing:chat' }, { t: 'Publier un statut WhatsApp 3 jours de suite', detail: 'Midi ou le soir après 19 h.', go: 'marketing:jour' }, { t: 'Noter les résultats (vues, messages)', go: 'marketing:res' }] });
    }
    const withV = pub.filter(p => p.stats && !p.stats.ignore && Number(p.stats.vues) > 0).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    if(withV.length >= 6){
      const avg = l => l.reduce((a, p) => a + Number(p.stats.vues), 0) / l.length;
      const r = avg(withV.slice(0, 3)), o = avg(withV.slice(3, 12));
      if(r < o * 0.5) add({ id: 'pub_faible', domaine: 'marketing', sev: 'info', tags: ['statut', 'storytelling'], titre: 'Tes dernières publications marchent moins bien', detail: `${coN(r)} vues en moyenne, contre ${coN(o)} avant.`,
        etapes: [{ t: 'Demander à l\'agent marketing pourquoi', go: 'marketing:chat' }, { t: 'Essayer une photo avant / après', go: 'ecole:l18' }, { t: 'Publier le soir entre 19 h et 21 h' }, { t: 'Raconter l\'histoire d\'un client', go: 'ecole:l27' }] });
    }
  });
  // ----- Ventes : négociations refusées -----
  safe(() => {
    const ref = CO.negos.filter(n => n.resultat === 'refuse' && coAgo(n.updated_at || n.created_at) <= 45);
    if(ref.length < 2) return;
    const cher = ref.filter(n => /cher|prix|budget/i.test(n.raison || '')).length;
    add({ id: 'refus', domaine: 'ventes', sev: 'warn', tags: ['trop_cher', 'retirer'], titre: `${ref.length} négociations refusées ce mois-ci`, detail: cher ? `${cher} pour une question de prix. On travaille la réponse à "c'est trop cher".` : 'On regarde ensemble ce qui bloque.',
      etapes: [{ t: 'Faire la leçon "Répondre à c\'est trop cher"', go: 'ecole:l06' }, { t: 'Vérifier que chaque collection a un petit pack', go: 'tarifs' }, { t: 'T\'entraîner sur une négociation avec le simulateur', go: 'negocier' }, { t: 'Proposer "retirer plutôt que réduire" à la prochaine demande', go: 'ecole:l08' }] });
  });
  // ----- Ventes : devis sans réponse -----
  safe(() => {
    const dv = coDevis().filter(d => d.status === 'envoye' && coAgo(d.created_at) >= 3 && coAgo(d.created_at) <= 30);
    if(!dv.length) return;
    const tot = dv.reduce((a, d) => a + (Number(d.total) || 0), 0);
    add({ id: 'devis_attente', domaine: 'ventes', sev: 'warn', tags: ['relance', 'on_va_voir'], titre: `${dv.length} devis sans réponse`, detail: `${coF(tot)} en attente. Une relance polie récupère souvent la vente.`,
      etapes: [...dv.slice(0, 4).map(d => ({ t: `Relancer ${d.client_name || 'le client'} (devis de ${coF(d.total)})`, detail: 'Apporte du nouveau : une photo récente ou une date libre.', go: d.client_id ? 'compose:' + d.client_id : 'devis' })),
        { t: 'Noter la réponse de chaque devis (accepté ou refusé)', go: 'devis' }] });
  });
  // ----- Organisation : checklists -----
  safe(() => {
    const now = Date.now();
    const l = (typeof shoots !== 'undefined' ? shoots : []).filter(s => s.date && !/annul/i.test(s.status || '') && new Date(s.date).getTime() > now && new Date(s.date).getTime() - now < 2 * coDayMs)
      .filter(s => { const it = s.checklist && Array.isArray(s.checklist.items) ? s.checklist.items : null; return !it || it.some(x => !x.done); });
    if(!l.length) return;
    add({ id: 'checklist_' + l.map(s => s.id).join('_'), domaine: 'organisation', sev: 'warn', tags: [], titre: `${l.length} séance${l.length > 1 ? 's' : ''} dans moins de 2 jours`, detail: 'La checklist n\'est pas finie : batteries, cartes, décor, tenue.',
      etapes: [{ t: 'Ouvrir la checklist de la séance', go: 'seances' }, { t: 'Charger batteries et vider les cartes' }, { t: 'Confirmer l\'heure avec le client sur WhatsApp', go: l[0].client_id ? 'client:' + l[0].client_id : '' }] });
  });
  // ----- Organisation : notes en retard -----
  safe(() => {
    const l = (typeof notes !== 'undefined' ? notes : []).filter(n => !n.archived && n.reminder_date && coAgo(n.reminder_date) >= 1);
    const u = (typeof notes !== 'undefined' ? notes : []).filter(n => !n.archived && (n.priority === 'urgente' || n.priority === 'haute'));
    if(l.length + u.length < 1) return;
    add({ id: 'notes', domaine: 'organisation', sev: 'info', tags: [], titre: `${l.length + u.length} note${l.length + u.length > 1 ? 's' : ''} en retard ou urgente${l.length + u.length > 1 ? 's' : ''}`, detail: [...l, ...u].slice(0, 3).map(n => n.title || String(n.content || '').slice(0, 40)).join(' ; '),
      etapes: [{ t: 'Ouvrir tes notes', go: 'notes' }, { t: 'Faire la plus urgente aujourd\'hui' }, { t: 'Archiver ce qui n\'est plus utile', go: 'notes' }] });
  });
  // ----- Clients sans fiche, séances bientôt (coach.js) -----
  safe(() => {
    if(typeof coachAnalyzeClients !== 'function') return;
    coachAnalyzeClients().filter(s => s.id === 'no_clients').forEach(s => add({ id: 'no_clients', domaine: 'clients', sev: 'info', titre: coClean(s.title), detail: coClean(s.subtitle), tags: [], etapes: [{ t: 'Ajouter tes 3 derniers clients', go: 'clients' }] }));
  });
  const seen = new Set();
  return out.filter(p => !seen.has(p.id) && seen.add(p.id)).sort((a, b) => (CO_SEV[a.sev] ?? 9) - (CO_SEV[b.sev] ?? 9));
}

// Plan concret pour un problème
function coPlanFor(p){
  if(p.id.startsWith('charge_')){
    const c = p.data.charge, manque = p.data.manque || 0, steps = [];
    const d = coDuTous(), dtot = d.reduce((a, x) => a + x.du.total, 0);
    if(d.length) steps.push({ t: `Relancer ${d.slice(0, 2).map(x => x.c.name).join(' et ')} (${coF(d.slice(0, 2).reduce((a, x) => a + x.du.total, 0))})`, detail: `On te doit ${coF(dtot)} au total. Commence par les plus gros montants.`, go: d.length === 1 ? 'relance:' + d[0].c.id : 'dettes' });
    if(manque > 0){
      steps.push({ t: 'Publier une promo du week-end', detail: 'Ex : séance Solo à prix spécial vendredi et samedi. L\'agent marketing écrit le post avec toi.', go: 'marketing:chat' });
      const ina = coInactifs(60).slice(0, 3);
      if(ina.length) steps.push({ t: `Proposer une séance à ${ina.length} ancien${ina.length > 1 ? 's' : ''} client${ina.length > 1 ? 's' : ''}`, detail: ina.map(x => x.c.name).join(', '), go: 'compose:' + ina.map(x => x.c.id).join(',') });
      const part = Math.min(manque, Math.max(5000, coR500(manque / 3)));
      steps.push({ t: `Mettre ${coF(part)} de côté à chaque paiement`, detail: `Jusqu'à avoir les ${coF(manque)} qui manquent.`, go: 'coffres' });
    } else steps.push({ t: 'Ranger l\'argent de la charge dans un coffre', detail: 'Pour ne pas le dépenser par erreur.', go: 'coffres' });
    steps.push({ t: `Payer ${c.nom} (${coF(p.data.reste)})${c.echeance ? ' avant le ' + coDate(c.echeance, { day: 'numeric', month: 'long' }) : ''}`, go: 'charges' });
    return { titre: manque > 0 ? `Trouver ${coF(manque)} pour ${c.nom}` : `Payer ${c.nom} à temps`, domaine: 'finances', objectif: p.titre + '. ' + p.detail, etapes: steps.slice(0, 6), echeance: c.echeance || null };
  }
  return { titre: p.titre, domaine: p.domaine, objectif: p.detail || p.titre, etapes: (p.etapes || []).slice(0, 6), echeance: null };
}

// Propositions : problèmes sans plan en cours et pas refusés
function coRefus(){ try { const o = JSON.parse(localStorage.getItem('co_refus') || '{}'); const now = Date.now(); Object.keys(o).forEach(k => { if(o[k] < now) delete o[k]; }); return o; } catch(e){ return {}; } }
function coProposals(){
  const ref = coRefus();
  return coDetect().filter(p => !ref[p.id] && !CO.plans.some(pl => pl.source === 'auto:' + p.id && (pl.statut === 'en_cours' || coAgo(pl.updated_at || pl.created_at) < 14)))
    .filter(p => (coPlanFor(p).etapes || []).length);
}

// ------------------------------------------------------------
// 4. NAVIGATION (liens des étapes)
// ------------------------------------------------------------
function coCloseSheets(){ document.querySelectorAll('.ag-sheet').forEach(e => e.remove()); }
function coGo(go){
  const s = String(go || ''), i = s.indexOf(':'), k = i < 0 ? s : s.slice(0, i), arg = i < 0 ? '' : s.slice(i + 1);
  const tab = t => { coCloseSheets(); if(typeof agGoTab === 'function') agGoTab(t); else showTab(t); };
  const ids = () => arg.split(',').map(Number).filter(Boolean);
  try {
    switch(k){
      case 'relance': {
        const id = Number(arg), d = (typeof SV !== 'undefined' ? SV.rows : []).find(r => Number(r.client_id) === id && typeof svDetteOuverte === 'function' && svDetteOuverte(r));
        if(d && typeof svRelancer === 'function') return svRelancer(d.id);
        const c = coClient(id); if(!c || typeof crmWa !== 'function') return;
        const du = typeof svDu === 'function' ? svDu(id) : { total: 0 };
        return crmWa(id, `Bonjour {prenom}, c'est Henzo Studio.\nPetit rappel : il reste ${coF(du.total)} à régler${du.seances && du.seances[0] ? ' pour la ' + du.seances[0].label.toLowerCase() : ''}.\nVous pouvez payer par Wave ou Orange Money, ou au studio.\nMerci de me dire quand vous pourrez le faire.\nHenzo Studio`, 'dette');
      }
      case 'dettes': if(typeof CRM !== 'undefined'){ CRM.seg = 'dettes'; CRM.view = 'clients'; } tab('clients'); if(typeof crmRender === 'function') crmRender(); return;
      case 'client': tab('clients'); setTimeout(() => typeof crmOpenClient === 'function' && crmOpenClient(Number(arg)), 250); return;
      case 'clients': tab('clients'); return;
      case 'compose': tab('clients'); setTimeout(() => typeof crmCompose === 'function' && crmCompose(ids(), { goal: 'relance' }), 250); return;
      case 'compose_merci': tab('clients'); setTimeout(() => typeof crmCompose === 'function' && crmCompose(ids(), { goal: 'merci' }), 250); return;
      case 'promo': tab('clients'); setTimeout(() => typeof crmPromoForm === 'function' && crmPromoForm(null), 250); return;
      case 'marketing': tab('marketing'); if(arg) setTimeout(() => typeof mkGo === 'function' && mkGo(arg), 300); return;
      case 'tarifs': if(typeof PX !== 'undefined'){ PX.view = arg || 'grille'; PX.col = null; } tab('tarifs'); return;
      case 'devis': if(typeof PX !== 'undefined'){ PX.view = 'devis'; PX.col = null; } tab('tarifs'); return;
      case 'coffres': case 'historique': case 'objectifs': case 'notes': tab(k); return;
      case 'seances': tab('photo'); return;
      case 'seance': if(typeof openShootModal === 'function') openShootModal(); return;
      case 'charges': case 'negocier': case 'journal': case 'plans': case 'aujourdhui': coOpen(k); return;
      case 'ecole': coOpen('ecole', arg); return;
    }
  } catch(e){ console.warn('coGo', e); }
}
const CO_GO_LBL = { relance: 'Envoyer la relance', dettes: 'Voir les dettes', client: 'Ouvrir la fiche', clients: 'Mes clients', compose: 'Écrire le message', compose_merci: 'Demander les avis', promo: 'Créer le bon', marketing: 'Ouvrir le marketing', tarifs: 'Mes tarifs', devis: 'Mes devis',
  coffres: 'Mes coffres', historique: 'Historique', objectifs: 'Mes objectifs', notes: 'Mes notes', seances: 'Mes séances', seance: 'Nouvelle séance', charges: 'Charges fixes', negocier: 'Négocier', journal: 'Journal', ecole: 'Ouvrir la leçon', plans: 'Mes plans' };
function coGoLabel(go){ return CO_GO_LBL[String(go || '').split(':')[0]] || 'Ouvrir'; }

// ------------------------------------------------------------
// 5. RENDU GÉNÉRAL
// ------------------------------------------------------------
function coOpen(tab, arg){
  CO.tab = CO_TAB_ALIAS[tab] || 'aujourdhui';
  if(CO.tab === 'ecole') CO.lecon = arg || null;
  if(CO.tab === 'plans') CO.planOpen = arg ? Number(arg) : null;
  coCloseSheets();
  const page = document.getElementById('page-ia');
  if(page && !page.classList.contains('active')){ if(typeof agGoTab === 'function') agGoTab('ia'); else showTab('ia'); }
  else coRender();
  if(tab === 'bilan') setTimeout(coBilan, 300);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function coSetup(){
  const page = document.getElementById('page-ia'); if(!page) return null;
  const host = page.querySelector('.container') || page;
  let body = document.getElementById('coBody');
  if(!body){
    body = document.createElement('div'); body.id = 'coBody';
    const cards = [...host.querySelectorAll(':scope > .card')];
    const det = document.createElement('details'); det.className = 'co-legacy'; det.id = 'coLegacy';
    det.innerHTML = `<summary>${coI('settings', 16)} Connexion IA et analyse financière</summary>`;
    cards.forEach(c => det.appendChild(c));
    host.insertBefore(body, host.firstChild);
    host.appendChild(det);
  }
  return body;
}
function coShowAIConfig(){
  const d = document.getElementById('coLegacy'); if(d) d.open = true;
  const b = document.getElementById('aiConfigBody'); if(b && b.style.display === 'none' && typeof toggleAiConfig === 'function') toggleAiConfig();
  setTimeout(() => d && d.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
}
async function coRender(){
  const body = coSetup(); if(!body) return;
  if(!CO.loaded){ body.innerHTML = '<div class="ag-empty">Le coach prépare ta journée...</div>'; await coLoad(); }
  const tabs = `<div class="co-tabs" role="tablist">${CO_TABS.map(([k, l]) => { const n = coBadge(k); return `<button class="${CO.tab === k ? 'on' : ''}" onclick="coOpen('${k}')">${l}${n ? `<i>${n}</i>` : ''}</button>`; }).join('')}</div>`;
  body.innerHTML = tabs + '<div id="coView"></div>';
  const v = document.getElementById('coView');
  try {
    if(CO.tab === 'plans') coRenderPlans(v);
    else if(CO.tab === 'charges') coRenderCharges(v);
    else if(CO.tab === 'negocier') coRenderNego(v);
    else if(CO.tab === 'ecole') coRenderEcole(v);
    else if(CO.tab === 'journal') coRenderJournal(v);
    else coRenderToday(v);
  } catch(e){ console.error(e); v.innerHTML = `<div class="ag-empty">Oups, cet écran n'a pas pu s'afficher.<br>${coE(e.message)}</div>`; }
  const t = document.querySelector('#coBody .co-tabs button.on'); if(t && t.scrollIntoView) t.scrollIntoView({ block: 'nearest', inline: 'center' });
}
function coBadge(k){
  if(k === 'plans') return coProposals().length || '';
  if(k === 'aujourdhui') return coResultsAsked().length || '';
  return '';
}
function coAIHint(){ return coHasAI() ? '' : `<div class="crm-fete" onclick="coShowAIConfig()"><div class="ic">${coI('sparkles')}</div><div class="d"><b>Connecte l'IA</b><span>Pour les plans sur mesure, les exercices notés et la négociation. Touche ici.</span></div>${coI('chev', 16)}</div>`; }

// ------------------------------------------------------------
// 6. AUJOURD'HUI
// ------------------------------------------------------------
function coResultsAsked(){
  const out = [], now = Date.now();
  CO.plans.filter(p => p.statut === 'en_cours').forEach(p => (p.etapes || []).forEach((e, i) => {
    if(e.statut === 'fait' && e.date && !e.res && now - new Date(e.date).getTime() >= 2 * coDayMs && !(e.snooze && new Date(e.snooze).getTime() > now) && e.go && !/^(ecole|notes|seances|historique|charges|tarifs|objectifs|coffres|negocier)/.test(e.go))
      out.push({ k: 'etape', p, i, e });
  }));
  CO.negos.filter(n => n.resultat === 'en_cours' && coAgo(n.updated_at || n.created_at) >= 2 && !(localStorage.getItem('co_snz_n' + n.id) > coToday())).forEach(n => out.push({ k: 'nego', n }));
  return out;
}
function coStreak(){
  const days = new Set(CO.ecole.filter(e => e.fait).map(e => String(e.date || e.created_at || '').slice(0, 10)));
  let d = new Date(), n = 0;
  if(!days.has(coToday(d))) d = new Date(Date.now() - coDayMs);
  while(days.has(coToday(d))){ n++; d = new Date(d.getTime() - coDayMs); }
  return n;
}
function coRenderToday(v){
  const pb = coDetect(), top = pb[0], ask = coResultsAsked(), lec = coLeconDuJour(), lFait = coLeconFaite(lec.id, coToday());
  const todo = [];
  CO.plans.filter(p => p.statut === 'en_cours').forEach(p => { const i = (p.etapes || []).findIndex(e => e.statut === 'a_faire'); if(i >= 0) todo.push({ p, i, e: p.etapes[i] }); });
  const r = coCharges(), streak = coStreak();
  const hello = new Date().getHours() < 12 ? 'Bonjour Henzo' : new Date().getHours() < 18 ? 'Bon après-midi Henzo' : 'Bonsoir Henzo';
  const topPlan = top && CO.plans.find(pl => pl.source === 'auto:' + top.id && pl.statut === 'en_cours');
  v.innerHTML = `
    <div class="co-hero">
      <div class="lbl">${coE(new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))}</div>
      <div class="ttl">${hello}</div>
      <div class="split"><div>Étapes à faire<b>${todo.length}</b></div><div>Série école<b>${streak} jour${streak > 1 ? 's' : ''}</b></div><div>À regarder<b>${pb.length}</b></div></div>
    </div>
    ${coAIHint()}
    <div class="co-sech"><h3>Le conseil du jour</h3></div>
    ${top ? `<div class="co-card co-sev-${top.sev}">
      <div class="co-chip">${coI(CO_DOM[top.domaine].ic, 13)} ${CO_DOM[top.domaine].n}</div>
      <h4>${coE(top.titre)}</h4><p>${coE(top.detail)}</p>
      <div class="co-btns">${topPlan ? `<button class="main" onclick="coOpen('plans',${topPlan.id})">Continuer le plan</button>` : `<button class="main" onclick="coPropose('${coE(top.id)}')">Voir le plan proposé</button>`}
        ${pb.length > 1 ? `<button onclick="coOpen('plans')">Tout voir (${pb.length})</button>` : ''}</div>
    </div>` : `<div class="co-card co-sev-good"><h4>Tout va bien aujourd'hui</h4><p>Rien d'urgent. Profite pour faire ta leçon, ou préparer une publication.</p></div>`}

    <div class="co-sech"><h3>Ta leçon du jour</h3><span>${CO_LECONS.filter(l => coLeconFaite(l.id)).length}/${CO_LECONS.length}</span></div>
    <div class="co-card co-lesson-card" onclick="coOpen('ecole','${lec.id}')">
      <div class="co-chip">${coI('flame', 13)} ${coE(lec.theme)} · 5 min</div>
      <h4>${coE(lec.titre)}</h4>
      <p>${lFait ? `Faite aujourd'hui${lFait.score != null ? ' · note ' + lFait.score + '/10' : ''}. Bravo !` : coE(lec.pourquoi || 'Une technique, un exemple, un petit exercice.')}</p>
      <div class="co-btns"><button class="main">${lFait ? 'Revoir' : 'Commencer'}</button></div>
    </div>

    ${todo.length ? `<div class="co-sech"><h3>À faire dans tes plans</h3><span>${todo.length}</span></div>
    <div class="ag-list">${todo.slice(0, 6).map(x => `<div class="co-todo">
      <div class="d" onclick="coOpen('plans',${x.p.id})"><b>${coE(x.e.t)}</b><span>${coE(x.p.titre)} · étape ${x.i + 1}/${x.p.etapes.length}</span></div>
      <div class="co-mini">${x.e.go ? `<button onclick="coGo('${coE(x.e.go)}')" title="${coE(coGoLabel(x.e.go))}">${coI('chev', 15)}</button>` : ''}<button class="ok" onclick="coStepDone(${x.p.id},${x.i})" title="Fait">${coI('check', 15)}</button><button class="ko" onclick="coStepFail(${x.p.id},${x.i})" title="Pas réussi">×</button></div>
    </div>`).join('')}</div>` : ''}

    ${ask.length ? `<div class="co-sech"><h3>Résultats demandés</h3><span>${ask.length}</span></div>
    <div class="ag-list">${ask.slice(0, 6).map(a => a.k === 'nego' ? `<div class="co-todo"><div class="d" onclick="coNegoOpen(${a.n.id})"><b>${coE(a.n.client_nom || 'Client')} a répondu ?</b><span>Négociation : ${coE(String(a.n.travail || '').slice(0, 50))}</span></div><div class="co-mini"><button class="ok" onclick="coNegoOpen(${a.n.id},'resultat')">Répondre</button></div></div>`
      : `<div class="co-todo"><div class="d"><b>Qu'est-ce que ça a donné ?</b><span>${coE(a.e.t)}</span></div><div class="co-mini"><button class="ok" onclick="coAskResult(${a.p.id},${a.i})">Répondre</button></div></div>`).join('')}</div>` : ''}

    <div class="co-sech"><h3>Charges qui arrivent</h3><button onclick="coOpen('charges')">Gérer</button></div>
    ${coChargesMini(r)}

    <div class="co-btns col" style="margin-top:6px">
      <button onclick="coBilan()">${coI('history', 16)} Bilan de la semaine</button>
      <button onclick="typeof otNotifs==='function'&&otNotifs('coach')">${coI('settings', 16)} Notifications du coach</button>
    </div>`;
}
function coChargesMini(r){
  if(!r) return `<div class="co-card co-soon"><p>${coI('calendar', 15)} Le suivi des charges fixes arrive bientôt.</p></div>`;
  const l = (r.prochaines || []).filter(c => !c.paye).sort((a, b) => a.jours - b.jours).slice(0, 4);
  return `<div class="ag-list">
    <div class="co-chsum"><div><span>Ce mois</span><b>${coF(r.total)}</b></div><div><span>Déjà payé</span><b>${coF(r.paye)}</b></div><div><span>De côté</span><b>${coF(r.deCote)}</b></div><div class="${Number(r.manque) > 0 ? 'bad' : 'good'}"><span>${Number(r.manque) > 0 ? 'Il manque' : 'Couvert'}</span><b>${Number(r.manque) > 0 ? coF(r.manque) : 'Oui'}</b></div></div>
    ${l.length ? l.map(c => `<div class="crm-line"><div><b>${coE(c.nom)}</b><span>${coQuand(c.jours)}${c.echeance ? ' · ' + coDate(c.echeance) : ''}</span></div><b class="${c.jours <= 3 ? 'co-red' : ''}">${coF(c.reste != null ? c.reste : c.montant)}</b></div>`).join('') : '<div class="ag-empty">Toutes les charges du mois sont payées.</div>'}
  </div>`;
}

// ------------------------------------------------------------
// 7. MES PLANS D'ACTION
// ------------------------------------------------------------
function coPlanProgress(p){ const e = p.etapes || []; return e.length ? Math.round(e.filter(x => x.statut !== 'a_faire').length / e.length * 100) : 0; }
function coRenderPlans(v){
  if(CO.planOpen){ const p = CO.plans.find(x => x.id === CO.planOpen); if(p) return coRenderPlan(v, p); CO.planOpen = null; }
  const props = coProposals(), act = CO.plans.filter(p => p.statut === 'en_cours'), fin = CO.plans.filter(p => p.statut !== 'en_cours');
  v.innerHTML = `
    <button class="btn-primary co-help" onclick="coHelpForm()">${coI('sparkles', 17)} Aide-moi à...</button>
    <div class="co-sech"><h3>Le coach a repéré</h3>${props.length ? `<span>${props.length}</span>` : ''}</div>
    ${props.length ? props.map(p => `<div class="co-card co-sev-${p.sev}">
      <div class="co-chip">${coI(CO_DOM[p.domaine].ic, 13)} ${CO_DOM[p.domaine].n}</div>
      <h4>${coE(p.titre)}</h4><p>${coE(p.detail)}</p>
      <div class="co-btns"><button class="main" onclick="coPropose('${coE(p.id)}')">Voir le plan proposé</button><button onclick="coRefuse('${coE(p.id)}')">Pas maintenant</button></div>
    </div>`).join('') : '<div class="co-card"><p>Rien de nouveau à te proposer. Tu peux créer ton propre plan avec "Aide-moi à...".</p></div>'}
    <div class="co-sech"><h3>Plans en cours</h3>${act.length ? `<span>${act.length}</span>` : ''}</div>
    ${act.length ? `<div class="ag-list">${act.map(coPlanRow).join('')}</div>` : '<div class="ag-empty">Aucun plan en cours.</div>'}
    ${fin.length ? `<details class="co-det"><summary>Plans terminés (${fin.length})</summary><div class="ag-list">${coSort(fin).map(coPlanRow).join('')}</div></details>` : ''}`;
}
function coPlanRow(p){
  const pr = coPlanProgress(p), dom = CO_DOM[p.domaine] || CO_DOM.organisation;
  return `<div class="co-prow" onclick="coOpen('plans',${p.id})">
    <div class="ic">${coI(dom.ic, 18)}</div>
    <div class="d"><b>${coE(p.titre)}</b><span>${p.statut === 'en_cours' ? `${(p.etapes || []).filter(e => e.statut !== 'a_faire').length}/${(p.etapes || []).length} étapes` : p.statut === 'reussi' ? 'Réussi' : 'Arrêté'}${p.echeance ? ' · pour le ' + coDate(p.echeance) : ''}</span>
      ${p.statut === 'en_cours' ? `<div class="co-bar"><i style="width:${pr}%"></i></div>` : (p.resultat ? `<span>${coE(String(p.resultat).slice(0, 80))}</span>` : '')}</div>
    ${coI('chev', 16)}</div>`;
}
function coPropose(id){
  const p = coDetect().find(x => x.id === id); if(!p){ coToast('Ce point est déjà réglé'); return coRender(); }
  const pl = coPlanFor(p);
  CO.draft = { ...pl, source: 'auto:' + p.id };
  agSheet('coProp', `
    <div class="co-chip">${coI(CO_DOM[pl.domaine].ic, 13)} ${CO_DOM[pl.domaine].n}</div>
    <h3 style="margin-top:8px">${coE(pl.titre)}</h3>
    <div class="ag-hint" style="margin-top:0">${coE(p.titre)}. ${coE(p.detail)}</div>
    <div class="co-steps prev">${pl.etapes.map((e, i) => `<div class="co-step"><i>${i + 1}</i><div><b>${coE(e.t)}</b>${e.detail ? `<span>${coE(e.detail)}</span>` : ''}</div></div>`).join('')}</div>
    <button class="btn-primary" onclick="coAcceptDraft()">Accepter ce plan</button>
    ${coHasAI() ? `<button class="btn-secondary" style="margin-top:8px" onclick="agCloseSheet('coProp');coHelpForm(${coE(JSON.stringify(p.titre + '. ' + p.detail))},'${pl.domaine}','auto:${coE(p.id)}')">Faire un plan sur mesure avec l'IA</button>` : ''}
    <button class="btn-secondary" style="margin-top:8px" onclick="agCloseSheet('coProp');coRefuse('${coE(p.id)}')">Pas maintenant</button>`);
}
function coRefuse(id){
  const o = coRefus(); o[id] = Date.now() + 7 * coDayMs;
  try { localStorage.setItem('co_refus', JSON.stringify(o)); } catch(e){}
  coToast('Je te le reproposerai dans une semaine si c\'est toujours là'); coRender();
}
async function coAcceptDraft(){
  const d = CO.draft; if(!d || !(d.etapes || []).length) return;
  if(CO.busy) return; CO.busy = 'plan';
  try {
    const row = await coIns('coach_plans', { titre: coClean(d.titre).slice(0, 140), domaine: CO_DOM[d.domaine] ? d.domaine : 'organisation', objectif: coClean(d.objectif || ''), statut: 'en_cours',
      etapes: d.etapes.map(e => ({ t: coClean(e.t), ...(e.detail ? { detail: coClean(e.detail) } : {}), ...(e.go ? { go: e.go } : {}), statut: 'a_faire' })), source: d.source || 'manuel', echeance: d.echeance || null });
    CO.plans.unshift(row); CO.draft = null;
    agCloseSheet('coProp'); agCloseSheet('coHelp');
    coToast('Plan lancé. Une étape à la fois !');
    coOpen('plans', row.id);
  } catch(e){ coErr(e); } finally { CO.busy = ''; }
}
function coRenderPlan(v, p){
  const pr = coPlanProgress(p), dom = CO_DOM[p.domaine] || CO_DOM.organisation, done = (p.etapes || []).every(e => e.statut !== 'a_faire');
  const cur = (p.etapes || []).findIndex(e => e.statut === 'a_faire');
  v.innerHTML = `
    <button class="co-back" onclick="CO.planOpen=null;coRender()">${coI('chev', 15)} Mes plans</button>
    <div class="co-card co-plan-h">
      <div class="co-chip">${coI(dom.ic, 13)} ${dom.n}${p.statut !== 'en_cours' ? ' · ' + (p.statut === 'reussi' ? 'Réussi' : 'Arrêté') : ''}</div>
      <h4>${coE(p.titre)}</h4>${p.objectif ? `<p>${coE(p.objectif)}</p>` : ''}
      <div class="co-bar big"><i style="width:${pr}%"></i></div><div class="co-sub">${pr} % fait${p.echeance ? ' · pour le ' + coDate(p.echeance, { day: 'numeric', month: 'long' }) : ''}</div>
      ${p.resultat ? `<div class="co-res">${coI('check', 14)} ${coE(p.resultat)}</div>` : ''}
    </div>
    <div class="co-steps">${(p.etapes || []).map((e, i) => `
      <div class="co-step st-${e.statut} ${i === cur ? 'cur' : ''}">
        <i>${e.statut === 'fait' ? coI('check', 14) : e.statut === 'echec' ? '×' : i + 1}</i>
        <div>
          <b>${coE(e.t)}</b>${e.detail ? `<span>${coE(e.detail)}</span>` : ''}
          ${e.note ? `<em>Pourquoi : ${coE(e.note)}</em>` : ''}${e.res ? `<em class="ok">Résultat : ${coE(e.res)}${e.res_montant ? ' (' + coF(e.res_montant) + ')' : ''}</em>` : ''}
          ${e.date && e.statut !== 'a_faire' ? `<small>${e.statut === 'fait' ? 'Fait' : 'Pas réussi'} le ${coDate(e.date)}</small>` : ''}
          ${p.statut === 'en_cours' ? `<div class="co-btns sm">
            ${e.go && e.statut === 'a_faire' ? `<button class="main" onclick="coGo('${coE(e.go)}')">${coE(coGoLabel(e.go))}</button>` : ''}
            ${e.statut === 'a_faire' ? `<button class="ok" onclick="coStepDone(${p.id},${i})">${coI('check', 14)} Fait</button><button class="ko" onclick="coStepFail(${p.id},${i})">Pas réussi</button>`
              : `${e.statut === 'fait' && !e.res ? `<button onclick="coAskResult(${p.id},${i})">Noter le résultat</button>` : ''}<button onclick="coStepReset(${p.id},${i})">Refaire</button>`}
          </div>` : ''}
        </div>
      </div>`).join('')}</div>
    ${p.statut === 'en_cours' ? `<div class="co-btns col">
      ${coHasAI() ? `<button onclick="coStepAdd(${p.id})">${coI('plus', 15)} Ajouter une étape</button>` : `<button onclick="coStepAdd(${p.id})">${coI('plus', 15)} Ajouter une étape</button>`}
      <button class="${done ? 'main' : ''}" onclick="coFinish(${p.id})">${coI('target', 15)} ${done ? 'Noter le résultat final' : 'Terminer le plan'}</button>
    </div>` : `<div class="co-btns col"><button onclick="coPlanReopen(${p.id})">Reprendre ce plan</button><button class="ko" onclick="coPlanDelete(${p.id})">Supprimer</button></div>`}`;
}
async function coPlanSave(p, patch){
  const r = await coUpd('coach_plans', p.id, patch); Object.assign(p, patch, r && r.id ? r : {}); return p;
}
async function coStepDone(pid, i){
  const p = CO.plans.find(x => x.id === pid); if(!p) return;
  const et = p.etapes.map((e, k) => k === i ? { ...e, statut: 'fait', date: new Date().toISOString() } : e);
  try { await coPlanSave(p, { etapes: et }); } catch(e){ return coErr(e); }
  coToast('Bravo, étape faite !');
  if(et.every(e => e.statut !== 'a_faire')){ coRender(); return coFinish(pid); }
  coRender();
}
async function coStepReset(pid, i){
  const p = CO.plans.find(x => x.id === pid); if(!p) return;
  const et = p.etapes.map((e, k) => { if(k !== i) return e; const o = { t: e.t, statut: 'a_faire' }; if(e.detail) o.detail = e.detail; if(e.go) o.go = e.go; return o; });
  try { await coPlanSave(p, { etapes: et }); } catch(e){ return coErr(e); }
  coRender();
}
function coStepFail(pid, i){
  const p = CO.plans.find(x => x.id === pid); if(!p) return;
  agSheet('coFail', `<h3>Ça n'a pas marché ?</h3>
    <div class="ag-hint" style="margin-top:0">${coE(p.etapes[i].t)}</div>
    <label>Pourquoi ? (en quelques mots)</label>
    <textarea id="coFailWhy" rows="3" placeholder="Ex : le client n'a pas répondu, pas eu le temps, trop compliqué..."></textarea>
    <div class="ag-pills" style="margin-top:8px">${['Pas de réponse', 'Pas eu le temps', 'Trop compliqué', 'Le client a dit non'].map(t => `<button onclick="document.getElementById('coFailWhy').value='${coE(t)}'">${t}</button>`).join('')}</div>
    <button class="btn-primary" style="margin-top:12px" onclick="coStepFailSave(${pid},${i})">Enregistrer${coHasAI() ? ' et trouver une autre façon' : ''}</button>
    <div id="coAlt"></div>`);
}
async function coStepFailSave(pid, i){
  const p = CO.plans.find(x => x.id === pid); if(!p) return;
  const why = (document.getElementById('coFailWhy').value || '').trim();
  const step = p.etapes[i];
  const et = p.etapes.map((e, k) => k === i ? { ...e, statut: 'echec', note: why || 'Pas précisé', date: new Date().toISOString() } : e);
  try {
    await coPlanSave(p, { etapes: et });
    const j = await coIns('coach_journal', { kind: 'echec', text: coClean(`${step.t} : n'a pas marché${why ? ' (' + why + ')' : ''}.`), data: { plan_id: p.id, etape: i, domaine: p.domaine } });
    CO.journal.unshift(j);
  } catch(e){ return coErr(e); }
  coRender();
  const box = document.getElementById('coAlt'); if(!box) return;
  const btn = document.querySelector('#coFail .btn-primary'); if(btn) btn.style.display = 'none';
  const simple = [{ t: 'Version plus simple : ' + step.t.charAt(0).toLowerCase() + step.t.slice(1), detail: 'Fais-en juste une petite partie aujourd\'hui (1 client au lieu de 3, 1 message au lieu de 5).' }];
  if(!coHasAI()){ CO.alt = { pid, i, list: simple }; box.innerHTML = coAltHtml(); return; }
  box.innerHTML = '<div class="co-think">Le coach cherche une autre façon...</div>';
  try {
    const t = await coAsk(`TÂCHE : une étape d'un plan d'action n'a pas marché, propose une autre façon de faire.
Plan : "${p.titre}" (${p.domaine}). Objectif : ${p.objectif || p.titre}
Étapes : ${p.etapes.map((e, k) => `${k + 1}. ${e.t} [${e.statut}]`).join(' / ')}
Étape ratée : "${step.t}". Raison donnée par Henzo : "${why || 'pas précisée'}".
Ce que tu sais déjà :\n${coContexte()}
Propose 2 alternatives : une autre façon de faire, et une version plus simple. Réponds UNIQUEMENT en JSON : {"conseil":"une phrase d'encouragement et d'explication","etapes":[{"t":"action courte","detail":"comment faire, concret"},{"t":"...","detail":"..."}]}`);
    const j = coJson(t) || {};
    const list = (Array.isArray(j.etapes) ? j.etapes : []).filter(x => x && x.t).slice(0, 3).map(x => ({ t: coClean(x.t), detail: coClean(x.detail || '') }));
    CO.alt = { pid, i, list: list.length ? list : simple, conseil: coClean(j.conseil || '') };
  } catch(e){ CO.alt = { pid, i, list: simple, conseil: 'L\'IA n\'a pas pu répondre (' + coClean(e.message) + '). Voici une version plus simple.' }; }
  box.innerHTML = coAltHtml();
}
function coAltHtml(){
  const a = CO.alt; if(!a) return '';
  return `<div class="co-alt">${a.conseil ? `<p>${coE(a.conseil)}</p>` : ''}${a.list.map((x, k) => `<div class="co-step"><i>${k + 1}</i><div><b>${coE(x.t)}</b>${x.detail ? `<span>${coE(x.detail)}</span>` : ''}<div class="co-btns sm"><button class="main" onclick="coAltAdd(${k})">Ajouter au plan</button></div></div></div>`).join('')}
    <button class="btn-secondary" onclick="agCloseSheet('coFail')">Fermer</button></div>`;
}
async function coAltAdd(k){
  const a = CO.alt; if(!a) return; const p = CO.plans.find(x => x.id === a.pid); if(!p) return;
  const x = a.list[k]; const et = p.etapes.slice(); et.splice(a.i + 1, 0, { t: x.t, ...(x.detail ? { detail: x.detail } : {}), statut: 'a_faire', src: 'ia' });
  try { await coPlanSave(p, { etapes: et }); } catch(e){ return coErr(e); }
  a.list.splice(k, 1); a.i++;
  coToast('Étape ajoutée au plan'); coRender();
  const box = document.getElementById('coAlt'); if(box) box.innerHTML = a.list.length ? coAltHtml() : ''; if(!a.list.length) agCloseSheet('coFail');
}
function coStepAdd(pid){
  agSheet('coAdd', `<h3>Ajouter une étape</h3><label>Ce que tu vas faire</label><input id="coAddT" placeholder="Ex : appeler Awa demain matin"><label>Détail (facultatif)</label><input id="coAddD">
    <button class="btn-primary" style="margin-top:12px" onclick="coStepAddSave(${pid})">Ajouter</button>`);
}
async function coStepAddSave(pid){
  const p = CO.plans.find(x => x.id === pid); const t = document.getElementById('coAddT').value.trim(); if(!p || !t) return;
  const d = document.getElementById('coAddD').value.trim();
  try { await coPlanSave(p, { etapes: [...p.etapes, { t, ...(d ? { detail: d } : {}), statut: 'a_faire' }] }); } catch(e){ return coErr(e); }
  agCloseSheet('coAdd'); coRender();
}
function coAskResult(pid, i){
  const p = CO.plans.find(x => x.id === pid); if(!p) return;
  agSheet('coRes', `<h3>Qu'est-ce que ça a donné ?</h3><div class="ag-hint" style="margin-top:0">${coE(p.etapes[i].t)}</div>
    <label>Ce qui s'est passé</label><textarea id="coResT" rows="3" placeholder="Ex : Awa a payé 5 000 F, Jean a promis pour vendredi"></textarea>
    <label>Argent obtenu grâce à cette étape (facultatif)</label><input id="coResM" type="number" inputmode="numeric" placeholder="0">
    <button class="btn-primary" style="margin-top:12px" onclick="coAskResultSave(${pid},${i})">Enregistrer</button>
    <button class="btn-secondary" style="margin-top:8px" onclick="coAskLater(${pid},${i})">Pas encore de résultat</button>`);
}
async function coAskResultSave(pid, i){
  const p = CO.plans.find(x => x.id === pid); if(!p) return;
  const t = document.getElementById('coResT').value.trim(), m = parseFloat(document.getElementById('coResM').value) || 0;
  if(!t && !m) return coToast('Écris ce qui s\'est passé');
  const et = p.etapes.map((e, k) => k === i ? { ...e, res: t || 'Obtenu', ...(m ? { res_montant: m } : {}) } : e);
  try {
    await coPlanSave(p, { etapes: et });
    const j = await coIns('coach_journal', { kind: 'resultat', text: coClean(`${p.etapes[i].t} : ${t || 'fait'}${m ? ' (' + coF(m) + ')' : ''}`), data: { plan_id: p.id, etape: i, montant: m || null, domaine: p.domaine } });
    CO.journal.unshift(j);
  } catch(e){ return coErr(e); }
  agCloseSheet('coRes'); coToast('Résultat noté. Le coach s\'en souviendra.'); coRender();
}
async function coAskLater(pid, i){
  const p = CO.plans.find(x => x.id === pid); if(!p) return;
  const et = p.etapes.map((e, k) => k === i ? { ...e, snooze: new Date(Date.now() + 2 * coDayMs).toISOString() } : e);
  try { await coPlanSave(p, { etapes: et }); } catch(e){ return coErr(e); }
  agCloseSheet('coRes'); coRender();
}
function coFinish(pid){
  const p = CO.plans.find(x => x.id === pid); if(!p) return;
  const tot = (p.etapes || []).reduce((a, e) => a + (Number(e.res_montant) || 0), 0);
  agSheet('coFin', `<h3>Résultat du plan</h3><div class="ag-hint" style="margin-top:0">${coE(p.titre)}</div>
    <label>Est-ce que tu as atteint l'objectif ?</label>
    <div class="ag-pills" id="coFinSt"><button class="on" data-v="reussi" onclick="agPick(this)">Oui, réussi</button><button data-v="abandonne" onclick="agPick(this)">Non, j'arrête là</button></div>
    <label>Ce que tu as obtenu</label><textarea id="coFinT" rows="3" placeholder="Ex : loyer payé à temps, 2 clients ont payé, 1 nouvelle séance"></textarea>
    <label>Montant obtenu (FCFA, facultatif)</label><input id="coFinM" type="number" inputmode="numeric" value="${tot || ''}">
    <button class="btn-primary" style="margin-top:12px" onclick="coFinishSave(${pid})">Terminer le plan</button>`);
}
async function coFinishSave(pid){
  const p = CO.plans.find(x => x.id === pid); if(!p) return;
  const st = (document.querySelector('#coFinSt button.on') || {}).dataset?.v || 'reussi';
  const t = document.getElementById('coFinT').value.trim(), m = parseFloat(document.getElementById('coFinM').value) || 0;
  const resultat = coClean((t || (st === 'reussi' ? 'Objectif atteint' : 'Plan arrêté')) + (m ? ` (${coF(m)})` : ''));
  try {
    await coPlanSave(p, { statut: st, resultat });
    const j = await coIns('coach_journal', { kind: 'resultat', text: `Plan "${coClean(p.titre)}" ${st === 'reussi' ? 'réussi' : 'arrêté'} : ${resultat}`, data: { plan_id: p.id, montant: m || null, domaine: p.domaine, reussi: st === 'reussi' } });
    CO.journal.unshift(j);
  } catch(e){ return coErr(e); }
  agCloseSheet('coFin'); coToast(st === 'reussi' ? 'Bravo Henzo !' : 'C\'est noté. On apprend de chaque essai.'); coRender();
  coLearn(`Plan "${p.titre}" (${p.domaine}), ${st === 'reussi' ? 'réussi' : 'arrêté'}. Résultat : ${resultat}.\nÉtapes : ${p.etapes.map(e => `${e.t} [${e.statut}${e.note ? ', raison : ' + e.note : ''}${e.res ? ', résultat : ' + e.res : ''}]`).join(' / ')}`, { plan_id: p.id, domaine: p.domaine });
}
// L'IA tire une leçon et la garde dans le journal
async function coLearn(txt, data){
  if(!coHasAI()) return null;
  try {
    const t = await coAsk(`TÂCHE : tirer une leçon pour la mémoire du coach.\n${txt}\nCe que le coach sait déjà :\n${coMemoire(8)}\nÉcris UNE leçon courte (1 ou 2 phrases) sur ce qui marche ou ne marche pas pour Henzo, à réutiliser la prochaine fois. Réponds uniquement par la leçon.`, { maxTokens: 400 });
    const s = coClean(t).replace(/^["\s]+|["\s]+$/g, '').slice(0, 400); if(!s) return null;
    const j = await coIns('coach_journal', { kind: 'apprentissage', text: s, data: data || null });
    CO.journal.unshift(j);
    const pg = document.querySelector('.page.active'); if(pg && pg.id === 'page-ia' && !document.querySelector('.ag-sheet') && CO.tab === 'journal') coRender();
    return j;
  } catch(e){ console.warn('coLearn', e); return null; }
}
async function coPlanReopen(pid){ const p = CO.plans.find(x => x.id === pid); if(!p) return; try { await coPlanSave(p, { statut: 'en_cours' }); } catch(e){ return coErr(e); } coRender(); }
async function coPlanDelete(pid){
  if(!await agConfirm('Supprimer ce plan ?\nLe journal garde ses résultats.')) return;
  try { await coDel('coach_plans', pid); } catch(e){ return coErr(e); }
  CO.plans = CO.plans.filter(x => x.id !== pid); CO.planOpen = null; coRender();
}
// "Aide-moi à..." : l'IA fait le plan à partir d'un objectif
function coHelpForm(obj, dom, src){
  CO.help = { src: src || 'manuel' };
  agSheet('coHelp', `<h3>Aide-moi à...</h3>
    <div class="ag-hint" style="margin-top:0">Dis ton objectif avec tes mots. Le coach te fait un plan de 3 à 6 étapes.</div>
    <label>Mon objectif</label><textarea id="coHelpT" rows="3" placeholder="Ex : avoir 5 séances de plus ce mois, payer mon crédit de 80 000 F, avoir plus d'avis...">${coE(obj || '')}</textarea>
    <label>Domaine</label>
    <div class="ag-pills" id="coHelpD">${Object.entries(CO_DOM).map(([k, d]) => `<button class="${(dom || 'ventes') === k ? 'on' : ''}" data-v="${k}" onclick="agPick(this)">${d.n}</button>`).join('')}</div>
    <label>Pour quand ? (facultatif)</label><input id="coHelpE" type="date">
    <button class="btn-primary" style="margin-top:12px" onclick="coHelpRun()">${coHasAI() ? 'Faire mon plan' : 'Continuer'}</button>
    <div id="coHelpOut"></div>`);
}
async function coHelpRun(){
  const obj = document.getElementById('coHelpT').value.trim(); if(!obj) return coToast('Écris ton objectif');
  const dom = (document.querySelector('#coHelpD button.on') || {}).dataset?.v || 'ventes', ech = document.getElementById('coHelpE').value || null;
  const out = document.getElementById('coHelpOut');
  if(!coHasAI()){
    CO.draft = { titre: obj.slice(0, 100), domaine: dom, objectif: obj, etapes: [], echeance: ech, source: CO.help.src };
    out.innerHTML = `<label>Tes étapes (une par ligne)</label><textarea id="coHelpS" rows="5" placeholder="Relancer Awa\nPublier la promo\n..."></textarea><button class="btn-primary" style="margin-top:10px" onclick="coHelpManual()">Commencer ce plan</button>`;
    return;
  }
  if(CO.busy) return; CO.busy = 'help';
  out.innerHTML = '<div class="co-think">Le coach prépare ton plan...</div>';
  try {
    const t = await coAsk(`TÂCHE : créer un plan d'action concret.
Objectif de Henzo : "${obj}". Domaine : ${dom}.${ech ? ' Pour le ' + ech + '.' : ''}
Ce que tu sais :\n${coContexte()}
Fais un plan de 3 à 6 étapes très concrètes, faisables cette semaine, dans l'ordre. Utilise les vrais noms et montants quand tu les connais. Évite ce qui n'a pas marché avant (voir journal).
Pour chaque étape, tu peux donner "go" pour ouvrir le bon écran de l'app : "dettes" (clients qui doivent), "compose:ID" (écrire à un client), "marketing:chat" (écrire un post), "marketing:jour", "promo" (créer un bon), "tarifs", "devis", "coffres", "historique", "seances", "notes", "negocier", "ecole:l06" (leçon), ou "" sinon.
Réponds UNIQUEMENT en JSON : {"titre":"titre court","etapes":[{"t":"action courte","detail":"comment faire","go":""}]}`);
    const j = coJson(t) || {};
    const et = (Array.isArray(j.etapes) ? j.etapes : []).filter(x => x && x.t).slice(0, 6).map(x => ({ t: coClean(x.t), detail: coClean(x.detail || ''), go: /^(dettes|compose:[\d,]+|compose_merci:[\d,]+|relance:\d+|client:\d+|marketing(:\w+)?|promo|tarifs|devis|coffres|historique|objectifs|seances|notes|negocier|charges|ecole:l\d+)$/.test(x.go || '') ? x.go : '' }));
    if(!et.length) throw new Error("L'IA n'a pas donné d'étapes. Réessaie.");
    CO.draft = { titre: coClean(j.titre || obj).slice(0, 100), domaine: dom, objectif: obj, etapes: et, echeance: ech, source: CO.help.src === 'manuel' ? 'ia' : CO.help.src };
    out.innerHTML = `<div class="co-steps prev">${et.map((e, i) => `<div class="co-step"><i>${i + 1}</i><div><b>${coE(e.t)}</b>${e.detail ? `<span>${coE(e.detail)}</span>` : ''}</div></div>`).join('')}</div>
      <button class="btn-primary" onclick="coAcceptDraft()">Commencer ce plan</button><button class="btn-secondary" style="margin-top:8px" onclick="coHelpRun()">Refaire un autre plan</button>`;
  } catch(e){ out.innerHTML = `<div class="ag-hint warn">${coE(coClean(e.message))}</div>`; }
  finally { CO.busy = ''; }
}
function coHelpManual(){
  const l = document.getElementById('coHelpS').value.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 8);
  if(!l.length) return coToast('Écris au moins une étape');
  CO.draft.etapes = l.map(t => ({ t })); coAcceptDraft();
}

// ------------------------------------------------------------
// 8. CHARGES FIXES (budget.js)
// ------------------------------------------------------------
function coRenderCharges(v){
  if(typeof window.bgRenderCharges === 'function'){
    v.innerHTML = '<div id="coChargesHost"></div>';
    try { window.bgRenderCharges(document.getElementById('coChargesHost')); } catch(e){ console.error(e); v.innerHTML = `<div class="ag-empty">Les charges fixes n'ont pas pu s'afficher.<br>${coE(e.message)}</div>`; }
    return;
  }
  v.innerHTML = `<div class="co-card co-soon"><h4>${coI('calendar', 16)} Charges fixes : bientôt disponible</h4><p>Ici tu verras ton loyer, l'électricité, internet et tes crédits, avec les dates et ce qu'il te reste à mettre de côté. Le coach te préviendra avant chaque charge.</p></div>`;
}

// ------------------------------------------------------------
// 9. ÉCOLE DE LA VENTE
// ------------------------------------------------------------
function coLecon(id){ return CO_LECONS.find(l => l.id === id) || null; }
function coLeconFaite(id, day){ return coSort(CO.ecole).find(e => e.lecon_id === id && e.fait && (!day || String(e.date || e.created_at || '').slice(0, 10) === day)) || null; }
function coBestScore(id){ const s = CO.ecole.filter(e => e.lecon_id === id && e.score != null).map(e => Number(e.score)); return s.length ? Math.max(...s) : null; }
const CO_PB_TAGS = { refus: 'trop_cher', devis_attente: 'relance', dettes: 'paiement', pub_absente: 'statut', pub_faible: 'storytelling', avis: 'avis', inactifs: 'fideliser' };
function coLeconDuJour(){
  const day = coToday();
  let saved = null; try { saved = JSON.parse(localStorage.getItem('co_lecon_jour') || 'null'); } catch(e){}
  if(saved && saved.d === day && coLecon(saved.id)) return { ...coLecon(saved.id), pourquoi: saved.w || '' };
  let pick = null, why = '';
  const recent = id => CO.ecole.some(e => e.lecon_id === id && e.fait && coAgo(e.date || e.created_at) <= 30);
  try {
    // Beaucoup de refus pour le prix : la leçon sur le prix
    const negRef = CO.negos.filter(n => n.resultat === 'refuse' && coAgo(n.updated_at || n.created_at) <= 45);
    const tags = [];
    if(negRef.filter(n => /cher|prix|budget/i.test(n.raison || '')).length >= 2) tags.push(['trop_cher', 'Tu as eu plusieurs refus pour le prix.']);
    coDetect().forEach(p => { const t = CO_PB_TAGS[p.id] || (p.id.startsWith('charge_') ? 'conclure' : null); if(t) tags.push([t, 'Choisie pour toi : ' + p.titre.toLowerCase() + '.']); });
    for(const [t, w] of tags){ const l = CO_LECONS.find(x => x.tags[0] === t && !recent(x.id)) || CO_LECONS.find(x => x.tags.includes(t) && !recent(x.id)); if(l){ pick = l; why = w; break; } }
  } catch(e){}
  if(!pick){ pick = CO_LECONS.find(l => !coLeconFaite(l.id)) || CO_LECONS.slice().sort((a, b) => (coBestScore(a.id) ?? 0) - (coBestScore(b.id) ?? 0))[0]; why = coLeconFaite(pick.id) ? 'Une leçon à revoir pour améliorer ta note.' : 'La suite de ton programme.'; }
  try { localStorage.setItem('co_lecon_jour', JSON.stringify({ d: day, id: pick.id, w: why })); } catch(e){}
  return { ...pick, pourquoi: why };
}
function coRenderEcole(v){
  if(CO.lecon && coLecon(CO.lecon)) return coRenderLecon(v, coLecon(CO.lecon));
  CO.lecon = null;
  const lj = coLeconDuJour(), faites = CO_LECONS.filter(l => coLeconFaite(l.id)).length;
  const sc = CO.ecole.filter(e => e.score != null), moy = sc.length ? (sc.reduce((a, e) => a + Number(e.score), 0) / sc.length).toFixed(1) : '-';
  const streak = coStreak(), today = coLeconFaite(lj.id, coToday());
  v.innerHTML = `
    <div class="co-hero">
      <div class="lbl">École de la vente</div>
      <div class="ttl">${faites}/${CO_LECONS.length} <small>leçons faites</small></div>
      <div class="split"><div>Série<b>${streak} jour${streak > 1 ? 's' : ''}</b></div><div>Note moyenne<b>${moy}${sc.length ? '/10' : ''}</b></div><div>Exercices<b>${sc.length}</b></div></div>
    </div>
    <div class="co-sech"><h3>Leçon du jour</h3></div>
    <div class="co-card co-lesson-card" onclick="coOpen('ecole','${lj.id}')">
      <div class="co-chip">${coI('flame', 13)} ${coE(lj.theme)} · 5 min</div>
      <h4>${coE(lj.titre)}</h4><p>${today ? 'Faite aujourd\'hui. Reviens demain pour la suivante !' : coE(lj.pourquoi)}</p>
      <div class="co-btns"><button class="main">${today ? 'Revoir' : 'Commencer'}</button></div>
    </div>
    <div class="co-sech"><h3>Le programme</h3><span>${CO_LECONS.length} leçons</span></div>
    <div class="ag-list">${CO_LECONS.map((l, i) => { const f = coLeconFaite(l.id), b = coBestScore(l.id);
      return `<div class="co-lrow ${f ? 'done' : ''}" onclick="coOpen('ecole','${l.id}')"><i>${f ? coI('check', 14) : i + 1}</i><div class="d"><b>${coE(l.titre)}</b><span>${coE(l.theme)}${b != null ? ' · meilleure note ' + b + '/10' : f ? ' · lue' : ''}</span></div>${coI('chev', 15)}</div>`; }).join('')}</div>`;
}
function coRenderLecon(v, l){
  const idx = CO_LECONS.indexOf(l), f = coLeconFaite(l.id), b = coBestScore(l.id);
  const ex = CO.ex && CO.ex.lid === l.id ? CO.ex : null;
  v.innerHTML = `
    <button class="co-back" onclick="CO.lecon=null;CO.ex=null;coRender()">${coI('chev', 15)} École de la vente</button>
    <div class="co-lesson">
      <div class="co-chip">${coI('flame', 13)} Leçon ${idx + 1} · ${coE(l.theme)} · 5 min</div>
      <h2 class="co-h">${coE(l.titre)}</h2>
      ${f ? `<div class="co-res">${coI('check', 14)} Déjà faite${b != null ? ' · meilleure note ' + b + '/10' : ''}</div>` : ''}
      <div class="co-sec-t">La technique</div>
      ${l.technique.split('\n').map(p => `<p>${coE(p)}</p>`).join('')}
      <div class="co-sec-t">Exemple</div>
      <div class="co-chat ex">${l.exemple.map(([w, t]) => `<div class="co-msg ${w === 'h' ? 'henzo' : 'client'}"><small>${w === 'h' ? 'Henzo' : 'Client'}</small>${coE(t).replace(/\n/g, '<br>')}</div>`).join('')}</div>
      <div class="co-sec-t">À retenir</div>
      <ul class="co-ret">${l.retenir.map(r => `<li>${coI('check', 13)}<span>${coE(r)}</span></li>`).join('')}</ul>
      <div class="co-sec-t">Exercice</div>
      <div class="co-card co-exo"><p><b>Le client :</b> ${coE(l.exo.client)}</p><p><b>Ta mission :</b> ${coE(l.exo.consigne)}</p></div>
      <div id="coExBox">${ex ? coExHtml(ex) : `<button class="btn-primary" onclick="coExStart('${l.id}')">${coI('chat', 16)} Faire l'exercice</button>
        <button class="btn-secondary" style="margin-top:8px" onclick="coLeconLue('${l.id}')">J'ai lu la leçon (sans exercice)</button>`}</div>
      <div class="co-btns" style="margin-top:14px">${idx > 0 ? `<button onclick="CO.ex=null;coOpen('ecole','${CO_LECONS[idx - 1].id}')">Leçon précédente</button>` : ''}${idx < CO_LECONS.length - 1 ? `<button onclick="CO.ex=null;coOpen('ecole','${CO_LECONS[idx + 1].id}')">Leçon suivante</button>` : ''}</div>
    </div>`;
}
function coExStart(lid){
  const l = coLecon(lid); if(!l) return;
  const first = /^\(/.test(l.exo.premier);
  CO.ex = { lid, msgs: first ? [{ r: 'consigne', t: l.exo.premier.replace(/^\(|\)$/g, '') }] : [{ r: 'client', t: l.exo.premier }], tours: 0, done: false, eval: null };
  coExRefresh();
  setTimeout(() => { const i = document.getElementById('coExIn'); if(i) i.focus(); }, 60);
}
function coExHtml(ex){
  return `<div class="co-chat">${ex.msgs.map(m => m.r === 'consigne' ? `<div class="co-msg coach">${coE(m.t)}</div>` : `<div class="co-msg ${m.r === 'henzo' ? 'henzo' : 'client'}"><small>${m.r === 'henzo' ? 'Toi' : 'Client'}</small>${coE(m.t).replace(/\n/g, '<br>')}</div>`).join('')}
    ${CO.busy === 'ex' ? '<div class="co-think">Le client écrit...</div>' : ''}</div>
    ${ex.eval ? coEvalHtml(ex.eval) : ex.done ? '' : `<div class="co-reply"><textarea id="coExIn" rows="3" placeholder="Écris ta réponse comme sur WhatsApp..."></textarea>
      <div class="co-btns"><button class="main" onclick="coExSend()" ${CO.busy ? 'disabled' : ''}>${coI('chat', 15)} Envoyer</button>${ex.tours >= 1 ? `<button onclick="coExEval()" ${CO.busy ? 'disabled' : ''}>Terminer et être noté</button>` : ''}</div></div>`}`;
}
function coEvalHtml(e){
  const s = Number(e.score) || 0;
  return `<div class="co-eval"><div class="co-score ${s >= 7 ? 'good' : s >= 5 ? 'mid' : 'bad'}"><b>${s}</b><span>/10</span></div>
    ${e.resume ? `<p>${coE(e.resume)}</p>` : ''}
    ${(e.bien || []).length ? `<div class="co-sec-t">Ce qui est bien</div><ul class="co-ret">${e.bien.map(x => `<li>${coI('check', 13)}<span>${coE(x)}</span></li>`).join('')}</ul>` : ''}
    ${(e.ameliorer || []).length ? `<div class="co-sec-t">À améliorer</div><ul class="co-ret warn">${e.ameliorer.map(x => `<li>${coI('info', 13)}<span>${coE(x)}</span></li>`).join('')}</ul>` : ''}
    ${e.meilleure ? `<div class="co-sec-t">Une réponse encore meilleure</div><div class="co-msg henzo solo">${coE(e.meilleure).replace(/\n/g, '<br>')}</div>` : ''}
    <div class="co-btns"><button class="main" onclick="coExStart('${CO.ex.lid}')">Recommencer</button><button onclick="CO.ex=null;CO.lecon=null;coRender()">Retour au programme</button></div></div>`;
}
function coExRefresh(){ const b = document.getElementById('coExBox'); if(b && CO.ex) b.innerHTML = coExHtml(CO.ex); else coRender(); }
function coExTranscript(ex){ return ex.msgs.filter(m => m.r !== 'consigne').map(m => (m.r === 'henzo' ? 'HENZO : ' : 'CLIENT : ') + m.t).join('\n'); }
async function coExSend(){
  const ex = CO.ex; const inp = document.getElementById('coExIn'); if(!ex || !inp) return;
  const t = inp.value.trim(); if(!t || CO.busy) return;
  ex.msgs.push({ r: 'henzo', t }); ex.tours++;
  const l = coLecon(ex.lid);
  if(!coHasAI()){ ex.done = true; coExRefresh(); const b = document.getElementById('coExBox'); if(b) b.insertAdjacentHTML('beforeend', `<div class="ag-hint warn">Connecte l'IA pour que le client te réponde et que ta réponse soit notée.</div><button class="btn-secondary" onclick="coLeconLue('${l.id}')">Marquer la leçon comme faite</button>`); return; }
  if(ex.tours >= 2) return coExEval();
  CO.busy = 'ex'; coExRefresh();
  try {
    const r = await coAsk(`TÂCHE : jeu de rôle, tu joues un client ivoirien pour un exercice de vente.
Leçon travaillée : "${l.titre}". Ton personnage : ${l.exo.client}
Contexte : Henzo Studio, photographe à Bouaké. Le client écrit sur WhatsApp, avec le style de Côte d'Ivoire (naturel, parfois "oh", "hein", "mon frère", "c'est cher deh", "on va voir"), réaliste : ni trop facile, ni méchant. Si la réponse de Henzo est bonne, tu avances un peu ; sinon tu résistes.
Discussion :\n${coExTranscript(ex)}
Écris UNIQUEMENT le prochain message du client (1 à 3 phrases), sans guillemets.`, { maxTokens: 400 });
    ex.msgs.push({ r: 'client', t: coClean(r).replace(/^(CLIENT\s*:\s*)/i, '').trim() || 'D\'accord, et donc ?' });
  } catch(e){ coErr(e); ex.tours--; ex.msgs.pop(); }
  CO.busy = ''; coExRefresh();
}
async function coExEval(){
  const ex = CO.ex; if(!ex || CO.busy) return;
  const inp = document.getElementById('coExIn'); if(inp && inp.value.trim() && ex.msgs[ex.msgs.length - 1].r !== 'henzo'){ ex.msgs.push({ r: 'henzo', t: inp.value.trim() }); ex.tours++; }
  const l = coLecon(ex.lid);
  CO.busy = 'eval'; ex.done = true; coExRefresh();
  const b = document.getElementById('coExBox'); if(b) b.insertAdjacentHTML('beforeend', '<div class="co-think">Le coach lit tes réponses...</div>');
  try {
    const r = await coAsk(`TÂCHE : corriger un exercice de vente et noter sur 10.
Leçon : "${l.titre}". Technique : ${l.technique}
À retenir : ${l.retenir.join(' / ')}
Consigne de l'exercice : ${l.exo.consigne}
Discussion (Henzo = le photographe) :\n${coExTranscript(ex)}
Note les réponses de Henzo sur 10 (sois juste : 5 = moyen, 8 = très bien). Donne des conseils concrets, dans le contexte ivoirien.
Réponds UNIQUEMENT en JSON : {"score":7,"resume":"une phrase","bien":["...","..."],"ameliorer":["...","..."],"meilleure":"une réponse encore meilleure, prête à envoyer sur WhatsApp"}`, { maxTokens: 1200 });
    const j = coJson(r);
    if(!j || j.score == null) throw new Error("L'IA n'a pas pu noter. Réessaie.");
    const ev = { score: Math.max(0, Math.min(10, Math.round(Number(j.score) || 0))), resume: coClean(j.resume || ''), bien: (j.bien || []).map(coClean).slice(0, 4), ameliorer: (j.ameliorer || []).map(coClean).slice(0, 4), meilleure: coClean(j.meilleure || '') };
    ex.eval = ev;
    const row = await coIns('ecole_progres', { lecon_id: l.id, date: coToday(), fait: true, score: ev.score, notes: coClean(`${ev.resume}${ev.ameliorer.length ? ' À améliorer : ' + ev.ameliorer.join(' ; ') : ''}`).slice(0, 1000) });
    CO.ecole.unshift(row);
    coToast(`Exercice noté : ${ev.score}/10`);
  } catch(e){ ex.done = false; coErr(e); }
  CO.busy = ''; coExRefresh();
}
async function coLeconLue(lid){
  try { const row = await coIns('ecole_progres', { lecon_id: lid, date: coToday(), fait: true, score: null, notes: 'Leçon lue' }); CO.ecole.unshift(row); } catch(e){ return coErr(e); }
  coToast('Leçon marquée comme faite'); CO.ex = null; coRender();
}

// ------------------------------------------------------------
// 10. JOURNAL DU COACH
// ------------------------------------------------------------
function coRenderJournal(v){
  const f = CO.jf, list = coSort(CO.journal).filter(j => f === 'tout' || j.kind === f);
  const res = CO.journal.filter(j => j.kind === 'resultat'), gain = res.reduce((a, j) => a + (Number(j.data && j.data.montant) || 0), 0);
  v.innerHTML = `
    <div class="co-hero sm"><div class="lbl">La mémoire du coach</div><div class="ttl">${CO.journal.length} <small>note${CO.journal.length > 1 ? 's' : ''}</small></div>
      <div class="split"><div>Résultats<b>${res.length}</b></div><div>Argent obtenu<b>${coF(gain)}</b></div><div>Appris<b>${CO.journal.filter(j => j.kind === 'apprentissage').length}</b></div></div></div>
    <button class="btn-primary co-help" onclick="coJForm()">${coI('plus', 16)} Voici ce qui s'est passé</button>
    <div class="co-tabs sm">${[['tout', 'Tout'], ['resultat', 'Résultats'], ['echec', 'Échecs'], ['apprentissage', 'Appris'], ['astuce', 'Astuces']].map(([k, n]) => `<button class="${f === k ? 'on' : ''}" onclick="CO.jf='${k}';coRender()">${n}</button>`).join('')}</div>
    ${list.length ? `<div class="ag-list">${list.map(j => `<div class="co-jrow k-${coE(j.kind)}" onclick="coJForm(${j.id})"><i>${coI({ resultat: 'target', echec: 'ban', apprentissage: 'sparkles', astuce: 'bulb' }[j.kind] || 'note', 15)}</i>
      <div class="d"><span>${CO_JK[j.kind] || coE(j.kind)} · ${coDate(j.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}${j.data && j.data.montant ? ' · ' + coF(j.data.montant) : ''}</span><p>${coE(j.text)}</p></div></div>`).join('')}</div>`
      : '<div class="ag-empty">Rien ici pour le moment. Le coach note ici ce qui marche et ce qui ne marche pas pour toi.</div>'}`;
}
function coJForm(id){
  const j = id ? CO.journal.find(x => x.id === id) : null;
  agSheet('coJ', `<h3>${j ? 'Modifier' : 'Voici ce qui s\'est passé'}</h3>
    <label>Type</label><div class="ag-pills" id="coJK">${Object.entries(CO_JK).map(([k, n]) => `<button class="${(j ? j.kind : 'resultat') === k ? 'on' : ''}" data-v="${k}" onclick="agPick(this)">${n}</button>`).join('')}</div>
    <label>Raconte</label><textarea id="coJT" rows="4" placeholder="Ex : J'ai proposé le pack Solo à Awa au lieu de baisser le prix, elle a accepté.">${coE(j ? j.text : '')}</textarea>
    <label>Montant (facultatif)</label><input id="coJM" type="number" inputmode="numeric" value="${j && j.data && j.data.montant ? j.data.montant : ''}">
    <button class="btn-primary" style="margin-top:12px" onclick="coJSave(${j ? j.id : 'null'})">Enregistrer</button>
    ${!j && coHasAI() ? '<div class="ag-hint">Le coach en tire ensuite une leçon pour la prochaine fois.</div>' : ''}
    ${j ? `<button class="btn-danger" style="margin-top:8px;width:100%;padding:12px" onclick="coJDel(${j.id})">Supprimer</button>` : ''}`);
}
async function coJSave(id){
  const kind = (document.querySelector('#coJK button.on') || {}).dataset?.v || 'resultat', text = coClean(document.getElementById('coJT').value.trim()), m = parseFloat(document.getElementById('coJM').value) || 0;
  if(!text) return coToast('Écris ce qui s\'est passé');
  try {
    if(id){ const j = CO.journal.find(x => x.id === id); const data = { ...(j.data || {}), montant: m || null }; const r = await coUpd('coach_journal', id, { kind, text, data }); Object.assign(j, { kind, text, data }, r && r.id ? r : {}); }
    else { const r = await coIns('coach_journal', { kind, text, data: { montant: m || null, source: 'henzo' } }); CO.journal.unshift(r); if(kind !== 'apprentissage') coLearn('Henzo raconte : ' + text, { source: 'henzo' }); }
  } catch(e){ return coErr(e); }
  agCloseSheet('coJ'); coToast('Enregistré'); coRender();
}
async function coJDel(id){
  if(!await agConfirm('Supprimer cette note du journal ?')) return;
  try { await coDel('coach_journal', id); } catch(e){ return coErr(e); }
  CO.journal = CO.journal.filter(x => x.id !== id); agCloseSheet('coJ'); coRender();
}

// ------------------------------------------------------------
// 11. BILAN DE LA SEMAINE
// ------------------------------------------------------------
function coBilanCalc(){
  const now = Date.now(), from = now - 7 * coDayMs, inW = d => d && new Date(String(d).length <= 10 ? d + 'T12:00:00' : d).getTime() >= from && new Date(String(d).length <= 10 ? d + 'T12:00:00' : d).getTime() <= now;
  const tx = (typeof txs !== 'undefined' ? txs : []).filter(t => !t.cancelled && inW(t.date));
  const entrees = tx.filter(t => t.type === 'revenu').reduce((a, t) => a + Number(t.amount), 0), depenses = tx.filter(t => t.type === 'depense').reduce((a, t) => a + Number(t.amount), 0);
  const sh = (typeof shoots !== 'undefined' ? shoots : []).filter(s => !/annul/i.test(s.status || '') && inW(s.date));
  const nc = (typeof clients !== 'undefined' ? clients : []).filter(c => inW(c.created_at)).length;
  let etapes = 0, echecs = 0; CO.plans.forEach(p => (p.etapes || []).forEach(e => { if(inW(e.date)){ if(e.statut === 'fait') etapes++; if(e.statut === 'echec') echecs++; } }));
  const neg = CO.negos.filter(n => inW(n.updated_at || n.created_at));
  const lec = CO.ecole.filter(e => e.fait && inW(e.date || e.created_at)), sc = lec.filter(e => e.score != null);
  const pub = coPosts().filter(p => p.status === 'publie' && inW(p.published_at || p.date)).length;
  const res = CO.journal.filter(j => j.kind === 'resultat' && inW(j.created_at));
  return { entrees, depenses, seances: sh.length, ca: sh.reduce((a, s) => a + (Number(s.price) || 0), 0), nc, etapes, echecs, negAcc: neg.filter(n => n.resultat === 'accepte').length, negRef: neg.filter(n => n.resultat === 'refuse').length, negN: neg.length,
    lecons: lec.length, moy: sc.length ? (sc.reduce((a, e) => a + Number(e.score), 0) / sc.length).toFixed(1) : null, pub, res };
}
function coBilanText(b){
  return `Semaine du ${coDate(new Date(Date.now() - 6 * coDayMs))} au ${coDate(new Date())}
Argent : ${coF(b.entrees)} entrés, ${coF(b.depenses)} sortis.
Séances : ${b.seances} (${coF(b.ca)}). Nouveaux clients : ${b.nc}.
Plans : ${b.etapes} étapes faites, ${b.echecs} pas réussies.
Négociations : ${b.negN} (${b.negAcc} acceptées, ${b.negRef} refusées).
École de la vente : ${b.lecons} leçon(s)${b.moy ? ', note moyenne ' + b.moy + '/10' : ''}.
Publications : ${b.pub}.${b.res.length ? '\nRésultats notés : ' + b.res.map(j => j.text).join(' ; ') : ''}`;
}
function coBilan(){
  const b = coBilanCalc(); CO.bilan = b;
  agSheet('coBil', `<h3>Bilan de la semaine</h3>
    <div class="ag-hint" style="margin-top:0">Du ${coDate(new Date(Date.now() - 6 * coDayMs), { day: 'numeric', month: 'long' })} au ${coDate(new Date(), { day: 'numeric', month: 'long' })}</div>
    <div class="co-kpis">
      <div><span>Entrées</span><b class="co-green">${coF(b.entrees)}</b></div><div><span>Dépenses</span><b>${coF(b.depenses)}</b></div>
      <div><span>Séances</span><b>${b.seances}</b></div><div><span>Nouveaux clients</span><b>${b.nc}</b></div>
      <div><span>Étapes faites</span><b>${b.etapes}</b></div><div><span>Négociations</span><b>${b.negAcc}/${b.negN}</b></div>
      <div><span>Leçons</span><b>${b.lecons}${b.moy ? ' · ' + b.moy + '/10' : ''}</b></div><div><span>Publications</span><b>${b.pub}</b></div>
    </div>
    ${b.res.length ? `<div class="co-sec-t">Tes résultats</div><div class="ag-list">${b.res.map(j => `<div class="crm-line col"><p>${coE(j.text)}</p></div>`).join('')}</div>` : ''}
    <div id="coBilAI" class="co-ai">${CO.bilanAI && CO.bilanAI.d === coToday() ? coMd(CO.bilanAI.t) : ''}</div>
    ${coHasAI() ? `<button class="btn-primary" id="coBilBtn" onclick="coBilanAI()">${CO.bilanAI && CO.bilanAI.d === coToday() ? 'Refaire les conseils' : 'Les conseils du coach pour la semaine prochaine'}</button>` : ''}
    <button class="btn-secondary" style="margin-top:8px" onclick="coCopy(coBilanText(CO.bilan)${CO.bilanAI ? "+'\\n\\n'+CO.bilanAI.t" : ''})">Copier le bilan</button>`);
}
async function coBilanAI(){
  const btn = document.getElementById('coBilBtn'), box = document.getElementById('coBilAI');
  if(btn){ btn.disabled = true; btn.textContent = 'Le coach lit ta semaine...'; }
  try {
    const t = await coAsk(`TÂCHE : bilan de la semaine du coach.\n${coBilanText(CO.bilan)}\nContexte :\n${coContexte()}\nCommence par une phrase qui résume la semaine (honnête et encourageante). Puis donne les 3 priorités de la semaine prochaine, très concrètes, avec les vrais noms et montants quand tu les connais. Termine par la leçon de vente à travailler. Court.`);
    CO.bilanAI = { d: coToday(), t };
    if(box) box.innerHTML = coMd(t);
  } catch(e){ coErr(e); }
  if(btn){ btn.disabled = false; btn.textContent = 'Refaire les conseils'; }
}

// ------------------------------------------------------------
// 12. NÉGOCIATION
// ------------------------------------------------------------
const CO_NSTEPS = [['demande', 'Demande'], ['analyse', 'Analyse'], ['messages', 'Messages'], ['simulation', "S'entraîner"], ['discussion', 'Vraie discussion'], ['resultat', 'Résultat']];
const CO_NRES = { en_cours: 'En cours', accepte: 'Accepté', refuse: 'Refusé', sans_reponse: 'Sans réponse' };
const coHasPx = () => typeof pxCols === 'function' && typeof CRM !== 'undefined';
function coPack(id){ return id && typeof CRM !== 'undefined' ? CRM.tarifs.find(t => t.id === Number(id)) || null : null; }
function coPxCol(id){ return id && typeof pxCol === 'function' ? pxCol(Number(id)) : null; }
function coGuessPack(txt){
  if(!coHasPx() || !txt) return null;
  const s = String(txt).toLowerCase();
  const f = (typeof pxFormules === 'function' ? pxFormules() : []).filter(t => t.active !== false && t.name);
  return f.find(t => s.includes(String(t.name).toLowerCase())) || null;
}
function coNegoNew(o){
  o = o || {};
  const c = o.client_id ? coClient(o.client_id) : null;
  let pack = o.pack_id ? coPack(o.pack_id) : coGuessPack(o.travail);
  CO.nego = { id: null, client_id: c ? c.id : null, client_nom: o.client_nom || (c ? c.name : ''), reservation_id: o.reservation_id ? Number(o.reservation_id) : null,
    travail: o.travail || '', budget: o.budget != null && o.budget !== '' ? Number(o.budget) : '', collection_id: o.collection_id || (pack ? pack.collection_id : null), pack_id: pack ? pack.id : null,
    prix_ref: o.prix ? Number(o.prix) : (pack ? Number(pack.price) : null), step: 'demande', ana: null, msgs: {}, sim: [], disc: [], resultat: 'en_cours', prix_final: '', raison: '', lecon: '' };
  return CO.nego;
}
window.coNegocier = async function(o){
  try { if(typeof PX !== 'undefined' && !PX.loaded && typeof pxLoad === 'function') await pxLoad(); } catch(e){}
  if(!CO.loaded) await coLoad();
  coNegoNew(o);
  coOpen('negocier');
};
function coNegoRefresh(){
  if(CO.negoEl && document.body.contains(CO.negoEl)) return coRenderNego(CO.negoEl);
  coRender();
}
function coNegoStats(){
  const closed = CO.negos.filter(n => n.resultat && n.resultat !== 'en_cours'), acc = closed.filter(n => n.resultat === 'accepte');
  const w = acc.filter(n => Number(n.budget_client) > 0 && Number(n.prix_final) > 0);
  const ecart = w.length ? Math.round(w.reduce((a, n) => a + (Number(n.prix_final) - Number(n.budget_client)) / Number(n.budget_client) * 100, 0) / w.length) : null;
  const w2 = acc.filter(n => Number(n.prix_conseille) > 0 && Number(n.prix_final) > 0);
  const vsConseil = w2.length ? Math.round(w2.reduce((a, n) => a + (Number(n.prix_final) - Number(n.prix_conseille)) / Number(n.prix_conseille) * 100, 0) / w2.length) : null;
  return { n: closed.length, acc: acc.length, taux: closed.length ? Math.round(acc.length / closed.length * 100) : 0, ecart, vsConseil, enCours: CO.negos.filter(n => n.resultat === 'en_cours').length };
}
function coRenderNego(el){
  CO.negoEl = el;
  if(!CO.loaded){ el.innerHTML = '<div class="ag-empty">Chargement...</div>'; coLoad().then(() => coRenderNego(el)); return; }
  if(!CO.nego) return coNegoHome(el);
  const n = CO.nego, can = !!n.ana;
  el.innerHTML = `
    <button class="co-back" onclick="CO.nego=null;coNegoRefresh()">${coI('chev', 15)} Toutes les négociations</button>
    <div class="co-nhead"><div class="crm-av">${coE(String(n.client_nom || '?').slice(0, 2).toUpperCase())}</div><div><b>${coE(n.client_nom || 'Nouveau client')}</b><span>${coE(String(n.travail || 'Travail à décrire').slice(0, 70))}${n.budget ? ' · budget ' + coF(n.budget) : ''}</span></div>
      ${n.resultat !== 'en_cours' ? `<i class="co-st st-${n.resultat}">${CO_NRES[n.resultat]}</i>` : ''}</div>
    <div class="co-tabs sm co-stepper">${CO_NSTEPS.map(([k, l], i) => `<button class="${n.step === k ? 'on' : ''}" ${!can && i > 0 ? 'disabled' : ''} onclick="CO.nego.step='${k}';coNegoRefresh()">${i + 1}. ${l}</button>`).join('')}</div>
    <div id="coNegoStep"></div>`;
  const s = document.getElementById('coNegoStep'), st = can ? n.step : 'demande';
  if(st === 'analyse') coNegoAnaView(s); else if(st === 'messages') coNegoMsgView(s); else if(st === 'simulation') coNegoSimView(s);
  else if(st === 'discussion') coNegoDiscView(s); else if(st === 'resultat') coNegoResView(s); else coNegoForm(s);
  const t = el.querySelector('.co-stepper button.on'); if(t && t.scrollIntoView) t.scrollIntoView({ block: 'nearest', inline: 'center' });
}
function coNegoHome(el){
  const st = coNegoStats(), list = coSort(CO.negos), ec = list.filter(n => n.resultat === 'en_cours'), fin = list.filter(n => n.resultat !== 'en_cours');
  const row = n => `<div class="crm-row" onclick="coNegoOpen(${n.id})"><div class="crm-av">${coE(String(n.client_nom || '?').slice(0, 2).toUpperCase())}</div>
    <div class="d"><b>${coE(n.client_nom || 'Client')}</b><span>${coE(String(n.travail || '').slice(0, 60))}</span><span>${coDate(n.created_at)}${n.budget_client ? ' · budget ' + coF(n.budget_client) : ''}</span></div>
    <div class="m">${n.prix_final ? coF(n.prix_final) : n.prix_conseille ? coF(n.prix_conseille) : ''}<span class="co-st st-${n.resultat}">${CO_NRES[n.resultat] || n.resultat}</span></div></div>`;
  el.innerHTML = `
    <div class="co-hero sm"><div class="lbl">Négocier sans perdre d'argent</div><div class="ttl">${st.n ? st.taux + ' %' : '-'} <small>acceptées</small></div>
      <div class="split"><div>Terminées<b>${st.n}</b></div><div>Écart budget / prix final<b>${st.ecart == null ? '-' : (st.ecart > 0 ? '+' : '') + st.ecart + ' %'}</b></div><div>En cours<b>${st.enCours}</b></div></div></div>
    <button class="btn-primary co-help" onclick="coNegoNew();coNegoRefresh()">${coI('plus', 16)} Nouvelle négociation</button>
    <div class="ag-hint" style="margin:-4px 2px 14px">Un client propose un budget ? Décris le travail : le coach compare avec tes tarifs et ta marge, te dit si c'est bon, et prépare tes réponses WhatsApp.</div>
    ${st.vsConseil != null ? `<div class="crm-fete" style="cursor:default"><div class="ic">${coI('target')}</div><div class="d"><b>Tes prix finaux sont en moyenne ${st.vsConseil >= 0 ? st.vsConseil + ' % au-dessus' : -st.vsConseil + ' % en dessous'} du prix conseillé</b><span>${st.acc} négociation${st.acc > 1 ? 's' : ''} acceptée${st.acc > 1 ? 's' : ''}</span></div></div>` : ''}
    ${ec.length ? `<div class="co-sech"><h3>En cours</h3><span>${ec.length}</span></div><div class="ag-list">${ec.map(row).join('')}</div>` : ''}
    <div class="co-sech"><h3>Historique</h3>${fin.length ? `<span>${fin.length}</span>` : ''}</div>
    ${fin.length ? `<div class="ag-list">${fin.map(row).join('')}</div>` : '<div class="ag-empty">Aucune négociation terminée pour le moment.</div>'}`;
}
function coNegoOpen(id, step){
  const r = CO.negos.find(x => x.id === id); if(!r) return;
  let a = {}; try { a = r.analyse_ia ? JSON.parse(r.analyse_ia) : {}; } catch(e){ a = { explication: r.analyse_ia }; }
  CO.nego = { id: r.id, client_id: r.client_id, client_nom: r.client_nom || '', reservation_id: r.reservation_id, travail: r.travail || '', budget: r.budget_client != null ? Number(r.budget_client) : '',
    collection_id: r.collection_id, pack_id: a.pack_id || null, prix_ref: a.ref || null, step: step || (r.resultat !== 'en_cours' ? 'resultat' : (a.step || 'analyse')), ana: a.verdict ? a : null,
    msgs: a.msgs || {}, sim: Array.isArray(r.simulation) ? r.simulation : [], disc: Array.isArray(r.messages) ? r.messages : [], resultat: r.resultat || 'en_cours', prix_final: r.prix_final || '', raison: r.raison || '', lecon: a.lecon || '' };
  if(!CO.nego.ana) CO.nego.step = 'demande';
  const pg = document.querySelector('.page.active');
  if(CO.negoEl && document.body.contains(CO.negoEl) && pg && pg.contains(CO.negoEl)) coRenderNego(CO.negoEl); else coOpen('negocier');
}
// ---------- 1. Demande ----------
function coNegoForm(s){
  const n = CO.nego, cols = coHasPx() ? pxCols().filter(c => c.actif !== false) : [];
  const col = coPxCol(n.collection_id), packs = col ? pxPacks(col.id).filter(t => t.active !== false) : [];
  const cl = (typeof clients !== 'undefined' ? clients : []).slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));
  s.innerHTML = `<div class="co-card co-form">
    <label>Client</label>
    <select id="coNCl" onchange="coNegoClient(this.value)"><option value="">Client pas encore enregistré</option>${cl.map(c => `<option value="${c.id}" ${n.client_id === c.id ? 'selected' : ''}>${coE(c.name)}</option>`).join('')}</select>
    ${n.client_id ? '' : `<input id="coNNom" placeholder="Nom du client" value="${coE(n.client_nom)}" oninput="CO.nego.client_nom=this.value">`}
    ${n.client_id ? coNegoClientInfo(n.client_id) : ''}
    ${cols.length ? `<label>Choisis dans tes tarifs (facultatif)</label>
      <div class="ag-pills">${cols.map(c => `<button class="${n.collection_id === c.id ? 'on' : ''}" onclick="coNegoCol(${c.id})">${coE(c.nom)}</button>`).join('')}</div>
      ${packs.length ? `<div class="ag-pills">${packs.map(t => `<button class="${n.pack_id === t.id ? 'on' : ''}" onclick="coNegoPack(${t.id})">${coE(t.name)}<small>${coF(t.price)}</small></button>`).join('')}</div>` : ''}` : ''}
    <label>Le travail demandé</label>
    <textarea id="coNTr" rows="3" placeholder="Ex : photos + vidéo de l'anniversaire de sa fille, samedi après-midi, 4 heures, avec 2 tirages" oninput="CO.nego.travail=this.value">${coE(n.travail)}</textarea>
    ${n.prix_ref ? `<div class="ag-hint">Ton prix normal pour ça : <b>${coF(n.prix_ref)}</b></div>` : ''}
    <label>Le budget proposé par le client (FCFA)</label>
    <input id="coNBu" type="number" inputmode="numeric" placeholder="Ex : 35000" value="${n.budget === '' ? '' : coE(n.budget)}" oninput="CO.nego.budget=this.value===''?'':Number(this.value)">
    <button class="btn-primary" style="margin-top:14px" onclick="coNegoAnalyse()" ${CO.busy ? 'disabled' : ''}>${coI('sparkles', 16)} Analyser ce budget</button>
  </div>`;
}
function coNegoClientInfo(id){
  const c = coClient(id); if(!c) return '';
  const L = [];
  try { const st = typeof crmStats === 'function' ? crmStats(c) : null; if(st) L.push(`${st.count} séance${st.count > 1 ? 's' : ''}${st.total ? ', ' + coF(st.total) + ' au total' : ''}`); } catch(e){}
  try { const du = typeof svDu === 'function' ? svDu(id) : null; if(du && du.total > 0) L.push(`<b class="co-red">te doit ${coF(du.total)}</b>`); } catch(e){}
  try { const im = typeof svLastImpression === 'function' ? svLastImpression(id) : null; if(im) L.push(im.humeur === 'negatif' ? '<b class="co-red">mauvaise expérience</b>' : im.humeur === 'positif' ? 'bonne expérience' : 'impression neutre'); } catch(e){}
  const old = CO.negos.filter(x => x.client_id === id && x.id !== CO.nego.id);
  if(old.length) L.push(`${old.length} négociation${old.length > 1 ? 's' : ''} avant (${old.filter(x => x.resultat === 'accepte').length} acceptée${old.filter(x => x.resultat === 'accepte').length > 1 ? 's' : ''})`);
  return L.length ? `<div class="ag-hint">${L.join(' · ')}</div>` : '';
}
function coNegoClient(v){ const n = CO.nego; n.client_id = v ? Number(v) : null; const c = coClient(v); if(c) n.client_nom = c.name; else if(!v) n.client_nom = ''; coNegoRefresh(); }
function coNegoCol(id){ const n = CO.nego; n.collection_id = n.collection_id === id ? null : id; n.pack_id = null; coNegoRefresh(); }
function coNegoPack(id){
  const n = CO.nego, t = coPack(id); if(!t) return;
  const prev = coPack(n.pack_id), col = coPxCol(t.collection_id);
  n.pack_id = t.id; n.collection_id = t.collection_id; n.prix_ref = Number(t.price);
  const auto = !n.travail || (prev && n.travail.startsWith((coPxCol(prev.collection_id) || {}).nom || '###'));
  if(auto) n.travail = `${col ? col.nom + ', ' : ''}pack ${t.name}${typeof pxDetLines === 'function' ? ' : ' + pxDetLines(t).filter(l => l.ok).map(l => l.t).join(', ') : ''}`;
  coNegoRefresh();
}
// ---------- 2. Analyse ----------
function coNegoCalc(n){
  const pack = coPack(n.pack_id) || coGuessPack(n.travail), col = coPxCol((pack && pack.collection_id) || n.collection_id);
  const ref = Number(n.prix_ref) || (pack ? Number(pack.price) : 0);
  const share = typeof pxShare === 'function' ? pxShare() : 0, cost = pack ? Number(pack.cost) || 0 : 0;
  let plancher = Math.round(cost + share), estime = false;
  if(!plancher && ref){ plancher = coR500(ref * 0.6); estime = true; }
  const budget = Number(n.budget) || 0;
  let verdict = 'inconnu';
  if(ref){ if(budget >= ref * 0.95) verdict = 'bon'; else if(budget >= Math.max(plancher, ref * 0.75)) verdict = 'acceptable'; else verdict = 'bas'; }
  else if(plancher){ verdict = budget >= plancher ? 'acceptable' : 'bas'; }
  let conseil = ref || coR500(budget * 1.2);
  if(verdict === 'acceptable' && ref) conseil = Math.max(plancher, coR500((ref + budget) / 2));
  if(verdict === 'bon') conseil = Math.max(ref, budget);
  const packs = col && typeof pxPacks === 'function' ? pxPacks(col.id).filter(t => t.active !== false).sort((a, b) => a.price - b.price) : [];
  const petit = packs.filter(t => Number(t.price) <= budget && (!pack || t.id !== pack.id)).pop() || null;
  const dessous = pack ? packs.filter(t => Number(t.price) < Number(pack.price)).pop() || null : null;
  const aj = [];
  const d = pack && pack.details && typeof pack.details === 'object' ? pack.details : {};
  if(petit) aj.push(`Le pack ${petit.name} à ${coF(petit.price)} rentre dans son budget`);
  else if(dessous) aj.push(`Proposer le pack ${dessous.name} à ${coF(dessous.price)}`);
  const nb = typeof pxPhotoN === 'function' && pack ? pxPhotoN(pack) : null;
  if(nb && nb > 4) aj.push(`Moins de photos : ${Math.max(2, Math.round(nb * 0.6))} au lieu de ${nb}`);
  if(d.video && d.video !== false) aj.push('Sans la vidéo');
  if(['tirages', 'album', 'cadre', 'photos_imprimees'].some(k => d[k] && d[k] !== false)) aj.push('Sans tirage ni album');
  if(d.heures) aj.push('Moins d\'heures de présence');
  if(/vid[ée]o/i.test(n.travail) && !aj.includes('Sans la vidéo')) aj.push('Sans la vidéo');
  if(/tirage|album|cadre/i.test(n.travail) && !aj.includes('Sans tirage ni album')) aj.push('Sans tirage ni album');
  aj.push('Un autre jour, en semaine (moins demandé)');
  aj.push('Paiement en 2 fois avec un acompte pour bloquer la date');
  const warn = [];
  if(n.client_id){
    try { const du = typeof svDu === 'function' ? svDu(n.client_id) : null; if(du && du.total > 0) warn.push(`Il te doit encore ${coF(du.total)} : demande ce paiement avant, ou un acompte plus grand.`); } catch(e){}
    try { const im = typeof svLastImpression === 'function' ? svLastImpression(n.client_id) : null; if(im && im.humeur === 'negatif') warn.push('Mauvaise expérience avec ce client : pose tes conditions par écrit et prends un acompte.'); } catch(e){}
  }
  if(estime) warn.push('Prix plancher estimé : renseigne tes chiffres et les coûts de tes packs dans Tarifs pour un calcul exact.');
  const titres = { bon: 'Bon budget', acceptable: 'Acceptable si...', bas: 'Trop bas', inconnu: 'À vérifier' };
  const expl = { bon: `Le budget du client est au niveau de ton prix${ref ? ' (' + coF(ref) + ')' : ''}. Tu peux accepter, et proposer un petit plus.`,
    acceptable: `Le budget est en dessous de ton prix normal${ref ? ' (' + coF(ref) + ')' : ''}, mais au-dessus de ton plancher. Accepte seulement si tu retires quelque chose, ou propose ${coF(conseil)}.`,
    bas: `Avec ${coF(budget)}, ${plancher && budget < plancher ? 'tu perds de l\'argent (plancher ' + coF(plancher) + ')' : 'c\'est trop loin de ton prix normal'}. Propose un pack plus petit ou refuse poliment.`,
    inconnu: 'Choisis un pack dans tes tarifs pour comparer avec ton prix normal.' };
  return { verdict, titre: titres[verdict], explication: expl[verdict], ref, prix_conseille: conseil, plancher, plancher_estime: estime, budget, ajustements: aj.slice(0, 6), alertes: warn, conseils: [],
    petit: petit ? { name: petit.name, price: Number(petit.price) } : dessous ? { name: dessous.name, price: Number(dessous.price) } : null, pack_id: pack ? pack.id : null, col: col ? col.nom : '', source: 'app' };
}
function coNegoTpl(n, a){
  const c = n.client_id ? coClient(n.client_id) : null, p = c ? coFirst(c) : String(n.client_nom || '').split(' ')[0];
  const sal = p ? `Bonjour ${p}` : 'Bonjour', trav = String(n.travail || 'votre séance').replace(/\s+/g, ' ').slice(0, 90);
  const acompte = coR500((a.prix_conseille || a.budget) * 0.3);
  const aj = (a.ajustements || []).find(x => /Sans|Moins/.test(x));
  return {
    accepter: `${sal}, merci pour votre confiance !\nC'est d'accord pour ${trav}, à ${coF(a.verdict === 'bon' ? Math.max(a.budget, a.prix_conseille) : a.prix_conseille)}.\nPour bloquer la date, l'acompte est de ${coF(acompte)} par Wave ou Orange Money. Je vous envoie tous les détails juste après.\nHenzo Studio`,
    contre1: `${sal}, merci pour votre message.\nPour ${coF(a.budget)}, je peux vous proposer ${a.petit ? 'le pack ' + a.petit.name + ' (' + coF(a.petit.price) + ')' : aj ? 'la même séance ' + aj.charAt(0).toLowerCase() + aj.slice(1) : 'une formule plus simple'}.\nSi vous voulez tout ce que vous avez demandé, c'est ${coF(a.ref || a.prix_conseille)}, et le résultat vaut vraiment le coup.\nDites-moi ce qui vous arrange.\nHenzo Studio`,
    contre2: `${sal}, j'ai bien noté votre budget.\nJe peux faire un effort à ${coF(a.prix_conseille)} si vous réservez cette semaine, avec un acompte de ${coF(acompte)}, et le reste le jour de la séance.\nC'est mon meilleur prix pour ce travail.\nHenzo Studio`,
    refuser: `${sal}, merci d'avoir pensé à Henzo Studio.\nAvec ${coF(a.budget)}, je ne peux pas faire ce travail avec la qualité que je garantis à mes clients.\nSi votre budget change, ou si vous voulez une formule plus simple${a.petit ? ' (à partir de ' + coF(a.petit.price) + ')' : ''}, je serai content de vous recevoir au studio, à Ahougnansou.\nBelle journée !`
  };
}
async function coNegoAnalyse(){
  const n = CO.nego; if(!n || CO.busy) return;
  const tr = document.getElementById('coNTr'); if(tr) n.travail = tr.value.trim();
  const bu = document.getElementById('coNBu'); if(bu) n.budget = bu.value === '' ? '' : Number(bu.value);
  const nm = document.getElementById('coNNom'); if(nm) n.client_nom = nm.value.trim();
  if(!n.travail) return coToast('Décris le travail demandé');
  if(!(Number(n.budget) > 0)) return coToast('Indique le budget proposé par le client');
  n.ana = coNegoCalc(n); n.msgs = {}; n.step = 'analyse';
  await coNegoSave();
  coNegoRefresh();
  if(coHasAI()) coNegoAI();
}
function coNegoPast(){
  const l = coSort(CO.negos).filter(x => x.id !== CO.nego.id && x.resultat !== 'en_cours').slice(0, 8);
  return l.length ? l.map(x => `- ${x.travail ? String(x.travail).slice(0, 60) : 'travail'} : budget ${coN(x.budget_client)} F, conseillé ${coN(x.prix_conseille)} F -> ${CO_NRES[x.resultat]}${x.prix_final ? ' à ' + coN(x.prix_final) + ' F' : ''}${x.raison ? ' (' + x.raison + ')' : ''}`).join('\n') : '(aucune)';
}
async function coNegoAI(){
  const n = CO.nego, a = n.ana; if(!n || !a) return;
  CO.busy = 'nego'; coNegoRefresh();
  const col = coPxCol(n.collection_id);
  try {
    const t = await coAsk(`TÂCHE : analyse de négociation. Un client propose un budget à Henzo.
Client : ${n.client_nom || 'nouveau client'}${n.client_id ? '. Historique : ' + coNegoClientInfo(n.client_id).replace(/<[^>]+>/g, '') : ''}
Travail demandé : ${n.travail}
Budget du client : ${coN(a.budget)} F
Calcul de l'app : prix normal ${a.ref ? coN(a.ref) + ' F' : 'inconnu'}, prix plancher ${coN(a.plancher)} F${a.plancher_estime ? ' (estimé)' : ' (coûts + part des charges fixes)'}, verdict "${a.titre}", prix conseillé ${coN(a.prix_conseille)} F.
Ajustements possibles : ${a.ajustements.join(' ; ')}
${a.alertes.length ? 'Alertes : ' + a.alertes.join(' ') : ''}
${col && typeof pxColBrief === 'function' ? 'Sa grille pour ce type de séance :\n' + pxColBrief(col) : ''}
Négociations passées :\n${coNegoPast()}
Ce que le coach a appris :\n${coMemoire(8)}
Règle d'or : ne pas baisser le prix pour le même travail, mais retirer quelque chose (moins de photos, sans vidéo, sans tirage, autre jour). Jamais en dessous du plancher.
Écris des messages WhatsApp polis, chaleureux et pros, style Côte d'Ivoire, vouvoiement, 3 à 6 lignes, signés "Henzo Studio".
Réponds UNIQUEMENT en JSON : {"verdict":"bon|acceptable|bas","titre":"Bon budget | Acceptable si... | Trop bas","explication":"2 ou 3 phrases simples","prix_conseille":nombre,"ajustements":["..."],"conseils":["2 ou 3 conseils de négociation pour ce client"],"messages":{"accepter":"...","contre1":"contre-proposition en retirant quelque chose","contre2":"contre-proposition avec un petit geste et un acompte","refuser":"refus poli qui garde la porte ouverte"}}`, { maxTokens: 2500 });
    const j = coJson(t);
    if(!j) throw new Error("L'IA n'a pas donné d'analyse lisible. Les messages de base sont prêts.");
    if(['bon', 'acceptable', 'bas'].includes(j.verdict)){ a.verdict = j.verdict; a.titre = coClean(j.titre || a.titre); }
    if(j.explication) a.explication = coClean(j.explication);
    const pc = Number(j.prix_conseille); if(pc > 0) a.prix_conseille = a.plancher_estime ? pc : Math.max(pc, a.plancher);
    if(Array.isArray(j.ajustements) && j.ajustements.length) a.ajustements = j.ajustements.map(coClean).slice(0, 6);
    if(Array.isArray(j.conseils)) a.conseils = j.conseils.map(coClean).slice(0, 4);
    if(j.messages && typeof j.messages === 'object'){ a.messages = {}; ['accepter', 'contre1', 'contre2', 'refuser'].forEach(k => { if(j.messages[k]) a.messages[k] = coClean(j.messages[k]); }); }
    a.source = 'ia';
    await coNegoSave();
  } catch(e){ coToast(coClean(e.message), 'error'); }
  CO.busy = ''; coNegoRefresh();
}
function coNegoAnaView(s){
  const n = CO.nego, a = n.ana;
  s.innerHTML = `
    <div class="co-verdict v-${a.verdict}"><small>Verdict</small><b>${coE(a.titre)}</b><p>${coE(a.explication)}</p></div>
    <div class="co-prices">
      <div><span>Budget client</span><b>${coF(a.budget)}</b></div>
      <div class="main"><span>Prix conseillé</span><b>${coF(a.prix_conseille)}</b></div>
      <div><span>Plancher${a.plancher_estime ? ' (estimé)' : ''}</span><b class="co-red">${coF(a.plancher)}</b></div>
    </div>
    <div class="ag-hint" style="margin:-4px 2px 12px">En dessous du plancher, tu perds de l'argent.${a.ref ? ' Ton prix normal : ' + coF(a.ref) + '.' : ''}</div>
    ${CO.busy === 'nego' ? '<div class="co-think">Le coach affine l\'analyse et écrit tes messages...</div>' : ''}
    ${(a.alertes || []).length ? `<div class="co-card co-sev-warn">${a.alertes.map(x => `<p>${coI('info', 14)} ${coE(x)}</p>`).join('')}</div>` : ''}
    <div class="co-sec-t">Ajustements possibles (retirer plutôt que réduire)</div>
    <ul class="co-ret">${a.ajustements.map(x => `<li>${coI('check', 13)}<span>${coE(x)}</span></li>`).join('')}</ul>
    ${(a.conseils || []).length ? `<div class="co-sec-t">Conseils du coach</div><ul class="co-ret">${a.conseils.map(x => `<li>${coI('sparkles', 13)}<span>${coE(x)}</span></li>`).join('')}</ul>` : ''}
    <div class="co-btns col" style="margin-top:12px">
      <button class="main" onclick="CO.nego.step='messages';coNegoSave();coNegoRefresh()">${coI('chat', 15)} Voir les messages prêts</button>
      ${coHasAI() && CO.busy !== 'nego' ? `<button onclick="coNegoAI()">${coI('refresh', 15)} Refaire l'analyse avec l'IA</button>` : ''}
      <button onclick="CO.nego.step='demande';coNegoRefresh()">${coI('edit', 15)} Modifier la demande</button>
    </div>`;
}
// ---------- 3. Messages ----------
function coNegoMsg(k){ const n = CO.nego; return n.msgs[k] || (n.ana.messages && n.ana.messages[k]) || coNegoTpl(n, n.ana)[k]; }
function coNegoMsgView(s){
  const L = [['accepter', 'Accepter', 'good'], ['contre1', 'Contre-proposer (retirer quelque chose)', ''], ['contre2', 'Contre-proposer (petit geste + acompte)', ''], ['refuser', 'Refuser poliment', 'bad']];
  s.innerHTML = `${CO.busy === 'nego' ? '<div class="co-think">Le coach écrit tes messages...</div>' : ''}
    ${L.map(([k, t, c]) => `<div class="co-card co-wa ${c}"><div class="co-wa-h">${t}</div>
      <textarea id="coM-${k}" rows="6" oninput="CO.nego.msgs['${k}']=this.value">${coE(coNegoMsg(k))}</textarea>
      <div class="co-btns sm"><button onclick="coCopy(document.getElementById('coM-${k}').value)">${coI('copy', 14)} Copier</button><button class="main wa" onclick="coNegoWa(document.getElementById('coM-${k}').value)">${coI('chat', 14)} Envoyer sur WhatsApp</button></div></div>`).join('')}
    <div class="co-btns col"><button onclick="CO.nego.step='simulation';coNegoSave();coNegoRefresh()">${coI('users', 15)} M'entraîner avant d'envoyer</button><button onclick="CO.nego.step='discussion';coNegoSave();coNegoRefresh()">${coI('chat', 15)} Le client a répondu</button></div>`;
}
function coNegoPhone(){
  const n = CO.nego;
  if(n.reservation_id && typeof OT !== 'undefined'){ const r = (OT.resas || []).find(x => x.id === n.reservation_id); if(r && typeof crmPhone === 'function') return crmPhone(r.telephone); }
  return '';
}
async function coNegoWa(text){
  const n = CO.nego; if(!text) return;
  let sent = false;
  if(n.client_id && typeof crmWa === 'function') sent = await crmWa(n.client_id, text, 'libre');
  else { window.open(`https://wa.me/${coNegoPhone()}?text=${encodeURIComponent(text)}`, '_blank'); sent = true; }
  if(sent){ n.disc.push({ role: 'henzo', text, at: new Date().toISOString() }); await coNegoSave(); }
}
// ---------- 4. Simulation ----------
function coChatHtml(list, kind){
  return `<div class="co-chat">${list.map((m, i) => {
    if(m.role === 'coach') return `<div class="co-msg coach">${coI('sparkles', 13)} ${coE(m.text)}${m.note != null ? ` <b>${m.note}/10</b>` : ''}</div>`;
    if(m.role === 'ia') return `<div class="co-msg ia"><small>Réponse conseillée</small>${coE(m.text).replace(/\n/g, '<br>')}${m.why ? `<em>${coE(m.why)}</em>` : ''}
      ${kind === 'disc' ? `<div class="co-btns sm"><button onclick="coCopy(CO.nego.disc[${i}].text)">${coI('copy', 13)} Copier</button><button class="main wa" onclick="coDiscSend(${i})">${coI('chat', 13)} Envoyer</button>${m.used ? '' : `<button onclick="coDiscUsed(${i})">Je l'ai envoyé</button>`}</div>` : ''}</div>`;
    return `<div class="co-msg ${m.role === 'henzo' ? 'henzo' : 'client'}"><small>${m.role === 'henzo' ? (kind === 'sim' ? 'Toi' : 'Henzo') : 'Client'}</small>${coE(m.text).replace(/\n/g, '<br>')}</div>`;
  }).join('')}</div>`;
}
function coNegoSimView(s){
  const n = CO.nego;
  if(!n.sim.length){
    const p = n.ana;
    n.sim = [{ role: 'client', text: `Bonjour, je voudrais ${String(n.travail || 'une séance').charAt(0).toLowerCase() + String(n.travail || 'une séance').slice(1, 120)}. Mon budget c'est ${coN(p.budget)} F. Vous pouvez faire ça ?` }];
  }
  s.innerHTML = `<div class="ag-hint" style="margin:0 2px 10px">Le coach joue le client. Réponds comme sur WhatsApp : il négocie, puis le coach te donne un conseil après chaque réponse.</div>
    ${coChatHtml(n.sim, 'sim')}
    ${CO.busy === 'sim' ? '<div class="co-think">Le client écrit...</div>' : ''}
    ${coHasAI() ? `<div class="co-reply"><textarea id="coSimIn" rows="3" placeholder="Ta réponse au client..."></textarea>
      <div class="co-btns"><button class="main" onclick="coSimSend()" ${CO.busy ? 'disabled' : ''}>${coI('chat', 15)} Envoyer</button><button onclick="CO.nego.sim=[];coNegoSave();coNegoRefresh()">Recommencer</button></div></div>`
      : `<div class="ag-hint warn">Connecte l'IA pour t'entraîner avec un client simulé.</div>`}`;
}
async function coSimSend(){
  const n = CO.nego, inp = document.getElementById('coSimIn'); if(!n || !inp || CO.busy) return;
  const t = inp.value.trim(); if(!t) return;
  n.sim.push({ role: 'henzo', text: t });
  CO.busy = 'sim'; coNegoRefresh();
  try {
    const r = await coAsk(`TÂCHE : simulation de négociation. Tu joues le client ET tu coaches Henzo.
Le client : ${n.client_nom || 'un client de Bouaké'}, veut : ${n.travail}. Budget annoncé : ${coN(n.ana.budget)} F (en vrai il peut monter jusqu'à environ ${coN(coR500(n.ana.budget * 1.15))} F s'il est convaincu).
Prix conseillé à Henzo : ${coN(n.ana.prix_conseille)} F, plancher ${coN(n.ana.plancher)} F. Ajustements possibles : ${n.ana.ajustements.join(' ; ')}.
Le client négocie de façon réaliste en Côte d'Ivoire (WhatsApp, "c'est cher deh", "fais un geste", "on va voir", la famille...). Il n'accepte pas trop vite, mais il est raisonnable si Henzo est bon.
Discussion :\n${n.sim.filter(m => m.role !== 'coach').map(m => (m.role === 'henzo' ? 'HENZO : ' : 'CLIENT : ') + m.text).join('\n')}
Réponds UNIQUEMENT en JSON : {"coach":"un conseil court sur la dernière réponse de Henzo","note":nombre sur 10,"client":"le prochain message du client (1 à 3 phrases)","fini":false}`, { maxTokens: 800 });
    const j = coJson(r) || { client: coClean(r) };
    if(j.coach) n.sim.push({ role: 'coach', text: coClean(j.coach), note: j.note != null ? Math.max(0, Math.min(10, Math.round(Number(j.note)))) : null });
    if(j.client) n.sim.push({ role: 'client', text: coClean(j.client) });
    await coNegoSave();
  } catch(e){ n.sim.pop(); coErr(e); }
  CO.busy = ''; coNegoRefresh();
}
// ---------- 5. Vraie discussion ----------
function coNegoDiscView(s){
  const n = CO.nego;
  s.innerHTML = `<div class="ag-hint" style="margin:0 2px 10px">Colle ici la vraie réponse du client. Le coach te propose la meilleure réponse. Tout est gardé.</div>
    ${n.disc.length ? coChatHtml(n.disc, 'disc') : '<div class="ag-empty">Pas encore de message.</div>'}
    ${CO.busy === 'disc' ? '<div class="co-think">Le coach réfléchit à la meilleure réponse...</div>' : ''}
    <div class="co-reply"><label>Message du client</label><textarea id="coDiscIn" rows="3" placeholder="Colle le message WhatsApp du client"></textarea>
      <div class="co-btns"><button class="main" onclick="coDiscAsk()" ${CO.busy ? 'disabled' : ''}>${coI('sparkles', 15)} ${coHasAI() ? 'Que répondre ?' : 'Ajouter'}</button></div>
      <details class="co-det"><summary>J'ai répondu autre chose</summary><textarea id="coDiscMe" rows="2" placeholder="Ce que tu as envoyé"></textarea><div class="co-btns sm"><button onclick="coDiscMine()">Ajouter ma réponse</button></div></details>
    </div>
    <button class="btn-secondary" style="margin-top:10px" onclick="CO.nego.step='resultat';coNegoSave();coNegoRefresh()">${coI('target', 15)} Noter le résultat</button>`;
}
async function coDiscAsk(){
  const n = CO.nego, inp = document.getElementById('coDiscIn'); if(!n || !inp || CO.busy) return;
  const t = inp.value.trim(); if(!t) return coToast('Colle le message du client');
  n.disc.push({ role: 'client', text: t, at: new Date().toISOString() });
  if(!coHasAI()){ await coNegoSave(); return coNegoRefresh(); }
  CO.busy = 'disc'; coNegoRefresh();
  try {
    const r = await coAsk(`TÂCHE : vraie négociation en cours, propose la meilleure réponse WhatsApp.
Client : ${n.client_nom || 'client'}. Travail : ${n.travail}. Budget du client : ${coN(n.ana.budget)} F. Prix conseillé : ${coN(n.ana.prix_conseille)} F. Plancher : ${coN(n.ana.plancher)} F (ne jamais descendre en dessous). Ajustements possibles : ${n.ana.ajustements.join(' ; ')}.
${n.client_id ? 'Historique du client : ' + coNegoClientInfo(n.client_id).replace(/<[^>]+>/g, '') : ''}
Ce que le coach a appris :\n${coMemoire(6)}
Discussion jusqu'ici :\n${n.disc.filter(m => m.role !== 'ia').map(m => (m.role === 'henzo' ? 'HENZO : ' : 'CLIENT : ') + m.text).join('\n')}
Règle : retirer plutôt que réduire, toujours poli, chaleureux et pro, vouvoiement, style Côte d'Ivoire, court (3 à 6 lignes), signé "Henzo Studio". Si le client accepte, demande l'acompte.
Réponds UNIQUEMENT en JSON : {"reponse":"le message à envoyer","pourquoi":"une phrase qui explique la stratégie"}`, { maxTokens: 900 });
    const j = coJson(r) || { reponse: coClean(r) };
    n.disc.push({ role: 'ia', text: coClean(j.reponse || ''), why: coClean(j.pourquoi || ''), at: new Date().toISOString() });
    await coNegoSave();
  } catch(e){ coErr(e); }
  CO.busy = ''; coNegoRefresh();
}
async function coDiscSend(i){ const m = CO.nego.disc[i]; if(!m) return; m.used = true; await coNegoWa(m.text); coNegoRefresh(); }
async function coDiscUsed(i){ const n = CO.nego, m = n.disc[i]; if(!m) return; m.used = true; n.disc.push({ role: 'henzo', text: m.text, at: new Date().toISOString() }); await coNegoSave(); coNegoRefresh(); }
async function coDiscMine(){ const n = CO.nego, t = (document.getElementById('coDiscMe') || {}).value || ''; if(!t.trim()) return; n.disc.push({ role: 'henzo', text: t.trim(), at: new Date().toISOString() }); await coNegoSave(); coNegoRefresh(); }
// ---------- 6. Résultat ----------
function coNegoResView(s){
  const n = CO.nego, r = n.resultat;
  s.innerHTML = `<div class="co-card co-form">
    <label>Comment ça s'est terminé ?</label>
    <div class="ag-pills">${Object.entries(CO_NRES).map(([k, l]) => `<button class="${r === k ? 'on' : ''}" onclick="CO.nego.resultat='${k}';coNegoRefresh()">${l}</button>`).join('')}</div>
    ${r === 'accepte' ? `<label>Prix final accepté (FCFA)</label><input id="coNPf" type="number" inputmode="numeric" value="${coE(n.prix_final || (n.ana ? n.ana.prix_conseille : ''))}" oninput="CO.nego.prix_final=this.value">` : ''}
    ${r === 'refuse' || r === 'sans_reponse' ? `<label>${r === 'refuse' ? 'Pourquoi il a refusé ?' : 'Une remarque ?'}</label>
      ${r === 'refuse' ? `<div class="ag-pills">${['Trop cher', 'A choisi un autre studio', 'N\'a plus besoin', 'Date pas libre'].map(t => `<button class="${n.raison === t ? 'on' : ''}" onclick="CO.nego.raison='${coE(t.replace(/'/g, "\\'"))}';coNegoRefresh()">${coE(t)}</button>`).join('')}</div>` : ''}
      <input id="coNRa" value="${coE(n.raison)}" placeholder="Ex : son mari trouve que c'est trop" oninput="CO.nego.raison=this.value">` : ''}
    <button class="btn-primary" style="margin-top:14px" onclick="coNegoResSave()">Enregistrer le résultat</button>
  </div>
  ${n.lecon ? `<div class="co-card co-sev-good"><div class="co-chip">${coI('sparkles', 13)} Ce que le coach retient</div><p>${coE(n.lecon)}</p></div>` : ''}
  ${n.id && CO.negos.find(x => x.id === n.id && x.resultat === 'accepte') ? `<div class="co-btns col"><button class="main" onclick="coNegoSeance()">${coI('camera', 15)} Créer la séance</button><button onclick="coNegoDevis()">${coI('note', 15)} Créer le devis</button></div>` : ''}
  ${n.id ? `<button class="btn-danger" style="margin-top:14px;width:100%;padding:12px" onclick="coNegoDel(${n.id})">Supprimer cette négociation</button>` : ''}`;
}
async function coNegoResSave(){
  const n = CO.nego; if(!n) return;
  const pf = document.getElementById('coNPf'); if(pf) n.prix_final = pf.value;
  const ra = document.getElementById('coNRa'); if(ra) n.raison = ra.value.trim();
  if(n.resultat === 'accepte' && !(Number(n.prix_final) > 0)) return coToast('Indique le prix final');
  const old = (CO.negos.find(x => x.id === n.id) || {}).resultat;
  await coNegoSave();
  if(n.resultat === 'en_cours'){ coToast('Négociation gardée en cours'); return coNegoRefresh(); }
  if(old !== n.resultat){
    const a = n.ana || {};
    const txt = n.resultat === 'accepte' ? `Négociation ${n.client_nom || ''} (${String(n.travail).slice(0, 60)}) : acceptée à ${coF(n.prix_final)} (budget ${coF(a.budget)}, conseillé ${coF(a.prix_conseille)})`
      : n.resultat === 'refuse' ? `Négociation ${n.client_nom || ''} (${String(n.travail).slice(0, 60)}) : refusée${n.raison ? ' - ' + n.raison : ''} (budget ${coF(a.budget)}, conseillé ${coF(a.prix_conseille)})`
      : `Négociation ${n.client_nom || ''} (${String(n.travail).slice(0, 60)}) : sans réponse (budget ${coF(a.budget)}, conseillé ${coF(a.prix_conseille)})`;
    try { const j = await coIns('coach_journal', { kind: n.resultat === 'refuse' ? 'echec' : 'resultat', text: coClean(txt), data: { nego_id: n.id, montant: n.resultat === 'accepte' ? Number(n.prix_final) : null, domaine: 'ventes' } }); CO.journal.unshift(j); } catch(e){ console.warn(e); }
    coToast(n.resultat === 'accepte' ? 'Bravo, c\'est signé !' : 'Résultat noté');
    coNegoRefresh();
    const id = n.id;
    const j = await coLearn(`${txt}.\nVerdict de l'app : ${a.titre}. Messages envoyés : ${n.disc.filter(m => m.role === 'henzo').map(m => m.text.slice(0, 150)).join(' / ') || 'non notés'}. Messages du client : ${n.disc.filter(m => m.role === 'client').map(m => m.text.slice(0, 150)).join(' / ') || 'non notés'}.`, { nego_id: id, domaine: 'ventes' });
    if(j && CO.nego && CO.nego.id === id){ CO.nego.lecon = j.text; await coNegoSave(); coNegoRefresh(); }
    return;
  }
  coToast('Enregistré'); coNegoRefresh();
}
async function coNegoSave(){
  const n = CO.nego; if(!n) return;
  const a = n.ana ? { ...n.ana, msgs: n.msgs, step: n.step, lecon: n.lecon || '', pack_id: n.pack_id || n.ana.pack_id || null, ref: n.ana.ref || n.prix_ref || null } : { step: n.step, pack_id: n.pack_id, ref: n.prix_ref };
  const row = { client_id: n.client_id || null, client_nom: n.client_nom || null, reservation_id: n.reservation_id || null, travail: n.travail || null, budget_client: Number(n.budget) || null,
    prix_conseille: n.ana ? Number(n.ana.prix_conseille) || null : null, collection_id: n.collection_id || null, analyse_ia: JSON.stringify(a), messages: n.disc, simulation: n.sim,
    resultat: n.resultat || 'en_cours', prix_final: Number(n.prix_final) || null, raison: n.raison || null };
  try {
    if(n.id){ const r = await coUpd('negociations', n.id, row); const o = CO.negos.find(x => x.id === n.id); if(o) Object.assign(o, row, r && r.id ? r : {}); }
    else { const r = await coIns('negociations', row); n.id = r.id; CO.negos.unshift(r); }
  } catch(e){ coErr(e); }
}
async function coNegoDel(id){
  if(!await agConfirm('Supprimer cette négociation ?')) return;
  try { await coDel('negociations', id); } catch(e){ return coErr(e); }
  CO.negos = CO.negos.filter(x => x.id !== id); CO.nego = null; coNegoRefresh();
}
function coNegoSeance(){
  const n = CO.nego; if(!n) return;
  const pf = Number(n.prix_final) || 0;
  if(n.reservation_id && typeof OT !== 'undefined' && typeof otOpenResa === 'function' && (OT.resas || []).some(r => r.id === n.reservation_id && r.status === 'nouvelle')){
    otOpenResa(n.reservation_id);
    setTimeout(() => { const p = document.getElementById('otResaPrix'); if(p) p.value = pf; }, 60);
    return;
  }
  if(typeof openShootModal !== 'function') return;
  openShootModal();
  try {
    const sel = document.getElementById('shootClient'); if(sel && n.client_id){ sel.value = String(n.client_id); if(typeof svShootAlert === 'function') svShootAlert(); }
    const col = coPxCol(n.collection_id), ty = document.getElementById('shootType'), cu = document.getElementById('shootCustomType');
    const name = col ? col.nom : '';
    if(ty){
      const fix = typeof TYPES_FIXES !== 'undefined' ? TYPES_FIXES : [];
      const m = fix.find(x => name && x.toLowerCase() === name.toLowerCase()) || (/mariage/i.test(name + n.travail) ? 'Mariage' : /\bdot\b/i.test(name + n.travail) ? 'Dot' : null);
      if(m){ ty.value = m; if(cu) cu.value = ''; } else if(name){ ty.value = 'Autre'; if(cu) cu.value = name; }
      if(typeof onShootTypeChange === 'function') onShootTypeChange();
    }
    const pr = document.getElementById('shootPrice'); if(pr) pr.value = pf || '';
    const no = document.getElementById('shootNotes'); if(no) no.value = coClean(`Négocié : ${n.travail}\nBudget du client ${coF(n.ana ? n.ana.budget : n.budget)}, prix final ${coF(pf)}`);
  } catch(e){ console.warn(e); }
}
function coNegoDevis(){
  const n = CO.nego; if(!n || typeof PX === 'undefined' || typeof pxNewQuote !== 'function') return coToast('Les devis ne sont pas encore chargés');
  pxNewQuote();
  const q = PX.q, pf = Number(n.prix_final) || 0, pack = coPack(n.pack_id || (n.ana && n.ana.pack_id));
  q.clientId = n.client_id || null; q.clientName = n.client_id ? '' : (n.client_nom || '');
  if(pack){
    q.col = pack.collection_id || 0; q.f[pack.id] = 1;
    if(pf && pf < Number(pack.price)){ q.disc = 'amount'; q.discVal = Number(pack.price) - pf; }
    else if(pf > Number(pack.price)) q.customs.push({ name: 'Ajouts demandés', price: pf - Number(pack.price), qty: 1 });
  } else q.customs.push({ name: String(n.travail || 'Prestation').slice(0, 80), price: pf, qty: 1 });
  q.note = coClean(`Prix convenu : ${coF(pf)}.`);
  PX.view = 'devis'; PX.col = null;
  coCloseSheets(); if(typeof agGoTab === 'function') agGoTab('tarifs'); else showTab('tarifs');
}

// ------------------------------------------------------------
// 13. STYLE
// ------------------------------------------------------------
(function coStyle(){
  if(document.getElementById('coStyle')) return;
  const st = document.createElement('style'); st.id = 'coStyle';
  st.textContent = `
#coBody{margin-bottom:10px}
.co-tabs{display:flex;gap:6px;overflow-x:auto;margin:0 -2px 14px;padding:2px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.co-tabs::-webkit-scrollbar{display:none}
.co-tabs button{flex:0 0 auto;width:auto;margin:0;padding:9px 14px;border-radius:999px;background:var(--card2);border:1px solid var(--border);color:var(--text-2);font:600 13px Inter,sans-serif;cursor:pointer;white-space:nowrap}
.co-tabs button.on{background:var(--pri-bg);color:var(--pri-fg);border-color:transparent}
.co-tabs button:disabled{opacity:.4;cursor:default}
.co-tabs button i{font-style:normal;display:inline-block;min-width:17px;padding:0 5px;margin-left:5px;border-radius:9px;background:var(--red);color:#fff;font-size:10.5px;line-height:17px}
.co-tabs.sm button{padding:7px 12px;font-size:12px}
.co-hero{position:relative;overflow:hidden;padding:18px 18px 16px;border-radius:22px;margin-bottom:14px;background:linear-gradient(160deg,var(--hero-1) 0%,var(--hero-2) 55%,var(--hero-3) 100%);border:1px solid var(--hero-border)}
.co-hero:after{content:"";position:absolute;right:-50px;top:-60px;width:170px;height:170px;border-radius:50%;background:radial-gradient(var(--glow),transparent 70%);opacity:.22;pointer-events:none}
.co-hero .lbl{font-size:11.5px;color:#fff;opacity:.8;letter-spacing:.06em;text-transform:uppercase}
.co-hero .ttl{font-size:25px;font-weight:800;color:#fff;margin:4px 0 12px;letter-spacing:-.3px}
.co-hero .ttl small{font-size:14px;font-weight:500;opacity:.75}
.co-hero.sm .ttl{font-size:23px}
.co-hero .split{display:flex;gap:16px;font-size:11.5px;color:#fff;opacity:.85}
.co-hero .split>div{flex:1;min-width:0}
.co-hero .split b{display:block;color:#fff;font-size:15px;margin-top:2px}
.co-sech{display:flex;justify-content:space-between;align-items:center;margin:16px 2px 9px}
.co-sech h3{margin:0;font-size:15.5px;font-weight:700;color:var(--text)}
.co-sech span{font-size:12px;color:var(--muted);font-weight:600}
.co-sech button{width:auto;background:none;border:none;color:var(--light);font:600 12.5px Inter,sans-serif;padding:4px;margin:0;cursor:pointer}
.co-card{background:var(--card);border:1px solid var(--border);border-radius:18px;padding:14px 15px;margin-bottom:12px;position:relative}
.co-card h4{margin:8px 0 4px;font-size:15.5px;line-height:1.3;color:var(--text)}
.co-card p{margin:4px 0;font-size:13.5px;line-height:1.5;color:var(--text-2)}
.co-card[class*="co-sev-"]{border-left:4px solid var(--accent)}
.co-sev-urgent{border-left-color:var(--red)!important}.co-sev-warn{border-left-color:var(--yellow)!important}.co-sev-info{border-left-color:var(--accent)!important}.co-sev-good{border-left-color:var(--green)!important}
.co-lesson-card{cursor:pointer;background:linear-gradient(150deg,var(--card) 40%,var(--card3))}
.co-soon p{display:flex;gap:8px;align-items:center}
.co-chip{display:inline-flex;align-items:center;gap:5px;font:600 11px Inter,sans-serif;color:var(--light);background:var(--card3);border-radius:20px;padding:4px 9px;letter-spacing:.02em}
.co-btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.co-btns button{width:auto;flex:1 1 auto;margin:0;padding:10px 12px;border-radius:12px;background:var(--card2);border:1px solid var(--border-2);color:var(--text);font:600 13px Inter,sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px}
.co-btns button.main{background:var(--pri-bg);color:var(--pri-fg);border-color:transparent}
.co-btns button.ok{color:var(--green);border-color:var(--green)}
.co-btns button.ko{color:var(--red);border-color:rgba(255,123,123,.45)}
.co-btns button.wa.main{background:#25d366;color:#fff}
.co-btns button:disabled{opacity:.5}
.co-btns.sm button{padding:7px 10px;font-size:12px;flex:0 1 auto}
.co-btns.col{flex-direction:column}.co-btns.col button{width:100%;padding:12px}
.co-help{width:100%;margin:0 0 12px;display:flex;align-items:center;justify-content:center;gap:8px}
.co-todo{display:flex;align-items:center;gap:10px;padding:12px 0;border-bottom:1px solid var(--border)}
.co-todo:last-child{border-bottom:none}
.co-todo .d{flex:1;min-width:0;cursor:pointer}
.co-todo .d b{display:block;font-size:13.5px;color:var(--text);line-height:1.35}
.co-todo .d span{display:block;font-size:11.5px;color:var(--muted);margin-top:2px}
.co-mini{display:flex;gap:6px;flex-shrink:0}
.co-mini button{width:34px;height:34px;margin:0;padding:0;border-radius:11px;background:var(--card2);border:1px solid var(--border-2);color:var(--text);display:grid;place-items:center;cursor:pointer;font:700 16px Inter,sans-serif}
.co-mini button.ok{color:var(--green);border-color:var(--green)}
.co-mini button.ko{color:var(--red)}
.co-mini button.ok:not(:has(svg)){width:auto;padding:0 12px;font-size:12.5px}
.co-chsum{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:12px 0;border-bottom:1px solid var(--border)}
.co-chsum div{min-width:0}.co-chsum span{display:block;font-size:10.5px;color:var(--muted)}.co-chsum b{font-size:13px;color:var(--text);white-space:nowrap}
.co-chsum .bad b{color:var(--red)}.co-chsum .good b{color:var(--green)}
.co-red{color:var(--red)!important}.co-green{color:var(--green)!important}
.co-prow{display:flex;align-items:center;gap:12px;padding:13px 0;border-bottom:1px solid var(--border);cursor:pointer}
.co-prow:last-child{border-bottom:none}
.co-prow .ic{width:40px;height:40px;border-radius:13px;background:var(--card3);display:grid;place-items:center;color:var(--light);flex-shrink:0}
.co-prow .d{flex:1;min-width:0}.co-prow .d b{display:block;font-size:14px;color:var(--text)}.co-prow .d span{display:block;font-size:11.5px;color:var(--muted);margin-top:2px}
.co-bar{height:6px;background:var(--card3);border-radius:6px;margin-top:8px;overflow:hidden}
.co-bar i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,var(--accent-dk),var(--accent),var(--light))}
.co-bar.big{height:8px;margin-top:12px}
.co-sub{font-size:12px;color:var(--muted);margin-top:6px}
.co-back{width:auto;margin:0 0 12px;padding:6px 2px;background:none;border:none;color:var(--light);font:600 13px Inter,sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:4px}
.co-back .ag-i{transform:rotate(180deg)}
.co-res{margin-top:10px;padding:9px 11px;border-radius:12px;background:rgba(111,224,199,.1);color:var(--green);font-size:13px;display:flex;gap:6px;align-items:flex-start}
.co-steps{margin:4px 0 12px}
.co-step{display:flex;gap:12px;padding:12px 2px;border-bottom:1px solid var(--border)}
.co-step:last-child{border-bottom:none}
.co-step>i{flex-shrink:0;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font:700 12.5px Inter,sans-serif;font-style:normal;background:var(--card3);color:var(--text-2);border:1px solid var(--border-2)}
.co-step>div{flex:1;min-width:0}
.co-step b{display:block;font-size:14px;color:var(--text);line-height:1.35}
.co-step span{display:block;font-size:12.5px;color:var(--muted);margin-top:3px;line-height:1.45}
.co-step em{display:block;font-style:normal;font-size:12.5px;color:var(--yellow);margin-top:5px}
.co-step em.ok{color:var(--green)}
.co-step small{display:block;font-size:11px;color:var(--muted);margin-top:4px}
.co-step.cur>i{background:var(--pri-bg);color:var(--pri-fg);border-color:transparent}
.co-step.st-fait>i{background:var(--green);color:#06221d;border-color:transparent}
.co-step.st-fait b{color:var(--text-2)}
.co-step.st-echec>i{background:rgba(255,123,123,.15);color:var(--red);border-color:rgba(255,123,123,.4)}
.co-steps.prev{background:var(--card2);border-radius:16px;padding:2px 12px;margin:12px 0}
.co-alt{margin-top:12px}.co-alt>p{font-size:13.5px;color:var(--text-2);line-height:1.5}
.co-think{margin:10px 0;padding:11px 13px;border-radius:12px;background:var(--card2);color:var(--muted);font-size:13px;display:flex;gap:8px;align-items:center}
.co-think:before{content:"";width:14px;height:14px;border-radius:50%;border:2px solid var(--accent);border-top-color:transparent;animation:coSpin .8s linear infinite;flex-shrink:0}
@keyframes coSpin{to{transform:rotate(360deg)}}
.co-det{margin:10px 0}.co-det summary{cursor:pointer;font:600 13px Inter,sans-serif;color:var(--light);padding:8px 2px}
.co-legacy{margin-top:18px}
.co-legacy>summary{cursor:pointer;display:flex;align-items:center;gap:8px;padding:13px 15px;border-radius:16px;background:var(--card);border:1px solid var(--border);font:600 13px Inter,sans-serif;color:var(--muted);list-style:none}
.co-legacy>summary::-webkit-details-marker{display:none}
.co-legacy[open]>summary{margin-bottom:12px}
.co-lrow{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--border);cursor:pointer}
.co-lrow:last-child{border-bottom:none}
.co-lrow>i{flex-shrink:0;width:28px;height:28px;border-radius:9px;display:grid;place-items:center;font:700 12px Inter,sans-serif;font-style:normal;background:var(--card3);color:var(--muted)}
.co-lrow.done>i{background:var(--green);color:#06221d}
.co-lrow .d{flex:1;min-width:0}.co-lrow .d b{display:block;font-size:13.5px;color:var(--text);line-height:1.3}.co-lrow .d span{font-size:11.5px;color:var(--muted)}
.co-lesson .co-h{margin:10px 0 8px;font-size:21px;line-height:1.25;color:var(--text);opacity:1;letter-spacing:-.2px;text-transform:none}
.co-lesson>p{font-size:14.5px;line-height:1.6;color:var(--text-2);margin:0 0 10px}
.co-sec-t{font:700 11.5px Inter,sans-serif;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);margin:18px 2px 8px}
.co-ret{list-style:none;margin:0 0 6px;padding:0}
.co-ret li{display:flex;gap:9px;align-items:flex-start;font-size:13.5px;line-height:1.45;color:var(--text);padding:6px 0}
.co-ret li .ag-i{flex-shrink:0;margin-top:2px;color:var(--green)}
.co-ret.warn li .ag-i{color:var(--yellow)}
.co-exo{background:var(--card2)}
.co-chat{display:flex;flex-direction:column;gap:8px;margin:8px 0 10px}
.co-msg{max-width:86%;padding:9px 12px 10px;border-radius:16px;font-size:13.5px;line-height:1.45;color:var(--text);background:var(--card2);border:1px solid var(--border);align-self:flex-start;border-bottom-left-radius:5px;overflow-wrap:anywhere}
.co-msg small{display:block;font:700 10.5px Inter,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin-bottom:3px}
.co-msg.henzo{align-self:flex-end;background:var(--pri-bg);color:var(--pri-fg);border-color:transparent;border-radius:16px;border-bottom-right-radius:5px}
.co-msg.henzo small{color:var(--pri-fg);opacity:.65}
.co-msg.solo{max-width:100%}
.co-msg.coach{align-self:stretch;max-width:100%;background:transparent;border:1px dashed var(--border-2);border-radius:12px;color:var(--text-2);font-size:12.5px}
.co-msg.coach .ag-i{vertical-align:-2px;color:var(--light)}
.co-msg.coach b{color:var(--light)}
.co-msg.ia{align-self:stretch;max-width:100%;background:var(--card);border:1px solid var(--accent);border-radius:14px}
.co-msg.ia small{color:var(--light)}
.co-msg.ia em{display:block;font-style:normal;font-size:12px;color:var(--muted);margin-top:6px}
.co-chat.ex .co-msg{font-size:13px}
.co-reply textarea{width:100%;margin:0}
.co-eval{background:var(--card);border:1px solid var(--border-2);border-radius:18px;padding:16px;margin-top:6px}
.co-eval>p{font-size:13.5px;color:var(--text-2);line-height:1.5}
.co-score{display:flex;align-items:baseline;gap:3px}
.co-score b{font-size:40px;font-weight:800;line-height:1}
.co-score span{font-size:16px;color:var(--muted)}
.co-score.good b{color:var(--green)}.co-score.mid b{color:var(--yellow)}.co-score.bad b{color:var(--red)}
.co-jrow{display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);cursor:pointer}
.co-jrow:last-child{border-bottom:none}
.co-jrow>i{flex-shrink:0;width:32px;height:32px;border-radius:10px;display:grid;place-items:center;background:var(--card3);color:var(--light);font-style:normal}
.co-jrow.k-resultat>i{color:var(--green)}.co-jrow.k-echec>i{color:var(--red)}.co-jrow.k-astuce>i{color:var(--yellow)}
.co-jrow .d{flex:1;min-width:0}.co-jrow .d span{font-size:11px;color:var(--muted);font-weight:600}.co-jrow .d p{margin:3px 0 0;font-size:13.5px;line-height:1.45;color:var(--text)}
.co-kpis{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}
.co-kpis div{background:var(--card2);border:1px solid var(--border);border-radius:14px;padding:10px 12px}
.co-kpis span{display:block;font-size:11px;color:var(--muted)}.co-kpis b{font-size:16px;color:var(--text)}
.co-ai{font-size:13.5px;line-height:1.55;color:var(--text-2);margin:10px 0}
.co-ai:empty{display:none}
.co-nhead{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.co-nhead>div:nth-child(2){flex:1;min-width:0}.co-nhead b{display:block;font-size:15px;color:var(--text)}.co-nhead span{display:block;font-size:12px;color:var(--muted);margin-top:2px}
.co-st{display:inline-block;font:700 10.5px Inter,sans-serif;font-style:normal;padding:3px 8px;border-radius:10px;background:var(--card3);color:var(--muted);margin-top:3px;white-space:nowrap}
.co-st.st-accepte{color:var(--green);background:rgba(111,224,199,.12)}.co-st.st-refuse{color:var(--red);background:rgba(255,123,123,.12)}.co-st.st-en_cours{color:var(--yellow);background:rgba(245,197,66,.12)}
.crm-row .m .co-st{display:block;text-align:center;margin-top:4px}
.co-form label{margin-top:12px}
.co-form label:first-child{margin-top:0}
.co-form select,.co-form input,.co-form textarea{margin-bottom:0}
.co-form .ag-pills{margin-top:6px}
.co-verdict{border-radius:20px;padding:16px 16px 14px;margin-bottom:12px;border:1px solid var(--border-2);background:var(--card)}
.co-verdict small{font:700 11px Inter,sans-serif;letter-spacing:.07em;text-transform:uppercase;color:var(--muted)}
.co-verdict b{display:block;font-size:24px;font-weight:800;margin:4px 0 6px}
.co-verdict p{margin:0;font-size:13.5px;line-height:1.5;color:var(--text-2)}
.co-verdict.v-bon{border-color:var(--green);background:linear-gradient(150deg,rgba(111,224,199,.14),var(--card) 70%)}.co-verdict.v-bon b{color:var(--green)}
.co-verdict.v-acceptable{border-color:var(--yellow);background:linear-gradient(150deg,rgba(245,197,66,.13),var(--card) 70%)}.co-verdict.v-acceptable b{color:var(--yellow)}
.co-verdict.v-bas{border-color:var(--red);background:linear-gradient(150deg,rgba(255,123,123,.13),var(--card) 70%)}.co-verdict.v-bas b{color:var(--red)}
.co-prices{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
.co-prices div{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:10px;text-align:center;min-width:0}
.co-prices span{display:block;font-size:10.5px;color:var(--muted);line-height:1.25}
.co-prices b{display:block;font-size:15px;color:var(--text);margin-top:4px;white-space:nowrap}
.co-prices .main{background:var(--pri-bg);border-color:transparent}.co-prices .main span,.co-prices .main b{color:var(--pri-fg)}
.co-wa .co-wa-h{font:700 13px Inter,sans-serif;color:var(--text);margin-bottom:8px}
.co-wa.good .co-wa-h{color:var(--green)}.co-wa.bad .co-wa-h{color:var(--red)}
.co-wa textarea{width:100%;margin:0;font-size:13.5px;line-height:1.45}
.co-stepper{margin-bottom:12px}
@media (min-width:900px){ .co-msg{max-width:70%} }
`;
  document.head.appendChild(st);
})();

// ------------------------------------------------------------
// 14. BRANCHEMENTS ET DÉMARRAGE
// ------------------------------------------------------------
(function coInit(){
  try { if(typeof AG_TAB_LABELS !== 'undefined') AG_TAB_LABELS.ia = 'Coach'; if(typeof AG_TITLES !== 'undefined') AG_TITLES.ia = 'Coach'; } catch(e){}
  const relabel = () => document.querySelectorAll('.ag-side-it[data-tab="ia"] .sl, .side-drawer .drawer-nav[data-tab="ia"] span:last-child').forEach(s => { if(s.textContent === 'IA') s.textContent = 'Coach'; });
  relabel(); setTimeout(relabel, 1500);
  const _st = showTab;
  showTab = function(name){
    const r = _st.apply(this, arguments);
    if(name === 'ia'){ const h = document.getElementById('headerTitle'); if(h) h.textContent = 'Coach'; coRender(); }
    return r;
  };
  if(typeof refreshAll === 'function'){
    const _ra = refreshAll; let tm = null;
    refreshAll = window.refreshAll = function(){
      const r = _ra.apply(this, arguments);
      clearTimeout(tm);
      tm = setTimeout(() => {
        const p = document.querySelector('.page.active'), a = document.activeElement;
        if(p && p.id === 'page-ia' && !document.querySelector('.ag-sheet') && !(a && a.closest && a.closest('#coBody') && /INPUT|TEXTAREA|SELECT/.test(a.tagName))) coRender();
      }, 400);
      return r;
    };
  }
  // Lien direct : ?tab=ia&co=aujourdhui | plans | charges | negocier | ecole | journal | bilan
  let deep = window.__coDeep || new URLSearchParams(location.search).get('co');
  const tryDeep = () => {
    deep = deep || window.__coDeep; if(!deep) return;
    if(!document.getElementById('page-ia') || document.body.classList.contains('logged-out') || typeof agGoTab !== 'function'){ setTimeout(tryDeep, 400); return; }
    const d = deep; deep = null; window.__coDeep = null;
    if(location.search.includes('co=')) history.replaceState(null, '', location.pathname);
    CO.tab = CO_TAB_ALIAS[d] || 'aujourdhui';
    agGoTab('ia');
    if(d === 'bilan') setTimeout(() => { if(CO.loaded) coBilan(); else coLoad().then(coBilan); }, 500);
  };
  setTimeout(tryDeep, 350); setTimeout(tryDeep, 1500);
  const p = document.querySelector('.page.active'); if(p && p.id === 'page-ia') coRender();
  setTimeout(() => { coLoad(); }, 1500);
})();
