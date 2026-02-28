import { initBootOncePerSession, initClock, initTabs, initEscClose } from "./ui.js";
import { initProfiles, loadActiveProfileToUI, setOnProfileChanged } from "./profiles.js";

// Les modules suivants, on les branchera juste après
import { initArchivesModal, closeArchivesModal, renderArchives, loadDraftToUI } from "./journal.js";
import { initIOModal, closeIOModal } from "./io.js"; // (à créer ensuite)
import { initSheet, loadSheetToUI } from "./sheet.js";
import { initInv, renderInv } from "./inv.js";
import { initQuests, renderQuests } from "./quests.js";
import { registerSW } from "./pwa.js";

initBootOncePerSession();
initClock();
initTabs();

const { closeProfileModal } = initProfiles();
initArchivesModal();
initIOModal();
initSheet();
initInv();
initQuests();

setOnProfileChanged(() => {
  // appelé à chaque changement profil + au démarrage
  loadDraftToUI();
  renderArchives();
  renderInv();
  renderQuests();
  loadSheetToUI();
});

initEscClose({
  closeArchives: closeArchivesModal,
  closeIO: closeIOModal,
  closeProfile: closeProfileModal
});

loadActiveProfileToUI();
registerSW();
