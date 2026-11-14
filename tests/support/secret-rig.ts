// Synthetic action data only; no on-disk vault is opened by these integration tests.
import { Type, type TSchema } from "@sinclair/typebox";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
export { has } from "./secret-search.ts";
import { afterEach, vi } from "vitest";
import { Redactor } from "../../src/adapters/secrets/redact.ts";
import { startHouse, localPorts, type HouseOptions } from "../../src/programs/house-runtime.ts";
import { vocabulary, type Event, type ProgramFacts } from "../../src/journal/events.ts";
import { toolAct } from "../../src/tools/act-definition.ts";
import type { ToolAct, Slices } from "../../src/tools/tool-contract.ts";
import { MemoryHouseKeys } from "../../src/adapters/secrets/custody/house-keys.ts";
vi.mock("../../src/adapters/secrets/secret-vault.ts", async () => {
  const { Redactor } = await import("../../src/adapters/secrets/redact.ts");
  return {
    SecretVault: class extends Redactor<P> {
      constructor(_file: string, schema: TSchema) {
        super(schema, () => `secret:${randomUUID()}`);
      }
      close() {}
    },
  };
});
export { Redactor };
export const secret = Type.Object({ value: Type.String({ secret: true }) });
export const catalog = {
  "sale-registered": Type.Object({ value: Type.String({ secret: true, maxLength: 13 }), copy: Type.String() }),
};
export const words = vocabulary(catalog);
export type P = {
  fact: ProgramFacts<typeof catalog>;
  tools: { vault: readonly Event<ProgramFacts<typeof catalog>>[] };
};
export const slices: Slices<P> = { initial: { vault: [] }, step: { vault: (state, event) => [...state, event] } };
export const time = { now: () => 1000, wait: () => () => {} };
export const homes: string[] = [];
const opened: { close(): void }[] = [];
afterEach(() => {
  opened.splice(0).forEach(house => house.close());
  homes.splice(0).forEach(path => rmSync(path, { recursive: true, force: true }));
});
export const home = () => {
  const path = mkdtempSync(join(tmpdir(), "a01-synthetic-"));
  homes.push(path);
  return path;
};
function optionsFor(act: ToolAct<P>, changed: Partial<HouseOptions<P>>): HouseOptions<P> {
  return {
    by: "fixture",
    projectionVersion: "fixture/1",
    secretKeys: new MemoryHouseKeys(),
    words,
    slices,
    creation: { admin: "ana", assignments: [{ identity: "ana", tools: ["vault", "other"] }] },
    registry: [
      {
        id: "vault",
        purpose: "Dato inventado",
        targets: () => ["child"],
        view: () => "",
        summary: () => "",
        acts: { set: act },
      },
      {
        id: "other",
        purpose: "Texto público",
        targets: () => [],
        view: () => "",
        summary: () => "",
        acts: {
          set: toolAct(Type.Object({ value: Type.String() }), value => ({ status: "accepted", text: value.value })),
        },
      },
    ],
    ...changed,
  };
}
export function fixture(
  input: TSchema = secret,
  run: ToolAct<P>["run"] = () => ({ status: "accepted", text: "Guardado" }),
  extra: Partial<ToolAct<P>> = {},
  changed: Partial<HouseOptions<P>> = {},
) {
  const act: ToolAct<P> = { ...toolAct(input, run), ...extra };
  const options = optionsFor(act, changed);
  const path = home();
  let house = startHouse(path, options, time);
  opened.push(house);
  const ports = () => localPorts(house, "ana", { recentLines: 20 });
  ports().act({ act: "attend", input: { target: "vault" } }, 0);
  return {
    path,
    options,
    get house() {
      return house;
    },
    ports,
    set: (input: unknown, target = "vault") => ports().act({ act: "set", target, input }, 0),
    facts: () => house.journal.replay<Event<P["fact"]>[]>([], (all, event) => [...all, event]),
    restart: () => {
      house.close();
      house = startHouse(path, options, time);
      opened.push(house);
    },
    close: () => house.close(),
  };
}
export const ref = (value: unknown) => typeof value === "string" && /^secret:[0-9a-f-]{36}$/u.test(value);
export const inputOf = (rig: ReturnType<typeof fixture>) =>
  rig
    .facts()
    .flatMap(event => (event.kind === "act" && event.data.option === "set" ? [event.data.input] : []))
    .at(-1);
export const field = (value: unknown, key: string): unknown =>
  value && typeof value === "object" ? Reflect.get(value, key) : undefined;
