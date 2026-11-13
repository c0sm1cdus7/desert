import { expect, it } from "vitest";
import { matrixEvents, matrixStates, readyMatrix } from "../../tests/support/money-matrix-seat.ts";
import { expectedMatrix } from "../../tests/support/money-matrix-expect.ts";
import { paint } from "../doors/terminal/paint.ts";
import { textOf } from "../doors/terminal/cells.ts";

for (const [row, state] of matrixStates.entries())
  for (const [column, event] of matrixEvents.entries())
    it(`M${row + 1}.${column + 1} ${state} / ${event}`, () => {
      const hands = readyMatrix(state);
      hands.event(event);
      const screen = hands.screen();
      const want = expectedMatrix(state, event);
      const body = screen.body;
      expect(body.kind).toBe("thread");
      if (body.kind !== "thread") throw new Error("Expected thread");
      expect(body.entry?.typed).toBe(want.entry);
      expect(body.events.filter(e => e.nested).map(e => e.text.map(s => s.text).join(""))).toEqual(want.reasons);
      expect(hands.session().at(-1)).toMatchObject({ phase: want.phase, pos: want.pos });
      const walk = hands.session().at(-1);
      if (walk?.kind !== "act") throw new Error("Expected action");
      expect(walk.pos === 0 ? walk.typed : walk.answers[0]).toBe(want.amount);
      const painted = textOf(paint(screen, { cols: 90, rows: 40 })).join("\n");
      expect(painted).toContain(want.place);
      for (const reason of want.reasons) expect(painted).toContain(reason);
      if (want.entry) expect(painted).toContain(want.entry);
      if (want.phase === "asking" && want.pos === 0) expect(body.entry?.placeholder).toBe(`${want.currency} 0,00`);
    });
