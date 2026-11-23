// An act a rule marks as one that requires supervision waits for the supervisor's verdict, in the turn of whoever acts
// or, for an identity at a door, in a turn of the supervisor's own; without a supervisor it is not done and says so.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
import { rulesTexts } from "../../texts/rules.texts.ts";
import { history, type RequestHouse } from "../../../tests/support/request-mind-fixture.ts";
import {
  add,
  end,
  framesOf,
  moments,
  notes,
  opus,
  request,
  supervisedFixture,
  supervising,
  supervisor,
  think,
  withSend,
} from "../../../tests/support/supervisor-responder.ts";
import type { ProgramMindResources } from "./program-mind-options.ts";
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
type Condition = Readonly<Record<string, unknown>>;
async function markedRule(house: RequestHouse, condition: Condition = { operator: "always" }, act = "personal/add") {
  house.tools.act({ act: "attend", input: { target: "rules" } }, 0, "ana");
  const rule = {
    id: "supervised-notes",
    text: "Lo que se anota requiere supervisión",
    action: { tool: act === "end" ? "journey" : "notes", act },
    condition,
    effect: "require-supervisor",
  };
  expect((await settle(house.tools.act({ act: "save", target: "rules", input: rule }, 0, "ana"))).status).toBe(
    "accepted",
  );
}
const ruled = (house: RequestHouse) =>
  history(house).flatMap(event =>
    event.layer === "house" && event.kind === "mind-review-recorded" && event.data.reason === "rule"
      ? [[event.by, event.data.result, event.data.text]]
      : [],
  );
const journeyTurns = (house: RequestHouse) =>
  [...house.tools.state().house.minds.turns.values()].filter(turn => turn.opened.process?.startsWith("journey:"));
