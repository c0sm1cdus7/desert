// Presents the frame stable first: four fixed layers, the own thread's sealed blocks, then what changes.
import type { Language } from "../../fields/languages.ts";
import { frameHouse, frameLabels, frameReading, frameSection } from "../../texts/mind-frame.texts.ts";
import type { FrameItem, FrameSnapshot, MindFrame } from "./mind-frame.ts";
import { shortIds } from "./mind-references.ts";
/** How many items of each cut section did not fit: the mind reads counts, never the ids of what is missing. */
export type OmittedCounts = Readonly<Partial<Record<"activity" | "objects" | "thread", number>>>;
const omittedLabels = { activity: 4, objects: 5, thread: 6 } as const;
const present = (value: unknown) => {
  if (value == null) throw new Error("Falta el argumento · snapshot");
};
/** The own thread travels in sealed blocks of this many entries, each kept byte for byte from wake to wake; the newer
 * entries ride in the tail until they fill a block. */
const sealed = 8;
const sorted = <T extends Readonly<{ id: string }>>(items: readonly T[]) =>
  [...items].sort((a, b) => a.id.localeCompare(b.id));
/** Stable first: the house's words, the mind, its tools, the text rules and the menu; the last layer is cached. */
function stableLayers(snapshot: FrameSnapshot, language: Language, section: Section) {
  const skills = sorted(snapshot.skills).map(item => `${item.id}: ${item.skill.text(language, {})}`);
  const rules = sorted(snapshot.textRules).map(item => `${item.id}: ${item.text.text(language, {})}`);
  return [
    frameHouse.text(language, {}),
    section(0, snapshot.definition.rules.text(language, {})),
    section(1, skills.join("\n")),
    shortIds([section(2, rules.join("\n")), section(12, snapshot.menu)].join("\n\n")),
  ] as const;
}
export function renderMindFrame(snapshot: FrameSnapshot, language: Language, omitted: OmittedCounts = {}): MindFrame {
  present(snapshot);
  const labels = frameLabels.text(language, {}).split("|");
  const section = makeSection(labels, language);
  const render = (items: readonly FrameItem[]) => items.map(item => `${item.id}: ${item.text}`).join("\n");
  const whole = snapshot.thread.length - (snapshot.thread.length % sealed);
  const kept = Array.from({ length: whole / sealed }, (_, index) => {
    const lines = render(snapshot.thread.slice(index * sealed, (index + 1) * sealed));
    return shortIds(index ? lines : section(6, lines));
  });
  const scope =
    snapshot.scope.kind === "journey" ? `${snapshot.scope.actor} / ${snapshot.scope.process}` : snapshot.scope.actor;
  const changing = [
    section(10, `${scope} / ${snapshot.through}`),
    section(3, snapshot.scene),
    section(8, snapshot.required),
    section(5, quietLine(render(snapshot.objects), snapshot.quiet, language)),
    ...(kept.length && whole === snapshot.thread.length ? [] : [section(6, render(snapshot.thread.slice(whole)))]),
    section(4, olderLine(render(snapshot.activity), snapshot.older, language)),
    section(7, snapshot.woke ? snapshot.woke.join("\n") : snapshot.wake.join(", ")),
    ...(snapshot.now === undefined ? [] : [section(11, `${snapshot.now} · ${new Date(snapshot.now).toISOString()}`)]),
    ...omittedSection(omitted, labels, section),
  ].join("\n\n");
  return {
    layers: stableLayers(snapshot, language, section),
    ...(kept.length ? { kept } : {}),
    changing: shortIds(changing),
  };
}

/** Actividad says how many of its lines are older than the mind's last answer, and how to read them. */
const olderLine = (lines: string, older: number | undefined, language: Language) =>
  older
    ? [lines, frameReading.text(language, { part: "older", count: older, id: "" })].filter(Boolean).join("\n")
    : lines;
/** Objetos says how many listed things stayed rows of their list, and how to read one whole. */
const quietLine = (lines: string, quiet: number | undefined, language: Language) =>
  quiet
    ? [lines, frameReading.text(language, { part: "quiet", count: quiet, id: "" })].filter(Boolean).join("\n")
    : lines;
function omittedSection(
  omitted: OmittedCounts,
  labels: readonly string[],
  section: (index: number, content: string) => string,
): string[] {
  const counts = (["activity", "objects", "thread"] as const).flatMap(key => {
    const count = omitted[key] ?? 0;
    return count ? [`${labels[omittedLabels[key]] ?? key}: ${count}`] : [];
  });
  return counts.length ? [section(9, counts.join(" · "))] : [];
}
type Section = (index: number, content: string) => string;
function makeSection(labels: readonly string[], language: Language): Section {
  return (index: number, content: string) => {
    const name = labels[index];
    if (name === undefined) throw new Error("Rótulo de marco ausente");
    return frameSection.text(language, { name, content });
  };
}
