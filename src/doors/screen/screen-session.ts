// One session of the screen door: its router, the clients looking at it, and the last frame each one was sent.
import type { Screen } from "../../surface/contract/contract.ts";
import { wire } from "../../surface/contract/wire.ts";
import type { OpenHouse } from "../socket/client/open-house-router.ts";
import { commitmentOf, type Commitment } from "./guard.ts";
import { screenLimits } from "./screen-limits.ts";
import type { Frame, WireRefusal } from "./screen-wire.ts";

export type Item = Frame | "keepalive";
/** One tab or phone looking at a session: its room, its place in the order, and what it was last sent. */
export interface Client {
  readonly id: string;
  visible: boolean;
  rows: number;
  /** The last batch of this client applied in this epoch. */
  seq: number;
  /** How many differing screens this client was sent. */
  rev: number;
  sent?: Frame;
  sentKey?: string;
  /** What an Enter meant on each of the last revs this client was sent. */
  readonly seen: Map<number, Commitment>;
  /** Set while the client has a stream open: it is attached then, and frames reach it. */
  push?: ((item: Item) => void) | undefined;
  end?: (() => void) | undefined;
}
/** A router a door keeps for one session and house, and the clients that share it, and so share its cursor. */
export interface Live {
  readonly epoch: string;
  readonly house: OpenHouse;
  readonly clients: Map<string, Client>;
  readonly unwatch: () => void;
}
/** The frame a client gets for a screen: its rev grows only when what travels differs from what it was sent. */
export function framed(live: Live, client: Client, screen: Screen): Frame {
  const wired = wire(screen);
  const key = JSON.stringify(wired);
  if (key !== client.sentKey || client.sent?.epoch !== live.epoch) {
    client.rev += 1;
    client.sentKey = key;
    client.seen.set(client.rev, commitmentOf(screen));
    client.seen.delete(client.rev - screenLimits.revs);
  }
  const frame: Frame = { v: 1, epoch: live.epoch, client: client.id, seq: client.seq, rev: client.rev, screen: wired };
  client.sent = frame;
  return frame;
}
/** What a client is looking at now without drawing again: what it was sent, or what the session last sent anyone. */
export function current(live: Live, client?: Client): Frame {
  const latest = client?.sent ?? [...live.clients.values()].map(other => other.sent).findLast(sent => sent);
  if (!latest) throw new Error("The screen door has drawn nothing in this session yet to answer with.");
  const seq = client?.seq ?? 0;
  return { v: 1, epoch: live.epoch, client: client?.id ?? "", seq, rev: latest.rev, screen: latest.screen };
}
/** A refusal changes nothing: it answers with the current frame and says why. */
export const refusal = (live: Live, client: Client | undefined, refused: WireRefusal): Frame => ({
  ...current(live, client),
  refused,
});
const attached = (live: Live): readonly Client[] =>
  [...live.clients.values()].filter(client => client.visible && client.push);
/** Draws once per distinct room for whoever looks, and sends each attached client its frame when it changed. The
 * client that asked, when there is one, gets its frame back whether it changed or not. */
export function drawAll(live: Live, asking?: Client): Frame | undefined {
  const looking = attached(live).filter(client => client !== asking);
  const all = asking?.visible ? [asking, ...looking] : looking;
  const drawn = new Map<number, Screen>();
  let answer: Frame | undefined;
  for (const client of all) {
    const screen = drawn.get(client.rows) ?? live.house.router.screen({ rows: client.rows });
    drawn.set(client.rows, screen);
    const before = client.rev;
    const frame = framed(live, client, screen);
    if (client === asking) answer = frame;
    else if (client.rev !== before) client.push?.(frame);
  }
  return answer;
}
/** A client this session knows, by the id a body carries; nothing when the body names none it knows. */
export const named = (live: Live, body: unknown): Client | undefined =>
  typeof body === "object" && body !== null && "client" in body && typeof body.client === "string"
    ? live.clients.get(body.client)
    : undefined;
