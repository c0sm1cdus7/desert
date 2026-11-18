import { afterEach, expect, it } from "vitest";
import { programMindFixture } from "../../../tests/support/program-mind-fixture.ts";
import { modelAccount } from "../../house/minds/model-call-state.ts";
import { maximumProgramCall } from "./program-mind-availability.ts";
import { cards } from "../../adapters/models/catalog.ts";
const fixtures: ReturnType<typeof programMindFixture>[] = [];
const fixture = () => {
  const f = programMindFixture();
  fixtures.push(f);
  return f;
};
afterEach(() => fixtures.splice(0).forEach(f => f.cleanup()));
it("elige la más barata que pasa sus tres escenas y no prueba la siguiente", async () => {
  const f = fixture();
  f.respond(request => ({
    scene: request.effort === "high" ? "No alcanza" : "Banco aprobado",
    acts: [],
    consulta: null,
  }));
  const house = await f.open();
  expect(f.frames.map(frame => frame.effort)).toEqual(["high", "high", "high", "low", "low", "low"]);
  expect(new Set(f.frames.map(frame => frame.model))).toEqual(new Set(["claude-haiku-5-5"]));
  expect(house.tools.state().house.mindAssignments.get("mind:notas")?.version).toBe("low");
  const evidence = house.journal.replay<string[]>([], (results, event) =>
    event.kind === "mind-bank-tested"
      ? [...results, `${event.data.version}:${event.data.result.passed}:${event.data.result.scenes}`]
      : results,
  );
  expect(evidence).toEqual(["high:false:3", "low:true:3"]);
  expect(
    f.frames.every(
      frame => frame.body.includes("Sos la mente de Notas") && frame.body.includes("Anotá con las acciones"),
    ),
  ).toBe(true);
  expect(modelAccount(house.tools.state().house.modelCalls, "test").spentNanoUsd).toBeGreaterThan(0);
  house.close();
  const reopened = await f.open();
  expect(f.transport).toHaveBeenCalledTimes(6);
  expect(reopened.tools.state().house.mindAssignments.get("mind:notas")?.version).toBe("low");
});
it("sin carta que pase la casa abre, conserva el banco fallido y lo dice", async () => {
  const f = fixture();
  f.respond(() => ({ scene: "No alcanza", acts: [], consulta: null }));
  const house = await f.open({ capNanoUsd: 10000000000 });
  expect(f.transport).toHaveBeenCalledTimes(cards.length * 3);
  expect(house.tools.state().house.mindAssignments.has("mind:notas")).toBe(false);
  expect(house.mindNotices?.().join(" ")).toContain("carta");
  house.close();
  await f.open({ capNanoUsd: 10000000000 });
  expect(f.transport).toHaveBeenCalledTimes(cards.length * 3);
});
it("el gasto del banco y del pensamiento sobrevive cerrar, reabrir y recalcular", async () => {
  const f = fixture();
  const house = await f.open();
  f.wake(house);
  await (await house.minds)?.flush();
  const spent = modelAccount(house.tools.state().house.modelCalls, "test").spentNanoUsd;
  expect(spent).toBeGreaterThan(0);
  const count = f.transport.mock.calls.length;
  const card = cards[0];
  if (!card) throw new Error("card");
  house.close();
  const reopened = await f.open({ capNanoUsd: maximumProgramCall(card, 50000) + spent - 1 }, true, "redeployed/2");
  expect(modelAccount(reopened.tools.state().house.modelCalls, "test").spentNanoUsd).toBe(spent);
  expect(reopened.mindNotices?.().join(" ")).toContain("saldo");
  f.wake(reopened);
  await (await reopened.minds)?.flush();
  expect(f.transport).toHaveBeenCalledTimes(count);
  expect(reopened.tools.state().house.scenes.get("mind:notas")?.data.general).toContain("saldo");
});
it.each(["no-key", "cap"])("abre con %s sin llamar al transporte", async reason => {
  const f = fixture();
  const house = await f.open(reason === "no-key" ? { key: () => Promise.resolve(undefined) } : { capNanoUsd: 0 });
  expect(f.transport).not.toHaveBeenCalled();
  expect(house.mindNotices?.().join(" ")).toContain(reason === "no-key" ? "llave" : "saldo");
  f.wake(house);
  await (await house.minds)?.flush();
  expect(f.transport).not.toHaveBeenCalled();
});

it("el banco abre journeys y comprueba trabajo real sin escribir notas en la casa viva", async () => {
  const f = programMindFixture({
    given: [],
    kit: [{ tool: "notas", acts: ["personal/add"] }],
    when: { act: "personal/add", target: "notas/personal", input: {} },
    check: events => events.filter(event => event.layer === "program" && event.by === "mind:notas").length === 1,
  });
  fixtures.push(f);
  f.respond(request => {
    const journey = request.changing.match(/^Alcance:\nmind:notas \/ (journey:[a-f0-9-]+)/)?.[1];
    if (journey)
      return {
        scene: "Banco aprobado",
        consulta: null,
        acts: [
          { act: "personal/add", target: "notas/personal", input: {} },
          { act: "end", target: journey, input: { summary: "Terminé", references: [] } },
        ],
      };
    return {
      scene: "Banco aprobado",
      consulta: null,
      acts: request.changing.includes("Escena:\nBanco aprobado")
        ? []
        : [
            {
              act: "open",
              target: "mind:notas",
              input: { goal: "Anotar", kit: [{ tool: "notas", acts: ["personal/add"] }] },
            },
          ],
    };
  });
  const house = await f.open();
  expect(f.transport).toHaveBeenCalledTimes(9);
  expect(house.tools.state().tools.notas.count).toBe(0);
  expect(house.tools.state().house.journeys.size).toBe(0);
  expect(house.tools.state().house.modelCalls.size).toBe(9);
  expect(house.tools.state().house.mindAssignments.has("mind:notas")).toBe(true);
});