it.each([
  ["passed", "Anotalo", ["Mate el jueves"]],
  ["rejected", "No anotes eso", []],
] as const)(
  "a mind's marked act waits for the verdict inside its turn; %s, the turn goes on and the mind decides",
  async (outcome, text, kept) => {
    const f = fixture();
    const house = await f.open();
    withSend(house);
    await markedRule(house);
    const judge = supervisor(reason => (reason === "rule" ? { outcome, text } : { outcome: "passed", text: "Sigue" }));
    const told: string[] = [];
    f.respond(frame => {
      if (supervising(frame)) return judge(frame);
      return notes(house, frame, (goal, shown, id) => {
        if (!shown.includes("Results of the acts")) return [add(goal), add(`${goal} bis`)];
        told.push(shown);
        return [end(id)];
      });
    });
    await think(house, "Mate el jueves");
    expect(moments(framesOf(f))).toEqual(outcome === "passed" ? ["rule", "rule", "turn"] : ["rule", "turn"]);
    expect(ruled(house)[0]).toEqual(["mind:notes", outcome, text]);
    expect(house.tools.state().tools.notes.notes).toEqual(outcome === "passed" ? [...kept, "Mate el jueves bis"] : []);
    // The verdicts are calls of the same turn: two answers of the mind, and one verdict per marked act it applied.
    const calls = outcome === "passed" ? 4 : 3;
    expect(journeyTurns(house).map(turn => turn.closed?.data)).toMatchObject([{ outcome: "done", calls }]);
    if (outcome === "rejected") {
      expect(told[0]).toContain(
        "1. personal/add → notes/personal: rejected: Rejected by the supervisor: No anotes eso",
      );
      expect(told[0]).toContain("2. personal/add → notes/personal: not applied, because an earlier act was rejected.");
    }
    expect([...house.tools.state().house.journeys.values()][0]?.closed?.data.outcome).toBe("done");
  },
  60000,
);
it("a journey control can be marked: the end waits for the verdict; a rejection keeps the journey open", async () => {
  const f = fixture();
  const house = await f.open();
  withSend(house);
  await markedRule(house, { operator: "actor", kind: "program" }, "end");
  let ends = 0;
  const judge = supervisor(() =>
    ++ends === 1 ? { outcome: "rejected", text: "Antes anotá" } : { outcome: "passed", text: "Sí" },
  );
  f.respond(frame =>
    supervising(frame)
      ? judge(frame)
      : notes(house, frame, (goal, shown, id) => (shown.includes("Antes anotá") ? [add(goal), end(id)] : [end(id)])),
  );
  await think(house, "Mate el jueves");
  expect(moments(framesOf(f))).toEqual(["rule", "rule", "turn"]);
  expect(ruled(house).map(([, result]) => result)).toEqual(["rejected", "passed"]);
  expect(house.tools.state().tools.notes.notes).toEqual(["Mate el jueves"]);
  expect([...house.tools.state().house.journeys.values()][0]?.closed?.data.outcome).toBe("done");
}, 60000);
it("without a supervisor card a marked act is not done, the mind is told and the holders are called", async () => {
  const f = fixture({});
  const house = await f.open();
  withSend(house);
  await markedRule(house);
  f.respond(frame => notes(house, frame, (goal, _, id) => [add(goal), end(id)]));
  await think(house, "Mate el jueves");
  expect(house.tools.state().tools.notes.notes).toEqual([]);
  const notice = history(house).findLast(event => event.layer === "house" && event.kind === "tool-entry");
  expect(notice).toMatchObject({ data: { tool: "notes", text: rulesTexts.waiting, attention: true } });
  // It stops the journey turn as a rule that blocks does, and its consciousness hears it once.
  // Each end the journey tries afterwards meets the rule that blocks, as a stop (rules waking it is another law).
  const reasons = journeyTurns(house).map(turn => turn.closed?.data.reason);
  expect(reasons.length).toBeGreaterThan(0);
  expect(reasons.every(reason => reason === "act-failed")).toBe(true);
}, 60000);
it("a supervisor that cannot give its verdict leaves the act undone, says why, and the turn goes on", async () => {
  const f = fixture({
    supervisorCard: opus,
    key: card => Promise.resolve(card.model === opus.model ? undefined : "synthetic"),
  });
  const house = await f.open();
  withSend(house);
  await markedRule(house);
  f.respond(frame =>
    notes(house, frame, (goal, shown, id) =>
      shown.includes("the supervisor gave no verdict") ? [end(id)] : [add(goal)],
    ),
  );
  await think(house, "Mate el jueves");
  const unjudged = rulesTexts.verdict("failed", "The provider's key is missing.");
  expect(ruled(house)).toEqual([["mind:notes", "failed", "The provider's key is missing."]]);
  expect(house.tools.state().tools.notes.notes).toEqual([]);
  expect(JSON.stringify(history(house))).toContain(JSON.stringify(unjudged));
  expect(journeyTurns(house).map(turn => turn.closed?.data)).toMatchObject([{ outcome: "done", calls: 2 }]);
}, 60000);
it("a rule that changes while a marked control waits decides again: a passed verdict does not apply it", async () => {
  const f = fixture();
  const house = await f.open();
  withSend(house);
  await markedRule(house, { operator: "actor", kind: "program" }, "end");
  const block = {
    id: "supervised-notes",
    text: "Ya no se termina",
    action: { tool: "journey", act: "end" },
    condition: { operator: "always" },
    effect: "block",
  };
  f.respond(async frame => {
    if (!supervising(frame)) return notes(house, frame, (_, __, id) => [end(id)]);
    if (!request(frame)) return { scene: "Aprendí", consultation: null, acts: [] };
    expect((await settle(house.tools.act({ act: "save", target: "rules", input: block }, 0, "ana"))).status).toBe(
      "accepted",
    );
    return { outcome: "passed", text: "Sí" };
  });
  await think(house, "Mate el jueves");
  expect(ruled(house).map(([, result]) => result)).toEqual(["passed"]);
  expect([...house.tools.state().house.journeys.values()][0]?.closed).toBeUndefined();
  // Each end the journey tries afterwards meets the rule that blocks, as a stop (rules waking it is another law).
  const reasons = journeyTurns(house).map(turn => turn.closed?.data.reason);
  expect(reasons.length).toBeGreaterThan(0);
  expect(reasons.every(reason => reason === "act-failed")).toBe(true);
}, 60000);
