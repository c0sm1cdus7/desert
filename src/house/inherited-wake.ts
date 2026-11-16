// A legacy wake belongs to its historical identity; only the current administrator may retire it.
import { ids } from "./ids.ts";
import { effect } from "./facts.ts";
import type { Foreign } from "../journal/vocabulary.ts";
import type { Bus } from "../journal/bus.ts";
export function cancelInheritedWake<P extends Foreign>(
  state: () => { house: { admin: string }; wakeOwners: ReadonlyMap<string, string> },
  bus: Bus<P>,
  by: string,
  id: string,
) {
  const current = state();
  const owner = current.wakeOwners.get(id);
  if (!by || by !== current.house.admin || !owner || owner.startsWith(ids.mind))
    throw new Error("Solo quien administra puede cancelar un despertar heredado de una identidad");
  return bus.emit(effect("wake-at", { id, at: null }, by));
}
