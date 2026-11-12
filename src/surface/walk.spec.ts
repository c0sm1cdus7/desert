// What an action shows of what was already answered.
import { describe, expect, it } from "vitest";
import type { Done } from "./screen.ts";
import { walkBody } from "./walk.ts";

const block = "FACTURA A\nLibrería Sol SRL\nfisco de prueba";
const done: Done = {
  kind: "act",
  tool: "sales",
  act: "invoice",
  answers: ["s1", "emitir"],
  asked: [
    { ask: "Venta", shown: "Venta 1" },
    { ask: block, shown: "emitir" },
  ],
  pos: 2,
  floor: 0,
  typed: "",
  caret: 0,
  at: 0,
  marks: [],
  suggested: false,
  phase: "done",
  done: "Autorizada · Factura A 0001-00000001",
};

describe("what was answered", () => {
  it("is read beside what was asked, and under it when what was asked is a block of several lines", () => {
    const body = walkBody(done, null, 0);
    const read = body.kind === "thread" ? body.events.map(event => event.text.map(span => span.text).join("")) : [];
    expect(read.slice(0, 2)).toEqual(["Venta Venta 1", `${block}\nemitir`]);
  });
});
