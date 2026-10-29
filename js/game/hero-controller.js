// hero-controller.js: the hero's own actions (habits, shop, rest, weight, custom habits), shared
// by the habits page (Today + Sheet tabs) and the game page (Arcas). The page owns rendering;
// this object owns the hero value and its storage.

import { gameText } from "./game-i18n.js";
import { heroLook } from "./hero-look.js";
import { drawPortrait, renderHeroPanel } from "./hero-panel.js";
import { restHero } from "./hero-sheet.js";
import { loadOrCreateHero, useConsumable } from "./hero-store.js";
import { buyEntry, creditDoneListItems, logHabit, raiseAttribute } from "./progression.js";
import { customHabitFromForm } from "./today-view.js";
import { parseHeight, parseWeight } from "./weight.js";

/**
 * @typedef {object} HeroControllerDeps
 * @property {ReturnType<typeof import("./hero-store.js").createHeroStore>} store
 * @property {{ play: (name: string, delay?: number) => void }} sounds
 * @property {() => string} today yyyy-mm-dd
 * @property {() => "en" | "pt"} lang
 * @property {(message: string) => void} say shows a notice on the page
 * @property {() => void} onChange the page re-renders
 * @property {(message: string) => boolean} confirmReset
 */

/**
 * @param {HeroControllerDeps} deps
 * @example createHeroController({ store, sounds, today, lang, say, onChange, confirmReset: confirm })
 */
export function createHeroController(deps) {
  let hero = loadOrCreateHero(deps.store, deps.today());

  /** @param {import("./hero-sheet.js").Hero} next */
  function commit(next) {
    hero = next;
    deps.store.save(next);
    deps.onChange();
  }

  /** @param {string} key @param {Record<string, string | number>} [values] */
  function sayKey(key, values) {
    deps.say(gameText(deps.lang(), key, values));
  }

  /**
   * @param {HTMLElement} button a `button[data-action]`
   * @returns {boolean} true when the action was one of the hero's
   */
  function handleAction(button) {
    const action = button.dataset.action;
    if (action === "log-habit") return onLogHabit(button.dataset.habit ?? "");
    if (action === "raise") return onPurchase(raiseAttribute(hero, /** @type {any} */ (button.dataset.track)));
    if (action === "buy") return onPurchase(buyEntry(hero, button.dataset.entry ?? ""));
    if (action === "use-item") return onUseItem(button.dataset.item ?? "");
    if (action === "rest") return onRest();
    if (action === "reset-hero") return onResetHero();
    return false;
  }

  /**
   * @param {HTMLFormElement} form a `form[data-form]`
   * @returns {boolean}
   */
  function handleSubmit(form) {
    if (form.dataset.form === "weight") return onWeight(new FormData(form));
    if (form.dataset.form === "custom-habit") return onCustomHabit(form);
    return false;
  }

  /** @param {{ hero: import("./hero-sheet.js").Hero } | { error: string }} result */
  function onPurchase(result) {
    if ("error" in result) {
      deps.sounds.play("cancel");
      sayKey(`block${result.error.charAt(0).toUpperCase()}${result.error.slice(1)}`);
      return true;
    }
    deps.sounds.play("buy");
    commit(result.hero);
    return true;
  }

  /** @param {string} habitId */
  function onLogHabit(habitId) {
    const result = logHabit(hero, habitId, deps.today());
    if ("error" in result) {
      sayKey(result.error);
      return true;
    }
    deps.sounds.play(result.hero.habitLog[result.hero.habitLog.length - 1]?.good ? "habitGood" : "habitBad");
    commit(result.hero);
    return true;
  }

  /** @param {string} itemId */
  function onUseItem(itemId) {
    deps.sounds.play("heal");
    commit(useConsumable(hero, itemId));
    return true;
  }

  function onRest() {
    const result = restHero(hero, deps.today());
    deps.sounds.play(result.rested ? "heal" : "cancel");
    commit(result.hero);
    sayKey(result.rested ? "rested" : "alreadyRested");
    return true;
  }

  function onResetHero() {
    if (!deps.confirmReset(gameText(deps.lang(), "resetHeroConfirm"))) return true;
    deps.store.clear();
    commit(loadOrCreateHero(deps.store, deps.today()));
    return true;
  }

  /** Weight and height together: the BMI decides Lento / Frágil. @param {FormData} fields */
  function onWeight(fields) {
    const weight = parseWeight(fields.get("kg"));
    const height = parseHeight(fields.get("cm"));
    if ("error" in weight || "error" in height) {
      sayKey("error" in weight ? "weightError" : "heightError");
      return true;
    }
    deps.sounds.play("decision");
    const weightLog = [...hero.weightLog, { date: deps.today(), kg: weight.kg }];
    commit({ ...hero, weightKg: weight.kg, heightCm: height.cm, weightLog });
    return true;
  }

  /** @param {HTMLFormElement} form */
  function onCustomHabit(form) {
    const result = customHabitFromForm(new FormData(form), () => `custom-${Date.now().toString(36)}`);
    if ("error" in result) {
      sayKey(result.error);
      return true;
    }
    deps.sounds.play("decision");
    commit({ ...hero, customHabits: [...hero.customHabits, result.habit] });
    return true;
  }

  /**
   * Items marked done on the list pay XP once (daily items once a day); says how many were new.
   * @param {import("../items-store.js").HabitItem[]} items
   */
  function creditList(items) {
    const credited = creditDoneListItems(hero, items, deps.today());
    if (credited.credited === 0) return;
    commit(credited.hero);
    sayKey("listCredit", { count: credited.credited });
  }

  /** @param {HTMLElement} root */
  function renderPanel(root) {
    root.innerHTML = renderHeroPanel(hero, deps.lang(), deps.today());
  }

  /**
   * The sheet portrait: standing, or knocked out at 0 PV (the hurt pose shook the portrait).
   * @param {number} tick
   */
  function drawPortraitFrame(tick) {
    const canvas = /** @type {HTMLCanvasElement | null} */ (document.getElementById("portrait"));
    if (!canvas) return;
    const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext("2d"));
    drawPortrait(ctx, heroLook(hero, deps.today()), hero.current.pv > 0 ? "stand" : "down", tick);
  }

  return {
    get hero() {
      return hero;
    },
    commit,
    handleAction,
    handleSubmit,
    creditList,
    renderPanel,
    drawPortraitFrame,
  };
}
