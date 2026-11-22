// Touching equals the keys: choosing a row by its identity leaves the session the person's own keys would leave.
import { describe, expect, it } from "vitest";
import { replayed, surfaceWalk, type Stop } from "../../checks/surface-walk.ts";
import { pointedTools } from "../../../tests/support/pointed-tools.ts";
import { fresh, walked } from "../../../tests/support/surface-tools.ts";
import type { Intent, Row, Screen } from "../contract/contract.ts";
import type { Tool } from "../contract/shown-tool.ts";
import { wire } from "../contract/wire.ts";
import { fieldOf, type Session } from "../session/screen.ts";
import { journalTexts } from "../../texts/journal.texts.ts";
import { surfaceTexts } from "../../texts/surface.texts.ts";
import { withOpeningNotices } from "../bridge/assembly/opening-notices.ts";
import { resolve } from "./resolve.ts";
import { startRouter } from "./router.ts";
import { step } from "./step.ts";

const bar = { state: "connected", clock: "14:32", now: 5_000 } as const;
/** Room enough for every row: the keys are moved over the whole list, not over what fits. */
const all = { rows: 100_000 };
const shown = { rows: 52 };
const rowsOf = ({ body }: Screen): readonly Row[] => {
  if (body.kind === "list") return body.stacks.flatMap(stack => stack.rows);
  return body.kind === "thread" ? (body.options ?? []) : [];
};
type Kind =
  "menu or view" | "a control" | "search" | "one" | "confirm" | "many" | "pick" | "makes" | "conversation" | "other";
