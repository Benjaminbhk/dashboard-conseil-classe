/* Mode présentation : écran classe + un écran par élève (1920×1080, mis à l'échelle). */
window.App = window.App || {};

(function () {
  const fr = v => v == null ? "—" : v.toFixed(1).replace(".", ",");
  const sg = d => (d > 0 ? "+" : d < 0 ? "−" : "±") + fr(Math.abs(d));
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  App.fr = fr; App.esc = esc;

  /* 3e = disque bleu pastel marqué « 3 », en arrière-plan ; 2nde = point bleu soutenu, au premier plan */
  const rond3 = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--trois)"/>
    <text x="${x}" y="${y + r * 0.4}" font-size="${r * 1.1}" font-weight="800" fill="#fff" text-anchor="middle">3</text>`;
  function points(X, cy, v, v3, rDot, r3) {
    let s = "";
    if (v3 != null) s += rond3(X(v3), cy, r3);
    if (v != null) s += `<circle cx="${X(v)}" cy="${cy}" r="${rDot}" fill="var(--eleve)" stroke="#fff" stroke-width="2.5"/>`;
    return s;
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
      body += points(X, cy, r.v, r.v3, isP ? 14 : 11, isP ? 19 : 16);
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
    axis += `<text x="${W - dW - 14}" y="${top - 14}" font-size="19" fill="#9aa0aa" text-anchor="end">T1</text><text x="${W - 14}" y="${top - 14}" font-size="19" fill="#9aa0aa" text-anchor="end">vs 3e</text>`;
    return `<svg width="${W}" height="${y + 4}" viewBox="0 0 ${W} ${y + 4}">${bg}${axis}${body}</svg>`;
  }

  function jaugeProfil(e) {
    const W = 640, H = 82, x0 = 30, x1 = W - 30, R = 4, cy = 26;
    const X = d => x0 + (Math.max(-R, Math.min(R, d)) + R) / (2 * R) * (x1 - x0);
    let s = `<svg width="${W}" height="${H}">`;
    s += `<rect x="${X(-1)}" y="${cy - 18}" width="${X(1) - X(-1)}" height="36" rx="8" fill="#f1f2f4"/>`;
    s += `<line x1="${x0}" x2="${x1}" y1="${cy}" y2="${cy}" stroke="#cfd3d9" stroke-width="3"/>`;
    s += `<text x="${x0}" y="${cy + 46}" font-size="21" fill="var(--lit-k)" font-weight="700">◀ littéraire</text>`;
    s += `<text x="${(x0 + x1) / 2}" y="${cy + 46}" font-size="21" fill="#8a909b" text-anchor="middle">mixte</text>`;
    s += `<text x="${x1}" y="${cy + 46}" font-size="21" fill="var(--sci-k)" font-weight="700" text-anchor="end">scientifique ▶</text>`;
    s += points(X, cy, e.profil, e.profil3, 12, 17);
    return s + "</svg>";
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
    const a = e.abs2;
    const short = d => String(d || "").replace(/\/20\d\d/, "");
    const abs2txt = a ? `<b>${a.demi_journees || "0"}</b> demi-journée(s) d'absence${a.non_just ? ` dont ${a.non_just} non justifiée(s)` : ""}, <b>${a.retards || "0"}</b> retard(s) <span style="color:var(--ink3);font-size:20px">(du ${esc(short(a.du))} au ${esc(short(a.au))})</span>` : "pas de récapitulatif";
    let profilLine = "";
    if (e.profil != null) {
      const p1 = App.profilNom(e.profil), p0 = App.profilNom(e.profil3);
      profilLine = `<div class="profil-txt">Profil ${p1}${e.profil3 != null ? (p0 !== p1 ? ` <span>· ${p0} en 3e</span>` : ` <span>· déjà en 3e</span>`) : ""}</div>
        <div style="font-size:20px;color:var(--ink3)">écart sciences − lettres : ${sg(e.profil)} pt au T1${e.profil3 != null ? `, ${sg(e.profil3)} pt en 3e` : ""}</div>`;
    }
    const evo = e.gen3 != null ? `<div class="bloc"><div class="lab">fin de 3e</div><div class="v3">${fr(e.gen3)}</div></div><div class="fl">→</div>` : "";
    const nAppr2 = (e.appr2 || []).length;
    const synGen = syn.seconde || e.globale2 || "";
    const appr2 = (forts || vigil || synGen)
      ? `${synGen ? `<div class="quote" style="margin-bottom:8px">${esc(synGen)}</div>` : ""}${forts ? `<ul class="pts forts">${forts}</ul>` : ""}${vigil ? `<ul class="pts vigil">${vigil}</ul>` : ""}`
      : `<div class="attente">${nAppr2 ? `${nAppr2} appréciation(s) saisie(s), synthèse à faire.` : "Pas encore saisies dans Pronote."}</div>`;
    const bilan3 = syn.bilan3 || e.globale3;
    stage.innerHTML = `
    <header>
      <div class="ident">${logoHTML(meta)}${e.photo ? `<img class="photo" src="${e.photo}" alt="">` : ""}<div><div class="nom">${esc(e.prenom)} <small>${esc(e.nom)}</small></div><div class="sous">${esc(sous)}</div></div></div>
      <div class="kpi">${evo}<div class="bloc"><div class="lab">moyenne T1</div><div class="val">${fr(e.gen)}</div><div class="cl">classe : ${fr(M.classe.moy)}</div></div></div>
    </header>
    <main>
      <section class="gauche">
        <div class="legende">
          <span><svg width="36" height="36">${rond3(18, 18, 16)}</svg>fin de 3e</span>
          <span><svg width="30" height="30"><circle cx="15" cy="15" r="12" fill="var(--eleve)"/></svg>T1 de 2nde</span>
          <span><svg width="14" height="34"><line x1="7" x2="7" y1="3" y2="31" stroke="var(--moy)" stroke-width="4" stroke-linecap="round"/></svg>moyenne de la classe</span>
        </div>
        ${graphe(e)}
        ${e.sansNote.length ? `<div class="sansnote">Sans note ce trimestre : ${esc(e.sansNote.join(", "))}</div>` : ""}
      </section>
      <section class="droite">
        ${e.profil != null ? `<div class="bloc-d"><h3>Profil</h3>${jaugeProfil(e)}${profilLine}</div>` : ""}
        <div class="bloc-d" style="flex:1"><h3>Appréciations du 1er trimestre</h3>${appr2}</div>
        ${bilan3 ? `<div class="bloc-d"><h3>Bilan de fin de 3e</h3><div class="quote" style="color:var(--ink2)"><i>${esc(bilan3)}</i></div></div>` : ""}
        <div class="bloc-d"><h3>Assiduité</h3><div class="assid">2nde : ${e.vie2 ? esc(e.vie2) : abs2txt}<br>3e : ${esc(e.abs3 || "—")}</div></div>
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
