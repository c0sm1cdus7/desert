// Rebuilds exact cuts from confirmed facts without replacing them with the current state.
import { toolsStep } from "../../house/state.ts";
import { readonlyState } from "../../journal/readonly-state.ts";
import type { Event } from "../../journal/vocabulary.ts";
import type { Program, Slices, State } from "../../tools/tool-contract.ts";
export type ContractHistory<X extends Program> = Readonly<{
  at: (sequence: number) => State<X> | undefined;
  events: (sequence: number) => readonly Event<X["fact"]>[];
}>;
export function contractHistory<X extends Program>(
  initial: State<X>,
  slices: Slices<X>,
  read: () => readonly Event<X["fact"]>[],
): ContractHistory<X> {
  const events = (sequence: number) => read().filter(event => event.seq <= sequence);
  return {
    events,
    at: sequence => {
      if (!Number.isSafeInteger(sequence) || sequence < initial.through) return undefined;
      let state = initial;
      for (const event of events(sequence)) {
        if (event.seq <= initial.through) continue;
        if (event.seq !== state.through + 1) return undefined;
        state = toolsStep(state, event, slices);
      }
      return state.through === sequence ? readonlyState(state) : undefined;
    },
  };
}
