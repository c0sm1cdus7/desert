// Real processes produce waitpid results; deterministic pipe faults exercise the helper's closing contract.
import { afterEach, expect, it, vi } from "vitest";
import { realTerminal, type RealTerminal, type TerminalOptions } from "./real-terminal.ts";
const hooks = vi.hoisted(() => {
  const state: { child: import("node:child_process").ChildProcess | undefined } = { child: undefined };
  return state;
});
vi.mock("node:child_process", async original => {
  const cp = await original<typeof import("node:child_process")>();
  return {
    ...cp,
    spawn: (...args: Parameters<typeof cp.spawn>) => {
      hooks.child = cp.spawn(...args);
      return hooks.child;
    },
  };
});
afterEach(() => {
  vi.useRealTimers();
  hooks.child = undefined;
});
function program(source: string, options?: TerminalOptions) {
  return realTerminal([process.execPath, "-e", source], undefined, {}, options);
}
async function finished(terminal: RealTerminal) {
  const deadline = Date.now() + 5000;
  while (!terminal.termination()) {
    if (Date.now() > deadline) throw new Error("Program did not exit");
    await terminal.rest(10);
  }
}
it("rejects a nonzero exit even after the expected screen was painted", async () => {
  const terminal = program('console.log("Valid screen"); process.exitCode = 7');
  await terminal.until("Valid screen");
  await finished(terminal);
  expect(terminal.termination()).toEqual({ code: 7, signal: null });
  await expect(terminal.close()).rejects.toThrow("Unexpected terminal exit");
});
it("rejects a dead PTY bridge even after a valid screen", async () => {
  const terminal = program('console.log("Valid screen"); setInterval(() => {}, 1000)');
  await terminal.until("Valid screen");
  hooks.child?.kill("SIGKILL");
  await expect(terminal.close()).rejects.toThrow("PTY bridge");
});
it("accepts EPIPE after normal termination", async () => {
  const terminal = program('console.log("Valid screen")');
  await finished(terminal);
  hooks.child?.stdin?.emit("error", Object.assign(new Error("late pipe"), { code: "EPIPE" }));
  await expect(terminal.close()).resolves.toBeUndefined();
});
it("does not let EPIPE hide an unexpected exit", async () => {
  const terminal = program("process.exitCode = 9");
  await finished(terminal);
  hooks.child?.stdin?.emit("error", Object.assign(new Error("late pipe"), { code: "EPIPE" }));
  await expect(terminal.close()).rejects.toThrow("Unexpected terminal exit");
});
it("rejects a pipe error other than EPIPE even after normal termination", async () => {
  const terminal = program("process.exitCode = 0");
  await finished(terminal);
  hooks.child?.stdin?.emit("error", Object.assign(new Error("broken pipe transport"), { code: "EIO" }));
  await expect(terminal.close()).rejects.toThrow("broken pipe transport");
});
it("accepts an explicitly declared signal and exposes it separately from a code", async () => {
  const terminal = program('process.kill(process.pid, "SIGKILL")', { expectedExit: { code: null, signal: "SIGKILL" } });
  await expect(terminal.close()).resolves.toBeUndefined();
  expect(terminal.termination()).toEqual({ code: null, signal: "SIGKILL" });
});
it("rejects an undeclared signal", async () => {
  const terminal = program('process.kill(process.pid, "SIGTERM")');
  await finished(terminal);
  await expect(terminal.close()).rejects.toThrow("Unexpected terminal exit");
});
it("accepts its own Ctrl-C without requiring existing callers to declare it", async () => {
  const terminal = program('console.log("Ready"); setInterval(() => {}, 1000)');
  await terminal.until("Ready");
  await expect(terminal.close()).resolves.toBeUndefined();
  expect(terminal.termination()).toEqual({ code: null, signal: "SIGINT" });
  await expect(terminal.close()).resolves.toBeUndefined();
});
it("rejects a manually typed Ctrl-C unless its exit was declared", async () => {
  const terminal = program('console.log("Ready"); setInterval(() => {}, 1000)');
  await terminal.until("Ready");
  terminal.press("\x03");
  await finished(terminal);
  await expect(terminal.close()).rejects.toThrow("Unexpected terminal exit");
});
it("accepts an explicitly declared nonzero code", async () => {
  const terminal = program("process.exitCode = 4", { expectedExit: { code: 4, signal: null } });
  await expect(terminal.close()).resolves.toBeUndefined();
});

it("reports the close timeout when a live terminal never produces its declared exit", async () => {
  const terminal = program('console.log("Disconnected"); setInterval(() => {}, 1000)', {
    expectedExit: { code: 1, signal: null },
  });
  await terminal.until("Disconnected");
  vi.useFakeTimers();
  const closed = expect(terminal.close()).rejects.toThrow(
    'PTY bridge close timed out after 5000ms: expected {"code":1,"signal":null}; ' +
      'program "not reported"; bridge {"code":null,"signal":"SIGTERM"}',
  );
  await vi.advanceTimersByTimeAsync(5000);
  await closed;
});

it("rejects EPIPE while the program is still running even if it later exits normally", async () => {
  const terminal = program('console.log("Ready"); process.stdin.once("data", () => process.exit(0))', {
    expectedExit: { code: 0, signal: null },
  });
  await terminal.until("Ready");
  hooks.child?.stdin?.emit("error", Object.assign(new Error("early pipe"), { code: "EPIPE" }));
  terminal.press("done\r");
  await finished(terminal);
  await expect(terminal.close()).rejects.toThrow("early pipe");
});
