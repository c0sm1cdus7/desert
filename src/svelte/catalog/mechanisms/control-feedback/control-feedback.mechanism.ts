// Shared stylesheet imported by theme.css; owned by the theme until its foundation claims it (slices 2-4).
import { defineMechanism } from "../../../../authoring/catalog/define.ts";

export const ControlFeedbackMechanism = defineMechanism({ id: "control-feedback", owner: "theme", files: ["control-feedback.css"] } as const);
