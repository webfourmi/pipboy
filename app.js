// js/app.js
import { initBoot } from "./features/boot.js";
import { initTabs } from "./features/tabs.js";
import { initModals } from "./features/modals.js";
import { initProfiles } from "./features/profiles.js";
import { initSheet } from "./features/sheet.js";
import { initJournal } from "./features/journal.js";
import { initInventory } from "./features/inventory.js";
import { initQuests } from "./features/quests.js";
import { initIO } from "./features/io.js";

export const APP_VERSION = "v28";

function init() {
  initBoot();
  initTabs();
  initModals();

  // ordre important: profils avant features qui lisent/écrivent le profil actif
  initProfiles({ APP_VERSION });

  initSheet();
  initJournal();
  initInventory();
  initQuests();
  initIO();

  // SW (si tu veux le garder ici)
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js", { scope: "./" });
  }
}

init();
