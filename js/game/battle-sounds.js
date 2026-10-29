// battle-sounds.js: which sound effects a duel action produces, timed to the pose beats in
// stage-run.js (the enemy's answer plays after the hero's swing). Pure, for the tests.

const BEAT_SECONDS = 0.37;

/**
 * @param {string} action the player's action
 * @param {string[]} newLines log lines the action added
 * @param {string} phase duel phase after the action
 * @returns {{ name: string, delay: number }[]}
 * @example soundsForAction("attack", ["heroAttack|8|3|5|0", "foeAttack|4|7|0|0"], "player")
 * // [{ name: "attack", delay: 0 }, { name: "hit", delay: 0.12 }, { name: "miss", delay: 0.37 }]
 */
export function soundsForAction(action, newLines, phase) {
  const sounds = action === "attack" ? [] : [{ name: ACTION_SOUNDS[action] ?? "decision", delay: 0 }];
  let delay = 0;
  for (const line of newLines) {
    const [kind, , , damage, crits] = line.split("|");
    if (kind !== "heroAttack" && kind !== "foeAttack") continue;
    sounds.push(...swingSounds(kind, Number(damage), Number(crits), delay));
    delay += BEAT_SECONDS;
  }
  if (phase in END_SOUNDS) sounds.push({ name: END_SOUNDS[phase], delay });
  return sounds;
}

/** @type {Record<string, string>} */
const ACTION_SOUNDS = { foco: "skill", devocao: "skill", cura: "heal", pa: "decision", flee: "flee" };
/** @type {Record<string, string>} */
const END_SOUNDS = { won: "victory", lost: "defeat" };

/**
 * @param {string} kind
 * @param {number} damage
 * @param {number} crits
 * @param {number} delay
 * @returns {{ name: string, delay: number }[]}
 */
function swingSounds(kind, damage, crits, delay) {
  const swing = kind === "heroAttack" ? [{ name: "attack", delay }] : [];
  const landing = damage <= 0 ? "miss" : crits > 0 ? "crit" : "hit";
  return [...swing, { name: landing, delay: delay + 0.12 }];
}
