import { getContext, setContext, onDestroy } from "svelte";
import { LocalFileHost } from "./file-host.ts";

const key = Symbol("desert.form-files");
export function provideFormFiles() {
  const host = new LocalFileHost();
  setContext(key, host);
  onDestroy(() => host.dispose());
  return host;
}
export function useFormFiles(): LocalFileHost | undefined {
  return getContext<LocalFileHost | undefined>(key);
}
