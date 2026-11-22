import { expect, it, vi } from "vitest";
import { programMindFixture } from "../../../tests/support/program-mind-fixture.ts";
import { turnLimits } from "../../tools/minds/mind-contract.ts";
it("diagnostica el pedido exacto con la carta, capas y menú de una mente, sin llamar ni gastar", async () => {
  const f = programMindFixture();
  const key = vi.fn(() => Promise.resolve("synthetic"));
  try {
    const house = await f.open({ key });
    const minds = await house.minds;
    if (!minds) throw new Error("minds");
    const turn = {
      id: "diagnostic",
      scope: { kind: "consciousness", actor: "mind:notes" } as const,
      language: "es" as const,
      through: house.tools.state().through,
      wake: [],
      limits: turnLimits,
      usage: { calls: 0, corrections: 0, consultations: 0 },
    };
    key.mockClear();
    f.transport.mockClear();
    const before = house.tools.state();
    const body = minds.diagnose(turn);
    expect(key).not.toHaveBeenCalled();
    expect(f.transport).not.toHaveBeenCalled();
    expect(house.tools.state()).toEqual(before);
    expect(body.model).toBe(before.house.mindAssignments.get("mind:notes")?.card);
    expect(body.output_config.effort).toBe(before.house.mindAssignments.get("mind:notes")?.version);
    expect(body.system[1]?.text).toContain("Sos la mente de Notas");
    expect(body.system[2]?.text).toContain("Anotá con las acciones");
    expect(body.system).toHaveLength(4);
    expect(JSON.stringify(body.output_config.format?.schema)).toContain("consulta");
    let compared = false;
    const synthetic = f.transport.getMockImplementation();
    if (!synthetic) throw new Error("transport");
    f.transport.mockImplementation((url, init) => {
      const opened = [...house.tools.state().house.minds.turns.values()].find(item => !item.closed)?.opened;
      if (!opened || typeof init?.body !== "string") throw new Error("turn");
      const diagnostic = minds.diagnose({
        ...turn,
        id: opened.data.turn,
        through: opened.seq - 1,
        wake: opened.data.wake,
      });
      // The frame shows the house clock; both reads run within the same moment but not the same millisecond.
      const clock = (text: string) => text.replace(/\d{13} · \d{4}-\d{2}-\d{2}T[\d:.]+Z/gu, "<ahora>");
      expect(clock(JSON.stringify(diagnostic))).toBe(clock(init.body));
      expect(init.body).toMatch(/\d{13} · \d{4}-\d{2}-\d{2}T/u);
      compared = true;
      return synthetic(url, init);
    });
    f.wake(house);
    await minds.flush();
    expect(compared).toBe(true);
    expect(f.transport).toHaveBeenCalledOnce();
  } finally {
    f.cleanup();
  }
});
