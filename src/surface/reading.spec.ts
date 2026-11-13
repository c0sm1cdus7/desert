// Every disabled or read-only row remains readable on every admitted window size.
import { expect, it } from "vitest";
import { resolve } from "./resolve.ts";
import { begin, start, type Session } from "./screen.ts";
import { step } from "./step.ts";
import type { Tool } from "./shown-tool.ts";
import { rowsIn } from "../programs/read-screen.ts";

const bar = { state: "connected", clock: "00:00", now: 0 } as const;
const options = Array.from({ length: 90 }, (_, index) => ({
  title: `Opción ${index}`,
  detail: index ? "cerrada" : "disponible",
  off: index > 0,
}));
const tool: Tool = {
  id: "shop",
  name: "Tienda",
  summary: () => "ventas",
  place: { key: "t", section: "tools" },
  view: () => [{ title: "Ventas", rows: options }],
  acts: {
    choose: {
      label: "elegir",
      verb: "elegir",
      scope: "all",
      next: () => ({ kind: "one", ask: "Venta", options }),
      run: () => Promise.resolve({ ok: true, text: "Elegida · Venta" }),
    },
  },
};
for (const rows of [8, 9, 16, 40, 80]) {
  for (const kind of ["list", "thread"] as const) {
    it(`reads all ${kind} rows through a ${rows}-line window without selecting disabled ones`, () => {
      let session: Session =
        kind === "list"
          ? [...start, { kind: "view", tool: "shop", at: 0 }]
          : [...start, begin([tool], "shop", "choose")];
      const seen = new Set<string>();
      for (const direction of ["down", "up"] as const) {
        for (let movement = 0; movement < 200; movement++) {
          const picture = resolve(session, [tool], bar, { rows });
          for (const row of rowsIn(picture.body)) {
            seen.add(row.title);
            expect(row.off && row.selected).not.toBe(true);
          }
          session = step(session, { kind: direction }, [tool], 0).session;
        }
      }
      expect(options.every(option => seen.has(option.title))).toBe(true);
      const back = step(session, { kind: "confirm" }, [tool], 0);
      expect(back.run).toBeUndefined();
      expect(back.session.length).toBe(session.length);
    });
  }
}
