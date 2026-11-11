// Rules, walked end to end by keys, against what the storyboard shows.
import { describe, expect, it } from "vitest";
import { rulesTool, seed } from "../../../../tests/support/surface-rules.ts";
import { type Tool } from "../../surface/shown-tool.ts";
import { keysOf } from "./input.ts";
import { textOf } from "./cells.ts";
import { contentRows, paint } from "./paint.ts";
import { resolve } from "../../surface/resolve.ts";
import { actOf, start, type Session } from "../../surface/screen.ts";
import { finished, step } from "../../surface/step.ts";

const bar = { state: "connected", clock: "14:32", battery: "71%", now: 5_000 } as const;
const size = { cols: 106, rows: 30 };
const shown = (session: Session, tools: readonly Tool[]): readonly string[] =>
  textOf(paint(resolve(session, tools, bar, { rows: contentRows(size.rows) }), size));
async function press(session: Session, keys: string, tools: readonly Tool[]): Promise<Session> {
  let now = session;
  for (const key of keysOf(keys)) {
    const stepped = step(now, key, tools, bar.now);
    now = stepped.session;
    if (stepped.run) {
      now = finished(now, stepped.run, await actOf(tools, stepped.run).run(stepped.run.answers));
    }
  }
  return now;
}
describe("the terminal, on rules", () => {
  it("derives the Menu and the list, with Acciones last, from the tool alone", async () => {
    const tools = [rulesTool(seed())];
    expect(shown(start, tools)[0]).toContain("Menú");
    expect(shown(start, tools)[5]?.trim()).toMatch(/^\[r\] reglas +1 tuyas · 1 de Nora$/u);
    const list = shown(await press(start, "\r", tools), tools);
    expect(list[0]).toContain("Reglas");
    expect(list.slice(4, 12).map(row => row.trim().replace(/ {2,}/gu, " | "))).toEqual([
      "Tuyas",
      "[1] Responder siempre en español | desde el 02/11",
      "",
      "De Nora",
      "[2] No inventar títulos ni direcciones | desde el 01/11",
      "",
      "Acciones",
      "[n] nueva regla",
    ]);
  });
  it("offers enter only once the answer is valid, and creates a rule through its act", async () => {
    const rules = seed();
    const tools = [rulesTool(rules)];
    const asking = await press(await press(start, "\r", tools), "n", tools);
    expect(shown(asking, tools).at(-1)).not.toContain("enter");
    expect(shown(asking, tools)[26]).toContain("Escribí la regla…");
    const typed = await press(asking, "Hablar claro", tools);
    expect(shown(typed, tools).at(-1)).toContain("enter crear");
    const done = shown(await press(typed, "\r", tools), tools);
    expect(done.join("\n")).toContain("¿Qué regla tiene que seguir Nora? Hablar claro");
    expect(done.join("\n")).toContain("Listo La regla ya rige.");
    expect(done.at(-1)).toContain("esc cerrar");
    expect(rules.at(-1)?.text).toBe("Hablar claro");
  });
  it("offers removal for any rule, with going back chosen before an irreversible action", async () => {
    const rules = seed();
    const tools = [rulesTool(rules)];
    const list = await press(start, "\r", tools);
    const theirs = shown(await press(list, "\x1b[B\r", tools), tools);
    expect(theirs.join("\n")).toContain("eliminar");
    const mine = await press(list, "\r", tools);
    const asking = await press(mine, "l", tools);
    const left = await press(asking, "\r", tools);
    expect(rules).toHaveLength(2);
    expect(left.at(-1)?.kind).toBe("view");
    const gone = await press(asking, "\x1b[B\r", tools);
    expect(rules).toHaveLength(1);
    expect(shown(gone, tools).join("\n")).toContain("¿Eliminar «Responder siempre en español»?");
  });
  it("re-asks with what you wrote when the act fails, and esc leaves", async () => {
    const tools = [rulesTool(seed(), "No se pudo guardar.")];
    const failed = await press(await press(await press(start, "\r", tools), "n", tools), "Hablar\r", tools);
    const screen = shown(failed, tools);
    expect(screen.join("\n")).toContain("Error No se pudo guardar.");
    expect(screen[26]).toContain("› Hablar");
    expect((await press(failed, "\x1b", tools)).at(-1)?.kind).toBe("view");
  });
  it("marks what opens nothing, so every renderer draws a label and its value the same", async () => {
    const tools = [rulesTool(seed())];
    const body = resolve(start, tools, bar, { rows: contentRows(size.rows) }).body;
    expect(body.kind === "list" && body.stacks.flatMap(stack => stack.rows).every(row => !row.still)).toBe(true);
    const detail = resolve(await press(await press(start, "\r", tools), "\r", tools), tools, bar, { rows: 22 }).body;
    expect(body.kind === "list" && detail.kind === "list" && detail.stacks[0]?.rows[0]?.still).toBe(true);
  });
  it("says how many remain inside a long stack, under its title", async () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ id: `${i}`, text: `Regla ${i}`, since: "01/11", mine: true }));
    const tools = [rulesTool(many)];
    const screen = shown(await press(await press(start, "\r", tools), "\x1b[B".repeat(20), tools), tools);
    expect(screen[4]?.trim()).toBe("Tuyas");
    expect(screen[5]?.trim()).toMatch(/^↑ \d+ más$/u);
    expect(screen.join("\n")).toMatch(/↓ \d+ más/u);
  });
  it("masks a secret on screen and drops a walk you already left", async () => {
    const base = rulesTool(seed());
    const secret: Tool = {
      ...base,
      acts: {
        ...base.acts,
        key: {
          label: "agregar",
          verb: "guardar",
          key: "k",
          scope: "all",
          next: answers => (answers.length ? null : { ask: "Pegá la llave.", kind: "secret" }),
          run: () => Promise.resolve({ ok: true, text: "Guardada." }),
        },
      },
    };
    const tools = [secret];
    const typed = await press(await press(start, "\r", tools), "kabc123", tools);
    expect(shown(typed, tools).join("\n")).not.toContain("abc123");
    const running = step(typed, { kind: "confirm" }, tools, bar.now);
    expect(shown(running.session, tools).join("\n")).not.toContain("abc123");
    const left = step(running.session, { kind: "cancel" }, tools, bar.now).session;
    expect(running.run).toBeDefined();
    if (running.run) {
      expect(finished(left, running.run, { ok: true, text: "x" })).toBe(left);
      const done = finished(running.session, running.run, { ok: true, text: "Guardada." }, "14:33");
      expect(shown(done, tools).join("\n")).not.toContain("abc123");
      expect(shown(done, tools).join("\n")).toContain("Listo Guardada. · 14:33");
    }
  });
});
describe("an action with steps", () => {
  it("goes back one question with esc, keeps the answer, and forgets what depended on a changed one", async () => {
    const base = rulesTool(seed());
    const questions = (answers: readonly string[]) => {
      if (answers.length === 0) return { ask: "¿De qué proveedor?", kind: "text" as const, placeholder: "Proveedor" };
      const key = { ask: `¿Qué llave de ${answers[0] ?? ""}?`, kind: "text" as const, placeholder: "Llave" };
      return answers.length === 1 ? key : null;
    };
    const run = () => Promise.resolve({ ok: true as const, text: "Guardada." });
    const act = { label: "agregar", verb: "guardar", key: "k", scope: "all" as const, next: questions, run };
    const tools = [{ ...base, acts: { ...base.acts, key: act } }];
    const second = await press(await press(start, "\r", tools), "kAnt\rvieja", tools);
    expect(shown(second, tools).at(-1)).toContain("esc volver");
    const first = await press(second, "\x1b", tools);
    expect(shown(first, tools)[26]).toContain("› Ant");
    expect(shown(first, tools).at(-1)).toContain("esc cancelar");
    const same = await press(first, "\r", tools);
    expect(shown(same, tools).join("\n")).toContain("¿Qué llave de Ant?");
    /** What the question opened with gives way to what is written; an arrow first, and it is edited instead. */
    const changed = await press(first, "Ante\r", tools);
    expect(shown(changed, tools).join("\n")).toContain("¿Qué llave de Ante?");
    expect(shown(await press(first, "\x1b[Ce\r", tools), tools).join("\n")).toContain("¿Qué llave de Ante?");
    expect(shown(changed, tools)[26]).not.toContain("vieja");
    expect((await press(first, "\x1b", tools)).at(-1)?.kind).toBe("view");
  });
});
