// youtube-embed.js: the focus-music video. A YouTube URL becomes a privacy-enhanced embed with
// the player API enabled, so the page can mute, unmute, play and pause it through postMessage
// without loading YouTube's script.

const ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

/**
 * The 11-character video id from any of the usual YouTube URL shapes, or null.
 * @param {string} url
 * @returns {string | null}
 * @example parseYouTubeId("https://www.youtube.com/watch?v=rFZHOHl-L8A") // "rFZHOHl-L8A"
 */
export function parseYouTubeId(url) {
  const trimmed = url.trim();
  if (ID_PATTERN.test(trimmed)) return trimmed;
  const parsed = safeUrl(trimmed);
  if (!parsed) return null;
  const host = parsed.hostname.replace(/^www\.|^m\./, "");
  if (host === "youtu.be") return validId(parsed.pathname.slice(1));
  if (host !== "youtube.com" && host !== "youtube-nocookie.com" && host !== "music.youtube.com") return null;
  const fromQuery = parsed.searchParams.get("v");
  if (fromQuery) return validId(fromQuery);
  const path = parsed.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?]+)/);
  return path ? validId(path[1]) : null;
}

/**
 * @param {string} candidate
 * @returns {string | null}
 */
function validId(candidate) {
  return ID_PATTERN.test(candidate) ? candidate : null;
}

/**
 * @param {string} text
 * @returns {URL | null}
 */
function safeUrl(text) {
  try {
    return new URL(text);
  } catch {
    return null;
  }
}

/**
 * The iframe src: loops the video, starts muted or not as asked.
 * @param {string} videoId
 * @param {{ autoplay: boolean, muted: boolean, origin: string }} options
 * @returns {string}
 */
export function youtubeEmbedUrl(videoId, options) {
  const params = new URLSearchParams({
    enablejsapi: "1",
    autoplay: options.autoplay ? "1" : "0",
    mute: options.muted ? "1" : "0",
    loop: "1",
    playlist: videoId,
    rel: "0",
    origin: options.origin,
  });
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params}`;
}

/**
 * Send one player command to an embed (the IFrame API's postMessage shape).
 * @param {{ contentWindow: { postMessage: (message: string, origin: string) => void } | null }} iframe
 * @param {"mute" | "unMute" | "playVideo" | "pauseVideo"} command
 * @returns {boolean} false when the frame has no window yet
 */
export function sendYouTubeCommand(iframe, command) {
  if (!iframe.contentWindow) return false;
  iframe.contentWindow.postMessage(JSON.stringify({ event: "command", func: command, args: [] }), "*");
  return true;
}
