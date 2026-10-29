# Google Sheets sync

The site keeps the list in the browser. With this script deployed, the "ToDo List" sheet becomes
the source of truth: rows removed or added in the sheet disappear or appear on the site, and
Done / Remove on the site delete the row in the sheet (an item added on the site is appended).

The script runs as you, inside your Google account; the site only knows its URL and a secret
word, both saved in your browser (never in this repository).

## One-time deploy (about five minutes)

1. Open the sheet → **Extensions → Apps Script**. Delete the sample code and paste the contents
   of [`Code.gs`](Code.gs). Save.
2. **Project Settings** (gear) → **Script properties** → **Add script property**:
   name `HABITS_TOKEN`, value: any long secret word you make up. Save.
3. **Deploy → New deployment** → type **Web app**: description "Habits", execute as **Me**,
   who has access **Anyone**. Deploy, authorize when asked, copy the **Web app URL**
   (it ends with `/exec`).
4. On the site, press **Sync** in the header, paste the URL and the secret word, **Save**, then
   **Sync now**. The first sync fills a hidden `Id` column (F) in the sheet.

To update the script later: paste the new `Code.gs`, then **Deploy → Manage deployments →
edit → version: New version → Deploy** (the URL stays the same).

## What syncs

| On the site           | In the sheet                                  |
| --------------------- | --------------------------------------------- |
| Done or Remove        | the row is deleted                            |
| Undo before next sync | the row is written back                       |
| Add item              | a row is appended (Date, Task, Notes, Source) |
| Row deleted in sheet  | the item disappears on next sync              |
| Row added or edited   | the item appears / updates on next sync       |

The site syncs on load, every five minutes, and right after each change; changes made while
offline wait in a queue. Rows whose Source is not Read, Watch, Side Hustle or Personal are
ignored. The sheet's Done column is not used.
