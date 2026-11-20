// The house supervisor answers inside a mind's turn at its four moments, loses to a mechanical rule, learns when a
// journey closes and is charged under its own actor; a synthetic transport stands in for the provider.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
import { answer, send, history } from "../../../tests/support/request-mind-fixture.ts";
import { currentTurn, lineOf } from "../../../tests/support/request-mind-responder.ts";
import {
  add,
  end,
  framesOf,
  moments,
  notes,
  opus,
  out,
  request,
  sent,
  supervisedFixture,
  supervising,
  supervisor,
  think,
  withSend,
} from "../../../tests/support/supervisor-responder.ts";
import type { ProgramMindResources } from "./program-mind-options.ts";
import { openModelSpendingAccount } from "./model-spending-account.ts";
const fixtures: ReturnType<typeof supervisedFixture>[] = [];
const folders: string[] = [];
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
  folders.splice(0).forEach(folder => rmSync(folder, { recursive: true, force: true }));
  vi.unstubAllGlobals();
});
it("is called at open, world, end, desist and consultation, learns after each journey and is charged", async () => {
  const f = fixture();
  const house = await f.open();
  withSend(house);
  const judge = supervisor(reason => ({
    outcome: "passed",
    text: reason === "consultation" ? "Anotalo y mandalo" : "Sigue",
  }));
  let desist = false;
  f.respond(frame =>
    supervising(frame)
      ? judge(frame)
      : notes(
          house,
          frame,
          (goal, _, id) =>
            desist
              ? [{ act: "desist", target: id, input: { reason: "Ya no hace falta", references: [] } }]
              : [out(goal), add(goal), end(id)],
          !desist,
        ),
  );
  await think(house, "Mate el jueves");
  desist = true;
  await think(house, "Mejor no");
  const frames = framesOf(f);
  expect(moments(frames)).toEqual(["consultation", "open", "world", "end", "learn", "open", "desist", "learn"]);
  expect(sent(house)).toBe(1);
  expect(house.tools.state().tools.notes.notes).toEqual(["Mate el jueves"]);
  const answered = history(house).find(event => event.kind === "mind-consultation-answered");
  expect(answered).toMatchObject({ data: { answer: "Anotalo y mandalo", source: "supervisor" } });
  const reviews = frames.filter(frame => supervising(frame) && request(frame));
  expect(reviews[0]).toContain("¿Lo anoto y lo mando?");
  expect(reviews[4]).toContain("Aprendí 1");
  expect(reviews[2]).toContain('"goal":"Mate el jueves"');
  expect(house.tools.state().house.minds.scenes.get("mind:supervisor")?.data.text).toContain("Aprendí 2");
  const calls = [...house.tools.state().house.modelCalls.values()].filter(c => c.reserved.by === "mind:supervisor");
  expect(calls).toHaveLength(8);
  expect(calls.every(call => call.status === "settled" && (call.settled?.data.actualNanoUsd ?? 0) > 0)).toBe(true);
  const journeys = [...house.tools.state().house.journeys.values()];
  expect(calls.filter(call => call.reserved.process === journeys[0]?.id)).toHaveLength(2);
  expect(journeys.map(journey => journey.closed?.data.outcome)).toEqual(["done", "desisted"]);
}, 60000);
it("a rejection stops the act and goes back to the mind, which corrects in the same turn", async () => {
  const f = fixture();
  const house = await f.open();
  withSend(house);
  const judge = supervisor(reason =>
    reason === "world" ? { outcome: "rejected", text: "No mandes notas afuera" } : { outcome: "passed", text: "Sigue" },
  );
  f.respond(frame =>
    supervising(frame)
      ? judge(frame)
      : notes(house, frame, (goal, shown, id) =>
          shown.includes("No mandes notas afuera") ? [add(goal), end(id)] : [out(goal), add(goal), end(id)],
        ),
  );
  await think(house, "Mate el jueves");
  expect(sent(house)).toBe(0);
  expect(house.tools.state().tools.notes.notes).toEqual(["Mate el jueves"]);
  const rejected = history(house).filter(
    event => event.layer === "house" && event.kind === "mind-review-recorded" && event.data.result === "rejected",
  );
  expect(rejected).toHaveLength(1);
  expect(rejected[0]).toMatchObject({ by: "mind:notes", data: { reason: "world", text: "No mandes notas afuera" } });
  expect([...house.tools.state().house.journeys.values()][0]?.closed?.data.outcome).toBe("done");
}, 60000);
it("a mechanical rule that stops the act wins: the supervisor is not asked and the act never runs", async () => {
  const f = fixture();
  const house = await f.open();
  withSend(house);
  house.tools.act({ act: "attend", input: { target: "rules" } }, 0, "ana");
  const rule = {
    id: "nada-afuera",
    text: "Las mentes no mandan notas afuera",
    action: { tool: "notes", act: "outbox/send" },
    condition: { operator: "actor", kind: "program" },
    effect: "block",
  };
  const saved = await settle(house.tools.act({ act: "save", target: "rules", input: rule }, 0, "ana"));
  expect(saved.status).toBe("accepted");
  const judge = supervisor(() => ({ outcome: "passed", text: "Sigue" }));
  f.respond(frame => (supervising(frame) ? judge(frame) : notes(house, frame, goal => [out(goal)])));
  await think(house, "Mate el jueves");
  expect(moments(framesOf(f))).toEqual(["open"]);
  expect(sent(house)).toBe(0);
  const evaluated = history(house).filter(event => event.kind === "rule-evaluated");
  expect(evaluated.at(-1)).toMatchObject({ by: "mind:notes", data: { results: [{ outcome: "block" }] } });
  const recorded = history(house).find(
    event => event.layer === "house" && event.kind === "mind-review-recorded" && event.data.reason === "world",
  );
  expect(recorded).toMatchObject({ data: { result: "passed" } });
  expect(JSON.stringify(recorded)).toContain("regla mecánica");
}, 60000);
it("without a supervisor card the mechanical rules decide and a consultation comes back «Sin supervisor»", async () => {
  const f = fixture({});
  const house = await f.open();
  withSend(house);
  f.respond(frame => notes(house, frame, (goal, _, id) => [out(goal), end(id)], true));
  await think(house, "Mate el jueves");
  expect(moments(framesOf(f))).toEqual([]);
  expect(framesOf(f).length).toBeGreaterThan(0);
  const answered = history(house).find(event => event.kind === "mind-consultation-answered");
  expect(answered).toMatchObject({ data: { answer: "Sin supervisor", source: "unconfigured" } });
  expect(sent(house)).toBe(1);
}, 60000);
it("a supervisor whose provider key is missing leaves the act to the mechanical rules and says why", async () => {
  const f = fixture({
    supervisorCard: opus,
    key: card => Promise.resolve(card.model === opus.model ? undefined : "synthetic"),
  });
  const house = await f.open();
  withSend(house);
  f.respond(frame => notes(house, frame, (goal, _, id) => [out(goal), end(id)], true));
  await think(house, "Mate el jueves");
  const answered = history(house).find(event => event.kind === "mind-consultation-answered");
  expect(answered).toMatchObject({ data: { answer: "Sin supervisor: Falta la llave del proveedor." } });
  expect(sent(house)).toBe(1);
  expect([...house.tools.state().house.modelCalls.values()].some(c => c.reserved.by === "mind:supervisor")).toBe(false);
  expect([...house.tools.state().house.journeys.values()][0]?.closed?.data.outcome).toBe("done");
}, 60000);
it("charges the assistant and the supervisor to the host's spending account, each under its own actor", async () => {
  const folder = mkdtempSync(join(tmpdir(), "supervisor-spending-"));
  folders.push(folder);
  const spendingAccount = { file: join(folder, "models.sqlite"), openingNanoUsd: 0 };
  const f = fixture({ supervisorCard: opus, spendingAccount });
  const house = await f.open();
  f.respond(frame => {
    if (supervising(frame)) return request(frame) ? { outcome: "passed", text: "Sigue" } : { scene: "Aprendí" };
    const turn = currentTurn(house);
    if (turn.by !== "assistant:ana") return answer();
    if (turn.process) return answer([end(turn.process)]);
    const heard = history(house).some(event => turn.data.wake.includes(event.id) && lineOf(event));
    return answer(heard ? [{ act: "open", target: "assistant:ana", input: { goal: "Pensar", kit: [] } }] : []);
  });
  expect(send(house, "assistant:ana", "Pensá en el jueves").status).toBe("accepted");
  await (await house.minds)?.flush();
  house.close();
  const account = openModelSpendingAccount(f.home, spendingAccount, "test", 10e9);
  try {
    const calls = [...account.billing.calls().values()];
    const by = (actor: string) => calls.filter(call => call.reserved.by === actor);
    expect(by("assistant:ana").length).toBeGreaterThanOrEqual(2);
    expect(by("mind:supervisor")).toHaveLength(3);
    expect(calls.every(call => call.status === "settled" && (call.settled?.data.actualNanoUsd ?? 0) > 0)).toBe(true);
  } finally {
    account.close();
  }
}, 60000);
