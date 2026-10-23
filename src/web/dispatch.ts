import type { LocalSession } from "../local.ts";
import { createSchemaValidator } from "../validation.ts";
import { Requests, type Method, type RequestInput } from "./protocol.ts";
import type { ApiMethods } from "./types.ts";

const validators = Object.fromEntries(Object.entries(Requests).map(([method, schema]) =>
  [method, createSchemaValidator(schema)]));

export function dispatch<K extends Method>(session: LocalSession, method: K, value: RequestInput<K>): Promise<ApiMethods[K]["output"]>;
export function dispatch(session: LocalSession, method: string, value: unknown): Promise<ApiMethods[Method]["output"]>;
export function dispatch(session: LocalSession, method: string, value: unknown) {
  if (!Object.hasOwn(Requests, method)) throw new Error("UNKNOWN_OPERATION");
  if (!validators[method]!(value)) throw new Error("INVALID_REQUEST");
  const handlers: { [K in Method]: (input: RequestInput<K>) => ReturnType<LocalSession[K]> } = {
    reserveImage: input => session.reserveImage(input.runId, input.inputField, input.size),
    imageStatus: input => session.imageStatus(input.runId, input.inputField, input.reference),
    activityCreate: input => session.activityCreate(input.occurrence, input.plan, input.options),
    activityList: input => session.activityList(input),
    activityRead: input => session.activityRead(input.id),
    activityAnswer: input => session.activityAnswer(input.id, input.revision, input.step, input.input),
    activityReopen: input => session.activityReopen(input.id, input.revision, input.step),
    activityPrepare: input => session.activityPrepare(input.id, input.revision),
    activityCancel: input => session.activityCancel(input.id, input.revision),
    preflight: input => session.preflight(input.journeyId, input.input, input.options),
    begin: input => session.begin(input.journeyId, input.subject),
    prepare: input => session.prepare(input.runId, input.input, input.options),
    read: input => session.read(input.runId),
    accept: input => session.accept(input.intentId, input.confirmationDigest),
    receipt: input => session.receipt(input.intentId),
    offer: input => session.offer(input.journeyId, input.subject),
  };
  return handlers[method as Method](value as never);
}
