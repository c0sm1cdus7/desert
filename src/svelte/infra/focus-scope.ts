// Focus by key, without DOM. A foundation that can take focus (Row, Action, Card, Heading) registers a closure under the
// key it was given; a composition that must restore or move focus asks the scope by that key and never touches an element.
import { getContext, setContext } from "svelte";

export type FocusScope = Readonly<{
  /** Registers `focus` under `key` and returns its release; a later registration of the same key shadows the earlier ones
   * until it is released, and releasing it gives the key back to the earlier one still registered (two cards of one
   * record, one of them retained; an open search over the home card). A release removes only its own registration. */
  register: (key: string, focus: () => boolean) => () => void;
  /** Focuses what is registered under `key`, the newest registration first and, when it cannot take focus (it is hidden),
   * the one it covers; false when nothing is registered or nothing could take focus. */
  focus: (key: string) => boolean;
  /** Records that the piece under `key` was activated (opened, chosen), so a return can come back to it. */
  activated: (key: string) => void;
  /** The key last recorded by `activated`, or null before any activation. */
  lastActivated: () => string | null;
}>;

/** A fresh scope: one registry of focus closures (the registrations of each key, in order, newest last) and one
 * last-activated key. */
export function focusScope(): FocusScope {
  // Each registration is its own entry, so releasing one never removes another that registered the same closure.
  const targets = new Map<string, { readonly focus: () => boolean }[]>();
  let last: string | null = null;
  return Object.freeze({
    register(key: string, focus: () => boolean) {
      const entry = { focus }, registered = targets.get(key) ?? [];
      registered.push(entry); targets.set(key, registered);
      return () => {
        const index = registered.indexOf(entry);
        if (index !== -1) registered.splice(index, 1);
        if (registered.length === 0 && targets.get(key) === registered) targets.delete(key);
      };
    },
    focus: (key: string) => (targets.get(key) ?? []).toReversed().some(entry => entry.focus()),
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
