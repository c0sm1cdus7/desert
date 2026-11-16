import ts from "typescript";
import { describe, expect, it } from "vitest";
import { fromRoot, importsOf, parsed, sourceFiles } from "../support/sources.ts";

const outside = [
  "child_process",
  "net",
  "http",
  "https",
  "http2",
  "tls",
  "dgram",
  "dns",
  "fs",
  "os",
  "sqlite",
  "ws",
  "undici",
];
const talksOutside = (specifier: string): boolean =>
  outside.includes(specifier.replace(/^node:/, "").split("/")[0] ?? "");

const network = ["fetch", "WebSocket", "XMLHttpRequest", "EventSource"];
const globalObjects = ["globalThis", "global", "self", "window"];

const isOwnName = (node: ts.Identifier): boolean => {
  const parent = node.parent;
  const named =
    ts.isPropertyAccessExpression(parent) ||
    ts.isPropertyAssignment(parent) ||
    ts.isPropertyDeclaration(parent) ||
    ts.isPropertySignature(parent) ||
    ts.isMethodDeclaration(parent) ||
    ts.isMethodSignature(parent);
  if (!named || parent.name !== node) return false;
  return !ts.isPropertyAccessExpression(parent) || !globalObjects.includes(parent.expression.getText());
};

/** Every reference to a global that talks to the network: `fetch`, `globalThis.fetch`, `globalThis["fetch"]`… */
const networkGlobalsIn = (source: ts.SourceFile): string[] => {
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && network.includes(node.text) && !isOwnName(node)) found.push(node.getText());
    const key = ts.isElementAccessExpression(node) ? node.argumentExpression : undefined;
    if (key && ts.isStringLiteralLike(key) && network.includes(key.text)) found.push(node.getText());
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
};

/** Storage, custody, adapters and composition keep the same outside access after relocation. */
const composedDoors = [
  "src/doors/socket/server/serve-program.ts",
  "src/doors/socket/server/server-process.ts",
  "src/doors/socket/server/socket-listener.ts",
  "src/doors/terminal/bounded-output.ts",
  "src/doors/terminal/house-output-process.ts",
  "src/doors/terminal/house-output.ts",
  "src/doors/terminal/launch-house.ts",
  "src/doors/terminal/open-terminal.ts",
  "src/doors/terminal/terminal-client.ts",
  "src/doors/terminal/terminal-error.ts",
  "src/doors/terminal/terminal-program.ts",
];
const mayTalkOutside = (file: string): boolean =>
  ["src/adapters/", "src/tools/", "src/storage/", "src/keychain/", "src/runtime/", "src/checks/"].some(folder =>
    fromRoot(file).startsWith(folder),
  ) || composedDoors.includes(fromRoot(file));

describe("law 10: what talks to the outside lives in infrastructure and composition", () => {
  it("no file outside an adapter imports the network, processes, the file system, the system or a database", () => {
    const offending = sourceFiles()
      .filter(file => !mayTalkOutside(file))
      .flatMap(file =>
        importsOf(file, true)
          .filter(talksOutside)
          .map(specifier => `${fromRoot(file)} → ${specifier}`),
      );
    expect(offending).toEqual([]);
  });

  it("no file outside an adapter reaches a network global, called or not", () => {
    const offending = sourceFiles()
      .filter(file => !mayTalkOutside(file))
      .flatMap(file => networkGlobalsIn(parsed(file)).map(use => `${fromRoot(file)}: ${use}`));
    expect(offending).toEqual([]);
  });

  it("finds fetch however it is reached, and leaves a member of that name alone", () => {
    const file = "tests/laws/fixture.ts";
    const code = [
      "fetch(url);",
      "const f = globalThis.fetch;",
      'void globalThis["WebSocket"];',
      "new WebSocket(url);",
      "tools.fetch(url);",
      "const card = { fetch: 1 };",
    ].join("\n");
    const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
    expect(networkGlobalsIn(source)).toEqual(["fetch", "fetch", 'globalThis["WebSocket"]', "WebSocket"]);
  });
});
