// app.js: wires DOM events to the pure modules on the habits page: the list (filters, add,
// done/remove, import/export), the hero's Today and Sheet tabs, and the Pomodoro.
// State lives here; everything else is a function.

import { downloadItemsJson, readItemsJson } from "./export-import.js";
import { DEFAULT_FILTER, countByCategory, visibleItems } from "./filters.js";
import { applyTranslations, nextLang, translate } from "./i18n.js";
import { createItem, createItemStore, parseItemList, removeItem, toggleDone } from "./items-store.js";
import { renderCategoryOptions, renderCategoryTabs, renderItemGrid } from "./render-items.js";
import { applyGameTranslations, gameText } from "./game/game-i18n.js";
import { createHeroController } from "./game/hero-controller.js";
import { createHeroStore } from "./game/hero-store.js";
import { renderSheetView } from "./game/sheet-view.js";
import { creditPomodoro } from "./game/progression.js";
import { createSoundBoard } from "./game/sound.js";
import { renderTodayView } from "./game/today-view.js";
import { startPomodoro } from "./pomodoro/pomodoro-app.js";
import { applyPomodoroTranslations, pomodoroText } from "./pomodoro/pomodoro-i18n.js";
import { createPomodoroStore } from "./pomodoro/pomodoro-store.js";

const LANG_KEY = "habits:lang";
const TAB_KEY = "habits:home-tab";
const SEED_URL = "data/seed.json";
const params = new URLSearchParams(location.search);

const store = createItemStore(localStorage);
const sounds = createSoundBoard(() => new AudioContext(), localStorage);
/** @returns {string} */
const today = () => new Date().toISOString().slice(0, 10);
/** @type {{ items: import("./items-store.js").HabitItem[], filter: import("./filters.js").ListFilter, lang: import("./i18n.js").Lang, tab: string, notice: string }} */
const state = { items: [], filter: { ...DEFAULT_FILTER }, lang: loadLang(), tab: loadTab(), notice: "" };

const grid = /** @type {HTMLElement} */ (document.getElementById("items-grid"));
const tabs = /** @type {HTMLElement} */ (document.getElementById("category-tabs"));
const emptyState = /** @type {HTMLElement} */ (document.getElementById("empty-state"));
const counter = /** @type {HTMLElement} */ (document.getElementById("counter"));
const form = /** @type {HTMLFormElement} */ (document.getElementById("add-form"));
const formError = /** @type {HTMLElement} */ (document.getElementById("form-error"));
const categorySelect = /** @type {HTMLSelectElement} */ (document.getElementById("category-select"));
const notice = /** @type {HTMLElement} */ (document.getElementById("game-notice"));
const heroMain = /** @type {HTMLElement} */ (document.getElementById("hero-main"));

const hero = createHeroController({
  store: createHeroStore(localStorage),
  sounds,
  today,
  lang: () => state.lang,
  say,
  onChange: render,
  confirmReset: (message) => confirm(message),
});
const pomodoro = startPomodoro({
  root: /** @type {HTMLElement} */ (document.getElementById("pomodoro-body")),
  videoRoot: /** @type {HTMLElement} */ (document.getElementById("pomodoro-video")),
  store: createPomodoroStore(localStorage),
  sounds,
  lang: () => state.lang,
  items: () => state.items,
  today,
  secondsPerMinute: params.get("fast") ? 0.1 : 60,
  say,
  onChange: () => render(),
  onWorkDone: (itemId) =>
    hero.commit(creditPomodoro(hero.hero, state.items.find((item) => item.id === itemId) ?? null, today())),
});

/** @returns {import("./i18n.js").Lang} */
function loadLang() {
  return localStorage.getItem(LANG_KEY) === "pt" ? "pt" : "en";
}

/** @returns {string} */
function loadTab() {
  const saved = localStorage.getItem(TAB_KEY);
  return saved === "today" || saved === "sheet" ? saved : "list";
}

/** @returns {Promise<import("./items-store.js").HabitItem[]>} */
async function fetchSeed() {
  const response = await fetch(SEED_URL);
  if (!response.ok) throw new Error(`seed ${SEED_URL}: HTTP ${response.status}, expected 200`);
  const parsed = parseItemList(await response.json());
  if ("error" in parsed) throw new Error(`seed ${SEED_URL}: ${parsed.error}`);
  return parsed.items;
}

/** @param {string} message empty hides the notice */
function say(message) {
  state.notice = message;
  notice.textContent = message;
  notice.hidden = !message;
}

