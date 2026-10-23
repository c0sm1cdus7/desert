import type { HumanSurface, ValidateInput } from "../types.ts";
import type { ViewProgram } from "../../views/program-schema.ts";
import type { ResolvedPanel } from "../../views/resolved.ts";
import type { ActivityState } from "./activity-state.ts";
import type { HumanState } from "./state.ts";
import { surfaceFrame } from "../../interaction/surface-frame.ts";
import { formFrame, reviewFrame, toolbarAction } from "../../interaction/frame-presenters.ts";
import { bankNode, BankVersion } from "../../interaction/bank-node.ts";
import { resolveViewIdentity } from "./view-identity.ts";
import { viewInputs } from "../../views/ports.ts";
import { activityAnswerValidation } from "../../activities/answer-validation.ts";
import { fieldFeedback } from "./field-feedback.ts";

export function projectActivityPanel(program: ViewProgram, surface: HumanSurface, current: HumanState,
  state: ActivityState, validate: ValidateInput): ResolvedPanel | null {
  const experience = state.experience;
  if (!experience) return null;
  const mutation = surface.journeys.find(item => item.id === experience.id);
  if (mutation?.kind !== "mutation") throw new Error("INVALID_ACTIVITY_OPERATION");
  const available = current.availability.journeys[mutation.id]?.dependenciesReady === true;
  const enabled = available && !state.busy;
  const close = toolbarAction({ kind: "close" }, "Close", "close", !state.busy && !state.uncertain);
  if (!state.activity) {
    const frame = surfaceFrame({ version: "desert.surface-frame/6", kind: state.uncertain ? "journey" : "message",
      top: { title: surface.language.journeys[mutation.id]!, leading: close,
        ...(state.uncertain ? { trailing: [toolbarAction({ kind: "recover" }, "Check result", "recover", enabled)] } : {}) },
      content: { kind: "message", text: state.uncertain ? "Recover the original operation before continuing. No operation will be repeated."
        : state.error ? "This activity could not be opened. Close it and try again." : "Opening your saved steps." },
      bottom: {} });
    return { frame, label: frame.top.title, locked: state.busy || state.uncertain };
  }
  const activity = state.activity, step = activity.progress.nextStep;
  const viewId = step === null ? activity.plan.review : activity.plan.steps[step]!.view;
  const definition = program.views.find(view => view.id === viewId)!;
  const view = resolveViewIdentity(program, experience, definition, surface, current);
  const header = view.content.find(item => item.kind === "header");
  const port = viewInputs(definition)[0]!;
  if (state.prepared) {
    const frame = reviewFrame(surface, mutation, state.prepared.facts,
      state.uncertain ? { kind: "recovery", method: "receipt-only" } : { kind: "review" }, state.busy, available,
      { pendingAction: state.pending, receiptMissing: state.receiptMissing });
    if (frame.content.kind !== "review") throw new Error("INVALID_ACTIVITY_REVIEW");
    const navigationFrame = activity.plan.steps.length > 1 ? surfaceFrame({...frame,navigation:"steps"}) : frame;
    return { frame: navigationFrame, label: frame.top.title, locked: state.busy || state.uncertain,
      ...(!state.uncertain ? { body: { view, bindings: { [port.input]: bankNode({ version: BankVersion, kind: "context",
        content: { kind: "context", details: frame.content.details, actions: [] } }) }, disabledOutputs: [] } } : {}) };
  }
  const fields = step === null ? [] : activity.plan.steps[step]!.inputs;
  const validation = step === null ? { valid: true, issues: [] } : activityAnswerValidation(
    validate.inspect?.(mutation.commandId, state.draft) ?? { valid: false, issues: [] }, fields);
  const action = toolbarAction({ kind: "journey", journey: mutation.id }, step === null ? "Review" : "Continue", "review", enabled && validation.valid);
  const base = formFrame(surface, mutation, Object.fromEntries(Object.entries(state.draft).map(([name, value]) => [name, String(value)])), {
    ...(activity.progress.completedSteps.length ? { secondary: toolbarAction({ kind: "back" }, "Back", "back", enabled) } : {}),
    primary: { ...action, ...(state.busy ? { state: "pending" as const } : {}) },
  }, fieldFeedback(validation, state.touched));
  if (base.content.kind !== "form") throw new Error("INVALID_ACTIVITY_FORM");
  const content = { ...base.content, fields: base.content.fields.filter(field => fields.includes(field.name)) };
  const frame = surfaceFrame({ ...base, ...(activity.plan.steps.length > 1 ? {navigation:"steps"} : {}), top: { title: header?.title ?? base.top.title,
    ...(header?.subtitle ? { subtitle: header.subtitle } : {}) }, content });
  return { frame, label: frame.top.title, locked: state.busy,
    ...(step !== null ? { body: { view, bindings: { [port.input]: bankNode({ version: BankVersion, kind: "form", content }) }, disabledOutputs: [] } } : {}) };
}
