import { getContext, setContext } from "svelte";

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
const headingOffset = Symbol("desert.renderer.heading-offset");

// Renderer compositions can embed a page without resetting their own outline.
// This is not authoring grammar: normal product pages always begin at level 1.
export function currentHeadingOffset(): number {
  return getContext<number>(headingOffset) ?? 0;
}

export function scopeHeadings(offset: number): void {
  setContext(headingOffset, currentHeadingOffset() + offset);
}
