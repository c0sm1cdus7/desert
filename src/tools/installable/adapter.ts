// Builds one engine tool per program, keeping each group and its encoded object destinations intact.
import { OutsideDefect } from "../../fields/program-call.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import { vocabulary } from "../../journal/vocabulary.ts";
import { localState, ownState, type InstalledGroup, type InstalledProgram, type ProgramReadings } from "./runtime.ts";
import { adaptAction, targetOf } from "./actions.ts";
import { folderOf, objectOf, localTarget } from "./destinations.ts";
import type { ProgramMetadata, ProgramBody, LocalProgram, ProgramGroup } from "./program.ts";
import type { Program, State } from "../tool-contract.ts";
import type { ProgramTool } from "../promises-contract.ts";
/** The names of every tool of a program, and what it reads from its providers when it requests any. */
type Tools = readonly string[];
type Install = Readonly<{ tools: Tools; readings?: ProgramReadings | undefined }>;
function groupReactions<X extends Program>(id: string, name: string, group: ProgramGroup<X>) {
  return Object.fromEntries(
    Object.entries(group.reactions ?? {}).map(([key, reaction]) => {
      if (group.acts[reaction.act]?.on !== "tool") throw new Error(toolTexts.invalidReaction(id, reaction.act));
      return [`${name}/${key}`, { ...reaction, act: `${name}/${reaction.act}` }];
    }),
  );
}
function groupTool<X extends Program>(id: string, name: string, group: ProgramGroup<X>, on: Install): InstalledGroup {
  const { tools, readings } = on;
  const stateOf = ownState<X>(id, readings);
  const reader = (state: State<Program>) => ({ id, name, tools, own: new Set(group.targets(stateOf(state))) });
  const target = (value: string) => localTarget(id, name, value);
  const tool: ProgramTool<Program> = {
    id: folderOf(id, name),
    purpose: group.purpose,
    reactions: groupReactions(id, name, group),
    acts: Object.fromEntries(
      Object.entries(group.acts).map(([key, act]) => [`${name}/${key}`, adaptAction(id, name, group, act, readings)]),
    ),
    targets: state => group.targets(stateOf(state)).map(object => objectOf(id, name, object)),
    view: (state, value, limits) => remapView(group.view(stateOf(state), target(value), limits), reader(state)),
    summary: state => group.summary(stateOf(state)),
    ...(group.viewData ? { viewData: (s, t) => group.viewData?.(stateOf(s), target(t)) } : {}),
    ...(group.closed ? { closed: (s, t, at) => group.closed?.(stateOf(s), target(t), at) ?? false } : {}),
    ...(group.words ? { words: (s, t) => group.words?.(stateOf(s), target(t)) ?? "" } : {}),
    ...(group.needs
      ? {
          /** What needs someone is a thing of the tool, or the tool itself: then it leads to the tool's folder. */
          needs: (s, at) =>
            (group.needs?.(stateOf(s), at) ?? []).map(need => ({ ...need, target: targetOf(id, name, need.target) })),
        }
      : {}),
    ...(group.draft ? { draft: (s, through, i, t, at) => group.draft?.(stateOf(s), through, i, target(t), at) } : {}),
    ...(group.menus
      ? { menus: Object.fromEntries(Object.entries(group.menus).map(([key, menu]) => [`${name}/${key}`, menu])) }
      : {}),
  };
  const originalActs = Object.fromEntries(
    Object.entries(group.acts).map(([key, act]) => {
      const adapted = tool.acts[`${name}/${key}`];
      if (!adapted) throw new Error("Missing adapted action");
      return [`${name}/${key}`, { ...adapted, on: act.on, ...(act.under ? { under: `${name}/${act.under}` } : {}) }];
    }),
  );
  return { id: name, folder: tool.id, palabras: group.palabras, tool: { ...tool, acts: originalActs } };
}
/** Who reads a view: the program, the tool that reads, every tool of the program and the things the reading tool has
 * now, by their local ids. */
type Reader = Readonly<{ id: string; name: string; tools: Tools; own: ReadonlySet<string> }>;
function remapView(view: string, reader: Reader): string {
  return view
    .split("\n")
    .map(line => {
      let row: unknown;
      try {
        row = JSON.parse(line);
      } catch (error) {
        if (error instanceof SyntaxError) return line;
        throw error;
      }
      return JSON.stringify(remapRow(row, reader, true, ""));
    })
    .join("\n");
}
/** What a view names by its id. A row, `{ id }` at the first level of a line, is a thing of the tool that reads. What
 * a reading names with `tool` is a thing of that tool of the same program; a `tool` that is no text naming one fails.
 * What it names without `tool` further in is a thing of the tool that reads when it has it, and otherwise stays the
 * full id it is, of whoever holds it. The descent goes on inside what has an id. */
