// main.js: starts the Habits server: the site's files plus /api/state on PostgreSQL (or in
// memory with HABITS_STORE=memory, used by the e2e suite), with the list itself in the CSV file
// of HABITS_ITEMS_CSV (state-items-csv.js). Logs are one JSON object per line.
//
// Usage: node --env-file=.env server/main.js   (see .env.example)

import { createServer } from "node:http";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHabitsApp } from "./http-app.js";
import { createFileImageStore, createMemoryImageStore } from "./image-store.js";
import { readServerConfig } from "./server-config.js";
import { createItemsCsvState } from "./state-items-csv.js";
import { createMemoryState } from "./state-memory.js";
import { createPostgresState } from "./state-postgres.js";

/** @param {Record<string, unknown>} line */
const log = (line) => console.log(JSON.stringify({ time: new Date().toISOString(), ...line }));

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const config = readServerConfig(process.env, siteRoot);
const documents =
  config.store === "memory"
    ? createMemoryState()
    : await createPostgresState(config.databaseUrl, { retrySeconds: 60, log });
const state = config.itemsCsv ? await createItemsCsvState(documents, config.itemsCsv, { log }) : documents;
// Pictures sit in an images/ folder beside the list's CSV (the mounted state folder) so one volume holds both.
const images = config.itemsCsv
  ? createFileImageStore(join(dirname(config.itemsCsv), "images"))
  : createMemoryImageStore();
const app = createHabitsApp({ state, images, siteRoot, allowWipe: config.store === "memory", log });
const server = createServer(app);
server.listen(config.port, () =>
  log({ event: "listening", port: config.port, store: config.store, itemsCsv: config.itemsCsv || null }),
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    log({ event: "stopping", signal });
    server.close(() => state.close().then(() => process.exit(0)));
  });
}
