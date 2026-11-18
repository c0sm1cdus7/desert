// Checks atomic reservations against the total cap and records settlement or uncertainty.
import { effect } from "../../house/facts.ts";
import { modelAccount, type ModelAccount, type ModelCalls } from "../../house/minds/model-call-state.ts";
import type { Bus } from "../../journal/bus.ts";
import type { MindActor } from "../../fields/mind-actor.ts";
const required = (value: unknown, name: string) => {
  if (value === undefined || value === null) throw new Error(name);
};
type Usage = Readonly<{ input: number; output: number; cacheRead: number; cacheWrite: number }>;
function amount(value: number | undefined, field: string): asserts value is number {
  if (value === undefined || !Number.isSafeInteger(value) || value < 0) throw new Error(field);
}
export function fitsModelCap(account: ModelAccount, capNanoUsd: number | undefined, maximumNanoUsd: number): boolean {
  required(account, "account");
  amount(capNanoUsd, "capNanoUsd");
  amount(maximumNanoUsd, "maximumNanoUsd");
  amount(account.spentNanoUsd, "spentNanoUsd");
  amount(account.reservedNanoUsd, "reservedNanoUsd");
  const total = account.spentNanoUsd + account.reservedNanoUsd + maximumNanoUsd;
  if (!Number.isSafeInteger(total)) throw new Error("total");
  return total <= capNanoUsd;
}
export function settleModelCall(call: string, actualNanoUsd: number, usage: Usage, by: MindActor, process?: string) {
  if (!call) throw new Error("call");
  amount(actualNanoUsd, "actualNanoUsd");
  required(usage, "usage");
  for (const key of ["input", "output", "cacheRead", "cacheWrite"] as const) amount(usage[key], key);
  return effect("model-call-settled", { call, actualNanoUsd, usage }, by, [], process);
}
export function markUncertainCall(call: string, by: MindActor, process?: string) {
  if (!call) throw new Error("call");
  return effect("model-call-uncertain", { call }, by, [], process);
}

export type Reservation = Readonly<{
  call: string;
  turn: string;
  number: number;
  account: string;
  maximumNanoUsd: number;
  by: MindActor;
  process?: string;
}>;
export async function reserveModelCall(
  transact: (
    account: string,
    decide: (current: ModelAccount) => ReturnType<typeof reservationEffect> | undefined,
  ) => Promise<boolean>,
  capNanoUsd: number | undefined,
  reservation: Reservation,
): Promise<boolean> {
  if (!reservation.call || !reservation.turn || !reservation.account) throw new Error("reservation");
  amount(capNanoUsd, "capNanoUsd");
  amount(reservation.maximumNanoUsd, "maximumNanoUsd");
  if (!Number.isSafeInteger(reservation.number) || reservation.number < 1 || reservation.number > 12)
    throw new Error("number");
  return transact(reservation.account, current =>
    fitsModelCap(current, capNanoUsd, reservation.maximumNanoUsd) ? reservationEffect(reservation) : undefined,
  );
}
function reservationEffect(reservation: Reservation) {
  const { by, process, ...data } = reservation;
  return effect("model-call-reserved", data, by, [], process);
}
/** Reading, deciding and writing share the same journal transaction. */
export function budgetTransaction(
  bus: Pick<Bus, "together" | "emit" | "confirmation">,
  calls: () => ModelCalls,
  balance: (account: string) => ModelAccount = account => modelAccount(calls(), account),
) {
  return (account: string, decide: (current: ModelAccount) => ReturnType<typeof reservationEffect> | undefined) => {
    const confirmed = bus.confirmation();
    return Promise.resolve().then(
      () =>
        confirmed() &&
        bus.together(() => {
          const event = decide(balance(account));
          if (!event) return false;
          bus.emit(event);
          return true;
        }),
    );
  };
}
