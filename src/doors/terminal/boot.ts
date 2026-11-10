// The terminal on a tty: keys in, frames out. Everything it shows comes from screen; nothing here decides.
import { bytesOf, type Grid } from "./cells.ts";
import type { Result, Tool } from "../../surface/contract.ts";
import { keysOf } from "./input.ts";
import { contentRows, paint } from "./paint.ts";
import { resolve } from "../../surface/resolve.ts";
import { actOf, start, type Bar, type Running, type Session } from "../../surface/screen.ts";
import { finished, settled, step } from "../../surface/step.ts";

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
const redrawMs = 400;
const enter = "\x1b[?1049h\x1b[?25l\x1b[2J";
export const leaveScreen = "\x1b[0m\x1b[?25h\x1b[?1049l";

/** One tty's session: a key moves it, and the act it starts settles it later. */
/** Frames out: only what changed since the last one, unless the screen was lost. */
function painter(tty: Tty, tools: readonly Tool[], bar: () => Bar) {
  let last: Grid | undefined;
  return {
    draw: (session: Session): void => {
      const screen = resolve(session, tools, bar(), { rows: contentRows(tty.rows) });
      const grid = paint(screen, { cols: tty.columns, rows: tty.rows });
      tty.write(bytesOf(grid, last));
      last = grid;
    },
    lost: (): void => {
      last = undefined;
      tty.write(`\x1b[2J`);
    },
  };
}
function terminal(tty: Tty, tools: readonly Tool[], bar: () => Bar, first: Session) {
  let session = first;
  const frames = painter(tty, tools, bar);
  const draw = (): void => frames.draw(session);
  /** What the house answers later lands on the session as it is by then, and redraws it. */
  const later = <T>(answer: Promise<T>, land: (now: Session, value: T) => Session): void => {
    void answer.then(value => {
      session = land(session, value);
      draw();
    });
  };
  const run = (walk: Running): void => {
    const done = actOf(tools, walk)
      .run(walk.answers)
      .catch((failure: unknown): Result => ({ ok: false, reason: String(failure) }));
    later(done, (now, result) => finished(now, walk, result, bar().clock));
  };
  return {
    draw,
    redraw: (): void => {
      frames.lost();
      draw();
    },
    press: (chunk: string): boolean => {
      for (const key of keysOf(chunk)) {
        const stepped = step(session, key, tools, bar().now);
        session = stepped.session;
        if (stepped.quit) return false;
        if (stepped.run) run(stepped.run);
        const { sending } = stepped;
        if (sending) later(sending, (now, refused) => settled(now, sending, refused));
      }
      draw();
      return true;
    },
  };
}

/** Runs until ctrl c; a live act keeps its second count moving by itself. */
export function startTerminal(
  tty: Tty,
  keyboard: Keyboard,
  tools: readonly Tool[],
  bar: () => Bar,
  first: Session = start,
): Promise<void> {
  const screen = terminal(tty, tools, bar, first);
  return new Promise(done => {
    const timer = setInterval(screen.draw, redrawMs);
    keyboard.on("data", chunk => {
      if (screen.press(chunk.toString("utf8"))) return;
      clearInterval(timer);
      keyboard.setRawMode(false);
      keyboard.pause();
      tty.write(leaveScreen);
      done();
    });
    tty.on("resize", screen.redraw);
    keyboard.setRawMode(true);
    keyboard.resume();
    tty.write(enter);
    screen.draw();
  });
}
