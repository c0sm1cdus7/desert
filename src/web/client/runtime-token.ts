// Runtime-local identity tokens: strings unique within one page runtime, never a product ID, never persisted or sent.
// Strings, not object identities, so a contract can carry them (P7) while equality still means "the same instance".
let minted = 0;

/** A fresh token naming one runtime-local identity, prefixed by what it names (`reading-3`, `owner-7`). */
export function runtimeToken(kind: string): string {
  minted += 1;
  return `${kind}-${minted}`;
}
