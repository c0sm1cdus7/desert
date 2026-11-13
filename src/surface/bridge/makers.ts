// A maker is available only when its own first question is answerable; a cycle of makers cannot create a first thing.
import type { ProgramTool } from "../../tools/promises.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { Option } from "../contract.ts";
import type { Tool } from "../shown-tool.ts";

export function makerOptions() {
  const checking = new Set<string>();
  return <X extends Program>(contract: ProgramTool<X>, tool: Tool, name: string): Option | undefined => {
    const act = contract.acts[name];
    if (act?.on !== "tool") throw new Error(`${tool.id} has no act ${name} that makes a thing of it`);
    const key = `${tool.id}/${name}`;
    if (checking.has(key)) return undefined;
    checking.add(key);
    try {
      if (tool.acts[name]?.off?.() !== undefined) return undefined;
      return { title: act.name, detail: act.purpose, key: act.key, makes: { tool: tool.id, act: name } };
    } finally {
      checking.delete(key);
    }
  };
}
