// features/quests.js
import { $ } from "../js/core/dom.js";
import { escapeHtml } from "../js/core/utils.js";
import { ensureActiveProfile, getProfileData, setProfileData } from "./profiles.js";

function uid() {
  return "q_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}

function getQuestData() {
  const id = ensureActiveProfile();
  const data = getProfileData(id);
  data.quests = Array.isArray(data.quests) ? data.quests : [];
  return { id, data, quests: data.quests };
}

function setQuestData(quests) {
  const { id, data } = getQuestData();
  data.quests = quests;
  setProfileData(id, data);
}

function newQuest(title) {
  return { id: uid(), title, status: "EN_COURS", notes: "", objectives: [] };
}

function renderQuests() {
  const questsBox = $("quests");
  if (!questsBox) return;

  const questFilter = $("questFilter");
  const questCounts = $("questCounts");

  const mode = questFilter ? questFilter.value : "BOARD";
  const { quests } = getQuestData();

  const cEn = quests.filter((q) => q.status === "EN_COURS").length;
  const cOk = quests.filter((q) => q.status === "OK").length;
  const cRa = quests.filter((q) => q.status === "RATEE").length;
  if (questCounts) questCounts.textContent = `EN COURS (${cEn}) • OK (${cOk}) • RATÉE (${cRa})`;

  const statusLabel = { EN_COURS: "EN COURS", OK: "OK", RATEE: "RATÉE" };
  const order = { EN_COURS: 0, OK: 1, RATEE: 2 };

  let shown = quests.slice();
  if (mode === "BOARD") {
    shown.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
  } else if (mode !== "ALL") {
    shown = shown.filter((q) => q.status === mode);
  }

  if (shown.length === 0) {
    questsBox.innerHTML = `<p class="hint">Aucune quête pour ce profil (ou filtre vide).</p>`;
    return;
  }

  let html = "";
  let lastStatus = null;

  for (const q of shown) {
    if (mode === "BOARD" && q.status !== lastStatus) {
      lastStatus = q.status;
      html += `
        <div class="questSection">
          <div class="questSectionTitle">${statusLabel[q.status] ?? q.status}</div>
        </div>
      `;
    }

    const obj = Array.isArray(q.objectives) ? q.objectives : [];
    const objHtml = obj
      .map(
        (o) => `
        <li class="objLine">
          <label class="objLabel">
            <input type="checkbox" data-act="toggleObj" data-q="${q.id}" data-o="${o.id}" ${o.done ? "checked" : ""}>
            <span>${escapeHtml(o.text)}</span>
          </label>
          <button class="mini" type="button" data-act="delObj" data-q="${q.id}" data-o="${o.id}">X</button>
        </li>
      `
      )
      .join("");

    html += `
      <div class="quest" data-q="${q.id}">
        <div class="questHead">
          <div class="questTitle">${escapeHtml(q.title)}</div>
          <button class="mini danger" type="button" data-act="delQuest" data-q="${q.id}">SUPPR</button>
        </div>

        <div class="row">
          <select data-act="setStatus" data-q="${q.id}">
            <option value="EN_COURS" ${q.status === "EN_COURS" ? "selected" : ""}>EN COURS</option>
            <option value="OK" ${q.status === "OK" ? "selected" : ""}>OK</option>
            <option value="RATEE" ${q.status === "RATEE" ? "selected" : ""}>RATÉE</option>
          </select>
        </div>

        <textarea rows="3" placeholder="Notes…" data-act="notes" data-q="${q.id}">${escapeHtml(q.notes || "")}</textarea>

        <div class="row">
          <input type="text" placeholder="Ajouter un objectif…" data-act="objInput" data-q="${q.id}">
          <button type="button" data-act="addObj" data-q="${q.id}">+</button>
        </div>

        <ul class="objList">${objHtml || `<li class="hint">Aucun objectif.</li>`}</ul>
      </div>
    `;
  }

  questsBox.innerHTML = html;
}

function addQuest() {
  const questTitle = $("questTitle");
  const title = questTitle ? questTitle.value.trim() : "";
  if (!title) return;

  const { quests } = getQuestData();
  quests.unshift(newQuest(title));
  setQuestData(quests);

  if (questTitle) questTitle.value = "";
  renderQuests();
}

function clearDoneObjectives() {
  const { quests } = getQuestData();
  quests.forEach((q) => {
    q.objectives = (Array.isArray(q.objectives) ? q.objectives : []).filter((o) => !o.done);
  });
  setQuestData(quests);
  renderQuests();
}

export function initQuests() {
  $("addQuest")?.addEventListener("click", addQuest);
  $("questTitle")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addQuest();
  });

  $("questFilter")?.addEventListener("change", renderQuests);
  $("clearDoneObjectives")?.addEventListener("click", clearDoneObjectives);

  const questsBox = $("quests");
  if (questsBox) {
    questsBox.addEventListener("click", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;

      const act = t.getAttribute("data-act");
      const qid = t.getAttribute("data-q");
      const oid = t.getAttribute("data-o");

      if (!act || !qid) return;

      const { quests } = getQuestData();
      const q = quests.find((x) => x.id === qid);
      if (!q) return;

      if (act === "delQuest") {
        setQuestData(quests.filter((x) => x.id !== qid));
        renderQuests();
        return;
      }

      if (act === "addObj") {
        const input = questsBox.querySelector(`input[data-act="objInput"][data-q="${qid}"]`);
        const text = input && input.value ? input.value.trim() : "";
        if (!text) return;

        q.objectives = Array.isArray(q.objectives) ? q.objectives : [];
        q.objectives.push({ id: uid(), text, done: false });

        setQuestData(quests);
        renderQuests();
        return;
      }

      if (act === "delObj" && oid) {
        q.objectives = (Array.isArray(q.objectives) ? q.objectives : []).filter((o) => o.id !== oid);
        setQuestData(quests);
        renderQuests();
        return;
      }
    });

    questsBox.addEventListener("change", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;

      const act = t.getAttribute("data-act");
      const qid = t.getAttribute("data-q");
      const oid = t.getAttribute("data-o");
      if (!act || !qid) return;

      const { quests } = getQuestData();
      const q = quests.find((x) => x.id === qid);
      if (!q) return;

      if (act === "setStatus" && t instanceof HTMLSelectElement) {
        q.status = t.value;
        setQuestData(quests);
        renderQuests();
        return;
      }

      if (act === "toggleObj" && t instanceof HTMLInputElement && oid) {
        q.objectives = Array.isArray(q.objectives) ? q.objectives : [];
        const o = q.objectives.find((x) => x.id === oid);
        if (o) o.done = !!t.checked;
        setQuestData(quests);
        renderQuests();
        return;
      }
    });

    // notes: sauvegarde au blur
    questsBox.addEventListener(
      "blur",
      (e) => {
        const t = e.target;
        if (!(t instanceof HTMLElement)) return;

        const act = t.getAttribute("data-act");
        const qid = t.getAttribute("data-q");
        if (act !== "notes" || !qid) return;

        const { quests } = getQuestData();
        const q = quests.find((x) => x.id === qid);
        if (!q || !(t instanceof HTMLTextAreaElement)) return;

        q.notes = t.value;
        setQuestData(quests);
      },
      true
    );
  }

  document.addEventListener("pipboy:profile-changed", renderQuests);

  renderQuests();
}
