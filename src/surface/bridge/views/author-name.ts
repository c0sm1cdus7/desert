// Resuelve la autoría visible desde la casa y los programas sin cambiar los identificadores guardados.
import { actorDisplayName } from "../../../house/actor-display.ts";
import { mindTool } from "../../../house/kit.ts";
import { identityTexts } from "../../../texts/identities.texts.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import type { HousePorts } from "../ports/house-ports.ts";
export const authorName =
  <X extends Program>(ports: Pick<HousePorts<X>, "state" | "registry">) =>
  (actor: string): string => {
    const mind = mindTool(actor);
    return mind
      ? identityTexts.mind(ports.registry.find(tool => tool.id === mind)?.name ?? mind)
      : actorDisplayName(ports.state().house, actor, "es");
  };
/** Only declared author fields are names; identifiers, destinations and free text stay intact. */
export function authorDatum(key: string, value: unknown, name: (actor: string) => string): unknown {
  if (key !== "by" && key !== "author") return value;
  if (Array.isArray(value)) return value.map(item => authorDatum(key, item, name));
  return typeof value === "string" ? name(value) : value;
}
