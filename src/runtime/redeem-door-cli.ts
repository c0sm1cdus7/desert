// A local redemption entry reads a short code from stdin and never prints response bodies or credentials.
import { everySaid } from "../fields/phrases.ts";
import { RedemptionFailure } from "./redemption-destination.ts";
import { redeemToFile } from "./redeem-door.ts";
import { doorTexts } from "../texts/doors.texts.ts";
export async function redeemCommand(args: readonly string[], input: AsyncIterable<Uint8Array>): Promise<number> {
  try {
    const [address, mode, file, nameFlag, name] = args;
    if (
      !address ||
      !file ||
      !["--file", "--claude"].includes(mode ?? "") ||
      (mode === "--file" ? args.length !== 3 : args.length !== 5 || nameFlag !== "--name" || !name)
    ) {
      process.stderr.write(`${everySaid(doorTexts.usage)}\n`);
      return 1;
    }
    let code = "";
    for await (const chunk of input) {
      if (code.length + chunk.byteLength > 128) throw new Error("input-limit");
      code += Buffer.from(chunk).toString("utf8");
    }
    await redeemToFile(address, code.trim(), { file, ...(mode === "--claude" ? { name } : {}) });
    process.stderr.write(`${everySaid(doorTexts.saved)}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${error instanceof RedemptionFailure ? error.message : everySaid(doorTexts.failed)}\n`);
    return 1;
  }
}
if (import.meta.main) process.exitCode = await redeemCommand(process.argv.slice(2), process.stdin);
