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
  ["raíz texto", secret, "MARCADOR-PLANO-0011"],
  ["raíz lista", secret, ["MARCADOR-LISTA-0011"]],
  ["lista como texto", shape, { box: { value: "x" }, values: "MARCADOR-NOLISTA-0011" }],
  ["objeto como texto", shape, { box: "MARCADOR-NOOBJ-0011", values: [] }],
  ["objeto como lista", shape, { box: ["MARCADOR-OBJLISTA-0011"], values: [] }],
] as const)
  it(`P11 omite toda la entrada con contenedor incompatible: ${label}`, () => {
    const rig = fixture(schema);
    const done = rig.set(input);
    expect(done.status).toBe("rejected");
    expect(inputOf(rig)).toBe("[secret]");
    expect(has([done, rig.facts()], "MARCADOR-")).toBe(false);
    const checkBytes = () => {
      for (const name of readdirSync(rig.path).filter(name => name.startsWith("journal.sqlite")))
        expect(readFileSync(join(rig.path, name)).includes(Buffer.from("MARCADOR-"))).toBe(false);
    };
    checkBytes();
    rig.restart();
    expect(inputOf(rig)).toBe("[secret]");
    expect(has(rig.house.tools.state(), "MARCADOR-")).toBe(false);
    checkBytes();
  });
