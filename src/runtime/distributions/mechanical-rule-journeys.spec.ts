// The real turn applies rules to opening and working journeys, using only synthetic transport.
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
it("holds opening a journey through the common control", async () => {
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
          effect: "block",
        },
      },
      0,
      "ana",
    ),
  );
  expect(saved.status).toBe("accepted");
  f.respond(() => ({
    scene: "Abro un trabajo",
    consultation: null,
    acts: [{ act: "open", target: "mind:notes", input: { goal: "Anotar", kit: [] } }],
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
          event.data.results[0]?.outcome === "block"),
    ),
  ).toBe(true);
});
it("a journey is held; changing the rule wakes it without repeating the action", async () => {
  const f = fixture();
  const house = await f.open();
  house.bus.emit(
    effect(
      "kit-set",
      { version: 2, holder: "mind:notes", kit: selectionKit([{ kind: "tool", program: "notes", tool: "personal" }]) },
      "ana",
    ),
  );
  house.tools.act({ act: "attend", input: { target: "rules" } }, 0, "ana");
  const definition = {
    id: "notes",
    text: "Pausa del trabajo",
    action: { tool: "notes", act: "personal/add" },
    condition: { operator: "actor", kind: "program" },
    effect: "block",
  };
  expect((await settle(house.tools.act({ act: "save", target: "rules", input: definition }, 0, "ana"))).status).toBe(
    "accepted",
  );
  let calls = 0;
  const journeyTurn = () =>
    [...house.tools.state().house.minds.turns.values()].find(turn => !turn.closed)?.opened.process;
  f.respond(() => {
    calls++;
    const open = {
      act: "open",
      target: "mind:notes",
      input: { goal: "Anotar", kit: [{ tool: "notes", acts: ["personal/add"] }] },
    };
    const opening = calls === 1 ? [open] : [];
    const acts = journeyTurn() ? [{ act: "personal/add", target: "notes/personal", input: {} }] : opening;
    return { scene: "Trabajo pendiente", consultation: null, acts };
  });
  f.wake(house);
  await (await house.minds)?.flush();
  // The rule stops the journey's act and its turn fails; its consciousness wakes once to hear it, and nothing retries.
  expect(calls).toBe(3);
  expect(house.tools.state().tools.notes.count).toBe(1);
  expect(
    house.journal.replay<boolean>(
      false,
      (found, event) =>
        found ||
        (event.kind === "rule-evaluated" &&
          event.process?.startsWith("journey:") === true &&
          event.data.results[0]?.outcome === "block"),
    ),
  ).toBe(true);
  f.respond(() => {
    calls++;
    const journey = journeyTurn() ?? "";
    const until = Date.now() + 3_600_000;
    const wait = { act: "wait", target: journey, input: { what: "Vi el cambio; decido después", until } };
    return { scene: "Vi el cambio; decido después", consultation: null, acts: [wait] };
  });
  const change = { ...definition, condition: { operator: "actor", kind: "identity" } };
  await settle(house.tools.act({ act: "save", target: "rules", input: change }, 0, "ana"));
  await (await house.minds)?.flush();
  expect(calls).toBe(4);
  expect(house.tools.state().tools.notes.count).toBe(1);
});
it("a mind does not skip the control when writing a scene either", async () => {
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
          effect: "block",
        },
      },
      0,
      "ana",
    ),
  );
  expect(saved.status).toBe("accepted");
  f.respond(() => ({
    scene: "Pienso",
    consultation: null,
    acts: [{ act: "scene", target: "mind:notes", input: { general: "Escena que no debe publicarse" } }],
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
          event.data.results[0]?.outcome === "block"),
    ),
  ).toBe(true);
  expect(
    house.journal.replay<boolean>(
      false,
      (found, event) => found || (event.kind === "scene" && event.data.general === "Escena que no debe publicarse"),
    ),
  ).toBe(false);
});
