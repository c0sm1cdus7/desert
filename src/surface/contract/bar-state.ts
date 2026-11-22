// The one state a Bar shows for two links: the device's to its server, and the house's to the device.
import type { Screen } from "./contract.ts";
/** The link of this device to its server, which the screen cannot know. */
export type Link = "connected" | "connecting" | "signal-lost";
/** No signal wins (REGLAS §4); then a house that says it is disconnected; then either one still connecting. */
export function barState(link: Link, house: Screen["state"]): Screen["state"] {
  if (link === "signal-lost" || house === "signal-lost") return "signal-lost";
  if (house === "disconnected") return "disconnected";
  return link === "connecting" || house === "connecting" ? "connecting" : "connected";
}
