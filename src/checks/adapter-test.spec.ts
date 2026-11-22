import { expect, it } from "vitest";
import { Type } from "@sinclair/typebox";
import { adapterTest, type AdapterDeclaration } from "../testing.ts";
const ref = Type.Object({ key: Type.String() }, { additionalProperties: false });
const scope = { actor: "ana", tool: "fiscal", target: "organization:test" };
function signer(): AdapterDeclaration {
  return {
    methods: {
      inspect: {
        input: ref,
        output: Type.Boolean(),
        permissions: { tools: ["fiscal"], slots: ["signing"], capture: false },
      },
    },
    open: resolver => ({
      inspect: async input => {
        if (
          !input ||
          typeof input !== "object" ||
          !("key" in input) ||
          typeof input.key !== "string" ||
          !input.key.startsWith("secret:")
        )
          throw new Error("Invalid fixture");
        const key = input.key;
        if (!isReference(key)) throw new Error("Invalid reference");
        return resolver.use({ key }, material => Buffer.from(material.key ?? []).toString("utf8") === "SYNTHETIC");
      },
    }),
  };
}
const isReference = (value: string): value is `secret:${string}` => value.startsWith("secret:");
it("programs test adapters through the stable entry with synthetic material and real boundaries", async () => {
  const test = adapterTest({ adapters: { signer: signer() }, credentialSlots: { fiscal: ["signing"] } }, scope, {
    key: "SYNTHETIC",
  });
  try {
    const inspect = test.ports.signer?.inspect;
    if (!inspect) throw new Error("Missing method");
    expect(test.refs.key).toMatch(/^secret:/);
    expect(await inspect(test.refs)).toBe(true);
    await expect(inspect({ key: 1 })).rejects.toMatchObject({ code: "E-ADAPTER-INPUT" });
    await expect(inspect({ key: "secret:foreign" })).rejects.toMatchObject({ code: "E-ADAPTER-FAILED" });
    test.close();
    await expect(inspect(test.refs)).rejects.toMatchObject({ code: "E-ADAPTER-DENIED" });
  } finally {
    test.close();
  }
});
it("validates declarations before opening storage", () => {
  expect(() => adapterTest({ adapters: { signer: signer() } }, scope, {})).toThrow("E-ADAPTER-DECLARATION");
});
