// linkify.js: turn a plain-text description into safe HTML where URLs are clickable.
// Text is escaped first, so a description can never inject markup.

const URL_PATTERN = /https?:\/\/[^\s<]+/g;
const TRAILING_PUNCTUATION = /[.,;:!?)\]]+$/;

/**
 * Escape the five HTML-significant characters.
 * @param {string} text
 * @returns {string}
 * @example escapeHtml("a<b") // "a&lt;b"
 */
export function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Split a matched URL into the link itself and punctuation that belongs to the sentence.
 * @param {string} match
 * @returns {{ url: string, tail: string }}
 */
function splitTrailingPunctuation(match) {
  const tail = match.match(TRAILING_PUNCTUATION)?.[0] ?? "";
  return { url: match.slice(0, match.length - tail.length), tail };
}

/**
 * Escaped HTML with http(s) URLs as links and newlines as <br>.
 * @param {string} text
 * @returns {string}
 * @example linkifyDescription("see https://x.io.") // 'see <a href="https://x.io" ...>https://x.io</a>.'
 */
export function linkifyDescription(text) {
  const linked = escapeHtml(text).replace(URL_PATTERN, (match) => {
    const { url, tail } = splitTrailingPunctuation(match);
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>${tail}`;
  });
  return linked.replace(/\r?\n/g, "<br>");
}

/**
 * All http(s) URLs found in a text, punctuation trimmed.
 * @param {string} text
 * @returns {string[]}
 */
export function extractUrls(text) {
  return (text.match(URL_PATTERN) ?? []).map((match) => splitTrailingPunctuation(match).url);
}
