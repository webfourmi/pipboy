export const APP_VERSION = "v28";

export const $ = (id) => document.getElementById(id);

export const store = {
  get(k, fallback){ try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)); },
  del(k){ localStorage.removeItem(k); }
};

export function uid(){
  return "p_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}

export function clamp(n, min, max){
  return Math.max(min, Math.min(max, n));
}

export function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

export function pad2(n){ return String(n).padStart(2,"0"); }

export function formatTs(ts){
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  return `${pad2(d.getDate())}/${pad2(d.getMonth()+1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function toDateTimeLocal(ts){
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function fromDateTimeLocal(str){
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? Date.now() : d.getTime();
}
