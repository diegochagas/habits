// csv-text.js: RFC 4180 CSV read and written by hand, since the server's only third-party
// library is pg. A field with a comma, a quote or a line break is quoted and a quote inside it
// doubled; both LF and CRLF line ends are read; a leading BOM (spreadsheets add one) is dropped.

/** @typedef {{ rows: string[][], row: string[], field: string, quoted: boolean }} CsvReader */

/**
 * @param {string} text
 * @returns {string[][]} the rows, each a list of fields; a final line break does not add a row
 * @example parseCsv('a,b\n"x, y","say ""hi"""\n') // [["a", "b"], ["x, y", 'say "hi"']]
 */
export function parseCsv(text) {
  /** @type {CsvReader} */
  const reader = { rows: [], row: [], field: "", quoted: false };
  const source = text.startsWith("﻿") ? text.slice(1) : text;
  for (let index = 0; index < source.length; index += 1) index += readCsvChar(reader, source, index);
  if (reader.field !== "" || reader.row.length > 0) endCsvRow(reader);
  return reader.rows;
}

/**
 * @param {CsvReader} reader
 * @param {string} source
 * @param {number} index
 * @returns {number} extra characters consumed (1 after a doubled quote)
 */
function readCsvChar(reader, source, index) {
  const char = source[index];
  if (reader.quoted) return readQuotedChar(reader, source, index);
  if (char === '"') reader.quoted = true;
  else if (char === ",") endCsvField(reader);
  else if (char === "\n") endCsvRow(reader);
  else if (char !== "\r") reader.field += char;
  return 0;
}

/**
 * @param {CsvReader} reader
 * @param {string} source
 * @param {number} index
 * @returns {number} extra characters consumed
 */
function readQuotedChar(reader, source, index) {
  const char = source[index];
  if (char !== '"') {
    reader.field += char;
    return 0;
  }
  if (source[index + 1] === '"') {
    reader.field += '"';
    return 1;
  }
  reader.quoted = false;
  return 0;
}

/** @param {CsvReader} reader */
function endCsvField(reader) {
  reader.row.push(reader.field);
  reader.field = "";
}

/** @param {CsvReader} reader */
function endCsvRow(reader) {
  endCsvField(reader);
  reader.rows.push(reader.row);
  reader.row = [];
}

/**
 * @param {string[][]} rows
 * @returns {string} LF line ends, a final line break, fields quoted only when they need it
 * @example formatCsv([["a", "b"], ["x, y", 'say "hi"']]) // 'a,b\n"x, y","say ""hi"""\n'
 */
export function formatCsv(rows) {
  return rows.map((row) => row.map(quoteCsvField).join(",")).join("\n") + "\n";
}

/**
 * @param {string} value
 * @returns {string}
 */
function quoteCsvField(value) {
  if (!/[",\r\n]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}
