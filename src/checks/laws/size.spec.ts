import { longFiles, longLines, repeatedClasses, unsafeCasts, switchedOffChecks, looseCompiler } from "./size.ts";
import { lawRepository } from "../../../tests/support/law-repository.ts";
import { expect, it } from "vitest";

it("catches a file at the configured limit plus one and an overlong line", () => {
  const repo = lawRepository({ "src/a.ts": "export {};\n".repeat(301), "tests/support.ts": "x".repeat(121) });
  expect(longFiles(repo, 300)).toEqual(["src/a.ts"]);
  expect(longFiles(repo, 301)).toEqual([]);
  expect(longLines(repo)).toEqual(["tests/support.ts:1"]);
});
it("catches unsafe assertions, switched-off checks, duplicate classes and a loose compiler", () => {
  const repo = lawRepository({
    "src/a.ts": "class Same {}\nconst x = value as string;",
    "src/b.ts": "class Same {}",
    "tests/support.ts": ["// @ts", "ignore"].join("-"),
    "tsconfig.json": '{"compilerOptions":{"strict":false}}',
  });
  expect(repeatedClasses(repo)).toEqual(["Same"]);
  expect(unsafeCasts(repo)).toEqual(["src/a.ts: value as string"]);
  expect(switchedOffChecks(repo)).toEqual(["tests/support.ts"]);
  expect(looseCompiler(repo)).toEqual([
    "strict",
    "erasableSyntaxOnly",
    "noUncheckedIndexedAccess",
    "exactOptionalPropertyTypes",
  ]);
});
