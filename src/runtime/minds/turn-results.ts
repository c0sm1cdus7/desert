// Tells a journey, between the calls of its turn, what each act did, the house clock and how the menu changed.
import type { Language } from "../../fields/languages.ts";
import { cutText } from "../../fields/text-cut.ts";
import { turnResults } from "../../texts/mind-turn.texts.ts";
import { menuItemLine } from "./mind-frame-menu.ts";
import { shortIds } from "./mind-references.ts";
import type { MindMenu, ProposedAct } from "../../tools/minds/mind-answer.ts";
export type ActReport = Readonly<{
  act: ProposedAct;
  status: "accepted" | "rejected" | "skipped";
  reason?: string;
  text?: string;
  value?: unknown;
  /** A text the read act brought: told as it reads, not as JSON. */
  page?: string;
}>;
/** A returned value longer than a mind's own text is cut by whole characters, and the cut says how many it left. */
const returnedLimit = 4000;
const key = (item: Readonly<{ act: string; target: string }>) => JSON.stringify([item.act, item.target]);
type Part = Parameters<typeof turnResults.text>[1]["part"];
function returned(report: ActReport, say: (part: Part) => string): string[] {
  if (report.value === undefined && report.page === undefined) return [];
  const text = report.page ?? JSON.stringify(report.value);
  const kept = cutText(text, returnedLimit);
  if (kept.length === text.length) return [`   ${say("returned")} ${text}`];
  return [`   ${say("returned")} ${kept}`, `   ${say("cut")} ${Array.from(text.slice(kept.length)).length}`];
}
function line(report: ActReport, index: number, say: (part: Part) => string): string[] {
  const head = `${index + 1}. ${report.act.act} → ${report.act.target}:`;
  if (report.status === "skipped") return [`${head} ${say("skipped")}`];
  const status = report.status === "rejected" ? `${say("rejected")} ${report.reason ?? ""}` : say("accepted");
  return [`${head} ${status}${report.text ? ` ${report.text}` : ""}`, ...returned(report, say)];
}
/** A journey is told its turn goes on; a consciousness, which answers once, hears only what its acts did. */
export function resultsText(
  language: Language,
  reports: readonly ActReport[],
  now: number,
  menus: Readonly<{ before: MindMenu; after: MindMenu }>,
  goesOn = true,
): string {
  const say = (part: Part) => turnResults.text(language, { part });
  const known = new Set(menus.before.map(key));
  const kept = new Set(menus.after.map(key));
  return [
    say("heading"),
    ...reports.flatMap((report, index) => line(report, index, say)),
    `${say("now")} ${now} · ${new Date(now).toISOString()}`,
    ...menus.after
      .filter(item => !known.has(key(item)))
      .map(item => `${say("added")} ${menuItemLine([item], language)}`),
    ...menus.before.filter(item => !kept.has(key(item))).map(item => `${say("removed")} ${item.act} → ${item.target}`),
    ...(goesOn ? [say("goOn")] : []),
  ]
    .map(shortIds)
    .join("\n");
}
/** The supervisor's answer to a consultation, told to the mind in the same turn. */
export const consultationText = (language: Language, answer: string) =>
  `${turnResults.text(language, { part: "answer" })} ${answer}`;
