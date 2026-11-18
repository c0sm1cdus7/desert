// Verifies the advertised effect before the final answer in an actual terminal and after reopening.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { realTerminal } from "../../checks/real-terminal.ts";
import { rulesTexts } from "../../texts/rules.texts.ts";
it.each([
  { by: "ana", promote: false, key: "g", active: 2 },
  { by: "beto", promote: false, key: "p", active: 1 },
  { by: "beto", promote: true, key: "p", active: 2 },
])(
  "shows current authority before $by writes a rule (promote=$promote)",
  async ({ by, promote, key, active }) => {
    const home = mkdtempSync(join(tmpdir(), "rule-authority-terminal-"));
    const terminal = realTerminal(
      [process.execPath, join(import.meta.dirname, "../../../tests/support/rule-authority-terminal-open.ts"), home, by],
      { cols: 140, rows: 40 },
    );
    try {
      await terminal.until("[r] reglas");
      terminal.press("r");
      await terminal.until(by === "ana" ? "[g] guardar" : "[p] proponer");
      if (by === "ana") expect(terminal.screen().join("\n")).not.toContain("[p] proponer");
      terminal.press(`${key}terminal-rule\rTope nuevo\rsales\rregister\rai\r`);
      await terminal.until("Resultado");
      if (promote) writeFileSync(join(home, "promote"), "promote synthetic member");
      const notice = by === "ana" || promote ? rulesTexts.saveNotice : rulesTexts.proposalNotice;
      const screen = (await terminal.until(notice)).join("\n");
      expect(screen).toContain(by === "ana" || promote ? "guardar" : "proponer");
      terminal.press("f");
      await terminal.until(active === 2 ? rulesTexts.saved : rulesTexts.draft);
      await terminal.close();
      const result: unknown = JSON.parse(readFileSync(join(home, "result.json"), "utf8"));
      expect(result).toMatchObject({
        active,
        sale: "rejected",
        versions: [
          { version: 1, author: "ana" },
          { version: 2, author: by },
        ],
      });
    } finally {
      await terminal.close();
      rmSync(home, { recursive: true, force: true });
    }
  },
  15000,
);
