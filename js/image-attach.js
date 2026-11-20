// image-attach.js: pictures on a card. Markup for the "Pictures" field of the add form and the
// editor (hidden inputs named "images" carry the names, so itemFieldsFromForm reads them with
// FormData), the thumbnails on a card, and the upload: a chosen file is shrunk (a phone photo is
// several MB) and POSTed to /api/images, which answers with the name to keep on the item.

import { translate } from "./i18n.js";
import { escapeHtml } from "./linkify.js";

const IMAGES_URL = "/api/images";
const SHRINK_ABOVE_BYTES = 800_000;
const LONGEST_SIDE_PX = 1600;

/**
 * @param {string} name a picture name
 * @returns {string} the URL the server serves it from
 * @example imageUrl("0123456789abcdef01.jpg") // "/api/images/0123456789abcdef01.jpg"
 */
export function imageUrl(name) {
  return `${IMAGES_URL}/${encodeURIComponent(name)}`;
}

/**
 * The editable part: file picker plus one removable thumbnail per picture already on the item.
 * @param {import("./i18n.js").Lang} lang
 * @param {string[]} [images]
 * @returns {string}
 * @example renderImageField("en", ["0123456789abcdef01.jpg"])
 */
export function renderImageField(lang, images = []) {
  return `<div class="field image-field" data-image-field>
    <div class="image-thumbs" data-image-thumbs>${images.map((name) => renderThumb(name, lang)).join("")}</div>
    <label class="field"><span>${translate(lang, "fieldImages")}</span>
      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple data-image-input /></label>
    <p class="form-error" data-image-error role="alert" hidden></p>
  </div>`;
}

/**
 * @param {string} name
 * @param {string} [extra] more attributes for the <img>
 * @returns {string}
 */
function imgTag(name, extra = "") {
  return `<img src="${imageUrl(name)}" alt=""${extra} />`;
}

/**
 * @param {string} name
 * @param {import("./i18n.js").Lang} lang
 * @param {boolean} [uploaded] picked in this editor and not saved on the item yet (data-new)
 * @returns {string} a thumbnail with its hidden input and remove button
 */
function renderThumb(name, lang, uploaded = false) {
  const label = escapeHtml(translate(lang, "imageRemove"));
  return `<span class="image-thumb"${uploaded ? " data-new" : ""}>${imgTag(name)}
    <input type="hidden" name="images" value="${escapeHtml(name)}" />
    <button type="button" class="image-thumb-remove" data-action="remove-image" aria-label="${label}" title="${label}">×</button></span>`;
}

/**
 * The pictures under a card's text; each opens full size in a new tab.
 * @param {string[] | undefined} images
 * @param {import("./i18n.js").Lang} lang
 * @returns {string} "" when the item has none
 */
export function renderCardImages(images, lang) {
  if (!images || images.length === 0) return "";
  const title = escapeHtml(translate(lang, "imageOpen"));
  const links = images.map(
    (name) =>
      `<a href="${imageUrl(name)}" target="_blank" rel="noopener noreferrer" title="${title}">${imgTag(name, ' loading="lazy"')}</a>`,
  );
  return `<div class="card-images">${links.join("")}</div>`;
}

/**
 * Shrink a big photo to a JPEG no wider than LONGEST_SIDE_PX; small files and GIFs go as they are.
 * @param {File} file
 * @returns {Promise<Blob>}
 */
async function shrinkImage(file) {
  if (file.size <= SHRINK_ABOVE_BYTES || file.type === "image/gif") return file;
  try {
    return await drawAsJpeg(file);
  } catch {
    return file; // a format this browser cannot decode: the server judges the original
  }
}

/**
 * @param {File} file
 * @returns {Promise<Blob>}
 */
async function drawAsJpeg(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, LONGEST_SIDE_PX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "#fff"; // JPEG has no alpha: transparent pixels would turn black
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  }
  const jpeg = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  return jpeg ?? file;
}

