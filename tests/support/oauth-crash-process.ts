// One child at a time, a bounded barrier, and a confirmed SIGKILL exit before opening the same directory again.
import { fork } from "node:child_process";
import { dirname } from "node:path";
import { isRecord } from "../../src/fields/json-values.ts";
export function oauthCrashProcess(home: string, phase: string, cut: string, prior?: unknown) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const child = fork(new URL("./oauth-crash-child.ts", import.meta.url), [home, phase, cut], {
      execArgv: [],
      env: { PATH: dirname(process.execPath), NODE_NO_WARNINGS: "1" },
      stdio: ["ignore", "ignore", "ignore", "ipc"],
    });
    let report: Record<string, unknown> | undefined;
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
    }, 20_000);
    child.once("error", error => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("message", (message: unknown) => {
      if (isRecord(message)) report = message;
      child.kill("SIGKILL");
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      if (!report || signal !== "SIGKILL" || code !== null)
        reject(new Error(`OAuth child failed at ${phase}/${cut}; exit ${String(code)}, signal ${String(signal)}`));
      else resolve({ ...report, signal });
    });
    if (prior) child.send(prior);
  });
}
