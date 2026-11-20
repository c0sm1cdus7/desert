// A rule that asks for judgment sends a mind's act to the supervisor; without one to ask, the act waits.
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
async function judgedRule(house: RequestHouse) {
  house.tools.act({ act: "attend", input: { target: "rules" } }, 0, "ana");
  const rule = {
    id: "notas-con-juicio",
    text: "Lo que anota una mente lo mira el supervisor",
    action: { tool: "notes", act: "personal/add" },
    condition: { operator: "actor", kind: "program" },
    effect: "require-supervisor",
  };
  expect((await settle(house.tools.act({ act: "save", target: "rules", input: rule }, 0, "ana"))).status).toBe(
    "accepted",
  );
}
const ruled = (house: RequestHouse) =>
  history(house).flatMap(event =>
    event.layer === "house" && event.kind === "mind-review-recorded" && event.data.reason === "rule"
      ? [[event.data.result, event.data.text]]
      : [],
  );
it.each([
  ["passed", "Anotalo", ["Mate el jueves"]],
  ["rejected", "No anotes eso", []],
] as const)(
  "an act a rule leaves to judgment goes to the supervisor, which %s it",
  async (outcome, text, kept) => {
    const f = fixture();
    const house = await f.open();
    withSend(house);
    await judgedRule(house);
    const judge = supervisor(reason => (reason === "rule" ? { outcome, text } : { outcome: "passed", text: "Sigue" }));
    f.respond(frame =>
      supervising(frame)
        ? judge(frame)
        : notes(house, frame, (goal, shown, id) => (shown.includes(text) ? [end(id)] : [add(goal), end(id)])),
    );
    await think(house, "Mate el jueves");
    expect(moments(framesOf(f))).toEqual(["open", "end", "rule", "learn"]);
    expect(ruled(house)).toEqual([[outcome, text]]);
    expect(house.tools.state().tools.notes.notes).toEqual(kept);
    expect([...house.tools.state().house.journeys.values()][0]?.closed?.data.outcome).toBe("done");
  },
  60000,
);
it("without a supervisor to ask, an act a rule leaves to judgment waits and the mind is told so", async () => {
  const f = fixture({
    supervisorCard: opus,
    key: card => Promise.resolve(card.model === opus.model ? undefined : "synthetic"),
  });
  const house = await f.open();
  withSend(house);
  await judgedRule(house);
  f.respond(frame =>
    notes(house, frame, (goal, shown, id) => (shown.includes("espera juicio") ? [end(id)] : [add(goal), end(id)])),
  );
  await think(house, "Mate el jueves");
  expect(ruled(house)).toEqual([["rejected", rulesTexts.waiting]]);
  expect(house.tools.state().tools.notes.notes).toEqual([]);
}, 60000);
