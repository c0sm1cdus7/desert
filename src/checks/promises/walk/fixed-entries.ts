// Construction is positive evidence from every reachable entry, never an inference from a failed walk.
import { stateResult } from "../../../journal/readonly-state.ts";
import { deepStrictEqual, ok } from "node:assert/strict";
import { findable } from "../../../surface/menus/finding.ts";
import { stacksOf } from "../../../surface/menus/lists.ts";
import type { Choice, Picture } from "../../../surface/session/screen.ts";
import type { Tool } from "../../../surface/contract/shown-tool.ts";
import { promiseTexts as said } from "../../../texts/promises.texts.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import type { Seat } from "../promised-keys.ts";
import type { Told } from "./promised-route.ts";
import { perform, wroteSince, type House } from "../promised-stage.ts";
/** Each row may fix a different coordinate: changing two parts at once needs no special exception. */
export const excludes = (row: Choice, answers: readonly string[]): boolean => {
  const fixed = row.with;
  return (
    fixed !== undefined &&
    answers.some(
      (answer, at) =>
        (at < fixed.from || (fixed.until !== undefined && at >= fixed.until)) &&
        fixed.answers[at] !== undefined &&
        fixed.answers[at] !== answer,
    )
  );
};
/** Start at the actual Menu and follow all view entries, including menus and links from other tools. */
export function entries(tools: readonly Tool[]): readonly Choice[] {
  const pending: Picture[] = [{ kind: "menu", at: 0 }];
  const seen = new Set<string>();
  const found: Choice[] = [];
  while (pending.length) {
    const place = pending.shift();
    if (!place) break;
    const key = JSON.stringify(place);
    if (seen.has(key)) continue;
    seen.add(key);
    if (place.find === undefined && findable(place, tools)) pending.push({ ...place, find: "" });
    const rows = stacksOf(place, tools).flatMap(stack => stack.rows);
    found.push(...rows.filter(row => row.starts !== undefined));
    for (const row of rows) if (!row.off && row.open?.kind === "view") pending.push(row.open);
  }
  return found;
}
export function constructed<X extends Program>(seat: Seat<X>, { aim, kase, answers }: Told<X>): void {
  ok("refused" in kase.then, said.acceptedMissing);
  const target = kase.on === aim.tool.id ? undefined : kase.on;
  const rows = entries(seat.tools).filter(
    row => row.starts?.tool === aim.tool.id && row.starts.act === aim.name && row.starts.target === target,
  );
  ok(rows.length, said.noEntry(aim.name));
  const open = rows.find(row => !excludes(row, answers));
  ok(!open, said.openEntry(open?.title ?? aim.name));
  ok(seat.defects.length === 0, seat.defects.join("\n"));
}
/** Even a caller without a screen must receive the declared refusal, without changing the program's facts. */
export async function directRefusal<X extends Program>(house: House<X>, { aim, kase }: Told<X>): Promise<void> {
  ok("refused" in kase.then);
  ok(aim.act.refuses.includes(kase.then.refused), said.refusalMismatch);
  const before = house.tools.state();
  const result = await perform(house, aim.tool.id, { ...kase, act: aim.name });
  ok(!result.defect, result.reason);
  deepStrictEqual([result.status, result.reason], ["rejected", kase.then.refused], said.refusalMismatch);
  deepStrictEqual(wroteSince(house, before.through), []);
  deepStrictEqual(stateResult(house.tools.state().tools), stateResult(before.tools));
}

/** Diagnose the entry that prevented a positive proof, retaining the original missing question. */
export function proveConstruction<X extends Program>(seat: Seat<X>, told: Told<X>, ask: string): "construction" {
  try {
    constructed(seat, told);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${said.notOffered(told.aim.name)}. ${said.missingPath(ask)}. ${detail}`);
  }
  return "construction";
}
