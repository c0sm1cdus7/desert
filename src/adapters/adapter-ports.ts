// Lends methods per operation; validates public data and revokes the resolver when done.
import { Value } from "@sinclair/typebox/value";
import type { SecretCustody, CredentialSession } from "../keychain/custody/secret-custody.ts";
import type { PublicPorts } from "../tools/capabilities-contract.ts";
import { AdapterFailure, type AdapterDeclaration, type AdapterMethod } from "../tools/adapter-contract.ts";
import { publicValue } from "./public-value.ts";
type Access = Readonly<{ custody: SecretCustody; session: CredentialSession; check(): void }>;
async function invoke(
  declaration: AdapterDeclaration,
  name: string,
  method: AdapterMethod,
  access: Access,
  value: unknown,
): Promise<unknown> {
  const resolver = access.custody.adapter(access.session, method.permissions.slots);
  let active = true;
  const check = () => {
    access.check();
    if (!active) throw new AdapterFailure("E-ADAPTER-DENIED");
  };
  try {
    const methods = declaration.open(
      Object.freeze({
        capture: (material: Uint8Array) => {
          check();
          if (!method.permissions.capture) throw new AdapterFailure("E-ADAPTER-DENIED");
          return resolver.capture(material);
        },
        use: <T>(
          refs: Parameters<typeof resolver.use>[0],
          body: (values: Readonly<Record<string, Uint8Array>>) => T | Promise<T>,
        ) => {
          check();
          return resolver.use(refs, body);
        },
      }),
    );
    const call = methods[name];
    if (!Object.hasOwn(methods, name) || !call) throw new AdapterFailure("E-ADAPTER-FAILED");
    return await call(value);
  } catch {
    access.check();
    throw new AdapterFailure("E-ADAPTER-FAILED");
  } finally {
    active = false;
  }
}
function operation(declaration: AdapterDeclaration, name: string, method: AdapterMethod, access: Access) {
  return async (input: unknown): Promise<unknown> => {
    access.check();
    if (!method.permissions.tools.includes(access.session.scope.tool)) throw new AdapterFailure("E-ADAPTER-DENIED");
    let value: unknown;
    try {
      value = publicValue(input);
    } catch {
      throw new AdapterFailure("E-ADAPTER-INPUT");
    }
    if (!Value.Check(method.input, value)) throw new AdapterFailure("E-ADAPTER-INPUT");
    const result = await invoke(declaration, name, method, access, value);
    try {
      const output = publicValue(result);
      if (!Value.Check(method.output, output)) throw new AdapterFailure("E-ADAPTER-OUTPUT");
      return output;
    } catch {
      access.check();
      throw new AdapterFailure("E-ADAPTER-OUTPUT");
    }
  };
}
export function adapterPorts(declarations: Readonly<Record<string, AdapterDeclaration>>, access: Access): PublicPorts {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(declarations).map(([id, declaration]) => [
        id,
        Object.freeze(
          Object.fromEntries(
            Object.entries(declaration.methods)
              .filter(([, method]) => method.permissions.tools.includes(access.session.scope.tool))
              .map(([name, method]) => [name, operation(declaration, name, method, access)]),
          ),
        ),
      ]),
    ),
  );
}
