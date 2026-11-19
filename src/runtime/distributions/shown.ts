// Presents program folders and each group's own words through the existing surface contract.
import type { ProgramScreen, ScreenActs, Shown, SurfacePorts } from "../../surface/bridge/ports/house-ports.ts";
import { anyToolScreen } from "../../surface/bridge/views/any-tool.ts";
import { distributionTexts } from "../../texts/distributions.texts.ts";
import type { InstalledProgram } from "../../tools/installable/runtime.ts";
import type { Program } from "../../tools/tool-contract.ts";
function filteredActions(program: InstalledProgram, acts: ScreenActs, ports: SurfacePorts<Program>): ScreenActs {
  const belongs = (key: string, target: string) =>
    program.groups.some(group => {
      const act = group.tool.acts[key];
      if (!act) return false;
      return act.on === "tool" ? target === group.folder : group.tool.targets(ports.state()).includes(target);
    });
  const actsOn = Object.fromEntries(
    Object.entries(acts.actsOn ?? {}).map(([key, act]) => [
      key,
      { ...act, listed: (target: string) => belongs(key, target) && (act.listed?.(target) ?? true) },
    ]),
  );
  const menusOn = Object.fromEntries(
    Object.entries(acts.menusOn ?? {}).map(([key, menu]) => [
      key,
      {
        ...menu,
        listed: (target: string) =>
          Object.entries(program.tool.acts).some(([name, act]) => act.under === key && belongs(name, target)) &&
          (menu.listed?.(target) ?? true),
      },
    ]),
  );
  return { ...acts, actsOn, menusOn };
}
function screenFor(program: InstalledProgram, shortcut: boolean): ProgramScreen<Program> {
  return (ports, tool, words, acts, start) => {
    const root = anyToolScreen(ports, tool, words, acts, start);
    const groups = program.groups.map(group => ({
      group,
      screen: anyToolScreen(ports, group.tool, group.palabras, acts, start),
    }));
    const find = (target: string) =>
      groups.find(
        ({ group }) =>
          group.folder === target ||
          group.tool
            .targets(ports.state())
            .some(
              object =>
                object === target || Object.keys(group.tool.menus ?? {}).some(menu => target === `${object}#${menu}`),
            ),
      );
    const filtered = filteredActions(program, acts, ports);
    const only = program.groups.length === 1 ? program.groups[0] : undefined;
    return {
      ...root,
      ...(shortcut && only && Object.keys(acts.acts).length === 0 ? { entryTarget: only.folder } : {}),
      ...filtered,
      find: sought => [...(root.find?.(sought) ?? []), ...groups.flatMap(({ screen }) => screen.find?.(sought) ?? [])],
      titleOf: target => {
        const found = find(target);
        return found?.group.folder === target
          ? found.group.palabras.name
          : (found?.screen.titleOf?.(target) ?? root.titleOf?.(target) ?? target);
      },
      view: target => {
        if (!target) return root.view();
        const found = find(target);
        if (!found) return root.view(target);
        return found.screen.view(target === found.group.folder ? undefined : target);
      },
    };
  };
}
export function distributionShown(
  programs: readonly InstalledProgram[],
  presentation: Omit<Shown<Program>, "words" | "screens">,
  shortcut = false,
): Shown<Program> {
  return {
    ...presentation,
    words: Object.fromEntries(
      programs.map(p => [
        p.tool.id,
        {
          name: p.words.name,
          key: p.words.key,
          listed: distributionTexts.groups,
          empty: distributionTexts.empty,
          reads: {},
          presents: [],
        },
      ]),
    ),
    screens: Object.fromEntries(programs.map(p => [p.tool.id, screenFor(p, shortcut)])),
  };
}
