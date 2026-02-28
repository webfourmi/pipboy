export const store = {
  get(key, fallback){
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value){
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error("STORE SET FAILED", key, e);
      alert("Sauvegarde bloquée (storage). Regarde la console (F12).");
      return false;
    }
  },
  del(key){
    try { localStorage.removeItem(key); }
    catch (e) { console.error("STORE DEL FAILED", key, e); }
  }
};
