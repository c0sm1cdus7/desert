import type { KeychainCommand } from "../../src/adapters/secrets/custody/macos-house-keys.ts";
/** Synthetic data only. This fake deliberately also accepts argv writes so leak assertions can catch them. */
export function fakeKeychain() {
  const saved = new Map<string, Uint8Array>();
  const calls: { args: readonly string[]; input: Uint8Array; timeout: number }[] = [];
  const command: KeychainCommand = (_file, args, input, options) => {
    calls.push({ args: [...args], input, timeout: options.timeout });
    const tokens = args[0] === "-i" ? Buffer.from(input).toString("utf8").trim().split(" ") : [...args];
    const service = tokens[tokens.indexOf("-s") + 1],
      account = tokens[tokens.indexOf("-a") + 1];
    const id = `${service}/${account}`;
    const empty = Buffer.alloc(0);
    if (tokens[0] === "find-generic-password") {
      const value = saved.get(id);
      return { status: value ? 0 : 44, stdout: value && tokens.includes("-w") ? Buffer.from(value) : empty };
    }
    if (tokens[0] === "delete-generic-password") return { status: saved.delete(id) ? 0 : 44, stdout: empty };
    if (tokens[0] !== "add-generic-password") throw new Error("fixture command");
    if (saved.has(id) && !tokens.includes("-U")) return { status: 45, stdout: empty };
    saved.set(id, Buffer.from(tokens[tokens.indexOf("-w") + 1] ?? ""));
    return { status: 0, stdout: empty };
  };
  return { saved, calls, command };
}
