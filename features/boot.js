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

  try {
    if (sessionStorage.getItem(KEY) === "1") {
      hide();
      return;
    }
  } catch {}

  boot.classList.add("show");
  boot.setAttribute("aria-hidden", "false");
  boot.addEventListener("click", hide, { once: true });

  if (!fill) {
    setTimeout(hide, 900);
    return;
  }

  let p = 0;
  const tick = () => {
    p = Math.min(100, p + (10 + Math.random() * 14));
    fill.style.width = `${p}%`;
    if (p >= 100) hide();
    else setTimeout(tick, 140);
  };

  setTimeout(tick, 180);
}
