// http-app.js: the request handler: /api/state (one JSON document per key; GET on one key lets
// the page pick up a list file edited by hand without reloading) and the site's static files.
// No framework; the state store is injected (Postgres in production, memory in tests).
// Responses are JSON or files, errors carry the offending value.

import { readFile } from "node:fs/promises";
import { imageExtensionFor, imageTypeFor } from "./image-store.js";
import { contentTypeFor, resolveSitePath } from "./static-files.js";

const STATE_PREFIX = "/api/state";
const KEY_PATTERN = /^habits:[a-z0-9:_-]+$/i;
const IMAGES_PREFIX = "/api/images";
const MAX_BODY_BYTES = 1_000_000;
const MAX_IMAGE_BYTES = 8_000_000;

/**
 * @typedef {object} HabitsAppDeps
 * @property {import("./state-memory.js").StateStore} state
 * @property {string} siteRoot
 * @property {import("./image-store.js").ImageStore} [images] the pictures attached to items; without it /api/images is a 404
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
  if (url.pathname === IMAGES_PREFIX || url.pathname.startsWith(IMAGES_PREFIX + "/"))
    return handleImages(deps, req, res, url.pathname.slice(IMAGES_PREFIX.length + 1));
  if (url.pathname === STATE_PREFIX || url.pathname.startsWith(STATE_PREFIX + "/"))
    return handleState(deps, req, res, decodeURIComponent(url.pathname.slice(STATE_PREFIX.length + 1)));
  if (req.method !== "GET" && req.method !== "HEAD")
    return sendJson(res, 405, { error: `${req.method}: expected GET` });
  return sendFile(deps.siteRoot, url.pathname, res);
}

/**
 * POST /api/images (raw picture bytes, Content-Type image/png|jpeg|webp|gif) → { name };
 * GET /api/images/<name> → the picture.
 * @param {HabitsAppDeps} deps
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {string} name "" for the collection
 */
async function handleImages(deps, req, res, name) {
  if (!deps.images) return sendJson(res, 404, { error: `${IMAGES_PREFIX}: pictures are not enabled` });
  if (name === "" && req.method === "POST") return saveImage(deps.images, req, res);
  if (name !== "" && (req.method === "GET" || req.method === "HEAD")) return sendImage(deps.images, name, res);
  return sendJson(res, 405, { error: `${req.method} ${IMAGES_PREFIX}/${name}: expected POST or GET <name>` });
}

/**
 * @param {import("./image-store.js").ImageStore} images
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 */
async function saveImage(images, req, res) {
  const extension = imageExtensionFor(req.headers["content-type"]);
  if (!extension)
    return sendJson(res, 415, {
      error: `Content-Type "${req.headers["content-type"]}": expected image/png, image/jpeg, image/webp or image/gif`,
    });
  const bytes = await readBytes(req, MAX_IMAGE_BYTES);
  if (bytes === null) return sendJson(res, 413, { error: `picture over ${MAX_IMAGE_BYTES} bytes` });
  if (bytes.length === 0) return sendJson(res, 400, { error: "picture: expected a non-empty body" });
  sendJson(res, 201, { name: await images.save(bytes, extension) });
}

/**
 * @param {import("./image-store.js").ImageStore} images
 * @param {string} name
 * @param {import("node:http").ServerResponse} res
 */
async function sendImage(images, name, res) {
  const bytes = await images.read(name);
  if (!bytes) return sendJson(res, 404, { error: `${IMAGES_PREFIX}/${name}: no such picture` });
  // The name is random and the bytes never change, so a browser may keep it for good.
  res.writeHead(200, {
    "Content-Type": imageTypeFor(name),
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(bytes);
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
  if (req.method === "GET") return sendDocument(deps, res, key);
  if (req.method === "PUT") return saveState(deps, req, res, key);
  if (req.method === "DELETE") {
    await deps.state.remove(key);
    return sendEmpty(res, 204);
  }
  return sendJson(res, 405, { error: `${req.method} ${STATE_PREFIX}/${key}: expected GET, PUT or DELETE` });
}

/**
 * @param {HabitsAppDeps} deps
 * @param {import("node:http").ServerResponse} res
 * @param {string} key
 */
async function sendDocument(deps, res, key) {
  const all = await deps.state.loadAll();
  if (!(key in all)) return sendJson(res, 404, { error: `${STATE_PREFIX}/${key}: no such document` });
  sendJson(res, 200, { value: all[key] });
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
async function readBody(req) {
  const bytes = await readBytes(req, MAX_BODY_BYTES);
  return bytes === null ? null : bytes.toString("utf8");
}

/**
 * @param {import("node:http").IncomingMessage} req
 * @param {number} limit
 * @returns {Promise<Buffer | null>} null when the body is over `limit` bytes
 */
function readBytes(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      // Keep reading (and dropping) after the limit: cutting the connection would hide the 413 from the client.
      if (size <= limit) chunks.push(chunk);
    });
    req.on("end", () => resolve(size > limit ? null : Buffer.concat(chunks)));
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
