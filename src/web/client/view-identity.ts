import type { View } from "../../views/schema.ts";
import type { ViewJourney, ViewProgram } from "../../views/program-schema.ts";
import type { ResolvedViewDefinition } from "../../views/resolved.ts";
import type { HumanSurface } from "../types.ts";
import type { HumanState } from "./state.ts";
import { presentTitle } from "../../interaction/fact-presentation.ts";
import { freezeDeep } from "../../json.ts";
import { systemStatusContent } from "./system-status.ts";
import { rendererLocale } from "../../messages/renderer-locale.ts";
import { Messages, m } from "../../messages/keys.ts";

// Every sentence this module shows a person is a key of the `viewIdentity` namespace it owns (plan §14).
const bundle = Messages.bundle(rendererLocale);

/** Resolve semantic identity and observed system data before the renderer receives content. */
export function resolveViewIdentity(program: ViewProgram, journey: ViewJourney, definition: View,
  surface: HumanSurface, state: HumanState, profile?: { displayName?: string; now?: Date }): ResolvedViewDefinition {
  return freezeDeep({ ...definition, content: definition.content.flatMap<ResolvedViewDefinition["content"][number]>(item => {
    if (item.kind === "system-status") return systemStatusContent(item.id, surface, state.availability);
    if (item.kind !== "header") return item;
    if (typeof item.title === "string") return { ...item, title: item.title };
    if (item.title.kind === "greeting") {
      const now = profile?.now ?? new Date(), hour = now.getHours();
      const greeting = bundle.text(hour < 12 ? m.viewIdentity.morning : hour < 18 ? m.viewIdentity.afternoon : m.viewIdentity.evening);
      return { ...item, title: profile?.displayName ? bundle.text(m.viewIdentity.greetingNamed, { greeting, name: profile.displayName })
        : bundle.text(m.viewIdentity.greeting, { greeting }),
        subtitle: new Intl.DateTimeFormat(surface.language.locale ?? "en", { weekday:"long", month:"long", day:"numeric" }).format(now) };
    }
    if (item.title.kind === "operation-label") {
      const label = surface.language.journeys[journey.id];
      if (!label || (journey.kind !== "create" && journey.kind !== "update" && journey.kind !== "activity")) throw new Error("INVALID_VIEW_OPERATION_TITLE");
      return { ...item, title: label };
    }
    const object = program.objects?.find(object => object.view === definition.id);
    if (!object || journey.kind !== "read" || journey.detailView !== definition.id) throw new Error("INVALID_VIEW_SUBJECT_TITLE");
    return { ...item, title: presentTitle(state.detail?.facts[object.title.field]) };
  }) });
}
