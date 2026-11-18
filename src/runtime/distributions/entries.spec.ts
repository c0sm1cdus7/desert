import ts from "typescript";
import { expect, it } from "vitest";
import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { installablePackage } from "../../../tests/support/installable-package.ts";
import { distributionEntryFixture } from "../../../tests/support/distribution-entry-fixture.ts";

it("starts local and cloud houses through public exports from linked packages outside node_modules", () => {
  const toy = installablePackage();
  const distribution = join(toy.root, "distribution");
  const host = join(distribution, "paquetes/host");
  mkdirSync(join(host, "node_modules"), { recursive: true });
  mkdirSync(join(distribution, "node_modules"));
  symlinkSync(host, join(distribution, "node_modules/distribution-host"), "dir");
  symlinkSync(toy.root, join(host, "node_modules/toy"), "dir");
  symlinkSync(resolve("."), join(host, "node_modules/desert"), "dir");
  writeFileSync(
    join(host, "package.json"),
    JSON.stringify({ name: "distribution-host", type: "module", exports: "./index.ts" }),
  );
  writeFileSync(join(distribution, "package.json"), JSON.stringify({ type: "module" }));
  const entry = join(distribution, "index.ts");
  writeFileSync(entry, 'import "distribution-host";');
  writeFileSync(join(host, "index.ts"), distributionEntryFixture);
  const typed = ts.createProgram([entry], {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2023,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    allowImportingTsExtensions: true,
    exactOptionalPropertyTypes: true,
    types: ["node"],
    typeRoots: [resolve("node_modules/@types")],
  });
  expect(ts.getPreEmitDiagnostics(typed).map(d => ts.flattenDiagnosticMessageText(d.messageText, "\n"))).toEqual([]);
  const output = execFileSync(process.execPath, [entry], {
    encoding: "utf8",
    timeout: 20000,
    env: { PATH: process.env.PATH, NODE_NO_WARNINGS: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  expect(output).toBe("local-cloud-exports-ok");
}, 30000);
