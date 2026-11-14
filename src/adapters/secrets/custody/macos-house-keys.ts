import { randomBytes } from "node:crypto";
import { CustodyError, type HouseKeyProvider, type LedgerHead } from "./house-keys.ts";
import { encodeKey, decodeKey } from "./keychain-bytes.ts";
import { keychainTimeout, type KeychainCommand } from "./keychain-command.ts";
export type { KeychainCommand } from "./keychain-command.ts";
type Index = { head?: LedgerHead; accounts: string[] };
const service = "desert.house-custody.v2",
  indexService = "desert.custody-index.v2";
/** Explicit command injection; all key material crosses it as eraseable buffers, never argv. */
export class MacOSHouseKeys implements HouseKeyProvider {
  readonly #command: KeychainCommand;
  constructor(command: KeychainCommand) {
    this.#command = command;
  }
  private account(account: string): string {
    if (!/^[a-z0-9-]+$/u.test(account)) throw new CustodyError("E-CUSTODY-KEY");
    return account;
  }
  private run(args: readonly string[], input = Buffer.alloc(0)) {
    try {
      const result = this.#command("/usr/bin/security", args, input, { timeout: keychainTimeout });
      if (!(result.stdout instanceof Uint8Array)) throw new CustodyError("E-CUSTODY-KEY");
      return result;
    } catch {
      throw new CustodyError("E-CUSTODY-KEY");
    } finally {
      input.fill(0);
    }
  }
  private identity(account: string, store = service): string[] {
    return ["-s", store, "-a", this.account(account)];
  }
  private write(account: string, bytes: Uint8Array, store = service, update = false): void {
    const prefix = Buffer.from(
      ["add-generic-password", ...this.identity(account, store), ...(update ? ["-U"] : []), "-w", ""].join(" "),
    );
    const input = Buffer.concat([prefix, bytes, Buffer.from("\n")]);
    const result = this.run(["-i"], input);
    try {
      if (result.status !== 0) throw new CustodyError("E-CUSTODY-KEY");
    } finally {
      result.stdout.fill(0);
    }
  }
  has(account: string): boolean {
    const result = this.run(["find-generic-password", ...this.identity(account)]);
    try {
      if (result.status !== 0 && result.status !== 44) throw new CustodyError("E-CUSTODY-KEY");
      return result.status === 0;
    } finally {
      result.stdout.fill(0);
    }
  }
  private index(house: string): Index {
    const result = this.run(["find-generic-password", ...this.identity(house, indexService), "-w"]);
    try {
      if (result.status === 44) return { accounts: [] };
      if (result.status !== 0) throw new Error();
      const parsed: unknown = JSON.parse(
        Buffer.from(Buffer.from(result.stdout).toString("utf8").trim(), "hex").toString("utf8"),
      );
      if (
        !parsed ||
        typeof parsed !== "object" ||
        !("accounts" in parsed) ||
        !Array.isArray(parsed.accounts) ||
        !parsed.accounts.every((value: unknown) => typeof value === "string")
      )
        throw new Error();
      const accounts: string[] = parsed.accounts;
      if (!("head" in parsed)) return { accounts };
      const head = parsed.head;
      if (
        !head ||
        typeof head !== "object" ||
        !("count" in head) ||
        typeof head.count !== "number" ||
        !Number.isSafeInteger(head.count) ||
        head.count < 0 ||
        !("authentication" in head) ||
        typeof head.authentication !== "string"
      )
        throw new Error();
      return { accounts, head: { count: head.count, authentication: head.authentication } };
    } catch {
      throw new CustodyError("E-CUSTODY-KEY");
    } finally {
      result.stdout.fill(0);
    }
  }
  private saveIndex(house: string, index: Index): void {
    // Public metadata, hex-encoded to avoid quoting/injection in security's interactive grammar.
    const bytes = Buffer.from(Buffer.from(JSON.stringify(index)).toString("hex"));
    this.write(house, bytes, indexService, true);
    if (JSON.stringify(this.index(house)) !== JSON.stringify(index)) throw new CustodyError("E-CUSTODY-KEY");
  }
  head(house: string): LedgerHead | undefined {
    return this.index(house).head;
  }
  anchor(house: string, head: LedgerHead): void {
    this.saveIndex(house, { ...this.index(house), head });
  }
  key(account: string, create: boolean): Uint8Array {
    let result = this.run(["find-generic-password", ...this.identity(account), "-w"]);
    try {
      if (result.status === 44 && create) {
        const house = account.split("-secret-")[0] ?? account,
          index = this.index(house);
        if (!index.accounts.includes(account))
          this.saveIndex(house, { ...index, accounts: [...index.accounts, account] });
        const raw = randomBytes(32),
          encoded = encodeKey(raw);
        try {
          this.write(account, encoded);
        } finally {
          raw.fill(0);
          encoded.fill(0);
        }
        result.stdout.fill(0);
        result = this.run(["find-generic-password", ...this.identity(account), "-w"]);
      }
      if (result.status !== 0) throw new CustodyError("E-CUSTODY-KEY");
      return decodeKey(result.stdout);
    } finally {
      result.stdout.fill(0);
    }
  }
  private remove(account: string, store = service): void {
    const result = this.run(["delete-generic-password", ...this.identity(account, store)]);
    try {
      if (result.status !== 0 && result.status !== 44) throw new CustodyError("E-CUSTODY-KEY");
    } finally {
      result.stdout.fill(0);
    }
  }
  forget(account: string): void {
    this.remove(account);
  }
  forgetHouse(house: string): void {
    const index = this.index(house);
    for (const account of index.accounts) if (account !== house) this.remove(account);
    this.remove(house);
    this.remove(house, indexService);
  }
}
