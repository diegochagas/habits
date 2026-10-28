# Habits

A black-and-white, ink-styled list of the things I want to read, watch, build and keep
doing. It started as the "ToDo List" Google Sheet (Date, Task, Notes, Source, Done) and
now lives as a static site: add an item with a name, a category and a description where
URLs become links; mark it done; filter by category, search, export or import JSON.

No build step, no runtime dependencies. Everything is saved in the browser's
`localStorage`; **Export** downloads a JSON backup and **Import** restores one.
**Reset to sheet** reloads the original list from `data/seed.json`.

## Run it

```bash
npm run serve        # http://localhost:4180 (any static server works, even `python3 -m http.server`)
```

Or open the folder with GitHub Pages: the repo root is the site.

## Develop

```bash
scripts/setup        # dev deps (Playwright, prettier, serve) + git hooks, idempotent
scripts/check        # prettier + node --test + clean-code audit (also runs on pre-push)
npm run e2e          # Playwright smoke, desktop + mobile, screenshots in e2e/screenshots/
```

## Architecture

```
index.html ─── css/ink.css (ink, halftone, speed lines, bubble, stamps)
    │
    └─ js/app.js (state + DOM events)
         ├─ items-store.js   parse/create/toggle/remove + localStorage wrapper
         ├─ filters.js       category / search / status, sort order, counts
         ├─ render-items.js  cards, tabs, select options (HTML strings)
         ├─ linkify.js       escape text, http(s) URLs → <a>, newlines → <br>
         ├─ export-import.js JSON download / upload
         ├─ i18n.js          EN / PT strings
         └─ categories.js    Read · Watch · Side Hustle · Personal
data/seed.json  snapshot of the sheet (310 items), copied into localStorage on first visit
```

Flow: first visit → `fetch(data/seed.json)` → `localStorage["habits:v1"]`.
Every change → pure function returns a new list → `store.save` → `render()`.

## Categories

`Read`, `Watch`, `Side Hustle`, `Personal`, the four values of the sheet's Source column.
Add one in `js/categories.js` (list, i18n key, kanji stamp) and `js/i18n.js`.
