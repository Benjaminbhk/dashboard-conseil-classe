/* Import du classeur « Suivi des élèves » (extract Pronote) vers le modèle de données de l'appli.
   Tout se passe dans le navigateur : le fichier n'est envoyé nulle part. */
window.App = window.App || {};

App.num = function (v) {
  if (v == null) return null;
  const n = parseFloat(String(v).trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

App.importXlsx = function (arrayBuffer, periode) {
  periode = periode || "Trimestre 1";
  const wb = XLSX.read(arrayBuffer, { type: "array" });
  const sheet = name => {
    const ws = wb.Sheets[name];
    if (!ws) return [];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });
    const hi = String(rows[0]?.[0] ?? "").startsWith("CONFIDENTIEL") ? 1 : 0;
    const h = rows[hi] || [];
    return rows.slice(hi + 1).filter(r => r.some(c => c != null && c !== ""))
      .map(r => Object.fromEntries(h.map((k, i) => [k, r[i] ?? null])));
  };
  const clean = v => { v = (v == null ? "" : String(v)).trim(); return ["-", "- %", "None"].includes(v) ? "" : v; };

  const presentKey = periode === "Trimestre 1" ? "present_t1" : "present_t2";
  const eleves = sheet("2A_eleves").filter(r => r[presentKey] === "oui")
    .sort((a, b) => (a.nom_brut + a.prenoms_bruts).localeCompare(b.nom_brut + b.prenoms_bruts, "fr"));
  if (!eleves.length) throw new Error("Aucun élève trouvé (onglet 2A_eleves manquant ou vide).");
  const ids = new Set(eleves.map(r => r.eleve_id_local));

  const notes2 = {};
  for (const r of sheet("2A_moyennes")) {
    if (r.periode_filename !== periode || !ids.has(r.eleve_id_local)) continue;
    const d = (notes2[r.eleve_id_local] ||= {});
    const v = App.num(r.moyenne_eleve_brute);
    if (!(r.matiere_brute in d) || (d[r.matiere_brute] == null && v != null)) d[r.matiere_brute] = v;
  }

  const notes3 = {};
  for (const r of sheet("H3_bull_moyennes")) {
    if (r.type_document !== "bulletin_notes" || r.type_ligne !== "matiere") continue;
    const d = (notes3[r.eleve_id_local] ||= {});
    if (r.matiere_ou_pole_brute in d) continue;
    const t = ["moyenne_t1_brute", "moyenne_t2_brute", "moyenne_t3_eleve_brute"].map(k => App.num(r[k])).filter(v => v != null);
    if (t.length) d[r.matiere_ou_pole_brute] = { annee: Math.round(t.reduce((a, b) => a + b, 0) / t.length * 100) / 100, t };
  }

  const by = (name, filter, key, val) => {
    const o = {};
    for (const r of sheet(name)) if (filter(r) && !(r[key] in o)) o[r[key]] = val(r);
    return o;
  };
  const globale3 = by("CONF_H3_appreciations", r => r.type_document === "bilan_periodique" && r.type_appreciation === "globale", "eleve_id_local", r => r.appreciation_brute);
  const appr3 = {};
  for (const r of sheet("CONF_H3_appreciations")) {
    if (r.type_document !== "bilan_periodique" || r.type_appreciation !== "matiere") continue;
    (appr3[r.eleve_id_local] ||= []).push({ m: r.matiere_ou_pole_brute, prof: r.enseignant_brut, txt: r.appreciation_brute });
  }
  const appr2 = {};
  for (const r of sheet("CONF_2A_appreciations")) {
    if (r.periode_imprimee !== periode || !r.appreciation_conseil_brute) continue;
    (appr2[r.eleve_id_local] ||= []).push({ m: r.matiere_service_brute, prof: r.enseignant_brut, txt: r.appreciation_conseil_brute });
  }
  const classe3 = by("H3_bull_entetes", () => true, "eleve_id_local", r => r.classe_3e_imprimee);
  const abs3 = by("H3_bull_mentions", r => r.type_document === "bilan_periodique" && r.type_mention === "absences_retards_imprime", "eleve_id_local", r => r.texte_brut);
  const abs2 = by("2A_absences", r => r.ligne_type === "eleve", "eleve_id_local", r => ({
    demi_journees: clean(r.total_demi_journees_brut), non_just: clean(r.demi_journees_non_justifiees_brut), just: clean(r.demi_journees_justifiees_brut),
    retards: clean(r.retards_nb_brut), du: r.periode_debut_brute || "", au: r.periode_fin_brute || "",
  }));

  const options = raw => {
    const out = [];
    for (let p of String(raw || "").split(/\s*,\s*/)) {
      p = p.trim();
      if (!p || p.includes("non désign") || p.startsWith("LVA ANGLAIS")) continue;
      p = p.replace("OPTION ", "").toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase()).replace("Lvb", "LVB").replace("Lvc", "LVC");
      if (!out.includes(p)) out.push(p);
    }
    return out;
  };

  return {
    meta: { classe: "Seconde A", periode, annee: "2026-2027", importe_le: new Date().toISOString() },
    eleves: eleves.map(r => {
      const id = r.eleve_id_local;
      return {
        id, nom: r.nom_brut, prenom: String(r.prenoms_bruts).split(/\s+/)[0],
        options: options(r.options_brutes),
        notes2: notes2[id] || {}, notes3: notes3[id] || {},
        classe3: classe3[id] || "", abs2: abs2[id] || null, abs3: abs3[id] || "",
        globale3: globale3[id] || "", appr3: appr3[id] || [], appr2: appr2[id] || [],
      };
    }),
  };
};

/* Fusionne un nouvel import avec les données existantes : les notes et appréciations
   viennent du nouvel import ; les synthèses, photos et corrections manuelles marquées sont conservées. */
App.fusionner = function (ancien, nouveau) {
  if (!ancien) return nouveau;
  const prev = Object.fromEntries((ancien.eleves || []).map(e => [e.id, e]));
  nouveau.eleves.forEach(e => {
    const p = prev[e.id];
    if (!p) return;
    if (p.syn) e.syn = p.syn;
    if (p.photo) e.photo = p.photo;
    if (p.manuel) { // corrections faites à la main, prioritaires sur l'import
      e.manuel = p.manuel;
    }
  });
  nouveau.meta.logo = ancien.meta?.logo || nouveau.meta.logo;
  return nouveau;
};
