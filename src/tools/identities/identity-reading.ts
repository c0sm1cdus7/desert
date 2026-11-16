import { identityDisplayName, type House } from "../../house/members.ts";
import { mindTool, allowedAct } from "../../house/kit.ts";
import { identityTexts as words } from "../../texts/identities.texts.ts";
import type { ToolWords } from "../../surface/bridge/ports/house-ports.ts";
import type { ToolRegistry, Program } from "../tool-contract.ts";
import { kitCatalog, kitDatum } from "./kit-catalog.ts";
export const identityTarget = (identity: string) => `identities/${identity}`;
export const targetIdentity = (target: string) => target.slice("identities/".length);
export const members = (house: House) => [...new Set([...house.grants.keys(), ...house.removed])];
export function identityDatum(house: House, identity: string): string {
  if (house.removed.has(identity)) return words.removed;
  return identity === house.admin ? words.admin : words.count(house.grants.get(identity)?.length ?? 0);
}
export const identityWords: ToolWords = {
  name: words.name,
  key: "i",
  system: true,
  empty: words.empty,
  listed: words.name,
  reads: {},
  presents: [
    {
      title: "Identidad",
      empty: words.emptyData,
      reads: { identifier: words.identifier, name: words.display, state: words.state },
    },
    { title: "kit", empty: words.emptyKit, reads: { kit: words.tools } },
    { title: words.sceneTitle, empty: words.emptyScene, reads: { general: words.general, addressed: words.addressed } },
  ],
};
function identityList<X extends Program>(house: House, registry: ToolRegistry<X>): string {
  return [...members(house), ...kitCatalog(registry).map(tool => `mind:${tool.id}`)]
    .map(identity =>
      JSON.stringify({
        id: identityTarget(identity),
        text: mindTool(identity) ? words.mind(mindTool(identity) ?? "") : identityDisplayName(house, identity),
        detail:
          house.scenes.get(identity)?.data.general ??
          (mindTool(identity)
            ? kitDatum(
                house,
                identity,
                mindTool(identity) ?? "",
                Object.keys(registry.find(tool => tool.id === mindTool(identity))?.acts ?? {}),
              )
            : identityDatum(house, identity)),
      }),
    )
    .join("\n");
}
export function identityReading<X extends Program>(
  house: House,
  target: string,
  registry: ToolRegistry<X>,
  by: string,
): string {
  if (target === "identities") return identityList(house, registry);
  const identity = targetIdentity(target);
  const scene = house.scenes.get(identity)?.data;
  const reading = scene ? { general: scene.general, ...(scene.to?.[by] ? { addressed: scene.to[by] } : {}) } : {};
  const own = mindTool(identity);
  const tool = registry.find(tool => tool.id === own);
  if (tool)
    return JSON.stringify({
      ...reading,
      identifier: identity,
      name: words.mind(tool.id),
      state: kitDatum(house, identity, tool.id, Object.keys(tool.acts)),
      kit: Object.keys(tool.acts).map(act => `${act} · ${allowedAct(house, identity, tool.id, act) ? "sí" : words.no}`),
    });
  const kit = registry
    .filter(tool => tool.id !== "identities")
    .flatMap(tool => {
      const has =
        !house.removed.has(identity) && (identity === house.admin || house.grants.get(identity)?.includes(tool.id));
      if (!has) return [];
      const acts = identity === house.admin ? null : house.kits.get(identity)?.get(tool.id);
      const detail = acts == null ? words.all : words.partial(acts.length, Object.keys(tool.acts).length);
      return [`${tool.id} · ${detail}`];
    });
  return JSON.stringify({
    ...reading,
    identifier: identity,
    name: identityDisplayName(house, identity),
    state: identityDatum(house, identity),
    kit,
  });
}
/** The core piece brings its own words when the composition asked for it. */
export const withIdentityWords = <S extends { words: Readonly<Record<string, ToolWords>> }>(
  registry: readonly { id: string }[],
  shown: S,
): S =>
  registry.some(tool => tool.id === "identities")
    ? { ...shown, words: { ...shown.words, identities: identityWords } }
    : shown;
