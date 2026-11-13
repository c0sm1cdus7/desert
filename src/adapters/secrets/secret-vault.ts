// Schema-marked values live in a separate local store; persisted facts carry opaque references.
import type { TSchema } from "@sinclair/typebox";
import { realpathSync } from "node:fs";
import { dirname } from "node:path";
import type { Program } from "../../tools/tool-contract.ts";
import { Redactor } from "./redact.ts";
import { SecretCustody } from "./custody/secret-custody.ts";
import type { HouseKeyProvider } from "./custody/house-keys.ts";
export class SecretVault<X extends Program> extends Redactor<X> {
  private readonly custody: SecretCustody;
  constructor(file: string, journal: TSchema, keys?: HouseKeyProvider) {
    const custody = new SecretCustody(file, realpathSync(dirname(file)), keys);
    try {
      super(journal, value => custody.keep(value));
    } catch (error) {
      custody.close();
      throw error;
    }
    this.custody = custody;
  }
  close(): void {
    this.custody.close();
  }
}
