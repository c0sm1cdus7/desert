import type { SurfaceFrame } from "../src/interaction/surface-frame.ts";
import { toolbarAction } from "../src/interaction/toolbar.ts";

const close = toolbarAction({ kind: "close" }, "Close", "close");
const recover = toolbarAction({ kind: "recover" }, "Check result", "recover");
const save = toolbarAction({ kind: "journey", journey: "save" }, "Save", "save");
const accept = toolbarAction({ kind: "accept" }, "Accept", "confirm");
const context = { version: "desert.surface-frame/6", kind: "context", top: { title: "Object" },
  content: { kind: "message", text: "Reading" }, bottom: {} } as const satisfies SurfaceFrame;
const validContext: SurfaceFrame = { ...context, top: { title: "Object", leading: close, trailing: [recover] } };
const validJourney: SurfaceFrame = { ...context, kind: "journey", bottom: { secondary: close, primary: save } };
// @ts-expect-error Context journeys belong to Actions destinations, not the header.
const contextCommand: SurfaceFrame = { ...context, top: { title: "Object", trailing: [save] } };
// @ts-expect-error Context headers cannot confirm a command.
const contextAccept: SurfaceFrame = { ...context, top: { title: "Object", trailing: [accept] } };
// @ts-expect-error Recovery utilities are not message dismissal.
const messageRecovery: SurfaceFrame = { ...context, kind: "message", top: { title: "Error", trailing: [recover] } };
// @ts-expect-error Required navigation is a leading role.
const trailingClose: SurfaceFrame = { ...context, kind: "journey", top: { title: "Work", trailing: [close] } };
// @ts-expect-error Close is never a primary CTA.
const primaryClose: SurfaceFrame = { ...context, kind: "journey", bottom: { primary: close } };
// @ts-expect-error Local selection confirmation is not a product command.
const journeySelection: SurfaceFrame = { ...context, kind: "journey", bottom: { primary:
  toolbarAction({ kind: "selection.confirm", selection: "currency" }, "Select", "confirm") } };
// @ts-expect-error Selectors are controls, not toolbar-bearing surface frames.
const selectionFrame: SurfaceFrame = { ...context, kind: "selection" };
void [validContext, validJourney, contextCommand, contextAccept, messageRecovery, trailingClose, primaryClose, journeySelection, selectionFrame];
