import { afterEach, expect, it } from "vitest";
import { programMindFixture } from "../../../tests/support/program-mind-fixture.ts";
import { selectionKit } from "../../house/kit-selection.ts";
import { effect } from "../../house/facts.ts";
import {
  addAct,
  journeyOf,
  messagesOf,
  openAct,
  script,
  turnsOf,
  waitAct,
} from "../../../tests/support/journey-turn-script.ts";
const fixtures: ReturnType<typeof programMindFixture>[] = [];
const fixture = () => {
  const f = programMindFixture();
  fixtures.push(f);
  return f;
};
afterEach(() => fixtures.splice(0).forEach(f => f.cleanup()));
it("two programs: only Notes thinks, writes its scene, and a journey acts with the given kit", async () => {
  const f = fixture();
  const house = await f.open();
  expect(f.distribution.mindDefinitions.map(mind => mind.actor)).toEqual(["mind:notes"]);
  expect(house.tools.state().house.mindAssignments.has("mind:agenda")).toBe(false);
  house.bus.emit(
    effect(
      "kit-set",
      { version: 2, holder: "mind:notes", kit: selectionKit([{ kind: "tool", program: "notes", tool: "personal" }]) },
      "ana",
    ),
  );
  let calls = 0;
  f.respond(() => {
    calls++;
    if (calls === 1)
      return {
        scene: "Voy a anotar",
        consultation: null,
        acts: [
          {
            act: "open",
            target: "mind:notes",
            input: { goal: "Anotar", kit: [{ tool: "notes", acts: ["personal/add"] }] },
          },
        ],
      };
    const journey = [...house.tools.state().house.journeys.keys()][0];
    if (!journey) throw new Error("journey");
    if (calls === 2)
      return {
        scene: "Anoté",
        consultation: null,
        acts: [
          { act: "personal/add", target: "notes/personal", input: {} },
          { act: "end", target: journey, input: { summary: "Terminé", references: [] } },
        ],
      };
    return {
      scene: "Terminé",
      consultation: null,
      acts: [
        {
          act: "scene",
          target: "mind:notes",
          input: { general: "La nota está lista", to: { ana: "Ana, revisá la nota." } },
        },
      ],
    };
  });
  f.wake(house);
  await (await house.minds)?.flush();
  expect(calls).toBe(3);
  expect(house.tools.state().tools.notes.count).toBe(2);
  expect([...house.tools.state().house.journeys.values()][0]?.closed?.data.outcome).toBe("done");
  expect([...house.tools.state().house.minds.turns.values()].every(turn => turn.opened.by === "mind:notes")).toBe(true);
  expect(house.tools.state().house.scenes.get("mind:notes")?.data).toEqual({
    general: "La nota está lista",
    to: { ana: "Ana, revisá la nota." },
  });
  const authors = house.journal.replay<string[]>([], (authors, event) =>
    event.layer === "program" ? [...authors, event.by] : authors,
  );
  expect(authors).toEqual(["ana", "mind:notes"]);
});
it("a journey without a kit does not run an action even if the transport proposes it", async () => {
  const f = fixture();
  const house = await f.open();
  let calls = 0;
  f.respond(() => {
    calls++;
    const process = [...house.tools.state().house.minds.turns.values()].find(turn => !turn.closed)?.opened.process;
    const opening = calls === 1 ? [{ act: "open", target: "mind:notes", input: { goal: "Anotar", kit: [] } }] : [];
    const acts = process ? [{ act: "personal/add", target: "notes/personal", input: {} }] : opening;
    return { scene: "Intento anotar", consultation: null, acts };
  });
  f.wake(house);
  await (await house.minds)?.flush();
  // The journey's answer is corrected until the twelve calls run out (21/11); its consciousness wakes once to hear it.
  expect(calls).toBe(14);
  expect(house.tools.state().tools.notes.count).toBe(1);
  const journey = [...house.tools.state().house.journeys.values()][0];
  const turns = [...house.tools.state().house.minds.turns.values()];
  expect(turns.find(turn => turn.opened.process === journey?.id)?.closed?.data).toMatchObject({
    outcome: "failed",
    reason: "call-limit",
  });
  expect(turns.at(-1)?.opened.process).toBeUndefined();
  expect(journey?.selections?.selections).toEqual([]);
});
it("opens with a mind a house created without thinking and keeps its notes", async () => {
  const f = fixture();
  const first = await f.open({}, false);
  f.wake(first);
  expect(first.tools.state().tools.notes.count).toBe(1);
  expect(f.transport).not.toHaveBeenCalled();
  first.close();
  const second = await f.open();
  expect(second.tools.state().tools.notes.count).toBe(1);
  expect(second.tools.state().house.mindAssignments.has("mind:notes")).toBe(true);
  expect(second.tools.state().house.scenes.get("mind:notes")?.data.general).toBe("Banco aprobado");
  expect(f.transport).toHaveBeenCalledOnce();
});
it("the consciousness has no native message: it talks via programs; a proposed message leaves no facts", async () => {
  const f = fixture();
  expect(f.distribution.mindDefinitions[0]?.communication).toEqual([{ tool: "mind", act: "scene" }]);
  const house = await f.open();
  f.respond(() => ({
    scene: "Le avisé a Ana",
    consultation: null,
    acts: [{ act: "message", target: "mind:notes", input: { to: "ana", text: "Revisá la nota." } }],
  }));
  f.wake(house);
  await (await house.minds)?.flush();
  const kinds = house.journal.replay<string[]>([], (kinds, event) => [...kinds, event.kind]);
  expect(kinds).not.toContain("mind-message");
  expect(kinds).toContain("mind-turn-closed");
  expect(house.tools.state().tools.notes.count).toBe(1);
});
it("a journey kit outside the mind's kit comes back as a correction with that kit, then it opens", async () => {
  const f = fixture();
  const house = await f.open();
  house.bus.emit(
    effect(
      "kit-set",
      { version: 2, holder: "mind:notes", kit: selectionKit([{ kind: "tool", program: "notes", tool: "personal" }]) },
      "ana",
    ),
  );
  const frames: string[] = [];
  let calls = 0;
  f.respond(request => {
    calls++;
    frames.push(request.body);
    const kit =
      calls === 1 ? [{ tool: "notes/personal", acts: ["personal/add"] }] : [{ tool: "notes", acts: ["personal/add"] }];
    return calls <= 2
      ? {
          scene: "Abro",
          consultation: null,
          acts: [{ act: "open", target: "mind:notes", input: { goal: "Anotar", kit } }],
        }
      : { scene: "Listo", consultation: null, acts: [] };
  });
  f.wake(house);
  await (await house.minds)?.flush();
  const turns = [...house.tools.state().house.minds.turns.values()];
  expect(turns[0]?.closed?.data.outcome).toBe("done");
  expect(turns[0]?.invalid.map(event => event.data.faults)).toEqual([[{ code: "kit", path: "/acts" }]]);
  expect(frames[1]).toContain("notes: personal/add");
  expect(house.tools.state().house.journeys.size).toBe(1);
});
it("a journey answer without a continuation goes on in its turn, sees its results and keeps the frame", async () => {
  const f = fixture();
  const house = await f.open();
  const seen = script(f, house, {
    consciousness: ({ call }) => (call === 1 ? [openAct] : []),
    journey: ({ call, journey }) => (call === 1 ? [addAct] : [waitAct(journey ?? "")]),
  });
  f.wake(house);
  await (await house.minds)?.flush();
  const journey = journeyOf(house);
  const calls = seen.filter(each => each.journey === journey?.id);
  expect(calls).toHaveLength(2);
  expect(turnsOf(house, journey?.id).map(turn => [turn.closed?.data.outcome, turn.closed?.data.calls])).toEqual([
    ["done", 2],
  ]);
  expect(journey?.waiting?.what).toBe("Espero");
  const [first, second] = calls.map(messagesOf);
  // The second call repeats the first byte for byte and appends the answer and what the acts did.
  expect(second?.slice(0, first?.length)).toEqual(first);
  expect(second?.slice(first?.length).map(message => message.role)).toEqual(["assistant", "user"]);
  expect(second?.at(-1)?.content).toContain("1. personal/add → notes/personal: aceptado. Anotada");
  expect(second?.at(-1)?.content).toContain("Ahora:");
  expect(JSON.parse(calls[1]?.body ?? "{}")).toMatchObject({ cache_control: { type: "ephemeral" } });
});
it("a provider cut wakes the consciousness once, says why in words, and retries nothing", async () => {
  const f = fixture();
  const house = await f.open();
  const seen = script(f, house, {
    consciousness: ({ call }) => (call === 1 ? [openAct] : []),
    journey: () => {
      throw new Error("provider down");
    },
  });
  f.wake(house);
  await (await house.minds)?.flush();
  const journey = journeyOf(house);
  expect(turnsOf(house, journey?.id).map(turn => turn.closed?.data)).toMatchObject([
    { outcome: "interrupted", reason: "uncertain" },
  ]);
  expect(journey?.closed).toBeUndefined();
  expect(journey?.waiting).toBeUndefined();
  const woke = seen.filter(each => !each.journey);
  expect(woke).toHaveLength(2);
  expect(woke[1]?.changing).toContain("Se cortó un turno del journey «Anotar»: La llamada quedó incierta.");
  const scenes = house.journal.replay<string[]>([], (all, event) =>
    event.layer === "house" && event.kind === "scene" ? [...all, event.data.general] : all,
  );
  expect(scenes.some(text => text.startsWith("Se cortó un turno del journey «Anotar»"))).toBe(true);
});
it("a restart wakes the journey through its interrupted closure, with no wait of its own", async () => {
  const f = fixture();
  const first = await f.open();
  script(f, first, {
    consciousness: ({ call }) => (call === 1 ? [openAct] : []),
    journey: ({ journey }) => [waitAct(journey ?? "")],
  });
  f.wake(first);
  await (await first.minds)?.flush();
  const journey = journeyOf(first);
  if (!journey) throw new Error("fixture.journey");
  const cut = first.bus.emit(effect("mind-turn-opened", { turn: "cut", wake: [] }, "mind:notes", [], journey.id));
  first.close();
  const again = await f.open();
  const state = again.tools.state().house;
  expect(state.minds.turns.get("cut")?.closed?.data).toMatchObject({ outcome: "interrupted", reason: "interrupted" });
  const closure = state.minds.turns.get("cut")?.closed?.id;
  const next = turnsOf(again, journey.id).at(-1);
  expect(next?.opened.data.wake).toContain(closure);
  expect(next?.closed?.data.outcome).toBe("done");
  const waits = again.journal
    .replay<{ cause: readonly string[] }[]>([], (all, event) =>
      event.layer === "house" && event.kind === "journey-waiting" ? [...all, event] : all,
    )
    .filter(event => event.cause.includes(cut.id));
  expect(waits).toHaveLength(0);
});
