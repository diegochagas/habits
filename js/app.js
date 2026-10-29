// app.js: wires DOM events to the pure modules on the habits page: the list (filters, add,
// edit, done/remove, import/export), the hero's Today and Sheet tabs, and the Pomodoro.
// State lives here; everything else is a function. The saved state comes from the server
// (state-storage.js) when there is one, from localStorage otherwise.

import { downloadItemsJson, readItemsJson } from "./export-import.js";
import { DEFAULT_FILTER, countByCategory, visibleItems } from "./filters.js";
import { applyTranslations, nextLang, translate } from "./i18n.js";
import { bindHomeToolbar, toggleSyncPanel } from "./home-toolbar.js";
import {
  createItem,
  createItemStore,
  isHabit,
  parseItemList,
  removeItem,
  rollDailyItems,
  toggleDone,
  updateItem,
} from "./items-store.js";
import { itemFieldsFromForm, renderHabitFields, renderItemEditor, toggleHabitFields } from "./render-item-editor.js";
import { renderCategoryOptions, renderCategoryTabs, renderItemGrid } from "./render-items.js";
import { connectStateStorage } from "./state-storage.js";
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
import { startSheetSync } from "./sync/sync-app.js";
import { createSyncStore } from "./sync/sync-store.js";

const LANG_KEY = "habits:lang";
const TAB_KEY = "habits:home-tab";
const SEED_URL = "data/seed.json";
const DAILY_ROLL_MS = 60_000;
const params = new URLSearchParams(location.search);

// The server's state when served by server/, this browser's localStorage otherwise.
const storage = await connectStateStorage({ document });
const store = createItemStore(storage);
const sounds = createSoundBoard(() => new AudioContext(), localStorage);
/** @returns {string} */
const today = () => new Date().toISOString().slice(0, 10);
/** @type {{ items: import("./items-store.js").HabitItem[], filter: import("./filters.js").ListFilter, lang: import("./i18n.js").Lang, tab: string, notice: string, editingId: string | null }} */
const state = {
  items: [],
  filter: { ...DEFAULT_FILTER },
  lang: loadLang(),
  tab: loadTab(),
  notice: "",
  editingId: null,
};

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
  store: createHeroStore(storage),
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
  store: createPomodoroStore(storage),
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

