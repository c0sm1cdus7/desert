// A turn takes a past wait back as a correction and reports what broke an internal turn.
import { expect, it } from "vitest";
import { runMindTurn } from "./mind-turn.ts";
import type { TurnPorts } from "./mind-ports.ts";
import { JourneyWaitRefused } from "../../tools/minds/journey-controls.ts";
import { fixture, ok, wake } from "../../../tests/support/mind-turn-fixture.ts";
it("returns a wait ending before now to the mind with the house clock, then applies its adjusted answer", async () => {
  const f = fixture([ok(), ok()]);
  let count = 0;
  const execute: TurnPorts["execute"] = async () => {
    await Promise.resolve();
    if (++count === 1) throw new JourneyWaitRefused(1_700_000_000_000);
    return { status: "accepted", id: "a2" };
  };
  expect(await runMindTurn({ ...f.ports, execute }, wake)).toMatchObject({ outcome: "done", applied: ["a2"] });
  const said = f.events.flatMap(event => (event.kind === "mind-scene" ? [event.data.text] : []));
  expect(said.some(text => text.includes("1700000000000 (2023-11-14T22:13:20.000Z)"))).toBe(true);
  const invalid = f.events.find(event => event.kind === "mind-answer-invalid");
  expect(invalid?.data).toMatchObject({ faults: [{ code: "wait", path: "/acts" }] });
});
it("says what broke an internal turn, with where it broke, in the outcome the host logs", async () => {
  const f = fixture([ok()]);
  const execute: TurnPorts["execute"] = () => Promise.reject(new TypeError("broken port"));
  const outcome = await runMindTurn({ ...f.ports, execute }, wake);
  expect(outcome).toMatchObject({ outcome: "failed", reason: "internal" });
  expect(outcome.error).toMatch(/^TypeError: broken port \| at /u);
});
