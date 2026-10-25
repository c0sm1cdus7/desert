// The press state of a pressable control (`data-pressed` while a pointer or key holds it), which the theme's control-feedback
// utility draws: owned by action (its vendor button applies it) and shared with every foundation, and vendor family owner,
// that draws its own native button and lists it in owner.mechanisms.
import { defineMechanism } from "../../../../authoring/catalog/define.ts";

export const PressFeedbackMechanism = defineMechanism({ id: "press-feedback", owner: "action", files: ["press-feedback.ts"] } as const);
