// Code.gs: the bridge between the Habits site and the "ToDo List" Google Sheet. Deployed as a
// web app bound to the sheet (see README.md next to this file). Every call is a POST with a JSON
// body { token, ops } and answers { rows } (the whole list after applying the ops) or { error }.
//
// Rows get a stable id in a hidden column (F) the first time they are listed, so deleting or
// moving rows in the sheet never confuses the site. Done on the site = the row is deleted here,
// except "daily" rows: a row whose Done cell (E) is a checkbox is ticked instead; the site
// unticks it again the next morning (an upsert), so no nightly trigger is needed in the sheet.

var SHEET_NAME = "ToDo List";
var HEADER_ROW = 6; // Date | Task | Notes | Source | Done
var DONE_COLUMN = 5; // E, a checkbox on daily rows
var ID_COLUMN = 6; // F, hidden, filled by this script
var TOKEN_PROPERTY = "HABITS_TOKEN"; // Project settings → Script properties

function doPost(e) {
  var body = parseBody_(e);
  var expected = PropertiesService.getScriptProperties().getProperty(TOKEN_PROPERTY);
  if (!expected || body.token !== expected) return respond_({ error: "bad token" });
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    applyOps_(body.ops || []);
    return respond_({ rows: listRows_() });
  } catch (err) {
    return respond_({ error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return respond_({ error: "POST a JSON body { token, ops }" });
}

function parseBody_(e) {
  try {
    return JSON.parse((e && e.postData && e.postData.contents) || "{}");
  } catch (err) {
    return {};
  }
}

function respond_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function sheet_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('sheet "' + SHEET_NAME + '" not found');
  return sheet;
}

/** Every task row as { id, date (dd/mm/yyyy), task, notes, source, url, daily, done }, assigning missing ids. */
function listRows_() {
  var sheet = sheet_();
  var last = sheet.getLastRow();
  if (last <= HEADER_ROW) return [];
  var range = sheet.getRange(HEADER_ROW + 1, 1, last - HEADER_ROW, ID_COLUMN);
  var values = range.getDisplayValues();
  var doneCells = range.getValues().map(function (row) {
    return row[DONE_COLUMN - 1];
  });
  var ids = assignIds_(sheet, values);
  var urls = linkUrls_(sheet, values.length);
  return values
    .map(function (row, i) {
      var daily = typeof doneCells[i] === "boolean";
      return {
        id: ids[i],
        date: row[0],
        task: row[1],
        notes: row[2],
        source: row[3],
        url: urls[i],
        daily: daily,
        done: daily && doneCells[i],
      };
    })
    .filter(function (row) {
      return row.task;
    });
}

/** The hyperlink of every row: the one on its Task cell (B), else the one on its Notes cell (C), else "". */
function linkUrls_(sheet, count) {
  var cells = sheet.getRange(HEADER_ROW + 1, 2, count, 2).getRichTextValues();
  return cells.map(function (pair) {
    return (pair[0] && pair[0].getLinkUrl()) || (pair[1] && pair[1].getLinkUrl()) || "";
  });
}

/** The id of every row (column F), writing a fresh one on rows that have a task but no id yet. */
function assignIds_(sheet, values) {
  var ids = values.map(function (row) {
    return [row[ID_COLUMN - 1]];
  });
  var changed = false;
  values.forEach(function (row, i) {
    if (row[1] && !ids[i][0]) {
      ids[i][0] = newId_();
      changed = true;
    }
  });
  if (changed) {
    sheet.getRange(HEADER_ROW + 1, ID_COLUMN, ids.length, 1).setValues(ids);
    sheet.hideColumns(ID_COLUMN);
  }
  return ids.map(function (pair) {
    return pair[0];
  });
}

function newId_() {
  return "row-" + Utilities.getUuid().replace(/-/g, "").slice(0, 10);
}

/** ops: [{ op: "delete", id }, { op: "upsert", id, date (yyyy-mm-dd), name, description, category, daily, url }] */
function applyOps_(ops) {
  ops.forEach(function (op) {
    if (op.op === "delete") deleteRow_(op.id);
    else if (op.op === "upsert") upsertRow_(op);
    else throw new Error('op "' + op.op + '": expected delete or upsert');
  });
}

function rowNumberOf_(sheet, id) {
  var last = sheet.getLastRow();
  if (!id || last <= HEADER_ROW) return 0;
  var ids = sheet.getRange(HEADER_ROW + 1, ID_COLUMN, last - HEADER_ROW, 1).getValues();
  for (var i = 0; i < ids.length; i += 1) if (ids[i][0] === id) return HEADER_ROW + 1 + i;
  return 0;
}

/** Done on the site: a daily row is ticked, any other row is deleted. */
function deleteRow_(id) {
  var sheet = sheet_();
  var row = rowNumberOf_(sheet, id);
  if (!row) return;
  if (isDailyRow_(sheet, row)) sheet.getRange(row, DONE_COLUMN).setValue(true);
  else sheet.deleteRow(row);
}

function isDailyRow_(sheet, row) {
  return typeof sheet.getRange(row, DONE_COLUMN).getValue() === "boolean";
}

/** Undo, Add or an edit on the site: writes Date | Task | Notes | Source and the daily checkbox. */
function upsertRow_(op) {
  var sheet = sheet_();
  var row = rowNumberOf_(sheet, op.id);
  var values = [[sheetDate_(op.date), op.name || "", op.description || "", op.category || ""]];
  if (!row) {
    row = sheet.getLastRow() + 1;
    sheet.getRange(row, ID_COLUMN).setValue(op.id || newId_());
  }
  sheet.getRange(row, 1, 1, 4).setValues(values);
  sheet.getRange(row, 1).setNumberFormat("dd/mm/yyyy");
  setLink_(sheet, row, op.name || "", op.url || "");
  setDaily_(sheet, row, op.daily === true);
}

/** The url becomes the hyperlink of the Task cell (setValues above already cleared any old link). */
function setLink_(sheet, row, name, url) {
  if (!url) return;
  var link = SpreadsheetApp.newRichTextValue().setText(name).setLinkUrl(url).build();
  sheet.getRange(row, 2).setRichTextValue(link);
}

/** A daily row has a checkbox in Done (unticked after an upsert); any other row has nothing there. */
function setDaily_(sheet, row, daily) {
  var cell = sheet.getRange(row, DONE_COLUMN);
  if (daily && !isDailyRow_(sheet, row)) cell.insertCheckboxes();
  if (daily) cell.setValue(false);
  if (!daily && isDailyRow_(sheet, row)) {
    cell.removeCheckboxes();
    cell.clearContent();
  }
}

/** "yyyy-mm-dd" → a Date in the spreadsheet's time zone; anything else is written as text. */
function sheetDate_(iso) {
  var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!match) return iso || "";
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}
