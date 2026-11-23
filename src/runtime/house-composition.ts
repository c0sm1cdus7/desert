// Validate the complete core catalog, creation and mind composition before opening a house.
import { checkKitMigration } from "../house/kit-migration.ts";
import { creationFacts, houseStep } from "../house/members.ts";
import { requireMind } from "../fields/mind-errors.ts";
import { startState, type HouseOptions } from "../house/state.ts";
import { checkComposition } from "../tools/execution/composed-authority.ts";
import { coreRegistry } from "../tools/identities/identities.ts";
import type { Program } from "../tools/tool-contract.ts";
import { requireProjectionVersion } from "./house-projections.ts";
import type { ModelHouseOptions } from "./minds/mind-runtime-options.ts";
/** A part is kept under its tool's id: that is how the house gives a whole tool, or none of it, to an identity. */
function ownerless<X extends Program>({ slices, registry }: HouseOptions<X>): string[] {
  return Object.keys(slices.step).filter(part => !registry.some(tool => tool.id === part));
}
function checkComposedCreation<X extends Program>(options: HouseOptions<X>) {
  const { by, registry, creation } = options;
  const initial = startState(options.slices, by, options.identities, options.registry);
  const preview = creationFacts(creation).reduce(
    (house, each) =>
      houseStep(house, {
        ...each,
        id: "composition",
        seq: 0,
        at: 0,
      }),
    initial.house,
  );
  checkComposition(registry, { ...initial, house: preview }, options.own);
}
/** The composition as the house runs it, checked before anything opens. */
export function composed<X extends Program>(given: ModelHouseOptions<X>): ModelHouseOptions<X> {
  const options = {
    ...given,
    registry: coreRegistry(given.registry, given.by, given.identities, given.minds?.assistants, given.minds?.programs),
  };
  requireProjectionVersion(options.projectionVersion);
  if (options.minds) {
    const { assistants, programs } = options.minds;
    requireMind(typeof assistants === "boolean" && Array.isArray(programs), "minds");
    requireMind(!assistants || options.identities, "minds.identities");
    requireMind(new Set(programs).size === programs.length, "minds.duplicate");
    requireMind(
      programs.every(id => id !== "identities" && options.registry.some(tool => tool.id === id)),
      "minds.program",
    );
    requireMind(!(assistants || programs.length) || options.modelMinds, "minds.options");
  }
  if (options.kitMigration) checkKitMigration(options.kitMigration, options.registry);
  if (!options.by) throw new Error("An explicit identity is required");
  if (ownerless(options).length) throw new Error(`No tool keeps the parts ${ownerless(options).join(", ")}`);
  checkComposedCreation(options);
  return options;
}
