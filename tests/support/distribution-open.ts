// Opens the composed sample on a real terminal with synthetic assistants and in-memory test keys.
import { startTerminal } from "../../src/doors/terminal/boot.ts";
import { MemoryHouseKeys } from "../../src/keychain/custody/house-keys.ts";
import { localPorts, startHouse } from "../../src/runtime/house-runtime.ts";
import { houseRouter } from "../../src/surface/bridge/assembly/house-router.ts";
import { compose } from "../../src/runtime/distributions/compose.ts";
import { defineProgram } from "../../src/tools/installable/program.ts";
import { effect } from "../../src/house/facts.ts";
import { sampleBody, sampleMetadata, sampleOptions } from "./installable-program.ts";
const home = process.argv[2];
if (!home) throw new Error("A synthetic home is required");
const single = defineProgram(sampleMetadata, {
  ...sampleBody,
  tools: { personal: sampleBody.tools.personal },
});
const { program, shown } = compose({
  ...sampleOptions,
  programs: [single],
  singleToolShortcut: process.argv[3] === "shortcut",
  minds: { assistants: true, programs: [] },
});
/** Assistants are on, so the house needs an explicit model configuration; nothing here thinks or calls out. */
const modelMinds = {
  language: "es" as const,
  definitions: [],
  catalog: [],
  providers: [],
  fingerprint: () => ({ cases: "c", skill: "s", frameTexts: "f" }),
  key: () => Promise.resolve(undefined),
  transport: () => Promise.reject(new Error("sin red")),
  account: "test-account",
  capNanoUsd: 0,
  maxInputTokens: 10000,
  message: () => undefined,
  textRules: [],
  rulesVersion: () => "v1",
};
const house = startHouse(home, {
  ...program,
  modelMinds,
  by: "house",
  secretKeys: new MemoryHouseKeys(),
  creation: {
    admin: "ana",
    assignments: [
      { identity: "ana", tools: ["notes"] },
      { identity: "legacy", tools: [] },
    ],
  },
});
if (!house.tools.state().house.assistants.has("ana"))
  house.bus.emit(effect("assistant-enabled", { owner: "ana", name: "Nora" }, "ana"));
const router = houseRouter(localPorts(house, "ana", { recentLines: 40 }), shown);
await startTerminal(process.stdout, process.stdin, router);
router.stop();
house.close();
