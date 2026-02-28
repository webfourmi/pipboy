// features/sheet.js
import { $ } from "../js/core/dom.js";
import { clamp, escapeHtml } from "../js/core/utils.js";
import { ensureActiveProfile, getProfileData, setProfileData, defaultProfileData } from "./profiles.js";

/* =========================
   CONFIG SKILLS
========================= */
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
   HELPERS
========================= */
function uid() {
  return "p_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}

function getSheet() {
  const id = ensureActiveProfile();
  const data = getProfileData(id);

  // initialise si manque
  if (!data.sheet) data.sheet = defaultProfileData().sheet;

  // valeurs par défaut complètes (au cas où profiles.js est minimal)
  const base = {
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
    combat: {
      ranged: 0,
      melee: 0,
      prot: 0,
      w1: { name: "", dmg: "" },
      w2: { name: "", dmg: "" },
    },
    specials: [],
  };

  // merge doux
  data.sheet = {
    ...base,
    ...(data.sheet || {}),
    stats: { ...base.stats, ...(data.sheet.stats || {}) },
    skills: { ...(data.sheet.skills || {}) },
    combat: { ...base.combat, ...(data.sheet.combat || {}) },
    specials: Array.isArray(data.sheet.specials) ? data.sheet.specials : base.specials,
  };

  // normalisation nums
  data.sheet.hpMax = Number.isFinite(+data.sheet.hpMax) ? Math.max(0, +data.sheet.hpMax) : base.hpMax;
  data.sheet.sanMax = Number.isFinite(+data.sheet.sanMax) ? Math.max(0, +data.sheet.sanMax) : base.sanMax;

  data.sheet.hp = Number.isFinite(+data.sheet.hp) ? +data.sheet.hp : base.hp;
  data.sheet.san = Number.isFinite(+data.sheet.san) ? +data.sheet.san : base.san;

  data.sheet.hp = clamp(data.sheet.hp, 0, data.sheet.hpMax);
  data.sheet.san = clamp(data.sheet.san, 0, data.sheet.sanMax);

  // stats
  ["for", "dex", "end", "int", "intu"].forEach((k) => {
    const cur = data.sheet.stats[k] || { v: 10, max: 20 };
    const mx = Number.isFinite(+cur.max) ? Math.max(1, +cur.max) : 20;
    const vv = Number.isFinite(+cur.v) ? clamp(+cur.v, 0, mx) : 10;
    data.sheet.stats[k] = { v: vv, max: mx };
  });

  // combat nums
  data.sheet.combat.ranged = Number.isFinite(+data.sheet.combat.ranged) ? clamp(+data.sheet.combat.ranged, 0, 100) : 0;
  data.sheet.combat.melee = Number.isFinite(+data.sheet.combat.melee) ? clamp(+data.sheet.combat.melee, 0, 100) : 0;
  data.sheet.combat.prot = Number.isFinite(+data.sheet.combat.prot) ? clamp(+data.sheet.combat.prot, 0, 999) : 0;

  setProfileData(id, data);
  return data.sheet;
}

function setSheet(nextSheet) {
  const id = ensureActiveProfile();
  const data = getProfileData(id);
  data.sheet = nextSheet;
  setProfileData(id, data);
}

function syncGauge(rangeEl, fillEl, labelEl, max) {
  if (!rangeEl || !fillEl || !labelEl) return;
  const v = Number(rangeEl.value || 0);
  const m = Math.max(0, Number(max ?? rangeEl.max ?? 0));
  const pct = m > 0 ? Math.round((v / m) * 100) : 0;
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
  document.querySelectorAll(selector).forEach((el) => {
    el.disabled = !!disabled;
  });
}

/* =========================
   UI BUILDERS
========================= */
function buildSkillsUI() {
  const box = $("skillsGrid");
  if (!box) return;

  // éviter double-build si init appelé 2 fois
  if (box.dataset.built === "1") return;

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

  box.dataset.built = "1";
}

function renderSpecials(list) {
  const box = $("specList");
  if (!box) return;

  box.innerHTML = "";
  if (!list || list.length === 0) {
    box.innerHTML = `<p class="hint">Aucune compétence spéciale.</p>`;
    return;
  }

  list.forEach((sp) => {
    const row = document.createElement("div");
    row.className = "specRow";
    row.innerHTML = `
      <div>${escapeHtml(sp.name || "")}</div>
      <div style="text-align:right; font-weight:900;">${Number(sp.val || 0)}%</div>
      <button class="mini danger" type="button" data-del="${sp.id}">X</button>
    `;
    box.appendChild(row);
  });

  box.querySelectorAll("button[data-del]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sheet = getSheet();
      sheet.specials = (sheet.specials || []).filter((x) => x.id !== btn.getAttribute("data-del"));
      setSheet(sheet);
      renderSpecials(sheet.specials);
    });
  });
}

