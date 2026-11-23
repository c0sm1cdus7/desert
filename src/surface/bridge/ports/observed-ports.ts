// Keep personal acts distinct from observations repeated by a drawing; local ports retain their behavior.
import type { Language } from "../../../fields/languages.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import type { HousePorts, SurfacePorts } from "./house-ports.ts";
export function observedPorts<X extends Program>(
  ports: HousePorts<X>,
  seen: Map<string, number>,
  language: Language,
): SurfacePorts<X> {
  return {
    ...ports,
    language,
    act: value => ports.act(value, seen.get(value.target ?? "") ?? 0),
    observe: value => (ports.observe ? ports.observe(value) : ports.act(value, 0)),
  };
}
