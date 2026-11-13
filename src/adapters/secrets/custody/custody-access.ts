import { CustodyError } from "./house-keys.ts";
import type { CredentialIngress, SecretRef, SecretRefs } from "./custody-contract.ts";
import type { CustodyState } from "./custody-state.ts";
import { collectCustody } from "./custody-cleanup.ts";
export function authorizeRefs(
  state: CustodyState,
  session: CredentialIngress,
  refs: SecretRefs,
  slots?: readonly string[],
): void {
  state.check(session);
  if (!Object.keys(refs).length || Object.values(refs).some(ref => !state.authorized(session, ref, slots)))
    throw new CustodyError("E-CUSTODY-DENIED");
}
export function readMaterial(state: CustodyState, ref: SecretRef): string {
  const row = state.store.rows().find(row => row.ref === ref);
  if (row?.payload === null || row?.payload === undefined) throw new CustodyError("E-CUSTODY-MISSING");
  return state.cipher.open(ref, row.payload);
}
export async function useMaterial<T>(
  state: CustodyState,
  session: CredentialIngress,
  slots: readonly string[],
  refs: SecretRefs,
  body: (material: Readonly<Record<string, string>>) => T | Promise<T>,
): Promise<T> {
  authorizeRefs(state, session, refs, slots);
  const held = [...new Set(Object.values(refs))];
  held.forEach(ref => state.uses.set(ref, (state.uses.get(ref) ?? 0) + 1));
  try {
    const material = Object.fromEntries(Object.entries(refs).map(([key, ref]) => [key, readMaterial(state, ref)]));
    try {
      return await body(Object.freeze(material));
    } catch {
      throw new CustodyError("E-CUSTODY-ADAPTER");
    }
  } finally {
    for (const ref of held) {
      const count = (state.uses.get(ref) ?? 1) - 1;
      if (count) state.uses.set(ref, count);
      else state.uses.delete(ref);
    }
    if (!state.closed) collectCustody(state);
  }
}
