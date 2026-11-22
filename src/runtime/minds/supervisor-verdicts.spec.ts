// An identity's act a rule marks waits, at any door, for the supervisor's verdict in a turn of its own: opened, billed
// and closed by mind:supervisor; a restart closes a verdict turn it cut, and without a supervisor the act waits.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { effect } from "../../house/facts.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
import { rulesTexts } from "../../texts/rules.texts.ts";
import { history, type RequestHouse } from "../../../tests/support/request-mind-fixture.ts";
import {
  framesOf,
  moments,
  request,
  supervisedFixture,
  supervising,
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
async function marked(house: RequestHouse) {
  house.tools.act({ act: "attend", input: { target: "rules" } }, 0, "ana");
  const rule = {
    id: "supervised-people",
    text: "Lo que anota una persona requiere supervisión",
    action: { tool: "notes", act: "personal/add" },
    condition: { operator: "actor", kind: "identity" },
    effect: "require-supervisor",
  };
  expect((await settle(house.tools.act({ act: "save", target: "rules", input: rule }, 0, "ana"))).status).toBe(
    "accepted",
  );
  house.bus.emit(effect("attended", { target: "notes/personal" }, "ana"));
}
const note = (house: RequestHouse, body: string) =>
  house.tools.act(
    { act: "personal/add", target: "notes/personal", input: { body } },
    house.tools.state().through,
    "ana",
  );
it.each([
  ["passed", "Que la anote", "accepted"],
  ["rejected", "Eso no se anota", "rejected"],
] as const)(
  "ana's marked act gets the verdict at the door: %s",
  async (outcome, text, status) => {
    const f = fixture();
    const house = await f.open();
    await marked(house);
    f.respond(frame => (supervising(frame) ? { outcome, text } : { scene: "Ready", consultation: null, acts: [] }));
    const started = note(house, "Mate");
    expect(started.status).toBe("processing");
    const done = await settle(started);
    expect(done.status).toBe(status);
    if (outcome === "rejected") expect(done.reason).toBe(`Rechazado por el supervisor: ${text}`);
    expect(house.tools.state().tools.notes.notes).toEqual(outcome === "passed" ? ["Mate"] : []);
    const frames = framesOf(f).filter(supervising);
    expect(moments(frames)).toEqual(["rule"]);
    expect(request(frames[0] ?? "")?.acts).toEqual([
      { act: "personal/add", target: "notes/personal", input: { body: "Mate" } },
    ]);
    expect(frames[0]).toContain('"identity":"ana"');
    const act = history(house).findLast(event => event.layer === "house" && event.kind === "act");
    const own = history(house).filter(
      event => event.by === "mind:supervisor" && event.process === act?.id && event.kind.startsWith("mind-"),
    );
    expect(own.map(event => event.kind)).toEqual(["mind-turn-opened", "mind-review-recorded", "mind-turn-closed"]);
    expect(own.at(-1)).toMatchObject({ data: { outcome: "done", calls: 1 } });
    const calls = [...house.tools.state().house.modelCalls.values()].filter(
      call => call.reserved.by === "mind:supervisor",
    );
    expect(calls.map(call => [call.reserved.process, call.status])).toEqual([[act?.id, "settled"]]);
  },
  60000,
);
it("without a supervisor card ana's marked act is not done, says so and calls the tool's holders", async () => {
  const f = fixture({});
  const house = await f.open();
  await marked(house);
  const done = await settle(note(house, "Mate"));
  expect(done).toMatchObject({ status: "rejected", reason: rulesTexts.waiting });
  expect(house.tools.state().tools.notes.notes).toEqual([]);
  expect(framesOf(f).filter(supervising)).toEqual([]);
  expect(history(house).some(event => event.by === "mind:supervisor")).toBe(false);
});
it("a restart closes the verdict turn it cut, and the act it was judging comes back interrupted", async () => {
  const f = fixture();
  const house = await f.open();
  await marked(house);
  f.respond(frame => (supervising(frame) ? new Promise(() => {}) : { scene: "Ready", consultation: null, acts: [] }));
  const started = note(house, "Mate");
  await vi.waitFor(() => expect(framesOf(f).filter(supervising)).toHaveLength(1));
  house.close();
  const again = await f.open();
  const turns = [...again.tools.state().house.minds.turns.values()].filter(
    turn => turn.opened.by === "mind:supervisor",
  );
  expect(turns.map(turn => turn.closed?.data)).toMatchObject([{ outcome: "interrupted", reason: "interrupted" }]);
  expect(again.tools.state().tools.notes.notes).toEqual([]);
  expect(started.status).toBe("processing");
});
it("before the minds start, a house that brings a supervisor says it is starting; then the act is judged", async () => {
  const f = fixture();
  const first = await f.open();
  await marked(first);
  first.close();
  const add = { act: "personal/add", target: "notes/personal", input: { body: "Mate" } };
  let early: Readonly<{ status: string; reason?: string }> | undefined;
  const house = await f.open(true, { started: act => (early = act(add, 0, "ana")) });
  expect(early).toMatchObject({ status: "rejected", reason: rulesTexts.starting });
  f.respond(frame =>
    supervising(frame) ? { outcome: "passed", text: "Sí" } : { scene: "Ready", consultation: null, acts: [] },
  );
  expect((await settle(note(house, "Mate"))).status).toBe("accepted");
  expect(moments(framesOf(f))).toEqual(["rule"]);
});
