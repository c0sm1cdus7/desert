import { identityDisplayName, type House } from "../../../house/house.ts";
import { identityTexts as words } from "../../../texts/identities/identities.texts.ts";
import type { ToolWords } from "../../../surface/bridge/house-ports.ts";
import type { ToolRegistry, Program } from "../../tool-contract.ts";
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
  ],
};
export function identityReading<X extends Program>(house: House, target: string, registry: ToolRegistry<X>): string {
  if (target === "identities")
    return members(house)
      .map(identity =>
        JSON.stringify({
          id: identityTarget(identity),
          text: identityDisplayName(house, identity),
          detail: identityDatum(house, identity),
        }),
      )
      .join("\n");
  const identity = targetIdentity(target);
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
    identifier: identity,
    name: identityDisplayName(house, identity),
    state: identityDatum(house, identity),
    kit,
  });
}
