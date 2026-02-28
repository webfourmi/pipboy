// features/modals.js
import { $, on } from "../js/core/dom.js";

export function initModals() {
  // Profil modal
  const profileModal = $("profileModal");
  on($("openProfile"), "click", () => show(profileModal));
  on($("closeProfile"), "click", () => hide(profileModal));
  on($("closeProfileBackdrop"), "click", () => hide(profileModal));

  // IO modal
  const ioModal = $("ioModal");
  on($("openIO"), "click", () => show(ioModal));
  on($("closeIO"), "click", () => hide(ioModal));
  on($("closeIOBackdrop"), "click", () => hide(ioModal));

  // Archives modal
  const archivesModal = $("archivesModal");
  on($("openArchives"), "click", () => show(archivesModal));
  on($("closeArchives"), "click", () => hide(archivesModal));
  on($("closeArchivesBackdrop"), "click", () => hide(archivesModal));

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (archivesModal?.classList.contains("show")) return hide(archivesModal);
    if (ioModal?.classList.contains("show")) return hide(ioModal);
    if (profileModal?.classList.contains("show")) return hide(profileModal);
  });
}

function show(modal) {
  if (!modal) return;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}

function hide(modal) {
  if (!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
}
