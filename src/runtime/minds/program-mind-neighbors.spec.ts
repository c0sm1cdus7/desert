import { afterEach, expect, it, vi } from "vitest";
import { programMindFixture } from "../../../tests/support/program-mind-fixture.ts";
import { modelAccount } from "../../house/minds/model-call-state.ts";
import { maximumProgramCall } from "./program-mind-availability.ts";
import { cards } from "../../adapters/models/catalog.ts";
import { effect } from "../../house/facts.ts";
import { startHouse } from "../house-runtime.ts";
const fixtures: ReturnType<typeof programMindFixture>[] = [];
const fixture = () => {
  const f = programMindFixture();
  fixtures.push(f);
  return f;
};
afterEach(() => fixtures.splice(0).forEach(f => f.cleanup()));
it("una llave que rechaza deja la casa abierta y explica su ausencia", async () => {
  const f = fixture();
  const house = await f.open({
    key: () => Promise.reject(new Error("synthetic")),
  });
  expect(house.mindNotices?.().join(" ")).toContain("llave");
  expect(f.transport).not.toHaveBeenCalled();
  expect(f.wake(house).status).toBe("accepted");
  await (await house.minds)?.flush();
});
it("agotar el tope entre escenas no certifica un rechazo del rol y reabrir conserva ese gasto", async () => {
  const f = fixture();
  const card = cards[0];
  if (!card) throw new Error("card");
  const first = await f.open({ capNanoUsd: maximumProgramCall(card, 50000) + 2999 });
  expect(f.transport).toHaveBeenCalledTimes(1);
  expect(first.mindNotices?.().join(" ")).toContain("saldo");
  expect(first.journal.replay(0, (count, event) => count + Number(event.kind === "mind-bank-tested"))).toBe(0);
  const spent = modelAccount(first.tools.state().house.modelCalls, "test").spentNanoUsd;
  expect(spent).toBe(3000);
  first.close();
  const reopened = await f.open();
  expect(f.transport).toHaveBeenCalledTimes(4);
  expect(modelAccount(reopened.tools.state().house.modelCalls, "test").spentNanoUsd).toBe(spent * 4);
  expect(reopened.tools.state().house.mindAssignments.has("mind:notas")).toBe(true);
});
it("una evidencia con otra huella no habilita la carta", async () => {
  const f = fixture();
  const first = await f.open({}, false);
  const card = cards[0];
  if (!card) throw new Error("card");
  first.bus.emit(
    effect(
      "mind-bank-tested",
      {
        mind: "mind:notas",
        card: card.model,
        version: "high",
        result: {
          role: "program:notas",
          passed: true,
          cases: 1,
          scenes: 3,
          costUsd: 0,
          seconds: 0,
          date: "2026-11-18",
          fingerprint: { cases: "old", skill: "old", frameTexts: "old" },
        },
      },
      "mind:notas",
    ),
  );
  first.close();
  const second = await f.open();
  expect(f.transport).toHaveBeenCalledTimes(3);
  expect(second.journal.replay(0, (count, event) => count + Number(event.kind === "mind-bank-tested"))).toBe(2);
});
it("cerrar durante el banco conserva la reserva incierta y descarta la respuesta tardía", async () => {
  const f = fixture();
  let release: () => void = () => {};
  const hold = new Promise<void>(resolve => {
    release = resolve;
  });
  const transport = vi.fn<typeof fetch>(async (url, init) => {
    await hold;
    return f.transport(url, init);
  });
  const modelMinds = await f.distribution.modelMinds({ ...f.resources, transport });
  const house = startHouse(f.home, {
    ...f.distribution.program,
    modelMinds,
    by: "distribution",
    creation: { admin: "ana", assignments: [{ identity: "ana", tools: ["notas", "agenda"] }] },
  });
  try {
    await vi.waitFor(() => expect(transport).toHaveBeenCalledOnce());
    house.close();
    release();
    expect(await house.minds).toBeUndefined();
    const reopened = await f.open({ capNanoUsd: 0 });
    expect(modelAccount(reopened.tools.state().house.modelCalls, "test").reservedNanoUsd).toBeGreaterThan(0);
    expect(reopened.journal.replay(0, (count, event) => count + Number(event.kind === "mind-bank-tested"))).toBe(0);
  } finally {
    release();
    house.close();
  }
});
