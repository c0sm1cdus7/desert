import type { Screen } from "../../surface/contract.ts";
/** A reason may change; the entire question, written value and navigation must stay identical. */
export function withReason(screen: Screen, reason: string | undefined, ignored = false): Screen {
  if (reason === undefined || screen.body.kind !== "thread") return screen;
  const advice = ignored ? { ignored: true as const } : {};
  const event = { nested: true, text: [{ text: reason, tone: "t3" as const }], ...advice };
  return {
    ...screen,
    body: {
      ...screen.body,
      events: [...screen.body.events.filter(event => (ignored ? !event.ignored : !event.nested)), event],
    },
  };
}
