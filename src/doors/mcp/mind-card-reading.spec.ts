// Agent readers see the same program-owned card action and certified choices as the terminal router.
import { expect, it } from "vitest";
import { sampleOptions } from "../../../tests/support/installable-program.ts";
import { mcpRows } from "../../../tests/support/mcp-results.ts";
import { staged, given } from "../../checks/promises/promised-stage.ts";
import { compose } from "../../runtime/distributions/compose.ts";
import { mcpReading } from "./mcp-reading.ts";
it("lists the root card action beside grouped actions, with only the published cards", async () => {
  const composed = compose(sampleOptions);
  const program = { ...composed.program, minds: { assistants: false, programs: ["notes"] } };
  await staged(program, async ({ house }) => {
    await given(house(), "notes", [
      { mindCards: { mind: "mind:notes", cards: [{ card: "approved", version: "1", capabilities: [] }] } },
    ]);
    const result = mcpReading(house(), "ana", { recentLines: 40 }).actions("notes", "notes");
    expect(mcpRows(result)).toEqual([
      expect.objectContaining({
        program: "notes",
        action: "assign-mind-card",
        target: "notes",
        choices: { "mind-cards": [{ value: JSON.stringify(["approved", "1"]), title: "approved · 1" }] },
      }),
    ]);
    const member = mcpReading(house(), "beto", { recentLines: 40 }).actions("notes", "notes");
    expect(mcpRows(member)).toEqual([
      expect.objectContaining({ action: "assign-mind-card", reason: "only whoever administers" }),
    ]);
  });
});
