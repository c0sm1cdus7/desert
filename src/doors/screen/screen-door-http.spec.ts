import { randomUUID } from "node:crypto";
import { duplexPair } from "node:stream";
import { setTimeout as delay } from "node:timers/promises";
import { expect, it } from "vitest";
import { screenHttp } from "../../../tests/support/screen-http.ts";
import { fakeTime } from "../../../tests/support/screen-spy.ts";
import { socketHouse } from "../../../tests/support/socket-house.ts";
import { shopProgram, shopShown, type Shop } from "../../../tests/support/shop.ts";
import type { Intent } from "../../surface/contract/contract.ts";
import { doorTexts } from "../../texts/doors.texts.ts";
import { surfaceTexts } from "../../texts/surface.texts.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import { openHouseRouter } from "../socket/client/open-house-router.ts";
import { socketConnection } from "../socket/client/socket-connection.ts";
import { entryHouse } from "./entry-router.ts";
import { screenDoor, type WebShown } from "./screen-door.ts";
import { parseFrame, type Frame } from "./screen-wire.ts";

const key = "ana-terminal";
const invitation = "ABCD-2345";
const shown: WebShown<Shop> = { ...shopShown, hour: at => new Date(at).toISOString().slice(11, 16) };
const said = (frame: Frame): string => JSON.stringify(frame.screen);
/** Every response as it arrived: its headers and its body, to read what it should never hold. */
type Seen = { readonly headers: Headers; body: string; readonly epoch?: string };

it("signs in, reaches the Menu, opens a tool and runs an act, over local HTTP with one stream", async () => {
  const remote = await socketHouse("stream");
  let held: string | undefined;
  const door = screenDoor<Shop>({
    shown,
    time: fakeTime().time,
    epoch: () => randomUUID(),
    open: async () => {
      if (!held) {
        const redeem = (code: string) =>
          Promise.resolve(
            code === invitation
              ? ((held = key), { ok: true as const, text: "" })
              : { ok: false as const, reason: doorTexts.denied },
          );
        const bar = () => ({ state: "connected" as const, clock: shown.hour(Date.now()), now: Date.now() });
        return entryHouse({ redeem, bar, defect: () => toolTexts.baseFailure });
      }
      const connection = socketConnection<Shop>(held);
      const pair = duplexPair();
      remote.attach(pair[1]);
      await connection.attach(pair[0]);
      return openHouseRouter(connection, shopProgram, shown, { recentLines: 40 });
    },
  });
  const http = await screenHttp(door, "casa");
  const seen: Seen[] = [];
  /** The newest frame this client has, from an answer or from the stream: what its next batch stands on. */
  let current: Frame | undefined;
  const headers = { cookie: "sesion=una-sesion", "Content-Type": "application/json" };
  const post = async (path: string, body: unknown): Promise<Frame> => {
    const response = await fetch(`${http.url}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
    const text = await response.text();
    const parsed = parseFrame(JSON.parse(text));
    if (!parsed.ok) throw new Error(`not a frame: ${parsed.reason}`);
    seen.push({ headers: response.headers, body: text, epoch: parsed.value.epoch });
    current = parsed.value;
    return parsed.value;
  };
  const view = { visible: true, viewport: { rows: 26 } };
  let frame = await post("/surface/look", view);
  const leave = new AbortController();
  const stream = await fetch(`${http.url}/surface/stream?client=${frame.client}`, { headers, signal: leave.signal });
  const pushed: Frame[] = [];
  seen.push({ headers: stream.headers, body: "" });
  void (async () => {
    const decoder = new TextDecoder();
    let text = "";
    const reader = stream.body?.getReader();
    for (let read = await reader?.read(); read && !read.done; read = await reader?.read()) {
      const chunk: unknown = read.value;
      if (chunk instanceof Uint8Array) text += decoder.decode(chunk, { stream: true });
      const events = text.split("\n\n");
      text = events.pop() ?? "";
      for (const event of events.filter(line => line.startsWith("event: screen\ndata: "))) {
        const body = event.slice("event: screen\ndata: ".length);
        const parsed = parseFrame(JSON.parse(body));
        if (!parsed.ok) throw new Error(`not a frame: ${parsed.reason}`);
        seen.push({ headers: stream.headers, body, epoch: parsed.value.epoch });
        pushed.push(parsed.value);
        current = parsed.value;
      }
    }
  })().catch(() => undefined);
  const newest = (): Frame => current ?? frame;
  const until = async (holds: (frame: Frame) => boolean): Promise<Frame> => {
    for (let n = 0; n < 200; n++) {
      const looked = await post("/surface/look", { ...view, client: newest().client });
      if (holds(looked)) return looked;
      await delay(25);
    }
    throw new Error("the screen never came");
  };
  const act = async (intents: readonly Intent[]): Promise<Frame> => {
    const at = newest();
    frame = await post("/surface/intents", {
      epoch: at.epoch,
      client: at.client,
      seq: at.seq + 1,
      rev: at.rev,
      intents,
    });
    expect(frame.refused).toBeUndefined();
    return frame;
  };
  try {
    expect(frame.screen.title).not.toBe("");
    const entryEpoch = frame.epoch;
    await act([{ kind: "paste", text: invitation }, { kind: "confirm" }]);
    for (let n = 0; n < 200 && !pushed.some(known => known.epoch !== entryEpoch); n++) await delay(25);
    frame = await until(looked => looked.epoch !== entryEpoch && looked.screen.title === "Menú");
    for (const text of ["v", "r", "1"]) frame = await act([{ kind: "type", text }]);
    await act([{ kind: "confirm" }]);
    await act(Array.from("1500", text => ({ kind: "type", text })));
    await act([{ kind: "confirm" }]);
    frame = await until(looked => said(looked).includes(surfaceTexts.ok));
    expect(remote.house().tools.state().tools.sales.size).toBe(1);
    expect(seen.filter(response => response.headers.get("cache-control") !== "no-store")).toEqual([]);
    const holding = (text: string) =>
      seen.filter(({ headers: h, body }) => [...h.values(), body].join("\n").includes(text));
    expect(holding(key)).toEqual([]);
    expect(seen.filter(({ headers: h }) => [...h.values()].join("\n").includes(invitation))).toEqual([]);
    // The entry's own frames show the code as it is written, as any written field does; nothing after it holds it.
    expect(holding(invitation).filter(response => response.epoch !== entryEpoch)).toEqual([]);
  } finally {
    leave.abort();
    door.close("una-sesion");
    await http.close();
    await remote.close();
  }
});
