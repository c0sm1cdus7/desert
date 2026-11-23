// The only screens the door builds itself, worded by a catalogued reason alone: a lost session, an unopened house.
import { workingLanguage } from "../../fields/languages.ts";
import { everySaid } from "../../fields/phrases.ts";
import type { Screen } from "../../surface/contract/contract.ts";
import { wire } from "../../surface/contract/wire.ts";
import { surfaceTexts } from "../../texts/surface.texts.ts";
import type { Frame, WireRefusal } from "./screen-wire.ts";

/** The shape of the router's own defect screen, with nothing to do but wait: no hints, no Menu. */
const silence = (reason: string, clock: string): Screen => ({
  language: workingLanguage,
  title: everySaid(surfaceTexts.error),
  state: "disconnected",
  clock,
  body: { kind: "thread", events: [{ text: [{ text: reason, tone: "cut" }] }] },
  hints: [],
  menu: false,
});
/** A frame of no epoch: the client has no router behind it, so its next look asks for one. */
export const silentFrame = (reason: string, clock: string, client: string, refused?: WireRefusal): Frame => ({
  v: 1,
  epoch: "",
  client,
  seq: 0,
  rev: 1,
  screen: wire(silence(reason, clock)),
  ...(refused ? { refused } : {}),
});