function remapRow(row: unknown, reader: Reader, first: boolean, key: string): unknown {
  if (Array.isArray(row)) return row.map((value: unknown) => remapRow(value, reader, false, key));
  if (!row || typeof row !== "object") return row;
  const inner = Object.fromEntries(
    Object.entries(row).map(([at, value]) => [at, at === "id" ? value : remapRow(value, reader, false, at)]),
  );
  if (!("id" in row) || typeof row.id !== "string") return inner;
  const { tool, ...thing } = inner;
  if ("tool" in row) return { ...thing, id: objectOf(reader.id, namedTool(reader, key, tool), row.id) };
  return first || reader.own.has(row.id) ? { ...thing, id: objectOf(reader.id, reader.name, row.id) } : inner;
}
/** The tool a reading says its thing is of: a text that names a tool of the same program, or a defect. */
function namedTool(reader: Reader, key: string, tool: unknown): string {
  if (typeof tool === "string" && reader.tools.includes(tool)) return tool;
  throw new OutsideDefect(
    new Error(
      `${folderOf(reader.id, reader.name)} names a thing ${key ? `under ${key}` : "as a row"} of tool ` +
        `${JSON.stringify(tool)}, which is not a tool of ${reader.id}`,
    ),
  );
}
export function installProgram<M extends ProgramMetadata>(
  meta: M,
  body: ProgramBody<M>,
  readings?: ProgramReadings,
): InstalledProgram {
  const on = { tools: Object.keys(body.herramientas), readings };
  const groups = Object.entries(body.herramientas).map(([name, group]) => groupTool(meta.id, name, group, on));
  const find = (state: State<Program>, target: string) =>
    groups.find(group => group.folder === target || group.tool.targets(state).includes(target));
  const tool: ProgramTool<Program> = {
    id: meta.id,
    name: body.palabras.name,
    purpose: body.purpose,
    skill: body.skill,
    ...(body.mensajes ? { talks: true } : {}),
    facts: meta.hechos.map(f => f.nombre),
    groups,
    ...fromGroups(groups),
    targets: state => groups.flatMap(group => [group.folder, ...group.tool.targets(state)]),
    summary: state => body.summary(ownState<LocalProgram<M>>(meta.id, readings)(state)),
    view: (state, target, limits) =>
      target === meta.id
        ? groups.map(g => JSON.stringify({ id: g.folder, text: g.palabras.name })).join("\n")
        : requiredGroup(find(state, target)).tool.view(state, target, limits),
    needs: (s, at) => groups.flatMap(g => g.tool.needs?.(s, at) ?? []),
    closed: (s, t, at) => find(s, t)?.tool.closed?.(s, t, at) ?? false,
    words: (s, t) => find(s, t)?.tool.words?.(s, t) ?? "",
    draft: (s, through, i, t, at) => find(s, t)?.tool.draft?.(s, through, i, t, at),
  };
  return {
    tool,
    groups,
    words: body.palabras,
    initial: meta.inicial(),
    step: foldProgram(meta, body),
  };
}
/** What a program gathers from its tools: their names, reactions, menus and acts, each act on a thing. */
function fromGroups(groups: readonly InstalledGroup[]) {
  return {
    toolNames: Object.fromEntries(groups.map(group => [group.id, group.palabras.name])),
    reactions: Object.fromEntries(groups.flatMap(group => Object.entries(group.tool.reactions ?? {}))),
    actionTools: Object.fromEntries(
      groups.flatMap(group => Object.keys(group.tool.acts).map(action => [action, group.id])),
    ),
    menus: Object.fromEntries(groups.flatMap(group => Object.entries(group.tool.menus ?? {}))),
    acts: Object.fromEntries(
      groups.flatMap(group =>
        Object.entries(group.tool.acts).map(([key, act]) => [key, { ...act, on: "thing" as const }]),
      ),
    ),
  };
}
function requiredGroup(group: InstalledGroup | undefined): InstalledGroup {
  if (!group) throw new Error("Unknown program destination");
  return group;
}
/** Metadata defines exactly the discriminated catalog returned by this boundary. */
function programVocabulary<M extends ProgramMetadata>(
  meta: M,
): import("../../journal/vocabulary.ts").Vocabulary<LocalProgram<M>["fact"]>;
function programVocabulary(meta: ProgramMetadata) {
  return vocabulary(Object.fromEntries(meta.hechos.map(fact => [fact.nombre, fact.forma])));
}

function foldProgram<M extends ProgramMetadata>(meta: M, body: ProgramBody<M>): InstalledProgram["step"] {
  const ownWords = programVocabulary(meta);
  return (_own, event, before) => {
    const state = localState<LocalProgram<M>>(before, meta.id);
    if (event.layer === "program" && !meta.hechos.some(fact => fact.nombre === event.kind)) return state.tools.own;
    return body.plegar(state.tools.own, ownWords.read(event), state);
  };
}
