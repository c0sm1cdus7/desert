import type { HumanSurface, Mutation } from "../web/types.ts";
import { deriveForm } from "./form.ts";
import { surfaceFrame, type SurfaceFrame } from "./surface-frame.ts";
import { toolbarAction, type BottomToolbar } from "./toolbar.ts";
import { presentFacts, presentTitle } from "./fact-presentation.ts";
import { reviewChanges } from "./review-changes.ts";
import type { Facts } from "../fact-values.ts";
import { isImageFileSelection } from "./image-input.ts";
import type { Draft } from "./draft.ts";
import type { ReferenceState,MediaReferenceState } from './labels-control.ts';
export { toolbarAction } from "./toolbar.ts";

export function formFrame(surface: HumanSurface, journey: Mutation, draft: Readonly<Draft>,
  bottom: BottomToolbar, errors: Readonly<Record<string, string>> = {}, references:Readonly<Record<string,ReferenceState>>={},mediaReferences:Readonly<Record<string,MediaReferenceState>>={}): SurfaceFrame {
  return surfaceFrame({ version: "desert.surface-frame/6", kind: "journey",
    top: { title: surface.language.journeys[journey.id]! },
    content: { kind: "form", submit: journey.id, fields: deriveForm(journey, surface.fieldRepresentations).map(field => {
      const common = { name: field.name, required: field.required, label: surface.language.fields[`${journey.object}.${field.name}`]!,
        ...(Object.hasOwn(errors, field.name) ? { error: errors[field.name] } : {}) };
      const value = draft[field.name];
      const reference=surface.fieldReferences?.[`${journey.object}.${field.name}`];
      return field.primitive === "control.labels" ? { ...common, primitive: field.primitive,
        values: Array.isArray(value) ? value : [], limits: field.limits,
        ...(surface.fieldMediaReferences?.[`${journey.object}.${field.name}`] ? {mediaReference:mediaReferences[`${journey.object}.${field.name}`] ?? {options:[],loading:true}} : {}),
        ...(reference ? {reference:references[`${journey.object}.${field.name}`] ?? {
          options:[],loading:true,busy:false,uncertain:false,...(reference.create ? {createLabel:surface.language.journeys[reference.create]!} : {}),
          colors:reference.colors,maxLength:reference.maxLength}} : {}) }
        : field.primitive === "control.select" ? { ...common, required: false, primitive: field.primitive,
          value: typeof value === "string" && field.options.some(option => option.value === value) ? value : field.options[0]!.value,
          options: field.options }
        : field.primitive === "control.files" ? { ...common, primitive: field.primitive,
        files: isImageFileSelection(value) ? [value.file] : [],media:field.media }
        : { ...common, primitive: field.primitive, value: typeof value === "string" ? value : "",
          ...(field.schema.maxLength !== undefined ? { maxLength: field.schema.maxLength } : {}) };
    }) }, bottom,
  });
}

export type ReviewPhase = { kind: "review" } | { kind: "recovery"; method: "same-confirmation" | "receipt-only" };

export function reviewFrame(surface: HumanSurface, mutation: Mutation, facts: Readonly<Facts>,
  phase: ReviewPhase, busy: boolean, ready: boolean,
  feedback: { pendingAction?: "invoke" | "accept" | "recover" | null, receiptMissing?: boolean,
    previous?: Readonly<Facts> } = {}): SurfaceFrame {
  const label = surface.language.journeys[mutation.id]!;
  const uncertain = phase.kind === "recovery", receiptOnly = phase.kind === "recovery" && phase.method === "receipt-only";
  const pending = feedback.pendingAction === undefined ? (busy ? "accept" : null) : feedback.pendingAction;
  if (!uncertain && surface.commit[mutation.id] === "confirm") {
    const read = surface.journeys.find(item => item.kind === "read" && item.subject === mutation.object);
    const candidate = read?.kind === "read" ? facts[read.collection[0]!] : undefined;
    // An asset-led collection has no text title. Never stringify private asset metadata.
    const title = typeof candidate === "string" || typeof candidate === "number" || typeof candidate === "boolean" ? candidate : undefined;
    return surfaceFrame({ version: "desert.surface-frame/6", kind: "confirmation",
      // The confirmation's face is its action's: the verb's own glyph.
      top: { title: `${label}?`, face: { kind: "icon", icon: "confirm" } }, content: { kind: "message", text: title === undefined ?
        "Confirm this change to the selected item." : `“${presentTitle(title)}”` },
      bottom: { secondary: toolbarAction({ kind: "back" }, "Cancel", "back", !busy),
        primary: { ...toolbarAction({ kind: "accept" }, label, "confirm", ready && !busy),
          ...(busy && pending === "accept" ? { state: "pending" as const } : {}) } },
    });
  }
  const changes = reviewChanges(surface, mutation, facts, feedback.previous);
  return surfaceFrame({ version: "desert.surface-frame/6", kind: "journey",
    top: { title: uncertain ? "Check result" : `Review · ${label}`,
      subtitle: uncertain ? "Recover the result of this operation." : changes.summary,
      ...(uncertain ? { trailing: [{ ...toolbarAction({ kind: "recover" }, "Check result", "recover", ready && !busy),
        ...(busy && pending === "recover" ? { state: "pending" as const } : {}) }] } : {}) },
    content: { kind: "review", details: presentFacts(surface, mutation.object, changes.fields, facts),
      ...(uncertain ? { recovery: feedback.receiptMissing
        ? receiptOnly ? "No saved result was found yet. Check again; this operation will not be repeated."
          : "No saved result was found for this confirmation. Check again or retry this same confirmation."
        : "The result needs confirmation. Recovery checks this operation; it does not create another one." } : {}) },
    bottom: { ...(!uncertain ? { secondary: toolbarAction({ kind: "back" }, "Back", "back", !busy) } : {}),
      ...(!receiptOnly ? { primary: { ...toolbarAction({ kind: "accept" }, uncertain ? "Retry same confirmation" : label, uncertain ? "retry" : "confirm", ready),
        state: busy && pending === "accept" ? "pending" as const : !busy && ready ? "ready" as const : "unavailable" as const } } : {}) },
  });
}
