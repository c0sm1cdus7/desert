// Agent readers see the same program-owned card action and certified choices as the terminal router.
import { expect, it } from "vitest";
import { sampleOptions } from "../../../tests/support/installable-program.ts";
import { mcpRows } from "../../../tests/support/mcp-results.ts";
import { staged, given } from "../../checks/promises/promised-stage.ts";
import { componer } from "../../runtime/distributions/compose.ts";
import { mcpReading } from "./mcp-reading.ts";
it("lists the root card action beside grouped actions, with only the published cards", async () => {
  const composed = componer(sampleOptions);
  const program = { ...composed.program, mentes: { asistentes: false, programas: ["notas"] } };
  await staged(program, async ({ house }) => {
    await given(house(), "notas", [
      { mindCards: { mind: "mind:notas", cards: [{ card: "approved", version: "1", capabilities: [] }] } },
    ]);
    const result = mcpReading(house(), "ana", { recentLines: 40 }).actions("notas", "notas");
    expect(mcpRows(result)).toEqual([
      expect.objectContaining({
        program: "notas",
        action: "assign-mind-card",
        target: "notas",
        opciones: { "mind-cards": [{ value: JSON.stringify(["approved", "1"]), title: "approved · 1" }] },
      }),
    ]);
    const member = mcpReading(house(), "beto", { recentLines: 40 }).actions("notas", "notas");
    expect(mcpRows(member)).toEqual([
      expect.objectContaining({ action: "assign-mind-card", motivo: "solo quien administra" }),
    ]);
  });
});
