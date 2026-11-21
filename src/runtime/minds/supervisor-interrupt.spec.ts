// The supervisor interrupts a journey with a reason: the journey is frozen (its wait does not wake it, its acts are
// refused), its consciousness wakes once with the reason and resumes it, seeing the reason, or desists.
import { setTimeout as sleep } from "node:timers/promises";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { effect } from "../../house/facts.ts";
import { explicitKit } from "../../house/kit-selection.ts";
import { journeyFrozen } from "../../house/minds/journey-state.ts";
import { answer, history, send, type RequestHouse } from "../../../tests/support/request-mind-fixture.ts";
import { currentTurn, lineOf } from "../../../tests/support/request-mind-responder.ts";
import {
  add,
  end,
  framesOf,
  request,
  supervisedFixture,
  supervising,
  supervisor,
} from "../../../tests/support/supervisor-responder.ts";
import { withSend } from "../../../tests/support/supervisor-responder.ts";
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
const reason = "No mandes nada sin el visto de Franco";
const journeyOf = (house: RequestHouse) => [...house.tools.state().house.journeys.values()][0];
const woke = (house: RequestHouse, kind: string) => {
  const turn = currentTurn(house);
  return history(house).some(event => turn.data.wake.includes(event.id) && event.kind === kind);
};
/** The notes mind opens a journey that waits; on the stop its consciousness resumes it or desists from it. */
function script(house: RequestHouse, after: "resume" | "desist", seen: string[]) {
  let stopped = false;
  return (frame: string) => {
    if (supervising(frame)) {
      if (request(frame)) return { outcome: "passed", text: "Sí" };
      const target = journeyOf(house)?.id ?? "";
      const stop = { act: "interrupt", target, input: { reason } };
      const acts = woke(house, "talk/said") && !stopped ? [stop, stop] : [];
      stopped ||= acts.length > 0;
      return { scene: "Frené el journey de notas", consulta: null, acts };
    }
    seen.push(frame);
    const turn = currentTurn(house);
    const journey = journeyOf(house);
    if (turn.process) {
      if (woke(house, "journey-resumed")) return answer([add("Mate"), end(turn.process)]);
      return answer([{ act: "wait", target: turn.process, input: { what: "El visto", until: Date.now() + 300 } }]);
    }
    if (woke(house, "journey-interrupted") && journey) {
      const act =
        after === "resume"
          ? { act: "resume", target: journey.id, input: { note: "Ya tengo el visto de Franco" } }
          : { act: "desist", target: journey.id, input: { reason: "Sin visto no sigo", references: [] } };
      return answer([act]);
    }
    const heard = history(house).filter(
      event => turn.data.wake.includes(event.id) && lineOf(event)?.to === "mind:notes",
    );
    const kit = [{ tool: "notes", acts: ["personal/add", "outbox/send"] }];
    return answer(heard.length ? [{ act: "open", target: "mind:notes", input: { goal: "Mate el jueves", kit } }] : []);
  };
}
it.each(["resume", "desist"] as const)(
  "an interrupted journey is frozen and its consciousness %ss it",
  async after => {
    const f = supervisedFixture();
    fixtures.push(f);
    const house = await f.open();
    withSend(house);
    const seen: string[] = [];
    f.respond(script(house, after, seen));
    expect(send(house, "mind:notes", "Anotá el mate").status).toBe("accepted");
    await (await house.minds)?.flush();
    const journey = journeyOf(house);
    expect(journey?.waiting?.what).toBe("El visto");
    expect(send(house, "mind:supervisor", "Frená el journey de notas").status).toBe("accepted");
    await (await house.minds)?.flush();
    // Two stops in one answer: the second is refused with words, as a correction the supervisor hears.
    const stops = history(house).filter(event => event.kind === "journey-interrupted");
    expect(stops).toHaveLength(1);
    expect(stops[0]).toMatchObject({ by: "mind:supervisor", process: journey?.id, data: { reason } });
    const own = [...house.tools.state().house.minds.turns.values()].filter(
      turn => turn.opened.by === "mind:supervisor",
    );
    expect(own.flatMap(turn => turn.invalid.map(event => event.data.faults))).toEqual([
      [{ code: "stopped", path: "/acts" }],
    ]);
    expect(
      framesOf(f).some(frame => frame.includes("Ese journey ya está frenado y su consciencia todavía no lo retomó")),
    ).toBe(true);
    // The owner consciousness woke once, with the goal, the reason and what was left pending.
    const told = seen.filter(frame => frame.includes("El supervisor frenó tu journey «Mate el jueves»"));
    expect(told).toHaveLength(1);
    expect(told[0]).toContain(reason);
    expect(told[0]).toContain("Quedó pendiente: nada.");
    const final = journeyOf(house);
    if (after === "desist") {
      expect(final?.closed?.data).toMatchObject({ outcome: "desisted", summary: "Sin visto no sigo" });
      expect(house.tools.state().tools.notes.notes).toEqual([]);
      return;
    }
    expect(final?.closed?.data.outcome).toBe("done");
    expect(final?.interrupted).toEqual({ reason, frozen: false });
    const resumed = seen.filter(frame => frame.includes("Tu consciencia retomó este journey"));
    expect(resumed).toHaveLength(1);
    expect(resumed[0]).toContain(`"interrupted":{"reason":"${reason}","frozen":false}`);
    expect(house.tools.state().tools.notes.notes).toEqual(["Mate"]);
  },
  60000,
);
it("wakes once for a consciousness that fails on the stop of its journey: a stop is no line of its own", async () => {
  const f = supervisedFixture();
  fixtures.push(f);
  const house = await f.open();
  withSend(house);
  const respond = script(house, "resume", []);
  /** The notes consciousness never answers validly to the stop; everything else goes as scripted. */
  const fails = (frame: string) =>
    !supervising(frame) && !currentTurn(house).process && woke(house, "journey-interrupted");
  f.respond(frame => (fails(frame) ? { nothing: "valid" } : respond(frame)));
  expect(send(house, "mind:notes", "Anotá el mate").status).toBe("accepted");
  await (await house.minds)?.flush();
  expect(send(house, "mind:supervisor", "Frená el journey de notas").status).toBe("accepted");
  await (await house.minds)?.flush();
  const closings = history(house).flatMap(event =>
    event.layer === "house" && event.kind === "mind-turn-closed" && !event.process
      ? [`${event.by} ${event.data.outcome}`]
      : [],
  );
  expect(closings).toEqual(["mind:notes done", "mind:supervisor done", "mind:notes failed", "mind:supervisor done"]);
  expect(framesOf(f).filter(supervising).at(-1)).toContain("Falló un turno de la consciencia de mind:notes");
  expect(journeyFrozen(journeyOf(house))).toBe(true);
}, 60000);
/** A supervisor that, in each of its first six own turns, stops every open journey that is not frozen. */
const stopping = (house: RequestHouse) =>
  supervisor(
    () => ({ outcome: "passed", text: "Sí" }),
    (_, turn) =>
      turn > 6
        ? []
        : [...house.tools.state().house.journeys.values()]
            .filter(journey => !journey.closed && !journeyFrozen(journey))
            .map(journey => ({ act: "interrupt", target: journey.id, input: { reason } })),
  );
