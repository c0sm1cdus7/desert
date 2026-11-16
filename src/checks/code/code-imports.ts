// The gate refuses local calculation dependencies absent from the declared fingerprint, naming their source.
import { readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import type { CodeFile } from "../../runtime/code-files.ts";
function localImport(file: string, name: string): string | undefined {
  if (name.startsWith("#")) {
    const target = ts.resolveModuleName(
      name,
      file,
      {
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
      },
      ts.sys,
    ).resolvedModule?.resolvedFileName;
    if (!target) throw new Error(`${file}: unresolved calculation import: ${name}`);
    return target;
  }
  if (name.startsWith("file:")) return fileURLToPath(name);
  return name.startsWith(".") || isAbsolute(name) ? resolve(dirname(file), name) : undefined;
}
export function checkCodeImports(files: readonly CodeFile[]): void {
  const included = new Set(files.map(({ file }) => file));
  const visited = new Set<string>();
  const inspect = (file: string): void => {
    if (visited.has(file)) return;
    visited.add(file);
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    const visit = (node: ts.Node): void => {
      let target: ts.Node | undefined;
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) target = node.moduleSpecifier;
      if (ts.isCallExpression(node) && ["import", "require", "require.resolve"].includes(node.expression.getText()))
        target = node.arguments[0];
      if (target) {
        if (!ts.isStringLiteralLike(target)) throw new Error(`${file}: undeclared dynamic calculation import`);
        const name = target.text;
        const path = localImport(file, name);
        if (path) {
          if (!included.has(path)) throw new Error(`${file}: calculation import outside declared code: ${path}`);
          inspect(path);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  };
  for (const { file } of files)
    if (/\.[cm]?[jt]sx?$/.test(file) && !/\.(spec|test)\.[cm]?[jt]sx?$/.test(file)) inspect(file);
}
