// features/io.js
import { $ } from "../js/core/dom.js";
import { escapeHtml } from "../js/core/utils.js";
import {
  ensureActiveProfile,
  getProfiles,
  setProfiles,
  getActiveId,
  setActiveId,
  getProfileData,
  setProfileData,
  deleteProfileData,
} from "./profiles.js";

/** Petit uid dédié (évite collision avec quests uid) */
function uid() {
  return "io_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}

/** ---- Diagnostic ---- */
function copyDiagnostic(APP_VERSION) {
  const id = ensureActiveProfile();
  const profiles = getProfiles();
  const meta = profiles.find((p) => p.id === id);
  const data = getProfileData(id);

  const sh = data.sheet || {};
  const quests = Array.isArray(data.quests) ? data.quests : [];
  const cEn = quests.filter((x) => x.status === "EN_COURS").length;
  const cOk = quests.filter((x) => x.status === "OK").length;
  const cRa = quests.filter((x) => x.status === "RATEE").length;

  const diag = [
    `PIPBOY ${APP_VERSION}`,
    `Profil: ${(meta && meta.name) ? meta.name : "?"} (${id || "no-id"})`,
    `Campagne: ${(meta && meta.campaign) ? meta.campaign : "—"}`,
    `PV: ${(sh.hp ?? "?")}/${(sh.hpMax ?? "?")} | SAN: ${(sh.san ?? "?")}/${(sh.sanMax ?? "?")}`,
    `Quetes: EN_COURS ${cEn} | OK ${cOk} | RATEE ${cRa}`,
    `URL: ${location.href}`,
    `UA: ${navigator.userAgent}`,
  ].join("\n");

  return navigator.clipboard.writeText(diag);
}

/** ---- EXPORT helpers ---- */
function downloadJson(filename, jsonString) {
  try {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    // silent
  }
}

function safeSlug(s) {
  return String(s || "profil")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** ---- Import / Export (All) ---- */
function exportAll() {
  const payload = {
    v: 3,
    exportedAt: new Date().toISOString(),
    activeProfileId: getActiveId(),
    profiles: getProfiles(),
    dataByProfile: {},
  };

  payload.profiles.forEach((p) => {
    payload.dataByProfile[p.id] = getProfileData(p.id);
  });

  const box = $("backupBox");
  const json = JSON.stringify(payload, null, 2);
  if (box) box.value = json;

  downloadJson(`pipboy-backup-${new Date().toISOString().slice(0, 10)}.json`, json);
}

function applyImportAllFromText(text) {
  const box = $("backupBox");
  if (box) box.value = text;

  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    alert("JSON invalide 😵‍💫");
    return;
  }

  if (!obj || typeof obj !== "object") {
    alert("JSON invalide");
    return;
  }

  // Cas 1 : Full backup
  if (Array.isArray(obj.profiles) && obj.dataByProfile && typeof obj.dataByProfile === "object") {
    const incomingProfiles = obj.profiles
      .filter((p) => p && typeof p === "object" && typeof p.id === "string" && p.id.trim().length > 0)
      .map((p) => ({
        id: p.id,
        name: (typeof p.name === "string" && p.name.trim()) ? p.name.trim() : "Profil",
        campaign: (typeof p.campaign === "string") ? p.campaign.trim() : "",
        createdAt: p.createdAt || new Date().toISOString(),
      }));

    if (incomingProfiles.length === 0) {
      alert("Backup invalide: aucun profil détecté.");
      return;
    }

    setProfiles(incomingProfiles);

    incomingProfiles.forEach((p) => {
      const d = obj.dataByProfile[p.id];
      setProfileData(p.id, d || {});
    });

    const requestedActive = typeof obj.activeProfileId === "string" ? obj.activeProfileId : null;
    const activeOk = requestedActive && incomingProfiles.some((p) => p.id === requestedActive);
    setActiveId(activeOk ? requestedActive : incomingProfiles[0].id);

    document.dispatchEvent(new CustomEvent("pipboy:profile-changed"));
    alert("Import complet appliqué ✅");
    return;
  }

  // Cas 2 : Import “profil-like” vers profil actif
  if (obj.sheet || obj.log || obj.logDraft || obj.inv || obj.quests || obj.logEntries) {
    const id = ensureActiveProfile();
    const data = getProfileData(id);

    if (typeof obj.logDraft === "string") data.logDraft = obj.logDraft;
    else if (typeof obj.log === "string") data.logDraft = obj.log;

    if (Array.isArray(obj.logEntries)) data.logEntries = obj.logEntries;
    if (Array.isArray(obj.inv)) data.inv = obj.inv;
    if (Array.isArray(obj.quests)) data.quests = obj.quests;
    if (obj.sheet && typeof obj.sheet === "object") data.sheet = obj.sheet;

    setProfileData(id, data);
    document.dispatchEvent(new CustomEvent("pipboy:profile-changed"));
    alert("Import appliqué sur le profil actif ✅");
    return;
  }

  alert("Format non reconnu 😵‍💫");
}

/** ---- Profil actif ---- */
function exportActiveProfile() {
  const id = ensureActiveProfile();
  const box = $("backupProfileBox");
  if (!box) return;

  const profiles = getProfiles();
  const meta = profiles.find((p) => p.id === id) || { id, name: "Profil", campaign: "", createdAt: "" };

  const payload = {
    v: 2,
    exportedAt: new Date().toISOString(),
    profile: meta,
    data: getProfileData(id),
  };

  const json = JSON.stringify(payload, null, 2);
  box.value = json;

  const safeName = safeSlug(meta.name);
  downloadJson(`pipboy-${safeName}-${new Date().toISOString().slice(0, 10)}.json`, json);
}

function applyImportActiveFromText(text) {
  const id = ensureActiveProfile();
  const box = $("backupProfileBox");
  if (box) box.value = text;

  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    alert("JSON invalide 😵‍💫");
    return;
  }

  let data = null;
  let meta = null;

  if (obj && typeof obj === "object" && obj.data && typeof obj.data === "object") {
    data = obj.data;
    if (obj.profile && typeof obj.profile === "object") meta = obj.profile;
  } else if (obj && typeof obj === "object" && (obj.sheet || obj.log || obj.logDraft || obj.inv || obj.quests || obj.logEntries)) {
    data = {
      logDraft: (typeof obj.logDraft === "string") ? obj.logDraft : (typeof obj.log === "string" ? obj.log : ""),
      logEntries: Array.isArray(obj.logEntries) ? obj.logEntries : [],
      inv: Array.isArray(obj.inv) ? obj.inv : [],
      quests: Array.isArray(obj.quests) ? obj.quests : [],
      sheet: (obj.sheet && typeof obj.sheet === "object") ? obj.sheet : {},
    };
  }

  if (!data) {
    alert("Format non reconnu 😵‍💫");
    return;
  }

  setProfileData(id, data);

  // nom/campagne si fourni
  if (meta && (meta.name || meta.campaign)) {
    const profiles = getProfiles();
    const p = profiles.find((x) => x.id === id);
    if (p) {
      if (typeof meta.name === "string" && meta.name.trim()) p.name = meta.name.trim();
      if (typeof meta.campaign === "string") p.campaign = meta.campaign.trim();
      setProfiles(profiles);
    }
  }

  document.dispatchEvent(new CustomEvent("pipboy:profile-changed"));
  alert("Profil actif mis à jour ✅ (nom/campagne inclus si présents)");
}

