import { getContext, setContext } from "svelte";
import type { PlaceIdentity } from "./place-identity.ts";

const key = Symbol("destination-presentation-navigation");
export type DestinationPage = Readonly<{ id: string; identity: PlaceIdentity }>;
export type DestinationOrigin = Readonly<{ element: HTMLElement | null; scroll: number }>;
type Frame = DestinationPage & { origin: DestinationOrigin };
type Change = Readonly<{ destination: string; kind: "open" | "back"; origin: DestinationOrigin }>;
export type DestinationNavigation = {
  destination(): string;
  current(destination: string): DestinationPage | undefined;
  open(destination: string, page: DestinationPage, replace?: boolean): void;
  back(destination: string): void;
};

/** Presentation history is local to each workspace destination, never a product command. */
export function provideDestinationNavigation(destination: () => string, changed: (change: Change) => void): DestinationNavigation {
  let stacks = $state.raw<Readonly<Record<string, readonly Frame[]>>>({});
  const navigation: DestinationNavigation = {
    destination,
    current: id => stacks[id]?.at(-1),
    open(id, page, replace = false) {
      const previous = stacks[id] ?? [];
      if (previous.at(-1)?.id === page.id) return;
      const element = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const scroll = element?.closest<HTMLElement>("[data-catalog-scroll]")?.scrollTop ?? 0;
      const origin = replace && previous.length ? previous[0]!.origin : { element, scroll };
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
