import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";
import { authenticate } from "./mcp-access.ts";
import type { DoorKey } from "../socket/peers/socket-peer.ts";
it("visits every key even on a match, with different lengths and terminal keys interleaved", () => {
  const first = randomUUID();
  const last = randomUUID().repeat(2);
  const terminal = randomUUID();
  const keys = new Map<string, DoorKey>([
    [first, { identity: "ana", door: "agente" }],
    [terminal, { identity: "ana", door: "terminal" }],
    [last, { identity: "beto", door: "agente" }],
  ]);
  const visit = vi.fn();
  vi.spyOn(keys, Symbol.iterator).mockImplementation(function* () {
    for (const entry of keys.entries()) {
      visit();
      yield entry;
    }
    return undefined;
  });
  for (const [key, identity] of [
    [first, "ana"],
    [last, "beto"],
    [terminal, undefined],
    ["x", undefined],
  ] as const) {
    visit.mockClear();
    const authenticated = authenticate(
      { method: "POST", path: "/mcp", headers: { authorization: `Bearer ${key}` }, body: () => [] },
      keys,
    );
    expect(authenticated?.identity).toBe(identity);
    expect(visit).toHaveBeenCalledTimes(keys.size);
  }
});
it("rejects ambiguous authorization and empty bearer material", () => {
  const key = randomUUID();
  const keys = new Map<string, DoorKey>([[key, { identity: "ana", door: "agente" }]]);
  for (const headers of [
    { Authorization: `Bearer ${key}`, authorization: `Bearer ${key}` },
    { authorization: [`Bearer ${key}`, `Bearer ${key}`] },
    { authorization: "Bearer " },
    { authorization: `Basic ${key}` },
  ]) {
    const authenticated = authenticate({ method: "POST", path: "/mcp", headers, body: () => [] }, keys);
    expect(authenticated === undefined).toBe(true);
  }
});
