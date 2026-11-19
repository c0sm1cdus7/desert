import { spawnSync } from "node:child_process";
import { expect, it, vi } from "vitest";
import { keychainTimeout, systemKeychainCommand } from "../../../tests/support/retired-macos/keychain-command.ts";
vi.mock("node:child_process", () => ({ spawnSync: vi.fn(() => ({ status: null, stdout: Buffer.alloc(0) })) }));
it("el ejecutor tiene timeout y SIGKILL reales en su contrato, sin ejecutar security en la prueba", () => {
  const input = Buffer.from("inventado");
  expect(systemKeychainCommand("/usr/bin/security", ["-i"], input, { timeout: 99999 }).status).toBeNull();
  expect(spawnSync).toHaveBeenCalledWith("/usr/bin/security", ["-i"], {
    input,
    timeout: keychainTimeout,
    killSignal: "SIGKILL",
    stdio: ["pipe", "pipe", "ignore"],
    maxBuffer: 4194304,
  });
});
