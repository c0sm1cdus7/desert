import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { Check } from "@sinclair/typebox/value";
import { ExposureSchema } from "../src/program-grammar.ts";
import { humanExposure } from "../src/exposures.ts";
import { composeProduct } from "../src/modules/compose.ts";
import { ArchiveNote, CreateNote, ReadNote } from "../products/notebook/journeys.ts";
import { navigationOwnershipFixture } from "./fixtures/navigation-ownership.ts";

const expectedConnection = {
  availability: "journey-dependencies", draftRetention: "session-memory", reconnect: "refresh-without-replay",
};
const exposure = {
  id: "human", journeys: [CreateNote, ReadNote, ArchiveNote], locale: "en",
};

test("authored View exposure preserves exact journey references without configuring connection policy", () => {
  const result = humanExposure(exposure);
  assert.equal(Object.hasOwn(result, "connection"), false);
  assert.deepEqual(result, { id: "human", kind: "human", locale: "en", journeys: [CreateNote, ReadNote, ArchiveNote] });
  assert.equal(result.journeys[0], CreateNote);
  assert.equal(result.journeys[1], ReadNote);
  assert.equal(result.journeys[2], ArchiveNote);
  assert.notEqual(result.journeys, exposure.journeys);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.journeys));
});

test("composition derives the unchanged frozen SDK connection policy", () => {
  const { composition } = navigationOwnershipFixture();
  const surface = composeProduct(composition).definition.surfaces?.find(item => item.kind === "human");
  assert.ok(surface?.kind === "human");
  assert.deepEqual(surface.connection, expectedConnection);
  assert.equal(Object.isFrozen(surface.connection), true);
  assert.equal(Check(ExposureSchema, surface), true);
});

test("human exposure and product composition reject every authored connection property", () => {
  for (const connection of [expectedConnection, { ...expectedConnection, reconnect: "replay" }, undefined, null]) {
    assert.throws(() => Reflect.apply(humanExposure, undefined, [{ ...exposure, connection }]), /SURFACE_CONNECTION_POLICY_FORBIDDEN/);
    const { composition } = navigationOwnershipFixture();
    const candidate = { ...composition, exposures: composition.exposures.map(surface => surface.kind === "human"
      ? { ...surface, connection } : surface) };
    assert.throws(() => Reflect.apply(composeProduct, undefined, [candidate]), /SURFACE_CONNECTION_POLICY_FORBIDDEN/);
  }
});

test("the wire grammar rejects departures from the SDK connection policy", () => {
  const result = composeProduct(navigationOwnershipFixture().composition).definition.surfaces?.find(item => item.kind === "human");
  assert.ok(result?.kind === "human");
  for (const change of [{ availability: "internet" }, { draftRetention: "discard" }, { reconnect: "replay" }, { custom: true }]) {
    assert.equal(Check(ExposureSchema, { ...result, connection: { ...expectedConnection, ...change } }), false);
  }
});

test("human exposure and composition reject connection declarations statically, including variables", () => {
  const fixture = resolve("tests/fixtures/connection-policy-types.ts");
  const source = readFileSync(fixture, "utf8");
  const expected = source.split("\n").flatMap((line, index) => line.includes("@ts-expect-error") ? [index + 2] : []);
  const config = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
  const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
  const host = ts.createCompilerHost(options), read = host.readFile;
  host.readFile = path => resolve(path) === fixture ? read(path)?.replace(/\/\/ @ts-expect-error[^\n]*/g, "") : read(path);
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([fixture], options, host))
    .filter(item => item.file && resolve(item.file.fileName) === fixture);
  const lines = diagnostics.map(item => item.file!.getLineAndCharacterOfPosition(item.start!).line + 1);
  assert.deepEqual([...new Set(lines)].sort((a, b) => a - b), expected, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCurrentDirectory: () => process.cwd(), getCanonicalFileName: path => path, getNewLine: () => "\n",
  }));
});
