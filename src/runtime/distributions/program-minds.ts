// Derives the roles and rules of the chosen minds without loading thinking or providers.
import { programMindRules } from "../../texts/program-mind.texts.ts";
import type { MindDefinition } from "../../tools/minds/mind-contract.ts";
import type { InstalledProgram } from "../../tools/installable/runtime.ts";
import type { InstallableProgram } from "../../tools/installable/program.ts";
type Installed = readonly (InstalledProgram & { definition: InstallableProgram })[];
/** Minds say things only through the programs that carry messages, such as a communicator (signed 20/11). */
export function talkActs(installed: Installed): readonly Readonly<{ tool: string; act: string }>[] {
  return installed.flatMap(item =>
    (item.definition.messages?.acts ?? []).map(act => {
      if (!Object.hasOwn(item.tool.acts, act)) throw new Error(`mensajes.actos: ${item.definition.id} ${act}`);
      return { tool: item.definition.id, act };
    }),
  );
}
export function programMindDefinitions(installed: Installed, enabled: readonly string[]): readonly MindDefinition[] {
  const talk = talkActs(installed);
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
                talks: item.definition.messages !== undefined,
                words: JSON.stringify({ program: item.words, tools: item.groups.map(group => group.words) }),
              }),
          },
          communication: [{ tool: "mind", act: "scene" }, ...talk],
        }),
      ),
  );
}
