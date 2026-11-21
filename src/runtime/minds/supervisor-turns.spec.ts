// The supervisor thinks in turns of its own, woken only by facts: a journey that closes or is cut, or somebody who
// speaks to it; it reads the whole house, says things through the talk program and acts on no program.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { effect, type HouseEmission } from "../../house/facts.ts";
import { explicitKit } from "../../house/kit-selection.ts";
import type { Event } from "../../journal/vocabulary.ts";
import { history, say, send, type RequestHouse } from "../../../tests/support/request-mind-fixture.ts";
import {
  add,
  end,
  framesOf,
  moments,
  notes,
  opus,
  supervisedFixture,
  supervising,
  supervisor,
  think,
  withSend,
} from "../../../tests/support/supervisor-responder.ts";
import type { ProgramMindResources } from "./program-mind-options.ts";
import { supervisorWakes } from "./supervisor-wakes.ts";
import type { WakePolicy } from "./mind-wake-policy.ts";
const fixtures: ReturnType<typeof supervisedFixture>[] = [];
function fixture(resources?: Partial<ProgramMindResources>) {
  const f = supervisedFixture(resources);
  fixtures.push(f);
  return f;
}
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
const said = (house: RequestHouse) =>
  history(house).flatMap(event =>
    event.layer === "program" && event.kind === "talk/said" ? [[event.by, JSON.stringify(event.data)]] : [],
  );
