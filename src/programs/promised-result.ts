// A rejection is proved where it closes the choice, never merely by finding its words after an execution.
import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { asking } from "../surface/bridge/asking.ts";
import { formats } from "../surface/masks.ts";
import { begin } from "../surface/screen.ts";
import { genericTexts } from "../texts/generic-surface.texts.ts";
import { surfaceTexts } from "../texts/surface.texts.ts";
import { promiseTexts as said } from "../texts/promises.texts.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { outsideCause } from "../tools/outside.ts";
import type { Case } from "../tools/promises.ts";
import type { Program } from "../tools/tool-contract.ts";
import { firstUnavailable } from "./promised-availability.ts";
import { currentCloses } from "./promised-current.ts";
import { quietEntry } from "./promised-entry.ts";
import { view, type Seat } from "./promised-keys.ts";
import type { Aim } from "./promised-stage.ts";

export function currentInState<X extends Program>(seat: Seat<X>, aim: Aim<X>, kase: Case<X>): void {
  const on = kase.on ?? aim.tool.id;
  const current = aim.act.today?.(seat.state(), on);
  const tool = seat.tools.find(tool => tool.id === aim.tool.id);
  const act = aim.act.on === "tool" ? tool?.acts[aim.name] : tool?.actsOn?.[aim.name];
  if (current === undefined || act?.off?.(on) !== undefined) return;
  const initial = begin(seat.tools, aim.tool.id, aim.name, aim.act.on === "thing" ? on : undefined);
  const words = { formats: formats(seat.shown.locale), optionalMark: genericTexts.optional };
  deepStrictEqual(initial.was, asking(aim.act.input, words).answers(current));
  currentCloses(seat.tools, initial);
}
/** Read the actual screen: reasons belong to a disabled row or to the live question, never an unrelated datum. */
function blockedAt<X extends Program>(seat: Seat<X>, cause: string): boolean {
  const { body } = seat.router.screen(view);
  const matches = (text = "") => text === cause || text.startsWith(`${cause} · `) || text.endsWith(` · ${cause}`);
  if (body.kind === "list") return body.stacks.some(stack => stack.rows.some(row => row.off && matches(row.detail)));
  if (body.kind !== "thread") return false;
  return (
    (body.options?.some(row => row.off && matches(row.detail)) ?? false) ||
    body.events.some(event => event.nested && event.text.some(span => matches(span.text)))
  );
}
export function assertOutcome<X extends Program>(seat: Seat<X>, aim: Aim<X>, kase: Case<X>, absent = false): boolean {
  ok(seat.defects.length === 0, seat.defects.join("\n"));
  const cause = "refused" in kase.then ? kase.then.refused : undefined;
  const external = cause !== undefined && outsideCause(aim.act.outside, cause) !== undefined;
  const calls = seat.requests.filter(
    request => request.act === aim.name && request.target === (kase.on ?? aim.tool.id),
  );
  const screen = JSON.stringify(seat.router.screen(view).body);
  ok(!screen.includes(toolTexts.unchanged));
  if (cause !== undefined && !external) {
    strictEqual(calls.length, 0, said.internalSent);
    quietEntry(seat.router);
    const closed = firstUnavailable(seat, aim, kase.on ?? aim.tool.id);
    const expected = closed ?? (cause === toolTexts.unchanged ? surfaceTexts.current : cause);
    const currentText =
      cause === toolTexts.unchanged && !seat.router.screen(view).hints.some(h => h.intent === "confirm");
    ok(absent || currentText || blockedAt(seat, expected), said.refusalNotVisible(cause));
    return false;
  }
  strictEqual(calls.length, 1, said.runOnce);
  if (external) ok(screen.includes(surfaceTexts.error) && screen.includes(cause));
  else quietEntry(seat.router);
  return true;
}