/** ---- Pack MJ ---- */
function normalizeQuest(q) {
  const out = Object.assign(
    { id: uid(), title: "", status: "EN_COURS", notes: "", objectives: [], mj: {} },
    q || {}
  );
  out.objectives = Array.isArray(out.objectives) ? out.objectives : [];
  out.mj = out.mj && typeof out.mj === "object" ? out.mj : {};
  return out;
}

function mergeObjectives(existing, incoming) {
  const ex = Array.isArray(existing) ? existing : [];
  const inc = Array.isArray(incoming) ? incoming : [];

  const exById = new Map(ex.filter((o) => o && o.id).map((o) => [o.id, o]));
  const merged = [];

  for (const o of inc) {
    const obj = Object.assign({ id: uid(), text: "", done: false }, o || {});
    const same = obj.id ? exById.get(obj.id) : null;
    if (same) {
      merged.push({ id: obj.id, text: obj.text ?? same.text ?? "", done: !!same.done });
    } else {
      merged.push({ id: obj.id, text: obj.text ?? "", done: !!obj.done });
    }
  }

  const incIds = new Set(merged.map((x) => x.id));
  for (const o of ex) {
    if (o && o.id && !incIds.has(o.id)) {
      merged.push({ id: o.id, text: o.text ?? "", done: !!o.done });
    }
  }

  return merged;
}

