// features/sheet.js
import { $, qsa, on } from "../js/core/dom.js";
import { clamp } from "../js/core/utils.js";
import { ensureActiveProfile, getProfileData, setProfileData } from "./profiles.js";

/* =========================
   CONFIG
========================= */

const STATS = ["for", "dex", "end", "int", "intu"];

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

/* =========================
   HELPERS UI
========================= */

function syncGauge(rangeEl, fillEl, labelEl, max) {
  if (!rangeEl || !fillEl || !labelEl) return;
  const v = Number(rangeEl.value || 0);
  const m = Math.max(1, Number(max ?? rangeEl.max ?? 20));
  const pct = Math.round((v / m) * 100);
  fillEl.style.width = `${pct}%`;
  labelEl.textContent = `${v}/${m}`;
}

function setDisabled(ids, disabled) {
  ids.forEach((id) => {
    const el = $(id);
    if (el) el.disabled = !!disabled;
  });
}

function setDisabledSelector(selector, disabled) {
  qsa(selector).forEach((el) => {
    el.disabled = !!disabled;
  });
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

  // PV / SAN
  setDisabled(["pjHp", "pjHpMax", "pjSan", "pjSanMax", "pjWounds", "pjTroubles"], locked);

  // Caracs valeur + max
  setDisabled(
    [
      "stat_for",
      "stat_for_max",
      "stat_dex",
      "stat_dex_max",
      "stat_end",
      "stat_end_max",
      "stat_int",
      "stat_int_max",
      "stat_intu",
      "stat_intu_max",
    ],
    locked
  );

  // Compétences
  setDisabledSelector('#skillsGrid input[data-skill]', locked);

  // Combat (verrouillage demandé ✅)
  setDisabled(
    ["combat_ranged", "combat_melee", "combat_prot", "w1_name", "w1_dmg", "w2_name", "w2_dmg"],
    locked
  );

  // Petit effet visuel si tu as la classe CSS
  const cardsToDim = [
    $("pjHp")?.closest(".card.sub"),
    $("pjSan")?.closest(".card.sub"),
    $("stat_for")?.closest(".card.sub"),
    $("skillsGrid")?.closest(".card.sub"),
    $("combat_ranged")?.closest(".card.sub"),
  ].filter(Boolean);

  cardsToDim.forEach((c) => c.classList.toggle("lockedDim", locked));
}

/* =========================
   DATA NORMALIZATION
========================= */

function ensureSheetModel(data) {
  data.sheet = data.sheet || {};
  const sh = data.sheet;

  // defaults (pas de migration ancienne demandée)
  if (typeof sh.locked !== "boolean") sh.locked = true;

  if (!Number.isFinite(+sh.hpMax)) sh.hpMax = 10;
  if (!Number.isFinite(+sh.hp)) sh.hp = Math.min(10, sh.hpMax);
  sh.hpMax = Math.max(0, +sh.hpMax);
  sh.hp = clamp(+sh.hp, 0, sh.hpMax);

  if (!Number.isFinite(+sh.sanMax)) sh.sanMax = 10;
  if (!Number.isFinite(+sh.san)) sh.san = Math.min(10, sh.sanMax);
  sh.sanMax = Math.max(0, +sh.sanMax);
  sh.san = clamp(+sh.san, 0, sh.sanMax);

  if (typeof sh.wounds !== "string") sh.wounds = "";
  if (typeof sh.troubles !== "string") sh.troubles = "";

  // stats
  sh.stats = sh.stats && typeof sh.stats === "object" ? sh.stats : {};
  STATS.forEach((k) => {
    const cur = sh.stats[k] && typeof sh.stats[k] === "object" ? sh.stats[k] : { v: 10, max: 20 };
    if (!Number.isFinite(+cur.max)) cur.max = 20;
    if (!Number.isFinite(+cur.v)) cur.v = 10;
    cur.max = Math.max(1, +cur.max);
    cur.v = clamp(+cur.v, 0, cur.max);
    sh.stats[k] = cur;
  });

  // skills
  sh.skills = sh.skills && typeof sh.skills === "object" ? sh.skills : {};
  SKILLS.forEach((k) => {
    const v = Number.isFinite(+sh.skills[k]) ? +sh.skills[k] : 0;
    sh.skills[k] = clamp(v, 0, 100);
  });

  // combat
  sh.combat = sh.combat && typeof sh.combat === "object" ? sh.combat : {};
  sh.combat.ranged = clamp(Number(sh.combat.ranged || 0), 0, 100);
  sh.combat.melee = clamp(Number(sh.combat.melee || 0), 0, 100);
  sh.combat.prot = clamp(Number(sh.combat.prot || 0), 0, 999);

  sh.combat.w1 = sh.combat.w1 && typeof sh.combat.w1 === "object" ? sh.combat.w1 : {};
  sh.combat.w2 = sh.combat.w2 && typeof sh.combat.w2 === "object" ? sh.combat.w2 : {};
  if (typeof sh.combat.w1.name !== "string") sh.combat.w1.name = "";
  if (typeof sh.combat.w1.dmg !== "string") sh.combat.w1.dmg = "";
  if (typeof sh.combat.w2.name !== "string") sh.combat.w2.name = "";
  if (typeof sh.combat.w2.dmg !== "string") sh.combat.w2.dmg = "";

  // specials (géré ici minimalement, on ne casse rien)
  sh.specials = Array.isArray(sh.specials) ? sh.specials : [];

  return data;
}

