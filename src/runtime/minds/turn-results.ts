// Tells a journey, between the calls of its turn, what each act did, the house clock and how the menu changed.
import type { Language } from "../../fields/languages.ts";
import { turnResults } from "../../texts/mind-turn.texts.ts";
import type { MindMenu, ProposedAct } from "../../tools/minds/mind-answer.ts";
export type ActReport = Readonly<{
  act: ProposedAct;
  status: "accepted" | "rejected" | "skipped";
  reason?: string;
  text?: string;
  value?: unknown;
}>;
/** A returned value longer than a mind's own text is cut, and the cut says how much was left out. */
const returnedLimit = 4000;
const key = (item: Readonly<{ act: string; target: string }>) => JSON.stringify([item.act, item.target]);
type Part = Parameters<typeof turnResults.text>[1]["part"];
function returned(value: unknown, say: (part: Part) => string): string[] {
  if (value === undefined) return [];
  const text = JSON.stringify(value);
  if (text.length <= returnedLimit) return [`   ${say("returned")} ${text}`];
  return [`   ${say("returned")} ${text.slice(0, returnedLimit)}`, `   ${say("cut")} ${text.length - returnedLimit}`];
}
function line(report: ActReport, index: number, say: (part: Part) => string): string[] {
  const head = `${index + 1}. ${report.act.act} → ${report.act.target}:`;
  if (report.status === "rejected") return [`${head} ${say("rejected")} ${report.reason ?? ""}`];
  if (report.status === "skipped") return [`${head} ${say("skipped")}`];
  return [`${head} ${say("accepted")}${report.text ? ` ${report.text}` : ""}`, ...returned(report.value, say)];
}
export function resultsText(
  language: Language,
  reports: readonly ActReport[],
  now: number,
  menus: Readonly<{ before: MindMenu; after: MindMenu }>,
): string {
  const say = (part: Part) => turnResults.text(language, { part });
  const known = new Set(menus.before.map(key));
  const kept = new Set(menus.after.map(key));
  return [
    say("heading"),
    ...reports.flatMap((report, index) => line(report, index, say)),
    `${say("now")} ${now} · ${new Date(now).toISOString()}`,
    ...menus.after.filter(item => !known.has(key(item))).map(item => `${say("added")} ${JSON.stringify(item)}`),
    ...menus.before.filter(item => !kept.has(key(item))).map(item => `${say("removed")} ${item.act} → ${item.target}`),
    say("goOn"),
  ].join("\n");
}
/** The supervisor's answer to a consultation, told to the mind in the same turn. */
export const consultationText = (language: Language, answer: string) =>
  `${turnResults.text(language, { part: "answer" })} ${answer}`;