/** Which row of the table of places this choice stands in. */
function kindOf(session: Session, tools: readonly Tool[], id: string): Kind {
  const place = session.at(-1);
  const first = /^\["([a-z]+)"/u.exec(id)?.[1];
  if (place?.kind === "talk") return first === "other" ? "other" : "conversation";
  if (place?.kind === "act") {
    const field = fieldOf(tools, place);
    if (field?.kind === "pick") return first === "makes" ? "makes" : "pick";
    if (field?.kind === "many" || field?.kind === "one") return field.kind;
    return "confirm";
  }
  if (place?.find !== undefined) return "search";
  return first === "press" ? "a control" : "menu or view";
}
/** Brings the options or the list back into view, as a person does before moving: Enter where the list was moved
 * or read back, one move where what was said is read back (it returns without moving). */
function back(session: Session, tools: readonly Tool[]): Session {
  const place = session.at(-1);
  const moved = place !== undefined && place.kind !== "talk" && place.reading !== undefined;
  const shifted = place && (place.kind === "menu" || place.kind === "view") && (place.shift ?? 0) !== 0;
  const returned = moved || shifted ? step(session, { kind: "confirm" }, tools, bar.now).session : session;
  const there = returned.at(-1);
  return there?.kind === "act" && there.read ? step(returned, { kind: "down" }, tools, bar.now).session : returned;
}
/** The keys from the same start: back into view, then up or down until that row is the chosen one. */
function moved(session: Session, tools: readonly Tool[], id: string): Session {
  let now = back(session, tools);
  /** The row is found once, where it stands: «other» loses its identity as soon as it is the one being written. */
  const target = rowsOf(resolve(now, tools, bar, all)).findIndex(row => row.id === id);
  for (let tries = 0; ; tries += 1) {
    const rows = rowsOf(resolve(now, tools, bar, all));
    const selected = rows.findIndex(row => row.selected);
    /** Where «other» is being written, the cursor is on it: it is drawn as where one writes, not as chosen. */
    const chosen = selected >= 0 ? selected : rows.findIndex(row => row.entry !== undefined);
    if (target === chosen) return now;
    if (tries > rows.length) throw new Error(`the keys never reach ${id}`);
    now = step(now, { kind: target < chosen ? "up" : "down" }, tools, bar.now).session;
  }
}
const takes = (kind: Kind): readonly Intent[] => {
  if (kind === "other") return [];
  return kind === "many" ? [{ kind: "type", text: " " }] : [{ kind: "confirm" }];
};
/** Both ways from one path, each on its own fresh tools: what each ends in, and what each shows then, as it travels:
 * the controls a tool hands over are closures of its own instance, never the same function twice. */
async function bothWays(make: () => readonly Tool[], path: readonly Intent[], id: string) {
  const [one, two] = [make(), make()];
  const touched = await replayed(one, [{ kind: "choose", row: id }], await replayed(one, path));
  const start = await replayed(two, path);
  const kind = kindOf(start, two, id);
  const keyed = await replayed(two, takes(kind), moved(start, two, id));
  return {
    kind,
    touched,
    keyed,
    shows: [wire(resolve(touched, one, bar, shown)), wire(resolve(keyed, two, bar, shown))],
  };
}
async function compared(make: () => readonly Tool[], stops: readonly Stop[]) {
  const counts = new Map<Kind, number>();
  for (const { path, screen } of stops)
    for (const id of rowsOf(screen).flatMap(row => (row.id ? [row.id] : []))) {
      const { kind, touched, keyed, shows } = await bothWays(make, path, id);
      expect(shows[0], `${JSON.stringify(path)} ${id}`).toEqual(shows[1]);
      expect(touched, `${JSON.stringify(path)} ${id}`).toEqual(keyed);
      counts.set(kind, (counts.get(kind) ?? 0) + 1);
    }
  return counts;
}
const kinds: readonly Kind[] = [
  "menu or view",
  "a control",
  "search",
  "one",
  "confirm",
  "many",
  "pick",
  "makes",
  "conversation",
  "other",
];

describe("touching equals the keys", () => {
  it("on every golden path and every row it can choose, and on the paths of the pointed tools", async () => {
    const golden = await compared(fresh, await walked());
    const pointed = await compared(pointedTools, await surfaceWalk(pointedTools, shown.rows, 120));
    const table = kinds.map(kind => `${kind}: ${golden.get(kind) ?? 0} golden, ${pointed.get(kind) ?? 0} pointed`);
    console.log(`(path, id) pairs compared, by kind of place:\n${table.join("\n")}`);
    expect(kinds.filter(kind => !golden.get(kind) && !pointed.get(kind))).toEqual([]);
  }, 600_000);
});

const choose = (row: string): Intent => ({ kind: "choose", row });
const idOf = (session: Session, tools: readonly Tool[], title: string): string => {
  const row = rowsOf(resolve(session, tools, bar, all)).find(each => each.title === title);
  return row?.id ?? "";
};
describe("a choose has no path of its own", () => {
  it("leaves the session as it was for an id no row has, and for the one an off row would have", async () => {
    const tools = pointedTools();
    const view = await replayed(tools, [{ kind: "type", text: "c" }]);
    expect(idOf(view, tools, "cerrar")).toBe("");
    for (const row of ["nada", JSON.stringify(["act", "boxes", "closed", null, 0, null])])
      expect(step(view, choose(row), tools, bar.now)).toEqual({ session: view });
  });
  it("marks and unmarks an option of a multiple question, as space does", async () => {
    const tools = fresh();
    const asked = await replayed(tools, [
      { kind: "type", text: "e" },
      { kind: "type", text: "n" },
    ]);
    const pan = idOf(asked, tools, "Pan");
    const once = step(asked, choose(pan), tools, bar.now).session;
    expect(once.at(-1)).toMatchObject({ marks: ["Pan"] });
    expect(step(once, choose(pan), tools, bar.now).session).toEqual(asked);
  });
  it("closes a search and opens what it found, as Enter does", async () => {
    const tools = fresh();
    const path: readonly Intent[] = [
      { kind: "type", text: "e" },
      { kind: "type", text: " " },
      { kind: "type", text: "P" },
    ];
    const seeking = await replayed(tools, path);
    const touched = step(seeking, choose(idOf(seeking, tools, "Pan")), tools, bar.now).session;
    expect(touched).toEqual(await replayed(fresh(), [...path, { kind: "confirm" }]));
    expect(touched.at(-2)).not.toHaveProperty("find");
  });
});
describe("a choose has no path of its own: acts", () => {
  it("starts the act that makes a new thing, and what it makes answers the question", async () => {
    const tools = pointedTools();
    const asked = await replayed(tools, [
      { kind: "type", text: "c" },
      { kind: "type", text: "g" },
    ]);
    const making = await replayed(tools, [choose(JSON.stringify(["makes", "boxes", "make"]))], asked);
    expect(making.at(-1)).toMatchObject({ kind: "act", act: "make", returns: true });
    const typed = Array.from("Roja", (text): Intent => ({ kind: "type", text }));
    const made = await replayed(tools, [...typed, { kind: "confirm" }, { kind: "cancel" }], making);
    expect(made.at(-1)).toMatchObject({ kind: "act", act: "pickOne", answers: ["b2"], phase: "done" });
  });
  it("does nothing while an act runs and on its result", async () => {
    const tools = pointedTools();
    const asked = await replayed(tools, [
      { kind: "type", text: "c" },
      { kind: "type", text: "g" },
    ]);
    const blue = idOf(asked, tools, "Caja azul");
    const running = step(asked, { kind: "confirm" }, tools, bar.now).session;
    expect(running.at(-1)).toMatchObject({ phase: "running" });
    expect(step(running, choose(blue), tools, bar.now)).toEqual({ session: running });
    const done = await replayed(tools, [{ kind: "confirm" }], asked);
    expect(done.at(-1)).toMatchObject({ phase: "done" });
    expect(step(done, choose(blue), tools, bar.now)).toEqual({ session: done });
  });
});
describe("a choose has no path of its own: screens that take nothing", () => {
  it("does nothing on the defect screen nor on the opening notices", () => {
    const boxes = JSON.stringify(["view", "boxes", null]);
    const broken: Tool = {
      id: "broken",
      name: "Rota",
      place: { key: "x", section: "tools" },
      summary: () => "",
      view: () => {
        throw new Error("rota");
      },
      acts: {},
    };
    const first: Session = [
      { kind: "menu", at: 0 },
      { kind: "view", tool: "broken", at: 0 },
    ];
    const tools = [...pointedTools(), broken];
    const failing = startRouter({ tools, bar: () => bar, first, defect: () => "falló" });
    expect(failing.screen(shown).title).toBe(surfaceTexts.error);
    failing.send(choose(boxes));
    failing.send({ kind: "cancel" });
    expect(failing.screen(shown).title).toBe(surfaceTexts.menu);
    const told = withOpeningNotices(startRouter({ tools, bar: () => bar, defect: () => "falló" }), ["Aviso"]);
    told.send(choose(boxes));
    expect(told.screen(shown).title).toBe(journalTexts.opening);
    told.send({ kind: "confirm" });
    expect(told.screen(shown).title).toBe(surfaceTexts.menu);
    [failing, told].forEach(router => router.stop());
  });
});