function getActiveData() {
  const id = ensureActiveProfile();
  const data = getProfileData(id);
  return ensureSheetModel(data);
}

function saveActiveData(data) {
  const id = ensureActiveProfile();
  setProfileData(id, data);
}

/* =========================
   SKILLS UI
========================= */

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

/* =========================
   LOAD -> UI
========================= */

function loadSheetToUI(data) {
  const sh = ensureSheetModel(data).sheet;

  // Lock state
  applySheetLockUI(!!sh.locked);

  // PV
  if ($("pjHpMax")) $("pjHpMax").value = sh.hpMax;
  if ($("pjHp")) {
    $("pjHp").max = String(sh.hpMax);
    $("pjHp").value = String(sh.hp);
  }
  syncGauge($("pjHp"), $("pjHpFill"), $("pjHpLabel"), sh.hpMax);
  if ($("pjWounds")) $("pjWounds").value = sh.wounds;

  // SAN
  if ($("pjSanMax")) $("pjSanMax").value = sh.sanMax;
  if ($("pjSan")) {
    $("pjSan").max = String(sh.sanMax);
    $("pjSan").value = String(sh.san);
  }
  syncGauge($("pjSan"), $("pjSanFill"), $("pjSanLabel"), sh.sanMax);
  if ($("pjTroubles")) $("pjTroubles").value = sh.troubles;

  // Stats
  STATS.forEach((k) => {
    const r = $(`stat_${k}`);
    const v = $(`stat_${k}_val`);
    const m = $(`stat_${k}_max`);
    const st = sh.stats[k];

    if (m) m.value = st.max;
    if (r) {
      r.max = String(st.max);
      r.value = String(st.v);
    }
    if (v) v.textContent = String(st.v);
  });

  // Skills
  qsa('#skillsGrid input[data-skill]').forEach((inp) => {
    const k = inp.getAttribute("data-skill");
    inp.value = String(sh.skills[k] ?? 0);
  });

  // Combat
  if ($("combat_ranged")) $("combat_ranged").value = String(sh.combat.ranged ?? 0);
  if ($("combat_melee")) $("combat_melee").value = String(sh.combat.melee ?? 0);
  if ($("combat_prot")) $("combat_prot").value = String(sh.combat.prot ?? 0);

  if ($("w1_name")) $("w1_name").value = sh.combat.w1?.name ?? "";
  if ($("w1_dmg")) $("w1_dmg").value = sh.combat.w1?.dmg ?? "";
  if ($("w2_name")) $("w2_name").value = sh.combat.w2?.name ?? "";
  if ($("w2_dmg")) $("w2_dmg").value = sh.combat.w2?.dmg ?? "";
}

/* =========================
   UI -> READ
========================= */

