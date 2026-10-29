// progression.js: how habits turn into XP, and XP into the Ficha. Pure functions over Hero.

import { ARTEFATO_BONUS, SHOP, TRACK_ATTRIBUTE, habitDefinition, shopEntry, trackForItem } from "./catalog.js";
import { clampResources, countOwned, deriveSheet } from "./hero-sheet.js";
import { xpToRaiseAttribute } from "./rules.js";

/** @typedef {import("./hero-sheet.js").Hero} Hero */
/** @typedef {import("./catalog.js").Track} Track */

/**
 * Resolve a habit id to its definition, default or custom.
 * @param {Hero} hero
 * @param {string} habitId
 * @returns {{ id: string, track: Track, xp: number, good: boolean, pvHit?: number, label?: string } | undefined}
 */
export function resolveHabit(hero, habitId) {
  return habitDefinition(habitId) ?? hero.customHabits.find((habit) => habit.id === habitId);
}

/**
 * Log a habit for today: good habits add XP to their track, bad habits remove XP (from their
 * track first, then the fullest other pool) and may cost PV for the day.
 * @param {Hero} hero
 * @param {string} habitId
 * @param {string} today
 * @returns {{ hero: Hero } | { error: string }}
 */
export function logHabit(hero, habitId, today) {
  const habit = resolveHabit(hero, habitId);
  if (!habit) return { error: `habit "${habitId}": unknown id` };
  const entry = { date: today, habitId, xp: habit.xp, track: habit.track, good: habit.good, label: habit.label };
  const withLog = { ...hero, habitLog: [...hero.habitLog, entry] };
  const credited = habit.good ? awardXp(withLog, habit.track, habit.xp) : deductXp(withLog, habit.track, -habit.xp);
  return { hero: habit.pvHit ? loseCurrentPv(credited, habit.pvHit) : credited };
}

/**
 * @param {Hero} hero
 * @param {Track} track
 * @param {number} xp
 * @returns {Hero}
 */
export function awardXp(hero, track, xp) {
  const pools = { ...hero.pools, [track]: hero.pools[track] + xp };
  return { ...hero, pools, xpEarned: hero.xpEarned + xp };
}

/**
 * @param {Hero} hero
 * @param {Track} track
 * @param {number} xp positive amount to remove
 * @returns {Hero}
 */
export function deductXp(hero, track, xp) {
  const pools = { ...hero.pools };
  const fromTrack = Math.min(pools[track], xp);
  pools[track] -= fromTrack;
  let remaining = xp - fromTrack;
  for (const other of fullestTracksFirst(pools)) {
    const taken = Math.min(pools[other], remaining);
    pools[other] -= taken;
    remaining -= taken;
  }
  return { ...hero, pools };
}

/**
 * @param {Record<string, number>} pools
 * @returns {string[]}
 */
function fullestTracksFirst(pools) {
  return Object.keys(pools).sort((a, b) => pools[b] - pools[a]);
}

/**
 * @param {Hero} hero
 * @param {number} pv
 * @returns {Hero}
 */
export function loseCurrentPv(hero, pv) {
  return { ...hero, current: { ...hero.current, pv: Math.max(0, hero.current.pv - pv) } };
}

/** @typedef {{ id: string, name?: string, category: string, done: boolean, track?: string, xp?: number }} CreditableItem */

/**
 * Credit list items marked done on the Habits page: +1 XP once per item on its category's track;
 * a Today item (a habit) pays its own XP on its own track once per day (keyed "id@yyyy-mm-dd")
 * and is logged for today, so the Today tab's log shows it next to the bad habits.
 * @param {Hero} hero
 * @param {CreditableItem[]} listItems
 * @param {string} [today] yyyy-mm-dd, needed for Today items
 * @returns {{ hero: Hero, credited: number }}
 * @example creditDoneListItems(hero, items, "2026-10-29").credited // 2
 */
export function creditDoneListItems(hero, listItems, today = "") {
  const creditKey = (/** @type {CreditableItem} */ item) => (isHabitItem(item) ? `${item.id}@${today}` : item.id);
  const fresh = listItems.filter((item) => item.done && !hero.creditedListItemIds.includes(creditKey(item)));
  let next = { ...hero, creditedListItemIds: [...hero.creditedListItemIds, ...fresh.map(creditKey)] };
  for (const item of fresh) {
    const xp = isHabitItem(item) ? (item.xp ?? 1) : 1;
    next = awardXp(next, trackForItem(item), xp);
    if (isHabitItem(item)) next = logListItem(next, item, xp, today);
  }
  return { hero: next, credited: fresh.length };
}

/**
 * @param {{ category: string }} item
 * @returns {boolean}
 */
function isHabitItem(item) {
  return item.category === "Today";
}

/**
 * @param {Hero} hero
 * @param {CreditableItem} item
 * @param {number} xp
 * @param {string} today
 * @returns {Hero}
 */
function logListItem(hero, item, xp, today) {
  const track = trackForItem(item);
  const entry = { date: today, habitId: `list:${item.id}`, xp, track, good: true, label: item.name ?? item.id };
  return { ...hero, habitLog: [...hero.habitLog, entry] };
}

