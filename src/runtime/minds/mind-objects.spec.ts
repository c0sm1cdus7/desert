// Objetos shows each thing in play capped, with its length and how to read it whole; the rest are rows of a list.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { answer } from "../../../tests/support/request-mind-fixture.ts";
import { effect } from "../../house/facts.ts";
import { capObject } from "./mind-frame-objects.ts";
import { add, framesOf, supervisedFixture, supervising, think } from "../../../tests/support/supervisor-responder.ts";
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
const note = (index: number) => `Nota ${String(index).padStart(2, "0")} ${"·".repeat(90)}`;
it("caps a thing in play, reads it whole in the same turn, and leaves a quiet thing as a row of its list", async () => {
  const f = supervisedFixture();
  fixtures.push(f);
  const house = await f.open();
  f.prepare(house);
  let read = false;
  f.respond(frame => {
    if (!read || supervising(frame) || !frame.startsWith("Alcance:\nmind:notes")) return answer();
    read = false;
    return answer([{ act: "read", target: "notes/personal", input: { from: 0 } }]);
  });
  await think(house, "Hola");
  house.bus.emit(effect("attended", { target: "notes/personal" }, "ana"));
  for (let index = 1; index <= 40; index++)
    expect(house.tools.act(add(note(index)), house.tools.state().through, "ana").status).toBe("accepted");
  read = true;
  await think(house, "Leé tus notas");
  await think(house, "Gracias");
  const frames = framesOf(f).filter(frame => frame.startsWith("Alcance:\nmind:notes"));
  const reading = frames.find(frame => section(frame, "Despertar").includes("Leé tus notas")) ?? "";
  const objects = section(reading, "Objetos");
  expect(objects).toContain(note(1).slice(0, 20));
  expect(objects).not.toContain(note(20));
  expect(objects).toMatch(/read notes\/personal/u);
  const bodies = f.transport.mock.calls.map(call => (typeof call[1]?.body === "string" ? call[1].body : ""));
  const results = bodies.find(body => body.includes('"role":"assistant"'))?.split('"role":"assistant"')[1] ?? "";
  expect(results).toContain(note(20));
  // Nothing touched the notes since: they are a row of the tool's list, readable whole by the same act.
  const quiet = section(frames.find(frame => section(frame, "Despertar").includes("Gracias")) ?? "", "Objetos");
  expect(quiet).not.toContain("Nota 01");
  expect(quiet).toContain('"id":"notes/personal"');
}, 60000);
it("cuts a row's long text by whole characters and keeps every row JSON, with the length and how to read it", () => {
  const row = (id: number) => JSON.stringify({ id: `t/${id}`, text: `Hilo ${id}`, detail: `😀${"x".repeat(5000)}` });
  const capped = capObject({ id: "t", text: [row(1), row(2)].join("\n") }, "es");
  const [first, second, last] = capped.text.split("\n");
  for (const line of [first, second]) expect(JSON.stringify(JSON.parse(line ?? ""))).toMatch(/"text":"Hilo/u);
  expect(first).toContain("😀");
  expect(last).toBe(
    `[Recortado de ${Array.from([row(1), row(2)].join("\n")).length} caracteres: read t lo trae entero.]`,
  );
  expect(capObject({ id: "s", text: "corto" }, "es")).toEqual({ id: "s", text: "corto" });
});
