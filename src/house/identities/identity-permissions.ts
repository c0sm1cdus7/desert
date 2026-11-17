// Calcula permisos de identidades sin depender de los asistentes que reciben su delegación.
import type { House } from "../members.ts";
/** A grant assigns a whole tool; its action kit is checked separately. */
export const allowed = (house: House, by: string, tool: string): boolean =>
  (house.identities === true && by === house.admin && house.grants.has(by)) ||
  house.grants.get(by)?.includes(tool) === true;
export function identityAllowedAct(house: House, by: string, tool: string, act: string): boolean {
  if (tool === "identities")
    return (
      house.identities === true &&
      (act === "scene" || act === "delegate-assistant" || by === house.admin) &&
      house.grants.has(by)
    );
  const kit = by === house.admin ? undefined : house.kits.get(by)?.get(tool);
  return allowed(house, by, tool) && (kit === undefined || kit === null || kit.includes(act));
}
