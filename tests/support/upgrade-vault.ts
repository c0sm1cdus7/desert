// Only the vault is replaced: no secrets.sqlite is opened by this reproduction.
import { vi } from "vitest";

vi.mock("../../src/adapters/secrets/secret-vault.ts", () => ({
  SecretVault: class {
    capture() {}
    scrub<T>(value: T): T {
      return value;
    }
    close() {}
  },
}));
