// app.js: wires DOM events to the pure modules. State lives here; everything else is a function.

import { downloadItemsJson, readItemsJson } from "./export-import.js";
import { DEFAULT_FILTER, countByCategory, visibleItems } from "./filters.js";
import { applyTranslations, nextLang, translate } from "./i18n.js";
import { createItem, createItemStore, parseItemList, removeItem, toggleDone } from "./items-store.js";
import { renderCategoryOptions, renderCategoryTabs, renderItemGrid } from "./render-items.js";

const LANG_KEY = "manga-habits:lang";
const SEED_URL = "data/seed.json";

const store = createItemStore(localStorage);
/** @type {{ items: import("./items-store.js").HabitItem[], filter: import("./filters.js").ListFilter, lang: import("./i18n.js").Lang }} */
const state = { items: [], filter: { ...DEFAULT_FILTER }, lang: loadLang() };

const grid = /** @type {HTMLElement} */ (document.getElementById("items-grid"));
const tabs = /** @type {HTMLElement} */ (document.getElementById("category-tabs"));
const emptyState = /** @type {HTMLElement} */ (document.getElementById("empty-state"));
const counter = /** @type {HTMLElement} */ (document.getElementById("counter"));
const form = /** @type {HTMLFormElement} */ (document.getElementById("add-form"));
const formError = /** @type {HTMLElement} */ (document.getElementById("form-error"));
const categorySelect = /** @type {HTMLSelectElement} */ (document.getElementById("category-select"));

/** @returns {import("./i18n.js").Lang} */
function loadLang() {
  return localStorage.getItem(LANG_KEY) === "pt" ? "pt" : "en";
}

/** @returns {Promise<import("./items-store.js").HabitItem[]>} */
async function fetchSeed() {
  const response = await fetch(SEED_URL);
  if (!response.ok) throw new Error(`seed ${SEED_URL}: HTTP ${response.status}, expected 200`);
  const parsed = parseItemList(await response.json());
  if ("error" in parsed) throw new Error(`seed ${SEED_URL}: ${parsed.error}`);
  return parsed.items;
}

function render() {
  const shown = visibleItems(state.items, state.filter);
  grid.innerHTML = renderItemGrid(shown, state.lang);
  tabs.innerHTML = renderCategoryTabs(countByCategory(state.items), state.filter.category, state.lang);
  emptyState.hidden = shown.length > 0;
  counter.textContent = translate(state.lang, "counter", { shown: shown.length, total: state.items.length });
}

/** @param {import("./items-store.js").HabitItem[]} items */
function commit(items) {
  state.items = items;
  store.save(items);
  render();
}

function renderLanguage() {
  document.documentElement.lang = state.lang;
  applyTranslations(document, state.lang);
  /** @type {HTMLElement} */ (document.getElementById("lang-toggle")).textContent = state.lang === "en" ? "PT" : "EN";
  const chosen = categorySelect.value;
  categorySelect.innerHTML = renderCategoryOptions(state.lang);
  if (chosen) categorySelect.value = chosen;
  render();
}

/** @param {SubmitEvent} event */
function onAddSubmit(event) {
  event.preventDefault();
  const fields = new FormData(form);
  const result = createItem(
    {
      name: String(fields.get("name") ?? ""),
      category: String(fields.get("category") ?? ""),
      description: String(fields.get("description") ?? ""),
    },
    { id: () => `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, now: () => new Date() },
  );
  if ("error" in result) return showFormError(translate(state.lang, result.error));
  showFormError("");
  form.reset();
  commit([result.item, ...state.items]);
}

/** @param {string} message empty string hides the error */
function showFormError(message) {
  formError.textContent = message;
  formError.hidden = !message;
}

/** @param {MouseEvent} event */
function onGridClick(event) {
  const button = /** @type {HTMLElement} */ (event.target).closest("button[data-action]");
  const card = button?.closest("article[data-id]");
  if (!button || !card) return;
  const id = card.getAttribute("data-id") ?? "";
  if (button.dataset.action === "toggle") return commit(toggleDone(state.items, id));
  if (confirm(translate(state.lang, "removeConfirm"))) commit(removeItem(state.items, id));
}

/** @param {MouseEvent} event */
function onTabClick(event) {
  const tab = /** @type {HTMLElement} */ (event.target).closest("button[data-category]");
  if (!tab) return;
  state.filter.category = /** @type {import("./filters.js").ListFilter["category"]} */ (tab.dataset.category);
  render();
}

/** @param {Event} event */
async function onImportChange(event) {
  const input = /** @type {HTMLInputElement} */ (event.target);
  const file = input.files?.[0];
  if (!file) return;
  const result = await readItemsJson(file);
  input.value = "";
  if ("error" in result) return alert(`${translate(state.lang, "importError")}\n${result.error}`);
  commit(result.items);
}

async function onReset() {
  if (!confirm(translate(state.lang, "resetConfirm"))) return;
  store.clear();
  commit(await fetchSeed());
}

function bindEvents() {
  form.addEventListener("submit", onAddSubmit);
  grid.addEventListener("click", onGridClick);
  tabs.addEventListener("click", onTabClick);
  document.getElementById("search-input")?.addEventListener("input", (event) => {
    state.filter.search = /** @type {HTMLInputElement} */ (event.target).value;
    render();
  });
  document.getElementById("status-select")?.addEventListener("change", (event) => {
    state.filter.status = /** @type {import("./filters.js").ListFilter["status"]} */ (
      /** @type {HTMLSelectElement} */ (event.target).value
    );
    render();
  });
  document.getElementById("lang-toggle")?.addEventListener("click", () => {
    state.lang = nextLang(state.lang);
    localStorage.setItem(LANG_KEY, state.lang);
    renderLanguage();
  });
  document.getElementById("export-button")?.addEventListener("click", () => downloadItemsJson(state.items, document));
  document.getElementById("import-input")?.addEventListener("change", onImportChange);
  document.getElementById("reset-button")?.addEventListener("click", onReset);
}

async function start() {
  bindEvents();
  renderLanguage();
  state.items = store.load() ?? (await fetchSeed());
  store.save(state.items);
  render();
}

start();
