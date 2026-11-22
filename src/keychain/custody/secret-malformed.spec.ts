import { Type } from "@sinclair/typebox";
import { expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fixture, secret, inputOf, has } from "../../../tests/support/secret-rig.ts";
const shape = Type.Object({
  box: Type.Object({ value: Type.String({ secret: true }) }),
  values: Type.Array(Type.String({ secret: true })),
});
for (const [label, schema, input] of [
  ["text root", secret, "MARKER-PLAIN-0011"],
  ["list root", secret, ["MARKER-LIST-0011"]],
  ["list as text", shape, { box: { value: "x" }, values: "MARKER-NOLIST-0011" }],
  ["object as text", shape, { box: "MARKER-NOOBJ-0011", values: [] }],
  ["object as list", shape, { box: ["MARKER-OBJLIST-0011"], values: [] }],
] as const)
  it(`P11 omits the whole input with an incompatible container: ${label}`, () => {
    const rig = fixture(schema);
    const done = rig.set(input);
    expect(done.status).toBe("rejected");
    expect(inputOf(rig)).toBe("[secret]");
    expect(has([done, rig.facts()], "MARKER-")).toBe(false);
    const checkBytes = () => {
      for (const name of readdirSync(rig.path).filter(name => name.startsWith("journal.sqlite")))
        expect(readFileSync(join(rig.path, name)).includes(Buffer.from("MARKER-"))).toBe(false);
    };
    checkBytes();
    rig.restart();
    expect(inputOf(rig)).toBe("[secret]");
    expect(has(rig.house.tools.state(), "MARKER-")).toBe(false);
    checkBytes();
  });
