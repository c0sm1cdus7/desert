// A five-second startup handshake, then no parent/child lifecycle link remains.
import { closeSync } from "node:fs";
import { houseOutput } from "./house-output.ts";
import { spawn } from "node:child_process";
import { terminalProgram } from "./terminal-program.ts";
import { socketTexts } from "../texts/socket.texts.ts";
export async function launchHouse(root: string, home: string): Promise<void> {
  const program = terminalProgram(root);
  const output = houseOutput(home);
  const child = (() => {
    try {
      return spawn(process.execPath, [program, home], {
        detached: true,
        cwd: root,
        stdio: ["ignore", output, output, "ipc"],
      });
    } finally {
      closeSync(output);
    }
  })();
  await new Promise<void>((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timer);
      child.removeAllListeners("message");
      child.removeAllListeners("exit");
      if (error) child.kill("SIGTERM");
      if (child.connected) child.disconnect();
      child.unref();
      if (error) reject(error);
      else resolve();
    };
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      finish(new Error(socketTexts.startTimeout));
    }, 5000);
    child.once("error", () => finish(new Error(socketTexts.startFailed)));
    child.once("exit", () => finish(new Error(socketTexts.startFailed)));
    child.on("message", (message: unknown) => {
      if (!message || typeof message !== "object") return;
      if ("ready" in message && message.ready === true) finish();
      else if ("error" in message && typeof message.error === "string")
        finish(Object.assign(new Error(message.error), { code: "code" in message ? message.code : "" }));
    });
  });
}
