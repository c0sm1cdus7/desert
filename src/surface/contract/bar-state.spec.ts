// barState: the one state a Bar shows for two links, written out whole, with no signal winning from either side.
import { expect, it } from "vitest";
import { barState, type Link } from "./bar-state.ts";
import type { Screen } from "./contract.ts";
import * as entry from "./public-contract.ts";

type State = Screen["state"];
const table: readonly (readonly [Link, State, State])[] = [
  ["connected", "connected", "connected"],
  ["connected", "connecting", "connecting"],
  ["connected", "signal-lost", "signal-lost"],
  ["connected", "disconnected", "disconnected"],
  ["connecting", "connected", "connecting"],
  ["connecting", "connecting", "connecting"],
  ["connecting", "signal-lost", "signal-lost"],
  ["connecting", "disconnected", "disconnected"],
  ["signal-lost", "connected", "signal-lost"],
  ["signal-lost", "connecting", "signal-lost"],
  ["signal-lost", "signal-lost", "signal-lost"],
  ["signal-lost", "disconnected", "signal-lost"],
];
it("gives the Bar one state for the device's link and the house's, the whole table written out", () => {
  expect(table.map(([link, house]) => [link, house, barState(link, house)])).toEqual(table);
});
it("lets no signal win from either side", () => {
  const sides = table.filter(([link, house]) => link === "signal-lost" || house === "signal-lost");
  expect(sides.length).toBe(6);
  expect(sides.map(([link, house]) => barState(link, house))).toEqual(sides.map(() => "signal-lost"));
});
it("is published for renderers by desert/surface/contract", () => {
  expect(entry.barState).toBe(barState);
});
