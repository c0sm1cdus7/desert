// What an act made: the things that were not there before it and are there once its facts are in.
import { programCall } from "../fields/program-call.ts";
import type { Emission } from "../journal/facts.ts";
import type { HouseEmission } from "../house/facts.ts";
import type { Program, State, ToolRegistry } from "./tool-contract.ts";
type Having<X extends Program> = Readonly<{ registry: ToolRegistry<X>; state: () => State<X> }>;
const isEntry = (each: Emission): each is HouseEmission<"tool-entry"> =>
  each.layer === "house" && each.kind === "tool-entry";
/** Every thing every tool has now. */
const thingsOf = <X extends Program>(ports: Having<X>): readonly string[] => {
  const state = ports.state();
  return ports.registry.flatMap(tool => programCall(tool.targets.bind(tool), state));
};
/** Asked before the act's facts are written, it writes what the act made with what the act says: every thing that
 * was not there then and is there when its entry is written, besides the one it was done to. Each of them reads it
 * in its own record. Anything else it is given goes on as it is. */
export function making<X extends Program>(ports: Having<X>) {
  const before = new Set(thingsOf(ports));
  return <E extends Emission>(each: E): E => {
    if (!isEntry(each) || each.data.draft === true) return each;
    const made = thingsOf(ports).filter(thing => !before.has(thing) && thing !== each.data.target);
    return made.length ? { ...each, data: { ...each.data, made } } : each;
  };
}
