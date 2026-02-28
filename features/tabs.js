// features/tabs.js
import { qsa, $ } from "../js/core/dom.js";

export function initTabs() {
  qsa(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.view;
      if (!target) return;

      qsa(".tab").forEach(b => b.classList.remove("active"));
      qsa(".view").forEach(v => v.classList.remove("active"));

      btn.classList.add("active");
      const section = $(target);
      if (section) section.classList.add("active");
    });
  });
}
