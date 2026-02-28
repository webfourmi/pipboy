import { $, store, uid, APP_VERSION } from "./core.js";

// ===== MULTI-PROFILS =====
export const PROFILES_KEY = "pipboy_profiles";
export const ACTIVE_KEY = "pipboy_active_profile";

export function defaultProfileData(){
  return {
    logDraft: "",
    logEntries: [],
    inv: [],
    quests: [],
    sheet: {
      locked: true,
      hp: 10, hpMax: 10, wounds: "",
      san: 10, sanMax: 10, troubles: "",
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

// Tu reprendras ton normalizeProfileData ici (on le recolle tel quel)
export function normalizeProfileData(d){
  // ⚠️ TEMP: on remettra ton normalize complet juste après
  return Object.assign(defaultProfileData(), d || {});
}

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
export function deleteProfileData(id){ store.del(profileKey(id)); }

function migrateIfNeeded(){
  const profiles = getProfiles();
  if (profiles.length > 0) return;

  const oldLog = store.get("log", null);
  const oldInv = store.get("inv", null);

  const id = uid();
  setProfiles([{ id, name: "P1", campaign: "ORION", createdAt: new Date().toISOString() }]);
  setActiveId(id);

  const data = defaultProfileData();
  if (typeof oldLog === "string") data.logDraft = oldLog;
  if (Array.isArray(oldInv)) data.inv = oldInv;

  setProfileData(id, data);
}

export function ensureActiveProfile(){
  const profiles = getProfiles();
  let activeId = getActiveId();
  if (!activeId || !profiles.find(p => p.id === activeId)){
    activeId = profiles[0]?.id || null;
    if (activeId) setActiveId(activeId);
  }
  return activeId;
}

// Auto-fit SVG (nom long)
function fitSvgText(textEl, maxWidth = 760, maxSize = 72, minSize = 28){
  if (!textEl) return;
  let size = maxSize;
  textEl.setAttribute("font-size", String(size));
  const getW = () => { try { return textEl.getComputedTextLength(); } catch { return 0; } };
  let w = getW();
  let guard = 0;
  while (w > maxWidth && size > minSize && guard < 80){
    size -= 2;
    textEl.setAttribute("font-size", String(size));
    w = getW();
    guard++;
  }
}

export function refreshProfilesUI(){
  const profileSelect = $("profileSelect");
  const profileName = $("profileName");
  const profileCampaign = $("profileCampaign");
  const activeHint = $("activeProfileHint");
  const svgName = $("profileNameSvg");
  const profileMiniLine = $("profileMiniLine");

  const profiles = getProfiles();
  const activeId = getActiveId();

  if (!profileSelect) return;
  profileSelect.innerHTML = "";

  profiles.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    if (p.id === activeId) opt.selected = true;
    profileSelect.appendChild(opt);
  });

  const activeMeta = profiles.find(p => p.id === activeId) || profiles[0];
  if (activeMeta){
    if (profileName) profileName.value = activeMeta.name;
    if (profileCampaign) profileCampaign.value = activeMeta.campaign || "";
    if (activeHint) activeHint.textContent = `PROFIL: ${activeMeta.name} • ${activeMeta.campaign || "—"} • LOCAL SAVE • ${APP_VERSION}`;
    if (profileMiniLine) profileMiniLine.textContent = `Campagne: ${activeMeta.campaign || "—"}`;
    if (svgName) {
      svgName.textContent = activeMeta.name;
      svgName.setAttribute("fill", "#b7ffd9");
      fitSvgText(svgName);
    }
  }
}

// Hooks (on les set depuis app.js)
let onProfileChanged = null;
export function setOnProfileChanged(fn){ onProfileChanged = fn; }

export function loadActiveProfileToUI(){
  ensureActiveProfile();
  refreshProfilesUI();
  onProfileChanged?.();
}

export function initProfiles(){
  migrateIfNeeded();

  const openProfileBtn = $("openProfile");
  const profileModal = $("profileModal");
  const closeProfileBtn = $("closeProfile");
  const closeProfileBackdrop = $("closeProfileBackdrop");

  function openProfileModal(){
    if (!profileModal) return;
    profileModal.classList.add("show");
    profileModal.setAttribute("aria-hidden", "false");
    refreshProfilesUI();
  }
  function closeProfileModal(){
    if (!profileModal) return;
    profileModal.classList.remove("show");
    profileModal.setAttribute("aria-hidden", "true");
  }

  if (openProfileBtn) openProfileBtn.addEventListener("click", openProfileModal);
  if (closeProfileBtn) closeProfileBtn.addEventListener("click", closeProfileModal);
  if (closeProfileBackdrop) closeProfileBackdrop.addEventListener("click", closeProfileModal);

  const profileSelect = $("profileSelect");
  if (profileSelect) profileSelect.addEventListener("change", () => {
    setActiveId(profileSelect.value);
    loadActiveProfileToUI();
  });

  const btnNewProfile = $("newProfile");
  if (btnNewProfile) btnNewProfile.addEventListener("click", () => {
    const profiles = getProfiles();
    const id = uid();
    const name = `P${profiles.length + 1}`;
    profiles.push({ id, name, campaign: "ORION", createdAt: new Date().toISOString() });
    setProfiles(profiles);
    setProfileData(id, defaultProfileData());
    setActiveId(id);
    loadActiveProfileToUI();
  });

  const btnSaveName = $("saveProfileName");
  if (btnSaveName) btnSaveName.addEventListener("click", () => {
    const id = ensureActiveProfile();
    if (!id) return;

    const profileName = $("profileName");
    const profileCampaign = $("profileCampaign");
    const newName = (profileName ? profileName.value : "").trim();
    const newCampaign = (profileCampaign ? profileCampaign.value : "").trim();

    const profiles = getProfiles();
    const p = profiles.find(x => x.id === id);
    if (p) {
      if (newName) p.name = newName;
      p.campaign = newCampaign;
    }
    setProfiles(profiles);
    loadActiveProfileToUI();
  });

  const btnDeleteProfile = $("deleteProfile");
  if (btnDeleteProfile) btnDeleteProfile.addEventListener("click", () => {
    const profiles = getProfiles();
    if (profiles.length <= 1){
      alert("Impossible: il faut garder au moins 1 profil.");
      return;
    }
    const id = ensureActiveProfile();
    const p = profiles.find(x => x.id === id);
    const ok = confirm(`Supprimer le profil "${p ? p.name : id}" ?`);
    if (!ok) return;

    const filtered = profiles.filter(x => x.id !== id);
    setProfiles(filtered);
    deleteProfileData(id);

    setActiveId(filtered[0].id);
    loadActiveProfileToUI();
  });

  // on expose les close pour ESC via app.js si besoin
  return { closeProfileModal };
}
