// Bytes from a real PTY, including its echo and every redraw, are the assertion boundary.
import { mkdtempSync, rmSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { realTerminal, type RealTerminal } from "./real-terminal.ts";
const opened: { term: RealTerminal; home: string }[] = [];
afterEach(async () => {
  const terminals = opened.splice(0);
  for (const { term } of terminals) await term.close();
  for (const home of new Set(terminals.map(each => each.home))) rmSync(home, { recursive: true, force: true });
});
const paste = (value: string) => `\x1b[200~${value}\x1b[201~`;
for (const size of [
  { cols: 100, rows: 30 },
  { cols: 40, rows: 16 },
])
  it(`shows nothing typed or pasted, on going back or cancelling (${size.cols} columns)`, async () => {
    const home = mkdtempSync(join(tmpdir(), "opacity-pty-"));
    const term = realTerminal(
      [process.execPath, join(import.meta.dirname, "../../tests/support/opacity-open.ts"), home],
      size,
    );
    opened.push({ term, home });
    await term.until("Menú");
    term.press("c");
    await term.until("Custodia");
    term.press("g");
    await term.until("Primer material");
    const raw = "HIDDEN_MARKER";
    term.press(raw);
    await term.rest(150);
    expect(term.written()).not.toContain(raw);
    term.press("\r");
    await term.until("Segundo material");
    const multiline = "LINE_ONE\nLINE_TWO";
    term.press(paste(multiline));
    await term.rest(150);
    expect(term.written()).not.toContain("LINE_ONE");
    expect(term.written()).not.toContain("LINE_TWO");
    term.press("\r");
    await term.until("Confirmar");
    term.press("\x1b");
    await term.rest(100);
    expect(term.written()).not.toContain(raw);
    expect(term.written()).not.toContain("LINE_ONE");
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
    term.press(paste("OTHER_MATERIAL"));
    term.press("\r");
    await term.until("Segundo material");
    // Closing in the middle discards the unanswered walk; nothing reached the action or custody.
    await term.close();
    const db = new DatabaseSync(join(home, "journal.sqlite"), { readOnly: true });
    try {
      const acts = db.prepare("select data from events where kind = 'act'").all();
      expect(acts.some(row => String(row.data).includes('"option":"set"'))).toBe(false);
      expect(JSON.stringify(acts)).not.toContain("OTHER_MATERIAL");
    } finally {
      db.close();
    }
    const again = realTerminal(
      [process.execPath, join(import.meta.dirname, "../../tests/support/opacity-open.ts"), home],
      size,
    );
    opened.push({ term: again, home });
    await again.until("Menú");
    again.press("c");
    await again.until("Custodia");
    again.press("g");
    await again.until("Primer material");
    expect(again.written()).not.toContain("OTHER_MATERIAL");
  }, 15000);
