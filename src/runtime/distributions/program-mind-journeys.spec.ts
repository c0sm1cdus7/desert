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
  expect(f.transport).toHaveBeenCalledOnce();
});
it("la consciencia ya no tiene mensaje nativo: habla por programas y un mensaje propuesto no deja hechos", async () => {
  const f = fixture();
  expect(f.distribution.mindDefinitions[0]?.communication).toEqual([{ tool: "mind", act: "scene" }]);
  const house = await f.open();
  f.respond(() => ({
    scene: "Le avisé a Ana",
    consulta: null,
    acts: [{ act: "message", target: "mind:notas", input: { to: "ana", text: "Revisá la nota." } }],
  }));
  f.wake(house);
  await (await house.minds)?.flush();
  const kinds = house.journal.replay<string[]>([], (kinds, event) => [...kinds, event.kind]);
  expect(kinds).not.toContain("mind-message");
  expect(kinds).toContain("mind-turn-closed");
  expect(house.tools.state().tools.notas.count).toBe(1);
});
it("a journey kit outside the mind's kit comes back as a correction with that kit, then it opens", async () => {
  const f = fixture();
  const house = await f.open();
  house.bus.emit(
    effect(
      "kit-set",
      { version: 2, holder: "mind:notas", kit: selectionKit([{ kind: "tool", program: "notas", tool: "personal" }]) },
      "ana",
    ),
  );
  const frames: string[] = [];
  let calls = 0;
  f.respond(request => {
    calls++;
    frames.push(request.body);
    const kit =
      calls === 1 ? [{ tool: "notas/personal", acts: ["personal/add"] }] : [{ tool: "notas", acts: ["personal/add"] }];
    return calls <= 2
      ? { scene: "Abro", consulta: null, acts: [{ act: "open", target: "mind:notas", input: { goal: "Anotar", kit } }] }
      : { scene: "Listo", consulta: null, acts: [] };
  });
  f.wake(house);
  await (await house.minds)?.flush();
  const turns = [...house.tools.state().house.minds.turns.values()];
  expect(turns[0]?.closed?.data.outcome).toBe("done");
  expect(turns[0]?.invalid.map(event => event.data.faults)).toEqual([[{ code: "kit", path: "/acts" }]]);
  expect(frames[1]).toContain("notas: personal/add");
  expect(house.tools.state().house.journeys.size).toBe(1);
});
it("a journey turn that acted without waiting, ending or desisting gets a short wait to come back", async () => {
  const f = fixture();
  const house = await f.open();
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
    const kit = [{ tool: "notas", acts: ["personal/add"] }];
    if (calls === 1)
      return {
        scene: "Abro",
        consulta: null,
        acts: [{ act: "open", target: "mind:notas", input: { goal: "Anotar", kit } }],
      };
    return {
      scene: "Anoté y sigo",
      consulta: null,
      acts: [{ act: "personal/add", target: "notas/personal", input: {} }],
    };
  });
  const before = Date.now();
  f.wake(house);
  await (await house.minds)?.flush();
  expect(calls).toBe(2);
  const journey = [...house.tools.state().house.journeys.values()][0];
  expect(journey?.closed).toBeUndefined();
  expect(journey?.waiting?.what).toBe("Anoté y sigo");
  expect(journey?.waiting?.until).toBeGreaterThanOrEqual(before + 90_000);
});
const openJourney = { act: "open", target: "mind:notas", input: { goal: "Anotar", kit: [] } };
it("a journey turn cut short by its provider gets a wait to come back instead of staying open forever", async () => {
  const f = fixture();
  const house = await f.open();
  let calls = 0;
  f.respond(() => {
    if (++calls === 1) return { scene: "Abro", consulta: null, acts: [openJourney] };
    throw new Error("provider down");
  });
  const before = Date.now();
  f.wake(house);
  await (await house.minds)?.flush();
  const journey = [...house.tools.state().house.journeys.values()][0];
  const turns = [...house.tools.state().house.minds.turns.values()].filter(turn => turn.opened.process === journey?.id);
  expect(turns.map(turn => turn.closed?.data.outcome)).toEqual(["interrupted"]);
  expect(journey?.closed).toBeUndefined();
  expect(journey?.waiting?.until).toBeGreaterThanOrEqual(before + 90_000);
});
it("a restart that cut a journey turn closes it as interrupted and gives the journey its wait", async () => {
  const f = fixture();
  const first = await f.open();
  let calls = 0;
  f.respond(() =>
    ++calls === 1
      ? { scene: "Abro", consulta: null, acts: [openJourney] }
      : { scene: "Espero", consulta: null, acts: [{ act: "wait", target: "", input: { what: "x", until: 1 } }] },
  );
  f.wake(first);
  await (await first.minds)?.flush();
  const journey = [...first.tools.state().house.journeys.values()][0];
  if (!journey) throw new Error("fixture.journey");
  const cut = first.bus.emit(effect("mind-turn-opened", { turn: "cut", wake: [] }, "mind:notas", [], journey.id));
  first.close();
  const before = Date.now();
  const again = await f.open();
  const state = again.tools.state().house;
  expect(state.minds.turns.get("cut")?.closed?.data.outcome).toBe("interrupted");
  expect(state.journeys.get(journey.id)?.closed).toBeUndefined();
  expect(state.journeys.get(journey.id)?.waiting?.until).toBeGreaterThanOrEqual(before + 90_000);
  const waits = again.journal
    .replay<{ cause: readonly string[] }[]>([], (all, event) =>
      event.layer === "house" && event.kind === "journey-waiting" ? [...all, event] : all,
    )
    .filter(event => event.cause.includes(cut.id));
  expect(waits).toHaveLength(1);
});
