// Threads and their events, what opened beside, and one thing in the middle: which part is turned down.
import type { Attachment, Body, Panel, Span, ThreadEvent } from "../contract/contract.ts";
import { optionsPiece } from "./piece-rows.ts";
import { referenceNotice } from "./piece-notice.ts";
import { threadEntry } from "./piece-entry.ts";
import type { EventPiece, FocusPiece, PanelPiece, Text, ThreadPiece } from "./pieces.ts";

/** What an event carries, one line each: turned down whole unless it is the one lit. */
function attachedLine(muted: boolean, attachment: Attachment): Text {
  return muted && !attachment.selected
    ? [{ text: `${attachment.title} · ${attachment.detail}`, tone: "t3" }]
    : [
        { text: attachment.title, tone: "t1", bold: true },
        { text: ` · ${attachment.detail}`, tone: "t3" },
      ];
}
/** One event: a muted one says everything in the faintest tone, keeping what is bold and its real colours. */
export function eventPiece(event: ThreadEvent): EventPiece {
  const muted = event.muted ?? false;
  const quiet = (spans: readonly Span[]): Text => (muted ? spans.map(span => ({ ...span, tone: "t3" })) : spans);
  return {
    kind: "event",
    ...(event.head ? { head: quiet(event.head) } : {}),
    ...(event.quote ? { quote: { text: event.quote, tone: "t3" } } : {}),
    text: quiet(event.text),
    attached: (event.attachments ?? []).map(attachment => ({
      line: attachedLine(muted, attachment),
      lit: attachment.selected ?? false,
    })),
    lit: event.selected ?? false,
    indent: event.head !== undefined || event.nested === true,
    nested: event.nested ?? false,
  };
}
export const threadPiece = (body: Extract<Body, { kind: "thread" }>): ThreadPiece => ({
  kind: "thread",
  events: body.events.map(eventPiece),
  read: body.read ?? 0,
  ...(body.options ? { options: optionsPiece(body.options, body.more) } : {}),
  ...(body.reference ? { reference: referenceNotice(body.reference) } : {}),
  ...(body.entry ? { entry: threadEntry(body.entry) } : {}),
});
/** What opened beside: all of it turned down while it does not have the focus. */
export function panelPiece(panel: Panel): PanelPiece {
  const { focused } = panel;
  return {
    kind: "panel",
    title: { text: panel.title, tone: focused ? "t1" : "t3" },
    detail: { text: panel.detail ?? "", tone: "t3" },
    lines: panel.lines.map(line => (focused ? line : line.map(span => ({ ...span, tone: "t3" })))),
    focused,
    full: panel.full,
    top: panel.top,
  };
}
export const focusPiece = (body: Extract<Body, { kind: "focus" }>): FocusPiece => ({
  kind: "focus",
  title: { text: body.title, tone: "t1", bold: true },
  lines: body.lines,
});
