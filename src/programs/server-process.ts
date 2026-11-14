// Programs opt into the detached startup handshake; credentials never go in argv or diagnostic output.
import { serveProgram } from "./serve-program.ts";
import { WriterAlreadyOpen } from "../adapters/storage/writer-lease.ts";
import { socketTexts } from "../texts/socket.texts.ts";
import type { Program } from "../tools/tool-contract.ts";
export async function runProgramServer<X extends Program>(...args: Parameters<typeof serveProgram<X>>) {
  try {
    const server = await serveProgram(...args);
    process.send?.({ ready: true });
    return server;
  } catch (error) {
    const reason = error instanceof WriterAlreadyOpen ? error.message : socketTexts.startFailed;
    const code = error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : "";
    process.send?.({ error: reason, code });
    if (!process.connected) process.stderr.write(`${reason}\n`);
    process.exitCode = 1;
    return undefined;
  } finally {
    if (process.connected) process.disconnect();
  }
}
