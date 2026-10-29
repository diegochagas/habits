# Habits

A black-and-white, ink-styled list of the things I want to read, watch, build and keep
doing. It started as the "ToDo List" Google Sheet (Date, Task, Notes, Source, Done) and
now lives as a static site: add an item with a name, a category and a description where
URLs become links; mark it done; filter by category, search, export or import JSON.

**Arcas do Hábito** (`game.html`) turns the list into a 3DeT Victory campaign in RPG Maker
2000 style: the hero is Diego, drawn as a chibi charset whose body follows the logged weight and
whose look follows the week's habits. Good habits add XP to a track (Poder, Habilidade,
Resistência), bad habits remove it; each track buys only its own atributos, perícias, vantagens
and items. Six Arcas, each a 40×15 tile map you walk through (arrow keys, WASD or the on-screen
d-pad) with three humanoid minions guarding the way to the boss; bumping into one starts a
side-view battle with a command window. Sound effects are synthesised with the Web Audio API
(no audio files); the 🔊 button mutes them.

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

game.html ─── css/game.css
    │
    └─ js/game/game-app.js (state + DOM events + animation loop)
         ├─ rules.js           3DeT core: recursos, dice, críticos, dano, XP costs, tiers
         ├─ weight.js          kg → Lento/Frágil and the sprite's body mass
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
         ├─ chibi-sprite.js / chibi-gear.js   one charset drawer for hero and enemies (hats, items)
         ├─ hero-look.js / enemy-looks.js     ChibiLook from the hero sheet / per enemy key
         ├─ tile-art.js / map-scene.js / battle-scene.js / pixel-painter.js  drawing
         ├─ sound.js / battle-sounds.js       Web Audio RPG Maker style effects, duel → sounds
         ├─ hero-panel.js / today-view.js / sheet-view.js / stages-view.js / battle-view.js  HTML
         └─ game-i18n.js       EN / PT game strings
```

Rules come from the Manual 3DeT Victory (Jambô, 2024): 10 pontos, atributos 0–5, PV = R×5,
PM = H×5, PA = P, testes de 1–3D + atributo, crítico no 6 soma o atributo de novo, ataque (P)
contra defesa (R) com dano igual à diferença, 10 XP = 1 ponto, Iniciante → Herói (20) →
Veterano (35). House rules: weight imposes Lento (≥ 95 kg) and Frágil (≥ 105 kg); each XP
track only buys what that habit trains; Vigoroso also adds R+2 to physical defense.

Flow: first visit → `fetch(data/seed.json)` → `localStorage["habits:v1"]`.
Every change → pure function returns a new list → `store.save` → `render()`.

## Categories

`Read`, `Watch`, `Side Hustle`, `Personal`, the four values of the sheet's Source column.
Add one in `js/categories.js` (list, i18n key, kanji stamp) and `js/i18n.js`.
