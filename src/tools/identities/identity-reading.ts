// List and object of identities and minds: name, administration, kit, last general scene and the reader's part.
import { joined, type Text } from "../../fields/phrases.ts";
import { holderKit } from "../../house/kit-history.ts";
import { allowedAct, mindTool } from "../../house/kit.ts";
import { identityDisplayName, languageOf, type House } from "../../house/members.ts";
import { systemTool } from "../../house/system-tools.ts";
import type { ToolWords } from "../../surface/bridge/ports/house-ports.ts";
import { deviceActionTexts } from "../../texts/devices.texts.ts";
import { doorTexts } from "../../texts/doors.texts.ts";
import { identityTexts as words } from "../../texts/identities.texts.ts";
import { mindCardTexts } from "../../texts/mind-models.texts.ts";
import type { Program, ToolRegistry } from "../tool-contract.ts";
import { actionName, kitCatalog, kitDatum, programName } from "./kit-catalog.ts";
export const identityTarget = (identity: string) => `identities/${identity}`;
export const targetIdentity = (target: string) => target.slice("identities/".length);
export const members = (house: House) => [...new Set([...house.grants.keys(), ...house.removed])];
function identityDatum(house: House, identity: string): Text {
  if (house.removed.has(identity)) return words.removed;
  const selections = holderKit(house, identity).selections;
  return identity === house.admin
    ? words.admin
    : words.count(
        selections.filter(selection => selection.kind === "program").length,
        selections.filter(selection => selection.kind === "tool").length,
        selections.filter(selection => selection.kind === "action").length,
      );
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
      reads: { identifier: words.identifier, name: words.display, state: words.state, language: words.language },
    },
    { title: doorTexts.key.many, empty: words.emptyData, reads: { doorKeys: doorTexts.key.many } },
    { title: words.sceneTitle, empty: words.emptyScene, reads: { general: words.general, addressed: words.addressed } },
    {
      title: deviceActionTexts.devices,
      empty: words.emptyData,
      reads: { devices: deviceActionTexts.devices },
    },
    { title: mindCardTexts.card, empty: words.emptyData, reads: { card: mindCardTexts.card } },
    { title: words.given, empty: words.emptyKit, reads: { kit: words.programs } },
  ],
};
function identityList<X extends Program>(house: House, registry: ToolRegistry<X>): string {
  return [...members(house), ...kitCatalog(registry).map(tool => `mind:${tool.id}`)]
    .map(identity =>
      JSON.stringify({
        id: identityTarget(identity),
        text: mindTool(identity)
          ? words.mind(registry.find(tool => tool.id === mindTool(identity))?.name ?? mindTool(identity) ?? "")
          : identityDisplayName(house, identity),
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
      name: words.mind(programName(tool)),
      state: kitDatum(house, identity, tool.id, Object.keys(tool.acts)),
      kit: Object.keys(tool.acts).map(act =>
        joined([actionName(tool.acts[act], act), allowedAct(house, identity, tool.id, act) ? words.yes : words.no]),
      ),
    });
  return JSON.stringify({
    ...reading,
    identifier: identity,
    name: identityDisplayName(house, identity),
    state: identityDatum(house, identity),
    ...languageReading(house, identity),
    kit: identityKit(house, identity, registry),
    ...doorReading(house, identity),
    ...deviceReading(house, identity),
  });
}
function identityKit<X extends Program>(house: House, identity: string, registry: ToolRegistry<X>): Text[] {
  return registry
    .filter(tool => !systemTool(tool.id))
    .flatMap(tool => {
      const has =
        !house.removed.has(identity) &&
        (identity === house.admin ||
          holderKit(house, identity).selections.some(selection => selection.program === tool.id));
      if (!has) return [];
      const detail = kitDatum(house, identity, tool.id, Object.keys(tool.acts));
      return [joined([programName(tool), detail])];
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

/** Everyone sees the language each identity reads the house in. */
function languageReading(house: House, identity: string) {
  const language = languageOf(house, identity);
  return language ? { language: words.languageNames[language] } : {};
}
function doorReading(house: House, identity: string) {
  const keys = [...house.doors.keys.values()].filter(key => key.identity === identity);
  return keys.length
    ? {
        doorKeys: keys.map(key => {
          const door = key.door === "agent" ? doorTexts.doors.agent : doorTexts.doors.terminal;
          return joined([key.id, door, key.revoked ? doorTexts.status.retired : doorTexts.status.active]);
        }),
      }
    : {};
}

function deviceReading(house: House, identity: string) {
  const devices = [...house.devices.devices.values()].filter(device => device.owner === identity);
  const card = house.mindAssignments.get(`assistant:${identity}`);
  return {
    ...(devices.length
      ? {
          devices: devices.map(device => joined([device.id, device.name, deviceStatus(device)])),
        }
      : {}),
    ...(card ? { card: `${card.card} · ${card.version}` } : {}),
  };
}

function deviceStatus(device: { retired: boolean; accepted: boolean }) {
  if (device.retired) return deviceActionTexts.retired;
  return device.accepted ? deviceActionTexts.accepted : deviceActionTexts.registered;
}
