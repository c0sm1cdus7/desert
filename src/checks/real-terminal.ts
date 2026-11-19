// A program on a real terminal, as a person has it: a pseudo-terminal, its keyboard and what it paints on it.
// The keys go in as bytes, through the system's terminal and the program's own way of reading them; nothing here
// knows the surface. It needs python3, which opens the pseudo-terminal: without it the check fails, and says so.
import { spawn, spawnSync } from "node:child_process";
import { join } from "node:path";
import { terminalLifecycle, type TerminalExit, type TerminalOptions } from "./terminal-lifecycle.ts";
export type { TerminalExit, TerminalOptions } from "./terminal-lifecycle.ts";
import { StringDecoder } from "node:string_decoder";
export interface RealTerminal {
  /** The program result reported by the PTY bridge, independently of the bridge exit. */
  termination(): TerminalExit | undefined;
  /** Sends these bytes to the keyboard, in one piece. */
  press(bytes: string): void;
  /** Lets time pass: what is pressed after it comes in another chunk. */
  rest(ms: number): Promise<void>;
  /** What is on the screen now, line by line, as a person reads it. */
  screen(): readonly string[];
  /** Waits until the screen says this, and gives it; fails with what the screen says if it never does. */
  until(text: string, ms?: number): Promise<readonly string[]>;
  /** Everything the program wrote to the terminal, as bytes. */
  written(): string;
  /** Checks both program and bridge exits. Without expectedExit, requests Ctrl-C if still running. */
  close(): Promise<void>;
}
const pty = join(import.meta.dirname, "../../tests/support/open-pty.py");
/** The screen a terminal has after these bytes: each row is where the cursor was last sent to write it whole. */
export function screenOf(bytes: string, rows: number): readonly string[] {
  const lines = Array.from({ length: rows }, () => "");
  let at = 0;
  for (const [piece, row] of bytes.matchAll(/\x1b\[(\d+);\d+H|\x1b\[[0-9;?]*[A-Za-z]|[^\x1b]/gu)) {
    if (row !== undefined) {
      at = Number(row) - 1;
      lines[at] = "";
    } else if (piece === "\x1b[2J") lines.fill("");
    else if (!piece.startsWith("\x1b") && piece >= " ") lines[at] = `${lines[at] ?? ""}${piece}`;
  }
  return lines.map(line => line.trimEnd());
}
/** Runs a command on a real PTY. Default success is exit zero or the interruption requested by close itself. */
export function realTerminal(
  command: readonly string[],
  size = { cols: 100, rows: 30 },
  env: Readonly<Record<string, string>> = {},
  options: TerminalOptions = {},
): RealTerminal {
  if (spawnSync("python3", ["--version"]).status !== 0)
    throw new Error("python3 is not here: a program cannot be checked on a real terminal without it");
  const child = spawn("python3", [pty, String(size.cols), String(size.rows), ...command], {
    stdio: ["pipe", "pipe", "inherit", "pipe", "pipe"],
    env: { ...process.env, ...env },
  });
  const keyboard = child.stdin;
  if (!keyboard || !child.stdout) throw new Error("PTY bridge pipes unavailable");
  const text = new StringDecoder("utf8");
  let bytes = "";
  child.stdout.on("data", (chunk: Buffer) => void (bytes += text.write(chunk)));
  const lifecycle = terminalLifecycle(child, options);
  const rest = (ms: number): Promise<void> => new Promise(done => setTimeout(done, ms));
  const screen = (): readonly string[] => screenOf(bytes, size.rows);
  return {
    ...lifecycle,
    press: typed => void keyboard.write(typed),
    rest,
    screen,
    written: () => bytes,
    until: async (sought, ms = 5000) => {
      const deadline = Date.now() + ms;
      while (!screen().some(line => line.includes(sought))) {
        if (Date.now() > deadline)
          throw new Error(`The screen did not say «${sought}» in time:\n${screen().join("\n")}`);
        await rest(10);
      }
      return screen();
    },
  };
}
