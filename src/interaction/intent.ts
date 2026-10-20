import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";

const closed = { additionalProperties: false };
export const JourneyIntentSchema = Type.Object({ kind: Type.Literal("journey"),
  journey: Type.String({ minLength: 1 }) }, closed);
export const CloseIntentSchema = Type.Object({ kind: Type.Literal("close") }, closed);
export const BackIntentSchema = Type.Object({ kind: Type.Literal("back") }, closed);
export const RecoverIntentSchema = Type.Object({ kind: Type.Literal("recover") }, closed);
export const AcceptIntentSchema = Type.Object({ kind: Type.Literal("accept") }, closed);
/** @deprecated Recognized for bank compatibility only; no current frame or selection host accepts this intent. */
export const SelectionConfirmIntentSchema = Type.Object({ kind: Type.Literal("selection.confirm"),
  selection: Type.String({ minLength: 1 }) }, closed);
export const ProductSurfaceIntentSchema = Type.Union([
  JourneyIntentSchema, CloseIntentSchema,
  BackIntentSchema, AcceptIntentSchema, RecoverIntentSchema,
]);
export const SurfaceIntentSchema = Type.Union([ProductSurfaceIntentSchema, SelectionConfirmIntentSchema]);
export type SurfaceIntent = Frozen<Static<typeof SurfaceIntentSchema>>;

export function surfaceIntent(value: unknown): SurfaceIntent {
  const snapshot = jsonSnapshot(value);
  if (!Check(SurfaceIntentSchema, snapshot)) throw new Error("INVALID_SURFACE_INTENT");
  return freezeDeep(snapshot);
}

/** Identity depends on the operation, never its label, icon or a reserved product name. */
export const intentKey = (intent: SurfaceIntent): string => intent.kind === "journey"
  ? JSON.stringify([intent.kind, intent.journey]) : intent.kind === "selection.confirm"
    ? JSON.stringify([intent.kind, intent.selection]) : intent.kind;
export const submitsJourney = (intent: SurfaceIntent | undefined, journey: string | undefined): boolean =>
  intent?.kind === "journey" && intent.journey === journey;

type IntentHandlers = { journey: (id: string) => void } & {
  [K in Exclude<SurfaceIntent["kind"], "journey" | "selection.confirm">]: () => void;
};
export function dispatchSurfaceIntent(value: SurfaceIntent, handlers: IntentHandlers): void {
  const intent = surfaceIntent(value);
  // Legacy selection confirmation has no product handler or current selection host.
  if (intent.kind === "selection.confirm") throw new Error("INVALID_SURFACE_INTENT_SCOPE");
  if (intent.kind === "journey") handlers.journey(intent.journey);
  else handlers[intent.kind]();
}
