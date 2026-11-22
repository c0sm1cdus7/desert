import { isRecord } from "../../fields/json-values.ts";
import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";
import { compose } from "./compose.ts";
import { sampleOptions } from "../../../tests/support/installable-program.ts";
import { staged, cast } from "../../checks/promises/promised-stage.ts";
import { localPorts } from "../house-runtime.ts";
import { effect } from "../../house/facts.ts";
import { houseTools } from "../../surface/bridge/assembly/house-tools.ts";
import { mcpReading } from "../../doors/mcp/mcp-reading.ts";
import { kitCatalog } from "../../tools/identities/kit-catalog.ts";

it.each([
  [false, false],
  [true, false],
  [false, true],
  [true, true],
])(
  "applies the mind matrix to terminal, MCP and kit, keeping deterministic startup and history: %s %s",
  async (assistants, programs) => {
    const result = compose({
      ...sampleOptions,
      minds: { assistants: assistants, programs: programs ? ["notes"] : [] },
    });
    expect(result.program.minds).toEqual(result.minds);
    const started: string[] = [];
    // A distribution that turns minds on has to give their model configuration explicitly; nothing here thinks.
    const modelMinds = {
      language: "es" as const,
      definitions: [],
      catalog: [],
      providers: [],
      fingerprint: () => ({ cases: "c", skill: "s", frameTexts: "f" }),
      key: () => Promise.resolve(undefined),
      transport: () => Promise.reject(new Error("sin red")),
      account: "prueba",
      capNanoUsd: 0,
      maxInputTokens: 10000,
      message: () => undefined,
      textRules: [],
      rulesVersion: () => "v1",
    };
    const program = {
      ...result.program,
      ...(assistants || programs ? { modelMinds } : {}),
      registry: result.program.registry.map(tool => ({
        ...tool,
        start: (ports: Parameters<NonNullable<typeof tool.start>>[0]) => {
          const wake = ports.bus.emit({ layer: "house", kind: "wake-at", data: { id: "notes:test", at: null } });
          started.push(wake.by);
          return () => {};
        },
      })),
    };
    await staged(program, async ({ house, reopen }) => {
      await Promise.resolve();
      expect(started).toEqual(["mind:notes"]);
      const registry = house().registry;
      const ids = registry.find(tool => tool.id === "identities");
      const expected = ["enable-assistant", "disable-assistant", "delegate-assistant", "adopt-assistant"];
      const surface = houseTools(localPorts(house(), cast.admin, { recentLines: 20 }), result.shown);
      const identity = surface.find(tool => tool.id === "identities");
      const mcp = JSON.stringify(mcpReading(house(), cast.admin, { recentLines: 20 }).actions("identities"));
      for (const act of expected) {
        expect(Object.hasOwn(ids?.acts ?? {}, act)).toBe(assistants);
        expect(Object.hasOwn(identity?.actsOn ?? {}, act)).toBe(assistants);
        expect(mcp.includes(act)).toBe(assistants);
      }
      expect(
        kitCatalog(registry)
          .flatMap(tool => Object.keys(tool.acts))
          .some(act => expected.includes(act)),
      ).toBe(false);
      house().bus.emit(effect("assistant-enabled", { owner: cast.admin, name: "Nora" }, cast.admin));
      const historic = house().tools.state().house.assistants.get(cast.admin);
      reopen();
      expect(house().tools.state().house.assistants.get(cast.admin)).toEqual(historic);
      expect(started).toEqual(["mind:notes", "mind:notes"]);
      expect([...house().tools.state().house.minds.turns.values()]).toEqual([]);
      expect([...house().tools.state().house.modelCalls.values()]).toEqual([]);
    });
  },
);
it("imports a disabled distribution and its runtime without loading turns, cards or model adapters", () => {
  const fixture = new URL("../../../tests/support/installable-program.ts", import.meta.url).href;
  const script = `
import { registerHooks } from "node:module";
const loaded = [];
registerHooks({ load(url, context, next) { loaded.push(url); return next(url, context); } });
const { compose } = await import(${JSON.stringify(new URL("./compose.ts", import.meta.url).href)});
const { sampleOptions } = await import(${JSON.stringify(fixture)});
const result = compose(sampleOptions);
await import(${JSON.stringify(new URL("../house-runtime.ts", import.meta.url).href)});
process.stdout.write(JSON.stringify({ minds: result.minds, loaded }));`;
  const output = execFileSync(process.execPath, ["--input-type=module", "-e", script], { encoding: "utf8" });
  const result: unknown = JSON.parse(output);
  if (!isRecord(result) || !Array.isArray(result.loaded)) throw new Error("Invalid loader observation");
  const loaded = result.loaded.filter((path: unknown): path is string => typeof path === "string");
  expect(result.minds).toEqual({ assistants: false, programs: [] });
  expect(loaded.filter(path => /\/(runtime\/minds|adapters\/models)\//.test(path))).toEqual([]);
  expect(loaded.some(path => path.endsWith("house/minds/mind-state.ts"))).toBe(true);
});
