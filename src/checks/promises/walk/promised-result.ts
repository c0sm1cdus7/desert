// A rejection is proved where it closes the choice, never merely by finding its words after an execution.
import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { asking } from "../../../surface/bridge/questions/asking.ts";
import { readThrough, reasonIn, unchangedIn, errorIn } from "../../read-screen.ts";
import type { Stopped } from "../answers/promised-answer.ts";
import { begin } from "../../../surface/session/screen.ts";
import { surfaceTexts } from "../../../texts/surface.texts.ts";
import { promiseTexts as said } from "../../../texts/promises.texts.ts";
import { toolTexts } from "../../../texts/tools.texts.ts";
import { outsideCause } from "../../../tools/outside.ts";
import type { Case } from "../../../tools/promises.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import { actionUnavailable } from "../off/case-availability.ts";
import { currentCloses } from "../answers/current.ts";
import { quietEntry } from "../answers/promised-entry.ts";
import { view, type Seat } from "../promised-keys.ts";
import type { Aim } from "../promised-stage.ts";
export function currentInState<X extends Program>(seat: Seat<X>, aim: Aim<X>, kase: Case<X>): void {
  const on = kase.on ?? aim.tool.id;
  const current = aim.act.today?.(seat.state(), on, seat.now());
  const tool = seat.tools.find(tool => tool.id === aim.tool.id);
  const act = aim.act.on === "tool" ? tool?.acts[aim.name] : tool?.actsOn?.[aim.name];
  if (current === undefined || act?.off?.(on) !== undefined) return;
  const initial = begin(seat.tools, aim.tool.id, aim.name, aim.act.on === "thing" ? on : undefined);
  deepStrictEqual(initial.was, asking(aim.act.input, seat.words).answers(current), said.currentLost);
  currentCloses(seat.tools, initial);
}
export function assertOutcome<X extends Program>(seat: Seat<X>, aim: Aim<X>, kase: Case<X>, stop?: Stopped): boolean {
  ok(seat.defects.length === 0, seat.defects.join("\n"));
  const cause = "refused" in kase.then ? kase.then.refused : undefined;
  const external = cause !== undefined && outsideCause(aim.act.outside, cause) !== undefined;
  const on = kase.on ?? aim.tool.id;
  const calls = seat.requests.filter(request => request.act === aim.name && request.target === on);
  const { body } = seat.router.screen(view);
  ok(!unchangedIn(body));
  if (cause !== undefined && !external) {
    strictEqual(calls.length, 0, said.internalSent);
    quietEntry(seat.router);
    const closed = actionUnavailable(seat, aim, on, [], kase.from);
    const expected = closed ?? (cause === toolTexts.unchanged ? surfaceTexts.current : cause);
    const currentText =
      cause === toolTexts.unchanged && !seat.router.screen(view).hints.some(h => h.intent === "confirm");
    if (stop?.kind === "data") {
      ok(body.kind === "thread", said.closedAt("datum", stop.ask));
      const reasons = body.events.filter(event => event.nested && !event.ignored);
      deepStrictEqual(
        reasons.map(event => event.text.map(span => span.text).join("")),
        stop.reason === undefined ? [] : [stop.reason],
      );
      ok(!seat.router.screen(view).hints.some(hint => hint.intent === "confirm"));
      return false;
    }
    ok(
      currentText || readThrough(seat.router, screen => reasonIn(screen.body, expected)),
      said.closedCause(stop?.ask ?? aim.act.name, cause),
    );
    return false;
  }
  strictEqual(calls.length, 1, said.runOnce);
  if (external) ok(errorIn(body, cause), said.outsideSilent);
  else quietEntry(seat.router);
  return true;
}
