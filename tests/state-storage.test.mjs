import { test } from "node:test";
import assert from "node:assert/strict";
import { connectStateStorage, createServerStorage } from "../js/state-storage.js";

/** A fetch that records calls and answers with the given status per method. */
function fakeFetch(statusByMethod = {}) {
  const calls = [];
  const fetchFn = async (url, init = {}) => {
    const method = init.method ?? "GET";
    calls.push({ url, method, body: init.body, keepalive: init.keepalive });
    const status = statusByMethod[method] ?? 200;
    return { ok: status < 400, status, json: async () => ({ state: { "habits:v1": [{ id: "a" }] } }) };
  };
  return { fetchFn, calls };
}

/** Timers that run when `tick()` is called. */
function fakeTimers() {
  const queue = [];
  return {
    setTimeout: (fn, ms) => (queue.push({ fn, ms }), queue.length),
    async tick() {
      const due = queue.splice(0);
      for (const entry of due) await entry.fn();
    },
    get pending() {
      return queue.map((entry) => entry.ms);
    },
  };
}

test("with a server: the cache answers synchronously, writes are coalesced per key and PUT as JSON", async () => {
  const { fetchFn, calls } = fakeFetch();
  const timers = fakeTimers();
  const storage = createServerStorage(fetchFn, { "habits:v1": [{ id: "a" }] }, timers);
  assert.equal(storage.kind, "server");
  assert.equal(storage.getItem("habits:v1"), JSON.stringify([{ id: "a" }]));
  assert.equal(storage.getItem("habits:none"), null);
  storage.setItem("habits:v1", "[]");
  storage.setItem("habits:v1", '[{"id":"b"}]');
  storage.setItem("habits:hero:v1", "{}");
  assert.equal(storage.getItem("habits:v1"), '[{"id":"b"}]');
  assert.deepEqual(timers.pending, [250], "one flush timer for all three writes");
  await timers.tick();
  assert.deepEqual(
    calls.map((call) => [call.method, call.url, call.body]),
    [
      ["PUT", "api/state/habits%3Av1", '[{"id":"b"}]'],
      ["PUT", "api/state/habits%3Ahero%3Av1", "{}"],
    ],
  );
  storage.removeItem("habits:hero:v1");
  await timers.tick();
  assert.equal(calls.at(-1).method, "DELETE");
  assert.equal(storage.getItem("habits:hero:v1"), null);
});

test("a failed write stays pending and is retried later; a newer value is never overwritten by a retry", async () => {
  const status = { PUT: 500 };
  const { fetchFn, calls } = fakeFetch(status);
  const timers = fakeTimers();
  const storage = createServerStorage(fetchFn, {}, timers);
  storage.setItem("habits:v1", "1");
  await timers.tick();
  assert.equal(calls.length, 1);
  assert.deepEqual(timers.pending, [5000], "retry scheduled after the failure");
  status.PUT = 204;
  storage.setItem("habits:v1", "2");
  await timers.tick();
  assert.equal(calls.at(-1).body, "2");
  await storage.flush();
  assert.equal(calls.length, 2, "nothing left to send");
});

test("a body over 32 KB is PUT without keepalive (browsers refuse keepalive bodies past 64 KiB)", async () => {
  const { fetchFn, calls } = fakeFetch();
  const storage = createServerStorage(fetchFn, {}, fakeTimers());
  storage.setItem("habits:v1", "x".repeat(40_000));
  storage.setItem("habits:hero:v1", "{}");
  await storage.flush();
  assert.deepEqual(
    calls.map((call) => [call.url, call.keepalive]),
    [
      ["api/state/habits%3Av1", false],
      ["api/state/habits%3Ahero%3Av1", true],
    ],
  );
});

test("without a server the browser storage is used", async () => {
  const fallback = new Map();
  const fake = {
    getItem: (k) => fallback.get(k) ?? null,
    setItem: (k, v) => fallback.set(k, v),
    removeItem: (k) => fallback.delete(k),
  };
  const offline = async () => {
    throw new Error("connection refused");
  };
  const storage = await connectStateStorage({ fetchFn: offline, fallback: /** @type {any} */ (fake) });
  assert.equal(storage.kind, "browser");
  storage.setItem("habits:lang", "pt");
  assert.equal(fake.getItem("habits:lang"), "pt");
  const notFound = async () => ({ ok: false, status: 404, json: async () => ({}) });
  assert.equal((await connectStateStorage({ fetchFn: notFound, fallback: /** @type {any} */ (fake) })).kind, "browser");
  const { fetchFn } = fakeFetch();
  const connected = await connectStateStorage({ fetchFn, fallback: /** @type {any} */ (fake) });
  assert.equal(connected.kind, "server");
  assert.equal(connected.getItem("habits:v1"), JSON.stringify([{ id: "a" }]));
});
