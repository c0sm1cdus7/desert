// Cheap requests share a connection's rolling window; live waits also have a fixed bound.
import { performance } from "node:perf_hooks";
import { socketLimits } from "../../catalogs/levers.ts";
export function requestBudget() {
  const arrivals: number[] = [];
  let waits = 0;
  return {
    take: (waiting: boolean) => {
      const now = performance.now();
      while (arrivals.length && now - (arrivals[0] ?? now) >= socketLimits.requestMs) arrivals.shift();
      if (arrivals.length >= socketLimits.requests || (waiting && waits >= socketLimits.waits)) return false;
      arrivals.push(now);
      if (waiting) waits++;
      return true;
    },
    finish: () => {
      waits--;
    },
  };
}
