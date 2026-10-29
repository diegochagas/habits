import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHabitsApp } from "../server/http-app.js";
import { readServerConfig } from "../server/server-config.js";
import { createMemoryState } from "../server/state-memory.js";
import { createPostgresState } from "../server/state-postgres.js";
import { contentTypeFor, resolveSitePath } from "../server/static-files.js";

test("config: memory store needs no database, postgres needs a postgresql:// URL, PORT is checked", () => {
  assert.deepEqual(readServerConfig({ HABITS_STORE: "memory" }, "/site"), {
    port: 4180,
    store: "memory",
    databaseUrl: "",
    siteRoot: "/site",
  });
  assert.throws(() => readServerConfig({}, "/site"), /DATABASE_URL ""/);
  assert.throws(() => readServerConfig({ HABITS_STORE: "redis" }, "/site"), /HABITS_STORE "redis"/);
  assert.throws(() => readServerConfig({ HABITS_STORE: "memory", PORT: "http" }, "/site"), /PORT "http"/);
  assert.equal(readServerConfig({ DATABASE_URL: "postgresql://u:p@h:5432/d", PORT: "3010" }, "/s").port, 3010);
});

test("static files: only the site's own files, never dotfiles, server/ or parent folders", () => {
  assert.equal(resolveSitePath("/", "/site"), "/site/index.html");
  assert.equal(resolveSitePath("/js/app.js", "/site"), "/site/js/app.js");
  assert.equal(resolveSitePath("/data/seed.json", "/site"), "/site/data/seed.json");
  assert.equal(resolveSitePath("/server/main.js", "/site"), null);
  assert.equal(resolveSitePath("/.env", "/site"), null);
  assert.equal(resolveSitePath("/js/../.env", "/site"), null);
  assert.equal(resolveSitePath("/package.json", "/site"), null);
  assert.equal(contentTypeFor("/site/css/ink.css"), "text/css; charset=utf-8");
  assert.equal(contentTypeFor("/site/x.bin"), "application/octet-stream");
});

/** Starts the app on a random port over a temp site folder. */
async function startApp(state, allowWipe) {
  const siteRoot = await mkdtemp(join(tmpdir(), "habits-site-"));
  await mkdir(join(siteRoot, "js"));
  await writeFile(join(siteRoot, "index.html"), "<h1>HABITS</h1>");
  await writeFile(join(siteRoot, "js", "app.js"), "export {};");
  const server = createServer(createHabitsApp({ state, siteRoot, allowWipe }));
  await new Promise((resolve) => server.listen(0, resolve));
  const base = `http://127.0.0.1:${/** @type {any} */ (server.address()).port}`;
  return { base, close: () => new Promise((resolve) => server.close(resolve)) };
}

test("the HTTP app serves the site and keeps one JSON document per key", async () => {
  const state = createMemoryState();
  const app = await startApp(state, true);
  try {
    const home = await fetch(app.base + "/");
    assert.equal(home.headers.get("content-type"), "text/html; charset=utf-8");
    assert.equal(await home.text(), "<h1>HABITS</h1>");
    assert.equal((await fetch(app.base + "/js/app.js")).status, 200);
    assert.equal((await fetch(app.base + "/server/main.js")).status, 404);
    assert.equal((await fetch(app.base + "/nope.html")).status, 404);

    assert.deepEqual(await (await fetch(app.base + "/api/state")).json(), { state: {} });
    const put = await fetch(app.base + "/api/state/habits%3Av1", { method: "PUT", body: '[{"id":"a"}]' });
    assert.equal(put.status, 204);
    assert.deepEqual(await (await fetch(app.base + "/api/state")).json(), { state: { "habits:v1": [{ id: "a" }] } });
    const bad = await fetch(app.base + "/api/state/habits:v1", { method: "PUT", body: "{oops" });
    assert.equal(bad.status, 400);
    assert.match((await bad.json()).error, /expected JSON/);
    assert.equal((await fetch(app.base + "/api/state/../etc", { method: "PUT", body: "1" })).status, 405);
    assert.equal((await fetch(app.base + "/api/state/other:key", { method: "PUT", body: "1" })).status, 400);
    assert.equal((await fetch(app.base + "/api/state/habits:v1", { method: "DELETE" })).status, 204);
    await fetch(app.base + "/api/state/habits:hero:v1", { method: "PUT", body: "{}" });
    assert.equal((await fetch(app.base + "/api/state", { method: "DELETE" })).status, 204);
    assert.deepEqual(await (await fetch(app.base + "/api/state")).json(), { state: {} });
    assert.deepEqual(await (await fetch(app.base + "/api/health")).json(), { ok: true });
  } finally {
    await app.close();
  }
});

test("DELETE /api/state (wipe) is refused unless the memory store is in use", async () => {
  const app = await startApp(createMemoryState({ "habits:v1": [] }), false);
  try {
    assert.equal((await fetch(app.base + "/api/state", { method: "DELETE" })).status, 404);
    assert.deepEqual(await (await fetch(app.base + "/api/state")).json(), { state: { "habits:v1": [] } });
  } finally {
    await app.close();
  }
});

test("postgres store: creates the table with retries, upserts and lists rows through the pool", async () => {
  const queries = [];
  let failures = 2;
  const rows = new Map();
  const pool = {
    async query(text, values = []) {
      queries.push(text.trim().split(/\s+/).slice(0, 2).join(" "));
      if (text.startsWith("CREATE TABLE") && failures > 0) {
        failures -= 1;
        throw new Error("ECONNREFUSED");
      }
      if (text.startsWith("INSERT")) rows.set(values[0], JSON.parse(values[1]));
      if (text.startsWith("DELETE FROM habits_state WHERE")) rows.delete(values[0]);
      if (text.startsWith("DELETE FROM habits_state") && !values.length) rows.clear();
      if (text.startsWith("SELECT")) return { rows: [...rows].map(([key, value]) => ({ key, value })) };
      return { rows: [] };
    },
    async end() {},
  };
  const log = [];
  const state = await createPostgresState("postgresql://u:p@h/d", {
    retrySeconds: 60,
    sleep: async () => {},
    log: (line) => log.push(line.event),
    createPool: () => pool,
  });
  assert.deepEqual(log, ["db-retry", "db-retry"]);
  await state.save("habits:v1", [{ id: "a" }]);
  assert.deepEqual(await state.loadAll(), { "habits:v1": [{ id: "a" }] });
  await state.remove("habits:v1");
  assert.deepEqual(await state.loadAll(), {});
  await state.wipe();
  await state.close();
  assert.equal(queries.filter((q) => q === "CREATE TABLE").length, 3);
});
