// The personal core is reachable with real terminal bytes from the same Menu as programs.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { realTerminal } from "./real-terminal.ts";
it("edits the personal scene from Menu on a PTY", async () => {
  const home = mkdtempSync(join(tmpdir(), "personal-core-pty-"));
  const term = realTerminal([
    process.execPath,
    join(import.meta.dirname, "../../tests/support/identities-open.ts"),
    home,
  ]);
  try {
    await term.until("Menú");
    term.press("u");
    await term.until("escena propia");
    term.press("e");
    await term.until("Qué está pasando");
    term.press("Preparando la casa\r");
    await term.until("Guardada · Escena");
    term.press("\x1b");
    expect((await term.until("Preparando la casa")).join("\n")).toContain("Preparando la casa");
  } finally {
    await term.rest(80);
    await term.close();
    rmSync(home, { recursive: true, force: true });
  }
}, 15000);
