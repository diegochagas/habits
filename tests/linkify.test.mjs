import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, extractUrls, linkifyDescription } from "../js/linkify.js";

test("escapeHtml neutralises markup", () => {
  assert.equal(
    escapeHtml(`<img src=x onerror="alert('1')">`),
    "&lt;img src=x onerror=&quot;alert(&#39;1&#39;)&quot;&gt;",
  );
});

test("linkifyDescription turns URLs into safe links and keeps sentence punctuation outside", () => {
  const html = linkifyDescription("Course: https://anthropic.skilljar.com/claude-code-101. Then rest.");
  assert.equal(
    html,
    'Course: <a href="https://anthropic.skilljar.com/claude-code-101" target="_blank" rel="noopener noreferrer">https://anthropic.skilljar.com/claude-code-101</a>. Then rest.',
  );
});

test("linkifyDescription keeps query strings and escapes the rest of the text", () => {
  const html = linkifyDescription("<b>see</b> https://youtu.be/ZWj8o692qGY?si=NB&t=2036 now");
  assert.ok(html.startsWith('&lt;b&gt;see&lt;/b&gt; <a href="https://youtu.be/ZWj8o692qGY?si=NB&amp;t=2036"'));
  assert.ok(!html.includes("<b>"));
});

test("linkifyDescription converts newlines to <br>", () => {
  assert.equal(linkifyDescription("a\nb\r\nc"), "a<br>b<br>c");
});

test("a javascript: URL is never linked", () => {
  const html = linkifyDescription("javascript:alert(1) and http://ok.example");
  assert.ok(!html.includes('href="javascript'));
  assert.ok(html.includes('href="http://ok.example"'));
});

test("extractUrls lists every URL with trailing punctuation trimmed", () => {
  assert.deepEqual(extractUrls("x https://a.io/p), y http://b.io."), ["https://a.io/p", "http://b.io"]);
  assert.deepEqual(extractUrls("no links"), []);
});
