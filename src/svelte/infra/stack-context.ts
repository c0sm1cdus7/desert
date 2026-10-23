import { getContext, setContext } from "svelte";
const key = Symbol("desert.stack-title");
export function provideStackTitle(title: () => string | undefined): void { setContext(key, title); }
export function currentStackTitle(): () => string | undefined {
  return getContext<() => string | undefined>(key) ?? (() => undefined);
}
