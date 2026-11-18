// El turno real aplica reglas a la apertura y al trabajo de journeys usando solo transporte sintético.
import { afterEach, expect, it } from "vitest";
import { programMindFixture } from "../../../tests/support/program-mind-fixture.ts";
import { selectionKit } from "../../house/kit-selection.ts";
import { effect } from "../../house/facts.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
const fixtures: ReturnType<typeof programMindFixture>[] = [];
const fixture = () => {
  const f = programMindFixture();
  fixtures.push(f);
  return f;
};
afterEach(() => fixtures.splice(0).forEach(f => f.cleanup()));
it("frena abrir un journey por el control común", async () => {
  const f = fixture();
  const house = await f.open();
  house.tools.act({ act: "attend", input: { target: "rules" } }, 0, "ana");
  const saved = await settle(
    house.tools.act(
      {
        act: "save",
        target: "rules",
        input: {
          id: "open",
          text: "Pausa de journeys",
          action: { tool: "journey", act: "open" },
          condition: { operator: "actor", kind: "program" },
          effect: "frena",
        },
      },
      0,
      "ana",
    ),
  );
  expect(saved.status).toBe("accepted");
  f.respond(() => ({
    scene: "Abro un trabajo",
    consulta: null,
    acts: [{ act: "open", target: "mind:notas", input: { goal: "Anotar", kit: [] } }],
  }));
  f.wake(house);
  await (await house.minds)?.flush();
  expect(house.tools.state().house.journeys.size).toBe(0);
  expect(
    house.journal.replay<boolean>(
      false,
      (found, event) =>
        found ||
        (event.kind === "rule-evaluated" &&
          event.data.action.tool === "journey" &&
          event.data.results[0]?.outcome === "frena"),
    ),
  ).toBe(true);
});
it("un journey queda frenado; cambiar la regla lo despierta sin repetir la acción", async () => {
  const f = fixture();
  const house = await f.open();
  house.bus.emit(
    effect(
      "kit-set",
      { version: 2, holder: "mind:notas", kit: selectionKit([{ kind: "tool", program: "notas", tool: "personal" }]) },
      "ana",
    ),
  );
  house.tools.act({ act: "attend", input: { target: "rules" } }, 0, "ana");
  const definition = {
    id: "notes",
    text: "Pausa del trabajo",
    action: { tool: "notas", act: "personal/add" },
    condition: { operator: "actor", kind: "program" },
    effect: "frena",
  };
  expect((await settle(house.tools.act({ act: "save", target: "rules", input: definition }, 0, "ana"))).status).toBe(
    "accepted",
  );
  let calls = 0;
  f.respond(() => {
    calls++;
    return {
      scene: "Trabajo pendiente",
      consulta: null,
      acts:
        calls === 1
          ? [
              {
                act: "open",
                target: "mind:notas",
                input: { goal: "Anotar", kit: [{ tool: "notas", acts: ["personal/add"] }] },
              },
            ]
          : [{ act: "personal/add", target: "notas/personal", input: {} }],
    };
  });
  f.wake(house);
  await (await house.minds)?.flush();
  expect(calls).toBe(2);
  expect(house.tools.state().tools.notas.count).toBe(1);
  expect(
    house.journal.replay<boolean>(
      false,
      (found, event) =>
        found ||
        (event.kind === "rule-evaluated" &&
          event.process?.startsWith("journey:") === true &&
          event.data.results[0]?.outcome === "frena"),
    ),
  ).toBe(true);
  f.respond(() => {
    calls++;
    return { scene: "Vi el cambio; decido después", consulta: null, acts: [] };
  });
  const change = { ...definition, condition: { operator: "actor", kind: "identity" } };
  await settle(house.tools.act({ act: "save", target: "rules", input: change }, 0, "ana"));
  await (await house.minds)?.flush();
  expect(calls).toBe(3);
  expect(house.tools.state().tools.notas.count).toBe(1);
});
it("una mente tampoco saltea el control al escribir una escena", async () => {
  const f = fixture();
  const house = await f.open();
  house.tools.act({ act: "attend", input: { target: "rules" } }, 0, "ana");
  const saved = await settle(
    house.tools.act(
      {
        act: "save",
        target: "rules",
        input: {
          id: "scene",
          text: "Pausa de escenas",
          action: { tool: "mind", act: "scene" },
          condition: { operator: "actor", kind: "program" },
          effect: "frena",
        },
      },
      0,
      "ana",
    ),
  );
  expect(saved.status).toBe("accepted");
  f.respond(() => ({
    scene: "Pienso",
    consulta: null,
    acts: [{ act: "scene", target: "mind:notas", input: { general: "Escena que no debe publicarse" } }],
  }));
  f.wake(house);
  await (await house.minds)?.flush();
  expect(
    house.journal.replay<boolean>(
      false,
      (found, event) =>
        found ||
        (event.kind === "rule-evaluated" &&
          event.data.action.tool === "mind" &&
          event.data.results[0]?.outcome === "frena"),
    ),
  ).toBe(true);
  expect(
    house.journal.replay<boolean>(
      false,
      (found, event) => found || (event.kind === "scene" && event.data.general === "Escena que no debe publicarse"),
    ),
  ).toBe(false);
});
