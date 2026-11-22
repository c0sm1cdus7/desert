// The guard of a stale look: an Enter is applied only where it means what it meant on the screen the person saw.
import { readFileSync } from "node:fs";
import { Value } from "@sinclair/typebox/value";
import { describe, expect, it } from "vitest";
import { spyDoor } from "../../../tests/support/screen-spy.ts";
import { wireScreensPath } from "../../../tests/support/wire-screens.ts";
import { chosenText } from "../../checks/surface-walk.ts";
import type { Hint, Intent, Row, Screen } from "../../surface/contract/contract.ts";
import { WireScreen } from "../../surface/contract/wire.ts";
import { commitmentOf } from "./guard.ts";
import type { Frame } from "./screen-wire.ts";

const view = { visible: true, viewport: { rows: 20 } };
const listOf = (rows: readonly Row[], clock = "10:00", does = "abrir"): Screen => ({
  title: "Ventas",
  state: "connected",
  clock,
  body: { kind: "list", stacks: [{ title: "Registradas", rows }] },
  hints: [{ intent: "confirm", does }],
  menu: true,
});
const threadOf = (text: string, hints: readonly Hint[], options?: readonly Row[]): Screen => ({
  title: "Registrar venta",
  state: "connected",
  clock: "10:00",
  body: {
    kind: "thread",
    events: [
      {
        text: [
          { text: "Procesando", tone: "t2" },
          { text, tone: "t3" },
        ],
      },
    ],
    ...(options ? { options } : {}),
  },
  hints,
  menu: false,
});
const plain = [{ title: "Venta 1", selected: true }, { title: "Venta 2" }];
const moved = [{ title: "Venta 3", selected: true }, { title: "Venta 1" }, { title: "Venta 2" }];
const yes = [{ title: "Sí", selected: true }];
/** A door whose router shows one screen at the first look and another when the batch arrives. */
async function sentOver(before: Screen, after: Screen, intents: readonly Intent[]) {
  const screens = { before, after };
  const { door, houses } = spyDoor(undefined, text => (text === "after" ? screens.after : screens.before));
  const seen = await door.look("s", "h", view);
  const spy = houses[0];
  if (spy) spy.state.text = "after";
  const body = { epoch: seen.epoch, client: seen.client, seq: 1, rev: seen.rev, intents };
  const frame: Frame = await door.send("s", "h", body);
  return { frame, sent: spy?.counts.send };
}
describe("a stale look", () => {
  const confirm = [{ kind: "confirm" }] as const;
  const cases: readonly (readonly [string, Screen, Screen, readonly Intent[], string | undefined])[] = [
    ["the clock alone changed", listOf(plain), listOf(plain, "10:01"), confirm, undefined],
    ["a running count moved", threadOf(" · 1 s", []), threadOf(" · 2 s", []), confirm, undefined],
    ["a row came in above the cursor", listOf(plain), listOf(moved), confirm, "stale"],
    [
      "Enter says another word",
      threadOf("", [{ intent: "confirm", does: "continuar" }], yes),
      threadOf("", [{ intent: "confirm", does: "record" }], yes),
      confirm,
      "stale",
    ],
    ["a batch moves and then confirms", listOf(plain), listOf(moved), [{ kind: "down" }, ...confirm], "stale"],
  ];
  it.each(cases)("S6: %s", async (_, before, after, intents, refused) => {
    const { frame, sent } = await sentOver(before, after, intents);
    expect([frame.refused, sent]).toEqual([refused, refused ? 0 : intents.length]);
    if (refused) expect(frame.screen.body).toEqual(after.body);
  });
  it("S6: applies, on a screen that moved, every intent that commits to nothing on it", async () => {
    const free: readonly Intent[] = [
      { kind: "type", text: "x" },
      { kind: "erase" },
      { kind: "up" },
      { kind: "down" },
      { kind: "left" },
      { kind: "right" },
      { kind: "cancel" },
      { kind: "menu" },
      { kind: "switch" },
      { kind: "paste", text: "texto" },
    ];
    const { frame, sent } = await sentOver(listOf(plain), listOf(moved), free);
    expect([frame.refused, sent]).toEqual([undefined, free.length]);
  });
});
describe("a stale look: the ring, and what is chosen", () => {
  it("S6: refuses an Enter over a rev older than the ring, though the screen means the same", async () => {
    const { door, houses } = spyDoor(undefined, text => listOf(plain, text));
    const first = await door.look("s", "h", view);
    const spy = houses[0];
    let last = first;
    for (let minute = 1; minute <= 64; minute++) {
      if (spy) spy.state.text = `10:${String(minute).padStart(2, "0")}`;
      last = await door.look("s", "h", { ...view, client: first.client });
    }
    expect(last.rev - first.rev).toBe(64);
    const enter = (frame: Frame, seq: number) => ({
      epoch: frame.epoch,
      client: frame.client,
      seq,
      rev: frame.rev,
      intents: [{ kind: "confirm" }],
    });
    const old = await door.send("s", "h", enter(first, 1));
    const fresh = await door.send("s", "h", enter(last, 1));
    expect([old.refused, fresh.refused, spy?.counts.send]).toEqual(["stale", undefined, 1]);
  });
  it("names what is chosen as the conformance kit does, on every golden screen", () => {
    const golden: unknown = JSON.parse(readFileSync(wireScreensPath, "utf8"));
    const entries: unknown[] =
      typeof golden === "object" && golden !== null && "screens" in golden && Array.isArray(golden.screens)
        ? golden.screens
        : [];
    const screens = entries.flatMap(entry =>
      typeof entry === "object" && entry !== null && "screen" in entry && Value.Check(WireScreen, entry.screen)
        ? [entry.screen]
        : [],
    );
    expect(screens.length).toBeGreaterThan(50);
    const differ = screens.filter(screen => commitmentOf(screen).chosen !== chosenText(screen));
    expect(differ).toEqual([]);
  });
});
const first = { title: "Venta 1", id: "one", selected: true };
const second = { title: "Venta 2", id: "two", detail: "$ 10" };
const two = [first, second];
const down = [
  { ...first, title: "Venta 4", id: "cuatro" },
  { title: "Venta 3", id: "tres" },
  { ...first, selected: false },
];
const choose = [{ kind: "choose", row: "two" }] as const;
/** A batch that points at a row, the screen it was sent over, the screen when it arrives, and the refusal if any. */
const pointedCases: readonly (readonly [string, Screen, Screen, readonly Intent[], string | undefined])[] = [
  ["the row moved down two places", listOf(two), listOf([...down, second]), choose, undefined],
  ["the row's datum changed", listOf(two), listOf([first, { ...second, detail: "$ 20" }]), choose, undefined],
  ["Enter says another word, the row is there", listOf(two), listOf(two, "10:00", "ver"), choose, undefined],
  [
    "the row moved, after a move in the batch",
    listOf(two),
    listOf([...down, second]),
    [{ kind: "up" }, ...choose],
    undefined,
  ],
  [
    "an Enter after a choose, on a screen nobody saw yet",
    listOf(two),
    listOf(two),
    [...choose, { kind: "confirm" }],
    "stale",
  ],
  ["a second choose after a choose", listOf(two), listOf(two), [...choose, { kind: "choose", row: "one" }], "stale"],
  [
    "a move after a choose, which commits to nothing",
    listOf(two),
    listOf(two),
    [...choose, { kind: "down" }],
    undefined,
  ],
  ["the row is gone", listOf(two), listOf([first]), choose, "stale"],
  ["the title changed", listOf(two), { ...listOf(two), title: "Compras" }, choose, "stale"],
  ["the row was never on the screen seen", listOf([first]), listOf(two), choose, "stale"],
  [
    "the row is there, but an Enter in the batch now lands elsewhere",
    listOf(two),
    listOf([...down, second]),
    [...choose, { kind: "confirm" }],
    "stale",
  ],
];
describe("a stale look: a row pointed at by its identity", () => {
  it.each(pointedCases)("S6: %s", async (_, before, after, intents, refused) => {
    const { frame, sent } = await sentOver(before, after, intents);
    expect([frame.refused, sent]).toEqual([refused, refused ? 0 : intents.length]);
  });
  it("S6: refuses a choose over a rev older than the ring, though the row is still there", async () => {
    const { door, houses } = spyDoor(undefined, text => listOf(two, text));
    const seen = await door.look("s", "h", view);
    const spy = houses[0];
    let last = seen;
    for (let minute = 1; minute <= 64; minute++) {
      if (spy) spy.state.text = `10:${String(minute).padStart(2, "0")}`;
      last = await door.look("s", "h", { ...view, client: seen.client });
    }
    const pointed = ({ epoch, client, rev }: Frame) => ({ epoch, client, seq: 1, rev, intents: choose });
    const old = await door.send("s", "h", pointed(seen));
    const fresh = await door.send("s", "h", pointed(last));
    expect([old.refused, fresh.refused, spy?.counts.send]).toEqual(["stale", undefined, 1]);
  });
});
