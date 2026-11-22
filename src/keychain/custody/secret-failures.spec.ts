import { expect, it, vi } from "vitest";
import { inspect } from "node:util";
import { fixture, secret, field, has } from "../../../tests/support/secret-rig.ts";
for (const [label, value] of [
  ["short", "demo-pass"],
  ["vocabulary", "sale-registered"],
  ["one", "Ω"],
] as const) {
  it(`the async rejection and its cause receive only references: ${label}`, async () => {
    const rig = fixture(secret, input =>
      Promise.reject(
        new Error(String(field(input, "value")), {
          cause: new Error(String(field(input, "value"))),
        }),
      ),
    );
    const pending = rig.set({ value });
    expect(pending.status).toBe("processing");
    if (pending.status !== "processing") throw new Error("No inició");
    const done = await pending.completion;
    expect(done.status).toBe("rejected");
    expect(has([done, rig.facts(), rig.house.tools.state()], value)).toBe(false);
  });
}
for (const kind of ["act", "act-done", "act-result", "lost"] as const) {
  it(`clears the write failure and the emergency channel: ${kind}`, () => {
    const value = "uno\ndos";
    const rig = fixture(secret, input => ({ status: "accepted", text: String(field(input, "value")) }));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const append = rig.house.journal.append.bind(rig.house.journal);
    const write = vi.spyOn(rig.house.journal, "append").mockImplementation((emission, at) => {
      if (kind === "lost" || emission.kind === kind) throw new Error(value, { cause: new Error(value) });
      return append(emission, at);
    });
    try {
      const done = rig.set({ value });
      expect(done.status).toBe("rejected");
      const diagnostic = inspect([done, rig.facts(), error.mock.calls], { depth: null });
      expect(diagnostic.includes(value) || diagnostic.includes("uno\\ndos")).toBe(false);
      if (kind === "lost") expect(error).toHaveBeenCalled();
    } finally {
      write.mockRestore();
      error.mockRestore();
    }
  });
}
