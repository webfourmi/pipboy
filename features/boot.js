// features/boot.js
import { $ } from "../js/core/dom.js";

export function initBoot() {
  const boot = $("boot");
  const fill = $("bootFill");
  if (!boot) return;

  const KEY = "pipboy_boot_session_done";

  const hide = () => {
    boot.classList.remove("show");
    boot.setAttribute("aria-hidden", "true");
    try { sessionStorage.setItem(KEY, "1"); } catch {}
  };

  // ✅ Si déjà fait dans la session -> on cache direct
  try {
    if (sessionStorage.getItem(KEY) === "1") {
      hide();
      return;
    }
  } catch {
    // si sessionStorage bloqué, on continue (fallback)
  }

  // ✅ Sécurité absolue : quoi qu’il arrive, on ferme au bout de 2,5s
  const safetyTimer = setTimeout(hide, 2500);

  // ✅ Click / touch pour passer (mobile friendly)
  const skip = () => {
    clearTimeout(safetyTimer);
    hide();
  };
  boot.addEventListener("click", skip, { once: true });
  boot.addEventListener("touchstart", skip, { once: true, passive: true });

  // ✅ Animation de barre si possible, sinon on laisse juste le safetyTimer fermer
  if (!fill) return;

  let p = 0;
  const tick = () => {
    p = Math.min(100, p + (12 + Math.random() * 18));
    fill.style.width = p + "%";
    if (p >= 100) {
      clearTimeout(safetyTimer);
      hide();
    } else {
      setTimeout(tick, 140);
    }
  };
  setTimeout(tick, 180);
}
