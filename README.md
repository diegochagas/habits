# Habits

A black-and-white, ink-styled list of the things I want to read, watch, build and keep
doing. It started as the "ToDo List" Google Sheet (Date, Task, Notes, Source, Done) and
now lives on the home server: add an item with a name, a category, a description where
URLs become links and a date; edit it in place; mark it done; filter by category and search
(Enter keeps the matches and empties the box for the next search; Enter on the empty box shows
everything again), export or import JSON. The categories are the three 3DeT **características** (Poder, Habilidade,
Resistência): an item done pays 1 XP on that track, and a **Today habit** (any item with the
flag ticked) pays its own XP per day, is done once a day and comes back every morning.

The habits page (`index.html`) also holds the **hero**: the Today tab (the first one) lists the
daily items still to do as the good habits (Devotional, Duolingo, Finances, Gym workout… once a
day each; a done one leaves the tab and shows "Already done today" greyed out on the list), then
the catalog's bad habits (XP out of three tracks, Poder / Habilidade / Resistência); the Sheet tab spends that XP on
atributos, perícias, vantagens and items, and the hero card shows the chibi whose body follows
the logged weight and height (the BMI). A **Pomodoro** panel sits on top: pick a list item (or press 🍅 on its card; a work
block does not start without one), work 25 minutes with an optional YouTube focus video (saved
link, mute button), rest 5 (15 every 4th). Each finished Pomodoro is a good habit (+1 XP on the item's track) and earns its break as
**free time**, which is the only time the play
pages are open; they count it down while you play and lock when it runs out, putting the clock
back on the Pomodoro mode so "Back to Habits" (`index.html#pomodoro`) lands on the picker for the
next block.

**Arcas do Hábito** (`game.html`) is the 3DeT Victory campaign in RPG Maker 2000 style: six
Arcas, each a 40×15 tile map you walk through (arrow keys, WASD or the on-screen d-pad) with three
humanoid minions guarding the way to the boss; bumping into one starts a side-view battle with a
command window. Leaving an Arca restores PV/PM/PA. **Sort puzzles** (`puzzle.html`) are the
break-time alternative: Magic Sort style tubes (one ball per pour) and coin stacks (the whole run
pours), nine ink patterns instead of colours, levels generated and checked solvable by a solver.
Sound effects are synthesised with the Web Audio API (no audio files); the 🔊 button mutes them.

No build step. `server/` is a small Node server (the only dependency is `pg`) that serves the
pages and keeps the saved documents (the hero, the Pomodoro, the puzzle progress, the sync
settings) in one PostgreSQL table, so the same state is there from any device. **The list itself
is a CSV file** (`state/items.csv`, see [The list file](#the-list-file)) that can be edited by
hand: the page shows the file's rows and writes every change made on the page back to it. Served
as plain files instead (`npx serve .`), the pages fall back to the browser's `localStorage`.
**Export** downloads a JSON backup and **Import** restores one. **Reset to sheet** reloads the
original list from `data/seed.json`.

**Sync with the Google Sheet** (optional): deploy [`sheets-sync/Code.gs`](sheets-sync/Code.gs)
as an Apps Script web app bound to the sheet and paste its URL and secret word under **Sync**.
The sheet then becomes the source of truth: rows deleted or added there come and go on the site,
Done / Remove on the site delete the row (a daily item's row gets a checkbox in Done, ticked by
Done and unticked again the next morning), an added or edited item is written. Steps and the
sync table are in [sheets-sync/README.md](sheets-sync/README.md).

## Run it

```bash
npm run serve        # no database: state in memory, http://localhost:4180
npm run dev          # PostgreSQL from .env (copy .env.example), list in state/items.csv, same port
```

## The list file

With the PostgreSQL store the list lives in `state/items.csv` next to the server (on the home
server: `state/` inside the deployed clone, mounted into the container; `HABITS_ITEMS_CSV` in
`.env` / `.env.docker` moves it, an empty value keeps the list in the database). The first
start after the change writes the file from the list the database held and drops that copy.

One row per item, in this order:

| column        | value                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------ |
| `name`        | the title (required)                                                                       |
| `category`    | `Poder`, `Habilidade` or `Resistência` (the old `Read`, `Watch`, `Side Hustle` still load) |
| `daily`       | `true` for a Today habit (`yes`, `x`, `1` also count), anything else is not                |
| `xp`          | 1–3 XP per day for a daily item (blank = 1); ignored on other items                        |
| `date`        | `yyyy-mm-dd`; blank = the day the server first reads the row                               |
| `done`        | `true` / `false`                                                                           |
| `doneAt`      | `yyyy-mm-dd` of the last Done (blank while to do)                                          |
| `url`         | an http(s) link the title opens, or blank                                                  |
| `description` | free text; commas, quotes and line breaks go inside double quotes (a spreadsheet does it)  |
| `id`          | leave blank on a row you type: the server fills it in and writes the file back             |
| `createdAt`   | ISO timestamp; blank on a typed row, filled in like `id`                                   |

The page reads the file when it loads, once a minute while open, and when its tab comes back to
the front, so an edit shows up without a reload. Every change made on the page (add, edit, done,
remove, import, the daily roll, the sheet sync) rewrites the whole file, with every column
filled and `true`/`false` spelled out, so keep a row's `id` when you move it around. A row the
server cannot read (an unknown category, no name) is logged (`items-csv-row-skipped`, with its
line) and left out of the page; the next change made on the page writes the file without it, so
fix it first. Blank lines are fine; columns other than the ones above are dropped. With the
Google Sheet sync on, the sheet still wins: an edit made in the file and not on the sheet is
reverted by the next pull, so use one or the other as the place to edit. The file is
UTF-8 without a BOM (LibreOffice opens it as is; a BOM added by Excel is read). The container
writes the file with the owner and group of the `state/` folder, so it can be edited over
SMB or in a terminal without sudo.

## Deploy (home server)

The server runs as a docker compose stack next to the PostgreSQL app, deployed by push: a
`git push` from the workstation also updates the clone on the server, whose post-receive hook
runs `docker compose up -d --build`. One-time setup on the server:

```bash
sudo bash /DATA/Projects/habits/scripts/zimaos-first-deploy.sh   # database, state/ folder, sudoers, compose up
```

Backups: the PostgreSQL app's data folder is part of the nightly server backup; the list is the
file `state/items.csv` in the deployed clone (copy it, or keep **Export** on the page as the manual copy).

Or open the folder with GitHub Pages: the repo root is the site.

## Develop

```bash
scripts/setup        # dev deps (Playwright, prettier, serve) + git hooks, idempotent
scripts/check        # prettier + node --test + clean-code audit (also runs on pre-push)
npm run e2e          # Playwright smoke, desktop + mobile, screenshots in e2e/screenshots/
```

## Architecture

```
index.html ─── css/ink.css (ink, halftone, speed lines, bubble, stamps) + game.css + pomodoro.css
    │
    └─ js/app.js (state + DOM events: list, List/Today/Sheet tabs, hero, Pomodoro)
         ├─ items-store.js   parse/create/toggle/remove + localStorage wrapper
         ├─ filters.js       category / search / status, sort order, counts
         ├─ render-items.js  cards (with the 🍅 button and count), tabs, select options
         ├─ linkify.js       escape text, http(s) URLs → <a>, newlines → <br>; items also carry an optional `url` (the title becomes a link; a hyperlink on the sheet's Task or Notes cell)
         ├─ export-import.js JSON download / upload
         ├─ i18n.js          EN / PT strings
         ├─ categories.js    Poder · Habilidade · Resistência (= XP track), old Source values migrated
         ├─ game/hero-controller.js   the hero's actions (habits, shop, rest, weight), shared with game.html
         ├─ sync/
         │    ├─ sheet-rows.js     sheet row ↔ item, ops between two lists, merge (sheet wins, queue kept)
         │    ├─ sync-store.js     settings + op queue in localStorage ("habits:sync:v1")
         │    ├─ sheet-client.js   one text/plain POST to the Apps Script /exec URL
         │    └─ sync-app.js       panel, pull on load / every 5 min / after each change
sheets-sync/Code.gs   the Apps Script web app (hidden Id column, delete/upsert ops) + README
         └─ pomodoro/
              ├─ pomodoro-clock.js  pure clock: modes, start/pause/tick, free time earned, day roll
              ├─ pomodoro-store.js  localStorage ("habits:pomodoro:v1")
              ├─ pomodoro-view.js / pomodoro-app.js   panel HTML, interval, item pick, embed control
              ├─ youtube-embed.js   URL → video id, embed URL, postMessage commands (mute, play…)
              ├─ free-time-gate.js  play pages: spend 1 s/s while visible, lock at zero
              └─ pomodoro-i18n.js   EN / PT
data/seed.json  snapshot of the sheet (310 items), copied into the store on first visit
state/items.csv the list as a CSV (postgres store): server/state-items-csv.js reads it on every
                load and writes it on every save of habits:v1; items-csv.js maps rows ↔ items,
                csv-text.js is the RFC 4180 reader/writer. Other keys go to state-postgres.js.

puzzle.html ─── css/puzzle.css
    │
    └─ js/puzzle/puzzle-app.js (progress per skin, clicks, sounds, free-time gate)
         ├─ sort-puzzle.js    pure engine: level spec, generator + DFS solver, pour/undo/solved
         ├─ puzzle-view.js    board HTML (ink patterns, lifted run on the selected tube)
         ├─ puzzle-store.js   localStorage ("habits:puzzle:v1")
         └─ puzzle-i18n.js    EN / PT

game.html ─── css/game.css (Arcas + Adventure only; needs free time)
    │
    └─ js/game/game-app.js (stage run + animation loop + sounds; hero via hero-controller)
         ├─ rules.js           3DeT core: recursos, dice, críticos, dano, XP costs, tiers
         ├─ weight.js          kg + cm → BMI → Lento/Frágil and the sprite's body mass
         ├─ catalog.js         habits, shop (perícias/vantagens/artefatos/items) per track
         ├─ hero-sheet.js      starting Ficha, derived sheet, rest
         ├─ progression.js     habits → XP pools → purchases; list-item credit; aura
         ├─ hero-store.js      localStorage ("habits:hero:v1"), Hero → Combatant
         ├─ stages.js          the six Arcas and their enemies
         ├─ combat.js          one duel as a pure state machine
         ├─ stage-maps.js      ASCII tile map per Arca (legend in the file), start + spawns
         ├─ stage-walk.js      tile movement, bumping into enemies, camera
         ├─ stage-run.js       map walk → duel → back to the map, rewards, pose beats
         ├─ stage-input.js     arrow/WASD keys + d-pad pointer events → held direction
         ├─ chibi-sprite.js / chibi-gear.js   one charset drawer for the enemies (hats, items)
         ├─ diego-sprite.js / chibi-common.js the hero's own pixel sheet (traced from Diego's reference figure)
         ├─ hero-look.js / enemy-looks.js     ChibiLook from the hero sheet / per enemy key
         ├─ tile-art.js / map-scene.js / battle-scene.js / pixel-painter.js  drawing
         ├─ sound.js / battle-sounds.js       Web Audio RPG Maker style effects, duel → sounds
         ├─ hero-panel.js / stages-view.js / battle-view.js  HTML (today-view / sheet-view render on index.html)
         └─ game-i18n.js       EN / PT game strings
```

Rules come from the Manual 3DeT Victory (Jambô, 2024): 10 pontos, atributos 0–5, PV = R×5,
PM = H×5, PA = P, testes de 1–3D + atributo, crítico no 6 soma o atributo de novo, ataque (P)
contra defesa (R) com dano igual à diferença, 10 XP = 1 ponto, Iniciante → Herói (20) →
Veterano (35). House rules: the BMI (weight and height logged on the hero card) imposes Lento
(≥ 30, obesity) and Frágil (≥ 35, obesity class II); each XP
track only buys what that habit trains; Vigoroso also adds R+2 to physical defense.

Flow: first visit → `fetch(data/seed.json)` → `storage["habits:v1"]` (the CSV on the server,
localStorage without one). Every change → pure function returns a new list → `store.save` →
`render()`. Once a minute and when the tab returns, `storage.reload("habits:v1")` (`GET
/api/state/habits:v1`) picks up a file edited by hand.

Test hooks: `?seed=N` fixes the dice (game) and the level generator (puzzles); `?fast=1` makes a
Pomodoro "minute" 0.1 s so e2e can finish one. Unspent free time resets at midnight.

## Categories

`Poder`, `Habilidade`, `Resistência`: the sheet's Source column holds the característica an item
trains since 2026-10-29 (Poder for doing and shipping, Habilidade for reading, courses and code,
Resistência for devotional, finances, health and rest). Its old values still load: Read →
Habilidade, Watch → Resistência, Side Hustle → Poder, and a Today / Personal row is a daily item
of the track it had. Any item can be a **Today habit** (`daily`): listed on the Today tab, done
once a day, back every morning, worth 1–3 XP per day. Add a category in `js/categories.js`
(list, track, i18n key, kanji stamp) and `js/i18n.js`.