/**
 * @param {File} file
 * @returns {Promise<string>} the name the server gave the picture
 * @throws {Error} naming the status the server answered with
 */
async function uploadImage(file) {
  const body = await shrinkImage(file);
  const response = await fetch(IMAGES_URL, { method: "POST", headers: { "Content-Type": body.type }, body });
  if (!response.ok) throw new Error(`${IMAGES_URL}: ${response.status}, expected 201 for a ${body.type} picture`);
  return (await response.json()).name;
}

/**
 * Wire the pickers and the remove buttons of every image field on the page (they come and go with
 * the editor, so the listeners sit on the document).
 * @param {() => import("./i18n.js").Lang} currentLang
 */
export function bindImageAttach(currentLang) {
  document.addEventListener("change", (event) => {
    const input = /** @type {HTMLInputElement} */ (event.target);
    if (input.matches?.("[data-image-input]")) void attachFiles(input, currentLang());
  });
  document.addEventListener("click", (event) => {
    const button = /** @type {HTMLElement} */ (event.target).closest?.("[data-action='remove-image']");
    const thumb = button?.closest(".image-thumb");
    if (thumb instanceof HTMLElement && "new" in thumb.dataset) discardNewImages(thumb);
    thumb?.remove();
  });
}

/**
 * Delete from the server the pictures that were uploaded under `root` and never saved on an item
 * (a cancelled editor or a removed thumbnail), so abandoned uploads do not pile up.
 * @param {ParentNode} root
 */
export function discardNewImages(root) {
  const thumbs =
    root instanceof HTMLElement && "new" in root.dataset ? [root] : root.querySelectorAll(".image-thumb[data-new]");
  deleteImages([...thumbs].map((thumb) => thumb.querySelector("input[name='images']")?.getAttribute("value") ?? ""));
}

/**
 * Best-effort DELETE of pictures (a leftover file is harmless, so failures are ignored).
 * @param {string[] | undefined} names
 */
export function deleteImages(names = []) {
  for (const name of names.filter(Boolean)) void fetch(imageUrl(name), { method: "DELETE" }).catch(() => {});
}

/**
 * @param {HTMLInputElement} input
 * @param {import("./i18n.js").Lang} lang
 */
async function attachFiles(input, lang) {
  const field = input.closest("[data-image-field]");
  const thumbs = field?.querySelector("[data-image-thumbs]");
  const error = /** @type {HTMLElement | null} */ (field?.querySelector("[data-image-error]") ?? null);
  const showError = (/** @type {string} */ message) => {
    if (!error) return;
    error.textContent = message;
    error.hidden = !message;
  };
  const files = [...(input.files ?? [])];
  input.value = "";
  // Save/ADD stays off until the uploads end, or the item would be saved without the picture.
  const submit = /** @type {HTMLButtonElement | null} */ (input.form?.querySelector("button[type='submit']") ?? null);
  if (submit) submit.disabled = true;
  try {
    const names = await Promise.all(files.map(uploadImage));
    for (const name of names) thumbs?.insertAdjacentHTML("beforeend", renderThumb(name, lang, true));
    showError("");
  } catch {
    showError(translate(lang, "errorImageUpload"));
  } finally {
    if (submit) submit.disabled = false;
  }
}

/**
 * Fill the add form's picture field (it lives outside the grid, so app.js renders it): again on a
 * language switch, keeping the pictures already chosen, and empty after an item was added.
 * @param {HTMLElement} container the add form's #add-images
 * @param {import("./i18n.js").Lang} lang
 * @param {boolean} [keepChosen] keep the pictures already attached
 */
export function renderAddImages(container, lang, keepChosen = true) {
  const chosen = keepChosen ? [...container.querySelectorAll("input[name='images']")] : [];
  container.innerHTML = renderImageField(
    lang,
    chosen.map((input) => /** @type {HTMLInputElement} */ (input).value),
  );
}
