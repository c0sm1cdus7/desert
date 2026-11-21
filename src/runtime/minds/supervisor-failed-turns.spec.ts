// The supervisor wakes for a consciousness turn that failed and reads which mind failed and why, in words.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { effect, type HouseEmission } from "../../house/facts.ts";
import type { Event } from "../../journal/vocabulary.ts";
import { history } from "../../../tests/support/request-mind-fixture.ts";
import {
  framesOf,
  moments,
  supervisedFixture,
  supervising,
  supervisor,
  think,
} from "../../../tests/support/supervisor-responder.ts";
import type { WakePolicy } from "./mind-wake-policy.ts";
import { supervisorWakes } from "./supervisor-wakes.ts";
const fixtures: ReturnType<typeof supervisedFixture>[] = [];
beforeEach(() =>
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("network forbidden");
    }),
  ),
);
afterEach(() => {
  fixtures.splice(0).forEach(f => f.cleanup());
  vi.unstubAllGlobals();
});
type Closing = HouseEmission<"mind-turn-closed">["data"];
/** The closing of a consciousness turn: it carries no process. */
const closed = (data: Partial<Closing>, by = "mind:notes", seq = 5): Event => ({
  ...effect("mind-turn-closed", { turn: "t", outcome: "failed", calls: 1, applied: [], ...data }, by, []),
  id: `e${seq}`,
  seq,
  at: 0,
});
it("wakes for a consciousness turn that closed otherwise than done, for a reason that is no restart", () => {
  const policy: WakePolicy = {
    scope: { kind: "consciousness", actor: "mind:supervisor" },
    name: "supervisor",
    message: () => undefined,
    toolOf: () => undefined,
  };
  const wakes = (event: Event) => supervisorWakes(policy, 2, event);
  expect(wakes(closed({ reason: "invalid" }))).toBe(true);
  expect(wakes(closed({ reason: "internal" }, "assistant:ana"))).toBe(true);
  expect(wakes(closed({ outcome: "interrupted", reason: "uncertain" }))).toBe(true);
  expect(wakes(closed({ outcome: "interrupted", reason: "interrupted" }))).toBe(false);
  expect(wakes(closed({ outcome: "done" }))).toBe(false);
  expect(wakes(closed({ outcome: "done", reason: "invalid" }))).toBe(false);
  // A closure without a reason comes from before 21/11: nothing historical wakes it.
  expect(wakes(closed({}))).toBe(false);
  expect(wakes(closed({ outcome: "interrupted" }))).toBe(false);
  // Its own turns never wake it, and nothing at or before its frontier does.
  expect(wakes(closed({ reason: "invalid" }, "mind:supervisor"))).toBe(false);
  expect(wakes(closed({ reason: "invalid" }, "mind:notes", 2))).toBe(false);
});
it("reads which mind's turn failed and why when a consciousness never gives a valid answer", async () => {
  const f = supervisedFixture();
  fixtures.push(f);
  const house = await f.open();
  const judge = supervisor(() => ({ outcome: "passed", text: "Sí" }));
  f.respond(frame => (supervising(frame) ? judge(frame) : { nothing: "valid" }));
  await think(house, "Mate el jueves");
  const closings = history(house).flatMap(event =>
    event.layer === "house" && event.kind === "mind-turn-closed" ? [[event.by, event.data.outcome]] : [],
  );
  expect(closings).toEqual([
    ["mind:notes", "failed"],
    ["mind:supervisor", "done"],
  ]);
  expect(moments(framesOf(f))).toEqual(["turn"]);
  expect(framesOf(f).find(supervising)).toContain(
    "Falló un turno de la consciencia de mind:notes: " +
      "La respuesta siguió siendo inválida después de la única corrección.",
  );
}, 60000);
