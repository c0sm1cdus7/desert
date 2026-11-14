import { join } from "node:path";
/** Named public imports stop at the audited engine boundary. Internal composition and storage never do. */
const modules: Record<string, readonly string[]> = {
  "house/identity-name.ts": ["identityNameProblem"],
  "catalogs/acts.ts": ["object"],
  "catalogs/fields.ts": [
    "text",
    "money",
    "quantity",
    "count",
    "day",
    "digits",
    "handle",
    "holding",
    "many",
    "oneOf",
    "option",
    "padded",
    "quantityDecimals",
    "shownMoney",
    "someOf",
    "textLimit",
    "thing",
    "usually",
    "when",
    "wrongIn",
  ],
  "catalogs/levers.ts": ["ViewLimits"],
  "catalogs/time.ts": ["caseInstant"],
  "catalogs/ids.ts": ["ids"],
  "journal/events.ts": ["effect", "vocabulary", "Emission", "Event", "ProgramFacts", "Catalog", "HouseEvent"],
  "tools/act-definition.ts": ["toolAct"],
  "tools/tool-contract.ts": [
    "ActContext",
    "ActResult",
    "Program",
    "State",
    "Slices",
    "Tool",
    "ToolAct",
    "ToolRegistry",
    "OwnAct",
    "Reach",
  ],
  "tools/promises.ts": ["programAct", "ProgramAct", "ProgramTool", "Case", "Step", "Also", "Need", "Offered", "Told"],
  "tools/startup-contract.ts": ["ToolStartup"],
  "tools/capabilities-contract.ts": ["SecretRef", "SecretRefs", "Credential", "CredentialOperations", "PublicPorts"],
  "tools/execution/capabilities.ts": ["noCapabilities"],
  "tools/outside.ts": ["OutsideDefect", "outsideCause", "RunResult"],
  "tools/failures/port-failure.ts": ["PortFailure"],
  "surface/bridge/house-ports.ts": ["Shown", "SurfaceWords", "ProgramScreen", "SurfacePorts", "ScreenActs", "Start"],
};
export function secretPublicApi(base: string): Readonly<Record<string, readonly string[]>> {
  const safe = [...new Set(Object.values(modules).flat())];
  const entries: [string, readonly string[]][] = [
    ...Object.entries(modules).map(([file, names]): [string, readonly string[]] => [join(base, "src", file), names]),
    [join(base, "src/testing.ts"), safe],
    ["@sinclair/typebox", ["Type", "Static", "TSchema"]],
    ["@sinclair/typebox/value", ["Value"]],
  ];
  return Object.fromEntries(entries);
}
