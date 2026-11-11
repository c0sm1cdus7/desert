// The one screen for where a session stands: every part of it comes from the tools or the words of the surface.
import { surfaceTexts as said } from "../texts/surface.texts.ts";
import type { Hint, Row, Screen } from "./contract.ts";
import type { Tool } from "./shown-tool.ts";
import { cursorOf, goneOf, stacksOf, type Choice } from "./lists.ts";
import { actOf, fieldOf, toolOf } from "./screen.ts";
import type { Bar, Session, Viewport } from "./screen.ts";
import { conversationOf, errorSpans, talkBody, talkHints, talkPanel, type Talk } from "./talk.ts";
import { walkBody, walkHints } from "./walk.ts";
import { must, windowed } from "./window.ts";

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
/** The one screen for where this session stands. */
export function resolve(session: Session, tools: readonly Tool[], bar: Bar, viewport: Viewport): Screen {
  const place = must(session.at(-1));
  const common = {
    state: bar.state,
    clock: bar.clock,
    ...(bar.battery ? { battery: bar.battery } : {}),
  };
  if (place.kind === "act") {
    const field = place.phase === "asking" ? fieldOf(tools, place) : null;
    const act = actOf(tools, place);
    const title = act.title() ?? act.label;
    const body = walkBody(place, field, bar.now);
    return { ...common, title, body, hints: walkHints(place, field, tools), menu: false };
  }
  if (place.kind === "talk") return { ...common, ...talkScreen(place, tools) };
  if (place.kind === "view" && goneOf(session, tools)) {
    const body = { kind: "thread", events: [{ text: errorSpans(said.gone) }] } as const;
    const hints = [{ intent: "cancel", does: said.keys.goBack }] as const;
    return { ...common, title: toolOf(tools, place.tool).name, body, hints, menu: true };
  }
  return { ...common, ...listScreen(place, tools, viewport) };
}
function listScreen(
  place: Extract<NonNullable<Session[number]>, { kind: "menu" | "view" }>,
  tools: readonly Tool[],
  viewport: Viewport,
): Pick<Screen, "title" | "body" | "hints" | "menu"> {
  const stacks = stacksOf(place, tools);
  if (place.kind === "view") toolOf(tools, place.tool).rendered?.(place.target);
  const cursor = cursorOf(place, tools);
  let index = -1;
  const pick = (row: Choice): Row => {
    if (row.off) return row;
    if (!row.open && !row.press) return { ...row, still: true };
    index += 1;
    if (index === cursor) return { ...row, selected: true };
    const { entry: _typing, ...resting } = row; // A control shows where you type only where you stand.
    return resting;
  };
  const marked = stacks.map(stack => ({ ...stack, rows: stack.rows.map(pick) }));
  const chosen = index >= 0;
  const k = said.keys;
  const moves: readonly Hint[] = chosen
    ? [
        { intent: "move", does: k.choose },
        { intent: "confirm", does: k.open },
      ]
    : [];
  const tool = place.kind === "view" ? toolOf(tools, place.tool) : undefined;
  const thing = place.kind === "view" && place.target !== undefined ? tool?.titleOf?.(place.target) : undefined;
  return {
    title: thing ?? tool?.name ?? said.menu,
    body: { kind: "list", stacks: windowed(marked, viewport.rows) },
    hints: place.kind === "menu" ? moves : [...moves, { intent: "cancel", does: k.goBack }],
    menu: place.kind !== "menu",
  };
}
