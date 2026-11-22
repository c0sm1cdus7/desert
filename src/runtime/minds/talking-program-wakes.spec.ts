// Proves, through a running house, that a program's acts wake its mind only when the program does not talk: the talk
// program talks by its own `mensajes`, so its mind wakes by its messages; the notes program's acts still wake its mind.
import "../../../tests/support/fixture-vault.ts";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { effect } from "../../house/facts.ts";
import { explicitKit, kitLayout } from "../../house/kit-selection.ts";
import { compose } from "../distributions/compose.ts";
import { startHouse } from "../house-runtime.ts";
import { sampleOptions } from "../../../tests/support/installable-program.ts";
import { requestProgram, requestKit } from "../../../tests/support/request-program.ts";
import { talkAct, talkKit, talkProgram } from "../../../tests/support/talk-program.ts";
import { answer } from "../../../tests/support/request-mind-fixture.ts";
const cleanups: (() => void)[] = [];
beforeEach(() =>
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("network forbidden");
    }),
  ),
);
afterEach(() => {
  cleanups.splice(0).forEach(done => done());
  vi.unstubAllGlobals();
});
const card = { model: "claude-haiku-5-5", effort: "low" };
const distribution = () =>
  compose({
    ...sampleOptions,
    programs: [requestProgram(), talkProgram],
    minds: { assistants: false, programs: ["notes", "talk"] },
  });
/** A house with the notes mind and the talk program's own mind; `woke` lists, call by call, whose turn was open. */
async function talking() {
  const home = mkdtempSync(join(tmpdir(), "talking-program-"));
  const composed = distribution();
  const woke: string[] = [];
  let state = () => ({ open: "?" });
  const transport = vi.fn<typeof fetch>(() => {
    woke.push(state().open);
    const text = JSON.stringify(answer());
    const usage = { input_tokens: 10, output_tokens: 4, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
    return Promise.resolve(
      new Response(JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text }], usage })),
    );
  });
  const options = await composed.modelMinds({
    language: "es",
    key: () => Promise.resolve("synthetic"),
    transport,
    account: "test",
    capNanoUsd: 1_000_000_000,
    cards: { "mind:notes": card, "mind:talk": card },
  });
  const house = startHouse(home, {
    ...composed.program,
    by: "distribution",
    creation: { admin: "ana", assignments: [{ identity: "ana", tools: ["notes", "talk"] }] },
    modelMinds: options,
  });
  cleanups.push(() => {
    house.close();
    rmSync(home, { recursive: true, force: true });
  });
  state = () => ({
    open: [...house.tools.state().house.minds.turns.values()].find(turn => !turn.closed)?.opened.by ?? "?",
  });
  const kit = (holder: string, items: Parameters<typeof explicitKit>[0]) =>
    house.bus.emit(
      effect("kit-set", { version: 2, holder, kit: explicitKit(items, kitLayout(house.registry)) }, "ana"),
    );
  kit("mind:notes", [...requestKit, talkKit]);
  kit("mind:talk", [talkKit]);
  await (await house.minds)?.flush();
  /** Whose minds one act of ana's woke, once they have all thought. */
  const wokeBy = async (target: string, act: string, input: unknown) => {
    const before = woke.length;
    house.bus.emit(effect("attended", { target }, "ana"));
    expect(house.tools.act({ act, target, input }, house.tools.state().through, "ana").status).toBe("accepted");
    await (await house.minds)?.flush();
    return woke.slice(before);
  };
  return { composed, house, wokeBy };
}
it("22/11: the talk program talks by its own `mensajes`, and its mind is told none of its acts wake it", async () => {
  const { composed, house } = await talking();
  expect(house.registry.find(tool => tool.id === "talk")?.talks).toBe(true);
  expect(house.registry.find(tool => tool.id === "notes")?.talks).toBeUndefined();
  const rules = (actor: string) => composed.mindDefinitions.find(mind => mind.actor === actor)?.rules.text("es", {});
  expect(rules("mind:talk")).not.toContain("acciones de tu programa");
  expect(rules("mind:notes")).toContain("acciones de tu programa");
}, 60000);
it("22/11: a line said with the talk program in a thread its mind is not in wakes no mind", async () => {
  const { wokeBy } = await talking();
  expect(await wokeBy(talkAct.target, talkAct.act, { to: "beto", text: "Hola Beto" })).toEqual([]);
}, 60000);
it("22/11: the talk program's mind wakes for a line to it in an individual thread, by the thread", async () => {
  const { wokeBy } = await talking();
  expect(await wokeBy(talkAct.target, talkAct.act, { to: "mind:talk", text: "Hola" })).toEqual(["mind:talk"]);
  expect(await wokeBy(talkAct.target, talkAct.act, { to: "mind:talk,beto", text: "Hola a los dos" })).toEqual([]);
  expect(await wokeBy(talkAct.target, talkAct.act, { to: "mind:talk,beto", text: "@Talk, mirá" })).toEqual([
    "mind:talk",
  ]);
}, 60000);
it("22/11: the notes program does not talk, so an act on its own object still wakes its mind", async () => {
  const { wokeBy } = await talking();
  expect(await wokeBy("notes/personal", "personal/add", { body: "Mate el jueves" })).toEqual(["mind:notes"]);
}, 60000);
