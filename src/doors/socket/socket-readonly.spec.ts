// What a terminal hands the program's code is read-only to the bottom, as in the house (law 256): a mutation fails at
// sight and changes neither the terminal's copy nor the house.
import { duplexPair } from "node:stream";
import { afterEach, expect, it } from "vitest";
import { mutate } from "../../../tests/support/state-mutations.ts";
import { socketHouse } from "../../../tests/support/socket-house.ts";
import type { Shop } from "../../../tests/support/shop.ts";
import { shopRegistry } from "../../../tests/support/shop.ts";
import type { State } from "../../tools/tool-contract.ts";
import { socketConnection } from "./socket-connection.ts";
import { socketPorts } from "./socket-ports.ts";
const cleanups: (() => Promise<void> | void)[] = [];
afterEach(async () => {
  for (const clean of cleanups.reverse()) await clean();
  cleanups.length = 0;
});
const attacks = {
  through: (s: State<Shop>) => Object.assign(s, { through: 0 }),
  admin: (s: State<Shop>) => Object.assign(s.house, { admin: "beto" }),
  grants: (s: State<Shop>) => mutate(s.house.grants, "set", "eve", ["sales"]),
  kits: (s: State<Shop>) => mutate(s.house.kits, "set", "beto", new Map([["sales", null]])),
};
for (const [name, attack] of Object.entries(attacks))
  it(`a terminal refuses ${name} on the state it hands the program, and the house is unchanged`, async () => {
    const f = await socketHouse("stream");
    cleanups.push(f.close);
    const connection = socketConnection<Shop>("ana-terminal");
    cleanups.push(connection.close);
    const pair = duplexPair();
    f.attach(pair[1]);
    await connection.attach(pair[0]);
    const ports = socketPorts(connection, { registry: shopRegistry, limits: { recentLines: 40 } });
    const before = { through: ports.state().through, admin: ports.state().house.admin };
    expect(() => attack(ports.state())).toThrow(TypeError);
    expect({ through: ports.state().through, admin: ports.state().house.admin }).toEqual(before);
    expect([ports.state().house.grants.has("eve"), ports.state().house.kits.has("beto")]).toEqual([false, false]);
    expect(f.house().tools.state().house.admin).toBe("ana");
    expect(ports.state()).toBe(ports.state());
  });
