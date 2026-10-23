import type { LocalSession } from "./session.ts";
import { requireSessionBinding } from "./session-binding.ts";
import { dispatch } from "../web/dispatch.ts";
import { controllerErrorCode } from "../web/errors.ts";
import { TransportError, type ControllerTransport } from "../web/client/transport.ts";
import { viewProgramModel } from "../web/client/view-program.ts";
import type { ApiMethods, HumanSurface, ValidateInput } from "../web/types.ts";
import { randomUUID } from "node:crypto";
import type { ActivityJournalEntry } from "../web/client/activity-host.ts";

/** Node-only internal host. It is not a remote DTO, endpoint, agent exposure or credential provider. */
export function localViewProgram(session: LocalSession, input: unknown,
  expected: Pick<HumanSurface, "id" | "contractDigest">) {
  const binding = requireSessionBinding(session), application = binding.application;
  if (expected.contractDigest !== application.digest) throw new Error("VIEW_SESSION_CONTRACT_MISMATCH");
  if (expected.id !== binding.surface) throw new Error("VIEW_SESSION_SURFACE_MISMATCH");
  const surface = application.surface(binding.surface);
  let stopped = false, availability: ReturnType<LocalSession["watchAvailability"]> | undefined;
  const transport: ControllerTransport = {
    async evidence() {
      if (stopped) throw new TransportError("CONTROLLER_UNAVAILABLE");
      availability ??= session.watchAvailability();
      return availability.evidence();
    },
    async call<K extends keyof ApiMethods>(method: K, value: ApiMethods[K]["input"]): Promise<ApiMethods[K]["output"]> {
      if (stopped) throw new TransportError("CONTROLLER_UNAVAILABLE");
      try { return await dispatch<K>(session, method, value); }
      catch (error) { throw new TransportError(controllerErrorCode(error)); }
    },
  };
  const validate: ValidateInput = Object.assign(
    (id: string, value: unknown) => application.validateInput(id, value).valid,
    { inspect: (id: string, value: unknown) => application.validateInput(id, value) },
  );
  // The interpreter admits the original compiled surface; an agent surface still fails its runtime gate.
  let entry: ActivityJournalEntry | null = null;
  const model = viewProgramModel(input, surface as HumanSurface, validate, transport, undefined, undefined, {
    load: () => entry, save: value => { entry = structuredClone(value); }, clear: () => { entry = null; }, createOccurrence: randomUUID,
  });
  return {
    ...model,
    start() { return model.start(); },
    stop() { stopped = true; model.stop(); availability?.dispose(); },
  };
}
