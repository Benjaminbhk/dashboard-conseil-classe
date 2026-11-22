/* Calculs dérivés : moyennes par pôle, moyennes de classe, profil sci/lit.
   Recalculé à chaque affichage, donc toute modification est prise en compte immédiatement. */
window.App = window.App || {};

App.mean = vals => {
  vals = vals.filter(v => v != null && Number.isFinite(v));
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 100) / 100 : null;
};

// notes de 2nde effectives (import + corrections manuelles)
App.notes2 = e => Object.assign({}, e.notes2, (e.manuel && e.manuel.notes2) || {});

App.profilNom = d => d == null ? "—" : d >= 1 ? "scientifique" : d <= -1 ? "littéraire" : "mixte";

App.calculer = function (data) {
  const els = data.eleves;
  const n2 = Object.fromEntries(els.map(e => [e.id, App.notes2(e)]));

  // répartition de la classe par matière
  const classe = {};
  els.forEach(e => Object.entries(n2[e.id]).forEach(([m, v]) => { if (v != null) (classe[m] ||= []).push(v); }));

  const poles2 = e => Object.fromEntries(App.POLES.map(p => [p.id,
    App.mean(Object.entries(n2[e.id]).filter(([m]) => App.matiere(m).pole === p.id).map(([, v]) => v))]));
  const poles3 = e => {
    const o = Object.fromEntries(App.POLES.map(p => [p.id,
      App.mean(Object.entries(e.notes3 || {}).filter(([m]) => App.POLE_3E[m] === p.id).map(([, x]) => x.annee))]));
    o.sec = null; // sections de 3e (SIA, LCE…) non comparables à celles de 2nde
    return o;
  };

  const gen = Object.fromEntries(els.map(e => [e.id, App.mean(Object.values(n2[e.id]))]));
  const pol2 = Object.fromEntries(els.map(e => [e.id, poles2(e)]));
  const polClasse = Object.fromEntries(App.POLES.map(p => [p.id, App.mean(els.map(e => pol2[e.id][p.id]))]));
  const genClasse = Object.values(gen).filter(v => v != null);
  const diff = p => (p.sci == null || p.lit == null) ? null : Math.round((p.sci - p.lit) * 100) / 100;

  const eleves = els.map(e => {
    const lignes = [], sansNote = [];
    Object.entries(n2[e.id]).forEach(([m, v]) => {
      const info = App.matiere(m);
      if (v == null) { sansNote.push(info.court); return; }
      const v3 = info.m3 ? (e.notes3?.[info.m3]?.annee ?? null) : null;
      lignes.push({ m: info.court, brut: m, v, v3, pole: info.pole || "sec", ordre: info.ordre, mc: App.mean(classe[m]) });
    });
    lignes.sort((a, b) => a.ordre - b.ordre);
    const p3 = poles3(e);
    const has3 = Object.keys(e.notes3 || {}).length > 0;
    return {
      ...e, lignes, sansNote, gen: gen[e.id],
      gen3: has3 ? App.mean(Object.values(e.notes3).map(x => x.annee)) : null,
      poles: App.POLES.filter(p => pol2[e.id][p.id] != null)
        .map(p => ({ p: p.id, nom: p.nom, v: pol2[e.id][p.id], v3: has3 ? p3[p.id] : null, mc: polClasse[p.id] })),
      profil: diff(pol2[e.id]), profil3: has3 ? diff(p3) : null,
    };
  });

  return {
    meta: data.meta, eleves,
    classe: {
      gen: genClasse.sort((a, b) => a - b), moy: App.mean(genClasse), poles: polClasse,
      matieres: Object.entries(classe).filter(([, v]) => v.length >= 3)
        .map(([m, v]) => ({ m: App.matiere(m).court, pole: App.matiere(m).pole || "sec", ordre: App.matiere(m).ordre, classe: v.slice().sort((a, b) => a - b), moy: App.mean(v) }))
        .sort((a, b) => a.ordre - b.ordre),
    },
  };
};