function readSheetFromUI(existingLocked) {
  const sh = {
    locked: !!existingLocked,
    hp: 0,
    hpMax: 0,
    wounds: "",
    san: 0,
    sanMax: 0,
    troubles: "",
    stats: {},
    skills: {},
    combat: {
      ranged: 0,
      melee: 0,
      prot: 0,
      w1: { name: "", dmg: "" },
      w2: { name: "", dmg: "" },
    },
    specials: [], // on garde l’existant ailleurs
  };

  // PV/SAN
  sh.hpMax = Math.max(0, Number($("pjHpMax")?.value ?? 0));
  sh.hp = clamp(Number($("pjHp")?.value ?? 0), 0, sh.hpMax);
  sh.wounds = $("pjWounds")?.value ?? "";

  sh.sanMax = Math.max(0, Number($("pjSanMax")?.value ?? 0));
  sh.san = clamp(Number($("pjSan")?.value ?? 0), 0, sh.sanMax);
  sh.troubles = $("pjTroubles")?.value ?? "";

  // Stats
  STATS.forEach((k) => {
    const max = Math.max(1, Number($(`stat_${k}_max`)?.value ?? 20));
    const v = clamp(Number($(`stat_${k}`)?.value ?? 0), 0, max);
    sh.stats[k] = { v, max };
  });

  // Skills
  qsa('#skillsGrid input[data-skill]').forEach((inp) => {
    const k = inp.getAttribute("data-skill");
    const v = clamp(Number(inp.value ?? 0), 0, 100);
    sh.skills[k] = v;
  });

  // Combat
  sh.combat.ranged = clamp(Number($("combat_ranged")?.value ?? 0), 0, 100);
  sh.combat.melee = clamp(Number($("combat_melee")?.value ?? 0), 0, 100);
  sh.combat.prot = clamp(Number($("combat_prot")?.value ?? 0), 0, 999);
  sh.combat.w1.name = $("w1_name")?.value ?? "";
  sh.combat.w1.dmg = $("w1_dmg")?.value ?? "";
  sh.combat.w2.name = $("w2_name")?.value ?? "";
  sh.combat.w2.dmg = $("w2_dmg")?.value ?? "";

  return sh;
}

/* =========================
   SAVE
========================= */

function saveSheet() {
  const data = getActiveData();
  const locked = !!data.sheet.locked;

  // si verrouillé: on ignore (sécurité)
  if (locked) {
    applySheetLockUI(true);
    // on recharge l’UI pour être sûr
    loadSheetToUI(data);
    return;
  }

  // on récupère l’existant pour garder specials
  const prevSpecials = Array.isArray(data.sheet.specials) ? data.sheet.specials : [];

  const sh = readSheetFromUI(locked);
  sh.specials = prevSpecials;

  data.sheet = sh;
  ensureSheetModel(data);
  saveActiveData(data);

  // refresh UI (barres/labels)
  loadSheetToUI(data);
}

/* =========================
   LOCK TOGGLE
========================= */

function toggleSheetLock() {
  const data = getActiveData();
  data.sheet.locked = !data.sheet.locked;
  saveActiveData(data);
  applySheetLockUI(data.sheet.locked);
}

/* =========================
   BIND EVENTS
========================= */

function bindEvents() {
  // lock button
  on($("toggleSheetLock"), "click", toggleSheetLock);

  // PV/SAN + max + textes + combat
  const watched = [
    "pjHp",
    "pjHpMax",
    "pjWounds",
    "pjSan",
    "pjSanMax",
    "pjTroubles",
    "combat_ranged",
    "combat_melee",
    "combat_prot",
    "w1_name",
    "w1_dmg",
    "w2_name",
    "w2_dmg",
  ];

  watched.forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener("input", saveSheet);
    el.addEventListener("change", saveSheet);
  });

  // stats value + max
  STATS.forEach((k) => {
    const r = $(`stat_${k}`);
    const m = $(`stat_${k}_max`);
    if (r) {
      r.addEventListener("input", saveSheet);
      r.addEventListener("change", saveSheet);
    }
    if (m) {
      m.addEventListener("input", saveSheet);
      m.addEventListener("change", saveSheet);
    }
  });

  // skills
  qsa('#skillsGrid input[data-skill]').forEach((inp) => {
    inp.addEventListener("input", saveSheet);
    inp.addEventListener("change", saveSheet);
  });

  // changement de profil
  document.addEventListener("pipboy:profile-changed", () => {
    const data = getActiveData();
    loadSheetToUI(data);
  });
}

/* =========================
   INIT
========================= */

export function initSheet() {
  // construit la grille skills si vide
  buildSkillsUI();

  // charge la fiche du profil actif
  const data = getActiveData();
  loadSheetToUI(data);

  // bind events
  bindEvents();
}
