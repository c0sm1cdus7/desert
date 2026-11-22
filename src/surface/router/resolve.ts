// The one screen for where a session stands: every part of it comes from the tools or the words of the surface.
import { renewedMoney } from "../acts/money-memory.ts";
import { surfaceTexts as said } from "../../texts/surface.texts.ts";
import type { Body, Hint, Row, Screen } from "../contract/contract.ts";
import type { Tool } from "../contract/shown-tool.ts";
import { findable } from "../menus/finding.ts";
import { cursorOf, goneOf, stacksOf } from "../menus/lists.ts";
import {
  type Choice,
  type Listed,
  actOf,
  fieldOf,
  toolOf,
  type Bar,
  type Session,
  type Viewport,
} from "../session/screen.ts";

import { listIds, withId } from "../session/row-id.ts";
import { conversationOf, errorSpans, talkBody, talkHints, talkPanel, type Talk } from "../session/talk.ts";
import { walkBody, walkHints } from "../acts/walk.ts";
import { fitted, must, windowed } from "../session/window.ts";
function talkScreen(place: Talk, tools: readonly Tool[]): Pick<Screen, "title" | "body" | "panel" | "hints" | "menu"> {
  const tool = toolOf(tools, place.tool);
  const talk = conversationOf(tool, place.target);
  const panel = talkPanel(place, talk);
  const body = talkBody(place, talk);
  if (place.at < 0 && !panel?.full) tool.rendered?.(place.target);
  return {
    title: tool.name,
    body,
    ...(panel ? { panel } : {}),
    hints: talkHints(place, talk),
    menu: true,
  };
}
/** A question keeps its own line in view: its options take what is left of the room, and say how many do not fit.
 * Where what is said is a block of many lines (a preview), it keeps half the room: it is what is being read. */
function roomy(body: Body, rows: number, reading?: number): Body {
  if (body.kind !== "thread" || !body.options) return body;
  const breaks = (text: string): number => text.split("\n").length - 1;
  const said = body.events.reduce((sum, event) => sum + event.text.reduce((n, span) => n + breaks(span.text), 1), 0);
  return { ...body, ...fitted(body.options, Math.max(said > 3 ? Math.floor(rows / 2) : rows - 2, 3), reading) };
}
/** The one screen for where this session stands. */
export function resolve(session: Session, tools: readonly Tool[], bar: Bar, viewport: Viewport): Screen {
  const previous = must(session.at(-1));
  const place =
    previous.kind === "act"
      ? renewedMoney(previous, actOf(tools, previous).next, actOf(tools, previous).stops)
      : previous;
  // Showing an empty amount commits that observation to this device before another redraw or key.
  if (place !== previous) Object.assign(session, { [session.length - 1]: place });
  const common = {
    state: bar.state,
    clock: bar.clock,
    ...(bar.battery ? { battery: bar.battery } : {}),
  };
  if (place.kind === "act") {
    const field = place.phase === "asking" ? fieldOf(tools, place) : null;
    const act = actOf(tools, place);
    const title = act.title() ?? act.label;
    const body = roomy(walkBody(place, field, bar.now), viewport.rows, place.reading);
    return { ...common, title, body, hints: walkHints(place, field, tools), menu: false };
  }
  if (place.kind === "talk") {
    const talk = talkScreen(place, tools);
    return { ...common, ...talk, body: roomy(talk.body, viewport.rows) };
  }
  if (place.kind === "view" && goneOf(session, tools)) {
    const body = { kind: "thread", events: [{ text: errorSpans(said.gone) }] } as const;
    const hints = [{ intent: "cancel", does: said.keys.goBack }] as const;
    return { ...common, title: toolOf(tools, place.tool).name, body, hints, menu: true };
  }
  return { ...common, ...listScreen(place, tools, viewport) };
}
/** The rows of a list as drawn: the one the cursor is on, and each with what it is, read from the same lists the
 * keys move over, so what is drawn is what is chosen. */
function drawnRows(stacks: readonly Listed[], cursor: number) {
  let index = -1;
  const ids = listIds(stacks);
  const pick = (choice: Choice, id: string | undefined): Row => {
    const row = withId(choice, id);
    if (row.off) return row;
    if (!row.open && !row.press) return { ...row, still: true };
    index += 1;
    // Where the cursor stands, a control that shows where you type is being written in: it has no identity then.
    if (index === cursor) return { ...(row.entry ? withId(row, undefined) : row), selected: true };
    const { entry: _typing, ...resting } = row; // A control shows where you type only where you stand.
    return resting;
  };
  const marked = stacks.map((stack, s) => ({ ...stack, rows: stack.rows.map((row, r) => pick(row, ids[s]?.[r])) }));
  return { marked, chosen: index >= 0 };
}
function listScreen(
  place: Extract<NonNullable<Session[number]>, { kind: "menu" | "view" }>,
  tools: readonly Tool[],
  viewport: Viewport,
): Pick<Screen, "title" | "body" | "hints" | "menu"> {
  const stacks = stacksOf(place, tools);
  if (place.kind === "view") toolOf(tools, place.tool).rendered?.(place.target);
  const { marked, chosen } = drawnRows(stacks, cursorOf(place, tools));
  const k = said.keys;
  const moves: readonly Hint[] = chosen
    ? [
        { intent: "move", does: k.choose },
        { intent: "confirm", does: k.open },
      ]
    : [];
  const tool = place.kind === "view" ? toolOf(tools, place.tool) : undefined;
  const thing = place.kind === "view" && place.target !== undefined ? tool?.titleOf?.(place.target) : undefined;
  const seeks: readonly Hint[] = findable(place, tools) ? [{ intent: "find", does: k.find }] : [];
  const leaves: readonly Hint[] = place.kind === "menu" ? [] : [{ intent: "cancel", does: k.goBack }];
  const closes: readonly Hint[] = [{ intent: "cancel", does: k.close }];
  const hints = place.find === undefined ? [...moves, ...seeks, ...leaves] : [...moves, ...closes];
  return {
    title: thing ?? tool?.name ?? said.menu,
    body: { kind: "list", stacks: windowed(marked, viewport.rows, place.shift, place.reading) },
    hints,
    menu: place.kind !== "menu",
  };
}
