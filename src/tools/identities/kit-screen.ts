// Compose the core's menus from its catalog and declared acts, using only ordinary list stacks and starters.
import { mindTool } from "../../house/kit.ts";
import type { Program } from "../tool-contract.ts";
import type { ProgramTool } from "../promises.ts";
import type { Tool, ThingAct } from "../../surface/contract/shown-tool.ts";
import { say, type Start, type SurfacePorts } from "../../surface/bridge/ports/house-ports.ts";
import { menuTarget } from "../../surface/bridge/acts/program-acts.ts";
import { identityTexts as words } from "../../texts/identities.texts.ts";
import { identityTarget, targetIdentity, members } from "./identity-reading.ts";
import { identityDisplayName } from "../../house/members.ts";
import { surfaceTexts } from "../../texts/surface.texts.ts";
import { folderName, kitDatum, programName } from "./kit-catalog.ts";
import { kitView } from "./kit-views.ts";
export function kitScreen<X extends Program>(
  ports: SurfacePorts<X>,
  contract: ProgramTool<X>,
  plain: Tool,
  start: Start,
): Tool {
  if (contract.id !== "identities") return plain;
  const mind = (target: string) => mindTool(targetIdentity(target));
  const identity = (target: string) => members(ports.state().house).map(identityTarget).includes(target);
  const toolsMenu = (target: string) => menuTarget(target, "tools");
  const actsOn = Object.fromEntries(
    Object.entries(plain.actsOn ?? {}).map(([name, act]) => [
      name,
      {
        ...folderConfirmation(ports, name, act),
        listed: (target: string) => (!mind(target) || name.startsWith("kit:")) && (act.listed?.(target) ?? true),
      },
    ]),
  );
  return {
    ...plain,
    actsOn,
    menusOn: {
      tools: {
        label: say(ports, words.programs).toLowerCase(),
        purpose: say(ports, words.kitPurpose),
        key: "h",
        listed: identity,
        opens: toolsMenu,
      },
    },
    titleOf: target => kitTitle(ports, plain, target),
    view: kitView(ports, contract, plain, start),
  };
}

/** Giving and taking say the folder and its holder; repeating the current value stays off. */
function folderConfirmation<X extends Program>(ports: SurfacePorts<X>, name: string, act: ThingAct): ThingAct {
  if (!name.startsWith("kit:") || name.slice(4).includes(":")) return act;
  const [program, group] = name.slice(4).split("/");
  const tool = ports.registry.find(tool => tool.id === program);
  if (!tool) return act;
  return {
    ...act,
    next: (answers, target) => {
      if (answers.length) return null;
      const holder = targetIdentity(target);
      const house = ports.state().house;
      const status = kitDatum(house, holder, tool.id, Object.keys(tool.acts), group);
      const current = { off: true, detail: say(ports, surfaceTexts.current) };
      const options = [
        { title: say(ports, words.give), key: "d", ...(status === words.all ? current : {}) },
        { title: say(ports, words.take), key: "s", ...(status === words.noActions ? current : {}) },
      ];
      const owner = mindTool(holder);
      const holderName = owner
        ? say(ports, words.mind(programName(ports.registry.find(tool => tool.id === owner) ?? tool)))
        : identityDisplayName(house, holder);
      return {
        kind: "confirm",
        ask: say(ports, words.folderQuestion(folderName(tool, group), holderName)),
        options,
        back: say(ports, surfaceTexts.back),
        reversible: true,
      };
    },
  };
}

function kitTitle<X extends Program>(ports: SurfacePorts<X>, plain: Tool, target: string): string {
  if (target.endsWith("#tools")) return say(ports, words.programs);
  const branch = target.split("#kit:")[1];
  const [program, group] = branch?.split("/") ?? [];
  const named = ports.registry.find(tool => tool.id === program);
  if (named && (named.name !== undefined || named.toolNames?.[group ?? ""] !== undefined))
    return say(ports, folderName(named, group));
  return plain.titleOf?.(target) ?? target;
}
