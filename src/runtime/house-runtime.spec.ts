import "../../tests/support/fixture-vault.ts";
// A house on disk: created once, reopened as it was, with its secrets out of the journal.
import { Type } from "@sinclair/typebox";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { toolAct } from "../tools/act-definition.ts";
import type { Tool } from "../tools/tool-contract.ts";
import { localPorts, startHouse } from "./house-runtime.ts";
import type { HouseOptions } from "../house/state.ts";
import { MemoryHouseKeys } from "../keychain/custody/house-keys.ts";
import { shop, shopRegistry, shopSlices, type Shop, type ShopEvent } from "../../tests/support/shop.ts";

const homes: string[] = [];
const houses: { close(): void }[] = [];
afterEach(() => {
  houses.splice(0).forEach(house => house.close());
  homes.splice(0).forEach(home => rmSync(home, { recursive: true, force: true }));
});
const home = () => {
  const path = mkdtempSync(join(tmpdir(), "desert-house-"));
  homes.push(path);
  return path;
};
const secretKey = "sk-live-0123456789abcdef";
const key = Type.Object({ value: Type.String({ minLength: 12, secret: true }) });
const vault: Tool<Shop> = {
  id: "vault",
  purpose: "Keeps a key of the test.",
  targets: () => [],
  view: () => "",
  summary: () => "",
  acts: { set: toolAct(key, () => ({ status: "accepted", text: "Kept" })) },
};
const registry = [...shopRegistry, vault];
const options: HouseOptions<Shop> = {
  by: "shop",
  projectionVersion: "shop/1",
  creation: { admin: "ana", assignments: [{ identity: "ana", tools: registry.map(tool => tool.id) }] },
  secretKeys: new MemoryHouseKeys(),
  words: shop,
  registry,
  slices: shopSlices,
};
const start = (path: string, changed: Partial<HouseOptions<Shop>> = {}) => {
  const house = startHouse<Shop>(path, { ...options, ...changed });
  houses.push(house);
  return house;
};
const facts = (house: ReturnType<typeof start>) =>
  house.journal.replay<ShopEvent[]>([], (events, event) => [...events, event]);

describe("a house on disk", () => {
  it("is created once, boots every time it opens, and comes back as it was", () => {
    const path = home();
    const first = start(path);
    const ana = localPorts(first, "ana", { recentLines: 20 });
    ana.act({ act: "attend", input: { target: "sales" } }, 0);
    expect(ana.act({ act: "register", target: "sales", input: { sale: "s1", total: 10 } }, 0).status).toBe("accepted");
    const before = first.tools.state();
    first.close();
    const second = start(path, { creation: { admin: "beto", assignments: [] } });
    expect(second.tools.state().house.admin).toBe("ana");
    expect(second.tools.state().tools).toEqual(before.tools);
    expect(facts(second).filter(event => event.kind === "house-created")).toHaveLength(1);
    expect(facts(second).filter(event => event.kind === "boot")).toHaveLength(2);
    expect(statSync(join(path, "journal.sqlite")).mode & 0o777).toBe(0o600);
    expect(statSync(join(path, "fixture.sqlite")).mode & 0o777).toBe(0o600);
  });

  it("writes everything one act writes at one instant, whatever the clock does meanwhile", () => {
    /** A clock that moves at every look, as a real one does between two facts. */
    let ticks = 1_000;
    const time = { now: () => (ticks += 7), wait: () => () => {} };
    const house = startHouse<Shop>(home(), options, time);
    houses.push(house);
    const ana = localPorts(house, "ana", { recentLines: 20 });
    ana.act({ act: "attend", input: { target: "sales" } }, 0);
    const from = facts(house).length;
    expect(ana.act({ act: "register", target: "sales", input: { sale: "s1", total: 10 } }, 0).status).toBe("accepted");
    const written = facts(house)
      .slice(from)
      .filter(event => ["sale-registered", "act-done", "tool-entry"].includes(event.kind));
    expect(written.map(event => event.kind)).toEqual(["sale-registered", "act-done", "tool-entry"]);
    expect(new Set(written.map(event => event.at)).size).toBe(1);
  });

  it("reads and acts for a surface as one identity, with what that identity may read", () => {
    const house = start(home());
    const ana = localPorts(house, "ana", { recentLines: 20 });
    expect(ana.state().by).toBe("ana");
    ana.act({ act: "attend", input: { target: "sales" } }, 0);
    expect(ana.state().attends).toEqual(["sales"]);
    expect(house.tools.state().attends).toEqual([]);
    const stranger = localPorts(house, "carla", { recentLines: 20 });
    expect(stranger.act({ act: "attend", input: { target: "sales" } }, 0).status).toBe("rejected");
  });

  it("keeps a value its act marks as secret out of the journal, across a restart", () => {
    const path = home();
    const first = start(path);
    const ana = localPorts(first, "ana", { recentLines: 20 });
    ana.act({ act: "attend", input: { target: "vault" } }, 0);
    expect(ana.act({ act: "set", target: "vault", input: { value: secretKey } }, 0).status).toBe("accepted");
    expect(JSON.stringify(facts(first))).not.toContain(secretKey);
    expect(JSON.stringify(facts(first))).toContain("secret:");
    first.close();
    expect(readFileSync(join(path, "journal.sqlite")).includes(secretKey)).toBe(false);
    const second = start(path);
    localPorts(second, "ana", { recentLines: 20 }).act({ act: "set", target: "vault", input: { value: secretKey } }, 0);
    expect(JSON.stringify(facts(second))).not.toContain(secretKey);
  });

  it("does not open without an identity to run as, nor with a part that no tool keeps", () => {
    const unopened = join(tmpdir(), "desert-unopened-house");
    expect(() => startHouse<Shop>(unopened, { ...options, by: "" })).toThrow("explicit identity");
    expect(() => startHouse<Shop>(unopened, { ...options, registry: [vault] })).toThrow(
      "No tool keeps the parts sales, payments",
    );
    expect(existsSync(unopened)).toBe(false);
  });
});

