// A journey that gets its own plan wrong hears which mistake it made and goes on in the same turn.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { history } from "../../../tests/support/request-mind-fixture.ts";
import { end, notes, supervisedFixture, think, withSend } from "../../../tests/support/supervisor-responder.ts";
import { shortIds } from "./mind-references.ts";
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
const step = { id: "a", text: "Anotar" };
it("a second plan, a repeated id, a step outside the plan and one already done come back as corrections", async () => {
  const f = supervisedFixture({});
  fixtures.push(f);
  const house = await f.open();
  withSend(house);
  const shown: string[] = [];
  f.respond(frame =>
    notes(house, frame, (_, text, id) => {
      const plan = (...steps: (typeof step)[]) => ({ act: "plan", target: id, input: { steps } });
      const done = (name: string) => ({ act: "done", target: id, input: { step: name, note: "Hecho" } });
      const answers = [[plan(step, step)], [plan(step), plan(step)], [done("zz")], [done("a"), done("a")], [end(id)]];
      shown.push(text);
      return answers[shown.length - 1] ?? [];
    }),
  );
  await think(house, "Anotar el mate");
  const journey = [...house.tools.state().house.journeys.values()][0];
  const turn = [...house.tools.state().house.minds.turns.values()].find(each => each.opened.process === journey?.id);
  expect(turn?.closed?.data).toMatchObject({ outcome: "done", calls: 5 });
  expect(turn?.closed?.data.reason).toBeUndefined();
  expect(journey?.steps).toEqual([{ ...step, note: "Hecho" }]);
  expect(journey?.closed?.data.outcome).toBe("done");
  const told = shown.join("\n");
  expect(told).toContain("El plan repite el identificador «a»: cada paso lleva uno distinto.");
  expect(told).toContain(`1. plan → ${shortIds(journey?.id ?? "")}: aceptado.`);
  expect(told).toContain(`2. plan → ${shortIds(journey?.id ?? "")}: rechazado: Este journey ya tiene su plan`);
  expect(told).toContain("El paso «zz» no existe en el plan de este journey. Pasos pendientes: a.");
  expect(told).toContain(`1. done → ${shortIds(journey?.id ?? "")}: aceptado.`);
  expect(told).toContain(`2. done → ${shortIds(journey?.id ?? "")}: rechazado: El paso «a» ya estaba hecho`);
  const faults = history(house).flatMap(event =>
    event.layer === "house" && event.kind === "mind-answer-invalid" ? event.data.faults.map(fault => fault.code) : [],
  );
  expect(faults).toEqual(["plan", "plan", "plan", "plan"]);
}, 60000);
