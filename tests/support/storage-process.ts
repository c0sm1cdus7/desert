// Messages are queued so concurrent children cannot answer before the parent starts listening.
import { fork } from "node:child_process";
import { once } from "node:events";
export function contender(file: string, barrier: string, role: string, mode = "plain") {
  const child = fork(new URL("./storage-child.ts", import.meta.url), [file, barrier, role, mode], {
    execArgv: [],
    stdio: ["ignore", "ignore", "pipe", "ipc"],
  });
  const queued: unknown[] = [];
  let receiver: ((message: unknown) => void) | undefined;
  let stderr = "";
  child.stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });
  child.on("message", (message: unknown) => {
    if (receiver) {
      const send = receiver;
      receiver = undefined;
      send(message);
    } else queued.push(message);
  });
  const next = () =>
    new Promise<unknown>((resolve, reject) => {
      if (queued.length) {
        resolve(queued.shift());
        return;
      }
      const timer = setTimeout(() => reject(new Error(`Child timeout: ${stderr}`)), 20_000);
      receiver = message => {
        clearTimeout(timer);
        resolve(message);
      };
    });
  const stop = async (signal = false) => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = once(child, "exit");
    if (signal) child.kill("SIGKILL");
    else child.send("close");
    await exited;
  };
  return { next, send: (message: string) => child.send(message), stop };
}
