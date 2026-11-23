// A provider rejection stays visible in the scene, the journal and stdout, in the bank and in a live turn.
import { said } from "../../fields/phrases.ts";
import { afterEach, expect, it, vi } from "vitest";
import { issueDoorKey } from "../../house/doors/door-material.ts";
import type { HouseEmission } from "../../house/facts.ts";
import { runMindTurn } from "./mind-turn.ts";
import type { ModelPort } from "./mind-ports.ts";
import { programMindFixture } from "../../../tests/support/program-mind-fixture.ts";
import { programMindNotices } from "./program-mind-availability.ts";
const fixtures: ReturnType<typeof programMindFixture>[] = [];
afterEach(() => {
  fixtures.splice(0).forEach(f => f.cleanup());
  vi.restoreAllMocks();
});
const cases = [
  [400, "invalid_request_error"],
  [401, "authentication_error"],
  [404, "not_found_error"],
  [429, "rate_limit_error"],
  [529, "overloaded_error"],
] as const;
it.each(cases)("el banco conserva %s en escena, diario y stdout, con JSON y sin JSON", async (status, type) => {
  for (const json of [true, false]) {
    const f = programMindFixture();
    fixtures.push(f);
    const output = vi.spyOn(console, "log").mockImplementation(() => {});
    const secret = ["sk", "ant", "synthetic-provider-key"].join("-");
    const message = `No se admite el pedido ${secret}`;
    f.transport.mockImplementation(() =>
      Promise.resolve(new Response(json ? JSON.stringify({ error: { type, message } }) : message, { status })),
    );
    const house = await f.open({}, false);
    const prepared = await f.bank(house);
    const expected = `${status} ${json ? type : "untyped"}`;
    const scene = house.tools.state().house.scenes.get("mind:notes")?.data.general ?? "";
    const journal = house.journal.replay<string[]>([], (all, event) =>
      event.layer === "house" && event.kind === "scene" ? [...all, event.data.general] : all,
    );
    expect(scene).toContain(expected);
    expect(scene).toContain("No se admite el pedido [secret]");
    expect(journal).toContain(scene);
    expect(
      programMindNotices(prepared)
        .map(notice => said(notice, "es"))
        .join(" "),
    ).toContain(expected);
    expect(output).toHaveBeenCalledOnce();
    expect(output.mock.calls[0]?.[0]).toContain(expected);
    expect(JSON.stringify([scene, journal, output.mock.calls]).includes(secret)).toBe(false);
    expect(f.transport).toHaveBeenCalledOnce();
    house.close();
    output.mockRestore();
  }
});

it.each(cases)(
  "a live turn keeps %s on reopening and also masks the keys known to the database",
  async (status, type) => {
    const f = programMindFixture();
    fixtures.push(f);
    const house = await f.open();
    const planted = "door-material-synthetic-987654321";
    house.bus.emit(issueDoorKey("ana", "agent", "ana", planted).fact);
    const output = vi.spyOn(console, "log").mockImplementation(() => {});
    f.transport.mockClear();
    f.transport.mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            error: { type, message: `No se admite synthetic ni ${planted}` },
          }),
          { status },
        ),
      ),
    );
    f.wake(house);
    await (await house.minds)?.flush();
    const scene = house.tools.state().house.scenes.get("mind:notes")?.data.general;
    expect(scene).toContain(`${status} ${type}: No se admite [secret] ni [secret]`);
    const journal = house.journal.replay<string[]>([], (all, event) =>
      event.layer === "house" && event.kind === "mind-scene" ? [...all, event.data.text] : all,
    );
    expect(journal).toContain(scene);
    expect(output).toHaveBeenCalledOnce();
    expect(output.mock.calls[0]?.[0]).toContain(`${status} ${type}`);
    expect(JSON.stringify([scene, journal, output.mock.calls]).includes(planted)).toBe(false);
    house.close();
    const reopened = await f.open();
    expect(reopened.tools.state().house.scenes.get("mind:notes")?.data.general).toBe(scene);
    expect(f.transport).toHaveBeenCalledOnce();
    expect(output).toHaveBeenCalledOnce();
  },
);
it("keeps the supervisor's cause until the close of the turn that consulted it", async () => {
  const events: HouseEmission[] = [];
  const frame = { layers: ["a", "b", "c", "d"] as const, changing: "e" };
  const rejection = { status: 400, type: "invalid_request_error", message: "El esquema no se admite" };
  const model: ModelPort = request =>
    Promise.resolve(
      request.number === 1
        ? {
            kind: "answer",
            value: { scene: "Consultando", consultation: { question: "¿Sigo?" }, acts: [] },
            usage: { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 },
          }
        : { kind: "failed", reason: "http", rejection },
    );
  const result = await runMindTurn(
    {
      model,
      frame: () => frame,
      emit: event => events.push(event),
      isOpen: () => true,
      read: () => ({ active: true, menu: [], through: 1, rulesVersion: "v1", now: 0 }),
      allowed: () => true,
      execute: () => Promise.resolve({ status: "accepted", id: "unused" }),
      supervision: {
        supervisor: async (request, caller) => {
          await caller.call("mind:supervisor", frame, {});
          return { proposal: request.id, through: 1, rulesVersion: "v1", outcome: "failed", text: "Falló" };
        },
      },
    },
    { id: "t1", scope: { kind: "consciousness", actor: "mind:notes" }, wake: [], through: 1 },
  );
  expect(result).toMatchObject({ outcome: "failed", calls: 2, reason: "http", rejection });
  const scene = events.filter(event => event.kind === "mind-scene").at(-1);
  expect(scene?.data).toEqual({
    turn: "t1",
    text: "The provider rejected the request (400 invalid_request_error: El esquema no se admite). The turn stopped.",
  });
});
it("the bridge neither clones nor reads a whole rejection to look for usage", async () => {
  const f = programMindFixture();
  fixtures.push(f);
  vi.spyOn(console, "log").mockImplementation(() => {});
  let bytes = 0;
  const response = new Response(
    new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          bytes += 1024;
          controller.enqueue(new TextEncoder().encode("x".repeat(1024)));
        },
      },
      { highWaterMark: 0 },
    ),
    { status: 400 },
  );
  const clone = vi.spyOn(response, "clone");
  f.transport.mockImplementation(() => Promise.resolve(response));
  const house = await f.open();
  expect(f.transport).not.toHaveBeenCalled();
  f.wake(house);
  await (await house.minds)?.flush();
  expect(f.transport).toHaveBeenCalledOnce();
  expect(clone).not.toHaveBeenCalled();
  expect(bytes).toBe(8192);
  expect(house.tools.state().house.scenes.get("mind:notes")?.data.general).toContain("400 untyped");
});
