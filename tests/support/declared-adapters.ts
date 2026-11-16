import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import type { AdapterComposition, AdapterDeclaration } from "../../src/tools/adapter-contract.ts";
import type { ToolCapabilities } from "../../src/tools/capabilities-contract.ts";
export const references = Type.Object({ key: Type.TemplateLiteral("secret:${string}") });
export const validity = Type.Object({ valid: Type.Boolean() });
export const permissions = { tools: ["vault"], slots: ["signing"], capture: true };
export const synthetic = "MATERIAL_INVENTADO\nSIN_VALIDEZ";
export const signer: AdapterDeclaration = {
  methods: {
    import: { input: Type.Object({}), output: references, permissions },
    inspect: { input: references, output: validity, permissions },
  },
  open: resolver => ({
    import: () => ({ key: resolver.capture(Buffer.from(synthetic)) }),
    inspect: input => {
      if (!Value.Check(references, input)) throw new Error("fixture input");
      return resolver.use(input, material => ({
        valid: Buffer.from(material.key ?? []).toString("utf8") === synthetic,
      }));
    },
  }),
};
export const adapterProgram: AdapterComposition = {
  adapters: { signer },
  credentialSlots: { vault: ["signing", "backup"] },
};
export function call(capabilities: ToolCapabilities, name: string, input: unknown = {}) {
  const method = capabilities.ports.signer?.[name];
  if (!method) throw new Error("Missing declared method");
  return method(input);
}
export async function imported(capabilities: ToolCapabilities) {
  const value = await call(capabilities, "import");
  if (!Value.Check(references, value)) throw new Error("Missing references");
  return value;
}
