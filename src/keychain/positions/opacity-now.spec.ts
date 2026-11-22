import { ActionSecrets } from "./action-scope.ts";
import { Type } from "@sinclair/typebox";
import { expect, it } from "vitest";
import { fixture, secret, field, ref, has, type P } from "../../../tests/support/secret-rig.ts";
import { toolAct } from "../../tools/act-definition.ts";

for (const value of [
  "",
  "a",
  "abcdefghijk",
  "abcdefghijkl",
  "abcdefghijklm",
  "sale-registered",
  "uno\ndos",
  "X".repeat(4000),
  "secret:00000000-0000-0000-0000-000000000000",
])
  it(`the program receives a reference for material of ${value.length} characters`, () => {
    let seen: unknown;
    const rig = fixture(secret, input => {
      seen = field(input, "value");
      return { status: "accepted" };
    });
    expect(rig.set({ value }).status).toBe("accepted");
    expect(ref(seen) && seen !== value).toBe(true);
  });
it("sentinel: normalizing and transforming never rebuild the material", () => {
  const observed: unknown[] = [];
  const raw = "CENTINELA_UNO\nCENTINELA_DOS";
  const act = toolAct<P, typeof secret>(
    secret,
    input => ({ status: "accepted", text: input.value.replaceAll("\n", "|") }),
    "house",
    input => {
      observed.push(field(input, "value"));
      return input;
    },
  );
  const rig = fixture(secret, undefined, act);
  expect(rig.set({ value: raw }).status).toBe("accepted");
  expect(observed.every(ref)).toBe(true);
  expect(has(rig.facts(), raw.replaceAll("\n", "|"))).toBe(false);
});
it("the material's constraints are checked before the draft", () => {
  let calls = 0;
  const shape = Type.Object({ value: Type.String({ secret: true, minLength: 2, maxLength: 3, pattern: "^x+$" }) });
  const rig = fixture(shape, () => {
    calls++;
    return { status: "accepted" };
  });
  const drafted: unknown[] = [];
  const tool = rig.options.registry[0];
  if (!tool) throw new Error("Falta herramienta");
  Object.defineProperty(tool, "draft", {
    value: (_state: unknown, _through: number, input: unknown) => {
      drafted.push(field(input, "value"));
      return undefined;
    },
  });
  expect(rig.set({ value: "xx" }).status).toBe("accepted");
  for (const value of ["", "x", "xxxx", "yy"]) expect(rig.set({ value }).status).toBe("rejected");
  expect(calls).toBe(1);
  expect(drafted).toHaveLength(1);
  expect(drafted.every(ref)).toBe(true);
});

it("secret ingress does not change the normalization of a public union", () => {
  const input = Type.Union([Type.Object({ kind: Type.Literal("one") }), Type.Object({ kind: Type.Literal("two") })]);
  const act = toolAct<P, typeof input>(
    input,
    () => ({ status: "accepted" }),
    "house",
    value => ({ kind: value }),
  );
  const rig = fixture(input, undefined, act);
  expect(rig.set("one").status).toBe("accepted");
});

it("only a nested execution can forward the already captured reference", async () => {
  const input = Type.Object({ value: Type.String({ secret: true, minLength: 2, maxLength: 3 }) });
  const seen: unknown[] = [];
  const outer = toolAct<P, typeof input>(input, async (value, context) => {
    seen.push(value.value);
    const done = await context.execute?.({ act: "set", target: "vault", input: value });
    expect(done?.status).toBe("accepted");
    return { status: "accepted" };
  });
  const rig = fixture(
    input,
    value => {
      seen.push(field(value, "value"));
      return { status: "accepted" };
    },
    {},
    {
      own: () => [{ ...outer, object: "own", option: "forward", purpose: "Anida" }],
    },
  );
  const started = rig.ports().act({ act: "forward", target: "own", input: { value: "xx" } }, 0);
  const done = started.status === "processing" ? await started.completion : started;
  expect(done.status).toBe("accepted");
  expect(seen).toHaveLength(2);
  expect(seen.every(ref)).toBe(true);
  expect(seen[0]).toBe(seen[1]);
  expect(rig.set({ value: seen[0] }).status).toBe("rejected");
});

it("without a protected ingress the engine stops before calling the program", () => {
  const original = Object.getOwnPropertyDescriptor(ActionSecrets.prototype, "scope");
  if (!original) throw new Error("missing boundary");
  Object.defineProperty(ActionSecrets.prototype, "scope", { value: undefined, configurable: true });
  try {
    let called = false;
    const act = toolAct<P, typeof secret>(
      secret,
      () => ({ status: "accepted" }),
      "house",
      input => {
        called = true;
        return input;
      },
    );
    const rig = fixture(secret, undefined, act);
    expect(rig.set({ value: "NO_BOUNDARY" }).status).toBe("rejected");
    expect(called).toBe(false);
    expect(has(rig.facts(), "NO_BOUNDARY")).toBe(false);
  } finally {
    Object.defineProperty(ActionSecrets.prototype, "scope", original);
  }
});
