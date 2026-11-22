/* Stockage local (IndexedDB du navigateur). Les données ne quittent jamais l'ordinateur. */
window.App = window.App || {};

App.store = (function () {
  const DB = "conseil-de-classe", ST = "donnees", KEY = "courant";
  let mem = null; // repli si IndexedDB indisponible (navigation privée…)
  function open() {
    return new Promise((res, rej) => {
      try {
        const r = indexedDB.open(DB, 1);
        r.onupgradeneeded = () => r.result.createObjectStore(ST);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    });
  }
  async function tx(mode, fn) {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction(ST, mode), s = t.objectStore(ST), req = fn(s);
      t.oncomplete = () => res(req && req.result);
      t.onerror = () => rej(t.error);
    });
  }
  return {
    async charger() { try { return (await tx("readonly", s => s.get(KEY))) ?? mem; } catch (e) { return mem; } },
    async enregistrer(data) { mem = data; try { await tx("readwrite", s => s.put(data, KEY)); } catch (e) { console.warn("stockage local indisponible", e); } },
    async effacer() { mem = null; try { await tx("readwrite", s => s.delete(KEY)); } catch (e) {} },
  };
})();