function render() {
  const shown = visibleItems(state.items, state.filter);
  grid.innerHTML = renderItemGrid(shown, state.lang, {
    pomodoros: pomodoro.state.pomodoros,
    pomodoroLabel: pomodoroText(state.lang, "startPomodoro"),
  });
  tabs.innerHTML = renderCategoryTabs(countByCategory(state.items), state.filter.category, state.lang);
  emptyState.hidden = shown.length > 0;
  counter.textContent = translate(state.lang, "counter", { shown: shown.length, total: state.items.length });
  renderHeroArea();
  pomodoro.render();
}

function renderHeroArea() {
  hero.renderPanel(/** @type {HTMLElement} */ (document.getElementById("hero-panel")));
  for (const tab of document.querySelectorAll(".game-tabs [data-tab]"))
    tab.classList.toggle("tab-active", tab.getAttribute("data-tab") === state.tab);
  const onList = state.tab === "list";
  /** @type {HTMLElement} */ (document.getElementById("list-section")).hidden = !onList;
  /** @type {HTMLElement} */ (document.getElementById("add-panel")).hidden = !onList;
  heroMain.hidden = onList;
  if (state.tab === "today") heroMain.innerHTML = renderTodayView(hero.hero, state.lang, today());
  if (state.tab === "sheet") heroMain.innerHTML = renderSheetView(hero.hero, state.lang);
}

/** @param {import("./items-store.js").HabitItem[]} items */
function commit(items) {
  state.items = items;
  store.save(items);
  hero.creditList(items);
  render();
}

function renderLanguage() {
  document.documentElement.lang = state.lang;
  applyTranslations(document, state.lang);
  applyGameTranslations(document, state.lang);
  applyPomodoroTranslations(document, state.lang);
  /** @type {HTMLElement} */ (document.getElementById("lang-toggle")).textContent = state.lang === "en" ? "PT" : "EN";
  renderSoundToggle();
  const chosen = categorySelect.value;
  categorySelect.innerHTML = renderCategoryOptions(state.lang);
  if (chosen) categorySelect.value = chosen;
  render();
}

function renderSoundToggle() {
  const toggle = /** @type {HTMLElement} */ (document.getElementById("sound-toggle"));
  toggle.textContent = sounds.enabled() ? "🔊" : "🔇";
  toggle.setAttribute("aria-label", gameText(state.lang, sounds.enabled() ? "soundOn" : "soundOff"));
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
  sounds.play("decision");
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
  if (button.dataset.action === "pomodoro") return pomodoro.startOn(id);
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

/** @param {MouseEvent} event */
function onSectionTabClick(event) {
  const tab = /** @type {HTMLElement} */ (event.target).closest(".game-tabs [data-tab]");
  if (!tab) return;
  state.tab = tab.getAttribute("data-tab") ?? "list";
  localStorage.setItem(TAB_KEY, state.tab);
  say("");
  sounds.play("cursor");
  render();
}

/** @param {MouseEvent} event */
function onHeroClick(event) {
  const button = /** @type {HTMLElement | null} */ (
    /** @type {HTMLElement} */ (event.target).closest("button[data-action]")
  );
  if (!button) return;
  say("");
  hero.handleAction(button);
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
  document.addEventListener("click", onSectionTabClick);
  heroMain.addEventListener("click", onHeroClick);
  document.getElementById("hero-panel")?.addEventListener("click", onHeroClick);
  document.addEventListener("submit", (event) => {
    if (hero.handleSubmit(/** @type {HTMLFormElement} */ (event.target))) event.preventDefault();
  });
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
  bindToolbar();
}

function bindToolbar() {
  document.getElementById("lang-toggle")?.addEventListener("click", () => {
    state.lang = nextLang(state.lang);
    localStorage.setItem(LANG_KEY, state.lang);
    renderLanguage();
  });
  document.getElementById("sound-toggle")?.addEventListener("click", () => {
    sounds.toggle();
    sounds.play("decision");
    renderSoundToggle();
  });
  document.getElementById("export-button")?.addEventListener("click", () => downloadItemsJson(state.items, document));
  document.getElementById("import-input")?.addEventListener("change", onImportChange);
  document.getElementById("reset-button")?.addEventListener("click", onReset);
}

let tick = 0;
function animate() {
  tick += 1;
  hero.drawPortraitFrame(tick);
  requestAnimationFrame(animate);
}

async function start() {
  bindEvents();
  renderLanguage();
  state.items = store.load() ?? (await fetchSeed());
  store.save(state.items);
  commit(state.items);
  animate();
}

start();
