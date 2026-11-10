// The terminal on a tty: keys in, frames out. Everything it shows comes from the router; nothing here decides.
import type { Router } from "../../surface/router.ts";
import { bytesOf, type Grid } from "./cells.ts";
import { keysOf } from "./input.ts";
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
const enter = "\x1b[?1049h\x1b[?25l\x1b[2J";
export const leaveScreen = "\x1b[0m\x1b[?25h\x1b[?1049l";

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

/** Runs until ctrl c: each key is an intent for the router, and each change of the router is a frame. */
export function startTerminal(tty: Tty, keyboard: Keyboard, router: Router): Promise<void> {
  const frames = painter(tty, router);
  return new Promise(done => {
    const unwatch = router.watch(frames.draw);
    keyboard.on("data", chunk => {
      if (keysOf(chunk.toString("utf8")).every(key => router.send(key))) return frames.draw();
      unwatch();
      keyboard.setRawMode(false);
      keyboard.pause();
      tty.write(leaveScreen);
      done();
    });
    tty.on("resize", frames.redraw);
    keyboard.setRawMode(true);
    keyboard.resume();
    tty.write(enter);
    frames.draw();
  });
}
