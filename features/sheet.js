// features/sheet.js
import { $ } from "../js/core/dom.js";
import { clamp } from "../js/core/utils.js";
import { ensureActiveProfile, getProfileData, setProfileData, defaultProfileData } from "./profiles.js";

const STAT_KEYS = ["for","dex","end","int","intu"];

function setDisabled(ids, disabled){
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = !!disabled;
  });
}
function setDisabledSelector(selector, disabled){
  document.querySelectorAll(selector).forEach(el => { el.disabled = !!disabled; });
}

function applySheetLockUI(locked){
  const btn = $("toggleSheetLock");
  const hint = $("sheetLockHint");

  if (btn){
    btn.textContent = locked ? "🔒 ÉDITION" : "🔓 ÉDITION";
    btn.setAttribute("aria-pressed", locked ? "true" : "false");
    btn.classList.toggle("danger", locked);
  }
  if (hint){
    hint.style.display = locked ? "block" : "none";
  }

  // PV/SAN
  setDisabled(["pjHp","pjHpMax","pjSan","pjSanMax"], locked);

  // caracs (range + max)
  const statIds = [];
  STAT_KEYS.forEach(k => {
    statIds.push(`stat_${k}`, `stat_${k}_max`);
  });
  setDisabled(statIds, locked);

  // compétences
  setDisabledSelector('#skillsGrid input[data-skill]', locked);

  // combat
  setDisabled([
    "combat_ranged","combat_melee","combat_prot",
    "w1_name","w1_dmg","w2_name","w2_dmg"
  ], locked);

  // optionnel: griser les cartes
  const cardsToDim = [
    $("pjHp")?.closest(".card.sub"),
    $("pjSan")?.closest(".card.sub"),
    $("stat_for")?.closest(".card.sub"),
    $("skillsGrid")?.closest(".card.sub"),
    $("combat_ranged")?.closest(".card.sub")
  ].filter(Boolean);

  cardsToDim.forEach(c => c.classList.toggle("lockedDim", locked));
}

function getActiveSheet(){
  const id = ensureActiveProfile();
  const data = getProfileData(id);
  // fusion safe avec defaults (au cas où)
  const base = defaultProfileData();
  data.sheet = Object.assign({}, base.sheet, data.sheet || {});
  if (typeof data.sheet.locked !== "boolean") data.sheet.locked = true;
  return { id, data };
}

function toggleSheetLock(){
  const { id, data } = getActiveSheet();
  data.sheet.locked = !data.sheet.locked;
  setProfileData(id, data);
  applySheetLockUI(data.sheet.locked);
}

function syncGauge(rangeEl, fillEl, labelEl, max){
  if (!rangeEl || !fillEl || !labelEl) return;
  const v = Number(rangeEl.value);
  const m = Math.max(1, Number(max || rangeEl.max || 20));
  const pct = Math.round((v / m) * 100);
  fillEl.style.width = `${pct}%`;
  labelEl.textContent = `${v}/${m}`;
}

function loadSheetToUI(){
  const { data } = getActiveSheet();
  const sh = data.sheet;

  // PV
  if ($("pjHpMax")) $("pjHpMax").value = sh.hpMax ?? 20;
  if ($("pjHp")) { $("pjHp").max = String(sh.hpMax ?? 20); $("pjHp").value = sh.hp ?? 0; }
  syncGauge($("pjHp"), $("pjHpFill"), $("pjHpLabel"), sh.hpMax);
  if ($("pjWounds")) $("pjWounds").value = sh.wounds ?? "";

  // SAN
  if ($("pjSanMax")) $("pjSanMax").value = sh.sanMax ?? 20;
  if ($("pjSan")) { $("pjSan").max = String(sh.sanMax ?? 20); $("pjSan").value = sh.san ?? 0; }
  syncGauge($("pjSan"), $("pjSanFill"), $("pjSanLabel"), sh.sanMax);
  if ($("pjTroubles")) $("pjTroubles").value = sh.troubles ?? "";

  // Stats
  sh.stats = sh.stats || {};
  STAT_KEYS.forEach(k => {
    const r = $(`stat_${k}`);
    const v = $(`stat_${k}_val`);
    const m = $(`stat_${k}_max`);

    const st = sh.stats[k] || { v: 10, max: 20 };
    if (m) m.value = st.max ?? 20;
    if (r) { r.max = String(st.max ?? 20); r.value = st.v ?? 10; }
    if (v) v.textContent = String(st.v ?? 10);
  });

  // skills
  const skills = sh.skills || {};
  document.querySelectorAll("#skillsGrid input[data-skill]").forEach(inp => {
    const k = inp.getAttribute("data-skill");
    inp.value = Number(skills[k] ?? 0);
  });

  // combat
  if ($("combat_ranged")) $("combat_ranged").value = Number(sh.combat?.ranged ?? 0);
  if ($("combat_melee")) $("combat_melee").value = Number(sh.combat?.melee ?? 0);
  if ($("combat_prot")) $("combat_prot").value = Number(sh.combat?.prot ?? 0);

  if ($("w1_name")) $("w1_name").value = sh.combat?.w1?.name ?? "";
  if ($("w1_dmg")) $("w1_dmg").value = sh.combat?.w1?.dmg ?? "";
  if ($("w2_name")) $("w2_name").value = sh.combat?.w2?.name ?? "";
  if ($("w2_dmg")) $("w2_dmg").value = sh.combat?.w2?.dmg ?? "";

  applySheetLockUI(!!sh.locked);
}

