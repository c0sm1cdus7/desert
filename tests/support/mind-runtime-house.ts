// Lends a running house to opening preparation as a mind runtime house, for specs of its single steps.
import type { Event } from "../../src/journal/vocabulary.ts";
import type { RunningHouse } from "../../src/runtime/house-runtime.ts";
import type { MindRuntimeHouse } from "../../src/runtime/minds/mind-runtime-options.ts";
import type { Program } from "../../src/tools/tool-contract.ts";
export function mindRuntimeHouse<X extends Program>(house: RunningHouse<X>): MindRuntimeHouse<X> {
  const active = () => true;
  return {
    home: house.home,
    active,
    time: { now: house.now, wait: () => () => {} },
    failed: error => {
      throw error;
    },
    history: () => house.journal.replay<Event<X["fact"]>[]>([], (all, event) => [...all, event]),
    execution: {
      bus: house.bus,
      registry: house.registry,
      state: house.tools.state,
      own: () => [],
      process: () => false,
      live: active,
      now: house.now,
      secrets: { capture: () => {}, scrub: value => value },
    },
  };
}