it("rechaza al componer posiciones secretas sin proveedor y admite programas sin ellas (a5)", () => {
  const path = home();
  const { secretKeys: _keys, ...withoutKeys } = options;
  expect(() => startHouse(path, withoutKeys)).toThrow(expect.objectContaining({ code: "E-CUSTODY-PROVIDER" }));
  expect(existsSync(join(path, "journal.sqlite"))).toBe(false);
  const plain = startHouse(path, { ...withoutKeys, registry: shopRegistry });
  houses.push(plain);
  expect(plain.tools.state().house.admin).toBe("ana");
});

it("un hecho con posición secreta también exige proveedor al componer", () => {
  const path = home();
  const { secretKeys: _keys, ...withoutKeys } = options;
  expect(() =>
    startHouse(path, {
      ...withoutKeys,
      registry: shopRegistry,
      words: { ...shop, event: Type.Object({ key }) },
    }),
  ).toThrow(expect.objectContaining({ code: "E-CUSTODY-PROVIDER" }));
  expect(existsSync(join(path, "journal.sqlite"))).toBe(false);
});

it("las acciones propias declaradas al componer también exigen proveedor", () => {
  const { secretKeys: _keys, ...withoutKeys } = options;
  for (const input of [Type.Object({ value: Type.String() }), key]) {
    const path = home();
    const own = () => [
      {
        ...toolAct<Shop, typeof input>(input, () => ({ status: "accepted" })),
        object: "own",
        option: "set",
        purpose: "Inventado",
      },
    ];
    const open = () => {
      const house = startHouse(path, { ...withoutKeys, registry: shopRegistry, own });
      houses.push(house);
      return house;
    };
    if (input === key) {
      expect(open).toThrow(expect.objectContaining({ code: "E-CUSTODY-PROVIDER" }));
      expect(existsSync(join(path, "journal.sqlite"))).toBe(false);
    } else expect(open().tools.state().house.admin).toBe("ana");
  }
});
it("control roto: la limpieza literal previa sigue protegiendo a una acción que repite el ingreso", () => {
  const echo = toolAct<Shop, typeof key>(key, input => ({ status: "accepted", text: `Kept ${input.value}` }));
  const house = start(home(), { registry: [...shopRegistry, { ...vault, acts: { set: echo } }] });
  const ana = localPorts(house, "ana", { recentLines: 20 });
  ana.act({ act: "attend", input: { target: "vault" } }, 0);
  expect(ana.act({ act: "set", target: "vault", input: { value: secretKey } }, 0).status).toBe("accepted");
  expect(JSON.stringify(facts(house))).not.toContain(secretKey);
  expect(JSON.stringify(facts(house))).toContain("Kept secret:");
});
it("declarar vínculos exige proveedor aunque no haya campos secretos", () => {
  const { secretKeys: _keys, ...withoutKeys } = options;
  expect(() =>
    startHouse(home(), { ...withoutKeys, registry: shopRegistry, credentialSlots: { sales: ["signing"] } }),
  ).toThrow(expect.objectContaining({ code: "E-CUSTODY-PROVIDER" }));
});
