// Compose the core's menus from its catalog and declared acts, using only ordinary list stacks and starters.
import { mindTool } from "../../../house/house.ts";
import type { Program } from "../../tool-contract.ts";
import type { ProgramTool } from "../../promises.ts";
import type { Tool } from "../../../surface/shown-tool.ts";
import type { Start, SurfacePorts } from "../../../surface/bridge/house-ports.ts";
import { menuTarget } from "../../../surface/bridge/program-acts.ts";
import { identityTexts as words } from "../../../texts/identities/identities.texts.ts";
import { identityTarget, targetIdentity, members } from "./identity-reading.ts";
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
        ...act,
        listed: (target: string) => (!mind(target) || name.startsWith("kit:")) && (act.listed?.(target) ?? true),
      },
    ]),
  );
  return {
    ...plain,
    actsOn,
    menusOn: {
      tools: {
        label: words.tools.toLowerCase(),
        purpose: words.tools.toLowerCase(),
        key: "h",
        listed: identity,
        opens: toolsMenu,
      },
    },
    titleOf: target => (target.endsWith("#tools") ? words.tools : (plain.titleOf?.(target) ?? target)),
    view: kitView(ports, contract, plain, start),
  };
}
