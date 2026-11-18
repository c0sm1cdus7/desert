// Deriva roles y reglas de las mentes elegidas sin cargar pensamiento ni proveedores.
import { programMindRules } from "../../texts/program-mind.texts.ts";
import type { MindDefinition } from "../../tools/minds/mind-contract.ts";
import type { InstalledProgram } from "../../tools/installable/runtime.ts";
import type { InstallableProgram } from "../../tools/installable/program.ts";
export function programMindDefinitions(
  installed: readonly (InstalledProgram & { definition: InstallableProgram })[],
  enabled: readonly string[],
): readonly MindDefinition[] {
  return Object.freeze(
    installed
      .filter(item => enabled.includes(item.definition.id))
      .map(item =>
        Object.freeze({
          actor: `mind:${item.definition.id}` as const,
          role: `program:${item.definition.id}`,
          rules: {
            ...programMindRules,
            text: (language: Parameters<typeof programMindRules.text>[0]) =>
              programMindRules.text(language, {
                name: item.words.name,
                words: JSON.stringify({ program: item.words, tools: item.groups.map(group => group.palabras) }),
              }),
          },
          communication: [
            { tool: "mind", act: "message" },
            { tool: "mind", act: "scene" },
          ],
        }),
      ),
  );
}
