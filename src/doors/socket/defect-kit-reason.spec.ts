// A defect from the terminal outside the kit says what the row and the execution say: one reason, kitRefusal.
import { expect, it } from "vitest";
import { socketHouse } from "../../../tests/support/socket-house.ts";
import { effect } from "../../journal/events.ts";
import { toolTexts } from "../../texts/tools.texts.ts";

for (const [tool, option, reason] of [
  ["identities", "new", toolTexts.kitRefusal("identities")],
  ["payments", "receive", toolTexts.kitRefusal("payments")],
] as const)
  it(`a defect on ${tool} outside the kit is refused with «${reason}», writing nothing`, async () => {
    const f = await socketHouse("stream", undefined, true);
    try {
      f.house().bus.emit(effect("kit-set", { holder: "beto", tool: "payments", acts: [] }, "ana"));
      const c = await f.client("beto-terminal");
      const before = f.house().tools.state().through;
      c.send({ tipo: "defecto", tool, target: tool, option });
      expect(await c.until(() => c.messages.some(m => m.tipo === "rechazo"))).toBe(true);
      expect(c.messages.at(-1)).toMatchObject({ tipo: "rechazo", motivo: reason });
      expect(f.house().tools.state().through).toBe(before);
    } finally {
      await f.close();
    }
  });
it("the two reasons differ, so the Identidades case tells the right one from the generic one", () => {
  expect(toolTexts.kitRefusal("identities")).not.toBe(toolTexts.outsideKit);
  expect(toolTexts.kitRefusal("payments")).toBe(toolTexts.outsideKit);
});
