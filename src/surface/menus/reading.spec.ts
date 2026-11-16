// Every disabled or read-only row remains readable on every admitted window size.
import { expect, it } from "vitest";
import { resolve } from "../router/resolve.ts";
import { begin, start, type Session } from "../session/screen.ts";
import { step } from "../router/step.ts";
import type { Tool } from "../contract/shown-tool.ts";
import { rowsIn } from "../../checks/read-screen.ts";

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

it("clears a reading position when searching, narrowing, erasing and leaving a pick search", () => {
  const pick: Tool = {
    ...tool,
    acts: {
      choose: {
        ...tool.acts.choose,
        label: "elegir",
        verb: "elegir",
        scope: "all",
        run: () => Promise.resolve({ ok: true, text: "Elegida · Venta" }),
        next: () => ({
          kind: "pick",
          of: "shop",
          ask: "Venta",
          nothing: () => "Sin ventas",
          shown: value => value,
          found: sought => options.filter(option => option.title.includes(sought)),
        }),
      },
    },
  };
  const initial = begin([pick], "shop", "choose");
  let session: Session = [...start, { ...initial, reading: 89 }];
  for (const intent of [
    { kind: "type", text: " " },
    { kind: "type", text: "0" },
    { kind: "erase" },
    { kind: "cancel" },
  ] as const) {
    session = step(session, intent, [pick], 0).session;
    expect(session.at(-1)).not.toHaveProperty("reading");
    expect(rowsIn(resolve(session, [pick], bar, { rows: 8 }).body).some(row => row.title === "Opción 0")).toBe(true);
    const last = session.at(-1);
    if (last?.kind === "act") session = [...session.slice(0, -1), { ...last, reading: 89 }];
  }
});

it("clears list reading when starting, narrowing and leaving a search", () => {
  const searchable: Tool = { ...tool, find: sought => options.filter(row => row.title.includes(sought)) };
  let session: Session = [...start, { kind: "view", tool: "shop", at: 0, reading: 89 }];
  for (const intent of [
    { kind: "type", text: " " },
    { kind: "type", text: "0" },
    { kind: "erase" },
    { kind: "cancel" },
  ] as const) {
    session = step(session, intent, [searchable], 0).session;
    expect(session.at(-1)).not.toHaveProperty("reading");
    const place = session.at(-1);
    if (place?.kind === "view") session = [...session.slice(0, -1), { ...place, reading: 89 }];
  }
});
