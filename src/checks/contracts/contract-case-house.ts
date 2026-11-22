// Prepare a real provider house and its consumer kit without invoking a model or external service.
import { Value } from "@sinclair/typebox/value";
import { rmSync } from "node:fs";
import { effect } from "../../house/facts.ts";
import { selectionKitSchema } from "../../house/kit-selection.ts";
import { startState } from "../../house/state.ts";
import { systemTool } from "../../house/system-tools.ts";
import type { Event } from "../../journal/vocabulary.ts";
import { MemoryHouseKeys } from "../../keychain/custody/house-keys.ts";
import { contractHistory } from "../../runtime/contracts/contract-history.ts";
import { startHouse } from "../../runtime/house-runtime.ts";
import type { Composition } from "../../tools/promises.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { promiseHome } from "../promise-temporaries.ts";
export function prepareContractHouse<X extends Program>(program: Composition<X>, actor: string, preparation: unknown) {
  const home = promiseHome();
  const registry = program.registry;
  const tools = registry.filter(tool => !systemTool(tool.id)).map(tool => tool.id);
  const identities = [...new Set(["ana", "beto", actor])];
  const house = startHouse(
    home,
    {
      ...program,
      minds: { assistants: false, programs: [] },
      by: "house",
      secretKeys: new MemoryHouseKeys(),
      creation: { admin: "ana", assignments: identities.map(identity => ({ identity, tools })) },
    },
    { now: () => 1, wait: () => () => {} },
  );
  const close = () => {
    house.close();
    rmSync(home, { recursive: true, force: true });
  };
  try {
    prepareKit(house, actor, preparation);
    return {
      engine: house.tools,
      history: replayContract(program, house),
      close,
      ports: {
        bus: house.bus,
        registry: house.registry,
        state: house.tools.state,
        now: house.now,
        secrets: { capture: () => {}, scrub: <T>(value: T) => value },
      },
    };
  } catch (error) {
    close();
    throw error;
  }
}
function prepareKit<X extends Program>(house: ReturnType<typeof startHouse<X>>, actor: string, preparation: unknown) {
  if (preparation !== undefined && preparation !== null) {
    if (!Value.Check(selectionKitSchema, preparation)) throw new Error("Unsupported contract preparation");
    if (actor === "ana") throw new Error("Contract preparation cannot restrict the administrator");
    house.bus.emit(effect("kit-set", { version: 2, holder: actor, kit: preparation }, "ana"));
  }
}

function replayContract<X extends Program>(program: Composition<X>, house: ReturnType<typeof startHouse<X>>) {
  return contractHistory(startState(program.slices, "house", program.identities, house.registry), program.slices, () =>
    house.journal.replay<Event<X["fact"]>[]>([], (events, event) => [...events, event]),
  );
}
