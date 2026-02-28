export function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

export function pad2(n){ return String(n).padStart(2,"0"); }

export function toDateTimeLocal(ts){
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function fromDateTimeLocal(str){
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? Date.now() : d.getTime();
}

export function clamp(n, min, max){
  return Math.max(min, Math.min(max, n));
}
