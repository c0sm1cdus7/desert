// Lecturas y menús por destinatario: listas de identidades y mentes, herramientas, acciones propias y deudas.
import { sceneReading } from "./scene-reading.ts";
import { mindTool } from "../../house/kit.ts";
import { MissingView } from "../../surface/contract/missing-view.ts";
import { section, type Start, type SurfacePorts } from "../../surface/bridge/ports/house-ports.ts";
import { menuTarget } from "../../surface/bridge/acts/program-acts.ts";
import type { Tool, ViewRow } from "../../surface/contract/shown-tool.ts";
import type { ProgramTool } from "../promises.ts";
import type { Program } from "../tool-contract.ts";
import { identityTexts as words } from "../../texts/identities.texts.ts";
import { identityTarget, targetIdentity, members } from "./identity-reading.ts";
import { kitCatalog, kitDatum, kitFits, kitMenu } from "./kit-catalog.ts";
const mind = (target: string) => mindTool(targetIdentity(target));
function holderList(plain: Tool) {
  const listed = plain.view().flatMap(stack => stack.rows);
  return [
    section(
      words.name,
      listed.filter(row => !row.opens || !mind(row.opens)),
      words.empty,
    ),
    section(
      words.minds,
      listed.filter(row => row.opens && mind(row.opens)),
      words.emptyMinds,
    ),
  ];
}
function toolRows<X extends Program>(ports: SurfacePorts<X>, target: string): ViewRow[] {
  return kitCatalog(ports.registry).map(tool => {
    const count = Object.keys(tool.acts).length;
    const detail = kitDatum(ports.state().house, targetIdentity(target), tool.id, Object.keys(tool.acts));
    return kitFits(count, true)
      ? { title: tool.id, detail, opens: menuTarget(target, kitMenu(tool.id)) }
      : { title: tool.id, detail: `${detail} · ${words.kitDebt}`, off: true };
  });
}
function mindRows<X extends Program>(
  ports: SurfacePorts<X>,
  contract: ProgramTool<X>,
  start: Start,
  target: string,
  tool: string,
): ViewRow[] {
  return Object.entries(contract.acts)
    .filter(([name, act]) => act.under === kitMenu(tool) && name !== kitMenu(tool))
    .map(([name, act]) => start(name, target, { today: act.today?.(ports.state(), target, ports.now()) }));
}
// Each destination is a list assembled from catalog data and declared actions; unknown destinations stay errors.
export function kitView<X extends Program>(
  ports: SurfacePorts<X>,
  contract: ProgramTool<X>,
  plain: Tool,
  start: Start,
): Tool["view"] {
  const catalog = kitCatalog(ports.registry);
  const identity = (target: string) => members(ports.state().house).map(identityTarget).includes(target);
  return target => {
    if (target === undefined) return holderList(plain);
    if (target.endsWith("#tools") && identity(target.slice(0, -6)))
      return [section(words.tools, toolRows(ports, target.slice(0, -6)), words.emptyKit)];
    const [holder = "", menu] = target.split("#");
    const own = mind(holder);
    if (!own && menu?.startsWith("kit:") && !contract.acts[menu]) throw new MissingView(contract.id, target);
    if (own && (!catalog.some(tool => tool.id === own) || (menu !== undefined && menu !== kitMenu(own))))
      throw new MissingView(contract.id, target);
    const rows = (holder: string, tool: string) => mindRows(ports, contract, start, holder, tool);
    if (own && menu === kitMenu(own)) return [section(words.mind(own), rows(holder, own), words.emptyActions)];
    if (own && !target.includes("#")) {
      const tool = catalog.find(tool => tool.id === own);
      return [
        ...sceneReading(plain.view(target)).filter(stack => stack.title === words.sceneTitle && stack.rows.length > 0),
        section(
          words.mind(own),
          tool && kitFits(Object.keys(tool.acts).length) ? rows(target, own) : [],
          tool && kitFits(Object.keys(tool.acts).length) ? words.emptyActions : words.kitDebt,
        ),
      ];
    }
    return sceneReading(plain.view(target));
  };
}
