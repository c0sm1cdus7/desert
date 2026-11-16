import { readonlyState } from "../../../journal/readonly-state.ts";
// The same exact declaration is used for direct journal writes and read-only historical inspection.
import { actCatalog } from "../../../catalogs/acts.ts";
import { ids } from "../../../catalogs/ids.ts";
import { identityView } from "../../../house/house.ts";
import type { HouseOptions } from "../../../programs/house-runtime.ts";
import { targetTool } from "../../../tools/attendance.ts";
import type { Program, State } from "../../../tools/tool-contract.ts";
import { record } from "./secret-positions.ts";
export function declaredInput<X extends Program>(
  options: HouseOptions<X>,
  state: State<X>,
  event: Record<string, unknown>,
) {
  if (!record(event.data)) return undefined;
  const { object, option } = event.data;
  if (object === ids.self) {
    const builtin = Object.entries(actCatalog).find(([name]) => name === option);
    if (builtin) return builtin[1].input;
  }
  const by = String(event.by);
  const view = { ...identityView({ ...state, entries: [] }, by) };
  let entries: State<X>["entries"] | undefined;
  Object.defineProperty(view, "entries", {
    enumerable: true,
    get: () => (entries ??= identityView(state, by).entries),
  });
  const own = options.own?.(readonlyState(view)).find(act => act.object === object && act.option === option);
  const tool = own ? undefined : targetTool(options.registry, readonlyState(view), String(object));
  return (own ?? tool?.acts[String(option)])?.input;
}
