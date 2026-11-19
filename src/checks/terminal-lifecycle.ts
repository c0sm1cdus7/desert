// The bridge reports the program separately: a dead bridge can never stand in for a successful program.
import type { ChildProcess } from "node:child_process";
import { isRecord } from "../fields/json-values.ts";
export type TerminalExit = Readonly<{ code: number | null; signal: string | null }>;
/** Declaring an exit makes close wait for that exact result without sending its own Ctrl-C. */
export type TerminalOptions = Readonly<{ expectedExit?: TerminalExit }>;
type Report = TerminalExit & Readonly<{ interrupted: boolean }>;
function parseReport(report: string): Report {
  const value: unknown = JSON.parse(report);
  if (
    !isRecord(value) ||
    !(value.code === null || (typeof value.code === "number" && Number.isInteger(value.code) && value.code >= 0)) ||
    !(value.signal === null || typeof value.signal === "string") ||
    (value.code === null) === (value.signal === null) ||
    typeof value.interrupted !== "boolean"
  )
    throw new Error("Invalid PTY result");
  return {
    code: typeof value.code === "number" ? value.code : null,
    signal: typeof value.signal === "string" ? value.signal : null,
    interrupted: value.interrupted,
  };
}
function expected(result: Report, exit?: TerminalExit) {
  if (exit) return result.code === exit.code && result.signal === exit.signal;
  if (result.code === 0 && result.signal === null) return true;
  return result.interrupted && (result.signal === "SIGINT" || (result.code === 130 && result.signal === null));
}
function observe(child: ChildProcess) {
  let report = "";
  let result: Report | undefined;
  let failure: Error | undefined;
  child.on("error", error => {
    failure = error;
  });
  child.stdio[3]?.on("data", (chunk: Buffer) => {
    report += chunk.toString("utf8");
  });
  child.stdio[3]?.on("end", () => {
    try {
      result = parseReport(report);
    } catch {
      failure ??= new Error("PTY bridge did not report the program exit");
    }
  });
  const ended = new Promise<TerminalExit>(done =>
    child.once("close", (code, signal) => {
      if (!result) failure ??= new Error("PTY bridge did not report the program exit");
      done({ code, signal });
    }),
  );
  return { ended, result: () => result, failure: () => failure };
}
async function waitForBridge(child: ChildProcess, status: ReturnType<typeof observe>, options: TerminalOptions) {
  let timedOut = false;
  const expired = (): boolean => timedOut;
  const timeout = setTimeout(() => {
    timedOut = true;
    child.kill("SIGTERM");
  }, 5000);
  let bridge: TerminalExit;
  try {
    bridge = await status.ended;
  } finally {
    clearTimeout(timeout);
  }
  if (expired()) {
    throw new Error(
      "PTY bridge close timed out after 5000ms: expected " +
        JSON.stringify(options.expectedExit ?? "normal exit or helper Ctrl-C") +
        `; program ${JSON.stringify(status.result() ?? "not reported")}; bridge ${JSON.stringify(bridge)}`,
    );
  }
  return bridge;
}
export function terminalLifecycle(child: ChildProcess, options: TerminalOptions) {
  const status = observe(child);
  const failures: { error: NodeJS.ErrnoException; ended: boolean }[] = [];
  for (const pipe of [child.stdin, child.stdout, child.stdio[3], child.stdio[4]])
    pipe?.on("error", (error: NodeJS.ErrnoException) => {
      failures.push({ error, ended: status.result() !== undefined || child.exitCode !== null });
    });
  const control = child.stdio[4];
  let closing: Promise<void> | undefined;
  const close = async () => {
    if (!options.expectedExit && control && "write" in control && child.exitCode === null && child.signalCode === null)
      control.write("close\n");
    child.stdin?.end();
    const bridge = await waitForBridge(child, status, options);
    const failure = status.failure();
    if (failure) throw new Error(`${failure.message}; bridge ${JSON.stringify(bridge)}`, { cause: failure });
    if (bridge.code !== 0 || bridge.signal !== null) throw new Error(`PTY bridge failed: ${JSON.stringify(bridge)}`);
    const result = status.result();
    if (!result || !expected(result, options.expectedExit))
      throw new Error(`Unexpected terminal exit: ${JSON.stringify(result)}`);
    for (const { error, ended } of failures) if (error.code !== "EPIPE" || !ended) throw error;
  };
  return {
    termination: (): TerminalExit | undefined => {
      const result = status.result();
      return result && { code: result.code, signal: result.signal };
    },
    close: () => (closing ??= close()),
  };
}
