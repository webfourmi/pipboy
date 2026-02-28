// features/profiles.js
import { store } from "../js/core/store.js";
import { $ } from "../js/core/dom.js";

const PROFILES_KEY = "pipboy_profiles";
const ACTIVE_KEY = "pipboy_active_profile";

function uid(){
  return "p_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}

export function defaultProfileData(){
  return {
    logDraft: "",
    logEntries: [],
    inv: [],
    quests: [],
    sheet: { locked: true }
  };
}

export function getProfiles(){ return store.get(PROFILES_KEY, []); }
export function setProfiles(arr){ store.set(PROFILES_KEY, arr); }
export function getActiveId(){ return store.get(ACTIVE_KEY, null); }
export function setActiveId(id){ store.set(ACTIVE_KEY, id); }
export function profileKey(id){ return `pipboy_profile_${id}`; }

export function getProfileData(id){
  return store.get(profileKey(id), defaultProfileData());
}

export function setProfileData(id, data){
  store.set(profileKey(id), data);
}

export function ensureActiveProfile(){
  const profiles = getProfiles();
  let activeId = getActiveId();

  if (!profiles.length) {
    const id = uid();
    setProfiles([{ id, name: "P1", campaign: "ORION", createdAt: new Date().toISOString() }]);
    setActiveId(id);
    setProfileData(id, defaultProfileData());
    return id;
  }

  if (!activeId || !profiles.find(p => p.id === activeId)) {
    activeId = profiles[0].id;
    setActiveId(activeId);
  }
  return activeId;
}

export function initProfiles({ APP_VERSION }){
  const id = ensureActiveProfile();
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
  const meta = profiles.find(p => p.id === id);

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
