# Google Sheets sync

The site keeps the list in the browser. With this script deployed, the "ToDo List" sheet becomes
the source of truth: rows removed or added in the sheet disappear or appear on the site, and
Done / Remove on the site delete the row in the sheet (an item added on the site is appended).

The script runs as you, inside your Google account; the site only knows its URL and a secret
word, both saved in your browser (never in this repository).

## One-time deploy (about five minutes)

1. Open the sheet → **Extensions → Apps Script**. Add a script file (Files **+** → Script) named
   `HabitsSync` and paste the contents of [`Code.gs`](Code.gs) into it. Save. (Keep the project's
   existing `Code.gs`: it holds the nightly checklist reset.)
2. **Project Settings** (gear) → **Script properties** → **Add script property**:
   name `HABITS_TOKEN`, value: any long secret word you make up. Save.
3. **Deploy → New deployment** → type **Web app**: description "Habits", execute as **Me**,
   who has access **Anyone**. Deploy, authorize when asked, copy the **Web app URL**
   (it ends with `/exec`).
4. On the site, press **Sync** in the header, paste the URL and the secret word, **Save**, then
   **Sync now**. The first sync fills a hidden `Id` column (F) in the sheet.

To update the script later: paste the new `Code.gs` into `HabitsSync.gs`, then **Deploy → Manage deployments →
edit → version: New version → Deploy** (the URL stays the same).

## What syncs

| On the site           | In the sheet                                                              |
| --------------------- | ------------------------------------------------------------------------- |
| Done or Remove        | the row is deleted                                                        |
| Undo before next sync | the row is written back                                                   |
| Add or edit an item   | a row is appended / rewritten (Date, Task, Notes, Source, daily checkbox) |
| Row deleted in sheet  | the item disappears on next sync                                          |
| Row added or edited   | the item appears / updates on next sync                                   |
| Done on a daily row   | its Done checkbox is ticked (row kept)                                    |

A **daily row** is one whose Done cell is a checkbox: the site's "every day" flag puts it there
(and removes it when the flag is cleared). Done ticks it; the site brings the item back the next
morning and unticks the row, so no nightly trigger is needed in the sheet. Each day's Done pays
+1 XP again. The script lives in the sheet's bound project as `HabitsSync.gs`.

The site syncs on load, every five minutes, and right after each change; changes made while
offline wait in a queue. Rows whose Source is not Read, Watch, Side Hustle or Personal are
ignored. The sheet's Done column is not used.
