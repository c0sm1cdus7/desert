// Actividad shows what happened since the mind last answered, and the mind reads what came before when it needs it.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { answer, history } from "../../../tests/support/request-mind-fixture.ts";
import { framesOf, supervisedFixture, supervising, think } from "../../../tests/support/supervisor-responder.ts";
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
const section = (frame: string, name: string) => frame.split(`${name}:\n`)[1]?.split("\n\n")[0] ?? "";
it("shows only what came since the last answer, keeps what a failed turn saw, and reads the rest", async () => {
  const f = supervisedFixture();
  fixtures.push(f);
  const house = await f.open();
  f.prepare(house);
  let fail = false;
  let read = false;
  f.respond(frame => {
    if (supervising(frame)) return answer();
    if (fail) throw new Error("provider down");
    if (!read || !frame.startsWith("Alcance:\nmind:notes")) return answer();
    read = false;
    return answer([{ act: "read", target: "Actividad", input: { from: 0 } }]);
  });
  await think(house, "Primer pedido");
  fail = true;
  await think(house, "Segundo pedido");
  fail = false;
  read = true;
  await think(house, "Tercer pedido");
  const frames = framesOf(f).filter(frame => !supervising(frame));
  const last = frames.find(frame => section(frame, "Despertar").includes("Tercer pedido")) ?? "";
  expect(section(last, "Despertar")).toContain("Tercer pedido");
  // The second turn failed: what it was shown comes again; the first one answered: its message is older.
  expect(section(last, "Actividad")).toContain("Segundo pedido");
  expect(section(last, "Actividad")).not.toContain("Primer pedido");
  expect(section(last, "Actividad")).toContain("read Actividad");
  // Reading costs one more call of the same turn, which hears the older line among its results.
  const bodies = f.transport.mock.calls.map(call => (typeof call[1]?.body === "string" ? call[1].body : ""));
  const second = bodies.find(body => body.includes('"role":"assistant"')) ?? "";
  expect(second.split('"role":"assistant"')[1]).toContain("Primer pedido");
  const turns = history(house).filter(event => event.kind === "mind-turn-closed" && event.by === "mind:notes");
  expect(turns.at(-1)).toMatchObject({ data: { outcome: "done", calls: 2 } });
}, 60000);
