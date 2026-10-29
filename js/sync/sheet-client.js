// sheet-client.js: one POST to the Apps Script web app. The body is sent as text/plain so the
// browser skips the CORS preflight Apps Script cannot answer; the token travels in the body,
// never in the URL.

/**
 * @param {typeof fetch} fetchFn injected so tests pass a fake
 */
export function createSheetClient(fetchFn) {
  return {
    /**
     * Apply ops (possibly none) and get every row back.
     * @param {{ url: string, token: string }} settings
     * @param {import("./sheet-rows.js").SyncOp[]} ops
     * @returns {Promise<{ rows: import("./sheet-rows.js").SheetRow[] } | { error: string }>}
     * @example await client.exchange(settings, []) // { rows: [...] }
     */
    async exchange(settings, ops) {
      if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(settings.url))
        return { error: `url ${JSON.stringify(settings.url)}: expected https://script.google.com/macros/s/…/exec` };
      try {
        const response = await fetchFn(settings.url, {
          method: "POST",
          redirect: "follow",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ token: settings.token, ops }),
        });
        if (!response.ok) return { error: `HTTP ${response.status}` };
        return parseExchange(await response.json());
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
      }
    },
  };
}

/**
 * @param {unknown} raw
 * @returns {{ rows: import("./sheet-rows.js").SheetRow[] } | { error: string }}
 */
export function parseExchange(raw) {
  if (typeof raw !== "object" || raw === null) return { error: `response ${typeof raw}: expected an object` };
  const payload = /** @type {Record<string, unknown>} */ (raw);
  if (typeof payload.error === "string") return { error: payload.error };
  if (!Array.isArray(payload.rows)) return { error: "response has no rows" };
  const rows = payload.rows.map((row) => ({
    id: String(row?.id ?? ""),
    date: String(row?.date ?? ""),
    task: String(row?.task ?? ""),
    notes: String(row?.notes ?? ""),
    source: String(row?.source ?? ""),
  }));
  return { rows };
}
