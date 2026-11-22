// Proves, through a running house, that in a group a mind is named by @ and the name people see, or @ and its actor.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { effect } from "../../house/facts.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
import { identityTarget } from "../../tools/identities/identity-reading.ts";
import { requestKit } from "../../../tests/support/request-program.ts";
import { talkKit } from "../../../tests/support/talk-program.ts";
import { requestMindFixture, answer, type RequestHouse } from "../../../tests/support/request-mind-fixture.ts";
import { framesOf, moments, supervisedFixture, supervising } from "../../../tests/support/supervisor-responder.ts";
const fixtures: ReturnType<typeof requestMindFixture>[] = [];
const track = (f: ReturnType<typeof requestMindFixture>) => {
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
/** Ana says a line in a thread, as the talk program keeps it; `to` lists the other readers, comma-separated. */
const said = (house: RequestHouse, to: string, text: string) =>
  house.bus.emit({ layer: "program", kind: "talk/said", data: { to, text }, by: "ana", cause: [] });
/** How many model calls one line made, once every mind it woke has thought. */
const callsFor = async (f: ReturnType<typeof requestMindFixture>, house: RequestHouse, to: string, text: string) => {
  const before = f.transport.mock.calls.length;
  said(house, to, text);
  await (await house.minds)?.flush();
  return f.transport.mock.calls.length - before;
};
const accidental = ["notas@example.com", "x@notas", "@Notash", "identities/mind:notes", "mind:notes, anotá"];
it("22/11: in a group [ana, mind:notes, beto] only «@Notas» or «@mind:notes» wakes the notes mind", async () => {
  const f = track(requestMindFixture());
  const house = await f.open();
  f.prepare(house);
  f.respond(() => answer());
  for (const text of ["Notas, anotá esto", "repasamos las notas compartidas", ...accidental])
    expect(await callsFor(f, house, "mind:notes,beto", text), text).toBe(0);
  for (const text of ["@Notas, anotá esto", "@notas anotá esto", "@NOTAS: anotá esto", "@mind:notes anotá esto"])
    expect(await callsFor(f, house, "mind:notes,beto", text), text).toBe(1);
}, 60000);
it("22/11: an assistant is named by the whole name it was given, whatever the spaces inside", async () => {
  const f = track(requestMindFixture(undefined, { assistantCard: { model: "claude-haiku-5-5", effort: "low" } }));
  const house = await f.open(true, { assistant: false });
  const onAna = (act: string, input: unknown) => {
    house.bus.emit(effect("attended", { target: identityTarget("ana") }, "ana"));
    return settle(house.tools.act({ act, target: identityTarget("ana"), input }, house.tools.state().through, "ana"));
  };
  expect((await onAna("enable-assistant", { name: "Asistente de Martín" })).status).toBe("accepted");
  expect((await onAna("delegate-assistant", { kit: [talkKit, ...requestKit] })).status).toBe("accepted");
  await (await house.minds)?.flush();
  f.respond(() => answer());
  const group = "assistant:ana,beto";
  for (const text of ["Martín, ¿podés?", "Asistente de Martín, ¿podés?", "@Asistente", "assistant:ana, mirá"])
    expect(await callsFor(f, house, group, text), text).toBe(0);
  for (const text of ["@Asistente  de\nMartín, ¿podés?", "@asistente de martin", "@assistant:ana, mirá"])
    expect(await callsFor(f, house, group, text), text).toBe(1);
}, 60000);
it("22/11: the supervisor is named «@Supervisor» in a group, never by the word «supervisor»", async () => {
  const f = track(supervisedFixture());
  const house = await f.open();
  f.respond(frame => (supervising(frame) ? { scene: "Visto", consulta: null, acts: [] } : answer()));
  await (await house.minds)?.flush();
  const group = "mind:supervisor,beto";
  for (const text of ["el supervisor me frenó", "Sin supervisor: nada", "supervisor, mirá", "x@supervisor"])
    await callsFor(f, house, group, text);
  expect(moments(framesOf(f))).toEqual([]);
  await callsFor(f, house, group, "@Supervisor, ¿cómo va?");
  expect(moments(framesOf(f))).toEqual(["turn"]);
  await callsFor(f, house, group, "@mind:supervisor, ¿y ahora?");
  expect(moments(framesOf(f))).toEqual(["turn", "turn"]);
}, 60000);