function mergeQuests(existingQuests, incomingQuests) {
  const ex = (Array.isArray(existingQuests) ? existingQuests : []).map(normalizeQuest);
  const inc = (Array.isArray(incomingQuests) ? incomingQuests : []).map(normalizeQuest);

  const exById = new Map(ex.filter((q) => q.id).map((q) => [q.id, q]));
  const merged = [];

  for (const q of inc) {
    const same = q.id ? exById.get(q.id) : null;
    if (same) {
      merged.push({
        id: q.id,
        title: q.title || same.title,
        status: same.status || q.status || "EN_COURS",
        notes: (same.notes && String(same.notes).trim().length > 0) ? same.notes : (q.notes || ""),
        objectives: mergeObjectives(same.objectives, q.objectives),
        mj: Object.assign({}, same.mj || {}, q.mj || {}),
      });
    } else {
      merged.push(q);
    }
  }

  const incIds = new Set(merged.map((x) => x.id));
  for (const q of ex) {
    if (q && q.id && !incIds.has(q.id)) merged.push(q);
  }

  return merged;
}

function exportPackActive() {
  const id = ensureActiveProfile();
  const box = $("packProfileBox");
  if (!box) return;

  const profiles = getProfiles();
  const meta = profiles.find((p) => p.id === id) || { id, name: "Profil", campaign: "" };
  const data = getProfileData(id);

  const payload = {
    kind: "pipboy_pack_mj",
    v: 3,
    exportedAt: new Date().toISOString(),
    campaignId: (meta.campaign || "").trim() || "ORION",
    targetProfileName: meta.name,
    briefing: "",
    quests: (Array.isArray(data.quests) ? data.quests : []).map(normalizeQuest),
  };

  const json = JSON.stringify(payload, null, 2);
  box.value = json;

  const safeName = safeSlug(meta.name);
  downloadJson(`pipboy-pack-${safeName}-${new Date().toISOString().slice(0, 10)}.json`, json);
}

function applyPackActiveFromText(text) {
  const id = ensureActiveProfile();
  const box = $("packProfileBox");
  if (box) box.value = text;

  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    alert("Pack MJ: JSON invalide 😵‍💫");
    return;
  }

  if (!obj || typeof obj !== "object" || obj.kind !== "pipboy_pack_mj" || !Array.isArray(obj.quests)) {
    alert("Ce JSON n’est pas un Pack MJ PipBoy.");
    return;
  }

  const data = getProfileData(id);
  data.quests = mergeQuests(data.quests, obj.quests);

  if (obj.briefing && String(obj.briefing).trim().length > 0) {
    const stamp = new Date().toISOString().slice(0, 10);
    const header = `[PACK MJ ${obj.campaignId || ""} ${stamp}]`.trim();
    const block = `${header}\n${obj.briefing}\n\n`;
    data.logDraft = block + (data.logDraft || "");
  }

  setProfileData(id, data);
  document.dispatchEvent(new CustomEvent("pipboy:profile-changed"));
  alert("Pack MJ appliqué ✅ (fusion + briefing)");
}

function applyPackAllProfiles() {
  const profiles = getProfiles();
  const box = $("packProfileBox");
  if (!profiles.length || !box) return;

  let obj;
  try {
    obj = JSON.parse(box.value);
  } catch {
    alert("Pack MJ: JSON invalide 😵‍💫");
    return;
  }

  if (!obj || typeof obj !== "object" || obj.kind !== "pipboy_pack_mj" || !Array.isArray(obj.quests)) {
    alert("Ce JSON n’est pas un Pack MJ PipBoy.");
    return;
  }

  const ok = confirm(`Appliquer ce Pack MJ à TOUS les profils de ce téléphone ? (${profiles.length})`);
  if (!ok) return;

  for (const p of profiles) {
    const data = getProfileData(p.id);
    data.quests = mergeQuests(data.quests, obj.quests);

    if (obj.briefing && String(obj.briefing).trim().length > 0) {
      const stamp = new Date().toISOString().slice(0, 10);
      const header = `[PACK MJ ${obj.campaignId || ""} ${stamp}]`.trim();
      const block = `${header}\n${obj.briefing}\n\n`;
      data.logDraft = block + (data.logDraft || "");
    }

    setProfileData(p.id, data);
  }

  document.dispatchEvent(new CustomEvent("pipboy:profile-changed"));
  alert("Pack MJ appliqué à tous les profils ✅");
}

