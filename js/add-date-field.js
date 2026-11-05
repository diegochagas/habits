// add-date-field.js: the add form's Date input, pre-filled with the next free slot in the queue
// (see date-sequence.js). A date Diego typed himself is never overwritten.

import { nextQueueDate } from "./date-sequence.js";

/**
 * @param {HTMLFormElement} form the add form (has an input named "date")
 * @returns {{ refresh: (items: import("./items-store.js").HabitItem[], today: string) => void }}
 * @example createAddDateField(form).refresh(items, "2026-11-05")
 */
export function createAddDateField(form) {
  const input = /** @type {HTMLInputElement} */ (form.querySelector("input[name='date']"));
  let suggested = "";
  return {
    refresh(items, today) {
      const next = nextQueueDate(items, today);
      if (input.value === suggested || input.value === "") input.value = next;
      suggested = next;
    },
  };
}
