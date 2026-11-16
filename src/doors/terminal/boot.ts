// The terminal on a tty: keys in, frames out. Everything it shows comes from the router; nothing here decides.
import { StringDecoder } from "node:string_decoder";
import type { Intent } from "../../surface/contract.ts";
import type { Router } from "../../surface/router.ts";
import { bytesOf, type Grid } from "./cells.ts";
import { keyReader, pasteBrackets } from "./input.ts";
import { contentRows, paint } from "./paint.ts";

export interface Tty {
  readonly columns: number;
  readonly rows: number;
  write(bytes: string): unknown;
  on(event: "resize", listener: () => void): unknown;
}
export interface Keyboard {
  setRawMode(on: boolean): unknown;
  on(event: "data", listener: (chunk: Buffer) => void): unknown;
  resume(): unknown;
  pause(): unknown;
}
const enter = `\x1b[?1049h\x1b[?25l\x1b[2J${pasteBrackets.on}`;
export const leaveScreen = `${pasteBrackets.off}\x1b[0m\x1b[?25h\x1b[?1049l`;
/** How long what waits is given, in ms. The pieces of one key come together: an escape that is still alone after
 * this is the escape key. What is pasted comes together too: a paste whose end has not come after a second goes on
 * waiting for it, never read as keys, and from then on ctrl c leaves. */
export const keyWaits = { key: 50, paste: 1000 } as const;

/** Frames out: only what changed since the last one, unless the screen was lost. */
function painter(tty: Tty, router: Router) {
  let last: Grid | undefined;
  const draw = (): void => {
    const grid = paint(router.screen({ rows: contentRows(tty.rows) }), { cols: tty.columns, rows: tty.rows });
    tty.write(bytesOf(grid, last));
    last = grid;
  };
  return {
    draw,
    redraw: (): void => {
      last = undefined;
      tty.write(`\x1b[2J`);
      draw();
    },
  };
}

/** Runs until ctrl c: each key is an intent for the router, and each change of the router is a frame. Bytes are read
 * as they come: a character or a key cut between two chunks is still that character and that key. */
export function startTerminal(tty: Tty, keyboard: Keyboard, router: Router, signal?: AbortSignal): Promise<void> {
  const frames = painter(tty, router);
  const keys = keyReader();
  const text = new StringDecoder("utf8");
  return new Promise(done => {
    const unwatch = router.watch(frames.draw);
    let waiting: ReturnType<typeof setTimeout> | undefined;
    let due: ReturnType<typeof setImmediate> | undefined;
    const stop = terminalStop(tty, keyboard, signal, () => {
      clearTimeout(waiting);
      clearImmediate(due);
      unwatch();
      done();
    });
    /** False once the person asked to leave. */
    const take = (intents: readonly Intent[]): boolean => {
      if (stop.ended()) return false;
      const stays = intents.every(key => router.send(key));
      if (stays) frames.draw();
      else stop.finish();
      return stays;
    };
    /** Once its time is up, what waits is settled only after what had already arrived was read: a moment in which
     * the program was busy is not a silence of the keyboard. */
    const settle = (): void => void (due = setImmediate(() => void take(keys.settle())));
    keyboard.on("data", chunk => {
      clearTimeout(waiting);
      clearImmediate(due);
      if (!take(keys.read(text.write(chunk)))) return;
      const pending = keys.waiting();
      if (pending) waiting = setTimeout(settle, keyWaits[pending]);
    });
    tty.on("resize", frames.redraw);
    keyboard.setRawMode(true);
    keyboard.resume();
    tty.write(enter);
    frames.draw();
    signal?.addEventListener("abort", stop.finish, { once: true });
    if (signal?.aborted) stop.finish();
  });
}

function terminalStop(tty: Tty, keyboard: Keyboard, signal: AbortSignal | undefined, done: () => void) {
  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    signal?.removeEventListener("abort", finish);
    keyboard.setRawMode(false);
    keyboard.pause();
    tty.write(leaveScreen);
    done();
  };
  return { ended: () => ended, finish };
}
