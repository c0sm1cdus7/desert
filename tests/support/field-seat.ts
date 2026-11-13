import type { TSchema } from "@sinclair/typebox";
import { object } from "../../src/catalogs/acts.ts";
import { asking } from "../../src/surface/bridge/asking.ts";
import { formats } from "../../src/surface/masks.ts";
import { begin, start, type Session } from "../../src/surface/screen.ts";
import { step, finished } from "../../src/surface/step.ts";
import { resolve } from "../../src/surface/resolve.ts";
import type { Intent } from "../../src/surface/contract.ts";
import type { Tool } from "../../src/surface/shown-tool.ts";

function fieldTool(field: TSchema, after?: TSchema): Tool {
  const ask = asking(object({ value: field, ...(after ? { after } : {}) }), {
    now: () => 0,
    today: () => "2026-11-13",
    optionalMark: "",
    formats: formats({ currency: "$", decimal: ",", thousands: ".", day: "dd/mm/aaaa" }),
  });
  return {
    id: "data",
    name: "Datos",
    place: { key: "d", section: "tools" },
    summary: () => "",
    view: () => [],
    acts: {
      change: {
        label: "cambiar",
        verb: "cambiar",
        scope: "all",
        next: ask.next,
        run: () => Promise.resolve({ ok: true, text: "Listo" }),
      },
    },
  };
}
export function fieldSeat(field: TSchema, after?: TSchema) {
  const tool = fieldTool(field, after);
  let session: Session = [...start, begin([tool], "data", "change")];
  const send = (key: Intent) => {
    const moved = step(session, key, [tool], 0);
    session = moved.session;
    return moved.run;
  };
  const fail = (reason: string) => {
    const running = send({ kind: "confirm" });
    if (!running) throw new Error("The action did not run");
    session = finished(session, running, { ok: false, reason });
  };
  const reopen = () => {
    session = [...start, begin([tool], "data", "change")];
  };
  const screen = () => resolve(session, [tool], { state: "connected", clock: "00:00", now: 0 }, { rows: 26 });
  const reasons = () => {
    const body = screen().body;
    return body.kind === "thread"
      ? body.events.filter(event => event.nested).map(event => event.text.map(span => span.text).join(""))
      : [];
  };
  return { send, screen, reasons, fail, reopen, session: () => session };
}
