import { $ } from "./core.js";

export function initBootOncePerSession(){
  const boot = document.getElementById("boot");
  const fill = document.getElementById("bootFill");
  if (!boot) return;

  const KEY = "pipboy_boot_session_done";
  const hide = () => {
    boot.classList.remove("show");
    boot.setAttribute("aria-hidden", "true");
    try { sessionStorage.setItem(KEY, "1"); } catch {}
  };

  try {
    if (sessionStorage.getItem(KEY) === "1") { hide(); return; }
  } catch {}

  boot.classList.add("show");
  boot.setAttribute("aria-hidden","false");
  boot.addEventListener("click", hide, { once:true });

  if (!fill){ setTimeout(hide, 900); return; }

  let p = 0;
  const step = () => {
    p = Math.min(100, p + (10 + Math.random()*14));
    fill.style.width = p + "%";
    if (p >= 100) hide();
    else setTimeout(step, 140);
  };
  setTimeout(step, 180);
}

export function initClock(){
  function tick(){
    const d = new Date();
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    const el = document.getElementById('clock');
    if (el) el.textContent = `${hh}:${mm}`;
  }
  tick(); setInterval(tick, 1000);
}

export function initTabs(){
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.view;
      if (!target) return;
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      btn.classList.add('active');
      const section = document.getElementById(target);
      if (section) section.classList.add('active');
    });
  });
}

/**
 * Gestion ESC: on ferme dans l'ordre (archives > io > profil)
 * On injecte des callbacks pour éviter les imports circulaires.
 */
export function initEscClose({ closeArchives, closeIO, closeProfile }){
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;

    const archivesModal = $("archivesModal");
    const ioModal = $("ioModal");
    const profileModal = $("profileModal");

    if (archivesModal && archivesModal.classList.contains("show")) { closeArchives?.(); return; }
    if (ioModal && ioModal.classList.contains("show")) { closeIO?.(); return; }
    if (profileModal && profileModal.classList.contains("show")) { closeProfile?.(); return; }
  });
}
