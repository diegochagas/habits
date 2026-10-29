// http-app.js: the request handler: /api/state (one JSON document per key) and the site's
// static files. No framework; the state store is injected (Postgres in production, memory in
// tests). Responses are JSON or files, errors carry the offending value.

import { readFile } from "node:fs/promises";
import { contentTypeFor, resolveSitePath } from "./static-files.js";

const STATE_PREFIX = "/api/state";
const KEY_PATTERN = /^habits:[a-z0-9:_-]+$/i;
const MAX_BODY_BYTES = 1_000_000;

/**
 * @typedef {object} HabitsAppDeps
 * @property {import("./state-memory.js").StateStore} state
 * @property {string} siteRoot
 * @property {boolean} allowWipe DELETE /api/state (every key) is only for the memory store (e2e)
 * @property {(line: Record<string, unknown>) => void} [log]
 */

/**
 * @param {HabitsAppDeps} deps
 * @returns {(req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) => void}
 * @example createServer(createHabitsApp({ state, siteRoot, allowWipe: false })).listen(4180)
 */
export function createHabitsApp(deps) {
  return (req, res) => {
    handle(deps, req, res).catch((error) => {
      deps.log?.({ event: "request-error", method: req.method, url: req.url, error: String(error) });
      if (!res.headersSent) sendJson(res, 500, { error: String(error) });
      else res.end();
    });
  };
}

/**
 * @param {HabitsAppDeps} deps
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 */
async function handle(deps, req, res) {
  const url = new URL(req.url ?? "/", "http://habits.local");
  if (url.pathname === "/api/health") return sendJson(res, 200, { ok: true });
  if (url.pathname === STATE_PREFIX || url.pathname.startsWith(STATE_PREFIX + "/"))
    return handleState(deps, req, res, decodeURIComponent(url.pathname.slice(STATE_PREFIX.length + 1)));
  if (req.method !== "GET" && req.method !== "HEAD")
    return sendJson(res, 405, { error: `${req.method}: expected GET` });
  return sendFile(deps.siteRoot, url.pathname, res);
}

/**
 * @param {HabitsAppDeps} deps
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {string} key "" for the whole state
 */
async function handleState(deps, req, res, key) {
  if (key === "" && req.method === "GET") return sendJson(res, 200, { state: await deps.state.loadAll() });
  if (key === "" && req.method === "DELETE" && deps.allowWipe) {
    await deps.state.wipe();
    return sendEmpty(res, 204);
  }
  if (key === "") return sendJson(res, 404, { error: `${req.method} ${STATE_PREFIX}: expected GET` });
  if (!KEY_PATTERN.test(key)) return sendJson(res, 400, { error: `key "${key}": expected habits:<name>` });
  if (req.method === "PUT") return saveState(deps, req, res, key);
  if (req.method === "DELETE") {
    await deps.state.remove(key);
    return sendEmpty(res, 204);
  }
  return sendJson(res, 405, { error: `${req.method} ${STATE_PREFIX}/${key}: expected PUT or DELETE` });
}

/**
 * @param {HabitsAppDeps} deps
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {string} key
 */
async function saveState(deps, req, res, key) {
  const body = await readBody(req);
  if (body === null) return sendJson(res, 413, { error: `body over ${MAX_BODY_BYTES} bytes` });
  let value;
  try {
    value = JSON.parse(body);
  } catch {
    return sendJson(res, 400, { error: `body for "${key}": expected JSON` });
  }
  await deps.state.save(key, value);
  sendEmpty(res, 204);
}

/**
 * @param {import("node:http").IncomingMessage} req
 * @returns {Promise<string | null>} null when over the size limit
 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        resolve(null);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/**
 * @param {string} siteRoot
 * @param {string} urlPath
 * @param {import("node:http").ServerResponse} res
 */
async function sendFile(siteRoot, urlPath, res) {
  const filePath = resolveSitePath(urlPath, siteRoot);
  if (!filePath) return sendJson(res, 404, { error: `${urlPath}: not part of the site` });
  try {
    const content = await readFile(filePath);
    res.writeHead(200, { "Content-Type": contentTypeFor(filePath), "Cache-Control": "no-cache" });
    res.end(content);
  } catch {
    sendJson(res, 404, { error: `${urlPath}: not found` });
  }
}

/**
 * @param {import("node:http").ServerResponse} res
 * @param {number} status
 * @param {unknown} payload
 */
function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(payload));
}

/**
 * @param {import("node:http").ServerResponse} res
 * @param {number} status
 */
function sendEmpty(res, status) {
  res.writeHead(status);
  res.end();
}
