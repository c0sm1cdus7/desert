// Reveal by id, without DOM. A ViewRegion registers how to bring itself into view (and optionally take focus) under its
// id; a composition or the shell reveals a region by id and learns whether it was there, never querying the document.
import { getContext, setContext } from "svelte";

/** Brings a region into view, focusing it when `focus` is true; resolves false when it cannot. */
export type Reveal = (focus: boolean) => Promise<boolean>;

export type RegionRegistry = Readonly<{
  /** Registers `reveal` under `id` and returns its release; a later registration of the same id replaces it. */
  register: (id: string, reveal: Reveal) => () => void;
  /** Reveals the region registered under `id`; false when no region has that id. */
  reveal: (id: string, focus: boolean) => Promise<boolean>;
}>;

/** A fresh registry of region reveal closures. */
export function regionRegistry(): RegionRegistry {
  const regions = new Map<string, Reveal>();
  return Object.freeze({
    register(id: string, reveal: Reveal) {
      regions.set(id, reveal);
      return () => { if (regions.get(id) === reveal) regions.delete(id); };
    },
    reveal: async (id: string, focus: boolean) => {
      const reveal = regions.get(id);
      return reveal ? reveal(focus) : false;
    },
  });
}

const key = Symbol("desert.region-registry");

/** Opens a registry for the component subtree being initialised and returns it. */
export function provideRegionRegistry(): RegionRegistry {
  return setContext(key, regionRegistry());
}

/** The nearest registry opened above the component being initialised, if any. */
export function useRegionRegistry(): RegionRegistry | undefined {
  return getContext<RegionRegistry | undefined>(key);
}
