import type { ViewProgram } from "../views/program-schema.ts";
import type { Frozen } from "../json.ts";
import type { ExposureDefinition } from "../program-grammar.ts";
import type { ModuleEntryKind } from "./types.ts";
import { entryKinds, entryIds, journeyId, productOwner, type Owner } from "./ownership.ts";
import { publishedActionsFor } from "../views/program-bindings.ts";

type CatalogEntry = { id: string; owner: string; public: boolean };
/** Inspection data is derived from the same registered definitions, never a parallel inventory. */
export function deriveModuleIndex(owners: readonly Owner[], program: ViewProgram, surfaces: readonly Frozen<ExposureDefinition>[]) {
  const entries = Object.fromEntries(entryKinds.map(kind => [kind, owners.flatMap(owner =>
    entryIds(owner.definition, kind).map(id => ({ id, owner: owner.id,
      public: owner.id === productOwner || owner.exports?.[kind]?.includes(id) === true }))),
  ])) as Record<ModuleEntryKind, CatalogEntry[]>;
  const commands = new Map<string, { id: string; owner: string; journeys: string[] }>();
  for (const owner of owners) for (const registration of owner.definition.journeys ?? []) {
    if (registration.execution?.kind !== "mutation") continue;
    const id = registration.execution.command.id;
    const command = commands.get(id) ?? { id, owner: owner.id, journeys: [] };
    command.journeys.push(journeyId(registration));
    commands.set(id, command);
  }
  const journeys = owners.flatMap(owner => (owner.definition.journeys ?? []).map(registration => {
    const id = journeyId(registration);
    const presentation = program.journeys.find(item => item.id === id);
    return {
      id, owner: owner.id, kind: presentation?.kind ?? "execution-only" as const,
      ...(presentation && "view" in presentation ? { view: presentation.view } : {}),
      ...(presentation?.kind === "activity" ? { activity: presentation.activity } : {}),
      ...(presentation?.kind === "read" ? { detailView: presentation.detailView,
        subjectActions: publishedActionsFor(program, presentation) } : {}),
      ...(presentation && "source" in presentation ? { source: presentation.source } : {}),
      starts: program.destinations.filter(item => item.entryJourney === id).map(item => item.id),
      outputs: presentation?.outputs ?? [],
      exposedOn: surfaces.filter(surface => surface.journeys.includes(id)).map(surface => surface.id),
    };
  }));
  return {
    catalog: { modules: owners.filter(owner => owner.id !== productOwner).map(owner => owner.id), ...entries, commands: [...commands.values()] },
    storyboard: { entry: program.entry, navigation: program.navigation, destinations: program.destinations, journeys },
  };
}
