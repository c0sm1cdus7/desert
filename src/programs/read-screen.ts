// Read through the same small windows and movement keys available to a person.
import type { Body, Row, Screen, ThreadEvent } from "../surface/contract.ts";
import type { Router } from "../surface/router.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { surfaceTexts } from "../texts/surface.texts.ts";
export const rowsIn = (body: Body): readonly Row[] => {
  if (body.kind === "list") return body.stacks.flatMap(stack => stack.rows);
  return body.kind === "thread" ? (body.options ?? []) : [];
};
const textOf = (event: ThreadEvent): string => event.text.map(span => span.text).join("");
const eventsIn = (body: Body): readonly ThreadEvent[] => (body.kind === "thread" ? body.events : []);
export const linesIn = (body: Body): readonly string[] => eventsIn(body).map(textOf);
const notesIn = (body: Body): readonly string[] =>
  eventsIn(body).flatMap(event => (event.nested ? [textOf(event)] : []));
export const unchangedIn = (body: Body): boolean =>
  rowsIn(body).some(row => row.off && row.detail === toolTexts.unchanged) ||
  notesIn(body).includes(toolTexts.unchanged);
export const reasonIn = (body: Body, cause: string): boolean => {
  const matches = (text = "") => text === cause || text.startsWith(`${cause} · `);
  const off = rowsIn(body).filter(row => row.off);
  return (
    off.some(row => matches(row.detail) || (body.kind === "list" && row.detail?.endsWith(` · ${cause}`))) ||
    notesIn(body).some(matches)
  );
};
export const errorIn = (body: Body, cause: string): boolean =>
  eventsIn(body).some(
    event => event.text.some(span => span.tone === "cut") && textOf(event) === `${surfaceTexts.error} ${cause}`,
  );
/** The full row count bounds movement; only the visible small window can supply evidence. */
export function readThrough(router: Router, test: (screen: Screen) => boolean, rows = 8): boolean {
  const full = router.screen({ rows: Number.MAX_SAFE_INTEGER }).body;
  const count = rowsIn(full).length + (full.kind === "list" ? full.stacks.length : 0) + 2;
  for (const kind of ["down", "up"] as const) {
    for (let step = 0; step <= count * 2; step++) {
      if (test(router.screen({ rows }))) return true;
      router.send({ kind });
    }
  }
  return test(router.screen({ rows }));
}