/* =========================
   LOCK
========================= */
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
  setDisabled(["pjHp", "pjHpMax", "pjSan", "pjSanMax"], locked);

  // caracs valeur + max
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

  // skills
  setDisabledSelector('#skillsGrid input[data-skill]', locked);

  // combat
  setDisabled(
    ["combat_ranged", "combat_melee", "combat_prot", "w1_name", "w1_dmg", "w2_name", "w2_dmg"],
    locked
  );

  // dim visuel (si tu as la classe CSS lockedDim)
  const cardsToDim = [
    $("pjHp")?.closest(".card.sub"),
    $("pjSan")?.closest(".card.sub"),
    $("stat_for")?.closest(".card.sub"),
    $("skillsGrid")?.closest(".card.sub"),
    $("combat_ranged")?.closest(".card.sub"),
  ].filter(Boolean);

  cardsToDim.forEach((c) => c.classList.toggle("lockedDim", locked));
}

function toggleSheetLock() {
  const sheet = getSheet();
  sheet.locked = !sheet.locked;
  setSheet(sheet);
  applySheetLockUI(!!sheet.locked);
}

/* =========================
   LOAD / SAVE
========================= */
function loadSheetToUI() {
  const sh = getSheet();

  // PV
  if ($("pjHpMax")) $("pjHpMax").value = sh.hpMax ?? 0;
  if ($("pjHp")) {
    $("pjHp").max = String(sh.hpMax ?? 0);
    $("pjHp").value = sh.hp ?? 0;
  }
  syncGauge($("pjHp"), $("pjHpFill"), $("pjHpLabel"), sh.hpMax);
  if ($("pjWounds")) $("pjWounds").value = sh.wounds ?? "";

  // SAN
  if ($("pjSanMax")) $("pjSanMax").value = sh.sanMax ?? 0;
  if ($("pjSan")) {
    $("pjSan").max = String(sh.sanMax ?? 0);
    $("pjSan").value = sh.san ?? 0;
  }
  syncGauge($("pjSan"), $("pjSanFill"), $("pjSanLabel"), sh.sanMax);
  if ($("pjTroubles")) $("pjTroubles").value = sh.troubles ?? "";

  // Stats
  const setStat = (key) => {
    const r = $(`stat_${key}`);
    const v = $(`stat_${key}_val`);
    const m = $(`stat_${key}_max`);
    const st = sh.stats?.[key] || { v: 10, max: 20 };

    if (m) m.value = st.max ?? 20;
    if (r) {
      r.max = String(st.max ?? 20);
      r.value = st.v ?? 10;
    }
    if (v) v.textContent = String(st.v ?? 10);
  };
  ["for", "dex", "end", "int", "intu"].forEach(setStat);

  // Skills
  const skills = sh.skills || {};
  document.querySelectorAll("#skillsGrid input[data-skill]").forEach((inp) => {
    const k = inp.getAttribute("data-skill");
    inp.value = Number(skills[k] ?? 0);
  });

  // Combat
  if ($("combat_ranged")) $("combat_ranged").value = Number(sh.combat?.ranged ?? 0);
  if ($("combat_melee")) $("combat_melee").value = Number(sh.combat?.melee ?? 0);
  if ($("combat_prot")) $("combat_prot").value = Number(sh.combat?.prot ?? 0);
  if ($("w1_name")) $("w1_name").value = sh.combat?.w1?.name ?? "";
  if ($("w1_dmg")) $("w1_dmg").value = sh.combat?.w1?.dmg ?? "";
  if ($("w2_name")) $("w2_name").value = sh.combat?.w2?.name ?? "";
  if ($("w2_dmg")) $("w2_dmg").value = sh.combat?.w2?.dmg ?? "";

  // Specials
  renderSpecials(sh.specials || []);

  // lock
  applySheetLockUI(!!sh.locked);
}

