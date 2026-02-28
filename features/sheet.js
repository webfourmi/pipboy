// features/sheet.js
import { $ } from "../js/core/dom.js";
import { clamp } from "../js/core/utils.js";
import { ensureActiveProfile, getProfileData, setProfileData } from "./profiles.js";

// Liste des compétences (identiques à ton app avant migration)
const SKILLS = [
  "adaptation",
  "astrophysique_mathematiques",
  "biologie_geologie",
  "bricoler_bidouiller",
  "comprendre_etrange",
  "convaincre",
  "courir_sauter_nager",
  "deplacement_zero_g",
  "discretion",
  "garder_son_calme",
  "observer",
  "pilotage",
  "programmation",
  "reflexes",
  "soigner",
  "survie",
];

const SKILLS_LABEL = {
  adaptation: "Adaptation",
  astrophysique_mathematiques: "Astrophysique / Mathématiques",
  biologie_geologie: "Biologie / Géologie",
  bricoler_bidouiller: "Bricoler / Bidouiller",
  comprendre_etrange: "Comprendre l’étrange",
  convaincre: "Convaincre",
  courir_sauter_nager: "Courir / Sauter / Nager",
  deplacement_zero_g: "Déplacement en zéro G",
  discretion: "Discrétion",
  garder_son_calme: "Garder son calme",
  observer: "Observer",
  pilotage: "Pilotage",
  programmation: "Programmation",
  reflexes: "Réflexes",
  soigner: "Soigner",
  survie: "Survie",
};

function sheetDefaults() {
  return {
    locked: true,
    hp: 10,
    hpMax: 20,
    wounds: "",
    san: 10,
    sanMax: 20,
    troubles: "",
    stats: {
      for: { v: 10, max: 20 },
      dex: { v: 10, max: 20 },
      end: { v: 10, max: 20 },
      int: { v: 10, max: 20 },
      intu: { v: 10, max: 20 },
    },
    skills: {},
    combat: { ranged: 0, melee: 0, prot: 0, w1: { name: "", dmg: "" }, w2: { name: "", dmg: "" } },
    specials: [],
  };
}

function normalizeSheet(sheet) {
  const base = sheetDefaults();
  const sh = Object.assign({}, base, sheet || {});
  sh.locked = !!sh.locked;

  sh.hpMax = Number.isFinite(+sh.hpMax) ? +sh.hpMax : base.hpMax;
  sh.sanMax = Number.isFinite(+sh.sanMax) ? +sh.sanMax : base.sanMax;
  sh.hpMax = Math.max(1, sh.hpMax);
  sh.sanMax = Math.max(1, sh.sanMax);

  sh.hp = Number.isFinite(+sh.hp) ? +sh.hp : base.hp;
  sh.san = Number.isFinite(+sh.san) ? +sh.san : base.san;
  sh.hp = clamp(sh.hp, 0, sh.hpMax);
  sh.san = clamp(sh.san, 0, sh.sanMax);

  sh.wounds = typeof sh.wounds === "string" ? sh.wounds : "";
  sh.troubles = typeof sh.troubles === "string" ? sh.troubles : "";

  sh.stats = (sh.stats && typeof sh.stats === "object") ? sh.stats : {};
  ["for", "dex", "end", "int", "intu"].forEach((k) => {
    const cur = sh.stats[k] && typeof sh.stats[k] === "object" ? sh.stats[k] : base.stats[k];
    const max = Math.max(1, Number.isFinite(+cur.max) ? +cur.max : base.stats[k].max);
    const v = clamp(Number.isFinite(+cur.v) ? +cur.v : base.stats[k].v, 0, max);
    sh.stats[k] = { v, max };
  });

  sh.skills = (sh.skills && typeof sh.skills === "object") ? sh.skills : {};
  sh.specials = Array.isArray(sh.specials) ? sh.specials : [];

  sh.combat = Object.assign({}, base.combat, sh.combat || {});
  sh.combat.w1 = Object.assign({}, base.combat.w1, sh.combat.w1 || {});
  sh.combat.w2 = Object.assign({}, base.combat.w2, sh.combat.w2 || {});

  return sh;
}

