// Proves requests and replies through a talk program, concurrent work and restart recovery without a provider.
import { localPorts } from "../house-runtime.ts";
import { localDay } from "../../../tests/support/dated-shop.ts";
import { houseTools } from "../../surface/bridge/assembly/house-tools.ts";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { effect } from "../../house/facts.ts";
import { kitAct } from "../../tools/identities/kit-catalog.ts";
import { identityTarget } from "../../tools/identities/identity-reading.ts";
import { identityTexts } from "../../texts/identities.texts.ts";
import {
  requestMindFixture,
  answer,
  say,
  send,
  history,
  type RequestHouse,
} from "../../../tests/support/request-mind-fixture.ts";
import {
  currentTurn,
  respondToNotes,
  causalRequest,
  lineOf,
  lines,
  mention,
} from "../../../tests/support/request-mind-responder.ts";
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
/** What each model call was shown: the frame of one scope with its menu. */
const frames = (f: ReturnType<typeof fixture>) =>
  f.transport.mock.calls.map(call => {
    const body: unknown = JSON.parse(typeof call[1]?.body === "string" ? call[1].body : "{}");
    return Value.Check(shown, body) ? (body.messages[0]?.content ?? "") : "";
  });
const shown = Type.Object({ messages: Type.Array(Type.Object({ content: Type.String() })) });
const talkMenu = '"tool":"talk","act":"thread/say","target":"talk/thread"';
it("a program mind may hold the talk program besides its own and its consciousness says lines with it", async () => {
  const f = fixture();
  expect(f.distribution.mindDefinitions.find(mind => mind.actor === "mind:notes")?.communication).toEqual([
    { tool: "mind", act: "scene" },
    { tool: "talk", act: "thread/say" },
  ]);
  const house = await f.open();
  const give = (holder: string, program: string) => {
    house.bus.emit(effect("attended", { target: identityTarget(holder) }, "ana"));
    const done = house.tools.act(
      { act: kitAct(program), target: identityTarget(holder), input: { value: "yes" } },
      house.tools.state().through,
      "ana",
    );
    return [done.status, done.status === "rejected" ? done.reason : undefined];
  };
  expect(give("mind:notes", "talk")).toEqual(["accepted", undefined]);
  expect(give("mind:talk", "notes")).toEqual(["rejected", identityTexts.ownActions]);
  const kits = house.tools.state().house.selections;
  expect(kits?.get("mind:notes")?.selections).toEqual([{ kind: "program", program: "talk" }]);
  expect(kits?.has("mind:talk")).toBe(false);
  // The admin reaches the talk program from the mind's own page; a program that is not talk has no page there.
  const core = houseTools(localPorts(house, "ana", { recentLines: 20 }), {
    ...f.distribution.shown,
    day: localDay,
  }).find(tool => tool.id === "identities");
  const opens = core?.view("identities/mind:notes").flatMap(stack => stack.rows.map(row => row.opens));
  expect(opens).toContain("identities/mind:notes#kit:talk");
  expect(core?.view("identities/mind:notes#kit:talk").length).toBeGreaterThan(0);
  expect(() => core?.view("identities/mind:talk#kit:notes")).toThrow();
});
it("a person asks for work through the talk program and the mind answers through it, not natively", async () => {
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
  expect(acts.map(e => [e.layer === "house" && e.kind === "act" ? e.data.option : "", e.process])).toEqual([
    ["personal/add", journeys[0]?.id],
    ["thread/say", undefined],
  ]);
  expect(acts[0]).toMatchObject({ data: { input: { body: note } } });
  expect(lines(house).map(({ by, to, text }) => ({ by, to, text }))).toEqual([
    { by: "ana", to: "mind:notes", text: note },
    { by: "mind:notes", to: "ana", text: note },
  ]);
  expect(history(house).some(e => e.kind === "mind-message" || e.kind === "mind-requested")).toBe(false);
  const consciousness = frames(f).filter(frame => /^Alcance:\nmind:notes \/ \d/u.test(frame));
  const working = frames(f).filter(frame => frame.startsWith("Alcance:\nmind:notes / journey:"));
  expect([consciousness.length, working.length]).toEqual([2, 1]);
  expect(consciousness.every(frame => frame.includes(talkMenu))).toBe(true);
  expect(working.some(frame => frame.includes(talkMenu))).toBe(false);
  expect([...house.tools.state().house.minds.turns.values()].every(t => t.closed?.data.outcome === "done")).toBe(true);
}, 30000);
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
    lines(house)
      .filter(line => line.by === "mind:notes")
      .map(line => line.text),
  ).toEqual([note, "Return the books"]);
  const requested = lines(house).filter(line => line.to === "mind:notes");
  const turns = [...house.tools.state().house.minds.turns.values()];
  expect(requested).toHaveLength(2);
  requested.forEach(request => expect(turns.filter(t => t.opened.data.wake.includes(request.id))).toHaveLength(1));
}, 30000);
function assistantResponse(house: RequestHouse) {
  const turn = currentTurn(house);
  if (turn.by === "mind:notes") return respondToNotes(house);
  const wake = history(house).filter(e => turn.data.wake.includes(e.id));
  const reply = wake.flatMap(e => lineOf(e) ?? []).find(line => line.by === "mind:notes");
  return answer(reply ? [] : [say("mind:notes", mention("mind:notes", note))], reply ? "Received" : "Asked");
}
it.each([false, true])(
  "an assistant asks a program mind and hears back through the thread, restart=%s",
  async restart => {
    const f = fixture();
    const house = await f.open();
    f.prepare(house);
    const minds = await house.minds;
    f.respond(() => assistantResponse(house));
    let stopped = false;
    const off = house.bus.on(event => {
      if (restart && lineOf(event)?.by === "mind:notes") {
        stopped = true;
        minds?.close();
      }
    });
    expect(send(house, "assistant:ana", "Please remember the meeting").status).toBe("accepted");
    await minds?.flush();
    off();
    const request = lines(house).find(line => line.by === "assistant:ana");
    const reply = lines(house).find(line => line.by === "mind:notes");
    expect(request).toMatchObject({ to: "mind:notes", text: mention("mind:notes", note) });
    expect(reply).toMatchObject({ to: "assistant:ana", text: mention("assistant:ana", note) });
    if (!request || !reply) throw new Error("exchange");
    expect(causalRequest(history(house), [reply.id]).id).toBe(request.id);
    let finished = house;
    if (restart) {
      expect(stopped).toBe(true);
      const heard = [...house.tools.state().house.minds.turns.values()].filter(t =>
        t.opened.data.wake.includes(reply.id),
      );
      expect(heard).toEqual([]);
      house.close();
      f.respond(frame => {
        expect(frame).toContain("assistant:ana");
        if (frame.startsWith("Alcance:\nassistant:ana")) {
          expect(frame).toContain(reply.id);
          expect(frame).toContain(note);
          return answer([], "Received");
        }
        return answer();
      });
      finished = await f.open();
    }
    const resumed = [...finished.tools.state().house.minds.turns.values()].filter(t =>
      t.opened.data.wake.includes(reply.id),
    );
    expect(resumed).toHaveLength(1);
    expect(resumed[0]?.opened).toMatchObject({ by: "assistant:ana" });
    expect(resumed[0]?.opened.process).toBeUndefined();
    expect(resumed[0]?.closed?.data.outcome).toBe("done");
    expect(finished.tools.state().tools.notes.notes).toEqual([note]);
    const calls = f.transport.mock.calls.length;
    finished.close();
    await f.open();
    expect(f.transport).toHaveBeenCalledTimes(calls);
  },
  30000,
);
it("own lines, unnamed mind lines and legacy native messages schedule no work, including after restart", async () => {
  const f = fixture();
  const house = await f.open();
  f.prepare(house);
  const calls = f.transport.mock.calls.length;
  const line = (by: string, text: string) =>
    house.bus.emit({ layer: "program", kind: "talk/said", data: { to: "mind:notes", text }, by, cause: [] });
  line("mind:notes", mention("mind:notes", note));
  line("assistant:ana", note);
  line("mind:migration", `Notes ${note}`);
  house.bus.emit(effect("mind-requested", { to: "mind:notes", text: note }, "ana"));
  house.bus.emit(effect("mind-turn-opened", { turn: "legacy", wake: [] }, "mind:agenda"));
  house.bus.emit(effect("mind-message", { turn: "legacy", to: "mind:notes", text: note }, "mind:agenda"));
  house.bus.emit(effect("mind-turn-closed", { turn: "legacy", outcome: "done", calls: 0, applied: [] }, "mind:agenda"));
  await (await house.minds)?.flush();
  expect(house.tools.state().house.journeys.size).toBe(0);
  expect(f.transport).toHaveBeenCalledTimes(calls);
  house.close();
  await f.open();
  expect(f.transport).toHaveBeenCalledTimes(calls);
});
it("a blank line is refused by the ordinary action engine and a line to nobody wakes no mind", async () => {
  const f = fixture();
  const house = await f.open();
  const calls = f.transport.mock.calls.length;
  expect(send(house, "mind:notes", " ").status).toBe("rejected");
  expect(send(house, "mind:missing", note).status).toBe("accepted");
  await (await house.minds)?.flush();
  expect(lines(house).map(line => line.to)).toEqual(["mind:missing"]);
  expect(f.transport).toHaveBeenCalledTimes(calls);
});
