// ============================================================
// CONFIG.JS — Réglages personnels + connexion Supabase
// ============================================================


// ---------- 1. CONNEXION SUPABASE ----------
// Ne touche pas sauf si tu changes de projet Supabase
const SUPABASE_URL = "https://lzxvktkryxizclkdetaa.supabase.co";
const SUPABASE_KEY = "sb_publishable_L4Udla2VCbZsNjdm9IRuJw_ExshPrPc";


// ---------- 2. DEVISE ----------
// "FCFA", "€", "$", "MAD"... ce que tu veux
const CURRENCY = "FCFA";


// ---------- 3. OBJECTIF D'ÉPARGNE ----------
// 0.20 = 20% des revenus à épargner
const SAVINGS_TARGET = 0.20;


// ---------- 4. CATÉGORIES ----------
const CATEGORIES = {
  depense: [
    "Nourriture",
    "Transport",
    "Logement",
    "Santé",
    "Éducation",
    "Loisirs",
    "Business",
    "Matériel photo",
    "Autre"
  ],
  revenu: [
    "Salaire",
    "Business",
    "Shooting photo",
    "Freelance",
    "Investissement",
    "Cadeau",
    "Autre"
  ]
};


// ---------- 5. MODÈLES IA ----------
const AI_MODELS = {
  openai:    "gpt-4o-mini",
  anthropic: "claude-sonnet-4-20250514",
  gemini:    "gemini-2.0-flash"
};


// ---------- 6. CITATIONS ----------
const QUOTES = [
  {q:"Le succès, c'est la somme de petits efforts répétés jour après jour.", a:"Robert Collier", e:"🌱"},
  {q:"Un objectif sans plan n'est qu'un souhait.", a:"Antoine de Saint-Exupéry", e:"🎯"},
  {q:"Le meilleur moment pour planter un arbre, c'était il y a 20 ans. Le second meilleur moment, c'est maintenant.", a:"Proverbe chinois", e:"🌳"},
  {q:"Tu n'es pas obligé d'être grand pour commencer, mais tu dois commencer pour devenir grand.", a:"Zig Ziglar", e:"🚀"},
  {q:"Chaque franc que tu épargnes aujourd'hui travaille pour ton toi de demain.", a:"Anonyme", e:"💰"},
  {q:"La discipline, c'est choisir entre ce que tu veux maintenant et ce que tu veux le plus.", a:"Abraham Lincoln", e:"🧭"},
  {q:"Ce n'est pas le montant que tu épargnes, c'est l'habitude que tu construis.", a:"Anonyme", e:"🔁"},
  {q:"Ton futur est créé par ce que tu fais aujourd'hui, pas demain.", a:"Robert Kiyosaki", e:"⏳"},
  {q:"La liberté financière commence par un premier pas que 90% des gens ne feront jamais.", a:"Anonyme", e:"🔓"},
  {q:"Investis dans ce qui te rapporte du temps, pas juste de l'argent.", a:"Naval Ravikant", e:"⚙️"},
  {q:"Un petit business qui tourne vaut mieux qu'un grand rêve qui dort.", a:"Anonyme", e:"🏗️"},
  {q:"Ce qui compte, ce n'est pas combien tu gagnes, mais combien tu gardes.", a:"Robert Kiyosaki", e:"🛡️"},
  {q:"La chance, c'est quand la préparation rencontre l'opportunité.", a:"Sénèque", e:"🍀"},
  {q:"Pense comme un propriétaire, pas comme un employé.", a:"Anonyme", e:"👑"}
];


// ---------- 7. IDÉES BUSINESS ----------
const LOCAL_IDEAS = [
  {t:"Vente de tirages photo", d:"Propose des tirages premium de tes meilleurs shoots.", tags:["Photo","Passif"]},
  {t:"Mini-sessions thématiques mensuelles", d:"1 journée/mois avec 6 créneaux à prix fixe.", tags:["Photo","Récurrent"]},
  {t:"Cours de photographie smartphone", d:"Forme des débutants à mieux shooter avec leur téléphone.", tags:["Formation"]},
  {t:"Retouche photo à la demande", d:"Service de retouche pour d'autres photographes.", tags:["Service"]},
  {t:"Shooting corporate pour PME", d:"Packs 'photos équipe + portraits pro' aux entreprises.", tags:["B2B","Premium"]},
  {t:"Calendriers / albums personnalisés", d:"Vends des albums photo aux clients après chaque événement.", tags:["Produit"]},
  {t:"Couverture d'événements", d:"Mariages, baptêmes, conférences. Facture plus cher.", tags:["Premium"]},
  {t:"Partenariat avec wedding planners", d:"Référencement mutuel.", tags:["Réseau","B2B"]},
  {t:"Contenu stock photo pour banques", d:"Vends tes photos sur Shutterstock, etc.", tags:["Passif"]},
  {t:"Formation en ligne (mini-cours)", d:"Enregistre un cours photo et vends-le en boucle.", tags:["Passif"]},
  {t:"Drone / vidéo événementielle", d:"Ajoute la vidéo aux prestations photo.", tags:["Premium"]},
  {t:"Location de matériel photo", d:"Loue ton matériel dormant à la journée.", tags:["Passif"]},
  {t:"Service 'photo CV / LinkedIn'", d:"Shootings express pour professionnels.", tags:["B2B","Rapide"]},
  {t:"Vente de presets / LUTs", d:"Vends tes filtres de retouche.", tags:["Passif"]},
  {t:"Box cadeau 'shooting offert'", d:"Vends des cartes cadeaux.", tags:["Produit","Cash"]}
];