function buildSkillsUI() {
  const box = $("skillsGrid");
  if (!box) return;
  box.innerHTML = "";
  SKILLS.forEach((k) => {
    const wrap = document.createElement("label");
    wrap.className = "field";
    wrap.innerHTML = `
      <span>${SKILLS_LABEL[k] || k}</span>
      <input data-skill="${k}" type="number" min="0" max="100" step="1" value="0">
    `;
    box.appendChild(wrap);
  });
}

function syncGauge(rangeEl, fillEl, labelEl, maxVal) {
  if (!rangeEl || !fillEl || !labelEl) return;
  const v = Number(rangeEl.value || 0);
  const m = Math.max(1, Number(maxVal || rangeEl.max || 20));
  const pct = Math.round((v / m) * 100);
  fillEl.style.width = `${pct}%`;
  labelEl.textContent = `${v}/${m}`;
}

function setDisabled(ids, disabled) {
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.disabled = !!disabled;
  });
}
function setDisabledSelector(selector, disabled) {
  document.querySelectorAll(selector).forEach((el) => (el.disabled = !!disabled));
}

function applySheetLockUI(locked) {
  const btn = $("toggleSheetLock");
  const hint = $("sheetLockHint");

  if (btn) {
    btn.textContent = locked ? "🔒 ÉDITION" : "🔓 ÉDITION";
    btn.setAttribute("aria-pressed", locked ? "true" : "false");
    btn.classList.toggle("danger", locked);
  }
  if (hint) hint.style.display = locked ? "block" : "none";

  setDisabled(["pjHp", "pjHpMax", "pjSan", "pjSanMax", "pjWounds", "pjTroubles"], locked);

  setDisabled(
    [
      "stat_for", "stat_for_max",
      "stat_dex", "stat_dex_max",
      "stat_end", "stat_end_max",
      "stat_int", "stat_int_max",
      "stat_intu", "stat_intu_max",
    ],
    locked
  );

  setDisabledSelector("#skillsGrid input[data-skill]", locked);

  setDisabled(
    ["combat_ranged", "combat_melee", "combat_prot", "w1_name", "w1_dmg", "w2_name", "w2_dmg"],
    locked
  );
}

function loadSheetToUI(profileData) {
  const sh = normalizeSheet(profileData.sheet);

  // PV
  if ($("pjHpMax")) $("pjHpMax").value = sh.hpMax;
  if ($("pjHp")) { $("pjHp").max = String(sh.hpMax); $("pjHp").value = String(sh.hp); }
  syncGauge($("pjHp"), $("pjHpFill"), $("pjHpLabel"), sh.hpMax);
  if ($("pjWounds")) $("pjWounds").value = sh.wounds;

  // SAN
  if ($("pjSanMax")) $("pjSanMax").value = sh.sanMax;
  if ($("pjSan")) { $("pjSan").max = String(sh.sanMax); $("pjSan").value = String(sh.san); }
  syncGauge($("pjSan"), $("pjSanFill"), $("pjSanLabel"), sh.sanMax);
  if ($("pjTroubles")) $("pjTroubles").value = sh.troubles;

  // Stats
  ["for", "dex", "end", "int", "intu"].forEach((k) => {
    const r = $(`stat_${k}`);
    const v = $(`stat_${k}_val`);
    const m = $(`stat_${k}_max`);
    const st = sh.stats[k];
    if (m) m.value = st.max;
    if (r) { r.max = String(st.max); r.value = String(st.v); }
    if (v) v.textContent = String(st.v);
  });

  // Skills
  document.querySelectorAll("#skillsGrid input[data-skill]").forEach((inp) => {
    const k = inp.getAttribute("data-skill");
    inp.value = String(Number(sh.skills[k] ?? 0));
  });

  // Combat
  if ($("combat_ranged")) $("combat_ranged").value = String(Number(sh.combat.ranged ?? 0));
  if ($("combat_melee")) $("combat_melee").value = String(Number(sh.combat.melee ?? 0));
  if ($("combat_prot")) $("combat_prot").value = String(Number(sh.combat.prot ?? 0));
  if ($("w1_name")) $("w1_name").value = sh.combat.w1?.name ?? "";
  if ($("w1_dmg")) $("w1_dmg").value = sh.combat.w1?.dmg ?? "";
  if ($("w2_name")) $("w2_name").value = sh.combat.w2?.name ?? "";
  if ($("w2_dmg")) $("w2_dmg").value = sh.combat.w2?.dmg ?? "";

  applySheetLockUI(!!sh.locked);
}

