// The same assembled core includes every personal operation, even when Identidades is not requested.
import { personalTexts as words } from "../../texts/personal.texts.ts";
import type { ProgramTool } from "../promises.ts";
import type { Program, ToolRegistry } from "../tool-contract.ts";
import { personalAttendance, personalPreferences, personalScenes } from "./personal-actions.ts";
const trusted = new WeakSet<object>();
export const isPersonalTool = (tool: object) => trusted.has(tool);
function personalTool<X extends Program>(registry: ToolRegistry<X>): ProgramTool<X> {
  const tool: ProgramTool<X> = {
    id: "personal",
    purpose: words.purpose,
    facts: [],
    targets: () => [],
    summary: () => words.purpose,
    view: ({ house, by }) => JSON.stringify({ scene: house.scenes.get(by)?.data.general ?? "" }),
    acts: {
      ...personalScenes<X>(),
      ...personalPreferences<X>(),
      attend: personalAttendance(registry, false),
      unattend: personalAttendance(registry, true),
    },
  };
  trusted.add(tool);
  return tool;
}
export function personalRegistry<X extends Program>(registry: readonly ProgramTool<X>[]): readonly ProgramTool<X>[];
export function personalRegistry<X extends Program>(registry: ToolRegistry<X>): ToolRegistry<X>;
export function personalRegistry<X extends Program>(registry: ToolRegistry<X>) {
  const found = registry.filter(tool => tool.id === "personal");
  if (found.some(tool => !trusted.has(tool)) || found.length > 1) throw new Error("personal is reserved for the base");
  return found.length ? registry : [...registry, personalTool(registry)];
}
export const personalWords = {
  name: words.name,
  key: "u",
  system: true as const,
  itself: [{ title: words.general, empty: words.empty, reads: { scene: words.general } }],
};
export const withPersonalWords = <S extends { words: Readonly<Record<string, unknown>> }>(
  registry: readonly { id: string }[],
  shown: S,
): S =>
  registry.some(tool => tool.id === "personal")
    ? { ...shown, words: { ...shown.words, personal: personalWords } }
    : shown;
