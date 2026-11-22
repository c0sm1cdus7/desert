// Presents the four fixed layers and the variable content of the frame in the house language.
import type { Language } from "../../fields/languages.ts";
import { frameHouse, frameLabels, frameSection } from "../../texts/mind-frame.texts.ts";
import type { FrameItem, FrameSnapshot, MindFrame } from "./mind-frame.ts";
/** How many items of each cut section did not fit: the mind reads counts, never the ids of what is missing. */
export type OmittedCounts = Readonly<Partial<Record<"activity" | "objects" | "thread", number>>>;
const omittedLabels = { activity: 4, objects: 5, thread: 6 } as const;
const present = (value: unknown) => {
  if (value == null) throw new Error("Falta el argumento · snapshot");
};
export function renderMindFrame(snapshot: FrameSnapshot, language: Language, omitted: OmittedCounts = {}): MindFrame {
  present(snapshot);
  const labels = frameLabels.text(language, {}).split("|");
  const section = makeSection(labels, language);
  const render = (items: readonly FrameItem[]) => items.map(item => `${item.id}: ${item.text}`).join("\n");
  const skills = [...snapshot.skills]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(item => `${item.id}: ${item.skill.text(language, {})}`)
    .join("\n");
  const rules = [...snapshot.textRules]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(item => `${item.id}: ${item.text.text(language, {})}`)
    .join("\n");
  const layers = [
    frameHouse.text(language, {}),
    section(0, snapshot.definition.rules.text(language, {})),
    section(1, skills),
    section(2, rules),
  ] as const;
  const scope =
    snapshot.scope.kind === "journey" ? `${snapshot.scope.actor} / ${snapshot.scope.process}` : snapshot.scope.actor;
  const changing = [
    section(10, `${scope} / ${snapshot.through}`),
    section(3, snapshot.scene),
    section(4, render(snapshot.activity)),
    section(5, render(snapshot.objects)),
    section(6, render(snapshot.thread)),
    section(7, snapshot.woke ? snapshot.woke.join("\n") : snapshot.wake.join(", ")),
    section(8, snapshot.required),
    ...(snapshot.now === undefined ? [] : [section(11, `${snapshot.now} · ${new Date(snapshot.now).toISOString()}`)]),
    ...omittedSection(omitted, labels, section),
  ].join("\n\n");
  return { layers, changing };
}

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
function makeSection(labels: readonly string[], language: Language) {
  return (index: number, content: string) => {
    const name = labels[index];
    if (name === undefined) throw new Error("Rótulo de marco ausente");
    return frameSection.text(language, { name, content });
  };
}
