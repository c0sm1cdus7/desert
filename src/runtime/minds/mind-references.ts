// Shows long ids by a short reference and resolves the short references a mind gives back to the whole ids.
import type { MindMenu } from "../../tools/minds/mind-answer.ts";
const uuid = /\bjourney:([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gu;
const hash = /\b([0-9a-f]{8})[0-9a-f]{56}\b/gu;
/** A journey's id keeps its first eight hex digits; an event's or a thing's 64-hex id, its first eight, when it is one
 * the journal knows (`known`), so a digest a text carries stays whole. Any other id (a job's uuid an act takes as
 * input, a commit) stays whole. */
export const shortIds = (text: string, known?: ReadonlySet<string>): string =>
  text
    .replace(uuid, "journey:$1")
    .replace(hash, (whole: string, start: string) => (!known || known.has(whole) ? start : whole));
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
/** The whole id behind each short reference, when exactly one known id has it. */
export function referenceResolver(known: Iterable<string>): (reference: string) => string {
  const whole = new Map<string, string | null>();
  for (const id of known) {
    const short = shortIds(id);
    if (short === id) continue;
    const seen = whole.get(short);
    whole.set(short, seen === undefined || seen === id ? id : null);
  }
  return reference => whole.get(reference) ?? reference;
}
/** A target outside the menu that is the short reference of exactly one target of the same act becomes that one. */
function target(act: Record<string, unknown>, menu: MindMenu): unknown {
  const given = act.target;
  if (typeof given !== "string" || menu.some(item => item.act === act.act && item.target === given)) return given;
  const found = [
    ...new Set(menu.filter(item => item.act === act.act && shortIds(item.target) === given).map(item => item.target)),
  ];
  return found.length === 1 ? found[0] : given;
}
/** The answer with whole targets and whole references; anything else stays as the mind wrote it. */
export function resolveAnswer(value: unknown, menu: MindMenu, resolve: (reference: string) => string): unknown {
  if (!isRecord(value) || !Array.isArray(value.acts)) return value;
  const acts = value.acts.map((act: unknown) => {
    if (!isRecord(act)) return act;
    const input = act.input;
    const references =
      isRecord(input) && Array.isArray(input.references)
        ? {
            input: {
              ...input,
              references: input.references.map((each: unknown) => (typeof each === "string" ? resolve(each) : each)),
            },
          }
        : {};
    return { ...act, ...("target" in act ? { target: target(act, menu) } : {}), ...references };
  });
  return { ...value, acts };
}
