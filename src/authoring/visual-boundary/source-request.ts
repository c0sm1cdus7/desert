import { isCSSRequest } from "vite";

/** Bundler query/fragment suffixes do not change a request's visual owner. */
export const requestPath = (specifier: string): string => specifier.split(/[?#]/, 1)[0]!;

/** Use the installed builder's stylesheet languages, not a second extension list. */
export const isStylesheetRequest = (specifier: string): boolean => isCSSRequest(requestPath(specifier));

export const isPrivateVisualRequest = (specifier: string): boolean =>
  /\/vendor\/|@lucide\/|bits-ui/.test(requestPath(specifier)) || isStylesheetRequest(specifier);
