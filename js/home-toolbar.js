// home-toolbar.js: the masthead buttons of the habits page (language, sound, sync panel,
// export, import, reset). Pure wiring: every button calls back into app.js.

/**
 * @typedef {object} HomeToolbarActions
 * @property {() => void} onLanguage
 * @property {() => void} onSound
 * @property {() => void} onSyncToggle
 * @property {() => void} onExport
 * @property {(file: File) => void} onImport
 * @property {() => void} onReset
 */

/**
 * @param {Document} document
 * @param {HomeToolbarActions} actions
 * @example bindHomeToolbar(document, { onLanguage, onSound, onSyncToggle, onExport, onImport, onReset })
 */
export function bindHomeToolbar(document, actions) {
  document.getElementById("lang-toggle")?.addEventListener("click", actions.onLanguage);
  document.getElementById("sound-toggle")?.addEventListener("click", actions.onSound);
  document.getElementById("sync-toggle")?.addEventListener("click", actions.onSyncToggle);
  document.getElementById("export-button")?.addEventListener("click", actions.onExport);
  document.getElementById("reset-button")?.addEventListener("click", actions.onReset);
  document.getElementById("import-input")?.addEventListener("change", (event) => {
    const input = /** @type {HTMLInputElement} */ (event.target);
    const file = input.files?.[0];
    input.value = "";
    if (file) actions.onImport(file);
  });
}

/**
 * Shows or hides the sync panel and keeps the toggle's aria-expanded in step.
 * @param {Document} document
 * @returns {boolean} whether the panel is now visible
 */
export function toggleSyncPanel(document) {
  const panel = /** @type {HTMLElement} */ (document.getElementById("sync-panel"));
  panel.hidden = !panel.hidden;
  document.getElementById("sync-toggle")?.setAttribute("aria-expanded", String(!panel.hidden));
  return !panel.hidden;
}
