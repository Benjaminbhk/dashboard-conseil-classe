/* Contrôleur : mode admin (import, corrections, synthèses) et mode présentation. */
(function () {
  const $ = s => document.querySelector(s);
  const esc = App.esc, fr = App.fr;
  let DATA = null, M = null, sel = null, idx = 0;

  const toast = msg => { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 2600); };

  async function sauver() { await App.store.enregistrer(DATA); }
  function recalc() { M = DATA ? App.calculer(DATA) : null; }

  /* ---------- rendu admin ---------- */
  function renderAdmin() {
    recalc();
    $("#vide").hidden = !!DATA; $("#contenu").hidden = !DATA;
    if (!DATA) { $("#meta-titre").textContent = ""; return; }
    $("#meta-titre").textContent = `${DATA.meta.classe} · ${DATA.meta.periode} · ${DATA.meta.annee}`;
    renderTableau(); renderEditeur(); renderApercu();
  }

  function colonnes() {
    const set = new Set();
    DATA.eleves.forEach(e => Object.keys(App.notes2(e)).forEach(m => set.add(m)));
    return [...set].sort((a, b) => App.matiere(a).ordre - App.matiere(b).ordre);
  }

  function renderTableau() {
    const cols = colonnes();
    let h = `<thead><tr><th class="nomcol">Élève</th><th>Moy.</th>${cols.map(m => `<th title="${esc(m)}">${esc(App.matiere(m).court)}</th>`).join("")}</tr></thead><tbody>`;
    M.eleves.forEach(e => {
      const n2 = App.notes2(e), man = (e.manuel && e.manuel.notes2) || {};
      h += `<tr data-id="${esc(e.id)}" class="${e.id === sel ? "sel" : ""}"><td class="nm">${esc(e.nom)} ${esc(e.prenom)}</td><td class="moy">${fr(e.gen)}</td>`;
      cols.forEach(m => {
        const has = m in n2, v = n2[m];
        h += `<td class="${m in man ? "manuel" : ""}">${has || m in man ? `<input data-m="${esc(m)}" value="${v == null ? "" : String(v).replace(".", ",")}" inputmode="decimal">` : ""}</td>`;
      });
      h += `</tr>`;
    });
    $("#tableau").innerHTML = h + "</tbody>";
  }

  $("#tableau").addEventListener("click", ev => {
    const tr = ev.target.closest("tr[data-id]");
    if (tr && ev.target.closest("td.nm")) { sel = tr.dataset.id; renderAdmin(); }
  });
  $("#tableau").addEventListener("focusin", ev => {
    const tr = ev.target.closest("tr[data-id]");
    if (tr && tr.dataset.id !== sel) { sel = tr.dataset.id; document.querySelectorAll("#tableau tr.sel").forEach(r => r.classList.remove("sel")); tr.classList.add("sel"); renderEditeur(); renderApercu(); }
  });
  $("#tableau").addEventListener("change", async ev => {
    const inp = ev.target.closest("input[data-m]"); if (!inp) return;
    const e = DATA.eleves.find(x => x.id === inp.closest("tr").dataset.id);
    const raw = inp.value.trim(), v = raw === "" ? null : App.num(raw);
    if (raw !== "" && (v == null || v < 0 || v > 20)) { toast("Note invalide (0 à 20)"); inp.value = ""; return; }
    e.manuel = e.manuel || {}; e.manuel.notes2 = e.manuel.notes2 || {};
    if (e.notes2[inp.dataset.m] === v) delete e.manuel.notes2[inp.dataset.m];
    else e.manuel.notes2[inp.dataset.m] = v;
    await sauver(); recalc();
    inp.parentElement.classList.toggle("manuel", inp.dataset.m in e.manuel.notes2);
    const me = M.eleves.find(x => x.id === e.id);
    inp.closest("tr").querySelector(".moy").textContent = fr(me.gen);
    renderApercu(); toast("Moyenne mise à jour");
  });

  /* ---------- éditeur de synthèse ---------- */
  // « texte (matière) » <-> {txt, m}
  const versTexte = arr => (arr || []).map(x => typeof x === "string" ? x : x.txt + (x.m ? ` (${x.m})` : "")).join("\n");
  const depuisTexte = s => s.split("\n").map(l => l.trim()).filter(Boolean).map(l => {
    const m = l.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
    return m ? { txt: m[1], m: m[2] } : { txt: l };
  });

  function renderEditeur() {
    const ed = $("#editeur");
    const e = DATA.eleves.find(x => x.id === sel);
    if (!e) { ed.innerHTML = `<p style="color:#8a909b">Clique sur un nom pour voir l'aperçu de son écran et rédiger sa synthèse.</p>`; return; }
    const syn = e.syn || {};
    const appr = (list, titre) => list && list.length ? `<details><summary>${titre} (${list.length})</summary>${list.map(a => `<p><b>${esc(a.m || "Appréciation globale")}</b> — ${esc(a.txt)}</p>`).join("")}</details>` : "";
    ed.innerHTML = `
      <h3>${esc(e.prenom)} ${esc(e.nom)}</h3>
      <p style="font-size:13px;color:#6b717c;margin:4px 0 0">Synthèse des appréciations du bulletin du T1 : une ligne par point, la matière entre parenthèses à la fin.</p>
      <div class="ligne-btn"><button class="btn sec petit" id="b-prefill" ${(e.appr2 || []).length ? "" : "disabled"}>Pré-remplir avec la 1re phrase de chaque appréciation</button></div>
      <label>Points forts</label>
      <textarea data-k="forts" placeholder="Excellent niveau en sciences (maths, PC)">${esc(versTexte(syn.forts))}</textarea>
      <label>Points de vigilance</label>
      <textarea data-k="vigilance" placeholder="S'est économisé en cours d'année (français)">${esc(versTexte(syn.vigilance))}</textarea>
      <label>Phrase de synthèse générale <small>(facultatif, ex. appréciation du PP)</small></label>
      <textarea data-k="seconde">${esc(syn.seconde || "")}</textarea>
      <label>Bilan de fin de 3e <small>(vide = appréciation globale du bulletin)</small></label>
      <textarea data-k="bilan3" placeholder="${esc(e.globale3 || "")}">${esc(syn.bilan3 || "")}</textarea>
      <div class="ligne-btn">
        <label class="btn sec petit">Photo<input type="file" id="f-photo" accept="image/*" hidden></label>
        ${e.photo ? `<button class="btn sec petit" id="b-nophoto">Retirer la photo</button>` : ""}
        ${e.manuel && Object.keys(e.manuel.notes2 || {}).length ? `<button class="btn sec petit" id="b-reset">Annuler mes corrections de notes</button>` : ""}
        <button class="btn go petit" id="b-present-e">▶ Présenter à partir de cet élève</button>
      </div>
      ${appr(e.appr2, "Appréciations de 2nde saisies")}
      ${appr(e.appr3, "Appréciations de 3e (T3)")}
      ${e.globale3 ? `<details><summary>Appréciation globale de 3e</summary><p>${esc(e.globale3)}</p></details>` : ""}`;
    ed.querySelectorAll("textarea").forEach(t => t.addEventListener("input", async () => {
      e.syn = e.syn || {};
      const k = t.dataset.k;
      e.syn[k] = (k === "forts" || k === "vigilance") ? depuisTexte(t.value) : t.value.trim();
      await sauver(); recalc(); renderApercu();
    }));
    $("#b-prefill").onclick = async () => {
      const premiere = t => (String(t).match(/^.*?[.!?](\s|$)/) || [t])[0].trim();
      const lignes = (e.appr2 || []).map(a => `${premiere(a.txt)} (${App.matiere(a.m).court || a.m})`).join("\n");
      const ta = ed.querySelector('textarea[data-k="forts"]');
      ta.value = (ta.value ? ta.value + "\n" : "") + lignes; ta.dispatchEvent(new Event("input"));
      toast("À trier entre points forts et vigilance, et à raccourcir");
    };
    $("#f-photo").onchange = async ev => { const f = ev.target.files[0]; if (!f) return; e.photo = await imageEnDataURL(f, 400); await sauver(); renderAdmin(); };
    if ($("#b-nophoto")) $("#b-nophoto").onclick = async () => { delete e.photo; await sauver(); renderAdmin(); };
    if ($("#b-reset")) $("#b-reset").onclick = async () => { delete e.manuel; await sauver(); renderAdmin(); toast("Notes de l'import rétablies"); };
    $("#b-present-e").onclick = () => presenter(1 + M.eleves.filter(x => x.gen != null).findIndex(x => x.id === sel));
  }

  function renderApercu() {
    const ap = $("#apercu");
    if (!M) return;
    const i = M.eleves.findIndex(x => x.id === sel);
    if (i < 0) App.renderClasse(ap, M, "");
    else App.renderEleve(ap, M, M.eleves[i], "");
  }

  /* ---------- fichiers ---------- */
  function imageEnDataURL(file, maxPx) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => {
        if (!maxPx || file.type === "image/svg+xml") return res(r.result);
        const img = new Image();
        img.onload = () => {
          const k = Math.min(1, maxPx / Math.max(img.width, img.height));
          const c = document.createElement("canvas"); c.width = img.width * k; c.height = img.height * k;
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          res(c.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.88));
        };
        img.onerror = rej; img.src = r.result;
      };
      r.onerror = rej; r.readAsDataURL(file);
    });
  }

  async function importerXlsx(file) {
    try {
      const buf = await file.arrayBuffer();
      const nouveau = App.importXlsx(buf, DATA?.meta?.periode || "Trimestre 1");
      DATA = App.fusionner(DATA, nouveau);
      await sauver(); renderAdmin();
      toast(`${DATA.eleves.length} élèves importés`);
    } catch (err) { console.error(err); toast("Import impossible : " + err.message); }
  }

  async function importerJson(file) {
    try {
      const obj = JSON.parse(await file.text());
      if (obj.eleves && obj.meta) { DATA = obj; toast("Sauvegarde restaurée"); }
      else if (DATA) { // fichier de synthèses { id: {forts, vigilance, ...} }
        let n = 0;
        DATA.eleves.forEach(e => { if (obj[e.id]) { e.syn = Object.assign({}, e.syn, obj[e.id]); n++; } });
        toast(`${n} synthèse(s) importée(s)`);
      } else throw new Error("importe d'abord le classeur");
      await sauver(); renderAdmin();
    } catch (err) { toast("Fichier non reconnu : " + err.message); }
  }

  $("#f-xlsx").onchange = ev => { if (ev.target.files[0]) importerXlsx(ev.target.files[0]); ev.target.value = ""; };
  $("#f-json").onchange = ev => { if (ev.target.files[0]) importerJson(ev.target.files[0]); ev.target.value = ""; };
  $("#f-logo").onchange = async ev => {
    const f = ev.target.files[0]; if (!f || !DATA) return;
    DATA.meta.logo = await imageEnDataURL(f, 600); await sauver(); renderAdmin(); toast("Logo enregistré");
  };
  $("#b-export").onclick = () => {
    if (!DATA) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(DATA)], { type: "application/json" }));
    a.download = `conseil-${DATA.meta.classe.replace(/\s+/g, "")}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  // glisser-déposer n'importe où
  addEventListener("dragover", ev => { ev.preventDefault(); $("#admin").classList.add("survol"); });
  addEventListener("dragleave", ev => { if (!ev.relatedTarget) $("#admin").classList.remove("survol"); });
  addEventListener("drop", ev => {
    ev.preventDefault(); $("#admin").classList.remove("survol");
    for (const f of ev.dataTransfer.files) {
      if (/\.xlsx$/i.test(f.name)) importerXlsx(f);
      else if (/\.json$/i.test(f.name)) importerJson(f);
      else toast("Format non pris en charge : " + f.name);
    }
  });

  /* ---------- présentation ---------- */
  // les élèves sans aucune note sur la période (départ, arrivée tardive) ne sont pas présentés
  const slides = () => [{ type: "classe" }, ...M.eleves.filter(e => e.gen != null).map(e => ({ type: "eleve", e }))];
  function fit() { const s = Math.min(innerWidth / 1920, innerHeight / 1080); $("#stage").style.transform = `translate(-50%,-50%) scale(${s})`; }
  function show(i) {
    const S = slides(); idx = Math.max(0, Math.min(S.length - 1, i));
    const s = S[idx], pos = `${idx}/${S.length - 1} · ← → · L : liste · Échap : admin`;
    s.type === "classe" ? App.renderClasse($("#stage"), M, pos) : App.renderEleve($("#stage"), M, s.e, pos);
  }
  function presenter(i) {
    if (!DATA) return;
    recalc();
    $("#admin").hidden = true; $("#present").hidden = false;
    $("#liste div").innerHTML = slides().map((s, k) => `<button data-i="${k}">${s.type === "classe" ? "Vue classe" : esc(s.e.nom + " " + s.e.prenom)}</button>`).join("");
    fit(); show(i || 0);
    document.documentElement.requestFullscreen?.().catch(() => {});
  }
  function quitter() {
    $("#present").hidden = true; $("#admin").hidden = false;
    if (document.fullscreenElement) document.exitFullscreen?.();
    const s = slides()[idx]; if (s && s.e) sel = s.e.id;
    renderAdmin();
  }
  $("#b-present").onclick = () => presenter(0);
  $("#liste").onclick = ev => { const b = ev.target.closest("button"); if (b) { show(+b.dataset.i); $("#liste").classList.remove("on"); } };
  addEventListener("resize", fit);
  addEventListener("keydown", ev => {
    if ($("#present").hidden) return;
    const L = $("#liste");
    if (["ArrowRight", "PageDown", " "].includes(ev.key)) { ev.preventDefault(); show(idx + 1); }
    else if (["ArrowLeft", "PageUp"].includes(ev.key)) show(idx - 1);
    else if (ev.key === "Home") show(0);
    else if (ev.key.toLowerCase() === "l") L.classList.toggle("on");
    else if (ev.key === "Escape") { if (L.classList.contains("on")) L.classList.remove("on"); else quitter(); }
  });
  // si les données changent dans un autre onglet (admin ouvert à côté), la présentation suit
  addEventListener("focus", async () => { const d = await App.store.charger(); if (d && JSON.stringify(d) !== JSON.stringify(DATA)) { DATA = d; recalc(); $("#present").hidden ? renderAdmin() : show(idx); } });

  (async () => { DATA = await App.store.charger(); renderAdmin(); })();
})();
