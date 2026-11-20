// Presenta las cuatro capas fijas y el contenido variable del marco en el idioma de la casa.
import type { Language } from "../../fields/languages.ts";
import { frameHouse, frameLabels, frameSection } from "../../texts/mind-frame.texts.ts";
import type { FrameItem, FrameSnapshot, MindFrame } from "./mind-frame.ts";
const present = (value: unknown) => {
  if (value == null) throw new Error("Falta el argumento · snapshot");
};
export function renderMindFrame(
  snapshot: FrameSnapshot,
  language: Language,
  omitted: readonly string[] = [],
): MindFrame {
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
    section(7, snapshot.wake.join(", ")),
    section(8, snapshot.required),
    ...(snapshot.now === undefined ? [] : [section(11, `${snapshot.now} · ${new Date(snapshot.now).toISOString()}`)]),
    ...(omitted.length ? [section(9, omitted.join(", "))] : []),
  ].join("\n\n");
  return { layers, changing };
}

function makeSection(labels: readonly string[], language: Language) {
  return (index: number, content: string) => {
    const name = labels[index];
    if (name === undefined) throw new Error("Rótulo de marco ausente");
    return frameSection.text(language, { name, content });
  };
}
