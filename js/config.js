/* Configuration : pôles et correspondance des matières Pronote (2nde) avec la 3e.
   Modifier ici pour une autre classe ou d'autres libellés Pronote. */
window.App = window.App || {};

App.POLES = [
  { id: "sci", nom: "Pôle scientifique" },
  { id: "lit", nom: "Pôle littéraire" },
  { id: "lv",  nom: "Langues vivantes" },
  { id: "sec", nom: "Sections et options" },
];

// matière Pronote 2nde -> [libellé court, matière équivalente en 3e (ou null), pôle (null = hors pôle)]
App.MATIERES = [
  ["Mathématiques", "Maths", "Mathématiques", "sci"],
  ["Physique-Chimie", "Physique-chimie", "Physique-Chimie", "sci"],
  ["Sc.de la Vie et de la Terre", "SVT", "Sc.de la Vie et de la Terre", "sci"],
  ["SNT", "SNT", null, "sci"],
  ["Français", "Français", "Français", "lit"],
  ["Histoire-Géographie", "Histoire-géo", "HISTOIRE GEOGRAPHIE", "lit"],
  ["SES", "SES", null, "lit"],
  ["LVA ANGLAIS", "Anglais", "Anglais", "lv"],
  ["LVB ESPAGNOL", "Espagnol LVB", "Espagnol", "lv"],
  ["LVB MANDARIN", "Mandarin LVB", "Mandarin", "lv"],
  ["Allemand", "Allemand LVB", "Allemand", "lv"],
  ["LVC ESPAGNOL", "Espagnol LVC", "Espagnol", "lv"],
  ["LVC MANDARIN", "Mandarin LVC", "Mandarin", "lv"],
  ["EURO DNL HG", "Euro DNL HG", null, "sec"],
  ["LATIN", "Latin", "Latin", "sec"],
  ["Arts Plastiques", "Arts plastiques", "Arts Plastiques", "sec"],
  ["Brevet d'initiation aéronautique", "BIA", null, "sec"],
  ["EMC", "EMC", "EMC", null],
  ["Education Physique et Sportive", "EPS", "Education Physique et Sportive", null],
];

// pôles des matières de 3e (pour les moyennes de pôle de 3e)
App.POLE_3E = {
  "Mathématiques": "sci", "Physique-Chimie": "sci", "Sc.de la Vie et de la Terre": "sci", "Technologie": "sci",
  "Français": "lit", "HISTOIRE GEOGRAPHIE": "lit",
  "Anglais": "lv", "Espagnol": "lv", "Mandarin": "lv", "Allemand": "lv", "LVB RUSSE CNED": "lv",
};

App.matiere = function (m) {
  const r = App.MATIERES.find(x => x[0] === m);
  return r ? { court: r[1], m3: r[2], pole: r[3], ordre: App.MATIERES.indexOf(r) }
           : { court: m, m3: null, pole: "sec", ordre: 99 };
};

/* Mots-clés des appréciations, regroupés par idée (dérivés et synonymes).
   [libellé, ton (+ positif / − à surveiller), expressions reconnues, libellé si l'idée est niée ou réclamée]
   Ex. « manque de sérieux », « doit être plus sérieux » comptent pour « manque de sérieux ».
   Les expressions sont des débuts de mots (en minuscules) ; compléter la liste au besoin. */
App.THEMES = [
  ["sérieux", "+", ["sérieu", "appliqu", "consciencieu", "rigoureu", "rigueur", "soigneu", "soign"], "manque de sérieux"],
  ["investissement", "+", ["investi", "impliqu", "implication", "motiv", "volontaire", "engag", "dynamique", "enthousias", "volonté"], "investissement insuffisant"],
  ["participation", "+", ["particip", "intervient", "intervention", "s'exprime à l'oral", "prend la parole"], "participation insuffisante"],
  ["bons résultats", "+", ["excellent", "très bon", "très bien", "bons résultats", "bon niveau", "solide", "brillant", "satisfaisant", "réussi", "félicitation", "remarquable"], "résultats insuffisants"],
  ["progrès", "+", ["progrès", "progresse", "progression", "amélior", "en hausse"], "progrès attendus"],
  ["autonomie", "+", ["autonom"], "manque d'autonomie"],
  ["curiosité", "+", ["curieu", "curiosité", "intérêt", "intéressé", "pertinen"], "manque d'intérêt"],
  ["régularité", "+", ["régulier", "régulière", "régularité", "constant", "constance"], "irrégularité"],
  ["efforts", "+", ["effort"], "efforts insuffisants"],
  ["attention", "+", ["attentif", "attentive", "concentré", "à l'écoute"], "manque de concentration"],
  ["attitude positive", "+", ["agréable", "bienveillan", "respectueu", "exemplaire", "attitude positive", "bonne attitude", "bon état d'esprit"], "attitude à revoir"],
  ["bavardages", "−", ["bavard", "dissip", "agité", "agitation", "discute", "perturb", "turbulen", "bruyant"]],
  ["manque de concentration", "−", ["distrait", "inattenti", "déconcentr", "dispers", "manque de concentration", "rêveu"]],
  ["travail insuffisant", "−", ["insuffisan", "superficiel", "se contente", "économis", "minimum", "passif", "passivité", "approfondir", "travail personnel insuffisant", "apprendre ses leçons"]],
  ["irrégularité", "−", ["irrégul", "inégal", "dents de scie", "fluctu", "en baisse"]],
  ["difficultés", "−", ["difficult", "fragil", "lacune", "faible", "peine", "décevant", "inquiét", "préoccup", "alarmant"]],
  ["absences, retards", "−", ["absence", "absent", "retard"]],
  ["organisation, oublis", "−", ["oubli", "désorganis", "manque d'organisation", "manque de méthode", "sans son matériel", "pas son matériel"]],
  ["trop discret", "−", ["discret", "discrète", "réservé", "timide", "effacé"]],
  ["comportement", "−", ["insolen", "impertinen", "irrespect", "inadapté", "inacceptable", "familiarité", "désinvolt"]],
];
