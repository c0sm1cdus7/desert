// Rechecks rules when each capability is used after a wait, before the external effect.
import type { ToolCapabilities } from "../capabilities-contract.ts";
export function ruleCapabilities(capabilities: ToolCapabilities, check: () => void): ToolCapabilities {
  return {
    ports: Object.fromEntries(
      Object.entries(capabilities.ports).map(([adapter, methods]) => [
        adapter,
        Object.fromEntries(
          Object.entries(methods).map(([name, call]) => [
            name,
            async (input: unknown) => {
              check();
              return call(input);
            },
          ]),
        ),
      ]),
    ),
    credentials: {
      current: slot => capabilities.credentials.current(slot),
      revision: slot => capabilities.credentials.revision(slot),
      replace: (slot, refs, expected) => {
        check();
        return capabilities.credentials.replace(slot, refs, expected);
      },
      release: (slot, expected) => {
        check();
        return capabilities.credentials.release(slot, expected);
      },
    },
  };
}
