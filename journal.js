import { $, on } from "../core/dom.js";
import { escapeHtml, toDateTimeLocal, fromDateTimeLocal, pad2 } from "../core/utils.js";
import { getProfileData, setProfileData, ensureActiveProfile } from "./profiles.js"; // on va le faire

function formatTs(ts){
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  return `${pad2(d.getDate())}/${pad2(d.getMonth()+1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function getJournalData(){
  const id = ensureActiveProfile();
  if (!id) return { draft:"", entries:[] };
  const data = getProfileData(id);
  return {
    draft: (typeof data.logDraft === "string") ? data.logDraft : "",
    entries: Array.isArray(data.logEntries) ? data.logEntries : []
  };
}

function setJournalData(draft, entries){
  const id = ensureActiveProfile();
  if (!id) return;
  const data = getProfileData(id);
  data.logDraft = (typeof draft === "string") ? draft : "";
  data.logEntries = Array.isArray(entries) ? entries : [];
  setProfileData(id, data);
}

function renderArchives(){
  const box = $("archivesList");
  if (!box) return;

  const { entries } = getJournalData();
  const sorted = entries.slice().sort((a,b)=> (b.ts||0) - (a.ts||0));

  if (sorted.length === 0){
    box.innerHTML = `<p class="hint">Aucune archive pour ce profil.</p>`;
    return;
  }

  box.innerHTML = sorted.map(e => `
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
  `).join("");
}

function initJournalUI(){
  // Valeur par défaut du datetime-local
  if ($("logWhen")) $("logWhen").value = toDateTimeLocal(Date.now());

  // Archiver
  on("saveLog", "click", () => {
    const text = ($("log")?.value || "").trim();
    if (!text) return;

    const whenStr = $("logWhen")?.value || "";
    const ts = whenStr ? fromDateTimeLocal(whenStr) : Date.now();

    const { entries } = getJournalData();
    entries.unshift({ id: crypto.randomUUID?.() || ("j_"+Date.now()), ts, text });

    setJournalData("", entries);

    if ($("log")) $("log").value = "";
    if ($("logWhen")) $("logWhen").value = toDateTimeLocal(Date.now());
    renderArchives();
  });

  // Effacer note active
  on("clearLog", "click", () => {
    const { entries } = getJournalData();
    setJournalData("", entries);
    if ($("log")) $("log").value = "";
    if ($("logWhen")) $("logWhen").value = toDateTimeLocal(Date.now());
  });

  // Ouvrir/fermer archives (le modal)
  on("openArchives", "click", () => { $("archivesModal")?.classList.add("show"); renderArchives(); });
  on("closeArchives", "click", () => { $("archivesModal")?.classList.remove("show"); });
  on("closeArchivesBackdrop", "click", () => { $("archivesModal")?.classList.remove("show"); });

  // Actions liste archives
  $("archivesList")?.addEventListener("click", async (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const act = t.getAttribute("data-act");
    const id = t.getAttribute("data-id");
    if (!act || !id) return;

    const { draft, entries } = getJournalData();
    const item = entries.find(x => x.id === id);
    if (!item) return;

    if (act === "copy"){
      try { await navigator.clipboard.writeText(item.text || ""); } catch {}
      return;
    }
    if (act === "del"){
      if (!confirm("Supprimer cette archive ?")) return;
      setJournalData(draft, entries.filter(x => x.id !== id));
      renderArchives();
    }
  });
}

export function initJournal(){
  initJournalUI();
}

// appelé par profiles.js quand on change de profil
export function loadJournalForProfile(){
  const id = ensureActiveProfile();
  if (!id) return;
  const data = getProfileData(id);

  if ($("log")) $("log").value = data.logDraft ?? "";
  if ($("logWhen")) $("logWhen").value = toDateTimeLocal(Date.now());

  renderArchives();
}
