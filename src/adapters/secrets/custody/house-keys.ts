import { secretTexts } from "../../../texts/secrets/secrets.texts.ts";
import { randomBytes } from "node:crypto";
/** Composition owns this provider, outside the house directory. Missing keys must never be replaced. */
export interface HouseKeyProvider {
  /** Returns an owned copy: custody erases it after loading. */
  key(house: string, create: boolean): Uint8Array;
  forget(house: string): void;
}
export type CustodyCode =
  | "E-CUSTODY-KEY"
  | "E-CUSTODY-PROVIDER"
  | "E-CUSTODY-CLEANUP"
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
    const detail: Partial<Record<CustodyCode, string>> = {
      "E-CUSTODY-KEY": secretTexts.key,
      "E-CUSTODY-PROVIDER": secretTexts.provider,
    };
    super(detail[code] ? `${code}: ${detail[code]}` : code);
    this.name = "CustodyError";
    this.code = code;
  }
}
export class MemoryHouseKeys implements HouseKeyProvider {
  readonly #keys = new Map<string, Uint8Array>();
  forget(house: string): void {
    this.#keys.get(house)?.fill(0);
    this.#keys.delete(house);
  }
  key(house: string, create: boolean): Uint8Array {
    let key = this.#keys.get(house);
    if (!key && create) {
      key = randomBytes(32);
      this.#keys.set(house, key);
    }
    if (!key) throw new CustodyError("E-CUSTODY-KEY");
    return Uint8Array.from(key);
  }
}
