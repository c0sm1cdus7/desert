// Computes identity permissions without depending on the assistants that receive their delegation.
import { holderKit } from "../kit-history.ts";
import { toolOf, selects, type KitLayout } from "../kit-selection.ts";
import type { House } from "../members.ts";
/** A grant assigns a whole tool; its action kit is checked separately. */
export const allowed = (house: House, by: string, tool: string): boolean =>
  ((tool === "rules" || tool === "personal") && house.grants.has(by)) ||
  (house.identities === true && by === house.admin && house.grants.has(by)) ||
  (house.grants.has(by) &&
    (house.grants.get(by)?.includes(tool) === true ||
      holderKit(house, by).selections.some(selection => selection.program === tool)));
export function identityAllowedAct(
  house: House,
  by: string,
  tool: string,
  act: string,
  layout: KitLayout | undefined = house.kitLayout,
): boolean {
  if (tool === "personal") return house.grants.has(by);
  if (tool === "rules")
    return house.grants.has(by) && (!["save", "approve", "retire"].includes(act) || by === house.admin);
  if (tool === "identities")
    return (
      house.identities === true &&
      (act === "scene" ||
        act === "delegate-assistant" ||
        ["register-device", "accept-device", "retire-device"].includes(act) ||
        by === house.admin) &&
      house.grants.has(by)
    );
  if (!house.grants.has(by)) return false;
  if (by === house.admin) return house.identities === true || house.grants.get(by)?.includes(tool) === true;
  return selects(holderKit(house, by), tool, toolOf(tool, act, layout), act);
}
