// Mechanism action-pair (owned by bar): the bottom pair's one label size. A bar provides it, and each of its step Actions
// reports the size its own label needs (Action shrinks a label whose longest word cannot fit its line); both halves draw
// the smaller, so the pair reads as one.
import { getContext, setContext } from "svelte";
import { SvelteMap } from "svelte/reactivity";

const key = Symbol("desert.action-pair");
type Pair = SvelteMap<string, number>;

/** Called by a bar: its step Actions share one label size. */
export function provideActionPair(): void { setContext<Pair>(key, new SvelteMap()); }

/** Called by an Action: the label size it draws, the smallest any half of its pair needs (its own outside a pair). */
export function actionPairScale(id: string, own: () => number, inPair: () => boolean): { readonly current: number } {
  const pair = getContext<Pair | undefined>(key);
  $effect(() => {
    if (!pair || !inPair()) return;
    pair.set(id, own());
    return () => { pair.delete(id); };
  });
  return { get current() { return pair && inPair() ? Math.min(own(), ...pair.values()) : own(); } };
}
