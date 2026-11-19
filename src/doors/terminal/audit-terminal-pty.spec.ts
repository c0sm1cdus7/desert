// Real keyboards reach the redemption guidance and exercise both sides of an upgraded mechanical threshold.
import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { legacyDoorHouse } from "../../../tests/support/legacy-door-house.ts";
import { realTerminal } from "../../checks/real-terminal.ts";
it.each(["local", "remote"])(
  "pty: %s terminal keeps recipient keys out of administrator screens after upgrade",
  async mode => {
    const fixture = legacyDoorHouse();
    const terminal = realTerminal(
      [process.execPath, resolve("tests/support/audit-terminal-open.ts"), fixture.home, mode],
      { cols: 120, rows: 40 },
    );
    try {
      if (mode === "local") {
        await terminal.until("Reconstruido");
        terminal.press("\r");
      }
      await terminal.until("[v] ventas");
      terminal.press("v");
      await terminal.until("[r] registrar");
      terminal.press("rNEW-UNDER\r1500\r");
      await terminal.until("Registrada · NEW-UNDER");
      terminal.press("\x1b");
      await terminal.until("[r] registrar");
      terminal.press("rNEW-OVER\r100000\r");
      await terminal.until("El acto quedó frenado");
      terminal.press("\x1b");
      await terminal.rest(100);
      terminal.press("\x0f");
      await terminal.until("Menú");
      terminal.press("i");
      await terminal.until("nueva identidad");
      terminal.press("2");
      await terminal.until("orientar el canje");
      expect(terminal.screen().join("\n")).toContain("no emite llave ni consume invitación");
      terminal.press("q");
      await terminal.until("Invitación vigente");
      expect(terminal.screen().join("\n")).toContain("Orientar");
      const invitation = readFileSync(join(fixture.home, "invitation-id-fixture"), "utf8");
      terminal.press(`${invitation}\r`);
      await terminal.until("persona invitada");
      expect(terminal.written()).not.toContain("synthetic-upgrade-founder");
      expect(terminal.screen().join("\n")).not.toMatch(/[A-Za-z0-9_-]{43}/);
    } finally {
      await terminal.close();
      fixture.close();
    }
  },
  20000,
);