const sync = startSheetSync({
  store: createSyncStore(storage),
  panel: /** @type {HTMLElement} */ (document.getElementById("sync-panel")),
  items: () => state.items,
  lang: () => state.lang,
  today,
  applyItems: (items, renamed) => {
    pomodoro.renameItems(renamed);
    state.items = items;
    store.save(items);
    hero.creditList(items);
    render();
  },
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
  const editing = state.items.find((item) => item.id === state.editingId);
  grid.innerHTML = renderItemGrid(shown, state.lang, {
    pomodoros: pomodoro.state.pomodoros,
    pomodoroLabel: pomodoroText(state.lang, "startPomodoro"),
    editingId: state.editingId,
    editor: editing ? renderItemEditor(editing, state.lang) : "",
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
  if (state.tab === "today")
    heroMain.innerHTML = renderTodayView(hero.hero, state.lang, today(), todayHabits(state.items));
  if (state.tab === "sheet") heroMain.innerHTML = renderSheetView(hero.hero, state.lang);
}

/**
 * The Today tab's habits: the Today items, to do first.
 * @param {import("./items-store.js").HabitItem[]} items
 * @returns {import("./items-store.js").HabitItem[]}
 */
function todayHabits(items) {
  const habits = items.filter(isHabit);
  return [...habits.filter((item) => !item.done), ...habits.filter((item) => item.done)];
}

/** @param {import("./items-store.js").HabitItem[]} items */
function commit(items) {
  const before = state.items;
  state.items = items;
  store.save(items);
  hero.creditList(items);
  render();
  sync.afterChange(before, items);
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
  /** @type {HTMLElement} */ (document.getElementById("add-habit-fields")).innerHTML = renderHabitFields(state.lang);
  toggleHabitFields(form);
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
  const result = createItem(itemFieldsFromForm(form), {
    id: () => `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    now: () => new Date(),
  });
  if ("error" in result) return showFormError(translate(state.lang, result.error));
  showFormError("");
  form.reset();
  toggleHabitFields(form);
  sounds.play("decision");
  commit([result.item, ...state.items]);
}

/** The category of the add form or an editor changed: track + XP show for Today only. @param {Event} event */
function onCategoryChange(event) {
  const select = /** @type {HTMLElement} */ (event.target);
  if (select.matches("select[name='category']") && select.closest("form")) {
    toggleHabitFields(/** @type {HTMLFormElement} */ (select.closest("form")));
  }
}

/** The inline editor of a card was submitted. @param {SubmitEvent} event */
function onEditSubmit(event) {
  const editor = /** @type {HTMLFormElement} */ (event.target);
  if (editor.dataset.form !== "edit-item" || !state.editingId) return;
  event.preventDefault();
  const result = updateItem(state.items, state.editingId, itemFieldsFromForm(editor));
  const error = /** @type {HTMLElement | null} */ (editor.querySelector("[data-edit-error]"));
  if ("error" in result) {
    if (error) error.textContent = translate(state.lang, result.error);
    if (error) error.hidden = false;
    return;
  }
  state.editingId = null;
  sounds.play("decision");
  commit(result.items);
}

/** Daily items done on an earlier day come back; runs at start, every minute and on return. */
function rollDaily() {
  const rolled = rollDailyItems(state.items, today());
  if (rolled.changed > 0) commit(rolled.items);
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
  const action = button.dataset.action;
  if (action === "pomodoro") return pomodoro.startOn(id);
  if (action === "toggle") return commit(toggleDone(state.items, id, today()));
  if (action === "edit" || action === "cancel-edit") {
    state.editingId = action === "edit" ? id : null;
    sounds.play("cursor");
    return render();
  }
  if (action === "remove" && confirm(translate(state.lang, "removeConfirm"))) commit(removeItem(state.items, id));
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
  if (button.dataset.action === "done-item") return onTodayHabitDone(button.dataset.id ?? "");
  hero.handleAction(button);
}

/** A Today habit pressed on the Today tab: done for today (the list card greys out). */
function onTodayHabitDone(id) {
  const item = state.items.find((entry) => entry.id === id);
  if (!item || item.done) return;
  sounds.play("habitGood");
  commit(toggleDone(state.items, id, today()));
}

/** @param {File} file */
async function onImport(file) {
  const result = await readItemsJson(file);
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
  document.addEventListener("change", onCategoryChange);
  grid.addEventListener("click", onGridClick);
  grid.addEventListener("submit", onEditSubmit);
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
  bindHomeToolbar(document, {
    onLanguage: () => {
      state.lang = nextLang(state.lang);
      localStorage.setItem(LANG_KEY, state.lang);
      renderLanguage();
    },
    onSound: () => {
      sounds.toggle();
      sounds.play("decision");
      renderSoundToggle();
    },
    onSyncToggle: () => {
      toggleSyncPanel(document);
      sync.render();
    },
    onExport: () => downloadItemsJson(state.items, document),
    onImport,
    onReset,
  });
}

let tick = 0;
function animate() {
  tick += 1;
  hero.drawPortraitFrame(tick);
  requestAnimationFrame(animate);
}

async function start() {
  bindEvents();
  if (storage.kind === "server") document.querySelector(".colophon span")?.setAttribute("data-i18n", "footerServer");
  renderLanguage();
  state.items = store.load() ?? (await fetchSeed());
  store.save(state.items);
  hero.creditList(state.items);
  render();
  rollDaily();
  setInterval(rollDaily, DAILY_ROLL_MS);
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && rollDaily());
  animate();
  sync.syncNow();
}

start();
