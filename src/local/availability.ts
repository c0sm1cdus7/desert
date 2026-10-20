import { createAvailability } from "../availability.ts";
import { failureReason, inspectLocalSession } from "./health.ts";
import type { Database } from "./database.ts";
import type { LocalProgram } from "./program.ts";

export type LocalAvailabilityOptions = {
  pollIntervalMs?: number;
  validForMs?: number;
  onListenerError?: (error: unknown) => void;
};

export function watchLocalAvailability(database: Database, program: LocalProgram, token: string,
  surface: string, options: LocalAvailabilityOptions = {}) {
  database.assertOpen();
  const pollInterval = options.pollIntervalMs ?? 500;
  const validFor = options.validForMs ?? 1500;
  if (![pollInterval, validFor].every(value => Number.isSafeInteger(value) && value > 0 && value <= 60000) || pollInterval >= validFor) {
    throw new Error("INVALID_AVAILABILITY_TIMING");
  }
  const interaction = program.application.surface(surface);
  const dependencies = new Set(interaction.journeys.flatMap(journey => journey.dependencies));
  if (!dependencies.has(program.role)) throw new Error("CONTROLLER_NOT_EXPOSED");
  const availability = createAvailability({ contractDigest: program.application.digest, interaction,
    bindings: [...dependencies].map(dependency => ({ dependency })) }, options);
  const report = availability.begin(program.role);
  const installation = { product: program.application.id, digest: program.application.digest, role: program.role };
  let disposed = false;
  let revision = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function fail(error: unknown) {
    const reason = failureReason(error);
    if (reason === "incompatible") report.incompatible();
    else report.unavailable(reason);
  }
  const stopFaults = database.onFault(error => { revision++; fail(error); });
  const stopClosing = database.onClose(dispose);

  async function probe() {
    const started = performance.now();
    const current = revision;
    try {
      await inspectLocalSession(database, installation, token);
      if (!disposed && current === revision) {
        const remaining = Math.floor(validFor - (performance.now() - started));
        if (remaining > 0) report.ready(installation.digest, remaining);
        else report.unavailable("unavailable");
      }
    } catch (error) { if (!disposed && current === revision) fail(error); }
    finally { if (!disposed) timer = setTimeout(probe, pollInterval); }
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    clearTimeout(timer);
    stopFaults();
    stopClosing();
    availability.dispose();
  }
  void probe();
  return Object.freeze({ snapshot: availability.snapshot, evidence: availability.evidence,
    subscribe: availability.subscribe, dispose });
}
