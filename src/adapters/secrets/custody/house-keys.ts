import { secretTexts } from "../../../texts/secrets/secrets.texts.ts";
import { randomBytes } from "node:crypto";
export type LedgerHead = Readonly<{ count: number; authentication: string }>;
/** Accounts are public identities, never paths. Every returned buffer transfers ownership to custody. */
export interface HouseKeyProvider {
  key(account: string, create: boolean): Uint8Array;
  has(account: string): boolean;
  head(house: string): LedgerHead | undefined;
  anchor(house: string, head: LedgerHead): void;
  forget(account: string): void;
  forgetHouse(house: string, known?: readonly string[]): void;
}
export type CustodyCode =
  | "E-CUSTODY-KEY"
  | "E-CUSTODY-PROVIDER"
  | "E-CUSTODY-CLEANUP"
  | "E-CUSTODY-INTEGRITY"
  | "E-CUSTODY-ROLLBACK"
  | "E-CUSTODY-FORMAT"
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
      "E-CUSTODY-ROLLBACK": secretTexts.rollback,
      "E-CUSTODY-FORMAT": secretTexts.format,
    };
    super(detail[code] ? `${code}: ${detail[code]}` : code);
    this.name = "CustodyError";
    this.code = code;
  }
}
export class MemoryHouseKeys implements HouseKeyProvider {
  readonly #keys = new Map<string, Uint8Array>();
  readonly #heads = new Map<string, LedgerHead>();
  has(account: string): boolean {
    return this.#keys.has(account);
  }
  head(house: string): LedgerHead | undefined {
    const head = this.#heads.get(house);
    return head && { ...head };
  }
  anchor(house: string, head: LedgerHead): void {
    this.#heads.set(house, { ...head });
  }
  forget(account: string): void {
    this.#keys.get(account)?.fill(0);
    this.#keys.delete(account);
  }
  forgetHouse(house: string): void {
    for (const account of this.#keys.keys()) if (account.startsWith(`${house}-secret-`)) this.forget(account);
    this.forget(house);
    this.#heads.delete(house);
  }
  key(account: string, create: boolean): Uint8Array {
    let key = this.#keys.get(account);
    if (!key && create) {
      key = randomBytes(32);
      this.#keys.set(account, key);
    }
    if (!key) throw new CustodyError("E-CUSTODY-KEY");
    return Uint8Array.from(key);
  }
}
