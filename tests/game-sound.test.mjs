import { test } from "node:test";
import assert from "node:assert/strict";
import { soundsForAction } from "../js/game/battle-sounds.js";
import { SOUND_EFFECTS, createSoundBoard } from "../js/game/sound.js";

class FakeStorage {
  constructor() {
    this.map = new Map();
  }
  getItem(key) {
    return this.map.get(key) ?? null;
  }
  setItem(key, value) {
    this.map.set(key, value);
  }
}

/** Records what the board schedules instead of making sound. */
class FakeAudioContext {
  constructor() {
    this.currentTime = 10;
    this.sampleRate = 8000;
    this.state = "suspended";
    this.resumed = 0;
    this.started = [];
    this.destination = {};
  }
  resume() {
    this.resumed += 1;
    this.state = "running";
  }
  createGain() {
    return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
  }
  createOscillator() {
    const started = this.started;
    return {
      type: "sine",
      frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() {},
      start(at) {
        started.push({ kind: "tone", at });
      },
      stop() {},
    };
  }
  createBuffer(channels, length) {
    return { getChannelData: () => new Float32Array(length) };
  }
  createBufferSource() {
    const started = this.started;
    return {
      buffer: null,
      connect() {},
      start(at) {
        started.push({ kind: "noise", at });
      },
      stop() {},
    };
  }
}

test("every effect has notes with a duration, and hits start with a noise burst", () => {
  for (const [name, notes] of Object.entries(SOUND_EFFECTS)) {
    assert.ok(notes.length > 0, name);
    for (const note of notes) assert.ok(note.d > 0, `${name} note without duration`);
  }
  assert.equal(SOUND_EFFECTS.hit[0].noise, true);
  assert.ok(SOUND_EFFECTS.victory.length >= 4);
});

test("the board creates the context lazily, resumes it, schedules notes at offsets, and mutes", () => {
  let created = 0;
  const context = new FakeAudioContext();
  const storage = new FakeStorage();
  const board = createSoundBoard(() => {
    created += 1;
    return context;
  }, storage);
  assert.equal(created, 0);
  board.play("decision", 0.5);
  assert.equal(created, 1);
  assert.equal(context.resumed, 1);
  assert.deepEqual(
    context.started.map((s) => s.at),
    [10.5, 10.55],
  );
  board.play("hit");
  assert.equal(context.started[2].kind, "noise");
  board.play("nope");
  assert.equal(context.started.length, 4);
  assert.equal(board.toggle(), false);
  assert.equal(storage.getItem("habits:sound"), "off");
  board.play("decision");
  assert.equal(context.started.length, 4, "muted boards schedule nothing");
  assert.equal(createSoundBoard(() => context, storage).enabled(), false, "the mute survives a reload");
});

test("duel actions map to swing/hit/miss/crit sounds in beat order, then the ending", () => {
  assert.deepEqual(soundsForAction("attack", ["heroAttack|8|3|5|0", "foeAttack|4|7|0|0"], "player"), [
    { name: "attack", delay: 0 },
    { name: "hit", delay: 0.12 },
    { name: "miss", delay: 0.49 },
  ]);
  assert.deepEqual(soundsForAction("attack", ["heroAttack|10|2|8|1", "won|1"], "won"), [
    { name: "attack", delay: 0 },
    { name: "crit", delay: 0.12 },
    { name: "victory", delay: 0.37 },
  ]);
  assert.deepEqual(soundsForAction("foco", ["foco", "foeAttack|6|3|3|0"], "player"), [
    { name: "skill", delay: 0 },
    { name: "hit", delay: 0.12 },
  ]);
  assert.deepEqual(soundsForAction("flee", ["fled"], "fled"), [{ name: "flee", delay: 0 }]);
  assert.equal(soundsForAction("attack", ["heroAttack|1|9|1|0", "foeAttack|9|1|8|0"], "lost").at(-1)?.name, "defeat");
});
