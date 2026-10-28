// character-sprite.js: Diego as a pixel character, drawn procedurally so body mass, aura (recent
// habits), owned items and tier change the sprite instead of needing one sheet per state.
// Logical canvas: 40 wide x 56 tall, feet at y=54, facing right.

/**
 * @typedef {object} CharacterLook
 * @property {number} mass 0 (athletic) .. 1.2 (heavier than start)
 * @property {number} aura -5 (bad week) .. 5 (good week)
 * @property {string[]} owned shop ids
 * @property {string} tier "iniciante" | "heroi" | "veterano"
 */

/** @typedef {"idle" | "walk" | "attack" | "hurt" | "win"} Pose */

const INK = "#111";
const SKIN_GOOD = "#efb98f";
const SKIN_BAD = "#cdb39f";
const HAIR = "#2b1a10";
const BEARD = "#3b2a1c";
const BEARD_GREY = "#8d8d8d";
const SHIRT = "#171717";
const SHORTS = "#222";
const SHOE = "#1b1b1b";
const SHOE_ACCENT = "#e3661a";
const GOLD = "#f2c94c";

/**
 * Frame-dependent offsets for a pose.
 * @param {Pose} pose
 * @param {number} tick
 * @returns {{ bob: number, legA: number, legB: number, armFront: number, armBack: number, shake: number }}
 */
export function poseFrame(pose, tick) {
  const phase = Math.floor(tick / 8) % 4;
  if (pose === "walk")
    return {
      bob: phase % 2,
      legA: [0, 2, 0, -2][phase],
      legB: [0, -2, 0, 2][phase],
      armFront: [0, -2, 0, 2][phase],
      armBack: 0,
      shake: 0,
    };
  if (pose === "attack") return { bob: 0, legA: 2, legB: -1, armFront: phase < 2 ? -8 : -3, armBack: 1, shake: 0 };
  if (pose === "hurt") return { bob: 1, legA: 0, legB: 0, armFront: 2, armBack: 2, shake: phase % 2 === 0 ? -2 : 2 };
  if (pose === "win") return { bob: phase % 2 ? 1 : 0, legA: 0, legB: 0, armFront: -12, armBack: -12, shake: 0 };
  return { bob: phase < 2 ? 0 : 1, legA: 0, legB: 0, armFront: 0, armBack: 0, shake: 0 };
}

/**
 * Body measurements from the mass factor.
 * @param {number} mass
 * @returns {{ torsoW: number, bellyW: number, legW: number, cheek: number, faceW: number }}
 */
export function bodyShape(mass) {
  const m = Math.max(0, Math.min(1.2, mass));
  return {
    torsoW: Math.round(12 + 10 * m),
    bellyW: Math.round(12 + 14 * m),
    legW: Math.round(4 + 2 * m),
    cheek: m > 0.6 ? 1 : 0,
    faceW: Math.round(10 + 2 * m),
  };
}

/**
 * Draw the character with its origin at (ox, oy) = top-left of a 40x56 box.
 * @param {import("./pixel-painter.js").Painter} p
 * @param {number} ox
 * @param {number} oy
 * @param {CharacterLook} look
 * @param {Pose} pose
 * @param {number} tick
 */
export function drawCharacter(p, ox, oy, look, pose, tick) {
  const frame = poseFrame(pose, tick);
  const shape = bodyShape(look.mass);
  const x = ox + 20 + frame.shake;
  const y = oy + frame.bob;
  const skin = look.aura < -1 ? SKIN_BAD : SKIN_GOOD;
  drawAura(p, x, y, look, tick);
  drawLegs(p, x, y, shape, frame, skin);
  drawTorso(p, x, y, shape, frame, look, skin);
  drawHead(p, x, y, shape, look, skin, pose);
  drawExtras(p, x, y, look, frame);
}

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @param {number} x center
 * @param {number} y
 * @param {CharacterLook} look
 * @param {number} tick
 */
function drawAura(p, x, y, look, tick) {
  if (look.aura >= 3) {
    const t = Math.floor(tick / 6) % 3;
    for (const [dx, dy] of [
      [-16, 14],
      [15, 8],
      [-13, 30],
      [16, 26],
    ])
      p.dot(x + dx, y + dy + t, GOLD);
    p.rect(x + 14, y + 10 + t, 1, 3, GOLD);
    p.rect(x + 13, y + 11 + t, 3, 1, GOLD);
  }
  if (look.aura <= -3) {
    const t = Math.floor(tick / 10) % 2;
    p.rect(x - 15, y + 2 + t, 1, 3, "#7aa7d6");
    p.rect(x + 12, y + 20 - t, 1, 3, "#7aa7d6");
    p.rect(x - 2, y - 3, 1, 2, "#777");
  }
}

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @param {number} x
 * @param {number} y
 * @param {ReturnType<typeof bodyShape>} shape
 * @param {ReturnType<typeof poseFrame>} frame
 * @param {string} skin
 */
