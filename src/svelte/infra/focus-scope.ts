// Focus by key, without DOM. A foundation that can take focus (Row, Action, Card, Heading) registers a closure under the
// key it was given; a composition that must restore or move focus asks the scope by that key and never touches an element.
import { getContext, setContext } from "svelte";

export type FocusScope = Readonly<{
  /** Registers `focus` under `key` and returns its release; a later registration of the same key shadows it until that
   * later one is released (the piece mounted last answers, then the one it covered answers again). */
  register: (key: string, focus: () => boolean) => () => void;
  /** Focuses what is registered under `key`; false when nothing is, or when it could not take focus. */
  focus: (key: string) => boolean;
  /** Records that the piece under `key` was activated (opened, chosen), so a return can come back to it. */
  activated: (key: string) => void;
  /** The key last recorded by `activated`, or null before any activation. */
  lastActivated: () => string | null;
}>;

/** A fresh scope: one registry of focus closures (the registrations of each key, newest last) and one last-activated key. */
export function focusScope(): FocusScope {
  const targets = new Map<string, readonly (() => boolean)[]>();
  let last: string | null = null;
  return Object.freeze({
    register(key: string, focus: () => boolean) {
      targets.set(key, [...targets.get(key) ?? [], focus]);
      return () => {
        const rest = (targets.get(key) ?? []).filter(registered => registered !== focus);
        if (rest.length) targets.set(key, rest); else targets.delete(key);
      };
    },
    focus: (key: string) => targets.get(key)?.at(-1)?.() ?? false,
    activated(key: string) { last = key; },
    lastActivated: () => last,
  });
}

const key = Symbol("desert.focus-scope");

/** Opens a scope for the component subtree being initialised and returns it. */
export function provideFocusScope(): FocusScope {
  return setContext(key, focusScope());
}

/** The nearest scope opened above the component being initialised, if any. */
export function useFocusScope(): FocusScope | undefined {
  return getContext<FocusScope | undefined>(key);
}