function readSheetFromUI() {
  const sh = getSheet(); // base normalisée

  // PV
  sh.hpMax = Number($("pjHpMax")?.value ?? sh.hpMax ?? 0);
  sh.hpMax = Math.max(0, sh.hpMax);
  sh.hp = Number($("pjHp")?.value ?? sh.hp ?? 0);
  sh.hp = clamp(sh.hp, 0, sh.hpMax);
  sh.wounds = $("pjWounds")?.value ?? "";

  // SAN
  sh.sanMax = Number($("pjSanMax")?.value ?? sh.sanMax ?? 0);
  sh.sanMax = Math.max(0, sh.sanMax);
  sh.san = Number($("pjSan")?.value ?? sh.san ?? 0);
  sh.san = clamp(sh.san, 0, sh.sanMax);
  sh.troubles = $("pjTroubles")?.value ?? "";

  // Stats
  const getStat = (k) => {
    const mx = Number($(`stat_${k}_max`)?.value ?? sh.stats?.[k]?.max ?? 20);
    const max = Math.max(1, mx);
    const v = Number($(`stat_${k}`)?.value ?? sh.stats?.[k]?.v ?? 0);
    return { max, v: clamp(v, 0, max) };
  };
  sh.stats = {
    for: getStat("for"),
    dex: getStat("dex"),
    end: getStat("end"),
    int: getStat("int"),
    intu: getStat("intu"),
  };

  // Skills
  const nextSkills = {};
  document.querySelectorAll("#skillsGrid input[data-skill]").forEach((inp) => {
    const k = inp.getAttribute("data-skill");
    nextSkills[k] = clamp(Number(inp.value || 0), 0, 100);
  });
  sh.skills = nextSkills;

  // Combat
  sh.combat = {
    ranged: clamp(Number($("combat_ranged")?.value || 0), 0, 100),
    melee: clamp(Number($("combat_melee")?.value || 0), 0, 100),
    prot: clamp(Number($("combat_prot")?.value || 0), 0, 999),
    w1: { name: $("w1_name")?.value || "", dmg: $("w1_dmg")?.value || "" },
    w2: { name: $("w2_name")?.value || "", dmg: $("w2_dmg")?.value || "" },
  };

  // specials: conservés déjà en storage (mais on les garde)
  // sh.specials inchangé

  return sh;
}

function saveSheet() {
  const sh = getSheet();
  if (sh.locked) {
    applySheetLockUI(true);
    return;
  }
  const next = readSheetFromUI();
  setSheet(next);
  loadSheetToUI(); // refresh bars/labels
}

/* =========================
   EVENTS
========================= */
function bindEvents() {
  const lockBtn = $("toggleSheetLock");
  if (lockBtn) lockBtn.addEventListener("click", toggleSheetLock);

  // PV/SAN sliders
  ["input", "change"].forEach((evt) => {
    $("pjHp")?.addEventListener(evt, saveSheet);
    $("pjSan")?.addEventListener(evt, saveSheet);

    [
      "pjHpMax",
      "pjSanMax",
      "pjWounds",
      "pjTroubles",
      "combat_ranged",
      "combat_melee",
      "combat_prot",
      "w1_name",
      "w1_dmg",
      "w2_name",
      "w2_dmg",
    ].forEach((id) => $(id)?.addEventListener(evt, saveSheet));

    ["for", "dex", "end", "int", "intu"].forEach((k) => {
      $(`stat_${k}`)?.addEventListener(evt, saveSheet);
      $(`stat_${k}_max`)?.addEventListener(evt, saveSheet);
    });

    document.querySelectorAll("#skillsGrid input[data-skill]").forEach((inp) => {
      inp.addEventListener(evt, saveSheet);
    });
  });

  // Specials add
  $("addSpec")?.addEventListener("click", () => {
    const sh = getSheet();
    if (sh.locked) return;

    const name = ($("specName")?.value || "").trim();
    const val = clamp(Number($("specVal")?.value || 0), 0, 100);
    if (!name) return;

    sh.specials = Array.isArray(sh.specials) ? sh.specials : [];
    sh.specials.unshift({ id: uid(), name, val });
    setSheet(sh);

    if ($("specName")) $("specName").value = "";
    if ($("specVal")) $("specVal").value = "";
    renderSpecials(sh.specials);
  });

  // refresh si profil change
  document.addEventListener("pipboy:profile-changed", () => {
    buildSkillsUI();
    loadSheetToUI();
  });
}

/* =========================
   PUBLIC INIT
========================= */
export function initSheet() {
  buildSkillsUI();
  bindEvents();
  loadSheetToUI();
}
