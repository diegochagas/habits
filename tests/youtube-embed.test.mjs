import { test } from "node:test";
import assert from "node:assert/strict";
import { parseYouTubeId, sendYouTubeCommand, youtubeEmbedUrl } from "../js/pomodoro/youtube-embed.js";

test("every usual YouTube URL shape yields the video id; anything else is null", () => {
  const id = "rFZHOHl-L8A";
  for (const url of [
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?feature=share&v=${id}&t=10`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}?si=abc`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/live/${id}`,
    `https://music.youtube.com/watch?v=${id}`,
    ` ${id} `,
  ])
    assert.equal(parseYouTubeId(url), id, url);
  for (const bad of ["", "not a url", "https://vimeo.com/123", "https://www.youtube.com/", "https://youtu.be/short"])
    assert.equal(parseYouTubeId(bad), null, bad);
});

test("the embed URL loops the video on the privacy domain with the API on", () => {
  const url = new URL(youtubeEmbedUrl("rFZHOHl-L8A", { autoplay: true, muted: false, origin: "https://example.test" }));
  assert.equal(url.origin + url.pathname, "https://www.youtube-nocookie.com/embed/rFZHOHl-L8A");
  assert.deepEqual(
    ["enablejsapi", "autoplay", "mute", "loop", "playlist", "origin"].map((key) => url.searchParams.get(key)),
    ["1", "1", "0", "1", "rFZHOHl-L8A", "https://example.test"],
  );
});

test("player commands are posted in the IFrame API shape", () => {
  const posted = [];
  const iframe = { contentWindow: { postMessage: (message, origin) => posted.push([message, origin]) } };
  assert.equal(sendYouTubeCommand(iframe, "mute"), true);
  assert.deepEqual(posted, [[JSON.stringify({ event: "command", func: "mute", args: [] }), "*"]]);
  assert.equal(sendYouTubeCommand({ contentWindow: null }, "playVideo"), false);
});