function applyPackCampaign() {
  const profiles = getProfiles();
  const box = $("packProfileBox");
  if (!profiles.length || !box) return;

  let obj;
  try {
    obj = JSON.parse(box.value);
  } catch {
    alert("Pack MJ: JSON invalide 😵‍💫");
    return;
  }

  if (!obj || typeof obj !== "object" || obj.kind !== "pipboy_pack_mj" || !Array.isArray(obj.quests)) {
    alert("Ce JSON n’est pas un Pack MJ PipBoy.");
    return;
  }

  const campaignId = String(obj.campaignId || "").trim();
  if (!campaignId) {
    alert("Pack MJ: campaignId manquant. (Ex: ORION)");
    return;
  }

  const targets = profiles.filter((p) => String(p.campaign || "").trim() === campaignId);
  if (targets.length === 0) {
    alert(`Aucun profil avec la campagne "${campaignId}".`);
    return;
  }

  const ok = confirm(`Appliquer le Pack MJ campagne "${campaignId}" à ${targets.length} profil(s) ?`);
  if (!ok) return;

  for (const p of targets) {
    const data = getProfileData(p.id);
    data.quests = mergeQuests(data.quests, obj.quests);

    if (obj.briefing && String(obj.briefing).trim().length > 0) {
      const stamp = new Date().toISOString().slice(0, 10);
      const header = `[PACK MJ ${campaignId} ${stamp}]`;
      const block = `${header}\n${obj.briefing}\n\n`;
      data.logDraft = block + (data.logDraft || "");
    }

    setProfileData(p.id, data);
  }

  document.dispatchEvent(new CustomEvent("pipboy:profile-changed"));
  alert(`Pack MJ appliqué à la campagne "${campaignId}" ✅`);
}

/** ---- init ---- */
export function initIO({ APP_VERSION }) {
  // Diagnostic
  $("copyDiag")?.addEventListener("click", async () => {
    try {
      await copyDiagnostic(APP_VERSION);
      alert("Diagnostic copié ✅");
    } catch {
      alert("Copie impossible (le navigateur bloque).");
    }
  });

  // Export/Import ALL
  $("exportAll")?.addEventListener("click", exportAll);
  $("clearBox")?.addEventListener("click", () => {
    const box = $("backupBox");
    if (box) box.value = "";
  });

  $("applyImport")?.addEventListener("click", () => {
    const box = $("backupBox");
    if (!box) return;
    applyImportAllFromText(box.value);
  });

  $("fileImport")?.addEventListener("change", async (e) => {
    const input = e.target;
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      applyImportAllFromText(text);
    } catch {
      alert("Impossible de lire le fichier 😵‍💫");
    } finally {
      input.value = "";
    }
  });

  // Export/Import ACTIVE
  $("exportActive")?.addEventListener("click", exportActiveProfile);
  $("clearProfileBox")?.addEventListener("click", () => {
    const box = $("backupProfileBox");
    if (box) box.value = "";
  });

  $("applyImportActive")?.addEventListener("click", () => {
    const box = $("backupProfileBox");
    if (!box) return;
    applyImportActiveFromText(box.value);
  });

  $("fileImportActive")?.addEventListener("change", async (e) => {
    const input = e.target;
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      applyImportActiveFromText(text);
    } catch {
      alert("Impossible de lire le fichier 😵‍💫");
    } finally {
      input.value = "";
    }
  });

  // Pack MJ
  $("exportPackActive")?.addEventListener("click", exportPackActive);

  $("applyPackActive")?.addEventListener("click", () => {
    const box = $("packProfileBox");
    if (!box) return;
    applyPackActiveFromText(box.value);
  });

  $("applyPackAllProfiles")?.addEventListener("click", applyPackAllProfiles);
  $("applyPackCampaign")?.addEventListener("click", applyPackCampaign);

  $("clearPackProfileBox")?.addEventListener("click", () => {
    const box = $("packProfileBox");
    if (box) box.value = "";
  });

  $("fileImportPackActive")?.addEventListener("change", async (e) => {
    const input = e.target;
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      applyPackActiveFromText(text);
    } catch {
      alert("Impossible de lire le pack 😵‍💫");
    } finally {
      input.value = "";
    }
  });

  // réagir aux changements de profil
  document.addEventListener("pipboy:profile-changed", () => {
    // rien à “render” ici, mais on garde un hook si besoin plus tard
  });
}
