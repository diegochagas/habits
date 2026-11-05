import test from "node:test";
import assert from "node:assert/strict";
import { addDays, nextQueueDate, removeAndCloseGap } from "../js/date-sequence.js";

const queued = (id, date) => ({ id, date, daily: false });
const habit = (id, date) => ({ id, date, daily: true });

test("addDays crosses month and year ends and goes backwards", () => {
  assert.equal(addDays("2026-11-25", 14), "2026-12-09");
  assert.equal(addDays("2026-12-25", 14), "2027-01-08");
  assert.equal(addDays("2026-03-05", -14), "2026-02-19");
  assert.throws(() => addDays("5/11/2026", 1), /expected yyyy-mm-dd/);
});

test("nextQueueDate: 14 days after the latest queued item, ignoring Today habits", () => {
  const items = [queued("a", "2026-11-05"), queued("b", "2026-11-19"), habit("h", "2027-05-01")];
  assert.equal(nextQueueDate(items, "2026-11-01"), "2026-12-03");
});

test("nextQueueDate: today when nothing is queued", () => {
  assert.equal(nextQueueDate([], "2026-11-05"), "2026-11-05");
  assert.equal(nextQueueDate([habit("h", "2026-11-05"), queued("x", "")], "2026-11-05"), "2026-11-05");
});

test("removing a queued item pulls the later ones 14 days closer", () => {
  const items = [
    queued("a", "2026-11-05"),
    queued("b", "2026-11-19"),
    queued("c", "2026-12-03"),
    habit("h", "2026-11-30"),
  ];
  const rest = removeAndCloseGap(items, "b");
  assert.deepEqual(
    rest.map((item) => [item.id, item.date]),
    [
      ["a", "2026-11-05"],
      ["c", "2026-11-19"],
      ["h", "2026-11-30"],
    ],
  );
});

test("removing a Today habit or an unknown id moves no dates", () => {
  const items = [queued("a", "2026-11-05"), habit("h", "2026-11-05"), queued("c", "2026-12-03")];
  assert.deepEqual(
    removeAndCloseGap(items, "h").map((item) => item.date),
    ["2026-11-05", "2026-12-03"],
  );
  assert.equal(removeAndCloseGap(items, "zzz").length, 3);
});
