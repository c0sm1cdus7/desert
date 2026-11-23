// Offers every mind the read act: a whole text in the same turn, which changes nothing and writes no fact.
import { Type } from "@sinclair/typebox";
import type { Language } from "../../fields/languages.ts";
import { object } from "../../fields/visible-text.ts";
import { frameReading } from "../../texts/mind-frame.texts.ts";
import type { JourneyMenu } from "../../tools/minds/journey-menu.ts";
export const readAct = "read";
export const readInput = object({ from: Type.Integer({ minimum: 0 }) });
/** What the read act reads besides each object: the activity older than the mind's last answer. Its target is a
 * stable id, the same whatever the frame's words call the section. */
export const activityTarget = "activity";
export function readMenu(language: Language, objects: readonly string[] = []): JourneyMenu {
  const purpose = frameReading.text(language, { part: "purpose", count: 0, id: "" });
  return [activityTarget, ...objects].map(target => ({
    tool: "mind",
    act: readAct,
    target,
    input: readInput,
    scope: "read" as const,
    purpose,
  }));
}
