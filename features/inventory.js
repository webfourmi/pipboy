// features/inventory.js
import { $ } from "../js/core/dom.js";
import { escapeHtml } from "../js/core/utils.js";
import { ensureActiveProfile, getProfileData, setProfileData } from "./profiles.js";

function getInv() {
  const id = ensureActiveProfile();
  const data = getProfileData(id);
  data.inv = Array.isArray(data.inv) ? data.inv : [];
  return { id, data };
}

function renderInv() {
  const itemsUl = $("items");
  if (!itemsUl) return;

  const { data } = getInv();
  const arr = data.inv;

  itemsUl.innerHTML = "";

  arr.forEach((txt, idx) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${escapeHtml(txt)}</span>
      <button class="mini" data-i="${idx}" type="button">X</button>
    `;
    itemsUl.appendChild(li);
  });

  itemsUl.querySelectorAll("button.mini[data-i]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.getAttribute("data-i"));
      const { id, data } = getInv();
      data.inv.splice(i, 1);
      setProfileData(id, data);
      renderInv();
    });
  });
}

function addItem() {
  const input = $("itemInput");
  const val = (input ? input.value.trim() : "");
  if (!val) return;

  const { id, data } = getInv();
  data.inv.unshift(val);
  setProfileData(id, data);

  if (input) input.value = "";
  renderInv();
}

function clearInv() {
  const ok = confirm("Vider l’inventaire de ce profil ?");
  if (!ok) return;

  const { id, data } = getInv();
  data.inv = [];
  setProfileData(id, data);
  renderInv();
}

export function initInventory() {
  $("addItem")?.addEventListener("click", addItem);
  $("clearInv")?.addEventListener("click", clearInv);

  // Enter pour ajouter vite
  $("itemInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addItem();
  });

  document.addEventListener("pipboy:profile-changed", renderInv);

  renderInv();
}
