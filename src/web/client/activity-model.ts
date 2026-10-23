import type { HumanSurface, Receipt } from "../types.ts";
import { TransportError, acceptanceOutcomeUnknown, type ControllerTransport } from "./transport.ts";
import { emptyActivityState, type ActivityExperience, type ActivitySnapshot, type ActivityState } from "./activity-state.ts";
import { activityJournal, activityRecoveryRequired, type ActivityHost, type ActivityJournalEntry } from "./activity-host.ts";
import { requireMutationReceipt } from "./mutation-receipt.ts";
import { requireActivityResponse } from "./activity-response.ts";

export function activityModel(surface: HumanSurface, transport: ControllerTransport, notify: () => void,
  completed: (experience: ActivityExperience, receipt: Receipt) => Promise<void>, host?: ActivityHost) {
  let state = emptyActivityState(), epoch = 0, disposed = false;
  const journal = activityJournal(host);
  const update = (patch: Partial<ActivityState>) => { if (!disposed) { state = { ...state, ...patch }; notify(); } };
  function adopt(activity: ActivitySnapshot, expectedId?: string, intentId?: string) {
    requireActivityResponse(activity, state.experience!, expectedId, intentId);
    const step = activity.progress.nextStep;
    const blank = Object.fromEntries((step === null ? [] : activity.plan.steps[step]!.inputs).map(field => [field, ""]));
    update({ activity, draft: { ...blank, ...activity.currentInput }, prepared: activity.prepared ?? null, touched: [] });
  }
  async function operation(work: (active: () => boolean) => Promise<void>, pending: NonNullable<ActivityState["pending"]> = "invoke") {
    if (disposed || state.busy) return;
    const version = ++epoch, active = () => !disposed && version === epoch;
    update({ busy: true, pending, error: null });
    try { await work(active); }
    catch (error) { if (active()) update({ error: error instanceof TransportError ? error.code : "OPERATION_FAILED" }); }
    finally { if (active()) update({ busy: false, pending: null }); }
  }
  async function prepare(active: () => boolean) {
    const activity = state.activity!;
    const result = await transport.call("activityPrepare", { id: activity.id, revision: activity.revision });
    if (!active()) return;
    if (result.intent.journeyId !== state.experience!.id || result.activity.intentId !== result.intent.id) throw new TransportError("INVALID_RESPONSE");
    adopt(result.activity, activity.id); update({ prepared: result.intent });
  }
  async function open(experience: ActivityExperience, resumeId?: string) {
    if (disposed || state.busy || state.uncertain) return;
    let prior: ActivityJournalEntry | null;
    try { prior = journal.read(); }
    catch { update({ error: "OPERATION_FAILED" }); return; }
    if (resumeId && prior?.activity && resumeId !== prior.activity && activityRecoveryRequired(prior)) {
      update({ error: "ACTIVITY_RECOVERY_REQUIRED" }); return;
    }
    if (prior && prior.journey !== experience.id && activityRecoveryRequired(prior)) {
      update({ error: "ACTIVITY_RECOVERY_REQUIRED" }); return;
    }
    update({ ...emptyActivityState(), experience });
    await operation(async active => {
      const savedOccurrence = prior?.journey === experience.id && (!resumeId || prior.activity === resumeId) ? prior : undefined;
      const occurrence = savedOccurrence?.occurrence ?? journal.createOccurrence();
      const known = savedOccurrence?.activity;
      const pending = known ? prior?.pending : undefined;
      const ambiguous = Boolean(known && !pending && activityRecoveryRequired(prior));
      if (pending || ambiguous) update({ uncertain: true });
      if (!known) journal.write(experience.id, occurrence);
      let after: string | undefined, found: string | undefined = resumeId;
      while (!savedOccurrence && !found) {
        const page = await transport.call("activityList", { limit: 100, ...(after ? { after } : {}) });
        if (!active()) return;
        const match = page.items.find(item => item.journey === experience.id && item.availability === "available");
        found = match?.id; after = page.nextCursor;
        if (!after) break;
      }
      const activity: ActivitySnapshot = known || found ? await transport.call("activityRead", { id: known ?? found! })
        : await transport.call("activityCreate", { occurrence, plan: experience.activity });
      if (!active()) return;
      requireActivityResponse(activity, experience, known ?? found, pending?.intentId);
      const recovery = pending ?? (activity.prepared && (activity.phase === "completed" || ambiguous || found)
        ? { kind: "accept" as const, intentId: activity.prepared.id } : undefined);
      journal.write(experience.id, occurrence, activity.id, recovery);
      adopt(activity);
      update({ uncertain: Boolean(recovery) });
      if (recovery) await recover(active);
      else if (activity.progress.nextStep === null && !state.prepared) await prepare(active);
    });
  }
  async function next() {
    if (!state.activity || state.prepared || state.uncertain) return;
    await operation(async active => {
      const before = state.activity!, draft = state.draft;
      const latest = await transport.call("activityRead", { id: before.id });
      if (!active()) return;
      requireActivityResponse(latest, state.experience!, before.id);
      if (latest.revision !== before.revision) { adopt(latest); return; }
      if (before.progress.nextStep !== null) {
        const answered = await transport.call("activityAnswer", { id: before.id, revision: before.revision,
          step: before.progress.nextStep, input: draft });
        if (!active()) return;
        adopt(answered, before.id);
      }
      if (state.activity!.progress.nextStep === null) await prepare(active);
    });
  }
  async function back() {
    if (!state.activity || state.uncertain) return;
    const steps = state.activity.progress.completedSteps, step = steps.at(-1);
    if (step === undefined) return;
    await operation(async active => {
      const current = state.activity!;
      const result = await transport.call("activityReopen", { id: current.id, revision: current.revision, step });
      if (active()) adopt(result, current.id);
    });
  }
  async function finish(receipt: Receipt, active: () => boolean) {
    if (!active()) return;
    const experience = state.experience!, mutation = surface.journeys.find(item => item.id === experience.id);
    if (mutation?.kind !== "mutation") throw new TransportError("INVALID_RESPONSE");
    requireMutationReceipt(state.prepared, mutation, receipt);
    journal.clear(); update(emptyActivityState());
    await completed(experience, receipt);
  }
  async function recover(active: () => boolean) {
    const entry = journal.read();
    if (!entry?.activity || entry.journey !== state.experience!.id) throw new TransportError("INVALID_RESPONSE");
    if (!state.prepared) {
      const activity = await transport.call("activityRead", { id: entry.activity });
      if (!active()) return;
      requireActivityResponse(activity, state.experience!, entry.activity, entry.pending?.intentId);
      if (!activity.prepared) throw new TransportError("INVALID_RESPONSE");
      journal.accepting(entry.journey, entry.activity, activity.prepared.id);
      adopt(activity, entry.activity, activity.prepared.id);
    }
    const prepared = state.prepared!;
    if (entry.pending && entry.pending.intentId !== prepared.id) throw new TransportError("INVALID_RESPONSE");
    const receipt = await transport.call("receipt", { intentId: prepared.id });
    if (receipt) await finish(receipt, active); else if (active()) update({ receiptMissing: true });
  }
  async function confirm(recovery: boolean) {
    if (recovery ? !state.uncertain : !state.prepared || state.uncertain || state.activity?.phase === "completed") return;
    await operation(async active => {
      if (recovery) { await recover(active); return; }
      const prepared = state.prepared!;
      journal.accepting(state.experience!.id, state.activity!.id, prepared.id);
      try {
        await finish(await transport.call("accept", { intentId: prepared.id, confirmationDigest: prepared.confirmationDigest }), active);
      } catch (error) {
        if (active()) {
          if (acceptanceOutcomeUnknown(error)) update({ uncertain: true });
          else {
            const entry = journal.read()!;
            try { journal.write(entry.journey, entry.occurrence, entry.activity); }
            catch (failure) { update({ uncertain: true }); throw failure; }
          }
        }
        throw error;
      }
    }, recovery ? "recover" : "accept");
  }
  return {
    snapshot: () => state, open, next, back, accept: () => confirm(false), recover: () => confirm(true),
    edit(name: string, value: string) {
      const activity = state.activity, step = activity?.progress.nextStep;
      if (state.busy || state.uncertain || !activity || step === null || step === undefined) return;
      if (!activity.plan.steps[step]!.inputs.includes(name)) throw new Error("INVALID_VIEW_INPUT");
      update({ draft: { ...state.draft, [name]: value }, touched: [...new Set([...state.touched, name])], error: null });
    },
    pendingJourney: () => journal.read()?.journey,
    close() {
      if (disposed || state.busy || state.uncertain) return;
      try { if (activityRecoveryRequired(journal.read())) return; journal.clear(); }
      catch { update({ error: "OPERATION_FAILED" }); return; }
      epoch++; update(emptyActivityState());
    },
    dismissError() { update({ error: null }); },
    dispose() { disposed = true; epoch++; state = emptyActivityState(); },
  };
}
