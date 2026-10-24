// Presentation history local to each workspace destination (a component page opened inside the bank), never a product
// command. Nonvisual: where focus and scroll were when a page opened is data the provider captures (a focus key and a
// scroll offset); restoring them on the way back is the host's (the shell's) DOM work.
import { getContext, setContext } from "svelte";
import type { PlaceIdentity } from "./place-identity.ts";

const key = Symbol("destination-presentation-navigation");
export type DestinationPage = Readonly<{ id: string; identity: PlaceIdentity }>;
export type DestinationOrigin = Readonly<{ focusKey: string | null; scroll: number }>;
type Frame = DestinationPage & { origin: DestinationOrigin };
type Change = Readonly<{ destination: string; kind: "open" | "back"; origin: DestinationOrigin }>;
export type DestinationNavigation = {
  destination(): string;
  current(destination: string): DestinationPage | undefined;
  open(destination: string, page: DestinationPage, replace?: boolean): void;
  back(destination: string): void;
};

/** Opens the history for the subtree. `capture` reads the origin a page returns to; `changed` restores it. */
export function provideDestinationNavigation(destination: () => string, capture: () => DestinationOrigin,
  changed: (change: Change) => void): DestinationNavigation {
  let stacks = $state.raw<Readonly<Record<string, readonly Frame[]>>>({});
  const navigation: DestinationNavigation = {
    destination,
    current: id => stacks[id]?.at(-1),
    open(id, page, replace = false) {
      const previous = stacks[id] ?? [];
      if (previous.at(-1)?.id === page.id) return;
      const origin = replace && previous.length ? previous[0]!.origin : capture();
      stacks = { ...stacks, [id]: [...(replace ? [] : previous), { ...page, origin }] };
      changed({ destination: id, kind: "open", origin });
    },
    back(id) {
      const previous = stacks[id] ?? [], frame = previous.at(-1);
      if (!frame) return;
      stacks = { ...stacks, [id]: previous.slice(0, -1) };
      changed({ destination: id, kind: "back", origin: frame.origin });
    },
  };
  setContext(key, navigation);
  return navigation;
}

export const destinationNavigation = () => getContext<DestinationNavigation | undefined>(key);
