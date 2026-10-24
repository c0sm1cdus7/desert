// One module for the runtime code of a visual-root file, so a name resolves the way it does when the file runs: a
// component's scripts, then every template expression, with the names the template binds (each items, snippet
// parameters, await values, let: directives, {@const}) declared. Positions map back to the file. Used by rule I.
import ts from "typescript";
import type { Parsed } from "./parse.ts";
import { runtimeCode, type RuntimeCode } from "./runtime-globals.ts";
import { walk, type SyntaxNode } from "./walk.ts";
import { templateScripts } from "./dom-access.ts";

type Segment = Readonly<{ at: number; offset: number; length: number }>;
export type ComponentRuntime = RuntimeCode & Readonly<{ position: (node: ts.Node) => number }>;

const field = (node: unknown, key: string): unknown => node && typeof node === "object" ? Reflect.get(node, key) : undefined;
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

/** Every name a Svelte binding pattern declares. */
function patternNames(pattern: unknown): string[] {
  switch (field(pattern, "type")) {
    case "Identifier": { const name = field(pattern, "name"); return typeof name === "string" ? [name] : []; }
    case "ObjectPattern": return list(field(pattern, "properties")).flatMap(property =>
      patternNames(field(property, "type") === "RestElement" ? property : field(property, "value")));
    case "ArrayPattern": return list(field(pattern, "elements")).flatMap(patternNames);
    case "AssignmentPattern": return patternNames(field(pattern, "left"));
    case "RestElement": return patternNames(field(pattern, "argument"));
    default: return [];
  }
}

/** The names a template binds anywhere in the file. */
function templateBindings(fragment: SyntaxNode): Set<string> {
  const names = new Set<string>();
  walk(fragment, node => {
    const add = (...patterns: unknown[]) => { for (const name of patterns.flatMap(patternNames)) names.add(name); };
    if (node.type === "EachBlock") { add(node.context); if (typeof node.index === "string") names.add(node.index); }
    if (node.type === "SnippetBlock") { add(...list(node.parameters)); add(node.expression); }
    if (node.type === "AwaitBlock") add(node.value, node.error);
    if (node.type === "ConstTag") for (const declarator of list(field(node.declaration, "declarations"))) add(field(declarator, "id"));
    if (node.type === "LetDirective") { if (typeof node.name === "string") names.add(node.name); add(node.expression); }
  });
  return names;
}

export function componentRuntime(parsed: Parsed, path: string): ComponentRuntime {
  const segments: Segment[] = [];
  let text = "";
  const append = (code: string, offset: number) => { segments.push({ at: text.length, offset, length: code.length }); text += `${code}\n`; };
  for (const script of parsed.scripts) append(script.file.text, script.offset);
  if (parsed.kind === "svelte") {
    const bound = [...templateBindings(parsed.fragment)];
    if (bound.length) text += `let ${bound.join(", ")};\n`;
    for (const script of templateScripts(parsed, path)) { text += ";("; append(script.file.text, script.offset); text += ");\n"; }
  }
  const runtime = runtimeCode(text);
  const position = (node: ts.Node) => {
    const start = node.getStart(runtime.file), segment = segments.find(item => item.at <= start && start <= item.at + item.length);
    return segment ? segment.offset + start - segment.at : 0;
  };
  return { ...runtime, position };
}
