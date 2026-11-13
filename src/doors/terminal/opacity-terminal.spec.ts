// Bytes from a real PTY, including its echo and every redraw, are the assertion boundary.
import { mkdtempSync, rmSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { realTerminal, type RealTerminal } from "../../programs/real-terminal.ts";
const opened: { term: RealTerminal; home: string }[] = [];
afterEach(async () => {
  for (const { term, home } of opened.splice(0)) {
    await term.close();
    rmSync(home, { recursive: true, force: true });
  }
});
const paste = (value: string) => `\x1b[200~${value}\x1b[201~`;
for (const size of [
  { cols: 100, rows: 30 },
  { cols: 40, rows: 16 },
])
  it(`no muestra lo escrito ni pegado, al volver o cancelar (${size.cols} columnas)`, async () => {
    const home = mkdtempSync(join(tmpdir(), "opacity-pty-"));
    const term = realTerminal(
      [process.execPath, join(import.meta.dirname, "../../../tests/support/opacity-open.ts"), home],
      size,
    );
    opened.push({ term, home });
    await term.until("Menú");
    term.press("c");
    await term.until("Custodia");
    term.press("g");
    await term.until("Primer material");
    const raw = "MARCADOR_OCULTO";
    term.press(raw);
    await term.rest(150);
    expect(term.written()).not.toContain(raw);
    term.press("\r");
    await term.until("Segundo material");
    const multiline = "LINEA_UNO\nLINEA_DOS";
    term.press(paste(multiline));
    await term.rest(150);
    expect(term.written()).not.toContain("LINEA_UNO");
    expect(term.written()).not.toContain("LINEA_DOS");
    term.press("\r");
    await term.until("Confirmar");
    term.press("\x1b");
    await term.rest(100);
    expect(term.written()).not.toContain(raw);
    expect(term.written()).not.toContain("LINEA_UNO");
    term.press("\x1b");
    await term.rest(100);
    term.press("\x1b");
    await term.rest(100);
    await term.until("Custodia");
    term.press("g");
    await term.until("Primer material");
    term.press(paste("Z".repeat(4000)));
    await term.rest(150);
    expect(term.written()).not.toContain("ZZZZ");
    term.press("\x1b");
    await term.rest(100);
    await term.until("Custodia");
    term.press("g");
    await term.until("Primer material");
    term.press(paste("OTRO_MATERIAL"));
    term.press("\r");
    await term.until("Segundo material");
    // Closing in the middle discards the unanswered walk; nothing reached the action or custody.
    await term.close();
    const db = new DatabaseSync(join(home, "journal.sqlite"), { readOnly: true });
    try {
      const acts = db.prepare("select data from events where kind = 'act'").all();
      expect(acts.some(row => String(row.data).includes('"option":"set"'))).toBe(false);
      expect(JSON.stringify(acts)).not.toContain("OTRO_MATERIAL");
    } finally {
      db.close();
    }
    const again = realTerminal(
      [process.execPath, join(import.meta.dirname, "../../../tests/support/opacity-open.ts"), home],
      size,
    );
    opened.push({ term: again, home });
    await again.until("Menú");
    again.press("c");
    await again.until("Custodia");
    again.press("g");
    await again.until("Primer material");
    expect(again.written()).not.toContain("OTRO_MATERIAL");
  }, 15000);
