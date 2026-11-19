// Pastes valid and malformed samples into a real PTY and checks screens, replay and SQLite after reopening.
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { realTerminal } from "../../checks/real-terminal.ts";
import { simulationMarker } from "../../../tests/support/simulation-house.ts";
import { ruleFormTexts } from "../../texts/rules.texts.ts";
it.each(["first", "second", "invalid"])(
  "protects %s secret samples in the production terminal",
  async kind => {
    const home = mkdtempSync(join(tmpdir(), "simulation-terminal-"));
    const terminal = realTerminal(
      [process.execPath, join(import.meta.dirname, "../../../tests/support/simulation-terminal-open.ts"), home],
      { cols: 140, rows: 40 },
    );
    try {
      await terminal.until("[r] reglas");
      terminal.press("rspublic-limit\r1\r");
      await terminal.until(ruleFormTexts.samples);
      const samples =
        kind === "invalid"
          ? `{${simulationMarker}`
          : JSON.stringify([
              { actor: "ana", now: 0, input: { kind, amount: 11, nested: { token: simulationMarker } } },
            ]);
      terminal.press(`\x1b[200~${samples}\x1b[201~`);
      await terminal.rest(100);
      expect(terminal.written()).not.toContain(simulationMarker);
      terminal.press("\r");
      await terminal.until(kind === "invalid" ? ruleFormTexts.casesInvalid : "Frena");
      expect(terminal.written()).not.toContain(simulationMarker);
      await terminal.close();
      expect(readFileSync(join(home, "result.json"), "utf8")).not.toContain(simulationMarker);
      expect(JSON.parse(readFileSync(join(home, "result.json"), "utf8"))).toMatchObject({ executed: 0 });
      expect(readFileSync(join(home, "journal.sqlite")).includes(Buffer.from(simulationMarker))).toBe(false);
    } finally {
      await terminal.close();
      rmSync(home, { recursive: true, force: true });
    }
  },
  15000,
);
