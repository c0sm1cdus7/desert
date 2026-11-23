import { afterEach, expect, it } from "vitest";
import { meant } from "../fields/phrases.ts";
import { effect } from "../house/facts.ts";
import { holderKit } from "../house/kit-history.ts";
import { allowedAct } from "../house/kit.ts";
import { settle } from "../surface/bridge/ports/house-ports.ts";
import { effectRig } from "../../tests/support/effect-authority.ts";
const rigs: { close(): void }[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
const kitCases = [
  { holder: "nobody", tool: "sales", acts: [] },
  { holder: "beto", tool: "payments", acts: [] },
  { holder: "beto", tool: "missing", acts: null },
  { holder: "beto", tool: "sales", acts: ["phantom"] },
  { holder: "beto", tool: "sales", acts: ["register", "register"] },
  { holder: "mind:missing", tool: "missing", acts: null },
  { holder: "mind:sales", tool: "payments", acts: null },
];
it.each(kitCases)("R4/R5 rejects invalid kit %# whole", async data => {
  const rig = effectRig(
    ({ by }) => ({
      status: "accepted",
      effects: [effect("named", { identity: "beto", name: "No escrito" }, by), effect("kit-set", data, by)],
    }),
    true,
  );
  rigs.push(rig);
  const before = rig.state().house;
  const n = rig.facts().length;
  const done = await settle(rig.act("ana", "forge", {}, "identities"));
  expect(done).toMatchObject({ status: "rejected", effects: [] });
  expect(meant(done.reason ?? "")).toContain("kit-set");
  expect(rig.state().house).toEqual(before);
  expect(
    rig
      .facts()
      .slice(n)
      .some(e => e.kind === "kit-set" || e.kind === "named"),
  ).toBe(false);
});
it.each([[], ["register"], null])("the core grants valid kit %# and it survives a restart", async acts => {
  const rig = effectRig(
    ({ by }) => ({
      status: "accepted",
      effects: [
        effect("kit-set", { holder: "beto", tool: "sales", acts }, by),
        effect("kit-set", { holder: "mind:sales", tool: "sales", acts }, by),
      ],
    }),
    true,
  );
  rigs.push(rig);
  expect((await settle(rig.act("ana", "forge", {}, "identities"))).status).toBe("accepted");
  rig.restart();
  for (const by of ["beto", "mind:sales"]) {
    const selections =
      acts === null
        ? [{ kind: "tool", program: "sales", tool: "sales" }]
        : acts.map(action => ({ kind: "action", program: "sales", tool: "sales", action }));
    expect(holderKit(rig.state().house, by)).toEqual({ version: 2, selections });
    expect(allowedAct(rig.state().house, by, "sales", "register")).toBe(acts === null || acts.includes("register"));
    expect(allowedAct(rig.state().house, by, "sales", "new-action")).toBe(acts === null);
  }
});
it("the core cannot forge the author either", async () => {
  const rig = effectRig(
    () => ({ status: "accepted", effects: [effect("scene", { general: "Forjada" }, "beto")] }),
    true,
  );
  rigs.push(rig);
  expect(await settle(rig.act("ana", "forge", {}, "identities"))).toMatchObject({ status: "rejected", effects: [] });
  expect(rig.state().house.scenes.size).toBe(0);
});
it.each(["scene", "named"] as const)("the core lets whoever acts on themselves state their own %s", async kind => {
  const rig = effectRig(
    ({ by }) => ({
      status: "accepted",
      effects: [
        kind === "scene"
          ? effect("scene", { general: "Propia" }, by)
          : effect("named", { identity: by, name: "Nombre propio" }, by),
      ],
    }),
    true,
  );
  rigs.push(rig);
  rig.attend("beto", "identities/beto");
  expect((await settle(rig.act("beto", "scene", {}, "identities/beto"))).status).toBe("accepted");
  rig.restart();
  if (kind === "scene") expect(rig.state().house.scenes.get("beto")?.data.general).toBe("Propia");
  else expect(rig.state().house.names.get("beto")).toBe("Nombre propio");
});
it.each(["named", "granted", "preferred", "language-set"] as const)(
  "acting on oneself does not authorize someone else's %s",
  async kind => {
    const rig = effectRig(({ by }) => {
      const effects = {
        named: effect("named", { identity: "ana", name: "Ajeno" }, by),
        granted: effect("granted", { identity: by, tools: ["payments"] }, by),
        preferred: effect("preferred", { hide: "empty", on: true }, by),
        "language-set": effect("language-set", { identity: "ana", language: "en" }, by),
      };
      return { status: "accepted", effects: [effects[kind]] };
    }, true);
    rigs.push(rig);
    rig.attend("beto", "identities/beto");
    const result = await settle(rig.act("beto", "scene", {}, "identities/beto"));
    expect(result.status).toBe("rejected");
    expect(meant(result.reason ?? "")).toContain(kind);
  },
);
it("revalidates authority when a core act finishes", async () => {
  let release = () => {};
  const wait = new Promise<void>(resolve => {
    release = resolve;
  });
  const rig = effectRig(async ({ by }) => {
    await wait;
    return { status: "accepted", effects: [effect("granted", { identity: "carla", tools: [] }, by)] };
  }, true);
  rigs.push(rig);
  const pending = rig.act("ana", "forge", {}, "identities");
  rig.bus.emit(effect("handed", { to: "beto" }, "ana"));
  release();
  const done = await settle(pending);
  expect(["rejected", "interrupted"]).toContain(done.status);
  expect(rig.state().house.grants.has("carla")).toBe(false);
});
