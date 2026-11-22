// Opening publishes the catalog and applies declared starting cards without calling a model.
import { afterEach, expect, it } from "vitest";
import { programMindFixture } from "../../../tests/support/program-mind-fixture.ts";
import { mindRuntimeHouse } from "../../../tests/support/mind-runtime-house.ts";
import { cards } from "../../adapters/models/catalog.ts";
import { effect } from "../../house/facts.ts";
import { assignDeclaredCards, publishMindCards } from "./mind-card-catalog.ts";
const fixtures: ReturnType<typeof programMindFixture>[] = [];
async function closedMinds() {
  const f = programMindFixture();
  fixtures.push(f);
  const house = await f.open({}, false);
  return { f, house, runtime: mindRuntimeHouse(house) };
}
const count = (house: Awaited<ReturnType<typeof closedMinds>>["house"], kind: string): number =>
  house.journal.replay(0, (total, event) => total + Number(event.kind === kind));
afterEach(() => fixtures.splice(0).forEach(f => f.cleanup()));
it("opening prepares minds with no model call: publishes the catalog, assigns the declared card", async () => {
  const f = programMindFixture();
  fixtures.push(f);
  const house = await f.open();
  expect(f.transport).not.toHaveBeenCalled();
  expect(count(house, "model-call-reserved")).toBe(0);
  expect(count(house, "mind-bank-tested")).toBe(0);
  expect(house.tools.state().house.mindCards.get("mind:notes")).toHaveLength(cards.length);
  expect(house.tools.state().house.mindAssignments.get("mind:notes")).toMatchObject({
    card: "claude-haiku-5-5",
    version: "low",
  });
  expect(house.mindNotices?.()).toEqual([]);
});
it("assigns a declared card once and never over an existing assignment", async () => {
  const { f, house, runtime } = await closedMinds();
  const options = await f.options();
  publishMindCards(runtime, options);
  assignDeclaredCards(runtime, options);
  assignDeclaredCards(runtime, options);
  expect(count(house, "mind-card-assigned")).toBe(1);
  house.bus.emit(
    effect(
      "mind-card-assigned",
      { mind: "mind:notes", card: "claude-opus-5-5", version: "high", capabilities: ["sees"] },
      "ana",
    ),
  );
  assignDeclaredCards(runtime, options);
  expect(count(house, "mind-card-assigned")).toBe(2);
  expect(house.tools.state().house.mindAssignments.get("mind:notes")).toMatchObject({
    card: "claude-opus-5-5",
    version: "high",
  });
});
it.each([
  ["a model outside the catalog", { model: "claude-other", effort: "low" }, {}],
  ["an effort outside the catalog", { model: "claude-haiku-5-5", effort: "max" }, {}],
  ["a provider that is not enabled", { model: "claude-haiku-5-5", effort: "low" }, { providers: [] }],
])("throws mind.card for a declared card with %s", async (_name, declared, changes) => {
  const { f, house, runtime } = await closedMinds();
  const options = { ...(await f.options({ cards: { "mind:notes": declared } })), ...changes };
  publishMindCards(runtime, options);
  expect(() => assignDeclaredCards(runtime, options)).toThrow("mind.card: mind:notes");
  expect(house.tools.state().house.mindAssignments.has("mind:notes")).toBe(false);
});
it("refuses a declared card for a mind the distribution does not define; a mindless house reads none", async () => {
  const f = programMindFixture();
  fixtures.push(f);
  const cards = { "mind:nobody": { model: "claude-haiku-5-5", effort: "low" } };
  const quiet = await f.open({ cards }, false);
  expect(quiet.tools.state().house.mindAssignments.size).toBe(0);
  quiet.close();
  await expect(f.open({ cards })).rejects.toThrow("mind.card: mind:nobody");
  expect(f.transport).not.toHaveBeenCalled();
});
it("a house whose declared card is outside the catalog fails to start its minds and says which", async () => {
  const f = programMindFixture();
  fixtures.push(f);
  await expect(f.open({ cards: { "mind:notes": { model: "claude-other", effort: "low" } } })).rejects.toThrow(
    "mind.card: mind:notes",
  );
  expect(f.transport).not.toHaveBeenCalled();
});
