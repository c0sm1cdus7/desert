// Proves native requests, concurrent work, causal replies and restart recovery without a real provider.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { effect } from "../../house/facts.ts";
import {
  requestMindFixture,
  answer,
  send,
  history,
  type RequestHouse,
} from "../../../tests/support/request-mind-fixture.ts";
import { currentTurn, respondToNotes, causalRequest } from "../../../tests/support/request-mind-responder.ts";
const fixtures: ReturnType<typeof requestMindFixture>[] = [];
const fixture = () => {
  const f = requestMindFixture();
  fixtures.push(f);
  return f;
};
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
const note = "Mañana tomamos mate con Martín";
it("a person requests work and a text-field journey performs exactly the granted action", async () => {
  const f = fixture();
  const house = await f.open();
  f.prepare(house);
  f.respond(() => respondToNotes(house));
  expect(send(house, "mind:notes", note).status).toBe("accepted");
  await (await house.minds)?.flush();
  expect(house.tools.state().tools.notes.notes).toEqual([note]);
  const journeys = [...house.tools.state().house.journeys.values()];
  expect(journeys).toHaveLength(1);
  expect(journeys[0]?.closed?.data.outcome).toBe("done");
  expect(journeys[0]?.selections?.selections).toEqual([
    { kind: "action", program: "notes", tool: "personal", action: "add" },
  ]);
  const acts = history(house).filter(e => e.layer === "house" && e.kind === "act" && e.by === "mind:notes");
  expect(acts).toHaveLength(1);
  expect(acts[0]).toMatchObject({ process: journeys[0]?.id, data: { option: "personal/add", input: { body: note } } });
  expect(house.tools.state().house.minds.messages.at(-1)).toMatchObject({
    by: "mind:notes",
    data: { to: "ana", text: note },
  });
  expect([...house.tools.state().house.minds.turns.values()].every(t => t.closed?.data.outcome === "done")).toBe(true);
});
it("two requests arriving during one response retain separate work and replies", async () => {
  const f = fixture();
  const house = await f.open();
  f.prepare(house);
  let release = () => {};
  const waiting = new Promise<void>(resolve => {
    release = resolve;
  });
  let first = true;
  f.respond(async () => {
    const response = respondToNotes(house);
    if (first) {
      first = false;
      await waiting;
    }
    return response;
  });
  const before = f.transport.mock.calls.length;
  expect(send(house, "mind:notes", note).status).toBe("accepted");
  await vi.waitFor(() => expect(f.transport).toHaveBeenCalledTimes(before + 1));
  expect(send(house, "mind:notes", "Return the books").status).toBe("accepted");
  release();
  await (await house.minds)?.flush();
  expect(house.tools.state().tools.notes.notes).toEqual([note, "Return the books"]);
  expect(house.tools.state().house.journeys.size).toBe(2);
  expect(
    house.tools
      .state()
      .house.minds.messages.filter(e => e.by === "mind:notes")
      .map(e => e.data.text),
  ).toEqual([note, "Return the books"]);
  const requested = history(house).filter(e => e.kind === "mind-requested");
  const turns = [...house.tools.state().house.minds.turns.values()];
  requested.forEach(request => expect(turns.filter(t => t.opened.data.wake.includes(request.id))).toHaveLength(1));
});
function assistantResponse(house: RequestHouse) {
  const turn = currentTurn(house);
  if (turn.by === "mind:notes") return respondToNotes(house);
  const wake = history(house).filter(e => turn.data.wake.includes(e.id));
  if (!turn.process)
    return answer(
      wake.some(e => e.kind === "journey-closed")
        ? []
        : [{ act: "open", target: "assistant:ana", input: { goal: note, kit: [] } }],
    );
  const reply = wake.find(e => e.kind === "mind-message" && e.by === "mind:notes");
  return answer(
    reply
      ? [{ act: "end", target: turn.process, input: { summary: "Received", references: [reply.id] } }]
      : [
          { act: "message", target: "assistant:ana", input: { to: "mind:notes", text: note } },
          { act: "wait", target: turn.process, input: { what: "Notes reply", until: Date.now() + 60000 } },
        ],
  );
}
it.each([false, true])("an assistant receives its journey reply, restart=%s", async restart => {
  const f = fixture();
  const house = await f.open();
  f.prepare(house);
  const minds = await house.minds;
  f.respond(() => assistantResponse(house));
  let stopped = false;
  const off = house.bus.on(event => {
    if (restart && event.kind === "mind-message" && event.by === "mind:notes") {
      stopped = true;
      minds?.close();
    }
  });
  expect(send(house, "assistant:ana", "Please remember the meeting").status).toBe("accepted");
  await minds?.flush();
  off();
  const request = house.tools.state().house.minds.messages.find(e => e.by === "assistant:ana");
  const reply = house.tools.state().house.minds.messages.find(e => e.by === "mind:notes");
  expect(request?.process).toBeTruthy();
  expect(reply).toBeDefined();
  if (!request || !reply) throw new Error("exchange");
  expect(causalRequest(history(house), reply.cause).id).toBe(request.id);
  let finished = house;
  if (restart) {
    expect(stopped).toBe(true);
    expect(house.tools.state().house.journeys.get(request.process ?? "")?.closed).toBeUndefined();
    house.close();
    f.respond(frame => {
      expect(frame).toContain("assistant:ana");
      if (frame.startsWith(`Alcance:\nassistant:ana / ${request.process}`)) {
        expect(frame).toContain(reply.id);
        expect(frame).toContain(note);
        return answer([
          { act: "end", target: request.process ?? "", input: { summary: "Received", references: [reply.id] } },
        ]);
      }
      return answer();
    });
    finished = await f.open();
  }
  const resumed = [...finished.tools.state().house.minds.turns.values()].filter(t =>
    t.opened.data.wake.includes(reply.id),
  );
  expect(resumed).toHaveLength(1);
  expect(resumed[0]?.opened).toMatchObject({ by: "assistant:ana", process: request.process });
  expect(resumed[0]?.closed?.data.outcome).toBe("done");
  expect(finished.tools.state().house.journeys.get(request.process ?? "")?.closed?.data.outcome).toBe("done");
  expect(finished.tools.state().tools.notes.notes).toEqual([note]);
  const calls = f.transport.mock.calls.length;
  finished.close();
  await f.open();
  expect(f.transport).toHaveBeenCalledTimes(calls);
});
it("own messages and external or migrated content do not schedule work, including after restart", async () => {
  const f = fixture();
  const house = await f.open();
  f.prepare(house);
  const calls = f.transport.mock.calls.length;
  house.bus.emit(effect("mind-turn-opened", { turn: "own", wake: [] }, "mind:notes"));
  house.bus.emit(effect("mind-message", { turn: "own", to: "mind:notes", text: note }, "mind:notes"));
  house.bus.emit(effect("mind-turn-closed", { turn: "own", outcome: "done", calls: 0, applied: [] }, "mind:notes"));
  for (const by of ["external", "migration"]) {
    const imported = house.bus.emit({
      layer: "program",
      kind: "notes/imported",
      data: { body: `mind:notes ${note}` },
      by,
      cause: [],
    });
    house.bus.emit(effect("mind-turn-opened", { turn: by, wake: [] }, `mind:${by}`));
    house.bus.emit(effect("mind-message", { turn: by, to: "mind:notes", text: note }, `mind:${by}`, [imported.id]));
    house.bus.emit(effect("mind-turn-closed", { turn: by, outcome: "done", calls: 0, applied: [] }, `mind:${by}`));
  }
  await (await house.minds)?.flush();
  expect(house.tools.state().house.journeys.size).toBe(0);
  expect(f.transport).toHaveBeenCalledTimes(calls);
  house.close();
  await f.open();
  expect(f.transport).toHaveBeenCalledTimes(calls);
});
it("rejects an unknown recipient and malformed message through the ordinary action engine", async () => {
  const f = fixture();
  const house = await f.open();
  expect(send(house, "mind:missing", note).status).toBe("rejected");
  expect(send(house, "mind:notes", " ").status).toBe("rejected");
  expect(house.tools.state().house.minds.messages).toEqual([]);
});
it("two assistant journeys receive only their own explicitly correlated reply", async () => {
  const f = fixture();
  const house = await f.open();
  f.prepare(house);
  const goals = [note, "Return the books"];
  f.respond(() => {
    const turn = currentTurn(house);
    if (turn.by === "mind:notes") return respondToNotes(house);
    if (!turn.process)
      return answer(
        turn.data.wake.some(id => history(house).some(e => e.id === id && e.kind === "mind-requested"))
          ? goals.map(goal => ({ act: "open", target: "assistant:ana", input: { goal, kit: [] } }))
          : [],
      );
    const journey = house.tools.state().house.journeys.get(turn.process);
    if (!journey) throw new Error("journey");
    const reply = house.tools
      .state()
      .house.minds.messages.find(e => turn.data.wake.includes(e.id) && e.by === "mind:notes");
    if (reply) {
      expect(reply.data.text).toBe(journey.goal);
      return answer([{ act: "end", target: journey.id, input: { summary: journey.goal, references: [reply.id] } }]);
    }
    return answer([
      { act: "message", target: "assistant:ana", input: { to: "mind:notes", text: journey.goal } },
      { act: "wait", target: journey.id, input: { what: "Reply", until: Date.now() + 60000 } },
    ]);
  });
  expect(send(house, "assistant:ana", "Remember both").status).toBe("accepted");
  await (await house.minds)?.flush();
  expect(house.tools.state().tools.notes.notes).toEqual(goals);
  const requests = house.tools.state().house.minds.messages.filter(e => e.by === "assistant:ana");
  expect(new Set(requests.map(e => e.process)).size).toBe(2);
  for (const request of requests) {
    const reply = house.tools.state().house.minds.messages.find(e => e.cause.includes(request.id));
    expect(reply).toBeDefined();
    const turns = [...house.tools.state().house.minds.turns.values()].filter(t =>
      t.opened.data.wake.includes(reply?.id ?? ""),
    );
    expect(turns).toHaveLength(1);
    expect(turns[0]?.opened.process).toBe(request.process);
    expect(house.tools.state().house.journeys.get(request.process ?? "")?.closed?.data.outcome).toBe("done");
  }
}, 30000);
