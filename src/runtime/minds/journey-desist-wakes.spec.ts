// A consciousness does not wake for the closing it wrote itself by desisting; the journey's own closing still wakes it.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { effect, type HouseEmission } from "../../house/facts.ts";
import type { Event } from "../../journal/vocabulary.ts";
import { answer, history, openWork } from "../../../tests/support/request-mind-fixture.ts";
import { currentTurn } from "../../../tests/support/request-mind-responder.ts";
import {
  framesOf,
  moments,
  supervisedFixture,
  supervising,
  supervisor,
  think,
} from "../../../tests/support/supervisor-responder.ts";
import { mindWakeDecision, type WakePolicy } from "./mind-wake-policy.ts";
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
const actor = "mind:notes";
const policy = (scope: WakePolicy["scope"]): WakePolicy => ({
  scope,
  name: "Notas",
  message: () => undefined,
  toolOf: () => undefined,
  talks: false,
});
const consciousness = policy({ kind: "consciousness", actor });
const kit = { version: 2 as const, selections: [] };
const opened = effect("journey-opened", { version: 2, goal: "Anotar", kit }, actor, [], "j1");
const closing = (outcome: "done" | "desisted", cause: string[]) =>
  effect("journey-closed", { outcome, summary: "Ya no hace falta", references: [] }, actor, cause, "j1");
const at = (emissions: readonly HouseEmission[]): Event[] =>
  emissions.map((emission, index) => ({ ...emission, id: `e${index + 1}`, seq: index + 1, at: 0 }));
const wakes = (scope: WakePolicy, events: readonly Event[]) =>
  events.filter(event => mindWakeDecision(scope, event, events, 0)).map(event => event.kind);
it("a closing written in a turn of the consciousness does not wake it; one written by the journey does", () => {
  const own = effect("mind-turn-opened", { turn: "c1", wake: ["e0"] }, actor, []);
  const desisted = at([opened, own, closing("desisted", ["e2", "e1"])]);
  expect(wakes(consciousness, desisted)).toEqual([]);
  // The journey's turn carries its process: what it closes, ending or desisting, goes back to its consciousness.
  const turn = effect("mind-turn-opened", { turn: "t1", wake: ["e1"] }, actor, [], "j1");
  expect(wakes(consciousness, at([opened, turn, closing("done", ["e2", "e1"])]))).toEqual(["journey-closed"]);
  expect(wakes(consciousness, at([opened, turn, closing("desisted", ["e2", "e1"])]))).toEqual(["journey-closed"]);
  // A turn of another mind among the causes is not a turn of this consciousness.
  const other = effect("mind-turn-opened", { turn: "o1", wake: ["e0"] }, "mind:agenda", []);
  expect(wakes(consciousness, at([opened, other, closing("desisted", ["e2", "e1"])]))).toEqual(["journey-closed"]);
  // The supervisor wakes for every closing, the one a consciousness wrote among them.
  const watching: WakePolicy = { ...policy({ kind: "consciousness", actor: "mind:supervisor" }), name: "supervisor" };
  expect(desisted.filter(event => supervisorWakes(watching, 0, event, desisted)).map(event => event.kind)).toEqual([
    "journey-closed",
  ]);
});
it("desisting in its own turn costs the consciousness no further call, and the supervisor reads it", async () => {
  const f = supervisedFixture();
  fixtures.push(f);
  const house = await f.open();
  f.prepare(house);
  const judge = supervisor(() => ({ outcome: "passed", text: "Sí" }));
  f.respond(frame => {
    if (supervising(frame)) return judge(frame);
    const turn = currentTurn(house);
    const journey = [...house.tools.state().house.journeys.values()][0];
    const until = Date.now() + 3_600_000;
    if (turn.process) return answer([{ act: "wait", target: turn.process, input: { what: "Espero", until } }]);
    if (!journey) return answer([openWork("Anotar")]);
    if (journey.closed) return answer();
    return answer([{ act: "desist", target: journey.id, input: { reason: "Ya no hace falta", references: [] } }]);
  });
  await think(house, "Anotá el mate");
  await think(house, "Dejalo");
  const journey = [...house.tools.state().house.journeys.values()][0];
  expect(journey?.closed?.data).toMatchObject({ outcome: "desisted", summary: "Ya no hace falta" });
  const own = history(house).filter(
    event => event.layer === "house" && event.kind === "mind-turn-opened" && event.by === actor && !event.process,
  );
  expect(own).toHaveLength(2);
  expect(moments(framesOf(f))).toEqual(["turn"]);
  expect(framesOf(f).find(supervising)).toContain("mind:notes desisted from the journey «Anotar»: Ya no hace falta");
}, 60000);
