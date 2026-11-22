// The bank composes the catalog offline; opening a house never calls a model.
import { afterEach, expect, it } from "vitest";
import { programMindFixture } from "../../../tests/support/program-mind-fixture.ts";
import { modelAccount } from "../../house/minds/model-call-state.ts";
import { maximumProgramCall, programMindNotices } from "./program-mind-availability.ts";
import { cards } from "../../adapters/models/catalog.ts";
import { effect } from "../../house/facts.ts";
const fixtures: ReturnType<typeof programMindFixture>[] = [];
const fixture = () => {
  const f = programMindFixture();
  fixtures.push(f);
  return f;
};
afterEach(() => fixtures.splice(0).forEach(f => f.cleanup()));
it("picks the cheapest that passes its three scenes and does not try the next", async () => {
  const f = fixture();
  f.respond(request => ({
    scene: request.effort === "high" ? "No alcanza" : "Banco aprobado",
    acts: [],
    consultation: null,
  }));
  const house = await f.open({}, false);
  expect(f.transport).not.toHaveBeenCalled();
  await f.bank(house);
  expect(f.frames.map(frame => frame.effort)).toEqual(["high", "high", "high", "low", "low", "low"]);
  expect(new Set(f.frames.map(frame => frame.model))).toEqual(new Set(["claude-haiku-5-5"]));
  expect(house.tools.state().house.mindAssignments.get("mind:notes")?.version).toBe("low");
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
  await f.bank(house);
  expect(f.transport).toHaveBeenCalledTimes(6);
  house.close();
  const reopened = await f.open();
  expect(f.transport).toHaveBeenCalledTimes(6);
  expect(reopened.tools.state().house.mindAssignments.get("mind:notes")?.version).toBe("low");
});
it("with no card passing the bank it keeps its failed evidence, assigns nothing and says so", async () => {
  const f = fixture();
  f.respond(() => ({ scene: "No alcanza", acts: [], consultation: null }));
  const house = await f.open({ capNanoUsd: 10000000000 }, false);
  const prepared = await f.bank(house, { capNanoUsd: 10000000000 });
  expect(f.transport).toHaveBeenCalledTimes(cards.length * 3);
  expect(house.tools.state().house.mindAssignments.has("mind:notes")).toBe(false);
  expect(programMindNotices(prepared).join(" ")).toContain("carta");
  expect(house.tools.state().house.scenes.get("mind:notes")?.data.general).toContain("carta");
  await f.bank(house, { capNanoUsd: 10000000000 });
  expect(f.transport).toHaveBeenCalledTimes(cards.length * 3);
});
it("opening the house calls no model: it assigns the declared card once and respects the admin's", async () => {
  const f = fixture();
  const house = await f.open();
  expect(f.transport).not.toHaveBeenCalled();
  expect(house.tools.state().house.mindCards.get("mind:notes")).toHaveLength(cards.length);
  expect(house.tools.state().house.mindAssignments.get("mind:notes")).toMatchObject({
    card: "claude-haiku-5-5",
    version: "low",
  });
  expect(house.mindNotices?.()).toEqual([]);
  house.bus.emit(effect("attended", { target: "notes" }, "ana"));
  const choice = JSON.stringify(["claude-sonnet-5-5", "medium"]);
  const chosen = house.tools.act({ act: "assign-mind-card", target: "notes", input: { card: choice } }, 0, "ana");
  expect(chosen.status).toBe("accepted");
  await (await house.minds)?.flush();
  expect(f.frames.map(frame => frame.model)).toEqual(["claude-sonnet-5-5"]);
  house.close();
  const reopened = await f.open();
  expect(reopened.tools.state().house.mindAssignments.get("mind:notes")).toMatchObject({
    card: "claude-sonnet-5-5",
    version: "medium",
  });
  const assigned = reopened.journal.replay(0, (count, event) => count + Number(event.kind === "mind-card-assigned"));
  expect(assigned).toBe(2);
  expect(reopened.journal.replay(0, (count, event) => count + Number(event.kind === "mind-bank-tested"))).toBe(0);
  expect(f.transport).toHaveBeenCalledOnce();
  f.wake(reopened);
  await (await reopened.minds)?.flush();
  expect(f.frames.map(frame => frame.model)).toEqual(["claude-sonnet-5-5", "claude-sonnet-5-5"]);
});
it("with no declared or chosen card the house opens, calls no model and says the card is missing", async () => {
  const f = fixture();
  const house = await f.open({ cards: {} });
  expect(house.tools.state().house.mindAssignments.has("mind:notes")).toBe(false);
  expect(house.mindNotices?.().join(" ")).toContain("carta");
  f.wake(house);
  await (await house.minds)?.flush();
  expect(f.transport).not.toHaveBeenCalled();
});
it("thinking's spending survives closing, reopening and recomputing", async () => {
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
  expect(reopened.tools.state().house.scenes.get("mind:notes")?.data.general).toContain("saldo");
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

it("the bank opens journeys and checks real work without writing notes in the live house", async () => {
  const f = programMindFixture({
    given: [],
    kit: [{ tool: "notes", acts: ["personal/add"] }],
    when: { act: "personal/add", target: "notes/personal", input: {} },
    check: events => events.filter(event => event.layer === "program" && event.by === "mind:notes").length === 1,
  });
  fixtures.push(f);
  f.respond(request => {
    const journey = request.changing.match(/^Alcance:\nmind:notes \/ (journey:[a-f0-9-]+)/)?.[1];
    if (journey)
      return {
        scene: "Banco aprobado",
        consultation: null,
        acts: [
          { act: "personal/add", target: "notes/personal", input: {} },
          { act: "end", target: journey, input: { summary: "Terminé", references: [] } },
        ],
      };
    return {
      scene: "Banco aprobado",
      consultation: null,
      acts: request.changing.includes("Escena:\nBanco aprobado")
        ? []
        : [
            {
              act: "open",
              target: "mind:notes",
              input: { goal: "Anotar", kit: [{ tool: "notes", acts: ["personal/add"] }] },
            },
          ],
    };
  });
  const house = await f.open({}, false);
  await f.bank(house);
  expect(f.transport).toHaveBeenCalledTimes(9);
  expect(house.tools.state().tools.notes.count).toBe(0);
  expect(house.tools.state().house.journeys.size).toBe(0);
  expect(house.tools.state().house.modelCalls.size).toBe(9);
  expect(house.tools.state().house.mindAssignments.has("mind:notes")).toBe(true);
});
