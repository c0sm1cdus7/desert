// Conserva el alcance histórico de otorgamientos y restricciones al reconstruir selecciones.
import { migrateKit } from "./kit-migration.ts";
import type { House } from "./members.ts";
import type { HouseEvent } from "./facts.ts";
import { selectionKit, type SelectionKit, type Selection } from "./kit-selection.ts";
export function holderKit(house: House, holder: string): SelectionKit {
  return migrateKit(storedHolderKit(house, holder), house.kitMigration);
}
export function storedHolderKit(house: House, holder: string): SelectionKit {
  const current = house.selections?.get(holder);
  if (current) return current;
  const own = holder.startsWith("mind:") ? holder.slice(5) : undefined;
  const programs = own ? [own] : (house.grants.get(holder) ?? []);
  return selectionKit(
    programs.flatMap(program => {
      const previous = house.kits.get(holder);
      const absent = own ? [] : undefined;
      return historicalBranch(program, previous?.has(program) ? previous.get(program) : absent);
    }),
  );
}
function historicalBranch(program: string, acts?: readonly string[] | null): Selection[] {
  return acts === undefined || acts === null
    ? [{ kind: "tool", program, tool: program }]
    : acts.map(action => ({ kind: "action", program, tool: program, action }));
}
export function selectionStep(house: House, event: HouseEvent): House {
  if (event.by !== house.admin) return house;
  const selections = new Map(house.selections);
  if (event.kind === "removed" && event.data.identity !== house.admin) selections.delete(event.data.identity);
  else if (event.kind === "handed" && house.kits.has(event.data.to)) selections.delete(event.data.to);
  else if (event.kind === "granted") {
    grantSelections(house, event, selections);
  } else if (event.kind === "kit-set") {
    const { holder } = event.data;
    const own = holder.startsWith("mind:") ? holder.slice(5) : undefined;
    if (holder === house.admin || holder.startsWith("assistant:") || (!own && !house.grants.has(holder))) return house;
    if ("version" in event.data) {
      if (
        event.data.kit.selections.some(
          selection => selection.program === "identities" || (own && own !== selection.program),
        )
      )
        return house;
      selections.set(holder, event.data.kit);
    } else {
      const { tool, acts } = event.data;
      if (tool === "identities" || (own ? own !== tool : !house.grants.get(holder)?.includes(tool))) return house;
      const rest = storedHolderKit(house, holder).selections.filter(selection => selection.program !== tool);
      selections.set(holder, selectionKit([...rest, ...historicalBranch(tool, acts)]));
    }
  } else return house;
  return { ...house, selections };
}

function grantSelections(house: House, event: HouseEvent<"granted">, selections: Map<string, SelectionKit>): void {
  const { identity } = event.data;
  if ("version" in event.data) selections.set(identity, event.data.kit);
  else {
    const prior = storedHolderKit(house, identity).selections;
    const held = house.grants.get(identity) ?? [];
    selections.set(
      identity,
      selectionKit(
        event.data.tools
          .filter(program => program !== "identities")
          .flatMap(program =>
            held.includes(program)
              ? prior.filter(selection => selection.program === program)
              : historicalBranch(program),
          ),
      ),
    );
  }
}
