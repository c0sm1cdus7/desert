// A defect from the terminal outside the kit says what the row and the execution say: one reason, kitRefusal.
import { expect, it } from "vitest";
import { socketHouse } from "../../tests/support/socket-house.ts";
import { effect } from "../house/facts.ts";
import { toolTexts } from "../texts/tools.texts.ts";

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
      c.send({ type: "default", tool, target: tool, option });
      expect(await c.until(() => c.messages.some(m => m.type === "rejection"))).toBe(true);
      expect(c.messages.at(-1)).toMatchObject({ type: "rejection", reason: reason });
      expect(f.house().tools.state().through).toBe(before);
    } finally {
      await f.close();
    }
  });
it("the two reasons differ, so the identities case tells the right one from the generic one", () => {
  expect(toolTexts.kitRefusal("identities")).not.toBe(toolTexts.outsideKit);
  expect(toolTexts.kitRefusal("payments")).toBe(toolTexts.outsideKit);
});
