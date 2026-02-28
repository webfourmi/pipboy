// features/modals.js
import { $ } from "../js/core/dom.js";

function showModal(modalEl){
  if (!modalEl) return;
  modalEl.classList.add("show");
  modalEl.setAttribute("aria-hidden", "false");
}

function hideModal(modalEl){
  if (!modalEl) return;
  modalEl.classList.remove("show");
  modalEl.setAttribute("aria-hidden", "true");
}

function isShown(modalEl){
  return !!(modalEl && modalEl.classList.contains("show"));
}

function wireModal({ openId, modalId, closeId, backdropId, onOpenEvent }){
  const openBtn = $(openId);
  const modal = $(modalId);
  const closeBtn = $(closeId);
  const backdrop = $(backdropId);

  const open = () => {
    showModal(modal);
    if (onOpenEvent) document.dispatchEvent(new CustomEvent(onOpenEvent));
  };
  const close = () => hideModal(modal);

  if (openBtn) openBtn.addEventListener("click", open);
  if (closeBtn) closeBtn.addEventListener("click", close);
  if (backdrop) backdrop.addEventListener("click", close);

  return { modal, open, close };
}

export function initModals(){
  // PROFIL
  const profile = wireModal({
    openId: "openProfile",
    modalId: "profileModal",
    closeId: "closeProfile",
    backdropId: "closeProfileBackdrop",
    onOpenEvent: "pipboy:modal-profile-open"
  });

  // IO
  const io = wireModal({
    openId: "openIO",
    modalId: "ioModal",
    closeId: "closeIO",
    backdropId: "closeIOBackdrop",
    onOpenEvent: "pipboy:modal-io-open"
  });

  // ARCHIVES (bouton dans DATA)
  const archives = wireModal({
    openId: "openArchives",
    modalId: "archivesModal",
    closeId: "closeArchives",
    backdropId: "closeArchivesBackdrop",
    onOpenEvent: "pipboy:modal-archives-open"
  });

  // ESC: ferme dans l’ordre
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;

    if (isShown(archives.modal)) { archives.close(); return; }
    if (isShown(io.modal)) { io.close(); return; }
    if (isShown(profile.modal)) { profile.close(); return; }
  });
}