type Stop = NonNullable<HouseEmission<"mind-turn-closed">["data"]["reason"]>;
const position = (seq: number) => ({ id: `e${seq}`, seq, at: 0 });
const closedTurn = (reason: Stop | undefined, by = "mind:notes", seq = 5): Event => ({
  ...effect(
    "mind-turn-closed",
    { turn: "t", outcome: "failed", calls: 1, applied: [], ...(reason ? { reason } : {}) },
    by,
    [],
    "journey:j",
  ),
  ...position(seq),
});
const line = (by: string, text: string): Event => ({
  layer: "program",
  kind: "talk/said",
  data: { to: "mind:supervisor", text },
  by,
  cause: [],
  ...position(5),
});
it("wakes only for a journey that closes or is cut, or a line addressed to it, after its frontier", () => {
  const message = (event: Event) => {
    const text: unknown = event.layer === "program" ? Reflect.get(Object(event.data), "text") : undefined;
    return typeof text === "string" ? { by: event.by, to: ["mind:supervisor"], text } : undefined;
  };
  const policy: WakePolicy = {
    scope: { kind: "consciousness", actor: "mind:supervisor" },
    name: "supervisor",
    message,
    toolOf: () => undefined,
  };
  const wakes = (event: Event) => supervisorWakes(policy, 2, event, []);
  const closing = effect("journey-closed", { outcome: "done", summary: "Listo", references: [] }, "mind:notes");
  expect(wakes({ ...closing, process: "journey:j", ...position(5) })).toBe(true);
  expect(wakes(closedTurn("call-limit"))).toBe(true);
  expect(wakes(closedTurn("interrupted"))).toBe(false);
  expect(wakes(closedTurn(undefined))).toBe(false);
  expect(wakes(closedTurn("call-limit", "mind:supervisor"))).toBe(false);
  expect(wakes(closedTurn("call-limit", "mind:notes", 2))).toBe(false);
  expect(wakes(line("ana", "¿Cómo va?"))).toBe(true);
  expect(wakes(line("mind:notes", "Listo"))).toBe(false);
  expect(wakes(line("mind:notes", "supervisor, mirá esto"))).toBe(true);
  const waiting = effect("journey-waiting", { what: "Algo", until: 9 }, "mind:notes", [], "journey:j");
  expect(wakes({ ...waiting, ...position(5) })).toBe(false);
});
it("a new supervisor learns from now on: nothing that closed before it wakes it on deploy", async () => {
  const f = fixture({});
  const first = await f.open();
  withSend(first);
  f.respond(frame => notes(first, frame, (goal, _, id) => [add(goal), end(id)]));
  await think(first, "Mate el jueves");
  first.close();
  f.reopenWith({ supervisorCard: opus, capNanoUsd: 10e9 });
  const house = await f.open();
  const judge = supervisor(() => ({ outcome: "passed", text: "Sí" }));
  f.respond(frame => (supervising(frame) ? judge(frame) : notes(house, frame, (goal, _, id) => [add(goal), end(id)])));
  await (await house.minds)?.flush();
  expect(moments(framesOf(f))).toEqual([]);
  await think(house, "Facturas el viernes");
  expect(moments(framesOf(f))).toEqual(["turn"]);
  expect(framesOf(f).find(supervising)).toContain("«Facturas el viernes»");
  expect(framesOf(f).find(supervising)).not.toContain("terminó el journey «Mate el jueves»");
}, 60000);
/** A journey of the notes mind opens and closes at once, as its own turn would leave it. */
function closed(house: RequestHouse, goal: string) {
  const process = `journey:${goal}`;
  house.bus.emit(effect("journey-opened", { version: 2, goal, kit: explicitKit([]) }, "mind:notes", [], process));
  house.bus.emit(
    effect("journey-closed", { outcome: "done", summary: "Hecho", references: [] }, "mind:notes", [], process),
  );
}
const quiet = { scene: "Ready", consulta: null, acts: [] };
it("never wakes for a closing in a run that had no supervisor, once its card is back", async () => {
  const f = fixture();
  const judge = supervisor(() => ({ outcome: "passed", text: "Sí" }));
  f.respond(frame => (supervising(frame) ? judge(frame) : quiet));
  const first = await f.open();
  closed(first, "Uno");
  await (await first.minds)?.flush();
  first.close();
  expect(moments(framesOf(f))).toEqual(["turn"]);
  f.reopenWith({ capNanoUsd: 10e9 });
  const alone = await f.open();
  closed(alone, "Dos");
  await (await alone.minds)?.flush();
  alone.close();
  f.reopenWith({ supervisorCard: opus, capNanoUsd: 10e9 });
  const back = await f.open();
  await (await back.minds)?.flush();
  expect(moments(framesOf(f))).toEqual(["turn"]);
  expect(framesOf(f).filter(supervising).join("\n")).not.toContain("«Dos»");
  expect(
    history(back)
      .filter(event => event.kind === "boot")
      .map(event => event.data),
  ).toEqual([{ supervised: true }, {}, { supervised: true }]);
}, 60000);
it("wakes for a closing a restart left pending while it had its card on both sides", async () => {
  const f = fixture();
  const judge = supervisor(() => ({ outcome: "passed", text: "Sí" }));
  f.respond(frame => (supervising(frame) ? judge(frame) : quiet));
  const first = await f.open();
  closed(first, "Uno");
  first.close();
  expect(moments(framesOf(f))).toEqual([]);
  (await f.open()).close();
  expect(moments(framesOf(f))).toEqual(["turn"]);
  expect(framesOf(f).find(supervising)).toContain("terminó el journey «Uno»");
}, 60000);
it("reads every mind with its journeys and speaks through the talk program, and acts on no program", async () => {
  const f = fixture();
  const house = await f.open();
  withSend(house);
  const judge = supervisor(
    () => ({ outcome: "passed", text: "Sí" }),
    (_, turn) =>
      turn === 1
        ? [say("ana", "El journey de notas terminó bien"), add("Del supervisor")]
        : [say("ana", "El journey de notas terminó bien")],
  );
  f.respond(frame => (supervising(frame) ? judge(frame) : notes(house, frame, (goal, _, id) => [add(goal), end(id)])));
  await think(house, "Mate el jueves");
  const frame = framesOf(f).find(supervising) ?? "";
  expect(frame).toContain("mind:notes terminó el journey «Mate el jueves»: Hecho");
  expect(frame).toMatch(/mind:notes: \{"scene":/u);
  expect(frame).toMatch(/assistant:ana: \{"scene":/u);
  const context = frame.split("Contexto:\n")[1]?.split("\n")[0] ?? "";
  expect([...context.matchAll(/"act":"([^"]+)"/gu)].map(match => match[1]).sort()).toEqual(["scene", "thread/say"]);
  // Its first answer named an act on a program, outside its schema: it was corrected, and the note was never made.
  const turn = [...house.tools.state().house.minds.turns.values()].find(each => each.opened.by === "mind:supervisor");
  expect(turn?.invalid.map(event => event.data.faults)).toEqual([[{ code: "schema", path: "/" }]]);
  expect(house.tools.state().tools.notes.notes).toEqual(["Mate el jueves"]);
  expect(said(house)).toContainEqual([
    "mind:supervisor",
    JSON.stringify({ to: "ana", text: "El journey de notas terminó bien" }),
  ]);
  const direct = house.tools.act(add("Del supervisor"), house.tools.state().through, "mind:supervisor");
  expect(direct.status).toBe("rejected");
  const bodies = f.transport.mock.calls.map(call => (typeof call[1]?.body === "string" ? call[1].body : ""));
  const own = bodies.find(body => body.includes("Alcance:\\nmind:supervisor")) ?? "";
  // The whole request of its own turn, layers and schema included, is about 7 KB for this house; it is bounded by
  // the input limit, trimming what it read in threads first and then minds, each one named under «Omitido».
  expect(own.length).toBeGreaterThan(frame.length);
  expect(own.length).toBeLessThan(50000);
}, 60000);
it("wakes when ana speaks to it, and says who spoke and what", async () => {
  const f = fixture();
  const house = await f.open();
  const judge = supervisor(
    () => ({ outcome: "passed", text: "Sí" }),
    () => [say("ana", "Todo en orden")],
  );
  f.respond(frame => (supervising(frame) ? judge(frame) : { scene: "Ready", consulta: null, acts: [] }));
  expect(send(house, "mind:supervisor", "¿Cómo va la casa?").status).toBe("accepted");
  await (await house.minds)?.flush();
  expect(moments(framesOf(f))).toEqual(["turn"]);
  expect(framesOf(f).find(supervising)).toContain("ana te habló: ¿Cómo va la casa?");
  expect(said(house).at(-1)).toEqual(["mind:supervisor", JSON.stringify({ to: "ana", text: "Todo en orden" })]);
}, 60000);
it("a restart that cuts its own turn does not lose what woke it: it wakes again for the same line", async () => {
  const f = fixture();
  const house = await f.open();
  let cut = true;
  const judge = supervisor(() => ({ outcome: "passed", text: "Sí" }));
  // Its first call never answers: the house goes down in the middle of its own turn.
  f.respond(frame => {
    if (!supervising(frame)) return quiet;
    return cut ? new Promise(() => {}) : judge(frame);
  });
  expect(send(house, "mind:supervisor", "¿Cómo va la casa?").status).toBe("accepted");
  await vi.waitFor(() => expect(moments(framesOf(f))).toEqual(["turn"]));
  house.close();
  cut = false;
  const again = await f.open();
  await (await again.minds)?.flush();
  expect(moments(framesOf(f))).toEqual(["turn", "turn"]);
  expect(framesOf(f).filter(supervising)[1]).toContain("ana te habló: ¿Cómo va la casa?");
  const closings = history(again).flatMap(event =>
    event.layer === "house" && event.kind === "mind-turn-closed" && event.by === "mind:supervisor" && !event.process
      ? [event.data]
      : [],
  );
  expect(closings.map(data => [data.outcome, data.reason])).toEqual([
    ["interrupted", "interrupted"],
    ["done", undefined],
  ]);
}, 60000);
