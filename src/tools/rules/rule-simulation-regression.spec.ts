// Reproduces secret persistence and opposite normalization outcomes through the common executor.
import { afterEach, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Type } from "@sinclair/typebox";
import { toolAct } from "../act-definition.ts";
import {
  simulationHouse,
  simulationMarker,
  simulationShapes,
  publicLimit,
} from "../../../tests/support/simulation-house.ts";
const cleanup: (() => void)[] = [];
afterEach(() =>
  cleanup
    .splice(0)
    .reverse()
    .forEach(stop => stop()),
);
function fixture(action: Parameters<typeof simulationHouse>[1]) {
  const home = mkdtempSync(join(tmpdir(), "simulation-regression-"));
  const f = simulationHouse(home, action);
  cleanup.push(() => rmSync(home, { recursive: true, force: true }), f.close);
  return { ...f, home };
}
it.each(simulationShapes.map((schema, index) => ({ schema, index })))(
  "omits secret positions before recording valid and invalid samples %#",
  async ({ schema, index }) => {
    let executed = 0;
    const f = fixture(
      toolAct(schema, () => {
        executed++;
        return { status: "accepted" };
      }),
    );
    await f.attend();
    expect((await f.call("save", publicLimit)).status).toBe("accepted");
    const samples = [
      { sample: { amount: 11, token: simulationMarker }, without: { amount: 11 } },
      {
        sample: { amount: 11, nested: { token: simulationMarker, label: "public" } },
        without: { amount: 11, nested: { label: "public" } },
      },
      {
        sample: { amount: 11, kind: "first", nested: { token: simulationMarker } },
        without: { amount: 11, kind: "first", nested: {} },
      },
    ];
    const pair = samples[index];
    if (!pair) throw new Error("Missing schema sample");
    const { sample, without } = pair;
    for (const input of [sample, without]) {
      const result = await f.call("simulate", {
        id: publicLimit.id,
        version: 1,
        samples: JSON.stringify([{ actor: "ana", now: 0, input }]),
      });
      expect(result).toMatchObject({ status: "accepted", value: [{ outcome: "block" }] });
      expect(JSON.stringify(result)).not.toContain(simulationMarker);
    }
    for (const samples of [
      JSON.stringify([{ actor: "ana", now: 0, input: { ...sample, amount: "invalid" } }]),
      `{${simulationMarker}`,
      JSON.stringify([{ actor: "ana", now: 0, input: simulationMarker }]),
    ]) {
      expect((await f.call("simulate", { id: publicLimit.id, version: 1, samples })).status).toBe("rejected");
    }
    expect(JSON.stringify(f.events()).includes(simulationMarker)).toBe(false);
    expect(executed).toBe(0);
    f.reopen();
    expect(JSON.stringify(f.events()).includes(simulationMarker)).toBe(false);
    expect(readFileSync(join(f.home, "journal.sqlite")).includes(Buffer.from(simulationMarker))).toBe(false);
  },
);
it.each([11, 1])("matches the real guard after normalizing exactly once to %i", async amount => {
  let normalizations = 0;
  let executed = 0;
  const schema = Type.Object({ amount: Type.Number() });
  const action = toolAct(
    schema,
    () => {
      executed++;
      return { status: "accepted" };
    },
    "house",
    () => {
      normalizations++;
      return { amount };
    },
    undefined,
    "pure",
  );
  const f = fixture(action);
  await f.attend();
  await f.call("save", publicLimit);
  const input = { amount: amount === 11 ? 1 : 11 };
  const simulation = await f.call("simulate", {
    id: publicLimit.id,
    version: 1,
    samples: JSON.stringify([{ actor: "ana", now: 0, input }]),
  });
  expect(simulation).toMatchObject({ status: "accepted", value: [{ outcome: amount > 10 ? "block" : "passed" }] });
  expect(normalizations).toBe(1);
  expect(executed).toBe(0);
  const actual = await f.call("send", input, "probe");
  expect({ status: actual.status, reason: actual.reason }).toEqual({
    status: amount > 10 ? "rejected" : "accepted",
    reason: amount > 10 ? "El acto quedó frenado por una regla mecánica" : undefined,
  });
  expect(normalizations).toBe(2);
  expect(executed).toBe(amount > 10 ? 0 : 1);
});
it("refuses unsafe normalization without calling it or announcing a rule outcome", async () => {
  let calls = 0;
  const schema = Type.Object({ amount: Type.Number() });
  const f = fixture(
    toolAct(
      schema,
      () => {
        throw new Error("Action body must not run");
      },
      "house",
      () => {
        calls++;
        return { amount: 11 };
      },
    ),
  );
  await f.attend();
  await f.call("save", publicLimit);
  const result = await f.call("simulate", {
    id: publicLimit.id,
    version: 1,
    samples: JSON.stringify([{ actor: "ana", now: 0, input: { amount: 1 } }]),
  });
  expect(result).toMatchObject({ status: "rejected", reason: "simulación fiel no disponible" });
  expect(result.value).toBeUndefined();
  expect(calls).toBe(0);
});
it("does not normalize without secret inputs when that could change public rule fields", async () => {
  let calls = 0;
  const schema = Type.Object({ amount: Type.Number(), token: Type.String({ secret: true }) });
  const f = fixture(
    toolAct(
      schema,
      () => {
        throw new Error("Action body must not run");
      },
      "house",
      () => {
        calls++;
        return { amount: 11 };
      },
      undefined,
      "pure",
    ),
  );
  await f.attend();
  await f.call("save", publicLimit);
  const result = await f.call("simulate", {
    id: publicLimit.id,
    version: 1,
    samples: JSON.stringify([{ actor: "ana", now: 0, input: { amount: 1, token: simulationMarker } }]),
  });
  expect(result).toMatchObject({ status: "rejected", reason: "simulación fiel no disponible" });
  expect(result.value).toBeUndefined();
  expect(calls).toBe(0);
  expect(JSON.stringify(f.events()).includes(simulationMarker)).toBe(false);
});
it("protects ambiguous union positions and arrays while keeping common public fields evaluable", async () => {
  const secret = Type.String({ secret: true });
  const schema = Type.Object({
    amount: Type.Number(),
    credential: Type.Union([secret, Type.String()]),
    rows: Type.Array(Type.Object({ token: secret, label: Type.String() })),
    variant: Type.Union([
      Type.Object({ kind: Type.Literal("secret"), token: secret }),
      Type.Object({ kind: Type.Literal("public"), token: Type.String() }),
    ]),
  });
  const f = fixture(
    toolAct(schema, () => {
      throw new Error("Action body must not run");
    }),
  );
  await f.attend();
  await f.call("save", publicLimit);
  for (const kind of ["secret", "public"]) {
    for (const supplied of [true, false]) {
      const token = supplied ? { token: simulationMarker } : {};
      const input = {
        amount: 11,
        ...(supplied ? { credential: simulationMarker } : {}),
        rows: [{ label: "public", ...token }],
        variant: { kind, ...token },
      };
      const result = await f.call("simulate", {
        id: publicLimit.id,
        version: 1,
        samples: JSON.stringify([{ actor: "ana", now: 0, input }]),
      });
      expect(result).toMatchObject({ status: "accepted", value: [{ outcome: "block" }] });
      expect(JSON.stringify(result).includes(simulationMarker)).toBe(false);
    }
  }
  f.reopen();
  expect(JSON.stringify(f.events()).includes(simulationMarker)).toBe(false);
  expect(readFileSync(join(f.home, "journal.sqlite")).includes(Buffer.from(simulationMarker))).toBe(false);
});
