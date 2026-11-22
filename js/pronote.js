/* Extraction depuis Pronote (Espace Professeurs → Bulletins → Bulletin).
   1) EXTRACTEUR : s'exécute DANS Pronote (favori « Extraire Pronote » ou console). Il parcourt tous les
      élèves de la classe affichée, lit moyennes et appréciations du bulletin (lecture seule : il ne clique
      que sur « élève suivant »), puis affiche le résultat à copier.
   2) App.importerPronote : dans l'appli, applique le texte collé aux données. */
window.App = window.App || {};

App.extracteurPronote = async function () {
  const SUBJ = new Set(["Education Physique et Sportive", "Français", "Mathématiques", "Histoire-Géographie", "EMC",
    "Physique-Chimie", "Sc.de la Vie et de la Terre", "SNT", "SES", "LVA ANGLAIS", "LVB ESPAGNOL", "LVB MANDARIN",
    "LVB ALLEMAND", "LVC ESPAGNOL", "LVC MANDARIN", "Allemand", "Arts Plastiques", "LATIN", "EURO DNL HG",
    "Brevet d'initiation aéronautique"]);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const combos = () => [...document.querySelectorAll('[role=combobox], .ocb_cont, input, .as-input')]
    .map(e => (e.innerText || e.value || "").trim()).filter(v => v && v !== "on");
  const nom = () => { const c = combos(); return c[c.length - 1]; };
  const suivant = () => [...document.querySelectorAll("button,[role=button]")].find(b => (b.getAttribute("aria-label") || "").includes("élève - Suivant"));
  const appuyer = b => { for (const t of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"])
    b.dispatchEvent(new (t.startsWith("pointer") ? PointerEvent : MouseEvent)(t, { bubbles: true, cancelable: true, view: window, button: 0 })); };
  const attendreChangement = async n => { for (let k = 0; k < 30; k++) { await sleep(300); if (nom() !== n) return true; } return false; };

  function lire(texte) {
    const t = texte;
    const a = t.indexOf("Moyenne la plus haute\nEducation"), b = t.indexOf("Bulletin de notes Trimestre"),
      c = t.indexOf("Vie scolaire"), d = t.indexOf("Appréciations\n- Barre", c);
    const L = t.slice(a > 0 ? a + 22 : 0, b > 0 ? b : undefined).split("\n").map(s => s.trim()).filter(Boolean);
    const notes = {}, appr = [];
    let i = 0;
    while (i < L.length) {
      const m = L[i]; if (!SUBJ.has(m)) { i++; continue; }
      const prof = L[i + 1]; i += 2;
      let nb = null; const nums = [], txt = [];
      while (i < L.length && !SUBJ.has(L[i])) {
        const s = L[i];
        if (/^\d+\/\d+$/.test(s)) nb = s; else if (/^(\d+,\d+|Abs|Disp|N\.Not|Inap)$/.test(s)) nums.push(s); else txt.push(s);
        i++;
      }
      const v = nb !== null && /\d/.test(nums[0] || "") ? nums[0] : null;
      if (!(m in notes) || notes[m] == null) notes[m] = v;
      if (txt.length) appr.push({ m, prof, txt: txt.join(" ") });
    }
    const vs = c >= 0 ? t.slice(c, d > 0 ? d : c + 800).split("\n").map(s => s.trim()).filter(Boolean) : [];
    const ig = vs.indexOf("Appréciation globale");
    return { notes, appr, vie: vs.slice(1, ig >= 0 ? Math.min(ig, 5) : 4).join(" · "), globale: ig >= 0 ? vs.slice(ig + 1).join(" ").trim() : "" };
  }

  // image du même site -> data URL (réduite), pour le logo et les photos
  // les photos hors écran ne sont pas encore chargées (image de remplacement) : on les charge depuis data-src
  const charger = img => new Promise(r => {
    const ds = img.dataset && img.dataset.src;
    setTimeout(() => r(null), 8000);
    if (ds && img.getAttribute("src") !== ds) { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = ds; }
    else if (img.complete && img.naturalWidth > 1) r(img);
    else { img.addEventListener("load", () => r(img)); img.addEventListener("error", () => r(null)); }
  });
  const enDataURL = async (img0, maxPx, type) => {
    const img = await charger(img0);
    if (!img || img.naturalWidth <= 1) return null;
    const k = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    try { return c.toDataURL(type || "image/jpeg", 0.85); } catch (e) { return null; }
  };
  const logoImg = document.querySelector('img[alt*="Logo"]');
  const logo = logoImg ? await enDataURL(logoImg, 600, "image/png") : null;
  function afficher(res, resume) {
    const json = JSON.stringify(res);
    const box = document.createElement("div");
    box.style.cssText = "position:fixed;inset:5%;z-index:99999;background:#fff;border:3px solid #1f4fd1;border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px;font:15px sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.4)";
    box.innerHTML = `<b></b><span>Copie ce texte (il est déjà sélectionné : Ctrl+C ou Cmd+C), puis colle-le dans l'appli avec « Coller depuis Pronote ».</span>
      <textarea style="flex:1;font:12px monospace" readonly></textarea><button style="padding:8px;font:inherit">Fermer</button>`;
    box.querySelector("b").textContent = resume;
    document.body.appendChild(box);
    const ta = box.querySelector("textarea"); ta.value = json; ta.focus(); ta.select();
    navigator.clipboard.writeText(json).then(() => { box.querySelector("span").textContent = "Copié dans le presse-papiers. Colle-le dans l'appli avec « Coller depuis Pronote »."; }, () => {});
    box.querySelector("button").onclick = () => box.remove();
  }

  // Page « Trombinoscope » : on récupère les photos de la classe affichée
  const portraits = [...document.querySelectorAll("img.img-portrait")];
  if (portraits.length) {
    const photos = {};
    for (const img of portraits) {
      const n = (img.alt || "").replace(/^Photo de\s*/i, "").trim();
      const d = n && await enDataURL(img, 300);
      if (d) photos[n] = d;
    }
    const res = { source: "pronote-trombi", extrait_le: new Date().toISOString(), logo, photos };
    afficher(res, `${Object.keys(photos).length} photos récupérées.`);
    return;
  }

  const c0 = combos();
  const periode = c0.find(v => /Trimestre|Semestre/.test(v)) || "";
  if (!suivant()) { alert("Ouvre d'abord Bulletins → Bulletin (pour les notes et appréciations) ou Trombinoscope (pour les photos), choisis la classe, puis relance."); return; }
  const res = { source: "pronote-bulletin", classe: c0[0] || "", periode, extrait_le: new Date().toISOString(), logo, eleves: {} };
  if (/De la classe/.test(nom())) { const n = nom(); appuyer(suivant()); await attendreChangement(n); }
  for (let i = 0; i < 60; i++) {
    await sleep(1200);
    const n = nom();
    if (!n || /De la classe/.test(n) || res.eleves[n]) break;
    res.eleves[n] = lire((document.querySelector("main") || document.body).innerText);
    const b = suivant(); if (!b) break;
    appuyer(b);
    if (!(await attendreChangement(n))) break;
  }
  afficher(res, `${Object.keys(res.eleves).length} élèves extraits (${res.classe}, ${res.periode}).`);
};

// lien « favori » à glisser dans la barre de favoris
App.lienExtracteur = () => "javascript:(" + encodeURIComponent(App.extracteurPronote.toString()) + ")()";

/* Applique un résultat d'extraction aux données de l'appli.
   Les moyennes collées remplacent celles de l'import (les corrections manuelles restent prioritaires) ;
   les appréciations du trimestre sont remplacées par celles de Pronote. */
App.importerPronote = function (data, texte) {
  let obj;
  try { obj = JSON.parse(texte.trim()); } catch (e) { throw new Error("le texte collé n'est pas celui produit par l'extracteur"); }
  if (!["pronote-bulletin", "pronote-trombi"].includes(obj.source)) throw new Error("le texte collé n'est pas celui produit par l'extracteur");
  if (obj.logo) data.meta.logo = obj.logo;
  const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z ]/g, " ").replace(/\s+/g, " ").trim();
  let ok = 0; const inconnus = [];
  const trouver = nomP => { const k = norm(nomP); return data.eleves.find(e => k === norm(e.nom + " " + e.prenom) || k.startsWith(norm(e.nom + " " + e.prenom) + " ")); };
  if (obj.source === "pronote-trombi") {
    for (const [nomP, photo] of Object.entries(obj.photos || {})) { const e = trouver(nomP); if (e) { e.photo = photo; ok++; } else inconnus.push(nomP); }
    return { ok, inconnus, photos: true };
  }
  for (const [nomP, x] of Object.entries(obj.eleves || {})) {
    const e = trouver(nomP);
    if (!e) { inconnus.push(nomP); continue; }
    for (const [m, v] of Object.entries(x.notes || {})) e.notes2[m] = App.num(v);
    e.appr2 = x.appr || [];
    if (x.vie) e.vie2 = x.vie;
    if (x.globale) e.globale2 = x.globale;
    ok++;
  }
  data.meta.pronote_le = obj.extrait_le;
  return { ok, inconnus };
};
