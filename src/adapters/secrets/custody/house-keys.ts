import { randomBytes } from "node:crypto";
/** Composition owns this provider, outside the house directory. Missing keys must never be replaced. */
export interface HouseKeyProvider {
  key(house: string, create: boolean): Uint8Array;
}
export type CustodyCode =
  | "E-CUSTODY-KEY"
  | "E-CUSTODY-INTEGRITY"
  | "E-CUSTODY-STORAGE"
  | "E-CUSTODY-DENIED"
  | "E-CUSTODY-MISSING"
  | "E-CUSTODY-ADAPTER"
  | "E-CUSTODY-CONFLICT"
  | "E-CUSTODY-LEGACY"
  | "E-CUSTODY-LOCKED";
export class CustodyError extends Error {
  override readonly cause = undefined;
  readonly code: CustodyCode;
  constructor(code: CustodyCode) {
    super(code);
    this.name = "CustodyError";
    this.code = code;
  }
}
export class MemoryHouseKeys implements HouseKeyProvider {
  private readonly keys = new Map<string, Uint8Array>();
  key(house: string, create: boolean): Uint8Array {
    let key = this.keys.get(house);
    if (!key && create) {
      key = randomBytes(32);
      this.keys.set(house, key);
    }
    if (!key) throw new CustodyError("E-CUSTODY-KEY");
    return Uint8Array.from(key);
  }
}
