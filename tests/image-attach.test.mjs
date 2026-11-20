// Pictures on items: the item fields, the card/editor markup, the /api/images routes and the stores.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createItem, isImageName, parseItem, updateItem } from "../js/items-store.js";
import { renderCardImages, renderImageField } from "../js/image-attach.js";
import { createHabitsApp } from "../server/http-app.js";
import { createFileImageStore, createMemoryImageStore, imageExtensionFor } from "../server/image-store.js";
import { createMemoryState } from "../server/state-memory.js";

const PICTURE = "0123456789abcdef01.jpg";
const clock = { id: () => "x", now: () => new Date("2026-11-20T10:00:00Z") };

test("picture names: random hex plus a picture extension, nothing that could be a path", () => {
  assert.equal(isImageName(PICTURE), true);
  for (const bad of ["../a.jpg", "abc.jpg", "0123456789abcdef01.svg", "0123456789abcdef01.jpg/x", 7, undefined])
    assert.equal(isImageName(bad), false, String(bad));
});

test("items keep their pictures: create, update (add and remove) and parse drop anything invalid", () => {
  const fields = { name: "Read", category: "Poder", description: "", images: [PICTURE, "../x.png", PICTURE] };
  const created = createItem(fields, clock);
  assert.ok("item" in created);
  assert.deepEqual(created.item.images, [PICTURE]);
  const none = updateItem([created.item], "x", { ...fields, images: [] });
  assert.ok("items" in none);
  assert.equal("images" in none.items[0], false, "removing the last picture leaves the field out");
  const parsed = parseItem({ ...created.item, images: [PICTURE, 3] });
  assert.ok("item" in parsed);
  assert.deepEqual(parsed.item.images, [PICTURE]);
});

test("markup: the editor field carries one hidden input per picture; a card links them full size", () => {
  const field = renderImageField("en", [PICTURE]);
  assert.match(field, /<input type="hidden" name="images" value="0123456789abcdef01\.jpg"/);
  assert.match(field, /data-image-input/);
  assert.equal(renderCardImages(undefined, "en"), "");
  assert.match(renderCardImages([PICTURE], "pt"), /href="\/api\/images\/0123456789abcdef01\.jpg" target="_blank"/);
});

test("image stores: a saved picture reads back, a name that is not one reads as nothing", async () => {
  const folder = await mkdtemp(join(tmpdir(), "habits-img-"));
  for (const store of [createMemoryImageStore(), createFileImageStore(join(folder, "images"))]) {
    const name = await store.save(Buffer.from("png-bytes"), "png");
    assert.ok(isImageName(name), name);
    assert.equal((await store.read(name))?.toString(), "png-bytes");
    assert.equal(await store.read("../../etc/passwd"), null);
  }
  assert.equal(imageExtensionFor("image/JPEG; q=1"), "jpg");
  assert.equal(imageExtensionFor("image/svg+xml"), null);
});

/** @param {boolean} withImages */
async function listen(withImages) {
  const images = withImages ? createMemoryImageStore() : undefined;
  const server = createServer(
    createHabitsApp({ state: createMemoryState(), images, siteRoot: "/nope", allowWipe: false }),
  );
  await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(undefined)));
  const { port } = /** @type {import("node:net").AddressInfo} */ (server.address());
  return { base: `http://127.0.0.1:${port}`, close: () => server.close() };
}

test("api: POST /api/images stores a picture and GET serves it back with its type", async () => {
  const { base, close } = await listen(true);
  try {
    const post = await fetch(`${base}/api/images`, {
      method: "POST",
      headers: { "Content-Type": "image/png" },
      body: Buffer.from([137, 80, 78, 71]),
    });
    assert.equal(post.status, 201);
    const { name } = await post.json();
    const get = await fetch(`${base}/api/images/${name}`);
    assert.equal(get.headers.get("content-type"), "image/png");
    assert.deepEqual([...Buffer.from(await get.arrayBuffer())], [137, 80, 78, 71]);
    assert.equal((await fetch(`${base}/api/images/0123456789abcdef01.png`)).status, 404);
  } finally {
    close();
  }
});

test("api: a wrong type is a 415, an empty body a 400, an oversized one a 413, no store a 404", async () => {
  const { base, close } = await listen(true);
  const post = (type, body) => fetch(`${base}/api/images`, { method: "POST", headers: { "Content-Type": type }, body });
  try {
    assert.equal((await post("text/html", "<script>")).status, 415);
    assert.equal((await post("image/png", "")).status, 400);
    assert.equal((await post("image/png", Buffer.alloc(8_000_001))).status, 413);
  } finally {
    close();
  }
  const off = await listen(false);
  try {
    assert.equal((await fetch(`${off.base}/api/images/${PICTURE}`)).status, 404);
  } finally {
    off.close();
  }
});
