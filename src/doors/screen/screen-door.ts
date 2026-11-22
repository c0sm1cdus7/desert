// The screen door: one router per device session, screens out to whoever looks, intents in, in order, refused aloud.
import type { TimeSource } from "../../journal/clock.ts";
import type { Shown } from "../../surface/bridge/ports/house-ports.ts";
import { withOpeningNotices } from "../../surface/bridge/assembly/opening-notices.ts";
import { screenDoorTexts } from "../../texts/screen-door.texts.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { OpenHouse } from "../socket/client/open-house-router.ts";
import { terminalError } from "../terminal/terminal-error.ts";
import { commitmentOf, guarded, sameCommitment } from "./guard.ts";
import { screenLimits } from "./screen-limits.ts";
import { current, drawAll, framed, named, refusal, type Client, type Item, type Live } from "./screen-session.ts";
import { silentFrame } from "./screen-silence.ts";
import { streamOf } from "./screen-stream.ts";
import { parseLook, parseSend, type Frame, type Look, type Send, type WireRefusal } from "./screen-wire.ts";

/** How a program is shown on the web: its hour too, since a web server runs in no person's zone. */
export type WebShown<X extends Program> = Shown<X> & Readonly<{ hour: (at: number) => string }>;
export interface ScreenHost<X extends Program> {
  readonly shown: WebShown<X>;
  /** Builds what a session draws from, with the program's words and hour. The host owns keys, addresses and the
   * network; the door owns none of them. */
  readonly open: (session: Readonly<{ id: string; house: string }>, shown: WebShown<X>) => Promise<OpenHouse>;
  readonly time: TimeSource;
  /** Unpredictable; the host supplies it (node:crypto is not the door's). Names epochs and clients. */
  readonly epoch: () => string;
}
export interface ScreenDoor {
  /** A person has this in front: draws, and tells the door who is looking and how much room they have. */
  look(session: string, house: string, look: unknown): Promise<Frame>;
  /** What the person did. Always answers with the frame that results, refused or not. */
  send(session: string, house: string, body: unknown): Promise<Frame>;
  /** Frames pushed while this client is attached and visible. Ends when the session is cut or the client leaves. */
  stream(session: string, house: string, client: string, signal: AbortSignal): AsyncIterable<Item>;
  /** Ends a session at once (sign-out, key revoked). */
  close(session: string): void;
  /** How many routers are alive: what the specs and the host's health check read. */
  alive(): number;
}
/** A session of one person in one house: its router once open, and the cut armed from when anyone last asked. */
interface Slot {
  readonly session: string;
  readonly house: string;
  live?: Live | undefined;
  opening?: Promise<Live> | undefined;
  disarm: () => void;
}
/** Where a batch stands in its client's order: apply it, or answer this frame without applying it. */
type Ordered = { readonly apply: Client } | { readonly frame: Frame };
class Door<X extends Program> implements ScreenDoor {
  private readonly slots = new Map<string, Slot>();
  private readonly host: ScreenHost<X>;
  constructor(host: ScreenHost<X>) {
    this.host = host;
  }
  async look(session: string, house: string, body: unknown): Promise<Frame> {
    const parsed = parseLook(body);
    const known = this.slots.get(keyOf(session, house));
    if (!parsed.ok) {
      if (!known?.live) throw new Error("A first look that is not a look: nothing is drawn yet to refuse it with.");
      return refusal(known.live, named(known.live, body), parsed.reason);
    }
    const slot = known ?? this.slotOf(session, house);
    this.touch(slot);
    // A client that names itself to a session with no router comes back from a cut one, or from a restart.
    const back = parsed.value.client !== undefined && !slot.live && !slot.opening;
    const opened = await this.liveOf(slot, back).then(
      live => ({ live }),
      (error: unknown) => ({ error }),
    );
    if ("error" in opened) {
      const cut = this.slots.get(keyOf(session, house)) !== slot;
      return this.silent(cut ? screenDoorTexts.expired : terminalError(opened.error), parsed.value.client);
    }
    const { live } = opened;
    const client = this.attach(live, parsed.value);
    if (!client) return refusal(live, undefined, "client");
    client.visible = parsed.value.visible;
    client.rows = parsed.value.viewport.rows;
    const frame = client.visible ? framed(live, client, live.house.router.screen({ rows: client.rows })) : undefined;
    this.settle(slot);
    return frame ?? current(live, client);
  }
  async send(session: string, house: string, body: unknown): Promise<Frame> {
    const slot = this.slots.get(keyOf(session, house));
    const live = slot?.live ?? (await slot?.opening?.catch(() => undefined));
    const id =
      typeof body === "object" && body && "client" in body && typeof body.client === "string" ? body.client : "";
    if (!slot || !live) return this.silent(screenDoorTexts.expired, id, "epoch");
    this.touch(slot);
    const parsed = parseSend(body);
    if (!parsed.ok) return refusal(live, named(live, body), parsed.reason);
    const ordered = order(live, parsed.value);
    if ("frame" in ordered) return ordered.frame;
    return stale(live, ordered.apply, parsed.value)
      ? refusal(live, ordered.apply, "stale")
      : this.apply(slot, live, ordered.apply, parsed.value);
  }
  stream(session: string, house: string, client: string, signal: AbortSignal): AsyncIterable<Item> {
    const slot = this.slots.get(keyOf(session, house));
    if (slot) this.touch(slot);
    const left = () => (slot && this.slots.get(keyOf(session, house)) === slot ? this.touch(slot) : undefined);
    return streamOf(slot?.live?.clients.get(client), this.host.time, signal, left);
  }
  close(session: string): void {
    [...this.slots.values()].filter(slot => slot.session === session).forEach(slot => this.cut(slot));
  }
  alive(): number {
    return [...this.slots.values()].filter(slot => slot.live).length;
  }
  private slotOf(session: string, house: string): Slot {
    const slot: Slot = { session, house, disarm: () => {} };
    this.slots.set(keyOf(session, house), slot);
    return slot;
  }
  /** A session no client is attached to and nobody asked for in idleMs is closed: time is the host's, never ours. */
  private touch(slot: Slot): void {
    slot.disarm();
    slot.disarm = this.host.time.wait(this.host.time.now() + screenLimits.idleMs, () => {
      const attached = [...(slot.live?.clients.values() ?? [])].some(client => client.push);
      if (!attached && this.slots.get(keyOf(slot.session, slot.house)) === slot) this.cut(slot);
    });
  }
  private cut(slot: Slot): void {
    slot.disarm();
    this.slots.delete(keyOf(slot.session, slot.house));
    const { live } = slot;
    slot.live = undefined;
    if (!live) return;
    live.unwatch();
    live.house.close();
    live.clients.forEach(client => client.end?.());
  }
  /** A house that ended for good (revoked key, unverifiable state) closes its session; a next look opens another. */
  private settle(slot: Slot): void {
    if (slot.live?.house.ended()) this.cut(slot);
  }
  /** A tick of the router: an ended house closes the session, an admitted entry gives way to the house, and whoever
   * looks gets what changed. */
  private changed(slot: Slot): void {
    this.settle(slot);
    const { live } = slot;
    if (!live) return;
    if (!live.house.admitted?.()) {
      drawAll(live);
      return;
    }
    this.replace(slot, live).then(
      next => drawAll(next),
      () => this.cut(slot),
    );
  }
  private liveOf(slot: Slot, back = false): Promise<Live> {
    return slot.live ? Promise.resolve(slot.live) : (slot.opening ?? this.open(slot, new Map(), back));
  }
  /** While a router is being opened, whatever else arrives for the session waits for it. */
  private open(slot: Slot, clients: Map<string, Client>, back = false): Promise<Live> {
    const opening = this.start(slot, clients, back).finally(() => {
      if (slot.opening === opening) slot.opening = undefined;
    });
    slot.opening = opening;
    return opening;
  }
  private async start(slot: Slot, clients: Map<string, Client>, back: boolean): Promise<Live> {
    const opened = await this.host.open({ id: slot.session, house: slot.house }, this.host.shown);
    // Cut while the host was opening it: nobody would ever stop this router.
    if (this.slots.get(keyOf(slot.session, slot.house)) !== slot) {
      opened.close();
      throw new Error("The session was cut while its house was being opened.");
    }
    const notice = withOpeningNotices(opened.router, [screenDoorTexts.expired]);
    const house = back ? { ...opened, router: notice } : opened;
    clients.forEach(client => (client.seq = 0));
    const unwatch = house.router.watch(() => this.changed(slot));
    const live: Live = { epoch: this.host.epoch(), house, clients, unwatch };
    slot.live = live;
    return live;
  }
  /** S14: a client that looks again moves to the back of the line; a new one takes the place of the client that
   * looked longest ago and has no stream open (a tab reloaded or closed); with all of them attached it is refused. */
  private attach(live: Live, look: Look): Client | undefined {
    const known = look.client === undefined ? undefined : live.clients.get(look.client);
    if (known) {
      live.clients.delete(known.id);
      live.clients.set(known.id, known);
      return known;
    }
    const left = [...live.clients.values()].find(client => !client.push);
    if (live.clients.size >= screenLimits.clients && left) live.clients.delete(left.id);
    if (live.clients.size >= screenLimits.clients) return undefined;
    const { visible, viewport } = look;
    const client: Client = { id: this.host.epoch(), visible, rows: viewport.rows, seq: 0, rev: 0, seen: new Map() };
    live.clients.set(client.id, client);
    return client;
  }
  /** A batch applied whole, in arrival order; a quit leaves this router behind, and the next one answers. */
  private async apply(slot: Slot, live: Live, client: Client, send: Send): Promise<Frame> {
    const quit = send.intents.some(intent => !live.house.router.send(intent));
    if (!quit) client.seq = send.seq;
    const next = quit
      ? await this.replace(slot, live).then(
          now => ({ now }),
          (error: unknown) => ({ error }),
        )
      : { now: live };
    if ("error" in next) return this.silent(terminalError(next.error), client.id);
    const frame = drawAll(next.now, client) ?? current(next.now, client);
    this.settle(slot);
    return frame;
  }
  /** One of the two screens the door builds: a catalogued reason, at the program's hour, and no router behind. */
  private silent(reason: string, client = "", refused?: WireRefusal): Frame {
    return silentFrame(reason, this.host.shown.hour(this.host.time.now()), client, refused);
  }
  /** The router asked to be left behind: the session goes on in a new epoch, with the same clients looking. When
   * no next router opens, their streams end with the one left behind: nothing would ever be pushed on them. */
  private replace(slot: Slot, live: Live): Promise<Live> {
    live.unwatch();
    live.house.close();
    slot.live = undefined;
    return this.open(slot, live.clients).catch((error: unknown) => {
      live.clients.forEach(client => client.end?.());
      throw error;
    });
  }
}
const keyOf = (session: string, house: string): string => JSON.stringify([session, house]);
/** S5: the next batch is applied; the same one again answers what it led to; a skipped or an old one is refused. */
function order(live: Live, send: Send): Ordered {
  const client = live.clients.get(send.client);
  if (send.epoch !== live.epoch) return { frame: refusal(live, client, "epoch") };
  if (!client) return { frame: refusal(live, undefined, "client") };
  if (send.seq === client.seq) return { frame: drawAll(live, client) ?? current(live, client) };
  if (send.seq > client.seq + 1) return { frame: refusal(live, client, "gap") };
  if (send.seq < client.seq) return { frame: refusal(live, client, "old") };
  return { apply: client };
}
/** S6: a batch that commits to the screen is refused whole when what its rev meant is not what the screen means now,
 * or its rev left the ring. The screen now is drawn for a client that looks, and is what it was last sent if not. */
function stale(live: Live, client: Client, send: Send): boolean {
  if (!send.intents.some(guarded)) return false;
  const seen = client.seen.get(send.rev);
  const now = client.visible ? framed(live, client, live.house.router.screen({ rows: client.rows })) : client.sent;
  return !seen || !now || !sameCommitment(seen, commitmentOf(now.screen));
}
export const screenDoor = <X extends Program>(host: ScreenHost<X>): ScreenDoor => new Door(host);
