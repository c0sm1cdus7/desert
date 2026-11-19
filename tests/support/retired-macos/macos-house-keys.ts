// Historical macOS v3 provider bounds byte input, its separate anchor and its public command-line index.
import { randomBytes } from "node:crypto";
import { CustodyError, type HouseKeyProvider, type LedgerHead } from "../../../src/keychain/custody/house-keys.ts";
import { decodeKey, encodeKey } from "./keychain-bytes.ts";
import { keychainTimeout, type KeychainCommand } from "./keychain-command.ts";
export type { KeychainCommand } from "./keychain-command.ts";
type Index = { accounts: string[] };
const service = "desert.house-custody.v3",
  indexService = "desert.custody-index.v3",
  anchorService = "desert.custody-anchor.v3";
/** Explicit command injection; all key material crosses it as eraseable buffers, never argv. */
export class MacOSHouseKeys implements HouseKeyProvider {
  readonly #command: KeychainCommand;
  constructor(command: KeychainCommand) {
    this.#command = command;
  }
  private account(account: string): string {
    if (account.length > 128 || !/^[a-z0-9-]+$/u.test(account)) throw new CustodyError("E-CUSTODY-KEY");
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
    if (input.length > 4096) {
      input.fill(0);
      throw new CustodyError("E-CUSTODY-KEY");
    }
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
  private read(account: string, store: string): string | undefined {
    const result = this.run(["find-generic-password", ...this.identity(account, store), "-w"]);
    try {
      if (result.status === 44) return undefined;
      if (result.status !== 0) throw new CustodyError("E-CUSTODY-KEY");
      return Buffer.from(result.stdout).toString("utf8").trim();
    } finally {
      result.stdout.fill(0);
    }
  }
  private index(house: string, forgetting = false): Index {
    const text = this.read(house, indexService);
    if (text === undefined) return { accounts: [] };
    try {
      if (!/^(?:[a-f0-9]{2})+$/u.test(text)) throw new Error();
      const parsed: unknown = JSON.parse(Buffer.from(text, "hex").toString("utf8"));
      if (
        !parsed ||
        typeof parsed !== "object" ||
        !("accounts" in parsed) ||
        !Array.isArray(parsed.accounts) ||
        !parsed.accounts.every((value: unknown) => typeof value === "string")
      )
        throw new Error();
      return { accounts: parsed.accounts };
    } catch {
      if (forgetting) return { accounts: [] };
      throw new CustodyError("E-CUSTODY-KEY");
    }
  }
  private saveIndex(house: string, index: Index): void {
    // Public metadata uses argv, outside the interactive line reader. Bound it before any write.
    const text = Buffer.from(JSON.stringify(index)).toString("hex");
    if (text.length > 120000) throw new CustodyError("E-CUSTODY-KEY");
    const result = this.run(["add-generic-password", ...this.identity(house, indexService), "-U", "-w", text]);
    try {
      if (result.status !== 0) throw new CustodyError("E-CUSTODY-KEY");
    } finally {
      result.stdout.fill(0);
    }
    if (JSON.stringify(this.index(house)) !== JSON.stringify(index)) throw new CustodyError("E-CUSTODY-KEY");
  }
  head(house: string): LedgerHead | undefined {
    const text = this.read(house, anchorService);
    if (text === undefined) return undefined;
    if (!/^[0-9a-f]{16}:[0-9a-f]{64}$/u.test(text)) throw new CustodyError("E-CUSTODY-KEY");
    const count = Number.parseInt(text.slice(0, 16), 16);
    if (!Number.isSafeInteger(count) || (count === 0 && text.slice(17) !== "0".repeat(64)))
      throw new CustodyError("E-CUSTODY-KEY");
    return { count, authentication: count ? text.slice(17) : "" };
  }
  anchor(house: string, head: LedgerHead): void {
    if (
      !Number.isSafeInteger(head.count) ||
      head.count < 0 ||
      !(head.count === 0 ? head.authentication === "" : /^[0-9a-f]{64}$/u.test(head.authentication))
    )
      throw new CustodyError("E-CUSTODY-KEY");
    const text = `${head.count.toString(16).padStart(16, "0")}:${head.authentication || "0".repeat(64)}`;
    this.write(house, Buffer.from(text), anchorService, true);
    if (JSON.stringify(this.head(house)) !== JSON.stringify(head)) throw new CustodyError("E-CUSTODY-KEY");
  }
  key(account: string, create: boolean): Uint8Array {
    let result = this.run(["find-generic-password", ...this.identity(account), "-w"]);
    try {
      if (result.status === 44 && create) {
        const house = account.split("-secret-")[0] ?? account,
          index = this.index(house);
        if (account !== house && !index.accounts.includes(account))
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
    const house = account.split("-secret-")[0] ?? account;
    if (house === account) return;
    const index = this.index(house);
    if (index.accounts.includes(account))
      this.saveIndex(house, { accounts: index.accounts.filter(value => value !== account) });
  }
  forgetHouse(house: string, known: readonly string[] = []): void {
    const index = this.index(house, true);
    for (const account of new Set([...index.accounts, ...known]))
      if (account.startsWith(`${house}-secret-`) && account.length <= 128 && /^[a-z0-9-]+$/u.test(account))
        this.remove(account);
    this.remove(house);
    this.remove(house, anchorService);
    this.remove(house, indexService);
  }
}
