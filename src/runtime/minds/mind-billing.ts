// Selects explicit host billing or the existing house journal, including any opening balance.
import { modelAccount } from "../../house/minds/model-call-state.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { MindBilling, MindRuntimeHouse, MindRuntimeOptions } from "./mind-runtime-options.ts";
export function billingFor<X extends Program>(house: MindRuntimeHouse<X>, options: MindRuntimeOptions): MindBilling {
  return (
    options.billing ?? {
      bus: house.execution.bus,
      calls: () => house.execution.state().house.modelCalls,
      active: house.active,
    }
  );
}
export const billingAccount = (billing: MindBilling, account: string) =>
  billing.balance?.(account) ?? modelAccount(billing.calls(), account);
