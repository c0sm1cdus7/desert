// The offline bank keeps its spending, its fingerprints and its uncertainty; opening keys and caps stay visible.
import { said } from "../../fields/phrases.ts";
import { afterEach, expect, it, vi } from "vitest";
import { programMindFixture } from "../../../tests/support/program-mind-fixture.ts";
import { modelAccount } from "../../house/minds/model-call-state.ts";
import { maximumProgramCall, programMindNotices } from "./program-mind-availability.ts";
import { cards } from "../../adapters/models/catalog.ts";
import { effect } from "../../house/facts.ts";
const fixtures: ReturnType<typeof programMindFixture>[] = [];
const fixture = () => {
  const f = programMindFixture();
  fixtures.push(f);
  return f;
};
afterEach(() => fixtures.splice(0).forEach(f => f.cleanup()));
it("a rejecting key leaves the house open and explains its absence", async () => {
  const f = fixture();
  const house = await f.open({
    key: () => Promise.reject(new Error("synthetic")),
  });
  expect(
    house
      .mindNotices?.()
      .map(notice => said(notice, "es"))
      .join(" "),
  ).toContain("llave");
  expect(f.transport).not.toHaveBeenCalled();
  expect(f.wake(house).status).toBe("accepted");
  await (await house.minds)?.flush();
});
it("exhausting the cap between scenes certifies no role rejection, and the next bank keeps that spending", async () => {
  const f = fixture();
  const card = cards[0];
  if (!card) throw new Error("card");
  const house = await f.open({}, false);
  const first = await f.bank(house, { capNanoUsd: maximumProgramCall(card, 50000) + 2999 });
  expect(f.transport).toHaveBeenCalledTimes(1);
  expect(
    programMindNotices(first)
      .map(notice => said(notice, "es"))
      .join(" "),
  ).toContain("saldo");
  expect(house.journal.replay(0, (count, event) => count + Number(event.kind === "mind-bank-tested"))).toBe(0);
  const spent = modelAccount(house.tools.state().house.modelCalls, "test").spentNanoUsd;
  expect(spent).toBe(3000);
  await f.bank(house);
  expect(f.transport).toHaveBeenCalledTimes(4);
  expect(modelAccount(house.tools.state().house.modelCalls, "test").spentNanoUsd).toBe(spent * 4);
  expect(house.tools.state().house.mindAssignments.has("mind:notes")).toBe(true);
});
it("the bank tries again a card whose evidence has another fingerprint", async () => {
  const f = fixture();
  const house = await f.open({}, false);
  const card = cards[0];
  if (!card) throw new Error("card");
  house.bus.emit(
    effect(
      "mind-bank-tested",
      {
        mind: "mind:notes",
        card: card.model,
        version: "high",
        result: {
          role: "program:notes",
          passed: true,
          cases: 1,
          scenes: 3,
          costUsd: 0,
          seconds: 0,
          date: "2026-11-18",
          fingerprint: { cases: "old", skill: "old", frameTexts: "old" },
        },
      },
      "mind:notes",
    ),
  );
  await f.bank(house);
  expect(f.transport).toHaveBeenCalledTimes(3);
  expect(house.journal.replay(0, (count, event) => count + Number(event.kind === "mind-bank-tested"))).toBe(2);
});
it("the bank does not reuse inconsistent evidence even with the current fingerprint", async () => {
  const f = fixture();
  const house = await f.open({}, false);
  const options = await f.options();
  const definition = options.definitions[0];
  const card = cards[0];
  if (!definition || !card) throw new Error("definition");
  const result = {
    role: definition.role,
    passed: true,
    cases: 1,
    scenes: 2,
    costUsd: 0,
    seconds: 0,
    date: "2026-11-18",
    fingerprint: options.fingerprint(definition),
  };
  house.bus.emit(
    effect("mind-bank-tested", { mind: "mind:notes", card: card.model, version: "high", result }, "mind:notes"),
  );
  await f.bank(house);
  expect(f.transport).toHaveBeenCalledTimes(3);
  expect(house.journal.replay(0, (count, event) => count + Number(event.kind === "mind-bank-tested"))).toBe(2);
});
it("closing during the bank keeps the uncertain reservation and discards the late answer", async () => {
  const f = fixture();
  let release: () => void = () => {};
  const hold = new Promise<void>(resolve => {
    release = resolve;
  });
  const transport = vi.fn<typeof fetch>(async (url, init) => {
    await hold;
    return f.transport(url, init);
  });
  const house = await f.open({}, false);
  try {
    const bank = f.bank(house, { transport });
    await vi.waitFor(() => expect(transport).toHaveBeenCalledOnce());
    house.close();
    release();
    await bank;
    const reopened = await f.open({ capNanoUsd: 0 });
    expect(modelAccount(reopened.tools.state().house.modelCalls, "test").reservedNanoUsd).toBeGreaterThan(0);
    expect(reopened.journal.replay(0, (count, event) => count + Number(event.kind === "mind-bank-tested"))).toBe(0);
    expect(reopened.tools.state().house.mindAssignments.get("mind:notes")?.version).toBe("low");
  } finally {
    release();
    house.close();
  }
});
