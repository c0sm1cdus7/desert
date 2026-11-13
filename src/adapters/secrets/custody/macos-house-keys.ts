import { randomBytes } from "node:crypto";
import { CustodyError, type HouseKeyProvider } from "./house-keys.ts";
export type KeychainCommand = (
  file: string,
  args: readonly string[],
  input: string,
) => Readonly<{ status: number; stdout: string }>;
/** No default executor: tests and composition must explicitly supply the command boundary. Never use a shell. */
export class MacOSHouseKeys implements HouseKeyProvider {
  readonly #command: KeychainCommand;
  constructor(command: KeychainCommand) {
    this.#command = command;
  }
  private account(house: string): string {
    if (!/^[a-z0-9-]+$/u.test(house)) throw new CustodyError("E-CUSTODY-KEY");
    return house;
  }
  private run(args: readonly string[], input = "") {
    return this.#command("/usr/bin/security", args, input);
  }
  key(house: string, create: boolean): Uint8Array {
    try {
      return this.obtain(house, create);
    } catch {
      throw new CustodyError("E-CUSTODY-KEY");
    }
  }
  forget(house: string): void {
    try {
      const result = this.run(["delete-generic-password", "-s", "desert.house-custody.v1", "-a", this.account(house)]);
      if (result.status !== 0 && result.status !== 44) throw new CustodyError("E-CUSTODY-KEY");
    } catch {
      throw new CustodyError("E-CUSTODY-KEY");
    }
  }
  private obtain(house: string, create: boolean): Uint8Array {
    const identity = ["-s", "desert.house-custody.v1", "-a", this.account(house)];
    let result = this.run(["find-generic-password", ...identity, "-w"]);
    if (result.status === 44 && create) {
      const material = randomBytes(32).toString("base64");
      // No -U: another creator must never have its key silently replaced.
      const added = this.run(["-i"], ["add-generic-password", ...identity, "-w", material].join(" ") + "\n");
      if (added.status !== 0) throw new CustodyError("E-CUSTODY-KEY");
      result = this.run(["find-generic-password", ...identity, "-w"]);
    }
    if (result.status !== 0) throw new CustodyError("E-CUSTODY-KEY");
    const text = result.stdout.trim();
    const key = Buffer.from(text, "base64");
    if (key.length !== 32 || key.toString("base64") !== text) throw new CustodyError("E-CUSTODY-KEY");
    return key;
  }
}
