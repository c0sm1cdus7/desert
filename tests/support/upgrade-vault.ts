// Only the vault is replaced: no secrets.sqlite is opened by this reproduction.
import type { TSchema } from "@sinclair/typebox";
import type { Program } from "../../src/tools/tool-contract.ts";
import { vi } from "vitest";

vi.mock("../../src/adapters/secrets/secret-vault.ts", async () => {
  const { Redactor } = await import("../../src/adapters/secrets/redact.ts");
  return {
    SecretVault: class extends Redactor<Program> {
      constructor(_file: string, schema: TSchema) {
        super(schema, () => {
          throw new Error("This reproduction keeps no secret");
        });
      }
      close() {}
    },
  };
});
