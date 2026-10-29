// Code.gs: the bridge between the Habits site and the "ToDo List" Google Sheet. Deployed as a
// web app bound to the sheet (see README.md next to this file). Every call is a POST with a JSON
// body { token, ops } and answers { rows } (the whole list after applying the ops) or { error }.
//
// Rows get a stable id in a hidden column (F) the first time they are listed, so deleting or
// moving rows in the sheet never confuses the site. Done on the site = the row is deleted here.

var SHEET_NAME = "ToDo List";
var HEADER_ROW = 6; // Date | Task | Notes | Source | Done
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

/** Every task row as { id, date (dd/mm/yyyy), task, notes, source }, assigning missing ids. */
function listRows_() {
  var sheet = sheet_();
  var last = sheet.getLastRow();
  if (last <= HEADER_ROW) return [];
  var range = sheet.getRange(HEADER_ROW + 1, 1, last - HEADER_ROW, ID_COLUMN);
  var values = range.getDisplayValues();
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
  return values
    .map(function (row, i) {
      return { id: ids[i][0], date: row[0], task: row[1], notes: row[2], source: row[3] };
    })
    .filter(function (row) {
      return row.task;
    });
}

function newId_() {
  return "row-" + Utilities.getUuid().replace(/-/g, "").slice(0, 10);
}

/** ops: [{ op: "delete", id }, { op: "upsert", id, date (yyyy-mm-dd), name, description, category }] */
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

function deleteRow_(id) {
  var sheet = sheet_();
  var row = rowNumberOf_(sheet, id);
  if (row) sheet.deleteRow(row);
}

function upsertRow_(op) {
  var sheet = sheet_();
  var row = rowNumberOf_(sheet, op.id);
  var values = [[sheetDate_(op.date), op.name || "", op.description || "", op.category || "", ""]];
  if (!row) {
    row = sheet.getLastRow() + 1;
    sheet.getRange(row, ID_COLUMN).setValue(op.id || newId_());
  }
  sheet.getRange(row, 1, 1, 5).setValues(values);
  sheet.getRange(row, 1).setNumberFormat("dd/mm/yyyy");
}

/** "yyyy-mm-dd" → a Date in the spreadsheet's time zone; anything else is written as text. */
function sheetDate_(iso) {
  var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!match) return iso || "";
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}
