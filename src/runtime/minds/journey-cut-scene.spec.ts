// A mind's own scene lines stay whole next to its cut journeys: the cuts take only the room the scene leaves.
import { afterEach, expect, it } from "vitest";
import { effect } from "../../house/facts.ts";
import { sceneLimits } from "../../house/own-acts.ts";
import { programMindFixture } from "../../../tests/support/program-mind-fixture.ts";
import { journeyOf, openAct, script, waitAct } from "../../../tests/support/journey-turn-script.ts";
import { withCuts } from "./journey-cut-scene.ts";
const fixtures: ReturnType<typeof programMindFixture>[] = [];
afterEach(() => fixtures.splice(0).forEach(f => f.cleanup()));
/** A house whose notes mind opened one journey and had its first turn cut: the provider did not answer its call. */
async function cut() {
  const f = programMindFixture();
  fixtures.push(f);
  const house = await f.open();
  script(f, house, {
    consciousness: ({ call }) => (call === 1 ? [openAct] : []),
    journey: ({ call, journey }) => {
      if (call === 1) throw new Error("provider down");
      return [waitAct(journey ?? "")];
    },
  });
  f.wake(house);
  await (await house.minds)?.flush();
  return house;
}
type House = Awaited<ReturnType<typeof cut>>;
/** `count` more open journeys of the notes mind, each with its only turn cut at the call limit. */
function cutMore(house: House, count: number) {
  house.bus.together(() => {
    for (let index = 0; index < count; index++) {
      const process = `j${index}`;
      const goal = `Meta ${index} ${"g".repeat(280)}`;
      const kit = { version: 2, selections: [] } as const;
      house.bus.emit(effect("journey-opened", { version: 2, goal, kit }, "mind:notes", [], process));
      house.bus.emit(effect("mind-turn-opened", { turn: `t${index}`, wake: [] }, "mind:notes", [], process));
      const closed = { turn: `t${index}`, outcome: "failed", calls: 12, applied: [], reason: "call-limit" } as const;
      house.bus.emit(effect("mind-turn-closed", closed, "mind:notes", [], process));
    }
  });
}
/** A scene of the mind's own lines, `length` characters long. */
const ownScene = (length: number) => {
  const lines = Array.from({ length: 60 }, (_, index) => `Línea propia ${index} ${"x".repeat(80)}`);
  const text = lines.join("\n").slice(0, length);
  return text.endsWith("\n") ? `${text.slice(0, -1)}y` : text;
};
const one = "Journeys cortados que no entran en esta escena: 1.";
it("keeps every own line whole when the scene has no room for a cut, and counts the cut when it has some", async () => {
  const house = await cut();
  const state = () => house.tools.state().house;
  const full = ownScene(3976);
  expect(withCuts(state(), "mind:notes", "es", full)).toBe(full);
  const roomy = ownScene(3900);
  const counted = withCuts(state(), "mind:notes", "es", roomy);
  expect(counted).toBe(`${one}\n${roomy}`);
  // Writing that scene again counts the same cut once, never as a line of the mind's own.
  expect(withCuts(state(), "mind:notes", "es", counted)).toBe(counted);
  // With room for it, the cut is said whole, and it leaves once the journey goes on.
  const short = withCuts(state(), "mind:notes", "es", "Escena propia");
  expect(short).toMatch(/^Se cortó un turno del journey «Anotar»: .+ No se reintentó nada\.\nEscena propia$/u);
  const journey = journeyOf(house);
  if (!journey) throw new Error("journey");
  house.bus.emit(effect("journey-resumed", { note: "Probá otra vez" }, "mind:notes", [], journey.id));
  await (await house.minds)?.flush();
  expect(withCuts(state(), "mind:notes", "es", counted)).toBe(roomy);
}, 60000);
it("says as many cuts whole as fit and counts the rest in one line: the mind's own lines are never cut", async () => {
  const house = await cut();
  cutMore(house, 14);
  const state = () => house.tools.state().house;
  const own = ownScene(1500);
  const scene = withCuts(state(), "mind:notes", "es", own);
  expect(scene.length).toBeLessThanOrEqual(sceneLimits.general);
  expect(scene.endsWith(`\n${own}`)).toBe(true);
  const lines = scene.slice(0, -own.length - 1).split("\n");
  const counted = lines.at(-1) ?? "";
  const whole = lines.slice(0, -1);
  expect(whole.length).toBeGreaterThan(1);
  expect(whole.every(line => /^Se cortó un turno del journey «.+»: .+ No se reintentó nada\.$/u.test(line))).toBe(true);
  expect(counted).toBe(`Journeys cortados que no entran en esta escena: ${15 - whole.length}.`);
  expect(withCuts(state(), "mind:notes", "es", scene)).toBe(scene);
}, 60000);
