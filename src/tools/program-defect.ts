// A failed program has one public result; Activity keeps its technical detail for support.
import { inspect } from "node:util";
import { effect, type HouseEvent } from "../journal/events.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import type { OutsideDefect } from "./outside.ts";

export function programDefect(error: OutsideDefect, act: HouseEvent<"act">, tool: string, declared?: object) {
  const { object: target, option } = act.data;
  const name: unknown = declared && Reflect.get(declared, "name");
  const reason = toolTexts.defect(typeof name === "string" ? name : `${tool}/${option}`);
  const detail = {
    action: option,
    target,
    thrown: inspect(error.detail, {
      depth: 5,
      getters: false,
      customInspect: false,
      compact: true,
      breakLength: Infinity,
    }),
  };
  const entry = { tool, target, author: act.by, text: reason, detail, diagnostic: `${option} · ${detail.thrown}` };
  return { status: "rejected" as const, reason, defect: true as const, effects: [effect("tool-entry", entry, act.by)] };
}
