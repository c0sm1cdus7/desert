export type InputSnapshot = Readonly<{
  text: string; start: number; end: number; direction: "forward" | "backward" | "none";
}>;
type Edit = { before: InputSnapshot; after: InputSnapshot; kind: string; time: number };
const adjacent = (left: InputSnapshot, right: InputSnapshot) => left.text === right.text &&
  left.start === left.end && right.start === right.end && left.end === right.start;

export function inputSnapshot(input: HTMLInputElement): InputSnapshot {
  return { text: input.value, start: input.selectionStart ?? input.value.length,
    end: input.selectionEnd ?? input.value.length, direction: input.selectionDirection ?? "none" };
}

/** Formatting assigns input.value and clears native undo; keep a bounded local equivalent. */
export function inputEditHistory(limit = 100, coalesceMilliseconds = 1000) {
  const past: Edit[] = [], future: Edit[] = [];
  let group: Edit | undefined;
  return {
    reset() { past.length = 0; future.length = 0; group = undefined; },
    boundary() { group = undefined; },
    record(before: InputSnapshot, after: InputSnapshot, kind: string, time = Date.now()) {
      if (before.text === after.text) return;
      const coalescible = ["insertText", "deleteContentBackward", "deleteContentForward"].includes(kind);
      if (coalescible && group && group.kind === kind && time - group.time <= coalesceMilliseconds && adjacent(group.after, before)) {
        group.after = after; group.time = time;
      } else {
        const edit = { before, after, kind, time };
        past.push(edit); if (past.length > limit) past.shift();
        group = coalescible && before.start === before.end ? edit : undefined;
      }
      future.length = 0;
    },
    undo() {
      group = undefined;
      const edit = past.pop(); if (!edit) return;
      future.push(edit); return edit.before;
    },
    redo() {
      group = undefined;
      const edit = future.pop(); if (!edit) return;
      past.push(edit); return edit.after;
    },
  };
}

export function historyKey(event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey">) {
  if (event.altKey || !(event.ctrlKey || event.metaKey)) return;
  const key = event.key.toLowerCase();
  if (key === "z") return event.shiftKey ? "redo" : "undo";
  if (key === "y" && event.ctrlKey && !event.metaKey && !event.shiftKey) return "redo";
}
