import { duplexPair } from "node:stream";
import { afterEach, expect, it, vi } from "vitest";
import { openProgramTerminal } from "./open-terminal.ts";
import { connectTerminal } from "./terminal-client.ts";
import { socketConnection } from "../doors/socket/socket-connection.ts";
import { socketHouse } from "../../tests/support/socket-house.ts";
import { shopProgram, shopShown, type Shop } from "../../tests/support/shop.ts";
import { identityView } from "../house/house.ts";
import { stateTransfer } from "../doors/socket/state-transfer.ts";
import { frameReader, serverFrame } from "../doors/socket/frame.ts";
import { readClient, readServer } from "../doors/socket/protocol.ts";
import { socketTexts } from "../texts/socket.texts.ts";
import { houseProtocolVersion, socketLimits } from "../catalogs/levers.ts";
const tty = vi.hoisted(() => ({ written: "", raw: false, paused: false }));
vi.mock("./terminal-client.ts", () => ({ connectTerminal: vi.fn() }));
vi.mock("../doors/terminal/boot.ts", async importOriginal => {
  const original = await importOriginal<typeof import("../doors/terminal/boot.ts")>();
  return {
    ...original,
    startTerminal: (
      _out: unknown,
      _in: unknown,
      router: Parameters<typeof original.startTerminal>[2],
      signal: AbortSignal,
    ) =>
      original.startTerminal(
        {
          columns: 80,
          rows: 24,
          write: bytes => {
            tty.written += bytes;
          },
          on: () => {},
        },
        {
          setRawMode: on => {
            tty.raw = on;
          },
          on: () => {},
          resume: () => {},
          pause: () => {
            tty.paused = true;
          },
        },
        router,
        signal,
      ),
  };
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  process.exitCode = 0;
});
it.each([false, true])(
  "s12: the public terminal exits nonzero for a false house (already inside: %s)",
  async inside => {
    const f = await socketHouse("stream");
    const pair = duplexPair();
    const c = socketConnection<Shop>("fixture");
    const output = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    tty.written = "";
    tty.raw = false;
    tty.paused = false;
    const view = identityView(f.house().tools.state(), "ana");
    const good = stateTransfer(view, undefined, 0);
    const bad = good.map((frame, index) => {
      if (index) return frame;
      const header = readServer(JSON.parse(frame.subarray(5).toString()));
      if (header.tipo !== "estado") throw new Error("Missing fixture header");
      return serverFrame({ ...header, huella: "0".repeat(64) });
    });
    let requests = 0;
    const reader = frameReader("client", value => {
      const message = readClient(value);
      if (message.tipo === "hola") {
        pair[1].write(
          serverFrame({
            tipo: "bienvenida",
            protocolo: houseProtocolVersion,
            identidad: "ana",
            admin: true,
            ahora: 0,
            seq: view.through,
          }),
        );
        for (const frame of inside ? good : bad) pair[1].write(frame);
      } else if (message.tipo === "sincronizar" && ++requests < 10) for (const frame of bad) pair[1].write(frame);
    });
    pair[1].on("data", (bytes: Buffer) => reader.push(bytes));
    vi.mocked(connectTerminal).mockImplementation(async () => {
      await c.attach(pair[0]);
      return c;
    });
    const running = openProgramTerminal("/fixture", "/fixture", "fixture", shopProgram, shopShown);
    try {
      if (inside) {
        await vi.waitFor(() => expect(tty.raw).toBe(true));
        for (const frame of bad) pair[1].write(frame);
      }
      await vi.waitFor(() => expect(process.exitCode).toBe(1));
      await running;
      expect(requests).toBe(2);
      expect(output.mock.calls.at(-1)).toEqual([`${socketTexts.stateUnverified}\n`]);
      expect(output.mock.calls).toHaveLength(2);
      if (inside) {
        expect(tty.raw).toBe(false);
        expect(tty.paused).toBe(true);
      }
    } finally {
      c.close();
      pair[1].destroy();
      await running;
      await f.close();
    }
  },
);
it("intermediate welcomes still end the public opening at five seconds with a catalog line", async () => {
  vi.useFakeTimers();
  const pair = duplexPair();
  pair[1].resume();
  const c = socketConnection<Shop>("fixture");
  const output = vi.spyOn(process.stderr, "write").mockReturnValue(true);
  vi.mocked(connectTerminal).mockImplementation(async () => {
    await c.attach(pair[0]);
    return c;
  });
  const running = openProgramTerminal("/fixture", "/fixture", "fixture", shopProgram, shopShown);
  try {
    for (let n = 0; n < 5; n++) {
      pair[1].write(
        serverFrame({
          tipo: "bienvenida",
          protocolo: houseProtocolVersion,
          identidad: "ana",
          admin: true,
          ahora: n,
          seq: n,
        }),
      );
      await vi.advanceTimersByTimeAsync(socketLimits.helloMs / 5);
    }
    expect(process.exitCode).toBe(1);
    expect(output.mock.calls).toEqual([[`${socketTexts.startTimeout}\n`]]);
  } finally {
    c.close();
    pair[1].destroy();
    await running;
  }
});