function drawLegs(p, x, y, shape, frame, skin) {
  const legW = shape.legW;
  const gap = Math.round(shape.bellyW / 4);
  p.rect(x - gap - legW, y + 40 + frame.legA, legW, 8, skin);
  p.rect(x + gap, y + 40 + frame.legB, legW, 8, skin);
  p.rect(x - gap - legW - 1, y + 48 + frame.legA, legW + 2, 4, SHOE);
  p.rect(x + gap - 1, y + 48 + frame.legB, legW + 2, 4, SHOE);
  p.rect(x - gap - legW - 1, y + 50 + frame.legA, legW + 2, 1, SHOE_ACCENT);
  p.rect(x + gap - 1, y + 50 + frame.legB, legW + 2, 1, SHOE_ACCENT);
  p.rect(x - gap - legW - 1, y + 52 + frame.legA, legW + 2, 1, INK);
  p.rect(x + gap - 1, y + 52 + frame.legB, legW + 2, 1, INK);
}

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @param {number} x
 * @param {number} y
 * @param {ReturnType<typeof bodyShape>} shape
 * @param {ReturnType<typeof poseFrame>} frame
 * @param {CharacterLook} look
 * @param {string} skin
 */
function drawTorso(p, x, y, shape, frame, look, skin) {
  const half = Math.round(shape.torsoW / 2);
  const bellyHalf = Math.round(shape.bellyW / 2);
  p.rect(x - half, y + 20, shape.torsoW, 8, SHIRT);
  p.rect(x - bellyHalf, y + 28, shape.bellyW, 8, SHIRT);
  p.rect(x - bellyHalf, y + 36, shape.bellyW, 5, SHORTS);
  p.rect(x - bellyHalf, y + 35, shape.bellyW, 1, INK);
  if (look.owned.includes("artefato.colete")) p.rect(x - half + 1, y + 20, 3, 14, "#5b5b5b");
  if (look.owned.includes("artefato.colete")) p.rect(x + half - 4, y + 20, 3, 14, "#5b5b5b");
  p.rect(x - half - 3, y + 21 + frame.armBack, 3, 10, SHIRT);
  p.rect(x - half - 3, y + 31 + frame.armBack, 3, 4, skin);
  p.rect(x + half, y + 21 + frame.armFront, 3, 10, SHIRT);
  p.rect(x + half, y + 31 + frame.armFront, 3, 4, skin);
  if (look.owned.includes("vantagem.forte")) p.rect(x + half - 1, y + 22 + frame.armFront, 5, 2, "#c0392b");
}

/**
 * @param {import("./pixel-painter.js").Painter} p
 * @param {number} x
 * @param {number} y
 * @param {ReturnType<typeof bodyShape>} shape
 * @param {CharacterLook} look
 * @param {string} skin
 * @param {Pose} pose
 */
function drawHead(p, x, y, shape, look, skin, pose) {
  const half = Math.round(shape.faceW / 2);
  p.rect(x - half + 1, y + 2, shape.faceW - 2, 4, HAIR);
  p.rect(x - half, y + 4, shape.faceW, 12, skin);
  p.rect(x - half, y + 16, shape.faceW, 4, HAIR);
  p.rect(x - half, y + 15, shape.faceW, 1, look.aura <= -3 ? BEARD : BEARD_GREY);
  p.rect(x - half + 1, y + 17, shape.faceW - 2, 3, BEARD);
  p.rect(x + 1, y + 18, 3, 1, look.aura >= 0 || pose === "win" ? skin : BEARD);
  p.rect(x - half + 1, y + 8, 3, 2, INK);
  p.rect(x + 1, y + 8, 3, 2, INK);
  p.rect(x - half + 1, y + 7, shape.faceW - 2, 1, look.owned.includes("artefato.oculos") ? GOLD : INK);
  p.rect(x - half + 1, y + 10, 3, 1, look.owned.includes("artefato.oculos") ? GOLD : INK);
  p.rect(x + 1, y + 10, 3, 1, look.owned.includes("artefato.oculos") ? GOLD : INK);
  if (look.aura <= -2) p.rect(x - half + 1, y + 11, 3, 1, "#8e6f6f");
  if (look.aura <= -2) p.rect(x + 1, y + 11, 3, 1, "#8e6f6f");
  if (shape.cheek) p.rect(x - half - 1, y + 10, 1, 5, skin);
  if (shape.cheek) p.rect(x + half, y + 10, 1, 5, skin);
}

/**
 * Items and tier markers: dumbbell (artefato.halter), cape (herói), crown (veterano).
 * @param {import("./pixel-painter.js").Painter} p
 * @param {number} x
 * @param {number} y
 * @param {CharacterLook} look
 * @param {ReturnType<typeof poseFrame>} frame
 */
function drawExtras(p, x, y, look, frame) {
  const half = Math.round(bodyShape(look.mass).torsoW / 2);
  if (look.owned.includes("artefato.halter")) {
    p.rect(x + half + 3, y + 30 + frame.armFront, 8, 2, "#555");
    p.rect(x + half + 2, y + 28 + frame.armFront, 2, 6, INK);
    p.rect(x + half + 10, y + 28 + frame.armFront, 2, 6, INK);
  }
  if (look.tier !== "iniciante") {
    p.rect(x - half - 6, y + 20, 4, 18, "#8e1b1b");
    p.rect(x - half - 7, y + 22, 2, 14, "#5e0f0f");
  }
  if (look.tier === "veterano") {
    p.rect(x - 4, y, 9, 2, GOLD);
    for (const dx of [-4, 0, 4]) p.dot(x + dx, y - 1, GOLD);
  }
}
