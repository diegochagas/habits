import { test } from "node:test";
import assert from "node:assert/strict";
import { CHIBI_H, CHIBI_W, drawChibi } from "../js/game/chibi-sprite.js";
import { ENEMY_LOOKS, enemyLook } from "../js/game/enemy-looks.js";
import { heroLook } from "../js/game/hero-look.js";
import { createStartingHero } from "../js/game/hero-sheet.js";
import { faceToward } from "../js/game/map-scene.js";
import { STAGES, stageEncounters } from "../js/game/stages.js";
import { drawTile } from "../js/game/tile-art.js";

/** Records every rect so the tests can check bounds and colours without a canvas. */
class FakePainter {
  constructor() {
    this.rects = [];
    this.scale = 1;
  }
  rect(x, y, w, h, color) {
    this.rects.push({ x, y, w, h, color });
  }
  dot(x, y, color) {
    this.rect(x, y, 1, 1, color);
  }
  map(x, y, rows, palette) {
    rows.forEach((row, r) => [...row].forEach((ch, c) => palette[ch] && this.rect(x + c, y + r, 1, 1, palette[ch])));
  }
  halftone(x, y, w, h, color) {
    this.rect(x, y, w, h, color);
  }
}

const FACINGS = ["down", "up", "left", "right"];
const POSES = ["stand", "walk", "attack", "hurt", "win", "down"];

test("every enemy sprite key has a look and draws as a humanoid inside a 24x34 box", () => {
  for (const foe of STAGES.flatMap(stageEncounters)) {
    assert.ok(foe.sprite in ENEMY_LOOKS, `missing look for ${foe.sprite}`);
    const look = enemyLook(foe.sprite);
    const p = new FakePainter();
    drawChibi(p, 0, 0, look, { dir: "down", pose: "stand", step: 0, tick: 0 });
    const colours = new Set(p.rects.map((r) => r.color));
    assert.ok(colours.has(look.skin), `${foe.sprite} shows skin`);
    assert.ok(colours.has(look.shirt) || look.shirt === look.skin, `${foe.sprite} shows a shirt`);
    for (const r of p.rects) {
      assert.ok(r.x >= -4 && r.x + r.w <= CHIBI_W + 4, `${foe.sprite} x ${r.x}..${r.x + r.w}`);
      assert.ok(r.y >= -12 && r.y + r.h <= CHIBI_H, `${foe.sprite} y ${r.y}..${r.y + r.h}`);
    }
  }
});

test("the hero draws in every facing and pose, with items and tier markers when owned", () => {
  const hero = createStartingHero("2026-10-28");
  const base = heroLook(hero, "2026-10-28");
  assert.equal(base.build, 1);
  assert.equal(base.held, null);
  for (const dir of FACINGS)
    for (const pose of POSES) {
      const p = new FakePainter();
      drawChibi(p, 0, 0, base, { dir, pose, step: 1, tick: 5 });
      assert.ok(p.rects.length > 12, `${dir}/${pose}`);
    }
  const geared = heroLook(
    { ...hero, owned: [...hero.owned, "artefato.halter", "artefato.oculos"], xpSpent: 230 },
    "2026-10-28",
  );
  assert.equal(geared.held, "dumbbell");
  assert.equal(geared.glasses, "#f2c94c");
  assert.equal(geared.hat, "crown");
  assert.equal(geared.cape, true);
  const slim = heroLook({ ...hero, weightKg: 85 }, "2026-10-28");
  assert.equal(slim.build, 0);
});

test("map tiles draw for every legend char and enemies turn towards an adjacent hero", () => {
  for (const char of [".", ",", "~", "T", "t", "#", "R", "D", "H", "o", "M", "S", "1", "B"]) {
    const p = new FakePainter();
    drawTile(p, char, 0, 0, { tx: 3, ty: 2, tick: 7, outdoor: char === "." });
    assert.ok(p.rects.length > 0, char);
  }
  const foe = { tx: 10, ty: 7 };
  assert.equal(faceToward(foe, { tx: 9, ty: 7, dir: "right", offset: 0, beaten: [] }), "left");
  assert.equal(faceToward(foe, { tx: 10, ty: 8, dir: "up", offset: 0, beaten: [] }), "down");
  assert.equal(faceToward(foe, { tx: 2, ty: 7, dir: "right", offset: 0, beaten: [] }), "down");
});
