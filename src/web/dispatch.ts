import type { LocalSession } from "../local.ts";
import { createSchemaValidator } from "../validation.ts";
import { Requests, type Method, type RequestInput } from "./protocol.ts";

const validators = Object.fromEntries(Object.entries(Requests).map(([method, schema]) =>
  [method, createSchemaValidator(schema)]));

export function dispatch(session: LocalSession, method: string, value: unknown) {
  if (!Object.hasOwn(Requests, method)) throw new Error("UNKNOWN_OPERATION");
  if (!validators[method]!(value)) throw new Error("INVALID_REQUEST");
  const handlers: { [K in Method]: (input: RequestInput<K>) => ReturnType<LocalSession[K]> } = {
    begin: input => session.begin(input.journeyId, input.subject),
    prepare: input => session.prepare(input.runId, input.input),
    read: input => session.read(input.runId),
    accept: input => session.accept(input.intentId, input.confirmationDigest),
    receipt: input => session.receipt(input.intentId),
    offer: input => session.offer(input.journeyId, input.subject),
  };
  return handlers[method as Method](value as never);
}
