import { describe, expect, it } from "vitest";
import { Value } from "@sinclair/typebox/value";
import { emptyHouse, houseStep, type House } from "./members.ts";
import { allowedAct, effectiveKit } from "./kit.ts";
import { vocabulary } from "../journal/vocabulary.ts";
import { expandKit, selectionKit } from "./kit-selection.ts";
const words = vocabulary({});
const registry = [
  {
    id: "sales",
    actionTools: { create: "products", import: "products", charge: "payments" },
    acts: { create: {}, import: {}, charge: {} },
  },
] as const;
const folder = selectionKit([{ kind: "tool", program: "sales", tool: "products" }]);
const single = selectionKit([{ kind: "action", program: "sales", tool: "products", action: "create" }]);
const record = (kind: string, data: unknown, seq = 1, by = "ana") =>
  words.read({ layer: "house", kind, data, by, cause: [], id: `e${seq}`, seq, at: seq });
describe("folder kits", () => {
  it("expands folders with new actions and keeps explicit actions explicit", () => {
    expect(expandKit(folder, registry)).toEqual([{ tool: "sales", acts: ["create", "import"] }]);
    expect(expandKit(single, registry)).toEqual([{ tool: "sales", acts: ["create"] }]);
    expect(expandKit(single, [{ ...registry[0], acts: { import: {} } }])).toEqual([]);
  });
  it("reads mixed grants without widening retained historical restrictions", () => {
    let house: House = { ...emptyHouse, identities: true };
    const events = [
      record("house-created", {}),
      record("granted", { identity: "beto", tools: ["sales"] }, 2),
      record("kit-set", { holder: "beto", tool: "sales", acts: ["create"] }, 3),
      record("granted", { identity: "beto", tools: ["sales", "notes"] }, 4),
    ];
    for (const event of events) house = houseStep(house, event);
    expect(allowedAct(house, "beto", "sales", "import", registry)).toBe(false);
    house = houseStep(house, record("kit-set", { version: 2, holder: "beto", kit: folder }, 5));
    expect(allowedAct(house, "beto", "sales", "import", registry)).toBe(true);
    expect(allowedAct(house, "beto", "sales", "charge", registry)).toBe(false);
  });
  it("H2 ignores attempts to trim the administrator, but trims a member", () => {
    let house = houseStep({ ...emptyHouse, identities: true }, record("house-created", {}));
    house = houseStep(house, record("granted", { version: 2, identity: "beto", kit: folder }, 2));
    for (const holder of ["ana", "beto"])
      house = houseStep(house, record("kit-set", { version: 2, holder, kit: selectionKit([]) }, 3));
    expect(allowedAct(house, "ana", "sales", "create", registry)).toBe(true);
    expect(allowedAct(house, "beto", "sales", "create", registry)).toBe(false);
    expect(house.grants.has("beto")).toBe(true);
  });
  it("writes only v2 while historical facts retain their bytes and provenance", () => {
    const old = record("granted", { identity: "beto", tools: ["sales"] });
    const { id: _id, seq: _seq, at: _at, ...emission } = old;
    expect(Value.Check(words.emission, emission)).toBe(false);
    expect(old.data).toEqual({ identity: "beto", tools: ["sales"] });
    expect(Value.Check(words.emission, { ...emission, data: { version: 2, identity: "beto", kit: folder } })).toBe(
      true,
    );
  });
});

it("keeps a migrated old tool inside its scope when the new program grows siblings", () => {
  let house = houseStep(emptyHouse, record("house-created", {}));
  house = houseStep(house, record("granted", { identity: "beto", tools: ["products"] }, 2));
  house = {
    ...house,
    kitMigration: {
      version: 1,
      scopes: [{ from: "products", program: "sales", tool: "products" }],
      actions: [],
      retired: [],
    },
  };
  expect(allowedAct(house, "beto", "sales", "create", registry)).toBe(true);
  expect(allowedAct(house, "beto", "sales", "import", registry)).toBe(true);
  expect(allowedAct(house, "beto", "sales", "charge", registry)).toBe(false);
});
it("emission schemas accept only version two for each changed kind", () => {
  const cases = [
    ["kit-set", { holder: "beto", tool: "sales", acts: null }, { version: 2, holder: "beto", kit: folder }],
    [
      "assistant-kit-set",
      { owner: "beto", kit: [{ tool: "sales", acts: ["create"] }] },
      { version: 2, owner: "beto", kit: folder },
    ],
    [
      "journey-opened",
      { goal: "Anotar", kit: [{ tool: "sales", acts: ["create"] }] },
      { version: 2, goal: "Anotar", kit: folder },
    ],
  ];
  for (const [kind, legacy, current] of cases) {
    const envelope = { layer: "house", kind, by: "ana", cause: [] };
    expect(Value.Check(words.emission, { ...envelope, data: legacy })).toBe(false);
    expect(Value.Check(words.emission, { ...envelope, data: current })).toBe(true);
    expect(words.read({ ...envelope, data: legacy, id: "old", at: 1, seq: 1 }).data).toEqual(legacy);
  }
});

it("intersects an assistant folder with a partial owner kit and its card on every read", () => {
  let house = houseStep(emptyHouse, record("house-created", {}));
  house = houseStep(house, record("granted", { version: 2, identity: "beto", kit: single }, 2));
  house = { ...house, kitLayout: { sales: registry[0].actionTools } };
  house = houseStep(house, record("assistant-enabled", { owner: "beto", name: "Nora" }, 3));
  house = houseStep(house, record("assistant-kit-set", { version: 2, owner: "beto", kit: folder }, 4, "beto"));
  house = houseStep(
    house,
    record("mind-card-assigned", { mind: "assistant:beto", card: "fake", version: "1", capabilities: [] }, 5),
  );
  expect(effectiveKit(house, "assistant:beto", registry)).toEqual([{ tool: "sales", acts: ["create"] }]);
  house = houseStep(house, record("kit-set", { version: 2, holder: "beto", kit: selectionKit([]) }, 6));
  expect(effectiveKit(house, "assistant:beto", registry)).toEqual([]);
});

it("preserves a v2 folder when its holder administers and later hands the house back", () => {
  let house = houseStep(emptyHouse, record("house-created", {}));
  house = houseStep(house, record("granted", { version: 2, identity: "beto", kit: folder }, 2));
  house = houseStep(house, record("handed", { to: "beto" }, 3));
  expect(effectiveKit(house, "beto", registry)).toEqual([{ tool: "sales", acts: ["create", "import", "charge"] }]);
  house = houseStep(house, record("handed", { to: "ana" }, 4, "beto"));
  expect(effectiveKit(house, "beto", registry)).toEqual([{ tool: "sales", acts: ["create", "import"] }]);
});
