// The kit against a plain-text renderer: the right one passes everywhere; each broken one fails exactly its check.
import { describe, expect, it } from "vitest";
import { walked } from "../../tests/support/surface-tools.ts";
import type { HintKey, Intent, Screen } from "../surface/contract/contract.ts";
import { hintSends } from "../surface/contract/hint-sends.ts";
import { conformance, type Drawn, type Failure } from "./renderer-conformance.ts";
import { chosenText, mainTexts, panelTexts } from "./surface-walk.ts";

type Check = Failure["check"];

const stops = await walked();
const screens = stops.map(stop => stop.screen);
const hintKeys = Object.keys(hintSends).filter((key): key is HintKey => key in hintSends);
/** The fake renderer names its controls after their hints, and its Menu control "menu": its own catalog. */
const catalog = [...hintKeys, "menu"];
const sendsOf = (hint: HintKey): readonly Intent[] => {
  const sends = hintSends[hint];
  return sends === "move" ? [{ kind: "up" }, { kind: "down" }] : [sends];
};
/** A renderer that draws every text of the screen as one line of plain text, in the contract's order. */
const draw = (screen: Screen): Drawn => ({
  bar: [`${screen.title} ${screen.clock}${screen.battery ? ` ${screen.battery}` : ""}`],
  main: screen.panel?.full ? [] : mainTexts(screen),
  ...(screen.panel ? { panel: panelTexts(screen) } : {}),
  toolbar: [...(screen.menu ? ["menu"] : []), ...screen.hints.map(hint => `${hint.intent} ${hint.does}`)],
  marked: [chosenText(screen) ?? ""],
  state: screen.state,
  menu: screen.menu,
  controls: screen.hints.map(hint => ({ hint: hint.intent, name: hint.intent, sends: sendsOf(hint.intent) })),
});
const checksOf = (screen: Screen, drawn: Drawn): readonly Check[] => [
  ...new Set(conformance(screen, drawn, catalog).map(failure => failure.check)),
];
const squeeze = (text: string): string => text.replace(/\s+/gu, "");
/** A text of the main part that nothing else there contains: dropping or moving it has to be seen. */
const lone = (screen: Screen, text: string): boolean =>
  squeeze(text) !== "" && mainTexts(screen).filter(other => squeeze(other).includes(squeeze(text))).length === 1;
const listed = (screen: Screen): readonly string[] =>
  screen.body.kind === "list" && !screen.panel?.full
    ? screen.body.stacks.flatMap(stack => stack.rows.map(row => row.title)).filter(title => lone(screen, title))
    : [];
type Broken = (screen: Screen, drawn: Drawn) => Drawn | undefined;
const without = (lines: readonly string[], text: string): readonly string[] => lines.filter(line => line !== text);
const broken: Readonly<Record<string, readonly [Check, Broken]>> = {
  "drops a row": [
    "shows-every-text-in-order",
    (screen, drawn) => {
      const title = listed(screen)[0];
      return title === undefined ? undefined : { ...drawn, main: without(drawn.main, title) };
    },
  ],
  "swaps two rows with different texts": [
    "shows-every-text-in-order",
    (screen, drawn) => {
      const [a, b] = listed(screen);
      if (a === undefined || b === undefined || a === b) return undefined;
      const swapped = (line: string): string => {
        if (line === a) return b;
        return line === b ? a : line;
      };
      return { ...drawn, main: drawn.main.map(swapped) };
    },
  ],
  "marks nothing": ["marks-the-chosen", (screen, drawn) => (chosenText(screen) ? { ...drawn, marked: [] } : undefined)],
  "adds the word Bienvenido": ["adds-no-words", (_, drawn) => ({ ...drawn, main: [...drawn.main, "Bienvenido"] })],
  "draws a control with no hint, named from the catalog": [
    "a-control-iff-its-hint",
    (screen, drawn) => {
      const hint = hintKeys.find(key => !screen.hints.some(known => known.intent === key));
      if (hint === undefined) return undefined;
      const control = { hint, name: hint, sends: sendsOf(hint) };
      return { ...drawn, toolbar: [...drawn.toolbar, hint], controls: [...drawn.controls, control] };
    },
  ],
  "omits a hinted control while drawing its word": [
    "a-control-iff-its-hint",
    (screen, drawn) => (screen.hints.length ? { ...drawn, controls: drawn.controls.slice(1) } : undefined),
  ],
  "a control sends another intent": [
    "control-sends-what-it-says",
    (_, drawn) => {
      const [first, ...rest] = drawn.controls;
      return first ? { ...drawn, controls: [{ ...first, sends: [{ kind: "quit" }] }, ...rest] } : undefined;
    },
  ],
  "leaves the title out": [
    "title-in-bar",
    (screen, drawn) => (squeeze(screen.title) ? { ...drawn, bar: [screen.clock] } : undefined),
  ],
  "draws the Menu control where the screen offers none": [
    "menu-iff-offered",
    (screen, drawn) => (screen.menu ? undefined : { ...drawn, menu: true, toolbar: ["menu", ...drawn.toolbar] }),
  ],
  "draws another state": [
    "shows-the-state",
    (screen, drawn) => ({ ...drawn, state: screen.state === "connected" ? "disconnected" : "connected" }),
  ],
};

describe("the renderer conformance kit", () => {
  it("passes a renderer that draws what it is handed, on every walked screen", () => {
    expect(stops.length).toBeGreaterThan(50);
    const failing = screens.flatMap(screen => conformance(screen, draw(screen), catalog));
    expect(failing).toEqual([]);
  });
  for (const [name, [check, breaking]] of Object.entries(broken)) {
    it(`fails exactly ${check} for a renderer that ${name}`, () => {
      const tried = screens.flatMap(screen => {
        const drawn = breaking(screen, draw(screen));
        return drawn ? [checksOf(screen, drawn)] : [];
      });
      expect(tried.length, name).toBeGreaterThan(0);
      expect(tried.filter(checks => checks.length !== 1 || checks[0] !== check)).toEqual([]);
    });
  }
});
