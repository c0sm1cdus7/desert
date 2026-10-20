import { useSurfaceHost } from "./surface-host.svelte.ts";

export const PICKER_PANEL_REM = 24;
const VISIBLE_CONTEXT_REM = 4;

/** Anchoring needs space for the picker and readable surrounding context. */
export class PickerPresentation {
  #host = useSurfaceHost();
  #panelRem: number;
  #minimumBlockRem: number;
  constructor({ panelRem = PICKER_PANEL_REM, minimumBlockRem = 0 }: { panelRem?: number; minimumBlockRem?: number } = {}) {
    this.#panelRem = panelRem; this.#minimumBlockRem = minimumBlockRem;
  }
  get current(): "anchored" | "sheet" {
    const anchoredBudget = (this.#panelRem + VISIBLE_CONTEXT_REM) * this.#host.textSize;
    return this.#host.availableInline >= anchoredBudget
      && this.#host.availableBlock >= this.#minimumBlockRem * this.#host.textSize ? "anchored" : "sheet";
  }
}
