// features/journal.js
import { $, on } from "../js/core/dom.js";
import { escapeHtml, toDateTimeLocal, fromDateTimeLocal, pad2 } from "../js/core/utils.js";
import { ensureActiveProfile, getProfileData, setProfileData } from "./profiles.js";

// Helpers date affichage archive (format lisible)
function formatTs(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function getJournalData() {
  const id = ensureActiveProfile();
  const data = getProfileData(id);

  return {
    draft: typeof data.logDraft === "string" ? data.logDraft : "",
    entries: Array.isArray(data.logEntries) ? data.logEntries : []
  };
}

function setJournalData(draft, entries) {
  const id = ensureActiveProfile();
  const data = getProfileData(id);

  data.logDraft = typeof draft === "string" ? draft : "";
  data.logEntries = Array.isArray(entries) ? entries : [];

  setProfileData(id, data);
}

function uid() {
  return "j_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}

function renderArchives() {
  const box = $("archivesList");
  if (!box) return;

  const { entries } = getJournalData();
  const sorted = entries.slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));

  if (!sorted.length) {
    box.innerHTML = `<p class="hint">Aucune archive pour ce profil.</p>`;
    return;
  }

  box.innerHTML = sorted
    .map(
      (e) => `
      <div class="archItem" data-id="${e.id}">
        <div class="archHead">
          <div class="archDate">${escapeHtml(formatTs(e.ts))}</div>
          <div class="archActions">
            <button class="mini" type="button" data-act="copy" data-id="${e.id}">Copier</button>
            <button class="mini danger" type="button" data-act="del" data-id="${e.id}">X</button>
          </div>
        </div>
        <div class="archText">${escapeHtml(e.text || "")}</div>
      </div>
    `
    )
    .join("");
}

function syncDraftToUI() {
  const { draft } = getJournalData();
  const logEl = $("log");
  if (logEl) logEl.value = draft;

  const whenEl = $("logWhen");
  if (whenEl) whenEl.value = toDateTimeLocal(Date.now());
}

function bindArchiveButtons() {
  // Bouton ARCHIVER
  on($("saveLog"), "click", () => {
    const logEl = $("log");
    const whenEl = $("logWhen");

    const text = (logEl ? logEl.value : "").trim();
    if (!text) return;

    const whenStr = whenEl ? whenEl.value : "";
    const ts = whenStr ? fromDateTimeLocal(whenStr) : Date.now();

    const { entries } = getJournalData();
    entries.unshift({ id: uid(), ts, text });

    // archive + vide note active
    setJournalData("", entries);

    if (logEl) logEl.value = "";
    if (whenEl) whenEl.value = toDateTimeLocal(Date.now());

    renderArchives();
  });

  // Bouton EFFACER (note active)
  on($("clearLog"), "click", () => {
    const { entries } = getJournalData();
    setJournalData("", entries);

    const logEl = $("log");
    if (logEl) logEl.value = "";

    const whenEl = $("logWhen");
    if (whenEl) whenEl.value = toDateTimeLocal(Date.now());
  });

  // Sauvegarde live du brouillon (optionnel mais super pratique)
  // -> ça évite de perdre une note si on ferme l’appli sans archiver
  on($("log"), "input", () => {
    const { entries } = getJournalData();
    const text = $("log") ? $("log").value : "";
    setJournalData(text, entries);
  });
}

function bindArchivesActions() {
  const list = $("archivesList");
  if (!list) return;

  list.addEventListener("click", async (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;

    const act = t.getAttribute("data-act");
    const id = t.getAttribute("data-id");
    if (!act || !id) return;

    const { draft, entries } = getJournalData();
    const item = entries.find((x) => x.id === id);
    if (!item) return;

    if (act === "copy") {
      try {
        await navigator.clipboard.writeText(item.text || "");
        alert("Copié ✅");
      } catch {
        alert("Copie impossible");
      }
      return;
    }

    if (act === "del") {
      const ok = confirm("Supprimer cette archive ?");
      if (!ok) return;

      setJournalData(draft, entries.filter((x) => x.id !== id));
      renderArchives();
      return;
    }
  });

  // Copier tout
  on($("exportArchives"), "click", async () => {
    const { entries } = getJournalData();
    const sorted = entries.slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
    const text = sorted.map((e) => `[${formatTs(e.ts)}]\n${e.text}\n`).join("\n");

    try {
      await navigator.clipboard.writeText(text);
      alert("Archives copiées ✅");
    } catch {
      alert("Copie impossible");
    }
  });

  // Vider archives
  on($("clearArchives"), "click", () => {
    const ok = confirm("Vider toutes les archives de ce profil ?");
    if (!ok) return;

    const { draft } = getJournalData();
    setJournalData(draft, []);
    renderArchives();
  });
}

export function initJournal() {
  // 1) au chargement
  syncDraftToUI();
  renderArchives();

  // 2) bind actions
  bindArchiveButtons();
  bindArchivesActions();

  // 3) quand on change de profil (événement envoyé par profiles.js)
  document.addEventListener("pipboy:profile-changed", () => {
    syncDraftToUI();
    renderArchives();
  });
}
