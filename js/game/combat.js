// combat.js: one 3DeT duel as a pure state machine. Every transition takes a `rollDie` so tests
// and the ?seed= URL make fights reproducible. Book rules: iniciativa (H + Luta), ataque (P + Luta)
// vs defesa (R + Luta), dano = diferença (mín. 1), defesa perfeita, PA = Ganho, Devoto = 2PM Ganho.

import { damageDealt, diceForTest, isNearDefeat, rollTest } from "./rules.js";

/**
 * @typedef {object} Combatant
 * @property {{ P: number, H: number, R: number }} attributes
 * @property {number} pv
 * @property {number} pm
 * @property {number} pa
 * @property {boolean} luta
 * @property {string[]} traits ids: desvantagem keys, vantagem ids, artefato ids
 * @property {{ attack: number, defense: number, initiative: number }} bonus
 * @property {number} [critFrom]
 * @property {number} [regen]
 */

/**
 * @typedef {object} DuelState
 * @property {"player" | "enemy" | "won" | "lost" | "fled"} phase
 * @property {Combatant} hero
 * @property {Combatant} foe
 * @property {number} round
 * @property {string[]} log i18n-ready lines "key|a|b"
 * @property {number} ganhoNext extra Ganho on the hero's next attack (PA / Devoto)
 * @property {boolean} focoReady auto crit on the next attack
 * @property {boolean} focoDefending Perda on defense this round
 * @property {number} devocoes uses left this scene (max 2)
 */

/**
 * @param {Combatant} hero
 * @param {Combatant} foe
 * @param {() => number} rollDie
 * @returns {DuelState}
 */
export function startDuel(hero, foe, rollDie) {
  const heroInit = rollTest(initiativeSpec(hero), rollDie);
  const foeInit = rollTest(initiativeSpec(foe), rollDie);
  const heroFirst = heroInit.total >= foeInit.total;
  const state = {
    phase: /** @type {DuelState["phase"]} */ (heroFirst ? "player" : "enemy"),
    hero,
    foe,
    round: 1,
    ganhoNext: 0,
    focoReady: false,
    focoDefending: false,
    devocoes: 2,
    log: [`initiative|${heroInit.total}|${foeInit.total}`],
  };
  return heroFirst ? state : enemyTurn(state, rollDie);
}

/**
 * @param {Combatant} who
 * @returns {Parameters<typeof rollTest>[0]}
 */
function initiativeSpec(who) {
  const perdas = who.traits.includes("lento") ? 1 : 0;
  const agil = who.traits.includes("vantagem.agil") ? 2 : 0;
  return {
    diceCount: diceForTest({ pericia: who.luta, perdas }),
    attribute: who.attributes.H + agil + who.bonus.initiative,
    critFrom: who.critFrom,
  };
}

/** Spending PA or invoking Devoção is not an action in the book: the enemy does not get a turn. */
const FREE_ACTIONS = ["pa", "devocao"];

/**
 * Apply one player action, then the enemy's turn if the duel continues.
 * @param {DuelState} state
 * @param {string} action "attack" | "foco" | "devocao" | "pa" | "cura" | "item:<id>" | "flee"
 * @param {() => number} rollDie
 * @returns {DuelState}
 */
export function playerAction(state, action, rollDie) {
  if (state.phase !== "player") return state;
  const acted = applyPlayerAction(state, action, rollDie);
  if (acted.phase !== "player" || FREE_ACTIONS.includes(action)) return acted;
  return enemyTurn({ ...acted, phase: "enemy" }, rollDie);
}

/**
 * @param {DuelState} state
 * @param {string} action
 * @param {() => number} rollDie
 * @returns {DuelState}
 */
function applyPlayerAction(state, action, rollDie) {
  if (action === "attack") return heroAttack(state, rollDie);
  if (action === "flee") return { ...state, phase: "fled", log: [...state.log, "fled"] };
  if (action === "foco")
    return spendPm(
      state,
      state.hero.traits.includes("vantagem.genio") ? 1 : 2,
      { focoReady: true, focoDefending: true },
      "foco",
    );
  if (action === "devocao" && state.devocoes > 0)
    return spendPm(state, 2, { ganhoNext: 1, devocoes: state.devocoes - 1 }, "devocao");
  if (action === "pa" && state.hero.pa > 0)
    return { ...state, hero: { ...state.hero, pa: state.hero.pa - 1 }, ganhoNext: 1, log: [...state.log, "pa"] };
  if (action === "cura") return heroCura(state, rollDie);
  return state;
}

/**
 * @param {DuelState} state
 * @param {number} cost
 * @param {Partial<DuelState>} patch
 * @param {string} logKey
 * @returns {DuelState}
 */
function spendPm(state, cost, patch, logKey) {
  if (state.hero.pm < cost) return { ...state, log: [...state.log, "noPm"] };
  return {
    ...state,
    ...patch,
    hero: { ...state.hero, pm: state.hero.pm - cost },
    log: [...state.log, `${logKey}|${cost}`],
  };
}

/**
 * Cura (1pt): 2PM heals 1D PV; here one die per use, up to H uses per fight is not tracked.
 * @param {DuelState} state
 * @param {() => number} rollDie
 * @returns {DuelState}
 */
function heroCura(state, rollDie) {
  if (!state.hero.traits.includes("vantagem.cura") || state.hero.pm < 2)
    return { ...state, log: [...state.log, "noPm"] };
  const healed = rollDie();
  const hero = { ...state.hero, pm: state.hero.pm - 2, pv: state.hero.pv + healed };
  return { ...state, hero, log: [...state.log, `cura|${healed}`] };
}

/**
 * @param {DuelState} state
 * @param {() => number} rollDie
 * @returns {DuelState}
 */
