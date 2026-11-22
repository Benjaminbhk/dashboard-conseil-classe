/* Mode présentation : écran classe + un écran par élève (1920×1080, mis à l'échelle). */
window.App = window.App || {};

(function () {
  const fr = v => v == null ? "—" : v.toFixed(1).replace(".", ",");
  const sg = d => (d > 0 ? "+" : d < 0 ? "−" : "±") + fr(Math.abs(d));
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  App.fr = fr; App.esc = esc;

  const point = (X, cy, v, r) => v == null ? "" : `<circle cx="${X(v)}" cy="${cy}" r="${r}" fill="var(--eleve)" stroke="#fff" stroke-width="2.5"/>`;

  /* Mots-clés : on cherche dans chaque appréciation les idées de App.THEMES (dérivés, synonymes).
     Une idée « positive » niée ou réclamée (« manque de sérieux », « doit participer davantage »)
     compte pour son pendant négatif. Chiffre = nombre d'appréciations qui l'évoquent. */
  const NEG_AVANT = /(manque|manquer|pas |pas d|peu |peu d|insuffis|doit|devra|devrait|faut|davantage|plus de |plus d'|plus |trop peu|aucun|absence de|moins |faible )[^.;!?]{0,25}$/;
  const NEG_APRES = /^[^.;!?]{0,25}(insuffisan|davantage|à améliorer|à renforcer|à développer|fait défaut|doit être)/;
  const GARDER = /(poursuiv|continu|mainten|garder|conserv|confirm)[^.;!?]{0,25}$/;
  App.themesTexte = function (texte) {
    const t = " " + String(texte || "").toLowerCase().replace(/[’]/g, "'") + " ";
    const trouves = new Map(); // libellé -> ton
    App.THEMES.forEach(([lib, ton, exprs, libNeg]) => {
      exprs.forEach(x => {
        let i = 0;
        while ((i = t.indexOf(x, i)) >= 0) {
          const avant = t[i - 1], debut = !/[a-zàâäçéèêëîïôöùûüœ]/.test(avant);
          if (debut) {
            const av = t.slice(Math.max(0, i - 40), i), ap = t.slice(i + x.length, i + x.length + 40);
            const nie = ton === "+" && !GARDER.test(av) && (NEG_AVANT.test(av) || NEG_APRES.test(ap));
            if (nie && libNeg) trouves.set(libNeg, "−");
            else if (!nie) trouves.set(lib, ton);
          }
          i += x.length;
        }
      });
    });
    return trouves;
  };
  App.themes = function (appr, avant) {
    const cpt = new Map();
    (appr || []).forEach(a => App.themesTexte(a.txt).forEach((ton, lib) => {
      const o = cpt.get(lib) || { lib, ton, n: 0 }; o.n++; cpt.set(lib, o);
    }));
    const deja = new Set();
    (avant || []).forEach(txt => App.themesTexte(txt).forEach((ton, lib) => deja.add(lib)));
    return [...cpt.values()].map(o => ({ ...o, deja: deja.has(o.lib) })).sort((x, y) => y.n - x.n || x.lib.localeCompare(y.lib, "fr"));
  };
  function zoneMots(e) {
    const nA = (e.appr2 || []).length;
    if (!nA) return `<div class="attente">Apparaîtront quand les appréciations du trimestre seront saisies.</div>`;
    const th = App.themes(e.appr2, [...(e.appr3 || []).map(a => a.txt), e.globale3 || ""]);
    if (!th.length) return `<div class="attente">Aucune idée récurrente dans les ${nA} appréciation(s).</div>`;
    const max = th[0].n;
    const puce = x => `<span class="mc ${x.ton === "+" ? "pos" : "neg"}" style="font-size:${Math.round(26 + 18 * (x.n - 1) / Math.max(max - 1, 1))}px">${esc(x.lib)}<b>${x.n}</b>${x.deja ? `<i title="déjà présent dans les appréciations de 3e">3e</i>` : ""}</span>`;
    const pos = th.filter(x => x.ton === "+").slice(0, 7), neg = th.filter(x => x.ton !== "+").slice(0, 7);
    const deja = th.some(x => x.deja);
    return `${pos.length ? `<div class="mots">${pos.map(puce).join("")}</div>` : ""}${neg.length ? `<div class="mots">${neg.map(puce).join("")}</div>` : ""}
      <div class="mots-note">chiffre = nombre d'appréciations qui l'évoquent (sur ${nA})${deja ? ` · <i class="mc-3e">3e</i> déjà relevé dans les appréciations de 3e` : ""}</div>`;
  }

  /* Assiduité : nombre de demi-journées lu dans le texte (Pronote ou bulletin), rouge au-delà de 10 */
  const SEUIL_ABS = 10;
  const lireAbs = t => {
    t = String(t || "");
    if (/aucune absence/i.test(t)) return 0;
    const m = t.match(/(\d+(?:[,.]\d+)?)\s*demi-journ/i);
    return m ? parseFloat(m[1].replace(",", ".")) : null;
  };
  const lireRet = t => { t = String(t || ""); if (/aucun retard/i.test(t)) return 0; const m = t.match(/retards?\s*:\s*(\d+)/i) || t.match(/(\d+)\s*retards?/i); return m ? +m[1] : null; };
  function ligneAbs(lab, demi, nj, ret, brut) {
    if (demi == null && ret == null) return `<div class="abs-l"><span class="abs-lab">${lab}</span><span class="abs-det">${esc(brut || "—")}</span></div>`;
    const d = demi == null ? null : Math.round(demi), alerte = d != null && d > SEUIL_ABS;
    return `<div class="abs-l${alerte ? " alerte" : ""}"><span class="abs-lab">${lab}</span><span class="abs-n">${d == null ? "—" : d}</span><span class="abs-det">${d === 0 ? "aucune absence" : `demi-journée${d > 1 ? "s" : ""} d'absence`}${nj ? ` (${nj} non justifiée${nj > 1 ? "s" : ""})` : ""}${ret != null ? ` · ${ret} retard${ret > 1 ? "s" : ""}` : ""}</span></div>`;
  }
  function assiduite(e) {
    let l2;
    if (e.vie2) l2 = ligneAbs("2nde", lireAbs(e.vie2), null, lireRet(e.vie2), e.vie2);
    else if (e.abs2) { const a = e.abs2, n = x => x == null || x === "" ? 0 : parseFloat(String(x).replace(",", ".")) || 0; l2 = ligneAbs("2nde", n(a.demi_journees), n(a.non_just), n(a.retards)); }
    else l2 = ligneAbs("2nde", null, null, null, "pas de récapitulatif");
    const l3 = e.abs3 ? ligneAbs("3e (T3)", lireAbs(e.abs3), null, lireRet(e.abs3), e.abs3) : "";
    return l2 + l3;
  }

  function graphe(e) {
    const W = 1080, labW = 290, valW = 110, dW = 110, x0 = labW + 50, x1 = W - valW - dW - 30;
    const rows = [];
    e.poles.forEach(p => {
      rows.push({ kind: "pole", p: p.p, m: p.nom, v: p.v, v3: p.v3, mc: p.mc });
      e.lignes.filter(l => l.pole === p.p).forEach(l => rows.push({ kind: "mat", p: p.p, m: l.m, v: l.v, v3: l.v3, mc: l.mc }));
    });
    const n = rows.length, nP = e.poles.length;
    const avail = 690, gapPole = 14, top = 40;
    const hMat = Math.min(46, Math.floor((avail - top - gapPole * (nP - 1) - 12 * nP) / Math.max(n, 1)));
    const hPole = hMat + 12;
    const X = v => x0 + v / 20 * (x1 - x0);
    let y = top, body = "", first = true;
    const blocs = {};
    rows.forEach(r => {
      const isP = r.kind === "pole";
      if (isP) { if (!first) y += gapPole; first = false; }
      const h = isP ? hPole : hMat, cy = y + h / 2;
      (blocs[r.p] ||= { y0: y }).y1 = y + h;
      body += `<text x="${isP ? 24 : labW}" y="${cy + 9}" font-size="${isP ? 23 : 27}" font-weight="${isP ? 800 : 500}" fill="${isP ? `var(--${r.p}-k)` : "#2a2d33"}" text-anchor="${isP ? "start" : "end"}">${esc(isP ? r.m.toUpperCase() : r.m)}</text>`;
      if (r.mc != null) body += `<line x1="${X(r.mc)}" x2="${X(r.mc)}" y1="${cy - (isP ? 20 : 16)}" y2="${cy + (isP ? 20 : 16)}" stroke="var(--moy)" stroke-width="${isP ? 4 : 3}" stroke-linecap="round"><title>moyenne de la classe : ${fr(r.mc)}</title></line>`;
      body += point(X, cy, r.v, isP ? 14 : 12);
      body += `<text x="${W - dW - 14}" y="${cy + 11}" font-size="${isP ? 36 : 31}" font-weight="${isP ? 800 : 600}" fill="#16181d" text-anchor="end">${fr(r.v)}</text>`;
      if (r.v3 != null) {
        const d = r.v - r.v3, big = Math.abs(d) >= 1.5;
        body += `<text x="${W - 14}" y="${cy + 10}" font-size="${isP ? 27 : 25}" font-weight="${big ? 800 : 500}" fill="${big ? (d > 0 ? "var(--good)" : "var(--warn)") : "#6b717c"}" text-anchor="end">${sg(d)}</text>`;
      }
      y += h;
    });
    let bg = "";
    Object.entries(blocs).forEach(([p, b]) => bg += `<rect x="0" y="${b.y0}" width="${W}" height="${b.y1 - b.y0}" rx="14" fill="var(--${p})"/><rect x="0" y="${b.y0}" width="6" height="${b.y1 - b.y0}" rx="3" fill="var(--${p}-k)"/>`);
    let axis = "";
    for (let t = 0; t <= 20; t += 2) {
      axis += `<line x1="${X(t)}" x2="${X(t)}" y1="${top - 4}" y2="${y}" stroke="${t === 10 ? "#c9cdd3" : "#fff"}" stroke-width="${t === 10 ? 3 : 2}"/>`;
      axis += `<text x="${X(t)}" y="${top - 14}" font-size="20" fill="#9aa0aa" text-anchor="middle">${t}</text>`;
    }
    axis += `<text x="${W - dW - 14}" y="${top - 14}" font-size="19" fill="#9aa0aa" text-anchor="end">T1</text><text x="${W - 14}" y="${top - 14}" font-size="19" fill="#9aa0aa" text-anchor="end">vs fin 3e</text>`;
    return `<svg width="${W}" height="${y + 4}" viewBox="0 0 ${W} ${y + 4}">${bg}${axis}${body}</svg>`;
  }

  // un point de synthèse : texte + matière(s) entre parenthèses
  const item = x => typeof x === "string" ? `<li>${esc(x)}</li>`
    : `<li>${esc(x.txt)}${x.m ? ` <span style="color:var(--ink3)">(${esc(x.m)})</span>` : ""}</li>`;

  const logoHTML = meta => meta.logo ? `<img class="logo" src="${meta.logo}" alt="Logo du lycée">` : `<div class="logo-vide">logo<br>du lycée</div>`;
  const titre = meta => `${meta.classe} · ${meta.periode} · ${meta.annee}`;

  App.renderEleve = function (stage, M, e, pos) {
    const syn = e.syn || {}, meta = M.meta;
    const sous = [titre(meta), e.options.join(", "), e.classe3 ? `3e : ${e.classe3}` : ""].filter(Boolean).join("   ·   ");
    const forts = (syn.forts || []).map(item).join(""), vigil = (syn.vigilance || []).map(item).join("");
    const evo = e.gen3 != null ? `<div class="bloc"><div class="lab">fin de 3e</div><div class="v3">${fr(e.gen3)}</div></div><div class="fl">→</div>` : "";
    const nAppr2 = (e.appr2 || []).length;
    const synGen = syn.seconde || e.globale2 || "";
    const appr2 = (forts || vigil || synGen)
      ? `${synGen ? `<div class="quote" style="margin-bottom:8px">${esc(synGen)}</div>` : ""}${forts ? `<ul class="pts forts">${forts}</ul>` : ""}${vigil ? `<ul class="pts vigil">${vigil}</ul>` : ""}`
      : `<div class="attente">${nAppr2 ? `${nAppr2} appréciation(s) saisie(s), synthèse à faire.` : "Pas encore saisies dans Pronote."}</div>`;
    stage.innerHTML = `
    <header>
      <div class="ident">${logoHTML(meta)}${e.photo ? `<img class="photo" src="${e.photo}" alt="">` : ""}<div><div class="nom">${esc(e.prenom)} <small>${esc(e.nom)}</small></div><div class="sous">${esc(sous)}</div></div></div>
      <div class="kpi">${evo}<div class="bloc"><div class="lab">moyenne T1</div><div class="val">${fr(e.gen)}</div><div class="cl">classe : ${fr(M.classe.moy)}</div></div></div>
    </header>
    <main>
      <section class="gauche">
        <div class="legende">
          <span><svg width="30" height="30"><circle cx="15" cy="15" r="12" fill="var(--eleve)"/></svg>T1 de 2nde</span>
          <span><svg width="14" height="34"><line x1="7" x2="7" y1="3" y2="31" stroke="var(--moy)" stroke-width="4" stroke-linecap="round"/></svg>moyenne de la classe</span>
        </div>
        ${graphe(e)}
        ${e.sansNote.length ? `<div class="sansnote">Sans note ce trimestre : ${esc(e.sansNote.join(", "))}</div>` : ""}
      </section>
      <section class="droite">
        <div class="bloc-d"><h3>Mots-clés des appréciations</h3>${zoneMots(e)}</div>
        <div class="bloc-d" style="flex:1"><h3>Appréciations du 1er trimestre</h3>${appr2}</div>
        <div class="bloc-d"><h3>Assiduité</h3>${assiduite(e)}</div>
      </section>
    </main>
    <div class="nav">${pos}</div>`;
  };

  App.renderClasse = function (stage, M, pos) {
    const C = M.classe, meta = M.meta;
    const W = 1080, labW = 270, x0 = labW + 30, x1 = W - 200, X = v => x0 + v / 20 * (x1 - x0);
    const lignes = [{ m: "Moyenne générale", pole: "gen", classe: C.gen, moy: C.moy }, ...C.matieres];
    let y = 40, s = "", prev = null;
    lignes.forEach(l => {
      if (prev && l.pole !== prev) y += 12; prev = l.pole;
      const h = lignes.length > 14 ? 42 : 48, cy = y + h / 2;
      if (l.pole !== "gen") s += `<rect x="0" y="${y}" width="${W}" height="${h}" fill="var(--${l.pole})"/>`;
      s += `<text x="${labW}" y="${cy + 9}" font-size="26" font-weight="${l.pole === "gen" ? 800 : 500}" text-anchor="end" fill="#2a2d33">${esc(l.m)}</text>`;
      l.classe.forEach(v => s += `<circle cx="${X(v)}" cy="${cy}" r="7" fill="#b7bdc7" opacity=".8"/>`);
      s += `<line x1="${X(l.moy)}" x2="${X(l.moy)}" y1="${cy - 17}" y2="${cy + 17}" stroke="var(--ink)" stroke-width="4" stroke-linecap="round"/>`;
      s += `<text x="${W - 90}" y="${cy + 10}" font-size="30" font-weight="700" text-anchor="end">${fr(l.moy)}</text><text x="${W - 10}" y="${cy + 9}" font-size="21" fill="#6b717c" text-anchor="end">${l.classe.length} él.</text>`;
      y += h;
    });
    let ax = `<line x1="${X(10)}" x2="${X(10)}" y1="34" y2="${y}" stroke="#c9cdd3" stroke-width="3"/>`;
    for (let t = 0; t <= 20; t += 2) ax += `<text x="${X(t)}" y="26" font-size="20" fill="#9aa0aa" text-anchor="middle">${t}</text>`;
    const poles = App.POLES.filter(p => C.poles[p.id] != null).map(p => `<div class="bloc-d"><h3 style="color:var(--${p.id}-k)">${esc(p.nom)}</h3><div style="font-size:64px;font-weight:800">${fr(C.poles[p.id])}</div></div>`).join("");
    const d = meta.importe_le ? new Date(meta.importe_le).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "";
    stage.innerHTML = `
    <header>
      <div class="ident">${logoHTML(meta)}<div><div class="nom">${esc(meta.classe)}</div><div class="sous">${esc(meta.periode)} · ${esc(meta.annee)} · ${M.eleves.filter(e => e.gen != null).length} élèves · vue d'ensemble</div></div></div>
      <div class="kpi"><div class="bloc"><div class="lab">moyenne de classe</div><div class="val">${fr(C.moy)}</div></div></div>
    </header>
    <main><section class="gauche">
      <div class="legende"><span><svg width="22" height="22"><circle cx="11" cy="11" r="7" fill="#b7bdc7"/></svg>un élève</span><span><svg width="14" height="34"><line x1="7" x2="7" y1="3" y2="31" stroke="var(--ink)" stroke-width="4" stroke-linecap="round"/></svg>moyenne de la classe</span></div>
      <svg width="${W}" height="${y + 4}">${ax}${s}</svg></section>
      <section class="droite">${poles}<div class="pied">Moyennes non pondérées${d ? ` · données importées le ${esc(d)}` : ""}</div></section></main>
    <div class="nav">${pos}</div>`;
  };
})();
