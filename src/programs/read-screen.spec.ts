import { startRouter, type Router } from "../surface/router.ts";
import type { Tool } from "../surface/shown-tool.ts";
import { answer } from "./promised-answer.ts";
import { type } from "./promised-keys.ts";
import { expect, it } from "vitest";
import { reasonIn, unchangedIn } from "./read-screen.ts";
import { toolTexts } from "../texts/tools.texts.ts";

it("binds a picked refusal to the intended thing, never a neighbor with the same reason", () => {
  const body = {
    kind: "thread",
    events: [],
    options: [
      { title: "Otra", value: "sales/s2", off: true, detail: "archivada" },
      { title: "Venta", value: "sales/s1", off: true },
    ],
  } as const;
  expect(reasonIn(body, "archivada", { title: "Venta", value: "sales/s1" })).toBe(false);
  expect(reasonIn(body, "archivada", { title: "Otra", value: "sales/s2" })).toBe(true);
});
it("reads the exact composed list reason without matching an ordinary datum or a thread substring", () => {
  const row = { title: "Venta", detail: `Total · ${toolTexts.unchanged}`, off: true };
  const body = { kind: "list", stacks: [{ title: "Ventas", rows: [row] }] } as const;
  expect(unchangedIn(body)).toBe(true);
  expect(unchangedIn({ ...body, stacks: [{ title: "Ventas", rows: [{ ...row, off: false }] }] })).toBe(false);
  expect(unchangedIn({ kind: "thread", events: [], options: [row] })).toBe(false);
});

it("the answer guarantee rejects a neighboring reason when the intended row lost its own", () => {
  const field = {
    kind: "pick",
    of: "sales",
    ask: "Venta",
    nothing: () => "sin ventas",
    shown: (value: string) => value,
    valid: () => false,
    found: () => [
      { title: "Venta", value: "sales/s1", off: true, detail: "archivada" },
      { title: "Vecina", value: "sales/s2", off: true, detail: "archivada" },
    ],
  } as const;
  const tool: Tool = {
    id: "shop",
    name: "Tienda",
    place: { key: "t", section: "tools" },
    summary: () => "ventas",
    view: () => [],
    acts: {
      choose: {
        label: "elegir",
        verb: "elegir",
        scope: "all",
        next: () => field,
        run: () => Promise.resolve({ ok: true, text: "Elegida · Venta" }),
      },
    },
  };
  const router = startRouter({
    tools: [tool],
    bar: () => ({ state: "connected", clock: "00:00", now: 0 }),
    defect: error => {
      throw error;
    },
  });
  type(router, "t1");
  const screen: Router["screen"] = viewport => {
    const drawn = router.screen(viewport);
    if (drawn.body.kind !== "thread") return drawn;
    const options = drawn.body.options?.map(row => {
      if (row.title !== "Venta") return row;
      const { detail: _detail, ...missing } = row;
      return missing;
    });
    return { ...drawn, body: { ...drawn.body, ...(options ? { options } : {}) } };
  };
  try {
    expect(() => answer({ ...router, screen }, field, "sales/s1")).toThrow("archivada");
  } finally {
    router.stop();
  }
});
