export const $ = (id) => document.getElementById(id);
export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function on(target, event, handler, opts){
  if (!target) return;
  target.addEventListener(event, handler, opts);
}
