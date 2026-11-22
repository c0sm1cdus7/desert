// Assistants think as real minds: enabled while the house runs, they talk through the talk program and work in
// journeys with the kit their owner delegated, with a synthetic transport only.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { effect } from "../../house/facts.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
import { identityTarget } from "../../tools/identities/identity-reading.ts";
import type { ProposedAct } from "../../tools/minds/mind-answer.ts";
import { requestKit } from "../../../tests/support/request-program.ts";
import { talkKit } from "../../../tests/support/talk-program.ts";
import {
  requestMindFixture,
  answer,
  say,
  send,
  history,
  type RequestHouse,
} from "../../../tests/support/request-mind-fixture.ts";
import { currentTurn, lineOf, lines, mention, respondToNotes } from "../../../tests/support/request-mind-responder.ts";
import { assistantDefinition, definitionsNow } from "./mind-definitions.ts";
import { shortIds } from "./mind-references.ts";
import { messageText } from "../../../tests/support/frame-text.ts";
const fixtures: ReturnType<typeof requestMindFixture>[] = [];
const haiku = { model: "claude-haiku-5-5", effort: "low" };
const fixture = () => {
  const f = requestMindFixture(undefined, { assistantCard: haiku });
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
const shown = Type.Object({ model: Type.String(), messages: Type.Array(Type.Object({ content: Type.Unknown() })) });
const bodies = (f: ReturnType<typeof fixture>) =>
  f.transport.mock.calls.flatMap(call => {
    const body: unknown = JSON.parse(typeof call[1]?.body === "string" ? call[1].body : "{}");
    return Value.Check(shown, body) ? [{ model: body.model, frame: messageText(body.messages[0]?.content) }] : [];
  });
/** The administrator, or the owner, acts on an identity's place as anyone does: attending it first. */
async function onIdentity(house: RequestHouse, by: string, act: string, input: unknown) {
  house.bus.emit(effect("attended", { target: identityTarget("ana") }, by));
  return settle(house.tools.act({ act, target: identityTarget("ana"), input }, house.tools.state().through, by));
}
async function enableNora(house: RequestHouse) {
  expect((await onIdentity(house, "ana", "enable-assistant", { name: "Nora" })).status).toBe("accepted");
  const kit = [talkKit, ...requestKit];
  expect((await onIdentity(house, "ana", "delegate-assistant", { kit })).status).toBe("accepted");
  await (await house.minds)?.flush();
}
/** Nora answers her owner, opens a journey with her delegated act, does it and reports back; the notes mind,
 * which sees every act on its program (signed 17/11), only takes note. */
function nora(house: RequestHouse) {
  const turn = currentTurn(house);
  if (turn.by === "mind:notes") return answer([], "Nora anotó algo");
  if (turn.process) {
    const journey = house.tools.state().house.journeys.get(turn.process);
    if (!journey) throw new Error("journey");
    return answer([
      { act: "personal/add", target: "notes/personal", input: { body: journey.goal } },
      { act: "end", target: journey.id, input: { summary: "Anotado", references: [] } },
    ]);
  }
  const wake = history(house).filter(event => turn.data.wake.includes(event.id));
  return answer(
    wake.flatMap<ProposedAct>(event => {
      const line = lineOf(event);
      if (line)
        return [
          say(line.by, "Dale, lo anoto"),
          { act: "open", target: "assistant:ana", input: { goal: line.text, kit: requestKit } },
        ];
      return event.kind === "journey-closed" ? [say("ana", "Listo")] : [];
    }),
  );
}
const note = "Mate con Martín el jueves";
it("an assistant enabled while the house runs gets its card, answers through the talk program and works", async () => {
  const f = fixture();
  const house = await f.open(true, { assistant: false });
  expect(definitionsNow({ definitions: [] }, house.tools.state().house)).toEqual([]);
  await enableNora(house);
  expect(definitionsNow({ definitions: [] }, house.tools.state().house).map(each => each.actor)).toEqual([
    "assistant:ana",
  ]);
  const state = house.tools.state().house;
  expect(state.mindAssignments.get("assistant:ana")).toMatchObject({ card: haiku.model, version: haiku.effort });
  expect(state.mindCards.get("assistant:ana")?.length).toBeGreaterThan(0);
  f.respond(() => nora(house));
  expect(send(house, "assistant:ana", note).status).toBe("accepted");
  await (await house.minds)?.flush();
  expect(lines(house).map(({ by, to, text }) => [by, to, text])).toEqual([
    ["ana", "assistant:ana", note],
    ["assistant:ana", "ana", "Dale, lo anoto"],
    ["assistant:ana", "ana", "Listo"],
  ]);
  expect(house.tools.state().tools.notes.notes).toEqual([note]);
  const journeys = [...house.tools.state().house.journeys.values()];
  expect(journeys.map(journey => [journey.by, journey.closed?.data.outcome])).toEqual([["assistant:ana", "done"]]);
  const acts = history(house).flatMap(e =>
    e.layer === "house" && e.kind === "act" && e.by === "assistant:ana" ? [e] : [],
  );
  expect(acts.map(e => [e.data.option, e.process])).toEqual([
    ["thread/say", undefined],
    ["personal/add", journeys[0]?.id],
    ["thread/say", undefined],
  ]);
  const scopes = bodies(f).map(body => body.frame.split("\n")[1]?.replace(/ \/ \d+$/u, ""));
  expect(scopes).toEqual([
    "assistant:ana",
    `assistant:ana / ${shortIds(journeys[0]?.id ?? "")}`,
    "mind:notes",
    "assistant:ana",
  ]);
  const calls = [...house.tools.state().house.modelCalls.values()];
  expect(calls.map(call => [call.reserved.by, call.status])).toEqual([
    ["assistant:ana", "settled"],
    ["assistant:ana", "settled"],
    ["mind:notes", "settled"],
    ["assistant:ana", "settled"],
  ]);
  expect(calls.every(call => (call.settled?.data.actualNanoUsd ?? 0) > 0)).toBe(true);
  const turns = [...house.tools.state().house.minds.turns.values()];
  expect(turns.every(turn => turn.closed?.data.outcome === "done")).toBe(true);
}, 30000);
it("the assistant reads its own rules: its name, its owner and the talk programs it speaks through", async () => {
  const f = fixture();
  const house = await f.open(true, { assistant: false });
  await enableNora(house);
  f.respond(() => answer());
  send(house, "assistant:ana", note);
  await (await house.minds)?.flush();
  const system = f.transport.mock.calls.map(call => (typeof call[1]?.body === "string" ? call[1].body : ""))[0];
  expect(system).toContain("Sos Nora, el asistente de ana.");
  expect(system).toContain("mind:<programa>");
  const definition = assistantDefinition(
    { definitions: [], talk: [{ tool: "talk", act: "thread/say" }] },
    "ana",
    "Nora",
  );
  expect(definition).toMatchObject({ actor: "assistant:ana", role: "assistant" });
  expect(definition.communication).toEqual([
    { tool: "mind", act: "scene" },
    { tool: "talk", act: "thread/say" },
  ]);
  const options = await f.distribution.modelMinds({
    language: "es",
    key: () => Promise.resolve("synthetic"),
    transport: f.transport,
    account: "test",
    capNanoUsd: 1,
  });
  const nora = options.fingerprint(assistantDefinition(options, "ana", "Nora"));
  const otra = options.fingerprint(assistantDefinition(options, "beto", "Otra"));
  expect(nora.cases).toBe(otra.cases);
  expect(nora.frameTexts).toBe(options.fingerprint(f.distribution.mindDefinitions[0] ?? definition).frameTexts);
  expect(nora.skill).not.toBe(otra.skill);
});
it("disabling the assistant stops it: a line to it wakes nothing, and enabling it again brings it back", async () => {
  const f = fixture();
  const house = await f.open(true, { assistant: false });
  await enableNora(house);
  f.respond(() => answer([], "Escuché"));
  send(house, "assistant:ana", note);
  await (await house.minds)?.flush();
  expect(f.transport).toHaveBeenCalledOnce();
  expect((await onIdentity(house, "ana", "disable-assistant", {})).status).toBe("accepted");
  send(house, "assistant:ana", "¿Seguís ahí?");
  await (await house.minds)?.flush();
  expect(f.transport).toHaveBeenCalledOnce();
  const missed = lines(house).at(-1);
  // Enabled again, it reads what was said to it meanwhile, as any mind reads all when it wakes.
  await enableNora(house);
  expect(f.transport).toHaveBeenCalledTimes(2);
  const turns = [...house.tools.state().house.minds.turns.values()];
  expect(turns.at(-1)?.opened.data.wake).toEqual([missed?.id]);
  send(house, "assistant:ana", "Volviste");
  await (await house.minds)?.flush();
  expect(f.transport).toHaveBeenCalledTimes(3);
  expect(bodies(f)[2]?.frame).toContain("Volviste");
});
it("the assistant asks a program mind in an individual thread and the program mind answers in it", async () => {
  const f = fixture();
  const house = await f.open(true, { assistant: false });
  f.prepare(house);
  await enableNora(house);
  f.respond(() => {
    const turn = currentTurn(house);
    if (turn.by === "mind:notes") return respondToNotes(house);
    const wake = history(house).filter(event => turn.data.wake.includes(event.id));
    const heard = wake.flatMap(event => lineOf(event) ?? []).find(line => line.by === "mind:notes");
    return heard ? answer([], "Notas contestó") : answer([say("mind:notes", mention("mind:notes", note))]);
  });
  send(house, "assistant:ana", "Pedile a Notas que lo anote");
  await (await house.minds)?.flush();
  const said = lines(house).map(({ by, to, text }) => [by, to, text]);
  expect(said).toEqual([
    ["ana", "assistant:ana", "Pedile a Notas que lo anote"],
    ["assistant:ana", "mind:notes", mention("mind:notes", note)],
    ["mind:notes", "assistant:ana", mention("assistant:ana", note)],
  ]);
  expect(house.tools.state().tools.notes.notes).toEqual([note]);
  expect(house.tools.state().house.minds.scenes.get("assistant:ana")?.data.text).toBe("Notas contestó");
}, 30000);
it("the administrator assigns an assistant's card by hand and its next call uses it", async () => {
  const f = fixture();
  const house = await f.open(true, { assistant: false });
  await enableNora(house);
  const card = JSON.stringify(["claude-sonnet-5-5", "medium"]);
  expect((await onIdentity(house, "ana", "assign-mind-card", { card })).status).toBe("accepted");
  expect(house.tools.state().house.mindAssignments.get("assistant:ana")).toMatchObject({
    card: "claude-sonnet-5-5",
    version: "medium",
  });
  f.respond(() => answer());
  send(house, "assistant:ana", note);
  await (await house.minds)?.flush();
  expect(bodies(f).map(body => body.model)).toEqual(["claude-sonnet-5-5"]);
});
