import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { credentialEffects } from "./credential-effects.ts";
import type { CapabilityFactory } from "../../tools/execution/capabilities.ts";
import type { Credential, CredentialScope } from "../../tools/capabilities-contract.ts";
import type { SecretCustody } from "../secrets/custody/secret-custody.ts";
import { AdapterFailure, type AdapterComposition, type AdapterDeclaration } from "./adapter-contract.ts";
import { adapterPorts } from "./adapter-ports.ts";
import { publicSchema } from "./public-value.ts";

const permissionSchema = Type.Object(
  { tools: Type.Array(Type.String(), { minItems: 1 }), slots: Type.Array(Type.String()), capture: Type.Boolean() },
  { additionalProperties: false },
);
function declarations(
  options: AdapterComposition,
  tools: readonly string[],
): Readonly<Record<string, AdapterDeclaration>> {
  return Object.fromEntries(
    Object.entries(options.adapters ?? {}).map(([id, declaration]) => [
      id,
      {
        open: declaration.open.bind(declaration),
        methods: Object.fromEntries(
          Object.entries(declaration.methods).map(([name, method]) => {
            const { permissions } = method;
            if (
              !Value.Check(permissionSchema, permissions) ||
              permissions.tools.some(tool => !tools.includes(tool)) ||
              permissions.tools.some(tool =>
                permissions.slots.some(slot => !options.credentialSlots?.[tool]?.includes(slot)),
              )
            )
              throw new AdapterFailure("E-ADAPTER-DECLARATION");
            return [
              name,
              {
                input: publicSchema(method.input),
                output: publicSchema(method.output),
                permissions: {
                  tools: [...permissions.tools],
                  slots: [...permissions.slots],
                  capture: permissions.capture,
                },
              },
            ];
          }),
        ),
      },
    ]),
  );
}
/** Validate before opening a house; pin declarations so later mutation cannot widen permissions. */
export function declaredAdapters(options: AdapterComposition, tools: readonly string[]) {
  const declared = declarations(options, tools);
  const slots = Object.fromEntries(
    Object.entries(options.credentialSlots ?? {}).map(([tool, names]) => {
      if (!tools.includes(tool) || new Set(names).size !== names.length)
        throw new AdapterFailure("E-ADAPTER-DECLARATION");
      return [tool, [...names]];
    }),
  );
  return (custody: SecretCustody, allowed: (scope: CredentialScope) => boolean): CapabilityFactory =>
    scope =>
      leaseFor(custody, allowed, scope, slots[scope.tool] ?? [], declared);
}
function leaseFor(
  custody: SecretCustody,
  allowed: (scope: CredentialScope) => boolean,
  scope: CredentialScope,
  owned: readonly string[],
  declared: Readonly<Record<string, AdapterDeclaration>>,
) {
  const session = custody.begin(scope);
  const snapshot = new Map<string, Credential | undefined>(owned.map(slot => [slot, session.current(slot)]));
  const revisions = new Map(owned.map(slot => [slot, session.revision(slot)]));
  let live = true;
  const check = () => {
    if (!live || !allowed(scope)) throw new AdapterFailure("E-ADAPTER-DENIED");
  };
  const slotCheck = (slot: string) => {
    check();
    if (!owned.includes(slot)) throw new AdapterFailure("E-ADAPTER-DENIED");
  };
  const changes = credentialEffects(custody, session, slotCheck);
  return {
    apply: changes.apply,
    together: <T>(work: () => T) => custody.deferCleanup(work),
    ports: adapterPorts(declared, { custody, session, check }),
    credentials: bindingPort(snapshot, revisions, slotCheck, changes),
    close: () => {
      if (live) {
        live = false;
        session.cancel();
      }
    },
  };
}
function bindingPort(
  snapshot: ReadonlyMap<string, Credential | undefined>,
  revisions: ReadonlyMap<string, number>,
  slotCheck: (slot: string) => void,
  changes: ReturnType<typeof credentialEffects>,
) {
  return Object.freeze({
    current: (slot: string) => {
      slotCheck(slot);
      return structuredClone(snapshot.get(slot));
    },
    revision: (slot: string) => {
      slotCheck(slot);
      return revisions.get(slot) ?? 0;
    },
    replace: changes.replace,
    release: changes.release,
  });
}