/**
 * A finished Pomodoro is a good habit: +1 XP to the track of the item's category (Habilidade
 * without an item), logged for today so the Today tab shows it (Diego, 2026-10-29).
 * @param {Hero} hero
 * @param {import("../items-store.js").HabitItem | null} item
 * @param {string} today
 * @returns {Hero}
 * @example creditPomodoro(hero, { category: "Personal", name: "Devotional" }, "2026-10-29").pools.resistencia // +1
 */
export function creditPomodoro(hero, item, today) {
  const track = item ? trackForItem(item) : "habilidade";
  const label = item ? `🍅 ${item.name}` : "🍅 Pomodoro";
  const entry = { date: today, habitId: "pomodoro", xp: 1, track, good: true, label };
  return awardXp({ ...hero, habitLog: [...hero.habitLog, entry] }, track, 1);
}

/**
 * Why an attribute can't be raised right now, or null when it can.
 * @param {Hero} hero
 * @param {Track} track
 * @returns {{ cost: number, reason: string | null }}
 */
export function attributeRaise(hero, track) {
  const key = TRACK_ATTRIBUTE[track];
  const cost = xpToRaiseAttribute(hero.attributes[key]);
  if (hero.pools[track] < cost) return { cost, reason: "notEnoughXp" };
  return { cost, reason: null };
}

/**
 * @param {Hero} hero
 * @param {Track} track
 * @returns {{ hero: Hero } | { error: string }}
 */
export function raiseAttribute(hero, track) {
  const { cost, reason } = attributeRaise(hero, track);
  if (reason) return { error: reason };
  const key = TRACK_ATTRIBUTE[track];
  const attributes = { ...hero.attributes, [key]: hero.attributes[key] + 1 };
  const pools = { ...hero.pools, [track]: hero.pools[track] - cost };
  return { hero: clampResources({ ...hero, attributes, pools, xpSpent: hero.xpSpent + cost }) };
}

/**
 * Why a shop entry can't be bought, or null when it can.
 * @param {Hero} hero
 * @param {string} id
 * @returns {string | null}
 */
export function purchaseBlocker(hero, id) {
  const entry = shopEntry(id);
  if (!entry) return "unknown";
  const sheet = deriveSheet(hero);
  if (countOwned(hero, id) >= (entry.stack ?? 1)) return "owned";
  if ((entry.requires ?? []).some((required) => !hero.owned.includes(required))) return "requires";
  if ((entry.excludes ?? []).some((blocked) => sheet.desvantagens.includes(blocked))) return "excluded";
  if (hero.pools[entry.track] < entry.xp) return "notEnoughXp";
  return null;
}

/**
 * @param {Hero} hero
 * @param {string} id
 * @returns {{ hero: Hero } | { error: string }}
 */
export function buyEntry(hero, id) {
  const blocker = purchaseBlocker(hero, id);
  if (blocker) return { error: blocker };
  const entry = /** @type {import("./catalog.js").ShopEntry} */ (shopEntry(id));
  const pools = { ...hero.pools, [entry.track]: hero.pools[entry.track] - entry.xp };
  const spent = entry.kind === "item" ? hero.xpSpent : hero.xpSpent + entry.xp;
  return { hero: clampResources({ ...hero, owned: [...hero.owned, id], pools, xpSpent: spent }) };
}

/**
 * Remove one copy of a consumable.
 * @param {Hero} hero
 * @param {string} id
 * @returns {Hero}
 */
export function consumeItem(hero, id) {
  const index = hero.owned.indexOf(id);
  if (index < 0) return hero;
  return { ...hero, owned: [...hero.owned.slice(0, index), ...hero.owned.slice(index + 1)] };
}

/**
 * Sum of artefato bonuses of one kind ("attack" | "defense" | "initiative").
 * @param {Hero} hero
 * @param {"attack" | "defense" | "initiative"} kind
 * @returns {number}
 */
export function artefatoBonus(hero, kind) {
  return hero.owned.reduce((sum, id) => sum + (ARTEFATO_BONUS[id]?.[kind] ?? 0), 0);
}

/**
 * Appearance score from the last 7 days: good logs minus bad logs, clamped to -5..5.
 * @param {Hero} hero
 * @param {string} today
 * @returns {number}
 */
export function auraScore(hero, today) {
  const since = shiftDate(today, -7);
  const recent = hero.habitLog.filter((entry) => entry.date > since);
  const score = recent.reduce((sum, entry) => sum + (entry.good ? 1 : -1), 0);
  return Math.max(-5, Math.min(5, score));
}

/**
 * @param {string} isoDate yyyy-mm-dd
 * @param {number} days
 * @returns {string}
 */
export function shiftDate(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Shop entries grouped by kind, for the sheet tab. */
export function shopByKind() {
  /** @type {Record<string, import("./catalog.js").ShopEntry[]>} */
  const groups = {};
  for (const entry of SHOP) (groups[entry.kind] ??= []).push(entry);
  return groups;
}