function saveSheetFromUI() {
  const id = ensureActiveProfile();
  if (!id) return;

  const data = getProfileData(id);
  const sh = normalizeSheet(data.sheet);

  // verrouillé => on ne change rien
  if (sh.locked) {
    applySheetLockUI(true);
    return;
  }

  // Lire UI -> data.sheet
  sh.hpMax = Math.max(1, Number($("pjHpMax")?.value || sh.hpMax));
  sh.hp = clamp(Number($("pjHp")?.value || sh.hp), 0, sh.hpMax);
  sh.wounds = $("pjWounds")?.value || "";

  sh.sanMax = Math.max(1, Number($("pjSanMax")?.value || sh.sanMax));
  sh.san = clamp(Number($("pjSan")?.value || sh.san), 0, sh.sanMax);
  sh.troubles = $("pjTroubles")?.value || "";

  ["for", "dex", "end", "int", "intu"].forEach((k) => {
    const max = Math.max(1, Number($(`stat_${k}_max`)?.value || sh.stats[k].max));
    const v = clamp(Number($(`stat_${k}`)?.value || sh.stats[k].v), 0, max);
    sh.stats[k] = { v, max };
  });

  const skills = {};
  document.querySelectorAll("#skillsGrid input[data-skill]").forEach((inp) => {
    const k = inp.getAttribute("data-skill");
    skills[k] = Number(inp.value || 0);
  });
  sh.skills = skills;

  sh.combat = {
    ranged: Number($("combat_ranged")?.value || 0),
    melee: Number($("combat_melee")?.value || 0),
    prot: Number($("combat_prot")?.value || 0),
    w1: { name: $("w1_name")?.value || "", dmg: $("w1_dmg")?.value || "" },
    w2: { name: $("w2_name")?.value || "", dmg: $("w2_dmg")?.value || "" },
  };

  data.sheet = sh;
  setProfileData(id, data);

  // IMPORTANT: re-render pour recalculer jauges/max/labels
  loadSheetToUI(data);
}

export function initSheet() {
  // 1) construire les compétences (sinon elles n’existent pas)
  buildSkillsUI();

  // 2) charger la fiche au démarrage
  const id = ensureActiveProfile();
  if (id) loadSheetToUI(getProfileData(id));

  // 3) recharger au changement de profil
  document.addEventListener("pipboy:profile-changed", () => {
    const id2 = ensureActiveProfile();
    if (id2) loadSheetToUI(getProfileData(id2));
  });

  // 4) bouton lock
  const lockBtn = $("toggleSheetLock");
  if (lockBtn) {
    lockBtn.addEventListener("click", () => {
      const id3 = ensureActiveProfile();
      if (!id3) return;
      const data = getProfileData(id3);
      const sh = normalizeSheet(data.sheet);
      sh.locked = !sh.locked;
      data.sheet = sh;
      setProfileData(id3, data);
      applySheetLockUI(sh.locked);
    });
  }

  // 5) listeners PV/SAN/MAX etc
  const hook = (id, evt = "input") => {
    const el = $(id);
    if (!el) return;
    el.addEventListener(evt, () => saveSheetFromUI());
  };

  ["pjHp", "pjHpMax", "pjSan", "pjSanMax", "pjWounds", "pjTroubles"].forEach((id) => hook(id, "input"));
  ["pjHpMax", "pjSanMax"].forEach((id) => hook(id, "change"));

  ["for", "dex", "end", "int", "intu"].forEach((k) => {
    hook(`stat_${k}`, "input");
    hook(`stat_${k}_max`, "input");
    hook(`stat_${k}_max`, "change");
  });

  document.querySelectorAll("#skillsGrid input[data-skill]").forEach((inp) => {
    inp.addEventListener("input", () => saveSheetFromUI());
  });

  ["combat_ranged", "combat_melee", "combat_prot", "w1_name", "w1_dmg", "w2_name", "w2_dmg"].forEach((id) => hook(id, "input"));
}
