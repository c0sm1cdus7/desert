import type { HumanSurface, Mutation } from "../web/types.ts";
import { deriveForm } from "./form.ts";
import { surfaceFrame, type SurfaceFrame } from "./surface-frame.ts";
import { toolbarAction, type BottomToolbar } from "./toolbar.ts";
import { presentFacts } from "./fact-presentation.ts";
import { reviewChanges } from "./review-changes.ts";
export { toolbarAction } from "./toolbar.ts";

export function formFrame(surface: HumanSurface, journey: Mutation, draft: Readonly<Record<string, string>>,
  bottom: BottomToolbar, errors: Readonly<Record<string, string>> = {}): SurfaceFrame {
  return surfaceFrame({ version: "desert.surface-frame/6", kind: "journey",
    top: { title: surface.language.journeys[journey.id]! },
    content: { kind: "form", submit: journey.id, fields: deriveForm(journey, surface.inputs ?? {}).map(field => ({
      name: field.name, primitive: field.primitive, required: field.required,
      label: surface.language.fields[`${journey.object}.${field.name}`]!, value: draft[field.name] ?? "",
      ...(field.schema.maxLength !== undefined ? { maxLength: field.schema.maxLength } : {}),
      ...(Object.hasOwn(errors, field.name) ? { error: errors[field.name] } : {}),
    })) }, bottom,
  });
}

export function reviewFrame(surface: HumanSurface, mutation: Mutation, facts: Readonly<Record<string, string | number>>,
  uncertain: boolean, busy: boolean, ready: boolean,
  feedback: { pendingAction?: "invoke" | "accept" | "recover" | null, receiptMissing?: boolean,
    previous?: Readonly<Record<string, string | number>> } = {}): SurfaceFrame {
  const label = surface.language.journeys[mutation.id]!;
  const pending = feedback.pendingAction === undefined ? (busy ? "accept" : null) : feedback.pendingAction;
  const changes = reviewChanges(surface, mutation, facts, feedback.previous);
  return surfaceFrame({ version: "desert.surface-frame/6", kind: "journey",
    top: { title: uncertain ? "Check result" : `Review · ${label}`,
      subtitle: uncertain ? "Recover the result of this operation." : changes.summary,
      ...(uncertain ? { trailing: [{ ...toolbarAction({ kind: "recover" }, "Check result", "recover", ready && !busy),
        ...(busy && pending === "recover" ? { state: "pending" as const } : {}) }] } : {}) },
    content: { kind: "review", details: presentFacts(surface, mutation.object, changes.fields, facts),
      ...(uncertain ? { recovery: feedback.receiptMissing
        ? "No saved result was found for this confirmation. Check again or retry this same confirmation."
        : "The result needs confirmation. Recovery checks this operation; it does not create another one." } : {}) },
    bottom: { ...(!uncertain ? { secondary: toolbarAction({ kind: "back" }, "Back", "back", !busy) } : {}),
      primary: { ...toolbarAction({ kind: "accept" }, uncertain ? "Retry same confirmation" : label, uncertain ? "retry" : "confirm", ready),
        state: busy && pending === "accept" ? "pending" : !busy && ready ? "ready" : "unavailable" } },
  });
}
