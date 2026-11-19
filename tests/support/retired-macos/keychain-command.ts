// Historical opt-in command runner keeps bounded byte input and output, discarding standard error.
import { spawnSync } from "node:child_process";
export const keychainTimeout = 5000;
export type KeychainCommand = (
  file: string,
  args: readonly string[],
  input: Uint8Array,
  options: Readonly<{ timeout: number }>,
) => Readonly<{ status: number | null; stdout: Uint8Array }>;
/** Opt-in executor; tests replace the native runner. stdin/stdout stay buffers; stderr is discarded. */
export const systemKeychainCommand: KeychainCommand = (file, args, input, options) => {
  const result = spawnSync(file, args, {
    input,
    timeout: Math.min(options.timeout, keychainTimeout),
    killSignal: "SIGKILL",
    stdio: ["pipe", "pipe", "ignore"],
    maxBuffer: 4 * 1024 * 1024,
  });
  return { status: result.status, stdout: result.stdout };
};
