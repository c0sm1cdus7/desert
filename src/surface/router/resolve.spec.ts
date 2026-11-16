// What a small terminal shows of a long preview with many options, what Enter opens after reading past a list, and
// which side of a row is cut when both do not fit.
import { describe, expect, it } from "vitest";
import { textOf } from "../../doors/terminal/cells.ts";
import { contentRows, paint } from "../../doors/terminal/paint.ts";
import type { Field, Screen } from "../contract/contract.ts";
import { resolve } from "./resolve.ts";
import { begin, start, type Session } from "../session/screen.ts";
import type { Tool } from "../contract/shown-tool.ts";
import { step } from "./step.ts";

const bar = { state: "connected", clock: "12:00", now: 0 } as const;
const block = Array.from({ length: 12 }, (_, i) => `renglón ${i + 1}`).join("\n");
const options = Array.from({ length: 8 }, (_, i) => ({ title: `opción ${i + 1}`, key: String(i + 1) }));
const sure: Field = { ask: block, kind: "confirm", options };
const act = {
  label: "emitir",
  verb: "emitir",
  scope: "all" as const,
  next: () => sure,
  run: () => Promise.reject(new Error("no corre")),
};
/** A tool with one act that puts a twelve-line block to be confirmed among eight options, and two lists of rows. */
const tool: Tool = {
  id: "invoices",
  name: "Facturas",
  place: { key: "f", section: "tools" },
  summary: () => "",
  view: () => [
    { title: "Leídas", rows: [{ title: "solo se lee", still: true }] },
    { title: "Facturas", rows: [{ title: "una", key: "1", opens: "invoices/1" }] },
  ],
  acts: { issue: act },
};
const small = { cols: 40, rows: 16 };
const shown = (session: Session): readonly string[] =>
  textOf(paint(resolve(session, [tool], bar, { rows: contentRows(small.rows) }), small)).map(line => line.trim());

describe("a long preview with many options, on the smallest terminal", () => {
  const asking = begin([tool], "invoices", "issue");

  it("keeps lines of what is said in view above its options, which say how many of them do not fit", () => {
    const lines = shown([...start, asking]);
    expect(lines.filter(line => line.startsWith("renglón")).length).toBeGreaterThan(0);
    expect(lines.some(line => line.startsWith("↑"))).toBe(true);
    expect(lines.some(line => line.startsWith("[1] opción 1"))).toBe(true);
  });

  it("is read back to its first line, a window at a time, and no count is drawn over another", () => {
    let session: Session = [...start, asking];
    const seen = new Set<string>();
    for (let turn = 0; turn < 12; turn++) {
      const lines = shown(session);
      for (const line of lines.filter(each => each.startsWith("renglón"))) seen.add(line);
      expect(lines.filter(line => /más.*más/u.test(line))).toEqual([]);
      session = step(session, { kind: "up" }, [tool], 0).session;
    }
    expect([...seen].sort()).toEqual(block.split("\n").sort());
  });
});

describe("Enter, after reading past the list the chosen row is in", () => {
  it("brings the chosen row back into view first, and opens it only then", () => {
    const place = { kind: "view", tool: "invoices", at: 0, shift: -1 } as const;
    const back = step([...start, place], { kind: "confirm" }, [tool], 0).session;
    expect(back.at(-1)).toEqual({ kind: "view", tool: "invoices", at: 0 });
    const opened = step(back, { kind: "confirm" }, [tool], 0).session;
    expect(opened.at(-1)).toMatchObject({ kind: "view", tool: "invoices", target: "invoices/1" });
  });
});

describe("a row whose name and what is beside it do not both fit", () => {
  const name = "Nota de crédito A 0002-00000003";
  const beside = "Librería Sol SRL · $ 12.100,00 · autorizado · por mail";
  const listed = (reads: boolean): readonly string[] => {
    const stack = { title: "Comprobantes", rows: [{ title: name, detail: beside, key: "1" }] };
    const screen: Screen = {
      title: "x",
      state: "connected",
      clock: "12:00",
      hints: [],
      menu: false,
      body: { kind: "list", stacks: [reads ? { ...stack, reads: true } : stack] },
    };
    return textOf(paint(screen, { cols: 80, rows: 16 })).map(line => line.trim());
  };

  it("keeps its name whole where it is chosen: what is beside it is what is cut", () => {
    const row = listed(false).find(line => line.startsWith("[1]")) ?? "";
    expect(row).toContain(name);
    expect(row).not.toContain(beside);
    expect(row.endsWith("…")).toBe(true);
  });

  it("keeps its datum whole where it is read: its name is what is cut", () => {
    const row = listed(true).find(line => line.startsWith("[1]")) ?? "";
    expect(row).toContain(beside);
    expect(row).not.toContain(name);
  });
});
