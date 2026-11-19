// The terminal on a tty, fed the way a tty feeds it: bytes in chunks that cut keys and characters anywhere.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Intent, Screen } from "../../surface/contract/contract.ts";
import type { Router } from "../../surface/router/router.ts";
import { keyWaits, startTerminal } from "./boot.ts";

const screen: Screen = {
  title: "Prueba",
  state: "connected",
  clock: "10:00",
  body: { kind: "list", stacks: [] },
  hints: [],
  menu: false,
};
/** A tty, a keyboard and a router that only remember what they were given. */
function seated(state: Screen["state"] = "connected") {
  const sent: Intent[] = [];
  const written: string[] = [];
  let feed: (chunk: Buffer) => void = () => undefined;
  const router: Router = {
    screen: () => ({ ...screen, state }),
    send: intent => {
      sent.push(intent);
      return intent.kind !== "quit";
    },
    watch: () => () => undefined,
    idle: () => Promise.resolve(),
    stop: () => undefined,
  };
  const tty = { columns: 80, rows: 24, write: (bytes: string) => written.push(bytes), on: () => undefined };
  const keyboard = {
    setRawMode: () => undefined,
    on: (_event: "data", listener: (chunk: Buffer) => void) => void (feed = listener),
    resume: () => undefined,
    pause: () => undefined,
  };
  const over = startTerminal(tty, keyboard, router);
  return { sent, written, over, press: (bytes: string | Buffer) => feed(Buffer.from(bytes)) };
}

describe("the terminal on a tty", () => {
  beforeEach(() => void vi.useFakeTimers());
  afterEach(() => void vi.useRealTimers());
  it("keeps a disconnected screen open until the person leaves with ctrl c", async () => {
    const { written, over, press } = seated("disconnected");
    const ended = vi.fn();
    void over.then(ended);
    await vi.advanceTimersByTimeAsync(5000);
    expect(written.join("")).toContain("×");
    expect(ended).not.toHaveBeenCalled();
    press("\x03");
    await over;
    expect(ended).toHaveBeenCalledOnce();
  });
  it("asks the terminal to say what is pasted, and stops asking when it leaves", async () => {
    const { written, over, press } = seated();
    expect(written[0]).toContain("\x1b[?2004h");
    press("\x03");
    await over;
    expect(written.at(-1)).toContain("\x1b[?2004l");
  });
  it("moves once with an arrow that comes in two chunks, and cancels nothing", () => {
    const { sent, press } = seated();
    press("\x1b");
    press("[B");
    vi.advanceTimersByTime(keyWaits.key);
    expect(sent).toEqual([{ kind: "down" }]);
  });
  it("cancels with an escape only once it stayed alone", () => {
    const { sent, press } = seated();
    press("\x1b");
    vi.advanceTimersByTime(keyWaits.key - 1);
    expect(sent).toEqual([]);
    vi.advanceTimersByTime(1);
    vi.runAllTimers();
    expect(sent).toEqual([{ kind: "cancel" }]);
  });
  it("types one character for one whose bytes come in two chunks", () => {
    const { sent, press } = seated();
    const bytes = Buffer.from("ñ");
    press(bytes.subarray(0, 1));
    press(bytes.subarray(1));
    expect(sent).toEqual([{ kind: "type", text: "ñ" }]);
  });
  it("takes what is pasted as one text: its line break confirms nothing", () => {
    const { sent, press } = seated();
    press("\x1b[200~uno\r\ndos\x1b[201~");
    expect(sent).toEqual([{ kind: "paste", text: "uno\r\ndos" }]);
  });
  it("reads the rest of a slow paste as its text, however late it comes: nothing in it is a key", () => {
    const { sent, press } = seated();
    press("\x1b[200~uno");
    vi.advanceTimersByTime(keyWaits.paste * 3);
    vi.runAllTimers();
    press("c\r\x1b[201~");
    expect(sent).toEqual([{ kind: "paste", text: "unoc\r" }]);
    press("\r");
    expect(sent.at(-1)).toEqual({ kind: "confirm" });
  });
  it("leaves with ctrl c from a paste whose end never comes, and hears no other key in it", async () => {
    const { sent, over, press } = seated();
    press("\x1b[200~uno");
    vi.advanceTimersByTime(keyWaits.paste);
    vi.runAllTimers();
    press("c\r");
    expect(sent).toEqual([]);
    press("\x03");
    await over;
    expect(sent).toEqual([{ kind: "quit" }]);
  });
  it("takes no escape for the escape key when its rest had arrived while the program was busy", () => {
    const { sent, press } = seated();
    press("\x1b");
    /** The wait is over, and the rest of the arrow is read before anything else runs. */
    vi.advanceTimersByTime(keyWaits.key);
    press("[B");
    vi.runAllTimers();
    expect(sent).toEqual([{ kind: "down" }]);
  });
});
