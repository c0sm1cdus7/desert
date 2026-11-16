import { object } from "../../src/fields/visible-text.ts";
import { programAct } from "../../src/tools/promises.ts";
import { identitiesTool } from "../../src/tools/identities/identities.ts";
import { identityWords } from "../../src/tools/identities/identity-reading.ts";
import { shopProgram, shopShown, type ShopFact } from "./shop.ts";
type Empty = { fact: ShopFact; tools: Record<string, never> };
const input = object({});
const action = programAct<Empty, typeof input>({
  name: "registrar",
  enter: "registrar",
  key: "r",
  purpose: "prueba",
  on: "tool",
  undoable: true,
  input,
  run: () => ({ status: "accepted", text: "Listo" }),
  cases: [{ promise: "does nothing", input: {}, then: { says: "Listo", facts: [] } }],
});
export function kitBoundary(count: number) {
  const tool = {
    id: "sales",
    purpose: "prueba de kit",
    targets: () => [],
    view: () => "",
    summary: () => "",
    acts: Object.fromEntries(
      Array.from({ length: count }, (_, i) => [`action${i}`, { ...action, key: String(i + 1) }]),
    ),
  };
  return {
    ...shopProgram,
    identities: true,
    slices: { initial: {}, step: {} },
    registry: [tool, identitiesTool<Empty>([tool], "house")],
  };
}
export const boundaryShown = { locale: shopShown.locale, words: { ...shopShown.words, identities: identityWords } };
