// One written edit keeps the first rejected character beside any reason that the value already had.
import { entryAdvice } from "../../texts/entry/entry-advice.ts";
import { fieldTexts } from "../../texts/fields/field-texts.ts";
import type { Field, Intent } from "../contract.ts";
import type { Asking } from "../walk-state.ts";
import { edited } from "../talk.ts";
/** Editing clears a prior result; merely moving the caret or discarding a key keeps it. */
function rewritten({ error: _was, ignored: _key, failed: _result, notices: _notices, ...written }: Asking): Asking {
  return { ...written, suggested: false };
}
function plainReason(walk: Asking, field: Field, char: string): string | undefined {
  if ("max" in field && Array.from(walk.typed).length >= (field.max ?? Infinity))
    return fieldTexts.ignored.characters(field.max ?? 0);
  if (char !== " " || ("verbatim" in field && field.verbatim)) return undefined;
  const chars = Array.from(walk.typed);
  return walk.caret === 0 || chars[walk.caret - 1] === " " || chars[walk.caret] === " "
    ? entryAdvice.redundantSpace
    : undefined;
}
/** Secret material goes in whole at the caret, spaces and line breaks included: it is never trimmed, cut or
 * advised on by its characters. A full field takes no more keys. */
function secretAnswer(walk: Asking, field: Field, text: string): Asking | undefined {
  const chars = Array.from(walk.typed);
  if (text === "" || ("max" in field && chars.length >= (field.max ?? Infinity))) return undefined;
  const typed = chars.toSpliced(walk.caret, 0, text).join("");
  return { ...rewritten(walk), typed, caret: walk.caret + Array.from(text).length };
}
export function writtenAnswer(walk: Asking, field: Field, key: Intent): Asking | undefined {
  if (key.kind !== "type") {
    /** An arrow chooses to edit the suggested answer, even when the caret is already at the edge. */
    if (key.kind === "left" || key.kind === "right")
      return { ...("mask" in field ? walk : (edited(walk, key) ?? walk)), suggested: false };
    if ("mask" in field && key.kind !== "erase") return undefined;
    const changed =
      "mask" in field ? { ...walk, typed: Array.from(walk.typed).slice(0, -1).join("") } : edited(walk, key);
    return changed && key.kind === "erase" && changed.typed !== walk.typed ? rewritten(changed) : changed;
  }
  if (field.kind === "secret") return secretAnswer(walk, field, key.text);
  let changed = walk;
  let reason: string | undefined;
  for (const char of Array.from(key.text)) {
    const rejected = "mask" in field ? field.mask.rejected?.(changed.typed, char) : plainReason(changed, field, char);
    reason ??= rejected;
    if (rejected !== undefined) continue;
    if ("mask" in field) {
      const typed = field.mask.put(changed.typed, char);
      if (typed !== changed.typed) changed = { ...rewritten(changed), typed, caret: Array.from(typed).length };
    } else changed = edited(rewritten(changed), { kind: "type", text: char }) ?? changed;
  }
  if (reason === undefined) return changed;
  const notices = [
    ...(changed.notices ?? []),
    ...(changed.ignored ? [{ reason: changed.ignored, ignored: true as const }] : []),
  ];
  return { ...changed, notices, ignored: reason };
}
