// static-files.js: which files of the repo the server hands out, and as what. Only the site's
// own folders are reachable; server/, tests/, node_modules/ and dotfiles never are.

import { extname, join, normalize, sep } from "node:path";

const SITE_FILES = new Set(["index.html", "game.html", "puzzle.html"]);
const SITE_FOLDERS = new Set(["css", "js", "data"]);
const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

/**
 * The absolute file for a request path, or null when it is not part of the site.
 * @param {string} urlPath e.g. "/js/app.js"; "/" is index.html
 * @param {string} siteRoot
 * @returns {string | null}
 * @example resolveSitePath("/css/ink.css", "/srv/habits") // "/srv/habits/css/ink.css"
 */
export function resolveSitePath(urlPath, siteRoot) {
  const relative = normalize(decodeURIComponent(urlPath)).replace(/^[/\\]+/, "") || "index.html";
  const parts = relative.split(/[/\\]/);
  if (parts.some((part) => part === ".." || part.startsWith("."))) return null;
  const allowed = parts.length === 1 ? SITE_FILES.has(parts[0]) : SITE_FOLDERS.has(parts[0]);
  if (!allowed) return null;
  const absolute = join(siteRoot, relative);
  return absolute.startsWith(siteRoot + sep) ? absolute : null;
}

/**
 * @param {string} filePath
 * @returns {string}
 */
export function contentTypeFor(filePath) {
  return CONTENT_TYPES[extname(filePath)] ?? "application/octet-stream";
}
