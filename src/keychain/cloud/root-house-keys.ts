// Derives keys from the root; anchors share the journal's disk and cannot detect a whole-disk restore.
import { hkdfSync } from "node:crypto";
import { CustodyError, type HouseKeyProvider, type LedgerHead } from "../custody/house-keys.ts";
import { checkAccount, checkHead, readKeyMetadata, writeKeyMetadata } from "./key-metadata.ts";
const salt = "desert.house-custody.hkdf.v1";
/** The caller retains its input. This provider owns one root copy until the host disposes it. */
export class RootHouseKeys implements HouseKeyProvider {
  readonly #root: Buffer;
  readonly #home: string;
  #disposed = false;
  constructor(root: Uint8Array, home: string) {
    if (!(root instanceof Uint8Array) || root.length !== 32) throw new CustodyError("E-CUSTODY-KEY");
    this.#root = Buffer.from(root);
    this.#home = home;
  }
  private using<T>(account: string, work: () => T): T {
    try {
      if (this.#disposed) throw new CustodyError("E-CUSTODY-KEY");
      checkAccount(account);
      return work();
    } catch {
      throw new CustodyError("E-CUSTODY-KEY");
    }
  }
  key(account: string, create: boolean): Uint8Array {
    return this.using(account, () => {
      const metadata = readKeyMetadata(this.#home);
      if (!metadata.accounts.includes(account)) {
        if (!create) throw new CustodyError("E-CUSTODY-KEY");
        metadata.accounts.push(account);
        writeKeyMetadata(this.#home, metadata);
      }
      return Buffer.from(hkdfSync("sha256", this.#root, salt, account, 32));
    });
  }
  has(account: string): boolean {
    return this.using(account, () => readKeyMetadata(this.#home).accounts.includes(account));
  }
  head(house: string): LedgerHead | undefined {
    return this.using(house, () => readKeyMetadata(this.#home).heads.find(([account]) => account === house)?.[1]);
  }
  anchor(house: string, head: LedgerHead): void {
    this.using(house, () => {
      checkHead(head);
      const metadata = readKeyMetadata(this.#home);
      metadata.heads = metadata.heads.filter(([account]) => account !== house);
      metadata.heads.push([house, { ...head }]);
      writeKeyMetadata(this.#home, metadata);
    });
  }
  forget(account: string): void {
    this.using(account, () => {
      const metadata = readKeyMetadata(this.#home);
      metadata.accounts = metadata.accounts.filter(value => value !== account);
      writeKeyMetadata(this.#home, metadata);
    });
  }
  forgetHouse(house: string, known: readonly string[] = []): void {
    this.using(house, () => {
      const metadata = readKeyMetadata(this.#home);
      const forgotten = new Set(
        [house, ...metadata.accounts, ...known].filter(
          value => value === house || value.startsWith(`${house}-secret-`),
        ),
      );
      metadata.accounts = metadata.accounts.filter(value => !forgotten.has(value));
      metadata.heads = metadata.heads.filter(([account]) => account !== house);
      writeKeyMetadata(this.#home, metadata);
    });
  }
  dispose(): void {
    this.#disposed = true;
    this.#root.fill(0);
  }
}
