// A failed program has one public result; Activity keeps its technical detail for support.
import { inspect } from "node:util";
import { effect, type HouseEvent } from "../journal/events.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { OutsideDefect } from "./outside.ts";

export function defectEntry(
  error: unknown,
  by: string,
  tool: string,
  target: string,
  option: string,
  declared?: object,
) {
  const name: unknown = declared && Reflect.get(declared, "name");
  const reason = toolTexts.defect(typeof name === "string" ? name : `${tool}/${option}`);
  const detail = {
    action: option,
    target,
    thrown: inspect(error instanceof OutsideDefect ? error.detail : error, {
      depth: 5,
      getters: false,
      customInspect: false,
      compact: true,
      breakLength: Infinity,
    }),
  };
  const entry = { tool, target, author: by, text: reason, detail, diagnostic: `${option} · ${detail.thrown}` };
  return effect("tool-entry", entry, by);
}
export function programDefect(error: OutsideDefect, act: HouseEvent<"act">, tool: string, declared?: object) {
  const entry = defectEntry(error, act.by, tool, act.data.object, act.data.option, declared);
  return { status: "rejected" as const, reason: entry.data.text, defect: true as const, effects: [entry] };
}