function heroAttack(state, rollDie) {
  const spec = heroAttackSpec(state);
  const hero = { ...state.hero, pm: state.hero.pm - spec.pmCost };
  const attack = rollTest(spec, rollDie);
  const defense = rollTest(foeDefenseSpec(state.foe), rollDie);
  const damage = damageDealt(attack.total, defense.total);
  const foe = { ...state.foe, pv: Math.max(0, state.foe.pv - damage) };
  const log = [...state.log, `heroAttack|${attack.total}|${defense.total}|${damage}|${attack.crits}`];
  const next = { ...state, hero, foe, log, ganhoNext: 0, focoReady: false };
  return foe.pv === 0 ? { ...next, phase: "won", log: [...log, "won"] } : next;
}

/**
 * Attack: P (+Forte +2, +artefato) with Luta, Ganho from PA/Devoto, auto crit from Foco,
 * Maestria (1PM) crit on 5+, Ataque Especial Preciso (1PM) attacks with H when it is higher.
 * @param {DuelState} state
 * @returns {Parameters<typeof rollTest>[0] & { pmCost: number }}
 */
function heroAttackSpec(state) {
  const { hero } = state;
  let pmCost = 0;
  let attribute = hero.attributes.P + (hero.traits.includes("vantagem.forte") ? 2 : 0);
  if (hero.traits.includes("vantagem.ataqueEspecial") && hero.attributes.H > attribute && hero.pm > pmCost) {
    attribute = hero.attributes.H;
    pmCost += 1;
  }
  const maestria = hero.traits.includes("vantagem.maestriaLuta") && hero.pm > pmCost;
  if (maestria) pmCost += 1;
  return {
    diceCount: diceForTest({
      pericia: hero.luta,
      ganhos: state.ganhoNext,
      perdas: hero.traits.includes("fracote") ? 1 : 0,
    }),
    attribute: attribute + hero.bonus.attack,
    critFrom: maestria ? 5 : 6,
    autoCrits: state.focoReady ? 1 : 0,
    pmCost,
  };
}

/**
 * @param {Combatant} foe
 * @returns {Parameters<typeof rollTest>[0]}
 */
function foeDefenseSpec(foe) {
  return { diceCount: diceForTest({ pericia: foe.luta }), attribute: foe.attributes.R, critFrom: foe.critFrom };
}

/**
 * Defense: R (+Vigoroso +2, +Resoluto +2 near defeat, +artefato) with Luta; Frágil = Perda and no
 * crit; Foco = Perda; Defesa Especial Esquiva (1PM) defends with H when it is higher.
 * @param {DuelState} state
 * @returns {Parameters<typeof rollTest>[0] & { pmCost: number }}
 */
function heroDefenseSpec(state) {
  const { hero } = state;
  const fragil = hero.traits.includes("fragil");
  const near = isNearDefeat(hero.pv, hero.attributes.R);
  let attribute =
    hero.attributes.R +
    (hero.traits.includes("vantagem.vigoroso") ? 2 : 0) +
    (near && hero.traits.includes("vantagem.resoluto") ? 2 : 0);
  let pmCost = 0;
  if (hero.traits.includes("vantagem.defesaEspecial") && hero.attributes.H > attribute && hero.pm > 0) {
    attribute = hero.attributes.H;
    pmCost = 1;
  }
  const perdas = (fragil ? 1 : 0) + (state.focoDefending ? 1 : 0);
  return {
    diceCount: diceForTest({ pericia: hero.luta, perdas }),
    attribute: attribute + hero.bonus.defense,
    noCrit: fragil,
    pmCost,
  };
}

/**
 * @param {DuelState} state
 * @param {() => number} rollDie
 * @returns {DuelState}
 */
function enemyTurn(state, rollDie) {
  const foe = regenerate(state.foe);
  const attack = rollTest(
    { diceCount: diceForTest({ pericia: foe.luta }), attribute: foe.attributes.P, critFrom: foe.critFrom },
    rollDie,
  );
  const spec = heroDefenseSpec(state);
  const defense = rollTest(spec, rollDie);
  const damage = damageDealt(attack.total, defense.total);
  const hero = regenerate({ ...state.hero, pm: state.hero.pm - spec.pmCost, pv: Math.max(0, state.hero.pv - damage) });
  const log = [...state.log, `foeAttack|${attack.total}|${defense.total}|${damage}|${attack.crits}`];
  if (hero.pv === 0) return { ...state, hero, foe, log: [...log, "lost"], phase: "lost" };
  return { ...state, hero, foe, log, phase: "player", round: state.round + 1, focoDefending: false };
}

/**
 * Regeneração: 1PV (1pt) or 3PV (2pt) at the start of the turn; enemies use `regen`.
 * @param {Combatant} who
 * @returns {Combatant}
 */
function regenerate(who) {
  const owned = who.traits.filter((trait) => trait === "vantagem.regeneracao").length;
  const amount = who.regen ?? (owned === 0 ? 0 : owned === 1 ? 1 : 3);
  if (!amount || who.pv === 0) return who;
  return { ...who, pv: who.pv + amount };
}

/**
 * Actions the hero can take right now, for the buttons.
 * @param {DuelState} state
 * @returns {string[]}
 */
export function availableActions(state) {
  if (state.phase !== "player") return [];
  const { hero } = state;
  const actions = ["attack"];
  if (hero.traits.includes("vantagem.foco") && !state.focoReady) actions.push("foco");
  if (hero.traits.includes("vantagem.devoto") && state.devocoes > 0 && state.ganhoNext === 0) actions.push("devocao");
  if (hero.pa > 0 && state.ganhoNext === 0) actions.push("pa");
  if (hero.traits.includes("vantagem.cura")) actions.push("cura");
  actions.push("flee");
  return actions;
}
