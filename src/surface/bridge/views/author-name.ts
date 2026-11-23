// Resolves visible authorship from the house and the programs without changing the stored identifiers.
import { actorDisplayName } from "../../../house/actor-display.ts";
import { mindTool } from "../../../house/kit.ts";
import { identityTexts } from "../../../texts/identities.texts.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import { say, type SurfacePorts } from "../ports/house-ports.ts";
/** Who wrote something, as whoever reads reads it: a mind by its program's name, an identity by its own. */
export const authorName =
  <X extends Program>(ports: Pick<SurfacePorts<X>, "state" | "registry" | "language">) =>
  (actor: string): string => {
    const mind = mindTool(actor);
    const program = ports.registry.find(tool => tool.id === mind)?.name;
    return mind
      ? say(ports, identityTexts.mind(program === undefined ? mind : say(ports, program)))
      : actorDisplayName(ports.state().house, actor, ports.language);
  };
/** Only declared author fields are names; identifiers, destinations and free text stay intact. */
export function authorDatum(key: string, value: unknown, name: (actor: string) => string): unknown {
  if (key !== "by" && key !== "author") return value;
  if (Array.isArray(value)) return value.map(item => authorDatum(key, item, name));
  return typeof value === "string" ? name(value) : value;
}
