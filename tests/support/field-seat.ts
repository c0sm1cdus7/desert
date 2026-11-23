import type { TSchema } from "@sinclair/typebox";
import { object } from "../../src/fields/visible-text.ts";
import { asking } from "../../src/surface/bridge/questions/asking.ts";
import { formats } from "../../src/surface/formats/masks.ts";
import { begin, start, type Session } from "../../src/surface/session/screen.ts";
import { step, finished } from "../../src/surface/router/step.ts";
import { resolve } from "../../src/surface/router/resolve.ts";
import type { Intent } from "../../src/surface/contract/contract.ts";
import type { Tool } from "../../src/surface/contract/shown-tool.ts";

function fieldTool(field: TSchema, after?: TSchema, stops?: (answers: readonly string[]) => string | undefined): Tool {
  const ask = asking(object({ value: field, ...(after ? { after } : {}) }), {
    now: () => 0,
    today: () => "2026-11-13",
    optionalMark: "",
    language: "es" as const,
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
        ...(stops ? { stops } : {}),
        run: () => Promise.resolve({ ok: true, text: "Listo" }),
      },
    },
  };
}
export function fieldSeat(field: TSchema, after?: TSchema, stops?: (answers: readonly string[]) => string | undefined) {
  const tool = fieldTool(field, after, stops);
  let session: Session = [...start, begin([tool], "data", "change")];
  const send = (key: Intent) => {
    const moved = step(session, key, [tool], 0, "es");
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
  const screen = () =>
    resolve(session, [tool], { language: "es", state: "connected", clock: "00:00", now: 0 }, { rows: 26 });
  const reasons = () => {
    const body = screen().body;
    return body.kind === "thread"
      ? body.events.filter(event => event.nested).map(event => event.text.map(span => span.text).join(""))
      : [];
  };
  return { send, screen, reasons, fail, reopen, session: () => session };
}
