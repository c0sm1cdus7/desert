import { CustodyError } from "./house-keys.ts";
import type { CredentialIngress, SecretRef, SecretRefs } from "./custody-contract.ts";
import type { CustodyState } from "./custody-state.ts";
import { retryCleanup } from "./custody-cleanup.ts";
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
export function checkMaterial(state: CustodyState, ref: SecretRef): void {
  const row = state.store.row(ref);
  if (row?.payload === null || row?.payload === undefined) throw new CustodyError("E-CUSTODY-MISSING");
  state.cipher.check(ref, row.payload);
  if (!state.cipher.present(ref)) throw new CustodyError("E-CUSTODY-KEY");
}
export function readMaterial(state: CustodyState, ref: SecretRef): Uint8Array {
  const row = state.store.row(ref);
  if (row?.payload === null || row?.payload === undefined) throw new CustodyError("E-CUSTODY-MISSING");
  return state.cipher.open(ref, row.payload);
}
export async function useMaterial<T>(
  state: CustodyState,
  session: CredentialIngress,
  slots: readonly string[],
  refs: SecretRefs,
  body: (material: Readonly<Record<string, Uint8Array>>) => T | Promise<T>,
): Promise<T> {
  authorizeRefs(state, session, refs, slots);
  const held = [...new Set(Object.values(refs))],
    buffers = new Map<SecretRef, Uint8Array>();
  held.forEach(ref => state.uses.set(ref, (state.uses.get(ref) ?? 0) + 1));
  try {
    for (const ref of held) {
      const buffer = readMaterial(state, ref);
      buffers.set(ref, buffer);
      state.buffers.add(buffer);
    }
    const material = Object.fromEntries(Object.entries(refs).map(([key, ref]) => [key, buffers.get(ref)]));
    const definite: Record<string, Uint8Array> = {};
    for (const [key, buffer] of Object.entries(material)) if (buffer) definite[key] = buffer;
    try {
      return await body(Object.freeze(definite));
    } catch {
      throw new CustodyError("E-CUSTODY-ADAPTER");
    }
  } finally {
    for (const buffer of buffers.values()) {
      buffer.fill(0);
      state.buffers.delete(buffer);
    }
    for (const ref of held) {
      const count = (state.uses.get(ref) ?? 1) - 1;
      if (count) state.uses.set(ref, count);
      else state.uses.delete(ref);
    }
    if (!state.closed) retryCleanup(state);
  }
}
