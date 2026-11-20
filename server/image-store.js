// image-store.js: where the pictures attached to items live. The list stays a CSV of names; the
// bytes sit in one file per picture (next to the CSV, so the same mounted folder is the backup)
// or, for the memory store used by tests and e2e, in a Map. Names are random, so a name is
// never guessable and never carries a path.

import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { isImageName } from "../js/items-store.js";

const EXTENSION_BY_TYPE = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);
const TYPE_BY_EXTENSION = new Map([...EXTENSION_BY_TYPE].map(([type, extension]) => [extension, type]));

/**
 * @typedef {object} ImageStore
 * @property {(bytes: Buffer, extension: string) => Promise<string>} save returns the new name
 * @property {(name: string) => Promise<Buffer | null>} read null when there is no such picture
 */

/**
 * @param {string | undefined} contentType a Content-Type header, parameters allowed
 * @returns {string | null} the file extension for a supported picture type, else null
 * @example imageExtensionFor("image/jpeg; charset=binary") // "jpg"
 */
export function imageExtensionFor(contentType) {
  return EXTENSION_BY_TYPE.get((contentType ?? "").split(";")[0].trim().toLowerCase()) ?? null;
}

/**
 * @param {string} name a stored picture name
 * @returns {string} its Content-Type
 * @example imageTypeFor("0123456789abcdef01.png") // "image/png"
 */
export function imageTypeFor(name) {
  return TYPE_BY_EXTENSION.get(name.slice(name.lastIndexOf(".") + 1)) ?? "application/octet-stream";
}

/** @returns {string} a name of the shape isImageName accepts, minus the extension */
function newImageStem() {
  return randomBytes(9).toString("hex");
}

/**
 * @param {string} folder created on the first save
 * @returns {ImageStore}
 * @example const images = createFileImageStore("state/images")
 */
export function createFileImageStore(folder) {
  return {
    async save(bytes, extension) {
      const name = `${newImageStem()}.${extension}`;
      await mkdir(folder, { recursive: true });
      await writeFile(join(folder, name), bytes, { flag: "wx" });
      return name;
    },
    async read(name) {
      if (!isImageName(name)) return null;
      return readFile(join(folder, name)).catch(() => null);
    },
  };
}

/**
 * @returns {ImageStore} pictures kept in RAM (HABITS_STORE=memory)
 */
export function createMemoryImageStore() {
  /** @type {Map<string, Buffer>} */
  const pictures = new Map();
  return {
    async save(bytes, extension) {
      const name = `${newImageStem()}.${extension}`;
      pictures.set(name, bytes);
      return name;
    },
    async read(name) {
      return pictures.get(name) ?? null;
    },
  };
}
