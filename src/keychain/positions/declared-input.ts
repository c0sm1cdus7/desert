// The same exact declaration is used for direct journal writes and read-only historical inspection.
import { isRecord } from "../../fields/json-values.ts";
import { readonlyState } from "../../journal/readonly-state.ts";
import { actCatalog } from "../../house/own-acts.ts";
import { ids } from "../../house/ids.ts";
import { identityView } from "../../house/members.ts";
import type { HouseOptions } from "../../house/state.ts";
import { targetTool } from "../../house/attendance.ts";
import type { Program, State } from "../../tools/tool-contract.ts";

export function declaredInput<X extends Program>(
  options: HouseOptions<X>,
  state: State<X>,
  event: Record<string, unknown>,
) {
  if (!isRecord(event.data)) return undefined;
  const { object, option } = event.data;
  if (typeof event.by !== "string" || typeof object !== "string" || typeof option !== "string") return undefined;
  if (object === ids.self) {
    const builtin = Object.entries(actCatalog).find(([name]) => name === option);
    if (builtin) return builtin[1].input;
  }
  const by = event.by;
  const view = { ...identityView({ ...state, entries: [] }, by) };
  let entries: State<X>["entries"] | undefined;
  Object.defineProperty(view, "entries", {
    enumerable: true,
    get: () => (entries ??= identityView(state, by).entries),
  });
  const own = options.own?.(readonlyState(view)).find(act => act.object === object && act.option === option);
  const tool = own ? undefined : targetTool(options.registry, readonlyState(view), object);
  return (own ?? tool?.acts[option])?.input;
}
