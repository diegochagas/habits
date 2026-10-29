// pomodoro-app.js: runs the Pomodoro on the habits page: the clock, the panel, the item being
// worked on and the focus-music embed (muted/unmuted through the YouTube player API).

import {
  modeSeconds,
  pauseClock,
  remainingSeconds,
  resetClock,
  rollDay,
  selectMode,
  startClock,
  tickClock,
  formatClock,
} from "./pomodoro-clock.js";
import { pomodoroText } from "./pomodoro-i18n.js";
import { loadOrCreatePomodoro } from "./pomodoro-store.js";
import { renderPomodoroPanel } from "./pomodoro-view.js";
import { parseYouTubeId, sendYouTubeCommand, youtubeEmbedUrl } from "./youtube-embed.js";

/**
 * @typedef {object} PomodoroDeps
 * @property {HTMLElement} root the panel body (re-rendered)
 * @property {HTMLElement} videoRoot where the iframe lives (never re-rendered)
 * @property {ReturnType<typeof import("./pomodoro-store.js").createPomodoroStore>} store
 * @property {{ play: (name: string, delay?: number) => void }} sounds
 * @property {() => "en" | "pt"} lang
 * @property {() => import("../items-store.js").HabitItem[]} items
 * @property {() => string} today
 * @property {number} secondsPerMinute
 * @property {(message: string) => void} say
 * @property {() => void} [onChange] the page re-renders what shows Pomodoro counts
 * @property {(itemId: string | null) => void} [onWorkDone] a work block finished on that item
 */

/**
 * @param {PomodoroDeps} deps
 * @example startPomodoro({ root, videoRoot, store, sounds, lang, items, today, secondsPerMinute: 60, say })
 */
export function startPomodoro(deps) {
  let state = rollDay(loadOrCreatePomodoro(deps.store, deps.today(), deps.secondsPerMinute), deps.today());

  /** @param {import("./pomodoro-clock.js").PomodoroState} next */
  function commit(next) {
    state = next;
    deps.store.save(next);
    render();
    deps.onChange?.();
  }

  function render() {
    deps.root.innerHTML = renderPomodoroPanel(state, deps.items(), deps.lang(), Date.now());
    syncVideo();
  }

  function tick() {
    const result = tickClock(rollDay(state, deps.today()), Date.now(), deps.secondsPerMinute);
    if (result.finished) return onFinished(result);
    if (result.state !== state) commit(result.state);
    const clock = document.getElementById("pomodoro-clock");
    if (clock) clock.textContent = formatClock(remainingSeconds(state, Date.now()));
    if (state.running) document.title = `${formatClock(remainingSeconds(state, Date.now()))} · Habits`;
  }

  /** @param {{ state: import("./pomodoro-clock.js").PomodoroState, finished: "work" | "short" | "long" }} result */
  function onFinished(result) {
    deps.sounds.play(result.finished === "work" ? "fanfare" : "decision");
    document.title = "Habits";
    commit(result.state);
    if (result.finished === "work") deps.onWorkDone?.(state.itemId);
    const minutes = Math.round(modeSeconds(result.state.mode, deps.secondsPerMinute) / 60);
    deps.say(pomodoroText(deps.lang(), result.finished === "work" ? "workDone" : "breakDone", { minutes }));
  }

  /** @param {HTMLElement} button */
  function onButton(button) {
    const mode = button.dataset.pomodoroMode;
    if (mode) return commit(selectMode(state, /** @type {any} */ (mode), deps.secondsPerMinute));
    const action = button.dataset.pomodoro;
    if (action === "toggle") return onToggle();
    if (action === "reset") return commit(resetClock(state, deps.secondsPerMinute));
    if (action === "mute") return commit({ ...state, muted: !state.muted });
    if (action === "clear-music") return commit({ ...state, videoUrl: "" });
  }

  function onToggle() {
    deps.sounds.play("decision");
    commit(state.running ? pauseClock(state, Date.now()) : startClock(state, Date.now()));
  }

  /** @param {HTMLFormElement} form */
  function onMusicSubmit(form) {
    const url = String(new FormData(form).get("url") ?? "").trim();
    const error = /** @type {HTMLElement | null} */ (form.querySelector("[data-error]"));
    if (url && !parseYouTubeId(url)) {
      if (error) {
        error.textContent = pomodoroText(deps.lang(), "musicError");
        error.hidden = false;
      }
      return;
    }
    commit({ ...state, videoUrl: url });
  }

  /** The iframe exists while a video is set; it plays only during a running work block. */
  function syncVideo() {
    const videoId = parseYouTubeId(state.videoUrl);
    const existing = /** @type {HTMLIFrameElement | null} */ (deps.videoRoot.querySelector("iframe"));
    if (!videoId) {
      deps.videoRoot.innerHTML = "";
      return;
    }
    const playing = state.running && state.mode === "work";
    const iframe = existing?.dataset.videoId === videoId ? existing : mountVideo(videoId, playing);
    sendYouTubeCommand(iframe, state.muted ? "mute" : "unMute");
    sendYouTubeCommand(iframe, playing ? "playVideo" : "pauseVideo");
  }

  /**
   * @param {string} videoId
   * @param {boolean} autoplay
   * @returns {HTMLIFrameElement}
   */
  function mountVideo(videoId, autoplay) {
    const iframe = document.createElement("iframe");
    iframe.src = youtubeEmbedUrl(videoId, { autoplay, muted: state.muted, origin: location.origin });
    iframe.dataset.videoId = videoId;
    iframe.title = "Focus music";
    iframe.allow = "autoplay; encrypted-media";
    iframe.setAttribute("allowfullscreen", "");
    deps.videoRoot.replaceChildren(iframe);
    return iframe;
  }

  /** @param {string} itemId "" clears */
  function workOn(itemId) {
    commit({ ...state, itemId: itemId || null });
  }

  /** Start a work block on a list item (the card's Pomodoro button). */
  function startOn(itemId) {
    deps.sounds.play("decision");
    const picked = selectMode({ ...state, itemId }, "work", deps.secondsPerMinute);
    commit(startClock(picked, Date.now()));
  }

  deps.root.addEventListener("click", (event) => {
    const button = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (event.target).closest("button"));
    if (button) onButton(button);
  });
  deps.root.addEventListener("change", (event) => {
    const select = /** @type {HTMLSelectElement} */ (event.target);
    if (select.dataset.pomodoroSelect === "item") workOn(select.value);
  });
  deps.root.addEventListener("submit", (event) => {
    event.preventDefault();
    onMusicSubmit(/** @type {HTMLFormElement} */ (event.target));
  });
  setInterval(tick, 250);
  render();

  return {
    render,
    startOn,
    get state() {
      return state;
    },
  };
}
