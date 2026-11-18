import { afterEach, expect, it } from "vitest";
import { programMindFixture } from "../../../tests/support/program-mind-fixture.ts";
import { selectionKit } from "../../house/kit-selection.ts";
import { effect } from "../../house/facts.ts";
const fixtures: ReturnType<typeof programMindFixture>[] = [];
const fixture = () => {
  const f = programMindFixture();
  fixtures.push(f);
  return f;
};
afterEach(() => fixtures.splice(0).forEach(f => f.cleanup()));
it("dos programas: solo Notas piensa, escribe su escena y un journey actúa con el kit dado", async () => {
  const f = fixture();
  const house = await f.open();
  expect(f.distribution.mindDefinitions.map(mind => mind.actor)).toEqual(["mind:notas"]);
  expect(house.tools.state().house.mindAssignments.has("mind:agenda")).toBe(false);
  house.bus.emit(
    effect(
      "kit-set",
      { version: 2, holder: "mind:notas", kit: selectionKit([{ kind: "tool", program: "notas", tool: "personal" }]) },
      "ana",
    ),
  );
  let calls = 0;
  f.respond(() => {
    calls++;
    if (calls === 1)
      return {
        scene: "Voy a anotar",
        consulta: null,
        acts: [
          {
            act: "open",
            target: "mind:notas",
            input: { goal: "Anotar", kit: [{ tool: "notas", acts: ["personal/add"] }] },
          },
        ],
      };
    const journey = [...house.tools.state().house.journeys.keys()][0];
    if (!journey) throw new Error("journey");
    if (calls === 2)
      return {
        scene: "Anoté",
        consulta: null,
        acts: [
          { act: "personal/add", target: "notas/personal", input: {} },
          { act: "end", target: journey, input: { summary: "Terminé", references: [] } },
        ],
      };
    return {
      scene: "Terminé",
      consulta: null,
      acts: [
        {
          act: "scene",
          target: "mind:notas",
          input: { general: "La nota está lista", to: { ana: "Ana, revisá la nota." } },
        },
      ],
    };
  });
  f.wake(house);
  await (await house.minds)?.flush();
  expect(calls).toBe(3);
  expect(house.tools.state().tools.notas.count).toBe(2);
  expect([...house.tools.state().house.journeys.values()][0]?.closed?.data.outcome).toBe("done");
  expect([...house.tools.state().house.minds.turns.values()].every(turn => turn.opened.by === "mind:notas")).toBe(true);
  expect(house.tools.state().house.scenes.get("mind:notas")?.data).toEqual({
    general: "La nota está lista",
    to: { ana: "Ana, revisá la nota." },
  });
  const authors = house.journal.replay<string[]>([], (authors, event) =>
    event.layer === "program" ? [...authors, event.by] : authors,
  );
  expect(authors).toEqual(["ana", "mind:notas"]);
});
it("un journey sin kit no ejecuta una acción aunque el transporte la proponga", async () => {
  const f = fixture();
  const house = await f.open();
  let calls = 0;
  f.respond(() => {
    calls++;
    return {
      scene: "Intento anotar",
      consulta: null,
      acts:
        calls === 1
          ? [{ act: "open", target: "mind:notas", input: { goal: "Anotar", kit: [] } }]
          : [{ act: "personal/add", target: "notas/personal", input: {} }],
    };
  });
  f.wake(house);
  await (await house.minds)?.flush();
  expect(calls).toBe(3);
  expect(house.tools.state().tools.notas.count).toBe(1);
  expect([...house.tools.state().house.minds.turns.values()].at(-1)?.closed?.data.outcome).toBe("failed");
  expect([...house.tools.state().house.journeys.values()][0]?.selections?.selections).toEqual([]);
});
it("abre con mente una casa creada sin pensamiento y conserva sus notas", async () => {
  const f = fixture();
  const first = await f.open({}, false);
  f.wake(first);
  expect(first.tools.state().tools.notas.count).toBe(1);
  expect(f.transport).not.toHaveBeenCalled();
  first.close();
  const second = await f.open();
  expect(second.tools.state().tools.notas.count).toBe(1);
  expect(second.tools.state().house.mindAssignments.has("mind:notas")).toBe(true);
  expect(second.tools.state().house.scenes.get("mind:notas")?.data.general).toBe("Banco aprobado");
  expect(f.transport).toHaveBeenCalledTimes(4);
});
it("la consciencia puede dirigirse a una identidad sin recibir acciones de trabajo", async () => {
  const f = fixture();
  const house = await f.open();
  f.respond(() => ({
    scene: "Le avisé a Ana",
    consulta: null,
    acts: [{ act: "message", target: "mind:notas", input: { to: "ana", text: "Revisá la nota." } }],
  }));
  f.wake(house);
  await (await house.minds)?.flush();
  expect(house.tools.state().house.minds.messages.at(-1)?.data).toMatchObject({ to: "ana", text: "Revisá la nota." });
  expect(house.tools.state().tools.notas.count).toBe(1);
});
