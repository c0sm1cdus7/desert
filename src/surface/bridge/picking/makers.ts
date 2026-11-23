// A maker is available only when its own first question is answerable; a cycle of makers cannot create a first thing.
import type { Language } from "../../../fields/languages.ts";
import { said } from "../../../fields/phrases.ts";
import type { ProgramTool } from "../../../tools/promises.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import type { Option } from "../../contract/contract.ts";
import type { Tool } from "../../contract/shown-tool.ts";
export function makerOptions() {
  const checking = new Set<string>();
  return <X extends Program>(
    contract: ProgramTool<X>,
    tool: Tool,
    name: string,
    language: Language,
  ): Option | undefined => {
    const act = contract.acts[name];
    if (act?.on !== "tool") throw new Error(`${tool.id} has no act ${name} that makes a thing of it`);
    const key = `${tool.id}/${name}`;
    if (checking.has(key)) return undefined;
    checking.add(key);
    try {
      if (tool.acts[name]?.off?.() !== undefined) return undefined;
      const title = said(act.name, language);
      return { title, detail: said(act.purpose, language), key: act.key, makes: { tool: tool.id, act: name } };
    } finally {
      checking.delete(key);
    }
  };
}
