import type { KeychainCommand } from "../../src/adapters/secrets/custody/macos-house-keys.ts";
/** Synthetic data only. This fake deliberately also accepts argv writes so leak assertions can catch them. */
export function fakeKeychain() {
  const saved = new Map<string, Uint8Array>();
  const calls: { args: readonly string[]; input: Uint8Array; timeout: number }[] = [];
  const execute = (tokens: string[]) => {
    const service = tokens[tokens.indexOf("-s") + 1],
      account = tokens[tokens.indexOf("-a") + 1];
    const id = `${service}/${account}`;
    const empty = Buffer.alloc(0);
    if (tokens[0] === "find-generic-password") {
      const value = saved.get(id);
      return { status: value ? 0 : 44, stdout: value && tokens.includes("-w") ? Buffer.from(value) : empty };
    }
    if (tokens[0] === "delete-generic-password") return { status: saved.delete(id) ? 0 : 44, stdout: empty };
    if (tokens[0] !== "add-generic-password") return { status: 1, stdout: empty };
    if (saved.has(id) && !tokens.includes("-U")) return { status: 45, stdout: empty };
    saved.set(id, Buffer.from(tokens[tokens.indexOf("-w") + 1] ?? ""));
    return { status: 0, stdout: empty };
  };
  const command: KeychainCommand = (_file, args, input, options) => {
    calls.push({ args: [...args], input, timeout: options.timeout });
    if (args[0] !== "-i") return execute([...args]);
    let result = { status: 0, stdout: Buffer.alloc(0) };
    for (let offset = 0; offset < input.length;) {
      const newline = input.indexOf(10, offset);
      const end = Math.min(offset + 4095, newline < 0 ? input.length : newline);
      const line = Buffer.from(input.subarray(offset, end)).toString("utf8").trim();
      if (line) result = execute(line.split(" "));
      offset = end + (input[end] === 10 ? 1 : 0);
    }
    return result;
  };
  return { saved, calls, command };
}
