// The file host travels by context, never through a contract (P7): the product subtree provides one host, and the files
// foundation (today the file-control composition and Fields) reads it. The host is disposed with the subtree.
import { getContext, setContext, onDestroy } from "svelte";
import { LocalFileHost } from "./file-host.ts";

const key = Symbol("desert.file-host");

/** Provides a fresh host to the component subtree being initialised, disposed when that component is destroyed. */
export function provideFileHost(): LocalFileHost {
  const host = new LocalFileHost();
  setContext(key, host);
  onDestroy(() => host.dispose());
  return host;
}

/** The host provided above the component being initialised, if any. */
export function useFileHost(): LocalFileHost | undefined {
  return getContext<LocalFileHost | undefined>(key);
}
