// features/profiles.js
import { store } from "../js/core/store.js";
import { $ } from "../js/core/dom.js";

const PROFILES_KEY = "pipboy_profiles";
const ACTIVE_KEY = "pipboy_active_profile";

function uid(){
  return "p_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}

// ✅ Base complète (important)
function defaultProfileData(){
  return {
    logDraft: "",
    logEntries: [],
    inv: [],
    quests: [],
    sheet: {
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
        intu:{ v: 10, max: 20 }
      },
      skills: {},
      combat: { ranged: 0, melee: 0, prot: 0, w1:{name:"", dmg:""}, w2:{name:"", dmg:""} },
      specials: []
    }
  };
}

// ✅ Normalisation pour éviter les profils “cassés”
function normalizeProfileData(d){
  const base = defaultProfileData();
  const out = Object.assign({}, base, d || {});

  out.logDraft = typeof out.logDraft === "string" ? out.logDraft : "";
  out.logEntries = Array.isArray(out.logEntries) ? out.logEntries : [];
  out.inv = Array.isArray(out.inv) ? out.inv : [];
  out.quests = Array.isArray(out.quests) ? out.quests : [];

  out.sheet = Object.assign({}, base.sheet, (out.sheet && typeof out.sheet === "object") ? out.sheet : {});
  out.sheet.locked = !!out.sheet.locked;

  // numbers safe
  out.sheet.hpMax = Number.isFinite(+out.sheet.hpMax) ? +out.sheet.hpMax : base.sheet.hpMax;
  out.sheet.sanMax = Number.isFinite(+out.sheet.sanMax) ? +out.sheet.sanMax : base.sheet.sanMax;
  out.sheet.hpMax = Math.max(1, out.sheet.hpMax);
  out.sheet.sanMax = Math.max(1, out.sheet.sanMax);

  out.sheet.hp = Number.isFinite(+out.sheet.hp) ? +out.sheet.hp : base.sheet.hp;
  out.sheet.san = Number.isFinite(+out.sheet.san) ? +out.sheet.san : base.sheet.san;

  out.sheet.wounds = typeof out.sheet.wounds === "string" ? out.sheet.wounds : "";
  out.sheet.troubles = typeof out.sheet.troubles === "string" ? out.sheet.troubles : "";

  // stats normalize
  out.sheet.stats = (out.sheet.stats && typeof out.sheet.stats === "object") ? out.sheet.stats : {};
  ["for","dex","end","int","intu"].forEach(k => {
    const cur = out.sheet.stats[k] && typeof out.sheet.stats[k] === "object" ? out.sheet.stats[k] : base.sheet.stats[k];
    const max = Math.max(1, Number.isFinite(+cur.max) ? +cur.max : base.sheet.stats[k].max);
    const v = Number.isFinite(+cur.v) ? +cur.v : base.sheet.stats[k].v;
    out.sheet.stats[k] = { v: Math.max(0, Math.min(v, max)), max };
  });

  out.sheet.skills = (out.sheet.skills && typeof out.sheet.skills === "object") ? out.sheet.skills : {};
  out.sheet.specials = Array.isArray(out.sheet.specials) ? out.sheet.specials : [];

  out.sheet.combat = Object.assign({}, base.sheet.combat, out.sheet.combat || {});
  out.sheet.combat.w1 = Object.assign({}, base.sheet.combat.w1, out.sheet.combat.w1 || {});
  out.sheet.combat.w2 = Object.assign({}, base.sheet.combat.w2, out.sheet.combat.w2 || {});

  return out;
}

// API
export function getProfiles(){ return store.get(PROFILES_KEY, []); }
export function setProfiles(arr){ store.set(PROFILES_KEY, arr); }
export function getActiveId(){ return store.get(ACTIVE_KEY, null); }
export function setActiveId(id){ store.set(ACTIVE_KEY, id); }
export function profileKey(id){ return `pipboy_profile_${id}`; }

export function getProfileData(id){
  return normalizeProfileData(store.get(profileKey(id), defaultProfileData()));
}

export function setProfileData(id, data){
  store.set(profileKey(id), normalizeProfileData(data));
}

export function ensureActiveProfile(){
  const profiles = getProfiles();
  let activeId = getActiveId();

  // create first profile
  if (!profiles.length) {
    const id = uid();
    setProfiles([{ id, name: "P1", campaign: "ORION", createdAt: new Date().toISOString() }]);
    setActiveId(id);
    setProfileData(id, defaultProfileData());
    return id;
  }

  // choose valid active
  if (!activeId || !profiles.find(p => p.id === activeId)) {
    activeId = profiles[0].id;
    setActiveId(activeId);
  }

  // ensure profile data exists
  const key = profileKey(activeId);
  const existing = store.get(key, null);
  if (!existing) setProfileData(activeId, defaultProfileData());

  return activeId;
}

export function initProfiles({ APP_VERSION }){
  ensureActiveProfile();
  refreshProfilesUI(APP_VERSION);

  const sel = $("profileSelect");
  if (sel) {
    sel.addEventListener("change", () => {
      setActiveId(sel.value);
      refreshProfilesUI(APP_VERSION);
      document.dispatchEvent(new CustomEvent("pipboy:profile-changed"));
    });
  }
}

export function refreshProfilesUI(APP_VERSION){
  const profiles = getProfiles();
  const id = ensureActiveProfile();
  const meta = profiles.find(p => p.id === id) || profiles[0];

  const sel = $("profileSelect");
  if (sel){
    sel.innerHTML = "";
    profiles.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name;
      if (p.id === id) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  if ($("activeProfileHint")) {
    $("activeProfileHint").textContent =
      `PROFIL: ${meta?.name ?? "?"} • ${meta?.campaign ?? "—"} • LOCAL SAVE • ${APP_VERSION}`;
  }
  if ($("profileMiniLine")) $("profileMiniLine").textContent = `Campagne: ${meta?.campaign ?? "—"}`;
  if ($("profileNameSvg")) $("profileNameSvg").textContent = meta?.name ?? "P1";
}