/** A kit that names the same tool twice: the journey it opens is refused, as a correction. */
const adds = { tool: "notes", acts: ["personal/add"] };
const twice = [adds, { tool: "notes", acts: ["outbox/send"] }];
it.each(["resume", "open"] as const)(
  "wakes once for a consciousness that %ss on the stop and then fails, however often the supervisor would stop again",
  async first => {
    const f = supervisedFixture();
    fixtures.push(f);
    const house = await f.open();
    withSend(house);
    const respond = script(house, "resume", []);
    const judge = stopping(house);
    const answered = new Set<string>();
    /** On a stop the notes consciousness applies `first`, then an act that is refused, and never corrects it. */
    const decide = () => {
      const turn = currentTurn(house);
      if (answered.has(turn.data.turn)) return { nothing: "valid" };
      answered.add(turn.data.turn);
      const frozen = [...house.tools.state().house.journeys.values()].find(journeyFrozen);
      const act =
        first === "resume"
          ? { act: "resume", target: frozen?.id ?? "", input: { note: "Sigo" } }
          : { act: "open", target: "mind:notes", input: { goal: "Otra", kit: [adds] } };
      return answer([act, { act: "open", target: "mind:notes", input: { goal: "Mala", kit: twice } }]);
    };
    const waits = (process: string) =>
      answer([{ act: "wait", target: process, input: { what: "El visto", until: Date.now() + 3_600_000 } }]);
    f.respond(frame => {
      if (supervising(frame)) return judge(frame);
      const turn = currentTurn(house);
      if (turn.process) return waits(turn.process);
      return woke(house, "journey-interrupted") ? decide() : respond(frame);
    });
    expect(send(house, "mind:notes", "Anotá el mate").status).toBe("accepted");
    await (await house.minds)?.flush();
    expect(send(house, "mind:supervisor", "Frená el journey de notas").status).toBe("accepted");
    await (await house.minds)?.flush();
    const closed = history(house).flatMap(event =>
      event.layer === "house" && event.kind === "mind-turn-closed" && !event.process ? [event] : [],
    );
    expect(closed.map(event => `${event.by} ${event.data.outcome}`)).toEqual([
      "mind:notes done",
      "mind:supervisor done",
      "mind:notes failed",
    ]);
    // The failed turn did apply `first` before the refused act.
    expect(closed.at(-1)?.data.applied).toHaveLength(1);
    expect(history(house).filter(event => event.kind === "journey-interrupted")).toHaveLength(1);
  },
  60000,
);
it("while frozen, its wait does not wake it and its acts are refused, until its consciousness decides", async () => {
  const f = supervisedFixture();
  fixtures.push(f);
  const house = await f.open();
  withSend(house);
  const seen: string[] = [];
  const respond = script(house, "resume", seen);
  let decide = false;
  f.respond(frame => {
    if (!supervising(frame) && !decide && woke(house, "journey-interrupted")) return answer();
    return respond(frame);
  });
  send(house, "mind:notes", "Anotá el mate");
  await (await house.minds)?.flush();
  send(house, "mind:supervisor", "Frená el journey de notas");
  await (await house.minds)?.flush();
  const journey = journeyOf(house);
  expect(journeyFrozen(journey)).toBe(true);
  const turns = () => [...house.tools.state().house.minds.turns.values()].filter(t => t.opened.process === journey?.id);
  const before = turns().length;
  await sleep(500);
  await (await house.minds)?.flush();
  expect(turns()).toHaveLength(before);
  const opened = journey?.opened ?? "";
  const refused = house.tools.act(add("Tarde"), house.tools.state().through, "mind:notes", [opened]);
  expect(refused.status).toBe("rejected");
  expect(house.tools.state().tools.notes.notes).toEqual([]);
  expect(journeyOf(house)?.closed).toBeUndefined();
  decide = true;
}, 60000);
it("reads every open journey, a disabled assistant's too", async () => {
  const f = supervisedFixture();
  fixtures.push(f);
  const house = await f.open();
  const opening = { version: 2 as const, goal: "Ordenar la agenda", kit: explicitKit([]) };
  house.bus.emit(effect("journey-opened", opening, "assistant:ana", [], "journey:agenda"));
  house.bus.emit(effect("assistant-disabled", { owner: "ana" }, "ana"));
  const judge = supervisor(() => ({ outcome: "passed", text: "Sí" }));
  f.respond(frame => (supervising(frame) ? judge(frame) : answer()));
  expect(send(house, "mind:supervisor", "Mirá la casa").status).toBe("accepted");
  await (await house.minds)?.flush();
  const frame = framesOf(f).find(supervising) ?? "";
  expect(frame).toMatch(
    /assistant:ana: \{"scene":"[^"]*","journeys":\[\{"id":"journey:agenda","goal":"Ordenar la agenda"/u,
  );
}, 60000);