function readSheetFromUI(){
  const sheet = defaultProfileData().sheet;

  sheet.hpMax = Number($("pjHpMax")?.value || 20);
  sheet.hp = clamp(Number($("pjHp")?.value || 0), 0, sheet.hpMax);
  sheet.wounds = $("pjWounds")?.value || "";

  sheet.sanMax = Number($("pjSanMax")?.value || 20);
  sheet.san = clamp(Number($("pjSan")?.value || 0), 0, sheet.sanMax);
  sheet.troubles = $("pjTroubles")?.value || "";

  sheet.stats = {};
  STAT_KEYS.forEach(k => {
    const max = Math.max(1, Number($(`stat_${k}_max`)?.value || 20));
    const v = clamp(Number($(`stat_${k}`)?.value || 0), 0, max);
    sheet.stats[k] = { v, max };
  });

  const skills = {};
  document.querySelectorAll("#skillsGrid input[data-skill]").forEach(inp => {
    const k = inp.getAttribute("data-skill");
    skills[k] = Number(inp.value || 0);
  });
  sheet.skills = skills;

  sheet.combat = {
    ranged: Number($("combat_ranged")?.value || 0),
    melee: Number($("combat_melee")?.value || 0),
    prot: Number($("combat_prot")?.value || 0),
    w1: { name: $("w1_name")?.value || "", dmg: $("w1_dmg")?.value || "" },
    w2: { name: $("w2_name")?.value || "", dmg: $("w2_dmg")?.value || "" }
  };

  return sheet;
}

function saveSheet(){
  const { id, data } = getActiveSheet();
  if (data.sheet.locked){
    applySheetLockUI(true);
    return;
  }
  const newSheet = readSheetFromUI();
  // garder locked tel quel
  newSheet.locked = !!data.sheet.locked;

  data.sheet = newSheet;
  setProfileData(id, data);
}

function bindSheetEvents(){
  const ids = [
    "pjHp","pjHpMax","pjWounds",
    "pjSan","pjSanMax","pjTroubles",
    "combat_ranged","combat_melee","combat_prot",
    "w1_name","w1_dmg","w2_name","w2_dmg"
  ];

  ids.forEach(id => {
    const el = $(id);
    if (!el) return;
    el.addEventListener("input", () => { saveSheet(); loadSheetToUI(); });
    el.addEventListener("change", () => { saveSheet(); loadSheetToUI(); });
  });

  STAT_KEYS.forEach(k => {
    const r = $(`stat_${k}`);
    const m = $(`stat_${k}_max`);
    if (r){
      r.addEventListener("input", () => { saveSheet(); loadSheetToUI(); });
      r.addEventListener("change", () => { saveSheet(); loadSheetToUI(); });
    }
    if (m){
      m.addEventListener("input", () => { saveSheet(); loadSheetToUI(); });
      m.addEventListener("change", () => { saveSheet(); loadSheetToUI(); });
    }
  });

  document.querySelectorAll("#skillsGrid input[data-skill]").forEach(inp => {
    inp.addEventListener("input", saveSheet);
    inp.addEventListener("change", saveSheet);
  });
}

export function initSheet(){
  // bouton lock
  const lockBtn = $("toggleSheetLock");
  if (lockBtn) lockBtn.addEventListener("click", toggleSheetLock);

  // quand le profil change -> recharger la fiche + lock UI
  document.addEventListener("pipboy:profile-changed", () => {
    loadSheetToUI();
  });

  bindSheetEvents();
  loadSheetToUI();
}
