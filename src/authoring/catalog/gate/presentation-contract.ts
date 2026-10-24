// Rule E, the contract half: a closed contract declares semantic inputs only. A prop or event named like a presentation
// channel (class, style, role, children, elementProps, viewportAttributes, data-*) would let callers pass presentation
// through the contract, so the contract itself is the escape. Raises PRESENTATION_ESCAPE.
import { contractPath } from "../read-contract.ts";
import type { GateContext } from "./context.ts";
import { violation, type Violation } from "./violation.ts";

/** Attribute names that carry presentation, never a piece's meaning; rule E refuses them on every piece tag too. */
export const presentationNames: ReadonlySet<string> = new Set(["class", "style", "role", "children", "elementProps", "viewportAttributes"]);
export const isPresentationName = (name: string) => presentationNames.has(name) || name.startsWith("data-");

export function contractEscapes(context: GateContext): Violation[] {
  const found: Violation[] = [];
  for (const { path, declaration } of context.declarations) {
    const contract = declaration.kind === "mechanism" ? undefined : context.contract(declaration.id);
    if (!contract?.closed) continue;
    const contractFile = contractPath(path, declaration.id);
    for (const [kind, names] of [["prop", Object.keys(contract.props)], ["event", Object.keys(contract.events)]] as const) {
      for (const name of names) if (isPresentationName(name)) {
        found.push(violation("PRESENTATION_ESCAPE", contractFile, 0, `the contract of ${declaration.id} declares the ${kind} ${name}: a contract holds no presentation input`));
      }
    }
  }
  return found;
}
